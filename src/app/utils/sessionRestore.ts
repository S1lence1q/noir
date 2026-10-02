import type { SearchResult } from '../types';

const SHELL_TAB_KEY = 'noir_shell_tab';
const SHELL_UI_KEY = 'noir_shell_ui_v1';
const PLAYBACK_SESSION_KEY = 'noir_playback_session_v1';
const MAX_AGE_MS = 12 * 60 * 60 * 1000;

export type ShellTab = 'search' | 'discover' | 'myhub' | 'settings';

export type ShellUiSession = {
  activeTab: ShellTab;
  nowPlayingOpen: boolean;
  libraryOpenPlaylistId: string | null;
  libraryFocusSection: 'favorites' | 'playlists';
};

export type PlaybackSongSession = {
  id?: string;
  title: string;
  artist: string;
  artworkUrl: string;
  audioUrl: string;
  videoId?: string;
  channelId?: string;
};

export type PlaybackSession = {
  song: PlaybackSongSession;
  queue: SearchResult[];
  queueSource: string | null;
  currentTime: number;
  wasPlaying: boolean;
  savedAt: number;
};

const VALID_TABS: ShellTab[] = ['search', 'discover', 'myhub', 'settings'];

function readSessionJson<T>(key: string, fallback: T): T {
  try {
    const raw = sessionStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function writeSessionJson(key: string, value: unknown): void {
  try {
    sessionStorage.setItem(key, JSON.stringify(value));
  } catch (e) {
    console.warn(`Failed to write sessionStorage key "${key}":`, e);
  }
}

function isFresh(savedAt: number): boolean {
  return Number.isFinite(savedAt) && Date.now() - savedAt < MAX_AGE_MS;
}

/** Drop blob: URLs — they die on reload. */
function sanitizeTrack(track: SearchResult): SearchResult {
  if (!track.audioUrl?.startsWith('blob:')) return track;
  return { ...track, audioUrl: undefined };
}

function sanitizeSong(song: PlaybackSongSession): PlaybackSongSession | null {
  if (!song?.title) return null;
  if (song.audioUrl?.startsWith('blob:') && !song.videoId) return null;
  return {
    ...song,
    audioUrl: song.audioUrl?.startsWith('blob:') ? '' : song.audioUrl,
  };
}

export function readShellTab(): ShellTab {
  try {
    const raw = sessionStorage.getItem(SHELL_TAB_KEY);
    if (raw && VALID_TABS.includes(raw as ShellTab)) return raw as ShellTab;
  } catch {
    /* ignore */
  }
  return 'search';
}

export function writeShellTab(tab: ShellTab): void {
  try {
    sessionStorage.setItem(SHELL_TAB_KEY, tab);
  } catch {
    /* ignore */
  }
}

export function readShellUiSession(): ShellUiSession | null {
  const data = readSessionJson<ShellUiSession | null>(SHELL_UI_KEY, null);
  if (!data || !VALID_TABS.includes(data.activeTab)) return null;
  return {
    activeTab: data.activeTab,
    nowPlayingOpen: !!data.nowPlayingOpen,
    libraryOpenPlaylistId: data.libraryOpenPlaylistId ?? null,
    libraryFocusSection: data.libraryFocusSection === 'playlists' ? 'playlists' : 'favorites',
  };
}

export function writeShellUiSession(ui: ShellUiSession): void {
  writeSessionJson(SHELL_UI_KEY, ui);
  writeShellTab(ui.activeTab);
}

export function readPlaybackSession(): PlaybackSession | null {
  const data = readSessionJson<PlaybackSession | null>(PLAYBACK_SESSION_KEY, null);
  if (!data?.song || !isFresh(data.savedAt)) return null;
  const song = sanitizeSong(data.song);
  if (!song) return null;
  const queue = Array.isArray(data.queue) ? data.queue.map(sanitizeTrack) : [];
  return {
    song,
    queue,
    queueSource: data.queueSource ?? null,
    currentTime: typeof data.currentTime === 'number' ? Math.max(0, data.currentTime) : 0,
    wasPlaying: !!data.wasPlaying,
    savedAt: data.savedAt,
  };
}

export function writePlaybackSession(session: Omit<PlaybackSession, 'savedAt'>): void {
  const song = sanitizeSong(session.song);
  if (!song) {
    clearPlaybackSession();
    return;
  }
  writeSessionJson(PLAYBACK_SESSION_KEY, {
    ...session,
    song,
    queue: session.queue.map(sanitizeTrack),
    savedAt: Date.now(),
  } satisfies PlaybackSession);
}

export function clearPlaybackSession(): void {
  try {
    sessionStorage.removeItem(PLAYBACK_SESSION_KEY);
  } catch {
    /* ignore */
  }
}
