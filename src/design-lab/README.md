# Design lab

Throwaway, functionless mock-ups of the calculator page, for looking at alternatives before anything
is built into the real app. Open `/design` (gallery, grouped by family), `/design/a/04` (one look: family letter + id), or
`/design/compare?a=a00&b=b01` (two side by side). Old links like `/design/04` still mean family A.
Delete this folder and the `/design` branch in `src/app/Router.tsx` to remove all of it.

## Families

A **family** is one design direction; the looks inside it are small steps on the same idea. Looks are
called by family letter + id (A04, B02), so you can say "iterate on B02".

- **A** - today's page, step by step (`variants/`, rendered by `LabPage.tsx`, typed options).
- **B** - workbench: a new layout of its own (`families/b/`, rendered by `BPage.tsx`).

A look that is not a step on an existing one is a new family: add a folder `families/<letter>/` with
its page component and variants, add its id to `FamilyId` and an entry to `FAMILIES` and `ENTRIES` in
`registry.tsx`. The gallery, compare view and banner pick it up from there.

- Reuses the app's real shared pieces (`BrandWordmark`, `Button`, `SectionExpander`), its theme tokens
  and its Norwegian/English texts, so the mocks look like the app and the NO/EN toggle works.
- Sample data only (`sampleData.ts`). Nothing is saved, nothing runs.
- Not behind the login: anyone with the link can open `/design`. Keep it to sample data.
- Layer rules (`.dependency-cruiser.cjs`): the lab may use `shared/`, `i18n/`, `config/`, `domain/`;
  it never imports `features/` or `app/`, and only the router loads it.

## Make a new look in family A

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

## Make a new look in family B

Copy a file in `families/b/variants/` (for example `v03-sand.ts`), change `id`, `title`, `changes` and
`theme` (themes are in `themes.ts`). For anything beyond colours, edit the parts in `families/b/`.

## Owner's guidance for new looks

Apply these by default; they come from comments on earlier looks.

- **B**: a header bar of its own; only the Sand colours or the original teal (the owner does not like Midnight, which has been removed); a library panel on the left with
  search and the filters Alle / Utkast / Arkiverte / Slettede; cost items and drivers visible together; some looks
  with more information (key figure table, change table), some with less.
- **Checkpoints**: no Save button (saving is automatic); "Neste checkpoint" is locked until the open checkpoint is
  archived ("Arkiver checkpoint" first).
- **Fokusmodus**: a presentation icon, not a play icon (play is only for "Kjør simulering"); size and placement are
  still open, so try more than one.
- **Project profile**: shown with an example in every look, collapsible with an up/down arrow.
