# 2 — `errors` — Field, Nested, and Root Errors

---

## T — TL;DR

`formState.errors` is a nested object mirroring your form's field structure. Each field's error has `type` (which rule failed) and `message` (your custom string). Nested fields use dot-notation access. `errors.root` holds non-field server errors.

---

## K — Key Concepts

```tsx
// ─── FieldError shape
type FieldError = {
  type:    string  // 'required' | 'minLength' | 'pattern' | 'validate' | 'server'
  message: string  // your message string from register() or setError()
  ref?:    Element // the DOM element (for focus)
}

// ─── Accessing errors
const { formState: { errors } } = useForm<LoginForm>()

errors.email?.message    // 'Email is required'
errors.email?.type       // 'required'
errors.password?.message // 'Min 8 characters'

// ─── Nested object fields
type ProfileForm = {
  address: { street: string; city: string }
}
errors.address?.street?.message
errors.address?.city?.message

// ─── Array fields (useFieldArray — Day 3)
// errors.items?.[0]?.name?.message

// ─── Root error (server-level, not tied to a field)
errors.root?.message          // 'Invalid credentials'
errors.root?.serverError?.message // named root errors
```

```tsx
// ─── Rendering errors — three patterns

// Pattern 1: inline (most common)
<input {...register('email', { required: 'Required' })} />
{errors.email && <p className="text-xs text-red-600">{errors.email.message}</p>}

// Pattern 2: error component
function FieldError({ name }: { name: string }) {
  const { formState: { errors } } = useFormContext()
  const error = errors[name as keyof typeof errors] as FieldError | undefined
  return error ? (
    <p role="alert" className="text-xs text-red-600 mt-1">{error.message}</p>
  ) : null
}

// Pattern 3: criteriaMode: 'all' — multiple errors per field
useForm({ criteriaMode: 'all' })
// errors.password?.types?.minLength  → 'Min 8 chars'
// errors.password?.types?.pattern    → 'Must include a number'
{errors.password?.types && Object.values(errors.password.types).map((msg, i) => (
  <p key={i} className="text-xs text-red-600">{msg as string}</p>
))}
```

---

## W — Why It Matters

- `errors.root` is the correct place for API error responses that aren't tied to a specific field (e.g. "Account suspended", "Service unavailable") — keeps error state inside RHF rather than a parallel `useState`.
- `criteriaMode: 'all'` is useful for password-strength UIs where you want to show all failing rules simultaneously ("needs 8 chars", "needs a number") rather than one at a time.
- Accessing `errors` from `formState` without spreading keeps the Proxy subscription narrow — only re-renders when errors actually change.

---

## I — Interview Q&A

### Q: How do you show all validation errors for a single field at once in RHF?

**A:** Set `criteriaMode: 'all'` in `useForm`. This collects every failing rule for a field instead of stopping at the first. Access them via `errors.fieldName.types` — an object where keys are rule names (`minLength`, `pattern`, etc.) and values are the error messages. Render all entries by iterating `Object.values(errors.fieldName.types)`.

---

## C — Common Pitfalls + Fix

### ❌ Using `errors.field.message` without optional chaining — crashes when no error

```tsx
// ❌ TypeError when no error exists
<p>{errors.email.message}</p>
```

**Fix:** Use optional chaining or conditional rendering:

```tsx
// ✅ Safe access
{errors.email && <p>{errors.email.message}</p>}
// or
<p>{errors.email?.message}</p>
```

---

## K — Coding Challenge + Solution

### Challenge

Build a password field using `criteriaMode: 'all'` with 3 rules: min 8 chars, at least one uppercase, at least one number. Show all failing rules simultaneously as a checklist.

### Solution

```tsx
'use client'
import { useForm } from 'react-hook-form'

type F = { password: string }

export function PasswordStrengthForm() {
  const { register, handleSubmit, formState: { errors } } = useForm<F>({
    criteriaMode: 'all',
    mode: 'onChange'
  })

  const rules = [
    { key: 'minLength', label: 'At least 8 characters' },
    { key: 'uppercase', label: 'At least one uppercase letter' },
    { key: 'number',    label: 'At least one number' }
  ]

  return (
    <form onSubmit={handleSubmit(console.log)} className="space-y-3 max-w-xs">
      <input
        {...register('password', {
          minLength: { value: 8, message: 'At least 8 characters' },
          validate: {
            uppercase: v => /[A-Z]/.test(v) || 'At least one uppercase letter',
            number:    v => /\d/.test(v)     || 'At least one number'
          }
        })}
        type="password" placeholder="Password"
        className="w-full border rounded-lg px-3 py-2 text-sm"
      />
      <ul className="space-y-1">
        {rules.map(r => {
          const failing = errors.password?.types?.[r.key]
          return (
            <li key={r.key} className={`text-xs flex items-center gap-1.5
              ${failing ? 'text-red-600' : 'text-green-600'}`}>
              <span>{failing ? '✗' : '✓'}</span>
              {r.label}
            </li>
          )
        })}
      </ul>
      <button type="submit"
              className="w-full py-2 bg-blue-600 text-white rounded-lg text-sm font-semibold">
        Submit
      </button>
    </form>
  )
}
```

---

---
