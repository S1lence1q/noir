import { SearchResult } from '../../types';
import { fetchFromFirstSuccessfulInstance, robustFetch } from './httpClient';
import {
  cleanArtistName,
  cleanTrackTitle,
  dedupeSearchResults,
  isLikelyNonMusicStream,
} from './musicStreamFilters';
import { fetchPaginatedPipedSearch } from './pipedSearch';
import { INVIDIOUS_INSTANCES, PIPED_INSTANCES, TOPIC_INVIDIOUS_INSTANCES } from './pipedInstances';
import { decodeHTMLEntities } from './textHelpers';

export const executeChannelUploadsAPI = async (
  channelId: string,
  limit: number = 50
): Promise<SearchResult[]> => {
  if (!channelId) return [];

  try {
    const results = await fetchFromFirstSuccessfulInstance(
      PIPED_INSTANCES,
      async (instance, signal) => {
        const targetUrl = `${instance}/channel/${channelId}`;
        const response = await robustFetch(targetUrl, signal, false);
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const data = await response.json();
        if (data && data.relatedStreams && Array.isArray(data.relatedStreams)) {
          const mapped = data.relatedStreams
            .map((item: any) => {
              const ytMatch = item.url.match(/(?:v=|\/watch\?v=)([^"&?\/\s]{11})/i);
              const videoId = ytMatch ? ytMatch[1] : '';
              return {
                id: videoId,
                title: decodeHTMLEntities(item.title),
                artist: decodeHTMLEntities(item.uploaderName || 'Unknown Artist'),
                thumbnail: `https://i.ytimg.com/vi/${videoId}/maxresdefault.jpg`,
                videoId,
                channelId,
              };
            })
            .filter((item: any) => item.id.length === 11);

          if (mapped.length > 0) return mapped;
        }
        throw new Error('Empty relatedStreams');
      },
      1800
    );
    return results.slice(0, limit);
  } catch (pipedErr) {
    console.warn('All Piped instances failed direct channel uploads, trying Invidious directly:', pipedErr);
  }

  try {
    const results = await fetchFromFirstSuccessfulInstance(
      INVIDIOUS_INSTANCES,
      async (instance, signal) => {
        const targetUrl = `${instance}/api/v1/channels/${channelId}`;
        const response = await robustFetch(targetUrl, signal, false);
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const data = await response.json();
        const videos = Array.isArray(data) ? data : data.videos || data.relatedStreams || [];

        const mapped = videos
          .map((item: any) => {
            const videoId = item.videoId;
            return {
              id: videoId,
              title: decodeHTMLEntities(item.title),
              artist: decodeHTMLEntities(item.author || 'Unknown Artist'),
              thumbnail: `https://i.ytimg.com/vi/${videoId}/maxresdefault.jpg`,
              videoId,
              channelId,
            };
          })
          .filter((item: any) => item.id && item.id.length === 11);

        if (mapped.length > 0) return mapped;
        throw new Error('Empty videos');
      },
      1800
    );
    return results.slice(0, limit);
  } catch (invidiousErr) {
    console.warn('All Invidious instances failed direct channel uploads, trying single proxy fallback:', invidiousErr);
  }

  try {
    const targetUrl = `${PIPED_INSTANCES[0]}/channel/${channelId}`;
    const response = await robustFetch(targetUrl, undefined, false);
    if (response.ok) {
      const data = await response.json();
      if (data && data.relatedStreams && Array.isArray(data.relatedStreams)) {
        const mapped = data.relatedStreams
          .map((item: any) => {
            const ytMatch = item.url.match(/(?:v=|\/watch\?v=)([^"&?\/\s]{11})/i);
            const videoId = ytMatch ? ytMatch[1] : '';
            return {
              id: videoId,
              title: decodeHTMLEntities(item.title),
              artist: decodeHTMLEntities(item.uploaderName || 'Unknown Artist'),
              thumbnail: `https://i.ytimg.com/vi/${videoId}/maxresdefault.jpg`,
              videoId,
              channelId,
            };
          })
          .filter((item: any) => item.id.length === 11);
        if (mapped.length > 0) return mapped.slice(0, limit);
      }
    }
  } catch (proxyErr) {
    console.error('All direct and proxy channel fetches failed:', proxyErr);
  }

  return [];
};

const searchForChannels = async (query: string): Promise<Array<{ id: string; name: string }>> => {
  try {
    return await fetchFromFirstSuccessfulInstance(
      PIPED_INSTANCES,
      async (instance, signal) => {
        const url = `${instance}/search?q=${encodeURIComponent(query)}&filter=channels`;
        const res = await robustFetch(url, signal, false);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        const channels = (data?.items || [])
          .filter((item: any) => item.url && item.name)
          .map((item: any) => {
            const match = (item.url as string).match(/\/channel\/([^\/\?]+)/i);
            return match ? { id: match[1], name: decodeHTMLEntities(item.name) } : null;
          })
          .filter(Boolean) as Array<{ id: string; name: string }>;
        if (channels.length === 0) throw new Error('No channels');
        return channels;
      },
      3000
    );
  } catch {
    // Invidious fallback
  }

  for (const instance of TOPIC_INVIDIOUS_INSTANCES) {
    try {
      const url = `${instance}/api/v1/search?q=${encodeURIComponent(query)}&type=channel`;
      const res = await robustFetch(url, undefined, false);
      if (!res.ok) continue;
      const data = await res.json();
      const items: any[] = Array.isArray(data) ? data : [];
      const channels = items
        .filter((item: any) => item.authorId && item.author)
        .map((item: any) => ({ id: item.authorId, name: decodeHTMLEntities(item.author) }));
      if (channels.length > 0) return channels;
    } catch {
      // try next
    }
  }

  return [];
};

export const resolveTopicChannelId = async (
  artistName: string
): Promise<{ channelId: string; type: 'topic' | 'vevo' | 'official' } | null> => {
  const nameLower = artistName.trim().toLowerCase();

  const [generalResults, topicResults] = await Promise.allSettled([
    searchForChannels(artistName.trim()),
    searchForChannels(`${artistName.trim()} topic`),
  ]);

  const general = generalResults.status === 'fulfilled' ? generalResults.value : [];
  const topicSearch = topicResults.status === 'fulfilled' ? topicResults.value : [];
  const all = [...general, ...topicSearch];

  const seen = new Set<string>();
  const channels = all.filter((c) => {
    if (seen.has(c.id)) return false;
    seen.add(c.id);
    return true;
  });

  for (const ch of channels) {
    if (ch.name.toLowerCase() === `${nameLower} - topic`) {
      return { channelId: ch.id, type: 'topic' };
    }
  }

  for (const ch of channels) {
    if (ch.name.toLowerCase() === `${nameLower}vevo`) {
      return { channelId: ch.id, type: 'vevo' };
    }
  }

  for (const ch of channels) {
    if (ch.name.toLowerCase() === nameLower) {
      return { channelId: ch.id, type: 'official' };
    }
  }

  return null;
};

export const fetchAllChannelUploads = async (
  channelId: string,
  limit: number = 150,
  options?: {
    channelType?: 'topic' | 'vevo' | 'official';
    maxPages?: number;
    timeBudgetMs?: number;
  }
): Promise<SearchResult[]> => {
  if (!channelId) return [];

  const maxPages = options?.maxPages ?? 12;
  const timeBudgetMs = options?.timeBudgetMs ?? 20000;
  const skipVlogFilter = options?.channelType === 'topic' || options?.channelType === 'vevo';
  const startedAt = Date.now();

  const mapPipedItem = (item: any): SearchResult | null => {
    const ytMatch = (item.url || '').match(/(?:v=|\/watch\?v=)([^"&?\/\s]{11})/i);
    const videoId = ytMatch ? ytMatch[1] : item.videoId || '';
    if (!videoId || videoId.length !== 11) return null;
    const title = item.title || '';
    if (!skipVlogFilter && isLikelyNonMusicStream(title, item.duration, '')) return null;
    let cId = item.uploaderId;
    if (!cId && item.uploaderUrl) {
      const m = item.uploaderUrl.match(/\/channel\/([^\/]+)/i);
      if (m) cId = m[1];
    }
    return {
      id: videoId,
      title: cleanTrackTitle(decodeHTMLEntities(item.title || '')),
      artist: cleanArtistName(decodeHTMLEntities(item.uploaderName || '')),
      thumbnail: `https://i.ytimg.com/vi/${videoId}/maxresdefault.jpg`,
      videoId,
      channelId: cId || channelId,
    };
  };

  try {
    const allItems: SearchResult[] = [];
    let nextpage: string | null = null;
    let firstPage = true;
    let pagesFetched = 0;
    const instance = PIPED_INSTANCES[0];

    do {
      if (pagesFetched >= maxPages || Date.now() - startedAt > timeBudgetMs) break;

      const url = firstPage
        ? `${instance}/channel/${channelId}`
        : `${instance}/nextpage/channel/${channelId}?nextpage=${encodeURIComponent(nextpage!)}`;

      const response = await robustFetch(url, undefined, false);
      if (!response.ok) break;
      const data = await response.json();

      for (const item of data.relatedStreams || []) {
        const mapped = mapPipedItem(item);
        if (mapped) allItems.push(mapped);
      }

      nextpage = data.nextpage || null;
      firstPage = false;
      pagesFetched++;
    } while (nextpage && allItems.length < limit);

    if (allItems.length > 0) return allItems.slice(0, limit);
  } catch {
    // fall through to Invidious
  }

  for (const instance of TOPIC_INVIDIOUS_INSTANCES) {
    try {
      const response = await robustFetch(
        `${instance}/api/v1/channels/${channelId}/videos?sort_by=newest`,
        undefined,
        false
      );
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const data = await response.json();
      const videos: any[] = Array.isArray(data) ? data : data.videos || [];
      const mapped = videos
        .filter((v: any) => v.videoId?.length === 11)
        .map((v: any) => ({
          id: v.videoId,
          title: cleanTrackTitle(decodeHTMLEntities(v.title || '')),
          artist: cleanArtistName(decodeHTMLEntities(v.author || '')),
          thumbnail: `https://i.ytimg.com/vi/${v.videoId}/maxresdefault.jpg`,
          videoId: v.videoId,
          channelId,
        }));
      if (mapped.length > 0) return mapped.slice(0, limit);
    } catch {
      // try next instance
    }
  }

  return [];
};

export const fetchArtistDiscography = async (
  artistName: string,
  limit: number = 120,
  options?: {
    channelId?: string;
    channelType?: 'topic' | 'vevo' | 'official' | 'provided';
  }
): Promise<{
  tracks: SearchResult[];
  topicResult: { channelId: string; type: 'topic' | 'vevo' | 'official' | 'provided' } | null;
}> => {
  const name = artistName.trim();
  if (!name) return { tracks: [], topicResult: null };

  const hintChannelId = options?.channelId?.trim();
  const hintType = options?.channelType;

  // Fast path: known channel — skip Topic resolve + parallel name searches when possible
  if (hintChannelId) {
    const channelType: 'topic' | 'vevo' | 'official' | 'provided' =
      hintType === 'topic' || hintType === 'vevo' || hintType === 'official' || hintType === 'provided'
        ? hintType
        : 'provided';
    let channelTracks: SearchResult[] = [];
    try {
      channelTracks = await Promise.race([
        fetchAllChannelUploads(hintChannelId, limit, {
          channelType:
            channelType === 'topic' || channelType === 'vevo' || channelType === 'official'
              ? channelType
              : undefined,
          maxPages: 3,
          timeBudgetMs: 3500,
        }),
        new Promise<SearchResult[]>((resolve) => setTimeout(() => resolve([]), 3600)),
      ]);
    } catch {
      channelTracks = [];
    }

    if (channelTracks.length >= Math.min(12, limit)) {
      return {
        tracks: dedupeSearchResults(channelTracks).slice(0, limit),
        topicResult: { channelId: hintChannelId, type: channelType },
      };
    }

    // Thin channel list — supplement with a single name search
    const nameSearchTracks = await fetchPaginatedPipedSearch(name, name, Math.ceil(limit / 2), 3).catch(
      () => [] as SearchResult[]
    );
    return {
      tracks: dedupeSearchResults([...channelTracks, ...nameSearchTracks]).slice(0, limit),
      topicResult: { channelId: hintChannelId, type: channelType },
    };
  }

  const perQueryLimit = Math.ceil(limit / 2);

  const [topicSettled, topicSearchSettled, nameSearchSettled] = await Promise.allSettled([
    resolveTopicChannelId(name),
    fetchPaginatedPipedSearch(`${name} - Topic`, name, perQueryLimit, 4),
    fetchPaginatedPipedSearch(name, name, perQueryLimit, 3),
  ]);

  const topicResult = topicSettled.status === 'fulfilled' ? topicSettled.value : null;
  const topicSearchTracks =
    topicSearchSettled.status === 'fulfilled' ? topicSearchSettled.value : [];
  const nameSearchTracks = nameSearchSettled.status === 'fulfilled' ? nameSearchSettled.value : [];

  if (topicSettled.status === 'rejected') {
    console.warn('Topic channel resolve failed:', topicSettled.reason);
  }
  if (topicSearchSettled.status === 'rejected') {
    console.warn('Topic search failed:', topicSearchSettled.reason);
  }
  if (nameSearchSettled.status === 'rejected') {
    console.warn('Name search failed:', nameSearchSettled.reason);
  }

  let channelTracks: SearchResult[] = [];
  if (topicResult?.channelId && topicResult.type === 'topic') {
    try {
      channelTracks = await Promise.race([
        fetchAllChannelUploads(topicResult.channelId, limit, {
          channelType: 'topic',
          maxPages: 3,
          timeBudgetMs: 3500,
        }),
        new Promise<SearchResult[]>((resolve) => setTimeout(() => resolve([]), 3600)),
      ]);
    } catch {
      channelTracks = [];
    }
  }

  const tracks = dedupeSearchResults([...topicSearchTracks, ...nameSearchTracks, ...channelTracks]).slice(
    0,
    limit
  );
  return { tracks, topicResult };
};
