# 12 — `query-string` as Axios `paramsSerializer`

---

## T — TL;DR

Axios's default array serialization (`bracket` format with encoded brackets) is wrong for most REST APIs. Replace it with a custom `paramsSerializer` powered by `query-string` — defined once on the instance, applies to every request automatically.

---

## K — Key Concepts

### The Problem with Axios Default Array Serialization

```js
// Default Axios behavior for arrays in params
axios.get('/products', {
  params: { brand: ['nike', 'adidas'], page: 2 }
})
// Sends: /products?brand%5B%5D=nike&brand%5B%5D=adidas&page=2
// Decoded: /products?brand[]=nike&brand[]=adidas&page=2
// ← bracket format with URL-encoded brackets

// Most backends expect:
// /products?brand=nike&brand=adidas&page=2   (repeated keys)
// OR
// /products?brand=nike,adidas&page=2         (comma)
```

### `paramsSerializer` — Custom Serialization

Axios accepts a `paramsSerializer` config that controls how the `params` object is converted to a query string:

```js
import axios from 'axios'
import queryString from 'query-string'

const api = axios.create({
  baseURL: 'https://api.example.com',
  timeout: 10000,

  paramsSerializer: {
    serialize: (params) =>
      queryString.stringify(params, {
        arrayFormat:     'none',     // repeated keys: brand=nike&brand=adidas
        skipNull:        true,
        skipEmptyString: true
      })
  }
})
```

Now pass arrays freely in `params` — correct format automatically:

```js
const { data } = await api.get('/products', {
  params: {
    brand:    ['nike', 'adidas'],
    sort:     'price',
    page:     2,
    featured: null   // will be skipped
  }
})
// Sends: /products?brand=nike&brand=adidas&sort=price&page=2  ✅
```

### `paramsSerializer` Format Options

```js
// Repeated keys (most REST APIs, Express, FastAPI, Django)
paramsSerializer: {
  serialize: (params) => queryString.stringify(params, {
    arrayFormat: 'none',
    skipNull: true, skipEmptyString: true
  })
}
// brand=nike&brand=adidas

// Comma-separated (some APIs)
paramsSerializer: {
  serialize: (params) => queryString.stringify(params, {
    arrayFormat: 'comma',
    skipNull: true, skipEmptyString: true
  })
}
// brand=nike,adidas

// Bracket format (Laravel/PHP)
paramsSerializer: {
  serialize: (params) => queryString.stringify(params, {
    arrayFormat: 'bracket',
    skipNull: true, skipEmptyString: true
  })
}
// brand[]=nike&brand[]=adidas
```

### Complete Production Axios Instance with `paramsSerializer`

```js
// src/lib/api.js
import axios from 'axios'
import queryString from 'query-string'

const QS_CONFIG = {
  arrayFormat:     'none',   // repeated keys — most compatible
  skipNull:        true,
  skipEmptyString: true
}

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL ?? 'http://localhost:3000',
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
    'Accept':       'application/json'
  },
  paramsSerializer: {
    serialize: (params) => queryString.stringify(params, QS_CONFIG)
  }
})

// ─── Request interceptor
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('access_token')
    if (token) config.headers.Authorization = `Bearer ${token}`
    return config
  },
  (error) => Promise.reject(error)
)

// ─── Response interceptor
api.interceptors.response.use(
  (res) => res,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('access_token')
      window.location.href = '/login'
    }
    return Promise.reject(error)
  }
)

export default api

// ─── Companion parse function (same options as paramsSerializer)
export function parseQueryParams(searchString) {
  return queryString.parse(searchString, {
    ...QS_CONFIG,
    parseNumbers:  true,
    parseBooleans: true
  })
}
```

### Using the Configured Instance

```js
import api from '@/lib/api'

// Arrays work correctly — no manual stringification needed
const { data } = await api.get('/products', {
  params: {
    brand:    ['nike', 'adidas', 'puma'],  // → brand=nike&brand=adidas&brand=puma
    category: 'shoes',
    sort:     'price',
    order:    'asc',
    page:     2,
    featured: null,   // skipped — skipNull: true
    q:        ''      // skipped — skipEmptyString: true
  }
})
```

### `paramsSerializer` vs Manual URL Building

```js
// ❌ Before paramsSerializer — manual, repetitive, error-prone
const brands = ['nike', 'adidas']
const qs = queryString.stringify({ brand: brands, page: 2 }, { arrayFormat: 'none' })
axios.get(`/products?${qs}`)

// ✅ After paramsSerializer — clean params object, automatic serialization
axios.get('/products', {
  params: { brand: brands, page: 2 }
})
// Same result, no manual stringification
```

### `paramsSerializer` for URL Sync Consistency

Keep parse/stringify in sync across the URL bar and Axios params:

```js
// Both use the same configuration
const QS_CONFIG = { arrayFormat: 'none', skipNull: true, skipEmptyString: true }

// URL → State (on mount)
const filters = queryString.parse(window.location.search, {
  ...QS_CONFIG,
  parseNumbers: true,
  parseBooleans: true
})

// State → API (via Axios)
api.get('/products', { params: filters })
// paramsSerializer uses same QS_CONFIG → consistent format ✅

// State → URL (on filter change)
const qs = queryString.stringify(filters, QS_CONFIG)
navigate(`/products?${qs}`)
// Same format in URL and API calls ✅
```

---

## W — Why It Matters

- Axios's default bracket array serialization breaks most REST backends silently — requests succeed with HTTP 200 but return wrong data because array params aren't recognized.
- Setting `paramsSerializer` once on the instance applies to every request — no per-call manual stringification scattered across service files.
- Consistent `QS_CONFIG` between `paramsSerializer` and URL-sync logic ensures the URL, the API call, and the parsed state all use the same format — eliminating format mismatch bugs.
- This is the final piece that connects Day 5 (query-string) to Day 4 (Axios architecture) — your Axios instance and your URL state management use the same serialization rules.

---

## I — Interview Q&A

### Q1: Why does Axios need a custom `paramsSerializer` for arrays?

**A:** Axios uses its own serialization for the `params` object that produces bracket notation (`brand[]=nike`) by default. Most REST APIs expect repeated keys (`brand=nike&brand=adidas`) or comma format. A custom `paramsSerializer` replaces Axios's default with `query-string.stringify`, giving you full control over array format, null skipping, and encoding.

### Q2: Where should `paramsSerializer` be configured?

**A:** On the Axios instance in `axios.create()`. Configured once, it applies automatically to every request made through that instance — no per-request configuration needed. This is the same principle as setting `baseURL` and `timeout` on the instance.

### Q3: How do you ensure the URL bar format and Axios request format stay in sync?

**A:** Define a single `QS_CONFIG` options object and import it in both the `paramsSerializer` (for Axios) and the `queryString.stringify/parse` calls (for URL state). Both use the same `arrayFormat`, `skipNull`, and `skipEmptyString` settings — any change is made in one place and automatically affects both.

---

## C — Common Pitfalls + Fix

### ❌ Pitfall: Using Axios default params for arrays without knowing the format

```js
// Passes array to Axios params without paramsSerializer
api.get('/products', { params: { brand: ['nike', 'adidas'] } })
// Axios sends: brand%5B%5D=nike&brand%5B%5D=adidas
// Backend receives: brand[] as a field name — never matches 'brand'
// Returns all products unfiltered — silent bug with HTTP 200
```

**Fix:** Add `paramsSerializer` to your Axios instance.

### ❌ Pitfall: Different `arrayFormat` in URL and Axios params

```js
// URL uses comma format
const qs = queryString.stringify({ brand: ['nike'] }, { arrayFormat: 'comma' })
navigate(`/products?${qs}`)
// URL: /products?brand=nike

// But paramsSerializer uses 'none' (repeated keys)
api.get('/products', { params: { brand: ['nike'] } })
// Sends: /products?brand=nike  ← same for single value, different for multiple!

// Two brands in URL: /products?brand=nike,adidas
// Two brands in API: /products?brand=nike&brand=adidas
// Backend may treat differently → inconsistent results
```

**Fix:** Use the same `QS_CONFIG` for both:

```js
export const QS_CONFIG = { arrayFormat: 'comma', skipNull: true, skipEmptyString: true }
// Use in paramsSerializer AND queryString.parse/stringify everywhere
```

### ❌ Pitfall: Forgetting that `paramsSerializer` only affects `params`, not the request body

```js
api.post('/products', { tags: ['js', 'react'] }, {
  paramsSerializer: { serialize: ... }
})
// paramsSerializer only affects ?query=string params
// The body { tags: ['js', 'react'] } is serialized by Axios's transformRequest (JSON.stringify)
// Body arrays → [ "js", "react" ] in JSON — not affected by paramsSerializer
```

**Fix:** `paramsSerializer` is for `params` config only. Request body JSON is handled by `Content-Type: application/json` and Axios's automatic `JSON.stringify`.

---

## K — Coding Challenge + Solution

### Challenge

Build the complete, production-ready `api.js` instance that:
1. Uses `query-string` as the `paramsSerializer` with `arrayFormat: 'none'`
2. Skips null and empty string params
3. Injects Bearer token from localStorage
4. Redirects to `/login` on 401
5. Exports a `parseFilters(search)` function that uses the same QS config
6. Exports a `buildFilterUrl(baseUrl, params)` function

Demonstrate with a complete usage example.

### Solution

```js
// src/lib/api.js
import axios from 'axios'
import queryString from 'query-string'

// ─── Shared query-string configuration ───────────────────
// Used by: paramsSerializer, parseFilters, buildFilterUrl
// Keep in sync so URL state and API calls use the same format
export const QS_CONFIG = {
  arrayFormat:     'none',   // repeated keys: ?brand=nike&brand=adidas
  skipNull:        true,
  skipEmptyString: true
}

export const QS_PARSE_CONFIG = {
  ...QS_CONFIG,
  parseNumbers:  true,
  parseBooleans: true
}

// ─── Axios instance ───────────────────────────────────────
const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL ?? 'http://localhost:3000',
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
    'Accept':       'application/json'
  },
  paramsSerializer: {
    // query-string handles: arrays, nulls, empty strings, encoding
    serialize: (params) => queryString.stringify(params, QS_CONFIG)
  }
})

// ─── Request interceptor: inject auth token ───────────────
api.interceptors.request.use(
  (config) => {
    config.headers   = config.headers ?? {}
    config.metadata  = { startTime: Date.now() }

    const token = localStorage.getItem('access_token')
    if (token) config.headers.Authorization = `Bearer ${token}`

    return config
  },
  (error) => Promise.reject(error)
)

// ─── Response interceptor: global error handling ──────────
api.interceptors.response.use(
  (response) => {
    if (import.meta.env.DEV) {
      const ms = Date.now() - (response.config.metadata?.startTime ?? 0)
      console.log(
        `← ${response.status} ${response.config.method?.toUpperCase()} ` +
        `${response.config.url} (${ms}ms)`
      )
    }
    return response
  },
  (error) => {
    const status     = error.response?.status
    const isRefresh  = error.config?.url?.includes('/auth/refresh')

    if (status === 401 && !isRefresh) {
      localStorage.removeItem('access_token')
      const redirect = encodeURIComponent(window.location.pathname)
      window.location.href = `/login?redirect=${redirect}`
    }

    return Promise.reject(error)
  }
)

// ─── URL helpers (same QS config as paramsSerializer) ─────

/**
 * Parse a URL search string into a typed filter object.
 * Always use this instead of direct queryString.parse()
 * so the format stays in sync with the Axios paramsSerializer.
 */
export function parseFilters(searchString) {
  return queryString.parse(searchString, QS_PARSE_CONFIG)
}

/**
 * Build a URL from a base path and params object.
 * Skips null/empty values, uses same array format as paramsSerializer.
 */
export function buildFilterUrl(baseUrl, params) {
  const { url, query: existing } = queryString.parseUrl(baseUrl)
  const merged = { ...existing, ...params }
  return queryString.stringifyUrl(
    { url, query: merged },
    QS_CONFIG
  )
}

export default api
```

---

```js
// ─── Usage Example ────────────────────────────────────────
// src/services/productService.js
import api from '@/lib/api'
import { request } from '@/lib/request'

const productService = {
  // Arrays, nulls, empty strings handled automatically by paramsSerializer
  list: (params = {}) =>
    request('GET', '/products', null, params),

  search: (query, filters = {}) =>
    request('GET', '/products', null, {
      q:    query,
      ...filters
    })
}

export default productService
```

---

```jsx
// src/pages/ProductsPage.jsx
import { useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { parseFilters, buildFilterUrl, QS_CONFIG } from '@/lib/api'
import queryString from 'query-string'
import productService from '@/services/productService'

function ProductsPage() {
  const location = useLocation()
  const navigate = useNavigate()

  // ─── Parse URL → filters (using same config as paramsSerializer)
  const filters = parseFilters(location.search)
  const brands  = [filters.brand].flat().filter(Boolean)  // normalize to array

  useEffect(() => {
    async function load() {
      // params object → Axios uses paramsSerializer → same format as URL
      const { data, error } = await productService.list({
        brand:    brands,           // ['nike', 'adidas'] → brand=nike&brand=adidas
        category: filters.category, // 'shoes'
        sort:     filters.sort,
        page:     filters.page,
        limit:    filters.limit,
        q:        filters.q,
        temp:     null              // skipped automatically ✅
      })

      if (data) console.log('Products:', data)
      if (error) console.error('Error:', error.message)
    }
    load()
  }, [location.search])

  function updateFilter(key, value) {
    const updated = buildFilterUrl(
      location.pathname + location.search,
      { [key]: value, page: 1 }  // reset page on filter change
    )
    navigate(updated)
  }

  function clearFilters() {
    navigate(location.pathname)
  }

  return (
    <div>
      <input
        value={filters.q ?? ''}
        onChange={e => updateFilter('q', e.target.value || null)}
        placeholder="Search..."
      />
      <select
        value={filters.sort ?? 'createdAt'}
        onChange={e => updateFilter('sort', e.target.value)}
      >
        <option value="createdAt">Newest</option>
        <option value="price">Price</option>
        <option value="rating">Rating</option>
      </select>
      <button onClick={clearFilters}>Clear All Filters</button>

      {/* Current active filters shown as tags */}
      <pre>{JSON.stringify(filters, null, 2)}</pre>
    </div>
  )
}
```

---

---

## ✅ Day 5 Complete — query-string Integration

| # | Subtopic | Status |
|---|----------|--------|
| 1 | Query Parameter Design Rules | ☐ |
| 2 | Parse — Reading Query Strings | ☐ |
| 3 | Stringify — Building Query Strings | ☐ |
| 4 | Encoding & Decoding | ☐ |
| 5 | Arrays & `arrayFormat` Options | ☐ |
| 6 | Booleans and Numbers | ☐ |
| 7 | Null & Empty Value Handling | ☐ |
| 8 | Repeated Keys | ☐ |
| 9 | Stable Serialization | ☐ |
| 10 | Search / Filter / Sort / Page URL State | ☐ |
| 11 | Custom Separators | ☐
