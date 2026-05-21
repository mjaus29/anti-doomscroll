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
