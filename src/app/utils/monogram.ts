import type { ColorWorld } from './ditherCover';

/**
 * The liquid monogram: a name's initial in a heavy weight, fattened, blurred and re-thresholded
 * so its edges pour, with one loose drop beside it (ref: liquid M). Used where a name has no
 * picture: mixes, genres. One shape on one field, like the NOIR mark.
 */

/** The letter's colour on each field — the same partners as the Home mark. */
export const PARTNER_INK: Record<ColorWorld, string> = {
  cobalt: '#E07A9A',
  ember: '#0B0B0B',
  moss: '#EDE8DE',
  rose: '#1F3FBF',
  bone: '#E85002',
  ink: '#EDE8DE',
  sun: '#1F3FBF',
};

/** First letter that means something: skips "The", digits allowed, falls back to N. */
export function initialOf(name: string) {
  const letter = name.trim().replace(/^the\s+/i, '').charAt(0).toUpperCase();
  return /[A-ZÆØÅÄÖÜ0-9]/.test(letter) ? letter : 'N';
}

const cache = new Map<string, string>();

function monogramKey(letter: string, ink: string, px: number) {
  return `${letter}|${ink}|${px}`;
}

export function renderMonogram(letter: string, ink: string, px: number): string {
  const key = monogramKey(letter, ink, px);
  const cached = cache.get(key);
  if (cached) return cached;
  const shape = document.createElement('canvas');
  shape.width = shape.height = px;
  const sx = shape.getContext('2d')!;
  sx.fillStyle = '#000';
  sx.fillRect(0, 0, px, px);
  sx.filter = `blur(${px * 0.022}px)`;
  sx.fillStyle = '#fff';
  sx.strokeStyle = '#fff';
  sx.lineJoin = 'round';
  sx.lineWidth = px * 0.026;
  sx.font = `800 ${px * 0.62}px Outfit, sans-serif`;
  sx.textAlign = 'center';
  sx.textBaseline = 'alphabetic';
  const m = sx.measureText(letter);
  const glyphH = m.actualBoundingBoxAscent + m.actualBoundingBoxDescent;
  const baseline = px / 2 + glyphH / 2 - m.actualBoundingBoxDescent;
  const cx = px * 0.45;
  sx.fillText(letter, cx, baseline);
  sx.strokeText(letter, cx, baseline);
  // The loose drop, at the foot of the letter on the right.
  sx.beginPath();
  sx.arc(cx + m.actualBoundingBoxRight + px * 0.075, baseline - px * 0.065, px * 0.05, 0, Math.PI * 2);
  sx.fill();

  const data = sx.getImageData(0, 0, px, px).data;
  const out = document.createElement('canvas');
  out.width = out.height = px;
  const ctx = out.getContext('2d')!;
  const img = ctx.createImageData(px, px);
  const n = parseInt(ink.slice(1), 16);
  const [r, g, b] = [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  for (let i = 0; i < data.length; i += 4) {
    const v = data[i] / 255;
    // Tight threshold on the blur = rounded, poured edges.
    const a = Math.min(1, Math.max(0, (v - 0.46) / 0.06));
    img.data[i] = r;
    img.data[i + 1] = g;
    img.data[i + 2] = b;
    img.data[i + 3] = a * 255;
  }
  ctx.putImageData(img, 0, 0);
  const url = out.toDataURL('image/png');
  cache.set(key, url);
  return url;
}
