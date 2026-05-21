# 1 — jsdom Fundamentals — What It Is and How Vitest Uses It

---

## T — TL;DR

jsdom is a JavaScript implementation of the DOM and HTML standards that runs in Node.js — no real browser required. Vitest uses it as a simulated browser environment. Set `environment: 'jsdom'` in `vitest.config.ts` to give every test file access to `window`, `document`, `HTMLElement`, and all DOM APIs as if running in a browser tab.

---

## K — Key Concepts

```typescript
// vitest.config.ts — enable jsdom globally
import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    environment: 'jsdom',   // all test files get a simulated browser environment
    globals:     true,      // optional: exposes describe/it/expect without importing
  }
})
```

```typescript
// ── Per-file environment override (docblock comment) ─────────────────────
// Put at the very top of the file — overrides global config for this file only
// @vitest-environment jsdom

import { describe, it, expect } from 'vitest'

it('has a document object', () => {
  expect(document).toBeDefined()
  expect(document.body).toBeDefined()
  expect(typeof window).toBe('object')
})
```

```typescript
// ── What jsdom provides ────────────────────────────────────────────────────
// window         — the global object
// document       — the DOM tree
// HTMLElement    — and all element subclasses
// navigator      — browser metadata (userAgent, etc.)
// location       — URL object (can be set in tests)
// localStorage / sessionStorage
// fetch          — partial support (Vitest polyfills this)
// MutationObserver, IntersectionObserver — available in jsdom 20+
// CustomEvent, Event, EventTarget
// CSS (partial — no layout engine, no computed styles)

it('document body is available', () => {
  document.body.innerHTML = '<h1 id="title">Hello</h1>'
  const el = document.getElementById('title')
  expect(el?.textContent).toBe('Hello')
})
```

```typescript
// ── jsdom resets between test files ──────────────────────────────────────
// Each test file gets a fresh jsdom instance — no state leakage between files
// Within a file, document persists between tests unless you clean up

describe('DOM cleanup between tests', () => {
  afterEach(() => {
    document.body.innerHTML = ''   // reset DOM after each test
  })

  it('adds an element', () => {
    const div = document.createElement('div')
    div.id = 'box'
    document.body.appendChild(div)
    expect(document.getElementById('box')).toBeTruthy()
  })

  it('starts clean', () => {
    // No 'box' element — was cleaned in afterEach ✅
    expect(document.getElementById('box')).toBeNull()
  })
})
```

```typescript
// ── Loading HTML into the document ────────────────────────────────────────
it('parses and queries HTML', () => {
  document.body.innerHTML = `
    <nav>
      <a href="/home" class="nav-link active">Home</a>
      <a href="/about" class="nav-link">About</a>
    </nav>
  `

  const links   = document.querySelectorAll('.nav-link')
  const active  = document.querySelector('.nav-link.active')

  expect(links).toHaveLength(2)
  expect(active?.textContent).toBe('Home')
  expect(active?.getAttribute('href')).toBe('/home')
})
```

```typescript
// ── jsdom limitations — what it cannot do ────────────────────────────────
// ❌ No layout engine — getBoundingClientRect() returns all zeros
// ❌ No CSS rendering — computed styles not accurate
// ❌ No <canvas> painting — canvas API exists but is a stub
// ❌ No web workers (partial support)
// ❌ No real navigation — window.location.href changes don't load pages
// ❌ No WebGL, WebRTC, WebSockets (stub/mock required)

// For these: use Vitest Browser Mode with a real browser (Subtopic 6+)
```

```bash
# Install jsdom for Vitest
npm install -D jsdom
# vitest automatically uses jsdom when environment: 'jsdom' is set
```

---

## W — Why It Matters

- jsdom enables DOM tests in CI without a display server — no `Xvfb`, no Docker with Chrome, no headless browser overhead. Tests run in milliseconds as pure Node.js processes.
- The global reset per test file is a key isolation guarantee — a test in `user.test.ts` that corrupts `document.body` does not affect `checkout.test.ts`. Within a file, you must manage DOM cleanup yourself with `afterEach`.
- Knowing jsdom's limitations (no layout, no computed styles) defines when to graduate to Browser Mode — if your test needs `getBoundingClientRect()`, `scrollTop`, or CSS-driven behaviour, jsdom will give wrong answers and you need a real browser.

---

## I — Interview Q&A

### Q: What is jsdom and why is it used in unit tests instead of a real browser?

**A:** jsdom is a Node.js implementation of the W3C DOM and HTML specifications — it simulates the browser's `document`, `window`, `HTMLElement`, and event APIs in memory without rendering pixels. It's used in unit tests because it's orders of magnitude faster than launching a real browser: a jsdom test suite starts in ~100ms vs 3–5 seconds for a browser. It runs in the same Node.js process as Vitest, so tests are debuggable with standard Node tools and run without a GUI in CI. The trade-off: jsdom has no layout engine and no CSS rendering — it cannot tell you where an element is on screen or what its computed style is. For tests that require these (drag-and-drop, overflow, scroll), a real browser is required.

---

## C — Common Pitfalls + Fix

### ❌ DOM state leaking between tests — missing `afterEach` cleanup

```typescript
// ❌ Each test appends to the same body — elements accumulate
it('renders a button', () => {
  document.body.innerHTML = '<button id="b1">Click</button>'
  // test ends — button still in body ❌
})

it('expects only one button', () => {
  document.body.innerHTML += '<button id="b2">Submit</button>'
  const buttons = document.querySelectorAll('button')
  expect(buttons).toHaveLength(1)  // ❌ FAILS — finds both b1 and b2
})
```

**Fix:** Reset `document.body.innerHTML` in `afterEach`:

```typescript
// ✅
afterEach(() => { document.body.innerHTML = '' })
```

---

## K — Coding Challenge + Solution

### Challenge

Configure Vitest for jsdom. Write three tests: (1) `document` is defined; (2) creates a `<div>` with class `card` and verifies `classList.contains`; (3) sets `innerHTML` to a list and verifies `querySelectorAll` returns the right count. Clean up the DOM in `afterEach`.

### Solution

```typescript
// vitest.config.ts
import { defineConfig } from 'vitest/config'
export default defineConfig({
  test: { environment: 'jsdom' }
})

// src/dom-basics.test.ts
import { describe, it, expect, afterEach } from 'vitest'

describe('jsdom basics', () => {
  afterEach(() => { document.body.innerHTML = '' })

  it('provides a document object', () => {
    expect(document).toBeDefined()
    expect(typeof window).toBe('object')
  })

  it('creates and queries a DOM element', () => {
    const card = document.createElement('div')
    card.className = 'card'
    card.textContent = 'My Card'
    document.body.appendChild(card)

    const found = document.querySelector('.card')
    expect(found).not.toBeNull()
    expect(found?.classList.contains('card')).toBe(true)
    expect(found?.textContent).toBe('My Card')
  })

  it('queries multiple elements from innerHTML', () => {
    document.body.innerHTML = `
      <ul id="list">
        <li class="item">One</li>
        <li class="item">Two</li>
        <li class="item">Three</li>
      </ul>
    `
    const items = document.querySelectorAll('.item')
    expect(items).toHaveLength(3)
    expect(items[0].textContent).toBe('One')
    expect(items[2].textContent).toBe('Three')
  })
})
```

---

---
