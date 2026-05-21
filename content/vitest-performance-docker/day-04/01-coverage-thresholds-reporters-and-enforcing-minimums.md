# 1 — Coverage — Thresholds, Reporters, and Enforcing Minimums

---

## T — TL;DR

Vitest uses V8 or Istanbul to measure which lines, branches, functions, and statements your tests exercise. Set `coverage.thresholds` to fail the CI run when coverage drops below a minimum. Use `lcov` reporter for GitHub Actions annotations, `html` for local browsing, and `text` for terminal output.

---

## K — Key Concepts

```typescript
// vitest.config.ts — full coverage configuration
import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    coverage: {
      // ── Provider ───────────────────────────────────────────────────────
      provider: 'v8',        // 'v8' (fast, built-in) | 'istanbul' (more accurate)

      // ── What to include / exclude ──────────────────────────────────────
      include: ['src/**/*.ts', 'src/**/*.tsx'],
      exclude: [
        'src/**/*.test.ts',
        'src/**/*.d.ts',
        'src/generated/**',   // generated files
        'src/main.ts',        // entry point — no logic to test
      ],

      // ── Reporters ─────────────────────────────────────────────────────
      reporter: [
        'text',               // terminal table summary
        'lcov',               // for GitHub Actions / Codecov / SonarQube
        'html',               // browsable report in coverage/index.html
        'json-summary',       // machine-readable summary
      ],

      // ── Output directory ───────────────────────────────────────────────
      reportsDirectory: './coverage',

      // ── Thresholds — fail CI if coverage drops below these ────────────
      thresholds: {
        lines:      80,
        functions:  80,
        branches:   70,
        statements: 80,

        // Per-file threshold — each individual file must meet this
        perFile:    false,   // set true for stricter enforcement
      },
    }
  }
})
```

```bash
# Run tests with coverage
npx vitest run --coverage

# Output:
# ----------------------|---------|----------|---------|---------|
# File                  | % Stmts | % Branch | % Funcs | % Lines |
# ----------------------|---------|----------|---------|---------|
# src/utils/slug.ts     |   100   |   100    |   100   |   100   |
# src/services/auth.ts  |    72   |    60    |    80   |    72   |  ← below threshold → CI fails
# ----------------------|---------|----------|---------|---------|
# ERROR: Coverage for lines (72%) does not meet global threshold (80%)
```

```typescript
// ── v8 vs istanbul ─────────────────────────────────────────────────────────
// v8:       Uses Node.js native coverage — fast, no instrumentation overhead
//           Slightly less precise branch tracking (misses some ternary/nullish paths)
// istanbul: Instruments source code — slower but more accurate branch coverage
//           Required for: accurate branch coverage on ternary expressions, logical OR/AND

// Rule: start with v8 for speed; switch to istanbul if branch coverage numbers
// look wrong or you need SonarQube-compatible reports

// ── Per-file thresholds ────────────────────────────────────────────────────
thresholds: {
  lines: 80,
  // Also enforce on each individual file:
  perFile: true,  // any file below 80% lines fails the run
}
// Useful for: preventing new files from being added with 0% coverage
```

```typescript
// ── Coverage in watch mode (local dev) ────────────────────────────────────
// Don't collect coverage in watch mode — it slows feedback loop
// vitest.config.ts:
export default defineConfig({
  test: {
    coverage: {
      enabled: process.env.CI === 'true',  // only in CI
      // or: run manually with --coverage flag
    }
  }
})

// package.json scripts:
// "test":          "vitest",               ← watch, no coverage
// "test:run":      "vitest run",           ← single run, no coverage
// "test:coverage": "vitest run --coverage" ← coverage report
// "test:ci":       "vitest run --coverage" ← used in CI pipeline
```

```yaml
# .github/workflows/test.yml — upload coverage to Codecov
- name: Run tests with coverage
  run: npm run test:ci

- name: Upload coverage
  uses: codecov/codecov-action@v4
  with:
    files: ./coverage/lcov.info
    fail_ci_if_error: true
```

---

## W — Why It Matters

- Coverage thresholds turn coverage from a vanity metric into a CI gate — without a threshold, coverage can silently drop from 85% to 40% across a sprint of feature additions, and no one notices until a production bug in untested code.
- `perFile: true` prevents the "averaging trick" — a new file with 0% coverage added to a codebase with 95% average only nudges the average down slightly. Per-file thresholds catch it immediately.
- `lcov` format is the universal input format for Codecov, Coveralls, SonarQube, and GitHub's code coverage annotations — always include it alongside `text` and `html`.

---

## I — Interview Q&A

### Q: What is the difference between line coverage and branch coverage, and which is more meaningful?

**A:** Line coverage measures what percentage of code lines were executed during tests. Branch coverage measures what percentage of decision branches were taken — each `if/else`, ternary, `||`, `&&`, and `switch` case counts as two branches (true and false path). Branch coverage is more meaningful because a line can be "covered" with a test that only exercises one path — `if (isAdmin) doX()` is 100% line-covered if any test calls it when `isAdmin` is true, but 0% branch-covered on the false path. A bug hiding in the `else` branch is invisible to line coverage. The practical minimum: target 80% line coverage as a baseline and 70% branch coverage — branches are harder to fully cover in complex conditional logic.

---

## C — Common Pitfalls + Fix

### ❌ Including test files and generated code in coverage — inflated numbers

```typescript
// ❌ Test files have 100% coverage trivially — they inflate the percentage
coverage: {
  include: ['src/**'],  // includes *.test.ts, generated/, etc.
}
```

**Fix:** Explicitly exclude non-production code:

```typescript
// ✅
coverage: {
  include:  ['src/**/*.ts'],
  exclude:  ['src/**/*.test.ts', 'src/**/*.spec.ts', 'src/generated/**', '**/*.d.ts'],
}
```

---

## K — Coding Challenge + Solution

### Challenge

Configure Vitest coverage for a project with `src/` containing business logic. Requirements: (1) V8 provider; (2) text + html + lcov reporters; (3) 80% threshold for lines/functions/statements, 70% for branches; (4) exclude generated files and test files; (5) only run coverage when `CI=true`. Add the correct `package.json` scripts.

### Solution

```typescript
// vitest.config.ts
import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    environment: 'node',
    coverage: {
      enabled:          process.env.CI === 'true',
      provider:         'v8',
      include:          ['src/**/*.ts'],
      exclude:          [
        'src/**/*.test.ts',
        'src/**/*.spec.ts',
        'src/generated/**',
        'src/**/*.d.ts',
        'src/index.ts',   // re-export barrel — no logic
      ],
      reporter:         ['text', 'html', 'lcov', 'json-summary'],
      reportsDirectory: './coverage',
      thresholds: {
        lines:      80,
        functions:  80,
        statements: 80,
        branches:   70,
      },
    },
  },
})
```

```json
// package.json
{
  "scripts": {
    "test":          "vitest",
    "test:run":      "vitest run",
    "test:coverage": "CI=true vitest run --coverage",
    "test:ci":       "vitest run --coverage --reporter=verbose"
  }
}
```

---

---
