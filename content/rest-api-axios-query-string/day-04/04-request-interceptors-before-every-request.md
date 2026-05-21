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
