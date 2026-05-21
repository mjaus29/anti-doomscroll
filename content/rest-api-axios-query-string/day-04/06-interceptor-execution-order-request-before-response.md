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
