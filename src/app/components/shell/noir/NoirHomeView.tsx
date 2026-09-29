import { useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { Compass, Play, Plus, Search } from 'lucide-react';
import { SearchResult, VerifiedArtist } from '../../../types';
import { strings } from '../../../constants/strings';
import { shouldShowArtistCard } from '../../../utils/apiUtils';
import { getPlaybackSongKey } from '../../../utils/playbackSongKey';
import { isTrackFavorite } from '../../../utils/favoriteUtils';
import { ThemeColors } from '../../themeUtils';
import { SearchLoadingState } from '../../SearchLoadingState';
import { NoirSongRow } from './NoirSongRow';
import { EASE_PREMIUM, MOTION, prefersReducedMotion } from '../../../utils/motionPresets';
import { createPlaylist, usePlaylists } from '../../../utils/playlistStore';
import { NoirDitherCover } from './NoirDitherCover';
import { NoirMixCover, NoirMixCoverGallery } from './NoirMixCover';
import { NoirPlaylistCover } from './NoirPlaylistCover';
import { NoirArtwork } from './NoirArtwork';
import { NoirPlayPauseIcon } from './NoirPlayPauseIcon';
import { NoirFavoritesCover } from './NoirFavoritesCover';
import { NoirHomeShelf } from './NoirHomeShelf';
import { NoirColdStart } from './NoirColdStart';
import { Playlist } from '../../PlaylistDetailsView';
import { getListeningEvents } from '../../../services/listening/eventsStore';
import { topArtists } from '../../../services/listening/tasteProfile';
import { isTasteEmpty } from '../../../services/listening/seedTaste';
import { getArtistImage } from '../../../services/musicGraph';
import { DailyMix, loadDailyMixes } from '../../../services/mixes/dailyMixes';
import { worldForCollection } from '../../../utils/ditherCover';
import { NoirHomeHero, heroField, heroInk, heroWorld } from './NoirHomeHero';
import { prefetchArtistProfile } from '../../../utils/artistDiscographyLoader';

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
  onOpenDiscover?: () => void;
  onSelectPlaylist?: (playlist: Playlist) => void;
  onPlayPlaylist?: (tracks: SearchResult[], label?: string, startIndex?: number) => void;
  theme: ThemeColors;
};

export function NoirHomeView({
  searchQuery,
  setSearchQuery,
  lastSearchedQuery,
  isSearching,
  searchResults,
  recentArtists: _recentArtists,
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
  onOpenDiscover,
  onSelectPlaylist,
  onPlayPlaylist,
}: NoirHomeViewProps) {
  const [localQuery, setLocalQuery] = useState(searchQuery);
  const debounceTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const reduced = prefersReducedMotion();
  const playlists = usePlaylists();
  const [mixes, setMixes] = useState<DailyMix[]>([]);
  const [mixesLoading, setMixesLoading] = useState(true);
  const [mixReloadKey, setMixReloadKey] = useState(0);
  /** null = still checking events; true = show F7 picker */
  const [needsColdStart, setNeedsColdStart] = useState<boolean | null>(null);
  /** From real plays — not “artists you opened once”. */
  const [playedArtists, setPlayedArtists] = useState<VerifiedArtist[]>([]);
  const greeting = useMemo(() => {
    const hour = new Date().getHours();
    if (hour < 5) return strings.greeting.lateNight;
    if (hour < 12) return strings.greeting.morning;
    if (hour < 18) return strings.greeting.afternoon;
    return strings.greeting.evening;
  }, []);

  // Keep list order stable while on Home after a play — otherwise the clicked
  // row jumps into the hero and vanishes from the list mid-interaction.
  const [stableRecents, setStableRecents] = useState<SearchResult[]>(recentlyPlayed);
  const [listFrozen, setListFrozen] = useState(false);

  const featuredTrack = recentlyPlayed[0] ?? null;
  const featuredKey = featuredTrack ? getPlaybackSongKey(featuredTrack) : null;
  const isFeaturedActive = !!featuredKey && featuredKey === activeSongKey;
  const isFeaturedPlaying = isFeaturedActive && isPlaying;
  const listRecents = useMemo(() => {
    // The hero already shows the featured/playing song; never repeat it in the tiles.
    const hidden = new Set([featuredKey, activeSongKey].filter(Boolean));
    return stableRecents.filter((t) => !hidden.has(getPlaybackSongKey(t))).slice(0, 12);
  }, [stableRecents, featuredKey, activeSongKey]);

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
    let cancelled = false;
    void (async () => {
      try {
        const events = await getListeningEvents();
        if (!cancelled) setNeedsColdStart(isTasteEmpty(events));

        const top = topArtists(events, 30).slice(0, 12);
        const cards = await Promise.all(
          top.map(async (entry) => {
            const image = await getArtistImage(entry.artist);
            const artist: VerifiedArtist = {
              name: entry.artist,
              thumbnail: image || '',
            };
            return artist;
          })
        );
        if (!cancelled) setPlayedArtists(cards.filter((a) => a.name.trim().length > 0));
      } catch {
        if (!cancelled) {
          setNeedsColdStart(false);
          setPlayedArtists([]);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [mixReloadKey]);

  useEffect(() => {
    let cancelled = false;
    setMixesLoading(true);
    void (async () => {
      try {
        const events = await getListeningEvents();
        const next = await loadDailyMixes(events, recentlyPlayed);
        if (!cancelled) setMixes(next);
      } catch (error) {
        console.warn('[mixes] Failed to load daily mixes', error);
        if (!cancelled) setMixes([]);
      } finally {
        if (!cancelled) setMixesLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [recentlyPlayed.length > 0, mixReloadKey]); // seed once recents exist; reload after cold start

  const handleColdStartSeeded = () => {
    setNeedsColdStart(false);
    setMixReloadKey((n) => n + 1);
  };
  useEffect(() => {
    return () => {
      if (debounceTimeoutRef.current) clearTimeout(debounceTimeoutRef.current);
    };
  }, []);

  const openMix = (mix: DailyMix) => {
    onSelectPlaylist?.({
      id: mix.id,
      name: mix.name,
      description: mix.subtitle,
      tracks: mix.tracks,
      thumbnail: mix.coverImage ?? mix.tracks[0]?.thumbnail ?? '',
      accent: 'navy',
      coverWorld: mix.world,
    });
  };

  const playMix = (mix: DailyMix) => {
    if (mix.tracks.length === 0) return;
    onPlayPlaylist?.(mix.tracks, mix.name);
  };

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
    <div className="relative h-full min-h-0 overflow-y-auto scrollbar-none">
      <div className="flex h-[60px] shrink-0 items-end justify-end gap-3 px-5">
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

      {/* Dev check of every mix symbol: open Home with ?covers */}
      {typeof window !== 'undefined' && new URLSearchParams(window.location.search).has('covers') && (
        <div className="noir-content pt-4">
          <NoirMixCoverGallery />
        </div>
      )}

      {panelPhase === 'idle' && featuredTrack ? (
        <div className="noir-content shrink-0 pt-4">
          {/* Your day: the line grows from midnight to now and swells in the hours you listened.
              The field follows the time of day. Copy sits on the flat left, never on the form. */}
          <motion.section
            className="noir-home-day"
            data-light={heroWorld(featuredTrack) === 'bone' || undefined}
            style={{
              background: heroField(heroWorld(featuredTrack)),
              color: heroInk(heroWorld(featuredTrack)),
            }}
            initial={reduced ? false : { opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.42, ease: EASE_PREMIUM }}
          >
            <NoirHomeHero track={featuredTrack} playing={isFeaturedPlaying} variant="2" size={248} />
            <div className="noir-home-day-copy">
              <h1 className="noir-home-greeting-title">{greeting}</h1>
              <div className="noir-home-day-now">
                <button
                  type="button"
                  onClick={() => playFromHome(featuredTrack)}
                  className="noir-home-day-art elva-focus-ring"
                  aria-label={`${strings.home.continue}: ${featuredTrack.title}`}
                >
                  <AnimatePresence mode="popLayout" initial={false}>
                    <motion.span
                      key={featuredTrack.id || featuredTrack.thumbnail}
                      className="block"
                      initial={{ opacity: 0, scale: 0.96 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 1.02 }}
                      transition={{ duration: 0.36, ease: EASE_PREMIUM }}
                    >
                      <NoirArtwork
                        source={featuredTrack.thumbnail}
                        world={worldForCollection(featuredTrack.artist || featuredTrack.id)}
                        seed={`home:${featuredTrack.id}`}
                        size={64}
                      />
                    </motion.span>
                  </AnimatePresence>
                </button>
                <div className="relative min-w-0 flex-1">
                  <p className="noir-home-day-label">
                    {isFeaturedPlaying ? strings.home.nowPlaying : strings.home.continue}
                  </p>
                  <AnimatePresence mode="popLayout" initial={false}>
                    <motion.div
                      key={featuredTrack.id || featuredTrack.title}
                      initial={reduced ? { opacity: 0 } : { opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={
                        reduced
                          ? { opacity: 0, transition: { duration: 0.1 } }
                          : { opacity: 0, y: -4, transition: MOTION.exit }
                      }
                      transition={{ duration: 0.26, ease: EASE_PREMIUM }}
                    >
                      <p className="noir-home-continue-title">{featuredTrack.title}</p>
                      <p className="noir-home-continue-artist">{featuredTrack.artist}</p>
                    </motion.div>
                  </AnimatePresence>
                </div>
                <motion.button
                  type="button"
                  onClick={() => playFromHome(featuredTrack)}
                  className="noir-play-round elva-focus-ring"
                  aria-label={isFeaturedPlaying ? 'Pause' : 'Play'}
                  whileTap={{ scale: 0.94 }}
                  transition={MOTION.tap}
                >
                  <NoirPlayPauseIcon playing={isFeaturedPlaying} size={22} />
                </motion.button>
              </div>
            </div>
          </motion.section>
        </div>
      ) : null}

      <div className="relative z-[1] pb-10">
        <AnimatePresence mode="wait">
          {panelPhase === 'idle' && (
            <motion.div
              key="home-idle"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="noir-settle-group noir-content relative py-6"
            >
              {!featuredTrack && needsColdStart === true && (
                <NoirColdStart onSeeded={handleColdStartSeeded} onBrowseDiscover={onOpenDiscover} />
              )}

              {!featuredTrack && needsColdStart === false && !mixesLoading && mixes.length === 0 && (
                <div className="noir-home-start-card mb-10 max-w-xl">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[color:var(--noir-text-tertiary)]">
                    Start listening
                  </p>
                  <h2 className="mt-3 max-w-md text-[clamp(1.65rem,3.5vw,2.35rem)] font-semibold leading-[1.05] tracking-[-0.035em] text-[color:var(--noir-text-primary)]">
                    Find something you want to hear.
                  </h2>
                  <p className="mt-3 max-w-md text-[14px] leading-relaxed text-[color:var(--noir-text-secondary)]">
                    Search for a track or browse what is moving right now.
                  </p>
                  <div className="mt-6 flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={openSearchPalette}
                      className="inline-flex h-9 items-center gap-2 rounded-[var(--noir-radius-md)] bg-white/[0.1] px-3.5 text-[13px] font-medium text-white transition-colors hover:bg-white/[0.15] elva-focus-ring"
                    >
                      <Search className="h-3.5 w-3.5" strokeWidth={1.9} />
                      Search
                      <kbd className="ml-1 rounded border border-white/10 px-1.5 py-0.5 text-[10px] text-white/50">
                        ⌘K
                      </kbd>
                    </button>
                    {onOpenDiscover && (
                      <button
                        type="button"
                        onClick={onOpenDiscover}
                        className="inline-flex h-9 items-center gap-2 rounded-[var(--noir-radius-md)] border border-white/10 px-3.5 text-[13px] font-medium text-[color:var(--noir-text-secondary)] transition-colors hover:border-white/20 hover:bg-white/[0.05] hover:text-white elva-focus-ring"
                      >
                        <Compass className="h-3.5 w-3.5" strokeWidth={1.75} />
                        Discover
                      </button>
                    )}
                  </div>
                </div>
              )}

              {listRecents.length > 0 && (
                <section>
                  <h2 className="noir-section-heading !mt-2 px-1">{strings.home.jumpBackIn}</h2>
                  <div className="noir-home-tiles">
                    {listRecents.slice(0, 6).map((track, i) => {
                      const playing = isTrackPlaying(track) && isPlaying;
                      return (
                        <motion.button
                          key={track.id}
                          type="button"
                          layout={!reduced}
                          onClick={() => playFromHome(track)}
                          className="noir-home-tile group elva-focus-ring"
                          data-playing={playing ? 'true' : 'false'}
                          initial={reduced ? false : { opacity: 0, y: 8 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ duration: 0.36, ease: EASE_PREMIUM, delay: 0.1 + i * 0.03 }}
                        >
                          <img src={track.thumbnail} alt="" className="noir-home-tile-art" />
                          <span className="min-w-0 flex-1">
                            <span className="noir-song-title block truncate">{track.title}</span>
                            <span className="noir-song-meta block truncate">{track.artist}</span>
                          </span>
                          <span className="noir-home-tile-play" aria-hidden>
                            {playing ? (
                              <span className="noir-playing-bars">
                                <span />
                                <span />
                                <span />
                              </span>
                            ) : loadingSongId === track.id ? (
                              <span className="h-4 w-4 animate-spin rounded-full border border-black/20 border-t-black" />
                            ) : (
                              <Play className="ml-0.5 h-4 w-4 fill-current" />
                            )}
                          </span>
                        </motion.button>
                      );
                    })}
                  </div>
                </section>
              )}

              {mixesLoading && (
                <section>
                  <div className="noir-skeleton mb-4 mt-[var(--noir-section-gap)] h-5 w-36 rounded px-1" />
                  <NoirHomeShelf>
                    {Array.from({ length: 3 }).map((_, i) => (
                      <div
                        key={i}
                        className="noir-skeleton h-[220px] w-[188px] shrink-0 rounded-[var(--noir-radius-md)]"
                      />
                    ))}
                  </NoirHomeShelf>
                </section>
              )}

              {!mixesLoading && mixes.length > 0 && (
                <section>
                  <h2 className="noir-section-heading px-1">{strings.home.yourMixes}</h2>
                  <NoirHomeShelf>
                    {mixes.map((mix, i) => (
                      <motion.div
                        key={mix.id}
                        role="button"
                        tabIndex={0}
                        onClick={() => openMix(mix)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault();
                            openMix(mix);
                          }
                        }}
                        className="noir-collection-card noir-home-mix-card group elva-focus-ring"
                        initial={reduced ? false : { opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.36, ease: EASE_PREMIUM, delay: 0.08 + i * 0.04 }}
                      >
                        <span className="relative block">
                          <NoirMixCover tag={mix.tag} size={188} />
                          {onPlayPlaylist && (
                            <motion.button
                              type="button"
                              className="noir-discover-release-play noir-play-round !h-11 !w-11 elva-focus-ring"
                              aria-label={`${strings.home.playMix}: ${mix.name}`}
                              onClick={(e) => {
                                e.stopPropagation();
                                playMix(mix);
                              }}
                              whileTap={{ scale: 0.94 }}
                              transition={MOTION.tap}
                            >
                              <Play className="ml-0.5 h-4 w-4 fill-current" />
                            </motion.button>
                          )}
                        </span>
                        <span className="min-w-0">
                          <span className="noir-song-title block truncate">{mix.name}</span>
                          <span className="noir-song-meta mt-0.5 block truncate">{mix.subtitle}</span>
                        </span>
                      </motion.div>
                    ))}
                  </NoirHomeShelf>
                </section>
              )}

              {(favorites.length > 0 || playlists.length > 0) && (
                <section>
                  <h2 className="noir-section-heading px-1">{strings.home.yourLibrary}</h2>
                  <NoirHomeShelf>
                    {favorites.length > 0 && (
                      <button
                        type="button"
                        onClick={() => window.dispatchEvent(new Event('noir-open-favorites'))}
                        className="noir-collection-card noir-home-shelf-card elva-focus-ring"
                      >
                        <NoirFavoritesCover size={168} />
                        <span className="min-w-0">
                          <span className="noir-song-title block truncate">{strings.home.favorites}</span>
                          <span className="noir-song-meta mt-0.5 block truncate">
                            {strings.playlist.songCount(favorites.length)}
                          </span>
                        </span>
                      </button>
                    )}
                    {playlists.map((playlist) => (
                      <button
                        key={playlist.id}
                        type="button"
                        onClick={() =>
                          window.dispatchEvent(new CustomEvent('noir-open-playlist', { detail: { id: playlist.id } }))
                        }
                        className="noir-collection-card noir-home-shelf-card elva-focus-ring"
                      >
                        <NoirPlaylistCover
                          playlistId={playlist.id}
                          trackCount={playlist.tracks.length}
                          size={168}
                        />
                        <span className="min-w-0">
                          <span className="noir-song-title block truncate">{playlist.name}</span>
                          <span className="noir-song-meta mt-0.5 block truncate">
                            {strings.playlist.songCount(playlist.tracks.length)}
                          </span>
                        </span>
                      </button>
                    ))}
                    <button
                      type="button"
                      onClick={() =>
                        window.dispatchEvent(new CustomEvent('noir-open-playlist', { detail: { id: createPlaylist().id } }))
                      }
                      className="noir-collection-card noir-home-shelf-card elva-focus-ring"
                    >
                      <span className="noir-collection-card-new !h-[168px] !w-[168px]">
                        <Plus className="h-6 w-6" strokeWidth={1.5} />
                      </span>
                      <span className="noir-song-title block truncate">{strings.playlist.newPlaylist}</span>
                    </button>
                  </NoirHomeShelf>
                </section>
              )}

              {playedArtists.length >= 2 && (
                <section>
                  <h2 className="noir-section-heading px-1">{strings.home.artists}</h2>
                  <NoirHomeShelf>
                    {playedArtists.map((artist) => (
                      <button
                        key={artist.name}
                        type="button"
                        onClick={() => handleViewArtistProfile(artist)}
                        className="noir-home-artist group elva-focus-ring"
                      >
                        <span className="noir-home-artist-art">
                          {artist.thumbnail ? (
                            <img src={artist.thumbnail} alt="" className="h-full w-full object-cover" />
                          ) : (
                            <NoirDitherCover
                              world={worldForCollection(artist.name)}
                              seed={artist.name}
                              size={108}
                              radius={999}
                            />
                          )}
                        </span>
                        <span className="noir-song-title mt-3 block truncate text-center">{artist.name}</span>
                      </button>
                    ))}
                  </NoirHomeShelf>
                </section>
              )}
            </motion.div>
          )}

          {panelPhase === 'loading' && (
            <motion.div key="loading" className="noir-content py-16">
              <SearchLoadingState />
            </motion.div>
          )}

          {panelPhase === 'results' && (
            <motion.div key="results" className="noir-content py-6">
              <p className="mb-5 px-1 text-[14px] text-[color:var(--noir-text-secondary)]">
                Results for &ldquo;{lastSearchedQuery}&rdquo;
              </p>
              {showArtistCard && verifiedArtist && (
                <button
                  type="button"
                  data-search-result-index={0}
                  onClick={() => handleViewArtistProfile(verifiedArtist)}
                  onMouseEnter={() =>
                    void prefetchArtistProfile({
                      name: verifiedArtist.name,
                      channelId: verifiedArtist.channelId,
                      isTopic: verifiedArtist.isTopic,
                      mbid: verifiedArtist.mbid,
                      deezerId: verifiedArtist.deezerId,
                    })
                  }
                  onFocus={() =>
                    void prefetchArtistProfile({
                      name: verifiedArtist.name,
                      channelId: verifiedArtist.channelId,
                      isTopic: verifiedArtist.isTopic,
                      mbid: verifiedArtist.mbid,
                      deezerId: verifiedArtist.deezerId,
                    })
                  }
                  className="noir-track-row mb-1 flex w-full items-center gap-4 px-3 py-3 text-left"
                >
                  <img src={verifiedArtist.thumbnail} alt="" className="noir-art h-12 w-12 object-cover" />
                  <div>
                    <p className="text-[14px] font-medium text-[color:var(--noir-text-primary)]">
                      {verifiedArtist.name}
                    </p>
                    <p className="text-[13px] text-[color:var(--noir-text-secondary)]">
                      {strings.artist.openProfile}
                    </p>
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
            <motion.div key="empty" className="noir-content py-20">
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
