import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'motion/react';
import { ChevronRight, Heart, Loader2, Plus, X } from 'lucide-react';
import { SearchResult, VerifiedArtist } from '../../../types';
import {
  executeSearchAPI,
  getArtistName,
  getHandPickedImage,
  resolveUrlToSearchResult,
  shouldShowArtistCard,
} from '../../../utils/apiUtils';
import { getArtistImage } from '../../../services/musicGraph';
import { isTrackFavorite } from '../../../utils/favoriteUtils';
import { EASE_PREMIUM, prefersReducedMotion } from '../../../utils/motionPresets';
import { strings } from '../../../constants/strings';
import { toast } from 'sonner';
import { NoirMark } from './NoirMark';

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

function QueueNextIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M4 6h12" />
      <path d="M4 12h8" />
      <path d="M4 18h8" />
      <path d="M16 12l4 3.2V8.8L16 12z" fill="currentColor" stroke="none" />
    </svg>
  );
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
  const [artistPortrait, setArtistPortrait] = useState<string | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const requestIdRef = useRef(0);

  const suggestions = recentTracks.slice(0, 3);
  const showingSuggestions = !query.trim() && !isSearching;
  const artistCard = useMemo(
    () => (!showingSuggestions && !isSearching ? artistFromQuery(query, results) : null),
    [query, results, showingSuggestions, isSearching]
  );
  const showArtistRow = !!(artistCard && onViewArtist);
  const trackOffset = showArtistRow ? 1 : 0;
  const trackRows = showingSuggestions ? suggestions : results;
  const rowCount = trackRows.length + trackOffset;
  const artistThumb = artistPortrait || artistCard?.thumbnail || '';
  const artistInitial = (artistCard?.name.trim().charAt(0) || '·').toUpperCase();

  useEffect(() => {
    if (!open) return;
    setQuery('');
    setResults([]);
    setIsSearching(false);
    setFocusedIndex(0);
    setArtistPortrait(null);
    const t = window.setTimeout(() => inputRef.current?.focus(), 30);
    return () => window.clearTimeout(t);
  }, [open]);

  useEffect(() => {
    setFocusedIndex(0);
  }, [rowCount, showingSuggestions]);

  useEffect(() => {
    if (!artistCard?.name) {
      setArtistPortrait(null);
      return;
    }
    let cancelled = false;
    setArtistPortrait(null);
    void getArtistImage(artistCard.name).then((url) => {
      if (!cancelled && url) setArtistPortrait(url);
    });
    return () => {
      cancelled = true;
    };
  }, [artistCard?.name]);

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
                <NoirMark
                  size={11}
                  className="shrink-0 text-[color:var(--noir-text-primary)]"
                />
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
                    className="noir-search-palette-file elva-focus-ring"
                    aria-label="Upload audio"
                    title="Upload audio"
                  >
                    File
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
                className="noir-search-palette-close elva-focus-ring"
                aria-label="Close"
              >
                <X className="h-4 w-4" strokeWidth={1.75} />
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

              {showArtistRow && artistCard && (
                <>
                  <p className="noir-search-palette-label">Artist</p>
                  <button
                    type="button"
                    data-active={focusedIndex === 0 ? 'true' : 'false'}
                    className="noir-search-palette-row noir-search-palette-row--artist"
                    onMouseEnter={() => setFocusedIndex(0)}
                    onClick={() => openArtist(artistCard)}
                  >
                    {artistThumb ? (
                      <img src={artistThumb} alt="" className="noir-search-artist-avatar" />
                    ) : (
                      <span className="noir-search-artist-avatar noir-search-artist-avatar--fallback">
                        {artistInitial}
                      </span>
                    )}
                    <span className="min-w-0 flex-1 text-left">
                      <span className="block truncate text-[15px] font-semibold text-[color:var(--noir-text-primary)]">
                        {artistCard.name}
                      </span>
                      <span className="block truncate text-[12px] text-[color:var(--noir-text-tertiary)]">
                        {strings.artist.goToArtist}
                      </span>
                    </span>
                    <ChevronRight
                      className="h-4 w-4 shrink-0 text-[color:var(--noir-text-tertiary)]"
                      strokeWidth={1.75}
                      aria-hidden
                    />
                  </button>
                </>
              )}

              {trackRows.length > 0 && !showingSuggestions && (
                <p className="noir-search-palette-label">Songs</p>
              )}

              <div className="flex flex-col gap-0.5">
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
                        <img src={track.thumbnail} alt="" className="noir-search-track-art" />
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
                            className="noir-search-row-action"
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
                          className="noir-search-row-action"
                          aria-label="Add to queue"
                          title="Add to queue"
                        >
                          <Plus className="h-3.5 w-3.5" strokeWidth={2} />
                        </button>
                        {onPlayNext && (
                          <button
                            type="button"
                            onClick={() => onPlayNext(track)}
                            className="noir-search-row-action"
                            aria-label="Play next"
                            title="Play next"
                          >
                            <QueueNextIcon />
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
