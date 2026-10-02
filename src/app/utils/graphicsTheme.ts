import { useEffect, useState } from 'react';

/**
 * One choice for how NOIR's generated graphics look, read by every surface that has both:
 *   grain: the cover's colours as dither (Now Playing background, History hero)
 *   heat:  soft colour (a glow behind Now Playing, a glowing form on a colour field in History)
 */
export type GraphicsTheme = 'grain' | 'heat';

const KEY = 'noir_graphics';
const LEGACY_KEY = 'noir_atmosphere';
const EVENT = 'noir-graphics-change';

/** `?graphics=grain|heat` still works (and is remembered) for quick A/B links. */
function readGraphicsTheme(): GraphicsTheme {
  try {
    const param = new URLSearchParams(window.location.search).get('graphics');
    if (param === 'grain' || param === 'heat') localStorage.setItem(KEY, param);
    const stored = localStorage.getItem(KEY);
    if (stored === 'grain' || stored === 'heat') return stored;
    // From the old Now Playing-only setting: keep what someone already picked.
    return localStorage.getItem(LEGACY_KEY) === 'grain' ? 'grain' : 'heat';
  } catch {
    return 'heat';
  }
}

export function setGraphicsTheme(theme: GraphicsTheme) {
  try {
    localStorage.setItem(KEY, theme);
  } catch {
    /* private mode: still applies for this session via the event */
  }
  window.dispatchEvent(new CustomEvent(EVENT, { detail: { theme } }));
}

export function useGraphicsTheme(): GraphicsTheme {
  const [theme, setTheme] = useState(readGraphicsTheme);
  useEffect(() => {
    const onChange = (e: Event) => {
      const next = (e as CustomEvent<{ theme?: GraphicsTheme }>).detail?.theme;
      if (next) setTheme(next);
    };
    window.addEventListener(EVENT, onChange);
    return () => window.removeEventListener(EVENT, onChange);
  }, []);
  return theme;
}
