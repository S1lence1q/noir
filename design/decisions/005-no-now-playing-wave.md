# 005 — No spray wave in Now Playing

**Status:** Decided (2026-09-27). Idea parked, not deleted.

## What happened

The audio-reactive spray wave (Board B, `Shape Pin` reference) was built twice for Now Playing: v1 as vertical fibers, v2 as a pixel-buffer grain mass emerging from behind the cover. Both were removed after screenshot review ("still quite ugly").

## Why

1. **No slot.** Now Playing is already complete: cover + title + artwork atmosphere + Next up. The only free space is the gap between the cover and the queue, and a graphic there reads as a tail stuck to the cover rather than an object.
2. **It can't do its job honestly.** Its job is "this is what you hear". Most tracks play through the YouTube iframe, which is cross-origin, so the browser can't read its audio. Only `audioUrl` tracks (local files / direct streams) reach the Web Audio analyser. A wave that fakes a pulse is a lie; one that just flows is decoration.
3. Rule from `05-visual-language.md`: every graphic has a job, and we don't force one in.

## If it comes back

- Only somewhere that has its own slot and a truthful input (e.g. Replay/stats built from listening data, or a mix cover built from tags), not as a live visualizer.
- A tempo from Deezer BPM (T10) is the most honest live input possible for YouTube tracks.
- The implementation is in git history (`f25cdb64`, `a817f6ce`) if a grain-field renderer is needed.
