# 6 — Loading, Error, Success States

---

## T — TL;DR

TanStack Query provides a complete async state machine: `pending → loading → success | error`. Render each state explicitly — skeleton for loading, error message with retry for failure, data for success. Never show a blank screen when you can show something useful.

---

## K — Key Concepts

```tsx
// ── The three states and what to render ──────────────────────────────────
function PostDetail({ postId }: { postId: number }) {
  const { data: post, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['post', postId],
    queryFn:  ({ signal }) => getPost(postId, signal),
  })

  // 1. Loading state: skeleton / spinner
  if (isLoading) {
    return (
      <article className="post-skeleton">
        <div className="skeleton skeleton-title" />
        <div className="skeleton skeleton-line" />
        <div className="skeleton skeleton-line" />
      </article>
    )
  }

  // 2. Error state: message + retry button
  if (isError) {
    return (
      <div role="alert" className="error-card">
        <p>Failed to load post: {(error as Error).message}</p>
        <button onClick={() => refetch()}>Try again</button>
      </div>
    )
  }

  // 3. Success state: the data (TypeScript knows post is Post here)
  return (
    <article>
      <h1>{post.title}</h1>
      <p>{post.body}</p>
    </article>
  )
}
```

```tsx
// ── isFetching for background refresh indicator ───────────────────────────
function UserList() {
  const { data: users = [], isLoading, isFetching, error } = useQuery({
    queryKey: ['users'],
    queryFn:  ({ signal }) => getUsers(signal),
    staleTime: 1000 * 30,
  })

  if (isLoading) return <ListSkeleton count={5} />
  if (error)     return <ErrorMessage error={error as Error} />

  return (
    <div>
      {/* Subtle indicator when background-refreshing ✅ */}
      {isFetching && <span className="refresh-dot" aria-label="Refreshing…" />}
      <ul>
        {users.map(u => <li key={u.id}>{u.name}</li>)}
      </ul>
    </div>
  )
}
```

```tsx
// ── placeholderData: keep previous results during pagination/filter ────────
import { keepPreviousData } from '@tanstack/react-query'

function PaginatedList() {
  const [page, setPage] = useState(1)

  const { data, isLoading, isFetching, isPlaceholderData } = useQuery({
    queryKey: ['posts', page],
    queryFn:  ({ signal }) => getPostsPage(page, signal),
    placeholderData: keepPreviousData,   // show old page while new loads ✅
  })

  return (
    <div style={{ opacity: isPlaceholderData ? 0.6 : 1 }}>
      {isLoading && <Spinner />}
      <PostGrid posts={data?.posts ?? []} />
      <button
        onClick={() => setPage(p => p - 1)}
        disabled={page === 1}
      >Prev</button>
      <button
        onClick={() => setPage(p => p + 1)}
        disabled={isPlaceholderData || !data?.hasMore}
      >Next</button>
    </div>
  )
}
```

```tsx
// ── Multiple queries: coordinate loading states ───────────────────────────
function Dashboard() {
  const usersQuery  = useQuery({ queryKey: ['users'],  queryFn: ({ signal }) => getUsers(signal) })
  const postsQuery  = useQuery({ queryKey: ['posts'],  queryFn: ({ signal }) => getPosts(signal) })
  const statsQuery  = useQuery({ queryKey: ['stats'],  queryFn: ({ signal }) => getStats(signal) })

  // All loading: show full skeleton
  const allLoading = usersQuery.isLoading && postsQuery.isLoading && statsQuery.isLoading
  if (allLoading) return <DashboardSkeleton />

  return (
    <div>
      {/* Each section handles its own state independently ✅ */}
      <UsersPanel
        users={usersQuery.data ?? []}
        isLoading={usersQuery.isLoading}
        error={usersQuery.error as Error | null}
      />
      <PostsPanel
        posts={postsQuery.data ?? []}
        isFetching={postsQuery.isFetching}
      />
      <StatsPanel stats={statsQuery.data} />
    </div>
  )
}
```

---

## W — Why It Matters

- Showing a skeleton instead of a spinner improves perceived performance — the user sees the shape of the content before the content arrives.
- The `isFetching` background refresh indicator (a subtle dot or spinner) communicates that data may be refreshing without disrupting the current view — better UX than a blank screen on every refetch.
- `placeholderData: keepPreviousData` eliminates the "flash of empty content" when changing pages or filters — the list shows stale results (dimmed) while the new page loads.

---

## I — Interview Q&A

### Q: When would you use `isLoading` vs `isPending` vs `isFetching`?

**A:** In TanStack Query v5: `isPending` is `true` when `status === 'pending'` — the query has no data yet, either because it's fetching for the first time or because it's `disabled` and hasn't run. `isLoading` is a convenience shortcut for `isPending && isFetching` — it's `true` specifically when pending AND actively fetching. Use `isLoading` for the initial skeleton/spinner (no data, request in flight). `isFetching` is `true` any time a request is in flight — initial or background. Use it for subtle refresh indicators shown alongside existing data. A background refetch has `isFetching: true`, `isLoading: false`, and `isSuccess: true` simultaneously — showing data while silently refreshing it.

---

## C — Common Pitfalls + Fix

### ❌ Not handling the error state — silent failure

```tsx
// ❌ No error handling — silent empty state when API fails
function PostList() {
  const { data: posts = [] } = useQuery({
    queryKey: ['posts'],
    queryFn: getPosts,
  })
  // If getPosts throws: data = undefined → default [] → empty list → ❌
  // User sees an empty list with no indication something went wrong
  return <ul>{posts.map(p => <li key={p.id}>{p.title}</li>)}</ul>
}

// ✅ Always handle error explicitly
function PostListFixed() {
  const { data: posts = [], isLoading, isError, error, refetch } = useQuery({
    queryKey: ['posts'],
    queryFn:  ({ signal }) => getPosts(signal),
  })

  if (isLoading) return <PostListSkeleton />
  if (isError) return (
    <div role="alert">
      <p>Couldn't load posts: {(error as Error).message}</p>
      <button onClick={() => refetch()}>Retry</button>
    </div>
  )

  if (posts.length === 0) return <p>No posts yet.</p>

  return <ul>{posts.map(p => <li key={p.id}>{p.title}</li>)}</ul>
}
```

---

## K — Coding Challenge + Solution

### Challenge

Build a `ProductCard` that shows a skeleton on load, an error card with retry on failure, and the product with a `isFetching` indicator on background refresh.

### Solution

```tsx
function ProductCardSkeleton() {
  return (
    <div className="card skeleton-card" aria-busy="true" aria-label="Loading product">
      <div className="skeleton skeleton-image" />
      <div className="skeleton skeleton-title" />
      <div className="skeleton skeleton-price" />
    </div>
  )
}

function ProductCardError({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className="card error-card" role="alert">
      <p>Failed to load product</p>
      <p className="error-detail">{message}</p>
      <button onClick={onRetry} type="button">Try again</button>
    </div>
  )
}

function ProductCard({ productId }: { productId: number }) {
  const { data: product, isLoading, isError, error, isFetching, refetch } = useQuery({
    queryKey:  ['product', productId],
    queryFn:   ({ signal }) => getProduct(productId, signal),
    staleTime: 1000 * 60 * 2,   // 2 min fresh
  })

  if (isLoading) return <ProductCardSkeleton />

  if (isError) return (
    <ProductCardError
      message={(error as Error).message}
      onRetry={() => refetch()}
    />
  )

  return (
    <div className="card product-card">
      {/* Subtle background-refresh indicator ✅ */}
      {isFetching && (
        <span className="refresh-indicator" aria-label="Refreshing…" />
      )}
      <img src={product!.imageUrl} alt={product!.name} />
      <h3>{product!.name}</h3>
      <p className="price">${product!.price.toFixed(2)}</p>
      <p className={product!.inStock ? 'in-stock' : 'out-of-stock'}>
        {product!.inStock ? 'In stock' : 'Out of stock'}
      </p>
    </div>
  )
}
```

---

---
