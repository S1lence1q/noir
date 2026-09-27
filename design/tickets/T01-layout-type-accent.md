# T01 — Layout grid, type hierarchy, accent token
**Phase:** 1 · **Depends on:** — · **Golden sample:** — · **Size:** M

## Goal
Every page sits on the same grid and has three clearly different text levels. The app stops looking like "one long list".

## Current
See `design/audit/Noir/01-home.png`, `04-library.png`, `03-chart.png`, `12-settings.png`: Home/Library rows span full width with the heart ~700 px from the title; chart/artist are a narrow centered column; Settings is a narrow left column. Section headings look like row titles. Hearts are coral, volume popup pink.

## Spec
Add to `src/styles/noir-shell.css`:

```css
--noir-content-max: 1120px;
--noir-gutter: 32px;            /* left/right padding of canvas content */
--noir-section-gap: 40px;       /* between sections/shelves */
--noir-accent: #e85002;         /* existing — the ONLY accent */
--noir-accent-soft: rgba(232, 80, 2, 0.14);

--noir-type-page:    600 28px/1.15;  /* page titles: Home, Library */
--noir-type-section: 600 18px/1.3;   /* section headings: Recently played */
--noir-type-row:     500 14px/1.35;  /* row titles */
--noir-type-meta:    400 12px/1.35;  /* artist, counts, times — text-secondary */
--noir-type-label:   600 11px/1.2;   /* uppercase micro labels, letter-spacing .08em, text-tertiary */
```

- One wrapper class `.noir-content` (max-width `--noir-content-max`, margin-inline auto, padding-inline `--noir-gutter`) used by Home, Discover, Library, collection pages (chart/playlist), artist, Settings. Settings content column max 720px inside it.
- Section headings use `--noir-type-section`, 16 px margin below, `--noir-section-gap` above.
- Song rows: grid columns `[#/cover] [title+artist 1fr] [meta 160px] [duration 56px] [actions 96px]`. Meta = album or "12 min ago" depending on list; hide the meta column under 900 px canvas width.
- Row actions (favorite, add, more) are hidden until row hover/focus **everywhere**. Exception: a favorited song shows its filled favorite icon at all times.
- Favorite icon color = `--noir-accent` everywhere (replace coral/pink).

## Files
- `src/styles/noir-shell.css` — tokens + `.noir-content` + row grid
- `src/app/components/shell/noir/NoirPageScaffold.tsx` — apply `.noir-content`
- `src/app/components/shell/noir/NoirSongRow.tsx`, `NoirRankedSongRow.tsx` — row grid, hover actions, duration column
- Views using their own width rules (`NoirHomeView`, `NoirLibraryView`, `NoirSettingsView`, `NoirDetailOverlay`, `NoirArtistView`) — remove custom max-widths, use scaffold

## Acceptance
- [ ] Home, Library, chart, artist, Settings all share the same left edge and max width
- [ ] Headings clearly larger than row titles; meta clearly quieter
- [ ] No coral/pink left anywhere; favorite = accent
- [ ] Rows show duration; actions only on hover (except filled favorite)

## Don't
- Don't redesign pages or add new sections. Only grid, type, color.
- Don't change the sidebar or compact bar.

## Screenshots to take
Home, Library, a chart, Settings — same window size as the audit.
