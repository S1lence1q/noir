/** Whether the extra lyrics source (Apple Music, third party) may be asked. On by default; switch off in Settings. */
const KEY = 'noir_lyrics_extra_source';

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
