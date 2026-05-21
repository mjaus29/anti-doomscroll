# 6 — Debugging Network Issues

---

## T — TL;DR

95% of API bugs are one of five things: wrong URL, wrong method, missing/wrong header, wrong body shape, or CORS. Know the tools and the checklist. Debugging network issues is a skill, not luck.

---

## K — Key Concepts

### The Debugging Checklist

```
When an API call fails, check in this order:

1. Did the request actually fire?
   → Network tab: is the request there?
   → If no: check your code path — maybe it's not called

2. What URL was called?
   → Network tab → request URL
   → Common: missing baseURL, wrong variable interpolation

3. What status code came back?
   → 401 → auth header missing/expired
   → 403 → wrong permissions
   → 404 → URL is wrong
   → 422 → request body failed validation
   → 500 → server error — check server logs
   → CORS preflight failed → check Network tab for OPTIONS request

4. What did the request look like?
   → Network tab → Headers tab → Request Headers
   → Is Authorization present and correct?
   → Is Content-Type correct?

5. What did the request body look like?
   → Network tab → Payload tab
   → Is the JSON shape correct? Missing required fields?

6. What did the response look like?
   → Network tab → Response tab
   → What error message did the server return?
```

### Browser DevTools — Network Tab Workflow

```
Open DevTools → Network tab → filter by "Fetch/XHR"

For each request:
  ├── Headers tab:
  │     Request URL      ← verify URL + query params
  │     Request Method   ← GET/POST/etc.
  │     Status Code      ← 200/401/500
  │     Request Headers  ← Authorization, Content-Type
  │     Response Headers ← Content-Type, X-Total-Count, etc.
  │
  ├── Payload tab:
  │     Form Data / Request Body  ← what was sent
  │
  └── Response tab:
        Response body    ← what came back (JSON error message)
```

### Axios Request Logging Interceptor (Dev Only)

```js
// Add to api.js — DEV only
if (import.meta.env.DEV) {
  api.interceptors.request.use((config) => {
    console.group(`📤 ${config.method?.toUpperCase()} ${config.baseURL}${config.url}`)
    console.log('Params:',  config.params)
    console.log('Headers:', config.headers)
    if (config.data) console.log('Body:', config.data)
    console.groupEnd()
    return config
  })

  api.interceptors.response.use(
    (res) => {
      const ms = Date.now() - (res.config.metadata?.startTime ?? 0)
      console.group(`✅ ${res.status} ${res.config.method?.toUpperCase()} ${res.config.url} (${ms}ms)`)
      console.log('Data:', res.data)
      console.groupEnd()
      return res
    },
    (err) => {
      const ms = Date.now() - (err.config?.metadata?.startTime ?? 0)
      console.group(`❌ ${err.response?.status ?? 'NET'} ${err.config?.method?.toUpperCase()} ${err.config?.url} (${ms}ms)`)
      console.log('Error:', err.response?.data ?? err.message)
      console.groupEnd()
      return Promise.reject(err)
    }
  )
}
```

### CORS — The Most Misunderstood Error

```
The CORS flow:

Browser            Frontend Server    API Server
   │                                      │
   │── OPTIONS /api/products ────────────▶│  (preflight)
   │◀── Allow-Origin: * ─────────────────│
   │── GET /api/products ───────────────▶│
   │◀── 200 OK ──────────────────────────│

CORS errors are ALWAYS a server-side configuration problem.
The frontend cannot fix CORS — only the backend can.

What to tell the backend:
  "Please add Access-Control-Allow-Origin: https://myapp.com
   and Access-Control-Allow-Headers: Authorization, Content-Type"

Frontend workaround (dev only): proxy in vite.config.js / next.config.js
```

```js
// vite.config.js — proxy for local dev (avoid CORS in dev)
export default {
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, '')
      }
    }
  }
}
```

### Common Errors and Their Causes

```
"Network Error" (no status code):
  → CORS preflight failed
  → Server is down / not reachable
  → SSL certificate error

401 Unauthorized:
  → Missing Authorization header
  → Expired access token
  → Wrong token (dev token used in prod)

403 Forbidden:
  → Correct token, wrong permissions
  → IP allowlist issue

404 Not Found:
  → Wrong URL (typo, wrong version, wrong ID)
  → Resource doesn't exist (expected — handle gracefully)

422 Unprocessable:
  → Request body missing required fields
  → Wrong field types
  → Business rule violation

500 Internal Server Error:
  → Bug on the server — check server logs, not frontend
```

### Quick Debug Utilities

```js
// Print the exact URL Axios would call (without firing)
function previewUrl(endpoint, params) {
  const qs = queryString.stringify(params, { skipNull: true })
  return `${api.defaults.baseURL}${endpoint}${qs ? '?' + qs : ''}`
}
console.log(previewUrl('/products', { brand: ['nike'], page: 2 }))

// Test a request manually from the browser console
window._testApi = async (method, url, data) => {
  try {
    const res = await api({ method, url, data })
    console.log('✅', res.status, res.data)
  } catch (err) {
    console.error('❌', err.response?.status, err.response?.data)
  }
}
// In console: _testApi('GET', '/products?page=1')
```

---

## W — Why It Matters

- Knowing the debugging checklist reduces "why is this not working" from hours to minutes — systematic elimination beats guessing every time.
- CORS errors look like network errors but have nothing to do with your frontend code — recognizing them immediately saves time.
- Dev-only request/response logging in interceptors gives you a full audit trail without opening DevTools for every call.
- The `previewUrl` utility catches URL-construction bugs (wrong baseURL, incorrect params) before a request even fires.

---

## I — Interview Q&A

### Q1: You see a "Network Error" in Axios with no status code. What are the possible causes?

**A:** Three main causes: CORS preflight failure (browser blocks the request before it completes), the server is unreachable (down, wrong URL, no network), or an SSL/TLS certificate error. Check the browser console for the full error message and the Network tab for a failed OPTIONS preflight request.

### Q2: A request returns 422. Where do you look for details?

**A:** The response body — `error.response.data`. The 422 body should contain field-level validation errors (per the contract). Access them via `error.response.data.error.details` (or whatever shape your API returns). Map these to form field error states.

### Q3: How do you fix a CORS error in development without waiting for the backend team?

**A:** Use a dev server proxy. In Vite, configure `server.proxy` in `vite.config.js` to forward `/api/*` requests to the backend server. The proxy runs on the same origin as the frontend, so no CORS check is triggered. This only works in development — production CORS must be configured on the backend.

---

## C — Common Pitfalls + Fix

### ❌ Pitfall: Logging the full Axios error object

```js
catch (err) {
  console.log(err)  // Huge nested object, circular references, hard to read
}
```

**Fix:** Log the structured parts:

```js
catch (err) {
  console.error({
    status:  err.response?.status,
    message: err.response?.data?.error?.message ?? err.message,
    url:     err.config?.url,
    data:    err.response?.data
  })
}
```

### ❌ Pitfall: Trying to fix CORS on the frontend

```js
// Adding headers to "fix" CORS — doesn't work
axios.get('/api/data', {
  headers: {
    'Access-Control-Allow-Origin': '*'  // ← frontend cannot set response headers!
  }
})
// CORS is a RESPONSE header set by the SERVER, not a request header you send
```

**Fix:** CORS is a server configuration issue. Ask the backend to add the correct headers.

### ❌ Pitfall: Not checking the Payload tab when debugging 422 errors

```js
// Body looks correct in code but 422 comes back
api.post('/orders', formData)
// Developer keeps looking at the frontend code
// Missing: formData has a null required field that was skipped by skipNull
```

**Fix:** Always check Network → Payload tab to see the ACTUAL body sent, not what you think was sent.

---

## K — Coding Challenge + Solution

### Challenge

Write a `createDebugInterceptors(apiInstance, options)` function that attaches dev-only request and response interceptors with:
1. Request: log method + URL + params + body
2. Response success: log status + URL + duration + response data (truncated to 200 chars)
3. Response error: log status + URL + duration + error message
4. `options.enabled` flag to turn logging on/off

### Solution

```js
export function createDebugInterceptors(instance, { enabled = true } = {}) {
  if (!enabled) return { ejectRequest: () => {}, ejectResponse: () => {} }

  const reqId = instance.interceptors.request.use((config) => {
    config.metadata = { startTime: Date.now() }
    const url    = (config.baseURL ?? '') + (config.url ?? '')
    const method = config.method?.toUpperCase()

    console.group(`📤 ${method} ${url}`)
    if (config.params && Object.keys(config.params).length)
      console.log('Params:', config.params)
    if (config.data)
      console.log('Body:', config.data)
    console.groupEnd()

    return config
  })

  const resId = instance.interceptors.response.use(
    (response) => {
      const ms      = Date.now() - (response.config.metadata?.startTime ?? 0)
      const method  = response.config.method?.toUpperCase()
      const url     = response.config.url ?? ''
      const preview = JSON.stringify(response.data).slice(0, 200)

      console.group(`✅ ${response.status} ${method} ${url} (${ms}ms)`)
      console.log('Data:', preview + (preview.length >= 200 ? '...' : ''))
      console.groupEnd()
      return response
    },
    (error) => {
      const ms     = Date.now() - (error.config?.metadata?.startTime ?? 0)
      const method = error.config?.method?.toUpperCase()
      const url    = error.config?.url ?? ''
      const msg    = error.response?.data?.error?.message ?? error.message

      console.group(`❌ ${error.response?.status ?? 'NET'} ${method} ${url} (${ms}ms)`)
      console.log('Error:', msg)
      if (error.response?.data) console.log('Body:', error.response.data)
      console.groupEnd()
      return Promise.reject(error)
    }
  )

  return {
    ejectRequest:  () => instance.interceptors.request.eject(reqId),
    ejectResponse: () => instance.interceptors.response.eject(resId)
  }
}

// Usage
createDebugInterceptors(api, { enabled: import.meta.env.DEV })
```

---

---
