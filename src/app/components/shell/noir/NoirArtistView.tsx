import { Play } from 'lucide-react';
import { SearchResult, VerifiedArtist } from '../../../types';
import { NoirRankedSongRow } from './NoirRankedSongRow';
import { isTrackFavorite } from '../../../utils/favoriteUtils';

export type NoirArtistViewProps = {
  artist: VerifiedArtist;
  tracks: SearchResult[];
  isLoading: boolean;
  favorites?: SearchResult[];
  onSelectSong: (track: SearchResult) => void;
  onAddToQueue: (track: SearchResult) => void;
  onPlayNext?: (track: SearchResult) => void;
  onToggleFavorite?: (track: SearchResult) => void;
  onPlayAll?: () => void;
  onPlayFromIndex?: (index: number) => void;
};

export function NoirArtistView({
  artist,
  tracks,
  isLoading,
  favorites = [],
  onSelectSong,
  onAddToQueue,
  onPlayNext,
  onToggleFavorite,
  onPlayAll,
  onPlayFromIndex,
}: NoirArtistViewProps) {
  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-10">
      <div className="flex flex-col items-center gap-5 text-center sm:flex-row sm:items-end sm:text-left">
        <img
          src={artist.thumbnail}
          alt=""
          className="noir-art h-36 w-36 shrink-0 object-cover sm:h-40 sm:w-40"
        />
        <div className="min-w-0 flex-1">
          <h1 className="text-[clamp(1.75rem,4vw,2.5rem)] font-semibold leading-tight tracking-[-0.03em] text-[color:var(--noir-text-primary)]">
            {artist.name}
          </h1>
          <p className="mt-2 text-[14px] text-[color:var(--noir-text-secondary)]">
            {tracks.length} {tracks.length === 1 ? 'track' : 'tracks'}
          </p>
          {tracks.length > 0 && onPlayAll && (
            <button
              type="button"
              onClick={onPlayAll}
              className="mt-4 inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-2 text-[13px] font-medium text-white hover:bg-white/15 elva-focus-ring"
            >
              <Play className="h-3.5 w-3.5 fill-current" />
              Play all
            </button>
          )}
        </div>
      </div>

      <section>
        {isLoading ? (
          <div className="space-y-2">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-12 animate-pulse rounded-[var(--noir-radius-md)] bg-[color:var(--noir-elevated)]" />
            ))}
          </div>
        ) : tracks.length > 0 ? (
          <div className="flex flex-col gap-0.5">
            {tracks.map((track, i) => (
              <NoirRankedSongRow
                key={track.id}
                rank={i + 1}
                track={track}
                isFavorite={isTrackFavorite(favorites, track)}
                onPlay={() =>
                  onPlayFromIndex ? onPlayFromIndex(i) : onSelectSong(track)
                }
                onAddToQueue={onAddToQueue}
                onPlayNext={onPlayNext}
                onToggleFavorite={onToggleFavorite}
              />
            ))}
          </div>
        ) : (
          <p className="py-12 text-center text-[14px] text-[color:var(--noir-text-secondary)]">
            No tracks found for this artist.
          </p>
        )}
      </section>
    </div>
  );
}
