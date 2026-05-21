# 7 — Testing Strategies — What to Test in RHF + Zod Forms

---

## T — TL;DR

Test three layers: **schema** (pure unit tests), **form behaviour** (interaction tests with `@testing-library/react`), and **submit integration** (mocked API). Don't test RHF internals — test what the user experiences: errors appear, submit fires, values reach the handler.

---

## K — Key Concepts

```ts
// ─── Layer 1: Schema unit tests (fast, no DOM)
import { describe, it, expect } from 'vitest'
import { LoginSchema }          from './schema'

describe('LoginSchema', () => {
  it('accepts valid credentials', () => {
    const result = LoginSchema.safeParse({ email: 'a@a.com', password: 'Password1' })
    expect(result.success).toBe(true)
  })

  it('rejects invalid email', () => {
    const result = LoginSchema.safeParse({ email: 'not-email', password: 'Password1' })
    expect(result.success).toBe(false)
    const paths = result.error!.issues.map(i => i.path[0])
    expect(paths).toContain('email')
  })

  it('rejects short password', () => {
    const result = LoginSchema.safeParse({ email: 'a@a.com', password: 'abc' })
    expect(result.success).toBe(false)
    expect(result.error!.issues[0].message).toBe('Min 8 characters')
  })

  it('cross-field: rejects mismatched passwords', () => {
    const result = SignupSchema.safeParse({
      password: 'Password1!', confirm: 'Different1!'
    })
    expect(result.success).toBe(false)
    expect(result.error!.issues[0].path).toContain('confirm')
  })
})
```

```tsx
// ─── Layer 2: Form behaviour tests (user interactions)
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent                               from '@testing-library/user-event'
import { LoginForm }                           from './login-form'

describe('LoginForm', () => {
  it('shows email error on invalid input + blur', async () => {
    render(<LoginForm />)
    const emailInput = screen.getByLabelText(/email/i)
    await userEvent.type(emailInput, 'not-valid')
    await userEvent.tab()  // trigger onBlur
    await waitFor(() =>
      expect(screen.getByRole('alert')).toHaveTextContent('Invalid email')
    )
  })

  it('calls onSubmit with valid data', async () => {
    const onSubmit = vi.fn()
    render(<LoginForm onSubmit={onSubmit} />)
    await userEvent.type(screen.getByLabelText(/email/i),    'a@a.com')
    await userEvent.type(screen.getByLabelText(/password/i), 'Password1')
    await userEvent.click(screen.getByRole('button', { name: /sign in/i }))
    await waitFor(() =>
      expect(onSubmit).toHaveBeenCalledWith({ email: 'a@a.com', password: 'Password1' })
    )
  })

  it('does not submit with empty fields', async () => {
    const onSubmit = vi.fn()
    render(<LoginForm onSubmit={onSubmit} />)
    await userEvent.click(screen.getByRole('button', { name: /sign in/i }))
    await waitFor(() => expect(onSubmit).not.toHaveBeenCalled())
    expect(screen.getAllByRole('alert')).toHaveLength(2)  // 2 errors
  })
})
```

```ts
// ─── What to test checklist

// Schema tests (unit):
// ✅ Valid data passes
// ✅ Each required field rejects when missing
// ✅ Each format rule rejects on invalid format
// ✅ Cross-field rules produce errors on correct paths
// ✅ Defaults are applied (role: 'viewer', active: true)
// ✅ Transforms produce expected output (coercion, slugify)

// Form behaviour tests (integration):
// ✅ Error messages appear for invalid input
// ✅ Error messages disappear when fixed
// ✅ Submit button disabled when isSubmitting
// ✅ onSubmit called with correct data shape
// ✅ Reset clears the form
// ✅ Edit form loads defaultValues (check input values)
// ✅ Conditional fields appear/disappear correctly
// ✅ Field array append/remove works

// What NOT to test:
// ❌ RHF internals (isDirty implementation)
// ❌ Zod's own validation logic (it's already tested)
// ❌ Tailwind classes
```

---

## W — Why It Matters

- Testing the Zod schema separately from the form component is fast and exhaustive — schema tests run in milliseconds, no DOM needed. Cover every edge case at the schema level; form tests verify only that errors surface in the UI.
- `role="alert"` on error messages makes them queryable with `screen.getByRole('alert')` — a semantic selector that mirrors what screen readers announce, so the test doubles as an accessibility check.
- Testing `onSubmit` is called with the correct shape (post-transform, post-coercion) verifies the full pipeline — Zod coerced `"25"` to `25`, transforms ran, schema validated — one assertion covers all of it.

---

## I — Interview Q&A

### Q: How do you structure tests for a form with complex Zod validation?

**A:** Two layers. First, pure schema unit tests — import the Zod schema and call `safeParse` with valid, invalid, and edge-case inputs. Check `success`, `error.issues[].path`, and `error.issues[].message`. These are fast and exhaustive. Second, component integration tests — render the form, simulate user interactions with `userEvent`, and assert what the user sees (`screen.getByRole('alert')` for errors). Assert `onSubmit` is called with the correct typed data. Don't duplicate schema edge cases in component tests — the schema tests already cover them. Component tests focus on: errors appear in the UI, submit calls the handler, conditional fields render, and async interactions work.

---

## C — Common Pitfalls + Fix

### ❌ Using `fireEvent.change` instead of `userEvent.type` — skips validation events

```tsx
// ❌ fireEvent.change doesn't trigger onBlur or intermediate events
// Zod validation with mode: 'onTouched' never fires
fireEvent.change(input, { target: { value: 'test' } })
await waitFor(() => expect(screen.queryByRole('alert')).toBeNull())
// No error shown — onBlur never triggered ❌
```

**Fix:** Use `userEvent` which simulates real user interactions:

```tsx
// ✅ userEvent.type triggers keydown, input, keyup, change events
// .tab() triggers onBlur — matches real browser behaviour
await userEvent.type(input, 'test')
await userEvent.tab()
await waitFor(() => expect(screen.getByRole('alert')).toBeInTheDocument())
```

---

## K — Coding Challenge + Solution

### Challenge

Write Vitest tests for a `ContactSchema` (name min 2, email valid, message min 10). Test: valid passes, invalid email fails on `email` path, short message fails on `message` path, empty name fails with `required_error`. No DOM needed.

### Solution

```ts
// contact.test.ts
import { describe, it, expect } from 'vitest'
import { z }                    from 'zod'

const ContactSchema = z.object({
  name:    z.string({ required_error: 'Name is required' }).min(2, 'Min 2 characters'),
  email:   z.string({ required_error: 'Email is required' }).email('Invalid email'),
  message: z.string({ required_error: 'Message is required' }).min(10, 'Min 10 characters')
})

describe('ContactSchema', () => {
  it('accepts valid input', () => {
    const r = ContactSchema.safeParse({ name: 'Mark', email: 'a@a.com', message: 'Hello there!' })
    expect(r.success).toBe(true)
    expect(r.data?.name).toBe('Mark')
  })

  it('rejects invalid email', () => {
    const r = ContactSchema.safeParse({ name: 'Mark', email: 'not-email', message: 'Hello there!' })
    expect(r.success).toBe(false)
    const emailIssue = r.error!.issues.find(i => i.path[0] === 'email')
    expect(emailIssue?.message).toBe('Invalid email')
  })

  it('rejects message shorter than 10 chars', () => {
    const r = ContactSchema.safeParse({ name: 'Mark', email: 'a@a.com', message: 'Hi' })
    expect(r.success).toBe(false)
    const msgIssue = r.error!.issues.find(i => i.path[0] === 'message')
    expect(msgIssue?.message).toBe('Min 10 characters')
  })

  it('uses required_error when name is undefined', () => {
    const r = ContactSchema.safeParse({ email: 'a@a.com', message: 'Hello there!' })
    expect(r.success).toBe(false)
    const nameIssue = r.error!.issues.find(i => i.path[0] === 'name')
    expect(nameIssue?.message).toBe('Name is required')
  })

  it('collects all errors on empty submit', () => {
    const r = ContactSchema.safeParse({})
    expect(r.success).toBe(false)
    expect(r.error!.issues).toHaveLength(3)
    const paths = r.error!.issues.map(i => i.path[0])
    expect(paths).toContain('name')
    expect(paths).toContain('email')
    expect(paths).toContain('message')
  })
})
```

---

---
