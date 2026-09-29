import { useState, useEffect } from 'react';
import { parseLrc, loadCustomLyrics } from '../utils/lyricsUtils';
import { cleanSongTitle } from '../utils/stringUtils';
import type { LyricLine } from '../types';
import type { PlaybackSongData } from '../types/playback';

export function useLyrics(songData: PlaybackSongData, currentTime: number) {
  const [showLyrics, setShowLyrics] = useState(false);
  const [lyrics, setLyrics] = useState<LyricLine[]>([]);
  const [isLoadingLyrics, setIsLoadingLyrics] = useState(false);
  const [currentLyricIndex, setCurrentLyricIndex] = useState(-1);
  const [isLyricsSynced, setIsLyricsSynced] = useState(false);
  const [isLyricsModalOpen, setIsLyricsModalOpen] = useState(false);
  const [lyricsVersion, setLyricsVersion] = useState(0);

  const handleLyricsReload = () => {
    setLyricsVersion((prev) => prev + 1);
  };

  useEffect(() => {
    if (lyrics.length === 0 || !isLyricsSynced) return;
    let activeIndex = -1;
    for (let i = 0; i < lyrics.length; i++) {
      if (currentTime >= lyrics[i].time - 0.5) {
        activeIndex = i;
      } else {
        break;
      }
    }
    setCurrentLyricIndex(activeIndex);
  }, [currentTime, lyrics, isLyricsSynced]);

  useEffect(() => {
    if (!songData.title) return;

    let isMounted = true;
    const fetchLyricsData = async () => {
      setIsLoadingLyrics(true);
      setLyrics([]);
      setCurrentLyricIndex(-1);
      setIsLyricsSynced(false);
      // Lyrics mode is the listener's choice and survives song changes; the column shows
      // the skeleton / empty state while the new text loads.

      const custom = loadCustomLyrics(songData.videoId, songData.title, songData.artist);
      if (custom) {
        if (isMounted) {
          setLyrics(custom.lyrics);
          setIsLyricsSynced(custom.isSynced);
          setIsLoadingLyrics(false);
        }
        return;
      }

      if (songData.audioUrl?.startsWith('blob:') || songData.artist === 'Unknown Artist') {
        if (isMounted) {
          setLyrics([]);
          setIsLyricsSynced(false);
          setIsLoadingLyrics(false);
        }
        return;
      }

      try {
        const cleanedTitle = cleanSongTitle(songData.title);
        const query = encodeURIComponent(
          `${cleanedTitle} ${songData.artist !== 'Unknown Artist' && songData.artist !== 'Web Stream' ? songData.artist : ''}`.trim()
        );
        const res = await fetch(`https://lrclib.net/api/search?q=${query}`);
        if (!res.ok) throw new Error('API Error');
        const data = await res.json();

        if (isMounted) {
          if (data && data.length > 0) {
            const track = data[0];
            if (track.syncedLyrics) {
              setLyrics(parseLrc(track.syncedLyrics));
              setIsLyricsSynced(true);
            } else if (track.plainLyrics) {
              const lines = track.plainLyrics.split('\n').filter((l: string) => l.trim().length > 0);
              setLyrics(
                lines.map((text: string) => ({
                  time: 0,
                  text: text.trim(),
                }))
              );
              setIsLyricsSynced(false);
            } else {
              setLyrics([]);
              setIsLyricsSynced(false);
            }
          } else {
            setLyrics([]);
            setIsLyricsSynced(false);
          }
        }
      } catch (err) {
        console.error('Lyrics fetch error:', err);
        if (isMounted) {
          setLyrics([]);
          setIsLyricsSynced(false);
        }
      } finally {
        if (isMounted) setIsLoadingLyrics(false);
      }
    };

    fetchLyricsData();
    return () => {
      isMounted = false;
    };
  }, [songData.title, songData.artist, songData.videoId, lyricsVersion]);

  return {
    showLyrics,
    setShowLyrics,
    lyrics,
    isLoadingLyrics,
    currentLyricIndex,
    isLyricsSynced,
    isLyricsModalOpen,
    setIsLyricsModalOpen,
    handleLyricsReload,
  };
}
