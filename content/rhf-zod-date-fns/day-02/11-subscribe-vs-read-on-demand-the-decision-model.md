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
