# NOIR — Design Documentation

Design foundation for the **NOIR** redesign (new application identity built on Elva's playback stack).

## What this is

Creative and architectural context for turning design direction into a coherent product. This is **not** a rigid implementation checklist.

## What this is not

- A pixel-perfect spec copied from Figma
- A complete design system (that emerges as we build)
- A replacement for the existing technical docs (`elva_system_memories.md`, etc.)

## Workflow

| Role | Responsibility |
|------|----------------|
| Gemini / Antigravity | Technical and codebase understanding |
| Product / design | Direction, references, creative decisions |
| Cursor | Translate both into architecture, then implement iteratively |

We work in small visual iterations. Some decisions will only become clear once built.

## Files

| File | Purpose |
|------|---------|
| [01-principles.md](./01-principles.md) | North star, constraints, graphics hierarchy |
| [02-architecture.md](./02-architecture.md) | App shell, layout zones, player modes |
| [references/figma-map.md](./references/figma-map.md) | How Figma references map to Elva (to be filled in) |
| [decisions/000-shell-vs-player.md](./decisions/000-shell-vs-player.md) | Shell-first vs player-centric (working hypothesis) |
| [decisions/001-liquid-glass.md](./decisions/001-liquid-glass.md) | Liquid glass deferred — Figma-first, no fake blur |
| [decisions/002-chart-graphics.md](./decisions/002-chart-graphics.md) | Chart banner artwork — Figma redesign before swap |
| [decisions/003-graphics-phase.md](./decisions/003-graphics-phase.md) | Level 2/3 graphics — after shell; asset list + order |

Additional docs (`surfaces`, `typography`, `components`, etc.) will be added **only when validated through real screens**.

## Source of truth

1. **Figma references** — inspiration and mood, not implementation spec
2. **`01-principles.md`** — creative north star
3. **`02-architecture.md` + `decisions/`** — structural working hypotheses
4. **Built screens in the app** — final visual validation
5. **Code tokens** (`src/styles/theme.css`) — implementation record once patterns are proven

## Scope of the redesign

### Keep (do not rebuild)

Playback, crossfade, synced lyrics, queue, search, history, favorites, playlists, Discover data/API logic, localStorage persistence, artwork color extraction, and other existing application logic. Search/ranking is functional but not perfect — improvements can wait.

### Rebuild

UI/UX: navigation, page layouts, surfaces, components, visual system.

### Preserve for now

The existing fullscreen music player. It will eventually integrate into the new shell, but is not the starting point of this redesign.

## Next step

Build the **shell prototype** (sidebar + content area + compact player zone) and validate surfaces, navigation, and player mode switching before designing individual pages in depth.
