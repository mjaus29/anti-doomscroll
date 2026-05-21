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
