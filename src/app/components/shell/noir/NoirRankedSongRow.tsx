import { motion } from 'motion/react';
import { Heart, Plus } from 'lucide-react';
import { SearchResult } from '../../../types';
import { openSongMenu, SongRowOptions } from '../../SongRowOptions';
import { prefersReducedMotion } from '../../../utils/motionPresets';
import { encodePlaylistTrack, PLAYLIST_TRACK_DRAG_MIME } from '../../../utils/playlistStore';
import { hasRealArtwork, youtubeThumb } from '../../../utils/artwork';
import { worldForCollection } from '../../../utils/ditherCover';
import { displayArtistName } from '../../../utils/stringUtils';
import { NoirDitherCover } from './NoirDitherCover';

type NoirRankedSongRowProps = {
  rank: number;
  track: SearchResult;
  isFavorite?: boolean;
  onPlay: () => void;
  onAddToQueue: (track: SearchResult) => void;
  onPlayNext?: (track: SearchResult) => void;
  onToggleFavorite?: (track: SearchResult) => void;
  showDuration?: boolean;
  /** Hide the cover column (e.g. album where every row shares one cover). */
  hideArt?: boolean;
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
  hideArt = false,
}: NoirRankedSongRowProps) {
  const reduced = prefersReducedMotion();
  const rankLabel = String(rank).padStart(2, '0');
  const artUrl = hasRealArtwork(track.thumbnail)
    ? track.thumbnail.trim()
    : youtubeThumb(track.videoId, 'mq') || '';
  const hasThumb = !!artUrl;

  return (
    <motion.div
      role="button"
      tabIndex={0}
      draggable
      onClick={onPlay}
      onContextMenu={(event) =>
        openSongMenu(track, event, {
          onPlayNext,
          onAddToQueue,
          onToggleFavorite,
          isFavorite,
        })
      }
      onDragStart={(event) => {
        event.dataTransfer.effectAllowed = 'copy';
        event.dataTransfer.setData(PLAYLIST_TRACK_DRAG_MIME, encodePlaylistTrack(track));
      }}
      onKeyDown={(e) => {
        if (e.key === 'Enter') onPlay();
      }}
      className={`noir-track-row noir-song-grid group cursor-pointer px-3 py-3 ${
        showDuration ? 'noir-track-row--with-duration' : ''
      } ${hideArt ? 'noir-track-row--no-art' : ''}`}
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

      {!hideArt && (
        <div className={`noir-art relative h-12 w-12 overflow-hidden ${hasThumb ? 'bg-[color:var(--noir-gray-dark)]' : ''}`}>
          {hasThumb ? (
            <motion.img
              src={artUrl}
              alt=""
              className="h-full w-full object-cover"
              whileTap={reduced ? undefined : { scale: 0.92 }}
              transition={{ type: 'spring', stiffness: 450, damping: 30 }}
              onError={(e) => {
                e.currentTarget.onerror = null;
                const fallback = youtubeThumb(track.videoId, 'mq');
                if (fallback && e.currentTarget.src !== fallback) {
                  e.currentTarget.src = fallback;
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
        </div>
      )}

      <div className="min-w-0">
        <p className="noir-song-title truncate">
          {track.title}
        </p>
        <p className="noir-song-meta mt-0.5 truncate">{displayArtistName(track.artist)}</p>
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
              data-tip={isFavorite ? 'Remove from favorites' : 'Add to favorites'}
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
            data-tip="Add to queue"
          >
            <Plus className="h-4 w-4" strokeWidth={2} />
          </button>
          <SongRowOptions
            track={track}
            onPlayNext={onPlayNext}
            onAddToQueue={onAddToQueue}
            onToggleFavorite={onToggleFavorite}
            isFavorite={isFavorite}
          />
        </div>
      </div>
    </motion.div>
  );
}
