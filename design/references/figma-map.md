# Figma Reference Map — NOIR

Translation guide from inspiration to NOIR implementation. Not a pixel spec.

## Project name

The redesign project is **NOIR**. It is treated as a new application identity.

## Color palette (from references)

| Token | Value | Use |
|-------|-------|-----|
| Black | `#000000` | Canvas, primary background |
| Branding Orange | `#E85002` | Accent, CTAs, progress, active emphasis |
| Dark Gray | `#333333` | Chrome panels, placeholders |
| Gray / Light Gray | `#646464` / `#A7A7A7` | Secondary text |
| White | `#F9F9F9` | Primary text |
| Warm gradient | `#000 → #C10801 → #F16001 → #D9C3AB` | Atmospheric zones (canvas only) |

## Entries

### Orange ribbed wave (3D abstract)

- **Type:** Graphic
- **Area:** Canvas atmosphere, Discover hero potential
- **Principle:** Warm light on black, depth through rhythm
- **NOIR translation:** Corner glow + artwork-derived blur on canvas; not 3D objects in UI chrome
- **Not copying:** Literal 3D ribbons in navigation

### Halftone cloud

- **Type:** Graphic
- **Area:** Level 3 moments, empty states
- **Principle:** High contrast, texture as form, isolated object on void
- **NOIR translation:** Rare graphic modules; subtle grain on canvas only for now
- **Not copying:** Halftone on every control

### AMOUR editorial

- **Type:** Graphic
- **Area:** Featured sections, typography moments
- **Principle:** Bold organic type, simple shapes, no boxes
- **NOIR translation:** Large headlines on canvas; shapes via light not containers
- **Not copying:** Hand-drawn font in functional UI

### Toko dashboard

- **Type:** Interface + Graphic
- **Area:** Home composition, color blocking
- **Principle:** Dark base with bold color zones; varied module scale
- **NOIR translation:** Orange accent system; hero zone with warmth; not uniform grey cards
- **Not copying:** Rounded card grid dashboard clone

### Replay / listening stats UI

- **Type:** Interface
- **Area:** Shell, Home, player chrome
- **Principle:** Sidebar panel on black; warm corner glow; large ranked artwork cards; floating player
- **NOIR translation:** Inset sidebar panel; warm canvas glow; numbered recent cards; rounded player bar
- **Not copying:** Stats/wrapped content (we show recents, not minutes listened)

### Question run cards

- **Type:** Graphic
- **Area:** Atmosphere, editorial
- **Principle:** Grainy gradients, oversized thin numbers, dark purple/navy (we use warm black/orange)
- **NOIR translation:** Large rank numbers on recent cards; grain on canvas
- **Not copying:** Purple palette

### Green grain asterisk / blue gradient grain

- **Type:** Graphic
- **Area:** Background atmosphere
- **Principle:** Grain + glow = environment
- **NOIR translation:** `--noir-grain` + `--noir-canvas-glow` on main canvas only
- **Not copying:** Random symbols in UI chrome

## NOIR area mapping

| Area | Interface refs | Graphic refs |
|------|----------------|--------------|
| Shell sidebar | Replay inset panel | None |
| Canvas | Replay glow | Warm gradient, grain, artwork blur |
| Home | Replay ranked cards, Toko hero scale | Artwork glow, large type |
| Player chrome | Replay floating bar | Artwork thumbnail |
| Discover / Library | TBD | Stronger expression later |
