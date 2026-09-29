import type { ColorWorld } from './ditherCover';
import { applyHeat, buildRamp, seededRandom, type RampStop } from './grainRender';

/**
 * A user playlist's cover: a small heat creature (ref: blurred figures on blue). The body is
 * seeded by the playlist id, so it's that playlist's own; it grows a limb every few songs, so an
 * empty playlist is an egg and a full one reaches out. Same inputs → same image.
 */

export const HEAT_RAMPS: Record<ColorWorld, RampStop[]> = {
  cobalt: [[0, '#2350DC'], [0.07, '#2C58E0'], [0.2, '#8FA5EE'], [0.31, '#F6E8D6'], [0.45, '#F4AE96'], [0.64, '#DB8DA8'], [0.84, '#A087D8'], [1, '#8C90E8']],
  ember: [[0, '#E85002'], [0.08, '#EE6420'], [0.2, '#F7A777'], [0.31, '#FFE6CF'], [0.45, '#FFC09A'], [0.64, '#E5763F'], [0.84, '#9C2E06'], [1, '#5E1702']],
  moss: [[0, '#2F7A3E'], [0.08, '#3A8849'], [0.2, '#9CC48C'], [0.31, '#EEF2DA'], [0.45, '#D6E7A8'], [0.64, '#8CC07A'], [0.84, '#3F8A4F'], [1, '#1D5530']],
  rose: [[0, '#E07A9A'], [0.08, '#E488A5'], [0.2, '#F2BCC6'], [0.31, '#FFF1E8'], [0.45, '#FFC7AE'], [0.64, '#E89AB0'], [0.84, '#A585D6'], [1, '#7F7FE0']],
  bone: [[0, '#EDE8DE'], [0.08, '#E6DFD2'], [0.2, '#EDC2A6'], [0.31, '#F08A55'], [0.45, '#E85002'], [0.64, '#A8360A'], [0.84, '#4A1A0A'], [1, '#0B0B0B']],
  ink: [[0, '#141414'], [0.08, '#1C1C1C'], [0.2, '#5A5650'], [0.31, '#EDE8DE'], [0.45, '#F4AE96'], [0.64, '#DB8DA8'], [0.84, '#A087D8'], [1, '#2350DC']],
};

const rampCache = new Map<ColorWorld, Uint8ClampedArray>();
const imageCache = new Map<string, string>();

function ramp(world: ColorWorld) {
  let lut = rampCache.get(world);
  if (!lut) {
    lut = buildRamp(HEAT_RAMPS[world]);
    rampCache.set(world, lut);
  }
  return lut;
}

/** Limbs for a track count: 0 songs = egg, then one limb per ~3 songs, up to six. */
export function heatFigureLimbs(trackCount: number) {
  return trackCount <= 0 ? 0 : Math.min(6, 1 + Math.floor((trackCount - 1) / 3));
}

/** `compact`: thumbnail sizes (sidebar), where the figure fills more of the frame so it reads as art, not an icon. */
export function renderHeatFigure(
  seed: string,
  trackCount: number,
  world: ColorWorld,
  px: number,
  compact = false
): string {
  const limbs = heatFigureLimbs(trackCount);
  const key = `${seed}|${limbs}|${world}|${px}|${compact ? 'c' : ''}`;
  const cached = imageCache.get(key);
  if (cached) return cached;

  const shape = document.createElement('canvas');
  shape.width = px;
  shape.height = px;
  const sx = shape.getContext('2d');
  if (!sx) return '';
  sx.fillStyle = '#000';
  sx.fillRect(0, 0, px, px);
  sx.filter = `blur(${Math.max(1, px * (compact ? 0.06 : 0.045))}px)`;
  sx.fillStyle = '#fff';
  sx.strokeStyle = '#fff';
  sx.lineCap = 'round';
  sx.lineJoin = 'round';

  // The body only depends on the playlist; limbs are added in a fixed order, so a new song
  // grows the same creature instead of redrawing a different one.
  const rand = seededRandom(`figure:${seed}`);
  // Geometry in unit space around the body, then fitted and centred in the frame.
  const bodyR = limbs === 0 ? 0.2 : 0.095 + rand() * 0.03;
  const bodyStretch = 1.05 + rand() * 0.25;
  const bodyTilt = rand() * Math.PI;
  const start = rand() * Math.PI * 2;
  const plan = Array.from({ length: 6 }, (_, i) => {
    const angle = start + (i * Math.PI * 2) / 6 + (rand() - 0.5) * 0.7;
    const length = 0.27 + rand() * 0.15;
    const bend = (rand() - 0.5) * 1.4;
    const hand = rand() > 0.35;
    const ex = Math.cos(angle) * length;
    const ey = Math.sin(angle) * length;
    const mx = ex / 2 + Math.cos(angle + Math.PI / 2) * length * bend * 0.35;
    const my = ey / 2 + Math.sin(angle + Math.PI / 2) * length * bend * 0.35;
    return { ex, ey, mx, my, hand };
  });
  // An empty playlist is an egg with a nub (a perfect circle reads as a button), not a limb yet.
  const egg = plan[0];
  const shown = limbs === 0
    ? [{ ex: egg.ex * 0.95, ey: egg.ey * 0.95, mx: egg.ex * 0.5, my: egg.ey * 0.5, hand: false }]
    : plan.slice(0, limbs);

  const reach = bodyR * bodyStretch;
  let minX = -reach, maxX = reach, minY = -reach, maxY = reach;
  for (const limb of shown) {
    // Curve midpoint (not the control point) plus the tip, padded by the stroke / hand.
    const qx = limb.mx / 2 + limb.ex / 4;
    const qy = limb.my / 2 + limb.ey / 4;
    for (const [x, y] of [[qx, qy], [limb.ex, limb.ey]]) {
      minX = Math.min(minX, x - 0.06);
      maxX = Math.max(maxX, x + 0.06);
      minY = Math.min(minY, y - 0.06);
      maxY = Math.max(maxY, y + 0.06);
    }
  }
  const fit = Math.min(1.3, (compact ? 1 : 0.74) / Math.max(maxX - minX, maxY - minY));
  const scale = px * fit;
  sx.setTransform(scale, 0, 0, scale, px / 2 - ((minX + maxX) / 2) * scale, px / 2 - ((minY + maxY) / 2) * scale);

  sx.beginPath();
  sx.ellipse(0, 0, bodyR, bodyR * bodyStretch, bodyTilt, 0, Math.PI * 2);
  sx.fill();
  sx.lineWidth = 0.078;
  for (const limb of shown) {
    sx.beginPath();
    sx.moveTo(0, 0);
    sx.quadraticCurveTo(limb.mx, limb.my, limb.ex, limb.ey);
    sx.stroke();
    if (limb.hand) {
      sx.beginPath();
      sx.arc(limb.ex, limb.ey, 0.06, 0, Math.PI * 2);
      sx.fill();
    }
  }
  sx.setTransform(1, 0, 0, 1, 0, 0);

  const out = document.createElement('canvas');
  out.width = px;
  out.height = px;
  const ctx = out.getContext('2d');
  if (!ctx) return '';
  const image = ctx.createImageData(px, px);
  applyHeat(sx.getImageData(0, 0, px, px).data, image.data, ramp(world), seededRandom(key), px < 80 ? 12 : 22);
  ctx.putImageData(image, 0, 0);
  const url = out.toDataURL('image/png');
  imageCache.set(key, url);
  return url;
}
