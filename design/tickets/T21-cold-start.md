# T21 — Cold start (pick 3 artists)
**Phase:** 15 · **Depends on:** T09, T10, T12 · **Golden sample:** empty Next up / Favorites cover · **Size:** M

## Goal
First run with no listening events: Home asks you to **Pick 3 artists you love** so taste, mixes, and Discover are never empty.

## Spec
- Gate: Home idle + no featured recent + `topArtists(events)` empty.
- UI: title + body + search field + 12 suggestions from DK Apple chart + progress `n of 3` + **Start listening**.
- Confirm writes synthetic completed `ListeningEvent`s (`source: 'seed'`) from each artist’s top tracks, then reloads daily mixes.
- Secondary: **Browse Discover instead**.

## Files
- `services/listening/seedTaste.ts` — empty check, chart/search artist helpers, seed
- `shell/noir/NoirColdStart.tsx` — picker
- `shell/noir/NoirHomeView.tsx` — gate + reload
- `constants/strings.ts`, `styles/noir-shell.css`

## Acceptance
- [ ] Fresh IDB → Home shows picker (not bare “Start listening”)
- [ ] Pick 3 from chart or search → mixes appear
- [ ] Discover personal shelves can fill from seeded taste
- [ ] Build passes
