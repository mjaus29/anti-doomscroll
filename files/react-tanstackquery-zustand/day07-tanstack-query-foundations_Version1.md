
# 📅 Day 7 — TanStack Query Foundations

> **Goal:** Replace manual fetch-in-effect patterns with TanStack Query — server state, caching, loading/error/success handling done right.
> **Format:** Each subtopic = 5–15 min. Do one. Stop. Come back.
> **Stack:** React 19.2.5 · TypeScript 6.0 · @tanstack/react-query 5.100.1

---

## 📋 Day 7 Subtopic Overview

| # | Subtopic | Time |
|---|----------|------|
| 1 | Server State vs Client State | 8 min |
| 2 | Async Remote Data Challenges | 10 min |
| 3 | QueryClient + QueryClientProvider | 10 min |
| 4 | Query Functions | 10 min |
| 5 | useQuery — Core API | 12 min |
| 6 | Loading, Error, Success States | 12 min |
| 7 | React Query DevTools | 8 min |
| 8 | Replacing Manual fetch-in-effect Patterns | 12 min |

---

---

# 1 — Server State vs Client State

---

## T — TL;DR

**Client state** lives in the browser and you fully control it (form inputs, UI toggles, selected tab). **Server state** lives on a server and is merely a snapshot you borrow (users, posts, orders) — it can change at any time. Managing them identically is the root cause of most async data bugs.

---

## K — Key Concepts

```
── Two fundamentally different kinds of state ────────────────────────────────

CLIENT STATE                        SERVER STATE
─────────────────────────────       ──────────────────────────────────
Lives: in the browser               Lives: on a remote server / database
Owner: you                          Owner: the server
Always fresh: yes                   Always fresh: no — it's a stale snapshot
Source of truth: your code          Source of truth: the database
Examples: isOpen, searchQuery,      Examples: user profile, product list,
          activeTab, formValues              order history, notifications
Tools: useState, useReducer,        Tools: TanStack Query, SWR,
       Zustand                               RTK Query, useSyncExternalStore
```

```tsx
// ── Client state — you own it completely ─────────────────────────────────
const [isMenuOpen, setIsMenuOpen] = useState(false)
const [query, setQuery]           = useState('')
const [theme, setTheme]           = useState<'light' | 'dark'>('light')
// These never go "stale" — they are exactly what you set them to

// ── Server state — you have a snapshot, not the truth ─────────────────────
// Fetched at time T. What if another user updated it at T+30s?
const [users, setUsers] = useState<User[]>([])
useEffect(() => {
  fetch('/api/users').then(r => r.json()).then(setUsers)
}, [])
// Issues with this approach:
// - No cache: refetches on every mount even if you just fetched it
// - No background refresh: data goes stale, user sees outdated info
// - No deduplication: 3 components each fetch the same endpoint = 3 requests
// - No loading/error state machine: you build it yourself every time
// - No retry: a failed fetch just leaves the user with nothing
```

```
── Unique challenges of server state ─────────────────────────────────────────

1. STALE: your snapshot becomes outdated as the server changes
2. SHARED: multiple components need the same data
3. DEDUPLICATION: those components shouldn't each fire a separate request
4. CACHING: fresh data shouldn't be re-fetched needlessly
5. BACKGROUND SYNC: data should refresh when the window regains focus
6. MUTATIONS: writes need to trigger refetches of related queries
7. PAGINATION: partial data needs to be combined correctly
```

---

## W — Why It Matters

- Treating server state like client state (just `useState` + `useEffect`) builds every one of the above challenges manually on every fetch — you reinvent a caching layer, loading states, error boundaries, and refetch logic from scratch.
- TanStack Query's entire API is designed around the server state model — every feature (staleTime, gcTime, refetchOnWindowFocus, retry) directly solves one of these challenges.
- The distinction is the mental shift that makes TanStack Query's defaults feel obvious rather than magical — `staleTime: 0` (always stale) makes sense once you accept that server state is borrowed, not owned.

---

## I — Interview Q&A

### Q: What is the difference between server state and client state?

**A:** Client state is data that originates in the browser — form inputs, UI toggles, selected tabs. You fully control it, it's always current, and it only changes when your code changes it. Server state is data that originates on a server — user profiles, product lists, order history. Your component holds a snapshot borrowed at fetch time. The server can change it independently at any moment, making the snapshot stale. This distinction matters because server state requires a completely different management strategy: caching (avoid redundant fetches), stale tracking (know when to refetch), deduplication (one request for multiple consumers), background sync, retry on failure, and mutation-triggered invalidation. `useState` + `useEffect` handles none of these. TanStack Query handles all of them.

---

## C — Common Pitfalls + Fix

### ❌ Treating server state like client state — stale data and duplicate requests

```tsx
// ❌ Pattern that pretends server state is client state
// — No cache: fetches every time this component mounts
// — No dedup: if two instances mount simultaneously, two requests fire
// — No background sync: data is stale after window focus
function ProductList() {
  const [products, setProducts] = useState<Product[]>([])
  const [loading,  setLoading]  = useState(false)
  const [error,    setError]    = useState<string | null>(null)

  useEffect(() => {
    setLoading(true)
    fetch('/api/products')
      .then(r => r.json())
      .then(data => { setProducts(data); setLoading(false) })
      .catch(err => { setError(err.message); setLoading(false) })
  }, [])   // refetches on every mount — no cache
}

// ✅ TanStack Query handles all of it
import { useQuery } from '@tanstack/react-query'

function ProductListFixed() {
  const { data: products, isLoading, error } = useQuery({
    queryKey: ['products'],
    queryFn: () => fetch('/api/products').then(r => r.json()),
  })
  // Cached, deduplicated, background-synced, retried on failure — automatic ✅
}
```

---

## K — Coding Challenge + Solution

### Challenge

Categorize the following state as **client** or **server** and explain the right tool for each.

```
1. isModalOpen
2. List of orders from /api/orders
3. searchQuery (typed by user)
4. Current user profile from /api/me
5. activeTab
6. Comments on a post (from API)
7. cartItems (local-only, not persisted)
8. Product inventory count (from DB)
```

### Solution

```
State Audit:

1. isModalOpen        → CLIENT   → useState (browser-only, no server involved)
2. orders from API    → SERVER   → useQuery (cache, background sync, retry)
3. searchQuery        → CLIENT   → useState (user input, no server)
4. current user /me   → SERVER   → useQuery (stale after other sessions change it)
5. activeTab          → CLIENT   → useState (UI-only)
6. comments (API)     → SERVER   → useQuery (can be updated by others)
7. cartItems (local)  → CLIENT   → useState / Zustand / localStorage
8. inventory (DB)     → SERVER   → useQuery (changes independently of user)

Rule of thumb:
  "Did this data come from a network request?" → SERVER → TanStack Query
  "Did this data come from user interaction?"  → CLIENT → useState/Zustand
```

---

---

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

# 4 — Query Functions

---

## T — TL;DR

A **query function** is any `async` function that returns data or throws an error. It receives a `QueryFunctionContext` with the `queryKey` and `signal`. Keep query functions pure, typed, and extracted into a dedicated API layer — not inline in `useQuery`.

---

## K — Key Concepts

```tsx
// ── Query function anatomy ────────────────────────────────────────────────
import { QueryFunctionContext } from '@tanstack/react-query'

// The context TanStack passes to your queryFn:
interface QueryFnContext {
  queryKey: readonly unknown[]   // the key for this query
  signal:   AbortSignal          // for cancellation ✅
  pageParam?: unknown            // for infinite queries (later)
}

// Minimal query function
const fetchUser = async (id: number): Promise<User> => {
  const res = await fetch(`/api/users/${id}`)
  if (!res.ok) throw new Error(`HTTP ${res.status}: ${res.statusText}`)
  return res.json()
}
// ⬆ Must THROW on error — TanStack Query can only catch thrown errors
// Fetch doesn't throw on 4xx/5xx — always check res.ok ✅
```

```tsx
// ── Using signal for cancellation ────────────────────────────────────────
// TanStack Query provides an AbortSignal — pass it to fetch
const fetchProducts = async ({
  queryKey, signal
}: QueryFunctionContext): Promise<Product[]> => {
  const [, category] = queryKey as [string, string]   // destructure key

  const res = await fetch(`/api/products?category=${category}`, { signal })
  if (!res.ok) throw new Error(`Failed to fetch products: ${res.status}`)
  return res.json()
}

// Usage
useQuery({
  queryKey: ['products', 'electronics'],
  queryFn:  fetchProducts,   // context (with signal) injected automatically ✅
})
```

```tsx
// ── Recommended: extract to an API layer ──────────────────────────────────
// api/users.ts — all user-related API calls in one place
import type { QueryFunctionContext } from '@tanstack/react-query'

export interface User { id: number; name: string; email: string; role: string }

export async function getUser(id: number, signal?: AbortSignal): Promise<User> {
  const res = await fetch(`/api/users/${id}`, { signal })
  if (!res.ok) throw new Error(`getUser failed: ${res.status}`)
  return res.json()
}

export async function getUsers(signal?: AbortSignal): Promise<User[]> {
  const res = await fetch('/api/users', { signal })
  if (!res.ok) throw new Error(`getUsers failed: ${res.status}`)
  return res.json()
}

export async function getUsersByRole(
  role: string, signal?: AbortSignal
): Promise<User[]> {
  const res = await fetch(`/api/users?role=${role}`, { signal })
  if (!res.ok) throw new Error(`getUsersByRole failed: ${res.status}`)
  return res.json()
}
```

```tsx
// ── Query key factories: collocate keys with fetchers ────────────────────
// query-keys.ts
export const userKeys = {
  all:    ()         => ['users']                        as const,
  lists:  ()         => [...userKeys.all(), 'list']      as const,
  list:   (role: string) => [...userKeys.lists(), role]  as const,
  detail: (id: number)   => [...userKeys.all(), id]      as const,
}

// Usage: consistent, refactorable, namespaced keys
useQuery({ queryKey: userKeys.detail(42), queryFn: ({ signal }) => getUser(42, signal) })
useQuery({ queryKey: userKeys.list('admin'), queryFn: ({ signal }) => getUsersByRole('admin', signal) })

// Invalidate all user queries at once
queryClient.invalidateQueries({ queryKey: userKeys.all() })
// Invalidate just a specific user
queryClient.invalidateQueries({ queryKey: userKeys.detail(42) })
```

---

## W — Why It Matters

- **Checking `res.ok`** is the most critical habit — `fetch` only throws on network failure, not on 4xx/5xx responses. Without the check, TanStack Query receives `{ error: "not found" }` as successful data.
- The `signal` parameter enables automatic query cancellation — when a component unmounts mid-request or the query key changes, TanStack Query calls `signal.abort()`, preventing stale responses.
- Query key factories are a scalability pattern — without them, `invalidateQueries` calls are error-prone string literals scattered throughout the codebase. With them, refactoring a key updates all usages.

---

## I — Interview Q&A

### Q: What must a query function do to work correctly with TanStack Query?

**A:** A query function must: (1) **Return a promise that resolves to the data** — it can be any async function, not just fetch. (2) **Throw an error on failure** — TanStack Query treats thrown errors as query failures; returned error objects are treated as successful data. Since `fetch` doesn't throw on non-2xx responses, you must check `response.ok` and throw manually. (3) **Accept and pass the `signal`** from the `QueryFunctionContext` to fetch (or any cancellable API) — this enables TanStack Query to cancel in-flight requests when the component unmounts or the query key changes. The function can accept the full context object or just the signal; TanStack Query injects the context automatically.

---

## C — Common Pitfalls + Fix

### ❌ Not checking `res.ok` — errors silently appear as data

```tsx
// ❌ fetch doesn't throw on 404/500 — error HTML stored as "data"
const fetchUser = async (id: number) => {
  const res = await fetch(`/api/users/${id}`)
  return res.json()   // 404 → returns { "error": "not found" } as data ❌
  // isError = false, data = { error: "not found" }, isLoading = false
}

// ❌ Axios DOES throw on non-2xx — but response.data needs no json() call
// Don't mix axios and fetch patterns

// ✅ Always check res.ok with fetch
const fetchUserFixed = async (id: number, signal?: AbortSignal): Promise<User> => {
  const res = await fetch(`/api/users/${id}`, { signal })
  if (!res.ok) {
    // Throw with enough context to show a useful error message
    const body = await res.text().catch(() => '')
    throw new Error(`Failed to fetch user ${id}: ${res.status} ${body}`)
  }
  return res.json() as Promise<User>
}
```

---

## K — Coding Challenge + Solution

### Challenge

Build a typed API layer for a `Post` resource with `getPosts`, `getPost(id)`, and `getPostsByAuthor(authorId)`. Include a query key factory. Ensure all functions check `res.ok` and pass `signal`.

### Solution

```tsx
// api/posts.ts
export interface Post {
  id:       number
  title:    string
  body:     string
  authorId: number
  tags:     string[]
  createdAt: string
}

// ── API functions ─────────────────────────────────────────────────────────
export async function getPosts(signal?: AbortSignal): Promise<Post[]> {
  const res = await fetch('/api/posts', { signal })
  if (!res.ok) throw new Error(`getPosts: ${res.status} ${res.statusText}`)
  return res.json()
}

export async function getPost(id: number, signal?: AbortSignal): Promise<Post> {
  const res = await fetch(`/api/posts/${id}`, { signal })
  if (!res.ok) throw new Error(`getPost(${id}): ${res.status}`)
  return res.json()
}

export async function getPostsByAuthor(
  authorId: number, signal?: AbortSignal
): Promise<Post[]> {
  const res = await fetch(`/api/posts?authorId=${authorId}`, { signal })
  if (!res.ok) throw new Error(`getPostsByAuthor(${authorId}): ${res.status}`)
  return res.json()
}

// ── Query key factory ─────────────────────────────────────────────────────
export const postKeys = {
  all:        ()               => ['posts']                           as const,
  lists:      ()               => [...postKeys.all(), 'list']         as const,
  list:       (filters = {})   => [...postKeys.lists(), filters]      as const,
  byAuthor:   (authorId: number) => [...postKeys.lists(), { authorId }] as const,
  details:    ()               => [...postKeys.all(), 'detail']       as const,
  detail:     (id: number)     => [...postKeys.details(), id]         as const,
}

// ── Query function wrappers (signal-aware) ────────────────────────────────
export const postQueries = {
  list:     { queryKey: postKeys.list(),     queryFn: ({ signal }: QueryFnContext) => getPosts(signal) },
  detail:   (id: number) => ({
    queryKey: postKeys.detail(id),
    queryFn:  ({ signal }: QueryFnContext) => getPost(id, signal),
  }),
  byAuthor: (authorId: number) => ({
    queryKey: postKeys.byAuthor(authorId),
    queryFn:  ({ signal }: QueryFnContext) => getPostsByAuthor(authorId, signal),
  }),
}

type QueryFnContext = { signal: AbortSignal }
```

---

---

# 5 — useQuery — Core API

---

## T — TL;DR

`useQuery` subscribes a component to a cached async value. Give it a `queryKey` (cache identifier) and a `queryFn` (how to fetch the data). It returns `{ data, isLoading, isFetching, error, status, refetch }` — a complete state machine for the server data lifecycle.

---

## K — Key Concepts

```tsx
import { useQuery } from '@tanstack/react-query'

// ── Full useQuery API ─────────────────────────────────────────────────────
const {
  data,           // T | undefined — the fetched data
  error,          // Error | null
  status,         // 'pending' | 'error' | 'success'
  isLoading,      // true when: pending + no cached data (initial load)
  isFetching,     // true whenever a fetch is in flight (including background)
  isError,        // true when status === 'error'
  isSuccess,      // true when status === 'success'
  isPending,      // true when status === 'pending' (no data yet)
  isStale,        // true when data is older than staleTime
  dataUpdatedAt,  // timestamp of last successful fetch
  refetch,        // () => void — manually trigger a refetch
  isRefetching,   // true when refetching after already having data
} = useQuery({
  queryKey:             ['users', userId],  // array — determines cache identity
  queryFn:              ({ signal }) => fetchUser(userId, signal),
  enabled:              !!userId,           // don't fetch if userId is falsy
  staleTime:            1000 * 60,          // override default staleTime
  gcTime:               1000 * 60 * 5,      // override default gcTime
  retry:                2,                  // override default retry
  refetchInterval:      1000 * 30,          // poll every 30 seconds
  select:               (data) => data.name, // transform data before returning
  initialData:          cachedUsers,         // seed cache with existing data
  placeholderData:      keepPreviousData,    // keep old data while fetching new
})
```

```tsx
// ── queryKey: the cache identity ──────────────────────────────────────────
// Array — must be serializable, stable references irrelevant (JSON serialized)
// TanStack Query re-fetches whenever the key changes

// Static key: never re-fetches automatically
useQuery({ queryKey: ['products'], queryFn: getProducts })

// Dynamic key: re-fetches when userId changes
useQuery({ queryKey: ['user', userId], queryFn: ({ signal }) => getUser(userId, signal) })

// Key with filters: re-fetches when filter changes
useQuery({
  queryKey: ['products', { category, sortBy, page }],
  queryFn:  ({ signal }) => getProducts({ category, sortBy, page }, signal),
})

// Key ordering matters: ['user', 1] ≠ [1, 'user']
// Consistent factory pattern avoids accidental key collisions
```

```tsx
// ── enabled: conditional queries ─────────────────────────────────────────
function UserDetails({ userId }: { userId: number | null }) {
  const { data: user } = useQuery({
    queryKey: ['user', userId],
    queryFn:  ({ signal }) => getUser(userId!, signal),
    enabled:  userId !== null,   // don't fetch until userId is available ✅
  })
  return user ? <div>{user.name}</div> : null
}

// Dependent query: fetch user, then fetch their posts
function UserWithPosts({ userId }: { userId: number }) {
  const { data: user } = useQuery({
    queryKey: ['user', userId],
    queryFn:  ({ signal }) => getUser(userId, signal),
  })

  const { data: posts } = useQuery({
    queryKey: ['posts', { authorId: user?.id }],
    queryFn:  ({ signal }) => getPostsByAuthor(user!.id, signal),
    enabled:  !!user,   // waits for user query to succeed ✅
  })
}
```

```tsx
// ── select: transform data in the query itself ────────────────────────────
// select runs after every successful fetch AND filters re-renders:
// the component only re-renders if the SELECTED value changed

function ActiveUserCount() {
  const { data: count } = useQuery({
    queryKey: ['users'],
    queryFn:  ({ signal }) => getUsers(signal),
    select:   (users) => users.filter(u => u.active).length,
    // Component only re-renders when the COUNT changes, not when any user changes ✅
  })
  return <p>Active users: {count}</p>
}
```

---

## W — Why It Matters

- `isLoading` vs `isFetching` is a critical distinction: `isLoading` is `true` only on the very first load (no cached data), `isFetching` is `true` any time a request is in flight including background refreshes. Use `isLoading` for skeleton screens, `isFetching` for subtle loading indicators.
- `enabled` is the conditional query gate — dependent queries (fetch B only after A succeeds), auth-gated queries, and debounced search all use `enabled: !!value`.
- `select` is underused and powerful: it transforms data AND optimizes re-renders — a component using `select: d => d.count` re-renders only when the count changes, not when other fields of the query data change.

---

## I — Interview Q&A

### Q: What is the difference between `isLoading` and `isFetching` in TanStack Query?

**A:** `isLoading` is `true` only when the query is in the `pending` state AND has no cached data — the initial load with a blank slate. It shows the user has nothing to display yet. `isFetching` is `true` any time a network request is in flight, including background refetches when data is already cached. A query can be `isFetching: true` and `isLoading: false` simultaneously — this happens during background revalidation when cached (possibly stale) data is shown while a fresh fetch runs in the background. Best practice: use `isLoading` for full skeleton/spinner states (nothing to show), and `isFetching` for subtle background refresh indicators (spinner in the corner while showing stale data).

---

## C — Common Pitfalls + Fix

### ❌ Using `data` directly without handling the undefined initial state

```tsx
// ❌ data is undefined while loading — crashes on .map
function ProductList() {
  const { data } = useQuery({
    queryKey: ['products'],
    queryFn:  getProducts,
  })
  return <ul>{data.map(p => <li key={p.id}>{p.name}</li>)}</ul>
  // TypeError: Cannot read properties of undefined ❌
}

// ✅ Three approaches:
// 1. Default value in destructuring
function ProductListV1() {
  const { data: products = [] } = useQuery({
    queryKey: ['products'], queryFn: getProducts
  })
  return <ul>{products.map(p => <li key={p.id}>{p.name}</li>)}</ul>
}

// 2. Guard with isLoading + isError
function ProductListV2() {
  const { data, isLoading, error } = useQuery({
    queryKey: ['products'], queryFn: getProducts
  })
  if (isLoading) return <Spinner />
  if (error)     return <p>Error: {(error as Error).message}</p>
  return <ul>{data!.map(p => <li key={p.id}>{p.name}</li>)}</ul>
}

// 3. isSuccess narrows the type
function ProductListV3() {
  const result = useQuery({ queryKey: ['products'], queryFn: getProducts })
  if (!result.isSuccess) return null
  return <ul>{result.data.map(p => <li key={p.id}>{p.name}</li>)}</ul>
  // result.data is typed as Product[] (not undefined) after isSuccess check ✅
}
```

---

## K — Coding Challenge + Solution

### Challenge

Build a `useUserProfile` hook using `useQuery` with: enabled guard, select to expose only `{ name, email, avatarUrl }`, and staleTime of 10 minutes.

### Solution

```tsx
import { useQuery } from '@tanstack/react-query'
import { getUser, userKeys } from '../api/users'

interface UserProfile { name: string; email: string; avatarUrl: string }

function useUserProfile(userId: number | null) {
  return useQuery({
    queryKey:  userKeys.detail(userId ?? 0),
    queryFn:   ({ signal }) => getUser(userId!, signal),
    enabled:   userId !== null && userId > 0,   // don't fetch if no userId ✅
    staleTime: 1000 * 60 * 10,                  // profile fresh for 10 min ✅
    select: (user): UserProfile => ({           // transform + narrow ✅
      name:      user.name,
      email:     user.email,
      avatarUrl: user.avatarUrl ?? '/default-avatar.png',
    }),
  })
}

// Usage
function Avatar({ userId }: { userId: number | null }) {
  const { data: profile, isLoading } = useUserProfile(userId)

  if (isLoading) return <div className="avatar-skeleton" />
  if (!profile)  return <div className="avatar-empty" />

  return (
    <img
      src={profile.avatarUrl}
      alt={profile.name}
      title={profile.email}
      className="avatar"
    />
  )
}
```

---

---

# 6 — Loading, Error, Success States

---

## T — TL;DR

TanStack Query provides a complete async state machine: `pending → loading → success | error`. Render each state explicitly — skeleton for loading, error message with retry for failure, data for success. Never show a blank screen when you can show something useful.

---

## K — Key Concepts

```tsx
// ── The three states and what to render ──────────────────────────────────
function PostDetail({ postId }: { postId: number }) {
  const { data: post, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['post', postId],
    queryFn:  ({ signal }) => getPost(postId, signal),
  })

  // 1. Loading state: skeleton / spinner
  if (isLoading) {
    return (
      <article className="post-skeleton">
        <div className="skeleton skeleton-title" />
        <div className="skeleton skeleton-line" />
        <div className="skeleton skeleton-line" />
      </article>
    )
  }

  // 2. Error state: message + retry button
  if (isError) {
    return (
      <div role="alert" className="error-card">
        <p>Failed to load post: {(error as Error).message}</p>
        <button onClick={() => refetch()}>Try again</button>
      </div>
    )
  }

  // 3. Success state: the data (TypeScript knows post is Post here)
  return (
    <article>
      <h1>{post.title}</h1>
      <p>{post.body}</p>
    </article>
  )
}
```

```tsx
// ── isFetching for background refresh indicator ───────────────────────────
function UserList() {
  const { data: users = [], isLoading, isFetching, error } = useQuery({
    queryKey: ['users'],
    queryFn:  ({ signal }) => getUsers(signal),
    staleTime: 1000 * 30,
  })

  if (isLoading) return <ListSkeleton count={5} />
  if (error)     return <ErrorMessage error={error as Error} />

  return (
    <div>
      {/* Subtle indicator when background-refreshing ✅ */}
      {isFetching && <span className="refresh-dot" aria-label="Refreshing…" />}
      <ul>
        {users.map(u => <li key={u.id}>{u.name}</li>)}
      </ul>
    </div>
  )
}
```

```tsx
// ── placeholderData: keep previous results during pagination/filter ────────
import { keepPreviousData } from '@tanstack/react-query'

function PaginatedList() {
  const [page, setPage] = useState(1)

  const { data, isLoading, isFetching, isPlaceholderData } = useQuery({
    queryKey: ['posts', page],
    queryFn:  ({ signal }) => getPostsPage(page, signal),
    placeholderData: keepPreviousData,   // show old page while new loads ✅
  })

  return (
    <div style={{ opacity: isPlaceholderData ? 0.6 : 1 }}>
      {isLoading && <Spinner />}
      <PostGrid posts={data?.posts ?? []} />
      <button
        onClick={() => setPage(p => p - 1)}
        disabled={page === 1}
      >Prev</button>
      <button
        onClick={() => setPage(p => p + 1)}
        disabled={isPlaceholderData || !data?.hasMore}
      >Next</button>
    </div>
  )
}
```

```tsx
// ── Multiple queries: coordinate loading states ───────────────────────────
function Dashboard() {
  const usersQuery  = useQuery({ queryKey: ['users'],  queryFn: ({ signal }) => getUsers(signal) })
  const postsQuery  = useQuery({ queryKey: ['posts'],  queryFn: ({ signal }) => getPosts(signal) })
  const statsQuery  = useQuery({ queryKey: ['stats'],  queryFn: ({ signal }) => getStats(signal) })

  // All loading: show full skeleton
  const allLoading = usersQuery.isLoading && postsQuery.isLoading && statsQuery.isLoading
  if (allLoading) return <DashboardSkeleton />

  return (
    <div>
      {/* Each section handles its own state independently ✅ */}
      <UsersPanel
        users={usersQuery.data ?? []}
        isLoading={usersQuery.isLoading}
        error={usersQuery.error as Error | null}
      />
      <PostsPanel
        posts={postsQuery.data ?? []}
        isFetching={postsQuery.isFetching}
      />
      <StatsPanel stats={statsQuery.data} />
    </div>
  )
}
```

---

## W — Why It Matters

- Showing a skeleton instead of a spinner improves perceived performance — the user sees the shape of the content before the content arrives.
- The `isFetching` background refresh indicator (a subtle dot or spinner) communicates that data may be refreshing without disrupting the current view — better UX than a blank screen on every refetch.
- `placeholderData: keepPreviousData` eliminates the "flash of empty content" when changing pages or filters — the list shows stale results (dimmed) while the new page loads.

---

## I — Interview Q&A

### Q: When would you use `isLoading` vs `isPending` vs `isFetching`?

**A:** In TanStack Query v5: `isPending` is `true` when `status === 'pending'` — the query has no data yet, either because it's fetching for the first time or because it's `disabled` and hasn't run. `isLoading` is a convenience shortcut for `isPending && isFetching` — it's `true` specifically when pending AND actively fetching. Use `isLoading` for the initial skeleton/spinner (no data, request in flight). `isFetching` is `true` any time a request is in flight — initial or background. Use it for subtle refresh indicators shown alongside existing data. A background refetch has `isFetching: true`, `isLoading: false`, and `isSuccess: true` simultaneously — showing data while silently refreshing it.

---

## C — Common Pitfalls + Fix

### ❌ Not handling the error state — silent failure

```tsx
// ❌ No error handling — silent empty state when API fails
function PostList() {
  const { data: posts = [] } = useQuery({
    queryKey: ['posts'],
    queryFn: getPosts,
  })
  // If getPosts throws: data = undefined → default [] → empty list → ❌
  // User sees an empty list with no indication something went wrong
  return <ul>{posts.map(p => <li key={p.id}>{p.title}</li>)}</ul>
}

// ✅ Always handle error explicitly
function PostListFixed() {
  const { data: posts = [], isLoading, isError, error, refetch } = useQuery({
    queryKey: ['posts'],
    queryFn:  ({ signal }) => getPosts(signal),
  })

  if (isLoading) return <PostListSkeleton />
  if (isError) return (
    <div role="alert">
      <p>Couldn't load posts: {(error as Error).message}</p>
      <button onClick={() => refetch()}>Retry</button>
    </div>
  )

  if (posts.length === 0) return <p>No posts yet.</p>

  return <ul>{posts.map(p => <li key={p.id}>{p.title}</li>)}</ul>
}
```

---

## K — Coding Challenge + Solution

### Challenge

Build a `ProductCard` that shows a skeleton on load, an error card with retry on failure, and the product with a `isFetching` indicator on background refresh.

### Solution

```tsx
function ProductCardSkeleton() {
  return (
    <div className="card skeleton-card" aria-busy="true" aria-label="Loading product">
      <div className="skeleton skeleton-image" />
      <div className="skeleton skeleton-title" />
      <div className="skeleton skeleton-price" />
    </div>
  )
}

function ProductCardError({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className="card error-card" role="alert">
      <p>Failed to load product</p>
      <p className="error-detail">{message}</p>
      <button onClick={onRetry} type="button">Try again</button>
    </div>
  )
}

function ProductCard({ productId }: { productId: number }) {
  const { data: product, isLoading, isError, error, isFetching, refetch } = useQuery({
    queryKey:  ['product', productId],
    queryFn:   ({ signal }) => getProduct(productId, signal),
    staleTime: 1000 * 60 * 2,   // 2 min fresh
  })

  if (isLoading) return <ProductCardSkeleton />

  if (isError) return (
    <ProductCardError
      message={(error as Error).message}
      onRetry={() => refetch()}
    />
  )

  return (
    <div className="card product-card">
      {/* Subtle background-refresh indicator ✅ */}
      {isFetching && (
        <span className="refresh-indicator" aria-label="Refreshing…" />
      )}
      <img src={product!.imageUrl} alt={product!.name} />
      <h3>{product!.name}</h3>
      <p className="price">${product!.price.toFixed(2)}</p>
      <p className={product!.inStock ? 'in-stock' : 'out-of-stock'}>
        {product!.inStock ? 'In stock' : 'Out of stock'}
      </p>
    </div>
  )
}
```

---

---

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

# 8 — Replacing Manual fetch-in-effect Patterns

---

## T — TL;DR

The `useEffect` + `useState` data fetching pattern is a known anti-pattern in modern React. Replace it with `useQuery` — less code, better behaviour, zero manual state management. The migration is mechanical: identify the effect, extract the queryFn, replace the state.

---

## K — Key Concepts

```tsx
// ── Side-by-side comparison ────────────────────────────────────────────────

// ─── BEFORE: manual fetch in effect (~40 lines) ───────────────────────────
function UserListBefore() {
  const [users,     setUsers]     = useState<User[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error,     setError]     = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    const controller = new AbortController()
    setIsLoading(true)
    setError(null)

    fetch('/api/users', { signal: controller.signal })
      .then(r => { if (!r.ok) throw new Error(r.statusText); return r.json() })
      .then(data => { if (!cancelled) { setUsers(data); setIsLoading(false) } })
      .catch(err => {
        if (!cancelled && err.name !== 'AbortError') {
          setError(err.message); setIsLoading(false)
        }
      })

    return () => { cancelled = true; controller.abort() }
  }, [])

  if (isLoading) return <Spinner />
  if (error) return <p>Error: {error}</p>
  return <ul>{users.map(u => <li key={u.id}>{u.name}</li>)}</ul>
}

// ─── AFTER: useQuery (~10 lines) ──────────────────────────────────────────
function UserListAfter() {
  const { data: users = [], isLoading, error } = useQuery({
    queryKey: ['users'],
    queryFn:  ({ signal }) => getUsers(signal),
  })

  if (isLoading) return <Spinner />
  if (error) return <p>Error: {(error as Error).message}</p>
  return <ul>{users.map(u => <li key={u.id}>{u.name}</li>)}</ul>
}
// Same behaviour. 75% less code. Plus: cache, dedup, retry, background sync. ✅
```

```tsx
// ── Migration: step by step ───────────────────────────────────────────────

// STEP 1: Identify what the effect fetches
useEffect(() => {
  fetch(`/api/products?category=${category}`)   // ← what and with what params?
    .then(r => r.json())
    .then(setProducts)
}, [category])

// STEP 2: Extract the fetch to a typed API function
async function getProductsByCategory(
  category: string, signal: AbortSignal
): Promise<Product[]> {
  const res = await fetch(`/api/products?category=${category}`, { signal })
  if (!res.ok) throw new Error(`${res.status}`)
  return res.json()
}

// STEP 3: Replace effect + state with useQuery
const { data: products = [], isLoading, error } = useQuery({
  queryKey: ['products', category],      // dynamic param in key ✅
  queryFn:  ({ signal }) => getProductsByCategory(category, signal),
})

// STEP 4: Delete the old useState + useEffect — they're fully replaced
// STEP 5: Handle loading/error states from useQuery flags
```

```tsx
// ── Patterns to watch for during migration ────────────────────────────────

// Pattern A: Effect that re-fetches when a variable changes
useEffect(() => {
  fetchData(searchQuery)
}, [searchQuery])
// → queryKey: ['data', searchQuery] handles this automatically

// Pattern B: Conditional fetch (only when something is truthy)
useEffect(() => {
  if (userId) fetchUser(userId)
}, [userId])
// → enabled: !!userId handles this

// Pattern C: Effect with loading state that shows skeleton
const [loading, setLoading] = useState(true)
// → isLoading from useQuery replaces this

// Pattern D: Effect with error state
const [error, setError] = useState(null)
// → error and isError from useQuery replaces this

// Pattern E: Multiple effects fetching related data sequentially
useEffect(() => { fetchUser(id).then(setUser) }, [id])
useEffect(() => { if (user) fetchPosts(user.id).then(setPosts) }, [user])
// → Dependent queries with enabled: !!user.data replaces this
```

---

## W — Why It Matters

- The effect pattern is the first thing React's official docs now tell you NOT to do for data fetching — the recommendation is to use a library like TanStack Query.
- The migration is almost always a net reduction in code — 40 lines of manual fetching becomes 10 lines of `useQuery`. Less code = fewer bugs.
- After migration, you get features that are prohibitively complex to add manually: automatic retry with backoff, request deduplication across components, background tab sync, stale-while-revalidate, and DevTools visibility.

---

## I — Interview Q&A

### Q: Why does the React documentation recommend against fetching data in `useEffect`?

**A:** The React docs list several reasons: (1) Effects don't run on the server, making server-side rendering produce empty content. (2) Fetching in effects directly creates network waterfalls — parent fetches, renders children, children each fetch, each waiting for the previous. (3) There's no built-in caching — every mount triggers a new request. (4) Race conditions require careful cleanup code that's easy to get wrong. (5) The ergonomics produce boilerplate (loading state, error state, cancellation, retry) that every developer implements differently. The recommendation is to use either a framework's built-in data fetching (Next.js App Router with `fetch`) or a dedicated server-state library like TanStack Query, which solves all these problems with a well-tested, consistent API.

---

## C — Common Pitfalls + Fix

### ❌ Leaving useEffect as a "wrapper" around useQuery

```tsx
// ❌ useEffect to trigger a query imperatively — wrong mental model
function ProductsBad({ category }: { category: string }) {
  const qc = useQueryClient()

  useEffect(() => {
    // Manually prefetching inside an effect when useQuery should do it
    qc.prefetchQuery({
      queryKey: ['products', category],
      queryFn:  ({ signal }) => getProductsByCategory(category, signal),
    })
  }, [category, qc])

  const { data } = useQuery({
    queryKey: ['products', category],
    queryFn:  ({ signal }) => getProductsByCategory(category, signal),
  })
  // The useEffect prefetch is redundant — useQuery already handles re-fetching ❌
}

// ✅ Just use useQuery — it re-fetches when category changes automatically
function ProductsGood({ category }: { category: string }) {
  const { data: products = [], isLoading, error } = useQuery({
    queryKey: ['products', category],   // re-fetches when category changes ✅
    queryFn:  ({ signal }) => getProductsByCategory(category, signal),
  })

  if (isLoading) return <ProductsSkeleton />
  if (error) return <ErrorCard error={error as Error} />
  return <ProductGrid products={products} />
}
```

---

## K — Coding Challenge + Solution

### Challenge

Migrate this entire component from manual fetch-in-effect to TanStack Query. Preserve all existing behaviour: fetch on mount, re-fetch when `authorId` changes, loading/error/empty states.

```tsx
// BEFORE
function AuthorPosts({ authorId }: { authorId: number }) {
  const [posts,     setPosts]     = useState<Post[]>([])
  const [loading,   setLoading]   = useState(false)
  const [error,     setError]     = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(null)
    fetch(`/api/posts?author=${authorId}`)
      .then(r => { if (!r.ok) throw new Error(`HTTP ${r.status}`); return r.json() })
      .then(data => { if (!cancelled) { setPosts(data); setLoading(false) } })
      .catch(err => { if (!cancelled) { setError(err.message); setLoading(false) } })
    return () => { cancelled = true }
  }, [authorId])

  if (loading) return <p>Loading…</p>
  if (error)   return <p>Error: {error} <button onClick={() => /* ??? */{}}>Retry</button></p>
  if (!posts.length) return <p>No posts yet.</p>
  return <ul>{posts.map(p => <li key={p.id}>{p.title}</li>)}</ul>
}
```

### Solution

```tsx
// STEP 1: Extract query function to API layer
async function getAuthorPosts(authorId: number, signal: AbortSignal): Promise<Post[]> {
  const res = await fetch(`/api/posts?author=${authorId}`, { signal })
  if (!res.ok) throw new Error(`HTTP ${res.status}: ${res.statusText}`)
  return res.json()
}

// STEP 2: Replace with useQuery
function AuthorPostsAfter({ authorId }: { authorId: number }) {
  const {
    data: posts = [],
    isLoading,
    isError,
    error,
    refetch,
    isFetching,
  } = useQuery({
    queryKey: ['posts', { authorId }],            // re-fetches when authorId changes ✅
    queryFn:  ({ signal }) => getAuthorPosts(authorId, signal),  // cancellable ✅
    enabled:  authorId > 0,                       // don't fetch for invalid IDs
    retry:    2,                                  // retry twice before error state
    staleTime: 1000 * 60,                         // 1 min fresh
  })

  if (isLoading) return <p aria-live="polite">Loading…</p>

  if (isError) return (
    <div role="alert">
      <p>Error: {(error as Error).message}</p>
      <button onClick={() => refetch()}>Retry</button>   {/* refetch from useQuery ✅ */}
    </div>
  )

  if (posts.length === 0) return <p>No posts yet.</p>

  return (
    <div>
      {isFetching && <span className="refresh-dot" aria-label="Refreshing" />}
      <ul>
        {posts.map(p => <li key={p.id}>{p.title}</li>)}
      </ul>
    </div>
  )
}

// What we gained vs the manual version:
// ✅ AbortController / cancellation: automatic via signal
// ✅ Race condition protection: built-in
// ✅ Retry with backoff: retry: 2
// ✅ Cache: posts['authorId'] cached — instant on re-mount
// ✅ Background sync: refetchOnWindowFocus by default
// ✅ Deduplication: multiple components with same authorId = one request
// ✅ Refetch: clean refetch() function, not a manual re-trigger flag
// ✅ DevTools: query visible in panel
// Lines of code: 40 → 15
```

---

## ✅ Day 7 Complete — TanStack Query Foundations

| # | Subtopic | Status |
|---|----------|--------|
| 1 | Server State vs Client State | ☐ |
| 2 | Async Remote Data Challenges | ☐ |
| 3 | QueryClient + QueryClientProvider | ☐ |
| 4 | Query Functions | ☐ |
| 5 | useQuery — Core API | ☐ |
| 6 | Loading, Error, Success States | ☐ |
| 7 | React Query DevTools | ☐ |
| 8 | Replacing Manual fetch-in-effect Patterns | ☐ |

---

## 🗺️ One-Page Mental Model — Day 7

```
SERVER STATE VS CLIENT STATE
  Client state: browser-owned, always fresh, use useState/Zustand
  Server state: server-owned, stale snapshot, use TanStack Query
  "Did this come from a network request?" → server state → TanStack Query
  "Did this come from user interaction?"  → client state → useState

ASYNC DATA CHALLENGES
  8 problems with manual fetch: loading, error, cache, stale, dedup,
  background sync, retry, race conditions
  TanStack Query: solves all 8 with zero boilerplate
  Manual fetch: solves 2–3 at best, inconsistently

QUERY CLIENT + PROVIDER
  QueryClient = the cache. Create ONCE at module level — never inside component
  QueryClientProvider: wrap the entire app, not just parts
  staleTime: how long data is fresh (no refetch) — default 0 (always stale)
  gcTime: how long unused cache lives — default 5 min
  useQueryClient(): hook to access cache imperatively (invalidate, prefetch, set)

QUERY FUNCTIONS
  Any async fn that returns data or throws — must THROW on failure
  fetch doesn't throw on 4xx/5xx → always check res.ok → throw manually
  Accept signal from QueryFunctionContext → pass to fetch for cancellation
  Extract to api/ layer → collocate with query key factories
  queryKey factory: userKeys.detail(id) → consistent, refactorable, namespaced

useQuery CORE API
  queryKey: array, JSON-serialized identity of the query → determines cache
  queryFn: async fn to fetch data → receives { queryKey, signal }
  enabled: false → don't fetch (conditional / dependent queries)
  select: transform data + optimize re-renders (component re-renders only on select change)
  staleTime: per-query override of default
  placeholderData: keepPreviousData → no flash of empty on filter/page change
  isLoading: initial load (no cache) | isFetching: any in-flight request

LOADING / ERROR / SUCCESS STATES
  isLoading: show skeleton/spinner (nothing to display yet)
  isFetching + has data: show subtle refresh dot (data shown, refreshing silently)
  isError: show error card with refetch() retry button
  isSuccess / data: render the data
  Default value in destructure: data: users = [] — safe fallback
  isSuccess narrows TypeScript type: data is T (not T | undefined) after isSuccess

REACT QUERY DEVTOOLS
  npm install @tanstack/react-query-devtools
  <ReactQueryDevtools /> inside QueryClientProvider
  Tree-shaken from production builds automatically
  Colors: green=fresh, yellow=stale, blue=fetching, gray=inactive
  Actions: Refetch, Invalidate, Reset, Remove — test without writing code
  Unstable queryKey: watch for constant blue cycling → object/Date in key

REPLACING MANUAL FETCH-IN-EFFECT
  Migration: identify effect → extract typed queryFn → replace with useQuery
  Delete: useState(loading), useState(error), useState(data), useEffect with fetch
  Gain: cache, dedup, retry, background sync, race protection, DevTools, refetch()
  Patterns:
    re-fetch on variable change → put variable in queryKey
    conditional fetch → enabled: !!value
    sequential fetches → dependent query with enabled: !!previousData
    loading state → isLoading
    error + retry → isError + refetch()
```

> **Your next action:** Find ONE `useEffect` with a `fetch` inside it in any project. Extract the fetch function, add `res.ok` check, and replace the effect with `useQuery`. Delete the old state. The entire thing should take under 10 minutes — and you'll immediately get caching and deduplication for free.

> "Doing one small thing beats opening a feed."