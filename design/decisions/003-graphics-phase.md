# 003 — Graphics phase (after shell)

**Status:** Started, not locked. Do **after** player-in-canvas unless a placement bug is blocking. See [04-north-star.md](../04-north-star.md) Phase 2.

## Where we are now

The app is intentionally a **clean music player** today:

- Solid black shell, readable lists, calm heroes
- Light grain on Home hero only (no orange glow — removed after feedback)
- Settings, Discover chart banners, and some overlays still default/minimal

That is **correct order**: structure first, graphics second. Without Level 1, graphics become mud.

## When Settings gets NOIR styling

**Done** — Settings is a shell tab (`NoirSettingsView`). Do not restyle again unless broken.

**Do Settings noir-pass when:**

1. You have at least **one hero/atmosphere asset set** you like (Home or canvas), OR
2. We lock **Level 2 tokens** in code (grain strength, blur blobs, how assets layer)

Then Settings becomes a simple noir panel (same nav typography, solid surfaces) — **30 min code**, not a redesign.

## Your refs → NOIR translation

| Ref | Vibe | NOIR use | Level |
|-----|------|----------|-------|
| Orange ribbed wave | Warm light on black, depth, rhythm | **Primary identity** — Home/Discover atmosphere, optional sidebar accent | 2–3 |
| Blue grain blur | Soft bokeh, film grain, cool void | Canvas **ambient layer** behind content (not UI chrome) | 2 |
| Green grain asterisk | Grain + halftone + bold shape on dark | **Rare Level 3** — empty states, one editorial moment per screen max | 3 |
| Question run | Grainy gradients, huge thin numbers, moody panels | Discover ranks, featured sections, **not** settings/forms | 2–3 |
| Halftone cloud | High-contrast dither, object on void | **Hero accents**, chart placeholders, transition moments | 3 |

**Orange wave** = warm NOIR (brand). **Blue/green** refs = cool contrast moments — use sparingly so orange stays the thread.

## Assets to AI-generate (your own, no copyright)

Export as **WebP or PNG**, dark background, safe to tile or crop:

| Asset ID | Description | Suggested size | Used on |
|----------|-------------|----------------|---------|
| ~~`noir-atmosphere-warm.webp`~~ | ~~Soft orange/red light on pure black~~ | — | **Dropped** — use artwork-derived dynamic color instead |
| `noir-atmosphere-cool.webp` | Blue/indigo bokeh blur + grain (ref 1) | 1920×1080 | Discover / alternate tab mood (optional) |
| `noir-shape-halftone.webp` | One isolated halftone form on black (cloud-like) | 800×800 transparent or on `#000` | Home corner — **wired:** `shape-halftone-cloud.jpeg` |
| `noir-brand-wave.webp` | Orange ribbed plate wave on black | 1200×800 | Discover hero + sidebar brand — **wired:** `Plate Wave Recreation Image.jpeg` |
| ~~`noir-chart-local.webp`~~ | ~~Warm abstract band for local chart~~ | — | **Dropped for now** — chart rows use track artwork; static banners read as fake CSS glow |
| ~~`noir-chart-global.webp`~~ | Cooler neutral abstract for global chart | — | Same as above |
| `noir-grain-tile.webp` | Seamless noise only (optional — CSS grain may be enough) | 512×512 tile | Global overlay |

**Rules for generation:**

- Background **#000000** or easy to key out
- No text, no logos, no recognizable IP
- Prefer **objects with form** (halftone shapes, editorial panels) over ambient glow-only images
- Heavy grain is good; keep **center area calmer** so UI text can sit on top
- Give 2–3 variants per asset; we pick in app

Drop files in `src/assets/noir/` (folder to create when ready).

## Implementation order (code)

| Phase | What | Depends on |
|-------|------|------------|
| **A** | Halftone shape (Home) + plate wave (Discover hero, sidebar) | Assets in `src/assets/noir/` |
| **B** | Editorial rank typography on Discover | Code — `NoirRankedSongRow` |
| **C** | Settings as shell tab (not modal) | `NoirSettingsView` |
| **D** | Graphics refinement (wave, halftone placement) | Ongoing |

We do **not** use static ambient glow JPEGs or invisible CSS blobs — **shapes with form** + **typography** only.

## Success criteria

Graphics feel **intentional and owned**, not stock dark template. UI stays readable. One strong graphic moment per screen, not five.
