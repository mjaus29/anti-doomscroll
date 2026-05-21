# 4 — Test File Naming Conventions

---

## T — TL;DR

Vitest finds test files by pattern. The two conventions are co-location (`auth.test.ts` next to `auth.ts`) and a dedicated `__tests__` folder. Co-location is the modern standard — the test file lives next to what it tests, is easy to find, and is deleted automatically when the source file is deleted. Use `.test.ts` for unit tests and `.spec.ts` for integration/feature specs.

---

## K — Key Concepts

```
── Co-location pattern (recommended) ─────────────────────────────────────────

src/
  utils/
    format.ts
    format.test.ts      ← lives next to what it tests
  services/
    order.service.ts
    order.service.test.ts
  lib/
    prisma.ts
    prisma.test.ts      ← only if prisma.ts has testable logic

── __tests__ folder pattern (alternative) ────────────────────────────────────

src/
  utils/
    format.ts
  services/
    order.service.ts
  __tests__/
    utils/
      format.test.ts    ← mirrors src/ structure
    services/
      order.service.test.ts

── Which to use? ─────────────────────────────────────────────────────────────

Co-location pros:
  ✅ Test is right next to the source — fast to navigate
  ✅ Deleting the source reminds you to delete the test
  ✅ Standard in Vitest, React Testing Library, and modern TS projects
  ✅ No need to mirror directory structure manually

__tests__ pros:
  ✅ Clean src/ folder without test files
  ✅ Easier to exclude from production build by folder

Recommendation: co-location for unit tests, __tests__ for integration tests
```

```
── File name conventions ──────────────────────────────────────────────────────

[filename].test.ts      → unit test for [filename].ts
[filename].spec.ts      → integration or feature spec (both work with Vitest)
[filename].test.tsx     → unit test for a React component
setup.ts                → not a test file — global setup (in src/test/ or vitest.setup.ts)

Examples:
  formatPrice.test.ts
  user.service.test.ts
  createOrder.test.ts
  Button.test.tsx
  auth.integration.test.ts    ← some teams use .integration. to separate types

── Vitest include patterns ────────────────────────────────────────────────────

Default (without config):
  **/*.{test,spec}.{js,mjs,cjs,jsx,ts,mts,cts,tsx}
  **/__tests__/**/*.{js,mjs,cjs,jsx,ts,mts,cts,tsx}

Restrict to .test.ts only:
  include: ['**/*.test.ts', '**/*.test.tsx']

Separate integration tests:
  include: ['**/*.test.ts']       ← unit (default test run)
  include: ['**/*.int.test.ts']   ← integration (separate npm script)
```

```json
// package.json — separate scripts for unit vs integration
{
  "scripts": {
    "test":            "vitest run --exclude '**/*.int.test.ts'",
    "test:int":        "vitest run --include '**/*.int.test.ts'",
    "test:all":        "vitest run",
    "test:watch":      "vitest --exclude '**/*.int.test.ts'"
  }
}
```

---

## W — Why It Matters

- Co-location makes "delete the file you deleted" obvious — when you remove `format.ts`, `format.test.ts` shows up as an orphan immediately. With `__tests__`, the test file silently remains, testing a function that no longer exists or was moved, passing vacuously.
- The `.test.ts` vs `.spec.ts` distinction is team convention, not Vitest-enforced — pick one and stick with it. Mixing both patterns in one project creates confusion about which suffix means what.
- Separating unit from integration tests via filename (`.int.test.ts`) lets you run `npm test` in under 1 second locally (unit only) and reserve the slower integration tests for CI, keeping the fast-feedback loop intact.

---

## I — Interview Q&A

### Q: What is the advantage of co-locating test files next to source files instead of using a `__tests__` directory?

**A:** Co-location ties the test lifecycle to the source file lifecycle. When you open `order.service.ts`, you immediately see `order.service.test.ts` in the same directory — no searching required. When you delete or move `order.service.ts`, the test file is obviously orphaned or needs moving too. With a mirrored `__tests__` structure, it's easy for test files to persist after their source is removed, or to be forgotten when source files are moved. Co-location also scales better — in large projects with hundreds of files, navigating to `src/__tests__/services/order.service.test.ts` requires knowing the full mirror path, whereas the co-located test is always adjacent to the source in any file explorer.

---

## C — Common Pitfalls + Fix

### ❌ Naming test files without the `.test.` or `.spec.` suffix — Vitest ignores them

```
src/utils/formatTests.ts      ← ❌ Vitest won't pick this up
src/utils/format_test.ts      ← ❌ underscore, not dot — won't be found
src/utils/testFormat.ts       ← ❌ wrong pattern
```

**Fix:** Always use `.test.ts` or `.spec.ts`:

```
src/utils/format.test.ts      ← ✅ Vitest finds this
src/utils/format.spec.ts      ← ✅ also found
```

---

## K — Coding Challenge + Solution

### Challenge

Given this file structure, identify which files Vitest will automatically pick up as test files with the default config, and which it won't. Then rename the incorrect ones.

```
src/utils/format.ts
src/utils/format.test.ts
src/utils/formatHelper.test
src/services/orderTests.ts
src/services/order.service.spec.ts
src/__tests__/auth.test.ts
src/test/setup.ts
```

### Solution

```
✅ Picked up:
  src/utils/format.test.ts           → .test.ts pattern ✅
  src/services/order.service.spec.ts → .spec.ts pattern ✅
  src/__tests__/auth.test.ts         → __tests__ folder + .test.ts ✅

❌ NOT picked up:
  src/utils/formatHelper.test        → missing .ts extension
  src/services/orderTests.ts         → no .test. or .spec. in name
  src/test/setup.ts                  → no .test. or .spec. — correct (setup file)
  src/utils/format.ts                → source file, not a test

Renames:
  formatHelper.test     → formatHelper.test.ts
  orderTests.ts         → order.test.ts  (or order.service.test.ts)
```

---

---
