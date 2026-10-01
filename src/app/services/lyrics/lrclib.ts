import { lyricsTitleVariants, lyricsArtistVariants } from '../../utils/stringUtils';
import type { LyricsProvider, LyricsTrack, LookupResult } from './types';

const RETRY_DELAYS_MS = [500, 1200];

/**
 * lrclib answers 503 or a non-list body now and then. That is not "no lyrics": retry a couple of times,
 * and let a persistent failure throw so it is never mistaken for an empty result.
 */
async function searchLrclib(params: Record<string, string>): Promise<LyricsTrack[]> {
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
export async function lookupLrclib(title: string, artist: string): Promise<LookupResult> {
  const artists = artist ? lyricsArtistVariants(artist) : [];
  const primary = artists[0] ?? '';
  const titles = lyricsTitleVariants(title, artist);
  if (titles.length === 0) return { list: [], complete: true };
  const stages: Array<() => Promise<LyricsTrack[]>> = [];
  for (const t of titles) {
    for (const a of artists) stages.push(() => searchLrclib({ track_name: t, artist_name: a }));
  }
  for (const t of titles) stages.push(() => searchLrclib({ q: `${t} ${primary}`.trim() }));
  if (artists.length > 0) {
    stages.push(async () =>
      (await searchLrclib({ q: titles[0] })).filter((t) => artists.some((a) => artistMatches(t.artistName, a)))
    );
  }
  let plainFallback: LyricsTrack[] = [];
  let failures = 0;
  for (const stage of stages) {
    let list: LyricsTrack[];
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

export const lrclibProvider: LyricsProvider = { name: 'lrclib', lookup: lookupLrclib };
