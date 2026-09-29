import { useEffect, useState } from 'react';
import type { ColorWorld } from '../../../utils/ditherCover';
import { NoirDitherCover } from './NoirDitherCover';

export type NoirArtworkProps = {
  source?: string;
  /** Only used for the fallback when there is no image or it fails. */
  world: ColorWorld;
  seed: string;
  /** CSS px (square). */
  size: number;
  radius?: number;
  className?: string;
  /** Portraits render round. */
  round?: boolean;
};

/** Decoded image URLs this session — these render instantly, without the fade. */
const decoded = new Set<string>();

/**
 * Real artwork for real objects (albums, tracks, artists) — design rule D1.
 * Shows an exact-shape skeleton until the image has decoded, then fades in once (D3).
 * Falls back to the NOIR dither mark only when there is no image or it fails.
 */
export function NoirArtwork({ source, world, seed, size, radius, className = '', round = false }: NoirArtworkProps) {
  const [status, setStatus] = useState<'loading' | 'ready' | 'failed'>(() =>
    !source ? 'failed' : decoded.has(source) ? 'ready' : 'loading'
  );
  const [instant, setInstant] = useState(() => !!source && decoded.has(source));

  useEffect(() => {
    if (!source) {
      setStatus('failed');
      return;
    }
    if (decoded.has(source)) {
      setStatus('ready');
      setInstant(true);
      return;
    }
    let cancelled = false;
    setStatus('loading');
    setInstant(false);
    const img = new Image();
    img.decoding = 'async';
    img.src = source;
    img
      .decode()
      .then(() => {
        decoded.add(source);
        if (!cancelled) setStatus('ready');
      })
      .catch(() => !cancelled && setStatus('failed'));
    return () => {
      cancelled = true;
    };
  }, [source]);

  const borderRadius = round ? '50%' : radius ?? (size >= 120 ? 'var(--noir-radius-md)' : 'var(--noir-radius-sm)');

  if (status === 'failed') {
    return <NoirDitherCover world={world} seed={seed} size={size} radius={round ? 9999 : radius} className={className} />;
  }

  return (
    <span className={`noir-artwork ${className}`} style={{ width: size, height: size, borderRadius }} aria-hidden>
      {status === 'ready' && (
        <img
          src={source}
          alt=""
          draggable={false}
          className={`noir-artwork-img${instant ? '' : ' is-fading-in'}`}
        />
      )}
    </span>
  );
}
