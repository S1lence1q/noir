/** True when URL looks like real cover art (not empty / Unsplash stub). */
export function hasRealArtwork(url?: string | null): boolean {
  if (!url?.trim()) return false;
  if (url.includes('unsplash.com')) return false;
  return true;
}

export function youtubeThumb(videoId?: string, quality: 'mq' | 'hq' | 'maxres' = 'mq'): string | undefined {
  if (!videoId || videoId.length !== 11) return undefined;
  const size = quality === 'maxres' ? 'maxresdefault' : quality === 'hq' ? 'hqdefault' : 'mqdefault';
  return `https://i.ytimg.com/vi/${videoId}/${size}.jpg`;
}
