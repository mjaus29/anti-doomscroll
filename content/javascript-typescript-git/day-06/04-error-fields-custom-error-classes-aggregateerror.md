# 4 — Error Fields, Custom Error Classes, AggregateError

---

## T — TL;DR

Every `Error` has `message`, `name`, `stack`, and (ES2022) `cause`. **Custom error classes** extend `Error` to add context, enable `instanceof` checks, and communicate error categories. **`AggregateError`** holds multiple errors (used by `Promise.any`). Always extend `Error` cleanly — set `name`, pass `cause`, maintain `instanceof`.

---

## K — Key Concepts

```javascript
// ── Built-in Error fields ──────────────────────────────────────────────────
const err = new Error('Something went wrong')
err.message   // 'Something went wrong'
err.name      // 'Error'
err.stack     // 'Error: Something wrong\n    at ...' (call stack as string)

// ES2022: cause — chain errors without losing original
const cause = new Error('DB connection refused')
const appErr = new Error('Failed to load users', { cause })
appErr.cause          // Error: DB connection refused ✅
appErr.cause.message  // 'DB connection refused'
```

```javascript
// ── Custom error classes ───────────────────────────────────────────────────
class AppError extends Error {
  constructor(message, options = {}) {
    super(message, { cause: options.cause })
    this.name    = this.constructor.name   // 'AppError' (or subclass name)
    this.code    = options.code   ?? 'UNKNOWN_ERROR'
    this.status  = options.status ?? 500
    this.context = options.context ?? {}

    // Fix: ensure instanceof works in transpiled environments
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, this.constructor)
    }
  }

  toJSON() {
    return { name: this.name, message: this.message, code: this.code, status: this.status }
  }
}

// Domain-specific error hierarchy
class ValidationError extends AppError {
  constructor(message, fields = {}) {
    super(message, { code: 'VALIDATION_ERROR', status: 400 })
    this.fields = fields
  }
}

class NotFoundError extends AppError {
  constructor(resource, id) {
    super(`${resource} with id ${id} not found`, { code: 'NOT_FOUND', status: 404 })
    this.resource = resource
    this.id       = id
  }
}

class UnauthorizedError extends AppError {
  constructor(message = 'Unauthorized') {
    super(message, { code: 'UNAUTHORIZED', status: 401 })
  }
}

class DatabaseError extends AppError {
  constructor(message, cause) {
    super(message, { code: 'DB_ERROR', status: 500, cause })
  }
}
```

```javascript
// ── Using custom errors ────────────────────────────────────────────────────
function findUser(id) {
  if (!id) throw new ValidationError('id is required', { id: 'required' })
  if (id < 0) throw new ValidationError('id must be positive', { id: 'must be > 0' })
  throw new NotFoundError('User', id)
}

try {
  findUser(-1)
} catch (err) {
  if (err instanceof ValidationError) {
    console.log('Bad input:', err.fields)   // { id: 'must be > 0' }
  } else if (err instanceof NotFoundError) {
    console.log(`${err.resource} ${err.id} missing`)
  } else if (err instanceof AppError) {
    console.log('App error:', err.code)
  } else {
    throw err   // unexpected — rethrow
  }
}

// ── AggregateError ────────────────────────────────────────────────────────
const agg = new AggregateError(
  [new Error('task 1 failed'), new Error('task 2 failed')],
  'Multiple operations failed'
)
agg.errors   // [Error: task 1 failed, Error: task 2 failed]
agg.message  // 'Multiple operations failed'
agg instanceof Error  // true

// Thrown by Promise.any when all promises reject:
try {
  await Promise.any([Promise.reject('a'), Promise.reject('b')])
} catch (err) {
  err instanceof AggregateError   // true
  err.errors                      // ['a', 'b']
}
```

---

## W — Why It Matters

- `instanceof` checks on custom errors are only reliable if the `name` field is set correctly and the class properly extends `Error` — without `this.name = this.constructor.name`, `err.name` is always `'Error'` and stack traces are harder to read.
- `error.cause` (ES2022) is the standardised way to chain errors — wrap a low-level DB error in an application-level error without losing the original. Before `cause`, developers used `err.original` or `err.inner` inconsistently.
- A typed error hierarchy enables granular `catch` logic — HTTP handlers can inspect `err.status`, loggers can check `err.code`, and monitoring can group errors by class. Throwing plain `Error('something')` loses all this structure.

---

## I — Interview Q&A

### Q: Why should you extend `Error` instead of throwing plain objects or strings?

**A:** Extending `Error` gives you: (1) `stack` — the call stack at throw time, essential for debugging. Throwing `{message: 'fail'}` has no stack. (2) `instanceof` — type-safe error handling in `catch` blocks. (3) `message`, `name`, `cause` — standardised fields that tools, loggers, and monitoring systems understand. (4) Integration — Express, Fastify, and testing frameworks all check `instanceof Error` and read `.message`. Throwing strings or plain objects forces every consumer to guess the error shape. The additional effort to define a custom class is trivial and the benefits compound across a codebase.

---

## C — Common Pitfalls + Fix

### ❌ Forgetting `this.name` in a custom error — all errors look the same

```javascript
// ❌ name is always 'Error' — can't tell error types apart in logs
class PaymentError extends Error {
  constructor(msg) { super(msg) }
  // this.name is still 'Error' ❌
}
new PaymentError('declined').name   // 'Error' ❌

// ✅ Set name explicitly
class PaymentError2 extends Error {
  constructor(msg) {
    super(msg)
    this.name = 'PaymentError'   // or: this.constructor.name ✅
  }
}
new PaymentError2('declined').name   // 'PaymentError' ✅
```

---

## K — Coding Challenge + Solution

### Challenge

Build an error hierarchy for an API: `ApiError(message, status)` base, `ValidationError(fields)` (400), `NotFoundError(resource)` (404), `RateLimitError(retryAfter)` (429). Write a `handleApiError(err, res)` function that sends the appropriate HTTP response.

### Solution

```javascript
class ApiError extends Error {
  constructor(message, status = 500, code) {
    super(message)
    this.name   = this.constructor.name
    this.status = status
    this.code   = code ?? this.name.toUpperCase().replace('ERROR', '_ERROR')
    if (Error.captureStackTrace) Error.captureStackTrace(this, this.constructor)
  }
  toResponse() { return { error: { code: this.code, message: this.message } } }
}

class ValidationError extends ApiError {
  constructor(fields) {
    super('Validation failed', 400)
    this.fields = fields
  }
  toResponse() { return { error: { code: this.code, message: this.message, fields: this.fields } } }
}

class NotFoundError extends ApiError {
  constructor(resource) { super(`${resource} not found`, 404) }
}

class RateLimitError extends ApiError {
  constructor(retryAfter) {
    super('Too many requests', 429)
    this.retryAfter = retryAfter
  }
  toResponse() {
    return { error: { code: this.code, message: this.message, retryAfter: this.retryAfter } }
  }
}

function handleApiError(err, res) {
  if (err instanceof ApiError) {
    if (err instanceof RateLimitError) {
      res.setHeader('Retry-After', err.retryAfter)
    }
    return res.status(err.status).json(err.toResponse())
  }
  console.error('Unexpected error:', err)
  res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Internal server error' } })
}
```

---

---
