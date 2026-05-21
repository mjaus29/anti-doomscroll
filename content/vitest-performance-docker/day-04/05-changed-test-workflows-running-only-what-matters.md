# 5 — Changed-Test Workflows — Running Only What Matters

---

## T — TL;DR

Running the full test suite on every file change wastes time. Vitest's `--changed` flag runs only tests affected by uncommitted Git changes. The `related` filter runs tests for specific files. In CI on PRs, combine `--changed=origin/main` with full suite on merge to `main` — fast feedback on PRs, full confidence on main.

---

## K — Key Concepts

```bash
# ── Vitest --changed flag ─────────────────────────────────────────────────

# Run tests related to uncommitted changes (vs HEAD)
npx vitest run --changed

# Run tests related to changes since a specific commit/branch
npx vitest run --changed=HEAD~1          # since last commit
npx vitest run --changed=origin/main     # since branching from main
npx vitest run --changed=abc1234         # since specific commit SHA

# How it works:
# 1. Git diff identifies changed source files
# 2. Vitest resolves which test files import (directly or transitively) those files
# 3. Only those test files run
```

```bash
# ── --related flag — explicit file list ───────────────────────────────────
# Run tests for a specific source file
npx vitest related src/utils/slug.ts

# Multiple files
npx vitest related src/utils/slug.ts src/services/auth.ts

# Useful in git hooks (pre-commit):
# Run tests only for staged files
STAGED=$(git diff --cached --name-only --diff-filter=ACM | grep '\.ts$' | tr '\n' ' ')
if [ -n "$STAGED" ]; then
  npx vitest related $STAGED --run
fi
```

```typescript
// ── Dependency graph — how Vitest traces affected tests ────────────────────
// Changed file:     src/utils/format.ts
// Imports it:       src/services/invoice.ts
//                   src/components/price-display.ts
// Test files for:   src/utils/format.test.ts
//                   src/services/invoice.test.ts
//                   src/components/price-display.test.ts
// → Vitest runs all three even though only format.ts changed ✅

// Limitation: dynamic imports and require() may not be traced
// Limitation: external file reads (fs.readFileSync) not traced
// Safe fallback: always run full suite on merge to main
```

```yaml
# .github/workflows/pr.yml — fast PR checks with --changed
name: PR Tests

on: pull_request

jobs:
  test-changed:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0    # ← required: full history for git diff

      - uses: actions/setup-node@v4
        with: { node-version: '22', cache: 'npm' }

      - run: npm ci

      - name: Run changed tests
        run: npx vitest run --changed=origin/main
        # Runs only tests affected by this PR's changes
        # Typically 5–20% of the full suite on small PRs
```

```yaml
# .github/workflows/main.yml — full suite on merge
name: Main Branch Tests

on:
  push:
    branches: [main]

jobs:
  test-full:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: '22', cache: 'npm' }
      - run: npm ci
      - run: npx vitest run --coverage
        env: { CI: 'true' }
      # Full suite + coverage on every merge to main
```

```bash
# ── Watch mode is automatic changed-detection in development ──────────────
npx vitest
# Vitest watch mode automatically re-runs affected tests on every file save
# This is the local equivalent of --changed: instant feedback loop
# No configuration needed — this is Vitest's default when not using --run
```

---

## W — Why It Matters

- `--changed=origin/main` on PRs turns a 10-minute suite into a 30-second check for a small PR that touches 2 files — developers get feedback before they've switched mental context.
- `fetch-depth: 0` in the checkout action is required — without it, GitHub Actions does a shallow clone with no history, and `git diff origin/main` has nothing to compare against. This is the most common reason `--changed` runs the full suite unexpectedly.
- The two-tier strategy (fast `--changed` on PRs, full suite on `main`) gives the best tradeoff: developers iterate quickly, and the `main` branch is always verified against the complete test suite before any code is considered deployed.

---

## I — Interview Q&A

### Q: How does `vitest --changed` determine which tests to run?

**A:** Vitest asks Git for the list of files changed since the specified ref (`HEAD`, `origin/main`, or a commit SHA). It then builds a module dependency graph by statically analysing ES module `import` statements in all test files. Any test file that directly or transitively imports one of the changed source files is included in the run. For example, if `utils/format.ts` changed and `services/invoice.ts` imports it and `invoice.test.ts` imports `invoice.ts`, all three are traced and `invoice.test.ts` runs. Limitations: dynamic imports (`import(path)`), CommonJS `require()`, and file system reads (`fs.readFile`) are not traced by the static analyser. For these cases, affected tests may be missed — which is why the full suite runs on the main branch, not just on PRs.

---

## C — Common Pitfalls + Fix

### ❌ Shallow clone — `--changed` runs all tests instead of the affected subset

```yaml
# ❌ Default checkout is shallow — git diff has no base to compare against
- uses: actions/checkout@v4
# No fetch-depth → shallow clone → --changed falls back to running everything
```

**Fix:** Set `fetch-depth: 0` for full history:

```yaml
# ✅
- uses: actions/checkout@v4
  with:
    fetch-depth: 0   # full git history — required for --changed
```

---

## K — Coding Challenge + Solution

### Challenge

Create two workflow files: (1) `pr.yml` — runs `--changed=origin/main`, requires `fetch-depth: 0`, runs on all PRs, no coverage; (2) `ci.yml` — runs full suite with 3 shards and coverage, triggers on push to `main` and `develop`. Show the `package.json` scripts used by each.

### Solution

```yaml
# .github/workflows/pr.yml
name: PR — Changed Tests
on:
  pull_request:
    types: [opened, synchronize, reopened]

jobs:
  test-changed:
    name: Run changed tests
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0

      - uses: actions/setup-node@v4
        with:
          node-version: '22'
          cache: 'npm'

      - run: npm ci

      - name: Run tests for changed files
        run: npm run test:changed
```

```yaml
# .github/workflows/ci.yml
name: CI — Full Suite
on:
  push:
    branches: [main, develop]

jobs:
  test:
    name: Test shard ${{ matrix.shard }}/3
    runs-on: ubuntu-latest
    strategy:
      fail-fast: false
      matrix:
        shard: [1, 2, 3]
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: '22', cache: 'npm' }
      - run: npm ci
      - run: npm run test:ci -- --shard=${{ matrix.shard }}/3
        env: { CI: 'true' }
      - uses: actions/upload-artifact@v4
        if: always()
        with:
          name: coverage-${{ matrix.shard }}
          path: coverage/lcov.info
```

```json
// package.json
{
  "scripts": {
    "test":         "vitest",
    "test:run":     "vitest run",
    "test:changed": "vitest run --changed=origin/main",
    "test:ci":      "vitest run --coverage",
    "test:related": "vitest related"
  }
}
```

---

---
