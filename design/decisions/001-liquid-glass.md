# 001 — Liquid glass (deferred)

**Status:** Deferred — design in Figma first, implement when spec is proven.

## Problem

Semi-transparent surfaces with `backdrop-filter: blur()` often read as **cheap fake glass** in CSS — especially on flat black backgrounds where there is nothing meaningful to refract.

## Decision

Until we have a proper spec, shell chrome uses **solid elevated surfaces** (`--noir-elevated`, `--noir-chrome`). No faux glass on search, player, or nav.

## Where real liquid glass *could* work later

| Surface | Rationale |
|---------|-----------|
| Compact player (over scrolling content) | Content behind provides depth; blur has something to sample |
| Search overlay / command palette | Modal layer over hero artwork |
| Fullscreen player panels | Atmospheric layers, not functional controls |

## What “real” liquid glass needs (Figma → code)

1. **Layered stack** — background content visible through the surface (not flat `#000` behind glass)
2. **Specular highlight** — top edge gradient or inner shadow (not just opacity)
3. **Tint** — very subtle warm/cool wash, not gray mud
4. **Border** — 1px luminous edge (`rgba(255,255,255,0.12)` top, darker bottom)
5. **Blur amount** — typically 24–40px with `saturate(180%)` (Safari: `-webkit-backdrop-filter`)
6. **Fallback** — solid `--noir-chrome` when `backdrop-filter` unsupported

## Implementation note

Do not ship `backdrop-filter` on elements sitting on solid black. Either move the element over visual content, or use solid fill.

## Next step

Prototype one surface (likely compact player over hero scroll) in Figma with the refs (Replay warm glow, halftone atmosphere). Export tokens + layer recipe, then implement once.
