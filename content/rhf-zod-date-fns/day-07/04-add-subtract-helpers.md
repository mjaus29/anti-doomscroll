# 4 — Add/Subtract Helpers

---

## T — TL;DR

date-fns provides a helper for every unit — `addDays`, `addWeeks`, `addMonths`, `addYears`, `addHours`, `addMinutes`. Each returns a new `Date`. Use the `sub*` variants for subtraction. Use `add(date, duration)` for multi-unit operations in one call.

---

## K — Key Concepts

```ts
import {
  addDays, addWeeks, addMonths, addYears,
  addHours, addMinutes, addSeconds,
  subDays, subWeeks, subMonths, subYears,
  add, sub
} from 'date-fns'

const base = new Date(2025, 5, 15)  // June 15, 2025

// ─── Single-unit helpers
addDays(base,    7)    // June 22, 2025
addWeeks(base,   2)    // June 29, 2025
addMonths(base,  1)    // July 15, 2025
addYears(base,   1)    // June 15, 2026
addHours(base,   3)    // June 15, 2025 03:00
addMinutes(base, 90)   // June 15, 2025 01:30

subDays(base,    7)    // June 8, 2025
subMonths(base,  1)    // May 15, 2025
subYears(base,   5)    // June 15, 2020

// ─── Negative values work too
addDays(base, -7)      // June 8, 2025 (same as subDays)
```

```ts
// ─── add() and sub() — multi-unit in one call
add(base, { years: 1, months: 2, days: 5 })
// June 15, 2025 + 1yr + 2mo + 5d = August 20, 2026

sub(base, { weeks: 2, hours: 6 })
// June 1, 2025 18:00

// ─── Useful in form workflows

// 1. Default checkout date = today + 1 day
const tomorrow     = addDays(new Date(), 1)

// 2. Trial expiry = signup + 14 days
const signupDate   = new Date()
const trialExpiry  = addDays(signupDate, 14)

// 3. Min/Max for date inputs
const minDate = new Date()                  // can't book in the past
const maxDate = addMonths(new Date(), 6)    // max 6 months ahead
// In an input: min={format(minDate, 'yyyy-MM-dd')} max={format(maxDate, 'yyyy-MM-dd')}

// 4. Billing: next invoice = last invoice + 1 month
const lastInvoice  = new Date(2025, 0, 31)  // Jan 31
const nextInvoice  = addMonths(lastInvoice, 1)
// → Feb 28, 2025 (date-fns handles month-end correctly — no Feb 31)
```

```ts
// ─── Month-end handling — date-fns is correct
addMonths(new Date(2025, 0, 31), 1)   // Jan 31 + 1 month = Feb 28 ✅
addMonths(new Date(2025, 0, 31), 2)   // Jan 31 + 2 months = Mar 31 ✅
// date-fns clips to the last valid day of the target month automatically
```

---

## W — Why It Matters

- `addMonths` correctly handles month-end clipping — January 31 + 1 month = February 28 (not February 31 or an invalid date). This is critical for billing and subscription logic.
- The `add(date, duration)` form is cleaner for multi-unit offsets — "1 year, 2 months, and 3 days from now" in one call, not three chained function calls.
- Setting `min`/`max` on HTML date inputs requires ISO string values — `format(addMonths(new Date(), 6), 'yyyy-MM-dd')` produces exactly the format the browser expects.

---

## I — Interview Q&A

### Q: How does `addMonths` handle adding one month to January 31?

**A:** `addMonths(new Date(2025, 0, 31), 1)` returns February 28, 2025 — the last valid day of February. date-fns clips the resulting date to the last day of the target month when the source day-of-month doesn't exist in the target. This is the "end-of-month" behaviour most users and businesses expect. Adding a second month from February 28 returns March 28 (not March 31), because the source is now February 28, not the original January 31. If you need consistent end-of-month billing (always the last day), use `endOfMonth(addMonths(date, 1))` explicitly.

---

## C — Common Pitfalls + Fix

### ❌ Mutating the original date with manual manipulation

```ts
// ❌ Mutates the original date
const d = new Date()
d.setDate(d.getDate() + 7)  // mutation — d is now different
```

**Fix:** Use date-fns — always returns a new Date:

```ts
// ✅ Pure — original d is unchanged
const d    = new Date()
const next = addDays(d, 7)
```

---

## K — Coding Challenge + Solution

### Challenge

Build a `generateBillingDates` function: given a `startDate` and number of `months`, return an array of billing dates (one per month), formatted for display and for input values. Handle month-end correctly.

### Solution

```ts
import { addMonths, format } from 'date-fns'

interface BillingDate {
  date:       Date
  display:    string   // 'June 15, 2025'
  inputValue: string   // '2025-06-15'
  label:      string   // 'Payment 1 of 6'
}

function generateBillingDates(startDate: Date, months: number): BillingDate[] {
  return Array.from({ length: months }, (_, i) => {
    const date = addMonths(startDate, i)
    return {
      date,
      display:    format(date, 'MMMM d, yyyy'),
      inputValue: format(date, 'yyyy-MM-dd'),
      label:      `Payment ${i + 1} of ${months}`
    }
  })
}

// Test with end-of-month
const billing = generateBillingDates(new Date(2025, 0, 31), 4)
billing.forEach(b => console.log(`${b.label}: ${b.display}`))
// Payment 1 of 4: January 31, 2025
// Payment 2 of 4: February 28, 2025   ← clipped correctly
// Payment 3 of 4: March 31, 2025
// Payment 4 of 4: April 30, 2025      ← clipped correctly

// Min/max for a booking form
const today  = new Date()
const minVal = format(today, 'yyyy-MM-dd')
const maxVal = format(addMonths(today, 6), 'yyyy-MM-dd')
console.log(`min="${minVal}" max="${maxVal}"`)
// min="2025-06-15" max="2025-12-15"
```

---

---
