import type { GraphArtist, GraphRelease, GraphTrack } from './index';
import { cleanName, normalizeName } from './normalize';
import { deezerCdnHash } from '../../utils/artwork';

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

/**
 * Deezer has no usable CORS for SPA hosts. Dev uses the Vite `/deezer` proxy;
 * production uses Deezer's JSONP (`output=jsonp`) so GitHub Pages works without a backend.
 */
function deezerJsonp<T>(path: string, timeoutMs = 5000): Promise<T> {
  return new Promise((resolve, reject) => {
    const callback = `__noirDz_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 9)}`;
    const script = document.createElement('script');
    const timer = window.setTimeout(() => {
      cleanup();
      reject(new Error('Deezer JSONP timeout'));
    }, timeoutMs);

    const cleanup = () => {
      window.clearTimeout(timer);
      script.remove();
      try {
        delete (window as unknown as Record<string, unknown>)[callback];
      } catch {
        (window as unknown as Record<string, unknown>)[callback] = undefined;
      }
    };

    (window as unknown as Record<string, unknown>)[callback] = (data: T) => {
      cleanup();
      resolve(data);
    };

    script.onerror = () => {
      cleanup();
      reject(new Error('Deezer JSONP network error'));
    };

    const normalized = path.startsWith('/') ? path : `/${path}`;
    const sep = normalized.includes('?') ? '&' : '?';
    script.src = `https://api.deezer.com${normalized}${sep}output=jsonp&callback=${callback}`;
    document.head.appendChild(script);
  });
}

async function deezerGet<T>(path: string): Promise<T | null> {
  try {
    if (import.meta.env.DEV) {
      const controller = new AbortController();
      const timeout = window.setTimeout(() => controller.abort(), 5000);
      const response = await fetch(`/deezer${path}`, { signal: controller.signal });
      window.clearTimeout(timeout);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return (await response.json()) as T;
    }
    return await deezerJsonp<T>(path);
  } catch (error) {
    logFailure(path, error);
    return null;
  }
}

export type DeezerArtistMatch = {
  id: number;
  name: string;
  image?: string;
  fans?: number;
  exactName: boolean;
};

const KNOWN_BAD_PORTRAITS = new Set([
  'bda3b1eafdfb279826a590c67a3a629c', // Wrong artist photo on Deezer artist 4103838 (Kundo)
]);

function rankDeezerArtists(artist: string, artists: DeezerArtist[]): DeezerArtistMatch[] {
  const normalized = normalizeName(artist);
  return artists
    .filter((candidate): candidate is DeezerArtist & { name: string } => !!candidate.name)
    .map((candidate) => {
      const rawImage = candidate.picture_xl || candidate.picture_big || candidate.picture_medium;
      const hash = deezerCdnHash(rawImage);
      const isBad = !!(hash && KNOWN_BAD_PORTRAITS.has(hash));
      return {
        id: candidate.id,
        name: candidate.name,
        image: isBad ? undefined : rawImage,
        fans: candidate.nb_fan,
        exactName: normalizeName(candidate.name) === normalized,
      };
    })
    .sort((a, b) => Number(b.exactName) - Number(a.exactName) || (b.fans ?? 0) - (a.fans ?? 0));
}

/** Ranked Deezer artist matches for identity / disambiguation. */
export async function searchDeezerArtists(artist: string, limit = 5): Promise<DeezerArtistMatch[]> {
  const response = await deezerGet<{ data?: DeezerArtist[] }>(
    `/search/artist?q=${encodeURIComponent(normalizeName(artist) || cleanName(artist))}&limit=25`
  );
  return rankDeezerArtists(artist, response?.data ?? []).slice(0, Math.max(1, limit));
}

async function findArtist(artist: string, deezerId?: number): Promise<DeezerArtist | null> {
  if (deezerId != null && Number.isFinite(deezerId)) {
    const byId = await deezerGet<DeezerArtist>(`/artist/${deezerId}`);
    if (byId?.name) return byId;
  }
  const ranked = await searchDeezerArtists(artist, 5);
  // Never return a fuzzy top hit — wrong portraits (e.g. "Kundo" → unrelated artist).
  const exact = ranked.find((m) => m.exactName);
  if (!exact) return null;
  return {
    id: exact.id,
    name: exact.name,
    nb_fan: exact.fans,
    picture_xl: exact.image,
    picture_big: exact.image,
    picture_medium: exact.image,
  };
}

/**
 * Deezer often reuses a single's cover as picture_* (e.g. Millé "All Good" on Danish Mille).
 * If the "artist" photo hash matches a top-track album cover, prefer another popular cover.
 */
async function resolvePortraitAgainstTopTracks(artist: DeezerArtist): Promise<string | undefined> {
  const rawPortrait = artist.picture_xl || artist.picture_big || artist.picture_medium;
  const rawHash = deezerCdnHash(rawPortrait);
  const isBadPortrait = !!(rawHash && KNOWN_BAD_PORTRAITS.has(rawHash));
  const portrait = isBadPortrait ? undefined : rawPortrait;
  const portraitHash = isBadPortrait ? undefined : rawHash;
  const response = await deezerGet<{ data?: DeezerTrack[] }>(
    `/artist/${artist.id}/top?limit=12`
  );
  const tops = response?.data ?? [];
  const covers = tops
    .map((track) => track.album?.cover_xl || track.album?.cover_big)
    .filter((url): url is string => !!url);
  const coverHashes = new Set(
    covers.map((url) => deezerCdnHash(url)).filter((hash): hash is string => !!hash)
  );

  if (portrait && portraitHash && coverHashes.has(portraitHash)) {
    for (const cover of covers) {
      const hash = deezerCdnHash(cover);
      if (hash && hash !== portraitHash) return cover;
    }
  }
  return portrait || covers[0];
}

export async function getDeezerArtistPortraitById(deezerId: number): Promise<string | undefined> {
  const artist = await deezerGet<DeezerArtist>(`/artist/${deezerId}`);
  if (!artist?.name && !artist?.picture_xl && !artist?.picture_big) return undefined;
  return resolvePortraitAgainstTopTracks({ ...artist, id: deezerId });
}

function mapTrack(track: DeezerTrack, fallbackArtist: string): GraphTrack | null {
  if (!track.title) return null;
  return {
    title: track.title,
    artist: track.artist?.name || fallbackArtist,
    image: track.album?.cover_xl || track.album?.cover_big,
  };
}

export async function getDeezerArtistTopTracks(
  artist: string,
  limit: number,
  deezerId?: number
): Promise<GraphTrack[]> {
  const match = await findArtist(artist, deezerId);
  if (!match) return [];
  const response = await deezerGet<{ data?: DeezerTrack[] }>(
    `/artist/${match.id}/top?limit=${Math.min(100, Math.max(1, limit))}`
  );
  return (response?.data ?? [])
    .map((track) => mapTrack(track, cleanName(artist)))
    .filter((track): track is GraphTrack => !!track)
    .slice(0, limit);
}

export async function getDeezerRelatedArtists(
  artist: string,
  limit: number,
  deezerId?: number
): Promise<GraphArtist[]> {
  const match = await findArtist(artist, deezerId);
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

export const DEEZER_GENRE_NAMES: Record<number, string> = {
  132: 'Pop',
  116: 'Hip-Hop',
  152: 'Rock',
  113: 'Electronic',
  85: 'Alternative',
  165: 'R&B',
  129: 'Jazz',
  464: 'Metal',
  144: 'Reggae',
  169: 'Soul & Funk',
  98: 'Classical',
  153: 'Blues',
  173: 'Soundtrack',
  2: 'African',
  16: 'Asian',
  75: 'Brazilian',
  81: 'Indian',
  197: 'Latin',
};

export type GraphAlbum = {
  id: number;
  title: string;
  artist: string;
  recordType: 'album' | 'single' | 'ep' | 'compile';
  releaseDate?: string;
  year?: string;
  image?: string;
  genreId?: number;
  genre?: string;
};

export async function getDeezerArtistAlbums(
  artist: string,
  deezerId?: number,
  limit = 25
): Promise<GraphAlbum[]> {
  const match = await findArtist(artist, deezerId);
  if (!match) return [];
  const response = await deezerGet<{
    data?: Array<{
      id: number;
      title?: string;
      release_date?: string;
      record_type?: string;
      cover_xl?: string;
      cover_big?: string;
      cover_medium?: string;
      genre_id?: number;
    }>;
  }>(`/artist/${match.id}/albums?limit=100`);

  return (response?.data ?? [])
    .filter((a): a is typeof a & { id: number; title: string } => !!a.id && !!a.title)
    .map((a) => ({
      id: a.id,
      title: a.title,
      artist: match.name || cleanName(artist),
      recordType: (a.record_type as any) || 'album',
      releaseDate: a.release_date,
      year: a.release_date ? a.release_date.slice(0, 4) : undefined,
      image: a.cover_xl || a.cover_big || a.cover_medium,
      genreId: a.genre_id,
      genre: a.genre_id ? DEEZER_GENRE_NAMES[a.genre_id] : undefined,
    }))
    .sort((a, b) => {
      const dateA = a.releaseDate || a.year || '';
      const dateB = b.releaseDate || b.year || '';
      return dateB.localeCompare(dateA);
    })
    .slice(0, Math.max(1, limit));
}

export async function getDeezerAlbumTracks(albumId: number): Promise<GraphTrack[]> {
  const album = await deezerGet<{
    title?: string;
    artist?: { name?: string };
    cover_xl?: string;
    cover_big?: string;
    tracks?: {
      data?: Array<{ title?: string; duration?: number; artist?: { name?: string } }>;
    };
  }>(`/album/${albumId}`);
  if (!album) return [];

  const fallbackArtist = album.artist?.name || '';
  const cover = album.cover_xl || album.cover_big;
  return (album.tracks?.data ?? [])
    .filter((track) => !!track.title && !!(track.artist?.name || fallbackArtist))
    .map((track) => ({
      title: track.title!,
      artist: track.artist?.name || fallbackArtist,
      image: cover,
      durationSec: track.duration,
    }));
}

export async function getDeezerArtistImage(artist: string, deezerId?: number): Promise<string | undefined> {
  if (deezerId != null && Number.isFinite(deezerId)) {
    const byId = await getDeezerArtistPortraitById(deezerId);
    if (byId) return byId;
  }
  const match = await findArtist(artist, deezerId);
  if (!match) return undefined;
  return resolvePortraitAgainstTopTracks(match);
}

/** Album cover for a track — Last.fm tag charts rarely ship real artwork. */
export async function getDeezerTrackImage(title: string, artist: string): Promise<string | undefined> {
  const query = `${cleanName(artist)} ${cleanName(title)}`.trim();
  if (!query) return undefined;

  const response = await deezerGet<{ data?: DeezerTrack[] }>(
    `/search/track?q=${encodeURIComponent(query)}&limit=8`
  );
  const tracks = response?.data ?? [];
  if (tracks.length === 0) return undefined;

  const titleKey = normalizeName(title);
  const artistKey = normalizeName(artist);
  const ranked = [...tracks].sort((a, b) => {
    const aTitle = normalizeName(a.title || '') === titleKey ? 1 : 0;
    const bTitle = normalizeName(b.title || '') === titleKey ? 1 : 0;
    const aArtist = normalizeName(a.artist?.name || '') === artistKey ? 1 : 0;
    const bArtist = normalizeName(b.artist?.name || '') === artistKey ? 1 : 0;
    return bTitle + bArtist - (aTitle + aArtist) || (b.rank ?? 0) - (a.rank ?? 0);
  });

  const best = ranked[0];
  return best?.album?.cover_xl || best?.album?.cover_big;
}
