
# 📅 Day 5 — query-string Integration for Frontend Developers

> **Goal:** Master the `query-string` library — the standard tool for parsing, building, and syncing URL query parameters. Stop concatenating strings manually and start treating URL state like first-class data.
> **Format:** Each subtopic = 5–15 min. Do one. Stop. Come back.

---

## 📋 Day 5 Subtopic Overview

| # | Subtopic | Time |
|---|----------|------|
| 1 | Query Parameter Design Rules | 10 min |
| 2 | Parse — Reading Query Strings | 10 min |
| 3 | Stringify — Building Query Strings | 10 min |
| 4 | Encoding & Decoding | 10 min |
| 5 | Arrays & `arrayFormat` Options | 15 min |
| 6 | Booleans and Numbers | 10 min |
| 7 | Null & Empty Value Handling | 10 min |
| 8 | Repeated Keys | 10 min |
| 9 | Stable Serialization | 10 min |
| 10 | Search / Filter / Sort / Page URL State | 15 min |
| 11 | Custom Separators | 8 min |
| 12 | `query-string` as Axios `paramsSerializer` | 15 min |

---

---

# 1 — Query Parameter Design Rules

---

## T — TL;DR

Query parameters are the **public API of your URL**. Design them like you design a REST API — consistent naming, predictable types, no leaking implementation details. Get the rules right before writing a single line of code.

---

## K — Key Concepts

### What Belongs in a Query String

```
URL path   = WHAT resource you're accessing (required, identity)
Query string = HOW you want it (optional, modification)

/products                       ← the resource
/products?category=shoes        ← filtered by category
/products?sort=price&order=asc  ← sorted
/products?page=2&limit=20       ← paginated
/products?q=nike+air            ← searched
```

### The Core Design Rules

#### Rule 1: Use Kebab-Case for Parameter Names

```
✅ ?sort-by=price
✅ ?created-after=2026-01-01
✅ ?per-page=20

❌ ?sortBy=price        ← camelCase — not URL convention
❌ ?sort_by=price       ← snake_case — acceptable but inconsistent
❌ ?SortBy=price        ← PascalCase — never
```

> In practice, `camelCase` is also widely accepted (used by many APIs). Pick one and never mix.

#### Rule 2: Use Nouns for Filter Keys, Not Verb Phrases

```
✅ ?status=active
✅ ?category=shoes
✅ ?author=mark

❌ ?filterByStatus=active
❌ ?showOnlyCategory=shoes
```

#### Rule 3: Consistent Sort Convention

```
✅ ?sort=price&order=asc
✅ ?sort=price&order=desc

❌ ?sortField=price&direction=ascending  ← verbose, inconsistent
❌ ?orderby=price&dir=asc               ← inconsistent
```

Or use the minus-prefix convention (popular in JSON API):

```
✅ ?sort=price      ← ascending (default)
✅ ?sort=-price     ← minus prefix = descending
```

#### Rule 4: Consistent Pagination Convention

```
✅ ?page=2&limit=20       ← page + limit (most common)
✅ ?page=2&per_page=20    ← page + per_page (GitHub style)
✅ ?offset=40&limit=20    ← offset + limit

❌ ?p=2&l=20   ← cryptic abbreviations
```

#### Rule 5: Boolean Flags — Be Explicit

```
✅ ?featured=true
✅ ?in-stock=false
✅ ?published=1

❌ ?featured          ← present = true? or just a flag? ambiguous in some parsers
```

#### Rule 6: Dates — Always ISO 8601

```
✅ ?from=2026-01-01
✅ ?created-after=2026-01-01T10:30:00Z

❌ ?from=01/01/2026   ← locale-dependent, ambiguous
❌ ?from=Jan+1+2026   ← human format, not parseable
```

#### Rule 7: Don't Expose Internal Implementation Details

```
✅ ?status=active
✅ ?category=shoes

❌ ?db_field=status          ← internal field name
❌ ?tbl_products_cat_id=5   ← database column name
❌ ?sql_where=status='active' ← never
```

#### Rule 8: Omit Defaults — Only Include Non-Default Values

```
// If default page is 1 and default limit is 20:
✅ /products?category=shoes        ← clean (no page/limit = use defaults)
❌ /products?category=shoes&page=1&limit=20  ← redundant noise
```

### Full URL Anatomy with Well-Designed Params

```
/products?category=shoes&brand=nike&min-price=50&max-price=200&sort=price&order=asc&page=2&limit=20&q=air+max

Breakdown:
  category=shoes          ← filter: category is shoes
  brand=nike              ← filter: brand is nike
  min-price=50            ← filter: price range lower bound
  max-price=200           ← filter: price range upper bound
  sort=price              ← sort field
  order=asc               ← sort direction
  page=2                  ← pagination: page number
  limit=20                ← pagination: items per page
  q=air+max               ← search query
```

---

## W — Why It Matters

- Well-designed query params make URLs **bookmarkable, shareable, and linkable** — the filter/sort state persists in the URL.
- Consistent naming conventions mean your frontend URL state maps directly to API params — zero translation layer needed.
- Bad param design (cryptic names, inconsistent types) makes debugging, logging, and analytics a nightmare.
- This is the foundation for all of Day 5 — everything else builds on knowing what query params should look like.

---

## I — Interview Q&A

### Q1: What should go in query parameters vs path parameters?

**A:** Path parameters identify a specific resource — required for the request to make sense (`/users/42`). Query parameters modify how a collection is retrieved — optional filters, sorts, pagination, and search terms. Query params should only appear after `?` and never in the path segments.

### Q2: How should boolean query parameters be handled?

**A:** Use explicit `true`/`false` strings (`?featured=true`) rather than presence/absence of the key (`?featured`). Bare keys are ambiguous across parsers — some treat presence as `true`, others as the empty string. Explicit values are always unambiguous and work consistently across all parsers and languages.

### Q3: What's wrong with using camelCase in query parameter names?

**A:** URLs are case-sensitive in path segments but case-insensitive in practice for query strings — however, the convention is lowercase with hyphens for readability. camelCase breaks the visual separation between words in a raw URL and is inconsistent with the rest of URL anatomy. Kebab-case (`sort-by`) or snake_case (`sort_by`) are both acceptable; camelCase is not recommended.

---

## C — Common Pitfalls + Fix

### ❌ Pitfall: Encoding business logic in parameter values

```
?filter=status:active,price:100-200,brand:nike
```

**Fix:** Each filter is its own named parameter:

```
?status=active&min-price=100&max-price=200&brand=nike
```

### ❌ Pitfall: Non-standard date formats

```
?date=05-19-2026    ← MM-DD-YYYY, locale-specific
?date=May+19+2026   ← human-readable, not parseable
```

**Fix:** Always use ISO 8601:

```
?date=2026-05-19
?created-after=2026-05-19T00:00:00Z
```

### ❌ Pitfall: Using page=0 as the first page

```
?page=0   ← confusing — is page 0 the first page or does it mean "all"?
```

**Fix:** Start at page 1. It's what users expect and what most APIs use:

```
?page=1&limit=20    ← first page
?page=2&limit=20    ← second page
```

---

## K — Coding Challenge + Solution

### Challenge

You have a product listing page. Design the complete query parameter schema for these features:

```
1. Text search
2. Filter by category (single value)
3. Filter by brand (multiple values allowed)
4. Price range (min and max)
5. In-stock only toggle
6. Sort by price, name, or rating
7. Sort direction (ascending or descending)
8. Pagination (page number + items per page, default 20)
```

Write an example URL with all filters active.

### Solution

```
Schema:

q           → string (search query)
category    → string (single category)
brand       → string[] (multiple brands)
min-price   → number
max-price   → number
in-stock    → boolean (true/false)
sort        → 'price' | 'name' | 'rating'
order       → 'asc' | 'desc'
page        → number (1-based)
limit       → number (default: 20, max: 100)

Example URL:
/products?q=running+shoe
          &category=footwear
          &brand=nike&brand=adidas
          &min-price=50
          &max-price=300
          &in-stock=true
          &sort=price
          &order=asc
          &page=1
          &limit=20
```

---

---

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

# 4 — Encoding & Decoding

---

## T — TL;DR

URL encoding converts unsafe characters (spaces, `&`, `+`, `/`) into percent-encoded sequences. `query-string` **encodes on stringify** and **decodes on parse** automatically. Knowing when and how to override this prevents double-encoding bugs.

---

## K — Key Concepts

### Why URL Encoding Exists

URLs have reserved characters with special meanings:

```
?   → starts query string
&   → separates key=value pairs
=   → separates key from value
+   → represents a space (in query strings)
#   → starts fragment
/   → path separator
%   → starts percent-encoded sequence
```

If your data contains these characters, they must be escaped:

```
"rock & roll"  →  rock%20%26%20roll   (RFC 3986 percent-encoding)
"C++"          →  C%2B%2B
"hello world"  →  hello%20world
"price=100"    →  price%3D100
```

### Automatic Encoding on Stringify

```js
import queryString from 'query-string'

queryString.stringify({ q: 'rock & roll', tag: 'C++' })
// 'q=rock%20%26%20roll&tag=C%2B%2B'  ← encoded automatically

queryString.stringify({ name: 'Iñárritu', city: 'São Paulo' })
// 'city=S%C3%A3o%20Paulo&name=I%C3%B1%C3%A1rritu'  ← Unicode encoded
```

### Automatic Decoding on Parse

```js
queryString.parse('?q=rock%20%26%20roll&tag=C%2B%2B')
// { q: 'rock & roll', tag: 'C++' }  ← decoded automatically

queryString.parse('?name=I%C3%B1%C3%A1rritu')
// { name: 'Iñárritu' }  ← Unicode decoded
```

### Encoding Modes

`query-string` supports two encoding modes:

```js
// Default: RFC 3986 (strict — percent-encodes everything)
queryString.stringify({ q: 'hello world' })
// 'q=hello%20world'

// 'percent' mode — same as RFC 3986
queryString.stringify({ q: 'hello world' }, { encodeValuesOnly: false })
// 'q=hello%20world'

// encodeValuesOnly: true — don't encode the key names
queryString.stringify({ 'my key': 'my value' }, { encodeValuesOnly: true })
// 'my key=my%20value'  ← key not encoded, value is
// Useful when key names are static and safe

// encode: false — no encoding at all (dangerous)
queryString.stringify({ q: 'hello world & more' }, { encode: false })
// 'q=hello world & more'  ← broken URL!
```

### Encoding Modes Compared

| Mode | Keys | Values | Use Case |
|---|---|---|---|
| Default (`encode: true`) | Encoded | Encoded | Safe default |
| `encodeValuesOnly: true` | NOT encoded | Encoded | Known-safe static keys |
| `encode: false` | NOT encoded | NOT encoded | Debugging only |

### `+` vs `%20` for Spaces

```js
// Default: %20 (RFC 3986 standard)
queryString.stringify({ q: 'hello world' })
// 'q=hello%20world'

// Some APIs expect + for spaces (application/x-www-form-urlencoded)
// query-string uses %20 by default — check your API's expectation
// Both decode to "hello world" correctly in browsers
```

### Manual Encode/Decode (Rarely Needed)

```js
// When you need to encode a single value manually
encodeURIComponent('rock & roll')  // 'rock%20%26%20roll'
decodeURIComponent('rock%20%26%20roll')  // 'rock & roll'

// Do NOT use encodeURI() — it doesn't encode &, =, ? which are needed
encodeURI('rock & roll')  // 'rock%20&%20roll'  ← & not encoded! Wrong for query strings
```

---

## W — Why It Matters

- Double-encoding (`%2526` instead of `%26`) is a common bug that happens when you manually encode and then pass to a library that encodes again — understanding the automatic behavior prevents this.
- `encodeValuesOnly` is a performance micro-optimization when your keys are guaranteed to be URL-safe strings (e.g., lowercase English only).
- Using `encode: false` is only safe for debugging — never in production. Knowing why prevents it from slipping into production code.
- `%20` vs `+` space encoding is a subtle bug in some API integrations — you need to know which encoding your specific API expects.

---

## I — Interview Q&A

### Q1: What's the difference between `encodeURI` and `encodeURIComponent`?

**A:** `encodeURI` is for encoding a full URL — it doesn't encode characters that have special meaning in URL structure (`/`, `?`, `&`, `=`, `#`). `encodeURIComponent` is for encoding a value within a URL — it encodes everything including `&`, `=`, and `?`. For query parameter values, always use `encodeURIComponent`. `query-string` uses the correct encoding automatically.

### Q2: What causes double-encoding and how do you prevent it?

**A:** Double-encoding happens when you manually call `encodeURIComponent()` on a value and then pass it to a library that also encodes. Result: `%` gets encoded to `%25`, producing `%2520` for a space instead of `%20`. Prevention: let `query-string` or `URLSearchParams` handle encoding — never manually encode values you're going to pass to these libraries.

### Q3: Why does `query-string` use `%20` instead of `+` for spaces?

**A:** `%20` is the RFC 3986 standard for percent-encoding spaces in URLs. `+` for spaces is from the `application/x-www-form-urlencoded` specification (HTML form submissions). Both decode correctly in modern browsers, but `%20` is unambiguous — `+` can also mean a literal plus sign in some contexts, creating ambiguity. `query-string` defaults to the unambiguous standard.

---

## C — Common Pitfalls + Fix

### ❌ Pitfall: Manually encoding before passing to `stringify`

```js
const q = 'rock & roll'
queryString.stringify({ q: encodeURIComponent(q) })
// 'q=rock%2520%2526%2520roll'  ← double-encoded!
// %20 → %2520, %26 → %2526
```

**Fix:** Pass the raw value — `query-string` encodes it:

```js
queryString.stringify({ q: 'rock & roll' })
// 'q=rock%20%26%20roll'  ✅
```

### ❌ Pitfall: Using `encode: false` in production

```js
queryString.stringify({ q: 'search & filter' }, { encode: false })
// 'q=search & filter'  ← '&' breaks the query string — creates two params
// Server sees: q=search , filter (empty key)
```

**Fix:** Never use `encode: false` unless you've already encoded the values yourself AND you know exactly why.

### ❌ Pitfall: Using `encodeURI()` on query string values

```js
const url = `?q=${encodeURI('search & filter')}`
// '?q=search%20&%20filter'  ← & not encoded → splits into two params
```

**Fix:** Use `encodeURIComponent()` for values, or just use `queryString.stringify`:

```js
const url = `?${queryString.stringify({ q: 'search & filter' })}`
// '?q=search%20%26%20filter'  ✅
```

---

## K — Coding Challenge + Solution

### Challenge

Given these raw filter values from a search form, build a safe query string. Some values contain special characters that must be encoded:

```js
const filters = {
  q: 'C++ developer & architect',
  city: 'São Paulo',
  tag: 'node.js',
  salary: '$100k+',
  remote: true,
  page: 1
}
// Expected: safely encoded, no nulls, booleans as strings
```

### Solution

```js
import queryString from 'query-string'

const filters = {
  q:      'C++ developer & architect',
  city:   'São Paulo',
  tag:    'node.js',
  salary: '$100k+',
  remote: true,
  page:   1
}

// query-string handles all encoding automatically
const qs = queryString.stringify(filters, {
  skipNull:        true,
  skipEmptyString: true
})

console.log(qs)
// city=S%C3%A3o%20Paulo&page=1&q=C%2B%2B%20developer%20%26%20architect&remote=true&salary=%24100k%2B&tag=node.js

// Verify round-trip
const decoded = queryString.parse(qs, { parseNumbers: true, parseBooleans: true })
console.log(decoded.q)      // 'C++ developer & architect' ✅
console.log(decoded.city)   // 'São Paulo' ✅
console.log(decoded.remote) // true (boolean) ✅
console.log(decoded.page)   // 1 (number) ✅
```

---

---

# 5 — Arrays & `arrayFormat` Options

---

## T — TL;DR

Arrays in query strings have **no universal standard** — different APIs expect different formats. `query-string` supports five formats via `arrayFormat`. Pick the one your backend expects and use it consistently.

---

## K — Key Concepts

### The Five `arrayFormat` Options

Given `{ brand: ['nike', 'adidas', 'puma'] }`:

```js
import queryString from 'query-string'

const brands = { brand: ['nike', 'adidas', 'puma'] }

// ─── 'none' (default) — repeated keys, no brackets
queryString.stringify(brands, { arrayFormat: 'none' })
// 'brand=nike&brand=adidas&brand=puma'

// ─── 'bracket' — key[] notation (PHP/Laravel style)
queryString.stringify(brands, { arrayFormat: 'bracket' })
// 'brand[]=nike&brand[]=adidas&brand[]=puma'

// ─── 'index' — key[0], key[1] notation
queryString.stringify(brands, { arrayFormat: 'index' })
// 'brand[0]=nike&brand[1]=adidas&brand[2]=puma'

// ─── 'comma' — comma-separated single value
queryString.stringify(brands, { arrayFormat: 'comma' })
// 'brand=nike,adidas,puma'

// ─── 'separator' — custom separator (covered in Topic 11)
queryString.stringify(brands, { arrayFormat: 'separator', arrayFormatSeparator: '|' })
// 'brand=nike|adidas|puma'
```

### Parsing Back — Must Match Stringify Format

```js
// Parse 'none' format (default)
queryString.parse('?brand=nike&brand=adidas', { arrayFormat: 'none' })
// { brand: ['nike', 'adidas'] }

// Parse 'bracket' format
queryString.parse('?brand[]=nike&brand[]=adidas', { arrayFormat: 'bracket' })
// { brand: ['nike', 'adidas'] }

// Parse 'comma' format
queryString.parse('?brand=nike,adidas,puma', { arrayFormat: 'comma' })
// { brand: ['nike', 'adidas', 'puma'] }

// ⚠️ WRONG format mismatch:
queryString.parse('?brand=nike,adidas,puma')  // using default 'none' format
// { brand: 'nike,adidas,puma' }  ← single string, NOT an array!
```

### When to Use Each Format

| Format | URL Example | Use When |
|---|---|---|
| `none` | `?a=1&a=2` | Default, most APIs, REST best practice |
| `bracket` | `?a[]=1&a[]=2` | PHP/Laravel backends |
| `index` | `?a[0]=1&a[1]=2` | Need to preserve order explicitly |
| `comma` | `?a=1,2,3` | APIs that expect CSV values, shorter URLs |
| `separator` | `?a=1|2|3` | Custom APIs with non-comma delimiters |

### Single Item vs Array Consistency

A common gotcha — one item returns a string, multiple return an array:

```js
queryString.parse('?brand=nike')              // { brand: 'nike' }    ← string
queryString.parse('?brand=nike&brand=adidas') // { brand: ['nike', 'adidas'] } ← array
```

**Always normalize to array after parsing:**

```js
const { brand } = queryString.parse(search)
const brands = [brand].flat().filter(Boolean)
// brand=nike          → ['nike']
// brand=nike&brand=.. → ['nike', 'adidas']
// (no brand)          → []
```

Or force array mode with `arrayFormat: 'bracket'` (single bracket item is still an array):

```js
// Server sends ?brand[]=nike (single item)
queryString.parse('?brand[]=nike', { arrayFormat: 'bracket' })
// { brand: ['nike'] }  ← always array ✅
```

### Nested Arrays (Not Supported — Workaround)

`query-string` doesn't support deeply nested objects in query strings. Serialize them as JSON strings:

```js
// Nested filter — not directly supported
const filters = { price: { min: 50, max: 200 } }

// Workaround: JSON-encode the nested value
queryString.stringify({ filters: JSON.stringify(filters.price) })
// 'filters=%7B%22min%22%3A50%2C%22max%22%3A200%7D'

// Parse back
const { filters: f } = queryString.parse(qs)
const price = JSON.parse(f)  // { min: 50, max: 200 }
```

> Better design: flatten nested params (`min-price=50&max-price=200`).

---

## W — Why It Matters

- Using the wrong `arrayFormat` is one of the most common bugs in API integration — the backend receives either a single value or a mangled string instead of an array.
- Format mismatch on parse (stringify as `comma`, parse as `none`) silently returns the wrong type — no error thrown.
- The single-item string vs array inconsistency (`{ brand: 'nike' }` vs `{ brand: ['nike', 'adidas'] }`) causes `Cannot read properties of undefined (reading 'map')` errors in production.
- `arrayFormat: 'bracket'` is what Laravel/PHP expect by default — if your backend is PHP, use it.

---

## I — Interview Q&A

### Q1: What are the main `arrayFormat` options and when do you use each?

**A:** `none` (default) — repeated keys, no brackets — works with most REST APIs. `bracket` — `key[]` notation — required for PHP/Laravel. `index` — `key[0]`, `key[1]` — when order must be explicit. `comma` — CSV in a single value — for APIs that expect comma-separated lists. `separator` — custom delimiter. The key rule: always use the same format for both stringify and parse.

### Q2: Why does `query-string.parse('?brand=nike')` return a string instead of an array?

**A:** Without bracket notation, there's no way to distinguish "one value" from "a single-item array" in a query string. `query-string` follows the convention: one occurrence = string, multiple occurrences = array. Always normalize with `[value].flat().filter(Boolean)` to get a consistent array type.

### Q3: What happens if you stringify with `arrayFormat: 'comma'` but parse with the default format?

**A:** The value is returned as a single string containing the comma-separated items, not as an array. `?brand=nike,adidas` with default parse gives `{ brand: 'nike,adidas' }`. Always use the same `arrayFormat` option for both stringify and parse.

---

## C — Common Pitfalls + Fix

### ❌ Pitfall: Assuming a parsed value is always an array

```js
const { brand } = queryString.parse('?brand=nike')
brand.forEach(...)  // TypeError: brand.forEach is not a function
// brand = 'nike' (string), not ['nike'] (array)
```

**Fix — normalize to array:**

```js
const raw = queryString.parse(search)
const brand = [raw.brand].flat().filter(Boolean)
brand.forEach(...)  // ✅ always iterable
```

### ❌ Pitfall: Format mismatch between stringify and parse

```js
// Stringify with comma format
const qs = queryString.stringify({ tags: ['js', 'react'] }, { arrayFormat: 'comma' })
// 'tags=js,react'

// Parse without specifying format — gets wrong result
queryString.parse(`?${qs}`)
// { tags: 'js,react' }  ← string! Not an array.

// Parse WITH matching format — correct
queryString.parse(`?${qs}`, { arrayFormat: 'comma' })
// { tags: ['js', 'react'] }  ✅
```

**Fix:** Always specify the same `arrayFormat` in both `stringify` and `parse`. Define it as a constant:

```js
const ARRAY_FORMAT = { arrayFormat: 'comma' }
queryString.stringify(params, ARRAY_FORMAT)
queryString.parse(search, ARRAY_FORMAT)
```

### ❌ Pitfall: Using `arrayFormat: 'index'` with reordered items

```js
// After filtering/sorting the array in JS:
queryString.stringify({ ids: [3, 1, 2] }, { arrayFormat: 'index' })
// 'ids[0]=3&ids[1]=1&ids[2]=2'
// Server reads index as order hint — may sort by index regardless
```

**Fix:** Use `none` or `bracket` if order is determined by the server, not the index.

---

## K — Coding Challenge + Solution

### Challenge

Write a `MultiSelectFilter` utility that:
1. Accepts an array of selected values
2. Stringifies with `comma` format and `skipNull: true`
3. Parses back from a search string
4. Always returns an array (even for 0 or 1 items)

```js
const qs = serializeMultiSelect({ brands: ['nike', 'adidas'], tags: [] })
// 'brands=nike%2Cadidas'  (tags skipped — empty array)

const parsed = deserializeMultiSelect('?brands=nike,adidas&tags=')
// { brands: ['nike', 'adidas'], tags: [] }
```

### Solution

```js
import queryString from 'query-string'

const OPTIONS = {
  arrayFormat:     'comma',
  skipNull:        true,
  skipEmptyString: true
}

function serializeMultiSelect(params) {
  // Remove empty arrays before stringify
  const cleaned = Object.fromEntries(
    Object.entries(params).filter(([, v]) => {
      if (Array.isArray(v)) return v.length > 0
      return v !== null && v !== undefined && v !== ''
    })
  )
  return queryString.stringify(cleaned, OPTIONS)
}

function deserializeMultiSelect(searchString) {
  const parsed = queryString.parse(searchString, OPTIONS)

  // Normalize all values to arrays
  return Object.fromEntries(
    Object.entries(parsed).map(([key, value]) => [
      key,
      value ? [value].flat().filter(Boolean) : []
    ])
  )
}

// Tests
console.log(serializeMultiSelect({ brands: ['nike', 'adidas'], tags: [] }))
// 'brands=nike%2Cadidas'

console.log(deserializeMultiSelect('?brands=nike,adidas&tags='))
// { brands: ['nike', 'adidas'], tags: [] }

console.log(deserializeMultiSelect('?brands=nike'))
// { brands: ['nike'] }  ← single item still array ✅
```

---

---

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

# 8 — Repeated Keys

---

## T — TL;DR

A **repeated key** (`?a=1&a=2&a=3`) is the URL mechanism for arrays. `query-string` handles them automatically — multiple values for the same key become a JavaScript array. This is the `none` arrayFormat and the most universally supported approach.

---

## K — Key Concepts

### How Repeated Keys Work

```
URL: ?brand=nike&brand=adidas&brand=puma

query-string parses this as:
{ brand: ['nike', 'adidas', 'puma'] }

This is the same as arrayFormat: 'none' (the default)
```

### Producing Repeated Keys with `stringify`

```js
import queryString from 'query-string'

queryString.stringify({ brand: ['nike', 'adidas', 'puma'] })
// Default arrayFormat: 'none'
// 'brand=nike&brand=adidas&brand=puma'  ← repeated keys
```

### Parsing Repeated Keys

```js
// Multiple values → array
queryString.parse('?brand=nike&brand=adidas&brand=puma')
// { brand: ['nike', 'adidas', 'puma'] }

// Single value → string (not array!)
queryString.parse('?brand=nike')
// { brand: 'nike' }  ← string, not ['nike']
// This asymmetry must be handled
```

### Mixed Single and Multi — The Asymmetry Problem

```js
// Sometimes brand is a string, sometimes an array
function getSelectedBrands(searchString) {
  const { brand } = queryString.parse(searchString)
  return [brand].flat().filter(Boolean)
  // 'nike'           → ['nike']
  // ['nike','adidas'] → ['nike', 'adidas']
  // undefined        → []
}
```

### Repeated Keys vs Other Formats — Compatibility Table

```
Server Technology    Preferred Array Format
─────────────────    ──────────────────────
Express.js           none (repeated keys) or bracket
FastAPI (Python)     none (repeated keys) — native support
Django               none (repeated keys) — getlist()
Laravel/PHP          bracket (key[])
Rails (Ruby)         bracket (key[])
Spring (Java)        none (repeated keys)
ASP.NET              none or index
```

### Using Repeated Keys with Axios

```js
// Repeated key format is NOT handled well by Axios params by default
// Axios will send: brand[]=nike&brand[]=adidas (index format)
// NOT: brand=nike&brand=adidas (repeated)

// Fix: use query-string stringify + pass as URL string
const qs = queryString.stringify(
  { brand: ['nike', 'adidas'], sort: 'price' },
  { arrayFormat: 'none' }
)
// 'brand=nike&brand=adidas&sort=price'

axios.get(`/products?${qs}`)
// OR use paramsSerializer — covered in Topic 12
```

---

## W — Why It Matters

- Repeated keys are the most universally supported array format — most server frameworks handle them natively without configuration.
- The single-string vs array asymmetry is the most common query-string array bug in production code — you must normalize.
- Knowing your backend's framework (Express, Django, Laravel, FastAPI) determines which `arrayFormat` to use — wrong format = backend gets no array or an unexpected shape.
- Axios doesn't produce repeated keys by default for array params — understanding this is why `paramsSerializer` (Topic 12) is needed.

---

## I — Interview Q&A

### Q1: What is a "repeated key" in a query string?

**A:** The same key appearing multiple times in the query string, each with a different value: `?color=red&color=blue&color=green`. Most server frameworks collect these into an array. It's the `arrayFormat: 'none'` option in `query-string` and is the most widely supported array format across backend technologies.

### Q2: Why does `query-string.parse('?brand=nike')` return a string but `parse('?brand=nike&brand=adidas')` return an array?

**A:** Without bracket notation, `query-string` has no way to know if a single key is intended as an array or a scalar value. It uses the presence of repetition to infer array intent. One occurrence = string, multiple = array. Always normalize with `[value].flat().filter(Boolean)` after parsing to get a consistent array.

### Q3: Does Axios serialize array params as repeated keys by default?

**A:** No. By default, Axios uses bracket notation (`brand[]=nike&brand[]=adidas`) for arrays passed in the `params` config. To get repeated keys (`brand=nike&brand=adidas`), use a custom `paramsSerializer` powered by `query-string` with `arrayFormat: 'none'`.

---

## C — Common Pitfalls + Fix

### ❌ Pitfall: Calling array methods on a potentially-string value

```js
const { tag } = queryString.parse('?tag=javascript')
// tag = 'javascript' (string)
tag.map(t => t.toUpperCase())  // TypeError: tag.map is not a function
```

**Fix:**

```js
const raw = queryString.parse(search)
const tags = [raw.tag].flat().filter(Boolean)
tags.map(t => t.toUpperCase())  // ✅ always works
```

### ❌ Pitfall: Relying on repeated keys with Axios `params`

```js
// Axios params object with array
axios.get('/products', { params: { brand: ['nike', 'adidas'] } })
// Sends: /products?brand%5B%5D=nike&brand%5B%5D=adidas
// (bracket format, URL-encoded brackets)
// Backend expecting repeated keys gets nothing
```

**Fix:** Use `paramsSerializer` (Topic 12) or pre-stringify:

```js
const qs = queryString.stringify({ brand: ['nike', 'adidas'] }, { arrayFormat: 'none' })
axios.get(`/products?${qs}`)
```

---

## K — Coding Challenge + Solution

### Challenge

Write `parseMultiValueParams(searchString, multiValueKeys)` that:
1. Parses the search string
2. For each key in `multiValueKeys`, always returns an array (even if 0 or 1 items)
3. For all other keys, returns the parsed scalar value

```js
parseMultiValueParams(
  '?brand=nike&tag=js&tag=react&sort=price',
  ['brand', 'tag']
)
// { brand: ['nike'], tag: ['js', 'react'], sort: 'price' }
```

### Solution

```js
import queryString from 'query-string'

function parseMultiValueParams(searchString, multiValueKeys = []) {
  const raw = queryString.parse(searchString, {
    parseNumbers:  true,
    parseBooleans: true
  })

  const result = { ...raw }

  for (const key of multiValueKeys) {
    result[key] = raw[key]
      ? [raw[key]].flat().filter(Boolean)
      : []
  }

  return result
}

// Tests
console.log(
  parseMultiValueParams('?brand=nike&tag=js&tag=react&sort=price', ['brand', 'tag'])
)
// { brand: ['nike'], tag: ['js', 'react'], sort: 'price' }

console.log(
  parseMultiValueParams('?sort=price', ['brand', 'tag'])
)
// { brand: [], tag: [], sort: 'price' }

console.log(
  parseMultiValueParams('?brand=nike&brand=adidas', ['brand', 'tag'])
)
// { brand: ['nike', 'adidas'], tag: [] }
```

---

---

# 9 — Stable Serialization

---

## T — TL;DR

**Stable serialization** means the same params always produce the **same string** — regardless of how the object was constructed. This matters for caching, URL comparison, history deduplication, and testing.

---

## K — Key Concepts

### Why Stability Matters

```js
// Same logical params, different insertion order
const a = { sort: 'price', page: 2, category: 'shoes' }
const b = { category: 'shoes', page: 2, sort: 'price' }

// Manual concatenation — unstable, order-dependent
`sort=${a.sort}&page=${a.page}&category=${a.category}`  // 'sort=price&page=2&category=shoes'
`category=${b.category}&page=${b.page}&sort=${b.sort}`  // 'category=shoes&page=2&sort=price'
// Same params → different strings → cache MISS even though data is identical
```

### Default Alphabetical Sort — Built-in Stability

```js
import queryString from 'query-string'

// Different insertion orders — same output
queryString.stringify({ sort: 'price', page: 2, category: 'shoes' })
// 'category=shoes&page=2&sort=price'  ← alphabetical

queryString.stringify({ category: 'shoes', page: 2, sort: 'price' })
// 'category=shoes&page=2&sort=price'  ← same output ✅

queryString.stringify({ page: 2, sort: 'price', category: 'shoes' })
// 'category=shoes&page=2&sort=price'  ← same output ✅
```

### Custom Sort Order

```js
// Alphabetical (default)
queryString.stringify({ z: 1, a: 2, m: 3 })
// 'a=2&m=3&z=1'

// Preserve insertion order
queryString.stringify({ z: 1, a: 2, m: 3 }, { sort: false })
// 'z=1&a=2&m=3'

// Custom sort — priority fields first
const PRIORITY = ['q', 'category', 'sort', 'order', 'page', 'limit']

queryString.stringify(
  { limit: 20, q: 'shoes', page: 1, category: 'footwear', sort: 'price', order: 'asc' },
  {
    sort: (a, b) => {
      const ai = PRIORITY.indexOf(a)
      const bi = PRIORITY.indexOf(b)
      if (ai === -1 && bi === -1) return a.localeCompare(b)  // both unknown → alphabetical
      if (ai === -1) return 1   // a not in priority → after b
      if (bi === -1) return -1  // b not in priority → after a
      return ai - bi            // both in priority → by index
    }
  }
)
// 'q=shoes&category=footwear&sort=price&order=asc&page=1&limit=20'
```

### Stable Serialization for Cache Keys

```js
// Use stable stringify to build cache keys for API calls
function getCacheKey(endpoint, params) {
  const sortedParams = queryString.stringify(params)  // alphabetical by default
  return `${endpoint}?${sortedParams}`
}

const key1 = getCacheKey('/products', { sort: 'price', page: 2, category: 'shoes' })
const key2 = getCacheKey('/products', { page: 2, category: 'shoes', sort: 'price' })

console.log(key1 === key2)  // true ✅
// Same data → same cache key → cache HIT
```

### Stable Serialization for URL History Deduplication

```js
// Avoid pushing duplicate history entries when params are the same
function updateFilters(newFilters) {
  const currentParams = queryString.parse(window.location.search)
  const newParams     = { ...currentParams, ...newFilters }

  const currentQs = queryString.stringify(currentParams)
  const newQs     = queryString.stringify(newParams)

  if (currentQs === newQs) return  // nothing changed — don't push

  router.push(`/products?${newQs}`)
}
```

---

## W — Why It Matters

- Unstable serialization causes cache misses — the same data is fetched twice because two URLs represent the same query differently.
- React Query, SWR, and TanStack Query all use the query key for caching — a non-deterministic stringify causes every filter change to be treated as a new query.
- History deduplication prevents the back button from cycling through near-identical URL states that differ only in param order.
- Stable serialization is a correctness property, not just a cosmetic one — tests that compare URL strings become flaky without it.

---

## I — Interview Q&A

### Q1: What is stable serialization and why does it matter for caching?

**A:** Stable serialization means the same logical set of parameters always produces the same string output, regardless of object key insertion order. It matters for caching because cache keys derived from unstable strings may not match — the same request gets treated as two different cache entries, causing unnecessary network calls and stale data.

### Q2: How does `query-string` achieve stable serialization by default?

**A:** It sorts keys alphabetically before outputting. Any two objects with the same key-value pairs produce the same string. This is the default behavior — pass `{ sort: false }` to disable and preserve insertion order.

### Q3: When would you disable stable sorting with `{ sort: false }`?

**A:** When param order carries semantic meaning (rare), or when building a URL for display purposes where a human-defined order is preferred (e.g., priority fields first). For cache keys and API calls, always keep the default alphabetical sort.

---

## C — Common Pitfalls + Fix

### ❌ Pitfall: Using unstable serialization as a React Query key

```js
// Params object created from useState — insertion order varies
const params = { ...stateFilters, page: currentPage }

useQuery({
  queryKey: ['/products', params],  // ← unstable object key
  queryFn: () => fetchProducts(params)
})
// Same filters + same page → different object reference → cache miss every render
```

**Fix:** Use a stable string as the cache key:

```js
const stableKey = queryString.stringify(params)  // alphabetical, deterministic

useQuery({
  queryKey: ['/products', stableKey],  // ← stable string key ✅
  queryFn: () => fetchProducts(params)
})
```

### ❌ Pitfall: Comparing URLs built with unstable serialization

```js
const current = `?sort=price&page=2&category=shoes`
const next    = `?category=shoes&page=2&sort=price`

if (current === next) return  // false — same params, different order → always navigates
```

**Fix:**

```js
const normalize = (qs) => queryString.stringify(queryString.parse(qs))
if (normalize(current) === normalize(next)) return  // true ✅
```

---

## K — Coding Challenge + Solution

### Challenge

Write a `stableQueryKey(endpoint, params)` function that:
1. Removes null, undefined, and empty string values
2. Sorts keys alphabetically
3. Returns a deterministic cache key string
4. Two calls with the same logical params (different insertion order) must return identical strings

```js
stableQueryKey('/products', { sort: 'price', page: 2, q: '', category: 'shoes', brand: null })
stableQueryKey('/products', { category: 'shoes', page: 2, brand: null, sort: 'price', q: '' })
// Both return: '/products?category=shoes&page=2&sort=price'
```

### Solution

```js
import queryString from 'query-string'

function stableQueryKey(endpoint, params = {}) {
  const stable = queryString.stringify(params, {
    skipNull:        true,
    skipEmptyString: true,
    // Default sort: alphabetical (sort: true is the default)
  })

  return stable ? `${endpoint}?${stable}` : endpoint
}

// Tests
const key1 = stableQueryKey('/products', {
  sort: 'price', page: 2, q: '', category: 'shoes', brand: null
})
const key2 = stableQueryKey('/products', {
  category: 'shoes', page: 2, brand: null, sort: 'price', q: ''
})

console.log(key1)            // '/products?category=shoes&page=2&sort=price'
console.log(key2)            // '/products?category=shoes&page=2&sort=price'
console.log(key1 === key2)   // true ✅

console.log(stableQueryKey('/users', {}))
// '/users'  (no params → no ?)
```

---

---

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

# 11 — Custom Separators

---

## T — TL;DR

A **custom separator** is an alternative to comma-separated arrays — you define the delimiter character. Use it when your API expects pipe (`|`), semicolon (`;`), or another non-standard delimiter for multi-value params.

---

## K — Key Concepts

### The `separator` arrayFormat

```js
import queryString from 'query-string'

const params = { roles: ['admin', 'editor', 'viewer'] }

// Default comma
queryString.stringify(params, { arrayFormat: 'comma' })
// 'roles=admin,editor,viewer'

// Pipe separator
queryString.stringify(params, {
  arrayFormat: 'separator',
  arrayFormatSeparator: '|'
})
// 'roles=admin|editor|viewer'

// Semicolon separator
queryString.stringify(params, {
  arrayFormat: 'separator',
  arrayFormatSeparator: ';'
})
// 'roles=admin;editor;viewer'

// Colon separator
queryString.stringify(params, {
  arrayFormat: 'separator',
  arrayFormatSeparator: ':'
})
// 'roles=admin:editor:viewer'
```

### Parsing with Custom Separator

```js
// Must use matching separator when parsing
queryString.parse('?roles=admin|editor|viewer', {
  arrayFormat: 'separator',
  arrayFormatSeparator: '|'
})
// { roles: ['admin', 'editor', 'viewer'] }

// Mismatch — wrong separator specified
queryString.parse('?roles=admin|editor|viewer', {
  arrayFormat: 'comma'
})
// { roles: 'admin|editor|viewer' }  ← single string! Wrong.
```

### When to Use Custom Separators

```
Use comma (,):    /products?tags=js,react,node     ← most common
Use pipe (|):     /search?fields=name|email|phone  ← some search APIs
Use semicolon:    /export?columns=id;name;email     ← CSV-like APIs
Use colon:        /api?range=10:20                  ← range queries

Avoid using:
  &   → reserved (param separator)
  =   → reserved (key-value separator)
  +   → means space
  %   → percent encoding prefix
  #   → fragment separator
  /   → path separator
  ?   → query string start
```

### Define Once — Reuse Everywhere

```js
// src/lib/queryOptions.js
export const QS_OPTIONS = {
  arrayFormat:          'separator',
  arrayFormatSeparator: '|',
  skipNull:             true,
  skipEmptyString:      true,
  parseNumbers:         true,
  parseBooleans:        true
}

// src/lib/request.js
import { QS_OPTIONS } from './queryOptions'
import queryString from 'query-string'

export function buildUrl(base, params) {
  const qs = queryString.stringify(params, QS_OPTIONS)
  return qs ? `${base}?${qs}` : base
}

export function parseUrl(searchString) {
  return queryString.parse(searchString, QS_OPTIONS)
}
```

### Pipe Separator for Readable URLs

Commas have meaning in some contexts (dates, numbers). Pipes are unambiguous:

```
?tags=node.js,C++,co,worker   ← comma: ambiguous with "co,worker" vs "co" + "worker"
?tags=node.js|C++|co%2Cworker ← pipe: unambiguous delimiter
```

---

## W — Why It Matters

- Third-party APIs (Elasticsearch, some GraphQL APIs, internal enterprise APIs) may require non-standard array formats — knowing `arrayFormat: 'separator'` means you can adapt without manual string manipulation.
- Pipe separators are unambiguous when values might contain commas (e.g., names, addresses, tags with punctuation).
- Defining `QS_OPTIONS` as a single constant and importing it everywhere ensures parse-stringify symmetry — changing the separator requires editing one file.
- Custom separators produce shorter URLs than repeated keys for long arrays — `?ids=1|2|3|4|5` vs `?ids=1&ids=2&ids=3&ids=4&ids=5`.

---

## I — Interview Q&A

### Q1: When would you use a custom separator over the default comma format?

**A:** When your API expects a non-comma delimiter, when your values might contain commas (making comma-separation ambiguous), or when you need shorter, more readable URLs than repeated keys. Pipe (`|`) is a popular choice because it doesn't appear in most natural values and isn't URL-reserved.

### Q2: What characters should you avoid as custom separators?

**A:** Any URL-reserved character: `&` (param separator), `=` (key-value separator), `?` (query start), `#` (fragment), `/` (path). Also avoid `+` (space) and `%` (encoding prefix). Safe choices: `|`, `;`, `:`, `~`.

### Q3: What's the risk of changing `arrayFormatSeparator` after shipping?

**A:** Breaking change. Any bookmarked URLs, analytics data, or external links using the old separator will parse incorrectly with the new format. If you must change it, support both formats during a migration period by trying to parse with the new format and falling back to the old one.

---

## C — Common Pitfalls + Fix

### ❌ Pitfall: Using `arrayFormat: 'comma'` but not specifying it on parse

```js
// stringified with comma
const qs = queryString.stringify({ tags: ['a', 'b'] }, { arrayFormat: 'comma' })
// 'tags=a,b'

// parsed without arrayFormat option — treated as one string
queryString.parse(`?${qs}`)
// { tags: 'a,b' }  ← string!
```

**Fix:** Always define both in a shared constant:

```js
const OPTS = { arrayFormat: 'comma' }
queryString.stringify({ tags: ['a','b'] }, OPTS)  // 'tags=a,b'
queryString.parse('?tags=a,b', OPTS)              // { tags: ['a', 'b'] }
```

### ❌ Pitfall: Using a reserved character as a separator

```js
queryString.stringify({ ids: [1, 2, 3] }, {
  arrayFormat: 'separator',
  arrayFormatSeparator: '&'   // ← & is the param separator!
})
// 'ids=1&2&3'  → parsed as: { ids: '1', '2': null, '3': null }
```

**Fix:** Use a safe separator like `|`, `;`, or `:`.

---

## K — Coding Challenge + Solution

### Challenge

Your API uses pipe `|` as the array separator. Write `apiStringify(params)` and `apiParse(searchString)` that use this convention consistently, plus skips nulls and empty strings:

```js
apiStringify({ roles: ['admin', 'editor'], status: 'active', temp: null })
// 'roles=admin%7Ceditor&status=active'  (| is encoded as %7C)

apiParse('?roles=admin|editor&status=active')
// { roles: ['admin', 'editor'], status: 'active' }
```

### Solution

```js
import queryString from 'query-string'

const PIPE_OPTIONS = {
  arrayFormat:          'separator',
  arrayFormatSeparator: '|',
  skipNull:             true,
  skipEmptyString:      true,
  parseNumbers:         true,
  parseBooleans:        true
}

export function apiStringify(params) {
  return queryString.stringify(params, PIPE_OPTIONS)
}

export function apiParse(searchString) {
  return queryString.parse(searchString, PIPE_OPTIONS)
}

// Tests
console.log(apiStringify({ roles: ['admin', 'editor'], status: 'active', temp: null }))
// 'roles=admin%7Ceditor&status=active'

console.log(apiParse('?roles=admin|editor&status=active'))
// { roles: ['admin', 'editor'], status: 'active' }

console.log(apiParse('?roles=admin'))
// { roles: 'admin' }  ← single value → string (normalize with [].flat())
```

---

---

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