import type { GraphArtist, GraphRelease, GraphTrack } from './index';
import { cleanName, normalizeName } from './normalize';

const loggedFailures = new Set<string>();

type DeezerArtist = {
  id: number;
  name?: string;
  nb_fan?: number;
  picture_xl?: string;
  picture_big?: string;
  picture_medium?: string;
};

type DeezerTrack = {
  id?: number;
  title?: string;
  artist?: { id?: number; name?: string };
  album?: { title?: string; cover_xl?: string; cover_big?: string };
  rank?: number;
};

function logFailure(path: string, error: unknown) {
  const key = path.split('?')[0];
  if (loggedFailures.has(key)) return;
  loggedFailures.add(key);
  console.warn(`[musicGraph] Deezer ${key} failed`, error);
}

async function deezerGet<T>(path: string): Promise<T | null> {
  try {
    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), 5000);
    const response = await fetch(`/deezer${path}`, { signal: controller.signal });
    window.clearTimeout(timeout);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return (await response.json()) as T;
  } catch (error) {
    logFailure(path, error);
    return null;
  }
}

async function findArtist(artist: string): Promise<DeezerArtist | null> {
  const response = await deezerGet<{ data?: DeezerArtist[] }>(
    `/search/artist?q=${encodeURIComponent(normalizeName(artist) || cleanName(artist))}&limit=25`
  );
  const artists = response?.data ?? [];
  const normalized = normalizeName(artist);
  return (
    artists
      .filter((candidate) => !!candidate.name)
      .sort((a, b) => {
        const aExact = normalizeName(a.name!) === normalized ? 1 : 0;
        const bExact = normalizeName(b.name!) === normalized ? 1 : 0;
        return bExact - aExact || (b.nb_fan ?? 0) - (a.nb_fan ?? 0);
      })[0] ?? null
  );
}

function mapTrack(track: DeezerTrack, fallbackArtist: string): GraphTrack | null {
  if (!track.title) return null;
  return {
    title: track.title,
    artist: track.artist?.name || fallbackArtist,
    image: track.album?.cover_xl || track.album?.cover_big,
  };
}

export async function getDeezerArtistTopTracks(artist: string, limit: number): Promise<GraphTrack[]> {
  const match = await findArtist(artist);
  if (!match) return [];
  const response = await deezerGet<{ data?: DeezerTrack[] }>(
    `/artist/${match.id}/top?limit=${Math.min(100, Math.max(1, limit))}`
  );
  return (response?.data ?? [])
    .map((track) => mapTrack(track, cleanName(artist)))
    .filter((track): track is GraphTrack => !!track)
    .slice(0, limit);
}

export async function getDeezerRelatedArtists(artist: string, limit: number): Promise<GraphArtist[]> {
  const match = await findArtist(artist);
  if (!match) return [];
  const response = await deezerGet<{ data?: DeezerArtist[] }>(`/artist/${match.id}/related`);
  return (response?.data ?? [])
    .filter((item) => !!item.name)
    .slice(0, limit)
    .map((item) => ({
      name: item.name!,
      image: item.picture_xl || item.picture_big || item.picture_medium,
      listeners: item.nb_fan,
    }));
}

export async function getDeezerArtistRadio(artist: string): Promise<GraphTrack[]> {
  const match = await findArtist(artist);
  if (!match) return [];
  const response = await deezerGet<{ data?: DeezerTrack[] }>(`/artist/${match.id}/radio`);
  return (response?.data ?? [])
    .map((track) => mapTrack(track, cleanName(artist)))
    .filter((track): track is GraphTrack => !!track);
}

export async function getDeezerNewReleases(artist: string, days: number): Promise<GraphRelease[]> {
  const match = await findArtist(artist);
  if (!match) return [];
  const response = await deezerGet<{
    data?: Array<{
      id?: number;
      title?: string;
      release_date?: string;
      cover_xl?: string;
      cover_big?: string;
    }>;
  }>(`/artist/${match.id}/albums?limit=100`);

  const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
  return (response?.data ?? [])
    .filter((album) => album.title && album.release_date && new Date(album.release_date) >= cutoff)
    .sort((a, b) => (b.release_date || '').localeCompare(a.release_date || ''))
    .map((album) => ({
      title: album.title!,
      artist: match.name || cleanName(artist),
      releaseDate: album.release_date!,
      image: album.cover_xl || album.cover_big,
      deezerId: album.id,
    }));
}

export async function getDeezerArtistImage(artist: string): Promise<string | undefined> {
  const match = await findArtist(artist);
  return match?.picture_xl || match?.picture_big || match?.picture_medium;
}
