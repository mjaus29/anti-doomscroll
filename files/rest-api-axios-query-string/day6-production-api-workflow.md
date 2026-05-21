
# 📅 Day 6 — Production API Workflow for Frontend Developers

> **Goal:** Close the gap between "it works locally" and "it works in production." Day 6 covers everything that separates a junior API integration from a senior one — contracts, resilience, debugging, testing, caching, and the complete audit.
> **Format:** Each subtopic = 5–15 min. Do one. Stop. Come back.

---

## 📋 Day 6 Subtopic Overview

| # | Subtopic | Time |
|---|----------|------|
| 1 | Frontend-to-API Contract Design | 15 min |
| 2 | Filter-Sort-Page Coordination | 15 min |
| 3 | Pagination UX Contracts | 15 min |
| 4 | Auth & Token-Refresh Concepts | 15 min |
| 5 | Resilient Loading & Error UX | 15 min |
| 6 | Debugging Network Issues | 15 min |
| 7 | Mocking & Testing API Calls | 15 min |
| 8 | Caching & Performance Basics | 15 min |
| 9 | Documenting Edge Cases | 10 min |
| 10 | Final Audit — REST / Axios / query-string | 15 min |

---

---

# 1 — Frontend-to-API Contract Design

---

## T — TL;DR

A **contract** is the formal agreement between frontend and backend about what a request looks like and what a response looks like. Defining it upfront prevents the most common integration bugs — mismatched field names, wrong types, and unexpected shapes.

---

## K — Key Concepts

### What a Contract Covers

```
REQUEST contract:
  - Method (GET / POST / PATCH / DELETE)
  - URL pattern (/users/:id)
  - Query parameters (names, types, defaults, allowed values)
  - Request body shape (field names, types, required vs optional)
  - Required headers (Authorization, Content-Type)

RESPONSE contract:
  - HTTP status codes per outcome (200, 201, 400, 401, 404, 422, 500)
  - Response body shape on success
  - Response body shape on error
  - Pagination envelope (if list endpoint)
  - Special headers (x-total-count, location, retry-after)
```

### The Minimal Contract Document

```
────────────────────────────────────────────────────────────────
ENDPOINT: List Products
────────────────────────────────────────────────────────────────
Method:   GET
URL:      /products

Query Params:
  q           string?     search term
  category    string?     filter by category slug
  brand       string[]?   filter by brand(s) — repeated keys
  min-price   number?     minimum price (inclusive)
  max-price   number?     maximum price (inclusive)
  in-stock    boolean?    true = only in-stock items
  sort        string?     'price' | 'rating' | 'createdAt'  default: 'createdAt'
  order       string?     'asc' | 'desc'                    default: 'desc'
  page        number?     1-based page number               default: 1
  limit       number?     1–100                             default: 20

Success Response: 200 OK
{
  "data": [
    {
      "id":       "uuid",
      "name":     "string",
      "price":    number,
      "brand":    "string",
      "category": "string",
      "inStock":  boolean,
      "rating":   number,
      "imageUrl": "string | null",
      "createdAt":"ISO 8601 string"
    }
  ],
  "meta": {
    "total":      number,  ← total matching items (not just this page)
    "page":       number,
    "limit":      number,
    "totalPages": number
  }
}

Error Responses:
  400 Bad Request   → invalid param value (e.g. limit=abc)
  401 Unauthorized  → missing or expired token
  422 Unprocessable → param validation failed

Error Body Shape (all errors):
{
  "error": {
    "code":    "VALIDATION_ERROR",
    "message": "Human-readable description",
    "details": [{ "field": "limit", "message": "Must be between 1 and 100" }]
  }
}
────────────────────────────────────────────────────────────────
```

### TypeScript Interface — The Living Contract

```ts
// Contract as TypeScript types — enforced at compile time

// ─── Request
interface ProductListParams {
  q?:         string
  category?:  string
  brand?:     string[]
  minPrice?:  number
  maxPrice?:  number
  inStock?:   boolean
  sort?:      'price' | 'rating' | 'createdAt'
  order?:     'asc' | 'desc'
  page?:      number
  limit?:     number
}

// ─── Response — success
interface Product {
  id:        string
  name:      string
  price:     number
  brand:     string
  category:  string
  inStock:   boolean
  rating:    number
  imageUrl:  string | null
  createdAt: string
}

interface PaginationMeta {
  total:      number
  page:       number
  limit:      number
  totalPages: number
}

interface ProductListResponse {
  data: Product[]
  meta: PaginationMeta
}

// ─── Response — error (consistent across all endpoints)
interface ApiErrorDetail {
  field:   string
  message: string
}

interface ApiError {
  code:     string
  message:  string
  details:  ApiErrorDetail[]
}

interface ApiErrorResponse {
  error: ApiError
}

// ─── Axios typed call
const { data } = await api.get<ProductListResponse>('/products', {
  params: { sort: 'price', page: 2 } satisfies ProductListParams
})

data.data[0].name   // ✅ TypeScript knows this is a string
data.meta.total     // ✅ TypeScript knows this is a number
```

### Contract-First Development (API-First Workflow)

```
1. Frontend and backend agree on the contract (fields, types, errors)
2. Backend generates a mock server from the contract (OpenAPI/Swagger)
3. Frontend builds against the mock server — no backend dependency
4. Backend implements the real endpoint
5. Frontend switches baseURL from mock to real
6. Integration test verifies the contract is honored
```

### Validating the Contract at Runtime

```js
// Lightweight runtime validation with a helper
function assertContractShape(data, requiredFields) {
  for (const field of requiredFields) {
    if (!(field in data)) {
      console.error(`Contract violation: missing field "${field}"`, data)
    }
  }
}

const { data: product } = await api.get('/products/1')
assertContractShape(product, ['id', 'name', 'price', 'inStock'])
// Logs a warning if the backend breaks the contract
```

---

## W — Why It Matters

- Contract mismatches are the #1 cause of "it works on my machine but not in production" — a field name mismatch between backend and frontend is silent and devastating.
- TypeScript interfaces for API responses give you autocomplete and type safety without any runtime cost — the contract is enforced at compile time.
- Contract-first development means frontend can build UI in parallel with backend implementation — no blocking.
- A documented error contract is what makes consistent frontend error handling possible — if you don't know the error shape, every endpoint needs custom error logic.

---

## I — Interview Q&A

### Q1: What is a frontend-to-API contract and why does it matter?

**A:** A contract is the formal specification of what a request must contain and what a response will look like — including field names, types, status codes, and error shapes. It matters because without it, frontend and backend make independent assumptions that only collide at integration time — causing bugs that are hard to debug and expensive to fix.

### Q2: How do TypeScript interfaces help enforce API contracts?

**A:** TypeScript interfaces define the expected shape of request params and response objects. When the API response type is specified in the Axios generic (`api.get<ProductListResponse>()`), TypeScript flags any access to non-existent fields or type mismatches at compile time — before the code runs.

### Q3: What should a consistent API error contract include?

**A:** A fixed JSON shape shared by all endpoints: a `code` (machine-readable string), a `message` (human-readable string), and optionally `details` (array of field-level validation errors). Consistent error shapes mean the frontend needs one error-handling path instead of per-endpoint custom logic.

---

## C — Common Pitfalls + Fix

### ❌ Pitfall: Assuming field names match between frontend and backend

```js
const { data: user } = await api.get('/users/1')
console.log(user.firstName)  // undefined — backend sends "first_name" (snake_case)
```

**Fix:** Establish naming convention in the contract (camelCase vs snake_case). If the backend uses snake_case, transform in the response interceptor:

```js
// Response interceptor — camelCase transformation
api.interceptors.response.use((response) => {
  response.data = toCamelCase(response.data)  // utility function
  return response
})
```

### ❌ Pitfall: No agreed error shape — every endpoint returns different error structures

```js
// Endpoint A: { message: "Not found" }
// Endpoint B: { error: "unauthorized" }
// Endpoint C: { errors: [{ msg: "invalid" }] }
// → 3 different error handlers in the codebase
```

**Fix:** Agree on one error envelope in the contract. Enforce it server-side. Map legacy shapes to the standard shape in the response interceptor.

### ❌ Pitfall: Not versioning the contract when breaking changes happen

```js
// API changes /products response — removes "inStock", adds "availability: 'in_stock' | 'out_of_stock'"
// Frontend breaks silently — inStock is now undefined everywhere
```

**Fix:** Version the API (`/v2/products`). Communicate breaking changes as a formal contract update. Add runtime contract validation in development.

---

## K — Coding Challenge + Solution

### Challenge

Define a complete TypeScript contract for a **POST /orders** endpoint:

```
- Creates a new order
- Requires: items array (productId + quantity), shippingAddress object
- Optional: couponCode string
- 201: returns created order with id + estimatedDelivery
- 400: invalid input
- 422: validation errors (per-field)
- 409: coupon already used
```

### Solution

```ts
// ─── Request
interface OrderItem {
  productId: string
  quantity:  number  // min: 1
}

interface ShippingAddress {
  street:  string
  city:    string
  state:   string
  zip:     string
  country: string
}

interface CreateOrderRequest {
  items:           OrderItem[]   // min: 1 item
  shippingAddress: ShippingAddress
  couponCode?:     string
}

// ─── Response — 201 Created
interface CreatedOrder {
  id:                string
  status:            'pending' | 'confirmed' | 'processing'
  items:             OrderItem[]
  shippingAddress:   ShippingAddress
  subtotal:          number
  discount:          number
  total:             number
  estimatedDelivery: string       // ISO 8601 date
  createdAt:         string       // ISO 8601 datetime
}

// ─── Response envelope
interface CreateOrderResponse {
  data: CreatedOrder
}

// ─── Error (shared across all endpoints)
interface ApiErrorDetail { field: string; message: string }
interface ApiError        { code: string; message: string; details: ApiErrorDetail[] }
interface ApiErrorResponse { error: ApiError }

// ─── Status code map
// 201 → CreateOrderResponse
// 400 → ApiErrorResponse  (code: 'INVALID_INPUT')
// 409 → ApiErrorResponse  (code: 'COUPON_ALREADY_USED')
// 422 → ApiErrorResponse  (code: 'VALIDATION_ERROR', details: [...])

// ─── Typed Axios call
async function createOrder(payload: CreateOrderRequest) {
  const { data } = await api.post<CreateOrderResponse>('/orders', payload)
  return data.data  // CreatedOrder
}
```

---

---

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

# 4 — Auth & Token-Refresh Concepts

---

## T — TL;DR

In production, access tokens expire. The frontend must **silently refresh** them without logging out the user. The full pattern: short-lived access token + long-lived refresh token + a queue to handle simultaneous 401s without multiple refresh calls.

---

## K — Key Concepts

### The Token Lifecycle

```
1. User logs in
   POST /auth/login { email, password }
   ← { accessToken: "eyJ..." (15min TTL), refreshToken: "abc..." (7 day TTL) }

2. Every API request
   Authorization: Bearer eyJ...

3. Access token expires (after 15 min)
   API returns 401

4. Frontend detects 401
   POST /auth/refresh { refreshToken: "abc..." }
   ← { accessToken: "eyJ...NEW", refreshToken?: "abc...NEW" }
   (Some servers rotate refresh tokens too)

5. Retry original request with new access token

6. Refresh token expires (after 7 days)
   /auth/refresh returns 401
   → Force logout → redirect to /login
```

### The Token Storage Decision

```js
// Option A: localStorage — easiest, XSS vulnerable
localStorage.setItem('access_token', token)
localStorage.setItem('refresh_token', refreshToken)

// Option B: in-memory (most secure for access token)
let inMemoryToken = null
// Cons: lost on page refresh → pair with refresh token in HttpOnly cookie

// Option C: HttpOnly cookies (most secure overall)
// Set by server: Set-Cookie: refresh_token=...; HttpOnly; Secure; SameSite=Strict
// JS cannot read or steal it
// Access token still in memory or localStorage

// Practical recommendation for SPAs:
// - Access token: in-memory variable (lost on refresh, fast re-auth from refresh token)
// - Refresh token: HttpOnly cookie (server sets/reads, never in JS)
```

### The Silent Refresh Interceptor

```js
// src/lib/tokenRefresh.js
import axios from 'axios'

let isRefreshing    = false
let failedQueue     = []         // requests waiting for refresh to complete

function processQueue(error, newToken = null) {
  failedQueue.forEach(({ resolve, reject }) => {
    error ? reject(error) : resolve(newToken)
  })
  failedQueue = []
}

export function attachRefreshInterceptor(apiInstance) {
  apiInstance.interceptors.response.use(
    (response) => response,

    async (error) => {
      const originalRequest = error.config

      // Only handle 401 — not for refresh endpoint itself
      const is401       = error.response?.status === 401
      const isRetry     = originalRequest._retry === true
      const isRefreshUrl = originalRequest.url?.includes('/auth/refresh')

      if (!is401 || isRetry || isRefreshUrl) {
        return Promise.reject(error)
      }

      // ─── Another refresh is in progress → queue this request
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject })
        }).then((newToken) => {
          originalRequest.headers.Authorization = `Bearer ${newToken}`
          return apiInstance(originalRequest)
        }).catch(err => Promise.reject(err))
      }

      // ─── Start refresh
      originalRequest._retry = true
      isRefreshing           = true

      try {
        const refreshToken = localStorage.getItem('refresh_token')
        if (!refreshToken) throw new Error('No refresh token')

        // Use plain axios (not apiInstance) to avoid interceptor loop
        const { data } = await axios.post('/auth/refresh', { refreshToken })
        const { accessToken, refreshToken: newRefresh } = data

        // Store new tokens
        localStorage.setItem('access_token', accessToken)
        if (newRefresh) localStorage.setItem('refresh_token', newRefresh)

        // Update default header for future requests
        apiInstance.defaults.headers.common['Authorization'] = `Bearer ${accessToken}`

        // Process all queued requests with new token
        processQueue(null, accessToken)

        // Retry original request
        originalRequest.headers.Authorization = `Bearer ${accessToken}`
        return apiInstance(originalRequest)

      } catch (refreshError) {
        // Refresh failed — force logout
        processQueue(refreshError)
        localStorage.removeItem('access_token')
        localStorage.removeItem('refresh_token')
        window.location.href = `/login?redirect=${encodeURIComponent(window.location.pathname)}`
        return Promise.reject(refreshError)

      } finally {
        isRefreshing = false
      }
    }
  )
}
```

### Token Expiry — Proactive vs Reactive Refresh

```js
// ─── Reactive (what we built above): wait for 401 → refresh
// Simple but causes a failed request + retry latency

// ─── Proactive: check expiry before each request, refresh if close
function getTokenExpiry(token) {
  try {
    const payload = JSON.parse(atob(token.split('.')[1]))
    return payload.exp * 1000  // convert to milliseconds
  } catch {
    return 0
  }
}

// Request interceptor — proactive refresh
api.interceptors.request.use(async (config) => {
  const token  = localStorage.getItem('access_token')
  const expiry = getTokenExpiry(token)
  const now    = Date.now()
  const BUFFER = 60_000  // refresh 1 minute before expiry

  if (token && expiry - now < BUFFER) {
    // Proactively refresh before the request
    const { data } = await axios.post('/auth/refresh', {
      refreshToken: localStorage.getItem('refresh_token')
    })
    localStorage.setItem('access_token', data.accessToken)
    config.headers.Authorization = `Bearer ${data.accessToken}`
  } else if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }

  return config
})
```

---

## W — Why It Matters

- A 15-minute access token without silent refresh means users are logged out every 15 minutes — unacceptable UX.
- The `failedQueue` pattern prevents a cascade of multiple refresh calls when several requests 401 simultaneously (e.g., a dashboard loading 5 parallel requests).
- The `_retry` flag on the original request object is the guard that prevents infinite retry loops — a 401 on the retry attempt should not retry again.
- Proactive vs reactive refresh is a real architectural decision — proactive avoids the failed-request-then-retry latency at the cost of slightly more complexity.

---

## I — Interview Q&A

### Q1: How do you handle token refresh when multiple concurrent requests return 401?

**A:** Use a queue. The first 401 starts the refresh and sets `isRefreshing = true`. All subsequent 401s are pushed into `failedQueue` as promise callbacks. When the refresh completes, `processQueue` resolves all queued promises with the new token, and each queued request retries with it.

### Q2: Why should you use plain `axios.post()` instead of your configured instance for the refresh call?

**A:** The configured instance has a response interceptor that handles 401 by refreshing. If the refresh endpoint itself returns a 401, using the configured instance would trigger another refresh — creating an infinite loop. Plain `axios.post` bypasses all custom interceptors.

### Q3: What's the difference between proactive and reactive token refresh?

**A:** Reactive waits for a 401 response, then refreshes and retries — adds one round-trip latency per expiry event. Proactive reads the JWT `exp` claim before each request and refreshes if the token expires within a buffer window — no failed requests but slightly more complex. Proactive is better UX for high-frequency API calls; reactive is simpler to implement.

---

## C — Common Pitfalls + Fix

### ❌ Pitfall: Not using `_retry` flag — infinite 401 loop

```js
apiInstance.interceptors.response.use(null, async (error) => {
  if (error.response?.status === 401) {
    await refreshToken()
    return apiInstance(error.config)  // retry
    // If retry also gets 401 → interceptor fires again → infinite loop
  }
})
```

**Fix:**

```js
if (error.response?.status === 401 && !error.config._retry) {
  error.config._retry = true  // ← mark as already retried
  // ... refresh and retry
}
```

### ❌ Pitfall: Sending refresh token as a query param

```
GET /auth/refresh?refresh_token=abc123
← Token visible in server logs, browser history, proxy logs
```

**Fix:** Always send tokens in the request body (POST) or as an HttpOnly cookie. Never in URLs.

### ❌ Pitfall: Not preserving the redirect URL on forced logout

```js
window.location.href = '/login'  // User loses their current page context
```

**Fix:**

```js
const redirect = encodeURIComponent(window.location.pathname + window.location.search)
window.location.href = `/login?redirect=${redirect}`
// After login: router.push(searchParams.get('redirect') ?? '/dashboard')
```

---

## K — Coding Challenge + Solution

### Challenge

Write a self-contained `createApiWithRefresh(baseURL)` factory that:
1. Creates an Axios instance
2. Attaches a request interceptor that injects the Bearer token from `localStorage`
3. Attaches a response interceptor with the full queue-based token refresh
4. Returns the configured instance

### Solution

```js
import axios from 'axios'

export function createApiWithRefresh(baseURL) {
  const instance = axios.create({ baseURL, timeout: 10000 })

  let isRefreshing = false
  let queue        = []

  function processQueue(err, token = null) {
    queue.forEach(({ resolve, reject }) => err ? reject(err) : resolve(token))
    queue = []
  }

  // ─── Request interceptor: inject token
  instance.interceptors.request.use((config) => {
    const token = localStorage.getItem('access_token')
    if (token) config.headers.Authorization = `Bearer ${token}`
    return config
  }, Promise.reject)

  // ─── Response interceptor: handle 401 + refresh
  instance.interceptors.response.use(
    (res) => res,
    async (error) => {
      const orig = error.config
      const is401         = error.response?.status === 401
      const alreadyRetried = orig._retry === true
      const isRefreshUrl   = orig.url?.includes('/auth/refresh')

      if (!is401 || alreadyRetried || isRefreshUrl) {
        return Promise.reject(error)
      }

      if (isRefreshing) {
        return new Promise((resolve, reject) => queue.push({ resolve, reject }))
          .then(token => {
            orig.headers.Authorization = `Bearer ${token}`
            return instance(orig)
          })
      }

      orig._retry   = true
      isRefreshing  = true

      try {
        const rt = localStorage.getItem('refresh_token')
        if (!rt) throw new Error('No refresh token available')

        const { data } = await axios.post(`${baseURL}/auth/refresh`, { refreshToken: rt })
        const { accessToken, refreshToken: newRt } = data

        localStorage.setItem('access_token', accessToken)
        if (newRt) localStorage.setItem('refresh_token', newRt)
        instance.defaults.headers.common['Authorization'] = `Bearer ${accessToken}`

        processQueue(null, accessToken)
        orig.headers.Authorization = `Bearer ${accessToken}`
        return instance(orig)
      } catch (err) {
        processQueue(err)
        localStorage.clear()
        window.location.href = '/login'
        return Promise.reject(err)
      } finally {
        isRefreshing = false
      }
    }
  )

  return instance
}

// Usage
const api = createApiWithRefresh(import.meta.env.VITE_API_URL)
export default api
```

---

---

# 5 — Resilient Loading & Error UX

---

## T — TL;DR

A resilient UI never leaves users staring at a blank screen. Every API call has three states — **loading, success, error** — and the UI must handle all three explicitly. Add retry, skeleton screens, and graceful degradation to graduate from "it works" to "it feels good."

---

## K — Key Concepts

### The Three Required States — Always

```
❌ Only handling success:
const { data } = await api.get('/products')
setProducts(data)
// What about loading? What about errors?

✅ All three states covered:
setLoading(true)
try {
  const { data } = await api.get('/products')
  setProducts(data)
  setError(null)
} catch (err) {
  setError(getErrorMessage(err))
} finally {
  setLoading(false)
}
```

### Loading UX Hierarchy

```
Rank 1: Skeleton screens      ← best UX — users see layout before data
Rank 2: Spinner overlay       ← good for update operations (not initial load)
Rank 3: Inline spinner        ← acceptable for small components
Rank 4: "Loading..." text     ← minimum acceptable

Worst:  Blank screen / nothing ← never acceptable
```

```jsx
// Skeleton screen pattern
function ProductCard({ product, loading }) {
  if (loading) {
    return (
      <div className="card skeleton">
        <div className="skeleton-img" />
        <div className="skeleton-line w-3/4" />
        <div className="skeleton-line w-1/2" />
      </div>
    )
  }
  return <div className="card">...</div>
}

// Render skeletons during load
{loading
  ? Array.from({ length: 6 }, (_, i) => <ProductCard key={i} loading />)
  : products.map(p => <ProductCard key={p.id} product={p} />)
}
```

### Error UX Hierarchy — Match Error to Context

```
Global errors (401, 503):     toast / banner — appears without disrupting layout
Page-level errors (500, 404): full error state replaces content
Field-level errors (422):     inline below each form field
Network errors:               retry prompt with explanation
Timeout errors:               "Taking longer than expected" + retry
```

```jsx
function ErrorState({ error, onRetry }) {
  const isNetwork  = error.code === 'NETWORK_ERROR'
  const isTimeout  = error.code === 'TIMEOUT'
  const isNotFound = error.status === 404
  const isServer   = error.status >= 500

  const message = isNetwork  ? 'No internet connection.'
    : isTimeout              ? 'The server is taking too long.'
    : isNotFound             ? 'This page does not exist.'
    : isServer               ? 'Server error. Try again later.'
    : error.message

  return (
    <div role="alert" className="error-state">
      <p>{message}</p>
      {(isNetwork || isTimeout || isServer) && (
        <button onClick={onRetry}>Try Again</button>
      )}
    </div>
  )
}
```

### Retry Logic — Manual and Automatic

```js
// Manual retry — user clicks "Try Again"
const [retryKey, setRetryKey] = useState(0)
useEffect(() => {
  fetchData()
}, [retryKey])

<button onClick={() => setRetryKey(k => k + 1)}>Try Again</button>

// Automatic retry with exponential backoff (for transient server errors)
async function fetchWithRetry(requestFn, maxAttempts = 3) {
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await requestFn()
    } catch (err) {
      const isRetryable = !err.response || err.response.status >= 500
      if (!isRetryable || attempt === maxAttempts) throw err

      const delay = Math.min(1000 * 2 ** attempt, 8000)  // 2s, 4s, 8s
      await new Promise(r => setTimeout(r, delay))
    }
  }
}
```

### Stale-While-Revalidate UX Pattern

```js
// Show stale data immediately, fetch fresh data in background
const [data, setData]         = useState(null)
const [isStale, setIsStale]   = useState(false)
const [loading, setLoading]   = useState(false)

async function loadWithSWR() {
  // 1. Show cached data immediately (if any)
  const cached = sessionStorage.getItem('products-cache')
  if (cached) {
    setData(JSON.parse(cached))
    setIsStale(true)   // show "updating..." indicator
  } else {
    setLoading(true)
  }

  // 2. Fetch fresh data in background
  try {
    const fresh = await productService.list()
    setData(fresh)
    setIsStale(false)
    sessionStorage.setItem('products-cache', JSON.stringify(fresh))
  } catch (err) {
    if (!cached) setError(err.message)  // only show error if no cache to fall back to
  } finally {
    setLoading(false)
  }
}
```

### Optimistic Updates

```js
// Update UI immediately, roll back on failure
async function toggleLike(postId, currentlyLiked) {
  // 1. Optimistically update UI
  setPosts(prev => prev.map(p =>
    p.id === postId
      ? { ...p, liked: !currentlyLiked, likeCount: p.likeCount + (currentlyLiked ? -1 : 1) }
      : p
  ))

  // 2. Send to server
  try {
    await postService[currentlyLiked ? 'unlike' : 'like'](postId)
  } catch (err) {
    // 3. Rollback on failure
    setPosts(prev => prev.map(p =>
      p.id === postId
        ? { ...p, liked: currentlyLiked, likeCount: p.likeCount + (currentlyLiked ? 1 : -1) }
        : p
    ))
    showToast('Failed to update. Please try again.')
  }
}
```

---

## W — Why It Matters

- Blank screens on load are the #1 user complaint about slow apps — skeleton screens make the same wait feel shorter.
- Error states without a retry button are dead ends — users hit "back" and never return. A retry button keeps them engaged.
- Optimistic updates make write-heavy UIs (likes, saves, toggles) feel instant — the difference between "feels native" and "feels like a website."
- The stale-while-revalidate pattern is the foundation of React Query, SWR, and TanStack Query — understanding it explains why those libraries exist.

---

## I — Interview Q&A

### Q1: What are the three states every API call must handle?

**A:** Loading (request in flight), success (data received), and error (request failed). The UI must explicitly handle all three — loading with a skeleton or spinner, success with the data rendered, and error with a meaningful message and ideally a retry action.

### Q2: What is an optimistic update and when would you use it?

**A:** An optimistic update immediately updates the UI as if the server request succeeded, then rolls back if it fails. Use it for low-stakes, high-frequency interactions where latency would be noticeable — likes, saves, toggles, reorders. Don't use it for critical operations like payments or deletions where a failure must be confirmed before the UI changes.

### Q3: What is the stale-while-revalidate pattern?

**A:** Show cached (stale) data immediately so the user sees content right away, then fetch fresh data in the background and update when it arrives. It combines instant perceived performance with eventual consistency. React Query and SWR implement this by default — the query returns cached data immediately and revalidates in the background.

---

## C — Common Pitfalls + Fix

### ❌ Pitfall: Setting loading = false in `try` before the `finally`

```js
try {
  const data = await api.get('/products')
  setProducts(data)
  setLoading(false)     // ← only runs on success
} catch (err) {
  setError(err.message)
  // loading never set to false on error → spinner spins forever
}
```

**Fix:**

```js
try {
  const data = await api.get('/products')
  setProducts(data)
} catch (err) {
  setError(err.message)
} finally {
  setLoading(false)   // ✅ always runs
}
```

### ❌ Pitfall: No visual difference between first load and refresh

```js
// Both show full-page spinner — disorienting on refresh
setLoading(true)
setProducts([])   // ← clears existing data → blank screen during refresh
```

**Fix:** Keep existing data visible while refreshing:

```js
setRefreshing(true)  // ← separate state for background refresh
// products stay visible, small "updating" indicator shows
```

### ❌ Pitfall: Showing raw Axios error messages to users

```js
catch (err) {
  setError(err.message)
  // "Request failed with status code 500" — technical, not helpful
}
```

**Fix:**

```js
catch (err) {
  const message = err.normalized?.message
    ?? (err.response?.status >= 500 ? 'Server error. Please try again.' : 'Something went wrong.')
  setError(message)
}
```

---

## K — Coding Challenge + Solution

### Challenge

Write a `useAsyncData(fetchFn, deps)` hook that:
1. Manages `data`, `loading`, `error` state
2. Supports `retry()` function
3. Supports `refresh()` (re-fetches keeping existing data visible)
4. Cancels in-flight request on unmount

### Solution

```js
import { useState, useEffect, useCallback, useRef } from 'react'
import axios from 'axios'

function useAsyncData(fetchFn, deps = []) {
  const [data,       setData]       = useState(null)
  const [loading,    setLoading]    = useState(true)
  const [error,      setError]      = useState(null)
  const [refreshing, setRefreshing] = useState(false)
  const [retryKey,   setRetryKey]   = useState(0)
  const controllerRef = useRef(null)

  useEffect(() => {
    controllerRef.current?.abort()
    controllerRef.current = new AbortController()
    const signal = controllerRef.current.signal

    const isFirstLoad = data === null

    if (isFirstLoad) setLoading(true)
    else             setRefreshing(true)

    setError(null)

    fetchFn(signal)
      .then((result) => {
        if (!signal.aborted) {
          setData(result)
        }
      })
      .catch((err) => {
        if (!signal.aborted && !axios.isCancel(err)) {
          setError(err.normalized?.message ?? err.message ?? 'Error loading data')
        }
      })
      .finally(() => {
        if (!signal.aborted) {
          setLoading(false)
          setRefreshing(false)
        }
      })

    return () => controllerRef.current?.abort()
  }, [...deps, retryKey])  // eslint-disable-line

  const retry   = useCallback(() => setRetryKey(k => k + 1), [])
  const refresh = useCallback(() => setRetryKey(k => k + 1), [])

  return { data, loading, error, refreshing, retry, refresh }
}

export default useAsyncData

// Usage
function ProductList() {
  const { data, loading, error, refreshing, retry } = useAsyncData(
    (signal) => productService.list({ page: 1 }, signal),
    []
  )

  if (loading) return <SkeletonGrid />
  if (error)   return <ErrorState error={{ message: error }} onRetry={retry} />
  return (
    <div>
      {refreshing && <p className="text-sm text-gray-400">Updating...</p>}
      <ProductGrid products={data?.products ?? []} />
    </div>
  )
}
```

---

---

# 6 — Debugging Network Issues

---

## T — TL;DR

95% of API bugs are one of five things: wrong URL, wrong method, missing/wrong header, wrong body shape, or CORS. Know the tools and the checklist. Debugging network issues is a skill, not luck.

---

## K — Key Concepts

### The Debugging Checklist

```
When an API call fails, check in this order:

1. Did the request actually fire?
   → Network tab: is the request there?
   → If no: check your code path — maybe it's not called

2. What URL was called?
   → Network tab → request URL
   → Common: missing baseURL, wrong variable interpolation

3. What status code came back?
   → 401 → auth header missing/expired
   → 403 → wrong permissions
   → 404 → URL is wrong
   → 422 → request body failed validation
   → 500 → server error — check server logs
   → CORS preflight failed → check Network tab for OPTIONS request

4. What did the request look like?
   → Network tab → Headers tab → Request Headers
   → Is Authorization present and correct?
   → Is Content-Type correct?

5. What did the request body look like?
   → Network tab → Payload tab
   → Is the JSON shape correct? Missing required fields?

6. What did the response look like?
   → Network tab → Response tab
   → What error message did the server return?
```

### Browser DevTools — Network Tab Workflow

```
Open DevTools → Network tab → filter by "Fetch/XHR"

For each request:
  ├── Headers tab:
  │     Request URL      ← verify URL + query params
  │     Request Method   ← GET/POST/etc.
  │     Status Code      ← 200/401/500
  │     Request Headers  ← Authorization, Content-Type
  │     Response Headers ← Content-Type, X-Total-Count, etc.
  │
  ├── Payload tab:
  │     Form Data / Request Body  ← what was sent
  │
  └── Response tab:
        Response body    ← what came back (JSON error message)
```

### Axios Request Logging Interceptor (Dev Only)

```js
// Add to api.js — DEV only
if (import.meta.env.DEV) {
  api.interceptors.request.use((config) => {
    console.group(`📤 ${config.method?.toUpperCase()} ${config.baseURL}${config.url}`)
    console.log('Params:',  config.params)
    console.log('Headers:', config.headers)
    if (config.data) console.log('Body:', config.data)
    console.groupEnd()
    return config
  })

  api.interceptors.response.use(
    (res) => {
      const ms = Date.now() - (res.config.metadata?.startTime ?? 0)
      console.group(`✅ ${res.status} ${res.config.method?.toUpperCase()} ${res.config.url} (${ms}ms)`)
      console.log('Data:', res.data)
      console.groupEnd()
      return res
    },
    (err) => {
      const ms = Date.now() - (err.config?.metadata?.startTime ?? 0)
      console.group(`❌ ${err.response?.status ?? 'NET'} ${err.config?.method?.toUpperCase()} ${err.config?.url} (${ms}ms)`)
      console.log('Error:', err.response?.data ?? err.message)
      console.groupEnd()
      return Promise.reject(err)
    }
  )
}
```

### CORS — The Most Misunderstood Error

```
The CORS flow:

Browser            Frontend Server    API Server
   │                                      │
   │── OPTIONS /api/products ────────────▶│  (preflight)
   │◀── Allow-Origin: * ─────────────────│
   │── GET /api/products ───────────────▶│
   │◀── 200 OK ──────────────────────────│

CORS errors are ALWAYS a server-side configuration problem.
The frontend cannot fix CORS — only the backend can.

What to tell the backend:
  "Please add Access-Control-Allow-Origin: https://myapp.com
   and Access-Control-Allow-Headers: Authorization, Content-Type"

Frontend workaround (dev only): proxy in vite.config.js / next.config.js
```

```js
// vite.config.js — proxy for local dev (avoid CORS in dev)
export default {
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, '')
      }
    }
  }
}
```

### Common Errors and Their Causes

```
"Network Error" (no status code):
  → CORS preflight failed
  → Server is down / not reachable
  → SSL certificate error

401 Unauthorized:
  → Missing Authorization header
  → Expired access token
  → Wrong token (dev token used in prod)

403 Forbidden:
  → Correct token, wrong permissions
  → IP allowlist issue

404 Not Found:
  → Wrong URL (typo, wrong version, wrong ID)
  → Resource doesn't exist (expected — handle gracefully)

422 Unprocessable:
  → Request body missing required fields
  → Wrong field types
  → Business rule violation

500 Internal Server Error:
  → Bug on the server — check server logs, not frontend
```

### Quick Debug Utilities

```js
// Print the exact URL Axios would call (without firing)
function previewUrl(endpoint, params) {
  const qs = queryString.stringify(params, { skipNull: true })
  return `${api.defaults.baseURL}${endpoint}${qs ? '?' + qs : ''}`
}
console.log(previewUrl('/products', { brand: ['nike'], page: 2 }))

// Test a request manually from the browser console
window._testApi = async (method, url, data) => {
  try {
    const res = await api({ method, url, data })
    console.log('✅', res.status, res.data)
  } catch (err) {
    console.error('❌', err.response?.status, err.response?.data)
  }
}
// In console: _testApi('GET', '/products?page=1')
```

---

## W — Why It Matters

- Knowing the debugging checklist reduces "why is this not working" from hours to minutes — systematic elimination beats guessing every time.
- CORS errors look like network errors but have nothing to do with your frontend code — recognizing them immediately saves time.
- Dev-only request/response logging in interceptors gives you a full audit trail without opening DevTools for every call.
- The `previewUrl` utility catches URL-construction bugs (wrong baseURL, incorrect params) before a request even fires.

---

## I — Interview Q&A

### Q1: You see a "Network Error" in Axios with no status code. What are the possible causes?

**A:** Three main causes: CORS preflight failure (browser blocks the request before it completes), the server is unreachable (down, wrong URL, no network), or an SSL/TLS certificate error. Check the browser console for the full error message and the Network tab for a failed OPTIONS preflight request.

### Q2: A request returns 422. Where do you look for details?

**A:** The response body — `error.response.data`. The 422 body should contain field-level validation errors (per the contract). Access them via `error.response.data.error.details` (or whatever shape your API returns). Map these to form field error states.

### Q3: How do you fix a CORS error in development without waiting for the backend team?

**A:** Use a dev server proxy. In Vite, configure `server.proxy` in `vite.config.js` to forward `/api/*` requests to the backend server. The proxy runs on the same origin as the frontend, so no CORS check is triggered. This only works in development — production CORS must be configured on the backend.

---

## C — Common Pitfalls + Fix

### ❌ Pitfall: Logging the full Axios error object

```js
catch (err) {
  console.log(err)  // Huge nested object, circular references, hard to read
}
```

**Fix:** Log the structured parts:

```js
catch (err) {
  console.error({
    status:  err.response?.status,
    message: err.response?.data?.error?.message ?? err.message,
    url:     err.config?.url,
    data:    err.response?.data
  })
}
```

### ❌ Pitfall: Trying to fix CORS on the frontend

```js
// Adding headers to "fix" CORS — doesn't work
axios.get('/api/data', {
  headers: {
    'Access-Control-Allow-Origin': '*'  // ← frontend cannot set response headers!
  }
})
// CORS is a RESPONSE header set by the SERVER, not a request header you send
```

**Fix:** CORS is a server configuration issue. Ask the backend to add the correct headers.

### ❌ Pitfall: Not checking the Payload tab when debugging 422 errors

```js
// Body looks correct in code but 422 comes back
api.post('/orders', formData)
// Developer keeps looking at the frontend code
// Missing: formData has a null required field that was skipped by skipNull
```

**Fix:** Always check Network → Payload tab to see the ACTUAL body sent, not what you think was sent.

---

## K — Coding Challenge + Solution

### Challenge

Write a `createDebugInterceptors(apiInstance, options)` function that attaches dev-only request and response interceptors with:
1. Request: log method + URL + params + body
2. Response success: log status + URL + duration + response data (truncated to 200 chars)
3. Response error: log status + URL + duration + error message
4. `options.enabled` flag to turn logging on/off

### Solution

```js
export function createDebugInterceptors(instance, { enabled = true } = {}) {
  if (!enabled) return { ejectRequest: () => {}, ejectResponse: () => {} }

  const reqId = instance.interceptors.request.use((config) => {
    config.metadata = { startTime: Date.now() }
    const url    = (config.baseURL ?? '') + (config.url ?? '')
    const method = config.method?.toUpperCase()

    console.group(`📤 ${method} ${url}`)
    if (config.params && Object.keys(config.params).length)
      console.log('Params:', config.params)
    if (config.data)
      console.log('Body:', config.data)
    console.groupEnd()

    return config
  })

  const resId = instance.interceptors.response.use(
    (response) => {
      const ms      = Date.now() - (response.config.metadata?.startTime ?? 0)
      const method  = response.config.method?.toUpperCase()
      const url     = response.config.url ?? ''
      const preview = JSON.stringify(response.data).slice(0, 200)

      console.group(`✅ ${response.status} ${method} ${url} (${ms}ms)`)
      console.log('Data:', preview + (preview.length >= 200 ? '...' : ''))
      console.groupEnd()
      return response
    },
    (error) => {
      const ms     = Date.now() - (error.config?.metadata?.startTime ?? 0)
      const method = error.config?.method?.toUpperCase()
      const url    = error.config?.url ?? ''
      const msg    = error.response?.data?.error?.message ?? error.message

      console.group(`❌ ${error.response?.status ?? 'NET'} ${method} ${url} (${ms}ms)`)
      console.log('Error:', msg)
      if (error.response?.data) console.log('Body:', error.response.data)
      console.groupEnd()
      return Promise.reject(error)
    }
  )

  return {
    ejectRequest:  () => instance.interceptors.request.eject(reqId),
    ejectResponse: () => instance.interceptors.response.eject(resId)
  }
}

// Usage
createDebugInterceptors(api, { enabled: import.meta.env.DEV })
```

---

---

# 7 — Mocking & Testing API Calls

---

## T — TL;DR

Never test against a real API in unit/integration tests. Mock the HTTP layer instead — your tests run fast, offline, and predictably. The three tools: **MSW** (Mock Service Worker) for full request interception, **`vi.mock`/`jest.mock`** for module mocking, and **`axios-mock-adapter`** for Axios-specific mocking.

---

## K — Key Concepts

### Tool Selection Guide

```
MSW (Mock Service Worker):
  → Best for: integration tests, Storybook, dev server mocking
  → Intercepts at the network level — your real Axios code runs unchanged
  → Works in browser AND Node.js (v1+)
  → Most realistic testing approach

axios-mock-adapter:
  → Best for: unit tests of service files
  → Mocks Axios directly without a service worker
  → Simple setup, good for isolated service tests

vi.mock / jest.mock:
  → Best for: mocking entire service modules in component tests
  → Replace the whole module with fakes
  → Fast, simple, but less realistic
```

### MSW — The Gold Standard

```js
// src/mocks/handlers.js
import { http, HttpResponse } from 'msw'

export const handlers = [
  // GET /products
  http.get('/products', ({ request }) => {
    const url     = new URL(request.url)
    const page    = parseInt(url.searchParams.get('page') ?? '1')
    const limit   = parseInt(url.searchParams.get('limit') ?? '20')
    const category = url.searchParams.get('category')

    const allProducts = generateFakeProducts(50)  // your fake data
    const filtered    = category
      ? allProducts.filter(p => p.category === category)
      : allProducts
    const paginated   = filtered.slice((page - 1) * limit, page * limit)

    return HttpResponse.json({
      data: paginated,
      meta: {
        total:      filtered.length,
        page,
        limit,
        totalPages: Math.ceil(filtered.length / limit)
      }
    })
  }),

  // POST /products
  http.post('/products', async ({ request }) => {
    const body = await request.json()
    return HttpResponse.json(
      { data: { id: 'new-id-123', ...body, createdAt: new Date().toISOString() } },
      { status: 201 }
    )
  }),

  // Simulate a 500 error
  http.get('/products/error', () => {
    return HttpResponse.json(
      { error: { code: 'SERVER_ERROR', message: 'Internal server error' } },
      { status: 500 }
    )
  }),

  // Simulate network failure
  http.get('/products/offline', () => {
    return HttpResponse.networkError()
  })
]
```

```js
// src/mocks/server.js — for Node.js (Vitest / Jest)
import { setupServer } from 'msw/node'
import { handlers }    from './handlers'

export const server = setupServer(...handlers)

// src/mocks/browser.js — for browser (dev server)
import { setupWorker } from 'msw/browser'
import { handlers }    from './handlers'

export const worker = setupWorker(...handlers)
```

```js
// vitest.setup.js
import { server } from './src/mocks/server'

beforeAll(() => server.listen({ onUnhandledRequest: 'warn' }))
afterEach(() => server.resetHandlers())  // reset per-test overrides
afterAll(() => server.close())
```

### Testing with MSW

```js
// src/services/productService.test.js
import { describe, it, expect } from 'vitest'
import { server } from '../mocks/server'
import { http, HttpResponse } from 'msw'
import productService from './productService'

describe('productService', () => {
  it('lists products with pagination', async () => {
    const { data, error } = await productService.list({ page: 1, limit: 5 })

    expect(error).toBeNull()
    expect(data.data).toHaveLength(5)
    expect(data.meta.page).toBe(1)
    expect(data.meta.total).toBeGreaterThan(0)
  })

  it('handles 500 errors correctly', async () => {
    // Override handler for this test only
    server.use(
      http.get('/products', () =>
        HttpResponse.json(
          { error: { code: 'SERVER_ERROR', message: 'Database down' } },
          { status: 500 }
        )
      )
    )

    const { data, error } = await productService.list({})
    expect(data).toBeNull()
    expect(error.status).toBe(500)
    expect(error.message).toBe('Database down')
  })

  it('handles network errors', async () => {
    server.use(
      http.get('/products', () => HttpResponse.networkError())
    )

    const { data, error } = await productService.list({})
    expect(data).toBeNull()
    expect(error.code).toBe('NETWORK_ERROR')
  })
})
```

### `axios-mock-adapter` — Simpler Unit Testing

```js
import axios from 'axios'
import MockAdapter from 'axios-mock-adapter'
import productService from './productService'
import api from '../lib/api'

describe('productService with axios-mock-adapter', () => {
  const mock = new MockAdapter(api)

  afterEach(() => mock.reset())

  it('creates a product', async () => {
    const newProduct = { name: 'Air Max', price: 150 }
    const created    = { id: '123', ...newProduct }

    mock.onPost('/products').reply(201, { data: created })

    const { data, error } = await productService.create(newProduct)

    expect(error).toBeNull()
    expect(data.data.id).toBe('123')
    expect(mock.history.post[0].data).toBe(JSON.stringify(newProduct))
  })

  it('handles 401', async () => {
    mock.onGet('/products').reply(401, {
      error: { code: 'UNAUTHORIZED', message: 'Token expired' }
    })

    const { data, error } = await productService.list({})
    expect(data).toBeNull()
    expect(error.status).toBe(401)
  })
})
```

### Component Testing with Mocked Services

```js
// ProductList.test.jsx
import { render, screen, waitFor } from '@testing-library/react'
import { vi } from 'vitest'
import ProductList from './ProductList'
import productService from '../services/productService'

// Mock the entire service module
vi.mock('../services/productService')

describe('ProductList', () => {
  it('shows products on successful load', async () => {
    productService.list.mockResolvedValue({
      data: {
        data: [{ id: '1', name: 'Air Max', price: 150 }],
        meta: { total: 1, page: 1, limit: 20, totalPages: 1 }
      },
      error: null
    })

    render(<ProductList />)

    expect(screen.getByTestId('skeleton')).toBeInTheDocument()
    await waitFor(() => {
      expect(screen.getByText('Air Max')).toBeInTheDocument()
    })
  })

  it('shows error state on failure', async () => {
    productService.list.mockResolvedValue({
      data: null,
      error: { message: 'Server error', status: 500 }
    })

    render(<ProductList />)
    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent('Server error')
    })
  })
})
```

---

## W — Why It Matters

- Tests against real APIs are slow, flaky, and environment-dependent — they break when the API is down or data changes.
- MSW is the industry-preferred tool because it intercepts at the network level — your actual Axios code, interceptors, and service functions all run. If your interceptor has a bug, MSW tests catch it.
- Per-test handler overrides (`server.use(...)`) in `afterEach` cleanup let you test error scenarios without polluting other tests.
- Testing error states (500, network error, timeout) is only practical with mocking — you can't reliably trigger these in a real API.

---

## I — Interview Q&A

### Q1: What's the difference between MSW and `axios-mock-adapter`?

**A:** MSW intercepts at the network level using a Service Worker — your entire API stack (Axios instance, interceptors, service functions) runs normally. `axios-mock-adapter` mocks Axios directly — faster setup but bypasses any interceptor logic. Use MSW for integration tests (testing the whole stack) and `axios-mock-adapter` or `vi.mock` for quick unit tests of isolated functions.

### Q2: Why should you call `server.resetHandlers()` in `afterEach`?

**A:** `server.use()` adds per-test handler overrides. Without `resetHandlers()`, an override from one test (e.g., a 500 error) bleeds into the next test. `resetHandlers()` removes all per-test overrides and restores the base handlers, ensuring each test starts with a clean state.

### Q3: How do you test a component's loading state?

**A:** Make the mock's resolved promise take time — either by delaying the mock response or by checking the DOM before `await waitFor()`. Render the component, immediately check for the skeleton/spinner (synchronously present before the async data resolves), then await the loaded state.

---

## C — Common Pitfalls + Fix

### ❌ Pitfall: Not resetting mock handlers between tests

```js
it('test A', () => {
  server.use(http.get('/products', () => HttpResponse.json({ data: [] })))
  // Test A passes
})

it('test B', () => {
  // test B uses the override from test A — unexpected empty response
})
```

**Fix:**

```js
afterEach(() => server.resetHandlers())  // ✅ always reset
```

### ❌ Pitfall: Mocking at the wrong level for integration tests

```js
// Mocking the service in an integration test
vi.mock('../services/productService')
// ← Bypasses the actual HTTP call, Axios interceptors, and error normalization
// If your interceptor has a bug, this test won't catch it
```

**Fix:** For integration tests, use MSW to mock at the network level so your full stack runs.

### ❌ Pitfall: Forgetting to test error and loading states

```js
it('renders products', async () => {
  // Only tests the happy path
  render(<ProductList />)
  await waitFor(() => expect(screen.getByText('Nike Air')).toBeInTheDocument())
})
// Missing: loading state, error state, empty state, network failure
```

**Fix:** Write separate test cases for each state — success, loading, error, empty.

---

## K — Coding Challenge + Solution

### Challenge

Write three tests for `userService.create(userData)` using MSW:
1. Creates a user successfully — verify `data.data.id` exists and `error` is null
2. Returns a 422 with field errors — verify `error.fieldErrors.email` is set
3. Handles network failure — verify `error.code` is `'NETWORK_ERROR'`

### Solution

```js
// userService.test.js
import { describe, it, expect, beforeAll, afterEach, afterAll } from 'vitest'
import { setupServer } from 'msw/node'
import { http, HttpResponse } from 'msw'
import userService from './userService'

const server = setupServer(
  http.post('/users', async ({ request }) => {
    const body = await request.json()
    return HttpResponse.json(
      { data: { id: 'user-abc', name: body.name, email: body.email, createdAt: new Date().toISOString() } },
      { status: 201 }
    )
  })
)

beforeAll(() => server.listen())
afterEach(() => server.resetHandlers())
afterAll(() => server.close())

describe('userService.create', () => {
  it('creates a user successfully', async () => {
    const { data, error } = await userService.create({
      name: 'Mark', email: 'mark@example.com', password: 'secret'
    })

    expect(error).toBeNull()
    expect(data.data.id).toBe('user-abc')
    expect(data.data.name).toBe('Mark')
  })

  it('returns field errors on 422', async () => {
    server.use(
      http.post('/users', () =>
        HttpResponse.json(
          {
            error: {
              code: 'VALIDATION_ERROR',
              message: 'Validation failed',
              details: [
                { field: 'email', message: 'Email already taken' },
                { field: 'password', message: 'Password too short' }
              ]
            }
          },
          { status: 422 }
        )
      )
    )

    const { data, error } = await userService.create({ name: 'Mark', email: 'taken@example.com' })

    expect(data).toBeNull()
    expect(error.status).toBe(422)
    expect(error.fieldErrors.email).toBe('Email already taken')
    expect(error.fieldErrors.password).toBe('Password too short')
  })

  it('handles network failure', async () => {
    server.use(
      http.post('/users', () => HttpResponse.networkError())
    )

    const { data, error } = await userService.create({ name: 'Mark' })

    expect(data).toBeNull()
    expect(error.code).toBe('NETWORK_ERROR')
    expect(error.status).toBeNull()
  })
})
```

---

---

# 8 — Caching & Performance Basics

---

## T — TL;DR

Caching means not re-fetching data you already have. At the frontend level, three practical patterns cover 90% of cases: **in-memory cache** (per session), **HTTP cache headers** (browser-level), and **stale-while-revalidate** (show old, fetch new). Libraries like React Query handle this automatically.

---

## K — Key Concepts

### Why Caching Matters

```
Without caching:
  User navigates: Home → Products → Home → Products
  API calls: 2 (both Products fetches hit the network)

With caching (5 min TTL):
  API calls: 1 (second visit returns cached data)

On a page with 5 API calls, caching can:
  - Reduce initial load from 800ms to 200ms
  - Eliminate redundant calls on re-navigation
  - Let the app work with slow/spotty connections
```

### Pattern 1: Simple In-Memory Cache

```js
// src/lib/cache.js
const cache = new Map()

export function createCacheKey(endpoint, params) {
  const qs = queryString.stringify(params ?? {})
  return `${endpoint}${qs ? '?' + qs : ''}`
}

export async function cachedRequest(key, fetchFn, ttlMs = 5 * 60 * 1000) {
  const hit = cache.get(key)

  if (hit && Date.now() - hit.timestamp < ttlMs) {
    return hit.data  // cache HIT — return immediately
  }

  // cache MISS — fetch and store
  const data = await fetchFn()
  cache.set(key, { data, timestamp: Date.now() })
  return data
}

export function invalidateCache(key) {
  cache.delete(key)
}

export function invalidatePrefix(prefix) {
  for (const key of cache.keys()) {
    if (key.startsWith(prefix)) cache.delete(key)
  }
}
```

```js
// Usage in a service
async function getCachedProducts(params) {
  const key = createCacheKey('/products', params)
  return cachedRequest(key, () => productService.list(params))
}

// After creating a product — invalidate the list cache
async function createAndInvalidate(productData) {
  const result = await productService.create(productData)
  invalidatePrefix('/products')  // bust all product list caches
  return result
}
```

### Pattern 2: HTTP Cache Headers (Browser-Level)

```js
// Server sends these headers — browser caches automatically:
Cache-Control: max-age=300         ← browser caches for 5 min
ETag: "abc123"                     ← version fingerprint
Last-Modified: Wed, 19 May 2026 10:00:00 GMT

// On subsequent requests, browser sends:
If-None-Match: "abc123"            ← "I have this version"
// Server responds:
304 Not Modified                   ← "use your cache — nothing changed"
// Zero bytes transferred for the response body

// Frontend: nothing to implement — browser handles it automatically
// Just don't set Cache-Control: no-store or no-cache on GET endpoints
```

### Pattern 3: React Query (Recommended for Production)

```js
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import productService from '@/services/productService'
import queryString from 'query-string'

// ─── Read (with automatic caching, stale-while-revalidate, refetch)
function useProducts(filters) {
  const stableKey = queryString.stringify(filters)  // stable cache key

  return useQuery({
    queryKey:  ['products', stableKey],
    queryFn:   () => productService.list(filters).then(r => {
      if (r.error) throw r.error
      return r.data
    }),
    staleTime: 5 * 60 * 1000,   // 5 min — don't refetch if data is fresh
    gcTime:    10 * 60 * 1000,  // 10 min — keep in cache after component unmounts
    retry:     2                 // retry twice on failure
  })
}

// ─── Write (with cache invalidation)
function useCreateProduct() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (data) => productService.create(data).then(r => {
      if (r.error) throw r.error
      return r.data
    }),
    onSuccess: () => {
      // Invalidate ALL product list queries → they refetch automatically
      queryClient.invalidateQueries({ queryKey: ['products'] })
    }
  })
}

// ─── In component
function ProductsPage() {
  const filters = { sort: 'price', page: 1 }

  const { data, isLoading, error, isFetching } = useProducts(filters)
  const createProduct = useCreateProduct()

  if (isLoading) return <Skeleton />
  if (error)     return <Error message={error.message} />

  return (
    <div>
      {isFetching && <span>Updating...</span>}  {/* background refetch indicator */}
      <ProductGrid products={data?.data ?? []} />
    </div>
  )
}
```

### Cache Invalidation Rules

```
Golden rule: invalidate cache whenever data changes

On POST (create):   → invalidate list cache for that resource
On PATCH/PUT:       → invalidate specific item cache + list cache
On DELETE:          → invalidate specific item cache + list cache

Relationship invalidation:
  Creating a comment     → invalidate comments list + post (comment count changes)
  Updating user profile  → invalidate user cache + anywhere username is displayed

Never stale:
  Auth state (token, user)          → always fresh
  Shopping cart / checkout totals   → always fresh
  Stock levels / availability       → short TTL (30s) or always fresh
```

### Request Deduplication

```js
// Problem: 5 components mount at the same time, all fetch /user
// Without deduplication: 5 identical network requests fire simultaneously

// Solution: deduplicate in-flight requests
const inflightRequests = new Map()

async function deduplicatedRequest(key, fetchFn) {
  if (inflightRequests.has(key)) {
    return inflightRequests.get(key)  // return same promise
  }

  const promise = fetchFn().finally(() => inflightRequests.delete(key))
  inflightRequests.set(key, promise)
  return promise
}
// React Query does this automatically
```

---

## W — Why It Matters

- A filter page that re-fetches on every back-navigation feels slow and wastes bandwidth — caching makes it feel instant.
- Cache invalidation after mutations is the #1 caching correctness issue — users see stale data after creating/updating because the list cache wasn't busted.
- React Query / TanStack Query implements all three patterns (cache, stale-while-revalidate, deduplication, invalidation) — understanding the concepts explains why the library exists and how to use it correctly.
- HTTP cache headers are free performance — no frontend code required, just don't disable them.

---

## I — Interview Q&A

### Q1: What is `staleTime` in React Query?

**A:** The duration after data is fetched during which it's considered "fresh" — React Query won't refetch it even if the component re-mounts or the window refocuses. After `staleTime`, data is "stale" — it's still shown immediately (from cache) but a background refetch is triggered. Setting `staleTime: 5 * 60 * 1000` means "don't refetch if data is less than 5 minutes old."

### Q2: When should you invalidate a query cache after a mutation?

**A:** Immediately after any write operation that changes the data the cached query represents. Creating a product invalidates the product list. Updating a product invalidates both the specific product cache and the list. Deleting invalidates both. Use `queryClient.invalidateQueries({ queryKey: ['products'] })` in the mutation's `onSuccess` callback.

### Q3: What is request deduplication and why does React Query do it automatically?

**A:** When multiple components mount simultaneously and all trigger the same query, deduplication ensures only one network request is made — all components share the same in-flight promise and receive the same response when it resolves. Without it, a dashboard loading 10 instances of a user avatar component would make 10 identical `/user` requests.

---

## C — Common Pitfalls + Fix

### ❌ Pitfall: Never invalidating cache after mutations

```js
// Create product — cache NOT invalidated
await productService.create(data)
// User navigates to product list — sees old cached list without the new product
```

**Fix:** Always invalidate relevant caches after mutations:

```js
const result = await productService.create(data)
invalidatePrefix('/products')  // or queryClient.invalidateQueries(['products'])
```

### ❌ Pitfall: Caching mutable data like shopping cart totals

```js
// Cart total cached for 5 minutes
// User adds item → total updates server-side
// Cached total still shows old value for 5 min
```

**Fix:** Never cache real-time or user-specific mutable data. Set `staleTime: 0` or `Cache-Control: no-store` for these endpoints.

### ❌ Pitfall: Using object reference as React Query queryKey

```js
const filters = { page: 1, sort: 'price' }
useQuery({ queryKey: ['products', filters] })
// New object reference on every render → cache never hits
```

**Fix:** Serialize to a stable string:

```js
const stableKey = queryString.stringify(filters)
useQuery({ queryKey: ['products', stableKey] })
```

---

## K — Coding Challenge + Solution

### Challenge

Write a `createSimpleCache(defaultTTL)` factory that returns an object with:
1. `get(key)` — returns cached value if fresh, `null` if stale/missing
2. `set(key, value, ttl?)` — stores with timestamp
3. `invalidate(key)` — remove a specific key
4. `invalidatePattern(prefix)` — remove all keys starting with prefix
5. `stats()` — returns `{ size, hits, misses }`

### Solution

```js
function createSimpleCache(defaultTTL = 5 * 60 * 1000) {
  const store = new Map()
  let hits = 0, misses = 0

  return {
    get(key) {
      const entry = store.get(key)
      if (!entry) { misses++; return null }

      const isExpired = Date.now() - entry.timestamp > entry.ttl
      if (isExpired) { store.delete(key); misses++; return null }

      hits++
      return entry.value
    },

    set(key, value, ttl = defaultTTL) {
      store.set(key, { value, timestamp: Date.now(), ttl })
      return value
    },

    invalidate(key) {
      return store.delete(key)
    },

    invalidatePattern(prefix) {
      let count = 0
      for (const key of store.keys()) {
        if (key.startsWith(prefix)) { store.delete(key); count++ }
      }
      return count
    },

    stats() {
      return { size: store.size, hits, misses }
    }
  }
}

// Usage
const cache = createSimpleCache(5 * 60 * 1000)

async function getCachedProducts(filters) {
  const key = '/products?' + queryString.stringify(filters)
  const hit = cache.get(key)
  if (hit) return hit

  const { data } = await productService.list(filters)
  return cache.set(key, data)
}

// After create
await productService.create(data)
cache.invalidatePattern('/products')  // bust all product caches

console.log(cache.stats())  // { size: 0, hits: 1, misses: 2 }
```

---

---

# 9 — Documenting Edge Cases

---

## T — TL;DR

Edge cases are the gaps between "how it works when everything is fine" and "how it works when something unexpected happens." Document them during development, not after production incidents. A short edge-case comment is worth more than a long post-mortem.

---

## K — Key Concepts

### The Four Categories of Edge Cases

```
1. DATA edge cases       — empty results, null fields, unexpected types
2. TIMING edge cases     — race conditions, stale data, slow responses
3. AUTH edge cases       — expired tokens, no permissions, revoked access
4. STATE edge cases      — simultaneous actions, rapid user input, offline
```

### Documenting in Service Files

```js
// src/services/orderService.js

const orderService = {
  /**
   * Creates a new order.
   *
   * Edge cases:
   *  - 409 Conflict: coupon already used by this user
   *    → Show specific message, not generic error
   *  - 422 with field errors: items[0].quantity must be >= 1
   *    → Map details array to form field errors
   *  - 503 during checkout: payment processor down
   *    → Do NOT retry automatically — could double-charge
   *    → Show "try again manually" message only
   *  - Success response may take up to 30s (payment processing)
   *    → Set timeout to 35000ms for this endpoint specifically
   *  - On network loss mid-request: order state is UNKNOWN
   *    → Check GET /orders?status=pending before retrying
   */
  create: (orderData) =>
    request('POST', '/orders', orderData, null, { timeout: 35000 }),

  /**
   * Lists orders with filters.
   *
   * Edge cases:
   *  - Empty results are valid (new user, aggressive filter)
   *    → Show "No orders found" — not an error
   *  - Large result sets: API caps at limit=100
   *    → Do not request limit > 100
   *  - Date range filters: server uses UTC
   *    → Convert local dates to UTC before sending
   *    → ?from=2026-05-19T00:00:00Z not ?from=2026-05-19
   */
  list: (params = {}) =>
    request('GET', '/orders', null, params)
}
```

### Documenting in Hook Files

```js
/**
 * useProducts — manages product list state + URL sync
 *
 * Race condition:
 *   If the user changes filters rapidly, multiple requests may be in flight.
 *   The `cancelled` flag + AbortController ensures only the last request's
 *   result updates state. Earlier responses are discarded.
 *
 * Stale URL:
 *   If the user bookmarks ?page=50 and later data shrinks to 3 pages,
 *   the component auto-redirects to page 1 when the response shows
 *   data.length === 0 && page > 1.
 *
 * Known limitation:
 *   totalPages is computed server-side — if items are added between page
 *   navigations, the total may increase. This can cause the "last page"
 *   to have a different number of items than expected.
 */
function useProducts(filters) { ... }
```

### The Edge Case Comment Template

```
/**
 * Edge cases:
 *  - [HTTP status / condition]: [why it happens]
 *    → [how the frontend handles it]
 *    → [what NOT to do and why]
 *
 *  - [Race condition / timing issue]: [scenario]
 *    → [mitigation strategy]
 *
 *  - Known limitation: [description]
 *    → [workaround or accepted behavior]
 */
```

### A Living Edge Case Document

```markdown
# API Edge Cases — Products Service

## GET /products

### Empty Results
- **When**: Query returns zero matches (aggressive filter, no inventory)
- **Frontend**: Show "No products found" + clear filters button
- **NOT**: Show error state — zero results is a valid, expected response

### `total` Count Drift
- **When**: Items added/deleted while user browses pages
- **Frontend**: Always use `totalPages` from the latest response — never cache it
- **Impact**: User may see a page with fewer items than `limit`

### `brand` Array — Single Value
- **When**: URL has `?brand=nike` (single value) vs `?brand=nike&brand=adidas`
- **Frontend**: query-string returns string for single, array for multiple
- **Mitigation**: Always normalize: `[raw.brand].flat().filter(Boolean)`

## POST /orders

### Double-Submit
- **When**: User clicks "Place Order" twice rapidly
- **Frontend**: Disable button immediately on first click
- **Risk**: Without this, two orders may be created (non-idempotent)

### Payment Processing Timeout
- **When**: Payment takes > 10s (card issuer delay)
- **Frontend**: Use 35s timeout for this endpoint specifically
- **User message**: "Your order is being processed. Check order history."
- **NOT**: Retry automatically — may double-charge

### Network Loss During Checkout
- **When**: Connection drops between POST and response
- **State**: Order may or may not have been created
- **Frontend**: On reconnect, check GET /orders?status=pending before showing error
```

---

## W — Why It Matters

- Edge cases discovered in production cost 10x more to fix than ones caught during development.
- Comments describing "why NOT to do X" prevent the next developer (or future you) from re-introducing a subtle bug.
- The `brand` single-vs-array edge case and the `page reset on filter change` rule are both documented in this 6-day curriculum — they appear in real codebases and cause real bugs.
- A living edge case document becomes the "gotchas" section of your team's frontend handbook.

---

## I — Interview Q&A

### Q1: What edge cases should you consider for every paginated endpoint?

**A:** Empty results (zero items — valid, not an error), `total` count changing between pages (items added/deleted during browsing), page number exceeding `totalPages` (stale bookmarks), data changes causing the last page to have fewer items than expected, and filter changes not resetting the page to 1.

### Q2: What's the double-submit problem and how do you prevent it?

**A:** When a user clicks a submit button twice (or a form auto-submits while the first request is in flight), two identical POST requests can fire — creating duplicate records. Prevent it by disabling the submit button immediately on the first click and only re-enabling it after the response (success or failure) is received.

### Q3: Why should you NOT retry a failed POST /orders automatically?

**A:** POST is not idempotent — sending it twice can create two orders. If the first request succeeded but the response was lost (network drop), an automatic retry would create a duplicate. Instead, check the order status endpoint on reconnect to see if the order was created before offering a manual retry option.

---

## C — Common Pitfalls + Fix

### ❌ Pitfall: Treating empty results as an error

```js
const { data } = await productService.list({ category: 'nonexistent' })
if (!data || data.length === 0) throw new Error('Failed to load products')
// ← Empty results are not a failure — they're valid
```

**Fix:**

```js
if (error) setError(error.message)         // real error
else if (data.data.length === 0) setEmpty(true)  // valid empty
else setProducts(data.data)
```

### ❌ Pitfall: Not documenting the non-obvious behavior

```js
// 6 months later: developer changes brand handling
const brand = queryString.parse(search).brand  // string or array
brand.map(...)  // crashes for single-value URLs — bug re-introduced
// Comment would have prevented this
```

**Fix:**

```js
// ⚠️ Edge case: query-string returns string for single brand, array for multiple.
// ALWAYS normalize: const brands = [raw.brand].flat().filter(Boolean)
const brands = [raw.brand].flat().filter(Boolean)
```

---

## K — Coding Challenge + Solution

### Challenge

Write edge case documentation for a `deleteUser(userId)` function that:
1. Sends `DELETE /users/:id`
2. Has a `cascade` option that also deletes their posts and orders
3. Could fail if the user has pending orders
4. Should not be retried on failure

### Solution

```js
/**
 * Deletes a user account and optionally their associated data.
 *
 * @param {string} userId   - UUID of the user to delete
 * @param {boolean} cascade - If true, also deletes posts and orders
 *
 * Edge cases:
 *
 *  - 404 Not Found: user already deleted (concurrent delete or stale UI)
 *    → Treat as success — the desired outcome (no user) is achieved
 *    → Do NOT show error to the user
 *
 *  - 409 Conflict: user has pending orders
 *    → Show specific message: "User has pending orders. Resolve them first."
 *    → Offer navigation link to orders list
 *    → Do NOT use generic error message
 *
 *  - cascade=true takes up to 10 seconds for large accounts
 *    → Use timeout: 15000 for cascade deletes
 *    → Show "Deleting account data..." progress indicator
 *    → DO NOT let user navigate away mid-delete (use beforeunload guard)
 *
 *  - Network failure during delete: state is UNKNOWN
 *    → Do NOT retry automatically — could fail-then-succeed on a race
 *    → Check GET /users/:id before offering manual retry
 *    → If user is gone → treat as success. If still exists → offer retry.
 *
 *  - Double-click prevention:
 *    → Disable delete button immediately on first click
 *    → Re-enable ONLY on error response (not on timeout — state is unknown)
 *
 * Returns: { data: null, error } — success returns 204 with empty body
 */
function deleteUser(userId, cascade = false) {
  return request('DELETE', `/users/${userId}`, null, cascade ? { cascade: true } : null, {
    timeout: cascade ? 15000 : 10000
  })
}
```

---

---

# 10 — Final Audit — REST / Axios / query-string

---

## T — TL;DR

Six days. One audit. Everything you've learned maps to a production checklist. This is the difference between code that "works" and code that **ships**.

---

## K — Key Concepts

### The Complete 6-Day Learning Map

```
Day 1 — JavaScript Foundations     (closures, async, Promises)
Day 2 — var/let/const              (scope, hoisting, TDZ)
Day 3 — Axios Request Basics       (CRUD, async/await, config, error handling)
Day 4 — Axios Client Architecture  (instances, interceptors, service layer)
Day 5 — query-string Integration   (parse, stringify, arrays, URL state)
Day 6 — Production API Workflow    (contracts, pagination, auth, testing, caching)
```

### The Production Checklist — Audit Every Project

```
─── AXIOS INSTANCE (Day 3/4) ───────────────────────────────
☐  axios.create() instance — NOT raw axios import in components
☐  baseURL from environment variable (not hardcoded)
☐  Default timeout set (10000ms recommended)
☐  Content-Type: application/json in default headers
☐  paramsSerializer using query-string (Day 5)

─── INTERCEPTORS (Day 4) ───────────────────────────────────
☐  Request interceptor: auth token injection from localStorage
☐  Request interceptor: stamps config.metadata.startTime
☐  Response interceptor: logs timing in DEV mode
☐  Response interceptor: 401 → clear token + redirect to /login
☐  Response interceptor: error normalization (status, message, code, fieldErrors)
☐  All interceptors: return config (req) / return Promise.reject(error) (res)
☐  Component-level interceptors: eject in useEffect cleanup

─── ERROR HANDLING (Day 3/4/6) ─────────────────────────────
☐  All axios calls: wrapped in try/catch OR using { data, error } pattern
☐  Three error states handled: response error, network error, setup error
☐  axios.isAxiosError(err) used before accessing .response
☐  finally block: loading state always set to false
☐  Status-specific handling: 401 / 403 / 404 / 422 / 5xx
☐  No raw Axios error messages shown to users

─── QUERY PARAMETERS (Day 5) ───────────────────────────────
☐  query-string used for ALL param building — no manual string concat
☐  arrayFormat consistent between stringify and parse
☐  skipNull: true + skipEmptyString: true on all filter stringifies
☐  parseNumbers: true + parseBooleans: true on all URL parses
☐  Single-value array normalization: [raw.brand].flat().filter(Boolean)
☐  URL filter state: parse on mount, stringify on change

─── PAGINATION (Day 5/6) ───────────────────────────────────
☐  Page resets to 1 on any filter/sort change
☐  Page does NOT reset on pagination-only changes
☐  Empty results: show "no results" — not error state
☐  Invalid page in URL: clamp to [1, totalPages]
☐  Pagination meta (total, totalPages, hasNext, hasPrev) from response

─── AUTH (Day 6) ────────────────────────────────────────────
☐  Access token: short-lived (15–60 min)
☐  Refresh token: long-lived (7+ days)
☐  Token refresh: _retry flag prevents infinite loop
☐  Simultaneous 401s: failedQueue pattern
☐  Refresh endpoint excluded from 401 redirect
☐  Login redirect preserves current URL (?redirect=pathname)

─── LOADING & UX (Day 6) ───────────────────────────────────
☐  All API calls: loading / success / error state handled
☐  Skeleton screens or spinner for initial load
☐  Stale data shown during refresh (not blank screen)
☐  Retry button shown for retryable errors
☐  Loading state disabled during optimistic updates

─── TESTING (Day 6) ─────────────────────────────────────────
☐  MSW or axios-mock-adapter for service tests
☐  Happy path, error path, empty path tested
☐  server.resetHandlers() in afterEach
☐  Component tests: loading state and error state covered
☐  No tests that call real API endpoints

─── CACHING (Day 6) ─────────────────────────────────────────
☐  GET requests: appropriate staleTime set (or cache headers)
☐  POST/PATCH/DELETE: cache invalidated on success
☐  Real-time data (cart, stock): not cached or very short TTL
☐  React Query / TanStack Query: stable queryKey (string, not object)

─── SERVICE LAYER (Day 4) ──────────────────────────────────
☐  One service file per resource
☐  Components import from services — never raw axios
☐  Service methods: one-liners calling request()
☐  Consistent naming: list / getById / create / update / remove
☐  No business logic in service files

─── DOCUMENTATION (Day 6) ──────────────────────────────────
☐  Contract defined (TypeScript interfaces or written spec)
☐  Error shape agreed with backend — single consistent envelope
☐  Edge cases documented in service files
☐  Non-obvious behaviors commented (single-vs-array, page reset)
```

### The Severity Tiers

```
🔴 CRITICAL — Causes production bugs today
  - No try/catch on any API call
  - No loading state → infinite spinner
  - No auth token injection
  - No page reset on filter change

🟡 IMPORTANT — Causes pain when scale increases
  - Raw axios in components (no service layer)
  - No paramsSerializer (array params broken)
  - No cache invalidation after mutations
  - No retry on network errors

🟢 BEST PRACTICE — Separates good from excellent
  - Token refresh queue pattern
  - Skeleton screens instead of spinners
  - MSW-based tests
  - Full edge case documentation
```

### The 6 Mental Models to Carry Forward

```
1. URL as state
   Filter/sort/page → always in the URL → bookmarkable, shareable, back-button safe

2. Service layer as the contract
   Components call services → services call API → one place to change anything

3. Normalize at the boundary
   Parse URL → normalize types once → use typed values everywhere
   Receive API response → normalize error shape once → consistent catch blocks

4. Interceptors for cross-cutting concerns
   Auth, logging, timing, global errors → interceptors, NOT individual calls

5. Three states always
   Loading, success, error → handle all three, every time, no exceptions

6. Cache + invalidate
   GET → cache it. POST/PATCH/DELETE → invalidate it. Real-time → skip cache.
```

---

## W — Why It Matters

- The checklist converts 6 days of learning into a repeatable quality gate — use it for code review, new projects, and refactoring audits.
- The severity tiers help prioritize — fix 🔴 items before shipping, plan 🟡 items before scale, add 🟢 items during maintenance.
- The six mental models are the durable takeaways — specific APIs change, frameworks change, but these principles apply to every frontend API layer you'll build.
- Running this audit on an existing codebase is a complete technical assessment of its API integration quality.

---

## I — Interview Q&A

### Q1: If you were reviewing a junior developer's first API integration PR, what are the first five things you'd check?

**A:**
1. Is there a try/catch (or `{ data, error }` pattern) on every API call?
2. Is the loading state set to `false` in a `finally` block?
3. Does changing a filter reset the page to 1?
4. Is the Axios instance created with `axios.create()` or is raw `axios` used everywhere?
5. Are error messages shown to users human-readable, not raw Axios messages?

### Q2: What's the minimum viable API layer for a small React app?

**A:** One `api.js` file with an `axios.create()` instance (baseURL, timeout), a request interceptor for auth token injection, a response interceptor for 401 redirect, and a `request()` helper that returns `{ data, error }`. Then one service file per resource that calls `request()`. This is roughly 80 lines and covers 90% of production needs.

### Q3: How would you explain the entire 6-day scope in one sentence to a hiring manager?

**A:** "I can design and implement a complete production-grade frontend API layer — including Axios instance architecture, request/response interceptors, normalized error handling, URL-synced filter state with query-string, pagination coordination, token refresh, resilient UX patterns, mock-based testing, and basic caching — all following industry best practices."

---

## C — Common Pitfalls + Fix

### ❌ The Most Common Production Bug Pattern

```
Missing combination:
  1. No page reset on filter change
  2. No empty-result check
  3. No loading state in finally

Result: User changes filter on page 5 → page 5 of new filter is empty →
        blank screen with infinite spinner → user thinks app is broken
```

**Fix:** Apply the three-part fix together:

```js
// 1. Always reset page on filter change (in coordinateUpdate)
page: isPaginationOnly ? currentPage : 1

// 2. Handle empty results explicitly
if (data.data.length === 0 && page > 1) setPage(1)  // auto-correct stale page

// 3. Always clear loading in finally
} finally { setLoading(false) }
```

### ❌ The Most Common Architecture Mistake

```js
// 47 component files each containing:
import axios from 'axios'
const res = await axios.get(`https://api.myapp.com/v1/${endpoint}`)
```

**Fix:** One instance, one service layer, zero axios imports in components.

---

## K — Coding Challenge + Solution

### Challenge

Run the **complete audit** on this code snippet and list every issue with its severity tier:

```js
// ProductPage.jsx
import axios from 'axios'
import { useState, useEffect } from 'react'

function ProductPage() {
  const [products, setProducts] = useState([])
  const [category, setCategory] = useState('shoes')
  const [page, setPage] = useState(1)

  useEffect(() => {
    async function load() {
      const res = await axios.get(
        `https://api.shop.com/products?category=${category}&page=${page}`
      )
      setProducts(res.data)
    }
    load()
  }, [page])  // ← only depends on page

  return (
    <div>
      <select onChange={e => setCategory(e.target.value)}>
        <option value="shoes">Shoes</option>
        <option value="bags">Bags</option>
      </select>
      <button onClick={() => setPage(p => p + 1)}>Next</button>
      {products.map(p => <div key={p.id}>{p.name}</div>)}
    </div>
  )
}
```

### Solution

```
AUDIT RESULTS — ProductPage.jsx
══════════════════════════════════════════════════════════════

🔴 CRITICAL

1. Raw axios imported in component
   → Should use an axios instance from @/lib/api
   → Severity: Critical (hardcoded baseURL, no interceptors, no auth)

2. No try/catch around API call
   → Unhandled rejection crashes the component silently
   → Fix: wrap in try/catch, set error state on failure

3. No loading state
   → Users see a blank product list during fetch
   → Fix: setLoading(true) before fetch, setLoading(false) in finally

4. No error state
   → If request fails, products stays [] — no feedback to user
   → Fix: add error state, show error message with retry button

5. useEffect only depends on [page], not [category, page]
   → Changing category does NOT trigger a re-fetch
   → Fix: add category to dependency array

6. Category change does NOT reset page to 1
   → User on page 5, changes to "bags" → fetches page 5 of bags → may be empty
   → Fix: setPage(1) in the category onChange handler

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🟡 IMPORTANT

7. Manual URL string concatenation for query params
   → category could contain special characters — not encoded
   → Fix: use queryString.stringify({ category, page })

8. No pagination metadata used
   → "Next" button never disabled — can go to page 999
   → Fix: read meta.hasNext from response, disable button accordingly

9. No service layer
   → HTTP call directly in component — not reusable, not testable
   → Fix: move to productService.list(params)

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🟢 BEST PRACTICE

10. No AbortController cleanup
    → Navigating away mid-request → setState on unmounted component
    → Fix: AbortController in useEffect cleanup

11. No URL state sync
    → Filter/page state lost on refresh and not shareable
    → Fix: use useUrlFilters() or URL-driven state management

12. No skeleton screen
    → Blank page during initial load
    → Fix: show skeleton grid while loading === true

══════════════════════════════════════════════════════════════
TOTAL: 6 Critical, 3 Important, 3 Best Practice
FIX ALL CRITICAL BEFORE MERGING TO PRODUCTION.
══════════════════════════════════════════════════════════════
```

---

---

## ✅ Day 6 Complete — Production API Workflow

| # | Subtopic | Status |
|---|----------|--------|
| 1 | Frontend-to-API Contract Design | ☐ |
| 2 | Filter-Sort-Page Coordination | ☐ |
| 3 | Pagination UX Contracts | ☐ |
| 4 | Auth & Token-Refresh Concepts | ☐ |
| 5 | Resilient Loading & Error UX | ☐ |
| 6 | Debugging Network Issues | ☐ |
| 7 | Mocking & Testing API Calls | ☐ |
| 8 | Caching & Performance Basics | ☐ |
| 9 | Documenting Edge Cases | ☐ |
| 10 | Final Audit — REST / Axios / query-string | ☐ |

---

## 🎓 6-Day REST / Axios / query-string Curriculum — Complete

| Day | Topic | Core Outcome |
|-----|-------|--------------|
| 1 | JavaScript Foundations | Closures, async, Promises |
| 2 | var / let / const | Scope, hoisting, TDZ |
| 3 | Axios Request Basics | CRUD, error handling, helpers |
| 4 | Axios Client Architecture | Instances, interceptors, service layer |
| 5 | query-string Integration | Parse, stringify, URL state |
| 6 | Production API Workflow | Contracts, auth, testing, caching, audit |

---

> **Pick Topic 1. Read the checklist. Audit one file in your current project.**
>
> *Doing one small thing beats opening a feed.*