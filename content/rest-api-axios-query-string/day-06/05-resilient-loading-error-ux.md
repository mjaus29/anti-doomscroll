# 5 — Resilient Loading & Error UX

---

## T — TL;DR

A resilient UI never leaves users staring at a blank screen. Every API call has three states — **loading, success, error** — and the UI must handle all three explicitly. Add retry, skeleton screens, and graceful degradation to graduate from "it works" to "it feels good."

---

## K — Key Concepts

### The Three Required States — Always

```
❌ Only handling success:
const { data } = await api.get('/products')
setProducts(data)
// What about loading? What about errors?

✅ All three states covered:
setLoading(true)
try {
  const { data } = await api.get('/products')
  setProducts(data)
  setError(null)
} catch (err) {
  setError(getErrorMessage(err))
} finally {
  setLoading(false)
}
```

### Loading UX Hierarchy

```
Rank 1: Skeleton screens      ← best UX — users see layout before data
Rank 2: Spinner overlay       ← good for update operations (not initial load)
Rank 3: Inline spinner        ← acceptable for small components
Rank 4: "Loading..." text     ← minimum acceptable

Worst:  Blank screen / nothing ← never acceptable
```

```jsx
// Skeleton screen pattern
function ProductCard({ product, loading }) {
  if (loading) {
    return (
      <div className="card skeleton">
        <div className="skeleton-img" />
        <div className="skeleton-line w-3/4" />
        <div className="skeleton-line w-1/2" />
      </div>
    )
  }
  return <div className="card">...</div>
}

// Render skeletons during load
{loading
  ? Array.from({ length: 6 }, (_, i) => <ProductCard key={i} loading />)
  : products.map(p => <ProductCard key={p.id} product={p} />)
}
```

### Error UX Hierarchy — Match Error to Context

```
Global errors (401, 503):     toast / banner — appears without disrupting layout
Page-level errors (500, 404): full error state replaces content
Field-level errors (422):     inline below each form field
Network errors:               retry prompt with explanation
Timeout errors:               "Taking longer than expected" + retry
```

```jsx
function ErrorState({ error, onRetry }) {
  const isNetwork  = error.code === 'NETWORK_ERROR'
  const isTimeout  = error.code === 'TIMEOUT'
  const isNotFound = error.status === 404
  const isServer   = error.status >= 500

  const message = isNetwork  ? 'No internet connection.'
    : isTimeout              ? 'The server is taking too long.'
    : isNotFound             ? 'This page does not exist.'
    : isServer               ? 'Server error. Try again later.'
    : error.message

  return (
    <div role="alert" className="error-state">
      <p>{message}</p>
      {(isNetwork || isTimeout || isServer) && (
        <button onClick={onRetry}>Try Again</button>
      )}
    </div>
  )
}
```

### Retry Logic — Manual and Automatic

```js
// Manual retry — user clicks "Try Again"
const [retryKey, setRetryKey] = useState(0)
useEffect(() => {
  fetchData()
}, [retryKey])

<button onClick={() => setRetryKey(k => k + 1)}>Try Again</button>

// Automatic retry with exponential backoff (for transient server errors)
async function fetchWithRetry(requestFn, maxAttempts = 3) {
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await requestFn()
    } catch (err) {
      const isRetryable = !err.response || err.response.status >= 500
      if (!isRetryable || attempt === maxAttempts) throw err

      const delay = Math.min(1000 * 2 ** attempt, 8000)  // 2s, 4s, 8s
      await new Promise(r => setTimeout(r, delay))
    }
  }
}
```

### Stale-While-Revalidate UX Pattern

```js
// Show stale data immediately, fetch fresh data in background
const [data, setData]         = useState(null)
const [isStale, setIsStale]   = useState(false)
const [loading, setLoading]   = useState(false)

async function loadWithSWR() {
  // 1. Show cached data immediately (if any)
  const cached = sessionStorage.getItem('products-cache')
  if (cached) {
    setData(JSON.parse(cached))
    setIsStale(true)   // show "updating..." indicator
  } else {
    setLoading(true)
  }

  // 2. Fetch fresh data in background
  try {
    const fresh = await productService.list()
    setData(fresh)
    setIsStale(false)
    sessionStorage.setItem('products-cache', JSON.stringify(fresh))
  } catch (err) {
    if (!cached) setError(err.message)  // only show error if no cache to fall back to
  } finally {
    setLoading(false)
  }
}
```

### Optimistic Updates

```js
// Update UI immediately, roll back on failure
async function toggleLike(postId, currentlyLiked) {
  // 1. Optimistically update UI
  setPosts(prev => prev.map(p =>
    p.id === postId
      ? { ...p, liked: !currentlyLiked, likeCount: p.likeCount + (currentlyLiked ? -1 : 1) }
      : p
  ))

  // 2. Send to server
  try {
    await postService[currentlyLiked ? 'unlike' : 'like'](postId)
  } catch (err) {
    // 3. Rollback on failure
    setPosts(prev => prev.map(p =>
      p.id === postId
        ? { ...p, liked: currentlyLiked, likeCount: p.likeCount + (currentlyLiked ? 1 : -1) }
        : p
    ))
    showToast('Failed to update. Please try again.')
  }
}
```

---

## W — Why It Matters

- Blank screens on load are the #1 user complaint about slow apps — skeleton screens make the same wait feel shorter.
- Error states without a retry button are dead ends — users hit "back" and never return. A retry button keeps them engaged.
- Optimistic updates make write-heavy UIs (likes, saves, toggles) feel instant — the difference between "feels native" and "feels like a website."
- The stale-while-revalidate pattern is the foundation of React Query, SWR, and TanStack Query — understanding it explains why those libraries exist.

---

## I — Interview Q&A

### Q1: What are the three states every API call must handle?

**A:** Loading (request in flight), success (data received), and error (request failed). The UI must explicitly handle all three — loading with a skeleton or spinner, success with the data rendered, and error with a meaningful message and ideally a retry action.

### Q2: What is an optimistic update and when would you use it?

**A:** An optimistic update immediately updates the UI as if the server request succeeded, then rolls back if it fails. Use it for low-stakes, high-frequency interactions where latency would be noticeable — likes, saves, toggles, reorders. Don't use it for critical operations like payments or deletions where a failure must be confirmed before the UI changes.

### Q3: What is the stale-while-revalidate pattern?

**A:** Show cached (stale) data immediately so the user sees content right away, then fetch fresh data in the background and update when it arrives. It combines instant perceived performance with eventual consistency. React Query and SWR implement this by default — the query returns cached data immediately and revalidates in the background.

---

## C — Common Pitfalls + Fix

### ❌ Pitfall: Setting loading = false in `try` before the `finally`

```js
try {
  const data = await api.get('/products')
  setProducts(data)
  setLoading(false)     // ← only runs on success
} catch (err) {
  setError(err.message)
  // loading never set to false on error → spinner spins forever
}
```

**Fix:**

```js
try {
  const data = await api.get('/products')
  setProducts(data)
} catch (err) {
  setError(err.message)
} finally {
  setLoading(false)   // ✅ always runs
}
```

### ❌ Pitfall: No visual difference between first load and refresh

```js
// Both show full-page spinner — disorienting on refresh
setLoading(true)
setProducts([])   // ← clears existing data → blank screen during refresh
```

**Fix:** Keep existing data visible while refreshing:

```js
setRefreshing(true)  // ← separate state for background refresh
// products stay visible, small "updating" indicator shows
```

### ❌ Pitfall: Showing raw Axios error messages to users

```js
catch (err) {
  setError(err.message)
  // "Request failed with status code 500" — technical, not helpful
}
```

**Fix:**

```js
catch (err) {
  const message = err.normalized?.message
    ?? (err.response?.status >= 500 ? 'Server error. Please try again.' : 'Something went wrong.')
  setError(message)
}
```

---

## K — Coding Challenge + Solution

### Challenge

Write a `useAsyncData(fetchFn, deps)` hook that:
1. Manages `data`, `loading`, `error` state
2. Supports `retry()` function
3. Supports `refresh()` (re-fetches keeping existing data visible)
4. Cancels in-flight request on unmount

### Solution

```js
import { useState, useEffect, useCallback, useRef } from 'react'
import axios from 'axios'

function useAsyncData(fetchFn, deps = []) {
  const [data,       setData]       = useState(null)
  const [loading,    setLoading]    = useState(true)
  const [error,      setError]      = useState(null)
  const [refreshing, setRefreshing] = useState(false)
  const [retryKey,   setRetryKey]   = useState(0)
  const controllerRef = useRef(null)

  useEffect(() => {
    controllerRef.current?.abort()
    controllerRef.current = new AbortController()
    const signal = controllerRef.current.signal

    const isFirstLoad = data === null

    if (isFirstLoad) setLoading(true)
    else             setRefreshing(true)

    setError(null)

    fetchFn(signal)
      .then((result) => {
        if (!signal.aborted) {
          setData(result)
        }
      })
      .catch((err) => {
        if (!signal.aborted && !axios.isCancel(err)) {
          setError(err.normalized?.message ?? err.message ?? 'Error loading data')
        }
      })
      .finally(() => {
        if (!signal.aborted) {
          setLoading(false)
          setRefreshing(false)
        }
      })

    return () => controllerRef.current?.abort()
  }, [...deps, retryKey])  // eslint-disable-line

  const retry   = useCallback(() => setRetryKey(k => k + 1), [])
  const refresh = useCallback(() => setRetryKey(k => k + 1), [])

  return { data, loading, error, refreshing, retry, refresh }
}

export default useAsyncData

// Usage
function ProductList() {
  const { data, loading, error, refreshing, retry } = useAsyncData(
    (signal) => productService.list({ page: 1 }, signal),
    []
  )

  if (loading) return <SkeletonGrid />
  if (error)   return <ErrorState error={{ message: error }} onRetry={retry} />
  return (
    <div>
      {refreshing && <p className="text-sm text-gray-400">Updating...</p>}
      <ProductGrid products={data?.products ?? []} />
    </div>
  )
}
```

---

---
