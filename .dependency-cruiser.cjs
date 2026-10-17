/** Layer rules for src/. Run with `npm run check:deps`. */
module.exports = {
  forbidden: [
    {
      name: "no-circular",
      severity: "warn",
      comment: "Circular imports make modules impossible to understand or move on their own.",
      from: {},
      to: { circular: true },
    },
    {
      name: "logic-not-into-ui",
      severity: "warn",
      comment: "lib/ and domain/ hold framework-free logic. They must not import UI, the app shell or PDF rendering.",
      from: { path: "^src/(lib|domain)/", pathNot: "\\.test\\.tsx?$" },
      to: { path: "^src/(components|features|app|pdf|App\\.tsx|Router\\.tsx|[A-Za-z]+Page\\.tsx)" },
    },
    {
      name: "logic-not-into-worker-entry",
      severity: "warn",
      comment: "Shared types must live in domain/, not in a worker entry file.",
      from: { path: "^src/(lib|domain)/", pathNot: "\\.test\\.tsx?$" },
      to: { path: "^src/(workers/)?[a-z]+\\.worker\\.ts$" },
    },
    {
      name: "domain-no-react-or-dom-libs",
      severity: "warn",
      comment: "domain/ must stay free of React.",
      from: { path: "^src/domain/" },
      to: { path: "^node_modules/(react|react-dom)/" },
    },
    {
      name: "domain-only-depends-on-domain",
      severity: "warn",
      comment: "domain/ may not import persistence/, features/, app/ or shared UI.",
      from: { path: "^src/domain/" },
      to: { path: "^src/(persistence|features|app|shared)/" },
    },
    {
      name: "persistence-only-depends-on-domain",
      severity: "warn",
      from: { path: "^src/persistence/" },
      to: { path: "^src/(features|app|pdf)/" },
    },
    {
      name: "features-no-cross-feature-internals",
      severity: "warn",
      comment: "A feature may only import another feature through its index.ts.",
      from: { path: "^src/features/([^/]+)/" },
      to: {
        path: "^src/features/([^/]+)/",
        pathNot: ["^src/features/$1/", "^src/features/[^/]+/index\\.ts$"],
      },
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
