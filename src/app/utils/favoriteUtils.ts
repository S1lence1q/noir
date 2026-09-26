/** Match favorites whether stored by search id or YouTube video id. */
export function isTrackFavorite(
  favorites: Array<{ id?: string; videoId?: string }>,
  track: { id?: string; videoId?: string }
): boolean {
  return favorites.some(
    (fav) =>
      (!!track.id && fav.id === track.id) ||
      (!!track.videoId && (fav.videoId === track.videoId || fav.id === track.videoId)) ||
      (!!track.id && fav.videoId === track.id)
  );
}
