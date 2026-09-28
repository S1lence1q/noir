import { fetchArtistDiscography } from './apiUtils';
import { getDiscographyCache, setDiscographyCache } from './discographyCache';
import {
  identityCacheKey,
  resolveArtistIdentity,
  type ArtistIdentity,
} from '../services/artistIdentity';
import {
  getArtistTopTracks,
  getTrackImage,
  type GraphTrack,
} from '../services/musicGraph';
import { getDeezerArtistTopTracks } from '../services/musicGraph/deezer';
import { graphTrackToSearchResult } from '../services/discover/discoverFeed';
import { normalizeName } from '../services/musicGraph/normalize';
import { displayArtistName } from './stringUtils';
import { hasRealArtwork } from './artwork';
import type { SearchResult } from '../types';

function trackKey(track: SearchResult): string {
  return `${normalizeName(track.artist)}::${normalizeName(track.title)}`;
}

function titlesLooselyMatch(a: string, b: string): boolean {
  const na = normalizeName(a);
  const nb = normalizeName(b);
  if (!na || !nb) return false;
  return na === nb || na.includes(nb) || nb.includes(na);
}

/** Prefer playable (videoId) rows when merging Popular + discography; keep any real cover. */
export function mergeArtistTrackLists(
  preferred: SearchResult[],
  incoming: SearchResult[]
): SearchResult[] {
  const map = new Map<string, SearchResult>();
  for (const track of preferred) {
    map.set(trackKey(track), track);
  }
  for (const track of incoming) {
    const key = trackKey(track);
    const existing = map.get(key);
    if (!existing) {
      map.set(key, track);
      continue;
    }
    const preferredThumb = hasRealArtwork(existing.thumbnail)
      ? existing.thumbnail
      : hasRealArtwork(track.thumbnail)
        ? track.thumbnail
        : existing.thumbnail?.trim() || track.thumbnail?.trim() || '';
    if (!existing.videoId && track.videoId) {
      map.set(key, { ...existing, ...track, thumbnail: preferredThumb || track.thumbnail?.trim() || '' });
    } else if (!hasRealArtwork(existing.thumbnail) && hasRealArtwork(track.thumbnail)) {
      map.set(key, { ...existing, thumbnail: track.thumbnail });
    }
  }
  const preferredKeys = new Set(preferred.map(trackKey));
  const head = preferred.map((track) => map.get(trackKey(track))!).filter(Boolean);
  const tail = [...map.values()].filter((track) => !preferredKeys.has(trackKey(track)));
  return [...head, ...tail];
}

export type DiscographyPeek = {
  tracks: SearchResult[];
  stale: boolean;
  channelId?: string;
};

/** Tracks already cached for this artist (sync). Supports identity key or bare name. */
export const peekCachedDiscography = (
  identityOrName: string,
  options?: { allowStale?: boolean; artistName?: string }
): SearchResult[] | null => {
  const entry = getDiscographyCache(identityOrName, {
    allowStale: options?.allowStale ?? false,
    artistName: options?.artistName,
  });
  return entry?.tracks?.length ? entry.tracks : null;
};

export const peekCachedDiscographyEntry = (
  identityOrName: string,
  options?: { allowStale?: boolean; artistName?: string }
): DiscographyPeek | null => {
  const entry = getDiscographyCache(identityOrName, {
    allowStale: options?.allowStale ?? true,
    artistName: options?.artistName,
  });
  if (!entry?.tracks?.length) return null;
  return {
    tracks: entry.tracks,
    stale: entry.stale,
    channelId: entry.channelId || undefined,
  };
};

export type LoadDiscographyOptions = {
  limit?: number;
  channelId?: string;
  channelType?: 'topic' | 'vevo' | 'official' | 'provided';
  identity?: Pick<ArtistIdentity, 'mbid' | 'deezerId' | 'channelId' | 'canonicalName'>;
  /** When true, return stale cache immediately without fetching (caller refreshes). */
  skipFetchIfFresh?: boolean;
};

/** Returns cached tracks or fetches, writes cache, then returns tracks. */
export const loadArtistDiscographyWithCache = async (
  artistName: string,
  limitOrOptions: number | LoadDiscographyOptions = 120,
  channelIdHint?: string
): Promise<SearchResult[]> => {
  const options: LoadDiscographyOptions =
    typeof limitOrOptions === 'number'
      ? { limit: limitOrOptions, channelId: channelIdHint }
      : { ...limitOrOptions, channelId: limitOrOptions.channelId || channelIdHint };

  const limit = options.limit ?? 120;
  const identityKey = options.identity
    ? identityCacheKey(options.identity)
    : identityCacheKey({ canonicalName: artistName, channelId: options.channelId });

  const cached = peekCachedDiscographyEntry(identityKey, {
    allowStale: true,
    artistName,
  });
  if (cached && !cached.stale && options.skipFetchIfFresh !== false) {
    return cached.tracks;
  }

  const { tracks, topicResult } = await fetchArtistDiscography(artistName, limit, {
    channelId: options.channelId || options.identity?.channelId,
    channelType: options.channelType,
  });

  if (tracks.length > 0) {
    const resolvedChannelId =
      topicResult?.channelId || options.channelId || options.identity?.channelId || '';
    const resolvedType = (topicResult?.type ?? options.channelType ?? 'provided') as
      | 'topic'
      | 'vevo'
      | 'official'
      | 'provided';
    setDiscographyCache(identityKey, tracks, resolvedChannelId, resolvedType, artistName);
  }
  return tracks.length > 0 ? tracks : cached?.tracks || [];
};

/** Fast Popular list from Last.fm/Deezer — enrich missing art via Deezer covers. */
export async function loadArtistPopularTracks(
  artistName: string,
  limit = 10,
  deezerId?: number
): Promise<SearchResult[]> {
  const lookupName = displayArtistName(artistName);
  const tracks = await getArtistTopTracks(lookupName, limit);

  // Last.fm tops rarely ship real artwork; overlay Deezer album covers by title, then per-track search.
  let deezerTops: GraphTrack[] = [];
  if (tracks.some((track) => !hasRealArtwork(track.image))) {
    try {
      deezerTops = await getDeezerArtistTopTracks(lookupName, Math.max(limit, 25), deezerId);
    } catch {
      // optional
    }
  }

  const withArt = await Promise.all(
    tracks.map(async (track) => {
      if (hasRealArtwork(track.image)) return track;
      const exact = deezerTops.find(
        (candidate) =>
          hasRealArtwork(candidate.image) &&
          normalizeName(candidate.title) === (normalizeName(track.title) || track.title.toLowerCase())
      );
      const loose =
        exact ||
        deezerTops.find(
          (candidate) => hasRealArtwork(candidate.image) && titlesLooselyMatch(candidate.title, track.title)
        );
      if (loose?.image) {
        return { ...track, image: loose.image, durationSec: track.durationSec ?? loose.durationSec };
      }
      try {
        const image = await getTrackImage(track.title, track.artist || lookupName);
        return image ? { ...track, image } : track;
      } catch {
        return track;
      }
    })
  );

  return withArt.map((track) => {
    const result = graphTrackToSearchResult(track, `popular:${normalizeName(lookupName)}`);
    return {
      ...result,
      artist: displayArtistName(result.artist || lookupName),
    };
  });
}

const prefetchInFlight = new Set<string>();

/** Warm identity + Popular + discography cache without opening the profile. */
export async function prefetchArtistProfile(input: {
  name: string;
  channelId?: string;
  isTopic?: boolean;
  mbid?: string;
  deezerId?: number;
}): Promise<void> {
  const key = input.name.trim().toLowerCase();
  if (!key || prefetchInFlight.has(key)) return;
  prefetchInFlight.add(key);
  try {
    const identity = await resolveArtistIdentity({
      name: input.name,
      channelId: input.channelId,
      isTopic: input.isTopic,
      mbid: input.mbid,
      deezerId: input.deezerId,
    });
    await Promise.all([
      loadArtistPopularTracks(identity.canonicalName || input.name, 10),
      loadArtistDiscographyWithCache(identity.canonicalName || input.name, {
        limit: 40,
        channelId: identity.channelId || input.channelId,
        channelType: identity.channelType,
        identity,
      }),
    ]);
  } catch (error) {
    console.warn('[artist] Prefetch failed', error);
  } finally {
    prefetchInFlight.delete(key);
  }
}
