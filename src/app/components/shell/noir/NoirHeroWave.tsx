import { useEffect, useRef, useState } from 'react';
import type { SearchResult } from '../../../types';
import { COLOR_WORLDS, renderDitherCover, worldForCollection, type ColorWorld } from '../../../utils/ditherCover';
import { seededRandom, smoothstep } from '../../../utils/grainRender';

/**
 * Home hero: your recent songs as one living object, in NOIR's own language (flat, grain,
 * palette colours). Three candidates, switchable while we decide:
 *   A · dither ribbon — each song's dithered cover, shredded into strips that wave
 *   B · halftone river — a river of halftone dots, each song a coloured stretch
 *   C · glow strands — one soft grain-glow strand per song, woven together
 * Drifts while music plays, holds still when paused. Hover names a song, click plays it.
 */

export type HeroWaveSong = { track: SearchResult; weight: number };
export type HeroVariant = 'a' | 'b' | 'c';

type Seg = { song: number; x0: number; x1: number; world: ColorWorld };
type Frame = {
  ctx: CanvasRenderingContext2D;
  W: number;
  H: number;
  dpr: number;
  phase: number;
  segs: Seg[];
  hover: number | null;
  covers: Map<number, HTMLImageElement>;
};

type RGB = [number, number, number];
const rgb = (hex: string): RGB => {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
};
const css = (c: RGB, a = 1) => `rgba(${c[0] | 0},${c[1] | 0},${c[2] | 0},${a})`;
/** Palette colour for a song on black: bone reads as bone, ink would vanish so it becomes bone too. */
const fieldOf = (world: ColorWorld) => rgb(COLOR_WORLDS[world === 'ink' ? 'bone' : world].field);

const X0 = 0.5;
const X1 = 0.985;

function layout(songs: HeroWaveSong[], W: number): Seg[] {
  const weights = songs.map((s) => Math.pow(Math.max(1, s.weight), 0.7));
  const total = weights.reduce((a, b) => a + b, 0) || 1;
  let x = W * X0;
  return songs.map((s, song) => {
    const width = (W * (X1 - X0) * weights[song]) / total;
    const seg = { song, x0: x, x1: x + width, world: worldForCollection(s.track.artist || s.track.id) };
    x += width;
    return seg;
  });
}

const wave = (x: number, W: number, H: number, phase: number) =>
  H * 0.5 + H * 0.17 * Math.sin((x / W) * 11 + phase) * (0.7 + 0.3 * Math.sin((x / W) * 3.1 - phase * 0.5));

// ── A · dither ribbon ─────────────────────────────────────────────────────────
function drawRibbon({ ctx, W, H, dpr, phase, segs, hover, covers }: Frame) {
  const strip = 9 * dpr;
  const gap = 3 * dpr;
  const height = H * 0.56;
  for (const seg of segs) {
    const img = covers.get(seg.song);
    const field = fieldOf(seg.world);
    ctx.globalAlpha = hover !== null && hover !== seg.song ? 0.28 : 1;
    for (let x = seg.x0; x < seg.x1 - gap; x += strip + gap) {
      const w = Math.min(strip, seg.x1 - gap - x);
      const cy = wave(x, W, H, phase);
      // Strips lean and breathe with the wave, like a ribbon turning.
      const h = height * (0.8 + 0.2 * Math.cos((x / W) * 11 + phase));
      const top = cy - h / 2;
      ctx.fillStyle = css(field);
      ctx.fillRect(x, top, w, h);
      if (img && img.complete && img.naturalWidth) {
        const side = img.naturalWidth;
        const along = ((x - seg.x0) % height) / height;
        ctx.drawImage(img, along * side, 0, (w / height) * side, side, x, top, w, h);
      }
    }
  }
  ctx.globalAlpha = 1;
}

// ── B · halftone river ────────────────────────────────────────────────────────
function drawRiver({ ctx, W, H, dpr, phase, segs, hover }: Frame) {
  const step = 7 * dpr;
  const rand = seededRandom('river');
  for (const seg of segs) {
    const field = fieldOf(seg.world);
    const dim = hover !== null && hover !== seg.song;
    ctx.fillStyle = css(field, dim ? 0.25 : 1);
    for (let x = seg.x0 + step / 2; x < seg.x1; x += step) {
      const cy = wave(x, W, H, phase);
      const half = H * (0.14 + 0.08 * Math.sin((x / W) * 3 + phase * 0.7));
      for (let y = cy - half * 1.3; y < cy + half * 1.3; y += step) {
        const d = Math.abs(y - cy) / half;
        const flow = 0.55 + 0.45 * Math.sin(x * 0.012 / dpr - phase * 2.2 + y * 0.02 / dpr);
        const intensity = (1 - smoothstep(0.35, 1.25, d)) * flow;
        const jitter = rand();
        if (intensity > 0.12) {
          ctx.beginPath();
          ctx.arc(x, y, (step / 2) * Math.min(1, intensity * 1.15), 0, Math.PI * 2);
          ctx.fill();
        } else if (intensity > 0.02 && jitter < intensity * 5) {
          ctx.beginPath();
          ctx.arc(x + (rand() - 0.5) * step, y + (rand() - 0.5) * step, dpr * 0.7, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    }
  }
}

// ── C · glow strands ──────────────────────────────────────────────────────────
const strandY = (i: number, n: number, x: number, W: number, H: number, phase: number) =>
  H * 0.5 +
  H * 0.24 * Math.sin((x / W) * (8 + (i % 4) * 1.5) + phase * (0.8 + 0.15 * i) + i * 1.7) * (0.55 + 0.45 * ((i + 1) / n));

let strandCanvas: HTMLCanvasElement | null = null;
function drawStrands({ ctx, W, H, phase, segs, hover }: Frame) {
  // Blur on a quarter-size canvas (cheap per frame), then scaled up: the glow; 'lighter' where strands cross.
  const s = 4;
  strandCanvas ??= document.createElement('canvas');
  const off = strandCanvas;
  off.width = Math.ceil(W / s);
  off.height = Math.ceil(H / s);
  const o = off.getContext('2d')!;
  o.clearRect(0, 0, off.width, off.height);
  o.globalCompositeOperation = 'lighter';
  o.filter = `blur(${Math.max(1, H / s / 70)}px)`;
  o.lineCap = 'round';
  const n = segs.length;
  const total = segs.reduce((a, g) => a + (g.x1 - g.x0), 0) || 1;
  segs.forEach((seg, i) => {
    const field = fieldOf(seg.world);
    const dim = hover !== null && hover !== seg.song;
    o.strokeStyle = css(field, dim ? 0.18 : 0.9);
    o.lineWidth = (H / s) * (0.012 + 0.03 * Math.min(2, ((seg.x1 - seg.x0) / total) * n));
    o.beginPath();
    for (let x = W * 0.5; x <= W * 1.02; x += 6) {
      const y = strandY(i, n, x, W, H, phase);
      if (x === W * 0.5) o.moveTo(x / s, y / s);
      else o.lineTo(x / s, y / s);
    }
    o.stroke();
  });
  ctx.imageSmoothingEnabled = true;
  ctx.drawImage(off, 0, 0, W, H);
}

function pickStrand(x: number, y: number, W: number, H: number, phase: number, segs: Seg[]) {
  let best: number | null = null;
  let dist = H * 0.08;
  segs.forEach((seg, i) => {
    const d = Math.abs(strandY(i, segs.length, x, W, H, phase) - y);
    if (d < dist) {
      dist = d;
      best = seg.song;
    }
  });
  return best;
}

let grainTile: HTMLCanvasElement | null = null;
function grain(ctx: CanvasRenderingContext2D, W: number, H: number) {
  if (!grainTile) {
    grainTile = document.createElement('canvas');
    grainTile.width = grainTile.height = 128;
    const g = grainTile.getContext('2d')!;
    const img = g.createImageData(128, 128);
    const rand = seededRandom('hero-grain');
    for (let i = 0; i < img.data.length; i += 4) {
      img.data[i] = img.data[i + 1] = img.data[i + 2] = rand() * 255;
      img.data[i + 3] = 255;
    }
    g.putImageData(img, 0, 0);
  }
  ctx.globalCompositeOperation = 'overlay';
  ctx.globalAlpha = 0.09;
  ctx.fillStyle = ctx.createPattern(grainTile, 'repeat')!;
  ctx.fillRect(0, 0, W, H);
  ctx.globalCompositeOperation = 'source-over';
  ctx.globalAlpha = 1;
}

const DRAW: Record<HeroVariant, (f: Frame) => void> = { a: drawRibbon, b: drawRiver, c: drawStrands };

export function NoirHeroWave({
  songs,
  playing,
  variant,
  onPlay,
  className,
}: {
  songs: HeroWaveSong[];
  playing: boolean;
  variant: HeroVariant;
  onPlay?: (track: SearchResult) => void;
  className?: string;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [hover, setHover] = useState<number | null>(null);
  const [coverTick, setCoverTick] = useState(0);
  const covers = useRef(new Map<number, HTMLImageElement>());
  const phaseRef = useRef(0);
  const stateRef = useRef<{ W: number; H: number; dpr: number; segs: Seg[] }>({ W: 0, H: 0, dpr: 1, segs: [] });
  const reduced = typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const songKey = songs.map((s) => s.track.id).join('|');

  // A needs each song's dithered cover (in its world), rendered once and cached by ditherCover.
  useEffect(() => {
    if (variant !== 'a') return;
    let cancelled = false;
    covers.current.clear();
    songs.forEach(({ track }, song) => {
      if (!track.thumbnail) return;
      const world = worldForCollection(track.artist || track.id);
      void renderDitherCover(track.thumbnail, world === 'ink' ? 'bone' : world, `hero:${track.id}`, 256)
        .then((url) => {
          if (cancelled) return;
          const img = new Image();
          img.onload = () => !cancelled && setCoverTick((n) => n + 1);
          img.src = url;
          covers.current.set(song, img);
        })
        .catch(() => undefined);
    });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [songKey, variant]);

  const hoverRef = useRef(hover);
  hoverRef.current = hover;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || songs.length === 0) return;
    let frame = 0;
    let last = performance.now();
    const draw = () => {
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      const W = Math.round(canvas.clientWidth * dpr);
      const H = Math.round(canvas.clientHeight * dpr);
      if (!W || !H) return;
      if (canvas.width !== W || canvas.height !== H) {
        canvas.width = W;
        canvas.height = H;
      }
      const ctx = canvas.getContext('2d')!;
      ctx.fillStyle = '#0b0b0b';
      ctx.fillRect(0, 0, W, H);
      const segs = layout(songs, W);
      stateRef.current = { W, H, dpr, segs };
      DRAW[variant]({ ctx, W, H, dpr, phase: phaseRef.current, segs, hover: hoverRef.current, covers: covers.current });
      grain(ctx, W, H);
    };
    const tick = (now: number) => {
      phaseRef.current += Math.min(64, now - last) * 0.0004;
      last = now;
      draw();
      frame = requestAnimationFrame(tick);
    };
    draw();
    if (playing && !reduced) frame = requestAnimationFrame(tick);
    const observer = new ResizeObserver(() => draw());
    observer.observe(canvas);
    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
    };
  }, [songs, playing, reduced, variant, hover, coverTick]);

  const pick = (clientX: number, clientY: number): number | null => {
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return null;
    const { W, H, dpr, segs } = stateRef.current;
    const x = (clientX - rect.left) * dpr;
    const y = (clientY - rect.top) * dpr;
    if (variant === 'c') return pickStrand(x, y, W, H, phaseRef.current, segs);
    const seg = segs.find((g) => x >= g.x0 && x < g.x1);
    if (!seg) return null;
    return Math.abs(y - wave(x, W, H, phaseRef.current)) < H * 0.32 ? seg.song : null;
  };

  const hovered = hover !== null ? songs[hover]?.track : undefined;

  return (
    <>
      <canvas
        ref={canvasRef}
        className={className}
        aria-hidden
        onPointerMove={(e) => e.pointerType === 'mouse' && setHover(pick(e.clientX, e.clientY))}
        onPointerLeave={() => setHover(null)}
        onClick={(e) => {
          const song = pick(e.clientX, e.clientY);
          if (song !== null && onPlay) onPlay(songs[song].track);
        }}
        style={{ cursor: hover !== null && onPlay ? 'pointer' : undefined }}
      />
      <p className="noir-plate-wave-caption" aria-live="polite">
        {hovered ? (
          <>
            <span>{hovered.title}</span> · {hovered.artist}
          </>
        ) : null}
      </p>
    </>
  );
}
