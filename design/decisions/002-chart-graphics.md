# 002 — Chart artwork graphics (deferred)

**Status:** Deferred — redesign in Figma before implementation.

## Problem

Top Hits chart banners (`top_hits_denmark.png`, `top_hits_global.png`) use halftone/wave patterns that read as noisy against the calm NOIR shell. They fight the clean chrome and will be replaced.

## Decision

Until new artwork exists:

- Chart heroes use **heavy dark overlays** (image subdued ~50–65% opacity) so UI typography leads
- Do not add more decorative CSS on top of existing chart PNGs
- Global chart uses the same card language as local, not a separate visual treatment

## Target (Figma later)

| Element | Direction |
|---------|-----------|
| Local chart hero | Warm black/orange atmosphere, minimal texture — aligned with refs (Replay glow, not halftone clutter) |
| Global chart | Cooler neutral warmth, same card system |
| No | Literal halftone dots, purple/blue SaaS gradients, busy 3D waves in chrome |

## Next step

Design one local + one global chart template in Figma, export, replace assets in `src/`.
