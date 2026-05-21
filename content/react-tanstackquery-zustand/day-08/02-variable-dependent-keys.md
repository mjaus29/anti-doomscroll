# 2 — Variable-Dependent Keys

---

## T — TL;DR

When a query depends on a variable (prop, state, context value), **put that variable in the query key**. TanStack Query watches the key — when it changes, it automatically triggers a new fetch for the new key while serving the old cached data if available.

---

## K — Key Concepts

```tsx
// ── Variable in key = automatic refetch on change ─────────────────────────
function UserDetail({ userId }: { userId: number }) {
  const { data: user } = useQuery({
    queryKey: ['user', userId],    // userId in key ✅
    queryFn:  ({ signal }) => getUser(userId, signal),
  })
  // When userId changes: new key → cache miss or hit → fetch or serve cached ✅
}

// ── Multiple variables: all go in the key ────────────────────────────────
function ProductSearch({
  category, sortBy, page, search
}: SearchProps) {
  const { data } = useQuery({
    queryKey: ['products', { category, sortBy, page, search }],
    queryFn:  ({ signal }) => searchProducts({ category, sortBy, page, search }, signal),
  })
  // Any variable change → new key → refetch ✅
  // Navigate back to same category → cache hit → instant result ✅
}
```

```tsx
// ── Dependent queries: key variable comes from another query ──────────────
function UserDashboard({ userId }: { userId: number }) {
  // Step 1: fetch the user
  const { data: user } = useQuery({
    queryKey: ['user', userId],
    queryFn:  ({ signal }) => getUser(userId, signal),
  })

  // Step 2: fetch user's organization — only when user.orgId is available
  const { data: org } = useQuery({
    queryKey: ['org', user?.orgId],
    queryFn:  ({ signal }) => getOrg(user!.orgId, signal),
    enabled:  !!user?.orgId,    // waits for step 1 ✅
  })

  // Step 3: fetch org's billing — depends on step 2
  const { data: billing } = useQuery({
    queryKey: ['billing', org?.id],
    queryFn:  ({ signal }) => getBilling(org!.id, signal),
    enabled:  !!org?.id,        // waits for step 2 ✅
  })

  return <div>{user?.name} · {org?.name} · {billing?.plan}</div>
}
```

```tsx
// ── Debounced search: variable in key + enabled ───────────────────────────
function SearchPage() {
  const [rawQuery,  setRawQuery]  = useState('')
  const debouncedQuery = useDebounce(rawQuery, 400)

  const { data: results = [], isLoading } = useQuery({
    queryKey: ['search', debouncedQuery],   // key only updates after debounce ✅
    queryFn:  ({ signal }) => searchAPI(debouncedQuery, signal),
    enabled:  debouncedQuery.length > 1,    // don't search empty or single char ✅
    staleTime: 1000 * 30,                   // cache search results 30s
  })

  return (
    <div>
      <input
        value={rawQuery}
        onChange={e => setRawQuery(e.target.value)}
        placeholder="Search…"
      />
      {isLoading && <p>Searching…</p>}
      <ul>{results.map((r, i) => <li key={i}>{r.title}</li>)}</ul>
    </div>
  )
}
```

```tsx
// ── Pagination: page in key → each page cached separately ─────────────────
function PaginatedPosts() {
  const [page, setPage] = useState(1)

  const { data, isLoading, isFetching } = useQuery({
    queryKey: ['posts', { page }],
    queryFn:  ({ signal }) => getPostsPage(page, signal),
    placeholderData: keepPreviousData,   // show prev page while loading next ✅
    staleTime: 1000 * 60,
  })
  // Each page is cached independently:
  // Navigate page 1 → 2 → back to 1 → instant (cached) ✅

  return (
    <div style={{ opacity: isFetching ? 0.6 : 1 }}>
      {isLoading ? <Spinner /> : <PostGrid posts={data?.items ?? []} />}
      <button disabled={page === 1}         onClick={() => setPage(p => p - 1)}>Prev</button>
      <button disabled={!data?.hasNextPage} onClick={() => setPage(p => p + 1)}>Next</button>
    </div>
  )
}
```

---

## W — Why It Matters

- "Variable in key" is the mental model that replaces the `useEffect([userId])` refetch pattern — you never write refetch logic, you just declare the dependency in the key.
- Each unique key has its own cache entry — paginating through page 1, 2, 3 builds a cache for all three pages. Going back to page 1 is instant because it's already cached.
- The `enabled` flag paired with a variable key is the correct pattern for dependent queries — without `enabled`, TanStack Query fetches immediately and the variable is undefined.

---

## I — Interview Q&A

### Q: How does TanStack Query know when to refetch after a variable changes?

**A:** TanStack Query watches the `queryKey` array. On every render, it serializes the current key with `JSON.stringify` and compares it to the previously rendered key. If the serialized strings differ, the key has changed — TanStack Query either serves the cached entry for the new key (instant, if previously fetched) or starts a new fetch. The component never needs to explicitly "trigger a refetch" — including the variable in the key means the cache identity changes when the variable changes, and TanStack Query handles the rest. This replaces the `useEffect([variable], () => fetch(variable))` pattern entirely.

---

## C — Common Pitfalls + Fix

### ❌ Hardcoded key ignoring a variable — stale closure in disguise

```tsx
// ❌ Variable userId used in queryFn but NOT in queryKey
// Key is always ['user'] — same cache entry for all userIds ❌
function UserBad({ userId }: { userId: number }) {
  const { data } = useQuery({
    queryKey: ['user'],                           // ❌ doesn't change with userId
    queryFn:  ({ signal }) => getUser(userId, signal),
    // When userId changes: key stays same → no refetch → stale data shown ❌
  })
  return <div>{data?.name}</div>
}

// ✅ Variable in key — refetches when userId changes
function UserGood({ userId }: { userId: number }) {
  const { data } = useQuery({
    queryKey: ['user', userId],                   // ✅ changes with userId
    queryFn:  ({ signal }) => getUser(userId, signal),
  })
  return <div>{data?.name}</div>
}
```

---

## K — Coding Challenge + Solution

### Challenge

Build a `useFilteredProducts` hook that accepts `{ category, minPrice, maxPrice, inStockOnly }` — all variables go in the key. Enable only when at least one filter is set.

### Solution

```tsx
interface ProductFilters {
  category:    string
  minPrice:    number
  maxPrice:    number
  inStockOnly: boolean
}

interface Product { id: number; name: string; price: number; inStock: boolean }

async function fetchFilteredProducts(
  filters: ProductFilters, signal: AbortSignal
): Promise<Product[]> {
  const params = new URLSearchParams({
    category:    filters.category,
    minPrice:    String(filters.minPrice),
    maxPrice:    String(filters.maxPrice),
    inStockOnly: String(filters.inStockOnly),
  })
  const res = await fetch(`/api/products?${params}`, { signal })
  if (!res.ok) throw new Error(`fetchFilteredProducts: ${res.status}`)
  return res.json()
}

function useFilteredProducts(filters: ProductFilters) {
  // Only enabled when at least one meaningful filter is set
  const hasFilter =
    filters.category !== '' ||
    filters.minPrice > 0     ||
    filters.maxPrice < Infinity ||
    filters.inStockOnly

  return useQuery({
    // All filter fields in key — any change triggers new fetch / cache hit ✅
    queryKey: ['products', 'filtered', filters],
    queryFn:  ({ signal }) => fetchFilteredProducts(filters, signal),
    enabled:  hasFilter,
    staleTime: 1000 * 60,          // 1 min — filter results don't change often
    placeholderData: keepPreviousData,  // no flash when adjusting filters ✅
  })
}

// Usage
function ProductFilterPage() {
  const [filters, setFilters] = useState<ProductFilters>({
    category: '', minPrice: 0, maxPrice: Infinity, inStockOnly: false
  })
  const { data: products = [], isLoading, isFetching } = useFilteredProducts(filters)

  return (
    <div>
      <FilterPanel filters={filters} onChange={setFilters} />
      {isLoading ? <ProductSkeleton /> : (
        <div style={{ opacity: isFetching ? 0.7 : 1 }}>
          <ProductGrid products={products} />
        </div>
      )}
    </div>
  )
}
```

---

---
