# 2 — Parse — Reading Query Strings

---

## T — TL;DR

`queryString.parse()` converts a URL query string into a **plain JavaScript object**. It handles decoding, type coercion, and edge cases that manual string splitting always gets wrong.

---

## K — Key Concepts

### Installation

```bash
npm install query-string
# or
yarn add query-string
# or
pnpm add query-string
```

### The Simplest Parse

```js
import queryString from 'query-string'

const parsed = queryString.parse('?name=Mark&role=admin&page=2')
console.log(parsed)
// { name: 'Mark', role: 'admin', page: '2' }
```

> ⚠️ By default, all values are **strings**. Use `parseNumbers: true` to auto-convert.

### Parsing from `window.location.search`

```js
// Current URL: https://myapp.com/products?category=shoes&page=2&sort=price

const params = queryString.parse(window.location.search)
console.log(params)
// { category: 'shoes', page: '2', sort: 'price' }
```

### Parsing from React Router / Next.js

```js
// React Router v6
import { useLocation } from 'react-router-dom'
import queryString from 'query-string'

function ProductsPage() {
  const location = useLocation()
  const params = queryString.parse(location.search)

  console.log(params.category)  // 'shoes'
  console.log(params.page)      // '2' (string by default)
}

// Next.js App Router
'use client'
import { useSearchParams } from 'next/navigation'
import queryString from 'query-string'

function ProductsPage() {
  const searchParams = useSearchParams()
  const params = queryString.parse(searchParams.toString())
}
```

### Parse Options

```js
// ─── parseNumbers: auto-convert numeric strings to numbers
queryString.parse('?page=2&limit=20', { parseNumbers: true })
// { page: 2, limit: 20 }   ← numbers, not strings

// ─── parseBooleans: auto-convert "true"/"false" to booleans
queryString.parse('?active=true&featured=false', { parseBooleans: true })
// { active: true, featured: false }

// ─── Both together (most useful combination)
queryString.parse('?page=2&active=true&q=shoes', {
  parseNumbers:  true,
  parseBooleans: true
})
// { page: 2, active: true, q: 'shoes' }

// ─── decode: handle URL encoding (default: true)
queryString.parse('?q=rock%20%26%20roll')
// { q: 'rock & roll' }  ← decoded automatically

// ─── decode: false — keep raw encoded values
queryString.parse('?q=rock%20%26%20roll', { decode: false })
// { q: 'rock%20%26%20roll' }
```

### Parse with Array Support

```js
// Repeated keys → array
queryString.parse('?brand=nike&brand=adidas&brand=puma')
// { brand: ['nike', 'adidas', 'puma'] }

// Bracket notation → array
queryString.parse('?brand[]=nike&brand[]=adidas', { arrayFormat: 'bracket' })
// { brand: ['nike', 'adidas'] }

// Comma-separated → array
queryString.parse('?brand=nike,adidas,puma', { arrayFormat: 'comma' })
// { brand: ['nike', 'adidas', 'puma'] }
```

### `parseUrl` — Parse URL + Path Together

```js
const result = queryString.parseUrl(
  'https://myapp.com/products?category=shoes&page=2'
)

console.log(result)
// {
//   url: 'https://myapp.com/products',
//   query: { category: 'shoes', page: '2' }
// }

// Destructure cleanly
const { url, query } = queryString.parseUrl(window.location.href)
```

---

## W — Why It Matters

- `window.location.search.split('&')` is fragile — it breaks on encoded characters, empty values, and arrays.
- `query-string.parse()` handles ALL edge cases: encoded characters, arrays, numbers, booleans, missing `?`, empty values.
- `parseNumbers` + `parseBooleans` eliminates the manual type-coercion that pollutes every component that reads URL state.
- `parseUrl` is the cleanest way to get both the base URL and params from a full URL string — useful for link processing and redirect handling.

---

## I — Interview Q&A

### Q1: Why use `query-string.parse()` instead of `new URLSearchParams()`?

**A:** `URLSearchParams` is a native browser API and works well for simple cases. `query-string` adds: configurable array formats (`bracket`, `comma`, `index`), automatic number/boolean parsing, `null` value support, and stable cross-platform behavior. For complex filter/sort state with arrays and typed values, `query-string` handles edge cases that `URLSearchParams` doesn't.

### Q2: What does `parseNumbers: true` do and when would you use it?

**A:** It automatically converts numeric string values to JavaScript numbers during parsing. `?page=2` becomes `{ page: 2 }` instead of `{ page: '2' }`. Use it whenever you need to do arithmetic on parsed values (pagination calculations, price comparisons) without manual `parseInt()`/`parseFloat()` calls.

### Q3: What happens when `query-string.parse()` encounters a repeated key?

**A:** By default, repeated keys produce an array: `?brand=nike&brand=adidas` → `{ brand: ['nike', 'adidas'] }`. A single occurrence produces a string. This is the default behavior — use `arrayFormat` options to control the exact format (bracket, comma, index).

---

## C — Common Pitfalls + Fix

### ❌ Pitfall: Forgetting that all values are strings by default

```js
const { page } = queryString.parse('?page=2')
const nextPage = page + 1  // "21" ← string concatenation, not addition!
```

**Fix:**

```js
const { page } = queryString.parse('?page=2', { parseNumbers: true })
const nextPage = page + 1  // 3 ✅
```

### ❌ Pitfall: Passing the full URL instead of just the search string

```js
// ❌ Includes the path — parse gets confused
queryString.parse('https://myapp.com/products?page=2')
// { 'https://myapp.com/products?page': '2' }  ← wrong
```

**Fix:** Use `parse` for search-only, `parseUrl` for full URLs:

```js
queryString.parse(window.location.search)  // just '?page=2'
queryString.parseUrl(window.location.href)  // full URL — returns { url, query }
```

### ❌ Pitfall: Not handling single vs array inconsistency

```js
// One brand in URL: ?brand=nike
const { brand } = queryString.parse('?brand=nike')
brand.map(...)  // TypeError: brand.map is not a function — brand is a STRING

// Two brands: ?brand=nike&brand=adidas
const { brand } = queryString.parse('?brand=nike&brand=adidas')
brand.map(...)  // ✅ brand is an array
```

**Fix:** Always normalize to an array:

```js
const { brand } = queryString.parse(search)
const brands = [brand].flat().filter(Boolean)
// Always an array, whether 0, 1, or many values
```

---

## K — Coding Challenge + Solution

### Challenge

Write a `parseFilters(searchString)` function that:
1. Parses the URL search string
2. Auto-converts numbers and booleans
3. Returns `brands` always as an array (even if single or missing)
4. Returns `page` as a number, defaulting to `1` if missing
5. Returns `limit` as a number, defaulting to `20` if missing

```js
parseFilters('?category=shoes&brand=nike&page=3&in-stock=true')
// {
//   category: 'shoes',
//   brand: ['nike'],
//   page: 3,
//   limit: 20,
//   'in-stock': true
// }
```

### Solution

```js
import queryString from 'query-string'

function parseFilters(searchString) {
  const raw = queryString.parse(searchString, {
    parseNumbers:  true,
    parseBooleans: true,
    arrayFormat:   'none'  // repeated keys → array
  })

  return {
    ...raw,
    // Normalize brand to always be an array
    brand: raw.brand
      ? [raw.brand].flat().filter(Boolean)
      : [],
    // Default pagination values
    page:  typeof raw.page  === 'number' ? raw.page  : 1,
    limit: typeof raw.limit === 'number' ? raw.limit : 20
  }
}

// Tests
console.log(parseFilters('?category=shoes&brand=nike&page=3&in-stock=true'))
// { category: 'shoes', brand: ['nike'], page: 3, limit: 20, 'in-stock': true }

console.log(parseFilters('?brand=nike&brand=adidas'))
// { brand: ['nike', 'adidas'], page: 1, limit: 20 }

console.log(parseFilters(''))
// { brand: [], page: 1, limit: 20 }
```

---

---
