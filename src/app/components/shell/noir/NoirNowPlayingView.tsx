import { AnimatePresence, motion } from 'motion/react';
import { ChevronUp, Compass, Heart, Plus, X } from 'lucide-react';
import { SearchResult } from '../../../types';
import { getPlaybackSongKey } from '../../../utils/playbackSongKey';
import { EASE_PREMIUM, prefersReducedMotion } from '../../../utils/motionPresets';

type NowPlayingSong = {
  title: string;
  artist: string;
  artworkUrl: string;
  videoId?: string;
  audioUrl?: string;
};

type NoirNowPlayingViewProps = {
  song: NowPlayingSong;
  queue: SearchResult[];
  colors?: { primary: string; secondary: string; accent: string } | null;
  isFavorite?: boolean;
  onToggleFavorite?: () => void;
  favoriteTracks?: SearchResult[];
  quickAddTracks?: SearchResult[];
  onAddToQueue?: (track: SearchResult) => void;
  onOpenDiscover?: () => void;
  onSelectFromQueue: (id: string) => void;
  onRemoveFromQueue?: (id: string) => void;
  onMoveInQueue?: (id: string, direction: -1 | 1) => void;
};

const sheetEase = EASE_PREMIUM;

export function NoirNowPlayingView({
  song,
  queue,
  colors,
  isFavorite = false,
  onToggleFavorite,
  favoriteTracks = [],
  quickAddTracks = [],
  onAddToQueue,
  onOpenDiscover,
  onSelectFromQueue,
  onRemoveFromQueue,
  onMoveInQueue,
}: NoirNowPlayingViewProps) {
  const reduced = prefersReducedMotion();
  const currentKey = getPlaybackSongKey(song);
  const currentIndex = currentKey
    ? queue.findIndex((item) => getPlaybackSongKey(item) === currentKey)
    : -1;
  const upNext =
    currentIndex >= 0
      ? queue.slice(currentIndex + 1)
      : queue.filter((item) => getPlaybackSongKey(item) !== currentKey);
  const songKey = currentKey ?? `${song.title}::${song.artist}`;
  const favoriteAdds = favoriteTracks.filter((track) => getPlaybackSongKey(track) !== currentKey);
  const recentAdds = quickAddTracks.filter((track) => getPlaybackSongKey(track) !== currentKey);
  const quickAddSource = favoriteAdds.length > 0 ? 'Favorites' : recentAdds.length > 0 ? 'Recently played' : null;
  const quickAdds = (favoriteAdds.length > 0 ? favoriteAdds : recentAdds).slice(0, 3);

  return (
    <div className="noir-now-playing">
      <div className="noir-now-playing-atmosphere" aria-hidden>
        <AnimatePresence mode="sync" initial={false}>
          <motion.img
            key={song.artworkUrl}
            src={song.artworkUrl}
            alt=""
            className="noir-now-playing-atmosphere-img"
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.28 }}
            exit={{ opacity: 0 }}
            transition={{ duration: reduced ? 0.2 : 0.55, ease: sheetEase }}
          />
        </AnimatePresence>
        <motion.div
          key={songKey + '-wash'}
          className="noir-now-playing-atmosphere-wash"
          initial={{ opacity: 0 }}
          animate={{ opacity: 0.55 }}
          transition={{ duration: reduced ? 0.2 : 0.5, ease: sheetEase }}
          style={
            colors
              ? {
                  background: `radial-gradient(ellipse 80% 70% at 28% 58%, ${colors.primary} 0%, transparent 62%), radial-gradient(ellipse 50% 50% at 70% 20%, ${colors.secondary} 0%, transparent 55%)`,
                }
              : undefined
          }
        />
      </div>

      <div className="noir-now-playing-stage">
        <div className="noir-now-playing-art-slot">
          <AnimatePresence mode="sync" initial={false}>
            <motion.img
              key={song.artworkUrl}
              src={song.artworkUrl}
              alt=""
              className="noir-now-playing-art"
              initial={reduced ? { opacity: 0 } : { opacity: 0, scale: 0.94, y: 12 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={reduced ? { opacity: 0 } : { opacity: 0, scale: 1.03, y: -8 }}
              transition={
                reduced
                  ? { duration: 0.2 }
                  : { type: 'spring', stiffness: 280, damping: 28, mass: 0.85 }
              }
            />
          </AnimatePresence>
        </div>
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={songKey}
            className="min-w-0"
            initial={{ opacity: 0, y: reduced ? 0 : 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: reduced ? 0 : -8 }}
            transition={{ duration: reduced ? 0.15 : 0.32, ease: sheetEase }}
          >
            <h1 className="noir-now-playing-title">{song.title}</h1>
            <div className="mt-2 flex items-center gap-3">
              <p className="noir-now-playing-artist !mt-0">{song.artist}</p>
              {onToggleFavorite && (
                <button
                  type="button"
                  onClick={onToggleFavorite}
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-[color:var(--noir-text-secondary)] hover:bg-white/[0.08] hover:text-white elva-focus-ring"
                  aria-label={isFavorite ? 'Remove from favorites' : 'Add to favorites'}
                  title={isFavorite ? 'Remove from favorites' : 'Add to favorites'}
                >
                  <Heart
                    className={`h-4 w-4 ${isFavorite ? 'fill-current text-red-400' : ''}`}
                    strokeWidth={isFavorite ? 0 : 1.75}
                  />
                </button>
              )}
            </div>
          </motion.div>
        </AnimatePresence>
      </div>

      <aside
        className="noir-now-playing-queue"
        aria-label={upNext.length > 0 ? 'Next up' : 'Queue suggestions'}
      >
        {upNext.length === 0 ? (
          <div className="noir-now-playing-queue-empty px-2 pt-1">
            <p className="text-[17px] font-semibold leading-tight tracking-[-0.02em] text-[color:var(--noir-text-primary)]">
              What should play next?
            </p>
            <p className="mt-2 max-w-[190px] text-[12px] leading-[1.45] text-[color:var(--noir-text-tertiary)]">
              {quickAddSource === 'Favorites'
                ? 'Add a favorite to keep it going.'
                : quickAddSource === 'Recently played'
                  ? 'Pick something from your recent listens.'
                  : 'Browse Discover to find something for the queue.'}
            </p>
            {onAddToQueue && quickAdds.length > 0 && quickAddSource && (
              <div className="mt-4">
                <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-[color:var(--noir-text-tertiary)]">
                  {quickAddSource}
                </p>
                <div className="grid grid-cols-3 gap-2">
                  {quickAdds.map((track) => (
                    <button
                      type="button"
                      key={track.id}
                      onClick={() => onAddToQueue(track)}
                      className="group relative aspect-square overflow-hidden rounded-[var(--noir-radius-sm)] bg-[color:var(--noir-elevated)] text-left elva-focus-ring"
                      title={`Add ${track.title} to queue`}
                    >
                      <img src={track.thumbnail} alt="" className="absolute inset-0 h-full w-full object-cover transition-transform duration-300 group-hover:scale-105" />
                      <span className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/10 to-transparent" />
                      <span className="absolute inset-x-2 bottom-2 min-w-0">
                        <span className="block truncate text-[10px] font-medium text-white">{track.title}</span>
                        <span className="block truncate text-[9px] text-white/55">{track.artist}</span>
                      </span>
                      <span className="absolute right-1.5 top-1.5 flex h-6 w-6 items-center justify-center rounded-full bg-black/45 text-white opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100">
                        <Plus className="h-3.5 w-3.5" strokeWidth={2} />
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            )}
            {onOpenDiscover && quickAdds.length === 0 && (
              <button
                type="button"
                onClick={onOpenDiscover}
                className="mt-5 inline-flex h-9 items-center gap-2 rounded-[var(--noir-radius-md)] border border-white/10 px-3 text-[12px] font-medium text-[color:var(--noir-text-secondary)] transition-colors hover:border-white/20 hover:bg-white/[0.05] hover:text-white elva-focus-ring"
              >
                <Compass className="h-3.5 w-3.5" strokeWidth={1.75} />
                Browse Discover
              </button>
            )}
          </div>
        ) : (
          <>
            <div className="flex items-baseline justify-between gap-3 px-2 pb-3">
              <p className="text-[14px] font-medium text-[color:var(--noir-text-primary)]">Next up</p>
              <p className="text-[12px] tabular-nums text-[color:var(--noir-text-tertiary)]">
                {upNext.length}
              </p>
            </div>
            <div className="flex flex-col">
            <AnimatePresence initial={false}>
              {upNext.map((track, i) => (
                <motion.div
                  key={track.id}
                  layout={!reduced}
                  className="noir-track-row group flex w-full items-center gap-2 px-2 py-2.5"
                  initial={{ opacity: 0, y: reduced ? 0 : 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, height: 0, margin: 0, paddingTop: 0, paddingBottom: 0 }}
                  transition={{ duration: 0.28, ease: sheetEase }}
                >
                  <button
                    type="button"
                    onClick={() => onSelectFromQueue(track.id)}
                    className="flex min-w-0 flex-1 items-center gap-3 text-left elva-focus-ring"
                  >
                    <img
                      src={track.thumbnail}
                      alt=""
                      className="noir-art h-11 w-11 shrink-0 object-cover"
                    />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[14px] font-medium text-[color:var(--noir-text-primary)]">
                        {track.title}
                      </span>
                      <span className="block truncate text-[13px] text-[color:var(--noir-text-tertiary)]">
                        {track.artist}
                      </span>
                    </span>
                  </button>

                  <div className="flex shrink-0 items-center gap-0.5 opacity-0 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100">
                    {onMoveInQueue && i > 0 && (
                      <button
                        type="button"
                        onClick={() => onMoveInQueue(track.id, -1)}
                        className="flex h-8 w-8 items-center justify-center rounded-full text-[color:var(--noir-text-tertiary)] hover:bg-white/[0.08] hover:text-white"
                        aria-label="Move up in queue"
                        title="Move up"
                      >
                        <ChevronUp className="h-3.5 w-3.5" strokeWidth={2} />
                      </button>
                    )}
                    {onRemoveFromQueue && (
                      <button
                        type="button"
                        onClick={() => onRemoveFromQueue(track.id)}
                        className="flex h-8 w-8 items-center justify-center rounded-full text-[color:var(--noir-text-tertiary)] hover:bg-white/[0.08] hover:text-white"
                        aria-label="Remove from queue"
                        title="Remove"
                      >
                        <X className="h-3.5 w-3.5" strokeWidth={2} />
                      </button>
                    )}
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
            </div>
          </>
        )}
      </aside>
    </div>
  );
}
