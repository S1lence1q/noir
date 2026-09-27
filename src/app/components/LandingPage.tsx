import { motion, AnimatePresence } from 'motion/react';
import { VerifiedArtist, SearchResult } from '../types';
import { Playlist } from './PlaylistDetailsView';
import { AccentColor } from './themeUtils';
import { BrandingHeader } from './BrandingHeader';
import { SearchSection } from './SearchSection';
import { DiscoverView } from './DiscoverView';
import { NoirDiscoverView } from './shell/noir/NoirDiscoverView';
import { ProfileHubView } from './ProfileHubView';
import { ArtistProfileView } from './ArtistProfileView';
import { PlaylistDetailsView } from './PlaylistDetailsView';
import { DetailOverlay } from './DetailOverlay';
import { NoirDetailOverlay } from './shell/noir/NoirDetailOverlay';
import { NoirArtistView } from './shell/noir/NoirArtistView';
import { NoirPlaylistView } from './shell/noir/NoirPlaylistView';
import { NoirHomeView } from './shell/noir/NoirHomeView';
import { NoirLibraryView } from './shell/noir/NoirLibraryView';
import { NoirPageScaffold } from './shell/noir/NoirPageScaffold';
import { NoirSettingsView } from './shell/noir/NoirSettingsView';

interface LandingPageProps {
  isIntroActive: boolean;
  scrollProgress: number;
  scrollContainerRef: React.RefObject<HTMLDivElement | null>;
  onScroll?: () => void;
  selectedArtist: VerifiedArtist | null;
  setSelectedArtist: React.Dispatch<React.SetStateAction<VerifiedArtist | null>>;
  selectedPlaylist: Playlist | null;
  setSelectedPlaylist: React.Dispatch<React.SetStateAction<Playlist | null>>;
  libraryFocus?: {
    section: 'favorites' | 'playlists';
    playlistId: string | null;
    requestId: number;
  };
  onLibraryPlaylistOpenChange?: (playlistId: string | null) => void;
  accentColor: AccentColor;
  theme: any;
  hasSeenTour: boolean;
  tourType: 'landing' | 'player' | null;
  startTour: () => void;
  isFirstVisit: boolean;
  hasSelectedArtistOnce: boolean;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  lastSearchedQuery: string;
  isSearching: boolean;
  searchResults: SearchResult[];
  recentArtists: VerifiedArtist[];
  recentlyPlayed: SearchResult[];
  verifiedArtist: VerifiedArtist | null;
  focusedResultIndex: number;
  loadingSongId: string | null;
  activeSongKey?: string | null;
  isPlaying?: boolean;
  artistColors: any;
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
  handleUrlSubmit: (url: string) => void;
  handleFileSelect: (e: React.ChangeEvent<HTMLInputElement>) => void;
  handleSearch: (overrideQuery?: string) => void;
  setArtistTracks: (tracks: SearchResult[]) => void;

  onAccentColorChange?: (color: AccentColor) => void;
  textureStyle: 'paper' | 'dots' | 'none';
  onTextureStyleChange?: (style: 'paper' | 'dots' | 'none') => void;
  backgroundStyle: 'default' | 'particles' | 'liquid' | 'mesh';
  onBackgroundStyleChange?: (style: 'default' | 'particles' | 'liquid' | 'mesh') => void;
  zenMode: boolean;
  onZenModeChange?: (zen: boolean) => void;
  showVolumeSlider: boolean;
  onShowVolumeSliderChange?: (show: boolean) => void;
  enable3DTilt: boolean;
  onEnable3DTiltChange?: (enable: boolean) => void;
  showSettingsButton: boolean;
  onShowSettingsButtonChange?: (show: boolean) => void;
  enableCustomLyrics: boolean;
  onEnableCustomLyricsChange: (enable: boolean) => void;
  peekProgressStyle: 'none' | 'line' | 'border';
  onPeekProgressStyleChange: (style: 'none' | 'line' | 'border') => void;
  showVisualizer: boolean;
  onShowVisualizerChange: (show: boolean) => void;

  activeTab: 'search' | 'discover' | 'myhub' | 'settings';
  setActiveTab: (tab: 'search' | 'discover' | 'myhub' | 'settings') => void;

  navMode: 'tabs' | 'scroll';
  onNavModeChange: (mode: 'tabs' | 'scroll') => void;
  navPosition: 'bottom' | 'top' | 'right';
  onNavPositionChange: (pos: 'bottom' | 'top' | 'right') => void;
  shellMode?: boolean;
}

export function LandingPage({
  isIntroActive,
  scrollProgress,
  scrollContainerRef,
  onScroll,
  selectedArtist,
  setSelectedArtist,
  selectedPlaylist,
  setSelectedPlaylist,
  libraryFocus,
  onLibraryPlaylistOpenChange,
  accentColor,
  theme,
  hasSeenTour,
  tourType,
  startTour,
  isFirstVisit,
  hasSelectedArtistOnce,
  searchQuery,
  setSearchQuery,
  lastSearchedQuery,
  isSearching,
  searchResults,
  recentArtists,
  recentlyPlayed,
  verifiedArtist,
  focusedResultIndex,
  loadingSongId,
  activeSongKey = null,
  isPlaying = false,
  artistColors,
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
  handleUrlSubmit,
  handleFileSelect,
  handleSearch,
  setArtistTracks,
  onAccentColorChange,
  textureStyle,
  onTextureStyleChange,
  backgroundStyle,
  onBackgroundStyleChange,
  zenMode,
  onZenModeChange,
  showVolumeSlider,
  onShowVolumeSliderChange,
  enable3DTilt,
  onEnable3DTiltChange,
  showSettingsButton,
  onShowSettingsButtonChange,
  enableCustomLyrics,
  onEnableCustomLyricsChange,
  peekProgressStyle,
  onPeekProgressStyleChange,
  showVisualizer,
  onShowVisualizerChange,
  activeTab,
  setActiveTab,
  navMode,
  onNavModeChange,
  navPosition,
  onNavPositionChange,
  shellMode = false,
}: LandingPageProps) {
  const renderSearchContent = () => (
    <>
      <div className="w-full flex flex-col items-center shrink-0">
        <div className="h-6 md:h-10 shrink-0 w-full" />
        <BrandingHeader
          accentColor={accentColor}
          hasSeenTour={hasSeenTour}
          tourType={tourType}
          startTour={startTour}
          isFirstVisit={isFirstVisit}
          hasSelectedArtist={hasSelectedArtistOnce}
        />
      </div>
      
      <div className="w-full flex flex-col items-center justify-start mt-6">
        <SearchSection
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
          lastSearchedQuery={lastSearchedQuery}
          isSearching={isSearching}
          searchResults={searchResults}
          recentArtists={recentArtists}
          recentlyPlayed={recentlyPlayed}
          verifiedArtist={verifiedArtist}
          focusedResultIndex={focusedResultIndex}
          loadingSongId={loadingSongId}
          handleViewArtistProfile={handleViewArtistProfile}
          handleUrlSubmit={handleUrlSubmit}
          handleSearch={handleSearch}
          handleSelectSong={handleSelectSong}
          handleAddToQueue={handleAddToQueue}
          handlePlayNext={handlePlayNext}
          handleFileSelect={handleFileSelect}
          theme={theme}
          isFirstVisit={isFirstVisit}
          hasSelectedArtist={hasSelectedArtistOnce}
          accentColor={accentColor}
        />
      </div>
    </>
  );

  const renderDiscoverContent = () => (
    <>
      <div id="tour-discover-section" className="w-full max-w-[898px] mx-auto px-6 mb-4 flex items-center justify-between shrink-0 select-none">
        <h2 className="text-2xl font-normal tracking-[0.08em] bg-clip-text text-transparent bg-gradient-to-r from-white via-white/80 to-white/60" style={{ fontFamily: '"Kaobe", serif' }}>
          Discover
        </h2>
        <span className="elva-section-label">Live Charts</span>
      </div>

      <DiscoverView
        onSelectSong={handleSelectSong}
        onAddToQueue={handleAddToQueue}
        onPlayPlaylist={handlePlayPlaylist}
        onPlayNext={handlePlayNext}
        accentColor={accentColor}
        favorites={favorites}
        onToggleFavorite={handleToggleFavorite}
        onSelectPlaylist={setSelectedPlaylist}
      />
    </>
  );

  const renderMyHubContent = () => (
    <>
      <div className="w-full max-w-[898px] mx-auto px-6 mb-4 flex items-center justify-between shrink-0 select-none">
        <h2 className="text-2xl font-normal tracking-[0.08em] bg-clip-text text-transparent bg-gradient-to-r from-white via-white/80 to-white/60" style={{ fontFamily: '"Kaobe", serif' }}>
          My Hub
        </h2>
        <span className="elva-section-label">Your Personal Vibe</span>
      </div>

      <ProfileHubView
        favorites={favorites}
        onToggleFavorite={handleToggleFavorite}
        onSelectSong={handleSelectSong}
        onAddToQueue={handleAddToQueue}
        onPlayPlaylist={handlePlayPlaylist}
        accentColor={accentColor}
        onSelectArtist={handleViewArtistProfile}
        onPlayNext={handlePlayNext}
        onAccentColorChange={onAccentColorChange}
        textureStyle={textureStyle}
        onTextureStyleChange={onTextureStyleChange}
        backgroundStyle={backgroundStyle}
        onBackgroundStyleChange={onBackgroundStyleChange}
        zenMode={zenMode}
        onZenModeChange={onZenModeChange}
        showVolumeSlider={showVolumeSlider}
        onShowVolumeSliderChange={onShowVolumeSliderChange}
        enable3DTilt={enable3DTilt}
        onEnable3DTiltChange={onEnable3DTiltChange}
        showSettingsButton={showSettingsButton}
        onShowSettingsButtonChange={onShowSettingsButtonChange}
        enableCustomLyrics={enableCustomLyrics}
        onEnableCustomLyricsChange={onEnableCustomLyricsChange}
        peekProgressStyle={peekProgressStyle}
        onPeekProgressStyleChange={onPeekProgressStyleChange}
        showVisualizer={showVisualizer}
        onShowVisualizerChange={onShowVisualizerChange}
        navMode={navMode}
        onNavModeChange={onNavModeChange}
        navPosition={navPosition}
        onNavPositionChange={onNavPositionChange}
      />
    </>
  );

  const isScrollMode = navMode === 'scroll';
  const contentPadding = shellMode ? 'pt-8 pb-6' : 'pt-16 pb-24';
  const hasDetailOverlay = selectedArtist !== null || selectedPlaylist !== null;

  if (shellMode) {
    return (
      <div className="relative h-full w-full">
        <AnimatePresence>
          {selectedArtist && (
            <NoirDetailOverlay
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
                favorites={favorites}
                onSelectSong={handleSelectSong}
                onAddToQueue={handleAddToQueue}
                onPlayNext={handlePlayNext}
                onToggleFavorite={handleToggleFavorite}
                onPlayAll={() => {
                  if (artistTracks.length > 0) {
                    handlePlayPlaylist(artistTracks, selectedArtist.name);
                  }
                }}
                onPlayFromIndex={(index) => {
                  if (artistTracks.length > 0) {
                    handlePlayPlaylist(artistTracks, selectedArtist.name, index);
                  }
                }}
                onStartRadio={handleStartRadio}
                candidates={artistCandidates}
                onPickCandidate={handlePickArtistCandidate}
              />
            </NoirDetailOverlay>
          )}

          {selectedPlaylist && (
            <NoirDetailOverlay title={selectedPlaylist.name} onClose={() => setSelectedPlaylist(null)}>
              <NoirPlaylistView
                playlist={selectedPlaylist}
                favorites={favorites}
                onSelectSong={handleSelectSong}
                onAddToQueue={handleAddToQueue}
                onPlayPlaylist={handlePlayPlaylist}
                onPlayNext={handlePlayNext}
                onToggleFavorite={handleToggleFavorite}
              />
            </NoirDetailOverlay>
          )}
        </AnimatePresence>

        <motion.div
          className="h-full w-full"
          animate={{
            opacity: hasDetailOverlay ? 0.35 : 1,
          }}
          transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
          style={{ pointerEvents: hasDetailOverlay ? 'none' : 'auto' }}
        >
          <AnimatePresence mode="wait">
            {activeTab === 'search' && (
              <motion.div
                key="noir-home"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.18 }}
                className="h-full"
              >
                <NoirHomeView
                  searchQuery={searchQuery}
                  setSearchQuery={setSearchQuery}
                  lastSearchedQuery={lastSearchedQuery}
                  isSearching={isSearching}
                  searchResults={searchResults}
                  recentArtists={recentArtists}
                  recentlyPlayed={recentlyPlayed}
                  favorites={favorites}
                  verifiedArtist={verifiedArtist}
                  focusedResultIndex={focusedResultIndex}
                  loadingSongId={loadingSongId}
                  activeSongKey={activeSongKey}
                  isPlaying={isPlaying}
                  handleViewArtistProfile={handleViewArtistProfile}
                  handleUrlSubmit={handleUrlSubmit}
                  handleSearch={handleSearch}
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
                exit={{ opacity: 0 }}
                transition={{ duration: 0.18 }}
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
                exit={{ opacity: 0 }}
                transition={{ duration: 0.18 }}
                className="h-full"
              >
                <NoirPageScaffold>
                  <NoirLibraryView
                    favorites={favorites}
                    focus={libraryFocus}
                    onPlaylistOpenChange={onLibraryPlaylistOpenChange}
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
                exit={{ opacity: 0 }}
                transition={{ duration: 0.18 }}
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

  return (
    <motion.div
      key="landing"
      layout
      initial={{ opacity: 0, scale: 0.97 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 1.08 }}
      transition={{ duration: 1.0, ease: [0.16, 1, 0.3, 1] }}
      className={`absolute inset-0 z-10 flex h-full w-full flex-col items-center justify-start px-0 ${
        shellMode ? '' : 'px-0'
      }`}
    >
      {/* Animated gradient orbs during intro */}
      {!shellMode && isIntroActive && (
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: [0, 0.2, 0.3, 0], scale: [0.8, 1.25, 1.55, 2.1] }}
          transition={{ duration: 3, ease: "easeOut" }}
          className="absolute w-[950px] h-[950px] rounded-full blur-[140px] bg-gradient-to-tr from-indigo-950/20 via-blue-900/10 to-transparent pointer-events-none z-0"
        />
      )}

      {/* Localized deep dark radial gradient vignette */}
      {!shellMode && selectedArtist === null && selectedPlaylist === null && searchQuery.trim() === '' && (
        <div 
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-[45%] w-[880px] h-[520px] rounded-full pointer-events-none z-0 opacity-[0.04]" 
          style={{
            background: 'radial-gradient(circle at center, rgba(0, 0, 0, 0.72) 0%, rgba(0, 0, 0, 0.45) 45%, rgba(0,0,0,0) 80%)',
            filter: 'blur(35px)'
          }}
        />
      )}

      {/* Immersive Widescreen Overlay Details Views */}
      <AnimatePresence>
        {selectedArtist && (
          <DetailOverlay>
            <ArtistProfileView
              selectedArtist={selectedArtist}
              artistColors={artistColors}
              artistTracks={artistTracks}
              isLoadingArtist={isLoadingArtist}
              focusedResultIndex={focusedResultIndex}
              loadingSongId={loadingSongId}
              handleSelectSong={handleSelectSong}
              handleAddToQueue={handleAddToQueue}
              setSelectedArtist={setSelectedArtist}
              setArtistTracks={setArtistTracks}
              theme={theme}
              favorites={favorites}
              onToggleFavorite={handleToggleFavorite}
              onPlayNext={handlePlayNext}
            />
          </DetailOverlay>
        )}

        {selectedPlaylist && (
          <DetailOverlay>
            <PlaylistDetailsView
              playlist={selectedPlaylist}
              onClose={() => setSelectedPlaylist(null)}
              loadingSongId={loadingSongId}
              handleSelectSong={handleSelectSong}
              handleAddToQueue={handleAddToQueue}
              onPlayPlaylist={handlePlayPlaylist}
              favorites={favorites}
              onToggleFavorite={handleToggleFavorite}
              onPlayNext={handlePlayNext}
              accentColor={accentColor}
            />
          </DetailOverlay>
        )}
      </AnimatePresence>

      {/* Main Viewport Container */}
      <motion.div
        ref={scrollContainerRef}
        onScroll={isScrollMode ? onScroll : undefined}
        animate={{
          opacity: (selectedArtist !== null || selectedPlaylist !== null) ? 0 : 1,
          scale: (selectedArtist !== null || selectedPlaylist !== null) ? 0.96 : 1,
          y: (selectedArtist !== null || selectedPlaylist !== null) ? -16 : 0,
          filter: (selectedArtist !== null || selectedPlaylist !== null) ? 'blur(4px)' : 'blur(0px)'
        }}
        transition={{ duration: 0.55, ease: [0.16, 1, 0.3, 1] }}
        id={isScrollMode ? "landing-scroll-container" : "landing-content-container"}
        className={`w-full h-full relative z-10 ${
          isScrollMode 
            ? "overflow-y-auto snap-y snap-mandatory scrollbar-none flex flex-col" 
            : "overflow-hidden"
        }`}
        style={{
          pointerEvents: (selectedArtist !== null || selectedPlaylist !== null) ? 'none' : 'auto'
        }}
      >
        {isScrollMode ? (
          <>
            <section className={`w-full h-full snap-start shrink-0 flex flex-col items-center justify-start relative px-0 overflow-y-auto scrollbar-none ${contentPadding}`}>
              {renderSearchContent()}
            </section>
            <section className={`w-full h-full snap-start shrink-0 flex flex-col items-center justify-start relative px-0 overflow-y-auto scrollbar-none ${contentPadding}`}>
              {renderDiscoverContent()}
            </section>
            <section className={`w-full h-full snap-start shrink-0 flex flex-col items-center justify-start relative px-0 overflow-y-auto scrollbar-none ${contentPadding}`}>
              {renderMyHubContent()}
            </section>
          </>
        ) : (
          <AnimatePresence mode="wait">
            {activeTab === 'search' && (
              <motion.div
                key="tab-search"
                initial={{ opacity: 0, scale: 0.985, filter: 'blur(4px)' }}
                animate={{ opacity: 1, scale: 1, filter: 'blur(0px)' }}
                exit={{ opacity: 0, scale: 0.985, filter: 'blur(4px)' }}
                transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
                className={`w-full h-full overflow-y-auto scrollbar-none flex flex-col px-0 ${contentPadding}`}
              >
                {renderSearchContent()}
              </motion.div>
            )}

            {activeTab === 'discover' && (
              <motion.div
                key="tab-discover"
                initial={{ opacity: 0, scale: 0.985, filter: 'blur(4px)' }}
                animate={{ opacity: 1, scale: 1, filter: 'blur(0px)' }}
                exit={{ opacity: 0, scale: 0.985, filter: 'blur(4px)' }}
                transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
                className={`w-full h-full overflow-y-auto scrollbar-none flex flex-col px-0 ${contentPadding}`}
              >
                {renderDiscoverContent()}
              </motion.div>
            )}

            {activeTab === 'myhub' && (
              <motion.div
                key="tab-myhub"
                initial={{ opacity: 0, scale: 0.985, filter: 'blur(4px)' }}
                animate={{ opacity: 1, scale: 1, filter: 'blur(0px)' }}
                exit={{ opacity: 0, scale: 0.985, filter: 'blur(4px)' }}
                transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
                className={`w-full h-full overflow-y-auto scrollbar-none flex flex-col px-0 ${contentPadding}`}
              >
                {renderMyHubContent()}
              </motion.div>
            )}
          </AnimatePresence>
        )}
      </motion.div>

      {/* Subtle grid overlay for depth */}
      {!shellMode && (
      <div className="absolute inset-0 pointer-events-none opacity-[0.015] z-0">
        <div className="absolute inset-0" style={{
          backgroundImage: 'linear-gradient(rgba(255,255,255,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.03) 1px, transparent 1px)',
          backgroundSize: '100px 100px'
        }} />
      </div>
      )}
    </motion.div>
  );
}
