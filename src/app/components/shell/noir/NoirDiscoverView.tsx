import { useCallback, useEffect, useState } from 'react';
import { motion } from 'motion/react';
import { ArrowRight, Play, RefreshCw } from 'lucide-react';
import { SearchResult } from '../../../types';
import { Playlist } from '../../PlaylistDetailsView';
import { fetchAppleMusicChart, STOREFRONT_COUNTRIES } from '../../../utils/chartFeeds';
import { NoirRankedSongRow } from './NoirRankedSongRow';
import { NoirDitherCover } from './NoirDitherCover';
import { worldForCollection } from '../../../utils/ditherCover';
import { isTrackFavorite } from '../../../utils/favoriteUtils';
import { EASE_PREMIUM, MOTION, prefersReducedMotion } from '../../../utils/motionPresets';
import { strings } from '../../../constants/strings';

export type NoirDiscoverViewProps = {
  onSelectSong: (song: SearchResult) => void;
  onAddToQueue: (song: SearchResult) => void;
  onPlayPlaylist: (tracks: SearchResult[], label?: string, startIndex?: number) => void;
  onPlayNext?: (song: SearchResult) => void;
  onToggleFavorite?: (song: SearchResult) => void;
  favorites?: SearchResult[];
  onSelectPlaylist: (playlist: Playlist) => void;
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

export function NoirDiscoverView({
  onAddToQueue,
  onPlayPlaylist,
  onPlayNext,
  onToggleFavorite,
  favorites = [],
  onSelectPlaylist,
}: NoirDiscoverViewProps) {
  const [activeCountry, setActiveCountry] = useState(
    () => localStorage.getItem('elva_profile_country') || 'dk'
  );
  const [localHits, setLocalHits] = useState<SearchResult[]>(() => readCacheSync(activeCountry));
  const [globalHits, setGlobalHits] = useState<SearchResult[]>(() => readCacheSync('us'));
  const [isLoading, setIsLoading] = useState(
    () => readCacheSync(activeCountry).length === 0 || readCacheSync('us').length === 0
  );
  const [loadError, setLoadError] = useState<string | null>(null);

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
    if (!hasCache) setIsLoading(true);
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

    setIsLoading(false);
  }, [activeCountry, localHits.length, globalHits.length]);

  useEffect(() => {
    void loadCharts();
  }, [loadCharts]);

  if (isLoading) {
    return (
      <div className="flex flex-col gap-10 pb-6">
        <div className="noir-discover-charts">
          {[0, 1].map((i) => (
            <div key={i} className="noir-skeleton h-[216px] rounded-[var(--noir-radius-lg)]" />
          ))}
        </div>
        <div className="noir-discover-ranked">
          {Array.from({ length: 10 }).map((_, i) => (
            <div key={i} className="noir-skeleton h-[72px] rounded-[var(--noir-radius-md)]" />
          ))}
        </div>
      </div>
    );
  }

  if (loadError && localHits.length === 0 && globalHits.length === 0) {
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

  const rankedSections = [
    { playlist: localPlaylist, label: strings.discover.topIn(countryData.name) },
    { playlist: globalPlaylist, label: strings.discover.topGlobal },
  ].filter((s) => s.playlist.tracks.length > 0);

  return (
    <div className="flex flex-col pb-6">
      <section className="noir-discover-charts">
        {[localPlaylist, globalPlaylist]
          .filter((p) => p.tracks.length > 0)
          .map((playlist, i) => (
            <ChartCard
              key={playlist.id}
              playlist={playlist}
              index={i}
              onOpen={() => onSelectPlaylist(playlist)}
              onPlay={() => onPlayPlaylist(playlist.tracks, playlist.name)}
            />
          ))}
      </section>

      {rankedSections.map(({ playlist, label }) => (
        <section key={playlist.id}>
          <div className="mb-4 mt-[var(--noir-section-gap)] flex items-baseline justify-between gap-4 px-1">
            <h3 className="noir-section-title">{label}</h3>
            <button
              type="button"
              onClick={() => onSelectPlaylist(playlist)}
              className="noir-link elva-focus-ring"
            >
              {strings.discover.showAll}
            </button>
          </div>
          <div className="noir-discover-ranked">
            {playlist.tracks.slice(0, 10).map((track, i) => (
              <NoirRankedSongRow
                key={track.id}
                rank={i + 1}
                track={track}
                isFavorite={isTrackFavorite(favorites, track)}
                onPlay={() => onPlayPlaylist(playlist.tracks, playlist.name, i)}
                onAddToQueue={onAddToQueue}
                onPlayNext={onPlayNext}
                onToggleFavorite={onToggleFavorite}
              />
            ))}
          </div>
        </section>
      ))}
    </div>
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
