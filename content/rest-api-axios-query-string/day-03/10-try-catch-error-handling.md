# 10 — Try/Catch Error Handling

---

## T — TL;DR

Axios **throws on 4xx and 5xx** — unlike `fetch`. Every Axios request needs a `try/catch`. The error object has three distinct states: **response error**, **request error**, and **setup error** — and you must handle all three.

---

## K — Key Concepts

### Why Axios Error Handling Is Different from Fetch

```js
// fetch — does NOT throw on 4xx/5xx
const res = await fetch('/api/users/999')
// res.ok = false, res.status = 404
// No exception thrown — you must check manually

// axios — DOES throw on 4xx/5xx
try {
  await axios.get('/api/users/999')
} catch (error) {
  // error is thrown for 404, 500, etc.
  console.log(error.response.status)  // 404
}
```

### The Three Error States

Axios errors fall into exactly three categories:

```js
try {
  await axios.get('/api/users')
} catch (error) {

  if (error.response) {
    // ─── STATE 1: Server responded with a non-2xx status ───
    // Request was made, server responded with 4xx or 5xx
    console.log(error.response.status)   // 404, 500, etc.
    console.log(error.response.data)     // error body from server
    console.log(error.response.headers)  // response headers

  } else if (error.request) {
    // ─── STATE 2: No response received ───
    // Request was made but no response: network down, timeout, CORS
    console.log(error.request)  // the request that was made
    console.log('No response received — network issue or timeout')

  } else {
    // ─── STATE 3: Request setup error ───
    // Error occurred before the request was sent
    // Wrong config, malformed URL, etc.
    console.log('Request setup error:', error.message)
  }

}
```

### Checking the Status Code in Catch

```js
try {
  await axios.get('/api/users/999')
} catch (error) {
  if (!error.response) {
    throw new Error('Network error — check your connection')
  }

  switch (error.response.status) {
    case 400:
      console.error('Bad request:', error.response.data)
      break
    case 401:
      redirectToLogin()
      break
    case 403:
      showForbiddenMessage()
      break
    case 404:
      show404Page()
      break
    case 422:
      setFormErrors(error.response.data.error.details)
      break
    case 429:
      showRateLimitMessage()
      break
    case 500:
    default:
      showGenericError()
  }
}
```

### Extracting the Error Message

```js
function getErrorMessage(error) {
  // Priority: server message → status code message → network error → fallback
  if (error.response) {
    return (
      error.response.data?.error?.message ||
      error.response.data?.message ||
      `Request failed with status ${error.response.status}`
    )
  }
  if (error.request) {
    return 'No response received. Check your connection.'
  }
  return error.message || 'An unexpected error occurred.'
}
```

### Using `axios.isAxiosError()`

```js
try {
  await axios.get('/api/users')
} catch (error) {
  if (axios.isAxiosError(error)) {
    // TypeScript-safe: error is typed as AxiosError
    console.log(error.response?.status)
    console.log(error.config?.url)
  } else {
    // Non-Axios error (programming error, etc.)
    console.error('Unexpected error:', error)
  }
}
```

### A Complete, Production-Ready Error Handler

```js
async function safeFetch(requestFn) {
  try {
    const { data } = await requestFn()
    return { data, error: null }
  } catch (err) {
    const error = {
      message: 'An unexpected error occurred',
      code: 'UNKNOWN_ERROR',
      status: null,
      details: []
    }

    if (axios.isAxiosError(err)) {
      if (err.response) {
        error.status  = err.response.status
        error.message = err.response.data?.error?.message || `HTTP ${err.response.status}`
        error.code    = err.response.data?.error?.code    || 'HTTP_ERROR'
        error.details = err.response.data?.error?.details || []
      } else if (err.request) {
        error.message = 'Network error. Please check your connection.'
        error.code    = 'NETWORK_ERROR'
      } else {
        error.message = err.message
        error.code    = 'REQUEST_SETUP_ERROR'
      }
    }

    return { data: null, error }
  }
}

// Usage — no try/catch in component
const { data: user, error } = await safeFetch(() => axios.get('/api/users/1'))
if (error) {
  setErrorMessage(error.message)
} else {
  setUser(user)
}
```

---

## W — Why It Matters

- The three-state error model is the most important Axios concept for writing robust code — ignoring any state causes unhandled errors in production.
- Axios throwing on 4xx/5xx is what makes error handling more natural than `fetch` — but only if you know the error structure.
- `axios.isAxiosError()` is the correct TypeScript-safe type guard — always use it before accessing `.response`.
- The `safeFetch` pattern (returning `{ data, error }` instead of throwing) is a common pattern in production codebases to avoid unhandled promise rejections.

---

## I — Interview Q&A

### Q1: What are the three error states in Axios?

**A:** 1) `error.response` — server responded with a 4xx/5xx status. 2) `error.request` — request was made but no response received (network failure, timeout, CORS). 3) Neither — request was never sent due to a configuration or setup error.

### Q2: How is Axios error handling different from `fetch`?

**A:** `fetch` only rejects on network failure — HTTP errors (4xx, 5xx) resolve normally and you must check `response.ok` manually. Axios automatically throws for any non-2xx response, making `try/catch` the natural pattern.

### Q3: How do you check if an error is an Axios error vs another type of error?

**A:** Use `axios.isAxiosError(error)`. It's a type guard that returns `true` if the error came from Axios. This is important in TypeScript for safe access to `.response`, `.request`, and `.config`.

---

## C — Common Pitfalls + Fix

### ❌ Pitfall: Accessing `error.response.status` without checking `error.response` first

```js
catch (error) {
  console.log(error.response.status)
  // TypeError: Cannot read properties of undefined (reading 'status')
  // ← error.response is undefined for network errors
}
```

**Fix:**

```js
catch (error) {
  if (error.response) {
    console.log(error.response.status)  // ✅ safe
  }
}
```

### ❌ Pitfall: Swallowing errors in catch without re-throwing

```js
catch (error) {
  console.log(error)
  // Silently swallowed — caller has no idea the request failed
  // Loading state never clears, UI hangs
}
```

**Fix:** Either re-throw, update UI state, or return a meaningful error:

```js
catch (error) {
  setError(getErrorMessage(error))  // ← update UI state
  // OR
  throw error  // ← let the caller handle it
}
```

### ❌ Pitfall: Forgetting `finally` for loading states

```js
setLoading(true)
try {
  const { data } = await axios.get('/api/users')
  setUsers(data)
} catch (err) {
  setError(err.message)
}
// ← No finally: setLoading(false) never called if request fails!
```

**Fix:**

```js
try {
  setLoading(true)
  const { data } = await axios.get('/api/users')
  setUsers(data)
} catch (err) {
  setError(err.message)
} finally {
  setLoading(false)  // ✅ always runs
}
```

---

## K — Coding Challenge + Solution

### Challenge

Write a `useApiCall` hook that:
1. Manages `data`, `loading`, and `error` state
2. Uses the three-state Axios error model
3. Returns `{ data, loading, error, execute }`

```js
const { data, loading, error, execute } = useApiCall()

// In a button click:
execute(() => axios.get('/api/users/1'))
```

### Solution

```js
import { useState } from 'react'
import axios from 'axios'

function useApiCall() {
  const [data, setData]       = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState(null)

  async function execute(requestFn) {
    setLoading(true)
    setError(null)

    try {
      const { data: result } = await requestFn()
      setData(result)
      return result
    } catch (err) {
      let message = 'An unexpected error occurred'

      if (axios.isAxiosError(err)) {
        if (err.response) {
          message = err.response.data?.error?.message || `Error ${err.response.status}`
        } else if (err.request) {
          message = 'Network error. Check your connection.'
        } else {
          message = err.message
        }
      }

      setError(message)
      return null
    } finally {
      setLoading(false)
    }
  }

  return { data, loading, error, execute }
}

export default useApiCall
```

---

---
