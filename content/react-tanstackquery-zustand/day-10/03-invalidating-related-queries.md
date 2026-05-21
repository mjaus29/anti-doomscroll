# 3 — Invalidating Related Queries

---

## T — TL;DR

One mutation often affects multiple queries across different parts of the cache. Invalidate them all — but precisely. Over-invalidation causes unnecessary refetches; under-invalidation leaves stale data on screen.

---

## K — Key Concepts

```tsx
// ── Multiple targeted invalidations ──────────────────────────────────────
function useCreateComment(postId: number, authorId: number) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (text: string) => createComment({ postId, authorId, text }),
    onSuccess: () => {
      // The comment was created — what changed in the cache?
      qc.invalidateQueries({ queryKey: commentKeys.byPost(postId) })  // post's comments
      qc.invalidateQueries({ queryKey: postKeys.detail(postId) })     // post's comment count
      qc.invalidateQueries({ queryKey: userKeys.detail(authorId) })   // author's activity
      // NOT invalidating: ['products'], ['orders'] — unrelated ✅
    },
  })
}
```

```tsx
// ── Invalidation strategies by mutation type ──────────────────────────────
// CREATE: invalidate parent list
onSuccess: (newItem) => {
  qc.invalidateQueries({ queryKey: postKeys.lists() })
  // Optionally: seed the detail cache with the response
  qc.setQueryData(postKeys.detail(newItem.id), newItem)
}

// UPDATE: invalidate detail + any lists that show the field
onSuccess: (_, { postId }) => {
  qc.invalidateQueries({ queryKey: postKeys.detail(postId) })
  qc.invalidateQueries({ queryKey: postKeys.lists() })  // if list shows updated fields
}

// DELETE: invalidate lists only (detail will 404 — remove it)
onSuccess: (_, postId) => {
  qc.invalidateQueries({ queryKey: postKeys.lists() })
  qc.removeQueries({ queryKey: postKeys.detail(postId) })  // gone from server ✅
}
```

```tsx
// ── Scoped invalidation with predicate ────────────────────────────────────
// Invalidate all queries that contain a specific userId anywhere in the key
function invalidateUserData(qc: QueryClient, userId: number) {
  qc.invalidateQueries({
    predicate: query =>
      query.queryKey.some(part =>
        (typeof part === 'number' && part === userId) ||
        (typeof part === 'object' && part !== null && (part as any).userId === userId)
      ),
  })
}
```

---

## W — Why It Matters

- Every mutation changes some fact about the world — if the cache has queries that reflect that fact, they must be invalidated or they'll show lies. Listing every affected key in `onSuccess` is the audit.
- Removing a deleted item's detail cache (`qc.removeQueries`) is cleaner than invalidating it — a refetch of a deleted resource would return 404, putting the cache in an error state.
- The predicate filter enables "invalidate everything related to this user" across heterogeneous query keys — essential when a user's data appears in notifications, activity feeds, and profile at different key shapes.

---

## I — Interview Q&A

### Q: How do you decide which queries to invalidate after a mutation?

**A:** Ask: "What server-side facts changed as a result of this mutation?" Then find every query whose cached value reflects those facts. For a `createComment`: the comment list for that post changed (count + new item), the post's `commentCount` changed, and the author's activity count changed — invalidate all three. For a `deleteUser`: invalidate the user detail, any list that includes users, and any query that shows the user's authored content. The heuristic: create → invalidate lists; update → invalidate the specific detail + any lists showing the changed field; delete → remove the detail + invalidate lists. Over-invalidation is safe but causes extra network traffic; under-invalidation causes stale UI bugs.

---

## C — Common Pitfalls + Fix

### ❌ Invalidating everything after every mutation — refetch storm

```tsx
// ❌ Nukes the entire cache after every write
function useSaveSettings() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: saveSettings,
    onSuccess: () => {
      qc.invalidateQueries()   // ❌ all queries refetch — users, products, orders, charts
    },
  })
}

// ✅ Surgical invalidation
function useSaveSettingsFixed() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: saveSettings,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['settings'] })         // ✅ only settings
      qc.invalidateQueries({ queryKey: ['user', 'me'] })       // ✅ profile may have changed
      // Everything else stays cached — no wasted requests ✅
    },
  })
}
```

---

## K — Coding Challenge + Solution

### Challenge

Write the complete invalidation strategy for a `movePostToCategory` mutation — it changes a post's category, affecting the post detail, both old and new category's post lists, and the category counts.

### Solution

```tsx
interface MovePostArgs { postId: number; fromCategoryId: number; toCategoryId: number }

async function movePostToCategory(args: MovePostArgs): Promise<Post> {
  const res = await fetch(`/api/posts/${args.postId}/category`, {
    method:  'PUT',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify({ categoryId: args.toCategoryId }),
  })
  if (!res.ok) throw new Error(`movePost: ${res.status}`)
  return res.json()
}

function useMovePost() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: movePostToCategory,
    onSuccess: (updatedPost, { postId, fromCategoryId, toCategoryId }) => {
      // 1. Post detail: category field changed
      qc.invalidateQueries({ queryKey: postKeys.detail(postId) })

      // 2. Old category's post list: post no longer there
      qc.invalidateQueries({ queryKey: postKeys.byCategory(fromCategoryId) })

      // 3. New category's post list: post added
      qc.invalidateQueries({ queryKey: postKeys.byCategory(toCategoryId) })

      // 4. Category counts: both counts changed
      qc.invalidateQueries({ queryKey: categoryKeys.detail(fromCategoryId) })
      qc.invalidateQueries({ queryKey: categoryKeys.detail(toCategoryId) })

      // 5. Optionally: seed the post detail cache immediately (no extra request)
      qc.setQueryData(postKeys.detail(postId), updatedPost)
    },
  })
}
```

---

---
