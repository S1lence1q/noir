import { SearchResult } from '../../types';
import { getPrimaryArtist } from '../stringUtils';
import { cleanArtistName } from './musicStreamFilters';

const MIN_ARTIST_CARD_TRACKS = 2;

function normalizeArtistKey(name: string): string {
  return cleanArtistName(name).trim().toLowerCase();
}

function scoreArtistChannelForCard(artistName: string, queryLower: string): number {
  const artistLower = artistName.trim().toLowerCase();
  let score = 0;
  if (artistLower === queryLower) score += 200;
  if (artistLower === `${queryLower} - topic`) score += 180;
  if (artistLower === `${queryLower}vevo`) score += 120;
  if (artistLower.includes('topic')) score += 90;
  if (artistLower.includes('vevo')) score += 40;
  if (getPrimaryArtist(artistName).toLowerCase() === queryLower) score += 60;
  return score;
}

/** Whether a result row belongs to the artist the user is searching for. */
export function artistIdentityMatchesSearchQuery(query: string, artistName: string): boolean {
  const queryLower = query.trim().toLowerCase();
  const queryWords = queryLower.split(/\s+/).filter(Boolean);
  if (!queryLower || queryWords.length === 0) return false;

  const artistLower = artistName.trim().toLowerCase();
  const primary = getPrimaryArtist(artistName).toLowerCase();

  const isExactChannel =
    artistLower === queryLower ||
    artistLower === `${queryLower} - topic` ||
    artistLower === `${queryLower}vevo` ||
    artistLower === `${queryLower} official` ||
    normalizeArtistKey(artistName) === queryLower;

  if (isExactChannel) return true;

  if (queryWords.length === 1) {
    if (primary === queryLower) return true;
    if (primary.split(/\s+/)[0] === queryLower) return true;
    if (artistLower.includes('topic') && primary === queryLower) return true;
    return false;
  }

  if (artistLower.includes(queryLower) || primary.includes(queryLower)) return true;

  const isOfficialEntity =
    artistLower.includes('topic') ||
    artistLower.includes('vevo') ||
    artistLower.includes('official') ||
    artistLower.includes('records');

  return isOfficialEntity && artistLower.includes(queryWords[0]);
}

function getArtistCardCanonicalKey(query: string, artistName: string): string {
  const queryWords = query.trim().toLowerCase().split(/\s+/).filter(Boolean);
  if (queryWords.length === 1) {
    return getPrimaryArtist(artistName).toLowerCase() || normalizeArtistKey(artistName);
  }
  return normalizeArtistKey(artistName);
}

/**
 * Pick an artist profile card only when results clearly point at one artist
 * (enough tracks, not a one-off collab channel on a single-word search).
 */
export function pickArtistCardFromSearchResults(
  query: string,
  results: SearchResult[]
): { name: string; thumbnail: string; channelId?: string; isTopic?: boolean } | null {
  if (!shouldShowArtistCard(query) || results.length === 0) return null;

  const queryLower = query.trim().toLowerCase();
  if (queryLower.length < 2) return null;
  const queryWords = queryLower.split(/\s+/).filter(Boolean);

  type Group = {
    displayName: string;
    thumbnail: string;
    channelId?: string;
    isTopic: boolean;
    count: number;
    score: number;
  };

  const groups = new Map<string, Group>();

  for (const row of results) {
    if (!artistIdentityMatchesSearchQuery(query, row.artist)) continue;

    const key = getArtistCardCanonicalKey(query, row.artist);
    const displayName = cleanArtistName(row.artist);
    const channelScore = scoreArtistChannelForCard(row.artist, queryLower);
    const isTopic = row.artist.toLowerCase().includes('topic');

    const existing = groups.get(key);
    if (existing) {
      existing.count += 1;
      if (channelScore > existing.score) {
        existing.displayName = displayName;
        existing.thumbnail = row.thumbnail;
        existing.channelId = row.channelId;
        existing.isTopic = isTopic;
        existing.score = channelScore;
      }
    } else {
      groups.set(key, {
        displayName,
        thumbnail: row.thumbnail,
        channelId: row.channelId,
        isTopic,
        count: 1,
        score: channelScore,
      });
    }
  }

  if (groups.size === 0) return null;

  let best: Group | null = null;
  for (const group of groups.values()) {
    if (!best || group.count > best.count || (group.count === best.count && group.score > best.score)) {
      best = group;
    }
  }

  if (!best) return null;

  const isOfficialSingleton =
    best.count === 1 &&
    (best.isTopic ||
      best.displayName.toLowerCase().includes('vevo') ||
      normalizeArtistKey(best.displayName) === queryLower);

  if (best.count < MIN_ARTIST_CARD_TRACKS && !isOfficialSingleton) {
    return null;
  }

  const cardName = getPrimaryArtist(best.displayName) || best.displayName;
  if (queryWords.length === 1 && /\sand\s/i.test(cardName.toLowerCase())) {
    return null;
  }

  const handPicked = getHandPickedImage(cardName);
  return {
    name: cardName,
    thumbnail: handPicked || best.thumbnail,
    channelId: best.channelId,
    isTopic: best.isTopic,
  };
}

export const HAND_PICKED_ARTIST_IMAGES: Record<string, string> = {
  kesi: 'https://cdn-images.dzcdn.net/images/artist/50656cb54b66a32d095c3e0532c9dc32/250x250-000000-80-0-0.jpg',
  kundo: 'https://cdn-images.dzcdn.net/images/cover/2bbca104b7dd8d14bed865e4cebf3c79/500x500-000000-80-0-0.jpg',
  lamin: 'https://cdn-images.dzcdn.net/images/artist/7375da7e864a9cf0bdd6add7578df724/250x250-000000-80-0-0.jpg',
  artigeardit:
    'https://cdn-images.dzcdn.net/images/artist/54920f6d4791b6923f008effd0b3b2ef/250x250-000000-80-0-0.jpg',
  // Deezer's artist.picture for Mille is Millé's "All Good" single — use her own lead single cover.
  mille:
    'https://cdn-images.dzcdn.net/images/cover/1b976d11691c5cc5a519c358ab54cf3f/1000x1000-000000-80-0-0.jpg',
};

export const getHandPickedImage = (name: string): string | null => {
  if (!name) return null;
  const nameLower = name.trim().toLowerCase();
  return HAND_PICKED_ARTIST_IMAGES[nameLower] || null;
};

export const getArtistDynamicColors = (name: string) => {
  const nameLower = name.toLowerCase();

  if (nameLower.includes('kundo')) {
    return {
      accent: '#10b981',
      glow: 'rgba(16, 185, 129, 0.15)',
      bgGlow: 'rgba(16, 185, 129, 0.38)',
      solidGlow: 'rgba(16, 185, 129, 0.55)',
      gradient: 'from-emerald-500/30 to-transparent',
      rgbaGlow: 'rgba(16, 185, 129, 0.22)',
    };
  }

  if (nameLower.includes('kesi')) {
    return {
      accent: '#f59e0b',
      glow: 'rgba(245, 158, 11, 0.15)',
      bgGlow: 'rgba(245, 158, 11, 0.38)',
      solidGlow: 'rgba(245, 158, 11, 0.55)',
      gradient: 'from-amber-500/30 to-transparent',
      rgbaGlow: 'rgba(245, 158, 11, 0.22)',
    };
  }

  if (nameLower.includes('lamin')) {
    return {
      accent: '#c084fc',
      glow: 'rgba(192, 132, 252, 0.15)',
      bgGlow: 'rgba(192, 132, 252, 0.38)',
      solidGlow: 'rgba(192, 132, 252, 0.55)',
      gradient: 'from-purple-500/30 to-transparent',
      rgbaGlow: 'rgba(192, 132, 252, 0.22)',
    };
  }

  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  const h = Math.abs(hash % 360);
  const s = 70 + (Math.abs(hash) % 15);
  const l = 40 + (Math.abs(hash) % 12);

  return {
    accent: `hsl(${h}, ${s}%, ${l}%)`,
    glow: `hsla(${h}, ${s}%, ${l}%, 0.15)`,
    bgGlow: `hsla(${h}, ${s}%, ${l}%, 0.32)`,
    solidGlow: `hsla(${h}, ${s}%, ${l}%, 0.5)`,
    gradient: `from-[hsl(${h},${s}%,${l}%)] to-transparent`,
    rgbaGlow: `hsla(${h}, ${s}%, ${l}%, 0.2)`,
  };
};

export const shouldShowArtistCard = (query: string) => {
  const trimmed = query.trim().toLowerCase();
  if (!trimmed) return false;

  if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) return false;

  const words = trimmed.split(/\s+/);
  if (words.length > 3) return false;

  const blocklist = [
    'lyrics',
    'remix',
    'karaoke',
    'live',
    'cover',
    'instrumental',
    'acoustic',
    'version',
    'song',
    'sang',
    'video',
    '24 timer',
    'vlog',
    'hvad',
    'hvornår',
    'hvorfor',
    'hvem',
    'hvordan',
    'mp3',
    'wav',
    'flac',
    'prod',
    'feat',
    'ft.',
  ];

  return !blocklist.some((word) => trimmed.includes(word));
};

/** @deprecated Use pickArtistCardFromSearchResults — kept as alias for callers */
export const getArtistName = pickArtistCardFromSearchResults;
