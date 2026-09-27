import { useEffect, useRef } from 'react';
import { getGlobalAnalyser } from '../../../utils/audioAnalyzer';
import { hslToRgb, rgbToHsl } from '../../../utils/playerColorUtils';
import { prefersReducedMotion } from '../../../utils/motionPresets';

type NoirSprayWaveProps = {
  /** Extracted cover color (any `rgb()` / `rgba()` string). */
  color?: string | null;
  /** Song identity; shapes the wave so the same song always has the same form. */
  seed: string;
  isPlaying: boolean;
  className?: string;
};

type Rgb = [number, number, number];
type Shape = { k1: number; k2: number; k3: number; o2: number; o3: number };

const BONE: Rgb = [237, 232, 222];
const TAU = Math.PI * 2;

function hashString(value: string): number {
  let h = 2166136261;
  for (let i = 0; i < value.length; i++) {
    h ^= value.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function mulberry32(seed: number) {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function smoothstep(edge0: number, edge1: number, x: number): number {
  const t = Math.min(1, Math.max(0, (x - edge0) / (edge1 - edge0)));
  return t * t * (3 - 2 * t);
}

/** Lifts the (deliberately dark) extracted color so grain reads on black; greyscale covers get Bone. */
function inkFromColor(color?: string | null): Rgb {
  const match = color?.match(/rgba?\(\s*(\d+)[,\s]+(\d+)[,\s]+(\d+)/);
  if (!match) return BONE;
  const { h, s } = rgbToHsl(Number(match[1]), Number(match[2]), Number(match[3]));
  if (s < 0.08) return BONE;
  return hslToRgb(h, Math.min(0.85, Math.max(0.5, s * 1.1)), 0.64);
}

function shapeFromSeed(seed: string): Shape {
  const rand = mulberry32(hashString(seed));
  return {
    k1: 1.15 + rand() * 0.5,
    k2: 2.3 + rand() * 1.0,
    k3: 0.7 + rand() * 0.6,
    o2: rand() * TAU,
    o3: rand() * TAU,
  };
}

type Particles = {
  count: number;
  u: Float32Array;
  g: Float32Array;
  keep: Float32Array;
  alpha: Uint8Array;
  strand: Uint8Array;
};

/** Fixed grain field; only the wave it rides on moves, so the grain stays attached to the form. */
function createParticles(count: number): Particles {
  const rand = mulberry32(0x6e6f6972);
  const u = new Float32Array(count);
  const g = new Float32Array(count);
  const keep = new Float32Array(count);
  const alpha = new Uint8Array(count);
  const strand = new Uint8Array(count);

  for (let i = 0; i < count; i++) {
    const ui = rand();
    const r1 = Math.max(1e-6, rand());
    const gi = Math.max(-3, Math.min(3, Math.sqrt(-2 * Math.log(r1)) * Math.cos(TAU * rand())));
    const taper = smoothstep(0, 0.1, ui) * Math.pow(1 - smoothstep(0.5, 1, ui), 1.4);
    u[i] = ui;
    g[i] = gi;
    keep[i] = rand();
    alpha[i] = Math.round((50 + rand() * 90) * taper);
    strand[i] = Math.abs(gi) > 1.1 && rand() < 0.3 ? Math.round(3 + Math.pow(rand(), 2) * 12) : 0;
  }

  return { count, u, g, keep, alpha, strand };
}

export function NoirSprayWave({ color, seed, isPlaying, className }: NoirSprayWaveProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const inkTargetRef = useRef<Rgb>(inkFromColor(color));
  const shapeTargetRef = useRef<Shape>(shapeFromSeed(seed));
  const playingRef = useRef(isPlaying);
  const redrawRef = useRef<() => void>(() => {});

  useEffect(() => {
    inkTargetRef.current = inkFromColor(color);
    redrawRef.current();
  }, [color]);

  useEffect(() => {
    shapeTargetRef.current = shapeFromSeed(seed);
    redrawRef.current();
  }, [seed]);

  useEffect(() => {
    playingRef.current = isPlaying;
  }, [isPlaying]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;

    const reduced = prefersReducedMotion();
    let particles: Particles | null = null;
    let width = 0;
    let height = 0;
    let image: ImageData | null = null;
    let pixels: Uint32Array | null = null;
    let acc: Uint16Array | null = null;

    const ink: Rgb = [...inkTargetRef.current];
    const shape: Shape = { ...shapeTargetRef.current };
    // Levels only move when the analyser actually hears something; YouTube (cross-origin iframe) never does.
    let bass = 0;
    let mid = 0;
    let high = 0;
    let play = playingRef.current ? 1 : 0;
    let phase = shape.o3;
    let last = performance.now();
    let raf = 0;
    const bins = new Uint8Array(512);

    // One canvas pixel per CSS pixel, scaled up with `pixelated`: the grain is meant to be visible.
    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      width = Math.max(1, Math.round(rect.width));
      height = Math.max(1, Math.round(rect.height));
      canvas.width = width;
      canvas.height = height;
      image = ctx.createImageData(width, height);
      pixels = new Uint32Array(image.data.buffer);
      acc = new Uint16Array(width * height);
      const count = Math.round(Math.min(70000, Math.max(15000, width * height * 0.22)));
      if (!particles || particles.count !== count) particles = createParticles(count);
    };

    const readAudio = (dt: number) => {
      let tb = 0;
      let tm = 0;
      let th = 0;
      const analyser = getGlobalAnalyser();
      if (analyser && playingRef.current) {
        analyser.getByteFrequencyData(bins);
        for (let i = 1; i < 7; i++) tb += bins[i];
        for (let i = 7; i < 47; i++) tm += bins[i];
        for (let i = 47; i < 187; i++) th += bins[i];
        tb /= 6 * 255;
        tm /= 40 * 255;
        th /= 140 * 255;
      }
      const follow = (current: number, target: number) =>
        current + (target - current) * (1 - Math.exp(-dt * (target > current ? 18 : 4)));
      bass = follow(bass, tb);
      mid = follow(mid, tm);
      high = follow(high, th);
      play += ((playingRef.current ? 1 : 0) - play) * (1 - Math.exp(-dt * 2.2));
    };

    const draw = () => {
      if (!particles || !image || !pixels || !acc) return;
      acc.fill(0);

      const cy = height / 2;
      const amp = height * (0.17 + 0.08 * bass);
      const thick = height * (0.07 + 0.03 * mid);
      const strandScale = 1 + high * 1.5;
      const { count, u, g, keep, alpha, strand } = particles;
      const w = width;
      const h = height;

      for (let i = 0; i < count; i++) {
        const ui = u[i];
        const wave = Math.sin(shape.k1 * ui * TAU - phase);
        // Crests are dense, zero crossings are airy (like the reference spray).
        if (keep[i] > 0.4 + 0.6 * Math.abs(wave) + 0.15 * bass) continue;
        const env = 0.6 + 0.4 * smoothstep(0, 0.3, ui);
        const yc = cy + amp * env * (0.78 * wave + 0.22 * Math.sin(shape.k2 * ui * TAU + phase * 0.6 + shape.o2));
        const t = thick * (0.7 + 0.3 * Math.sin(shape.k3 * ui * TAU + phase * 0.4 + shape.o3));
        const gi = g[i];
        const x = (ui * w) | 0;
        let y = (yc + gi * t) | 0;
        if (x < 0 || x >= w) continue;
        const a = alpha[i];
        if (y >= 0 && y < h) acc[y * w + x] += a;

        const len = (strand[i] * strandScale) | 0;
        if (len > 0) {
          const dir = gi > 0 ? 1 : -1;
          for (let s = 1; s <= len; s++) {
            y += dir;
            if (y < 0 || y >= h) break;
            acc[y * w + x] += (a * (1 - s / (len + 1)) * 0.7) | 0;
          }
        }
      }

      const r = Math.round(ink[0]);
      const gr = Math.round(ink[1]);
      const b = Math.round(ink[2]);
      const rgb = (b << 16) | (gr << 8) | r;
      for (let p = 0; p < acc.length; p++) {
        const v = acc[p];
        pixels[p] = v === 0 ? 0 : ((v > 255 ? 255 : v) << 24) | rgb;
      }
      ctx.putImageData(image, 0, 0);
    };

    const ease = (dt: number) => {
      const s = 1 - Math.exp(-dt * 3);
      for (let i = 0; i < 3; i++) ink[i] += (inkTargetRef.current[i] - ink[i]) * s;
      const m = 1 - Math.exp(-dt * 1.5);
      const target = shapeTargetRef.current;
      shape.k1 += (target.k1 - shape.k1) * m;
      shape.k2 += (target.k2 - shape.k2) * m;
      shape.k3 += (target.k3 - shape.k3) * m;
      shape.o2 += (target.o2 - shape.o2) * m;
      shape.o3 += (target.o3 - shape.o3) * m;
    };

    const frame = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      readAudio(dt);
      ease(dt);
      phase += dt * (0.35 + bass * 1.4) * play;
      draw();
      raf = requestAnimationFrame(frame);
    };

    const drawStatic = () => {
      ink.splice(0, 3, ...inkTargetRef.current);
      Object.assign(shape, shapeTargetRef.current);
      draw();
    };

    resize();
    const observer = new ResizeObserver(() => {
      resize();
      if (reduced) drawStatic();
    });
    observer.observe(canvas);

    if (reduced) {
      redrawRef.current = drawStatic;
      drawStatic();
    } else {
      raf = requestAnimationFrame(frame);
    }

    return () => {
      cancelAnimationFrame(raf);
      observer.disconnect();
      redrawRef.current = () => {};
    };
  }, []);

  return <canvas ref={canvasRef} className={className} style={{ imageRendering: 'pixelated' }} aria-hidden />;
}
