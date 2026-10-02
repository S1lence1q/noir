import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Queue } from './Queue';
import { LyricsPanel } from './LyricsPanel';
import { ChevronDown, Keyboard } from 'lucide-react';
import { AccentColor, ACCENT_THEMES } from './themeUtils';
import { getDynamicFallbackColors } from '../utils/playerColorUtils';
import { loadCustomLyrics } from '../utils/lyricsUtils';
import { showMiniHUD } from '../utils/hudUtils';
import { CustomLyricsModal } from './CustomLyricsModal';
import { SearchResult } from '../types';
import { usePlaybackCore } from '../hooks/usePlaybackCore';
import { useLyrics } from '../hooks/useLyrics';
import { usePlayStats } from '../hooks/usePlayStats';
import { ArtworkCard } from './musicplayer/ArtworkCard';
import { BottomBarControls } from './musicplayer/BottomBarControls';

declare global {
  interface Window {
    YT: any;
    onYouTubeIframeAPIReady: () => void;
  }
}

interface QueueItem {
  id: string;
  title: string;
  artist: string;
  thumbnail: string;
  videoId: string;
}

interface MusicPlayerProps {
  songData: {
    title: string;
    artist: string;
    artworkUrl: string;
    audioUrl: string;
    videoId?: string;
    channelId?: string;
  };
  queue?: QueueItem[];
  onRemoveFromQueue?: (id: string) => void;
  onClearQueue?: () => void;
  onShuffleQueue?: () => void;
  onSelectFromQueue?: (id: string, isCrossfade?: boolean) => void;
  onAddToQueue?: (song: SearchResult) => void;
  onPlayNext?: (song: SearchResult) => void;
  onSelectSong?: (song: SearchResult) => void;
  onPlayPlaylist?: (tracks: SearchResult[], label?: string) => void;
  onFileSelect?: (file: File) => void;
  onUrlSubmit?: (url: string) => void;
  onReorderQueue?: (newIds: string[]) => void;
  onQueueFileSelect?: (file: File) => void;
  onBackToHome?: () => void;
  onSearch?: (query: string) => Promise<SearchResult[]>;
  onFetchChannelUploads?: (channelId: string, limit?: number) => Promise<SearchResult[]>;
  accentColor?: AccentColor;
  favorites?: SearchResult[];
  onToggleFavorite?: (song: SearchResult) => void;
  onViewArtist?: (name: string, channelId?: string) => void;
  songColors?: { primary: string; secondary: string; accent: string } | null;
  onPlayingStateChange?: (playing: boolean) => void;
  onShellPlaybackState?: (state: {
    currentTime: number;
    duration: number;
    isPlaying: boolean;
  }) => void;
  appState?: string;
}


const THEME_PRESETS = {
  cyberpunk: {
    primary: 'rgba(244,63,94,0.6)',
    secondary: 'rgba(6,182,212,0.5)',
    accent: 'rgba(139,92,246,0.4)'
  },
  obsidian: {
    primary: 'rgba(71,85,105,0.6)',
    secondary: 'rgba(2,6,23,0.8)',
    accent: 'rgba(15,23,42,0.5)'
  },
  aurora: {
    primary: 'rgba(16,185,129,0.6)',
    secondary: 'rgba(99,102,241,0.5)',
    accent: 'rgba(5,150,105,0.4)'
  },
  sunset: {
    primary: 'rgba(249,115,22,0.6)',
    secondary: 'rgba(124,58,237,0.5)',
    accent: 'rgba(217,70,239,0.4)'
  }
};

export function MusicPlayer({ 
  songData, 
  queue = [], 
  onRemoveFromQueue, 
  onClearQueue,
  onShuffleQueue,
  onSelectFromQueue, 
  onAddToQueue, 
  onPlayNext,
  onSelectSong,
  onPlayPlaylist,
  onFileSelect, 
  onUrlSubmit, 
  onReorderQueue,
  onQueueFileSelect,
  onBackToHome, 
  onSearch,
  onFetchChannelUploads,
  accentColor = 'emerald',
  favorites = [],
  onToggleFavorite,
  onViewArtist,
  songColors,
  onPlayingStateChange,
  onShellPlaybackState,
  appState = 'ready',
}: MusicPlayerProps) {
  const theme = ACCENT_THEMES[accentColor];
  // The old settings screen is gone; the hidden legacy player keeps the defaults it used to have.
  const zenMode = false;
  const showVolumeSlider = false;
  const showVisualizer = false;
  const enable3DTilt = true;
  const enableCustomLyrics = false;
  const peekProgressStyle = 'border';

  const {
    isPlaying,
    isPlayingRef,
    currentTime,
    duration,
    setDuration,
    volume,
    preMuteVolume,
    setPreMuteVolume,
    audioRefA,
    audioRefB,
    activeEngine,
    fadeVolume,
    togglePlayPause,
    handleNextSong,
    handlePreviousSong,
    handleSliderChange,
    handleVolumeChange,
    skipTime,
    seekToAbsoluteTime,
    formatTime,
    waveformData,
    analyserRef,
    isCrossfadingRef
  } = usePlaybackCore({
    songData,
    queue: queue.map((item) => ({ 
      id: item.id, 
      videoId: item.videoId, 
      audioUrl: item.audioUrl || '', 
      title: item.title, 
      artist: item.artist, 
      thumbnail: item.thumbnail 
    })),
    onSelectFromQueue,
    onPlayingStateChange,
  });

  useEffect(() => {
    onShellPlaybackState?.({ currentTime, duration, isPlaying });
  }, [currentTime, duration, isPlaying, onShellPlaybackState]);

  usePlayStats(songData, isPlaying);

  const {
    showLyrics,
    setShowLyrics,
    lyrics,
    isLoadingLyrics,
    currentLyricIndex,
    isLyricsSynced,
    isLyricsModalOpen,
    setIsLyricsModalOpen,
    handleLyricsReload,
  } = useLyrics(songData, currentTime);

  const [showQueue, setShowQueue] = useState(false);
  const [focusSearchInQueue, setFocusSearchInQueue] = useState(false);
  const [isLargeScreen, setIsLargeScreen] = useState(false);
  const [queueInitialArtist, setQueueInitialArtist] = useState<{ name: string; channelId?: string } | null>(null);

  const handleArtworkViewArtist = (name: string, channelId?: string) => {
    setQueueInitialArtist({ name, channelId });
    setShowQueue(true);
  };

  useEffect(() => {
    const handleResize = () => {
      setIsLargeScreen(window.innerWidth >= 1024);
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const handleAddToPlaylist = (playlistId: string) => {
    try {
      const stored = localStorage.getItem('noir_playlists');
      const plist: any[] = stored ? JSON.parse(stored) : [];
      const playlist = plist.find(p => p.id === playlistId);
      
      if (playlist) {
        const currentTrack = {
          id: songData.videoId || songData.audioUrl,
          videoId: songData.videoId || '',
          title: songData.title,
          artist: songData.artist,
          thumbnail: songData.artworkUrl
        };
        
        if (playlist.tracks.some((t: any) => t.id === currentTrack.id)) {
          showMiniHUD('Already in this playlist', 'info');
          return;
        }
        
        playlist.tracks.push(currentTrack);
        localStorage.setItem('noir_playlists', JSON.stringify(plist));
        
        window.dispatchEvent(new Event('noir-playlists-updated'));
        showMiniHUD(`Added to ${playlist.name}`, 'success');
      }
    } catch (e) {
      console.warn('Failed to add track to playlist:', e);
    }
  };

  // Auto-close overlays when player is backgrounded to prevent visual leaks
  useEffect(() => {
    if (appState !== 'ready') {
      setShowQueue(false);
    }
  }, [appState]);

  const extractedColors = songColors || getDynamicFallbackColors(songData.title || '', songData.artist || '');
  const [dominantColors, setDominantColors] = useState(extractedColors);

  useEffect(() => {
    setDominantColors(extractedColors);
  }, [extractedColors]);

  // Zen Mode Idle Tracker
  const [isUserIdle, setIsUserIdle] = useState(false);
  const idleTimerRef = useRef<any>(null);

  useEffect(() => {
    if (!zenMode) {
      setIsUserIdle(false);
      if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
      return;
    }

    const resetIdleTimer = () => {
      setIsUserIdle(false);
      if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
      idleTimerRef.current = setTimeout(() => {
        setIsUserIdle(true);
      }, 3000);
    };

    resetIdleTimer();

    window.addEventListener('mousemove', resetIdleTimer);
    window.addEventListener('keydown', resetIdleTimer);
    window.addEventListener('click', resetIdleTimer);

    return () => {
      if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
      window.removeEventListener('mousemove', resetIdleTimer);
      window.removeEventListener('keydown', resetIdleTimer);
      window.removeEventListener('click', resetIdleTimer);
    };
  }, [zenMode]);

  // Keyboard controls
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (appState !== 'ready') return;
      const target = e.target as HTMLElement;
      if (
        target &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.isContentEditable)
      ) {
        if (e.key === 'Escape') {
          target.blur();
        }
        return;
      }

      if (e.key === 'Escape') {
        if (showQueue) {
          e.preventDefault();
          setShowQueue(false);
          return;
        }
        if (showLyrics) {
          e.preventDefault();
          setShowLyrics(false);
          return;
        }
        e.preventDefault();
        onBackToHome?.();
        return;
      }

      if (e.code === 'Space') {
        e.preventDefault();
        togglePlayPause();
      } else if (e.code === 'ArrowRight') {
        e.preventDefault();
        skipTime(5);
      } else if (e.code === 'ArrowLeft') {
        e.preventDefault();
        skipTime(-5);
      } else if (e.code === 'ArrowUp') {
        e.preventDefault();
        const nv = Math.min(100, volume + 5);
        handleVolumeChange(nv);
      } else if (e.code === 'ArrowDown') {
        e.preventDefault();
        const nv = Math.max(0, volume - 5);
        handleVolumeChange(nv);
      } else if (e.code === 'KeyM') {
        e.preventDefault();
        if (volume > 0) {
          setPreMuteVolume(volume);
          handleVolumeChange(0);
        } else {
          handleVolumeChange(preMuteVolume || 70);
        }
      } else if (e.code === 'KeyL') {
        // Shell Now Playing owns lyrics (L) — skip flip-card lyrics here.
      } else if (e.code === 'KeyQ') {
        e.preventDefault();
        setShowQueue((prev) => !prev);
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [
    volume,
    preMuteVolume,
    togglePlayPause,
    skipTime,
    handleVolumeChange,
    setPreMuteVolume,
    setShowLyrics,
    showQueue,
    showLyrics,
    onBackToHome,
    appState,
  ]);

  return (
    <div 
      id="noir-player-root"
      className={`size-full relative overflow-hidden bg-transparent flex items-center justify-center transition-all bg-transition ${isUserIdle && zenMode ? 'cursor-none' : ''}`}
      style={{
        '--theme-primary': dominantColors.primary,
        '--theme-secondary': dominantColors.secondary,
        '--theme-accent': dominantColors.accent,
        '--theme-primary-fade': dominantColors.primary.replace('0.6', '0.15'),
        '--theme-secondary-fade': dominantColors.secondary.replace('0.5', '0.12'),
        '--theme-accent-fade': dominantColors.accent.replace('0.4', '0.08'),
        '--theme-primary-shadow': dominantColors.primary.replace('0.6', '0.45'),
        '--theme-secondary-shadow': dominantColors.secondary.replace('0.5', '0.35'),
        '--theme-primary-shadow-idle': dominantColors.primary.replace('0.6', '0.2'),
        '--theme-secondary-shadow-idle': dominantColors.secondary.replace('0.5', '0.15'),
      } as React.CSSProperties}
    >
      {/* Top bar */}
      <div className={`absolute top-8 left-8 z-20 transition-all duration-700 flex items-center gap-1.5 ${isUserIdle && zenMode ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}>
        <motion.button
          id="back-home-button"
          type="button"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3, duration: 0.4 }}
          onClick={onBackToHome}
          className="p-2 hover:bg-white/8 rounded-xl transition-all cursor-pointer text-white/35 hover:text-white/65 hover:scale-105 active:scale-95 duration-200 outline-none focus:outline-none focus:ring-0"
          aria-label="Back"
        >
          <ChevronDown className="w-5 h-5" />
        </motion.button>
        <motion.button
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4, duration: 0.4 }}
          onClick={() => window.dispatchEvent(new Event('noir-show-shortcuts'))}
          className="p-2 hover:bg-white/8 rounded-xl transition-all cursor-pointer text-white/35 hover:text-white/65 hover:scale-105 active:scale-95 duration-200 outline-none focus:outline-none focus:ring-0"
          title="Keyboard Shortcuts (?)"
          aria-label="Keyboard Shortcuts"
        >
          <Keyboard className="w-4.5 h-4.5" />
        </motion.button>
      </div>

      {/* Dedicated Overlay Container */}
      <div className="absolute inset-0 pointer-events-none z-50">

        {/* Queue component */}
        <AnimatePresence>
          {showQueue && (
            <div className="pointer-events-auto">
              <Queue
                items={queue.map(item => ({
                  id: item.id,
                  title: item.title,
                  artist: item.artist,
                  thumbnail: item.thumbnail,
                  videoId: item.videoId
                }))}
                currentSongId={songData.videoId}
                isPlaying={isPlaying}
                songData={songData}
                accentColor={accentColor}
                favorites={favorites}
                onToggleFavorite={onToggleFavorite}
                onRemove={onRemoveFromQueue || (() => {})}
                onClearQueue={onClearQueue}
                onShuffleQueue={onShuffleQueue}
                onSelect={async (id) => {
                  if (isPlayingRef.current) {
                    await fadeVolume(0, 400);
                  }
                  if (onSelectFromQueue) onSelectFromQueue(id);
                }}
                onClose={() => {
                  setShowQueue(false);
                  setQueueInitialArtist(null);
                }}
                initialArtist={queueInitialArtist}
                onClearInitialArtist={() => setQueueInitialArtist(null)}
                focusSearchOnMount={focusSearchInQueue}
                onSearch={onSearch}
                onFetchChannelUploads={onFetchChannelUploads}
                onAddToQueue={onAddToQueue}
                onPlayNext={onPlayNext}
                onPlayPlaylist={onPlayPlaylist}
                onSelectSong={async (song) => {
                  if (isPlayingRef.current) {
                    await fadeVolume(0, 400);
                  }
                  if (onSelectSong) onSelectSong(song);
                }}
                onFileSelect={onQueueFileSelect || onFileSelect}
                onUrlSubmit={onUrlSubmit}
                onReorder={onReorderQueue}
              />
            </div>
          )}
        </AnimatePresence>
      </div>

      {/* Hidden Media Players */}
      <div className="w-0 h-0 overflow-hidden absolute pointer-events-none" style={{ opacity: 0 }}>
        <div key="container-A-parent">
          <div id="yt-player-container-A" key="yt-player-container-A" />
        </div>
        <div key="container-B-parent">
          <div id="yt-player-container-B" key="yt-player-container-B" />
        </div>
      </div>
      <audio 
        ref={audioRefA} 
        onLoadedMetadata={(e) => {
          if (activeEngine === 'A') setDuration(e.currentTarget.duration);
        }}
        className="hidden" 
      />
      <audio 
        ref={audioRefB} 
        onLoadedMetadata={(e) => {
          if (activeEngine === 'B') setDuration(e.currentTarget.duration);
        }}
        className="hidden" 
      />

      <motion.div
        initial={{ opacity: 0, x: 0 }}
        animate={{ 
          opacity: 1,
          x: showQueue && isLargeScreen ? -230 : 0
        }}
        transition={{ 
          opacity: { duration: 0.5, delay: 0.2, ease: "easeOut" },
          x: { type: 'spring', stiffness: 350, damping: 32 }
        }}
        className="relative z-10 flex flex-col items-center px-8 w-full"
        style={{ maxWidth: 1152 }}
      >
        <div className={isLargeScreen ? 'relative w-full h-[550px] flex items-center justify-center' : 'flex flex-col items-center justify-center w-full pb-20 relative'}>
          {/* Extracted 3D Artwork Card */}
          <ArtworkCard
            songData={songData}
            currentTime={currentTime}
            duration={duration}
            isPlaying={isPlaying}
            waveformData={waveformData}
            handleSliderChange={handleSliderChange}
            handlePreviousSong={handlePreviousSong}
            handleNextSong={handleNextSong}
            togglePlayPause={togglePlayPause}
            formatTime={formatTime}
            favorites={favorites}
            onToggleFavorite={onToggleFavorite}
            handleAddToPlaylist={handleAddToPlaylist}
            onViewArtist={handleArtworkViewArtist}
            showLyrics={showLyrics}
            setShowLyrics={setShowLyrics}
            lyrics={lyrics}
            isLoadingLyrics={isLoadingLyrics}
            isLyricsSynced={isLyricsSynced}
            currentLyricIndex={currentLyricIndex}
            seekToAbsoluteTime={seekToAbsoluteTime}
            setIsLyricsModalOpen={setIsLyricsModalOpen}
            enableCustomLyrics={enableCustomLyrics}
            enable3DTilt={enable3DTilt}
            isLargeScreen={isLargeScreen}
            appState={appState}
            accentColor={accentColor}
            showVolumeSlider={showVolumeSlider}
            volume={volume}
            onVolumeChange={handleVolumeChange}
            preMuteVolume={preMuteVolume}
            setPreMuteVolume={setPreMuteVolume}
            peekProgressStyle={peekProgressStyle}
            zenMode={zenMode}
            isUserIdle={isUserIdle}
          />

          {/* Side-by-Side Lyrics Panel for desktop */}
          <AnimatePresence>
            {showLyrics && isLargeScreen && appState === 'ready' && (
              <motion.div
                initial={{ opacity: 0, x: 180 }}
                animate={{ opacity: 1, x: 284 }}
                exit={{ opacity: 0, x: 180 }}
                transition={{ type: 'spring', damping: 25, stiffness: 180 }}
                className="w-[520px] h-[520px] absolute shrink-0"
                style={{
                  position: 'absolute',
                  left: 'calc(50% - 260px)',
                  top: 0,
                }}
              >
                <LyricsPanel
                  showLyrics={showLyrics && appState === 'ready'}
                  lyrics={lyrics}
                  isLoadingLyrics={isLoadingLyrics}
                  isLyricsSynced={isLyricsSynced}
                  currentLyricIndex={currentLyricIndex}
                  seekToAbsoluteTime={seekToAbsoluteTime}
                  setShowLyrics={setShowLyrics}
                  theme={theme}
                  isSideBySide={true}
                  onOpenUploadModal={() => setIsLyricsModalOpen(true)}
                  hasCustomLyrics={loadCustomLyrics(songData.videoId, songData.title, songData.artist) !== null}
                  enableCustomLyrics={enableCustomLyrics}
                />
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <BottomBarControls
          showQueue={showQueue}
          setShowQueue={setShowQueue}
          focusSearchInQueue={focusSearchInQueue}
          setFocusSearchInQueue={setFocusSearchInQueue}
          accentColor={accentColor}
          queue={queue}
          isUserIdle={isUserIdle}
          zenMode={zenMode}
          showLyrics={showLyrics}
          isLargeScreen={isLargeScreen}
          showVolumeSlider={showVolumeSlider}
          volume={volume}
          onVolumeChange={handleVolumeChange}
          preMuteVolume={preMuteVolume}
          setPreMuteVolume={setPreMuteVolume}
        />
      </motion.div>

      <CustomLyricsModal
        isOpen={isLyricsModalOpen}
        onClose={() => setIsLyricsModalOpen(false)}
        song={songData}
        songDuration={duration}
        accentColor={accentColor}
        onLyricsSaved={handleLyricsReload}
      />
    </div>
  );
}
