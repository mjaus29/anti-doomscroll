# 7 — `defaultValues` — Static, Async, Reset Behaviour

---

## T — TL;DR

`defaultValues` sets initial field values, powers `isDirty` comparison, and defines what `reset()` returns the form to. Pass a `Promise` for async defaults (e.g. fetching user data from an API). Always provide `defaultValues` for TypeScript forms — it prevents uncontrolled-to-controlled input warnings.

---

## K — Key Concepts

```tsx
// ─── Static defaultValues
useForm<ProfileForm>({
  defaultValues: {
    name:    'Mark',
    email:   'mark@example.com',
    role:    'admin',
    active:  true,
    score:   0
  }
})

// ─── Async defaultValues (fetch user data)
// RHF accepts a Promise — form is in loading state until resolved
useForm<ProfileForm>({
  defaultValues: async () => {
    const user = await fetch('/api/me').then(r => r.json())
    return {
      name:  user.name,
      email: user.email,
      role:  user.role
    }
  }
})
// While Promise is pending: formState.isLoading = true
// Once resolved: fields populate with fetched values
```

```tsx
// ─── reset() — restore to defaultValues or new values
const { reset, formState: { isDirty } } = useForm<T>({ defaultValues: {...} })

// Reset to original defaultValues:
reset()

// Reset to NEW values (e.g. after successful save):
reset({ name: updatedUser.name, email: updatedUser.email })

// Reset with options:
reset(undefined, {
  keepErrors:     false, // clear errors (default)
  keepDirty:      false, // reset dirty state
  keepValues:     false, // don't keep current values
  keepDefaultValues: false
})

// ─── isDirty — true when current values differ from defaultValues
// isDirty uses deep comparison — works with nested objects and arrays
console.log(isDirty)  // false initially, true when user changes anything
```

```tsx
// ─── Using reset after successful server save (common pattern)
async function onSubmit(data: ProfileForm) {
  const saved = await api.updateProfile(data)
  // Reset to saved values — marks form as clean again
  // isDirty becomes false ✅
  reset(saved)
}
```

---

## W — Why It Matters

- Without `defaultValues`, fields start as `undefined` — React warns about inputs switching from uncontrolled to controlled when values load. Providing defaults prevents this and ensures consistent initial state.
- `isDirty` only works correctly when `defaultValues` are set — RHF compares the current form value against `defaultValues` to determine dirtiness. Without defaults, everything is always "dirty".
- `reset(serverResponse)` after a successful save is the pattern for "save and continue editing" — it updates the baseline for `isDirty` tracking without clearing the form.

---

## I — Interview Q&A

### Q: How do you pre-populate a form with data from an API in React Hook Form?

**A:** Two approaches. Option 1: pass an async function to `defaultValues` — `useForm({ defaultValues: async () => fetch('/api/user').then(r => r.json()) })`. RHF waits for the promise and populates the form when resolved; `formState.isLoading` is `true` in the meantime. Option 2: fetch outside RHF and call `reset(data)` when data arrives — `useEffect(() => { if (user) reset(user) }, [user, reset])`. The second approach gives more control over loading state but requires care to call `reset` only when data is ready and not on every render.

---

## C — Common Pitfalls + Fix

### ❌ Calling `reset(data)` inside `useEffect` without the `reset` in deps

```tsx
// ❌ reset reference changes on every render if not memoised — ESLint warning
useEffect(() => { reset(userData) }, [userData]) // missing reset
```

**Fix:** Include `reset` in dependencies (it's stable — won't cause extra effects):

```tsx
// ✅ Include reset — it's a stable reference from RHF
useEffect(() => {
  if (userData) reset(userData)
}, [userData, reset])
```

---

## K — Coding Challenge + Solution

### Challenge

Build a `<ProfileEditForm>` that fetches user data via async `defaultValues`, shows `isLoading` state while loading, and calls `reset(savedData)` after submit so `isDirty` becomes false on success.

### Solution

```tsx
'use client'
import { useForm } from 'react-hook-form'

type Profile = { name: string; email: string; bio: string }

// Mock API fetch
const fetchProfile = (): Promise<Profile> =>
  new Promise(r => setTimeout(() =>
    r({ name: 'Mark Austin', email: 'mark@example.com', bio: 'Developer' })
  , 800))

export function ProfileEditForm() {
  const {
    register, handleSubmit, reset,
    formState: { errors, isSubmitting, isDirty, isLoading }
  } = useForm<Profile>({ defaultValues: fetchProfile })

  async function onSubmit(data: Profile) {
    await new Promise(r => setTimeout(r, 1000)) // mock save
    reset(data)  // update baseline — isDirty → false ✅
    console.log('Saved:', data)
  }

  if (isLoading) {
    return <p className="text-sm text-gray-500">Loading profile…</p>
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 max-w-sm">
      <input {...register('name',  { required: 'Required' })}
             placeholder="Name"
             className="w-full border rounded-lg px-3 py-2 text-sm" />
      <input {...register('email', { required: 'Required' })}
             type="email" placeholder="Email"
             className="w-full border rounded-lg px-3 py-2 text-sm" />
      <textarea {...register('bio')} placeholder="Bio"
                className="w-full border rounded-lg px-3 py-2 text-sm" />

      <div className="flex items-center gap-3">
        <button type="submit" disabled={isSubmitting || !isDirty}
                className="px-5 py-2.5 bg-blue-600 text-white rounded-lg
                            text-sm font-semibold disabled:opacity-50">
          {isSubmitting ? 'Saving…' : 'Save changes'}
        </button>
        {!isDirty && (
          <span className="text-xs text-green-600 font-medium">✓ Up to date</span>
        )}
      </div>
    </form>
  )
}
```

---

---
