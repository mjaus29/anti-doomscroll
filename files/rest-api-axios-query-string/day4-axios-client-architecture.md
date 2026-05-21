# 📅 Day 4 — Axios Client Architecture for Frontend Developers

> **Goal:** Stop writing scattered API calls and start building a clean, scalable, production-grade Axios architecture — the kind you see in real company codebases.
> **Format:** Each subtopic = 5–15 min. Do one. Stop. Come back.

---

## 📋 Day 4 Subtopic Overview

| #   | Subtopic                                               | Time   |
| --- | ------------------------------------------------------ | ------ |
| 1   | Axios Instances — Why One Global `axios` Is Not Enough | 10 min |
| 2   | `baseURL` & Config Defaults                            | 10 min |
| 3   | Auth Token Injection                                   | 10 min |
| 4   | Request Interceptors — Before Every Request            | 10 min |
| 5   | Response Interceptors — After Every Response           | 10 min |
| 6   | Interceptor Execution Order — Request Before Response  | 8 min  |
| 7   | Interceptor Ejection & Cleanup                         | 8 min  |
| 8   | Normalized Success & Error Handling                    | 15 min |
| 9   | Handling 401 / 403 / 404 / 5xx Flows                   | 15 min |
| 10  | Timeout vs Cancellation                                | 10 min |
| 11  | AbortController-Based Cancellation                     | 15 min |
| 12  | Concurrent Requests                                    | 10 min |
| 13  | Upload & Download Patterns                             | 15 min |
| 14  | Maintainable Service-Layer Structure                   | 15 min |

---

---

# 1 — Axios Instances — Why One Global `axios` Is Not Enough

---

## T — TL;DR

Importing `axios` directly everywhere shares one global config — changing it anywhere breaks everything. `axios.create()` gives you **isolated, configurable instances** per API target. This is the foundation of a clean Axios architecture.

---

## K — Key Concepts

### The Problem with Raw `axios`

```js
// ❌ Using global axios everywhere
import axios from "axios";

// File A: internal API
axios.get("https://api.myapp.com/users", {
  headers: { Authorization: `Bearer ${token}` },
  timeout: 10000,
});

// File B: third-party API (different base URL, different auth)
axios.get("https://api.stripe.com/v1/charges", {
  headers: { Authorization: `Bearer sk_live_...` },
  timeout: 30000,
});

// File C: public API (no auth needed)
axios.get("https://api.openweather.org/data/weather");
```

Problems:

- Headers and baseURLs are repeated in **every call**
- Setting `axios.defaults.headers` in File A **affects** File B and C
- No isolation between different APIs
- Impossible to add interceptors for only one API

### `axios.create()` — Isolated Instances

```js
// ✅ Each API gets its own instance
const internalApi = axios.create({
  baseURL: "https://api.myapp.com",
  timeout: 10000,
});

const stripeApi = axios.create({
  baseURL: "https://api.stripe.com/v1",
  timeout: 30000,
  headers: { Authorization: "Bearer sk_live_..." },
});

const weatherApi = axios.create({
  baseURL: "https://api.openweather.org/data",
  timeout: 5000,
});
```

Each instance:

- Has its own **default config**
- Has its own **interceptor stack**
- Does NOT affect other instances
- Does NOT affect the global `axios`

### Instance Inheritance

Instances inherit from global `axios` defaults at creation time but diverge after:

```js
axios.defaults.timeout = 5000; // global default

const api = axios.create({ timeout: 10000 }); // overrides global for this instance

axios.defaults.timeout = 1000; // changing global AFTER create
// ← api.defaults.timeout is still 10000 — not affected
```

### Multiple Instances for Real Apps

```js
// src/lib/instances.js

// Your own backend API
export const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL,
  timeout: 10000,
});

// Third-party service (different auth, different timeout)
export const analyticsApi = axios.create({
  baseURL: "https://analytics.service.io",
  timeout: 5000,
  headers: { "X-API-Key": import.meta.env.VITE_ANALYTICS_KEY },
});

// Static content API (no auth, longer cache)
export const cmsApi = axios.create({
  baseURL: "https://cdn.contentful.com",
  timeout: 8000,
});
```

---

## W — Why It Matters

- Every real-world app talks to multiple APIs — your own backend, Stripe, analytics, CMS, maps. Each needs different config.
- Without instances, setting a global header for one API bleeds into all others — a common source of 401 errors on third-party calls.
- Interceptors on instances are isolated — you can add retry logic to your API without affecting Stripe's instance.
- Instances are the prerequisite for everything else in Day 4 — interceptors, defaults, and service layers all build on them.

---

## I — Interview Q&A

### Q1: What is the difference between using `axios` directly and `axios.create()`?

**A:** `axios` is a global singleton. Changing its defaults or adding interceptors affects every request. `axios.create()` returns an isolated instance with its own config and interceptor stack. Using instances means config changes are scoped — changing auth headers for your API won't accidentally affect a third-party API call.

### Q2: Does modifying `axios.defaults` after calling `axios.create()` affect existing instances?

**A:** No. The instance copies the global defaults at creation time. Subsequent changes to `axios.defaults` don't propagate to already-created instances. The instances are independent after creation.

### Q3: When would you need multiple Axios instances?

**A:** Whenever your app communicates with more than one API. For example: your own backend (needs Bearer token), Stripe (needs different secret key), a CMS (public, no auth), and a weather API (needs an API key header). Each has different base URLs, auth, and timeout needs — separate instances keeps them clean and isolated.

---

## C — Common Pitfalls + Fix

### ❌ Pitfall: Importing raw `axios` in every component

```js
// In 30 different files:
import axios from "axios";
axios.get("https://api.myapp.com/users");
axios.get("https://api.myapp.com/orders");
axios.get("https://api.myapp.com/products");
```

**Fix:** Create one instance, import that:

```js
// src/lib/api.js
export const api = axios.create({ baseURL: "https://api.myapp.com" });

// Everywhere else:
import { api } from "@/lib/api";
api.get("/users");
```

### ❌ Pitfall: Setting auth headers on global `axios.defaults` when you have multiple APIs

```js
axios.defaults.headers.common["Authorization"] = `Bearer ${userToken}`;
// Now EVERY request — including to Stripe, analytics, CMS — sends your user token
```

**Fix:** Set defaults only on the specific instance that needs them.

```js
internalApi.defaults.headers.common["Authorization"] = `Bearer ${userToken}`;
// stripeApi, cmsApi are unaffected ✅
```

### ❌ Pitfall: Creating an instance inside a React component or function

```js
function useUserData() {
  const api = axios.create({ baseURL: "..." }); // recreated every render!
  // New instance + new interceptors on every render = memory leak
}
```

**Fix:** Create instances at the module level, outside any function or component.

---

## K — Coding Challenge + Solution

### Challenge

Your app uses three APIs:

1. `https://api.myshop.com` — your backend, 10s timeout
2. `https://api.stripe.com/v1` — Stripe, 30s timeout, hardcoded key
3. `https://api.unsplash.com` — Unsplash, 8s timeout, different API key

Create three isolated Axios instances and demonstrate that changing the auth header on instance 1 does NOT affect instances 2 and 3.

### Solution

```js
// src/lib/instances.js
import axios from "axios";

export const shopApi = axios.create({
  baseURL: "https://api.myshop.com",
  timeout: 10000,
});

export const stripeApi = axios.create({
  baseURL: "https://api.stripe.com/v1",
  timeout: 30000,
  headers: { Authorization: "Bearer sk_test_abc123" },
});

export const unsplashApi = axios.create({
  baseURL: "https://api.unsplash.com",
  timeout: 8000,
  headers: { Authorization: "Client-ID my_unsplash_key" },
});

// ─── Proof of isolation ───────────────────────────────────
shopApi.defaults.headers.common["Authorization"] = "Bearer user_jwt_token";

console.log(shopApi.defaults.headers.common["Authorization"]);
// → "Bearer user_jwt_token"  ✅

console.log(stripeApi.defaults.headers["Authorization"]);
// → "Bearer sk_test_abc123"  ✅ (unchanged)

console.log(unsplashApi.defaults.headers["Authorization"]);
// → "Client-ID my_unsplash_key"  ✅ (unchanged)
```

---

---

# 2 — `baseURL` & Config Defaults

---

## T — TL;DR

`baseURL` is the single most impactful default to set — it eliminates URL repetition across every call. **Instance defaults** let you define fallback config that every request through that instance inherits and can override.

---

## K — Key Concepts

### How `baseURL` Works

Axios prepends `baseURL` to every relative URL:

```js
const api = axios.create({
  baseURL: "https://api.example.com/v1",
});

api.get("/users"); // → https://api.example.com/v1/users
api.get("/users/42"); // → https://api.example.com/v1/users/42
api.post("/posts", data); // → https://api.example.com/v1/posts
api.delete("/posts/7"); // → https://api.example.com/v1/posts/7
```

Absolute URLs override `baseURL`:

```js
const api = axios.create({ baseURL: "https://api.example.com/v1" });

api.get("https://cdn.other.com/image.jpg");
// → https://cdn.other.com/image.jpg  (baseURL ignored for absolute URLs)
```

### Setting Config Defaults — Three Levels

Axios has a **three-tier config hierarchy** (lowest to highest priority):

```
1. axios.defaults              ← global library defaults
2. instance.defaults           ← your instance defaults
3. per-request config          ← highest priority, overrides everything
```

```js
axios.defaults.timeout = 5000; // global: 5s

const api = axios.create({
  timeout: 10000, // instance: 10s (overrides global)
});

api.get("/users", { timeout: 2000 }); // per-request: 2s (overrides instance)
// This specific request uses 2s
```

### All Configurable Defaults on an Instance

```js
const api = axios.create({
  // ─── URL ───────────────────────────────────
  baseURL: "https://api.example.com/v1",

  // ─── Timing ────────────────────────────────
  timeout: 10000,

  // ─── Headers ───────────────────────────────
  headers: {
    "Content-Type": "application/json",
    Accept: "application/json",
    "X-Client-Version": "2.1.0",
  },

  // ─── Credentials ───────────────────────────
  withCredentials: false, // send cookies cross-origin

  // ─── Response ──────────────────────────────
  responseType: "json", // 'json' | 'text' | 'blob' | 'arraybuffer'
  maxContentLength: 10_000_000, // max response size in bytes (10MB)
  maxBodyLength: 5_000_000, // max request body size (5MB)

  // ─── Redirects ─────────────────────────────
  maxRedirects: 5,

  // ─── Validation ────────────────────────────
  validateStatus: (status) => status >= 200 && status < 300, // default
});
```

### Post-Creation Defaults with `instance.defaults`

You can modify defaults after creation — useful for setting auth tokens after login:

```js
const api = axios.create({
  baseURL: "https://api.example.com/v1",
  timeout: 10000,
});

// After login — set token once
function setAuthToken(token) {
  api.defaults.headers.common["Authorization"] = `Bearer ${token}`;
}

// After logout — remove token
function clearAuthToken() {
  delete api.defaults.headers.common["Authorization"];
}
```

### `validateStatus` — Controlling What Counts as Success

By default, only 2xx is success. You can change this:

```js
const api = axios.create({
  // Treat 200–399 as success (include redirects)
  validateStatus: (status) => status >= 200 && status < 400,
});

// Never throw on any status (handle everything manually)
const api = axios.create({
  validateStatus: () => true,
});

// Only 200 is success (strict)
const api = axios.create({
  validateStatus: (status) => status === 200,
});
```

### Environment-Specific Base URLs

```js
// .env.development
VITE_API_BASE_URL=http://localhost:3001

// .env.production
VITE_API_BASE_URL=https://api.myapp.com

// src/lib/api.js
const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL,
  // OR for Next.js:
  // baseURL: process.env.NEXT_PUBLIC_API_BASE_URL
})
```

---

## W — Why It Matters

- Without `baseURL`, a URL change (e.g., from `v1` to `v2`) means editing every single `axios.get()` in the codebase. With it, you change one line.
- The three-tier config hierarchy explains why a per-request `timeout` override works — interviewers ask about this.
- `validateStatus` customization is essential when integrating with APIs that use non-standard status codes or when you want to handle all responses uniformly in interceptors.
- Environment-based `baseURL` is the correct way to handle dev/staging/production API endpoints — hardcoding URLs in code is a junior-level mistake.

---

## I — Interview Q&A

### Q1: What is the config priority order in Axios?

**A:** Three levels, from lowest to highest: global `axios.defaults`, instance `instance.defaults`, and per-request config. A per-request config always wins over instance defaults, which always wins over global defaults.

### Q2: What does `validateStatus` do?

**A:** It's a function that determines which HTTP status codes Axios treats as success (resolving the promise) vs failure (rejecting). The default considers 2xx as success. You can override it to, for example, never throw (`() => true`) and handle all statuses manually in a response interceptor.

### Q3: When would you use `instance.defaults` after creation vs setting defaults in `axios.create()`?

**A:** `axios.create()` config is set at startup — for static config like `baseURL` and `timeout`. `instance.defaults` post-creation is used for dynamic values like auth tokens that aren't available at app startup — you set them after the user logs in.

---

## C — Common Pitfalls + Fix

### ❌ Pitfall: Hardcoding the full URL in every request

```js
api.get("https://api.myapp.com/v1/users"); // ← full URL hardcoded
api.get("https://api.myapp.com/v1/products"); // ← repeated everywhere
```

**Fix:**

```js
const api = axios.create({ baseURL: "https://api.myapp.com/v1" });
api.get("/users"); // ✅
api.get("/products"); // ✅
```

### ❌ Pitfall: Forgetting the leading slash on relative paths

```js
const api = axios.create({ baseURL: "https://api.example.com/v1" });

api.get("users"); // → https://api.example.com/users  ← WRONG (dropped /v1)
api.get("/users"); // → https://api.example.com/v1/users  ← CORRECT
```

**Fix:** Always use a leading `/` on relative paths when using `baseURL`.

### ❌ Pitfall: Setting `responseType: 'blob'` as a global default

```js
const api = axios.create({ responseType: "blob" });
// Now ALL responses are blobs — JSON endpoints return raw binary data
```

**Fix:** Only set `responseType: 'blob'` per-request for file download endpoints:

```js
api.get("/export/report", { responseType: "blob" });
```

---

## K — Coding Challenge + Solution

### Challenge

Create an Axios instance that:

1. Uses an env variable for the base URL (with a fallback)
2. Sets a 12s timeout
3. Sets JSON content type and accept headers
4. Only treats `200`, `201`, and `204` as success
5. Exports a `setToken(token)` and `clearToken()` function

### Solution

```js
// src/lib/api.js
import axios from "axios";

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL ?? "http://localhost:3000",
  timeout: 12000,
  headers: {
    "Content-Type": "application/json",
    Accept: "application/json",
  },
  validateStatus: (status) => [200, 201, 204].includes(status),
});

export function setToken(token) {
  api.defaults.headers.common["Authorization"] = `Bearer ${token}`;
}

export function clearToken() {
  delete api.defaults.headers.common["Authorization"];
}

export default api;
```

---

---

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

# 4 — Request Interceptors — Before Every Request

---

## T — TL;DR

A **request interceptor** runs before every outgoing request. Use it to inject headers, log requests, transform the request body, add timestamps, and enforce config rules — in one central place.

---

## K — Key Concepts

### Anatomy of a Request Interceptor

```js
api.interceptors.request.use(
  (config) => {
    // ─── onFulfilled ──────────────────────────────────
    // config = the full request config object
    // Modify it here, then MUST return it
    return config;
  },
  (error) => {
    // ─── onRejected ───────────────────────────────────
    // Called when config setup itself throws (rare)
    return Promise.reject(error);
  }
);
```

> ⚠️ You **MUST** return `config` from the fulfilled handler. Forgetting this causes every request to hang forever (the interceptor returns `undefined`).

### Common Request Interceptor Use Cases

#### 1. Auth Token Injection

```js
api.interceptors.request.use((config) => {
  const token = localStorage.getItem("access_token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});
```

#### 2. Request Logging (Development)

```js
api.interceptors.request.use((config) => {
  if (import.meta.env.DEV) {
    console.group(`📤 [REQUEST] ${config.method?.toUpperCase()} ${config.url}`);
    console.log("Headers:", config.headers);
    console.log("Params:", config.params);
    console.log("Data:", config.data);
    console.groupEnd();
  }
  return config;
});
```

#### 3. Timestamp Every Request

```js
api.interceptors.request.use((config) => {
  config.metadata = { startTime: Date.now() };
  return config;
});
```

#### 4. Language / Locale Header

```js
api.interceptors.request.use((config) => {
  const locale = localStorage.getItem("locale") || "en";
  config.headers["Accept-Language"] = locale;
  return config;
});
```

#### 5. Cancelling a Request Inside the Interceptor

Sometimes you want to abort a request before it fires (e.g., user not authenticated):

```js
api.interceptors.request.use((config) => {
  const token = localStorage.getItem("access_token");
  if (!token && requiresAuth(config.url)) {
    // Cancel the request with a custom error
    const controller = new AbortController();
    config.signal = controller.signal;
    controller.abort("No auth token — request cancelled");
  }
  return config;
});
```

### Multiple Request Interceptors — Execution Order

When multiple request interceptors exist, they run in **LIFO order** (last registered, first executed):

```js
api.interceptors.request.use((config) => {
  console.log("Interceptor A"); // registered first → runs SECOND
  return config;
});

api.interceptors.request.use((config) => {
  console.log("Interceptor B"); // registered second → runs FIRST
  return config;
});

// Order: B → A → request sent
```

> This is the opposite of response interceptors, which run in FIFO order.

---

## W — Why It Matters

- Without request interceptors, auth headers must be manually added to every `api.get()` / `api.post()` call — that's dozens of duplicated lines.
- Centralizing cross-cutting concerns (auth, logging, locale, timestamps) in interceptors means changing them in ONE place.
- The LIFO execution order trips up developers who rely on interceptor ordering — understanding it prevents subtle bugs.
- Knowing you can cancel a request inside an interceptor is an advanced but powerful pattern for auth guards.

---

## I — Interview Q&A

### Q1: What can you do in a request interceptor?

**A:** Modify the outgoing request config before it's sent — inject headers (auth, locale, request IDs), log request details, add metadata, transform the request body, or even cancel the request entirely. Any change to the `config` object that you return will be applied to the actual request.

### Q2: What happens if you forget to return `config` from a request interceptor?

**A:** The request hangs indefinitely. The interceptor returns `undefined`, which Axios doesn't know how to process — the request never fires and the promise never resolves or rejects.

### Q3: In what order do multiple request interceptors execute?

**A:** LIFO — last registered, first executed. If you add interceptor A then interceptor B, they run B → A before the request is sent. Response interceptors run in the opposite order: FIFO.

---

## C — Common Pitfalls + Fix

### ❌ Pitfall: Forgetting `return config`

```js
api.interceptors.request.use((config) => {
  config.headers.Authorization = `Bearer ${token}`;
  // ← No return! Request hangs forever
});
```

**Fix:**

```js
api.interceptors.request.use((config) => {
  config.headers.Authorization = `Bearer ${token}`;
  return config; // ✅ always return
});
```

### ❌ Pitfall: Mutating `config.headers` without checking if it exists

```js
api.interceptors.request.use((config) => {
  config.headers.Authorization = token;
  // config.headers may be undefined for some request types
});
```

**Fix:**

```js
api.interceptors.request.use((config) => {
  config.headers = config.headers ?? {};
  config.headers.Authorization = `Bearer ${token}`;
  return config;
});
```

### ❌ Pitfall: Doing async work in a request interceptor without returning a Promise

```js
api.interceptors.request.use((config) => {
  const token = getTokenAsync(); // returns a Promise
  config.headers.Authorization = `Bearer ${token}`; // ← assigns Promise object!
  return config;
});
```

**Fix:** Return a Promise from the interceptor — Axios awaits it:

```js
api.interceptors.request.use(async (config) => {
  const token = await getTokenAsync();
  config.headers.Authorization = `Bearer ${token}`;
  return config;
});
```

---

## K — Coding Challenge + Solution

### Challenge

Write a request interceptor that:

1. Injects the Bearer token from `localStorage`
2. Stamps `config.metadata.startTime` with `Date.now()`
3. In DEV mode only: logs `→ METHOD /url`
4. Handles missing headers safely

### Solution

```js
api.interceptors.request.use(
  (config) => {
    // ─── Safe header initialization
    config.headers = config.headers ?? {};

    // ─── Auth injection
    const token = localStorage.getItem("access_token");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    // ─── Request timing stamp
    config.metadata = { startTime: Date.now() };

    // ─── Dev logging
    if (import.meta.env.DEV) {
      const method = config.method?.toUpperCase() ?? "UNKNOWN";
      const url = config.url ?? "";
      console.log(`→ ${method} ${url}`);
    }

    return config;
  },
  (error) => Promise.reject(error)
);
```

---

---

# 5 — Response Interceptors — After Every Response

---

## T — TL;DR

A **response interceptor** runs after every response arrives. Use it to unwrap envelopes, log responses, measure timing, and handle global errors — in one central place so components stay clean.

---

## K — Key Concepts

### Anatomy of a Response Interceptor

```js
api.interceptors.response.use(
  (response) => {
    // ─── onFulfilled ──────────────────────────────────
    // Runs for 2xx responses (or any status validateStatus accepts)
    // Must return the response (or a transformed version)
    return response;
  },
  (error) => {
    // ─── onRejected ───────────────────────────────────
    // Runs for 4xx/5xx, network errors, timeouts
    // Must return Promise.reject(error) to propagate the error
    return Promise.reject(error);
  }
);
```

### Common Response Interceptor Use Cases

#### 1. Response Logging with Timing

```js
api.interceptors.response.use(
  (response) => {
    if (import.meta.env.DEV) {
      const duration = Date.now() - (response.config.metadata?.startTime ?? 0);
      console.log(
        `← ${response.status} ${response.config.method?.toUpperCase()} ` +
          `${response.config.url} (${duration}ms)`
      );
    }
    return response;
  },
  (error) => {
    if (import.meta.env.DEV) {
      const duration = Date.now() - (error.config?.metadata?.startTime ?? 0);
      console.error(
        `✗ ${error.response?.status ?? "NET"} ` +
          `${error.config?.method?.toUpperCase()} ` +
          `${error.config?.url} (${duration}ms)`
      );
    }
    return Promise.reject(error);
  }
);
```

#### 2. Automatic Envelope Unwrapping

If all your API responses are wrapped in `{ data: ..., meta: ... }`, unwrap once here:

```js
api.interceptors.response.use((response) => {
  // If the API always wraps in { data: ..., meta: ... }
  if (response.data && "data" in response.data) {
    response.data = response.data.data; // unwrap the envelope
  }
  return response;
});

// Now every call gives you the payload directly:
const { data: user } = await api.get("/users/1");
// data = { id: 1, name: "Mark" }  ← not { data: {...}, meta: {...} }
```

#### 3. Global Error Handling

```js
api.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error.response?.status;

    if (status === 401) redirectToLogin();
    if (status === 503) showMaintenanceBanner();
    if (status >= 500) logToErrorService(error);

    return Promise.reject(error); // still propagate for local handling
  }
);
```

#### 4. Normalizing Error Shape

```js
api.interceptors.response.use(
  (response) => response,
  (error) => {
    // Normalize all errors to a consistent shape
    const normalized = {
      status: error.response?.status ?? null,
      message: error.response?.data?.error?.message
        ?? (error.code === 'ECONNABORTED' ? 'Request timed out' : null)
        ?? (!error.response ? 'Network error' : null)
        ?? 'Unexpected error',
      code: error.response?.data?.error?.code ?? 'UNKNOWN',
      details: error.response?.data?.error?.details ?? [],
      originalError: error
    }

    error.normalized = normalized
    return Promise.reject(error)
  }
)

// In a component — always has a consistent error.normalized shape
catch (error) {
  setErrorMessage(error.normalized.message)
}
```

### Multiple Response Interceptors — Execution Order

Response interceptors run in **FIFO order** (first registered, first executed):

```js
api.interceptors.response.use((response) => {
  console.log("Response Interceptor A"); // registered first → runs FIRST
  return response;
});

api.interceptors.response.use((response) => {
  console.log("Response Interceptor B"); // registered second → runs SECOND
  return response;
});

// Order: A → B → your .then()
```

---

## W — Why It Matters

- Response interceptors are where global behaviors live — auth redirects, error normalization, envelope unwrapping. Without them, this logic is duplicated in every service file.
- Measuring response time in the interceptor (using the `startTime` stamped in the request interceptor) is a clean, centralized performance monitoring pattern.
- Normalizing error shape here means component code always gets a consistent error object — no defensive optional chaining everywhere.
- FIFO vs LIFO ordering distinction (response vs request) is an Axios internals question that appears in senior interviews.

---

## I — Interview Q&A

### Q1: What's the difference between handling errors in a response interceptor vs in each `try/catch`?

**A:** A response interceptor handles errors globally — one place for redirecting on 401, logging 5xx, or normalizing error shapes. Local `try/catch` handles request-specific logic — showing a form validation error for 422 on a specific form. You typically do both: global interceptor handles universal behavior, local catch handles request-specific UI.

### Q2: If a response interceptor modifies `response.data`, what do callers see?

**A:** The modified value. Interceptors run before the promise resolves to the caller. If you do `response.data = response.data.data` in an interceptor, every `const { data } = await api.get(...)` call receives the unwrapped value automatically.

### Q3: Must you return `Promise.reject(error)` in the error handler?

**A:** Yes. If you return anything else (or return nothing), the error is swallowed and the promise resolves as success. Any local `try/catch` on the call site will never run. Always `return Promise.reject(error)` unless you're intentionally converting an error to a success response.

---

## C — Common Pitfalls + Fix

### ❌ Pitfall: Forgetting `return Promise.reject(error)` in the error handler

```js
api.interceptors.response.use(
  (res) => res,
  (error) => {
    console.error(error);
    // ← No return — error is swallowed, promise resolves as undefined
    // Component's catch block never fires, loading state never clears
  }
);
```

**Fix:**

```js
(error) => {
  console.error(error);
  return Promise.reject(error); // ✅ propagate
};
```

### ❌ Pitfall: Doing a 401 redirect without checking if it's the refresh endpoint

```js
api.interceptors.response.use(
  (res) => res,
  (error) => {
    if (error.response?.status === 401) {
      window.location.href = "/login"; // ← also fires for failed refresh → infinite loop
    }
    return Promise.reject(error);
  }
);
```

**Fix:** Skip the redirect for the refresh endpoint:

```js
(error) => {
  const isRefreshCall = error.config?.url?.includes("/auth/refresh");
  if (error.response?.status === 401 && !isRefreshCall) {
    window.location.href = "/login";
  }
  return Promise.reject(error);
};
```

### ❌ Pitfall: Mutating `response.data` without checking the shape

```js
api.interceptors.response.use((response) => {
  response.data = response.data.data; // ← crashes if some endpoints don't have a .data wrapper
});
```

**Fix:** Guard before unwrapping:

```js
api.interceptors.response.use((response) => {
  if (
    response.data &&
    typeof response.data === "object" &&
    "data" in response.data
  ) {
    response.data = response.data.data;
  }
  return response;
});
```

---

## K — Coding Challenge + Solution

### Challenge

Write a pair of response interceptors (one for success, one for errors) that:

1. Logs `← STATUS METHOD /url (Xms)` using the `startTime` from `config.metadata`
2. Attaches a normalized error object on failures with `status`, `message`, `code`
3. Redirects to `/login` on 401 (except for `/auth/refresh`)
4. Always propagates the error

### Solution

```js
api.interceptors.response.use(
  // ─── Success handler
  (response) => {
    const duration =
      Date.now() - (response.config.metadata?.startTime ?? Date.now());
    if (import.meta.env.DEV) {
      console.log(
        `← ${response.status} ` +
          `${response.config.method?.toUpperCase()} ` +
          `${response.config.url} (${duration}ms)`
      );
    }
    return response;
  },

  // ─── Error handler
  (error) => {
    const duration =
      Date.now() - (error.config?.metadata?.startTime ?? Date.now());
    if (import.meta.env.DEV) {
      console.error(
        `✗ ${error.response?.status ?? "NET"} ` +
          `${error.config?.method?.toUpperCase()} ` +
          `${error.config?.url} (${duration}ms)`
      );
    }

    // ─── Normalize error shape
    error.normalized = {
      status: error.response?.status ?? null,
      message:
        error.response?.data?.error?.message ??
        (error.code === "ECONNABORTED" ? "Request timed out" : null) ??
        (!error.response ? "Network error" : null) ??
        `Error ${error.response?.status}`,
      code: error.response?.data?.error?.code ?? "UNKNOWN",
      details: error.response?.data?.error?.details ?? [],
    };

    // ─── Global 401 redirect (skip for refresh endpoint)
    const isRefreshCall = error.config?.url?.includes("/auth/refresh");
    if (error.response?.status === 401 && !isRefreshCall) {
      localStorage.removeItem("access_token");
      window.location.href = "/login";
    }

    return Promise.reject(error); // ✅ always propagate
  }
);
```

---

---

# 6 — Interceptor Execution Order — Request Before Response

---

## T — TL;DR

Request interceptors run **before** the request is sent (LIFO). Response interceptors run **after** the response arrives (FIFO). Understanding the order matters when interceptors depend on each other — like timing a request across both.

---

## K — Key Concepts

### The Full Execution Timeline

```
[1] Code calls: api.get('/users')
       ↓
[2] Request Interceptors run (LIFO — last added, first run)
    → Interceptor B (added second)
    → Interceptor A (added first)
       ↓
[3] HTTP Request sent over network
       ↓
[4] HTTP Response received
       ↓
[5] Response Interceptors run (FIFO — first added, first run)
    → Interceptor A (added first)
    → Interceptor B (added second)
       ↓
[6] Promise resolves/rejects to your await
```

### Visual Demo

```js
api.interceptors.request.use((config) => {
  console.log("Request Interceptor 1"); // added first → runs SECOND (LIFO)
  return config;
});

api.interceptors.request.use((config) => {
  console.log("Request Interceptor 2"); // added second → runs FIRST (LIFO)
  return config;
});

api.interceptors.response.use((response) => {
  console.log("Response Interceptor 1"); // added first → runs FIRST (FIFO)
  return response;
});

api.interceptors.response.use((response) => {
  console.log("Response Interceptor 2"); // added second → runs SECOND (FIFO)
  return response;
});

await api.get("/test");

// Console output:
// Request Interceptor 2    ← LIFO
// Request Interceptor 1    ← LIFO
// [HTTP round trip]
// Response Interceptor 1   ← FIFO
// Response Interceptor 2   ← FIFO
```

### The Timing Pattern — Request + Response Pair

This only works correctly because request LIFO + response FIFO means the LAST request interceptor runs FIRST, and the FIRST response interceptor runs FIRST — they're "closest" to the actual HTTP call:

```js
// Request interceptor — stamps start time (runs last, just before request)
api.interceptors.request.use((config) => {
  config.metadata = { startTime: Date.now() };
  return config;
});

// Response interceptor — reads start time (runs first, just after response)
api.interceptors.response.use((response) => {
  const duration = Date.now() - response.config.metadata.startTime;
  console.log(`Request took ${duration}ms`);
  return response;
});

// Even with other interceptors added between these two,
// the timing interceptors work because they're added as a matched pair
```

### Why the Asymmetry Exists

Axios processes request interceptors using `unshift` (adds to front of array) and response interceptors using `push` (adds to back). This is an intentional design decision:

```
Request chain: [interceptorB, interceptorA, dispatchRequest]
Response chain: [interceptorA, interceptorB]

Execution left to right:
B-req → A-req → [HTTP] → A-res → B-res
```

The interceptor added FIRST forms the "outer shell" — it's the first to see the request config and the last to see the response.

---

## W — Why It Matters

- If you add multiple request interceptors with dependencies (e.g., one reads a value set by another), wrong ordering causes silent bugs.
- The timing pattern (stamp in request, read in response) only works if you understand when each interceptor fires relative to the HTTP call.
- Token refresh requires coordination between response interceptor (detects 401) and request interceptor (injects refreshed token on retry) — understanding the order is critical.
- This is an Axios internals question that distinguishes developers who truly understand the library from those who just use it.

---

## I — Interview Q&A

### Q1: In what order do request interceptors execute?

**A:** LIFO — Last In, First Out. The most recently added interceptor runs first. This means the first interceptor you add is the outermost wrapper, and the last one you add runs just before the request is sent.

### Q2: In what order do response interceptors execute?

**A:** FIFO — First In, First Out. The first response interceptor you add runs first when the response arrives. This is the opposite of request interceptors.

### Q3: Why does the timing pattern (stamp time in request interceptor, read in response interceptor) work reliably?

**A:** The request interceptor stamps `startTime` just before the request fires. The response interceptor reads it just after the response arrives. Because both run as close to the actual HTTP call as possible (the last request interceptor runs right before the call; the first response interceptor runs right after), the timing is accurate regardless of other interceptors in the chain.

---

## C — Common Pitfalls + Fix

### ❌ Pitfall: Adding interceptors in the wrong order, expecting FIFO for requests

```js
// Expecting: A → B
api.interceptors.request.use(configA); // A — added first
api.interceptors.request.use(configB); // B — added second

// Actual order: B → A  (LIFO)
// If B depends on something A sets up → B runs before A → crash
```

**Fix:** If B depends on A, add B first and A second (reversed from your intuition).

### ❌ Pitfall: Assuming response interceptors run closest to the network first

```js
// This interceptor is added first — developer assumes it runs "after" the network
api.interceptors.response.use((res) => {
  // Assumes previous interceptor already unwrapped the envelope
  return someTransform(res.data.items); // ← but envelope unwrap hasn't run yet
});

api.interceptors.response.use((res) => {
  res.data = res.data.data; // unwrap — added SECOND, runs SECOND
  return res;
});
// Actual order: first interceptor runs BEFORE second — sees wrapped data
```

**Fix:** Add the envelope unwrapper FIRST so it runs before any downstream interceptors.

---

## K — Coding Challenge + Solution

### Challenge

Predict the exact console output when this code runs:

```js
import axios from "axios";
const api = axios.create({ baseURL: "https://jsonplaceholder.typicode.com" });

api.interceptors.request.use((c) => {
  console.log("REQ-1");
  return c;
});
api.interceptors.request.use((c) => {
  console.log("REQ-2");
  return c;
});
api.interceptors.request.use((c) => {
  console.log("REQ-3");
  return c;
});

api.interceptors.response.use((r) => {
  console.log("RES-1");
  return r;
});
api.interceptors.response.use((r) => {
  console.log("RES-2");
  return r;
});
api.interceptors.response.use((r) => {
  console.log("RES-3");
  return r;
});

await api.get("/posts/1");
```

### Solution

```
REQ-3   ← added last → runs first (LIFO)
REQ-2   ← added second → runs second (LIFO)
REQ-1   ← added first → runs last (LIFO)
[HTTP request sent and response received]
RES-1   ← added first → runs first (FIFO)
RES-2   ← added second → runs second (FIFO)
RES-3   ← added last → runs last (FIFO)
```

---

---

# 7 — Interceptor Ejection & Cleanup

---

## T — TL;DR

Every `interceptors.use()` call returns an **ID**. Pass that ID to `interceptors.eject()` to remove the interceptor. This is essential for cleanup in React components, test teardown, and conditional interceptors.

---

## K — Key Concepts

### Ejecting an Interceptor

```js
// interceptors.use() returns a numeric ID
const interceptorId = api.interceptors.request.use((config) => {
  config.headers.Authorization = `Bearer ${token}`;
  return config;
});

console.log(interceptorId); // 0, 1, 2, ... (increments)

// Remove it when no longer needed
api.interceptors.request.eject(interceptorId);
```

### Why Ejection Matters

Without ejection:

- **Memory leaks** — interceptors accumulate over multiple renders/mounts
- **Duplicate behavior** — same interceptor fires multiple times per request
- **Stale closures** — old interceptors reference stale state/tokens from previous renders

### Ejection in React `useEffect` Cleanup

```js
useEffect(() => {
  // Add interceptor when component mounts
  const id = api.interceptors.request.use((config) => {
    config.headers["X-Component"] = "UserDashboard";
    return config;
  });

  // Remove interceptor when component unmounts
  return () => {
    api.interceptors.request.eject(id);
  };
}, []);
```

### Temporary Interceptors — Add for One Operation, Then Remove

```js
async function uploadWithProgress(file, onProgress) {
  // Add a temporary progress interceptor
  const reqId = api.interceptors.request.use((config) => {
    config.onUploadProgress = (e) => {
      const percent = Math.round((e.loaded * 100) / e.total);
      onProgress(percent);
    };
    return config;
  });

  try {
    const { data } = await api.post("/upload", createFormData(file));
    return data;
  } finally {
    api.interceptors.request.eject(reqId); // cleanup regardless of success/failure
  }
}
```

### Conditional Auth Interceptors — Swap on Login/Logout

```js
let authInterceptorId = null;

export function enableAuth(token) {
  // Remove existing auth interceptor if any
  if (authInterceptorId !== null) {
    api.interceptors.request.eject(authInterceptorId);
  }

  // Add new one with current token
  authInterceptorId = api.interceptors.request.use((config) => {
    config.headers.Authorization = `Bearer ${token}`;
    return config;
  });
}

export function disableAuth() {
  if (authInterceptorId !== null) {
    api.interceptors.request.eject(authInterceptorId);
    authInterceptorId = null;
  }
}

// After login:
enableAuth(newToken);

// After logout:
disableAuth();
```

### Clearing ALL Interceptors (Testing/Reset)

```js
// Clear all request interceptors
api.interceptors.request.clear();

// Clear all response interceptors
api.interceptors.response.clear();

// Useful in test afterEach cleanup
afterEach(() => {
  api.interceptors.request.clear();
  api.interceptors.response.clear();
});
```

> ⚠️ `.clear()` is available in Axios v1.x. For older versions, eject each ID manually.

---

## W — Why It Matters

- Forgetting to eject interceptors added inside React components is a classic memory leak — the interceptor fires after the component unmounts, causing state updates on dead components.
- In testing, un-ejected interceptors from one test bleed into the next — a major source of flaky tests.
- Dynamic auth (enable/disable based on login state) requires eject + re-add. Without it, stale auth tokens stay active.
- `.clear()` is a useful nuclear option in test suites to guarantee a clean slate.

---

## I — Interview Q&A

### Q1: How do you remove an Axios interceptor?

**A:** `interceptors.use()` returns a numeric ID. Pass that ID to `interceptors.eject(id)` to remove it. The interceptor is deactivated immediately — subsequent requests won't trigger it.

### Q2: Why would you eject an interceptor inside a React `useEffect` cleanup?

**A:** If a component adds an interceptor on mount, that interceptor continues to run even after the component unmounts. In React Strict Mode, effects run twice — adding the interceptor twice. The cleanup function `return () => api.interceptors.request.eject(id)` removes the interceptor when the component is removed or the effect re-runs, preventing memory leaks and duplicate behavior.

### Q3: How do you clear all interceptors at once?

**A:** `api.interceptors.request.clear()` and `api.interceptors.response.clear()` — available in Axios v1.x. Useful in test suite teardown to prevent interceptors from one test affecting another.

---

## C — Common Pitfalls + Fix

### ❌ Pitfall: Adding interceptors inside a component without cleanup

```jsx
function Dashboard() {
  useEffect(() => {
    api.interceptors.request.use((config) => {
      config.headers["X-Dashboard"] = "true";
      return config;
    });
    // ← No cleanup → interceptor added on every render in Strict Mode
    // After 3 renders: fires 3 times per request
  }, []);
}
```

**Fix:**

```js
useEffect(() => {
  const id = api.interceptors.request.use((config) => {
    config.headers["X-Dashboard"] = "true";
    return config;
  });
  return () => api.interceptors.request.eject(id); // ✅ cleanup
}, []);
```

### ❌ Pitfall: Losing the interceptor ID

```js
// ID not saved — can never eject it
api.interceptors.request.use((config) => {
  config.headers.Authorization = `Bearer ${token}`;
  return config;
});
```

**Fix:** Always store the returned ID if the interceptor is anything but permanent:

```js
const authInterceptorId = api.interceptors.request.use(...)
```

---

## K — Coding Challenge + Solution

### Challenge

Write a React hook `useAuthInterceptor(token)` that:

1. Adds a request interceptor that injects the Bearer token
2. Ejects it when the token changes or the component unmounts
3. Re-adds with the new token when it changes

### Solution

```js
import { useEffect } from "react";
import api from "@/lib/api";

function useAuthInterceptor(token) {
  useEffect(() => {
    if (!token) return;

    const id = api.interceptors.request.use((config) => {
      config.headers = config.headers ?? {};
      config.headers.Authorization = `Bearer ${token}`;
      return config;
    });

    // Cleanup: eject when token changes or component unmounts
    return () => {
      api.interceptors.request.eject(id);
    };
  }, [token]); // re-runs when token changes → old interceptor ejected, new one added
}

export default useAuthInterceptor;

// Usage in App.jsx
function App() {
  const token = useAuthStore((state) => state.token);
  useAuthInterceptor(token);
  // ...
}
```

---

---

# 8 — Normalized Success & Error Handling

---

## T — TL;DR

Normalized handling means every response — success or failure — comes back in a **predictable, consistent shape**. You define that shape once in your API layer so components never need to handle raw Axios objects.

---

## K — Key Concepts

### The Problem Without Normalization

```js
// Component A — raw Axios pattern
try {
  const res = await api.get("/users/1");
  setUser(res.data.data.user); // envelope structure varies by endpoint
} catch (err) {
  setError(err.response?.data?.error?.message ?? err.message ?? "Unknown");
}

// Component B — slightly different endpoint shape
try {
  const res = await api.get("/products");
  setProducts(res.data.items); // different key: "items" not "data"
} catch (err) {
  setError(err.response?.data?.msg ?? err.message ?? "Unknown"); // different key: "msg"
}
```

Every component does its own defensive unpacking. Shape inconsistencies cause bugs. Error messages use different key names.

### The Normalized Pattern — `{ data, error, meta }`

Define a consistent return type from your request helper:

```js
// src/lib/request.js
import axios from "axios";
import api from "./api";

/**
 * Normalized return: always { data, error, meta }
 * data  = payload on success, null on failure
 * error = { message, code, status, details } on failure, null on success
 * meta  = pagination, headers, timing — always available
 */
export async function request(
  method,
  url,
  body = null,
  params = null,
  config = {}
) {
  const startTime = Date.now();

  try {
    const res = await api({
      method,
      url,
      data: body,
      params,
      ...config,
    });

    return {
      data: res.data,
      error: null,
      meta: {
        status: res.status,
        headers: res.headers,
        duration: Date.now() - startTime,
      },
    };
  } catch (err) {
    return {
      data: null,
      error: buildError(err),
      meta: {
        status: err.response?.status ?? null,
        headers: err.response?.headers ?? {},
        duration: Date.now() - startTime,
      },
    };
  }
}

function buildError(err) {
  if (!axios.isAxiosError(err)) {
    return {
      message: err.message,
      code: "UNEXPECTED",
      status: null,
      details: [],
    };
  }

  if (err.code === "ECONNABORTED") {
    return {
      message: "Request timed out",
      code: "TIMEOUT",
      status: null,
      details: [],
    };
  }

  if (!err.response) {
    return {
      message: "Network error",
      code: "NETWORK_ERROR",
      status: null,
      details: [],
    };
  }

  return {
    message:
      err.response.data?.error?.message ?? `Error ${err.response.status}`,
    code: err.response.data?.error?.code ?? "HTTP_ERROR",
    status: err.response.status,
    details: err.response.data?.error?.details ?? [],
  };
}
```

### Using Normalized Responses in Components

```jsx
function UserProfile({ userId }) {
  const [user, setUser] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const { data, error } = await request("GET", `/users/${userId}`);

      if (error) {
        setError(error.message);
      } else {
        setUser(data);
      }
      setLoading(false);
    }
    load();
  }, [userId]);

  if (loading) return <Spinner />;
  if (error) return <p className="error">{error}</p>;
  return <h1>{user.name}</h1>;
}
```

No try/catch in the component. No defensive optional chaining. Clean.

### Typed Normalized Response (TypeScript)

```ts
interface ApiError {
  message: string
  code: string
  status: number | null
  details: Array<{ field: string; message: string }>
}

interface ApiMeta {
  status: number | null
  headers: Record<string, string>
  duration: number
}

interface ApiResult<T> {
  data: T | null
  error: ApiError | null
  meta: ApiMeta
}

async function request<T>(
  method: string,
  url: string,
  body?: unknown,
  params?: Record<string, unknown>
): Promise<ApiResult<T>> { ... }

// Usage — fully typed
const { data, error } = await request<User>('GET', '/users/1')
if (data) console.log(data.name)  // TypeScript knows data is User
```

---

## W — Why It Matters

- Inconsistent response shapes are the #1 source of defensive `?.` chains and `?? 'Unknown'` fallbacks in production codebases — normalization eliminates them.
- The `{ data, error }` pattern (inspired by Go) is growing rapidly in modern React — React Query, SWR, and TanStack Query all return a similar shape.
- Typed normalized responses give you full autocomplete and type safety across your entire data layer — no more guessing field names.
- This pattern makes API calls trivially testable — mock `request()` to return `{ data: fakeUser, error: null }` and test the component without any HTTP.

---

## I — Interview Q&A

### Q1: What is a normalized API response pattern?

**A:** A consistent return shape from every API call regardless of the endpoint — typically `{ data, error, meta }`. Success returns data and null error. Failure returns null data and a structured error. Components always destructure the same shape and never deal with raw Axios objects.

### Q2: Why return `{ data, error }` instead of throwing errors?

**A:** Throwing forces every call site to use `try/catch`. Returning `{ data, error }` makes both paths explicit, readable, and inline. Components check `if (error)` without exception handling syntax. It also prevents unhandled promise rejection warnings and makes testing simpler — just return a mock `{ data, error }` object.

### Q3: Where should the normalization logic live?

**A:** In the API layer — a shared `request()` helper or response interceptor. Never in individual components. This is the Single Responsibility Principle applied to API architecture — components handle UI, the API layer handles data transformation.

---

## C — Common Pitfalls + Fix

### ❌ Pitfall: Different error shapes across endpoints

```js
// Endpoint A returns: { error: { message: "..." } }
// Endpoint B returns: { msg: "..." }
// Endpoint C returns: { errors: [{ detail: "..." }] }
```

**Fix:** Normalize in the response interceptor or `buildError()` — map all shapes to one canonical structure regardless of what the server sends.

### ❌ Pitfall: Returning `undefined` instead of `null` on success

```js
return { data: res.data, error: undefined };
// Component checks: if (error) ← undefined is falsy, works
// But: if (error !== null) ← undefined !== null is true! Bug
```

**Fix:** Use explicit `null`:

```js
return { data: res.data, error: null };
```

### ❌ Pitfall: Swallowing the error and returning `{ data: null, error: null }`

```js
catch (err) {
  console.log(err)
  return { data: null, error: null }  // ← component thinks it succeeded with no data
}
```

**Fix:** Always return a meaningful error object:

```js
catch (err) {
  return { data: null, error: buildError(err) }  // ✅
}
```

---

## K — Coding Challenge + Solution

### Challenge

Extend the `request()` helper to support form field errors. When the API returns a `422` with `error.details` (array of `{ field, message }`), the returned error should also have a `fieldErrors` object for easy form mapping:

```js
const { error } = await request("POST", "/register", formData);
// error.fieldErrors = { email: "Already taken", password: "Too short" }
```

### Solution

```js
function buildError(err) {
  if (!axios.isAxiosError(err)) {
    return {
      message: err.message,
      code: "UNEXPECTED",
      status: null,
      details: [],
      fieldErrors: {},
    };
  }

  if (err.code === "ECONNABORTED") {
    return {
      message: "Request timed out",
      code: "TIMEOUT",
      status: null,
      details: [],
      fieldErrors: {},
    };
  }

  if (!err.response) {
    return {
      message: "Network error",
      code: "NETWORK_ERROR",
      status: null,
      details: [],
      fieldErrors: {},
    };
  }

  const details = err.response.data?.error?.details ?? [];

  // Build fieldErrors map from details array
  const fieldErrors = Object.fromEntries(
    details.filter((d) => d.field).map(({ field, message }) => [field, message])
  );

  return {
    message:
      err.response.data?.error?.message ?? `Error ${err.response.status}`,
    code: err.response.data?.error?.code ?? "HTTP_ERROR",
    status: err.response.status,
    details,
    fieldErrors, // ← { email: "Already taken", password: "Too short" }
  };
}
```

---

---

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

# 10 — Timeout vs Cancellation

---

## T — TL;DR

**Timeout** auto-cancels a request after N milliseconds — for slow servers. **Cancellation** manually stops a request at any point in its lifecycle — for user-initiated abandonment. They solve different problems and should both be in your toolkit.

---

## K — Key Concepts

### Timeout — Automatic, Time-Based

```js
// Cancel if no response within 8 seconds
const { data } = await api.get("/reports/export", { timeout: 8000 });
```

When it triggers: `error.code === 'ECONNABORTED'`

```js
catch (error) {
  if (error.code === 'ECONNABORTED') {
    showMessage('Request timed out. The server is taking too long.')
  }
}
```

Set as instance default so every request has a safety net:

```js
const api = axios.create({
  baseURL: "https://api.example.com",
  timeout: 10000, // 10s for all requests — override per-request when needed
});
```

### Cancellation — Manual, Event-Based

Used when the request should stop because of a **user action or component lifecycle event**:

- User navigates away from the page
- User types a new search term (debounce + cancel previous)
- User clicks "Cancel" on an upload
- Component unmounts mid-request

### `AbortController` — The Modern Way

```js
const controller = new AbortController();

// Attach signal to Axios request
const { data } = await api.get("/search", {
  params: { q: "laptop" },
  signal: controller.signal, // ← link to controller
});

// Cancel from anywhere
controller.abort();
```

When cancelled: `axios.isCancel(error)` returns `true`

```js
try {
  const { data } = await api.get("/search", { signal: controller.signal });
  setResults(data);
} catch (error) {
  if (axios.isCancel(error)) {
    console.log("Request cancelled — not an error");
    return; // do NOT update state or show error UI
  }
  setError(error.message);
}
```

### Timeout + Cancellation Together

You can use both simultaneously:

```js
const controller = new AbortController();

try {
  const { data } = await api.get("/data", {
    timeout: 5000, // auto-cancel after 5s
    signal: controller.signal, // manual cancel via controller
  });
} catch (error) {
  if (axios.isCancel(error)) {
    // User-initiated cancel
  } else if (error.code === "ECONNABORTED") {
    // Timeout
  } else {
    // Other error
  }
}

// Manual cancel (e.g., on component unmount)
controller.abort();
```

### Comparison Table

| Feature           | Timeout             | AbortController                          |
| ----------------- | ------------------- | ---------------------------------------- |
| Trigger           | Time elapsed        | Manual `controller.abort()`              |
| Error code        | `ECONNABORTED`      | `axios.isCancel(error) === true`         |
| Use case          | Slow server         | User action, component unmount, debounce |
| Multiple requests | Per-request timeout | One controller can cancel many requests  |
| Simultaneous      | Yes                 | Yes                                      |

### One Controller — Multiple Requests

```js
const controller = new AbortController();

// Cancel ALL of these with one call
Promise.all([
  api.get("/users", { signal: controller.signal }),
  api.get("/orders", { signal: controller.signal }),
  api.get("/products", { signal: controller.signal }),
]);

// Cancel all three at once
controller.abort();
```

---

## W — Why It Matters

- Without timeouts, slow servers can hold open connections indefinitely — users think the app is broken.
- Without cancellation, navigating away from a page mid-request causes state updates on unmounted components → React warnings and potential data corruption.
- The two different error detection methods (`ECONNABORTED` vs `isCancel`) require different handling — a generic `catch` that conflates them shows error UI when the user intentionally cancelled.
- One controller cancelling multiple parallel requests is a pattern used in page-level navigation guards and search typeaheads.

---

## I — Interview Q&A

### Q1: What's the difference between a timeout and cancellation in Axios?

**A:** Timeout auto-cancels after a fixed duration — it's a safety net for slow servers. Cancellation is user-initiated — you call `controller.abort()` when the request is no longer needed (e.g., component unmount, new search). They use different mechanisms and different error signatures.

### Q2: How do you distinguish a cancelled request from a real error?

**A:** Use `axios.isCancel(error)`. Cancellation is intentional — you should NOT show an error message or update error state. It's clean abandonment. A real error (network failure, 5xx) should be reported to the user.

### Q3: Can one `AbortController` cancel multiple requests?

**A:** Yes. Pass the same `signal` to multiple requests. Calling `controller.abort()` cancels all of them simultaneously. This is useful for cancelling all in-flight requests on route changes.

---

## C — Common Pitfalls + Fix

### ❌ Pitfall: Showing error UI on cancelled requests

```js
catch (error) {
  setError('Request failed: ' + error.message)
  // Shows "Request cancelled" to the user when they navigate away
}
```

**Fix:**

```js
catch (error) {
  if (axios.isCancel(error)) return  // ← silent, intentional — no UI update
  setError(error.message)
}
```

### ❌ Pitfall: Reusing an aborted `AbortController`

```js
const controller = new AbortController();
controller.abort();

// Later, trying to use the same controller for a new request
api.get("/users", { signal: controller.signal });
// ← Already aborted — request cancelled immediately
```

**Fix:** Create a new `AbortController` for each new request or batch.

### ❌ Pitfall: Setting timeout too short for large operations

```js
const api = axios.create({ timeout: 3000 }); // global 3s
api.post("/upload", largeFile); // times out on anything > 3MB
```

**Fix:** Override timeout per-request for known long operations:

```js
api.post("/upload", largeFile, { timeout: 120_000 }); // 2 min for uploads
```

---

## K — Coding Challenge + Solution

### Challenge

Write a `timedRequest(url, ms)` function that creates a fresh `AbortController`, kicks off a GET request, and auto-cancels after `ms` milliseconds using `setTimeout` (NOT Axios `timeout`). Distinguish between a user-cancelled request and a timeout in the catch block.

### Solution

```js
import axios from "axios";
import api from "@/lib/api";

async function timedRequest(url, ms = 5000) {
  const controller = new AbortController();

  // Our own timeout using AbortController
  const timer = setTimeout(() => {
    controller.abort("TIMEOUT"); // abort reason
  }, ms);

  try {
    const { data } = await api.get(url, { signal: controller.signal });
    clearTimeout(timer);
    return { data, timedOut: false, cancelled: false };
  } catch (error) {
    clearTimeout(timer);

    if (axios.isCancel(error)) {
      const reason = error.message ?? "";
      if (reason === "TIMEOUT") {
        return { data: null, timedOut: true, cancelled: false };
      }
      return { data: null, timedOut: false, cancelled: true };
    }

    throw error; // real error — propagate
  }
}

// Usage
const { data, timedOut } = await timedRequest("/slow-endpoint", 3000);
if (timedOut) showMessage("Took too long. Please try again.");
else console.log(data);
```

---

---

# 11 — AbortController-Based Cancellation

---

## T — TL;DR

`AbortController` is the browser-native way to cancel fetch requests — and Axios supports it via the `signal` option. It's the correct pattern for React `useEffect` cleanup, search debouncing, and page navigation cancellation.

---

## K — Key Concepts

### How `AbortController` Works

```js
// 1. Create a controller
const controller = new AbortController();

// 2. controller.signal is a read-only AbortSignal
//    Axis listens to it: if abort() is called → request is cancelled
console.log(controller.signal.aborted); // false

// 3. Attach signal to request
api.get("/data", { signal: controller.signal });

// 4. Cancel the request (now or later)
controller.abort();

console.log(controller.signal.aborted); // true
```

### Pattern 1: `useEffect` Cleanup (Most Important)

Cancels in-flight requests when the component unmounts or the effect re-runs:

```jsx
function UserPosts({ userId }) {
  const [posts, setPosts] = useState([]);

  useEffect(() => {
    const controller = new AbortController();

    async function load() {
      try {
        const { data } = await api.get(`/users/${userId}/posts`, {
          signal: controller.signal,
        });
        setPosts(data);
      } catch (error) {
        if (!axios.isCancel(error)) {
          console.error("Failed to load posts:", error.message);
        }
        // isCancel = component unmounted → silent, do nothing
      }
    }

    load();

    return () => controller.abort(); // cleanup on unmount or userId change
  }, [userId]);

  return <PostList posts={posts} />;
}
```

### Pattern 2: Search Typeahead (Cancel Previous on New Input)

```jsx
function SearchBar() {
  const [results, setResults] = useState([]);
  const controllerRef = useRef(null);

  async function handleSearch(query) {
    // Cancel the previous request before starting a new one
    if (controllerRef.current) {
      controllerRef.current.abort();
    }

    controllerRef.current = new AbortController();

    try {
      const { data } = await api.get("/search", {
        params: { q: query },
        signal: controllerRef.current.signal,
      });
      setResults(data);
    } catch (error) {
      if (!axios.isCancel(error)) setResults([]);
    }
  }

  return (
    <input
      onChange={(e) => handleSearch(e.target.value)}
      placeholder="Search..."
    />
  );
}
```

### Pattern 3: Custom Hook `useCancellableRequest`

```js
import { useEffect, useRef, useCallback } from "react";
import api from "@/lib/api";

function useCancellableRequest() {
  const controllerRef = useRef(null);

  const cancel = useCallback(() => {
    controllerRef.current?.abort();
  }, []);

  const execute = useCallback(
    async (config) => {
      // Cancel any in-flight request
      cancel();

      controllerRef.current = new AbortController();

      try {
        const { data } = await api({
          ...config,
          signal: controllerRef.current.signal,
        });
        return { data, cancelled: false };
      } catch (error) {
        if (axios.isCancel(error)) {
          return { data: null, cancelled: true };
        }
        throw error;
      }
    },
    [cancel]
  );

  // Cancel on unmount
  useEffect(() => () => cancel(), [cancel]);

  return { execute, cancel };
}

// Usage
function ProductSearch() {
  const { execute } = useCancellableRequest();

  async function search(term) {
    const { data, cancelled } = await execute({
      method: "GET",
      url: "/products",
      params: { q: term },
    });

    if (!cancelled && data) setProducts(data);
  }
}
```

### Pattern 4: Route-Level Cancellation

Cancel all in-flight requests on navigation:

```js
// src/lib/requestManager.js
let activeController = new AbortController();

export function getSignal() {
  return activeController.signal;
}

export function cancelAllRequests() {
  activeController.abort();
  activeController = new AbortController(); // fresh controller for next page
}

// Usage in router (Next.js App Router)
// In a layout or route guard component:
useEffect(() => {
  return () => cancelAllRequests(); // cancel everything on route change
}, [pathname]);
```

---

## W — Why It Matters

- Not cancelling requests in `useEffect` is one of the most common sources of **"Can't perform a React state update on an unmounted component"** warnings — the `AbortController` pattern fixes it.
- Search typeaheads without cancellation send 5+ requests per word typed — only the last matters, the rest waste bandwidth and can return out of order.
- The `useRef` for controllers persists the controller across re-renders without triggering re-renders itself — critical for the search pattern.
- Route-level cancellation prevents "ghost requests" from completing for a page the user already left.

---

## I — Interview Q&A

### Q1: Why should you cancel Axios requests in `useEffect` cleanup?

**A:** Without cancellation, if a component unmounts before a request completes, the async callback still runs and tries to call `setState` on the unmounted component — causing a React warning and potential bugs. Aborting the request in the cleanup function (`return () => controller.abort()`) prevents the callback from completing.

### Q2: How do you implement a search typeahead that cancels previous requests?

**A:** Store the AbortController in a `ref`. Before each new search request, abort the previous controller and create a new one. Pass the new `signal` to the request. In the catch block, check `axios.isCancel(error)` and skip UI updates for cancelled requests.

### Q3: Can you reuse an `AbortController` after calling `.abort()`?

**A:** No. Once aborted, an `AbortController` is permanently aborted — its signal's `aborted` property stays `true`. Any request using that signal is immediately cancelled. Create a new `AbortController` for each new batch of requests.

---

## C — Common Pitfalls + Fix

### ❌ Pitfall: Not creating a new controller after aborting

```js
const controller = new AbortController();
// On search change:
controller.abort(); // abort previous
api.get("/search", { signal: controller.signal }); // ← already aborted! Immediate cancel
```

**Fix:**

```js
controller.abort();
controller = new AbortController(); // fresh controller
api.get("/search", { signal: controller.signal }); // ✅
```

### ❌ Pitfall: Cancelling but still updating state

```js
catch (error) {
  if (axios.isCancel(error)) {
    setResults([])  // ← still updating state on unmounted component!
  }
}
```

**Fix:**

```js
catch (error) {
  if (axios.isCancel(error)) return  // ← do nothing. The component is gone.
  setError(error.message)
}
```

### ❌ Pitfall: Storing AbortController in `useState` instead of `useRef`

```js
const [controller, setController] = useState(new AbortController());
// Creating new AbortController triggers re-render
// Re-render re-runs effect, creates another controller → infinite loop
```

**Fix:** Use `useRef` — it doesn't trigger re-renders:

```js
const controllerRef = useRef(null);
controllerRef.current = new AbortController();
```

---

## K — Coding Challenge + Solution

### Challenge

Build a `useSearch(endpoint)` hook that:

1. Accepts a query string via a returned `search(query)` function
2. Cancels previous in-flight requests when a new search fires
3. Manages `results`, `loading`, and `error` state
4. Cancels on unmount

### Solution

```js
import { useState, useRef, useEffect, useCallback } from "react";
import axios from "axios";
import api from "@/lib/api";

function useSearch(endpoint) {
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const controllerRef = useRef(null);

  const search = useCallback(
    async (query) => {
      // Cancel any previous request
      if (controllerRef.current) {
        controllerRef.current.abort();
      }

      if (!query.trim()) {
        setResults([]);
        return;
      }

      controllerRef.current = new AbortController();
      setLoading(true);
      setError(null);

      try {
        const { data } = await api.get(endpoint, {
          params: { q: query },
          signal: controllerRef.current.signal,
        });
        setResults(data);
      } catch (err) {
        if (axios.isCancel(err)) return; // silent — intentional cancel
        setError(err.message ?? "Search failed");
        setResults([]);
      } finally {
        setLoading(false);
      }
    },
    [endpoint]
  );

  // Cancel on unmount
  useEffect(() => () => controllerRef.current?.abort(), []);

  return { results, loading, error, search };
}

export default useSearch;

// Usage
function ProductSearch() {
  const { results, loading, error, search } = useSearch("/api/products");

  return (
    <div>
      <input
        onChange={(e) => search(e.target.value)}
        placeholder="Search products..."
      />
      {loading && <Spinner />}
      {error && <p>{error}</p>}
      {results.map((p) => (
        <ProductCard key={p.id} product={p} />
      ))}
    </div>
  );
}
```

---

---

# 12 — Concurrent Requests

---

## T — TL;DR

**Concurrent requests** fire simultaneously instead of sequentially. `Promise.all` is the standard tool — it waits for all to complete and fails fast on any error. `Promise.allSettled` waits for all and tolerates partial failures.

---

## K — Key Concepts

### Sequential vs Concurrent

```js
// ❌ Sequential — total time = t1 + t2 + t3
const user = (await api.get("/user")).data; // wait for this first
const settings = (await api.get("/settings")).data; // then wait for this
const notifs = (await api.get("/notifications")).data; // then this
// If each takes 300ms → 900ms total

// ✅ Concurrent — total time = max(t1, t2, t3)
const [userRes, settingsRes, notifsRes] = await Promise.all([
  api.get("/user"),
  api.get("/settings"),
  api.get("/notifications"),
]);
// All fire simultaneously → ~300ms total (3x faster)

const user = userRes.data;
const settings = settingsRes.data;
const notifs = notifsRes.data;
```

### `Promise.all` — All or Nothing

```js
try {
  const [userRes, ordersRes] = await Promise.all([
    api.get("/user"),
    api.get("/orders"),
  ]);

  setUser(userRes.data);
  setOrders(ordersRes.data);
} catch (error) {
  // If EITHER request fails, this catch fires
  // The successful request's data is lost
  setError("Failed to load page data");
}
```

Use when: all requests are **equally critical** — failure of any = failure of all.

### `Promise.allSettled` — Best Effort

```js
const [userResult, notifsResult, adsResult] = await Promise.allSettled([
  api.get("/user"), // critical
  api.get("/notifications"), // nice to have
  api.get("/ads"), // non-critical
]);

// Each result: { status: 'fulfilled', value: res } | { status: 'rejected', reason: err }
const user = userResult.status === "fulfilled" ? userResult.value.data : null;
const notifs =
  notifsResult.status === "fulfilled" ? notifsResult.value.data : [];
const ads = adsResult.status === "fulfilled" ? adsResult.value.data : [];

// User is required — fail hard if it failed
if (!user) throw userResult.reason;
```

Use when: some requests are optional — page should still render if non-critical ones fail.

### Concurrent Requests with Axios.all (Legacy) vs Promise.all

```js
// ❌ Old pattern (Axios v0.x) — removed in v1
axios.all([api.get('/a'), api.get('/b')])
axios.spread((resA, resB) => { ... })

// ✅ Modern pattern — use native Promise.all
const [resA, resB] = await Promise.all([api.get('/a'), api.get('/b')])
```

> Axios v1.x removed `axios.all` and `axios.spread`. Use `Promise.all` directly.

### Concurrency with Dynamic Arrays

```js
// Fetch details for an array of IDs
const userIds = [1, 2, 3, 4, 5];

const users = await Promise.all(
  userIds.map((id) => api.get(`/users/${id}`).then((r) => r.data))
);
console.log(users); // [user1, user2, user3, user4, user5]
```

### Controlled Concurrency — Limit Parallel Requests

When you have 100 IDs but don't want to fire 100 simultaneous requests:

```js
async function batchRequests(items, requestFn, batchSize = 5) {
  const results = [];

  for (let i = 0; i < items.length; i += batchSize) {
    const batch = items.slice(i, i + batchSize);
    const batchResults = await Promise.all(batch.map(requestFn));
    results.push(...batchResults);
  }

  return results;
}

// Fetch 100 products, 5 at a time
const productIds = Array.from({ length: 100 }, (_, i) => i + 1);
const products = await batchRequests(productIds, (id) =>
  api.get(`/products/${id}`).then((r) => r.data)
);
```

---

## W — Why It Matters

- Sequential requests for independent data is one of the easiest performance optimizations to make — switching to `Promise.all` can cut page load time in half.
- `Promise.all` vs `Promise.allSettled` is a common React/performance interview question.
- `axios.all` was removed in Axios v1 — using it on a v1 project causes runtime errors. Knowing to use native `Promise.all` is important.
- Controlled concurrency (batching) prevents rate limiting when loading many items — a real-world API constraint.

---

## I — Interview Q&A

### Q1: When would you use `Promise.all` vs `Promise.allSettled`?

**A:** `Promise.all` when all requests are equally necessary — fail if any fail. `Promise.allSettled` when requests have different priorities — a failed non-critical request shouldn't break the whole page. For a dashboard: user profile is critical (use `Promise.all` or handle separately), notification count is optional (use `allSettled`).

### Q2: Is `axios.all` available in Axios v1?

**A:** No. It was removed in Axios v1. Use the native `Promise.all` instead. They're functionally identical except `axios.all` was just a thin wrapper.

### Q3: How would you limit concurrent requests to avoid rate limiting?

**A:** Use a batching function that slices the request array into chunks and `await`s each `Promise.all` batch before starting the next. For example, processing 5 requests at a time: loop over the array in steps of 5, `Promise.all` each slice, push results, continue.

---

## C — Common Pitfalls + Fix

### ❌ Pitfall: Using sequential awaits for independent requests

```js
const user = (await api.get("/user")).data; // 300ms
const products = (await api.get("/products")).data; // 300ms
const orders = (await api.get("/orders")).data; // 300ms
// Total: 900ms ← all independent, wasted time
```

**Fix:**

```js
const [userRes, productsRes, ordersRes] = await Promise.all([
  api.get("/user"),
  api.get("/products"),
  api.get("/orders"),
]);
// Total: ~300ms ✅
```

### ❌ Pitfall: `Promise.all` losing successful results when one fails

```js
const [a, b, c] = await Promise.all([
  api.get("/critical"), // succeeds
  api.get("/optional"), // fails → throws!
  api.get("/optional2"), // succeeds
]);
// Catch fires, a and c data lost
```

**Fix:** If some requests are optional, use `allSettled`:

```js
const [aRes, bRes, cRes] = await Promise.allSettled([...])
const a = aRes.status === 'fulfilled' ? aRes.value.data : null
```

### ❌ Pitfall: Firing 1000 simultaneous requests

```js
const ids = Array.from({ length: 1000 }, (_, i) => i + 1);
const all = await Promise.all(ids.map((id) => api.get(`/items/${id}`)));
// 1000 simultaneous requests → rate limited, browser connection limit hit
```

**Fix:** Use batch concurrency control — 5–10 at a time.

---

## K — Coding Challenge + Solution

### Challenge

Write `loadDashboard(userId)` that fires these requests **concurrently**:

- User profile (critical)
- Notifications (optional)
- Recent orders — max 3 (optional)
- Unread message count (optional)

Return `{ user, notifications, orders, messageCount }` — use empty defaults for failed optional requests.

### Solution

```js
import api from "@/lib/api";

async function loadDashboard(userId) {
  // User is critical — separate await so failure propagates
  const { data: user } = await api.get(`/users/${userId}`);

  // Optional requests — fire concurrently, tolerate failures
  const [notifsResult, ordersResult, messagesResult] = await Promise.allSettled(
    [
      api.get(`/users/${userId}/notifications`),
      api.get(`/users/${userId}/orders`, { params: { limit: 3 } }),
      api.get(`/users/${userId}/messages/unread-count`),
    ]
  );

  return {
    user,
    notifications:
      notifsResult.status === "fulfilled" ? notifsResult.value.data : [],
    orders: ordersResult.status === "fulfilled" ? ordersResult.value.data : [],
    messageCount:
      messagesResult.status === "fulfilled"
        ? messagesResult.value.data.count
        : 0,
  };
}
```

---

---

# 13 — Upload & Download Patterns

---

## T — TL;DR

Axios has built-in `onUploadProgress` and `onDownloadProgress` callbacks. File uploads use `FormData`. File downloads use `responseType: 'blob'`. Both need proper progress tracking and error handling.

---

## K — Key Concepts

### File Upload with `FormData`

```js
async function uploadFile(file, onProgress) {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("name", file.name);
  // Do NOT manually set Content-Type — browser adds boundary automatically

  const { data } = await api.post("/upload", formData, {
    onUploadProgress: (progressEvent) => {
      const { loaded, total } = progressEvent;
      if (total) {
        const percent = Math.round((loaded * 100) / total);
        onProgress(percent);
      }
    },
  });

  return data; // { fileId: '...', url: '...' }
}
```

### Upload Progress in a React Component

```jsx
function FileUploader() {
  const [progress, setProgress] = useState(0);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState(null);
  const [result, setResult] = useState(null);

  async function handleUpload(e) {
    const file = e.target.files[0];
    if (!file) return;

    setUploading(true);
    setError(null);
    setProgress(0);

    try {
      const data = await uploadFile(file, setProgress);
      setResult(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setUploading(false);
    }
  }

  return (
    <div>
      <input type="file" onChange={handleUpload} disabled={uploading} />
      {uploading && (
        <div>
          <progress value={progress} max={100} />
          <span>{progress}%</span>
        </div>
      )}
      {error && <p className="error">{error}</p>}
      {result && <p>Uploaded: {result.url}</p>}
    </div>
  );
}
```

### Multiple File Upload

```js
async function uploadFiles(files, onProgress) {
  const formData = new FormData();
  Array.from(files).forEach((file, i) => {
    formData.append(`files[${i}]`, file);
  });

  const { data } = await api.post("/upload/batch", formData, {
    onUploadProgress: (e) => {
      const percent = Math.round((e.loaded / e.total) * 100);
      onProgress(percent);
    },
  });
  return data;
}
```

### File Download — `responseType: 'blob'`

```js
async function downloadFile(fileId, filename) {
  const response = await api.get(`/files/${fileId}/download`, {
    responseType: "blob", // ← tell Axios to treat response as binary
    onDownloadProgress: (progressEvent) => {
      if (progressEvent.total) {
        const percent = Math.round(
          (progressEvent.loaded / progressEvent.total) * 100
        );
        console.log(`Download: ${percent}%`);
      }
    },
  });

  // Create a temporary download link
  const url = URL.createObjectURL(response.data);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url); // ← cleanup memory
}
```

### Download with Filename from Content-Disposition Header

```js
async function downloadFileAuto(fileId) {
  const response = await api.get(`/files/${fileId}/download`, {
    responseType: "blob",
  });

  // Extract filename from Content-Disposition header
  const contentDisposition = response.headers["content-disposition"];
  let filename = "download";

  if (contentDisposition) {
    const match = contentDisposition.match(
      /filename[^;=\n]*=(['"]*)(.*?)\1[;\n]?$/
    );
    if (match?.[2]) filename = decodeURIComponent(match[2]);
  }

  const url = URL.createObjectURL(response.data);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}
```

### Upload with Cancellation

```js
async function uploadWithCancel(file, onProgress) {
  const controller = new AbortController();

  const uploadPromise = api.post("/upload", createFormData(file), {
    signal: controller.signal,
    onUploadProgress: (e) => {
      const percent = Math.round((e.loaded / e.total) * 100);
      onProgress(percent);
    },
  });

  return { uploadPromise, cancel: () => controller.abort() };
}

// Usage
const { uploadPromise, cancel } = await uploadWithCancel(file, setProgress);
setCancelFn(() => cancel); // expose cancel to UI
const result = await uploadPromise;
```

---

## W — Why It Matters

- File upload with progress bars is a ubiquitous feature — every admin panel, profile editor, or document manager needs it.
- Not revoking `URL.createObjectURL` after a download is a memory leak — browsers hold the blob in memory until the URL is revoked.
- Getting the filename from `Content-Disposition` is required for dynamically named files (e.g., `report-2026-05-19.pdf`).
- Cancellable uploads improve UX significantly for large files — users need an "X" button to stop.

---

## I — Interview Q&A

### Q1: How do you track upload progress in Axios?

**A:** Use the `onUploadProgress` callback in the request config. It receives a `ProgressEvent` with `loaded` (bytes uploaded so far) and `total` (total bytes). Calculate `Math.round((loaded / total) * 100)` for the percentage.

### Q2: Why shouldn't you manually set `Content-Type: multipart/form-data` when uploading with `FormData`?

**A:** The browser automatically sets `Content-Type: multipart/form-data; boundary=----WebKitFormBoundary...`. The boundary is a unique string that separates form fields in the body. If you override the header manually, you overwrite the boundary and the server can't parse the form data.

### Q3: How do you trigger a file download from an Axios response?

**A:** Set `responseType: 'blob'`, then create an object URL with `URL.createObjectURL(response.data)`, create a hidden `<a>` element, set its `href` and `download` attribute, click it programmatically, then revoke the URL with `URL.revokeObjectURL()` to prevent memory leaks.

---

## C — Common Pitfalls + Fix

### ❌ Pitfall: Manually setting `Content-Type` for `FormData`

```js
api.post("/upload", formData, {
  headers: { "Content-Type": "multipart/form-data" }, // ← removes boundary!
});
// Server: cannot parse multipart body — boundary missing
```

**Fix:** Remove the header. Let the browser set it with the boundary automatically.

### ❌ Pitfall: Not revoking the object URL after download

```js
const url = URL.createObjectURL(blob);
link.click();
// ← No revokeObjectURL → blob stays in memory for the lifetime of the page
```

**Fix:**

```js
const url = URL.createObjectURL(blob);
link.click();
URL.revokeObjectURL(url); // ✅ immediate cleanup is fine — download already started
```

### ❌ Pitfall: Calling `.json()` or accessing `.data` as JSON on a blob response

```js
const { data } = await api.get("/export", { responseType: "blob" });
console.log(data.filename); // undefined — data is a Blob, not parsed JSON
```

**Fix:** When `responseType: 'blob'` is set, `data` is a Blob. Use `URL.createObjectURL(data)` for downloads. If you need both JSON metadata and a file, use separate requests.

---

## K — Coding Challenge + Solution

### Challenge

Write `uploadAvatar(userId, file, onProgress)` that:

1. Sends the file as `FormData`
2. Tracks upload progress
3. Allows cancellation — returns a `{ promise, cancel }` object
4. Returns the new avatar URL on success

```js
const { promise, cancel } = uploadAvatar(42, file, setProgress);
// User clicks cancel:
cancel();
// Or await result:
const { avatarUrl } = await promise;
```

### Solution

```js
import api from "@/lib/api";
import axios from "axios";

function uploadAvatar(userId, file, onProgress) {
  const controller = new AbortController();

  const promise = (async () => {
    const formData = new FormData();
    formData.append("avatar", file);
    formData.append("userId", String(userId));
    // No Content-Type override — browser sets multipart boundary

    try {
      const { data } = await api.post(`/users/${userId}/avatar`, formData, {
        signal: controller.signal,
        onUploadProgress: (e) => {
          if (e.total) {
            const percent = Math.round((e.loaded / e.total) * 100);
            onProgress(percent);
          }
        },
      });
      return data; // { avatarUrl: 'https://...' }
    } catch (err) {
      if (axios.isCancel(err)) return null; // cancelled by user
      throw err; // real error — propagate
    }
  })();

  return {
    promise,
    cancel: () => controller.abort(),
  };
}
```

---

---

# 14 — Maintainable Service-Layer Structure

> Picking up from **I — Interview Q&A**, Q3 onward.

---

## I — Interview Q&A _(continued)_

### Q3: What naming conventions should service methods follow and why?

**A:** Use consistent CRUD names across all services: `list`, `getById`, `create`, `update`, `replace`, `remove`. This means any developer can use `orderService`, `userService`, or `postService` without reading the implementation — the method names are predictable by convention. Inconsistent names like `fetchUsers`, `getUser`, `loadUserById` across different services add unnecessary cognitive overhead.

---

## C — Common Pitfalls + Fix

### ❌ Pitfall: Importing raw `axios` or the `api` instance directly in components

```jsx
// UserProfile.jsx
import axios from "axios"; // ❌ raw axios in a component
import api from "@/lib/api"; // ❌ instance in a component

function UserProfile({ userId }) {
  useEffect(() => {
    axios.get(`https://api.example.com/users/${userId}`); // tightly coupled
  }, [userId]);
}
```

**Fix:** Components only import from services:

```jsx
import userService from "@/services/userService"; // ✅

function UserProfile({ userId }) {
  useEffect(() => {
    userService.getById(userId).then(({ data }) => setUser(data));
  }, [userId]);
}
```

Now switching from Axios to `fetch` or any other client requires editing exactly ONE file — the service — not every component.

---

### ❌ Pitfall: Duplicating error handling logic in every service method

```js
// userService.js
const userService = {
  getById: async (id) => {
    try {
      const res = await api.get(`/users/${id}`);
      return res.data;
    } catch (err) {
      // 20 lines of error handling
    }
  },
  create: async (data) => {
    try {
      const res = await api.post("/users", data);
      return res.data;
    } catch (err) {
      // Same 20 lines of error handling again
    }
  },
  // Repeated in every method ← maintenance nightmare
};
```

**Fix:** Error handling belongs in the `request()` helper. Services stay thin:

```js
const userService = {
  getById: (id) => request("GET", `/users/${id}`),
  create: (data) => request("POST", "/users", data),
  update: (id, d) => request("PATCH", `/users/${id}`, d),
  remove: (id) => request("DELETE", `/users/${id}`),
};
// Each method is one line. Error handling lives in request() ✅
```

---

### ❌ Pitfall: Inconsistent method names across services

```js
// userService.js
userService.fetchAll()     ← "fetchAll"
userService.loadUser(id)   ← "loadUser"

// orderService.js
orderService.getOrders()   ← "getOrders"
orderService.findById(id)  ← "findById"

// postService.js
postService.list()         ← "list"
postService.getPost(id)    ← "getPost"
```

**Fix:** Establish and enforce a naming convention across all services:

```js
// Every service uses the same method names:
service.list(params)       → GET /resources
service.getById(id)        → GET /resources/:id
service.create(data)       → POST /resources
service.update(id, data)   → PATCH /resources/:id
service.replace(id, data)  → PUT /resources/:id
service.remove(id)         → DELETE /resources/:id
```

---

### ❌ Pitfall: Putting business logic inside service methods

```js
// ❌ service doing too much — mixing HTTP and business logic
const orderService = {
  create: async (cart) => {
    // Business logic: calculate total, apply discount, validate stock
    const total = cart.items.reduce(
      (sum, item) => sum + item.price * item.qty,
      0
    );
    const discount = total > 100 ? 0.1 : 0;
    const finalTotal = total * (1 - discount);

    if (cart.items.some((item) => item.qty > item.stock)) {
      throw new Error("Item out of stock");
    }

    return request("POST", "/orders", { ...cart, total: finalTotal });
  },
};
```

**Fix:** Services handle HTTP only. Business logic belongs in a separate layer (hooks, stores, or utility functions):

```js
// ✅ Service — HTTP only
const orderService = {
  create: (orderData) => request("POST", "/orders", orderData),
};

// ✅ Business logic in a hook or utility
function useCreateOrder() {
  async function submitOrder(cart) {
    const processedCart = applyDiscounts(validateCart(cart)); // business logic
    return orderService.create(processedCart); // service handles HTTP
  }
  return { submitOrder };
}
```

---

### ❌ Pitfall: Creating a single `apiService.js` with all endpoints

```js
// ❌ One file with 200 methods — unreadable and unscalable
const apiService = {
  getUsers: () => request("GET", "/users"),
  getUser: (id) => request("GET", `/users/${id}`),
  createUser: (d) => request("POST", "/users", d),
  getPosts: () => request("GET", "/posts"),
  getPost: (id) => request("GET", `/posts/${id}`),
  createPost: (d) => request("POST", "/posts", d),
  getOrders: () => request("GET", "/orders"),
  // ... 194 more methods
};
```

**Fix:** One file per resource. Import only what a component needs:

```js
import userService from "@/services/userService"; // only users
import postService from "@/services/postService"; // only posts
// orderService is not imported — not loaded at all for this component
```

---

## K — Coding Challenge + Solution

### Challenge

Build the **complete service layer** for a blog application from scratch:

**Requirements:**

1. `src/lib/api.js` — Axios instance with:
   - Base URL from environment variable (fallback to `http://localhost:3000`)
   - 10s default timeout
   - Request interceptor: inject Bearer token + stamp `metadata.startTime`
   - Response interceptor: log timing in DEV, redirect on 401

2. `src/lib/request.js` — Normalized `request()` helper returning `{ data, error }`

3. `src/services/authService.js` — methods: `login`, `logout`, `refreshToken`, `getProfile`

4. `src/services/postService.js` — methods: `list`, `getById`, `create`, `update`, `remove`, `getComments`

5. `src/services/commentService.js` — methods: `create`, `update`, `remove`

6. Demonstrate usage in a clean component `PostDetail.jsx`

---

### Solution

```js
// src/lib/api.js
import axios from "axios";

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL ?? "http://localhost:3000",
  timeout: 10000,
  headers: {
    "Content-Type": "application/json",
    Accept: "application/json",
  },
});

// ─── Request interceptor ─────────────────────────────────
api.interceptors.request.use(
  (config) => {
    config.headers = config.headers ?? {};
    config.metadata = { startTime: Date.now() };

    const token = localStorage.getItem("access_token");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    return config;
  },
  (error) => Promise.reject(error)
);

// ─── Response interceptor ────────────────────────────────
api.interceptors.response.use(
  (response) => {
    if (import.meta.env.DEV) {
      const ms = Date.now() - (response.config.metadata?.startTime ?? 0);
      const method = response.config.method?.toUpperCase();
      const url = response.config.url;
      console.log(`← ${response.status} ${method} ${url} (${ms}ms)`);
    }
    return response;
  },
  (error) => {
    if (import.meta.env.DEV) {
      const ms = Date.now() - (error.config?.metadata?.startTime ?? 0);
      const method = error.config?.method?.toUpperCase();
      const url = error.config?.url;
      console.error(
        `✗ ${error.response?.status ?? "NET"} ${method} ${url} (${ms}ms)`
      );
    }

    const status = error.response?.status;
    const isRefreshUrl = error.config?.url?.includes("/auth/refresh");

    if (status === 401 && !isRefreshUrl) {
      localStorage.removeItem("access_token");
      const redirect = encodeURIComponent(window.location.pathname);
      window.location.href = `/login?redirect=${redirect}`;
    }

    return Promise.reject(error);
  }
);

export default api;
```

---

```js
// src/lib/request.js
import axios from "axios";
import api from "./api";

/**
 * Normalized request helper.
 * Always returns { data, error } — never throws.
 *
 * @param {'GET'|'POST'|'PUT'|'PATCH'|'DELETE'} method
 * @param {string} url
 * @param {object|null} body        - request body (POST/PUT/PATCH)
 * @param {object|null} params      - query parameters
 * @param {object}      config      - extra Axios config (signal, timeout, etc.)
 * @returns {Promise<{ data: any, error: object|null }>}
 */
export async function request(
  method,
  url,
  body = null,
  params = null,
  config = {}
) {
  try {
    const res = await api({ method, url, data: body, params, ...config });
    return { data: res.data, error: null };
  } catch (err) {
    return { data: null, error: buildError(err) };
  }
}

function buildError(err) {
  // Non-Axios error (programming mistake, etc.)
  if (!axios.isAxiosError(err)) {
    return {
      message: err.message ?? "Unexpected error",
      code: "UNEXPECTED",
      status: null,
      details: [],
      fieldErrors: {},
    };
  }

  // Timeout
  if (err.code === "ECONNABORTED") {
    return {
      message: "Request timed out. Please try again.",
      code: "TIMEOUT",
      status: null,
      details: [],
      fieldErrors: {},
    };
  }

  // Network error (no response at all)
  if (!err.response) {
    return {
      message: "Network error. Check your connection.",
      code: "NETWORK_ERROR",
      status: null,
      details: [],
      fieldErrors: {},
    };
  }

  // Server responded with 4xx / 5xx
  const details = err.response.data?.error?.details ?? [];
  const fieldErrors = Object.fromEntries(
    details.filter((d) => d.field).map(({ field, message }) => [field, message])
  );

  return {
    message:
      err.response.data?.error?.message ?? `Error ${err.response.status}`,
    code: err.response.data?.error?.code ?? "HTTP_ERROR",
    status: err.response.status,
    details,
    fieldErrors,
  };
}
```

---

```js
// src/services/authService.js
import { request } from "@/lib/request";
import { setToken, clearToken } from "@/lib/api";

const authService = {
  /**
   * POST /auth/login
   * Stores token automatically on success.
   */
  login: async (email, password) => {
    const result = await request("POST", "/auth/login", { email, password });

    if (!result.error && result.data?.accessToken) {
      localStorage.setItem("access_token", result.data.accessToken);
      if (result.data.refreshToken) {
        localStorage.setItem("refresh_token", result.data.refreshToken);
      }
    }

    return result;
    // { data: { accessToken, refreshToken, user }, error: null }
    // or { data: null, error: { message, code, ... } }
  },

  /**
   * POST /auth/logout
   * Clears tokens regardless of API response.
   */
  logout: async () => {
    const result = await request("POST", "/auth/logout");
    // Always clear — even if server-side logout fails
    localStorage.removeItem("access_token");
    localStorage.removeItem("refresh_token");
    return result;
  },

  /**
   * POST /auth/refresh
   * Exchanges refresh token for a new access token.
   */
  refreshToken: async () => {
    const refreshToken = localStorage.getItem("refresh_token");
    if (!refreshToken) {
      return {
        data: null,
        error: { message: "No refresh token", code: "NO_REFRESH_TOKEN" },
      };
    }

    const result = await request("POST", "/auth/refresh", { refreshToken });

    if (!result.error && result.data?.accessToken) {
      localStorage.setItem("access_token", result.data.accessToken);
    }

    return result;
  },

  /**
   * GET /auth/me
   * Returns the currently authenticated user's profile.
   */
  getProfile: () => request("GET", "/auth/me"),
};

export default authService;
```

---

```js
// src/services/postService.js
import { request } from "@/lib/request";

const postService = {
  /**
   * GET /posts
   * Supports filtering: { authorId, tag, status, sort, order, page, limit }
   */
  list: (params = {}) => request("GET", "/posts", null, params),

  /**
   * GET /posts/:id
   */
  getById: (id) => request("GET", `/posts/${id}`),

  /**
   * POST /posts
   * body: { title, content, tags?, status? }
   */
  create: (postData) => request("POST", "/posts", postData),

  /**
   * PATCH /posts/:id
   * body: partial post fields
   */
  update: (id, updates) => request("PATCH", `/posts/${id}`, updates),

  /**
   * DELETE /posts/:id
   */
  remove: (id) => request("DELETE", `/posts/${id}`),

  /**
   * GET /posts/:id/comments
   * Supports pagination: { page, limit }
   */
  getComments: (postId, params = {}) =>
    request("GET", `/posts/${postId}/comments`, null, params),

  /**
   * PATCH /posts/:id — publish a draft post
   */
  publish: (id) => request("PATCH", `/posts/${id}`, { status: "published" }),

  /**
   * GET /posts/:id/related
   * Returns related posts based on tags.
   */
  getRelated: (id, limit = 5) =>
    request("GET", `/posts/${id}/related`, null, { limit }),
};

export default postService;
```

---

```js
// src/services/commentService.js
import { request } from "@/lib/request";

const commentService = {
  /**
   * POST /posts/:postId/comments
   * body: { text }
   */
  create: (postId, text) =>
    request("POST", `/posts/${postId}/comments`, { text }),

  /**
   * PATCH /comments/:id
   * body: { text }
   */
  update: (id, text) => request("PATCH", `/comments/${id}`, { text }),

  /**
   * DELETE /comments/:id
   */
  remove: (id) => request("DELETE", `/comments/${id}`),

  /**
   * POST /comments/:id/likes
   */
  like: (id) => request("POST", `/comments/${id}/likes`),

  /**
   * DELETE /comments/:id/likes
   */
  unlike: (id) => request("DELETE", `/comments/${id}/likes`),
};

export default commentService;
```

---

```jsx
// src/components/PostDetail.jsx
// ✅ Clean component — zero Axios imports, zero raw HTTP calls
import { useEffect, useState } from "react";
import postService from "@/services/postService";
import commentService from "@/services/commentService";

function PostDetail({ postId }) {
  const [post, setPost] = useState(null);
  const [comments, setComments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [newComment, setNewComment] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // ─── Load post + comments concurrently ───────────────
  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError(null);

      const [postResult, commentsResult] = await Promise.all([
        postService.getById(postId),
        postService.getComments(postId, { limit: 20 }),
      ]);

      if (cancelled) return;

      if (postResult.error) {
        setError(postResult.error.message);
      } else {
        setPost(postResult.data);
        setComments(commentsResult.data ?? []);
      }

      setLoading(false);
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [postId]);

  // ─── Submit a new comment ─────────────────────────────
  async function handleAddComment(e) {
    e.preventDefault();
    if (!newComment.trim()) return;

    setSubmitting(true);

    const { data, error } = await commentService.create(postId, newComment);

    if (error) {
      alert(error.message);
    } else {
      setComments((prev) => [...prev, data]);
      setNewComment("");
    }

    setSubmitting(false);
  }

  // ─── Delete a comment ─────────────────────────────────
  async function handleDeleteComment(commentId) {
    const { error } = await commentService.remove(commentId);
    if (!error) {
      setComments((prev) => prev.filter((c) => c.id !== commentId));
    }
  }

  // ─── Render ───────────────────────────────────────────
  if (loading) return <div className="spinner">Loading...</div>;
  if (error) return <div className="error">{error}</div>;
  if (!post) return null;

  return (
    <article>
      <h1>{post.title}</h1>
      <p>{post.content}</p>

      <section>
        <h2>Comments ({comments.length})</h2>

        {comments.map((comment) => (
          <div key={comment.id} className="comment">
            <p>{comment.text}</p>
            <button onClick={() => handleDeleteComment(comment.id)}>
              Delete
            </button>
          </div>
        ))}

        <form onSubmit={handleAddComment}>
          <textarea
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            placeholder="Add a comment..."
            rows={3}
          />
          <button type="submit" disabled={submitting}>
            {submitting ? "Posting..." : "Post Comment"}
          </button>
        </form>
      </section>
    </article>
  );
}

export default PostDetail;
```

---

### What This Architecture Gives You

```
PostDetail.jsx knows:
  ✅ WHAT data it needs (post, comments)
  ✅ HOW to display it (JSX)
  ❌ NOT how HTTP works (zero Axios)
  ❌ NOT what URL is called
  ❌ NOT how errors are structured

postService.js knows:
  ✅ All post-related URLs
  ✅ What params each endpoint takes
  ❌ NOT how auth headers are injected (api.js does that)
  ❌ NOT how errors are normalized (request.js does that)
  ❌ NOT any UI concerns

api.js knows:
  ✅ The base URL
  ✅ Auth header injection
  ✅ Global error flows (401 redirect)
  ❌ NOT any specific resource or UI
```

**Each layer has one job. One file changes when one thing changes.**

---

---

## ✅ Day 4 Complete — Axios Client Architecture

| #   | Subtopic                                               | Status |
| --- | ------------------------------------------------------ | ------ |
| 1   | Axios Instances — Why One Global `axios` Is Not Enough | ☐      |
| 2   | `baseURL` & Config Defaults                            | ☐      |
| 3   | Auth Token Injection                                   | ☐      |
| 4   | Request Interceptors — Before Every Request            | ☐      |
| 5   | Response Interceptors — After Every Response           | ☐      |
| 6   | Interceptor Execution Order — Request Before Response  | ☐      |
| 7   | Interceptor Ejection & Cleanup                         | ☐      |
| 8   | Normalized Success & Error Handling                    | ☐      |
| 9   | Handling 401 / 403 / 404 / 5xx Flows                   | ☐      |
| 10  | Timeout vs Cancellation                                | ☐      |
| 11  | AbortController-Based Cancellation                     | ☐      |
| 12  | Concurrent Requests                                    | ☐      |
| 13  | Upload & Download Patterns                             | ☐      |
| 14  | Maintainable Service-Layer Structure                   | ☐      |

---

> **The entire Day 4 architecture fits in 4 files:**
> `api.js` → `request.js` → `*Service.js` → `Component.jsx`
> Set it up once. Every future feature slots in cleanly.
>
> _Doing one small thing beats opening a feed._
