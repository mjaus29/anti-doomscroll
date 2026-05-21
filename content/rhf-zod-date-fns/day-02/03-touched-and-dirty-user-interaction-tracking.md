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
