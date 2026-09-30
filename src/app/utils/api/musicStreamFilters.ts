import { SearchResult } from '../../types';
import { decodeHTMLEntities } from './textHelpers';

const NON_MUSIC_TITLE_PATTERNS: RegExp[] = [
  /\bvlog\b/i,
  /\b(routine|morning routine|evening routine|night routine)\b/i,
  /\b(cozy days?|days in my life|day in my life|72 hrs|weekend vlog)\b/i,
  /\b(haul|errands|meal plan|wfh|burnout|hot girl walks?)\b/i,
  /\b(home decor|dream apartment|bridal fitting|book shopping|home diy)\b/i,
  /\b(nervous system|red light therapy|gentle movement|analogue hobbi)\b/i,
  /\b(productive vlog|monday scaries|get ready with me|grwm)\b/i,
  /\b(recovering from|our absolute dream|beating the|first few days)\b/i,
  /\b(what i eat|room tour|apartment tour|house tour|unboxing)\b/i,
  /\b(podcast|interview|q&a|trailer|teaser|behind the scenes)\b/i,
  /\b(come with me|come shop|shop with me|pack with me)\b/i,
];

const countTitleEmojis = (title: string): number => {
  try {
    return [...title].filter((char) => /\p{Extended_Pictographic}/u.test(char)).length;
  } catch {
    return (title.match(/[\u{1F300}-\u{1FAFF}]/gu) || []).length;
  }
};

/** Whole seconds when the source gave a real length (Piped sends -1 for live streams), else undefined. */
export const positiveSeconds = (value: unknown): number | undefined =>
  typeof value === 'number' && value > 0 ? Math.round(value) : undefined;

/** Returns true when a result is almost certainly not a music track. */
export const isLikelyNonMusicStream = (
  title: string,
  durationSeconds: number | undefined,
  query: string
): boolean => {
  const titleLower = title.toLowerCase();
  const queryLower = query.trim().toLowerCase();
  const queryWords = queryLower.split(/\s+/).filter((w) => w.length > 1);
  const isArtistOnlyQuery =
    queryWords.length <= 2 &&
    !['live', 'cover', 'remix', 'lyric', 'album', 'mix', 'official', 'audio', 'song'].some((k) =>
      queryLower.includes(k)
    );

  if (NON_MUSIC_TITLE_PATTERNS.some((rx) => rx.test(title))) return true;
  if (title.split('|').length >= 3) return true;
  if (countTitleEmojis(title) >= 4) return true;

  const duration = durationSeconds ?? 0;
  const hasMusicTitleSignal =
    /\b(live|concert|performance|session|freestyle|feat\.|ft\.|official audio|music video|lyric)\b/i.test(
      titleLower
    );

  if (isArtistOnlyQuery && duration > 480 && !hasMusicTitleSignal) return true;
  if (duration > 900 && !hasMusicTitleSignal && !queryLower.includes('live')) return true;

  return false;
};

export const mapPipedSearchItems = (
  items: unknown[],
  query: string,
  strictMusicFilter: boolean
): SearchResult[] => {
  const validStreams = (items as any[]).filter((item: any) => {
    if (!item.url) return false;
    const ytMatch = item.url.match(/(?:v=|\/watch\?v=)([^"&?\/\s]{11})/i);
    const videoId = ytMatch ? ytMatch[1] : null;
    const isPlayable =
      !item.type || item.type === 'stream' || item.type === 'video' || item.type === 'music_song';
    if (!videoId || videoId.length !== 11 || !isPlayable) return false;
    if (strictMusicFilter && isLikelyNonMusicStream(item.title || '', item.duration, query)) {
      return false;
    }
    return true;
  });

  return validStreams.map((item: any) => {
    const ytMatch = item.url.match(/(?:v=|\/watch\?v=)([^"&?\/\s]{11})/i);
    const videoId = ytMatch![1];
    let channelId = item.uploaderId;
    if (!channelId && item.uploaderUrl) {
      const chMatch = item.uploaderUrl.match(/\/channel\/([^\/]+)/i);
      if (chMatch) channelId = chMatch[1];
    }
    return {
      id: videoId,
      title: decodeHTMLEntities(item.title),
      artist: decodeHTMLEntities(item.uploaderName || 'Unknown Artist'),
      thumbnail: `https://i.ytimg.com/vi/${videoId}/maxresdefault.jpg`,
      videoId,
      channelId,
      duration: positiveSeconds(item.duration),
    };
  });
};

export const isOfficialMusicUploader = (uploaderName: string, artistName: string): boolean => {
  const u = uploaderName.trim().toLowerCase();
  const n = artistName.trim().toLowerCase();
  return u === n || u === `${n} - topic` || u === `${n}vevo`;
};

/** True when the YouTube result is likely a MV/VEVO stream (intro/outro) rather than clean audio. */
export const isLikelyMusicVideoStream = (
  track: Pick<SearchResult, 'title' | 'artist'>
): boolean => {
  const titleLower = track.title.toLowerCase();
  const artistLower = track.artist.toLowerCase();

  if (titleLower.includes('official audio')) return false;
  if (artistLower.includes(' - topic') || artistLower.endsWith('topic')) return false;

  if (
    titleLower.includes('music video') ||
    titleLower.includes('lyric video') ||
    titleLower.includes('visualizer')
  ) {
    return true;
  }
  if (titleLower.includes('official video') && !titleLower.includes('audio')) return true;
  if (titleLower.includes('lyrics') || titleLower.includes('lyric ')) return true;

  if (artistLower.includes('vevo') && !titleLower.includes('audio')) return true;

  return false;
};

export const isOfficialMusicTrack = (track: SearchResult, artistName: string): boolean => {
  if (!isOfficialMusicUploader(track.artist, artistName)) return false;
  const u = track.artist.trim().toLowerCase();
  const n = artistName.trim().toLowerCase();
  if (u === `${n} - topic` || u === `${n}vevo`) return true;
  return !isLikelyNonMusicStream(track.title, undefined, artistName);
};

export const dedupeSearchResults = (tracks: SearchResult[]): SearchResult[] => {
  const seen = new Set<string>();
  return tracks.filter((t) => {
    if (!t.videoId || seen.has(t.videoId)) return false;
    seen.add(t.videoId);
    return true;
  });
};

export const cleanTrackTitle = (title: string): string =>
  title
    .replace(
      /\s*\((Official Audio|Official Music Video|Official Video|Official Lyric Video|Audio|Video|Lyrics|Lyric Video|Music Video|HD|HQ|4K|Visualizer|Animated Video|Full Video)\)\s*/gi,
      ''
    )
    .replace(
      /\s*\[(Official Audio|Official Music Video|Official Video|Official Lyric Video|Audio|Video|Lyrics|Lyric Video|Music Video|HD|HQ|4K|Visualizer|Animated Video|Full Video)\]\s*/gi,
      ''
    )
    .trim();

export const cleanArtistName = (name: string): string =>
  name
    .replace(/\s*-\s*Topic\s*$/i, '')
    .replace(/\s*VEVO\s*$/i, '')
    .replace(/\s*Official\s*$/i, '')
    .trim();
