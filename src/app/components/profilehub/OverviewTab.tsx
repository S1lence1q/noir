import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { History, Play, Music, ListMusic, Sparkles } from 'lucide-react';
import { SearchResult, VerifiedArtist } from '../../types';
import { AccentColor, ACCENT_THEMES } from '../themeUtils';
import { ElvaEmptyState } from '../ElvaEmptyState';
import { strings } from '../../constants/strings';
import { ArtistAvatar } from '../queue/ArtistAvatar';

interface Playlist {
  id: string;
  name: string;
  color: string;
  tracks: SearchResult[];
}

interface OverviewTabProps {
  recentlyPlayed: SearchResult[];
  onSelectSong: (song: SearchResult) => void;
  artistBubbles: { name: string; channelId?: string; thumbnail: string }[];
  onSelectArtist?: (artist: VerifiedArtist | null) => void;
  playlists: Playlist[];
  setActiveTab: (tab: 'overview' | 'favorites' | 'playlists') => void;
  setSelectedPlaylistId: (id: string | null) => void;
  handlePlayPlaylist: (playlist: Playlist) => void;
  accentColor: AccentColor;
}

export function OverviewTab({
  recentlyPlayed,
  onSelectSong,
  artistBubbles,
  onSelectArtist,
  playlists,
  setActiveTab,
  setSelectedPlaylistId,
  handlePlayPlaylist,
  accentColor
}: OverviewTabProps) {
  const theme = ACCENT_THEMES[accentColor];

  return (
    <motion.div
      key="overview"
      initial={{ opacity: 0, scale: 0.98 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.98 }}
      transition={{ duration: 0.3 }}
      className="flex flex-col gap-8"
    >
      {/* B. HORIZONTAL "VINYL FLIP" CAROUSEL (Recently Played) — PRIMARY card */}
      <div className="rounded-3xl elva-hub-card p-6 flex flex-col gap-5 w-full">
        <div className="flex items-center gap-2.5 select-none">
          <History className={`w-4 h-4 ${theme.text}`} />
          <h3 className="text-xs uppercase tracking-[0.25em] font-bold text-white/60">Recently Played</h3>
        </div>

        {recentlyPlayed.length > 0 ? (
          <div className="flex overflow-x-auto gap-5 pb-4 scrollbar-none snap-x snap-mandatory">
            {recentlyPlayed.map((song) => (
              <div
                key={song.id}
                onClick={() => onSelectSong(song)}
                className="group flex flex-col gap-2.5 w-40 shrink-0 snap-start select-none cursor-pointer"
                title={`Play ${song.title}`}
              >
                <div className="relative w-40 h-40 rounded-2xl overflow-hidden bg-white/[0.04]">
                  <img
                    src={song.thumbnail}
                    alt={song.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    onError={(e) => {
                      e.currentTarget.onerror = null;
                      e.currentTarget.src = `https://img.youtube.com/vi/${song.videoId}/mqdefault.jpg`;
                    }}
                  />
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center backdrop-blur-[1px]">
                    <div className="p-3.5 rounded-full bg-white/10 backdrop-blur-md border border-white/20 hover:scale-110 transition-transform shadow-lg">
                      <Play className="w-5 h-5 text-white fill-white ml-0.5" />
                    </div>
                  </div>
                </div>

                <div className="text-left w-full">
                  <h4 className="text-sm font-semibold text-white/90 truncate leading-tight" title={song.title}>
                    {song.title}
                  </h4>
                  <p className="text-[11px] text-white/40 truncate mt-0.5 font-medium">
                    {song.artist}
                  </p>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <ElvaEmptyState
            variant="inline"
            title={strings.empty.noRecentsTitle}
            description={strings.empty.noRecentsDesc}
          />
        )}
      </div>

      {/* C. Recently Played Artists Carousel — secondary card */}
      <div className="rounded-2xl elva-hub-card p-5 flex flex-col gap-4 w-full">
        <div className="flex items-center justify-between select-none">
          <h3 className="text-[10px] uppercase tracking-[0.25em] font-bold text-white/40">Recently Played Artists</h3>
        </div>

        {artistBubbles.length > 0 ? (
          <div className="flex flex-wrap items-center gap-5 justify-start">
            {artistBubbles.map((artist, idx) => (
              <button
                key={idx}
                onClick={() => {
                  if (onSelectArtist) {
                    onSelectArtist({
                      name: artist.name,
                      thumbnail: artist.thumbnail || '',
                      channelId: artist.channelId,
                      isTopic: true
                    });
                  }
                }}
                className="flex flex-col items-center gap-2 group cursor-pointer focus:outline-none"
                title={`Explore ${artist.name}`}
              >
                <div className="relative w-16 h-16 rounded-full overflow-hidden p-0.5 border border-white/10 hover:border-white/30 group-hover:scale-105 transition-all duration-300 shadow-md">
                  <ArtistAvatar name={artist.name} fallbackThumbnail={artist.thumbnail || ''} />
                </div>

                <span className="text-[10px] text-white/50 group-hover:text-white transition-colors font-semibold text-center truncate max-w-[80px] w-full">
                  {artist.name}
                </span>
              </button>
            ))}
          </div>
        ) : (
          <ElvaEmptyState
            variant="inline"
            title={strings.empty.noArtistsTitle}
            description={strings.empty.noArtistsDesc}
          />
        )}
      </div>

      {/* D. Bottom Showcase: Playlists Horizontal Strip — secondary card */}
      <div className="rounded-2xl elva-hub-card p-5 flex flex-col gap-4 w-full">
        <div className="flex items-center justify-between select-none">
          <h3 className="text-[10px] uppercase tracking-[0.25em] font-bold text-white/40">Custom Playlists</h3>
          <button
            onClick={() => setActiveTab('playlists')}
            className="text-[10px] uppercase tracking-wider text-white/40 hover:text-white font-bold transition-all"
          >
            View All
          </button>
        </div>

        {playlists.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            {playlists.slice(0, 3).map((playlist) => (
              <div
                key={playlist.id}
                onClick={() => {
                  setActiveTab('playlists');
                  setSelectedPlaylistId(playlist.id);
                }}
                className="group relative rounded-2xl elva-hub-row p-4.5 flex flex-col justify-between h-[120px] overflow-hidden transition-all duration-300 cursor-pointer active:scale-[0.98]"
              >
                <div className={`absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r ${playlist.color}`} />

                <div className="space-y-0.5 relative z-10 text-left">
                  <h4 className="text-sm font-semibold text-white/95 truncate leading-tight">{playlist.name}</h4>
                  <p className="text-[9px] font-light text-white/40 tracking-wider uppercase">
                    {playlist.tracks.length} songs
                  </p>
                </div>

                <div className="flex justify-end items-center relative z-10">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handlePlayPlaylist(playlist);
                    }}
                    className="p-2 rounded-full bg-white/10 hover:bg-white text-white hover:text-black border border-white/5 hover:scale-105 transition-all cursor-pointer"
                    title="Play playlist"
                  >
                    <Play className="w-3.5 h-3.5 fill-current ml-0.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <ElvaEmptyState
            variant="inline"
            title={strings.empty.noPlaylistsOverviewTitle}
            description={strings.empty.noPlaylistsOverviewDesc}
            action={{
              label: strings.empty.goToPlaylists,
              onClick: () => setActiveTab('playlists'),
            }}
          />
        )}
      </div>
    </motion.div>
  );
}
