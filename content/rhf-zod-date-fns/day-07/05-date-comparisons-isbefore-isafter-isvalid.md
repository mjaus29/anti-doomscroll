# 5 — Date Comparisons — `isBefore`, `isAfter`, `isValid`

---

## T — TL;DR

date-fns provides boolean comparison functions — `isBefore`, `isAfter`, `isEqual`, `isToday`, `isFuture`, `isPast`, `isValid`. Use them in Zod `.refine()` for date range validation and in UI logic for conditional rendering. Never compare dates with `<`, `>`, `===` directly on `Date` objects.

---

## K — Key Concepts

```ts
import {
  isBefore, isAfter, isEqual,
  isValid, isToday, isFuture, isPast,
  compareAsc, compareDesc,
  differenceInDays, differenceInCalendarMonths, differenceInHours
} from 'date-fns'

const a = new Date(2025, 5, 15)
const b = new Date(2025, 5, 22)
const c = new Date(2025, 5, 15)

// ─── Boolean comparisons
isBefore(a, b)   // true  — a is before b
isAfter(a, b)    // false — a is NOT after b
isEqual(a, c)    // true  — same millisecond timestamp
isBefore(a, a)   // false — not strictly before itself

// ─── Point in time helpers
isToday(new Date())   // true
isFuture(b)           // true if b is after right now
isPast(a)             // true if a is before right now

// ─── Validity check — always validate parsed dates
isValid(new Date(2025, 5, 15))  // true
isValid(new Date('invalid'))    // false
isValid(parseISO('bad-string')) // false

// ─── Comparison for sorting
const dates = [b, a, c]
dates.sort(compareAsc)    // [a, c, b] — ascending (earliest first)
dates.sort(compareDesc)   // [b, a, c] — descending (latest first)

// ─── Differences
differenceInDays(b, a)              // 7    (b - a in whole days)
differenceInCalendarMonths(b, a)    // 0    (same calendar month)
differenceInHours(b, a)             // 168  (7 days × 24 hours)
```

```ts
// ─── In Zod schemas — date range validation
import { z } from 'zod'
import { isBefore, isAfter, isValid, addDays } from 'date-fns'

const BookingSchema = z.object({
  checkIn:  z.coerce.date(),
  checkOut: z.coerce.date()
})
.refine(d => isBefore(d.checkIn, d.checkOut), {
  message: 'Check-out must be after check-in',
  path:    ['checkOut']
})
.refine(d => isAfter(d.checkIn, addDays(new Date(), -1)), {
  message: 'Check-in cannot be in the past',
  path:    ['checkIn']
})

// ─── In UI — conditional rendering
const daysUntilDeadline = differenceInDays(deadline, new Date())
const isUrgent          = daysUntilDeadline <= 3 && isFuture(deadline)
const isPastDeadline    = isPast(deadline)
```

---

## W — Why It Matters

- `date1 > date2` with JavaScript `Date` objects compares millisecond timestamps, not dates — this works but is confusing. `isAfter(date1, date2)` is readable and self-documenting.
- `isValid()` is the gate for all user-provided dates. Never skip it after `parse` or `parseISO` — an invalid date silently propagates to storage if unchecked.
- `differenceInDays` is truncated (not rounded) — `differenceInDays(5 days 23 hours, 0)` = `5`, not `6`. Use this for "days remaining" counters and "X days ago" calculations.

---

## I — Interview Q&A

### Q: How do you validate that a check-out date is at least 1 day after check-in in a Zod schema?

**A:** Use `.refine()` on the object schema with `isBefore` or `isAfter` from date-fns: `.refine(data => isAfter(data.checkOut, data.checkIn), { message: '...', path: ['checkOut'] })`. This checks the whole object after individual fields validate. For "at least 1 day after", use `isAfter(data.checkOut, data.checkIn)` since `isAfter` is strictly after — same day returns `false`. If you need "same day or after", use `!isBefore(data.checkOut, data.checkIn)` or compare with `addDays(data.checkIn, -1)`.

---

## C — Common Pitfalls + Fix

### ❌ Comparing `Date` objects with `===` — always false

```ts
// ❌ Date objects are reference types — two separate objects are never ===
const a = new Date(2025, 5, 15)
const b = new Date(2025, 5, 15)
console.log(a === b)  // false — different object references ❌
```

**Fix:** Use `isEqual` or compare timestamps:

```ts
// ✅
isEqual(a, b)              // true ✅
a.getTime() === b.getTime() // true ✅ (manual, less readable)
```

---

## K — Coding Challenge + Solution

### Challenge

Build a `EventDateSchema` with Zod: `startDate` and `endDate` (coerced dates), `registrationDeadline` (coerced date). Rules: `endDate` after `startDate`, `registrationDeadline` before `startDate`, both dates must be in the future. Use date-fns for all checks.

### Solution

```ts
import { z }                                            from 'zod'
import { isBefore, isAfter, isFuture, differenceInDays } from 'date-fns'

const EventDateSchema = z.object({
  title:                z.string().min(1),
  startDate:            z.coerce.date(),
  endDate:              z.coerce.date(),
  registrationDeadline: z.coerce.date()
})
.refine(d => isFuture(d.startDate), {
  message: 'Start date must be in the future',
  path:    ['startDate']
})
.refine(d => isAfter(d.endDate, d.startDate), {
  message: 'End date must be after start date',
  path:    ['endDate']
})
.refine(d => isBefore(d.registrationDeadline, d.startDate), {
  message: 'Registration deadline must be before the event start',
  path:    ['registrationDeadline']
})
.refine(d => isFuture(d.registrationDeadline), {
  message: 'Registration deadline must be in the future',
  path:    ['registrationDeadline']
})

// Valid
const valid = EventDateSchema.safeParse({
  title:                'Tech Summit 2026',
  startDate:            '2026-03-15',
  endDate:              '2026-03-17',
  registrationDeadline: '2026-02-28'
})
console.log(valid.success)  // true

// Invalid — endDate before startDate
const invalid = EventDateSchema.safeParse({
  title:                'Bad Event',
  startDate:            '2026-03-15',
  endDate:              '2026-03-10',  // ← before startDate
  registrationDeadline: '2026-02-28'
})
console.log(invalid.error?.issues[0].message)
// 'End date must be after start date'

// Duration info
if (valid.success) {
  const days = differenceInDays(valid.data.endDate, valid.data.startDate)
  console.log(`Event duration: ${days} day(s)`)  // '2'
}
```

---

---
