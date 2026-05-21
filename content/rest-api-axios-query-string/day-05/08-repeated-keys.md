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
