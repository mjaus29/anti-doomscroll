# 1 — Query Keys as Unique Serializable Arrays

---

## T — TL;DR

A query key is an **array that uniquely identifies a cached entry**. TanStack Query serializes it with `JSON.stringify` to produce a stable string key. The array can contain strings, numbers, objects, and booleans — but must be serializable and deterministic.

---

## K — Key Concepts

```tsx
import { useQuery } from '@tanstack/react-query'

// ── Query key is always an array ──────────────────────────────────────────
// ❌ v3 style: string key — still accepted but loses type safety
useQuery({ queryKey: 'users', queryFn: getUsers })

// ✅ v5 style: always an array
useQuery({ queryKey: ['users'], queryFn: getUsers })

// ── Key elements communicate scope (namespace → entity → params) ──────────
// Level 1: domain/resource
['users']
['products']
['posts']

// Level 2: operation / variant
['users', 'list']
['users', 'detail']
['products', 'featured']

// Level 3: specific identifiers
['users', 'detail', 42]
['products', 'list', { category: 'shoes', page: 2 }]
['posts', 'by-author', userId]
```

```tsx
// ── Key factory pattern: the professional approach ─────────────────────────
// query-keys/users.ts
export const userKeys = {
  all:     ()              => ['users']                          as const,
  lists:   ()              => [...userKeys.all(), 'list']        as const,
  list:    (filters: UserFilters) => [...userKeys.lists(), filters] as const,
  details: ()              => [...userKeys.all(), 'detail']      as const,
  detail:  (id: number)    => [...userKeys.details(), id]        as const,
}

// Usage: consistent everywhere, centralised in one place
const { data } = useQuery({
  queryKey: userKeys.detail(42),          // ['users', 'detail', 42]
  queryFn:  ({ signal }) => getUser(42, signal),
})

// Invalidate all user queries
queryClient.invalidateQueries({ queryKey: userKeys.all() })
// Invalidate only user lists
queryClient.invalidateQueries({ queryKey: userKeys.lists() })
// Invalidate one user
queryClient.invalidateQueries({ queryKey: userKeys.detail(42) })
```

```tsx
// ── What can go in a query key ────────────────────────────────────────────
// ✅ Strings
['users', 'active']

// ✅ Numbers
['users', 42]

// ✅ Booleans
['products', true]

// ✅ Plain objects (JSON-serialized)
['products', { category: 'shoes', inStock: true }]

// ✅ Arrays inside arrays
['charts', [2024, 2025]]

// ❌ Functions — not serializable
['users', () => {}]

// ❌ Class instances — serializes to {}
['users', new Date()]   // ❌ — use Date.toISOString() instead ✅
['users', date.toISOString()]

// ❌ undefined — silently ignored; use null instead
['users', undefined]   // key becomes ['users'] — surprising ❌
['users', null]        // explicit null — intentional ✅
```

---

## W — Why It Matters

- The key **is** the cache address — every design decision (naming, structure, factory pattern) determines how fine-grained your cache invalidation is. A flat `['users']` key can't selectively invalidate one user; `['users', 'detail', 42]` can.
- Centralizing keys in factory objects means changing a key string updates every query, mutation invalidation, and prefetch that references it — without them, refactoring spreads across dozens of files.
- `undefined` in a key being silently ignored is a subtle trap — always use `null` for intentional empty values and check for `undefined` before including a parameter.

---

## I — Interview Q&A

### Q: What makes a good query key design?

**A:** Good query keys are: (1) **Hierarchical** — start with the resource (`'users'`), then narrow (`'detail'`, `42`). This lets `invalidateQueries` cascade — invalidating `['users']` invalidates every user-related query. (2) **Serializable** — only JSON-compatible values (strings, numbers, booleans, plain objects, arrays). No functions, class instances, or `undefined`. (3) **Centralized** — defined in a factory object so all usages reference the same structure. Renaming a key updates all callsites automatically. (4) **Deterministic** — the same logical query always produces the same key regardless of call order or variable naming. Object key order doesn't matter; TanStack Query sorts keys before hashing.

---

## C — Common Pitfalls + Fix

### ❌ Flat keys that can't be selectively invalidated

```tsx
// ❌ One flat key — invalidating users invalidates everything
useQuery({ queryKey: ['users'], queryFn: getAllUsers })
useQuery({ queryKey: ['users'], queryFn: () => getUser(42) })  // same key as above ❌
// Both queries share a cache entry — reading one overwrites the other

// ❌ Inconsistent key shapes across files
// file A: useQuery({ queryKey: ['user', id] })
// file B: queryClient.invalidateQueries({ queryKey: ['users', id] })
// Different key → invalidation doesn't work ❌

// ✅ Hierarchical keys + factory
export const userKeys = {
  all:    ()          => ['users']              as const,
  detail: (id: number) => ['users', 'detail', id] as const,
}

useQuery({ queryKey: userKeys.all(),       queryFn: getAllUsers })
useQuery({ queryKey: userKeys.detail(42), queryFn: ({ signal }) => getUser(42, signal) })
// Now selectively: invalidate one user vs all users ✅
```

---

## K — Coding Challenge + Solution

### Challenge

Design a complete query key factory for a `Comment` resource that supports: all comments, comments by post ID, a single comment by ID, and comments by author ID.

### Solution

```tsx
// query-keys/comments.ts
interface CommentFilters { postId?: number; authorId?: number; page?: number }

export const commentKeys = {
  // Root of all comment keys — invalidate this to clear ALL comment caches
  all:       ()                    => ['comments']                            as const,

  // All list variants
  lists:     ()                    => [...commentKeys.all(), 'list']          as const,

  // Parameterized list
  list:      (filters: CommentFilters = {}) =>
                                      [...commentKeys.lists(), filters]       as const,

  // Shortcut: comments for a specific post
  byPost:    (postId: number)      => [...commentKeys.lists(), { postId }]    as const,

  // Shortcut: comments by a specific author
  byAuthor:  (authorId: number)    => [...commentKeys.lists(), { authorId }]  as const,

  // All detail variants
  details:   ()                    => [...commentKeys.all(), 'detail']        as const,

  // Single comment
  detail:    (id: number)          => [...commentKeys.details(), id]          as const,
}

// Usage
useQuery({ queryKey: commentKeys.byPost(7),    queryFn: ({ signal }) => getCommentsByPost(7, signal) })
useQuery({ queryKey: commentKeys.byAuthor(3),  queryFn: ({ signal }) => getCommentsByAuthor(3, signal) })
useQuery({ queryKey: commentKeys.detail(99),   queryFn: ({ signal }) => getComment(99, signal) })

// Selective invalidations
queryClient.invalidateQueries({ queryKey: commentKeys.all() })       // all
queryClient.invalidateQueries({ queryKey: commentKeys.byPost(7) })   // post 7 only
queryClient.invalidateQueries({ queryKey: commentKeys.detail(99) })  // one comment
```

---

---
