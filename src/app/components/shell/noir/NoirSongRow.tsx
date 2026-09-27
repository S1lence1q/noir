import type { ReactNode } from 'react';
import { motion } from 'motion/react';
import { Heart, Plus } from 'lucide-react';
import { SearchResult } from '../../../types';
import { openSongMenu, SongRowOptions } from '../../SongRowOptions';
import { prefersReducedMotion } from '../../../utils/motionPresets';
import { encodePlaylistTrack, PLAYLIST_TRACK_DRAG_MIME } from '../../../utils/playlistStore';
import { worldForCollection } from '../../../utils/ditherCover';
import { displayArtistName } from '../../../utils/stringUtils';
import { NoirDitherCover } from './NoirDitherCover';

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
  onRemoveFromPlaylist?: (track: SearchResult) => void;
  showArtistColumn?: boolean;
  showDuration?: boolean;
  /** Rendered in the hover action group, before add-to-queue. */
  extraAction?: ReactNode;
};

function formatDuration(duration: number) {
  const minutes = Math.floor(duration / 60);
  const seconds = Math.floor(duration % 60).toString().padStart(2, '0');
  return `${minutes}:${seconds}`;
}

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
  onRemoveFromPlaylist,
  showArtistColumn = true,
  showDuration = false,
  extraAction,
}: NoirSongRowProps) {
  const reduced = prefersReducedMotion();
  const hasThumb = !!track.thumbnail?.trim();

  return (
    <motion.div
      role="button"
      tabIndex={0}
      draggable={!isLoading}
      data-search-result-index={dataIndex}
      data-focused={isFocused ? 'true' : 'false'}
      data-playing={isPlaying ? 'true' : 'false'}
      onClick={() => {
        if (!isLoading) onPlay();
      }}
      onContextMenu={(event) =>
        openSongMenu(track, event, {
          onPlayNext,
          onAddToQueue,
          onToggleFavorite,
          isFavorite,
          onRemoveFromPlaylist,
        })
      }
      onDragStart={(event) => {
        event.dataTransfer.effectAllowed = 'copy';
        event.dataTransfer.setData(PLAYLIST_TRACK_DRAG_MIME, encodePlaylistTrack(track));
      }}
      onKeyDown={(e) => {
        if (e.key === 'Enter' && !isLoading) onPlay();
      }}
      className={`noir-track-row noir-song-grid noir-track-row--unranked group cursor-pointer px-3 py-3 ${
        showDuration ? 'noir-track-row--with-duration' : ''
      }`}
      whileTap={reduced || isLoading ? undefined : { scale: 0.985 }}
      transition={{ type: 'spring', stiffness: 520, damping: 34 }}
    >
      <div className={`noir-art relative h-12 w-12 overflow-hidden ${hasThumb ? 'bg-[color:var(--noir-gray-dark)]' : ''}`}>
        {hasThumb ? (
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
        ) : (
          <NoirDitherCover
            world={worldForCollection(track.id)}
            seed={track.id}
            size={48}
            radius={0}
          />
        )}
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

      <div className="min-w-0">
        <p
          className={`noir-song-title truncate ${
            isPlaying
              ? 'text-white'
              : 'text-[color:var(--noir-text-primary)]'
          }`}
        >
          {track.title}
        </p>
        {showArtistColumn && (
          <p className="noir-song-meta mt-0.5 truncate">{displayArtistName(track.artist)}</p>
        )}
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
            className={isFavorite ? 'noir-track-action--pinned' : undefined}
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
        {extraAction}
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
            onToggleFavorite={onToggleFavorite}
            isFavorite={isFavorite}
            onRemoveFromPlaylist={onRemoveFromPlaylist}
          />
        </div>
      </div>
    </motion.div>
  );
}
