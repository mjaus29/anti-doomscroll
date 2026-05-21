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
