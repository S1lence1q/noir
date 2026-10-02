import {
  loadArtistDiscographyWithCache,
  peekCachedDiscography,
} from '../../utils/artistDiscographyLoader';
import { getHandPickedImage, pickArtistCardFromSearchResults, shouldShowArtistCard } from '../../utils/api/artistHelpers';
import type { SearchResult, VerifiedArtist } from './types';

export { peekCachedDiscography, shouldShowArtistCard };

export function getArtistMatchFromResults(
  query: string,
  results: SearchResult[]
): { name: string; thumbnail: string; channelId?: string } | null {
  return pickArtistCardFromSearchResults(query, results);
}

/** Shared discography loader (identity-keyed cache + SWR). */
export async function loadArtistDiscographyTracks(
  artist: Pick<VerifiedArtist, 'name' | 'channelId'>
): Promise<SearchResult[]> {
  return loadArtistDiscographyWithCache(artist.name, 120, artist.channelId);
}

export function getCachedArtistThumbnail(name: string, fallback: string): string {
  const handPicked = getHandPickedImage(name);
  if (handPicked) return handPicked;
  const stored = localStorage.getItem(`noir_artist_img_${name.toLowerCase()}`);
  if (stored && stored.includes('bda3b1eafdfb279826a590c67a3a629c')) return fallback;
  return stored || fallback;
}
