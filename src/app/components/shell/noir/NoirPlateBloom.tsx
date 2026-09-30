import { useEffect, useRef } from 'react';
import { seededRandom, smoothstep } from '../../../utils/grainRender';

/**
 * Now Playing plate: a halftone bloom behind the cover, split down the middle where the plate
 * ends. On the plate side the dots are the partner ink; on the black side they are the plate's own
 * colour, so the plate dissolves into dots past its edge. Petals are seeded by the song.
 */

const rgb = (hex: string) => {
  const n = parseInt(hex.slice(1), 16);
  return `${(n >> 16) & 255},${(n >> 8) & 255},${n & 255}`;
};

function render(canvas: HTMLCanvasElement, seed: string, field: string, ink: string) {
  const size = canvas.clientWidth;
  if (!size) return false;
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  const s = Math.round(size * dpr);
  canvas.width = s;
  canvas.height = s;
  const ctx = canvas.getContext('2d');
  if (!ctx) return false;
  ctx.clearRect(0, 0, s, s);

  const rand = seededRandom(`bloom:${seed}`);
  const petals = 5 + Math.floor(rand() * 4);
  const twist = rand() * Math.PI * 2;
  const wobble = Array.from({ length: petals }, () => 0.75 + rand() * 0.25);
  const c = s / 2;
  const R = s * 0.5;
  // The cover covers the middle (it is 1/1.6 of this canvas): dots start just inside its edge.
  const inner = 0.5;
  const step = s / 52;
  const left = `rgba(${rgb(ink)},`;
  const right = `rgba(${rgb(field)},`;

  for (let gy = step / 2; gy < s; gy += step) {
    for (let gx = step / 2; gx < s; gx += step) {
      const dx = gx - c;
      const dy = gy - c;
      const d = Math.hypot(dx, dy) / R;
      if (d < inner) continue;
      const a = Math.atan2(dy, dx) + twist;
      const petal = Math.abs(Math.cos((a * petals) / 2));
      const k = Math.floor((((a / (Math.PI * 2)) * petals) % petals + petals) % petals);
      const rim = inner + (1 - inner) * (0.45 + 0.55 * petal ** 1.6) * wobble[k];
      if (d > rim) continue;
      // Nothing below the cover: the title sits there and must stay clean.
      const t = (1 - smoothstep(inner, rim, d)) * (1 - smoothstep(0.5, 0.64, dy / R));
      const r = step * 0.5 * Math.pow(t, 0.75) * (0.85 + rand() * 0.15);
      if (r < 0.35) continue;
      ctx.fillStyle = (gx < c ? left : right) + `${0.35 + 0.65 * t})`;
      ctx.beginPath();
      ctx.arc(gx, gy, r, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  return true;
}

export function NoirPlateBloom({ seed, field, ink }: { seed: string; field: string; ink: string }) {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    let lastW = 0;
    let frame = 0;
    const draw = () => {
      if (canvas.clientWidth === lastW) return;
      if (render(canvas, seed, field, ink)) lastW = canvas.clientWidth;
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
  }, [seed, field, ink]);

  return <canvas ref={ref} className="noir-plate-bloom-canvas" aria-hidden />;
}
