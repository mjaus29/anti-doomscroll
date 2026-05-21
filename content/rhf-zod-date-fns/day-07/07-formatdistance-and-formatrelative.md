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
