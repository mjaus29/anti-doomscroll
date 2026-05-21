
# 📅 Day 10 — Mutations and Advanced Server State

> **Goal:** Write data with `useMutation`, keep the cache consistent after writes, implement optimistic UI, paginate with placeholders, and stream infinite lists.
> **Format:** Each subtopic = 5–15 min. Do one. Stop. Come back.
> **Stack:** React 19.2.5 · TypeScript 6.0 · @tanstack/react-query 5.100.1

---

## 📋 Day 10 Subtopic Overview

| # | Subtopic | Time |
|---|----------|------|
| 1 | useMutation + Mutation Lifecycle | 12 min |
| 2 | useQueryClient + Invalidation from Mutations | 10 min |
| 3 | Invalidating Related Queries | 10 min |
| 4 | Direct Cache Updates with setQueryData | 10 min |
| 5 | Optimistic Updates + Rollback Mindset | 12 min |
| 6 | Query Cancellation with AbortSignal | 10 min |
| 7 | Paginated Queries + placeholderData + keepPreviousData | 12 min |
| 8 | useInfiniteQuery + fetchNextPage + getNextPageParam | 12 min |
| 9 | Avoiding Loading Flicker in Large Lists | 10 min |

---

---

# 1 — useMutation + Mutation Lifecycle

---

## T — TL;DR

`useMutation` handles any state-changing operation: POST, PATCH, PUT, DELETE. It gives you `mutate` / `mutateAsync`, a lifecycle (`onMutate → onSuccess | onError → onSettled`), and loading/error/success states — no `useEffect` needed.

---

## K — Key Concepts

```tsx
import { useMutation } from '@tanstack/react-query'

// ── Basic anatomy ─────────────────────────────────────────────────────────
const {
  mutate,         // (variables) => void — fire and forget
  mutateAsync,    // (variables) => Promise — await the result
  isPending,      // true while mutation is in flight
  isSuccess,      // true after successful completion
  isError,        // true after failure
  error,          // Error | null
  data,           // TData | undefined — response from mutationFn
  reset,          // () => void — reset to idle state
} = useMutation({
  mutationFn: async (newUser: NewUser) => {
    const res = await fetch('/api/users', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify(newUser),
    })
    if (!res.ok) throw new Error(`Create user failed: ${res.status}`)
    return res.json() as Promise<User>
  },
})
```

```tsx
// ── Lifecycle callbacks ────────────────────────────────────────────────────
const mutation = useMutation({
  mutationFn: createUser,

  onMutate: async (variables) => {
    // Fires BEFORE mutationFn — use for optimistic updates
    console.log('About to create:', variables)
    return { timestamp: Date.now() }  // context passed to onError/onSettled
  },

  onSuccess: (data, variables, context) => {
    // Fires after mutationFn resolves
    console.log('Created user:', data)
    // ← best place to invalidate queries
  },

  onError: (error, variables, context) => {
    // Fires after mutationFn throws
    console.error('Failed to create user:', error.message)
    // ← rollback optimistic updates here
  },

  onSettled: (data, error, variables, context) => {
    // Fires after onSuccess OR onError — always
    // ← good place for cleanup regardless of outcome
  },
})
```

```tsx
// ── mutate vs mutateAsync ────────────────────────────────────────────────
function CreateUserForm() {
  const mutation = useMutation({ mutationFn: createUser })

  // mutate: fire-and-forget, errors handled in onError callback
  function handleSimpleSubmit(data: NewUser) {
    mutation.mutate(data)
  }

  // mutateAsync: use when you need to await and handle errors locally
  async function handleAsyncSubmit(data: NewUser) {
    try {
      const user = await mutation.mutateAsync(data)
      router.push(`/users/${user.id}`)    // redirect after success ✅
    } catch (err) {
      console.error('Mutation failed:', err)
    }
  }

  return (
    <form onSubmit={e => { e.preventDefault(); mutation.mutate({ name: 'Alice' }) }}>
      <button type="submit" disabled={mutation.isPending}>
        {mutation.isPending ? 'Creating…' : 'Create User'}
      </button>
      {mutation.isError && (
        <p role="alert">{(mutation.error as Error).message}</p>
      )}
      {mutation.isSuccess && <p>User created!</p>}
    </form>
  )
}
```

```tsx
// ── Mutation state machine ────────────────────────────────────────────────
// idle → pending → success
//              ↘ error
//
// idle:    not yet called, or after reset()
// pending: mutationFn in flight
// success: resolved with data
// error:   threw an error
// reset(): goes back to idle from success or error
```

---

## W — Why It Matters

- `useMutation` replaces the `loading/error/success` state pattern you'd otherwise build with 3 `useState` calls and a `try/catch` in an event handler — every time, consistently.
- The lifecycle callbacks (`onMutate`, `onSuccess`, `onError`, `onSettled`) provide clean hooks for optimistic updates, cache invalidation, analytics, and rollback — co-located with the mutation, not scattered in event handlers.
- `mutateAsync` is essential when the result of a mutation determines navigation or triggers a follow-up action — `mutate` is simpler when side effects live in callbacks.

---

## I — Interview Q&A

### Q: What is the difference between `mutate` and `mutateAsync` in TanStack Query?

**A:** Both call the `mutationFn`. `mutate` is fire-and-forget — it returns `void`, and you handle success/error in the lifecycle callbacks (`onSuccess`, `onError`). It swallows errors so they don't propagate as unhandled promise rejections. `mutateAsync` returns a `Promise` — you can `await` it and handle results inline with `try/catch`. Use `mutate` when the mutation has no follow-up logic in the calling component (callbacks handle everything). Use `mutateAsync` when you need to chain actions on the result — redirect after creation, show a second modal, or trigger a dependent mutation.

---

## C — Common Pitfalls + Fix

### ❌ Calling `mutate` inside `useEffect` — side effects from effects

```tsx
// ❌ mutate in useEffect — fires on every render where deps change
function AutoSaveBad({ data }: { data: FormData }) {
  const mutation = useMutation({ mutationFn: saveData })
  useEffect(() => {
    mutation.mutate(data)   // ❌ fires immediately on every data change
  }, [data])
}

// ✅ Debounce + explicit trigger, or use refetch pattern for reads
function AutoSaveGood({ data }: { data: FormData }) {
  const mutation = useMutation({ mutationFn: saveData })
  const debouncedSave = useDebouncedCallback(
    () => mutation.mutate(data), 1000
  )
  useEffect(() => { debouncedSave() }, [data, debouncedSave])
  return <span>{mutation.isPending ? 'Saving…' : 'Saved'}</span>
}
```

---

## K — Coding Challenge + Solution

### Challenge

Build a `DeleteButton` using `useMutation` with `isPending` disabled state, confirmation step, error display, and `onSuccess` callback.

### Solution

```tsx
async function deletePost(postId: number): Promise<void> {
  const res = await fetch(`/api/posts/${postId}`, { method: 'DELETE' })
  if (!res.ok) throw new Error(`Delete failed: ${res.status}`)
}

function DeleteButton({
  postId, onDeleted
}: { postId: number; onDeleted: () => void }) {
  const [confirmed, setConfirmed] = useState(false)

  const mutation = useMutation({
    mutationFn: () => deletePost(postId),
    onSuccess:  () => { onDeleted(); setConfirmed(false) },
    onError:    ()  => setConfirmed(false),
  })

  if (!confirmed) {
    return (
      <button onClick={() => setConfirmed(true)} className="btn-danger">
        Delete
      </button>
    )
  }

  return (
    <div className="confirm-row">
      <span>Are you sure?</span>
      <button
        onClick={() => mutation.mutate()}
        disabled={mutation.isPending}
        className="btn-danger"
      >
        {mutation.isPending ? 'Deleting…' : 'Yes, delete'}
      </button>
      <button onClick={() => setConfirmed(false)} disabled={mutation.isPending}>
        Cancel
      </button>
      {mutation.isError && (
        <p role="alert" className="error">
          {(mutation.error as Error).message}
        </p>
      )}
    </div>
  )
}
```

---

---

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

# 6 — Query Cancellation with AbortSignal

---

## T — TL;DR

TanStack Query provides an `AbortSignal` in the `QueryFunctionContext`. Pass it to `fetch` — when the query is cancelled (component unmounts, key changes, `cancelQueries` called), the in-flight request is aborted automatically.

---

## K — Key Concepts

```tsx
// ── How TanStack Query cancels queries ────────────────────────────────────
// When does TanStack Query cancel a query?
// 1. Component unmounts while query is in flight
// 2. queryKey changes (new key = new query; old is cancelled)
// 3. qc.cancelQueries({ queryKey }) is called explicitly
// 4. onMutate calls cancelQueries before optimistic update

// ── Passing signal to fetch ───────────────────────────────────────────────
function useProduct(productId: number) {
  return useQuery({
    queryKey: ['product', productId],
    queryFn: async ({ signal }) => {       // signal from TanStack ✅
      const res = await fetch(`/api/products/${productId}`, { signal })
      if (!res.ok) throw new Error(`${res.status}`)
      return res.json() as Promise<Product>
    },
  })
  // When productId changes → old request aborted → no stale response written ✅
}
```

```tsx
// ── Signal with third-party HTTP clients ─────────────────────────────────
// axios: pass signal in config
const fetchWithAxios = async ({ queryKey, signal }: QueryFunctionContext) => {
  const [, id] = queryKey as [string, number]
  const { data } = await axios.get(`/api/items/${id}`, { signal })
  return data as Item
}

// Multiple fetch calls in one queryFn — pass signal to each
const fetchUserWithPosts = async ({ queryKey, signal }: QueryFunctionContext) => {
  const [, userId] = queryKey as [string, number]
  const [user, posts] = await Promise.all([
    fetch(`/api/users/${userId}`,          { signal }).then(r => r.json()),
    fetch(`/api/posts?author=${userId}`,   { signal }).then(r => r.json()),
  ])
  // If cancelled: both requests abort ✅
  return { user, posts }
}
```

```tsx
// ── Manual cancelQueries (optimistic update pre-step) ─────────────────────
await qc.cancelQueries({ queryKey: postKeys.detail(postId) })
// Returns a Promise that resolves when the in-flight request is aborted
// ← always await this before setQueryData in onMutate

// ── What happens to the component when its query is cancelled? ─────────────
// If cancelled because component unmounted:
//   → component is gone, no state update needed
// If cancelled because key changed:
//   → TanStack starts new query for new key, old result is discarded
// If cancelled for optimistic update:
//   → setQueryData provides the value, no need for the response
```

---

## W — Why It Matters

- Without signal propagation, switching between users/products fires new requests but also keeps old ones running — the stale response from user 1 can arrive after user 2's data and overwrite it (race condition).
- Aborting on unmount prevents `setState` calls on unmounted components (the "can't perform a React state update on an unmounted component" warning in older React).
- `await cancelQueries` in `onMutate` is how you synchronize cancellation with optimistic cache writes — the await ensures the abort is acknowledged before you write the new value.

---

## I — Interview Q&A

### Q: How does TanStack Query handle query cancellation and why does it matter?

**A:** TanStack Query creates an `AbortController` per query execution and passes its `signal` through `QueryFunctionContext`. When the query is cancelled — due to key change, component unmount, or manual `cancelQueries` — TanStack calls `controller.abort()`, setting `signal.aborted = true`. If you've passed the signal to `fetch`, the browser aborts the underlying HTTP request, freeing the connection. If you haven't passed the signal, the network request continues but TanStack discards the result when it arrives. Passing the signal matters for: preventing race conditions on fast key changes (search typing), avoiding state updates on unmounted components, and ensuring optimistic updates aren't overwritten by stale responses.

---

## C — Common Pitfalls + Fix

### ❌ Catching abort errors as real errors

```tsx
// ❌ AbortError treated as a query failure — shows error state on navigation
const fetchData = async ({ signal }: QueryFunctionContext) => {
  try {
    const res = await fetch('/api/data', { signal })
    return res.json()
  } catch (err) {
    // AbortError fires when signal is aborted — treat it as non-error ✅
    // ❌ Rethrowing it here causes TanStack Query to mark query as error
    throw err
  }
}

// ✅ Let TanStack Query handle AbortError — it ignores it automatically
// Just pass the signal and don't catch AbortError:
const fetchDataFixed = async ({ signal }: QueryFunctionContext) => {
  const res = await fetch('/api/data', { signal })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  return res.json()
  // If aborted: fetch throws AbortError
  // TanStack Query catches it, recognises it as cancellation, does NOT set error state ✅
}
```

---

## K — Coding Challenge + Solution

### Challenge

Build a `useTypeahead` hook: debounced search, signal passed to fetch, search results cancelled on each new keystroke.

### Solution

```tsx
function useDebounce<T>(value: T, ms: number): T {
  const [debounced, setDebounced] = useState(value)
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), ms)
    return () => clearTimeout(timer)
  }, [value, ms])
  return debounced
}

async function searchAPI(query: string, signal: AbortSignal): Promise<SearchResult[]> {
  const res = await fetch(`/api/search?q=${encodeURIComponent(query)}`, { signal })
  if (!res.ok) throw new Error(`search: ${res.status}`)
  return res.json()
}

function useTypeahead(rawInput: string) {
  const debouncedInput = useDebounce(rawInput, 350)
  const isEnabled      = debouncedInput.trim().length >= 2

  return useQuery({
    queryKey: ['typeahead', debouncedInput],
    queryFn:  ({ signal }) => searchAPI(debouncedInput, signal),
    // When debouncedInput changes → old request aborted via signal ✅
    enabled:  isEnabled,
    staleTime: 1000 * 30,
    gcTime:    1000 * 60,
  })
}

function TypeaheadInput() {
  const [input, setInput] = useState('')
  const { data: results = [], isLoading } = useTypeahead(input)

  return (
    <div role="combobox">
      <input
        value={input}
        onChange={e => setInput(e.target.value)}
        placeholder="Search…"
        aria-label="Search"
      />
      {isLoading && input.length >= 2 && <Spinner size="sm" />}
      {results.length > 0 && (
        <ul role="listbox">
          {results.map(r => (
            <li key={r.id} role="option">{r.label}</li>
          ))}
        </ul>
      )}
    </div>
  )
}
```

---

---

# 7 — Paginated Queries + placeholderData + keepPreviousData

---

## T — TL;DR

Paginated queries use a `page` variable in the key — each page is a separate cache entry. `placeholderData: keepPreviousData` shows the current page while the next loads, eliminating the blank flash between page transitions.

---

## K — Key Concepts

```tsx
import { keepPreviousData } from '@tanstack/react-query'

// ── Basic paginated query ─────────────────────────────────────────────────
interface PageResult<T> {
  items:      T[]
  page:       number
  totalPages: number
  totalItems: number
}

function usePaginatedPosts(page: number, pageSize = 20) {
  return useQuery({
    queryKey: ['posts', 'paginated', { page, pageSize }],
    queryFn:  ({ signal }) => fetchPostsPage({ page, pageSize }, signal),
    placeholderData: keepPreviousData,   // ← no flash ✅
    staleTime: 1000 * 60,
  })
}
```

```tsx
// ── Paginated component: full implementation ───────────────────────────────
function PostsTable() {
  const [page, setPage]         = useState(1)
  const [pageSize, setPageSize] = useState(20)

  const { data, isLoading, isFetching, isPlaceholderData } = usePaginatedPosts(page, pageSize)
  const qc = useQueryClient()

  // Prefetch next page
  useEffect(() => {
    if (data && page < data.totalPages) {
      qc.prefetchQuery({
        queryKey: ['posts', 'paginated', { page: page + 1, pageSize }],
        queryFn:  ({ signal }) => fetchPostsPage({ page: page + 1, pageSize }, signal),
        staleTime: 1000 * 60,
      })
    }
  }, [page, pageSize, data, qc])

  if (isLoading) return <TableSkeleton rows={pageSize} />

  return (
    <div>
      {/* Dim while fetching next page — old page still visible ✅ */}
      <div style={{ opacity: isPlaceholderData ? 0.6 : 1, transition: 'opacity 0.2s' }}>
        <table>
          <tbody>
            {data?.items.map(post => (
              <tr key={post.id}><td>{post.title}</td></tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="pagination">
        <button disabled={page === 1} onClick={() => setPage(p => p - 1)}>
          ← Prev
        </button>
        <span>Page {page} of {data?.totalPages ?? '…'}</span>
        <button
          disabled={isPlaceholderData || page === data?.totalPages}
          onClick={() => setPage(p => p + 1)}
        >
          Next →
        </button>
        {isFetching && <span>Loading…</span>}
      </div>
    </div>
  )
}
```

```tsx
// ── Cursor-based pagination ────────────────────────────────────────────────
// Not page numbers — use a cursor token for the next batch
function useCursorPosts(cursor: string | null) {
  return useQuery({
    queryKey: ['posts', 'cursor', cursor],
    queryFn:  ({ signal }) => fetchPostsCursor(cursor, signal),
    placeholderData: keepPreviousData,
    enabled:  true,   // null cursor = first page
  })
}
```

---

## W — Why It Matters

- Without `keepPreviousData`, every page change blanks the UI while the next page loads — even if the previous page was just a second ago. It feels broken.
- Prefetching the next page (and prev page for backwards pagination) means button clicks feel instant — the page is already in cache when the user clicks.
- Disabling the "Next" button while `isPlaceholderData` is true prevents double-clicking through pages faster than requests complete, which would desync the page counter from the displayed data.

---

## I — Interview Q&A

### Q: How does `keepPreviousData` differ from a plain loading state for pagination?

**A:** Without `keepPreviousData`: when `page` changes, the key changes, TanStack Query sees no cache for the new key, sets `isLoading: true`, and `data` becomes `undefined`. The component blanks out while loading. With `keepPreviousData`: when the key changes and the new key has no cache, TanStack Query provides the previous key's data as `placeholderData`, setting `isPlaceholderData: true`. The component continues rendering the old page (usually dimmed) while the new page loads. When the new page arrives, it atomically replaces the placeholder. This is the "pagination with no flash" pattern — the user always sees something meaningful on screen.

---

## C — Common Pitfalls + Fix

### ❌ Enabling "Next" while `isPlaceholderData` — desync between UI and data

```tsx
// ❌ User clicks Next twice before first page loads → page=3 displayed but page=2 is in flight
function PaginationBad() {
  const [page, setPage] = useState(1)
  const { data, isPlaceholderData } = useQuery({ /* ... */ })

  return (
    <button onClick={() => setPage(p => p + 1)}>
      Next   {/* ❌ no disabled — can click through faster than requests */}
    </button>
  )
}

// ✅ Disable Next while showing placeholder (previous) data
function PaginationGood() {
  const [page, setPage] = useState(1)
  const { data, isPlaceholderData } = usePaginatedPosts(page)

  return (
    <button
      disabled={isPlaceholderData || !data?.totalPages || page >= data.totalPages}
      onClick={() => setPage(p => p + 1)}
    >
      Next ✅
    </button>
  )
}
```

---

## K — Coding Challenge + Solution

### Challenge

Build `useServerTable` — sortable, filterable, paginated table hook. All params in the key. Returns `{ data, page, totalPages, setPage, setSort, setFilter, isFetching }`.

### Solution

```tsx
interface TableParams { page: number; pageSize: number; sort: string; filter: string }
interface TableResult<T> { items: T[]; totalPages: number; totalItems: number }

function useServerTable<T>(
  resourceKey: string,
  fetchFn: (params: TableParams, signal: AbortSignal) => Promise<TableResult<T>>,
  initial: Pick<TableParams, 'sort' | 'pageSize'> = { sort: 'id', pageSize: 20 }
) {
  const qc = useQueryClient()
  const [page,   setPageRaw] = useState(1)
  const [sort,   setSort]    = useState(initial.sort)
  const [filter, setFilter]  = useState('')

  const params: TableParams = { page, pageSize: initial.pageSize, sort, filter }

  const query = useQuery({
    queryKey: [resourceKey, 'table', params],
    queryFn:  ({ signal }) => fetchFn(params, signal),
    placeholderData: keepPreviousData,
    staleTime: 1000 * 30,
  })

  // Reset to page 1 when sort or filter changes
  function setSort2(s: string)   { setSort(s);   setPageRaw(1) }
  function setFilter2(f: string) { setFilter(f); setPageRaw(1) }

  // Prefetch next page
  useEffect(() => {
    if (query.data && page < query.data.totalPages) {
      qc.prefetchQuery({
        queryKey: [resourceKey, 'table', { ...params, page: page + 1 }],
        queryFn:  ({ signal }) => fetchFn({ ...params, page: page + 1 }, signal),
        staleTime: 1000 * 30,
      })
    }
  }, [page, query.data])

  return {
    data:          query.data?.items ?? [],
    totalPages:    query.data?.totalPages ?? 0,
    totalItems:    query.data?.totalItems ?? 0,
    page,
    sort,
    filter,
    isFetching:    query.isFetching,
    isLoading:     query.isLoading,
    isPlaceholder: query.isPlaceholderData,
    setPage:       setPageRaw,
    setSort:       setSort2,
    setFilter:     setFilter2,
  }
}
```

---

---

# 8 — useInfiniteQuery + fetchNextPage + getNextPageParam

---

## T — TL;DR

`useInfiniteQuery` fetches a series of pages appended to a flat list — "Load more" and infinite scroll patterns. `getNextPageParam` extracts the next page cursor from each response. `fetchNextPage` triggers the next fetch.

---

## K — Key Concepts

```tsx
import { useInfiniteQuery } from '@tanstack/react-query'

// ── Anatomy ───────────────────────────────────────────────────────────────
interface PostPage { posts: Post[]; nextCursor: string | null; hasMore: boolean }

const {
  data,              // { pages: PostPage[], pageParams: unknown[] }
  fetchNextPage,     // () => void — loads the next page
  fetchPreviousPage, // () => void — loads previous (bidirectional)
  hasNextPage,       // true when getNextPageParam returned a non-undefined value
  isFetchingNextPage, // true while next page is loading
  isFetching,
  isLoading,
} = useInfiniteQuery({
  queryKey: ['posts', 'infinite'],
  queryFn:  ({ pageParam, signal }) => fetchPostsPage(pageParam as string | null, signal),
  initialPageParam: null,           // ← first page cursor (null = start)
  getNextPageParam: (lastPage) =>   // ← extract cursor for next fetch
    lastPage.hasMore ? lastPage.nextCursor : undefined,
  // returning undefined from getNextPageParam sets hasNextPage = false ✅
})
```

```tsx
// ── Flattening pages into a single list ──────────────────────────────────
function InfinitePostFeed() {
  const {
    data, fetchNextPage, hasNextPage, isFetchingNextPage, isLoading
  } = useInfiniteQuery({
    queryKey:         ['feed'],
    queryFn:          ({ pageParam, signal }) => fetchFeed(pageParam, signal),
    initialPageParam: 0,   // offset-based: start at 0
    getNextPageParam: (lastPage, allPages) => {
      const nextOffset = allPages.length * 20
      return nextOffset < lastPage.total ? nextOffset : undefined
    },
  })

  // Flatten pages into one array
  const posts = data?.pages.flatMap(page => page.posts) ?? []

  if (isLoading) return <FeedSkeleton />

  return (
    <div>
      <ul>
        {posts.map(post => <PostCard key={post.id} post={post} />)}
      </ul>
      <button
        onClick={() => fetchNextPage()}
        disabled={!hasNextPage || isFetchingNextPage}
      >
        {isFetchingNextPage
          ? 'Loading more…'
          : hasNextPage
            ? 'Load more'
            : 'All posts loaded'}
      </button>
    </div>
  )
}
```

```tsx
// ── Infinite scroll with IntersectionObserver ─────────────────────────────
function InfiniteScrollFeed() {
  const { data, fetchNextPage, hasNextPage, isFetchingNextPage } = useInfiniteQuery({
    queryKey:         ['feed', 'scroll'],
    queryFn:          ({ pageParam, signal }) => fetchFeed(pageParam, signal),
    initialPageParam: null,
    getNextPageParam: last => last.nextCursor ?? undefined,
  })

  const loadMoreRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const el = loadMoreRef.current
    if (!el) return
    const observer = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting && hasNextPage && !isFetchingNextPage) {
        fetchNextPage()   // auto-load when sentinel enters viewport ✅
      }
    }, { threshold: 0.1 })
    observer.observe(el)
    return () => observer.disconnect()
  }, [hasNextPage, isFetchingNextPage, fetchNextPage])

  const posts = data?.pages.flatMap(p => p.posts) ?? []
  return (
    <div>
      {posts.map(p => <PostCard key={p.id} post={p} />)}
      <div ref={loadMoreRef} style={{ height: 20 }}>
        {isFetchingNextPage && <Spinner />}
      </div>
    </div>
  )
}
```

---

## W — Why It Matters

- `useInfiniteQuery` manages the multi-page data structure for you — without it, you'd build a custom accumulator that appends pages to an array and tracks the current cursor, handling loading states for each page.
- `hasNextPage` derived from `getNextPageParam` is the clean end-of-list signal — return `undefined` when there's no more data and the "Load more" button disables itself automatically.
- Each page is cached in `data.pages[n]` — re-visiting the feed is instant for already-fetched pages, and new pages load incrementally.

---

## I — Interview Q&A

### Q: How does `getNextPageParam` control pagination in `useInfiniteQuery`?

**A:** `getNextPageParam` is a function TanStack Query calls after each page fetch. It receives the last fetched page's data and the array of all fetched pages, and must return the `pageParam` for the next fetch — or `undefined` if there are no more pages. The returned value becomes `pageParam` in the next `queryFn` call. When it returns `undefined`, `hasNextPage` is set to `false`. This is how you support both cursor-based pagination (`nextCursor: 'abc123'`) and offset-based (`nextOffset: 40`) — you just extract the right value from the response. The `initialPageParam` option sets the `pageParam` for the very first fetch (typically `null` for cursors or `0` for offsets).

---

## C — Common Pitfalls + Fix

### ❌ Not using `flatMap` — accessing `data.pages` in the component

```tsx
// ❌ Accessing raw pages structure in component — verbose and fragile
function InfiniteBad() {
  const { data } = useInfiniteQuery({ /* ... */ })
  return (
    <div>
      {data?.pages.map((page, pageIdx) =>
        page.items.map(item => <div key={`${pageIdx}-${item.id}`}>{item.name}</div>)
      )}
    </div>
  )
}
// ❌ Keys may collide across pages if items don't have unique IDs globally
// ❌ Component logic knows about the page structure

// ✅ Flatten in useMemo or select
function InfiniteGood() {
  const { data, fetchNextPage, hasNextPage } = useInfiniteQuery({
    /* ... */
    // Or use select to flatten at the query layer:
    // select: data => ({ ...data, items: data.pages.flatMap(p => p.items) })
  })
  const items = useMemo(
    () => data?.pages.flatMap(p => p.items) ?? [],
    [data]
  )
  return (
    <div>
      {items.map(item => <div key={item.id}>{item.name}</div>)}
      {hasNextPage && <button onClick={() => fetchNextPage()}>More</button>}
    </div>
  )
}
```

---

## K — Coding Challenge + Solution

### Challenge

Build `useInfiniteComments`: cursor-based, `select` flattens to `{ comments, total }`, auto-load on scroll sentinel.

### Solution

```tsx
interface CommentPage { comments: Comment[]; nextCursor: string | null; total: number }

function useInfiniteComments(postId: number) {
  return useInfiniteQuery({
    queryKey:         ['comments', postId, 'infinite'],
    queryFn:          async ({ pageParam, signal }) => {
      const cursor = pageParam as string | null
      const url    = cursor
        ? `/api/posts/${postId}/comments?cursor=${cursor}`
        : `/api/posts/${postId}/comments`
      const res = await fetch(url, { signal })
      if (!res.ok) throw new Error(`comments: ${res.status}`)
      return res.json() as Promise<CommentPage>
    },
    initialPageParam: null,
    getNextPageParam: last => last.nextCursor ?? undefined,
    staleTime: 1000 * 60,
    select: data => ({
      comments: data.pages.flatMap(p => p.comments),
      total:    data.pages[0]?.total ?? 0,
    }),
  })
}

function CommentSection({ postId }: { postId: number }) {
  const {
    data, fetchNextPage, hasNextPage, isFetchingNextPage, isLoading
  } = useInfiniteComments(postId)

  const sentinelRef = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const el = sentinelRef.current
    if (!el) return
    const io = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting && hasNextPage && !isFetchingNextPage) {
        fetchNextPage()
      }
    })
    io.observe(el)
    return () => io.disconnect()
  }, [hasNextPage, isFetchingNextPage, fetchNextPage])

  if (isLoading) return <CommentsSkeleton />

  return (
    <section aria-label="Comments">
      <p>{data?.total ?? 0} comments</p>
      <ul>
        {data?.comments.map(c => (
          <li key={c.id}>{c.text}</li>
        ))}
      </ul>
      <div ref={sentinelRef}>
        {isFetchingNextPage && <Spinner />}
        {!hasNextPage && <p>All comments loaded.</p>}
      </div>
    </section>
  )
}
```

---

---

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