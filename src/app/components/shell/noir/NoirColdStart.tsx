import { useEffect, useId, useRef, useState, type CSSProperties } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { Check, X } from 'lucide-react';
import { strings } from '../../../constants/strings';
import { fetchAppleMusicChart, getCachedChartTracks } from '../../../utils/chartFeeds';
import { executeSearchAPI } from '../../../utils/api/pipedSearch';
import { worldForCollection } from '../../../utils/ditherCover';
import { EASE_PREMIUM, MOTION, prefersReducedMotion, withReducedMotion } from '../../../utils/motionPresets';
import { normalizeName } from '../../../services/musicGraph/normalize';
import { getArtistImage } from '../../../services/musicGraph';
import {
  artistsFromChart,
  artistsFromSearch,
  COLD_START_MAX_ARTISTS,
  enrichSeedTaste,
  seedTasteFromArtists,
  type ColdStartArtist,
} from '../../../services/listening/seedTaste';
import { warmHome } from '../../../services/listening/warmHome';
import { NoirArtwork } from './NoirArtwork';
import { NoirSeedSign } from './NoirSeedSign';
import { NoirSearchGlyph } from './NoirSearchGlyph';

export type NoirColdStartProps = {
  onSeeded: () => void;
  onBrowseDiscover?: () => void;
};

/** Suggestions pool from both charts; shown a page at a time. */
const POOL_SIZE = 36;
/** Grid tiles: min width + gap must match `.noir-cold-start-grid`. Rows always fill, so no dangling last row. */
const TILE_MIN = 128;
const TILE_GAP = 12;
const START_ROWS = 2;
/** Narrow screens get extra rows so the first page still offers a real choice. */
const START_MIN_TILES = 10;
const MORE_ROWS = 2;
const AVATAR_STACK = 5;
/** A portrait that hasn't answered by then falls back to the chart cover. */
const PORTRAIT_TIMEOUT_MS = 2500;

const artistKey = (artist: ColdStartArtist) => normalizeName(artist.name) || artist.name.toLowerCase();

function mergeArtists(...lists: ColdStartArtist[][]): ColdStartArtist[] {
  const seen = new Set<string>();
  const out: ColdStartArtist[] = [];
  for (const list of lists) {
    for (const artist of list) {
      const key = artistKey(artist);
      if (!key || seen.has(key)) continue;
      seen.add(key);
      out.push(artist);
      if (out.length >= POOL_SIZE) return out;
    }
  }
  return out;
}

/** Take turns between lists so the first page mixes local and global charts. */
function alternate<T>(...lists: T[][]): T[] {
  const out: T[] = [];
  const longest = Math.max(0, ...lists.map((list) => list.length));
  for (let i = 0; i < longest; i++) for (const list of lists) if (list[i]) out.push(list[i]);
  return out;
}

/** Your own country first, then the big global charts. */
function chartStores(): string[] {
  let home = 'dk';
  try {
    home = localStorage.getItem('elva_profile_country') || 'dk';
  } catch {
    /* private mode */
  }
  return [...new Set([home, 'us', 'gb'])];
}

export function NoirColdStart({ onSeeded, onBrowseDiscover }: NoirColdStartProps) {
  const reduced = prefersReducedMotion();
  const searchId = useId();
  const [suggestions, setSuggestions] = useState<ColdStartArtist[]>(() =>
    mergeArtists(alternate(...chartStores().map((store) => artistsFromChart(getCachedChartTracks(store), POOL_SIZE))))
  );
  const [suggestionsLoading, setSuggestionsLoading] = useState(suggestions.length === 0);
  const [rows, setRows] = useState(START_ROWS);
  const rootRef = useRef<HTMLDivElement>(null);
  const [rootWidth, setRootWidth] = useState(0);
  const [query, setQuery] = useState('');
  const [searchHits, setSearchHits] = useState<ColdStartArtist[]>([]);
  const [searching, setSearching] = useState(false);
  const [picked, setPicked] = useState<ColdStartArtist[]>([]);
  const [seeding, setSeeding] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  /** Artist portraits (D1: artists show as themselves). undefined = resolving, null = none found. */
  const [portraits, setPortraits] = useState<Record<string, string | null>>({});
  const requestedRef = useRef(new Set<string>());

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const load = async (store: string) => {
        try {
          const { tracks } = await fetchAppleMusicChart(store, { timeoutMs: 5000 });
          return artistsFromChart(tracks, POOL_SIZE);
        } catch {
          return [];
        }
      };
      const lists = await Promise.all(chartStores().map(load));
      if (cancelled) return;
      const next = alternate(...lists);
      // Keep what's already on screen in place; new artists join after it.
      if (next.length > 0) setSuggestions((prev) => mergeArtists(prev, next));
      setSuggestionsLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    const q = query.trim();
    if (q.length < 2) {
      setSearchHits([]);
      setSearching(false);
      return;
    }
    setSearching(true);
    debounceRef.current = setTimeout(() => {
      void (async () => {
        try {
          const results = await executeSearchAPI(q, 12);
          setSearchHits(artistsFromSearch(results, 8));
        } catch {
          setSearchHits([]);
        } finally {
          setSearching(false);
        }
      })();
    }, 280);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== '/' || e.metaKey || e.ctrlKey || e.altKey) return;
      const target = e.target as HTMLElement | null;
      if (target?.closest('input, textarea, [contenteditable="true"]')) return;
      // On first run "/" means this search, not the global palette.
      e.preventDefault();
      e.stopImmediatePropagation();
      searchRef.current?.focus();
    };
    window.addEventListener('keydown', onKey, true);
    return () => window.removeEventListener('keydown', onKey, true);
  }, []);

  useEffect(() => {
    const el = rootRef.current;
    if (!el) return;
    const measure = () => setRootWidth(el.clientWidth);
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const cols = Math.max(2, Math.floor((rootWidth + TILE_GAP) / (TILE_MIN + TILE_GAP)) || 4);
  // Whole rows only: 7 columns x 3 rows, never 7 + 7 + 4.
  const capacity = Math.max(rows, Math.ceil(START_MIN_TILES / cols)) * cols;
  const fullRows = Math.floor(suggestions.length / cols) * cols;
  const visibleCount = Math.min(capacity, fullRows > 0 ? fullRows : suggestions.length);

  const searchMode = query.trim().length >= 2;
  // Picks made through search stay visible (and removable) once the search is cleared.
  const pickedOffGrid = picked.filter((a) => !suggestions.some((s) => artistKey(s) === artistKey(a)));
  const grid = searchMode ? searchHits : [...pickedOffGrid, ...suggestions.slice(0, visibleCount)];
  const canShowMore = !searchMode && !suggestionsLoading && suggestions.length > visibleCount && fullRows > visibleCount;

  useEffect(() => {
    for (const artist of grid) {
      const key = artistKey(artist);
      if (requestedRef.current.has(key)) continue;
      requestedRef.current.add(key);
      const timeout = new Promise<undefined>((resolve) => setTimeout(() => resolve(undefined), PORTRAIT_TIMEOUT_MS));
      void Promise.race([getArtistImage(artist.name).catch(() => undefined), timeout]).then((url) =>
        setPortraits((prev) => ({ ...prev, [key]: url ?? null }))
      );
    }
  }, [grid.map(artistKey).join('|')]);

  const imageFor = (artist: ColdStartArtist) => {
    const portrait = portraits[artistKey(artist)];
    return portrait === undefined ? undefined : portrait ?? artist.image;
  };

  const pickedKeys = new Set(picked.map(artistKey));
  const full = picked.length >= COLD_START_MAX_ARTISTS;

  const toggle = (artist: ColdStartArtist) => {
    const key = artistKey(artist);
    setError(null);
    setPicked((prev) => {
      if (prev.some((a) => artistKey(a) === key)) return prev.filter((a) => artistKey(a) !== key);
      if (prev.length >= COLD_START_MAX_ARTISTS) return prev;
      return [...prev, artist];
    });
  };

  const confirm = async () => {
    if (picked.length === 0 || seeding) return;
    const names = picked.map((a) => a.name);
    setSeeding(true);
    setError(null);
    // Music first: the station starts building while Home takes over.
    window.dispatchEvent(new CustomEvent('noir-cold-start-play', { detail: { artists: names } }));
    try {
      await seedTasteFromArtists(names);
      // Home and Discover fill in while the takeover is still up, so both open ready.
      await warmHome();
      window.dispatchEvent(new Event('noir-cold-start-warm'));
      onSeeded();
      void enrichSeedTaste(names).catch((err) => console.warn('[cold-start] enrich failed', err));
    } catch (err) {
      console.warn('[cold-start] seed failed', err);
      window.dispatchEvent(new Event('noir-cold-start-failed'));
      setError('Couldn’t save your picks. Try again.');
      setSeeding(false);
    }
  };

  return (
    <div
      className="noir-cold-start"
      ref={rootRef}
      style={{ '--cold-cols': cols } as CSSProperties}
    >
      {onBrowseDiscover && (
        <button
          type="button"
          className="noir-cold-start-skip elva-focus-ring"
          disabled={seeding}
          onClick={onBrowseDiscover}
        >
          {strings.home.coldStartBrowse}
        </button>
      )}

      <div className="noir-cold-start-head">
        {/* The intro: a halftone seed that turns into place, then fills out as you pick. */}
        <NoirSeedSign picks={picked.length} className="noir-cold-start-sign" />
        <h2 className="noir-cold-start-title">{strings.home.coldStartTitle}</h2>
        <p className="noir-cold-start-body">{strings.home.coldStartBody}</p>
        <label className="noir-cold-start-search" htmlFor={searchId}>
          <span className="noir-cold-start-search-glyph">
            <NoirSearchGlyph size={18} />
          </span>
          <input
            ref={searchRef}
            id={searchId}
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Escape' && query) {
                e.stopPropagation();
                setQuery('');
              }
            }}
            placeholder={strings.home.coldStartSearch}
            aria-label={strings.home.coldStartSearch}
            autoComplete="off"
            disabled={seeding}
            className="noir-cold-start-input"
          />
          {searching && (
            <span
              className="h-3.5 w-3.5 shrink-0 animate-spin rounded-full border border-white/20 border-t-white/70"
              aria-hidden
            />
          )}
          {query ? (
            <button
              type="button"
              className="noir-cold-start-clear elva-focus-ring"
              aria-label="Clear search"
              onClick={() => {
                setQuery('');
                searchRef.current?.focus();
              }}
            >
              <X className="h-4 w-4" strokeWidth={1.75} />
            </button>
          ) : (
            <kbd className="noir-cold-start-kbd" aria-hidden>
              /
            </kbd>
          )}
        </label>
      </div>

      <div className="noir-cold-start-toolbar">
        <p className="noir-cold-start-label">
          {searchMode ? strings.home.coldStartResults : strings.home.coldStartSuggestions}
        </p>
      </div>

      {suggestionsLoading && !searchMode && grid.length === 0 ? (
        <div className="noir-cold-start-grid" aria-hidden>
          {Array.from({ length: Math.max(START_ROWS, Math.ceil(START_MIN_TILES / cols)) * cols }).map((_, i) => (
            <div key={i} className="noir-cold-start-skel">
              <span className="noir-skeleton noir-cold-start-skel-art" />
              <span className="noir-skeleton noir-cold-start-skel-name" />
            </div>
          ))}
        </div>
      ) : grid.length === 0 ? (
        <p className="noir-cold-start-empty">
          {searchMode && !searching ? strings.home.coldStartNoHits : searchMode ? '' : strings.home.coldStartChartsEmpty}
        </p>
      ) : (
        <div className="noir-cold-start-grid noir-stagger-rows">
          {grid.map((artist) => {
            const key = artistKey(artist);
            const selected = pickedKeys.has(key);
            const locked = full && !selected;
            return (
              <motion.button
                key={key}
                type="button"
                disabled={seeding || locked}
                onClick={() => toggle(artist)}
                className="noir-cold-start-artist elva-focus-ring"
                data-selected={selected ? 'true' : 'false'}
                aria-pressed={selected}
                whileTap={seeding || locked || reduced ? undefined : { scale: 0.96 }}
                transition={MOTION.tap}
              >
                <span className="noir-cold-start-artist-art">
                  <NoirArtwork
                    source={imageFor(artist)}
                    pending={portraits[key] === undefined}
                    world={worldForCollection(`cold:${key}`)}
                    seed={`cold-start-${key}`}
                    size={112}
                    radius={999}
                  />
                  <AnimatePresence>
                    {selected && (
                      <motion.span
                        className="noir-cold-start-check"
                        aria-hidden
                        initial={reduced ? { opacity: 0 } : { opacity: 0, scale: 0.4 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: reduced ? 1 : 0.6, transition: { duration: 0.12 } }}
                        transition={reduced ? { duration: 0.1 } : { type: 'spring', stiffness: 520, damping: 26 }}
                      >
                        <Check className="h-3.5 w-3.5" strokeWidth={2.5} />
                      </motion.span>
                    )}
                  </AnimatePresence>
                </span>
                <span className="noir-cold-start-artist-name">{artist.name}</span>
              </motion.button>
            );
          })}
        </div>
      )}

      {canShowMore && (
        <button
          type="button"
          className="noir-button-secondary noir-cold-start-more elva-focus-ring"
          onClick={() => setRows((n) => n + MORE_ROWS)}
        >
          {strings.home.coldStartMore}
        </button>
      )}

      {/* Always reachable, whatever you scrolled or searched: who you picked, and go. */}
      <div className="noir-cold-start-bar" data-ready={picked.length > 0 ? 'true' : 'false'}>
        <div className="noir-cold-start-bar-picks" aria-live="polite">
          <span className="noir-cold-start-avatars" aria-hidden>
            <AnimatePresence initial={false}>
              {picked.slice(-AVATAR_STACK).map((artist) => (
                <motion.span
                  key={artistKey(artist)}
                  className="noir-cold-start-avatar"
                  layout={!reduced}
                  initial={reduced ? { opacity: 0 } : { opacity: 0, scale: 0.5 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: reduced ? 1 : 0.5, transition: { duration: 0.12 } }}
                  transition={withReducedMotion({ duration: 0.28, ease: EASE_PREMIUM })}
                >
                  <NoirArtwork
                    source={imageFor(artist)}
                    world={worldForCollection(`cold:${artistKey(artist)}`)}
                    seed={`cold-start-${artistKey(artist)}`}
                    size={28}
                    radius={999}
                  />
                </motion.span>
              ))}
            </AnimatePresence>
          </span>
          <span className="noir-cold-start-count">{strings.home.coldStartPicked(picked.length)}</span>
        </div>
        {error && <p className="noir-cold-start-error">{error}</p>}
        <button
          type="button"
          className="noir-button-primary elva-focus-ring"
          disabled={picked.length === 0 || seeding}
          onClick={() => void confirm()}
        >
          {seeding ? strings.home.coldStartSeeding : strings.home.coldStartConfirm(picked.length)}
        </button>
      </div>
    </div>
  );
}
