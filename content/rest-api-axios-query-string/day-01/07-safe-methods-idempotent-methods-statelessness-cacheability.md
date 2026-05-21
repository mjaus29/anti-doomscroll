# 7 — Safe Methods, Idempotent Methods, Statelessness & Cacheability

---

## T — TL;DR

**Safe** = doesn't change server state. **Idempotent** = same request, same result no matter how many times you call it. **Stateless** = server doesn't remember you between requests. **Cacheable** = response can be stored and reused. These four properties define how reliable and scalable HTTP APIs are.

---

## K — Key Concepts

### Safe Methods

A method is **safe** if calling it **does not modify** server state.

| Method | Safe? |
|--------|-------|
| GET | ✅ Yes |
| HEAD | ✅ Yes |
| OPTIONS | ✅ Yes |
| POST | ❌ No |
| PUT | ❌ No |
| PATCH | ❌ No |
| DELETE | ❌ No |

```
// Safe — just reading, no side effects
GET /api/users/42

// Not safe — this changes the server
DELETE /api/users/42
```

> Safe methods can still have side effects (e.g., logging), but from the **client's perspective**, they make no changes.

### Idempotent Methods

A method is **idempotent** if calling it **multiple times** produces the **same result** as calling it once.

| Method | Idempotent? |
|--------|-------------|
| GET | ✅ Yes |
| PUT | ✅ Yes |
| DELETE | ✅ Yes |
| HEAD | ✅ Yes |
| POST | ❌ No |
| PATCH | ⚠️ Depends |

```
// Idempotent — deleting something that's already deleted
DELETE /api/users/42  (1st call) → 200 OK, user deleted
DELETE /api/users/42  (2nd call) → 404 Not Found (same end state: user is gone)

// NOT idempotent — each POST creates a NEW resource
POST /api/orders  (1st call) → creates order #1
POST /api/orders  (2nd call) → creates order #2 (duplicate!)
```

### Safe vs Idempotent Matrix

| Method | Safe | Idempotent |
|--------|------|------------|
| GET | ✅ | ✅ |
| POST | ❌ | ❌ |
| PUT | ❌ | ✅ |
| PATCH | ❌ | ⚠️ |
| DELETE | ❌ | ✅ |

> All safe methods are idempotent, but not all idempotent methods are safe.

### Statelessness

In REST, each HTTP request must be **completely self-contained**. The server stores **no session memory** between requests.

```
❌ Stateful (server remembers):
  Request 1: "I am Mark"
  Request 2: "Give me my orders"   ← server knows who you are

✅ Stateless (client carries context):
  Request 1: GET /orders  Authorization: Bearer <token>
  Request 2: GET /orders  Authorization: Bearer <token>  ← token carries identity every time
```

```js
// Every request carries auth credentials
fetch('/api/orders', {
  headers: {
    'Authorization': 'Bearer eyJhbGci...' // ← client sends this EVERY time
  }
})
```

Why statelessness matters:
- Servers can be **scaled horizontally** — any server can handle any request
- No sticky sessions needed
- Easier to debug — each request is fully readable in isolation

### Cacheability

Some HTTP responses can be **stored** by the browser, CDN, or proxy and **reused** without hitting the server again.

```http
HTTP/1.1 200 OK
Cache-Control: max-age=3600    ← cache for 1 hour
ETag: "abc123"                 ← fingerprint of the response content
```

| Header | Meaning |
|---|---|
| `Cache-Control: max-age=N` | Cache for N seconds |
| `Cache-Control: no-cache` | Must revalidate before using cache |
| `Cache-Control: no-store` | Never cache (sensitive data) |
| `ETag` | Fingerprint — if it matches, return 304 Not Modified |

```
Cacheable by default: GET, HEAD
Not cacheable: POST, PUT, PATCH, DELETE
```

```js
// Browser checks cache first
// If ETag matches → server returns 304, browser uses cached copy
// No redundant data transfer!

fetch('/api/products', {
  headers: { 'If-None-Match': '"abc123"' } // send last known ETag
})
// Server: "nothing changed" → 304 Not Modified (no body sent)
// Browser: uses cached response
```

---

## W — Why It Matters

- **Idempotency** is critical for retry logic — you can safely retry a PUT but not a POST without creating duplicates.
- **Statelessness** is why modern auth uses JWTs (tokens) instead of server-side sessions.
- **Caching** is a primary performance optimization — understanding it helps you debug stale data and improve load times.
- These properties come up in **system design interviews** when discussing scalability.

---

## I — Interview Q&A

### Q1: What's the difference between safe and idempotent?

**A:** Safe means no server state is modified. Idempotent means repeating the request produces the same outcome. All safe methods are idempotent, but idempotent methods aren't necessarily safe — DELETE is idempotent (same end state: resource is gone) but not safe (it does modify state the first time).

### Q2: Why is POST not idempotent?

**A:** Because each POST creates a new resource. Calling it twice creates two separate resources — the outcome changes with each call.

### Q3: What does stateless mean in REST?

**A:** Each request must contain all the information needed to process it. The server holds no session state between requests. Authentication must be sent with every request (e.g., via a token in the `Authorization` header).

### Q4: What is an ETag used for?

**A:** An ETag is a fingerprint (hash) of a response. On subsequent requests, the client sends the ETag back. If the resource hasn't changed, the server returns `304 Not Modified` with no body, saving bandwidth.

---

## C — Common Pitfalls + Fix

### ❌ Pitfall: Retrying a failed POST thinking it's safe

```js
// User clicks "Submit Order" twice on slow connection
POST /api/orders  → creates order #1
POST /api/orders  → creates order #2 (duplicate charge!)
```

**Fix:** Use idempotency keys (a UUID sent in a header that the server uses to deduplicate), or disable the submit button after first click.

```js
fetch('/api/orders', {
  method: 'POST',
  headers: { 'Idempotency-Key': crypto.randomUUID() }
})
```

### ❌ Pitfall: Storing sensitive data with aggressive caching

```
Cache-Control: max-age=86400  ← caching user payment data for 24 hours
```

**Fix:** Use `Cache-Control: no-store` for sensitive endpoints (auth, payment, personal data).

### ❌ Pitfall: Thinking PATCH is always idempotent

```
PATCH /counter { "operation": "increment" }
```

**A:** This is NOT idempotent — calling it twice increments twice. PATCH is only idempotent if the operation is absolute (`{ "count": 5 }`), not relative (`{ "increment": 1 }`).

---

## K — Coding Challenge + Solution

### Challenge

Answer true or false for each, then explain:

```
1. GET is safe and idempotent.
2. DELETE is safe.
3. POST is idempotent.
4. PUT is idempotent but not safe.
5. In a stateless API, the server stores your session between requests.
6. GET responses can be cached.
7. POST responses are cacheable by default.
```

### Solution

```
1. TRUE  — GET reads only; calling it 100 times changes nothing
2. FALSE — DELETE modifies state (removes a resource); it's idempotent but not safe
3. FALSE — each POST creates a new resource; calling twice creates two
4. TRUE  — PUT replaces a resource (modifies state = not safe), but calling it
           twice with the same body produces the same result (idempotent)
5. FALSE — stateless means NO server-side session; client sends credentials every time
6. TRUE  — GET is cacheable by default
7. FALSE — POST is not cacheable by default
```

---

---

## ✅ Day 1 Complete — HTTP Fundamentals

| # | Subtopic | Status |
|---|----------|--------|
| 1 | API vs REST & Client-Server Model | ☐ |
| 2 | Resources, Endpoints & URL Anatomy | ☐ |
| 3 | Request-Response Lifecycle | ☐ |
| 4 | HTTP Methods — GET, POST, PUT, PATCH, DELETE | ☐ |
| 5 | Headers, Body & Content Types (JSON) | ☐ |
| 6 | Status Code Classes | ☐ |
| 7 | Safe, Idempotent, Stateless & Cacheability | ☐ |

---

> **Doing one small thing beats opening a feed.**
> Pick subtopic 1. Read just the TL;DR and Key Concepts. That's your only job right now.
