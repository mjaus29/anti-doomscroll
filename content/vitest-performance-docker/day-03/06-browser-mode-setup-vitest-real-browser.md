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
