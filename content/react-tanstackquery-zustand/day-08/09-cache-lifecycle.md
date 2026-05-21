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
