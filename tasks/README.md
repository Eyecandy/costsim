# Task board

A file-based board for this repo. One card per task, one folder per column:

| Folder | Meaning |
|---|---|
| `todo/` | Not started. Ordered by the number in the file name. |
| `doing/` | Being worked on right now. Keep this short. |
| `done/` | Finished. Keep the card; add a "Result" section with the commit. |

## Working with it
- **Move a card** with `git mv tasks/todo/03-x.md tasks/doing/03-x.md`. The folder is the status.
- **New card**: copy `_template.md` into `todo/` with the next number: `NN-short-name.md`.
- **Finishing**: move the card to `done/`, fill in "Result" (commit hash, what was checked), and add a dated line to `docs/refactor-tasks.md` if it changes the code layout.
- Cards are small and decided: what, why, how to check it. Details of past work live in `docs/refactor-tasks.md`.
- Commit board changes together with the work they describe. No separate "update board" commits needed.

## Card header
```
# NN Title
Priority: high | medium | low     Size: S | M | L     Risk: low | medium | high
```

If the cards later move to a GitHub Project, each file is one issue: the title is the first line, the body is the rest.
