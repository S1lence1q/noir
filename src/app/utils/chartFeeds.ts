import { SearchResult } from '../types';
import { robustFetch } from './apiUtils';

const APPLE_CHART_BASE = 'https://rss.marketingtools.apple.com';
const CHART_CACHE_TTL_MS = 6 * 60 * 60 * 1000; // 6 hours

export const STOREFRONT_COUNTRIES = [
  { code: 'dk', name: 'Denmark', flag: '🇩🇰' },
  { code: 'us', name: 'United States', flag: '🇺🇸' },
  { code: 'gb', name: 'United Kingdom', flag: '🇬🇧' },
  { code: 'se', name: 'Sweden', flag: '🇸🇪' },
  { code: 'no', name: 'Norway', flag: '🇳🇴' },
  { code: 'de', name: 'Germany', flag: '🇩🇪' },
  { code: 'fr', name: 'France', flag: '🇫🇷' },
  { code: 'jp', name: 'Japan', flag: '🇯🇵' },
  { code: 'ca', name: 'Canada', flag: '🇨🇦' },
  { code: 'au', name: 'Australia', flag: '🇦🇺' },
] as const;

type ChartStorefront = string;

type ChartCacheEntry = {
  tracks: SearchResult[];
  fetchedAt: number;
};

function chartPath(storefront: ChartStorefront) {
  return `/api/v2/${storefront}/music/most-played/20/songs.json`;
}

function resolveChartUrl(storefront: ChartStorefront): string {
  const path = chartPath(storefront);
  if (import.meta.env.DEV) {
    return `/api-apple${path}`;
  }
  return `${APPLE_CHART_BASE}${path}`;
}

function getCacheKey(storefront: string): string {
  return `elva_apple_chart_${storefront}_v2`;
}

function readChartCache(storefront: ChartStorefront, allowStale = false): SearchResult[] | null {
  try {
    const raw = localStorage.getItem(getCacheKey(storefront));
    if (!raw) return null;
    const entry: ChartCacheEntry = JSON.parse(raw);
    if (!entry?.tracks?.length) return null;
    if (!allowStale && Date.now() - entry.fetchedAt > CHART_CACHE_TTL_MS) {
      return null;
    }
    return entry.tracks;
  } catch {
    return null;
  }
}

/** Sync peek — used by cold start to paint suggestions without waiting on network. */
export function getCachedChartTracks(storefront: ChartStorefront): SearchResult[] {
  return readChartCache(storefront, true) ?? [];
}

function writeChartCache(storefront: ChartStorefront, tracks: SearchResult[]) {
  try {
    const entry: ChartCacheEntry = { tracks, fetchedAt: Date.now() };
    localStorage.setItem(getCacheKey(storefront), JSON.stringify(entry));
  } catch (e) {
    console.warn('Chart cache write failed:', e);
  }
}

function mapAppleFeedToTracks(data: unknown, idPrefix: string): SearchResult[] {
  const results = (data as { feed?: { results?: unknown[] } })?.feed?.results;
  if (!Array.isArray(results) || results.length === 0) return [];

  return results
    .map((entry: any) => {
      const id = entry?.id;
      const title = String(entry?.name || '').trim();
      const artist = String(entry?.artistName || '').trim();
      const artworkUrl = String(entry?.artworkUrl100 || '');
      if (!id || !title || !artist) return null;

      const thumbnail = artworkUrl
        ? artworkUrl.replace('100x100bb', '600x600bb')
        : '';

      return {
        id: `${idPrefix}_${id}`,
        title,
        artist,
        thumbnail,
        videoId: '',
      };
    })
    .filter((t): t is SearchResult => t !== null);
}

/**
 * Loads Apple Music most-played chart.
 * Dev: Vite proxy. Production: direct Apple URL via CORS-safe fetch.
 * Caches successful responses in localStorage; may return stale cache offline.
 * Network is hard-capped so cold start never waits minutes on a hung proxy.
 */
export async function fetchAppleMusicChart(
  storefront: ChartStorefront,
  opts?: { timeoutMs?: number }
): Promise<{ tracks: SearchResult[]; fromCache: boolean; error?: string }> {
  const idPrefix = `apple_${storefront}`;
  const timeoutMs = opts?.timeoutMs ?? 8000;

  // Fresh cache wins immediately.
  const cached = readChartCache(storefront, false);
  if (cached?.length) {
    return { tracks: cached, fromCache: true };
  }

  // Stale cache paints now; still try a live refresh below when possible.
  const stale = readChartCache(storefront, true);

  const fetchOnce = async (): Promise<SearchResult[]> => {
    const url = resolveChartUrl(storefront);
    const controller = new AbortController();
    const timer = window.setTimeout(() => controller.abort(), timeoutMs);
    try {
      const response = import.meta.env.DEV
        ? await fetch(url, { signal: controller.signal })
        : await robustFetch(url, controller.signal, false);

      if (!response.ok) {
        throw new Error(`Chart feed HTTP ${response.status}`);
      }

      const data = await response.json();
      const tracks = mapAppleFeedToTracks(data, idPrefix);
      if (tracks.length === 0) {
        throw new Error('Chart feed returned no tracks');
      }
      return tracks;
    } finally {
      window.clearTimeout(timer);
    }
  };

  try {
    const tracks = await fetchOnce();
    writeChartCache(storefront, tracks);
    return { tracks, fromCache: false };
  } catch (err) {
    console.warn(`Apple chart (${storefront}) fetch failed:`, err);

    if (stale?.length) {
      return { tracks: stale, fromCache: true, error: 'Showing cached chart — live feed unavailable' };
    }

    return {
      tracks: [],
      fromCache: false,
      error: `Could not load Top Hits ${storefront.toUpperCase()} from Apple Music.`,
    };
  }
}

export function prefetchAppleCharts() {
  const savedCountry = localStorage.getItem('elva_profile_country') || 'dk';
  void fetchAppleMusicChart(savedCountry);
  void fetchAppleMusicChart('us');
}
