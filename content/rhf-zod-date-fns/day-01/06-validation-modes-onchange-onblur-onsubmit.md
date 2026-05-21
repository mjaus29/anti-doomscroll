# 6 — Validation Modes — `onChange`, `onBlur`, `onSubmit`

---

## T — TL;DR

`mode` controls **when** validation first runs. `reValidateMode` controls **when** it runs again after a field has already shown an error. The right combination determines whether your form feels responsive or frustrating.

---

## K — Key Concepts

```tsx
// ─── The 5 modes
useForm({ mode: 'onSubmit'  }) // default — validate only on submit
useForm({ mode: 'onBlur'    }) // validate when field loses focus
useForm({ mode: 'onChange'  }) // validate on every keystroke
useForm({ mode: 'onTouched' }) // validate on blur, then switch to onChange
useForm({ mode: 'all'       }) // onChange + onBlur combined

// ─── reValidateMode (after error is shown, when to re-run)
useForm({
  mode:           'onBlur',   // first validation: on blur
  reValidateMode: 'onChange'  // after error shown: re-validate on every keystroke
})
```

```
Mode behaviour comparison:

mode:           First error shown when:
─────────────────────────────────────────
onSubmit        User clicks Submit
onBlur          User leaves the field
onChange        Every keystroke
onTouched       First time on blur, then on every change
all             Both blur AND change

Best practice recommendation:
  mode: 'onTouched'    → best UX: no error until user interacts,
                          then immediate feedback once they do
  reValidateMode: 'onChange' → error clears as soon as user fixes it
```

```tsx
// ─── Per-field mode override (register-level)
// There's no per-field mode — but you can use trigger() manually

// Example: validate a field programmatically after async check
const { trigger } = useForm({ mode: 'onSubmit' })

<input
  {...register('username')}
  onBlur={() => trigger('username')}  // manual trigger on blur only
/>

// ─── Checking formState.isValid
// Only accurate when mode !== 'onSubmit'
// With mode: 'onSubmit', isValid is false until first submit attempt
const { formState: { isValid } } = useForm({ mode: 'onChange' })
<button type="submit" disabled={!isValid}>Submit</button>
// ⚠️ Only do this with mode: 'onChange' or 'all'
// With mode: 'onSubmit', isValid is always false before first submit
```

---

## W — Why It Matters

- `mode: 'onSubmit'` (default) is best for simple forms where errors on every keystroke would be noisy. `mode: 'onTouched'` is best for longer forms where immediate feedback after blurring a field improves completion rates.
- The `mode` + `reValidateMode` combination is key: `mode: 'onBlur'` + `reValidateMode: 'onChange'` means errors appear after blur but clear in real-time as the user fixes them — the most common production UX pattern.
- Never disable the submit button with `disabled={!isValid}` when `mode: 'onSubmit'` — `isValid` will be `false` before the first submission attempt because no validation has run yet.

---

## I — Interview Q&A

### Q: What is the difference between `mode` and `reValidateMode` in `useForm`?

**A:** `mode` controls when validation runs for the **first time** on a field — before any error has been shown. `reValidateMode` controls when validation re-runs **after** a field has already shown an error. The common pattern is `mode: 'onBlur'` (show error when user leaves the field) + `reValidateMode: 'onChange'` (re-validate on every keystroke once the error is shown, so it clears in real time as the user fixes it). This gives the smoothest UX — no premature errors, but immediate feedback once the user has made a mistake.

---

## C — Common Pitfalls + Fix

### ❌ Using `disabled={!isValid}` with `mode: 'onSubmit'`

```tsx
// ❌ Button is always disabled before first submit — user can't submit
const { formState: { isValid } } = useForm({ mode: 'onSubmit' })
<button disabled={!isValid}>Submit</button>
```

**Fix:** Either switch to `mode: 'onChange'` or don't use `disabled={!isValid}` at all:

```tsx
// ✅ Only block on isSubmitting
<button disabled={isSubmitting}>Submit</button>

// ✅ Or use onChange mode if you want real-time validity
const form = useForm({ mode: 'onChange' })
```

---

## K — Coding Challenge + Solution

### Challenge

Build a password change form using `mode: 'onTouched'` + `reValidateMode: 'onChange'`. Fields: `current`, `next` (min 8), `confirm` (must match `next`). Show errors only after blur, clear in real-time on fix.

### Solution

```tsx
'use client'
import { useForm } from 'react-hook-form'

type Fields = { current: string; next: string; confirm: string }

export function PasswordChangeForm() {
  const {
    register, handleSubmit, watch,
    formState: { errors }
  } = useForm<Fields>({
    mode:           'onTouched',
    reValidateMode: 'onChange'
  })

  const nextPw = watch('next')
  const cls    = 'w-full border rounded-lg px-3 py-2 text-sm'
  const errCls = 'text-xs text-red-600 mt-1'

  return (
    <form onSubmit={handleSubmit(console.log)} className="space-y-4 max-w-sm">
      <div>
        <input {...register('current', { required: 'Required' })}
               type="password" placeholder="Current password" className={cls} />
        {errors.current && <p className={errCls}>{errors.current.message}</p>}
      </div>
      <div>
        <input {...register('next', {
          required:  'Required',
          minLength: { value: 8, message: 'Min 8 characters' }
        })} type="password" placeholder="New password" className={cls} />
        {errors.next && <p className={errCls}>{errors.next.message}</p>}
      </div>
      <div>
        <input {...register('confirm', {
          required: 'Required',
          validate: v => v === nextPw || 'Passwords do not match'
        })} type="password" placeholder="Confirm password" className={cls} />
        {errors.confirm && <p className={errCls}>{errors.confirm.message}</p>}
      </div>
      <button type="submit"
              className="w-full py-2.5 bg-blue-600 text-white rounded-lg text-sm font-semibold">
        Update password
      </button>
    </form>
  )
}
```

---

---
