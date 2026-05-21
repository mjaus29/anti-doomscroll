# 12 — Writing First Clean Unit Tests

---

## T — TL;DR

A clean unit test is: one behaviour per test, readable without comments, independent of other tests, fast (< 5ms), and deterministic. The test name reads as a specification: "it returns null when user is not found." The body follows AAA. The function under test has no side effects that leak. Apply these rules to your first real tests and they become the standard for the whole project.

---

## K — Key Concepts

```typescript
// ── Checklist for a clean unit test ──────────────────────────────────────
// ✅ Tests exactly one behaviour
// ✅ Test name describes the expected outcome (not the implementation)
// ✅ Follows AAA (Arrange → Act → Assert)
// ✅ No shared mutable state with other tests
// ✅ No real I/O (no DB, no network, no filesystem)
// ✅ Deterministic — same result every run
// ✅ Fast — completes in < 5ms
// ✅ Fails for the right reason (not because of a different bug)
```

```typescript
// ── Example: testing a real utility function ──────────────────────────────
// src/utils/currency.ts
export function formatCurrency(cents: number, currency = 'USD'): string {
  if (!Number.isInteger(cents))  throw new TypeError('cents must be an integer')
  if (cents < 0)                 throw new RangeError('cents must be non-negative')
  return new Intl.NumberFormat('en-US', {
    style:    'currency',
    currency,
    minimumFractionDigits: 2,
  }).format(cents / 100)
}

// src/utils/currency.test.ts
import { describe, it, expect } from 'vitest'
import { formatCurrency }       from './currency'

describe('formatCurrency', () => {
  // Happy path
  it('formats 1999 cents as $19.99', () => {
    expect(formatCurrency(1999)).toBe('$19.99')
  })

  it('formats 0 cents as $0.00', () => {
    expect(formatCurrency(0)).toBe('$0.00')
  })

  it('formats 100 cents as $1.00', () => {
    expect(formatCurrency(100)).toBe('$1.00')
  })

  // Non-default currency
  it('formats with EUR currency code', () => {
    expect(formatCurrency(1000, 'EUR')).toBe('€10.00')
  })

  // Error cases
  it('throws TypeError for non-integer cents', () => {
    expect(() => formatCurrency(19.99)).toThrow(TypeError)
    expect(() => formatCurrency(19.99)).toThrow('cents must be an integer')
  })

  it('throws RangeError for negative cents', () => {
    expect(() => formatCurrency(-1)).toThrow(RangeError)
  })
})
```

```typescript
// ── Example: testing a service function with a mock dependency ────────────
// src/services/notification.service.ts
interface EmailClient { send(to: string, subject: string, body: string): Promise<void> }

export class NotificationService {
  constructor(private readonly email: EmailClient) {}

  async notifyOrderShipped(
    userEmail:   string,
    orderId:     string,
    trackingNum: string
  ): Promise<void> {
    if (!trackingNum) throw new Error('trackingNum is required')
    await this.email.send(
      userEmail,
      'Your order has shipped!',
      `Tracking: ${trackingNum} for order ${orderId}`
    )
  }
}

// src/services/notification.service.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NotificationService }                  from './notification.service'

describe('NotificationService', () => {
  describe('notifyOrderShipped', () => {
    let mockEmailClient: { send: ReturnType<typeof vi.fn> }
    let service: NotificationService

    beforeEach(() => {
      mockEmailClient = { send: vi.fn().mockResolvedValue(undefined) }
      service = new NotificationService(mockEmailClient)
    })

    it('sends an email with the tracking number', async () => {
      // Arrange
      const email   = 'mark@example.com'
      const orderId = 'ord-123'
      const tracking = 'TRK-456'

      // Act
      await service.notifyOrderShipped(email, orderId, tracking)

      // Assert
      expect(mockEmailClient.send).toHaveBeenCalledOnce()
      expect(mockEmailClient.send).toHaveBeenCalledWith(
        'mark@example.com',
        'Your order has shipped!',
        expect.stringContaining('TRK-456')
      )
    })

    it('sends the email to the correct address', async () => {
      await service.notifyOrderShipped('alice@example.com', 'ord-1', 'TRK-1')
      expect(mockEmailClient.send).toHaveBeenCalledWith(
        'alice@example.com',
        expect.any(String),
        expect.any(String)
      )
    })

    it('throws when trackingNum is empty', async () => {
      await expect(
        service.notifyOrderShipped('x@x.com', 'ord-1', '')
      ).rejects.toThrow('trackingNum is required')
    })

    it('does not send email when trackingNum is empty', async () => {
      try {
        await service.notifyOrderShipped('x@x.com', 'ord-1', '')
      } catch { /* expected */ }
      expect(mockEmailClient.send).not.toHaveBeenCalled()
    })
  })
})
```

```typescript
// ── What makes a test name bad vs good ────────────────────────────────────

// ❌ Bad test names — describe the implementation or say nothing
it('works')
it('test 1')
it('handles input')
it('calls send')

// ✅ Good test names — describe the observable behaviour and outcome
it('returns $0.00 for zero cents')
it('throws RangeError for negative input')
it('sends the email to the recipient address')
it('does not send email when tracking number is missing')

// Rule: if the test fails, can you understand what broke just from the name?
// If yes: good name. If no: too vague.
```

---

## W — Why It Matters

- Unit tests are specifications — a well-named test suite for `formatCurrency` documents exactly what the function guarantees: it formats 1999 as `$19.99`, it handles zero, it rejects non-integers, it rejects negatives. This is more reliable than prose documentation because it's executable and enforced by CI.
- Injecting dependencies (the `EmailClient` via the constructor) is the design pattern that makes services unit-testable — instead of the service creating its own `nodemailer` instance (which would try to send a real email), it accepts any object with a `send` method. In tests, you pass a mock. In production, you pass the real client. This is dependency injection.
- The "does not send email when trackingNum is empty" test is as important as the error test — it verifies that the guard clause (`if (!trackingNum) throw`) prevents the side effect. Without this test, you only know the error is thrown, not that the email is suppressed.

---

## I — Interview Q&A

### Q: How do you unit test a service that has an external dependency (like an email client or a database) without making real calls?

**A:** Dependency injection — accept the dependency as a constructor parameter or function argument instead of instantiating it inside the service. In the test, pass a mock: a plain object or `vi.fn()` that satisfies the interface. For example, instead of `new EmailService()` creating a `nodemailer` transporter internally, it accepts `{ send: (to, subject, body) => Promise<void> }`. In tests, pass `{ send: vi.fn() }`. This approach has three benefits: (1) tests are instant — no real network calls, (2) tests are deterministic — mock always responds the same way, (3) tests are specific — you can verify exactly what the dependency was called with using `expect(mock.send).toHaveBeenCalledWith(...)`. This is the core of testable design: invert control of dependencies.

---

## C — Common Pitfalls + Fix

### ❌ Testing private implementation — test breaks on refactor

```typescript
// ❌ Accessing a private method / internal state
it('sets the internal _cache', () => {
  service.loadUser('u1')
  expect((service as any)._cache['u1']).toBeDefined()  // ← private, cast to any ❌
})
// If _cache is renamed to cache_, this test breaks — nothing external changed ❌
```

**Fix:** Test the observable behaviour — what external callers see:

```typescript
// ✅ Test via the public API
it('returns cached user on second call without fetching again', async () => {
  await service.getUser('u1')    // first call — fetches
  await service.getUser('u1')    // second call — should use cache
  expect(mockFetch).toHaveBeenCalledOnce()  // ← proves caching, not how it's stored ✅
})
```

---

## K — Coding Challenge + Solution

### Challenge

Write a `PasswordService` class with: `hash(password: string): Promise<string>` (uses injected hasher), `verify(password: string, hash: string): Promise<boolean>` (uses injected verifier), throws `WeakPasswordError` if password < 8 chars. Write clean unit tests following all rules: factory, AAA, one behaviour per test, mock injection.

### Solution

```typescript
// src/services/password.service.ts
interface Hasher {
  hash:   (pwd: string) => Promise<string>
  verify: (pwd: string, hash: string) => Promise<boolean>
}

export class WeakPasswordError extends Error {
  constructor() { super('Password must be at least 8 characters') }
}

export class PasswordService {
  constructor(private readonly hasher: Hasher) {}

  async hash(password: string): Promise<string> {
    if (password.length < 8) throw new WeakPasswordError()
    return this.hasher.hash(password)
  }

  async verify(password: string, hash: string): Promise<boolean> {
    return this.hasher.verify(password, hash)
  }
}

// src/services/password.service.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { PasswordService, WeakPasswordError }   from './password.service'

function createMockHasher() {
  return {
    hash:   vi.fn().mockResolvedValue('$hashed$'),
    verify: vi.fn().mockResolvedValue(true),
  }
}

describe('PasswordService', () => {
  let mockHasher: ReturnType<typeof createMockHasher>
  let service:    PasswordService

  beforeEach(() => {
    mockHasher = createMockHasher()
    service    = new PasswordService(mockHasher)
  })

  describe('hash', () => {
    it('returns the hashed password', async () => {
      // Arrange
      const password = 'secureP@ss123'

      // Act
      const result = await service.hash(password)

      // Assert
      expect(result).toBe('$hashed$')
      expect(mockHasher.hash).toHaveBeenCalledWith(password)
    })

    it('delegates to the hasher with the original password', async () => {
      await service.hash('mypassword')
      expect(mockHasher.hash).toHaveBeenCalledOnce()
      expect(mockHasher.hash).toHaveBeenCalledWith('mypassword')
    })

    it('throws WeakPasswordError for passwords under 8 characters', async () => {
      await expect(service.hash('short')).rejects.toThrow(WeakPasswordError)
    })

    it('does not call hasher for weak passwords', async () => {
      try { await service.hash('short') } catch { /* expected */ }
      expect(mockHasher.hash).not.toHaveBeenCalled()
    })

    it('accepts passwords exactly 8 characters long', async () => {
      await expect(service.hash('12345678')).resolves.toBe('$hashed$')
    })
  })

  describe('verify', () => {
    it('returns true when hasher returns true', async () => {
      mockHasher.verify.mockResolvedValue(true)
      const result = await service.verify('password', '$hash$')
      expect(result).toBe(true)
    })

    it('returns false when hasher returns false', async () => {
      mockHasher.verify.mockResolvedValue(false)
      const result = await service.verify('wrongpassword', '$hash$')
      expect(result).toBe(false)
    })

    it('delegates to hasher with correct arguments', async () => {
      await service.verify('mypass', '$thehash$')
      expect(mockHasher.verify).toHaveBeenCalledWith('mypass', '$thehash$')
    })
  })
})
```

---

## ✅ Day 1 Complete — Vitest Fundamentals

| # | Subtopic | Status |
|---|----------|--------|
| 1  | Testing Purpose and the Test Pyramid | ☐ |
| 2  | Vitest Setup and Installation | ☐ |
| 3  | Config File Basics — vitest.config.ts | ☐ |
| 4  | Test File Naming Conventions | ☐ |
| 5  | describe → it/test → expect Flow | ☐ |
| 6  | Assertion Patterns — expect Matchers | ☐ |
| 7  | Watch Mode and Filtering Tests | ☐ |
| 8  | Setup Files and Global Hooks | ☐ |
| 9  | Project Structure for Tests | ☐ |
| 10 | Node Environment Configuration | ☐ |
| 11 | Coverage Introduction | ☐ |
| 12 | Writing First Clean Unit Tests | ☐ |

---

## 🗺️ One-Page Mental Model — Day 1

```
TEST PYRAMID
  Unit (bottom, most):        pure functions, services with mocks — < 5ms
  Integration (middle):       real DB, real HTTP — 50–500ms
  E2E (top, fewest):          full browser + real app — 2–30s
  Invert = slow CI = flaky tests = nobody runs it

INSTALL
  npm install --save-dev vitest @vitest/coverage-v8
  "test": "vitest run"     ← CI (exits)
  "test:watch": "vitest"   ← local (watch)

CONFIG (vitest.config.ts)
  environment: 'node'      ← backend code
  environment: 'jsdom'     ← React/DOM code
  globals: false           ← explicit imports (better DX)
  setupFiles: [...]        ← runs before each test file
  coverage.provider: 'v8'
  coverage.thresholds: { lines: 80, branches: 70 }
  plugins: [tsconfigPaths()] ← resolves @/ aliases ✅

FILE NAMING
  format.test.ts           ← co-located next to source (recommended)
  format.spec.ts           ← also valid, pick one
  __tests__/               ← integration tests
  src/test/setup.ts        ← NOT a test file — setup utility
  Rule: .test. or .spec. in the name

STRUCTURE: describe → it → expect
  describe('functionName', () => {
    it('does X when Y', () => {
      // Arrange
      // Act
      // Assert
    })
  })
  it = test (aliases) — it reads as a sentence
  it.only / describe.only → ban in CI (ESLint rule: no-focused-tests)
  it.skip → marks as skipped (not failed)
  it.todo → placeholder, shows in output
  it.each([...]) → data-driven tests

MATCHERS
  toBe          → strict === (primitives)
  toEqual       → deep equality (objects, arrays)
  toMatchObject → partial match (subset)
  toBeNull/Defined/Truthy/Falsy
  toContain     → array/string contains
  toHaveLength  → array or string length
  toThrow()     → wrap in arrow: expect(() => fn()).toThrow()
  resolves/rejects → always await: await expect(p).resolves.toBe(x)

WATCH MODE
  vitest        → watch (press h for help)
  p             → filter by filename
  t             → filter by test name
  f             → run failed only
  a             → run all
  vitest run -t "pattern"   → CLI filter, no file editing

HOOKS
  beforeAll/afterAll     → once per describe (expensive setup)
  beforeEach/afterEach   → before/after each test (reset state)
  vi.clearAllMocks()     → reset call counts (in beforeEach)
  vi.resetAllMocks()     → reset count + implementation
  vi.restoreAllMocks()   → restore spies (in afterEach)

PROJECT STRUCTURE
  src/
    utils/format.ts + format.test.ts    ← co-located unit
    services/order.service.ts + .test.ts
    test/
      setup.ts                           ← global env setup
      factories/user.factory.ts          ← createUser(overrides)
      mocks/prisma.mock.ts               ← createMockPrisma()
    __tests__/                           ← integration tests

COVERAGE
  npx vitest run --coverage
  v8 provider (no extra config needed)
  html reporter → open coverage/index.html for line-by-line view
  4 metrics: lines, statements, branches, functions
  branches most important (reveals untested if/else paths)
  Threshold: 80% lines, 70% branches is a good starting target
  Coverage = floor not ceiling — meaningful tests > 100% trivial coverage

CLEAN TEST RULES
  One behaviour per it()
  Name = specification: "returns null when user not found"
  AAA: Arrange → Act → Assert
  No shared mutable state (use beforeEach to reset)
  No real I/O (mock the dependency, inject via constructor)
  Deterministic — no Date.now(), no Math.random() without mocking
  Test observable behaviour, not private internals
```

> **Your next action:** Install Vitest in your project, create `src/utils/formatCurrency.ts` with a simple cents-to-string function, write `src/utils/formatCurrency.test.ts` with three test cases. Run `npm test`. See green. That's it.

> "Doing one small thing beats opening a feed."
