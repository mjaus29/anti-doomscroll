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
