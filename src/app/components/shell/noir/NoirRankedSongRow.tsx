import { Play } from 'lucide-react';
import { SearchResult } from '../../../types';
import { SongRowOptions } from '../../SongRowOptions';

type NoirRankedSongRowProps = {
  rank: number;
  track: SearchResult;
  onPlay: () => void;
  onAddToQueue: (track: SearchResult) => void;
  onPlayNext?: (track: SearchResult) => void;
};

export function NoirRankedSongRow({
  rank,
  track,
  onPlay,
  onAddToQueue,
  onPlayNext,
}: NoirRankedSongRowProps) {
  const rankLabel = String(rank).padStart(2, '0');

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onPlay}
      onKeyDown={(e) => {
        if (e.key === 'Enter') onPlay();
      }}
      className="noir-track-row group flex cursor-pointer items-center gap-3 px-3 py-2.5"
    >
      <span
        className={`w-7 shrink-0 tabular-nums text-[13px] font-medium leading-none ${
          rank === 1
            ? 'text-white/35'
            : 'text-[color:var(--noir-text-tertiary)]'
        }`}
        aria-hidden
      >
        {rankLabel}
      </span>

      <div className="noir-art relative h-11 w-11 shrink-0 overflow-hidden bg-[color:var(--noir-gray-dark)]">
        <img
          src={track.thumbnail}
          alt=""
          className="h-full w-full object-cover"
          onError={(e) => {
            e.currentTarget.onerror = null;
            if (track.videoId) {
              e.currentTarget.src = `https://img.youtube.com/vi/${track.videoId}/mqdefault.jpg`;
            }
          }}
        />
      </div>

      <div className="min-w-0 flex-1">
        <p className="truncate text-[14px] font-medium text-[color:var(--noir-text-primary)]">
          {track.title}
        </p>
        <p className="truncate text-[13px] text-[color:var(--noir-text-secondary)]">{track.artist}</p>
      </div>

      <div className="flex shrink-0 items-center gap-0.5 opacity-0 transition-opacity group-hover:opacity-100">
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onPlay();
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
