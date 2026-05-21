# 6 — `getValues` — Reading Values On Demand

---

## T — TL;DR

`getValues('field')` reads a field's current value from RHF's internal store **without subscribing to re-renders**. Use it inside event handlers, callbacks, and async functions where you need a value at a point in time — not continuously.

---

## K — Key Concepts

```tsx
const { getValues } = useForm<T>()

// ─── Single field — no re-render
const email = getValues('email')

// ─── Multiple fields
const [first, last] = getValues(['firstName', 'lastName'])

// ─── All fields — snapshot of entire form
const all = getValues()  // returns { firstName: ..., email: ..., ... }

// ─── Nested fields
const street = getValues('address.street')

// ─── Common patterns

// 1. Cross-field validation in register
<input {...register('confirmPassword', {
  validate: v => v === getValues('password') || 'Passwords do not match'
})} />

// 2. Reading values in an onClick handler (no re-render needed)
<button type="button" onClick={() => {
  const current = getValues()
  saveAsDraft(current)  // save without submitting
}}>
  Save as draft
</button>

// 3. Conditional logic in async submit
async function onSubmit(data: T) {
  const role = getValues('role')  // already in data, but shows the pattern
  if (role === 'admin') await grantAdminAccess(data)
  else await createUser(data)
}
```

```
getValues vs watch vs useWatch:

getValues('f')         → one-time read, NO re-render, use in handlers
watch('f')             → continuous reactive, re-renders parent per change
useWatch({ name: 'f'}) → continuous reactive in child, re-renders child only
```

---

## W — Why It Matters

- `getValues` is the correct tool for **imperative reads** — in button click handlers, async callbacks, `useEffect` cleanup, or timeout callbacks where you need the current value at that moment.
- Using `watch` for cross-field validation (`confirm === password`) is a common mistake — it causes re-renders on every keystroke. Using `getValues('password')` inside the validate function reads the value only when validation runs, with zero render overhead.
- `getValues()` (all fields) in a "save as draft" button is cleaner than maintaining a separate `useState` copy of the form data.

---

## I — Interview Q&A

### Q: Why use `getValues` instead of `watch` inside a `validate` function?

**A:** `watch` inside a component body subscribes to re-renders — every keystroke on the watched field causes a re-render. But cross-field validation (like "confirm password must match password") only needs to *read* the password value *when the confirm field is validated*, not subscribe to it continuously. `getValues('password')` inside a `validate` callback reads the current value at validation time without any subscription, so there's no re-render cost.

---

## C — Common Pitfalls + Fix

### ❌ Using `watch` inside a `validate` function for cross-field validation

```tsx
// ❌ watch in component body re-renders on every 'password' keystroke
const password = watch('password')
<input {...register('confirm', {
  validate: v => v === password || 'No match'
})} />
```

**Fix:**

```tsx
// ✅ getValues reads only when validate runs — zero subscription
<input {...register('confirm', {
  validate: v => v === getValues('password') || 'Passwords do not match'
})} />
```

---

## K — Coding Challenge + Solution

### Challenge

Build a multi-field form with a "Copy billing address to shipping" button that reads the billing fields via `getValues` and sets the shipping fields. No re-render from the copy action — only the `setValue` call updates the form.

### Solution

```tsx
'use client'
import { useForm } from 'react-hook-form'

type F = {
  billingStreet: string; billingCity: string
  shippingStreet: string; shippingCity: string
}

export function AddressForm() {
  const { register, handleSubmit, getValues, setValue } = useForm<F>({
    defaultValues: { billingStreet: '', billingCity: '',
                     shippingStreet: '', shippingCity: '' }
  })

  function copyBillingToShipping() {
    // Read via getValues — no subscription, no re-render from this read
    const [street, city] = getValues(['billingStreet', 'billingCity'])
    setValue('shippingStreet', street, { shouldDirty: true })
    setValue('shippingCity',   city,   { shouldDirty: true })
  }

  const input = 'w-full border rounded-lg px-3 py-2 text-sm'

  return (
    <form onSubmit={handleSubmit(console.log)} className="space-y-5 max-w-sm">
      <fieldset className="space-y-2">
        <legend className="text-xs font-semibold text-gray-500 uppercase">Billing</legend>
        <input {...register('billingStreet')} placeholder="Street" className={input} />
        <input {...register('billingCity')}   placeholder="City"   className={input} />
      </fieldset>

      <button type="button" onClick={copyBillingToShipping}
              className="text-sm text-blue-600 underline hover:text-blue-800">
        Copy billing → shipping
      </button>

      <fieldset className="space-y-2">
        <legend className="text-xs font-semibold text-gray-500 uppercase">Shipping</legend>
        <input {...register('shippingStreet')} placeholder="Street" className={input} />
        <input {...register('shippingCity')}   placeholder="City"   className={input} />
      </fieldset>

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
