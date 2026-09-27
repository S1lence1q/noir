import type { ListeningEvent } from './eventsStore';
import { getPlaybackSongKey } from '../../utils/playbackSongKey';

const CACHE_TTL_MS = 10 * 60 * 1000;
const WEIGHTS = {
  completed: 1,
  partial: 0.5,
  skipped: -0.3,
} as const;

export type TasteArtist = {
  artist: string;
  score: number;
  plays: number;
};

export type TasteTrack = {
  songKey: string;
  title: string;
  artist: string;
  score: number;
  plays: number;
};

type FavoriteLike = {
  id: string;
  videoId?: string;
  audioUrl?: string;
};

type CacheEntry<T> = {
  createdAt: number;
  value: T;
};

let artistCache = new WeakMap<ReadonlyArray<ListeningEvent>, Map<string, CacheEntry<TasteArtist[]>>>();
let trackCache = new WeakMap<ReadonlyArray<ListeningEvent>, Map<string, CacheEntry<TasteTrack[]>>>();
let hourCache = new WeakMap<ReadonlyArray<ListeningEvent>, Map<string, CacheEntry<number[]>>>();
let totalCache = new WeakMap<ReadonlyArray<ListeningEvent>, Map<string, CacheEntry<number>>>();
let streakCache = new WeakMap<ReadonlyArray<ListeningEvent>, CacheEntry<number>>();
let dormantCache = new WeakMap<
  ReadonlyArray<ListeningEvent>,
  WeakMap<ReadonlyArray<FavoriteLike>, Map<string, CacheEntry<FavoriteLike[]>>>
>();

function withinDays(event: ListeningEvent, days?: number, now = Date.now()) {
  if (days === undefined) return true;
  return event.startedAt >= now - days * 24 * 60 * 60 * 1000 && event.startedAt <= now;
}

function recentEvents(events: ReadonlyArray<ListeningEvent>, days?: number) {
  return events.filter((event) => withinDays(event, days));
}

function weight(event: ListeningEvent) {
  return WEIGHTS[event.outcome];
}

function cached<T>(
  cache: WeakMap<ReadonlyArray<ListeningEvent>, Map<string, CacheEntry<T>>>,
  events: ReadonlyArray<ListeningEvent>,
  key: string,
  compute: () => T
) {
  const now = Date.now();
  let entries = cache.get(events);
  if (!entries) {
    entries = new Map();
    cache.set(events, entries);
  }

  const existing = entries.get(key);
  if (existing && now - existing.createdAt < CACHE_TTL_MS) return existing.value;

  const value = compute();
  entries.set(key, { createdAt: now, value });
  return value;
}

function daysKey(days?: number) {
  return days === undefined ? 'all' : String(days);
}

export function topArtists(events: ReadonlyArray<ListeningEvent>, days?: number): TasteArtist[] {
  return cached(artistCache, events, daysKey(days), () => {
    const artists = new Map<string, TasteArtist>();

    for (const event of recentEvents(events, days)) {
      const artist = event.artist.trim();
      if (!artist) continue;
      const key = artist.toLocaleLowerCase();
      const current = artists.get(key) ?? { artist, score: 0, plays: 0 };
      current.score += weight(event);
      current.plays += 1;
      artists.set(key, current);
    }

    return [...artists.values()].sort((a, b) => b.score - a.score || b.plays - a.plays);
  });
}

export function topTracks(events: ReadonlyArray<ListeningEvent>, days?: number): TasteTrack[] {
  return cached(trackCache, events, daysKey(days), () => {
    const tracks = new Map<string, TasteTrack>();

    for (const event of recentEvents(events, days)) {
      const current = tracks.get(event.songKey) ?? {
        songKey: event.songKey,
        title: event.title,
        artist: event.artist,
        score: 0,
        plays: 0,
      };
      current.score += weight(event);
      current.plays += 1;
      tracks.set(event.songKey, current);
    }

    return [...tracks.values()].sort((a, b) => b.score - a.score || b.plays - a.plays);
  });
}

export function hourHistogram(events: ReadonlyArray<ListeningEvent>, days?: number): number[] {
  return cached(hourCache, events, daysKey(days), () => {
    const histogram = Array.from({ length: 24 }, () => 0);
    for (const event of recentEvents(events, days)) {
      histogram[new Date(event.startedAt).getHours()] += 1;
    }
    return histogram;
  });
}

export function dormantFavorites(
  events: ReadonlyArray<ListeningEvent>,
  favorites: ReadonlyArray<FavoriteLike>,
  days = 30
): FavoriteLike[] {
  let favoritesByEvents = dormantCache.get(events);
  if (!favoritesByEvents) {
    favoritesByEvents = new WeakMap();
    dormantCache.set(events, favoritesByEvents);
  }

  let entries = favoritesByEvents.get(favorites);
  if (!entries) {
    entries = new Map();
    favoritesByEvents.set(favorites, entries);
  }

  const key = String(days);
  const now = Date.now();
  const existing = entries.get(key);
  if (existing && now - existing.createdAt < CACHE_TTL_MS) return existing.value;

  const cutoff = now - days * 24 * 60 * 60 * 1000;
  const lastPlayed = new Map<string, number>();
  for (const event of events) {
    lastPlayed.set(event.songKey, Math.max(lastPlayed.get(event.songKey) ?? 0, event.startedAt));
  }

  const dormant = favorites.filter((favorite) => {
    const songKey = getPlaybackSongKey(favorite);
    return !songKey || (lastPlayed.get(songKey) ?? 0) < cutoff;
  });
  entries.set(key, { createdAt: now, value: dormant });
  return dormant;
}

export function totalListenedMs(events: ReadonlyArray<ListeningEvent>, days?: number): number {
  return cached(totalCache, events, daysKey(days), () =>
    recentEvents(events, days).reduce((total, event) => total + Math.max(0, event.listenedMs), 0)
  );
}

function calendarDay(timestamp: number) {
  const date = new Date(timestamp);
  return `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
}

export function streakDays(events: ReadonlyArray<ListeningEvent>): number {
  const now = Date.now();
  const existing = streakCache.get(events);
  if (existing && now - existing.createdAt < CACHE_TTL_MS) return existing.value;

  const days = new Set(events.map((event) => calendarDay(event.startedAt)));
  if (days.size === 0) {
    streakCache.set(events, { createdAt: now, value: 0 });
    return 0;
  }

  const cursor = new Date(now);
  if (!days.has(calendarDay(cursor.getTime()))) {
    cursor.setDate(cursor.getDate() - 1);
  }

  let streak = 0;
  while (days.has(calendarDay(cursor.getTime()))) {
    streak += 1;
    cursor.setDate(cursor.getDate() - 1);
  }

  streakCache.set(events, { createdAt: now, value: streak });
  return streak;
}

export function refreshTasteProfileCache() {
  artistCache = new WeakMap();
  trackCache = new WeakMap();
  hourCache = new WeakMap();
  totalCache = new WeakMap();
  streakCache = new WeakMap();
  dormantCache = new WeakMap();
}
