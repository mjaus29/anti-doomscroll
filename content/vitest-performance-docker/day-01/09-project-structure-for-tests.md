# 9 — Project Structure for Tests

---

## T — TL;DR

A consistent test folder structure prevents chaos as the project grows. Use co-located `.test.ts` files for unit tests. Use `src/test/` for shared test utilities, factories, and the global setup file. Use `src/__tests__/` or `tests/` for integration tests that don't belong next to a single source file. The goal: any developer can find the test for any file in under 5 seconds.

---

## K — Key Concepts

```
── Recommended structure for a full-stack Next.js + Prisma + tRPC project ────

src/
│
├── lib/
│   ├── prisma.ts
│   └── prisma.test.ts          ← unit test for any testable prisma utilities
│
├── utils/
│   ├── format.ts
│   ├── format.test.ts          ← unit: co-located
│   ├── validate.ts
│   └── validate.test.ts
│
├── services/
│   ├── order.service.ts
│   ├── order.service.test.ts   ← unit: service logic with mocked Prisma
│   ├── email.service.ts
│   └── email.service.test.ts
│
├── server/
│   ├── routers/
│   │   ├── order.ts
│   │   └── order.test.ts       ← unit: tRPC router with mocked ctx
│
├── test/                       ← shared test infrastructure (NOT test files)
│   ├── setup.ts                ← global setup (setupFiles in config)
│   ├── factories/
│   │   ├── user.factory.ts     ← test data factories
│   │   └── order.factory.ts
│   ├── mocks/
│   │   ├── prisma.mock.ts      ← reusable Prisma mock
│   │   └── auth.mock.ts
│   └── helpers/
│       └── create-caller.ts    ← tRPC test caller helper
│
└── __tests__/                  ← integration tests (cross-cutting)
    ├── api/
    │   └── order.int.test.ts   ← calls real DB, real HTTP
    └── auth/
        └── session.int.test.ts

vitest.config.ts
prisma/
  schema.prisma
  migrations/
```

```typescript
// ── src/test/factories/user.factory.ts — test data factory ───────────────
// Factories create realistic test data with sensible defaults
// Override only what the test cares about

import type { User } from '@prisma/client'

let seq = 0  // sequence counter for unique values

export function createUser(overrides: Partial<User> = {}): User {
  seq++
  return {
    id:           `user-${seq}`,
    email:        `user${seq}@example.com`,
    name:         `Test User ${seq}`,
    role:         'user',
    passwordHash: '$2b$10$hashed',
    createdAt:    new Date('2025-01-01'),
    updatedAt:    new Date('2025-01-01'),
    ...overrides,
  }
}

// Usage in tests:
// const user = createUser()                      → unique defaults
// const admin = createUser({ role: 'admin' })   → only override what matters
// const user2 = createUser({ email: 'specific@test.com' })
```

```typescript
// ── src/test/mocks/prisma.mock.ts — reusable Prisma mock ────────────────
import { vi } from 'vitest'

// Minimal Prisma Client mock — add methods as needed
export function createMockPrisma() {
  return {
    user: {
      findUnique:    vi.fn(),
      findMany:      vi.fn(),
      create:        vi.fn(),
      update:        vi.fn(),
      delete:        vi.fn(),
    },
    order: {
      findUnique:    vi.fn(),
      create:        vi.fn(),
      update:        vi.fn(),
    },
    $transaction:    vi.fn((fn: Function) => fn({
      user:  { create: vi.fn(), update: vi.fn() },
      order: { create: vi.fn() },
    })),
  }
}

export type MockPrisma = ReturnType<typeof createMockPrisma>
```

---

## W — Why It Matters

- `src/test/factories/` is the single most impactful test infrastructure investment — without factories, every test file builds its own user objects with slightly different fields. When the `User` model gains a new required field, you update one factory instead of 40 test files.
- Separating `src/test/` (utilities, never run as tests) from co-located `.test.ts` files (run as tests) prevents accidental test discovery. The setup file, factories, and mock helpers should never appear in test output as test files.
- The `__tests__/` folder for integration tests (cross-cutting tests that involve multiple services) is the right compromise — these tests don't belong next to a single source file because they test multiple files working together. A dedicated integration folder makes the distinction explicit.

---

## I — Interview Q&A

### Q: What is a test factory and why is it better than creating test data inline in each test?

**A:** A test factory is a function that creates a valid object with sensible defaults, accepting optional overrides for specific properties. For example, `createUser({ role: 'admin' })` returns a complete valid user object where only `role` differs from the default. The advantages over inline object literals: (1) When the data model changes (e.g. a new required field is added to `User`), you update one factory function and all tests automatically get the update — without a factory, you'd update dozens of inline objects. (2) Factories ensure test data is always valid by construction — no more tests failing because someone forgot a required field in their inline object. (3) Tests express intent — `createUser({ role: 'admin' })` communicates "I need an admin user" without noise from the 10 other fields that don't matter for this test.

---

## C — Common Pitfalls + Fix

### ❌ Importing test utilities from `src/test/setup.ts` in test files — coupling to setup

```typescript
// ❌ setup.ts is a side-effect file, not an import module
import { mockFetch } from '../test/setup'  // ← setup.ts doesn't export anything ❌
```

**Fix:** Keep `setup.ts` as a side-effect file. Extract reusable utilities to dedicated files:

```typescript
// src/test/mocks/fetch.mock.ts — importable utility
export function createFetchMock() {
  return vi.fn().mockResolvedValue(new Response(JSON.stringify({})))
}

// In test:
import { createFetchMock } from '@/test/mocks/fetch.mock'
const fetchMock = createFetchMock()
vi.stubGlobal('fetch', fetchMock)
```

---

## K — Coding Challenge + Solution

### Challenge

Create a `createOrder` factory function for a test suite. Order fields: `id` (string), `customerId` (string), `status` ('pending'|'confirmed'|'delivered'|'cancelled'), `total` (number), `createdAt` (Date). Include a sequence counter for unique IDs. Show usage in two test scenarios: a pending order and a delivered order with custom total.

### Solution

```typescript
// src/test/factories/order.factory.ts
let seq = 0

interface Order {
  id:         string
  customerId: string
  status:     'pending' | 'confirmed' | 'delivered' | 'cancelled'
  total:      number
  createdAt:  Date
}

export function createOrder(overrides: Partial<Order> = {}): Order {
  seq++
  return {
    id:         `order-${seq}`,
    customerId: `customer-${seq}`,
    status:     'pending',
    total:      1000,
    createdAt:  new Date('2025-01-01T00:00:00Z'),
    ...overrides,
  }
}

// Usage in tests:
// const pendingOrder = createOrder()
// → { id: 'order-1', customerId: 'customer-1', status: 'pending', total: 1000, ... }

// const deliveredOrder = createOrder({ status: 'delivered', total: 5000 })
// → { id: 'order-2', ..., status: 'delivered', total: 5000 }

// Example tests:
import { describe, it, expect } from 'vitest'
import { createOrder }          from '@/test/factories/order.factory'

describe('order factory', () => {
  it('creates a pending order by default', () => {
    const order = createOrder()
    expect(order.status).toBe('pending')
    expect(order.id).toMatch(/^order-/)
  })

  it('allows overriding status and total', () => {
    const order = createOrder({ status: 'delivered', total: 5000 })
    expect(order.status).toBe('delivered')
    expect(order.total).toBe(5000)
  })
})
```

---

---
