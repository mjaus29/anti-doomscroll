# 7 — Consistent Response Envelopes & Error Object Structure

---

## T — TL;DR

A **response envelope** is a consistent wrapper around every API response. A **structured error object** is how your API communicates failure. Consistency here saves hours of debugging.

---

## K — Key Concepts

### What Is a Response Envelope?

Instead of returning raw data or raw errors, wrap everything in a consistent structure:

```json
{
  "data": { ... },
  "meta": { ... },
  "error": null
}
```

This gives every response the same shape — your frontend code always knows where to look.

### Success Envelope

```json
// Single resource
{
  "data": {
    "id": 42,
    "name": "Mark",
    "email": "mark@example.com"
  }
}

// Collection with pagination meta
{
  "data": [
    { "id": 1, "name": "Alice" },
    { "id": 2, "name": "Bob" }
  ],
  "meta": {
    "total": 243,
    "page": 1,
    "perPage": 20,
    "totalPages": 13
  }
}
```

### Error Envelope — What a Good Error Object Looks Like

```json
{
  "error": {
    "status": 422,
    "code": "VALIDATION_ERROR",
    "message": "Request validation failed",
    "details": [
      {
        "field": "email",
        "message": "Must be a valid email address"
      },
      {
        "field": "password",
        "message": "Must be at least 8 characters"
      }
    ],
    "requestId": "req-abc-123",
    "timestamp": "2026-05-19T10:30:00Z"
  }
}
```

| Field       | Purpose                                          |
| ----------- | ------------------------------------------------ |
| `status`    | HTTP status code (matches response status)       |
| `code`      | Machine-readable error code (for frontend logic) |
| `message`   | Human-readable summary                           |
| `details`   | Field-level validation errors                    |
| `requestId` | Trace ID for debugging in logs                   |
| `timestamp` | When the error occurred                          |

### Why `code` Matters

HTTP status codes are too coarse for app logic:

```js
// Without error code — you can't distinguish why it failed
if (res.status === 400) {
  /* which 400? */
}

// With error code — you can handle specifically
if (error.code === "EMAIL_ALREADY_EXISTS") {
  showMessage("That email is already registered. Try logging in.");
}
if (error.code === "WEAK_PASSWORD") {
  highlightPasswordField();
}
```

### In Code — Handling Envelopes

```js
async function apiCall(url, options = {}) {
  const res = await fetch(url, options);
  const body = res.status !== 204 ? await res.json() : null;

  if (!res.ok) {
    const err = new Error(body?.error?.message || "Unknown error");
    err.code = body?.error?.code;
    err.details = body?.error?.details;
    err.status = res.status;
    throw err;
  }

  return body?.data ?? body;
}
```

---

## W — Why It Matters

- Inconsistent response shapes force frontend devs to write defensive code for every single endpoint.
- Structured error codes let you show **contextual UI messages** instead of generic "Something went wrong."
- Field-level validation errors map directly to form field highlighting — a critical UX feature.
- `requestId` is invaluable for debugging production issues with your backend team.

---

## I — Interview Q&A

### Q1: What is a response envelope and why use one?

**A:** A response envelope is a consistent wrapper around all API responses. It ensures `data`, `meta`, and `error` always live in predictable locations — so client code doesn't need different parsing logic per endpoint.

### Q2: What should a well-structured API error response contain?

**A:** At minimum: an HTTP status code, a machine-readable error code, a human-readable message, and field-level details for validation errors. A request ID for tracing is also best practice.

### Q3: Why include a machine-readable `code` field on errors?

**A:** HTTP status codes are too broad. A `code` like `EMAIL_ALREADY_EXISTS` or `INSUFFICIENT_CREDITS` allows frontend code to handle specific scenarios with appropriate UI feedback, rather than guessing based on status code alone.

---

## C — Common Pitfalls + Fix

### ❌ Pitfall: Inconsistent response shapes across endpoints

```json
// Endpoint A
{ "users": [...] }

// Endpoint B
{ "result": { "items": [...] } }

// Endpoint C
[...]   ← bare array
```

**Fix:** Always wrap in `{ "data": ... }`. One shape everywhere.

### ❌ Pitfall: Returning HTML error pages instead of JSON errors

```
HTTP 500
Content-Type: text/html
<html><body>Internal Server Error</body></html>
```

**Fix:** API endpoints must always return `Content-Type: application/json` even for errors. Set this in your error handling middleware.

### ❌ Pitfall: Swallowing field-level errors into a generic message

```json
{ "error": "Validation failed" }
```

**Fix:** Return per-field details so the frontend can highlight the specific broken field:

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "details": [{ "field": "email", "message": "Invalid format" }]
  }
}
```

---

## K — Coding Challenge + Solution

### Challenge

Write a function `handleApiResponse` that:

1. Returns `data` on success
2. Throws a structured error with `code`, `message`, and `details` on failure
3. Handles 204 (no body) correctly

```js
const user = await handleApiResponse(fetch("/api/users/42"));
```

### Solution

```js
async function handleApiResponse(fetchPromise) {
  const res = await fetchPromise;

  // 204 No Content — success with no body
  if (res.status === 204) return null;

  const body = await res.json();

  if (!res.ok) {
    const error = new Error(body?.error?.message || `HTTP Error ${res.status}`);
    error.status = res.status;
    error.code = body?.error?.code || "UNKNOWN_ERROR";
    error.details = body?.error?.details || [];
    throw error;
  }

  return body?.data ?? body;
}
```

---

---
