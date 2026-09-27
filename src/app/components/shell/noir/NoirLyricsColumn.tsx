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
  const initialScrollRef = useRef(true);

  useEffect(() => {
    initialScrollRef.current = true;
  }, [lyrics]);

  useEffect(() => {
    if (!isSynced || currentIndex < 0 || !activeRef.current) return;
    activeRef.current.scrollIntoView({
      behavior: reduced || initialScrollRef.current ? 'auto' : 'smooth',
      block: 'center',
    });
    initialScrollRef.current = false;
  }, [currentIndex, isSynced, reduced]);

  return (
    <div className="noir-lyrics flex h-full min-h-0 flex-col">
      <div className="noir-lyrics-scroll min-h-0 flex-1 overflow-y-auto px-2 pb-8">
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
          <div className="flex flex-col gap-0.5 pt-4">
            {lyrics.map((line, idx) => {
              const active = idx === currentIndex;
              return (
                <button
                  key={`${line.time}-${idx}`}
                  type="button"
                  ref={active ? activeRef : null}
                  className={`noir-lyrics-line elva-focus-ring ${active ? 'is-active' : ''}`}
                  onClick={() => onSeek(line.time)}
                >
                  {line.text || ' '}
                </button>
              );
            })}
            <div className="h-[40%] shrink-0" aria-hidden />
          </div>
        ) : (
          <div className="flex flex-col gap-1 pt-1">
            {!isSynced && (
              <span className="noir-lyrics-badge mb-2 px-1">{strings.lyrics.plain}</span>
            )}
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
