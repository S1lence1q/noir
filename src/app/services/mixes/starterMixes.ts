import type { SearchResult } from '../../types';
import { worldForTag } from '../../utils/ditherCover';
import { getCachedChartTracks } from '../../utils/chartFeeds';
import { normalizeName } from '../musicGraph/normalize';
import type { DailyMix } from './dailyMixes';

const MIX_SIZE = 25;
const MIN_GENRE_TRACKS = 6;
const MAX_STARTERS = 3;
const STARTER_DAY_KEY = 'noir_starter_mixes_day';

const dayKey = (now = new Date()) => `${now.getFullYear()}-${now.getMonth() + 1}-${now.getDate()}`;

/** Apple's "Hip-Hop/Rap" and "R&B/Soul" read better as the short names the covers know. */
function genreName(genre: string): string {
  const g = genre.toLowerCase();
  if (/hip-?hop|rap/.test(g)) return 'Rap';
  if (/r&b|soul/.test(g)) return 'R&B';
  if (/singer|songwriter/.test(g)) return 'Singer-Songwriter';
  return genre.replace(/\//g, ' / ');
}

function home(): string {
  try {
    return localStorage.getItem('elva_profile_country') || 'dk';
  } catch {
    return 'dk';
  }
}

function alternate<T>(...lists: T[][]): T[] {
  const out: T[] = [];
  const longest = Math.max(0, ...lists.map((list) => list.length));
  for (let i = 0; i < longest; i++) for (const list of lists) if (list[i]) out.push(list[i]);
  return out;
}

function toMix(id: string, tag: string, name: string, tracks: SearchResult[]): DailyMix {
  const artists = [...new Set(tracks.map((t) => t.artist))];
  return {
    id,
    tag,
    name,
    subtitle: artists.slice(0, 3).join(', '),
    world: worldForTag(tag),
    coverImage: tracks.find((t) => t.thumbnail)?.thumbnail,
    artists,
    tracks: tracks.slice(0, MIX_SIZE),
    dayKey: dayKey(),
  };
}

/**
 * A few mixes out of charts already on the device, so Home is never empty while the personal ones build:
 * one blended "Top Hits" and up to two genre mixes (pop, rap…). No network.
 */
export function buildStarterMixes(): DailyMix[] {
  const stores = [...new Set([home(), 'us', 'gb'])];
  const seen = new Set<string>();
  const pool: SearchResult[] = [];
  for (const track of alternate(...stores.map((store) => getCachedChartTracks(store)))) {
    const key = `${normalizeName(track.artist)}::${normalizeName(track.title)}`;
    if (seen.has(key)) continue;
    seen.add(key);
    pool.push(track);
  }
  if (pool.length < MIN_GENRE_TRACKS) return [];

  const byGenre = new Map<string, SearchResult[]>();
  for (const track of pool) {
    if (!track.genre) continue;
    const name = genreName(track.genre);
    byGenre.set(name, [...(byGenre.get(name) ?? []), track]);
  }
  const genres = [...byGenre.entries()]
    .filter(([, tracks]) => tracks.length >= MIN_GENRE_TRACKS)
    .sort((a, b) => b[1].length - a[1].length)
    .slice(0, MAX_STARTERS - 1);

  return [
    // Genre first: the lead card shouldn't be yet another chart.
    ...genres.map(([name, tracks]) => toMix(`start:${normalizeName(name)}`, name, `${name} Now`, tracks)),
    toMix('start:top', 'top hits', 'Top Hits', pool),
  ].slice(0, MAX_STARTERS);
}

/** Marks today as a day to show starters beside the personal mixes (set when first-run picks are saved). */
export function markStartersToday() {
  try {
    localStorage.setItem(STARTER_DAY_KEY, dayKey());
  } catch {
    /* private mode */
  }
}

export function startersActiveToday(): boolean {
  try {
    return localStorage.getItem(STARTER_DAY_KEY) === dayKey();
  } catch {
    return false;
  }
}
