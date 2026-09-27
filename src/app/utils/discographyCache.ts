import { SearchResult } from '../types';

const FRESH_TTL_MS = 48 * 60 * 60 * 1000; // 48h fresh
const STALE_TTL_MS = 14 * 24 * 60 * 60 * 1000; // keep stale up to 14d for SWR
const MAX_CACHED_ARTISTS = 200;
const CACHE_KEY_PREFIX = 'elva_discography_v3_';
const CACHE_INDEX_KEY = 'elva_discography_index_v3';
/** Legacy name-only keys from v2 — still readable for migration. */
const LEGACY_PREFIX = 'elva_discography_v2_';

export type DiscographyChannelType = 'topic' | 'vevo' | 'official' | 'provided';

export interface DiscographyEntry {
  tracks: SearchResult[];
  channelId: string;
  channelType: DiscographyChannelType;
  cachedAt: number;
  /** Identity key used when writing (mbid:/deezer:/channel:/name:). */
  identityKey?: string;
}

export type DiscographyCacheHit = DiscographyEntry & {
  stale: boolean;
};

const getIndex = (): string[] => {
  try {
    const raw = localStorage.getItem(CACHE_INDEX_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
};

const saveIndex = (index: string[]) => {
  try {
    localStorage.setItem(CACHE_INDEX_KEY, JSON.stringify(index));
  } catch {}
};

const storageKey = (identityKey: string) =>
  CACHE_KEY_PREFIX + identityKey.trim().toLowerCase();

const legacyNameKey = (artistName: string) =>
  LEGACY_PREFIX + artistName.trim().toLowerCase();

function readEntry(key: string): DiscographyEntry | null {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    return JSON.parse(raw) as DiscographyEntry;
  } catch {
    return null;
  }
}

/**
 * Read discography cache by identity key (preferred) or artist name (legacy).
 * When `allowStale` is true, expired-but-kept entries are returned with `stale: true`.
 */
export const getDiscographyCache = (
  identityOrName: string,
  options?: { allowStale?: boolean; artistName?: string }
): DiscographyCacheHit | null => {
  const allowStale = options?.allowStale ?? false;
  const keys = [
    storageKey(identityOrName),
    options?.artistName ? storageKey(`name:${options.artistName.trim().toLowerCase()}`) : null,
    options?.artistName ? legacyNameKey(options.artistName) : null,
    // If caller passed a plain name without prefix
    !identityOrName.includes(':') ? storageKey(`name:${identityOrName.trim().toLowerCase()}`) : null,
    !identityOrName.includes(':') ? legacyNameKey(identityOrName) : null,
  ].filter(Boolean) as string[];

  for (const key of keys) {
    const entry = readEntry(key);
    if (!entry?.tracks?.length) continue;

    const age = Date.now() - entry.cachedAt;
    if (age <= FRESH_TTL_MS) {
      return { ...entry, stale: false };
    }
    if (allowStale && age <= STALE_TTL_MS) {
      return { ...entry, stale: true };
    }
    if (!allowStale && age > FRESH_TTL_MS) {
      try {
        localStorage.removeItem(key);
        saveIndex(getIndex().filter((k) => k !== key));
      } catch {}
    }
  }
  return null;
};

export const setDiscographyCache = (
  identityKey: string,
  tracks: SearchResult[],
  channelId: string,
  channelType: DiscographyChannelType,
  artistName?: string
) => {
  try {
    const key = storageKey(identityKey);
    const entry: DiscographyEntry = {
      tracks,
      channelId,
      channelType,
      cachedAt: Date.now(),
      identityKey,
    };
    localStorage.setItem(key, JSON.stringify(entry));

    // Also write name alias for quick reopen by display name
    if (artistName?.trim()) {
      const nameAlias = storageKey(`name:${artistName.trim().toLowerCase()}`);
      if (nameAlias !== key) {
        localStorage.setItem(nameAlias, JSON.stringify(entry));
      }
    }

    let idx = getIndex().filter((k) => k !== key);
    idx.unshift(key);

    while (idx.length > MAX_CACHED_ARTISTS) {
      const evicted = idx.pop()!;
      localStorage.removeItem(evicted);
    }

    saveIndex(idx);
  } catch (e) {
    console.warn('Discography cache write failed (storage full?):', e);
  }
};

export const invalidateDiscographyCache = (identityOrName: string) => {
  try {
    const keys = [storageKey(identityOrName), storageKey(`name:${identityOrName.trim().toLowerCase()}`)];
    keys.forEach((key) => localStorage.removeItem(key));
    saveIndex(getIndex().filter((k) => !keys.includes(k)));
  } catch {}
};

export const clearAllDiscographyCache = () => {
  try {
    const idx = getIndex();
    idx.forEach((key) => localStorage.removeItem(key));
    localStorage.removeItem(CACHE_INDEX_KEY);
  } catch {}
};
