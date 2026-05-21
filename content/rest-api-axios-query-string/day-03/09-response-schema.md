# 9 — Response Schema

---

## T — TL;DR

Every Axios response has the **same six-field structure**, regardless of the endpoint. Knowing this schema means you always know where to find data, status codes, and headers.

---

## K — Key Concepts

### The Full Axios Response Schema

```js
const response = await axios.get('/api/users/1')

console.log(response.data)       // The parsed response body (what you usually want)
console.log(response.status)     // HTTP status code: 200, 201, 404, etc.
console.log(response.statusText) // Status text: "OK", "Created", "Not Found"
console.log(response.headers)    // Response headers object
console.log(response.config)     // The config that was used for the request
console.log(response.request)    // The underlying XMLHttpRequest (browser) or http.ClientRequest (Node)
```

### Deep Dive: Each Field

#### `response.data` — The Body

```js
// For a user endpoint:
response.data
// { id: 1, name: "Mark", email: "mark@example.com" }

// For a list endpoint:
response.data
// [{ id: 1, ... }, { id: 2, ... }]

// For an envelope:
response.data
// { data: [...], meta: { total: 100, page: 1 } }
```

#### `response.status` — The HTTP Code

```js
console.log(response.status)
// 200 — OK
// 201 — Created
// 204 — No Content
// 400 — Bad Request
// etc.

// Practical use:
if (response.status === 201) {
  showSuccessMessage('Resource created!')
}
```

#### `response.headers` — Response Headers

```js
// All lowercase keys
response.headers['content-type']            // "application/json; charset=utf-8"
response.headers['x-ratelimit-remaining']   // "98"
response.headers['x-total-count']           // "243"
response.headers['cache-control']           // "max-age=3600"

// Use for pagination from headers (GitHub API style)
const total = parseInt(response.headers['x-total-count'] || '0')
```

#### `response.config` — What Was Sent

```js
// Useful for debugging — see exactly what Axios sent
response.config.url        // "/api/users/1"
response.config.method     // "get"
response.config.headers    // headers that were sent
response.config.params     // query params
response.config.data       // serialized request body
response.config.timeout    // timeout setting
response.config.baseURL    // base URL
```

### Practical Destructuring Patterns

```js
// Most common — just get the data
const { data } = await axios.get('/api/users')

// Get data and status
const { data, status } = await axios.get('/api/users')
console.log(status)  // 200

// Get data with rename
const { data: users } = await axios.get('/api/users')

// Get everything you need
const { data: post, status, headers } = await axios.post('/api/posts', { title: 'Hi' })
const location = headers['location']  // URL of created resource
console.log(status)    // 201
console.log(location)  // /api/posts/101
```

### Response Schema in Error Objects

When Axios throws on 4xx/5xx, the error also has a response:

```js
try {
  await axios.get('/api/users/999')
} catch (error) {
  console.log(error.response.status)      // 404
  console.log(error.response.data)        // { error: { code: 'NOT_FOUND', message: '...' } }
  console.log(error.response.headers)     // response headers
  console.log(error.config.url)           // '/api/users/999'
}
```

---

## W — Why It Matters

- Knowing the response schema means you never have to guess where data, status, or headers live.
- `response.config` is invaluable for debugging — you can verify exactly what Axios sent in production.
- Response headers often carry critical metadata: pagination totals, rate limit state, content disposition for downloads.
- The error's `response` property uses the same schema — consistent mental model for success and failure.

---

## I — Interview Q&A

### Q1: What are the six fields on an Axios response object?

**A:** `data` (parsed body), `status` (HTTP code), `statusText` (code description), `headers` (response headers), `config` (request config used), and `request` (underlying HTTP request object).

### Q2: How do you access the HTTP status code of an Axios response?

**A:** `response.status`. It's a number — `200`, `201`, `404`, etc. Note: Axios only resolves the promise for 2xx responses by default. For 4xx/5xx, the status is on `error.response.status` inside the catch block.

### Q3: How do you read custom response headers in Axios?

**A:** Access `response.headers` with lowercase header names. For example: `response.headers['x-total-count']` or `response.headers['content-type']`.

---

## C — Common Pitfalls + Fix

### ❌ Pitfall: Forgetting that error responses also have a response schema

```js
try {
  await axios.get('/api/users/999')
} catch (error) {
  console.log(error.status)  // undefined! ← error.status doesn't exist
}
```

**Fix:**

```js
catch (error) {
  console.log(error.response?.status)  // ✅ 404
  console.log(error.response?.data)    // ✅ { error: { message: "Not found" } }
}
```

### ❌ Pitfall: Logging the entire response for debugging

```js
const response = await axios.get('/api/users')
console.log(response)
// Logs a huge object with circular references — hard to read
```

**Fix:** Log only what you need:

```js
console.log({
  status: response.status,
  data: response.data,
  url: response.config.url
})
```

### ❌ Pitfall: Using `response.statusText` for error messages in UI

```js
showError(response.statusText)  // "Internal Server Error" — not user-friendly
```

**Fix:** Use the API's error message from `response.data.error.message`:

```js
showError(error.response?.data?.error?.message || 'Something went wrong')
```

---

## K — Coding Challenge + Solution

### Challenge

Write a `debugRequest` wrapper that logs a summary of every response including: URL, method, status, data (truncated), and any `x-` headers:

```js
const data = await debugRequest(() => axios.get('/api/users'))
// Logs:
// ─── Response ───────────────────────
// URL:     GET /api/users
// Status:  200 OK
// Data:    [{"id":1,"name":"Leanne...} (truncated)
// X-Headers: {}
// ────────────────────────────────────
```

### Solution

```js
import axios from 'axios'

async function debugRequest(requestFn) {
  const response = await requestFn()

  const xHeaders = Object.fromEntries(
    Object.entries(response.headers).filter(([key]) => key.startsWith('x-'))
  )

  const dataStr = JSON.stringify(response.data).slice(0, 80)

  console.log('─── Response ───────────────────────')
  console.log(`URL:      ${response.config.method?.toUpperCase()} ${response.config.url}`)
  console.log(`Status:   ${response.status} ${response.statusText}`)
  console.log(`Data:     ${dataStr}${dataStr.length >= 80 ? '...' : ''}`)
  console.log(`X-Headers:`, xHeaders)
  console.log('────────────────────────────────────')

  return response.data
}

// Usage
const users = await debugRequest(() =>
  axios.get('https://jsonplaceholder.typicode.com/users')
)
```

---

---
