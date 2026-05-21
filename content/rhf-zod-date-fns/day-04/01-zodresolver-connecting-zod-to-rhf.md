# 1 — `zodResolver` — Connecting Zod to RHF

---

## T — TL;DR

`zodResolver(schema)` is the bridge between Zod and RHF. Pass it as the `resolver` option in `useForm` — it replaces all `register`-level validation rules with the Zod schema. One schema definition validates everything on submit (and on every change/blur if configured).

---

## K — Key Concepts

```bash
npm install @hookform/resolvers
```

```tsx
import { useForm }      from 'react-hook-form'
import { zodResolver }  from '@hookform/resolvers/zod'
import { z }            from 'zod'

// ─── 1. Define schema
const LoginSchema = z.object({
  email:    z.string().email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters')
})

// ─── 2. Infer type from schema
type LoginForm = z.infer<typeof LoginSchema>

// ─── 3. Pass resolver to useForm
const { register, handleSubmit, formState: { errors } } = useForm<LoginForm>({
  resolver: zodResolver(LoginSchema),
  // defaultValues still needed — RHF uses them for isDirty, reset, etc.
  defaultValues: { email: '', password: '' }
})

// ─── 4. Remove ALL validation from register() — schema handles it
// ❌ Before: register('email', { required: 'Required', pattern: { ... } })
// ✅ After:  register('email')   — no rules, schema owns validation
<input {...register('email')} type="email" />
{errors.email && <p>{errors.email.message}</p>}
```

```tsx
// ─── What zodResolver does internally
// 1. On submit (or onChange/onBlur depending on mode):
//    calls schema.safeParse(formValues)
// 2. If success: passes data to your onValid handler
// 3. If failure: maps ZodError.issues to RHF's errors object
//    { path: ['email'], message: 'Invalid email' }
//    → errors.email = { type: 'invalid_string', message: 'Invalid email' }

// ─── mode still works with zodResolver
useForm<LoginForm>({
  resolver:      zodResolver(LoginSchema),
  mode:          'onTouched',   // validate on blur, then onChange
  reValidateMode: 'onChange',
  defaultValues: { email: '', password: '' }
})
```

---

## W — Why It Matters

- `zodResolver` removes all `register(field, rules)` options — there's only ONE place to change validation logic: the Zod schema. Previously, you had to update both the schema (for API validation) and the `register` call (for form validation).
- The resolver runs `schema.safeParse` on the entire form values object — cross-field validation via `.refine()` works automatically, which is impossible with `register`-level rules alone.
- TypeScript end-to-end: schema → `z.infer` type → `useForm<T>` → `register` type-safe field names → `errors.fieldName` type-safe error access.

---

## I — Interview Q&A

### Q: What does `zodResolver` replace in a standard RHF form setup?

**A:** It replaces the `rules` argument of every `register()` call. Without a resolver, you write `register('email', { required: 'Required', pattern: { value: /.../, message: '...' } })`. With `zodResolver`, you pass no options to `register` — the Zod schema owns all validation rules. It also enables cross-field validation via `.refine()` and `.superRefine()`, which is not possible with `register`-level rules. The resolver calls `schema.safeParse(formValues)` on the entire form data object, so all Zod schema features — transforms, defaults, cross-field checks — apply automatically.

---

## C — Common Pitfalls + Fix

### ❌ Leaving validation rules on `register` when using `zodResolver`

```tsx
// ❌ Double validation — register rules AND schema rules fight each other
const { register } = useForm({
  resolver: zodResolver(Schema)
})
<input {...register('email', { required: 'Required' })} />
// 'required' fires from register AND schema — may show different messages
```

**Fix:** Remove all rules from `register` — the schema is the sole validator:

```tsx
// ✅ Schema validates, register just attaches the ref
<input {...register('email')} type="email" />
```

---

## K — Coding Challenge + Solution

### Challenge

Convert a 3-field login form from manual `register` rules to `zodResolver`. Schema: `email` (valid email), `password` (min 8), `rememberMe` (boolean). Remove all `register` rule options.

### Solution

```tsx
'use client'
import { useForm }     from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z }           from 'zod'

const LoginSchema = z.object({
  email:      z.string().email('Please enter a valid email'),
  password:   z.string().min(8, 'Password must be at least 8 characters'),
  rememberMe: z.boolean().default(false)
})

type LoginForm = z.infer<typeof LoginSchema>

export function LoginForm() {
  const {
    register, handleSubmit,
    formState: { errors, isSubmitting }
  } = useForm<LoginForm>({
    resolver:      zodResolver(LoginSchema),
    mode:          'onTouched',
    defaultValues: { email: '', password: '', rememberMe: false }
  })

  const cls = 'w-full border rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500'
  const err = 'text-xs text-red-600 mt-1'

  return (
    <form onSubmit={handleSubmit(data => console.log(data))} className="space-y-4 max-w-sm">
      <div>
        <input {...register('email')} type="email" placeholder="Email" className={cls} />
        {errors.email    && <p className={err}>{errors.email.message}</p>}
      </div>
      <div>
        <input {...register('password')} type="password" placeholder="Password" className={cls} />
        {errors.password && <p className={err}>{errors.password.message}</p>}
      </div>
      <label className="flex items-center gap-2 text-sm cursor-pointer">
        <input {...register('rememberMe')} type="checkbox" className="rounded" />
        Remember me
      </label>
      <button type="submit" disabled={isSubmitting}
              className="w-full py-2.5 bg-blue-600 text-white rounded-xl text-sm
                          font-semibold disabled:opacity-50">
        {isSubmitting ? 'Signing in…' : 'Sign in'}
      </button>
    </form>
  )
}
```

---

---
