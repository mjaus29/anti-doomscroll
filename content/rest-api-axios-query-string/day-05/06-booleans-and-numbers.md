# 6 — Booleans and Numbers

---

## T — TL;DR

URL query strings are always **strings**. `query-string` can auto-convert `"true"/"false"` to booleans and `"2"` to numbers during parse. On stringify, JS booleans and numbers are serialized correctly. Know the options so you never write `parseInt()` in a filter handler again.

---

## K — Key Concepts

### The Type Problem

```js
// URL always produces strings
window.location.search  // '?page=2&active=true&limit=20'

// Native URLSearchParams — all strings
new URLSearchParams('?page=2&active=true').get('page')    // '2' (string)
new URLSearchParams('?page=2&active=true').get('active')  // 'true' (string)

// query-string default — also all strings
queryString.parse('?page=2&active=true')
// { page: '2', active: 'true' }
```

### Auto-Convert on Parse

```js
// parseNumbers: true
queryString.parse('?page=2&limit=20&price=99.99', { parseNumbers: true })
// { page: 2, limit: 20, price: 99.99 }  ← numbers ✅

// parseBooleans: true
queryString.parse('?active=true&featured=false&hidden=true', { parseBooleans: true })
// { active: true, featured: false, hidden: true }  ← booleans ✅

// Both together — the most useful combination
queryString.parse('?page=2&active=true&q=shoes', {
  parseNumbers:  true,
  parseBooleans: true
})
// { page: 2, active: true, q: 'shoes' }
```

### Auto-Serialize on Stringify

Numbers and booleans stringify correctly without any options:

```js
queryString.stringify({ page: 2, active: true, featured: false, price: 99.99 })
// 'active=true&featured=false&page=2&price=99.99'
// Numbers and booleans converted to their string representations automatically
```

### Edge Cases — What Gets Converted and What Doesn't

```js
// parseNumbers: true — what qualifies as a number?
queryString.parse('?a=2&b=3.14&c=1e5&d=NaN&e=abc123&f=0', { parseNumbers: true })
// {
//   a: 2,        ← integer ✅
//   b: 3.14,     ← float ✅
//   c: 100000,   ← scientific notation ✅
//   d: NaN,      ← NaN (still a number type in JS!)
//   e: 'abc123', ← string — not a pure number, kept as string ✅
//   f: 0         ← zero ✅
// }

// parseBooleans: true — ONLY exact 'true' and 'false' strings
queryString.parse('?a=true&b=false&c=TRUE&d=1&e=yes', { parseBooleans: true })
// {
//   a: true,    ← boolean ✅
//   b: false,   ← boolean ✅
//   c: 'TRUE',  ← NOT converted — case-sensitive!
//   d: '1',     ← NOT converted — only 'true'/'false'
//   e: 'yes'    ← NOT converted
// }
```

### Numbers on Stringify — Avoid Floating Point Issues

```js
// JS floating point
queryString.stringify({ price: 0.1 + 0.2 })
// 'price=0.30000000000000004'  ← floating point artifact

// Fix: round before stringify
queryString.stringify({ price: Math.round((0.1 + 0.2) * 100) / 100 })
// 'price=0.3'  ✅
```

### Type-Safe Parse Utility

```js
function parseQueryParams(search) {
  const raw = queryString.parse(search, {
    parseNumbers:  true,
    parseBooleans: true,
    arrayFormat:   'comma'
  })

  return {
    q:       typeof raw.q === 'string'  ? raw.q        : '',
    page:    typeof raw.page === 'number' && raw.page > 0 ? raw.page : 1,
    limit:   typeof raw.limit === 'number' ? raw.limit  : 20,
    sort:    typeof raw.sort === 'string'  ? raw.sort   : 'createdAt',
    order:   raw.order === 'asc' || raw.order === 'desc' ? raw.order : 'desc',
    active:  typeof raw.active  === 'boolean' ? raw.active  : null,
    tags:    raw.tags ? [raw.tags].flat().filter(Boolean) : []
  }
}
```

---

## W — Why It Matters

- Without type parsing, `page + 1` in pagination logic does string concatenation (`'2' + 1 = '21'`) — a silent bug that produces a valid-looking but wrong URL.
- `parseBooleans: true` eliminates `filter.active === 'true'` scattered through component code — a code smell that signals missing type normalization.
- Understanding that `parseBooleans` is case-sensitive (`'true'` only, not `'True'` or `'TRUE'`) prevents a subtle bug when API responses or legacy URLs use different casing.
- The type-safe parse utility pattern (normalize after parse) is the production-grade approach — `parseNumbers: true` alone isn't sufficient when users can manually type in URLs.

---

## I — Interview Q&A

### Q1: What options enable type coercion in `query-string.parse()`?

**A:** `parseNumbers: true` converts numeric strings to JavaScript numbers. `parseBooleans: true` converts the exact strings `"true"` and `"false"` to their boolean equivalents. Both can be used together and should be when your filter state uses typed values.

### Q2: Does `parseBooleans: true` convert `"1"` to `true`?

**A:** No. `parseBooleans: true` only converts the exact strings `"true"` and `"false"` — it is case-sensitive and exact. `"1"`, `"yes"`, `"on"`, and `"TRUE"` are NOT converted. Use `parseNumbers: true` alongside if you need `"1"` and `"0"` as numbers.

### Q3: How do you handle the case where a user manually types an invalid page number in the URL?

**A:** Always validate after parsing. `parseNumbers: true` converts `"2"` to `2` but `"abc"` stays as `"abc"`. Check `typeof parsed.page === 'number' && parsed.page > 0 && Number.isFinite(parsed.page)` and fall back to a default (`1`) if invalid. Never trust raw URL input.

---

## C — Common Pitfalls + Fix

### ❌ Pitfall: String arithmetic in pagination

```js
const { page } = queryString.parse('?page=2')  // page = '2' string
const next = page + 1  // '21' ← string concatenation!
router.push(`/products?page=${next}`)  // ?page=21 ← wrong
```

**Fix:**

```js
const { page } = queryString.parse('?page=2', { parseNumbers: true })
const next = page + 1  // 3 ✅
```

### ❌ Pitfall: Comparing boolean string to actual boolean

```js
const { active } = queryString.parse('?active=true')  // active = 'true' (string)
if (active === true) { ... }   // ❌ false — string !== boolean
if (active === 'true') { ... } // ✅ works but is a code smell
```

**Fix:**

```js
const { active } = queryString.parse('?active=true', { parseBooleans: true })
if (active === true) { ... }  // ✅ real boolean comparison
```

### ❌ Pitfall: Not guarding against `NaN` from `parseNumbers`

```js
const { page } = queryString.parse('?page=abc', { parseNumbers: true })
// page = NaN  ← 'abc' is not a number
const offset = (page - 1) * 20  // NaN ← all math with NaN is NaN
```

**Fix:**

```js
const { page: rawPage } = queryString.parse(search, { parseNumbers: true })
const page = (typeof rawPage === 'number' && Number.isFinite(rawPage) && rawPage > 0)
  ? rawPage
  : 1  // safe default
```

---

## K — Coding Challenge + Solution

### Challenge

Write `parsePaginationParams(searchString)` that:
1. Parses `page`, `limit`, `sort`, `order` from a URL search string
2. Auto-converts types
3. Validates and applies safe defaults for all four values
4. Clamps `limit` between 1 and 100

```js
parsePaginationParams('?page=3&limit=50&sort=price&order=asc')
// { page: 3, limit: 50, sort: 'price', order: 'asc' }

parsePaginationParams('?page=0&limit=999&sort=hack&order=up')
// { page: 1, limit: 100, sort: 'createdAt', order: 'desc' }  ← all invalid → defaults
```

### Solution

```js
import queryString from 'query-string'

const VALID_SORTS  = ['createdAt', 'price', 'name', 'rating', 'updatedAt']
const VALID_ORDERS = ['asc', 'desc']

function parsePaginationParams(searchString) {
  const raw = queryString.parse(searchString, {
    parseNumbers:  true,
    parseBooleans: true
  })

  const page = (
    typeof raw.page === 'number' &&
    Number.isFinite(raw.page) &&
    raw.page >= 1
  ) ? Math.floor(raw.page) : 1

  const limit = (
    typeof raw.limit === 'number' &&
    Number.isFinite(raw.limit) &&
    raw.limit >= 1
  ) ? Math.min(Math.floor(raw.limit), 100) : 20

  const sort  = VALID_SORTS.includes(raw.sort)   ? raw.sort  : 'createdAt'
  const order = VALID_ORDERS.includes(raw.order) ? raw.order : 'desc'

  return { page, limit, sort, order }
}

// Tests
console.log(parsePaginationParams('?page=3&limit=50&sort=price&order=asc'))
// { page: 3, limit: 50, sort: 'price', order: 'asc' }

console.log(parsePaginationParams('?page=0&limit=999&sort=hack&order=up'))
// { page: 1, limit: 100, sort: 'createdAt', order: 'desc' }

console.log(parsePaginationParams('?page=abc'))
// { page: 1, limit: 20, sort: 'createdAt', order: 'desc' }
```

---

---
