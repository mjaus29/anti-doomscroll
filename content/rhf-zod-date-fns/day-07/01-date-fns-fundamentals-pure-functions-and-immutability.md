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

// ─── Every function accepts Date | number (timestamp) | string (v4 — parsed with new Date(str))
const ts  = Date.now()                    // number
format(ts, 'yyyy-MM-dd')                  // works ✅
format(new Date(), 'yyyy-MM-dd')          // works ✅

// ─── Imports: named imports from the package root are the standard style
// import { addDays } from 'date-fns'       ← use this (works in v2, v3 and v4, tree-shaken)
// import { addDays } from 'date-fns/addDays' still works in v4 (subpath exports), but is rarely needed
// v4 headline feature: first-class time zones — pass an `in` option (from the @date-fns/tz package),
//   e.g. format(date, 'HH:mm', { in: tz('Asia/Manila') })
```

```ts
// ─── Core mental model
// Input:  Date | number (timestamp) | string (v4 accepts ISO-like strings; prefer parseISO/parse for user input)
// Output: Date (new object) | string | number | boolean | object

// Every call is stateless — no global config, no side effects
// Exception: locale — passed explicitly per call, not set globally

import { format }    from 'date-fns'
import { enUS, es } from 'date-fns/locale'

const d = new Date(2025, 0, 15)
format(d, 'MMMM d, yyyy', { locale: enUS })  // 'January 15, 2025'
format(d, 'MMMM d, yyyy', { locale: es   })  // 'enero 15, 2025'
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
- Named imports from the package root (`import { format } from 'date-fns'`) are the one import style to use — older posts show `date-fns/esm/format` or `date-fns/format` subpaths, which you can ignore. v4 also adds first-class time-zone support via the `in` option and the `@date-fns/tz` package.

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
