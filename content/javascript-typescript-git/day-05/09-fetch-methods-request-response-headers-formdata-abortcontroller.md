# 9 — fetch — Methods, Request/Response, Headers, FormData, AbortController

---

## T — TL;DR

`fetch` is the modern browser/Node.js HTTP client returning a Promise. A `Response` is not the data — you must call `.json()`, `.text()`, `.blob()` etc. to extract it. `AbortController` + `AbortSignal` cancels requests. `Headers`, `FormData`, and `Request` objects provide structured control over every aspect of a request.

---

## K — Key Concepts

```javascript
// ── GET request ────────────────────────────────────────────────────────────
const res  = await fetch('/api/users')
// res.ok     → true if status 200-299
// res.status → 404, 200, etc.
// res.headers.get('Content-Type')

if (!res.ok) throw new Error(`HTTP ${res.status}: ${res.statusText}`)

const users = await res.json()        // parse JSON body (one-time read)
// Alternatives:
const text  = await res.text()        // raw string
const blob  = await res.blob()        // binary data (files, images)
const buf   = await res.arrayBuffer() // raw bytes
```

```javascript
// ── POST / PUT / PATCH / DELETE ────────────────────────────────────────────
// POST with JSON body
const response = await fetch('/api/users', {
  method:  'POST',
  headers: { 'Content-Type': 'application/json' },
  body:    JSON.stringify({ name: 'Mark', email: 'mark@ex.com' }),
})

// PUT — full replacement
await fetch(`/api/users/${id}`, {
  method:  'PUT',
  headers: { 'Content-Type': 'application/json' },
  body:    JSON.stringify(updatedUser),
})

// PATCH — partial update
await fetch(`/api/users/${id}`, {
  method:  'PATCH',
  headers: { 'Content-Type': 'application/json' },
  body:    JSON.stringify({ name: 'New Name' }),
})

// DELETE
await fetch(`/api/users/${id}`, { method: 'DELETE' })
```

```javascript
// ── Headers ────────────────────────────────────────────────────────────────
const headers = new Headers({
  'Content-Type': 'application/json',
  'Authorization': `Bearer ${token}`,
})
headers.set('X-Request-ID', crypto.randomUUID())
headers.get('content-type')    // 'application/json' (case-insensitive)
headers.has('Authorization')   // true
headers.delete('X-Request-ID')

// Iterating response headers
for (const [key, value] of response.headers) {
  console.log(`${key}: ${value}`)
}
```

```javascript
// ── FormData — multipart form data (file uploads) ─────────────────────────
const form = new FormData()
form.append('name',  'Mark')
form.append('email', 'mark@ex.com')
form.append('avatar', fileInput.files[0])  // File object

// Don't set Content-Type — browser sets it with boundary automatically
await fetch('/api/upload', { method: 'POST', body: form })

// ── credentials ───────────────────────────────────────────────────────────
// 'omit'        — no cookies (default cross-origin)
// 'same-origin' — cookies sent to same origin (default)
// 'include'     — cookies sent to all origins (requires CORS Allow-Credentials)
await fetch('/api/profile', { credentials: 'include' })
```

```javascript
// ── AbortController — cancel requests ─────────────────────────────────────
const controller = new AbortController()
const { signal } = controller

// Cancel after 5 seconds
const timeout = setTimeout(() => controller.abort(), 5000)

try {
  const res = await fetch('/api/slow', { signal })
  clearTimeout(timeout)
  return await res.json()
} catch (err) {
  if (err.name === 'AbortError') {
    console.log('Request was cancelled')
  } else {
    throw err
  }
}

// AbortSignal.timeout() — built-in timeout (Node 17.3+, modern browsers)
const res = await fetch('/api/data', {
  signal: AbortSignal.timeout(5000)   // auto-abort after 5s ✅
})

// Cancel on component unmount (React pattern)
useEffect(() => {
  const controller = new AbortController()
  fetchData(controller.signal)
  return () => controller.abort()   // cleanup ✅
}, [])
```

```javascript
// ── Reusable fetch wrapper ────────────────────────────────────────────────
async function apiFetch(url, options = {}) {
  const defaults = {
    headers: {
      'Content-Type': 'application/json',
      'Accept':        'application/json',
    },
    credentials: 'same-origin',
    signal: AbortSignal.timeout(10_000),
  }
  const merged = {
    ...defaults,
    ...options,
    headers: { ...defaults.headers, ...options.headers },
  }

  const res = await fetch(url, merged)
  if (!res.ok) {
    const error = await res.json().catch(() => ({ message: res.statusText }))
    throw Object.assign(new Error(error.message), { status: res.status, body: error })
  }
  return res.json()
}
```

---

## W — Why It Matters

- `fetch` does NOT throw on HTTP errors (404, 500) — only network failures throw. Always check `res.ok` or `res.status`. This is the most common `fetch` mistake.
- The body can only be consumed once — calling `.json()` after `.text()` throws. Clone the response with `res.clone()` if you need to read the body twice.
- `AbortSignal.timeout(ms)` is the modern way to add timeouts — no manual `setTimeout` + `clearTimeout` management. Works in Node.js 17.3+ and all modern browsers.

---

## I — Interview Q&A

### Q: Why doesn't `fetch` throw on a 404 or 500 status, and how do you handle HTTP errors?

**A:** `fetch` only rejects (throws) for network-level failures — DNS lookup failure, CORS error, or the request couldn't be sent. A server responding with 404 or 500 is a valid HTTP response from the network's perspective, so `fetch` resolves the Promise with a `Response` object. To detect HTTP errors, check `response.ok` (true for 200–299) or `response.status`. Always check before calling `.json()`:

```javascript
const res = await fetch(url)
if (!res.ok) throw new Error(`HTTP ${res.status}`)
const data = await res.json()
```

---

## C — Common Pitfalls + Fix

### ❌ Not checking `res.ok` — silently parses error responses as data

```javascript
// ❌ 404 response body parsed as if it's real data
const user = await fetch('/api/users/99999').then(r => r.json())
console.log(user)   // { error: 'Not found' } treated as user data ❌

// ✅ Always check res.ok first
const res  = await fetch('/api/users/99999')
if (!res.ok) throw new Error(`HTTP ${res.status}: ${res.statusText}`)
const user = await res.json()
```

---

## K — Coding Challenge + Solution

### Challenge

Build `createApiClient(baseUrl, defaultHeaders)` that returns `get(path)`, `post(path, body)`, `put(path, body)`, `patch(path, body)`, `del(path)` methods, each with 8s timeout, error throwing on non-ok responses, and JSON parsing.

### Solution

```javascript
function createApiClient(baseUrl, defaultHeaders = {}) {
  async function request(method, path, body) {
    const url = `${baseUrl}${path}`
    const options = {
      method,
      headers: {
        'Content-Type': 'application/json',
        'Accept':        'application/json',
        ...defaultHeaders,
      },
      signal: AbortSignal.timeout(8000),
      ...(body !== undefined && { body: JSON.stringify(body) }),
    }
    const res = await fetch(url, options)
    if (!res.ok) {
      const err = await res.json().catch(() => ({}))
      const e = new Error(err.message ?? `HTTP ${res.status}`)
      e.status = res.status
      throw e
    }
    if (res.status === 204) return null   // No Content
    return res.json()
  }

  return {
    get:   (path)        => request('GET',    path),
    post:  (path, body)  => request('POST',   path, body),
    put:   (path, body)  => request('PUT',    path, body),
    patch: (path, body)  => request('PATCH',  path, body),
    del:   (path)        => request('DELETE', path),
  }
}

const api = createApiClient('https://api.example.com', {
  Authorization: `Bearer ${token}`
})
const user = await api.get('/users/1')
const created = await api.post('/users', { name: 'Mark' })
```

---

---
