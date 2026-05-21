# 2 — useQueryClient + Invalidation from Mutations

---

## T — TL;DR

After a mutation succeeds, call `queryClient.invalidateQueries(key)` to mark related cache entries stale and trigger a background refetch. This keeps the UI consistent without manually managing server state synchronization.

---

## K — Key Concepts

```tsx
import { useMutation, useQueryClient } from '@tanstack/react-query'

// ── The post-mutation invalidation pattern ────────────────────────────────
function useCreatePost() {
  const qc = useQueryClient()

  return useMutation({
    mutationFn: createPost,
    onSuccess: () => {
      // Mark all post list queries stale + trigger background refetch ✅
      qc.invalidateQueries({ queryKey: ['posts'] })
    },
  })
}

// ── invalidateQueries options ─────────────────────────────────────────────
// Invalidate ALL queries matching the key prefix
qc.invalidateQueries({ queryKey: ['posts'] })
// → invalidates: ['posts'], ['posts','list'], ['posts','list',{page:1}]

// Exact match only
qc.invalidateQueries({ queryKey: ['posts'], exact: true })
// → only invalidates ['posts'], not ['posts', 'list']

// With predicate — custom filter
qc.invalidateQueries({
  predicate: query =>
    query.queryKey[0] === 'posts' && query.state.status === 'success',
})
```

```tsx
// ── Where to put invalidation: onSuccess vs onSettled ────────────────────
useMutation({
  mutationFn: updateUser,

  // onSuccess: invalidate only on success (optimistic: rollback on error)
  onSuccess: (_, { userId }) => {
    qc.invalidateQueries({ queryKey: userKeys.detail(userId) })
  },

  // onSettled: always invalidate (conservative: ensure truth after any outcome)
  onSettled: (_, __, { userId }) => {
    qc.invalidateQueries({ queryKey: userKeys.detail(userId) })
  },
})
// Use onSettled when you want to guarantee server truth after error+retry
// Use onSuccess when error state has its own display and rollback handles cache
```

```tsx
// ── Awaiting invalidation before resolving mutateAsync ───────────────────
useMutation({
  mutationFn: createOrder,
  onSuccess: async (order) => {
    // Await invalidation: ensures data is fresh before navigation
    await qc.invalidateQueries({ queryKey: orderKeys.lists() })
    router.push(`/orders/${order.id}`)   // page mounts with fresh data ✅
  },
})
```

---

## W — Why It Matters

- Invalidation is the simplest correct approach to cache consistency after mutations — no manual state management, no refetch flags, just mark stale and let triggers handle the rest.
- The choice between `onSuccess` and `onSettled` is a correctness decision: `onSettled` guarantees server truth even after an error path, which prevents the cache from holding stale optimistic data if rollback failed.
- Awaiting `invalidateQueries` in `mutateAsync` flows ensures the refetch completes before navigation — the target page mounts with fresh data instead of showing a loading state.

---

## I — Interview Q&A

### Q: How do you keep the cache consistent after a mutation in TanStack Query?

**A:** The primary approach is `queryClient.invalidateQueries` in `onSuccess` or `onSettled`. This marks the related cache entries stale and immediately triggers a background refetch for any active (mounted) subscribers. The UI continues showing the previous data until the refetch completes — no loading state. For writes that affect multiple query scopes (e.g., creating a post affects the post list AND the author's post count), invalidate all affected keys. The alternative is `setQueryData` for direct cache writes when you already have the new value from the mutation response — faster but more complex to maintain.

---

## C — Common Pitfalls + Fix

### ❌ Forgetting to invalidate — stale data shown after mutation

```tsx
// ❌ No invalidation — UI shows old data after successful mutation
function usePatchUserBad(userId: number) {
  return useMutation({
    mutationFn: (data: Partial<User>) => patchUser(userId, data),
    // No onSuccess → cache not invalidated → old name shown ❌
  })
}

// ✅ Invalidate the changed query on success
function usePatchUserGood(userId: number) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: Partial<User>) => patchUser(userId, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: userKeys.detail(userId) })   // ✅
      qc.invalidateQueries({ queryKey: userKeys.lists() })          // ✅ list shows updated name
    },
  })
}
```

---

## K — Coding Challenge + Solution

### Challenge

Build `useToggleFeatured` — patches a product's `featured` flag and invalidates both the product detail and the featured products list.

### Solution

```tsx
async function patchProductFeatured(productId: number, featured: boolean): Promise<Product> {
  const res = await fetch(`/api/products/${productId}`, {
    method:  'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify({ featured }),
  })
  if (!res.ok) throw new Error(`patchProduct: ${res.status}`)
  return res.json()
}

function useToggleFeatured(productId: number) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (featured: boolean) => patchProductFeatured(productId, featured),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: productKeys.detail(productId) })
      qc.invalidateQueries({ queryKey: productKeys.list({ featured: true }) })
      qc.invalidateQueries({ queryKey: productKeys.list({ featured: false }) })
    },
    onError: (err) => console.error('Toggle failed:', err),
  })
}

function FeaturedToggle({ product }: { product: Product }) {
  const { mutate, isPending } = useToggleFeatured(product.id)
  return (
    <button
      onClick={() => mutate(!product.featured)}
      disabled={isPending}
      aria-pressed={product.featured}
    >
      {isPending ? '…' : product.featured ? '★ Featured' : '☆ Feature'}
    </button>
  )
}
```

---

---
