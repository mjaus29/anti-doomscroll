# 6 — Status Code Classes

---

## T — TL;DR

HTTP status codes are 3-digit numbers grouped into 5 classes. The **first digit tells you the class** — success, error, redirect, etc. Knowing the common codes lets you debug API responses instantly.

---

## K — Key Concepts

### The 5 Classes

| Class | Range | Meaning |
|-------|-------|---------|
| **1xx** | 100–199 | Informational |
| **2xx** | 200–299 | ✅ Success |
| **3xx** | 300–399 | ↩️ Redirection |
| **4xx** | 400–499 | ❌ Client Error |
| **5xx** | 500–599 | 🔥 Server Error |

### 2xx — Success Codes

| Code | Name | When Used |
|------|------|-----------|
| `200` | OK | General success (GET, PATCH, PUT) |
| `201` | Created | Resource successfully created (POST) |
| `204` | No Content | Success but no body to return (DELETE) |

```js
// 201 example — server returns the created resource
// POST /api/users → 201 Created
// Response body: { "id": 99, "name": "Mark" }
```

### 3xx — Redirection Codes

| Code | Name | When Used |
|------|------|-----------|
| `301` | Moved Permanently | URL changed forever |
| `302` | Found | Temporary redirect |
| `304` | Not Modified | Cached version is still valid |

### 4xx — Client Error Codes

| Code | Name | When Used |
|------|------|-----------|
| `400` | Bad Request | Malformed request, invalid data |
| `401` | Unauthorized | Not authenticated (no/invalid token) |
| `403` | Forbidden | Authenticated but no permission |
| `404` | Not Found | Resource doesn't exist |
| `409` | Conflict | Duplicate resource (e.g., email already taken) |
| `422` | Unprocessable Entity | Validation failed |
| `429` | Too Many Requests | Rate limited |

### 5xx — Server Error Codes

| Code | Name | When Used |
|------|------|-----------|
| `500` | Internal Server Error | Generic server crash |
| `502` | Bad Gateway | Upstream service failed |
| `503` | Service Unavailable | Server down/overloaded |
| `504` | Gateway Timeout | Upstream took too long |

### Checking Status in Code

```js
const res = await fetch('/api/users/42')

// Most basic check
if (!res.ok) { /* 4xx or 5xx */ }

// Specific handling
switch (res.status) {
  case 200: /* success */; break
  case 401: redirectToLogin(); break
  case 403: showPermissionError(); break
  case 404: show404Page(); break
  case 500: showServerError(); break
}
```

---

## W — Why It Matters

- Status codes are the primary language of API debugging — you see them every day in the Network tab.
- 401 vs 403 is a classic interview distinction.
- Returning the right status from your own APIs (e.g., in Next.js route handlers) is considered "correct" backend behavior.
- `204 No Content` is a gotcha — calling `.json()` on it throws an error because there's no body.

---

## I — Interview Q&A

### Q1: What's the difference between 401 and 403?

**A:** `401 Unauthorized` means the client is **not authenticated** — no token or invalid token. `403 Forbidden` means the client IS authenticated but **does not have permission** to access the resource.

### Q2: What does 204 mean and what's the gotcha?

**A:** `204 No Content` means the request succeeded but there's nothing to return. The gotcha: calling `response.json()` on a 204 throws an error because the body is empty. Always check `response.status !== 204` before parsing.

### Q3: What status code should a POST that creates a resource return?

**A:** `201 Created`, ideally with a `Location` header pointing to the new resource and the created object in the response body.

---

## C — Common Pitfalls + Fix

### ❌ Pitfall: Calling `.json()` on a 204 response

```js
const res = await fetch('/api/posts/5', { method: 'DELETE' })
const data = await res.json() // ❌ SyntaxError — no body on 204
```

**Fix:**

```js
const res = await fetch('/api/posts/5', { method: 'DELETE' })
if (res.status !== 204) {
  const data = await res.json()
}
```

### ❌ Pitfall: Treating all non-200 codes as errors

```
201 — Created — this is success!
204 — No Content — this is success!
304 — Not Modified — this is intentional!
```

**Fix:** `response.ok` is `true` for all 2xx codes. Use it instead of `=== 200`.

### ❌ Pitfall: Confusing 401 and 403 in error handling

**Fix:** 401 → redirect to login. 403 → show "you don't have access" message (don't redirect to login — they're already logged in).

---

## K — Coding Challenge + Solution

### Challenge

Match each scenario to the correct status code:

```
1. User submits a form with a missing required field
2. User tries to access an admin page but isn't logged in
3. User is logged in but doesn't have admin role
4. Successful deletion of a resource
5. Resource was successfully created via POST
6. The URL the user requested no longer exists
7. The server crashed with an unhandled exception
```

### Solution

```
1. 400 Bad Request (or 422 Unprocessable Entity)
2. 401 Unauthorized
3. 403 Forbidden
4. 204 No Content
5. 201 Created
6. 404 Not Found
7. 500 Internal Server Error
```

---

---
