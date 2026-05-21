# 7 — Watch Mode and Filtering Tests

---

## T — TL;DR

`vitest` (no flags) runs in watch mode — it re-runs affected tests whenever a file changes. It also has an interactive terminal UI where you can filter by filename, test name, or run only failed tests. Mastering watch mode filters makes the feedback loop near-instant — you see red or green within 200ms of saving.

---

## K — Key Concepts

```bash
# ── Starting watch mode ────────────────────────────────────────────────────
npx vitest
# or:
npm run test:watch

# Watch mode re-runs tests for files that changed (smart — not all tests)
# Press h in the terminal for interactive help:

# Interactive keyboard shortcuts (in watch mode):
# a → run all tests
# f → run only failed tests
# p → filter by filename pattern (type to search)
# t → filter by test name pattern (type to search)
# r → re-run current pattern
# u → update snapshots
# q → quit watch mode
```

```bash
# ── CLI filtering — running specific tests ────────────────────────────────

# Run tests matching a file pattern
npx vitest run formatPrice    # runs files with 'formatPrice' in the path

# Run tests matching a test name pattern
npx vitest run -t "adds two numbers"    # runs tests whose name matches

# Run a specific file
npx vitest run src/utils/format.test.ts

# Run a directory
npx vitest run src/utils/

# Run multiple patterns
npx vitest run formatPrice priceUtils

# Combine file + test name filter
npx vitest run format -t "handles zero"
```

```bash
# ── Useful watch mode workflows ────────────────────────────────────────────

# Scenario 1: Working on one file
# Start watch mode, press 'p', type 'order.service'
# → Only order.service.test.ts runs on every save
# → Fast feedback, no noise from unrelated tests

# Scenario 2: Fix the last failure
# Press 'f' → runs only the test that was failing
# Fix the bug → save → test turns green → press 'a' to run all

# Scenario 3: Run tests for a specific feature
# npx vitest --reporter=verbose -t "createOrder"
# → Shows only tests with "createOrder" in the name, verbose output
```

```bash
# ── Reporter options ───────────────────────────────────────────────────────
npx vitest run --reporter=verbose    # show each individual test name
npx vitest run --reporter=dot        # one dot per test (compact)
npx vitest run --reporter=json       # machine-readable JSON output (CI)
npx vitest run --reporter=junit      # JUnit XML (for CI test reporting dashboards)
npx vitest run --reporter=html       # HTML report (saved to file)

# Multiple reporters:
npx vitest run --reporter=verbose --reporter=json
```

---

## W — Why It Matters

- Watch mode with file filtering is the core of a fast TDD loop — you write a failing test for `order.service.ts`, press `p`, type `order.service`, and only that file's tests run on every save. The feedback is under 200ms. Without filtering, the entire test suite runs on every keystroke in large projects.
- The `f` (failed only) shortcut is the fastest debugging tool — when you have 5 failing tests in a 300-test suite, pressing `f` isolates them immediately. Fix one, save, watch it turn green, repeat. No configuration needed.
- `--reporter=junit` in CI generates XML test reports that GitHub Actions, Jenkins, and GitLab CI can parse to display per-test pass/fail status in the PR interface — worth adding even if the text output is sufficient for debugging.

---

## I — Interview Q&A

### Q: How do you run only a subset of tests without modifying test files?

**A:** Vitest provides several ways to filter without touching test files. Via the CLI: `vitest run -t "pattern"` runs only tests whose name matches the pattern; `vitest run path/to/file` runs a specific file; `vitest run directoryName` runs all tests in a directory. In interactive watch mode: press `p` to filter by filename, press `t` to filter by test name — both accept live-typed patterns. This is preferable to using `it.only` or `describe.only` because those modifications must be reverted before committing, whereas CLI filters are transient. For recurring subsets (unit vs integration), use separate npm scripts with different `--include` patterns in `package.json`.

---

## C — Common Pitfalls + Fix

### ❌ Committing `it.only` or `describe.only` — silently hides failures

```typescript
// ❌ Committed to git — all other tests in this file are skipped in CI
it.only('the one test I was debugging', () => {
  expect(true).toBe(true)
})
// CI passes because the only test that ran passed ❌
```

**Fix:** Use ESLint to ban `.only` in committed code:

```bash
npm install --save-dev eslint-plugin-vitest
```

```json
// .eslintrc or eslint.config.js
{
  "plugins": ["vitest"],
  "rules": {
    "vitest/no-focused-tests": "error",   // bans .only
    "vitest/no-disabled-tests": "warn"    // warns on .skip
  }
}
```

---

## K — Coding Challenge + Solution

### Challenge

Write the `package.json` scripts section for a project with: (1) `test` — run all unit tests once (CI); (2) `test:watch` — watch mode; (3) `test:int` — run only `*.int.test.ts` files; (4) `test:ui` — open Vitest UI; (5) `test:coverage` — run with coverage. Then show the terminal command to run only tests with "formatPrice" in the test name in watch mode.

### Solution

```json
{
  "scripts": {
    "test":          "vitest run --exclude '**/*.int.test.ts'",
    "test:watch":    "vitest --exclude '**/*.int.test.ts'",
    "test:int":      "vitest run --include '**/*.int.test.ts'",
    "test:ui":       "vitest --ui",
    "test:coverage": "vitest run --coverage --exclude '**/*.int.test.ts'"
  }
}
```

```bash
# Run only tests matching 'formatPrice' in watch mode:
npx vitest -t "formatPrice"

# Or: start watch mode, then press 't' and type 'formatPrice'
npx vitest
# [interactive] t → formatPrice
```

---

---
