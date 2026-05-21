# 9 — Stable Serialization

---

## T — TL;DR

**Stable serialization** means the same params always produce the **same string** — regardless of how the object was constructed. This matters for caching, URL comparison, history deduplication, and testing.

---

## K — Key Concepts

### Why Stability Matters

```js
// Same logical params, different insertion order
const a = { sort: 'price', page: 2, category: 'shoes' }
const b = { category: 'shoes', page: 2, sort: 'price' }

// Manual concatenation — unstable, order-dependent
`sort=${a.sort}&page=${a.page}&category=${a.category}`  // 'sort=price&page=2&category=shoes'
`category=${b.category}&page=${b.page}&sort=${b.sort}`  // 'category=shoes&page=2&sort=price'
// Same params → different strings → cache MISS even though data is identical
```

### Default Alphabetical Sort — Built-in Stability

```js
import queryString from 'query-string'

// Different insertion orders — same output
queryString.stringify({ sort: 'price', page: 2, category: 'shoes' })
// 'category=shoes&page=2&sort=price'  ← alphabetical

queryString.stringify({ category: 'shoes', page: 2, sort: 'price' })
// 'category=shoes&page=2&sort=price'  ← same output ✅

queryString.stringify({ page: 2, sort: 'price', category: 'shoes' })
// 'category=shoes&page=2&sort=price'  ← same output ✅
```

### Custom Sort Order

```js
// Alphabetical (default)
queryString.stringify({ z: 1, a: 2, m: 3 })
// 'a=2&m=3&z=1'

// Preserve insertion order
queryString.stringify({ z: 1, a: 2, m: 3 }, { sort: false })
// 'z=1&a=2&m=3'

// Custom sort — priority fields first
const PRIORITY = ['q', 'category', 'sort', 'order', 'page', 'limit']

queryString.stringify(
  { limit: 20, q: 'shoes', page: 1, category: 'footwear', sort: 'price', order: 'asc' },
  {
    sort: (a, b) => {
      const ai = PRIORITY.indexOf(a)
      const bi = PRIORITY.indexOf(b)
      if (ai === -1 && bi === -1) return a.localeCompare(b)  // both unknown → alphabetical
      if (ai === -1) return 1   // a not in priority → after b
      if (bi === -1) return -1  // b not in priority → after a
      return ai - bi            // both in priority → by index
    }
  }
)
// 'q=shoes&category=footwear&sort=price&order=asc&page=1&limit=20'
```

### Stable Serialization for Cache Keys

```js
// Use stable stringify to build cache keys for API calls
function getCacheKey(endpoint, params) {
  const sortedParams = queryString.stringify(params)  // alphabetical by default
  return `${endpoint}?${sortedParams}`
}

const key1 = getCacheKey('/products', { sort: 'price', page: 2, category: 'shoes' })
const key2 = getCacheKey('/products', { page: 2, category: 'shoes', sort: 'price' })

console.log(key1 === key2)  // true ✅
// Same data → same cache key → cache HIT
```

### Stable Serialization for URL History Deduplication

```js
// Avoid pushing duplicate history entries when params are the same
function updateFilters(newFilters) {
  const currentParams = queryString.parse(window.location.search)
  const newParams     = { ...currentParams, ...newFilters }

  const currentQs = queryString.stringify(currentParams)
  const newQs     = queryString.stringify(newParams)

  if (currentQs === newQs) return  // nothing changed — don't push

  router.push(`/products?${newQs}`)
}
```

---

## W — Why It Matters

- Unstable serialization causes cache misses — the same data is fetched twice because two URLs represent the same query differently.
- React Query, SWR, and TanStack Query all use the query key for caching — a non-deterministic stringify causes every filter change to be treated as a new query.
- History deduplication prevents the back button from cycling through near-identical URL states that differ only in param order.
- Stable serialization is a correctness property, not just a cosmetic one — tests that compare URL strings become flaky without it.

---

## I — Interview Q&A

### Q1: What is stable serialization and why does it matter for caching?

**A:** Stable serialization means the same logical set of parameters always produces the same string output, regardless of object key insertion order. It matters for caching because cache keys derived from unstable strings may not match — the same request gets treated as two different cache entries, causing unnecessary network calls and stale data.

### Q2: How does `query-string` achieve stable serialization by default?

**A:** It sorts keys alphabetically before outputting. Any two objects with the same key-value pairs produce the same string. This is the default behavior — pass `{ sort: false }` to disable and preserve insertion order.

### Q3: When would you disable stable sorting with `{ sort: false }`?

**A:** When param order carries semantic meaning (rare), or when building a URL for display purposes where a human-defined order is preferred (e.g., priority fields first). For cache keys and API calls, always keep the default alphabetical sort.

---

## C — Common Pitfalls + Fix

### ❌ Pitfall: Using unstable serialization as a React Query key

```js
// Params object created from useState — insertion order varies
const params = { ...stateFilters, page: currentPage }

useQuery({
  queryKey: ['/products', params],  // ← unstable object key
  queryFn: () => fetchProducts(params)
})
// Same filters + same page → different object reference → cache miss every render
```

**Fix:** Use a stable string as the cache key:

```js
const stableKey = queryString.stringify(params)  // alphabetical, deterministic

useQuery({
  queryKey: ['/products', stableKey],  // ← stable string key ✅
  queryFn: () => fetchProducts(params)
})
```

### ❌ Pitfall: Comparing URLs built with unstable serialization

```js
const current = `?sort=price&page=2&category=shoes`
const next    = `?category=shoes&page=2&sort=price`

if (current === next) return  // false — same params, different order → always navigates
```

**Fix:**

```js
const normalize = (qs) => queryString.stringify(queryString.parse(qs))
if (normalize(current) === normalize(next)) return  // true ✅
```

---

## K — Coding Challenge + Solution

### Challenge

Write a `stableQueryKey(endpoint, params)` function that:
1. Removes null, undefined, and empty string values
2. Sorts keys alphabetically
3. Returns a deterministic cache key string
4. Two calls with the same logical params (different insertion order) must return identical strings

```js
stableQueryKey('/products', { sort: 'price', page: 2, q: '', category: 'shoes', brand: null })
stableQueryKey('/products', { category: 'shoes', page: 2, brand: null, sort: 'price', q: '' })
// Both return: '/products?category=shoes&page=2&sort=price'
```

### Solution

```js
import queryString from 'query-string'

function stableQueryKey(endpoint, params = {}) {
  const stable = queryString.stringify(params, {
    skipNull:        true,
    skipEmptyString: true,
    // Default sort: alphabetical (sort: true is the default)
  })

  return stable ? `${endpoint}?${stable}` : endpoint
}

// Tests
const key1 = stableQueryKey('/products', {
  sort: 'price', page: 2, q: '', category: 'shoes', brand: null
})
const key2 = stableQueryKey('/products', {
  category: 'shoes', page: 2, brand: null, sort: 'price', q: ''
})

console.log(key1)            // '/products?category=shoes&page=2&sort=price'
console.log(key2)            // '/products?category=shoes&page=2&sort=price'
console.log(key1 === key2)   // true ✅

console.log(stableQueryKey('/users', {}))
// '/users'  (no params → no ?)
```

---

---
