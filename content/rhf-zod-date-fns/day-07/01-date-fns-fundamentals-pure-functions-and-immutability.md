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
