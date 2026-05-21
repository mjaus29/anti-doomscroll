# 5 — throw / catch / rethrow Patterns

---

## T — TL;DR

`throw` can throw anything — always throw `Error` instances. `catch` should handle what it can and **rethrow** the rest. Rethrowing preserves the original error and prevents silently swallowing unexpected errors. Use `error.cause` to wrap and add context. Know the difference between handling an error and catching it just to log.

---

## K — Key Concepts

```javascript
// ── throw ──────────────────────────────────────────────────────────────────
throw new Error('Something failed')            // ✅ always an Error
throw new ValidationError('email invalid')     // ✅ custom class
throw new Error('DB failed', { cause: pgErr }) // ✅ with cause

// ❌ Avoid throwing non-Error values
throw 'something went wrong'    // no stack trace ❌
throw { message: 'failed' }     // no stack, no instanceof ❌
throw null                      // catch gets null ❌
```

```javascript
// ── catch: handle what you can, rethrow the rest ──────────────────────────
async function saveUser(userData) {
  try {
    return await db.users.create(userData)
  } catch (err) {
    // Handle what we know about
    if (err.code === '23505') {   // PostgreSQL unique violation
      throw new ValidationError('Email already in use', { email: 'taken' })
    }
    if (err.code === 'ECONNREFUSED') {
      throw new DatabaseError('Database unavailable', err)  // wrap with cause ✅
    }
    throw err   // ✅ rethrow unknown errors — don't swallow
  }
}
```

```javascript
// ── Rethrow patterns ──────────────────────────────────────────────────────
// Pattern 1: Rethrow unchanged
try {
  await riskyOperation()
} catch (err) {
  logger.error(err)   // log it
  throw err           // ✅ rethrow unchanged so caller can handle
}

// Pattern 2: Wrap and rethrow (add context)
async function processPayment(orderId) {
  try {
    return await paymentGateway.charge(orderId)
  } catch (err) {
    // Add context about what we were doing
    throw new PaymentError(
      `Payment failed for order ${orderId}: ${err.message}`,
      { cause: err }   // ✅ preserve original error
    )
  }
}

// Pattern 3: Catch specific, rethrow generic
try {
  await doWork()
} catch (err) {
  if (err instanceof NetworkError) {
    return retry()    // handle and recover ✅
  }
  throw err           // rethrow everything else ✅
}
```

```javascript
// ── Anti-patterns ──────────────────────────────────────────────────────────
// ❌ Empty catch — silently swallows errors
try { await doWork() } catch (e) {}

// ❌ catch-all with no rethrow — hides bugs
try {
  result = calculate()
} catch (e) {
  result = 0   // what if calculate() had a null ref bug? now it's hidden ❌
}

// ❌ Logging and swallowing
try {
  await sendEmail()
} catch (e) {
  console.error(e)   // logged but not rethrown — caller thinks it succeeded ❌
}

// ✅ Log AND rethrow
try {
  await sendEmail()
} catch (e) {
  logger.error('Email send failed', { error: e })
  throw e   // ✅ caller knows it failed
}
```

```javascript
// ── finally for cleanup regardless of path ────────────────────────────────
async function withLock(key, fn) {
  await lock.acquire(key)
  try {
    return await fn()
  } finally {
    await lock.release(key)   // ALWAYS releases, even if fn throws ✅
  }
}

// ── Error boundary for HTTP handlers ─────────────────────────────────────
function asyncHandler(fn) {
  return async (req, res, next) => {
    try {
      await fn(req, res)
    } catch (err) {
      next(err)   // pass to Express error handler ✅
    }
  }
}
app.get('/users/:id', asyncHandler(async (req, res) => {
  const user = await findUser(req.params.id)   // throws NotFoundError
  res.json(user)
}))
```

---

## W — Why It Matters

- Swallowing errors is the #1 cause of mysterious production bugs — the operation failed but the code kept running with bad state. Always either handle the error meaningfully or rethrow.
- `finally` for resource cleanup is safer than cleanup in both `try` and `catch` — if `try` throws unexpectedly, `catch` code may not run, but `finally` always does.
- Error wrapping with `cause` builds a traceable chain — when a DB error surfaces as an HTTP 500, the `cause` chain shows: `HttpError → DatabaseError → PostgresError` with each original stack trace preserved.

---

## I — Interview Q&A

### Q: When should you catch an error and when should you rethrow it?

**A:** Catch an error when you can meaningfully recover — retry the operation, return a default, translate to a domain error, or clean up resources. Rethrow when: (1) the error is unexpected and you don't know what to do with it, (2) you only need to log or add context before propagating, (3) only a higher-level handler knows the right response. Never catch just to suppress — an empty `catch` block hides bugs. The pattern: catch specific expected errors, handle them, rethrow everything else. If you log and don't rethrow, you're saying "this error is handled" — make sure that's true.

---

## C — Common Pitfalls + Fix

### ❌ Catching in `finally` by returning — masks the original error

```javascript
// ❌ returning in finally overrides the thrown error
async function example() {
  try {
    throw new Error('real error')
  } finally {
    return 'cleanup'   // ❌ original error is silently swallowed!
  }
}
await example()   // returns 'cleanup' — no error visible ❌

// ✅ Only do cleanup in finally, no return
async function example2() {
  try {
    throw new Error('real error')
  } finally {
    cleanupResources()   // no return ✅
  }
}
// Now the error propagates correctly
```

---

## K — Coding Challenge + Solution

### Challenge

Write `withRetry(fn, { retries, delay, shouldRetry })` that retries `fn` up to `retries` times with `delay` ms between attempts. `shouldRetry(err)` decides if the error is retryable. Preserve the original error as `cause` on final failure.

### Solution

```javascript
async function withRetry(fn, { retries = 3, delay = 500, shouldRetry = () => true } = {}) {
  let lastErr
  for (let attempt = 1; attempt <= retries + 1; attempt++) {
    try {
      return await fn(attempt)
    } catch (err) {
      lastErr = err
      if (attempt > retries || !shouldRetry(err)) {
        throw new Error(
          `Failed after ${attempt} attempt(s): ${err.message}`,
          { cause: err }
        )
      }
      await new Promise(r => setTimeout(r, delay * attempt))  // backoff
    }
  }
}

let calls = 0
const unstable = async () => {
  calls++
  if (calls < 3) throw Object.assign(new Error('Network timeout'), { code: 'ETIMEDOUT' })
  return 'success'
}

const result = await withRetry(unstable, {
  retries: 3,
  delay: 100,
  shouldRetry: err => err.code === 'ETIMEDOUT',
})
console.log(result)   // 'success' on 3rd attempt
console.log(calls)    // 3
```

---

---
