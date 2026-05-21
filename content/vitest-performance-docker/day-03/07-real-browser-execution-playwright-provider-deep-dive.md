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
