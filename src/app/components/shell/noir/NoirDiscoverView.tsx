import { useCallback, useEffect, useMemo, useState } from 'react';
import { motion } from 'motion/react';
import { ArrowRight, Play, RefreshCw } from 'lucide-react';
import { SearchResult } from '../../../types';
import { Playlist } from '../../PlaylistDetailsView';
import { fetchAppleMusicChart, STOREFRONT_COUNTRIES } from '../../../utils/chartFeeds';
import { NoirSongRow } from './NoirSongRow';
import { NoirDitherCover } from './NoirDitherCover';
import { worldForCollection } from '../../../utils/ditherCover';
import { isTrackFavorite } from '../../../utils/favoriteUtils';
import { EASE_PREMIUM, MOTION, prefersReducedMotion } from '../../../utils/motionPresets';
import { strings } from '../../../constants/strings';
import { getListeningEvents } from '../../../services/listening/eventsStore';
import { topArtists } from '../../../services/listening/tasteProfile';
import {
  DiscoverArtistCard,
  DiscoverFeed,
  DiscoverReleaseCard,
  loadAlbumAsPlaylistTracks,
  loadDiscoverFeed,
} from '../../../services/discover/discoverFeed';
import { getPrimaryArtist } from '../../../utils/stringUtils';
import { normalizeName } from '../../../services/musicGraph/normalize';

export type NoirDiscoverViewProps = {
  onSelectSong: (song: SearchResult) => void;
  onAddToQueue: (song: SearchResult) => void;
  onPlayPlaylist: (tracks: SearchResult[], label?: string, startIndex?: number) => void;
  onPlayNext?: (song: SearchResult) => void;
  onToggleFavorite?: (song: SearchResult) => void;
  favorites?: SearchResult[];
  onSelectPlaylist: (playlist: Playlist) => void;
  onViewArtist?: (name: string, channelId?: string, thumbnail?: string) => void;
};

function readCacheSync(country: string): SearchResult[] {
  try {
    const raw = localStorage.getItem(`elva_apple_chart_${country}_v2`);
    if (raw) {
      const entry = JSON.parse(raw);
      if (entry?.tracks?.length) return entry.tracks;
    }
  } catch {
    /* ignore */
  }
  return [];
}

function formatReleaseDate(iso: string) {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}

export function NoirDiscoverView({
  onAddToQueue,
  onPlayPlaylist,
  onPlayNext,
  onToggleFavorite,
  favorites = [],
  onSelectPlaylist,
  onViewArtist,
}: NoirDiscoverViewProps) {
  const [activeCountry, setActiveCountry] = useState(
    () => localStorage.getItem('elva_profile_country') || 'dk'
  );
  const [localHits, setLocalHits] = useState<SearchResult[]>(() => readCacheSync(activeCountry));
  const [globalHits, setGlobalHits] = useState<SearchResult[]>(() => readCacheSync('us'));
  const [chartsLoading, setChartsLoading] = useState(
    () => readCacheSync(activeCountry).length === 0 || readCacheSync('us').length === 0
  );
  const [loadError, setLoadError] = useState<string | null>(null);
  const [feed, setFeed] = useState<DiscoverFeed | null>(null);
  /** True only while fetching personal shelves — not during cold-start IDB peek. */
  const [feedLoading, setFeedLoading] = useState(false);
  const [feedReady, setFeedReady] = useState(false);

  const countryData =
    STOREFRONT_COUNTRIES.find((c) => c.code === activeCountry) || { name: 'Denmark', flag: '🇩🇰' };

  const localPlaylist: Playlist = {
    id: 'dk_hits',
    name: `Top Hits: ${countryData.name}`,
    description: `The most popular tracks in ${countryData.name} right now.`,
    tracks: localHits,
    thumbnail: localHits[0]?.thumbnail ?? '',
    accent: 'wine',
  };

  const globalPlaylist: Playlist = {
    id: 'global_hits',
    name: 'Top Hits: Global',
    description: 'The biggest tracks from charts around the world.',
    tracks: globalHits,
    thumbnail: globalHits[0]?.thumbnail ?? '',
    accent: 'navy',
  };

  useEffect(() => {
    const handleProfileUpdate = () => {
      setActiveCountry(localStorage.getItem('elva_profile_country') || 'dk');
    };
    window.addEventListener('elva-profile-updated', handleProfileUpdate);
    return () => window.removeEventListener('elva-profile-updated', handleProfileUpdate);
  }, []);

  const loadCharts = useCallback(async () => {
    const hasCache = localHits.length > 0 && globalHits.length > 0;
    if (!hasCache) setChartsLoading(true);
    setLoadError(null);

    const [local, global] = await Promise.all([
      fetchAppleMusicChart(activeCountry),
      fetchAppleMusicChart('us'),
    ]);

    setLocalHits(local.tracks);
    setGlobalHits(global.tracks);

    if (local.tracks.length === 0 && global.tracks.length === 0) {
      setLoadError(local.error ?? global.error ?? 'Charts unavailable');
    }

    setChartsLoading(false);
  }, [activeCountry, localHits.length, globalHits.length]);

  const loadFeed = useCallback(async () => {
    try {
      const events = await getListeningEvents();
      if (topArtists(events, 30).length === 0) {
        setFeed({ newReleases: [], artistsLike: [], tags: [] });
        setFeedLoading(false);
        setFeedReady(true);
        return;
      }
      setFeedLoading(true);
      setFeed(await loadDiscoverFeed(events));
    } catch {
      setFeed({ newReleases: [], artistsLike: [], tags: [] });
    } finally {
      setFeedLoading(false);
      setFeedReady(true);
    }
  }, []);

  useEffect(() => {
    void loadCharts();
  }, [loadCharts]);

  useEffect(() => {
    void loadFeed();
  }, [loadFeed]);

  const openRelease = async (release: DiscoverReleaseCard) => {
    const tracks = await loadAlbumAsPlaylistTracks(release);
    onSelectPlaylist({
      id: `release:${release.id}`,
      name: release.title,
      description: strings.discover.releaseMeta(release.artist, formatReleaseDate(release.releaseDate)),
      tracks,
      thumbnail: release.image ?? '',
      accent: 'navy',
    });
  };

  const playRelease = async (release: DiscoverReleaseCard) => {
    const tracks = await loadAlbumAsPlaylistTracks(release);
    if (tracks.length > 0) {
      onPlayPlaylist(tracks, release.title);
    }
  };

  const openTagShelf = (title: string, tracks: SearchResult[], id: string) => {
    onSelectPlaylist({
      id,
      name: title,
      description: strings.discover.browseTag(title),
      tracks,
      thumbnail: tracks[0]?.thumbnail ?? '',
      accent: 'sand',
    });
  };

  const chartsEmpty = loadError && localHits.length === 0 && globalHits.length === 0;
  const personalReady = feedReady && feed;
  const hasPersonal =
    !!personalReady &&
    (feed.newReleases.length > 0 || feed.artistsLike.length > 0 || feed.tags.length > 0);
  const coldStart = feedReady && !hasPersonal && !feedLoading;

  const chartArtists = useMemo(() => {
    if (!coldStart) return [];
    const source = localHits.length > 0 ? localHits : globalHits;
    const seen = new Set<string>();
    const artists: DiscoverArtistCard[] = [];
    for (const track of source) {
      const name = getPrimaryArtist(track.artist);
      const key = normalizeName(name);
      if (!key || seen.has(key)) continue;
      seen.add(key);
      artists.push({
        id: `chart-artist:${key}`,
        name,
        image: track.thumbnail || undefined,
        seedArtist: name,
      });
      if (artists.length >= 12) break;
    }
    return artists.length >= 3 ? artists : [];
  }, [coldStart, localHits, globalHits]);

  if (chartsEmpty && !hasPersonal && feedReady) {
    return (
      <div className="py-16">
        <p className="text-[15px] text-[color:var(--noir-text-primary)]">{strings.discover.trendingUnavailable}</p>
        <p className="mt-2 text-[14px] text-[color:var(--noir-text-secondary)]">{strings.discover.trendingDesc}</p>
        <button type="button" onClick={() => void loadCharts()} className="noir-button-secondary mt-5 elva-focus-ring">
          <RefreshCw className="h-3.5 w-3.5" />
          {strings.discover.retry}
        </button>
      </div>
    );
  }

  const reduced = prefersReducedMotion();
  const chartSlots: Array<{ key: string; playlist: Playlist | null }> = [
    { key: 'local', playlist: localHits.length > 0 ? localPlaylist : null },
    { key: 'global', playlist: globalHits.length > 0 ? globalPlaylist : null },
  ];

  return (
    <div className="flex flex-col pb-6">
      {coldStart && (
        <p className="mb-8 max-w-lg px-1 text-[14px] text-[color:var(--noir-text-secondary)]">
          {strings.discover.emptyTasteDesc}
        </p>
      )}

      {feedLoading && (
        <>
          <section>
            <div className="noir-skeleton mb-4 mt-2 h-5 w-52 rounded px-1" />
            <div className="noir-home-shelf">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="noir-skeleton h-[188px] w-[168px] shrink-0 rounded-[var(--noir-radius-md)]" />
              ))}
            </div>
          </section>
          <section>
            <div className="noir-skeleton mb-4 mt-[var(--noir-section-gap)] h-5 w-44 rounded px-1" />
            <div className="noir-home-shelf">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="flex w-[128px] shrink-0 flex-col items-center px-2.5">
                  <div className="noir-skeleton h-[108px] w-[108px] rounded-full" />
                  <div className="noir-skeleton mt-3 h-3.5 w-20 rounded" />
                </div>
              ))}
            </div>
          </section>
        </>
      )}

      {feed && feed.newReleases.length > 0 && (
        <section>
          <h3 className="noir-section-heading !mt-2 px-1">{strings.discover.newReleases}</h3>
          <div className="noir-home-shelf">
            {feed.newReleases.map((release, i) => (
              <ReleaseCard
                key={release.id}
                release={release}
                index={i}
                reduced={reduced}
                onOpen={() => void openRelease(release)}
                onPlay={() => void playRelease(release)}
              />
            ))}
          </div>
        </section>
      )}

      {feed && feed.artistsLike.length > 0 && (
        <section>
          <h3 className="noir-section-heading px-1">{strings.discover.artistsLike}</h3>
          <div className="noir-home-shelf">
            {feed.artistsLike.map((artist, i) => (
              <ArtistCard
                key={artist.id}
                artist={artist}
                index={i}
                reduced={reduced}
                onOpen={() => onViewArtist?.(artist.name, undefined, artist.image)}
              />
            ))}
          </div>
        </section>
      )}

      {chartArtists.length > 0 && (
        <section>
          <h3 className={`noir-section-heading px-1 ${hasPersonal ? '' : '!mt-2'}`}>
            {strings.discover.chartArtists}
          </h3>
          <div className="noir-home-shelf">
            {chartArtists.map((artist, i) => (
              <ArtistCard
                key={artist.id}
                artist={artist}
                index={i}
                reduced={reduced}
                onOpen={() => onViewArtist?.(artist.name, undefined, artist.image)}
              />
            ))}
          </div>
        </section>
      )}

      {feed &&
        feed.tags.map((shelf) => (
          <section key={shelf.id}>
            <div className="mb-4 mt-[var(--noir-section-gap)] flex items-baseline justify-between gap-4 px-1">
              <h3 className="noir-section-title">{shelf.title}</h3>
              <button
                type="button"
                onClick={() => openTagShelf(shelf.title, shelf.tracks, shelf.id)}
                className="noir-link elva-focus-ring"
              >
                {strings.discover.showAll}
              </button>
            </div>
            <div className="flex flex-col gap-0.5">
              {shelf.tracks.slice(0, 6).map((track, i) => (
                <NoirSongRow
                  key={track.id}
                  track={track}
                  isFavorite={isTrackFavorite(favorites, track)}
                  onPlay={() => onPlayPlaylist(shelf.tracks, shelf.title, i)}
                  onAddToQueue={onAddToQueue}
                  onPlayNext={onPlayNext}
                  onToggleFavorite={onToggleFavorite}
                />
              ))}
            </div>
          </section>
        ))}

      <section className={hasPersonal || feedLoading || chartArtists.length > 0 ? 'mt-[var(--noir-section-gap)]' : undefined}>
        {(hasPersonal || chartArtists.length > 0) && (
          <h3 className="noir-section-heading !mt-0 px-1">{strings.discover.charts}</h3>
        )}
        <div className="noir-discover-charts">
          {chartSlots.map(({ key, playlist }, i) =>
            playlist ? (
              <ChartCard
                key={playlist.id}
                playlist={playlist}
                index={i}
                onOpen={() => onSelectPlaylist(playlist)}
                onPlay={() => onPlayPlaylist(playlist.tracks, playlist.name)}
              />
            ) : chartsLoading ? (
              <div key={key} className="noir-skeleton h-[216px] rounded-[var(--noir-radius-lg)]" />
            ) : null
          )}
        </div>
      </section>
    </div>
  );
}

function ReleaseCard({
  release,
  index,
  reduced,
  onOpen,
  onPlay,
}: {
  release: DiscoverReleaseCard;
  index: number;
  reduced: boolean;
  onOpen: () => void;
  onPlay: () => void;
}) {
  return (
    <motion.div
      role="button"
      tabIndex={0}
      onClick={onOpen}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onOpen();
        }
      }}
      className="noir-collection-card noir-home-shelf-card group elva-focus-ring"
      initial={reduced ? false : { opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.36, ease: EASE_PREMIUM, delay: index * 0.03 }}
    >
      <span className="relative block">
        <NoirDitherCover
          source={release.image}
          world={worldForCollection(release.id)}
          seed={release.id}
          size={168}
        />
        <motion.button
          type="button"
          className="noir-discover-release-play noir-play-round !h-10 !w-10 elva-focus-ring"
          aria-label={`${strings.discover.playRelease}: ${release.title}`}
          onClick={(e) => {
            e.stopPropagation();
            onPlay();
          }}
          whileTap={{ scale: 0.94 }}
          transition={MOTION.tap}
        >
          <Play className="ml-0.5 h-4 w-4 fill-current" />
        </motion.button>
      </span>
      <span className="min-w-0">
        <span className="noir-song-title block truncate">{release.title}</span>
        <span className="noir-song-meta mt-0.5 block truncate">
          {strings.discover.releaseMeta(release.artist, formatReleaseDate(release.releaseDate))}
        </span>
      </span>
    </motion.div>
  );
}

function ArtistCard({
  artist,
  index,
  reduced,
  onOpen,
}: {
  artist: DiscoverArtistCard;
  index: number;
  reduced: boolean;
  onOpen: () => void;
}) {
  return (
    <motion.button
      type="button"
      onClick={onOpen}
      className="noir-home-artist group elva-focus-ring"
      initial={reduced ? false : { opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.36, ease: EASE_PREMIUM, delay: 0.06 + index * 0.03 }}
    >
      <span className="noir-home-artist-art">
        <NoirDitherCover
          source={artist.image}
          world={worldForCollection(artist.id)}
          seed={artist.id}
          size={108}
          radius={999}
        />
      </span>
      <span className="noir-song-title mt-3 block truncate text-center">{artist.name}</span>
    </motion.button>
  );
}

function ChartCard({
  playlist,
  index,
  onOpen,
  onPlay,
}: {
  playlist: Playlist;
  index: number;
  onOpen: () => void;
  onPlay: () => void;
}) {
  const reduced = prefersReducedMotion();
  const preview = playlist.tracks.slice(0, 3);

  return (
    <motion.div
      role="button"
      tabIndex={0}
      onClick={onOpen}
      onKeyDown={(e) => {
        if (e.key === 'Enter') onOpen();
      }}
      className="noir-chart-card group elva-focus-ring"
      initial={reduced ? false : { opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, ease: EASE_PREMIUM, delay: index * 0.07 }}
    >
      <span className="noir-chart-card-cover">
        <NoirDitherCover
          source={playlist.tracks[0]?.thumbnail}
          world={worldForCollection(playlist.id)}
          seed={playlist.id}
          size={176}
        />
      </span>

      <div className="flex min-w-0 flex-1 flex-col">
        <p className="noir-label">{strings.discover.chart}</p>
        <h2 className="noir-chart-card-title">{playlist.name}</h2>
        <ol className="noir-chart-card-preview">
          {preview.map((track, i) => (
            <li key={track.id} className="flex min-w-0 items-baseline gap-2.5">
              <span className="noir-chart-card-rank">{i + 1}</span>
              <span className="min-w-0 truncate">
                <span className="text-[color:var(--noir-text-primary)]">{track.title}</span>
                <span className="text-[color:var(--noir-text-tertiary)]"> · {track.artist}</span>
              </span>
            </li>
          ))}
        </ol>

        <div className="mt-auto flex items-center gap-3 pt-4">
          <motion.button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onPlay();
            }}
            className="noir-play-round !h-11 !w-11 elva-focus-ring"
            aria-label={`${strings.discover.playChart}: ${playlist.name}`}
            whileTap={{ scale: 0.94 }}
            transition={MOTION.tap}
          >
            <Play className="ml-0.5 h-[18px] w-[18px] fill-current" />
          </motion.button>
          <span className="noir-chart-card-more">
            {strings.discover.songs(playlist.tracks.length)}
            <ArrowRight className="h-3.5 w-3.5 transition-transform duration-200 group-hover:translate-x-0.5" strokeWidth={1.75} />
          </span>
        </div>
      </div>
    </motion.div>
  );
}
