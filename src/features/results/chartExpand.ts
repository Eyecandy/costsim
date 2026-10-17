export function shouldShowChartExpand(
  expanded: boolean,
  onExpand: (() => void) | undefined,
  expandLabel: string | undefined,
): boolean {
  return !expanded && typeof onExpand === "function" && Boolean(expandLabel)
}
