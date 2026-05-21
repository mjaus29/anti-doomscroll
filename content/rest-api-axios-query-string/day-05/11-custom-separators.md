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
