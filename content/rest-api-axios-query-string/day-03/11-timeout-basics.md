# 11 — Timeout Basics

---

## T — TL;DR

A **timeout** cancels a request if it takes too long. In Axios, set it with the `timeout` config key (in milliseconds). Without it, a slow server can hang your UI indefinitely.

---

## K — Key Concepts

### Setting a Timeout

```js
// Cancel request if no response within 5 seconds
const { data } = await axios.get('/api/users', {
  timeout: 5000  // milliseconds
})
```

### What Happens on Timeout

```js
try {
  const { data } = await axios.get('/api/slow-endpoint', {
    timeout: 3000  // 3 seconds
  })
} catch (error) {
  if (error.code === 'ECONNABORTED') {
    console.log('Request timed out')
    // error.message: "timeout of 3000ms exceeded"
  }
}
```

### Detecting Timeout Errors Specifically

```js
function isTimeoutError(error) {
  return axios.isAxiosError(error) && error.code === 'ECONNABORTED'
}

try {
  await axios.get('/api/data', { timeout: 5000 })
} catch (error) {
  if (isTimeoutError(error)) {
    showMessage('The request is taking too long. Please try again.')
  } else if (error.response) {
    showMessage(`Server error: ${error.response.status}`)
  } else {
    showMessage('Network error.')
  }
}
```

### Default Timeout on an Axios Instance

Set once — applies to all requests through that instance:

```js
const api = axios.create({
  baseURL: 'https://api.example.com',
  timeout: 10000  // 10 seconds for all requests
})

// Override per request when needed
api.get('/quick-endpoint', { timeout: 2000 })   // 2s for this one
api.get('/large-export',   { timeout: 60000 })  // 60s for downloads
```

### Recommended Timeout Values

| Request Type | Suggested Timeout |
|---|---|
| Simple GET (data) | 5,000ms (5s) |
| POST/PATCH (forms) | 10,000ms (10s) |
| File upload | 30,000–120,000ms |
| File download / export | 30,000–60,000ms |
| Auth/login | 8,000ms (8s) |
| Background sync | 15,000ms (15s) |

### Timeout vs Cancellation (Bonus)

Timeout is automatic cancellation after N ms. Manual cancellation uses `AbortController`:

```js
const controller = new AbortController()

// Cancel on user action (e.g., navigating away)
const { data } = await axios.get('/api/data', {
  signal: controller.signal
})

// Somewhere else in your code:
controller.abort()  // cancels the request immediately
```

In React, this is used in `useEffect` cleanup:

```js
useEffect(() => {
  const controller = new AbortController()

  axios.get('/api/data', { signal: controller.signal })
    .then(res => setData(res.data))
    .catch(err => {
      if (!axios.isCancel(err)) setError(err.message)
    })

  return () => controller.abort()  // cleanup on unmount
}, [])
```

---

## W — Why It Matters

- Without timeouts, a single slow API call can freeze your UI indefinitely — users will think the app is broken.
- `ECONNABORTED` is the specific error code you need to recognize to show a "request timed out" message vs a "server error" message.
- The React `useEffect` cleanup with `AbortController` is a standard pattern to prevent state updates on unmounted components — a memory leak fix.
- Setting a global timeout on an instance is a one-liner that improves every request in your app at once.

---

## I — Interview Q&A

### Q1: How do you set a timeout in Axios?

**A:** Set `timeout` in the config object with a value in milliseconds: `axios.get('/api', { timeout: 5000 })`. If no response is received within that time, Axios throws an error with `error.code === 'ECONNABORTED'`.

### Q2: What error code does a timed-out request throw?

**A:** `ECONNABORTED`. You can check it with `error.code === 'ECONNABORTED'` inside your catch block to show a specific timeout message to the user.

### Q3: What's the difference between a timeout and request cancellation?

**A:** A timeout automatically cancels a request after a fixed duration. Manual cancellation (with `AbortController` and `signal`) lets you cancel a request programmatically at any time — for example, when a user navigates away from a page or types a new search query before the previous one completes.

---

## C — Common Pitfalls + Fix

### ❌ Pitfall: No timeout at all

```js
axios.get('/api/slow-report')
// If server takes 2 minutes, UI hangs for 2 minutes with no feedback
```

**Fix:** Always set a timeout. Set a sensible default on the instance, override for long operations:

```js
const api = axios.create({ timeout: 10000 })
api.get('/large-export', { timeout: 120000 })  // override for long ops
```

### ❌ Pitfall: Not handling timeout errors specifically

```js
catch (error) {
  setError('Something went wrong')  // ← same message for timeout AND server crash
}
```

**Fix:**

```js
catch (error) {
  if (error.code === 'ECONNABORTED') {
    setError('Request timed out. Please try again.')
  } else if (error.response) {
    setError(`Server error: ${error.response.status}`)
  } else {
    setError('Network error.')
  }
}
```

### ❌ Pitfall: Using too short a timeout for large operations

```js
// Uploading a large file
axios.post('/api/upload', largeFormData, { timeout: 3000 })
// Times out almost immediately on slow connections
```

**Fix:** Set timeout based on operation type. File uploads need longer timeouts (30s–2min).

---

## K — Coding Challenge + Solution

### Challenge

Write a `fetchWithTimeout` function that:
1. Accepts URL and optional timeout (default 8000ms)
2. Shows distinct messages for timeout, network error, and server error
3. Returns the data on success

```js
const data = await fetchWithTimeout('/api/users', 5000)
```

### Solution

```js
import axios from 'axios'

async function fetchWithTimeout(url, timeout = 8000) {
  try {
    const { data } = await axios.get(url, { timeout })
    return data
  } catch (error) {
    if (!axios.isAxiosError(error)) throw error

    if (error.code === 'ECONNABORTED') {
      throw new Error(`Request timed out after ${timeout}ms. Please try again.`)
    }

    if (error.request && !error.response) {
      throw new Error('Network error. Check your internet connection.')
    }

    if (error.response) {
      throw new Error(
        error.response.data?.error?.message ||
        `Server error: ${error.response.status}`
      )
    }

    throw new Error(error.message)
  }
}

// Usage
try {
  const users = await fetchWithTimeout('/api/users', 5000)
  console.log(users)
} catch (err) {
  console.error(err.message)
}
```

---

---
