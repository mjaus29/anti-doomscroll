# 3 — Request-Response Lifecycle

---

## T — TL;DR

Every time your frontend calls an API, a request travels from client to server and back as a response. Understanding this full lifecycle helps you debug network issues, understand latency, and write better async code.

---

## K — Key Concepts

### The Full Lifecycle

```
[1] User triggers action (click, load, form submit)
        ↓
[2] JS builds HTTP request (method + URL + headers + optional body)
        ↓
[3] DNS resolves domain → IP address
        ↓
[4] TCP connection established (+ TLS handshake for HTTPS)
        ↓
[5] Request sent over the network
        ↓
[6] Server receives, routes, processes request
        ↓
[7] Server sends HTTP response (status + headers + body)
        ↓
[8] Client receives response
        ↓
[9] JS parses response (e.g., .json())
        ↓
[10] UI updates
```

### What a Raw HTTP Request Looks Like

```http
GET /users/42 HTTP/1.1
Host: api.example.com
Accept: application/json
Authorization: Bearer abc123
```

```
[method] [path] [HTTP version]
[headers...]
[blank line]
[optional body]
```

### What a Raw HTTP Response Looks Like

```http
HTTP/1.1 200 OK
Content-Type: application/json
Content-Length: 87

{
  "id": 42,
  "name": "Mark",
  "email": "mark@example.com"
}
```

```
[HTTP version] [status code] [status text]
[headers...]
[blank line]
[body]
```

### In Code (Frontend)

```js
// Step 1: Build and send request
const response = await fetch('https://api.example.com/users/42', {
  method: 'GET',
  headers: {
    'Accept': 'application/json',
    'Authorization': 'Bearer abc123'
  }
})

// Step 2: Parse response body
const user = await response.json()

// Step 3: Use the data
console.log(user.name) // "Mark"
```

> ⚠️ `fetch()` only throws on **network failure**. A 404 or 500 response is NOT a thrown error — you must check `response.ok`.

```js
if (!response.ok) {
  throw new Error(`HTTP error: ${response.status}`)
}
```

---

## W — Why It Matters

- Understanding the lifecycle = you know exactly WHERE to look when something breaks (DNS? Network? Server? Parsing?).
- The `response.ok` pitfall catches junior devs constantly in code reviews.
- Understanding the two-step `await` (fetch then `.json()`) prevents async bugs.
- Knowing request/response structure is required for debugging in browser DevTools → Network tab.

---

## I — Interview Q&A

### Q1: Walk me through what happens when a frontend makes an API call.

**A:** The JS builds an HTTP request with a method, URL, headers, and optional body. The browser resolves the domain via DNS, establishes a TCP/TLS connection, and sends the request. The server processes it and returns a response with a status code, headers, and body. The client receives it, parses the body (e.g., `.json()`), and updates the UI.

### Q2: Why do you need to `await` twice when using `fetch()`?

**A:** The first `await` resolves when the response headers arrive (status + headers). The body streams separately, so the second `await` (`.json()` or `.text()`) waits for the full body to arrive and parses it.

### Q3: Does `fetch()` throw an error on a 404?

**A:** No. `fetch()` only rejects its promise on a network failure (e.g., no connection). HTTP error responses (4xx, 5xx) resolve normally. You must check `response.ok` or `response.status` manually.

---

## C — Common Pitfalls + Fix

### ❌ Pitfall: Not checking `response.ok`

```js
const res = await fetch('/api/users/99')
const data = await res.json() // ← succeeds even if 404!
```

**Fix:**

```js
const res = await fetch('/api/users/99')
if (!res.ok) throw new Error(`Error: ${res.status}`)
const data = await res.json()
```

### ❌ Pitfall: Forgetting to `await` the `.json()` call

```js
const data = await fetch('/api/users').json() // ❌ .json() is not called on a Promise
```

**Fix:**

```js
const res = await fetch('/api/users')
const data = await res.json() // ✅
```

### ❌ Pitfall: Assuming fast network in production

**Fix:** Always handle loading and error states. Network requests can fail or be slow. Never assume instant response.

---

## K — Coding Challenge + Solution

### Challenge

Fix all bugs in this fetch call:

```js
async function getUser(id) {
  const res = fetch(`/api/users/${id}`)
  const data = res.json()
  return data
}
```

### Solution

```js
async function getUser(id) {
  const res = await fetch(`/api/users/${id}`) // ✅ await fetch
  if (!res.ok) throw new Error(`HTTP Error: ${res.status}`) // ✅ check status
  const data = await res.json() // ✅ await .json()
  return data
}
```

---

---
