import { Fragment, useEffect, useMemo, useState, type ReactNode } from 'react';
import { NoirStateNotice } from './NoirStateNotice';
import { ReleaseCard, openRelease, playRelease } from './NoirReleaseCard';
import { NoirTrackCard } from './NoirTrackCard';
import {
  BecauseRow,
  DiscoverReleaseCard,
  RELEASE_DAYS,
  dailyBecauseIndex,
  loadBecauseRows,
  loadDiscoverFeed,
  loadLatestReleases,
} from '../../../services/discover/discoverFeed';
import { AnimatePresence, motion } from 'motion/react';
import { Compass, Play, Plus, Search } from 'lucide-react';
import { SearchResult, VerifiedArtist } from '../../../types';
import { strings } from '../../../constants/strings';
import { getPlaybackSongKey } from '../../../utils/playbackSongKey';
import { ThemeColors } from '../../themeUtils';
import { EASE_PREMIUM, MOTION, prefersReducedMotion } from '../../../utils/motionPresets';
import { createPlaylist, usePlaylists } from '../../../utils/playlistStore';
import { NoirDitherCover } from './NoirDitherCover';
import { NoirMixCover, NoirMixCoverGallery, assignMixWorlds, inkOn } from './NoirMixCover';
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
import { buildStarterMixes, startersActiveToday } from '../../../services/mixes/starterMixes';
import { COLOR_WORLDS, worldForCollection, type ColorWorld } from '../../../utils/ditherCover';
import { NoirHomeHero, heroField, heroInk, heroWorld } from './NoirHomeHero';
import { NoirGrainField } from './NoirGrainField';
import { useGraphicsTheme } from '../../../utils/graphicsTheme';

type Daypart = 'lateNight' | 'morning' | 'afternoon' | 'evening';
type HomeSection = 'artists' | 'releases' | 'because' | 'recents' | 'mixes' | 'library';

function daypartAt(hour: number): Daypart {
  if (hour < 5) return 'lateNight';
  if (hour < 12) return 'morning';
  if (hour < 18) return 'afternoon';
  return 'evening';
}

/** Jump back in always leads (it is the most used); the rest follows the hour. The two cover shelves (because, releases) never sit side by side. */
const SECTION_ORDER: Record<Daypart, HomeSection[]> = {
  morning: ['recents', 'mixes', 'because', 'artists', 'releases', 'library'],
  afternoon: ['recents', 'artists', 'because', 'mixes', 'releases', 'library'],
  evening: ['recents', 'library', 'because', 'artists', 'releases', 'mixes'],
  lateNight: ['recents', 'library', 'because', 'mixes', 'releases', 'artists'],
};

/** Section title with one quiet line of data on the right. */
function SectionHead({
  title,
  meta,
  onMeta,
}: {
  title: string;
  meta?: string | null;
  onMeta?: () => void;
}) {
  return (
    <div className="noir-section-row">
      <h2 className="noir-section-heading px-1">{title}</h2>
      {meta ? (
        onMeta ? (
          <button type="button" onClick={onMeta} className="noir-section-meta noir-section-meta-link noir-focus-ring">
            {meta}
          </button>
        ) : (
          <p className="noir-section-meta">{meta}</p>
        )
      ) : null}
    </div>
  );
}

export type NoirHomeViewProps = {
  recentArtists: VerifiedArtist[];
  recentlyPlayed: SearchResult[];
  favorites?: SearchResult[];
  loadingSongId: string | null;
  activeSongKey?: string | null;
  isPlaying?: boolean;
  /** The song actually loaded in the player; the hero follows it, not just the last recent. */
  activeTrack?: SearchResult | null;
  handleViewArtistProfile: (artist: VerifiedArtist) => void;
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
  recentArtists: _recentArtists,
  recentlyPlayed,
  favorites = [],
  loadingSongId,
  activeSongKey = null,
  isPlaying = false,
  activeTrack = null,
  handleViewArtistProfile,
  handleSelectSong,
  handleAddToQueue,
  handlePlayNext,
  handleToggleFavorite,
  onOpenDiscover,
  onSelectPlaylist,
  onPlayPlaylist,
}: NoirHomeViewProps) {
  const reduced = prefersReducedMotion();
  const playlists = usePlaylists();
  const [mixes, setMixes] = useState<DailyMix[]>([]);
  const [mixesLoading, setMixesLoading] = useState(true);
  const [mixesFailed, setMixesFailed] = useState(false);
  const [mixReloadKey, setMixReloadKey] = useState(0);
  /** After first-run picks, chart-based starters fill the row while personal mixes build. */
  const [starterActive, setStarterActive] = useState(startersActiveToday);
  const starters = useMemo(() => (starterActive ? buildStarterMixes() : []), [starterActive]);
  const personalCount = mixes.length;
  const displayMixes = useMemo(() => {
    if (personalCount >= 4 || starters.length === 0) return mixes;
    const have = new Set(mixes.map((m) => m.tag.toLowerCase()));
    return [...mixes, ...starters.filter((s) => !have.has(s.tag.toLowerCase()))].slice(0, 6);
  }, [mixes, starters, personalCount]);
  /** null = still checking events; true = show F7 picker */
  const [needsColdStart, setNeedsColdStart] = useState<boolean | null>(null);
  /** From real plays — not “artists you opened once”. */
  const [playedArtists, setPlayedArtists] = useState<VerifiedArtist[]>([]);
  /** How many portraits are coming, known before the photos are: keeps the row's height from jumping. */
  const [artistSlots, setArtistSlots] = useState(0);
  /** Plays in the last 7 days, for the quiet line under Jump back in. */
  const [weekPlays, setWeekPlays] = useState(0);
  /** null = still loading; the feed is warmed at startup, so this is usually instant. */
  const [releases, setReleases] = useState<DiscoverReleaseCard[] | null>(null);
  /** True when nothing is new and the shelf shows each artist's latest instead. */
  const [releasesFallback, setReleasesFallback] = useState(false);
  const [because, setBecause] = useState<BecauseRow | null>(null);
  // Fixed when Home opens, so the page never reshuffles under you at an hour change.
  const daypart = useMemo(() => daypartAt(new Date().getHours()), []);
  const greeting = strings.greeting[daypart];

  // Keep list order stable while on Home after a play — otherwise the clicked
  // row jumps into the hero and vanishes from the list mid-interaction.
  const [stableRecents, setStableRecents] = useState<SearchResult[]>(recentlyPlayed);
  const [listFrozen, setListFrozen] = useState(false);

  const featuredTrack = activeTrack?.title ? activeTrack : recentlyPlayed[0] ?? null;
  const grainTheme = useGraphicsTheme() === 'grain';
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

  useEffect(() => {
    if (!listFrozen) setStableRecents(recentlyPlayed);
  }, [recentlyPlayed, listFrozen]);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const events = await getListeningEvents();
        if (!cancelled) setNeedsColdStart(isTasteEmpty(events));

        const top = topArtists(events, 30).slice(0, 12);
        if (!cancelled) setArtistSlots(top.length);
        void loadBecauseRows(events)
          .then((rows) => !cancelled && rows.length > 0 && setBecause(rows[dailyBecauseIndex(rows.length)]))
          .catch(() => undefined);
        void (async () => {
          try {
            const feed = await loadDiscoverFeed(events);
            if (feed.newReleases.length > 0) {
              if (!cancelled) setReleases(feed.newReleases.slice(0, 10));
              return;
            }
            const latest = await loadLatestReleases(events);
            if (cancelled) return;
            setReleasesFallback(true);
            setReleases(latest);
          } catch {
            if (!cancelled) setReleases([]);
          }
        })();
        const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
        if (!cancelled) setWeekPlays(events.filter((event) => event.source !== 'seed' && event.startedAt >= weekAgo).length);
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
          setArtistSlots(0);
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
    setMixesFailed(false);
    void (async () => {
      try {
        const events = await getListeningEvents();
        const next = await loadDailyMixes(events, recentlyPlayed, (partial) => {
          if (!cancelled) setMixes(partial);
        });
        if (!cancelled) setMixes(next);
      } catch (error) {
        console.warn('[mixes] Failed to load daily mixes', error);
        if (!cancelled) {
          setMixes([]);
          setMixesFailed(true);
        }
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
    setStarterActive(true);
    setMixReloadKey((n) => n + 1);
  };
  const mixWorlds = useMemo(() => assignMixWorlds(displayMixes.map((m) => m.tag)), [displayMixes]);

  const openMix = (mix: DailyMix, world: ColorWorld = mix.world) => {
    onSelectPlaylist?.({
      id: mix.id,
      name: mix.name,
      description: mix.subtitle,
      tracks: mix.tracks,
      thumbnail: mix.coverImage ?? mix.tracks[0]?.thumbnail ?? '',
      accent: 'navy',
      coverWorld: world,
    });
  };

  const playMix = (mix: DailyMix) => {
    if (mix.tracks.length === 0) return;
    onPlayPlaylist?.(mix.tracks, mix.name);
  };

  const openSearchPalette = () => {
    window.dispatchEvent(new Event('noir-open-search-palette'));
  };

  const playFromHome = (track: SearchResult) => {
    setListFrozen(true);
    const key = getPlaybackSongKey(track);
    if (key && key === activeSongKey) {
      window.dispatchEvent(new Event('noir-toggle-play'));
      return;
    }
    handleSelectSong(track);
  };

  const artistsBlock = (
    <>
    {playedArtists.length < 2 && artistSlots >= 2 && (
      <section aria-hidden>
        <h2 className="noir-section-heading px-1">{strings.home.artists}</h2>
        <NoirHomeShelf>
          {Array.from({ length: Math.min(artistSlots, 12) }).map((_, i) => (
            <div key={i} className="noir-home-artist">
              <span className="noir-home-artist-art noir-skeleton" />
              <span className="noir-skeleton mx-auto mt-3 block h-3 w-16 rounded" />
            </div>
          ))}
        </NoirHomeShelf>
      </section>
    )}
  
    {playedArtists.length >= 2 && (
      <section>
        <SectionHead title={strings.home.artists} meta={strings.home.meta.artists} />
        <NoirHomeShelf>
          {playedArtists.map((artist) => (
            <button
              key={artist.name}
              type="button"
              onClick={() => handleViewArtistProfile(artist)}
              className="noir-home-artist group noir-focus-ring"
            >
              <span className="noir-home-artist-art">
                {artist.thumbnail ? (
                  <img src={artist.thumbnail} alt="" className="h-full w-full object-cover" />
                ) : (
                  <NoirDitherCover
                    world={worldForCollection(artist.name)}
                    seed={artist.name}
                    size={92}
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
    </>
  );

  const recentsBlock = (
    <>
    {listRecents.length > 0 && (
      <section>
        <SectionHead title={strings.home.jumpBackIn} meta={weekPlays > 0 ? strings.home.meta.plays(weekPlays) : null} />
        <div className="noir-home-tiles">
          {listRecents.slice(0, 6).map((track, i) => {
            const playing = isTrackPlaying(track) && isPlaying;
            return (
              <motion.button
                key={track.id}
                type="button"
                onClick={() => playFromHome(track)}
                className="noir-home-tile group noir-focus-ring"
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
    </>
  );

  const mixesBlock = (
    <>
    {mixesLoading && displayMixes.length === 0 && (
      <section aria-hidden>
        <div className="noir-skeleton mb-4 mt-[var(--noir-section-gap)] h-5 w-36 rounded px-1" />
        <NoirHomeShelf>
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="noir-skeleton noir-home-poster" style={{ height: 224 }} />
          ))}
        </NoirHomeShelf>
      </section>
    )}
  
    {mixesFailed && displayMixes.length === 0 && (
      <section>
        <h2 className="noir-section-heading px-1">{strings.home.yourMixes}</h2>
        <NoirStateNotice
          compact
          title={strings.mixesFailed.title}
          description={strings.mixesFailed.description}
          onRetry={() => setMixReloadKey((n) => n + 1)}
        />
      </section>
    )}
  
    {displayMixes.length > 0 && (
      <section>
        <SectionHead
          title={mixes.length > 0 ? strings.home.yourMixes : strings.home.startHere}
          meta={mixes.length > 0 ? strings.home.meta.mixesToday : strings.home.meta.mixesCharts}
        />
        {/* Same quiet tiles as Jump back in and Library: the symbol is small, the hero is the one big picture. */}
        <NoirHomeShelf>
          {displayMixes.map((mix, i) => (
            <motion.div
              key={mix.id}
              role="button"
              tabIndex={0}
              onClick={() => openMix(mix, mixWorlds[i])}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  openMix(mix, mixWorlds[i]);
                }
              }}
              className="noir-home-poster group noir-focus-ring"
              style={{ background: COLOR_WORLDS[mixWorlds[i]].field, color: inkOn(mixWorlds[i]) }}
              initial={reduced ? false : { opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.36, ease: EASE_PREMIUM, delay: 0.08 + i * 0.04 }}
            >
              <span className="relative block">
                <NoirMixCover tag={mix.tag} world={mixWorlds[i]} size={152} radius={0} />
                {onPlayPlaylist && (
                  <button
                    type="button"
                    className="noir-home-poster-play noir-focus-ring"
                    aria-label={`${strings.home.playMix}: ${mix.name}`}
                    onClick={(e) => {
                      e.stopPropagation();
                      playMix(mix);
                    }}
                  >
                    <Play className="ml-0.5 h-4 w-4 fill-current" />
                  </button>
                )}
              </span>
              <span className="noir-home-poster-text">
                <span className="noir-home-poster-name">{mix.name}</span>
                <span className="noir-home-poster-meta">{mix.subtitle}</span>
              </span>
            </motion.div>
          ))}
        </NoirHomeShelf>
      </section>
    )}
    </>
  );

  const libraryBlock = (
    <>
    {(favorites.length > 0 || playlists.length > 0) && (
      <section>
        <SectionHead title={strings.home.yourLibrary} meta={strings.home.meta.library(favorites.length, playlists.length)} />
        {/* Compact rows, same shape as Jump back in: the covers live in Library, not here. */}
        <div className="noir-home-tiles">
          {favorites.length > 0 && (
            <button
              type="button"
              onClick={() => window.dispatchEvent(new Event('noir-open-favorites'))}
              className="noir-home-tile noir-focus-ring"
            >
              <span className="noir-home-tile-art">
                <NoirFavoritesCover size={64} radius={0} />
              </span>
              <span className="min-w-0 flex-1">
                <span className="noir-song-title block truncate">{strings.home.favorites}</span>
                <span className="noir-song-meta block truncate">{strings.playlist.songCount(favorites.length)}</span>
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
              className="noir-home-tile noir-focus-ring"
            >
              <span className="noir-home-tile-art">
                <NoirPlaylistCover playlistId={playlist.id} trackCount={playlist.tracks.length} size={64} radius={0} />
              </span>
              <span className="min-w-0 flex-1">
                <span className="noir-song-title block truncate">{playlist.name}</span>
                <span className="noir-song-meta block truncate">{strings.playlist.songCount(playlist.tracks.length)}</span>
              </span>
            </button>
          ))}
          <button
            type="button"
            onClick={() =>
              window.dispatchEvent(new CustomEvent('noir-open-playlist', { detail: { id: createPlaylist().id } }))
            }
            className="noir-home-tile noir-focus-ring"
          >
            <span className="noir-home-tile-art flex items-center justify-center text-[color:var(--noir-text-secondary)]">
              <Plus className="h-5 w-5" strokeWidth={1.5} />
            </span>
            <span className="noir-song-title block truncate">{strings.playlist.newPlaylist}</span>
          </button>
        </div>
      </section>
    )}
    </>
  );

  const releasesBlock =
    releases && releases.length > 0 ? (
      <section>
        <SectionHead
          title={releasesFallback ? strings.home.latestReleases : strings.discover.newReleases}
          meta={releasesFallback ? strings.home.meta.latestEach : strings.home.meta.releases(RELEASE_DAYS)}
        />
        <NoirHomeShelf>
          {releases.map((release, i) => (
            <ReleaseCard
              key={release.id}
              release={release}
              index={i}
              reduced={reduced}
              onOpen={() => onSelectPlaylist && void openRelease(release, onSelectPlaylist)}
              onPlay={() => onPlayPlaylist && void playRelease(release, onPlayPlaylist)}
            />
          ))}
        </NoirHomeShelf>
      </section>
    ) : releases === null && artistSlots >= 2 ? (
      <section aria-hidden>
        <SectionHead title={strings.discover.newReleases} />
        <NoirHomeShelf>
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="noir-home-shelf-card">
              <div className="noir-skeleton h-[168px] w-[168px] rounded-[var(--noir-radius-md)]" />
              <div className="noir-skeleton mt-3 h-3 w-24 rounded" />
            </div>
          ))}
        </NoirHomeShelf>
      </section>
    ) : null;

  const becauseBlock = because ? (
    <section>
      <SectionHead
        title={strings.discover.because(because.seed)}
        meta={onOpenDiscover ? strings.home.meta.moreInDiscover : null}
        onMeta={onOpenDiscover}
      />
      <NoirHomeShelf>
        {because.tracks.map((track, i) => (
          <NoirTrackCard key={track.id} track={track} index={i} reduced={reduced} onPlay={() => handleSelectSong(track)} />
        ))}
      </NoirHomeShelf>
    </section>
  ) : null;

  const sectionOrder = SECTION_ORDER[daypart];
  const blocks: Record<HomeSection, ReactNode> = {
    artists: artistsBlock,
    releases: releasesBlock,
    because: becauseBlock,
    recents: recentsBlock,
    mixes: mixesBlock,
    library: libraryBlock,
  };

  return (
    <div className="relative h-full min-h-0 overflow-y-auto scrollbar-none">
      <div className="h-[60px] shrink-0" />

      {/* Dev check of every mix symbol: open Home with ?covers */}
      {typeof window !== 'undefined' && new URLSearchParams(window.location.search).has('covers') && (
        <div className="noir-content pt-4">
          <NoirMixCoverGallery />
        </div>
      )}

      {featuredTrack ? (
        <div className="noir-content shrink-0 pt-4">
          {/* Your day: the line grows from midnight to now and swells in the hours you listened.
              The field follows the time of day. Copy sits on the flat left, never on the form. */}
          <motion.section
            className="noir-home-day"
            data-light={(!grainTheme && heroWorld(featuredTrack) === 'bone') || undefined}
            style={
              grainTheme
                ? { background: '#0b0b0b', color: 'var(--noir-text-primary)' }
                : {
                    background: heroField(heroWorld(featuredTrack)),
                    color: heroInk(heroWorld(featuredTrack)),
                  }
            }
            initial={reduced ? false : { opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.42, ease: EASE_PREMIUM }}
          >
            {grainTheme ? (
              <NoirGrainField track={featuredTrack} />
            ) : (
              <NoirHomeHero track={featuredTrack} playing={isFeaturedPlaying} variant="2" size={248} />
            )}
            <div className="noir-home-day-copy">
              <h1 className="noir-home-greeting-title">{greeting}</h1>
              <div className="noir-home-day-now">
                <button
                  type="button"
                  onClick={() => playFromHome(featuredTrack)}
                  className="noir-home-day-art noir-focus-ring"
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
                  className="noir-play-round noir-focus-ring"
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
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="noir-settle-group noir-content relative py-6"
        >
          {!featuredTrack && needsColdStart === true && (
            <NoirColdStart onSeeded={handleColdStartSeeded} onBrowseDiscover={onOpenDiscover} />
          )}

          {!featuredTrack && needsColdStart === false && !mixesLoading && displayMixes.length === 0 && (
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
                  className="inline-flex h-9 items-center gap-2 rounded-[var(--noir-radius-md)] bg-white/[0.1] px-3.5 text-[13px] font-medium text-white transition-colors hover:bg-white/[0.15] noir-focus-ring"
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
                    className="inline-flex h-9 items-center gap-2 rounded-[var(--noir-radius-md)] border border-white/10 px-3.5 text-[13px] font-medium text-[color:var(--noir-text-secondary)] transition-colors hover:border-white/20 hover:bg-white/[0.05] hover:text-white noir-focus-ring"
                  >
                    <Compass className="h-3.5 w-3.5" strokeWidth={1.75} />
                    Discover
                  </button>
                )}
              </div>
            </div>
          )}

          {sectionOrder.map((id) => (
            <Fragment key={id}>{blocks[id]}</Fragment>
          ))}
        </motion.div>
      </div>
    </div>
  );
}
