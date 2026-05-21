
# 📅 Day 2 — RHF State, Observation, and Imperative Control

> **Goal:** Master everything *around* the fields — how to read form state, observe values reactively, and control the form programmatically from outside the normal submit flow.
> **Format:** Each subtopic = 5–15 min. Do one. Stop. Come back.
> **Stack version:** react-hook-form v7.74.0 · React 19 · TypeScript 6

---

## 📋 Day 2 Subtopic Overview

| # | Subtopic | Time |
|---|----------|------|
| 1 | `formState` — The Proxy and What It Tracks | 10 min |
| 2 | `errors` — Field, Nested, and Root Errors | 10 min |
| 3 | `touched` and `dirty` — User Interaction Tracking | 8 min |
| 4 | `watch` — Reactive Value Subscription | 10 min |
| 5 | `useWatch` — Isolated Component Re-renders | 10 min |
| 6 | `getValues` — Reading Values On Demand | 8 min |
| 7 | `setValue` — Programmatic Field Updates | 10 min |
| 8 | `trigger` — Manual Validation Control | 8 min |
| 9 | `setError` and `clearErrors` — Manual Error Management | 10 min |
| 10 | `reset` and `resetField` — Form and Field Reset | 10 min |
| 11 | Subscribe vs Read On Demand — The Decision Model | 8 min |

---

---

# 1 — `formState` — The Proxy and What It Tracks

---

## T — TL;DR

`formState` is a **JavaScript Proxy** — it only subscribes your component to re-renders for the specific properties you access. Access `errors` → re-render when errors change. Never access `isDirty` → never re-render for dirty changes. Use it to opt in to exactly what you need.

---

## K — Key Concepts

```tsx
// ─── Full formState reference
const {
  formState: {
    errors,           // FieldErrors<T> — validation error messages
    isSubmitting,     // true while handleSubmit's async fn runs
    isSubmitted,      // true after first submit attempt (never resets)
    isSubmitSuccessful, // true after submit with no errors thrown
    submitCount,      // number of submit attempts (int)
    isDirty,          // true if ANY field differs from defaultValues
    isValid,          // true if NO validation errors (live with onChange/onBlur mode)
    isLoading,        // true while async defaultValues Promise is pending
    isValidating,     // true while async validate functions are running
    touchedFields,    // { fieldName: true } — fields the user has focused+blurred
    dirtyFields,      // { fieldName: true } — fields changed from defaultValues
    defaultValues,    // the resolved defaultValues (useful for async defaults)
  }
} = useForm<T>()

// ─── Proxy behaviour — only subscribed properties trigger re-renders
const { formState: { errors } } = useForm<T>()
// This component re-renders ONLY when errors changes.
// Changes to isDirty, isSubmitting, etc. do NOT re-render it.

// ─── What NOT to do with the proxy
const state = { ...formState }       // ❌ spread destroys proxy
const keys  = Object.keys(formState) // ❌ iterating destroys proxy

// ─── What IS safe
const { errors, isSubmitting } = formState  // ✅ direct destructure
const errCount = Object.keys(formState.errors).length // ✅ accessing .errors first
```

```tsx
// ─── Practical: show a submit count and success message
function FormStatus() {
  const { formState: { submitCount, isSubmitSuccessful, isSubmitting } } = useFormContext()

  return (
    <div className="text-xs text-gray-500 space-y-1">
      {isSubmitting     && <p>⟳ Submitting…</p>}
      {isSubmitSuccessful && <p className="text-green-600">✓ Saved successfully</p>}
      {submitCount > 0  && <p>Attempts: {submitCount}</p>}
    </div>
  )
}
```

---

## W — Why It Matters

- The Proxy is RHF's core performance mechanism. Accessing `formState.isSubmitting` inside a child component means only *that* component re-renders when submitting starts — not the whole form tree.
- `isSubmitSuccessful` + `isSubmitted` lets you show post-submit UI states (success banners, "form sent" screens) without extra `useState`.
- `isValidating` lets you show a spinner during async `validate` functions (e.g. API username-availability checks).

---

## I — Interview Q&A

### Q: Why is `formState` implemented as a Proxy in React Hook Form?

**A:** The Proxy tracks *which properties your component reads* at render time. Only those properties register as subscriptions — when they change, RHF schedules a re-render for that component only. Properties you never access (e.g. `dirtyFields`) never trigger re-renders even if they change internally. This gives fine-grained render control without requiring separate selector functions like Zustand or Redux.

---

## C — Common Pitfalls + Fix

### ❌ Spreading `formState` into a new object

```tsx
// ❌ Proxy is lost — all formState changes now trigger re-renders
const { isSubmitting } = { ...formState }
```

**Fix:** Destructure directly from `formState`:

```tsx
// ✅
const { formState: { isSubmitting, errors } } = useForm<T>()
```

---

## K — Coding Challenge + Solution

### Challenge
Log how many times a component re-renders. Prove that typing does NOT trigger re-renders, but a submit attempt does (because `isSubmitted` changes).

### Solution

```tsx
'use client'
import { useRef } from 'react'
import { useForm } from 'react-hook-form'

type F = { name: string }

export function RenderCounterForm() {
  const renders = useRef(0)
  renders.current++

  const { register, handleSubmit, formState: { isSubmitted, errors } } = useForm<F>()
  // Subscribed to: isSubmitted, errors — NOT isDirty, NOT isSubmitting

  return (
    <form onSubmit={handleSubmit(console.log)} className="space-y-3 max-w-xs">
      <p className="text-xs text-gray-400">Renders: {renders.current}</p>
      <input {...register('name', { required: 'Required' })}
             placeholder="Type here — render count stays the same"
             className="w-full border rounded-lg px-3 py-2 text-sm" />
      {errors.name && <p className="text-xs text-red-600">{errors.name.message}</p>}
      {isSubmitted  && <p className="text-xs text-blue-600">Form was submitted</p>}
      <button type="submit"
              className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-semibold">
        Submit (re-renders on first click)
      </button>
    </form>
  )
}
```

---

---

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

# 3 — `touched` and `dirty` — User Interaction Tracking

---

## T — TL;DR

`touchedFields` tracks which fields the user has **focused and left**. `dirtyFields` tracks which fields have values **different from `defaultValues`**. `isDirty` is the form-level dirty flag. Use them to drive UX feedback — save button activation, "unsaved changes" warnings, and field-level visual indicators.

---

## K — Key Concepts

```tsx
const { formState: { touchedFields, dirtyFields, isDirty } } = useForm<T>({
  defaultValues: { name: 'Mark', email: 'mark@example.com' }
})

// touchedFields: { name: true }    after user focuses then blurs 'name'
// dirtyFields:   { name: true }    after user changes 'name' from 'Mark'
// isDirty:       true              when ANY field is dirty

// ─── Touched ≠ Dirty
// Touched: user interacted (focused + blurred) — value may be unchanged
// Dirty:   value ACTUALLY changed from defaultValues

// Example:
// User clicks into 'email' then tabs out without typing → touched, NOT dirty
// User types then deletes back to original → NOT dirty (deep compare)
// User types something different → dirty ✅
```

```tsx
// ─── Use cases

// 1. Save button — only active when form has changes
<button disabled={!isDirty || isSubmitting}>Save changes</button>

// 2. Field-level dirty indicator (dot or highlight)
function DirtyIndicator({ name }: { name: keyof Fields }) {
  const { formState: { dirtyFields } } = useFormContext<Fields>()
  return dirtyFields[name]
    ? <span className="size-1.5 rounded-full bg-blue-500 inline-block ml-1" />
    : null
}

// 3. "Unsaved changes" navigation warning
useEffect(() => {
  const handler = (e: BeforeUnloadEvent) => {
    if (isDirty) { e.preventDefault(); e.returnValue = '' }
  }
  window.addEventListener('beforeunload', handler)
  return () => window.removeEventListener('beforeunload', handler)
}, [isDirty])

// 4. Touched — show error only after user has interacted
// (RHF mode: 'onTouched' handles this automatically)
// Manual version:
{touchedFields.email && errors.email && (
  <p className="text-xs text-red-600">{errors.email.message}</p>
)}
```

---

## W — Why It Matters

- `isDirty` + `disabled={!isDirty}` on a save button is the standard "don't save unchanged data" UX pattern — prevents unnecessary API calls and signals to users when changes are pending.
- `dirtyFields` does a **deep equality comparison** against `defaultValues` — if a user changes a value then changes it back to the original, the field is no longer dirty. This is more accurate than tracking "has the user typed anything".
- Always pair `isDirty` navigation guards with `reset()` after a successful save — otherwise the guard fires even after data has been persisted.

---

## I — Interview Q&A

### Q: What is the difference between `touchedFields` and `dirtyFields`?

**A:** `touchedFields` records that a user has focused then blurred a field — they interacted with it, regardless of whether the value changed. `dirtyFields` records that the field's current value is different from its `defaultValues` entry — the actual data changed. A field can be touched without being dirty (user clicked in and out without typing) or dirty without being touched (programmatic `setValue` call). The most common use: `touchedFields` to time when to show validation errors; `dirtyFields`/`isDirty` to decide whether a save/discard action is available.

---

## C — Common Pitfalls + Fix

### ❌ Checking `isDirty` without setting `defaultValues`

```tsx
// ❌ Without defaultValues, everything compares against undefined
// isDirty is always true the moment user types anything
const { formState: { isDirty } } = useForm<T>()  // no defaultValues
```

**Fix:** Always provide `defaultValues` so RHF has a baseline to compare against:

```tsx
// ✅
const { formState: { isDirty } } = useForm<T>({
  defaultValues: { name: '', email: '', bio: '' }
})
```

---

## K — Coding Challenge + Solution

### Challenge

Build a settings form with an `isDirty`-gated save button, a discard button that calls `reset()`, and a `beforeunload` guard that warns on navigation if the form is dirty.

### Solution

```tsx
'use client'
import { useEffect } from 'react'
import { useForm }   from 'react-hook-form'

type F = { displayName: string; email: string }

export function SettingsForm() {
  const { register, handleSubmit, reset,
          formState: { isDirty, isSubmitting } } = useForm<F>({
    defaultValues: { displayName: 'Mark Austin', email: 'mark@example.com' }
  })

  // Navigation guard
  useEffect(() => {
    const guard = (e: BeforeUnloadEvent) => {
      if (isDirty) { e.preventDefault(); e.returnValue = '' }
    }
    window.addEventListener('beforeunload', guard)
    return () => window.removeEventListener('beforeunload', guard)
  }, [isDirty])

  async function onSubmit(data: F) {
    await new Promise(r => setTimeout(r, 800))
    reset(data)  // baseline updated — isDirty → false
    console.log('Saved:', data)
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 max-w-sm">
      <input {...register('displayName', { required: 'Required' })}
             className="w-full border rounded-lg px-3 py-2 text-sm" />
      <input {...register('email', { required: 'Required' })} type="email"
             className="w-full border rounded-lg px-3 py-2 text-sm" />
      <div className="flex gap-3">
        <button type="submit" disabled={!isDirty || isSubmitting}
                className="px-5 py-2 bg-blue-600 text-white rounded-lg text-sm
                            font-semibold disabled:opacity-40">
          {isSubmitting ? 'Saving…' : 'Save'}
        </button>
        <button type="button" onClick={() => reset()} disabled={!isDirty}
                className="px-5 py-2 border rounded-lg text-sm
                            font-semibold disabled:opacity-40">
          Discard
        </button>
        {isDirty && (
          <span className="self-center text-xs text-amber-600">Unsaved changes</span>
        )}
      </div>
    </form>
  )
}
```

---

---

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

# 5 — `useWatch` — Isolated Component Re-renders

---

## T — TL;DR

`useWatch` is `watch` extracted into a hook you call inside a **child component** — only that child re-renders when the watched field changes. Use it to isolate expensive or reactive sub-components from the parent form's render cycle.

---

## K — Key Concepts

```tsx
import { useWatch } from 'react-hook-form'

// ─── Inside a child component
function TotalDisplay({ control }: { control: Control<OrderForm> }) {
  const quantity = useWatch({ control, name: 'quantity', defaultValue: 1 })
  const price    = useWatch({ control, name: 'price',    defaultValue: 0 })
  // Only TotalDisplay re-renders when quantity or price changes
  // The parent form does NOT re-render ✅
  return <p className="font-bold">Total: ${(quantity * price).toFixed(2)}</p>
}

// ─── With FormProvider (no need to pass control)
function TotalDisplay() {
  const quantity = useWatch<OrderForm>({ name: 'quantity', defaultValue: 1 })
  const price    = useWatch<OrderForm>({ name: 'price',    defaultValue: 0 })
  return <p className="font-bold">Total: ${(quantity * price).toFixed(2)}</p>
}

// ─── Watch multiple fields
const [first, last] = useWatch({ control, name: ['firstName', 'lastName'] })
const fullName       = `${first ?? ''} ${last ?? ''}`.trim()

// ─── Watch entire form (returns all values)
const allValues = useWatch({ control })
```

```
watch vs useWatch:

watch('field')    → called in the PARENT — parent re-renders
useWatch({ name }) → called in a CHILD — only child re-renders

Use useWatch when the reactive display is in a separate component
and you want to shield the parent form from those re-renders.
```

---

## W — Why It Matters

- In a large form with a real-time preview panel (e.g. invoice preview, bio preview), using `watch` in the parent causes the entire form to re-render on every keystroke. `useWatch` in the preview component isolates those re-renders to just the preview.
- The `defaultValue` option on `useWatch` is important — before the field is registered, `useWatch` returns `undefined`. Providing `defaultValue` prevents downstream errors in arithmetic (`undefined * 5 = NaN`).
- `useWatch` is the right tool when a child component needs to *display* a computed value from form fields — order totals, character counts, formatted previews.

---

## I — Interview Q&A

### Q: When do you use `useWatch` instead of `watch`?

**A:** Use `watch` in the same component that renders the form — it's convenient and direct. Use `useWatch` when the reactive value is consumed by a **child component** and you want to prevent the parent from re-rendering. `watch` in the parent causes the parent (and all its children) to re-render on every change. `useWatch` in a child isolates those re-renders to the child only. A practical example: a live character counter for a textarea — put it in a `<CharacterCount />` child using `useWatch` so the counter updates every keystroke without re-rendering the full form.

---

## C — Common Pitfalls + Fix

### ❌ Forgetting `defaultValue` — returns `undefined` before field registers

```tsx
// ❌ quantity is undefined on first render → 1 * undefined = NaN
const quantity = useWatch({ control, name: 'quantity' })
const total    = price * quantity  // NaN ❌
```

**Fix:**

```tsx
// ✅
const quantity = useWatch({ control, name: 'quantity', defaultValue: 1 })
const total    = price * quantity  // safe ✅
```

---

## K — Coding Challenge + Solution

### Challenge

Build an order form with `quantity` (number) and `unitPrice` (number) fields. Use `useWatch` in a separate `<OrderTotal>` child component to show the running total. Prove the parent does not re-render per keystroke by adding a render counter to it.

### Solution

```tsx
'use client'
import { useRef }                     from 'react'
import { useForm, useWatch, Control } from 'react-hook-form'

type F = { quantity: number; unitPrice: number }

function OrderTotal({ control }: { control: Control<F> }) {
  const qty   = useWatch({ control, name: 'quantity',  defaultValue: 1 })
  const price = useWatch({ control, name: 'unitPrice', defaultValue: 0 })
  return (
    <div className="p-3 bg-gray-50 rounded-xl text-sm font-semibold">
      Total: ${(qty * price).toFixed(2)}
    </div>
  )
}

export function OrderForm() {
  const renders = useRef(0)
  renders.current++

  const { register, handleSubmit, control } = useForm<F>({
    defaultValues: { quantity: 1, unitPrice: 9.99 }
  })

  return (
    <form onSubmit={handleSubmit(console.log)} className="space-y-4 max-w-xs">
      <p className="text-xs text-gray-400">Parent renders: {renders.current}</p>
      <div>
        <label className="text-xs text-gray-500 mb-1 block">Quantity</label>
        <input {...register('quantity',  { valueAsNumber: true, min: 1 })}
               type="number"
               className="w-full border rounded-lg px-3 py-2 text-sm" />
      </div>
      <div>
        <label className="text-xs text-gray-500 mb-1 block">Unit price ($)</label>
        <input {...register('unitPrice', { valueAsNumber: true, min: 0 })}
               type="number" step="0.01"
               className="w-full border rounded-lg px-3 py-2 text-sm" />
      </div>
      <OrderTotal control={control} />
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

# 7 — `setValue` — Programmatic Field Updates

---

## T — TL;DR

`setValue('field', value, options)` programmatically updates a field's value in RHF's store. Use it for: copying values between fields, setting values from external data (autocomplete, geolocation), and integrating non-form UI (sliders, maps). Pass `{ shouldDirty: true }` to update dirty tracking.

---

## K — Key Concepts

```tsx
const { setValue } = useForm<T>()

// ─── Basic usage
setValue('firstName', 'Mark')

// ─── With options
setValue('email', 'mark@example.com', {
  shouldValidate: true,   // run validation after setting
  shouldDirty:    true,   // mark field as dirty (changed from defaultValues)
  shouldTouch:    true    // mark field as touched
})

// ─── Nested fields
setValue('address.city', 'Manila')

// ─── Set multiple fields individually
const addressData = { street: '123 Main', city: 'Manila', zip: '1000' }
Object.entries(addressData).forEach(([k, v]) =>
  setValue(`address.${k}` as any, v, { shouldDirty: true })
)
// Or use reset() for bulk updates to multiple top-level fields
```

```tsx
// ─── Common patterns

// 1. Address autocomplete — set multiple fields from one selection
function AddressAutocomplete() {
  const { setValue } = useFormContext<AddressForm>()

  function handlePlaceSelected(place: GooglePlace) {
    setValue('street', place.street,  { shouldDirty: true, shouldValidate: true })
    setValue('city',   place.city,    { shouldDirty: true, shouldValidate: true })
    setValue('state',  place.state,   { shouldDirty: true, shouldValidate: true })
    setValue('zip',    place.zipCode, { shouldDirty: true, shouldValidate: true })
  }

  return <PlaceAutocompleteInput onSelect={handlePlaceSelected} />
}

// 2. Phone number formatter — format on change
<input
  {...register('phone')}
  onChange={e => {
    const digits = e.target.value.replace(/\D/g, '').slice(0, 10)
    const formatted = digits.replace(/(\d{3})(\d{3})(\d{4})/, '($1) $2-$3')
    setValue('phone', formatted, { shouldValidate: true })
  }}
/>

// 3. "Same as billing" checkbox
const sameBilling = watch('sameBilling')
useEffect(() => {
  if (sameBilling) {
    setValue('shippingName',    getValues('billingName'),    { shouldDirty: true })
    setValue('shippingAddress', getValues('billingAddress'), { shouldDirty: true })
  }
}, [sameBilling])
```

---

## W — Why It Matters

- `shouldDirty: true` is easy to forget — without it, `setValue` updates the value but `isDirty` doesn't update, so a save button gated on `isDirty` won't activate after programmatic changes.
- `shouldValidate: true` runs validation immediately after setting — useful for "realtime" autocomplete experiences where you want validation feedback as soon as a value is filled programmatically.
- For bulk updates to the entire form (e.g. loading a saved draft), prefer `reset(data)` over multiple `setValue` calls — `reset` is atomic and more efficient.

---

## I — Interview Q&A

### Q: What options should you pass to `setValue` and when does each matter?

**A:** `shouldDirty: true` updates the dirty state — required if you want `isDirty` to reflect programmatic changes (e.g. a "copy billing to shipping" button should dirty those shipping fields). `shouldValidate: true` triggers validation immediately after setting — use for autocomplete or instant feedback scenarios. `shouldTouch: true` marks the field as touched — use when you want error messages to appear for a programmatically set field (since errors only display for touched fields in `onTouched` mode). If none are passed, only the stored value updates with no side effects.

---

## C — Common Pitfalls + Fix

### ❌ Using `setValue` without `shouldDirty` — isDirty stays false

```tsx
// ❌ Value updates but form still appears "clean"
setValue('email', 'new@example.com')
console.log(isDirty)  // false — save button stays disabled
```

**Fix:**

```tsx
// ✅ isDirty correctly updates
setValue('email', 'new@example.com', { shouldDirty: true })
```

---

## K — Coding Challenge + Solution

### Challenge

Build a profile form with a "Fill with test data" button that populates all fields using `setValue` with `shouldDirty: true` and `shouldValidate: true`. The save button should activate after clicking fill.

### Solution

```tsx
'use client'
import { useForm } from 'react-hook-form'

type F = { name: string; email: string; role: string }

const TEST_DATA: F = { name: 'Test User', email: 'test@example.com', role: 'editor' }

export function ProfileForm() {
  const { register, handleSubmit, setValue, formState: { isDirty, errors } } = useForm<F>({
    defaultValues: { name: '', email: '', role: 'viewer' }
  })

  function fillTestData() {
    const opts = { shouldDirty: true, shouldValidate: true } as const
    setValue('name',  TEST_DATA.name,  opts)
    setValue('email', TEST_DATA.email, opts)
    setValue('role',  TEST_DATA.role,  opts)
  }

  return (
    <form onSubmit={handleSubmit(console.log)} className="space-y-3 max-w-xs">
      <button type="button" onClick={fillTestData}
              className="text-sm text-blue-600 underline">
        Fill with test data
      </button>
      <input {...register('name',  { required: 'Required' })} placeholder="Name"
             className="w-full border rounded-lg px-3 py-2 text-sm" />
      {errors.name  && <p className="text-xs text-red-600">{errors.name.message}</p>}
      <input {...register('email', { required: 'Required' })} placeholder="Email" type="email"
             className="w-full border rounded-lg px-3 py-2 text-sm" />
      {errors.email && <p className="text-xs text-red-600">{errors.email.message}</p>}
      <select {...register('role')} className="w-full border rounded-lg px-3 py-2 text-sm">
        <option value="viewer">Viewer</option>
        <option value="editor">Editor</option>
        <option value="admin">Admin</option>
      </select>
      <button type="submit" disabled={!isDirty}
              className="w-full py-2 bg-blue-600 text-white rounded-lg text-sm
                          font-semibold disabled:opacity-40">
        Save
      </button>
    </form>
  )
}
```

---

---

# 8 — `trigger` — Manual Validation Control

---

## T — TL;DR

`trigger('field')` manually runs validation on a field (or the whole form) without submitting. Returns a `Promise<boolean>`. Use it for step-by-step wizards (validate step before advancing), cross-field re-validation, and programmatic UX flows.

---

## K — Key Concepts

```tsx
const { trigger } = useForm<T>()

// ─── Trigger one field
const isValid = await trigger('email')   // true | false
// Runs all validation rules for 'email', updates formState.errors.email

// ─── Trigger multiple fields
const isValid = await trigger(['email', 'password'])

// ─── Trigger all fields (full form validation without submitting)
const isValid = await trigger()

// ─── Common patterns

// 1. Multi-step wizard — validate before advancing
async function handleNext() {
  const step1Valid = await trigger(['firstName', 'lastName', 'email'])
  if (!step1Valid) return  // stay on step 1, errors now visible
  setStep(2)
}

// 2. Cross-field re-validation
// When 'password' changes, re-validate 'confirmPassword'
useEffect(() => {
  const sub = watch((_, { name }) => {
    if (name === 'password') trigger('confirmPassword')
  })
  return () => sub.unsubscribe()
}, [watch, trigger])

// 3. Async field validation on blur (debounced)
<input
  {...register('username')}
  onBlur={() => trigger('username')}  // explicit trigger after blur
/>
```

---

## W — Why It Matters

- In multi-step forms, calling `handleSubmit` on step 1 would try to submit the whole form. `trigger(['field1', 'field2'])` validates only the current step's fields — if invalid, errors show in-place; if valid, you advance to the next step.
- `trigger` is also the bridge for `mode: 'onSubmit'` forms that need one-off validation before the final submit — e.g. validate an email field on blur even though the form's default mode is `onSubmit`.
- The `Promise<boolean>` return means you can `await` it in async flows and branch on the result cleanly.

---

## I — Interview Q&A

### Q: How do you validate only the current step's fields in a multi-step form?

**A:** Call `await trigger(['field1', 'field2', ...])` with the field names belonging to the current step. This returns `true` if all specified fields pass validation, `false` if any fail — and it updates `formState.errors` so errors appear for invalid fields. If it returns `false`, prevent advancing to the next step. If `true`, call `setStep(nextStep)`. The overall `handleSubmit` call only happens on the final step.

---

## C — Common Pitfalls + Fix

### ❌ Using `trigger` without `await` and branching on the result

```tsx
// ❌ trigger() is async — checking without await always sees undefined
trigger(['email', 'password'])
if (someVariable) setStep(2)  // not using trigger's result ❌
```

**Fix:**

```tsx
// ✅
const isValid = await trigger(['email', 'password'])
if (isValid) setStep(2)
```

---

## K — Coding Challenge + Solution

### Challenge

Build a 2-step wizard form. Step 1: `name` + `email`. Step 2: `password` + `confirmPassword`. Advance uses `trigger` to validate step 1 fields. Final submit only fires from step 2.

### Solution

```tsx
'use client'
import { useState }  from 'react'
import { useForm }   from 'react-hook-form'

type F = { name: string; email: string; password: string; confirm: string }

export function WizardForm() {
  const [step, setStep] = useState(1)
  const { register, handleSubmit, trigger, getValues, formState: { errors, isSubmitting } } = useForm<F>({
    mode: 'onTouched'
  })

  async function handleNext() {
    const valid = await trigger(['name', 'email'])
    if (valid) setStep(2)
  }

  const input = 'w-full border rounded-lg px-3 py-2 text-sm'
  const err   = 'text-xs text-red-600 mt-1'

  return (
    <form onSubmit={handleSubmit(console.log)} className="space-y-4 max-w-xs">
      <p className="text-xs font-semibold text-gray-500">Step {step} of 2</p>

      {step === 1 && (
        <>
          <div>
            <input {...register('name',  { required: 'Required' })} placeholder="Full name" className={input} />
            {errors.name  && <p className={err}>{errors.name.message}</p>}
          </div>
          <div>
            <input {...register('email', { required: 'Required' })} placeholder="Email" type="email" className={input} />
            {errors.email && <p className={err}>{errors.email.message}</p>}
          </div>
          <button type="button" onClick={handleNext}
                  className="w-full py-2 bg-blue-600 text-white rounded-lg text-sm font-semibold">
            Next →
          </button>
        </>
      )}

      {step === 2 && (
        <>
          <div>
            <input {...register('password', { required: 'Required', minLength: { value: 8, message: 'Min 8 chars' } })}
                   type="password" placeholder="Password" className={input} />
            {errors.password && <p className={err}>{errors.password.message}</p>}
          </div>
          <div>
            <input {...register('confirm', {
              required: 'Required',
              validate:  v => v === getValues('password') || 'Passwords do not match'
            })} type="password" placeholder="Confirm" className={input} />
            {errors.confirm && <p className={err}>{errors.confirm.message}</p>}
          </div>
          <div className="flex gap-3">
            <button type="button" onClick={() => setStep(1)}
                    className="px-4 py-2 border rounded-lg text-sm">← Back</button>
            <button type="submit" disabled={isSubmitting}
                    className="flex-1 py-2 bg-green-600 text-white rounded-lg text-sm font-semibold">
              {isSubmitting ? 'Creating…' : 'Create account'}
            </button>
          </div>
        </>
      )}
    </form>
  )
}
```

---

---

# 9 — `setError` and `clearErrors` — Manual Error Management

---

## T — TL;DR

`setError('field', { type, message })` injects an error into `formState.errors` — used for server-side errors that RHF can't detect at validation time. `clearErrors('field')` removes errors manually. Both enable two-way error management: RHF-driven + server-driven.

---

## K — Key Concepts

```tsx
const { setError, clearErrors } = useForm<T>()

// ─── setError: inject an error into formState
setError('email', {
  type:    'server',            // custom type string
  message: 'Email already taken'
})

// ─── Named root errors (multiple non-field errors)
setError('root.serverError', {
  type:    '500',
  message: 'Internal server error. Please try again.'
})
setError('root.networkError', {
  type:    'network',
  message: 'No internet connection.'
})

// ─── clearErrors: remove manually set errors
clearErrors('email')          // clear one field
clearErrors(['email', 'name'])// clear multiple
clearErrors()                  // clear ALL errors

// ─── shouldFocus option: focus the field after setting error
setError('email', { type: 'server', message: 'Taken' }, { shouldFocus: true })
```

```tsx
// ─── Full server error pattern in handleSubmit
async function onSubmit(data: RegisterForm) {
  try {
    await api.register(data)
    router.push('/dashboard')
  } catch (err: any) {
    switch (err.code) {
      case 'EMAIL_TAKEN':
        setError('email', { type: 'server', message: 'Email is already registered.' },
                 { shouldFocus: true })
        break
      case 'USERNAME_TAKEN':
        setError('username', { type: 'server', message: 'Username is taken.' })
        break
      default:
        setError('root', { type: 'server', message: 'Something went wrong.' })
    }
  }
}

// ─── Clear server error when user corrects the field
// Use watch callback — clear when field changes after server error
useEffect(() => {
  const sub = watch((_, { name }) => {
    if (name && errors[name as keyof T]?.type === 'server') {
      clearErrors(name as keyof T)
    }
  })
  return () => sub.unsubscribe()
}, [watch, errors, clearErrors])
```

---

## W — Why It Matters

- Without `setError`, server errors require a separate `useState` for each error message — an `emailError` state, a `usernameError` state, a `rootError` state. `setError` keeps all errors — client and server — in one place: `formState.errors`.
- `shouldFocus: true` is a UX and accessibility improvement — after a server error, focus jumps to the problematic field so the user doesn't have to hunt for the error.
- The "clear server error on change" pattern prevents stale server errors from persisting after the user has corrected the field — without it, "Email taken" might still show after the user types a new valid email.

---

## I — Interview Q&A

### Q: How do you prevent a server-set error from persisting after the user corrects the field?

**A:** Use the callback form of `watch` to observe field changes. When a field changes and its current error type is `'server'`, call `clearErrors` on that field. This ensures the server error clears in real time as the user types a new value, while client-side validation errors (set by `register` rules) continue to work normally through RHF's standard validation cycle.

---

## C — Common Pitfalls + Fix

### ❌ Using `useState` for server errors alongside RHF

```tsx
// ❌ Dual error state — errors.email from RHF + emailServerError from useState
const [emailServerError, setEmailServerError] = useState('')
// Now you have to render two error sources and manage both independently
```

**Fix:** Use `setError` — keep all errors in `formState.errors`:

```tsx
// ✅ One source of truth for all errors
setError('email', { type: 'server', message: 'Email already taken.' })
{errors.email && <p>{errors.email.message}</p>}
```

---

## K — Coding Challenge + Solution

### Challenge

Build a registration form with `username` and `email`. Simulate a server response where `username = 'admin'` returns a "Username taken" error. Auto-clear the server error when the user modifies that field.

### Solution

```tsx
'use client'
import { useEffect } from 'react'
import { useForm }   from 'react-hook-form'

type F = { username: string; email: string }

export function RegisterForm() {
  const { register, handleSubmit, setError, clearErrors, watch,
          formState: { errors, isSubmitting } } = useForm<F>()

  // Clear server errors when user changes the field
  useEffect(() => {
    const sub = watch((_, { name }) => {
      if (name && errors[name as keyof F]?.type === 'server') {
        clearErrors(name as keyof F)
      }
    })
    return () => sub.unsubscribe()
  }, [watch, errors, clearErrors])

  async function onSubmit(data: F) {
    await new Promise(r => setTimeout(r, 800))
    if (data.username === 'admin') {
      setError('username', { type: 'server', message: 'Username "admin" is taken.' },
               { shouldFocus: true })
      return
    }
    console.log('Registered:', data)
  }

  const cls = 'w-full border rounded-lg px-3 py-2 text-sm'
  const err = 'text-xs text-red-600 mt-1'

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-3 max-w-xs">
      {errors.root && (
        <p className="p-3 bg-red-50 rounded-xl text-sm text-red-700">
          {errors.root.message}
        </p>
      )}
      <div>
        <input {...register('username', { required: 'Required' })}
               placeholder='Try "admin"' className={cls} />
        {errors.username && <p className={err}>{errors.username.message}</p>}
      </div>
      <div>
        <input {...register('email', { required: 'Required' })} type="email"
               placeholder="Email" className={cls} />
        {errors.email && <p className={err}>{errors.email.message}</p>}
      </div>
      <button type="submit" disabled={isSubmitting}
              className="w-full py-2 bg-blue-600 text-white rounded-lg text-sm
                          font-semibold disabled:opacity-50">
        {isSubmitting ? 'Checking…' : 'Register'}
      </button>
    </form>
  )
}
```

---

---

# 10 — `reset` and `resetField` — Form and Field Reset

---

## T — TL;DR

`reset(values?, options?)` restores the entire form to its `defaultValues` (or new values you provide). `resetField('field', options?)` resets a single field. Both clear errors, dirty state, and touched state unless you opt out with options.

---

## K — Key Concepts

```tsx
const { reset, resetField } = useForm<T>()

// ─── reset() — full form reset

// Back to original defaultValues
reset()

// Reset to new values (e.g. after a save)
reset({ name: 'Mark', email: 'mark@example.com' })

// Partial reset — only provided fields update, rest stay as defaultValues
reset({ email: 'new@example.com' })

// Reset with options
reset(undefined, {
  keepErrors:        false,  // clear errors (default)
  keepDirty:         false,  // reset dirty state (default)
  keepDirtyValues:   false,  // keep values of dirty fields
  keepValues:        false,  // keep ALL current values, only reset state
  keepDefaultValues: false,  // keep current defaultValues
  keepIsSubmitted:   false,  // reset isSubmitted
  keepTouched:       false,  // reset touchedFields
  keepIsValid:       false,
  keepSubmitCount:   false
})

// ─── resetField() — single field reset
resetField('email')                              // to defaultValues.email
resetField('email', { defaultValue: 'new@x.com' }) // to a specific value
resetField('email', { keepError:   true })       // reset value, keep error
resetField('email', { keepDirty:   true })       // reset value, keep dirty
resetField('email', { keepTouched: true })       // reset value, keep touched
```

```tsx
// ─── Common patterns

// 1. Clear form after successful submit
async function onSubmit(data: T) {
  await api.createItem(data)
  reset()  // clear form and all state ✅
}

// 2. Update baseline after save (keep editing)
async function onSave(data: T) {
  const saved = await api.update(data)
  reset(saved)  // isDirty → false, form shows saved values ✅
}

// 3. Load server data into form
useEffect(() => {
  if (userData) reset(userData)
}, [userData, reset])

// 4. Cancel button
<button type="button" onClick={() => reset()}>Cancel</button>
```

---

## W — Why It Matters

- `reset()` after a successful create is cleaner than unmounting/remounting the form — it restores all values, clears all errors, resets `isSubmitted`, and resets `submitCount` in one call.
- `reset(savedData)` after a save — not `reset()` — is the correct pattern for "save and continue editing". It updates `defaultValues` so `isDirty` compares against the newly saved state, not the original.
- `keepValues: true` lets you reset form *state* (errors, dirty, touched) without changing *values* — useful for clearing validation feedback after a page navigation while preserving what the user typed.

---

## I — Interview Q&A

### Q: What is the difference between `reset()` and `reset(newValues)` in RHF?

**A:** `reset()` with no arguments restores the form to its original `defaultValues` — the values passed to `useForm`. `reset(newValues)` sets new values AND makes them the new baseline for `isDirty` comparison and future `reset()` calls. Use `reset()` for cancel/clear patterns. Use `reset(serverResponse)` after a save to update the baseline — so `isDirty` becomes `false` and a subsequent `reset()` returns to the saved state, not the original empty state.

---

## C — Common Pitfalls + Fix

### ❌ Calling `reset` during render instead of in an effect or handler

```tsx
// ❌ Called during render — infinite render loop
function MyForm({ userData }) {
  const { reset } = useForm()
  if (userData) reset(userData)  // ← runs every render
  // ...
}
```

**Fix:** Call `reset` in an effect:

```tsx
// ✅ Runs only when userData changes
useEffect(() => {
  if (userData) reset(userData)
}, [userData, reset])
```

---

## K — Coding Challenge + Solution

### Challenge

Build a "Create item" form with: successful submit clears form via `reset()`; a cancel button resets to empty; a `resetField('name')` button resets only the name field. Show `isDirty` status.

### Solution

```tsx
'use client'
import { useForm } from 'react-hook-form'

type F = { name: string; description: string; price: number }

const DEFAULTS: F = { name: '', description: '', price: 0 }

export function CreateItemForm() {
  const { register, handleSubmit, reset, resetField,
          formState: { isDirty, isSubmitting, errors } } = useForm<F>({
    defaultValues: DEFAULTS
  })

  async function onSubmit(data: F) {
    await new Promise(r => setTimeout(r, 800))
    console.log('Created:', data)
    reset()  // clear form ✅
  }

  const input = 'w-full border rounded-lg px-3 py-2 text-sm'
  const err   = 'text-xs text-red-600 mt-1'

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-3 max-w-xs">
      {isDirty && <p className="text-xs text-amber-600">● Unsaved changes</p>}

      <div>
        <div className="flex gap-2">
          <input {...register('name', { required: 'Required' })} placeholder="Item name"
                 className={input} />
          <button type="button" onClick={() => resetField('name')}
                  className="px-3 py-2 border rounded-lg text-xs whitespace-nowrap">
            Reset name
          </button>
        </div>
        {errors.name && <p className={err}>{errors.name.message}</p>}
      </div>

      <textarea {...register('description')} placeholder="Description" rows={2}
                className={input} />

      <input {...register('price', { valueAsNumber: true, min: 0 })}
             type="number" step="0.01" placeholder="Price"
             className={input} />

      <div className="flex gap-3">
        <button type="button" onClick={() => reset()}
                className="flex-1 py-2 border rounded-lg text-sm font-semibold">
          Cancel
        </button>
        <button type="submit" disabled={!isDirty || isSubmitting}
                className="flex-1 py-2 bg-blue-600 text-white rounded-lg text-sm
                            font-semibold disabled:opacity-40">
          {isSubmitting ? 'Creating…' : 'Create'}
        </button>
      </div>
    </form>
  )
}
```

---

---

# 11 — Subscribe vs Read On Demand — The Decision Model

---

## T — TL;DR

The core question is: **does the UI need to update in real-time as the value changes?** If yes → subscribe (`watch`, `useWatch`). If no → read on demand (`getValues`). Wrong choice = unnecessary re-renders or stale data.

---

## K — Key Concepts

```
DECISION TREE — choosing the right observation method:

  "Do I need the value in JSX/rendered output?"
        │
        ├─ YES → Does it update the UI in real time per keystroke?
        │           │
        │           ├─ YES, in THIS component → watch('field')
        │           │
        │           ├─ YES, in a CHILD component → useWatch({ name })
        │           │    (isolates re-render to child)
        │           │
        │           └─ NO, only on submit/click → getValues('field')
        │
        └─ NO (side effect, handler, async) → getValues('field')
                or watch callback → watch((v, { name }) => ...)
```

```tsx
// ─── Quick-reference examples

// ✅ watch → conditional UI in same component
const role = watch('role')
{role === 'admin' && <AdminFields />}

// ✅ useWatch → real-time display in child (isolates re-render)
function PriceDisplay() {
  const qty = useWatch({ name: 'quantity', defaultValue: 1 })
  return <span>${(qty * 9.99).toFixed(2)}</span>
}

// ✅ getValues → cross-field validation (runs only when validated)
validate: v => v === getValues('password') || 'No match'

// ✅ getValues → read in click handler
<button onClick={() => saveDraft(getValues())}>Save draft</button>

// ✅ watch callback → side effect on change (no re-render)
useEffect(() => {
  const sub = watch((_, { name }) => {
    if (name === 'country') fetchStates(getValues('country'))
  })
  return () => sub.unsubscribe()
}, [watch, getValues])

// ─── Performance cost comparison
// watch('field')    = 1 re-render per keystroke on that field (parent)
// useWatch({ name })= 1 re-render per keystroke (child only)
// watch callback    = 0 re-renders
// getValues         = 0 re-renders
```

---

## W — Why It Matters

- This decision directly determines your form's render performance. A 15-field form where every field is watched re-renders 15 times per character. The same form using `getValues` in handlers renders 0 times per character.
- Most developers default to `watch` for everything because it's the most visible API. In practice, 80% of value reads should be `getValues` — submissions, handlers, effects, and cross-field validation.
- `useWatch` in child components is the most underused tool — it gives the real-time reactivity of `watch` without the parent re-render cost.

---

## I — Interview Q&A

### Q: You have a form with 20 fields and a submit button that should only be enabled when a specific field has a value. How do you implement this without re-rendering the whole form?

**A:** Use `useWatch` in a separate `<SubmitButton>` child component that receives `control` as a prop. Inside the child, `useWatch({ control, name: 'requiredField' })` subscribes only that child to changes in that field — the parent form doesn't re-render. If you used `watch('requiredField')` in the parent, the entire form re-renders every time the field changes.

---

## C — Common Pitfalls + Fix

### ❌ Using `watch` in parent for a value that only a child needs

```tsx
// ❌ Parent re-renders on every keystroke just for a child's display
function OrderForm() {
  const total = watch('quantity') * watch('price')  // parent re-renders
  return (
    <>
      <QuantityInput />
      <PriceInput />
      <p>Total: {total}</p>  {/* only this needs the value */}
    </>
  )
}
```

**Fix:** Move `useWatch` into the child:

```tsx
// ✅ Only TotalDisplay re-renders
function TotalDisplay({ control }) {
  const qty   = useWatch({ control, name: 'quantity', defaultValue: 1 })
  const price = useWatch({ control, name: 'price',    defaultValue: 0 })
  return <p>Total: ${(qty * price).toFixed(2)}</p>
}
```

---

## K — Coding Challenge + Solution

### Challenge

Build a checkout form. Demonstrate ALL four patterns correctly:
1. `watch` — show/hide "Company name" field when billing type is "business"
2. `useWatch` — isolated `<RunningTotal>` child component
3. `getValues` — "Save draft" button reads without subscription
4. `watch` callback — log to console when `country` changes (side effect)

### Solution

```tsx
'use client'
import { useEffect, useRef }         from 'react'
import { useForm, useWatch, Control } from 'react-hook-form'

type F = {
  billingType: string; companyName: string
  quantity: number;    unitPrice: number
  country: string
}

// ─── 2. useWatch in isolated child
function RunningTotal({ control }: { control: Control<F> }) {
  const qty   = useWatch({ control, name: 'quantity',  defaultValue: 1 })
  const price = useWatch({ control, name: 'unitPrice', defaultValue: 0 })
  return (
    <div className="p-3 bg-gray-50 rounded-xl text-sm font-bold">
      Total: ${(qty * price).toFixed(2)}
    </div>
  )
}

export function CheckoutForm() {
  const renders = useRef(0)
  renders.current++

  const { register, handleSubmit, watch, getValues, control } = useForm<F>({
    defaultValues: {
      billingType: 'personal', companyName: '',
      quantity: 1, unitPrice: 9.99, country: 'US'
    }
  })

  // 1. watch — conditional UI (parent)
  const billingType = watch('billingType')

  // 4. watch callback — side effect only
  useEffect(() => {
    const sub = watch((_, { name }) => {
      if (name === 'country') {
        console.log('Country changed to:', getValues('country'))
      }
    })
    return () => sub.unsubscribe()
  }, [watch, getValues])

  return (
    <form onSubmit={handleSubmit(console.log)} className="space-y-4 max-w-xs">
      <p className="text-xs text-gray-400">Parent renders: {renders.current}</p>

      {/* 1. Conditional UI via watch */}
      <select {...register('billingType')}
              className="w-full border rounded-lg px-3 py-2 text-sm">
        <option value="personal">Personal</option>
        <option value="business">Business</option>
      </select>
      {billingType === 'business' && (
        <input {...register('companyName', { required: 'Required for business' })}
               placeholder="Company name"
               className="w-full border rounded-lg px-3 py-2 text-sm" />
      )}

      <input {...register('quantity',  { valueAsNumber: true, min: 1 })}
             type="number" placeholder="Qty"
             className="w-full border rounded-lg px-3 py-2 text-sm" />
      <input {...register('unitPrice', { valueAsNumber: true, min: 0 })}
             type="number" step="0.01" placeholder="Unit price"
             className="w-full border rounded-lg px-3 py-2 text-sm" />

      {/* 2. Isolated RunningTotal child */}
      <RunningTotal control={control} />

      {/* 4. Country change triggers console log via callback */}
      <select {...register('country')}
              className="w-full border rounded-lg px-3 py-2 text-sm">
        <option value="US">United States</option>
        <option value="PH">Philippines</option>
        <option value="GB">United Kingdom</option>
      </select>

      <div className="flex gap-3">
        {/* 3. getValues in handler — no subscription */}
        <button type="button"
                onClick={() => console.log('Draft:', getValues())}
                className="flex-1 py-2 border rounded-lg text-sm">
          Save draft
        </button>
        <button type="submit"
                className="flex-1 py-2 bg-blue-600 text-white rounded-lg text-sm font-semibold">
          Checkout
        </button>
      </div>
    </form>
  )
}
```

---

## ✅ Day 2 Complete — RHF State, Observation, and Imperative Control

| # | Subtopic | Status |
|---|----------|--------|
| 1  | `formState` — The Proxy and What It Tracks | ☐ |
| 2  | `errors` — Field, Nested, and Root Errors | ☐ |
| 3  | `touched` and `dirty` — User Interaction Tracking | ☐ |
| 4  | `watch` — Reactive Value Subscription | ☐ |
| 5  | `useWatch` — Isolated Component Re-renders | ☐ |
| 6  | `getValues` — Reading Values On Demand | ☐ |
| 7  | `setValue` — Programmatic Field Updates | ☐ |
| 8  | `trigger` — Manual Validation Control | ☐ |
| 9  | `setError` and `clearErrors` — Manual Error Management | ☐ |
| 10 | `reset` and `resetField` — Form and Field Reset | ☐ |
| 11 | Subscribe vs Read On Demand — The Decision Model | ☐ |

---

## 🗺️ One-Page Mental Model — Day 2

```
formState (PROXY — subscribe only to what you access)
  errors            → FieldErrors<T>, errors.root for server errors
  isSubmitting      → true while async onValid runs
  isSubmitted       → true after first submit attempt
  isSubmitSuccessful→ true after clean submit
  submitCount       → number of attempts
  isDirty           → any field ≠ defaultValues (deep compare)
  isValid           → no errors (only live with onChange/onBlur mode)
  isLoading         → true while async defaultValues resolves
  touchedFields     → { field: true } — user focused + blurred
  dirtyFields       → { field: true } — value ≠ defaultValues

errors
  errors.field.message  → string
  errors.field.type     → 'required' | 'minLength' | 'server' | ...
  errors.root.message   → non-field server error
  criteriaMode: 'all'   → errors.field.types = { rule: message }

touched + dirty
  touchedFields     → interacted (focused+blurred), value may be same
  dirtyFields       → value actually changed from default
  isDirty           → gating save buttons, navigation guards
  reset(data)       → always call after save to reset baseline

OBSERVATION — decision tree:
  Real-time JSX in same component?    → watch('field')
  Real-time JSX in child component?   → useWatch({ control, name })
  Read in handler/callback/effect?    → getValues('field')
  Side effect on change, no render?   → watch((v, {name}) => ...)

watch('field')          → re-renders PARENT per keystroke
useWatch({ name })      → re-renders CHILD only per keystroke
getValues('field')      → 0 re-renders, one-time read
watch callback          → 0 re-renders, side effect subscription

IMPERATIVE API
  setValue('f', v, opts)    → opts: shouldDirty, shouldValidate, shouldTouch
  trigger('f')              → async, returns Promise<boolean>
  trigger(['f1','f2'])      → validate multiple fields (wizard step check)
  trigger()                 → validate all fields
  setError('f', { type, message })  → inject server errors
  setError('root', { message })     → non-field errors
  clearErrors('f')          → remove one/many/all errors
  reset()                   → restore to defaultValues, clear all state
  reset(newValues)          → new values become new defaultValues
  resetField('f')           → reset single field to its defaultValue
  resetField('f', { defaultValue }) → reset to specific value

PATTERNS
  Cross-field validate:  validate: v => v === getValues('password') || 'No match'
  Wizard step:           const ok = await trigger(['f1','f2']); if (ok) setStep(2)
  Server error:          setError('email', { type: 'server', message: '...' })
  Clear server on type:  watch callback → clearErrors when type === 'server'
  Save and continue:     reset(serverResponse)  // new baseline, isDirty → false
  Navigation guard:      useEffect → window.addEventListener('beforeunload')
  Load server data:      useEffect(() => { if (data) reset(data) }, [data, reset])
```

> **Your next action:** Open any existing form. Find one `useState` holding a cross-field value (like "confirm password"). Replace the `watch` or state read inside the `validate` function with `getValues('password')`. Run the form, notice the reduced re-renders, and move on.
>
> *Doing one small thing beats opening a feed.*