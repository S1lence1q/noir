import { useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { ArrowLeft, ListMusic, Play, Plus, Shuffle, AudioLines, Settings, History } from 'lucide-react';
import { SearchResult } from '../../../types';
import { strings } from '../../../constants/strings';
import { NoirSongRow } from './NoirSongRow';
import { NoirGraphicAccent } from './NoirGraphicAccent';
import { NoirPlaylistCover } from './NoirPlaylistCover';
import { NoirFavoritesCover } from './NoirFavoritesCover';
import { NoirUserPlaylistPage } from './NoirUserPlaylistPage';
import { NoirStatsView } from './NoirStatsView';
import { NoirHistoryView } from './NoirHistoryView';
import { createPlaylist, usePlaylists } from '../../../utils/playlistStore';
import {
  formatFavoritedAt,
  sortFavorites,
  type FavoritesSort,
} from '../../../utils/favoriteUtils';
import { MOTION, withReducedMotion } from '../../../utils/motionPresets';

type LibrarySection = 'favorites' | 'playlists' | 'history' | 'stats';

export type LibraryFocus = {
  section: LibrarySection;
  playlistId?: string | null;
  requestId: number;
};

export type NoirLibraryViewProps = {
  favorites: SearchResult[];
  recentTracks?: SearchResult[];
  focus?: LibraryFocus | null;
  onPlaylistOpenChange?: (playlistId: string | null) => void;
  onSectionChange?: (section: LibrarySection) => void;
  onToggleFavorite: (song: SearchResult) => void;
  onSelectSong: (song: SearchResult) => void;
  onAddToQueue: (song: SearchResult) => void;
  onPlayPlaylist: (tracks: SearchResult[], label?: string, startIndex?: number) => void;
  onPlayNext?: (song: SearchResult) => void;
};

/**
 * Library root is the collection grid (Favorites card first, then playlists).
 * Favorites and playlists open as sub-pages with a back link — Favorites is not a tab,
 * so the sidebar's Library button always has somewhere to go.
 */
const SECTIONS: { id: LibrarySection; label: string; icon: typeof ListMusic }[] = [
  { id: 'playlists', label: 'Playlists', icon: ListMusic },
  { id: 'history', label: strings.library.history, icon: History },
  { id: 'stats', label: strings.stats.tab, icon: AudioLines },
];

export function NoirLibraryView({
  favorites,
  recentTracks = [],
  focus = null,
  onPlaylistOpenChange,
  onSectionChange,
  onToggleFavorite,
  onSelectSong,
  onAddToQueue,
  onPlayPlaylist,
  onPlayNext,
}: NoirLibraryViewProps) {
  const [section, setSection] = useState<LibrarySection>(focus?.section ?? 'playlists');
  const [favoritesSort, setFavoritesSort] = useState<FavoritesSort>('recent');
  const playlists = usePlaylists();
  const [selectedPlaylistId, setSelectedPlaylistId] = useState<string | null>(
    focus?.playlistId ?? null
  );

  const sortedFavorites = useMemo(
    () => sortFavorites(favorites, favoritesSort),
    [favorites, favoritesSort]
  );

  useEffect(() => {
    if (!focus) return;
    setSection(focus.section);
    setSelectedPlaylistId(focus.playlistId ?? null);
  }, [focus?.requestId]);

  useEffect(() => {
    onSectionChange?.(section);
  }, [section, onSectionChange]);

  useEffect(() => {
    onPlaylistOpenChange?.(selectedPlaylistId);
  }, [selectedPlaylistId, onPlaylistOpenChange]);

  const openPlaylist = (id: string | null) => {
    setSelectedPlaylistId(id);
  };

  const selectedPlaylist = playlists.find((p) => p.id === selectedPlaylistId) ?? null;
  const inSubPage = !!selectedPlaylist || section === 'favorites';
  const showHeader = !inSubPage;
  const backToRoot = () => {
    setSection('playlists');
    openPlaylist(null);
  };

  return (
    <div className="noir-settle-group flex h-full min-h-0 flex-col">
      {showHeader && (
        <header className="relative pb-5">
          {/* Phone: the sidebar is a tab bar without Settings, so Library carries the way there. */}
          <button
            type="button"
            className="noir-phone-only noir-icon-button absolute right-0 top-0 elva-focus-ring"
            onClick={() => window.dispatchEvent(new Event('noir-open-settings'))}
            aria-label="Settings"
          >
            <Settings className="h-[18px] w-[18px]" strokeWidth={1.75} />
          </button>
          <h1 className="noir-page-title">Library</h1>
          <p className="mt-2 text-[16px] text-[color:var(--noir-text-secondary)]">
            Favorites, playlists, and your sound
          </p>
        </header>
      )}
      <div className={`flex gap-1 px-1 pb-6 ${inSubPage ? 'hidden' : ''}`}>
        {SECTIONS.map(({ id, label, icon: Icon }) => {
          const isActive = section === id;
          return (
            <button
              key={id}
              type="button"
              onClick={() => {
                setSection(id);
                openPlaylist(null);
              }}
              data-active={isActive ? 'true' : 'false'}
              className="noir-nav-item flex h-9 items-center gap-2 px-3 text-[13px] font-medium elva-focus-ring"
            >
              <Icon className="h-4 w-4" strokeWidth={isActive ? 2.25 : 1.75} />
              {label}
            </button>
          );
        })}
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto scrollbar-none">
        <AnimatePresence mode="wait">
          {section === 'favorites' && (
            <motion.div
              key="favorites"
              className="noir-settle-group"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0, transition: { duration: 0 } }}
              transition={{ duration: 0.18 }}
            >
              <button type="button" onClick={backToRoot} className="noir-back-link elva-focus-ring">
                <ArrowLeft className="h-4 w-4" strokeWidth={1.75} />
                {strings.playlist.back}
              </button>
              <header className="mb-6 mt-5 flex items-end gap-6">
                <NoirFavoritesCover size={200} />
                <div className="min-w-0 flex-1 pb-1">
                  <h1 className="noir-collection-title">{strings.home.favorites}</h1>
                  <p className="mt-2 text-[13px] text-[color:var(--noir-text-secondary)]">
                    {strings.playlist.songCount(favorites.length)}
                  </p>
                  {favorites.length > 0 && (
                    <div className="mt-5 flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => onPlayPlaylist(sortedFavorites, strings.home.favorites)}
                        className="noir-play-round elva-focus-ring"
                        aria-label={strings.playlist.play}
                      >
                        <Play className="ml-0.5 h-5 w-5 fill-current" />
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          const shuffled = [...sortedFavorites].sort(() => Math.random() - 0.5);
                          onPlayPlaylist(shuffled, strings.home.favorites);
                        }}
                        className="noir-icon-button elva-focus-ring"
                        aria-label={strings.playlist.shuffle}
                        data-tip={strings.playlist.shuffle}
                      >
                        <Shuffle className="h-[18px] w-[18px]" strokeWidth={1.75} />
                      </button>
                    </div>
                  )}
                </div>
              </header>
              {favorites.length > 0 ? (
                <div className="flex flex-col gap-0.5">
                  <div className="noir-favorites-toolbar">
                    <label className="noir-favorites-sort">
                      <span className="noir-favorites-sort-label">{strings.library.favoritesSortLabel}</span>
                      <select
                        value={favoritesSort}
                        onChange={(e) => setFavoritesSort(e.target.value as FavoritesSort)}
                        className="noir-favorites-sort-select elva-focus-ring"
                        aria-label={strings.library.favoritesSortLabel}
                      >
                        <option value="recent">{strings.library.favoritesSortRecent}</option>
                        <option value="title">{strings.library.favoritesSortTitle}</option>
                        <option value="artist">{strings.library.favoritesSortArtist}</option>
                      </select>
                    </label>
                    <span className="noir-favorites-date-heading" aria-hidden>
                      {strings.library.favoritesDateAdded}
                    </span>
                  </div>
                  {sortedFavorites.map((track) => (
                    <NoirSongRow
                      key={track.id}
                      track={track}
                      isFavorite
                      favoritedAt={track.favoritedAt}
                      onPlay={() => onSelectSong(track)}
                      onAddToQueue={onAddToQueue}
                      onPlayNext={onPlayNext}
                      onToggleFavorite={onToggleFavorite}
                    />
                  ))}
                </div>
              ) : (
                <div className="py-6">
                  <p className="relative text-[15px] text-[color:var(--noir-text-primary)]">
                    {strings.empty.favoritesTitle}
                  </p>
                  <p className="relative mt-2 max-w-sm text-[14px] text-[color:var(--noir-text-secondary)]">
                    {strings.empty.favoritesDesc}
                  </p>
                </div>
              )}
            </motion.div>
          )}

          {section === 'playlists' && !selectedPlaylist && (
            <motion.div
              key="playlists-grid"
              className="noir-settle-group"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0, transition: { duration: 0 } }}
              transition={withReducedMotion(MOTION.panel)}
            >
              <p className="mb-5 text-[13px] text-[color:var(--noir-text-secondary)]">
                {playlists.length > 0
                  ? strings.playlist.libraryCount(playlists.length)
                  : strings.playlist.libraryEmptyBody}
              </p>
              <div className="noir-collection-grid">
                <button
                  type="button"
                  onClick={() => setSection('favorites')}
                  className="noir-collection-card elva-focus-ring"
                >
                  <NoirFavoritesCover size={168} className="!h-auto !w-full aspect-square" />
                  <span className="min-w-0">
                    <span className="noir-song-title block truncate">{strings.home.favorites}</span>
                    <span className="noir-song-meta mt-0.5 block truncate">
                      {strings.playlist.songCount(favorites.length)}
                    </span>
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => openPlaylist(createPlaylist().id)}
                  className="noir-collection-card elva-focus-ring"
                >
                  <span className="noir-collection-card-new">
                    <Plus className="h-6 w-6" strokeWidth={1.5} />
                  </span>
                  <span className="noir-song-title truncate">{strings.playlist.newPlaylist}</span>
                </button>
                {playlists.map((playlist) => (
                  <button
                    key={playlist.id}
                    type="button"
                    onClick={() => openPlaylist(playlist.id)}
                    className="noir-collection-card elva-focus-ring"
                  >
                    <NoirPlaylistCover
                      playlistId={playlist.id}
                      trackCount={playlist.tracks.length}
                      size={168}
                      className="!h-auto !w-full aspect-square"
                    />
                    <span className="min-w-0">
                      <span className="noir-song-title block truncate">{playlist.name}</span>
                      <span className="noir-song-meta mt-0.5 block truncate">
                        {strings.playlist.songCount(playlist.tracks.length)}
                      </span>
                    </span>
                  </button>
                ))}
              </div>
            </motion.div>
          )}

          {section === 'playlists' && selectedPlaylist && (
            <motion.div
              key={`playlist-${selectedPlaylist.id}`}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, transition: { duration: 0 } }}
              transition={withReducedMotion(MOTION.panel)}
            >
              <NoirUserPlaylistPage
                playlist={selectedPlaylist}
                favorites={favorites}
                onBack={backToRoot}
                onAddToQueue={onAddToQueue}
                onPlayPlaylist={onPlayPlaylist}
                onPlayNext={onPlayNext}
                onToggleFavorite={onToggleFavorite}
              />
            </motion.div>
          )}

          {section === 'history' && (
            <motion.div
              key="history"
              className="noir-settle-group"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0, transition: { duration: 0 } }}
              transition={withReducedMotion(MOTION.panel)}
            >
              <NoirHistoryView
                favorites={favorites}
                recentTracks={recentTracks}
                onPlayPlaylist={onPlayPlaylist}
                onAddToQueue={onAddToQueue}
                onPlayNext={onPlayNext}
                onToggleFavorite={onToggleFavorite}
              />
            </motion.div>
          )}

          {section === 'stats' && (
            <motion.div
              key="stats"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0, transition: { duration: 0 } }}
              transition={withReducedMotion(MOTION.panel)}
            >
              <NoirStatsView favorites={favorites} recentTracks={recentTracks} />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
