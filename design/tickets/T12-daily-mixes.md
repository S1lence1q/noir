# T12 — Daily mixes + Home shelf
**Phase:** 9 · **Depends on:** T06, T09, T10 · **Golden sample:** dither covers · **Size:** L

## Goal
Home shows **Your mixes** — 3–6 daily mixes with generated dither covers, named from your taste tags.

## Spec
- Cluster top-30 artists (30 days) by primary Last.fm tag
- Each mix: ~25 tracks = 40% your plays from those artists + 60% similar artists' top tracks
- Regenerated once per calendar day (localStorage cache)
- Cover: `NoirDitherCover` + `madeForYou`, world from `worldForTag`
- Name: "{Tag} Mix"; subtitle: "A, B, C and more"
- Shelf hides if fewer than 3 mixes
- Open → playlist overlay; play button on cover

## Files
- `src/app/services/mixes/dailyMixes.ts`
- `src/app/utils/ditherCover.ts` (`worldForTag`)
- `src/app/components/shell/noir/NoirHomeView.tsx`
- `src/app/constants/strings.ts`

## Acceptance
- [ ] Your mixes appears on Home when taste exists
- [ ] Covers are dithered, not photos
- [ ] Same day = same mixes after reload
- [ ] Build passes

## Don't
- Don't build radio (T11) or stats (T17)
- Don't show mixes with < 3 items in the shelf
