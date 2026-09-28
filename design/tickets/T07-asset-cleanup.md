> **Status:** **Partial.** Plate wave / cloud assets moved under `src/assets/noir/`; cinematic JPEG deleted. Still open: legacy `DiscoverView.tsx` imports `top_hits_denmark.png` / `top_hits_global.png` (live Discover is `NoirDiscoverView`). Do not delete `atmosphere-warm.jpeg` (fallback + Stats). Leave untracked originals alone.
**Phase:** 3 · **Depends on:** T06 · **Golden sample:** — · **Size:** S

## Goal
Remove pasted graphics so only slot graphics remain.

## Spec
1. Discover hero: remove the plate wave image pasted on top of the chart artwork (`design/audit/Noir/02-discover.png`). Hero until T18 = chart #1 as a 240 px `NoirDitherCover` (ember) left + title/artist/Play right, on plain black.
2. Home hero: stop stretching the last-played artwork (`01-home.png`). Until T12, the hero becomes: greeting (`Good evening` / `Good morning` / `Good afternoon` / `Up late`, by hour) + subline `Continue with {title}` + Play. No image.
3. Now Playing: remove the red top gradient glow (`09-now-playing.png`); plain black until T14.
4. Delete unused files after checking imports with ripgrep: `src/Cinematic Dark Music Background.jpeg`, `src/assets/noir/atmosphere-warm.jpeg`, `src/top_hits_denmark.png`, `src/top_hits_global.png`, and `src/elva_*.png` / `src/paper_texture.png` if unused.
5. Move the kept assets to clear names: `src/assets/noir/brand-plate-wave.jpeg`, `src/assets/noir/empty-halftone-cloud.jpeg`; update `NoirGraphicAccent.tsx` imports.
6. Leave `src/Plate Wave Recreation Image.jpeg` and `src/abstract cloud like form.jpeg` (untracked originals) alone.

## Acceptance
- [ ] Sidebar plate wave unchanged
- [ ] No other photographic graphics anywhere
- [ ] Build passes; no missing imports

## Screenshots to take
Home · Discover · Now Playing.
