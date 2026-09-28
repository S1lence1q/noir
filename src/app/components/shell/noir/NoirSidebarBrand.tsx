import { useEffect, useState } from 'react';
import plateWave from '../../../../assets/noir/brand-plate-wave.jpeg';
import halftoneCloud from '../../../../assets/noir/empty-halftone-cloud.jpeg';
import { NoirMark } from './NoirMark';

export const SIDEBAR_BRAND_VARIANTS = [
  'plate',
  'grain',
  'chiaroscuro',
  'asterisk',
  'halftone',
] as const;

export type SidebarBrandVariant = (typeof SIDEBAR_BRAND_VARIANTS)[number];

export const SIDEBAR_BRAND_LABELS: Record<SidebarBrandVariant, string> = {
  plate: 'Current plate wave',
  grain: '1 · Grain / dither wave',
  chiaroscuro: '2 · Light through smoke',
  asterisk: '3 · Spray asterisk',
  halftone: '4 · Halftone cloud',
};

const STORAGE_KEY = 'noir_sidebar_brand_v1';

function readVariant(): SidebarBrandVariant {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw && (SIDEBAR_BRAND_VARIANTS as readonly string[]).includes(raw)) {
      return raw as SidebarBrandVariant;
    }
  } catch {
    /* ignore */
  }
  return 'plate';
}

function writeVariant(v: SidebarBrandVariant) {
  try {
    localStorage.setItem(STORAGE_KEY, v);
  } catch {
    /* ignore */
  }
}

const BAYER_4 = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5].map((v) => (v + 0.5) / 16);

/** Same silhouette as the plate wave, rematerialized as Ember dither grain. */
function useGrainWaveUrl(): string | null {
  const [url, setUrl] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const img = new Image();
    img.decoding = 'async';
    img.onload = () => {
      if (cancelled) return;
      const w = 420;
      const h = Math.round((img.naturalHeight / img.naturalWidth) * w);
      const sample = document.createElement('canvas');
      const cell = 3;
      const cols = Math.ceil(w / cell);
      const rows = Math.ceil(h / cell);
      sample.width = cols;
      sample.height = rows;
      const sctx = sample.getContext('2d', { willReadFrequently: true });
      if (!sctx) return;
      sctx.drawImage(img, 0, 0, cols, rows);
      const data = sctx.getImageData(0, 0, cols, rows).data;

      const out = document.createElement('canvas');
      out.width = w;
      out.height = h;
      const ctx = out.getContext('2d');
      if (!ctx) return;
      // Transparent field — only ink the bright fins
      ctx.clearRect(0, 0, w, h);
      const imgData = ctx.createImageData(w, h);
      const px = imgData.data;
      const ember = [232, 80, 2];

      for (let y = 0; y < h; y++) {
        for (let x = 0; x < w; x++) {
          const sx = Math.min(cols - 1, Math.floor(x / cell));
          const sy = Math.min(rows - 1, Math.floor(y / cell));
          const i = (sy * cols + sx) * 4;
          const luma = (0.2126 * data[i] + 0.7152 * data[i + 1] + 0.0722 * data[i + 2]) / 255;
          const t = BAYER_4[(y % 4) * 4 + (x % 4)];
          // Keep only the lit plates; dissolve the rest
          const lit = luma > 0.22 + t * 0.45;
          const o = (y * w + x) * 4;
          if (lit) {
            px[o] = ember[0];
            px[o + 1] = ember[1];
            px[o + 2] = ember[2];
            px[o + 3] = Math.round(40 + luma * 180);
          } else {
            px[o + 3] = 0;
          }
        }
      }
      ctx.putImageData(imgData, 0, 0);
      if (!cancelled) setUrl(out.toDataURL('image/png'));
    };
    img.src = plateWave;
    return () => {
      cancelled = true;
    };
  }, []);

  return url;
}

type NoirSidebarBrandProps = {
  variant: SidebarBrandVariant;
};

export function NoirSidebarBrandGraphic({ variant }: NoirSidebarBrandProps) {
  const grainUrl = useGrainWaveUrl();

  if (variant === 'plate') {
    return (
      <img
        src={plateWave}
        alt=""
        aria-hidden
        className="noir-accent-wave-sidebar noir-brand-variant-plate"
      />
    );
  }

  if (variant === 'grain') {
    return grainUrl ? (
      <img
        src={grainUrl}
        alt=""
        aria-hidden
        className="noir-accent-wave-sidebar noir-brand-variant-grain"
      />
    ) : (
      <img
        src={plateWave}
        alt=""
        aria-hidden
        className="noir-accent-wave-sidebar noir-brand-variant-grain noir-brand-variant-grain--fallback"
      />
    );
  }

  if (variant === 'chiaroscuro') {
    return (
      <span className="noir-brand-chiaroscuro" aria-hidden>
        <img src={plateWave} alt="" className="noir-brand-chiaroscuro-img" />
        <span className="noir-brand-chiaroscuro-shaft" />
        <span className="noir-brand-chiaroscuro-grain" />
      </span>
    );
  }

  if (variant === 'asterisk') {
    return (
      <span className="noir-brand-asterisk" aria-hidden>
        <NoirMark size={148} variant="spray" color="rgba(249,249,249,0.55)" />
      </span>
    );
  }

  return (
    <img
      src={halftoneCloud}
      alt=""
      aria-hidden
      className="noir-accent-wave-sidebar noir-brand-variant-halftone"
    />
  );
}

/** Click the wordmark to cycle brand graphic experiments (persisted). */
export function useSidebarBrandVariant() {
  const [variant, setVariant] = useState<SidebarBrandVariant>(() => readVariant());

  const cycle = () => {
    setVariant((prev) => {
      const i = SIDEBAR_BRAND_VARIANTS.indexOf(prev);
      const next = SIDEBAR_BRAND_VARIANTS[(i + 1) % SIDEBAR_BRAND_VARIANTS.length];
      writeVariant(next);
      return next;
    });
  };

  return { variant, cycle, label: SIDEBAR_BRAND_LABELS[variant] };
}
