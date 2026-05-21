# 3 — Config File Basics — vitest.config.ts

---

## T — TL;DR

`vitest.config.ts` is where you configure the test environment, globals, file patterns, timeouts, setup files, and coverage. For projects with a `vite.config.ts`, you can add a `test` key directly to it. For projects without Vite (Next.js, plain Node), use a standalone `vitest.config.ts`. Most defaults are sensible — you mainly configure `environment`, `globals`, and `setupFiles`.

---

## K — Key Concepts

```typescript
// vitest.config.ts — standalone (Next.js / plain Node) ────────────────────
import { defineConfig } from 'vitest/config'
import tsconfigPaths    from 'vite-tsconfig-paths'  // npm i -D vite-tsconfig-paths

export default defineConfig({
  plugins: [tsconfigPaths()],  // resolves @/ aliases from tsconfig.json

  test: {
    // ── Environment ────────────────────────────────────────────────────────
    // 'node'   → Node.js globals (default — use for API/server code)
    // 'jsdom'  → browser globals (document, window — use for React components)
    // 'happy-dom' → faster jsdom alternative
    environment: 'node',

    // ── Globals ────────────────────────────────────────────────────────────
    // When true: describe/it/expect available without import
    // When false (default): must import from 'vitest'
    globals: false,   // explicit imports = better DX (IDE auto-complete works)

    // ── Test file patterns ─────────────────────────────────────────────────
    include: [
      '**/*.test.ts',
      '**/*.test.tsx',
      '**/*.spec.ts',
      '**/*.spec.tsx',
    ],
    exclude: [
      '**/node_modules/**',
      '**/dist/**',
      '**/.next/**',
    ],

    // ── Setup files — run before each test file ────────────────────────────
    setupFiles: ['./src/test/setup.ts'],

    // ── Timeouts ──────────────────────────────────────────────────────────
    testTimeout:  5_000,   // ms — fail if a test takes longer than 5s
    hookTimeout:  10_000,  // ms — for beforeAll/afterAll with DB setup

    // ── Reporter ──────────────────────────────────────────────────────────
    reporter: 'verbose',  // show each individual test name

    // ── Coverage (only active with --coverage flag) ────────────────────────
    coverage: {
      provider:   'v8',
      reporter:   ['text', 'html', 'json'],
      include:    ['src/**/*.ts'],
      exclude:    ['src/**/*.test.ts', 'src/test/**'],
      thresholds: {
        lines:     80,
        functions: 80,
        branches:  70,
        statements: 80,
      },
    },
  },
})
```

```typescript
// ── Extending from vite.config.ts (Vite projects) ────────────────────────
import { defineConfig, mergeConfig } from 'vitest/config'
import viteConfig                    from './vite.config'

export default mergeConfig(
  viteConfig,
  defineConfig({
    test: {
      environment: 'node',
      setupFiles:  ['./src/test/setup.ts'],
    },
  })
)
// Inherits all plugins, aliases, and transforms from vite.config.ts ✅
```

```typescript
// ── Per-file environment override ─────────────────────────────────────────
// At the top of a test file — overrides vitest.config.ts for this file only
// @vitest-environment jsdom

import { describe, it, expect } from 'vitest'
// document, window etc. available here ✅

// Use when: the global environment is 'node' but one file needs 'jsdom'
```

```typescript
// ── Workspace config — multiple environments in one project ───────────────
// vitest.workspace.ts (Vitest 1.1+)
import { defineWorkspace } from 'vitest/config'

export default defineWorkspace([
  {
    test: {
      name:        'unit',
      environment: 'node',
      include:     ['src/**/*.test.ts'],
    },
  },
  {
    test: {
      name:        'components',
      environment: 'jsdom',
      include:     ['src/**/*.test.tsx'],
    },
  },
])
// Run specific workspace: vitest --project unit
```

---

## W — Why It Matters

- `vite-tsconfig-paths` in the config is not optional for projects using `@/` path aliases — without it, `import { prisma } from '@/lib/prisma'` inside a test file throws `Cannot find module '@/lib/prisma'` even though it works in the app. One plugin import fixes it for all test files.
- `globals: false` (the default) is the better choice despite being more verbose — when globals are true, `describe` and `expect` come from nowhere and TypeScript may not know their types without a special `types` config. Explicit imports (`import { it } from 'vitest'`) give perfect IDE auto-complete and make the test file self-documenting.
- `testTimeout: 5000` is a safety net — a test that awaits a Promise that never resolves will otherwise hang the test suite. A 5-second timeout surfaces these issues as a clear test failure instead of a silent hang.

---

## I — Interview Q&A

### Q: What is the difference between the `environment` option values `'node'` and `'jsdom'` in Vitest?

**A:** `environment: 'node'` runs tests in a Node.js context — `process`, `Buffer`, `require` are available but `document`, `window`, and `localStorage` are not. This is correct for testing backend code: API handlers, database services, utility functions. `environment: 'jsdom'` simulates a browser DOM using the jsdom library — `document.querySelector`, `window.location`, and event listeners are available. Use this for testing React components, DOM manipulation, or any code that expects browser globals. Mixing them up causes confusing errors: `ReferenceError: document is not defined` in a node environment, or missing `process.env` in jsdom. You can override per file with `// @vitest-environment jsdom` at the top of any test file, or use a workspace config to define separate environments for different test directories.

---

## C — Common Pitfalls + Fix

### ❌ Forgetting `vite-tsconfig-paths` — path aliases fail in tests

```bash
# ❌ Error: Cannot find module '@/lib/utils'
# Your tsconfig.json has: "paths": { "@/*": ["./src/*"] }
# But vitest.config.ts doesn't know about it
```

**Fix:**

```bash
npm install --save-dev vite-tsconfig-paths
```

```typescript
// vitest.config.ts
import { defineConfig } from 'vitest/config'
import tsconfigPaths    from 'vite-tsconfig-paths'

export default defineConfig({
  plugins: [tsconfigPaths()],   // ✅ reads tsconfig paths automatically
  test: { environment: 'node' },
})
```

---

## K — Coding Challenge + Solution

### Challenge

Write a `vitest.config.ts` for a Next.js project that: (1) resolves `@/` path aliases; (2) runs in `node` environment; (3) includes `src/**/*.test.ts` only; (4) uses setup file at `src/test/setup.ts`; (5) sets 5s test timeout; (6) configures coverage for `src/**/*.ts` excluding test files, with 80% line threshold.

### Solution

```typescript
// vitest.config.ts
import { defineConfig } from 'vitest/config'
import tsconfigPaths    from 'vite-tsconfig-paths'

export default defineConfig({
  plugins: [tsconfigPaths()],

  test: {
    environment: 'node',
    globals:     false,

    include: ['src/**/*.test.ts'],
    exclude: ['**/node_modules/**', '**/.next/**', '**/dist/**'],

    setupFiles: ['./src/test/setup.ts'],

    testTimeout: 5_000,

    coverage: {
      provider:  'v8',
      reporter:  ['text', 'html'],
      include:   ['src/**/*.ts'],
      exclude:   ['src/**/*.test.ts', 'src/test/**', 'src/**/*.d.ts'],
      thresholds: { lines: 80 },
    },
  },
})
```

---

---
