import { useState, useEffect, useRef } from 'react';
import { parseLrc, loadCustomLyrics } from '../utils/lyricsUtils';
import { cleanSongTitle } from '../utils/stringUtils';
import type { LyricLine } from '../types';
import type { PlaybackSongData } from '../types/playback';

type LrclibTrack = { syncedLyrics?: string | null; plainLyrics?: string | null; duration?: number };

/** Synced timing only counts if the lrclib version is within this many seconds of what's playing. */
const SYNC_TOLERANCE_S = 5;

function toPlainLines(track: LrclibTrack): LyricLine[] {
  const source = track.plainLyrics || (track.syncedLyrics ?? '').replace(/^\[[^\]]*\]\s*/gm, '');
  return source
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => l.length > 0)
    .map((text) => ({ time: 0, text }));
}

/**
 * lrclib often returns several versions (remaster, live, radio edit) with different intros.
 * Pick the one whose length matches the playing track; if none is close, show plain text
 * rather than confidently wrong timing.
 */
function pickLyrics(candidates: LrclibTrack[], duration: number): { lines: LyricLine[]; synced: boolean } {
  if (candidates.length === 0) return { lines: [], synced: false };
  const synced = candidates.filter((t) => t.syncedLyrics);
  if (synced.length > 0) {
    if (duration <= 0) return { lines: parseLrc(synced[0].syncedLyrics!), synced: true };
    const best = [...synced].sort(
      (a, b) => Math.abs((a.duration ?? 0) - duration) - Math.abs((b.duration ?? 0) - duration)
    )[0];
    if (best.duration == null || Math.abs(best.duration - duration) <= SYNC_TOLERANCE_S) {
      return { lines: parseLrc(best.syncedLyrics!), synced: true };
    }
    return { lines: toPlainLines(best), synced: false };
  }
  const plain = candidates.find((t) => t.plainLyrics);
  return plain ? { lines: toPlainLines(plain), synced: false } : { lines: [], synced: false };
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

  // Choose among lrclib versions once the track length is known (re-picks if it arrives late).
  const rounded = Math.round(duration);
  const roundedDuration = rounded === staleDurationRef.current ? 0 : rounded;
  useEffect(() => {
    if (!candidates) return;
    const { lines, synced } = pickLyrics(candidates, roundedDuration);
    setLyrics(lines);
    setIsLyricsSynced(synced);
  }, [candidates, roundedDuration]);

  useEffect(() => {
    if (lyrics.length === 0 || !isLyricsSynced) return;
    if (awaitingStartRef.current) {
      if (currentTime > 2) return;
      awaitingStartRef.current = false;
    }
    let activeIndex = -1;
    for (let i = 0; i < lyrics.length; i++) {
      if (currentTime >= lyrics[i].time - 0.5) {
        activeIndex = i;
      } else {
        break;
      }
    }
    setCurrentLyricIndex(activeIndex);
  }, [currentTime, lyrics, isLyricsSynced]);

  useEffect(() => {
    if (!songData.title) return;

    let isMounted = true;
    const fetchLyricsData = async () => {
      setIsLoadingLyrics(true);
      setLyrics([]);
      setCurrentLyricIndex(-1);
      setIsLyricsSynced(false);
      setCandidates(null);
      // Lyrics mode is the listener's choice and survives song changes; the column shows
      // the skeleton / empty state while the new text loads.

      const custom = loadCustomLyrics(songData.videoId, songData.title, songData.artist);
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
        const cleanedTitle = cleanSongTitle(songData.title);
        const query = encodeURIComponent(
          `${cleanedTitle} ${songData.artist !== 'Unknown Artist' && songData.artist !== 'Web Stream' ? songData.artist : ''}`.trim()
        );
        const res = await fetch(`https://lrclib.net/api/search?q=${query}`);
        if (!res.ok) throw new Error('API Error');
        const data = await res.json();

        if (isMounted) setCandidates(Array.isArray(data) ? data : []);
      } catch (err) {
        console.error('Lyrics fetch error:', err);
        if (isMounted) {
          setLyrics([]);
          setIsLyricsSynced(false);
        }
      } finally {
        if (isMounted) setIsLoadingLyrics(false);
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
    lyrics,
    isLoadingLyrics,
    currentLyricIndex,
    isLyricsSynced,
    isLyricsModalOpen,
    setIsLyricsModalOpen,
    handleLyricsReload,
  };
}
