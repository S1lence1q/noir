# Design Principles

## North star

**A precise music application wrapped around expressive visual worlds.**

**Noir** is the working product identity for this redesign: near-black foundations, solid application surfaces, controlled atmosphere, and expressive moments used with intent — not inherited landing-page decoration.

The interface should feel **solid**. The music can feel **atmospheric**.

This is not "Elva 2.0 with a prettier UI." It should feel like a new chapter — a serious, intentional desktop music application with a strong visual identity.

## Core balance

| Layer | Character |
|-------|-----------|
| **Interface** | Solid, grounded, application-grade |
| **Music / visuals** | Immersive, atmospheric, expressive |

The current UI relies too heavily on transparency and can feel more like a website than an application. The redesign moves toward stronger application foundations while keeping the listening experience visually rich.

## Graphics hierarchy

Graphics may be weird. The UI does not need to be.

### Level 1 — Functional UI

Search, settings, lists, queue controls, navigation, forms.

Clear, solid, readable. No decorative noise competing with actions.

### Level 2 — Atmosphere

Grain, subtle lighting, gradients, artwork-derived color, environmental effects.

Provides mood without disrupting usability. Can sit behind or around content.

### Level 3 — Expressive graphics

Large compositions, unusual typography, 3D objects, abstract shapes, editorial visuals.

Used selectively: Home, Discover, featured content, empty states, larger editorial sections, artwork environments, selected transitions.

**Target:** Integrated graphics (approach B) — graphics as a recurring part of Elva's identity.

**Fallback:** Atmospheric graphics only (approach A) — if expressive graphics hurt clarity, performance, or feel gimmicky, simplify.

Do not force Level 3 everywhere just because it is the ambition.

## Surfaces and transparency

- Solid black / deep charcoal as the default foundation
- Elevated surfaces for panels, cards, and modules
- Clear separation between application layers
- Controlled depth through surface levels, not blur
- Translucency only when it communicates layering — not as the default styling of every element

**Solid interface + atmospheric environment.**

## Color

Base palette: black, deep charcoal, off-white / muted white typography.

Color should come from context, not a permanent SaaS accent:

- Artwork (existing color extraction is useful)
- Music and section mood
- Visual compositions
- Atmospheric backgrounds

We like: deep cobalt/indigo, emerald, warm orange/red, muted neutrals, cool atmospheric lighting, occasional saturated accents, unusual combinations.

We do not want:

- Standard purple/blue AI gradients
- The same colorful gradient on every page
- Color for color's sake

## Typography

Functional UI: readable, restrained hierarchy.

Expressive typography (oversized numbers, display text, cropped type, monospace micro-labels) belongs in graphic/editorial areas — not on every control and list row.

## Motion

Motion supports the experience; it does not advertise itself.

Avoid: excessive animation, everything floating, unnecessary parallax, decoration-only motion.

Music is already dynamic. The interface does not need to constantly move to feel alive.

## Reference philosophy

References are split into two types. Neither is a checklist to copy.

### Interface references

Structural ideas: navigation, layouts, sidebars, lists, hierarchy, spacing, application shells, tabs, content organization, interaction patterns.

Extract principles (solid surfaces, grouped navigation, modular layouts), not specific UI clones.

### Graphic / visual / atmosphere references

Broader visual language: surreal environments, grain, abstract forms, oversized typography, editorial layouts, atmospheric lighting, unusual compositions.

These inform identity — not every screen becomes an art piece.

## What we explicitly do not want

Do not interpret "modern music app + graphics" as:

- Glassmorphism as default
- Purple gradients
- Giant rounded rectangles everywhere
- Floating translucent cards
- Pill navigation on everything
- Excessive blur and glow
- Generic dashboard / SaaS layouts
- "Premium AI app" aesthetics
- Inter + rounded cards + pills + gradients
- Copying Spotify or Apple Music UI
- Pinterest-simulator aesthetics
- Random 3D objects on every page

We want originality through visual language and composition, not through stacking effects.

## Application posture

Spotify and Apple Music feel like applications because of structure and hierarchy — not because of their visual style. We are not copying their UI, but we want that same sense of solidity and usability.

## What stays open

These will be resolved through building, not upfront documentation:

- Exact navigation grouping and labels
- Which pages get Level 3 graphics first
- Specific accent behavior per section
- Display typography choices
- Compact player control density
- Transition choreography into fullscreen
- Exact surface token values

Make informed decisions. Do not pretend uncertainty does not exist.
