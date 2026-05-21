# 2 — Parallel Queries + useQueries

---

## T — TL;DR

**Parallel queries** fire simultaneously — each `useQuery` in a component fires at the same time. `useQueries` handles a **dynamic number** of parallel queries (e.g., fetch N resources by ID) in a single call, returning an array of results.

---

## K — Key Concepts

```tsx
// ── Static parallel queries: just call useQuery multiple times ─────────────
// TanStack Query runs them concurrently — no sequential waiting
function Dashboard() {
  const usersQuery   = useQuery({ queryKey: ['users'],   queryFn: ({ signal }) => getUsers(signal) })
  const productsQuery = useQuery({ queryKey: ['products'], queryFn: ({ signal }) => getProducts(signal) })
  const statsQuery   = useQuery({ queryKey: ['stats'],   queryFn: ({ signal }) => getStats(signal) })
  // All three fire simultaneously on mount ✅ — no sequential waterfall

  const isLoading = usersQuery.isLoading || productsQuery.isLoading || statsQuery.isLoading
  const hasError  = usersQuery.isError   || productsQuery.isError   || statsQuery.isError

  if (isLoading) return <DashboardSkeleton />
  if (hasError)  return <ErrorPage />

  return (
    <div>
      <StatsPanel    data={statsQuery.data!} />
      <UsersSection  users={usersQuery.data ?? []} />
      <ProductsTable products={productsQuery.data ?? []} />
    </div>
  )
}
```

```tsx
import { useQueries } from '@tanstack/react-query'

// ── useQueries: dynamic parallel queries ─────────────────────────────────
// When you don't know the count of queries at compile time
function ProductComparison({ productIds }: { productIds: number[] }) {
  const results = useQueries({
    queries: productIds.map(id => ({
      queryKey: ['product', id],
      queryFn:  ({ signal }: { signal: AbortSignal }) => getProduct(id, signal),
      staleTime: 1000 * 60 * 5,
    })),
  })
  // results is an array matching productIds.length
  // results[0] = { data, isLoading, isError, ... } for productIds[0]

  const isLoading = results.some(r => r.isLoading)
  const products  = results.map(r => r.data).filter(Boolean) as Product[]

  if (isLoading) return <ComparisonSkeleton count={productIds.length} />

  return (
    <div className="comparison-grid">
      {products.map(p => <ProductCard key={p.id} product={p} />)}
    </div>
  )
}
```

```tsx
// ── useQueries with combine: aggregate results ────────────────────────────
// combine: transform the array of results into one value
function useMultipleUsers(userIds: number[]) {
  return useQueries({
    queries: userIds.map(id => ({
      queryKey: ['user', id],
      queryFn:  ({ signal }: { signal: AbortSignal }) => getUser(id, signal),
    })),
    combine: (results) => ({
      users:     results.map(r => r.data).filter(Boolean) as User[],
      isLoading: results.some(r => r.isLoading),
      isError:   results.some(r => r.isError),
      errors:    results.filter(r => r.isError).map(r => r.error as Error),
    }),
  })
}

// Usage: clean API — one hook, combined state
function TeamMembers({ memberIds }: { memberIds: number[] }) {
  const { users, isLoading, isError } = useMultipleUsers(memberIds)

  if (isLoading) return <MembersSkeleton />
  if (isError)   return <p>Failed to load some members</p>

  return <ul>{users.map(u => <li key={u.id}>{u.name}</li>)}</ul>
}
```

---

## W — Why It Matters

- Static parallel queries (multiple `useQuery` calls) are the default for known-count data sources — the React rules of hooks require a fixed number of `useQuery` calls, so you can't put them in a loop.
- `useQueries` fills the dynamic gap — fetching N users by ID, comparing N products, loading N files. Without it, you'd need a single query that fetches all IDs in one request (worse caching granularity).
- `combine` turns `useQueries` from an array of results into a clean single object that consuming components can destructure — it's the composability layer for dynamic parallel queries.

---

## I — Interview Q&A

### Q: When would you use `useQueries` instead of multiple `useQuery` calls?

**A:** Use `useQueries` when the number of queries is dynamic — determined by an array of IDs or keys that changes at runtime. React's rules of hooks forbid calling hooks in loops or conditionally, so `const results = ids.map(id => useQuery(...))` is illegal. `useQueries` is specifically designed for this: it accepts an array of query option objects and returns an array of results, each with the same shape as a single `useQuery` result. The `combine` option further lets you reduce the array into a single aggregated object, keeping the consuming component's API clean. For a fixed, known number of parallel queries (dashboard with 3 panels), separate `useQuery` calls are simpler and preferable.

---

## C — Common Pitfalls + Fix

### ❌ Using `useQuery` in a loop — violates rules of hooks

```tsx
// ❌ Hooks in a loop — illegal, causes "rendered more hooks than previous render"
function BadComparison({ ids }: { ids: number[] }) {
  const results = ids.map(id => useQuery({  // ❌ hook in .map
    queryKey: ['item', id],
    queryFn:  () => getItem(id),
  }))
  return <div>{results.map(r => r.data?.name)}</div>
}

// ✅ useQueries for dynamic parallel queries
function GoodComparison({ ids }: { ids: number[] }) {
  const results = useQueries({
    queries: ids.map(id => ({
      queryKey: ['item', id] as const,
      queryFn:  ({ signal }: { signal: AbortSignal }) => getItem(id, signal),
    })),
  })
  return (
    <div>
      {results.map((r, i) => (
        <div key={ids[i]}>
          {r.isLoading ? <Spinner /> : r.data?.name}
        </div>
      ))}
    </div>
  )
}
```

---

## K — Coding Challenge + Solution

### Challenge

Build `useCartProducts`: given a cart (`{ productId, qty }[]`), use `useQueries` + `combine` to return `{ lineItems, subtotal, isLoading }`.

### Solution

```tsx
interface CartItem    { productId: number; qty: number }
interface Product     { id: number; name: string; price: number }
interface LineItem    { product: Product; qty: number; lineTotal: number }
interface CartSummary { lineItems: LineItem[]; subtotal: number; isLoading: boolean }

function useCartProducts(cart: CartItem[]): CartSummary {
  return useQueries({
    queries: cart.map(item => ({
      queryKey: ['product', item.productId] as const,
      queryFn:  ({ signal }: { signal: AbortSignal }) =>
                  fetchProduct(item.productId, signal),
      staleTime: 1000 * 60 * 5,
    })),
    combine: (results) => {
      const isLoading = results.some(r => r.isLoading)
      const lineItems: LineItem[] = results
        .map((r, i) => r.data
          ? { product: r.data, qty: cart[i].qty, lineTotal: r.data.price * cart[i].qty }
          : null
        )
        .filter(Boolean) as LineItem[]

      const subtotal = lineItems.reduce((sum, li) => sum + li.lineTotal, 0)
      return { lineItems, subtotal, isLoading }
    },
  })
}

function CartSummaryPanel({ cart }: { cart: CartItem[] }) {
  const { lineItems, subtotal, isLoading } = useCartProducts(cart)
  if (isLoading) return <CartSkeleton />
  return (
    <div>
      {lineItems.map(li => (
        <div key={li.product.id}>
          {li.product.name} × {li.qty} = ${li.lineTotal.toFixed(2)}
        </div>
      ))}
      <p>Subtotal: <strong>${subtotal.toFixed(2)}</strong></p>
    </div>
  )
}
```

---

---
