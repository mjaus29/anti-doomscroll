# 4 — Direct Cache Updates with setQueryData

---

## T — TL;DR

`queryClient.setQueryData(key, newData)` writes directly to the cache — no network request. Use it after a mutation response to instantly update the UI when you already have the fresh value, rather than triggering a new fetch via invalidation.

---

## K — Key Concepts

```tsx
// ── setQueryData: write to cache directly ─────────────────────────────────
const qc = useQueryClient()

// Set completely new value
qc.setQueryData<User>(userKeys.detail(42), {
  id: 42, name: 'Alice Updated', email: 'alice@example.com', role: 'admin'
})

// Updater function: read current, return new
qc.setQueryData<User[]>(userKeys.lists(), old =>
  old?.map(u => u.id === 42 ? { ...u, name: 'Alice Updated' } : u) ?? []
)
```

```tsx
// ── After create: seed detail cache from creation response ────────────────
function useCreatePost() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: createPost,
    onSuccess: (newPost) => {
      // Seed detail cache — navigating to the new post is instant ✅
      qc.setQueryData(postKeys.detail(newPost.id), newPost)
      // Still invalidate the list — it needs to include the new post
      qc.invalidateQueries({ queryKey: postKeys.lists() })
    },
  })
}

// ── After update: set detail + update item in lists ───────────────────────
function useUpdatePost() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<Post> }) =>
      patchPost(id, data),
    onSuccess: (updatedPost) => {
      // Update detail cache immediately
      qc.setQueryData<Post>(postKeys.detail(updatedPost.id), updatedPost)

      // Update the item in all list caches
      qc.setQueriesData<Post[]>(
        { queryKey: postKeys.lists() },
        old => old?.map(p => p.id === updatedPost.id ? updatedPost : p) ?? []
      )
      // No invalidation needed if mutation response is authoritative ✅
    },
  })
}
```

```tsx
// ── setQueriesData: update multiple matching caches at once ───────────────
// Updates ALL query entries whose key matches the filter
qc.setQueriesData<Post[]>(
  { queryKey: postKeys.lists() },   // matches all list variants
  old => old?.filter(p => p.id !== deletedId) ?? []
)
// Removes the deleted post from EVERY cached page/filter variant ✅
```

---

## W — Why It Matters

- `setQueryData` after a mutation response eliminates a round-trip for the most common case: the API returns the updated resource, and you can write it to cache directly instead of invalidating and re-fetching it.
- `setQueriesData` handles the "update this item everywhere it appears" problem — product price updates, user name changes — across every cached list variant without knowing which pages are cached.
- Direct cache writes are synchronous and instant — the UI updates in the same frame as the mutation success, before any network request. Combined with structural sharing, only affected components re-render.

---

## I — Interview Q&A

### Q: When should you use `setQueryData` instead of `invalidateQueries` after a mutation?

**A:** Use `setQueryData` when the mutation response contains the full, authoritative updated value — you already have what the refetch would return, so the extra request is waste. Example: `PATCH /users/42` returns the updated user object — write it to cache directly. Use `invalidateQueries` when: (1) the mutation response doesn't include all changed data, (2) the change affects derived values that your API computes (counts, aggregates), (3) multiple queries are affected and updating each manually is error-prone. Often both are used together: `setQueryData` for the direct mutation target + `invalidateQueries` for related aggregate queries.

---

## C — Common Pitfalls + Fix

### ❌ setQueryData with wrong key type — silently writes to wrong entry

```tsx
// ❌ Key mismatch — writes to a non-existent cache entry (no error thrown)
qc.setQueryData(['user', '42'], updatedUser)    // string '42'
// But the query used:
useQuery({ queryKey: ['user', 42] })             // number 42
// Result: the update goes to a ghost entry. Component still shows old data. ❌

// ✅ Always use the key factory — ensures consistent types
qc.setQueryData(userKeys.detail(42), updatedUser)    // same type as useQuery ✅

// ❌ Forgetting the updater is an immutable operation
qc.setQueryData<User[]>(userKeys.lists(), old => {
  old?.push(newUser)   // ❌ mutates the old array directly
  return old           // same reference — React won't detect change
})

// ✅ Return a new array/object
qc.setQueryData<User[]>(userKeys.lists(), old =>
  old ? [...old, newUser] : [newUser]   // ✅ new reference
)
```

---

## K — Coding Challenge + Solution

### Challenge

Build `useUpdateUserName`: patch the name, immediately update the detail cache and all user list caches, and fall back to `invalidateQueries` only if `setQueryData` encounters missing cache entries.

### Solution

```tsx
async function patchUserName(userId: number, name: string): Promise<User> {
  const res = await fetch(`/api/users/${userId}`, {
    method:  'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify({ name }),
  })
  if (!res.ok) throw new Error(`patchUserName: ${res.status}`)
  return res.json()
}

function useUpdateUserName() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ userId, name }: { userId: number; name: string }) =>
      patchUserName(userId, name),

    onSuccess: (updatedUser) => {
      // 1. Update the detail cache — instant if query is cached
      const wasDetailCached = !!qc.getQueryData(userKeys.detail(updatedUser.id))
      if (wasDetailCached) {
        qc.setQueryData<User>(userKeys.detail(updatedUser.id), updatedUser)
      } else {
        qc.invalidateQueries({ queryKey: userKeys.detail(updatedUser.id) })
      }

      // 2. Update the user in all list caches
      const listsUpdated = qc.setQueriesData<User[]>(
        { queryKey: userKeys.lists() },
        old => old?.map(u => u.id === updatedUser.id ? updatedUser : u)
      )

      // 3. If no lists were in cache, just invalidate to be safe
      if (listsUpdated.length === 0) {
        qc.invalidateQueries({ queryKey: userKeys.lists() })
      }
    },
  })
}
```

---

---
