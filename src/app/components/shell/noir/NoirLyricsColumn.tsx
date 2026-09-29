import { useEffect, useRef } from 'react';
import type { LyricLine } from '../../../types';
import { prefersReducedMotion } from '../../../utils/motionPresets';
import { strings } from '../../../constants/strings';

export type NoirLyricsColumnProps = {
  lyrics: LyricLine[];
  isLoading: boolean;
  isSynced: boolean;
  currentIndex: number;
  onSeek?: (time: number) => void;
};

function seekViaShell(time: number) {
  window.dispatchEvent(new CustomEvent('elva-seek', { detail: { time } }));
}

/** Lyrics list for the Now Playing side panel (queue header owns the title). */
export function NoirLyricsColumn({
  lyrics,
  isLoading,
  isSynced,
  currentIndex,
  onSeek = seekViaShell,
}: NoirLyricsColumnProps) {
  const reduced = prefersReducedMotion();
  const activeRef = useRef<HTMLButtonElement | null>(null);
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const initialScrollRef = useRef(true);

  useEffect(() => {
    initialScrollRef.current = true;
  }, [lyrics]);

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
    <div className="noir-lyrics flex h-full min-h-0 flex-col">
      <div ref={scrollRef} className="noir-lyrics-scroll relative min-h-0 flex-1 overflow-y-auto scrollbar-none px-2 pb-8">
        {isLoading ? (
          <p className="px-1 pt-6 text-[14px] text-[color:var(--noir-text-tertiary)]">
            {strings.lyrics.loading}
          </p>
        ) : lyrics.length === 0 ? (
          <div className="px-1 pt-6">
            <p className="text-[15px] font-medium text-[color:var(--noir-text-secondary)]">
              {strings.lyrics.empty}
            </p>
            <p className="mt-1.5 text-[13px] leading-[1.45] text-[color:var(--noir-text-tertiary)]">
              {strings.lyrics.emptyHint}
            </p>
          </div>
        ) : isSynced ? (
          <div className="flex flex-col gap-0 pt-[min(24vh,220px)]">
            {lyrics.map((line, idx) => {
              const active = idx === currentIndex;
              const past = currentIndex >= 0 && idx < currentIndex;
              return (
                <button
                  key={`${line.time}-${idx}`}
                  type="button"
                  ref={active ? activeRef : null}
                  className={`noir-lyrics-line elva-focus-ring${active ? ' is-active' : ''}${past ? ' is-past' : ''}`}
                  onClick={() => onSeek(line.time)}
                >
                  {line.text || ' '}
                </button>
              );
            })}
            <div className="h-[min(40vh,360px)] shrink-0" aria-hidden />
          </div>
        ) : (
          <div className="flex flex-col gap-1 pt-1">
            {lyrics.map((line, idx) => (
              <p key={idx} className="noir-lyrics-plain">
                {line.text}
              </p>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
