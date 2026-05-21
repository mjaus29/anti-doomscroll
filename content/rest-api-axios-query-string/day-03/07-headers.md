# 7 — Headers

---

## T — TL;DR

Headers carry **metadata** about a request. In Axios, you set them in the `headers` config key. The most important ones in practice: `Authorization`, `Content-Type`, and custom app headers.

---

## K — Key Concepts

### Setting Headers per Request

```js
const { data } = await axios.get('/api/profile', {
  headers: {
    'Authorization': 'Bearer eyJhbGci...',
    'Accept': 'application/json'
  }
})
```

### Headers for Write Requests (POST, PUT, PATCH)

Axios **automatically sets `Content-Type: application/json`** when you pass an object as the body. You rarely need to set it manually.

```js
// Content-Type is set automatically by Axios
await axios.post('/api/users', { name: 'Mark' })
// → Content-Type: application/json ✅ (automatic)

// But you can override it:
await axios.post('/api/upload', formData, {
  headers: { 'Content-Type': 'multipart/form-data' }
})
```

### Authorization Header Patterns

```js
// Bearer token (JWT)
headers: { Authorization: `Bearer ${token}` }

// API Key
headers: { 'X-API-Key': apiKey }

// Basic auth (base64 encoded "user:pass")
headers: { Authorization: `Basic ${btoa(`${username}:${password}`)}` }

// Axios built-in basic auth config
axios.get('/api/resource', {
  auth: {
    username: 'mark',
    password: 'secret'
  }
  // Axios sets Authorization: Basic ... automatically
})
```

### Custom App Headers

```js
// Correlation ID for request tracing
headers: { 'X-Request-ID': crypto.randomUUID() }

// App version for API compatibility
headers: { 'X-App-Version': '2.1.0' }

// Custom client identifier
headers: { 'X-Client-Type': 'web' }
```

### Reading Response Headers

```js
const response = await axios.get('/api/users')

// Common response headers
console.log(response.headers['content-type'])        // application/json
console.log(response.headers['x-ratelimit-remaining']) // 99
console.log(response.headers['x-total-count'])       // 243 (total items)
```

### Setting Default Headers on an Axios Instance

Rather than repeating headers on every request — set them once (covered more in Topic 12):

```js
import axios from 'axios'

const api = axios.create({
  baseURL: 'https://api.example.com',
  headers: {
    'Content-Type': 'application/json',
    'X-Client-Type': 'web'
  }
})

// Authorization is usually dynamic, so set it when you have the token:
api.defaults.headers.common['Authorization'] = `Bearer ${token}`
```

---

## W — Why It Matters

- Almost every real API requires an `Authorization` header — this is the most used header in daily frontend development.
- Knowing that Axios auto-sets `Content-Type` prevents over-engineering and confusion when debugging.
- Response headers carry important metadata: rate limit state, pagination counts, cache instructions — ignoring them means missing critical information.
- Custom headers (`X-Request-ID`) are expected in enterprise and production applications for observability.

---

## I — Interview Q&A

### Q1: Does Axios automatically set `Content-Type`?

**A:** Yes. When you pass a plain JavaScript object as the request body to `axios.post()`, `axios.put()`, or `axios.patch()`, Axios automatically sets `Content-Type: application/json` and serializes the object to JSON. You only need to set it manually when using FormData or other non-JSON formats.

### Q2: How do you set an Authorization header for every request without repeating yourself?

**A:** Create an Axios instance with `axios.create()` and set `instance.defaults.headers.common['Authorization']` once you have the token. Or use a request interceptor to inject it dynamically before every request.

### Q3: How do you read response headers in Axios?

**A:** Access `response.headers` — it's an object of lowercase header names. For example: `response.headers['x-ratelimit-remaining']` or `response.headers['content-type']`.

---

## C — Common Pitfalls + Fix

### ❌ Pitfall: Manually setting `Content-Type: application/json` for JSON bodies

```js
// Unnecessary — Axios already does this
axios.post('/api/users', { name: 'Mark' }, {
  headers: { 'Content-Type': 'application/json' }  // ← redundant
})
```

**Fix:** Skip it for JSON bodies. Only set `Content-Type` manually for non-JSON (FormData, text, CSV).

### ❌ Pitfall: Hardcoding tokens in headers inline

```js
axios.get('/api/orders', {
  headers: { Authorization: 'Bearer eyJhbGci...' }  // hardcoded!
})
```

**Fix:** Read the token from a variable, store, or environment:

```js
const token = localStorage.getItem('access_token')
axios.get('/api/orders', {
  headers: { Authorization: `Bearer ${token}` }
})
```

### ❌ Pitfall: Setting `Content-Type: multipart/form-data` manually for FormData

```js
const formData = new FormData()
formData.append('file', file)

axios.post('/api/upload', formData, {
  headers: { 'Content-Type': 'multipart/form-data' }  // ← removes boundary!
})
```

**Fix:** Let Axios (or the browser) set it automatically — the browser adds the required `boundary` parameter:

```js
axios.post('/api/upload', formData)
// Browser sets: Content-Type: multipart/form-data; boundary=----WebKitFormBoundary...
```

---

## K — Coding Challenge + Solution

### Challenge

Write an `authorizedGet` and `authorizedPost` function that:
1. Read a token from `localStorage`
2. Attach it as a Bearer token
3. Throw a clear error if no token is found

```js
const user = await authorizedGet('/api/profile')
const post = await authorizedPost('/api/posts', { title: 'Hi' })
```

### Solution

```js
import axios from 'axios'

function getAuthHeaders() {
  const token = localStorage.getItem('access_token')
  if (!token) throw new Error('No auth token found. Please log in.')
  return { Authorization: `Bearer ${token}` }
}

async function authorizedGet(endpoint) {
  const { data } = await axios.get(endpoint, {
    headers: getAuthHeaders()
  })
  return data
}

async function authorizedPost(endpoint, body) {
  const { data } = await axios.post(endpoint, body, {
    headers: getAuthHeaders()
    // Content-Type: application/json is set automatically by Axios
  })
  return data
}
```

---

---
