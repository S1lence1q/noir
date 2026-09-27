import type { SearchResult } from '../../types';
import { getListeningEvents } from '../listening/eventsStore';
import { getArtistRadio, getSimilarTracks, type GraphTrack } from '../musicGraph';
import { normalizeName } from '../musicGraph/normalize';
import { graphTrackToSearchResult } from '../discover/discoverFeed';

const DEFAULT_LIMIT = 25;
const AUTOPLAY_LIMIT = 10;

function trackKey(title: string, artist: string) {
  return `${normalizeName(artist)}::${normalizeName(title)}`;
}

function shuffle<T>(items: T[]): T[] {
  const next = [...items];
  for (let i = next.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [next[i], next[j]] = [next[j], next[i]];
  }
  return next;
}

/** Cap consecutive tracks from the same artist at `maxInARow`. */
function interleaveByArtist(tracks: GraphTrack[], maxInARow = 2): GraphTrack[] {
  const byArtist = new Map<string, GraphTrack[]>();
  for (const track of tracks) {
    const key = normalizeName(track.artist) || track.artist;
    const list = byArtist.get(key) ?? [];
    list.push(track);
    byArtist.set(key, list);
  }

  const queues = [...byArtist.values()].map((list) => shuffle(list));
  const out: GraphTrack[] = [];
  let lastKey = '';
  let streak = 0;

  while (queues.some((q) => q.length > 0) && out.length < tracks.length) {
    queues.sort((a, b) => b.length - a.length);
    let picked = false;
    for (let i = 0; i < queues.length; i++) {
      const queue = queues[i];
      if (queue.length === 0) continue;
      const candidate = queue[0];
      const key = normalizeName(candidate.artist) || candidate.artist;
      if (key === lastKey && streak >= maxInARow) continue;
      queue.shift();
      out.push(candidate);
      if (key === lastKey) streak += 1;
      else {
        lastKey = key;
        streak = 1;
      }
      picked = true;
      break;
    }
    if (!picked) {
      // Forced pick when every remaining track repeats the artist.
      const queue = queues.find((q) => q.length > 0);
      if (!queue) break;
      const candidate = queue.shift()!;
      const key = normalizeName(candidate.artist) || candidate.artist;
      out.push(candidate);
      if (key === lastKey) streak += 1;
      else {
        lastKey = key;
        streak = 1;
      }
    }
  }

  return out;
}

async function recentPlayKeys(limit = 50): Promise<Set<string>> {
  try {
    const events = await getListeningEvents();
    const sorted = [...events].sort((a, b) => b.startedAt - a.startedAt).slice(0, limit);
    return new Set(sorted.map((event) => trackKey(event.title, event.artist)));
  } catch {
    return new Set();
  }
}

export type BuildRadioOptions = {
  limit?: number;
  /** Extra keys (`artist::title` or songKeys) to skip. */
  excludeKeys?: Iterable<string>;
};

/**
 * Radio station from a seed track: Last.fm similar + Deezer artist radio,
 * shuffled, max 2 in a row per artist, excludes recent plays.
 */
export async function buildRadioTracks(
  seed: Pick<SearchResult, 'title' | 'artist'>,
  options: BuildRadioOptions = {}
): Promise<SearchResult[]> {
  const limit = options.limit ?? DEFAULT_LIMIT;
  const exclude = new Set(
    [...(options.excludeKeys ?? []), trackKey(seed.title, seed.artist)].map((key) => key)
  );
  const recent = await recentPlayKeys(50);
  for (const key of recent) exclude.add(key);

  const [similar, radio] = await Promise.all([
    getSimilarTracks(seed.title, seed.artist, 40),
    getArtistRadio(seed.artist),
  ]);

  const pool: GraphTrack[] = [];
  const seen = new Set<string>();

  for (const track of [...similar, ...radio]) {
    const key = trackKey(track.title, track.artist);
    if (!track.title || !track.artist || seen.has(key) || exclude.has(key)) continue;
    seen.add(key);
    pool.push(track);
  }

  const ordered = interleaveByArtist(shuffle(pool), 2).slice(0, limit);
  return ordered.map((track) => graphTrackToSearchResult(track, `radio:${normalizeName(seed.artist)}`));
}

export async function buildAutoplayTracks(
  seed: Pick<SearchResult, 'title' | 'artist'>,
  excludeKeys?: Iterable<string>
): Promise<SearchResult[]> {
  return buildRadioTracks(seed, { limit: AUTOPLAY_LIMIT, excludeKeys });
}

export function radioStationLabel(artist: string) {
  return `Radio · ${artist}`;
}
