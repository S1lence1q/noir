/**
 * Whether the extra (experimental) lyrics source may be asked. On by default; the listener can switch it off
 * in Settings. It only exists at all when the build has VITE_LYRICS_PROXY_URL.
 */
const KEY = 'noir_lyrics_extra_source';

export const EXTRA_LYRICS_SOURCE_AVAILABLE = Boolean(import.meta.env?.VITE_LYRICS_PROXY_URL);

export function readExtraLyricsSource(): boolean {
  try {
    return localStorage.getItem(KEY) !== 'off';
  } catch {
    return true;
  }
}

export function setExtraLyricsSource(on: boolean) {
  try {
    localStorage.setItem(KEY, on ? 'on' : 'off');
  } catch {
    /* private mode: lasts for this session only */
  }
}
