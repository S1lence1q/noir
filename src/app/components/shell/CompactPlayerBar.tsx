import { useEffect, useRef, useState, type PointerEvent } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import {
  ChevronDown,
  ChevronUp,
  Heart,
  ListMusic,
  Pause,
  Play,
  SkipBack,
  SkipForward,
  Volume1,
  Volume2,
  VolumeX,
} from 'lucide-react';
import { ShellPlaybackState } from './types';
import { EASE_PREMIUM, prefersReducedMotion } from '../../utils/motionPresets';

type SongPreview = {
  title: string;
  artist: string;
  artworkUrl: string;
};

type CompactPlayerBarProps = {
  song: SongPreview;
  playback: ShellPlaybackState;
  expanded?: boolean;
  queueCount?: number;
  isFavorite?: boolean;
  onExpand: () => void;
  onOpenQueue?: () => void;
  onToggleFavorite?: () => void;
};

function formatTime(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) return '0:00';
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

function seekFromClientX(el: HTMLElement, clientX: number, duration: number) {
  if (duration <= 0) return;
  const rect = el.getBoundingClientRect();
  const ratio = Math.min(1, Math.max(0, (clientX - rect.left) / rect.width));
  window.dispatchEvent(
    new CustomEvent('elva-seek', { detail: { time: ratio * duration } })
  );
}

function volumeFromClientX(el: HTMLElement, clientX: number) {
  const rect = el.getBoundingClientRect();
  const ratio = Math.min(1, Math.max(0, (clientX - rect.left) / rect.width));
  return Math.round(ratio * 100);
}

export function CompactPlayerBar({
  song,
  playback,
  expanded = false,
  queueCount = 0,
  isFavorite = false,
  onExpand,
  onOpenQueue,
  onToggleFavorite,
}: CompactPlayerBarProps) {
  const reduced = prefersReducedMotion();
  const songKey = `${song.title}::${song.artist}::${song.artworkUrl}`;
  const [volume, setVolume] = useState(() => {
    const saved = localStorage.getItem('elva_player_volume');
    return saved !== null ? parseInt(saved, 10) : 70;
  });
  const preMuteRef = useRef(volume > 0 ? volume : 70);

  useEffect(() => {
    const onVolume = (e: Event) => {
      const next = (e as CustomEvent<{ volume?: number }>).detail?.volume;
      if (typeof next === 'number' && Number.isFinite(next)) {
        setVolume(next);
        if (next > 0) preMuteRef.current = next;
      }
    };
    window.addEventListener('elva-volume-change', onVolume);
    return () => window.removeEventListener('elva-volume-change', onVolume);
  }, []);

  const setPlayerVolume = (next: number) => {
    const clamped = Math.max(0, Math.min(100, next));
    setVolume(clamped);
    if (clamped > 0) preMuteRef.current = clamped;
    localStorage.setItem('elva_player_volume', String(clamped));
    window.dispatchEvent(new CustomEvent('elva-set-volume', { detail: { volume: clamped } }));
  };

  const toggleMute = () => {
    if (volume > 0) {
      preMuteRef.current = volume;
      setPlayerVolume(0);
    } else {
      setPlayerVolume(preMuteRef.current || 70);
    }
  };

  const progress =
    playback.duration > 0
      ? Math.min(100, (playback.currentTime / playback.duration) * 100)
      : 0;

  const onSeekPointerDown = (e: PointerEvent<HTMLDivElement>) => {
    if (playback.duration <= 0) return;
    e.preventDefault();
    e.currentTarget.setPointerCapture(e.pointerId);
    seekFromClientX(e.currentTarget, e.clientX, playback.duration);
  };

  const onSeekPointerMove = (e: PointerEvent<HTMLDivElement>) => {
    if (playback.duration <= 0 || !e.currentTarget.hasPointerCapture(e.pointerId)) return;
    seekFromClientX(e.currentTarget, e.clientX, playback.duration);
  };

  const onVolumePointerDown = (e: PointerEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.currentTarget.setPointerCapture(e.pointerId);
    setPlayerVolume(volumeFromClientX(e.currentTarget, e.clientX));
  };

  const onVolumePointerMove = (e: PointerEvent<HTMLDivElement>) => {
    if (!e.currentTarget.hasPointerCapture(e.pointerId)) return;
    setPlayerVolume(volumeFromClientX(e.currentTarget, e.clientX));
  };

  const VolumeIcon = volume === 0 ? VolumeX : volume < 50 ? Volume1 : Volume2;
  // queueCount from shell is already "up next" (excludes the playing track)
  const upNextCount = Math.max(0, queueCount);

  return (
    <motion.footer
      className="noir-compact shrink-0"
      initial={reduced ? { opacity: 0 } : { opacity: 0, y: 72 }}
      animate={{ opacity: 1, y: 0 }}
      exit={reduced ? { opacity: 0 } : { opacity: 0, y: 56 }}
      transition={
        reduced
          ? { duration: 0.18 }
          : { type: 'spring', stiffness: 380, damping: 36, mass: 0.8 }
      }
    >
      <div className="noir-compact-left">
        <div className="flex min-w-0 items-center gap-1">
          <button
            type="button"
            onClick={onExpand}
            className="noir-compact-now group elva-focus-ring"
            aria-label={expanded ? 'Back to library' : 'Now playing'}
          >
            <span className="noir-compact-art-wrap">
              <AnimatePresence mode="sync" initial={false}>
                <motion.img
                  key={song.artworkUrl}
                  src={song.artworkUrl}
                  alt=""
                  className="noir-compact-art"
                  initial={reduced ? { opacity: 0 } : { opacity: 0, scale: 0.86 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={reduced ? { opacity: 0 } : { opacity: 0, scale: 1.06 }}
                  transition={{ duration: reduced ? 0.15 : 0.32, ease: EASE_PREMIUM }}
                />
              </AnimatePresence>
            </span>
            <span className="noir-compact-meta">
              <AnimatePresence mode="wait" initial={false}>
                <motion.span
                  key={songKey}
                  className="block min-w-0"
                  initial={reduced ? { opacity: 0 } : { opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={reduced ? { opacity: 0 } : { opacity: 0, y: -6 }}
                  transition={{ duration: reduced ? 0.12 : 0.28, ease: EASE_PREMIUM }}
                >
                  <span className="noir-compact-title">{song.title}</span>
                  <span className="noir-compact-artist">{song.artist}</span>
                </motion.span>
              </AnimatePresence>
            </span>
          </button>
          {onToggleFavorite && !expanded && (
            <button
              type="button"
              onClick={onToggleFavorite}
              className="noir-compact-ctrl shrink-0"
              aria-label={isFavorite ? 'Remove from favorites' : 'Add to favorites'}
              title={isFavorite ? 'Remove from favorites' : 'Add to favorites'}
            >
              <Heart
                className={`h-4 w-4 ${isFavorite ? 'fill-current text-red-400' : ''}`}
                strokeWidth={isFavorite ? 0 : 1.75}
              />
            </button>
          )}
        </div>
      </div>

      <div className="noir-compact-center">
        <div className="noir-compact-transport">
          <button
            type="button"
            onClick={() => window.dispatchEvent(new Event('elva-play-prev'))}
            className="noir-compact-ctrl"
            aria-label="Previous"
          >
            <SkipBack className="h-[15px] w-[15px]" fill="currentColor" />
          </button>
          <motion.button
            type="button"
            onClick={() => window.dispatchEvent(new Event('elva-toggle-play'))}
            className="noir-compact-play"
            aria-label={playback.isPlaying ? 'Pause' : 'Play'}
            whileTap={reduced ? undefined : { scale: 0.9 }}
            transition={{ type: 'spring', stiffness: 500, damping: 28 }}
          >
            {playback.isPlaying ? (
              <Pause className="h-[15px] w-[15px]" fill="currentColor" />
            ) : (
              <Play className="ml-px h-[15px] w-[15px]" fill="currentColor" />
            )}
          </motion.button>
          <button
            type="button"
            onClick={() => window.dispatchEvent(new Event('elva-play-next'))}
            className="noir-compact-ctrl"
            aria-label="Next"
          >
            <SkipForward className="h-[15px] w-[15px]" fill="currentColor" />
          </button>
        </div>

        <div className="noir-compact-scrub">
          <span className="noir-compact-time">{formatTime(playback.currentTime)}</span>
          <div
            className="noir-compact-seek"
            role="slider"
            tabIndex={0}
            aria-label="Seek"
            aria-valuemin={0}
            aria-valuemax={Math.floor(playback.duration) || 0}
            aria-valuenow={Math.floor(playback.currentTime) || 0}
            aria-valuetext={`${formatTime(playback.currentTime)} of ${formatTime(playback.duration)}`}
            onPointerDown={onSeekPointerDown}
            onPointerMove={onSeekPointerMove}
            onKeyDown={(e) => {
              if (playback.duration <= 0) return;
              if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
                e.preventDefault();
                const delta = e.key === 'ArrowRight' ? 5 : -5;
                const next = Math.min(
                  playback.duration,
                  Math.max(0, playback.currentTime + delta)
                );
                window.dispatchEvent(new CustomEvent('elva-seek', { detail: { time: next } }));
              }
            }}
          >
            <div className="noir-compact-seek-track" aria-hidden>
              <div className="noir-compact-seek-fill" style={{ width: `${progress}%` }} />
              <div className="noir-compact-seek-thumb" style={{ left: `${progress}%` }} />
            </div>
          </div>
          <span className="noir-compact-time">{formatTime(playback.duration)}</span>
        </div>
      </div>

      <div className="noir-compact-right">
        <button
          type="button"
          onClick={() => onOpenQueue?.()}
          className={`noir-compact-queue${expanded ? ' noir-compact-queue--active' : ''}`}
          aria-label={
            upNextCount > 0
              ? `Up next, ${upNextCount} ${upNextCount === 1 ? 'track' : 'tracks'}`
              : 'Up next, empty'
          }
          title={upNextCount > 0 ? `${upNextCount} up next` : 'Up next'}
        >
          <ListMusic className="h-4 w-4 shrink-0" strokeWidth={1.75} />
          {upNextCount > 0 && (
            <span className="noir-compact-queue-count" aria-hidden>
              {upNextCount > 99 ? '99+' : upNextCount}
            </span>
          )}
        </button>

        <div className="noir-compact-volume">
          <button
            type="button"
            onClick={toggleMute}
            className="noir-compact-ctrl"
            aria-label={volume === 0 ? 'Unmute' : 'Mute'}
          >
            <VolumeIcon className="h-4 w-4" strokeWidth={1.75} />
          </button>
          <div
            className="noir-compact-volume-seek"
            role="slider"
            tabIndex={0}
            aria-label="Volume"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={volume}
            onPointerDown={onVolumePointerDown}
            onPointerMove={onVolumePointerMove}
            onKeyDown={(e) => {
              if (e.key === 'ArrowRight' || e.key === 'ArrowUp') {
                e.preventDefault();
                setPlayerVolume(volume + 5);
              } else if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') {
                e.preventDefault();
                setPlayerVolume(volume - 5);
              }
            }}
          >
            <div className="noir-compact-volume-track" aria-hidden>
              <div className="noir-compact-volume-fill" style={{ width: `${volume}%` }} />
            </div>
          </div>
        </div>

        <button
          type="button"
          onClick={onExpand}
          className="noir-compact-ctrl"
          aria-label={expanded ? 'Back to library' : 'Now playing'}
        >
          {expanded ? (
            <ChevronDown className="h-4 w-4" strokeWidth={1.75} />
          ) : (
            <ChevronUp className="h-4 w-4" strokeWidth={1.75} />
          )}
        </button>
      </div>
    </motion.footer>
  );
}
