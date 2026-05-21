# 4 — Query Functions

---

## T — TL;DR

A **query function** is any `async` function that returns data or throws an error. It receives a `QueryFunctionContext` with the `queryKey` and `signal`. Keep query functions pure, typed, and extracted into a dedicated API layer — not inline in `useQuery`.

---

## K — Key Concepts

```tsx
// ── Query function anatomy ────────────────────────────────────────────────
import { QueryFunctionContext } from '@tanstack/react-query'

// The context TanStack passes to your queryFn:
interface QueryFnContext {
  queryKey: readonly unknown[]   // the key for this query
  signal:   AbortSignal          // for cancellation ✅
  pageParam?: unknown            // for infinite queries (later)
}

// Minimal query function
const fetchUser = async (id: number): Promise<User> => {
  const res = await fetch(`/api/users/${id}`)
  if (!res.ok) throw new Error(`HTTP ${res.status}: ${res.statusText}`)
  return res.json()
}
// ⬆ Must THROW on error — TanStack Query can only catch thrown errors
// Fetch doesn't throw on 4xx/5xx — always check res.ok ✅
```

```tsx
// ── Using signal for cancellation ────────────────────────────────────────
// TanStack Query provides an AbortSignal — pass it to fetch
const fetchProducts = async ({
  queryKey, signal
}: QueryFunctionContext): Promise<Product[]> => {
  const [, category] = queryKey as [string, string]   // destructure key

  const res = await fetch(`/api/products?category=${category}`, { signal })
  if (!res.ok) throw new Error(`Failed to fetch products: ${res.status}`)
  return res.json()
}

// Usage
useQuery({
  queryKey: ['products', 'electronics'],
  queryFn:  fetchProducts,   // context (with signal) injected automatically ✅
})
```

```tsx
// ── Recommended: extract to an API layer ──────────────────────────────────
// api/users.ts — all user-related API calls in one place
import type { QueryFunctionContext } from '@tanstack/react-query'

export interface User { id: number; name: string; email: string; role: string }

export async function getUser(id: number, signal?: AbortSignal): Promise<User> {
  const res = await fetch(`/api/users/${id}`, { signal })
  if (!res.ok) throw new Error(`getUser failed: ${res.status}`)
  return res.json()
}

export async function getUsers(signal?: AbortSignal): Promise<User[]> {
  const res = await fetch('/api/users', { signal })
  if (!res.ok) throw new Error(`getUsers failed: ${res.status}`)
  return res.json()
}

export async function getUsersByRole(
  role: string, signal?: AbortSignal
): Promise<User[]> {
  const res = await fetch(`/api/users?role=${role}`, { signal })
  if (!res.ok) throw new Error(`getUsersByRole failed: ${res.status}`)
  return res.json()
}
```

```tsx
// ── Query key factories: collocate keys with fetchers ────────────────────
// query-keys.ts
export const userKeys = {
  all:    ()         => ['users']                        as const,
  lists:  ()         => [...userKeys.all(), 'list']      as const,
  list:   (role: string) => [...userKeys.lists(), role]  as const,
  detail: (id: number)   => [...userKeys.all(), id]      as const,
}

// Usage: consistent, refactorable, namespaced keys
useQuery({ queryKey: userKeys.detail(42), queryFn: ({ signal }) => getUser(42, signal) })
useQuery({ queryKey: userKeys.list('admin'), queryFn: ({ signal }) => getUsersByRole('admin', signal) })

// Invalidate all user queries at once
queryClient.invalidateQueries({ queryKey: userKeys.all() })
// Invalidate just a specific user
queryClient.invalidateQueries({ queryKey: userKeys.detail(42) })
```

---

## W — Why It Matters

- **Checking `res.ok`** is the most critical habit — `fetch` only throws on network failure, not on 4xx/5xx responses. Without the check, TanStack Query receives `{ error: "not found" }` as successful data.
- The `signal` parameter enables automatic query cancellation — when a component unmounts mid-request or the query key changes, TanStack Query calls `signal.abort()`, preventing stale responses.
- Query key factories are a scalability pattern — without them, `invalidateQueries` calls are error-prone string literals scattered throughout the codebase. With them, refactoring a key updates all usages.

---

## I — Interview Q&A

### Q: What must a query function do to work correctly with TanStack Query?

**A:** A query function must: (1) **Return a promise that resolves to the data** — it can be any async function, not just fetch. (2) **Throw an error on failure** — TanStack Query treats thrown errors as query failures; returned error objects are treated as successful data. Since `fetch` doesn't throw on non-2xx responses, you must check `response.ok` and throw manually. (3) **Accept and pass the `signal`** from the `QueryFunctionContext` to fetch (or any cancellable API) — this enables TanStack Query to cancel in-flight requests when the component unmounts or the query key changes. The function can accept the full context object or just the signal; TanStack Query injects the context automatically.

---

## C — Common Pitfalls + Fix

### ❌ Not checking `res.ok` — errors silently appear as data

```tsx
// ❌ fetch doesn't throw on 404/500 — error HTML stored as "data"
const fetchUser = async (id: number) => {
  const res = await fetch(`/api/users/${id}`)
  return res.json()   // 404 → returns { "error": "not found" } as data ❌
  // isError = false, data = { error: "not found" }, isLoading = false
}

// ❌ Axios DOES throw on non-2xx — but response.data needs no json() call
// Don't mix axios and fetch patterns

// ✅ Always check res.ok with fetch
const fetchUserFixed = async (id: number, signal?: AbortSignal): Promise<User> => {
  const res = await fetch(`/api/users/${id}`, { signal })
  if (!res.ok) {
    // Throw with enough context to show a useful error message
    const body = await res.text().catch(() => '')
    throw new Error(`Failed to fetch user ${id}: ${res.status} ${body}`)
  }
  return res.json() as Promise<User>
}
```

---

## K — Coding Challenge + Solution

### Challenge

Build a typed API layer for a `Post` resource with `getPosts`, `getPost(id)`, and `getPostsByAuthor(authorId)`. Include a query key factory. Ensure all functions check `res.ok` and pass `signal`.

### Solution

```tsx
// api/posts.ts
export interface Post {
  id:       number
  title:    string
  body:     string
  authorId: number
  tags:     string[]
  createdAt: string
}

// ── API functions ─────────────────────────────────────────────────────────
export async function getPosts(signal?: AbortSignal): Promise<Post[]> {
  const res = await fetch('/api/posts', { signal })
  if (!res.ok) throw new Error(`getPosts: ${res.status} ${res.statusText}`)
  return res.json()
}

export async function getPost(id: number, signal?: AbortSignal): Promise<Post> {
  const res = await fetch(`/api/posts/${id}`, { signal })
  if (!res.ok) throw new Error(`getPost(${id}): ${res.status}`)
  return res.json()
}

export async function getPostsByAuthor(
  authorId: number, signal?: AbortSignal
): Promise<Post[]> {
  const res = await fetch(`/api/posts?authorId=${authorId}`, { signal })
  if (!res.ok) throw new Error(`getPostsByAuthor(${authorId}): ${res.status}`)
  return res.json()
}

// ── Query key factory ─────────────────────────────────────────────────────
export const postKeys = {
  all:        ()               => ['posts']                           as const,
  lists:      ()               => [...postKeys.all(), 'list']         as const,
  list:       (filters = {})   => [...postKeys.lists(), filters]      as const,
  byAuthor:   (authorId: number) => [...postKeys.lists(), { authorId }] as const,
  details:    ()               => [...postKeys.all(), 'detail']       as const,
  detail:     (id: number)     => [...postKeys.details(), id]         as const,
}

// ── Query function wrappers (signal-aware) ────────────────────────────────
export const postQueries = {
  list:     { queryKey: postKeys.list(),     queryFn: ({ signal }: QueryFnContext) => getPosts(signal) },
  detail:   (id: number) => ({
    queryKey: postKeys.detail(id),
    queryFn:  ({ signal }: QueryFnContext) => getPost(id, signal),
  }),
  byAuthor: (authorId: number) => ({
    queryKey: postKeys.byAuthor(authorId),
    queryFn:  ({ signal }: QueryFnContext) => getPostsByAuthor(authorId, signal),
  }),
}

type QueryFnContext = { signal: AbortSignal }
```

---

---
