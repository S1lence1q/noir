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
import { resolveMixCover } from '../../components/shell/noir/NoirMixCover';
import { hasRealArtwork, youtubeThumb } from '../../utils/artwork';
import { genreTitle } from '../../utils/genreName';

const MIX_TRACK_COUNT = 25;
const YOUR_SHARE = 0.4;
/** Show the shelf once we have at least one usable mix. */
const MIN_SHOW = 1;
const MAX_MIXES = 6;
// v4: genre names now "Lo-Fi", "R&B"… (cached mixes carry their name).
const CACHE_PREFIX = 'noir_daily_mixes_v5:';

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

const titleCaseTag = genreTitle;

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
    duration: event.durationMs && event.durationMs > 0 ? Math.round(event.durationMs / 1000) : undefined,
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
type MixListener = (mixes: DailyMix[]) => void;
type MixJob = { promise: Promise<DailyMix[]>; partial: DailyMix[]; listeners: Set<MixListener> };
const inflight = new Map<string, MixJob>();

/**
 * One build per day at a time: a warm-up and Home asking together share the same work.
 * `onProgress` hears the mixes that are ready so far, in order, as each one finishes.
 */
export function loadDailyMixes(
  events: ReadonlyArray<ListeningEvent>,
  fallbackTracks: SearchResult[] = [],
  onProgress?: MixListener
): Promise<DailyMix[]> {
  const day = dayKey();
  let job = inflight.get(day);
  if (!job) {
    const created: MixJob = { promise: Promise.resolve([]), partial: [], listeners: new Set() };
    created.promise = buildDailyMixes(events, fallbackTracks, (mixes) => {
      created.partial = mixes;
      created.listeners.forEach((listener) => listener(mixes));
    }).finally(() => inflight.delete(day));
    inflight.set(day, created);
    job = created;
  }
  if (onProgress) {
    job.listeners.add(onProgress);
    if (job.partial.length > 0) onProgress(job.partial);
  }
  return job.promise;
}

async function buildDailyMixes(
  events: ReadonlyArray<ListeningEvent>,
  fallbackTracks: SearchResult[] = [],
  emit: MixListener = () => {}
): Promise<DailyMix[]> {
  const day = dayKey();
  const taste = resolveTaste(events, fallbackTracks);
  // The cache follows who you listen to, not just the date: a new top artist means a fresh set of mixes.
  const cacheKey = `${day}:${hashString(
    taste
      .slice(0, 12)
      .map((entry) => normalizeName(entry.artist))
      .sort()
      .join('|')
  )}`;
  const cached = readCache(cacheKey);
  if (cached) return cached;

  if (taste.length < 1) return [];

  const tagged = await Promise.all(
    taste.slice(0, 20).map(async (entry) => {
      const tags = await getArtistTags(entry.artist);
      const tag = pickPrimaryTag(tags);
      // No Last.fm tags (local / obscure) → still mixable under a stable bucket.
      return { entry, tag: tag || 'for you' };
    })
  );

  // Tags that end up with the same symbol are one mix: "danish" and "denmark" are both the Danish
  // cross, and two mixes that look identical read as a mistake. Unknown tags keep their own bucket.
  const clusterKey = (tag: string) => {
    const { symbol } = resolveMixCover(tag);
    return symbol === 'sibling' ? `tag:${tag}` : `symbol:${symbol}`;
  };
  const grouped = new Map<string, { entries: TasteArtist[]; tags: Map<string, number> }>();
  for (const row of tagged) {
    const key = clusterKey(row.tag);
    const group = grouped.get(key) ?? { entries: [], tags: new Map<string, number>() };
    group.entries.push(row.entry);
    group.tags.set(row.tag, (group.tags.get(row.tag) ?? 0) + 1);
    grouped.set(key, group);
  }
  // The mix is named after its most common tag.
  const clusters = new Map<string, TasteArtist[]>();
  for (const group of grouped.values()) {
    const tag = [...group.tags.entries()].sort((a, b) => b[1] - a[1])[0][0];
    clusters.set(tag, group.entries);
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

  // Build a few in parallel — sequential was too slow on Home. Each one is announced as it lands,
  // but only as an unbroken run from the first, so the big lead mix never swaps places.
  const slots: (DailyMix | null | undefined)[] = chosen.map(() => undefined);
  const built = await Promise.all(
    chosen.map(async (cluster, i) => {
      const mix = await buildOneMix(events, fallbackTracks, cluster.tag, cluster.artists, day).catch(() => null);
      slots[i] = mix;
      const ready: DailyMix[] = [];
      for (const slot of slots) {
        if (slot === undefined) break;
        if (slot) ready.push(slot);
      }
      if (ready.length > 0) emit(ready);
      return mix;
    })
  );

  const mixes = built.filter((mix): mix is DailyMix => !!mix).slice(0, MAX_MIXES);

  if (mixes.length >= MIN_SHOW) {
    writeCache(cacheKey, mixes);
  }

  return mixes.length >= MIN_SHOW ? mixes : [];
}
