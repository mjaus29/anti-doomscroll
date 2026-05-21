
# 📅 Day 5 — Async JavaScript & Web APIs

> **Goal:** Master the JavaScript async model from the event loop up — callbacks, Promises, async/await, fetch, and browser storage APIs.
> **Format:** Each subtopic = 5–15 min. Do one. Stop. Come back.
> **Stack:** Node.js 22 · Browser · TypeScript 6 (context)

---

## 📋 Day 5 Subtopic Overview

| # | Subtopic | Time |
|---|----------|------|
| 1 | Async Mental Model — Event Loop, Call Stack, Web APIs, Queues | 12 min |
| 2 | Macrotasks vs Microtasks — Execution Order | 10 min |
| 3 | Callbacks and Callback Hell | 8 min |
| 4 | Promises — resolve/reject, then/catch/finally | 12 min |
| 5 | Promise Combinators — all, allSettled, race, any, AggregateError | 10 min |
| 6 | async/await — try/catch/finally, unhandled rejections | 12 min |
| 7 | Sequential vs Parallel Execution, await in forEach pitfall | 10 min |
| 8 | Timers, async iteration, for await...of, async generators | 12 min |
| 9 | fetch — methods, Request/Response, headers, FormData, AbortController | 12 min |
| 10 | URL, URLSearchParams, localStorage, sessionStorage, cookies | 12 min |

---

---

# 1 — Async Mental Model — Event Loop, Call Stack, Web APIs, Queues

---

## T — TL;DR

JavaScript is **single-threaded** — one call stack, one thing at a time. The **event loop** enables async by offloading work to Web APIs (browser) or libuv (Node.js), queuing callbacks when complete, and draining the call stack before picking up the next task. Understanding this model predicts exactly when any async code runs.

---

## K — Key Concepts

```
── The four components ──────────────────────────────────────────────────────

Call Stack       → LIFO stack of executing function frames
                   synchronous code runs here — one frame at a time

Web APIs / libuv → setTimeout, fetch, fs.readFile, setInterval, DOM events
                   Browser/Node hands these off to C++ runtime (not JS)
                   JS continues running while these work in the background

Callback Queue   → (macrotask queue) completed Web API callbacks wait here
                   setTimeout/setInterval callbacks, I/O callbacks, UI events

Microtask Queue  → Promise .then/.catch, queueMicrotask, MutationObserver
                   higher priority — drained COMPLETELY before next macrotask

Event Loop       → checks: is call stack empty?
                   yes → drain ALL microtasks → pick ONE macrotask → repeat
```

```javascript
// ── Execution order visualised ─────────────────────────────────────────────
console.log('1 — sync start')

setTimeout(() => console.log('4 — macrotask (setTimeout 0ms)'), 0)

Promise.resolve().then(() => console.log('3 — microtask (Promise)'))

console.log('2 — sync end')

// Output:
// 1 — sync start
// 2 — sync end
// 3 — microtask (Promise)    ← microtask queue drained before macrotask
// 4 — macrotask (setTimeout 0ms)
```

```javascript
// ── Why setTimeout(fn, 0) isn't truly "0ms" ──────────────────────────────
// The callback is placed in the macrotask queue
// It runs AFTER: remaining sync code + ALL microtasks
// Minimum delay is ~4ms in browsers (spec) or ~1ms in Node.js

// ── Blocking the event loop ───────────────────────────────────────────────
// While sync code runs, NOTHING else runs (no UI updates, no callbacks)
function blockFor(ms) {
  const end = Date.now() + ms
  while (Date.now() < end) {}   // busy-wait — blocks everything ❌
}
blockFor(5000)   // freezes browser for 5 seconds

// ✅ Never block with long sync operations — use async, workers, or chunking
```

```
── Event loop tick (one cycle) ──────────────────────────────────────────────

1. Execute all synchronous code (call stack empties)
2. Drain microtask queue (ALL of them, including newly added microtasks)
3. Pick ONE macrotask from the callback queue and execute it
4. Drain microtask queue again (completely)
5. Render (browser only — repaints happen between macrotasks)
6. Go to step 3
```

---

## W — Why It Matters

- Every `await`, `.then`, and `setTimeout` question in interviews comes down to this model — once you see the four components clearly, async execution order becomes predictable.
- Long synchronous operations (CPU-intensive loops, large JSON parsing) block the entire event loop — no callbacks fire, no UI updates, no incoming HTTP responses processed. Break them up with `setTimeout(chunk, 0)` or move to a Worker.
- Node.js's I/O performance is based on this model — a single Node.js process can handle thousands of concurrent HTTP requests because it never blocks waiting for I/O; it offloads to libuv and continues processing.

---

## I — Interview Q&A

### Q: Explain the JavaScript event loop in plain terms.

**A:** JavaScript is single-threaded — it can only do one thing at a time. The event loop is the mechanism that allows non-blocking async behaviour. When you call `setTimeout` or `fetch`, JavaScript hands the work to the browser/Node.js runtime (Web APIs / libuv) and immediately continues executing the next line. When the async work completes, its callback is placed in a queue. The event loop continuously checks: "is the call stack empty?" When it is, it first drains the microtask queue (Promise callbacks — all of them), then picks one callback from the macrotask queue (setTimeout, I/O), runs it, drains microtasks again, and repeats.

---

## C — Common Pitfalls + Fix

### ❌ Expecting `setTimeout(fn, 0)` to run before Promise callbacks

```javascript
// ❌ Wrong mental model: "0ms means immediately"
setTimeout(() => console.log('timeout'), 0)
Promise.resolve().then(() => console.log('promise'))

// Output: 'promise' then 'timeout'
// Microtasks (Promise) always drain before the next macrotask (setTimeout) ❌

// ✅ Correct model: Promise.then is always before setTimeout(fn, 0)
```

---

## K — Coding Challenge + Solution

### Challenge

Predict the exact output order and explain each line:

```javascript
console.log('A')
setTimeout(() => console.log('B'), 0)
Promise.resolve().then(() => console.log('C')).then(() => console.log('D'))
setTimeout(() => console.log('E'), 0)
console.log('F')
```

### Solution

```
Output: A, F, C, D, B, E

A — sync, immediate
F — sync, immediate (before any async)
C — first .then microtask (drained after call stack clears)
D — second .then microtask (added by C's .then, drained in same microtask pass)
B — first macrotask (setTimeout registered first)
E — second macrotask (setTimeout registered second)

Key insight: D runs before B because the entire microtask queue
(including newly-queued microtasks like D) drains before any macrotask.
```

---

---

# 2 — Macrotasks vs Microtasks — Execution Order

---

## T — TL;DR

**Microtasks** (Promise callbacks, `queueMicrotask`) run before the next render or macrotask — the entire queue drains after each macrotask. **Macrotasks** (setTimeout, setInterval, I/O, MessageChannel) are one-per-loop-tick. Microtasks have higher priority. A microtask that queues another microtask stays in the same drain pass — this can starve the macrotask queue.

---

## K — Key Concepts

```javascript
// ── Microtask sources ─────────────────────────────────────────────────────
Promise.resolve().then(fn)      // Promise .then/.catch/.finally
queueMicrotask(fn)              // explicit microtask scheduling
// In Node.js also: process.nextTick (even higher priority than Promises)

// ── Macrotask sources ─────────────────────────────────────────────────────
setTimeout(fn, delay)           // timer
setInterval(fn, delay)          // repeating timer
setImmediate(fn)                // Node.js — after I/O, before timers
MessageChannel.port.postMessage // browser
I/O callbacks                   // file read, network (Node.js)
UI events                       // click, keydown (browser)
```

```javascript
// ── Microtasks drain COMPLETELY before next macrotask ─────────────────────
setTimeout(() => console.log('macro 1'), 0)

Promise.resolve()
  .then(() => {
    console.log('micro 1')
    return Promise.resolve()   // adds another microtask to the queue
  })
  .then(() => console.log('micro 2'))    // runs in same drain pass
  .then(() => console.log('micro 3'))    // still in same drain pass

setTimeout(() => console.log('macro 2'), 0)

// Output: micro 1, micro 2, micro 3, macro 1, macro 2
// All three microtasks finish before either setTimeout callback runs
```

```javascript
// ── Microtask starvation — infinite microtask loop blocks macrotasks ──────
// ❌ This will freeze Node.js/browser — macrotasks never run
function starve() {
  Promise.resolve().then(starve)   // keeps adding microtasks
}
// starve()  // Don't run this ❌

// ── process.nextTick (Node.js) — even before Promise microtasks ───────────
// Node.js execution order within a single tick:
// 1. Synchronous code
// 2. process.nextTick callbacks (all of them)
// 3. Promise microtasks (all of them)
// 4. Macrotasks (I/O, setTimeout, setImmediate)

process.nextTick(() => console.log('nextTick'))
Promise.resolve().then(() => console.log('promise'))
setTimeout(() => console.log('setTimeout'), 0)
// Output: nextTick, promise, setTimeout
```

```javascript
// ── queueMicrotask — explicit scheduling ──────────────────────────────────
queueMicrotask(() => console.log('explicit microtask'))
// Equivalent to Promise.resolve().then(fn) but cleaner for non-Promise microtasks
// Use for: scheduling cleanup, batching DOM reads after sync writes
```

---

## W — Why It Matters

- React's `setState` batching, Vue's `nextTick`, and many framework internals schedule updates as microtasks — understanding why `Promise.resolve().then(checkDOM)` sees the updated DOM but `setTimeout(checkDOM, 0)` also does (but later) explains framework timing.
- `process.nextTick` vs `Promise.then` order in Node.js causes subtle bugs in server code — if a function schedules via `nextTick` and another via `.then`, the `nextTick` always runs first.
- Microtask starvation is a real threat — a recursive Promise chain (every `.then` adding another `.then`) starves the event loop exactly like a `while(true)` loop.

---

## I — Interview Q&A

### Q: What is the difference between a macrotask and a microtask?

**A:** A macrotask (task) is a unit of work picked from the callback queue — one per event loop tick. Sources: `setTimeout`, `setInterval`, I/O callbacks, UI events. After each macrotask, the browser may render. A microtask runs immediately after the current task/code completes, before the next macrotask or render — the entire microtask queue drains first. Sources: Promise `.then/.catch/.finally`, `queueMicrotask`. The priority order is: synchronous code → microtasks (all) → render (browser) → one macrotask → microtasks (all) → repeat.

---

## C — Common Pitfalls + Fix

### ❌ Expecting DOM to be updated before a microtask runs

```javascript
// ❌ DOM mutation and reading in the same microtask pass
element.textContent = 'updated'   // DOM mutated (but not yet painted)
Promise.resolve().then(() => {
  // Browser hasn't repainted yet — layout may not reflect the change
  // for reads like getBoundingClientRect()
  console.log(element.offsetHeight)  // may be stale
})

// ✅ Use setTimeout for post-render reads
element.textContent = 'updated'
setTimeout(() => {
  console.log(element.offsetHeight)  // after repaint ✅
}, 0)
```

---

## K — Coding Challenge + Solution

### Challenge

Write `scheduleAll(tasks)` where each task is `{ type: 'micro'|'macro', fn }`. Run micro tasks via `queueMicrotask` and macro tasks via `setTimeout(fn,0)`. Log the order they actually execute vs registration order.

### Solution

```javascript
function scheduleAll(tasks) {
  const order = []
  tasks.forEach((task, i) => {
    const run = () => { order.push(i); task.fn() }
    if (task.type === 'micro') queueMicrotask(run)
    else setTimeout(run, 0)
  })
  // Return a promise that resolves after all macrotasks
  return new Promise(resolve => setTimeout(() => resolve(order), 10))
}

scheduleAll([
  { type: 'macro', fn: () => console.log('macro 0') },
  { type: 'micro', fn: () => console.log('micro 1') },
  { type: 'macro', fn: () => console.log('macro 2') },
  { type: 'micro', fn: () => console.log('micro 3') },
]).then(order => console.log('Execution order (by index):', order))
// micro 1, micro 3, macro 0, macro 2
// order: [1, 3, 0, 2]
```

---

---

# 3 — Callbacks and Callback Hell

---

## T — TL;DR

**Callbacks** are functions passed as arguments to be called later — the original async pattern. They work but create **callback hell** (nested pyramids) when sequencing async operations: hard to read, impossible to handle errors cleanly, no way to use `try/catch`. Promises and `async/await` exist specifically to solve this.

---

## K — Key Concepts

```javascript
// ── Basic callback pattern ────────────────────────────────────────────────
function loadUser(id, callback) {
  setTimeout(() => {
    if (id <= 0) return callback(new Error('Invalid id'), null)
    callback(null, { id, name: 'Mark' })   // Node.js convention: (err, result)
  }, 100)
}

// Error-first callback (Node.js convention)
loadUser(1, (err, user) => {
  if (err) return console.error(err)
  console.log(user)   // { id: 1, name: 'Mark' }
})
```

```javascript
// ── Callback hell — the pyramid of doom ───────────────────────────────────
// ❌ Sequencing three dependent async operations with callbacks
getUser(userId, (err, user) => {
  if (err) return handleError(err)
  getOrders(user.id, (err, orders) => {
    if (err) return handleError(err)
    getOrderDetails(orders[0].id, (err, details) => {
      if (err) return handleError(err)
      getShipment(details.shipmentId, (err, shipment) => {
        if (err) return handleError(err)
        // Finally use the data — 4 levels deep ❌
        console.log(shipment)
      })
    })
  })
})

// Problems:
// - Unreadable nesting (pyramid shape)
// - Error handling repeated at every level
// - Impossible to use try/catch
// - Can't return values up the chain
// - Can't easily run operations in parallel
```

```javascript
// ── Partially fixing with named functions ──────────────────────────────────
// ✅ Slightly better — but error handling still scattered
function handleUser(err, user) {
  if (err) return handleError(err)
  getOrders(user.id, handleOrders)
}
function handleOrders(err, orders) {
  if (err) return handleError(err)
  getOrderDetails(orders[0].id, handleDetails)
}

getUser(userId, handleUser)   // reads linearly but still hard to follow ❌
```

```javascript
// ── Converting a callback-based function to a Promise ─────────────────────
// util.promisify (Node.js) does this automatically
import { promisify } from 'util'
const readFile = promisify(fs.readFile)   // now returns a Promise

// Manual promisification
function promisifyCallback(fn) {
  return function(...args) {
    return new Promise((resolve, reject) => {
      fn(...args, (err, result) => {
        if (err) reject(err)
        else resolve(result)
      })
    })
  }
}

const loadUserAsync = promisifyCallback(loadUser)
loadUserAsync(1).then(user => console.log(user))
```

---

## W — Why It Matters

- Callback hell is still in production codebases, third-party SDKs, and legacy Node.js code — recognising the pattern and knowing how to promisify it is an active skill.
- The Node.js error-first convention `(err, result)` is pervasive in `fs`, `crypto`, `http` module callbacks — always check `err` before using `result`.
- `util.promisify` is the correct tool for converting Node.js core callbacks to Promises — don't manually promisify `fs.readFile` when Node.js provides it built-in.

---

## I — Interview Q&A

### Q: What is callback hell and how do you solve it?

**A:** Callback hell is deeply nested callback functions required to sequence async operations — each step depends on the previous, creating a rightward pyramid. Problems: unreadable nesting, error handling repeated at every level, no `try/catch`, no return values. Solutions in order of preference: (1) **Promises** — chain `.then()` calls horizontally instead of nesting; error propagates to one `.catch()`. (2) **async/await** — write async code that looks synchronous, use `try/catch` for errors. (3) **Named functions** — extract each callback to a named function to flatten nesting (workaround, not a fix). (4) **util.promisify** — convert Node.js callbacks to Promises.

---

## C — Common Pitfalls + Fix

### ❌ Calling callback twice — once on error and once on success

```javascript
// ❌ Forgetting return — callback called twice
function loadUser(id, cb) {
  if (id <= 0) {
    cb(new Error('Invalid'))   // called once
    // forgot return — continues to success path!
  }
  cb(null, { id })             // called again ❌
}

// ✅ Always return after calling callback
function loadUser2(id, cb) {
  if (id <= 0) return cb(new Error('Invalid'))  // return stops execution ✅
  cb(null, { id })
}
```

---

## K — Coding Challenge + Solution

### Challenge

Convert this callback-hell chain to use Promises (using `promisifyCallback`): fetch user → fetch user's posts → fetch first post's comments.

### Solution

```javascript
// Simulated callback-based API
const api = {
  getUser:     (id, cb) => setTimeout(() => cb(null, { id, name: 'Mark' }), 50),
  getPosts:    (uid, cb) => setTimeout(() => cb(null, [{ id: 10, title: 'Post 1' }]), 50),
  getComments: (pid, cb) => setTimeout(() => cb(null, [{ id: 100, text: 'Nice!' }]), 50),
}

// Promisify
const getUser     = promisifyCallback(api.getUser.bind(api))
const getPosts    = promisifyCallback(api.getPosts.bind(api))
const getComments = promisifyCallback(api.getComments.bind(api))

// Clean chain — no nesting
getUser(1)
  .then(user    => getPosts(user.id))
  .then(posts   => getComments(posts[0].id))
  .then(comments => console.log(comments))   // [{ id:100, text:'Nice!' }]
  .catch(err    => console.error(err))

function promisifyCallback(fn) {
  return (...args) => new Promise((res, rej) =>
    fn(...args, (err, result) => err ? rej(err) : res(result))
  )
}
```

---

---

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

# 5 — Promise Combinators — all, allSettled, race, any, AggregateError

---

## T — TL;DR

Combinators run multiple promises. `Promise.all` — all must succeed. `Promise.allSettled` — wait for all, success or failure. `Promise.race` — first to settle wins. `Promise.any` — first to fulfil wins (ignores rejections). `AggregateError` is thrown by `Promise.any` when all reject.

---

## K — Key Concepts

```javascript
const p1 = fetch('/api/users')
const p2 = fetch('/api/posts')
const p3 = fetch('/api/config')

// ── Promise.all — fails fast if any rejects ───────────────────────────────
Promise.all([p1, p2, p3])
  .then(([users, posts, config]) => {
    // All three resolved — results in same order as input ✅
  })
  .catch(err => {
    // ANY rejection → immediately rejects with that error
    // Other promises still run but their results are ignored
  })

// Use when: all results are needed and any failure means abort
```

```javascript
// ── Promise.allSettled — waits for all regardless of outcome ─────────────
Promise.allSettled([p1, p2, p3])
  .then(results => {
    results.forEach(result => {
      if (result.status === 'fulfilled') {
        console.log('✅ value:', result.value)
      } else {
        console.log('❌ reason:', result.reason)
      }
    })
  })
// Never rejects — always resolves with array of { status, value|reason }
// Use when: you need to know the outcome of each, regardless of failures
```

```javascript
// ── Promise.race — first to settle (resolve OR reject) wins ───────────────
const timeout = new Promise((_, reject) =>
  setTimeout(() => reject(new Error('Timeout')), 5000)
)

Promise.race([fetch('/api/slow-endpoint'), timeout])
  .then(response => response.json())
  .catch(err => console.error('Timed out or failed:', err))
// Use when: you need a timeout or want the fastest of several sources
```

```javascript
// ── Promise.any — first to FULFIL wins (ignores rejections) ───────────────
Promise.any([
  fetch('/api/server1'),
  fetch('/api/server2'),
  fetch('/api/server3'),
])
  .then(response => response.json())   // fastest successful response
  .catch(err => {
    // Only rejects if ALL promises reject
    console.log(err instanceof AggregateError)   // true
    console.log(err.errors)   // array of all rejection reasons
    console.log(err.message)  // 'All promises were rejected'
  })
// Use when: fallback sources, fastest CDN, redundant APIs
```

```javascript
// ── Comparison table ──────────────────────────────────────────────────────
/*
               Resolves when        Rejects when        Result shape
all            ALL fulfil          ANY rejects          [values] in order
allSettled     ALL settle          never               [{status,value|reason}]
race           FIRST settles       FIRST rejects        single value
any            FIRST fulfils       ALL reject           single value / AggregateError
*/

// ── AggregateError ────────────────────────────────────────────────────────
const err = new AggregateError(
  [new Error('a'), new Error('b')],
  'All failed'
)
err.errors   // [Error: a, Error: b]
err.message  // 'All failed'
```

---

## W — Why It Matters

- `Promise.all` for parallel independent requests is the standard pattern — fetching user + posts + config simultaneously takes `max(t1,t2,t3)` time; sequentially it takes `t1+t2+t3`. Real-world impact: 300ms vs 900ms for three 300ms requests.
- `Promise.allSettled` is the correct choice for dashboard data — if one widget's data fails, the others should still render. `Promise.all` would abort everything on one failure.
- `Promise.any` is the hedged request pattern used by CDNs and high-availability systems — send the request to multiple servers, use whichever responds first.

---

## I — Interview Q&A

### Q: What is the difference between `Promise.all` and `Promise.allSettled`?

**A:** `Promise.all(arr)` resolves with an array of values when all promises fulfil, but rejects immediately when any promise rejects (fail-fast). The rejection value is the first rejection reason. Use it when all results are required and a failure should abort everything. `Promise.allSettled(arr)` always resolves (never rejects) after all promises settle (fulfil or reject). The result is an array of objects with `status: 'fulfilled'` and `value`, or `status: 'rejected'` and `reason`. Use it when you need to process all outcomes individually — dashboard widgets, batch operations where partial failure is acceptable.

---

## C — Common Pitfalls + Fix

### ❌ Using `Promise.all` when partial success is acceptable

```javascript
// ❌ One failing API crashes the whole dashboard
const [users, analytics, notifications] = await Promise.all([
  fetchUsers(),         // fails → entire .all rejects
  fetchAnalytics(),     // result discarded
  fetchNotifications(), // result discarded
])

// ✅ Promise.allSettled — each widget loads independently
const results = await Promise.allSettled([fetchUsers(), fetchAnalytics(), fetchNotifications()])
const [users, analytics, notifications] = results.map(r =>
  r.status === 'fulfilled' ? r.value : null  // null for failed requests ✅
)
```

---

## K — Coding Challenge + Solution

### Challenge

Implement `fetchWithFallback(urls)` that tries URLs in parallel with `Promise.any`, logs which URL succeeded, and falls back to `null` if all fail. Then use `Promise.allSettled` to fetch multiple resources and return `{ succeeded, failed }` counts.

### Solution

```javascript
async function fetchWithFallback(urls) {
  try {
    const response = await Promise.any(
      urls.map(url => fetch(url).then(r => ({ url, response: r })))
    )
    console.log(`✅ Succeeded: ${response.url}`)
    return response.response
  } catch (err) {  // AggregateError
    console.error('All URLs failed:', err.errors.map(e => e.message))
    return null
  }
}

async function batchFetch(urls) {
  const results = await Promise.allSettled(urls.map(url => fetch(url)))
  const succeeded = results.filter(r => r.status === 'fulfilled').length
  const failed    = results.filter(r => r.status === 'rejected').length
  return { succeeded, failed, results }
}
```

---

---

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

# 7 — Sequential vs Parallel Execution, await in forEach Pitfall

---

## T — TL;DR

`await` in a loop runs iterations **sequentially** — each waits for the previous. Starting all Promises then awaiting them runs **in parallel**. `await` inside `forEach` does **nothing useful** — `forEach` doesn't await its callback. Use `for...of` for sequential async, `Promise.all` + `map` for parallel.

---

## K — Key Concepts

```javascript
const userIds = [1, 2, 3, 4, 5]

// ── Sequential — each waits for previous (total = sum of times) ───────────
async function loadSequential(ids) {
  const results = []
  for (const id of ids) {
    const user = await fetchUser(id)   // waits 100ms per call → 500ms total
    results.push(user)
  }
  return results
}

// ── Parallel — all start at once (total = max of times) ──────────────────
async function loadParallel(ids) {
  const promises = ids.map(id => fetchUser(id))  // start all immediately
  return Promise.all(promises)                    // → 100ms total ✅
}
// OR one-liner:
const users = await Promise.all(userIds.map(fetchUser))
```

```javascript
// ── The await in forEach trap ─────────────────────────────────────────────
// ❌ forEach ignores returned Promises — async callbacks are fire-and-forget
async function loadForEach(ids) {
  const results = []
  ids.forEach(async (id) => {         // ← async callback ❌
    const user = await fetchUser(id)  // awaited inside callback only
    results.push(user)                // but forEach doesn't wait for it
  })
  return results   // always returns [] — async work still in progress! ❌
}

// ✅ Use for...of for sequential
async function loadSequential2(ids) {
  const results = []
  for (const id of ids) {
    results.push(await fetchUser(id))
  }
  return results
}

// ✅ Use Promise.all + map for parallel
async function loadParallel2(ids) {
  return Promise.all(ids.map(id => fetchUser(id)))
}
```

```javascript
// ── Controlled concurrency — batch parallel ────────────────────────────────
// Problem: 1000 parallel requests overwhelms the server
async function loadWithConcurrency(ids, concurrency = 5) {
  const results = []
  for (let i = 0; i < ids.length; i += concurrency) {
    const batch = ids.slice(i, i + concurrency)
    const batchResults = await Promise.all(batch.map(fetchUser))
    results.push(...batchResults)
  }
  return results
}
// 1000 items with concurrency=5 → 200 batches, 5 parallel each
```

```javascript
// ── When sequential is correct ────────────────────────────────────────────
// Sequential is right when each step depends on the previous
async function createOrderFlow(cart) {
  const order    = await createOrder(cart)       // must finish first
  const payment  = await chargePayment(order.id) // needs order.id
  const shipment = await scheduleShip(order.id)  // needs order.id
  return { order, payment, shipment }
}

// When parallel is correct — independent operations
async function loadDashboard(userId) {
  const [user, posts, stats] = await Promise.all([
    fetchUser(userId),    // independent
    fetchPosts(userId),   // independent
    fetchStats(userId),   // independent
  ])
  return { user, posts, stats }
}
```

---

## W — Why It Matters

- `await` in `forEach` is the single most common async bug in JavaScript codebases — it silently does nothing, the function returns before async work completes, and the bug is hard to spot because the code looks correct.
- Sequential vs parallel is a performance multiplier — 10 API calls at 200ms each take 2000ms sequential and ~200ms parallel. In a page load, this is the difference between a 0.2s and 2s load.
- Controlled concurrency (batching) prevents rate limiting and server overload — always cap parallel requests when processing user-submitted lists or bulk operations.

---

## I — Interview Q&A

### Q: Why doesn't `await` work inside `forEach`, and what should you use instead?

**A:** `forEach` calls its callback function synchronously for each element and ignores the return value. When you use an `async` callback, it starts executing and returns a Promise — but `forEach` discards that Promise immediately without waiting for it. The outer `async` function has no idea any async work is pending. The outer function returns before any of the `await`s inside the callbacks resolve. **Fix for sequential:** use `for...of` — the loop itself can be paused by `await`. **Fix for parallel:** use `Promise.all(arr.map(async item => ...))` — `map` collects the Promises, `Promise.all` awaits them all.

---

## C — Common Pitfalls + Fix

### ❌ `await` inside `forEach` — classic silent bug

```javascript
// ❌ results is always [] — async work ignored
async function getNames(ids) {
  const names = []
  ids.forEach(async id => {
    const user = await fetchUser(id)
    names.push(user.name)   // runs after function returns ❌
  })
  return names   // always []
}

// ✅ Use Promise.all + map for parallel
async function getNames2(ids) {
  const users = await Promise.all(ids.map(id => fetchUser(id)))
  return users.map(u => u.name)
}

// ✅ Use for...of for sequential
async function getNames3(ids) {
  const names = []
  for (const id of ids) {
    const user = await fetchUser(id)
    names.push(user.name)
  }
  return names
}
```

---

## K — Coding Challenge + Solution

### Challenge

Write `processItems(items, asyncHandler, { mode, concurrency })` where `mode` is `'sequential'`, `'parallel'`, or `'batched'`. Show all three modes with a simulated async handler.

### Solution

```javascript
async function processItems(items, handler, { mode = 'parallel', concurrency = 5 } = {}) {
  if (mode === 'sequential') {
    const results = []
    for (const item of items) results.push(await handler(item))
    return results
  }
  if (mode === 'parallel') {
    return Promise.all(items.map(handler))
  }
  if (mode === 'batched') {
    const results = []
    for (let i = 0; i < items.length; i += concurrency) {
      const batch = await Promise.all(items.slice(i, i + concurrency).map(handler))
      results.push(...batch)
    }
    return results
  }
}

// Test
const ids = [1, 2, 3, 4, 5, 6, 7, 8]
const fakeHandler = async id => {
  await new Promise(r => setTimeout(r, 100))
  return id * 2
}

console.time('parallel')
await processItems(ids, fakeHandler, { mode: 'parallel' })
console.timeEnd('parallel')   // ~100ms

console.time('sequential')
await processItems(ids, fakeHandler, { mode: 'sequential' })
console.timeEnd('sequential') // ~800ms

console.time('batched')
await processItems(ids, fakeHandler, { mode: 'batched', concurrency: 3 })
console.timeEnd('batched')    // ~300ms
```

---

---

# 8 — Timers, Async Iteration, for await...of, Async Generators

---

## T — TL;DR

`setTimeout`/`setInterval` schedule macrotasks. `clearTimeout`/`clearInterval` cancel them. **Async iterables** implement `[Symbol.asyncIterator]` — each `next()` returns a Promise. `for await...of` consumes them. **Async generators** (`async function*`) `yield` values asynchronously and are the cleanest way to build async data streams.

---

## K — Key Concepts

```javascript
// ── Timers ────────────────────────────────────────────────────────────────
const timeoutId  = setTimeout(() => console.log('once'), 1000)
const intervalId = setInterval(() => console.log('repeat'), 500)

clearTimeout(timeoutId)     // cancel before it fires
clearInterval(intervalId)   // cancel repeating timer

// Reliable repeating timer with async (avoids drift)
async function pollEvery(ms, fn, signal) {
  while (!signal?.aborted) {
    await fn()
    await new Promise(r => setTimeout(r, ms))
  }
}
```

```javascript
// ── for await...of — consume async iterables ──────────────────────────────
// Works with: async generators, ReadableStream, paginated APIs, WebSockets

async function consumeAsyncIterable(iterable) {
  for await (const item of iterable) {
    console.log(item)   // each item may have been awaited
  }
}

// Node.js ReadableStream is an async iterable:
import { createReadStream } from 'fs'
for await (const chunk of createReadStream('./file.txt')) {
  process.stdout.write(chunk)
}
```

```javascript
// ── Async generator — async function* ─────────────────────────────────────
async function* paginate(url) {
  let page = 1
  while (true) {
    const res  = await fetch(`${url}?page=${page}&limit=10`)
    const data = await res.json()
    if (!data.items.length) break   // no more pages
    yield* data.items               // yield each item
    if (!data.hasMore) break
    page++
  }
}

// Consume with for await...of
for await (const user of paginate('/api/users')) {
  console.log(user.name)   // streams in — no loading all pages upfront
}

// ── Async iterable class ──────────────────────────────────────────────────
class SSEStream {
  constructor(url) { this.url = url }

  async *[Symbol.asyncIterator]() {
    const response = await fetch(this.url)
    const reader   = response.body.getReader()
    const decoder  = new TextDecoder()

    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      const text = decoder.decode(value)
      for (const line of text.split('\n').filter(Boolean)) {
        if (line.startsWith('data: ')) {
          yield JSON.parse(line.slice(6))
        }
      }
    }
  }
}

for await (const event of new SSEStream('/api/events')) {
  console.log(event)
}
```

```javascript
// ── Async generator utilities ──────────────────────────────────────────────
async function* take(iterable, n) {
  let count = 0
  for await (const item of iterable) {
    if (count++ >= n) break
    yield item
  }
}

async function* map(iterable, fn) {
  for await (const item of iterable) {
    yield await fn(item)
  }
}

// Pipeline: paginate → take first 25 → transform
for await (const user of map(take(paginate('/api/users'), 25), async u => ({
  ...u,
  displayName: u.name.toUpperCase(),
}))) {
  console.log(user.displayName)
}
```

---

## W — Why It Matters

- Async generators are how Node.js streams and browser `ReadableStream` are consumed — `for await...of` on a file stream processes it chunk-by-chunk without loading the entire file into memory.
- Paginated API consumption with `async function*` is cleaner than recursive callbacks or managing `nextCursor` in a loop — the generator encapsulates the pagination logic and the consumer sees a flat stream of items.
- `setInterval` accumulates drift — if the callback takes 50ms and the interval is 100ms, real delay is 150ms. `setTimeout` recursion or `while + await delay` gives more accurate repeating behaviour.

---

## I — Interview Q&A

### Q: What is an async generator and how does `for await...of` consume it?

**A:** An async generator is defined with `async function*` — it can `yield` values and `await` Promises. Each call to its `next()` method returns a Promise that resolves to `{ value, done }`. `for await...of` automatically calls `next()`, awaits each result, and iterates until `done: true`. It's the natural way to model lazy async data streams — paginated APIs, file lines, server-sent events, database cursors — where data arrives asynchronously and you want to process it item by item without buffering everything.

---

## C — Common Pitfalls + Fix

### ❌ setInterval callback taking longer than the interval — overlapping calls

```javascript
// ❌ If work takes 800ms and interval is 500ms, calls pile up
setInterval(async () => {
  await longRunningWork()   // 800ms
}, 500)  // fires every 500ms regardless ❌

// ✅ Self-scheduling with setTimeout — next call only after current finishes
async function schedule(fn, ms) {
  await fn()
  setTimeout(() => schedule(fn, ms), ms)  // waits for fn to complete ✅
}
schedule(longRunningWork, 500)
```

---

## K — Coding Challenge + Solution

### Challenge

Write `asyncRange(start, end, delayMs)` as an async generator that yields numbers from `start` to `end` with a delay between each. Then write `first(n, asyncIterable)` that collects the first `n` items.

### Solution

```javascript
async function* asyncRange(start, end, delayMs = 100) {
  for (let i = start; i <= end; i++) {
    await new Promise(r => setTimeout(r, delayMs))
    yield i
  }
}

async function first(n, asyncIterable) {
  const results = []
  for await (const item of asyncIterable) {
    results.push(item)
    if (results.length >= n) break
  }
  return results
}

// Collect first 5 numbers from range 1-100 with 50ms delay
const nums = await first(5, asyncRange(1, 100, 50))
console.log(nums)   // [1, 2, 3, 4, 5] — took ~250ms
```

---

---

# 9 — fetch — Methods, Request/Response, Headers, FormData, AbortController

---

## T — TL;DR

`fetch` is the modern browser/Node.js HTTP client returning a Promise. A `Response` is not the data — you must call `.json()`, `.text()`, `.blob()` etc. to extract it. `AbortController` + `AbortSignal` cancels requests. `Headers`, `FormData`, and `Request` objects provide structured control over every aspect of a request.

---

## K — Key Concepts

```javascript
// ── GET request ────────────────────────────────────────────────────────────
const res  = await fetch('/api/users')
// res.ok     → true if status 200-299
// res.status → 404, 200, etc.
// res.headers.get('Content-Type')

if (!res.ok) throw new Error(`HTTP ${res.status}: ${res.statusText}`)

const users = await res.json()        // parse JSON body (one-time read)
// Alternatives:
const text  = await res.text()        // raw string
const blob  = await res.blob()        // binary data (files, images)
const buf   = await res.arrayBuffer() // raw bytes
```

```javascript
// ── POST / PUT / PATCH / DELETE ────────────────────────────────────────────
// POST with JSON body
const response = await fetch('/api/users', {
  method:  'POST',
  headers: { 'Content-Type': 'application/json' },
  body:    JSON.stringify({ name: 'Mark', email: 'mark@ex.com' }),
})

// PUT — full replacement
await fetch(`/api/users/${id}`, {
  method:  'PUT',
  headers: { 'Content-Type': 'application/json' },
  body:    JSON.stringify(updatedUser),
})

// PATCH — partial update
await fetch(`/api/users/${id}`, {
  method:  'PATCH',
  headers: { 'Content-Type': 'application/json' },
  body:    JSON.stringify({ name: 'New Name' }),
})

// DELETE
await fetch(`/api/users/${id}`, { method: 'DELETE' })
```

```javascript
// ── Headers ────────────────────────────────────────────────────────────────
const headers = new Headers({
  'Content-Type': 'application/json',
  'Authorization': `Bearer ${token}`,
})
headers.set('X-Request-ID', crypto.randomUUID())
headers.get('content-type')    // 'application/json' (case-insensitive)
headers.has('Authorization')   // true
headers.delete('X-Request-ID')

// Iterating response headers
for (const [key, value] of response.headers) {
  console.log(`${key}: ${value}`)
}
```

```javascript
// ── FormData — multipart form data (file uploads) ─────────────────────────
const form = new FormData()
form.append('name',  'Mark')
form.append('email', 'mark@ex.com')
form.append('avatar', fileInput.files[0])  // File object

// Don't set Content-Type — browser sets it with boundary automatically
await fetch('/api/upload', { method: 'POST', body: form })

// ── credentials ───────────────────────────────────────────────────────────
// 'omit'        — no cookies (default cross-origin)
// 'same-origin' — cookies sent to same origin (default)
// 'include'     — cookies sent to all origins (requires CORS Allow-Credentials)
await fetch('/api/profile', { credentials: 'include' })
```

```javascript
// ── AbortController — cancel requests ─────────────────────────────────────
const controller = new AbortController()
const { signal } = controller

// Cancel after 5 seconds
const timeout = setTimeout(() => controller.abort(), 5000)

try {
  const res = await fetch('/api/slow', { signal })
  clearTimeout(timeout)
  return await res.json()
} catch (err) {
  if (err.name === 'AbortError') {
    console.log('Request was cancelled')
  } else {
    throw err
  }
}

// AbortSignal.timeout() — built-in timeout (Node 17.3+, modern browsers)
const res = await fetch('/api/data', {
  signal: AbortSignal.timeout(5000)   // auto-abort after 5s ✅
})

// Cancel on component unmount (React pattern)
useEffect(() => {
  const controller = new AbortController()
  fetchData(controller.signal)
  return () => controller.abort()   // cleanup ✅
}, [])
```

```javascript
// ── Reusable fetch wrapper ────────────────────────────────────────────────
async function apiFetch(url, options = {}) {
  const defaults = {
    headers: {
      'Content-Type': 'application/json',
      'Accept':        'application/json',
    },
    credentials: 'same-origin',
    signal: AbortSignal.timeout(10_000),
  }
  const merged = {
    ...defaults,
    ...options,
    headers: { ...defaults.headers, ...options.headers },
  }

  const res = await fetch(url, merged)
  if (!res.ok) {
    const error = await res.json().catch(() => ({ message: res.statusText }))
    throw Object.assign(new Error(error.message), { status: res.status, body: error })
  }
  return res.json()
}
```

---

## W — Why It Matters

- `fetch` does NOT throw on HTTP errors (404, 500) — only network failures throw. Always check `res.ok` or `res.status`. This is the most common `fetch` mistake.
- The body can only be consumed once — calling `.json()` after `.text()` throws. Clone the response with `res.clone()` if you need to read the body twice.
- `AbortSignal.timeout(ms)` is the modern way to add timeouts — no manual `setTimeout` + `clearTimeout` management. Works in Node.js 17.3+ and all modern browsers.

---

## I — Interview Q&A

### Q: Why doesn't `fetch` throw on a 404 or 500 status, and how do you handle HTTP errors?

**A:** `fetch` only rejects (throws) for network-level failures — DNS lookup failure, CORS error, or the request couldn't be sent. A server responding with 404 or 500 is a valid HTTP response from the network's perspective, so `fetch` resolves the Promise with a `Response` object. To detect HTTP errors, check `response.ok` (true for 200–299) or `response.status`. Always check before calling `.json()`:

```javascript
const res = await fetch(url)
if (!res.ok) throw new Error(`HTTP ${res.status}`)
const data = await res.json()
```

---

## C — Common Pitfalls + Fix

### ❌ Not checking `res.ok` — silently parses error responses as data

```javascript
// ❌ 404 response body parsed as if it's real data
const user = await fetch('/api/users/99999').then(r => r.json())
console.log(user)   // { error: 'Not found' } treated as user data ❌

// ✅ Always check res.ok first
const res  = await fetch('/api/users/99999')
if (!res.ok) throw new Error(`HTTP ${res.status}: ${res.statusText}`)
const user = await res.json()
```

---

## K — Coding Challenge + Solution

### Challenge

Build `createApiClient(baseUrl, defaultHeaders)` that returns `get(path)`, `post(path, body)`, `put(path, body)`, `patch(path, body)`, `del(path)` methods, each with 8s timeout, error throwing on non-ok responses, and JSON parsing.

### Solution

```javascript
function createApiClient(baseUrl, defaultHeaders = {}) {
  async function request(method, path, body) {
    const url = `${baseUrl}${path}`
    const options = {
      method,
      headers: {
        'Content-Type': 'application/json',
        'Accept':        'application/json',
        ...defaultHeaders,
      },
      signal: AbortSignal.timeout(8000),
      ...(body !== undefined && { body: JSON.stringify(body) }),
    }
    const res = await fetch(url, options)
    if (!res.ok) {
      const err = await res.json().catch(() => ({}))
      const e = new Error(err.message ?? `HTTP ${res.status}`)
      e.status = res.status
      throw e
    }
    if (res.status === 204) return null   // No Content
    return res.json()
  }

  return {
    get:   (path)        => request('GET',    path),
    post:  (path, body)  => request('POST',   path, body),
    put:   (path, body)  => request('PUT',    path, body),
    patch: (path, body)  => request('PATCH',  path, body),
    del:   (path)        => request('DELETE', path),
  }
}

const api = createApiClient('https://api.example.com', {
  Authorization: `Bearer ${token}`
})
const user = await api.get('/users/1')
const created = await api.post('/users', { name: 'Mark' })
```

---

---

# 10 — URL, URLSearchParams, localStorage, sessionStorage, Cookies

---

## T — TL;DR

`URL` and `URLSearchParams` parse and build URLs safely. `localStorage` persists across sessions (same origin, ~5MB). `sessionStorage` clears when the tab closes. Cookies are sent with every HTTP request, support `HttpOnly` (JS can't read), `Secure` (HTTPS only), `SameSite` (CSRF protection). Never store sensitive data in localStorage.

---

## K — Key Concepts

```javascript
// ── URL — parse and build URLs ────────────────────────────────────────────
const url = new URL('https://api.example.com/users?page=2&limit=10#results')
url.protocol   // 'https:'
url.hostname   // 'api.example.com'
url.pathname   // '/users'
url.search     // '?page=2&limit=10'
url.hash       // '#results'
url.href       // full URL string

// Modify parts
url.pathname = '/posts'
url.searchParams.set('page', '3')
url.href   // 'https://api.example.com/posts?page=3&limit=10#results'

// ── URLSearchParams ────────────────────────────────────────────────────────
const params = new URLSearchParams({ page: 2, limit: 10, sort: 'asc' })
params.toString()          // 'page=2&limit=10&sort=asc'
params.get('page')         // '2' — always string
params.getAll('tag')       // [] — multi-value keys
params.set('page', 3)
params.append('tag', 'js')
params.append('tag', 'ts')  // duplicate keys supported
params.delete('sort')
params.has('limit')        // true

for (const [key, value] of params) console.log(key, value)

// Build fetch URL cleanly
const qs = new URLSearchParams({ q: 'hello world', page: 1 })
fetch(`/api/search?${qs}`)   // auto-encodes: /api/search?q=hello+world&page=1 ✅
```

```javascript
// ── localStorage ──────────────────────────────────────────────────────────
// Persists across browser sessions (until cleared)
// Origin-scoped (same protocol + hostname + port)
// Synchronous (blocks main thread) — ~5MB limit
// Strings only — must JSON.stringify objects

localStorage.setItem('theme', 'dark')
localStorage.getItem('theme')      // 'dark' or null if missing
localStorage.removeItem('theme')
localStorage.clear()               // removes ALL items for this origin
localStorage.length                // number of stored items

// Safe pattern for objects
function storageSet(key, value) {
  localStorage.setItem(key, JSON.stringify(value))
}
function storageGet(key, fallback = null) {
  try {
    const item = localStorage.getItem(key)
    return item !== null ? JSON.parse(item) : fallback
  } catch { return fallback }
}

// ── sessionStorage ────────────────────────────────────────────────────────
// Same API as localStorage
// Clears when the tab/window closes
// Not shared between tabs (even same origin)
sessionStorage.setItem('draft', JSON.stringify({ title: 'My Post' }))
```

```javascript
// ── Cookies ───────────────────────────────────────────────────────────────
// Set from JavaScript
document.cookie = 'username=Mark; path=/; max-age=86400'  // 1 day
document.cookie = 'theme=dark; path=/; SameSite=Lax'

// Read cookies (returns ALL cookies as one string — ugly API)
document.cookie   // 'username=Mark; theme=dark'

// Parse cookies
function getCookies() {
  return Object.fromEntries(
    document.cookie.split('; ')
      .filter(Boolean)
      .map(c => c.split('=').map(decodeURIComponent))
  )
}
getCookies()   // { username: 'Mark', theme: 'dark' }

// Delete cookie (set max-age=0)
document.cookie = 'username=; max-age=0; path=/'
```

```
── Cookie attributes ─────────────────────────────────────────────────────────

HttpOnly    → JS CANNOT read the cookie (document.cookie returns nothing for it)
             Set server-side: Set-Cookie: session=abc; HttpOnly
             Use for: session tokens, auth cookies — prevents XSS theft ✅

Secure      → Cookie only sent over HTTPS
             Set-Cookie: token=xyz; Secure
             Use for: any sensitive cookie in production ✅

SameSite    → Controls when cookie is sent with cross-site requests
             SameSite=Strict  → only same site (breaks OAuth flows)
             SameSite=Lax     → same site + top-level navigations (default in modern browsers)
             SameSite=None    → all requests (requires Secure=true) — for cross-site embeds

Expires     → Absolute expiry date | Max-Age → seconds from now
Path        → Cookie scope to URL path
Domain      → Accessible to domain and subdomains
```

```
── Choosing storage ──────────────────────────────────────────────────────────

                  localStorage    sessionStorage  Cookie
Persists          Until cleared   Until tab close Expiry/session
Capacity          ~5MB            ~5MB            ~4KB
Sent with requests ❌             ❌              ✅ (every request to origin)
JS accessible     ✅              ✅              ✅ (unless HttpOnly)
HttpOnly support  ❌              ❌              ✅ (server sets it)
Use for           UI prefs, cache Tab-specific     Auth tokens (HttpOnly)
                  offline data    form drafts     CSRF tokens, sessions
NEVER store       Passwords       Passwords       Passwords in plain text
                  Auth tokens     Auth tokens     (use HttpOnly for tokens)
                  (XSS risk)      (XSS risk)      
```

---

## W — Why It Matters

- `URLSearchParams` is the correct way to build query strings — manual string concatenation doesn't encode special characters, causing bugs with spaces, `&`, `=`, and non-ASCII characters.
- Storing auth tokens in `localStorage` is a security risk — XSS attacks can read `localStorage` via `document.cookie`-style injection. `HttpOnly` cookies are immune to JavaScript access. Use `HttpOnly` cookies for session tokens.
- `SameSite=Lax` (the modern browser default) prevents CSRF attacks — cookies are not sent with cross-site POST requests, so a malicious site can't submit a form as the authenticated user.

---

## I — Interview Q&A

### Q: What is the difference between `localStorage`, `sessionStorage`, and cookies? When would you use each?

**A:** `localStorage` persists until explicitly cleared, is accessible via JavaScript, and is scoped to the origin (~5MB). Use for user preferences, cached data, offline features. `sessionStorage` has the same API but clears when the tab closes and is not shared between tabs. Use for form drafts, tab-specific state. Cookies are small (~4KB), sent with every HTTP request to the matching domain, and can be `HttpOnly` (inaccessible to JavaScript). Use cookies — specifically `HttpOnly; Secure; SameSite=Lax` — for authentication tokens and session identifiers, because they're immune to XSS and automatically sent with API requests.

---

## C — Common Pitfalls + Fix

### ❌ Storing auth tokens in localStorage — XSS vulnerable

```javascript
// ❌ Any XSS script can steal the token
localStorage.setItem('authToken', jwtToken)
// Attacker's script: fetch('/api/steal?t=' + localStorage.getItem('authToken'))

// ✅ Set auth cookies server-side with HttpOnly
// Server response header:
// Set-Cookie: session=abc123; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=86400
// JS cannot read HttpOnly cookies — XSS can't steal them ✅
```

---

## K — Coding Challenge + Solution

### Challenge

Build `createStorage(prefix)` — a typed wrapper around `localStorage` with `set(key, value)`, `get(key, fallback)`, `remove(key)`, `clear()` (only prefixed keys), and `getAll()`. Handle JSON serialisation and parse errors.

### Solution

```javascript
function createStorage(prefix = 'app') {
  const key = (k) => `${prefix}:${k}`

  return {
    set(k, value) {
      try { localStorage.setItem(key(k), JSON.stringify(value)) }
      catch (e) { console.error('Storage write failed:', e) }
    },
    get(k, fallback = null) {
      try {
        const item = localStorage.getItem(key(k))
        return item !== null ? JSON.parse(item) : fallback
      } catch { return fallback }
    },
    remove(k) { localStorage.removeItem(key(k)) },
    clear() {
      const keysToRemove = []
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i)
        if (k?.startsWith(`${prefix}:`)) keysToRemove.push(k)
      }
      keysToRemove.forEach(k => localStorage.removeItem(k))
    },
    getAll() {
      const result = {}
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i)
        if (k?.startsWith(`${prefix}:`)) {
          const shortKey = k.slice(prefix.length + 1)
          result[shortKey] = this.get(shortKey)
        }
      }
      return result
    },
  }
}

const store = createStorage('myapp')
store.set('user', { name: 'Mark', theme: 'dark' })
store.set('token', 'abc123')
store.get('user')             // { name: 'Mark', theme: 'dark' }
store.get('missing', 'default')  // 'default'
store.getAll()                // { user: {...}, token: 'abc123' }
store.clear()                 // removes only 'myapp:*' keys ✅
```

---

## ✅ Day 5 Complete — Async JavaScript & Web APIs

| # | Subtopic | Status |
|---|----------|--------|
| 1 | Async Mental Model — Event Loop, Call Stack, Queues | ☐ |
| 2 | Macrotasks vs Microtasks | ☐ |
| 3 | Callbacks and Callback Hell | ☐ |
| 4 | Promises — resolve/reject, then/catch/finally | ☐ |
| 5 | Promise Combinators — all/allSettled/race/any | ☐ |
| 6 | async/await — try/catch/finally, unhandled rejections | ☐ |
| 7 | Sequential vs Parallel, await in forEach pitfall | ☐ |
| 8 | Timers, async iteration, for await...of, async generators | ☐ |
| 9 | fetch — methods, Request/Response, AbortController | ☐ |
| 10 | URL, URLSearchParams, localStorage, sessionStorage, cookies | ☐ |

---

## 🗺️ One-Page Mental Model — Day 5

```
EVENT LOOP
  Call stack:       sync code executes here (one at a time)
  Web APIs / libuv: setTimeout, fetch, I/O — offloaded to runtime
  Microtask queue:  Promise.then, queueMicrotask — drain ALL before next tick
  Macrotask queue:  setTimeout, setInterval, I/O, UI events — one per tick
  Order: sync → ALL microtasks → render → ONE macrotask → ALL microtasks → ...
  process.nextTick (Node) > Promise microtasks > macrotasks

CALLBACKS
  Error-first convention: (err, result) — check err before using result
  Callback hell = nested pyramids — hard to read, no try/catch, no returns
  Fix: util.promisify or manual promisification wrapper

PROMISES
  States: pending → fulfilled (resolve) | pending → rejected (reject)
  .then(onFulfilled)   → chain success (RETURN from .then to chain!)
  .catch(onRejected)   → catches any error in the chain
  .finally(fn)         → cleanup, runs always, no value
  Error propagates until .catch — skips .then handlers in between
  Nested promises = callback hell → flatten with chaining (always return)

PROMISE COMBINATORS
  all([p1,p2,p3])        → all succeed → [v1,v2,v3] | any fail → reject fast
  allSettled([p1,p2,p3]) → always resolves → [{status,value|reason}]
  race([p1,p2,p3])       → first to settle (resolve OR reject) wins
  any([p1,p2,p3])        → first to FULFIL wins | all fail → AggregateError
  Parallel with Promise.all = max(times) vs sequential = sum(times)

ASYNC/AWAIT
  async fn always returns Promise | throw → rejected Promise
  await pauses FUNCTION (not thread) — event loop still runs
  try/catch/finally works exactly like sync code
  Don't return values from finally — overrides try return
  Unhandled rejections crash Node.js — always handle
  Top-level await: needs "type":"module" or async IIFE

SEQUENTIAL vs PARALLEL
  Sequential:  for...of + await — each waits for previous
  Parallel:    Promise.all(arr.map(fn)) — all start at once ✅
  forEach:     NEVER use await inside forEach — it's ignored ❌
  Batched:     slice into chunks, Promise.all each batch
  Rule: independent async = parallel | dependent steps = sequential

TIMERS + ASYNC ITERATION
  setTimeout(fn, ms)         → macrotask, one-time
  setInterval(fn, ms)        → macrotask, repeating (accumulates drift)
  clearTimeout/clearInterval → cancel by ID
  for await...of             → consume async iterables
  async function*            → async generator, yields lazily
  [Symbol.asyncIterator]()   → make class async iterable
  Async generators: paginated APIs, streams, SSE, file lines

FETCH
  Returns Promise<Response> | throws ONLY on network failure (not 4xx/5xx)
  Always check res.ok or res.status before .json()
  Body: .json() | .text() | .blob() | .arrayBuffer() — consume ONCE
  AbortController: controller.abort() | AbortSignal.timeout(ms) ✅
  FormData: multipart uploads — don't set Content-Type manually
  credentials: 'include' for cross-origin cookies
  Reusable client: wrap fetch with error handling + default headers

URL + STORAGE
  new URL(str)        → parse URL | modify parts | .href for full URL
  URLSearchParams     → build/parse query strings safely (encodes special chars)
  localStorage        → persists, ~5MB, JS readable, sync, strings only
  sessionStorage      → clears on tab close, not shared between tabs
  Cookies             → sent with every request, ~4KB, server-settable
  HttpOnly            → JS CANNOT read → use for auth tokens ✅
  Secure              → HTTPS only
  SameSite=Lax        → default, prevents CSRF
  NEVER: localStorage for auth tokens (XSS readable) → use HttpOnly cookies
```

> **Your next action:** Open DevTools console, type `Promise.resolve().then(()=>console.log('micro'))` then `setTimeout(()=>console.log('macro'),0)` then `console.log('sync')` — watch the order live. One minute in the console beats ten minutes reading.

> "Doing one small thing beats opening a feed."