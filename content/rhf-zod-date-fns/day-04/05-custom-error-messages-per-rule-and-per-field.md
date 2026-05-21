# 5 — Custom Error Messages — Per-rule and Per-field

---

## T — TL;DR

Zod supports custom messages at every level: per-rule (second argument), per-schema (`errorMap`), and globally. Custom messages flow through `zodResolver` directly into `errors.field.message` in RHF — no extra mapping needed.

---

## K — Key Concepts

```tsx
import { z } from 'zod'

// ─── Per-rule message (most common — string shorthand)
z.string().min(8, 'Password must be at least 8 characters')
z.number().positive('Price must be a positive number')
z.string().email('Please enter a valid email address')

// ─── Per-rule message (object form — for more context)
z.string().min(8, { message: 'Password must be at least 8 characters' })
z.number().min(18, { message: 'You must be at least 18 years old' })

// ─── required_error — separate message for missing/undefined vs wrong type
z.string({
  required_error: 'Email is required',         // when value is undefined
  invalid_type_error: 'Email must be a string' // when value is wrong type
}).email('Please enter a valid email')

// ─── Custom errorMap per schema — override all messages for that schema
z.number({
  errorMap: (issue, ctx) => {
    if (issue.code === 'too_small') return { message: 'Must be at least 1' }
    if (issue.code === 'too_big')   return { message: 'Must be at most 100' }
    return { message: ctx.defaultError }
  }
})

// ─── Global errorMap — override messages app-wide
z.setErrorMap((issue, ctx) => {
  if (issue.code === 'invalid_type') {
    if (issue.expected === 'string')  return { message: 'This field is required' }
    if (issue.expected === 'number')  return { message: 'Must be a number' }
  }
  if (issue.code === 'too_small' && issue.type === 'string') {
    return { message: `Must be at least ${issue.minimum} characters` }
  }
  return { message: ctx.defaultError }
})
```

```tsx
// ─── Messages in RHF via zodResolver
// Zod issue.message flows directly to errors.field.message
const Schema = z.object({
  email: z.string({
    required_error: 'Email address is required'
  }).email('That doesn\'t look like an email address'),
  age: z.coerce.number({
    required_error:     'Age is required',
    invalid_type_error: 'Age must be a number'
  }).int('Please enter a whole number').min(18, 'You must be 18 or older')
})

// In the form:
{errors.email && <p>{errors.email.message}</p>}
// Shows: 'Email address is required' when empty
// Shows: 'That doesn\'t look like an email address' when format invalid
```

---

## W — Why It Matters

- `required_error` vs the chain's first rule message is the UX difference between "Email is required" (when blank) and "Invalid email format" (when filled but malformed) — Zod handles this automatically with `required_error` on the schema constructor.
- Custom messages in the schema mean the form UI and the API route return the same human-readable error strings — consistent error messages across all validation layers.
- The global `z.setErrorMap` pattern is useful for internationalisation — override all Zod's English defaults with your locale's messages from one place, before any schema is created.

---

## I — Interview Q&A

### Q: How do you show different error messages for an empty field vs a wrong-format field in Zod?

**A:** Use the `required_error` and `invalid_type_error` options on the schema constructor: `z.string({ required_error: 'Field is required', invalid_type_error: 'Must be text' })`. `required_error` fires when the value is `undefined` (field missing entirely). `invalid_type_error` fires when the value exists but is the wrong JavaScript type. Chain-level rules like `.email('Bad format')` fire when the value is the right type but fails that specific rule. This gives three distinct, contextual messages for one field.

---

## C — Common Pitfalls + Fix

### ❌ Using only `.min(1, 'Required')` — wrong message for missing field

```tsx
// ❌ When value is undefined (missing), ZodError says "Expected string, received undefined"
// Not "Required" — the min(1) rule never runs if the value isn't a string
z.string().min(1, 'Required')
// undefined → "Expected string, received undefined" (not your custom message)
```

**Fix:** Use `required_error`:

```tsx
// ✅ Separate messages for missing vs empty string
z.string({ required_error: 'This field is required' }).min(1, 'Cannot be empty')
// undefined → 'This field is required'
// ''        → 'Cannot be empty' (after coercion/defaultValues keep it a string)
```

---

## K — Coding Challenge + Solution

### Challenge

Build a `SignupSchema` with rich error messages: `username` (required_error, min 3 with char count, max 20, no spaces custom validate), `email` (required_error, invalid email), `password` (required_error, min 8, must contain uppercase and number as named validates), `birthYear` (coerced, invalid_type_error, range 1900–2010). Render all error messages in the form.

### Solution

```tsx
'use client'
import { useForm }     from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z }           from 'zod'

const SignupSchema = z.object({
  username: z.string({
    required_error: 'Username is required'
  })
    .min(3,  'Username must be at least 3 characters')
    .max(20, 'Username must be 20 characters or less')
    .refine(v => !/\s/.test(v), 'Username cannot contain spaces'),

  email: z.string({
    required_error: 'Email address is required'
  }).email('Please enter a valid email address'),

  password: z.string({
    required_error: 'Password is required'
  })
    .min(8, 'Password must be at least 8 characters')
    .refine(v => /[A-Z]/.test(v), 'Must contain at least one uppercase letter')
    .refine(v => /\d/.test(v),    'Must contain at least one number'),

  birthYear: z.coerce.number({
    required_error:     'Birth year is required',
    invalid_type_error: 'Birth year must be a number'
  }).int().min(1900, 'Year must be 1900 or later').max(2010, 'Year must be 2010 or earlier')
})

type SignupForm = z.infer<typeof SignupSchema>

export function SignupForm() {
  const { register, handleSubmit, formState: { errors } } = useForm<SignupForm>({
    resolver:      zodResolver(SignupSchema),
    mode:          'onTouched',
    defaultValues: { username: '', email: '', password: '', birthYear: 1990 }
  })

  const cls = 'w-full border rounded-xl px-3 py-2 text-sm'
  const err = 'text-xs text-red-600 mt-1'

  return (
    <form onSubmit={handleSubmit(console.log)} className="space-y-4 max-w-sm">
      {(['username', 'email', 'password'] as const).map(name => (
        <div key={name}>
          <input {...register(name)}
                 type={name === 'password' ? 'password' : name === 'email' ? 'email' : 'text'}
                 placeholder={name.charAt(0).toUpperCase() + name.slice(1)}
                 className={cls} />
          {errors[name] && <p className={err}>{errors[name]?.message}</p>}
        </div>
      ))}
      <div>
        <input {...register('birthYear')} type="number" placeholder="Birth year" className={cls} />
        {errors.birthYear && <p className={err}>{errors.birthYear.message}</p>}
      </div>
      <button type="submit"
              className="w-full py-2.5 bg-blue-600 text-white rounded-xl text-sm font-semibold">
        Create account
      </button>
    </form>
  )
}
```

---

---
