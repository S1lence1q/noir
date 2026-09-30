/**
 * Shared bits for NOIR's generated graphics (heat form, halftone clock): a seeded PRNG so a
 * graphic is the same every time for the same data, and a colour ramp lookup.
 */

export function seededRandom(seed: string): () => number {
  let h = 1779033703 ^ seed.length;
  for (let i = 0; i < seed.length; i++) {
    h = Math.imul(h ^ seed.charCodeAt(i), 3432918353);
    h = (h << 13) | (h >>> 19);
  }
  let a = h >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export type RampStop = [at: number, hex: string];

/** 256-entry RGB lookup for a ramp over 0..1. */
export function buildRamp(stops: RampStop[]): Uint8ClampedArray {
  const rgb = stops.map(([at, hex]) => {
    const n = parseInt(hex.slice(1), 16);
    return [at, (n >> 16) & 255, (n >> 8) & 255, n & 255] as const;
  });
  const lut = new Uint8ClampedArray(256 * 3);
  for (let i = 0; i < 256; i++) {
    const v = i / 255;
    let k = 0;
    while (k < rgb.length - 2 && v > rgb[k + 1][0]) k++;
    const [a0, r0, g0, b0] = rgb[k];
    const [a1, r1, g1, b1] = rgb[k + 1];
    const t = Math.min(1, Math.max(0, (v - a0) / (a1 - a0 || 1)));
    lut[i * 3] = r0 + (r1 - r0) * t;
    lut[i * 3 + 1] = g0 + (g1 - g0) * t;
    lut[i * 3 + 2] = b0 + (b1 - b0) * t;
  }
  return lut;
}

export function smoothstep(e0: number, e1: number, x: number) {
  const t = Math.min(1, Math.max(0, (x - e0) / (e1 - e0)));
  return t * t * (3 - 2 * t);
}

/**
 * Heat pipeline: a blurred white-on-black shape (red channel = heat) → ramp colour, with noise
 * on the heat (dissolving edges) and on the colour (field grain). Writes into `out`.
 */
export function applyHeat(
  shape: Uint8ClampedArray,
  out: Uint8ClampedArray,
  ramp: Uint8ClampedArray,
  rand: () => number,
  grain = 22
) {
  for (let i = 0; i < shape.length; i += 4) {
    const heat = shape[i] / 255 + (rand() - 0.5) * 0.09;
    const k = Math.max(0, Math.min(255, Math.round(heat * 255))) * 3;
    const g = (rand() - 0.5) * grain;
    out[i] = ramp[k] + g;
    out[i + 1] = ramp[k + 1] + g;
    out[i + 2] = ramp[k + 2] + g;
    out[i + 3] = 255;
  }
}
