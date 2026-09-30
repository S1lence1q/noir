import { Play } from 'lucide-react';
import { motion } from 'motion/react';
import { NoirArtwork } from './NoirArtwork';
import { hasRealArtwork, youtubeThumb } from '../../../utils/artwork';
import { displayArtistName } from '../../../utils/stringUtils';
import { EASE_PREMIUM, prefersReducedMotion } from '../../../utils/motionPresets';
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
  const reduced = prefersReducedMotion();
  // On mix / genre / chart pages the first three get big cards; the rest is a two-column list.
  const useFeatured = !!symbolKind && !hideArt && playlist.tracks.length >= 6;
  const featured = useFeatured ? playlist.tracks.slice(0, 3) : [];
  const rest = useFeatured ? playlist.tracks.slice(3) : playlist.tracks;
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
          <>
            {featured.length > 0 && (
              <div className="noir-collection-featured">
                {featured.map((track, i) => {
                  const art = hasRealArtwork(track.thumbnail) ? track.thumbnail : youtubeThumb(track.videoId, 'hq') || undefined;
                  return (
                    <motion.button
                      key={track.id}
                      type="button"
                      className="noir-collection-feature elva-focus-ring"
                      onClick={() => onPlayPlaylist(playlist.tracks, playlist.name, i)}
                      initial={reduced ? false : { opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.4, ease: EASE_PREMIUM, delay: 0.1 + i * 0.06 }}
                    >
                      <span className="noir-collection-feature-art">
                        <NoirArtwork
                          source={art}
                          world={world}
                          seed={`feature:${track.id}`}
                          size={220}
                          radius={0}
                        />
                        <span className="noir-collection-feature-rank" aria-hidden>
                          {String(i + 1).padStart(2, '0')}
                        </span>
                        <span className="noir-collection-feature-play noir-play-round" aria-hidden>
                          <Play className="ml-0.5 h-4 w-4 fill-current" />
                        </span>
                      </span>
                      <span className="noir-song-title block truncate">{track.title}</span>
                      <span className="noir-song-meta block truncate">{displayArtistName(track.artist)}</span>
                    </motion.button>
                  );
                })}
              </div>
            )}
            {featured.length > 0 && rest.length > 0 && <p className="noir-collection-list-label">All tracks</p>}
            <div className={symbolKind ? 'noir-collection-list' : 'flex flex-col gap-0.5'}>
              {rest.map((track, i) => (
                <NoirRankedSongRow
                  key={track.id}
                  rank={featured.length + i + 1}
                  track={track}
                  hideArt={hideArt}
                  isFavorite={isTrackFavorite(favorites, track)}
                  onPlay={() => onPlayPlaylist(playlist.tracks, playlist.name, featured.length + i)}
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
