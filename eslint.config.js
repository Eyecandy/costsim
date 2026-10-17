import js from "@eslint/js"
import globals from "globals"
import reactHooks from "eslint-plugin-react-hooks"
import reactRefresh from "eslint-plugin-react-refresh"
import jsxA11y from "eslint-plugin-jsx-a11y"
import tseslint from "typescript-eslint"
import { defineConfig, globalIgnores } from "eslint/config"

export default defineConfig([
  globalIgnores(["dist", "coverage"]),
  {
    files: ["**/*.{ts,tsx}"],
    extends: [
      js.configs.recommended,
      tseslint.configs.strict,
      tseslint.configs.stylistic,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
      jsxA11y.flatConfigs.recommended,
    ],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
    },
    linterOptions: {
      // An eslint-disable comment that no longer suppresses anything is dead weight: fail on it.
      reportUnusedDisableDirectives: "error",
    },
    rules: {
      // A leading underscore marks a value that is intentionally unused (`const { a: _a, ...rest } = x`).
      "@typescript-eslint/no-unused-vars": [
        "error",
        {
          argsIgnorePattern: "^_",
          varsIgnorePattern: "^_",
          caughtErrorsIgnorePattern: "^_",
          destructuredArrayIgnorePattern: "^_",
          ignoreRestSiblings: true,
        },
      ],
      "@typescript-eslint/consistent-type-imports": "error",
      // The code base uses `type` aliases for object shapes, not `interface`.
      "@typescript-eslint/consistent-type-definitions": ["error", "type"],
      // `.catch(() => {})` and no-op callbacks are common and deliberate.
      "@typescript-eslint/no-empty-function": ["error", { allow: ["arrowFunctions"] }],
      // Too noisy to enforce (mostly `array[0]!` after a length check); CLAUDE.md asks to avoid `!` unless guarded.
      "@typescript-eslint/no-non-null-assertion": "off",
      "@typescript-eslint/no-dynamic-delete": "off",
      "no-console": ["error", { allow: ["warn", "error"] }],
      eqeqeq: ["error", "always", { null: "ignore" }],
      // Modals and the inline rename field intentionally move focus to their first control.
      "jsx-a11y/no-autofocus": "off",
      // These come from the React Compiler rule set. The compiler is not enabled in this project, so they
      // flag older patterns ("latest ref" assignments during render, form resets in effects) rather than
      // bugs. They stay visible as warnings; `npm run lint` caps the count (see package.json) so it can
      // only go down.
      "react-hooks/refs": "warn",
      "react-hooks/set-state-in-effect": "warn",
      "react-hooks/preserve-manual-memoization": "warn",
    },
  },
  {
    // Type-aware rules: promises must be awaited, returned or explicitly voided.
    files: ["src/**/*.{ts,tsx}"],
    languageOptions: {
      parserOptions: { projectService: true, tsconfigRootDir: import.meta.dirname },
    },
    rules: {
      "@typescript-eslint/no-floating-promises": "error",
      "@typescript-eslint/no-misused-promises": "error",
      "@typescript-eslint/await-thenable": "error",
    },
  },
  {
    // Browser storage lives in src/persistence/ only (see CLAUDE.md); everything else calls those modules.
    files: ["src/**/*.{ts,tsx}"],
    ignores: ["src/persistence/**", "**/*.test.ts"],
    rules: {
      "no-restricted-globals": [
        "error",
        { name: "localStorage", message: "Use a module in src/persistence/ instead." },
        { name: "sessionStorage", message: "Use a module in src/persistence/ instead." },
      ],
      "no-restricted-properties": [
        "error",
        {
          object: "window",
          property: "localStorage",
          message: "Use a module in src/persistence/ instead.",
        },
        {
          object: "window",
          property: "sessionStorage",
          message: "Use a module in src/persistence/ instead.",
        },
      ],
    },
  },
  {
    // shadcn/ui files export a component together with its variants helper by design.
    files: ["src/shared/ui/**/*.{ts,tsx}"],
    rules: { "react-refresh/only-export-components": "off" },
  },
  {
    // Tests read project files with node APIs and may print diagnostics.
    files: ["**/*.test.ts", "src/test-utils/**/*.ts", "*.config.ts"],
    languageOptions: { globals: { ...globals.node } },
    rules: { "no-console": "off" },
  },
])
