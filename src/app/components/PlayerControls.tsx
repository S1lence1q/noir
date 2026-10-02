import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Play, Pause, SkipBack, SkipForward, Heart, ListPlus, Volume2, VolumeX, Volume1 } from 'lucide-react';
import * as Slider from '@radix-ui/react-slider';
import { SearchResult } from '../types';

interface PlayerControlsProps {
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
  isArtworkHovered: boolean;
  tourType: 'landing' | 'player' | null;
  currentStep: number | undefined;
  handleSliderChange: (value: number[]) => void;
  handlePreviousSong: () => void;
  handleNextSong: () => void;
  togglePlayPause: () => void;
  formatTime: (time: number) => string;
  favorites?: SearchResult[];
  onToggleFavorite?: (song: SearchResult) => void;
  onAddToPlaylist?: (playlistId: string) => void;
  onViewArtist?: (name: string, channelId?: string) => void;
  showVolumeSlider?: boolean;
  volume?: number;
  onVolumeChange?: (v: number) => void;
  preMuteVolume?: number;
  setPreMuteVolume?: (v: number) => void;
}

export const PlayerControls: React.FC<PlayerControlsProps> = ({
  songData,
  currentTime,
  duration,
  isPlaying,
  waveformData,
  isArtworkHovered,
  tourType,
  currentStep,
  handleSliderChange,
  handlePreviousSong,
  handleNextSong,
  togglePlayPause,
  formatTime,
  favorites = [],
  onToggleFavorite,
  onAddToPlaylist,
  onViewArtist,
  showVolumeSlider = false,
  volume,
  onVolumeChange,
  preMuteVolume,
  setPreMuteVolume
}) => {
  const [showPlaylistMenu, setShowPlaylistMenu] = useState(false);
  const [playlists, setPlaylists] = useState<any[]>([]);

  useEffect(() => {
    if (showPlaylistMenu) {
      try {
        const stored = localStorage.getItem('elva_playlists');
        if (stored) setPlaylists(JSON.parse(stored));
      } catch (e) {}
    }
  }, [showPlaylistMenu]);

  const [hoverTime, setHoverTime] = useState<number | null>(null);
  const [hoverX, setHoverX] = useState<number>(0);

  const handleSliderMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (duration <= 0) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const pct = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    setHoverTime(pct * duration);
    setHoverX(e.clientX - rect.left);
  };

  const handleSliderMouseLeave = () => {
    setHoverTime(null);
  };

  const isFavorite = favorites.some(fav => fav.id === (songData.videoId || songData.audioUrl));
  const controlsVisible =
    isArtworkHovered || !isPlaying || (tourType !== null && currentStep === 1) || showPlaylistMenu;
  const progressPct = duration > 0 ? Math.min(100, (currentTime / duration) * 100) : 0;

  return (
    <div 
      className={`absolute inset-0 bg-gradient-to-t from-black/70 via-black/30 to-black/20 transition-all duration-300 z-20 ${
        controlsVisible ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
      }`}
    >
      {/* Song info - top */}
      <div 
        className="absolute top-8 left-0 right-0 flex flex-col items-center text-center px-8 z-20"
        onPointerDown={(e) => e.stopPropagation()}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="w-full relative flex items-center justify-center min-h-[32px]">
          {/* Heart Button - Absolutely positioned on the left to keep title centered */}
          {onToggleFavorite && (
            <div className="absolute left-0 top-1/2 -translate-y-1/2">
              <button
                onPointerDown={(e) => {
                  e.stopPropagation();
                  e.currentTarget.blur();
                }}
                onKeyDown={(e) => {
                  if (e.key === ' ') {
                    e.preventDefault();
                  }
                }}
                onClick={(e) => {
                  e.stopPropagation();
                  onToggleFavorite({
                    id: songData.videoId || songData.audioUrl,
                    videoId: songData.videoId || '',
                    title: songData.title,
                    artist: songData.artist,
                    thumbnail: songData.artworkUrl,
                  });
                  e.currentTarget.blur();
                }}
                className="p-2.5 rounded-xl hover:bg-white/10 text-white/40 hover:text-white cursor-pointer shrink-0 transition-all duration-200 outline-none focus:outline-none focus:ring-0"
                aria-label={isFavorite ? 'Fjern fra favoritter' : 'Marker som favorit'}
                title={isFavorite ? "Fjern fra favoritter" : "Marker som favorit"}
              >
                <motion.div
                  key={isFavorite ? 'active-fav' : 'inactive-fav'}
                  initial={{ scale: 0.82, rotate: isFavorite ? -15 : 0 }}
                  animate={{ scale: 1, rotate: 0 }}
                  transition={{ type: 'spring', stiffness: 500, damping: 15 }}
                >
                  <Heart className={`w-[21px] h-[21px] ${isFavorite ? 'text-red-500 fill-red-500' : ''}`} />
                </motion.div>
              </button>
            </div>
          )}

          {/* Title - Absolutely Centered */}
          <h2 className="text-xl text-white/95 font-semibold tracking-tight truncate max-w-[70%] text-center" style={{ letterSpacing: '-0.01em' }}>
            {songData.title}
          </h2>

          {/* Add to Playlist button - Absolutely positioned on the right to keep title centered */}
          {onAddToPlaylist && (
            <div className="absolute right-0 top-1/2 -translate-y-1/2" onClick={(e) => e.stopPropagation()} onPointerDown={(e) => e.stopPropagation()}>
              <button
                onPointerDown={(e) => {
                  e.stopPropagation();
                  e.currentTarget.blur();
                }}
                onKeyDown={(e) => {
                  if (e.key === ' ') {
                    e.preventDefault();
                  }
                }}
                onClick={(e) => {
                  e.stopPropagation();
                  setShowPlaylistMenu(!showPlaylistMenu);
                  e.currentTarget.blur();
                }}
                className={`p-2.5 rounded-xl hover:bg-white/10 text-white/40 hover:text-white cursor-pointer transition-all hover:scale-105 active:scale-95 duration-200 outline-none focus:outline-none focus:ring-0 ${showPlaylistMenu ? 'bg-white/15 text-white' : ''}`}
                aria-label="Add to playlist"
                title="Add to playlist"
              >
                <ListPlus className="w-[21px] h-[21px]" />
              </button>

              {/* Glassmorphic Dropdown Menu */}
              <AnimatePresence>
                {showPlaylistMenu && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95, y: 10 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: 10 }}
                    transition={{ duration: 0.2 }}
                    className="absolute top-10 right-0 w-48 rounded-2xl border border-white/10 bg-black/80 backdrop-blur-2xl p-2.5 shadow-2xl text-left flex flex-col gap-1 z-[100]"
                  >
                    <span className="text-[9px] font-bold text-white/30 tracking-wider uppercase px-2 py-1 select-none">Select Playlist</span>
                    <div className="max-h-[140px] overflow-y-auto scrollbar-none flex flex-col gap-0.5">
                      {playlists.length > 0 ? (
                        playlists.map((pl) => (
                          <button
                            key={pl.id}
                            onClick={() => {
                              onAddToPlaylist(pl.id);
                              setShowPlaylistMenu(false);
                            }}
                            className="w-full text-left text-xs text-white/70 hover:text-white hover:bg-white/10 rounded-xl px-2.5 py-2 transition-all cursor-pointer truncate"
                          >
                            {pl.name}
                          </button>
                        ))
                      ) : (
                        <button
                          onClick={() => {
                            setShowPlaylistMenu(false);
                            sessionStorage.setItem('elva_hub_active_tab', 'playlists');
                            window.dispatchEvent(new CustomEvent('noir-scroll-to-hub'));
                          }}
                          className="w-full text-center text-xs font-semibold text-white/40 hover:text-white bg-white/[0.02] hover:bg-white/[0.08] border border-white/5 hover:border-white/10 rounded-xl px-2.5 py-3 transition-all duration-300 cursor-pointer select-none leading-relaxed flex flex-col items-center justify-center gap-1 active:scale-[0.98] mt-1"
                        >
                          <span className="text-[11px] font-bold text-white/85">No playlists created</span>
                          <span className="text-[10px] text-white/40 font-medium hover:text-white transition-colors duration-200">Create in My Hub</span>
                        </button>
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )}
        </div>
        <button
          onPointerDown={(e) => {
            e.stopPropagation();
            e.currentTarget.blur();
          }}
          onKeyDown={(e) => {
            if (e.key === ' ') {
              e.preventDefault();
            }
          }}
          onClick={(e) => {
            e.stopPropagation();
            if (onViewArtist) onViewArtist(songData.artist, songData.channelId);
            e.currentTarget.blur();
          }}
          className="text-sm text-white/55 hover:text-white/90 hover:underline hover:underline-offset-4 decoration-white/20 tracking-wide mt-1.5 transition-all cursor-pointer select-none active:scale-95 duration-200 outline-none focus:outline-none focus:ring-0"
          style={{ letterSpacing: '0.02em' }}
        >
          {songData.artist}
        </button>
      </div>

      {/* Controls container */}
      <div className="absolute inset-0 flex flex-col justify-end p-8 z-10">
        {/* Timeline section */}
        <div className="space-y-2 mb-6" onPointerDown={(e) => e.stopPropagation()} onClick={(e) => e.stopPropagation()}>
          <div className="relative w-full">
            <AnimatePresence>
              {hoverTime !== null && duration > 0 && (
                <motion.div
                  initial={{ opacity: 0, y: 6, scale: 0.92 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 6, scale: 0.92 }}
                  transition={{ duration: 0.12, ease: 'easeOut' }}
                  className="absolute bottom-10 px-2.5 py-1.5 rounded-xl border border-white/10 bg-black/85 backdrop-blur-2xl shadow-2xl text-[10px] font-semibold text-white/90 tabular-nums pointer-events-none -translate-x-1/2 z-30"
                  style={{ left: `${hoverX}px` }}
                >
                  {formatTime(hoverTime)}
                </motion.div>
              )}
            </AnimatePresence>

            <Slider.Root
              value={[currentTime]}
              max={duration}
              step={0.1}
              onValueChange={handleSliderChange}
              onMouseMove={handleSliderMouseMove}
              onMouseLeave={handleSliderMouseLeave}
              onKeyDown={(e) => {
                if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(e.key)) {
                  e.preventDefault();
                }
              }}
              className="relative flex items-center w-full h-12 cursor-pointer group/slider"
            >
              {/* Minimalistic waveform backdrop */}
              <div className="absolute inset-0 flex items-center gap-[2px] px-0.5">
                {waveformData.map((height, i) => {
                  const progress = (currentTime / duration) * 100;
                  const barProgress = (i / waveformData.length) * 100;
                  const isPlayed = barProgress <= progress;

                  return (
                    <div
                      key={i}
                      className="flex-1 rounded-full transition-all duration-150"
                      style={{
                        height: `${height * 16}px`,
                        backgroundColor: isPlayed ? 'rgba(255,255,255,0.5)' : 'rgba(255,255,255,0.15)',
                        opacity: 0.6,
                      }}
                    />
                  );
                })}
              </div>

              <Slider.Track className="relative h-[3px] w-full bg-transparent rounded-full overflow-hidden">
                <Slider.Range className="absolute h-full bg-transparent" />
              </Slider.Track>
              <Slider.Thumb
                className="block w-3 h-3 rounded-full bg-white opacity-0 group-hover/slider:opacity-100 transition-opacity duration-150 focus:outline-none focus:opacity-100"
              />
            </Slider.Root>
          </div>

          {/* Time display */}
          <div className="flex justify-between">
            <span className="text-xs text-white/70 tabular-nums font-medium">
              {formatTime(currentTime)}
            </span>
            <span className="text-xs text-white/70 tabular-nums font-medium">
              {formatTime(duration)}
            </span>
          </div>
        </div>

        {/* Playback controls - under timeline */}
        <div id="music-controls" className="flex items-center justify-center gap-4" onClick={(e) => e.stopPropagation()}>
          {/* Previous song */}
          <button
            onPointerDown={(e) => {
              e.stopPropagation();
              e.currentTarget.blur();
            }}
            onKeyDown={(e) => {
              if (e.key === ' ') {
                e.preventDefault();
              }
            }}
            onClick={(e) => {
              e.stopPropagation();
              handlePreviousSong();
              e.currentTarget.blur();
            }}
            className="p-3 rounded-full bg-white/5 hover:bg-white/10 active:scale-95 border border-white/10 hover:border-white/20 transition-all cursor-pointer group outline-none focus:outline-none focus:ring-0"
            aria-label="Previous song"
            title="Previous Song"
          >
            <SkipBack className="w-5 h-5 text-white/70 group-hover:text-white transition-colors" />
          </button>

          {/* Play/Pause button */}
          <button
            onPointerDown={(e) => {
              e.stopPropagation();
              e.currentTarget.blur();
            }}
            onKeyDown={(e) => {
              if (e.key === ' ') {
                e.preventDefault();
              }
            }}
            onClick={(e) => {
              e.stopPropagation();
              togglePlayPause();
              e.currentTarget.blur();
            }}
            className="relative group/button active:scale-95 transition-all cursor-pointer rounded-full outline-none focus:outline-none focus:ring-0"
            aria-label={isPlaying ? 'Pause' : 'Play'}
            title={isPlaying ? "Pause" : "Play"}
          >
            <div className="relative px-12 py-4 rounded-full bg-white/10 hover:bg-white/15 border border-white/20 shadow-[0_8px_32px_rgba(0,0,0,0.3)] overflow-hidden transition-all">
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover/button:translate-x-full transition-transform duration-1000" />
              <div className="relative flex items-center justify-center">
                {isPlaying ? (
                  <Pause className="w-6 h-6 text-white fill-white" />
                ) : (
                  <Play className="w-6 h-6 text-white fill-white ml-0.5" />
                )}
              </div>
              <AnimatePresence>
                {isPlaying && (
                  <motion.div
                    initial={{ scaleX: 0 }}
                    animate={{ scaleX: 1 }}
                    exit={{ scaleX: 0 }}
                    transition={{ duration: 0.3 }}
                    className="absolute bottom-0 left-0 right-0 h-[1px] bg-white/40 origin-left"
                  />
                )}
              </AnimatePresence>
            </div>
          </button>

          {/* Next song */}
          <button
            onPointerDown={(e) => {
              e.stopPropagation();
              e.currentTarget.blur();
            }}
            onKeyDown={(e) => {
              if (e.key === ' ') {
                e.preventDefault();
              }
            }}
            onClick={(e) => {
              e.stopPropagation();
              handleNextSong();
              e.currentTarget.blur();
            }}
            className="p-3 rounded-full bg-white/5 hover:bg-white/10 active:scale-95 border border-white/10 hover:border-white/20 transition-all cursor-pointer group outline-none focus:outline-none focus:ring-0"
            aria-label="Next song"
            title="Next Song"
          >
            <SkipForward className="w-5 h-5 text-white/70 group-hover:text-white transition-colors" />
          </button>
        </div>
      </div>
    </div>
  );
};
