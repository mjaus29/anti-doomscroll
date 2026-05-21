# 3 — Async Validation — Debounced Server Checks

---

## T — TL;DR

Async validation checks uniqueness or existence against a server — email taken, username available, coupon valid. Use `setError` + a debounced `useEffect` (not `zodResolver`) for real-time feedback. Use async `.refine` in the schema for submit-time server validation. Never block typing with synchronous server calls.

---

## K — Key Concepts

```tsx
// ─── Strategy 1: debounced useEffect + setError (best for real-time UX)
import { useForm }   from 'react-hook-form'
import { useEffect, useRef } from 'react'

function SignupForm() {
  const { register, watch, setError, clearErrors, formState: { errors } } = useForm({
    defaultValues: { username: '' }
  })

  const username = watch('username')

  useEffect(() => {
    if (username.length < 3) return

    const id = setTimeout(async () => {
      const taken = await checkUsernameAvailability(username)
      if (taken) {
        setError('username', { type: 'manual', message: 'Username is already taken' })
      } else {
        clearErrors('username')
      }
    }, 500)  // 500ms debounce

    return () => clearTimeout(id)
  }, [username, setError, clearErrors])

  return (
    <div>
      <input {...register('username')} />
      {errors.username?.type === 'manual' && (
        <p className="text-xs text-red-600">{errors.username.message}</p>
      )}
      {!errors.username && username.length >= 3 && (
        <p className="text-xs text-green-600">✓ Username available</p>
      )}
    </div>
  )
}
```

```ts
// ─── Strategy 2: async .refine in Zod schema (submit-time validation)
// zodResolver calls safeParseAsync automatically — async refine works
const AsyncEmailSchema = z.object({
  email: z.string().email()
}).refine(
  async data => {
    const exists = await fetch(`/api/check-email?email=${data.email}`)
      .then(r => r.json()).then(d => d.exists)
    return !exists
  },
  { message: 'Email is already registered', path: ['email'] }
)

// zodResolver handles async schemas automatically — no special config
useForm({ resolver: zodResolver(AsyncEmailSchema) })
```

```tsx
// ─── Strategy 3: validate in onSubmit — server confirms uniqueness
async function onSubmit(data: FormType) {
  const res = await api.post('/signup', data)
  if (res.status === 409) {
    // Set server-returned field errors
    setError('email', { type: 'server', message: 'Email already registered' })
    return
  }
  router.push('/dashboard')
}

// ─── When to use each:
// debounced useEffect: real-time availability indicator (username, slug)
// async .refine:       submit-time uniqueness validation (email on signup)
// setError in onSubmit: server validation errors after API call
```

---

## W — Why It Matters

- Async validation in `.refine` without debouncing fires a server request on every schema parse — on a `mode: 'onChange'` form this means a server request per keystroke. Always debounce in the UI with `useEffect` + `setTimeout` for real-time checks.
- `setError('field', { type: 'server', ... })` preserves RHF's error type metadata — downstream code can distinguish between schema errors (`zodResolver`) and server errors (`'server'` type) for different UI treatments.
- `zodResolver` calls `safeParseAsync` internally when the schema has async refinements — there's no extra configuration needed. The resolver auto-detects async schemas.

---

## I — Interview Q&A

### Q: How do you implement real-time username availability checking without spamming the server?

**A:** Watch the username field with `watch('username')` (or `useWatch`). In a `useEffect` with the username as a dependency, set a `setTimeout` for 400–600ms before making the API call, and clear it on the cleanup function. This debounces the check — the server only gets called when the user stops typing for 500ms. On the response, use `setError` to set a manual error or `clearErrors` to clear it. This pattern is separate from `zodResolver` — it runs as a side effect, not as part of schema validation.

---

## C — Common Pitfalls + Fix

### ❌ Async validation in zodResolver without debounce — server hit per keystroke

```ts
// ❌ With mode: 'onChange', this fires a server request every keystroke
const Schema = z.object({ username: z.string().refine(
  async v => !(await checkTaken(v)), 'Taken'
)})
useForm({ resolver: zodResolver(Schema), mode: 'onChange' })
```

**Fix:** Separate real-time UX (debounced `useEffect`) from submit-time validation (async `.refine`):

```ts
// ✅ Async refine in schema = submit-time check only
// ✅ Debounced useEffect = real-time availability indicator
useForm({ resolver: zodResolver(Schema), mode: 'onSubmit' })
// + debounced useEffect for live feedback
```

---

## K — Coding Challenge + Solution

### Challenge

Build a `SlugField` component: validates a project slug (alphanumeric + hyphens, min 3), debounces availability check to server (mocked), shows "checking…" / "available ✓" / "taken ✗" indicator alongside the field error. Uses `setError` / `clearErrors`.

### Solution

```tsx
'use client'
import { useEffect, useState } from 'react'
import { useForm }             from 'react-hook-form'
import { zodResolver }         from '@hookform/resolvers/zod'
import { z }                   from 'zod'

const Schema = z.object({
  projectName: z.string().min(2, 'Required'),
  slug:        z.string()
                .min(3, 'Min 3 characters')
                .regex(/^[a-z0-9-]+$/, 'Only lowercase letters, numbers, hyphens')
})
type F = z.infer<typeof Schema>

// Mock server check
async function checkSlugAvailable(slug: string): Promise<boolean> {
  await new Promise(r => setTimeout(r, 300))
  return !['my-project', 'test-app', 'demo'].includes(slug)
}

export function CreateProjectForm() {
  const { register, watch, handleSubmit,
          setError, clearErrors, formState: { errors } } = useForm<F>({
    resolver:      zodResolver(Schema),
    defaultValues: { projectName: '', slug: '' }
  })

  const slug                            = watch('slug')
  const [slugStatus, setSlugStatus]     = useState<'idle'|'checking'|'available'|'taken'>('idle')

  useEffect(() => {
    if (!slug || slug.length < 3 || !/^[a-z0-9-]+$/.test(slug)) {
      setSlugStatus('idle')
      return
    }
    setSlugStatus('checking')
    const id = setTimeout(async () => {
      const available = await checkSlugAvailable(slug)
      if (available) {
        clearErrors('slug')
        setSlugStatus('available')
      } else {
        setError('slug', { type: 'manual', message: 'Slug is already taken' })
        setSlugStatus('taken')
      }
    }, 500)
    return () => clearTimeout(id)
  }, [slug, setError, clearErrors])

  const cls = 'w-full border rounded-xl px-3 py-2 text-sm'

  return (
    <form onSubmit={handleSubmit(console.log)} className="space-y-4 max-w-sm">
      <input {...register('projectName')} placeholder="Project name" className={cls} />
      {errors.projectName && <p className="text-xs text-red-600">{errors.projectName.message}</p>}

      <div className="space-y-1">
        <div className="relative">
          <input {...register('slug')} placeholder="project-slug" className={cls} />
          <span className="absolute right-3 top-2.5 text-xs">
            {slugStatus === 'checking'  && <span className="text-gray-400">checking…</span>}
            {slugStatus === 'available' && <span className="text-green-600">✓</span>}
            {slugStatus === 'taken'     && <span className="text-red-500">✗</span>}
          </span>
        </div>
        {errors.slug && <p className="text-xs text-red-600">{errors.slug.message}</p>}
      </div>

      <button type="submit"
              className="w-full py-2.5 bg-blue-600 text-white rounded-xl text-sm font-semibold">
        Create project
      </button>
    </form>
  )
}
```

---

---
