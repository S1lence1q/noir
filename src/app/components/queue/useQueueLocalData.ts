import { useState, useEffect, useMemo } from 'react';
import { NOIR_STORAGE_KEYS, readJsonStorage } from '../../utils/noirStorage';
import { getPrimaryArtist } from '../../utils/stringUtils';
import type { Playlist, SearchResult } from './types';

export function useQueueLocalData(searchQuery: string, viewMode: 'session' | 'library') {
  const [localFavorites, setLocalFavorites] = useState<SearchResult[]>([]);
  const [localPlaylists, setLocalPlaylists] = useState<Playlist[]>([]);
  const [localHistory, setLocalHistory] = useState<SearchResult[]>([]);

  const loadLocalStorageItems = () => {
    setLocalFavorites(readJsonStorage<SearchResult[]>(NOIR_STORAGE_KEYS.favorites, []));
    setLocalPlaylists(readJsonStorage<Playlist[]>(NOIR_STORAGE_KEYS.playlists, []));
    setLocalHistory(readJsonStorage<SearchResult[]>(NOIR_STORAGE_KEYS.recentlyPlayed, []));
  };

  useEffect(() => {
    loadLocalStorageItems();
  }, [searchQuery, viewMode]);

  useEffect(() => {
    loadLocalStorageItems();
  }, []);

  useEffect(() => {
    const handlePlaylistsUpdated = () => loadLocalStorageItems();
    window.addEventListener('elva-playlists-updated', handlePlaylistsUpdated);
    window.addEventListener('storage', handlePlaylistsUpdated);
    return () => {
      window.removeEventListener('elva-playlists-updated', handlePlaylistsUpdated);
      window.removeEventListener('storage', handlePlaylistsUpdated);
    };
  }, []);

  const artistBubbles = useMemo(() => {
    if (localHistory.length === 0) return [];
    const seen = new Set<string>();
    const bubbles: { name: string; channelId?: string; thumbnail: string }[] = [];

    localHistory.forEach((song) => {
      const artistName = getPrimaryArtist(song.artist).trim();
      if (!artistName) return;
      const key = artistName.toLowerCase();
      if (!seen.has(key)) {
        seen.add(key);
        bubbles.push({
          name: artistName,
          channelId: song.channelId,
          thumbnail: song.thumbnail,
        });
      }
    });
    return bubbles.slice(0, 8);
  }, [localHistory]);

  return {
    localFavorites,
    localPlaylists,
    localHistory,
    artistBubbles,
    loadLocalStorageItems,
  };
}
