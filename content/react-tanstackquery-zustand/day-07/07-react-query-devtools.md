# 7 — React Query DevTools

---

## T — TL;DR

React Query DevTools is a panel that shows every query in your cache: its status, data, stale time, observers, and activity. It's the single best tool for debugging TanStack Query — install it before writing your first `useQuery`.

---

## K — Key Concepts

```tsx
// ── Installation ──────────────────────────────────────────────────────────
// npm install @tanstack/react-query-devtools

import { ReactQueryDevtools } from '@tanstack/react-query-devtools'

// Add inside QueryClientProvider, at the end of your app root
function Root() {
  return (
    <QueryClientProvider client={queryClient}>
      <App />
      {/* Only renders in development — tree-shaken from production builds */}
      <ReactQueryDevtools
        initialIsOpen={false}        // collapsed by default
        buttonPosition="bottom-left" // where the toggle button sits
      />
    </QueryClientProvider>
  )
}
```

```
── What the DevTools panel shows ────────────────────────────────────────────

Query list (left panel):
  ● Fresh (green)    — within staleTime, no refetch needed
  ● Stale (yellow)   — past staleTime, eligible for refetch
  ● Fetching (blue)  — network request in flight
  ● Paused (purple)  — offline or paused
  ● Inactive (gray)  — no components subscribed, will be GC'd

Click any query to see:
  → Query key
  → Status and last updated timestamp
  → Number of observers (components subscribed)
  → Cached data (full JSON tree)
  → Actions: Refetch, Invalidate, Reset, Remove
```

```
── DevTools as a debugging workflow ─────────────────────────────────────────

Problem: "Why is my component not showing fresh data?"
  → DevTools: find the query, check status
  → Status = Fresh? → staleTime hasn't expired → set staleTime lower or Invalidate
  → Status = Stale? → check refetchOnWindowFocus, try manual Refetch

Problem: "Why is a request firing too often?"
  → DevTools: watch the query while interacting
  → Turns blue repeatedly? → check if queryKey contains an unstable reference
  → (new object/array in queryKey = new key on every render = re-fetch loop)

Problem: "Why is my query not running?"
  → DevTools: check observers count
  → 0 observers = no components subscribed → check enabled flag
  → Check if QueryClientProvider wraps the component

Problem: "Is the data I'm displaying stale?"
  → DevTools: color of the query
  → Yellow = stale, will refetch on next trigger
  → Click Invalidate to force immediate refetch
```

---

## W — Why It Matters

- Seeing queries turn from yellow (stale) to blue (fetching) to green (fresh) makes the cache lifecycle concrete — it's far more educational than any documentation.
- The "number of observers" field reveals deduplication in action — 3 components subscribed to `['users']` but only 1 network request is visible in Network tab.
- The manual Refetch, Invalidate, and Remove buttons let you test your component's response to state changes without writing test code — invaluable during development.

---

## I — Interview Q&A

### Q: What information does the React Query DevTools show and how do you use it for debugging?

**A:** The DevTools panel shows every active query in the cache with color-coded status: green (fresh — within staleTime), yellow (stale — eligible for refetch), blue (fetching — request in flight), and gray (inactive — no subscribers). Clicking a query reveals its full cached data, observer count, and timestamp. For debugging: if data isn't refreshing, check if the query is Fresh (staleTime too long) and use Invalidate to force a refetch. If a query fires too often, watch the query key — an unstable object reference in the key creates a new cache entry on every render, triggering constant refetches. If a query never runs, check the observer count and the `enabled` flag. The DevTools also prove deduplication — multiple components can subscribe but only one network request appears.

---

## C — Common Pitfalls + Fix

### ❌ Unstable query key causing constant refetches — visible in DevTools

```tsx
// ❌ Object created inline in queryKey — new reference every render
function UserSearch({ role, limit }: { role: string; limit: number }) {
  const { data } = useQuery({
    // New object on every render → new queryKey → cache miss → new fetch ❌
    queryKey: ['users', { role, limit }],   // wait — this is actually fine!
    queryFn:  ({ signal }) => searchUsers({ role, limit }, signal),
  })
  // TanStack Query serializes keys with JSON.stringify — {role,limit} is stable ✅
  // This is FINE — TanStack Query compares keys by value, not reference
}

// ❌ Real problem: function or Date in queryKey
function BadQuery() {
  const { data } = useQuery({
    queryKey: ['data', new Date()],    // ❌ new Date every render → infinite refetch
    queryFn:  getData,
  })
}

// ❌ Object with non-serializable values
function AlsoBad() {
  const filter = useRef({ role: 'admin' })
  const { data } = useQuery({
    queryKey: ['users', filter],        // ❌ ref object — bad pattern
    queryFn:  getData,
  })
}

// ✅ Keep queryKeys serializable and stable — primitives and plain objects
function GoodQuery({ role }: { role: string }) {
  const [page, setPage] = useState(1)
  const { data } = useQuery({
    queryKey: ['users', role, page],    // ✅ primitives only
    queryFn:  ({ signal }) => getUsers(role, page, signal),
  })
}
```

---

## K — Coding Challenge + Solution

### Challenge

Set up DevTools correctly and write a component that lets you observe query lifecycle: show current status, staleTime countdown, and observer count using DevTools alongside.

### Solution

```tsx
// main.tsx — setup
import { QueryClientProvider } from '@tanstack/react-query'
import { ReactQueryDevtools }   from '@tanstack/react-query-devtools'
import { queryClient }          from './query-client'

export function Root() {
  return (
    <QueryClientProvider client={queryClient}>
      <App />
      <ReactQueryDevtools initialIsOpen={true} buttonPosition="bottom-right" />
    </QueryClientProvider>
  )
}

// Component to observe in DevTools
function QueryObserver() {
  const [enabled, setEnabled] = useState(true)

  const result = useQuery({
    queryKey: ['observable-demo'],
    queryFn:  async ({ signal }) => {
      const res = await fetch('https://jsonplaceholder.typicode.com/todos/1', { signal })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      return res.json()
    },
    enabled,
    staleTime: 1000 * 10,   // 10 seconds — watch it go green → yellow in DevTools
    gcTime:    1000 * 20,   // 20 seconds cache — watch it gray out after disable
  })

  const qc = useQueryClient()

  return (
    <div>
      <h2>Query Lifecycle Observer</h2>
      <p>Status: <strong>{result.status}</strong></p>
      <p>isFetching: <strong>{String(result.isFetching)}</strong></p>
      <p>isStale: <strong>{String(result.isStale)}</strong></p>
      <p>Data: {result.data?.title}</p>

      <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
        <button onClick={() => result.refetch()}>Refetch</button>
        <button onClick={() => qc.invalidateQueries({ queryKey: ['observable-demo'] })}>
          Invalidate
        </button>
        <button onClick={() => setEnabled(e => !e)}>
          {enabled ? 'Disable' : 'Enable'} query
        </button>
      </div>
      <p style={{ fontSize: 12 }}>
        Open DevTools panel → watch 'observable-demo' change color
      </p>
    </div>
  )
}
```

---

---
