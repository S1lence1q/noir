/** Dither cover renderer — design/05-visual-language.md "Dither covers". */

export type ColorWorld = 'cobalt' | 'ember' | 'moss' | 'bone' | 'rose' | 'ink';

/** Bright image areas → `light`, dark areas → `dark`. `field` is the placeholder / fallback color. */
export const COLOR_WORLDS: Record<ColorWorld, { field: string; light: string; dark: string; mark: string }> = {
  cobalt: { field: '#1F3FBF', light: '#F2EEE6', dark: '#1F3FBF', mark: '#F2EEE6' },
  ember: { field: '#E85002', light: '#E85002', dark: '#0B0B0B', mark: '#0B0B0B' },
  moss: { field: '#2F7A3E', light: '#2F7A3E', dark: '#0B0B0B', mark: '#0B0B0B' },
  bone: { field: '#EDE8DE', light: '#EDE8DE', dark: '#0B0B0B', mark: '#0B0B0B' },
  rose: { field: '#E07A9A', light: '#E07A9A', dark: '#0B0B0B', mark: '#0B0B0B' },
  ink: { field: '#141414', light: '#F2EEE6', dark: '#141414', mark: '#F2EEE6' },
};

const HASH_WORLDS: ColorWorld[] = ['cobalt', 'ember', 'moss', 'rose', 'bone'];

const FIXED_WORLDS: Record<string, ColorWorld> = {
  dk_hits: 'ember',
  global_hits: 'cobalt',
  favorites: 'ember',
};

export function hashString(value: string): number {
  let h = 2166136261;
  for (let i = 0; i < value.length; i++) {
    h ^= value.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

export function worldForCollection(id: string): ColorWorld {
  return FIXED_WORLDS[id] ?? HASH_WORLDS[hashString(id) % HASH_WORLDS.length];
}

/** Mix color from dominant Last.fm tag (design/06-product-vision.md F4). */
export function worldForTag(tag: string): ColorWorld {
  const t = tag.toLowerCase();
  if (/hip-?hop|rap|trap|drill|grime/.test(t)) return 'ember';
  if (/chill|lo-?fi|ambient|electronic|techno|house|edm/.test(t)) return 'cobalt';
  if (/indie|folk|acoustic|rock|alternative|singer/.test(t)) return 'moss';
  if (/pop|dance|disco|r&b|rnb|soul/.test(t)) return 'rose';
  if (/metal|dark|industrial|punk|goth/.test(t)) return 'ink';
  return HASH_WORLDS[hashString(t) % HASH_WORLDS.length];
}

const BAYER_8 = [
  0, 32, 8, 40, 2, 34, 10, 42,
  48, 16, 56, 24, 50, 18, 58, 26,
  12, 44, 4, 36, 14, 46, 6, 38,
  60, 28, 52, 20, 62, 30, 54, 22,
  3, 35, 11, 43, 1, 33, 9, 41,
  51, 19, 59, 27, 49, 17, 57, 25,
  15, 47, 7, 39, 13, 45, 5, 37,
  63, 31, 55, 23, 61, 29, 53, 21,
].map((v) => (v + 0.5) / 64);

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

function hexToRgb(hex: string): [number, number, number] {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

/** Prefer same-origin / data URLs; otherwise load via CORS-friendly CDN or weserv. */
function proxiedSource(source: string, px: number): string {
  return `https://images.weserv.nl/?url=${encodeURIComponent(source)}&w=${px}&h=${px}&fit=cover&output=png`;
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.decoding = 'async';
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`dither: failed to load ${src}`));
    img.src = src;
  });
}

async function loadSourceImage(source: string, px: number): Promise<HTMLImageElement> {
  if (/^(blob:|data:)/.test(source) || source.startsWith('/') || source.startsWith(window.location.origin)) {
    return loadImage(source);
  }
  // Apple / Deezer CDNs usually allow anonymous canvas reads — try direct first.
  try {
    return await loadImage(source);
  } catch {
    return loadImage(proxiedSource(source, Math.min(600, px)));
  }
}

const CACHE_VERSION = 'v2';
const memoryCache = new Map<string, string>();
const inflight = new Map<string, Promise<string>>();

const DB_NAME = 'noir-covers';
const STORE = 'covers';
let dbPromise: Promise<IDBDatabase | null> | null = null;

function openDb(): Promise<IDBDatabase | null> {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve) => {
    if (typeof indexedDB === 'undefined') return resolve(null);
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => req.result.createObjectStore(STORE);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => resolve(null);
  });
  return dbPromise;
}

async function idbGet(key: string): Promise<string | undefined> {
  const db = await openDb();
  if (!db) return undefined;
  return new Promise((resolve) => {
    const req = db.transaction(STORE, 'readonly').objectStore(STORE).get(key);
    req.onsuccess = () => resolve(req.result as string | undefined);
    req.onerror = () => resolve(undefined);
  });
}

async function idbSet(key: string, value: string): Promise<void> {
  const db = await openDb();
  if (!db) return;
  db.transaction(STORE, 'readwrite').objectStore(STORE).put(value, key);
}

export function ditherCacheKey(source: string, world: ColorWorld, seed: string, px: number) {
  return `dither:${CACHE_VERSION}:${seed}:${world}:${px}:${source}`;
}

export function getCachedDitherCover(key: string): string | undefined {
  return memoryCache.get(key);
}

function paint(img: HTMLImageElement, world: ColorWorld, seed: string, px: number, cellPx: number): string {
  const cells = Math.max(12, Math.round(px / cellPx));

  const sample = document.createElement('canvas');
  sample.width = cells;
  sample.height = cells;
  const sctx = sample.getContext('2d', { willReadFrequently: true })!;
  const side = Math.min(img.naturalWidth, img.naturalHeight);
  sctx.drawImage(
    img,
    (img.naturalWidth - side) / 2,
    (img.naturalHeight - side) / 2,
    side,
    side,
    0,
    0,
    cells,
    cells
  );
  const data = sctx.getImageData(0, 0, cells, cells);
  const px4 = data.data;

  const luma = new Float32Array(cells * cells);
  for (let i = 0; i < luma.length; i++) {
    luma[i] = (0.2126 * px4[i * 4] + 0.7152 * px4[i * 4 + 1] + 0.0722 * px4[i * 4 + 2]) / 255;
  }

  // Auto-levels (2nd–98th percentile) so flat artwork still produces a readable dither.
  const sorted = Array.from(luma).sort((a, b) => a - b);
  const lo = sorted[Math.floor(sorted.length * 0.02)];
  const hi = sorted[Math.floor(sorted.length * 0.98)];
  const range = Math.max(0.08, hi - lo);

  const { field, light, dark } = COLOR_WORLDS[world];
  const [lr, lg, lb] = hexToRgb(light);
  const [dr, dg, db] = hexToRgb(dark);
  const rand = mulberry32(hashString(seed));

  const levels = new Float32Array(luma.length);
  let mean = 0;
  for (let i = 0; i < luma.length; i++) {
    const v = Math.min(1, Math.max(0, (luma[i] - lo) / range));
    // S-curve: backgrounds collapse to solid, the subject keeps its mid-tones.
    levels[i] = v < 0.5 ? 2 * v * v : 1 - 2 * (1 - v) * (1 - v);
    mean += levels[i];
  }
  mean /= levels.length;

  // The field color must dominate the cover, so invert when the image's majority tone would map to ink.
  const fieldIsLight = field === light;
  const invert = fieldIsLight ? mean < 0.5 : mean > 0.5;

  for (let y = 0; y < cells; y++) {
    for (let x = 0; x < cells; x++) {
      const i = y * cells + x;
      const v = invert ? 1 - levels[i] : levels[i];
      const on = v > BAYER_8[(y % 8) * 8 + (x % 8)];
      const o = i * 4;
      px4[o] = on ? lr : dr;
      px4[o + 1] = on ? lg : dg;
      px4[o + 2] = on ? lb : db;
      px4[o + 3] = 255;
    }
  }
  sctx.putImageData(data, 0, 0);

  const out = document.createElement('canvas');
  out.width = px;
  out.height = px;
  const octx = out.getContext('2d')!;
  octx.imageSmoothingEnabled = false;
  octx.drawImage(sample, 0, 0, px, px);

  // Film grain: sparse seeded specks in both tones.
  const specks = Math.round(px * px * 0.012);
  for (let i = 0; i < specks; i++) {
    octx.fillStyle = rand() > 0.5 ? `rgba(${lr},${lg},${lb},0.35)` : `rgba(${dr},${dg},${db},0.35)`;
    octx.fillRect(Math.floor(rand() * px), Math.floor(rand() * px), 1, 1);
  }

  return out.toDataURL('image/png');
}

/** Renders (or returns cached) a dither cover as a PNG data URL. `px` is device pixels. */
export function renderDitherCover(source: string, world: ColorWorld, seed: string, px: number): Promise<string> {
  const key = ditherCacheKey(source, world, seed, px);
  const cached = memoryCache.get(key);
  if (cached) return Promise.resolve(cached);
  const running = inflight.get(key);
  if (running) return running;

  const job = (async () => {
    const stored = await idbGet(key);
    if (stored) {
      memoryCache.set(key, stored);
      return stored;
    }
    const img = await loadSourceImage(source, px);
    // Cell size in device px: coarse enough to read as dither, fine enough at thumbnail size.
    const cellPx = px >= 320 ? 4 : px >= 160 ? 3 : 2;
    const url = paint(img, world, seed, px, cellPx);
    memoryCache.set(key, url);
    void idbSet(key, url);
    return url;
  })().finally(() => inflight.delete(key));

  inflight.set(key, job);
  return job;
}
