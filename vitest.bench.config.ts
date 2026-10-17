import path from "path"
import { defineConfig } from "vitest/config"

// Slow benchmark tests only (`*.bench.test.ts`). The default config excludes them. Run: `npm run test:bench`.
export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  test: {
    environment: "node",
    include: ["src/**/*.bench.test.ts"],
    env: { VITE_APP_VARIANT: "pilot" },
    testTimeout: 10 * 60 * 1000,
    // One file at a time so the timings are not distorted by parallel load.
    fileParallelism: false,
    // A single synchronous test over 60 s always trips Vitest's worker heartbeat ("Timeout calling onTaskUpdate").
    // The tests themselves pass; only this config tolerates that error.
    dangerouslyIgnoreUnhandledErrors: true,
  },
})
