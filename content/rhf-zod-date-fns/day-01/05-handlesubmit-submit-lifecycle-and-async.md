# 5 — `handleSubmit` — Submit Lifecycle and Async

---

## T — TL;DR

`handleSubmit(onValid, onInvalid?)` wraps your submit handler — it calls `preventDefault`, runs all validation, and only calls `onValid` if the form passes. During async submission, `formState.isSubmitting` is `true`. Errors from the server can be set manually with `setError`.

---

## K — Key Concepts

```tsx
const { handleSubmit, setError, formState: { isSubmitting, errors } } = useForm<T>()

// ─── Basic signature
<form onSubmit={handleSubmit(onValid, onInvalid)}>

// onValid(data, event)    — called when ALL validation passes
// onInvalid(errors, event)— called when ANY validation fails (optional)
```

```tsx
// ─── Async submit with server error handling
async function onValid(data: FormData) {
  // isSubmitting = true while this function is running ✅
  try {
    await api.createUser(data)
    router.push('/dashboard')
  } catch (err) {
    if (err.code === 'EMAIL_TAKEN') {
      // Set server-side error on a specific field
      setError('email', {
        type:    'server',
        message: 'This email is already registered'
      })
      return
    }
    // Set a root-level error for non-field errors
    setError('root', {
      type:    'server',
      message: 'Something went wrong. Please try again.'
    })
  }
  // isSubmitting = false when this function returns/throws ✅
}

// ─── onInvalid — optional, runs when form has errors
function onInvalid(errors: FieldErrors<FormData>) {
  console.log('Validation failed:', errors)
  // Useful for: analytics (which fields fail most), scroll to first error
}
```

```tsx
// ─── Accessing root error
{errors.root && (
  <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">
    {errors.root.message}
  </div>
)}

// ─── formState flags during submit lifecycle
formState.isSubmitting      // true while handleSubmit's async fn is running
formState.isSubmitted       // true after first submit attempt
formState.isSubmitSuccessful// true after successful submit (no errors thrown)
formState.submitCount       // number of times form was submitted
```

---

## W — Why It Matters

- `handleSubmit` removes the boilerplate of `e.preventDefault()` and manual validation checks — it only calls your handler when the form is valid, so your submit function only contains the happy path logic.
- `setError('root', ...)` for server errors is the correct pattern — it keeps error state inside RHF instead of a separate `useState`, and it's automatically cleared when the user corrects input and re-submits.
- `isSubmitting` is automatic — it's `true` for the entire duration of your async `onValid` function, including awaited API calls. No manual `setLoading` state needed.

---

## I — Interview Q&A

### Q: How do you handle server-side validation errors in React Hook Form?

**A:** After a failed API call in the `handleSubmit` callback, call `setError('fieldName', { type: 'server', message: 'Error text' })`. This adds the error to `formState.errors` like a normal validation error. For non-field errors (e.g. "Service unavailable"), use `setError('root', { type: 'server', message: '...' })` and render `errors.root?.message` outside the field list. Both are cleared when the user resubmits or manually calls `clearErrors`.

---

## C — Common Pitfalls + Fix

### ❌ Calling the submit function directly instead of wrapping with `handleSubmit`

```tsx
// ❌ Bypasses validation and isSubmitting state
<form onSubmit={onSubmit}>

// ❌ Also wrong — calling directly in onClick
<button onClick={() => onSubmit()}>Submit</button>
```

**Fix:** Always use `handleSubmit`:

```tsx
// ✅ Validation runs, isSubmitting is managed
<form onSubmit={handleSubmit(onSubmit)}>
```

---

## K — Coding Challenge + Solution

### Challenge

Build a login form that: runs async submit (1s delay), shows `isSubmitting` spinner, simulates a server error ("Invalid credentials") on `onSubmit`, and displays a `root` error banner. Clears root error when user retypes.

### Solution

```tsx
'use client'
import { useForm } from 'react-hook-form'

type Fields = { email: string; password: string }

export function LoginWithServerError() {
  const {
    register, handleSubmit,
    setError, formState: { errors, isSubmitting }
  } = useForm<Fields>()

  async function onSubmit(data: Fields) {
    await new Promise(r => setTimeout(r, 1000))
    // Simulate wrong credentials
    setError('root', { type: 'server', message: 'Invalid email or password.' })
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 max-w-sm">
      {errors.root && (
        <div className="px-4 py-3 bg-red-50 border border-red-200 rounded-xl
                         text-sm text-red-700">
          {errors.root.message}
        </div>
      )}
      <input {...register('email',    { required: 'Required' })}
             type="email" placeholder="Email"
             className="w-full border rounded-lg px-3 py-2 text-sm" />
      <input {...register('password', { required: 'Required' })}
             type="password" placeholder="Password"
             className="w-full border rounded-lg px-3 py-2 text-sm" />
      <button type="submit" disabled={isSubmitting}
              className="w-full py-2.5 bg-blue-600 text-white rounded-lg
                          text-sm font-semibold disabled:opacity-50">
        {isSubmitting ? '⟳ Signing in…' : 'Sign in'}
      </button>
    </form>
  )
}
```

---

---
