import type { SearchResult } from '../types';

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

export type FavoritesSort = 'recent' | 'title' | 'artist';

/**
 * Older favorites had no favoritedAt and were appended (oldest → newest).
 * Assign ascending timestamps so “Recently added” puts the previous end of the list on top.
 */
export function ensureFavoritedAt(favorites: SearchResult[]): SearchResult[] {
  const base = Date.now() - favorites.length * 60_000;
  let changed = false;
  const next = favorites.map((track, index) => {
    if (typeof track.favoritedAt === 'number' && Number.isFinite(track.favoritedAt)) {
      return track;
    }
    changed = true;
    return { ...track, favoritedAt: base + index * 60_000 };
  });
  return changed ? next : favorites;
}

export function sortFavorites(favorites: SearchResult[], sort: FavoritesSort): SearchResult[] {
  const copy = [...favorites];
  if (sort === 'title') {
    return copy.sort((a, b) => a.title.localeCompare(b.title, undefined, { sensitivity: 'base' }));
  }
  if (sort === 'artist') {
    return copy.sort(
      (a, b) =>
        a.artist.localeCompare(b.artist, undefined, { sensitivity: 'base' }) ||
        a.title.localeCompare(b.title, undefined, { sensitivity: 'base' })
    );
  }
  return copy.sort((a, b) => (b.favoritedAt ?? 0) - (a.favoritedAt ?? 0));
}

/** Spotify-ish relative / absolute date for when a track was favorited. */
export function formatFavoritedAt(at: number, now = Date.now()): string {
  const delta = Math.max(0, now - at);
  const minute = 60_000;
  const hour = 60 * minute;
  const day = 24 * hour;

  if (delta < minute) return 'Just now';
  if (delta < hour) {
    const n = Math.floor(delta / minute);
    return n === 1 ? '1 min ago' : `${n} min ago`;
  }
  if (delta < day) {
    const n = Math.floor(delta / hour);
    return n === 1 ? '1 hour ago' : `${n} hours ago`;
  }
  if (delta < 7 * day) {
    const n = Math.floor(delta / day);
    return n === 1 ? '1 day ago' : `${n} days ago`;
  }

  return new Intl.DateTimeFormat(undefined, {
    month: 'short',
    day: 'numeric',
    year: delta > 300 * day ? 'numeric' : undefined,
  }).format(new Date(at));
}
