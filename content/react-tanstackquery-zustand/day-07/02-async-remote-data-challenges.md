# 2 — Async Remote Data Challenges

---

## T — TL;DR

Every async data fetch involves eight unsolved problems: loading state, error handling, caching, staleness, deduplication, background refresh, retry logic, and race conditions. Solving them manually in `useEffect` produces hundreds of lines of boilerplate — per endpoint.

---

## K — Key Concepts

```tsx
// ── The full manual implementation of what TanStack Query does for free ───
// Count how many problems you have to solve yourself:

function useFetchUser(userId: number) {
  const [data,       setData]       = useState<User | null>(null)
  const [isLoading,  setIsLoading]  = useState(false)
  const [error,      setError]      = useState<string | null>(null)
  const [isFetching, setIsFetching] = useState(false)  // background vs initial

  useEffect(() => {
    // Problem 1: Loading state management
    setIsLoading(!data)    // initial load only
    setIsFetching(true)    // always when fetching

    // Problem 2: Race condition — what if userId changes mid-flight?
    let cancelled = false
    const controller = new AbortController()

    fetch(`/api/users/${userId}`, { signal: controller.signal })
      .then(r => {
        // Problem 3: Non-2xx errors don't throw with native fetch
        if (!r.ok) throw new Error(`HTTP ${r.status}`)
        return r.json()
      })
      .then(user => {
        if (!cancelled) {
          setData(user)           // Problem 4: stale data replaced ✅ (barely)
          setIsLoading(false)
          setIsFetching(false)
          setError(null)
        }
      })
      .catch(err => {
        if (!cancelled && err.name !== 'AbortError') {
          setError(err.message)
          setIsLoading(false)
          setIsFetching(false)
          // Problem 5: Retry on failure? You'd need a retry loop here
        }
      })

    return () => { cancelled = true; controller.abort() }
  }, [userId])   // Problem 6: No cache — refetches every time userId changes
                 // Problem 7: No deduplication — two components = two requests
                 // Problem 8: No background sync on window focus

  return { data, isLoading, isFetching, error }
}
// ~50 lines. Multiply by every API endpoint in your app.
// Still missing: retry, cache, dedup, background sync, stale tracking
```

```
── The 8 problems and what TanStack Query does ──────────────────────────────

PROBLEM                    MANUAL SOLUTION        TANSTACK QUERY
─────────────────────────  ─────────────────────  ──────────────────────────
1. Loading state           useState boilerplate   isLoading, isFetching flags
2. Error handling          try/catch + state      error object, isError flag
3. Caching                 manual cache map       automatic by queryKey
4. Staleness               re-fetch always        staleTime config
5. Deduplication           complex ref tracking   automatic by queryKey
6. Background sync         window event + effect  refetchOnWindowFocus: true
7. Retry on failure        retry loop             retry: 3 (default)
8. Race conditions         AbortController        built-in cancellation
```

---

## W — Why It Matters

- The manual solution is not just verbose — it's incomplete. Most teams skip retry, deduplication, and background sync, shipping a worse experience than TanStack Query's defaults provide out of the box.
- Race conditions (stale response arriving after a newer one) are subtle bugs that only appear under specific timing — TanStack Query handles them automatically.
- Deduplication is the silent winner: if a header, sidebar, and main content all call `useQuery({ queryKey: ['user'] })`, only **one** network request fires. With manual fetch, you get three.

---

## I — Interview Q&A

### Q: What problems does TanStack Query solve that manual `fetch` in `useEffect` doesn't?

**A:** Manual fetch handles basic data retrieval but misses: (1) **Caching** — no cache means refetching on every mount, even when data is seconds old. (2) **Deduplication** — multiple components fetching the same URL fire multiple requests. (3) **Background sync** — when a user returns to the tab, stale data isn't refreshed. (4) **Retry** — failed requests are not automatically retried. (5) **Stale tracking** — there's no concept of "this data is stale after 30 seconds." (6) **Race condition handling** — a slow request from a previous `userId` can overwrite the response for the current one. (7) **Shared loading/error state** — each component manages its own copy of `isLoading`, causing inconsistency. TanStack Query provides all of these with a three-line setup.

---

## C — Common Pitfalls + Fix

### ❌ The race condition — stale response overwrites current data

```tsx
// ❌ Classic race condition
function UserProfile({ userId }: { userId: number }) {
  const [user, setUser] = useState<User | null>(null)

  useEffect(() => {
    // userId changes 1 → 2 before request for 1 completes
    // Request for userId=1 resolves AFTER userId=2's response
    // → user profile shows userId=1 data while userId=2 is selected ❌
    fetch(`/api/users/${userId}`)
      .then(r => r.json())
      .then(setUser)   // no race protection
  }, [userId])
}

// ✅ TanStack Query: race conditions handled automatically
// Previous query for userId=1 is cancelled when userId changes to 2
function UserProfileFixed({ userId }: { userId: number }) {
  const { data: user } = useQuery({
    queryKey: ['user', userId],
    queryFn: ({ signal }) =>   // signal is provided by TanStack Query ✅
      fetch(`/api/users/${userId}`, { signal }).then(r => r.json()),
  })
  return <div>{user?.name}</div>
}
```

---

## K — Coding Challenge + Solution

### Challenge

List all the things wrong with this fetch implementation and write what the TanStack Query equivalent looks like.

```tsx
function OrderHistory({ userId }: { userId: number }) {
  const [orders, setOrders] = useState([])
  useEffect(() => {
    fetch(`/api/orders?user=${userId}`)
      .then(r => r.json())
      .then(setOrders)
  }, [])
}
```

### Solution

```tsx
// Problems identified:
// 1. [] dep array — never re-fetches when userId changes (stale closure)
// 2. No loading state — user sees nothing while fetching
// 3. No error handling — fetch failure is silently ignored
// 4. No HTTP error check — 404/500 still calls setOrders with error HTML
// 5. No AbortController — race condition if userId changes
// 6. No cache — re-fetches on every mount
// 7. No retry — one failure = permanent empty state

// ✅ TanStack Query equivalent — all 7 problems solved
import { useQuery } from '@tanstack/react-query'

async function fetchOrders(userId: number, signal: AbortSignal) {
  const res = await fetch(`/api/orders?user=${userId}`, { signal })
  if (!res.ok) throw new Error(`Failed: ${res.status}`)
  return res.json() as Promise<Order[]>
}

function OrderHistory({ userId }: { userId: number }) {
  const { data: orders = [], isLoading, error } = useQuery({
    queryKey:  ['orders', userId],   // re-fetches when userId changes ✅
    queryFn:   ({ signal }) => fetchOrders(userId, signal),
    // Defaults: retry 3×, refetchOnWindowFocus, staleTime 0
  })

  if (isLoading) return <p>Loading orders…</p>
  if (error)     return <p>Error: {(error as Error).message}</p>
  return <ul>{orders.map(o => <li key={o.id}>{o.total}</li>)}</ul>
}
```

---

---
