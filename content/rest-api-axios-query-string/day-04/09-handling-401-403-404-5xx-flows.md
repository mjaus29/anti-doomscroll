# 9 — Handling 401 / 403 / 404 / 5xx Flows

---

## T — TL;DR

Each error class needs a **specific, intentional response** — not a generic "something went wrong." 401 means redirect to login. 403 means access denied. 404 means show not-found UI. 5xx means server problem, retry or show maintenance.

---

## K — Key Concepts

### The Decision Matrix

| Status    | Meaning                      | Frontend Action                             |
| --------- | ---------------------------- | ------------------------------------------- |
| `401`     | Not authenticated            | Clear token → redirect to `/login`          |
| `403`     | Authenticated, no permission | Show "Access Denied" (NOT login redirect)   |
| `404`     | Resource not found           | Show 404 UI, don't retry                    |
| `408`     | Request timeout              | Show retry prompt                           |
| `422`     | Validation failed            | Map field errors to form                    |
| `429`     | Rate limited                 | Show cooldown, respect `Retry-After`        |
| `500`     | Server crash                 | Show generic error, log to monitoring       |
| `502/503` | Service unavailable          | Show maintenance banner, retry with backoff |

### Global Handling in Response Interceptor

```js
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const status = error.response?.status;
    const url = error.config?.url ?? "";

    switch (true) {
      // 401 — not authenticated
      case status === 401 && !url.includes("/auth/refresh"): {
        localStorage.removeItem("access_token");
        window.location.href = `/login?redirect=${encodeURIComponent(window.location.pathname)}`;
        break;
      }

      // 403 — forbidden (don't redirect to login — they ARE logged in)
      case status === 403: {
        console.warn(`403 Forbidden: ${url}`);
        // Optionally emit a global event for the UI to catch
        window.dispatchEvent(
          new CustomEvent("api:forbidden", { detail: { url } })
        );
        break;
      }

      // 429 — rate limited
      case status === 429: {
        const retryAfter = error.response?.headers["retry-after"];
        console.warn(`Rate limited. Retry after: ${retryAfter}s`);
        window.dispatchEvent(
          new CustomEvent("api:rateLimit", { detail: { retryAfter } })
        );
        break;
      }

      // 5xx — server errors
      case status >= 500: {
        console.error(`Server error ${status}:`, url);
        window.dispatchEvent(
          new CustomEvent("api:serverError", { detail: { status, url } })
        );
        break;
      }
    }

    return Promise.reject(error);
  }
);
```

### Local Handling in Service/Component

Global interceptors handle universal behavior. Local `catch` handles request-specific UI:

```js
async function registerUser(formData) {
  const { data, error } = await request("POST", "/auth/register", formData);

  if (!error) return { success: true, user: data };

  // Local — specific to this form
  if (error.status === 409) {
    return {
      success: false,
      message: "Email already registered. Try logging in.",
    };
  }

  if (error.status === 422) {
    return { success: false, fieldErrors: error.fieldErrors };
  }

  // Fall through to generic
  return { success: false, message: error.message };
}
```

### 404 Handling — Distinguish "Not Found" from "Error"

```js
const { data, error } = await request("GET", `/posts/${id}`);

if (error?.status === 404) {
  // This is expected — not a bug
  return { found: false };
}

if (error) {
  // Unexpected error
  throw error;
}

return { found: true, post: data };
```

### 5xx Retry with Exponential Backoff

```js
async function requestWithRetry(method, url, body, maxRetries = 3) {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    const { data, error } = await request(method, url, body);

    if (!error || error.status < 500) return { data, error };

    if (attempt < maxRetries) {
      const delay = Math.min(1000 * 2 ** attempt, 10000); // 2s, 4s, 8s, max 10s
      console.warn(`5xx error. Retry ${attempt}/${maxRetries} in ${delay}ms`);
      await new Promise((r) => setTimeout(r, delay));
    }
  }

  return await request(method, url, body); // final attempt
}
```

---

## W — Why It Matters

- The 401 vs 403 distinction is critical — sending an authenticated user to the login page on a 403 is a poor UX and confusing behavior.
- Preserving the `redirect` URL in the 401 redirect (`?redirect=currentPath`) means the user lands back where they were after logging in — a key UX requirement.
- `window.dispatchEvent` for global errors (403, 5xx) decouples the interceptor from the UI framework — any React component can listen without the interceptor knowing about React.
- Exponential backoff for 5xx is a real-world reliability pattern — it prevents thundering herd during brief server outages.

---

## I — Interview Q&A

### Q1: Should a 401 always redirect to the login page?

**A:** Almost always, but with one critical exception — the refresh token endpoint itself. If the refresh endpoint returns 401, you should redirect to login. But you must not retry the refresh (infinite loop) and you must skip the normal 401 redirect logic for the refresh call. Always check `!url.includes('/auth/refresh')` before redirecting.

### Q2: What's the correct response to a 403?

**A:** Show an "Access Denied" or "You don't have permission" message. Do NOT redirect to login — the user is already authenticated, they just lack authorization. Redirecting them to login creates a confusing loop.

### Q3: What is exponential backoff and when would you use it for API calls?

**A:** Exponential backoff waits progressively longer between retries: 2s, 4s, 8s. It's used for transient server errors (5xx, 503) to avoid overwhelming a struggling server with immediate retries. It's appropriate for idempotent requests (GET, PUT, DELETE) — never for POST (would create duplicates).

---

## C — Common Pitfalls + Fix

### ❌ Pitfall: Redirecting to `/login` on 403

```js
if (status === 401 || status === 403) {
  window.location.href = "/login"; // ← 403 means they're logged in — this is wrong
}
```

**Fix:**

```js
if (status === 401) window.location.href = "/login";
if (status === 403) showAccessDenied(); // different behavior
```

### ❌ Pitfall: Retrying POST requests on 5xx

```js
// POST /orders fails with 500 — retry creates a duplicate order
requestWithRetry("POST", "/orders", orderData);
```

**Fix:** Only retry idempotent methods:

```js
const RETRYABLE_METHODS = ["GET", "HEAD", "PUT", "DELETE", "OPTIONS"];
if (RETRYABLE_METHODS.includes(method.toUpperCase())) {
  return requestWithRetry(method, url, body);
}
return request(method, url, body); // no retry for POST/PATCH
```

### ❌ Pitfall: Losing the current URL in the login redirect

```js
window.location.href = "/login"; // user lands on /login, then goes to dashboard after login
// Lost: they were trying to access /admin/reports
```

**Fix:**

```js
const redirect = encodeURIComponent(
  window.location.pathname + window.location.search
);
window.location.href = `/login?redirect=${redirect}`;
// After login: router.push(searchParams.get('redirect') ?? '/dashboard')
```

---

## K — Coding Challenge + Solution

### Challenge

Write a `handleApiError(error)` function that:

1. Returns a human-readable message for `401`, `403`, `404`, `422`, `429`, `500+`
2. For `422` — returns the field errors map
3. For `429` — includes seconds until retry
4. For network errors — distinct message

### Solution

```js
function handleApiError(error) {
  const status = error.normalized?.status ?? error.response?.status;
  const details = error.normalized?.details ?? [];
  const headers = error.response?.headers ?? {};

  if (!status && error.normalized?.code === "NETWORK_ERROR") {
    return {
      message: "No internet connection. Please check your network.",
      fieldErrors: {},
    };
  }

  if (!status && error.normalized?.code === "TIMEOUT") {
    return { message: "Request timed out. Please try again.", fieldErrors: {} };
  }

  switch (true) {
    case status === 401:
      return {
        message: "Your session has expired. Please log in again.",
        fieldErrors: {},
      };

    case status === 403:
      return {
        message: "You don't have permission to perform this action.",
        fieldErrors: {},
      };

    case status === 404:
      return {
        message: "The requested resource was not found.",
        fieldErrors: {},
      };

    case status === 422: {
      const fieldErrors = Object.fromEntries(
        details
          .filter((d) => d.field)
          .map(({ field, message }) => [field, message])
      );
      return { message: "Please fix the errors below.", fieldErrors };
    }

    case status === 429: {
      const retryAfter = headers["retry-after"] ?? 60;
      return {
        message: `Too many requests. Please wait ${retryAfter} seconds.`,
        fieldErrors: {},
      };
    }

    case status >= 500:
      return {
        message:
          "Server error. Our team has been notified. Please try again later.",
        fieldErrors: {},
      };

    default:
      return { message: "An unexpected error occurred.", fieldErrors: {} };
  }
}
```

---

---
