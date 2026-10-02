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

export function getCustomLyricsKey(videoId: string | undefined, title: string, artist: string): string {
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

export function saveCustomLyrics(
  videoId: string | undefined,
  title: string,
  artist: string,
  rawText: string,
  isSynced: boolean,
  lyrics: LyricLine[]
): void {
  try {
    const key = getCustomLyricsKey(videoId, title, artist);
    const data: CustomLyricsData = { lyrics, isSynced, rawText };
    localStorage.setItem(key, JSON.stringify(data));
  } catch (e) {
    console.error('Failed to save custom lyrics:', e);
  }
}

export function deleteCustomLyrics(videoId: string | undefined, title: string, artist: string): void {
  try {
    const key = getCustomLyricsKey(videoId, title, artist);
    localStorage.removeItem(key);
  } catch (e) {
    console.error('Failed to delete custom lyrics:', e);
  }
}

export function parsePlainLyrics(text: string, duration: number, autoSync: boolean): { lyrics: LyricLine[]; isSynced: boolean } {
  const lines = text.split('\n')
    .map(line => line.trim())
    .filter(line => line !== '');
  
  if (lines.length === 0) {
    return { lyrics: [], isSynced: false };
  }

  if (!autoSync) {
    // Unsynced static lyrics (all times set to 0)
    return {
      lyrics: lines.map(line => ({ time: 0, text: line })),
      isSynced: false
    };
  }

  // Auto-synced lyrics: distribute lines evenly throughout duration
  const totalDuration = duration > 0 ? duration : 180;
  const interval = totalDuration / (lines.length + 1);
  const lyrics = lines.map((line, i) => ({
    time: Math.round((i * interval + interval) * 10) / 10,
    text: line
  }));

  return { lyrics, isSynced: true };
}

export function generateFallbackLyrics(title: string, duration: number): LyricLine[] {
  const totalDuration = duration > 0 ? duration : 240;
  const lines = [
    "♪ (Instrumental Intro) ♪",
    `We begin in the quiet echoes of ${title}...`,
    "Dancing through the shadows...",
    "Sensing every beat, every word you said...",
    "A lingering feeling in the crisp night air...",
    "Now we rise, matching the rhythm of our hearts...",
    "♪ (Ambient Break) ♪",
    "And as the melody guides us home...",
    "We remember the moments we shared...",
    "Fading slowly into the twilight glow...",
    "♪ (Instrumental Outro) ♪"
  ];

  const result: LyricLine[] = [];
  const interval = totalDuration / (lines.length + 1);
  
  for (let i = 0; i < lines.length; i++) {
    result.push({
      time: Math.round((i * interval + interval * 0.5) * 10) / 10,
      text: lines[i]
    });
  }
  return result;
}
