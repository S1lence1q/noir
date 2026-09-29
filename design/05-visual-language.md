# 05 — Visual language

**Status:** Locked direction (2026-09-27). Chosen from boards in `design/boards/`.
**Decision:** Board A (Dither) is the base language + Board B's spray asterisk and spray wave + Board C only in the sidebar brand.

## One sentence

**Clean black UI. Graphic objects on top, made of one material: grain. Graphics are generated from the music itself.**

## Why graphics failed before

JPEGs were pasted in as wallpaper and corner decoration. They had no job, didn't change with the music, and repeated. From now on, graphics only appear where they **represent something**: the brand, what is playing, a collection, or your data.

## The material: grain

Everything graphic is made of grain: ordered dither, halftone, spray, film noise. Never smooth glow. Never glass.

## Techniques (all rendered in code)

| Technique | Looks like | Used for |
|-----------|-----------|----------|
| **Dither** | 1-bit ordered dither / halftone of a real image (`Statue Dithering`, `Cloud`) | Mix covers, chart covers, playlist covers, artist hero, stats cards |
| **Spray** | Solid form with dissolving, sprayed edges (`Pin fra Pins by you`, `Shape Pin`) | Asterisk mark (large) |
| **Grain field** | Flat color field with visible noise | Background of dither covers only |
| **Cinematic** | Existing plate wave photo | Sidebar brand only. Nowhere else. |
| **Heat** | A blurred shape mapped through a heat ramp (cream rim → peach → lavender core) on a cobalt grain field (ref: blurred figures on blue) | Data drawn as a form: Your sound › your week |
| **Halftone bloom** | Dot grid whose dot size follows a shape + low-frequency swirl, stipple at the fade (ref: `abstract cloud like form`) | Data as texture: Your sound › listening clock |

Heat and halftone bloom are *generated from your data* (`NoirHeatWeek`, `NoirHalftoneClock`, shared helpers in `utils/grainRender.ts`). Same data → same image (seeded). Heat is glow **with** grain, so it stays inside rule 3.

### Dither covers (the core of the system)

A cover = **one flat color field + one dithered image in a lighter or darker tone of the same field + fine grain**.

- **Source image:** the artist photo / artwork most representative of the collection (mix → top artist in mix; playlist → first track artwork; chart → #1 artwork; artist → artist photo).
- **Color field:** chosen from the palette below. Deterministic from the collection id (same mix = same color forever), unless the collection has its own mood (see palette rules).
- **Dither:** Bayer 4×4 or 8×8 ordered dither, cell size 3–4 px at 300 px cover size. Two tones only: the field color + ink (near-black or bone white, whichever contrasts better).
- **Title is NOT printed on the cover.** The title sits under the cover in UI type. (Cleaner, and no editorial typography.)
- Exception: generated collections may carry a tiny asterisk in one corner to mark them as "made for you".

## Palette (color worlds)

UI stays black (`--noir-*` tokens in `src/styles/noir-shell.css`). Color lives only in content: covers, artist hero, stats cards.

| Name | Field | Ink | Mood / use |
|------|-------|-----|------------|
| Cobalt | `#1F3FBF` | `#F2EEE6` | Calm, night, chill |
| Ember | `#E85002` | `#0B0B0B` | Energy, rap, loud (= brand accent) |
| Moss | `#2F7A3E` | `#0B0B0B` | Organic, acoustic, indie |
| Bone | `#EDE8DE` | `#0B0B0B` | Neutral, classic, stats cards |
| Rose | `#E07A9A` | `#0B0B0B` | Pop, playful |
| Ink | `#141414` | `#F2EEE6` | Dark, heavy (use sparingly) |

Rules:
- Max **one** color world per cover. Never gradients between worlds.
- Mixes: color picked from the mix's dominant Last.fm tag (map in `06-product-vision.md`), fallback = hash of id.
- Charts: Denmark = Ember, Global = Cobalt. Fixed.
- Favorites: always Ember + asterisk.
- **Bone** is the only "light" surface and is allowed only for stats/Replay cards and shareable images.

## The mark: spray asterisk

- Five-armed asterisk, slightly irregular (hand-made, not a font glyph).
- Two variants: **vector** (≤ 32 px: logo, badges, favorites, loading) and **spray** (≥ 96 px: empty states, onboarding, Replay).
- Colors: white on black, or ink on a color field. Accent (Ember) only for "favorited" state.
- Used for: logo next to `N O I R`, loading (slow rotation), favorite (replaces heart in a later pass; see `08-craft.md`), "New for you" badge, empty states.

## Graphic slots (the only places graphics may appear)

| Slot | Graphic | Notes |
|------|---------|-------|
| Sidebar brand | Plate wave (keep) + asterisk | Unchanged; this works |
| Collection covers (mix / playlist / chart / favorites) | Dither cover | Everywhere a collection is shown: cards, sidebar thumbnails, headers |
| Artist hero | Dithered artist photo on a color field | Artist page header |
| Now Playing | Artwork-derived atmosphere (blurred artwork + color wash) — **keep, user-approved 2026-09-27**. No spray wave (decision 005) | Fades in after the cover flight lands |
| Home greeting | One dither object (e.g. top artist of the week, dithered) | Small, to the right of the greeting. Optional per day |
| Stats / Replay | Bone cards with dither images | Only here is Bone allowed |
| Empty states + loading | Spray asterisk or halftone cloud | Low-key, centered |

**Everything else gets no graphics.** Lists, menus, settings, forms, search stay pure Level 1.

## Rules

1. One graphic beat per screen (covers in a shelf count as one beat).
2. Never behind text. Graphics sit next to or above content, never as a background layer.
3. No glow without grain. No glassmorphism. No "atmosphere" JPEGs.
4. No editorial typography (giant numbers, cropped type, magazine layouts). UI type only.
5. Graphics are deterministic: the same collection always looks the same.
6. Every graphic has a job. If you can't say what it represents, remove it.

## UI surfaces (Level 1)

- Base is pure black. Tints are **white alpha on black**, never opaque greys (`#111`, `#1a1a1a` read as "off").
- Inline surfaces (inputs, hover, active): `rgba(255,255,255, .04 hover / .06 rest / .08 active / .10 focus)`, no border.
- Floating surfaces (menus, toasts, palette): `--noir-black` + `1px rgba(255,255,255,.12)` + deep shadow. Classes: `.noir-menu`, `.noir-toast`, `.noir-search-palette`.

## What gets deleted

- `src/Cinematic Dark Music Background.jpeg`
- `src/assets/noir/atmosphere-warm.jpeg`
- `src/top_hits_denmark.png`, `src/top_hits_global.png` (replaced by dither covers)
- `src/elva_*.png`, `src/paper_texture.png` if unused (check imports first)
- Red top gradient in Now Playing

## Implementation shape (for tickets)

- `NoirDitherCover` — props `{ source: string; world: ColorWorld; seed: string; size: number; madeForYou?: boolean }`. Renders once to canvas (Bayer dither), caches as a data URL in IndexedDB keyed by `seed+source+world`. Falls back to a plain field + asterisk if the image fails (CORS).
- `NoirMark` — SVG asterisk, `variant: 'vector' | 'spray'`, `size`, `spin?`.
- Image CORS: artwork is loaded through the existing `images.weserv.nl` proxy so canvas isn't tainted.
