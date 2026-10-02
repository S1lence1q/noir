/** True when URL looks like real cover art (not empty / Unsplash stub). */
export function hasRealArtwork(url?: string | null): boolean {
  if (!url?.trim()) return false;
  if (url.includes('unsplash.com')) return false;
  return true;
}

/** YouTube thumbs are never artist portraits (Discover/NP often pass track art). */
function isLikelyAlbumOrTrackArtwork(url?: string | null): boolean {
  if (!url?.trim()) return false;
  const u = url.toLowerCase();
  return u.includes('ytimg.com') || u.includes('youtube.com/vi/');
}

/** Hash inside Deezer CDN paths: /images/artist|cover/{hash}/… */
export function deezerCdnHash(url?: string | null): string | null {
  if (!url) return null;
  const match = url.match(/\/images\/(?:artist|cover)\/([a-f0-9]{16,})\//i);
  return match?.[1]?.toLowerCase() ?? null;
}

export function artistPortraitUrl(url?: string | null): string | undefined {
  if (!hasRealArtwork(url) || isLikelyAlbumOrTrackArtwork(url)) return undefined;
  return url!.trim();
}

export function youtubeThumb(videoId?: string, quality: 'mq' | 'hq' | 'maxres' = 'mq'): string | undefined {
  if (!videoId || videoId.length !== 11) return undefined;
  const size = quality === 'maxres' ? 'maxresdefault' : quality === 'hq' ? 'hqdefault' : 'mqdefault';
  return `https://i.ytimg.com/vi/${videoId}/${size}.jpg`;
}
