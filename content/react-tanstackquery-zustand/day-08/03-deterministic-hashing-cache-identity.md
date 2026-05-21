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
