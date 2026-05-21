# 7 — Prefetching

---

## T — TL;DR

**Prefetching** warms the cache before the user navigates to a page or component. When they arrive, data is already cached — zero loading state. Use `queryClient.prefetchQuery` on hover, route change, or app init.

---

## K — Key Concepts

```tsx
import { useQueryClient } from '@tanstack/react-query'

// ── prefetchQuery: load into cache before component mounts ────────────────
const qc = useQueryClient()

// Basic prefetch — resolves when data is in cache
await qc.prefetchQuery({
  queryKey: ['product', 42],
  queryFn:  ({ signal }) => getProduct(42, signal),
  staleTime: 1000 * 60 * 5,  // don't re-prefetch if already fresh
})
// Now ['product', 42] is in cache.
// When <ProductPage productId={42} /> mounts — no loading state ✅
```

```tsx
// ── Prefetch on hover: anticipate navigation ──────────────────────────────
function ProductLink({ product }: { product: ProductSummary }) {
  const qc = useQueryClient()

  function handleMouseEnter() {
    qc.prefetchQuery({
      queryKey: productKeys.detail(product.id),
      queryFn:  ({ signal }) => getProductDetail(product.id, signal),
      staleTime: 1000 * 60 * 5,
    })
    // By the time the user clicks and the page renders: data is in cache ✅
  }

  return (
    <a
      href={`/products/${product.id}`}
      onMouseEnter={handleMouseEnter}   // 100–200ms head start ✅
      onFocus={handleMouseEnter}        // keyboard users ✅
    >
      {product.name}
    </a>
  )
}
```

```tsx
// ── Prefetch next page for pagination ────────────────────────────────────
function PaginatedProducts() {
  const [page, setPage] = useState(1)
  const qc = useQueryClient()

  const { data } = useQuery({
    queryKey: ['products', { page }],
    queryFn:  ({ signal }) => fetchProductsPage(page, signal),
    placeholderData: keepPreviousData,
  })

  // Prefetch the next page while current page is displayed
  useEffect(() => {
    if (data?.hasNextPage) {
      qc.prefetchQuery({
        queryKey: ['products', { page: page + 1 }],
        queryFn:  ({ signal }) => fetchProductsPage(page + 1, signal),
      })
    }
  }, [page, data?.hasNextPage, qc])

  return (
    <div>
      <ProductGrid products={data?.items ?? []} />
      <button onClick={() => setPage(p => p + 1)}
              disabled={!data?.hasNextPage}>
        Next →
      </button>
    </div>
  )
}
```

```tsx
// ── Prefetch in route loader (React Router v6 / Next.js) ──────────────────
// React Router: data loader runs before component mounts
export async function productLoader({ params }: LoaderArgs) {
  await queryClient.prefetchQuery({
    queryKey: productKeys.detail(Number(params.id)),
    queryFn:  ({ signal }) => getProduct(Number(params.id), signal),
    staleTime: 1000 * 60 * 5,
  })
  return null  // data is in cache — component useQuery call hits cache ✅
}

// Component: no loading state when accessed via loader-prefetched route
function ProductPage() {
  const { id } = useParams()
  const { data: product } = useQuery({
    queryKey: productKeys.detail(Number(id)),
    queryFn:  ({ signal }) => getProduct(Number(id!), signal),
    staleTime: 1000 * 60 * 5,
  })
  return <ProductView product={product!} />  // data guaranteed in cache ✅
}
```

---

## W — Why It Matters

- Prefetch on hover gives a 150–300ms head start — for most API responses this is enough to eliminate the loading state entirely, making navigation feel instant.
- Prefetching the next pagination page means "Next" button clicks never show a spinner — the page is already cached when the user clicks.
- `staleTime` in `prefetchQuery` prevents wasteful re-prefetching: if the data is still fresh, the prefetch is a no-op.

---

## I — Interview Q&A

### Q: What is prefetching in TanStack Query and when should you use it?

**A:** Prefetching is loading data into the cache before the component that needs it mounts — so when that component renders, it reads from cache instead of showing a loading state. Use it when: (1) You can predict the user's next action with reasonable confidence (hovering a link, reaching the end of a page). (2) Data is needed for a route and you have a route loader that runs before the component. (3) You want to preload next page data in pagination so clicks feel instant. The key option is `staleTime` in `prefetchQuery` — if fresh data is already in cache, the prefetch is skipped. Without it, you'd re-fetch on every hover even if the data is seconds old.

---

## C — Common Pitfalls + Fix

### ❌ Prefetching without `staleTime` — re-fetches on every hover

```tsx
// ❌ No staleTime in prefetch — fires a new request every time the user hovers
function ProductLinkBad({ id }: { id: number }) {
  const qc = useQueryClient()
  return (
    <a href={`/p/${id}`}
       onMouseEnter={() => qc.prefetchQuery({
         queryKey: ['product', id],
         queryFn:  ({ signal }) => getProduct(id, signal),
         // No staleTime → always refetches → network spam on every hover ❌
       })}>
      View
    </a>
  )
}

// ✅ staleTime prevents redundant prefetches
function ProductLinkGood({ id }: { id: number }) {
  const qc = useQueryClient()
  function handleHover() {
    qc.prefetchQuery({
      queryKey: productKeys.detail(id),
      queryFn:  ({ signal }) => getProduct(id, signal),
      staleTime: 1000 * 60 * 5,   // ✅ skip if data fetched in last 5 min
    })
  }
  return (
    <a href={`/p/${id}`} onMouseEnter={handleHover} onFocus={handleHover}>
      View
    </a>
  )
}
```

---

## K — Coding Challenge + Solution

### Challenge

Build a `useNextPagePrefetch` hook that automatically prefetches the next page whenever the current page data arrives.

### Solution

```tsx
interface PageResult<T> { items: T[]; totalPages: number; currentPage: number }

function useNextPagePrefetch<T>(
  queryKeyBase: readonly unknown[],
  queryFn: (page: number, signal: AbortSignal) => Promise<PageResult<T>>,
  currentPage: number,
  currentData: PageResult<T> | undefined
) {
  const qc = useQueryClient()

  useEffect(() => {
    if (!currentData) return
    const hasNextPage = currentPage < currentData.totalPages
    if (!hasNextPage) return

    const nextPage = currentPage + 1
    qc.prefetchQuery({
      queryKey:  [...queryKeyBase, { page: nextPage }],
      queryFn:   ({ signal }) => queryFn(nextPage, signal),
      staleTime: 1000 * 60,   // skip if next page already fresh ✅
    })
  }, [currentPage, currentData, qc, queryKeyBase, queryFn])
}

// Usage
function PostsPage() {
  const [page, setPage] = useState(1)

  const { data, isLoading } = useQuery({
    queryKey: ['posts', { page }],
    queryFn:  ({ signal }) => fetchPostsPage(page, signal),
    placeholderData: keepPreviousData,
  })

  // Prefetch next page automatically whenever current page data arrives ✅
  useNextPagePrefetch(['posts'], fetchPostsPage, page, data)

  return (
    <div>
      {isLoading ? <Spinner /> : <PostGrid posts={data?.items ?? []} />}
      <button
        onClick={() => setPage(p => p + 1)}
        disabled={!data || page >= data.totalPages}
      >
        Next → {/* instant — already prefetched ✅ */}
      </button>
    </div>
  )
}
```

---

---
