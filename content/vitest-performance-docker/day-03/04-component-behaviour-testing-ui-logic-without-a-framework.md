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
