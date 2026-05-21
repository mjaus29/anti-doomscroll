# 2 — Filter-Sort-Page Coordination

---

## T — TL;DR

Filter, sort, and pagination are not three independent features — they are one coordinated system. Changing a filter **must** reset the page. Sort changes **must** reset the page. Page changes must **not** reset filters. Get the coordination rules wrong and users get empty pages and broken back-navigation.

---

## K — Key Concepts

### The Dependency Graph

```
Filters change  →  reset page to 1  →  fire new request
Sort changes    →  reset page to 1  →  fire new request
Page changes    →  keep filters/sort →  fire new request
Limit changes   →  reset page to 1  →  fire new request

Rule: anything that changes the result SET resets pagination.
      Pagination never changes the result SET — only the window.
```

### The Coordination State Shape

```ts
interface FilterSortPageState {
  // Search / Filter
  q:        string
  category: string | null
  brand:    string[]
  minPrice: number | null
  maxPrice: number | null
  inStock:  boolean | null

  // Sort
  sort:  'price' | 'rating' | 'createdAt'
  order: 'asc' | 'desc'

  // Pagination
  page:  number   // always 1-based
  limit: number   // items per page
}
```

### The Coordination Hook

```js
import { useCallback, useMemo } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import queryString from 'query-string'

const QS_OPTIONS = {
  parseNumbers:    true,
  parseBooleans:   true,
  skipNull:        true,
  skipEmptyString: true,
  arrayFormat:     'none'
}

const DEFAULT_STATE = {
  q:        '',
  category: null,
  brand:    [],
  minPrice: null,
  maxPrice: null,
  inStock:  null,
  sort:     'createdAt',
  order:    'desc',
  page:     1,
  limit:    20
}

// Keys that are "pagination-only" — changing them does NOT reset page
const PAGINATION_KEYS = new Set(['page', 'limit'])

export function useFilterSortPage() {
  const location = useLocation()
  const navigate  = useNavigate()

  // ─── Current state: parsed from URL
  const state = useMemo(() => {
    const raw = queryString.parse(location.search, QS_OPTIONS)
    return {
      ...DEFAULT_STATE,
      ...raw,
      brand: [raw.brand].flat().filter(Boolean),
      page:  Math.max(1, Number(raw.page) || 1),
      limit: Math.min(100, Math.max(1, Number(raw.limit) || 20))
    }
  }, [location.search])

  // ─── Apply updates — auto-resets page unless only page/limit changed
  const update = useCallback((updates) => {
    const isPaginationOnly = Object.keys(updates).every(k => PAGINATION_KEYS.has(k))
    const next = {
      ...state,
      ...updates,
      page: isPaginationOnly ? (updates.page ?? state.page) : 1
    }

    const qs = queryString.stringify(next, QS_OPTIONS)
    navigate(`${location.pathname}?${qs}`, {
      replace: isPaginationOnly ? false : false  // always push for undo-ability
    })
  }, [state, location.pathname, navigate])

  // ─── Reset everything
  const reset = useCallback(() => {
    navigate(location.pathname)
  }, [location.pathname, navigate])

  // ─── Named helpers for common operations
  const setFilter = useCallback((key, value) => {
    update({ [key]: value })  // resets page automatically
  }, [update])

  const setSort = useCallback((sort, order) => {
    update({ sort, order })   // resets page automatically
  }, [update])

  const setPage = useCallback((page) => {
    update({ page })          // does NOT reset filters/sort
  }, [update])

  const setLimit = useCallback((limit) => {
    update({ limit, page: 1 })  // reset page when limit changes
  }, [update])

  return { state, update, reset, setFilter, setSort, setPage, setLimit }
}
```

### Using the Hook in a Component

```jsx
function ProductsPage() {
  const { state, setFilter, setSort, setPage, reset } = useFilterSortPage()

  // Fetch fires whenever state (= URL) changes
  const { data, loading } = useProducts(state)

  return (
    <div>
      {/* Search — replace: true to avoid per-keystroke history entries */}
      <input
        value={state.q}
        onChange={e => setFilter('q', e.target.value)}
        placeholder="Search..."
      />

      {/* Category filter */}
      <CategoryPicker
        value={state.category}
        onChange={cat => setFilter('category', cat)}
      />

      {/* Sort control */}
      <SortPicker
        sort={state.sort}
        order={state.order}
        onChange={(s, o) => setSort(s, o)}
      />

      {/* Results */}
      {loading ? <Spinner /> : <ProductGrid products={data?.products ?? []} />}

      {/* Pagination */}
      <Pagination
        page={state.page}
        totalPages={data?.meta.totalPages ?? 1}
        onChange={setPage}     // only page changes — no filter reset
      />

      <button onClick={reset}>Clear All Filters</button>
    </div>
  )
}
```

### The Request — Directly from State

```js
// useProducts.js — state → API
function useProducts(filterState) {
  const [data, setData]       = useState(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    let cancelled = false
    const controller = new AbortController()

    async function fetch() {
      setLoading(true)
      const { data, error } = await productService.list({
        ...filterState,
        // Normalize: pass arrays correctly, skip empties
        q:       filterState.q || null,
        brand:   filterState.brand.length > 0 ? filterState.brand : null
      })
      if (!cancelled && !error) setData(data)
      if (!cancelled) setLoading(false)
    }

    fetch()
    return () => { cancelled = true; controller.abort() }
  }, [JSON.stringify(filterState)])  // re-run when any filter changes

  return { data, loading }
}
```

---

## W — Why It Matters

- Forgetting to reset the page when a filter changes is the single most common pagination bug — users get "no results" because page 5 of the filtered results doesn't exist.
- The `isPaginationOnly` check is the mechanism that makes "only page changes don't reset filters" work — without it, every pagination click wipes the filter state.
- URL-driven state means the browser's back button restores previous filter states for free — no `useRef` stack management needed.
- `JSON.stringify(filterState)` as a `useEffect` dependency is a practical (if imperfect) way to trigger re-fetch on any state change — replace with a proper stable key in production.

---

## I — Interview Q&A

### Q1: Why must changing a filter reset the page to 1?

**A:** A filter changes the total number of matching results. The current page number refers to a position within the old result set — that position may not exist in the new set. For example, if you're on page 5 of "all products" (100 pages) and filter to "Nike shoes" (2 pages), page 5 returns nothing. Always reset to page 1 on any filter or sort change.

### Q2: How do you implement a filter UI that doesn't break the browser back button?

**A:** Store filter, sort, and page state in the URL as query params. Every state change navigates to the updated URL with `navigate()`. The browser history stack contains each URL — pressing back restores the previous URL and its filter state is parsed back into the component.

### Q3: What's the cleanest way to trigger a new API request when any part of the filter/sort/page state changes?

**A:** Derive a stable cache key from the full state (using `queryString.stringify`), use it as the dependency in `useEffect` or as the query key in React Query/TanStack Query. When the key changes, the effect or query re-runs automatically with the new state.

---

## C — Common Pitfalls + Fix

### ❌ Pitfall: Page change resetting all filters

```js
function setPage(newPage) {
  // Rebuilds entire state — forgets existing filters
  navigate(`/products?page=${newPage}`)
}
// User navigates to page 2 — all filters are gone
```

**Fix:** Merge with existing state:

```js
function setPage(newPage) {
  const current = queryString.parse(location.search)
  const qs = queryString.stringify({ ...current, page: newPage })
  navigate(`/products?${qs}`)
}
```

### ❌ Pitfall: Filter change not resetting page

```js
function setFilter(key, value) {
  const current = queryString.parse(location.search)
  const qs = queryString.stringify({ ...current, [key]: value })
  // ← no page: 1 reset!
  navigate(`/products?${qs}`)
}
// User on page 7, changes category → still on page 7 of new category → possibly empty
```

**Fix:**

```js
function setFilter(key, value) {
  const current = queryString.parse(location.search)
  const qs = queryString.stringify({ ...current, [key]: value, page: 1 })
  navigate(`/products?${qs}`)
}
```

### ❌ Pitfall: Using object reference as `useEffect` dependency

```js
useEffect(() => {
  fetchProducts(filters)
}, [filters])  // ← new object reference every render → infinite loop
```

**Fix:**

```js
const filterKey = queryString.stringify(filters)  // stable string
useEffect(() => {
  fetchProducts(filters)
}, [filterKey])  // ← only re-runs when filter values actually change
```

---

## K — Coding Challenge + Solution

### Challenge

Write `coordinateUpdate(currentState, updates)` that:
1. Merges updates into current state
2. Resets `page` to `1` if any non-pagination key changes
3. Clamps `page` to `[1, totalPages]` if `totalPages` is provided
4. Clamps `limit` to `[1, 100]`

```js
coordinateUpdate({ page: 5, sort: 'price', category: 'shoes' }, { category: 'bags' })
// { page: 1, sort: 'price', category: 'bags' }  ← page reset

coordinateUpdate({ page: 5, sort: 'price', category: 'shoes' }, { page: 6 })
// { page: 6, sort: 'price', category: 'shoes' }  ← page NOT reset
```

### Solution

```js
const PAGINATION_KEYS = new Set(['page', 'limit'])

function coordinateUpdate(currentState, updates, totalPages = Infinity) {
  const isPaginationOnly = Object.keys(updates).every(k => PAGINATION_KEYS.has(k))

  const rawPage = isPaginationOnly
    ? (updates.page ?? currentState.page)
    : 1

  const rawLimit = updates.limit ?? currentState.limit ?? 20

  return {
    ...currentState,
    ...updates,
    page:  Math.min(Math.max(1, rawPage), totalPages),
    limit: Math.min(100, Math.max(1, rawLimit))
  }
}

// Tests
console.log(
  coordinateUpdate({ page: 5, sort: 'price', category: 'shoes' }, { category: 'bags' })
)
// { page: 1, sort: 'price', category: 'bags' }

console.log(
  coordinateUpdate({ page: 5, sort: 'price', category: 'shoes' }, { page: 6 })
)
// { page: 6, sort: 'price', category: 'shoes' }

console.log(
  coordinateUpdate({ page: 5, sort: 'price' }, { page: 99 }, 10)
)
// { page: 10, sort: 'price' }  ← clamped to totalPages
```

---

---
