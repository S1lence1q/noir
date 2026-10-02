import type { LyricsTrack } from './types';

/**
 * Lyrics remembered between visits, so a song heard before costs no request and still works when a source
 * is down. localStorage is small and shared, so entries are trimmed, expire, and the oldest go first.
 */
const INDEX_KEY = 'noir_lyrics_cache_index_v1';
const ENTRY_PREFIX = 'noir_lyrics_cache_v1:';
const MAX_ENTRIES = 150;
/** Synced lyrics rarely change. */
const SYNCED_TTL_MS = 30 * 24 * 60 * 60 * 1000;
/** Plain-only or "nothing found" is re-checked soon: synced lyrics may have been added since. */
const OTHER_TTL_MS = 2 * 24 * 60 * 60 * 1000;
const MAX_VERSIONS = 4;

type Entry = { t: number; list: LyricsTrack[] };
type IndexItem = { k: string; t: number };

const hasSynced = (list: LyricsTrack[]) => list.some((x) => x.syncedLyrics);

/**
 * What is worth keeping: a few synced versions of different lengths (the player picks by length), without
 * the duplicate plain text; or, with no synced version, one plain text.
 */
function compactLyrics(list: LyricsTrack[]): LyricsTrack[] {
  const synced: LyricsTrack[] = [];
  const lengths = new Set<number>();
  for (const track of list) {
    if (!track.syncedLyrics) continue;
    const length = Math.round(track.duration ?? -1);
    if (lengths.has(length)) continue;
    lengths.add(length);
    synced.push({ syncedLyrics: track.syncedLyrics, duration: track.duration, artistName: track.artistName });
    if (synced.length >= MAX_VERSIONS) break;
  }
  if (synced.length > 0) return synced;
  const plain = list.find((x) => x.plainLyrics);
  return plain ? [{ plainLyrics: plain.plainLyrics, artistName: plain.artistName }] : [];
}

function readIndex(): IndexItem[] {
  try {
    const raw = localStorage.getItem(INDEX_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeIndex(index: IndexItem[]) {
  try {
    localStorage.setItem(INDEX_KEY, JSON.stringify(index));
  } catch {
    /* storage full or unavailable: the cache just works less */
  }
}

function drop(key: string) {
  try {
    localStorage.removeItem(ENTRY_PREFIX + key);
  } catch {
    /* ignore */
  }
}

export function readLyricsCache(key: string, now = Date.now()): LyricsTrack[] | null {
  try {
    const raw = localStorage.getItem(ENTRY_PREFIX + key);
    if (!raw) return null;
    const entry = JSON.parse(raw) as Entry;
    const ttl = hasSynced(entry.list) ? SYNCED_TTL_MS : OTHER_TTL_MS;
    if (!entry || !Array.isArray(entry.list) || now - entry.t > ttl) {
      drop(key);
      return null;
    }
    return entry.list;
  } catch {
    return null;
  }
}

export function writeLyricsCache(key: string, list: LyricsTrack[], now = Date.now()) {
  const entry: Entry = { t: now, list: compactLyrics(list) };
  const save = () => localStorage.setItem(ENTRY_PREFIX + key, JSON.stringify(entry));
  try {
    try {
      save();
    } catch {
      // Full: make room by dropping the oldest entries, then try once more.
      const oldest = readIndex().sort((a, b) => a.t - b.t).slice(0, 20);
      oldest.forEach((i) => drop(i.k));
      writeIndex(readIndex().filter((i) => !oldest.some((o) => o.k === i.k)));
      save();
    }
    let index = readIndex().filter((i) => i.k !== key);
    index.push({ k: key, t: now });
    if (index.length > MAX_ENTRIES) {
      index.sort((a, b) => a.t - b.t);
      index.slice(0, index.length - MAX_ENTRIES).forEach((i) => drop(i.k));
      index = index.slice(index.length - MAX_ENTRIES);
    }
    writeIndex(index);
  } catch {
    /* private mode / still full: skip caching */
  }
}
