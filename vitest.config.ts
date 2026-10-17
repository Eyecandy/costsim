import path from "path"
import { configDefaults, defineConfig } from "vitest/config"

export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
    // Benchmarks (`*.bench.test.ts`) run one synchronous test for a minute or more, which starves the
    // worker and makes the default run flaky. They live in vitest.bench.config.ts: `npm run test:bench`.
    exclude: [...configDefaults.exclude, "**/*.bench.test.ts"],
    // Tests are written against the full-feature variant; without this they would depend on a local .env.
    env: { VITE_APP_VARIANT: "pilot" },
  },
})
