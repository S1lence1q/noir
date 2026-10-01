import { lrclibProvider } from './lrclib';
import { appleMusicProvider } from './appleMusic';
import type { LookupResult, LyricsProvider } from './types';

export type { LyricsTrack, LookupResult, LyricsProvider } from './types';
export { readLyricsCache, writeLyricsCache } from './cache';

/** In order of preference. Later sources are only asked when the earlier ones have nothing synced. */
const PROVIDERS: LyricsProvider[] = [lrclibProvider, appleMusicProvider];

/**
 * Ask the sources one at a time and stop at the first that has synced lyrics. If none does, keep the
 * first plain-text answer. A source that fails outright is skipped, and the result is marked incomplete
 * so an outage is not remembered as "no lyrics".
 */
export async function lookupLyrics(title: string, artistName: string): Promise<LookupResult> {
  // Placeholder artists carry no information: search by title alone.
  const artist = artistName === 'Unknown Artist' || artistName === 'Web Stream' ? '' : artistName;
  let plain: LookupResult['list'] = [];
  let complete = true;
  let failures = 0;
  for (const provider of PROVIDERS) {
    let result: LookupResult;
    try {
      result = await provider.lookup(title, artist);
    } catch {
      failures++;
      complete = false;
      continue;
    }
    if (result.list.some((t) => t.syncedLyrics)) return { list: result.list, complete: true };
    if (!result.complete) complete = false;
    if (plain.length === 0 && result.list.length > 0) plain = result.list;
  }
  if (failures === PROVIDERS.length) throw new Error('API Error');
  return { list: plain, complete };
}
