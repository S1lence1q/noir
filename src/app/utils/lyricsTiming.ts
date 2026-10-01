import { useEffect, useState } from 'react';

/** Advanced setting: show nudge buttons for lyrics timing. Off by default; saved offsets apply either way. */
const KEY = 'noir_lyrics_timing_controls';
const EVENT = 'noir-lyrics-timing-controls-change';

export function readLyricsTimingControls(): boolean {
  try {
    return localStorage.getItem(KEY) === 'on';
  } catch {
    return false;
  }
}

export function setLyricsTimingControls(on: boolean) {
  try {
    localStorage.setItem(KEY, on ? 'on' : 'off');
  } catch {
    /* private mode: still applies for this session via the event */
  }
  window.dispatchEvent(new CustomEvent(EVENT, { detail: { on } }));
}

export function useLyricsTimingControls(): boolean {
  const [on, setOn] = useState(readLyricsTimingControls);
  useEffect(() => {
    const sync = () => setOn(readLyricsTimingControls());
    window.addEventListener(EVENT, sync);
    return () => window.removeEventListener(EVENT, sync);
  }, []);
  return on;
}
