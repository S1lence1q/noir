import { AnimatePresence, motion } from 'motion/react';
import { ChevronUp, Compass, Heart, Plus, Shuffle, X } from 'lucide-react';
import { SearchResult } from '../../../types';
import { getPlaybackSongKey } from '../../../utils/playbackSongKey';
import { EASE_PREMIUM, MOTION, prefersReducedMotion, withReducedMotion } from '../../../utils/motionPresets';
import { strings } from '../../../constants/strings';
import { NoirMark } from './NoirMark';
import { noirToast } from './NoirToast';
import { openSongMenu, SongRowOptions } from '../../SongRowOptions';
import { useQueueEndPrompt } from '../../../hooks/useQueueEndPrompt';

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
  onAddToQueue?: (track: SearchResult, options?: { silent?: boolean }) => void;
  onOpenDiscover?: () => void;
  onSelectFromQueue: (id: string) => void;
  onRemoveFromQueue?: (id: string) => void;
  onClearQueue?: () => (() => void) | void;
  onShuffleQueue?: () => void;
  onMoveInQueue?: (id: string, direction: -1 | 1) => void;
  playback?: { currentTime: number; duration: number; isPlaying: boolean };
  queueSource?: string;
};

const sheetEase = EASE_PREMIUM;
const BATCH_SIZE = 10;

function shuffled<T>(items: T[]): T[] {
  const next = [...items];
  for (let i = next.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [next[i], next[j]] = [next[j], next[i]];
  }
  return next;
}

function uniqueByKey(tracks: SearchResult[]): SearchResult[] {
  const seen = new Set<string>();
  return tracks.filter((track) => {
    const key = getPlaybackSongKey(track) ?? track.id;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

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
  onClearQueue,
  onShuffleQueue,
  onMoveInQueue,
  playback = { currentTime: 0, duration: 0, isPlaying: false },
  queueSource,
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
  const favoriteAdds = uniqueByKey(favoriteTracks.filter((track) => getPlaybackSongKey(track) !== currentKey));
  const recentAdds = uniqueByKey(quickAddTracks.filter((track) => getPlaybackSongKey(track) !== currentKey));
  const quickAddSource = favoriteAdds.length > 0 ? 'favorites' : recentAdds.length > 0 ? 'recents' : null;
  const addPool = favoriteAdds.length > 0 ? favoriteAdds : recentAdds;
  const quickAdds = addPool.slice(0, 3);

  const addTracks = (tracks: SearchResult[]) => {
    if (!onAddToQueue || tracks.length === 0) return;
    tracks.forEach((track) => onAddToQueue(track, { silent: true }));
    noirToast({
      text: tracks.length === 1 ? strings.nextUp.addedOne : strings.nextUp.addedMany(tracks.length),
      cover: tracks[0].thumbnail,
      action: onRemoveFromQueue
        ? { label: strings.nextUp.undo, onClick: () => tracks.forEach((track) => onRemoveFromQueue(track.id)) }
        : undefined,
    });
  };

  const keepPlaying = () => {
    if (addPool.length > 0) addTracks(shuffled(addPool).slice(0, BATCH_SIZE));
  };

  const queueEndPrompt = useQueueEndPrompt({
    trackKey: songKey,
    currentTime: playback.currentTime,
    duration: playback.duration,
    isPlaying: playback.isPlaying,
    upNextCount: upNext.length,
    canKeepPlaying: !!onAddToQueue && addPool.length > 0,
    onKeepPlaying: keepPlaying,
  });

  const clearQueue = () => {
    const restore = onClearQueue?.();
    noirToast({
      text: strings.nextUp.queueCleared,
      action: restore ? { label: strings.nextUp.undo, onClick: restore } : undefined,
    });
  };

  return (
    <div className="noir-now-playing">
      <AnimatePresence>
        {queueEndPrompt.isVisible && (
          <motion.div
            className="fixed bottom-[112px] left-1/2 z-[60] w-[min(420px,calc(100vw-32px))] -translate-x-1/2 rounded-[var(--noir-radius-md)] border border-white/[0.12] bg-[color:var(--noir-black)] p-4 shadow-[0_16px_40px_rgba(0,0,0,0.65)]"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 4 }}
            transition={withReducedMotion(MOTION.panel)}
          >
            <p className="text-[13px] font-medium text-[color:var(--noir-text-primary)]">
              {strings.nextUp.queueEndsSoon}
            </p>
            <div className="mt-3 flex items-center justify-between gap-3">
              <label className="flex items-center gap-2 text-[12px] text-[color:var(--noir-text-tertiary)]">
                <input
                  type="checkbox"
                  checked={queueEndPrompt.dontAskAgain}
                  onChange={(event) => queueEndPrompt.setDontAskAgain(event.target.checked)}
                  className="accent-[var(--noir-accent)]"
                />
                {strings.nextUp.dontAskAgain}
              </label>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  className="noir-button-secondary elva-focus-ring"
                  onClick={() => queueEndPrompt.resolve('dismiss')}
                >
                  {strings.nextUp.noThanks}
                </button>
                <button
                  type="button"
                  className="noir-button-primary elva-focus-ring"
                  onClick={() => queueEndPrompt.resolve('keep')}
                >
                  {strings.nextUp.keepPlaying}
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      {/* Artwork-derived atmosphere; fades in after the cover has landed so it never competes with the flight. */}
      <motion.div
        className="noir-now-playing-atmosphere"
        aria-hidden
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: reduced ? 0.2 : 0.7, ease: sheetEase, delay: reduced ? 0 : 0.2 }}
      >
        <AnimatePresence mode="sync" initial={false}>
          <motion.img
            key={song.artworkUrl}
            src={song.artworkUrl}
            alt=""
            className="noir-now-playing-atmosphere-img"
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.28 }}
            exit={{ opacity: 0 }}
            transition={{ duration: reduced ? 0.2 : 0.8, ease: sheetEase }}
          />
        </AnimatePresence>
        <motion.div
          key={songKey + '-wash'}
          className="noir-now-playing-atmosphere-wash"
          initial={{ opacity: 0 }}
          animate={{ opacity: 0.55 }}
          transition={{ duration: reduced ? 0.2 : 0.8, ease: sheetEase }}
          style={
            colors
              ? {
                  background: `radial-gradient(ellipse 80% 70% at 28% 58%, ${colors.primary} 0%, transparent 62%), radial-gradient(ellipse 50% 50% at 70% 20%, ${colors.secondary} 0%, transparent 55%)`,
                }
              : undefined
          }
        />
      </motion.div>

      <div className="noir-now-playing-stage">
        <motion.div
          layoutId={reduced ? undefined : 'np-cover'}
          className="noir-now-playing-art-slot"
          style={{ borderRadius: 18, boxShadow: '0 28px 80px rgba(0,0,0,0.55)' }}
          transition={{ type: 'spring', stiffness: 320, damping: 34, mass: 0.85 }}
        >
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
        </motion.div>
        <motion.div
          className="min-w-0"
          initial={reduced ? { opacity: 0 } : { opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: reduced ? 0.15 : 0.34, ease: sheetEase, delay: reduced ? 0 : 0.1 }}
        >
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
                    className={`h-4 w-4 ${isFavorite ? 'fill-current text-[color:var(--noir-accent)]' : ''}`}
                    strokeWidth={isFavorite ? 0 : 1.75}
                  />
                </button>
              )}
            </div>
          </motion.div>
        </AnimatePresence>
        </motion.div>
      </div>

      <motion.aside
        className="noir-now-playing-queue"
        aria-label={upNext.length > 0 ? 'Next up' : 'Queue suggestions'}
        initial={reduced ? { opacity: 0 } : { opacity: 0, x: 16 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: reduced ? 0.15 : 0.4, ease: sheetEase, delay: reduced ? 0 : 0.14 }}
      >
        {upNext.length === 0 ? (
          <motion.div
            key={quickAddSource ?? 'none'}
            className="noir-now-playing-queue-empty px-2 pt-1"
            initial={{ opacity: 0, y: reduced ? 0 : 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={withReducedMotion(MOTION.panel)}
          >
            <p className="flex items-center gap-2 text-[17px] font-semibold leading-tight tracking-[-0.02em] text-[color:var(--noir-text-primary)]">
              <NoirMark size={14} />
              {strings.nextUp.emptyTitle}
            </p>
            <p className="mt-2 max-w-[232px] text-[13px] leading-[1.45] text-[color:var(--noir-text-secondary)]">
              {quickAddSource === 'favorites'
                ? strings.nextUp.emptyFromFavorites
                : quickAddSource === 'recents'
                  ? strings.nextUp.emptyFromRecents
                  : strings.nextUp.emptyNothing}
            </p>

            {onAddToQueue && quickAdds.length > 0 && (
              <div className="noir-queue-empty-covers mt-4">
                {quickAdds.map((track, i) => (
                  <motion.button
                    type="button"
                    key={track.id}
                    onClick={() => addTracks([track])}
                    className="group min-w-0 text-left elva-focus-ring"
                    title={strings.nextUp.addOne(track.title)}
                    initial={{ opacity: 0, y: reduced ? 0 : 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={withReducedMotion({ ...MOTION.panel, delay: 0.06 + i * 0.04 })}
                  >
                    <span className="relative block overflow-hidden rounded-[var(--noir-radius-sm)]">
                      <img
                        src={track.thumbnail}
                        alt=""
                        className="noir-queue-empty-cover transition-transform duration-300 group-hover:scale-[1.04]"
                      />
                      <span className="absolute inset-0 flex items-center justify-center bg-black/45 text-white opacity-0 transition-opacity duration-150 group-hover:opacity-100 group-focus-visible:opacity-100">
                        <Plus className="h-4 w-4" strokeWidth={2} />
                      </span>
                    </span>
                    <span className="noir-queue-empty-cover-title">{track.title}</span>
                  </motion.button>
                ))}
              </div>
            )}

            <div className="mt-5 flex flex-wrap items-center gap-2">
              {onAddToQueue && addPool.length > 0 ? (
                <>
                  <button
                    type="button"
                    className="noir-button-primary elva-focus-ring"
                    onClick={() => addTracks(shuffled(addPool).slice(0, BATCH_SIZE))}
                  >
                    <Plus className="h-3.5 w-3.5" strokeWidth={2.25} />
                    {strings.nextUp.addBatch(Math.min(BATCH_SIZE, addPool.length))}
                  </button>
                  {addPool.length > BATCH_SIZE && (
                    <button
                      type="button"
                      className="noir-button-secondary elva-focus-ring"
                      onClick={() => addTracks(shuffled(addPool))}
                    >
                      <Shuffle className="h-3.5 w-3.5" strokeWidth={2} />
                      {strings.nextUp.shuffleAll}
                    </button>
                  )}
                </>
              ) : (
                onOpenDiscover && (
                  <button type="button" className="noir-button-secondary elva-focus-ring" onClick={onOpenDiscover}>
                    <Compass className="h-3.5 w-3.5" strokeWidth={1.75} />
                    {strings.nextUp.browseDiscover}
                  </button>
                )
              )}
            </div>
          </motion.div>
        ) : (
          <>
            <div className="flex items-end justify-between gap-3 px-2 pb-3">
              <div className="min-w-0">
                <p className="text-[14px] font-medium text-[color:var(--noir-text-primary)]">
                  {strings.nextUp.headerTitle(upNext.length)}
                </p>
                {queueSource && (
                  <p className="mt-1 text-[12px] text-[color:var(--noir-text-tertiary)]">
                    {strings.nextUp.playingFrom(queueSource)}
                  </p>
                )}
              </div>
              <div className="flex shrink-0 items-center gap-2">
                {onShuffleQueue && (
                  <button
                    type="button"
                    className="text-[12px] text-[color:var(--noir-text-tertiary)] hover:text-white elva-focus-ring"
                    onClick={onShuffleQueue}
                  >
                    {strings.nextUp.shuffle}
                  </button>
                )}
                {onClearQueue && (
                  <button
                    type="button"
                    className="text-[12px] text-[color:var(--noir-text-tertiary)] hover:text-white elva-focus-ring"
                    onClick={clearQueue}
                  >
                    {strings.nextUp.clear}
                  </button>
                )}
              </div>
            </div>
            <div className="flex flex-col">
            <AnimatePresence initial={false}>
              {upNext.map((track, i) => (
                <motion.div
                  key={track.id}
                  layout={!reduced}
                  className="noir-track-row group flex w-full items-center gap-2 px-2 py-2.5"
                  onContextMenu={(event) => openSongMenu(track, event)}
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
                    <SongRowOptions track={track} onAddToQueue={onAddToQueue} />
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
            </div>
          </>
        )}
      </motion.aside>
    </div>
  );
}
