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
