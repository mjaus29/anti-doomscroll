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
