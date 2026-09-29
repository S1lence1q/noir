import { useEffect, useState } from 'react';
import { COLOR_WORLDS, type ColorWorld } from '../../../utils/ditherCover';
import { PARTNER_INK, getCachedMonogram, initialOf, loadMonogram } from '../../../utils/monogram';
import { NoirMark } from './NoirMark';

type NoirMonogramCoverProps = {
  /** The name the letter comes from ("Rock Mix" → R). */
  name: string;
  world: ColorWorld;
  /** CSS px (square). */
  size: number;
  radius?: number;
  /** Generated for you: the small mark in the corner, like mixes had. */
  madeForYou?: boolean;
  className?: string;
};

/** Cover for things that are a name, not a picture (mixes, genres): the liquid monogram. */
export function NoirMonogramCover({ name, world, size, radius, madeForYou = false, className = '' }: NoirMonogramCoverProps) {
  const dpr = typeof window !== 'undefined' ? Math.min(2, window.devicePixelRatio || 1) : 1;
  const px = Math.round(Math.max(size, 64) * dpr);
  const letter = initialOf(name.replace(/\s+mix$/i, ''));
  const ink = PARTNER_INK[world];
  const [url, setUrl] = useState(() => getCachedMonogram(letter, ink, px));

  useEffect(() => {
    const cached = getCachedMonogram(letter, ink, px);
    if (cached) {
      setUrl(cached);
      return;
    }
    let cancelled = false;
    void loadMonogram(letter, ink, px).then((next) => !cancelled && setUrl(next));
    return () => {
      cancelled = true;
    };
  }, [letter, ink, px]);

  return (
    <span
      className={`noir-monogram-cover ${className}`}
      style={{
        width: size,
        height: size,
        background: COLOR_WORLDS[world].field,
        borderRadius: radius ?? (size >= 120 ? 'var(--noir-radius-md)' : 'var(--noir-radius-sm)'),
      }}
      aria-hidden
    >
      {url && <img src={url} alt="" draggable={false} />}
      {madeForYou && size >= 96 && (
        <span className="noir-monogram-cover-badge">
          <NoirMark size={Math.max(10, Math.round(size * 0.06))} color={ink} />
        </span>
      )}
    </span>
  );
}
