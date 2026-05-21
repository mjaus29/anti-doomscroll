
# 📅 Day 8 — Query Keys and Cache Behavior

> **Goal:** Understand the cache as a data structure — how keys identify entries, how staleness drives refetching, and how the cache lifecycle keeps memory clean.
> **Format:** Each subtopic = 5–15 min. Do one. Stop. Come back.
> **Stack:** React 19.2.5 · TypeScript 6.0 · @tanstack/react-query 5.100.1

---

## 📋 Day 8 Subtopic Overview

| # | Subtopic | Time |
|---|----------|------|
| 1 | Query Keys as Unique Serializable Arrays | 10 min |
| 2 | Variable-Dependent Keys | 10 min |
| 3 | Deterministic Hashing + Cache Identity | 10 min |
| 4 | Stale-by-Default Behavior | 10 min |
| 5 | Refetch on Mount, Focus, and Reconnect | 10 min |
| 6 | Retry Defaults | 10 min |
| 7 | staleTime + gcTime | 12 min |
| 8 | Structural Sharing | 10 min |
| 9 | Cache Lifecycle | 12 min |

---

---

# 1 — Query Keys as Unique Serializable Arrays

---

## T — TL;DR

A query key is an **array that uniquely identifies a cached entry**. TanStack Query serializes it with `JSON.stringify` to produce a stable string key. The array can contain strings, numbers, objects, and booleans — but must be serializable and deterministic.

---

## K — Key Concepts

```tsx
import { useQuery } from '@tanstack/react-query'

// ── Query key is always an array ──────────────────────────────────────────
// ❌ v3 style: string key — still accepted but loses type safety
useQuery({ queryKey: 'users', queryFn: getUsers })

// ✅ v5 style: always an array
useQuery({ queryKey: ['users'], queryFn: getUsers })

// ── Key elements communicate scope (namespace → entity → params) ──────────
// Level 1: domain/resource
['users']
['products']
['posts']

// Level 2: operation / variant
['users', 'list']
['users', 'detail']
['products', 'featured']

// Level 3: specific identifiers
['users', 'detail', 42]
['products', 'list', { category: 'shoes', page: 2 }]
['posts', 'by-author', userId]
```

```tsx
// ── Key factory pattern: the professional approach ─────────────────────────
// query-keys/users.ts
export const userKeys = {
  all:     ()              => ['users']                          as const,
  lists:   ()              => [...userKeys.all(), 'list']        as const,
  list:    (filters: UserFilters) => [...userKeys.lists(), filters] as const,
  details: ()              => [...userKeys.all(), 'detail']      as const,
  detail:  (id: number)    => [...userKeys.details(), id]        as const,
}

// Usage: consistent everywhere, centralised in one place
const { data } = useQuery({
  queryKey: userKeys.detail(42),          // ['users', 'detail', 42]
  queryFn:  ({ signal }) => getUser(42, signal),
})

// Invalidate all user queries
queryClient.invalidateQueries({ queryKey: userKeys.all() })
// Invalidate only user lists
queryClient.invalidateQueries({ queryKey: userKeys.lists() })
// Invalidate one user
queryClient.invalidateQueries({ queryKey: userKeys.detail(42) })
```

```tsx
// ── What can go in a query key ────────────────────────────────────────────
// ✅ Strings
['users', 'active']

// ✅ Numbers
['users', 42]

// ✅ Booleans
['products', true]

// ✅ Plain objects (JSON-serialized)
['products', { category: 'shoes', inStock: true }]

// ✅ Arrays inside arrays
['charts', [2024, 2025]]

// ❌ Functions — not serializable
['users', () => {}]

// ❌ Class instances — serializes to {}
['users', new Date()]   // ❌ — use Date.toISOString() instead ✅
['users', date.toISOString()]

// ❌ undefined — silently ignored; use null instead
['users', undefined]   // key becomes ['users'] — surprising ❌
['users', null]        // explicit null — intentional ✅
```

---

## W — Why It Matters

- The key **is** the cache address — every design decision (naming, structure, factory pattern) determines how fine-grained your cache invalidation is. A flat `['users']` key can't selectively invalidate one user; `['users', 'detail', 42]` can.
- Centralizing keys in factory objects means changing a key string updates every query, mutation invalidation, and prefetch that references it — without them, refactoring spreads across dozens of files.
- `undefined` in a key being silently ignored is a subtle trap — always use `null` for intentional empty values and check for `undefined` before including a parameter.

---

## I — Interview Q&A

### Q: What makes a good query key design?

**A:** Good query keys are: (1) **Hierarchical** — start with the resource (`'users'`), then narrow (`'detail'`, `42`). This lets `invalidateQueries` cascade — invalidating `['users']` invalidates every user-related query. (2) **Serializable** — only JSON-compatible values (strings, numbers, booleans, plain objects, arrays). No functions, class instances, or `undefined`. (3) **Centralized** — defined in a factory object so all usages reference the same structure. Renaming a key updates all callsites automatically. (4) **Deterministic** — the same logical query always produces the same key regardless of call order or variable naming. Object key order doesn't matter; TanStack Query sorts keys before hashing.

---

## C — Common Pitfalls + Fix

### ❌ Flat keys that can't be selectively invalidated

```tsx
// ❌ One flat key — invalidating users invalidates everything
useQuery({ queryKey: ['users'], queryFn: getAllUsers })
useQuery({ queryKey: ['users'], queryFn: () => getUser(42) })  // same key as above ❌
// Both queries share a cache entry — reading one overwrites the other

// ❌ Inconsistent key shapes across files
// file A: useQuery({ queryKey: ['user', id] })
// file B: queryClient.invalidateQueries({ queryKey: ['users', id] })
// Different key → invalidation doesn't work ❌

// ✅ Hierarchical keys + factory
export const userKeys = {
  all:    ()          => ['users']              as const,
  detail: (id: number) => ['users', 'detail', id] as const,
}

useQuery({ queryKey: userKeys.all(),       queryFn: getAllUsers })
useQuery({ queryKey: userKeys.detail(42), queryFn: ({ signal }) => getUser(42, signal) })
// Now selectively: invalidate one user vs all users ✅
```

---

## K — Coding Challenge + Solution

### Challenge

Design a complete query key factory for a `Comment` resource that supports: all comments, comments by post ID, a single comment by ID, and comments by author ID.

### Solution

```tsx
// query-keys/comments.ts
interface CommentFilters { postId?: number; authorId?: number; page?: number }

export const commentKeys = {
  // Root of all comment keys — invalidate this to clear ALL comment caches
  all:       ()                    => ['comments']                            as const,

  // All list variants
  lists:     ()                    => [...commentKeys.all(), 'list']          as const,

  // Parameterized list
  list:      (filters: CommentFilters = {}) =>
                                      [...commentKeys.lists(), filters]       as const,

  // Shortcut: comments for a specific post
  byPost:    (postId: number)      => [...commentKeys.lists(), { postId }]    as const,

  // Shortcut: comments by a specific author
  byAuthor:  (authorId: number)    => [...commentKeys.lists(), { authorId }]  as const,

  // All detail variants
  details:   ()                    => [...commentKeys.all(), 'detail']        as const,

  // Single comment
  detail:    (id: number)          => [...commentKeys.details(), id]          as const,
}

// Usage
useQuery({ queryKey: commentKeys.byPost(7),    queryFn: ({ signal }) => getCommentsByPost(7, signal) })
useQuery({ queryKey: commentKeys.byAuthor(3),  queryFn: ({ signal }) => getCommentsByAuthor(3, signal) })
useQuery({ queryKey: commentKeys.detail(99),   queryFn: ({ signal }) => getComment(99, signal) })

// Selective invalidations
queryClient.invalidateQueries({ queryKey: commentKeys.all() })       // all
queryClient.invalidateQueries({ queryKey: commentKeys.byPost(7) })   // post 7 only
queryClient.invalidateQueries({ queryKey: commentKeys.detail(99) })  // one comment
```

---

---

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

# 3 — Deterministic Hashing + Cache Identity

---

## T — TL;DR

TanStack Query identifies cache entries by serializing the `queryKey` with a **deterministic hash** — object property order doesn't matter, and primitive values are compared by value. Two keys are the same cache entry if and only if their hash is identical.

---

## K — Key Concepts

```tsx
// ── Object key order doesn't matter ──────────────────────────────────────
// These two keys resolve to the SAME cache entry ✅
useQuery({ queryKey: ['products', { category: 'shoes', page: 1 }] })
useQuery({ queryKey: ['products', { page: 1, category: 'shoes' }] })
// Hash: hashKey(['products', { category: 'shoes', page: 1 }])
//     = hashKey(['products', { page: 1, category: 'shoes' }])
// ✅ Order-independent — TanStack sorts object keys before hashing
```

```tsx
// ── What creates a DIFFERENT cache entry ─────────────────────────────────
// Different type for same value
['users', 1]       // number 1
['users', '1']     // string '1'  → DIFFERENT entry ❌ (easy bug)

// Different nesting
['users', { id: 1 }]   // object
['users', 1]            // flat    → DIFFERENT entry

// Different values
['user', 42]   // one user
['user', 43]   // different user → DIFFERENT entry ✅ (intended)

// Extra key in object
['products', { category: 'shoes' }]
['products', { category: 'shoes', page: 1 }]  // DIFFERENT (page added) ✅
```

```tsx
// ── hashKey internals (simplified) ───────────────────────────────────────
// TanStack Query's hashKey function (from @tanstack/query-core):
// 1. Recursively processes the key array
// 2. For objects: sorts keys alphabetically, then hashes each key-value pair
// 3. For arrays: hashes each element in order
// 4. Result: a stable string like '["products",{"category":"shoes","page":1}]'

// You can access it:
import { hashKey } from '@tanstack/react-query'

hashKey(['users', { role: 'admin', page: 2 }])
// → '["users",{"page":2,"role":"admin"}]'  (sorted keys)

hashKey(['users', { page: 2, role: 'admin' }])
// → '["users",{"page":2,"role":"admin"}]'  (same result ✅)
```

```tsx
// ── Verifying cache identity in code ─────────────────────────────────────
import { useQueryClient, hashKey } from '@tanstack/react-query'

function CacheInspector() {
  const qc = useQueryClient()

  // Get cached data using a key object
  const cacheA = qc.getQueryData(['users', { role: 'admin', page: 1 }])
  const cacheB = qc.getQueryData(['users', { page: 1, role: 'admin' }])
  // cacheA === cacheB — same cache entry ✅

  // Check the hash
  console.log(hashKey(['users', { role: 'admin', page: 1 }]))
  // '["users",{"page":1,"role":"admin"}]'

  return null
}
```

---

## W — Why It Matters

- Order-independence means you can build the filter object incrementally from different sources (URL params, state, defaults) without worrying about property order causing cache misses.
- The type mismatch trap (`1` vs `'1'`) is a real bug — an API that returns a numeric ID stored as a number in state but passed as a string in a URL parameter creates two separate cache entries for the same user.
- Understanding hashing confirms that `{ category: 'shoes', page: 1 }` in the key is safe to construct fresh on every render — the hash will be identical as long as the values are identical.

---

## I — Interview Q&A

### Q: Does the order of properties in a query key object matter?

**A:** No. TanStack Query's `hashKey` function sorts object keys alphabetically before hashing, so `{ category: 'shoes', page: 1 }` and `{ page: 1, category: 'shoes' }` produce the same hash and resolve to the same cache entry. This is intentional — it allows building filter objects from different sources without order becoming a source of cache misses. What does matter: the **type** of values (`1` vs `'1'` are different) and the **presence** of properties (adding or removing a key changes the hash). Array element order does matter — `['a', 'b']` and `['b', 'a']` are different keys.

---

## C — Common Pitfalls + Fix

### ❌ Type mismatch between key in query and key in invalidation

```tsx
// ❌ Query uses number ID, invalidation uses string ID
function ProductPage({ productId }: { productId: number }) {
  useQuery({
    queryKey: ['product', productId],        // number: ['product', 42]
    queryFn:  ({ signal }) => getProduct(productId, signal),
  })
}

function DeleteProduct({ productId }: { productId: string }) {
  const qc = useQueryClient()
  function handleDelete() {
    deleteProduct(productId)
    qc.invalidateQueries({ queryKey: ['product', productId] })
    // string: ['product', '42'] ← DIFFERENT hash from ['product', 42] ❌
    // Invalidation misses the cache entry — stale data shown after delete
  }
}

// ✅ Consistent types — use the key factory to enforce it
export const productKeys = {
  detail: (id: number) => ['product', id] as const,
}

// Both use productKeys.detail() — type is always number ✅
useQuery({ queryKey: productKeys.detail(42) })
qc.invalidateQueries({ queryKey: productKeys.detail(42) })
```

---

## K — Coding Challenge + Solution

### Challenge

Demonstrate that these key pairs are identical or different using `hashKey`. Then fix the ones that would cause cache miss bugs.

```ts
// Pair A: ['users', { role: 'admin', active: true }]
//         ['users', { active: true, role: 'admin' }]

// Pair B: ['product', 7]
//         ['product', '7']

// Pair C: ['items', [1, 2, 3]]
//         ['items', [3, 2, 1]]
```

### Solution

```tsx
import { hashKey } from '@tanstack/react-query'

// Pair A: SAME ✅ — object key order doesn't matter
console.log(
  hashKey(['users', { role: 'admin', active: true }]) ===
  hashKey(['users', { active: true, role: 'admin' }])
)
// → true ✅ both hash to '["users",{"active":true,"role":"admin"}]'
// No fix needed — safe to construct objects in any order

// Pair B: DIFFERENT ❌ — number 7 vs string '7'
console.log(
  hashKey(['product', 7]) ===
  hashKey(['product', '7'])
)
// → false ❌ '["product",7]' vs '["product","7"]'
// Fix: always coerce to the same type in the key factory
const productKeys = {
  detail: (id: number | string) => ['product', Number(id)] as const,
  //                                             ↑ always number
}

// Pair C: DIFFERENT ✅ — array order matters
console.log(
  hashKey(['items', [1, 2, 3]]) ===
  hashKey(['items', [3, 2, 1]])
)
// → false (array order preserved)
// Fix: sort array before putting in key if order shouldn't matter
function useItemsByIds(ids: number[]) {
  const sortedIds = [...ids].sort((a, b) => a - b)  // stable order ✅
  return useQuery({
    queryKey: ['items', sortedIds],
    queryFn:  ({ signal }) => getItemsByIds(sortedIds, signal),
  })
}
```

---

---

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

# 5 — Refetch on Mount, Focus, and Reconnect

---

## T — TL;DR

TanStack Query has three automatic refetch triggers: **mount** (component mounts), **focus** (window regains focus), and **reconnect** (network comes back online). All are enabled by default and only fire when the query is **stale**. Together they keep data fresh passively without any polling.

---

## K — Key Concepts

```tsx
// ── Three refetch triggers and their defaults ─────────────────────────────
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnMount:        true,    // refetch stale query when component mounts
      refetchOnWindowFocus:  true,    // refetch stale queries when tab regains focus
      refetchOnReconnect:    true,    // refetch stale queries when network reconnects
    }
  }
})

// Each can be overridden per query:
useQuery({
  queryKey: ['user', userId],
  queryFn:  ({ signal }) => getUser(userId, signal),
  refetchOnMount:       true,    // 'always' | true | false
  refetchOnWindowFocus: true,    // 'always' | true | false
  refetchOnReconnect:   true,    // 'always' | true | false
})
```

```tsx
// ── refetchOnMount: three modes ───────────────────────────────────────────
// true (default):
//   Refetch if stale on mount. If fresh → serve cache, no network request.
useQuery({ queryKey: ['posts'], queryFn: getPosts, refetchOnMount: true })

// 'always':
//   Always refetch on mount, even if fresh. Use for critical real-time data.
useQuery({
  queryKey: ['notifications'],
  queryFn: getNotifications,
  refetchOnMount: 'always',   // fetch every time the component appears ✅
})

// false:
//   Never trigger a refetch on mount. Only fetch the first time.
useQuery({
  queryKey: ['config'],
  queryFn: getAppConfig,
  refetchOnMount: false,      // fetch once, never auto-refetch on mount
  staleTime: Infinity,
})
```

```tsx
// ── refetchOnWindowFocus: the "user returns to tab" pattern ───────────────
// Scenario: user switches tabs, does something elsewhere, returns
// With refetchOnWindowFocus: true + staleTime: 0
//   → immediately background-refetches all stale queries
//   → new data shown without user doing anything
//   → feels like near-real-time without WebSockets

// Disable globally in development (reduces noise when debugging):
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: process.env.NODE_ENV !== 'development',
    }
  }
})

// Disable per query for data that focus-refetch would be annoying for:
useQuery({
  queryKey: ['draft', draftId],
  queryFn:  ({ signal }) => getDraft(draftId, signal),
  refetchOnWindowFocus: false,  // editing a draft — don't overwrite local changes
})
```

```tsx
// ── refetchOnReconnect: offline recovery ──────────────────────────────────
// User loses network → reconnects
// All stale queries background-refetch automatically
// Component shows cached data during offline, refreshes on reconnect ✅

// Pair with online status for UX
function useOnlineStatus() {
  return useSyncExternalStore(
    cb => { window.addEventListener('online', cb); window.addEventListener('offline', cb)
             return () => { window.removeEventListener('online', cb)
                            window.removeEventListener('offline', cb) } },
    () => navigator.onLine, () => true
  )
}

function OfflineBanner() {
  const isOnline = useOnlineStatus()
  if (isOnline) return null
  return <div className="offline-banner">You're offline — showing cached data</div>
}
```

---

## W — Why It Matters

- `refetchOnWindowFocus` simulates real-time data without WebSockets for most apps — a user spending 10 minutes in another tab comes back to see current data, not 10-minute-old snapshots.
- `refetchOnMount: 'always'` is the escape hatch for components where you must guarantee fresh data (payment confirmation, order status) regardless of staleTime.
- Disabling `refetchOnWindowFocus` in development is a quality-of-life setting — every time you Alt+Tab from your IDE to the browser, the dev tools trigger refetches that clutter your network panel.

---

## I — Interview Q&A

### Q: When does TanStack Query automatically refetch and how can you control it?

**A:** TanStack Query refetches stale queries on three triggers: (1) **Mount** — when a component using a stale query mounts, a background refetch starts. (2) **Window focus** — when the browser tab/window regains focus, all stale queries refetch. (3) **Network reconnect** — when the network comes back online after being offline. All three are enabled by default. Each trigger has three possible values: `true` (refetch if stale), `'always'` (always refetch), or `false` (never). They can be set globally on the `QueryClient` or per query. The key condition: **these only fire if the query is currently stale** — if `staleTime` hasn't expired yet, the trigger is ignored and cached data is served without any network request.

---

## C — Common Pitfalls + Fix

### ❌ Infinite refetch loop from refetchOnWindowFocus during form editing

```tsx
// ❌ User is editing a form. Focus trigger refetches, overwrites local form state
function EditProfile({ userId }: { userId: number }) {
  const { data: user } = useQuery({
    queryKey: ['user', userId],
    queryFn:  ({ signal }) => getUser(userId, signal),
    // refetchOnWindowFocus: true (default)
  })
  const [name, setName] = useState(user?.name ?? '')
  // User types in an external app, returns → refetch fires → user.name updates
  // → name state doesn't re-init (it's in state) but the data beneath it changes
  // confusing inconsistency between form and server data ❌
}

// ✅ Disable focus refetch for editing screens + invalidate on save
function EditProfileFixed({ userId }: { userId: number }) {
  const { data: user } = useQuery({
    queryKey: ['user', userId],
    queryFn:  ({ signal }) => getUser(userId, signal),
    refetchOnWindowFocus: false,   // ✅ user is actively editing — don't disrupt
    staleTime: 1000 * 60 * 5,
  })
  const [name, setName] = useState(user?.name ?? '')

  const qc = useQueryClient()
  async function handleSave() {
    await updateUser(userId, { name })
    qc.invalidateQueries({ queryKey: ['user', userId] })   // explicit refresh on save ✅
  }
}
```

---

## K — Coding Challenge + Solution

### Challenge

Build a `LiveOrderStatus` component: always refetch on mount, refetch every 10 seconds, and show an offline banner when disconnected.

### Solution

```tsx
type OrderStatus = 'pending' | 'processing' | 'shipped' | 'delivered' | 'cancelled'
interface Order { id: number; status: OrderStatus; updatedAt: string }

function useOrderStatus(orderId: number) {
  return useQuery({
    queryKey:  ['order', orderId, 'status'],
    queryFn:   ({ signal }) => fetchOrderStatus(orderId, signal),
    refetchOnMount:       'always',     // always fresh on mount ✅
    refetchOnWindowFocus: true,
    refetchOnReconnect:   true,
    refetchInterval:      1000 * 10,    // poll every 10 seconds ✅
    staleTime:            0,            // always stale — real-time status
  })
}

function LiveOrderStatus({ orderId }: { orderId: number }) {
  const isOnline = useOnlineStatus()
  const { data: order, isLoading, isFetching, error } = useOrderStatus(orderId)

  const STATUS_COLORS: Record<OrderStatus, string> = {
    pending:    '#f59e0b',
    processing: '#3b82f6',
    shipped:    '#8b5cf6',
    delivered:  '#10b981',
    cancelled:  '#ef4444',
  }

  return (
    <div className="order-status-card">
      {!isOnline && (
        <div className="offline-banner" role="status">
          📴 Offline — showing last known status
        </div>
      )}
      {isLoading ? (
        <div className="skeleton" style={{ height: 60 }} />
      ) : error ? (
        <p role="alert">Failed to load order status</p>
      ) : order ? (
        <div>
          <span
            className="status-badge"
            style={{ background: STATUS_COLORS[order.status] }}
          >
            {order.status.toUpperCase()}
          </span>
          <p>Last updated: {new Date(order.updatedAt).toLocaleTimeString()}</p>
          {isFetching && <span className="pulse-dot" aria-label="Refreshing" />}
        </div>
      ) : null}
    </div>
  )
}
```

---

---

# 6 — Retry Defaults

---

## T — TL;DR

When a query function throws, TanStack Query **automatically retries** it up to 3 times with exponential backoff before marking the query as errored. This masks transient network failures from the user. Configure retry count and delay per query or globally.

---

## K — Key Concepts

```tsx
// ── Default retry behavior ────────────────────────────────────────────────
// retry: 3 — retries 3 times before marking as error
// retryDelay: exponential backoff — 1s, 2s, 4s (capped at 30s)

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry:      3,
      retryDelay: (attempt) => Math.min(1000 * 2 ** attempt, 30_000),
      // attempt 0 → 1s, attempt 1 → 2s, attempt 2 → 4s, attempt 3 → 8s...capped at 30s
    }
  }
})
```

```tsx
// ── Per-query retry configuration ────────────────────────────────────────
// No retry: fail immediately (user-facing writes, validation errors)
useQuery({
  queryKey: ['critical-payment-status'],
  queryFn:  getPaymentStatus,
  retry:    0,   // fail fast — no retry for payment state
})

// Custom retry count
useQuery({
  queryKey: ['flaky-service'],
  queryFn:  getFlakyService,
  retry:    5,   // more patient for a known unstable service
})

// Custom retry delay (linear instead of exponential)
useQuery({
  queryKey: ['data'],
  queryFn:  getData,
  retryDelay: 2000,   // flat 2s between retries
})

// Conditional retry: only retry on specific errors
useQuery({
  queryKey: ['resource'],
  queryFn:  getResource,
  retry: (failureCount, error) => {
    // Don't retry 4xx errors — they won't resolve themselves
    if ((error as any)?.status >= 400 && (error as any)?.status < 500) return false
    return failureCount < 3   // retry up to 3x for 5xx / network errors
  },
})
```

```tsx
// ── Retry behavior timeline ───────────────────────────────────────────────
// Request fails (attempt 0)
//   → wait 1s → retry (attempt 1)
//   → wait 2s → retry (attempt 2)
//   → wait 4s → retry (attempt 3)
//   → all retries exhausted → status = 'error' → isError = true

// During retries: status stays 'pending', isLoading stays true
// User sees loading state — not error — for transient failures ✅
// Only after all retries fail: error state shown

// ── failureCount in retry function ────────────────────────────────────────
useQuery({
  queryKey: ['posts'],
  queryFn:  getPosts,
  retry: (failureCount, error) => {
    console.log(`Attempt ${failureCount + 1} failed:`, error)
    // failureCount: 0 on first failure, 1 on second, etc.
    return failureCount < 2   // retry at most 2 more times (3 total attempts)
  },
  retryDelay: (attempt) => {
    console.log(`Retrying in ${Math.min(1000 * 2 ** attempt, 10_000)}ms`)
    return Math.min(1000 * 2 ** attempt, 10_000)
  },
})
```

---

## W — Why It Matters

- 3 retries with exponential backoff handles the most common real-world failure: a brief network hiccup or a server restarting. The user never sees an error for a 1-second outage.
- Conditional retry (`retry: (count, error) => error.status !== 404`) is important for correctness — retrying a 404 (Not Found) or 403 (Forbidden) will never succeed and wastes time before showing the error.
- Mutations should typically have `retry: 0` — retrying a POST/PATCH/DELETE without knowing if the first attempt succeeded can cause duplicate operations (duplicate orders, double payments).

---

## I — Interview Q&A

### Q: What is the default retry behavior in TanStack Query and when should you change it?

**A:** By default, failed queries retry 3 times with exponential backoff — 1 second, 2 seconds, 4 seconds between attempts — before the query enters error state. During retries, the query stays in `pending` / `isLoading` state; the user sees a loading indicator, not an error. Change it when: (1) The error is deterministic and won't resolve with retries (4xx errors) — use a conditional retry function that returns `false` for client errors. (2) The query is time-sensitive (real-time data) — reduce retries or delay to fail faster and show a recovery UI sooner. (3) The service is known-flaky — increase retries. (4) Mutations — set `retry: 0` to prevent duplicate writes when the network recovers between retry attempts.

---

## C — Common Pitfalls + Fix

### ❌ Retrying 4xx errors — wastes time before showing actionable error

```tsx
// ❌ Default retry retries ALL errors — including 404, 401, 403
// User must wait 1+2+4 = 7 seconds before seeing "Not Found" ❌
function PostDetail({ postId }: { postId: number }) {
  const { data, error, isError } = useQuery({
    queryKey: ['post', postId],
    queryFn:  ({ signal }) => getPost(postId, signal),
    // retry: 3 (default) — retries a 404 three times before error state ❌
  })
}

// ✅ Smart retry: only for recoverable errors (5xx, network)
class ApiError extends Error {
  constructor(public status: number, message: string) { super(message) }
}

async function getPostSafe(id: number, signal: AbortSignal): Promise<Post> {
  const res = await fetch(`/api/posts/${id}`, { signal })
  if (!res.ok) throw new ApiError(res.status, res.statusText)
  return res.json()
}

function PostDetailFixed({ postId }: { postId: number }) {
  const { data, error, isError } = useQuery({
    queryKey: ['post', postId],
    queryFn:  ({ signal }) => getPostSafe(postId, signal),
    retry: (failureCount, error) => {
      if (error instanceof ApiError && error.status < 500) return false   // ❌ don't retry 4xx
      return failureCount < 3  // retry up to 3× for 5xx / network errors ✅
    },
  })
}
```

---

## K — Coding Challenge + Solution

### Challenge

Build a `useResilientQuery` hook that wraps `useQuery` with smart retry: no retry for 4xx, 3 retries with backoff for 5xx/network, and a custom `onRetry` callback for logging.

### Solution

```tsx
import { useQuery, UseQueryOptions, QueryKey } from '@tanstack/react-query'

class HttpError extends Error {
  constructor(public status: number, public statusText: string) {
    super(`HTTP ${status}: ${statusText}`)
    this.name = 'HttpError'
  }
}

export async function safeFetch<T>(url: string, signal: AbortSignal): Promise<T> {
  const res = await fetch(url, { signal })
  if (!res.ok) throw new HttpError(res.status, res.statusText)
  return res.json()
}

interface ResilientOptions<T> extends Omit<UseQueryOptions<T>, 'retry' | 'retryDelay'> {
  onRetry?: (attempt: number, error: Error) => void
  maxRetries?: number
}

function useResilientQuery<T>(options: ResilientOptions<T>) {
  const { onRetry, maxRetries = 3, ...queryOptions } = options

  return useQuery<T>({
    ...queryOptions,
    retry: (failureCount, error) => {
      // Never retry client errors — they won't resolve
      if (error instanceof HttpError && error.status >= 400 && error.status < 500) {
        return false
      }
      return failureCount < maxRetries
    },
    retryDelay: (attempt, error) => {
      const delay = Math.min(1000 * 2 ** attempt, 30_000)
      onRetry?.(attempt + 1, error as Error)   // log retry attempt ✅
      return delay
    },
  })
}

// Usage
function OrderDetails({ orderId }: { orderId: number }) {
  const { data, isError, error } = useResilientQuery<Order>({
    queryKey: ['order', orderId],
    queryFn:  ({ signal }) => safeFetch(`/api/orders/${orderId}`, signal),
    onRetry: (attempt, err) => {
      console.warn(`[Query retry ${attempt}] order ${orderId}:`, err.message)
      // Could also send to error monitoring service
    },
    maxRetries: 2,
  })

  if (isError) return <ErrorCard error={error as Error} />
  return <div>{data?.status}</div>
}
```

---

---

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

# 8 — Structural Sharing

---

## T — TL;DR

**Structural sharing** means TanStack Query reuses the same JavaScript object references for unchanged parts of the response. If a refetch returns the same data, the component does NOT re-render. Only changed parts get new references — React's `===` comparison catches unchanged props and bails out.

---

## K — Key Concepts

```tsx
// ── What structural sharing does ──────────────────────────────────────────
// Without structural sharing:
//   Every fetch → new objects → new references → everything re-renders

// With structural sharing (TanStack Query default):
//   Fetch returns same data → same references kept → no re-renders
//   Fetch returns partially changed data → only changed subtrees get new refs

// Example:
const users = [
  { id: 1, name: 'Alice', active: true },
  { id: 2, name: 'Bob',   active: false },
]

// Refetch returns: only Bob's active changed to true
const newUsers = [
  { id: 1, name: 'Alice', active: true },   // identical to previous
  { id: 2, name: 'Bob',   active: true },   // changed
]

// With structural sharing:
//   newUsers[0] === users[0]   → true  (same reference ✅ — Alice's component doesn't re-render)
//   newUsers[1] === users[1]   → false (new reference — Bob's component re-renders ✅)
```

```tsx
// ── Structural sharing + React.memo ──────────────────────────────────────
const UserRow = memo(function UserRow({ user }: { user: User }) {
  console.log('UserRow render:', user.id)
  return <tr><td>{user.name}</td><td>{user.active ? 'Active' : 'Inactive'}</td></tr>
})

function UserTable() {
  const { data: users = [] } = useQuery({
    queryKey: ['users'],
    queryFn:  ({ signal }) => getUsers(signal),
  })
  // Background refetch runs — only Bob changed
  // UserRow for Alice: memo receives same reference → skips render ✅
  // UserRow for Bob: memo receives new reference → re-renders ✅
  return (
    <table>
      <tbody>{users.map(u => <UserRow key={u.id} user={u} />)}</tbody>
    </table>
  )
}
```

```tsx
// ── select + structural sharing: precision subscriptions ─────────────────
// Component A: only cares about active user count
function ActiveCount() {
  const { data: count } = useQuery({
    queryKey: ['users'],
    queryFn:  ({ signal }) => getUsers(signal),
    select: users => users.filter(u => u.active).length,
    // Structural sharing on SELECT result:
    // If count hasn't changed → same primitive → no re-render ✅
  })
  return <p>Active: {count}</p>
}

// Component B: only cares about admin names
function AdminNames() {
  const { data: adminNames } = useQuery({
    queryKey: ['users'],
    queryFn:  ({ signal }) => getUsers(signal),
    select: users => users
      .filter(u => u.role === 'admin')
      .map(u => u.name),
    // Both components subscribe to ['users'] — ONE network request
    // But each gets its own select transformation ✅
  })
  return <ul>{adminNames?.map(n => <li key={n}>{n}</li>)}</ul>
}
```

```tsx
// ── Disabling structural sharing ──────────────────────────────────────────
// Rare use case: when you intentionally need a new reference on every fetch
useQuery({
  queryKey: ['stream-data'],
  queryFn:  getStreamData,
  structuralSharing: false,   // every fetch = new references = re-render everything
})

// Also accept a custom comparison function (advanced):
useQuery({
  queryKey: ['data'],
  queryFn:  getData,
  structuralSharing: (oldData, newData) => {
    // Return oldData if logically equal, newData if different
    return JSON.stringify(oldData) === JSON.stringify(newData) ? oldData : newData
  },
})
```

---

## W — Why It Matters

- Structural sharing is the reason background refetches don't cause the entire UI to flash — only the components whose data actually changed re-render.
- Combined with `React.memo` and `select`, structural sharing creates surgically precise re-renders: a list of 100 users where only one changed produces exactly one row re-render.
- When a background refetch returns identical data (common when `staleTime` is short and the data doesn't change often), zero re-renders happen. The network request fires but the UI is completely undisturbed.

---

## I — Interview Q&A

### Q: What is structural sharing in TanStack Query and why does it improve performance?

**A:** After a query refetch, TanStack Query deeply compares the new response against the cached data. For any part of the response that is identical (deep equality), it reuses the existing JavaScript object reference instead of using the new one. For parts that changed, it creates new references. This matters because React uses reference equality (`===`) for change detection — `React.memo` and `useMemo` dependencies check if a reference changed. With structural sharing: a background refetch that returns unchanged data produces zero re-renders. A refetch that changes one item in a 100-item list produces one re-render for that item's component, not 100. Without structural sharing, every refetch would produce all-new references, causing every subscriber to re-render regardless of whether their data changed.

---

## C — Common Pitfalls + Fix

### ❌ Expecting structural sharing to work through a select that creates a new array

```tsx
// ❌ select creates a new array reference on every call — even if contents are same
function ActiveUsersBad() {
  const { data: activeUsers } = useQuery({
    queryKey: ['users'],
    queryFn:  ({ signal }) => getUsers(signal),
    select: users => users.filter(u => u.active),
    // [].filter() ALWAYS returns a new array reference ❌
    // Even if the active users haven't changed → new reference → re-render
  })
  // Passes activeUsers to a memo'd child → memo always sees "new" prop → always re-renders ❌
}

// ✅ Structural sharing DOES work on the select result for objects inside the array
// The array itself is new, but the objects inside are stable if unchanged ✅
// For the array reference stability: use a custom selector or useMemo

function ActiveUsersFixed() {
  const { data: allUsers = [] } = useQuery({
    queryKey: ['users'],
    queryFn:  ({ signal }) => getUsers(signal),
    // No select — keep full data, structural sharing works for objects ✅
  })
  // Filter outside — memo'd child receives stable user objects ✅
  const activeUsers = useMemo(() => allUsers.filter(u => u.active), [allUsers])
  // allUsers reference only changes when TQ detects data changed
  // So activeUsers only recomputes when actual data changes ✅
}
```

---

## K — Coding Challenge + Solution

### Challenge

Demonstrate structural sharing with a `memo`'d list row: show that only the changed row re-renders after a background refetch that modifies one item.

### Solution

```tsx
interface Product { id: number; name: string; price: number; stock: number }

// Memo'd row — only re-renders when its product reference changes
const ProductRow = memo(function ProductRow({ product }: { product: Product }) {
  const renderCount = useRef(0)
  renderCount.current++

  return (
    <tr style={{ background: renderCount.current > 1 ? '#fffbcd' : 'white' }}>
      <td>{product.name}</td>
      <td>${product.price}</td>
      <td>{product.stock}</td>
      <td style={{ fontSize: 11, color: '#888' }}>
        Renders: {renderCount.current}
      </td>
    </tr>
  )
})
// After a background refetch where only product id=2's stock changed:
// → ProductRow for id=1: same object reference → memo bails out → 1 render total ✅
// → ProductRow for id=2: new object reference  → re-renders                    → ✅

function ProductInventoryTable() {
  const qc = useQueryClient()
  const { data: products = [], isFetching } = useQuery({
    queryKey: ['products'],
    queryFn:  ({ signal }) => getProducts(signal),
    staleTime: 0,
  })

  // Simulate a change to product id=2 only
  function simulateStockUpdate() {
    qc.setQueryData<Product[]>(['products'], old => old?.map(p =>
      p.id === 2 ? { ...p, stock: p.stock - 1 } : p   // only product 2 changes
    ) ?? [])
  }

  return (
    <div>
      {isFetching && <p>🔄 Refreshing…</p>}
      <button onClick={simulateStockUpdate}>Sell one of product #2</button>
      <table>
        <thead><tr><th>Name</th><th>Price</th><th>Stock</th><th>Debug</th></tr></thead>
        <tbody>
          {products.map(p => <ProductRow key={p.id} product={p} />)}
        </tbody>
      </table>
      <p style={{ fontSize: 12 }}>
        Only the row for product #2 should increment its render count ✅
      </p>
    </div>
  )
}
```

---

---

# 9 — Cache Lifecycle

---

## T — TL;DR

A cache entry moves through four phases: **fetching → fresh → stale → inactive → deleted**. Understanding the lifecycle explains every TanStack Query behavior — when network requests fire, when components get instant data, when memory is freed.

---

## K — Key Concepts

```
── Cache entry state machine ─────────────────────────────────────────────────

[No entry] ──mount/trigger──→ [FETCHING]
                                  │
                              success
                                  │
                                  ↓
                             [FRESH]  ← within staleTime
                                  │
                             staleTime expires
                                  │
                                  ↓
                             [STALE]  ← refetch triggers honored
                                  │
                    ┌─────────────┴───────────────┐
               all observers              refetch trigger fires
               unmount                         │
                    │                      background fetch
                    ↓                           │
               [INACTIVE]              update if data changed
                    │                           │
               gcTime expires              stay STALE
                    │
                    ↓
               [DELETED] ← next mount shows loading state
```

```tsx
// ── Observing lifecycle in code ────────────────────────────────────────────
import { useQueryClient } from '@tanstack/react-query'

function CacheLifecycleDebugger({ queryKey }: { queryKey: string[] }) {
  const qc = useQueryClient()
  const query = qc.getQueryCache().find({ queryKey })

  return (
    <pre style={{ fontSize: 11 }}>
      {JSON.stringify({
        state:        query?.state.status,         // 'pending'|'error'|'success'
        fetchStatus:  query?.state.fetchStatus,    // 'fetching'|'paused'|'idle'
        dataUpdatedAt: query?.state.dataUpdatedAt, // timestamp
        errorUpdatedAt: query?.state.errorUpdatedAt,
        isInvalidated:  query?.state.isInvalidated, // manually invalidated
        observerCount:  query?.getObserversCount(), // components subscribed
      }, null, 2)}
    </pre>
  )
}
```

```tsx
// ── Manual lifecycle control ──────────────────────────────────────────────
const qc = useQueryClient()

// 1. FORCE to stale + trigger background refetch
qc.invalidateQueries({ queryKey: ['users'] })
// All active ['users'] queries: marked stale + background refetch starts immediately
// All inactive ['users'] queries: marked stale (will refetch on next mount)

// 2. DELETE from cache immediately
qc.removeQueries({ queryKey: ['user', 42] })
// Cache entry deleted — next mount shows loading state

// 3. WRITE directly to cache (skip network)
qc.setQueryData(['users'], (old: User[] | undefined) =>
  [...(old ?? []), newUser]
)
// Instant update — structural sharing kicks in for unchanged elements

// 4. PREFETCH: add to cache before component mounts
await qc.prefetchQuery({
  queryKey: ['user', userId],
  queryFn:  ({ signal }) => getUser(userId, signal),
  staleTime: 1000 * 60 * 5,  // don't prefetch if already fresh
})

// 5. CANCEL in-flight query
qc.cancelQueries({ queryKey: ['users'] })
```

```tsx
// ── Cache invalidation after mutations ────────────────────────────────────
// The most important lifecycle pattern in real apps:
// After writing data → invalidate related queries → triggers background refetch

async function updateUserName(userId: number, name: string) {
  await fetch(`/api/users/${userId}`, {
    method: 'PATCH',
    body: JSON.stringify({ name }),
    headers: { 'Content-Type': 'application/json' },
  })
}

function EditUserName({ userId }: { userId: number }) {
  const qc = useQueryClient()
  const [name, setName] = useState('')

  async function handleSave() {
    await updateUserName(userId, name)

    // Invalidate strategies:
    // A: Invalidate just this user → triggers refetch of ['user', userId]
    qc.invalidateQueries({ queryKey: ['user', userId] })

    // B: Invalidate all users (lists + detail) → e.g. if a list shows user names
    qc.invalidateQueries({ queryKey: ['users'] })  // all ['users', *] queries

    // C: Optimistic — set cache directly, skip refetch
    qc.setQueryData(['user', userId], (old: User | undefined) =>
      old ? { ...old, name } : old
    )
  }
}
```

---

## W — Why It Matters

- The lifecycle model explains why navigating back to a previously visited page feels instant — the cache entry is inactive but not yet GC'd, so the component mounts into a "stale but cached" state (instant render + background refetch).
- `invalidateQueries` after mutations is the cache lifecycle control you use most — it's how you keep server state consistent after writes without manually managing refetch logic.
- Understanding the observer count (zero = inactive, timer starts) explains memory behavior — TanStack Query is not a global store that holds data forever; it's a cache with deliberate expiry.

---

## I — Interview Q&A

### Q: What happens to a cached query when all components using it unmount?

**A:** When the last component subscribed to a query unmounts, the query's observer count drops to zero and it enters the **inactive** state. The cache entry is not immediately deleted — TanStack Query starts a `gcTime` timer (default 5 minutes). During this window, if any component mounts and subscribes to the same query key, it receives the cached data instantly (stale or fresh depending on staleTime). If the gcTime expires with no new subscribers, the cache entry is garbage collected — the next mount starts from a blank loading state. This design enables "instant navigation back" for recently visited data while still freeing memory for data that hasn't been accessed in a while.

---

## C — Common Pitfalls + Fix

### ❌ Calling `invalidateQueries` with too broad a scope after every mutation

```tsx
// ❌ Invalidating everything after any mutation — re-fetches the entire app
function SaveSettings() {
  const qc = useQueryClient()

  async function handleSave(settings: Settings) {
    await updateSettings(settings)
    qc.invalidateQueries()   // ❌ no filter — invalidates ALL cached queries
    // This triggers a refetch storm: users, products, orders, stats — all re-fetch
  }
}

// ❌ Too broad key — invalidates unrelated sibling queries
async function updateUserProfile(userId: number, data: Partial<User>) {
  await patchUser(userId, data)
  qc.invalidateQueries({ queryKey: ['users'] })
  // ↑ Invalidates ['users', 'list'], ['users', 'detail', 1],
  //   ['users', 'detail', 2], etc. — all user queries refetch
  // Fine if your user list DOES need to refresh, over-broad if not ❌
}

// ✅ Targeted invalidation: only what changed
async function updateUserProfileFixed(userId: number, data: Partial<User>) {
  await patchUser(userId, data)

  // Only this user's detail — if the list doesn't show the changed field
  qc.invalidateQueries({ queryKey: userKeys.detail(userId) })

  // If the list DOES show updated fields (e.g. user name in a list):
  // qc.invalidateQueries({ queryKey: userKeys.lists() })

  // For instant feedback + background truth: combine optimistic + invalidate
  qc.setQueryData(userKeys.detail(userId), (old: User | undefined) =>
    old ? { ...old, ...data } : old
  )
  qc.invalidateQueries({ queryKey: userKeys.detail(userId) })
}
```

---

## K — Coding Challenge + Solution

### Challenge

Build a `usePostWithInvalidation` pattern: `useQuery` for a single post, a `savePost` function that updates the post and invalidates both the single post AND the posts list.

### Solution

```tsx
// query-keys/posts.ts
export const postKeys = {
  all:    ()          => ['posts']                      as const,
  lists:  ()          => [...postKeys.all(), 'list']    as const,
  detail: (id: number) => [...postKeys.all(), 'detail', id] as const,
}

// api/posts.ts
export interface Post { id: number; title: string; body: string; authorId: number }

export async function fetchPost(id: number, signal: AbortSignal): Promise<Post> {
  const res = await fetch(`/api/posts/${id}`, { signal })
  if (!res.ok) throw new Error(`fetchPost(${id}): ${res.status}`)
  return res.json()
}

export async function patchPost(id: number, data: Partial<Post>): Promise<Post> {
  const res = await fetch(`/api/posts/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })
  if (!res.ok) throw new Error(`patchPost(${id}): ${res.status}`)
  return res.json()
}

// hooks/usePost.ts
function usePost(postId: number) {
  const qc = useQueryClient()

  const query = useQuery({
    queryKey: postKeys.detail(postId),
    queryFn:  ({ signal }) => fetchPost(postId, signal),
    staleTime: 1000 * 60,
  })

  async function savePost(data: Partial<Post>): Promise<void> {
    // Step 1: Optimistic update — instant UI feedback
    qc.setQueryData<Post>(postKeys.detail(postId), old =>
      old ? { ...old, ...data } : old
    )
    try {
      // Step 2: Persist to server
      await patchPost(postId, data)
      // Step 3: Invalidate to confirm server truth
      await qc.invalidateQueries({ queryKey: postKeys.detail(postId) })
      // Step 4: Also refresh the list (title may have changed)
      await qc.invalidateQueries({ queryKey: postKeys.lists() })
    } catch (error) {
      // Step 5: Rollback on failure — refetch to restore truth
      qc.invalidateQueries({ queryKey: postKeys.detail(postId) })
      throw error
    }
  }

  return { ...query, savePost }
}

// Usage
function PostEditor({ postId }: { postId: number }) {
  const { data: post, isLoading, savePost } = usePost(postId)
  const [title, setTitle] = useState('')

  useEffect(() => {
    if (post) setTitle(post.title)
  }, [post?.id])   // only reset when switching posts

  if (isLoading) return <div className="skeleton" style={{ height: 200 }} />

  return (
    <div>
      <input value={title} onChange={e => setTitle(e.target.value)} />
      <button onClick={() => savePost({ title })}>Save</button>
      {/* Post list (if rendered) auto-refreshes after save ✅ */}
    </div>
  )
}
```

---

## ✅ Day 8 Complete — Query Keys and Cache Behavior

| # | Subtopic | Status |
|---|----------|--------|
| 1 | Query Keys as Unique Serializable Arrays | ☐ |
| 2 | Variable-Dependent Keys | ☐ |
| 3 | Deterministic Hashing + Cache Identity | ☐ |
| 4 | Stale-by-Default Behavior | ☐ |
| 5 | Refetch on Mount, Focus, and Reconnect | ☐ |
| 6 | Retry Defaults | ☐ |
| 7 | staleTime + gcTime | ☐ |
| 8 | Structural Sharing | ☐ |
| 9 | Cache Lifecycle | ☐ |

---

## 🗺️ One-Page Mental Model — Day 8

```
QUERY KEYS AS ARRAYS
  Always an array — ['resource', id, { filters }]
  Hierarchical: domain → variant → specific → params
  Factory pattern: userKeys.detail(42) → centralised, refactorable
  JSON-serializable only: strings, numbers, booleans, plain objects, arrays
  ❌ Functions, class instances, Date objects, undefined in keys
  undefined silently ignored → use null instead

VARIABLE-DEPENDENT KEYS
  Variable in key = automatic re-fetch when variable changes
  Replaces useEffect([userId], () => fetch(userId)) entirely
  enabled: !!value → conditional/dependent queries
  Each page number → separate cache entry → instant back-navigation
  debounce + enabled: length > 1 → performant search

DETERMINISTIC HASHING
  hashKey() sorts object keys before hashing — order irrelevant ✅
  ['users', {role:'admin',page:1}] === ['users', {page:1,role:'admin'}]
  Type matters: 1 (number) ≠ '1' (string) → different cache entries ❌
  Array element ORDER matters: [1,2] ≠ [2,1]
  Sort arrays before putting in key if order shouldn't distinguish entries

STALE-BY-DEFAULT
  Default staleTime: 0 → every query immediately stale after fetch
  Stale ≠ gone: cached data served instantly while background refetch runs
  Fresh window: refetch triggers ignored — no extra network requests
  staleTime: Infinity → fetch once per session (static reference data)
  isStale, dataUpdatedAt → observe freshness in components

REFETCH TRIGGERS
  refetchOnMount: true — refetch stale on component mount
  refetchOnWindowFocus: true — refetch stale when tab regains focus
  refetchOnReconnect: true — refetch stale when network reconnects
  'always' mode — refetch even if fresh (critical real-time data)
  false — never auto-refetch (editing screens, offline-first)
  All triggers only fire when query IS stale

RETRY DEFAULTS
  retry: 3 — retries 3× before error state
  retryDelay: exponential backoff 1s → 2s → 4s → ... capped at 30s
  During retries: status stays pending → user sees loading, not error
  Conditional retry: don't retry 4xx (deterministic failures)
  Mutations: retry: 0 → prevent duplicate writes

staleTime + gcTime
  staleTime: freshness window — when can triggers refetch?
  gcTime: memory window — when is unused cache deleted?
  Rule: staleTime ≤ gcTime always
  gcTime: 0 — delete immediately on unmount (sensitive data)
  gcTime: Infinity — keep for entire session (static data)
  After gcTime: next mount = loading state (cache gone)

STRUCTURAL SHARING
  Refetch compares new vs old data deeply
  Unchanged parts: same JavaScript reference kept
  Changed parts: new reference created
  React.memo + structural sharing = only changed rows re-render
  select + structural sharing = component re-renders only when selection changes
  structuralSharing: false — force new references (rare)

CACHE LIFECYCLE
  [fetching] → [fresh] → [stale] → [inactive] → [deleted]
  inactive starts when all observers (components) unmount
  gcTime timer starts at inactive — data survives for gcTime
  invalidateQueries: mark stale + trigger background refetch immediately
  removeQueries: delete cache entry immediately
  setQueryData: write to cache directly (optimistic updates)
  prefetchQuery: warm cache before component mounts
  Targeted invalidation: only invalidate what actually changed
```

> **Your next action:** Open your project's TanStack Query DevTools. Find a query that's yellow (stale). Click it and check `dataUpdatedAt`. Now click Invalidate — watch it go blue (fetching) → green (fresh). Then adjust its `staleTime` and observe when it turns yellow again. Five minutes of DevTools exploration teaches cache behavior better than any re-read.

> "Doing one small thing beats opening a feed."