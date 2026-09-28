import { useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { Compass, Home, Library, Plus, Settings } from 'lucide-react';
import { SearchResult } from '../../types';
import { MOTION, withReducedMotion } from '../../utils/motionPresets';
import { AppTab } from './types';
import { NoirMark } from './noir/NoirMark';
import { NoirDitherCover } from './noir/NoirDitherCover';
import { NoirFavoritesCover } from './noir/NoirFavoritesCover';
import { worldForCollection } from '../../utils/ditherCover';
import {
  createPlaylist,
  decodePlaylistTrack,
  PLAYLIST_TRACK_DRAG_MIME,
  usePlaylists,
} from '../../utils/playlistStore';
import { strings } from '../../constants/strings';

const PRIMARY_NAV: { id: AppTab; label: string; icon: typeof Home }[] = [
  { id: 'search', label: 'Home', icon: Home },
  { id: 'discover', label: 'Discover', icon: Compass },
  { id: 'myhub', label: 'Library', icon: Library },
];

type AppSidebarProps = {
  activeTab: AppTab;
  onTabChange: (tab: AppTab) => void;
  favoritesCount?: number;
  favoritesActive?: boolean;
  selectedPlaylistId?: string | null;
  onOpenFavorites?: () => void;
  onOpenPlaylist?: (playlistId: string) => void;
  onDropSongToPlaylist?: (playlistId: string, track: SearchResult) => void;
};

export function AppSidebar({
  activeTab,
  onTabChange,
  favoritesCount = 0,
  favoritesActive = false,
  selectedPlaylistId = null,
  onOpenFavorites,
  onOpenPlaylist,
  onDropSongToPlaylist,
}: AppSidebarProps) {
  const playlists = usePlaylists();
  const sidebarPlaylists = playlists.slice(0, 8);
  const sidebarPlaylistActive = sidebarPlaylists.some((p) => p.id === selectedPlaylistId);
  const [dragOverPlaylistId, setDragOverPlaylistId] = useState<string | null>(null);

  return (
    <aside className="elva-shell-sidebar relative flex h-full w-[248px] shrink-0 flex-col overflow-hidden select-none px-3 py-5">
      <div className="noir-sidebar-brand-row">
        <div className="noir-sidebar-wordmark">
          <span className="text-[13px] font-bold tracking-[0.34em]">NOIR</span>
          <NoirMark size={11} className="text-[color:var(--noir-text-primary)]" />
        </div>
      </div>

      <nav className="relative z-[1] flex flex-col gap-1" aria-label="Main navigation">
        {PRIMARY_NAV.map(({ id, label, icon: Icon }) => {
          const isActive =
            activeTab === id && !sidebarPlaylistActive && !(id === 'myhub' && favoritesActive);
          return (
            <button
              key={id}
              type="button"
              onClick={() => onTabChange(id)}
              data-active={isActive ? 'true' : 'false'}
              className="noir-nav-item flex h-11 items-center gap-3 px-3 text-left text-[15px] font-medium elva-focus-ring"
              aria-current={isActive ? 'page' : undefined}
            >
              <Icon className="h-[18px] w-[18px] shrink-0" strokeWidth={isActive ? 2.25 : 1.75} />
              <span>{label}</span>
            </button>
          );
        })}
      </nav>

      <div className="relative z-[1] mt-7 flex flex-col gap-1">
        <p className="px-3 pb-1.5 text-[12px] font-medium text-[color:var(--noir-text-tertiary)]">Quick access</p>
        <button
          type="button"
          onClick={() => onOpenFavorites?.()}
          data-active={favoritesActive ? 'true' : 'false'}
          className="noir-nav-item flex h-10 items-center gap-3 px-3 text-left text-[14px] font-medium elva-focus-ring"
          aria-current={favoritesActive ? 'page' : undefined}
        >
          <NoirFavoritesCover size={22} radius={5} />
          <span className="flex-1">Favorites</span>
          {favoritesCount > 0 && (
            <span className="text-[12px] tabular-nums text-[color:var(--noir-text-tertiary)]">{favoritesCount}</span>
          )}
        </button>
      </div>

      <div className="relative z-[1] mt-6 min-h-0 flex-1 overflow-y-auto scrollbar-none">
        <div className="flex items-center justify-between pb-1.5 pl-3 pr-1.5">
          <p className="text-[12px] font-medium text-[color:var(--noir-text-tertiary)]">Playlists</p>
          <button
            type="button"
            onClick={() => onOpenPlaylist?.(createPlaylist().id)}
            className="flex h-6 w-6 items-center justify-center rounded-md text-[color:var(--noir-text-tertiary)] transition-colors hover:bg-white/[0.06] hover:text-white elva-focus-ring"
            aria-label={strings.playlist.newPlaylist}
            title={strings.playlist.newPlaylist}
          >
            <Plus className="h-3.5 w-3.5" strokeWidth={2} />
          </button>
        </div>
        <div className="flex flex-col">
          <AnimatePresence initial={false}>
            {sidebarPlaylists.map((playlist) => {
              const isActive = selectedPlaylistId === playlist.id;
              return (
                <motion.div
                  key={playlist.id}
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 42, opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={withReducedMotion(MOTION.panel)}
                  className="overflow-hidden"
                >
                  <button
                    type="button"
                    onClick={() => onOpenPlaylist?.(playlist.id)}
                    onDragOver={(event) => {
                      if (!event.dataTransfer.types.includes(PLAYLIST_TRACK_DRAG_MIME)) return;
                      event.preventDefault();
                      event.dataTransfer.dropEffect = 'copy';
                      setDragOverPlaylistId(playlist.id);
                    }}
                    onDragLeave={(event) => {
                      if (!event.currentTarget.contains(event.relatedTarget as Node)) {
                        setDragOverPlaylistId(null);
                      }
                    }}
                    onDrop={(event) => {
                      event.preventDefault();
                      const track = decodePlaylistTrack(
                        event.dataTransfer.getData(PLAYLIST_TRACK_DRAG_MIME)
                      );
                      setDragOverPlaylistId(null);
                      if (track) onDropSongToPlaylist?.(playlist.id, track);
                    }}
                    data-active={isActive ? 'true' : 'false'}
                    data-drop-target={dragOverPlaylistId === playlist.id ? 'true' : 'false'}
                    className={`noir-nav-item flex h-10 w-full items-center gap-2.5 px-3 text-left text-[14px] font-medium elva-focus-ring ${
                      dragOverPlaylistId === playlist.id ? 'bg-white/[0.08] text-white' : ''
                    }`}
                    aria-current={isActive ? 'page' : undefined}
                  >
                    <motion.span
                      initial={{ scale: 0.3, rotate: -20 }}
                      animate={{ scale: 1, rotate: 0 }}
                      transition={{ type: 'spring', stiffness: 420, damping: 18, delay: 0.08 }}
                      className="flex"
                    >
                      <NoirDitherCover
                        source={playlist.tracks[0]?.thumbnail}
                        world={worldForCollection(playlist.id)}
                        seed={playlist.id}
                        size={22}
                        radius={5}
                      />
                    </motion.span>
                    <span className="truncate">{playlist.name}</span>
                  </button>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      </div>

      <div className="relative z-[1] mt-auto pt-4">
        <button
          type="button"
          onClick={() => onTabChange('settings')}
          data-active={activeTab === 'settings' ? 'true' : 'false'}
          className="noir-nav-item flex h-11 w-full items-center gap-3 px-3 text-left text-[15px] font-medium elva-focus-ring"
        >
          <Settings className="h-[18px] w-[18px] shrink-0" strokeWidth={activeTab === 'settings' ? 2.25 : 1.75} />
          <span>Settings</span>
        </button>
      </div>
    </aside>
  );
}
