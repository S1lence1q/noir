# 07 — Roadmap

**Status:** Current (2026-09-27). Replaces the phase list in `04-north-star.md` (its "big goal" still stands).

## Tracks

Three tracks run side by side. Craft (`08-craft.md`) is not a phase; it ships inside every ticket.

```
GRAPHICS  G1 Foundation ──▶ G2 Covers everywhere ──▶ G4 Artist hero
REDESIGN  R1 Shared UI ──▶ R2 Volume/toast ──▶ R3 Playlists ──▶ R4 Queue + Now Playing ──▶ R5 Settings ──▶ R6 Library
ENGINE    E1 Events ──▶ E2 Taste ──▶ E3 musicGraph ──▶ F1 Radio ──▶ F3/F4 Home + Mixes ──▶ F5 Stats ──▶ F6 Discover
```

## Phases and checkpoints

| # | Phase | Tickets | Depends on | Checkpoint (Opus reviews screenshots) |
|---|-------|---------|-----------|------|
| 1 | Shared UI foundation | T01, T03 | — | Rows, headings, grid consistent on Home/Library/Chart |
| 2 | Toast + kill volume popup | T02 | — | Toast + inline volume % |
| 3 | Graphics foundation | T06, T07, T08 | — | Dither covers on charts + favorites; asterisk in sidebar |
| 4 | Playlists redesign | T04 | T01–T03, T06 | Create → page → add-to → delete/undo flow |
| 5 | Queue craft | T05 | T02 | Empty queue + "queue ends soon" |
| 6 | Listening engine | T09 | — (parallel) | No UI; unit-level check only |
| 7 | musicGraph | T10 | T09 | No UI; API responses cached |
| 8 | Radio + autoplay | T11 | T10, T05 | Start radio from menu; autoplay prompt |
| 9 | Personal Home + mixes | T12, T13 | T06, T10 | Home shelves with real data |
| 10 | Now Playing: one object (shared element) + content | T14 | T07 (A/B), T10 (C), T06 (D) | No double UI; cover flies bar ↔ canvas |
| 11 | Settings polish | T15 | T02 | Crossfade preview, inline confirms |
| 12 | Library overview + stats | T16, T17 | T09 | Grid + "Your sound" |
| 13 | Discover feed | T18 | T10, T12 | Feed shelves |
| 14 | Artist page | T19 | T10 (+ `decisions/004`) | Dither hero, fans also like |
| 15 | Replay + cold start | T20, T21 | T17 | Monthly Replay cards |

Tickets T01–T10 are written in `design/tickets/`. Later tickets are written at the checkpoint before their phase, so they reflect what was learned.

## Who does what

- **Opus (creative director):** checkpoints, writing the next tickets, golden samples.
- **Golden samples (Opus builds once, others copy the pattern):** T02 toast, T05 empty queue, T08 `NoirMark`.
- **Luna / Grok:** everything else, one ticket per chat. Start every chat with: *"Read `design/HANDOFF.md`, then `design/tickets/TNN-*.md`. Do only that ticket."*

## Definition of done (every ticket)

1. Acceptance criteria in the ticket met
2. Craft checklist from `08-craft.md` met
3. `npm run build` passes
4. User takes screenshots → Opus reviews (approve / short fix list)
5. Commit with the ticket id in the message
