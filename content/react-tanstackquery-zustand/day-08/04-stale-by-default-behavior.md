# 4 — Stale-by-Default Behavior

---

## T — TL;DR

By default, every query is **immediately stale** after it resolves (`staleTime: 0`). A stale query is eligible to be refetched whenever a refetch trigger fires (mount, focus, reconnect). Stale doesn't mean gone — the cached data is still served instantly while the background refetch runs.

---

## K — Key Concepts

```
── The stale-while-revalidate model ─────────────────────────────────────────

FETCH SUCCEEDS
  ↓
Data stored in cache: status=success, data=Result, dataUpdatedAt=now
  ↓
staleTime timer starts
  ↓
[During staleTime] → query is FRESH
  → refetch triggers (mount, focus, reconnect) are IGNORED
  → component re-mount serves cached data instantly, no network request
  ↓
[After staleTime expires] → query is STALE
  → refetch triggers ARE honoured
  → on trigger: show cached data immediately + fetch in background
  → when fresh data arrives: update cache → re-render if data changed
```

```tsx
// ── staleTime: 0 (default) — always refetch on any trigger ───────────────
const { data } = useQuery({
  queryKey: ['users'],
  queryFn:  getUsers,
  // staleTime: 0 (default)
  // Users unmount, remount → immediate background refetch ✅
  // Tab loses focus, regains → immediate background refetch ✅
})

// ── staleTime > 0 — serve from cache, skip refetch during fresh window ────
const { data } = useQuery({
  queryKey: ['countries'],    // rarely changes — static reference data
  queryFn:  getCountries,
  staleTime: Infinity,        // never stale — fetch once per session
})

const { data } = useQuery({
  queryKey: ['user', userId],
  queryFn:  ({ signal }) => getUser(userId, signal),
  staleTime: 1000 * 60 * 5,  // fresh for 5 min — skip refetch if recent
})
```

```tsx
// ── Observing stale status ────────────────────────────────────────────────
const { data, isStale, dataUpdatedAt } = useQuery({
  queryKey: ['products'],
  queryFn:  getProducts,
  staleTime: 1000 * 30,
})

// isStale: true when now > dataUpdatedAt + staleTime
// dataUpdatedAt: timestamp of last successful fetch (milliseconds)

return (
  <div>
    <ul>{/* products */}</ul>
    {isStale && (
      <span style={{ fontSize: 11, color: '#888' }}>
        Last updated {Math.round((Date.now() - dataUpdatedAt) / 1000)}s ago
      </span>
    )}
  </div>
)
```

---

## W — Why It Matters

- "Stale" does NOT mean "empty" or "unavailable" — it means "eligible for a background refresh." The user still sees data instantly; the refresh happens silently.
- `staleTime: 0` is conservative and safe for high-consistency requirements (financial data, notifications). `staleTime: Infinity` is appropriate for truly static data (country codes, enum lists). Most app data lives between these extremes.
- The stale-while-revalidate model is the reason TanStack Query feels "instant" — you never wait for a fetch when cached (even stale) data exists; the UI updates only if the fresh fetch returns different data.

---

## I — Interview Q&A

### Q: What does "stale" mean in TanStack Query and what happens when a query becomes stale?

**A:** A query is "stale" when the time since it was last fetched exceeds its `staleTime` configuration. The default `staleTime` is 0, meaning queries are stale immediately after they resolve. When a query is stale, it becomes **eligible** for a background refetch — but it doesn't immediately refetch. It waits for a trigger: a component mounting, the window gaining focus, or the network reconnecting. When a trigger fires on a stale query: the cached data is served immediately to the component (no loading flash), and a background network request starts. If the response differs from the cache, the component re-renders with the fresh data. If the response is identical (structural sharing), no re-render occurs. The user sees instant response while silently getting fresh data.

---

## C — Common Pitfalls + Fix

### ❌ Setting `staleTime: Infinity` on data that can change

```tsx
// ❌ User profile marked as never-stale — won't refresh when user updates their name
function UserProfile({ userId }: { userId: number }) {
  const { data: user } = useQuery({
    queryKey: ['user', userId],
    queryFn:  ({ signal }) => getUser(userId, signal),
    staleTime: Infinity,   // ❌ user profile CAN change — never refetched
  })
  // After user updates their name in settings, this component shows old name ❌
}

// ✅ Reasonable staleTime + invalidate after mutations
function UserProfileFixed({ userId }: { userId: number }) {
  const { data: user } = useQuery({
    queryKey: ['user', userId],
    queryFn:  ({ signal }) => getUser(userId, signal),
    staleTime: 1000 * 60 * 5,   // 5 min — reasonable for profiles
  })
  // After profile mutation: queryClient.invalidateQueries(userKeys.detail(userId))
  // → immediately refetches regardless of staleTime ✅
}

// ✅ staleTime: Infinity only for truly static data
const { data: countries } = useQuery({
  queryKey: ['countries'],
  queryFn:  getCountries,
  staleTime: Infinity,   // ✅ country list doesn't change mid-session
})
```

---

## K — Coding Challenge + Solution

### Challenge

Configure appropriate `staleTime` values for these real-world queries and explain the reasoning for each.

### Solution

```tsx
// 1. Current authenticated user (/api/me)
useQuery({
  queryKey: ['me'],
  queryFn:  ({ signal }) => getCurrentUser(signal),
  staleTime: 1000 * 60 * 10,   // 10 min — auth session is stable, expensive to refetch
  // On logout/profile update: invalidate manually
})

// 2. Live stock price for a ticker
useQuery({
  queryKey: ['stock', ticker],
  queryFn:  ({ signal }) => getStockPrice(ticker, signal),
  staleTime: 0,                  // 0 — always refetch; stale price = bad data
  refetchInterval: 1000 * 15,    // also poll every 15s for live feel
})

// 3. List of countries for a <select> dropdown
useQuery({
  queryKey: ['countries'],
  queryFn:  getCountries,
  staleTime: Infinity,           // never stale — countries don't change in a session
  gcTime:    Infinity,           // keep in cache forever
})

// 4. Dashboard notifications (real-time feel)
useQuery({
  queryKey: ['notifications', userId],
  queryFn:  ({ signal }) => getNotifications(userId, signal),
  staleTime: 0,                  // always stale → refetch on focus/mount
  refetchOnWindowFocus: true,    // explicit (already default)
})

// 5. Product catalog (browsing, not purchasing)
useQuery({
  queryKey: ['products', { category }],
  queryFn:  ({ signal }) => getProducts(category, signal),
  staleTime: 1000 * 60 * 5,     // 5 min — catalog updates infrequently
})

// 6. User's own cart contents
useQuery({
  queryKey: ['cart', userId],
  queryFn:  ({ signal }) => getCart(userId, signal),
  staleTime: 0,                  // always stale — cart changes from multiple devices
  refetchOnWindowFocus: true,
})
```

---

---
