# 5 — System Time Control — vi.setSystemTime

---

## T — TL;DR

`vi.setSystemTime(date)` freezes `Date.now()`, `new Date()`, and `performance.now()` at a specific point in time. This makes any code that depends on the current date deterministic — expiry checks, age calculations, "created today" logic, and cron-style scheduling. Always restore with `vi.useRealTimers()`.

---

## K — Key Concepts

```typescript
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

// ── Freeze time ────────────────────────────────────────────────────────────
beforeEach(() => {
  vi.useFakeTimers()
  vi.setSystemTime(new Date('2025-06-15T12:00:00.000Z'))
})
afterEach(() => {
  vi.useRealTimers()
})
```

```typescript
// ── Functions under test ───────────────────────────────────────────────────
export function isExpired(expiresAt: Date): boolean {
  return new Date() > expiresAt
}

export function daysUntilExpiry(expiresAt: Date): number {
  const now  = Date.now()
  const diff = expiresAt.getTime() - now
  return Math.ceil(diff / (1000 * 60 * 60 * 24))
}

export function getGreeting(): string {
  const hour = new Date().getHours()
  if (hour < 12) return 'Good morning'
  if (hour < 18) return 'Good afternoon'
  return 'Good evening'
}

// ── Tests with frozen time ─────────────────────────────────────────────────
// All tests use: 2025-06-15T12:00:00.000Z (noon UTC)

describe('isExpired', () => {
  it('returns true for a date in the past', () => {
    const past = new Date('2025-01-01')
    expect(isExpired(past)).toBe(true)
  })

  it('returns false for a date in the future', () => {
    const future = new Date('2026-01-01')
    expect(isExpired(future)).toBe(false)
  })

  it('returns false for a date exactly at current time', () => {
    const now = new Date('2025-06-15T12:00:00.000Z')
    expect(isExpired(now)).toBe(false)
  })
})

describe('daysUntilExpiry', () => {
  it('returns 1 for expiry tomorrow', () => {
    const tomorrow = new Date('2025-06-16T12:00:00.000Z')
    expect(daysUntilExpiry(tomorrow)).toBe(1)
  })

  it('returns 0 for expiry today (rounds up)', () => {
    const later = new Date('2025-06-15T18:00:00.000Z')  // 6h from now
    expect(daysUntilExpiry(later)).toBe(1)  // ceil(0.25) = 1
  })
})

describe('getGreeting', () => {
  it('returns Good afternoon at noon UTC', () => {
    // System time is 12:00 UTC — getHours() = 12
    expect(getGreeting()).toBe('Good afternoon')
  })

  it('returns Good morning before noon', () => {
    vi.setSystemTime(new Date('2025-06-15T08:00:00.000Z'))
    expect(getGreeting()).toBe('Good morning')
  })

  it('returns Good evening after 18:00', () => {
    vi.setSystemTime(new Date('2025-06-15T20:00:00.000Z'))
    expect(getGreeting()).toBe('Good evening')
  })
})
```

```typescript
// ── Advancing time after freezing ─────────────────────────────────────────
it('correctly identifies expiry after time passes', () => {
  const expiresAt = new Date('2025-06-15T12:05:00.000Z')  // 5 min from now
  expect(isExpired(expiresAt)).toBe(false)

  // Advance time by 6 minutes
  vi.advanceTimersByTime(6 * 60 * 1000)
  expect(isExpired(expiresAt)).toBe(true)
})
```

```typescript
// ── Token expiry — real-world pattern ─────────────────────────────────────
interface JwtPayload { exp: number }  // Unix timestamp

export function isTokenExpired(payload: JwtPayload): boolean {
  return Date.now() / 1000 > payload.exp
}

describe('isTokenExpired', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2025-06-15T12:00:00.000Z'))
  })
  afterEach(() => vi.useRealTimers())

  it('returns false for a token expiring in the future', () => {
    const futureExp = Math.floor(Date.now() / 1000) + 3600  // +1h
    expect(isTokenExpired({ exp: futureExp })).toBe(false)
  })

  it('returns true for an already-expired token', () => {
    const pastExp = Math.floor(Date.now() / 1000) - 1
    expect(isTokenExpired({ exp: pastExp })).toBe(true)
  })
})
```

---

## W — Why It Matters

- Without time control, date-dependent tests are non-deterministic — a test for "tokens expire after 1 hour" that uses `Date.now()` will pass differently depending on when it runs. Freezing time makes the test deterministic forever.
- `vi.setSystemTime` patches ALL sources of current time — `Date.now()`, `new Date()`, `performance.now()`. You don't need to mock each one individually. Any code that reads the current time will get your frozen value.
- Tests for timezone-sensitive logic need explicit UTC timestamps — `new Date('2025-06-15T12:00:00.000Z')` is unambiguous. `new Date('2025-06-15')` is timezone-dependent (midnight local time). Always use ISO 8601 UTC format in test time values.

---

## I — Interview Q&A

### Q: How do you test a function that checks whether a JWT token is expired without waiting for real time to pass?

**A:** Use `vi.useFakeTimers()` and `vi.setSystemTime(specificDate)` to freeze the current time at a known point. Then create a token payload with an `exp` (expiry) timestamp that is either before or after your frozen time. The function under test calls `Date.now()` internally — it receives the frozen value instead of the real clock. You can test both "token valid" (exp in the future relative to frozen time) and "token expired" (exp in the past) cases with complete control, regardless of when the test actually runs. Always call `vi.useRealTimers()` in `afterEach` to restore the real clock.

---

## C — Common Pitfalls + Fix

### ❌ Using relative dates like `new Date(Date.now() + 3600000)` in test expectations

```typescript
// ❌ Calculation uses real Date.now() at test-write time — fails later
it('token is valid', () => {
  const payload = { exp: Date.now() / 1000 + 3600 }  // relative to NOW
  expect(isTokenExpired(payload)).toBe(false)
  // If fake timers aren't set, Date.now() is real → works today, maybe fails tomorrow
})
```

**Fix:** Freeze time first, then use absolute values:

```typescript
// ✅ Time is frozen — all Date.now() calls return the same value
beforeEach(() => {
  vi.useFakeTimers()
  vi.setSystemTime(new Date('2025-06-15T12:00:00.000Z'))  // absolute, unambiguous
})

it('token is valid', () => {
  const payload = { exp: 1750003200 + 3600 }  // absolute Unix ts + 1h
  expect(isTokenExpired(payload)).toBe(false)  // deterministic forever ✅
})
```

---

## K — Coding Challenge + Solution

### Challenge

Write `getSubscriptionStatus(plan: { expiresAt: Date }): 'active' | 'expiring_soon' | 'expired'`. Returns `'expired'` if past expiry, `'expiring_soon'` if within 7 days, `'active'` otherwise. Freeze time at `2025-06-15T00:00:00Z`. Write tests for all three states and the exact boundary (7 days).

### Solution

```typescript
// src/utils/subscription.ts
export function getSubscriptionStatus(
  plan: { expiresAt: Date }
): 'active' | 'expiring_soon' | 'expired' {
  const now      = Date.now()
  const exp      = plan.expiresAt.getTime()
  const sevenDays = 7 * 24 * 60 * 60 * 1000

  if (now >= exp)            return 'expired'
  if (exp - now <= sevenDays) return 'expiring_soon'
  return 'active'
}

// src/utils/subscription.test.ts
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { getSubscriptionStatus }                           from './subscription'

const FROZEN = new Date('2025-06-15T00:00:00.000Z')

describe('getSubscriptionStatus', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(FROZEN)
  })
  afterEach(() => vi.useRealTimers())

  it('returns active for expiry more than 7 days away', () => {
    const expiresAt = new Date('2025-06-23T00:00:01.000Z')  // 8d + 1s away
    expect(getSubscriptionStatus({ expiresAt })).toBe('active')
  })

  it('returns expiring_soon exactly 7 days before expiry', () => {
    const expiresAt = new Date('2025-06-22T00:00:00.000Z')  // exactly 7 days
    expect(getSubscriptionStatus({ expiresAt })).toBe('expiring_soon')
  })

  it('returns expiring_soon within 7 days', () => {
    const expiresAt = new Date('2025-06-20T00:00:00.000Z')  // 5 days away
    expect(getSubscriptionStatus({ expiresAt })).toBe('expiring_soon')
  })

  it('returns expired for past date', () => {
    const expiresAt = new Date('2025-06-14T23:59:59.000Z')  // 1s in the past
    expect(getSubscriptionStatus({ expiresAt })).toBe('expired')
  })

  it('returns expired for exact current time', () => {
    const expiresAt = new Date(FROZEN)  // now === exp → expired
    expect(getSubscriptionStatus({ expiresAt })).toBe('expired')
  })
})
```

---

---
