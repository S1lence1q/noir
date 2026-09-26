import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { motion, useMotionValue, useSpring, useTransform } from 'motion/react';
import { PlayerControls } from '../PlayerControls';
import { LyricsPanel } from '../LyricsPanel';
import { AccentColor, ACCENT_THEMES } from '../themeUtils';
import { loadCustomLyrics } from '../../utils/lyricsUtils';


interface ArtworkCardProps {
  songData: {
    title: string;
    artist: string;
    artworkUrl: string;
    audioUrl: string;
    videoId?: string;
    channelId?: string;
  };
  currentTime: number;
  duration: number;
  isPlaying: boolean;
  waveformData: number[];
  tourType?: 'landing' | 'player' | null;
  currentStep?: number;
  handleSliderChange: (value: number[]) => void;
  handlePreviousSong: () => void;
  handleNextSong: () => void;
  togglePlayPause: () => void;
  formatTime: (time: number) => string;
  favorites?: any[];
  onToggleFavorite?: (song: any) => void;
  handleAddToPlaylist: (playlistId: string) => void;
  onViewArtist?: (name: string, channelId?: string) => void;
  showLyrics: boolean;
  setShowLyrics: (show: boolean) => void;
  lyrics: any;
  isLoadingLyrics: boolean;
  isLyricsSynced: boolean;
  currentLyricIndex: number;
  seekToAbsoluteTime: (time: number) => void;
  setIsLyricsModalOpen: (open: boolean) => void;
  enableCustomLyrics: boolean;
  enable3DTilt: boolean;
  isLargeScreen: boolean;
  appState: string;
  accentColor: AccentColor;
  showVolumeSlider?: boolean;
  volume?: number;
  onVolumeChange?: (v: number) => void;
  preMuteVolume?: number;
  setPreMuteVolume?: (v: number) => void;
  peekProgressStyle?: 'none' | 'line' | 'border';
  zenMode?: boolean;
  isUserIdle?: boolean;
}



export function ArtworkCard({
  songData,
  currentTime,
  duration,
  isPlaying,
  waveformData,
  tourType,
  currentStep,
  handleSliderChange,
  handlePreviousSong,
  handleNextSong,
  togglePlayPause,
  formatTime,
  favorites = [],
  onToggleFavorite,
  handleAddToPlaylist,
  onViewArtist,
  showLyrics,
  setShowLyrics,
  lyrics,
  isLoadingLyrics,
  isLyricsSynced,
  currentLyricIndex,
  seekToAbsoluteTime,
  setIsLyricsModalOpen,
  enableCustomLyrics,
  enable3DTilt,
  isLargeScreen,
  appState,
  accentColor,
  showVolumeSlider,
  volume,
  onVolumeChange,
  preMuteVolume,
  setPreMuteVolume,
  peekProgressStyle = 'border',
  zenMode = false,
  isUserIdle = false
}: ArtworkCardProps) {
  const theme = ACCENT_THEMES[accentColor];

  // Image loading/transition states
  const [isLoaded, setIsLoaded] = useState(false);
  const [isLoadingNewSong, setIsLoadingNewSong] = useState(false);
  const [previousArtwork, setPreviousArtwork] = useState<string | null>(null);
  const [showPreviousArtwork, setShowPreviousArtwork] = useState(false);
  const [overrideArtworkUrl, setOverrideArtworkUrl] = useState<string | null>(null);
  const isSpinningRef = useRef(false);
  const loadTimeoutRef = useRef<any>(null);
  const hidePrevTimeoutRef = useRef<any>(null);

  const activeArtwork = overrideArtworkUrl || songData.artworkUrl;
  const [currentArtwork, setCurrentArtwork] = useState(activeArtwork);

  useEffect(() => {
    const handleArtworkSpin = (e: Event) => {
      const customEvent = e as CustomEvent<{ queue: any[] }>;
      const queueItems = customEvent.detail.queue;
      if (!queueItems || queueItems.length <= 1) return;

      const artworks = queueItems
        .map((item) => item.thumbnail)
        .filter((url): url is string => !!url && !url.includes('default_cover'));
      
      if (artworks.length <= 1) return;

      isSpinningRef.current = true;
      let step = 0;
      const totalSteps = 10;
      const intervalTime = 160; // 160ms gives enough time for a beautiful blur-fade blend!

      const interval = setInterval(() => {
        if (step >= totalSteps) {
          clearInterval(interval);
          setOverrideArtworkUrl(null);
          isSpinningRef.current = false;
        } else {
          const nextUrl = artworks[step % artworks.length];
          setOverrideArtworkUrl(nextUrl);
          step++;
        }
      }, intervalTime);

      return () => {
        clearInterval(interval);
        setOverrideArtworkUrl(null);
        isSpinningRef.current = false;
      };
    };

    window.addEventListener('elva-artwork-spin', handleArtworkSpin);
    return () => window.removeEventListener('elva-artwork-spin', handleArtworkSpin);
  }, []);

  if (activeArtwork !== currentArtwork) {
    if (currentArtwork && currentArtwork !== activeArtwork) {
      setPreviousArtwork(currentArtwork);
      setShowPreviousArtwork(true);
    }
    setIsLoaded(false);
    setIsLoadingNewSong(true);
    setCurrentArtwork(activeArtwork);
  }

  useEffect(() => {
    // Clear any pending timeouts to prevent race conditions during rapid skipping
    if (loadTimeoutRef.current) clearTimeout(loadTimeoutRef.current);
    if (hidePrevTimeoutRef.current) clearTimeout(hidePrevTimeoutRef.current);

    const img = new Image();
    img.crossOrigin = 'anonymous';

    if (activeArtwork && (activeArtwork.includes('ytimg.com') || activeArtwork.includes('youtube.com') || activeArtwork.startsWith('http'))) {
      img.src = `https://images.weserv.nl/?url=${encodeURIComponent(activeArtwork)}`;
    } else {
      img.src = activeArtwork;
    }

    img.onload = () => {
      loadTimeoutRef.current = setTimeout(() => {
        setIsLoadingNewSong(false);
        setIsLoaded(true);
        hidePrevTimeoutRef.current = setTimeout(() => {
          setShowPreviousArtwork(false);
        }, 800);
      }, 50);
    };

    img.onerror = () => {
      if (img.src.includes('maxresdefault.jpg')) {
        const fallbackUrl = activeArtwork.replace('maxresdefault.jpg', 'hqdefault.jpg');
        if (fallbackUrl && (fallbackUrl.includes('ytimg.com') || fallbackUrl.includes('youtube.com') || fallbackUrl.startsWith('http'))) {
          img.src = `https://images.weserv.nl/?url=${encodeURIComponent(fallbackUrl)}`;
        } else {
          img.src = fallbackUrl;
        }
        return;
      }
      loadTimeoutRef.current = setTimeout(() => {
        setIsLoaded(true);
        setIsLoadingNewSong(false);
      }, 400);
    };

    return () => {
      if (loadTimeoutRef.current) clearTimeout(loadTimeoutRef.current);
      if (hidePrevTimeoutRef.current) clearTimeout(hidePrevTimeoutRef.current);
    };
  }, [activeArtwork, songData.title, songData.artist]);

  // 3D Tilt states & handlers
  const [isArtworkHovered, setIsArtworkHovered] = useState(false);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const artworkRef = useRef<HTMLDivElement>(null);
  const stableCenterRef = useRef({ x: 0, y: 0 });
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);

  const rotateX = useSpring(useTransform(mouseY, [-300, 300], [2, -2]), { stiffness: 150, damping: 20 });
  const rotateY = useSpring(useTransform(mouseX, [-300, 300], [-2, 2]), { stiffness: 150, damping: 20 });

  const handleMouseEnter = () => {
    if (isTransitioning) return;
    setIsArtworkHovered(true);
    if (!artworkRef.current) return;
    const rect = artworkRef.current.getBoundingClientRect();
    stableCenterRef.current = {
      x: rect.left + rect.width / 2,
      y: rect.top + rect.height / 2
    };
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (isTransitioning) return;
    if (!stableCenterRef.current.x) {
      handleMouseEnter();
    }
    mouseX.set(e.clientX - stableCenterRef.current.x);
    mouseY.set(e.clientY - stableCenterRef.current.y);
  };

  const handleMouseLeave = (e: React.MouseEvent) => {
    if (artworkRef.current && typeof e?.clientX === 'number' && typeof e?.clientY === 'number') {
      const rect = artworkRef.current.getBoundingClientRect();
      const x = e.clientX;
      const y = e.clientY;
      
      if (
        x >= rect.left && 
        x <= rect.right && 
        y >= rect.top && 
        y <= rect.bottom
      ) {
        return;
      }
    }

    setIsArtworkHovered(false);
    mouseX.set(0);
    mouseY.set(0);
    stableCenterRef.current = { x: 0, y: 0 };
  };

  // Reset hover state when lyrics are toggled/slid away to prevent stuck hover states
  useEffect(() => {
    setIsTransitioning(true);
    setIsArtworkHovered(false);
    mouseX.set(0);
    mouseY.set(0);
    stableCenterRef.current = { x: 0, y: 0 };

    const timer = setTimeout(() => {
      setIsTransitioning(false);
    }, 800);

    return () => clearTimeout(timer);
  }, [showLyrics]);

  // Track volume changes to briefly show player controls
  const [volumeChangedVisible, setVolumeChangedVisible] = useState(false);
  const lastVolumeRef = useRef(volume);

  useEffect(() => {
    if (volume !== undefined && lastVolumeRef.current !== undefined && volume !== lastVolumeRef.current) {
      setVolumeChangedVisible(true);
      const timer = setTimeout(() => setVolumeChangedVisible(false), 2000);
      lastVolumeRef.current = volume;
      return () => clearTimeout(timer);
    }
    lastVolumeRef.current = volume;
  }, [volume]);

  const isControlsVisible = isArtworkHovered || volumeChangedVisible || !isPlaying || (tourType !== null && currentStep === 1);

  const progressPct = duration > 0 ? Math.min(100, (currentTime / duration) * 100) : 0;


  return (
    <motion.div 
      animate={{
        x: showLyrics && isLargeScreen ? -284 : 0,
      }}
      transition={{ type: 'spring', stiffness: 180, damping: 25 }}
      className="flex flex-col items-center w-[520px] shrink-0 group/artwork"
      style={{
        position: isLargeScreen ? 'absolute' : 'relative',
        left: isLargeScreen ? 'calc(50% - 260px)' : 'auto',
        top: isLargeScreen ? 0 : 'auto',
        width: 520,
        height: 520,
        pointerEvents: appState === 'ready' ? 'auto' : 'none',
        visibility: appState === 'ready' ? 'visible' : 'hidden',
      }}
    >
      <div
        id="artwork-card"
        ref={artworkRef}
        className="relative cursor-pointer w-[520px] h-[520px]"
        style={{ 
          perspective: 1200,
          pointerEvents: appState === 'ready' ? (isTransitioning ? 'none' : 'auto') : 'none'
        }}
      >
        <motion.div
          className="w-full h-full relative"
          animate={{ rotateY: showLyrics && !isLargeScreen ? 180 : 0 }}
          transition={{ rotateY: { duration: 1.4, ease: [0.16, 1, 0.3, 1] } }}
          style={{ transformStyle: 'preserve-3d' }}
        >
          <motion.div
            onMouseEnter={handleMouseEnter}
            onMouseMove={handleMouseMove}
            onMouseLeave={handleMouseLeave}
            initial={{ opacity: 0, y: 10 }}
            animate={{
              opacity: 1,
              y: [0, -4, 0],
              scale: 1,
            }}
            className="w-full h-full relative"
            style={{
              rotateX: enable3DTilt && !showLyrics ? rotateX : 0,
              rotateY: enable3DTilt && !showLyrics ? rotateY : 0,
              transformStyle: 'preserve-3d',
              willChange: 'transform',
            }}
            transition={{
              opacity: { duration: 0.4 },
              y: { duration: 8, repeat: Infinity, ease: "easeInOut", delay: 0.3 },
              scale: { type: "spring", stiffness: 140, damping: 22 }
            }}
          >
            {/* FRONT FACE */}
            <div 
              className={`absolute inset-0 w-full h-full ${showLyrics && !isLargeScreen ? 'pointer-events-none' : ''}`} 
              style={{ 
                backfaceVisibility: 'hidden',
                visibility: appState === 'ready' ? (showLyrics && !isLargeScreen ? 'hidden' : 'visible') : 'hidden'
              }}
            >
              <div
                className="absolute inset-0 rounded-3xl bg-white/[0.02] shadow-[0_20px_60px_rgba(0,0,0,0.5)]"
                style={{
                  transform: 'translateY(32px) scale(0.96)',
                  backfaceVisibility: 'hidden'
                }}
              />
              <div
                className="absolute inset-0 rounded-3xl bg-white/[0.03] shadow-[0_20px_60px_rgba(0,0,0,0.5)]"
                style={{
                  transform: 'translateY(16px) scale(0.98)',
                  backfaceVisibility: 'hidden'
                }}
              />

              {/* Ambient glow layers */}
              <div
                className="absolute -inset-16 rounded-full pointer-events-none transition-opacity duration-1000"
                style={{
                  opacity: isLoaded ? 0.25 : 0,
                  background: 'radial-gradient(circle, var(--theme-primary) 0%, transparent 70%)',
                  filter: 'blur(45px)',
                }}
              />
              <div
                className="absolute -inset-12 rounded-full pointer-events-none transition-opacity duration-1000"
                style={{
                  opacity: isLoaded ? 0.2 : 0,
                  background: 'radial-gradient(circle, var(--theme-secondary) 0%, transparent 70%)',
                  filter: 'blur(35px)',
                }}
              />
              <div
                className="absolute -inset-8 rounded-3xl pointer-events-none transition-opacity duration-1000"
                style={{
                  opacity: 0.3,
                  background: 'radial-gradient(circle, var(--theme-accent) 0%, transparent 70%)',
                  filter: 'blur(30px)',
                }}
              />
              <div className="absolute -inset-1 rounded-3xl bg-gradient-to-br from-white/10 via-transparent to-white/5 opacity-60 pointer-events-none" />

              {/* Album artwork card */}
              <div
                className="relative rounded-3xl overflow-hidden transition-all duration-500 w-full h-full cursor-pointer bg-neutral-950"
                style={{
                  boxShadow: isPlaying 
                    ? '0 30px 60px rgba(0,0,0,0.75), 0 10px 30px var(--theme-primary-fade), 0 5px 15px var(--theme-secondary-fade)'
                    : '0 15px 35px rgba(0,0,0,0.5), 0 5px 15px var(--theme-primary-fade)',
                  isolation: 'isolate',
                }}
                onPointerDown={(e) => {
                  if (appState !== 'ready') return;
                  const target = e.target as HTMLElement;
                  if (
                    target.closest('button') || 
                    target.closest('input') || 
                    target.closest('[role="slider"]') || 
                    target.closest('.group\\/slider')
                  ) {
                    return;
                  }
                  if (e.button === 0) {
                    togglePlayPause();
                  }
                }}
                onClick={(e) => {
                  if (appState !== 'ready') return;
                  const target = e.target as HTMLElement;
                  if (
                    target.closest('button') || 
                    target.closest('input') || 
                    target.closest('[role="slider"]') || 
                    target.closest('.group\\/slider')
                  ) {
                    return;
                  }
                  togglePlayPause();
                }}
              >
                {/* Background Image (Previous Artwork) */}
                {previousArtwork && (
                  <img
                    key={previousArtwork}
                    src={previousArtwork}
                    alt="Previous album artwork"
                    className={`absolute inset-0 w-full h-full object-cover pointer-events-none ${songData.videoId ? 'scale-[1.35]' : ''}`}
                    style={{
                      opacity: showPreviousArtwork ? 1 : 0,
                      zIndex: 1,
                      transition: showPreviousArtwork ? 'none' : 'opacity 0.5s ease-out',
                    }}
                  />
                )}

                {/* Foreground Image (Current Artwork) */}
                <motion.img
                  src={activeArtwork}
                  alt="Album artwork"
                  onError={(e) => {
                    e.currentTarget.onerror = null;
                    const src = e.currentTarget.src;
                    if (src.includes('maxresdefault.jpg')) {
                      e.currentTarget.src = src.replace('maxresdefault.jpg', 'mqdefault.jpg');
                    } else if (songData.videoId) {
                      e.currentTarget.src = `https://img.youtube.com/vi/${songData.videoId}/mqdefault.jpg`;
                    }
                  }}
                  className={`absolute inset-0 w-full h-full object-cover z-10 pointer-events-none ${songData.videoId ? 'scale-[1.35]' : ''}`}
                  animate={{
                    opacity: isLoaded ? (isPlaying ? 1 : 0.8) : 0,
                    filter: isLoaded ? 'blur(0px)' : 'blur(16px)',
                  }}
                  transition={
                    !isLoaded
                      ? { duration: 0 }
                      : (isSpinningRef.current
                          ? {
                              opacity: { duration: 0.16, ease: 'easeOut' },
                              filter: { duration: 0.2, ease: 'easeOut' }
                            }
                          : {
                              opacity: { duration: 0.85, ease: 'easeOut' },
                              filter: { duration: 0.95, ease: 'easeOut' }
                            })
                  }
                />

                <div className="absolute inset-0 bg-gradient-to-t from-black/20 via-transparent to-white/5 pointer-events-none" />

                <PlayerControls
                  songData={songData}
                  currentTime={currentTime}
                  duration={duration}
                  isPlaying={isPlaying}
                  waveformData={waveformData}
                  isArtworkHovered={isArtworkHovered}
                  tourType={tourType}
                  currentStep={currentStep}
                  handleSliderChange={handleSliderChange}
                  handlePreviousSong={handlePreviousSong}
                  handleNextSong={handleNextSong}
                  togglePlayPause={togglePlayPause}
                  formatTime={formatTime}
                  favorites={favorites}
                  onToggleFavorite={onToggleFavorite}
                  onAddToPlaylist={handleAddToPlaylist}
                  onViewArtist={onViewArtist}
                  showVolumeSlider={showVolumeSlider}
                  volume={volume}
                  onVolumeChange={onVolumeChange}
                  preMuteVolume={preMuteVolume}
                  setPreMuteVolume={setPreMuteVolume}
                />

                {/* Classic line progress bar inside the card so it follows the rounded corners and is clipped */}
                {isPlaying && !isControlsVisible && peekProgressStyle === 'line' && (
                  <div className="absolute bottom-0 left-0 right-0 z-[19] pointer-events-none" aria-hidden>
                    <div className="h-[2.5px] w-full bg-white/[0.04]">
                      <div
                        className="h-full bg-white/40 transition-[width] duration-[250ms] ease-linear"
                        style={{ width: `${progressPct}%` }}
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>

            {!isLargeScreen && (
              <LyricsPanel
                showLyrics={showLyrics && appState === 'ready'}
                lyrics={lyrics}
                isLoadingLyrics={isLoadingLyrics}
                isLyricsSynced={isLyricsSynced}
                currentLyricIndex={currentLyricIndex}
                seekToAbsoluteTime={seekToAbsoluteTime}
                setShowLyrics={setShowLyrics}
                theme={theme}
                onOpenUploadModal={() => setIsLyricsModalOpen(true)}
                hasCustomLyrics={loadCustomLyrics(songData.videoId, songData.title, songData.artist) !== null}
                enableCustomLyrics={enableCustomLyrics}
              />
            )}
          </motion.div>
        </motion.div>
      </div>

      {isPlaying && !isControlsVisible && peekProgressStyle === 'border' && (() => {
        const target = document.getElementById('elva-player-root');
        if (!target) return null;
        return createPortal(
          <div className="absolute top-0 left-0 right-0 h-[2.5px] z-[100] pointer-events-none bg-white/[0.04]" aria-hidden>
            <div 
              className="h-full transition-[width] duration-[250ms] ease-linear"
              style={{ 
                width: `${progressPct}%`,
                background: 'linear-gradient(to right, var(--theme-primary), var(--theme-accent), var(--theme-secondary))'
              }}
            />
          </div>,
          target
        );
      })()}
    </motion.div>
  );
}

