import React from 'react';
import { motion } from 'motion/react';
import { ArrowLeft, Play, Plus, Music, Heart, Loader2 } from 'lucide-react';
import { SearchResult } from '../types';
import { AccentColor, ACCENT_THEMES } from './themeUtils';
import { SongRowOptions } from './SongRowOptions';
import type { ColorWorld } from '../utils/ditherCover';

const ACCENT_BG: Record<AccentColor, string> = {
  emerald: 'bg-emerald-400',
  sand: 'bg-amber-400',
  wine: 'bg-rose-400',
  navy: 'bg-slate-400'
};

export interface Playlist {
  id: string;
  name: string;
  description: string;
  tracks: SearchResult[];
  thumbnail: string;
  accent: AccentColor;
  /** Optional dither world (mixes). Falls back to hash of id. */
  coverWorld?: ColorWorld;
  /** Albums / releases: what kind of release this is, for the page kicker. */
  recordType?: 'album' | 'single' | 'ep' | 'compile';
}

interface PlaylistDetailsViewProps {
  playlist: Playlist;
  onClose: () => void;
  loadingSongId: string | null;
  handleSelectSong: (track: SearchResult) => void;
  handleAddToQueue: (track: SearchResult) => void;
  onPlayPlaylist: (tracks: SearchResult[], label?: string) => void;
  favorites: SearchResult[];
  onToggleFavorite: (track: SearchResult) => void;
  onPlayNext?: (track: SearchResult) => void;
  accentColor: AccentColor;
}

export const PlaylistDetailsView: React.FC<PlaylistDetailsViewProps> = ({
  playlist,
  onClose,
  loadingSongId,
  handleSelectSong,
  handleAddToQueue,
  onPlayPlaylist,
  favorites,
  onToggleFavorite,
  onPlayNext,
  accentColor
}) => {
  // Use the playlist's custom theme to create beautiful bespoke experience
  const theme = ACCENT_THEMES[playlist.accent] || ACCENT_THEMES[accentColor];

  const handlePlayAll = () => {
    if (playlist.tracks.length === 0) return;
    onPlayPlaylist(playlist.tracks, playlist.name);
  };

  const isFavorite = (songId: string) => {
    return favorites.some(fav => fav.id === songId);
  };

  return (
    <motion.div
      key="immersive-playlist-view"
      initial={{ opacity: 0, scale: 0.95, y: 24, filter: 'blur(8px)' }}
      animate={{ opacity: 1, scale: 1, y: 0, filter: 'blur(0px)' }}
      exit={{ opacity: 0, scale: 0.95, y: 24, filter: 'blur(8px)' }}
      transition={{ duration: 0.55, ease: [0.16, 1, 0.3, 1] }}
      className="w-full flex flex-col flex-1 min-h-0 overflow-y-auto scrollbar-none z-10 px-4 sm:px-8 md:px-12"
    >
      {/* Navigation bar above the layout */}
      <div className="flex items-center justify-between w-full pb-3 shrink-0 px-2 select-none">
        <button
          onClick={onClose}
          className="flex items-center gap-1.5 text-white/50 hover:text-white transition-all cursor-pointer group/back text-xs font-semibold py-1 px-3 rounded-full hover:bg-white/5 -ml-3"
          title="Back to Discover"
        >
          <ArrowLeft className="w-3.5 h-3.5 group-hover/back:-translate-x-0.5 transition-transform" />
          <span>Back to Discover</span>
        </button>
        <div 
          className="text-lg tracking-[0.2em] uppercase font-light text-white select-none cursor-pointer hover:opacity-85 transition-opacity -mr-2"
          style={{ fontFamily: '"Kaobe", serif' }}
          onClick={onClose}
        >
          Elva
        </div>
      </div>

      {/* Immersive Widescreen Playlist Hero Banner */}
      <div className="relative w-full rounded-3xl overflow-hidden bg-white/[0.04] py-5 px-6 md:py-6 md:px-8 flex flex-col md:flex-row items-center gap-6 md:gap-8 shrink-0 mt-4">
        {/* Ambient dynamic theme glow behind/inside the banner */}
        <div 
          className="absolute top-0 right-0 w-80 h-80 rounded-full blur-[90px] opacity-25 pointer-events-none"
          style={{
            background: `radial-gradient(circle, ${playlist.accent === 'wine' ? 'rgba(244, 63, 94, 0.3)' : 'rgba(56, 189, 248, 0.25)'} 0%, rgba(255,255,255,0) 70%)`
          }}
        />
        
        {/* Giant square cover art */}
        <div className="relative w-36 h-36 md:w-44 md:h-44 rounded-2xl overflow-hidden transition-transform duration-500 hover:scale-105 shrink-0 z-10 bg-neutral-955 flex items-center justify-center">
          {playlist.id === 'dk_hits' || playlist.id === 'global_hits' ? (
            <div className="w-full h-full relative flex items-center justify-center">
              {/* Background graphic */}
              <img src={playlist.thumbnail} alt="" className="w-full h-full object-cover" />
              
              {/* Sleek, solid, high-contrast, extremely readable text banner at the bottom */}
              <div className={`absolute bottom-0 left-0 right-0 py-3 md:py-3.5 text-center z-20 ${
                playlist.id === 'dk_hits' 
                  ? 'bg-[#881337] text-rose-100 border-t border-rose-950' 
                  : 'bg-[#1e1b4b] text-indigo-100 border-t border-indigo-950'
              }`}>
                <span className="text-xs md:text-sm font-black uppercase tracking-[0.2em] leading-none select-none block">
                  {playlist.id === 'dk_hits' 
                    ? `TOP HITS ${playlist.name.replace('Top Hits: ', '').toUpperCase()}` 
                    : 'TOP HITS GLOBAL'}
                </span>
              </div>

              {/* Dynamic Album Art Overlay (The #1 song's thumbnail in the center-top!) */}
              {playlist.tracks && playlist.tracks.length > 0 && (
                <div className="absolute w-[54%] h-[54%] rounded-xl overflow-hidden z-10 bg-neutral-955 transition-transform duration-500 hover:scale-105 hover:rotate-[2deg] -translate-y-4">
                  <img 
                    src={playlist.tracks[0].thumbnail} 
                    alt="" 
                    className="w-full h-full object-cover"
                  />
                </div>
              )}
            </div>
          ) : (
            <img src={playlist.thumbnail} alt={playlist.name} className="w-full h-full object-cover scale-105" />
          )}
        </div>
        
        {/* Hero Info Text */}
        <div className="flex flex-col text-center md:text-left relative z-10 flex-1 min-w-0">
          <div className="flex items-center justify-center md:justify-start gap-2">
            <span className={`flex items-center gap-1 text-[9px] font-bold ${theme.text} bg-white/[0.02] border ${theme.border} px-2.5 py-0.5 rounded-md uppercase tracking-wider`}>
              ✦ Live Chart
            </span>
          </div>
          
          <h2 
            className="text-4xl md:text-5xl lg:text-6xl font-normal text-white mt-3 md:mt-4 tracking-wide leading-tight"
            style={{ fontFamily: '"Kaobe", serif' }}
          >
            {playlist.name}
          </h2>
          
          <p className="text-xs text-white/50 mt-2.5 font-light leading-relaxed max-w-xl">
            {playlist.description}
          </p>

          {/* Quick Actions */}
          <div className="flex items-center justify-center md:justify-start gap-4 mt-5 select-none">
            <button
              onClick={handlePlayAll}
              className={`flex items-center gap-1.5 px-5 py-2.5 rounded-xl text-xs font-bold transition-all hover:scale-[1.03] active:scale-[0.98] cursor-pointer text-black ${
                playlist.accent === 'wine' ? 'bg-rose-400 hover:bg-rose-350' : 'bg-slate-300 hover:bg-white'
              }`}
            >
              <Play className="w-3.5 h-3.5 fill-current" />
              Play All
            </button>
            <span className="text-[10px] font-semibold text-white/30 uppercase tracking-widest bg-white/5 border border-white/5 px-2.5 py-1.5 rounded-md shrink-0">
              {playlist.tracks.length} tracks
            </span>
          </div>
        </div>
      </div>

      {/* Playlist Tracklist Table */}
      <div className="flex flex-col gap-6 mt-6 pb-24 w-full max-w-4xl mx-auto">
        <div className="w-full flex flex-col relative">
          <div className="flex items-center justify-between pb-3 shrink-0 z-10 relative">
            <span className="elva-section-label">Tracks in Chart</span>
            <span className="elva-label-xs text-white/30 font-medium bg-white/[0.05] px-2.5 py-0.5 rounded-md normal-case tracking-wider">
              Updated Daily
            </span>
          </div>
          
          <div className="w-full space-y-2 mt-4 z-10 relative">
            {playlist.tracks.length === 0 ? (
              <div className="py-16 text-center text-white/30">
                <Music className="w-10 h-10 text-white/10 mx-auto mb-3" />
                <p className="text-xs font-semibold uppercase tracking-wider text-white/40">No songs found in feed</p>
                <p className="text-[10px] text-white/20 mt-1">Please try again in a moment.</p>
              </div>
            ) : (
              <div className="space-y-1.5 flex flex-col bg-transparent">
                {playlist.tracks.map((track, index) => {
                  const trackNumber = String(index + 1).padStart(2, '0');
                  const isLoading = loadingSongId === track.id;
                  return (
                    <motion.div
                      key={`playlist-track-${track.id}`}
                      initial={{ opacity: 0, y: 5 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.02, ease: "easeOut" }}
                      className={`group relative w-full flex items-center gap-4 py-3.5 px-4 rounded-2xl border-0 transition-colors duration-300 cursor-pointer ${
                        isLoading ? 'bg-white/[0.05]' : 'bg-transparent hover:bg-white/[0.03]'
                      }`}
                      onClick={() => {
                        if (!loadingSongId) handleSelectSong(track);
                      }}
                    >
                      {/* Left accent indicator for current loading/active item */}
                      {isLoading && (
                        <div className={`absolute left-0 top-3.5 bottom-3.5 w-[3px] rounded-r-md ${ACCENT_BG[playlist.accent] || ACCENT_BG[accentColor] || 'bg-white/50'}`} />
                      )}

                      {/* Song Number */}
                      <span className="text-xs font-mono text-white/35 group-hover:text-white/60 transition-colors shrink-0 w-6 text-right">
                        {trackNumber}
                      </span>

                      {/* Song Thumbnail */}
                      <div className="relative w-13 h-13 rounded-xl overflow-hidden flex-shrink-0 bg-neutral-900">
                        <img 
                          src={track.thumbnail} 
                          alt={track.title} 
                          className="w-full h-full object-cover" 
                        />
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                          {isLoading ? (
                            <motion.div
                              animate={{ rotate: 360 }}
                              transition={{ duration: 1.2, repeat: Infinity, ease: "linear" }}
                              className={`w-4 h-4 rounded-full border border-white/20 ${theme.borderT}`}
                            />
                          ) : (
                            <Play className="w-5 h-5 text-white fill-white scale-90" />
                          )}
                        </div>
                      </div>

                      {/* Title & Artist */}
                      <div className="flex-1 min-w-0 text-left">
                        <span className="text-[15px] font-semibold text-white/95 group-hover:text-white transition-colors truncate block">
                          {track.title}
                        </span>
                        <span className="text-[13px] text-white/60 truncate block mt-1">
                          {track.artist}
                        </span>
                      </div>

                      {/* Favorite & Queue controls */}
                      <div className="flex items-center gap-2 opacity-60 group-hover:opacity-100 transition-opacity shrink-0 select-none">
                        <SongRowOptions
                          track={track}
                          onPlayNext={onPlayNext}
                          onAddToQueue={handleAddToQueue}
                        />
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onToggleFavorite(track);
                          }}
                          className="p-2.5 rounded-xl hover:bg-white/5 text-white/60 hover:text-white transition-all cursor-pointer"
                          title={isFavorite(track.id) ? "Remove from Favorites" : "Add to Favorites"}
                        >
                          <Heart className={`w-4 h-4 ${isFavorite(track.id) ? 'text-red-500 fill-red-500' : ''}`} />
                        </button>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
};
