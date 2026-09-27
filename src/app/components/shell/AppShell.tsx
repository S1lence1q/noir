import { ReactNode } from 'react';
import { AnimatePresence, LayoutGroup, motion } from 'motion/react';
import { AppSidebar } from './AppSidebar';
import { CompactPlayerBar } from './CompactPlayerBar';
import { AppTab, ShellPlaybackState } from './types';
import { EASE_PREMIUM, prefersReducedMotion } from '../../utils/motionPresets';
import type { SearchResult } from '../../types';

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
  onOpenQueue?: () => void;
  showCompactPlayer: boolean;
  nowPlayingOpen?: boolean;
  nowPlaying?: ReactNode;
  queueCount?: number;
  favoritesCount?: number;
  favoritesActive?: boolean;
  selectedPlaylistId?: string | null;
  isFavorite?: boolean;
  onOpenFavorites?: () => void;
  onOpenPlaylist?: (playlistId: string) => void;
  onDropSongToPlaylist?: (playlistId: string, track: SearchResult) => void;
  onToggleFavorite?: () => void;
  onStartRadio?: () => void;
  onOpenArtist?: () => void;
};

export function AppShell({
  activeTab,
  onTabChange,
  children,
  hasActiveSong,
  song,
  playback,
  onExpandPlayer,
  onOpenQueue,
  showCompactPlayer,
  nowPlayingOpen = false,
  nowPlaying,
  queueCount = 0,
  favoritesCount,
  favoritesActive = false,
  selectedPlaylistId = null,
  isFavorite = false,
  onOpenFavorites,
  onOpenPlaylist,
  onDropSongToPlaylist,
  onToggleFavorite,
  onStartRadio,
  onOpenArtist,
}: AppShellProps) {
  const reduced = prefersReducedMotion();

  return (
    <LayoutGroup id="noir-shell">
    <div className="noir-shell absolute inset-0 z-10 flex h-full w-full overflow-hidden">
      <AppSidebar
        activeTab={activeTab}
        onTabChange={onTabChange}
        favoritesCount={favoritesCount}
        favoritesActive={favoritesActive}
        selectedPlaylistId={selectedPlaylistId}
        onOpenFavorites={onOpenFavorites}
        onOpenPlaylist={onOpenPlaylist}
        onDropSongToPlaylist={onDropSongToPlaylist}
      />

      <div className="flex min-w-0 flex-1 flex-col">
        {/* overflow-visible: the Now Playing cover flies up from the bar and must not be clipped at this edge. */}
        <main className="noir-canvas relative min-h-0 flex-1 overflow-visible">
          <div className="noir-canvas-grain" aria-hidden />
          <motion.div
            className="relative z-10 h-full w-full overflow-hidden"
            animate={{
              opacity: nowPlayingOpen ? 0 : 1,
              scale: nowPlayingOpen && !reduced ? 0.985 : 1,
            }}
            transition={{ duration: reduced ? 0.18 : 0.28, ease: EASE_PREMIUM }}
            style={{ pointerEvents: nowPlayingOpen ? 'none' : 'auto' }}
            aria-hidden={nowPlayingOpen}
          >
            {children}
          </motion.div>

          {/* No transform / opacity fade on this layer during exit — that kills the np-cover flight. */}
          <AnimatePresence>
            {nowPlayingOpen && nowPlaying != null && (
              <motion.div
                className="absolute inset-0 z-20"
                initial={{ opacity: 1 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 1, transition: { duration: reduced ? 0.2 : 0.42 } }}
              >
                {nowPlaying}
              </motion.div>
            )}
          </AnimatePresence>
        </main>

        <AnimatePresence>
          {showCompactPlayer && hasActiveSong && song ? (
            <CompactPlayerBar
              key="compact-player"
              song={song}
              playback={playback}
              expanded={nowPlayingOpen}
              queueCount={queueCount}
              isFavorite={isFavorite}
              onExpand={onExpandPlayer}
              onOpenQueue={onOpenQueue}
              onToggleFavorite={onToggleFavorite}
              onStartRadio={onStartRadio}
              onOpenArtist={onOpenArtist}
            />
          ) : null}
        </AnimatePresence>
      </div>
    </div>
    </LayoutGroup>
  );
}
