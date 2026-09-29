import { useEffect, useId, useRef, useState } from 'react';
import { motion } from 'motion/react';
import { Check, Search } from 'lucide-react';
import { strings } from '../../../constants/strings';
import { fetchAppleMusicChart, getCachedChartTracks } from '../../../utils/chartFeeds';
import { executeSearchAPI } from '../../../utils/api/pipedSearch';
import { worldForCollection } from '../../../utils/ditherCover';
import { EASE_PREMIUM, prefersReducedMotion, withReducedMotion } from '../../../utils/motionPresets';
import { normalizeName } from '../../../services/musicGraph/normalize';
import {
  artistsFromChart,
  artistsFromSearch,
  COLD_START_PICK_COUNT,
  seedTasteFromArtists,
  type ColdStartArtist,
} from '../../../services/listening/seedTaste';
import { NoirArtwork } from './NoirArtwork';

export type NoirColdStartProps = {
  onSeeded: () => void;
  onBrowseDiscover?: () => void;
};

function mergeChartArtists(...lists: ColdStartArtist[][]): ColdStartArtist[] {
  const seen = new Set<string>();
  const out: ColdStartArtist[] = [];
  for (const list of lists) {
    for (const artist of list) {
      const key = normalizeName(artist.name) || artist.name.toLowerCase();
      if (!key || seen.has(key)) continue;
      seen.add(key);
      out.push(artist);
      if (out.length >= 12) return out;
    }
  }
  return out;
}

export function NoirColdStart({ onSeeded, onBrowseDiscover }: NoirColdStartProps) {
  const reduced = prefersReducedMotion();
  const searchId = useId();
  const instantCache = mergeChartArtists(
    artistsFromChart(getCachedChartTracks('dk'), 12),
    artistsFromChart(getCachedChartTracks('us'), 12)
  );
  const [suggestions, setSuggestions] = useState<ColdStartArtist[]>(instantCache);
  const [suggestionsLoading, setSuggestionsLoading] = useState(instantCache.length === 0);
  const [query, setQuery] = useState('');
  const [searchHits, setSearchHits] = useState<ColdStartArtist[]>([]);
  const [searching, setSearching] = useState(false);
  const [picked, setPicked] = useState<ColdStartArtist[]>([]);
  const [seeding, setSeeding] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const load = async (store: 'dk' | 'us') => {
        const { tracks } = await fetchAppleMusicChart(store, { timeoutMs: 3500 });
        return artistsFromChart(tracks, 12);
      };

      try {
        let next = await load('dk');
        if (!cancelled && next.length === 0) next = await load('us');
        if (cancelled) return;
        if (next.length > 0) {
          setSuggestions((prev) => (prev.length > 0 ? mergeChartArtists(prev, next) : next));
        }
      } catch {
        /* keep instant cache / empty */
      } finally {
        if (!cancelled) setSuggestionsLoading(false);
      }
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

  const pickedKeys = new Set(picked.map((a) => normalizeName(a.name) || a.name.toLowerCase()));
  const full = picked.length >= COLD_START_PICK_COUNT;

  const toggle = (artist: ColdStartArtist) => {
    const key = normalizeName(artist.name) || artist.name.toLowerCase();
    setError(null);
    setPicked((prev) => {
      if (prev.some((a) => (normalizeName(a.name) || a.name.toLowerCase()) === key)) {
        return prev.filter((a) => (normalizeName(a.name) || a.name.toLowerCase()) !== key);
      }
      if (prev.length >= COLD_START_PICK_COUNT) return prev;
      return [...prev, artist];
    });
  };

  const confirm = async () => {
    if (picked.length < COLD_START_PICK_COUNT || seeding) return;
    setSeeding(true);
    setError(null);
    try {
      await seedTasteFromArtists(picked.map((a) => a.name));
      onSeeded();
    } catch (err) {
      console.warn('[cold-start] seed failed', err);
      setError('Couldn’t build your taste. Try again.');
      setSeeding(false);
    }
  };

  const grid = query.trim().length >= 2 ? searchHits : suggestions;
  const gridLabel =
    query.trim().length >= 2 ? strings.home.coldStartSearch : strings.home.coldStartSuggestions;

  return (
    <motion.div
      className="noir-cold-start mb-10"
      initial={reduced ? false : { opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={withReducedMotion({ duration: 0.36, ease: EASE_PREMIUM })}
    >
      <p className="noir-stats-eyebrow !mb-3 !text-[color:var(--noir-text-tertiary)]">
        {strings.home.coldStartEyebrow}
      </p>
      <h2 className="noir-cold-start-title">{strings.home.coldStartTitle}</h2>
      <p className="noir-cold-start-body">{strings.home.coldStartBody}</p>

      <label className="noir-cold-start-search" htmlFor={searchId}>
        <Search className="h-4 w-4 shrink-0 text-[color:var(--noir-text-tertiary)]" strokeWidth={1.75} />
        <input
          id={searchId}
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={strings.home.coldStartSearch}
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
      </label>

      <div className="noir-cold-start-toolbar">
        <p className="noir-cold-start-label">{gridLabel}</p>
        <p className="noir-cold-start-progress" aria-live="polite">
          {strings.home.coldStartProgress(picked.length, COLD_START_PICK_COUNT)}
        </p>
      </div>

      {suggestionsLoading && query.trim().length < 2 ? (
        <div className="noir-cold-start-grid">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="noir-skeleton noir-cold-start-skel" />
          ))}
        </div>
      ) : grid.length === 0 ? (
        <p className="noir-cold-start-empty">
          {query.trim().length >= 2 ? strings.home.coldStartNoHits : strings.home.coldStartChartsEmpty}
        </p>
      ) : (
        <div className="noir-cold-start-grid">
          {grid.map((artist, i) => {
            const key = normalizeName(artist.name) || artist.name.toLowerCase();
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
                initial={reduced ? false : { opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.28, ease: EASE_PREMIUM, delay: 0.04 + i * 0.02 }}
                whileTap={seeding || locked ? undefined : { scale: 0.96 }}
              >
                <span className="noir-cold-start-artist-art">
                  <NoirArtwork
                    source={artist.image}
                    world={worldForCollection(`cold:${key}`)}
                    seed={`cold-start-${key}`}
                    size={88}
                    radius={999}
                  />
                  {selected && (
                    <span className="noir-cold-start-check" aria-hidden>
                      <Check className="h-3.5 w-3.5" strokeWidth={2.5} />
                    </span>
                  )}
                </span>
                <span className="noir-cold-start-artist-name">{artist.name}</span>
              </motion.button>
            );
          })}
        </div>
      )}

      {error && <p className="noir-cold-start-error">{error}</p>}

      <div className="noir-cold-start-actions">
        <button
          type="button"
          className="noir-button-primary elva-focus-ring"
          disabled={!full || seeding}
          onClick={() => void confirm()}
        >
          {seeding ? strings.home.coldStartSeeding : strings.home.coldStartConfirm}
        </button>
        {onBrowseDiscover && (
          <button
            type="button"
            className="noir-button-secondary elva-focus-ring"
            disabled={seeding}
            onClick={onBrowseDiscover}
          >
            {strings.home.coldStartBrowse}
          </button>
        )}
      </div>
    </motion.div>
  );
}
