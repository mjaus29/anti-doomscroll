# 4 — `watch` — Reactive Value Subscription

---

## T — TL;DR

`watch('field')` returns the current value of a field and **re-renders the component on every change**. Use it for conditional UI that depends on field values. Use sparingly — each `watch` call opts that field into per-keystroke re-renders.

---

## K — Key Concepts

```tsx
const { watch } = useForm<T>()

// ─── Single field — re-renders on every change to 'role'
const role = watch('role')

// ─── Multiple fields — re-renders when EITHER changes
const [country, state] = watch(['country', 'state'])

// ─── All fields — re-renders on ANY change (expensive)
const allValues = watch()

// ─── With defaultValue (before first render)
const role = watch('role', 'user')  // 'user' if field not yet registered

// ─── Callback subscription — does NOT cause re-render
// Useful for side effects (e.g. trigger validation on another field)
useEffect(() => {
  const subscription = watch((value, { name, type }) => {
    // value = current form values snapshot
    // name  = which field changed
    // type  = 'change' | undefined
    if (name === 'password') trigger('confirmPassword')
  })
  return () => subscription.unsubscribe()
}, [watch, trigger])
```

```tsx
// ─── Conditional field based on watch
type F = { hasCompany: boolean; companyName: string }

function SignupForm() {
  const { register, watch } = useForm<F>()
  const hasCompany = watch('hasCompany')

  return (
    <form className="space-y-3">
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" {...register('hasCompany')} />
        I represent a company
      </label>
      {hasCompany && (
        <input {...register('companyName', { required: 'Company name required' })}
               placeholder="Company name"
               className="w-full border rounded-lg px-3 py-2 text-sm" />
      )}
    </form>
  )
}
```

---

## W — Why It Matters

- Conditional fields are the most common use case for `watch` — "show address line 2 if checked", "show company fields if account type is Business". This requires reactive access to a field value.
- The **callback version** of `watch` (`watch((value, { name }) => ...)`) does not cause re-renders — it fires as a side effect. Use this for cross-field validation triggers, debounced API calls, or analytics without paying a render cost.
- Watching all fields (`watch()`) in a large form can cause hundreds of re-renders per second. Profile before adding this pattern.

---

## I — Interview Q&A

### Q: What is the difference between the return-value form and the callback form of `watch`?

**A:** `const value = watch('field')` returns the current value and subscribes the component to re-render on every change to that field. The callback form `watch((values, { name }) => sideEffect())` fires on every change but returns an unsubscribable object — it doesn't cause re-renders. Use the return-value form for conditional JSX that must update in real time. Use the callback form for side effects like triggering cross-field validation, logging, or debounced API calls where you need the value but don't need to show it in the UI.

---

## C — Common Pitfalls + Fix

### ❌ Using `watch()` (all fields) for a single conditional

```tsx
// ❌ Watches EVERYTHING — re-renders the whole form on every keystroke
const values = watch()
const show   = values.hasCompany
```

**Fix:** Watch only the specific field:

```tsx
// ✅ Only re-renders when hasCompany changes
const hasCompany = watch('hasCompany')
```

---

## K — Coding Challenge + Solution

### Challenge

Build a shipping form where: selecting "Express" shows a `note` text field; the callback form of `watch` logs `{ name, type }` on every change to the console (side effect, no re-render).

### Solution

```tsx
'use client'
import { useEffect } from 'react'
import { useForm }   from 'react-hook-form'

type F = { shipping: string; note: string }

export function ShippingForm() {
  const { register, handleSubmit, watch } = useForm<F>({
    defaultValues: { shipping: 'standard', note: '' }
  })

  const shipping = watch('shipping')  // reactive — conditional UI

  // Callback subscription — side effect, no re-render
  useEffect(() => {
    const sub = watch((_, { name, type }) =>
      console.log('Field changed:', name, '| type:', type)
    )
    return () => sub.unsubscribe()
  }, [watch])

  return (
    <form onSubmit={handleSubmit(console.log)} className="space-y-3 max-w-xs">
      <select {...register('shipping')}
              className="w-full border rounded-lg px-3 py-2 text-sm">
        <option value="standard">Standard (5–7 days)</option>
        <option value="express">Express (1–2 days)</option>
      </select>

      {shipping === 'express' && (
        <textarea {...register('note')}
                  placeholder="Delivery note (optional)"
                  rows={2}
                  className="w-full border rounded-lg px-3 py-2 text-sm" />
      )}

      <button type="submit"
              className="w-full py-2 bg-blue-600 text-white rounded-lg text-sm font-semibold">
        Place order
      </button>
    </form>
  )
}
```

---

---
