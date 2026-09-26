import { ReactNode } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { AppSidebar } from './AppSidebar';
import { CompactPlayerBar } from './CompactPlayerBar';
import { AppTab, ShellPlaybackState } from './types';
import { EASE_PREMIUM, prefersReducedMotion } from '../../utils/motionPresets';

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
  onToggleFavorite?: () => void;
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
  onToggleFavorite,
}: AppShellProps) {
  const reduced = prefersReducedMotion();

  return (
    <div className="noir-shell absolute inset-0 z-10 flex h-full w-full overflow-hidden">
      <AppSidebar
        activeTab={activeTab}
        onTabChange={onTabChange}
        favoritesCount={favoritesCount}
        favoritesActive={favoritesActive}
        selectedPlaylistId={selectedPlaylistId}
        onOpenFavorites={onOpenFavorites}
        onOpenPlaylist={onOpenPlaylist}
      />

      <div className="flex min-w-0 flex-1 flex-col">
        <main className="noir-canvas relative min-h-0 flex-1 overflow-hidden">
          <div className="noir-canvas-grain" aria-hidden />
          <motion.div
            className="relative z-10 h-full w-full"
            animate={{
              opacity: nowPlayingOpen ? 0 : 1,
              scale: nowPlayingOpen && !reduced ? 0.985 : 1,
              y: nowPlayingOpen && !reduced ? -8 : 0,
            }}
            transition={{ duration: reduced ? 0.18 : 0.42, ease: EASE_PREMIUM }}
            style={{ pointerEvents: nowPlayingOpen ? 'none' : 'auto' }}
            aria-hidden={nowPlayingOpen}
          >
            {children}
          </motion.div>

          <AnimatePresence>
            {nowPlayingOpen && nowPlaying != null && (
              <motion.div
                className="absolute inset-0 z-20 overflow-hidden"
                initial={reduced ? { opacity: 0 } : { opacity: 0, y: '22%' }}
                animate={{ opacity: 1, y: 0 }}
                exit={reduced ? { opacity: 0 } : { opacity: 0, y: '16%' }}
                transition={
                  reduced
                    ? { duration: 0.18 }
                    : { type: 'spring', stiffness: 320, damping: 34, mass: 0.85 }
                }
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
            />
          ) : null}
        </AnimatePresence>
      </div>
    </div>
  );
}
