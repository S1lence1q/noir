/**
 * Prefetch Apple Music charts at build time (Node — no CORS).
 * Writes public/charts/{storefront}.json for GitHub Pages / production.
 */
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT_DIR = path.resolve(__dirname, '../public/charts');
const APPLE_BASE = 'https://rss.marketingtools.apple.com';

const STOREFRONTS = ['dk', 'us', 'gb', 'se', 'no', 'de', 'fr', 'jp', 'ca', 'au'];

async function fetchStorefront(code) {
  const url = `${APPLE_BASE}/api/v2/${code}/music/most-played/20/songs.json`;
  const res = await fetch(url, {
    headers: { Accept: 'application/json', 'User-Agent': 'NOIR-chart-prefetch/1.0' },
    signal: AbortSignal.timeout(20000),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const data = await res.json();
  const results = data?.feed?.results;
  if (!Array.isArray(results) || results.length === 0) {
    throw new Error('empty feed');
  }
  // Same shape as Apple's live API so the client mapper stays unchanged.
  return data;
}

await mkdir(OUT_DIR, { recursive: true });

const results = await Promise.allSettled(
  STOREFRONTS.map(async (code) => {
    const payload = await fetchStorefront(code);
    const file = path.join(OUT_DIR, `${code}.json`);
    await writeFile(file, JSON.stringify(payload), 'utf8');
    console.log(`[charts] ${code}: ${payload.feed.results.length} tracks`);
    return code;
  })
);

const ok = results.filter((r) => r.status === 'fulfilled').length;
const failed = results.filter((r) => r.status === 'rejected');
for (const r of failed) {
  console.warn('[charts] failed:', r.reason?.message || r.reason);
}

if (ok === 0) {
  console.warn('[charts] No charts fetched — production Discover will show empty until a successful build.');
  process.exitCode = 0; // don't block deploy on Apple flakes
} else {
  console.log(`[charts] Wrote ${ok}/${STOREFRONTS.length} storefronts → public/charts/`);
}
