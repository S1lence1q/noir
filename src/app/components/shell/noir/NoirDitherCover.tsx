import { useEffect, useState } from 'react';
import {
  COLOR_WORLDS,
  ColorWorld,
  ditherCacheKey,
  getCachedDitherCover,
  renderDitherCover,
} from '../../../utils/ditherCover';
import { NoirMark } from './NoirMark';

export type NoirDitherCoverProps = {
  source?: string;
  world: ColorWorld;
  seed: string;
  /** CSS px (square). */
  size: number;
  madeForYou?: boolean;
  radius?: number;
  className?: string;
};

export function NoirDitherCover({
  source,
  world,
  seed,
  size,
  madeForYou = false,
  radius,
  className = '',
}: NoirDitherCoverProps) {
  const dpr = typeof window !== 'undefined' ? Math.min(2, window.devicePixelRatio || 1) : 1;
  const px = Math.round(size * dpr);
  const key = source ? ditherCacheKey(source, world, seed, px) : null;
  const [url, setUrl] = useState<string | undefined>(() => (key ? getCachedDitherCover(key) : undefined));
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (!source) return;
    const cached = key ? getCachedDitherCover(key) : undefined;
    if (cached) {
      setUrl(cached);
      return;
    }
    let cancelled = false;
    setFailed(false);
    setUrl(undefined);
    renderDitherCover(source, world, seed, px)
      .then((next) => !cancelled && setUrl(next))
      .catch(() => !cancelled && setFailed(true));
    return () => {
      cancelled = true;
    };
  }, [source, world, seed, px, key]);

  const palette = COLOR_WORLDS[world];
  const showMark = !source || failed;
  const markSize = Math.round(size * 0.34);

  return (
    <span
      className={`noir-dither-cover ${className}`}
      style={{
        width: size,
        height: size,
        background: palette.field,
        borderRadius: radius ?? (size >= 120 ? 'var(--noir-radius-md)' : 'var(--noir-radius-sm)'),
      }}
      aria-hidden
    >
      {url && <img src={url} alt="" className="noir-dither-cover-img" draggable={false} />}
      {showMark && (
        <span className="noir-dither-cover-mark">
          <NoirMark size={markSize} variant={markSize >= 96 ? 'spray' : 'vector'} color={palette.mark} />
        </span>
      )}
      {madeForYou && size >= 96 && (
        <span className="noir-dither-cover-badge">
          <NoirMark size={Math.max(10, Math.round(size * 0.06))} color={palette.mark} />
        </span>
      )}
    </span>
  );
}
