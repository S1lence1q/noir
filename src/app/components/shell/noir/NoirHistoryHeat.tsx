import { useEffect, useRef, useState } from 'react';
import type { ColorWorld } from '../../../utils/ditherCover';
import { applyHeat, buildRamp, seededRandom } from '../../../utils/grainRender';
import { HEAT_RAMPS } from '../../../utils/heatFigure';

/**
 * History hero, heat version: a glowing ribbon on the song's colour field, a bead for each play
 * this week (up to 12), so a song you keep returning to is a heavier form. Blurred shape → heat
 * ramp → grain, the same pipeline as the Stats week. Same inputs → same image.
 */
const MAX_BEADS = 12;

function render(canvas: HTMLCanvasElement, world: ColorWorld, seed: string, plays: number) {
  const cssW = canvas.clientWidth;
  const cssH = canvas.clientHeight;
  if (!cssW || !cssH) return false;
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  const w = Math.round(cssW * dpr);
  const h = Math.round(cssH * dpr);
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  const shape = document.createElement('canvas');
  shape.width = w;
  shape.height = h;
  const sx = shape.getContext('2d');
  if (!ctx || !sx) return false;

  const rand = seededRandom(`history-heat:${seed}`);
  sx.fillStyle = '#000';
  sx.fillRect(0, 0, w, h);
  sx.filter = `blur(${Math.round(h * 0.05)}px)`;
  sx.fillStyle = '#fff';
  sx.strokeStyle = '#fff';
  sx.lineCap = 'round';
  sx.lineJoin = 'round';

  // A loose S-curve across the right side, different per song.
  const flip = rand() > 0.5 ? 1 : -1;
  const x0 = w * 0.42;
  const x1 = w * 1.04;
  const yAt = (t: number) => h * (0.5 + flip * 0.26 * Math.sin(t * Math.PI * 2) * (0.8 + 0.2 * Math.cos(t * 5)));
  const beads = Math.min(MAX_BEADS, Math.max(1, plays));
  const heft = 0.45 + 0.55 * Math.min(1, plays / 10);

  sx.lineWidth = h * (0.045 + 0.05 * heft);
  sx.beginPath();
  for (let i = 0; i <= 60; i++) {
    const t = i / 60;
    const x = x0 + (x1 - x0) * t;
    const y = yAt(t);
    if (i) sx.lineTo(x, y);
    else sx.moveTo(x, y);
  }
  sx.stroke();

  for (let i = 0; i < beads; i++) {
    const t = beads === 1 ? 0.55 : 0.08 + (0.84 * i) / (beads - 1);
    const r = h * (0.07 + rand() * 0.1) * (0.7 + 0.5 * heft);
    sx.beginPath();
    sx.arc(x0 + (x1 - x0) * t, yAt(t), r, 0, Math.PI * 2);
    sx.fill();
  }

  const out = ctx.createImageData(w, h);
  applyHeat(sx.getImageData(0, 0, w, h).data, out.data, buildRamp(HEAT_RAMPS[world]), seededRandom(seed));
  ctx.putImageData(out, 0, 0);
  return true;
}

export function NoirHistoryHeat({ world, seed, plays }: { world: ColorWorld; seed: string; plays: number }) {
  const ref = useRef<HTMLCanvasElement>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    let frame = 0;
    let lastW = 0;
    const draw = () => {
      if (canvas.clientWidth === lastW) return;
      lastW = canvas.clientWidth;
      if (render(canvas, world, seed, plays)) setReady(true);
    };
    setReady(false);
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
  }, [world, seed, plays]);

  return <canvas ref={ref} className="noir-history-heat" data-ready={ready || undefined} aria-hidden />;
}
