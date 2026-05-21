# 10 — Search / Filter / Sort / Page URL State

---

## T — TL;DR

URL query strings are the correct place to store **search, filter, sort, and pagination state**. This makes the state **bookmarkable, shareable, and survivable on refresh** — without any backend session or local storage.

---

## K — Key Concepts

### The Core Principle: URL as State

```
❌ Filter state in useState only:
- Refresh → all filters lost
- Share link → recipient sees unfiltered results
- Back button → filters cleared

✅ Filter state in URL query params:
- Refresh → filters preserved
- Share link → recipient sees the same filtered results
- Back button → goes to previous filter state
```

### The Two-Way Sync Pattern

```
URL ←→ Component State

Parse:     URL → State (on mount, on URL change)
Stringify: State → URL (on user interaction)
```

```jsx
import { useEffect, useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import queryString from 'query-string'

function ProductsPage() {
  const location  = useLocation()
  const navigate  = useNavigate()

  // ─── Parse URL → State (on mount + URL change)
  const [filters, setFilters] = useState(() =>
    parseFiltersFromUrl(location.search)
  )

  useEffect(() => {
    setFilters(parseFiltersFromUrl(location.search))
  }, [location.search])

  // ─── State → URL (on user interaction)
  function updateFilters(newFilters) {
    const merged = { ...filters, ...newFilters, page: 1 }  // reset page on filter change
    const qs = queryString.stringify(merged, {
      skipNull: true, skipEmptyString: true
    })
    navigate(`/products?${qs}`, { replace: false })  // replace: false = adds to history
  }

  function updatePage(newPage) {
    const qs = queryString.stringify(
      { ...filters, page: newPage },
      { skipNull: true, skipEmptyString: true }
    )
    navigate(`/products?${qs}`)
  }

  return (
    <div>
      <SearchBar value={filters.q} onChange={(q) => updateFilters({ q })} />
      <CategoryFilter
        value={filters.category}
        onChange={(c) => updateFilters({ category: c })}
      />
      <SortControl
        sort={filters.sort}
        order={filters.order}
        onChange={(sort, order) => updateFilters({ sort, order })}
      />
      <ProductGrid filters={filters} />
      <Pagination
        page={filters.page}
        onChange={updatePage}
      />
    </div>
  )
}
```

### `parseFiltersFromUrl` — The Parse Helper

```js
function parseFiltersFromUrl(searchString) {
  const raw = queryString.parse(searchString, {
    parseNumbers:  true,
    parseBooleans: true,
    arrayFormat:   'comma'
  })

  return {
    q:        typeof raw.q === 'string' ? raw.q : '',
    category: typeof raw.category === 'string' ? raw.category : null,
    brand:    raw.brand ? [raw.brand].flat().filter(Boolean) : [],
    minPrice: typeof raw.minPrice === 'number' ? raw.minPrice : null,
    maxPrice: typeof raw.maxPrice === 'number' ? raw.maxPrice : null,
    sort:     typeof raw.sort === 'string' ? raw.sort : 'createdAt',
    order:    raw.order === 'asc' || raw.order === 'desc' ? raw.order : 'desc',
    page:     typeof raw.page === 'number' && raw.page > 0 ? raw.page : 1,
    limit:    typeof raw.limit === 'number' ? Math.min(raw.limit, 100) : 20
  }
}
```

### `replace: true` vs `replace: false`

```js
// replace: false (default) — adds new entry to browser history
// User can go BACK to previous filter state with the back button
navigate(`/products?${qs}`, { replace: false })

// replace: true — replaces current history entry
// Useful for: rapid filter changes (typing in search box) — prevents
// the back button from cycling through every keystroke
navigate(`/products?${qs}`, { replace: true })  // for rapid changes

// Rule of thumb:
// replace: false → user explicitly applying a filter (clicking a checkbox)
// replace: true  → rapid/incremental changes (typing, slider dragging)
```

### Resetting All Filters

```js
function clearAllFilters() {
  navigate('/products')  // removes all query params
}

function clearFilter(key) {
  const current = parseFiltersFromUrl(location.search)
  const updated = { ...current, [key]: null, page: 1 }
  const qs = queryString.stringify(updated, { skipNull: true, skipEmptyString: true })
  navigate(`/products?${qs}`)
}
```

---

## W — Why It Matters

- Shareable filtered URLs are a product requirement on almost every data-heavy page — product listings, admin tables, user directories.
- URL-based filter state is one of the most commonly asked implementation questions in senior frontend interviews.
- The `replace: true` pattern for rapid changes prevents history stack pollution — a UX detail that separates junior from senior implementations.
- Page reset on filter change (`page: 1` on every filter update) is easy to forget and causes a common bug where changing a filter on page 5 returns an empty page.

---

## I — Interview Q&A

### Q1: How would you implement a shareable filtered product listing page?

**A:** Parse filter state from `window.location.search` on mount using `query-string.parse()`. On any filter change, stringify the new state with `skipNull: true` and navigate to the updated URL. On refresh, the parse step restores all filters. Use `replace: true` for rapid changes (typing) and `replace: false` for explicit filter selections (clicking).

### Q2: Why should changing a filter reset the page to 1?

**A:** The total number of results changes when a filter changes — previously valid page numbers may no longer exist. If a user is on page 10 and clears a filter, page 10 of the unfiltered results may have content, but the user expects to see the first page of the new filter results. Always reset page to 1 on any filter change.

### Q3: What's the difference between using `replace: true` vs `replace: false` when updating URL filter state?

**A:** `replace: false` adds a new entry to the browser history stack — the user can go back to the previous filter state with the back button. `replace: true` replaces the current entry — no new history entry. Use `replace: true` for rapid/incremental changes (typing in a search box produces a new URL per character) to prevent the back button from stepping through every keystroke.

---

## C — Common Pitfalls + Fix

### ❌ Pitfall: Forgetting to reset page on filter change

```js
function updateFilters(newFilters) {
  const merged = { ...filters, ...newFilters }  // ← no page reset!
  navigate(`/products?${queryString.stringify(merged)}`)
}
// User on page 5, clears brand filter → still on page 5 of different results
// If only 2 pages exist → empty page
```

**Fix:**

```js
function updateFilters(newFilters) {
  const merged = { ...filters, ...newFilters, page: 1 }  // ← always reset page
  navigate(`/products?${queryString.stringify(merged, { skipNull: true })}`)
}
```

### ❌ Pitfall: Not initializing state from URL on mount

```js
const [filters, setFilters] = useState({
  q: '', category: null, page: 1  // ← hardcoded defaults, ignores URL
})
// User shares ?category=shoes&page=3 → page loads with blank defaults
```

**Fix:**

```js
const [filters, setFilters] = useState(() =>
  parseFiltersFromUrl(window.location.search)  // ← initialize from URL
)
```

### ❌ Pitfall: Rapid filter changes creating huge browser history

```js
// User types "shoes" in search box — one navigate per character
onChange={(e) => {
  navigate(`/products?q=${e.target.value}`)  // replace: false (default)
  // History: /, /p, /pr, /pro, /prod, ... → back button is broken
}}
```

**Fix:**

```js
onChange={(e) => {
  const qs = queryString.stringify({ ...filters, q: e.target.value, page: 1 })
  navigate(`/products?${qs}`, { replace: true })  // ← replace for typing
}}
```

---

## K — Coding Challenge + Solution

### Challenge

Write a custom hook `useUrlFilters(defaultFilters)` that:
1. Reads initial state from URL on mount
2. Provides an `update(newFilters)` function that updates URL with `replace: false`
3. Provides a `reset()` function that goes back to defaults
4. Automatically resets page to 1 when non-pagination filters change

```js
const { filters, update, reset } = useUrlFilters({
  q: '', category: null, sort: 'createdAt', order: 'desc', page: 1, limit: 20
})
```

### Solution

```js
import { useCallback, useEffect, useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import queryString from 'query-string'

const QS_OPTIONS = {
  parseNumbers:    true,
  parseBooleans:   true,
  skipNull:        true,
  skipEmptyString: true
}

function useUrlFilters(defaultFilters = {}) {
  const location = useLocation()
  const navigate = useNavigate()

  const parseFromUrl = useCallback((search) => {
    const raw = queryString.parse(search, QS_OPTIONS)
    return { ...defaultFilters, ...raw }
  }, []) // eslint-disable-line

  const [filters, setFilters] = useState(() => parseFromUrl(location.search))

  // Sync state when URL changes externally (back/forward)
  useEffect(() => {
    setFilters(parseFromUrl(location.search))
  }, [location.search])

  const update = useCallback((newFilters) => {
    const isPaginationOnly = Object.keys(newFilters).every(k =>
      ['page', 'limit'].includes(k)
    )

    const merged = {
      ...filters,
      ...newFilters,
      // Reset page to 1 unless only pagination params are changing
      page: isPaginationOnly ? (newFilters.page ?? filters.page) : 1
    }

    const qs = queryString.stringify(merged, QS_OPTIONS)
    navigate(`${location.pathname}?${qs}`, { replace: false })
  }, [filters, location.pathname, navigate])

  const reset = useCallback(() => {
    navigate(location.pathname)  // remove all query params
  }, [location.pathname, navigate])

  return { filters, update, reset }
}

export default useUrlFilters

// Usage
function ProductsPage() {
  const { filters, update, reset } = useUrlFilters({
    q: '', category: null, sort: 'createdAt', order: 'desc', page: 1, limit: 20
  })

  return (
    <div>
      <input value={filters.q} onChange={e => update({ q: e.target.value })} />
      <select value={filters.sort} onChange={e => update({ sort: e.target.value })}>
        <option value="createdAt">Newest</option>
        <option value="price">Price</option>
      </select>
      <button onClick={reset}>Clear All</button>
    </div>
  )
}
```

---

---
