import { useMemo } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import type { SearchResult } from '../../../types';
import { hashString, type ColorWorld } from '../../../utils/ditherCover';
import { HEAT_RAMPS, renderHeatFigure } from '../../../utils/heatFigure';
import { NoirMark } from './NoirMark';
import { PARTNER_INK, initialOf, renderMonogram } from '../../../utils/monogram';

/**
 * Home hero graphic: ONE simple object on a flat field (the lesson from the playlist creature
 * and the Favorites asterisk). The field follows the song's artist. Candidates while we choose:
 *   1 · the song's creature — every song has its own; sways gently while playing
 *   2 · the NOIR mark, large — turns very slowly while playing
 *   3 · a liquid monogram — the artist's initial, poured, with a loose drop (ref: liquid M)
 */

export type HomeHeroVariant = '1' | '2' | '3';

const HERO_WORLDS: ColorWorld[] = ['cobalt', 'ember', 'moss', 'rose', 'bone', 'sun'];

/** Each song gets its own field from the full palette (per artist, most days were one colour). */
export function heroWorld(track: SearchResult): ColorWorld {
  // FNV-1a + a final avalanche: similar ids (apple_dk_67…) must not cluster on one colour.
  const key = `hero:${track.id || `${track.artist}::${track.title}`}`;
  let h = 0x811c9dc5;
  for (let i = 0; i < key.length; i++) h = Math.imul(h ^ key.charCodeAt(i), 0x01000193);
  h ^= h >>> 16;
  h = Math.imul(h, 0x85ebca6b);
  h ^= h >>> 13;
  h = Math.imul(h, 0xc2b2ae35);
  h ^= h >>> 16;
  return HERO_WORLDS[(h >>> 0) % HERO_WORLDS.length];
}

/** The object's colour: a partner from the palette, so the banner is two colours, one shape. */
const heroMark = PARTNER_INK;

/** The field colour matches the creature's own ramp, so the image sits seamlessly on the card. */
export const heroField = (world: ColorWorld) => HEAT_RAMPS[world][0][1];
export const heroInk = (world: ColorWorld) => (world === 'cobalt' || world === 'moss' || world === 'ink' ? '#F2EEE6' : '#0B0B0B');

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
      {/* The turning lives here, on an element that survives song changes, so a new object keeps the angle. */}
      <div className="noir-home-hero-spin">
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
            <NoirMark size={Math.round(size * 0.72)} variant="spray" color={heroMark[world]} />
          ) : (
            <img src={src} alt="" draggable={false} />
          )}
        </motion.div>
      </AnimatePresence>
      </div>
    </div>
  );
}
