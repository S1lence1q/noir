import React, { useState, useRef, useEffect, useLayoutEffect } from 'react';
import { createPortal } from 'react-dom';
import { MoreHorizontal, Play, Plus, ListMusic, ChevronRight, Heart, Trash2 } from 'lucide-react';
import { SearchResult } from '../types';
import { showMiniHUD } from '../utils/hudUtils';

const MENU_WIDTH = 192;
const MENU_GAP = 8;
const MENU_ESTIMATE_MAIN = 220; // Expanded to accommodate Likes and Remove options
const MENU_ESTIMATE_SUB = 220;

interface SongRowOptionsProps {
  track: SearchResult;
  onPlayNext?: (track: SearchResult) => void;
  onAddToQueue?: (track: SearchResult) => void;
  onToggleFavorite?: (track: SearchResult) => void;
  isFavorite?: boolean;
  onRemoveFromQueue?: (track: SearchResult) => void;
}

const LegacySongRowOptions: React.FC<SongRowOptionsProps> = ({
  track,
  onPlayNext,
  onAddToQueue,
  onToggleFavorite,
  isFavorite = false,
  onRemoveFromQueue,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [showPlaylistsSub, setShowPlaylistsSub] = useState(false);
  const [playlists, setPlaylists] = useState<any[]>([]);
  const [menuPosition, setMenuPosition] = useState<{ top: number; left: number } | null>(null);

  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  const loadPlaylists = () => {
    try {
      const stored = localStorage.getItem('elva_playlists');
      if (stored) {
        setPlaylists(JSON.parse(stored));
      }
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    if (isOpen) {
      loadPlaylists();
    }
  }, [isOpen]);

  useLayoutEffect(() => {
    if (!isOpen) {
      setMenuPosition(null);
      return;
    }

    const updateMenuPosition = () => {
      const trigger = triggerRef.current;
      const menu = menuRef.current;
      if (!trigger) return;

      const rect = trigger.getBoundingClientRect();
      const menuHeight = menu ? menu.getBoundingClientRect().height : (showPlaylistsSub ? MENU_ESTIMATE_SUB : MENU_ESTIMATE_MAIN);
      const spaceBelow = window.innerHeight - rect.bottom - MENU_GAP;
      const spaceAbove = rect.top - MENU_GAP;
      const openBelow = spaceBelow >= menuHeight || spaceBelow >= spaceAbove;

      const top = openBelow
        ? rect.bottom + MENU_GAP
        : Math.max(MENU_GAP, rect.top - menuHeight - MENU_GAP);

      let left = rect.right - MENU_WIDTH;
      left = Math.max(MENU_GAP, Math.min(left, window.innerWidth - MENU_WIDTH - MENU_GAP));

      setMenuPosition({ top, left });
    };

    updateMenuPosition();

    window.addEventListener('resize', updateMenuPosition);
    window.addEventListener('scroll', updateMenuPosition, true);
    return () => {
      window.removeEventListener('resize', updateMenuPosition);
      window.removeEventListener('scroll', updateMenuPosition, true);
    };
  }, [isOpen, showPlaylistsSub]);

  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      const target = e.target as Node;
      if (triggerRef.current?.contains(target) || menuRef.current?.contains(target)) {
        return;
      }
      setIsOpen(false);
      setShowPlaylistsSub(false);
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleOutsideClick);
    }
    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
    };
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsOpen(false);
        setShowPlaylistsSub(false);
      }
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [isOpen]);

  const handleAddTrackToPlaylist = (playlistId: string, playlistName: string) => {
    try {
      const stored = localStorage.getItem('elva_playlists');
      const currentPlaylists = stored ? JSON.parse(stored) : [];
      const updated = currentPlaylists.map((p: any) => {
        if (p.id === playlistId) {
          if (p.tracks.some((t: any) => t.id === track.id)) {
            showMiniHUD('Song already in playlist', 'info');
            return p;
          }
          return {
            ...p,
            tracks: [...p.tracks, track],
          };
        }
        return p;
      });

      localStorage.setItem('elva_playlists', JSON.stringify(updated));
      showMiniHUD(`Added to ${playlistName}`);
      window.dispatchEvent(new CustomEvent('elva-playlists-updated'));
    } catch (e) {
      showMiniHUD('Failed to add track', 'error');
    }
    setIsOpen(false);
    setShowPlaylistsSub(false);
  };

  const menu =
    isOpen
      ? createPortal(
          <div
            ref={menuRef}
            role="menu"
            style={{
              position: 'fixed',
              top: menuPosition?.top ?? 0,
              left: menuPosition?.left ?? 0,
              width: MENU_WIDTH,
              zIndex: 10000,
              visibility: menuPosition ? 'visible' : 'hidden',
              opacity: menuPosition ? 1 : 0,
            }}
            className="rounded-2xl bg-[#0b0b0e]/95 border border-white/10 backdrop-blur-2xl shadow-[0_15px_30px_rgba(0,0,0,0.6)] p-1.5 flex flex-col gap-0.5 text-left transition-opacity duration-100 ease-out"
            onClick={(e) => e.stopPropagation()}
          >
            {!showPlaylistsSub ? (
              <>
                {onPlayNext && (
                  <button
                    type="button"
                    role="menuitem"
                    onClick={() => {
                      onPlayNext(track);
                      setIsOpen(false);
                    }}
                    className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold text-white/80 hover:text-white hover:bg-white/5 transition-all cursor-pointer"
                  >
                    <Play className="w-3.5 h-3.5 text-white/50" />
                    <span>Play Next</span>
                  </button>
                )}
                {onAddToQueue && (
                  <button
                    type="button"
                    role="menuitem"
                    onClick={() => {
                      onAddToQueue(track);
                      setIsOpen(false);
                    }}
                    className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold text-white/80 hover:text-white hover:bg-white/5 transition-all cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5 text-white/50" />
                    <span>Add to Queue</span>
                  </button>
                )}
                {onToggleFavorite && (
                  <button
                    type="button"
                    role="menuitem"
                    onClick={() => {
                      onToggleFavorite(track);
                      setIsOpen(false);
                    }}
                    className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold text-white/80 hover:text-white hover:bg-white/5 transition-all cursor-pointer"
                  >
                    <Heart className={`w-3.5 h-3.5 ${isFavorite ? 'text-red-500 fill-red-500' : 'text-white/50'}`} />
                    <span>{isFavorite ? 'Remove from Likes' : 'Like'}</span>
                  </button>
                )}
                <button
                  type="button"
                  role="menuitem"
                  onClick={() => {
                    if (playlists.length === 0) {
                      showMiniHUD('No playlists created yet', 'info');
                    } else {
                      setShowPlaylistsSub(true);
                    }
                  }}
                  className="w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold text-white/80 hover:text-white hover:bg-white/5 transition-all cursor-pointer"
                >
                  <div className="flex items-center gap-2">
                    <ListMusic className="w-3.5 h-3.5 text-white/50" />
                    <span>Add to Playlist</span>
                  </div>
                  <ChevronRight className="w-3 h-3 text-white/30" />
                </button>
                {onRemoveFromQueue && (
                  <button
                    type="button"
                    role="menuitem"
                    onClick={() => {
                      onRemoveFromQueue(track);
                      setIsOpen(false);
                    }}
                    className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold text-red-400 hover:text-red-300 hover:bg-white/5 transition-all cursor-pointer border-t border-white/5 mt-1 pt-1.5"
                  >
                    <Trash2 className="w-3.5 h-3.5 text-red-400/70" />
                    <span>Remove from Queue</span>
                  </button>
                )}
              </>
            ) : (
              <>
                <div className="px-3 py-1.5 text-[9px] uppercase tracking-wider text-white/30 font-bold border-b border-white/5 mb-1 flex justify-between items-center select-none">
                  <span>Select Playlist</span>
                  <button
                    type="button"
                    onClick={() => setShowPlaylistsSub(false)}
                    className="text-white/50 hover:text-white normal-case font-semibold text-[10px]"
                  >
                    Back
                  </button>
                </div>
                <div className="max-h-36 overflow-y-auto scrollbar-none flex flex-col gap-0.5">
                  {playlists.map((playlist) => (
                    <button
                      key={playlist.id}
                      type="button"
                      role="menuitem"
                      onClick={() => handleAddTrackToPlaylist(playlist.id, playlist.name)}
                      className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold text-white/80 hover:text-white hover:bg-white/5 transition-all cursor-pointer text-left truncate"
                    >
                      <div className={`w-2 h-2 rounded-full bg-gradient-to-tr ${playlist.color} shrink-0`} />
                      <span className="truncate">{playlist.name}</span>
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>,
          document.body,
        )
      : null;

  return (
    <div className="relative shrink-0" onClick={(e) => e.stopPropagation()}>
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setIsOpen((open) => !open)}
        className="p-2.5 rounded-xl hover:bg-white/5 text-white/40 hover:text-white transition-all cursor-pointer elva-focus-ring"
        title="More options"
        aria-label="More options"
        aria-expanded={isOpen}
        aria-haspopup="menu"
      >
        <MoreHorizontal className="w-4 h-4" />
      </button>
      {menu}
    </div>
  );
};

export { NoirSongMenuHost, SongRowOptions, openSongMenu } from './NoirSongMenu';
