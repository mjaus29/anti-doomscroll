# 5 — Request Config Object

---

## T — TL;DR

Every Axios request accepts a **config object** that controls method, URL, headers, params, timeout, and more. Understanding the config unlocks full control over every request you make.

---

## K — Key Concepts

### The Full Config Shape

```js
axios({
  // Required
  method: 'GET',           // 'get', 'post', 'put', 'patch', 'delete'
  url: '/api/users',       // relative or absolute URL

  // Optional — request modification
  baseURL: 'https://api.example.com', // prepended to url
  params: { role: 'admin', page: 1 }, // query parameters → ?role=admin&page=1
  data: { name: 'Mark' },             // request body (POST/PUT/PATCH)
  headers: {
    'Authorization': 'Bearer token',
    'Content-Type': 'application/json'
  },

  // Optional — behavior
  timeout: 5000,           // ms before request is aborted
  withCredentials: false,  // send cookies cross-origin

  // Optional — response control
  responseType: 'json',    // 'json' | 'text' | 'blob' | 'arraybuffer' | 'stream'

  // Optional — upload/download progress
  onUploadProgress: (progressEvent) => { /* ... */ },
  onDownloadProgress: (progressEvent) => { /* ... */ },

  // Optional — request transformation
  transformRequest: [(data) => JSON.stringify(data)],
  transformResponse: [(data) => JSON.parse(data)],
})
```

### Using Config with Shorthand Methods

The config object is the **last argument** on every shorthand method:

```js
// GET — config is second arg
axios.get('/api/users', {
  params: { role: 'admin' },
  headers: { Authorization: 'Bearer token' },
  timeout: 3000
})

// POST — config is THIRD arg (second is data)
axios.post('/api/users', { name: 'Mark' }, {
  headers: { Authorization: 'Bearer token' },
  timeout: 5000
})

// PATCH — same as POST
axios.patch('/api/users/42', { name: 'Mark' }, {
  headers: { Authorization: 'Bearer token' }
})

// DELETE — config is second arg (like GET)
axios.delete('/api/users/42', {
  headers: { Authorization: 'Bearer token' }
})
```

### `baseURL` — Set Once, Use Everywhere

```js
// Without baseURL — repetitive
axios.get('https://api.example.com/v1/users')
axios.post('https://api.example.com/v1/posts', data)
axios.delete('https://api.example.com/v1/posts/1')

// With baseURL in config — cleaner
axios.get('/users',     { baseURL: 'https://api.example.com/v1' })
axios.post('/posts',    { baseURL: 'https://api.example.com/v1' }, data)
// Better: use axios.create() — covered in Topic 12
```

### `responseType` — Non-JSON Responses

```js
// Download a file as a Blob
const { data: blob } = await axios.get('/api/export/report.pdf', {
  responseType: 'blob'
})

// Create a download link
const url = URL.createObjectURL(blob)
const link = document.createElement('a')
link.href = url
link.download = 'report.pdf'
link.click()

// Get raw text
const { data: text } = await axios.get('/api/data.csv', {
  responseType: 'text'
})
```

### `withCredentials` — Sending Cookies Cross-Origin

```js
// For APIs that use HttpOnly cookie auth
axios.get('/api/profile', {
  withCredentials: true  // sends cookies with cross-origin requests
})
```

---

## W — Why It Matters

- The config object is the primary way to customize every request — you'll use it in every non-trivial API call.
- `baseURL` prevents the repetition and maintenance burden of hardcoded URLs.
- `responseType: 'blob'` is how you handle file downloads — a common feature request in dashboards.
- Understanding the config argument position (2nd for GET/DELETE, 3rd for POST/PUT/PATCH) prevents silent bugs where your config is treated as the request body.

---

## I — Interview Q&A

### Q1: How do you set a base URL in Axios?

**A:** Either set `baseURL` in the config per request, or — better — create a configured Axios instance with `axios.create({ baseURL: 'https://api.example.com' })` and use that instance everywhere. The instance automatically prepends the base URL to all relative paths.

### Q2: Where does the config object go in `axios.post()`?

**A:** Third argument — `axios.post(url, data, config)`. Forgetting this and passing config as second arg causes the config to be treated as the request body and the actual data is lost.

### Q3: How do you download a binary file with Axios?

**A:** Set `responseType: 'blob'` in the config. The response `.data` will be a Blob object instead of parsed JSON. You can then use `URL.createObjectURL()` to create a temporary download link.

---

## C — Common Pitfalls + Fix

### ❌ Pitfall: Passing config as second arg on POST

```js
// Intended: POST with data and auth header
axios.post('/api/users', {
  headers: { Authorization: 'Bearer token' }
})
// ← The header config was sent as the REQUEST BODY
// ← No actual user data was sent
// ← No auth header was added
```

**Fix:**

```js
axios.post('/api/users',
  { name: 'Mark', email: 'mark@example.com' },  // ← data (2nd arg)
  { headers: { Authorization: 'Bearer token' } } // ← config (3rd arg)
)
```

### ❌ Pitfall: Using `responseType: 'blob'` but trying to parse as JSON

```js
const { data } = await axios.get('/api/file.pdf', { responseType: 'blob' })
console.log(data.title)  // undefined — data is a Blob, not a parsed object
```

**Fix:** Only use `responseType: 'blob'` for binary responses. JSON endpoints don't need it.

### ❌ Pitfall: Forgetting `withCredentials` for cookie-based auth APIs

```js
axios.get('/api/me')
// 401 — cookies not sent because cross-origin requests strip cookies by default
```

**Fix:**

```js
axios.get('/api/me', { withCredentials: true })
// or set globally on your axios instance
```

---

## K — Coding Challenge + Solution

### Challenge

Write a single `apiCall` function using the generic `axios(config)` form that accepts:
- `method`
- `endpoint` (relative path)
- optional `body`
- optional `queryParams`
- optional `token`

And constructs the full config object:

```js
await apiCall('GET', '/users', null, { role: 'admin' }, 'mytoken123')
// → GET /users?role=admin with Authorization: Bearer mytoken123

await apiCall('POST', '/users', { name: 'Mark' }, null, 'mytoken123')
// → POST /users with body { name: 'Mark' } and auth header
```

### Solution

```js
import axios from 'axios'

const BASE_URL = 'https://jsonplaceholder.typicode.com'

async function apiCall(method, endpoint, body = null, queryParams = null, token = null) {
  const config = {
    method,
    url: endpoint,
    baseURL: BASE_URL
  }

  if (body)        config.data    = body
  if (queryParams) config.params  = queryParams
  if (token)       config.headers = { Authorization: `Bearer ${token}` }

  const { data } = await axios(config)
  return data
}

// Test
const users = await apiCall('GET', '/users', null, null, 'token123')
console.log(users[0].name)  // Leanne Graham
```

---

---
