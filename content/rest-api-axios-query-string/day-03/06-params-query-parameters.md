# 6 — Params (Query Parameters)

---

## T — TL;DR

In Axios, query parameters go in the **`params` config key** — never manually appended to the URL string. Axios serializes them automatically, handles encoding, and keeps your URLs clean.

---

## K — Key Concepts

### The `params` Config Key

```js
// ❌ Manual string building (fragile)
axios.get(`/api/users?role=admin&page=2&limit=20`)

// ✅ Axios params (automatic, encoded, clean)
axios.get('/api/users', {
  params: {
    role: 'admin',
    page: 2,
    limit: 20
  }
})
// Axios builds: /api/users?role=admin&page=2&limit=20
```

### Params Are Automatically URL-Encoded

```js
// Special characters are safely encoded
axios.get('/api/search', {
  params: { q: 'rock & roll', tag: 'c++' }
})
// → /api/search?q=rock%20%26%20roll&tag=c%2B%2B   ✅
// vs manual: /api/search?q=rock & roll  ← broken URL
```

### Conditional Params

Only include params when they have a value:

```js
async function fetchUsers({ role, status, search, page = 1, limit = 20 } = {}) {
  const params = { page, limit }

  if (role)   params.role   = role
  if (status) params.status = status
  if (search) params.q      = search

  const { data } = await axios.get('/api/users', { params })
  return data
}

// Only sends params that are defined
fetchUsers({ role: 'admin' })
// → GET /api/users?page=1&limit=20&role=admin
```

### Null and Undefined Are Automatically Skipped

```js
axios.get('/api/users', {
  params: {
    role: 'admin',
    status: undefined,  // ← automatically excluded
    search: null        // ← automatically excluded
  }
})
// → /api/users?role=admin   (undefined and null are dropped)
```

### Array Params

```js
// Default: ?ids[]=1&ids[]=2&ids[]=3
axios.get('/api/posts', {
  params: { ids: [1, 2, 3] }
})

// Custom serializer for ?ids=1,2,3 format
import qs from 'qs'

axios.get('/api/posts', {
  params: { ids: [1, 2, 3] },
  paramsSerializer: (params) => qs.stringify(params, { arrayFormat: 'comma' })
})
// → /api/posts?ids=1,2,3
```

### Reading Params from a React State/Form

```js
const [filters, setFilters] = useState({
  category: '',
  minPrice: '',
  maxPrice: '',
  sort: 'createdAt',
  order: 'desc',
  page: 1
})

async function search() {
  const { data } = await axios.get('/api/products', {
    params: filters
    // undefined/empty string values are still included — filter them first if needed
  })
  setProducts(data)
}
```

```js
// Filter out empty strings and null before sending
const cleanParams = Object.fromEntries(
  Object.entries(filters).filter(([_, v]) => v !== '' && v !== null)
)
const { data } = await axios.get('/api/products', { params: cleanParams })
```

---

## W — Why It Matters

- Manual URL string construction with template literals is the #1 source of encoding bugs in junior code.
- Using `params` keeps URL construction declarative and readable — you can see all parameters at a glance.
- Null/undefined auto-exclusion means you can pass a full filter object without conditionally omitting empty values.
- Syncing filter/search state to API params is the core of every filterable list, search page, and data table.

---

## I — Interview Q&A

### Q1: How do you pass query parameters in Axios?

**A:** Use the `params` key in the config object: `axios.get('/api/users', { params: { role: 'admin', page: 2 } })`. Axios handles serialization and URL encoding automatically.

### Q2: What happens to `undefined` values in Axios `params`?

**A:** Axios automatically skips keys with `undefined` values when building the query string. `null` is also excluded. This means you can pass a full filter object and empty/unset filters won't pollute the URL.

### Q3: Why is manual URL string building for query params bad practice?

**A:** Special characters like `&`, `+`, `=`, and spaces aren't encoded, which breaks the URL. Template literals don't handle arrays or nested objects. And conditionally omitting parameters requires messy string manipulation. The `params` object handles all of this cleanly.

---

## C — Common Pitfalls + Fix

### ❌ Pitfall: Appending params directly to the URL string

```js
const role = 'admin & super'
axios.get(`/api/users?role=${role}`)
// → /api/users?role=admin & super  ← broken URL
```

**Fix:**

```js
axios.get('/api/users', { params: { role: 'admin & super' } })
// → /api/users?role=admin%20%26%20super  ✅
```

### ❌ Pitfall: Sending empty string filters to the API

```js
const filters = { category: '', sort: 'price' }
axios.get('/api/products', { params: filters })
// → /api/products?category=&sort=price
// Server receives category="" — may return no results
```

**Fix:** Clean before sending:

```js
const cleanParams = Object.fromEntries(
  Object.entries(filters).filter(([_, v]) => v !== '')
)
// → { sort: 'price' }
```

### ❌ Pitfall: Duplicating the base URL in params by mistake

```js
axios.get('https://api.example.com/users?page=1', {
  params: { page: 2 }   // ← page appears TWICE: ?page=1&page=2
})
```

**Fix:** Never put params in the URL string if you're also using the `params` config.

---

## K — Coding Challenge + Solution

### Challenge

Write a `searchPosts` function that builds a clean params object from a filter object, excluding empty strings and null/undefined values:

```js
searchPosts({
  userId: 1,
  title: '',         // should be excluded
  status: null,      // should be excluded
  sort: 'createdAt',
  page: 2
})
// → GET /posts?userId=1&sort=createdAt&page=2
```

### Solution

```js
import axios from 'axios'

async function searchPosts(filters = {}) {
  // Remove falsy values (empty string, null, undefined)
  // Keep 0 and false as they can be valid filter values
  const params = Object.fromEntries(
    Object.entries(filters).filter(([_, v]) => v !== '' && v !== null && v !== undefined)
  )

  const { data } = await axios.get(
    'https://jsonplaceholder.typicode.com/posts',
    { params }
  )

  return data
}

const posts = await searchPosts({
  userId: 1,
  title: '',
  status: null,
  sort: 'createdAt',
  page: 2
})

console.log(posts.length)  // returns posts for userId 1
```

---

---
