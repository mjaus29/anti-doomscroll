# 6 — placeholderData vs initialData

---

## T — TL;DR

Both provide data while a query is loading. **`initialData`** seeds the cache as if a fetch succeeded — it counts as real data and affects staleTime. **`placeholderData`** is a temporary display value that never enters the cache and never marks the query as fresh.

---

## K — Key Concepts

```
── Key differences ────────────────────────────────────────────────────────────

                      placeholderData       initialData
─────────────────     ─────────────────     ──────────────────────
Goes into cache?      NO                    YES
isPlaceholderData?    true while showing    —
Marks query fresh?    NO                    YES (if initialDataUpdatedAt set)
staleTime affected?   NO                    YES
Use case              Skeleton / fake UX    Data from parent query / SSR
```

```tsx
import { keepPreviousData } from '@tanstack/react-query'

// ── placeholderData: show something while loading ─────────────────────────
// Use case 1: keepPreviousData — no flash between paginated pages
function PaginatedList() {
  const [page, setPage] = useState(1)
  const { data, isPlaceholderData } = useQuery({
    queryKey: ['list', page],
    queryFn:  ({ signal }) => fetchPage(page, signal),
    placeholderData: keepPreviousData,   // show old page while new loads ✅
  })
  return (
    <div style={{ opacity: isPlaceholderData ? 0.6 : 1 }}>
      <ItemGrid items={data?.items ?? []} />
      <button disabled={isPlaceholderData || !data?.hasNext}
              onClick={() => setPage(p => p + 1)}>
        Next
      </button>
    </div>
  )
}

// Use case 2: static placeholder — show a skeleton shape with fake data
function UserCard({ userId }: { userId: number }) {
  const { data: user, isPlaceholderData } = useQuery({
    queryKey: ['user', userId],
    queryFn:  ({ signal }) => getUser(userId, signal),
    placeholderData: { id: userId, name: 'Loading…', email: '' } as User,
  })
  return (
    <div style={{ opacity: isPlaceholderData ? 0.5 : 1 }}>
      <h3>{user!.name}</h3>
      <p>{user!.email}</p>
    </div>
  )
}
```

```tsx
// ── initialData: seed cache from known data ───────────────────────────────
// Use case 1: list → detail — parent list already has the item
function ProductDetail({ productId }: { productId: number }) {
  const qc = useQueryClient()

  const { data: product } = useQuery({
    queryKey: ['product', productId],
    queryFn:  ({ signal }) => getProduct(productId, signal),
    initialData: () => {
      // Try to find this product in the already-fetched list
      const list = qc.getQueryData<Product[]>(['products', 'list'])
      return list?.find(p => p.id === productId)
      // If found: shows data instantly, no loading state ✅
      // If not found: returns undefined → normal loading state
    },
    initialDataUpdatedAt: () => {
      // Tell TanStack Query when the list was last fetched
      // so it knows if this initialData is stale
      return qc.getQueryState(['products', 'list'])?.dataUpdatedAt
    },
  })

  return <div>{product?.name ?? 'Loading…'}</div>
}

// Use case 2: SSR — seed with server-fetched data
function SSRProductPage({ serverProduct }: { serverProduct: Product }) {
  const { data: product } = useQuery({
    queryKey: ['product', serverProduct.id],
    queryFn:  ({ signal }) => getProduct(serverProduct.id, signal),
    initialData: serverProduct,         // from server render
    initialDataUpdatedAt: Date.now(),   // treat as fresh now
  })
  return <ProductView product={product!} />
}
```

---

## W — Why It Matters

- `keepPreviousData` is the UX fix for any paginated or filtered list — without it, every page change shows a loading state even though you already have related data. With it, the old page stays visible (dimmed) while the new page loads.
- `initialData` from a parent query is a performance optimization: navigating from a product list to a product detail can show the name/price immediately (from list cache) while the detail fetch completes in the background.
- Setting `initialDataUpdatedAt` is critical — without it, `initialData` is treated as perfectly fresh (`staleTime` measured from `Infinity`) and TanStack Query may never refetch the real data.

---

## I — Interview Q&A

### Q: What is the difference between `placeholderData` and `initialData`?

**A:** Both show data before the fetch completes, but they're used for different purposes and have different cache semantics. `placeholderData` is a temporary display value — it's never stored in the cache, doesn't affect staleTime, and triggers `isPlaceholderData: true` so you can dim or style the placeholder differently. It's for UX: showing something meaningful while loading. `initialData` goes into the cache as if a fetch succeeded — it affects staleTime and `dataUpdatedAt`. Use it when you already have the data from another query (parent list, SSR) and want to avoid a loading state. Always set `initialDataUpdatedAt` to tell TanStack Query how old the initial data is, so it can decide whether to immediately refetch or wait for the staleTime to expire.

---

## C — Common Pitfalls + Fix

### ❌ Using `initialData` without `initialDataUpdatedAt` — prevents background refresh

```tsx
// ❌ initialData without updatedAt — treated as fresh forever
function UserDetailBad({ userId }: { userId: number }) {
  const qc = useQueryClient()
  const { data: user } = useQuery({
    queryKey: ['user', userId],
    queryFn:  ({ signal }) => getUser(userId, signal),
    initialData: qc.getQueryData<User[]>(['users'])?.find(u => u.id === userId),
    // Without initialDataUpdatedAt: treated as if fetched at Infinity
    // → staleTime never expires from this timestamp → no background refetch ❌
  })
}

// ✅ Set initialDataUpdatedAt to inherit staleness from the source query
function UserDetailGood({ userId }: { userId: number }) {
  const qc = useQueryClient()
  const { data: user } = useQuery({
    queryKey: ['user', userId],
    queryFn:  ({ signal }) => getUser(userId, signal),
    initialData: () =>
      qc.getQueryData<User[]>(['users'])?.find(u => u.id === userId),
    initialDataUpdatedAt: () =>
      qc.getQueryState(['users'])?.dataUpdatedAt,   // ✅ inherits list's timestamp
    // If list is stale → initialData is stale → background refetch fires ✅
  })
}
```

---

## K — Coding Challenge + Solution

### Challenge

Build a `ProductDetailPage` that uses `initialData` from the product list cache. Show "quick" vs "full" data states with appropriate UI feedback.

### Solution

```tsx
interface ProductSummary { id: number; name: string; price: number }
interface ProductDetail  extends ProductSummary { description: string; stock: number; images: string[] }

function useProductDetail(productId: number) {
  const qc = useQueryClient()

  return useQuery({
    queryKey: ['product', productId, 'detail'],
    queryFn:  ({ signal }) => fetchProductDetail(productId, signal),
    staleTime: 1000 * 60 * 5,
    // Seed from list cache for instant display
    initialData: (): ProductDetail | undefined => {
      const list = qc.getQueryData<ProductSummary[]>(['products', 'list'])
      const found = list?.find(p => p.id === productId)
      // Can only use if it has all required ProductDetail fields
      // In practice: cast with a "partial detail" flag or use placeholderData instead
      return found ? { ...found, description: '', stock: 0, images: [] } : undefined
    },
    initialDataUpdatedAt: () =>
      qc.getQueryState(['products', 'list'])?.dataUpdatedAt,
  })
}

function ProductDetailPage({ productId }: { productId: number }) {
  const { data: product, isLoading, isFetching } = useProductDetail(productId)

  if (isLoading) return <ProductDetailSkeleton />

  const isQuickData = !product?.description   // initialData has empty description

  return (
    <article>
      {isFetching && <RefreshIndicator />}
      <h1>{product!.name}</h1>
      <p className="price">${product!.price}</p>
      {isQuickData ? (
        <p className="loading-detail">Loading full details…</p>
      ) : (
        <>
          <p>{product!.description}</p>
          <p>In stock: {product!.stock}</p>
          <ImageGallery images={product!.images} />
        </>
      )}
    </article>
  )
}
```

---

---
