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
