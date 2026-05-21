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
