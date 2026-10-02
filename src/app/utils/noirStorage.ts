/** Central localStorage keys for NOIR (values keep their old elva_ prefix so saved data survives) — single place to find and migrate persisted data. */
export const NOIR_STORAGE_KEYS = {
  favorites: 'elva_favorites',
  playlists: 'elva_playlists',
  recentlyPlayed: 'elva_recently_played',
  playerVolume: 'elva_player_volume',
  crossfadeDuration: 'elva_crossfade_duration',
} as const;

export function readJsonStorage<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

export function writeJsonStorage(key: string, value: unknown): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (e) {
    console.warn(`Failed to write localStorage key "${key}":`, e);
  }
}
