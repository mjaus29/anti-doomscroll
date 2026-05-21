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
