import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { parseLrc, loadCustomLyrics } from '../utils/lyricsUtils';
import { useLyricsTimingControls } from '../utils/lyricsTiming';
import { cleanSongTitle, lyricsTitleVariants, lyricsArtistVariants } from '../utils/stringUtils';
import type { LyricLine } from '../types';
import type { PlaybackSongData } from '../types/playback';

type LrclibTrack = {
  syncedLyrics?: string | null;
  plainLyrics?: string | null;
  duration?: number;
  artistName?: string;
};

/**
 * Synced lyrics are only shown as synced if the lrclib version is within this many seconds of what's
 * playing. Otherwise plain text: lines that are visibly late or early are worse than none.
 */
const SYNC_TOLERANCE_S = 3;
/**
 * Opt-in only (Settings → lyrics timing controls): a track up to this many seconds longer than the
 * lrclib version is often the same recording with a video intro, so keep the timing and shift it by
 * the difference. It is a guess, which the listener can then nudge.
 */
const OFFSET_GUESS_MAX_S = 25;

type Pick = { lines: LyricLine[]; synced: boolean; guessedOffset: number };

function toPlainLines(track: LrclibTrack): LyricLine[] {
  const source = track.plainLyrics || (track.syncedLyrics ?? '').replace(/^\[[^\]]*\]\s*/gm, '');
  return source
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => l.length > 0)
    .map((text) => ({ time: 0, text }));
}

/** Whether the choice of lyrics (synced or not, which version) depends on the track length at all. */
function needsDuration(candidates: LrclibTrack[]): boolean {
  return candidates.some((t) => t.syncedLyrics && t.duration != null);
}

/**
 * lrclib often returns several versions (remaster, live, radio edit) with different intros.
 * Pick the one whose length matches the playing track; if none is close, show plain text rather
 * than confidently wrong timing (unless the listener opted into a guessed shift).
 */
function pickLyrics(candidates: LrclibTrack[], duration: number, allowOffsetGuess: boolean): Pick {
  if (candidates.length === 0) return { lines: [], synced: false, guessedOffset: 0 };
  const synced = candidates.filter((t) => t.syncedLyrics);
  if (synced.length > 0) {
    if (duration <= 0) return { lines: parseLrc(synced[0].syncedLyrics!), synced: true, guessedOffset: 0 };
    const best = [...synced].sort(
      (a, b) => Math.abs((a.duration ?? 0) - duration) - Math.abs((b.duration ?? 0) - duration)
    )[0];
    const lines = parseLrc(best.syncedLyrics!);
    if (best.duration == null) return { lines, synced: true, guessedOffset: 0 };
    const delta = duration - best.duration;
    if (Math.abs(delta) <= SYNC_TOLERANCE_S) return { lines, synced: true, guessedOffset: 0 };
    if (allowOffsetGuess && delta > 0 && delta <= OFFSET_GUESS_MAX_S) {
      return { lines, synced: true, guessedOffset: Math.round(delta * 10) / 10 };
    }
    return { lines: toPlainLines(best), synced: false, guessedOffset: 0 };
  }
  const plain = candidates.find((t) => t.plainLyrics);
  return plain
    ? { lines: toPlainLines(plain), synced: false, guessedOffset: 0 }
    : { lines: [], synced: false, guessedOffset: 0 };
}

const lyricsCache = new Map<string, LrclibTrack[]>();
const lyricsInflight = new Map<string, Promise<LrclibTrack[]>>();

const lyricsKey = (title: string, artist: string) => `${cleanSongTitle(title, artist)}::${artist}`.toLowerCase();
const isLookupable = (artist: string) => artist !== 'Unknown Artist' && artist !== 'Web Stream';

const RETRY_DELAYS_MS = [500, 1200];

/**
 * lrclib answers 503 or a non-list body now and then. That is not "no lyrics": retry a couple of times,
 * and let a persistent failure throw so it is never mistaken for an empty result.
 */
async function searchLrclib(params: Record<string, string>): Promise<LrclibTrack[]> {
  let lastError: unknown;
  for (let attempt = 0; attempt <= RETRY_DELAYS_MS.length; attempt++) {
    if (attempt > 0) await new Promise((r) => setTimeout(r, RETRY_DELAYS_MS[attempt - 1]));
    try {
      const res = await fetch(`https://lrclib.net/api/search?${new URLSearchParams(params)}`);
      if (!res.ok) throw new Error('API Error');
      const data = await res.json();
      if (!Array.isArray(data)) throw new Error('Unexpected response');
      return data;
    } catch (err) {
      lastError = err;
    }
  }
  throw lastError;
}

const normName = (s: string) => s.toLowerCase().replace(/[^\p{L}\p{N}]/gu, '');
function artistMatches(found: string | undefined, wanted: string): boolean {
  const a = normName(found ?? '');
  const b = normName(wanted);
  return a.length > 0 && b.length > 0 && (a.includes(b) || b.includes(a));
}

/**
 * Widening search: exact fields first, then free text, then title alone checked against the artist.
 * The first stage that has synced lyrics wins; if none does, the first stage with plain text is used.
 */
export type LookupResult = {
  list: LrclibTrack[];
  /** False when some searches failed outright, so an empty answer may just be an outage. */
  complete: boolean;
};

export async function lookupLrclib(title: string, artist: string): Promise<LookupResult> {
  const artists = isLookupable(artist) ? lyricsArtistVariants(artist) : [];
  const primary = artists[0] ?? '';
  const titles = lyricsTitleVariants(title, artist);
  if (titles.length === 0) return { list: [], complete: true };
  const stages: Array<() => Promise<LrclibTrack[]>> = [];
  for (const t of titles) {
    for (const a of artists) stages.push(() => searchLrclib({ track_name: t, artist_name: a }));
  }
  for (const t of titles) stages.push(() => searchLrclib({ q: `${t} ${primary}`.trim() }));
  if (artists.length > 0) {
    stages.push(async () =>
      (await searchLrclib({ q: titles[0] })).filter((t) => artists.some((a) => artistMatches(t.artistName, a)))
    );
  }
  let plainFallback: LrclibTrack[] = [];
  let failures = 0;
  for (const stage of stages) {
    let list: LrclibTrack[];
    try {
      list = await stage();
    } catch {
      failures++;
      continue;
    }
    if (list.some((t) => t.syncedLyrics)) return { list, complete: true };
    if (plainFallback.length === 0 && list.length > 0) plainFallback = list;
  }
  if (failures === stages.length) throw new Error('API Error');
  return { list: plainFallback, complete: failures === 0 };
}

/** One lrclib lookup per song, shared by the player and by the prefetch. Failures are not cached. */
function fetchCandidates(title: string, artist: string): Promise<LrclibTrack[]> {
  const key = lyricsKey(title, artist);
  const hit = lyricsCache.get(key);
  if (hit) return Promise.resolve(hit);
  const running = lyricsInflight.get(key);
  if (running) return running;
  const p = lookupLrclib(title, artist)
    .then(({ list, complete }) => {
      // An answer that might be missing something because a search failed is shown, but not remembered:
      // the next play asks again instead of keeping a false "nothing found".
      if (complete) lyricsCache.set(key, list);
      return list;
    })
    .finally(() => lyricsInflight.delete(key));
  lyricsInflight.set(key, p);
  return p;
}

/** Warm the answer for a song that is about to play, so the stage knows before the song changes. */
export function prefetchLyrics(title: string, artist: string) {
  if (!title || !isLookupable(artist) || loadCustomLyrics(undefined, title, artist)) return;
  fetchCandidates(title, artist).catch(() => {});
}

const OFFSET_STORAGE_PREFIX = 'noir_lyrics_offset_';

function readStoredOffset(key: string): number | null {
  try {
    const raw = localStorage.getItem(OFFSET_STORAGE_PREFIX + key);
    if (raw == null) return null;
    const n = Number(raw);
    return Number.isFinite(n) ? n : null;
  } catch {
    return null;
  }
}

function writeStoredOffset(key: string, value: number | null) {
  try {
    if (value == null) localStorage.removeItem(OFFSET_STORAGE_PREFIX + key);
    else localStorage.setItem(OFFSET_STORAGE_PREFIX + key, String(value));
  } catch {
    /* storage unavailable: the offset just lasts for this session */
  }
}

export function useLyrics(songData: PlaybackSongData, currentTime: number, duration = 0) {
  const [showLyrics, setShowLyrics] = useState(false);
  const [lyrics, setLyrics] = useState<LyricLine[]>([]);
  const [isLoadingLyrics, setIsLoadingLyrics] = useState(false);
  const [currentLyricIndex, setCurrentLyricIndex] = useState(-1);
  const [isLyricsSynced, setIsLyricsSynced] = useState(false);
  const [isLyricsModalOpen, setIsLyricsModalOpen] = useState(false);
  const [lyricsVersion, setLyricsVersion] = useState(0);
  const [candidates, setCandidates] = useState<LrclibTrack[] | null>(null);
  // Seconds the timing is shifted by: guessed from the length difference, or set by the listener.
  const timingControls = useLyricsTimingControls();
  const [guessedOffset, setGuessedOffset] = useState(0);
  const [userOffset, setUserOffset] = useState<number | null>(null);
  const [isCustomLyrics, setIsCustomLyrics] = useState(false);
  // The offset belongs to this upload of the song (a video's intro), so it is keyed by video when known.
  const offsetKey = songData.videoId || lyricsKey(songData.title, songData.artist);
  // Right after a song change the player can still report the previous song's time for a moment.
  // Ignore it until playback is back near the start (or a short grace period passes, e.g. restore mid-song).
  const awaitingStartRef = useRef(true);
  // Same for duration: the previous song's length must not decide which lyrics version fits.
  const staleDurationRef = useRef(0);
  const durationRef = useRef(duration);
  durationRef.current = duration;

  const handleLyricsReload = () => {
    setLyricsVersion((prev) => prev + 1);
  };

  useEffect(() => {
    awaitingStartRef.current = true;
    staleDurationRef.current = Math.round(durationRef.current);
    setCurrentLyricIndex(-1);
    const grace = window.setTimeout(() => {
      awaitingStartRef.current = false;
    }, 2000);
    return () => window.clearTimeout(grace);
  }, [songData.title, songData.artist, songData.videoId]);

  useEffect(() => {
    setUserOffset(readStoredOffset(offsetKey));
  }, [offsetKey]);

  const lyricsOffset = isCustomLyrics ? 0 : (userOffset ?? guessedOffset);
  const shiftedLyrics = useMemo(
    () => (lyricsOffset === 0 ? lyrics : lyrics.map((l) => ({ ...l, time: l.time + lyricsOffset }))),
    [lyrics, lyricsOffset]
  );

  // Rapid taps must each count: read the latest value from a ref, not from the last render.
  const offsetRef = useRef(lyricsOffset);
  offsetRef.current = lyricsOffset;
  const nudgeLyricsOffset = useCallback(
    (delta: number) => {
      const next = Math.round((offsetRef.current + delta) * 10) / 10;
      offsetRef.current = next;
      setUserOffset(next);
      writeStoredOffset(offsetKey, next);
    },
    [offsetKey]
  );

  const resetLyricsOffset = useCallback(() => {
    setUserOffset(null);
    writeStoredOffset(offsetKey, null);
  }, [offsetKey]);

  // Choose among lrclib versions once the track length is known (re-picks if it arrives late).
  const rounded = Math.round(duration);
  const roundedDuration = rounded === staleDurationRef.current ? 0 : rounded;
  // If the length never arrives (stream with no duration) stop waiting for it after a moment.
  const [durationWaitOver, setDurationWaitOver] = useState(false);
  useEffect(() => {
    setDurationWaitOver(false);
    const t = window.setTimeout(() => setDurationWaitOver(true), 2500);
    return () => window.clearTimeout(t);
  }, [songData.title, songData.artist, songData.videoId]);

  useEffect(() => {
    if (!candidates) return;
    // Picking without the length means guessing (synced vs plain, which version), and the guess gets
    // corrected a moment later — the visible flip. Stay in "loading" until the length is known,
    // unless the answer doesn't depend on it (nothing found, or nothing to compare against).
    if (roundedDuration <= 0 && !durationWaitOver && needsDuration(candidates)) return;
    const { lines, synced, guessedOffset: guess } = pickLyrics(candidates, roundedDuration, timingControls);
    setLyrics(lines);
    setGuessedOffset(guess);
    setIsLyricsSynced(synced);
    // Loading ends here, in the same render that has the lines — never a frame of "loaded, but empty".
    setIsLoadingLyrics(false);
  }, [candidates, roundedDuration, durationWaitOver, timingControls]);

  useEffect(() => {
    if (shiftedLyrics.length === 0 || !isLyricsSynced) return;
    if (awaitingStartRef.current) {
      if (currentTime > 2) return;
      awaitingStartRef.current = false;
    }
    let activeIndex = -1;
    for (let i = 0; i < shiftedLyrics.length; i++) {
      if (currentTime >= shiftedLyrics[i].time - 0.5) {
        activeIndex = i;
      } else {
        break;
      }
    }
    setCurrentLyricIndex(activeIndex);
  }, [currentTime, shiftedLyrics, isLyricsSynced]);

  useEffect(() => {
    if (!songData.title) return;

    let isMounted = true;
    const fetchLyricsData = async () => {
      // Already known (prefetched or heard before): swap in one step, never passing through empty,
      // so the stage and the cover change once, cleanly.
      const known = lyricsCache.get(lyricsKey(songData.title, songData.artist));
      if (known && !loadCustomLyrics(songData.videoId, songData.title, songData.artist)) {
        setIsCustomLyrics(false);
        // Known answer: no network. The candidates effect picks the lines (once the length is known, if
        // that matters) and ends loading; the stage holds its state meanwhile.
        setIsLoadingLyrics(true);
        setLyrics([]);
        setIsLyricsSynced(false);
        setCurrentLyricIndex(-1);
        setCandidates([...known]); // fresh array: replaying the same song must still re-run the pick
        return;
      }
      setIsLoadingLyrics(true);
      setLyrics([]);
      setCurrentLyricIndex(-1);
      setIsLyricsSynced(false);
      setCandidates(null);
      // Lyrics mode is the listener's choice and survives song changes; the column shows
      // the skeleton / empty state while the new text loads.

      const custom = loadCustomLyrics(songData.videoId, songData.title, songData.artist);
      setIsCustomLyrics(!!custom);
      if (custom) {
        if (isMounted) {
          setLyrics(custom.lyrics);
          setIsLyricsSynced(custom.isSynced);
          setIsLoadingLyrics(false);
        }
        return;
      }

      if (songData.audioUrl?.startsWith('blob:') || songData.artist === 'Unknown Artist') {
        if (isMounted) {
          setLyrics([]);
          setIsLyricsSynced(false);
          setIsLoadingLyrics(false);
        }
        return;
      }

      try {
        // The candidates effect picks the lines and ends the loading state together.
        const data = await fetchCandidates(songData.title, songData.artist);
        if (isMounted) setCandidates(data);
      } catch (err) {
        console.error('Lyrics fetch error:', err);
        if (isMounted) {
          setLyrics([]);
          setIsLyricsSynced(false);
          setIsLoadingLyrics(false);
        }
      }
    };

    fetchLyricsData();
    return () => {
      isMounted = false;
    };
  }, [songData.title, songData.artist, songData.videoId, lyricsVersion]);

  return {
    showLyrics,
    setShowLyrics,
    lyrics: shiftedLyrics,
    isLoadingLyrics,
    currentLyricIndex,
    isLyricsSynced,
    isLyricsModalOpen,
    setIsLyricsModalOpen,
    handleLyricsReload,
    lyricsOffset,
    /** True while the shift is our guess from the length difference (not yet confirmed by the listener). */
    isOffsetGuess: !isCustomLyrics && userOffset == null && guessedOffset !== 0,
    nudgeLyricsOffset,
    resetLyricsOffset,
  };
}
