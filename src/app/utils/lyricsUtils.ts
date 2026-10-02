import { LyricLine } from '../types';

export function parseLrc(lrcText: string): LyricLine[] {
  const lines = lrcText.split('\n');
  const result: LyricLine[] = [];
  const timeRegExp = /\[(\d{2}):(\d{2})(?:\.(\d{2,3}))?\]/;
  
  for (const line of lines) {
    const match = timeRegExp.exec(line);
    if (match) {
      const minutes = parseInt(match[1], 10);
      const seconds = parseInt(match[2], 10);
      const milliseconds = match[3] ? parseInt(match[3], 10) * (match[3].length === 2 ? 10 : 1) : 0;
      const timeInSeconds = minutes * 60 + seconds + milliseconds / 1000;
      const text = line.replace(timeRegExp, '').trim();
      
      if (text || line.includes('♪')) {
        result.push({ time: timeInSeconds, text: text || '♪' });
      }
    }
  }
  return result.sort((a, b) => a.time - b.time);
}

function getCustomLyricsKey(videoId: string | undefined, title: string, artist: string): string {
  if (videoId && videoId.trim() !== '') {
    return `noir_custom_lyrics_${videoId.trim()}`;
  }
  const slug = `${title}_${artist}`.toLowerCase().replace(/[^a-z0-9]/g, '_');
  return `noir_custom_lyrics_${slug}`;
}

export interface CustomLyricsData {
  lyrics: LyricLine[];
  isSynced: boolean;
  rawText: string;
}

export function loadCustomLyrics(videoId: string | undefined, title: string, artist: string): CustomLyricsData | null {
  try {
    const key = getCustomLyricsKey(videoId, title, artist);
    const dataStr = localStorage.getItem(key);
    if (!dataStr) return null;
    return JSON.parse(dataStr);
  } catch (e) {
    console.warn('Failed to load custom lyrics:', e);
    return null;
  }
}

