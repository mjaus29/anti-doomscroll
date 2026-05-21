# 12 — Concurrent Requests

---

## T — TL;DR

**Concurrent requests** fire simultaneously instead of sequentially. `Promise.all` is the standard tool — it waits for all to complete and fails fast on any error. `Promise.allSettled` waits for all and tolerates partial failures.

---

## K — Key Concepts

### Sequential vs Concurrent

```js
// ❌ Sequential — total time = t1 + t2 + t3
const user = (await api.get("/user")).data; // wait for this first
const settings = (await api.get("/settings")).data; // then wait for this
const notifs = (await api.get("/notifications")).data; // then this
// If each takes 300ms → 900ms total

// ✅ Concurrent — total time = max(t1, t2, t3)
const [userRes, settingsRes, notifsRes] = await Promise.all([
  api.get("/user"),
  api.get("/settings"),
  api.get("/notifications"),
]);
// All fire simultaneously → ~300ms total (3x faster)

const user = userRes.data;
const settings = settingsRes.data;
const notifs = notifsRes.data;
```

### `Promise.all` — All or Nothing

```js
try {
  const [userRes, ordersRes] = await Promise.all([
    api.get("/user"),
    api.get("/orders"),
  ]);

  setUser(userRes.data);
  setOrders(ordersRes.data);
} catch (error) {
  // If EITHER request fails, this catch fires
  // The successful request's data is lost
  setError("Failed to load page data");
}
```

Use when: all requests are **equally critical** — failure of any = failure of all.

### `Promise.allSettled` — Best Effort

```js
const [userResult, notifsResult, adsResult] = await Promise.allSettled([
  api.get("/user"), // critical
  api.get("/notifications"), // nice to have
  api.get("/ads"), // non-critical
]);

// Each result: { status: 'fulfilled', value: res } | { status: 'rejected', reason: err }
const user = userResult.status === "fulfilled" ? userResult.value.data : null;
const notifs =
  notifsResult.status === "fulfilled" ? notifsResult.value.data : [];
const ads = adsResult.status === "fulfilled" ? adsResult.value.data : [];

// User is required — fail hard if it failed
if (!user) throw userResult.reason;
```

Use when: some requests are optional — page should still render if non-critical ones fail.

### Concurrent Requests with Axios.all (Legacy) vs Promise.all

```js
// ❌ Old pattern (Axios v0.x) — removed in v1
axios.all([api.get('/a'), api.get('/b')])
axios.spread((resA, resB) => { ... })

// ✅ Modern pattern — use native Promise.all
const [resA, resB] = await Promise.all([api.get('/a'), api.get('/b')])
```

> Axios v1.x removed `axios.all` and `axios.spread`. Use `Promise.all` directly.

### Concurrency with Dynamic Arrays

```js
// Fetch details for an array of IDs
const userIds = [1, 2, 3, 4, 5];

const users = await Promise.all(
  userIds.map((id) => api.get(`/users/${id}`).then((r) => r.data))
);
console.log(users); // [user1, user2, user3, user4, user5]
```

### Controlled Concurrency — Limit Parallel Requests

When you have 100 IDs but don't want to fire 100 simultaneous requests:

```js
async function batchRequests(items, requestFn, batchSize = 5) {
  const results = [];

  for (let i = 0; i < items.length; i += batchSize) {
    const batch = items.slice(i, i + batchSize);
    const batchResults = await Promise.all(batch.map(requestFn));
    results.push(...batchResults);
  }

  return results;
}

// Fetch 100 products, 5 at a time
const productIds = Array.from({ length: 100 }, (_, i) => i + 1);
const products = await batchRequests(productIds, (id) =>
  api.get(`/products/${id}`).then((r) => r.data)
);
```

---

## W — Why It Matters

- Sequential requests for independent data is one of the easiest performance optimizations to make — switching to `Promise.all` can cut page load time in half.
- `Promise.all` vs `Promise.allSettled` is a common React/performance interview question.
- `axios.all` was removed in Axios v1 — using it on a v1 project causes runtime errors. Knowing to use native `Promise.all` is important.
- Controlled concurrency (batching) prevents rate limiting when loading many items — a real-world API constraint.

---

## I — Interview Q&A

### Q1: When would you use `Promise.all` vs `Promise.allSettled`?

**A:** `Promise.all` when all requests are equally necessary — fail if any fail. `Promise.allSettled` when requests have different priorities — a failed non-critical request shouldn't break the whole page. For a dashboard: user profile is critical (use `Promise.all` or handle separately), notification count is optional (use `allSettled`).

### Q2: Is `axios.all` available in Axios v1?

**A:** No. It was removed in Axios v1. Use the native `Promise.all` instead. They're functionally identical except `axios.all` was just a thin wrapper.

### Q3: How would you limit concurrent requests to avoid rate limiting?

**A:** Use a batching function that slices the request array into chunks and `await`s each `Promise.all` batch before starting the next. For example, processing 5 requests at a time: loop over the array in steps of 5, `Promise.all` each slice, push results, continue.

---

## C — Common Pitfalls + Fix

### ❌ Pitfall: Using sequential awaits for independent requests

```js
const user = (await api.get("/user")).data; // 300ms
const products = (await api.get("/products")).data; // 300ms
const orders = (await api.get("/orders")).data; // 300ms
// Total: 900ms ← all independent, wasted time
```

**Fix:**

```js
const [userRes, productsRes, ordersRes] = await Promise.all([
  api.get("/user"),
  api.get("/products"),
  api.get("/orders"),
]);
// Total: ~300ms ✅
```

### ❌ Pitfall: `Promise.all` losing successful results when one fails

```js
const [a, b, c] = await Promise.all([
  api.get("/critical"), // succeeds
  api.get("/optional"), // fails → throws!
  api.get("/optional2"), // succeeds
]);
// Catch fires, a and c data lost
```

**Fix:** If some requests are optional, use `allSettled`:

```js
const [aRes, bRes, cRes] = await Promise.allSettled([...])
const a = aRes.status === 'fulfilled' ? aRes.value.data : null
```

### ❌ Pitfall: Firing 1000 simultaneous requests

```js
const ids = Array.from({ length: 1000 }, (_, i) => i + 1);
const all = await Promise.all(ids.map((id) => api.get(`/items/${id}`)));
// 1000 simultaneous requests → rate limited, browser connection limit hit
```

**Fix:** Use batch concurrency control — 5–10 at a time.

---

## K — Coding Challenge + Solution

### Challenge

Write `loadDashboard(userId)` that fires these requests **concurrently**:

- User profile (critical)
- Notifications (optional)
- Recent orders — max 3 (optional)
- Unread message count (optional)

Return `{ user, notifications, orders, messageCount }` — use empty defaults for failed optional requests.

### Solution

```js
import api from "@/lib/api";

async function loadDashboard(userId) {
  // User is critical — separate await so failure propagates
  const { data: user } = await api.get(`/users/${userId}`);

  // Optional requests — fire concurrently, tolerate failures
  const [notifsResult, ordersResult, messagesResult] = await Promise.allSettled(
    [
      api.get(`/users/${userId}/notifications`),
      api.get(`/users/${userId}/orders`, { params: { limit: 3 } }),
      api.get(`/users/${userId}/messages/unread-count`),
    ]
  );

  return {
    user,
    notifications:
      notifsResult.status === "fulfilled" ? notifsResult.value.data : [],
    orders: ordersResult.status === "fulfilled" ? ordersResult.value.data : [],
    messageCount:
      messagesResult.status === "fulfilled"
        ? messagesResult.value.data.count
        : 0,
  };
}
```

---

---
