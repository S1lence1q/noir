/** True when URL looks like real cover art (not empty / Unsplash stub). */
export function hasRealArtwork(url?: string | null): boolean {
  if (!url?.trim()) return false;
  if (url.includes('unsplash.com')) return false;
  return true;
}

/** Album / video thumbs must never become the artist hero (common for short names like "Mille"). */
export function isLikelyAlbumOrTrackArtwork(url?: string | null): boolean {
  if (!url?.trim()) return false;
  const u = url.toLowerCase();
  if (u.includes('ytimg.com') || u.includes('youtube.com/vi/')) return true;
  if (u.includes('dzcdn.net/images/cover/')) return true;
  if (u.includes('/images/artist/')) return false;
  return false;
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
