import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { ChevronLeft, Heart, ListMusic, Play, Plus } from 'lucide-react';
import { SearchResult } from '../../../types';
import { strings } from '../../../constants/strings';
import { showMiniHUD } from '../../../utils/hudUtils';
import { NoirSongRow } from './NoirSongRow';
import { NoirGraphicAccent } from './NoirGraphicAccent';

type LibrarySection = 'favorites' | 'playlists';

type Playlist = {
  id: string;
  name: string;
  color: string;
  tracks: SearchResult[];
};

export type NoirLibraryViewProps = {
  favorites: SearchResult[];
  onToggleFavorite: (song: SearchResult) => void;
  onSelectSong: (song: SearchResult) => void;
  onAddToQueue: (song: SearchResult) => void;
  onPlayPlaylist: (tracks: SearchResult[], label?: string) => void;
  onPlayNext?: (song: SearchResult) => void;
};

const SECTIONS: { id: LibrarySection; label: string; icon: typeof Heart }[] = [
  { id: 'favorites', label: 'Favorites', icon: Heart },
  { id: 'playlists', label: 'Playlists', icon: ListMusic },
];

export function NoirLibraryView({
  favorites,
  onToggleFavorite,
  onSelectSong,
  onAddToQueue,
  onPlayPlaylist,
  onPlayNext,
}: NoirLibraryViewProps) {
  const [section, setSection] = useState<LibrarySection>('favorites');
  const [playlists, setPlaylists] = useState<Playlist[]>(() => {
    try {
      const stored = localStorage.getItem('elva_playlists');
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });
  const [selectedPlaylistId, setSelectedPlaylistId] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [newPlaylistName, setNewPlaylistName] = useState('');

  useEffect(() => {
    const sync = () => {
      try {
        const stored = localStorage.getItem('elva_playlists');
        if (stored) setPlaylists(JSON.parse(stored));
      } catch {
        /* ignore */
      }
    };
    window.addEventListener('elva-playlists-updated', sync);
    window.addEventListener('storage', sync);
    return () => {
      window.removeEventListener('elva-playlists-updated', sync);
      window.removeEventListener('storage', sync);
    };
  }, []);

  const selectedPlaylist = playlists.find((p) => p.id === selectedPlaylistId) ?? null;

  const persistPlaylists = (next: Playlist[]) => {
    setPlaylists(next);
    localStorage.setItem('elva_playlists', JSON.stringify(next));
    window.dispatchEvent(new CustomEvent('elva-playlists-updated'));
  };

  const handleCreatePlaylist = () => {
    const name = newPlaylistName.trim();
    if (!name) return;
    const next: Playlist[] = [
      ...playlists,
      { id: Date.now().toString(), name, color: 'neutral', tracks: [] },
    ];
    persistPlaylists(next);
    setNewPlaylistName('');
    setIsCreating(false);
    showMiniHUD('Playlist created');
  };

  const handleDeletePlaylist = (id: string) => {
    persistPlaylists(playlists.filter((p) => p.id !== id));
    if (selectedPlaylistId === id) setSelectedPlaylistId(null);
    showMiniHUD('Playlist deleted', 'info');
  };

  const handlePlayPlaylist = (playlist: Playlist) => {
    if (playlist.tracks.length === 0) {
      showMiniHUD('Playlist is empty', 'error');
      return;
    }
    onPlayPlaylist(playlist.tracks, playlist.name);
  };

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex gap-1 px-1 pb-6">
        {SECTIONS.map(({ id, label, icon: Icon }) => {
          const isActive = section === id;
          return (
            <button
              key={id}
              type="button"
              onClick={() => {
                setSection(id);
                setSelectedPlaylistId(null);
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
              exit={{ opacity: 0 }}
              transition={{ duration: 0.18 }}
            >
              {favorites.length > 0 ? (
                <div className="flex flex-col gap-0.5">
                  {favorites.map((track) => (
                    <div key={track.id} className="group relative">
                      <NoirSongRow
                        track={track}
                        onPlay={() => onSelectSong(track)}
                        onAddToQueue={onAddToQueue}
                        onPlayNext={onPlayNext}
                      />
                      <button
                        type="button"
                        onClick={() => onToggleFavorite(track)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full p-2 text-[color:var(--noir-text-tertiary)] opacity-0 transition-opacity hover:text-white group-hover:opacity-100"
                        aria-label="Remove from favorites"
                      >
                        <Heart className="h-3.5 w-3.5 fill-current text-red-400/80" />
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="relative py-16">
                  <NoirGraphicAccent graphic="halftoneCloud" className="noir-accent-halftone-empty" />
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
              exit={{ opacity: 0 }}
              transition={{ duration: 0.18 }}
            >
              <div className="mb-4 flex items-center justify-between">
                <p className="text-[14px] text-[color:var(--noir-text-secondary)]">
                  {playlists.length} playlist{playlists.length === 1 ? '' : 's'}
                </p>
                <button
                  type="button"
                  onClick={() => setIsCreating(true)}
                  className="noir-nav-item flex h-8 items-center gap-1.5 px-3 text-[13px] font-medium elva-focus-ring"
                  data-active="false"
                >
                  <Plus className="h-3.5 w-3.5" />
                  New
                </button>
              </div>

              {isCreating && (
                <div className="noir-search-field-wrap mb-4 max-w-md">
                  <input
                    type="text"
                    value={newPlaylistName}
                    onChange={(e) => setNewPlaylistName(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleCreatePlaylist();
                      if (e.key === 'Escape') {
                        setIsCreating(false);
                        setNewPlaylistName('');
                      }
                    }}
                    placeholder="Playlist name"
                    autoFocus
                    className="noir-search-field h-full min-w-0 flex-1 text-[14px] text-[color:var(--noir-text-primary)] placeholder:text-[color:var(--noir-text-tertiary)]"
                  />
                  <button
                    type="button"
                    onClick={handleCreatePlaylist}
                    className="text-[13px] font-medium text-[color:var(--noir-text-primary)]"
                  >
                    Create
                  </button>
                </div>
              )}

              {playlists.length > 0 ? (
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  {playlists.map((playlist) => {
                    const thumb = playlist.tracks[0]?.thumbnail;
                    return (
                      <button
                        key={playlist.id}
                        type="button"
                        onClick={() => setSelectedPlaylistId(playlist.id)}
                        className="noir-track-row flex items-center gap-3 p-3 text-left elva-focus-ring"
                      >
                        <div className="noir-art flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden bg-[color:var(--noir-elevated)]">
                          {thumb ? (
                            <img src={thumb} alt="" className="h-full w-full object-cover" />
                          ) : (
                            <ListMusic className="h-5 w-5 text-[color:var(--noir-text-tertiary)]" />
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-[14px] font-medium text-[color:var(--noir-text-primary)]">
                            {playlist.name}
                          </p>
                          <p className="mt-0.5 text-[12px] text-[color:var(--noir-text-tertiary)]">
                            {playlist.tracks.length} tracks
                          </p>
                        </div>
                      </button>
                    );
                  })}
                </div>
              ) : (
                <div className="py-16">
                  <p className="text-[15px] text-[color:var(--noir-text-primary)]">
                    {strings.empty.noPlaylistsTitle}
                  </p>
                  <p className="mt-2 max-w-sm text-[14px] text-[color:var(--noir-text-secondary)]">
                    {strings.empty.noPlaylistsDesc}
                  </p>
                </div>
              )}
            </motion.div>
          )}

          {section === 'playlists' && selectedPlaylist && (
            <motion.div
              key={`playlist-${selectedPlaylist.id}`}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.18 }}
            >
              <div className="mb-6 flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setSelectedPlaylistId(null)}
                  className="noir-nav-item flex h-8 w-8 items-center justify-center elva-focus-ring"
                  data-active="false"
                  aria-label="Back"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <div className="min-w-0 flex-1">
                  <h2 className="truncate text-[17px] font-semibold text-[color:var(--noir-text-primary)]">
                    {selectedPlaylist.name}
                  </h2>
                  <p className="text-[12px] text-[color:var(--noir-text-tertiary)]">
                    {selectedPlaylist.tracks.length} tracks
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => handlePlayPlaylist(selectedPlaylist)}
                  className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3.5 py-1.5 text-[12px] font-medium text-white hover:bg-white/15 elva-focus-ring"
                >
                  <Play className="h-3 w-3 fill-current" />
                  Play all
                </button>
                <button
                  type="button"
                  onClick={() => handleDeletePlaylist(selectedPlaylist.id)}
                  className="text-[12px] text-[color:var(--noir-text-tertiary)] hover:text-[color:var(--noir-text-secondary)]"
                >
                  Delete
                </button>
              </div>

              {selectedPlaylist.tracks.length > 0 ? (
                <div className="flex flex-col gap-0.5">
                  {selectedPlaylist.tracks.map((track) => (
                    <NoirSongRow
                      key={track.id}
                      track={track}
                      onPlay={() => onSelectSong(track)}
                      onAddToQueue={onAddToQueue}
                      onPlayNext={onPlayNext}
                    />
                  ))}
                </div>
              ) : (
                <p className="py-12 text-[14px] text-[color:var(--noir-text-secondary)]">
                  {strings.empty.playlistEmptyDesc}
                </p>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
