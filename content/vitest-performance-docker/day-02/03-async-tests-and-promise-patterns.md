# 3 — Async Tests and Promise Patterns

---

## T — TL;DR

Vitest handles async tests via `async/await` — mark the test function `async` and `await` every assertion involving a Promise. Three common patterns: `await` the function directly, `await expect().resolves`, or `await expect().rejects`. Always `return` or `await` Promises in tests — a floating Promise causes a test to pass vacuously even when the assertion would fail.

---

## K — Key Concepts

```typescript
// ── Pattern 1: await the call, then assert ────────────────────────────────
it('fetches user data', async () => {
  // Arrange: mock is set in beforeEach

  // Act
  const user = await getUser('u1')

  // Assert
  expect(user).toMatchObject({ id: 'u1', name: 'Alice' })
  // TypeScript-friendly — user is typed ✅
})

// ── Pattern 2: await expect().resolves ────────────────────────────────────
it('resolves with user data', async () => {
  await expect(getUser('u1')).resolves.toMatchObject({ id: 'u1' })
  // Fluent — good for simple assertions
})

// ── Pattern 3: await expect().rejects ────────────────────────────────────
it('rejects when user not found', async () => {
  await expect(getUser('missing')).rejects.toThrow('User not found')
  // Always await — the assertion itself is a Promise ✅
})
```

```typescript
// ── Floating Promise — the silent test failure ────────────────────────────

// ❌ Missing await — test passes even if assertion fails
it('WRONG: resolves with correct data', () => {
  // No async, no await — this Promise floats
  expect(getUser('u1')).resolves.toBe('wrong value')
  // Vitest doesn't wait for this → test ends → marked as passed ❌
})

// ✅ Always async + await
it('resolves with correct data', async () => {
  await expect(getUser('u1')).resolves.toMatchObject({ id: 'u1' })
})
```

```typescript
// ── Testing Promise.all and parallel calls ────────────────────────────────
async function getUsers(ids: string[]) {
  return Promise.all(ids.map(id => getUser(id)))
}

it('fetches multiple users in parallel', async () => {
  const users = await getUsers(['u1', 'u2', 'u3'])

  expect(users).toHaveLength(3)
  expect(users[0]).toMatchObject({ id: 'u1' })
  expect(users[1]).toMatchObject({ id: 'u2' })
})
```

```typescript
// ── Testing settled promises (allSettled) ────────────────────────────────
async function tryFetchAll(ids: string[]) {
  return Promise.allSettled(ids.map(id => getUser(id)))
}

it('returns settled results including failures', async () => {
  const results = await tryFetchAll(['u1', 'invalid'])

  expect(results[0].status).toBe('fulfilled')
  expect((results[0] as PromiseFulfilledResult<User>).value.id).toBe('u1')

  expect(results[1].status).toBe('rejected')
  expect((results[1] as PromiseRejectedResult).reason.message)
    .toContain('User not found')
})
```

```typescript
// ── Async setup with beforeEach ────────────────────────────────────────────
describe('async beforeEach', () => {
  let connection: TestDbConnection

  beforeEach(async () => {
    connection = await openTestConnection()   // await async setup ✅
  })

  afterEach(async () => {
    await connection.close()                  // await async teardown ✅
  })

  it('executes a query', async () => {
    const result = await connection.query('SELECT 1')
    expect(result).toBeDefined()
  })
})
```

```typescript
// ── Testing functions that call callbacks-style async (promisified) ────────
import { promisify } from 'util'
import { readFile }  from 'fs'

const readFileAsync = promisify(readFile)

it('reads a file', async () => {
  const content = await readFileAsync('./package.json', 'utf8')
  const pkg     = JSON.parse(content)
  expect(pkg).toHaveProperty('name')
})

// For truly callback-based functions — use done() (legacy, avoid if possible)
it('callback-based (legacy pattern)', (done) => {
  readFile('./package.json', 'utf8', (err, data) => {
    expect(err).toBeNull()
    expect(JSON.parse(data)).toHaveProperty('name')
    done()    // ← must call done() or test hangs until timeout
  })
})
```

---

## W — Why It Matters

- Async tests without `await` create false positives — this is the most dangerous testing mistake because the test report says "passed" and you trust it. Set up ESLint rule `@typescript-eslint/no-floating-promises` to catch these at lint time.
- `beforeEach` and `afterEach` can be async — always `await` async setup in hooks, not just in tests. If `beforeEach` opens a connection and you forget `await`, the connection may not be ready when the test starts, causing flaky failures.
- The `done()` callback pattern is legacy — avoid it in new code. `async/await` handles all Promise-based async. `done()` is only needed for truly callback-based APIs (native Node.js streams, some older libraries) that don't return Promises.

---

## I — Interview Q&A

### Q: What is a floating Promise in tests and how does it cause false positives?

**A:** A floating Promise is a Promise that is created but not awaited — the test function returns before the Promise settles, so Vitest marks the test as passed based on the synchronous code completing without throwing. Example: `expect(asyncFn()).resolves.toBe('wrong')` without `await` creates a Promise containing the assertion. Vitest doesn't wait for it — the assertion may fail internally, but since the rejection isn't observed, the test passes. The fix: mark the test `async` and `await` every Promise-returning assertion. To catch this automatically, enable `@typescript-eslint/no-floating-promises` ESLint rule — TypeScript knows whether a function returns a Promise and will warn if the return value is discarded.

---

## C — Common Pitfalls + Fix

### ❌ Not awaiting `beforeEach` async setup — race condition

```typescript
// ❌ beforeEach returns before setup completes
beforeEach(() => {
  db = createTestDatabase()   // returns Promise but not awaited
  // db may not be ready when the test starts ❌
})
```

**Fix:**

```typescript
// ✅ Async beforeEach — Vitest awaits it before running the test
beforeEach(async () => {
  db = await createTestDatabase()   // fully ready before test runs ✅
})
```

---

## K — Coding Challenge + Solution

### Challenge

Write `getUserWithOrders(userId)` — calls `getUser(id)` then `getOrders(userId)` in sequence, returns `{ user, orders }`. Write tests for: (1) happy path with mocked dependencies; (2) rejects when `getUser` rejects; (3) rejects when `getOrders` rejects; (4) does NOT call `getOrders` if `getUser` fails. Show the floating promise anti-pattern as a comment.

### Solution

```typescript
// src/services/user-orders.ts
export async function getUserWithOrders(userId: string) {
  const user   = await getUser(userId)
  const orders = await getOrders(userId)
  return { user, orders }
}

// src/services/user-orders.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest'

const mockGetUser   = vi.fn()
const mockGetOrders = vi.fn()

vi.mock('./api', () => ({
  getUser:   mockGetUser,
  getOrders: mockGetOrders,
}))

import { getUserWithOrders } from './user-orders'

describe('getUserWithOrders', () => {
  const fakeUser   = { id: 'u1', name: 'Alice' }
  const fakeOrders = [{ id: 'o1', total: 999 }]

  beforeEach(() => {
    vi.clearAllMocks()
    mockGetUser.mockResolvedValue(fakeUser)
    mockGetOrders.mockResolvedValue(fakeOrders)
  })

  it('returns user and orders on success', async () => {
    const result = await getUserWithOrders('u1')
    expect(result).toEqual({ user: fakeUser, orders: fakeOrders })
  })

  it('rejects when getUser rejects', async () => {
    mockGetUser.mockRejectedValue(new Error('User not found'))
    await expect(getUserWithOrders('u1')).rejects.toThrow('User not found')
  })

  it('rejects when getOrders rejects', async () => {
    mockGetOrders.mockRejectedValue(new Error('Orders unavailable'))
    await expect(getUserWithOrders('u1')).rejects.toThrow('Orders unavailable')
  })

  it('does not call getOrders when getUser fails', async () => {
    mockGetUser.mockRejectedValue(new Error('not found'))
    try { await getUserWithOrders('u1') } catch { /* expected */ }
    expect(mockGetOrders).not.toHaveBeenCalled()
  })

  // ❌ ANTI-PATTERN (shown as comment — don't do this):
  // it('WRONG: floating promise test', () => {
  //   expect(getUserWithOrders('u1')).resolves.toMatchObject({}) // no await → false pass
  // })
})
```

---

---
