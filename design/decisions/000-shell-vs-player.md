# ADR 000: Shell-first vs player-centric architecture

**Status:** Validated for shell. **Superseded for expand behavior** — see [04-north-star.md](../04-north-star.md) Phase 1.  
**Date:** 2026-03-02 (updated 2026-09-03)

## Context

The current Elva architecture is player-centric. Playing a track transitions the user into the fullscreen `MusicPlayer`. Browsing happens in a separate `landing` mode, with a floating mini pill for background control.

This may contribute to the app feeling more like a website than a desktop application: no persistent navigation while listening, no stable content frame, and a sense that the player and browser are two different products.

The redesign direction calls for a solid application shell with atmospheric content — which suggests the shell, not the fullscreen player, should be the foundation.

## Decision (working hypothesis)

Adopt a **shell-first architecture**:

- **Normal mode:** persistent sidebar + content area + compact player bar
- **Expanded mode:** existing fullscreen immersive player, entered on demand

The fullscreen player is preserved, not redesigned. It becomes a depth mode, not the default foundation.

## Rationale

1. **Fits the design direction** — "solid interface + atmospheric environment" needs a stable frame
2. **Matches interface references** — desktop apps with persistent nav and bottom playback bars feel like applications
3. **Enables incremental redesign** — pages can be rebuilt inside the shell without touching the player
4. **Supports graphics hierarchy** — Level 1 in chrome, Level 2/3 in content areas
5. **Partially exists in code** — `landing` / `ready` states, hidden mounted player, `LandingMiniPlayerPill`

## What changes (if validated)

| Today | Proposed |
|-------|----------|
| Play → auto-expand to fullscreen | Play → stay in shell with compact player |
| Mini pill on landing only | Compact player as persistent app chrome |
| Player feels like the app | Shell feels like the app; player is a mode |

## Compact player (initial scope)

- Artwork, title, artist
- Play / pause, previous, next
- Progress indicator
- Expand to fullscreen

Queue access may be included if straightforward. Lyrics, crossfade, and volume stay in fullscreen or settings.

## What we are not deciding yet

- Exact compact player layout and density
- Transition animation between modes
- Whether first-time play should ever auto-expand
- Queue panel behavior in shell mode

## Risks and alternatives

### Risks

- Elva's identity has been immersive-first — some users may expect play = fullscreen
- Hidden fullscreen player still mounted may have performance implications (needs validation)
- `App.tsx` orchestration is complex; shell extraction requires careful refactoring

### Alternative: keep player-centric

Keep fullscreen as default on play; improve landing/browse as a secondary experience.

**Why we are not starting here:** harder to achieve "serious desktop application" feel, and page redesigns keep orbiting the player instead of a stable shell.

### Reversal criteria

We will reconsider this decision if the shell prototype shows:

- The compact player feels cramped or disconnected from the immersive experience
- Mode switching feels jarring or breaks playback continuity
- The shell makes expressive graphics harder, not easier
- Building pages inside the shell is not simpler than the current model

## Validation plan

Build a shell prototype (no page content) and test:

1. Does it feel like a desktop application?
2. Is navigation clear and persistent?
3. Does the compact player feel integrated, not floating?
4. Does expand/collapse to the existing fullscreen player feel natural?
5. Does playback continue seamlessly across mode switches?

**If validation fails, this ADR will be updated.** The hypothesis can change after seeing the UI.

## Related

- [02-architecture.md](../02-architecture.md) — structural model
- [01-principles.md](../01-principles.md) — solid interface principle
