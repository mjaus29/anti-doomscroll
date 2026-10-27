# 5 — Custom Error Messages — Per-rule and Per-field

---

## T — TL;DR

Zod supports custom messages at every level: per-rule (second argument), per-schema (the `error` option), and globally (`z.config`). Zod 4 unified the old `message`, `required_error`, `invalid_type_error` and `errorMap` options into a single `error` param. Custom messages flow through `zodResolver` directly into `errors.field.message` in RHF — no extra mapping needed.

---

## K — Key Concepts

```tsx
import { z } from 'zod'

// ─── Per-rule message (most common — string shorthand)
z.string().min(8, 'Password must be at least 8 characters')
z.number().positive('Price must be a positive number')
z.email('Please enter a valid email address')

// ─── Per-rule message (object form — for more context)
// Zod 4: `error` replaces `message` (`message` still works but is deprecated)
z.string().min(8, { error: 'Password must be at least 8 characters' })
z.number().min(18, { error: 'You must be at least 18 years old' })

// ─── Separate message for missing/undefined vs wrong type
// Zod 3 had required_error + invalid_type_error. Zod 4 has one `error` function
// that receives the issue — check iss.input to tell "missing" from "wrong type"
z.string({
  error: (iss) => iss.input === undefined
    ? 'Email is required'          // value is undefined
    : 'Email must be a string'     // value is the wrong type
})
// Simpler when you only need one message: z.email({ error: 'Please enter a valid email' })

// ─── Error function per rule — dynamic messages
z.number({ error: (iss) => iss.input === undefined ? 'Required' : 'Must be a number' })
 .min(1, { error: (iss) => `Must be at least ${iss.minimum}` })   // iss has .minimum / .origin
// Returning undefined from an error function falls through to the next handler / default message

// ─── Global error customization — override messages app-wide
// Zod 3: z.setErrorMap(...). Zod 4: z.config({ customError })
z.config({
  customError: (iss) => {
    if (iss.code === 'invalid_type') {
      if (iss.expected === 'string') return 'This field is required'
      if (iss.expected === 'number') return 'Must be a number'
    }
    if (iss.code === 'too_small' && iss.origin === 'string') {
      return `Must be at least ${iss.minimum} characters`
    }
    // return undefined → fall back to the default (or locale) message
  }
})
// Prebuilt translations: z.config(z.locales.fr())
```

```tsx
// ─── Messages in RHF via zodResolver
// Zod issue.message flows directly to errors.field.message
const Schema = z.object({
  email: z.email({
    error: (iss) => iss.input === undefined
      ? 'Email address is required'
      : 'That doesn\'t look like an email address'
  }),
  age: z.coerce.number({
    error: (iss) => iss.input === undefined ? 'Age is required' : 'Age must be a number'
  }).int('Please enter a whole number').min(18, 'You must be 18 or older')
})

// In the form:
{errors.email && <p>{errors.email.message}</p>}
// Shows: 'Email address is required' when empty
// Shows: 'That doesn\'t look like an email address' when format invalid
```

---

## W — Why It Matters

- The schema-level `error` function vs the chain's rule messages is the UX difference between "Email is required" (when `undefined`) and "Invalid email format" (when filled but malformed) — branch on `iss.input === undefined` inside `error`. (Zod 3 had separate `required_error` / `invalid_type_error` options for this.)
- Custom messages in the schema mean the form UI and the API route return the same human-readable error strings — consistent error messages across all validation layers.
- The global `z.config({ customError })` pattern (Zod 3: `z.setErrorMap`) is useful for internationalisation — override all Zod's English defaults with your locale's messages from one place, or load a ready-made locale with `z.config(z.locales.xx())`, before any schema is created.

---

## I — Interview Q&A

### Q: How do you show different error messages for an empty field vs a wrong-format field in Zod?

**A:** Pass an `error` function on the schema constructor and branch on `iss.input`: `z.string({ error: (iss) => iss.input === undefined ? 'Field is required' : 'Must be text' })`. When `iss.input` is `undefined` the field is missing entirely; otherwise the value exists but is the wrong JavaScript type. Chain-level rules like `.min(3, 'Too short')` fire when the value is the right type but fails that specific rule. This gives three distinct, contextual messages for one field. (Before Zod 4 this was done with `required_error` and `invalid_type_error`, which were removed.)

---

## C — Common Pitfalls + Fix

### ❌ Using only `.min(1, 'Required')` — wrong message for missing field

```tsx
// ❌ When value is undefined (missing), ZodError says "Invalid input: expected string, received undefined"
// Not "Required" — the min(1) rule never runs if the value isn't a string
z.string().min(1, 'Required')
// undefined → "Invalid input: expected string, received undefined" (not your custom message)
```

**Fix:** Give the constructor an `error` message for the missing case:

```tsx
// ✅ Separate messages for missing vs empty string
z.string({ error: (iss) => iss.input === undefined ? 'This field is required' : undefined })
  .min(1, 'Cannot be empty')   // returning undefined keeps Zod's default for other type errors
// undefined → 'This field is required'
// ''        → 'Cannot be empty' (after coercion/defaultValues keep it a string)
```

---

## K — Coding Challenge + Solution

### Challenge

Build a `SignupSchema` with rich error messages: `username` (missing-value message, min 3 with char count, max 20, no spaces custom validate), `email` (missing-value message, invalid email), `password` (missing-value message, min 8, must contain uppercase and number as named validates), `birthYear` (coerced, wrong-type message, range 1900–2010). Render all error messages in the form.

### Solution

```tsx
'use client'
import { useForm }     from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z }           from 'zod'

const SignupSchema = z.object({
  username: z.string({ error: iss => iss.input === undefined ? 'Username is required' : undefined })
    .min(3,  'Username must be at least 3 characters')
    .max(20, 'Username must be 20 characters or less')
    .refine(v => !/\s/.test(v), 'Username cannot contain spaces'),

  email: z.email({
    error: iss => iss.input === undefined ? 'Email address is required' : 'Please enter a valid email address'
  }),

  password: z.string({ error: iss => iss.input === undefined ? 'Password is required' : undefined })
    .min(8, 'Password must be at least 8 characters')
    .refine(v => /[A-Z]/.test(v), 'Must contain at least one uppercase letter')
    .refine(v => /\d/.test(v),    'Must contain at least one number'),

  birthYear: z.coerce.number({
    error: iss => iss.input === undefined ? 'Birth year is required' : 'Birth year must be a number'
  }).int().min(1900, 'Year must be 1900 or later').max(2010, 'Year must be 2010 or earlier')
})

type SignupInput  = z.input<typeof SignupSchema>
type SignupOutput = z.output<typeof SignupSchema>

export function SignupForm() {
  const { register, handleSubmit, formState: { errors } } = useForm<SignupInput, unknown, SignupOutput>({
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
