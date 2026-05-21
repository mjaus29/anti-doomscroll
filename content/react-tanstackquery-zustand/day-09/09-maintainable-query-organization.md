# 9 — Maintainable Query Organization

---

## T — TL;DR

A maintainable query architecture has three layers: **API functions** (fetch + throw on error), **query key factories** (hierarchical, co-located), and **custom query hooks** (combine key + fn + options). Components import hooks, never raw `useQuery` with inline keys.

---

## K — Key Concepts

```
── Three-layer architecture ──────────────────────────────────────────────────

src/
  api/                       ← Layer 1: Pure async functions (no React)
    users.ts                 → getUser, getUsers, patchUser
    products.ts              → getProduct, getProducts
    orders.ts                → getOrders, createOrder

  query-keys/                ← Layer 2: Key factories (no React, no fetch)
    users.ts                 → userKeys.all(), .detail(id), .list(filters)
    products.ts              → productKeys
    orders.ts                → orderKeys

  hooks/queries/             ← Layer 3: Custom query hooks (React + TQ)
    useUser.ts               → useUser(id), useUsers(filters)
    useProducts.ts           → useProducts(filters), useProductDetail(id)
    useOrders.ts             → useOrders(userId), useOrderDetail(id)

  components/                ← Consumers: import hooks only
    UserCard.tsx             → import { useUser }
    ProductList.tsx          → import { useProducts }
```

```tsx
// ── Layer 1: api/users.ts ─────────────────────────────────────────────────
export interface User { id: number; name: string; email: string; role: string }

export async function getUser(id: number, signal: AbortSignal): Promise<User> {
  const res = await fetch(`/api/users/${id}`, { signal })
  if (!res.ok) throw new Error(`getUser(${id}): ${res.status}`)
  return res.json()
}

export async function getUsers(
  filters: { role?: string; active?: boolean } = {},
  signal: AbortSignal
): Promise<User[]> {
  const params = new URLSearchParams(
    Object.fromEntries(Object.entries(filters).filter(([, v]) => v !== undefined))
  )
  const res = await fetch(`/api/users?${params}`, { signal })
  if (!res.ok) throw new Error(`getUsers: ${res.status}`)
  return res.json()
}
```

```tsx
// ── Layer 2: query-keys/users.ts ──────────────────────────────────────────
interface UserListFilters { role?: string; active?: boolean }

export const userKeys = {
  all:     ()                          => ['users']                        as const,
  lists:   ()                          => [...userKeys.all(), 'list']      as const,
  list:    (filters: UserListFilters)  => [...userKeys.lists(), filters]   as const,
  details: ()                          => [...userKeys.all(), 'detail']    as const,
  detail:  (id: number)               => [...userKeys.details(), id]       as const,
}
```

```tsx
// ── Layer 3: hooks/queries/useUser.ts ─────────────────────────────────────
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { userKeys }  from '../../query-keys/users'
import { getUser, getUsers, User, UserListFilters } from '../../api/users'

export function useUser(userId: number | null) {
  return useQuery({
    queryKey:  userKeys.detail(userId ?? 0),
    queryFn:   ({ signal }) => getUser(userId!, signal),
    enabled:   userId !== null && userId > 0,
    staleTime: 1000 * 60 * 5,
  })
}

export function useUsers(filters: UserListFilters = {}) {
  return useQuery({
    queryKey:  userKeys.list(filters),
    queryFn:   ({ signal }) => getUsers(filters, signal),
    staleTime: 1000 * 60 * 2,
  })
}

export function useActiveUsers() {
  return useQuery({
    queryKey:  userKeys.list({ active: true }),
    queryFn:   ({ signal }) => getUsers({ active: true }, signal),
    staleTime: 1000 * 60 * 2,
    select:    users => users.filter(u => u.active),
  })
}

// Invalidation helpers: co-located with the keys
export function useUserInvalidation() {
  const qc = useQueryClient()
  return {
    invalidateUser:  (id: number) => qc.invalidateQueries({ queryKey: userKeys.detail(id) }),
    invalidateAll:   ()           => qc.invalidateQueries({ queryKey: userKeys.all() }),
  }
}
```

```tsx
// ── File organization for scale ────────────────────────────────────────────
// Option A: one file per resource (small–medium apps)
// hooks/queries/useUser.ts    — all user-related hooks
// hooks/queries/useProduct.ts — all product-related hooks

// Option B: feature-based (large apps)
// features/users/hooks/useUser.ts
// features/products/hooks/useProduct.ts
// features/orders/hooks/useOrder.ts

// Option C: co-located with components (very small apps)
// components/UserCard/useUserCard.ts  — query hook lives next to its component

// Rule of thumb:
// Start with Option A. Move to B when features have distinct teams/domains.
```

---

## W — Why It Matters

- The three-layer architecture decouples concerns: the API layer doesn't know about React, the key factory doesn't know about queries, and the hook layer assembles them. Each is independently testable and replaceable.
- When an endpoint changes (URL, response shape), only Layer 1 changes — the key factory and hook are untouched. Components using the hook don't change at all.
- Co-locating invalidation helpers in the query hook file means mutations can import `useUserInvalidation` and invalidate precisely without knowing key structure.

---

## I — Interview Q&A

### Q: How would you organize TanStack Query code in a medium-to-large React application?

**A:** Three layers: (1) **API layer** (`src/api/`) — pure async functions that fetch data and throw on non-2xx. No React, no TanStack Query imports. Testable with just a mock fetch. (2) **Query key factories** (`src/query-keys/`) — plain objects of functions that return typed key arrays. No React, no imports except TypeScript interfaces. Ensure every usage of a key goes through the factory. (3) **Custom query hooks** (`src/hooks/queries/`) — combine the API function and key factory into a `useQuery` call with configured options. Export one hook per logical query, plus invalidation helpers. Components import only from Layer 3 and never use raw `useQuery` with inline keys. This means query key changes, endpoint migrations, and config tuning all happen in one place.

---

## C — Common Pitfalls + Fix

### ❌ Mixing all three layers into one component file

```tsx
// ❌ Component owns everything: key, fetch, transform, options
function ProductPageMessy({ id }: { id: number }) {
  // Key defined inline — can't reuse for invalidation ❌
  // Fetch defined inline — can't test without React ❌
  // Options scattered — no central config ❌
  const { data } = useQuery({
    queryKey: ['product', id, 'detail'],
    queryFn: async ({ signal }) => {
      const res = await fetch(`/api/products/${id}`, { signal })
      if (!res.ok) throw new Error(res.statusText)
      const raw = await res.json()
      return { id: raw.product_id, name: raw.product_name, price: raw.price_usd }
    },
    staleTime: 300_000,
    retry: 2,
  })
  return <div>{data?.name}</div>
}

// ✅ Three layers — component is a thin consumer
// api/products.ts
async function getProductDetail(id: number, signal: AbortSignal): Promise<ProductDetail> {
  const res = await fetch(`/api/products/${id}`, { signal })
  if (!res.ok) throw new Error(`getProductDetail(${id}): ${res.status}`)
  const raw = await res.json()
  return { id: raw.product_id, name: raw.product_name, price: raw.price_usd }
}

// hooks/queries/useProduct.ts
function useProductDetail(id: number) {
  return useQuery({
    queryKey:  productKeys.detail(id),
    queryFn:   ({ signal }) => getProductDetail(id, signal),
    staleTime: 1000 * 60 * 5,
    retry:     2,
  })
}

// components/ProductPage.tsx
function ProductPageClean({ id }: { id: number }) {
  const { data: product, isLoading } = useProductDetail(id)   // ✅ thin consumer
  if (isLoading) return <ProductSkeleton />
  return <div>{product?.name}</div>
}
```

---

## K — Coding Challenge + Solution

### Challenge

Design the complete three-layer architecture for an `Order` resource: API layer, key factory, and three hooks: `useOrders`, `useOrderDetail`, and `useOrderInvalidation`.

### Solution

```tsx
// ── Layer 1: api/orders.ts ────────────────────────────────────────────────
export type OrderStatus = 'pending' | 'processing' | 'shipped' | 'delivered' | 'cancelled'
export interface OrderSummary { id: number; total: number; status: OrderStatus; createdAt: string }
export interface OrderDetail extends OrderSummary {
  items:       { productId: number; name: string; qty: number; price: number }[]
  shippingAddr: string
  trackingCode: string | null
}
export interface OrderFilters { status?: OrderStatus; page?: number; limit?: number }

export async function fetchOrders(
  userId: number, filters: OrderFilters, signal: AbortSignal
): Promise<{ orders: OrderSummary[]; totalPages: number }> {
  const params = new URLSearchParams({ userId: String(userId), ...filters as Record<string,string> })
  const res = await fetch(`/api/orders?${params}`, { signal })
  if (!res.ok) throw new Error(`fetchOrders: ${res.status}`)
  return res.json()
}

export async function fetchOrderDetail(
  orderId: number, signal: AbortSignal
): Promise<OrderDetail> {
  const res = await fetch(`/api/orders/${orderId}`, { signal })
  if (!res.ok) throw new Error(`fetchOrderDetail(${orderId}): ${res.status}`)
  return res.json()
}

// ── Layer 2: query-keys/orders.ts ─────────────────────────────────────────
export const orderKeys = {
  all:     ()                                       => ['orders']                          as const,
  lists:   ()                                       => [...orderKeys.all(), 'list']        as const,
  list:    (userId: number, filters: OrderFilters)  => [...orderKeys.lists(), userId, filters] as const,
  details: ()                                       => [...orderKeys.all(), 'detail']     as const,
  detail:  (id: number)                             => [...orderKeys.details(), id]       as const,
}

// ── Layer 3: hooks/queries/useOrders.ts ───────────────────────────────────
function useOrders(userId: number, filters: OrderFilters = {}) {
  return useQuery({
    queryKey:  orderKeys.list(userId, filters),
    queryFn:   ({ signal }) => fetchOrders(userId, filters, signal),
    enabled:   userId > 0,
    staleTime: 1000 * 60,           // 1 min — order status can change
    placeholderData: keepPreviousData,  // smooth pagination
  })
}

function useOrderDetail(orderId: number | null) {
  const qc = useQueryClient()
  return useQuery({
    queryKey:  orderKeys.detail(orderId ?? 0),
    queryFn:   ({ signal }) => fetchOrderDetail(orderId!, signal),
    enabled:   orderId !== null,
    staleTime: 1000 * 30,          // 30s — tracking updates frequently
    // Seed from list cache for instant display
    initialData: (): OrderDetail | undefined => {
      const allLists = qc.getQueriesData<{ orders: OrderSummary[] }>({
        queryKey: orderKeys.lists()
      })
      for (const [, data] of allLists) {
        const found = data?.orders.find(o => o.id === orderId)
        if (found) return { ...found, items: [], shippingAddr: '', trackingCode: null }
      }
    },
    initialDataUpdatedAt: () => {
      const states = qc.getQueriesData({ queryKey: orderKeys.lists() })
      return states[0]?.[1] ? qc.getQueryState(states[0][0])?.dataUpdatedAt : undefined
    },
  })
}

function useOrderInvalidation() {
  const qc = useQueryClient()
  return {
    invalidateOrder:  (id: number) => qc.invalidateQueries({ queryKey: orderKeys.detail(id) }),
    invalidateOrders: (userId: number) =>
      qc.invalidateQueries({ queryKey: orderKeys.list(userId, {}) }),
    invalidateAll:    () => qc.invalidateQueries({ queryKey: orderKeys.all() }),
  }
}

// ── Component: thin consumer ──────────────────────────────────────────────
function OrderList({ userId }: { userId: number }) {
  const [filters, setFilters] = useState<OrderFilters>({ page: 1 })
  const { data, isLoading, isFetching } = useOrders(userId, filters)

  return (
    <div style={{ opacity: isFetching && !isLoading ? 0.7 : 1 }}>
      {isLoading ? <OrdersSkeleton /> : (
        <ul>{data?.orders.map(o => <OrderRow key={o.id} order={o} />)}</ul>
      )}
    </div>
  )
}
```

---

## ✅ Day 9 Complete — Query Workflows and Data Shaping

| # | Subtopic | Status |
|---|----------|--------|
| 1 | Dependent Queries | ☐ |
| 2 | Parallel Queries + useQueries | ☐ |
| 3 | Conditional Queries with enabled | ☐ |
| 4 | Reusable Query Hooks | ☐ |
| 5 | select — Data Transformation | ☐ |
| 6 | placeholderData vs initialData | ☐ |
| 7 | Prefetching | ☐ |
| 8 | Background Refetching + Deduplication | ☐ |
| 9 | Maintainable Query Organization | ☐ |

---

## 🗺️ One-Page Mental Model — Day 9

```
DEPENDENT QUERIES
  enabled: !!prerequisite.data?.id → gate the second query
  Replaces useEffect sequential chains with declarative dependency graph
  Each query in chain is independently cached → re-runs only its stale step
  Aggregate loading: check all isLoading flags | Aggregate error: check all isError

PARALLEL QUERIES + useQueries
  Multiple useQuery calls: static parallel (known count at compile time)
  useQueries: dynamic parallel (array of IDs, unknown count)
  combine: reduce array of results into one named object → clean consumer API
  ❌ useQuery in a loop: violates hooks rules → use useQueries

CONDITIONAL QUERIES WITH enabled
  enabled: false → status='pending', no network request
  enabled: !!value → don't fetch until value exists
  isLoading: pending + fetching | isPending: pending (includes disabled)
  Check the enabled condition yourself for the "nothing selected" empty state
  Patterns: auth-gate, search min-length, on-demand load, dependent guard

REUSABLE QUERY HOOKS
  Extract: useUser(id), useProducts(filters) — one hook per logical query
  Components declare intent, not implementation
  Co-locate: key + queryFn + options + select in one hook file
  Co-locate invalidation helpers: useUserInvalidation() in same file
  One file update → all consumers updated automatically

select — DATA TRANSFORMATION
  select runs after fetch → transforms data before returning to component
  Component only re-renders if selected value changes (structural sharing on result)
  Multiple subscribers to same key, each with different select → one request
  Stable select function: useCallback if it closes over changing variables
  Use for: API→app shape normalization, filtering, derived values, single-item from list

placeholderData vs initialData
  placeholderData: NOT cached, isPlaceholderData=true, only for UX display
  initialData: goes INTO cache, affects staleTime, treated as real data
  keepPreviousData: no flash between page/filter changes (pagination pattern)
  initialDataUpdatedAt: REQUIRED with initialData → tells TQ how old the seed is
  Use initialData for: parent list → detail seeding, SSR data hydration

PREFETCHING
  prefetchQuery: warm cache before component mounts
  Hover/focus on link → prefetch detail → instant navigation ✅
  Prefetch next page in useEffect after current page data arrives
  staleTime in prefetchQuery: skip if already fresh → no redundant requests
  Route loaders (React Router/Next.js): prefetch before render → guaranteed no loading state

BACKGROUND REFETCHING + DEDUPLICATION
  isFetching=true, isLoading=false → background refetch (show subtle ↻ indicator)
  isLoading=true → initial load (show skeleton)
  Dedup: N components, same queryKey → 1 request, all share the response
  Same queryKey + different queryFns → first queryFn wins (data inconsistency bug)
  → Always use different keys for different data shapes
  refetch() → manual background refetch → isFetching=true, no skeleton

MAINTAINABLE QUERY ORGANIZATION
  Layer 1: api/ — pure async functions, throw on !res.ok, accept signal
  Layer 2: query-keys/ — key factories, no React, hierarchical arrays
  Layer 3: hooks/queries/ — custom hooks combining key + fn + options
  Components: import hooks only, never inline useQuery with raw keys
  Co-locate invalidation with query hooks (not in mutation files)
  Start: one file per resource. Scale to: one folder per feature domain.
```

> **Your next action:** Find a component with two `useQuery` calls where the second depends on the first. Check: does the second have `enabled: !!firstQuery.data?.id`? If not, add it. Then extract both into a single `useXWithY` custom hook. Ten minutes of real refactoring locks in this entire day's content.

> "Doing one small thing beats opening a feed."
