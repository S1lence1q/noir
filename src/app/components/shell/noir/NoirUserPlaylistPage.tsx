import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion, Reorder } from 'motion/react';
import { ArrowLeft, Check, MoreHorizontal, Pencil, Play, Plus, Search, Shuffle, Trash2, X } from 'lucide-react';
import { SearchResult } from '../../../types';
import { strings } from '../../../constants/strings';
import { isTrackFavorite } from '../../../utils/favoriteUtils';
import { worldForCollection } from '../../../utils/ditherCover';
import { MOTION, withReducedMotion } from '../../../utils/motionPresets';
import { executeSearchAPI } from '../../../utils/api/pipedSearch';
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

export function NoirUserPlaylistPage({
  playlist,
  favorites,
  onBack,
  onAddToQueue,
  onPlayPlaylist,
  onPlayNext,
  onToggleFavorite,
}: NoirUserPlaylistPageProps) {
  const [editing, setEditing] = useState(() => consumePendingRename(playlist.id));
  const [draft, setDraft] = useState(playlist.name);
  const [menuOpen, setMenuOpen] = useState(false);
  const [order, setOrder] = useState(() => playlist.tracks.map((t) => t.id));
  const titleInputRef = useRef<HTMLInputElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setOrder(playlist.tracks.map((t) => t.id));
  }, [playlist.tracks]);

  useEffect(() => {
    if (!editing) setDraft(playlist.name);
  }, [playlist.name, editing]);

  useEffect(() => {
    if (!editing) return;
    const input = titleInputRef.current;
    input?.focus();
    input?.select();
  }, [editing]);

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

  const hasTracks = orderedTracks.length > 0;

  return (
    <div className="flex flex-col pb-6">
      <button type="button" onClick={onBack} className="noir-back-link elva-focus-ring">
        <ArrowLeft className="h-4 w-4" strokeWidth={1.75} />
        {strings.playlist.back}
      </button>

      <header className="mt-5 flex items-end gap-6">
        <NoirDitherCover
          source={orderedTracks[0]?.thumbnail}
          world={worldForCollection(playlist.id)}
          seed={playlist.id}
          size={200}
        />
        <div className="min-w-0 flex-1 pb-1">
          <p className="noir-label">{strings.playlist.label}</p>
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
          <p className="mt-2 text-[13px] text-[color:var(--noir-text-secondary)]">
            {strings.playlist.songCount(orderedTracks.length)}
          </p>

          <div className="mt-5 flex items-center gap-2">
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
          </div>
        </div>
      </header>

      <PlaylistAddSection playlist={playlist} favorites={favorites} startOpen={!hasTracks} />

      <Reorder.Group axis="y" values={order} onReorder={setOrder} className="mt-8 flex flex-col gap-0.5">
        <AnimatePresence initial={false}>
          {orderedTracks.map((track, i) => (
            <PlaylistTrackItem
              key={track.id}
              track={track}
              index={i}
              isFavorite={isTrackFavorite(favorites, track)}
              onDragEnd={() => reorderPlaylist(playlist.id, order)}
              onPlay={() => onPlayPlaylist(orderedTracks, playlist.name, i)}
              onRemove={() => handleRemove(track)}
              onAddToQueue={onAddToQueue}
              onPlayNext={onPlayNext}
              onToggleFavorite={onToggleFavorite}
            />
          ))}
          {!hasTracks && (
            <motion.li
              key="empty"
              className="noir-playlist-empty-row"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0, transition: { duration: 0.12 } }}
            >
              <span className="noir-playlist-empty-slot" aria-hidden />
              <span className="text-[13px] text-[color:var(--noir-text-tertiary)]">{strings.playlist.emptyRow}</span>
            </motion.li>
          )}
        </AnimatePresence>
      </Reorder.Group>
    </div>
  );
}

type PlaylistTrackItemProps = {
  track: SearchResult;
  index: number;
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
        onPlay={() => {
          if (!draggedRef.current) onPlay();
        }}
        onAddToQueue={onAddToQueue}
        onPlayNext={onPlayNext}
        onToggleFavorite={onToggleFavorite}
        extraAction={
          <button
            type="button"
            onClick={onRemove}
            className="flex h-9 w-9 items-center justify-center rounded-full text-[color:var(--noir-text-secondary)] hover:bg-white/[0.08] hover:text-white"
            aria-label={strings.playlist.removeFromPlaylist}
            title={strings.playlist.removeFromPlaylist}
          >
            <X className="h-4 w-4" strokeWidth={2} />
          </button>
        }
      />
    </Reorder.Item>
  );
}

function PlaylistAddSection({
  playlist,
  favorites,
  startOpen,
}: {
  playlist: UserPlaylist;
  favorites: SearchResult[];
  startOpen: boolean;
}) {
  const pickSuggestions = () => favorites.filter((t) => !playlistHasTrack(playlist, t)).slice(0, 5);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(startOpen);
  // Snapshot on open: added rows stay in place (showing "Added") so nothing shifts under the cursor.
  const [suggestions, setSuggestions] = useState<SearchResult[]>(() => (startOpen ? pickSuggestions() : []));
  const requestRef = useRef(0);

  const openSection = () => {
    setSuggestions(pickSuggestions());
    setOpen(true);
  };

  const closeSection = () => {
    setQuery('');
    setOpen(false);
  };

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
        const next = await executeSearchAPI(q, 8);
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
  const list = showingSearch ? results : suggestions;

  const add = (track: SearchResult) => {
    if (addTrackToPlaylist(playlist.id, track)) {
      noirToast({ text: strings.playlist.addedTo(playlist.name), cover: track.thumbnail });
    }
  };

  return (
    <div className="mt-8">
      <AnimatePresence initial={false} mode="popLayout">
        {!open ? (
          <motion.button
            key="add-button"
            type="button"
            onClick={openSection}
            className="noir-button-secondary elva-focus-ring"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0, transition: { duration: 0.1 } }}
            transition={withReducedMotion(MOTION.panel)}
          >
            <Plus className="h-3.5 w-3.5" strokeWidth={2.25} />
            {strings.playlist.addSongs}
          </motion.button>
        ) : (
          <motion.section
            key="add-section"
            className="noir-add-panel"
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4, transition: { duration: 0.14 } }}
            transition={withReducedMotion(MOTION.panel)}
          >
            <div className="mb-3 flex items-center justify-between gap-4">
              <h2 className="noir-section-title">{strings.playlist.addSongs}</h2>
              <button
                type="button"
                onClick={closeSection}
                className="noir-icon-button !h-8 !w-8 elva-focus-ring"
                aria-label={strings.playlist.close}
                title={strings.playlist.close}
              >
                <X className="h-4 w-4" strokeWidth={1.75} />
              </button>
            </div>

      <label className="noir-inline-search">
        <Search className="h-4 w-4 shrink-0 text-[color:var(--noir-text-tertiary)]" strokeWidth={1.75} />
        <input
          value={query}
          autoFocus={!startOpen}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Escape') {
              if (query) setQuery('');
              else closeSection();
            }
          }}
          placeholder={strings.playlist.searchPlaceholder}
          className="min-w-0 flex-1 bg-transparent text-[14px] text-[color:var(--noir-text-primary)] outline-none placeholder:text-[color:var(--noir-text-tertiary)]"
        />
        {query && (
          <button
            type="button"
            onClick={() => setQuery('')}
            className="text-[color:var(--noir-text-tertiary)] hover:text-white"
            aria-label="Clear"
          >
            <X className="h-4 w-4" strokeWidth={1.75} />
          </button>
        )}
      </label>

      <div className="mt-4">
        {!showingSearch && suggestions.length > 0 && <p className="noir-label mb-2 px-3">{strings.playlist.suggested}</p>}
        {showingSearch && loading && results.length === 0 && (
          <p className="px-3 py-4 text-[13px] text-[color:var(--noir-text-tertiary)]">{strings.playlist.searching}</p>
        )}
        {showingSearch && !loading && results.length === 0 && (
          <p className="px-3 py-4 text-[13px] text-[color:var(--noir-text-secondary)]">{strings.playlist.noResults(query.trim())}</p>
        )}
        <div className="flex flex-col gap-0.5">
          {list.map((track) => {
            const inPlaylist = playlistHasTrack(playlist, track);
            return (
              <div key={track.id} className="noir-add-row">
                <img src={track.thumbnail} alt="" className="noir-art h-10 w-10 shrink-0 object-cover" />
                <div className="min-w-0 flex-1">
                  <p className="noir-song-title truncate">{track.title}</p>
                  <p className="noir-song-meta truncate">{track.artist}</p>
                </div>
                <motion.button
                  type="button"
                  disabled={inPlaylist}
                  onClick={() => add(track)}
                  className="noir-add-button elva-focus-ring"
                  data-added={inPlaylist ? 'true' : 'false'}
                  whileTap={inPlaylist ? undefined : { scale: 0.94 }}
                  transition={MOTION.tap}
                >
                  <AnimatePresence mode="popLayout" initial={false}>
                    <motion.span
                      key={inPlaylist ? 'added' : 'add'}
                      className="flex items-center gap-1.5"
                      initial={{ opacity: 0, scale: 0.7 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.7 }}
                      transition={withReducedMotion(MOTION.panel)}
                    >
                      {inPlaylist ? <Check className="h-3.5 w-3.5" strokeWidth={2.25} /> : <Plus className="h-3.5 w-3.5" strokeWidth={2.25} />}
                      {inPlaylist ? strings.playlist.added : strings.playlist.add}
                    </motion.span>
                  </AnimatePresence>
                </motion.button>
              </div>
            );
          })}
        </div>
      </div>
          </motion.section>
        )}
      </AnimatePresence>
    </div>
  );
}
