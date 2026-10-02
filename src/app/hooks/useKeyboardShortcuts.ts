import { useEffect } from 'react';
import { shouldShowArtistCard } from '../utils/apiUtils';

interface KeyboardShortcutsParams {
  appState: 'landing' | 'processing' | 'ready';
  nowPlayingOpen?: boolean;
  setNowPlayingOpen?: (open: boolean) => void;
  hasActiveSong?: boolean;
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
  onOpenSearchPalette?: () => void;
  onNewPlaylist?: () => void;
  onToggleLyrics?: () => void;
  onToggleQueue?: () => void;
}

export function useKeyboardShortcuts({
  appState,
  nowPlayingOpen = false,
  setNowPlayingOpen,
  hasActiveSong = false,
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
  onOpenSearchPalette,
  onNewPlaylist,
  onToggleLyrics,
  onToggleQueue,
}: KeyboardShortcutsParams) {
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (nowPlayingOpen && e.key === 'Escape') {
        const target = e.target as HTMLElement;
        if (
          target &&
          (target.tagName === 'INPUT' ||
            target.tagName === 'TEXTAREA' ||
            target.isContentEditable)
        ) {
          return;
        }
        e.preventDefault();
        setNowPlayingOpen?.(false);
        return;
      }

      if (
        (e.key === 'l' || e.key === 'L') &&
        !e.metaKey &&
        !e.ctrlKey &&
        !e.altKey &&
        hasActiveSong &&
        onToggleLyrics
      ) {
        const target = e.target as HTMLElement;
        if (
          target &&
          (target.tagName === 'INPUT' ||
            target.tagName === 'TEXTAREA' ||
            target.isContentEditable)
        ) {
          return;
        }
        e.preventDefault();
        onToggleLyrics();
        return;
      }

      const hasSearchResults =
        !nowPlayingOpen &&
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
          return;
        }
        if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
          e.preventDefault();
          onOpenSearchPalette?.();
        }
        return;
      }

      if (e.key === '?') {
        e.preventDefault();
        setShowShortcutMap((prev) => !prev);
      } else if (e.key.toLowerCase() === 'n' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        onNewPlaylist?.();
      } else if (e.key === 'Escape' && showShortcutMap) {
        e.preventDefault();
        setShowShortcutMap(false);
      } else if (e.code === 'Space' && hasActiveSong) {
        e.preventDefault();
        window.dispatchEvent(new Event('noir-toggle-play'));
      } else if (
        hasActiveSong &&
        (e.key === 'ArrowLeft' || e.key === 'ArrowRight') &&
        !e.altKey &&
        !e.shiftKey &&
        target.getAttribute('role') !== 'slider'
      ) {
        // ⌘/Ctrl + ←/→ changes track; plain ←/→ seeks 5 s.
        e.preventDefault();
        const forward = e.key === 'ArrowRight';
        if (e.metaKey || e.ctrlKey) {
          window.dispatchEvent(new Event(forward ? 'noir-play-next' : 'noir-play-prev'));
        } else {
          window.dispatchEvent(new CustomEvent('noir-seek-by', { detail: { delta: forward ? 5 : -5 } }));
        }
      } else if (
        hasActiveSong &&
        (e.key === 'ArrowUp' || e.key === 'ArrowDown') &&
        (e.metaKey || e.ctrlKey) &&
        target.getAttribute('role') !== 'slider'
      ) {
        // Plain ↑/↓ stay page scrolling; with ⌘/Ctrl they set volume.
        e.preventDefault();
        window.dispatchEvent(
          new CustomEvent('noir-volume-by', { detail: { delta: e.key === 'ArrowUp' ? 5 : -5 } })
        );
      } else if ((e.key === 'm' || e.key === 'M') && !e.metaKey && !e.ctrlKey && !e.altKey && hasActiveSong) {
        e.preventDefault();
        window.dispatchEvent(new Event('noir-toggle-mute'));
      } else if ((e.key === 'q' || e.key === 'Q') && !e.metaKey && !e.ctrlKey && !e.altKey && hasActiveSong) {
        e.preventDefault();
        onToggleQueue?.();
      } else if (e.key === ',' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setActiveTab(activeTab === 'settings' ? 'search' : 'settings');
      } else if (
        (e.key === 'k' && (e.metaKey || e.ctrlKey)) ||
        (e.key === '/' && !e.metaKey && !e.ctrlKey && !e.altKey)
      ) {
        e.preventDefault();
        onOpenSearchPalette?.();
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
    nowPlayingOpen,
    setNowPlayingOpen,
    hasActiveSong,
    selectedPlaylist,
    setSelectedPlaylist,
    onOpenSearchPalette,
    onNewPlaylist,
    onToggleLyrics,
    onToggleQueue,
  ]);
}
