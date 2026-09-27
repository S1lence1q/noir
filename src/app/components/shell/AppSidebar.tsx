import { useEffect, useState } from 'react';
import { Compass, Heart, Home, Library, ListMusic, Settings } from 'lucide-react';
import { SearchResult } from '../../../types';
import { AppTab } from './types';
import { NoirGraphicAccent } from './noir/NoirGraphicAccent';
import { NoirMark } from './noir/NoirMark';

const PRIMARY_NAV: { id: AppTab; label: string; icon: typeof Home }[] = [
  { id: 'search', label: 'Home', icon: Home },
  { id: 'discover', label: 'Discover', icon: Compass },
  { id: 'myhub', label: 'Library', icon: Library },
];

type SidebarPlaylist = {
  id: string;
  name: string;
  tracks: SearchResult[];
};

type AppSidebarProps = {
  activeTab: AppTab;
  onTabChange: (tab: AppTab) => void;
  favoritesCount?: number;
  favoritesActive?: boolean;
  selectedPlaylistId?: string | null;
  onOpenFavorites?: () => void;
  onOpenPlaylist?: (playlistId: string) => void;
};

export function AppSidebar({
  activeTab,
  onTabChange,
  favoritesCount = 0,
  favoritesActive = false,
  selectedPlaylistId = null,
  onOpenFavorites,
  onOpenPlaylist,
}: AppSidebarProps) {
  const [playlists, setPlaylists] = useState<SidebarPlaylist[]>(() => {
    try {
      const stored = localStorage.getItem('elva_playlists');
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });

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

  const sidebarPlaylists = playlists.slice(0, 5);
  const sidebarPlaylistActive = sidebarPlaylists.some((p) => p.id === selectedPlaylistId);

  return (
    <aside className="elva-shell-sidebar relative flex h-full w-[248px] shrink-0 flex-col overflow-hidden select-none px-3 py-5">
      <NoirGraphicAccent graphic="plateWave" className="noir-accent-wave-sidebar" />
      <div className="relative z-[1] flex items-center gap-1 px-2 pb-5 pt-1">
        <span className="text-[13px] font-bold tracking-[0.34em] text-[color:var(--noir-text-primary)]">
          NOIR
        </span>
        <NoirMark size={11} className="text-[color:var(--noir-text-primary)]" />
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
          <Heart className="h-[18px] w-[18px] shrink-0" strokeWidth={favoritesActive ? 2.25 : 1.75} />
          <span className="flex-1">Favorites</span>
          {favoritesCount > 0 && (
            <span className="text-[12px] tabular-nums text-[color:var(--noir-text-tertiary)]">{favoritesCount}</span>
          )}
        </button>
      </div>

      {sidebarPlaylists.length > 0 ? (
        <div className="relative z-[1] mt-6 min-h-0 flex-1 overflow-y-auto scrollbar-none">
          <p className="px-3 pb-1.5 text-[12px] font-medium text-[color:var(--noir-text-tertiary)]">Playlists</p>
          <div className="flex flex-col gap-0.5">
            {sidebarPlaylists.map((playlist) => {
              const isActive = selectedPlaylistId === playlist.id;
              return (
                <button
                  key={playlist.id}
                  type="button"
                  onClick={() => onOpenPlaylist?.(playlist.id)}
                  data-active={isActive ? 'true' : 'false'}
                  className="noir-nav-item flex h-10 items-center gap-2.5 px-3 text-left text-[14px] font-medium elva-focus-ring"
                  aria-current={isActive ? 'page' : undefined}
                >
                  <ListMusic
                    className={`h-[18px] w-[18px] shrink-0 ${
                      isActive ? '' : 'text-[color:var(--noir-text-tertiary)]'
                    }`}
                    strokeWidth={isActive ? 2.25 : 1.75}
                  />
                  <span className="truncate">{playlist.name}</span>
                </button>
              );
            })}
          </div>
        </div>
      ) : (
        <div className="relative z-[1] flex-1" />
      )}

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
