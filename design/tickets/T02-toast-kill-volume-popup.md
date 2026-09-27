# T02 — Toast system + kill volume popup
**Phase:** 2 · **Depends on:** — · **Golden sample:** THIS IS ONE (built by Opus) · **Size:** M

## Goal
One quiet, consistent feedback system with Undo. Volume has one home: the compact bar.

## Current
- `design/audit/Noir/13-volume-popup.png`: pink popup at the top duplicates the white bar slider (Elva leftover).
- `showMiniHUD()` in `src/app/utils/hudUtils.ts` is used for ad-hoc messages.

## Spec
**Toast** — see `08-craft.md` §3.
- `NoirToastProvider` + `useNoirToast()` → `toast({ text, cover?, action?: { label, onClick } , duration? })`.
- Bottom center, 16 px above the compact bar, max 1 visible, new replaces old, 3 s (5 s with action), pause on hover.
- Surface `--noir-elevated`, radius `--noir-radius-md`, `--noir-type-row`, enter from below 8 px with `panel` token.
- `showMiniHUD(message, type)` keeps its signature but forwards to the toast (so old callers keep working).

**Volume**
- Delete the top popup: remove `GlobalVolumeHUD` render + `useGlobalVolumeHUD` from `App.tsx`, delete `components/app/GlobalVolumeHUD.tsx`, `hooks/useGlobalVolumeHUD.ts` (check no other imports).
- Compact bar slider: while dragging, scrolling over it, or changing volume with keys, show the number (`55`) to the left of the slider in `--noir-type-meta`; fade out 800 ms after the last change.
- Click the speaker icon = mute / unmute (restore previous level).

## Files
- new `src/app/components/shell/noir/NoirToast.tsx`
- `src/app/utils/hudUtils.ts` — forward to toast
- `src/app/App.tsx` — mount provider, remove volume HUD
- `src/app/components/shell/CompactPlayerBar.tsx` — inline volume number, mute
- delete `src/app/components/app/GlobalVolumeHUD.tsx`, `src/app/hooks/useGlobalVolumeHUD.ts`

## Acceptance
- [ ] No popup at the top when changing volume in any way
- [ ] Volume number appears next to slider while changing, then fades
- [ ] Existing messages (e.g. "Cleared 12 cached items") appear as toasts
- [ ] A toast with action shows Undo and stays 5 s

## Screenshots to take
Changing volume (number visible) · a toast with Undo (e.g. remove from queue once T05 exists; or clear cache).
