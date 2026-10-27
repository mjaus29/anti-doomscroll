# 8 — Discriminated Union Caveats, Refined Schemas, and Date Interval Edge Cases

---

## T — TL;DR

In Zod 4, `.refine()` on a discriminated-union member works (Zod 3 wrapped it in `ZodEffects` and broke the union), but refined object schemas can no longer be `.pick()`ed, `.omit()`ed or `.partial()`ed, and `.extend()` cannot overwrite their keys. Date intervals have three silent bugs: UTC midnight, end-before-start, and same-day zero-duration. Know the fix for each.

---

## K — Key Concepts

```ts
// ─── CAVEAT 1: refine on a discriminated union member
// Zod 3: .refine() wrapped the member in ZodEffects, which hid the discriminator, so this threw
//        "The discriminator value for the schema at index 0 could not be parsed".
// Zod 4: refinements are checks stored ON the object schema (ZodEffects is gone), so this just works ✅
const MemberRefinedUnion = z.discriminatedUnion('type', [
  z.object({ type: z.literal('card'), cardNumber: z.string() })
   .refine(d => d.cardNumber.length === 16, { error: 'Must be 16 digits', path: ['cardNumber'] }),
  z.object({ type: z.literal('bank'), bsb: z.string() })
])

// ✅ Still a good option: one superRefine on the union, branching on data.type
// (keeps every cross-branch rule in one place)
const WorkingUnion = z.discriminatedUnion('type', [
  z.object({ type: z.literal('card'), cardNumber: z.string() }),
  z.object({ type: z.literal('bank'), bsb: z.string() })
]).superRefine((data, ctx) => {
  if (data.type === 'card' && data.cardNumber.length !== 16) {
    ctx.addIssue({ code: 'custom',
      message: 'Must be 16 digits', path: ['cardNumber'] })
  }
})

// z.union also still works with branch-level refines — it just tries each branch in turn
// (slower, and worse error messages) — only reach for it when there is no shared discriminator.
```

```ts
// ─── CAVEAT 2: z.union vs z.discriminatedUnion error quality
// z.discriminatedUnion: precise — only validates matching branch
// z.union: shows all branch errors OR "invalid union" when no branch matches

// When to use which:
// All branches share a unique discriminator key → discriminatedUnion
// Branches have no shared literal discriminator    → z.union

// ─── DATE INTERVAL EDGE CASES

// Bug 1: UTC midnight — new Date('2025-06-15') is UTC, not local
import { parseISO, isAfter, isBefore, startOfDay, endOfDay } from 'date-fns'

const d1 = new Date('2025-06-15')           // UTC midnight → 2025-06-14 19:00 local in UTC-5
const d2 = parseISO('2025-06-15')           // 2025-06-15T00:00:00 local ✅
// For form date inputs: always use parseISO, never new Date(string)
```

```ts
// Bug 2: end before start in eachDayOfInterval — does NOT throw, it silently returns the days in REVERSE order
import { eachDayOfInterval, min, max } from 'date-fns'

// ❌ Surprise: a reversed interval gives [Jun 5, Jun 4, ... Jun 1] (descending), not an error or []
eachDayOfInterval({ start: end, end: start })

// ✅ Normalise order yourself (and reject end < start with a refine if that is invalid for your form)
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
  error: 'Minimum 1 night stay', path: ['checkOut']
})
```

```ts
// ─── Refined schema composition caveat — shape methods AFTER .refine()
// Zod 3: refine() returned ZodEffects, so .extend/.pick/.omit/.partial were not even methods (TypeError).
// Zod 4: the schema stays an object, but the shape methods guard against silently dropping refinements:
const RefinedSchema = z.object({ name: z.string() }).refine(d => !!d.name)

RefinedSchema.extend({ email: z.string() })          // ✅ adding NEW keys is allowed (refinement kept)
RefinedSchema.extend({ name: z.string().min(3) })    // ❌ throws: "Cannot overwrite keys on object schemas containing refinements. Use .safeExtend()"
RefinedSchema.pick({ name: true })                   // ❌ throws: ".pick() cannot be used on object schemas containing refinements"
// same for .omit() and .partial()
RefinedSchema.safeExtend({ email: z.string() })      // ✅ Zod 4.1+: extend that is safe on refined schemas

// ✅ Best habit: shape methods FIRST, then refine
const Base     = z.object({ name: z.string() })
const Extended = Base.extend({ email: z.string() })
const Final    = Extended.refine(d => !!d.name && !!d.email)  // ✅

// ✅ Or: extend the base, apply refine to the extended version
const CreateSchema = Base.extend({ role: z.string() })
  .refine(d => d.role !== 'superadmin', 'Reserved role')
```

---

## W — Why It Matters

- In Zod 3, the discriminated union + `.refine()` pitfall was one of the most confusing errors — the message said the discriminator "could not be parsed" without hinting at the cause. Zod 4 removed it (members can be refined), so if you see that error you are probably on an old Zod 3 install.
- The UTC midnight bug (`new Date('2025-06-15')`) causes off-by-one-day display for users in UTC-negative and UTC-positive timezones. `parseISO` is the consistent fix — always.
- Shape methods after `.refine()` are a schema composition order error: `.pick()`, `.omit()`, `.partial()` and key-overwriting `.extend()` throw at schema-build time in Zod 4 (a TypeError in Zod 3). Remember: transform, refine, and superRefine are always the last step.

---

## I — Interview Q&A

### Q: Why did adding `.refine()` to a `z.discriminatedUnion` member break the union in Zod 3, and what changed in Zod 4?

**A:** `z.discriminatedUnion` reads the discriminator field from each member schema to build a lookup map. In Zod 3, `.refine()` wrapped a member in a `ZodEffects` object that didn't expose the inner schema's discriminator, so Zod threw "The discriminator value for the schema at index 0 could not be parsed". The Zod 3 fixes were to move the refinement onto the union with `.superRefine()` (check `data.type` first) or to fall back to `z.union`. Zod 4 removed `ZodEffects` — refinements are checks stored on the schema itself — so a refined object is still an object and can be a union member. `.superRefine()` on the union remains a good way to keep branch-specific rules in one place. The Zod 4 caveat to remember instead: refined object schemas cannot be `.pick()`ed, `.omit()`ed or `.partial()`ed, and `.extend()` cannot overwrite their keys — build the shape first, refine last (or use `.safeExtend()`).

---

## C — Common Pitfalls + Fix

### ❌ `.pick()` / `.omit()` / `.partial()` called after `.refine()` — throws

```ts
// ❌ Zod 4 throws at build time: ".partial() cannot be used on object schemas containing refinements"
// (Zod 3: TypeError — .refine() returned ZodEffects, which has no .partial/.extend)
const Schema = z.object({ name: z.string() })
  .refine(d => d.name.length > 2)
const PatchSchema = Schema.partial()  // ❌
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

Refactor a `PaymentUnion` that has `.refine()` on a discriminated union member so all branch-specific rules live in one `superRefine` on the union. Also write a `safeBookingInterval` function that handles all three date edge cases (UTC midnight, end-before-start, same-day).

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
      ctx.addIssue({ code: 'custom',
        message: 'Card number must be 16 digits', path: ['cardNumber'] })
    }
    if (!/^\d{2}\/\d{2}$/.test(data.expiry)) {
      ctx.addIssue({ code: 'custom',
        message: 'Expiry must be MM/YY', path: ['expiry'] })
    }
  }
  if (data.method === 'paypal') {
    if (!data.email.includes('@')) {
      ctx.addIssue({ code: 'custom',
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
    return                      → ends YOUR callback only
    { fatal: true } on addIssue → stops later chained checks from running
  })
  Chain .refine for independent rules — all show simultaneously
  Use fatal: true after a critical issue — prevent cascading noise

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
  Edit schema  = Base.extend({ id: z.uuid() })
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
  Zod 4: .refine() on a member is fine (Zod 3: ZodEffects hid the discriminator → error)
  superRefine on the union itself, branch by data.type = one place for all branch rules
  .pick/.omit/.partial/.extend-overwrite AFTER .refine() → throws (Zod 3: TypeError)
  Fix: shape methods FIRST, then refine last (or .safeExtend())

DATE INTERVAL EDGE CASES
  new Date('2025-06-15')  → UTC midnight bug → use parseISO always
  eachDayOfInterval end < start → no error: days come back in REVERSE order → normalise with min/max
  same-day differenceInDays → 0 → add .refine(d => diff >= 1, 'Min 1 night')
  formatISO with offset    → prevents timezone storage bugs
```

> **Your next action:** Find one `.refine()` in your codebase that checks more than one condition. Split it into two chained `.refine()` calls so both errors show simultaneously — or convert it to `superRefine` if it needs to touch multiple field paths.
>
> *Doing one small thing beats opening a feed.*
