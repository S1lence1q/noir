import { useEffect, useMemo, useState } from 'react';
import type { SearchResult } from '../../../types';
import { strings } from '../../../constants/strings';
import { getListeningEvents, type ListeningEvent } from '../../../services/listening/eventsStore';
import { normalizeName } from '../../../services/musicGraph/normalize';
import { isTrackFavorite } from '../../../utils/favoriteUtils';
import { NoirSongRow } from './NoirSongRow';

type NoirHistoryViewProps = {
  favorites: SearchResult[];
  recentTracks: SearchResult[];
  onPlayPlaylist: (tracks: SearchResult[], label?: string, startIndex?: number) => void;
  onAddToQueue: (song: SearchResult) => void;
  onPlayNext?: (song: SearchResult) => void;
  onToggleFavorite: (song: SearchResult) => void;
};

/** A listen counts once it played this long (skips of a few seconds aren't history). */
const MIN_LISTEN_MS = 20_000;
const PAGE = 120;
const SKELETON_ROWS = 6;

const trackKey = (title: string, artist: string) => `${normalizeName(artist)}::${normalizeName(title)}`;

function dayLabel(ts: number, now = new Date()): string {
  const d = new Date(ts);
  const startOf = (x: Date) => new Date(x.getFullYear(), x.getMonth(), x.getDate()).getTime();
  const diffDays = Math.round((startOf(now) - startOf(d)) / 86_400_000);
  if (diffDays === 0) return strings.library.historyToday;
  if (diffDays === 1) return strings.library.historyYesterday;
  if (diffDays < 7) return d.toLocaleDateString(undefined, { weekday: 'long' });
  return d.toLocaleDateString(undefined, {
    day: 'numeric',
    month: 'long',
    ...(d.getFullYear() !== now.getFullYear() ? { year: 'numeric' } : {}),
  });
}

/**
 * Library › History (D5): every listen, newest first, grouped by day. Rows play from that day
 * onward, like a playlist. Artwork comes from what the app already knows (recents, favorites);
 * anything else resolves when it plays.
 */
export function NoirHistoryView({
  favorites,
  recentTracks,
  onPlayPlaylist,
  onAddToQueue,
  onPlayNext,
  onToggleFavorite,
}: NoirHistoryViewProps) {
  const [events, setEvents] = useState<ListeningEvent[] | null>(null);
  const [limit, setLimit] = useState(PAGE);

  useEffect(() => {
    let cancelled = false;
    void getListeningEvents()
      .then((all) => {
        if (cancelled) return;
        setEvents(
          all
            .filter((e) => e.source !== 'seed' && e.listenedMs >= MIN_LISTEN_MS && e.title && e.artist)
            .sort((a, b) => b.startedAt - a.startedAt)
        );
      })
      .catch(() => !cancelled && setEvents([]));
    return () => {
      cancelled = true;
    };
  }, []);

  // What the app already knows about a song (artwork, stream id) by artist + title.
  const known = useMemo(() => {
    const map = new Map<string, SearchResult>();
    for (const track of [...favorites, ...recentTracks]) map.set(trackKey(track.title, track.artist), track);
    return map;
  }, [favorites, recentTracks]);

  const days = useMemo(() => {
    if (!events) return [];
    const out: { label: string; tracks: SearchResult[]; keys: string[] }[] = [];
    const now = new Date();
    let previousKey = '';
    for (const event of events.slice(0, limit)) {
      const label = dayLabel(event.startedAt, now);
      // The same song again right after itself (repeat, resume after reload) is one line.
      const listenKey = `${label}|${trackKey(event.title, event.artist)}`;
      if (listenKey === previousKey) continue;
      previousKey = listenKey;
      const match = known.get(trackKey(event.title, event.artist));
      // Stable song id (stream lookups are keyed on it); the row key is the listen.
      const track: SearchResult = match ?? {
            id: `history:${event.songKey}`,
            title: event.title,
            artist: event.artist,
            thumbnail: '',
            videoId: '',
          };
      const last = out[out.length - 1];
      if (last && last.label === label) {
        last.tracks.push(track);
        last.keys.push(event.id);
      } else out.push({ label, tracks: [track], keys: [event.id] });
    }
    return out;
  }, [events, limit, known]);

  if (events === null) {
    return (
      <div className="flex flex-col gap-3 pt-1" aria-hidden>
        <span className="noir-skeleton-box !h-4 w-24" />
        {Array.from({ length: SKELETON_ROWS }).map((_, i) => (
          <div key={i} className="flex items-center gap-3 px-3 py-2">
            <span className="noir-skeleton h-12 w-12 rounded-[var(--noir-radius-sm)]" />
            <span className="flex flex-1 flex-col gap-2">
              <span className="noir-skeleton-box w-1/3" />
              <span className="noir-skeleton-box w-1/5 !h-2.5" />
            </span>
          </div>
        ))}
      </div>
    );
  }

  if (events.length === 0) {
    return (
      <div className="px-1 pt-6">
        <p className="text-[15px] font-medium text-[color:var(--noir-text-secondary)]">{strings.library.historyEmpty}</p>
        <p className="mt-1.5 text-[13px] leading-[1.45] text-[color:var(--noir-text-tertiary)]">
          {strings.library.historyEmptyHint}
        </p>
      </div>
    );
  }

  return (
    <div className="noir-history flex flex-col pb-6">
      {days.map((day) => (
        <section key={day.label} className="noir-history-day">
          <h3 className="noir-history-day-label">
            {day.label}
            <span>{strings.library.historyPlays(day.tracks.length)}</span>
          </h3>
          <div className="flex flex-col gap-0.5">
            {day.tracks.map((track, i) => (
              <NoirSongRow
                key={day.keys[i]}
                track={track}
                isFavorite={isTrackFavorite(favorites, track)}
                onPlay={() => onPlayPlaylist(day.tracks, strings.library.historyStation, i)}
                onAddToQueue={onAddToQueue}
                onPlayNext={onPlayNext}
                onToggleFavorite={onToggleFavorite}
              />
            ))}
          </div>
        </section>
      ))}
      {events.length > limit && (
        <button
          type="button"
          className="noir-button-secondary mx-auto mt-6 elva-focus-ring"
          onClick={() => setLimit((n) => n + PAGE)}
        >
          {strings.library.historyMore}
        </button>
      )}
    </div>
  );
}
