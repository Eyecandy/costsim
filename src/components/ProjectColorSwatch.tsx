import { getProjectColorCssVar } from "@/lib/projectColors"
import { cn } from "@/lib/utils"

type ProjectColorSwatchProps = {
  /** Visible project order index (0-based). */
  projectIndex: number
  className?: string
}

/**
 * Small decorative project-identity bullet (matches tabs / S-curve legend).
 * Color is supplementary — project name remains the primary label.
 */
export function ProjectColorSwatch({
  projectIndex,
  className,
}: ProjectColorSwatchProps) {
  return (
    <span
      className={cn("size-1.5 shrink-0 rounded-full", className)}
      style={{
        backgroundColor: `var(${getProjectColorCssVar(projectIndex)})`,
      }}
      aria-hidden
      data-project-color-swatch={projectIndex}
    />
  )
}
