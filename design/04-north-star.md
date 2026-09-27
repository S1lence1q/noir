# 04 — North star and roadmap

**Status:** Current product goal (2026-09-03)  
**Use with:** [HANDOFF.md](./HANDOFF.md), [01-principles.md](./01-principles.md)

## The big goal

NOIR should feel like **one desktop music application**.

You browse, play, and listen inside the same frame: sidebar, canvas, compact bar. Graphics give the product a face without turning every screen into a poster. Expanding the player is **deeper listening in the same app**, not teleporting into a glassmorphic second product.

Success: a stranger can use it for 30 seconds and think “this is a music app,” not “this is a landing page with a player bolted on.”

## Three pillars

| Pillar | Meaning | Done? |
|--------|---------|-------|
| **Shell** | Persistent nav + canvas + compact playback | Yes — Level 1 |
| **One player world** | Expand stays inside the shell (Spotify-like) | No — next |
| **Owned graphics** | Few Level 3 objects, not glow wallpaper | Started, not good enough |

Settings is finished enough. Do not reopen it unless something is broken.

## Target architecture

```
Always visible
┌──────────┬─────────────────────────────┐
│ Sidebar  │  Canvas                     │
│ Home     │  pages  OR  now-playing     │
│ Discover │  (queue / lyrics later)     │
│ Library  │                             │
│ Settings │                             │
├──────────┴─────────────────────────────┤
│ Compact player (seek later)            │
└────────────────────────────────────────┘
```

`MusicPlayer` logic stays. Presentation moves: today `ready` covers the **whole window**; target is canvas-only, chrome stays.

## Roadmap

### Phase 0 — Foundation (done)

Shell, noir pages, Settings tab, first graphic assets, no auto-fullscreen on play.

### Phase 1 — Player in canvas (next)

**Goal:** Expand never leaves NOIR.

- Sidebar and compact bar remain
- Canvas shows now-playing (artwork, title, essential controls)
- Collapse = last tab (Home/Discover/Library), playback continues
- Do not restyle the old glass player first — **change the frame**
- Queue as canvas panel or side of canvas if cheap; lyrics can wait
- Compact bar: add seek if it stays simple

This is the highest-leverage UX change. Until it ships, the product still feels like two apps.

### Phase 2 — Graphics language (after Phase 1 frame)

**Goal:** Identity you can point at.

Keep:

- Plate wave as **brand mark** (sidebar, maybe one Discover accent) — refine placement, never hard-clip
- Halftone cloud as **rare empty-state object**, low opacity

Drop / do not generate:

- Warm atmosphere JPEGs
- Chart banners that look like CSS glow
- Blue bokeh wallpaper
- Grain tiles unless CSS grain is clearly not enough

Optional later:

- One stronger wave crop (WebP, smaller files)
- Discover typography moment (thin ranks) only if it stays quiet
- Artwork-derived color **only** if it reads as music, not leftover glow

Rule: one graphic beat per screen.

### Phase 3 — Shell completeness

- Compact bar: seek, queue affordance, volume if HUD is not enough
- Search in Home: polish empty / results
- Detail overlays: stay in canvas (already)
- Delete unused assets (`src/*Background.jpeg`, unused `atmosphere-warm.jpeg`)

### Phase 4 — Player surface (only after Phase 1)

Give the in-canvas player NOIR surfaces (solid, grain on artwork, no fake glass). Then delete or shrink the old fullscreen overlay.

SettingsModal inside the old player can die when that overlay dies.

### Out of scope until asked

- Routing / URLs
- Mobile-first shell
- New search ranking
- Rebuilding A/B crossfade
- Accent-color product theming in the shell

## Graphics doctrine (short)

From user feedback, in order:

1. Ambient JPEG behind the hero = fake CSS glow. Rejected.
2. Artwork-color blobs = invisible / same problem. Removed.
3. Objects with form (wave, halftone) = the right *type*. Placement still unfinished.
4. Giant grainy rank numbers = ugly. Reverted.

Do not invent a fourth atmosphere layer.

## How to work

Small visual iterations. Validate in the running app. One pillar at a time: **frame first (Phase 1), then paint (Phase 2)**.
