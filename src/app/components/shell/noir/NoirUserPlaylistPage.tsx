import { useEffect, useRef, useState, type RefObject } from 'react';
import { AnimatePresence, motion, Reorder } from 'motion/react';
import { ArrowLeft, Check, MoreHorizontal, Pencil, Play, Plus, Search, Shuffle, Trash2, X } from 'lucide-react';
import { SearchResult } from '../../../types';
import { strings } from '../../../constants/strings';
import { isTrackFavorite } from '../../../utils/favoriteUtils';
import { worldForCollection } from '../../../utils/ditherCover';
import { EASE_PREMIUM, MOTION, prefersReducedMotion, withReducedMotion } from '../../../utils/motionPresets';
import { executeSearchAPI } from '../../../utils/api/pipedSearch';
import { ELVA_STORAGE_KEYS, readJsonStorage } from '../../../utils/elvaStorage';
import {
  UserPlaylist,
  addTrackToPlaylist,
  consumePendingRename,
  deletePlaylist,
  playlistHasTrack,
  removeTrackFromPlaylist,
  renamePlaylist,
  reorderPlaylist,
} from '../../../utils/playlistStore';
import { NoirDitherCover } from './NoirDitherCover';
import { NoirSongRow } from './NoirSongRow';
import { noirToast } from './NoirToast';

type NoirUserPlaylistPageProps = {
  playlist: UserPlaylist;
  favorites: SearchResult[];
  onBack: () => void;
  onAddToQueue: (track: SearchResult) => void;
  onPlayPlaylist: (tracks: SearchResult[], label?: string, startIndex?: number) => void;
  onPlayNext?: (track: SearchResult) => void;
  onToggleFavorite: (track: SearchResult) => void;
};

function shuffled<T>(items: T[]): T[] {
  const next = [...items];
  for (let i = next.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [next[i], next[j]] = [next[j], next[i]];
  }
  return next;
}

/** Flies a copy of `from` to the bottom of `target` — the spot where the new row will render. */
function flyCover(from: HTMLElement | null, target: HTMLElement | null) {
  if (!from || !target || prefersReducedMotion()) return;
  const a = from.getBoundingClientRect();
  const t = target.getBoundingClientRect();
  const size = 48;
  // New rows append at the list's bottom edge; the row's cover sits 12px in (row padding).
  const toX = t.left + 12;
  const toY = t.bottom + 12;
  const ghost = from.cloneNode(true) as HTMLElement;
  Object.assign(ghost.style, {
    position: 'fixed',
    left: `${a.left}px`,
    top: `${a.top}px`,
    width: `${a.width}px`,
    height: `${a.height}px`,
    margin: '0',
    zIndex: '9998',
    pointerEvents: 'none',
    borderRadius: '8px',
    boxShadow: '0 12px 32px rgba(0,0,0,0.6)',
  });
  document.body.appendChild(ghost);
  const dx = toX - a.left;
  const dy = toY - a.top;
  const scale = size / a.width;
  ghost
    .animate(
      [
        { transform: 'translate(0,0) scale(1)', opacity: 1 },
        { transform: `translate(${dx * 0.55}px, ${dy * 0.35 - 40}px) scale(${1 + (scale - 1) * 0.5})`, opacity: 1, offset: 0.5 },
        { transform: `translate(${dx}px, ${dy}px) scale(${scale})`, opacity: 0.2 },
      ],
      { duration: 520, easing: 'cubic-bezier(0.16, 1, 0.3, 1)' }
    )
    .finished.finally(() => ghost.remove());
}

export function NoirUserPlaylistPage({
  playlist,
  favorites,
  onBack,
  onAddToQueue,
  onPlayPlaylist,
  onPlayNext,
  onToggleFavorite,
}: NoirUserPlaylistPageProps) {
  const [justCreated] = useState(() => consumePendingRename(playlist.id));
  const [editing, setEditing] = useState(justCreated);
  const [draft, setDraft] = useState(playlist.name);
  const [menuOpen, setMenuOpen] = useState(false);
  const [panelOpen, setPanelOpen] = useState(() => playlist.tracks.length === 0);
  const [order, setOrder] = useState(() => playlist.tracks.map((t) => t.id));
  const orderRef = useRef(order);
  orderRef.current = order;
  const titleInputRef = useRef<HTMLInputElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const reduced = prefersReducedMotion();

  useEffect(() => {
    setOrder(playlist.tracks.map((t) => t.id));
  }, [playlist.tracks]);

  useEffect(() => {
    if (!editing) setDraft(playlist.name);
  }, [playlist.name, editing]);

  useEffect(() => {
    if (!editing) return;
    // Let the entrance animation start before focusing, so selection doesn't flash mid-scale.
    const timer = setTimeout(() => {
      titleInputRef.current?.focus();
      titleInputRef.current?.select();
    }, justCreated ? 180 : 0);
    return () => clearTimeout(timer);
  }, [editing, justCreated]);

  useEffect(() => {
    if (!menuOpen) return;
    const close = (e: PointerEvent) => {
      if (!menuRef.current?.contains(e.target as Node)) setMenuOpen(false);
    };
    window.addEventListener('pointerdown', close);
    return () => window.removeEventListener('pointerdown', close);
  }, [menuOpen]);

  const byId = new Map(playlist.tracks.map((t) => [t.id, t]));
  const orderedTracks = order.map((id) => byId.get(id)).filter((t): t is SearchResult => !!t);
  const hasTracks = orderedTracks.length > 0;

  const commitTitle = () => {
    renamePlaylist(playlist.id, draft);
    setEditing(false);
  };

  const handleDelete = () => {
    setMenuOpen(false);
    const restore = deletePlaylist(playlist.id);
    onBack();
    noirToast({ text: strings.playlist.deleted, action: { label: strings.playlist.undo, onClick: restore } });
  };

  const handleRemove = (track: SearchResult) => {
    const restore = removeTrackFromPlaylist(playlist.id, track.id);
    noirToast({
      text: strings.playlist.removedFrom(playlist.name),
      cover: track.thumbnail,
      action: { label: strings.playlist.undo, onClick: restore },
    });
  };

  const enter = (delay: number) =>
    justCreated && !reduced
      ? {
          initial: { opacity: 0, y: 10 },
          animate: { opacity: 1, y: 0 },
          transition: { duration: 0.42, ease: EASE_PREMIUM, delay },
        }
      : {};

  return (
    <div className="noir-playlist-layout" data-panel={panelOpen ? 'open' : 'closed'}>
      <div className="min-w-0 pb-6">
        <button type="button" onClick={onBack} className="noir-back-link elva-focus-ring">
          <ArrowLeft className="h-4 w-4" strokeWidth={1.75} />
          {strings.playlist.back}
        </button>

        <header className="mt-5 flex items-end gap-6">
          <motion.div
            initial={justCreated && !reduced ? { opacity: 0, scale: 0.4, rotate: -6 } : false}
            animate={{ opacity: 1, scale: 1, rotate: 0 }}
            transition={{ type: 'spring', stiffness: 260, damping: 22, mass: 0.9 }}
          >
            <NoirDitherCover
              source={orderedTracks[0]?.thumbnail}
              world={worldForCollection(playlist.id)}
              seed={playlist.id}
              size={200}
            />
          </motion.div>
          <div className="min-w-0 flex-1 pb-1">
            <motion.p className="noir-label" {...enter(0.08)}>
              {strings.playlist.label}
            </motion.p>
            <motion.div {...enter(0.14)}>
              {editing ? (
                <input
                  ref={titleInputRef}
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  onBlur={commitTitle}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') commitTitle();
                    if (e.key === 'Escape') {
                      setDraft(playlist.name);
                      setEditing(false);
                    }
                  }}
                  maxLength={80}
                  className="noir-collection-title noir-collection-title--input"
                  aria-label={strings.playlist.rename}
                />
              ) : (
                <h1>
                  <button
                    type="button"
                    onClick={() => setEditing(true)}
                    className="noir-collection-title text-left elva-focus-ring"
                    title={strings.playlist.renameHint}
                  >
                    {playlist.name}
                  </button>
                </h1>
              )}
            </motion.div>
            <motion.p className="mt-2 text-[13px] text-[color:var(--noir-text-secondary)]" {...enter(0.2)}>
              {strings.playlist.songCount(orderedTracks.length)}
            </motion.p>

            <motion.div className="mt-5 flex items-center gap-2" {...enter(0.26)}>
              <motion.button
                type="button"
                disabled={!hasTracks}
                onClick={() => onPlayPlaylist(orderedTracks, playlist.name)}
                className="noir-play-round elva-focus-ring"
                aria-label={strings.playlist.play}
                whileTap={{ scale: 0.94 }}
                transition={MOTION.tap}
              >
                <Play className="ml-0.5 h-5 w-5 fill-current" />
              </motion.button>
              <button
                type="button"
                disabled={!hasTracks}
                onClick={() => onPlayPlaylist(shuffled(orderedTracks), playlist.name)}
                className="noir-icon-button elva-focus-ring"
                aria-label={strings.playlist.shuffle}
                title={strings.playlist.shuffle}
              >
                <Shuffle className="h-[18px] w-[18px]" strokeWidth={1.75} />
              </button>
              <button
                type="button"
                onClick={() => setPanelOpen((open) => !open)}
                className="noir-button-secondary ml-1 elva-focus-ring"
                data-active={panelOpen ? 'true' : 'false'}
                aria-expanded={panelOpen}
              >
                <Plus className="h-3.5 w-3.5" strokeWidth={2.25} />
                {strings.playlist.addSongs}
              </button>
              <div ref={menuRef} className="relative">
                <button
                  type="button"
                  onClick={() => setMenuOpen((open) => !open)}
                  className="noir-icon-button elva-focus-ring"
                  aria-label={strings.playlist.more}
                  aria-expanded={menuOpen}
                >
                  <MoreHorizontal className="h-[18px] w-[18px]" strokeWidth={1.75} />
                </button>
                <AnimatePresence>
                  {menuOpen && (
                    <motion.div
                      className="noir-menu absolute left-0 top-full z-20 mt-2 w-48"
                      initial={{ opacity: 0, y: -4 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -4 }}
                      transition={withReducedMotion(MOTION.panel)}
                      role="menu"
                    >
                      <button
                        type="button"
                        role="menuitem"
                        className="noir-menu-item"
                        onClick={() => {
                          setMenuOpen(false);
                          setEditing(true);
                        }}
                      >
                        <Pencil className="h-4 w-4" strokeWidth={1.75} />
                        {strings.playlist.rename}
                      </button>
                      <button type="button" role="menuitem" className="noir-menu-item noir-menu-item--danger" onClick={handleDelete}>
                        <Trash2 className="h-4 w-4" strokeWidth={1.75} />
                        {strings.playlist.delete}
                      </button>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </motion.div>
          </div>
        </header>

        <Reorder.Group
          ref={listRef}
          axis="y"
          values={order}
          onReorder={setOrder}
          className="mt-10 flex flex-col gap-0.5"
        >
          <AnimatePresence initial={false}>
            {orderedTracks.map((track, i) => (
              <PlaylistTrackItem
                key={track.id}
                track={track}
                isFavorite={isTrackFavorite(favorites, track)}
                onDragEnd={() => reorderPlaylist(playlist.id, orderRef.current)}
                onPlay={() => onPlayPlaylist(orderedTracks, playlist.name, i)}
                onRemove={() => handleRemove(track)}
                onAddToQueue={onAddToQueue}
                onPlayNext={onPlayNext}
                onToggleFavorite={onToggleFavorite}
              />
            ))}
          </AnimatePresence>
        </Reorder.Group>

        {!hasTracks && (
          <motion.div className="noir-playlist-empty" {...enter(0.32)}>
            <span className="noir-playlist-empty-slot" aria-hidden />
            <span className="text-[13px] text-[color:var(--noir-text-tertiary)]">
              {panelOpen ? strings.playlist.emptyWithPanel : strings.playlist.emptyRow}
            </span>
          </motion.div>
        )}
      </div>

      <AnimatePresence initial={false}>
        {panelOpen && (
          <PlaylistAddPanel
            key="add-panel"
            playlist={playlist}
            favorites={favorites}
            listRef={listRef}
            delay={justCreated ? 0.24 : 0}
            onClose={() => setPanelOpen(false)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

type PlaylistTrackItemProps = {
  track: SearchResult;
  isFavorite: boolean;
  onDragEnd: () => void;
  onPlay: () => void;
  onRemove: () => void;
  onAddToQueue: (track: SearchResult) => void;
  onPlayNext?: (track: SearchResult) => void;
  onToggleFavorite: (track: SearchResult) => void;
};

function PlaylistTrackItem({
  track,
  isFavorite,
  onDragEnd,
  onPlay,
  onRemove,
  onAddToQueue,
  onPlayNext,
  onToggleFavorite,
}: PlaylistTrackItemProps) {
  // A drag ends with a click on the same row; swallow it so reordering never starts playback.
  const draggedRef = useRef(false);

  return (
    <Reorder.Item
      value={track.id}
      onDragStart={() => {
        draggedRef.current = true;
      }}
      onDragEnd={() => {
        onDragEnd();
        setTimeout(() => {
          draggedRef.current = false;
        }, 0);
      }}
      className="noir-playlist-item select-none"
      initial={{ opacity: 0, y: -8, scale: 0.985 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, scale: 0.985, transition: { duration: 0.16 } }}
      whileDrag={{ scale: 1.015, boxShadow: '0 12px 32px rgba(0,0,0,0.65)', zIndex: 5, cursor: 'grabbing' }}
      transition={MOTION.panel}
    >
      <NoirSongRow
        track={track}
        isFavorite={isFavorite}
        allowExternalDrag={false}
        onPlay={() => {
          if (!draggedRef.current) onPlay();
        }}
        onAddToQueue={onAddToQueue}
        onPlayNext={onPlayNext}
        onToggleFavorite={onToggleFavorite}
        onRemoveFromPlaylist={() => onRemove()}
        extraAction={
          <button
            type="button"
            onClick={onRemove}
            className="flex h-9 w-9 items-center justify-center rounded-full text-[color:var(--noir-text-secondary)] hover:bg-white/[0.08] hover:text-white"
            aria-label={strings.playlist.removeFromPlaylist}
            title={strings.playlist.removeFromPlaylist}
            onPointerDown={(e) => e.stopPropagation()}
          >
            <X className="h-4 w-4" strokeWidth={2} />
          </button>
        }
      />
    </Reorder.Item>
  );
}

type PanelSource = 'favorites' | 'recents';

function PlaylistAddPanel({
  playlist,
  favorites,
  listRef,
  delay,
  onClose,
}: {
  playlist: UserPlaylist;
  favorites: SearchResult[];
  listRef: RefObject<HTMLUListElement | null>;
  delay: number;
  onClose: () => void;
}) {
  const [source, setSource] = useState<PanelSource>(favorites.length > 0 ? 'favorites' : 'recents');
  const [recents] = useState<SearchResult[]>(() => readJsonStorage<SearchResult[]>(ELVA_STORAGE_KEYS.recentlyPlayed, []));
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const requestRef = useRef(0);

  useEffect(() => {
    const q = query.trim();
    if (q.length < 2) {
      setResults([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    const id = ++requestRef.current;
    const timer = setTimeout(async () => {
      try {
        const next = await executeSearchAPI(q, 12);
        if (id === requestRef.current) setResults(next);
      } catch {
        if (id === requestRef.current) setResults([]);
      } finally {
        if (id === requestRef.current) setLoading(false);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [query]);

  const showingSearch = query.trim().length >= 2;
  const list = showingSearch ? results : source === 'favorites' ? favorites : recents;

  const add = (track: SearchResult, coverEl: HTMLElement | null) => {
    if (!addTrackToPlaylist(playlist.id, track)) return;
    flyCover(coverEl, listRef.current);
  };

  return (
    <motion.aside
      className="noir-add-panel"
      initial={{ opacity: 0, x: 24 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 16, transition: { duration: 0.16 } }}
      transition={withReducedMotion({ ...MOTION.scene, delay })}
      aria-label={strings.playlist.addSongs}
    >
      <div className="flex items-center justify-between gap-4 px-1">
        <h2 className="noir-section-title">{strings.playlist.addSongs}</h2>
        <button
          type="button"
          onClick={onClose}
          className="noir-icon-button !h-8 !w-8 elva-focus-ring"
          aria-label={strings.playlist.close}
          title={strings.playlist.close}
        >
          <X className="h-4 w-4" strokeWidth={1.75} />
        </button>
      </div>

      <label className="noir-inline-search mt-3 !max-w-none">
        <Search className="h-4 w-4 shrink-0 text-[color:var(--noir-text-tertiary)]" strokeWidth={1.75} />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Escape') {
              if (query) setQuery('');
              else onClose();
            }
          }}
          placeholder={strings.playlist.searchPlaceholder}
          className="min-w-0 flex-1 bg-transparent text-[14px] text-[color:var(--noir-text-primary)] outline-none placeholder:text-[color:var(--noir-text-tertiary)]"
        />
        {query && (
          <button type="button" onClick={() => setQuery('')} className="text-[color:var(--noir-text-tertiary)] hover:text-white" aria-label="Clear">
            <X className="h-4 w-4" strokeWidth={1.75} />
          </button>
        )}
      </label>

      {!showingSearch && (
        <div className="mt-3 flex gap-1 px-1" role="tablist">
          {(['favorites', 'recents'] as PanelSource[]).map((id) => (
            <button
              key={id}
              type="button"
              role="tab"
              aria-selected={source === id}
              data-active={source === id ? 'true' : 'false'}
              onClick={() => setSource(id)}
              className="noir-nav-item h-8 px-3 text-[12px] font-medium elva-focus-ring"
            >
              {id === 'favorites' ? strings.playlist.tabFavorites : strings.playlist.tabRecents}
            </button>
          ))}
        </div>
      )}

      <div className="noir-add-panel-list">
        {showingSearch && loading && results.length === 0 && (
          <p className="px-2 py-4 text-[13px] text-[color:var(--noir-text-tertiary)]">{strings.playlist.searching}</p>
        )}
        {showingSearch && !loading && results.length === 0 && (
          <p className="px-2 py-4 text-[13px] text-[color:var(--noir-text-secondary)]">{strings.playlist.noResults(query.trim())}</p>
        )}
        {!showingSearch && list.length === 0 && (
          <p className="px-2 py-4 text-[13px] text-[color:var(--noir-text-tertiary)]">
            {source === 'favorites' ? strings.playlist.noFavorites : strings.playlist.noRecents}
          </p>
        )}
        {list.map((track) => (
          <AddRow key={track.id} track={track} added={playlistHasTrack(playlist, track)} onAdd={add} />
        ))}
      </div>
    </motion.aside>
  );
}

function AddRow({
  track,
  added,
  onAdd,
}: {
  track: SearchResult;
  added: boolean;
  onAdd: (track: SearchResult, coverEl: HTMLElement | null) => void;
}) {
  const coverRef = useRef<HTMLImageElement>(null);
  return (
    <div className="noir-add-row" data-added={added ? 'true' : 'false'}>
      <img ref={coverRef} src={track.thumbnail} alt="" className="noir-art h-10 w-10 shrink-0 object-cover" />
      <div className="min-w-0 flex-1">
        <p className="noir-song-title truncate">{track.title}</p>
        <p className="noir-song-meta truncate">{track.artist}</p>
      </div>
      <motion.button
        type="button"
        disabled={added}
        onClick={() => onAdd(track, coverRef.current)}
        className="noir-add-icon elva-focus-ring"
        data-added={added ? 'true' : 'false'}
        aria-label={added ? strings.playlist.added : strings.playlist.add}
        title={added ? strings.playlist.added : strings.playlist.add}
        whileTap={added ? undefined : { scale: 0.88 }}
        transition={MOTION.tap}
      >
        <AnimatePresence mode="popLayout" initial={false}>
          <motion.span
            key={added ? 'added' : 'add'}
            className="flex"
            initial={{ opacity: 0, scale: 0.5, rotate: added ? -30 : 0 }}
            animate={{ opacity: 1, scale: 1, rotate: 0 }}
            exit={{ opacity: 0, scale: 0.5 }}
            transition={{ type: 'spring', stiffness: 500, damping: 26 }}
          >
            {added ? <Check className="h-4 w-4" strokeWidth={2.5} /> : <Plus className="h-4 w-4" strokeWidth={2.25} />}
          </motion.span>
        </AnimatePresence>
      </motion.button>
    </div>
  );
}
