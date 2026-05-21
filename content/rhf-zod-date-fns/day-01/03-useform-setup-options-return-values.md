# 3 — `useForm` — Setup, Options, Return Values

---

## T — TL;DR

`useForm<T>()` initialises the form instance. Pass a generic type for full TypeScript inference. The most important options upfront: `defaultValues`, `mode` (validation timing), and `resolver` (for Zod schema validation on Day 2+).

---

## K — Key Concepts

```tsx
import { useForm } from 'react-hook-form'

// ─── Full type signature (simplified)
const {
  // Registration
  register,          // attach to native inputs
  control,           // pass to Controller for non-native inputs

  // Submission
  handleSubmit,      // wraps onSubmit — reads all values, runs validation

  // State
  formState,         // errors, isSubmitting, isDirty, isValid, touchedFields, dirtyFields

  // Values
  watch,             // subscribe to value changes (causes re-renders)
  getValues,         // read values without subscribing
  setValue,          // programmatically set a field value
  resetField,        // reset a single field

  // Form-level
  reset,             // reset entire form to defaultValues (or new values)
  setError,          // manually set an error (e.g. from server)
  clearErrors,       // clear one or all errors
  trigger,           // manually trigger validation
  setFocus,          // programmatically focus a field
} = useForm<FormData>({
  // ─── Options
  defaultValues: {   // initial values — also used by reset()
    name:  '',
    email: '',
    role:  'user'
  },

  mode: 'onBlur',    // when validation runs:
                     // 'onSubmit' (default) | 'onBlur' | 'onChange' | 'onTouched' | 'all'

  reValidateMode: 'onChange', // after first error, when to re-validate
                               // 'onChange' (default) | 'onBlur' | 'onSubmit'

  resolver: undefined, // zodResolver(schema) — covered on Day 2

  criteriaMode: 'firstError', // 'firstError' (default) | 'all'
                               // 'all' collects all errors per field
  shouldFocusError: true,      // auto-focus first error field on submit
})
```

```tsx
// ─── TypeScript integration — define your form shape
type LoginForm = {
  email:    string
  password: string
  remember: boolean
}

const { register, handleSubmit, formState: { errors } } = useForm<LoginForm>({
  defaultValues: { email: '', password: '', remember: false }
})

// Now register('email') is type-safe — only accepts keys of LoginForm
// errors.email is typed as FieldError | undefined
// errors.nonExistentField → TypeScript error ✅
```

---

## W — Why It Matters

- Passing the generic `useForm<T>()` gives you **full TypeScript inference** throughout — `register`, `errors`, `getValues`, `setValue` all become type-safe. Without it, everything is `any`.
- `defaultValues` is not just for showing initial data — it also controls what `reset()` restores the form to, powers `isDirty` comparison (current value vs default), and determines the initial `isValid` state for `mode: 'all'`.
- `shouldFocusError: true` (default) is an accessibility win — on submit with errors, focus jumps to the first invalid field automatically, helping keyboard users.

---

## I — Interview Q&A

### Q: What is the difference between `watch` and `getValues` in RHF?

**A:** `watch('field')` subscribes to a field's value and causes a re-render every time that field changes — used for reactive conditional UI. `getValues('field')` reads the current value from the internal store without subscribing — no re-render. Use `getValues` when you need a value in an event handler or callback where you don't need the component to re-render on every change (e.g. reading a value on a button click to pass to an API call).

---

## C — Common Pitfalls + Fix

### ❌ Destructuring `formState` directly destroys its proxy optimisation

```tsx
// ❌ Destructuring the whole formState before accessing properties
// breaks RHF's proxy — may cause unnecessary re-renders
const { formState } = useForm()
const { errors } = formState  // ✅ this is fine
// But:
const wholeState = { ...formState }  // ❌ spread breaks the proxy
```

**Fix:** Destructure specific properties directly:

```tsx
// ✅ Proxy-safe destructuring
const { formState: { errors, isSubmitting, isDirty } } = useForm<T>()
```

---

## K — Coding Challenge + Solution

### Challenge

Create a typed `useForm<LoginForm>` with `defaultValues`, extract `errors` and `isSubmitting` from `formState`, and disable the submit button while submitting.

### Solution

```tsx
'use client'
import { useForm } from 'react-hook-form'

type LoginForm = { email: string; password: string }

export function LoginForm() {
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting }
  } = useForm<LoginForm>({
    defaultValues: { email: '', password: '' },
    mode: 'onBlur'
  })

  async function onSubmit(data: LoginForm) {
    await new Promise(r => setTimeout(r, 1500)) // mock API
    console.log(data)
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 max-w-sm">
      <div>
        <input {...register('email', { required: 'Email is required' })}
               type="email" placeholder="Email"
               className="w-full border rounded-lg px-3 py-2 text-sm" />
        {errors.email && (
          <p className="text-xs text-red-600 mt-1">{errors.email.message}</p>
        )}
      </div>
      <div>
        <input {...register('password', { required: 'Password is required' })}
               type="password" placeholder="Password"
               className="w-full border rounded-lg px-3 py-2 text-sm" />
        {errors.password && (
          <p className="text-xs text-red-600 mt-1">{errors.password.message}</p>
        )}
      </div>
      <button type="submit" disabled={isSubmitting}
              className="w-full py-2.5 bg-blue-600 text-white rounded-lg text-sm
                          font-semibold disabled:opacity-50 disabled:cursor-wait">
        {isSubmitting ? 'Signing in…' : 'Sign in'}
      </button>
    </form>
  )
}
```

---

---
