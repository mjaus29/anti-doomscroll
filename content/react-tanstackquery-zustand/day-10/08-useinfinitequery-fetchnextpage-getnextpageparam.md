# 8 — useInfiniteQuery + fetchNextPage + getNextPageParam

---

## T — TL;DR

`useInfiniteQuery` fetches a series of pages appended to a flat list — "Load more" and infinite scroll patterns. `getNextPageParam` extracts the next page cursor from each response. `fetchNextPage` triggers the next fetch.

---

## K — Key Concepts

```tsx
import { useInfiniteQuery } from '@tanstack/react-query'

// ── Anatomy ───────────────────────────────────────────────────────────────
interface PostPage { posts: Post[]; nextCursor: string | null; hasMore: boolean }

const {
  data,              // { pages: PostPage[], pageParams: unknown[] }
  fetchNextPage,     // () => void — loads the next page
  fetchPreviousPage, // () => void — loads previous (bidirectional)
  hasNextPage,       // true when getNextPageParam returned a non-undefined value
  isFetchingNextPage, // true while next page is loading
  isFetching,
  isLoading,
} = useInfiniteQuery({
  queryKey: ['posts', 'infinite'],
  queryFn:  ({ pageParam, signal }) => fetchPostsPage(pageParam as string | null, signal),
  initialPageParam: null,           // ← first page cursor (null = start)
  getNextPageParam: (lastPage) =>   // ← extract cursor for next fetch
    lastPage.hasMore ? lastPage.nextCursor : undefined,
  // returning undefined from getNextPageParam sets hasNextPage = false ✅
})
```

```tsx
// ── Flattening pages into a single list ──────────────────────────────────
function InfinitePostFeed() {
  const {
    data, fetchNextPage, hasNextPage, isFetchingNextPage, isLoading
  } = useInfiniteQuery({
    queryKey:         ['feed'],
    queryFn:          ({ pageParam, signal }) => fetchFeed(pageParam, signal),
    initialPageParam: 0,   // offset-based: start at 0
    getNextPageParam: (lastPage, allPages) => {
      const nextOffset = allPages.length * 20
      return nextOffset < lastPage.total ? nextOffset : undefined
    },
  })

  // Flatten pages into one array
  const posts = data?.pages.flatMap(page => page.posts) ?? []

  if (isLoading) return <FeedSkeleton />

  return (
    <div>
      <ul>
        {posts.map(post => <PostCard key={post.id} post={post} />)}
      </ul>
      <button
        onClick={() => fetchNextPage()}
        disabled={!hasNextPage || isFetchingNextPage}
      >
        {isFetchingNextPage
          ? 'Loading more…'
          : hasNextPage
            ? 'Load more'
            : 'All posts loaded'}
      </button>
    </div>
  )
}
```

```tsx
// ── Infinite scroll with IntersectionObserver ─────────────────────────────
function InfiniteScrollFeed() {
  const { data, fetchNextPage, hasNextPage, isFetchingNextPage } = useInfiniteQuery({
    queryKey:         ['feed', 'scroll'],
    queryFn:          ({ pageParam, signal }) => fetchFeed(pageParam, signal),
    initialPageParam: null,
    getNextPageParam: last => last.nextCursor ?? undefined,
  })

  const loadMoreRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const el = loadMoreRef.current
    if (!el) return
    const observer = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting && hasNextPage && !isFetchingNextPage) {
        fetchNextPage()   // auto-load when sentinel enters viewport ✅
      }
    }, { threshold: 0.1 })
    observer.observe(el)
    return () => observer.disconnect()
  }, [hasNextPage, isFetchingNextPage, fetchNextPage])

  const posts = data?.pages.flatMap(p => p.posts) ?? []
  return (
    <div>
      {posts.map(p => <PostCard key={p.id} post={p} />)}
      <div ref={loadMoreRef} style={{ height: 20 }}>
        {isFetchingNextPage && <Spinner />}
      </div>
    </div>
  )
}
```

---

## W — Why It Matters

- `useInfiniteQuery` manages the multi-page data structure for you — without it, you'd build a custom accumulator that appends pages to an array and tracks the current cursor, handling loading states for each page.
- `hasNextPage` derived from `getNextPageParam` is the clean end-of-list signal — return `undefined` when there's no more data and the "Load more" button disables itself automatically.
- Each page is cached in `data.pages[n]` — re-visiting the feed is instant for already-fetched pages, and new pages load incrementally.

---

## I — Interview Q&A

### Q: How does `getNextPageParam` control pagination in `useInfiniteQuery`?

**A:** `getNextPageParam` is a function TanStack Query calls after each page fetch. It receives the last fetched page's data and the array of all fetched pages, and must return the `pageParam` for the next fetch — or `undefined` if there are no more pages. The returned value becomes `pageParam` in the next `queryFn` call. When it returns `undefined`, `hasNextPage` is set to `false`. This is how you support both cursor-based pagination (`nextCursor: 'abc123'`) and offset-based (`nextOffset: 40`) — you just extract the right value from the response. The `initialPageParam` option sets the `pageParam` for the very first fetch (typically `null` for cursors or `0` for offsets).

---

## C — Common Pitfalls + Fix

### ❌ Not using `flatMap` — accessing `data.pages` in the component

```tsx
// ❌ Accessing raw pages structure in component — verbose and fragile
function InfiniteBad() {
  const { data } = useInfiniteQuery({ /* ... */ })
  return (
    <div>
      {data?.pages.map((page, pageIdx) =>
        page.items.map(item => <div key={`${pageIdx}-${item.id}`}>{item.name}</div>)
      )}
    </div>
  )
}
// ❌ Keys may collide across pages if items don't have unique IDs globally
// ❌ Component logic knows about the page structure

// ✅ Flatten in useMemo or select
function InfiniteGood() {
  const { data, fetchNextPage, hasNextPage } = useInfiniteQuery({
    /* ... */
    // Or use select to flatten at the query layer:
    // select: data => ({ ...data, items: data.pages.flatMap(p => p.items) })
  })
  const items = useMemo(
    () => data?.pages.flatMap(p => p.items) ?? [],
    [data]
  )
  return (
    <div>
      {items.map(item => <div key={item.id}>{item.name}</div>)}
      {hasNextPage && <button onClick={() => fetchNextPage()}>More</button>}
    </div>
  )
}
```

---

## K — Coding Challenge + Solution

### Challenge

Build `useInfiniteComments`: cursor-based, `select` flattens to `{ comments, total }`, auto-load on scroll sentinel.

### Solution

```tsx
interface CommentPage { comments: Comment[]; nextCursor: string | null; total: number }

function useInfiniteComments(postId: number) {
  return useInfiniteQuery({
    queryKey:         ['comments', postId, 'infinite'],
    queryFn:          async ({ pageParam, signal }) => {
      const cursor = pageParam as string | null
      const url    = cursor
        ? `/api/posts/${postId}/comments?cursor=${cursor}`
        : `/api/posts/${postId}/comments`
      const res = await fetch(url, { signal })
      if (!res.ok) throw new Error(`comments: ${res.status}`)
      return res.json() as Promise<CommentPage>
    },
    initialPageParam: null,
    getNextPageParam: last => last.nextCursor ?? undefined,
    staleTime: 1000 * 60,
    select: data => ({
      comments: data.pages.flatMap(p => p.comments),
      total:    data.pages[0]?.total ?? 0,
    }),
  })
}

function CommentSection({ postId }: { postId: number }) {
  const {
    data, fetchNextPage, hasNextPage, isFetchingNextPage, isLoading
  } = useInfiniteComments(postId)

  const sentinelRef = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const el = sentinelRef.current
    if (!el) return
    const io = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting && hasNextPage && !isFetchingNextPage) {
        fetchNextPage()
      }
    })
    io.observe(el)
    return () => io.disconnect()
  }, [hasNextPage, isFetchingNextPage, fetchNextPage])

  if (isLoading) return <CommentsSkeleton />

  return (
    <section aria-label="Comments">
      <p>{data?.total ?? 0} comments</p>
      <ul>
        {data?.comments.map(c => (
          <li key={c.id}>{c.text}</li>
        ))}
      </ul>
      <div ref={sentinelRef}>
        {isFetchingNextPage && <Spinner />}
        {!hasNextPage && <p>All comments loaded.</p>}
      </div>
    </section>
  )
}
```

---

---
