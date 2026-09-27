import { motion } from 'motion/react';
import { Heart, Plus } from 'lucide-react';
import { SearchResult } from '../../../types';
import { SongRowOptions } from '../../SongRowOptions';
import { prefersReducedMotion } from '../../../utils/motionPresets';

type NoirRankedSongRowProps = {
  rank: number;
  track: SearchResult;
  isFavorite?: boolean;
  onPlay: () => void;
  onAddToQueue: (track: SearchResult) => void;
  onPlayNext?: (track: SearchResult) => void;
  onToggleFavorite?: (track: SearchResult) => void;
  showDuration?: boolean;
};

function formatDuration(duration: number) {
  const minutes = Math.floor(duration / 60);
  const seconds = Math.floor(duration % 60).toString().padStart(2, '0');
  return `${minutes}:${seconds}`;
}

export function NoirRankedSongRow({
  rank,
  track,
  isFavorite = false,
  onPlay,
  onAddToQueue,
  onPlayNext,
  onToggleFavorite,
  showDuration = false,
}: NoirRankedSongRowProps) {
  const reduced = prefersReducedMotion();
  const rankLabel = String(rank).padStart(2, '0');

  return (
    <motion.div
      role="button"
      tabIndex={0}
      onClick={onPlay}
      onKeyDown={(e) => {
        if (e.key === 'Enter') onPlay();
      }}
      className={`noir-track-row noir-song-grid group cursor-pointer px-3 py-3 ${
        showDuration ? 'noir-track-row--with-duration' : ''
      }`}
      whileTap={reduced ? undefined : { scale: 0.985 }}
      transition={{ type: 'spring', stiffness: 520, damping: 34 }}
    >
      <span
        className={`tabular-nums text-[14px] font-medium leading-none ${
          rank === 1 ? 'text-white/35' : 'text-[color:var(--noir-text-tertiary)]'
        }`}
        aria-hidden
      >
        {rankLabel}
      </span>

      <div className="noir-art relative h-12 w-12 overflow-hidden bg-[color:var(--noir-gray-dark)]">
        <motion.img
          src={track.thumbnail}
          alt=""
          className="h-full w-full object-cover"
          whileTap={reduced ? undefined : { scale: 0.92 }}
          transition={{ type: 'spring', stiffness: 450, damping: 30 }}
          onError={(e) => {
            e.currentTarget.onerror = null;
            if (track.videoId) {
              e.currentTarget.src = `https://img.youtube.com/vi/${track.videoId}/mqdefault.jpg`;
            }
          }}
        />
      </div>

      <div className="min-w-0">
        <p className="noir-song-title truncate">
          {track.title}
        </p>
        <p className="noir-song-meta mt-0.5 truncate">{track.artist}</p>
      </div>

      {showDuration && (
        <span className="noir-song-duration">
          {track.duration !== undefined ? formatDuration(track.duration) : null}
        </span>
      )}
      <div
        className="noir-track-actions flex items-center justify-end gap-0.5"
        onClick={(e) => e.stopPropagation()}
      >
        {onToggleFavorite && (
          <div
            className={isFavorite ? 'opacity-100' : undefined}
          >
            <button
              type="button"
              onClick={() => onToggleFavorite(track)}
              className="flex h-9 w-9 items-center justify-center rounded-full text-[color:var(--noir-text-secondary)] hover:bg-white/[0.08] hover:text-white"
              aria-label={isFavorite ? 'Remove from favorites' : 'Add to favorites'}
              title={isFavorite ? 'Remove from favorites' : 'Add to favorites'}
            >
              <Heart
                className={`h-4 w-4 ${isFavorite ? 'fill-current text-[color:var(--noir-accent)]' : ''}`}
                strokeWidth={isFavorite ? 0 : 1.75}
              />
            </button>
          </div>
        )}
        <div className="flex items-center gap-0.5">
          <button
            type="button"
            onClick={() => onAddToQueue(track)}
            className="flex h-9 w-9 items-center justify-center rounded-full text-[color:var(--noir-text-secondary)] hover:bg-white/[0.08] hover:text-white"
            aria-label="Add to queue"
            title="Add to queue"
          >
            <Plus className="h-4 w-4" strokeWidth={2} />
          </button>
          <SongRowOptions
            track={track}
            onPlayNext={onPlayNext}
            onAddToQueue={onAddToQueue}
          />
        </div>
      </div>
    </motion.div>
  );
}
