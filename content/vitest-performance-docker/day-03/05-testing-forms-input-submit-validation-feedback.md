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
