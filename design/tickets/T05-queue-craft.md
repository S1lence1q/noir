# T05 — Queue craft: empty queue + "queue ends soon"

> **Status:** **DONE.** Empty Next up (golden). Next up header: `Next up · N` + Shuffle / Clear + `Playing from {source}` under header. Queue ends soon: toast-card above compact bar (works with NP closed); autoplay ask/on/off in Settings; Keep playing → radio append (T11).
**Phase:** 5 · **Depends on:** T02 · **Golden sample:** THIS IS ONE (built by Opus) · **Size:** M

## Goal
The queue never leaves you in silence without a good next step.

## Current
`design/audit/Noir/10-queue-empty.png`: "What should play next? / Add a favorite to keep it going." + 3 tiny cards with truncated titles, no bulk action. Next up list (09) has no header actions.

## Spec
**Empty Next up** — copy and fallbacks exactly as `08-craft.md` §2 "Queue empty":
- 16 px vector asterisk + title `Nothing up next` (`--noir-type-section`), body `--noir-type-meta`.
- 3 covers 72 px in a row, gap 8 px, title under each (1 line, ellipsis; full title on hover tooltip).
- Buttons: **Add 10** (primary, appends 10 shuffled favorites, toast `Added 10 songs to queue` + Undo) · **Shuffle all** (secondary, replaces queue with all favorites shuffled).
- Fallback chain: favorites → recently played → "Start radio" (disabled until T11, tooltip `Coming soon`).
- Enter animation: `panel`, items stagger 40 ms.

**Next up header** (when not empty): `Next up · 14` left; right: **Shuffle** · **Clear** (toast + Undo). Under the header: `Playing from Top Hits: Denmark` (`--noir-type-meta`) when there's a source.

**Queue ends soon** — `08-craft.md` §2: toast-card when ≤ 1 track left and 20 s before the end. Setting `autoplay: 'ask' | 'on' | 'off'` (default `ask`) stored with other prefs. Until T11, "Keep playing" appends 10 shuffled favorites.

## Files
- `src/app/components/shell/noir/NoirNowPlayingView.tsx` — empty state, header
- `src/app/constants/strings.ts`
- small hook `src/app/hooks/useQueueEndPrompt.ts` (new)

## Acceptance
- [x] Empty queue shows the right variant for: has favorites / only history / nothing
- [x] Add 10 fills the queue and can be undone
- [x] Prompt appears once near the end; "Don't ask again" persists

## Screenshots to take
Empty queue (with favorites) · Next up with header · queue-ends prompt.
