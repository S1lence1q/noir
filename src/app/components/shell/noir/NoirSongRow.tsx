import { motion } from 'motion/react';
import { Heart, Plus } from 'lucide-react';
import { SearchResult } from '../../../types';
import { SongRowOptions } from '../../SongRowOptions';
import { prefersReducedMotion } from '../../../utils/motionPresets';

type NoirSongRowProps = {
  track: SearchResult;
  dataIndex?: number;
  isFocused?: boolean;
  isLoading?: boolean;
  isPlaying?: boolean;
  isFavorite?: boolean;
  onPlay: () => void;
  onAddToQueue: (track: SearchResult) => void;
  onPlayNext?: (track: SearchResult) => void;
  onToggleFavorite?: (track: SearchResult) => void;
  showArtistColumn?: boolean;
};

export function NoirSongRow({
  track,
  dataIndex,
  isFocused = false,
  isLoading = false,
  isPlaying = false,
  isFavorite = false,
  onPlay,
  onAddToQueue,
  onPlayNext,
  onToggleFavorite,
  showArtistColumn = true,
}: NoirSongRowProps) {
  const reduced = prefersReducedMotion();

  return (
    <motion.div
      role="button"
      tabIndex={0}
      data-search-result-index={dataIndex}
      data-focused={isFocused ? 'true' : 'false'}
      data-playing={isPlaying ? 'true' : 'false'}
      onClick={() => {
        if (!isLoading) onPlay();
      }}
      onKeyDown={(e) => {
        if (e.key === 'Enter' && !isLoading) onPlay();
      }}
      className="noir-track-row group flex cursor-pointer items-center gap-3.5 px-3 py-3"
      whileTap={reduced || isLoading ? undefined : { scale: 0.985, backgroundColor: 'rgba(255,255,255,0.07)' }}
      transition={{ type: 'spring', stiffness: 520, damping: 34 }}
    >
      <div className="noir-art relative h-12 w-12 shrink-0 overflow-hidden bg-[color:var(--noir-gray-dark)]">
        <motion.img
          src={track.thumbnail}
          alt=""
          className={`h-full w-full object-cover ${isLoading ? 'opacity-50' : ''}`}
          whileTap={reduced || isLoading ? undefined : { scale: 0.92 }}
          transition={{ type: 'spring', stiffness: 450, damping: 30 }}
          onError={(e) => {
            e.currentTarget.onerror = null;
            if (track.videoId) {
              e.currentTarget.src = `https://img.youtube.com/vi/${track.videoId}/mqdefault.jpg`;
            }
          }}
        />
        {isLoading && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/50">
            <div className="h-4 w-4 animate-spin rounded-full border border-white/20 border-t-white" />
          </div>
        )}
        {isPlaying && !isLoading && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/45">
            <span className="noir-playing-bars" aria-hidden>
              <span />
              <span />
              <span />
            </span>
          </div>
        )}
      </div>

      <div className="min-w-0 flex-1">
        <p
          className={`truncate text-[15px] font-medium ${
            isPlaying
              ? 'text-white'
              : 'text-[color:var(--noir-text-primary)]'
          }`}
        >
          {track.title}
        </p>
        {showArtistColumn && (
          <p className="truncate text-[14px] text-[color:var(--noir-text-secondary)]">{track.artist}</p>
        )}
      </div>

      <div
        className={`noir-track-actions ml-auto flex shrink-0 items-center justify-end gap-0.5 transition-opacity ${
          isFavorite
            ? 'opacity-100'
            : 'opacity-0 group-hover:opacity-100 group-focus-within:opacity-100'
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        {onToggleFavorite && (
          <button
            type="button"
            onClick={() => onToggleFavorite(track)}
            className="flex h-9 w-9 items-center justify-center rounded-full text-[color:var(--noir-text-secondary)] hover:bg-white/[0.08] hover:text-white"
            aria-label={isFavorite ? 'Remove from favorites' : 'Add to favorites'}
            title={isFavorite ? 'Remove from favorites' : 'Add to favorites'}
          >
            <Heart
              className={`h-4 w-4 ${isFavorite ? 'fill-current text-red-400' : ''}`}
              strokeWidth={isFavorite ? 0 : 1.75}
            />
          </button>
        )}
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
    </motion.div>
  );
}
