import { AnimatePresence, motion } from 'motion/react';
import { ChevronUp, Heart, X } from 'lucide-react';
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

      <aside className="noir-now-playing-queue" aria-label="Next up">
        <div className="flex items-baseline justify-between gap-3 px-2 pb-3">
          <p className="text-[14px] font-medium text-[color:var(--noir-text-primary)]">Next up</p>
          {upNext.length > 0 && (
            <p className="text-[12px] tabular-nums text-[color:var(--noir-text-tertiary)]">
              {upNext.length}
            </p>
          )}
        </div>

        {upNext.length === 0 ? (
          <div className="noir-now-playing-queue-empty px-2">
            <p className="text-[14px] text-[color:var(--noir-text-secondary)]">Nothing queued</p>
            <p className="mt-1 text-[13px] leading-relaxed text-[color:var(--noir-text-tertiary)]">
              Hover a track and tap <span className="text-white/55">+</span> to add it here. Play a
              chart or playlist to fill a whole session.
            </p>
          </div>
        ) : (
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
        )}
      </aside>
    </div>
  );
}
