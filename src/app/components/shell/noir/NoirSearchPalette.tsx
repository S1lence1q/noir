import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'motion/react';
import { ListEnd, Loader2, Heart, Plus, Search, Upload, UserRound, X } from 'lucide-react';
import { SearchResult, VerifiedArtist } from '../../../types';
import {
  executeSearchAPI,
  getArtistName,
  getHandPickedImage,
  resolveUrlToSearchResult,
  shouldShowArtistCard,
} from '../../../utils/apiUtils';
import { isTrackFavorite } from '../../../utils/favoriteUtils';
import { EASE_PREMIUM, prefersReducedMotion } from '../../../utils/motionPresets';
import { strings } from '../../../constants/strings';
import { toast } from 'sonner';

type NoirSearchPaletteProps = {
  open: boolean;
  onClose: () => void;
  onSelectSong: (song: SearchResult) => void;
  onAddToQueue: (song: SearchResult) => void;
  onPlayNext?: (song: SearchResult) => void;
  onToggleFavorite?: (song: SearchResult) => void;
  onViewArtist?: (artist: VerifiedArtist) => void;
  onFileSelect?: (event: React.ChangeEvent<HTMLInputElement>) => void;
  favorites?: SearchResult[];
  recentTracks?: SearchResult[];
};

function artistFromQuery(query: string, results: SearchResult[]): VerifiedArtist | null {
  if (!shouldShowArtistCard(query) || results.length === 0) return null;
  const candidate = getArtistName(query, results);
  if (!candidate) return null;
  const handPicked = getHandPickedImage(candidate.name);
  return {
    name: candidate.name,
    thumbnail: handPicked || candidate.thumbnail,
    channelId: candidate.channelId,
    isTopic: candidate.isTopic,
  };
}

export function NoirSearchPalette({
  open,
  onClose,
  onSelectSong,
  onAddToQueue,
  onPlayNext,
  onToggleFavorite,
  onViewArtist,
  onFileSelect,
  favorites = [],
  recentTracks = [],
}: NoirSearchPaletteProps) {
  const reduced = prefersReducedMotion();
  const inputRef = useRef<HTMLInputElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [focusedIndex, setFocusedIndex] = useState(0);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const requestIdRef = useRef(0);

  const suggestions = recentTracks.slice(0, 3);
  const showingSuggestions = !query.trim() && !isSearching;
  const artistCard = useMemo(
    () => (!showingSuggestions && !isSearching ? artistFromQuery(query, results) : null),
    [query, results, showingSuggestions, isSearching]
  );
  const trackOffset = artistCard && onViewArtist ? 1 : 0;
  const trackRows = showingSuggestions ? suggestions : results;
  const rowCount = trackRows.length + trackOffset;

  useEffect(() => {
    if (!open) return;
    setQuery('');
    setResults([]);
    setIsSearching(false);
    setFocusedIndex(0);
    const t = window.setTimeout(() => inputRef.current?.focus(), 30);
    return () => window.clearTimeout(t);
  }, [open]);

  useEffect(() => {
    setFocusedIndex(0);
  }, [rowCount, showingSuggestions]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        e.stopPropagation();
        onClose();
      }
    };
    window.addEventListener('keydown', onKey, true);
    return () => window.removeEventListener('keydown', onKey, true);
  }, [open, onClose]);

  const runSearch = async (raw: string) => {
    const q = raw.trim();
    if (!q) {
      setResults([]);
      setIsSearching(false);
      return;
    }

    if (/^https?:\/\//i.test(q)) {
      setIsSearching(true);
      const req = ++requestIdRef.current;
      try {
        const song = await resolveUrlToSearchResult(q);
        if (req !== requestIdRef.current) return;
        setResults([song]);
      } catch {
        if (req !== requestIdRef.current) return;
        setResults([]);
        toast.error('Could not load link');
      } finally {
        if (req === requestIdRef.current) setIsSearching(false);
      }
      return;
    }

    setIsSearching(true);
    const req = ++requestIdRef.current;
    const next = await executeSearchAPI(q);
    if (req !== requestIdRef.current) return;
    setResults(next);
    setIsSearching(false);
  };

  const onQueryChange = (val: string) => {
    setQuery(val);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!val.trim()) {
      setResults([]);
      setIsSearching(false);
      return;
    }
    // Mark searching immediately so we don't flash empty / fake artist during debounce.
    setIsSearching(true);
    debounceRef.current = setTimeout(() => {
      void runSearch(val);
    }, 320);
  };

  const playRow = (track: SearchResult) => {
    onSelectSong(track);
    onClose();
  };

  const openArtist = (artist: VerifiedArtist) => {
    onViewArtist?.(artist);
    onClose();
  };

  if (typeof document === 'undefined') return null;

  return createPortal(
    <AnimatePresence>
      {open && (
        <motion.div
          className="noir-search-palette-root"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: reduced ? 0.12 : 0.18 }}
        >
          <button
            type="button"
            className="noir-search-palette-backdrop"
            aria-label="Close search"
            onClick={onClose}
          />
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-label="Search"
            className="noir-search-palette"
            initial={reduced ? { opacity: 0 } : { opacity: 0, y: 12, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={reduced ? { opacity: 0 } : { opacity: 0, y: 8, scale: 0.98 }}
            transition={{ duration: reduced ? 0.12 : 0.22, ease: EASE_PREMIUM }}
          >
            <div className="noir-search-palette-input-row">
              {isSearching ? (
                <Loader2 className="h-4 w-4 shrink-0 animate-spin text-[color:var(--noir-text-tertiary)]" />
              ) : (
                <Search className="h-4 w-4 shrink-0 text-[color:var(--noir-text-tertiary)]" strokeWidth={1.75} />
              )}
              <input
                ref={inputRef}
                type="text"
                value={query}
                onChange={(e) => onQueryChange(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'ArrowDown') {
                    e.preventDefault();
                    setFocusedIndex((i) => Math.min(i + 1, Math.max(0, rowCount - 1)));
                  } else if (e.key === 'ArrowUp') {
                    e.preventDefault();
                    setFocusedIndex((i) => Math.max(i - 1, 0));
                  } else if (e.key === 'Enter') {
                    e.preventDefault();
                    if (trackOffset && focusedIndex === 0 && artistCard) {
                      openArtist(artistCard);
                    } else {
                      const track = trackRows[focusedIndex - trackOffset];
                      if (track) playRow(track);
                      else if (query.trim()) void runSearch(query);
                    }
                  }
                }}
                placeholder="Search songs, artists, or paste a link…"
                className="noir-search-palette-input"
                autoComplete="off"
                spellCheck={false}
              />
              {onFileSelect && (
                <>
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="noir-search-palette-upload flex h-7 w-7 items-center justify-center rounded-full"
                    aria-label="Upload audio"
                    title="Upload audio"
                  >
                    <Upload className="h-4 w-4" strokeWidth={1.75} />
                  </button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="audio/*"
                    onChange={onFileSelect}
                    className="hidden"
                  />
                </>
              )}
              <button
                type="button"
                onClick={onClose}
                className="flex h-8 w-8 items-center justify-center rounded-full text-[color:var(--noir-text-tertiary)] hover:bg-white/[0.06] hover:text-white"
                aria-label="Close"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="noir-search-palette-body">
              {showingSuggestions && suggestions.length > 0 && (
                <p className="noir-search-palette-label">Recent</p>
              )}
              {showingSuggestions && suggestions.length === 0 && (
                <p className="noir-search-palette-empty">
                  Type to search — or paste a YouTube / Apple Music link.
                </p>
              )}
              {!showingSuggestions &&
                !isSearching &&
                results.length === 0 &&
                !artistCard &&
                query.trim() && (
                <p className="noir-search-palette-empty">No results for “{query.trim()}”</p>
              )}

              <div className="flex flex-col gap-0.5">
                {artistCard && onViewArtist && (
                  <button
                    type="button"
                    data-active={focusedIndex === 0 ? 'true' : 'false'}
                    className="noir-search-palette-row flex w-full items-center gap-3 text-left"
                    onMouseEnter={() => setFocusedIndex(0)}
                    onClick={() => openArtist(artistCard)}
                  >
                    {artistCard.thumbnail ? (
                      <img
                        src={artistCard.thumbnail}
                        alt=""
                        className="noir-art h-10 w-10 shrink-0 object-cover"
                      />
                    ) : (
                      <span className="noir-art flex h-10 w-10 shrink-0 items-center justify-center bg-white/[0.06]">
                        <UserRound className="h-4 w-4 text-[color:var(--noir-text-tertiary)]" />
                      </span>
                    )}
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[14px] font-medium text-[color:var(--noir-text-primary)]">
                        {artistCard.name}
                      </span>
                      <span className="block truncate text-[13px] text-[color:var(--noir-text-tertiary)]">
                        {strings.artist.openProfile}
                      </span>
                    </span>
                  </button>
                )}
                {trackRows.map((track, i) => {
                  const rowIndex = i + trackOffset;
                  const active = rowIndex === focusedIndex;
                  const liked = isTrackFavorite(favorites, track);
                  return (
                    <div
                      key={track.id}
                      data-active={active ? 'true' : 'false'}
                      className="noir-search-palette-row group"
                      onMouseEnter={() => setFocusedIndex(rowIndex)}
                    >
                      <button
                        type="button"
                        className="flex min-w-0 flex-1 items-center gap-3 text-left"
                        onClick={() => playRow(track)}
                      >
                        <img
                          src={track.thumbnail}
                          alt=""
                          className="noir-art h-10 w-10 shrink-0 object-cover"
                        />
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-[14px] font-medium text-[color:var(--noir-text-primary)]">
                            {track.title}
                          </span>
                          <span className="block truncate text-[13px] text-[color:var(--noir-text-tertiary)]">
                            {track.artist}
                          </span>
                        </span>
                      </button>
                      <div
                        className={`flex shrink-0 items-center gap-0.5 transition-opacity ${
                          liked
                            ? 'opacity-100'
                            : 'opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 [[data-active=true]_&]:opacity-100'
                        }`}
                      >
                        {onToggleFavorite && (
                          <button
                            type="button"
                            onClick={() => onToggleFavorite(track)}
                            className="flex h-8 w-8 items-center justify-center rounded-full text-[color:var(--noir-text-secondary)] hover:bg-white/[0.08] hover:text-white"
                            aria-label={liked ? 'Remove from favorites' : 'Add to favorites'}
                            title={liked ? 'Remove from favorites' : 'Add to favorites'}
                          >
                            <Heart
                              className={`h-3.5 w-3.5 ${liked ? 'fill-current text-[color:var(--noir-accent)]' : ''}`}
                              strokeWidth={liked ? 0 : 1.75}
                            />
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => onAddToQueue(track)}
                          className="flex h-8 w-8 items-center justify-center rounded-full text-[color:var(--noir-text-secondary)] hover:bg-white/[0.08] hover:text-white"
                          aria-label="Add to queue"
                          title="Add to queue"
                        >
                          <Plus className="h-3.5 w-3.5" strokeWidth={2} />
                        </button>
                        {onPlayNext && (
                          <button
                            type="button"
                            onClick={() => onPlayNext(track)}
                            className="flex h-8 w-8 items-center justify-center rounded-full text-[color:var(--noir-text-secondary)] hover:bg-white/[0.08] hover:text-white"
                            aria-label="Play next"
                            title="Play next"
                          >
                            <ListEnd className="h-3.5 w-3.5" strokeWidth={1.75} />
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body
  );
}
