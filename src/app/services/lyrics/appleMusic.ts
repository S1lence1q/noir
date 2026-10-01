import { lyricsTitleVariants, lyricsArtistVariants } from '../../utils/stringUtils';
import { readExtraLyricsSource } from '../../utils/lyricsSources';
import type { LyricsProvider, LyricsTrack } from './types';

/**
 * Apple Music lyrics. Apple's public iTunes Search finds the song; the lyrics themselves come from
 * Paxsenix' open `/apple-music/lyrics` endpoint (its owner says that one has no restrictions — other
 * endpoints of his, like Musixmatch, were closed because of traffic, so keep the load light: this source is
 * only asked when lrclib has nothing synced, and at most a few lookups per song).
 * Third party, not ours: it can change or go away, and lrclib keeps working without it.
 */
const ITUNES = 'https://itunes.apple.com/search';
const LYRICS = 'https://lyrics.paxsenix.org/apple-music/lyrics';
const MAX_LYRIC_FETCHES = 3;
const RETRY_DELAYS_MS = [700, 1500];

type ItunesSong = { trackId: number; trackName: string; artistName: string; trackTimeMillis?: number };
type AppleLine = { timestamp: number; text: { text: string; part?: boolean }[] };
type AppleLyrics = {
  type: 'None' | 'Line' | 'Syllable';
  metadata?: { duration?: number | null };
  content?: AppleLine[];
};

const norm = (s: string) => s.toLowerCase().replace(/[^\p{L}\p{N}]/gu, '');
const overlaps = (a: string, b: string) => {
  const x = norm(a);
  const y = norm(b);
  return x.length > 0 && y.length > 0 && (x.includes(y) || y.includes(x));
};

async function getJson<T>(url: string): Promise<{ status: number; data: T | null }> {
  let status = 0;
  for (let attempt = 0; attempt <= RETRY_DELAYS_MS.length; attempt++) {
    if (attempt > 0) await new Promise((r) => setTimeout(r, RETRY_DELAYS_MS[attempt - 1]));
    try {
      const res = await fetch(url);
      status = res.status;
      if (res.ok) return { status, data: (await res.json()) as T };
      if (res.status === 404) return { status, data: null };
    } catch {
      status = 0;
    }
  }
  throw new Error(`Request failed (${status})`);
}

async function findSongs(title: string, artist: string, country: string): Promise<ItunesSong[]> {
  const titles = lyricsTitleVariants(title, artist);
  const artists = lyricsArtistVariants(artist);
  const term = `${titles[0] ?? title} ${artists[0] ?? ''}`.trim();
  const { data } = await getJson<{ results?: ItunesSong[] }>(
    `${ITUNES}?${new URLSearchParams({ term, entity: 'song', limit: '10', country })}`
  );
  return (data?.results ?? []).filter(
    (s) =>
      titles.some((t) => overlaps(s.trackName, t)) &&
      (artists.length === 0 || artists.some((a) => overlaps(s.artistName, a)))
  );
}

const lrcStamp = (ms: number) => {
  const total = Math.max(0, ms) / 1000;
  const m = Math.floor(total / 60);
  const s = total - m * 60;
  return `[${String(m).padStart(2, '0')}:${s.toFixed(2).padStart(5, '0')}]`;
};

/** A line's words → text. Word-timed lyrics split a line into pieces; `part` means "joined to the previous one". */
const lineText = (line: AppleLine) =>
  line.text
    .map((w, i) => (i > 0 && !w.part ? ' ' : '') + w.text)
    .join('')
    .replace(/\s{2,}/g, ' ')
    .trim();

function toTrack(lyrics: AppleLyrics, song: ItunesSong): LyricsTrack | null {
  const lines = lyrics.content ?? [];
  const texts = lines.map(lineText);
  const durationMs = lyrics.metadata?.duration ?? song.trackTimeMillis;
  const base = { artistName: song.artistName, duration: durationMs ? durationMs / 1000 : undefined };
  if (lyrics.type === 'None') {
    const plain = texts.filter(Boolean).join('\n');
    return plain ? { ...base, plainLyrics: plain } : null;
  }
  const synced = lines
    .map((l, i) => (texts[i] ? `${lrcStamp(l.timestamp)}${texts[i]}` : ''))
    .filter(Boolean)
    .join('\n');
  return synced ? { ...base, syncedLyrics: synced, plainLyrics: texts.filter(Boolean).join('\n') } : null;
}

export const appleMusicProvider: LyricsProvider = {
  name: 'apple-music',
  async lookup(title, artist) {
    // No artist to check the match against: too easy to return the wrong song.
    if (!readExtraLyricsSource() || !artist) return { list: [], complete: true };

    let songs = await findSongs(title, artist, 'dk');
    if (songs.length === 0) songs = await findSongs(title, artist, 'us');

    const found: LyricsTrack[] = [];
    let failures = 0;
    // Releases of one song (single, album, compilation) are separate Apple tracks, and not all carry timing.
    for (const song of songs.slice(0, MAX_LYRIC_FETCHES)) {
      try {
        const { data } = await getJson<AppleLyrics>(`${LYRICS}?${new URLSearchParams({ id: String(song.trackId) })}`);
        const track = data && toTrack(data, song);
        if (track) found.push(track);
        if (track?.syncedLyrics) break;
      } catch {
        failures++;
      }
    }
    if (found.length === 0 && failures === Math.min(songs.length, MAX_LYRIC_FETCHES) && failures > 0) {
      throw new Error('Apple Music lyrics unavailable');
    }
    return { list: found, complete: failures === 0 };
  },
};
