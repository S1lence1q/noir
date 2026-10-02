import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { VerifiedArtist, SearchResult, Playlist } from '../types';
import { NoirDiscoverView } from './shell/noir/NoirDiscoverView';
import { NoirDetailOverlay } from './shell/noir/NoirDetailOverlay';
import { NoirArtistView } from './shell/noir/NoirArtistView';
import { NoirPlaylistView } from './shell/noir/NoirPlaylistView';
import { NoirHomeView } from './shell/noir/NoirHomeView';
import { NoirLibraryView } from './shell/noir/NoirLibraryView';
import { NoirPageScaffold } from './shell/noir/NoirPageScaffold';
import { NoirSettingsView } from './shell/noir/NoirSettingsView';
import { strings } from '../constants/strings';
import { getAlbumTracks } from '../services/musicGraph';
import { graphTrackToSearchResult } from '../services/discover/discoverFeed';

/** Tab page exit: 120 ms, or instant when an overlay covered the old page (custom = true). */
const TAB_PAGE_VARIANTS = {
  exit: (dropOldPage: boolean) => ({ opacity: 0, transition: { duration: dropOldPage ? 0 : 0.12 } }),
};

interface LandingPageProps {
  selectedArtist: VerifiedArtist | null;
  setSelectedArtist: React.Dispatch<React.SetStateAction<VerifiedArtist | null>>;
  selectedPlaylist: Playlist | null;
  setSelectedPlaylist: React.Dispatch<React.SetStateAction<Playlist | null>>;
  /** Now Playing covers the page: a tab change made from it drops the old page (see dropOldPageRef). */
  nowPlayingOpen?: boolean;
  libraryFocus?: {
    section: 'favorites' | 'playlists';
    playlistId: string | null;
    requestId: number;
  };
  onLibraryPlaylistOpenChange?: (playlistId: string | null) => void;
  onLibrarySectionChange?: (section: 'favorites' | 'playlists' | 'stats') => void;
  theme: any;
  artistLoadFailed?: boolean;
  onRetryArtist?: () => void;
  searchResults: SearchResult[];
  recentArtists: VerifiedArtist[];
  recentlyPlayed: SearchResult[];
  loadingSongId: string | null;
  activeSongKey?: string | null;
  activeTrack?: SearchResult | null;
  isPlaying?: boolean;
  artistTracks: SearchResult[];
  isLoadingArtist: boolean;
  favorites: SearchResult[];
  handleSelectSong: (song: SearchResult) => void;
  handleAddToQueue: (song: SearchResult) => void;
  handlePlayPlaylist: (tracks: SearchResult[], label?: string, startIndex?: number) => void;
  handlePlayNext: (song: SearchResult) => void;
  handleToggleFavorite: (song: SearchResult) => void;
  handleStartRadio?: (song: SearchResult) => void;
  handleViewArtistProfile: (artist: VerifiedArtist) => void;
  handlePickArtistCandidate?: (candidate: import('../services/artistIdentity').ArtistIdentity) => void;
  artistCandidates?: import('../services/artistIdentity').ArtistIdentity[] | null;
  setArtistCandidates?: (candidates: import('../services/artistIdentity').ArtistIdentity[] | null) => void;
  handleViewArtistByName: (name: string, channelId?: string, thumbnail?: string) => void;
  setArtistTracks: (tracks: SearchResult[]) => void;
  activeTab: 'search' | 'discover' | 'myhub' | 'settings';
  setActiveTab: (tab: 'search' | 'discover' | 'myhub' | 'settings') => void;
}

export function LandingPage({
  selectedArtist,
  setSelectedArtist,
  selectedPlaylist,
  setSelectedPlaylist,
  nowPlayingOpen = false,
  libraryFocus,
  onLibraryPlaylistOpenChange,
  onLibrarySectionChange,
  theme,
  artistLoadFailed,
  onRetryArtist,
  searchResults,
  recentArtists,
  recentlyPlayed,
  loadingSongId,
  activeSongKey = null,
  activeTrack = null,
  isPlaying = false,
  artistTracks,
  isLoadingArtist,
  favorites,
  handleSelectSong,
  handleAddToQueue,
  handlePlayPlaylist,
  handlePlayNext,
  handleToggleFavorite,
  handleStartRadio,
  handleViewArtistProfile,
  handlePickArtistCandidate,
  artistCandidates = null,
  setArtistCandidates,
  handleViewArtistByName,
  setArtistTracks,
  activeTab,
  setActiveTab,
}: LandingPageProps) {
  const hasDetailOverlay = selectedArtist !== null || selectedPlaylist !== null;
  // A tab change made while something covers the page (an artist/mix overlay, or Now Playing)
  // drops the old page at once, so the cover steps back onto the new page instead of flashing the
  // old one. Latched per tab change; checks the previous render too, since the cover is usually
  // cleared in the same update as the tab (it is still on screen, exiting).
  const pageCovered = hasDetailOverlay || nowPlayingOpen;
  const prevTabRef = useRef(activeTab);
  const prevCoveredRef = useRef(pageCovered);
  const dropOldPageRef = useRef(false);
  if (prevTabRef.current !== activeTab) {
    dropOldPageRef.current = pageCovered || prevCoveredRef.current;
    prevTabRef.current = activeTab;
  }
  prevCoveredRef.current = pageCovered;
  const [topOverlay, setTopOverlay] = useState<'artist' | 'playlist'>('playlist');
  const artistOverlayKey = selectedArtist?.name ?? null;
  useEffect(() => {
    if (artistOverlayKey) setTopOverlay('artist');
  }, [artistOverlayKey]);
  useEffect(() => {
    if (selectedPlaylist) setTopOverlay('playlist');
  }, [selectedPlaylist?.id]);

  const artistOverlay = selectedArtist && (

            <NoirDetailOverlay
              key="artist"
              onClose={() => {
                setSelectedArtist(null);
                setArtistTracks([]);
                setArtistCandidates?.(null);
              }}
            >
              <NoirArtistView
                artist={selectedArtist}
                tracks={artistTracks}
                isLoading={isLoadingArtist}
                loadFailed={artistLoadFailed}
                onRetry={onRetryArtist}
                favorites={favorites}
                onSelectSong={handleSelectSong}
                onAddToQueue={handleAddToQueue}
                onPlayNext={handlePlayNext}
                onToggleFavorite={handleToggleFavorite}
                onPlayAll={() => {
                  if (artistTracks.length > 0) {
                    handlePlayPlaylist(artistTracks, strings.artist.popular);
                  }
                }}
                onPlayFromIndex={(index) => {
                  if (artistTracks.length > 0) {
                    handlePlayPlaylist(artistTracks, strings.artist.popular, index);
                  }
                }}
                onStartRadio={handleStartRadio}
                candidates={artistCandidates}
                onPickCandidate={handlePickArtistCandidate}
                onSelectArtist={handleViewArtistProfile}
                onPlayAlbum={async (album) => {
                  const tracks = await getAlbumTracks(album.id);
                  const searchResults = tracks.map((t) => graphTrackToSearchResult(t, `album:${album.id}`));
                  if (searchResults.length > 0) {
                    handlePlayPlaylist(searchResults, album.title);
                  }
                }}
                onSelectAlbum={async (album) => {
                  const tracks = await getAlbumTracks(album.id);
                  const searchResults = tracks.map((t) => graphTrackToSearchResult(t, `album:${album.id}`));
                  setSelectedPlaylist({
                    id: `album:${album.id}`,
                    name: album.title,
                    description: `${album.artist}${album.year ? ` · ${album.year}` : ''}`,
                    tracks: searchResults,
                    thumbnail: album.image || '',
                    accent: 'ember',
                    recordType: album.recordType,
                  });
                }}
              />
            </NoirDetailOverlay>
  );
  const playlistOverlay = selectedPlaylist && (

            <NoirDetailOverlay key="playlist" title={selectedPlaylist.name} onClose={() => setSelectedPlaylist(null)}>
              <NoirPlaylistView
                playlist={selectedPlaylist}
                favorites={favorites}
                onSelectSong={handleSelectSong}
                onAddToQueue={handleAddToQueue}
                onPlayPlaylist={handlePlayPlaylist}
                onPlayNext={handlePlayNext}
                onToggleFavorite={handleToggleFavorite}
                activeSongKey={activeSongKey}
                activeTrack={activeTrack}
                isPlaying={isPlaying}
              />
            </NoirDetailOverlay>
  );

  return (
    <div className="relative h-full w-full">
      {/* Overlays stack by recency: whatever was opened last sits on top (artist from a mix,
          album from an artist). Closing the top one reveals the one beneath. */}
      {/* Overlays stack by recency: whatever was opened last sits on top (artist from a mix,
          album from an artist). Closing the top one reveals the one beneath.
          Keyed elements directly under AnimatePresence (no fragment) so each keeps its exit. */}
      <AnimatePresence>
        {(topOverlay === 'artist' ? [playlistOverlay, artistOverlay] : [artistOverlay, playlistOverlay])}
      </AnimatePresence>

      <motion.div
        className="h-full w-full"
        animate={{
          opacity: hasDetailOverlay ? 0.35 : 1,
        }}
        transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
        style={{ pointerEvents: hasDetailOverlay ? 'none' : 'auto' }}
      >
        <AnimatePresence mode="wait" custom={dropOldPageRef.current}>
          {activeTab === 'search' && (
            <motion.div
              key="noir-home"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              variants={TAB_PAGE_VARIANTS}
              exit="exit"
              transition={{ duration: 0.2 }}
              className="h-full"
            >
              <NoirHomeView
                recentArtists={recentArtists}
                recentlyPlayed={recentlyPlayed}
                favorites={favorites}
                loadingSongId={loadingSongId}
                activeSongKey={activeSongKey}
                activeTrack={activeTrack}
                isPlaying={isPlaying}
                handleViewArtistProfile={handleViewArtistProfile}
                handleSelectSong={handleSelectSong}
                handleAddToQueue={handleAddToQueue}
                handlePlayNext={handlePlayNext}
                handleToggleFavorite={handleToggleFavorite}
                onOpenDiscover={() => setActiveTab('discover')}
                onSelectPlaylist={setSelectedPlaylist}
                onPlayPlaylist={handlePlayPlaylist}
                theme={theme}
              />
            </motion.div>
          )}

          {activeTab === 'discover' && (
            <motion.div
              key="noir-discover"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              variants={TAB_PAGE_VARIANTS}
              exit="exit"
              transition={{ duration: 0.2 }}
              className="h-full"
            >
              <NoirPageScaffold title="Discover" titleSize="compact">
                <NoirDiscoverView
                  onSelectSong={handleSelectSong}
                  onAddToQueue={handleAddToQueue}
                  onPlayPlaylist={handlePlayPlaylist}
                  onPlayNext={handlePlayNext}
                  onToggleFavorite={handleToggleFavorite}
                  favorites={favorites}
                  onSelectPlaylist={setSelectedPlaylist}
                  onViewArtist={handleViewArtistByName}
                />
              </NoirPageScaffold>
            </motion.div>
          )}

          {activeTab === 'myhub' && (
            <motion.div
              key="noir-library"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              variants={TAB_PAGE_VARIANTS}
              exit="exit"
              transition={{ duration: 0.2 }}
              className="h-full"
            >
              <NoirPageScaffold>
                <NoirLibraryView
                  favorites={favorites}
                  recentTracks={recentlyPlayed}
                  focus={libraryFocus}
                  onPlaylistOpenChange={onLibraryPlaylistOpenChange}
                  onSectionChange={onLibrarySectionChange}
                  onToggleFavorite={handleToggleFavorite}
                  onSelectSong={handleSelectSong}
                  onAddToQueue={handleAddToQueue}
                  onPlayPlaylist={handlePlayPlaylist}
                  onPlayNext={handlePlayNext}
                />
              </NoirPageScaffold>
            </motion.div>
          )}

          {activeTab === 'settings' && (
            <motion.div
              key="noir-settings"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              variants={TAB_PAGE_VARIANTS}
              exit="exit"
              transition={{ duration: 0.2 }}
              className="h-full"
            >
              <NoirPageScaffold title="Settings">
                <NoirSettingsView />
              </NoirPageScaffold>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
}
