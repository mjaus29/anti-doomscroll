# 3 — QueryClient + QueryClientProvider

---

## T — TL;DR

`QueryClient` is the **central cache and coordinator** for all queries in your app. `QueryClientProvider` makes it available to the entire component tree. Create one `QueryClient` instance per app — never inside a component.

---

## K — Key Concepts

```tsx
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

// ── Create QueryClient — once, at module level ────────────────────────────
// ❌ Inside a component — new client on every render, cache lost
function AppBad() {
  const queryClient = new QueryClient()   // ❌
  return <QueryClientProvider client={queryClient}>…</QueryClientProvider>
}

// ✅ Outside the component — stable across renders
const queryClient = new QueryClient()   // ✅ module-level singleton

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <Router />
    </QueryClientProvider>
  )
}
```

```tsx
// ── QueryClient configuration ─────────────────────────────────────────────
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime:             1000 * 60 * 5,  // 5 min: data fresh for 5 minutes
      gcTime:                1000 * 60 * 10, // 10 min: cache removed after 10 min inactive
      retry:                 3,              // retry failed queries 3 times
      retryDelay:            attemptIndex => Math.min(1000 * 2 ** attemptIndex, 30000),
      refetchOnWindowFocus:  true,           // refetch when tab regains focus
      refetchOnReconnect:    true,           // refetch when network reconnects
      refetchOnMount:        true,           // refetch when component mounts if stale
    },
    mutations: {
      retry: 0,   // mutations don't retry by default
    },
  },
})
```

```tsx
// ── Key QueryClient options explained ────────────────────────────────────
//
// staleTime (default: 0):
//   How long fetched data is considered "fresh"
//   During fresh period: no refetch, cached data served immediately
//   0 = always stale = always eligible for refetch on mount/focus
//   60_000 = fresh for 1 minute
//
// gcTime / cacheTime (default: 5 min):
//   How long UNUSED cached data is kept in memory
//   After all components unmount, the cache entry lives this long
//   Then it's garbage collected
//   Useful: navigate away and back → instant load from cache
//
// retry (default: 3):
//   Number of times to retry a failed query before showing error
//   retryDelay: exponential backoff by default
//
// refetchOnWindowFocus (default: true):
//   Refetch stale queries when the browser window/tab regains focus
//   Simulates real-time data without WebSockets
```

```tsx
// ── The QueryClient as a programmatic API ────────────────────────────────
import { useQueryClient } from '@tanstack/react-query'

function SomeComponent() {
  const qc = useQueryClient()

  // Invalidate: mark query stale + trigger background refetch
  function handleMutation() {
    qc.invalidateQueries({ queryKey: ['products'] })
  }

  // Prefetch: load data before the user navigates to it
  function handleHover() {
    qc.prefetchQuery({
      queryKey: ['product', 42],
      queryFn:  () => fetchProduct(42),
    })
  }

  // Set data directly: optimistic updates or seeding from a parent response
  function handleSeedCache(users: User[]) {
    qc.setQueryData(['users'], users)
  }

  // Read cache without subscribing
  const cached = qc.getQueryData<User[]>(['users'])
}
```

---

## W — Why It Matters

- The `QueryClient` is the cache — creating it inside a component (the most common mistake) destroys the cache on every render and defeats the entire point of TanStack Query.
- `staleTime` is the most impactful config knob: `staleTime: 0` means "always re-fetch on focus/mount" (correct for real-time data), `staleTime: Infinity` means "never re-fetch automatically" (correct for static reference data like countries list).
- `useQueryClient()` inside components is how you programmatically interact with the cache — `invalidateQueries` after a mutation is the canonical post-write refetch pattern.

---

## I — Interview Q&A

### Q: What is `staleTime` and how does it differ from `gcTime`?

**A:** `staleTime` controls how long data is considered "fresh" after being fetched. During the stale period, TanStack Query serves the cached data immediately without background refetching — even on component mount or window focus. After the stale time expires, the data is considered "stale" and will be refetched in the background on next use while still showing the cached value. `gcTime` (garbage collection time) controls how long **unused** data stays in the cache after the last component subscribed to it unmounts. After `gcTime`, the cache entry is deleted — the next mount will show a loading state. Key relationship: `staleTime` ≤ `gcTime` is the typical setup — data can be stale (eligible to refetch) but still cached (available as a fallback while refetching).

---

## C — Common Pitfalls + Fix

### ❌ Wrapping only part of the app in the provider

```tsx
// ❌ QueryClientProvider too low — components outside can't use useQuery
function App() {
  return (
    <div>
      <Header />   {/* ❌ can't use useQuery — outside the provider */}
      <QueryClientProvider client={queryClient}>
        <MainContent />
      </QueryClientProvider>
      <Footer />   {/* ❌ can't use useQuery — outside the provider */}
    </div>
  )
}

// ✅ Wrap the entire app — provider at the root
function AppFixed() {
  return (
    <QueryClientProvider client={queryClient}>
      <Header />         {/* ✅ can use useQuery */}
      <MainContent />    {/* ✅ */}
      <Footer />         {/* ✅ */}
    </QueryClientProvider>
  )
}
```

---

## K — Coding Challenge + Solution

### Challenge

Set up a `QueryClient` with: 5-minute stale time for all queries, 10-minute cache, retry 2 times with exponential backoff, and disable `refetchOnWindowFocus` for development.

### Solution

```tsx
// query-client.ts
import { QueryClient } from '@tanstack/react-query'

const isDev = process.env.NODE_ENV === 'development'

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime:            1000 * 60 * 5,    // 5 min fresh
      gcTime:               1000 * 60 * 10,   // 10 min in cache after unmount
      retry:                2,
      retryDelay:           (attempt) => Math.min(1000 * 2 ** attempt, 15_000),
      refetchOnWindowFocus: !isDev,           // noisy in dev ✅
      refetchOnReconnect:   true,
    },
  },
})

// main.tsx
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClient } from './query-client'
import { ReactQueryDevtools } from '@tanstack/react-query-devtools'

function Root() {
  return (
    <QueryClientProvider client={queryClient}>
      <App />
      {isDev && <ReactQueryDevtools initialIsOpen={false} />}
    </QueryClientProvider>
  )
}
```

---

---
