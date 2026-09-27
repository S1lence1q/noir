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
import { hasRealArtwork, youtubeThumb } from '../../utils/artwork';

const MIX_TRACK_COUNT = 25;
const YOUR_SHARE = 0.4;
/** Show the shelf once we have at least one usable mix. */
const MIN_SHOW = 1;
const MAX_MIXES = 6;
const CACHE_PREFIX = 'noir_daily_mixes_v3:';

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
    thumbnail: youtubeThumb(event.songKey) || '',
    videoId: event.songKey.length === 11 && !event.songKey.startsWith('local:') ? event.songKey : '',
  };
}

async function enrichMixArtwork(tracks: SearchResult[]): Promise<SearchResult[]> {
  return Promise.all(
    tracks.map(async (track) => {
      if (hasRealArtwork(track.thumbnail)) return track;
      const fromYt = youtubeThumb(track.videoId);
      if (fromYt) return { ...track, thumbnail: fromYt };
      try {
        const image = await getTrackImage(track.title, track.artist);
        return image ? { ...track, thumbnail: image } : track;
      } catch {
        return track;
      }
    })
  );
}

/** Taste from events, or fall back to recently-played artists (Home often has those first). */
function resolveTaste(
  events: ReadonlyArray<ListeningEvent>,
  fallbackTracks: SearchResult[]
): TasteArtist[] {
  const fromEvents = topArtists(events, 30);
  if (fromEvents.length >= 2) return fromEvents.slice(0, 30);

  const scores = new Map<string, TasteArtist>();
  for (const track of fallbackTracks) {
    const artist = track.artist?.trim();
    if (!artist) continue;
    const key = artist.toLocaleLowerCase();
    if (key === 'unknown artist' || key === 'unknown') continue;
    const current = scores.get(key) ?? { artist, score: 0, plays: 0 };
    current.score += 1;
    current.plays += 1;
    scores.set(key, current);
  }
  return [...scores.values()].sort((a, b) => b.score - a.score).slice(0, 30);
}

async function buildMixTracks(
  events: ReadonlyArray<ListeningEvent>,
  fallbackTracks: SearchResult[],
  clusterArtists: TasteArtist[],
  mixId: string,
  day: string
): Promise<SearchResult[]> {
  const artistKeys = new Set(clusterArtists.map((a) => normalizeName(a.artist)));
  const yourTarget = Math.round(MIX_TRACK_COUNT * YOUR_SHARE);
  const similarTarget = MIX_TRACK_COUNT - yourTarget;

  const fromPool = new Map<string, SearchResult>();

  for (const taste of topTracks(events, 30)) {
    if (!artistKeys.has(normalizeName(taste.artist))) continue;
    const event = events.find((e) => e.songKey === taste.songKey);
    if (!event) continue;
    const key = trackKey(event.title, event.artist);
    if (!fromPool.has(key)) fromPool.set(key, eventToSearchResult(event));
  }

  for (const track of fallbackTracks) {
    if (!artistKeys.has(normalizeName(track.artist))) continue;
    const key = trackKey(track.title, track.artist);
    if (!fromPool.has(key)) fromPool.set(key, track);
  }

  let yours = [...fromPool.values()].slice(0, yourTarget);

  if (yours.length < yourTarget) {
    const pads = await Promise.all(
      clusterArtists.slice(0, 3).map((a) => getArtistTopTracks(a.artist, 8))
    );
    for (const batch of pads) {
      for (const track of batch) {
        const key = trackKey(track.title, track.artist);
        if (fromPool.has(key)) continue;
        const result = graphTrackToSearchResult(track, mixId);
        fromPool.set(key, result);
        yours.push(result);
        if (yours.length >= yourTarget) break;
      }
      if (yours.length >= yourTarget) break;
    }
    yours = yours.slice(0, yourTarget);
  }

  const seen = new Set(yours.map((t) => trackKey(t.title, t.artist)));
  const similarPool: GraphTrack[] = [];

  // One seed artist is enough for speed; Last.fm is rate-limited.
  const seed = clusterArtists[0];
  if (seed) {
    const related = (await getSimilarArtists(seed.artist, 8))
      .map((r) => r.name)
      .filter((name) => !artistKeys.has(normalizeName(name)))
      .slice(0, 5);
    const tops = await Promise.all(related.map((name) => getArtistTopTracks(name, 5)));
    for (const batch of tops) {
      for (const track of batch) {
        const key = trackKey(track.title, track.artist);
        if (seen.has(key)) continue;
        seen.add(key);
        similarPool.push(track);
      }
    }
  }

  // If similar is thin, pad with more top tracks from the cluster itself.
  if (similarPool.length < similarTarget) {
    const more = await Promise.all(
      clusterArtists.slice(0, 4).map((a) => getArtistTopTracks(a.artist, 8))
    );
    for (const batch of more) {
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
  return enrichMixArtwork(combined);
}

async function buildOneMix(
  events: ReadonlyArray<ListeningEvent>,
  fallbackTracks: SearchResult[],
  tag: string,
  clusterArtists: TasteArtist[],
  day: string
): Promise<DailyMix | null> {
  const tagKey = normalizeName(tag) || tag;
  const id = `mix:${day}:${tagKey}`;
  const names = clusterArtists.map((a) => a.artist);
  const tracks = await buildMixTracks(events, fallbackTracks, clusterArtists, id, day);
  if (tracks.length < 3) return null;

  const top = clusterArtists[0];
  const coverImage =
    (await getArtistImage(top.artist)) || tracks.find((t) => hasRealArtwork(t.thumbnail))?.thumbnail;

  const subtitle =
    names.length <= 3 ? names.join(', ') : `${names.slice(0, 3).join(', ')} and more`;

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

/**
 * Build 1–6 daily mixes. Uses listening events when present; falls back to
 * recently-played artists so Home still gets mixes before T09 history is deep.
 */
export async function loadDailyMixes(
  events: ReadonlyArray<ListeningEvent>,
  fallbackTracks: SearchResult[] = []
): Promise<DailyMix[]> {
  const day = dayKey();
  const cached = readCache(day);
  if (cached) return cached;

  const taste = resolveTaste(events, fallbackTracks);
  if (taste.length < 1) return [];

  const tagged = await Promise.all(
    taste.slice(0, 20).map(async (entry) => {
      const tags = await getArtistTags(entry.artist);
      const tag = pickPrimaryTag(tags);
      // No Last.fm tags (local / obscure) → still mixable under a stable bucket.
      return { entry, tag: tag || 'for you' };
    })
  );

  const clusters = new Map<string, TasteArtist[]>();
  for (const row of tagged) {
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

  const multi = ranked.filter((c) => c.size >= 2);
  const singles = ranked.filter((c) => c.size === 1);
  const chosen = [...multi, ...singles].slice(0, MAX_MIXES);

  // Build a few in parallel — sequential was too slow on Home.
  const built = await Promise.all(
    chosen.map((cluster) =>
      buildOneMix(events, fallbackTracks, cluster.tag, cluster.artists, day)
    )
  );

  const mixes = built.filter((mix): mix is DailyMix => !!mix).slice(0, MAX_MIXES);

  if (mixes.length >= MIN_SHOW) {
    writeCache(day, mixes);
  }

  return mixes.length >= MIN_SHOW ? mixes : [];
}
