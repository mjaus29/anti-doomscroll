# 8 — Validation Basics & Auth Headers

---

## T — TL;DR

**Validation** ensures incoming data is correct before processing. **Auth headers** carry proof of identity with every request. Both are non-negotiable in production APIs.

---

## K — Key Concepts

### Validation — Where It Happens

```
[Client-side validation]     → fast feedback, but never trust it alone
        ↓
[Server-side validation]     → authoritative, always required
        ↓
[Database constraints]       → last line of defense
```

### What to Validate on the Server

```
- Required fields: field must exist and not be empty
- Type: must be a string / number / boolean / array
- Format: email regex, URL format, ISO date format
- Length: min/max length for strings
- Range: min/max for numbers
- Uniqueness: email/username not already taken
- Enum: value must be one of allowed options
```

### Validation Error Response

```json
HTTP 422 Unprocessable Entity
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Validation failed",
    "details": [
      { "field": "email",    "message": "Must be a valid email address" },
      { "field": "password", "message": "Must be at least 8 characters" },
      { "field": "age",      "message": "Must be between 18 and 120" }
    ]
  }
}
```

### Consuming Validation Errors on the Frontend

```js
try {
  const user = await createUser(formData);
} catch (err) {
  if (err.code === "VALIDATION_ERROR") {
    // Map field errors to form state
    const fieldErrors = {};
    err.details.forEach(({ field, message }) => {
      fieldErrors[field] = message;
    });
    setErrors(fieldErrors); // { email: "Must be valid", password: "Too short" }
  }
}
```

### Auth Headers

The `Authorization` header carries credentials with every request:

```http
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
Authorization: ApiKey sk_live_abc123
Authorization: Basic dXNlcjpwYXNzd29yZA==
```

| Scheme           | Use Case                                 |
| ---------------- | ---------------------------------------- |
| `Bearer <token>` | JWT auth (most common in SPAs)           |
| `ApiKey <key>`   | Service-to-service or developer API keys |
| `Basic <base64>` | Username:password (only over HTTPS)      |

### Using Bearer Tokens in Fetch

```js
const authFetch = (url, options = {}) => {
  const token = localStorage.getItem("token"); // or from a secure store
  return fetch(url, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
      ...options.headers,
    },
  });
};

// Usage
authFetch("/api/profile").then((r) => r.json());
```

> ⚠️ Storing JWTs in `localStorage` is convenient but exposes them to XSS attacks. Prefer `HttpOnly` cookies for sensitive apps.

---

## W — Why It Matters

- Never trusting client-side validation alone is a fundamental security principle — users can bypass browser forms trivially.
- Structured validation errors are what separate "junior" API error handling from production-quality UX.
- The `Authorization` header is on every authenticated request you'll ever make — you need to know its structure cold.
- Understanding token storage trade-offs (localStorage vs HttpOnly cookie) is a standard security interview topic.

---

## I — Interview Q&A

### Q1: Should you rely on client-side validation alone?

**A:** Never. Client-side validation is for UX feedback — it's fast and immediate. But it can be bypassed with browser devtools, Postman, or curl. Server-side validation is always required as the source of truth.

### Q2: What status code should validation errors return?

**A:** `422 Unprocessable Entity` — the request was syntactically correct (not a 400) but the business rules weren't satisfied. Some APIs use `400 Bad Request` — either is acceptable, but 422 is more precise.

### Q3: What is a Bearer token?

**A:** A Bearer token is an auth scheme where possessing the token grants access — like a physical key. It's sent in the `Authorization` header as `Bearer <token>`. JWTs are the most common type of bearer token in web apps.

---

## C — Common Pitfalls + Fix

### ❌ Pitfall: Trusting frontend validation and skipping server validation

```
// Frontend checks email format
// Backend stores whatever it receives
// → malformed data in database
```

**Fix:** Always validate on the server. Client-side validation is a UX enhancement, never a security control.

### ❌ Pitfall: Returning a generic error for all validation failures

```json
{ "error": "Invalid input" }
```

**Fix:** Return per-field errors so the UI can highlight exactly what failed.

### ❌ Pitfall: Exposing the token in the URL

```
GET /api/profile?token=eyJhbG...   ← token in URL appears in server logs, browser history
```

**Fix:** Always put the token in the `Authorization` header, never the URL.

---

## K — Coding Challenge + Solution

### Challenge

Given this error response from the server, write the frontend code to map errors to a form state object:

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "details": [
      { "field": "username", "message": "Username is already taken" },
      { "field": "email", "message": "Must be a valid email" },
      { "field": "password", "message": "Must be at least 8 characters" }
    ]
  }
}
```

### Solution

```js
async function submitRegistration(formData) {
  try {
    const res = await authFetch("/api/register", {
      method: "POST",
      body: JSON.stringify(formData),
    });
    if (!res.ok) {
      const body = await res.json();
      const error = new Error("Validation failed");
      error.code = body.error.code;
      error.details = body.error.details;
      throw error;
    }
    return res.json();
  } catch (err) {
    if (err.code === "VALIDATION_ERROR") {
      // Map to { username: "...", email: "...", password: "..." }
      return {
        fieldErrors: Object.fromEntries(
          err.details.map(({ field, message }) => [field, message])
        ),
      };
    }
    throw err;
  }
}

// Result:
// {
//   fieldErrors: {
//     username: "Username is already taken",
//     email: "Must be a valid email",
//     password: "Must be at least 8 characters"
//   }
// }
```

---

---
