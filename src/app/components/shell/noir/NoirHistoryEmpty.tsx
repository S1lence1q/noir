import { useMemo } from 'react';
import { strings } from '../../../constants/strings';
import { seededRandom, smoothstep } from '../../../utils/grainRender';

const GRID = 19;
const STEP = 5.2;
const MAX_DOT = 2.5;

/**
 * Empty History: the hero's own frame (so nothing moves when the first song lands) holding a
 * hollow halftone disc, the shape the grain will fill.
 */
export function NoirHistoryEmpty() {
  const dots = useMemo(() => {
    const rand = seededRandom('noir-history-empty');
    const origin = 50 - ((GRID - 1) * STEP) / 2;
    const out: { x: number; y: number; r: number }[] = [];
    for (let row = 0; row < GRID; row++) {
      for (let col = 0; col < GRID; col++) {
        const x = origin + col * STEP;
        const y = origin + row * STEP;
        const d = Math.hypot(x - 50, y - 50) / 47;
        if (d > 1) continue;
        // Hollow core, dots swelling toward the rim and thinning out at the edge.
        const ring = smoothstep(0.3, 0.8, d) * (1 - smoothstep(0.9, 1, d));
        const r = MAX_DOT * ring * (0.8 + rand() * 0.3);
        if (r > 0.25) out.push({ x, y, r });
      }
    }
    return out;
  }, []);

  return (
    <section className="noir-history-hero noir-history-hero--empty">
      <svg className="noir-history-empty-disc" viewBox="0 0 100 100" aria-hidden>
        <g fill="#ede8de">
          {dots.map(({ x, y, r }) => (
            <circle key={`${x}-${y}`} cx={x} cy={y} r={r} />
          ))}
        </g>
      </svg>
      <div className="noir-history-hero-copy">
        <p className="noir-history-hero-title">{strings.library.historyEmpty}</p>
        <p className="noir-history-hero-artist noir-history-empty-hint">{strings.library.historyEmptyHint}</p>
      </div>
    </section>
  );
}
