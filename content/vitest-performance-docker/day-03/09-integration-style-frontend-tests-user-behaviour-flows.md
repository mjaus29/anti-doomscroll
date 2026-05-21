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
