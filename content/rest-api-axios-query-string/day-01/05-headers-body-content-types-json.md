# 5 — Headers, Body & Content Types (JSON)

---

## T — TL;DR

**Headers** carry metadata about a request or response. The **body** carries the actual data. **Content-Type** tells both sides how to interpret the body — and `application/json` is the default for REST APIs.

---

## K — Key Concepts

### Request Headers

Headers are key-value pairs sent alongside a request.

```http
GET /api/users HTTP/1.1
Host: api.example.com
Accept: application/json
Authorization: Bearer eyJhbGci...
Content-Type: application/json
X-Request-ID: abc-123
```

| Header | Purpose |
|---|---|
| `Content-Type` | Format of the request body |
| `Accept` | Format the client wants in response |
| `Authorization` | Auth credentials (token, key) |
| `Host` | Which server to route to |
| `Cookie` | Session data |
| Custom (`X-*`) | App-specific metadata |

### Response Headers

```http
HTTP/1.1 200 OK
Content-Type: application/json
Content-Length: 87
Cache-Control: max-age=3600
Set-Cookie: session=abc; HttpOnly
```

| Header | Purpose |
|---|---|
| `Content-Type` | Format of the response body |
| `Content-Length` | Size of the body in bytes |
| `Cache-Control` | How long to cache the response |
| `Set-Cookie` | Set a cookie on the client |
| `Location` | URL to redirect to (used with 3xx) |

### Request Body

Only present in POST, PUT, PATCH requests (and technically DELETE but rarely used).

```js
fetch('/api/users', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json' // ← tells the server what format the body is in
  },
  body: JSON.stringify({               // ← body must be a string
    name: 'Mark',
    email: 'mark@example.com'
  })
})
```

### JSON — The Default Body Format

**JSON (JavaScript Object Notation)** is the standard data format for REST APIs.

```json
{
  "id": 42,
  "name": "Mark",
  "active": true,
  "tags": ["frontend", "dev"],
  "address": {
    "city": "Manila"
  }
}
```

Rules:
- Keys must be **double-quoted strings**
- Strings must use **double quotes** (not single)
- No trailing commas
- No comments

```js
// JS Object → JSON string (to send)
JSON.stringify({ name: 'Mark' })    // '{"name":"Mark"}'

// JSON string → JS Object (to receive)
JSON.parse('{"name":"Mark"}')       // { name: 'Mark' }

// fetch handles parsing for you:
const data = await response.json()  // parses JSON body automatically
```

### Common Content Types

| Content-Type | Use |
|---|---|
| `application/json` | JSON data (most REST APIs) |
| `application/x-www-form-urlencoded` | HTML form submissions |
| `multipart/form-data` | File uploads |
| `text/plain` | Plain text |
| `text/html` | HTML response |

---

## W — Why It Matters

- Missing or wrong `Content-Type` is one of the most common causes of "my API call isn't working."
- Understanding `Authorization` headers is essential for working with any auth system (JWT, OAuth, API keys).
- JSON is everywhere — you need to understand its rules to avoid subtle parsing bugs.
- `Cache-Control` headers directly affect your app's performance and freshness.

---

## I — Interview Q&A

### Q1: What is `Content-Type` and why does it matter?

**A:** `Content-Type` is a header that tells the receiver how to interpret the body of a request or response. Without it set correctly (e.g., `application/json`), the server may not parse the body at all.

### Q2: What's the difference between `Content-Type` and `Accept`?

**A:** `Content-Type` describes the format of the body **you're sending**. `Accept` tells the server what format **you want back** in the response.

### Q3: Why do we need `JSON.stringify()` when using `fetch()`?

**A:** `fetch`'s `body` must be a string (or specific types like FormData). `JSON.stringify()` converts a JS object to a JSON string. Without it, the body becomes `"[object Object]"`.

---

## C — Common Pitfalls + Fix

### ❌ Pitfall: Forgetting `JSON.stringify()` on the body

```js
body: { name: 'Mark' }       // ❌ sends "[object Object]"
body: JSON.stringify({ name: 'Mark' }) // ✅
```

### ❌ Pitfall: Forgetting `Content-Type` header

```js
fetch('/api/users', {
  method: 'POST',
  body: JSON.stringify({ name: 'Mark' })
  // ← no Content-Type → server may reject or misparse body
})
```

**Fix:** Always pair `JSON.stringify` with `'Content-Type': 'application/json'`.

### ❌ Pitfall: Using single quotes in JSON strings

```js
JSON.parse("{'name': 'Mark'}") // ❌ SyntaxError — JSON requires double quotes
JSON.parse('{"name": "Mark"}') // ✅
```

---

## K — Coding Challenge + Solution

### Challenge

What's wrong with this fetch call? Fix it.

```js
async function createPost(title, content) {
  const res = await fetch('/api/posts', {
    method: 'POST',
    body: { title, content }
  })
  const data = res.json()
  return data
}
```

### Solution

```js
async function createPost(title, content) {
  const res = await fetch('/api/posts', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json' // ✅ added Content-Type
    },
    body: JSON.stringify({ title, content }) // ✅ stringify the body
  })
  if (!res.ok) throw new Error(`Error: ${res.status}`) // ✅ check status
  const data = await res.json() // ✅ await the parse
  return data
}
```

---

---
