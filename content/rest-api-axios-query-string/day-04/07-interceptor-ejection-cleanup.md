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
