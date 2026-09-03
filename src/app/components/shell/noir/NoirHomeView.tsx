import { useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { Play, Search, Upload, X } from 'lucide-react';
import { SearchResult, VerifiedArtist } from '../../../types';
import { strings } from '../../../constants/strings';
import { shouldShowArtistCard } from '../../../utils/apiUtils';
import { ThemeColors } from '../../themeUtils';
import { SearchLoadingState } from '../../SearchLoadingState';
import { NoirSongRow } from './NoirSongRow';
import { NoirGraphicAccent } from './NoirGraphicAccent';

type SearchPanelPhase = 'idle' | 'loading' | 'results' | 'no-results';

export type NoirHomeViewProps = {
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  lastSearchedQuery?: string;
  isSearching: boolean;
  searchResults: SearchResult[];
  recentArtists: VerifiedArtist[];
  recentlyPlayed: SearchResult[];
  verifiedArtist: VerifiedArtist | null;
  focusedResultIndex: number;
  loadingSongId: string | null;
  handleViewArtistProfile: (artist: VerifiedArtist) => void;
  handleUrlSubmit: (url: string) => void;
  handleSearch: (overrideQuery?: string) => void;
  handleSelectSong: (track: SearchResult) => void;
  handleAddToQueue: (track: SearchResult) => void;
  handlePlayNext?: (track: SearchResult) => void;
  handleFileSelect: (e: React.ChangeEvent<HTMLInputElement>) => void;
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
  verifiedArtist,
  focusedResultIndex,
  loadingSongId,
  handleViewArtistProfile,
  handleUrlSubmit,
  handleSearch,
  handleSelectSong,
  handleAddToQueue,
  handlePlayNext,
  handleFileSelect,
}: NoirHomeViewProps) {
  const [localQuery, setLocalQuery] = useState(searchQuery);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const debounceTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const featuredTrack = recentlyPlayed[0] ?? null;
  const listRecents = recentlyPlayed.slice(featuredTrack ? 1 : 0, 12);

  useEffect(() => {
    setLocalQuery(searchQuery);
  }, [searchQuery]);

  useEffect(() => {
    return () => {
      if (debounceTimeoutRef.current) clearTimeout(debounceTimeoutRef.current);
    };
  }, []);

  const debounceSetSearchQuery = (val: string) => {
    if (debounceTimeoutRef.current) clearTimeout(debounceTimeoutRef.current);
    debounceTimeoutRef.current = setTimeout(() => setSearchQuery(val), 300);
  };

  const panelPhase: SearchPanelPhase = useMemo(() => {
    if (isSearching) return 'loading';
    if (lastSearchedQuery?.trim()) {
      if (searchResults.length > 0 || verifiedArtist) return 'results';
      return 'no-results';
    }
    return 'idle';
  }, [isSearching, searchResults.length, lastSearchedQuery, verifiedArtist]);

  const showArtistCard =
    panelPhase === 'results' &&
    shouldShowArtistCard(lastSearchedQuery || '') &&
    !!verifiedArtist;

  useEffect(() => {
    if (panelPhase !== 'results' || focusedResultIndex < 0) return;
    const el = document.querySelector(`[data-search-result-index="${focusedResultIndex}"]`);
    el?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  }, [focusedResultIndex, panelPhase, searchResults.length, showArtistCard]);

  const submitSearch = (query: string) => {
    if (debounceTimeoutRef.current) clearTimeout(debounceTimeoutRef.current);
    setSearchQuery(query);
    if (query.match(/^https?:\/\//)) {
      handleUrlSubmit(query);
    } else {
      handleSearch(query);
    }
  };

  const searchBar = (
    <div className="noir-search-field-wrap w-full max-w-[380px]">
      <Search className="h-4 w-4 shrink-0 text-[color:var(--noir-text-tertiary)]" strokeWidth={1.5} />
      <input
        id="search-input"
        type="text"
        value={localQuery}
        onChange={(e) => {
          const val = e.target.value;
          setLocalQuery(val);
          debounceSetSearchQuery(val);
        }}
        onKeyDown={(e) => {
          if (e.key === 'Enter') submitSearch(localQuery);
        }}
        placeholder="Search or paste a link"
        autoComplete="off"
        className="noir-search-field h-full min-w-0 flex-1 text-[14px] text-[color:var(--noir-text-primary)] placeholder:text-[color:var(--noir-text-tertiary)]"
      />
      {localQuery && (
        <button
          type="button"
          onClick={() => {
            setLocalQuery('');
            setSearchQuery('');
          }}
          className="rounded-full p-1 text-[color:var(--noir-text-tertiary)] hover:bg-white/[0.06] hover:text-white"
          aria-label="Clear"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      )}
      <button
        type="button"
        onClick={() => fileInputRef.current?.click()}
        className="rounded-full p-1 text-[color:var(--noir-text-tertiary)] hover:bg-white/[0.06] hover:text-white"
        aria-label="Upload"
      >
        <Upload className="h-3.5 w-3.5" strokeWidth={1.5} />
      </button>
      <input ref={fileInputRef} type="file" accept="audio/*" onChange={handleFileSelect} className="hidden" />
    </div>
  );

  return (
    <div className="relative flex h-full min-h-0 flex-col">
      {panelPhase === 'idle' && featuredTrack ? (
        <div className="noir-home-hero-wrap shrink-0 px-5 pt-5">
          <button
            type="button"
            onClick={() => handleSelectSong(featuredTrack)}
            className="noir-home-hero group relative z-[1] h-[min(42vh,380px)] w-full overflow-hidden rounded-[var(--noir-radius-xl)] text-left elva-focus-ring"
          >
            <img
              src={featuredTrack.thumbnail}
              alt=""
              className="absolute inset-0 h-full w-full object-cover"
            />
            <div className="noir-hero-overlay absolute inset-0" />
            <div className="noir-hero-overlay-side absolute inset-0" />
            <div className="noir-hero-grain" aria-hidden />
            <div className="noir-hero-vignette" aria-hidden />

            <div className="absolute inset-x-0 top-0 flex justify-end px-5 py-5">
              <div onClick={(e) => e.stopPropagation()}>{searchBar}</div>
            </div>

            <div className="absolute bottom-0 left-0 max-w-2xl px-7 pb-8 pt-16">
              <h1 className="text-[clamp(1.75rem,4.5vw,3.25rem)] font-semibold leading-[1.05] tracking-[-0.03em] text-white">
                {featuredTrack.title}
              </h1>
              <p className="mt-2 text-[clamp(0.95rem,1.8vw,1.2rem)] text-white/55">{featuredTrack.artist}</p>
              <span className="mt-5 inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-2 text-[13px] font-medium text-white transition-colors group-hover:bg-white/15">
                <Play className="h-3.5 w-3.5 fill-current" />
                Play
              </span>
            </div>
          </button>
        </div>
      ) : (
        <div className="flex shrink-0 items-center justify-between gap-6 px-6 py-5">
          <h1 className="text-[22px] font-semibold tracking-[-0.02em] text-[color:var(--noir-text-primary)]">
            {panelPhase === 'results' ? 'Search' : 'Home'}
          </h1>
          {searchBar}
        </div>
      )}

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
                    Search for music
                  </h2>
                  <p className="mt-2 text-[15px] text-[color:var(--noir-text-secondary)]">
                    Find tracks, paste a link, or upload a file.
                  </p>
                </div>
              )}

              {listRecents.length > 0 && (
                <section className="mb-10">
                  <h2 className="mb-3 px-1 text-[15px] font-semibold text-[color:var(--noir-text-primary)]">
                    Recently played
                  </h2>
                  <div className="flex flex-col gap-0.5">
                    {listRecents.map((track) => (
                      <NoirSongRow
                        key={track.id}
                        track={track}
                        isLoading={loadingSongId === track.id}
                        onPlay={() => handleSelectSong(track)}
                        onAddToQueue={handleAddToQueue}
                        onPlayNext={handlePlayNext}
                      />
                    ))}
                  </div>
                </section>
              )}

              {recentArtists.length > 0 && (
                <section>
                  <h2 className="mb-4 px-1 text-[15px] font-semibold text-[color:var(--noir-text-primary)]">
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
                {lastSearchedQuery}
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
                      onPlay={() => handleSelectSong(result)}
                      onAddToQueue={handleAddToQueue}
                      onPlayNext={handlePlayNext}
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
                onClick={() => {
                  setLocalQuery('');
                  setSearchQuery('');
                }}
                className="mt-4 rounded-full px-3 py-1.5 text-[13px] text-[color:var(--noir-text-tertiary)] hover:bg-white/[0.05] hover:text-white"
              >
                Clear
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
