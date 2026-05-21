# 7 — Spies — vi.spyOn()

---

## T — TL;DR

`vi.spyOn(object, method)` wraps an existing method with a spy — it records calls while still running the original implementation by default. Use it to verify a real method was called with specific arguments without replacing its behaviour. Override the implementation with `.mockImplementation()` or `.mockReturnValue()` when needed. Always `vi.restoreAllMocks()` in `afterEach` to undo the wrapping.

---

## K — Key Concepts

```typescript
import { vi, expect } from 'vitest'

// ── Basic spy — calls original, records usage ─────────────────────────────
const calculator = {
  add: (a: number, b: number) => a + b
}

const spy = vi.spyOn(calculator, 'add')

const result = calculator.add(2, 3)
expect(result).toBe(5)               // original still runs ✅
expect(spy).toHaveBeenCalledWith(2, 3)
expect(spy).toHaveBeenCalledOnce()
```

```typescript
// ── Spy on a class method ─────────────────────────────────────────────────
class Logger {
  log(message: string) {
    console.log(`[LOG] ${message}`)
  }
}

const logger  = new Logger()
const logSpy  = vi.spyOn(logger, 'log')

logger.log('test message')

expect(logSpy).toHaveBeenCalledWith('test message')
expect(logSpy).toHaveBeenCalledTimes(1)

// Restore after test
vi.restoreAllMocks()
// logger.log is back to original implementation ✅
```

```typescript
// ── Spy and override implementation ──────────────────────────────────────
class EmailService {
  async sendWelcome(email: string): Promise<void> {
    // real implementation sends actual email
    await externalMailer.send({ to: email, subject: 'Welcome' })
  }
}

const emailService = new EmailService()

// Override — don't send a real email in tests
const sendSpy = vi.spyOn(emailService, 'sendWelcome')
  .mockResolvedValue(undefined)

await emailService.sendWelcome('test@example.com')

expect(sendSpy).toHaveBeenCalledWith('test@example.com')
// No real email sent ✅
```

```typescript
// ── Spy on console methods ────────────────────────────────────────────────
it('logs the error', () => {
  const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
  // mockImplementation(() => {}) suppresses console.error output in test

  someFunction()   // internally calls console.error('Something failed')

  expect(consoleSpy).toHaveBeenCalledWith(
    expect.stringContaining('Something failed')
  )

  consoleSpy.mockRestore()  // restore console.error
})
```

```typescript
// ── Spy on module exports ─────────────────────────────────────────────────
import * as utils from './utils'

it('calls formatDate', () => {
  const spy = vi.spyOn(utils, 'formatDate').mockReturnValue('June 15, 2025')

  const result = utils.formatDate(new Date())
  expect(result).toBe('June 15, 2025')
  expect(spy).toHaveBeenCalledOnce()

  spy.mockRestore()
})
```

```typescript
// ── vi.fn() vs vi.spyOn() — when to use each ─────────────────────────────

// vi.fn()
// Use: you're providing a dependency via injection
//      you want a completely fresh mock with no original behaviour
// Example: mockEmailClient = { send: vi.fn() }

// vi.spyOn()
// Use: you need to observe calls to an existing object/module method
//      you want to test the real implementation in most cases
//      you need to temporarily override one method on a real object
// Example: spy on console.error to verify error logging
//          spy on a service method to verify it was called by an orchestrator
```

---

## W — Why It Matters

- `vi.spyOn` is the right tool when the real implementation is correct and you only need to verify it was called — spying on a logging method, observing a cache read, or confirming an event emitter fires. Using `vi.fn()` would require duplicating the implementation.
- Spying on `console.error` / `console.warn` lets you test that your error handling code calls logging correctly, while suppressing the output so the test terminal stays clean. Without the `mockImplementation(() => {})`, the error message clutters every test run.
- `vi.restoreAllMocks()` is mandatory after `vi.spyOn` — unlike `vi.fn()` (which is a fresh function), `vi.spyOn` modifies the original object. Without restore, the spy persists on the object across tests, accumulating call counts and potentially breaking other tests.

---

## I — Interview Q&A

### Q: What is the difference between `vi.fn()` and `vi.spyOn()`, and when would you choose one over the other?

**A:** `vi.fn()` creates an entirely new mock function with no real implementation — you use it when you're constructing a test double from scratch, typically as an injected dependency. `vi.spyOn(object, method)` wraps an existing method on an object with a recording layer — the original implementation still runs by default, and you can optionally override it. Choose `vi.fn()` when providing dependencies via constructor injection or factory functions — you own the whole mock. Choose `vi.spyOn()` when you need to observe or temporarily override a method on an existing object you don't fully control — a module export, a class instance method, `console`, `Math`, `Date`, or a partially-real dependency where you want most methods to be real but need to control one. Always restore spies in `afterEach` with `vi.restoreAllMocks()`.

---

## C — Common Pitfalls + Fix

### ❌ Not restoring spies — spy persists across tests

```typescript
// ❌ consoleSpy wraps console.error for the rest of the suite
it('test with spy', () => {
  const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
  runCode()
  expect(consoleSpy).toHaveBeenCalled()
  // No restore — next test's console.error calls add to this spy ❌
})
```

**Fix:** Use `afterEach` restore or `mockRestore()` at end of test:

```typescript
// ✅ Option 1: afterEach
afterEach(() => { vi.restoreAllMocks() })

// ✅ Option 2: explicit restore at test end
it('test with spy', () => {
  const spy = vi.spyOn(console, 'error').mockImplementation(() => {})
  runCode()
  expect(spy).toHaveBeenCalled()
  spy.mockRestore()   // restore console.error immediately ✅
})
```

---

## K — Coding Challenge + Solution

### Challenge

Given an `AuditService` with `log(event, data)` (real implementation writes to DB), and an `OrderService.create(data)` that internally calls `auditService.log('order_created', data)`. Write tests using `vi.spyOn`: (1) `log` is called with correct event on order creation; (2) `log` is called once; (3) `create` still returns the created order (spy doesn't break real logic). Use `beforeEach`/`afterEach` correctly.

### Solution

```typescript
// src/services/audit.service.ts
export class AuditService {
  async log(event: string, data: unknown): Promise<void> {
    // writes to DB in production
  }
}

// src/services/order.service.ts
export class OrderService {
  constructor(private audit: AuditService) {}

  async create(data: { product: string; total: number }) {
    const order = { id: 'ord-1', ...data, createdAt: new Date() }
    await this.audit.log('order_created', order)
    return order
  }
}

// src/services/order.service.test.ts
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { AuditService }                                     from './audit.service'
import { OrderService }                                     from './order.service'

describe('OrderService.create', () => {
  let auditService: AuditService
  let orderService: OrderService
  let logSpy:       ReturnType<typeof vi.spyOn>

  beforeEach(() => {
    auditService = new AuditService()
    orderService = new OrderService(auditService)

    // Spy on real method — no-op the real DB write in tests
    logSpy = vi.spyOn(auditService, 'log').mockResolvedValue(undefined)
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('logs order_created event after creating an order', async () => {
    await orderService.create({ product: 'Widget', total: 999 })
    expect(logSpy).toHaveBeenCalledWith('order_created', expect.objectContaining({
      product: 'Widget',
      total:   999,
    }))
  })

  it('logs exactly once per create call', async () => {
    await orderService.create({ product: 'Widget', total: 999 })
    expect(logSpy).toHaveBeenCalledOnce()
  })

  it('returns the created order with id and timestamp', async () => {
    const order = await orderService.create({ product: 'Widget', total: 999 })
    expect(order).toMatchObject({ id: 'ord-1', product: 'Widget', total: 999 })
    expect(order.createdAt).toBeInstanceOf(Date)
  })
})
```

---

---
