# 8 — RHF's Low Re-render Mental Model

---

## T — TL;DR

RHF uses an internal store (not React state) to track field values. Your component only re-renders when **`formState` properties you've subscribed to change** — not on every keystroke. This is powered by a JavaScript `Proxy` on `formState` that tracks which properties you access.

---

## K — Key Concepts

```
RHF's internal architecture:

  ┌──────────────────────────────────────────────┐
  │              useForm() internal store         │
  │                                               │
  │  _fields:    { name: ref, email: ref }        │  ← DOM refs (no React state)
  │  _formValues: { name: 'Mark', email: '' }     │  ← plain JS object
  │  _errors:    { email: FieldError }            │  ← triggers re-render on change
  │  _dirtyFields: { name: true }                 │  ← triggers re-render when accessed
  │                                               │
  └──────────────────────────────────────────────┘

  formState is a PROXY:
    - Accessing formState.errors   → subscribes to error changes
    - Accessing formState.isDirty  → subscribes to dirty changes
    - Accessing formState.isValid  → subscribes to validity changes
    - NOT accessing a property     → NO subscription, NO re-render for it
```

```tsx
// ─── Re-render experiment — add render counter
let count = 0
function MyForm() {
  count++

  const { register, handleSubmit, formState: { errors } } = useForm<T>()
  // ↑ We accessed ONLY errors from formState
  // ↑ So this component re-renders ONLY when errors change

  console.log('Renders:', count)
  // While typing: count stays at 1 ✅ (no re-render per keystroke)
  // On submit with errors: count goes to 2 (errors changed)
  // On submit success: count goes to 3 (errors cleared)

  return (
    <form onSubmit={handleSubmit(console.log)}>
      <input {...register('name', { required: 'Required' })} />
      {errors.name && <p>{errors.name.message}</p>}
      <button type="submit">Submit</button>
    </form>
  )
}
```

```tsx
// ─── What causes re-renders (and what doesn't)

// ✅ DOES cause re-render:
formState.errors       // when an error is added or removed
formState.isDirty      // when dirty state changes
formState.isSubmitting // when submit starts/ends
formState.isValid      // when validity changes (only with mode !== 'onSubmit')
watch('fieldName')     // every keystroke on that field

// ✅ Does NOT cause re-render:
register('field')      // just attaches ref
getValues('field')     // reads value without subscribing
handleSubmit(fn)       // just wraps the function

// ─── Isolating re-renders to child components
// Extract error display to a separate component — only that re-renders
function FieldError({ error }: { error?: FieldError }) {
  return error ? <p className="text-xs text-red-600">{error.message}</p> : null
}

// ─── FormProvider — share form instance without prop drilling
import { FormProvider, useFormContext } from 'react-hook-form'

function ParentForm() {
  const methods = useForm<T>()
  return (
    <FormProvider {...methods}>
      <form onSubmit={methods.handleSubmit(console.log)}>
        <ChildInput name="email" />  {/* accesses useFormContext() */}
        <button type="submit">Submit</button>
      </form>
    </FormProvider>
  )
}

function ChildInput({ name }: { name: string }) {
  const { register, formState: { errors } } = useFormContext()
  return <input {...register(name, { required: 'Required' })} />
}
```

---

## W — Why It Matters

- The Proxy-based subscription model is why RHF outperforms Formik (which re-renders on every change) in benchmark tests. In forms with 20+ fields or forms inside performance-critical dashboards, this difference is observable.
- `watch()` is the escape hatch for reactive values — use it deliberately. Each `watch` call subscribes that field to re-renders. In a 10-field form, `watch()` (all fields) causes 10 re-renders per character.
- `FormProvider` enables the component architecture pattern — large forms split into `<PersonalInfo />`, `<AddressSection />`, `<PaymentDetails />` sub-components, each using `useFormContext()` to access the shared form instance without prop drilling.

---

## I — Interview Q&A

### Q: How does React Hook Form minimise re-renders compared to Formik or a `useState`-based approach?

**A:** RHF stores field values in a plain JavaScript object and reads them via DOM refs — not React state. Keystrokes update the internal store but don't trigger `setState`, so no re-render occurs. The `formState` object is a JavaScript Proxy that tracks which properties your component accesses. Only when those specific properties change (e.g. `errors` when a new validation error appears) does RHF schedule a re-render. Formik stores all values in React state and calls `setState` on every change, causing re-renders on every keystroke. A 10-field Formik form renders ~10 times per character typed; the same form in RHF renders 0 times per character.

### Q: What does `FormProvider` do and when do you need it?

**A:** `FormProvider` is a React context provider that makes the `useForm` instance available to any descendant component via `useFormContext()`. Use it when a form is split across multiple components and you want to avoid passing `register`, `control`, and `formState` as props down multiple levels. It's particularly useful for wizard/multi-step forms where each step is a separate component, or for large forms split into logical sections.

---

## C — Common Pitfalls + Fix

### ❌ Spreading `formState` into a new object — breaks the Proxy

```tsx
// ❌ Spreading destroys the Proxy — RHF can't track which properties
//    you accessed, so it re-renders on ALL formState changes
const state = { ...formState }
const { errors } = state
```

**Fix:** Destructure directly from `formState`:

```tsx
// ✅ Proxy intact — only re-renders when errors changes
const { formState: { errors, isSubmitting } } = useForm<T>()
```

---

## K — Coding Challenge + Solution

### Challenge

Build a `<MultiSectionForm>` using `FormProvider` + `useFormContext` split across three child components: `<NameSection>`, `<ContactSection>`, `<SubmitSection>`. Prove the architecture works — submit logs all fields. Each section only re-renders when its own errors change.

### Solution

```tsx
// src/components/multi-section-form.tsx
'use client'
import { useForm, FormProvider, useFormContext } from 'react-hook-form'

type Fields = {
  firstName: string; lastName: string
  email: string;    phone: string
}

// ─── Child sections — access form via useFormContext
function NameSection() {
  const { register, formState: { errors } } = useFormContext<Fields>()
  return (
    <fieldset className="space-y-3 border rounded-xl p-4">
      <legend className="text-xs font-semibold text-gray-500 uppercase px-1">
        Name
      </legend>
      <input {...register('firstName', { required: 'Required' })}
             placeholder="First name"
             className="w-full border rounded-lg px-3 py-2 text-sm" />
      {errors.firstName && (
        <p className="text-xs text-red-600">{errors.firstName.message}</p>
      )}
      <input {...register('lastName',  { required: 'Required' })}
             placeholder="Last name"
             className="w-full border rounded-lg px-3 py-2 text-sm" />
      {errors.lastName && (
        <p className="text-xs text-red-600">{errors.lastName.message}</p>
      )}
    </fieldset>
  )
}

function ContactSection() {
  const { register, formState: { errors } } = useFormContext<Fields>()
  return (
    <fieldset className="space-y-3 border rounded-xl p-4">
      <legend className="text-xs font-semibold text-gray-500 uppercase px-1">
        Contact
      </legend>
      <input {...register('email', { required: 'Required' })}
             type="email" placeholder="Email"
             className="w-full border rounded-lg px-3 py-2 text-sm" />
      {errors.email && (
        <p className="text-xs text-red-600">{errors.email.message}</p>
      )}
      <input {...register('phone')} placeholder="Phone (optional)"
             className="w-full border rounded-lg px-3 py-2 text-sm" />
    </fieldset>
  )
}

function SubmitSection() {
  const { formState: { isSubmitting, isDirty } } = useFormContext<Fields>()
  return (
    <button type="submit" disabled={isSubmitting || !isDirty}
            className="w-full py-2.5 bg-blue-600 text-white rounded-lg
                        text-sm font-semibold disabled:opacity-50">
      {isSubmitting ? 'Submitting…' : 'Submit'}
    </button>
  )
}

// ─── Parent — provides form context
export function MultiSectionForm() {
  const methods = useForm<Fields>({
    defaultValues: { firstName: '', lastName: '', email: '', phone: '' },
    mode: 'onTouched'
  })

  return (
    <FormProvider {...methods}>
      <form onSubmit={methods.handleSubmit(data => console.log(data))}
            className="space-y-4 max-w-sm">
        <NameSection />
        <ContactSection />
        <SubmitSection />
      </form>
    </FormProvider>
  )
}
```

---

## ✅ Day 1 Complete — RHF Foundations

| # | Subtopic | Status |
|---|----------|--------|
| 1 | React Form Architecture | ☐ |
| 2 | Uncontrolled vs Controlled Inputs | ☐ |
| 3 | `useForm` — Setup, Options, Return Values | ☐ |
| 4 | `register` — Registering Inputs and Options | ☐ |
| 5 | `handleSubmit` — Submit Lifecycle and Async | ☐ |
| 6 | Validation Modes | ☐ |
| 7 | `defaultValues` — Static, Async, Reset | ☐ |
| 8 | Low Re-render Mental Model | ☐ |

---

## 🗺️ One-Page Mental Model — Day 1

```
ARCHITECTURE
  RHF = refs + internal store, NOT useState per field
  Typing → DOM only → no React re-render ✅
  Re-renders only when formState properties you accessed change

useForm<T>(options)
  defaultValues  → initial state, reset() target, isDirty baseline
  mode           → when first error shows (onSubmit | onBlur | onChange | onTouched | all)
  reValidateMode → after error shown, when to re-validate (onChange default)
  resolver       → Zod/Yup schema (Day 2)

register('field', rules)
  Returns: { name, ref, onChange, onBlur } → spread onto <input>
  Rules: required, min, max, minLength, maxLength, pattern, validate
  Transforms: valueAsNumber, valueAsDate, setValueAs
  validate: fn | { key: fn } — supports async

handleSubmit(onValid, onInvalid?)
  → preventDefault automatically
  → runs all validation
  → calls onValid only if valid
  → isSubmitting = true while onValid is running
  → setError('root', { message }) for server errors

formState (Proxy — only subscribe to what you access)
  errors          → field errors, errors.root for non-field errors
  isSubmitting    → true during async onValid
  isDirty         → current !== defaultValues (deep compare)
  isValid         → all valid (only live with mode !== 'onSubmit')
  isLoading       → true while async defaultValues resolves
  submitCount     → number of submit attempts

PATTERNS
  watch('field')        → reactive value, causes re-render per keystroke
  getValues('field')    → one-time read, no re-render
  reset(data)           → restore form + update isDirty baseline
  setError('field', {}) → inject server errors into formState
  FormProvider + useFormContext → share form across components
```

> **Your next action:** Open your project. Install `react-hook-form`. Convert one existing `useState` form to `useForm` + `register` + `handleSubmit`. Add `mode: 'onTouched'` and watch the UX improve immediately.
>
> *Doing one small thing beats opening a feed.*
