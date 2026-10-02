/** Central localStorage keys for NOIR. Data saved under the old elva_ names is moved over by migrateStorage.ts. */
export const NOIR_STORAGE_KEYS = {
  favorites: 'noir_favorites',
  playlists: 'noir_playlists',
  recentlyPlayed: 'noir_recently_played',
  playerVolume: 'noir_player_volume',
  crossfadeDuration: 'noir_crossfade_duration',
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
