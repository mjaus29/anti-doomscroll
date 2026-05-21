
# 📅 Day 7 — date-fns for Form Workflows

> **Goal:** Parse, validate, format, and transform dates across the full form lifecycle — from user input to storage to display — using date-fns v4.1.0 pure functions.
> **Format:** Each subtopic = 5–15 min. Do one. Stop. Come back.
> **Stack:** date-fns v4.1.0 · zod v4.3.6 · TypeScript 6

---

## 📋 Day 7 Subtopic Overview

| # | Subtopic | Time |
|---|----------|------|
| 1 | date-fns Fundamentals — Pure Functions and Immutability | 8 min |
| 2 | `format` and `formatISO` — Display Formatting | 10 min |
| 3 | `parse` and `parseISO` — Parsing User Input and ISO Strings | 12 min |
| 4 | Add/Subtract Helpers | 10 min |
| 5 | Date Comparisons — `isBefore`, `isAfter`, `isValid` | 10 min |
| 6 | Intervals and Duration | 10 min |
| 7 | `formatDistance` and `formatRelative` | 10 min |
| 8 | Display vs Storage — Normalization in Form Workflows | 12 min |

---

---

# 1 — date-fns Fundamentals — Pure Functions and Immutability

---

## T — TL;DR

date-fns is a collection of **pure functions** — each takes a date and returns a new date or value without mutating the input. Import only what you use — tree-shaking keeps bundles small. JavaScript `Date` objects are always mutable; date-fns never mutates them.

---

## K — Key Concepts

```bash
npm install date-fns
```

```ts
// ─── Every function is a named export — tree-shaken automatically
import { format, addDays, isBefore, parseISO } from 'date-fns'

// ─── Pure: original date NEVER mutated
const today = new Date(2025, 5, 15)       // June 15, 2025
const next  = addDays(today, 7)           // June 22, 2025
console.log(today.toISOString())          // '2025-06-15...' — unchanged ✅
console.log(next.toISOString())           // '2025-06-22...'

// ─── Every function accepts Date | number (timestamp)
const ts  = Date.now()                    // number
format(ts, 'yyyy-MM-dd')                  // works ✅
format(new Date(), 'yyyy-MM-dd')          // works ✅

// ─── date-fns v4 — no more submodules, direct imports everywhere
// v3 and below: import from 'date-fns/addDays'
// v4:           import { addDays } from 'date-fns'  ← only way
```

```ts
// ─── Core mental model
// Input:  Date | number (timestamp) | string (via parse/parseISO)
// Output: Date (new object) | string | number | boolean | object

// Every call is stateless — no global config, no side effects
// Exception: locale — passed explicitly per call, not set globally

import { format }    from 'date-fns'
import { enUS, fil } from 'date-fns/locale'

const d = new Date(2025, 0, 15)
format(d, 'MMMM d, yyyy', { locale: enUS })  // 'January 15, 2025'
format(d, 'MMMM d, yyyy', { locale: fil  })  // 'Enero 15, 2025'
```

```
date-fns function categories:

  Formatting:    format, formatISO, formatDistance, formatRelative, formatDuration
  Parsing:       parse, parseISO, fromUnixTime
  Manipulation:  addDays, addMonths, subHours, startOfDay, endOfMonth, ...
  Comparison:    isBefore, isAfter, isEqual, isValid, compareAsc, compareDesc
  Information:   getDayOfYear, getWeek, differenceInDays, differenceInCalendarMonths
  Intervals:     intervalToDuration, eachDayOfInterval, areIntervalsOverlapping
```

---

## W — Why It Matters

- Tree-shaking means `import { format } from 'date-fns'` adds ~2KB to your bundle — not the full library. Moment.js imported the entire library (>200KB) regardless of what you used. date-fns has no equivalent penalty.
- Pure functions compose safely in React — you can call them directly in `useMemo`, Zod transforms, and formatters without worrying about side effects or mutated state.
- v4's unified import path means no more confusion between `date-fns/format` vs `date-fns/esm/format` vs subpath imports from v2/v3 — one import style, always.

---

## I — Interview Q&A

### Q: Why is date-fns preferred over Moment.js in modern React projects?

**A:** Three reasons. First, bundle size — date-fns is tree-shaken by function, so you pay only for what you import (2–5KB per function). Moment.js ships ~70KB minified with no tree-shaking. Second, immutability — date-fns never mutates the input `Date` objects, making it safe in React state and Zod transforms. Moment objects are mutable, causing subtle bugs when shared between components. Third, TypeScript — date-fns ships its own type definitions and has precise types per function. Moment has third-party types that lag behind.

---

## C — Common Pitfalls + Fix

### ❌ Importing the entire library

```ts
// ❌ No tree-shaking in CommonJS environments — pulls full library
import dateFns from 'date-fns'
dateFns.format(new Date(), 'yyyy-MM-dd')
```

**Fix:** Always use named imports:

```ts
// ✅ Only format is bundled
import { format } from 'date-fns'
format(new Date(), 'yyyy-MM-dd')
```

---

## K — Coding Challenge + Solution

### Challenge

Write a pure function `getWeekSummary(date: Date)` using only date-fns imports that returns: `{ label: string (e.g. "Week 24 of 2025"), startOfWeek: Date, endOfWeek: Date }`. No mutation.

### Solution

```ts
import { getWeek, getYear, startOfWeek, endOfWeek, addDays } from 'date-fns'

function getWeekSummary(date: Date) {
  const week  = getWeek(date)
  const year  = getYear(date)
  const start = startOfWeek(date, { weekStartsOn: 1 })  // Monday
  const end   = endOfWeek(date,   { weekStartsOn: 1 })  // Sunday

  return {
    label:        `Week ${week} of ${year}`,
    startOfWeek:  start,
    endOfWeek:    end
  }
}

const today   = new Date(2025, 5, 15)  // June 15, 2025
const summary = getWeekSummary(today)
console.log(summary.label)                    // 'Week 24 of 2025'
console.log(summary.startOfWeek.toISOString()) // Monday
console.log(summary.endOfWeek.toISOString())   // Sunday
console.log(today.toISOString())               // unchanged — pure ✅
```

---

---

# 2 — `format` and `formatISO` — Display Formatting

---

## T — TL;DR

`format(date, pattern)` converts a `Date` to a string using a pattern string. `formatISO(date)` outputs a standards-compliant ISO 8601 string. Use `format` for display; use `formatISO` for storage and API payloads.

---

## K — Key Concepts

```ts
import { format, formatISO } from 'date-fns'

const d = new Date(2025, 5, 15, 14, 30, 0)  // June 15, 2025 14:30:00

// ─── format — display strings
format(d, 'yyyy-MM-dd')          // '2025-06-15'         (ISO date)
format(d, 'dd/MM/yyyy')          // '15/06/2025'         (UK/AU style)
format(d, 'MM/dd/yyyy')          // '06/15/2025'         (US style)
format(d, 'MMMM d, yyyy')        // 'June 15, 2025'      (long)
format(d, 'MMM d')               // 'Jun 15'             (short)
format(d, 'EEEE, MMMM d')        // 'Sunday, June 15'    (day + date)
format(d, 'h:mm a')              // '2:30 PM'            (12-hour)
format(d, 'HH:mm')               // '14:30'              (24-hour)
format(d, 'HH:mm:ss')            // '14:30:00'
format(d, "MMM d 'at' h:mm a")   // "Jun 15 at 2:30 PM"  (escaped text)
format(d, 'yyyy-MM-dd HH:mm:ss') // '2025-06-15 14:30:00'

// ─── Pattern tokens reference (most used)
// yyyy  → 4-digit year (2025)   yy → 2-digit year (25)
// MM    → month 01-12           MMM → Jan   MMMM → January
// dd    → day 01-31             d → 1-31
// HH    → 24-hour 00-23         hh → 12-hour 01-12
// mm    → minutes 00-59         ss → seconds
// a     → AM/PM
// EEEE  → Monday                EEE → Mon
// 'text'→ literal text (escaped)
```

```ts
// ─── formatISO — ISO 8601 for storage / API
formatISO(d)
// '2025-06-15T14:30:00+08:00'  (local timezone offset)

formatISO(d, { representation: 'date' })
// '2025-06-15'  (date only — no time, no timezone)

formatISO(d, { representation: 'time' })
// '14:30:00+08:00'

// ─── Difference: format vs formatISO
// format:    display — human-readable, locale-aware pattern
// formatISO: storage — machine-readable, timezone-aware ISO 8601

// ─── HTML input value format
// <input type="date" /> needs 'yyyy-MM-dd'
// <input type="datetime-local" /> needs "yyyy-MM-dd'T'HH:mm"
// <input type="time" /> needs 'HH:mm'

const inputDateValue       = format(d, 'yyyy-MM-dd')        // for <input type="date">
const inputDateTimeValue   = format(d, "yyyy-MM-dd'T'HH:mm") // for <input type="datetime-local">
const inputTimeValue       = format(d, 'HH:mm')              // for <input type="time">
```

```ts
// ─── Locale-aware formatting
import { format }   from 'date-fns'
import { enUS, ja } from 'date-fns/locale'

const d = new Date(2025, 5, 15)
format(d, 'MMMM d, yyyy', { locale: enUS }) // 'June 15, 2025'
format(d, 'MMMM d, yyyy', { locale: ja   }) // '6月 15, 2025'
format(d, 'EEEE',         { locale: enUS }) // 'Sunday'
format(d, 'EEEE',         { locale: ja   }) // '日曜日'
```

---

## W — Why It Matters

- HTML `<input type="date">` requires `yyyy-MM-dd` format for its `value` prop — any other format produces a blank input. `format(date, 'yyyy-MM-dd')` is the bridge between a `Date` object and a usable input value.
- `formatISO` ensures timezone offset is included in stored strings — avoiding the UTC midnight bug where `2025-06-15` stored without timezone information is interpreted as `2025-06-14` in UTC-offset timezones.
- Locale-aware `format` with `locale` option means one function handles internationalization — no separate i18n library for dates.

---

## I — Interview Q&A

### Q: What is the difference between `format(d, 'yyyy-MM-dd')` and `formatISO(d, { representation: 'date' })`?

**A:** Both produce `'2025-06-15'` for the same date. The difference is intent and behaviour with time zones. `format(d, 'yyyy-MM-dd')` uses the local timezone to extract year, month, day — it's a display formatter. `formatISO(d, { representation: 'date' })` is explicitly ISO 8601 compliant and intended for machine consumption and storage. For HTML input values and display, use `format`. For API payloads, database writes, and `Content-Type: application/json` responses, use `formatISO` — it signals that the string is a standard interchange format, not a locale-specific display string.

---

## C — Common Pitfalls + Fix

### ❌ Using uppercase `MM` and `DD` for minutes and days (Moment.js habits)

```ts
// ❌ date-fns uses different tokens than Moment.js
format(new Date(), 'MM/DD/YYYY')
// MM → month (correct), DD → Day of year (wrong!), YYYY → week-year (wrong!)
// Output: '06/166/2025' ← garbage
```

**Fix:** Use lowercase `dd` for day, `yyyy` for calendar year:

```ts
// ✅ date-fns tokens
format(new Date(), 'MM/dd/yyyy')  // '06/15/2025'
```

---

## K — Coding Challenge + Solution

### Challenge

Write a `formatDateForDisplay(date: Date, style: 'short' | 'long' | 'relative-input')` function that returns: short = `'Jun 15'`, long = `'Sunday, June 15, 2025'`, relative-input = `'2025-06-15'` (for HTML input value). Also write `formatDateTimeForInput(date: Date)` for `datetime-local`.

### Solution

```ts
import { format } from 'date-fns'

type DateStyle = 'short' | 'long' | 'relative-input'

function formatDateForDisplay(date: Date, style: DateStyle): string {
  switch (style) {
    case 'short':          return format(date, 'MMM d')
    case 'long':           return format(date, 'EEEE, MMMM d, yyyy')
    case 'relative-input': return format(date, 'yyyy-MM-dd')
  }
}

function formatDateTimeForInput(date: Date): string {
  return format(date, "yyyy-MM-dd'T'HH:mm")
}

function formatTimeForInput(date: Date): string {
  return format(date, 'HH:mm')
}

const d = new Date(2025, 5, 15, 14, 30)

console.log(formatDateForDisplay(d, 'short'))          // 'Jun 15'
console.log(formatDateForDisplay(d, 'long'))           // 'Sunday, June 15, 2025'
console.log(formatDateForDisplay(d, 'relative-input')) // '2025-06-15'
console.log(formatDateTimeForInput(d))                 // '2025-06-15T14:30'
console.log(formatTimeForInput(d))                     // '14:30'
```

---

---

# 3 — `parse` and `parseISO` — Parsing User Input and ISO Strings

---

## T — TL;DR

`parseISO('2025-06-15')` converts an ISO 8601 string to a `Date`. `parse('15/06/2025', 'dd/MM/yyyy', new Date())` converts any custom string format to a `Date`. Always validate the result with `isValid()` — both functions return `Invalid Date` on failure rather than throwing.

---

## K — Key Concepts

```ts
import { parseISO, parse, isValid } from 'date-fns'

// ─── parseISO — for ISO 8601 strings (from APIs, databases, HTML date inputs)
parseISO('2025-06-15')                    // Date: June 15, 2025 00:00:00 local
parseISO('2025-06-15T14:30:00')           // Date with time
parseISO('2025-06-15T14:30:00Z')          // Date UTC
parseISO('2025-06-15T14:30:00+08:00')     // Date with offset
parseISO('invalid')                       // Invalid Date (not a throw!)

// ─── Always check isValid after parsing
const d = parseISO(someString)
if (!isValid(d)) {
  console.error('Invalid date string')
}
```

```ts
// ─── parse — for custom format strings (user input, CSV imports)
// Signature: parse(dateString, formatString, referenceDate)
// referenceDate: used as fallback for missing components (year, time, etc.)

const ref = new Date()  // reference date — provides defaults for missing parts

parse('15/06/2025',       'dd/MM/yyyy',          ref) // June 15, 2025
parse('06/15/2025',       'MM/dd/yyyy',          ref) // June 15, 2025
parse('June 15, 2025',    'MMMM d, yyyy',        ref) // June 15, 2025
parse('Jun 15',           'MMM d',               ref) // June 15 of ref's year
parse('14:30',            'HH:mm',               ref) // today at 14:30
parse('2:30 PM',          'h:mm a',              ref) // today at 14:30
parse('15-06-2025 14:30', 'dd-MM-yyyy HH:mm',   ref) // June 15, 2025 14:30

// ─── What the reference date does
// parse('Jun 15', 'MMM d', new Date(2025, 0, 1))
// → June 15, 2025  (year taken from referenceDate when format has no year token)

// ─── parse returns Invalid Date on failure — not a throw
const bad = parse('not-a-date', 'dd/MM/yyyy', new Date())
isValid(bad)  // false
```

```ts
// ─── Practical: HTML <input type="date"> value parsing
// Input gives you: '2025-06-15' (always yyyy-MM-dd)
// Use parseISO — it's an ISO date string

function inputValueToDate(value: string): Date | null {
  if (!value) return null
  const d = parseISO(value)
  return isValid(d) ? d : null
}

// ─── Zod integration — parse in a transform
import { z } from 'zod'

const DateStringSchema = z.string()
  .min(1, 'Date is required')
  .transform(v => parseISO(v))
  .refine(d => isValid(d), { message: 'Invalid date' })

// Or using z.coerce.date() (simpler for ISO strings)
const CoercedDateSchema = z.coerce.date()
// '2025-06-15' → new Date('2025-06-15') → valid Date ✅
```

---

## W — Why It Matters

- `parseISO` correctly handles timezone offsets in ISO strings — `new Date('2025-06-15')` is ambiguous (treated as UTC midnight), while `parseISO('2025-06-15')` uses local time, matching what users expect when they type a date.
- `parse` with a reference date is the correct tool for user-typed date strings in non-ISO formats — contact form date fields, CSV imports, legacy data — where the format is known but not ISO.
- Both functions returning `Invalid Date` instead of throwing means you can use them inline in validation without try/catch — just check `isValid()` after parsing.

---

## I — Interview Q&A

### Q: What is the difference between `new Date('2025-06-15')` and `parseISO('2025-06-15')`?

**A:** `new Date('2025-06-15')` parses the string as UTC midnight — in a UTC+8 timezone, this renders as June 14 at 20:00 local time, causing an off-by-one-day bug in display. `parseISO('2025-06-15')` from date-fns parses it as local midnight — June 15 at 00:00 in whatever timezone the user's browser is in. For date-only strings from HTML inputs and form submissions, `parseISO` gives the behaviour users expect. Use `new Date(isoStringWithOffset)` or `parseISO(isoStringWithOffset)` when a timezone offset is present in the string.

---

## C — Common Pitfalls + Fix

### ❌ Using `parse` without the reference date parameter

```ts
// ❌ parse requires 3 arguments — TypeScript catches this but runtime also fails
parse('15/06/2025', 'dd/MM/yyyy')  // TypeError: missing argument
```

**Fix:** Always provide the reference date:

```ts
// ✅ Reference date used for any missing component (time, timezone)
parse('15/06/2025', 'dd/MM/yyyy', new Date())
// Or use a stable reference if year matters:
parse('Jun 15', 'MMM d', new Date(2025, 0, 1))
```

---

## K — Coding Challenge + Solution

### Challenge

Build a `safeParseDateInput` utility that: accepts a string and a format (`'iso' | 'us' | 'uk' | 'datetime-local'`), parses accordingly, returns `{ date: Date; formatted: string } | { error: string }`. Test all four formats.

### Solution

```ts
import { parseISO, parse, isValid, format } from 'date-fns'

type ParseResult =
  | { date: Date; formatted: string }
  | { error: string }

function safeParseDateInput(value: string, inputFormat: 'iso' | 'us' | 'uk' | 'datetime-local'): ParseResult {
  if (!value.trim()) return { error: 'Date is required' }

  const ref = new Date()
  let parsed: Date

  switch (inputFormat) {
    case 'iso':            parsed = parseISO(value); break
    case 'us':             parsed = parse(value, 'MM/dd/yyyy',          ref); break
    case 'uk':             parsed = parse(value, 'dd/MM/yyyy',          ref); break
    case 'datetime-local': parsed = parse(value, "yyyy-MM-dd'T'HH:mm", ref); break
  }

  if (!isValid(parsed)) return { error: `Invalid date for format ${inputFormat}` }

  return {
    date:      parsed,
    formatted: format(parsed, 'EEEE, MMMM d, yyyy HH:mm')
  }
}

// Tests
console.log(safeParseDateInput('2025-06-15',       'iso'))            // Sunday, June 15, 2025 00:00
console.log(safeParseDateInput('06/15/2025',       'us'))             // Sunday, June 15, 2025 00:00
console.log(safeParseDateInput('15/06/2025',       'uk'))             // Sunday, June 15, 2025 00:00
console.log(safeParseDateInput('2025-06-15T14:30', 'datetime-local')) // Sunday, June 15, 2025 14:30
console.log(safeParseDateInput('not-a-date',       'iso'))            // { error: 'Invalid date...' }
console.log(safeParseDateInput('',                 'iso'))            // { error: 'Date is required' }
```

---

---

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

# 6 — Intervals and Duration

---

## T — TL;DR

An **interval** is `{ start: Date, end: Date }`. `intervalToDuration` converts it to a human-readable `Duration` object (`{ years, months, days, hours, minutes, seconds }`). `eachDayOfInterval` generates every `Date` in a range. Use these for booking calendars, time tracking, and billing period displays.

---

## K — Key Concepts

```ts
import {
  intervalToDuration,
  formatDuration,
  eachDayOfInterval,
  eachMonthOfInterval,
  areIntervalsOverlapping,
  isWithinInterval,
  differenceInCalendarDays
} from 'date-fns'

const start = new Date(2025, 5, 1)   // June 1
const end   = new Date(2025, 7, 22)  // August 22
const interval = { start, end }

// ─── intervalToDuration — breaks interval into human units
const duration = intervalToDuration(interval)
// { years: 0, months: 2, days: 21, hours: 0, minutes: 0, seconds: 0 }

duration.months  // 2
duration.days    // 21

// ─── formatDuration — readable string from Duration object
formatDuration(duration)
// '2 months 21 days'

formatDuration(duration, { format: ['months', 'days'] })
// '2 months 21 days'  (same — specifies which units to include)

formatDuration({ hours: 2, minutes: 30 }, { format: ['hours', 'minutes'] })
// '2 hours 30 minutes'

formatDuration({ hours: 1, minutes: 0 }, { format: ['hours', 'minutes'], zero: false })
// '1 hour'  (zero: false skips 0-value units)
```

```ts
// ─── eachDayOfInterval — array of every Date in range
const days = eachDayOfInterval({ start, end })
// [June 1, June 2, ..., August 22]  — 83 dates total
days.length  // 83

// Practical: calendar date cells for a date range picker
const rentalDays   = eachDayOfInterval({ start: checkIn, end: checkOut })
const blockedDates = new Set(rentalDays.map(d => format(d, 'yyyy-MM-dd')))
// Check if a calendar cell is blocked:
const isBlocked = (date: Date) => blockedDates.has(format(date, 'yyyy-MM-dd'))

// ─── eachMonthOfInterval
const months = eachMonthOfInterval({ start, end })
// [June 1, July 1, August 1]  — first day of each month in range

// ─── isWithinInterval — check if a date falls inside a range
isWithinInterval(new Date(2025, 6, 4), interval)   // true  (July 4)
isWithinInterval(new Date(2025, 9, 1), interval)   // false (Oct 1 — outside)

// ─── areIntervalsOverlapping — check for booking conflicts
const booking1 = { start: new Date(2025, 5, 10), end: new Date(2025, 5, 15) }
const booking2 = { start: new Date(2025, 5, 14), end: new Date(2025, 5, 20) }
areIntervalsOverlapping(booking1, booking2)  // true — Jun 14-15 overlap
```

---

## W — Why It Matters

- `intervalToDuration` + `formatDuration` is the correct way to display "how long" something takes in human units — "2 months 21 days" rather than "82 days" for a project timeline display.
- `eachDayOfInterval` for a date range picker generates every date to block/highlight on a calendar — without manual date arithmetic or loops.
- `areIntervalsOverlapping` is essential for booking systems — checking if a new reservation conflicts with existing ones without writing loop logic manually.

---

## I — Interview Q&A

### Q: How do you display the duration between two dates in human-readable form (years, months, days)?

**A:** Use `intervalToDuration({ start, end })` to get a `Duration` object with `{ years, months, days, hours, minutes, seconds }`. Then use `formatDuration(duration, { format: ['years', 'months', 'days'], zero: false })` to produce a string like "1 year 3 months 5 days", skipping zero-value units. This is more accurate than dividing milliseconds because it accounts for variable month lengths and leap years — `differenceInDays` would give 400 days while `intervalToDuration` correctly gives "1 year 35 days".

---

## C — Common Pitfalls + Fix

### ❌ Passing interval with end before start to `eachDayOfInterval`

```ts
// ❌ Throws RangeError if start > end
const days = eachDayOfInterval({
  start: new Date(2025, 6, 10),
  end:   new Date(2025, 5, 1)   // end before start
})
// RangeError: Invalid interval — end is before start
```

**Fix:** Guard the order, or use `min`/`max`:

```ts
import { min, max } from 'date-fns'

function safeDayInterval(a: Date, b: Date) {
  return eachDayOfInterval({ start: min([a, b]), end: max([a, b]) })
}
```

---

## K — Coding Challenge + Solution

### Challenge

Build a `BookingConflictChecker` that: takes existing bookings `{ start, end }[]` and a proposed `{ start, end }`, returns `{ hasConflict: boolean, conflictingBookings: ..[], duration: string }`. Use `areIntervalsOverlapping`, `intervalToDuration`, `formatDuration`.

### Solution

```ts
import { areIntervalsOverlapping, intervalToDuration, formatDuration, format } from 'date-fns'

interface Booking { start: Date; end: Date; id?: string }

interface ConflictResult {
  hasConflict:         boolean
  conflictingBookings: Booking[]
  proposedDuration:    string
  nightCount:          number
}

function checkBookingConflicts(existing: Booking[], proposed: Booking): ConflictResult {
  const conflicting = existing.filter(b =>
    areIntervalsOverlapping(b, proposed, { inclusive: false })
  )

  const duration    = intervalToDuration(proposed)
  const nightCount  = differenceInCalendarDays(proposed.end, proposed.start)

  return {
    hasConflict:         conflicting.length > 0,
    conflictingBookings: conflicting,
    proposedDuration:    formatDuration(duration, {
                           format: ['years','months','days'],
                           zero:   false
                         }) || '0 days',
    nightCount
  }
}

import { differenceInCalendarDays } from 'date-fns'

const existingBookings: Booking[] = [
  { id: 'A', start: new Date(2025, 5, 1),  end: new Date(2025, 5, 7)  },
  { id: 'B', start: new Date(2025, 5, 14), end: new Date(2025, 5, 20) }
]

// No conflict
const r1 = checkBookingConflicts(existingBookings, {
  start: new Date(2025, 5, 8), end: new Date(2025, 5, 12)
})
console.log(r1.hasConflict)        // false
console.log(r1.proposedDuration)   // '4 days'
console.log(r1.nightCount)         // 4

// Conflict with booking B
const r2 = checkBookingConflicts(existingBookings, {
  start: new Date(2025, 5, 16), end: new Date(2025, 5, 22)
})
console.log(r2.hasConflict)                  // true
console.log(r2.conflictingBookings[0].id)   // 'B'
console.log(r2.proposedDuration)            // '6 days'
```

---

---

# 7 — `formatDistance` and `formatRelative`

---

## T — TL;DR

`formatDistance(date, baseDate)` returns a human-readable relative string — "3 days ago", "in 2 months". `formatRelative(date, baseDate)` returns a contextual string — "yesterday at 2:30 PM", "next Tuesday". Use these for timestamps, activity feeds, and "due" indicators.

---

## K — Key Concepts

```ts
import { formatDistance, formatDistanceToNow, formatRelative } from 'date-fns'

const now  = new Date(2025, 5, 15, 14, 0)  // June 15, 2025 14:00
const past = new Date(2025, 5, 12, 10, 0)  // June 12, 2025 10:00
const future = new Date(2025, 5, 18, 9, 0) // June 18, 2025 09:00

// ─── formatDistance — relative between two dates
formatDistance(past,   now)   // 'about 3 days'
formatDistance(future, now)   // 'about 3 days'  (no direction by default)

formatDistance(past,   now,   { addSuffix: true }) // '3 days ago'
formatDistance(future, now,   { addSuffix: true }) // 'in about 3 days'

// ─── formatDistanceToNow — relative to right now (no second arg needed)
formatDistanceToNow(past,   { addSuffix: true }) // '3 days ago'
formatDistanceToNow(future, { addSuffix: true }) // 'in 3 days'

// ─── Granularity examples
const justNow    = new Date(Date.now() - 30_000)   // 30 seconds ago
const minutesAgo = new Date(Date.now() - 3_600_000) // 1 hour ago
const monthsAgo  = new Date(2025, 2, 15)            // ~3 months ago

formatDistanceToNow(justNow,    { addSuffix: true }) // 'less than a minute ago'
formatDistanceToNow(minutesAgo, { addSuffix: true }) // 'about 1 hour ago'
formatDistanceToNow(monthsAgo,  { addSuffix: true }) // '3 months ago'
```

```ts
// ─── formatRelative — contextual relative (yesterday / today / next X)
const yesterday = subDays(new Date(), 1)
const tomorrow  = addDays(new Date(), 1)
const nextWeek  = addDays(new Date(), 6)

formatRelative(yesterday, new Date())  // 'yesterday at 2:00 PM'
formatRelative(new Date(), new Date()) // 'today at 2:00 PM'
formatRelative(tomorrow,  new Date())  // 'tomorrow at 2:00 PM'
formatRelative(nextWeek,  new Date())  // 'next Tuesday at 2:00 PM'
// Beyond 6 days: falls back to full date — '06/25/2025'

// ─── With locale
import { enUS } from 'date-fns/locale'
formatDistanceToNow(past, { addSuffix: true, locale: enUS })
```

```tsx
// ─── Practical: activity feed timestamp
function ActivityTimestamp({ date }: { date: Date }) {
  const now = new Date()
  // Within 24h: show relative ('2 hours ago')
  // Older:      show formatted date ('Jun 10, 2025')
  const isRecent = Math.abs(differenceInHours(date, now)) < 24

  return (
    <time dateTime={formatISO(date)}
          title={format(date, 'MMMM d, yyyy HH:mm')}
          className="text-xs text-gray-400">
      {isRecent
        ? formatDistanceToNow(date, { addSuffix: true })
        : format(date, 'MMM d, yyyy')}
    </time>
  )
}
```

---

## W — Why It Matters

- `formatDistanceToNow` with `addSuffix: true` is the standard pattern for notification timestamps and comment dates — "2 minutes ago" is more useful than "June 15, 2025 at 14:03" for recent activity.
- The `<time dateTime={formatISO(date)}>` pattern combines machine-readable ISO (for SEO and screen readers) with human-readable display — accessibility best practice.
- `formatRelative` for scheduled items ("next Tuesday at 9:00 AM") gives users better mental context than "June 17, 2025" for near-future dates.

---

## I — Interview Q&A

### Q: When do you choose `formatDistance` over `formatRelative`?

**A:** Use `formatDistance` (or `formatDistanceToNow`) for timestamps in feeds, notifications, and comment sections — "3 days ago", "in 2 hours". It emphasises elapsed time. Use `formatRelative` for scheduled events, reminders, and due dates where the day context matters — "yesterday at 2 PM", "next Monday at 9 AM". `formatRelative` is only meaningful for dates within about 6 days of the base; beyond that it falls back to a locale date string. `formatDistance` works for any date range regardless of distance.

---

## C — Common Pitfalls + Fix

### ❌ Using `formatDistanceToNow` in server-side rendering without a stable base date

```tsx
// ❌ SSR: formatDistanceToNow uses Date.now() — different on server vs client
// Causes React hydration mismatch warning
<p>{formatDistanceToNow(date, { addSuffix: true })}</p>
```

**Fix:** Render relative times client-side only, or pass a stable base date:

```tsx
// ✅ Option A: client-only
'use client'
<p>{formatDistanceToNow(date, { addSuffix: true })}</p>

// ✅ Option B: suppressHydrationWarning for this element
<p suppressHydrationWarning>
  {formatDistanceToNow(date, { addSuffix: true })}
</p>

// ✅ Option C: use a fixed base date for SSR
<p>{formatDistance(date, serverTimestamp, { addSuffix: true })}</p>
```

---

## K — Coding Challenge + Solution

### Challenge

Build a `<SmartDate>` component that: shows relative time if within 7 days, otherwise shows formatted date. Has a `<time>` element with ISO `dateTime` attribute. Shows full date on hover via `title`. Updates every minute for near-past dates.

### Solution

```tsx
'use client'
import { useEffect, useState }                          from 'react'
import { formatDistanceToNow, format, formatISO,
         differenceInDays, isWithinInterval, subDays,
         addDays }                                       from 'date-fns'

interface SmartDateProps { date: Date; className?: string }

export function SmartDate({ date, className }: SmartDateProps) {
  const [, setTick] = useState(0)

  // Re-render every minute for fresh relative times
  useEffect(() => {
    const id = setInterval(() => setTick(t => t + 1), 60_000)
    return () => clearInterval(id)
  }, [])

  const now = new Date()
  const withinWindow = isWithinInterval(date, {
    start: subDays(now, 7),
    end:   addDays(now, 7)
  })

  const display = withinWindow
    ? formatDistanceToNow(date, { addSuffix: true })
    : format(date, 'MMM d, yyyy')

  const fullDate = format(date, 'EEEE, MMMM d, yyyy HH:mm')

  return (
    <time dateTime={formatISO(date)} title={fullDate}
          className={`cursor-default ${className ?? 'text-xs text-gray-400'}`}>
      {display}
    </time>
  )
}

// Usage:
// <SmartDate date={new Date(Date.now() - 3_600_000)} />
// → 'about 1 hour ago'
//
// <SmartDate date={new Date(2024, 0, 15)} />
// → 'Jan 15, 2024'
```

---

---

# 8 — Display vs Storage — Normalization in Form Workflows

---

## T — TL;DR

Dates flow through three layers: **user input** (string from HTML), **application logic** (`Date` object), **storage** (ISO string). Normalise at each boundary — parse on input, work with `Date` internally, serialise to ISO on storage. Never store display-formatted strings; never display ISO strings raw.

---

## K — Key Concepts

```
DATE FLOW IN A FORM WORKFLOW:

  HTML input           → string    '2025-06-15'         (yyyy-MM-dd)
       ↓ parseISO / z.coerce.date
  RHF + Zod            → Date      new Date(2025,5,15)
       ↓ business logic (addDays, isBefore, etc.)
  handleSubmit data    → Date      validated + transformed Date
       ↓ formatISO
  API payload / DB     → string    '2025-06-15T00:00:00+08:00'  (ISO 8601)
       ↓ parseISO
  Received from API    → Date      hydrated back to Date
       ↓ format
  Display to user      → string    'June 15, 2025'       (locale string)
```

```ts
// ─── Layer 1: HTML input → Date (parse boundary)
// <input type="date"> always gives 'yyyy-MM-dd'
// Use z.coerce.date() or parseISO in a Zod transform

const DateFieldSchema = z.string()
  .min(1, 'Date is required')
  .transform(v => parseISO(v))
  .refine(d => isValid(d), 'Invalid date')
// OR simpler:
const DateFieldSchema = z.coerce.date()
```

```ts
// ─── Layer 2: submitted Date → ISO string (storage boundary)
async function onSubmit(data: BookingForm) {
  const payload = {
    ...data,
    // Convert Date → ISO string for JSON API
    checkIn:  formatISO(data.checkIn,  { representation: 'date' }),
    checkOut: formatISO(data.checkOut, { representation: 'date' }),
    // Preserve full datetime with offset for exact moments
    createdAt: formatISO(new Date())
  }
  await api.post('/bookings', payload)
}
```

```ts
// ─── Layer 3: API response → Date → display (hydration boundary)
interface ApiBooking {
  checkIn:  string  // '2025-06-15'
  checkOut: string  // '2025-06-22'
  createdAt: string // '2025-06-01T09:00:00+08:00'
}

function hydrate(api: ApiBooking) {
  return {
    checkIn:   parseISO(api.checkIn),    // Date
    checkOut:  parseISO(api.checkOut),   // Date
    createdAt: parseISO(api.createdAt)   // Date
  }
}

function display(booking: ReturnType<typeof hydrate>) {
  return {
    checkIn:   format(booking.checkIn,   'MMMM d, yyyy'),
    checkOut:  format(booking.checkOut,  'MMMM d, yyyy'),
    createdAt: formatDistanceToNow(booking.createdAt, { addSuffix: true })
  }
}
```

```ts
// ─── Populating an edit form from existing data (roundtrip)
// Data from API: { checkIn: '2025-06-15', checkOut: '2025-06-22' }
// Form expects: defaultValues with yyyy-MM-dd strings for <input type="date">

function apiToFormDefaults(apiData: ApiBooking) {
  return {
    // <input type="date"> needs yyyy-MM-dd — parseISO → format cycle
    checkIn:  apiData.checkIn,   // already yyyy-MM-dd ✅
    checkOut: apiData.checkOut,  // already yyyy-MM-dd ✅
    // If the API returns datetime: '2025-06-15T14:30:00Z'
    //   format(parseISO(api.startTime), 'yyyy-MM-dd') for date input
    //   format(parseISO(api.startTime), 'HH:mm')       for time input
  }
}
```

---

## W — Why It Matters

- Storing `'June 15, 2025'` in a database instead of `'2025-06-15'` breaks sorting, filtering, and any code that later tries to compare dates — display strings are not sortable.
- `formatISO` with timezone offset (`+08:00`) is critical for scheduling — storing `'2025-06-15'` for a 9 AM meeting means different absolute times for users in different timezones. Store the offset to preserve intent.
- The edit form roundtrip (API ISO → parseISO → Date → format('yyyy-MM-dd') → input value) is the most frequently broken pattern — developers skip one step and the input shows blank or `Invalid Date`.

---

## I — Interview Q&A

### Q: How do you populate an edit form's date input from an API response that returns ISO datetime strings?

**A:** Three steps. Parse the ISO string to a `Date` with `parseISO(apiString)`. Then format it to the HTML input's required format with `format(date, 'yyyy-MM-dd')` for `<input type="date">`, or `format(date, "yyyy-MM-dd'T'HH:mm")` for `<input type="datetime-local">`. Pass the result as the `defaultValues` for that field. Never pass the raw ISO string directly to the input — `datetime-local` inputs reject strings with timezone offsets and seconds, so the field appears blank.

---

## C — Common Pitfalls + Fix

### ❌ Passing a raw ISO datetime string as `defaultValues` for a date input

```tsx
// ❌ '2025-06-15T09:00:00+08:00' → input shows blank
useForm({ defaultValues: { startDate: '2025-06-15T09:00:00+08:00' } })
<input type="date" {...register('startDate')} />
// The browser rejects the full ISO datetime for a date input — shows empty ❌
```

**Fix:** Format to `yyyy-MM-dd` when setting defaultValues:

```tsx
// ✅ Parse then reformat for the input type
import { parseISO, format } from 'date-fns'

const apiDate = '2025-06-15T09:00:00+08:00'
useForm({
  defaultValues: {
    startDate: format(parseISO(apiDate), 'yyyy-MM-dd')  // '2025-06-15' ✅
  }
})
```

---

## K — Coding Challenge + Solution

### Challenge

Build a complete date-aware edit booking form: load data from a mock API (`checkIn`, `checkOut` as ISO strings), populate the form, validate with Zod (checkOut after checkIn, both in future), on submit convert back to ISO strings for the API payload. Use the full display-vs-storage pattern.

### Solution

```tsx
'use client'
import { useEffect }              from 'react'
import { useForm }                from 'react-hook-form'
import { zodResolver }            from '@hookform/resolvers/zod'
import { z }                      from 'zod'
import { parseISO, format, formatISO,
         isAfter, isFuture, isValid,
         differenceInDays }       from 'date-fns'

// ─── Schema: dates coerced from yyyy-MM-dd strings
const BookingSchema = z.object({
  guestName: z.string().min(2, 'Required'),
  checkIn:   z.coerce.date({ required_error: 'Check-in required' }),
  checkOut:  z.coerce.date({ required_error: 'Check-out required' })
})
.refine(d => isFuture(d.checkIn), {
  message: 'Check-in must be in the future', path: ['checkIn']
})
.refine(d => isAfter(d.checkOut, d.checkIn), {
  message: 'Check-out must be after check-in', path: ['checkOut']
})

type BookingForm = z.infer<typeof BookingSchema>

// ─── Mock API data (ISO strings from server)
const MOCK_API = {
  guestName: 'Mark Austin',
  checkIn:   '2026-07-10T00:00:00+08:00',
  checkOut:  '2026-07-15T00:00:00+08:00'
}

// ─── Transform: API → form defaults (ISO datetime → yyyy-MM-dd for input)
function apiToDefaults(api: typeof MOCK_API) {
  return {
    guestName: api.guestName,
    checkIn:   format(parseISO(api.checkIn),  'yyyy-MM-dd'),
    checkOut:  format(parseISO(api.checkOut), 'yyyy-MM-dd')
  }
}

// ─── Transform: form data → API payload (Date → ISO string)
function dataToPayload(data: BookingForm) {
  return {
    guestName: data.guestName,
    checkIn:   formatISO(data.checkIn,  { representation: 'date' }),
    checkOut:  formatISO(data.checkOut, { representation: 'date' }),
    updatedAt: formatISO(new Date())
  }
}

export function EditBookingForm() {
  const { register, handleSubmit, reset, watch,
          formState: { errors, isDirty, isSubmitting } } = useForm<BookingForm>({
    resolver:      zodResolver(BookingSchema),
    defaultValues: { guestName: '', checkIn: undefined, checkOut: undefined }
  })

  // Simulate loading from API
  useEffect(() => {
    const defaults = apiToDefaults(MOCK_API)
    reset(defaults)
  }, [reset])

  // Live night count display
  const checkIn  = watch('checkIn')
  const checkOut = watch('checkOut')
  const nights   = (checkIn && checkOut && isValid(checkIn) && isValid(checkOut) && isAfter(checkOut, checkIn))
    ? differenceInDays(checkOut, checkIn)
    : null

  async function onSubmit(data: BookingForm) {
    const payload = dataToPayload(data)
    await new Promise(r => setTimeout(r, 800))  // mock API call
    console.log('Saved payload:', payload)
    // payload.checkIn  → '2026-07-10'  (ISO date string for DB)
    // payload.checkOut → '2026-07-15'
    // payload.updatedAt → '2026-06-15T...' (full ISO with offset)
    reset(apiToDefaults({
      guestName: data.guestName,
      checkIn:   payload.checkIn  + 'T00:00:00+08:00',
      checkOut:  payload.checkOut + 'T00:00:00+08:00'
    }))
  }

  const cls = 'w-full border rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500'
  const err = 'text-xs text-red-600 mt-1'

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 max-w-sm">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1.5">Guest name</label>
        <input {...register('guestName')} className={cls} />
        {errors.guestName && <p className={err}>{errors.guestName.message}</p>}
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">Check-in</label>
          <input {...register('checkIn')} type="date" className={cls} />
          {errors.checkIn  && <p className={err}>{errors.checkIn.message}</p>}
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">Check-out</label>
          <input {...register('checkOut')} type="date" className={cls} />
          {errors.checkOut && <p className={err}>{errors.checkOut.message}</p>}
        </div>
      </div>

      {nights !== null && (
        <p className="text-sm text-blue-600 font-medium">
          {nights} night{nights !== 1 ? 's' : ''}
        </p>
      )}

      <div className="flex gap-3">
        <button type="button" onClick={() => reset(apiToDefaults(MOCK_API))} disabled={!isDirty}
                className="flex-1 py-2.5 border rounded-xl text-sm font-semibold disabled:opacity-40">
          Discard
        </button>
        <button type="submit" disabled={!isDirty || isSubmitting}
                className="flex-1 py-2.5 bg-blue-600 text-white rounded-xl text-sm
                            font-semibold disabled:opacity-40">
          {isSubmitting ? 'Saving…' : 'Save booking'}
        </button>
      </div>
    </form>
  )
}
```

---

## ✅ Day 7 Complete — date-fns for Form Workflows

| # | Subtopic | Status |
|---|----------|--------|
| 1 | Fundamentals — Pure Functions and Immutability | ☐ |
| 2 | `format` and `formatISO` | ☐ |
| 3 | `parse` and `parseISO` | ☐ |
| 4 | Add/Subtract Helpers | ☐ |
| 5 | Date Comparisons | ☐ |
| 6 | Intervals and Duration | ☐ |
| 7 | `formatDistance` and `formatRelative` | ☐ |
| 8 | Display vs Storage — Normalization | ☐ |

---

## 🗺️ One-Page Mental Model — Day 7

```
CORE PRINCIPLE
  date-fns = pure functions, immutable, tree-shaken, typed
  Always: import { fn } from 'date-fns'  — never default import

FORMAT (Date → string)
  format(d, 'yyyy-MM-dd')           → '2025-06-15'
  format(d, 'MMMM d, yyyy')         → 'June 15, 2025'
  format(d, 'HH:mm')                → '14:30'
  format(d, "yyyy-MM-dd'T'HH:mm")   → '2025-06-15T14:30'  (datetime-local)
  formatISO(d)                       → '2025-06-15T14:30:00+08:00'
  formatISO(d, { representation: 'date' }) → '2025-06-15'
  Tokens: yyyy MM dd HH mm ss MMMM MMM EEEE EEE h a  (lowercase dd for day!)

PARSE (string → Date)
  parseISO('2025-06-15')              → Date (local midnight)
  parse('15/06/2025', 'dd/MM/yyyy', new Date()) → Date
  ALWAYS: isValid(result) after parsing
  new Date('2025-06-15')    ← avoid (UTC midnight bug)

ADD/SUBTRACT
  addDays(d, 7)   subDays(d, 7)
  addMonths(d, 1) → handles month-end clipping (Jan31+1mo = Feb28)
  add(d, { years: 1, months: 2, days: 3 })  → multi-unit
  min([d1,d2])  max([d1,d2])

COMPARISONS
  isBefore(a, b)    isAfter(a, b)    isEqual(a, b)
  isFuture(d)       isPast(d)        isToday(d)
  isValid(d)        ← always check after parse
  differenceInDays(end, start)       → number (truncated)
  compareAsc / compareDesc           → for array.sort()

INTERVALS
  intervalToDuration({ start, end })  → { years, months, days, hours... }
  formatDuration(duration, { format: ['months','days'], zero: false })
  eachDayOfInterval({ start, end })   → Date[]  (all days in range)
  isWithinInterval(date, interval)    → boolean
  areIntervalsOverlapping(a, b)       → boolean  (booking conflicts)

RELATIVE
  formatDistanceToNow(d, { addSuffix: true })  → '3 days ago' / 'in 2 hours'
  formatDistance(d, base, { addSuffix: true })
  formatRelative(d, base)                      → 'yesterday at 2 PM'
  Use 'use client' — avoids SSR hydration mismatch

DISPLAY vs STORAGE PATTERN
  HTML input       → string   'yyyy-MM-dd'
       ↓ parseISO / z.coerce.date()
  App logic        → Date
       ↓ isBefore, addDays, isValid, etc.
  handleSubmit     → Date (validated)
       ↓ formatISO(d) or formatISO(d, { representation: 'date' })
  API/DB           → ISO string '2025-06-15T00:00:00+08:00'
       ↓ parseISO
  Edit form default → format(parseISO(api.date), 'yyyy-MM-dd')

COMMON BUGS
  format(d, 'DD') → Day of year, not day of month (use dd)
  format(d, 'YYYY') → Week year, not calendar year (use yyyy)
  new Date('2025-06-15') → UTC midnight bug (use parseISO)
  Raw ISO datetime as input defaultValue → blank field (format first)
  eachDayOfInterval end < start → RangeError (guard order)
  compareDate === → always false on Date objects (use isEqual)
  formatDistanceToNow in SSR → hydration mismatch (use 'use client')
```

> **Your next action:** Find any `new Date(someString)` in your codebase. Replace it with `parseISO(someString)` and add an `isValid()` check. That's all — one safe swap.
>
> *Doing one small thing beats opening a feed.*