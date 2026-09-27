# T08 — `NoirMark` asterisk
**Phase:** 3 · **Depends on:** — · **Golden sample:** THIS IS ONE (built by Opus) · **Size:** S

## Goal
NOIR gets its mark: a hand-made five-armed asterisk, used as a recurring detail.

## Spec
See `05-visual-language.md` → "The mark". References: `design/references/Pin fra Pins by you.jpg`, `grøn.png`, `design/boards/board-B-spray.png` (top-left).

```ts
type NoirMarkProps = {
  size?: number;                 // default 16
  variant?: 'vector' | 'spray';  // spray only ≥ 96 px
  color?: string;                // default currentColor
  spin?: boolean;                // slow rotation for loading (8 s / turn), off with reduced motion
  className?: string;
};
```
- Vector: one SVG path, five slightly uneven arms with rounded-square ends (not a font glyph).
- Spray: same path + SVG filter (`feTurbulence` + `feDisplacementMap` + a threshold) to dissolve the edges into grain.

## Apply in this ticket
- Sidebar: 12 px vector mark after the `N O I R` wordmark (plate wave stays).
- Loading: full-canvas loading states use `<NoirMark size={24} spin />`.
- Empty states in Library (favorites / playlists): replace the halftone accent with `<NoirMark size={120} variant="spray" />` at 60 % opacity, **or** keep the halftone cloud — pick one per screen, never both.

## Files
- new `src/app/components/shell/noir/NoirMark.tsx`
- `AppSidebar.tsx`, `NoirLibraryView.tsx`, loading spots

## Acceptance
- [ ] Mark is crisp at 12 px and grainy at 120 px
- [ ] Spin respects reduced motion

## Screenshots to take
Sidebar top · Library empty favorites (clear favorites in a private window) · a loading state.
