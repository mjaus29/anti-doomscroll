
# 📅 Day 3 — DOM and Browser Testing

> **Goal:** Test UI logic, DOM interactions, and user behaviour confidently — from in-process jsdom simulations to real browser execution with Vitest Browser Mode. Know when to use each environment and how to write tests that reflect what users actually do.
> **Format:** Each subtopic = 5–15 min. Do one. Stop. Come back.
> **Stack:** Vitest 4.x · jsdom · happy-dom · Vitest Browser Mode · TypeScript 6

---

## 📋 Day 3 Subtopic Overview

| # | Subtopic | Time |
|---|----------|------|
| 1 | jsdom Fundamentals — What It Is and How Vitest Uses It | 10 min |
| 2 | happy-dom — Tradeoffs vs jsdom | 10 min |
| 3 | DOM Interaction Testing — Query, Fire, Assert | 12 min |
| 4 | Component Behaviour Testing — UI Logic Without a Framework | 12 min |
| 5 | Testing Forms — Input, Submit, Validation Feedback | 12 min |
| 6 | Browser Mode Setup — Vitest + Real Browser | 12 min |
| 7 | Real Browser Execution — Playwright Provider | 12 min |
| 8 | Simulated vs Real Browser — Choosing the Right Environment | 10 min |
| 9 | Integration-Style Frontend Tests — User Behaviour Flows | 12 min |

---

---

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

# 2 — happy-dom — Tradeoffs vs jsdom

---

## T — TL;DR

happy-dom is a lighter, faster alternative to jsdom — it implements the same browser APIs but prioritises speed over compliance. It's 2–4x faster than jsdom for most DOM operations. The tradeoff: fewer edge-case API implementations. Use happy-dom for speed in large suites; use jsdom when you hit API gaps or need broader W3C compliance.

---

## K — Key Concepts

```typescript
// vitest.config.ts — switch to happy-dom
import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    environment: 'happy-dom',  // drop-in replacement for jsdom
  }
})
```

```bash
# Install
npm install -D happy-dom
# That's it — same vitest.config.ts change, no other changes required
```

```typescript
// ── What happy-dom covers (same as jsdom for most tests) ─────────────────
// document / window / HTMLElement
// Event handling — addEventListener, dispatchEvent
// querySelector / querySelectorAll
// classList, setAttribute, innerHTML, textContent
// Forms — input.value, select, checkbox
// fetch — native implementation (no polyfill needed)
// localStorage / sessionStorage
// MutationObserver, ResizeObserver (happy-dom implements these)
// CustomElements (Web Components — happy-dom support is good)
```

```typescript
// ── happy-dom specific: window.happyDOM ────────────────────────────────────
// happy-dom exposes a control API for async operations
import { Window } from 'happy-dom'

const window   = new Window()
const document = window.document

document.body.innerHTML = '<p id="msg">Hello</p>'

const el = document.querySelector('#msg')
console.log(el?.textContent)   // 'Hello'

// Wait for all async DOM operations to settle
await window.happyDOM.whenAsyncComplete()
await window.happyDOM.abort()   // cancel pending async ops

window.close()  // cleanup
```

```
── jsdom vs happy-dom comparison ─────────────────────────────────────────────

Feature                    │ jsdom                 │ happy-dom
───────────────────────────┼───────────────────────┼──────────────────────
Speed                      │ Baseline              │ 2–4× faster
W3C compliance             │ Very high             │ High (most APIs)
CSS parsing                │ Basic                 │ Basic
fetch                      │ Needs polyfill        │ Built-in
Web Components             │ Partial               │ Good
MutationObserver           │ Yes (v20+)            │ Yes
ResizeObserver             │ Partial               │ Yes
File API                   │ Yes                   │ Partial
Shadow DOM                 │ Partial               │ Partial
Edge case coverage         │ Better                │ Some gaps
npm downloads / maturity   │ Very mature           │ Newer, growing fast
Memory usage               │ Higher                │ Lower
```

```typescript
// ── Per-file environment override ─────────────────────────────────────────
// Use jsdom for one file even when global is happy-dom:

// @vitest-environment jsdom
import { it, expect } from 'vitest'

// Or vice versa — happy-dom for one file in a jsdom project:
// @vitest-environment happy-dom
```

```typescript
// ── When happy-dom may fail that jsdom handles ─────────────────────────────
// Some edge cases where jsdom is more compliant:
// - Certain CSSOM APIs (sheet.cssRules etc.)
// - Complex innerHTML parsing edge cases
// - Specific HTML spec error-recovery behaviour
// - Some URL/navigation edge cases

// If a test fails on happy-dom but passes on jsdom:
// 1. Check if it's a feature gap (file an issue or use jsdom)
// 2. Check if your code relies on non-standard behaviour
// Per-file @vitest-environment jsdom covers individual edge cases ✅
```

---

## W — Why It Matters

- A 2–4× speed improvement in the DOM environment compounds across large suites — if you have 500 DOM tests that each take 10ms in jsdom, switching to happy-dom may cut 1–2 seconds from every test run. In CI with 50 runs per day, that's 50–100 seconds saved.
- happy-dom's built-in `fetch` implementation removes the need for `whatwg-fetch` or `cross-fetch` polyfills in your test setup — less configuration noise.
- The switch is one config line — it's worth trying happy-dom first and only falling back to jsdom for specific files where you encounter API gaps. Most React/Vue/vanilla DOM tests work identically on both.

---

## I — Interview Q&A

### Q: What are the main tradeoffs between jsdom and happy-dom?

**A:** jsdom is the more mature, W3C-compliant choice — it covers more edge cases in the HTML and DOM specifications, has a larger community, and has been battle-tested in Jest for years. happy-dom is significantly faster (2–4×) and has a smaller memory footprint, making it preferable for large test suites where speed is a priority. happy-dom also includes a native `fetch` implementation, removing the need for polyfills. The practical decision: start with happy-dom for speed; switch specific test files to jsdom using the `@vitest-environment jsdom` docblock when you hit an API that happy-dom doesn't implement correctly. For most component and DOM interaction tests, they are interchangeable.

---

## C — Common Pitfalls + Fix

### ❌ Switching environments globally without testing compatibility

```typescript
// ❌ Switching entire suite to happy-dom and discovering gaps in CI
// Some test uses CSSOM API only jsdom implements → silently returns wrong value
```

**Fix:** Migrate incrementally and use per-file overrides for known gaps:

```typescript
// vitest.config.ts — use happy-dom globally
export default defineConfig({ test: { environment: 'happy-dom' } })

// specific-edge-case.test.ts — override for this file
// @vitest-environment jsdom
import { it, expect } from 'vitest'
// This file uses CSSOM APIs that need jsdom ✅
```

---

## K — Coding Challenge + Solution

### Challenge

Set up a Vitest config using happy-dom. Write a test verifying `localStorage.setItem` and `getItem`. Write a second test in the same file using `MutationObserver` to detect a DOM change. Override one test file to use jsdom environment.

### Solution

```typescript
// vitest.config.ts
import { defineConfig } from 'vitest/config'
export default defineConfig({
  test: { environment: 'happy-dom' }
})

// src/storage.test.ts — uses happy-dom (global)
import { describe, it, expect, afterEach } from 'vitest'

describe('localStorage in happy-dom', () => {
  afterEach(() => localStorage.clear())

  it('stores and retrieves a value', () => {
    localStorage.setItem('theme', 'dark')
    expect(localStorage.getItem('theme')).toBe('dark')
  })

  it('returns null for missing key', () => {
    expect(localStorage.getItem('nonexistent')).toBeNull()
  })
})

describe('MutationObserver in happy-dom', () => {
  afterEach(() => { document.body.innerHTML = '' })

  it('detects a child node addition', async () => {
    const mutations: MutationRecord[] = []
    const observer = new MutationObserver(list => mutations.push(...list))
    observer.observe(document.body, { childList: true })

    const p = document.createElement('p')
    document.body.appendChild(p)

    await new Promise(r => setTimeout(r, 0))  // flush microtasks

    expect(mutations.length).toBeGreaterThan(0)
    expect(mutations[0].type).toBe('childList')
    observer.disconnect()
  })
})
```

```typescript
// src/cssom-edge.test.ts — override to jsdom for CSSOM compliance
// @vitest-environment jsdom
import { it, expect } from 'vitest'

it('reads cssRules from a stylesheet', () => {
  const style = document.createElement('style')
  style.textContent = 'body { color: red; }'
  document.head.appendChild(style)
  // cssRules access works reliably in jsdom
  expect(style.sheet?.cssRules.length).toBeGreaterThan(0)
})
```

---

---

# 3 — DOM Interaction Testing — Query, Fire, Assert

---

## T — TL;DR

DOM interaction testing has three steps: **query** the element (`getElementById`, `querySelector`), **act** on it (`.click()`, `dispatchEvent`, set `.value`), **assert** the result (changed text, class, DOM structure). Always prefer queries that reflect real user access patterns — by text content, ARIA role, or label — over implementation-specific IDs.

---

## K — Key Concepts

```typescript
import { describe, it, expect, afterEach } from 'vitest'

afterEach(() => { document.body.innerHTML = '' })

// ── Querying elements ──────────────────────────────────────────────────────
document.body.innerHTML = `
  <button id="submit-btn" class="btn primary" data-testid="submit">
    Submit Order
  </button>
  <input type="email" id="email" placeholder="Enter email" />
  <span role="status" aria-live="polite"></span>
`

// By ID
const btn   = document.getElementById('submit-btn')

// By CSS selector
const input = document.querySelector('input[type="email"]')

// By data-testid (convention — resistant to style/content changes)
const btnByTestId = document.querySelector('[data-testid="submit"]')

// By role (closest to how assistive tech finds elements)
const status = document.querySelector('[role="status"]')

// querySelectorAll — returns NodeList
const allBtns = document.querySelectorAll('button')
```

```typescript
// ── Firing events ─────────────────────────────────────────────────────────

// Click
btn?.click()
// OR:
btn?.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }))

// Input change
const emailInput = document.querySelector('#email') as HTMLInputElement
emailInput.value = 'mark@example.com'
emailInput.dispatchEvent(new Event('input',  { bubbles: true }))
emailInput.dispatchEvent(new Event('change', { bubbles: true }))

// Keyboard events
emailInput.dispatchEvent(new KeyboardEvent('keydown', {
  key:      'Enter',
  code:     'Enter',
  bubbles:  true,
  cancelable: true
}))

// Focus / Blur
emailInput.dispatchEvent(new FocusEvent('focus', { bubbles: true }))
emailInput.dispatchEvent(new FocusEvent('blur',  { bubbles: true }))
```

```typescript
// ── Full interaction test: button toggles state ────────────────────────────
function setupToggle() {
  document.body.innerHTML = `
    <button id="toggle" aria-pressed="false">Toggle</button>
    <div id="panel" hidden>Panel content</div>
  `

  const btn   = document.getElementById('toggle')!
  const panel = document.getElementById('panel')!

  btn.addEventListener('click', () => {
    const isOpen = !panel.hidden
    panel.hidden = isOpen
    btn.setAttribute('aria-pressed', String(!isOpen))
    btn.textContent = isOpen ? 'Toggle' : 'Close'
  })
}

describe('toggle button', () => {
  afterEach(() => { document.body.innerHTML = '' })

  it('shows panel on first click', () => {
    setupToggle()
    const btn   = document.getElementById('toggle')!
    const panel = document.getElementById('panel')!

    expect(panel.hidden).toBe(true)

    btn.click()

    expect(panel.hidden).toBe(false)
    expect(btn.getAttribute('aria-pressed')).toBe('true')
    expect(btn.textContent).toBe('Close')
  })

  it('hides panel on second click', () => {
    setupToggle()
    const btn   = document.getElementById('toggle')!
    const panel = document.getElementById('panel')!

    btn.click()  // open
    btn.click()  // close

    expect(panel.hidden).toBe(true)
    expect(btn.getAttribute('aria-pressed')).toBe('false')
  })
})
```

```typescript
// ── Assert DOM structure ───────────────────────────────────────────────────
it('renders a list of items', () => {
  function renderList(items: string[]) {
    document.body.innerHTML = `
      <ul id="list">
        ${items.map(i => `<li class="list-item">${i}</li>`).join('')}
      </ul>
    `
  }

  renderList(['Apple', 'Banana', 'Cherry'])

  const items = document.querySelectorAll('.list-item')
  expect(items).toHaveLength(3)
  expect(Array.from(items).map(el => el.textContent))
    .toEqual(['Apple', 'Banana', 'Cherry'])
})
```

```typescript
// ── Assert class changes ──────────────────────────────────────────────────
it('adds active class on click', () => {
  document.body.innerHTML = '<button id="btn" class="tab">Tab 1</button>'
  const btn = document.getElementById('btn')!

  btn.addEventListener('click', () => btn.classList.add('active'))

  expect(btn.classList.contains('active')).toBe(false)
  btn.click()
  expect(btn.classList.contains('active')).toBe(true)
})
```

---

## W — Why It Matters

- Testing DOM interactions at the interaction level (click, type, submit) keeps tests resilient to refactoring — a test that clicks a button and checks the result doesn't break when you change the button's CSS class or internal implementation.
- `bubbles: true` in dispatched events is often required — many event handlers are attached to parent elements and rely on event bubbling. A `click()` without `bubbles: true` may not trigger handlers on ancestor elements.
- Testing `aria-*` attributes alongside DOM changes verifies accessibility correctness at the same time as functional correctness — a toggle that changes `hidden` but forgets `aria-pressed` is both a functional and accessibility bug.

---

## I — Interview Q&A

### Q: Why should you dispatch events with `bubbles: true` and what happens if you don't?

**A:** DOM events bubble up from the target element to its ancestors by default for most interaction events (click, input, change). Event handlers are often attached to a container element rather than the specific target — for example, a form element listens for `submit` which bubbles up from the button. If you `dispatchEvent(new Event('click'))` without `bubbles: true`, the event only reaches handlers on that exact element — any handler on a parent element never sees it. Real browser events bubble by default for interaction events. In tests, you must explicitly set `bubbles: true` in the event constructor options to match real browser behaviour: `new MouseEvent('click', { bubbles: true, cancelable: true })`.

---

## C — Common Pitfalls + Fix

### ❌ Setting `input.value` without dispatching an event — handler not called

```typescript
// ❌ Setting value programmatically doesn't trigger event listeners
const input = document.querySelector('#search') as HTMLInputElement
input.value = 'typescript'
// The 'input' event listener on the element is NEVER called ❌
```

**Fix:** Dispatch the event after setting the value:

```typescript
// ✅ Mimic what the browser does when a user types
const input = document.querySelector('#search') as HTMLInputElement
input.value = 'typescript'
input.dispatchEvent(new Event('input', { bubbles: true }))
// Now any listener on 'input' event fires ✅
```

---

## K — Coding Challenge + Solution

### Challenge

Build a `setupCounter()` function that renders a counter with `+` and `-` buttons and a display. Write tests: (1) displays initial count of 0; (2) increments on `+` click; (3) decrements on `-` click; (4) does not go below 0 (min boundary); (5) display updates after both operations.

### Solution

```typescript
// src/counter.ts
export function setupCounter(container: HTMLElement, initial = 0) {
  let count = initial

  container.innerHTML = `
    <button id="decrement">-</button>
    <span id="count">${count}</span>
    <button id="increment">+</button>
  `

  const display   = container.querySelector('#count')!
  const increment = container.querySelector('#increment')!
  const decrement = container.querySelector('#decrement')!

  const update = () => { display.textContent = String(count) }

  increment.addEventListener('click', () => { count++; update() })
  decrement.addEventListener('click', () => { if (count > 0) { count--; update() } })
}

// src/counter.test.ts
import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { setupCounter }                                from './counter'

describe('counter', () => {
  let container: HTMLDivElement

  beforeEach(() => {
    container = document.createElement('div')
    document.body.appendChild(container)
    setupCounter(container)
  })

  afterEach(() => { document.body.innerHTML = '' })

  const getCount = () => container.querySelector('#count')!.textContent
  const clickInc = () => (container.querySelector('#increment') as HTMLButtonElement).click()
  const clickDec = () => (container.querySelector('#decrement') as HTMLButtonElement).click()

  it('displays initial count of 0', () => {
    expect(getCount()).toBe('0')
  })

  it('increments count on + click', () => {
    clickInc()
    expect(getCount()).toBe('1')
  })

  it('decrements count on - click', () => {
    clickInc()
    clickInc()
    clickDec()
    expect(getCount()).toBe('1')
  })

  it('does not decrement below 0', () => {
    clickDec()
    expect(getCount()).toBe('0')
    clickDec()
    expect(getCount()).toBe('0')
  })

  it('display reflects multiple operations in sequence', () => {
    clickInc(); clickInc(); clickInc(); clickDec()
    expect(getCount()).toBe('2')
  })
})
```

---

---

# 4 — Component Behaviour Testing — UI Logic Without a Framework

---

## T — TL;DR

Component behaviour testing focuses on what the component *does* — shows/hides content, updates text, enables/disables buttons — not on implementation details. Write a factory function that sets up DOM and attaches event handlers, then test the observable output. This pattern applies to vanilla JS components and is the foundation for framework component testing.

---

## K — Key Concepts

```typescript
// ── Component factory pattern ─────────────────────────────────────────────
// A function that creates the DOM structure and returns control handles

interface ToastOptions { message: string; type?: 'success' | 'error' | 'info' }
interface ToastHandle  { dismiss: () => void; el: HTMLElement }

export function createToast(
  container: HTMLElement,
  options: ToastOptions
): ToastHandle {
  const toast = document.createElement('div')
  toast.className = `toast toast--${options.type ?? 'info'}`
  toast.setAttribute('role', 'alert')
  toast.innerHTML = `
    <span class="toast__message">${options.message}</span>
    <button class="toast__close" aria-label="Dismiss">×</button>
  `

  const close = toast.querySelector('.toast__close')!
  const dismiss = () => toast.remove()
  close.addEventListener('click', dismiss)

  container.appendChild(toast)
  return { dismiss, el: toast }
}
```

```typescript
// ── Testing observable behaviour ──────────────────────────────────────────
import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { createToast }                                 from './toast'

describe('Toast component', () => {
  let container: HTMLDivElement

  beforeEach(() => {
    container = document.createElement('div')
    document.body.appendChild(container)
  })
  afterEach(() => { document.body.innerHTML = '' })

  it('renders the message', () => {
    createToast(container, { message: 'Saved successfully!' })
    const msg = container.querySelector('.toast__message')
    expect(msg?.textContent).toBe('Saved successfully!')
  })

  it('applies the correct type class', () => {
    createToast(container, { message: 'Error!', type: 'error' })
    const toast = container.querySelector('.toast')
    expect(toast?.classList.contains('toast--error')).toBe(true)
  })

  it('defaults to info type', () => {
    createToast(container, { message: 'Note' })
    expect(container.querySelector('.toast--info')).not.toBeNull()
  })

  it('removes itself from DOM when close button is clicked', () => {
    createToast(container, { message: 'Hello' })
    expect(container.querySelectorAll('.toast')).toHaveLength(1)

    const closeBtn = container.querySelector('.toast__close') as HTMLButtonElement
    closeBtn.click()

    expect(container.querySelectorAll('.toast')).toHaveLength(0)
  })

  it('can be dismissed programmatically', () => {
    const { dismiss } = createToast(container, { message: 'Hi' })
    dismiss()
    expect(container.querySelector('.toast')).toBeNull()
  })

  it('has correct ARIA role for accessibility', () => {
    createToast(container, { message: 'Info' })
    const toast = container.querySelector('[role="alert"]')
    expect(toast).not.toBeNull()
  })
})
```

```typescript
// ── Testing async component state changes ────────────────────────────────
export function createAsyncButton(container: HTMLElement, onClick: () => Promise<void>) {
  container.innerHTML = `
    <button id="action-btn">Submit</button>
    <span id="status"></span>
  `

  const btn    = container.querySelector('#action-btn') as HTMLButtonElement
  const status = container.querySelector('#status')!

  btn.addEventListener('click', async () => {
    btn.disabled = true
    btn.textContent = 'Loading...'
    status.textContent = ''

    try {
      await onClick()
      btn.textContent   = 'Done'
      status.textContent = 'Success!'
    } catch (err) {
      btn.textContent   = 'Submit'
      btn.disabled      = false
      status.textContent = 'Failed. Try again.'
    }
  })
}

describe('async button', () => {
  afterEach(() => { document.body.innerHTML = '' })

  it('disables button during async operation', async () => {
    let resolve!: () => void
    const pending = new Promise<void>(r => { resolve = r })

    const container = document.createElement('div')
    document.body.appendChild(container)
    createAsyncButton(container, () => pending)

    const btn = container.querySelector('#action-btn') as HTMLButtonElement
    btn.click()

    // Immediately after click — button is disabled
    expect(btn.disabled).toBe(true)
    expect(btn.textContent).toBe('Loading...')

    resolve()
    await pending
    await new Promise(r => setTimeout(r, 0))  // flush microtasks

    expect(btn.textContent).toBe('Done')
  })

  it('shows failure state on rejected promise', async () => {
    const container = document.createElement('div')
    document.body.appendChild(container)
    createAsyncButton(container, () => Promise.reject(new Error('fail')))

    const btn    = container.querySelector('#action-btn') as HTMLButtonElement
    const status = container.querySelector('#status')!

    btn.click()
    await new Promise(r => setTimeout(r, 0))

    expect(btn.disabled).toBe(false)
    expect(status.textContent).toBe('Failed. Try again.')
  })
})
```

---

## W — Why It Matters

- Testing component behaviour (not structure) makes tests resilient — a test that asserts `toast--error` class is present tests intent. A test that asserts the full rendered HTML string breaks every time a whitespace or attribute order changes.
- The factory function pattern makes components independently testable — `createToast(container, options)` is a pure function of its inputs. No global state, no singleton, no import side effects. This is the same principle React, Vue, and Solid follow internally.
- Testing async state transitions (disabled/loading/success/error) catches the most common UX bugs — buttons that stay disabled after failure, loading states that never clear, error messages that don't appear.

---

## I — Interview Q&A

### Q: What should you assert in a component behaviour test and what should you avoid asserting?

**A:** Assert observable behaviour — what a user can see or interact with: text content, CSS classes that affect appearance, `hidden`/`disabled` state, ARIA attributes, child elements appearing or disappearing, and event handler effects. Avoid asserting implementation details: internal variable values, private method call counts, exact HTML structure including whitespace, inline style property values that aren't user-visible, or the specific sequence of DOM mutations. The test should break when behaviour changes and not break when implementation is refactored. If you rename an internal CSS class from `toast__inner` to `toast-body` and the test breaks — that test was testing implementation. If you accidentally remove the `role="alert"` and the test breaks — that test was correctly testing behaviour.

---

## C — Common Pitfalls + Fix

### ❌ Asserting exact HTML strings — brittle to any formatting change

```typescript
// ❌ Brittle — breaks if spacing, attributes, or order changes
expect(container.innerHTML).toBe(
  '<div class="toast toast--info"><span class="toast__message">Hi</span></div>'
)
```

**Fix:** Assert specific observable properties:

```typescript
// ✅ Resilient — tests what matters
const toast = container.querySelector('.toast')
expect(toast).not.toBeNull()
expect(toast?.classList.contains('toast--info')).toBe(true)
expect(toast?.querySelector('.toast__message')?.textContent).toBe('Hi')
```

---

## K — Coding Challenge + Solution

### Challenge

Build a `createDropdown(container, items)` component: renders a button "Select..." and a hidden list of items. Clicking the button shows/hides the list. Clicking an item sets the button text to that item's label and hides the list. Write tests for: open/close, item selection updates button text, list hides after selection, ARIA state updates.

### Solution

```typescript
// src/dropdown.ts
export function createDropdown(container: HTMLElement, items: string[]) {
  container.innerHTML = `
    <div class="dropdown">
      <button class="dropdown__toggle" aria-expanded="false" aria-haspopup="listbox">
        Select...
      </button>
      <ul class="dropdown__list" role="listbox" hidden>
        ${items.map(i => `<li class="dropdown__item" role="option" data-value="${i}">${i}</li>`).join('')}
      </ul>
    </div>
  `

  const toggle = container.querySelector('.dropdown__toggle') as HTMLButtonElement
  const list   = container.querySelector('.dropdown__list') as HTMLUListElement

  toggle.addEventListener('click', () => {
    const isOpen = !list.hidden
    list.hidden  = isOpen
    toggle.setAttribute('aria-expanded', String(!isOpen))
  })

  list.addEventListener('click', (e) => {
    const item = (e.target as HTMLElement).closest('.dropdown__item') as HTMLElement
    if (!item) return
    toggle.textContent = item.dataset.value ?? ''
    list.hidden = true
    toggle.setAttribute('aria-expanded', 'false')
  })
}

// src/dropdown.test.ts
import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { createDropdown }                              from './dropdown'

describe('Dropdown component', () => {
  let container: HTMLDivElement

  beforeEach(() => {
    container = document.createElement('div')
    document.body.appendChild(container)
    createDropdown(container, ['Apple', 'Banana', 'Cherry'])
  })
  afterEach(() => { document.body.innerHTML = '' })

  const toggle = () => container.querySelector('.dropdown__toggle') as HTMLButtonElement
  const list   = () => container.querySelector('.dropdown__list') as HTMLUListElement

  it('starts with list hidden', () => {
    expect(list().hidden).toBe(true)
    expect(toggle().getAttribute('aria-expanded')).toBe('false')
  })

  it('opens list on button click', () => {
    toggle().click()
    expect(list().hidden).toBe(false)
    expect(toggle().getAttribute('aria-expanded')).toBe('true')
  })

  it('closes list on second button click', () => {
    toggle().click()
    toggle().click()
    expect(list().hidden).toBe(true)
    expect(toggle().getAttribute('aria-expanded')).toBe('false')
  })

  it('updates button text to selected item', () => {
    toggle().click()
    const banana = container.querySelector('[data-value="Banana"]') as HTMLElement
    banana.click()
    expect(toggle().textContent).toBe('Banana')
  })

  it('hides list after item selection', () => {
    toggle().click()
    const item = container.querySelector('.dropdown__item') as HTMLElement
    item.click()
    expect(list().hidden).toBe(true)
    expect(toggle().getAttribute('aria-expanded')).toBe('false')
  })
})
```

---

---

# 5 — Testing Forms — Input, Submit, Validation Feedback

---

## T — TL;DR

Form testing covers the full cycle: typing into inputs, submitting, seeing validation errors, and confirming successful submissions. Key actions: set `input.value`, dispatch `input`/`change`/`submit` events, assert error messages appear or disappear, confirm the submit handler was called with the right data.

---

## K — Key Concepts

```typescript
// ── Form under test ────────────────────────────────────────────────────────
export function createLoginForm(
  container: HTMLElement,
  onSubmit: (data: { email: string; password: string }) => void
) {
  container.innerHTML = `
    <form id="login-form" novalidate>
      <div>
        <label for="email">Email</label>
        <input id="email" type="email" name="email" required />
        <span class="error" id="email-error" hidden></span>
      </div>
      <div>
        <label for="password">Password</label>
        <input id="password" type="password" name="password" required minlength="8" />
        <span class="error" id="password-error" hidden></span>
      </div>
      <button type="submit" id="submit-btn">Log in</button>
    </form>
  `

  const form     = container.querySelector('#login-form') as HTMLFormElement
  const emailEl  = container.querySelector('#email') as HTMLInputElement
  const passEl   = container.querySelector('#password') as HTMLInputElement
  const emailErr = container.querySelector('#email-error') as HTMLSpanElement
  const passErr  = container.querySelector('#password-error') as HTMLSpanElement

  form.addEventListener('submit', (e) => {
    e.preventDefault()
    let valid = true

    if (!emailEl.value || !emailEl.value.includes('@')) {
      emailErr.textContent = 'Please enter a valid email'
      emailErr.hidden = false
      valid = false
    } else {
      emailErr.hidden = true
    }

    if (passEl.value.length < 8) {
      passErr.textContent = 'Password must be at least 8 characters'
      passErr.hidden = false
      valid = false
    } else {
      passErr.hidden = true
    }

    if (valid) onSubmit({ email: emailEl.value, password: passEl.value })
  })
}
```

```typescript
// ── Form tests ────────────────────────────────────────────────────────────
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { createLoginForm }                                  from './login-form'

describe('Login form', () => {
  let container: HTMLDivElement
  let mockSubmit: ReturnType<typeof vi.fn>

  beforeEach(() => {
    container  = document.createElement('div')
    mockSubmit = vi.fn()
    document.body.appendChild(container)
    createLoginForm(container, mockSubmit)
  })
  afterEach(() => { document.body.innerHTML = '' })

  // Helpers
  const fill = (id: string, value: string) => {
    const el = container.querySelector(`#${id}`) as HTMLInputElement
    el.value = value
    el.dispatchEvent(new Event('input', { bubbles: true }))
  }
  const submit = () => {
    const form = container.querySelector('#login-form') as HTMLFormElement
    form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }))
  }
  const errorText = (id: string) =>
    (container.querySelector(`#${id}`) as HTMLSpanElement).textContent
  const isErrorHidden = (id: string) =>
    (container.querySelector(`#${id}`) as HTMLSpanElement).hidden

  it('calls onSubmit with valid credentials', () => {
    fill('email', 'mark@example.com')
    fill('password', 'securepass123')
    submit()

    expect(mockSubmit).toHaveBeenCalledOnce()
    expect(mockSubmit).toHaveBeenCalledWith({
      email:    'mark@example.com',
      password: 'securepass123',
    })
  })

  it('shows email error for missing email', () => {
    fill('password', 'securepass123')
    submit()

    expect(isErrorHidden('email-error')).toBe(false)
    expect(errorText('email-error')).toContain('valid email')
    expect(mockSubmit).not.toHaveBeenCalled()
  })

  it('shows password error for short password', () => {
    fill('email', 'mark@example.com')
    fill('password', 'short')
    submit()

    expect(isErrorHidden('password-error')).toBe(false)
    expect(errorText('password-error')).toContain('8 characters')
    expect(mockSubmit).not.toHaveBeenCalled()
  })

  it('shows both errors when both fields are invalid', () => {
    submit()   // no values set
    expect(isErrorHidden('email-error')).toBe(false)
    expect(isErrorHidden('password-error')).toBe(false)
  })

  it('clears errors on valid resubmit after failure', () => {
    submit()  // trigger errors

    fill('email', 'mark@example.com')
    fill('password', 'securepass123')
    submit()  // valid submission

    expect(isErrorHidden('email-error')).toBe(true)
    expect(isErrorHidden('password-error')).toBe(true)
    expect(mockSubmit).toHaveBeenCalledOnce()
  })
})
```

---

## W — Why It Matters

- Testing validation feedback is testing the user experience under error conditions — the state most users encounter when they fill a form incorrectly. Untested validation logic is where regressions hide most often.
- The `novalidate` attribute on the form is important for test control — without it, browser-native validation runs before your JavaScript and may prevent the submit event in unexpected ways (or show browser-native popups jsdom doesn't handle).
- Testing that `onSubmit` is NOT called on invalid input is as important as testing it IS called on valid input — the negative assertion catches the "validation ran but didn't block submission" bug.

---

## I — Interview Q&A

### Q: How do you simulate form submission in a jsdom test?

**A:** Dispatch a `submit` event on the `form` element directly: `form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }))`. This triggers any `addEventListener('submit', ...)` handlers. Include `cancelable: true` so the handler can call `event.preventDefault()` and your test code can check `event.defaultPrevented` if needed. Do not call `form.submit()` — that triggers native browser form navigation which jsdom doesn't support and which bypasses JS event handlers. For tests that need to check what would have been submitted, inspect the values you set on `input.value` directly or what your submit handler mock was called with.

---

## C — Common Pitfalls + Fix

### ❌ Clicking submit button instead of submitting form — may not trigger form handler

```typescript
// ❌ Clicking a submit button doesn't always reliably trigger form submit in jsdom
container.querySelector('#submit-btn')?.click()
// In some jsdom versions, button.click() inside a form dispatches submit; in others it doesn't
```

**Fix:** Dispatch the submit event on the form directly:

```typescript
// ✅ Always reliable
const form = container.querySelector('form') as HTMLFormElement
form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }))
```

---

## K — Coding Challenge + Solution

### Challenge

Create a `createSearchForm(container, onSearch)` with a text input and search button. Validate: input not empty, min 3 characters. Show inline error. Test: valid search calls `onSearch`, short query shows error, empty shows error, correcting error and resubmitting clears error and calls `onSearch`.

### Solution

```typescript
// src/search-form.ts
export function createSearchForm(container: HTMLElement, onSearch: (q: string) => void) {
  container.innerHTML = `
    <form id="search-form">
      <input id="query" type="search" placeholder="Search..." minlength="3" />
      <span id="query-error" class="error" hidden></span>
      <button type="submit">Search</button>
    </form>
  `
  const form  = container.querySelector('#search-form') as HTMLFormElement
  const input = container.querySelector('#query') as HTMLInputElement
  const error = container.querySelector('#query-error') as HTMLSpanElement

  form.addEventListener('submit', (e) => {
    e.preventDefault()
    const q = input.value.trim()
    if (q.length < 3) {
      error.textContent = q.length === 0 ? 'Please enter a search term' : 'Minimum 3 characters'
      error.hidden = false
      return
    }
    error.hidden = true
    onSearch(q)
  })
}

// src/search-form.test.ts
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { createSearchForm }                               from './search-form'

describe('Search form', () => {
  let container: HTMLDivElement
  let mockSearch: ReturnType<typeof vi.fn>

  beforeEach(() => {
    container  = document.createElement('div')
    mockSearch = vi.fn()
    document.body.appendChild(container)
    createSearchForm(container, mockSearch)
  })
  afterEach(() => { document.body.innerHTML = '' })

  const input  = () => container.querySelector('#query') as HTMLInputElement
  const error  = () => container.querySelector('#query-error') as HTMLSpanElement
  const submit = () => {
    const form = container.querySelector('#search-form') as HTMLFormElement
    form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }))
  }

  it('calls onSearch with trimmed query', () => {
    input().value = '  typescript  '
    submit()
    expect(mockSearch).toHaveBeenCalledWith('typescript')
  })

  it('shows error for empty query', () => {
    submit()
    expect(error().hidden).toBe(false)
    expect(error().textContent).toContain('search term')
    expect(mockSearch).not.toHaveBeenCalled()
  })

  it('shows error for query under 3 characters', () => {
    input().value = 'ts'
    submit()
    expect(error().hidden).toBe(false)
    expect(error().textContent).toContain('3 characters')
  })

  it('clears error and calls onSearch after correcting short query', () => {
    input().value = 'ts'
    submit()
    expect(error().hidden).toBe(false)

    input().value = 'typescript'
    submit()
    expect(error().hidden).toBe(true)
    expect(mockSearch).toHaveBeenCalledWith('typescript')
  })
})
```

---

---

# 6 — Browser Mode Setup — Vitest + Real Browser

---

## T — TL;DR

Vitest Browser Mode runs your tests inside a real browser (Chromium, Firefox, or WebKit) using Playwright or WebdriverIO as the provider. Set `browser.enabled: true` in config, install a provider, and your test files run in an actual browser tab — giving you real layout, real CSS, real Web APIs, and real network behaviour. No more jsdom limitations.

---

## K — Key Concepts

```bash
# Install Vitest Browser Mode with Playwright provider
npm install -D @vitest/browser playwright

# Install the browser binaries
npx playwright install chromium
# Or: npx playwright install firefox
# Or: npx playwright install webkit
```

```typescript
// vitest.config.ts — Browser Mode configuration
import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    browser: {
      enabled:  true,
      name:     'chromium',   // 'chromium' | 'firefox' | 'webkit'
      provider: 'playwright', // 'playwright' | 'webdriverio'
      headless: true,         // false = see the browser during tests
    },
    // Note: when browser.enabled = true, environment: 'jsdom' is ignored
    // browser mode uses the real browser as the environment
  }
})
```

```typescript
// ── Separate configs for unit (jsdom) and browser tests ───────────────────
// vitest.config.ts — unit tests
export default defineConfig({
  test: {
    include:     ['src/**/*.unit.test.ts'],
    environment: 'jsdom',
  }
})

// vitest.browser.config.ts — browser tests
export default defineConfig({
  test: {
    include:  ['src/**/*.browser.test.ts'],
    browser: {
      enabled:  true,
      name:     'chromium',
      provider: 'playwright',
      headless: true,
    }
  }
})

// Run unit tests:   npx vitest
// Run browser tests: npx vitest --config vitest.browser.config.ts
```

```typescript
// ── Workspace config — run both simultaneously ─────────────────────────────
// vitest.workspace.ts
import { defineWorkspace } from 'vitest/config'

export default defineWorkspace([
  {
    test: {
      name:        'unit',
      include:     ['src/**/*.test.ts'],
      environment: 'jsdom',
    }
  },
  {
    test: {
      name:    'browser',
      include: ['src/**/*.browser.test.ts'],
      browser: {
        enabled:  true,
        name:     'chromium',
        provider: 'playwright',
        headless: true,
      }
    }
  }
])

// Run: npx vitest --workspace=vitest.workspace.ts
```

```typescript
// ── Browser Mode test file ────────────────────────────────────────────────
// src/layout.browser.test.ts
import { describe, it, expect } from 'vitest'

describe('Real browser environment', () => {
  it('has a real window object', () => {
    expect(typeof window).toBe('object')
    expect(window.navigator.userAgent).toContain('Chrome')  // real browser
  })

  it('getBoundingClientRect returns real dimensions', () => {
    document.body.innerHTML = '<div style="width:200px;height:100px">box</div>'
    const div = document.querySelector('div')!
    const rect = div.getBoundingClientRect()
    // In jsdom this would be 0,0 — in real browser it has dimensions
    expect(typeof rect.width).toBe('number')
  })
})
```

```typescript
// ── @vitest/browser userEvent API ─────────────────────────────────────────
// Browser Mode provides a userEvent helper that simulates real user interactions
import { userEvent } from '@vitest/browser/context'

it('types into an input', async () => {
  document.body.innerHTML = '<input id="name" type="text" />'
  const input = document.querySelector('#name') as HTMLInputElement

  await userEvent.click(input)
  await userEvent.type(input, 'Mark Austin')

  expect(input.value).toBe('Mark Austin')
})

it('clicks a button', async () => {
  document.body.innerHTML = '<button id="btn">Click me</button>'
  const handler = vi.fn()
  document.querySelector('#btn')!.addEventListener('click', handler)

  await userEvent.click(document.querySelector('#btn')!)
  expect(handler).toHaveBeenCalled()
})
```

---

## W — Why It Matters

- Browser Mode gives you `getBoundingClientRect()` with real values — layout-dependent features like tooltips, popovers, scroll-based animations, and sticky headers require real rendering to test correctly. jsdom returns zeros for all geometry.
- The `userEvent` API in Browser Mode dispatches real browser events in the right order — hover → pointerenter → pointerover → mousemove → mousedown → focus → mouseup → click — matching what a human user would produce. Manually dispatching `click` skips all preceding events and may miss hover-state logic.
- Running both jsdom and browser tests in a workspace lets you keep fast unit tests in jsdom and promote specific tests to real browser only when needed — best of both speed and fidelity.

---

## I — Interview Q&A

### Q: What does Vitest Browser Mode provide that jsdom cannot?

**A:** Vitest Browser Mode runs tests in a real browser process (Chromium, Firefox, or WebKit via Playwright). This gives: (1) real layout engine — `getBoundingClientRect()`, `offsetWidth`, `scrollTop` return actual pixel values; (2) real CSS rendering — `getComputedStyle()` returns actual computed values including cascade, specificity, and media queries; (3) real browser APIs — WebGL, WebRTC, Web Workers, Service Workers, IndexedDB, geolocation, camera/microphone APIs; (4) real network — `fetch` hits real endpoints or your dev server; (5) real browser event ordering — pointer events, focus management, scroll, and drag-and-drop fire in the sequence a real user would produce. jsdom is a DOM simulator with no rendering engine — it answers "does the DOM update correctly?" but not "does it look correct?" or "does it behave correctly with CSS?".

---

## C — Common Pitfalls + Fix

### ❌ Using jsdom-style event dispatch in Browser Mode — bypasses real event system

```typescript
// ❌ In Browser Mode, manual dispatchEvent skips browser's event ordering
element.dispatchEvent(new MouseEvent('click', { bubbles: true }))
// Hover states, pointer events, focus management — all skipped ❌
```

**Fix:** Use the `userEvent` API from `@vitest/browser/context`:

```typescript
// ✅ Real user-like interaction
import { userEvent } from '@vitest/browser/context'
await userEvent.click(element)  // triggers full event sequence ✅
```

---

## K — Coding Challenge + Solution

### Challenge

Write a `vitest.workspace.ts` that runs: (1) all `*.test.ts` files in jsdom; (2) all `*.browser.test.ts` in Chromium via Playwright. Write one browser test that: uses `userEvent.type` to fill an input, checks `input.value`, clicks a button that copies input text to a `<p>`, and verifies the `<p>` text.

### Solution

```typescript
// vitest.workspace.ts
import { defineWorkspace } from 'vitest/config'

export default defineWorkspace([
  {
    test: {
      name:        'unit',
      include:     ['src/**/*.test.ts'],
      exclude:     ['src/**/*.browser.test.ts'],
      environment: 'jsdom',
      clearMocks:  true,
      restoreMocks: true,
    }
  },
  {
    test: {
      name:    'browser',
      include: ['src/**/*.browser.test.ts'],
      browser: {
        enabled:  true,
        name:     'chromium',
        provider: 'playwright',
        headless: true,
      }
    }
  }
])
```

```typescript
// src/copy-text.browser.test.ts
import { describe, it, expect, afterEach } from 'vitest'
import { userEvent }                       from '@vitest/browser/context'

function setupCopyText() {
  document.body.innerHTML = `
    <input id="source" type="text" placeholder="Type something" />
    <button id="copy-btn">Copy to output</button>
    <p id="output"></p>
  `
  const input  = document.querySelector('#source') as HTMLInputElement
  const btn    = document.querySelector('#copy-btn') as HTMLButtonElement
  const output = document.querySelector('#output')!

  btn.addEventListener('click', () => {
    output.textContent = input.value
  })
}

describe('copy text component (real browser)', () => {
  afterEach(() => { document.body.innerHTML = '' })

  it('types text and copies to output on button click', async () => {
    setupCopyText()

    const input  = document.querySelector('#source') as HTMLInputElement
    const btn    = document.querySelector('#copy-btn') as HTMLButtonElement
    const output = document.querySelector('#output')!

    await userEvent.click(input)
    await userEvent.type(input, 'Hello Browser Mode')

    expect(input.value).toBe('Hello Browser Mode')

    await userEvent.click(btn)

    expect(output.textContent).toBe('Hello Browser Mode')
  })

  it('clears output when input is empty and copied', async () => {
    setupCopyText()

    const btn    = document.querySelector('#copy-btn') as HTMLButtonElement
    const output = document.querySelector('#output')!

    await userEvent.click(btn)
    expect(output.textContent).toBe('')
  })
})
```

---

---

# 7 — Real Browser Execution — Playwright Provider Deep Dive

---

## T — TL;DR

The Playwright provider for Vitest Browser Mode runs each test file in a fresh browser context (like a new incognito tab). Vitest injects the test runner into the page, executes tests, and streams results back. You get full Playwright `page` access via `vi.importActual`, can screenshot on failure, and can interact with your real dev server or test fixtures. Tests are async by nature — always `await` interactions.

---

## K — Key Concepts

```typescript
// ── How the Playwright provider works ────────────────────────────────────
// 1. Vitest starts a Vite dev server (serves your app + test files)
// 2. Playwright launches a browser
// 3. For each test file: opens a new browser context (isolated)
// 4. Navigates to the Vitest test page (http://localhost:51204/)
// 5. The page loads your test file as an ES module
// 6. Tests run in the browser — DOM, localStorage, fetch are all real
// 7. Results are streamed back to the Vitest process via WebSocket
// 8. Browser context is closed after the file completes (isolation)
```

```typescript
// vitest.config.ts — full Playwright configuration
import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    browser: {
      enabled:     true,
      name:        'chromium',
      provider:    'playwright',
      headless:    true,

      providerOptions: {
        launch: {
          // Playwright LaunchOptions
          slowMo: 0,         // 0 = fast, 500 = slow-mo for debugging
          devtools: false,   // open DevTools automatically
          args: [
            '--no-sandbox',            // needed in some CI environments
            '--disable-dev-shm-usage', // needed in Docker
          ]
        },
        context: {
          // Playwright BrowserContextOptions — per test file
          viewport:       { width: 1280, height: 720 },
          locale:         'en-US',
          timezoneId:     'Asia/Manila',
          permissions:    ['geolocation'],
        }
      }
    }
  }
})
```

```typescript
// ── Accessing the Playwright page object ──────────────────────────────────
// @vitest/browser/context exposes the page for advanced interactions
import { page, userEvent } from '@vitest/browser/context'

it('takes a screenshot on assertion', async () => {
  document.body.innerHTML = '<h1>Hello World</h1>'

  // page is the Playwright Page object
  const screenshot = await page.screenshot()
  expect(screenshot).toBeDefined()
  // screenshot is a Buffer of PNG data
})

it('checks element visibility with Playwright locators', async () => {
  document.body.innerHTML = '<button id="btn" style="display:none">Hidden</button>'

  const btn = page.locator('#btn')
  await expect(btn).not.toBeVisible()   // Playwright's own assertions ✅
})
```

```typescript
// ── Playwright locators vs querySelector ─────────────────────────────────
import { page } from '@vitest/browser/context'

// querySelector — DOM API, synchronous, returns element or null
const el = document.querySelector('#my-button')

// Playwright locator — lazy, retries until found, async
const locator = page.locator('#my-button')
await locator.click()               // waits for element, then clicks
await locator.fill('typed text')    // clears then types
await expect(locator).toBeVisible() // assertion with auto-retry

// When to use locators:
// ✅ Elements that appear asynchronously (after fetch, animation)
// ✅ When you need Playwright's retry/wait behaviour
// Use querySelector:
// ✅ When element is guaranteed present synchronously
```

```typescript
// ── Cross-browser testing ─────────────────────────────────────────────────
// Run against multiple browsers in CI:

// package.json scripts:
// "test:chromium": "vitest --browser.name=chromium",
// "test:firefox":  "vitest --browser.name=firefox",
// "test:webkit":   "vitest --browser.name=webkit",
// "test:browsers": "npm run test:chromium && npm run test:firefox && npm run test:webkit"

// Or use Vitest workspace to run all three in parallel:
// vitest.workspace.ts:
export default defineWorkspace([
  { test: { name: 'chromium', browser: { enabled: true, name: 'chromium', provider: 'playwright', headless: true } } },
  { test: { name: 'firefox',  browser: { enabled: true, name: 'firefox',  provider: 'playwright', headless: true } } },
  { test: { name: 'webkit',   browser: { enabled: true, name: 'webkit',   provider: 'playwright', headless: true } } },
])
```

```typescript
// ── Screenshot on test failure ─────────────────────────────────────────────
import { afterEach } from 'vitest'
import { page }      from '@vitest/browser/context'

afterEach(async (ctx) => {
  if (ctx.task.result?.state === 'fail') {
    await page.screenshot({
      path: `screenshots/${ctx.task.name.replace(/\s+/g, '-')}.png`
    })
  }
})
```

---

## W — Why It Matters

- Each test file getting a fresh browser context is isolation at the browser level — cookies, localStorage, IndexedDB, and service workers from one test file don't bleed into another. This is stricter isolation than jsdom (which shares process globals unless cleaned up).
- The `providerOptions.launch.args` for Docker/CI is not optional — `--no-sandbox` and `--disable-dev-shm-usage` are required for Chromium in containerised environments. Without them, Playwright fails to launch with a cryptic error about sandboxing.
- Screenshots on failure are free debugging information in CI — when a browser test fails in a headless environment, the screenshot shows exactly what the page looked like at the moment of failure. This turns 30-minute debugging sessions into 2-minute fixes.

---

## I — Interview Q&A

### Q: How is isolation provided between test files in Vitest Browser Mode with the Playwright provider?

**A:** Each test file runs in a fresh Playwright browser context — equivalent to a new incognito window. This means localStorage, sessionStorage, IndexedDB, cookies, service worker registrations, and all browser storage are empty and isolated for each file. Within a file, tests share the same context and page, so you must clean up DOM changes in `afterEach` (as with jsdom). The browser process itself is shared across all files for performance, but the context boundary prevents any cross-file state leakage. This is a stronger isolation guarantee than Node.js module caching (where shared modules can hold state) — the browser context is a separate process boundary for web storage.

---

## C — Common Pitfalls + Fix

### ❌ Forgetting `--no-sandbox` in Docker CI — Playwright fails to launch

```bash
# ❌ In Docker without sandbox args:
# Error: Failed to launch chromium because sandbox is not available
# Consider disabling the sandbox
```

**Fix:** Add browser launch args in config:

```typescript
// ✅
providerOptions: {
  launch: {
    args: ['--no-sandbox', '--disable-dev-shm-usage']
  }
}
```

---

## K — Coding Challenge + Solution

### Challenge

Write a browser test using `page.locator` for an element that appears asynchronously (after a 100ms delay simulating a fetch). Test: (1) element is not present initially; (2) element appears after the async operation; (3) element contains the expected text. Use `await expect(locator).toBeVisible()`.

### Solution

```typescript
// src/async-content.browser.test.ts
import { describe, it, expect, afterEach } from 'vitest'
import { page, userEvent }                 from '@vitest/browser/context'

function setupAsyncContent() {
  document.body.innerHTML = `
    <button id="load-btn">Load Content</button>
    <div id="content" hidden></div>
  `

  document.querySelector('#load-btn')!.addEventListener('click', () => {
    setTimeout(() => {
      const content = document.querySelector('#content') as HTMLDivElement
      content.textContent = 'Loaded from server'
      content.hidden = false
    }, 100)
  })
}

describe('async content appearance', () => {
  afterEach(() => { document.body.innerHTML = '' })

  it('content is not visible initially', async () => {
    setupAsyncContent()
    const content = page.locator('#content')
    await expect(content).not.toBeVisible()
  })

  it('content appears after clicking load', async () => {
    setupAsyncContent()

    const btn     = page.locator('#load-btn')
    const content = page.locator('#content')

    await userEvent.click(btn)

    // Playwright locator auto-retries until visible (waits up to default timeout)
    await expect(content).toBeVisible()
    await expect(content).toHaveText('Loaded from server')
  })
})
```

---

---

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

# 9 — Integration-Style Frontend Tests — User Behaviour Flows

---

## T — TL;DR

Integration-style frontend tests exercise multiple components working together through a realistic user journey — fill a form, submit, see a result, navigate to the next step. They test the seams between components rather than each component in isolation. Use jsdom for logic-heavy flows; use Browser Mode when the flow involves layout, real navigation, or multi-step rendering.

---

## K — Key Concepts

```typescript
// ── What an integration-style test covers ────────────────────────────────
// Single component unit test:  "the submit button is disabled when form is empty"
// Integration test:            "user fills checkout form, submits, sees order confirmation"
//                               covers: form validation → submit → async call → result render
```

```typescript
// ── Application under test: a signup flow ────────────────────────────────
// signup.ts — the full flow wired together

export function setupSignupFlow(
  container: HTMLElement,
  api: { register: (email: string, password: string) => Promise<{ userId: string }> }
) {
  container.innerHTML = `
    <div id="signup-view">
      <h1>Create Account</h1>
      <form id="signup-form" novalidate>
        <input id="email"    type="email"    placeholder="Email"    required />
        <input id="password" type="password" placeholder="Password" required minlength="8" />
        <button type="submit" id="signup-btn">Sign Up</button>
        <p id="form-error" class="error" hidden></p>
      </form>
    </div>
    <div id="success-view" hidden>
      <h1>Welcome!</h1>
      <p id="success-msg"></p>
      <button id="go-dashboard">Go to Dashboard</button>
    </div>
  `

  const form        = container.querySelector('#signup-form') as HTMLFormElement
  const emailInput  = container.querySelector('#email') as HTMLInputElement
  const passInput   = container.querySelector('#password') as HTMLInputElement
  const submitBtn   = container.querySelector('#signup-btn') as HTMLButtonElement
  const formError   = container.querySelector('#form-error') as HTMLParagraphElement
  const signupView  = container.querySelector('#signup-view') as HTMLDivElement
  const successView = container.querySelector('#success-view') as HTMLDivElement
  const successMsg  = container.querySelector('#success-msg') as HTMLParagraphElement

  form.addEventListener('submit', async (e) => {
    e.preventDefault()
    formError.hidden = true

    if (!emailInput.value.includes('@')) {
      formError.textContent = 'Invalid email address'
      formError.hidden = false
      return
    }
    if (passInput.value.length < 8) {
      formError.textContent = 'Password too short'
      formError.hidden = false
      return
    }

    submitBtn.disabled    = true
    submitBtn.textContent = 'Creating account...'

    try {
      const { userId } = await api.register(emailInput.value, passInput.value)
      signupView.hidden  = true
      successView.hidden = false
      successMsg.textContent = `Account created! Your ID: ${userId}`
    } catch (err) {
      formError.textContent = (err as Error).message
      formError.hidden      = false
      submitBtn.disabled    = false
      submitBtn.textContent = 'Sign Up'
    }
  })
}
```

```typescript
// ── Integration tests for the signup flow ─────────────────────────────────
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { setupSignupFlow }                                  from './signup'

describe('Signup flow — integration', () => {
  let container: HTMLDivElement
  let mockApi:   { register: ReturnType<typeof vi.fn> }

  beforeEach(() => {
    container = document.createElement('div')
    mockApi   = { register: vi.fn() }
    document.body.appendChild(container)
    setupSignupFlow(container, mockApi)
  })
  afterEach(() => { document.body.innerHTML = ''; vi.clearAllMocks() })

  // ── Helpers ──────────────────────────────────────────────────────────────
  const fill = (id: string, val: string) => {
    const el = container.querySelector(`#${id}`) as HTMLInputElement
    el.value = val
  }
  const submit = () => {
    container.querySelector('#signup-form')!
      .dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }))
  }
  const isHidden = (id: string) =>
    (container.querySelector(`#${id}`) as HTMLElement).hidden

  // ── Journey 1: successful registration ────────────────────────────────
  it('shows success view after successful registration', async () => {
    mockApi.register.mockResolvedValue({ userId: 'usr-abc123' })

    fill('email',    'mark@example.com')
    fill('password', 'securepass')
    submit()

    // During async call: signup view still shown, button disabled
    expect(isHidden('signup-view')).toBe(false)
    const btn = container.querySelector('#signup-btn') as HTMLButtonElement
    expect(btn.disabled).toBe(true)

    // Wait for promise to resolve
    await vi.waitFor(() => expect(isHidden('success-view')).toBe(false))

    expect(isHidden('signup-view')).toBe(true)
    expect(container.querySelector('#success-msg')?.textContent)
      .toContain('usr-abc123')
  })

  // ── Journey 2: validation blocks submission ────────────────────────────
  it('shows validation error without calling API', () => {
    fill('email', 'notanemail')
    fill('password', 'short')
    submit()

    expect(isHidden('form-error')).toBe(false)
    expect(mockApi.register).not.toHaveBeenCalled()
    expect(isHidden('signup-view')).toBe(false)   // still on form
  })

  // ── Journey 3: API error recovery ─────────────────────────────────────
  it('shows API error and re-enables form on failure', async () => {
    mockApi.register.mockRejectedValue(new Error('Email already in use'))

    fill('email',    'taken@example.com')
    fill('password', 'securepass')
    submit()

    await vi.waitFor(() => expect(isHidden('form-error')).toBe(false))

    expect(container.querySelector('#form-error')?.textContent)
      .toBe('Email already in use')

    const btn = container.querySelector('#signup-btn') as HTMLButtonElement
    expect(btn.disabled).toBe(false)           // re-enabled ✅
    expect(btn.textContent).toBe('Sign Up')    // reset ✅
    expect(isHidden('success-view')).toBe(true) // not shown ✅
  })

  // ── Journey 4: correcting validation error and succeeding ─────────────
  it('can succeed after fixing a validation error', async () => {
    mockApi.register.mockResolvedValue({ userId: 'usr-xyz' })

    // First attempt — bad email
    fill('email', 'bad')
    fill('password', 'securepass')
    submit()
    expect(isHidden('form-error')).toBe(false)

    // Fix email and resubmit
    fill('email', 'good@example.com')
    submit()

    await vi.waitFor(() => expect(isHidden('success-view')).toBe(false))
    expect(isHidden('form-error')).toBe(true)
    expect(mockApi.register).toHaveBeenCalledOnce()
  })
})
```

```typescript
// ── vi.waitFor — assert async DOM changes ────────────────────────────────
// vi.waitFor polls until the assertion passes or times out
await vi.waitFor(() => {
  expect(container.querySelector('#success-view')).not.toBeNull()
}, {
  timeout:  2000,  // max wait (default: 1000ms)
  interval: 50,    // polling interval
})
```

---

## W — Why It Matters

- Integration-style tests catch bugs that unit tests miss — a form unit test verifies validation, an API unit test verifies the call, but an integration test catches "the button never re-enables after error" because that state transition requires both to work together.
- `vi.waitFor` is the correct pattern for asserting async DOM changes — instead of arbitrary `setTimeout` delays, `waitFor` polls until the assertion passes. If it never passes, it fails with a clear timeout message after the configured wait period.
- Testing the "recovery journey" (error → fix → succeed) is high-value because it mirrors the most common real user behaviour — most users don't fill forms perfectly on the first attempt.

---

## I — Interview Q&A

### Q: What is the difference between a unit test and an integration-style test for frontend components?

**A:** A unit test tests a single component or function in isolation — mocking all its dependencies, asserting on one thing at a time. A unit test for a form component verifies that validation shows an error message; it doesn't care about what happens after submission. An integration-style test exercises a complete user flow across multiple components — the form, the API client, the result component — working together. It tests the seams: does the form's valid submission actually reach the API client with the right data? Does the API response correctly transition to the success view? Does an error response correctly reset the form state? Integration tests find bugs at the boundaries between components that unit tests can't see because each unit was tested with its dependencies mocked.

---

## C — Common Pitfalls + Fix

### ❌ Using `setTimeout` to wait for async DOM changes — timing-dependent and fragile

```typescript
// ❌ Arbitrary delay — too short on slow CI, wastes time on fast machines
btn.click()
await new Promise(r => setTimeout(r, 500))   // magic number ❌
expect(container.querySelector('#success')).not.toBeNull()
```

**Fix:** Use `vi.waitFor` to poll until the assertion passes:

```typescript
// ✅ Polls every 50ms until passes or times out
btn.click()
await vi.waitFor(
  () => expect(container.querySelector('#success')).not.toBeNull(),
  { timeout: 2000 }
)
```

---

## K — Coding Challenge + Solution

### Challenge

Build a `setupProductSearch(container, api)` flow: renders a search input + button, calls `api.search(query)` on submit, shows a loading state, renders results as a list, or shows "No results" if empty, or shows an error message on failure. Write integration tests for: loading state, success with results, empty results, API error.

### Solution

```typescript
// src/product-search.ts
export function setupProductSearch(
  container: HTMLElement,
  api: { search: (q: string) => Promise<{ id: string; name: string }[]> }
) {
  container.innerHTML = `
    <form id="search-form">
      <input id="search-input" type="search" placeholder="Search products" />
      <button type="submit" id="search-btn">Search</button>
    </form>
    <div id="loading" hidden>Searching...</div>
    <ul id="results" hidden></ul>
    <p id="no-results" hidden>No results found.</p>
    <p id="search-error" hidden></p>
  `

  const form     = container.querySelector('#search-form')!
  const input    = container.querySelector('#search-input') as HTMLInputElement
  const btn      = container.querySelector('#search-btn') as HTMLButtonElement
  const loading  = container.querySelector('#loading') as HTMLElement
  const results  = container.querySelector('#results') as HTMLUListElement
  const noResult = container.querySelector('#no-results') as HTMLElement
  const errorEl  = container.querySelector('#search-error') as HTMLElement

  form.addEventListener('submit', async (e) => {
    e.preventDefault()
    const query = input.value.trim()
    if (!query) return

    btn.disabled  = true
    loading.hidden = false
    results.hidden = noResult.hidden = errorEl.hidden = true
    results.innerHTML = ''

    try {
      const items = await api.search(query)
      loading.hidden = true
      btn.disabled   = false

      if (items.length === 0) {
        noResult.hidden = false
      } else {
        results.innerHTML = items.map(i =>
          `<li class="result-item" data-id="${i.id}">${i.name}</li>`
        ).join('')
        results.hidden = false
      }
    } catch (err) {
      loading.hidden = true
      btn.disabled   = false
      errorEl.textContent = (err as Error).message
      errorEl.hidden      = false
    }
  })
}

// src/product-search.test.ts
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { setupProductSearch }                               from './product-search'

describe('Product search flow', () => {
  let container: HTMLDivElement
  let mockApi: { search: ReturnType<typeof vi.fn> }

  beforeEach(() => {
    container = document.createElement('div')
    mockApi   = { search: vi.fn() }
    document.body.appendChild(container)
    setupProductSearch(container, mockApi)
  })
  afterEach(() => { document.body.innerHTML = ''; vi.clearAllMocks() })

  const input  = () => container.querySelector('#search-input') as HTMLInputElement
  const submit = () => container.querySelector('#search-form')!
    .dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }))
  const isHidden = (id: string) => (container.querySelector(`#${id}`) as HTMLElement).hidden

  it('shows loading state immediately after submit', async () => {
    let resolve!: (v: { id: string; name: string }[]) => void
    mockApi.search.mockReturnValue(new Promise(r => { resolve = r }))

    input().value = 'keyboard'
    submit()

    expect(isHidden('loading')).toBe(false)
    expect((container.querySelector('#search-btn') as HTMLButtonElement).disabled).toBe(true)

    resolve([])  // resolve to avoid hanging
    await vi.waitFor(() => expect(isHidden('loading')).toBe(true))
  })

  it('renders results on successful search', async () => {
    mockApi.search.mockResolvedValue([
      { id: 'p1', name: 'Mechanical Keyboard' },
      { id: 'p2', name: 'Wireless Keyboard' },
    ])

    input().value = 'keyboard'
    submit()

    await vi.waitFor(() => expect(isHidden('results')).toBe(false))

    const items = container.querySelectorAll('.result-item')
    expect(items).toHaveLength(2)
    expect(items[0].textContent).toBe('Mechanical Keyboard')
    expect(isHidden('loading')).toBe(true)
  })

  it('shows no results message for empty response', async () => {
    mockApi.search.mockResolvedValue([])
    input().value = 'xyznothing'
    submit()

    await vi.waitFor(() => expect(isHidden('no-results')).toBe(false))
    expect(isHidden('results')).toBe(true)
  })

  it('shows error message on API failure', async () => {
    mockApi.search.mockRejectedValue(new Error('Search service unavailable'))
    input().value = 'keyboard'
    submit()

    await vi.waitFor(() => expect(isHidden('search-error')).toBe(false))
    expect(container.querySelector('#search-error')?.textContent)
      .toBe('Search service unavailable')
    expect(isHidden('results')).toBe(true)
    expect(isHidden('loading')).toBe(true)
  })
})
```

---

## ✅ Day 3 Complete — DOM and Browser Testing

| # | Subtopic | Status |
|---|----------|--------|
| 1 | jsdom Fundamentals | ☐ |
| 2 | happy-dom Tradeoffs | ☐ |
| 3 | DOM Interaction Testing | ☐ |
| 4 | Component Behaviour Testing | ☐ |
| 5 | Testing Forms | ☐ |
| 6 | Browser Mode Setup | ☐ |
| 7 | Real Browser Execution — Playwright Provider | ☐ |
| 8 | Simulated vs Real Browser | ☐ |
| 9 | Integration-Style Frontend Tests | ☐ |

---

## 🗺️ One-Page Mental Model — Day 3

```
jsdom / happy-dom
  environment: 'jsdom' or 'happy-dom' in vitest.config.ts
  @vitest-environment jsdom  ← per-file override (docblock)
  Provides: window, document, HTMLElement, events, localStorage
  No layout engine → getBoundingClientRect() = zeros
  No CSS rendering → getComputedStyle() unreliable
  Fresh instance per test FILE, persists within file → afterEach cleanup
  afterEach(() => { document.body.innerHTML = '' })  ← always do this
  happy-dom: 2–4x faster, built-in fetch, fewer edge cases
  jsdom: more W3C compliant, more mature — fallback for gaps

DOM INTERACTIONS
  Query:  getElementById, querySelector, querySelectorAll
  Act:    element.click(), dispatchEvent(new Event('input', { bubbles: true }))
  Set:    input.value = 'x' then dispatchEvent (value change doesn't auto-fire event)
  Assert: textContent, classList.contains, .hidden, getAttribute, .disabled
  bubbles: true — required for most real-world event propagation
  Prefer data-testid or role selectors over CSS class selectors

COMPONENT BEHAVIOUR
  Factory function pattern: createComponent(container, options) → handle
  Test: what changed in the DOM / ARIA / state — not internal variables
  Async state: disabled → loading → success/error flow
  vi.fn() for callbacks injected into components
  afterEach cleanup → fresh DOM per test

FORMS
  Set input.value + dispatchEvent(new Event('input', { bubbles: true }))
  Submit: form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }))
  NOT: button.click() for submit (unreliable in jsdom)
  Test: valid → onSubmit called, invalid → error shown, not called
  Test recovery: fix error → resubmit → error cleared, onSubmit called

BROWSER MODE
  browser.enabled: true + provider: 'playwright' in vitest.config.ts
  npm install -D @vitest/browser playwright + npx playwright install chromium
  headless: true for CI, false for debugging
  Docker: args: ['--no-sandbox', '--disable-dev-shm-usage']
  Fresh browser CONTEXT per test FILE (isolated localStorage, cookies)
  userEvent from @vitest/browser/context → real event sequences
  page.locator() → Playwright locator (auto-retry until found)
  await expect(locator).toBeVisible() → Playwright assertions with retry
  Screenshots: page.screenshot() + afterEach on failure

SIMULATED vs REAL BROWSER
  jsdom: DOM logic, events, forms, component state → fast, CI-friendly
  Browser Mode: layout, CSS, geometry, real APIs, cross-browser → slow, necessary
  Rule: start in jsdom, graduate to Browser Mode when jsdom gives wrong answers
  Naming: *.test.ts (pure), *.dom.test.ts (jsdom), *.browser.test.ts (Browser Mode)
  Ratio: ~70% unit, ~25% jsdom, ~5% Browser Mode

INTEGRATION TESTS
  Test user journeys, not isolated units
  Use vi.waitFor() to assert async DOM changes (not setTimeout)
  Test: happy path + validation + error recovery + re-attempt
  Mock the API boundary (vi.fn()) — keep DOM logic real
  Coverage target: critical user flows (signup, checkout, search)

KEY TOOLS
  vi.waitFor(fn, { timeout, interval })  ← poll until assertion passes
  userEvent.click(el)                    ← real click sequence (Browser Mode)
  userEvent.type(input, 'text')          ← real typing (Browser Mode)
  page.locator('#id')                    ← Playwright locator
  page.screenshot()                      ← capture state on failure
```

> **Your next action:** Open any form or button handler in your project. Write one DOM test: set `innerHTML`, fire a click, assert one thing changed. Run it with `npx vitest`. Green in under 30 seconds.

> "Doing one small thing beats opening a feed."