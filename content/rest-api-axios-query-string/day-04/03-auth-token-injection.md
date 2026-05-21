# 3 — Auth Token Injection

---

## T — TL;DR

Auth tokens must be sent with **every authenticated request**. There are two patterns: **static injection** via `instance.defaults` and **dynamic injection** via a request interceptor. Dynamic injection is almost always the right choice.

---

## K — Key Concepts

### Pattern 1: Static Injection via `instance.defaults`

Set the token once — usually after login:

```js
import { setToken, clearToken } from "@/lib/api";

// After successful login
async function login(email, password) {
  const { data } = await axios.post("/auth/login", { email, password });
  const { accessToken } = data;

  setToken(accessToken); // set on instance defaults
  localStorage.setItem("token", accessToken);

  return data.user;
}

// After logout
function logout() {
  clearToken();
  localStorage.removeItem("token");
  router.push("/login");
}
```

**Limitation:** If the page refreshes, `instance.defaults` resets. You must re-hydrate on app load:

```js
// src/main.js — run once on app startup
const storedToken = localStorage.getItem("token");
if (storedToken) setToken(storedToken);
```

### Pattern 2: Dynamic Injection via Request Interceptor (Preferred)

Reads the token fresh from storage on **every request** — no need for re-hydration:

```js
api.interceptors.request.use((config) => {
  const token = localStorage.getItem("access_token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});
```

Why this is better:

- Automatically picks up refreshed tokens (token rotation)
- No manual re-hydration on page load
- Always reads the latest token, not a potentially stale closure value
- Token expiry/refresh logic fits naturally here

### Pattern 3: Token Refresh (Advanced)

When access tokens expire, transparently refresh and retry:

```js
let isRefreshing = false;
let failedQueue = [];

function processQueue(error, token = null) {
  failedQueue.forEach(({ resolve, reject }) => {
    if (error) reject(error);
    else resolve(token);
  });
  failedQueue = [];
}

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    if (error.response?.status === 401 && !originalRequest._retry) {
      if (isRefreshing) {
        // Queue this request until refresh completes
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        }).then((token) => {
          originalRequest.headers.Authorization = `Bearer ${token}`;
          return api(originalRequest);
        });
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        const refreshToken = localStorage.getItem("refresh_token");
        const { data } = await axios.post("/auth/refresh", { refreshToken });
        const { accessToken } = data;

        localStorage.setItem("access_token", accessToken);
        api.defaults.headers.common["Authorization"] = `Bearer ${accessToken}`;
        processQueue(null, accessToken);

        originalRequest.headers.Authorization = `Bearer ${accessToken}`;
        return api(originalRequest);
      } catch (refreshError) {
        processQueue(refreshError);
        localStorage.clear();
        window.location.href = "/login";
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  }
);
```

### Choosing the Right Token Storage

| Storage              | XSS Risk | CSRF Risk                         | Notes                                               |
| -------------------- | -------- | --------------------------------- | --------------------------------------------------- |
| `localStorage`       | ❌ High  | ✅ Low                            | Easy to use, but exposed to XSS                     |
| `sessionStorage`     | ❌ High  | ✅ Low                            | Cleared on tab close                                |
| `HttpOnly Cookie`    | ✅ None  | ❌ High (mitigated with SameSite) | Most secure — JS can't read                         |
| In-memory (variable) | ✅ None  | ✅ Low                            | Lost on refresh — pair with refresh token in cookie |

---

## W — Why It Matters

- Auth token injection is the most critical piece of the API layer — every authenticated request depends on it.
- Dynamic interceptor injection handles token rotation automatically — static injection doesn't.
- The token refresh pattern (silent refresh) is expected in any production app with JWTs — it's a senior-level implementation.
- Token storage trade-offs (`localStorage` vs `HttpOnly cookie`) is a standard security interview question.

---

## I — Interview Q&A

### Q1: What's the difference between setting an auth token in `instance.defaults` vs a request interceptor?

**A:** `instance.defaults` sets the token statically once. If the token changes (rotation, refresh), you must manually update the default. A request interceptor reads the token dynamically on every request — always picking up the latest value. Interceptors are preferred because they naturally handle token refresh without any manual re-hydration.

### Q2: How would you implement silent token refresh in Axios?

**A:** Use a response interceptor. When a 401 is received, mark the original request as `_retry: true`, pause subsequent requests in a queue, call the refresh endpoint, update the stored token, then replay all queued requests with the new token. Use a flag (`isRefreshing`) to prevent multiple simultaneous refresh calls.

### Q3: Why is `HttpOnly` cookie storage more secure than `localStorage` for JWTs?

**A:** `HttpOnly` cookies cannot be read by JavaScript — only the browser sends them automatically. This means XSS attacks can't steal the token. `localStorage` is fully accessible to any JS on the page, including injected malicious scripts. The trade-off is that cookies require CSRF protection (SameSite, CSRF tokens), while `localStorage` tokens require careful XSS protection.

---

## C — Common Pitfalls + Fix

### ❌ Pitfall: Not re-hydrating the token after a page refresh when using `instance.defaults`

```js
// After login — set token on instance
api.defaults.headers.common["Authorization"] = `Bearer ${token}`;

// User refreshes page → instance.defaults resets → token is gone → all requests 401
```

**Fix:** On app startup, re-hydrate from storage:

```js
// src/main.js
const token = localStorage.getItem("access_token");
if (token) api.defaults.headers.common["Authorization"] = `Bearer ${token}`;
```

Or better: use a request interceptor that reads from storage dynamically on every request.

### ❌ Pitfall: Sending the auth token to third-party APIs

```js
// Single Axios instance with auth token set globally
api.defaults.headers.common["Authorization"] = `Bearer ${myToken}`;

// Later, accidentally using the same instance for a third-party API
api.get("https://api.stripe.com/charges");
// ← Sends YOUR user token to Stripe — security issue and API error
```

**Fix:** Use separate instances per API. Auth defaults only on the instance for your backend.

### ❌ Pitfall: Circular reference in token refresh — refreshing the refresh request itself

```js
// If the refresh endpoint also returns 401 (expired refresh token)
// and your interceptor retries without checking, it loops forever
```

**Fix:** Mark the original request with `_retry = true` and skip retry logic if it's already been retried. Also skip the refresh interceptor entirely for the refresh endpoint URL itself.

---

## K — Coding Challenge + Solution

### Challenge

Write a request interceptor for `api` that:

1. Reads an access token from `localStorage`
2. Attaches it as a Bearer token
3. Also attaches a `X-Request-ID` UUID header on every request
4. Logs `[REQUEST] METHOD /url` to the console

### Solution

```js
import axios from "axios";

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL ?? "http://localhost:3000",
  timeout: 10000,
});

api.interceptors.request.use(
  (config) => {
    // ─── Auth token
    const token = localStorage.getItem("access_token");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    // ─── Unique request ID for tracing
    config.headers["X-Request-ID"] = crypto.randomUUID();

    // ─── Dev logging
    const method = config.method?.toUpperCase();
    const url = (config.baseURL ?? "") + (config.url ?? "");
    console.log(`[REQUEST] ${method} ${url}`);

    return config; // MUST return
  },
  (error) => Promise.reject(error)
);

export default api;
```

---

---
