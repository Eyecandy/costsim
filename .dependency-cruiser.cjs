/**
 * Layer rules for src/. Run with `npm run check:deps` (part of `npm run check`).
 *
 *   domain       framework-free logic (no React, no browser storage)
 *   persistence  localStorage / sessionStorage / URL adapters; may use domain
 *   workers      Web Worker entry files; may use domain
 *   shared       UI building blocks and helpers used by several features
 *   features/*   one folder per product feature (components + hooks + tests)
 *   app          the shell: routing, login, top-level App
 *   pdf          PDF report building and rendering
 */
module.exports = {
  forbidden: [
    {
      name: "no-circular",
      severity: "error",
      comment: "Circular imports make modules impossible to understand or move on their own.",
      from: {},
      to: { circular: true },
    },
    {
      name: "domain-is-framework-free",
      severity: "error",
      comment: "domain/ must not import React, UI, storage adapters, workers, PDF or the app shell.",
      from: { path: "^src/domain/" },
      to: {
        path: [
          "^node_modules/(react|react-dom)/",
          "^src/(persistence|workers|features|shared|app|pdf)/",
        ],
      },
    },
    {
      name: "persistence-uses-domain-only",
      severity: "error",
      from: { path: "^src/persistence/" },
      to: { path: "^src/(features|shared|app|pdf|workers)/" },
    },
    {
      name: "workers-use-domain-only",
      severity: "error",
      from: { path: "^src/workers/" },
      to: { path: "^src/(features|shared|app|pdf|persistence)/" },
    },
    {
      name: "shared-is-below-features",
      severity: "error",
      comment: "shared/ may not depend on features/ or app/.",
      from: { path: "^src/shared/" },
      to: { path: "^src/(features|app)/" },
    },
    {
      name: "features-not-into-app",
      severity: "error",
      comment: "Only the app shell may import features, never the other way round.",
      from: { path: "^src/(features|pdf|persistence|domain)/" },
      to: { path: "^src/app/" },
    },
    {
      name: "features-are-independent",
      severity: "error",
      comment: "Features do not import each other. The one exception is guided-input (see next rule).",
      from: { path: "^src/features/(?!guided-input/)([^/]+)/" },
      to: { path: "^src/features/", pathNot: "^src/features/$1/" },
    },
    {
      name: "guided-input-allowed-features",
      severity: "error",
      comment: "guided-input composes focus-mode, scenario-tables and workspace, and nothing else.",
      from: { path: "^src/features/guided-input/" },
      to: { path: "^src/features/(analysis-library|checkpoints|results)/" },
    },
  ],
  options: {
    doNotFollow: { path: "node_modules" },
    tsConfig: { fileName: "tsconfig.app.json" },
    tsPreCompilationDeps: true,
    includeOnly: "^src/",
    exclude: { path: "\\.test\\.tsx?$" },
    reporterOptions: { text: { highlightFocused: true } },
  },
};
