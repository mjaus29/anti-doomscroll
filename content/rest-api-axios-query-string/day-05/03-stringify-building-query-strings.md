# 3 — Stringify — Building Query Strings

---

## T — TL;DR

`queryString.stringify()` converts a JavaScript object into a URL query string. It handles encoding, arrays, nulls, and ordering — replacing every fragile manual `?key=val&key=val` string you've ever written.

---

## K — Key Concepts

### The Simplest Stringify

```js
import queryString from 'query-string'

const params = { name: 'Mark', role: 'admin', page: 2 }
const qs = queryString.stringify(params)
console.log(qs)
// 'name=Mark&role=admin&page=2'
```

> Note: `stringify` does NOT prepend `?`. Add it yourself when needed.

### Prepending `?`

```js
const qs = queryString.stringify({ page: 2, category: 'shoes' })
const url = `/products?${qs}`
// '/products?page=2&category=shoes'

// Or use stringifyUrl (adds ? automatically)
const url = queryString.stringifyUrl({
  url: '/products',
  query: { page: 2, category: 'shoes' }
})
// '/products?page=2&category=shoes'
```

### `stringifyUrl` — Build a Full URL at Once

```js
const url = queryString.stringifyUrl({
  url: 'https://api.example.com/products',
  query: {
    category: 'shoes',
    sort: 'price',
    page: 2
  }
})
// 'https://api.example.com/products?category=shoes&sort=price&page=2'
```

Updating an existing URL's params:

```js
const currentUrl = 'https://myapp.com/products?category=shoes&page=1'

const updatedUrl = queryString.stringifyUrl({
  url: currentUrl,
  query: { page: 2 }  // ← updates page, keeps category
})
// 'https://myapp.com/products?category=shoes&page=2'
```

### Stringify Options

```js
// ─── skipNull: omit keys with null values
queryString.stringify({ a: 'hello', b: null, c: undefined }, { skipNull: true })
// 'a=hello'

// ─── skipEmptyString: omit empty string values
queryString.stringify({ q: '', page: 1 }, { skipEmptyString: true })
// 'page=1'

// ─── Both (most useful for filter forms)
queryString.stringify(
  { q: '', category: null, page: 1, sort: 'price' },
  { skipNull: true, skipEmptyString: true }
)
// 'page=1&sort=price'

// ─── sort: alphabetically sort keys
queryString.stringify({ page: 2, category: 'shoes', sort: 'price' }, { sort: false })
// keeps insertion order: 'page=2&category=shoes&sort=price'

queryString.stringify({ page: 2, category: 'shoes', sort: 'price' })
// default: alphabetical: 'category=shoes&page=2&sort=price'

// ─── encode: false — skip URL encoding (use carefully)
queryString.stringify({ q: 'rock & roll' }, { encode: false })
// 'q=rock & roll'  ← broken URL, use only when you know what you're doing
```

### Sorting Keys — Deterministic Output

```js
// Default: alphabetical sort
queryString.stringify({ z: 3, a: 1, m: 2 })
// 'a=1&m=2&z=3'

// Disable sorting — preserve insertion order
queryString.stringify({ z: 3, a: 1, m: 2 }, { sort: false })
// 'z=3&a=1&m=2'

// Custom sort function
queryString.stringify(
  { z: 3, a: 1, m: 2 },
  { sort: (a, b) => a.localeCompare(b) }
)
// 'a=1&m=2&z=3'
```

---

## W — Why It Matters

- Manual string building (`?a=${a}&b=${b}`) breaks on special characters, null values, and arrays every time.
- `stringifyUrl` lets you **update a subset of params** in an existing URL without parsing and re-building manually — critical for filter UIs.
- `skipNull` + `skipEmptyString` is the cleanest way to handle optional form fields — include only the ones with values.
- Default alphabetical sorting means the same params always produce the same URL — important for caching and diffing.

---

## I — Interview Q&A

### Q1: What's the difference between `queryString.stringify()` and `queryString.stringifyUrl()`?

**A:** `stringify()` takes a params object and returns only the query string (`key=val&key=val`) without a `?`. `stringifyUrl()` takes `{ url, query }` and returns the full URL with query string appended. `stringifyUrl` also merges with existing params in the URL, making it ideal for updating partial filter state.

### Q2: How do you remove a filter param from the URL?

**A:** Set the value to `null` or `undefined` in the params object and stringify with `skipNull: true`. The key will be omitted from the output. This is the clean way to "clear" a filter without tracking which keys to delete manually.

### Q3: Does `queryString.stringify()` preserve key insertion order?

**A:** No — by default it sorts keys alphabetically for stable, deterministic output. Pass `{ sort: false }` to preserve insertion order, or pass a comparator function for custom ordering.

---

## C — Common Pitfalls + Fix

### ❌ Pitfall: Manual string concatenation instead of stringify

```js
// Breaks when q = "rock & roll" or category = undefined
const qs = `q=${q}&category=${category}&page=${page}`
fetch(`/api/products?${qs}`)
```

**Fix:**

```js
const qs = queryString.stringify({ q, category, page }, { skipNull: true, skipEmptyString: true })
fetch(`/api/products?${qs}`)
// Encodes special characters, skips nulls, always safe ✅
```

### ❌ Pitfall: Double-encoding when passing to Axios `params`

```js
// Building a query string and putting it in Axios params
const qs = queryString.stringify({ page: 2, q: 'rock & roll' })
axios.get('/products', { params: qs })
// ← Axios tries to encode the entire string again → double-encoded
```

**Fix:** Either pass a plain object to Axios `params`, or use `query-string` as the `paramsSerializer` (covered in Topic 12):

```js
// Option A: plain object (let Axios serialize)
axios.get('/products', { params: { page: 2, q: 'rock & roll' } })

// Option B: pre-built string as URL
const url = `/products?${queryString.stringify({ page: 2, q: 'rock & roll' })}`
axios.get(url)
```

### ❌ Pitfall: Forgetting to add `?` when using `stringify`

```js
const qs = queryString.stringify({ page: 2 })
const url = `/products${qs}`    // '/productspage=2' ← missing ?
```

**Fix:**

```js
const url = `/products?${qs}`   // ✅
// Or use stringifyUrl which handles this automatically
```

---

## K — Coding Challenge + Solution

### Challenge

Write a `buildFilterUrl(baseUrl, filters)` function that:
1. Takes a base URL and filter object
2. Skips null, undefined, and empty string values
3. Merges with any existing params in the base URL
4. Returns a fully formed URL string

```js
buildFilterUrl('/products?category=shoes', {
  brand: 'nike',
  sort: 'price',
  page: 2,
  q: '',        // empty — should be skipped
  featured: null  // null — should be skipped
})
// '/products?brand=nike&category=shoes&page=2&sort=price'
```

### Solution

```js
import queryString from 'query-string'

function buildFilterUrl(baseUrl, filters = {}) {
  // Parse existing URL to get current params
  const { url, query: existingParams } = queryString.parseUrl(baseUrl)

  // Merge new filters over existing params
  const mergedParams = { ...existingParams, ...filters }

  // Stringify with skipNull + skipEmptyString
  return queryString.stringifyUrl(
    { url, query: mergedParams },
    { skipNull: true, skipEmptyString: true, sort: false }
  )
}

// Tests
console.log(
  buildFilterUrl('/products?category=shoes', {
    brand: 'nike', sort: 'price', page: 2, q: '', featured: null
  })
)
// '/products?category=shoes&brand=nike&sort=price&page=2'

console.log(
  buildFilterUrl('/products?page=1&sort=name', { page: 3 })
)
// '/products?page=3&sort=name'  ← page updated, sort preserved
```

---

---
