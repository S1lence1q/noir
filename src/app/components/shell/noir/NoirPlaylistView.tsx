import type { CSSProperties } from 'react';
import { Play } from 'lucide-react';
import { getPlaybackSongKey } from '../../../utils/playbackSongKey';
import { SearchResult } from '../../../types';
import { Playlist } from '../../PlaylistDetailsView';
import { NoirRankedSongRow } from './NoirRankedSongRow';
import { isTrackFavorite } from '../../../utils/favoriteUtils';
import { worldForCollection } from '../../../utils/ditherCover';
import { NoirArtwork } from './NoirArtwork';
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
  /** The song loaded in the player, to mark its row. */
  activeSongKey?: string | null;
  /** Mix tracks resolve their video id only at play time, so also match the loaded song by id or name. */
  activeTrack?: SearchResult | null;
  isPlaying?: boolean;
};

/** What kind of symbol collection this is, for the kicker; null for albums and everything with real covers. */
function symbolCollectionKind(playlist: Playlist): string | null {
  if (playlist.id.startsWith('mix:')) return 'Mix';
  if (playlist.id.startsWith('start:')) return 'Start here';
  if (playlist.id.startsWith('tag:')) return 'Genre';
  if (playlist.id === 'dk_hits' || playlist.id === 'global_hits') return 'Chart';
  return null;
}

const sameName = (a: string, b: string) => a.trim().toLowerCase() === b.trim().toLowerCase();

function isActiveTrack(track: SearchResult, key: string | null, active: SearchResult | null): boolean {
  if (key && getPlaybackSongKey(track) === key) return true;
  if (!active) return false;
  if (active.id && active.id === track.id) return true;
  return !!active.title && sameName(active.title, track.title) && sameName(active.artist, track.artist);
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
  activeSongKey = null,
  activeTrack = null,
  isPlaying = false,
}: NoirPlaylistViewProps) {
  const cover = playlist.tracks[0]?.thumbnail ?? playlist.thumbnail;
  const hideArt = allSameCover(playlist.tracks, playlist.thumbnail);
  const world = playlist.coverWorld ?? worldForCollection(playlist.id);

  const symbolKind = symbolCollectionKind(playlist);
  const coverTag =
    playlist.id.startsWith('mix:') || playlist.id.startsWith('tag:') || playlist.id.startsWith('start:')
      ? playlist.name
      : playlist.id;
  // Mixes carry the colour the Home row gave them, so the page matches its tile.
  const symbolWorld = symbolKind
    ? (playlist.id.startsWith('mix:') || playlist.id.startsWith('start:')) && playlist.coverWorld
      ? playlist.coverWorld
      : resolveMixCover(coverTag).world
    : world;
  // Albums and playlists share the hero; their real cover sits inside it instead of a symbol.
  const isRelease = playlist.id.startsWith('album:') || playlist.id.startsWith('release:');
  const n = playlist.tracks.length;
  // Known release type wins; otherwise guess from length so a one-track page never says "Album".
  const releaseType = playlist.recordType ?? (n <= 1 ? 'single' : n <= 6 ? 'ep' : 'album');
  const kicker = symbolKind ?? (isRelease ? (releaseType === 'single' ? 'Single' : releaseType === 'ep' ? 'EP' : 'Album') : 'Playlist');

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
      className="noir-collection-hero-play noir-focus-ring"
    >
      <Play className="h-3.5 w-3.5 fill-current" />
      {strings.playlist.playAll}
    </button>
  );

  return (
    <div
      className="flex w-full flex-col gap-10"
      style={
        {
          '--hero-field': COLOR_WORLDS[symbolWorld].field,
          '--hero-ink': inkOn(symbolWorld),
        } as CSSProperties
      }
    >
      {/* One flat field: mixes, genres and charts carry a big symbol, albums and playlists their real cover. */}
      <section
        className="noir-collection-hero"
        data-cover={symbolKind ? undefined : 'real'}
        style={{
          background: COLOR_WORLDS[symbolWorld].field,
          color: inkOn(symbolWorld),
        }}
      >
        <div className="noir-collection-hero-copy">
          <p className="noir-collection-hero-kicker">{kicker}</p>
          <h1 className="noir-collection-hero-title">{playlist.name}</h1>
          {!symbolKind && playlist.description && (
            <p className="noir-collection-hero-meta">{playlist.description}</p>
          )}
          <p className="noir-collection-hero-meta">
            {symbolKind ? meta : strings.playlist.songCount(playlist.tracks.length)}
          </p>
          {playAll}
        </div>
        {symbolKind ? (
          <span className="noir-collection-hero-art" aria-hidden>
            <NoirMixCover tag={coverTag} world={symbolWorld} size={320} radius={0} />
          </span>
        ) : (
          <span className="noir-collection-hero-cover" aria-hidden>
            <NoirArtwork source={cover} world={world} seed={playlist.id} size={236} radius={16} />
          </span>
        )}
      </section>

      <section>
        {playlist.tracks.length > 0 ? (
          <>
            <div className="noir-collection-list">
              {playlist.tracks.map((track, i) => (
                <NoirRankedSongRow
                  key={track.id}
                  rank={i + 1}
                  track={track}
                  hideArt={hideArt}
                  calm
                  playing={isActiveTrack(track, activeSongKey, activeTrack)}
                  isPlaying={isPlaying}
                  isFavorite={isTrackFavorite(favorites, track)}
                  onPlay={() => onPlayPlaylist(playlist.tracks, playlist.name, i)}
                  onAddToQueue={onAddToQueue}
                  onPlayNext={onPlayNext}
                  onToggleFavorite={onToggleFavorite}
                />
              ))}
            </div>
          </>
        ) : (
          <p className="py-12 text-center text-[14px] text-[color:var(--noir-text-secondary)]">
            {strings.playlist.emptyRow}
          </p>
        )}
      </section>
    </div>
  );
}
