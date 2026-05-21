# 5 — Optimistic Updates + Rollback Mindset

---

## T — TL;DR

**Optimistic updates** immediately update the cache before the mutation succeeds — the UI feels instant. **Rollback** restores the old value if the mutation fails. The `onMutate` → `onError` pattern in TanStack Query makes this reliable.

---

## K — Key Concepts

```tsx
// ── The canonical optimistic update pattern ───────────────────────────────
function useToggleLike(postId: number) {
  const qc = useQueryClient()

  return useMutation({
    mutationFn: (liked: boolean) => toggleLike(postId, liked),

    // Step 1: before the request — snapshot + optimistic write
    onMutate: async (liked: boolean) => {
      // Cancel any in-flight refetch — prevent race condition ✅
      await qc.cancelQueries({ queryKey: postKeys.detail(postId) })

      // Snapshot the current value for potential rollback
      const previous = qc.getQueryData<Post>(postKeys.detail(postId))

      // Optimistically update the cache
      qc.setQueryData<Post>(postKeys.detail(postId), old =>
        old ? { ...old, liked, likeCount: old.likeCount + (liked ? 1 : -1) } : old
      )

      return { previous }   // ← context passed to onError
    },

    // Step 2a: success — invalidate to confirm server truth
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: postKeys.detail(postId) })
    },

    // Step 2b: failure — rollback using the snapshot
    onError: (err, _liked, context) => {
      if (context?.previous) {
        qc.setQueryData(postKeys.detail(postId), context.previous)  // restore ✅
      }
    },

    // Step 3: always — ensure cache is in sync after either outcome
    onSettled: () => {
      qc.invalidateQueries({ queryKey: postKeys.detail(postId) })
    },
  })
}
```

```tsx
// ── Optimistic update on a list ───────────────────────────────────────────
function useDeleteTodo() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (todoId: number) => deleteTodo(todoId),

    onMutate: async (todoId: number) => {
      await qc.cancelQueries({ queryKey: todoKeys.lists() })
      const previous = qc.getQueryData<Todo[]>(todoKeys.list({}))

      // Remove from list immediately
      qc.setQueryData<Todo[]>(todoKeys.list({}), old =>
        old?.filter(t => t.id !== todoId) ?? []
      )
      return { previous }
    },

    onError: (_err, _todoId, context) => {
      if (context?.previous) {
        qc.setQueryData(todoKeys.list({}), context.previous)
      }
    },

    onSettled: () => {
      qc.invalidateQueries({ queryKey: todoKeys.lists() })
    },
  })
}
```

```tsx
// ── The rollback mindset checklist ────────────────────────────────────────
// Before implementing optimistic update, answer:
// 1. Can I fully reconstruct the new state locally? (not just partial info)
// 2. Do I have a snapshot to roll back to?
// 3. Did I cancel in-flight queries to prevent overwrite?
// 4. Does onError restore the exact previous state?
// 5. Does onSettled confirm server truth?
// If any answer is "no" → prefer invalidation over optimistic update
```

---

## W — Why It Matters

- `await qc.cancelQueries` in `onMutate` is non-optional — without it, an in-flight background refetch could overwrite the optimistic value milliseconds after you set it, making the UI flicker or roll back unexpectedly.
- The snapshot in `onMutate` → `onError` → restore is the only correct rollback path. If you skip the snapshot and the mutation fails, the cache holds the wrong (optimistic) value permanently.
- `onSettled` invalidation after `onError` rollback ensures the cache is eventually confirmed from the server — the rollback is a UI-layer safety net, not a permanent truth.

---

## I — Interview Q&A

### Q: Walk through a complete optimistic update implementation with rollback.

**A:** Four steps: (1) `onMutate` — cancel in-flight queries with `cancelQueries`, snapshot current cache with `getQueryData`, write the predicted new value with `setQueryData`, return the snapshot as context. (2) `mutationFn` — make the real network request. (3) `onError` — receive the context, use `setQueryData` to restore the snapshot. (4) `onSettled` — invalidate the query to confirm server truth regardless of success or failure. The critical step is `cancelQueries` — without it, a background refetch that's already in flight could return the old server value and overwrite the optimistic state before the mutation response arrives.

---

## C — Common Pitfalls + Fix

### ❌ Optimistic update without cancelling in-flight queries

```tsx
// ❌ Background refetch overwrites optimistic value
function useLikeBad(postId: number) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: likePost,
    onMutate: async (liked: boolean) => {
      // No cancelQueries ❌
      const previous = qc.getQueryData(postKeys.detail(postId))
      qc.setQueryData<Post>(postKeys.detail(postId), old =>
        old ? { ...old, liked } : old
      )
      return { previous }
      // If a refetch was already in flight → it resolves → old value overwrites
      // optimistic state → like appears to un-toggle ❌
    },
  })
}

// ✅ Cancel first, then optimistically update
function useLikeGood(postId: number) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: likePost,
    onMutate: async (liked: boolean) => {
      await qc.cancelQueries({ queryKey: postKeys.detail(postId) })  // ✅
      const previous = qc.getQueryData(postKeys.detail(postId))
      qc.setQueryData<Post>(postKeys.detail(postId), old =>
        old ? { ...old, liked } : old
      )
      return { previous }
    },
    onError: (_, __, ctx) => {
      if (ctx?.previous) qc.setQueryData(postKeys.detail(postId), ctx.previous)
    },
    onSettled: () => qc.invalidateQueries({ queryKey: postKeys.detail(postId) }),
  })
}
```

---

## K — Coding Challenge + Solution

### Challenge

Build `useReorderItems` — drag-and-drop reorder of a list. Optimistically reorder the local cache immediately, call the API, roll back on error.

### Solution

```tsx
async function reorderItems(itemIds: number[]): Promise<void> {
  const res = await fetch('/api/items/reorder', {
    method:  'PUT',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify({ order: itemIds }),
  })
  if (!res.ok) throw new Error(`reorder: ${res.status}`)
}

function useReorderItems() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (orderedIds: number[]) => reorderItems(orderedIds),

    onMutate: async (orderedIds: number[]) => {
      await qc.cancelQueries({ queryKey: itemKeys.list({}) })
      const previous = qc.getQueryData<Item[]>(itemKeys.list({}))

      qc.setQueryData<Item[]>(itemKeys.list({}), old => {
        if (!old) return old
        // Reorder items array to match the new orderedIds
        return orderedIds.map(id => old.find(item => item.id === id)!).filter(Boolean)
      })
      return { previous }
    },

    onError: (_, __, ctx) => {
      if (ctx?.previous) qc.setQueryData(itemKeys.list({}), ctx.previous)
    },

    onSettled: () => qc.invalidateQueries({ queryKey: itemKeys.list({}) }),
  })
}
```

---

---
