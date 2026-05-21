# 8 — Discriminated Union Caveats, Refined Schemas, and Date Interval Edge Cases

---

## T — TL;DR

Discriminated unions break when you add `.refine()` to member schemas — the union can no longer read the discriminator. Wrap refinements outside the union or use `superRefine` on the union itself. Date intervals have three silent bugs: UTC midnight, end-before-start, and same-day zero-duration. Know the fix for each.

---

## K — Key Concepts

```ts
// ─── CAVEAT 1: refine on a discriminated union member breaks the union

// ❌ Adding .refine() to a member wraps it in ZodEffects
// ZodEffects hides the discriminator — z.discriminatedUnion can't read it
const BrokenUnion = z.discriminatedUnion('type', [
  z.object({ type: z.literal('card'), cardNumber: z.string() })
   .refine(d => d.cardNumber.length === 16, 'Must be 16 digits'), // ← breaks union ❌
  z.object({ type: z.literal('bank'), bsb: z.string() })
])
// ZodError: The discriminator value for the schema at index 0 could not be parsed

// ✅ Fix A: move refinement outside the union member — on the wrapping object
const WorkingUnion = z.discriminatedUnion('type', [
  z.object({ type: z.literal('card'), cardNumber: z.string() }),
  z.object({ type: z.literal('bank'), bsb: z.string() })
]).superRefine((data, ctx) => {
  if (data.type === 'card' && data.cardNumber.length !== 16) {
    ctx.addIssue({ code: z.ZodIssueCode.custom,
      message: 'Must be 16 digits', path: ['cardNumber'] })
  }
})

// ✅ Fix B: use z.union instead of z.discriminatedUnion when refines are needed
const FlexibleUnion = z.union([
  z.object({ type: z.literal('card'), cardNumber: z.string() })
   .refine(d => d.cardNumber.length === 16, { message: '16 digits', path: ['cardNumber'] }),
  z.object({ type: z.literal('bank'), bsb: z.string() })
])
// z.union tries each branch — slower but compatible with branch-level refines
```

```ts
// ─── CAVEAT 2: z.union vs z.discriminatedUnion error quality
// z.discriminatedUnion: precise — only validates matching branch
// z.union: shows all branch errors OR "invalid union" when no branch matches

// When to use which:
// All branches share a unique discriminator key → discriminatedUnion
// Branches need .refine() on individual schemas    → z.union + comment why

// ─── DATE INTERVAL EDGE CASES

// Bug 1: UTC midnight — new Date('2025-06-15') is UTC, not local
import { parseISO, isAfter, isBefore, startOfDay, endOfDay } from 'date-fns'

const d1 = new Date('2025-06-15')           // 2025-06-14T16:00:00 in UTC+8
const d2 = parseISO('2025-06-15')           // 2025-06-15T00:00:00 local ✅
// For form date inputs: always use parseISO, never new Date(string)
```

```ts
// Bug 2: end before start in eachDayOfInterval — throws
import { eachDayOfInterval, min, max } from 'date-fns'

// ❌ Throws RangeError
eachDayOfInterval({ start: end, end: start })

// ✅ Always guard order
function safeInterval(a: Date, b: Date) {
  return eachDayOfInterval({ start: min([a, b]), end: max([a, b]) })
}

// Bug 3: same-day interval — duration is 0, not 1
import { differenceInDays, differenceInCalendarDays } from 'date-fns'

const same = new Date(2025, 5, 15)
differenceInDays(same, same)             // 0 ← correct for elapsed time
differenceInCalendarDays(same, same)     // 0 ← correct for calendar days

// For "number of nights" in a booking:
// check-in June 15, check-out June 16 → 1 night
differenceInDays(new Date(2025,5,16), new Date(2025,5,15))  // 1 ✅

// For "same day = invalid":
.refine(d => differenceInDays(d.checkOut, d.checkIn) >= 1, {
  message: 'Minimum 1 night stay', path: ['checkOut']
})
```

```ts
// ─── Refined schema composition caveat — extends after refine
// .extend() AFTER .refine() doesn't work — can't extend ZodEffects

// ❌ Can't extend a refined schema
const RefinedSchema = z.object({ name: z.string() }).refine(d => !!d.name)
const Extended = RefinedSchema.extend({ email: z.string() })  // TypeError ❌

// ✅ Extend FIRST, then refine
const Base     = z.object({ name: z.string() })
const Extended = Base.extend({ email: z.string() })
const Final    = Extended.refine(d => !!d.name && !!d.email)  // ✅

// ✅ Or: extend the base, apply refine to the extended version
const CreateSchema = Base.extend({ role: z.string() })
  .refine(d => d.role !== 'superadmin', 'Reserved role')
```

---

## W — Why It Matters

- The discriminated union + `.refine()` pitfall is the most silent bug in Zod schemas — the error message says the discriminator "could not be parsed" which doesn't hint at the cause. Knowing to move refinements outside the union saves debugging time.
- The UTC midnight bug (`new Date('2025-06-15')`) causes off-by-one-day display for users in UTC-negative and UTC-positive timezones. `parseISO` is the consistent fix — always.
- `.extend()` after `.refine()` is a schema composition order error that TypeScript catches — but only at the method call site, not earlier. Remember: transform, refine, and superRefine are always the last step.

---

## I — Interview Q&A

### Q: Why does adding `.refine()` to a `z.discriminatedUnion` member schema break the union, and what is the fix?

**A:** `z.discriminatedUnion` reads the discriminator field from each member schema to build a lookup map. When you add `.refine()` to a member, Zod wraps it in a `ZodEffects` object — and `ZodEffects` doesn't expose the inner schema's discriminator value directly. Zod can no longer extract `z.literal('card')` from the wrapped schema and throws a parse error. The fix is to move the refinement outside the member schemas and onto the union itself using `.superRefine()`. Inside `superRefine`, check `data.type` first to apply branch-specific validation. Alternatively, switch from `z.discriminatedUnion` to `z.union` — which doesn't require a readable discriminator and is compatible with branch-level refinements (at the cost of trying all branches on every parse).

---

## C — Common Pitfalls + Fix

### ❌ `.extend()` called after `.refine()` — TypeScript error

```ts
// ❌ Cannot extend ZodEffects — .refine() returns ZodEffects, not ZodObject
const Schema = z.object({ name: z.string() })
  .refine(d => d.name.length > 2)
  .extend({ email: z.string() })  // TypeScript error: .extend is not a function ❌
```

**Fix:** Extend first, then refine:

```ts
// ✅
const Schema = z.object({ name: z.string() })
  .extend({ email: z.string() })  // extend first
  .refine(d => d.name.length > 2 && !!d.email)  // refine last
```

---

## K — Coding Challenge + Solution

### Challenge

Fix a broken `PaymentUnion` that has `.refine()` on a discriminated union member. Rewrite using `superRefine` on the union. Also write a `safeBookingInterval` function that handles all three date edge cases (UTC midnight, end-before-start, same-day).

### Solution

```ts
import { z }                                             from 'zod'
import { parseISO, isValid, min, max,
         eachDayOfInterval, differenceInDays,
         isBefore, isAfter }                            from 'date-fns'

// ─── Fixed discriminated union with superRefine
const PaymentUnion = z.discriminatedUnion('method', [
  z.object({
    method:     z.literal('card'),
    cardNumber: z.string(),
    expiry:     z.string()
  }),
  z.object({
    method: z.literal('paypal'),
    email:  z.string()
  })
])
.superRefine((data, ctx) => {
  if (data.method === 'card') {
    if (!/^\d{16}$/.test(data.cardNumber)) {
      ctx.addIssue({ code: z.ZodIssueCode.custom,
        message: 'Card number must be 16 digits', path: ['cardNumber'] })
    }
    if (!/^\d{2}\/\d{2}$/.test(data.expiry)) {
      ctx.addIssue({ code: z.ZodIssueCode.custom,
        message: 'Expiry must be MM/YY', path: ['expiry'] })
    }
  }
  if (data.method === 'paypal') {
    if (!data.email.includes('@')) {
      ctx.addIssue({ code: z.ZodIssueCode.custom,
        message: 'Invalid PayPal email', path: ['email'] })
    }
  }
})

// ─── Safe booking interval utility — handles all 3 edge cases
interface BookingIntervalResult {
  days:        Date[]
  nightCount:  number
  isValid:     boolean
  error?:      string
}

function safeBookingInterval(
  checkInStr:  string,  // 'yyyy-MM-dd' from form input
  checkOutStr: string
): BookingIntervalResult {
  // Bug 1: use parseISO, not new Date() — avoids UTC midnight issue
  const checkIn  = parseISO(checkInStr)
  const checkOut = parseISO(checkOutStr)

  if (!isValid(checkIn) || !isValid(checkOut)) {
    return { days: [], nightCount: 0, isValid: false, error: 'Invalid date string' }
  }

  // Bug 3: same-day = 0 nights = invalid booking
  const nights = differenceInDays(checkOut, checkIn)
  if (nights < 1) {
    return { days: [], nightCount: 0, isValid: false,
             error: nights === 0 ? 'Minimum 1 night required' : 'Check-out must be after check-in' }
  }

  // Bug 2: guard order — ensure start < end before eachDayOfInterval
  const days = eachDayOfInterval({
    start: min([checkIn, checkOut]),
    end:   max([checkIn, checkOut])
  })

  return { days, nightCount: nights, isValid: true }
}

// Tests
console.log(safeBookingInterval('2025-06-15', '2025-06-15'))
// { isValid: false, error: 'Minimum 1 night required' }

console.log(safeBookingInterval('2025-06-16', '2025-06-15'))
// { isValid: false, error: 'Check-out must be after check-in' }

console.log(safeBookingInterval('2025-06-15', '2025-06-18'))
// { isValid: true, nightCount: 3, days: [Jun15, Jun16, Jun17, Jun18] }

// Payment union test
console.log(PaymentUnion.safeParse({ method: 'card', cardNumber: '123', expiry: '12/27' }).success)
// false — '123' not 16 digits

console.log(PaymentUnion.safeParse({ method: 'card', cardNumber: '4111111111111111', expiry: '12/27' }).success)
// true ✅
```

---

## ✅ Day 8 Complete — Advanced Validation and Production Patterns

| # | Subtopic | Status |
|---|----------|--------|
| 1 | Advanced `refine` and `superRefine` | ☐ |
| 2 | Cross-field and Date-Range Validation | ☐ |
| 3 | Async Validation — Debounced Server Checks | ☐ |
| 4 | Create vs Edit Flows + API Hydration | ☐ |
| 5 | Form Accessibility — ARIA, Focus, Announcements | ☐ |
| 6 | Performance Tuning — Re-render Control | ☐ |
| 7 | Testing Strategies | ☐ |
| 8 | Discriminated Union Caveats + Date Edge Cases | ☐ |

---

## 🗺️ One-Page Mental Model — Day 8

```
REFINE / SUPERREFINE
  .refine(fn, msg)              → one issue, one path, all refines run
  .superRefine((data, ctx) => { → multiple issues, multiple paths
    ctx.addIssue({code, message, path})
    return z.NEVER              → abort — stop subsequent refinements
  })
  Chain .refine for independent rules — all show simultaneously
  Use z.NEVER after critical issue — prevent cascading noise

CROSS-FIELD RULES
  Always on z.object({}).refine/superRefine — not on individual fields
  date-fns: isBefore/isAfter for date comparisons (not < >)
  Always include path: ['fieldName'] → shows inline in form

ASYNC VALIDATION
  Real-time (UX):  debounced useEffect + setTimeout + setError/clearErrors
  Submit-time:     async .refine in schema — zodResolver calls safeParseAsync
  After API call:  setError('field', { type: 'server', message })
  Never: async .refine with mode: 'onChange' — server per keystroke

CREATE vs EDIT
  Edit schema  = Base.extend({ id: z.string().uuid() })
  Patch schema = Base.partial().extend({ id })
  Load data:   reset(apiToFormDefaults(apiData))  — NOT setValue
  After reset: isDirty = false ✅
  Date hydration: format(parseISO(apiDate), 'yyyy-MM-dd') for input value

ACCESSIBILITY
  htmlFor + id         → link label to input
  aria-invalid         → signals error state
  aria-describedby     → links input to error message element
  role="alert"         → error messages announced by screen readers
  aria-live="polite"   → inline errors; aria-live="assertive" → summary
  handleSubmit(valid, invalid) → focus error summary on invalid submit
  useId()              → stable IDs for SSR-safe label/input pairing

PERFORMANCE
  Destructure ONLY used formState props (proxy-based subscriptions)
  watch('field')       → subscribes parent component
  useWatch({ name })   → subscribes only that child component
  Extract watched UI into child + FormProvider = parent renders once
  useMemo for computed values from useWatch
  Stable defaultValues reference (outside component or const)

TESTING
  Layer 1 - Schema unit:  safeParse with valid/invalid/edge-case inputs
  Layer 2 - Form:         userEvent (not fireEvent) + waitFor + role="alert"
  Layer 3 - Submit:       assert onSubmit called with correct typed data
  Do NOT test: RHF internals, Zod's own validation, CSS classes

DISCRIMINATED UNION CAVEATS
  .refine() on a member → wraps in ZodEffects → discriminator hidden → error
  Fix A: superRefine on the union itself, branch by data.type
  Fix B: switch to z.union (slower, but accepts branch-level refines)
  .extend() after .refine() → TypeScript error (extend ZodEffects fails)
  Fix: extend FIRST, then refine last

DATE INTERVAL EDGE CASES
  new Date('2025-06-15')  → UTC midnight bug → use parseISO always
  eachDayOfInterval end < start → RangeError → guard with min/max
  same-day differenceInDays → 0 → add .refine(d => diff >= 1, 'Min 1 night')
  formatISO with offset    → prevents timezone storage bugs
```

> **Your next action:** Find one `.refine()` in your codebase that checks more than one condition. Split it into two chained `.refine()` calls so both errors show simultaneously — or convert it to `superRefine` if it needs to touch multiple field paths.
>
> *Doing one small thing beats opening a feed.*
