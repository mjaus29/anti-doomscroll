# 4 — Promises — resolve/reject, then/catch/finally

---

## T — TL;DR

A `Promise` is an object representing an async operation's eventual success or failure. States: `pending → fulfilled` (resolve) or `pending → rejected` (reject). `.then(onFulfilled)` chains success. `.catch(onRejected)` handles errors. `.finally(fn)` always runs. Chains are flat — no nesting. Errors propagate automatically to the nearest `.catch`.

---

## K — Key Concepts

```javascript
// ── Creating a Promise ────────────────────────────────────────────────────
const p = new Promise((resolve, reject) => {
  // Executor runs synchronously
  const success = true
  if (success) resolve('data')    // fulfil with value
  else reject(new Error('failed'))  // reject with reason
  // Only first call matters — subsequent resolve/reject ignored
})

// ── Promise.resolve / Promise.reject ──────────────────────────────────────
Promise.resolve(42)            // already-fulfilled promise
Promise.reject(new Error('x')) // already-rejected promise
Promise.resolve(anotherPromise) // unwraps/adopts the other promise's state
```

```javascript
// ── then / catch / finally ────────────────────────────────────────────────
fetchUser(1)
  .then(user => fetchPosts(user.id))   // return value becomes next .then input
  .then(posts => posts.filter(p => p.published))
  .then(posts => console.log(posts))
  .catch(err  => console.error(err))   // catches ANY error in the chain
  .finally(() => setLoading(false))    // runs regardless of success/failure

// .then can take two args: .then(onFulfilled, onRejected)
// .catch(fn) is shorthand for .then(undefined, fn)
// .finally(fn) receives no value — used for cleanup only

// ── Error propagation ──────────────────────────────────────────────────────
fetchUser(1)
  .then(user => { throw new Error('oops') })   // thrown error propagates
  .then(data => console.log(data))             // SKIPPED — error in chain
  .catch(err => console.error(err.message))    // 'oops' — caught here ✅

// Returning from .catch recovers the chain
fetchUser(1)
  .then(() => { throw new Error('fail') })
  .catch(err => {
    console.error(err.message)   // handle error
    return []                    // recover with default value ✅
  })
  .then(data => console.log(data))  // runs with [] ✅
```

```javascript
// ── Promise chaining vs nesting ────────────────────────────────────────────
// ❌ Nesting — same pyramid problem as callbacks
fetchUser(1).then(user => {
  fetchPosts(user.id).then(posts => {   // nested ❌
    console.log(posts)
  })
})

// ✅ Chaining — return the promise from .then
fetchUser(1)
  .then(user  => fetchPosts(user.id))   // return → chain ✅
  .then(posts => console.log(posts))
```

```javascript
// ── Promisify pattern for manual async ────────────────────────────────────
function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms))
}
await delay(1000)   // pause for 1 second

function fetchWithTimeout(url, ms) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('Timeout')), ms)
    fetch(url)
      .then(res => { clearTimeout(timer); resolve(res) })
      .catch(err => { clearTimeout(timer); reject(err) })
  })
}
```

---

## W — Why It Matters

- Returning a Promise from `.then` is what creates a flat chain — if you forget to return, the next `.then` receives `undefined` and the chain is broken. This is the most common Promise bug.
- `.catch` at the end of a chain catches errors from every `.then` before it — one error handler for the whole chain instead of per-step callbacks.
- `.finally` for cleanup (hiding spinners, releasing locks) runs even if the chain was rejected — the equivalent of `try/catch/finally` in async code.

---

## I — Interview Q&A

### Q: What are the three states of a Promise and how do you handle each?

**A:** (1) **Pending** — initial state, async operation in progress. No handler needed. (2) **Fulfilled** — resolved with a value. Handle with `.then(value => ...)`. (3) **Rejected** — rejected with a reason (usually an `Error`). Handle with `.catch(err => ...)`. Transitions are one-way — fulfilled and rejected are final. `.then(onFulfilled, onRejected)` handles both; `.catch` is `.then(null, fn)`. `.finally` runs regardless of state.

---

## C — Common Pitfalls + Fix

### ❌ Forgetting to return from `.then` — breaks the chain

```javascript
// ❌ Missing return — next .then gets undefined
fetchUser(1)
  .then(user => {
    fetchPosts(user.id)   // no return! ❌ — fetchPosts promise is lost
  })
  .then(posts => console.log(posts))  // posts = undefined

// ✅ Always return async operations from .then
fetchUser(1)
  .then(user => fetchPosts(user.id))  // return ✅
  .then(posts => console.log(posts))
```

---

## K — Coding Challenge + Solution

### Challenge

Write `retryPromise(fn, retries, delayMs)` — retries a promise-returning function up to `retries` times with a delay between attempts. Rejects with the last error if all attempts fail.

### Solution

```javascript
function retryPromise(fn, retries = 3, delayMs = 500) {
  return fn().catch(err => {
    if (retries <= 0) return Promise.reject(err)
    return new Promise(resolve => setTimeout(resolve, delayMs))
      .then(() => retryPromise(fn, retries - 1, delayMs))
  })
}

let attempt = 0
const unreliable = () => new Promise((res, rej) => {
  attempt++
  attempt < 3 ? rej(new Error(`Attempt ${attempt} failed`)) : res('success')
})

retryPromise(unreliable, 3, 100)
  .then(result => console.log(result))    // 'success' on 3rd attempt
  .catch(err   => console.error(err))
```

---

---
