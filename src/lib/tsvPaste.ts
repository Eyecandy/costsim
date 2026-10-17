export function applyPastedGrid<T extends Record<string, string>>(
  rows: T[],
  columnKeys: (keyof T)[],
  startRow: number,
  startCol: number,
  matrix: string[][],
  emptyRow: () => T,
): T[] {
  const next = rows.map((r) => ({ ...r }))
  const nCols = columnKeys.length

  for (let ri = 0; ri < matrix.length; ri++) {
    const targetRow = startRow + ri
    while (targetRow >= next.length) {
      next.push(emptyRow())
    }
    const line = matrix[ri] ?? []
    for (let ci = 0; ci < line.length; ci++) {
      const targetCol = startCol + ci
      if (targetCol >= 0 && targetCol < nCols) {
        const key = columnKeys[targetCol]
        next[targetRow] = {
          ...next[targetRow],
          [key]: line[ci] ?? "",
        }
      }
    }
  }
  return next
}
