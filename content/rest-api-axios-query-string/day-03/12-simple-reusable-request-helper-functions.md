# 12 — Simple Reusable Request Helper Functions

---

## T — TL;DR

A **reusable Axios instance** with a configured base URL, default headers, and interceptors is the foundation of every production API layer. Set it up once — use it everywhere.

---

## K — Key Concepts

### Step 1 — `axios.create()` — Your Own Instance

```js
// src/lib/api.js
import axios from 'axios'

const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || 'https://api.example.com',
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json'
  }
})

export default api
```

```js
// Usage anywhere in the app — no baseURL repetition
import api from '@/lib/api'

const { data } = await api.get('/users/1')
const { data } = await api.post('/posts', { title: 'Hi' })
```

### Step 2 — Request Interceptor — Inject Auth Token

```js
// src/lib/api.js
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('access_token')
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config  // MUST return config
  },
  (error) => Promise.reject(error)
)
```

Now EVERY request through this instance automatically gets the auth header — no manual header setting needed.

### Step 3 — Response Interceptor — Global Error Handling

```js
api.interceptors.response.use(
  (response) => response,  // pass successful responses through unchanged

  (error) => {
    // Handle 401 globally — redirect to login
    if (error.response?.status === 401) {
      localStorage.removeItem('access_token')
      window.location.href = '/login'
      return Promise.reject(error)
    }

    // Handle 403 globally
    if (error.response?.status === 403) {
      console.warn('Access denied:', error.config?.url)
    }

    // Handle 500+ globally
    if (error.response?.status >= 500) {
      console.error('Server error:', error.response.status, error.config?.url)
    }

    return Promise.reject(error)  // MUST reject to propagate to local catch
  }
)
```

### Step 4 — Resource-Specific Service Files

Build clean service modules on top of your `api` instance:

```js
// src/services/userService.js
import api from '@/lib/api'

const userService = {
  getAll: (params) =>
    api.get('/users', { params }).then(res => res.data),

  getById: (id) =>
    api.get(`/users/${id}`).then(res => res.data),

  create: (userData) =>
    api.post('/users', userData).then(res => res.data),

  update: (id, updates) =>
    api.patch(`/users/${id}`, updates).then(res => res.data),

  remove: (id) =>
    api.delete(`/users/${id}`).then(res => res.data)
}

export default userService
```

```js
// Usage in a component
import userService from '@/services/userService'

const users = await userService.getAll({ role: 'admin' })
const user  = await userService.getById(42)
const newUser = await userService.create({ name: 'Mark' })
```

### Step 5 — Complete API Layer Setup

```js
// src/lib/api.js — the final, complete version

import axios from 'axios'

// ─── Create instance ─────────────────────────────────
const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'https://api.example.com',
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json'
  }
})

// ─── Request interceptor — inject auth token ─────────
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('access_token')
    if (token) config.headers.Authorization = `Bearer ${token}`
    return config
  },
  (error) => Promise.reject(error)
)

// ─── Response interceptor — global error handling ────
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('access_token')
      window.location.href = '/login'
    }
    return Promise.reject(error)
  }
)

// ─── Helper to extract data + handle errors ──────────
export async function request(method, url, data = null, config = {}) {
  try {
    const res = await api({ method, url, data, ...config })
    return { data: res.data, error: null }
  } catch (err) {
    const message = axios.isAxiosError(err)
      ? err.response?.data?.error?.message
        || (err.code === 'ECONNABORTED' ? 'Request timed out' : null)
        || (!err.response ? 'Network error' : null)
        || `Error ${err.response?.status}`
      : err.message

    return { data: null, error: message }
  }
}

export default api
```

### Usage Pattern in a Component

```jsx
import { request } from '@/lib/api'

function UserProfile({ userId }) {
  const [user, setUser]       = useState(null)
  const [error, setError]     = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      const { data, error } = await request('GET', `/users/${userId}`)
      if (error) setError(error)
      else setUser(data)
      setLoading(false)
    }
    load()
  }, [userId])

  if (loading) return <Spinner />
  if (error)   return <ErrorMessage message={error} />
  return <div>{user.name}</div>
}
```

---

## W — Why It Matters

- This pattern is the industry-standard API layer in React/Vue/Next.js applications — you'll see or write it at every job.
- Centralizing auth header injection in a request interceptor means you change it in ONE place — no hunting through 50 files.
- The global 401 interceptor handles token expiry across the entire app automatically.
- Service files (`userService`, `postService`) make components thin, focused, and testable — the service handles the HOW, the component handles the WHAT.

---

## I — Interview Q&A

### Q1: What is `axios.create()` and why would you use it?

**A:** `axios.create()` creates a new Axios instance with a custom default config — base URL, headers, timeout. Using an instance means you set shared config once and all requests through it inherit those defaults. It also allows multiple instances for different APIs (e.g., your own API and a third-party API) without config collision.

### Q2: What are Axios interceptors?

**A:** Interceptors are middleware functions that run before every request is sent or after every response is received. Request interceptors are used to inject auth tokens. Response interceptors are used for global error handling (like redirecting on 401) and response transformation. They're registered with `api.interceptors.request.use()` and `api.interceptors.response.use()`.

### Q3: Why return `{ data, error }` instead of throwing from request helpers?

**A:** Throwing forces every caller to wrap in `try/catch`. Returning `{ data, error }` makes the happy and error paths explicit in the call site — the component can check `if (error)` cleanly without exception handling syntax. It also prevents unhandled promise rejections. The Go-inspired pattern is common in modern React codebases.

---

## C — Common Pitfalls + Fix

### ❌ Pitfall: Forgetting to `return config` in a request interceptor

```js
api.interceptors.request.use((config) => {
  config.headers.Authorization = `Bearer ${token}`
  // ← forgot return config!
})
// Every request hangs forever — interceptor returns undefined
```

**Fix:**

```js
api.interceptors.request.use((config) => {
  config.headers.Authorization = `Bearer ${token}`
  return config  // ✅ MUST return
})
```

### ❌ Pitfall: Forgetting to `return Promise.reject(error)` in response interceptor

```js
api.interceptors.response.use(
  (res) => res,
  (error) => {
    console.error(error)
    // ← no return! Interceptor returns undefined (resolves as success)
    // Your catch blocks never fire
  }
)
```

**Fix:**

```js
api.interceptors.response.use(
  (res) => res,
  (error) => {
    console.error(error)
    return Promise.reject(error)  // ✅ propagate the error
  }
)
```

### ❌ Pitfall: Creating the Axios instance inside a component or function

```js
function MyComponent() {
  const api = axios.create({ baseURL: '...' })  // ← recreated every render!
  // New instance = new interceptors = memory leak
}
```

**Fix:** Create the instance once in a module-level file (`src/lib/api.js`) and import it.

---

## K — Coding Challenge + Solution

### Challenge

Build a complete mini API layer for a blog app:

```
1. Create an axios instance with base URL + timeout
2. Add a request interceptor that injects a Bearer token from localStorage
3. Add a response interceptor that redirects to /login on 401
4. Create a postService with: getAll, getById, create, update, remove
5. Create a reusable request() helper that returns { data, error }
```

### Solution

```js
// src/lib/api.js
import axios from 'axios'

const api = axios.create({
  baseURL: 'https://jsonplaceholder.typicode.com',
  timeout: 10000,
  headers: { 'Content-Type': 'application/json' }
})

// ─── Request interceptor
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('access_token')
    if (token) config.headers.Authorization = `Bearer ${token}`
    return config
  },
  (error) => Promise.reject(error)
)

// ─── Response interceptor
api.interceptors.response.use(
  (res) => res,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('access_token')
      window.location.href = '/login'
    }
    return Promise.reject(error)
  }
)

// ─── Generic request helper
export async function request(method, url, data = null, params = null) {
  try {
    const res = await api({ method, url, data, params })
    return { data: res.data, error: null }
  } catch (err) {
    let message = 'An unexpected error occurred'

    if (axios.isAxiosError(err)) {
      if (err.code === 'ECONNABORTED')    message = 'Request timed out'
      else if (!err.response)             message = 'Network error'
      else message = err.response.data?.error?.message || `Error ${err.response.status}`
    }

    return { data: null, error: message }
  }
}

export default api
```

```js
// src/services/postService.js
import { request } from '@/lib/api'

const postService = {
  getAll:   (params)       => request('GET',    '/posts',       null, params),
  getById:  (id)           => request('GET',    `/posts/${id}`),
  create:   (postData)     => request('POST',   '/posts',       postData),
  update:   (id, updates)  => request('PATCH',  `/posts/${id}`, updates),
  remove:   (id)           => request('DELETE', `/posts/${id}`)
}

export default postService
```

```js
// Usage in a component
import postService from '@/services/postService'

const { data: posts, error } = await postService.getAll({ userId: 1 })
if (error) {
  console.error(error)  // "Network error" | "Error 404" | "Request timed out"
} else {
  console.log(posts)    // [{ id: 1, title: "..." }, ...]
}

const { data: newPost } = await postService.create({ title: 'Hello', body: 'World', userId: 1 })
console.log(newPost.id)  // 101
```

---

---

## ✅ Day 3 Complete — Axios Request Basics

| # | Subtopic | Status |
|---|----------|--------|
| 1 | What Is Axios & Installation | ☐ |
| 2 | First GET Request | ☐ |
| 3 | POST, PUT, PATCH & DELETE Requests | ☐ |
| 4 | Async/Await with Axios | ☐ |
| 5 | Request Config Object | ☐ |
| 6 | Params (Query Parameters) | ☐ |
| 7 | Headers | ☐ |
| 8 | Request Body & JSON Handling | ☐ |
| 9 | Response Schema | ☐ |
| 10 | Try/Catch Error Handling | ☐ |
| 11 | Timeout Basics | ☐ |
| 12 | Simple Reusable Request Helper Functions | ☐ |

---

> **Pick subtopic 1. Read just the TL;DR. That's it.**
>
> *Doing one small thing beats opening a feed.*
