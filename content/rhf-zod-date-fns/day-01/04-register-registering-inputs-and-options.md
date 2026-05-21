# 4 — `register` — Registering Inputs and Options

---

## T — TL;DR

`register('fieldName', options)` returns `{ name, ref, onChange, onBlur }` — spread onto a native input to connect it to RHF. The `options` object is where you define built-in validation rules: `required`, `minLength`, `maxLength`, `pattern`, `min`, `max`, `validate`.

---

## K — Key Concepts

```tsx
const { register } = useForm<FormData>()

// ─── What register() returns (spread onto input)
const result = register('email')
// result = {
//   name:     'email',           // input name attribute
//   ref:      (el) => { ... },   // attaches RHF's internal ref
//   onChange: (e) => { ... },    // updates RHF store, triggers validation
//   onBlur:   (e) => { ... },    // marks field as touched
// }

// Usage:
<input {...register('email')} type="email" />
// Equivalent to:
<input
  name="email"
  ref={result.ref}
  onChange={result.onChange}
  onBlur={result.onBlur}
  type="email"
/>
```

```tsx
// ─── Built-in validation options
<input {...register('email', {
  required:  'Email is required',           // string = custom message
  pattern: {
    value:   /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
    message: 'Invalid email address'
  },
  maxLength: { value: 100, message: 'Too long' },
})} />

<input {...register('age', {
  required: true,
  min:      { value: 18,  message: 'Must be 18+' },
  max:      { value: 120, message: 'Invalid age' },
  valueAsNumber: true,   // ← converts string to number automatically
})} type="number" />

<input {...register('website', {
  validate: (value) =>
    !value || value.startsWith('https://')
      ? true
      : 'Must start with https://'
})} />

// ─── Multiple custom validators
<input {...register('username', {
  required: 'Required',
  minLength: { value: 3, message: 'Min 3 chars' },
  validate: {
    noSpaces:    v => !/\s/.test(v)      || 'No spaces allowed',
    noNumbers:   v => !/\d/.test(v)      || 'No numbers allowed',
    available:   async v => {
      const taken = await checkUsername(v)
      return !taken || 'Username taken'
    }
  }
})} />
```

```tsx
// ─── Value transformation options
register('price',   { valueAsNumber: true })   // "12.5" → 12.5
register('dob',     { valueAsDate:   true })   // "2000-01-01" → Date object
register('checked', { setValueAs: v => v === 'true' }) // custom transform
```

---

## W — Why It Matters

- Built-in validators (`required`, `pattern`, `min`, `max`) cover 80% of form validation needs without importing Zod. For simple forms, `register` options are sufficient and keep the bundle smaller.
- `valueAsNumber: true` is the most commonly forgotten option — without it, `<input type="number">` returns a **string** from the DOM. RHF spreads `...register('age', { valueAsNumber: true })` to automatically parse it.
- `validate` supports `async` functions — you can hit an API endpoint (e.g. check if username is taken) as part of `register` validation, without any extra state management.

---

## I — Interview Q&A

### Q: What happens when you spread `register()` onto an input and also manually pass an `onChange`?

**A:** The manually passed `onChange` replaces RHF's `onChange` from the spread — RHF never gets notified of changes and the field won't validate or update. The correct fix is to use `register`'s `onChange` option to fire additional logic: `register('field', { onChange: (e) => yourCallback(e) })`, or call both explicitly: `const reg = register('field'); <input {...reg} onChange={e => { reg.onChange(e); yourCallback(e) }} />`.

---

## C — Common Pitfalls + Fix

### ❌ `type="number"` input returns a string without `valueAsNumber`

```tsx
// ❌ age will be "25" (string) not 25 (number) after submit
<input type="number" {...register('age')} />
```

**Fix:**

```tsx
// ✅ valueAsNumber converts DOM string to JS number
<input type="number" {...register('age', { valueAsNumber: true })} />
```

---

## K — Coding Challenge + Solution

### Challenge

Build a registration form with: `username` (required, min 3, no spaces), `age` (required, number, 18–99), `website` (optional, must start with `https://` if provided). Show individual field errors.

### Solution

```tsx
'use client'
import { useForm } from 'react-hook-form'

type Fields = { username: string; age: number; website: string }

export function RegistrationForm() {
  const { register, handleSubmit, formState: { errors } } = useForm<Fields>()

  const field = 'w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500'
  const err   = 'text-xs text-red-600 mt-1'

  return (
    <form onSubmit={handleSubmit(console.log)} className="space-y-4 max-w-sm">
      <div>
        <input {...register('username', {
          required:  'Username is required',
          minLength: { value: 3, message: 'Min 3 characters' },
          validate:  v => !/\s/.test(v) || 'No spaces allowed'
        })} placeholder="Username" className={field} />
        {errors.username && <p className={err}>{errors.username.message}</p>}
      </div>

      <div>
        <input {...register('age', {
          required:      'Age is required',
          valueAsNumber: true,
          min:           { value: 18, message: 'Must be 18+' },
          max:           { value: 99, message: 'Max age 99'  }
        })} type="number" placeholder="Age" className={field} />
        {errors.age && <p className={err}>{errors.age.message}</p>}
      </div>

      <div>
        <input {...register('website', {
          validate: v =>
            !v || v.startsWith('https://')
              ? true
              : 'Must start with https://'
        })} placeholder="Website (optional)" className={field} />
        {errors.website && <p className={err}>{errors.website.message}</p>}
      </div>

      <button type="submit"
              className="w-full py-2.5 bg-blue-600 text-white rounded-lg
                          text-sm font-semibold">
        Register
      </button>
    </form>
  )
}
```

---

---
