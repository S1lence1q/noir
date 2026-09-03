import { useEffect, useState } from 'react';
import { Compass, Heart, Home, Library, ListMusic, Settings } from 'lucide-react';
import { Playlist } from '../../PlaylistDetailsView';
import { SearchResult } from '../../../types';
import { AppTab } from './types';
import { NoirGraphicAccent } from './noir/NoirGraphicAccent';

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
  onSelectPlaylist?: (playlist: Playlist) => void;
};

export function AppSidebar({
  activeTab,
  onTabChange,
  favoritesCount = 0,
  onSelectPlaylist,
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

  return (
    <aside className="elva-shell-sidebar relative flex h-full w-[228px] shrink-0 flex-col overflow-hidden select-none px-3 py-4">
      <NoirGraphicAccent graphic="plateWave" className="noir-accent-wave-sidebar" />
      <div className="relative z-[1] flex items-center px-2 pb-4 pt-1">
        <span className="text-[12px] font-bold tracking-[0.34em] text-[color:var(--noir-text-primary)]">
          NOIR
        </span>
      </div>

      <nav className="relative z-[1] flex flex-col gap-1" aria-label="Main navigation">
        {PRIMARY_NAV.map(({ id, label, icon: Icon }) => {
          const isActive = activeTab === id;
          return (
            <button
              key={id}
              type="button"
              onClick={() => onTabChange(id)}
              data-active={isActive ? 'true' : 'false'}
              className="noir-nav-item flex h-10 items-center gap-3 px-3 text-left text-[14px] font-medium elva-focus-ring"
              aria-current={isActive ? 'page' : undefined}
            >
              <Icon className="h-[17px] w-[17px] shrink-0" strokeWidth={isActive ? 2.25 : 1.75} />
              <span>{label}</span>
            </button>
          );
        })}
      </nav>

      <div className="relative z-[1] mt-6 flex flex-col gap-1">
        <p className="px-3 pb-1 text-[11px] font-medium text-[color:var(--noir-text-tertiary)]">Quick access</p>
        <button
          type="button"
          onClick={() => onTabChange('myhub')}
          data-active="false"
          className="noir-nav-item flex h-9 items-center gap-3 px-3 text-left text-[13px] font-medium elva-focus-ring"
        >
          <Heart className="h-4 w-4 shrink-0" strokeWidth={1.75} />
          <span className="flex-1">Favorites</span>
          {favoritesCount > 0 && (
            <span className="text-[11px] tabular-nums text-[color:var(--noir-text-tertiary)]">{favoritesCount}</span>
          )}
        </button>
      </div>

      {sidebarPlaylists.length > 0 ? (
        <div className="relative z-[1] mt-5 min-h-0 flex-1 overflow-y-auto scrollbar-none">
          <p className="px-3 pb-1 text-[11px] font-medium text-[color:var(--noir-text-tertiary)]">Playlists</p>
          <div className="flex flex-col gap-0.5">
            {sidebarPlaylists.map((playlist) => (
              <button
                key={playlist.id}
                type="button"
                onClick={() => {
                  const full = playlists.find((p) => p.id === playlist.id);
                  if (!full || !onSelectPlaylist) return;
                  onSelectPlaylist({
                    id: full.id,
                    name: full.name,
                    description: '',
                    tracks: full.tracks,
                    thumbnail: full.tracks[0]?.thumbnail ?? '',
                    accent: 'wine',
                  });
                }}
                data-active="false"
                className="noir-nav-item flex h-9 items-center gap-2.5 px-3 text-left text-[13px] font-medium elva-focus-ring"
              >
                <ListMusic className="h-4 w-4 shrink-0 text-[color:var(--noir-text-tertiary)]" strokeWidth={1.75} />
                <span className="truncate">{playlist.name}</span>
              </button>
            ))}
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
          className="noir-nav-item flex h-10 w-full items-center gap-3 px-3 text-left text-[14px] font-medium elva-focus-ring"
        >
          <Settings className="h-[17px] w-[17px] shrink-0" strokeWidth={activeTab === 'settings' ? 2.25 : 1.75} />
          <span>Settings</span>
        </button>
      </div>
    </aside>
  );
}
