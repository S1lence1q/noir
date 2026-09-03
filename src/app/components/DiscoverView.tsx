import React, { useState, useEffect, useCallback } from 'react';
import { motion } from 'motion/react';
import { Play, Compass, Flame, Heart, Sparkles, RefreshCw, AlertCircle } from 'lucide-react';
import { SearchResult } from '../types';
import { AccentColor, ACCENT_THEMES } from './themeUtils';
import { Playlist } from './PlaylistDetailsView';
import { SongRowOptions } from './SongRowOptions';
import { NoirSongRow } from './shell/noir/NoirSongRow';
import { ElvaEmptyState } from './ElvaEmptyState';
import { strings } from '../constants/strings';
import { fetchAppleMusicChart, STOREFRONT_COUNTRIES } from '../utils/chartFeeds';

import topHitsDenmark from '../../top_hits_denmark.png';
import topHitsGlobal from '../../top_hits_global.png';

interface DiscoverViewProps {
  onSelectSong: (song: SearchResult) => void;
  onAddToQueue: (song: SearchResult) => void;
  onPlayPlaylist: (tracks: SearchResult[], label?: string) => void;
  onPlayNext?: (song: SearchResult) => void;
  accentColor: AccentColor;
  favorites: SearchResult[];
  onToggleFavorite: (song: SearchResult) => void;
  onSelectPlaylist: (playlist: Playlist) => void;
  noir?: boolean;
}

export const DiscoverView: React.FC<DiscoverViewProps> = ({
  onSelectSong,
  onAddToQueue,
  onPlayPlaylist,
  onPlayNext,
  accentColor,
  favorites,
  onToggleFavorite,
  onSelectPlaylist,
  noir = false,
}) => {
  const theme = ACCENT_THEMES[accentColor];

  const [activeCountry, setActiveCountry] = useState(() => {
    return localStorage.getItem('elva_profile_country') || 'dk';
  });

  // Helper to read cache synchronously on initial render
  const readCacheSync = (country: string): SearchResult[] => {
    try {
      const raw = localStorage.getItem(`elva_apple_chart_${country}_v2`);
      if (raw) {
        const entry = JSON.parse(raw);
        if (entry?.tracks?.length) {
          return entry.tracks;
        }
      }
    } catch {}
    return [];
  };

  const [localHits, setLocalHits] = useState<SearchResult[]>(() => readCacheSync(activeCountry));
  const [globalHits, setGlobalHits] = useState<SearchResult[]>(() => readCacheSync('us'));
  const [isLoading, setIsLoading] = useState(() => {
    return readCacheSync(activeCountry).length === 0 || readCacheSync('us').length === 0;
  });
  const [localError, setLocalError] = useState<string | null>(null);
  const [globalError, setGlobalError] = useState<string | null>(null);
  const [localFromCache, setLocalFromCache] = useState(() => readCacheSync(activeCountry).length > 0);
  const [globalFromCache, setGlobalFromCache] = useState(() => readCacheSync('us').length > 0);

  useEffect(() => {
    const handleProfileUpdate = () => {
      const stored = localStorage.getItem('elva_profile_country') || 'dk';
      setActiveCountry(stored);
    };
    window.addEventListener('elva-profile-updated', handleProfileUpdate);
    return () => {
      window.removeEventListener('elva-profile-updated', handleProfileUpdate);
    };
  }, []);

  const loadCharts = useCallback(async () => {
    const hasCache = localHits.length > 0 && globalHits.length > 0;
    if (!hasCache) {
      setIsLoading(true);
    }
    const [local, global] = await Promise.all([
      fetchAppleMusicChart(activeCountry),
      fetchAppleMusicChart('us'),
    ]);
    setLocalHits(local.tracks);
    setGlobalHits(global.tracks);
    setLocalError(local.error ?? (local.tracks.length === 0 ? 'Chart unavailable' : null));
    setGlobalError(global.error ?? (global.tracks.length === 0 ? 'Chart unavailable' : null));
    setLocalFromCache(local.fromCache);
    setGlobalFromCache(global.fromCache);
    setIsLoading(false);
  }, [activeCountry, localHits.length, globalHits.length]);

  useEffect(() => {
    void loadCharts();
  }, [loadCharts]);

  const handlePlayChart = (e: React.MouseEvent, name: string, tracks: SearchResult[]) => {
    e.stopPropagation();
    if (tracks.length === 0) return;
    onPlayPlaylist(tracks, name);
  };

  const isFavorite = (songId: string) => favorites.some((fav) => fav.id === songId);

  const activeCountryData = STOREFRONT_COUNTRIES.find(c => c.code === activeCountry) || { name: 'Denmark', flag: '🇩🇰' };

  const playlistsConfig: Playlist[] = [
    {
      id: 'dk_hits',
      name: `Top Hits: ${activeCountryData.name}`,
      description: `The most popular tracks in ${activeCountryData.name} right now (Apple Music).`,
      tracks: localHits,
      thumbnail: topHitsDenmark,
      accent: 'wine',
    },
    {
      id: 'global_hits',
      name: 'Top Hits: Global',
      description: 'The biggest tracks from charts around the world (Apple Music).',
      tracks: globalHits,
      thumbnail: topHitsGlobal,
      accent: 'navy',
    },
  ];

  const trendingList = localHits.slice(0, 4);
  const dailyPicks = globalHits.slice(0, 4);

  const ChartLoadError = ({
    message,
    onRetry,
  }: {
    message: string;
    onRetry: () => void;
  }) => (
    <div className="rounded-3xl border border-amber-500/20 bg-amber-500/5 p-6 flex flex-col gap-4 h-[190px] justify-center">
      <div className="flex items-start gap-3">
        <AlertCircle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
        <div>
          <p className="text-sm text-white/80 font-medium">Chart could not load</p>
          <p className="text-xs text-white/45 mt-1 leading-relaxed">{message}</p>
        </div>
      </div>
      <button
        type="button"
        onClick={onRetry}
        className="self-start flex items-center gap-2 px-4 py-2 rounded-xl bg-white/10 hover:bg-white/15 text-xs font-semibold text-white/90 transition-colors cursor-pointer"
      >
        <RefreshCw className="w-3.5 h-3.5" />
        Retry
      </button>
    </div>
  );

  return (
    <motion.div
      initial={{ opacity: 0, y: noir ? 0 : 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: noir ? 0 : 10 }}
      transition={{ duration: noir ? 0.2 : 0.45 }}
      className={
        noir
          ? 'relative z-10 flex w-full flex-col gap-10'
          : 'w-full max-w-[898px] mx-auto relative z-10 flex flex-col gap-10 px-6 pt-4 pb-24'
      }
    >
      <section className="flex flex-col gap-4">
        <div className="flex items-center justify-between mb-2">
          {noir ? (
            <h3 className="text-[15px] font-semibold text-[color:var(--noir-text-primary)]">Featured charts</h3>
          ) : (
            <div className="flex items-center gap-2">
              <Compass className={`w-4 h-4 ${theme.text}`} />
              <h3 className="elva-section-label text-white/55 font-semibold">Featured Charts</h3>
            </div>
          )}
        </div>

        <div className={noir ? 'grid grid-cols-1 gap-4 md:grid-cols-2' : 'grid grid-cols-1 md:grid-cols-2 gap-10'}>
          {isLoading ? (
            Array.from({ length: 2 }).map((_, idx) => (
              <div
                key={idx}
                className="rounded-3xl h-[220px] flex flex-col justify-end p-6 animate-pulse overflow-hidden relative bg-white/[0.04]"
              >
                {/* Shimmer gradient overlay */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent" />
                <div className="relative z-10 space-y-3">
                  <div className="h-2.5 bg-white/10 rounded w-[25%]" />
                  <div className="h-6 bg-white/8 rounded w-[60%]" />
                  <div className="h-8 bg-white/5 rounded-full w-[30%]" />
                </div>
              </div>
            ))
          ) : (
            <>
              {localHits.length > 0 ? (
                <ChartCard
                  chart={playlistsConfig[0]}
                  idx={0}
                  noir={noir}
                  onSelectPlaylist={onSelectPlaylist}
                  onPlayChart={handlePlayChart}
                />
              ) : (
                <ChartLoadError message={localError ?? 'Unknown error'} onRetry={() => void loadCharts()} />
              )}

              {globalHits.length > 0 ? (
                <ChartCard
                  chart={playlistsConfig[1]}
                  idx={1}
                  noir={noir}
                  onSelectPlaylist={onSelectPlaylist}
                  onPlayChart={handlePlayChart}
                />
              ) : (
                <ChartLoadError
                  message={globalError ?? 'Unknown error'}
                  onRetry={() => void loadCharts()}
                />
              )}
            </>
          )}
        </div>
      </section>

      <div className={noir ? 'grid grid-cols-1 gap-10 md:grid-cols-2' : 'grid grid-cols-1 md:grid-cols-2 gap-10'}>
        <section className="flex flex-col gap-4">
          <div className="flex items-center gap-2 mb-2">
            {noir ? (
              <h3 className="text-[15px] font-semibold text-[color:var(--noir-text-primary)]">Trending now</h3>
            ) : (
              <>
                <Flame className={`w-4 h-4 ${theme.text}`} />
                <h3 className="elva-section-label text-white/55 font-semibold">Trending Now</h3>
              </>
            )}
          </div>
          <div className={noir ? 'flex flex-col gap-0.5' : 'space-y-3.5'}>
            {isLoading ? (
              Array.from({ length: 4 }).map((_, idx) => (
                <div
                  key={idx}
                  className="rounded-2xl bg-white/[0.03] h-[74px] animate-pulse"
                />
              ))
            ) : trendingList.length > 0 ? (
              trendingList.map((song, idx) =>
                noir ? (
                  <NoirSongRow
                    key={song.id}
                    track={song}
                    onPlay={() => onSelectSong(song)}
                    onAddToQueue={onAddToQueue}
                    onPlayNext={onPlayNext}
                  />
                ) : (
                  <SongRow
                    key={song.id}
                    song={song}
                    idx={idx}
                    direction="left"
                    onSelectSong={onSelectSong}
                    onPlayNext={onPlayNext}
                    onAddToQueue={onAddToQueue}
                    onToggleFavorite={onToggleFavorite}
                    isFavorite={isFavorite(song.id)}
                  />
                )
              )
            ) : (
              <ElvaEmptyState
                icon={<Flame className="w-6 h-6" />}
                title={strings.discover.trendingUnavailable}
                description={strings.discover.trendingDesc}
                action={{ label: strings.discover.retry, onClick: () => void loadCharts() }}
              />
            )}
          </div>
        </section>

        <section className="flex flex-col gap-4">
          <div className="flex items-center gap-2 mb-2">
            {noir ? (
              <h3 className="text-[15px] font-semibold text-[color:var(--noir-text-primary)]">Daily picks</h3>
            ) : (
              <>
                <Sparkles className={`w-4 h-4 ${theme.text}`} />
                <h3 className="elva-section-label text-white/55 font-semibold">Daily Picks</h3>
              </>
            )}
          </div>
          <div className={noir ? 'flex flex-col gap-0.5' : 'space-y-3.5'}>
            {isLoading ? (
              Array.from({ length: 4 }).map((_, idx) => (
                <div
                  key={idx}
                  className="rounded-2xl bg-white/[0.03] h-[74px] animate-pulse"
                />
              ))
            ) : dailyPicks.length > 0 ? (
              dailyPicks.map((song, idx) =>
                noir ? (
                  <NoirSongRow
                    key={song.id}
                    track={song}
                    onPlay={() => onSelectSong(song)}
                    onAddToQueue={onAddToQueue}
                    onPlayNext={onPlayNext}
                  />
                ) : (
                  <SongRow
                    key={song.id}
                    song={song}
                    idx={idx}
                    direction="right"
                    onSelectSong={onSelectSong}
                    onPlayNext={onPlayNext}
                    onAddToQueue={onAddToQueue}
                    onToggleFavorite={onToggleFavorite}
                    isFavorite={isFavorite(song.id)}
                  />
                )
              )
            ) : (
              <ElvaEmptyState
                icon={<Flame className="w-6 h-6" />}
                title={strings.discover.trendingUnavailable}
                description={strings.discover.trendingDesc}
                action={{ label: strings.discover.retry, onClick: () => void loadCharts() }}
              />
            )}
          </div>
        </section>
      </div>
    </motion.div>
  );
};

function ChartCard({
  chart,
  idx,
  noir = false,
  onSelectPlaylist,
  onPlayChart,
}: {
  chart: Playlist;
  idx: number;
  noir?: boolean;
  onSelectPlaylist: (playlist: Playlist) => void;
  onPlayChart: (e: React.MouseEvent, name: string, tracks: SearchResult[]) => void;
}) {
  const isLocal = chart.id === 'dk_hits';

  if (noir) {
    return (
      <motion.div
        key={chart.id}
        onClick={() => onSelectPlaylist(chart)}
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: idx * 0.08, duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
        className="group relative h-[200px] cursor-pointer overflow-hidden rounded-[var(--noir-radius-xl)] text-left select-none"
      >
        <img
          src={chart.thumbnail}
          alt={chart.name}
          className="absolute inset-0 h-full w-full object-cover transition-transform duration-700 group-hover:scale-[1.03]"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/45 to-black/10" />
        <div className="absolute inset-0 flex flex-col justify-end gap-2 p-5">
          <h3 className="text-xl font-semibold leading-tight tracking-[-0.02em] text-white">{chart.name}</h3>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={(e) => onPlayChart(e, chart.name, chart.tracks)}
              className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3.5 py-1.5 text-[12px] font-medium text-white transition-colors hover:bg-white/15"
            >
              <Play className="h-3 w-3 fill-current" />
              Play all
            </button>
            <span className="text-[12px] text-white/45">{chart.tracks.length} tracks</span>
          </div>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      key={chart.id}
      onClick={() => onSelectPlaylist(chart)}
      initial={{ opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -4 }}
      transition={{ delay: idx * 0.12, duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
      className="relative rounded-3xl h-[220px] group select-none cursor-pointer text-left overflow-hidden"
    >
      {/* Hero image fills entire card */}
      <img
        src={chart.thumbnail}
        alt={chart.name}
        className="absolute inset-0 w-full h-full object-cover scale-[1.04] group-hover:scale-[1.08] transition-transform duration-700"
      />

      {/* Gradient overlay — heavy at bottom, transparent at top */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/45 to-black/10" />

      {/* Subtle color tint per chart */}
      <div
        className="absolute inset-0 opacity-30 mix-blend-color"
        style={{ background: isLocal ? 'rgba(220,38,38,0.5)' : 'rgba(79,70,229,0.5)' }}
      />

      {/* Content sits at the bottom */}
      <div className="absolute inset-0 flex flex-col justify-end p-6 gap-3 z-10">
        {/* Live chart label */}
        <span
          className="text-[10px] font-bold tracking-[0.35em] uppercase w-fit"
          style={{ color: isLocal ? '#fda4af' : '#a5b4fc' }}
        >
          ✦ Live Chart
        </span>

        {/* Chart name — large and prominent */}
        <h3
          className="text-2xl font-semibold text-white leading-tight tracking-tight"
          style={{ textShadow: '0 2px 12px rgba(0,0,0,0.6)' }}
        >
          {chart.name}
        </h3>

        {/* Bottom row: play + track count */}
        <div className="flex items-center gap-3.5">
          <button
            type="button"
            onClick={(e) => onPlayChart(e, chart.name, chart.tracks)}
            className="flex items-center gap-2 px-4 py-2 rounded-full text-white text-xs font-bold tracking-wide transition-all duration-150 cursor-pointer hover:brightness-110 active:scale-95"
            style={{
              background: isLocal ? 'rgba(220,38,38,0.6)' : 'rgba(79,70,229,0.6)',
              backdropFilter: 'blur(8px)',
              boxShadow: isLocal ? '0 2px 10px rgba(220,38,38,0.12)' : '0 2px 10px rgba(79,70,229,0.12)'
            }}
          >
            <Play className="w-3 h-3 fill-current" />
            Play All
          </button>
          <span className="text-[10px] font-semibold text-white/50 uppercase tracking-widest">
            {chart.tracks.length} tracks
          </span>
        </div>
      </div>

      {/* Top-right: first track mini-thumb floating */}
      {chart.tracks.length > 0 && (
        <div className="absolute top-5 right-5 z-10">
          <div className="w-14 h-14 rounded-xl overflow-hidden shadow-2xl ring-1 ring-white/10 rotate-[-3deg] group-hover:rotate-[2deg] group-hover:scale-105 transition-all duration-500">
            <img src={chart.tracks[0].thumbnail} alt="" className="w-full h-full object-cover" />
          </div>
        </div>
      )}
    </motion.div>
  );
}

function SongRow({
  song,
  idx,
  direction,
  onSelectSong,
  onPlayNext,
  onAddToQueue,
  onToggleFavorite,
  isFavorite,
}: {
  song: SearchResult;
  idx: number;
  direction: 'left' | 'right';
  onSelectSong: (song: SearchResult) => void;
  onPlayNext?: (song: SearchResult) => void;
  onAddToQueue: (song: SearchResult) => void;
  onToggleFavorite: (song: SearchResult) => void;
  isFavorite: boolean;
}) {
  return (
    <motion.div
      onClick={() => onSelectSong(song)}
      initial={{ opacity: 0, x: direction === 'left' ? -10 : 10 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: idx * 0.08 }}
      className="group flex items-center justify-between p-4 rounded-2xl border-0 bg-transparent hover:bg-white/[0.04] transition-colors duration-300 cursor-pointer"
    >
      <div className="flex items-center gap-4 text-left min-w-0">
        <div className="relative w-[56px] h-[56px] rounded-xl overflow-hidden shrink-0 bg-neutral-900">
          {song.thumbnail ? (
            <img
              src={song.thumbnail}
              alt={song.title}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
            />
          ) : (
            <div className="w-full h-full bg-white/5" />
          )}
          <div className="absolute inset-0 flex items-center justify-center bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
            <Play className="w-5 h-5 text-white fill-white ml-0.5" />
          </div>
        </div>
        <div className="min-w-0">
          <h4 className="text-sm font-semibold text-white/90 leading-snug truncate group-hover:text-white transition-colors">
            {song.title}
          </h4>
          <p className="text-[12px] text-white/50 mt-1 truncate">{song.artist}</p>
        </div>
      </div>
      <div className="flex items-center gap-2 opacity-60 group-hover:opacity-100 transition-opacity select-none">
        <SongRowOptions track={song} onPlayNext={onPlayNext} onAddToQueue={onAddToQueue} />
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onToggleFavorite(song);
          }}
          className="p-2.5 rounded-xl hover:bg-white/5 transition-all text-white/60 hover:text-white cursor-pointer"
          title={isFavorite ? 'Remove from favorites' : 'Add to favorites'}
        >
          <Heart className={`w-4 h-4 ${isFavorite ? 'text-red-500 fill-red-500' : ''}`} />
        </button>
      </div>
    </motion.div>
  );
}
