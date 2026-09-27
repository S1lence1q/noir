# T06 — `NoirDitherCover` renderer
**Phase:** 3 · **Depends on:** — · **Golden sample:** `design/boards/board-A-dither.png` (the 4 mix covers) · **Size:** M

## Goal
Every collection gets an owned cover in NOIR style, generated from its own artwork. This replaces pasted JPEGs.

## Spec
See `05-visual-language.md` → "Dither covers" and palette.

```ts
type ColorWorld = 'cobalt' | 'ember' | 'moss' | 'bone' | 'rose' | 'ink';
type NoirDitherCoverProps = {
  source?: string;      // image URL (artwork / artist photo)
  world: ColorWorld;
  seed: string;         // collection id — keeps output stable
  size: number;         // CSS px
  madeForYou?: boolean; // tiny asterisk bottom-right (use NoirMark when T08 exists; else a 10 px "*" glyph)
  className?: string;
};
```

Algorithm (canvas 2D, rendered at `size * devicePixelRatio`):
1. Load `source` via the existing `images.weserv.nl` proxy (`crossOrigin = 'anonymous'`) so the canvas is not tainted.
2. Cover-crop to square, grayscale (luma), light contrast curve (gamma 0.9, contrast 1.2).
3. Downscale to a grid where one cell = 3 px at 300 px size (scale proportionally).
4. Bayer 8×8 ordered dither → 1 bit.
5. Paint: background = world field, "on" pixels = world ink (table in 05). Nearest-neighbor upscale (`imageSmoothingEnabled = false`).
6. Add grain: 4 % random luminance noise seeded by `seed` (deterministic).
7. Cache the PNG data URL in IndexedDB keyed `dither:v1:${seed}:${world}:${source}`; memory cache on top.
- No `source` or load error → plain field + centered spray asterisk (or `*` until T08).
- Render off the main thread if simple (`OffscreenCanvas` when available); otherwise requestIdleCallback.

Helper: `worldForCollection(kind, id, tag?)` with the fixed rules from 05 (DK chart = ember, Global = cobalt, Favorites = ember, else tag map, else hash).

## Apply in this ticket
- Discover chart cards + chart page header (DK = ember, Global = cobalt, source = #1 artwork)
- Library Favorites card/header (ember)
- Sidebar playlist thumbnails (20 px — at this size skip dither, use field color + first artwork at 60 % opacity mix; test and pick what reads)

## Files
- new `src/app/components/shell/noir/NoirDitherCover.tsx`
- new `src/app/utils/ditherCover.ts` (pure functions: dither, grain, cache)
- `NoirDiscoverView.tsx`, chart header component, `NoirLibraryView.tsx`, `AppSidebar.tsx`

## Acceptance
- [ ] DK and Global charts now look different and owned
- [ ] Same collection renders identically after refresh (cache hit, no flicker)
- [ ] No console CORS/taint errors; fallback renders when an image fails
- [ ] Scrolling Discover stays smooth

## Don't
- No WebGL for this. No text on covers. No gradients.

## Screenshots to take
Discover charts · chart page header · Favorites header.
