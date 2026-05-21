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
