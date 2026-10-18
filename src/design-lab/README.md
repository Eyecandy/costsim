# Design lab

Throwaway, functionless mock-ups of the calculator page, for looking at alternatives before anything
is built into the real app. Open `/design` (gallery), `/design/03` (one look) or
`/design/compare?a=00&b=03` (two side by side). Delete this folder and the `/design` branch in
`src/app/Router.tsx` to remove all of it.

- Reuses the app's real shared pieces (`BrandWordmark`, `Button`, `SectionExpander`), its theme tokens
  and its Norwegian/English texts, so the mocks look like the app and the NO/EN toggle works.
- Sample data only (`sampleData.ts`). Nothing is saved, nothing runs.
- Not behind the login: anyone with the link can open `/design`. Keep it to sample data.
- Layer rules (`.dependency-cruiser.cjs`): the lab may use `shared/`, `i18n/`, `config/`, `domain/`;
  it never imports `features/` or `app/`, and only the router loads it.

## Make a new look

1. `npm run lab:new -- my-look` creates `variants/vNN-my-look.ts` as a copy of the latest variant
   (`--from 03` copies another one).
2. Edit `title`, `description`, `notes` (numbers from `tasks/todo/UI/notes.txt`), `changes` and the
   `options` that differ. Options are typed in `variants/types.ts` and explained there.
3. Open `/design/NN`. The gallery picks the file up by itself; there is no list to edit.

## Make a new kind of change

If an idea needs something the options cannot express yet, add an option to `LabOptions`
(`variants/types.ts`) and a default in `variants/base.ts`, then read it in the matching file in
`parts/` (`LabHeader`, `LabSidebar`, `LabInputTop`, `LabToolbar`, `LabTable`, `LabResults`) or in
`LabPage.tsx` for layout. A colour set is an entry in `themes.ts`.
