import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Check, ChevronRight, Heart, ListMusic, MoreHorizontal, Play, Plus, Radio, Search, UserRound, X } from 'lucide-react';
import { motion } from 'motion/react';
import type { SearchResult } from '../types';
import { strings } from '../constants/strings';
import { addTrackToPlaylist, createPlaylist, playlistHasTrack, usePlaylists } from '../utils/playlistStore';
import { MOTION, withReducedMotion } from '../utils/motionPresets';
import { noirToast } from './shell/noir/NoirToast';

const MENU_WIDTH = 232;
const SUBMENU_WIDTH = 248;
const MENU_GAP = 8;

export type SongMenuActions = {
  onPlayNext?: (track: SearchResult) => void;
  onAddToQueue?: (track: SearchResult) => void;
  onStartRadio?: (track: SearchResult) => void;
  onToggleFavorite?: (track: SearchResult) => void;
  onGoToArtist?: (artist: string, channelId?: string) => void;
  onRemoveFromQueue?: (track: SearchResult) => (() => void) | void;
  onRemoveFromPlaylist?: (track: SearchResult) => void;
  isFavorite?: boolean;
};

type MenuRequest = {
  track: SearchResult;
  x: number;
  y: number;
  fromTrigger: boolean;
  anchor: Element | null;
  actions: SongMenuActions;
};

type MenuListener = (request: MenuRequest) => void;
const listeners = new Set<MenuListener>();

function subscribeToSongMenu(listener: MenuListener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function openSongMenu(
  track: SearchResult,
  event: React.MouseEvent<HTMLElement> | MouseEvent,
  actions: SongMenuActions = {}
) {
  event.preventDefault();
  event.stopPropagation();

  const anchor = event.currentTarget instanceof Element ? event.currentTarget : null;
  const rect = anchor?.getBoundingClientRect();
  const fromTrigger = event.type !== 'contextmenu';
  const x = fromTrigger ? rect?.right ?? event.clientX : event.clientX;
  const y = fromTrigger ? rect?.bottom ?? event.clientY : event.clientY;

  listeners.forEach((listener) =>
    listener({
      track,
      x,
      y,
      fromTrigger,
      anchor,
      actions,
    })
  );
}

type NoirSongMenuTriggerProps = {
  track: SearchResult;
  actions?: SongMenuActions;
  onPlayNext?: (track: SearchResult) => void;
  onAddToQueue?: (track: SearchResult) => void;
  onToggleFavorite?: (track: SearchResult) => void;
  isFavorite?: boolean;
  onRemoveFromQueue?: (track: SearchResult) => (() => void) | void;
  onRemoveFromPlaylist?: (track: SearchResult) => void;
};

export function SongRowOptions({
  track,
  actions = {},
  onPlayNext,
  onAddToQueue,
  onToggleFavorite,
  isFavorite,
  onRemoveFromQueue,
  onRemoveFromPlaylist,
}: NoirSongMenuTriggerProps) {
  const menuActions: SongMenuActions = {
    ...actions,
    onPlayNext: actions.onPlayNext ?? onPlayNext,
    onAddToQueue: actions.onAddToQueue ?? onAddToQueue,
    onToggleFavorite: actions.onToggleFavorite ?? onToggleFavorite,
    isFavorite: actions.isFavorite ?? isFavorite,
    onRemoveFromQueue: actions.onRemoveFromQueue ?? onRemoveFromQueue,
    onRemoveFromPlaylist: actions.onRemoveFromPlaylist ?? onRemoveFromPlaylist,
  };

  return (
    <button
      type="button"
      onClick={(event) => openSongMenu(track, event, menuActions)}
      className="flex h-9 w-9 items-center justify-center rounded-full text-[color:var(--noir-text-secondary)] hover:bg-white/[0.08] hover:text-white elva-focus-ring"
      title={strings.songMenu.moreOptions}
      aria-label={strings.songMenu.moreOptions}
    >
      <MoreHorizontal className="h-4 w-4" strokeWidth={1.75} />
    </button>
  );
}

type NoirSongMenuHostProps = SongMenuActions & {
  isFavoriteForTrack?: (track: SearchResult) => boolean;
};

function MenuItem({
  icon: Icon,
  label,
  onClick,
  disabled = false,
  danger = false,
  trailing,
  title,
}: {
  icon: typeof Play;
  label: string;
  onClick?: () => void;
  disabled?: boolean;
  danger?: boolean;
  trailing?: React.ReactNode;
  title?: string;
}) {
  return (
    <button
      type="button"
      role="menuitem"
      disabled={disabled}
      title={title}
      onClick={onClick}
      className={`flex h-8 w-full items-center gap-2 rounded-[var(--noir-radius-sm)] px-2.5 text-left text-[13px] font-medium transition-colors ${
        disabled
          ? 'cursor-not-allowed text-[color:var(--noir-text-tertiary)] opacity-45'
          : danger
            ? 'text-red-300 hover:bg-white/[0.08] hover:text-red-200'
            : 'text-[color:var(--noir-text-secondary)] hover:bg-white/[0.08] hover:text-white'
      }`}
    >
      <Icon className="h-4 w-4 shrink-0 opacity-75" strokeWidth={1.75} />
      <span className="min-w-0 flex-1 truncate">{label}</span>
      {trailing}
    </button>
  );
}

export function NoirSongMenuHost({
  onPlayNext,
  onAddToQueue,
  onStartRadio,
  onToggleFavorite,
  onGoToArtist,
  onRemoveFromQueue,
  onRemoveFromPlaylist,
  isFavoriteForTrack,
}: NoirSongMenuHostProps) {
  const playlists = usePlaylists();
  const [request, setRequest] = useState<MenuRequest | null>(null);
  const [submenuOpen, setSubmenuOpen] = useState(false);
  const [playlistQuery, setPlaylistQuery] = useState('');
  const [menuPosition, setMenuPosition] = useState<{ top: number; left: number } | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  const close = () => {
    setRequest(null);
    setSubmenuOpen(false);
    setPlaylistQuery('');
  };

  useEffect(() => subscribeToSongMenu(setRequest), []);

  useLayoutEffect(() => {
    if (!request) {
      setMenuPosition(null);
      return;
    }

    const menuHeight = 320;
    const initialLeft = request.fromTrigger ? request.x - MENU_WIDTH : request.x;
    const initialTop = request.fromTrigger ? request.y + MENU_GAP : request.y;
    const left = Math.max(
      MENU_GAP,
      Math.min(initialLeft, window.innerWidth - MENU_WIDTH - MENU_GAP)
    );
    const top =
      initialTop + menuHeight <= window.innerHeight
        ? initialTop
        : Math.max(MENU_GAP, request.fromTrigger ? request.y - menuHeight - MENU_GAP : request.y - menuHeight);

    setMenuPosition({ top, left });
  }, [request]);

  useEffect(() => {
    if (!request) return;

    const handlePointerDown = (event: PointerEvent) => {
      const target = event.target as Node;
      if (menuRef.current?.contains(target) || request.anchor?.contains(target)) return;
      close();
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') close();
    };

    document.addEventListener('pointerdown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('pointerdown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [request]);

  if (!request || !menuPosition) return null;

  const track = request.track;
  const actions = {
    onPlayNext: request.actions.onPlayNext ?? onPlayNext,
    onAddToQueue: request.actions.onAddToQueue ?? onAddToQueue,
    onStartRadio: request.actions.onStartRadio ?? onStartRadio,
    onToggleFavorite: request.actions.onToggleFavorite ?? onToggleFavorite,
    onGoToArtist: request.actions.onGoToArtist ?? onGoToArtist,
    onRemoveFromQueue: request.actions.onRemoveFromQueue ?? onRemoveFromQueue,
    onRemoveFromPlaylist: request.actions.onRemoveFromPlaylist ?? onRemoveFromPlaylist,
    isFavorite: request.actions.isFavorite ?? isFavoriteForTrack?.(track) ?? false,
  };

  const filteredPlaylists = playlists.filter((playlist) =>
    playlist.name.toLowerCase().includes(playlistQuery.trim().toLowerCase())
  );

  const addToNewPlaylist = () => {
    const playlist = createPlaylist([track]);
    close();
    noirToast({
      text: strings.songMenu.addedTo(playlist.name),
      cover: track.thumbnail,
    });
  };

  const addToPlaylist = (playlistId: string, playlistName: string) => {
    const playlist = playlists.find((item) => item.id === playlistId);
    if (!playlist || playlistHasTrack(playlist, track)) return;
    if (!addTrackToPlaylist(playlistId, track)) return;
    close();
    noirToast({
      text: strings.songMenu.addedTo(playlistName),
      cover: track.thumbnail,
    });
  };

  const removeFromQueue = () => {
    const restore = actions.onRemoveFromQueue?.(track);
    close();
    noirToast({
      text: strings.songMenu.removedFromQueue,
      cover: track.thumbnail,
      action: restore ? { label: strings.songMenu.undo, onClick: restore } : undefined,
    });
  };

  const mainMenu = (
    <motion.div
      ref={menuRef}
      role="menu"
      aria-label={strings.songMenu.menuLabel(track.title)}
      initial={{ opacity: 0, scale: 0.96, y: -4 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      transition={withReducedMotion(MOTION.panel)}
      className="noir-menu fixed z-[10000] flex w-[232px] flex-col gap-0.5 !p-1.5"
      style={{ top: menuPosition.top, left: menuPosition.left }}
      onPointerDown={(event) => event.stopPropagation()}
    >
      <MenuItem
        icon={Play}
        label={strings.songMenu.playNext}
        disabled={!actions.onPlayNext}
        onClick={() => {
          actions.onPlayNext?.(track);
          close();
        }}
      />
      <MenuItem
        icon={Plus}
        label={strings.songMenu.addToQueue}
        disabled={!actions.onAddToQueue}
        onClick={() => {
          actions.onAddToQueue?.(track);
          close();
        }}
      />
      <MenuItem
        icon={Radio}
        label={strings.songMenu.startRadio}
        disabled={!actions.onStartRadio}
        onClick={() => {
          actions.onStartRadio?.(track);
          close();
        }}
      />
      <div className="my-1 h-px bg-[color:var(--noir-rule)]" />
      <MenuItem
        icon={ListMusic}
        label={strings.songMenu.addToPlaylist}
        trailing={<ChevronRight className="h-3.5 w-3.5 opacity-55" strokeWidth={1.75} />}
        onClick={() => setSubmenuOpen(true)}
      />
      <MenuItem
        icon={Heart}
        label={actions.isFavorite ? strings.songMenu.removeFavorite : strings.songMenu.favorite}
        disabled={!actions.onToggleFavorite}
        onClick={() => {
          actions.onToggleFavorite?.(track);
          close();
        }}
      />
      <div className="my-1 h-px bg-[color:var(--noir-rule)]" />
      <MenuItem
        icon={UserRound}
        label={strings.songMenu.goToArtist}
        disabled={!actions.onGoToArtist}
        onClick={() => {
          actions.onGoToArtist?.(track.artist, track.channelId);
          close();
        }}
      />
      {actions.onRemoveFromPlaylist && (
        <MenuItem
          icon={X}
          label={strings.songMenu.removeFromPlaylist}
          danger
          onClick={() => {
            actions.onRemoveFromPlaylist?.(track);
            close();
          }}
        />
      )}
      {actions.onRemoveFromQueue && (
        <MenuItem
          icon={X}
          label={strings.songMenu.removeFromQueue}
          danger
          onClick={removeFromQueue}
        />
      )}
    </motion.div>
  );

  const submenu = submenuOpen ? (
    <motion.div
      initial={{ opacity: 0, x: -4 }}
      animate={{ opacity: 1, x: 0 }}
      transition={withReducedMotion(MOTION.panel)}
      className="noir-menu fixed z-[10001] flex max-h-[min(420px,calc(100vh-16px))] w-[248px] flex-col !p-1.5"
      style={{
        top: menuPosition.top,
        left:
          menuPosition.left + MENU_WIDTH + MENU_GAP + SUBMENU_WIDTH <= window.innerWidth
            ? menuPosition.left + MENU_WIDTH + MENU_GAP
            : menuPosition.left - SUBMENU_WIDTH - MENU_GAP,
      }}
      onPointerDown={(event) => event.stopPropagation()}
    >
      <div className="flex h-8 items-center gap-2 px-2.5">
        <button
          type="button"
          onClick={() => setSubmenuOpen(false)}
          className="flex h-6 w-6 items-center justify-center rounded-full text-[color:var(--noir-text-tertiary)] hover:bg-white/[0.08] hover:text-white"
          aria-label={strings.songMenu.closePlaylistSubmenu}
        >
          <X className="h-3.5 w-3.5" strokeWidth={1.75} />
        </button>
        <span className="text-[11px] font-semibold text-[color:var(--noir-text-tertiary)]">
          {strings.songMenu.addToPlaylist}
        </span>
      </div>
      <MenuItem icon={Plus} label={strings.songMenu.newPlaylist} onClick={addToNewPlaylist} />
      {playlists.length > 6 && (
        <label className="mx-1 my-1 flex h-8 items-center gap-2 rounded-[var(--noir-radius-sm)] border border-white/[0.08] px-2 text-[color:var(--noir-text-tertiary)]">
          <Search className="h-3.5 w-3.5 shrink-0" strokeWidth={1.75} />
          <input
            autoFocus
            value={playlistQuery}
            onChange={(event) => setPlaylistQuery(event.target.value)}
            placeholder={strings.songMenu.searchPlaceholder}
            className="min-w-0 flex-1 bg-transparent text-[12px] text-white outline-none placeholder:text-white/25"
          />
        </label>
      )}
      <div className="max-h-[300px] overflow-y-auto">
        {filteredPlaylists.map((playlist) => {
          const containsTrack = playlistHasTrack(playlist, track);
          return (
            <MenuItem
              key={playlist.id}
              icon={ListMusic}
              label={playlist.name}
              disabled={containsTrack}
              trailing={containsTrack ? <Check className="h-4 w-4 text-[color:var(--noir-accent)]" strokeWidth={2} /> : undefined}
              onClick={() => addToPlaylist(playlist.id, playlist.name)}
            />
          );
        })}
      </div>
    </motion.div>
  ) : null;

  return createPortal(
    <>
      {mainMenu}
      {submenu}
    </>,
    document.body
  );
}
