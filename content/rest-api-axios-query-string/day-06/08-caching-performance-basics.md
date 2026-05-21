# 8 — Caching & Performance Basics

---

## T — TL;DR

Caching means not re-fetching data you already have. At the frontend level, three practical patterns cover 90% of cases: **in-memory cache** (per session), **HTTP cache headers** (browser-level), and **stale-while-revalidate** (show old, fetch new). Libraries like React Query handle this automatically.

---

## K — Key Concepts

### Why Caching Matters

```
Without caching:
  User navigates: Home → Products → Home → Products
  API calls: 2 (both Products fetches hit the network)

With caching (5 min TTL):
  API calls: 1 (second visit returns cached data)

On a page with 5 API calls, caching can:
  - Reduce initial load from 800ms to 200ms
  - Eliminate redundant calls on re-navigation
  - Let the app work with slow/spotty connections
```

### Pattern 1: Simple In-Memory Cache

```js
// src/lib/cache.js
const cache = new Map()

export function createCacheKey(endpoint, params) {
  const qs = queryString.stringify(params ?? {})
  return `${endpoint}${qs ? '?' + qs : ''}`
}

export async function cachedRequest(key, fetchFn, ttlMs = 5 * 60 * 1000) {
  const hit = cache.get(key)

  if (hit && Date.now() - hit.timestamp < ttlMs) {
    return hit.data  // cache HIT — return immediately
  }

  // cache MISS — fetch and store
  const data = await fetchFn()
  cache.set(key, { data, timestamp: Date.now() })
  return data
}

export function invalidateCache(key) {
  cache.delete(key)
}

export function invalidatePrefix(prefix) {
  for (const key of cache.keys()) {
    if (key.startsWith(prefix)) cache.delete(key)
  }
}
```

```js
// Usage in a service
async function getCachedProducts(params) {
  const key = createCacheKey('/products', params)
  return cachedRequest(key, () => productService.list(params))
}

// After creating a product — invalidate the list cache
async function createAndInvalidate(productData) {
  const result = await productService.create(productData)
  invalidatePrefix('/products')  // bust all product list caches
  return result
}
```

### Pattern 2: HTTP Cache Headers (Browser-Level)

```js
// Server sends these headers — browser caches automatically:
Cache-Control: max-age=300         ← browser caches for 5 min
ETag: "abc123"                     ← version fingerprint
Last-Modified: Wed, 19 May 2026 10:00:00 GMT

// On subsequent requests, browser sends:
If-None-Match: "abc123"            ← "I have this version"
// Server responds:
304 Not Modified                   ← "use your cache — nothing changed"
// Zero bytes transferred for the response body

// Frontend: nothing to implement — browser handles it automatically
// Just don't set Cache-Control: no-store or no-cache on GET endpoints
```

### Pattern 3: React Query (Recommended for Production)

```js
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import productService from '@/services/productService'
import queryString from 'query-string'

// ─── Read (with automatic caching, stale-while-revalidate, refetch)
function useProducts(filters) {
  const stableKey = queryString.stringify(filters)  // stable cache key

  return useQuery({
    queryKey:  ['products', stableKey],
    queryFn:   () => productService.list(filters).then(r => {
      if (r.error) throw r.error
      return r.data
    }),
    staleTime: 5 * 60 * 1000,   // 5 min — don't refetch if data is fresh
    gcTime:    10 * 60 * 1000,  // 10 min — keep in cache after component unmounts
    retry:     2                 // retry twice on failure
  })
}

// ─── Write (with cache invalidation)
function useCreateProduct() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (data) => productService.create(data).then(r => {
      if (r.error) throw r.error
      return r.data
    }),
    onSuccess: () => {
      // Invalidate ALL product list queries → they refetch automatically
      queryClient.invalidateQueries({ queryKey: ['products'] })
    }
  })
}

// ─── In component
function ProductsPage() {
  const filters = { sort: 'price', page: 1 }

  const { data, isLoading, error, isFetching } = useProducts(filters)
  const createProduct = useCreateProduct()

  if (isLoading) return <Skeleton />
  if (error)     return <Error message={error.message} />

  return (
    <div>
      {isFetching && <span>Updating...</span>}  {/* background refetch indicator */}
      <ProductGrid products={data?.data ?? []} />
    </div>
  )
}
```

### Cache Invalidation Rules

```
Golden rule: invalidate cache whenever data changes

On POST (create):   → invalidate list cache for that resource
On PATCH/PUT:       → invalidate specific item cache + list cache
On DELETE:          → invalidate specific item cache + list cache

Relationship invalidation:
  Creating a comment     → invalidate comments list + post (comment count changes)
  Updating user profile  → invalidate user cache + anywhere username is displayed

Never stale:
  Auth state (token, user)          → always fresh
  Shopping cart / checkout totals   → always fresh
  Stock levels / availability       → short TTL (30s) or always fresh
```

### Request Deduplication

```js
// Problem: 5 components mount at the same time, all fetch /user
// Without deduplication: 5 identical network requests fire simultaneously

// Solution: deduplicate in-flight requests
const inflightRequests = new Map()

async function deduplicatedRequest(key, fetchFn) {
  if (inflightRequests.has(key)) {
    return inflightRequests.get(key)  // return same promise
  }

  const promise = fetchFn().finally(() => inflightRequests.delete(key))
  inflightRequests.set(key, promise)
  return promise
}
// React Query does this automatically
```

---

## W — Why It Matters

- A filter page that re-fetches on every back-navigation feels slow and wastes bandwidth — caching makes it feel instant.
- Cache invalidation after mutations is the #1 caching correctness issue — users see stale data after creating/updating because the list cache wasn't busted.
- React Query / TanStack Query implements all three patterns (cache, stale-while-revalidate, deduplication, invalidation) — understanding the concepts explains why the library exists and how to use it correctly.
- HTTP cache headers are free performance — no frontend code required, just don't disable them.

---

## I — Interview Q&A

### Q1: What is `staleTime` in React Query?

**A:** The duration after data is fetched during which it's considered "fresh" — React Query won't refetch it even if the component re-mounts or the window refocuses. After `staleTime`, data is "stale" — it's still shown immediately (from cache) but a background refetch is triggered. Setting `staleTime: 5 * 60 * 1000` means "don't refetch if data is less than 5 minutes old."

### Q2: When should you invalidate a query cache after a mutation?

**A:** Immediately after any write operation that changes the data the cached query represents. Creating a product invalidates the product list. Updating a product invalidates both the specific product cache and the list. Deleting invalidates both. Use `queryClient.invalidateQueries({ queryKey: ['products'] })` in the mutation's `onSuccess` callback.

### Q3: What is request deduplication and why does React Query do it automatically?

**A:** When multiple components mount simultaneously and all trigger the same query, deduplication ensures only one network request is made — all components share the same in-flight promise and receive the same response when it resolves. Without it, a dashboard loading 10 instances of a user avatar component would make 10 identical `/user` requests.

---

## C — Common Pitfalls + Fix

### ❌ Pitfall: Never invalidating cache after mutations

```js
// Create product — cache NOT invalidated
await productService.create(data)
// User navigates to product list — sees old cached list without the new product
```

**Fix:** Always invalidate relevant caches after mutations:

```js
const result = await productService.create(data)
invalidatePrefix('/products')  // or queryClient.invalidateQueries(['products'])
```

### ❌ Pitfall: Caching mutable data like shopping cart totals

```js
// Cart total cached for 5 minutes
// User adds item → total updates server-side
// Cached total still shows old value for 5 min
```

**Fix:** Never cache real-time or user-specific mutable data. Set `staleTime: 0` or `Cache-Control: no-store` for these endpoints.

### ❌ Pitfall: Using object reference as React Query queryKey

```js
const filters = { page: 1, sort: 'price' }
useQuery({ queryKey: ['products', filters] })
// New object reference on every render → cache never hits
```

**Fix:** Serialize to a stable string:

```js
const stableKey = queryString.stringify(filters)
useQuery({ queryKey: ['products', stableKey] })
```

---

## K — Coding Challenge + Solution

### Challenge

Write a `createSimpleCache(defaultTTL)` factory that returns an object with:
1. `get(key)` — returns cached value if fresh, `null` if stale/missing
2. `set(key, value, ttl?)` — stores with timestamp
3. `invalidate(key)` — remove a specific key
4. `invalidatePattern(prefix)` — remove all keys starting with prefix
5. `stats()` — returns `{ size, hits, misses }`

### Solution

```js
function createSimpleCache(defaultTTL = 5 * 60 * 1000) {
  const store = new Map()
  let hits = 0, misses = 0

  return {
    get(key) {
      const entry = store.get(key)
      if (!entry) { misses++; return null }

      const isExpired = Date.now() - entry.timestamp > entry.ttl
      if (isExpired) { store.delete(key); misses++; return null }

      hits++
      return entry.value
    },

    set(key, value, ttl = defaultTTL) {
      store.set(key, { value, timestamp: Date.now(), ttl })
      return value
    },

    invalidate(key) {
      return store.delete(key)
    },

    invalidatePattern(prefix) {
      let count = 0
      for (const key of store.keys()) {
        if (key.startsWith(prefix)) { store.delete(key); count++ }
      }
      return count
    },

    stats() {
      return { size: store.size, hits, misses }
    }
  }
}

// Usage
const cache = createSimpleCache(5 * 60 * 1000)

async function getCachedProducts(filters) {
  const key = '/products?' + queryString.stringify(filters)
  const hit = cache.get(key)
  if (hit) return hit

  const { data } = await productService.list(filters)
  return cache.set(key, data)
}

// After create
await productService.create(data)
cache.invalidatePattern('/products')  // bust all product caches

console.log(cache.stats())  // { size: 0, hits: 1, misses: 2 }
```

---

---
