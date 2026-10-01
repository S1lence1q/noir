import { useEffect, useState } from 'react';
import type { SearchResult } from '../../../types';
import { COLOR_WORLDS, renderGrainField, worldForCollection } from '../../../utils/ditherCover';

/**
 * A song's cover as grain in its own colours, filling its parent and gathering toward the right
 * (the copy sits on the black left). Shared by the hero panels in the Grain graphics theme.
 * No cover yet: the song's colour world as a flat field, so the panel is never empty.
 */
export function NoirGrainField({ track }: { track: SearchResult }) {
  const [grain, setGrain] = useState<string | null>(null);
  const world = COLOR_WORLDS[worldForCollection(`${track.artist}:${track.title}`)];

  useEffect(() => {
    setGrain(null);
    if (!track.thumbnail) return;
    let cancelled = false;
    renderGrainField(track.thumbnail)
      .then((url) => !cancelled && setGrain(url))
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [track.thumbnail]);

  return (
    <div
      className="noir-grain-field"
      data-ready={grain || !track.thumbnail ? 'true' : undefined}
      style={grain ? { backgroundImage: `url(${grain})` } : { background: world.field }}
      aria-hidden
    />
  );
}
