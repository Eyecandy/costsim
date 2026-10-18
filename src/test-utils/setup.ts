import { afterEach } from "vitest"

// Component tests opt into jsdom with `// @vitest-environment jsdom` at the top of the file;
// every other test file runs in node and skips this block.
if (typeof document !== "undefined") {
  const { cleanup } = await import("@testing-library/react")
  await import("@testing-library/jest-dom/vitest")
  afterEach(() => {
    cleanup()
  })
}
