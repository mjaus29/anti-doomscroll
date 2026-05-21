# 1 — Testing Purpose and the Test Pyramid

---

## T — TL;DR

Tests are automated checks that your code does what you think it does — now and after every future change. The test pyramid has three layers: unit tests (many, fast, isolated), integration tests (fewer, test real connections), and end-to-end tests (fewest, test full flows). Write mostly unit tests. They catch bugs in milliseconds, not minutes.

---

## K — Key Concepts

```
── The Test Pyramid ──────────────────────────────────────────────────────────

           /▲\
          / E2E \          ← fewest (5–10%)
         /───────\           Playwright, Cypress
        / Integr. \        ← moderate (20–30%)
       /────────────\        DB queries, HTTP handlers
      /  Unit Tests  \     ← most (60–70%)
     /────────────────\      pure functions, utils, services

── Each layer defined ────────────────────────────────────────────────────────

Unit Test
  - Tests ONE function or class in isolation
  - No real DB, no real network, no file system
  - Fast: < 5ms per test
  - Deterministic: same input → same output every run
  - Example: "does formatCurrency(1999) return '$19.99'?"

Integration Test
  - Tests multiple real units working together
  - May use a real (test) database or real HTTP calls
  - Slower: 50–500ms per test
  - Example: "does createOrder() write the right rows to the DB?"

End-to-End (E2E) Test
  - Tests a full user flow through the real UI
  - Requires a running app, browser, and DB
  - Slowest: 2–30 seconds per test
  - Example: "can a user sign up, add to cart, and check out?"

── Why this pyramid shape? ───────────────────────────────────────────────────

Unit tests are cheap to write and run.
E2E tests are expensive to write, maintain, and run.
A pyramid base of unit tests gives maximum feedback speed.
Inverting the pyramid (mostly E2E) = slow CI and flaky tests.
```

```typescript
// ── What a test actually is (pseudocode) ──────────────────────────────────

// Function under test:
function add(a: number, b: number): number {
  return a + b
}

// The test:
// Given: a = 2, b = 3
// When:  I call add(2, 3)
// Then:  the result should be 5

// This is the Given-When-Then pattern — every test has all three parts.
// "it should…" is the natural English version: "it should add two numbers"
```

```
── What tests protect ────────────────────────────────────────────────────────

Regression protection  → a bug fixed once never returns (if you write the test)
Refactoring confidence → change internals, tests still pass = behaviour unchanged
Documentation          → tests show how functions are meant to be called
Design pressure        → hard-to-test code = poorly designed code (tight coupling)
```

---

## W — Why It Matters

- Without tests, every code change is a guess — you push and hope. With unit tests, you know immediately if a function broke. In a TypeScript codebase, types catch type errors; tests catch logic errors. Both are necessary.
- The pyramid shape is a cost decision — E2E tests take 10 minutes to run, unit tests take 3 seconds. If your full CI suite is fast, you get feedback before coffee cools. If it's slow, developers stop running it locally.
- "Writing tests slows me down" is true for the first week and false for the rest of the project — tests slow initial writing by ~20% and save debugging time by ~80%. The ROI turns positive within 2–3 sprints.

---

## I — Interview Q&A

### Q: What is the test pyramid and why does the shape matter?

**A:** The test pyramid is a model for the ideal distribution of automated tests. The base — the widest layer — is unit tests: many, fast, isolated tests of individual functions. The middle is integration tests: fewer tests that verify multiple components working together with real dependencies like databases. The top is end-to-end tests: the fewest, slowest tests that drive a real UI through full user flows. The pyramid shape matters because test cost scales with proximity to production. Unit tests run in milliseconds and can number in the hundreds with no CI impact. E2E tests take seconds to minutes each and become the bottleneck. Inverting the pyramid — few unit tests, many E2E — results in slow, flaky CI that developers stop trusting.

---

## C — Common Pitfalls + Fix

### ❌ Testing implementation details — tests break on refactor

```typescript
// ❌ Tests the internal variable name — breaks if you rename it
expect(cart._internalItems.length).toBe(2)
// This test passes if items = 2, fails if you rename _internalItems ❌
```

**Fix:** Test observable behaviour — inputs and outputs, not internals:

```typescript
// ✅ Tests what the user cares about
expect(cart.getItemCount()).toBe(2)
// Rename internals freely — test still passes ✅
```

---

## K — Coding Challenge + Solution

### Challenge

Classify each of these as unit, integration, or E2E tests and explain why: (1) calling `formatPrice(1999)` and checking it returns `"$19.99"`; (2) calling `POST /api/orders` and checking the database has a new row; (3) opening a browser, logging in, adding an item, and checking the order confirmation page.

### Solution

```
1. Unit test
   - Tests one pure function (formatPrice) in isolation
   - No DB, no network, no side effects
   - Input → output only

2. Integration test
   - Tests an HTTP handler + a real database together
   - Uses real connections (HTTP + PostgreSQL)
   - Multiple real layers working together

3. End-to-end test
   - Tests a complete user journey through a real browser
   - Requires running frontend, backend, and database
   - Simulates actual user behaviour
```

---

---
