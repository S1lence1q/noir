import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion, Reorder, useIsPresent } from 'motion/react';
import { Compass, Heart, Plus, Radio, Shuffle, X } from 'lucide-react';
import { SearchResult } from '../../../types';
import { getPlaybackSongKey } from '../../../utils/playbackSongKey';
import { EASE_PREMIUM, MOTION, prefersReducedMotion, withReducedMotion } from '../../../utils/motionPresets';
import { strings } from '../../../constants/strings';
import { NoirMark } from './NoirMark';
import { NoirLyricsColumn } from './NoirLyricsColumn';
import { noirToast } from './NoirToast';
import { openSongMenu, SongRowOptions } from '../../SongRowOptions';
import { useQueueEndPrompt } from '../../../hooks/useQueueEndPrompt';
import { displayArtistName } from '../../../utils/stringUtils';
import { hasRealArtwork } from '../../../utils/artwork';
import { worldForCollection } from '../../../utils/ditherCover';
import { NoirDitherCover } from './NoirDitherCover';
import type { LyricLine } from '../../../types';

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
  onStartRadio?: () => void;
  onOpenArtist?: () => void;
  onOpenQueueSource?: () => void;
  favoriteTracks?: SearchResult[];
  quickAddTracks?: SearchResult[];
  onAddToQueue?: (track: SearchResult, options?: { silent?: boolean }) => void;
  onAppendRadio?: (seed: SearchResult) => void | Promise<void>;
  onOpenDiscover?: () => void;
  onSelectFromQueue: (id: string) => void;
  onRemoveFromQueue?: (id: string) => void;
  onClearQueue?: () => (() => void) | void;
  onShuffleQueue?: () => void;
  onReorderQueue?: (orderedUpNextIds: string[]) => void;
  playback?: { currentTime: number; duration: number; isPlaying: boolean };
  queueSource?: string;
  showLyrics?: boolean;
  onShowLyrics?: (show: boolean) => void;
  lyrics?: LyricLine[];
  isLoadingLyrics?: boolean;
  isLyricsSynced?: boolean;
  currentLyricIndex?: number;
  sidePanelOpen?: boolean;
};

const sheetEase = EASE_PREMIUM;
const BATCH_SIZE = 10;
const SHUFFLE_SETTLE_MS = 540;

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
  onStartRadio,
  onOpenArtist,
  onOpenQueueSource,
  favoriteTracks = [],
  quickAddTracks = [],
  onAddToQueue,
  onAppendRadio,
  onOpenDiscover,
  onSelectFromQueue,
  onRemoveFromQueue,
  onClearQueue,
  onShuffleQueue,
  onReorderQueue,
  playback = { currentTime: 0, duration: 0, isPlaying: false },
  queueSource,
  showLyrics = false,
  onShowLyrics,
  lyrics = [],
  isLoadingLyrics = false,
  isLyricsSynced = false,
  currentLyricIndex = -1,
  sidePanelOpen = true,
}: NoirNowPlayingViewProps) {
  const reduced = prefersReducedMotion();
  /** While cover flies home, keep layoutId mounted but fade everything else so title/queue don't ghost. */
  const isPresent = useIsPresent();
  const chromeFade = {
    opacity: isPresent ? 1 : 0,
    transition: { duration: reduced ? 0.1 : 0.16, ease: sheetEase },
  };
  const currentKey = getPlaybackSongKey(song);
  const currentIndex = currentKey
    ? queue.findIndex((item) => getPlaybackSongKey(item) === currentKey)
    : -1;
  const upNext =
    currentIndex >= 0
      ? queue.slice(currentIndex + 1)
      : queue.filter((item) => getPlaybackSongKey(item) !== currentKey);
  const [order, setOrder] = useState(() => upNext.map((track) => track.id));
  const orderRef = useRef(order);
  orderRef.current = order;
  /** 'shuffle' = soft settle after Shuffle; 'drag' = snappy 120 ms settle. */
  const [layoutMode, setLayoutMode] = useState<'drag' | 'shuffle'>('drag');
  const [shufflePulse, setShufflePulse] = useState(0);
  const shuffleResetRef = useRef<number | null>(null);
  useEffect(() => {
    setOrder(upNext.map((track) => track.id));
  }, [upNext.map((track) => track.id).join('\0')]);

  const triggerShuffle = () => {
    if (!onShuffleQueue || upNext.length < 2) return;
    if (shuffleResetRef.current != null) window.clearTimeout(shuffleResetRef.current);
    if (!reduced) {
      setLayoutMode('shuffle');
      setShufflePulse((n) => n + 1);
      shuffleResetRef.current = window.setTimeout(() => {
        setLayoutMode('drag');
        shuffleResetRef.current = null;
      }, SHUFFLE_SETTLE_MS);
    }
    onShuffleQueue();
  };

  useEffect(
    () => () => {
      if (shuffleResetRef.current != null) window.clearTimeout(shuffleResetRef.current);
    },
    []
  );

  const byId = new Map(upNext.map((track) => [track.id, track]));
  const orderedUpNext = order.map((id) => byId.get(id)).filter((track): track is SearchResult => !!track);
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
    const seed: SearchResult = {
      id: song.videoId || song.audioUrl || `${song.title}-${song.artist}`,
      title: song.title,
      artist: song.artist,
      thumbnail: song.artworkUrl,
      videoId: song.videoId || '',
      audioUrl: song.audioUrl,
    };
    if (onAppendRadio) {
      void onAppendRadio(seed);
      return;
    }
    if (addPool.length > 0) addTracks(shuffled(addPool).slice(0, BATCH_SIZE));
  };

  const queueEndPrompt = useQueueEndPrompt({
    trackKey: songKey,
    currentTime: playback.currentTime,
    duration: playback.duration,
    isPlaying: playback.isPlaying,
    upNextCount: upNext.length,
    canKeepPlaying: !!onAddToQueue && (!!onAppendRadio || addPool.length > 0),
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
    <div className={`noir-now-playing${sidePanelOpen ? '' : ' is-side-collapsed'}`}>
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
      <motion.div
        className="noir-now-playing-atmosphere"
        aria-hidden
        initial={{ opacity: 0 }}
        animate={{ opacity: isPresent ? 1 : 0 }}
        transition={
          isPresent
            ? { duration: reduced ? 0.2 : 0.7, ease: sheetEase, delay: reduced ? 0 : 0.2 }
            : chromeFade.transition
        }
      >
        <AnimatePresence mode="sync" initial={false}>
          {hasRealArtwork(song.artworkUrl) ? (
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
          ) : null}
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

      <div className={`noir-now-playing-stage${showLyrics ? ' has-lyrics' : ''}`}>
        <div className="noir-now-playing-identity">
          <motion.div
            layoutId={reduced ? undefined : 'np-cover'}
            className="noir-now-playing-art-slot"
            style={{ borderRadius: 18, boxShadow: '0 28px 80px rgba(0,0,0,0.55)' }}
            transition={{ type: 'spring', stiffness: 320, damping: 34, mass: 0.85 }}
          >
            <AnimatePresence mode="sync" initial={false}>
              {hasRealArtwork(song.artworkUrl) ? (
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
              ) : (
                <motion.div
                  key={`dither:${songKey}`}
                  className="noir-now-playing-art overflow-hidden"
                  initial={reduced ? { opacity: 0 } : { opacity: 0, scale: 0.94, y: 12 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={reduced ? { opacity: 0 } : { opacity: 0, scale: 1.03, y: -8 }}
                  transition={
                    reduced
                      ? { duration: 0.2 }
                      : { type: 'spring', stiffness: 280, damping: 28, mass: 0.85 }
                  }
                >
                  <NoirDitherCover
                    world={worldForCollection(songKey)}
                    seed={songKey}
                    size={320}
                    radius={0}
                  />
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
          <motion.div
            className="min-w-0"
            initial={reduced ? { opacity: 0 } : { opacity: 0, y: 10 }}
            animate={
              isPresent
                ? { opacity: 1, y: 0 }
                : { opacity: 0, y: 0, transition: chromeFade.transition }
            }
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
                  {onOpenArtist ? (
                    <button
                      type="button"
                      onClick={onOpenArtist}
                      className="noir-now-playing-artist !mt-0 text-left hover:underline elva-focus-ring rounded-sm"
                      title={strings.songMenu.goToArtist}
                    >
                      {song.artist}
                    </button>
                  ) : (
                    <p className="noir-now-playing-artist !mt-0">{song.artist}</p>
                  )}
                  {onStartRadio && (
                    <button
                      type="button"
                      onClick={onStartRadio}
                      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-[color:var(--noir-text-secondary)] hover:bg-white/[0.08] hover:text-white elva-focus-ring"
                      aria-label={strings.songMenu.startRadio}
                      title={strings.songMenu.startRadio}
                    >
                      <Radio className="h-4 w-4" strokeWidth={1.75} />
                    </button>
                  )}
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
                {queueSource && (
                  <div className="noir-now-playing-meta">
                    {onOpenQueueSource ? (
                      <button
                        type="button"
                        className="noir-now-playing-source elva-focus-ring rounded-sm"
                        onClick={onOpenQueueSource}
                        title={strings.nowPlaying.openSource}
                      >
                        {strings.nowPlaying.playingFrom(queueSource)}
                      </button>
                    ) : (
                      <p className="noir-now-playing-source">{strings.nowPlaying.playingFrom(queueSource)}</p>
                    )}
                  </div>
                )}
                {onShowLyrics && (
                  <div className="noir-now-playing-meta">
                    <button
                      type="button"
                      className="noir-now-playing-lyrics-link elva-focus-ring rounded-sm"
                      onClick={() => onShowLyrics(!showLyrics)}
                      aria-pressed={showLyrics}
                    >
                      {showLyrics ? strings.lyrics.hide : strings.lyrics.show}
                    </button>
                  </div>
                )}
              </motion.div>
            </AnimatePresence>
          </motion.div>
        </div>

        <AnimatePresence initial={false}>
          {showLyrics && (
            <motion.div
              key="stage-lyrics"
              className="noir-now-playing-stage-lyrics"
              initial={reduced ? { opacity: 0 } : { opacity: 0, x: 12 }}
              animate={
                isPresent
                  ? { opacity: 1, x: 0 }
                  : { opacity: 0, transition: chromeFade.transition }
              }
              exit={reduced ? { opacity: 0 } : { opacity: 0, x: 8 }}
              transition={{ duration: reduced ? 0.15 : 0.32, ease: sheetEase }}
            >
              <p className="noir-now-playing-lyrics-label">{strings.lyrics.title}</p>
              <NoirLyricsColumn
                lyrics={lyrics}
                isLoading={isLoadingLyrics}
                isSynced={isLyricsSynced}
                currentIndex={currentLyricIndex}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <AnimatePresence initial={false}>
        {sidePanelOpen && (
          <motion.aside
            key="np-side"
            className="noir-now-playing-queue"
            aria-label={strings.nextUp.title}
            initial={reduced ? { opacity: 0 } : { opacity: 0, x: 16 }}
            animate={
              isPresent
                ? { opacity: 1, x: 0 }
                : { opacity: 0, x: 0, transition: chromeFade.transition }
            }
            exit={reduced ? { opacity: 0 } : { opacity: 0, x: 12 }}
            transition={{ duration: reduced ? 0.15 : 0.32, ease: sheetEase, delay: reduced ? 0 : 0.06 }}
          >
            <div className="noir-now-playing-side-header">
              <p className="text-[14px] font-medium text-[color:var(--noir-text-primary)]">
                {upNext.length > 0
                  ? strings.nextUp.headerTitle(upNext.length)
                  : strings.nextUp.title}
              </p>
              <div className="flex shrink-0 items-center gap-2">
                {upNext.length > 0 && onShuffleQueue && (
                  <motion.button
                    type="button"
                    className="inline-flex items-center gap-1.5 text-[12px] text-[color:var(--noir-text-tertiary)] hover:text-white elva-focus-ring"
                    onClick={triggerShuffle}
                    whileTap={reduced ? undefined : { scale: 0.96 }}
                    transition={MOTION.tap}
                    aria-label={strings.nextUp.shuffle}
                  >
                    <motion.span
                      key={shufflePulse}
                      className="inline-flex"
                      initial={reduced || shufflePulse === 0 ? false : { rotate: 0 }}
                      animate={{ rotate: reduced || shufflePulse === 0 ? 0 : 180 }}
                      transition={withReducedMotion({ duration: 0.42, ease: EASE_PREMIUM })}
                    >
                      <Shuffle className="h-3.5 w-3.5" strokeWidth={1.75} />
                    </motion.span>
                    {strings.nextUp.shuffle}
                  </motion.button>
                )}
                {upNext.length > 0 && onClearQueue && (
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
                          {hasRealArtwork(track.thumbnail) ? (
                            <img
                              src={track.thumbnail}
                              alt=""
                              className="noir-queue-empty-cover transition-transform duration-300 group-hover:scale-[1.04]"
                            />
                          ) : (
                            <span className="noir-queue-empty-cover block overflow-hidden">
                              <NoirDitherCover
                                world={worldForCollection(track.id)}
                                seed={track.id}
                                size={72}
                                radius={0}
                              />
                            </span>
                          )}
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
              <Reorder.Group
                axis="y"
                values={order}
                onReorder={setOrder}
                className="flex flex-col gap-0.5"
              >
                <AnimatePresence initial={false}>
                  {orderedUpNext.map((track, index) => (
                    <QueueTrackItem
                      key={track.id}
                      track={track}
                      index={index}
                      layoutMode={layoutMode}
                      shufflePulse={shufflePulse}
                      onDragEnd={() => onReorderQueue?.(orderRef.current)}
                      onSelect={() => onSelectFromQueue(track.id)}
                      onRemove={onRemoveFromQueue ? () => onRemoveFromQueue(track.id) : undefined}
                      onAddToQueue={onAddToQueue}
                    />
                  ))}
                </AnimatePresence>
              </Reorder.Group>
            )}
          </motion.aside>
        )}
      </AnimatePresence>
    </div>
  );
}

type QueueTrackItemProps = {
  track: SearchResult;
  index: number;
  layoutMode: 'drag' | 'shuffle';
  shufflePulse: number;
  onDragEnd: () => void;
  onSelect: () => void;
  onRemove?: () => void;
  onAddToQueue?: (track: SearchResult, options?: { silent?: boolean }) => void;
};

function QueueTrackItem({
  track,
  index,
  layoutMode,
  shufflePulse,
  onDragEnd,
  onSelect,
  onRemove,
  onAddToQueue,
}: QueueTrackItemProps) {
  const draggedRef = useRef(false);
  const reduced = prefersReducedMotion();
  const shuffling = layoutMode === 'shuffle' && !reduced && shufflePulse > 0;
  const stagger = Math.min(index, 8) * 0.01;

  const layoutTransition = shuffling
    ? {
        type: 'spring' as const,
        stiffness: 300,
        damping: 34,
        mass: 0.92,
        delay: stagger,
      }
    : { duration: 0.12, ease: EASE_PREMIUM };

  // Soft: ease into the dip from sharp/full, then ease out — never start at max blur.
  const animate = shuffling
    ? {
        opacity: [1, 0.5, 1],
        scale: [1, 0.99, 1],
        y: 0,
        filter: ['blur(0px)', 'blur(1.1px)', 'blur(0px)'],
      }
    : { opacity: 1, y: 0, scale: 1, filter: 'blur(0px)' };

  const motionTransition = shuffling
    ? { duration: 0.48, ease: EASE_PREMIUM, times: [0, 0.4, 1] as number[], delay: stagger }
    : MOTION.panel;

  return (
    <Reorder.Item
      value={track.id}
      onDragStart={() => {
        draggedRef.current = true;
      }}
      onDragEnd={() => {
        onDragEnd();
        window.setTimeout(() => {
          draggedRef.current = false;
        }, 0);
      }}
      className="noir-playlist-item select-none"
      initial={{ opacity: 0, y: -8 }}
      animate={animate}
      exit={{ opacity: 0, transition: { duration: 0.16 } }}
      whileDrag={{
        scale: 1.02,
        boxShadow: '0 12px 32px rgba(0,0,0,0.65)',
        zIndex: 5,
        cursor: 'grabbing',
      }}
      transition={{
        ...motionTransition,
        layout: layoutTransition,
      }}
      onContextMenu={(event) => openSongMenu(track, event)}
    >
      <div className="noir-track-row group flex w-full items-center gap-2 px-2 py-2.5">
        <button
          type="button"
          onClick={() => {
            if (!draggedRef.current) onSelect();
          }}
          className="flex min-w-0 flex-1 items-center gap-3 text-left elva-focus-ring"
        >
          <span className="noir-art relative h-11 w-11 shrink-0 overflow-hidden">
            {hasRealArtwork(track.thumbnail) ? (
              <img src={track.thumbnail} alt="" className="h-full w-full object-cover" />
            ) : (
              <NoirDitherCover
                world={worldForCollection(track.id)}
                seed={track.id}
                size={44}
                radius={0}
              />
            )}
          </span>
          <span className="min-w-0 flex-1">
            <span className="block truncate text-[14px] font-medium text-[color:var(--noir-text-primary)]">
              {track.title}
            </span>
            <span className="block truncate text-[13px] text-[color:var(--noir-text-tertiary)]">
              {displayArtistName(track.artist)}
            </span>
          </span>
        </button>

        <div
          className="flex shrink-0 items-center gap-0.5 opacity-0 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100"
          onPointerDown={(e) => e.stopPropagation()}
        >
          {onRemove && (
            <button
              type="button"
              onClick={onRemove}
              className="flex h-8 w-8 items-center justify-center rounded-full text-[color:var(--noir-text-tertiary)] hover:bg-white/[0.08] hover:text-white"
              aria-label="Remove from queue"
              title="Remove"
            >
              <X className="h-3.5 w-3.5" strokeWidth={2} />
            </button>
          )}
          <SongRowOptions track={track} onAddToQueue={onAddToQueue} />
        </div>
      </div>
    </Reorder.Item>
  );
}
