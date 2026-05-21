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
