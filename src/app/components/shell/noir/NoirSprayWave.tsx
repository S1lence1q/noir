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
const BUCKETS = 7;
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
  return hslToRgb(h, Math.min(0.9, Math.max(0.55, s * 1.2)), 0.6);
}

function shapeFromSeed(seed: string): Shape {
  const rand = mulberry32(hashString(seed));
  return {
    k1: 1.1 + rand() * 0.6,
    k2: 2.2 + rand() * 1.1,
    k3: 0.8 + rand() * 0.7,
    o2: rand() * TAU,
    o3: rand() * TAU,
  };
}

type Particles = {
  u: Float32Array;
  g: Float32Array;
  len: Float32Array;
  buckets: Uint32Array[];
};

/** Fixed particle field; only the wave it rides on moves, so the grain stays attached to the form. */
function createParticles(count: number): Particles {
  const rand = mulberry32(0x6e6f6972);
  const u = new Float32Array(count);
  const g = new Float32Array(count);
  const len = new Float32Array(count);
  const bucketLists: number[][] = Array.from({ length: BUCKETS }, () => []);

  for (let i = 0; i < count; i++) {
    const ui = rand();
    const r1 = Math.max(1e-6, rand());
    const r2 = rand();
    const gi = Math.max(-2.8, Math.min(2.8, Math.sqrt(-2 * Math.log(r1)) * Math.cos(TAU * r2)));
    const taper = smoothstep(0, 0.14, ui) * Math.pow(1 - smoothstep(0.58, 1, ui), 1.2);
    const alpha = Math.exp(-gi * gi * 0.32) * taper * (0.3 + 0.7 * rand());

    u[i] = ui;
    g[i] = gi;
    len[i] = (1 + Math.pow(rand(), 3) * 7) * (0.6 + Math.abs(gi) * 0.45);

    const bucket = Math.min(BUCKETS - 1, Math.floor(alpha * BUCKETS));
    if (alpha > 0.02) bucketLists[bucket].push(i);
  }

  return { u, g, len, buckets: bucketLists.map((list) => Uint32Array.from(list)) };
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
    let dpr = 1;

    const ink: Rgb = [...inkTargetRef.current];
    const shape: Shape = { ...shapeTargetRef.current };
    let bass = 0;
    let mid = 0;
    let high = 0;
    let play = playingRef.current ? 1 : 0;
    let phase = shape.o3;
    let silentFor = 0;
    let last = performance.now();
    let raf = 0;
    const bins = new Uint8Array(512);

    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      dpr = Math.min(2, window.devicePixelRatio || 1);
      width = Math.max(1, Math.round(rect.width * dpr));
      height = Math.max(1, Math.round(rect.height * dpr));
      canvas.width = width;
      canvas.height = height;
      const count = Math.round(Math.min(14000, Math.max(3000, (rect.width * rect.height) / 11)));
      if (!particles || particles.u.length !== count) particles = createParticles(count);
    };

    const readAudio = (dt: number, now: number) => {
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
      silentFor = tb + tm + th < 0.01 ? silentFor + dt : 0;

      // YouTube playback isn't routed through Web Audio; fall back to a slow, music-paced pulse.
      if (playingRef.current && silentFor > 0.6) {
        const t = now / 1000;
        tb = 0.5 + 0.2 * Math.sin(t * 2.1) + 0.1 * Math.sin(t * 5.3 + 1.3);
        tm = 0.42 + 0.12 * Math.sin(t * 3.1 + 0.7);
        th = 0.3 + 0.1 * Math.sin(t * 7.1 + 2);
      }

      const follow = (current: number, target: number) =>
        current + (target - current) * (1 - Math.exp(-dt * (target > current ? 16 : 3.2)));
      bass = follow(bass, tb);
      mid = follow(mid, tm);
      high = follow(high, th);
      play += ((playingRef.current ? 1 : 0) - play) * (1 - Math.exp(-dt * 2.2));
    };

    const draw = () => {
      if (!particles) return;
      ctx.clearRect(0, 0, width, height);

      const cy = height / 2;
      const amp = height * (0.1 + 0.11 * bass);
      const thick = height * (0.05 + 0.025 * mid);
      const strand = dpr * (1 + high * 1.8);
      const fiber = Math.max(1, dpr * 0.75);
      const { u, g, len, buckets } = particles;
      const [r, gr, b] = ink.map(Math.round);

      for (let k = 0; k < BUCKETS; k++) {
        const list = buckets[k];
        if (list.length === 0) continue;
        ctx.fillStyle = `rgba(${r},${gr},${b},${((k + 0.5) / BUCKETS) * 0.9})`;
        ctx.beginPath();
        for (let j = 0; j < list.length; j++) {
          const i = list[j];
          const ui = u[i];
          const x = ui * width;
          const env = 0.55 + 0.45 * smoothstep(0, 0.35, ui);
          const yc =
            cy +
            amp *
              env *
              (0.72 * Math.sin(shape.k1 * ui * TAU - phase) +
                0.28 * Math.sin(shape.k2 * ui * TAU + phase * 0.63 + shape.o2));
          const t = thick * (0.62 + 0.38 * Math.sin(shape.k3 * ui * TAU + phase * 0.41 + shape.o3));
          const y = yc + g[i] * t;
          const h = len[i] * strand;
          ctx.rect(x, g[i] > 0 ? y : y - h, fiber, h);
        }
        ctx.fill();
      }
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
      readAudio(dt, now);
      ease(dt);
      phase += dt * (0.5 + bass * 1.2) * play;
      draw();
      raf = requestAnimationFrame(frame);
    };

    const drawStatic = () => {
      ink.splice(0, 3, ...inkTargetRef.current);
      Object.assign(shape, shapeTargetRef.current);
      bass = 0.5;
      mid = 0.5;
      high = 0.3;
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

  return <canvas ref={canvasRef} className={className} aria-hidden />;
}
