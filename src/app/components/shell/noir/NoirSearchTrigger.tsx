import { strings } from '../../../constants/strings';

const IS_MAC = typeof navigator !== 'undefined' && /Mac|iPhone|iPad/.test(navigator.platform || navigator.userAgent);

/** Hand-drawn magnifier: thin ring, short round-capped handle. Matches the 1.5px NOIR icon weight. */
export function NoirSearchGlyph({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none" aria-hidden>
      <circle cx="7" cy="7" r="4.75" stroke="currentColor" strokeWidth="1.5" />
      <path d="M10.6 10.6 13.5 13.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

/** Reads as a real field so search is findable without knowing ⌘K; opens the palette. */
export function NoirSearchTrigger({ onOpen }: { onOpen: () => void }) {
  return (
    <button type="button" onClick={onOpen} className="noir-search-trigger elva-focus-ring" aria-label={strings.search.open}>
      <NoirSearchGlyph />
      <span className="noir-search-trigger-label">{strings.search.placeholder}</span>
      <kbd className="noir-search-trigger-kbd" aria-hidden>
        {IS_MAC ? '⌘K' : 'Ctrl K'}
      </kbd>
    </button>
  );
}
