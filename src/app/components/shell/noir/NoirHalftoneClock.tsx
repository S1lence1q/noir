import { useEffect, useRef, useState } from 'react';
import { seededRandom, smoothstep } from '../../../utils/grainRender';

/**
 * Listening clock as a halftone bloom (ref: halftone cloud). Midnight at the top, clockwise.
 * Each hour pushes the outline out by how much you listen then; the peak hour's petal is Ember.
 * Dots grow toward the rim, the core stays hollow, and a stipple of fine dots fades it out.
 */

const INK = [237, 232, 222] as const; // Bone
const PEAK = [232, 80, 2] as const; // Ember

function render(canvas: HTMLCanvasElement, hours: number[], peakHour: number, seed: string) {
  const size = canvas.clientWidth;
  if (!size) return false;
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  const s = Math.round(size * dpr);
  canvas.width = s;
  canvas.height = s;
  const ctx = canvas.getContext('2d');
  if (!ctx) return false;
  ctx.clearRect(0, 0, s, s);

  const max = Math.max(1, ...hours);
  const norm = hours.map((h) => Math.sqrt(h / max));
  const c = s / 2;
  const R = s * 0.47;
  const TAU = Math.PI * 2;

  // Listening (0..1) at angle a (0 = midnight, top). Cosine blend between neighbouring hours.
  const normAt = (a: number) => {
    const hf = ((a / TAU) * 24 + 24) % 24;
    const h0 = Math.floor(hf);
    const t = (1 - Math.cos((hf - h0) * Math.PI)) / 2;
    const n = norm[h0] * (1 - t) + norm[(h0 + 1) % 24] * t;
    return n;
  };

  const rand = seededRandom(seed);
  const step = s / 66;
  // Low-frequency value noise: the dark swirls that make it read as printed, not plotted.
  const N = 5;
  const lattice = Array.from({ length: (N + 1) * (N + 1) }, () => rand());
  const swirl = (x: number, y: number) => {
    const fx = (x / s) * N;
    const fy = (y / s) * N;
    const ix = Math.min(N - 1, Math.floor(fx));
    const iy = Math.min(N - 1, Math.floor(fy));
    const tx = smoothstep(0, 1, fx - ix);
    const ty = smoothstep(0, 1, fy - iy);
    const at = (i: number, j: number) => lattice[j * (N + 1) + i];
    const top = at(ix, iy) * (1 - tx) + at(ix + 1, iy) * tx;
    const bottom = at(ix, iy + 1) * (1 - tx) + at(ix + 1, iy + 1) * tx;
    return top * (1 - ty) + bottom * ty;
  };
  const peakAngle = ((peakHour + 0.5) / 24) * TAU;
  const colour = (rgb: readonly number[], alpha = 1) => `rgba(${rgb[0]},${rgb[1]},${rgb[2]},${alpha})`;

  for (let gy = step / 2; gy < s; gy += step) {
    for (let gx = step / 2; gx < s; gx += step) {
      const dx = gx - c;
      const dy = gy - c;
      const d = Math.hypot(dx, dy);
      const a = (Math.atan2(dx, -dy) + TAU) % TAU;
      const n = normAt(a);
      const t = d / (R * (0.52 + 0.48 * n));
      if (t > 1.12) continue;
      // Hollow core, full at the rim, soft outside edge; a little wobble so it reads as print.
      const wobble = 0.9 + 0.2 * rand();
      const shape = smoothstep(0.04, 0.62, t) * (1 - smoothstep(0.86, 1.1, t));
      // Busy hours stay bright; quiet ones dissolve into the swirl.
      const texture = Math.max(0.12 + 0.95 * smoothstep(0.2, 0.8, swirl(gx, gy)), n * 0.95);
      const intensity = Math.min(1, shape * texture * wobble);
      let angleOff = Math.abs(a - peakAngle);
      angleOff = Math.min(angleOff, TAU - angleOff);
      const isPeak = hours[peakHour] > 0 && angleOff < (0.62 / 24) * TAU * (0.75 + 0.5 * rand()) && t > 0.35;
      const rgb = isPeak ? PEAK : INK;

      if (intensity > 0.2) {
        ctx.fillStyle = colour(rgb);
        ctx.beginPath();
        ctx.arc(gx, gy, (step / 2) * 1.06 * Math.pow(intensity, 0.75), 0, TAU);
        ctx.fill();
      } else if (intensity > 0.02) {
        // Stipple: a few fine dots instead of one small one.
        const count = 1 + Math.floor(rand() * 3);
        ctx.fillStyle = colour(rgb, 0.9);
        for (let k = 0; k < count; k++) {
          if (rand() > intensity * 4) continue;
          ctx.beginPath();
          ctx.arc(gx + (rand() - 0.5) * step, gy + (rand() - 0.5) * step, dpr * (0.45 + rand() * 0.5), 0, TAU);
          ctx.fill();
        }
      }
    }
  }
  return true;
}

export function NoirHalftoneClock({
  hours,
  peakHour,
  seed,
  className,
}: {
  hours: number[];
  peakHour: number;
  seed: string;
  className?: string;
}) {
  const ref = useRef<HTMLCanvasElement>(null);
  const [ready, setReady] = useState(false);
  const key = hours.join(',');

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    let frame = 0;
    let lastW = 0;
    const draw = () => {
      if (canvas.clientWidth === lastW) return;
      lastW = canvas.clientWidth;
      if (render(canvas, hours, peakHour, seed)) setReady(true);
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
  }, [key, peakHour, seed]);

  return <canvas ref={ref} className={className} data-ready={ready || undefined} aria-hidden />;
}
