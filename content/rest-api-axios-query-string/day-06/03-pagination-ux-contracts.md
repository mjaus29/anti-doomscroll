# 3 — Pagination UX Contracts

---

## T — TL;DR

Pagination has **two layers**: the API contract (what metadata the backend sends) and the UX contract (what the frontend shows). Know both. A missing `total` from the API or a wrong page calculation in the frontend breaks the entire experience.

---

## K — Key Concepts

### The Three Pagination Patterns

```
1. Page-Based (Offset):
   ?page=2&limit=20
   → Backend: SELECT ... LIMIT 20 OFFSET 20
   → Good for: small-medium datasets, UI with page numbers

2. Cursor-Based (Keyset):
   ?after=eyJpZCI6MTAyfQ&limit=20
   → Backend: WHERE id > 102 LIMIT 20
   → Good for: large datasets, infinite scroll, real-time data

3. Offset-Based (Raw):
   ?offset=40&limit=20
   → Backend: SELECT ... LIMIT 20 OFFSET 40
   → Flexible but same performance issues as page-based
```

### The API Pagination Response Contract

```ts
// ─── Option A: Envelope in body (most common)
interface PaginatedResponse<T> {
  data: T[]
  meta: {
    total:       number   // total matching items
    page:        number   // current page (1-based)
    limit:       number   // items per page
    totalPages:  number   // Math.ceil(total / limit)
    hasNext:     boolean  // page < totalPages
    hasPrev:     boolean  // page > 1
  }
}

// ─── Option B: Metadata in headers (GitHub-style)
// Response headers:
//   X-Total-Count: 243
//   X-Page: 2
//   X-Per-Page: 20
//   Link: <url?page=3>; rel="next", <url?page=1>; rel="prev"

// ─── Option C: Cursor-based
interface CursorPaginatedResponse<T> {
  data:   T[]
  cursor: {
    next:    string | null   // opaque cursor for next page
    prev:    string | null   // opaque cursor for prev page
    hasMore: boolean
  }
}
```

### Calculating Pagination Values

```js
function buildPaginationMeta(total, page, limit) {
  const totalPages = Math.ceil(total / limit)
  const safePage   = Math.max(1, Math.min(page, totalPages || 1))

  return {
    total,
    page:       safePage,
    limit,
    totalPages,
    hasNext:    safePage < totalPages,
    hasPrev:    safePage > 1,
    from:       (safePage - 1) * limit + 1,   // first item number on this page
    to:         Math.min(safePage * limit, total)  // last item number on this page
  }
}

buildPaginationMeta(243, 2, 20)
// { total: 243, page: 2, limit: 20, totalPages: 13, hasNext: true, hasPrev: true, from: 21, to: 40 }
```

### The Pagination UI Component Contract

```jsx
// What a Pagination component needs:
interface PaginationProps {
  page:       number    // current page (1-based)
  totalPages: number    // total number of pages
  hasNext:    boolean   // show/enable "next" button
  hasPrev:    boolean   // show/enable "prev" button
  onChange:   (page: number) => void  // called with new page number
  loading?:   boolean   // disable controls while loading
}

function Pagination({ page, totalPages, hasNext, hasPrev, onChange, loading }) {
  return (
    <nav aria-label="Pagination">
      <button
        onClick={() => onChange(page - 1)}
        disabled={!hasPrev || loading}
        aria-label="Previous page"
      >
        ← Prev
      </button>

      <span aria-current="page">
        Page {page} of {totalPages}
      </span>

      <button
        onClick={() => onChange(page + 1)}
        disabled={!hasNext || loading}
        aria-label="Next page"
      >
        Next →
      </button>
    </nav>
  )
}
```

### Handling Edge Cases

```js
// Edge case 1: total = 0
buildPaginationMeta(0, 1, 20)
// { total: 0, page: 1, limit: 20, totalPages: 0, hasNext: false, hasPrev: false, from: 1, to: 0 }
// → Show "No results found" message instead of pagination

// Edge case 2: page > totalPages (user has stale bookmark)
buildPaginationMeta(10, 99, 20)
// totalPages = 1, safePage clamped to 1
// → Redirect or show page 1 with a notice

// Edge case 3: total changes between pages (new items added)
// User on page 2, total was 100 → now 120 → page 2 still valid but totalPages changed
// → Re-fetch meta on each page navigation (don't cache totalPages)

// Edge case 4: empty last page (item deleted while browsing)
// User on page 5, last item on page 5 deleted → page 5 now returns 0 items
// → If data.length === 0 && page > 1 → auto-navigate to page - 1
```

---

## W — Why It Matters

- A `total` field in the response is not optional — without it you can't show page numbers, disable the "next" button on the last page, or display "showing 21–40 of 243 results."
- The `hasNext`/`hasPrev` flags eliminate off-by-one errors in the UI — never compute them from `page * limit < total` in the component.
- Cursor-based pagination is the correct choice for any dataset that changes frequently (feeds, notifications, chat) — offset pagination shows duplicates or skips items when new data is inserted.
- The "empty last page" edge case catches developers off-guard — handle it by auto-navigating back one page when the response returns 0 items on page > 1.

---

## I — Interview Q&A

### Q1: What's the difference between page-based and cursor-based pagination?

**A:** Page-based uses `?page=2&limit=20` — the backend calculates `OFFSET`. It's simple but breaks when data changes between pages (items shift positions). Cursor-based uses an opaque cursor representing the last seen item — the backend fetches items after that cursor. It's stable for changing data and scales to large datasets, but can't jump to arbitrary pages.

### Q2: What metadata must a paginated API response include?

**A:** At minimum: `total` (total matching items), `page` (current page), `limit` (page size). Ideally also: `totalPages`, `hasNext`, `hasPrev`. Without `total` you can't show meaningful pagination UI — the frontend can't know how many pages exist.

### Q3: How do you handle the case where a user navigates to a page that no longer exists?

**A:** When `data.length === 0` and `page > 1`, automatically navigate to `page - 1`. When the URL contains a `page` value greater than `totalPages`, redirect to page `totalPages` (or page 1 if `totalPages` is 0). Always validate and clamp page numbers parsed from the URL before sending them to the API.

---

## C — Common Pitfalls + Fix

### ❌ Pitfall: Showing "Next" button on the last page

```jsx
// Computing from total is error-prone
<button disabled={page * limit >= total}>Next</button>
// Edge: page=1, limit=20, total=20 → 20 >= 20 → disabled ✅ but fragile
// Edge: page=1, limit=20, total=19 → 20 >= 19 → disabled ✅
// Edge: page=1, limit=20, total=0  → 20 >= 0  → disabled ✅
// But what if total is stale or undefined? → NaN comparison → button never disabled
```

**Fix:** Use `hasNext` from the API response or computed meta:

```jsx
const meta = buildPaginationMeta(total, page, limit)
<button disabled={!meta.hasNext || loading}>Next</button>
```

### ❌ Pitfall: Not showing "Loading" state while paginating

```jsx
// User clicks Next → old items disappear immediately → blank screen for 200ms
setProducts([])           // ← immediately empties the list
fetchPage(page + 1)
```

**Fix:** Keep showing previous data until new data arrives:

```js
// Keep stale data while loading — never show empty
const [products, setProducts] = useState([])
const [loading, setLoading]   = useState(false)

async function loadPage(newPage) {
  setLoading(true)           // ← loading indicator, but keep old products showing
  const { data } = await productService.list({ ...filters, page: newPage })
  setProducts(data.products) // ← replace when new data arrives
  setLoading(false)
}
```

### ❌ Pitfall: Caching `totalPages` from the first request forever

```js
const [totalPages, setTotalPages] = useState(0)

useEffect(() => {
  fetchProducts().then(({ meta }) => {
    if (!totalPages) setTotalPages(meta.totalPages)  // ← only set once
  })
}, [page])
// Items added/deleted between page navigations → totalPages is stale
```

**Fix:** Update pagination meta on every request response.

---

## K — Coding Challenge + Solution

### Challenge

Write a `usePagination(total, currentPage, limit)` hook that returns all computed pagination values and navigation helpers:

```js
const pg = usePagination(243, 2, 20)
pg.totalPages  // 13
pg.hasNext     // true
pg.hasPrev     // true
pg.from        // 21
pg.to          // 40
pg.pages       // [1,2,3,4,5] (window of pages to show, 5 max)
pg.goNext()    // calls setPage(3)
pg.goPrev()    // calls setPage(1)
pg.goTo(5)     // calls setPage(5) if 1 <= 5 <= 13
```

### Solution

```js
import { useCallback, useMemo } from 'react'

function usePagination(total, currentPage, limit, onPageChange) {
  const meta = useMemo(() => {
    const totalPages = Math.ceil(total / limit) || 1
    const page       = Math.max(1, Math.min(currentPage, totalPages))
    const from       = (page - 1) * limit + 1
    const to         = Math.min(page * limit, total)

    // Sliding window of page numbers (max 5 pages shown)
    const windowSize = 5
    let startPage = Math.max(1, page - Math.floor(windowSize / 2))
    let endPage   = startPage + windowSize - 1
    if (endPage > totalPages) {
      endPage   = totalPages
      startPage = Math.max(1, endPage - windowSize + 1)
    }
    const pages = Array.from(
      { length: endPage - startPage + 1 },
      (_, i) => startPage + i
    )

    return { total, page, limit, totalPages, from, to, pages,
             hasNext: page < totalPages, hasPrev: page > 1 }
  }, [total, currentPage, limit])

  const goTo = useCallback((p) => {
    const clamped = Math.max(1, Math.min(p, meta.totalPages))
    if (clamped !== meta.page) onPageChange(clamped)
  }, [meta.page, meta.totalPages, onPageChange])

  const goNext = useCallback(() => goTo(meta.page + 1), [meta.page, goTo])
  const goPrev = useCallback(() => goTo(meta.page - 1), [meta.page, goTo])

  return { ...meta, goTo, goNext, goPrev }
}

export default usePagination

// Usage
const pg = usePagination(243, 2, 20, setPage)
// pg.from=21, pg.to=40, pg.totalPages=13, pg.pages=[1,2,3,4,5]
```

---

---
