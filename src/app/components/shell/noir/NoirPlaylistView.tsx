import { Play } from 'lucide-react';
import { SearchResult } from '../../../types';
import { Playlist } from '../../PlaylistDetailsView';
import { NoirRankedSongRow } from './NoirRankedSongRow';
import { isTrackFavorite } from '../../../utils/favoriteUtils';
import { worldForCollection } from '../../../utils/ditherCover';
import { NoirDitherCover } from './NoirDitherCover';
import { strings } from '../../../constants/strings';

export type NoirPlaylistViewProps = {
  playlist: Playlist;
  favorites?: SearchResult[];
  onSelectSong: (track: SearchResult) => void;
  onAddToQueue: (track: SearchResult) => void;
  onPlayPlaylist: (tracks: SearchResult[], label?: string, startIndex?: number) => void;
  onPlayNext?: (track: SearchResult) => void;
  onToggleFavorite?: (track: SearchResult) => void;
};

function allSameCover(tracks: SearchResult[], fallback: string) {
  if (tracks.length === 0) return false;
  const first = (tracks[0]?.thumbnail || fallback).trim();
  if (!first) return false;
  return tracks.every((track) => (track.thumbnail || fallback).trim() === first);
}

export function NoirPlaylistView({
  playlist,
  favorites = [],
  onAddToQueue,
  onPlayPlaylist,
  onPlayNext,
  onToggleFavorite,
}: NoirPlaylistViewProps) {
  const cover = playlist.tracks[0]?.thumbnail ?? playlist.thumbnail;
  const hideArt = allSameCover(playlist.tracks, playlist.thumbnail);

  return (
    <div className="flex w-full flex-col gap-10">
      <div className="flex flex-col items-center gap-5 text-center sm:flex-row sm:items-end sm:text-left">
        <NoirDitherCover source={cover} world={worldForCollection(playlist.id)} seed={playlist.id} size={160} />
        <div className="min-w-0 flex-1">
          <h1 className="text-[clamp(1.5rem,3.5vw,2.25rem)] font-semibold leading-tight tracking-[-0.03em] text-[color:var(--noir-text-primary)]">
            {playlist.name}
          </h1>
          {playlist.description && (
            <p className="mt-2 text-[14px] text-[color:var(--noir-text-secondary)]">{playlist.description}</p>
          )}
          <p className="mt-1 text-[13px] text-[color:var(--noir-text-tertiary)]">
            {strings.playlist.songCount(playlist.tracks.length)}
          </p>
          {playlist.tracks.length > 0 && (
            <button
              type="button"
              onClick={() => onPlayPlaylist(playlist.tracks, playlist.name)}
              className="noir-button-primary mt-4 elva-focus-ring"
            >
              <Play className="h-3.5 w-3.5 fill-current" />
              {strings.playlist.playAll}
            </button>
          )}
        </div>
      </div>

      <section>
        {playlist.tracks.length > 0 ? (
          <div className="flex flex-col gap-0.5">
            {playlist.tracks.map((track, i) => (
              <NoirRankedSongRow
                key={track.id}
                rank={i + 1}
                track={track}
                hideArt={hideArt}
                isFavorite={isTrackFavorite(favorites, track)}
                onPlay={() => onPlayPlaylist(playlist.tracks, playlist.name, i)}
                onAddToQueue={onAddToQueue}
                onPlayNext={onPlayNext}
                onToggleFavorite={onToggleFavorite}
              />
            ))}
          </div>
        ) : (
          <p className="py-12 text-center text-[14px] text-[color:var(--noir-text-secondary)]">
            {strings.playlist.emptyRow}
          </p>
        )}
      </section>
    </div>
  );
}
