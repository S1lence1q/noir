import { Maximize2, Pause, Play, SkipBack, SkipForward } from 'lucide-react';
import { ShellPlaybackState } from './types';

type SongPreview = {
  title: string;
  artist: string;
  artworkUrl: string;
};

type CompactPlayerBarProps = {
  visible: boolean;
  song: SongPreview;
  playback: ShellPlaybackState;
  onExpand: () => void;
};

function formatTime(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) return '0:00';
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

export function CompactPlayerBar({
  visible,
  song,
  playback,
  onExpand,
}: CompactPlayerBarProps) {
  if (!visible) return null;

  const progress =
    playback.duration > 0
      ? Math.min(100, (playback.currentTime / playback.duration) * 100)
      : 0;

  return (
    <footer className="elva-shell-player shrink-0">
      <div className="noir-player-progress" aria-hidden>
        <div className="noir-player-progress-fill" style={{ width: `${progress}%` }} />
      </div>

      <div className="flex h-[64px] items-center gap-6 px-6">
        <button
          type="button"
          onClick={onExpand}
          className="flex min-w-0 max-w-[min(38vw,300px)] items-center gap-3.5 text-left elva-focus-ring"
          aria-label="Open fullscreen player"
        >
          <img src={song.artworkUrl} alt="" className="noir-art h-10 w-10 shrink-0 object-cover" />
          <div className="min-w-0">
            <p className="truncate text-[13px] font-medium text-[color:var(--noir-text-primary)]">
              {song.title}
            </p>
            <p className="truncate text-[12px] text-[color:var(--noir-text-tertiary)]">{song.artist}</p>
          </div>
        </button>

        <div className="flex items-center gap-0.5">
          <button
            type="button"
            onClick={() => window.dispatchEvent(new Event('elva-play-prev'))}
            className="flex h-8 w-8 items-center justify-center rounded-full text-[color:var(--noir-text-tertiary)] hover:text-[color:var(--noir-text-primary)] elva-focus-ring"
            aria-label="Previous"
          >
            <SkipBack className="h-4 w-4" fill="currentColor" />
          </button>
          <button
            type="button"
            onClick={() => window.dispatchEvent(new Event('elva-toggle-play'))}
            className="flex h-8 w-8 items-center justify-center rounded-full text-[color:var(--noir-text-primary)] elva-focus-ring"
            aria-label={playback.isPlaying ? 'Pause' : 'Play'}
          >
            {playback.isPlaying ? (
              <Pause className="h-[18px] w-[18px]" fill="currentColor" />
            ) : (
              <Play className="ml-0.5 h-[18px] w-[18px]" fill="currentColor" />
            )}
          </button>
          <button
            type="button"
            onClick={() => window.dispatchEvent(new Event('elva-play-next'))}
            className="flex h-8 w-8 items-center justify-center rounded-full text-[color:var(--noir-text-tertiary)] hover:text-[color:var(--noir-text-primary)] elva-focus-ring"
            aria-label="Next"
          >
            <SkipForward className="h-4 w-4" fill="currentColor" />
          </button>
        </div>

        <div className="ml-auto flex items-center gap-4">
          <span className="hidden text-[11px] tabular-nums text-[color:var(--noir-text-tertiary)] sm:inline">
            {formatTime(playback.currentTime)}
            <span className="mx-1 text-white/20">/</span>
            {formatTime(playback.duration)}
          </span>
          <button
            type="button"
            onClick={onExpand}
            className="flex h-7 w-7 items-center justify-center text-[color:var(--noir-text-tertiary)] hover:text-[color:var(--noir-text-primary)] elva-focus-ring"
            aria-label="Expand player"
          >
            <Maximize2 className="h-[15px] w-[15px]" strokeWidth={1.75} />
          </button>
        </div>
      </div>
    </footer>
  );
}
