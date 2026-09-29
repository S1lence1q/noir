import { useMemo } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import type { SearchResult } from '../../../types';
import { hashString, worldForCollection, type ColorWorld } from '../../../utils/ditherCover';
import { HEAT_RAMPS, renderHeatFigure } from '../../../utils/heatFigure';
import { NoirMark } from './NoirMark';

/**
 * Home hero graphic: ONE simple object on a flat field (the lesson from the playlist creature
 * and the Favorites asterisk). The field follows the song's artist. Candidates while we choose:
 *   1 · the song's creature — every song has its own; sways gently while playing
 *   2 · the NOIR mark, large — turns very slowly while playing
 *   3 · a liquid monogram — the artist's initial, poured, with a loose drop (ref: liquid M)
 */

export type HomeHeroVariant = '1' | '2' | '3';

/** Ink would vanish on the black page; the hero uses cobalt for those artists instead. */
export function heroWorld(track: SearchResult): ColorWorld {
  const world = worldForCollection(track.artist || track.id);
  return world === 'ink' ? 'cobalt' : world;
}

/** The field colour matches the creature's own ramp, so the image sits seamlessly on the card. */
export const heroField = (world: ColorWorld) => HEAT_RAMPS[world][0][1];
export const heroInk = (world: ColorWorld) => (world === 'cobalt' ? '#F2EEE6' : '#0B0B0B');

const monogramCache = new Map<string, string>();

/** The initial in a heavy weight, fattened, blurred and re-thresholded: edges pour like liquid. */
function renderMonogram(letter: string, ink: string, px: number): string {
  const key = `${letter}|${ink}|${px}`;
  const cached = monogramCache.get(key);
  if (cached) return cached;
  const shape = document.createElement('canvas');
  shape.width = shape.height = px;
  const sx = shape.getContext('2d')!;
  sx.fillStyle = '#000';
  sx.fillRect(0, 0, px, px);
  sx.filter = `blur(${px * 0.028}px)`;
  sx.fillStyle = '#fff';
  sx.strokeStyle = '#fff';
  sx.lineJoin = 'round';
  sx.lineWidth = px * 0.05;
  sx.font = `800 ${px * 0.72}px Outfit, sans-serif`;
  sx.textAlign = 'center';
  sx.textBaseline = 'alphabetic';
  const m = sx.measureText(letter);
  const glyphH = m.actualBoundingBoxAscent + m.actualBoundingBoxDescent;
  const baseline = px / 2 + glyphH / 2 - m.actualBoundingBoxDescent;
  const cx = px * 0.46;
  sx.fillText(letter, cx, baseline);
  sx.strokeText(letter, cx, baseline);
  // The loose drop, bottom right of the letter.
  sx.beginPath();
  sx.arc(cx + m.actualBoundingBoxRight + px * 0.075, baseline - px * 0.07, px * 0.055, 0, Math.PI * 2);
  sx.fill();

  const data = sx.getImageData(0, 0, px, px);
  const out = document.createElement('canvas');
  out.width = out.height = px;
  const ctx = out.getContext('2d')!;
  const img = ctx.createImageData(px, px);
  const n = parseInt(ink.slice(1), 16);
  const [r, g, b] = [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  for (let i = 0; i < data.data.length; i += 4) {
    const v = data.data[i] / 255;
    // Tight threshold on the blur = rounded, poured edges; a little noise keeps it printed.
    const a = Math.min(1, Math.max(0, (v - 0.46) / 0.06)) * (0.94 + Math.random() * 0.06);
    img.data[i] = r;
    img.data[i + 1] = g;
    img.data[i + 2] = b;
    img.data[i + 3] = a * 255;
  }
  ctx.putImageData(img, 0, 0);
  const url = out.toDataURL('image/png');
  monogramCache.set(key, url);
  return url;
}

function initialOf(artist: string) {
  const letter = artist.trim().replace(/^the\s+/i, '').charAt(0).toUpperCase();
  return /[A-ZÆØÅÄÖÜ0-9]/.test(letter) ? letter : 'N';
}

export function NoirHomeHero({
  track,
  playing,
  variant,
  size,
}: {
  track: SearchResult;
  playing: boolean;
  variant: HomeHeroVariant;
  size: number;
}) {
  const world = heroWorld(track);
  const ink = heroInk(world);
  const dpr = typeof window !== 'undefined' ? Math.min(2, window.devicePixelRatio || 1) : 1;
  const px = Math.round(size * dpr);

  const src = useMemo(() => {
    if (variant === '1') {
      // 2–5 limbs, fixed per song.
      const count = 4 + (hashString(track.id || track.title) % 12);
      return renderHeatFigure(`song:${track.id || track.title}`, count, world, px);
    }
    if (variant === '3') return renderMonogram(initialOf(track.artist), ink, px);
    return '';
  }, [variant, track.id, track.title, track.artist, world, ink, px]);

  const key = `${variant}:${variant === '3' ? initialOf(track.artist) + world : track.id}`;

  return (
    <div className="noir-home-hero-object" data-variant={variant} data-playing={playing || undefined} style={{ width: size, height: size }}>
      <AnimatePresence mode="popLayout" initial={false}>
        <motion.div
          key={key}
          className="noir-home-hero-object-inner"
          initial={{ opacity: 0, scale: 0.94 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 1.03, transition: { duration: 0.18 } }}
          transition={{ type: 'spring', stiffness: 220, damping: 24 }}
        >
          {variant === '2' ? (
            <NoirMark size={Math.round(size * 0.72)} variant="spray" color={ink} />
          ) : (
            <img src={src} alt="" draggable={false} />
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
