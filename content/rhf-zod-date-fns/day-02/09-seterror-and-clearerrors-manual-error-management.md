# 9 — `setError` and `clearErrors` — Manual Error Management

---

## T — TL;DR

`setError('field', { type, message })` injects an error into `formState.errors` — used for server-side errors that RHF can't detect at validation time. `clearErrors('field')` removes errors manually. Both enable two-way error management: RHF-driven + server-driven.

---

## K — Key Concepts

```tsx
const { setError, clearErrors } = useForm<T>()

// ─── setError: inject an error into formState
setError('email', {
  type:    'server',            // custom type string
  message: 'Email already taken'
})

// ─── Named root errors (multiple non-field errors)
setError('root.serverError', {
  type:    '500',
  message: 'Internal server error. Please try again.'
})
setError('root.networkError', {
  type:    'network',
  message: 'No internet connection.'
})

// ─── clearErrors: remove manually set errors
clearErrors('email')          // clear one field
clearErrors(['email', 'name'])// clear multiple
clearErrors()                  // clear ALL errors

// ─── shouldFocus option: focus the field after setting error
setError('email', { type: 'server', message: 'Taken' }, { shouldFocus: true })
```

```tsx
// ─── Full server error pattern in handleSubmit
async function onSubmit(data: RegisterForm) {
  try {
    await api.register(data)
    router.push('/dashboard')
  } catch (err: any) {
    switch (err.code) {
      case 'EMAIL_TAKEN':
        setError('email', { type: 'server', message: 'Email is already registered.' },
                 { shouldFocus: true })
        break
      case 'USERNAME_TAKEN':
        setError('username', { type: 'server', message: 'Username is taken.' })
        break
      default:
        setError('root', { type: 'server', message: 'Something went wrong.' })
    }
  }
}

// ─── Clear server error when user corrects the field
// Use watch callback — clear when field changes after server error
useEffect(() => {
  const sub = watch((_, { name }) => {
    if (name && errors[name as keyof T]?.type === 'server') {
      clearErrors(name as keyof T)
    }
  })
  return () => sub.unsubscribe()
}, [watch, errors, clearErrors])
```

---

## W — Why It Matters

- Without `setError`, server errors require a separate `useState` for each error message — an `emailError` state, a `usernameError` state, a `rootError` state. `setError` keeps all errors — client and server — in one place: `formState.errors`.
- `shouldFocus: true` is a UX and accessibility improvement — after a server error, focus jumps to the problematic field so the user doesn't have to hunt for the error.
- The "clear server error on change" pattern prevents stale server errors from persisting after the user has corrected the field — without it, "Email taken" might still show after the user types a new valid email.

---

## I — Interview Q&A

### Q: How do you prevent a server-set error from persisting after the user corrects the field?

**A:** Use the callback form of `watch` to observe field changes. When a field changes and its current error type is `'server'`, call `clearErrors` on that field. This ensures the server error clears in real time as the user types a new value, while client-side validation errors (set by `register` rules) continue to work normally through RHF's standard validation cycle.

---

## C — Common Pitfalls + Fix

### ❌ Using `useState` for server errors alongside RHF

```tsx
// ❌ Dual error state — errors.email from RHF + emailServerError from useState
const [emailServerError, setEmailServerError] = useState('')
// Now you have to render two error sources and manage both independently
```

**Fix:** Use `setError` — keep all errors in `formState.errors`:

```tsx
// ✅ One source of truth for all errors
setError('email', { type: 'server', message: 'Email already taken.' })
{errors.email && <p>{errors.email.message}</p>}
```

---

## K — Coding Challenge + Solution

### Challenge

Build a registration form with `username` and `email`. Simulate a server response where `username = 'admin'` returns a "Username taken" error. Auto-clear the server error when the user modifies that field.

### Solution

```tsx
'use client'
import { useEffect } from 'react'
import { useForm }   from 'react-hook-form'

type F = { username: string; email: string }

export function RegisterForm() {
  const { register, handleSubmit, setError, clearErrors, watch,
          formState: { errors, isSubmitting } } = useForm<F>()

  // Clear server errors when user changes the field
  useEffect(() => {
    const sub = watch((_, { name }) => {
      if (name && errors[name as keyof F]?.type === 'server') {
        clearErrors(name as keyof F)
      }
    })
    return () => sub.unsubscribe()
  }, [watch, errors, clearErrors])

  async function onSubmit(data: F) {
    await new Promise(r => setTimeout(r, 800))
    if (data.username === 'admin') {
      setError('username', { type: 'server', message: 'Username "admin" is taken.' },
               { shouldFocus: true })
      return
    }
    console.log('Registered:', data)
  }

  const cls = 'w-full border rounded-lg px-3 py-2 text-sm'
  const err = 'text-xs text-red-600 mt-1'

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-3 max-w-xs">
      {errors.root && (
        <p className="p-3 bg-red-50 rounded-xl text-sm text-red-700">
          {errors.root.message}
        </p>
      )}
      <div>
        <input {...register('username', { required: 'Required' })}
               placeholder='Try "admin"' className={cls} />
        {errors.username && <p className={err}>{errors.username.message}</p>}
      </div>
      <div>
        <input {...register('email', { required: 'Required' })} type="email"
               placeholder="Email" className={cls} />
        {errors.email && <p className={err}>{errors.email.message}</p>}
      </div>
      <button type="submit" disabled={isSubmitting}
              className="w-full py-2 bg-blue-600 text-white rounded-lg text-sm
                          font-semibold disabled:opacity-50">
        {isSubmitting ? 'Checking…' : 'Register'}
      </button>
    </form>
  )
}
```

---

---
