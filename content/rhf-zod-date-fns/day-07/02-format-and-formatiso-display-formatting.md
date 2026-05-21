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
