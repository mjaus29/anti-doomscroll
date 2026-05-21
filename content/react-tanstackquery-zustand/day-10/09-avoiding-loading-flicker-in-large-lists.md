# 9 — Avoiding Loading Flicker in Large Lists

---

## T — TL;DR

**Loading flicker** is when data momentarily disappears or blinks while refetching or navigating. Fix it with `keepPreviousData`, `placeholderData`, structural sharing, `staleTime`, and skeleton sizing that matches real content.

---

## K — Key Concepts

```tsx
// ── Sources of loading flicker and their fixes ────────────────────────────

// FLICKER TYPE 1: Page change blanks the list
// Cause: new page key = no cache = isLoading=true = data=undefined
// Fix: keepPreviousData
const { data, isPlaceholderData } = useQuery({
  queryKey: ['items', { page }],
  queryFn:  ({ signal }) => fetchItems(page, signal),
  placeholderData: keepPreviousData,
})
<div style={{ opacity: isPlaceholderData ? 0.7 : 1 }}>…</div>

// FLICKER TYPE 2: Filter change shows loading briefly
// Cause: filter change = new key = no cache (unless previously searched)
// Fix: same — keepPreviousData, plus staleTime to cache filter results
const { data } = useQuery({
  queryKey: ['products', { category, search }],
  queryFn:  ({ signal }) => fetchProducts({ category, search }, signal),
  placeholderData: keepPreviousData,
  staleTime: 1000 * 60,   // 1 min cache per filter combo ✅
})

// FLICKER TYPE 3: Background refetch causes unnecessary full re-render
// Cause: staleTime: 0 + no structural sharing awareness
// Fix: staleTime + structural sharing (automatic) + React.memo on rows
```

```tsx
// ── Skeleton sizing: match real content dimensions ─────────────────────────
// ❌ Generic skeleton → layout shift when real data arrives
function BadSkeleton() {
  return <div className="skeleton" style={{ height: 40 }} />
}

// ✅ Content-aware skeleton matching the real item's layout
function PostRowSkeleton() {
  return (
    <div className="post-row skeleton-row">
      <div className="skeleton skeleton-avatar" />
      <div className="skeleton-text">
        <div className="skeleton skeleton-title" style={{ width: '60%' }} />
        <div className="skeleton skeleton-meta"  style={{ width: '40%' }} />
      </div>
    </div>
  )
}
function PostListSkeleton({ count }: { count: number }) {
  return <>{Array.from({ length: count }, (_, i) => <PostRowSkeleton key={i} />)}</>
}
```

```tsx
// ── React.memo + stable props: prevent whole-list re-render on background refetch
const PostRow = memo(function PostRow({ post }: { post: Post }) {
  return <div>{post.title}</div>
})

function PostList({ posts }: { posts: Post[] }) {
  return (
    <ul>
      {posts.map(p => <PostRow key={p.id} post={p} />)}
    </ul>
  )
}
// Background refetch: only changed rows re-render (structural sharing)
// Unchanged rows: memo bails out — zero re-render ✅

// ── isFetching indicator instead of skeleton on background refresh ─────────
function ListWithRefreshIndicator() {
  const { data: posts = [], isLoading, isFetching } = useQuery({
    queryKey: ['posts'],
    queryFn:  ({ signal }) => fetchPosts(signal),
  })
  return (
    <div>
      <div className="list-header">
        <h2>Posts</h2>
        {isFetching && !isLoading && (
          <span className="refresh-spinner" aria-label="Refreshing" />
        )}
      </div>
      {isLoading ? <PostListSkeleton count={10} /> : (
        <ul>{posts.map(p => <PostRow key={p.id} post={p} />)}</ul>
      )}
    </div>
  )
}
```

```tsx
// ── Staggered appearance for new items ───────────────────────────────────
// Avoid jarring "pop in" of new items — animate their arrival
const PostCard = memo(function PostCard({ post, isNew }: { post: Post; isNew?: boolean }) {
  return (
    <div
      className="post-card"
      style={{
        animation: isNew ? 'fadeIn 0.3s ease' : 'none',
      }}
    >
      {post.title}
    </div>
  )
})
```

---

## W — Why It Matters

- Loading flicker is a perceived performance problem — apps that flash between states feel slow even if the network is fast. `keepPreviousData` + skeleton sizing eliminates the perception of latency.
- Skeleton dimensions that match real content prevent Cumulative Layout Shift (CLS) — a Core Web Vital that affects search ranking and user experience.
- The `isFetching && !isLoading` pattern is the professional tell: junior devs show a spinner on every refetch (disruptive), senior devs show a subtle indicator while keeping content visible (transparent).

---

## I — Interview Q&A

### Q: How do you prevent loading flicker in a paginated or filtered list?

**A:** Three techniques combined: (1) **`placeholderData: keepPreviousData`** — shows the previous page/filter result while the new one loads, with `isPlaceholderData` flag to dim it. (2) **`staleTime`** — cache filter results so returning to a previously visited filter is instant with no loading state at all. (3) **`prefetchQuery` for next page** — when the current page data arrives, prefetch the next page so clicking "Next" hits cache immediately. For the background refetch case (not a page change but a silent freshness check): use `isFetching && !isLoading` to show a subtle indicator rather than a skeleton, and rely on structural sharing + `React.memo` to only re-render changed rows. Never show a full skeleton for a background refresh — the user is already reading the content.

---

## C — Common Pitfalls + Fix

### ❌ Showing skeleton on every isFetching — disrupts reading

```tsx
// ❌ Skeleton on every refetch — user is reading, content disappears
function PostListBad() {
  const { data: posts = [], isFetching } = useQuery({
    queryKey: ['posts'], queryFn: fetchPosts, staleTime: 0,
  })
  if (isFetching) return <PostListSkeleton count={10} />  // ❌ nukes existing content
  return <ul>{posts.map(p => <PostRow key={p.id} post={p} />)}</ul>
}

// ✅ Skeleton only for initial load; subtle indicator for background refresh
function PostListGood() {
  const { data: posts = [], isLoading, isFetching } = useQuery({
    queryKey: ['posts'], queryFn: ({ signal }) => fetchPosts(signal), staleTime: 0,
  })
  if (isLoading) return <PostListSkeleton count={10} />   // ✅ only first load

  return (
    <div>
      {isFetching && (
        <div className="refresh-bar" role="status" aria-label="Refreshing…" />
      )}
      <ul>{posts.map(p => <PostRow key={p.id} post={p} />)}</ul>
    </div>
  )
}
```

---

## K — Coding Challenge + Solution

### Challenge

Build a `FlickerFreeProductGrid` that combines all flicker-prevention techniques: `keepPreviousData`, `staleTime`, `memo`, skeleton count matching, and a background-refresh indicator.

### Solution

```tsx
const ProductCard = memo(function ProductCard({ product }: { product: Product }) {
  return (
    <div className="product-card">
      <img src={product.imageUrl} alt={product.name} loading="lazy" />
      <h3>{product.name}</h3>
      <p>${product.price.toFixed(2)}</p>
    </div>
  )
})

function ProductCardSkeleton() {
  return (
    <div className="product-card skeleton-card" aria-hidden="true">
      <div className="skeleton" style={{ height: 180 }} />
      <div className="skeleton" style={{ height: 20, width: '70%', marginTop: 8 }} />
      <div className="skeleton" style={{ height: 16, width: '30%', marginTop: 6 }} />
    </div>
  )
}

interface GridFilters { category: string; page: number; pageSize: number }

function useProductGrid(filters: GridFilters) {
  const qc = useQueryClient()
  const query = useQuery({
    queryKey: ['products', 'grid', filters],
    queryFn:  ({ signal }) => fetchProductsGrid(filters, signal),
    placeholderData: keepPreviousData,    // no blank on filter/page change ✅
    staleTime: 1000 * 60 * 5,            // 5 min cache per filter combo ✅
  })
  // Prefetch next page
  useEffect(() => {
    if (query.data?.hasNextPage) {
      qc.prefetchQuery({
        queryKey: ['products', 'grid', { ...filters, page: filters.page + 1 }],
        queryFn:  ({ signal }) => fetchProductsGrid({ ...filters, page: filters.page + 1 }, signal),
        staleTime: 1000 * 60 * 5,
      })
    }
  }, [filters, query.data?.hasNextPage])

  return query
}

function FlickerFreeProductGrid() {
  const [filters, setFilters] = useState<GridFilters>({
    category: 'all', page: 1, pageSize: 12
  })
  const { data, isLoading, isFetching, isPlaceholderData } = useProductGrid(filters)

  const products = data?.products ?? []

  return (
    <div>
      <CategoryFilter
        value={filters.category}
        onChange={cat => setFilters(f => ({ ...f, category: cat, page: 1 }))}
      />

      {/* Background refresh indicator — stays during filter/page transition */}
      {isFetching && !isLoading && (
        <div className="refresh-bar" role="status" aria-label="Updating…" />
      )}

      {/* Content area: dims during placeholder, never blanks */}
      <div
        className="product-grid"
        style={{ opacity: isPlaceholderData ? 0.7 : 1, transition: 'opacity 0.15s' }}
      >
        {isLoading
          ? Array.from({ length: filters.pageSize }, (_, i) => <ProductCardSkeleton key={i} />)
          : products.map(p => <ProductCard key={p.id} product={p} />)
        }
      </div>

      <div className="pagination">
        <button
          disabled={filters.page === 1 || isPlaceholderData}
          onClick={() => setFilters(f => ({ ...f, page: f.page - 1 }))}
        >← Prev</button>
        <span>{filters.page} / {data?.totalPages ?? '…'}</span>
        <button
          disabled={isPlaceholderData || !data?.hasNextPage}
          onClick={() => setFilters(f => ({ ...f, page: f.page + 1 }))}
        >Next →</button>
      </div>
    </div>
  )
}
```

---

## ✅ Day 10 Complete — Mutations and Advanced Server State

| # | Subtopic | Status |
|---|----------|--------|
| 1 | useMutation + Mutation Lifecycle | ☐ |
| 2 | useQueryClient + Invalidation from Mutations | ☐ |
| 3 | Invalidating Related Queries | ☐ |
| 4 | Direct Cache Updates with setQueryData | ☐ |
| 5 | Optimistic Updates + Rollback Mindset | ☐ |
| 6 | Query Cancellation with AbortSignal | ☐ |
| 7 | Paginated Queries + placeholderData + keepPreviousData | ☐ |
| 8 | useInfiniteQuery + fetchNextPage + getNextPageParam | ☐ |
| 9 | Avoiding Loading Flicker in Large Lists | ☐ |

---

## 🗺️ One-Page Mental Model — Day 10

```
useMutation LIFECYCLE
  idle → pending → success | error — reset() → idle
  mutate: fire-and-forget, errors in callbacks
  mutateAsync: returns Promise, await + try/catch for sequential logic
  onMutate: before request (snapshot + optimistic write)
  onSuccess: after resolve (invalidate / setQueryData)
  onError: after throw (rollback with snapshot)
  onSettled: always (cleanup, guarantee truth)

INVALIDATION FROM MUTATIONS
  qc.invalidateQueries({ queryKey }) → marks stale + triggers background refetch
  Active subscribers: refetch immediately | Inactive: refetch on next mount
  onSuccess: invalidate only on success
  onSettled: invalidate always (conservative, guarantees server truth)
  await qc.invalidateQueries in onSuccess: ensures data fresh before navigation
  Precise > broad: invalidate only what changed

RELATED QUERY INVALIDATION
  Create: invalidate lists → add item visible
  Update: invalidate detail + lists showing changed fields
  Delete: removeQueries(detail) + invalidate lists
  Predicate filter: invalidate by userId across heterogeneous keys
  ❌ qc.invalidateQueries() (no filter): refetch storm → always scope it

DIRECT CACHE UPDATES (setQueryData)
  setQueryData(key, newValue | updater): synchronous, instant UI update
  setQueriesData(filter, updater): update all matching cache entries
  Use when mutation response = authoritative new value (skip refetch)
  Use invalidation for: aggregates, derived values, affected keys without data
  Always use key factories → consistent types → no ghost writes
  Return new object/array from updater → never mutate old value

OPTIMISTIC UPDATES + ROLLBACK
  onMutate: (1) await cancelQueries (2) snapshot (3) setQueryData (4) return snapshot
  onError: setQueryData with snapshot (rollback)
  onSettled: invalidateQueries (confirm server truth)
  cancelQueries is mandatory → prevents in-flight response overwriting optimistic state
  Rollback mindset: always have a snapshot; always restore on error; always confirm on settle

QUERY CANCELLATION (AbortSignal)
  { signal } in queryFn context → pass to fetch / axios
  Key change: old request aborted, new one starts
  cancelQueries: explicit abort (use in onMutate before optimistic write)
  AbortError: TanStack handles it — don't catch and rethrow
  Without signal: network still runs, TanStack discards result (no race protection)

PAGINATED QUERIES
  Key: ['resource', { page, pageSize, sort, filter }] → each combo separate cache
  keepPreviousData: no blank between page/filter changes
  isPlaceholderData: true while showing old data → dim + disable Next button
  Prefetch next page in useEffect when current data arrives
  Cursor-based: same pattern, cursor in key

useInfiniteQuery
  queryFn receives pageParam → pass to API
  initialPageParam: first page value (null for cursor, 0 for offset)
  getNextPageParam(lastPage): return next cursor/offset | undefined when done
  hasNextPage: true when getNextPageParam returned non-undefined
  fetchNextPage(): load next; isFetchingNextPage: true while loading
  data.pages[]: array of page results → flatMap to flat list
  IntersectionObserver sentinel → auto-load on scroll

AVOIDING LOADING FLICKER
  Flicker cause: key change → no cache → isLoading=true → data=undefined
  Fixes: keepPreviousData + staleTime caching per filter combo + prefetching
  isLoading=true  → show skeleton (initial load, no content to show)
  isFetching=true → show subtle ↻ indicator (content visible, silently refreshing)
  Skeleton size = real content size → no layout shift (CLS)
  React.memo + structural sharing → only changed rows re-render on background refetch
```

> **Your next action:** Find a `POST`/`PATCH`/`DELETE` call in your project that uses `fetch` directly in an event handler. Wrap it in `useMutation`. Add `onSuccess: () => qc.invalidateQueries(...)`. Run it and watch the list update automatically in the DevTools. That one migration is the whole day in practice.

> "Doing one small thing beats opening a feed."
