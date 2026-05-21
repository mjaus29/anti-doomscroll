
# 📅 Day 4 — RHF + Zod Integration

> **Goal:** Connect Zod schemas to React Hook Form via `zodResolver`. Replace register-level rules with schema-level rules, infer form types from schemas, handle coercion and transforms, and use one schema for both form validation and API validation.
> **Format:** Each subtopic = 5–15 min. Do one. Stop. Come back.
> **Stack:** react-hook-form v7.74.0 · zod v4.3.6 · @hookform/resolvers v3+

---

## 📋 Day 4 Subtopic Overview

| # | Subtopic | Time |
|---|----------|------|
| 1 | `zodResolver` — Connecting Zod to RHF | 10 min |
| 2 | Typed Form Values from Schemas | 10 min |
| 3 | Input Coercion — Handling HTML String Inputs | 12 min |
| 4 | Transforms and Preprocessing | 12 min |
| 5 | Custom Error Messages — Per-rule and Per-field | 10 min |
| 6 | Error Path Mapping — How Zod Errors Become RHF Errors | 10 min |
| 7 | Cross-field Validation with `.refine` and `.superRefine` | 12 min |
| 8 | Schema as Single Source of Truth | 10 min |

---

---

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

# 2 — Typed Form Values from Schemas

---

## T — TL;DR

`z.infer<typeof Schema>` gives you the **output type** — what the form data looks like after Zod parses it. Pass this as the generic to `useForm<T>`. This makes `register`, `errors`, `watch`, `getValues`, and `setValue` fully type-safe — TypeScript catches invalid field names at compile time.

---

## K — Key Concepts

```tsx
import { z } from 'zod'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'

const ProfileSchema = z.object({
  username:    z.string().min(3).max(20),
  email:       z.string().email(),
  age:         z.coerce.number().int().min(13),
  role:        z.enum(['admin', 'editor', 'viewer']).default('viewer'),
  bio:         z.string().max(160).optional(),
  newsletter:  z.boolean().default(false)
})

// Inferred output type:
// {
//   username:   string
//   email:      string
//   age:        number
//   role:       'admin' | 'editor' | 'viewer'
//   bio?:       string | undefined
//   newsletter: boolean
// }
type ProfileForm = z.infer<typeof ProfileSchema>

const { register, formState: { errors }, watch, setValue } = useForm<ProfileForm>({
  resolver:      zodResolver(ProfileSchema),
  defaultValues: { username: '', email: '', age: 18, role: 'viewer', newsletter: false }
})

// ─── Type-safe field access
register('username')    // ✅
register('email')       // ✅
register('nonexistent') // ❌ TypeScript error — field doesn't exist in schema

// ─── Type-safe errors
errors.username?.message  // string | undefined ✅
errors.missing            // ❌ TypeScript error

// ─── Type-safe setValue
setValue('role', 'admin')   // ✅
setValue('role', 'owner')   // ❌ TypeScript error — not in enum
setValue('age',  25)        // ✅ number
setValue('age',  'twenty')  // ❌ TypeScript error — expects number
```

```tsx
// ─── Input type vs Output type with coerce
// z.coerce.number() accepts strings but outputs numbers
// The RHF form field value is a STRING (from <input>)
// But the submitted data type is NUMBER (after Zod parses)

const Schema = z.object({ age: z.coerce.number().int().min(18) })
type FormOutput = z.infer<typeof Schema>          // { age: number }
type FormInput  = z.input<typeof Schema>           // { age: unknown }

// useForm<FormOutput> is correct — RHF coerces values at submit time
// The <input> field still produces a string, but after schema.safeParse,
// data.age is a number ✅
useForm<FormOutput>({ resolver: zodResolver(Schema) })
// handleSubmit data.age → number ✅

// ─── defaultValues must match the INPUT type
// age field is a number in the schema but the input renders a string
// Providing a number default is fine — RHF/HTML handle the conversion
defaultValues: { age: 18 }  // renders as "18" in the input ✅
```

---

## W — Why It Matters

- Full TypeScript safety across the entire form: if you rename a field in the schema, every `register('oldName')` call becomes a TypeScript error immediately — no runtime surprises.
- `useForm<z.infer<typeof Schema>>` means your `handleSubmit` callback's `data` parameter is precisely typed — `data.age` is `number`, not `string | number | unknown`.
- The pattern of coercing at the schema level (`z.coerce.number()`) instead of using `valueAsNumber` on register means the type flows correctly from schema → form type → submit handler type, all from one definition.

---

## I — Interview Q&A

### Q: Should you use `z.infer` or `z.input` as the generic for `useForm<T>` when your schema has coerce or transforms?

**A:** Use `z.infer` (which is `z.output`) in almost all cases — it represents what the data looks like after Zod runs, which is what your `handleSubmit` callback receives. The HTML input always sends strings to the browser regardless of the TypeScript type — RHF reads the raw DOM value, passes it to Zod, and Zod coerces it. The inferred output type is what you care about in your submit handler. The only exception is when you have complex transforms that dramatically change the shape — in that case use `z.input` for the form type so `register` field names match the pre-transform shape.

---

## C — Common Pitfalls + Fix

### ❌ Not providing `defaultValues` that match the form shape

```tsx
// ❌ No defaultValues — RHF can't track isDirty, inputs are uncontrolled
const { register } = useForm<ProfileForm>({
  resolver: zodResolver(ProfileSchema)
  // missing defaultValues
})
// isDirty is unreliable, React warns about uncontrolled inputs
```

**Fix:** Always provide `defaultValues` matching your form type:

```tsx
// ✅
useForm<ProfileForm>({
  resolver:      zodResolver(ProfileSchema),
  defaultValues: { username: '', email: '', age: 18, role: 'viewer', newsletter: false }
})
```

---

## K — Coding Challenge + Solution

### Challenge

Create a `CreateProductSchema` with 5 fields (name, price coerced number, category enum, description optional, featured boolean default false). Infer the type. Use it with `useForm`. Prove type safety by trying to `register` a nonexistent field in a comment.

### Solution

```tsx
'use client'
import { useForm }     from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z }           from 'zod'

const CategorySchema      = z.enum(['electronics', 'clothing', 'books', 'food'])
const CreateProductSchema = z.object({
  name:        z.string().min(2, 'Min 2 characters').max(80),
  price:       z.coerce.number().positive('Must be positive'),
  category:    CategorySchema,
  description: z.string().max(500).optional(),
  featured:    z.boolean().default(false)
})

type CreateProduct = z.infer<typeof CreateProductSchema>
// { name: string; price: number; category: ...; description?: string; featured: boolean }

export function CreateProductForm() {
  const { register, handleSubmit, formState: { errors } } = useForm<CreateProduct>({
    resolver:      zodResolver(CreateProductSchema),
    defaultValues: { name: '', price: 0, category: 'electronics', featured: false }
  })

  // register('nonexistent')  // ← TypeScript error ✅ caught at compile time

  const cls = 'w-full border rounded-xl px-3 py-2 text-sm'
  const err = 'text-xs text-red-600 mt-1'

  return (
    <form onSubmit={handleSubmit(d => console.log(d))} className="space-y-3 max-w-sm">
      <div>
        <input {...register('name')} placeholder="Product name" className={cls} />
        {errors.name     && <p className={err}>{errors.name.message}</p>}
      </div>
      <div>
        <input {...register('price')} type="number" step="0.01" placeholder="Price" className={cls} />
        {errors.price    && <p className={err}>{errors.price.message}</p>}
      </div>
      <select {...register('category')} className={cls}>
        {CategorySchema.options.map(c => <option key={c} value={c}>{c}</option>)}
      </select>
      {errors.category   && <p className={err}>{errors.category.message}</p>}
      <textarea {...register('description')} placeholder="Description (optional)" className={cls} />
      <label className="flex items-center gap-2 text-sm">
        <input {...register('featured')} type="checkbox" />
        Featured product
      </label>
      <button type="submit"
              className="w-full py-2.5 bg-blue-600 text-white rounded-xl text-sm font-semibold">
        Create product
      </button>
    </form>
  )
}
```

---

---

# 3 — Input Coercion — Handling HTML String Inputs

---

## T — TL;DR

HTML `<input>` always returns strings. Zod's `z.coerce.*` converts them before validation. Use `z.coerce.number()` for numeric inputs, `z.coerce.boolean()` for checkboxes, and `z.coerce.date()` for date inputs — replacing RHF's `valueAsNumber`, `valueAsDate`, and manual `setValueAs`.

---

## K — Key Concepts

```tsx
import { z } from 'zod'

// ─── The coercion problem
// <input type="number" value="25" />  → DOM value is "25" (string)
// z.number().min(18).safeParse("25") → FAILS (expected number, got string)

// ─── z.coerce — wraps value in the type's constructor before validating
z.coerce.number()   // Number("25") = 25  → validates as number
z.coerce.boolean()  // Boolean("true") = true
z.coerce.string()   // String(42) = "42"
z.coerce.date()     // new Date("2024-01-15") = Date object

// ─── Coerce + chain validation rules normally
z.coerce.number().int().min(18, 'Must be 18+').max(120)
z.coerce.number().positive('Price must be positive').multipleOf(0.01)
z.coerce.date().min(new Date(), 'Date must be in the future')
```

```tsx
// ─── Comparison: RHF register option vs Zod coerce

// Old way (register-level)
<input {...register('age', { valueAsNumber: true, min: { value: 18, message: '18+' } })} />

// New way (schema-level) — register has NO options
const Schema = z.object({ age: z.coerce.number().int().min(18, 'Must be 18+') })
<input {...register('age')} type="number" />
// Schema handles coercion + validation ✅

// ─── Coercion edge cases
z.coerce.number().safeParse('')      // NaN → fails 'Expected number, received nan'
z.coerce.number().safeParse('abc')   // NaN → fails
z.coerce.number().safeParse(null)    // 0 → passes if min(0) or above
z.coerce.number().safeParse(true)    // 1 → passes
z.coerce.number().safeParse(false)   // 0

// ─── Fix for empty optional number input
// Empty string "" coerces to NaN, not undefined
// Solution: preprocess empty string to undefined before coercion
const OptionalNumberSchema = z.preprocess(
  val => (val === '' || val === null ? undefined : val),
  z.coerce.number().positive().optional()
)
OptionalNumberSchema.safeParse('')   // undefined ✅ (not NaN)
OptionalNumberSchema.safeParse('25') // 25 ✅
OptionalNumberSchema.safeParse(undefined) // undefined ✅
```

```tsx
// ─── Date input coercion
// <input type="date" /> returns "2024-06-15" (string)
const EventSchema = z.object({
  title:    z.string().min(1),
  startDate: z.coerce.date(),
  endDate:   z.coerce.date()
})
// "2024-06-15" → new Date('2024-06-15') → valid Date ✅

// ─── Checkbox coercion
// <input type="checkbox" /> returns "on" when checked, undefined when unchecked
// z.boolean() rejects "on" — use z.coerce.boolean() or preprocess
const CheckboxSchema = z.preprocess(
  val => val === 'on' || val === true || val === '1',
  z.boolean()
)
// "on" → true, undefined → false ✅
```

---

## W — Why It Matters

- Moving coercion into the Zod schema means `register` is clean (no `valueAsNumber`, no `setValueAs`), and the coercion logic is co-located with the validation rules — one place to look.
- The empty string → NaN problem (`z.coerce.number().safeParse('')`) is the most common coercion bug in RHF + Zod forms. Optional number fields require `z.preprocess` to handle the empty string case before coercion.
- `z.coerce.date()` is more ergonomic than RHF's `valueAsDate: true` + manual date validation — you get date range validation (`.min`, `.max`) in the same chain.

---

## I — Interview Q&A

### Q: What happens when you use `z.coerce.number()` with an empty string input, and how do you fix it?

**A:** `z.coerce.number()` calls `Number('')` which returns `NaN`. Zod then validates `NaN` as a number and rejects it with "Expected number, received nan". For optional number fields where the user might leave the input blank, wrap with `z.preprocess`: `z.preprocess(val => val === '' ? undefined : val, z.coerce.number().optional())`. This converts empty strings to `undefined` before coercion runs, so blank inputs produce `undefined` (valid for optional) rather than failing with a cryptic NaN error.

---

## C — Common Pitfalls + Fix

### ❌ Using `z.number()` instead of `z.coerce.number()` for form inputs

```tsx
// ❌ z.number() rejects strings — HTML inputs always produce strings
const Schema = z.object({ price: z.number().positive() })
Schema.safeParse({ price: '29.99' })
// → { success: false } 'Expected number, received string'
```

**Fix:**

```tsx
// ✅ z.coerce.number() converts string → number before validating
const Schema = z.object({ price: z.coerce.number().positive() })
Schema.safeParse({ price: '29.99' }) // → { success: true, data: { price: 29.99 } }
```

---

## K — Coding Challenge + Solution

### Challenge

Build an event booking form: `title` (string), `seats` (coerced integer, 1–100), `price` (optional coerced number — empty = free, must be non-negative if provided), `eventDate` (coerced date, must be in the future), `agreeToTerms` (preprocessed checkbox boolean, must be true). Show all coercion working.

### Solution

```tsx
'use client'
import { useForm }     from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z }           from 'zod'

const EventSchema = z.object({
  title:        z.string().min(3, 'Min 3 characters'),
  seats:        z.coerce.number().int('Must be whole number').min(1).max(100),
  price:        z.preprocess(
                  v => v === '' || v === null ? undefined : v,
                  z.coerce.number().nonnegative('Must be 0 or more').optional()
                ),
  eventDate:    z.coerce.date().min(new Date(), 'Must be in the future'),
  agreeToTerms: z.preprocess(
                  v => v === 'on' || v === true,
                  z.literal(true, { errorMap: () => ({ message: 'You must agree to continue' }) })
                )
})

type EventForm = z.infer<typeof EventSchema>

export function EventBookingForm() {
  const { register, handleSubmit, formState: { errors } } = useForm<EventForm>({
    resolver:      zodResolver(EventSchema),
    defaultValues: { title: '', seats: 1, eventDate: undefined }
  })

  const cls = 'w-full border rounded-xl px-3 py-2 text-sm'
  const err = 'text-xs text-red-600 mt-1'

  return (
    <form onSubmit={handleSubmit(d => console.log(d))} className="space-y-4 max-w-sm">
      <div>
        <input {...register('title')} placeholder="Event title" className={cls} />
        {errors.title        && <p className={err}>{errors.title.message}</p>}
      </div>
      <div>
        <input {...register('seats')} type="number" placeholder="Seats (1–100)" className={cls} />
        {errors.seats        && <p className={err}>{errors.seats.message}</p>}
      </div>
      <div>
        <input {...register('price')} type="number" step="0.01" placeholder="Price (blank = free)" className={cls} />
        {errors.price        && <p className={err}>{errors.price.message}</p>}
      </div>
      <div>
        <input {...register('eventDate')} type="date" className={cls} />
        {errors.eventDate    && <p className={err}>{errors.eventDate.message}</p>}
      </div>
      <label className="flex items-start gap-2 text-sm cursor-pointer">
        <input {...register('agreeToTerms')} type="checkbox" className="mt-0.5" />
        I agree to the terms and conditions
      </label>
      {errors.agreeToTerms   && <p className={err}>{errors.agreeToTerms.message}</p>}
      <button type="submit"
              className="w-full py-2.5 bg-blue-600 text-white rounded-xl text-sm font-semibold">
        Book event
      </button>
    </form>
  )
}
```

---

---

# 4 — Transforms and Preprocessing

---

## T — TL;DR

`.transform(fn)` converts a validated value into something else (trim whitespace, normalize phone, compute totals). `z.preprocess(fn, schema)` runs a function **before** schema validation (handle empty strings, cast booleans, strip characters). Together they clean and shape data before it reaches your submit handler.

---

## K — Key Concepts

```tsx
import { z } from 'zod'

// ─── .transform() — runs AFTER validation passes
// Input type is the schema's input, output type changes to the return type

const SlugSchema = z.string()
  .min(1)
  .transform(s => s.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, ''))

SlugSchema.parse('Hello World!')  // → 'hello-world'
type SlugOut = z.infer<typeof SlugSchema>  // string (same — transform to same type)

// ─── Transform that changes the type
const TagsInputSchema = z.string()
  .transform(s => s.split(',').map(t => t.trim()).filter(Boolean))

type TagsOut = z.infer<typeof TagsInputSchema>  // string[]
TagsInputSchema.parse('react, zod, typescript')  // → ['react', 'zod', 'typescript']
```

```tsx
// ─── z.preprocess() — runs BEFORE validation
// fn receives unknown input, returns processed value, THEN schema validates

// 1. Trim whitespace before min-length check
const TrimmedNameSchema = z.preprocess(
  v => typeof v === 'string' ? v.trim() : v,
  z.string().min(2, 'Min 2 characters after trimming')
)
TrimmedNameSchema.parse('  M  ')  // → fails (after trim: 'M', length 1)
TrimmedNameSchema.parse(' Mark ') // → passes, returns 'Mark'

// 2. Parse comma-separated string into array before array validation
const CsvToArraySchema = z.preprocess(
  v => typeof v === 'string' ? v.split(',').map(s => s.trim()).filter(Boolean) : v,
  z.array(z.string().min(1)).min(1, 'At least one value required')
)
CsvToArraySchema.parse('react,zod,typescript')  // → ['react', 'zod', 'typescript']

// 3. Strip non-digits from phone number
const PhoneSchema = z.preprocess(
  v => typeof v === 'string' ? v.replace(/\D/g, '') : v,
  z.string().length(10, 'Phone must be 10 digits')
)
PhoneSchema.parse('+1 (555) 123-4567')  // → '15551234567' ← wait, 11 digits
PhoneSchema.parse('555-123-4567')       // → '5551234567' ✅
```

```tsx
// ─── Transform in RHF context
// The SUBMITTED data (handleSubmit callback) contains the TRANSFORMED values
// The FORM input value (what the user sees) is the raw string

const PriceSchema = z.object({
  // price entered as "29.99" → submitted as { price: 2999 } (cents)
  price: z.coerce.number()
           .positive()
           .transform(dollars => Math.round(dollars * 100))
})

type PriceOut = z.infer<typeof PriceSchema>  // { price: number } (cents)

// In handleSubmit:
function onSubmit(data: PriceOut) {
  console.log(data.price)  // 2999 (cents) — NOT 29.99 ✅
  // Safe to store in database as integer cents
}
```

---

## W — Why It Matters

- `.transform()` puts data cleaning in the schema, not the submit handler — your `onSubmit` receives clean, shaped data rather than raw strings that need post-processing.
- `z.preprocess` solves the "validate what the schema expects, not what the DOM provides" mismatch — empty strings, serialized booleans ("on"), comma-separated values — all handled before schema validation runs.
- The cents pattern (`price * 100`) in transforms is a real production pattern — financial data should never be stored as floats. Transforming at the schema boundary ensures you never accidentally store `29.99` instead of `2999`.

---

## I — Interview Q&A

### Q: When do you use `z.preprocess` vs `.transform()`?

**A:** `z.preprocess(fn, schema)` runs the function **before** type validation — use it when the raw input doesn't match what the schema expects (empty string to undefined, "on" to boolean, comma string to array). The preprocessed value is what the schema validates. `.transform(fn)` runs **after** validation passes — use it to shape or convert already-valid data (lowercase slugs, trim strings, convert dollars to cents, format phone numbers). If the input type is wrong for the schema, use `preprocess`. If the type is right but you want to reshape the output, use `transform`.

---

## C — Common Pitfalls + Fix

### ❌ Using `.transform()` to handle invalid input — it runs after validation

```tsx
// ❌ transform runs AFTER validation — empty string "" fails min(1) before transform
const Schema = z.string().min(1).transform(s => s.trim())
Schema.safeParse('  ')  // ← fails at min(1) with '  ', transform never runs
```

**Fix:** Use `preprocess` to clean BEFORE validation:

```tsx
// ✅ preprocess trims first, THEN min(1) validates the trimmed string
const Schema = z.preprocess(
  v => typeof v === 'string' ? v.trim() : v,
  z.string().min(1, 'Required')
)
Schema.safeParse('  ')  // fails: ''.length < 1 ✅ (correct error)
Schema.safeParse(' Mark ') // passes, output: 'Mark' ✅
```

---

## K — Coding Challenge + Solution

### Challenge

Build a `TagsFieldSchema` that: accepts a comma-separated string from an `<input>`, preprocesses it into an array, trims each tag, filters empty strings, deduplicates, lowercases, validates each tag is 1–20 chars, max 5 tags. Submit logs `string[]`.

### Solution

```tsx
'use client'
import { useForm }     from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z }           from 'zod'

// Schema processes CSV input into a clean string[]
const TagsFieldSchema = z.preprocess(
  v => {
    if (typeof v !== 'string') return []
    return [...new Set(
      v.split(',')
       .map(t => t.trim().toLowerCase())
       .filter(Boolean)
    )]
  },
  z.array(
    z.string().min(1).max(20, 'Each tag max 20 chars')
  ).max(5, 'Maximum 5 tags')
)

const PostSchema = z.object({
  title: z.string().min(3),
  tags:  TagsFieldSchema
})

// For RHF, the form input type is string (CSV), output is string[]
type PostInput  = { title: string; tags: string }         // input
type PostOutput = z.infer<typeof PostSchema>               // output: tags is string[]

export function PostForm() {
  const { register, handleSubmit, formState: { errors } } = useForm<PostInput>({
    resolver:      zodResolver(PostSchema) as any,
    defaultValues: { title: '', tags: '' }
  })

  const cls = 'w-full border rounded-xl px-3 py-2 text-sm'
  const err = 'text-xs text-red-600 mt-1'

  function onSubmit(data: PostOutput) {
    console.log('tags:', data.tags)  // string[] — clean, deduped, lowercased
  }

  return (
    <form onSubmit={handleSubmit(onSubmit as any)} className="space-y-4 max-w-sm">
      <div>
        <input {...register('title')} placeholder="Post title" className={cls} />
        {errors.title && <p className={err}>{errors.title.message}</p>}
      </div>
      <div>
        <input {...register('tags')} placeholder="react, zod, typescript" className={cls} />
        <p className="text-xs text-gray-400 mt-1">Comma-separated, max 5</p>
        {errors.tags  && <p className={err}>{(errors.tags as any)?.message}</p>}
      </div>
      <button type="submit"
              className="w-full py-2.5 bg-blue-600 text-white rounded-xl text-sm font-semibold">
        Create post
      </button>
    </form>
  )
}
```

---

---

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

# 6 — Error Path Mapping — How Zod Errors Become RHF Errors

---

## T — TL;DR

`zodResolver` maps each `ZodIssue` to an RHF field error using the issue's `path` array. `path: ['address', 'city']` → `errors.address.city`. `path: ['items', 0, 'name']` → `errors.items[0].name`. Understanding this mapping lets you structure schemas to produce errors exactly where RHF (and your UI) expects them.

---

## K — Key Concepts

```tsx
import { z } from 'zod'

// ─── ZodIssue structure
// { code, path, message }
// path: string[] | (string | number)[]

// Simple field:  path: ['email']       → errors.email
// Nested:        path: ['address', 'city'] → errors.address?.city
// Array item:    path: ['items', 0, 'qty'] → errors.items?.[0]?.qty
// Root refine:   path: []               → errors.root (mapped by RHF)

// ─── How zodResolver maps issues to RHF errors
// issue.path → nested key path → set on formState.errors

const NestedSchema = z.object({
  user: z.object({
    name:    z.string().min(1, 'Name required'),
    address: z.object({
      city: z.string().min(1, 'City required')
    })
  })
})

// Error: { path: ['user', 'address', 'city'], message: 'City required' }
// RHF:   errors.user?.address?.city?.message === 'City required' ✅
```

```tsx
// ─── Refine path control — where the error appears
const Schema = z.object({
  password:        z.string().min(8),
  confirmPassword: z.string()
}).refine(
  data => data.password === data.confirmPassword,
  {
    message: 'Passwords do not match',
    path:    ['confirmPassword']  // ← error appears on confirmPassword field
  }
)

// Without path: error goes to formState.errors.root (no field)
// With path: ['confirmPassword']: errors.confirmPassword.message === 'Passwords do not match'
```

```tsx
// ─── Rendering nested errors in the form
const { formState: { errors } } = useForm<z.infer<typeof NestedSchema>>({
  resolver: zodResolver(NestedSchema)
})

// Direct nested access
{errors.user?.name?.message}
{errors.user?.address?.city?.message}

// Array field errors (useFieldArray covered separately)
{errors.items?.[0]?.name?.message}
{errors.items?.[1]?.qty?.message}

// Root-level refine error (no path → errors.root)
// zodResolver maps path: [] → errors.root
{errors.root?.message}
```

---

## W — Why It Matters

- The `path` on `.refine()` is essential — without it, cross-field errors (like "passwords don't match") go to `errors.root` and don't highlight the specific field. Setting `path: ['confirmPassword']` makes the error appear inline next to the confirm field.
- Understanding path mapping lets you debug missing errors — if `errors.confirmPassword.message` is undefined but the schema should have an error, check that the `.refine()` path matches exactly the field name registered in RHF.
- Array path segments (`path: ['items', 0, 'name']`) map automatically to `errors.items[0].name` — nested array field errors work without any extra configuration when using `useFieldArray`.

---

## I — Interview Q&A

### Q: A `.refine()` cross-field error isn't showing next to the field in the form — why?

**A:** The `.refine()` probably has no `path` option or the wrong path. Without `path`, Zod issues the error with `path: []` — an empty array — which `zodResolver` maps to `errors.root`, not to any specific field. To show the error next to a specific field, add `path: ['fieldName']` to the refine options. The path must match the exact string used in `register('fieldName')` for the error to appear at `errors.fieldName.message`.

---

## C — Common Pitfalls + Fix

### ❌ `.refine()` without `path` — error goes to `errors.root`, not the field

```tsx
// ❌ Error ends up in errors.root — not shown next to confirmPassword field
const Schema = z.object({
  password: z.string(), confirmPassword: z.string()
}).refine(d => d.password === d.confirmPassword, 'Passwords do not match')

// errors.confirmPassword → undefined (empty — user doesn't see why)
```

**Fix:** Add `path` to direct the error to the right field:

```tsx
// ✅ Error shows next to confirmPassword input
const Schema = z.object({
  password: z.string(), confirmPassword: z.string()
}).refine(d => d.password === d.confirmPassword, {
  message: 'Passwords do not match',
  path:    ['confirmPassword']
})
// errors.confirmPassword.message === 'Passwords do not match' ✅
```

---

## K — Coding Challenge + Solution

### Challenge

Build a shipping schema with nested address object. Add two `.refine()` checks — one with `path` (city/state mismatch → error on `state` field) and one without `path` (terms acceptance → error on root). Render both errors in the form.

### Solution

```tsx
'use client'
import { useForm }     from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z }           from 'zod'

const ShippingSchema = z.object({
  address: z.object({
    street: z.string().min(5, 'Street required'),
    city:   z.string().min(2, 'City required'),
    state:  z.string().length(2, 'Use 2-letter state code'),
    zip:    z.string().regex(/^\d{5}$/, 'ZIP must be 5 digits')
  }),
  agreeToShipping: z.boolean()
})
.refine(
  d => !(d.address.city === 'Los Angeles' && d.address.state !== 'CA'),
  { message: 'LA is in California — state should be CA', path: ['address', 'state'] }
)
.refine(
  d => d.agreeToShipping === true,
  { message: 'You must agree to shipping terms' } // no path → errors.root
)

type Shipping = z.infer<typeof ShippingSchema>

export function ShippingForm() {
  const { register, handleSubmit, formState: { errors } } = useForm<Shipping>({
    resolver:      zodResolver(ShippingSchema),
    defaultValues: { address: { street: '', city: '', state: '', zip: '' }, agreeToShipping: false }
  })

  const cls = 'w-full border rounded-xl px-3 py-2 text-sm'
  const err = 'text-xs text-red-600 mt-1'

  return (
    <form onSubmit={handleSubmit(console.log)} className="space-y-3 max-w-sm">
      {errors.root && (
        <p className="p-3 bg-red-50 rounded-xl text-sm text-red-700">
          {errors.root.message}
        </p>
      )}
      <input {...register('address.street')} placeholder="Street" className={cls} />
      {errors.address?.street   && <p className={err}>{errors.address.street.message}</p>}

      <input {...register('address.city')}   placeholder="City"   className={cls} />
      {errors.address?.city     && <p className={err}>{errors.address.city.message}</p>}

      <input {...register('address.state')}  placeholder="State (2 letters)" className={cls} />
      {errors.address?.state    && <p className={err}>{errors.address.state.message}</p>}

      <input {...register('address.zip')}    placeholder="ZIP"    className={cls} />
      {errors.address?.zip      && <p className={err}>{errors.address.zip.message}</p>}

      <label className="flex items-center gap-2 text-sm cursor-pointer">
        <input {...register('agreeToShipping')} type="checkbox" />
        I agree to the shipping terms
      </label>

      <button type="submit"
              className="w-full py-2.5 bg-blue-600 text-white rounded-xl text-sm font-semibold">
        Ship order
      </button>
    </form>
  )
}
```

---

---

# 7 — Cross-field Validation with `.refine` and `.superRefine`

---

## T — TL;DR

`.refine(fn, message)` adds a single cross-field rule. `.superRefine(fn)` gives full control — add multiple issues, use different error codes, add issues only when other validations pass. Use `.superRefine` when one rule might produce multiple errors or when you need conditional cross-field logic.

---

## K — Key Concepts

```tsx
import { z } from 'zod'

// ─── .refine — single cross-field check
const DateRangeSchema = z.object({
  startDate: z.coerce.date(),
  endDate:   z.coerce.date()
}).refine(
  data => data.endDate > data.startDate,
  { message: 'End date must be after start date', path: ['endDate'] }
)

// ─── Chaining multiple .refine calls
const PriceSchema = z.object({
  minPrice: z.coerce.number().nonnegative(),
  maxPrice: z.coerce.number().nonnegative()
})
.refine(d => d.maxPrice >= d.minPrice, {
  message: 'Max price must be ≥ min price', path: ['maxPrice']
})
.refine(d => d.maxPrice - d.minPrice <= 10000, {
  message: 'Price range cannot exceed $10,000', path: ['maxPrice']
})
// Both run — both errors can appear simultaneously ✅
```

```tsx
// ─── .superRefine — full control over issues
const PasswordSchema = z.object({
  password:        z.string(),
  confirmPassword: z.string(),
  hint:            z.string().optional()
}).superRefine((data, ctx) => {
  // Can add MULTIPLE issues from one superRefine
  if (data.password.length < 8) {
    ctx.addIssue({
      code:    z.ZodIssueCode.too_small,
      minimum: 8,
      type:    'string',
      inclusive: true,
      message: 'Password must be at least 8 characters',
      path:   ['password']
    })
  }
  if (data.password !== data.confirmPassword) {
    ctx.addIssue({
      code:    z.ZodIssueCode.custom,
      message: 'Passwords do not match',
      path:   ['confirmPassword']
    })
  }
  // Conditional: only check hint if password is set
  if (data.password && data.hint && data.hint.includes(data.password)) {
    ctx.addIssue({
      code:    z.ZodIssueCode.custom,
      message: 'Hint cannot contain your password',
      path:   ['hint']
    })
  }
})
```

```tsx
// ─── .refine with async — validate against an external source
const UniqueEmailSchema = z.object({
  email: z.string().email()
}).refine(
  async data => {
    const exists = await checkEmailExists(data.email)
    return !exists
  },
  { message: 'Email is already registered', path: ['email'] }
)

// MUST use safeParseAsync / parseAsync for async refine
await UniqueEmailSchema.safeParseAsync({ email: 'mark@example.com' })
// zodResolver handles async schemas automatically ✅
```

---

## W — Why It Matters

- `.refine()` chaining means multiple independent cross-field rules all run — unlike `validate` in RHF's `register` which stops at the first failure. Users see all cross-field errors at once.
- `.superRefine` with `ctx.addIssue` is needed when one function needs to add errors to multiple different fields — confirming passwords, validating a date range AND a duration, checking both ends of a price range.
- Async `.refine` for server checks (email uniqueness, username availability) works automatically with `zodResolver` — no special handling needed in the form.

---

## I — Interview Q&A

### Q: What is the difference between `.refine()` and `.superRefine()` in Zod?

**A:** `.refine(fn, message)` adds one validation rule and returns one error. It's simple and concise for single cross-field checks. `.superRefine(fn)` receives a `ctx` object with `ctx.addIssue()` — you can add zero, one, or multiple `ZodIssue` objects per call, each with a custom `code`, `path`, and `message`. Use `.refine` for simple cross-field checks. Use `.superRefine` when you need to conditionally add errors to multiple different fields from one function, when you need specific ZodIssueCodes (not just `custom`), or when you need to short-circuit (abort early) using `z.NEVER`.

---

## C — Common Pitfalls + Fix

### ❌ Chaining `.refine()` with `async` but calling synchronous `safeParse`

```tsx
// ❌ async refine requires safeParseAsync — sync safeParse returns a Promise object
const Schema = z.object({ email: z.string() })
  .refine(async d => !(await emailExists(d.email)), 'Taken')

const result = Schema.safeParse({ email: 'x@x.com' })
// result is a Promise, not { success, data } ❌
```

**Fix:** Use `safeParseAsync` (or let `zodResolver` handle it — it does automatically):

```tsx
// ✅ Use safeParseAsync for async schemas
const result = await Schema.safeParseAsync({ email: 'x@x.com' })
// zodResolver calls parseAsync internally — async refines work in forms ✅
```

---

## K — Coding Challenge + Solution

### Challenge

Build a booking form with `superRefine` for 3 cross-field checks: (1) `checkIn` < `checkOut`, error on `checkOut`; (2) If `guestCount > 2`, `roomType` must be `'suite'`, error on `roomType`; (3) `totalBudget` must be >= `guestCount * 50`, error on `totalBudget`. All three can show simultaneously.

### Solution

```tsx
'use client'
import { useForm }     from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z }           from 'zod'

const BookingSchema = z.object({
  checkIn:     z.coerce.date(),
  checkOut:    z.coerce.date(),
  guestCount:  z.coerce.number().int().min(1).max(10),
  roomType:    z.enum(['standard', 'deluxe', 'suite']),
  totalBudget: z.coerce.number().positive()
}).superRefine((data, ctx) => {
  // 1. checkOut must be after checkIn
  if (data.checkOut <= data.checkIn) {
    ctx.addIssue({ code: z.ZodIssueCode.custom,
      message: 'Check-out must be after check-in', path: ['checkOut'] })
  }
  // 2. > 2 guests requires suite
  if (data.guestCount > 2 && data.roomType !== 'suite') {
    ctx.addIssue({ code: z.ZodIssueCode.custom,
      message: `${data.guestCount} guests require a suite`, path: ['roomType'] })
  }
  // 3. Budget must cover minimum per guest
  const minBudget = data.guestCount * 50
  if (data.totalBudget < minBudget) {
    ctx.addIssue({ code: z.ZodIssueCode.custom,
      message: `Minimum budget is $${minBudget} for ${data.guestCount} guests`,
      path: ['totalBudget'] })
  }
})

type Booking = z.infer<typeof BookingSchema>

export function BookingForm() {
  const { register, handleSubmit, formState: { errors } } = useForm<Booking>({
    resolver:      zodResolver(BookingSchema),
    mode:          'onSubmit',
    defaultValues: { guestCount: 1, roomType: 'standard', totalBudget: 100 }
  })

  const cls = 'w-full border rounded-xl px-3 py-2 text-sm'
  const err = 'text-xs text-red-600 mt-1'

  return (
    <form onSubmit={handleSubmit(console.log)} className="space-y-3 max-w-sm">
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-xs text-gray-500 mb-1 block">Check-in</label>
          <input {...register('checkIn')}  type="date" className={cls} />
        </div>
        <div>
          <label className="text-xs text-gray-500 mb-1 block">Check-out</label>
          <input {...register('checkOut')} type="date" className={cls} />
          {errors.checkOut     && <p className={err}>{errors.checkOut.message}</p>}
        </div>
      </div>
      <div>
        <input {...register('guestCount')} type="number" placeholder="Guests" className={cls} />
        {errors.guestCount   && <p className={err}>{errors.guestCount.message}</p>}
      </div>
      <div>
        <select {...register('roomType')} className={cls}>
          <option value="standard">Standard</option>
          <option value="deluxe">Deluxe</option>
          <option value="suite">Suite</option>
        </select>
        {errors.roomType     && <p className={err}>{errors.roomType.message}</p>}
      </div>
      <div>
        <input {...register('totalBudget')} type="number" placeholder="Total budget ($)" className={cls} />
        {errors.totalBudget  && <p className={err}>{errors.totalBudget.message}</p>}
      </div>
      <button type="submit"
              className="w-full py-2.5 bg-blue-600 text-white rounded-xl text-sm font-semibold">
        Book now
      </button>
    </form>
  )
}
```

---

---

# 8 — Schema as Single Source of Truth

---

## T — TL;DR

One Zod schema validates the form (via `zodResolver`), the API route body (via `safeParse`), and types the submit handler parameter — all from the same definition. Change a rule once, it propagates everywhere. This is the core architectural win of combining Zod + RHF.

---

## K — Key Concepts

```ts
// src/lib/schemas/create-user.ts — ONE file, used everywhere

import { z } from 'zod'

export const CreateUserSchema = z.object({
  username:  z.string().min(3, 'Min 3 characters').max(20),
  email:     z.string().email('Invalid email'),
  password:  z.string().min(8, 'Min 8 characters'),
  role:      z.enum(['admin', 'editor', 'viewer']).default('viewer'),
  birthYear: z.coerce.number().int().min(1900).max(2010)
})

export type CreateUser     = z.infer<typeof CreateUserSchema>
export type CreateUserInput = z.input<typeof CreateUserSchema>
```

```tsx
// ─── Usage 1: RHF form (client component)
// src/app/admin/create-user/page.tsx
'use client'
import { useForm }           from 'react-hook-form'
import { zodResolver }       from '@hookform/resolvers/zod'
import { CreateUserSchema, CreateUser } from '@/lib/schemas/create-user'

export default function CreateUserPage() {
  const { register, handleSubmit, formState: { errors } } = useForm<CreateUser>({
    resolver:      zodResolver(CreateUserSchema),
    defaultValues: { username: '', email: '', password: '', role: 'viewer' }
  })
  // form code...
}
```

```tsx
// ─── Usage 2: Next.js API Route (server)
// src/app/api/users/route.ts
import { CreateUserSchema } from '@/lib/schemas/create-user'

export async function POST(req: Request) {
  const body   = await req.json()
  const result = CreateUserSchema.safeParse(body)
  if (!result.success) {
    return Response.json({ errors: result.error.flatten() }, { status: 400 })
  }
  // result.data is typed as CreateUser ✅
  await db.user.create({ data: result.data })
  return Response.json({ ok: true })
}
```

```tsx
// ─── Usage 3: Server Action (Next.js)
// src/app/actions/create-user.ts
'use server'
import { CreateUserSchema } from '@/lib/schemas/create-user'

export async function createUserAction(formData: FormData) {
  const raw    = Object.fromEntries(formData)
  const result = CreateUserSchema.safeParse(raw)
  if (!result.success) {
    return { errors: result.error.flatten() }
  }
  await db.user.create({ data: result.data })
  return { success: true }
}
```

```ts
// ─── Usage 4: Shared between Client and Server via schema composition
// Extend the base schema for different contexts
export const AdminCreateUserSchema = CreateUserSchema.extend({
  permissions: z.array(z.string()).optional()
})
export const PublicRegisterSchema  = CreateUserSchema.omit({ role: true })

// All share the same base validation rules —
// change email validation once, it propagates to all three
```

---

## W — Why It Matters

- Before this pattern: form validation (register rules), API route validation (manual checks), and TypeScript types are three separate things that drift apart over time. A new `maxLength` constraint added to the form doesn't automatically protect the API route.
- With Zod as single source of truth: update `username: z.string().min(3).max(20)` → the form shows the error, the API route rejects the request, and the TypeScript type reflects `string` — one change, three layers protected.
- Server Actions with Zod validation is especially powerful in Next.js App Router — the `formData` from a form submission is validated by the same schema that validates the client-side form.

---

## I — Interview Q&A

### Q: How do you share a Zod schema between a React Hook Form client component and a Next.js API route?

**A:** Define the schema in a separate file (`src/lib/schemas/yourSchema.ts`) and export the schema and its inferred type. Import the schema in the client form component for `zodResolver`, and import it in the API route or Server Action for `safeParse`. Because the schema is a plain TypeScript module (not React-specific), it runs in both client and server environments. Zod has no browser or Node.js dependencies that would cause issues in either environment. Mark the schema file as neither `'use client'` nor `'use server'` — it's shared code.

---

## C — Common Pitfalls + Fix

### ❌ Duplicating schemas — separate form schema and API schema for the same resource

```ts
// ❌ Two schemas for the same data — they drift apart
// src/components/user-form.tsx
const FormSchema = z.object({ email: z.string().email(), age: z.coerce.number().min(18) })

// src/app/api/users/route.ts
const ApiSchema = z.object({ email: z.string().email(), age: z.number().min(16) })
// ← min(16) vs min(18) — different rules, both "valid"
```

**Fix:** Single schema file, imported everywhere:

```ts
// src/lib/schemas/user.ts
export const UserSchema = z.object({ email: z.string().email(), age: z.coerce.number().min(18) })
// Both form AND API import from here — one rule, always consistent
```

---

## K — Coding Challenge + Solution

### Challenge

Create a shared `ContactFormSchema` in `src/lib/schemas/contact.ts`. Use it in: (1) a client-side `<ContactForm>` component with `zodResolver`, and (2) a mock API route `POST /api/contact` that validates with `safeParse` and returns `400` with `flatten()` on failure. Prove both use the same schema by updating one rule and noting it changes in both.

### Solution

```ts
// src/lib/schemas/contact.ts — shared schema
import { z } from 'zod'

export const ContactFormSchema = z.object({
  name:    z.string().min(2, 'Name must be at least 2 characters'),
  email:   z.string().email('Invalid email address'),
  subject: z.enum(['support', 'sales', 'general'], {
             errorMap: () => ({ message: 'Please select a subject' })
           }),
  message: z.string().min(20, 'Message must be at least 20 characters').max(1000)
})

export type ContactForm = z.infer<typeof ContactFormSchema>
```

```tsx
// src/components/contact-form.tsx — client usage
'use client'
import { useForm }          from 'react-hook-form'
import { zodResolver }      from '@hookform/resolvers/zod'
import { ContactFormSchema, ContactForm } from '@/lib/schemas/contact'

export function ContactForm() {
  const { register, handleSubmit, formState: { errors, isSubmitting, isSubmitSuccessful } } = useForm<ContactForm>({
    resolver:      zodResolver(ContactFormSchema),
    mode:          'onTouched',
    defaultValues: { name: '', email: '', subject: 'general', message: '' }
  })

  async function onSubmit(data: ContactForm) {
    const res = await fetch('/api/contact', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify(data)
    })
    if (!res.ok) console.error(await res.json())
    else         console.log('Sent:', data)
  }

  const cls = 'w-full border rounded-xl px-3 py-2 text-sm'
  const err = 'text-xs text-red-600 mt-1'

  if (isSubmitSuccessful) {
    return <p className="text-green-600 font-semibold">✓ Message sent!</p>
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 max-w-sm">
      <div>
        <input {...register('name')}    placeholder="Full name" className={cls} />
        {errors.name    && <p className={err}>{errors.name.message}</p>}
      </div>
      <div>
        <input {...register('email')}   type="email" placeholder="Email" className={cls} />
        {errors.email   && <p className={err}>{errors.email.message}</p>}
      </div>
      <div>
        <select {...register('subject')} className={cls}>
          <option value="general">General enquiry</option>
          <option value="support">Support</option>
          <option value="sales">Sales</option>
        </select>
        {errors.subject && <p className={err}>{errors.subject.message}</p>}
      </div>
      <div>
        <textarea {...register('message')} rows={4} placeholder="Your message (min 20 chars)" className={cls} />
        {errors.message && <p className={err}>{errors.message.message}</p>}
      </div>
      <button type="submit" disabled={isSubmitting}
              className="w-full py-2.5 bg-blue-600 text-white rounded-xl text-sm
                          font-semibold disabled:opacity-50">
        {isSubmitting ? 'Sending…' : 'Send message'}
      </button>
    </form>
  )
}
```

```ts
// src/app/api/contact/route.ts — server usage of the SAME schema
import { ContactFormSchema } from '@/lib/schemas/contact'

export async function POST(req: Request) {
  const body   = await req.json().catch(() => null)
  const result = ContactFormSchema.safeParse(body)

  if (!result.success) {
    return Response.json(
      { errors: result.error.flatten().fieldErrors },
      { status: 400 }
    )
  }

  // result.data is typed as ContactForm ✅ — same type as the form
  const { name, email, subject, message } = result.data

  // mock send
  console.log(`New ${subject} message from ${name} <${email}>: ${message}`)
  return Response.json({ ok: true }, { status: 200 })
}
// If you update ContactFormSchema.message.min(20) to min(30),
// BOTH the form AND the API route enforce min(30) automatically ✅
```

---

## ✅ Day 4 Complete — RHF + Zod Integration

| # | Subtopic | Status |
|---|----------|--------|
| 1 | `zodResolver` — Connecting Zod to RHF | ☐ |
| 2 | Typed Form Values from Schemas | ☐ |
| 3 | Input Coercion — Handling HTML String Inputs | ☐ |
| 4 | Transforms and Preprocessing | ☐ |
| 5 | Custom Error Messages | ☐ |
| 6 | Error Path Mapping | ☐ |
| 7 | Cross-field Validation — refine and superRefine | ☐ |
| 8 | Schema as Single Source of Truth | ☐ |

---

## 🗺️ One-Page Mental Model — Day 4

```
SETUP
  npm install @hookform/resolvers
  import { zodResolver } from '@hookform/resolvers/zod'
  useForm<z.infer<typeof Schema>>({ resolver: zodResolver(Schema) })
  → remove ALL rules from register() — schema owns validation

ZODRESOLVER FLOW
  submit → schema.safeParse(formValues)
    success → onValid(data)          data is typed as z.infer<Schema>
    failure → maps ZodIssue[] to formState.errors
              issue.path → errors.field.subfield[0].name

TYPED FORM VALUES
  type FormType = z.infer<typeof Schema>      output type (after parse)
  type FormInput = z.input<typeof Schema>     input type (before transforms)
  useForm<FormType>({ resolver })
  register('field')  → type-safe ✅
  errors.field       → type-safe ✅
  setValue('field', wrongType) → TypeScript error ✅

COERCION (HTML inputs → always strings)
  z.coerce.number()   "42" → 42   (replaces valueAsNumber)
  z.coerce.date()     "2024-01-01" → Date (replaces valueAsDate)
  z.coerce.boolean()  "true" → true
  Empty string fix:   z.preprocess(v => v === '' ? undefined : v, z.coerce.number().optional())
  Checkbox fix:       z.preprocess(v => v === 'on' || v === true, z.boolean())

TRANSFORMS vs PREPROCESS
  z.preprocess(fn, schema)  → fn runs BEFORE validation (fix wrong type)
  schema.transform(fn)      → fn runs AFTER validation (shape valid data)
  Use preprocess:  empty string → undefined, "on" → boolean, csv → array
  Use transform:   dollars → cents, trim whitespace, slugify string

ERROR MESSAGES
  .min(n, 'message')                    per-rule string
  .email({ message: '...' })            per-rule object
  z.string({ required_error: '...' })   when undefined
  z.string({ invalid_type_error: '...' }) when wrong type
  z.setErrorMap(fn)                     global override (i18n)

ERROR PATH MAPPING
  ZodIssue.path → RHF errors path
  path: ['email']          → errors.email
  path: ['address','city'] → errors.address?.city
  path: ['items', 0, 'qty']→ errors.items?.[0]?.qty
  path: []                 → errors.root
  ALWAYS set path in .refine() for inline field errors

CROSS-FIELD VALIDATION
  .refine(fn, { message, path })        single rule, one error
  .refine chaining                       all run — multiple errors visible
  .superRefine((data, ctx) => {          multiple issues, multiple paths
    ctx.addIssue({ code, message, path })
  })
  async .refine()                        zodResolver handles automatically

SINGLE SOURCE OF TRUTH PATTERN
  src/lib/schemas/resource.ts
    export const Schema = z.object({...})
    export type Resource = z.infer<typeof Schema>
  Client:  useForm({ resolver: zodResolver(Schema) })
  Server:  const result = Schema.safeParse(body)
  Action:  const result = Schema.safeParse(Object.fromEntries(formData))
  → change a rule once → propagates to form + API + types

COMPOSITION FOR CRUD
  Base     = z.object({ id, ...all fields })
  Create   = Base.omit({ id: true, createdAt: true })
  Update   = Create
  Patch    = Create.partial()
  Summary  = Base.pick({ id: true, name: true })
```

> **Your next action:** Open any RHF form in your project. Add `npm install @hookform/resolvers`, create a Zod schema for it, swap in `zodResolver(schema)`, and delete every `register(field, rules)` argument. Run the form — validation should work identically, but now your API route can import the same schema.
>
> *Doing one small thing beats opening a feed.*