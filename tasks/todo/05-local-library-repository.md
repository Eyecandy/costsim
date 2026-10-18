# 05 Split localAnalysisLibraryRepository
Priority: low     Size: M     Risk: medium

## Why
`persistence/localAnalysisLibraryRepository.ts` is 1,014 lines: storage plumbing, index handling, validation and the repository methods in one file.

## What
- Move the JSON / quota helpers and the index and summary handling into their own files under `persistence/`.
- Split the repository methods by area (drafts, archive and ongoing, trash and folders) while keeping `getLocalAnalysisLibraryRepository()` as the single entry point.
- Test files already cover this layer well; keep them green and add a test per new file if a gap shows.

## Check
- `npm run check`.
- Browser: library lifecycle, folders, trash (restore and permanent delete), share link import.

## Result
