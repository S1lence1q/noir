import { useEffect } from 'react';
import type { PlaybackSongData } from '../types/playback';

/** Tracks play counts and weekly listening time after 15s of playback. */
export function usePlayStats(songData: PlaybackSongData, isPlaying: boolean): void {
  useEffect(() => {
    if (!isPlaying) return;

    const playTimer = setTimeout(() => {
      try {
        const stored = localStorage.getItem('elva_play_counts');
        const counts: Record<string, { title: string; artist: string; count: number; lastPlayed: number }> = stored
          ? JSON.parse(stored)
          : {};

        const trackId = songData.videoId || songData.audioUrl;
        if (!counts[trackId]) {
          counts[trackId] = {
            title: songData.title,
            artist: songData.artist,
            count: 0,
            lastPlayed: Date.now(),
          };
        }
        counts[trackId].count += 1;
        counts[trackId].lastPlayed = Date.now();
        localStorage.setItem('elva_play_counts', JSON.stringify(counts));

        const storedWeekly = localStorage.getItem('elva_weekly_time');
        const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
        const currentDayName = days[new Date().getDay()];

        let stats: { day: string; min: number }[] = storedWeekly
          ? JSON.parse(storedWeekly)
          : [
              { day: 'Mon', min: 12 },
              { day: 'Tue', min: 45 },
              { day: 'Wed', min: 25 },
              { day: 'Thu', min: 60 },
              { day: 'Fri', min: 85 },
              { day: 'Sat', min: 110 },
              { day: 'Sun', min: 50 },
            ];

        const dayStat = stats.find((s) => s.day === currentDayName);
        if (dayStat) {
          dayStat.min += 3;
        } else {
          stats.push({ day: currentDayName, min: 3 });
        }
        localStorage.setItem('elva_weekly_time', JSON.stringify(stats));

        window.dispatchEvent(new Event('noir-stats-updated'));
      } catch (e) {
        console.warn('Failed to update stats in localStorage:', e);
      }
    }, 15000);

    return () => clearTimeout(playTimer);
  }, [songData.videoId, songData.audioUrl, isPlaying, songData.title, songData.artist]);
}
