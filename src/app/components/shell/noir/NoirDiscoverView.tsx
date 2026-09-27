import { useCallback, useEffect, useState } from 'react';
import { Play, RefreshCw } from 'lucide-react';
import { SearchResult } from '../../../types';
import { Playlist } from '../../PlaylistDetailsView';
import { fetchAppleMusicChart, STOREFRONT_COUNTRIES } from '../../../utils/chartFeeds';
import { NoirRankedSongRow } from './NoirRankedSongRow';
import { NoirDitherCover } from './NoirDitherCover';
import { worldForCollection } from '../../../utils/ditherCover';
import { isTrackFavorite } from '../../../utils/favoriteUtils';

import topHitsDenmark from '../../../../top_hits_denmark.png';
import topHitsGlobal from '../../../../top_hits_global.png';

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
  onSelectSong,
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
    thumbnail: localHits[0]?.thumbnail ?? topHitsDenmark,
    accent: 'wine',
  };

  const globalPlaylist: Playlist = {
    id: 'global_hits',
    name: 'Top Hits: Global',
    description: 'The biggest tracks from charts around the world.',
    tracks: globalHits,
    thumbnail: globalHits[0]?.thumbnail ?? topHitsGlobal,
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

  const playChart = (e: React.MouseEvent, name: string, tracks: SearchResult[]) => {
    e.stopPropagation();
    if (tracks.length === 0) return;
    onPlayPlaylist(tracks, name);
  };

  const featured = localHits[0];
  const localTracks = localHits.slice(0, 10);

  return (
    <div className="flex flex-col gap-10 pb-6">
      {isLoading ? (
        <div className="space-y-3">
          <div className="h-[min(36vh,280px)] animate-pulse rounded-[var(--noir-radius-xl)] bg-[color:var(--noir-elevated)]" />
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-12 animate-pulse rounded-[var(--noir-radius-md)] bg-[color:var(--noir-elevated)]" />
          ))}
        </div>
      ) : loadError && localHits.length === 0 && globalHits.length === 0 ? (
        <div className="py-16">
          <p className="text-[15px] text-[color:var(--noir-text-primary)]">Could not load charts</p>
          <p className="mt-2 text-[14px] text-[color:var(--noir-text-secondary)]">{loadError}</p>
          <button
            type="button"
            onClick={() => void loadCharts()}
            className="mt-5 inline-flex items-center gap-2 text-[13px] text-[color:var(--noir-text-secondary)] hover:text-white"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            Retry
          </button>
        </div>
      ) : (
        <>
          {featured && (
            <button
              type="button"
              onClick={() => onSelectPlaylist(localPlaylist)}
              className="group flex w-full items-end gap-6 text-left elva-focus-ring"
            >
              <NoirDitherCover
                source={featured.thumbnail}
                world={worldForCollection(localPlaylist.id)}
                seed={localPlaylist.id}
                size={220}
                className="transition-transform duration-300 group-hover:scale-[1.015]"
              />
              <div className="min-w-0 pb-1">
                <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[color:var(--noir-text-tertiary)]">
                  {localPlaylist.name} · No. 1
                </p>
                <h2 className="mt-2 truncate text-[clamp(1.6rem,3vw,2.25rem)] font-semibold leading-tight tracking-[-0.02em] text-[color:var(--noir-text-primary)]">
                  {featured.title}
                </h2>
                <p className="mt-1 text-[14px] text-[color:var(--noir-text-secondary)]">{featured.artist}</p>
                <span
                  onClick={(e) => playChart(e, localPlaylist.name, localHits)}
                  className="noir-button-primary mt-5"
                >
                  <Play className="h-3.5 w-3.5 fill-current" />
                  Play chart
                </span>
              </div>
            </button>
          )}

          <section>
            <h3 className="noir-section-heading px-1">
              Charts
            </h3>
            <div className="flex flex-col gap-0.5">
              {localHits.length > 0 && (
                <button
                  type="button"
                  onClick={() => onSelectPlaylist(localPlaylist)}
                  className="noir-track-row flex w-full items-center gap-3 px-3 py-3 text-left elva-focus-ring"
                >
                  <NoirDitherCover
                    source={localHits[0]?.thumbnail}
                    world={worldForCollection(localPlaylist.id)}
                    seed={localPlaylist.id}
                    size={48}
                  />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[14px] font-medium text-[color:var(--noir-text-primary)]">
                      {localPlaylist.name}
                    </p>
                    <p className="truncate text-[13px] text-[color:var(--noir-text-secondary)]">
                      {localHits.length} tracks
                    </p>
                  </div>
                </button>
              )}

              {globalHits.length > 0 && (
                <button
                  type="button"
                  onClick={() => onSelectPlaylist(globalPlaylist)}
                  className="noir-track-row flex w-full items-center gap-3 px-3 py-3 text-left elva-focus-ring"
                >
                  <NoirDitherCover
                    source={globalHits[0]?.thumbnail}
                    world={worldForCollection(globalPlaylist.id)}
                    seed={globalPlaylist.id}
                    size={48}
                  />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[14px] font-medium text-[color:var(--noir-text-primary)]">
                      {globalPlaylist.name}
                    </p>
                    <p className="truncate text-[13px] text-[color:var(--noir-text-secondary)]">
                      {globalHits.length} tracks
                    </p>
                  </div>
                </button>
              )}
            </div>
          </section>

          {localTracks.length > 0 && (
            <section className="relative">
              <h3 className="noir-section-heading px-1">
                {countryData.name}
              </h3>
              <div className="flex flex-col gap-0.5">
                {localTracks.map((track, i) => (
                  <NoirRankedSongRow
                    key={track.id}
                    rank={i + 1}
                    track={track}
                    isFavorite={isTrackFavorite(favorites, track)}
                    onPlay={() => onPlayPlaylist(localHits, localPlaylist.name, i)}
                    onAddToQueue={onAddToQueue}
                    onPlayNext={onPlayNext}
                    onToggleFavorite={onToggleFavorite}
                  />
                ))}
              </div>
            </section>
          )}
        </>
      )}
    </div>
  );
}
