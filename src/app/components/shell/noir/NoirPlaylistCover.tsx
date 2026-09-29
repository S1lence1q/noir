import { useMemo } from 'react';
import { worldForCollection } from '../../../utils/ditherCover';
import { renderHeatFigure } from '../../../utils/heatFigure';

type NoirPlaylistCoverProps = {
  playlistId: string;
  trackCount: number;
  /** CSS px (square). */
  size: number;
  radius?: number;
  className?: string;
};

/** A user playlist's own heat creature (see utils/heatFigure). */
export function NoirPlaylistCover({ playlistId, trackCount, size, radius, className = '' }: NoirPlaylistCoverProps) {
  const dpr = typeof window !== 'undefined' ? Math.min(2, window.devicePixelRatio || 1) : 1;
  const px = Math.round(Math.max(size, 22) * dpr);
  const world = worldForCollection(playlistId);
  const url = useMemo(() => renderHeatFigure(playlistId, trackCount, world, px), [playlistId, trackCount, world, px]);

  return (
    <span
      className={`noir-playlist-cover ${className}`}
      style={{
        width: size,
        height: size,
        borderRadius: radius ?? (size >= 120 ? 'var(--noir-radius-md)' : 'var(--noir-radius-sm)'),
      }}
      aria-hidden
    >
      {/* Keyed by image: a new song grows the creature, and the new stage fades in. */}
      {url && <img key={url} src={url} alt="" draggable={false} />}
    </span>
  );
}
