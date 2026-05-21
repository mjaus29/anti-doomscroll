# 7 — Paginated Queries + placeholderData + keepPreviousData

---

## T — TL;DR

Paginated queries use a `page` variable in the key — each page is a separate cache entry. `placeholderData: keepPreviousData` shows the current page while the next loads, eliminating the blank flash between page transitions.

---

## K — Key Concepts

```tsx
import { keepPreviousData } from '@tanstack/react-query'

// ── Basic paginated query ─────────────────────────────────────────────────
interface PageResult<T> {
  items:      T[]
  page:       number
  totalPages: number
  totalItems: number
}

function usePaginatedPosts(page: number, pageSize = 20) {
  return useQuery({
    queryKey: ['posts', 'paginated', { page, pageSize }],
    queryFn:  ({ signal }) => fetchPostsPage({ page, pageSize }, signal),
    placeholderData: keepPreviousData,   // ← no flash ✅
    staleTime: 1000 * 60,
  })
}
```

```tsx
// ── Paginated component: full implementation ───────────────────────────────
function PostsTable() {
  const [page, setPage]         = useState(1)
  const [pageSize, setPageSize] = useState(20)

  const { data, isLoading, isFetching, isPlaceholderData } = usePaginatedPosts(page, pageSize)
  const qc = useQueryClient()

  // Prefetch next page
  useEffect(() => {
    if (data && page < data.totalPages) {
      qc.prefetchQuery({
        queryKey: ['posts', 'paginated', { page: page + 1, pageSize }],
        queryFn:  ({ signal }) => fetchPostsPage({ page: page + 1, pageSize }, signal),
        staleTime: 1000 * 60,
      })
    }
  }, [page, pageSize, data, qc])

  if (isLoading) return <TableSkeleton rows={pageSize} />

  return (
    <div>
      {/* Dim while fetching next page — old page still visible ✅ */}
      <div style={{ opacity: isPlaceholderData ? 0.6 : 1, transition: 'opacity 0.2s' }}>
        <table>
          <tbody>
            {data?.items.map(post => (
              <tr key={post.id}><td>{post.title}</td></tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="pagination">
        <button disabled={page === 1} onClick={() => setPage(p => p - 1)}>
          ← Prev
        </button>
        <span>Page {page} of {data?.totalPages ?? '…'}</span>
        <button
          disabled={isPlaceholderData || page === data?.totalPages}
          onClick={() => setPage(p => p + 1)}
        >
          Next →
        </button>
        {isFetching && <span>Loading…</span>}
      </div>
    </div>
  )
}
```

```tsx
// ── Cursor-based pagination ────────────────────────────────────────────────
// Not page numbers — use a cursor token for the next batch
function useCursorPosts(cursor: string | null) {
  return useQuery({
    queryKey: ['posts', 'cursor', cursor],
    queryFn:  ({ signal }) => fetchPostsCursor(cursor, signal),
    placeholderData: keepPreviousData,
    enabled:  true,   // null cursor = first page
  })
}
```

---

## W — Why It Matters

- Without `keepPreviousData`, every page change blanks the UI while the next page loads — even if the previous page was just a second ago. It feels broken.
- Prefetching the next page (and prev page for backwards pagination) means button clicks feel instant — the page is already in cache when the user clicks.
- Disabling the "Next" button while `isPlaceholderData` is true prevents double-clicking through pages faster than requests complete, which would desync the page counter from the displayed data.

---

## I — Interview Q&A

### Q: How does `keepPreviousData` differ from a plain loading state for pagination?

**A:** Without `keepPreviousData`: when `page` changes, the key changes, TanStack Query sees no cache for the new key, sets `isLoading: true`, and `data` becomes `undefined`. The component blanks out while loading. With `keepPreviousData`: when the key changes and the new key has no cache, TanStack Query provides the previous key's data as `placeholderData`, setting `isPlaceholderData: true`. The component continues rendering the old page (usually dimmed) while the new page loads. When the new page arrives, it atomically replaces the placeholder. This is the "pagination with no flash" pattern — the user always sees something meaningful on screen.

---

## C — Common Pitfalls + Fix

### ❌ Enabling "Next" while `isPlaceholderData` — desync between UI and data

```tsx
// ❌ User clicks Next twice before first page loads → page=3 displayed but page=2 is in flight
function PaginationBad() {
  const [page, setPage] = useState(1)
  const { data, isPlaceholderData } = useQuery({ /* ... */ })

  return (
    <button onClick={() => setPage(p => p + 1)}>
      Next   {/* ❌ no disabled — can click through faster than requests */}
    </button>
  )
}

// ✅ Disable Next while showing placeholder (previous) data
function PaginationGood() {
  const [page, setPage] = useState(1)
  const { data, isPlaceholderData } = usePaginatedPosts(page)

  return (
    <button
      disabled={isPlaceholderData || !data?.totalPages || page >= data.totalPages}
      onClick={() => setPage(p => p + 1)}
    >
      Next ✅
    </button>
  )
}
```

---

## K — Coding Challenge + Solution

### Challenge

Build `useServerTable` — sortable, filterable, paginated table hook. All params in the key. Returns `{ data, page, totalPages, setPage, setSort, setFilter, isFetching }`.

### Solution

```tsx
interface TableParams { page: number; pageSize: number; sort: string; filter: string }
interface TableResult<T> { items: T[]; totalPages: number; totalItems: number }

function useServerTable<T>(
  resourceKey: string,
  fetchFn: (params: TableParams, signal: AbortSignal) => Promise<TableResult<T>>,
  initial: Pick<TableParams, 'sort' | 'pageSize'> = { sort: 'id', pageSize: 20 }
) {
  const qc = useQueryClient()
  const [page,   setPageRaw] = useState(1)
  const [sort,   setSort]    = useState(initial.sort)
  const [filter, setFilter]  = useState('')

  const params: TableParams = { page, pageSize: initial.pageSize, sort, filter }

  const query = useQuery({
    queryKey: [resourceKey, 'table', params],
    queryFn:  ({ signal }) => fetchFn(params, signal),
    placeholderData: keepPreviousData,
    staleTime: 1000 * 30,
  })

  // Reset to page 1 when sort or filter changes
  function setSort2(s: string)   { setSort(s);   setPageRaw(1) }
  function setFilter2(f: string) { setFilter(f); setPageRaw(1) }

  // Prefetch next page
  useEffect(() => {
    if (query.data && page < query.data.totalPages) {
      qc.prefetchQuery({
        queryKey: [resourceKey, 'table', { ...params, page: page + 1 }],
        queryFn:  ({ signal }) => fetchFn({ ...params, page: page + 1 }, signal),
        staleTime: 1000 * 30,
      })
    }
  }, [page, query.data])

  return {
    data:          query.data?.items ?? [],
    totalPages:    query.data?.totalPages ?? 0,
    totalItems:    query.data?.totalItems ?? 0,
    page,
    sort,
    filter,
    isFetching:    query.isFetching,
    isLoading:     query.isLoading,
    isPlaceholder: query.isPlaceholderData,
    setPage:       setPageRaw,
    setSort:       setSort2,
    setFilter:     setFilter2,
  }
}
```

---

---
