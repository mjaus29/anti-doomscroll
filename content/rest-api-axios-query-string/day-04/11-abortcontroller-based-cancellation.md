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
