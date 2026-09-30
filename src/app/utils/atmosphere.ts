/** Now Playing background: a soft colour glow from the cover (default) or its colours as dither grain. */
export type AtmosphereMode = 'glow' | 'grain';

const ATMOSPHERE_KEY = 'noir_atmosphere';
export const ATMOSPHERE_EVENT = 'noir-atmosphere-change';

/** `?atmosphere=grain|glow` still works (and is remembered) for quick A/B links. */
export function readAtmosphereMode(): AtmosphereMode {
  try {
    const param = new URLSearchParams(window.location.search).get('atmosphere');
    if (param === 'grain' || param === 'glow') localStorage.setItem(ATMOSPHERE_KEY, param);
    return localStorage.getItem(ATMOSPHERE_KEY) === 'grain' ? 'grain' : 'glow';
  } catch {
    return 'glow';
  }
}

export function setAtmosphereMode(mode: AtmosphereMode) {
  try {
    localStorage.setItem(ATMOSPHERE_KEY, mode);
  } catch {
    /* private mode: still applies for this session via the event */
  }
  window.dispatchEvent(new CustomEvent(ATMOSPHERE_EVENT, { detail: { mode } }));
}
