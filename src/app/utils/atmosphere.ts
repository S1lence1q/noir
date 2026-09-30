/**
 * Now Playing background: a NOIR plate in the song's colour (default), a soft colour glow from the
 * cover, or the cover's colours as dither grain.
 */
export type AtmosphereMode = 'plate' | 'glow' | 'grain';

const MODES: AtmosphereMode[] = ['plate', 'glow', 'grain'];
const isMode = (value: string | null): value is AtmosphereMode => MODES.includes(value as AtmosphereMode);

// v2: the plate arrived as the new default; an old stored 'glow' was usually just never changed.
const ATMOSPHERE_KEY = 'noir_atmosphere_v2';
export const ATMOSPHERE_EVENT = 'noir-atmosphere-change';

/** `?atmosphere=plate|glow|grain` still works (and is remembered) for quick A/B links. */
export function readAtmosphereMode(): AtmosphereMode {
  try {
    const param = new URLSearchParams(window.location.search).get('atmosphere');
    if (isMode(param)) localStorage.setItem(ATMOSPHERE_KEY, param);
    const stored = localStorage.getItem(ATMOSPHERE_KEY);
    return isMode(stored) ? stored : 'plate';
  } catch {
    return 'plate';
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
