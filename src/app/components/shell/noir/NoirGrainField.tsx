import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import type { SearchResult } from '../../../types';
import { COLOR_WORLDS, renderGrainField, worldForCollection } from '../../../utils/ditherCover';
import { EASE_PREMIUM, prefersReducedMotion } from '../../../utils/motionPresets';

type Shown = { key: string; url: string | null; flat: string };

/**
 * A song's cover as grain in its own colours, filling its parent and gathering toward the right
 * (the copy sits on the black left). Shared by the hero panels in the Grain graphics theme.
 * Levelled so dark, pale and grey covers still show grain. On a new song the next field is
 * prepared first, then replaces the old one with a soft settle, never a blank in between.
 * No cover: the song's colour world as a flat field, so the panel is never empty.
 */
export function NoirGrainField({ track }: { track: SearchResult }) {
  const reduced = prefersReducedMotion();
  const key = track.id || `${track.artist}:${track.title}`;
  const flat = COLOR_WORLDS[worldForCollection(`${track.artist}:${track.title}`)].field;
  const [shown, setShown] = useState<Shown | null>(null);

  useEffect(() => {
    if (!track.thumbnail) {
      setShown({ key, url: null, flat });
      return;
    }
    let cancelled = false;
    renderGrainField(track.thumbnail, 220, { levels: { tint: flat } })
      .then((url) => !cancelled && setShown({ key, url, flat }))
      .catch(() => !cancelled && setShown({ key, url: null, flat }));
    return () => {
      cancelled = true;
    };
  }, [key, track.thumbnail, flat]);

  return (
    <div className="noir-grain-field" aria-hidden>
      <AnimatePresence initial={false}>
        {shown && (
          <motion.div
            key={shown.key}
            className="noir-grain-field-img"
            style={shown.url ? { backgroundImage: `url(${shown.url})` } : { background: shown.flat }}
            initial={{ opacity: 0, scale: reduced ? 1 : 1.04 }}
            animate={{ opacity: 1, scale: 1, transition: { duration: 0.6, ease: EASE_PREMIUM } }}
            exit={{ opacity: 0, transition: { duration: 0.45, ease: EASE_PREMIUM } }}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
