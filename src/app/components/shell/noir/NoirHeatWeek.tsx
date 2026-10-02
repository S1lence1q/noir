import { useEffect, useRef, useState } from 'react';
import type { ColorWorld } from '../../../utils/ditherCover';
import { applyHeat, buildRamp, seededRandom } from '../../../utils/grainRender';
import { HEAT_RAMPS } from '../../../utils/heatFigure';

/**
 * "Your week" as one heat form: a line through the last seven days that swells where you
 * listened more. Blurred shape → heat ramp → grain, on a cobalt grain field (refs: blurred
 * figures on blue, plate wave). Fills its parent; the parent owns the text.
 */

/** Horizontal span of the day nodes, as fractions of the width (labels are placed with it). */
const HEAT_WEEK_X0 = 0.47;
const HEAT_WEEK_X1 = 0.92;
export const heatWeekNodeX = (i: number, n: number) =>
  HEAT_WEEK_X0 + ((HEAT_WEEK_X1 - HEAT_WEEK_X0) * i) / Math.max(1, n - 1);

const ramps = new Map<ColorWorld, Uint8ClampedArray>();
function rampFor(world: ColorWorld) {
  let lut = ramps.get(world);
  if (!lut) {
    lut = buildRamp(HEAT_RAMPS[world]);
    ramps.set(world, lut);
  }
  return lut;
}

type Pt = { x: number; y: number };

function catmull(points: Pt[], steps = 14): Pt[] {
  const out: Pt[] = [];
  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[Math.max(0, i - 1)];
    const p1 = points[i];
    const p2 = points[i + 1];
    const p3 = points[Math.min(points.length - 1, i + 2)];
    for (let s = 0; s < steps; s++) {
      const t = s / steps;
      const t2 = t * t;
      const t3 = t2 * t;
      out.push({
        x: 0.5 * (2 * p1.x + (-p0.x + p2.x) * t + (2 * p0.x - 5 * p1.x + 4 * p2.x - p3.x) * t2 + (-p0.x + 3 * p1.x - 3 * p2.x + p3.x) * t3),
        y: 0.5 * (2 * p1.y + (-p0.y + p2.y) * t + (2 * p0.y - 5 * p1.y + 4 * p2.y - p3.y) * t2 + (-p0.y + 3 * p1.y - 3 * p2.y + p3.y) * t3),
      });
    }
  }
  out.push(points[points.length - 1]);
  return out;
}

type RenderOptions = { seed: string; span: [number, number]; world: ColorWorld; tail: 'exit' | 'end' };

function render(canvas: HTMLCanvasElement, values: number[], { seed, span, world, tail }: RenderOptions) {
  const cssW = canvas.clientWidth;
  const cssH = canvas.clientHeight;
  if (!cssW || !cssH) return false;
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  const w = Math.round(cssW * dpr);
  const h = Math.round(cssH * dpr);
  canvas.width = w;
  canvas.height = h;

  // 1. The shape, white on black, blurred: brightness becomes "heat".
  const shape = document.createElement('canvas');
  shape.width = w;
  shape.height = h;
  const sx = shape.getContext('2d');
  const ctx = canvas.getContext('2d');
  if (!sx || !ctx) return false;
  sx.fillStyle = '#000';
  sx.fillRect(0, 0, w, h);
  sx.filter = `blur(${Math.round(h * 0.052)}px)`;
  sx.fillStyle = '#fff';
  sx.strokeStyle = '#fff';
  sx.lineCap = 'round';
  sx.lineJoin = 'round';

  const max = Math.max(1, ...values);
  const norm = values.map((v) => Math.sqrt(Math.max(0, v) / max));
  // A month has four times the beads of a week: shrink them so days stay days, not one mass.
  const beadScale = Math.min(1, Math.sqrt(7 / Math.max(1, values.length)) * 1.15);
  const spacing = (w * (span[1] - span[0])) / Math.max(1, values.length - 1);
  const nodes = norm.map((n, i) => ({
    x: w * (span[0] + ((span[1] - span[0]) * i) / Math.max(1, values.length - 1)),
    y: h * (0.6 - 0.27 * n),
    // Every day is a bead on the line; days you listened swell.
    // Never wider than the gap to the next day, so each day stays its own bead.
    r: Math.min(h * beadScale * (n > 0 ? 0.055 + 0.125 * n : 0.032), spacing * 0.42),
  }));
  const path = catmull([
    { x: w * (span[0] - 0.07), y: h * 0.72 },
    ...nodes,
    // 'exit': the line runs on off the edge (a week that continues). 'end': it stops at now.
    ...(tail === 'exit' ? [{ x: w * 1.08, y: h * (0.5 - 0.1 * (norm[norm.length - 1] ?? 0)) }] : []),
  ]);
  sx.lineWidth = h * 0.07;
  sx.beginPath();
  path.forEach((p, i) => (i ? sx.lineTo(p.x, p.y) : sx.moveTo(p.x, p.y)));
  sx.stroke();
  for (const node of nodes) {
    sx.beginPath();
    sx.arc(node.x, node.y, node.r, 0, Math.PI * 2);
    sx.fill();
  }

  // 2. Heat ramp + grain.
  const out = ctx.createImageData(w, h);
  applyHeat(sx.getImageData(0, 0, w, h).data, out.data, rampFor(world), seededRandom(seed));
  ctx.putImageData(out, 0, 0);
  return true;
}

export function NoirHeatWeek({
  values,
  seed,
  className,
  span = [HEAT_WEEK_X0, HEAT_WEEK_X1],
  world = 'cobalt',
  tail = 'exit',
}: {
  values: number[];
  seed: string;
  className?: string;
  /** Where the first and last day sit, as fractions of the width. */
  span?: [number, number];
  world?: ColorWorld;
  tail?: 'exit' | 'end';
}) {
  const ref = useRef<HTMLCanvasElement>(null);
  const [ready, setReady] = useState(false);
  const key = values.join(',');

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    let frame = 0;
    let lastW = 0;
    const draw = () => {
      if (canvas.clientWidth === lastW) return;
      lastW = canvas.clientWidth;
      if (render(canvas, values, { seed, span, world, tail })) setReady(true);
    };
    draw();
    const observer = new ResizeObserver(() => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(draw);
    });
    observer.observe(canvas);
    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, seed, world, tail, span[0], span[1]]);

  return <canvas ref={ref} className={className} data-ready={ready || undefined} aria-hidden />;
}
