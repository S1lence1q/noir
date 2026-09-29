import { useEffect, useMemo, useRef, useState } from 'react';
import type { SearchResult } from '../../../types';
import { seededRandom } from '../../../utils/grainRender';
import { COLOR_WORLDS, worldForCollection } from '../../../utils/ditherCover';

/**
 * Your recent listening as a plate wave (ref: src/Plate Wave Recreation Image). Each song is a
 * run of thin lit plates, coloured from its cover, as many as you played it; newest nearest.
 * The wave drifts while music plays and holds still when paused. Hover names a song, click plays it.
 */

export type PlateWaveSong = { track: SearchResult; weight: number };

type RGB = [number, number, number];

const colourCache = new Map<string, RGB>();

function hexToRgb(hex: string): RGB {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

/** The cover's most characterful colour: saturated, mid-light pixels, averaged. */
function coverColour(src: string): Promise<RGB | null> {
  const cached = colourCache.get(src);
  if (cached) return Promise.resolve(cached);
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.src = src.startsWith('data:') ? src : `https://images.weserv.nl/?url=${encodeURIComponent(src)}&w=24&h=24&fit=cover`;
    img.onload = () => {
      try {
        const c = document.createElement('canvas');
        c.width = 24;
        c.height = 24;
        const ctx = c.getContext('2d')!;
        ctx.drawImage(img, 0, 0, 24, 24);
        const d = ctx.getImageData(0, 0, 24, 24).data;
        const px: { rgb: RGB; score: number }[] = [];
        for (let i = 0; i < d.length; i += 4) {
          const r = d[i], g = d[i + 1], b = d[i + 2];
          const max = Math.max(r, g, b), min = Math.min(r, g, b);
          const l = (max + min) / 510;
          const s = max === min ? 0 : (max - min) / (255 - Math.abs(max + min - 255));
          px.push({ rgb: [r, g, b], score: s * 1.4 + (0.5 - Math.abs(0.5 - l)) });
        }
        px.sort((a, b) => b.score - a.score);
        const top = px.slice(0, Math.max(8, Math.floor(px.length * 0.15)));
        const avg = top.reduce<RGB>((acc, p) => [acc[0] + p.rgb[0], acc[1] + p.rgb[1], acc[2] + p.rgb[2]], [0, 0, 0]).map(
          (v) => v / top.length
        ) as RGB;
        colourCache.set(src, avg);
        resolve(avg);
      } catch {
        resolve(null);
      }
    };
    img.onerror = () => resolve(null);
  });
}

const mix = (a: RGB, b: RGB, t: number): RGB => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
const css = (c: RGB, a = 1) => `rgba(${c[0] | 0},${c[1] | 0},${c[2] | 0},${a})`;
const WHITE: RGB = [255, 244, 236];
const BLACK: RGB = [6, 4, 4];

type Plate = { song: number; colour: RGB };

const TARGET_PLATES = 46;

function makeGrain(size: number) {
  const c = document.createElement('canvas');
  c.width = size;
  c.height = size;
  const ctx = c.getContext('2d')!;
  const img = ctx.createImageData(size, size);
  const rand = seededRandom('plate-grain');
  for (let i = 0; i < img.data.length; i += 4) {
    const v = rand() * 255;
    img.data[i] = img.data[i + 1] = img.data[i + 2] = v;
    img.data[i + 3] = 255;
  }
  ctx.putImageData(img, 0, 0);
  return c;
}

export function NoirPlateWave({
  songs,
  playing,
  onPlay,
  className,
}: {
  songs: PlateWaveSong[];
  playing: boolean;
  onPlay?: (track: SearchResult) => void;
  className?: string;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [colours, setColours] = useState<Record<string, RGB>>({});
  const [hover, setHover] = useState<number | null>(null);
  const hitRef = useRef<{ x: number; song: number }[]>([]);
  const phaseRef = useRef(0);
  const reduced = typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const songKey = songs.map((s) => s.track.id).join('|');
  useEffect(() => {
    let cancelled = false;
    for (const { track } of songs) {
      if (!track.thumbnail || colours[track.id]) continue;
      void coverColour(track.thumbnail).then((rgb) => {
        if (!cancelled && rgb) setColours((c) => ({ ...c, [track.id]: rgb }));
      });
    }
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [songKey]);

  // ~64 plates shared by play count (at least 2 each); newest song last = nearest.
  const plates = useMemo<Plate[]>(() => {
    const out: Plate[] = [];
    const total = songs.reduce((sum, s) => sum + Math.max(1, s.weight), 0) || 1;
    songs.forEach(({ track, weight }, song) => {
      const colour = colours[track.id] ?? hexToRgb(COLOR_WORLDS[worldForCollection(track.artist || track.id)].field);
      const n = Math.max(2, Math.round((Math.max(1, weight) / total) * TARGET_PLATES));
      for (let k = 0; k < n; k++) out.push({ song, colour });
    });
    return out;
  }, [songs, colours]);

  const hoverRef = useRef(hover);
  hoverRef.current = hover;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || plates.length === 0) return;
    const grain = makeGrain(128);
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
      ctx.clearRect(0, 0, W, H);
      const phase = phaseRef.current;
      const N = plates.length;
      const hits: { x: number; song: number }[] = [];

      // Warm light from the right, tinted by the newest song.
      const lead = plates[N - 1].colour;
      const glow = ctx.createRadialGradient(W * 0.95, H * 0.55, 0, W * 0.95, H * 0.55, W * 0.55);
      glow.addColorStop(0, css(mix(lead, WHITE, 0.1), 0.32));
      glow.addColorStop(1, css(lead, 0));
      ctx.fillStyle = glow;
      ctx.fillRect(0, 0, W, H);

      for (let i = 0; i < N; i++) {
        const t = N === 1 ? 1 : i / (N - 1);
        const depth = 0.45 + 0.75 * t * t; // far (left) → near (right)
        const x = W * (0.5 + 0.56 * t);
        const y = H * (0.52 + 0.2 * Math.sin(i * 0.19 + phase) * (0.7 + 0.3 * Math.sin(i * 0.05 + phase * 0.4)));
        const ry = H * 0.3 * depth * (0.85 + 0.15 * Math.sin(i * 0.13 + phase * 0.8));
        const rx = ry * 0.27;
        const dy = Math.cos(i * 0.19 + phase) * 0.19 * H * 0.2;
        const angle = Math.atan2(dy, (W * 0.56) / N) * 0.5 - 0.42;
        const { colour, song } = plates[i];
        const dimmed = hoverRef.current !== null && hoverRef.current !== song;
        const lit = mix(colour, WHITE, 0.45);
        const shade = mix(colour, BLACK, 0.7);

        ctx.save();
        ctx.translate(x, y);
        ctx.rotate(angle);
        const g = ctx.createLinearGradient(-rx, 0, rx, 0);
        g.addColorStop(0, css(shade));
        g.addColorStop(0.55, css(colour));
        g.addColorStop(1, css(lit));
        ctx.globalAlpha = dimmed ? 0.35 : 0.96;
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.ellipse(0, 0, rx, ry, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = dimmed ? 0.15 : 0.5;
        ctx.strokeStyle = css(mix(lit, WHITE, 0.4));
        ctx.lineWidth = Math.max(1, dpr * 0.8);
        ctx.beginPath();
        ctx.ellipse(0, 0, rx, ry, 0, -Math.PI * 0.45, Math.PI * 0.45);
        ctx.stroke();
        ctx.restore();
        hits.push({ x: x / dpr, song });
      }
      ctx.globalAlpha = 1;

      // Grain over everything.
      ctx.globalCompositeOperation = 'overlay';
      ctx.globalAlpha = 0.14;
      ctx.fillStyle = ctx.createPattern(grain, 'repeat')!;
      ctx.fillRect(0, 0, W, H);
      ctx.globalCompositeOperation = 'source-over';
      ctx.globalAlpha = 1;
      hitRef.current = hits;
    };

    const tick = (now: number) => {
      phaseRef.current += Math.min(64, now - last) * 0.00035;
      last = now;
      draw();
      frame = requestAnimationFrame(tick);
    };

    draw();
    const animate = playing && !reduced;
    if (animate) frame = requestAnimationFrame(tick);
    const observer = new ResizeObserver(() => draw());
    observer.observe(canvas);
    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
    };
  }, [plates, playing, reduced, hover]);

  const pick = (clientX: number) => {
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return null;
    const x = clientX - rect.left;
    let best: { x: number; song: number } | null = null;
    for (const h of hitRef.current) if (!best || Math.abs(h.x - x) < Math.abs(best.x - x)) best = h;
    return best && Math.abs(best.x - x) < 40 ? best.song : null;
  };

  const hovered = hover !== null ? songs[hover]?.track : undefined;

  return (
    <>
      <canvas
        ref={canvasRef}
        className={className}
        aria-hidden
        onPointerMove={(e) => e.pointerType === 'mouse' && setHover(pick(e.clientX))}
        onPointerLeave={() => setHover(null)}
        onClick={(e) => {
          const song = pick(e.clientX);
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
