import { useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { Pause, Play, Search, X } from 'lucide-react';
import { SearchResult, VerifiedArtist } from '../../../types';
import { strings } from '../../../constants/strings';
import { shouldShowArtistCard } from '../../../utils/apiUtils';
import { getPlaybackSongKey } from '../../../utils/playbackSongKey';
import { isTrackFavorite } from '../../../utils/favoriteUtils';
import { ThemeColors } from '../../themeUtils';
import { SearchLoadingState } from '../../SearchLoadingState';
import { NoirSongRow } from './NoirSongRow';
import { NoirGraphicAccent } from './NoirGraphicAccent';
import { EASE_PREMIUM, prefersReducedMotion } from '../../../utils/motionPresets';

type SearchPanelPhase = 'idle' | 'loading' | 'results' | 'no-results';

export type NoirHomeViewProps = {
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  lastSearchedQuery?: string;
  isSearching: boolean;
  searchResults: SearchResult[];
  recentArtists: VerifiedArtist[];
  recentlyPlayed: SearchResult[];
  favorites?: SearchResult[];
  verifiedArtist: VerifiedArtist | null;
  focusedResultIndex: number;
  loadingSongId: string | null;
  activeSongKey?: string | null;
  isPlaying?: boolean;
  handleViewArtistProfile: (artist: VerifiedArtist) => void;
  handleUrlSubmit: (url: string) => void;
  handleSearch: (overrideQuery?: string) => void;
  handleSelectSong: (track: SearchResult) => void;
  handleAddToQueue: (track: SearchResult) => void;
  handlePlayNext?: (track: SearchResult) => void;
  handleToggleFavorite?: (track: SearchResult) => void;
  theme: ThemeColors;
};

export function NoirHomeView({
  searchQuery,
  setSearchQuery,
  lastSearchedQuery,
  isSearching,
  searchResults,
  recentArtists,
  recentlyPlayed,
  favorites = [],
  verifiedArtist,
  focusedResultIndex,
  loadingSongId,
  activeSongKey = null,
  isPlaying = false,
  handleViewArtistProfile,
  handleUrlSubmit,
  handleSearch,
  handleSelectSong,
  handleAddToQueue,
  handlePlayNext,
  handleToggleFavorite,
}: NoirHomeViewProps) {
  const [localQuery, setLocalQuery] = useState(searchQuery);
  const debounceTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const reduced = prefersReducedMotion();

  // Keep list order stable while on Home after a play — otherwise the clicked
  // row jumps into the hero and vanishes from the list mid-interaction.
  const [stableRecents, setStableRecents] = useState<SearchResult[]>(recentlyPlayed);
  const [listFrozen, setListFrozen] = useState(false);

  const featuredTrack = recentlyPlayed[0] ?? null;
  const featuredKey = featuredTrack ? getPlaybackSongKey(featuredTrack) : null;
  const isFeaturedActive = !!featuredKey && featuredKey === activeSongKey;
  const isFeaturedPlaying = isFeaturedActive && isPlaying;
  const listRecents = useMemo(() => {
    if (listFrozen) return stableRecents.slice(0, 12);
    if (!featuredTrack) return stableRecents.slice(0, 12);
    return stableRecents.filter((t) => t.id !== featuredTrack.id).slice(0, 12);
  }, [stableRecents, featuredTrack, listFrozen]);

  const isTrackPlaying = (track: SearchResult) => {
    const key = getPlaybackSongKey(track);
    return !!key && key === activeSongKey;
  };

  const panelPhase: SearchPanelPhase = useMemo(() => {
    if (isSearching) return 'loading';
    if (lastSearchedQuery?.trim()) {
      if (searchResults.length > 0 || verifiedArtist) return 'results';
      return 'no-results';
    }
    return 'idle';
  }, [isSearching, searchResults.length, lastSearchedQuery, verifiedArtist]);

  useEffect(() => {
    if (panelPhase !== 'idle') {
      setListFrozen(false);
      setStableRecents(recentlyPlayed);
      return;
    }
    if (!listFrozen) {
      setStableRecents(recentlyPlayed);
    }
  }, [recentlyPlayed, panelPhase, listFrozen]);

  useEffect(() => {
    setLocalQuery(searchQuery);
  }, [searchQuery]);

  useEffect(() => {
    return () => {
      if (debounceTimeoutRef.current) clearTimeout(debounceTimeoutRef.current);
    };
  }, []);

  const clearSearch = () => {
    if (debounceTimeoutRef.current) clearTimeout(debounceTimeoutRef.current);
    setLocalQuery('');
    setSearchQuery('');
  };

  const openSearchPalette = () => {
    window.dispatchEvent(new Event('elva-open-search-palette'));
  };

  const playFromHome = (track: SearchResult) => {
    if (panelPhase === 'idle') setListFrozen(true);
    const key = getPlaybackSongKey(track);
    if (key && key === activeSongKey) {
      window.dispatchEvent(new Event('elva-toggle-play'));
      return;
    }
    handleSelectSong(track);
  };

  const showArtistCard =
    panelPhase === 'results' &&
    shouldShowArtistCard(lastSearchedQuery || '') &&
    !!verifiedArtist;

  useEffect(() => {
    if (panelPhase !== 'results' || focusedResultIndex < 0) return;
    const el = document.querySelector(`[data-search-result-index="${focusedResultIndex}"]`);
    el?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  }, [focusedResultIndex, panelPhase, searchResults.length, showArtistCard]);

  const inSearchMode = panelPhase !== 'idle';

  return (
    <div className="relative flex h-full min-h-0 flex-col">
      <div className="flex shrink-0 items-center justify-between gap-3 px-5 pb-3 pt-5">
        <button
          type="button"
          onClick={openSearchPalette}
          className="noir-search-hint elva-focus-ring"
        >
          <Search className="h-3.5 w-3.5 shrink-0" strokeWidth={1.75} />
          <span>Search</span>
          <kbd className="noir-search-trigger-kbd">⌘K</kbd>
        </button>
        {inSearchMode && (
          <button
            type="button"
            onClick={clearSearch}
            className="shrink-0 rounded-full px-3 py-2 text-[13px] font-medium text-[color:var(--noir-text-secondary)] hover:bg-white/[0.06] hover:text-white elva-focus-ring"
          >
            Back to Home
          </button>
        )}
      </div>

      {panelPhase === 'idle' && featuredTrack ? (
        <div className="noir-home-hero-wrap shrink-0 px-5 pt-2">
          <button
            type="button"
            onClick={() => playFromHome(featuredTrack)}
            className="noir-home-hero group relative z-[1] h-[min(42vh,380px)] w-full overflow-hidden rounded-[var(--noir-radius-xl)] text-left elva-focus-ring"
          >
            <AnimatePresence mode="sync" initial={false}>
              <motion.img
                key={featuredTrack.id || featuredTrack.thumbnail}
                src={featuredTrack.thumbnail}
                alt=""
                className="absolute inset-0 h-full w-full object-cover"
                initial={reduced ? { opacity: 0 } : { opacity: 0, scale: 1.04 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={reduced ? { opacity: 0 } : { opacity: 0, scale: 1.06 }}
                transition={{ duration: reduced ? 0.2 : 0.45, ease: EASE_PREMIUM }}
              />
            </AnimatePresence>
            <div className="noir-hero-overlay absolute inset-0" />
            <div className="noir-hero-overlay-side absolute inset-0" />
            <div className="noir-hero-grain" aria-hidden />
            <div className="noir-hero-vignette" aria-hidden />

            <div className="absolute bottom-0 left-0 max-w-2xl px-7 pb-8 pt-16">
              <AnimatePresence mode="wait" initial={false}>
                <motion.div
                  key={featuredTrack.id || featuredTrack.title}
                  initial={reduced ? { opacity: 0 } : { opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={reduced ? { opacity: 0 } : { opacity: 0, y: -8 }}
                  transition={{ duration: reduced ? 0.15 : 0.32, ease: EASE_PREMIUM }}
                >
                  <h1 className="text-[clamp(1.75rem,4.5vw,3.25rem)] font-semibold leading-[1.05] tracking-[-0.03em] text-white">
                    {featuredTrack.title}
                  </h1>
                  <p className="mt-2 text-[clamp(0.95rem,1.8vw,1.2rem)] text-white/55">
                    {featuredTrack.artist}
                  </p>
                </motion.div>
              </AnimatePresence>
              <span
                className={`mt-5 inline-flex items-center gap-2 rounded-full px-4 py-2 text-[13px] font-medium text-white transition-colors ${
                  isFeaturedPlaying
                    ? 'bg-white/18 group-hover:bg-white/22'
                    : 'bg-white/10 group-hover:bg-white/15'
                }`}
              >
                {isFeaturedPlaying ? (
                  <Pause className="h-3.5 w-3.5 fill-current" />
                ) : (
                  <Play className="h-3.5 w-3.5 fill-current" />
                )}
                {isFeaturedPlaying ? 'Now playing' : isFeaturedActive ? 'Resume' : 'Play'}
              </span>
            </div>
          </button>
        </div>
      ) : null}

      <div className="relative z-[1] min-h-0 flex-1 overflow-y-auto scrollbar-none">
        <AnimatePresence mode="wait">
          {panelPhase === 'idle' && (
            <motion.div
              key="home-idle"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="relative px-6 py-6"
            >
              {!featuredTrack && (
                <div className="relative mb-10 max-w-lg">
                  <NoirGraphicAccent graphic="halftoneCloud" className="noir-accent-halftone-empty" />
                  <h2 className="relative text-[1.75rem] font-semibold leading-tight tracking-[-0.03em] text-[color:var(--noir-text-primary)]">
                    Find something to play
                  </h2>
                  <p className="mt-2 text-[15px] text-[color:var(--noir-text-secondary)]">
                    Press ⌘K anytime to search — works from every page.
                  </p>
                </div>
              )}

              {listRecents.length > 0 && (
                <section className="mb-10">
                  <h2 className="mb-3 px-1 text-[16px] font-semibold text-[color:var(--noir-text-primary)]">
                    Recently played
                  </h2>
                  <div className="flex flex-col gap-0.5">
                    {listRecents.map((track) => (
                      <motion.div
                        key={track.id}
                        layout={!reduced}
                        transition={{ duration: 0.32, ease: EASE_PREMIUM }}
                      >
                        <NoirSongRow
                          track={track}
                          isLoading={loadingSongId === track.id}
                          isPlaying={isTrackPlaying(track) && isPlaying}
                          isFavorite={isTrackFavorite(favorites, track)}
                          onPlay={() => playFromHome(track)}
                          onAddToQueue={handleAddToQueue}
                          onPlayNext={handlePlayNext}
                          onToggleFavorite={handleToggleFavorite}
                        />
                      </motion.div>
                    ))}
                  </div>
                </section>
              )}

              {recentArtists.length > 0 && (
                <section>
                  <h2 className="mb-4 px-1 text-[16px] font-semibold text-[color:var(--noir-text-primary)]">
                    Artists
                  </h2>
                  <div className="flex gap-5 overflow-x-auto pb-2 scrollbar-none">
                    {recentArtists.slice(0, 12).map((artist) => (
                      <button
                        key={artist.id || artist.name}
                        type="button"
                        onClick={() => handleViewArtistProfile(artist)}
                        className="w-[84px] shrink-0 text-left elva-focus-ring"
                      >
                        <div className="noir-art aspect-square w-full overflow-hidden bg-[color:var(--noir-gray-dark)]">
                          <img src={artist.thumbnail} alt="" className="h-full w-full object-cover" />
                        </div>
                        <p className="mt-2 truncate text-[12px] text-[color:var(--noir-text-primary)]">
                          {artist.name}
                        </p>
                      </button>
                    ))}
                  </div>
                </section>
              )}
            </motion.div>
          )}

          {panelPhase === 'loading' && (
            <motion.div key="loading" className="px-6 py-16">
              <SearchLoadingState />
            </motion.div>
          )}

          {panelPhase === 'results' && (
            <motion.div key="results" className="px-6 py-6">
              <p className="mb-5 px-1 text-[14px] text-[color:var(--noir-text-secondary)]">
                Results for &ldquo;{lastSearchedQuery}&rdquo;
              </p>
              {showArtistCard && verifiedArtist && (
                <button
                  type="button"
                  data-search-result-index={0}
                  onClick={() => handleViewArtistProfile(verifiedArtist)}
                  className="noir-track-row mb-1 flex w-full items-center gap-4 px-3 py-3 text-left"
                >
                  <img src={verifiedArtist.thumbnail} alt="" className="noir-art h-12 w-12 object-cover" />
                  <div>
                    <p className="text-[14px] font-medium text-[color:var(--noir-text-primary)]">
                      {verifiedArtist.name}
                    </p>
                    <p className="text-[13px] text-[color:var(--noir-text-secondary)]">Artist</p>
                  </div>
                </button>
              )}
              <div className="flex flex-col gap-0.5">
                {searchResults.map((result, index) => {
                  const actualIndex = showArtistCard ? index + 1 : index;
                  return (
                    <NoirSongRow
                      key={result.id}
                      track={result}
                      dataIndex={actualIndex}
                      isFocused={focusedResultIndex === actualIndex}
                      isLoading={loadingSongId === result.id}
                      isFavorite={isTrackFavorite(favorites, result)}
                      onPlay={() => handleSelectSong(result)}
                      onAddToQueue={handleAddToQueue}
                      onPlayNext={handlePlayNext}
                      onToggleFavorite={handleToggleFavorite}
                    />
                  );
                })}
              </div>
              {focusedResultIndex >= 0 && (
                <p className="mt-6 px-1 text-[12px] text-[color:var(--noir-text-tertiary)]">
                  {strings.search.keyboardHint}
                </p>
              )}
            </motion.div>
          )}

          {panelPhase === 'no-results' && (
            <motion.div key="empty" className="px-6 py-20">
              <p className="text-[color:var(--noir-text-secondary)]">No results for &ldquo;{lastSearchedQuery}&rdquo;</p>
              <button
                type="button"
                onClick={clearSearch}
                className="mt-4 rounded-full px-3 py-1.5 text-[13px] text-[color:var(--noir-text-tertiary)] hover:bg-white/[0.05] hover:text-white"
              >
                Back to Home
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
