# 1 — Server State vs Client State

---

## T — TL;DR

**Client state** lives in the browser and you fully control it (form inputs, UI toggles, selected tab). **Server state** lives on a server and is merely a snapshot you borrow (users, posts, orders) — it can change at any time. Managing them identically is the root cause of most async data bugs.

---

## K — Key Concepts

```
── Two fundamentally different kinds of state ────────────────────────────────

CLIENT STATE                        SERVER STATE
─────────────────────────────       ──────────────────────────────────
Lives: in the browser               Lives: on a remote server / database
Owner: you                          Owner: the server
Always fresh: yes                   Always fresh: no — it's a stale snapshot
Source of truth: your code          Source of truth: the database
Examples: isOpen, searchQuery,      Examples: user profile, product list,
          activeTab, formValues              order history, notifications
Tools: useState, useReducer,        Tools: TanStack Query, SWR,
       Zustand                               RTK Query, useSyncExternalStore
```

```tsx
// ── Client state — you own it completely ─────────────────────────────────
const [isMenuOpen, setIsMenuOpen] = useState(false)
const [query, setQuery]           = useState('')
const [theme, setTheme]           = useState<'light' | 'dark'>('light')
// These never go "stale" — they are exactly what you set them to

// ── Server state — you have a snapshot, not the truth ─────────────────────
// Fetched at time T. What if another user updated it at T+30s?
const [users, setUsers] = useState<User[]>([])
useEffect(() => {
  fetch('/api/users').then(r => r.json()).then(setUsers)
}, [])
// Issues with this approach:
// - No cache: refetches on every mount even if you just fetched it
// - No background refresh: data goes stale, user sees outdated info
// - No deduplication: 3 components each fetch the same endpoint = 3 requests
// - No loading/error state machine: you build it yourself every time
// - No retry: a failed fetch just leaves the user with nothing
```

```
── Unique challenges of server state ─────────────────────────────────────────

1. STALE: your snapshot becomes outdated as the server changes
2. SHARED: multiple components need the same data
3. DEDUPLICATION: those components shouldn't each fire a separate request
4. CACHING: fresh data shouldn't be re-fetched needlessly
5. BACKGROUND SYNC: data should refresh when the window regains focus
6. MUTATIONS: writes need to trigger refetches of related queries
7. PAGINATION: partial data needs to be combined correctly
```

---

## W — Why It Matters

- Treating server state like client state (just `useState` + `useEffect`) builds every one of the above challenges manually on every fetch — you reinvent a caching layer, loading states, error boundaries, and refetch logic from scratch.
- TanStack Query's entire API is designed around the server state model — every feature (staleTime, gcTime, refetchOnWindowFocus, retry) directly solves one of these challenges.
- The distinction is the mental shift that makes TanStack Query's defaults feel obvious rather than magical — `staleTime: 0` (always stale) makes sense once you accept that server state is borrowed, not owned.

---

## I — Interview Q&A

### Q: What is the difference between server state and client state?

**A:** Client state is data that originates in the browser — form inputs, UI toggles, selected tabs. You fully control it, it's always current, and it only changes when your code changes it. Server state is data that originates on a server — user profiles, product lists, order history. Your component holds a snapshot borrowed at fetch time. The server can change it independently at any moment, making the snapshot stale. This distinction matters because server state requires a completely different management strategy: caching (avoid redundant fetches), stale tracking (know when to refetch), deduplication (one request for multiple consumers), background sync, retry on failure, and mutation-triggered invalidation. `useState` + `useEffect` handles none of these. TanStack Query handles all of them.

---

## C — Common Pitfalls + Fix

### ❌ Treating server state like client state — stale data and duplicate requests

```tsx
// ❌ Pattern that pretends server state is client state
// — No cache: fetches every time this component mounts
// — No dedup: if two instances mount simultaneously, two requests fire
// — No background sync: data is stale after window focus
function ProductList() {
  const [products, setProducts] = useState<Product[]>([])
  const [loading,  setLoading]  = useState(false)
  const [error,    setError]    = useState<string | null>(null)

  useEffect(() => {
    setLoading(true)
    fetch('/api/products')
      .then(r => r.json())
      .then(data => { setProducts(data); setLoading(false) })
      .catch(err => { setError(err.message); setLoading(false) })
  }, [])   // refetches on every mount — no cache
}

// ✅ TanStack Query handles all of it
import { useQuery } from '@tanstack/react-query'

function ProductListFixed() {
  const { data: products, isLoading, error } = useQuery({
    queryKey: ['products'],
    queryFn: () => fetch('/api/products').then(r => r.json()),
  })
  // Cached, deduplicated, background-synced, retried on failure — automatic ✅
}
```

---

## K — Coding Challenge + Solution

### Challenge

Categorize the following state as **client** or **server** and explain the right tool for each.

```
1. isModalOpen
2. List of orders from /api/orders
3. searchQuery (typed by user)
4. Current user profile from /api/me
5. activeTab
6. Comments on a post (from API)
7. cartItems (local-only, not persisted)
8. Product inventory count (from DB)
```

### Solution

```
State Audit:

1. isModalOpen        → CLIENT   → useState (browser-only, no server involved)
2. orders from API    → SERVER   → useQuery (cache, background sync, retry)
3. searchQuery        → CLIENT   → useState (user input, no server)
4. current user /me   → SERVER   → useQuery (stale after other sessions change it)
5. activeTab          → CLIENT   → useState (UI-only)
6. comments (API)     → SERVER   → useQuery (can be updated by others)
7. cartItems (local)  → CLIENT   → useState / Zustand / localStorage
8. inventory (DB)     → SERVER   → useQuery (changes independently of user)

Rule of thumb:
  "Did this data come from a network request?" → SERVER → TanStack Query
  "Did this data come from user interaction?"  → CLIENT → useState/Zustand
```

---

---
