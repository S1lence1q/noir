import type { SearchResult } from '../../types';
import type { ColorWorld } from '../../utils/ditherCover';
import { hashString, worldForTag } from '../../utils/ditherCover';
import type { ListeningEvent } from '../listening/eventsStore';
import { topArtists, topTracks, type TasteArtist } from '../listening/tasteProfile';
import {
  getArtistImage,
  getArtistTags,
  getArtistTopTracks,
  getSimilarArtists,
  getTrackImage,
  type GraphTrack,
} from '../musicGraph';
import { normalizeName } from '../musicGraph/normalize';
import { graphTrackToSearchResult } from '../discover/discoverFeed';

const MIX_TRACK_COUNT = 25;
const YOUR_SHARE = 0.4;
const MIN_SHOW = 3;
const MAX_MIXES = 6;
const CACHE_PREFIX = 'noir_daily_mixes_v1:';

const SKIP_TAGS = new Set([
  'seen live',
  'favorites',
  'favourite',
  'all',
  'awesome',
  'under 2000 listeners',
  'beautiful',
  'love',
  'albums i own',
]);

export type DailyMix = {
  id: string;
  tag: string;
  name: string;
  subtitle: string;
  world: ColorWorld;
  coverImage?: string;
  artists: string[];
  tracks: SearchResult[];
  dayKey: string;
};

function dayKey(now = new Date()) {
  return `${now.getFullYear()}-${now.getMonth() + 1}-${now.getDate()}`;
}

function titleCaseTag(tag: string) {
  return tag
    .split(/[\s-_]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

function mulberry32(seed: number) {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function shuffleSeeded<T>(items: T[], seed: number): T[] {
  const arr = [...items];
  const rand = mulberry32(seed);
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function pickPrimaryTag(tags: string[]): string | undefined {
  return tags.map((t) => t.trim().toLowerCase()).find((t) => t.length >= 2 && !SKIP_TAGS.has(t));
}

function readCache(key: string): DailyMix[] | null {
  try {
    const raw = localStorage.getItem(CACHE_PREFIX + key);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as DailyMix[];
    return Array.isArray(parsed) && parsed.length > 0 ? parsed : null;
  } catch {
    return null;
  }
}

function writeCache(key: string, mixes: DailyMix[]) {
  try {
    localStorage.setItem(CACHE_PREFIX + key, JSON.stringify(mixes));
  } catch {
    /* ignore quota */
  }
}

function trackKey(title: string, artist: string) {
  return `${normalizeName(artist)}::${normalizeName(title)}`;
}

function eventToSearchResult(event: ListeningEvent): SearchResult {
  return {
    id: `listen:${event.songKey}`,
    title: event.title,
    artist: event.artist,
    thumbnail: '',
    videoId: event.songKey.length === 11 && !event.songKey.startsWith('local:') ? event.songKey : '',
  };
}

async function enrichThumbnails(tracks: SearchResult[]): Promise<SearchResult[]> {
  return Promise.all(
    tracks.map(async (track) => {
      if (track.thumbnail?.trim()) return track;
      const image = await getTrackImage(track.title, track.artist);
      return image ? { ...track, thumbnail: image } : track;
    })
  );
}

async function buildMixTracks(
  events: ReadonlyArray<ListeningEvent>,
  clusterArtists: TasteArtist[],
  mixId: string,
  day: string
): Promise<SearchResult[]> {
  const artistKeys = new Set(clusterArtists.map((a) => normalizeName(a.artist)));
  const yourTarget = Math.round(MIX_TRACK_COUNT * YOUR_SHARE);
  const similarTarget = MIX_TRACK_COUNT - yourTarget;

  const yourPlays = topTracks(events, 30)
    .filter((t) => artistKeys.has(normalizeName(t.artist)))
    .slice(0, yourTarget * 2);

  const fromEvents = new Map<string, SearchResult>();
  for (const taste of yourPlays) {
    const event = events.find((e) => e.songKey === taste.songKey);
    if (!event) continue;
    const key = trackKey(event.title, event.artist);
    if (!fromEvents.has(key)) fromEvents.set(key, eventToSearchResult(event));
  }
  let yours = [...fromEvents.values()].slice(0, yourTarget);

  // Pad yours with those artists' top tracks if listening history is thin.
  if (yours.length < yourTarget) {
    const pads = await Promise.all(
      clusterArtists.slice(0, 4).map((a) => getArtistTopTracks(a.artist, 6))
    );
    for (const batch of pads) {
      for (const track of batch) {
        const key = trackKey(track.title, track.artist);
        if (fromEvents.has(key)) continue;
        const result = graphTrackToSearchResult(track, mixId);
        fromEvents.set(key, result);
        yours.push(result);
        if (yours.length >= yourTarget) break;
      }
      if (yours.length >= yourTarget) break;
    }
    yours = yours.slice(0, yourTarget);
  }

  const seen = new Set(yours.map((t) => trackKey(t.title, t.artist)));
  const similarPool: GraphTrack[] = [];

  const seedArtists = clusterArtists.slice(0, 3);
  for (const seed of seedArtists) {
    const related = await getSimilarArtists(seed.artist, 6);
    const relatedNames = related
      .map((r) => r.name)
      .filter((name) => !artistKeys.has(normalizeName(name)))
      .slice(0, 4);
    const tops = await Promise.all(relatedNames.map((name) => getArtistTopTracks(name, 5)));
    for (const batch of tops) {
      for (const track of batch) {
        const key = trackKey(track.title, track.artist);
        if (seen.has(key)) continue;
        seen.add(key);
        similarPool.push(track);
      }
    }
  }

  const similar = shuffleSeeded(similarPool, hashString(`${mixId}:sim:${day}`))
    .slice(0, similarTarget)
    .map((track) => graphTrackToSearchResult(track, mixId));

  const combined = shuffleSeeded([...yours, ...similar], hashString(`${mixId}:all:${day}`)).slice(
    0,
    MIX_TRACK_COUNT
  );

  return enrichThumbnails(combined);
}

async function buildOneMix(
  events: ReadonlyArray<ListeningEvent>,
  tag: string,
  clusterArtists: TasteArtist[],
  day: string
): Promise<DailyMix | null> {
  const tagKey = normalizeName(tag) || tag;
  const id = `mix:${day}:${tagKey}`;
  const names = clusterArtists.map((a) => a.artist);
  const tracks = await buildMixTracks(events, clusterArtists, id, day);
  if (tracks.length < MIN_SHOW) return null;

  const top = clusterArtists[0];
  const coverImage = (await getArtistImage(top.artist)) || tracks.find((t) => t.thumbnail)?.thumbnail;

  const subtitle =
    names.length <= 3
      ? names.join(', ')
      : `${names.slice(0, 3).join(', ')} and more`;

  return {
    id,
    tag,
    name: `${titleCaseTag(tag)} Mix`,
    subtitle,
    world: worldForTag(tag),
    coverImage,
    artists: names,
    tracks,
    dayKey: day,
  };
}

export async function loadDailyMixes(events: ReadonlyArray<ListeningEvent>): Promise<DailyMix[]> {
  const day = dayKey();
  const cached = readCache(day);
  if (cached) return cached;

  const taste = topArtists(events, 30).slice(0, 30);
  if (taste.length < 2) return [];

  const tagged = await Promise.all(
    taste.map(async (entry) => {
      const tags = await getArtistTags(entry.artist);
      const tag = pickPrimaryTag(tags);
      return tag ? { entry, tag } : null;
    })
  );

  const clusters = new Map<string, TasteArtist[]>();
  for (const row of tagged) {
    if (!row) continue;
    const list = clusters.get(row.tag) ?? [];
    list.push(row.entry);
    clusters.set(row.tag, list);
  }

  const ranked = [...clusters.entries()]
    .map(([tag, artists]) => ({
      tag,
      artists: [...artists].sort((a, b) => b.score - a.score),
      score: artists.reduce((sum, a) => sum + a.score, 0),
      size: artists.length,
    }))
    .sort((a, b) => b.size - a.size || b.score - a.score);

  // Prefer multi-artist clusters; pad with singles so we can reach MIN_SHOW mixes.
  const multi = ranked.filter((c) => c.size >= 2);
  const singles = ranked.filter((c) => c.size === 1);
  const chosen = [...multi, ...singles].slice(0, MAX_MIXES);

  const mixes: DailyMix[] = [];
  for (const cluster of chosen) {
    const mix = await buildOneMix(events, cluster.tag, cluster.artists, day);
    if (mix) mixes.push(mix);
    if (mixes.length >= MAX_MIXES) break;
  }

  if (mixes.length >= MIN_SHOW) {
    writeCache(day, mixes);
  }

  return mixes.length >= MIN_SHOW ? mixes : [];
}
