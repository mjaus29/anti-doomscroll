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
