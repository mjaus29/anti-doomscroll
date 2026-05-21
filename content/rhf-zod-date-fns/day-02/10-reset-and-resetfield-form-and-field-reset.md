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
