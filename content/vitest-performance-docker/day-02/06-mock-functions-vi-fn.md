# 6 — Mock Functions — vi.fn()

---

## T — TL;DR

`vi.fn()` creates a mock function that records every call — arguments, return values, call count, call order. You control what it returns with `mockReturnValue`, `mockResolvedValue`, `mockImplementation`. Assert on how it was called with `toHaveBeenCalledWith`, `toHaveBeenCalledTimes`, `toHaveBeenCalledOnce`. Mock functions replace real dependencies in tests without modifying production code.

---

## K — Key Concepts

```typescript
import { vi, expect } from 'vitest'

// ── Creating a mock function ───────────────────────────────────────────────
const mockFn = vi.fn()

mockFn('hello', 42)
mockFn('world')

// Call tracking
expect(mockFn).toHaveBeenCalledTimes(2)
expect(mockFn).toHaveBeenCalledWith('hello', 42)
expect(mockFn).toHaveBeenLastCalledWith('world')
expect(mockFn).toHaveBeenNthCalledWith(1, 'hello', 42)
```

```typescript
// ── Controlling return values ──────────────────────────────────────────────

// Always return the same value
const getPrice = vi.fn().mockReturnValue(999)
getPrice()  // 999
getPrice()  // 999

// Return different values on sequential calls
const getToken = vi.fn()
  .mockReturnValueOnce('token-1')  // first call
  .mockReturnValueOnce('token-2')  // second call
  .mockReturnValue('token-default') // all subsequent calls

getToken()  // 'token-1'
getToken()  // 'token-2'
getToken()  // 'token-default'
getToken()  // 'token-default'

// Async: resolve a value
const fetchUser = vi.fn().mockResolvedValue({ id: '1', name: 'Alice' })
await fetchUser()  // { id: '1', name: 'Alice' }

// Async: reject with error
const failFetch = vi.fn().mockRejectedValue(new Error('Network error'))
await failFetch().catch(e => e.message)  // 'Network error'

// Mix resolve/reject
const unstable = vi.fn()
  .mockRejectedValueOnce(new Error('first fail'))
  .mockResolvedValue({ data: 'ok' })
```

```typescript
// ── mockImplementation — custom behaviour ────────────────────────────────
const multiply = vi.fn().mockImplementation((a: number, b: number) => a * b)
expect(multiply(3, 4)).toBe(12)

// Async implementation
const fetchData = vi.fn().mockImplementation(async (id: string) => {
  if (id === 'missing') throw new Error('Not found')
  return { id, data: 'value' }
})

// mockImplementationOnce — different implementation for first call only
const service = vi.fn()
  .mockImplementationOnce(() => { throw new Error('first attempt fails') })
  .mockImplementation(() => 'success')
```

```typescript
// ── Inspecting calls ──────────────────────────────────────────────────────
const logger = vi.fn()

logger('error', { code: 500 })
logger('info',  { code: 200 })

// Access call records
console.log(logger.mock.calls)
// [['error', { code: 500 }], ['info', { code: 200 }]]

console.log(logger.mock.calls[0])     // ['error', { code: 500 }]
console.log(logger.mock.calls[0][1])  // { code: 500 }

console.log(logger.mock.results)
// [{ type: 'return', value: undefined }, ...]

// ── Partial argument matching ─────────────────────────────────────────────
expect(logger).toHaveBeenCalledWith('error', expect.objectContaining({ code: 500 }))
expect(logger).toHaveBeenCalledWith(expect.any(String), expect.any(Object))
```

```typescript
// ── Type-safe vi.fn() with generics ──────────────────────────────────────
type SendEmail = (to: string, subject: string) => Promise<void>

const mockSendEmail = vi.fn<SendEmail>()
  .mockResolvedValue(undefined)

// TypeScript enforces correct argument types:
// mockSendEmail(42, 'subject')  ← TS error: number is not string ✅
```

---

## W — Why It Matters

- `vi.fn()` is the unit test workhorse — every time you need to test that "function A calls function B with specific arguments", `vi.fn()` is the tool. It removes the real B (database call, email send, API request) and replaces it with a controllable, inspectable substitute.
- `mockReturnValueOnce` is the key to testing retry logic and state transitions — the first call fails, the second succeeds. Without per-call control, you'd need two separate mocks and two separate tests.
- `mock.calls` gives you access to every argument of every call — when `toHaveBeenCalledWith` isn't expressive enough (e.g. you need to check the third argument of the second call), access `mockFn.mock.calls[1][2]` directly.

---

## I — Interview Q&A

### Q: What is the difference between `mockReturnValue`, `mockResolvedValue`, and `mockImplementation`?

**A:** `mockReturnValue(val)` makes the mock function synchronously return `val` every time it's called — for non-async functions. `mockResolvedValue(val)` makes the mock return `Promise.resolve(val)` — it's shorthand for `mockImplementation(() => Promise.resolve(val))` and is used for mocking async functions. `mockImplementation(fn)` is the most flexible — you provide an actual function that runs when the mock is called, giving you full control over arguments, side effects, and dynamic return values. Use `mockReturnValue` for simple constants, `mockResolvedValue` for async stubs, and `mockImplementation` when the return value depends on the input arguments or when you need to throw.

---

## C — Common Pitfalls + Fix

### ❌ Not resetting mocks between tests — stale call counts

```typescript
// ❌ mockFn.calls accumulates across tests
const mockFn = vi.fn()

it('test 1 calls fn', () => {
  service.run(mockFn)
  expect(mockFn).toHaveBeenCalledTimes(1)  // ✅ passes
})

it('test 2 calls fn once', () => {
  service.run(mockFn)
  expect(mockFn).toHaveBeenCalledTimes(1)  // ❌ fails — count is 2 from both tests
})
```

**Fix:** Clear mocks in `beforeEach`:

```typescript
// ✅
beforeEach(() => { vi.clearAllMocks() })
// Or per-mock: mockFn.mockClear()
```

---

## K — Coding Challenge + Solution

### Challenge

Write a `NotificationService.send(userId, message)` that: looks up a user via `userRepo.findById(userId)`, throws `UserNotFoundError` if null, sends a push notification via `pushClient.send(deviceToken, message)`. Write tests using `vi.fn()`: (1) successful send with correct arguments; (2) throws when user not found; (3) does not call `pushClient` when user is not found; (4) sends to user's deviceToken.

### Solution

```typescript
// src/services/notification.service.ts
export class UserNotFoundError extends Error {
  constructor(id: string) { super(`User not found: ${id}`) }
}

export class NotificationService {
  constructor(
    private userRepo:   { findById: (id: string) => Promise<{ id: string; deviceToken: string } | null> },
    private pushClient: { send: (token: string, message: string) => Promise<void> }
  ) {}

  async send(userId: string, message: string): Promise<void> {
    const user = await this.userRepo.findById(userId)
    if (!user) throw new UserNotFoundError(userId)
    await this.pushClient.send(user.deviceToken, message)
  }
}

// src/services/notification.service.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NotificationService, UserNotFoundError } from './notification.service'

describe('NotificationService.send', () => {
  const fakeUser = { id: 'u1', deviceToken: 'tok-abc123' }

  let mockFindById:   ReturnType<typeof vi.fn>
  let mockPushSend:   ReturnType<typeof vi.fn>
  let service:        NotificationService

  beforeEach(() => {
    mockFindById = vi.fn().mockResolvedValue(fakeUser)
    mockPushSend = vi.fn().mockResolvedValue(undefined)
    service      = new NotificationService(
      { findById: mockFindById },
      { send:     mockPushSend }
    )
  })

  it('sends a push notification with correct token and message', async () => {
    await service.send('u1', 'Hello!')

    expect(mockPushSend).toHaveBeenCalledOnce()
    expect(mockPushSend).toHaveBeenCalledWith('tok-abc123', 'Hello!')
  })

  it('looks up the user by userId', async () => {
    await service.send('u1', 'Hi')
    expect(mockFindById).toHaveBeenCalledWith('u1')
  })

  it('throws UserNotFoundError when user does not exist', async () => {
    mockFindById.mockResolvedValue(null)
    await expect(service.send('u1', 'Hi')).rejects.toThrow(UserNotFoundError)
    await expect(service.send('u1', 'Hi')).rejects.toThrow('User not found: u1')
  })

  it('does not send push when user is not found', async () => {
    mockFindById.mockResolvedValue(null)
    try { await service.send('u1', 'Hi') } catch { /* expected */ }
    expect(mockPushSend).not.toHaveBeenCalled()
  })
})
```

---

---
