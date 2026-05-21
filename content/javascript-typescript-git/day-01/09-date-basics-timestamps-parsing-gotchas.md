# 9 — Date Basics — Timestamps, Parsing Gotchas

---

## T — TL;DR

`Date` stores time as a Unix timestamp in milliseconds since 1970-01-01 UTC. `Date.now()` is the fastest way to get the current timestamp. Date parsing from strings is notoriously inconsistent — always use `new Date(year, month, day)` (note: month is 0-indexed) or ISO 8601 strings (`'2025-06-15'`). For production, prefer `date-fns` or `Temporal` (Stage 3).

---

## K — Key Concepts

```javascript
// ── Creating dates ────────────────────────────────────────────────────────
const now = new Date()          // current date and time
const ts  = Date.now()          // current timestamp (milliseconds) — faster, no object

// From timestamp
new Date(0)                     // 1970-01-01T00:00:00.000Z (Unix epoch)
new Date(1718438400000)         // specific timestamp

// From ISO 8601 string (safe, always UTC)
new Date('2025-06-15')          // 2025-06-15T00:00:00.000Z ✅
new Date('2025-06-15T14:30:00Z')  // UTC datetime ✅
new Date('2025-06-15T14:30:00+08:00')  // with offset ✅

// From year, month, day (local time — month is 0-indexed!)
new Date(2025, 5, 15)           // June 15, 2025 (5 = June) ← confusing
new Date(2025, 0, 1)            // January 1, 2025
```

```javascript
// ── Date parsing gotchas ──────────────────────────────────────────────────
// ❌ Non-ISO strings are implementation-defined — don't rely on them
new Date('June 15, 2025')       // works in most browsers but not guaranteed
new Date('15/06/2025')          // Invalid Date in some environments
new Date('2025-6-15')           // may work or may fail — non-standard format

// ❌ Date-only strings are treated as UTC in modern JS
new Date('2025-06-15')          // midnight UTC, NOT local midnight
// In UTC-8: this displays as 2025-06-14T16:00:00.000 (previous day!)

// ✅ Explicit constructor — local time, no ambiguity
new Date(2025, 5, 15)           // June 15, 2025 local time

// ✅ ISO with time — always explicit timezone
new Date('2025-06-15T00:00:00.000Z')  // midnight UTC
new Date('2025-06-15T00:00:00+08:00') // midnight in UTC+8

// Check for invalid date
const d = new Date('not a date')
isNaN(d.getTime())    // true — d.getTime() returns NaN for invalid dates
Number.isNaN(d.getTime())  // true
```

```javascript
// ── Timestamp comparison ──────────────────────────────────────────────────
const a = new Date('2025-01-01')
const b = new Date('2025-12-31')

// Compare using getTime() — returns milliseconds
a.getTime() < b.getTime()   // true ✅
a < b                       // true ✅ (Date coerces to number in comparison)
a === b                     // false ❌ (different object references)
a.getTime() === b.getTime() // true only if same point in time ✅

// Time difference
const diffMs   = b.getTime() - a.getTime()
const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))  // 364 days
```

```javascript
// ── Getting/setting date components ──────────────────────────────────────
const d = new Date()

// Getters (local time)
d.getFullYear()    // 2025
d.getMonth()       // 0–11 (0 = January!)
d.getDate()        // 1–31 (day of month)
d.getDay()         // 0–6 (0 = Sunday)
d.getHours()       // 0–23
d.getMinutes()     // 0–59
d.getSeconds()     // 0–59
d.getMilliseconds()
d.getTime()        // Unix timestamp in ms

// UTC getters
d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()  // etc.

// Formatting
d.toISOString()        // '2025-06-15T14:30:00.000Z' — always UTC ISO 8601
d.toLocaleDateString() // '6/15/2025' (locale-dependent)
d.toLocaleString('en-PH', { timeZone: 'Asia/Manila' })  // localised

// Robust formatting without a library
const iso = new Date().toISOString().slice(0, 10)  // '2025-06-15'
```

---

## W — Why It Matters

- Month 0-indexing is the most common `Date` API mistake — `new Date(2025, 6, 15)` is July 15, not June 15. Always double-check by using ISO strings or adding a comment.
- `new Date('2025-06-15')` being midnight UTC (not local) causes a "date off by one day" bug in UTC-negative timezones — displaying this date locally shows June 14 in New York (UTC-4 in summer). Use `new Date(2025, 5, 15)` for local date-only values.
- For any non-trivial date work (formatting, arithmetic, timezones), use `date-fns` — the built-in `Date` API is inconsistent and lacks locale-aware formatting. `date-fns` is immutable, tree-shakeable, and correct.

---

## I — Interview Q&A

### Q: How do you correctly compare two dates in JavaScript?

**A:** Use `getTime()` to compare the underlying millisecond timestamps: `a.getTime() === b.getTime()` for equality, `a.getTime() < b.getTime()` for ordering. JavaScript's `<` and `>` operators also work on Date objects because dates coerce to their timestamp value in numeric comparisons. However, `===` always returns `false` for two `Date` objects with the same time because it compares object references, not values. For date-only comparison (ignoring time), compare the ISO date strings: `a.toISOString().slice(0, 10) === b.toISOString().slice(0, 10)`.

---

## C — Common Pitfalls + Fix

### ❌ Month is 0-indexed — off-by-one month

```javascript
// ❌ This creates August 15, not July 15
const july = new Date(2025, 7, 15)   // 7 = August!

// ✅ Use ISO string — no indexing confusion
const july2 = new Date('2025-07-15')

// ✅ Or subtract 1 explicitly with a comment
const month = 7  // July (but JS months are 0-indexed)
const date = new Date(2025, month - 1, 15)  // ← explicit
```

---

## K — Coding Challenge + Solution

### Challenge

Write a `daysBetween(dateA, dateB)` function that returns the number of full days between two dates, regardless of order. Handle string input (`'2025-06-15'`) and `Date` objects. Return 0 if dates are the same day.

### Solution

```javascript
function daysBetween(a, b) {
  // Normalise: accept string or Date, snap to midnight UTC
  const toMidnightUTC = (d) => {
    const date = typeof d === 'string' ? new Date(d) : new Date(d.getTime())
    date.setUTCHours(0, 0, 0, 0)
    return date
  }
  const da = toMidnightUTC(a)
  const db = toMidnightUTC(b)
  const diffMs = Math.abs(da.getTime() - db.getTime())
  return Math.floor(diffMs / (1000 * 60 * 60 * 24))
}

console.log(daysBetween('2025-01-01', '2025-06-15'))  // 165
console.log(daysBetween('2025-06-15', '2025-01-01'))  // 165 (order doesn't matter)
console.log(daysBetween('2025-06-15', '2025-06-15'))  // 0
```

---

---
