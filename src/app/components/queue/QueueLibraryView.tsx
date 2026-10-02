import { Music, ListMusic, User, Heart, ChevronRight } from 'lucide-react';
import type { Playlist, SearchResult } from './types';
import { ArtistAvatar } from './ArtistAvatar';
import { QueueSongRow } from './QueueSongRow';
import { CAROUSEL_END_SPACER_CLASS, CAROUSEL_MASK_STYLE } from './carouselStyles';
import { NoirEmptyState } from '../NoirEmptyState';
import { strings } from '../../constants/strings';

interface QueueLibraryViewProps {
  localPlaylists: Playlist[];
  localFavorites: SearchResult[];
  artistBubbles: { name: string; channelId?: string; thumbnail: string }[];
  onSelectPlaylist: (playlist: Playlist) => void;
  onOpenArtist: (artist: { name: string; channelId?: string; thumbnail: string }) => void;
  onPlaySong: (song: SearchResult) => void;
  onAddToQueue?: (e: React.MouseEvent, song: SearchResult) => void;
  onPlayNext?: (song: SearchResult) => void;
  onToggleFavorite?: (song: SearchResult) => void;
}

export function QueueLibraryView({
  localPlaylists,
  localFavorites,
  artistBubbles,
  onSelectPlaylist,
  onOpenArtist,
  onPlaySong,
  onAddToQueue,
  onPlayNext,
  onToggleFavorite,
}: QueueLibraryViewProps) {
  return (
    <div className="space-y-8 text-left select-none">
      <div className="space-y-4">
        <div className="flex items-center gap-2 border-b border-white/5 pb-2">
          <ListMusic className="w-4 h-4 text-white/30" />
          <h3 className="text-[10px] uppercase tracking-[0.25em] font-bold text-white/40">Playlists</h3>
        </div>
        {localPlaylists.length === 0 ? (
          <NoirEmptyState variant="inline" title={strings.queue.library.playlists} />
        ) : (
          <div className="flex flex-col gap-3">
            {localPlaylists.map((playlist) => (
              <div
                key={`lib-plist-${playlist.id}`}
                onClick={() => onSelectPlaylist(playlist)}
                className="group w-full flex items-center justify-between p-3.5 rounded-2xl bg-white/[0.04] hover:bg-white/[0.06] border-0 transition-colors duration-300 cursor-pointer"
              >
                <div className="flex items-center gap-3.5 min-w-0 flex-1">
                  <div className="relative w-12 h-12 rounded-xl overflow-hidden bg-neutral-900 border border-white/5 flex items-center justify-center shrink-0">
                    <div className={`absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r ${playlist.color}`} />
                    {playlist.tracks && playlist.tracks.length > 0 ? (
                      <img src={playlist.tracks[0].thumbnail} alt={playlist.name} className="w-full h-full object-cover" />
                    ) : (
                      <Music className="w-5 h-5 text-white/20" />
                    )}
                  </div>
                  <div className="min-w-0 text-left">
                    <h4 className="text-sm font-semibold text-white/90 truncate leading-snug group-hover:text-white transition-colors">
                      {playlist.name}
                    </h4>
                    <p className="text-[11px] text-white/40 mt-0.5 font-medium">{(playlist.tracks || []).length} songs</p>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-white/30 group-hover:text-white/60 group-hover:translate-x-0.5 transition-all shrink-0" />
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="space-y-4">
        <div className="flex items-center gap-2 border-b border-white/5 pb-2">
          <User className="w-4 h-4 text-white/30" />
          <h3 className="text-[10px] uppercase tracking-[0.25em] font-bold text-white/40">Favorite Artists</h3>
        </div>
        {artistBubbles.length === 0 ? (
          <NoirEmptyState variant="inline" title={strings.queue.library.artists} />
        ) : (
          <div
            className="flex overflow-x-auto gap-4.5 pb-2 scrollbar-none snap-x snap-mandatory"
            style={CAROUSEL_MASK_STYLE}
          >
            {artistBubbles.map((artist, idx) => (
              <div
                key={`lib-art-${idx}`}
                onClick={() => onOpenArtist(artist)}
                className="group flex flex-col items-center gap-2 w-16 shrink-0 snap-start cursor-pointer"
                title={`Browse ${artist.name}`}
              >
                <div className="relative w-16 h-16 rounded-full overflow-hidden border border-white/10 hover:border-white/30 group-hover:scale-105 transition-all duration-300 shadow-md bg-white/[0.06] shrink-0">
                  <ArtistAvatar name={artist.name} fallbackThumbnail={artist.thumbnail} />
                </div>
                <span className="text-[10px] text-white/40 group-hover:text-white transition-colors text-center truncate w-full font-semibold">
                  {artist.name}
                </span>
              </div>
            ))}
            <div className={CAROUSEL_END_SPACER_CLASS} />
          </div>
        )}
      </div>

      <div className="space-y-4">
        <div className="flex items-center gap-2 border-b border-white/5 pb-2">
          <Heart className="w-4 h-4 text-white/30" />
          <h3 className="text-[10px] uppercase tracking-[0.25em] font-bold text-white/40">All Likes</h3>
        </div>
        {localFavorites.length === 0 ? (
          <NoirEmptyState variant="inline" title={strings.queue.library.likes} />
        ) : (
          <div className="space-y-3">
            {localFavorites.map((song) => (
              <QueueSongRow
                key={`lib-fav-${song.id}`}
                song={song}
                onPlay={() => onPlaySong(song)}
                onAddToQueue={onAddToQueue}
                onPlayNext={onPlayNext}
                onToggleFavorite={onToggleFavorite}
                isFavorite={true}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
