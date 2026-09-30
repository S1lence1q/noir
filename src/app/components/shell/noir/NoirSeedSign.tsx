import { useMemo } from 'react';
import { COLOR_WORLDS } from '../../../utils/ditherCover';
import { seededRandom, smoothstep } from '../../../utils/grainRender';

type NoirSeedSignProps = {
  /** How many artists are picked so far: the halftone disc grows with each one. */
  picks: number;
  size?: number;
  className?: string;
};

const GRID = 15;
const STEP = 6.2;
const MAX_DOT = 2.9;
/** Picks at which the disc is full. */
const FULL_AT = 6;

/**
 * First-run sign: a halftone seed on cobalt. It starts small and fills out as you pick artists,
 * so the one graphic on the page is about you, not borrowed from another surface.
 */
export function NoirSeedSign({ picks, size = 72, className = '' }: NoirSeedSignProps) {
  const { field, mark } = COLOR_WORLDS.cobalt;
  const dots = useMemo(() => {
    const rand = seededRandom('noir-seed-sign');
    const origin = 50 - ((GRID - 1) * STEP) / 2;
    const out: { x: number; y: number; d: number; jitter: number }[] = [];
    for (let row = 0; row < GRID; row++) {
      for (let col = 0; col < GRID; col++) {
        const x = origin + col * STEP;
        const y = origin + row * STEP;
        const d = Math.hypot(x - 50, y - 50) / 44;
        if (d <= 1) out.push({ x, y, d, jitter: 0.78 + rand() * 0.3 });
      }
    }
    return out;
  }, []);

  const reach = 0.6 + 0.45 * Math.min(1, picks / FULL_AT);

  return (
    <span className={`noir-seed-sign ${className}`} style={{ width: size, height: size, background: field }} aria-hidden>
      <svg width={size} height={size} viewBox="0 0 100 100">
        <g className="noir-seed-sign-disc" fill={mark}>
          {dots.map(({ x, y, d, jitter }) => (
            <circle
              key={`${x}-${y}`}
              cx={x}
              cy={y}
              style={{ r: MAX_DOT * jitter * smoothstep(reach, reach - 0.5, d) }}
            />
          ))}
        </g>
      </svg>
    </span>
  );
}
