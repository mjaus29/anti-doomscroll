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
