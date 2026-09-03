import { useEffect } from 'react';
import { shouldShowArtistCard } from '../utils/apiUtils';

interface KeyboardShortcutsParams {
  appState: 'landing' | 'processing' | 'ready';
  searchQuery: string;
  lastSearchedQuery: string;
  isSearching: boolean;
  searchResults: any[];
  selectedArtist: any;
  artistTracks: any[];
  verifiedArtist: any;
  loadingSongId: string | null;
  focusedResultIndex: number;
  setFocusedResultIndex: React.Dispatch<React.SetStateAction<number>>;
  setSearchQuery: (query: string) => void;
  setSelectedArtist: React.Dispatch<React.SetStateAction<any>>;
  setArtistTracks: (tracks: any[]) => void;
  handleSelectSong: (song: any) => void;
  handleViewArtistProfile: (artist: any) => void;
  showShortcutMap: boolean;
  setShowShortcutMap: React.Dispatch<React.SetStateAction<boolean>>;
  activeTab: string;
  setActiveTab: (tab: any) => void;
  selectedPlaylist: any;
  setSelectedPlaylist: React.Dispatch<React.SetStateAction<any>>;
}

export function useKeyboardShortcuts({
  appState,
  searchQuery,
  lastSearchedQuery,
  isSearching,
  searchResults,
  selectedArtist,
  artistTracks,
  verifiedArtist,
  loadingSongId,
  focusedResultIndex,
  setFocusedResultIndex,
  setSearchQuery,
  setSelectedArtist,
  setArtistTracks,
  handleSelectSong,
  handleViewArtistProfile,
  showShortcutMap,
  setShowShortcutMap,
  activeTab,
  setActiveTab,
  selectedPlaylist,
  setSelectedPlaylist,
}: KeyboardShortcutsParams) {
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      const hasSearchResults =
        appState === 'landing' &&
        !isSearching &&
        searchResults.length > 0 &&
        !!lastSearchedQuery?.trim();

      const isSearchNavActive = hasSearchResults || (appState === 'landing' && selectedArtist);

      if (
        isSearchNavActive &&
        (e.key === 'ArrowDown' ||
          e.key === 'ArrowUp' ||
          (e.key === 'Enter' && focusedResultIndex >= 0) ||
          e.key === 'Escape')
      ) {
        if (e.key === 'Escape') {
          e.preventDefault();
          if (selectedArtist) {
            setSelectedArtist(null);
            setArtistTracks([]);
            setFocusedResultIndex(-1);
            return;
          }
          if (selectedPlaylist) {
            setSelectedPlaylist(null);
            return;
          }
          if (focusedResultIndex >= 0) {
            setFocusedResultIndex(-1);
            return;
          }
          if (hasSearchResults && searchQuery.trim()) {
            setSearchQuery('');
            return;
          }
        }

        if (e.key === 'ArrowDown' || e.key === 'ArrowUp' || e.key === 'Enter') {
          e.preventDefault();

          const hasArtistCard =
            shouldShowArtistCard(lastSearchedQuery || searchQuery) &&
            verifiedArtist &&
            !selectedArtist;
          const totalItems = selectedArtist
            ? artistTracks.length
            : searchResults.length + (hasArtistCard ? 1 : 0);

          if (totalItems === 0) return;

          if (e.key === 'ArrowDown') {
            setFocusedResultIndex((prev) => (prev < totalItems - 1 ? prev + 1 : prev));
          } else if (e.key === 'ArrowUp') {
            setFocusedResultIndex((prev) => (prev > 0 ? prev - 1 : -1));
          } else if (e.key === 'Enter') {
            if (focusedResultIndex >= 0) {
              if (selectedArtist) {
                const track = artistTracks[focusedResultIndex];
                if (track && !loadingSongId) handleSelectSong(track);
              } else if (hasArtistCard && focusedResultIndex === 0) {
                handleViewArtistProfile(verifiedArtist);
              } else {
                const songIndex = hasArtistCard ? focusedResultIndex - 1 : focusedResultIndex;
                const song = searchResults[songIndex];
                if (song && !loadingSongId) handleSelectSong(song);
              }
            }
          }
          return;
        }
      }

      const target = e.target as HTMLElement;
      if (
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.isContentEditable
      ) {
        if (e.key === 'Escape') {
          e.preventDefault();
          target.blur();
          if (searchQuery.trim()) {
            setSearchQuery('');
          }
        }
        return;
      }

      if (e.key === '?') {
        e.preventDefault();
        setShowShortcutMap((prev) => !prev);
      } else if (e.key === 'Escape' && showShortcutMap) {
        e.preventDefault();
        setShowShortcutMap(false);
      } else if (e.key === ',' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        if (appState === 'landing') {
          setActiveTab(activeTab === 'settings' ? 'search' : 'settings');
        }
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [
    showShortcutMap,
    activeTab,
    appState,
    searchQuery,
    lastSearchedQuery,
    isSearching,
    searchResults,
    selectedArtist,
    artistTracks,
    verifiedArtist,
    loadingSongId,
    focusedResultIndex,
    setFocusedResultIndex,
    setSearchQuery,
    setSelectedArtist,
    setArtistTracks,
    handleSelectSong,
    handleViewArtistProfile,
    setShowShortcutMap,
    setActiveTab,
  ]);
}
