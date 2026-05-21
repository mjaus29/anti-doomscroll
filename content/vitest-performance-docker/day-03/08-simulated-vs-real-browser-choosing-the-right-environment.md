# 8 — Simulated vs Real Browser — Choosing the Right Environment

---

## T — TL;DR

Choose based on what your test needs: jsdom/happy-dom for logic, DOM structure, and event handling; real browser (Browser Mode) for layout, CSS, real APIs, cross-browser parity, and user interaction fidelity. Most tests belong in jsdom. Graduate to Browser Mode only when jsdom's limitations actually matter for what you're testing.

---

## K — Key Concepts

```
── Decision guide ────────────────────────────────────────────────────────────

Question                                           → Environment
─────────────────────────────────────────────────────────────────
Does this test check DOM structure / class / text? → jsdom/happy-dom
Does this test check event handler logic?          → jsdom/happy-dom
Does this test check form submission flow?         → jsdom/happy-dom
Does this test need getBoundingClientRect()?       → Browser Mode ✅
Does this test need getComputedStyle()?            → Browser Mode ✅
Does this test need real CSS media queries?        → Browser Mode ✅
Does this test need scroll position / overflow?    → Browser Mode ✅
Does this test need Canvas / WebGL?                → Browser Mode ✅
Does this test need Web Workers?                   → Browser Mode ✅
Does this test need Service Workers?               → Browser Mode ✅
Does this test need cross-browser compatibility?   → Browser Mode ✅
Does this test need real network (fetch → server)? → Browser Mode ✅
Does this test need drag-and-drop behaviour?       → Browser Mode ✅
```

```
── Speed and cost tradeoffs ─────────────────────────────────────────────────

Environment         │ Startup   │ Per test  │ Parallelism │ CI cost
────────────────────┼───────────┼───────────┼─────────────┼─────────
jsdom               │ ~100ms    │ <1ms      │ Threads     │ Low
happy-dom           │ ~50ms     │ <0.5ms    │ Threads     │ Low
Browser Mode        │ ~3–5s     │ ~50–200ms │ Processes   │ Medium
```

```typescript
// ── The pyramid: more jsdom, less browser ─────────────────────────────────
//
//        ╔════════════════════╗
//        ║  Browser Mode       ║  ← real layout, CSS, cross-browser
//        ║  (few, targeted)    ║     Web Workers, real network
//        ╠════════════════════╣
//        ║  jsdom / happy-dom  ║  ← DOM logic, event handlers, components
//        ║  (most tests)       ║     forms, state, user interactions
//        ╠════════════════════╣
//        ║  Pure unit tests    ║  ← pure functions, utilities, algorithms
//        ║  (no DOM needed)    ║     no environment overhead at all
//        ╚════════════════════╝
//
// Ideal ratio: ~70% pure unit, ~25% jsdom, ~5% Browser Mode
```

```typescript
// ── File naming convention ────────────────────────────────────────────────
// *.test.ts         → no DOM needed (pure unit)
// *.dom.test.ts     → jsdom/happy-dom
// *.browser.test.ts → Browser Mode
// This lets you run them separately and configure different environments per glob
```

```typescript
// ── Migrating a test from jsdom to Browser Mode ───────────────────────────
// Trigger: test needs getBoundingClientRect or real CSS

// BEFORE (jsdom — gives wrong geometry):
it('tooltip appears below target', () => {
  const target  = document.querySelector('#target')!
  const tooltip = document.querySelector('#tooltip')!
  const rect    = target.getBoundingClientRect()
  expect(tooltip.style.top).toBe(`${rect.bottom}px`)
  // getBoundingClientRect returns {top:0, bottom:0} in jsdom ← wrong ❌
})

// AFTER (Browser Mode — real geometry):
// Rename: tooltip.dom.test.ts → tooltip.browser.test.ts
// Add: @vitest-environment chromium (via workspace config)
it('tooltip appears below target', async () => {
  // same test — but now getBoundingClientRect() returns real values ✅
})
```

---

## W — Why It Matters

- Over-using Browser Mode slows the suite and increases flakiness — browser tests are 100–200× slower than jsdom tests and are sensitive to timing, rendering, and viewport changes. Keep Browser Mode for the tests that genuinely need it.
- Under-using Browser Mode misses real bugs — a dropdown that works in jsdom but overlaps content due to `z-index` in a real browser, an animation that blocks clicks, a font that causes text overflow — these bugs are invisible in jsdom.
- The naming convention (`*.browser.test.ts`) makes the distinction explicit and enforceable in CI — you can run fast jsdom tests on every commit and browser tests only on PRs or nightly builds.

---

## I — Interview Q&A

### Q: How do you decide which tests belong in jsdom vs Browser Mode?

**A:** Ask what the test is actually verifying. If it's verifying logic — does the DOM update correctly, does the event handler fire, does the form validate properly — jsdom is sufficient and preferable (faster, simpler). If it's verifying rendering or visual behaviour — is the element in the right position, does the CSS apply correctly, does overflow hide content, does a browser-specific API work — Browser Mode is required because jsdom has no layout engine and will give wrong answers. A practical rule: start every test in jsdom. If you find yourself writing `// this test is wrong because getBoundingClientRect returns 0` or `// can't test this because jsdom doesn't support X`, that's the signal to move the test to Browser Mode. Roughly 5–10% of frontend tests typically need Browser Mode.

---

## C — Common Pitfalls + Fix

### ❌ Writing all tests in Browser Mode for "realism" — massive performance penalty

```bash
# ❌ 500 tests in Browser Mode: ~3s startup + 500 × 100ms = ~53 seconds
# Same 500 tests in jsdom: ~100ms startup + 500 × 1ms = ~0.6 seconds
```

**Fix:** Use Browser Mode only for tests that require real browser capabilities:

```typescript
// ✅ Guideline:
// Logic / DOM structure tests → jsdom (fast, isolated)
// Layout / CSS / real API tests → Browser Mode (necessary)
```

---

## K — Coding Challenge + Solution

### Challenge

Categorise these test scenarios and assign the correct environment. Write the test for scenario 4 in the right environment: (1) testing that a `slug()` function lowercases text, (2) testing that a nav menu hides when its close button is clicked, (3) testing that a sticky header stays visible after scrolling, (4) testing that an input's placeholder disappears when focused, (5) testing a `fetch` call returns mocked data.

### Solution

```
Categorisation:

1. slug() → pure unit test (no DOM needed)
   File: slug.test.ts | Environment: none (Node)

2. nav menu hide → DOM logic
   File: nav.dom.test.ts | Environment: jsdom

3. sticky header scroll → requires real layout/scroll
   File: sticky-header.browser.test.ts | Environment: Browser Mode

4. input placeholder on focus → CSS :focus pseudo-class (getComputedStyle)
   File: input.browser.test.ts | Environment: Browser Mode

5. fetch mock → pure unit with vi.stubGlobal
   File: api.test.ts | Environment: jsdom (no real network needed)
```

```typescript
// src/input.browser.test.ts — scenario 4
import { describe, it, expect, afterEach } from 'vitest'
import { userEvent, page }                 from '@vitest/browser/context'

describe('input placeholder behaviour (real browser)', () => {
  afterEach(() => { document.body.innerHTML = '' })

  it('placeholder is visible before focus', async () => {
    document.body.innerHTML = '<input id="name" placeholder="Enter your name" />'
    const input = page.locator('#name')
    // In real browser, placeholder is visible when input is empty and unfocused
    await expect(input).toHaveAttribute('placeholder', 'Enter your name')
  })

  it('input accepts typed text replacing placeholder', async () => {
    document.body.innerHTML = '<input id="name" placeholder="Enter your name" />'
    const input = document.querySelector('#name') as HTMLInputElement

    await userEvent.click(input)         // focus
    await userEvent.type(input, 'Mark')  // type

    // Once text is entered, input.value has the typed text
    expect(input.value).toBe('Mark')
    // Placeholder is still the attribute but visually hidden by browser
    expect(input.placeholder).toBe('Enter your name')
  })
})
```

---

---
