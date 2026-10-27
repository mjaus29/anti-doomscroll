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
// { months: 2, days: 21 }   — zero-value units are omitted in date-fns v4

duration.months  // 2
duration.days    // 21
duration.years   // undefined (not 0) — default with `?? 0` if you do arithmetic

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

**A:** Use `intervalToDuration({ start, end })` to get a `Duration` object with the non-zero units among `{ years, months, days, hours, minutes, seconds }`. Then use `formatDuration(duration, { format: ['years', 'months', 'days'], zero: false })` to produce a string like "1 year 3 months 5 days", skipping zero-value units. This is more accurate than dividing milliseconds because it accounts for variable month lengths and leap years — `differenceInDays` would give 400 days while `intervalToDuration` correctly gives "1 year 1 month 4 days" (for Jan 1 2025 → Feb 5 2026).

---

## C — Common Pitfalls + Fix

### ❌ Passing interval with end before start to `eachDayOfInterval`

```ts
// ❌ Doesn't throw (date-fns v3/v4) — it silently returns the days in REVERSE order
const days = eachDayOfInterval({
  start: new Date(2025, 6, 10),
  end:   new Date(2025, 5, 1)   // end before start
})
// [Jul 10, Jul 9, ..., Jun 1]  — descending; an old v2 build threw RangeError instead
```

**Fix:** Guard the order, or use `min`/`max` so the result is always ascending:

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
