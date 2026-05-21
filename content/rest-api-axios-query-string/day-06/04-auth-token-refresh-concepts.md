# 4 — Auth & Token-Refresh Concepts

---

## T — TL;DR

In production, access tokens expire. The frontend must **silently refresh** them without logging out the user. The full pattern: short-lived access token + long-lived refresh token + a queue to handle simultaneous 401s without multiple refresh calls.

---

## K — Key Concepts

### The Token Lifecycle

```
1. User logs in
   POST /auth/login { email, password }
   ← { accessToken: "eyJ..." (15min TTL), refreshToken: "abc..." (7 day TTL) }

2. Every API request
   Authorization: Bearer eyJ...

3. Access token expires (after 15 min)
   API returns 401

4. Frontend detects 401
   POST /auth/refresh { refreshToken: "abc..." }
   ← { accessToken: "eyJ...NEW", refreshToken?: "abc...NEW" }
   (Some servers rotate refresh tokens too)

5. Retry original request with new access token

6. Refresh token expires (after 7 days)
   /auth/refresh returns 401
   → Force logout → redirect to /login
```

### The Token Storage Decision

```js
// Option A: localStorage — easiest, XSS vulnerable
localStorage.setItem('access_token', token)
localStorage.setItem('refresh_token', refreshToken)

// Option B: in-memory (most secure for access token)
let inMemoryToken = null
// Cons: lost on page refresh → pair with refresh token in HttpOnly cookie

// Option C: HttpOnly cookies (most secure overall)
// Set by server: Set-Cookie: refresh_token=...; HttpOnly; Secure; SameSite=Strict
// JS cannot read or steal it
// Access token still in memory or localStorage

// Practical recommendation for SPAs:
// - Access token: in-memory variable (lost on refresh, fast re-auth from refresh token)
// - Refresh token: HttpOnly cookie (server sets/reads, never in JS)
```

### The Silent Refresh Interceptor

```js
// src/lib/tokenRefresh.js
import axios from 'axios'

let isRefreshing    = false
let failedQueue     = []         // requests waiting for refresh to complete

function processQueue(error, newToken = null) {
  failedQueue.forEach(({ resolve, reject }) => {
    error ? reject(error) : resolve(newToken)
  })
  failedQueue = []
}

export function attachRefreshInterceptor(apiInstance) {
  apiInstance.interceptors.response.use(
    (response) => response,

    async (error) => {
      const originalRequest = error.config

      // Only handle 401 — not for refresh endpoint itself
      const is401       = error.response?.status === 401
      const isRetry     = originalRequest._retry === true
      const isRefreshUrl = originalRequest.url?.includes('/auth/refresh')

      if (!is401 || isRetry || isRefreshUrl) {
        return Promise.reject(error)
      }

      // ─── Another refresh is in progress → queue this request
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject })
        }).then((newToken) => {
          originalRequest.headers.Authorization = `Bearer ${newToken}`
          return apiInstance(originalRequest)
        }).catch(err => Promise.reject(err))
      }

      // ─── Start refresh
      originalRequest._retry = true
      isRefreshing           = true

      try {
        const refreshToken = localStorage.getItem('refresh_token')
        if (!refreshToken) throw new Error('No refresh token')

        // Use plain axios (not apiInstance) to avoid interceptor loop
        const { data } = await axios.post('/auth/refresh', { refreshToken })
        const { accessToken, refreshToken: newRefresh } = data

        // Store new tokens
        localStorage.setItem('access_token', accessToken)
        if (newRefresh) localStorage.setItem('refresh_token', newRefresh)

        // Update default header for future requests
        apiInstance.defaults.headers.common['Authorization'] = `Bearer ${accessToken}`

        // Process all queued requests with new token
        processQueue(null, accessToken)

        // Retry original request
        originalRequest.headers.Authorization = `Bearer ${accessToken}`
        return apiInstance(originalRequest)

      } catch (refreshError) {
        // Refresh failed — force logout
        processQueue(refreshError)
        localStorage.removeItem('access_token')
        localStorage.removeItem('refresh_token')
        window.location.href = `/login?redirect=${encodeURIComponent(window.location.pathname)}`
        return Promise.reject(refreshError)

      } finally {
        isRefreshing = false
      }
    }
  )
}
```

### Token Expiry — Proactive vs Reactive Refresh

```js
// ─── Reactive (what we built above): wait for 401 → refresh
// Simple but causes a failed request + retry latency

// ─── Proactive: check expiry before each request, refresh if close
function getTokenExpiry(token) {
  try {
    const payload = JSON.parse(atob(token.split('.')[1]))
    return payload.exp * 1000  // convert to milliseconds
  } catch {
    return 0
  }
}

// Request interceptor — proactive refresh
api.interceptors.request.use(async (config) => {
  const token  = localStorage.getItem('access_token')
  const expiry = getTokenExpiry(token)
  const now    = Date.now()
  const BUFFER = 60_000  // refresh 1 minute before expiry

  if (token && expiry - now < BUFFER) {
    // Proactively refresh before the request
    const { data } = await axios.post('/auth/refresh', {
      refreshToken: localStorage.getItem('refresh_token')
    })
    localStorage.setItem('access_token', data.accessToken)
    config.headers.Authorization = `Bearer ${data.accessToken}`
  } else if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }

  return config
})
```

---

## W — Why It Matters

- A 15-minute access token without silent refresh means users are logged out every 15 minutes — unacceptable UX.
- The `failedQueue` pattern prevents a cascade of multiple refresh calls when several requests 401 simultaneously (e.g., a dashboard loading 5 parallel requests).
- The `_retry` flag on the original request object is the guard that prevents infinite retry loops — a 401 on the retry attempt should not retry again.
- Proactive vs reactive refresh is a real architectural decision — proactive avoids the failed-request-then-retry latency at the cost of slightly more complexity.

---

## I — Interview Q&A

### Q1: How do you handle token refresh when multiple concurrent requests return 401?

**A:** Use a queue. The first 401 starts the refresh and sets `isRefreshing = true`. All subsequent 401s are pushed into `failedQueue` as promise callbacks. When the refresh completes, `processQueue` resolves all queued promises with the new token, and each queued request retries with it.

### Q2: Why should you use plain `axios.post()` instead of your configured instance for the refresh call?

**A:** The configured instance has a response interceptor that handles 401 by refreshing. If the refresh endpoint itself returns a 401, using the configured instance would trigger another refresh — creating an infinite loop. Plain `axios.post` bypasses all custom interceptors.

### Q3: What's the difference between proactive and reactive token refresh?

**A:** Reactive waits for a 401 response, then refreshes and retries — adds one round-trip latency per expiry event. Proactive reads the JWT `exp` claim before each request and refreshes if the token expires within a buffer window — no failed requests but slightly more complex. Proactive is better UX for high-frequency API calls; reactive is simpler to implement.

---

## C — Common Pitfalls + Fix

### ❌ Pitfall: Not using `_retry` flag — infinite 401 loop

```js
apiInstance.interceptors.response.use(null, async (error) => {
  if (error.response?.status === 401) {
    await refreshToken()
    return apiInstance(error.config)  // retry
    // If retry also gets 401 → interceptor fires again → infinite loop
  }
})
```

**Fix:**

```js
if (error.response?.status === 401 && !error.config._retry) {
  error.config._retry = true  // ← mark as already retried
  // ... refresh and retry
}
```

### ❌ Pitfall: Sending refresh token as a query param

```
GET /auth/refresh?refresh_token=abc123
← Token visible in server logs, browser history, proxy logs
```

**Fix:** Always send tokens in the request body (POST) or as an HttpOnly cookie. Never in URLs.

### ❌ Pitfall: Not preserving the redirect URL on forced logout

```js
window.location.href = '/login'  // User loses their current page context
```

**Fix:**

```js
const redirect = encodeURIComponent(window.location.pathname + window.location.search)
window.location.href = `/login?redirect=${redirect}`
// After login: router.push(searchParams.get('redirect') ?? '/dashboard')
```

---

## K — Coding Challenge + Solution

### Challenge

Write a self-contained `createApiWithRefresh(baseURL)` factory that:
1. Creates an Axios instance
2. Attaches a request interceptor that injects the Bearer token from `localStorage`
3. Attaches a response interceptor with the full queue-based token refresh
4. Returns the configured instance

### Solution

```js
import axios from 'axios'

export function createApiWithRefresh(baseURL) {
  const instance = axios.create({ baseURL, timeout: 10000 })

  let isRefreshing = false
  let queue        = []

  function processQueue(err, token = null) {
    queue.forEach(({ resolve, reject }) => err ? reject(err) : resolve(token))
    queue = []
  }

  // ─── Request interceptor: inject token
  instance.interceptors.request.use((config) => {
    const token = localStorage.getItem('access_token')
    if (token) config.headers.Authorization = `Bearer ${token}`
    return config
  }, Promise.reject)

  // ─── Response interceptor: handle 401 + refresh
  instance.interceptors.response.use(
    (res) => res,
    async (error) => {
      const orig = error.config
      const is401         = error.response?.status === 401
      const alreadyRetried = orig._retry === true
      const isRefreshUrl   = orig.url?.includes('/auth/refresh')

      if (!is401 || alreadyRetried || isRefreshUrl) {
        return Promise.reject(error)
      }

      if (isRefreshing) {
        return new Promise((resolve, reject) => queue.push({ resolve, reject }))
          .then(token => {
            orig.headers.Authorization = `Bearer ${token}`
            return instance(orig)
          })
      }

      orig._retry   = true
      isRefreshing  = true

      try {
        const rt = localStorage.getItem('refresh_token')
        if (!rt) throw new Error('No refresh token available')

        const { data } = await axios.post(`${baseURL}/auth/refresh`, { refreshToken: rt })
        const { accessToken, refreshToken: newRt } = data

        localStorage.setItem('access_token', accessToken)
        if (newRt) localStorage.setItem('refresh_token', newRt)
        instance.defaults.headers.common['Authorization'] = `Bearer ${accessToken}`

        processQueue(null, accessToken)
        orig.headers.Authorization = `Bearer ${accessToken}`
        return instance(orig)
      } catch (err) {
        processQueue(err)
        localStorage.clear()
        window.location.href = '/login'
        return Promise.reject(err)
      } finally {
        isRefreshing = false
      }
    }
  )

  return instance
}

// Usage
const api = createApiWithRefresh(import.meta.env.VITE_API_URL)
export default api
```

---

---
