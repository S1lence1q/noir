import type { SearchResult } from '../../types';
import { getPrimaryArtist } from '../../utils/stringUtils';
import {
  addListeningEvent,
  type ListeningEvent,
} from './eventsStore';
import { refreshTasteProfileCache, topArtists } from './tasteProfile';
import { getArtistTopTracks } from '../musicGraph';
import { normalizeName } from '../musicGraph/normalize';

/** Pick at least one; more is fine. The cap only guards against someone selecting the whole grid. */
export const COLD_START_MAX_ARTISTS = 12;
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

function uniqueArtists(artistNames: string[]): string[] {
  return [
    ...new Map(
      artistNames
        .map((name) => name.trim())
        .filter(Boolean)
        .map((name) => [normalizeName(name) || name.toLowerCase(), name] as const)
    ).values(),
  ].slice(0, COLD_START_MAX_ARTISTS);
}

function eventId(now: number, offset: number) {
  return typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
    ? crypto.randomUUID()
    : `seed_${now}_${offset}_${Math.random().toString(36).slice(2)}`;
}

/**
 * Cold start, phase 1 — local only, no network: one synthetic listen per picked artist, so Home
 * can leave the picker at once and mixes have a taste to build from.
 */
export async function seedTasteFromArtists(artistNames: string[]): Promise<void> {
  const unique = uniqueArtists(artistNames);
  if (unique.length === 0) return;
  const now = Date.now();
  await Promise.all(
    unique.map((artist, i) => {
      const artistKey = normalizeName(artist) || artist.toLowerCase();
      return addListeningEvent({
        id: eventId(now, i),
        songKey: `seed:${artistKey}:_`,
        title: artist,
        artist,
        startedAt: now - i * 90_000,
        listenedMs: 180_000,
        durationMs: 210_000,
        outcome: 'completed',
        source: 'seed',
        sourceId: `seed:${artistKey}`,
      });
    })
  );
  refreshTasteProfileCache();
}

/**
 * Cold start, phase 2 — runs in the background after Home is showing: each artist's top tracks
 * as synthetic listens (fetched in parallel), so Your sound and later mixes have real titles.
 */
export async function enrichSeedTaste(artistNames: string[]): Promise<void> {
  const unique = uniqueArtists(artistNames);
  if (unique.length === 0) return;
  const dayMs = 24 * 60 * 60 * 1000;
  const now = Date.now();
  const tops = await Promise.all(
    unique.map((artist) => getArtistTopTracks(artist, TRACKS_PER_ARTIST).catch(() => []))
  );
  let offset = 1;
  const writes: Promise<unknown>[] = [];
  tops.forEach((tracks, i) => {
    const artist = unique[i];
    for (const track of tracks) {
      const title = track.title?.trim() || artist;
      const trackArtist = track.artist?.trim() || artist;
      const artistKey = normalizeName(trackArtist) || trackArtist.toLowerCase();
      const titleKey = normalizeName(title) || title.toLowerCase();
      const durationMs = Math.round((track.durationSec ?? 210) * 1000);
      writes.push(
        addListeningEvent({
          id: eventId(now, offset),
          songKey: `seed:${artistKey}:${titleKey}`,
          title,
          artist: trackArtist,
          artistMbid: track.artistMbid,
          startedAt: now - offset * dayMs - offset * 90_000,
          listenedMs: Math.round(durationMs * 0.85),
          durationMs,
          outcome: 'completed',
          source: 'seed',
          sourceId: `seed:${artistKey}`,
        })
      );
      offset += 1;
    }
  });
  await Promise.all(writes);
  refreshTasteProfileCache();
}
