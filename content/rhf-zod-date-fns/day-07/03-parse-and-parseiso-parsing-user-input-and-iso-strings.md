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
