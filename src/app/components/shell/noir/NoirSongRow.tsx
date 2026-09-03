import { Play } from 'lucide-react';
import { SearchResult } from '../../../types';
import { SongRowOptions } from '../../SongRowOptions';

type NoirSongRowProps = {
  track: SearchResult;
  dataIndex?: number;
  isFocused?: boolean;
  isLoading?: boolean;
  onPlay: () => void;
  onAddToQueue: (track: SearchResult) => void;
  onPlayNext?: (track: SearchResult) => void;
  showArtistColumn?: boolean;
};

export function NoirSongRow({
  track,
  dataIndex,
  isFocused = false,
  isLoading = false,
  onPlay,
  onAddToQueue,
  onPlayNext,
  showArtistColumn = true,
}: NoirSongRowProps) {
  return (
    <div
      role="button"
      tabIndex={0}
      data-search-result-index={dataIndex}
      data-focused={isFocused ? 'true' : 'false'}
      onClick={() => {
        if (!isLoading) onPlay();
      }}
      onKeyDown={(e) => {
        if (e.key === 'Enter' && !isLoading) onPlay();
      }}
      className="noir-track-row group flex cursor-pointer items-center gap-3 px-3 py-2.5"
    >
      <div className="noir-art relative h-11 w-11 shrink-0 overflow-hidden bg-[color:var(--noir-gray-dark)]">
        <img
          src={track.thumbnail}
          alt=""
          className={`h-full w-full object-cover ${isLoading ? 'opacity-50' : ''}`}
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
      </div>

      <div className="min-w-0 flex-1">
        <p className="truncate text-[14px] font-medium text-[color:var(--noir-text-primary)]">
          {track.title}
        </p>
        {showArtistColumn && (
          <p className="truncate text-[13px] text-[color:var(--noir-text-secondary)]">{track.artist}</p>
        )}
      </div>

      <div className="flex shrink-0 items-center gap-0.5 opacity-0 transition-opacity group-hover:opacity-100">
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            if (!isLoading) onPlay();
          }}
          className="flex h-8 w-8 items-center justify-center rounded-full text-[color:var(--noir-text-secondary)] hover:bg-white/[0.06] hover:text-white"
          aria-label="Play"
        >
          <Play className="h-3.5 w-3.5 fill-current" />
        </button>
        <SongRowOptions track={track} onPlayNext={onPlayNext} onAddToQueue={onAddToQueue} />
      </div>
    </div>
  );
}
