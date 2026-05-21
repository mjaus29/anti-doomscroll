# 6 — async/await — try/catch/finally, Unhandled Rejections

---

## T — TL;DR

`async` functions always return a Promise. `await` pauses the async function (not the thread) until the Promise settles. `try/catch/finally` works exactly like synchronous error handling. Unhandled rejections (no `.catch` or `try/catch`) crash Node.js and emit warnings in browsers — always handle them.

---

## K — Key Concepts

```javascript
// ── async function always returns a Promise ────────────────────────────────
async function getUser(id) {
  return { id, name: 'Mark' }   // auto-wrapped in Promise.resolve()
}
getUser(1)   // Promise<{ id:1, name:'Mark' }>
getUser(1).then(u => console.log(u))   // { id:1, name:'Mark' }

// Throwing inside async → rejected Promise
async function fail() {
  throw new Error('async error')
}
fail().catch(err => console.error(err.message))   // 'async error'
```

```javascript
// ── await — pause until Promise settles ───────────────────────────────────
async function loadData() {
  const user  = await fetchUser(1)       // pauses here until fetchUser resolves
  const posts = await fetchPosts(user.id) // then pauses here
  return { user, posts }
}
// Equivalent to:
// fetchUser(1).then(user => fetchPosts(user.id)).then(posts => ({ user, posts }))
```

```javascript
// ── try/catch/finally for error handling ──────────────────────────────────
async function processOrder(orderId) {
  try {
    const order    = await fetchOrder(orderId)
    const payment  = await processPayment(order)
    const shipment = await scheduleShipment(payment)
    return shipment
  } catch (err) {
    // Catches rejection from ANY await in the try block
    console.error('Order processing failed:', err.message)
    await logError(err, orderId)   // can await in catch ✅
    throw err                       // re-throw to propagate ✅
  } finally {
    await releaseOrderLock(orderId)  // always runs ✅
    // If finally returns a value, it overrides try/catch return ⚠️
  }
}
```

```javascript
// ── Unhandled promise rejections ──────────────────────────────────────────
// ❌ No .catch and no try/catch — rejection is unhandled
async function broken() { throw new Error('unhandled') }
broken()   // UnhandledPromiseRejection — crashes Node.js in newer versions!

// ✅ Always handle rejections
broken().catch(console.error)

// Global handler for truly unexpected rejections
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled rejection:', reason)
  process.exit(1)   // fail loudly in production ✅
})

// Browser equivalent
window.addEventListener('unhandledrejection', event => {
  console.error('Unhandled:', event.reason)
  event.preventDefault()  // suppress default console error
})
```

```javascript
// ── async IIFE for top-level await without module ─────────────────────────
// Without "type": "module" in package.json:
;(async () => {
  const data = await fetchSomething()
  console.log(data)
})()

// With "type": "module" (Node.js 14+):
const data = await fetchSomething()   // top-level await ✅
```

---

## W — Why It Matters

- `async/await` reads like synchronous code but is non-blocking — this is the biggest readability win in modern JavaScript. Complex multi-step async flows become straightforward to read and debug.
- Unhandled rejections crash Node.js processes in production — every async function call must either be awaited inside a try/catch, have a `.catch()`, or be explicitly fire-and-forget with a logged `.catch`.
- `finally` with `await` for resource cleanup (releasing locks, closing connections, removing loading states) is more reliable than putting cleanup in both `try` and `catch` — it runs on any path.

---

## I — Interview Q&A

### Q: What does `async` do to a function's return value?

**A:** An `async` function always returns a Promise, regardless of what the `return` statement says. If the function returns a non-Promise value, it's wrapped in `Promise.resolve(value)`. If the function throws, the Promise is rejected with the thrown error. If it returns a Promise, that Promise is adopted (the async function's Promise follows the returned Promise). This means you can `await` an async function and get the returned value directly, or chain `.then()` on it — both work.

---

## C — Common Pitfalls + Fix

### ❌ Returning in `finally` — overrides the try block's return value

```javascript
// ❌ finally return value overrides try's return
async function getUser() {
  try {
    return await fetchUser()   // would return the user
  } finally {
    return null   // ❌ overrides! function always returns null
  }
}

// ✅ Don't return values from finally — only use for cleanup
async function getUser2() {
  try {
    return await fetchUser()
  } finally {
    cleanup()   // no return statement ✅
  }
}
```

---

## K — Coding Challenge + Solution

### Challenge

Write `withErrorBoundary(asyncFn, fallback)` — a wrapper that catches any error from an async function and returns `[null, error]` on failure or `[result, null]` on success (Go-style error handling). Use it to safely call three dependent APIs.

### Solution

```javascript
async function withErrorBoundary(asyncFn, ...args) {
  try {
    const result = await asyncFn(...args)
    return [result, null]
  } catch (err) {
    return [null, err]
  }
}

// Usage
async function loadUserDashboard(userId) {
  const [user, userErr] = await withErrorBoundary(fetchUser, userId)
  if (userErr) return { error: 'Could not load user' }

  const [posts, postsErr] = await withErrorBoundary(fetchPosts, user.id)
  const [stats, _] = await withErrorBoundary(fetchStats, user.id)

  return {
    user,
    posts:  postsErr ? []   : posts,
    stats:  stats    ?? {},
  }
}
```

---

---
