# 7 — Real Browser Execution — Playwright Provider Deep Dive

---

## T — TL;DR

The Playwright provider for Vitest Browser Mode runs each test file in a fresh browser context (like a new incognito tab). Vitest injects the test runner into the page, executes tests, and streams results back. You get Vitest's own `page` API (locators, screenshots, viewport) by importing from `vitest/browser` — it is not the raw Playwright `Page`, which lives on the server side and is only reachable through custom commands. You can screenshot on failure, and can interact with your real dev server or test fixtures. Tests are async by nature — always `await` interactions.

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
import { playwright } from '@vitest/browser-playwright'   // Vitest 4

export default defineConfig({
  test: {
    browser: {
      enabled:     true,
      headless:    true,              // set here, NOT in launchOptions (Vitest ignores launch.headless)
      instances:   [{ browser: 'chromium' }],
      provider: playwright({
        // Playwright LaunchOptions (was providerOptions.launch before Vitest 4)
        launchOptions: {
          slowMo: 0,         // 0 = fast, 500 = slow-mo for debugging
          args: [
            '--no-sandbox',            // needed in some CI environments
            '--disable-dev-shm-usage', // needed in Docker
          ]
        },
        // Playwright BrowserContextOptions — per test file (was providerOptions.context)
        contextOptions: {
          viewport:       { width: 1280, height: 720 },
          locale:         'en-US',
          timezoneId:     'Asia/Manila',
          permissions:    ['geolocation'],
        }
      }),
    }
  }
})
```

```typescript
// ── Vitest's `page` object (browser-side API) ─────────────────────────────
// 'vitest/browser' exposes `page` and `userEvent` (before Vitest 4: '@vitest/browser/context').
// `page` is NOT the Playwright Page — Playwright runs on the server; `page` is Vitest's
// browser-side API with Playwright-like helpers (getByRole, getByText, screenshot, viewport...).
import { page, userEvent } from 'vitest/browser'

it('takes a screenshot', async () => {
  document.body.innerHTML = '<h1>Hello World</h1>'

  const path = await page.screenshot()   // resolves to the saved screenshot's file path
  expect(path).toBeDefined()
})

it('checks element visibility with locators', async () => {
  document.body.innerHTML = '<button style="display:none">Hidden</button>'

  const btn = page.getByRole('button', { name: 'Hidden', includeHidden: true })
  await expect.element(btn).not.toBeVisible()   // expect.element retries until the assertion passes ✅
})
```

```typescript
// ── Locators vs querySelector ─────────────────────────────────────────────
import { page } from 'vitest/browser'

// querySelector — DOM API, synchronous, returns element or null
const el = document.querySelector('#my-button')

// Vitest locator — lazy, retries until found, async
const locator = page.getByRole('button', { name: 'Save' })
await locator.click()                                  // waits for element, then clicks
await page.getByLabelText('Name').fill('typed text')   // clears then types
await expect.element(locator).toBeVisible()            // assertion with auto-retry

// When to use locators:
// ✅ Elements that appear asynchronously (after fetch, animation)
// ✅ When you need Playwright's retry/wait behaviour
// Use querySelector:
// ✅ When element is guaranteed present synchronously
```

```typescript
// ── Cross-browser testing ─────────────────────────────────────────────────
// Run against multiple browsers in CI:

// Vitest 4: list one entry per browser in `browser.instances` and they run in parallel.
// (Before Vitest 4 you used `name: 'chromium'` plus one workspace entry per browser.)
// vitest.config.ts:
import { playwright } from '@vitest/browser-playwright'

export default defineConfig({
  test: {
    browser: {
      enabled:   true,
      headless:  true,
      provider:  playwright(),
      instances: [
        { browser: 'chromium' },
        { browser: 'firefox' },
        { browser: 'webkit' },
      ],
    },
  },
})
```

```typescript
// ── Screenshot on test failure ─────────────────────────────────────────────
import { afterEach } from 'vitest'
import { page }      from 'vitest/browser'

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
- The `launchOptions.args` for Docker/CI (`providerOptions.launch.args` before Vitest 4) is not optional — `--no-sandbox` and `--disable-dev-shm-usage` are required for Chromium in containerised environments. Without them, Playwright fails to launch with a cryptic error about sandboxing.
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

**Fix:** Add browser launch args in config (`launchOptions` on the `playwright()` provider):

```typescript
// ✅
provider: playwright({
  launchOptions: {
    args: ['--no-sandbox', '--disable-dev-shm-usage']
  }
})
```

---

## K — Coding Challenge + Solution

### Challenge

Write a browser test using Vitest locators (`page.getByTestId`) for an element that appears asynchronously (after a 100ms delay simulating a fetch). Test: (1) element is not present initially; (2) element appears after the async operation; (3) element contains the expected text. Use `await expect.element(locator).toBeVisible()`.

### Solution

```typescript
// src/async-content.browser.test.ts
import { describe, it, expect, afterEach } from 'vitest'
import { page, userEvent }                 from 'vitest/browser'

function setupAsyncContent() {
  document.body.innerHTML = `
    <button id="load-btn">Load Content</button>
    <div id="content" data-testid="content" hidden></div>
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
    const content = page.getByTestId('content')
    await expect.element(content).not.toBeVisible()
  })

  it('content appears after clicking load', async () => {
    setupAsyncContent()

    const btn     = page.getByRole('button', { name: 'Load Content' })
    const content = page.getByTestId('content')

    await userEvent.click(btn)

    // expect.element auto-retries until the assertion passes (up to the default timeout)
    await expect.element(content).toBeVisible()
    await expect.element(content).toHaveTextContent('Loaded from server')
    // Vitest 5: toHaveTextContent is strict equality and no longer takes a regex;
    // use toMatchTextContent(/Loaded/) for partial or regex matches.
    // Locators also match exactly by default (browser.locators.exact: false restores partial matching).
  })
})
```

---

---
