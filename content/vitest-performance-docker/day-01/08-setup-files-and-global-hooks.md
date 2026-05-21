# 8 — Setup Files and Global Hooks

---

## T — TL;DR

Setup files run once before test files and configure the global test environment — import polyfills, set env vars, mock global objects. `beforeAll` / `afterAll` run once per `describe` block. `beforeEach` / `afterEach` run before/after every single test. Use `beforeEach` to reset state between tests and prevent test pollution.

---

## K — Key Concepts

```typescript
// ── src/test/setup.ts — global setup file ────────────────────────────────
// Referenced in vitest.config.ts: setupFiles: ['./src/test/setup.ts']
// Runs ONCE per test file (not once globally)

import { vi }         from 'vitest'

// Set environment variables for all tests
process.env.NODE_ENV   = 'test'
process.env.DATABASE_URL = 'postgresql://localhost:5432/testdb'
process.env.JWT_SECRET   = 'test-secret-not-real'

// Mock global objects
vi.stubGlobal('fetch', vi.fn())  // prevent accidental real network calls in unit tests

// Suppress specific console noise in tests
// (only if it clutters test output — don't silence errors)
// vi.spyOn(console, 'warn').mockImplementation(() => {})
```

```typescript
// ── beforeAll / afterAll — once per describe block ────────────────────────
import { describe, it, expect, beforeAll, afterAll } from 'vitest'

describe('UserService', () => {
  let service: UserService

  beforeAll(() => {
    // Runs ONCE before all tests in this describe
    // Use for: expensive setup (DB connection, reading large files)
    service = new UserService({ dbUrl: process.env.DATABASE_URL })
  })

  afterAll(async () => {
    // Runs ONCE after all tests in this describe
    // Use for: cleanup (close DB connection, delete test files)
    await service.close()
  })

  it('creates a user', () => { /* ... */ })
  it('finds a user', () => { /* ... */ })
})
```

```typescript
// ── beforeEach / afterEach — before/after EVERY test ──────────────────────
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'

describe('OrderService', () => {
  let mockPrisma: MockPrismaClient

  beforeEach(() => {
    // Runs before EACH test — creates a fresh mock every time
    // Prevents state leaking from one test to the next
    mockPrisma = createMockPrisma()
    vi.clearAllMocks()  // reset all mock call counts and implementations
  })

  afterEach(() => {
    // Runs after EACH test — cleanup
    vi.restoreAllMocks()  // restore any spied-on functions to originals
  })

  it('creates an order', () => {
    // mockPrisma is fresh — no leftover state from previous tests ✅
  })
})
```

```typescript
// ── Hook execution order ──────────────────────────────────────────────────
// For a describe block with 3 tests:
//
// beforeAll        (1×)
//   beforeEach     (1×)
//     test 1
//   afterEach      (1×)
//   beforeEach     (1×)
//     test 2
//   afterEach      (1×)
//   beforeEach     (1×)
//     test 3
//   afterEach      (1×)
// afterAll         (1×)

// Nested describe hooks run outer-to-inner on setup, inner-to-outer on teardown:
// outer beforeAll → inner beforeAll → outer beforeEach → inner beforeEach → test
// → inner afterEach → outer afterEach → ... → inner afterAll → outer afterAll
```

```typescript
// ── vi.clearAllMocks vs vi.resetAllMocks vs vi.restoreAllMocks ────────────

vi.clearAllMocks()
// Clears: mock.calls, mock.instances, mock.results
// Does NOT reset: implementation (mockReturnValue still returns the same value)
// Use: in beforeEach to reset call tracking between tests

vi.resetAllMocks()
// Clears call tracking + resets implementation to undefined
// After reset: vi.fn() returns undefined again
// Use: when you want each test to start with a blank mock

vi.restoreAllMocks()
// Restores: vi.spyOn() mocks back to original implementation
// Does NOT restore: vi.fn() (not a spy, has no original)
// Use: in afterEach to undo spy wrapping
```

---

## W — Why It Matters

- `beforeEach` + `vi.clearAllMocks()` is the correct pattern to prevent test pollution — if test A sets a mock return value and test B doesn't override it, test B may pass for the wrong reason (using test A's setup). Fresh state in `beforeEach` guarantees each test is self-contained.
- Global setup files are the right place for env vars, not individual test files — if every test file sets `process.env.DATABASE_URL = 'testdb'`, changing the test DB URL requires editing 30 files. One `setup.ts` = one change.
- `afterAll` for cleanup is critical in integration tests — if a test opens a database connection or starts an HTTP server and doesn't close it, Vitest may hang after tests complete, waiting for the open handles to close. Always close resources in `afterAll`.

---

## I — Interview Q&A

### Q: When should you use `beforeAll` vs `beforeEach`?

**A:** `beforeAll` runs once per describe block — use it for setup that is expensive and produces no shared mutable state. Creating a test database schema, initialising a large data structure, or spinning up a server are `beforeAll` candidates — these take time and don't need to be recreated for every test. `beforeEach` runs before every individual test — use it for any state that must be fresh per test. Creating mocks, seeding a small amount of test data, resetting counters, and calling `vi.clearAllMocks()` belong in `beforeEach`. The rule: if two tests sharing setup state could interfere with each other (test A modifies what test B reads), use `beforeEach`. If the setup is read-only and expensive, use `beforeAll`.

---

## C — Common Pitfalls + Fix

### ❌ Mutating shared state in `beforeAll` — test order dependency

```typescript
// ❌ users is shared — test 2 sees test 1's mutation
const users: User[] = []

beforeAll(() => {
  users.push({ id: 1, name: 'Alice' })  // populated once
})

it('test 1', () => {
  users.push({ id: 2, name: 'Bob' })    // mutates shared array ❌
  expect(users).toHaveLength(2)
})

it('test 2', () => {
  expect(users).toHaveLength(1)         // ❌ fails — test 1 left Bob in there
})
```

**Fix:** Use `beforeEach` to reset mutable state:

```typescript
// ✅ Fresh copy per test
let users: User[]

beforeEach(() => {
  users = [{ id: 1, name: 'Alice' }]  // reset every time
})

it('test 1', () => {
  users.push({ id: 2, name: 'Bob' })
  expect(users).toHaveLength(2)        // ✅
})
it('test 2', () => {
  expect(users).toHaveLength(1)        // ✅ — fresh array
})
```

---

## K — Coding Challenge + Solution

### Challenge

Write a complete `src/test/setup.ts` that: (1) sets `NODE_ENV=test` and a dummy `DATABASE_URL`; (2) globally stubs `fetch` as a mock fn; (3) clears all mocks after each test using Vitest's global hooks. Also write a describe block showing `beforeAll` and `beforeEach` used correctly for an `EmailService`.

### Solution

```typescript
// src/test/setup.ts
import { vi, afterEach } from 'vitest'

// Environment setup
process.env.NODE_ENV    = 'test'
process.env.DATABASE_URL = 'postgresql://localhost:5432/testdb'
process.env.JWT_SECRET   = 'test-only-secret-32-chars-padding!!'

// Prevent accidental real network calls
vi.stubGlobal('fetch', vi.fn())

// Reset all mocks between tests — prevents test pollution
afterEach(() => {
  vi.clearAllMocks()
})
```

```typescript
// src/services/email.service.test.ts
import { describe, it, expect, beforeAll, beforeEach, vi } from 'vitest'

class EmailService {
  private transporter: { send: (opts: object) => Promise<void> }
  constructor(transporter: { send: (opts: object) => Promise<void> }) {
    this.transporter = transporter
  }
  async sendWelcome(email: string) {
    await this.transporter.send({ to: email, subject: 'Welcome!' })
  }
}

describe('EmailService', () => {
  let service: EmailService
  let mockSend: ReturnType<typeof vi.fn>

  beforeAll(() => {
    // Create the service once — expensive init (auth, TLS handshake in prod)
    mockSend = vi.fn()
    service  = new EmailService({ send: mockSend })
  })

  beforeEach(() => {
    // Reset call tracking before each test — not the implementation
    mockSend.mockClear()
  })

  it('calls send with the correct email', async () => {
    await service.sendWelcome('mark@example.com')
    expect(mockSend).toHaveBeenCalledOnce()
    expect(mockSend).toHaveBeenCalledWith({
      to:      'mark@example.com',
      subject: 'Welcome!',
    })
  })

  it('calls send again for a different email', async () => {
    await service.sendWelcome('alice@example.com')
    expect(mockSend).toHaveBeenCalledOnce()  // ✅ mockClear reset previous call ✅
  })
})
```

---

---
