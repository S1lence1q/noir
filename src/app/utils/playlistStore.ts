import { useEffect, useState } from 'react';
import { SearchResult } from '../types';
import { NOIR_STORAGE_KEYS, readJsonStorage, writeJsonStorage } from './noirStorage';
import { getPlaybackSongKey } from './playbackSongKey';

export type UserPlaylist = {
  id: string;
  name: string;
  color: string;
  tracks: SearchResult[];
};

export const PLAYLIST_TRACK_DRAG_MIME = 'application/x-noir-track';

export function encodePlaylistTrack(track: SearchResult): string {
  return JSON.stringify(track);
}

export function decodePlaylistTrack(value: string | null): SearchResult | null {
  if (!value) return null;
  try {
    const track = JSON.parse(value) as Partial<SearchResult>;
    if (
      typeof track.id !== 'string' ||
      typeof track.title !== 'string' ||
      typeof track.artist !== 'string' ||
      typeof track.thumbnail !== 'string'
    ) {
      return null;
    }
    return track as SearchResult;
  } catch {
    return null;
  }
}

const UPDATED_EVENT = 'noir-playlists-updated';

/** Set by `createPlaylist`; the playlist page consumes it to open with the title in edit mode. */
let pendingRenameId: string | null = null;

export function readPlaylists(): UserPlaylist[] {
  return readJsonStorage<UserPlaylist[]>(NOIR_STORAGE_KEYS.playlists, []);
}

function writePlaylists(next: UserPlaylist[]) {
  writeJsonStorage(NOIR_STORAGE_KEYS.playlists, next);
  window.dispatchEvent(new CustomEvent(UPDATED_EVENT));
}

function update(id: string, fn: (playlist: UserPlaylist) => UserPlaylist) {
  writePlaylists(readPlaylists().map((p) => (p.id === id ? fn(p) : p)));
}

function sameTrack(a: SearchResult, b: SearchResult) {
  if (a.id === b.id) return true;
  const ka = getPlaybackSongKey(a);
  return ka !== null && ka === getPlaybackSongKey(b);
}

export function nextPlaylistName(existing: UserPlaylist[] = readPlaylists()): string {
  const taken = new Set(existing.map((p) => p.name));
  let n = existing.length + 1;
  while (taken.has(`Playlist #${n}`)) n += 1;
  return `Playlist #${n}`;
}

export function createPlaylist(tracks: SearchResult[] = []): UserPlaylist {
  const existing = readPlaylists();
  const playlist: UserPlaylist = {
    id: Date.now().toString(),
    name: nextPlaylistName(existing),
    color: 'neutral',
    tracks,
  };
  writePlaylists([...existing, playlist]);
  pendingRenameId = playlist.id;
  return playlist;
}

export function consumePendingRename(id: string): boolean {
  if (pendingRenameId !== id) return false;
  pendingRenameId = null;
  return true;
}

export function renamePlaylist(id: string, name: string) {
  const trimmed = name.trim();
  if (!trimmed) return;
  update(id, (p) => ({ ...p, name: trimmed }));
}

/** Returns a restore function for Undo. */
export function deletePlaylist(id: string): () => void {
  const all = readPlaylists();
  const index = all.findIndex((p) => p.id === id);
  if (index < 0) return () => {};
  const removed = all[index];
  writePlaylists(all.filter((p) => p.id !== id));
  return () => {
    const current = readPlaylists();
    if (current.some((p) => p.id === removed.id)) return;
    const next = [...current];
    next.splice(Math.min(index, next.length), 0, removed);
    writePlaylists(next);
  };
}

export function playlistHasTrack(playlist: UserPlaylist, track: SearchResult) {
  return playlist.tracks.some((t) => sameTrack(t, track));
}

/** Returns false when the track was already in the playlist. */
export function addTrackToPlaylist(id: string, track: SearchResult): boolean {
  const playlist = readPlaylists().find((p) => p.id === id);
  if (!playlist || playlistHasTrack(playlist, track)) return false;
  update(id, (p) => ({ ...p, tracks: [...p.tracks, track] }));
  return true;
}

/** Returns a restore function for Undo. */
export function removeTrackFromPlaylist(id: string, trackId: string): () => void {
  const playlist = readPlaylists().find((p) => p.id === id);
  const index = playlist?.tracks.findIndex((t) => t.id === trackId) ?? -1;
  if (!playlist || index < 0) return () => {};
  const removed = playlist.tracks[index];
  update(id, (p) => ({ ...p, tracks: p.tracks.filter((t) => t.id !== trackId) }));
  return () =>
    update(id, (p) => {
      if (p.tracks.some((t) => t.id === removed.id)) return p;
      const tracks = [...p.tracks];
      tracks.splice(Math.min(index, tracks.length), 0, removed);
      return { ...p, tracks };
    });
}

export function reorderPlaylist(id: string, orderedTrackIds: string[]) {
  update(id, (p) => {
    const byId = new Map(p.tracks.map((t) => [t.id, t]));
    const tracks = orderedTrackIds.map((tid) => byId.get(tid)).filter((t): t is SearchResult => !!t);
    return tracks.length === p.tracks.length ? { ...p, tracks } : p;
  });
}

export function usePlaylists(): UserPlaylist[] {
  const [playlists, setPlaylists] = useState<UserPlaylist[]>(readPlaylists);
  useEffect(() => {
    const sync = () => setPlaylists(readPlaylists());
    window.addEventListener(UPDATED_EVENT, sync);
    window.addEventListener('storage', sync);
    return () => {
      window.removeEventListener(UPDATED_EVENT, sync);
      window.removeEventListener('storage', sync);
    };
  }, []);
  return playlists;
}
