import { Play } from 'lucide-react';
import { SearchResult } from '../../../types';
import { Playlist } from '../../PlaylistDetailsView';
import { NoirRankedSongRow } from './NoirRankedSongRow';
import { isTrackFavorite } from '../../../utils/favoriteUtils';
import { worldForCollection } from '../../../utils/ditherCover';
import { NoirDitherCover } from './NoirDitherCover';
import { NoirMixCover, resolveMixCover } from './NoirMixCover';
import { inkOn } from './NoirMixCover';
import { COLOR_WORLDS } from '../../../utils/ditherCover';
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

/** What kind of symbol collection this is, for the kicker; null for albums and everything with real covers. */
function symbolCollectionKind(playlist: Playlist): string | null {
  if (playlist.id.startsWith('mix:')) return 'Mix';
  if (playlist.id.startsWith('start:')) return 'Start here';
  if (playlist.id.startsWith('tag:')) return 'Genre';
  if (playlist.id === 'dk_hits' || playlist.id === 'global_hits') return 'Chart';
  return null;
}

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
  const world = playlist.coverWorld ?? worldForCollection(playlist.id);

  const symbolKind = symbolCollectionKind(playlist);
  const artists = [...new Set(playlist.tracks.map((t) => t.artist).filter(Boolean))];
  const meta = [
    strings.playlist.songCount(playlist.tracks.length),
    artists.length > 0 ? `${artists.slice(0, 3).join(', ')}${artists.length > 3 ? ' and more' : ''}` : '',
  ]
    .filter(Boolean)
    .join(' · ');
  const playAll = playlist.tracks.length > 0 && (
    <button
      type="button"
      onClick={() => onPlayPlaylist(playlist.tracks, playlist.name)}
      className={symbolKind ? 'noir-collection-hero-play elva-focus-ring' : 'noir-button-primary mt-4 elva-focus-ring'}
    >
      <Play className="h-3.5 w-3.5 fill-current" />
      {strings.playlist.playAll}
    </button>
  );

  return (
    <div className="flex w-full flex-col gap-10">
      {symbolKind ? (
        /* Mixes, genres and charts: one flat field and one big symbol, the same language as Home. */
        (() => {
          const coverTag = playlist.id.startsWith('mix:') || playlist.id.startsWith('tag:') || playlist.id.startsWith('start:')
            ? playlist.name
            : playlist.id;
          const { world } = resolveMixCover(coverTag);
          return (
            <section
              className="noir-collection-hero"
              style={{
                ['--hero-field' as string]: COLOR_WORLDS[world].field,
                ['--hero-ink' as string]: inkOn(world),
                background: COLOR_WORLDS[world].field,
                color: inkOn(world),
              }}
            >
              <div className="noir-collection-hero-copy">
                <p className="noir-collection-hero-kicker">{symbolKind}</p>
                <h1 className="noir-collection-hero-title">{playlist.name}</h1>
                <p className="noir-collection-hero-meta">{meta}</p>
                {playAll}
              </div>
              <span className="noir-collection-hero-art" aria-hidden>
                <NoirMixCover tag={coverTag} size={320} radius={0} />
              </span>
            </section>
          );
        })()
      ) : (
        <div className="flex flex-col items-center gap-5 text-center sm:flex-row sm:items-end sm:text-left">
          <NoirDitherCover source={cover} world={world} seed={playlist.id} size={160} />
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
            {playAll}
          </div>
        </div>
      )}

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
