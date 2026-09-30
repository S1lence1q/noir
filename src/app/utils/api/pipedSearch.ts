import { SearchResult } from '../../types';
import { fetchFromFirstSuccessfulInstance, robustFetch } from './httpClient';
import {
  isLikelyNonMusicStream,
  positiveSeconds,
  isOfficialMusicTrack,
  mapPipedSearchItems,
} from './musicStreamFilters';
import { INVIDIOUS_INSTANCES, PIPED_INSTANCES, PIPED_SEARCH_FILTERS } from './pipedInstances';
import { rankAndSortSearchResults } from './searchRanking';
import { decodeHTMLEntities } from './textHelpers';

const fetchPipedSearchOnInstance = async (
  instance: string,
  query: string,
  signal: AbortSignal
): Promise<SearchResult[]> => {
  for (const filter of PIPED_SEARCH_FILTERS) {
    const targetUrl = `${instance}/search?q=${encodeURIComponent(query)}&filter=${filter}`;
    const response = await robustFetch(targetUrl, signal, false);
    if (!response.ok) continue;
    const data = await response.json();
    const items = data?.items && Array.isArray(data.items) ? data.items : [];
    const strictMusicFilter = filter !== 'music_songs';
    const mapped = mapPipedSearchItems(items, query, strictMusicFilter);
    if (mapped.length > 0) return mapped;
  }
  throw new Error('Empty search items');
};

/** Paginated Piped video search — used for artist discography. */
export const fetchPaginatedPipedSearch = async (
  query: string,
  artistName: string,
  maxTracks: number,
  maxPages: number = 5
): Promise<SearchResult[]> => {
  let instance = PIPED_INSTANCES[0];
  try {
    instance = await fetchFromFirstSuccessfulInstance(
      PIPED_INSTANCES,
      async (inst, signal) => {
        const url = `${inst}/search?q=${encodeURIComponent(query)}&filter=videos`;
        const res = await robustFetch(url, signal, false);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return inst;
      },
      3500
    );
  } catch {
    // use default instance
  }

  const collected: SearchResult[] = [];
  let nextpage: string | null = null;
  let isFirstPage = true;

  for (let page = 0; page < maxPages && collected.length < maxTracks; page++) {
    try {
      const url = isFirstPage
        ? `${instance}/search?q=${encodeURIComponent(query)}&filter=videos`
        : nextpage
          ? `${instance}/nextpage/search?nextpage=${encodeURIComponent(nextpage)}`
          : null;

      if (!url) break;

      const response = await robustFetch(url, undefined, false);
      if (!response.ok) break;

      let data: { items?: unknown[]; nextpage?: string | null };
      try {
        data = await response.json();
      } catch {
        break;
      }

      const items = data?.items && Array.isArray(data.items) ? data.items : [];
      const mapped = mapPipedSearchItems(items, query, true).filter((t) =>
        isOfficialMusicTrack(t, artistName)
      );
      collected.push(...mapped);
      nextpage = data.nextpage || null;
      isFirstPage = false;
    } catch (pageErr) {
      console.warn(`Piped search page ${page + 1} failed for "${query}":`, pageErr);
      break;
    }
  }

  return collected;
};

const executeRawSearchAPI = async (query: string, limit: number = 8): Promise<SearchResult[]> => {
  if (!query.trim()) return [];

  try {
    const results = await fetchFromFirstSuccessfulInstance(
      PIPED_INSTANCES,
      (instance, signal) => fetchPipedSearchOnInstance(instance, query, signal),
      4000
    );
    return results.slice(0, limit);
  } catch (pipedErr) {
    console.warn('All Piped instances failed search, trying Invidious:', pipedErr);
  }

  try {
    const results = await fetchFromFirstSuccessfulInstance(
      INVIDIOUS_INSTANCES,
      async (instance, signal) => {
        for (const searchType of ['music', 'video'] as const) {
          const targetUrl = `${instance}/api/v1/search?q=${encodeURIComponent(query)}&type=${searchType}`;
          const response = await robustFetch(targetUrl, signal, false);
          if (!response.ok) continue;
          const data = await response.json();
          if (!Array.isArray(data)) continue;

          const validVideos = data.filter((item: any) => {
            const videoId = item.videoId;
            const isPlayable = !item.type || item.type === 'video' || item.type === 'short';
            if (!videoId || videoId.length !== 11 || !isPlayable) return false;
            if (
              searchType === 'video' &&
              isLikelyNonMusicStream(item.title || '', item.lengthSeconds, query)
            ) {
              return false;
            }
            return true;
          });

          const mapped = validVideos.map((item: any) => ({
            id: item.videoId,
            title: decodeHTMLEntities(item.title),
            artist: decodeHTMLEntities(item.author || 'Unknown Artist'),
            thumbnail: `https://i.ytimg.com/vi/${item.videoId}/maxresdefault.jpg`,
            videoId: item.videoId,
            channelId: item.authorId,
            duration: positiveSeconds(item.lengthSeconds),
          }));

          if (mapped.length > 0) return mapped;
        }
        throw new Error('Empty search items');
      },
      4000
    );
    return results.slice(0, limit);
  } catch (invidiousErr) {
    console.warn('All Invidious instances failed search, trying single Piped fallback:', invidiousErr);
  }

  try {
    const mapped = await fetchPipedSearchOnInstance(
      PIPED_INSTANCES[0],
      query,
      new AbortController().signal
    );
    if (mapped.length > 0) return mapped.slice(0, limit);
  } catch (proxyErr) {
    console.error('All Piped/Invidious searches failed:', proxyErr);
  }

  return [];
};

export const executeSearchAPI = async (query: string, limit: number = 8): Promise<SearchResult[]> => {
  const rawResults = await executeRawSearchAPI(query, limit * 4);
  const ranked = rankAndSortSearchResults(rawResults, query);
  return ranked
    .filter((r) => !isLikelyNonMusicStream(r.title, undefined, query))
    .slice(0, limit);
};
