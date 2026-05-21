# 4 — Reusable Query Hooks

---

## T — TL;DR

Extract `useQuery` calls into **named custom hooks** (`useUser`, `useProducts`). Components declare intent with a readable hook name; the hook owns the key, queryFn, and options. One change to the hook updates every consumer.

---

## K — Key Concepts

```tsx
// ── The pattern: colocate key + queryFn + options in one hook ─────────────
// hooks/queries/useUser.ts

import { useQuery, useQueryClient } from '@tanstack/react-query'
import { userKeys }  from '../query-keys/users'
import { getUser, getUsersByRole, User } from '../api/users'

// Single user
export function useUser(userId: number | null) {
  return useQuery({
    queryKey:  userKeys.detail(userId ?? 0),
    queryFn:   ({ signal }) => getUser(userId!, signal),
    enabled:   userId !== null && userId > 0,
    staleTime: 1000 * 60 * 5,
  })
}

// User list with filters
export function useUsers(role?: string) {
  return useQuery({
    queryKey:  role ? userKeys.list({ role }) : userKeys.lists(),
    queryFn:   ({ signal }) => getUsersByRole(role ?? 'all', signal),
    staleTime: 1000 * 60 * 2,
  })
}

// Paired mutation invalidator
export function useInvalidateUser() {
  const qc = useQueryClient()
  return {
    invalidateUser:  (id: number) => qc.invalidateQueries({ queryKey: userKeys.detail(id) }),
    invalidateUsers: ()           => qc.invalidateQueries({ queryKey: userKeys.all() }),
  }
}
```

```tsx
// ── Components become thin consumers ──────────────────────────────────────
// Before: component knows queryKey structure, queryFn, staleTime
function UserCardBefore({ userId }: { userId: number }) {
  const { data: user } = useQuery({
    queryKey: ['user', 'detail', userId],     // key details leaked into component
    queryFn:  ({ signal }) => fetch(`/api/users/${userId}`, { signal }).then(r => r.json()),
    staleTime: 1000 * 60 * 5,
  })
  return <div>{user?.name}</div>
}

// After: component declares intent, knows nothing about implementation
function UserCardAfter({ userId }: { userId: number }) {
  const { data: user } = useUser(userId)    // clean, readable, zero coupling ✅
  return <div>{user?.name}</div>
}
```

```tsx
// ── Composing hooks: data from multiple queries in one hook ────────────────
// hooks/queries/useUserWithPosts.ts
interface UserWithPosts {
  user:      User
  posts:     Post[]
  postCount: number
}

function useUserWithPosts(userId: number) {
  const userQuery = useUser(userId)

  const postsQuery = useQuery({
    queryKey:  postKeys.byAuthor(userId),
    queryFn:   ({ signal }) => getPostsByAuthor(userId, signal),
    enabled:   !!userQuery.data,
    staleTime: 1000 * 60,
    select:    posts => ({ posts, postCount: posts.length }),
  })

  return {
    user:       userQuery.data,
    posts:      postsQuery.data?.posts      ?? [],
    postCount:  postsQuery.data?.postCount  ?? 0,
    isLoading:  userQuery.isLoading || postsQuery.isLoading,
    isError:    userQuery.isError   || postsQuery.isError,
    error:      userQuery.error     ?? postsQuery.error,
  }
}

// Usage: one hook, full context
function AuthorProfile({ userId }: { userId: number }) {
  const { user, posts, postCount, isLoading } = useUserWithPosts(userId)
  if (isLoading) return <ProfileSkeleton />
  return (
    <div>
      <h1>{user?.name}</h1>
      <p>{postCount} posts</p>
      <PostGrid posts={posts} />
    </div>
  )
}
```

---

## W — Why It Matters

- When query key structure changes (renaming an endpoint, adding a field), a reusable hook means one file update instead of hunting through every component.
- Hook names document intent: `useActiveProducts()` is more readable than a raw `useQuery` with a complex key in every component. Code becomes self-documenting.
- Reusable hooks can encapsulate `select`, error transformation, retry config, and staleTime — implementation details invisible to consumers. Swap the backend URL or response shape in one place.

---

## I — Interview Q&A

### Q: Why should `useQuery` calls be extracted into custom hooks?

**A:** Extracting `useQuery` into a named hook (`useUser`, `useOrders`) provides: (1) **Single source of truth** — query key, query function, staleTime, and select logic live in one place. Refactoring touches one file, not every component. (2) **Readable component code** — `useUser(id)` communicates intent instantly; a raw `useQuery` with a complex key leaks implementation. (3) **Encapsulation** — consumers don't know whether data comes from REST, GraphQL, or cache. You can swap the implementation without touching components. (4) **Composability** — hooks can call other hooks, building a dependency graph declaratively. (5) **Type safety** — the return type is inferred once in the hook definition and propagates everywhere.

---

## C — Common Pitfalls + Fix

### ❌ Copy-pasting queryKey strings across files

```tsx
// ❌ Same key in three places — one typo and invalidation breaks silently
// ProductList.tsx
useQuery({ queryKey: ['products', 'list'], queryFn: getProducts })

// ProductForm.tsx (mutation)
qc.invalidateQueries({ queryKey: ['product', 'list'] })  // ❌ typo: 'product' not 'products'
// Invalidation silently misses

// ProductSearch.tsx
useQuery({ queryKey: ['products', 'list'], queryFn: searchProducts })
// Different queryFn, same key → wrong data served from cache ❌

// ✅ One hook, one source of truth
// hooks/queries/useProducts.ts
export function useProducts() {
  return useQuery({
    queryKey: productKeys.list(),
    queryFn:  ({ signal }) => getProducts(signal),
    staleTime: 1000 * 60 * 5,
  })
}
// ProductList.tsx, ProductSearch.tsx, ProductForm.tsx all import useProducts ✅
// Invalidation uses productKeys.list() — never a raw string ✅
```

---

## K — Coding Challenge + Solution

### Challenge

Build a `useNotifications` hook that returns unread count, marks all as read (via `setQueryData`), and exposes `isLoading` + `error`.

### Solution

```tsx
// query-keys/notifications.ts
export const notifKeys = {
  all:    ()           => ['notifications']              as const,
  list:   (userId: number) => ['notifications', userId, 'list'] as const,
  unread: (userId: number) => ['notifications', userId, 'unread'] as const,
}

// api/notifications.ts
export interface Notification {
  id:     number
  text:   string
  read:   boolean
  sentAt: string
}

export async function fetchNotifications(
  userId: number, signal: AbortSignal
): Promise<Notification[]> {
  const res = await fetch(`/api/users/${userId}/notifications`, { signal })
  if (!res.ok) throw new Error(`fetchNotifications: ${res.status}`)
  return res.json()
}

export async function markAllReadAPI(userId: number): Promise<void> {
  const res = await fetch(`/api/users/${userId}/notifications/read-all`, { method: 'POST' })
  if (!res.ok) throw new Error(`markAllRead: ${res.status}`)
}

// hooks/queries/useNotifications.ts
function useNotifications(userId: number) {
  const qc = useQueryClient()

  const query = useQuery({
    queryKey:  notifKeys.list(userId),
    queryFn:   ({ signal }) => fetchNotifications(userId, signal),
    staleTime: 0,
    refetchOnWindowFocus: true,
    select: notifications => ({
      all:         notifications,
      unreadCount: notifications.filter(n => !n.read).length,
    }),
  })

  async function markAllRead() {
    // Optimistic update
    qc.setQueryData<Notification[]>(notifKeys.list(userId), old =>
      old?.map(n => ({ ...n, read: true })) ?? []
    )
    try {
      await markAllReadAPI(userId)
      qc.invalidateQueries({ queryKey: notifKeys.list(userId) })
    } catch (err) {
      qc.invalidateQueries({ queryKey: notifKeys.list(userId) })
      throw err
    }
  }

  return {
    notifications: query.data?.all         ?? [],
    unreadCount:   query.data?.unreadCount ?? 0,
    isLoading:     query.isLoading,
    error:         query.error as Error | null,
    markAllRead,
  }
}

function NotificationBell({ userId }: { userId: number }) {
  const { unreadCount, notifications, markAllRead, isLoading } = useNotifications(userId)
  return (
    <div>
      <button onClick={markAllRead} aria-label={`${unreadCount} unread notifications`}>
        🔔 {unreadCount > 0 && <span className="badge">{unreadCount}</span>}
      </button>
      {!isLoading && (
        <ul>
          {notifications.map(n => (
            <li key={n.id} style={{ fontWeight: n.read ? 'normal' : 'bold' }}>
              {n.text}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
```

---

---
