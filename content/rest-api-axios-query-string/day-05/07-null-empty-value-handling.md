# 7 — Null & Empty Value Handling

---

## T — TL;DR

Null and empty string values in query params cause silent API bugs — sending `?q=&status=` to a backend often returns zero results. `query-string` gives you precise control over what gets included, skipped, or treated as null.

---

## K — Key Concepts

### The Problem

When a user clears a filter, the state value becomes `null`, `undefined`, or `''`. You don't want those in the URL:

```
❌ /products?q=&category=&brand=&sort=price
   ← empty params pollute the URL and may break the backend

✅ /products?sort=price
   ← clean URL, only active filters
```

### Default Behavior — What Gets Included

```js
// Default: null → omitted, undefined → omitted, '' → included
queryString.stringify({ q: '', page: null, limit: undefined, sort: 'price' })
// 'q=&sort=price'
// null and undefined are dropped, empty string '' is kept
```

### `skipNull` — Skip Null AND Undefined

```js
queryString.stringify(
  { q: 'shoes', category: null, page: undefined, sort: 'price' },
  { skipNull: true }
)
// 'q=shoes&sort=price'
// null and undefined are both skipped ✅
```

### `skipEmptyString` — Skip Empty Strings

```js
queryString.stringify(
  { q: '', category: 'shoes', search: '', sort: 'price' },
  { skipEmptyString: true }
)
// 'category=shoes&sort=price'
// Empty strings are skipped ✅
```

### Both Together — Most Useful for Filter Forms

```js
const filters = {
  q:        '',        // user cleared search
  category: 'shoes',  // active
  brand:    null,      // user cleared brand
  sort:     'price',  // active
  page:     1,        // active
  limit:    undefined  // not set
}

queryString.stringify(filters, {
  skipNull:        true,
  skipEmptyString: true
})
// 'category=shoes&page=1&sort=price'
// Only non-empty, non-null values ✅
```

### Null Values on Parse — `parseNulls`

Some APIs represent null values as the string `"null"`:

```js
// Without parseNulls: true
queryString.parse('?brand=null&status=active')
// { brand: 'null', status: 'active' }  ← 'null' is a string

// With parseNulls: true
queryString.parse('?brand=null&status=active', { parseNulls: true })
// { brand: null, status: 'active' }  ← null is a proper JS null
```

### Handling Empty Arrays

```js
// Empty array → nothing to serialize — omitted by default
queryString.stringify({ tags: [], sort: 'price' })
// 'sort=price'  ← tags omitted because empty array has no items ✅

// Array with null items
queryString.stringify({ tags: [null, 'js', undefined, 'react'] }, { skipNull: true })
// 'tags=js&tags=react'  ← null/undefined items filtered out
```

### Clean Filter Utility Function

```js
function cleanParams(params) {
  return Object.fromEntries(
    Object.entries(params).filter(([, v]) => {
      if (v === null || v === undefined) return false
      if (v === '') return false
      if (Array.isArray(v) && v.length === 0) return false
      return true
    })
  )
}

// Usage
const raw = { q: '', brand: ['nike'], category: null, page: 2, tags: [] }
const clean = cleanParams(raw)
// { brand: ['nike'], page: 2 }

queryString.stringify(clean)
// 'brand=nike&page=2'
```

---

## W — Why It Matters

- Sending `?q=` to a search endpoint often returns zero results or triggers a validation error — the backend treats it as an explicit empty-string search, not "no search".
- URLs with `?category=&brand=&sort=` are not shareable — they look like errors and may confuse users.
- `skipNull: true` + `skipEmptyString: true` is the production-grade pattern for filter forms — always apply it when building URLs from form state.
- Understanding the asymmetry (`null` is dropped by default but `''` is not) prevents the most common "why is my empty filter in the URL?" bug.

---

## I — Interview Q&A

### Q1: What does `skipNull: true` do in `queryString.stringify()`?

**A:** It omits keys whose values are `null` or `undefined` from the output. Without it, `null` values are also omitted by default but this behavior is documented — `skipNull: true` makes the intent explicit and also ensures `undefined` is skipped. Best practice is to always include it when building URLs from form or filter state.

### Q2: Why is an empty string `""` NOT skipped by default in `query-string`?

**A:** An empty string is a valid value that a developer might intentionally want to include in some contexts. `query-string` errs on the side of inclusion to avoid data loss. Use `skipEmptyString: true` explicitly when you want empty strings omitted — which is almost always the right choice for filter UIs.

### Q3: What's the difference between a key with a `null` value and a key that's absent from the query string?

**A:** Semantically they mean the same thing in REST — the param has no value. In query-string, both map to `undefined` on parse. The distinction only matters when you need to explicitly signal "this was cleared" vs "was never set" — in practice, treat both as "not active" and use `skipNull` to omit both from URLs.

---

## C — Common Pitfalls + Fix

### ❌ Pitfall: Not cleaning filter state before building URL

```js
// Form state after user clears all filters
const filters = { q: '', category: null, brand: undefined, sort: 'price', page: 1 }

queryString.stringify(filters)
// 'q=&page=1&sort=price'
// ← q='' is included, may break API
```

**Fix:**

```js
queryString.stringify(filters, { skipNull: true, skipEmptyString: true })
// 'page=1&sort=price'  ✅
```

### ❌ Pitfall: Treating `"null"` string from URL as JS `null`

```js
const { brand } = queryString.parse('?brand=null')
if (brand === null) {
  // Never true — brand is the string 'null'
}
```

**Fix:**

```js
const { brand } = queryString.parse('?brand=null', { parseNulls: true })
if (brand === null) {
  // ✅ true
}
```

### ❌ Pitfall: Sending an empty array in the URL

```js
queryString.stringify({ brands: [] }, { arrayFormat: 'bracket' })
// '' ← empty string — no params at all
// Some backends see missing 'brands' param and return ALL brands (unfiltered)
// vs expected: return results with NO brands matched
```

**Fix:** Either skip empty arrays (`cleanParams`) or use a sentinel value to signal "none selected":

```js
// Sentinel approach — explicit "none" value
queryString.stringify({ brands: brands.length > 0 ? brands : undefined }, { skipNull: true })
```

---

## K — Coding Challenge + Solution

### Challenge

Build a `filterStateToUrl(baseUrl, filterState)` function for a product listing. The filter state may have null, undefined, empty string, and empty array values — all should be omitted:

```js
filterStateToUrl('/products', {
  q:        '',
  category: 'shoes',
  brand:    [],
  minPrice: null,
  maxPrice: 200,
  inStock:  true,
  sort:     'price',
  order:    undefined,
  page:     1
})
// '/products?category=shoes&inStock=true&maxPrice=200&page=1&sort=price'
```

### Solution

```js
import queryString from 'query-string'

function filterStateToUrl(baseUrl, filterState) {
  // Remove all falsy/empty values
  const cleaned = Object.fromEntries(
    Object.entries(filterState).filter(([, v]) => {
      if (v === null || v === undefined) return false
      if (v === '') return false
      if (Array.isArray(v) && v.length === 0) return false
      return true
    })
  )

  return queryString.stringifyUrl(
    { url: baseUrl, query: cleaned },
    {
      skipNull:        true,
      skipEmptyString: true,
      arrayFormat:     'comma'
    }
  )
}

console.log(filterStateToUrl('/products', {
  q: '', category: 'shoes', brand: [], minPrice: null,
  maxPrice: 200, inStock: true, sort: 'price', order: undefined, page: 1
}))
// '/products?category=shoes&inStock=true&maxPrice=200&page=1&sort=price'
```

---

---
