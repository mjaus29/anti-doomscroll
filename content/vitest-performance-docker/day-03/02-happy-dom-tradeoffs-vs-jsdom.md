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
