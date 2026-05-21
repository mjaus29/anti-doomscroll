# 7 — staleTime + gcTime

---

## T — TL;DR

`staleTime` controls when data becomes **eligible for refetch** (freshness window). `gcTime` controls when **unused cached data is deleted from memory** (garbage collection). They serve different purposes — one governs refetch behavior, the other governs memory.

---

## K — Key Concepts

```
── staleTime vs gcTime visual ────────────────────────────────────────────────

FETCH SUCCEEDS at T=0
│
├── [T=0 to T=staleTime] — FRESH
│     → refetch triggers ignored
│     → cache served instantly on mount
│
├── [T=staleTime] — BECOMES STALE
│     → refetch triggers now honored
│     → background refetch on next trigger
│
└── COMPONENT UNMOUNTS at T=X
      │
      ├── [T=X to T=X+gcTime] — INACTIVE (cached but unused)
      │     → data stays in memory
      │     → remount = instant load from cache (then background refetch if stale)
      │
      └── [T=X+gcTime] — GARBAGE COLLECTED
            → cache entry deleted
            → next mount = loading state again
```

```tsx
// ── Default values ────────────────────────────────────────────────────────
// staleTime: 0      (immediately stale after fetch)
// gcTime:    300_000 (5 minutes inactive cache survival)

// ── Per-query configuration ────────────────────────────────────────────────
// Real-time ticker: always stale, short cache (don't keep stale prices)
useQuery({
  queryKey: ['price', ticker],
  queryFn:  ({ signal }) => getPrice(ticker, signal),
  staleTime: 0,
  gcTime:    1000 * 30,   // remove from cache 30s after unmount (stale price = misleading)
})

// Static reference data: never stale, keep forever
useQuery({
  queryKey: ['countries'],
  queryFn:  getCountries,
  staleTime: Infinity,
  gcTime:    Infinity,    // keep for the entire session
})

// User profile: 5 min fresh, 10 min cache
useQuery({
  queryKey: ['user', userId],
  queryFn:  ({ signal }) => getUser(userId, signal),
  staleTime: 1000 * 60 * 5,   // fresh 5 min
  gcTime:    1000 * 60 * 10,  // cached 10 min after unmount
})

// Search results: 30s fresh (same search likely has same results), 1 min cache
useQuery({
  queryKey: ['search', query],
  queryFn:  ({ signal }) => search(query, signal),
  staleTime: 1000 * 30,
  gcTime:    1000 * 60,
})
```

```tsx
// ── staleTime shorter than gcTime: the stale-while-revalidate sweet spot ──
// gcTime > staleTime means:
//   After staleTime: data is stale but STILL in cache
//   On remount: serve stale data instantly → background refetch → update if changed
//   User never sees a loading state for recently visited data ✅

// ❌ staleTime > gcTime: pointless (data gone before it becomes stale)
useQuery({
  staleTime: 1000 * 60 * 10,  // 10 min fresh
  gcTime:    1000 * 60 * 5,   // 5 min cache — gone before staleTime expires ❌
})
// Data deleted from cache before it even becomes stale — staleTime is wasted
// Rule: staleTime should ALWAYS be ≤ gcTime
```

---

## W — Why It Matters

- `gcTime` is the key to "instant navigation back" — if a user browses product A, goes to product B, and returns to A within `gcTime`, product A loads instantly from cache (stale but fast), then silently refetches.
- The `staleTime ≤ gcTime` constraint is a correctness rule — violating it means data is removed from cache before it would even be eligible to refetch, wasting the fresh window entirely.
- Setting `gcTime: 0` immediately deletes the cache on unmount — useful for sensitive data (health records, private messages) that shouldn't persist after the user navigates away.

---

## I — Interview Q&A

### Q: Can you explain the relationship between `staleTime` and `gcTime` and give an example of how to configure them together?

**A:** They control two independent timers. `staleTime` starts when data is fetched and determines how long it's "fresh" — during this period, refetch triggers are ignored. `gcTime` starts when the last component subscribing to the query unmounts and determines how long the data stays in memory. For a typical dashboard widget: set `staleTime: 60_000` (1 minute fresh — don't spam the API when the widget re-renders) and `gcTime: 300_000` (5 minutes cached after unmount — navigating away and back shows instant data). The invariant: `staleTime` must be ≤ `gcTime`. If data is deleted (gcTime) before it becomes stale (staleTime), the fresh window is wasted and the next mount always shows a loading state. For sensitive data, set `gcTime: 0` to remove data from memory the moment no component is subscribed.

---

## C — Common Pitfalls + Fix

### ❌ Confusing gcTime with staleTime — wrong timer for the wrong problem

```tsx
// ❌ Trying to solve "don't refetch too often" with gcTime
useQuery({
  queryKey: ['products'],
  queryFn:  getProducts,
  gcTime: 1000 * 60 * 5,   // ❌ this doesn't prevent refetching — it's about deletion
  // staleTime: 0 (default) → still refetches on every mount/focus ❌
})

// gcTime only controls how long the cache entry lives after unmount.
// It does NOT prevent refetches while the component is mounted.

// ✅ Use staleTime to control refetch frequency
useQuery({
  queryKey: ['products'],
  queryFn:  getProducts,
  staleTime: 1000 * 60 * 5,   // ✅ 5 min fresh → won't refetch for 5 min
  gcTime:    1000 * 60 * 10,  // ✅ 10 min cache after unmount
})

// ❌ Setting gcTime: 0 accidentally — cache deleted immediately on unmount
useQuery({
  queryKey: ['list'],
  queryFn:  getList,
  gcTime: 0,   // ❌ for non-sensitive data — causes loading flash on every navigation
})
// Only use gcTime: 0 for data that MUST NOT be cached (sensitive PII, auth tokens)
```

---

## K — Coding Challenge + Solution

### Challenge

Set `staleTime` and `gcTime` for these five query types with reasoning:

1. Current user session info
2. Real-time chat messages for the active room
3. List of available languages (i18n)
4. User's recent activity feed
5. Product inventory levels

### Solution

```tsx
// 1. Current user session — changes rarely, expensive auth check
const sessionQuery = {
  queryKey: ['session'],
  queryFn:  ({ signal }: { signal: AbortSignal }) => getSession(signal),
  staleTime: 1000 * 60 * 15,   // 15 min fresh — auth sessions are stable
  gcTime:    1000 * 60 * 30,   // 30 min cache — keep alive across navigation
  // On logout: invalidate explicitly
}

// 2. Real-time chat messages — live data, always fresh needed
const chatQuery = (roomId: string) => ({
  queryKey: ['chat', roomId, 'messages'],
  queryFn:  ({ signal }: { signal: AbortSignal }) => getChatMessages(roomId, signal),
  staleTime: 0,                 // always stale — messages come in fast
  gcTime:    1000 * 30,         // 30s cache — stale chat history is misleading
  refetchInterval: 3000,        // poll every 3s for near-real-time feel
})

// 3. Available languages — static reference data
const languagesQuery = {
  queryKey: ['languages'],
  queryFn:  getLanguages,
  staleTime: Infinity,          // never stale — doesn't change mid-session
  gcTime:    Infinity,          // keep forever — tiny payload, no reason to GC
}

// 4. Activity feed — semi-real-time, user checks periodically
const activityQuery = (userId: number) => ({
  queryKey: ['activity', userId],
  queryFn:  ({ signal }: { signal: AbortSignal }) => getActivity(userId, signal),
  staleTime: 1000 * 60 * 2,    // 2 min fresh — activity updates every few minutes
  gcTime:    1000 * 60 * 5,    // 5 min cache — user browses away and returns often
  refetchOnWindowFocus: true,   // refresh when they return to the tab
})

// 5. Inventory levels — changes with purchases, time-sensitive
const inventoryQuery = (productId: number) => ({
  queryKey: ['inventory', productId],
  queryFn:  ({ signal }: { signal: AbortSignal }) => getInventory(productId, signal),
  staleTime: 1000 * 60 * 1,    // 1 min fresh — inventory moves slowly for most items
  gcTime:    1000 * 60 * 5,    // 5 min cache
  refetchOnWindowFocus: true,   // critical on purchase page — focus refetch
})
```

---

---
