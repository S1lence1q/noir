import { ReactNode } from 'react';
import { AppSidebar } from './AppSidebar';
import { CompactPlayerBar } from './CompactPlayerBar';
import { Playlist } from '../PlaylistDetailsView';
import { AppTab, ShellPlaybackState } from './types';

type AppShellProps = {
  activeTab: AppTab;
  onTabChange: (tab: AppTab) => void;
  children: ReactNode;
  hasActiveSong: boolean;
  song?: {
    title: string;
    artist: string;
    artworkUrl: string;
  };
  playback: ShellPlaybackState;
  onExpandPlayer: () => void;
  showCompactPlayer: boolean;
  favoritesCount?: number;
  onSelectPlaylist?: (playlist: Playlist) => void;
};

export function AppShell({
  activeTab,
  onTabChange,
  children,
  hasActiveSong,
  song,
  playback,
  onExpandPlayer,
  showCompactPlayer,
  favoritesCount,
  onSelectPlaylist,
}: AppShellProps) {
  return (
    <div className="noir-shell absolute inset-0 z-10 flex h-full w-full overflow-hidden bg-black">
      <AppSidebar
        activeTab={activeTab}
        onTabChange={onTabChange}
        favoritesCount={favoritesCount}
        onSelectPlaylist={onSelectPlaylist}
      />

      <div className="flex min-w-0 flex-1 flex-col">
        <main className="noir-canvas relative min-h-0 flex-1 overflow-hidden">
          <div className="noir-canvas-grain" aria-hidden />
          <div className="relative z-10 h-full w-full">{children}</div>
        </main>

        <CompactPlayerBar
          visible={showCompactPlayer && hasActiveSong && !!song}
          song={song ?? { title: '', artist: '', artworkUrl: '' }}
          playback={playback}
          onExpand={onExpandPlayer}
        />
      </div>
    </div>
  );
}
