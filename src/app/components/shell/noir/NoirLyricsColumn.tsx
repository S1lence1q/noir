import { useCallback, useEffect, useRef, useState, type CSSProperties } from 'react';
import type { LyricLine } from '../../../types';
import { prefersReducedMotion } from '../../../utils/motionPresets';
import { strings } from '../../../constants/strings';
import { useLyricsTimingControls } from '../../../utils/lyricsTiming';

export type NoirLyricsColumnProps = {
  lyrics: LyricLine[];
  isLoading: boolean;
  isSynced: boolean;
  currentIndex: number;
  /** Paused playback holds the breathing dots mid-breath. */
  isPlaying?: boolean;
  onSeek?: (time: number) => void;
  /** Current timing shift in seconds, and handlers. The controls only show if the listener turned them on in Settings. */
  offset?: number;
  onNudge?: (deltaSeconds: number) => void;
  onResetOffset?: () => void;
};

const SKELETON_WIDTHS = [72, 54, 81, 46, 66, 58];
const SKELETON_DELAY_MS = 120;
const SKELETON_MIN_MS = 650;

function seekViaShell(time: number) {
  window.dispatchEvent(new CustomEvent('elva-seek', { detail: { time } }));
}

/** Lyrics list for the Now Playing side panel (queue header owns the title). */
export function NoirLyricsColumn({
  lyrics,
  isLoading,
  isSynced,
  currentIndex,
  isPlaying = true,
  onSeek = seekViaShell,
  offset = 0,
  onNudge,
  onResetOffset,
}: NoirLyricsColumnProps) {
  const reduced = prefersReducedMotion();
  const timingControls = useLyricsTimingControls();
  const showTiming = timingControls && isSynced && lyrics.length > 0 && !!onNudge;
  // The timing row is only there while the pointer is moving over the lyrics (or a control has focus):
  // listening shouldn't carry controls that are only needed until the timing is right.
  const [timingAwake, setTimingAwake] = useState(false);
  const timingTimerRef = useRef<number | undefined>(undefined);
  const wakeTiming = useCallback(() => {
    setTimingAwake(true);
    window.clearTimeout(timingTimerRef.current);
    timingTimerRef.current = window.setTimeout(() => setTimingAwake(false), 2200);
  }, []);
  useEffect(() => () => window.clearTimeout(timingTimerRef.current), []);
  // A long intro gets the same breathing dots as a mid-song gap, so the column isn't dead before line one.
  const hasIntro = isSynced && lyrics.length > 0 && lyrics[0].time > 4;
  const activeRef = useRef<HTMLButtonElement | null>(null);
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const initialScrollRef = useRef(true);
  // The skeleton appears quickly and, once it is up, stays for a minimum time: it then reads as a
  // deliberate "loading" beat that the lyrics settle out of, instead of a flash.
  const [showSkeleton, setShowSkeleton] = useState(false);
  const skeletonSinceRef = useRef(0);
  useEffect(() => {
    if (isLoading) {
      const t = setTimeout(() => {
        skeletonSinceRef.current = Date.now();
        setShowSkeleton(true);
      }, SKELETON_DELAY_MS);
      return () => clearTimeout(t);
    }
    const left = Math.max(0, SKELETON_MIN_MS - (Date.now() - skeletonSinceRef.current));
    const t = setTimeout(() => setShowSkeleton(false), left);
    return () => clearTimeout(t);
  }, [isLoading]);

  // Back to the top only when the text itself changes (a new song), not when a timing nudge shifts the times.
  const textKey = `${lyrics.length}:${lyrics[0]?.text}`;
  // Plain lyrics start level with the top of the cover. The cover block is centred and its height varies
  // (a long title wraps), so the distance is measured rather than guessed. Null until measured: CSS fallback.
  const [plainTop, setPlainTop] = useState<number | null>(null);
  useEffect(() => {
    const scroller = scrollRef.current;
    const art = scroller?.closest('.noir-now-playing-stage-row')?.querySelector('.noir-now-playing-art-slot');
    if (!scroller || !art) return;
    const measure = () => {
      const gap = art.getBoundingClientRect().top - scroller.getBoundingClientRect().top;
      // Each plain line carries its own ~14px of padding and leading above the glyphs: take it off so the
      // text, not the line box, sits level with the cover.
      setPlainTop(Math.max(0, Math.round(gap) - 14));
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(art);
    ro.observe(scroller);
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    initialScrollRef.current = true;
    scrollRef.current?.scrollTo({ top: 0 });
  }, [textKey]);

  useEffect(() => {
    const container = scrollRef.current;
    const line = activeRef.current;
    if (!isSynced || currentIndex < 0 || !container || !line) return;
    // Scroll only this column (scrollIntoView also nudges every scrolling ancestor) and
    // hold the active line a little above centre, where the eye already is.
    const top = line.offsetTop - container.clientHeight * 0.38 + line.offsetHeight / 2;
    container.scrollTo({ top: Math.max(0, top), behavior: reduced || initialScrollRef.current ? 'auto' : 'smooth' });
    initialScrollRef.current = false;
  }, [currentIndex, isSynced, reduced]);

  return (
    <div
      className="noir-lyrics flex h-full min-h-0 flex-col"
      data-paused={isPlaying ? undefined : 'true'}
      onPointerMove={showTiming ? wakeTiming : undefined}
      onPointerDown={showTiming ? wakeTiming : undefined}
    >
      <div ref={scrollRef} className="noir-lyrics-scroll relative min-h-0 flex-1 overflow-y-auto scrollbar-none px-2 pb-8">
        {isLoading || showSkeleton ? (
          showSkeleton ? (
            // Exact-shape skeleton: bars on the line rhythm, so lyrics land where the bars were.
            <div className="noir-lyrics-skeleton noir-lyrics-enter pt-[min(24vh,220px)]" role="status" aria-label={strings.lyrics.loading}>
              {SKELETON_WIDTHS.map((w, i) => (
                <span key={i} style={{ width: `${w}%`, animationDelay: `${i * 90}ms` }} />
              ))}
            </div>
          ) : null
        ) : lyrics.length === 0 ? (
          // No "not found" message on purpose: the stage simply steps away when a song has no lyrics.
          null
        ) : isSynced ? (
          <div key={textKey} className="noir-lyrics-enter flex flex-col gap-0 pt-[min(24vh,220px)]">
            {hasIntro && (
              <div className={`noir-lyrics-gap${currentIndex < 0 ? ' is-active' : ' is-past'}`} aria-hidden>
                <i /><i /><i />
              </div>
            )}
            {lyrics.map((line, idx) => {
              const active = idx === currentIndex;
              const past = currentIndex >= 0 && idx < currentIndex;
              const distance = currentIndex < 0 ? idx + 1 : Math.abs(idx - currentIndex);
              const state = `${active ? ' is-active' : ''}${past ? ' is-past' : ''}`;
              // Instrumental gap: breathing dots instead of an empty, invisible line.
              if (!line.text.trim()) {
                return (
                  <button
                    key={`${line.time}-${idx}`}
                    type="button"
                    ref={active ? activeRef : null}
                    className={`noir-lyrics-gap elva-focus-ring${state}`}
                    onClick={() => onSeek(line.time)}
                    aria-label={strings.lyrics.instrumental}
                  >
                    <i /><i /><i />
                  </button>
                );
              }
              return (
                <button
                  key={`${line.time}-${idx}`}
                  type="button"
                  ref={active ? activeRef : null}
                  className={`noir-lyrics-line elva-focus-ring${state}`}
                  style={{ '--d': Math.min(distance, 5) } as CSSProperties}
                  onClick={() => onSeek(line.time)}
                >
                  {line.text}
                </button>
              );
            })}
            <div className="h-[min(40vh,360px)] shrink-0" aria-hidden />
          </div>
        ) : (
          // Level with the cover's top; room below so the last line can scroll clear of the bottom fade.
          <div
            key={textKey}
            className="noir-lyrics-enter flex flex-col gap-1 pb-[min(20vh,180px)]"
            style={{ paddingTop: plainTop ?? 'min(12vh, 110px)' }}
          >
            {lyrics.map((line, idx) => (
              <p key={idx} className="noir-lyrics-plain">
                {line.text}
              </p>
            ))}
          </div>
        )}
      </div>
      {showTiming && (
        <div
          className="noir-lyrics-timing"
          data-awake={timingAwake ? 'true' : undefined}
          role="group"
          aria-label="Lyrics timing"
          onFocus={wakeTiming}
        >
          <button type="button" className="elva-focus-ring" onClick={() => onNudge?.(-0.5)} aria-label="Lyrics 0.5 seconds earlier">
            −
          </button>
          <button
            type="button"
            className="noir-lyrics-timing-value elva-focus-ring"
            onClick={onResetOffset}
            aria-label="Reset lyrics timing"
            data-tip="Reset timing"
          >
            {offset > 0 ? '+' : ''}
            {offset.toFixed(1)}s
          </button>
          <button type="button" className="elva-focus-ring" onClick={() => onNudge?.(0.5)} aria-label="Lyrics 0.5 seconds later">
            +
          </button>
        </div>
      )}
    </div>
  );
}
