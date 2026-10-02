import { useEffect, useRef, useState, type PointerEvent } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import {
  ChevronDown,
  Heart,
  ListMusic,
  Quote,
  Radio,
  SkipBack,
  SkipForward,
  Volume1,
  Volume2,
  VolumeX,
} from 'lucide-react';
import { ShellPlaybackState } from './types';
import { EASE_PREMIUM, MOTION, prefersReducedMotion } from '../../utils/motionPresets';
import { strings } from '../../constants/strings';
import { hasRealArtwork } from '../../utils/artwork';
import { worldForCollection } from '../../utils/ditherCover';
import { NoirDitherCover } from './noir/NoirDitherCover';
import { NoirPlayPauseIcon } from './noir/NoirPlayPauseIcon';

type SongPreview = {
  title: string;
  artist: string;
  artworkUrl: string;
};

type CompactPlayerBarProps = {
  song: SongPreview;
  playback: ShellPlaybackState;
  /** Stream still resolving: times rest at 0:00 and the track shows a quiet sweep. */
  pending?: boolean;
  expanded?: boolean;
  /** True when the Now Playing up-next rail is visible. */
  queueRailOpen?: boolean;
  queueCount?: number;
  isFavorite?: boolean;
  onExpand: () => void;
  /** Toggle up-next rail (opens NP if needed). */
  onToggleQueue?: () => void;
  lyricsOpen?: boolean;
  lyricsAvailable?: boolean;
  onToggleLyrics?: () => void;
  onToggleFavorite?: () => void;
  onStartRadio?: () => void;
  onOpenArtist?: () => void;
};

function formatTime(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) return '0:00';
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

function seekFromClientX(el: HTMLElement, clientX: number, duration: number) {
  if (duration <= 0) return;
  const rect = el.getBoundingClientRect();
  const ratio = Math.min(1, Math.max(0, (clientX - rect.left) / rect.width));
  window.dispatchEvent(
    new CustomEvent('noir-seek', { detail: { time: ratio * duration } })
  );
}

function volumeFromClientX(el: HTMLElement, clientX: number) {
  const rect = el.getBoundingClientRect();
  const ratio = Math.min(1, Math.max(0, (clientX - rect.left) / rect.width));
  return Math.round(ratio * 100);
}

export function CompactPlayerBar({
  song,
  playback,
  pending = false,
  expanded = false,
  queueRailOpen = false,
  queueCount = 0,
  isFavorite = false,
  onExpand,
  onToggleQueue,
  lyricsOpen = false,
  lyricsAvailable = false,
  onToggleLyrics,
  onToggleFavorite,
  onStartRadio,
  onOpenArtist,
}: CompactPlayerBarProps) {
  const reduced = prefersReducedMotion();
  const songKey = `${song.title}::${song.artist}::${song.artworkUrl}`;
  const titleKey = `${song.title}::${song.artist}`;
  // Previous-render value of `expanded`: the title only animates in when coming back from Now Playing.
  const wasExpandedRef = useRef(expanded);
  const returningFromExpanded = wasExpandedRef.current && !expanded;
  useEffect(() => {
    wasExpandedRef.current = expanded;
  }, [expanded]);
  // One ray down the bar each time a song actually starts (once its stream has resolved).
  const [rayKey, setRayKey] = useState(0);
  useEffect(() => {
    if (!pending) setRayKey((k) => k + 1);
  }, [songKey, pending]);
  const [volume, setVolume] = useState(() => {
    const saved = localStorage.getItem('noir_player_volume');
    return saved !== null ? parseInt(saved, 10) : 70;
  });
  const preMuteRef = useRef(volume > 0 ? volume : 70);
  const [volumeValueVisible, setVolumeValueVisible] = useState(false);
  const volumeValueTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [chargeVolume, setChargeVolume] = useState<number | null>(null);
  const [projectile, setProjectile] = useState<{ x: number; y: number } | null>(null);
  const volumeWrapRef = useRef<HTMLDivElement>(null);
  const volumeIconRef = useRef<HTMLButtonElement>(null);
  const volumeSeekRef = useRef<HTMLDivElement>(null);
  const chargeIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const flightFrameRef = useRef<number | null>(null);
  const chargeStartRef = useRef(0);
  const chargeVolumeRef = useRef(0);

  const flashVolumeValue = () => {
    setVolumeValueVisible(true);
    if (volumeValueTimerRef.current) clearTimeout(volumeValueTimerRef.current);
    volumeValueTimerRef.current = setTimeout(() => setVolumeValueVisible(false), 800);
  };

  const stopVolumeGame = () => {
    if (chargeIntervalRef.current !== null) {
      clearInterval(chargeIntervalRef.current);
      chargeIntervalRef.current = null;
    }
    if (flightFrameRef.current !== null) {
      cancelAnimationFrame(flightFrameRef.current);
      flightFrameRef.current = null;
    }
  };

  /** Hold speaker → charge; release → parabolic projectile lands on the volume track. */
  const launchVolumeProjectile = (targetVal: number) => {
    stopVolumeGame();
    const wrap = volumeWrapRef.current;
    const icon = volumeIconRef.current;
    const seek = volumeSeekRef.current;
    if (!wrap || !icon || !seek) {
      setPlayerVolume(targetVal);
      return;
    }

    const wr = wrap.getBoundingClientRect();
    const ir = icon.getBoundingClientRect();
    const sr = seek.getBoundingClientRect();
    const x0 = ir.left + ir.width / 2 - wr.left;
    const y0 = ir.top + ir.height / 2 - wr.top;
    const xt = sr.left - wr.left + (targetVal / 100) * sr.width;
    const yt = sr.top + sr.height / 2 - wr.top;

    const distance = Math.max(8, xt - x0);
    const gravity = 0.35;
    const angleDeg = -20 - (targetVal / 100) * 20;
    const angleRad = (angleDeg * Math.PI) / 180;
    const sin2Theta = Math.sin(2 * angleRad) || -0.5;
    const initialSpeed = Math.sqrt((distance * gravity) / -sin2Theta);

    let vx = initialSpeed * Math.cos(angleRad);
    let vy = initialSpeed * Math.sin(angleRad);
    let px = x0;
    let py = y0;

    const step = () => {
      px += vx;
      py += vy;
      vy += gravity;
      if (py >= yt && vy > 0) {
        setPlayerVolume(targetVal);
        setProjectile(null);
        flightFrameRef.current = null;
      } else {
        setProjectile({ x: px, y: py });
        flightFrameRef.current = requestAnimationFrame(step);
      }
    };

    flightFrameRef.current = requestAnimationFrame(step);
  };

  useEffect(() => {
    const onVolume = (e: Event) => {
      const next = (e as CustomEvent<{ volume?: number }>).detail?.volume;
      if (typeof next === 'number' && Number.isFinite(next)) {
        setVolume(next);
        if (next > 0) preMuteRef.current = next;
        flashVolumeValue();
      }
    };
    window.addEventListener('noir-volume-change', onVolume);
    return () => {
      window.removeEventListener('noir-volume-change', onVolume);
      if (volumeValueTimerRef.current) clearTimeout(volumeValueTimerRef.current);
      stopVolumeGame();
    };
  }, []);

  const setPlayerVolume = (next: number) => {
    const clamped = Math.max(0, Math.min(100, next));
    flashVolumeValue();
    setVolume(clamped);
    if (clamped > 0) preMuteRef.current = clamped;
    localStorage.setItem('noir_player_volume', String(clamped));
    window.dispatchEvent(new CustomEvent('noir-set-volume', { detail: { volume: clamped } }));
  };

  const toggleMute = () => {
    if (volume > 0) {
      preMuteRef.current = volume;
      setPlayerVolume(0);
    } else {
      setPlayerVolume(preMuteRef.current || 70);
    }
  };

  const progress =
    playback.duration > 0
      ? Math.min(100, (playback.currentTime / playback.duration) * 100)
      : 0;

  const onSeekPointerDown = (e: PointerEvent<HTMLDivElement>) => {
    if (playback.duration <= 0) return;
    e.preventDefault();
    e.currentTarget.setPointerCapture(e.pointerId);
    seekFromClientX(e.currentTarget, e.clientX, playback.duration);
  };

  const onSeekPointerMove = (e: PointerEvent<HTMLDivElement>) => {
    if (playback.duration <= 0 || !e.currentTarget.hasPointerCapture(e.pointerId)) return;
    seekFromClientX(e.currentTarget, e.clientX, playback.duration);
  };

  const onVolumePointerDown = (e: PointerEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.currentTarget.setPointerCapture(e.pointerId);
    setPlayerVolume(volumeFromClientX(e.currentTarget, e.clientX));
  };

  const onVolumePointerMove = (e: PointerEvent<HTMLDivElement>) => {
    if (!e.currentTarget.hasPointerCapture(e.pointerId)) return;
    setPlayerVolume(volumeFromClientX(e.currentTarget, e.clientX));
  };

  const VolumeIcon = volume === 0 ? VolumeX : volume < 50 ? Volume1 : Volume2;
  const displayVolume = chargeVolume ?? volume;
  // queueCount from shell is already "up next" (excludes the playing track)
  const upNextCount = Math.max(0, queueCount);

  // Floating cards (toast, queue-end) sit just above the bar, whatever height it wraps to.
  const footerRef = useRef<HTMLElement | null>(null);
  useEffect(() => {
    const el = footerRef.current;
    if (!el) return;
    const root = document.documentElement;
    const write = () => root.style.setProperty('--noir-bar-h', `${el.offsetHeight}px`);
    write();
    const ro = new ResizeObserver(write);
    ro.observe(el);
    return () => {
      ro.disconnect();
      root.style.removeProperty('--noir-bar-h');
    };
  }, []);

  return (
    <motion.footer
      ref={footerRef}
      className="noir-compact shrink-0"
      data-pending={pending ? 'true' : undefined}
      data-expanded={expanded ? 'true' : undefined}
      initial={reduced ? { opacity: 0 } : { opacity: 0, y: 72 }}
      animate={{ opacity: 1, y: 0 }}
      exit={reduced ? { opacity: 0 } : { opacity: 0, y: 56 }}
      transition={
        reduced
          ? { duration: 0.18 }
          : { type: 'spring', stiffness: 380, damping: 36, mass: 0.8 }
      }
    >
      <div className="noir-compact-left" data-expanded={expanded ? 'true' : 'false'}>
        {/* Cover flight (layoutId) must stay a plain mount/unmount — never wrap it in AnimatePresence. */}
        {/* Close fades on its own absolute layer so it never replaces the cover landing slot. */}
        <AnimatePresence>
          {expanded && (
            <motion.button
              key="np-close"
              type="button"
              onClick={onExpand}
              className="noir-compact-close noir-focus-ring"
              aria-label={strings.compact.closeNowPlaying}
              data-tip={strings.compact.closeNowPlaying}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0, transition: { duration: reduced ? 0.1 : 0.18, ease: EASE_PREMIUM } }}
              transition={{ duration: reduced ? 0.12 : 0.22, ease: EASE_PREMIUM }}
            >
              <ChevronDown className="h-4 w-4 shrink-0" strokeWidth={1.75} />
              <span className="noir-compact-close-label">{strings.playlist.close}</span>
            </motion.button>
          )}
        </AnimatePresence>
        {!expanded && (
        <div className="flex min-w-0 items-center gap-1">
          <button
            type="button"
            onClick={onExpand}
            className="noir-compact-now group noir-focus-ring"
            aria-label={strings.compact.openNowPlaying}
          >
            <motion.span
              layoutId={reduced ? undefined : 'np-cover'}
              // Mount / presence only — playback ticks must not restart the flight (see NP cover).
              layoutDependency={0}
              className="noir-compact-art-wrap"
              style={{ borderRadius: 6 }}
              transition={{ type: 'spring', stiffness: 320, damping: 34, mass: 0.85 }}
            >
              <AnimatePresence mode="sync" initial={false}>
                {hasRealArtwork(song.artworkUrl) ? (
                  <motion.img
                    key={song.artworkUrl}
                    src={song.artworkUrl}
                    alt=""
                    className="noir-compact-art"
                    initial={reduced ? { opacity: 0 } : { opacity: 0, scale: 0.86 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={reduced ? { opacity: 0 } : { opacity: 0, scale: 1.06 }}
                    transition={{ duration: reduced ? 0.15 : 0.32, ease: EASE_PREMIUM }}
                  />
                ) : (
                  <motion.div
                    key={`dither:${songKey}`}
                    className="noir-compact-art overflow-hidden"
                    initial={reduced ? { opacity: 0 } : { opacity: 0, scale: 0.86 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={reduced ? { opacity: 0 } : { opacity: 0, scale: 1.06 }}
                    transition={{ duration: reduced ? 0.15 : 0.32, ease: EASE_PREMIUM }}
                  >
                    <NoirDitherCover
                      world={worldForCollection(songKey)}
                      seed={songKey}
                      size={48}
                      radius={0}
                    />
                  </motion.div>
                )}
              </AnimatePresence>
              <span className="noir-compact-art-hint" aria-hidden />
            </motion.span>
            <motion.span
              className="noir-compact-meta relative"
              initial={returningFromExpanded ? (reduced ? { opacity: 0 } : { opacity: 0, x: -6 }) : false}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.26, ease: EASE_PREMIUM, delay: reduced ? 0 : 0.22 }}
            >
              {/* The new title arrives at once; the old one steps out on top of it (popLayout),
                  never holding the new song back. Keyed on the song, not its artwork. */}
              <AnimatePresence mode="popLayout" initial={false}>
                <motion.span
                  key={titleKey}
                  className="block min-w-0"
                  initial={reduced ? { opacity: 0 } : { opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={
                    reduced
                      ? { opacity: 0, transition: { duration: 0.1 } }
                      : { opacity: 0, y: -6, transition: MOTION.exit }
                  }
                  transition={{ duration: reduced ? 0.12 : 0.28, ease: EASE_PREMIUM }}
                >
                  <span className="noir-compact-title">{song.title}</span>
                  {onOpenArtist ? (
                    <button
                      type="button"
                      className="noir-compact-artist max-w-full truncate text-left"
                      onClick={(e) => {
                        e.stopPropagation();
                        onOpenArtist();
                      }}
                      data-tip={strings.songMenu.goToArtist}
                    >
                      {song.artist}
                    </button>
                  ) : (
                    <span className="noir-compact-artist">{song.artist}</span>
                  )}
                </motion.span>
              </AnimatePresence>
            </motion.span>
          </button>
          {onStartRadio && (
            <button
              type="button"
              onClick={onStartRadio}
              className="noir-compact-ctrl shrink-0"
              aria-label={strings.songMenu.startRadio}
              data-tip={strings.songMenu.startRadio}
            >
              <Radio className="h-4 w-4" strokeWidth={1.75} />
            </button>
          )}
          {onToggleFavorite && (
            <button
              type="button"
              onClick={onToggleFavorite}
              className="noir-compact-ctrl shrink-0"
              aria-label={isFavorite ? 'Remove from favorites' : 'Add to favorites'}
              data-tip={isFavorite ? 'Remove from favorites' : 'Add to favorites'}
            >
              <Heart
                className={`h-4 w-4 ${isFavorite ? 'fill-current text-[color:var(--noir-accent)]' : ''}`}
                strokeWidth={isFavorite ? 0 : 1.75}
              />
            </button>
          )}
        </div>
        )}
      </div>

      <div className="noir-compact-center">
        <div className="noir-compact-transport">
          <button
            type="button"
            onClick={() => window.dispatchEvent(new Event('noir-play-prev'))}
            className="noir-compact-ctrl"
            aria-label="Previous"
          >
            <SkipBack className="h-[15px] w-[15px]" fill="currentColor" />
          </button>
          <motion.button
            type="button"
            onClick={() => window.dispatchEvent(new Event('noir-toggle-play'))}
            className="noir-compact-play"
            aria-label={playback.isPlaying ? 'Pause' : 'Play'}
            whileTap={reduced ? undefined : { scale: 0.9 }}
            transition={{ type: 'spring', stiffness: 500, damping: 28 }}
          >
            <NoirPlayPauseIcon playing={playback.isPlaying} size={17} />
          </motion.button>
          <button
            type="button"
            onClick={() => window.dispatchEvent(new Event('noir-play-next'))}
            className="noir-compact-ctrl"
            aria-label="Next"
          >
            <SkipForward className="h-[15px] w-[15px]" fill="currentColor" />
          </button>
        </div>

        <div className="noir-compact-scrub">
          <span className="noir-compact-time">{formatTime(playback.currentTime)}</span>
          <div
            className="noir-compact-seek"
            role="slider"
            tabIndex={0}
            aria-label="Seek"
            aria-valuemin={0}
            aria-valuemax={Math.floor(playback.duration) || 0}
            aria-valuenow={Math.floor(playback.currentTime) || 0}
            aria-valuetext={`${formatTime(playback.currentTime)} of ${formatTime(playback.duration)}`}
            onPointerDown={onSeekPointerDown}
            onPointerMove={onSeekPointerMove}
            onKeyDown={(e) => {
              if (playback.duration <= 0) return;
              if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
                e.preventDefault();
                const delta = e.key === 'ArrowRight' ? 5 : -5;
                const next = Math.min(
                  playback.duration,
                  Math.max(0, playback.currentTime + delta)
                );
                window.dispatchEvent(new CustomEvent('noir-seek', { detail: { time: next } }));
              }
            }}
          >
            <div className="noir-compact-seek-track" aria-hidden>
              <div className="noir-compact-seek-fill" style={{ width: `${progress}%` }} />
              <div className="noir-compact-seek-thumb" style={{ left: `${progress}%` }} />
              {rayKey > 0 && (
                <span className="noir-compact-seek-rayclip">
                  <span key={rayKey} className="noir-compact-seek-ray" />
                </span>
              )}
            </div>
          </div>
          <span className="noir-compact-time">{formatTime(playback.duration)}</span>
        </div>
      </div>

      <div className="noir-compact-right">
        {/* Always rendered (disabled without lyrics) so the bar never shifts between songs. */}
        <button
          type="button"
          onClick={() => onToggleLyrics?.()}
          disabled={!lyricsAvailable && !lyricsOpen}
          className={`noir-compact-queue${lyricsOpen ? ' noir-compact-queue--on' : ''}`}
          aria-pressed={lyricsOpen}
          aria-label={lyricsOpen ? strings.lyrics.hide : strings.lyrics.show}
          data-tip={
            lyricsOpen ? strings.lyrics.hide : lyricsAvailable ? strings.lyrics.show : strings.lyrics.unavailable
          }
        >
          <Quote className="h-4 w-4 shrink-0" strokeWidth={1.75} />
        </button>
        <button
          type="button"
          onClick={() => onToggleQueue?.()}
          className={`noir-compact-queue${expanded && queueRailOpen ? ' noir-compact-queue--on' : ''}`}
          aria-pressed={expanded && queueRailOpen}
          data-fly-target="queue"
          aria-label={
            expanded && queueRailOpen
              ? strings.compact.hideUpNext
              : upNextCount > 0
                ? `${strings.compact.showUpNext}, ${upNextCount}`
                : strings.compact.showUpNext
          }
          data-tip={
            expanded && queueRailOpen
              ? strings.compact.hideUpNext
              : upNextCount > 0
                ? `${upNextCount} up next`
                : strings.compact.showUpNext
          }
        >
          <ListMusic className="h-4 w-4 shrink-0" strokeWidth={1.75} />
          {upNextCount > 0 && (
            // The count rolls: new number rises in from below, the old one leaves upward.
            <span className="noir-compact-queue-count" aria-hidden>
              <AnimatePresence mode="popLayout" initial={false}>
                <motion.span
                  key={upNextCount}
                  className="inline-block"
                  initial={reduced ? { opacity: 0 } : { opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={reduced ? { opacity: 0 } : { opacity: 0, y: -8 }}
                  transition={{ duration: 0.26, ease: EASE_PREMIUM }}
                >
                  {upNextCount > 99 ? '99+' : upNextCount}
                </motion.span>
              </AnimatePresence>
            </span>
          )}
        </button>

        <div className="noir-compact-volume" ref={volumeWrapRef}>
          {projectile !== null && (
            <span
              className="noir-volume-projectile"
              style={{ left: projectile.x, top: projectile.y }}
              aria-hidden
            />
          )}
          <span
            className="noir-compact-volume-value"
            style={{ opacity: volumeValueVisible || chargeVolume !== null ? 1 : 0 }}
            aria-hidden
          >
            {displayVolume}
          </span>
          <button
            ref={volumeIconRef}
            type="button"
            className="noir-compact-ctrl touch-none"
            aria-label={
              chargeVolume !== null
                ? `Charging volume ${chargeVolume}`
                : volume === 0
                  ? 'Unmute'
                  : 'Mute — hold to charge and shoot volume'
            }
            data-tip={strings.tips.volume}
            onKeyDown={(e) => {
              if (e.key === ' ') e.preventDefault();
            }}
            onPointerDown={(e) => {
              chargeStartRef.current = performance.now();
              e.currentTarget.setPointerCapture(e.pointerId);
              stopVolumeGame();
              setProjectile(null);
              setChargeVolume(0);
              chargeVolumeRef.current = 0;
              flashVolumeValue();
              chargeIntervalRef.current = setInterval(() => {
                const elapsed = performance.now() - chargeStartRef.current;
                if (elapsed < 180) {
                  chargeVolumeRef.current = 0;
                  setChargeVolume(0);
                  return;
                }
                const cycleTime = 2400;
                const phase = (elapsed - 180) % cycleTime;
                const vol =
                  phase < 1200 ? (phase / 1200) * 100 : 200 - (phase / 1200) * 100;
                const rounded = Math.round(vol);
                chargeVolumeRef.current = rounded;
                setChargeVolume(rounded);
              }, 16);
            }}
            onPointerUp={(e) => {
              e.currentTarget.releasePointerCapture(e.pointerId);
              e.currentTarget.blur();
              if (chargeIntervalRef.current) {
                clearInterval(chargeIntervalRef.current);
                chargeIntervalRef.current = null;
              }
              const holdDuration = performance.now() - chargeStartRef.current;
              const charged = chargeVolumeRef.current;
              if (holdDuration >= 180 && charged > 2) {
                setChargeVolume(null);
                launchVolumeProjectile(charged);
              } else {
                setChargeVolume(null);
                toggleMute();
              }
            }}
            onPointerCancel={(e) => {
              e.currentTarget.releasePointerCapture(e.pointerId);
              e.currentTarget.blur();
              stopVolumeGame();
              setChargeVolume(null);
            }}
          >
            <motion.span
              className="inline-flex"
              animate={{ rotate: chargeVolume !== null ? -(chargeVolume / 100) * 35 : 0 }}
              transition={{ type: 'spring', stiffness: 200, damping: 20 }}
            >
              <VolumeIcon className="h-4 w-4" strokeWidth={1.75} />
            </motion.span>
          </button>
          <div
            ref={volumeSeekRef}
            className="noir-compact-volume-seek"
            role="slider"
            tabIndex={0}
            aria-label="Volume"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={volume}
            onPointerDown={(e) => {
              stopVolumeGame();
              setProjectile(null);
              setChargeVolume(null);
              onVolumePointerDown(e);
            }}
            onPointerMove={onVolumePointerMove}
            onWheel={(e) => {
              if (e.deltaY === 0) return;
              stopVolumeGame();
              setPlayerVolume(volume + (e.deltaY < 0 ? 2 : -2));
            }}
            onKeyDown={(e) => {
              if (e.key === 'ArrowRight' || e.key === 'ArrowUp') {
                e.preventDefault();
                setPlayerVolume(volume + 5);
              } else if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') {
                e.preventDefault();
                setPlayerVolume(volume - 5);
              }
            }}
          >
            <div className="noir-compact-volume-track" aria-hidden>
              <div
                className="noir-compact-volume-fill"
                style={{ width: `${volume}%` }}
              />
            </div>
          </div>
        </div>
      </div>
    </motion.footer>
  );
}

