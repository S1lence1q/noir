import type { GraphArtist, GraphTrack } from './index';
import { cleanName, normalizeName } from './normalize';

const LASTFM_ENDPOINT = 'https://ws.audioscrobbler.com/2.0/';
const LASTFM_API_KEY = import.meta.env.VITE_LASTFM_API_KEY?.trim();

let requestQueue = Promise.resolve();
let lastRequestAt = 0;
const loggedFailures = new Set<string>();

function logFailure(method: string, error: unknown) {
  if (loggedFailures.has(method)) return;
  loggedFailures.add(method);
  console.warn(`[musicGraph] Last.fm ${method} failed`, error);
}

/** Last.fm serves this grey star for every artist/track without artwork. */
const LASTFM_PLACEHOLDER = '2a96cbd8b46e442fc41c2b86b821562f';

function imageFromLastFm(images?: Array<{ '#text'?: string; size?: string }>) {
  const url = images?.find((image) => image.size === 'extralarge' || image.size === 'large')?.['#text'] ||
    images?.[images.length - 1]?.['#text'] ||
    undefined;
  return url && !url.includes(LASTFM_PLACEHOLDER) ? url : undefined;
}

function scheduleRequest<T>(request: () => Promise<T>): Promise<T> {
  const next = requestQueue.then(async () => {
    const waitMs = Math.max(0, 250 - (Date.now() - lastRequestAt));
    if (waitMs > 0) await new Promise((resolve) => setTimeout(resolve, waitMs));
    lastRequestAt = Date.now();
    return request();
  });
  requestQueue = next.then(() => undefined, () => undefined);
  return next;
}

async function requestLastFm<T>(
  method: string,
  params: Record<string, string | number>
): Promise<T | null> {
  if (!LASTFM_API_KEY) return null;

  const query = new URLSearchParams({
    method,
    format: 'json',
    api_key: LASTFM_API_KEY,
  });
  Object.entries(params).forEach(([key, value]) => query.set(key, String(value)));

  try {
    return await scheduleRequest(async () => {
      const response = await fetch(`${LASTFM_ENDPOINT}?${query.toString()}`);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      const payload = await response.json();
      if (payload.error) {
        throw new Error(payload.message || `Last.fm error ${payload.error}`);
      }
      return payload as T;
    });
  } catch (error) {
    logFailure(method, error);
    return null;
  }
}

export async function getLastFmSimilarArtists(artist: string, limit: number): Promise<GraphArtist[]> {
  type Response = {
    similarartists?: {
      artist?: Array<{ name?: string; mbid?: string; match?: string; listeners?: string; image?: Array<{ '#text'?: string; size?: string }> }>;
    };
  };
  const response = await requestLastFm<Response>('artist.getSimilar', {
    artist: cleanName(artist),
    limit,
  });
  return (response?.similarartists?.artist ?? [])
    .filter((item) => !!item.name)
    .map((item) => ({
      name: item.name!,
      mbid: item.mbid || undefined,
      image: imageFromLastFm(item.image),
      listeners: item.listeners ? Number(item.listeners) : undefined,
      match: item.match ? Number(item.match) : undefined,
    }));
}

export async function getLastFmSimilarTracks(
  title: string,
  artist: string,
  limit: number
): Promise<GraphTrack[]> {
  type Response = {
    similartracks?: {
      track?: Array<{
        name?: string;
        mbid?: string;
        listeners?: string;
        artist?: { name?: string; mbid?: string };
        image?: Array<{ '#text'?: string; size?: string }>;
      }>;
    };
  };
  const response = await requestLastFm<Response>('track.getSimilar', {
    track: cleanName(title),
    artist: cleanName(artist),
    limit,
  });
  return (response?.similartracks?.track ?? [])
    .filter((item) => !!item.name && !!item.artist?.name)
    .map((item) => ({
      title: item.name!,
      artist: item.artist!.name!,
      mbid: item.mbid || undefined,
      artistMbid: item.artist?.mbid || undefined,
      image: imageFromLastFm(item.image),
      listeners: item.listeners ? Number(item.listeners) : undefined,
    }));
}

export async function getLastFmArtistTags(artist: string): Promise<string[]> {
  type Response = {
    toptags?: { tag?: Array<{ name?: string }> };
  };
  const response = await requestLastFm<Response>('artist.getTopTags', {
    artist: cleanName(artist),
  });
  return (response?.toptags?.tag ?? [])
    .map((tag) => tag.name?.trim())
    .filter((tag): tag is string => !!tag)
    .slice(0, 10);
}

export async function getLastFmArtistTopTracks(artist: string, limit: number): Promise<GraphTrack[]> {
  type Response = {
    toptracks?: {
      track?: Array<{
        name?: string;
        mbid?: string;
        listeners?: string;
        artist?: { name?: string; mbid?: string };
        image?: Array<{ '#text'?: string; size?: string }>;
      }>;
    };
  };
  const response = await requestLastFm<Response>('artist.getTopTracks', {
    artist: cleanName(artist),
    limit,
  });
  return (response?.toptracks?.track ?? [])
    .filter((item) => !!item.name)
    .map((item) => ({
      title: item.name!,
      artist: item.artist?.name || cleanName(artist),
      mbid: item.mbid || undefined,
      artistMbid: item.artist?.mbid || undefined,
      image: imageFromLastFm(item.image),
      listeners: item.listeners ? Number(item.listeners) : undefined,
    }));
}

export async function getLastFmTagTopTracks(tag: string, limit: number): Promise<GraphTrack[]> {
  type Response = {
    tracks?: {
      track?: Array<{
        name?: string;
        mbid?: string;
        artist?: { name?: string; mbid?: string };
        image?: Array<{ '#text'?: string; size?: string }>;
      }>;
    };
  };
  const response = await requestLastFm<Response>('tag.getTopTracks', { tag: tag.trim(), limit });
  return (response?.tracks?.track ?? [])
    .filter((item) => !!item.name && !!item.artist?.name)
    .map((item) => ({
      title: item.name!,
      artist: item.artist!.name!,
      mbid: item.mbid || undefined,
      artistMbid: item.artist?.mbid || undefined,
      image: imageFromLastFm(item.image),
    }));
}

export async function getLastFmArtistInfo(
  artist: string
): Promise<{ name: string; mbid?: string; image?: string; listeners?: number } | undefined> {
  type Response = {
    artist?: {
      name?: string;
      mbid?: string;
      listeners?: string;
      image?: Array<{ '#text'?: string; size?: string }>;
    };
  };
  const response = await requestLastFm<Response>('artist.getInfo', {
    artist: cleanName(artist),
  });
  const info = response?.artist;
  if (!info?.name) return undefined;
  return {
    name: info.name,
    mbid: info.mbid || undefined,
    image: imageFromLastFm(info.image),
    listeners: info.listeners ? Number(info.listeners) : undefined,
  };
}

export async function getLastFmTrackImage(title: string, artist: string): Promise<string | undefined> {
  type Response = {
    track?: {
      album?: { image?: Array<{ '#text'?: string; size?: string }> };
      image?: Array<{ '#text'?: string; size?: string }>;
    };
  };
  const response = await requestLastFm<Response>('track.getInfo', {
    track: cleanName(title),
    artist: cleanName(artist),
  });
  const track = response?.track;
  if (!track) return undefined;
  return imageFromLastFm(track.album?.image) || imageFromLastFm(track.image);
}

export function lastFmCacheName(value: string) {
  return normalizeName(value);
}
