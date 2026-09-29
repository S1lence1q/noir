import { getGraphCache, setGraphCache } from './cache';
import {
  getDeezerAlbumTracks,
  getDeezerArtistImage,
  getDeezerArtistRadio,
  getDeezerArtistTopTracks,
  getDeezerNewReleases,
  getDeezerRelatedArtists,
  getDeezerTrackImage,
} from './deezer';
import {
  getLastFmArtistInfo,
  getLastFmArtistTags,
  getLastFmArtistTopTracks,
  getLastFmSimilarArtists,
  getLastFmSimilarTracks,
  getLastFmTagTopTracks,
  getLastFmTrackImage,
} from './lastfm';
import { normalizeName } from './normalize';

export type GraphArtist = {
  name: string;
  mbid?: string;
  image?: string;
  listeners?: number;
  match?: number;
};

export type GraphTrack = {
  title: string;
  artist: string;
  mbid?: string;
  artistMbid?: string;
  image?: string;
  listeners?: number;
  /** Seconds, when known (Deezer). */
  durationSec?: number;
};

export type GraphRelease = {
  title: string;
  artist: string;
  releaseDate: string;
  image?: string;
  deezerId?: number;
};

const DAY_MS = 24 * 60 * 60 * 1000;
const TTL = {
  similar: 7 * DAY_MS,
  tags: 30 * DAY_MS,
  releases: DAY_MS,
  info: 30 * DAY_MS,
  image: 30 * DAY_MS,
};

const EMPTY_TTL_MS = 10 * 60 * 1000;

const inFlight = new Map<string, Promise<unknown>>();
const loggedCacheFailures = new Set<string>();

function logCacheFailure(key: string, error: unknown) {
  if (loggedCacheFailures.has(key)) return;
  loggedCacheFailures.add(key);
  console.warn(`[musicGraph] Cache failed for ${key}`, error);
}

function requestCached<T>(
  key: string,
  ttlMs: number,
  loader: () => Promise<T>,
  fallback: T
): Promise<T> {
  const existing = inFlight.get(key);
  if (existing) return existing as Promise<T>;

  const request = (async () => {
    try {
      const cached = await getGraphCache<T>(key);
      if (cached !== null) return cached;
    } catch (error) {
      logCacheFailure(key, error);
    }

    const value = await loader();
    // Failures and a missing key also come back empty; don't pin those for days.
    const isEmpty = value === undefined || value === null || (Array.isArray(value) && value.length === 0);
    try {
      await setGraphCache(key, value, isEmpty ? EMPTY_TTL_MS : ttlMs);
    } catch (error) {
      logCacheFailure(key, error);
    }
    return value;
  })().catch(() => fallback);

  inFlight.set(key, request);
  void request.then(
    () => {
      if (inFlight.get(key) === request) inFlight.delete(key);
    },
    () => {
      if (inFlight.get(key) === request) inFlight.delete(key);
    }
  );
  return request;
}

function artistKey(artist: string) {
  return normalizeName(artist) || artist.trim().toLowerCase();
}

export function getSimilarArtists(
  artist: string,
  limit = 12,
  deezerId?: number
): Promise<GraphArtist[]> {
  const idPart = deezerId ? `:id:${deezerId}` : '';
  const key = `similar-artists:${artistKey(artist)}${idPart}:${limit}`;
  return requestCached(key, TTL.similar, async () => {
    const deezerRelated = await getDeezerRelatedArtists(artist, limit, deezerId);
    if (deezerRelated.length >= 3) {
      return deezerRelated;
    }
    const lastFmResult = await getLastFmSimilarArtists(artist, limit);
    return lastFmResult.length > 0 ? lastFmResult : deezerRelated;
  }, []);
}

export function getSimilarTracks(
  title: string,
  artist: string,
  limit = 30
): Promise<GraphTrack[]> {
  const key = `similar-tracks:${artistKey(artist)}:${artistKey(title)}:${limit}`;
  return requestCached(
    key,
    TTL.similar,
    () => getLastFmSimilarTracks(title, artist, limit),
    []
  );
}

export function getArtistTags(artist: string): Promise<string[]> {
  return requestCached(`artist-tags:${artistKey(artist)}`, TTL.tags, () => getLastFmArtistTags(artist), []);
}

export function getArtistTopTracks(artist: string, limit = 10): Promise<GraphTrack[]> {
  const key = `artist-top-tracks:${artistKey(artist)}:${limit}`;
  return requestCached(key, TTL.similar, async () => {
    const lastFmTracks = await getLastFmArtistTopTracks(artist, limit);
    return lastFmTracks.length > 0 ? lastFmTracks : getDeezerArtistTopTracks(artist, limit);
  }, []);
}

export function getArtistInfo(
  artist: string
): Promise<{ name: string; mbid?: string; image?: string; listeners?: number } | undefined> {
  return requestCached(`artist-info:${artistKey(artist)}`, TTL.info, () => getLastFmArtistInfo(artist), undefined);
}

export function getArtistRadio(artist: string): Promise<GraphTrack[]> {
  return requestCached(`artist-radio:${artistKey(artist)}`, TTL.similar, () => getDeezerArtistRadio(artist), []);
}

export function getNewReleases(artist: string, days = 30): Promise<GraphRelease[]> {
  return requestCached(
    `new-releases:${artistKey(artist)}:${days}`,
    TTL.releases,
    () => getDeezerNewReleases(artist, days),
    []
  );
}

export function getArtistImage(artist: string, deezerId?: number): Promise<string | undefined> {
  const key =
    deezerId != null && Number.isFinite(deezerId)
      ? `artist-image-v2:deezer:${deezerId}`
      : `artist-image-v2:${artistKey(artist)}`;
  return requestCached(
    key,
    TTL.image,
    async () => {
      const fromDeezer = await getDeezerArtistImage(artist, deezerId);
      if (fromDeezer) return fromDeezer;
      const info = await getLastFmArtistInfo(artist);
      return info?.image;
    },
    undefined
  );
}

export function getTrackImage(title: string, artist: string): Promise<string | undefined> {
  const key = `track-image:${artistKey(artist)}:${artistKey(title)}`;
  return requestCached(
    key,
    TTL.image,
    async () => {
      const fromDeezer = await getDeezerTrackImage(title, artist);
      if (fromDeezer) return fromDeezer;
      const fromLastFm = await getLastFmTrackImage(title, artist);
      if (fromLastFm) return fromLastFm;
      const info = await getLastFmArtistInfo(artist);
      return info?.image;
    },
    undefined
  );
}

export function getTagTopTracks(tag: string, limit = 20): Promise<GraphTrack[]> {
  const key = `tag-top-tracks:${artistKey(tag)}:${limit}`;
  return requestCached(key, TTL.similar, () => getLastFmTagTopTracks(tag, limit), []);
}

export function getAlbumTracks(albumId: number): Promise<GraphTrack[]> {
  return requestCached(`album-tracks:${albumId}`, TTL.releases, () => getDeezerAlbumTracks(albumId), []);
}

declare global {
  interface Window {
    __noirGraph?: {
      getSimilarArtists: typeof getSimilarArtists;
      getSimilarTracks: typeof getSimilarTracks;
      getArtistTags: typeof getArtistTags;
      getArtistTopTracks: typeof getArtistTopTracks;
      getArtistInfo: typeof getArtistInfo;
      getArtistRadio: typeof getArtistRadio;
      getNewReleases: typeof getNewReleases;
      getArtistImage: typeof getArtistImage;
      getTrackImage: typeof getTrackImage;
      getTagTopTracks: typeof getTagTopTracks;
      getAlbumTracks: typeof getAlbumTracks;
    };
  }
}

if (typeof window !== 'undefined' && import.meta.env.DEV) {
  window.__noirGraph = {
    getSimilarArtists,
    getSimilarTracks,
    getArtistTags,
    getArtistTopTracks,
    getArtistInfo,
    getArtistRadio,
    getNewReleases,
    getArtistImage,
    getTrackImage,
    getTagTopTracks,
    getAlbumTracks,
  };
}
