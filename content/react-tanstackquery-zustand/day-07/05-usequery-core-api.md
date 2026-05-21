# 5 — useQuery — Core API

---

## T — TL;DR

`useQuery` subscribes a component to a cached async value. Give it a `queryKey` (cache identifier) and a `queryFn` (how to fetch the data). It returns `{ data, isLoading, isFetching, error, status, refetch }` — a complete state machine for the server data lifecycle.

---

## K — Key Concepts

```tsx
import { useQuery } from '@tanstack/react-query'

// ── Full useQuery API ─────────────────────────────────────────────────────
const {
  data,           // T | undefined — the fetched data
  error,          // Error | null
  status,         // 'pending' | 'error' | 'success'
  isLoading,      // true when: pending + no cached data (initial load)
  isFetching,     // true whenever a fetch is in flight (including background)
  isError,        // true when status === 'error'
  isSuccess,      // true when status === 'success'
  isPending,      // true when status === 'pending' (no data yet)
  isStale,        // true when data is older than staleTime
  dataUpdatedAt,  // timestamp of last successful fetch
  refetch,        // () => void — manually trigger a refetch
  isRefetching,   // true when refetching after already having data
} = useQuery({
  queryKey:             ['users', userId],  // array — determines cache identity
  queryFn:              ({ signal }) => fetchUser(userId, signal),
  enabled:              !!userId,           // don't fetch if userId is falsy
  staleTime:            1000 * 60,          // override default staleTime
  gcTime:               1000 * 60 * 5,      // override default gcTime
  retry:                2,                  // override default retry
  refetchInterval:      1000 * 30,          // poll every 30 seconds
  select:               (data) => data.name, // transform data before returning
  initialData:          cachedUsers,         // seed cache with existing data
  placeholderData:      keepPreviousData,    // keep old data while fetching new
})
```

```tsx
// ── queryKey: the cache identity ──────────────────────────────────────────
// Array — must be serializable, stable references irrelevant (JSON serialized)
// TanStack Query re-fetches whenever the key changes

// Static key: never re-fetches automatically
useQuery({ queryKey: ['products'], queryFn: getProducts })

// Dynamic key: re-fetches when userId changes
useQuery({ queryKey: ['user', userId], queryFn: ({ signal }) => getUser(userId, signal) })

// Key with filters: re-fetches when filter changes
useQuery({
  queryKey: ['products', { category, sortBy, page }],
  queryFn:  ({ signal }) => getProducts({ category, sortBy, page }, signal),
})

// Key ordering matters: ['user', 1] ≠ [1, 'user']
// Consistent factory pattern avoids accidental key collisions
```

```tsx
// ── enabled: conditional queries ─────────────────────────────────────────
function UserDetails({ userId }: { userId: number | null }) {
  const { data: user } = useQuery({
    queryKey: ['user', userId],
    queryFn:  ({ signal }) => getUser(userId!, signal),
    enabled:  userId !== null,   // don't fetch until userId is available ✅
  })
  return user ? <div>{user.name}</div> : null
}

// Dependent query: fetch user, then fetch their posts
function UserWithPosts({ userId }: { userId: number }) {
  const { data: user } = useQuery({
    queryKey: ['user', userId],
    queryFn:  ({ signal }) => getUser(userId, signal),
  })

  const { data: posts } = useQuery({
    queryKey: ['posts', { authorId: user?.id }],
    queryFn:  ({ signal }) => getPostsByAuthor(user!.id, signal),
    enabled:  !!user,   // waits for user query to succeed ✅
  })
}
```

```tsx
// ── select: transform data in the query itself ────────────────────────────
// select runs after every successful fetch AND filters re-renders:
// the component only re-renders if the SELECTED value changed

function ActiveUserCount() {
  const { data: count } = useQuery({
    queryKey: ['users'],
    queryFn:  ({ signal }) => getUsers(signal),
    select:   (users) => users.filter(u => u.active).length,
    // Component only re-renders when the COUNT changes, not when any user changes ✅
  })
  return <p>Active users: {count}</p>
}
```

---

## W — Why It Matters

- `isLoading` vs `isFetching` is a critical distinction: `isLoading` is `true` only on the very first load (no cached data), `isFetching` is `true` any time a request is in flight including background refreshes. Use `isLoading` for skeleton screens, `isFetching` for subtle loading indicators.
- `enabled` is the conditional query gate — dependent queries (fetch B only after A succeeds), auth-gated queries, and debounced search all use `enabled: !!value`.
- `select` is underused and powerful: it transforms data AND optimizes re-renders — a component using `select: d => d.count` re-renders only when the count changes, not when other fields of the query data change.

---

## I — Interview Q&A

### Q: What is the difference between `isLoading` and `isFetching` in TanStack Query?

**A:** `isLoading` is `true` only when the query is in the `pending` state AND has no cached data — the initial load with a blank slate. It shows the user has nothing to display yet. `isFetching` is `true` any time a network request is in flight, including background refetches when data is already cached. A query can be `isFetching: true` and `isLoading: false` simultaneously — this happens during background revalidation when cached (possibly stale) data is shown while a fresh fetch runs in the background. Best practice: use `isLoading` for full skeleton/spinner states (nothing to show), and `isFetching` for subtle background refresh indicators (spinner in the corner while showing stale data).

---

## C — Common Pitfalls + Fix

### ❌ Using `data` directly without handling the undefined initial state

```tsx
// ❌ data is undefined while loading — crashes on .map
function ProductList() {
  const { data } = useQuery({
    queryKey: ['products'],
    queryFn:  getProducts,
  })
  return <ul>{data.map(p => <li key={p.id}>{p.name}</li>)}</ul>
  // TypeError: Cannot read properties of undefined ❌
}

// ✅ Three approaches:
// 1. Default value in destructuring
function ProductListV1() {
  const { data: products = [] } = useQuery({
    queryKey: ['products'], queryFn: getProducts
  })
  return <ul>{products.map(p => <li key={p.id}>{p.name}</li>)}</ul>
}

// 2. Guard with isLoading + isError
function ProductListV2() {
  const { data, isLoading, error } = useQuery({
    queryKey: ['products'], queryFn: getProducts
  })
  if (isLoading) return <Spinner />
  if (error)     return <p>Error: {(error as Error).message}</p>
  return <ul>{data!.map(p => <li key={p.id}>{p.name}</li>)}</ul>
}

// 3. isSuccess narrows the type
function ProductListV3() {
  const result = useQuery({ queryKey: ['products'], queryFn: getProducts })
  if (!result.isSuccess) return null
  return <ul>{result.data.map(p => <li key={p.id}>{p.name}</li>)}</ul>
  // result.data is typed as Product[] (not undefined) after isSuccess check ✅
}
```

---

## K — Coding Challenge + Solution

### Challenge

Build a `useUserProfile` hook using `useQuery` with: enabled guard, select to expose only `{ name, email, avatarUrl }`, and staleTime of 10 minutes.

### Solution

```tsx
import { useQuery } from '@tanstack/react-query'
import { getUser, userKeys } from '../api/users'

interface UserProfile { name: string; email: string; avatarUrl: string }

function useUserProfile(userId: number | null) {
  return useQuery({
    queryKey:  userKeys.detail(userId ?? 0),
    queryFn:   ({ signal }) => getUser(userId!, signal),
    enabled:   userId !== null && userId > 0,   // don't fetch if no userId ✅
    staleTime: 1000 * 60 * 10,                  // profile fresh for 10 min ✅
    select: (user): UserProfile => ({           // transform + narrow ✅
      name:      user.name,
      email:     user.email,
      avatarUrl: user.avatarUrl ?? '/default-avatar.png',
    }),
  })
}

// Usage
function Avatar({ userId }: { userId: number | null }) {
  const { data: profile, isLoading } = useUserProfile(userId)

  if (isLoading) return <div className="avatar-skeleton" />
  if (!profile)  return <div className="avatar-empty" />

  return (
    <img
      src={profile.avatarUrl}
      alt={profile.name}
      title={profile.email}
      className="avatar"
    />
  )
}
```

---

---
