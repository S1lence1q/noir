import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { Heart, ListMusic, Plus } from 'lucide-react';
import { SearchResult } from '../../../types';
import { strings } from '../../../constants/strings';
import { NoirSongRow } from './NoirSongRow';
import { NoirMark } from './NoirMark';
import { NoirDitherCover } from './NoirDitherCover';
import { NoirUserPlaylistPage } from './NoirUserPlaylistPage';
import { worldForCollection } from '../../../utils/ditherCover';
import { createPlaylist, usePlaylists } from '../../../utils/playlistStore';
import { MOTION, withReducedMotion } from '../../../utils/motionPresets';

type LibrarySection = 'favorites' | 'playlists';

export type LibraryFocus = {
  section: LibrarySection;
  playlistId?: string | null;
  requestId: number;
};

export type NoirLibraryViewProps = {
  favorites: SearchResult[];
  focus?: LibraryFocus | null;
  onPlaylistOpenChange?: (playlistId: string | null) => void;
  onToggleFavorite: (song: SearchResult) => void;
  onSelectSong: (song: SearchResult) => void;
  onAddToQueue: (song: SearchResult) => void;
  onPlayPlaylist: (tracks: SearchResult[], label?: string, startIndex?: number) => void;
  onPlayNext?: (song: SearchResult) => void;
};

const SECTIONS: { id: LibrarySection; label: string; icon: typeof Heart }[] = [
  { id: 'favorites', label: 'Favorites', icon: Heart },
  { id: 'playlists', label: 'Playlists', icon: ListMusic },
];

export function NoirLibraryView({
  favorites,
  focus = null,
  onPlaylistOpenChange,
  onToggleFavorite,
  onSelectSong,
  onAddToQueue,
  onPlayPlaylist,
  onPlayNext,
}: NoirLibraryViewProps) {
  const [section, setSection] = useState<LibrarySection>(focus?.section ?? 'favorites');
  const playlists = usePlaylists();
  const [selectedPlaylistId, setSelectedPlaylistId] = useState<string | null>(
    focus?.playlistId ?? null
  );

  useEffect(() => {
    if (!focus) return;
    setSection(focus.section);
    setSelectedPlaylistId(focus.playlistId ?? null);
  }, [focus?.requestId]);

  useEffect(() => {
    onPlaylistOpenChange?.(selectedPlaylistId);
  }, [selectedPlaylistId, onPlaylistOpenChange]);

  const openPlaylist = (id: string | null) => {
    setSelectedPlaylistId(id);
  };

  const selectedPlaylist = playlists.find((p) => p.id === selectedPlaylistId) ?? null;

  return (
    <div className="flex h-full min-h-0 flex-col">
      {!selectedPlaylist && (
        <header className="pb-5">
          <h1 className="noir-page-title">Library</h1>
          <p className="mt-2 text-[16px] text-[color:var(--noir-text-secondary)]">Favorites and playlists</p>
        </header>
      )}
      <div className={`flex gap-1 px-1 pb-6 ${selectedPlaylist ? 'hidden' : ''}`}>
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
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0, transition: { duration: 0 } }}
              transition={{ duration: 0.18 }}
            >
              {favorites.length > 0 ? (
                <div className="flex flex-col gap-0.5">
                  {favorites.map((track) => (
                    <NoirSongRow
                      key={track.id}
                      track={track}
                      isFavorite
                      onPlay={() => onSelectSong(track)}
                      onAddToQueue={onAddToQueue}
                      onPlayNext={onPlayNext}
                      onToggleFavorite={onToggleFavorite}
                    />
                  ))}
                </div>
              ) : (
                <div className="relative py-16">
                  <NoirMark
                    size={120}
                    variant="spray"
                    className="noir-library-empty-mark"
                    color="var(--noir-text-tertiary)"
                  />
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
                    <NoirDitherCover
                      source={playlist.tracks[0]?.thumbnail}
                      world={worldForCollection(playlist.id)}
                      seed={playlist.id}
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
                onBack={() => openPlaylist(null)}
                onAddToQueue={onAddToQueue}
                onPlayPlaylist={onPlayPlaylist}
                onPlayNext={onPlayNext}
                onToggleFavorite={onToggleFavorite}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
