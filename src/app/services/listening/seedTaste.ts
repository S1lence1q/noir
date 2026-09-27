import type { SearchResult } from '../../types';
import { getPrimaryArtist } from '../../utils/stringUtils';
import {
  addListeningEvent,
  type ListeningEvent,
} from './eventsStore';
import { refreshTasteProfileCache, topArtists } from './tasteProfile';
import { getArtistTopTracks } from '../musicGraph';
import { normalizeName } from '../musicGraph/normalize';

export const COLD_START_PICK_COUNT = 3;
const TRACKS_PER_ARTIST = 5;

export type ColdStartArtist = {
  name: string;
  image?: string;
};

export function isTasteEmpty(events: ListeningEvent[]): boolean {
  return topArtists(events).length === 0;
}

/** Unique primary artists from a chart feed — same idea as Discover cold shelf. */
export function artistsFromChart(tracks: SearchResult[], limit = 12): ColdStartArtist[] {
  const seen = new Set<string>();
  const artists: ColdStartArtist[] = [];
  for (const track of tracks) {
    const name = getPrimaryArtist(track.artist);
    const key = normalizeName(name);
    if (!key || seen.has(key)) continue;
    seen.add(key);
    artists.push({
      name,
      image: track.thumbnail || undefined,
    });
    if (artists.length >= limit) break;
  }
  return artists;
}

/** Unique artists from search hits (track-first search). */
export function artistsFromSearch(results: SearchResult[], limit = 8): ColdStartArtist[] {
  const seen = new Set<string>();
  const artists: ColdStartArtist[] = [];
  for (const track of results) {
    const name = getPrimaryArtist(track.artist);
    const key = normalizeName(name);
    if (!key || seen.has(key)) continue;
    seen.add(key);
    artists.push({
      name,
      image: track.thumbnail || undefined,
    });
    if (artists.length >= limit) break;
  }
  return artists;
}

/**
 * Write synthetic completed listens for each picked artist so mixes + Discover
 * personal shelves have taste to work with. Home stays empty until this runs.
 */
export async function seedTasteFromArtists(artistNames: string[]): Promise<void> {
  const unique = [
    ...new Map(
      artistNames
        .map((name) => name.trim())
        .filter(Boolean)
        .map((name) => [normalizeName(name) || name.toLowerCase(), name] as const)
    ).values(),
  ].slice(0, COLD_START_PICK_COUNT);

  if (unique.length === 0) return;

  const dayMs = 24 * 60 * 60 * 1000;
  const now = Date.now();
  let offset = 0;

  for (const artist of unique) {
    const tops = await getArtistTopTracks(artist, TRACKS_PER_ARTIST);
    const tracks =
      tops.length > 0
        ? tops
        : [{ title: `${artist} — seed`, artist, image: undefined as string | undefined }];

    for (const track of tracks) {
      const title = track.title?.trim() || artist;
      const trackArtist = track.artist?.trim() || artist;
      const artistKey = normalizeName(trackArtist) || trackArtist.toLowerCase();
      const titleKey = normalizeName(title) || title.toLowerCase();
      const durationMs = Math.round((track.durationSec ?? 210) * 1000);
      const listenedMs = Math.round(durationMs * 0.85);

      await addListeningEvent({
        id:
          typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
            ? crypto.randomUUID()
            : `seed_${now}_${offset}_${Math.random().toString(36).slice(2)}`,
        songKey: `seed:${artistKey}:${titleKey}`,
        title,
        artist: trackArtist,
        artistMbid: track.artistMbid,
        startedAt: now - offset * dayMs - offset * 90_000,
        listenedMs,
        durationMs,
        outcome: 'completed',
        source: 'seed',
        sourceId: `seed:${artistKey}`,
      });
      offset += 1;
    }
  }

  refreshTasteProfileCache();
}
