# 2 — Cross-field and Date-Range Validation Patterns

---

## T — TL;DR

Cross-field validation compares two or more fields — password confirm, date ranges, budget limits. Always place cross-field rules on the **object schema** (not individual fields) so Zod has access to all values. Use `isBefore`/`isAfter` from date-fns for date comparisons.

---

## K — Key Concepts

```ts
import { z }                           from 'zod'
import { isBefore, isAfter, isFuture,
         differenceInDays, addDays }   from 'date-fns'

// ─── Pattern 1: simple two-field comparison
const DateRangeSchema = z.object({
  startDate: z.coerce.date(),
  endDate:   z.coerce.date()
})
.refine(d => isAfter(d.endDate, d.startDate), {
  message: 'End must be after start',
  path:    ['endDate']
})

// ─── Pattern 2: multiple date + business rules chained
const BookingSchema = z.object({
  checkIn:   z.coerce.date(),
  checkOut:  z.coerce.date(),
  maxNights: z.number().default(14)
})
.refine(d => isFuture(d.checkIn), {
  message: 'Check-in must be in the future', path: ['checkIn']
})
.refine(d => isAfter(d.checkOut, d.checkIn), {
  message: 'Check-out must be after check-in', path: ['checkOut']
})
.refine(d => differenceInDays(d.checkOut, d.checkIn) <= d.maxNights, {
  message: `Cannot exceed ${14} nights`, path: ['checkOut']
})
.refine(d => differenceInDays(d.checkOut, d.checkIn) >= 1, {
  message: 'Minimum 1 night stay', path: ['checkOut']
})
```

```ts
// ─── Pattern 3: budget cross-field
const BudgetSchema = z.object({
  totalBudget: z.number().positive(),
  designCost:  z.number().nonnegative(),
  devCost:     z.number().nonnegative(),
  qaaCost:     z.number().nonnegative()
})
.superRefine((d, ctx) => {
  const allocated = d.designCost + d.devCost + d.qaaCost
  if (allocated > d.totalBudget) {
    ctx.addIssue({
      code:    z.ZodIssueCode.custom,
      message: `Allocated $${allocated} exceeds total budget $${d.totalBudget}`,
      path:    ['totalBudget']
    })
  }
})

// ─── Pattern 4: min date relative to another field
const TravelSchema = z.object({
  departDate:  z.coerce.date(),
  returnDate:  z.coerce.date(),
  tripType:    z.enum(['one-way', 'round-trip'])
})
.superRefine((d, ctx) => {
  if (d.tripType === 'round-trip') {
    if (!isAfter(d.returnDate, d.departDate)) {
      ctx.addIssue({ code: z.ZodIssueCode.custom,
        message: 'Return must be after departure', path: ['returnDate'] })
    }
    if (differenceInDays(d.returnDate, d.departDate) > 365) {
      ctx.addIssue({ code: z.ZodIssueCode.custom,
        message: 'Trip cannot exceed 1 year', path: ['returnDate'] })
    }
  }
})
```

---

## W — Why It Matters

- Date comparisons directly on `Date` objects with `>` or `<` work by millisecond timestamp — but `isAfter(a, b)` communicates intent and handles edge cases (same millisecond). Readability matters in validation code that other developers maintain.
- Chaining multiple `.refine` calls on the same object schema means all rules run — a booking form shows "must be future" AND "minimum 1 night" errors simultaneously on first submit, instead of one at a time.
- `superRefine` for budget allocation lets you include dynamic values (computed totals) in the error message — `.refine` can only return true/false and a static string.

---

## I — Interview Q&A

### Q: Why do cross-field validation rules go on the object schema and not on individual field schemas?

**A:** Individual field schemas (`z.string()`, `z.coerce.date()`) validate in isolation — they receive only their own value. Cross-field rules need access to multiple values simultaneously. By placing `.refine()` or `.superRefine()` on `z.object({...})`, the validation function receives the entire object as its first argument, so `data.startDate` and `data.endDate` are both available. The `path` option on the refine then specifies which field's error message the issue should appear on in the form UI.

---

## C — Common Pitfalls + Fix

### ❌ Placing cross-field validation on an individual field schema

```ts
// ❌ z.coerce.date() validates in isolation — no access to other fields
const Schema = z.object({
  startDate: z.coerce.date(),
  endDate:   z.coerce.date().refine(
    end => end > startDate,  // ← startDate is not in scope here
    'Must be after start'
  )
})
```

**Fix:** Move the cross-field refine to the object schema:

```ts
// ✅ Object-level refine has access to all fields
const Schema = z.object({
  startDate: z.coerce.date(),
  endDate:   z.coerce.date()
}).refine(d => isAfter(d.endDate, d.startDate), {
  message: 'End must be after start', path: ['endDate']
})
```

---

## K — Coding Challenge + Solution

### Challenge

Build a `ProjectBidSchema` — `bidDeadline` (future date), `projectStart` (after deadline), `projectEnd` (after start, max 90 days duration), `budgetMin`/`budgetMax` (max >= min). All cross-field with date-fns. Show all errors at once.

### Solution

```ts
import { z }              from 'zod'
import { isAfter, isFuture, differenceInDays } from 'date-fns'

const ProjectBidSchema = z.object({
  title:        z.string().min(3),
  bidDeadline:  z.coerce.date(),
  projectStart: z.coerce.date(),
  projectEnd:   z.coerce.date(),
  budgetMin:    z.coerce.number().positive(),
  budgetMax:    z.coerce.number().positive()
})
.refine(d => isFuture(d.bidDeadline), {
  message: 'Deadline must be in the future', path: ['bidDeadline']
})
.refine(d => isAfter(d.projectStart, d.bidDeadline), {
  message: 'Project must start after bid deadline', path: ['projectStart']
})
.refine(d => isAfter(d.projectEnd, d.projectStart), {
  message: 'End must be after start', path: ['projectEnd']
})
.refine(d => differenceInDays(d.projectEnd, d.projectStart) <= 90, {
  message: 'Project duration cannot exceed 90 days', path: ['projectEnd']
})
.refine(d => d.budgetMax >= d.budgetMin, {
  message: 'Max budget must be ≥ min budget', path: ['budgetMax']
})

const result = ProjectBidSchema.safeParse({
  title: 'App Redesign', bidDeadline: '2026-02-01',
  projectStart: '2026-01-01',  // ← before deadline
  projectEnd:   '2026-05-15',  // ← >90 days
  budgetMin: 5000, budgetMax: 3000  // ← max < min
})
console.log(result.error?.issues.map(i => `${i.path[0]}: ${i.message}`))
// ['projectStart: ...', 'projectEnd: ...', 'budgetMax: ...']
```

---

---
