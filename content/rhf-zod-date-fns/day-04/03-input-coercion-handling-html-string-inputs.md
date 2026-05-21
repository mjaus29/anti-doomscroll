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
