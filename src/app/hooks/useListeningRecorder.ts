import { useEffect, useRef } from 'react';
import { getPlaybackSongKey } from '../utils/playbackSongKey';
import {
  addListeningEvent,
  createListeningEvent,
  getListeningEvents,
  pruneListeningEvents,
  updateListeningEvent,
  type ListeningEvent,
  type ListeningSource,
} from '../services/listening/eventsStore';
import {
  dormantFavorites,
  hourHistogram,
  refreshTasteProfileCache,
  streakDays,
  topArtists,
  topTracks,
  totalListenedMs,
} from '../services/listening/tasteProfile';

type RecorderSong = {
  id?: string;
  title: string;
  artist: string;
  audioUrl?: string;
  videoId?: string;
};

type PlaybackSnapshot = {
  currentTime: number;
  duration: number;
  isPlaying: boolean;
};

type ActiveListeningEvent = {
  event: ListeningEvent;
  listenedMs: number;
  lastPlayingAt: number | null;
  hasProgress: boolean;
};

declare global {
  interface Window {
    __noirTaste?: () => Promise<{
      topArtists: ReturnType<typeof topArtists>;
      topTracks: ReturnType<typeof topTracks>;
      hourHistogram: ReturnType<typeof hourHistogram>;
      totalListenedMs: number;
      streakDays: number;
    }>;
  }
}

function sourceForSong(song: RecorderSong): ListeningSource {
  return song.id?.startsWith('local_') || song.audioUrl?.startsWith('blob:')
    ? 'local'
    : 'queue';
}

function getOutcome(listenedMs: number, durationMs?: number): ListeningEvent['outcome'] {
  if (listenedMs < 30_000) return 'skipped';
  if (durationMs !== undefined && durationMs > 0 && listenedMs >= durationMs * 0.9) {
    return 'completed';
  }
  return 'partial';
}

export function useListeningRecorder(
  song: RecorderSong | null,
  playback: PlaybackSnapshot
): void {
  const activeRef = useRef<ActiveListeningEvent | null>(null);
  const songRef = useRef<{ song: RecorderSong; songKey: string } | null>(null);
  const isPlayingRef = useRef(playback.isPlaying);
  const durationRef = useRef(playback.duration);
  const operationQueueRef = useRef<Promise<void>>(Promise.resolve());

  isPlayingRef.current = playback.isPlaying;
  durationRef.current = playback.duration;

  const enqueue = (operation: () => Promise<void>) => {
    const next = operationQueueRef.current.then(operation, operation);
    operationQueueRef.current = next.catch(() => undefined);
    return next;
  };

  const persistActive = () => {
    const active = activeRef.current;
    if (!active) return;

    const durationMs =
      durationRef.current > 0
        ? Math.round(durationRef.current * 1000)
        : active.event.durationMs;
    const listenedMs = Math.round(active.listenedMs);
    // Provisional outcome, so a refresh or crash mid-song still leaves a correct event.
    const outcome = getOutcome(listenedMs, durationMs);
    active.event.durationMs = durationMs;
    active.event.listenedMs = listenedMs;
    active.event.outcome = outcome;
    enqueue(() =>
      updateListeningEvent(active.event.id, {
        durationMs,
        listenedMs,
        outcome,
      })
    );
  };

  const flushPlayingTime = (now: number, keepPlaying: boolean) => {
    const active = activeRef.current;
    if (!active || active.lastPlayingAt === null) return;
    active.listenedMs += Math.max(0, now - active.lastPlayingAt);
    active.lastPlayingAt = keepPlaying ? now : null;
  };

  const startEvent = () => {
    const current = songRef.current;
    if (!current || activeRef.current) return;

    const songData = current.song;
    const event = createListeningEvent({
      songKey: current.songKey,
      title: songData.title,
      artist: songData.artist,
      source: sourceForSong(songData),
      sourceId: songData.id || current.songKey,
    });

    activeRef.current = {
      event,
      listenedMs: 0,
      lastPlayingAt: Date.now(),
      hasProgress: false,
    };
    enqueue(() => addListeningEvent(event));
  };

  const finishEvent = () => {
    const active = activeRef.current;
    if (!active) return;

    flushPlayingTime(Date.now(), false);
    activeRef.current = null;

    const durationMs =
      durationRef.current > 0
        ? Math.round(durationRef.current * 1000)
        : active.event.durationMs;
    const listenedMs = Math.round(active.listenedMs);
    const outcome = getOutcome(listenedMs, durationMs);
    enqueue(() =>
      updateListeningEvent(active.event.id, {
        durationMs,
        listenedMs,
        outcome,
      })
    );
  };

  const currentSongKey = song ? getPlaybackSongKey(song) : null;
  songRef.current = currentSongKey && song ? { song, songKey: currentSongKey } : null;

  useEffect(() => {
    void pruneListeningEvents().catch((error) => {
      console.warn('Failed to prune listening events:', error);
    });
  }, []);

  useEffect(() => {
    if (import.meta.env.DEV) {
      window.__noirTaste = async () => {
        const events = await getListeningEvents();
        refreshTasteProfileCache();
        return {
          topArtists: topArtists(events, 30),
          topTracks: topTracks(events, 30),
          hourHistogram: hourHistogram(events, 30),
          totalListenedMs: totalListenedMs(events, 30),
          streakDays: streakDays(events),
        };
      };
    }

    return () => {
      if (import.meta.env.DEV) {
        delete window.__noirTaste;
      }
    };
  }, []);

  useEffect(() => {
    if (!currentSongKey) {
      finishEvent();
      return;
    }

    if (activeRef.current?.event.songKey !== currentSongKey) {
      finishEvent();
    }
    if (isPlayingRef.current) {
      startEvent();
    }
  }, [currentSongKey]);

  useEffect(() => {
    if (!currentSongKey) return;

    if (playback.isPlaying) {
      if (!activeRef.current) startEvent();
      else if (activeRef.current.lastPlayingAt === null) {
        activeRef.current.lastPlayingAt = Date.now();
      }
      return;
    }

    flushPlayingTime(Date.now(), false);
    persistActive();
  }, [currentSongKey, playback.isPlaying]);

  useEffect(() => {
    if (!playback.isPlaying || !activeRef.current) return;

    const timer = window.setInterval(() => {
      flushPlayingTime(Date.now(), true);
      persistActive();
    }, 5_000);

    return () => window.clearInterval(timer);
  }, [playback.isPlaying, currentSongKey]);

  useEffect(() => {
    const active = activeRef.current;
    if (!active) return;

    if (!active.hasProgress) {
      if (playback.currentTime > 0 && playback.currentTime < playback.duration - 0.25) {
        active.hasProgress = true;
      }
      return;
    }

    if (
      playback.duration > 0 &&
      playback.currentTime >= playback.duration - 0.25 &&
      active
    ) {
      finishEvent();
    }
  }, [playback.currentTime, playback.duration]);

  useEffect(() => {
    // Music keeps playing in a hidden tab, so hiding only saves progress; the play itself continues.
    const handleVisibilityChange = () => {
      if (document.visibilityState !== 'hidden') return;
      flushPlayingTime(Date.now(), isPlayingRef.current);
      persistActive();
    };
    const handlePageHide = () => finishEvent();

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('pagehide', handlePageHide);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('pagehide', handlePageHide);
      finishEvent();
    };
  }, [currentSongKey]);
}
