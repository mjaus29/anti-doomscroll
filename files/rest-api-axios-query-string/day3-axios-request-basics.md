
# 📅 Day 3 — Axios Request Basics for Frontend Developers

> **Goal:** Master Axios — the most widely used HTTP client in frontend development. By the end of Day 3 you'll write clean, production-ready API calls confidently.
> **Format:** Each subtopic = 5–15 min. Do one. Stop. Come back.

---

## 📋 Day 3 Subtopic Overview

| # | Subtopic | Time |
|---|----------|------|
| 1 | What Is Axios & Installation | 8 min |
| 2 | First GET Request | 10 min |
| 3 | POST, PUT, PATCH & DELETE Requests | 15 min |
| 4 | Async/Await with Axios | 10 min |
| 5 | Request Config Object | 10 min |
| 6 | Params (Query Parameters) | 10 min |
| 7 | Headers | 10 min |
| 8 | Request Body & JSON Handling | 10 min |
| 9 | Response Schema | 10 min |
| 10 | Try/Catch Error Handling | 15 min |
| 11 | Timeout Basics | 8 min |
| 12 | Simple Reusable Request Helper Functions | 15 min |

---

---

# 1 — What Is Axios & Installation

---

## T — TL;DR

Axios is a **promise-based HTTP client** for the browser and Node.js. It wraps `fetch` with a cleaner API, automatic JSON handling, better error detection, and built-in features like interceptors and timeouts.

---

## K — Key Concepts

### What Is Axios?

Axios is the most widely used HTTP library in JavaScript projects. It works in both the **browser** and **Node.js**, which is why it's the default choice across React, Vue, Next.js, and backend Node services.

```
fetch (built-in)    → manual JSON stringify/parse, manual error checking, verbose
axios (library)     → automatic JSON, cleaner API, better error handling, more features
```

### Axios vs Fetch — Key Differences

| Feature | Fetch | Axios |
|---|---|---|
| Built-in | ✅ | ❌ (npm install) |
| Auto JSON parse | ❌ (need `.json()`) | ✅ |
| Auto JSON stringify | ❌ (need `JSON.stringify`) | ✅ |
| Throws on 4xx/5xx | ❌ | ✅ |
| Request timeout | ❌ (manual AbortController) | ✅ (`timeout` option) |
| Request/Response interceptors | ❌ | ✅ |
| Upload progress | ❌ | ✅ |
| Request cancellation | Manual | Built-in |
| Node.js support | Node 18+ only | ✅ All versions |

### Installation

#### npm / yarn / pnpm

```bash
# npm
npm install axios

# yarn
yarn add axios

# pnpm
pnpm add axios
```

#### CDN (for quick testing or plain HTML projects)

```html
<script src="https://cdn.jsdelivr.net/npm/axios/dist/axios.min.js"></script>
```

#### Verify Installation

```bash
# Check installed version
npm list axios
# or
cat node_modules/axios/package.json | grep '"version"'
```

### Import in Your Project

```js
// ES Modules (React, Vue, modern JS)
import axios from 'axios'

// CommonJS (Node.js)
const axios = require('axios')
```

### Current Version Note

As of 2025, Axios v1.x is stable. Check `package.json` after install:

```json
{
  "dependencies": {
    "axios": "^1.7.0"
  }
}
```

---

## W — Why It Matters

- Axios is in the majority of professional React codebases — you'll use it or maintain it in almost every job.
- The automatic JSON handling and error throwing eliminates the two most common `fetch` bugs (forgetting `.json()` and forgetting to check `response.ok`).
- Understanding WHY you choose Axios over `fetch` is a question in frontend interviews.
- It works identically in Next.js API routes (server) and React components (client), which reduces cognitive switching.

---

## I — Interview Q&A

### Q1: Why would you choose Axios over the native Fetch API?

**A:** Axios automatically parses JSON responses and stringifies request bodies. It throws errors on 4xx/5xx responses (unlike `fetch` which only rejects on network failure). It also has built-in timeout support, request/response interceptors, and consistent behavior across all Node.js versions. For anything beyond simple one-off requests, Axios reduces boilerplate significantly.

### Q2: Does Axios work in Node.js?

**A:** Yes. Axios works in both the browser and Node.js. In the browser it uses `XMLHttpRequest`, in Node it uses the `http`/`https` modules. This makes it the same API surface on both client and server.

### Q3: Is Axios still relevant with modern Fetch?

**A:** Yes. Modern `fetch` in Node 18+ has closed the gap, but Axios still wins on: automatic JSON handling, throwing on HTTP errors, interceptors, upload progress, and request cancellation ergonomics. For small projects, `fetch` is fine. For production apps with auth, error handling, and retry logic, Axios is cleaner.

---

## C — Common Pitfalls + Fix

### ❌ Pitfall: Installing and then not importing

```js
// Installed axios but forgot to import
const res = await axios.get('/api/users')
// ReferenceError: axios is not defined
```

**Fix:**

```js
import axios from 'axios'  // at the top of every file that uses it
```

### ❌ Pitfall: Using an outdated v0.x version

```json
"axios": "^0.27.2"   ← old API, missing features
```

**Fix:** Upgrade to v1.x:

```bash
npm install axios@latest
```

### ❌ Pitfall: Mixing `require` and `import` in the same project

```js
const axios = require('axios')  // CommonJS
import axios from 'axios'       // ESM
// Cannot mix — causes SyntaxError
```

**Fix:** Use one module system consistently. Modern React/Vite/Next.js projects use ESM (`import`).

---

## K — Coding Challenge + Solution

### Challenge

Set up a new project with Axios and verify it's working:

```
1. Create a new directory and initialize a package.json
2. Install Axios
3. Create index.js that imports Axios
4. Make it log the Axios version to the console
```

### Solution

```bash
mkdir axios-practice && cd axios-practice
npm init -y
npm install axios
```

```js
// index.js
import axios from 'axios'
console.log('Axios version:', axios.VERSION)
// Output: Axios version: 1.x.x
```

```json
// package.json — add "type": "module" for ESM
{
  "type": "module",
  "dependencies": {
    "axios": "^1.7.0"
  }
}
```

---

---

# 2 — First GET Request

---

## T — TL;DR

`axios.get(url)` returns a **promise** that resolves with a response object. The actual data you want is always in **`response.data`** — Axios puts it there after auto-parsing the JSON.

---

## K — Key Concepts

### The Simplest GET Request

```js
import axios from 'axios'

// Returns a promise
axios.get('https://jsonplaceholder.typicode.com/users/1')
  .then(response => {
    console.log(response.data)
    // { id: 1, name: "Leanne Graham", email: "..." }
  })
  .catch(error => {
    console.error(error)
  })
```

### What `response.data` Contains

Unlike `fetch`, Axios **automatically parses JSON** for you. No `.json()` needed.

```js
// fetch — two steps required
const res = await fetch('/api/users/1')
const user = await res.json()   // ← manual parse step

// axios — one step
const res = await axios.get('/api/users/1')
const user = res.data           // ← already parsed
```

### Getting a Collection

```js
const response = await axios.get('https://jsonplaceholder.typicode.com/users')
console.log(response.data)
// [{ id: 1, name: "..." }, { id: 2, name: "..." }, ...]

console.log(response.data.length) // 10
```

### Destructuring `data` Immediately

A common pattern — destructure `data` from the response in one step:

```js
const { data } = await axios.get('/api/users/1')
console.log(data.name) // "Mark"

// Or rename it to something meaningful
const { data: user } = await axios.get('/api/users/1')
console.log(user.name) // "Mark"

// Collection
const { data: users } = await axios.get('/api/users')
console.log(users.length)
```

### GET with a Dynamic URL

```js
const userId = 42
const { data: user } = await axios.get(`/api/users/${userId}`)

// Or with a base URL set separately (covered more in topic 5)
const BASE_URL = 'https://api.example.com'
const { data } = await axios.get(`${BASE_URL}/users/${userId}`)
```

### Using a Free Public API to Practice

```js
// JSONPlaceholder — free fake REST API, perfect for practice
// https://jsonplaceholder.typicode.com

const { data: post } = await axios.get(
  'https://jsonplaceholder.typicode.com/posts/1'
)
console.log(post)
// { userId: 1, id: 1, title: "...", body: "..." }

const { data: posts } = await axios.get(
  'https://jsonplaceholder.typicode.com/posts'
)
console.log(posts.length) // 100
```

---

## W — Why It Matters

- `axios.get()` is the most frequently called function in any data-fetching layer.
- Knowing that data lives in `response.data` (not `response` directly) prevents the most common Axios beginner mistake.
- Destructuring `data` immediately is a pattern you'll see in every professional React codebase.
- Understanding the promise return value is the foundation for everything else — interceptors, error handling, and retry logic all build on this.

---

## I — Interview Q&A

### Q1: Where is the response data in an Axios response?

**A:** In `response.data`. Axios wraps the response in an object with `data`, `status`, `headers`, `config`, and `request`. The actual API response body is always in `.data`.

### Q2: Why don't you need to call `.json()` with Axios?

**A:** Axios automatically detects `Content-Type: application/json` in the response header and parses the body for you. It also automatically sets `Content-Type: application/json` on requests when you pass an object as the body.

### Q3: What does `axios.get()` return?

**A:** A Promise that resolves to an Axios response object with properties: `data` (parsed body), `status` (HTTP code), `statusText`, `headers`, `config`, and `request`.

---

## C — Common Pitfalls + Fix

### ❌ Pitfall: Accessing the response directly instead of `.data`

```js
const response = await axios.get('/api/users/1')
console.log(response.name)  // ❌ undefined — response is the wrapper object
```

**Fix:**

```js
const response = await axios.get('/api/users/1')
console.log(response.data.name)  // ✅

// Or destructure
const { data } = await axios.get('/api/users/1')
console.log(data.name)  // ✅
```

### ❌ Pitfall: Forgetting `await`

```js
const response = axios.get('/api/users')  // ← Promise, not data
console.log(response.data)  // undefined — it's a Promise object
```

**Fix:**

```js
const response = await axios.get('/api/users')  // ✅
```

### ❌ Pitfall: Hardcoding full URLs everywhere

```js
// File A
axios.get('https://api.example.com/v1/users')

// File B
axios.get('https://api.example.com/v1/posts')

// File C
axios.get('https://api.example.com/v1/orders')
// If the base URL changes → update every file
```

**Fix:** Set a base URL once (covered in Topic 5 and 12). Reference relative paths everywhere else.

---

## K — Coding Challenge + Solution

### Challenge

Using JSONPlaceholder, write a function `getUserPosts(userId)` that:
1. Fetches the user at `/users/:id`
2. Logs the user's name
3. Returns the full user object

```js
getUserPosts(1)
// Logs: "User: Leanne Graham"
// Returns: { id: 1, name: "Leanne Graham", ... }
```

### Solution

```js
import axios from 'axios'

const BASE = 'https://jsonplaceholder.typicode.com'

async function getUserPosts(userId) {
  const { data: user } = await axios.get(`${BASE}/users/${userId}`)
  console.log(`User: ${user.name}`)
  return user
}

getUserPosts(1)
```

---

---

# 3 — POST, PUT, PATCH & DELETE Requests

---

## T — TL;DR

Axios has a dedicated method for every HTTP verb. Each follows the same pattern: **`axios.method(url, data?, config?)`**. The data (request body) is the second argument — Axios handles JSON serialization automatically.

---

## K — Key Concepts

### POST — Create

```js
// axios.post(url, data, config?)
const { data: newPost } = await axios.post(
  'https://jsonplaceholder.typicode.com/posts',
  {
    title: 'My First Post',
    body: 'Hello world!',
    userId: 1
  }
)

console.log(newPost)
// { id: 101, title: 'My First Post', body: 'Hello world!', userId: 1 }
```

> ✅ Axios automatically sets `Content-Type: application/json` and serializes the object to JSON.

### PUT — Full Replace

```js
// axios.put(url, data, config?)
const { data: updated } = await axios.put(
  'https://jsonplaceholder.typicode.com/posts/1',
  {
    id: 1,
    title: 'Updated Title',
    body: 'Completely replaced content',
    userId: 1
  }
)

console.log(updated)
// { id: 1, title: 'Updated Title', body: 'Completely replaced content', userId: 1 }
```

### PATCH — Partial Update

```js
// axios.patch(url, data, config?)
const { data: patched } = await axios.patch(
  'https://jsonplaceholder.typicode.com/posts/1',
  {
    title: 'Just the Title Changed'  // only updating title
  }
)

console.log(patched)
// { id: 1, title: 'Just the Title Changed', body: '...original...', userId: 1 }
```

### DELETE — Remove

```js
// axios.delete(url, config?)
// Note: no data argument — second arg goes straight to config
const response = await axios.delete(
  'https://jsonplaceholder.typicode.com/posts/1'
)

console.log(response.status) // 200
console.log(response.data)   // {} (empty object from JSONPlaceholder)
```

### Method Signature Summary

```js
// GET
axios.get(url, config?)

// POST
axios.post(url, data, config?)

// PUT
axios.put(url, data, config?)

// PATCH
axios.patch(url, data, config?)

// DELETE
axios.delete(url, config?)
// Note: for DELETE with a body (rare), pass body in config:
axios.delete(url, { data: { reason: 'spam' } })
```

### All Methods Return the Same Response Shape

```js
const postRes   = await axios.post('/api/posts', { title: 'Hi' })
const putRes    = await axios.put('/api/posts/1', { title: 'Updated' })
const patchRes  = await axios.patch('/api/posts/1', { title: 'Partial' })
const deleteRes = await axios.delete('/api/posts/1')

// All have: .data, .status, .headers, .config
console.log(postRes.status)    // 201
console.log(putRes.status)     // 200
console.log(patchRes.status)   // 200
console.log(deleteRes.status)  // 200 or 204
```

### Generic `axios(config)` — The Base Form

All shorthand methods are wrappers around the base `axios()` call:

```js
// This:
axios.post('/api/users', { name: 'Mark' })

// Is identical to:
axios({
  method: 'POST',
  url: '/api/users',
  data: { name: 'Mark' }
})
```

Useful when the method is dynamic:

```js
const method = 'patch'
const url = '/api/users/42'
const body = { name: 'Updated' }

await axios({ method, url, data: body })
```

---

## W — Why It Matters

- These five patterns cover 100% of CRUD operations — every feature you build maps to one of them.
- Knowing that `DELETE` takes a `config` object (not data) as the second argument prevents a silent bug.
- The generic `axios(config)` form is used in advanced patterns like request interceptors and dynamic API services.
- Understanding that Axios auto-handles JSON for bodies saves the two most common `fetch` mistakes every time.

---

## I — Interview Q&A

### Q1: How do you send a request body with Axios?

**A:** Pass a JavaScript object as the second argument to `axios.post()`, `axios.put()`, or `axios.patch()`. Axios automatically serializes it to JSON and sets `Content-Type: application/json`.

### Q2: Why does `axios.delete()` not take a data argument as the second param?

**A:** The HTTP DELETE method typically has no request body — so Axios doesn't reserve the second argument for data. To send a body with DELETE (uncommon but valid), pass it inside the config object as `{ data: {...} }`.

### Q3: What's the difference between `axios.put()` and `axios.patch()`?

**A:** `axios.put()` sends a full replacement — the entire resource is replaced with what you send. `axios.patch()` sends a partial update — only the fields you include are changed, the rest remain. They differ in semantics, not in how Axios handles them.

---

## C — Common Pitfalls + Fix

### ❌ Pitfall: Passing body as second arg to DELETE

```js
// Trying to send a reason with DELETE
await axios.delete('/api/posts/1', { title: 'My Post' })
// ← Second arg is treated as CONFIG, not data
// { title: 'My Post' } is now invalid config — body is silently dropped
```

**Fix:**

```js
await axios.delete('/api/posts/1', {
  data: { reason: 'spam' }   // ← nested under 'data' key inside config
})
```

### ❌ Pitfall: Forgetting to await write operations

```js
axios.post('/api/posts', { title: 'Hi' })  // ← fire and forget!
// No error handling, no loading state, no confirmation
```

**Fix:**

```js
const { data } = await axios.post('/api/posts', { title: 'Hi' })
console.log('Created:', data.id)  // now you have the new ID
```

### ❌ Pitfall: Not sending the full object on PUT

```js
// PUT should replace the whole resource
await axios.put('/api/users/42', {
  name: 'Mark'
  // ← missing email, role, etc. — server may wipe those fields
})
```

**Fix:** Use PATCH for partial updates. Use PUT only when sending the complete object.

---

## K — Coding Challenge + Solution

### Challenge

Write four functions using JSONPlaceholder:

```
1. createPost(title, body, userId)  → POST /posts
2. replacePost(id, fullPost)        → PUT /posts/:id
3. updatePostTitle(id, title)       → PATCH /posts/:id
4. removePost(id)                   → DELETE /posts/:id
```

Each should return `response.data` and log the status code.

### Solution

```js
import axios from 'axios'

const BASE = 'https://jsonplaceholder.typicode.com'

async function createPost(title, body, userId) {
  const res = await axios.post(`${BASE}/posts`, { title, body, userId })
  console.log('Status:', res.status)  // 201
  return res.data
}

async function replacePost(id, fullPost) {
  const res = await axios.put(`${BASE}/posts/${id}`, fullPost)
  console.log('Status:', res.status)  // 200
  return res.data
}

async function updatePostTitle(id, title) {
  const res = await axios.patch(`${BASE}/posts/${id}`, { title })
  console.log('Status:', res.status)  // 200
  return res.data
}

async function removePost(id) {
  const res = await axios.delete(`${BASE}/posts/${id}`)
  console.log('Status:', res.status)  // 200
  return res.data
}

// Test
const post = await createPost('Hello', 'My first post', 1)
console.log(post)  // { id: 101, title: 'Hello', ... }
```

---

---

# 4 — Async/Await with Axios

---

## T — TL;DR

Axios returns Promises. `async/await` makes those promises read like synchronous code. Every Axios call should be inside an `async` function wrapped in `try/catch`.

---

## K — Key Concepts

### Why Async/Await Over `.then()`

```js
// .then() chain — nested, harder to read
axios.get('/api/users/1')
  .then(res => {
    return axios.get(`/api/users/${res.data.id}/posts`)
  })
  .then(res => {
    console.log(res.data)
  })
  .catch(err => {
    console.error(err)
  })

// async/await — reads top-to-bottom, clear and linear
async function getUserPosts(userId) {
  const { data: user } = await axios.get(`/api/users/${userId}`)
  const { data: posts } = await axios.get(`/api/users/${user.id}/posts`)
  return posts
}
```

### The Fundamental Pattern

```js
async function fetchData() {
  try {
    const { data } = await axios.get('/api/resource')
    return data
  } catch (error) {
    console.error('Request failed:', error.message)
    throw error
  }
}
```

### Sequential Requests

When each request depends on the previous:

```js
async function loadUserDashboard(userId) {
  // Step 1: get user
  const { data: user } = await axios.get(`/api/users/${userId}`)

  // Step 2: get their orders (needs userId from step 1)
  const { data: orders } = await axios.get(`/api/users/${user.id}/orders`)

  // Step 3: get first order details (needs orderId from step 2)
  const { data: orderDetail } = await axios.get(`/api/orders/${orders[0].id}`)

  return { user, orders, orderDetail }
}
```

### Parallel Requests — `Promise.all`

When requests are **independent** — run them simultaneously:

```js
async function loadPageData(userId) {
  // ✅ Both requests fire at the same time
  const [userRes, postsRes] = await Promise.all([
    axios.get(`/api/users/${userId}`),
    axios.get(`/api/users/${userId}/posts`)
  ])

  return {
    user: userRes.data,
    posts: postsRes.data
  }
}

// ❌ Sequential when they don't need to be (2x slower)
const { data: user }  = await axios.get(`/api/users/${userId}`)
const { data: posts } = await axios.get(`/api/users/${userId}/posts`)
// These could have run in parallel!
```

### Parallel with `Promise.allSettled`

When you want all results even if some fail:

```js
async function loadDashboard() {
  const results = await Promise.allSettled([
    axios.get('/api/user'),
    axios.get('/api/notifications'),
    axios.get('/api/announcements')
  ])

  results.forEach((result, index) => {
    if (result.status === 'fulfilled') {
      console.log(`Request ${index} succeeded:`, result.value.data)
    } else {
      console.warn(`Request ${index} failed:`, result.reason.message)
    }
  })
}
```

### Async Functions in React

```jsx
// In useEffect — must wrap in inner async function
useEffect(() => {
  async function loadUser() {
    try {
      const { data } = await axios.get(`/api/users/${userId}`)
      setUser(data)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  loadUser()
}, [userId])
```

> ⚠️ `useEffect` callback cannot be `async` directly — always define an inner async function.

---

## W — Why It Matters

- `async/await` is the standard syntax in all modern React codebases — `.then()` chains are considered legacy style.
- The `Promise.all` pattern is the difference between a 600ms page load and a 200ms page load when loading multiple pieces of data.
- The `useEffect` async pattern is something every React developer must know — getting it wrong causes memory leaks and stale closures.
- Sequential vs parallel request decisions are a common performance optimization question in interviews.

---

## I — Interview Q&A

### Q1: Why can't you make a `useEffect` callback async directly?

**A:** `useEffect` expects its callback to either return nothing or return a cleanup function. An async function implicitly returns a Promise — and a Promise is not a valid cleanup function. The solution is to define an inner async function inside the effect and call it immediately.

### Q2: When would you use `Promise.all` vs sequential `await`?

**A:** `Promise.all` when requests are independent — they fire simultaneously and you wait for all to complete. Sequential `await` when each request depends on the result of the previous one. Using sequential awaits for independent requests is a common performance anti-pattern.

### Q3: What's the difference between `Promise.all` and `Promise.allSettled`?

**A:** `Promise.all` short-circuits — if any promise rejects, the whole thing rejects immediately. `Promise.allSettled` always waits for every promise and returns results for all, marking each as `fulfilled` or `rejected`. Use `allSettled` when partial failures are acceptable.

---

## C — Common Pitfalls + Fix

### ❌ Pitfall: Making `useEffect` async directly

```js
useEffect(async () => {
  const { data } = await axios.get('/api/users')
  setUsers(data)
}, [])
// React warning: useEffect callback cannot return a Promise
```

**Fix:**

```js
useEffect(() => {
  async function load() {
    const { data } = await axios.get('/api/users')
    setUsers(data)
  }
  load()
}, [])
```

### ❌ Pitfall: Sequential awaits for independent requests

```js
// These don't depend on each other — but run one after the other
const { data: user }    = await axios.get('/api/user')
const { data: settings } = await axios.get('/api/settings')
const { data: notifs }   = await axios.get('/api/notifications')
// Total time = request1 + request2 + request3
```

**Fix:**

```js
const [userRes, settingsRes, notifsRes] = await Promise.all([
  axios.get('/api/user'),
  axios.get('/api/settings'),
  axios.get('/api/notifications')
])
// Total time = max(request1, request2, request3)
```

### ❌ Pitfall: Not using `finally` for loading state

```js
try {
  setLoading(true)
  const { data } = await axios.get('/api/users')
  setUsers(data)
  setLoading(false)  // ← only runs on success
} catch (err) {
  setError(err.message)
  // setLoading(false) ← forgot this! Loading spinner never stops on error
}
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
  setLoading(false)  // ✅ always runs — success or failure
}
```

---

## K — Coding Challenge + Solution

### Challenge

Write an async function `loadProfilePage(userId)` that:
1. Fetches the user, their posts, and their todos **in parallel**
2. Returns `{ user, posts, todos }`
3. Handles the case where any request fails — if user fetch fails, throw; if posts or todos fail, use empty arrays

```js
const result = await loadProfilePage(1)
// { user: {...}, posts: [...], todos: [...] }
```

### Solution

```js
import axios from 'axios'

const BASE = 'https://jsonplaceholder.typicode.com'

async function loadProfilePage(userId) {
  // User fetch is critical — let it throw if it fails
  const { data: user } = await axios.get(`${BASE}/users/${userId}`)

  // Posts and todos are non-critical — use allSettled
  const [postsResult, todosResult] = await Promise.allSettled([
    axios.get(`${BASE}/users/${userId}/posts`),
    axios.get(`${BASE}/users/${userId}/todos`)
  ])

  const posts = postsResult.status === 'fulfilled'
    ? postsResult.value.data
    : []

  const todos = todosResult.status === 'fulfilled'
    ? todosResult.value.data
    : []

  return { user, posts, todos }
}

const profile = await loadProfilePage(1)
console.log(profile.user.name)    // Leanne Graham
console.log(profile.posts.length) // 10
console.log(profile.todos.length) // 20
```

---

---

# 5 — Request Config Object

---

## T — TL;DR

Every Axios request accepts a **config object** that controls method, URL, headers, params, timeout, and more. Understanding the config unlocks full control over every request you make.

---

## K — Key Concepts

### The Full Config Shape

```js
axios({
  // Required
  method: 'GET',           // 'get', 'post', 'put', 'patch', 'delete'
  url: '/api/users',       // relative or absolute URL

  // Optional — request modification
  baseURL: 'https://api.example.com', // prepended to url
  params: { role: 'admin', page: 1 }, // query parameters → ?role=admin&page=1
  data: { name: 'Mark' },             // request body (POST/PUT/PATCH)
  headers: {
    'Authorization': 'Bearer token',
    'Content-Type': 'application/json'
  },

  // Optional — behavior
  timeout: 5000,           // ms before request is aborted
  withCredentials: false,  // send cookies cross-origin

  // Optional — response control
  responseType: 'json',    // 'json' | 'text' | 'blob' | 'arraybuffer' | 'stream'

  // Optional — upload/download progress
  onUploadProgress: (progressEvent) => { /* ... */ },
  onDownloadProgress: (progressEvent) => { /* ... */ },

  // Optional — request transformation
  transformRequest: [(data) => JSON.stringify(data)],
  transformResponse: [(data) => JSON.parse(data)],
})
```

### Using Config with Shorthand Methods

The config object is the **last argument** on every shorthand method:

```js
// GET — config is second arg
axios.get('/api/users', {
  params: { role: 'admin' },
  headers: { Authorization: 'Bearer token' },
  timeout: 3000
})

// POST — config is THIRD arg (second is data)
axios.post('/api/users', { name: 'Mark' }, {
  headers: { Authorization: 'Bearer token' },
  timeout: 5000
})

// PATCH — same as POST
axios.patch('/api/users/42', { name: 'Mark' }, {
  headers: { Authorization: 'Bearer token' }
})

// DELETE — config is second arg (like GET)
axios.delete('/api/users/42', {
  headers: { Authorization: 'Bearer token' }
})
```

### `baseURL` — Set Once, Use Everywhere

```js
// Without baseURL — repetitive
axios.get('https://api.example.com/v1/users')
axios.post('https://api.example.com/v1/posts', data)
axios.delete('https://api.example.com/v1/posts/1')

// With baseURL in config — cleaner
axios.get('/users',     { baseURL: 'https://api.example.com/v1' })
axios.post('/posts',    { baseURL: 'https://api.example.com/v1' }, data)
// Better: use axios.create() — covered in Topic 12
```

### `responseType` — Non-JSON Responses

```js
// Download a file as a Blob
const { data: blob } = await axios.get('/api/export/report.pdf', {
  responseType: 'blob'
})

// Create a download link
const url = URL.createObjectURL(blob)
const link = document.createElement('a')
link.href = url
link.download = 'report.pdf'
link.click()

// Get raw text
const { data: text } = await axios.get('/api/data.csv', {
  responseType: 'text'
})
```

### `withCredentials` — Sending Cookies Cross-Origin

```js
// For APIs that use HttpOnly cookie auth
axios.get('/api/profile', {
  withCredentials: true  // sends cookies with cross-origin requests
})
```

---

## W — Why It Matters

- The config object is the primary way to customize every request — you'll use it in every non-trivial API call.
- `baseURL` prevents the repetition and maintenance burden of hardcoded URLs.
- `responseType: 'blob'` is how you handle file downloads — a common feature request in dashboards.
- Understanding the config argument position (2nd for GET/DELETE, 3rd for POST/PUT/PATCH) prevents silent bugs where your config is treated as the request body.

---

## I — Interview Q&A

### Q1: How do you set a base URL in Axios?

**A:** Either set `baseURL` in the config per request, or — better — create a configured Axios instance with `axios.create({ baseURL: 'https://api.example.com' })` and use that instance everywhere. The instance automatically prepends the base URL to all relative paths.

### Q2: Where does the config object go in `axios.post()`?

**A:** Third argument — `axios.post(url, data, config)`. Forgetting this and passing config as second arg causes the config to be treated as the request body and the actual data is lost.

### Q3: How do you download a binary file with Axios?

**A:** Set `responseType: 'blob'` in the config. The response `.data` will be a Blob object instead of parsed JSON. You can then use `URL.createObjectURL()` to create a temporary download link.

---

## C — Common Pitfalls + Fix

### ❌ Pitfall: Passing config as second arg on POST

```js
// Intended: POST with data and auth header
axios.post('/api/users', {
  headers: { Authorization: 'Bearer token' }
})
// ← The header config was sent as the REQUEST BODY
// ← No actual user data was sent
// ← No auth header was added
```

**Fix:**

```js
axios.post('/api/users',
  { name: 'Mark', email: 'mark@example.com' },  // ← data (2nd arg)
  { headers: { Authorization: 'Bearer token' } } // ← config (3rd arg)
)
```

### ❌ Pitfall: Using `responseType: 'blob'` but trying to parse as JSON

```js
const { data } = await axios.get('/api/file.pdf', { responseType: 'blob' })
console.log(data.title)  // undefined — data is a Blob, not a parsed object
```

**Fix:** Only use `responseType: 'blob'` for binary responses. JSON endpoints don't need it.

### ❌ Pitfall: Forgetting `withCredentials` for cookie-based auth APIs

```js
axios.get('/api/me')
// 401 — cookies not sent because cross-origin requests strip cookies by default
```

**Fix:**

```js
axios.get('/api/me', { withCredentials: true })
// or set globally on your axios instance
```

---

## K — Coding Challenge + Solution

### Challenge

Write a single `apiCall` function using the generic `axios(config)` form that accepts:
- `method`
- `endpoint` (relative path)
- optional `body`
- optional `queryParams`
- optional `token`

And constructs the full config object:

```js
await apiCall('GET', '/users', null, { role: 'admin' }, 'mytoken123')
// → GET /users?role=admin with Authorization: Bearer mytoken123

await apiCall('POST', '/users', { name: 'Mark' }, null, 'mytoken123')
// → POST /users with body { name: 'Mark' } and auth header
```

### Solution

```js
import axios from 'axios'

const BASE_URL = 'https://jsonplaceholder.typicode.com'

async function apiCall(method, endpoint, body = null, queryParams = null, token = null) {
  const config = {
    method,
    url: endpoint,
    baseURL: BASE_URL
  }

  if (body)        config.data    = body
  if (queryParams) config.params  = queryParams
  if (token)       config.headers = { Authorization: `Bearer ${token}` }

  const { data } = await axios(config)
  return data
}

// Test
const users = await apiCall('GET', '/users', null, null, 'token123')
console.log(users[0].name)  // Leanne Graham
```

---

---

# 6 — Params (Query Parameters)

---

## T — TL;DR

In Axios, query parameters go in the **`params` config key** — never manually appended to the URL string. Axios serializes them automatically, handles encoding, and keeps your URLs clean.

---

## K — Key Concepts

### The `params` Config Key

```js
// ❌ Manual string building (fragile)
axios.get(`/api/users?role=admin&page=2&limit=20`)

// ✅ Axios params (automatic, encoded, clean)
axios.get('/api/users', {
  params: {
    role: 'admin',
    page: 2,
    limit: 20
  }
})
// Axios builds: /api/users?role=admin&page=2&limit=20
```

### Params Are Automatically URL-Encoded

```js
// Special characters are safely encoded
axios.get('/api/search', {
  params: { q: 'rock & roll', tag: 'c++' }
})
// → /api/search?q=rock%20%26%20roll&tag=c%2B%2B   ✅
// vs manual: /api/search?q=rock & roll  ← broken URL
```

### Conditional Params

Only include params when they have a value:

```js
async function fetchUsers({ role, status, search, page = 1, limit = 20 } = {}) {
  const params = { page, limit }

  if (role)   params.role   = role
  if (status) params.status = status
  if (search) params.q      = search

  const { data } = await axios.get('/api/users', { params })
  return data
}

// Only sends params that are defined
fetchUsers({ role: 'admin' })
// → GET /api/users?page=1&limit=20&role=admin
```

### Null and Undefined Are Automatically Skipped

```js
axios.get('/api/users', {
  params: {
    role: 'admin',
    status: undefined,  // ← automatically excluded
    search: null        // ← automatically excluded
  }
})
// → /api/users?role=admin   (undefined and null are dropped)
```

### Array Params

```js
// Default: ?ids[]=1&ids[]=2&ids[]=3
axios.get('/api/posts', {
  params: { ids: [1, 2, 3] }
})

// Custom serializer for ?ids=1,2,3 format
import qs from 'qs'

axios.get('/api/posts', {
  params: { ids: [1, 2, 3] },
  paramsSerializer: (params) => qs.stringify(params, { arrayFormat: 'comma' })
})
// → /api/posts?ids=1,2,3
```

### Reading Params from a React State/Form

```js
const [filters, setFilters] = useState({
  category: '',
  minPrice: '',
  maxPrice: '',
  sort: 'createdAt',
  order: 'desc',
  page: 1
})

async function search() {
  const { data } = await axios.get('/api/products', {
    params: filters
    // undefined/empty string values are still included — filter them first if needed
  })
  setProducts(data)
}
```

```js
// Filter out empty strings and null before sending
const cleanParams = Object.fromEntries(
  Object.entries(filters).filter(([_, v]) => v !== '' && v !== null)
)
const { data } = await axios.get('/api/products', { params: cleanParams })
```

---

## W — Why It Matters

- Manual URL string construction with template literals is the #1 source of encoding bugs in junior code.
- Using `params` keeps URL construction declarative and readable — you can see all parameters at a glance.
- Null/undefined auto-exclusion means you can pass a full filter object without conditionally omitting empty values.
- Syncing filter/search state to API params is the core of every filterable list, search page, and data table.

---

## I — Interview Q&A

### Q1: How do you pass query parameters in Axios?

**A:** Use the `params` key in the config object: `axios.get('/api/users', { params: { role: 'admin', page: 2 } })`. Axios handles serialization and URL encoding automatically.

### Q2: What happens to `undefined` values in Axios `params`?

**A:** Axios automatically skips keys with `undefined` values when building the query string. `null` is also excluded. This means you can pass a full filter object and empty/unset filters won't pollute the URL.

### Q3: Why is manual URL string building for query params bad practice?

**A:** Special characters like `&`, `+`, `=`, and spaces aren't encoded, which breaks the URL. Template literals don't handle arrays or nested objects. And conditionally omitting parameters requires messy string manipulation. The `params` object handles all of this cleanly.

---

## C — Common Pitfalls + Fix

### ❌ Pitfall: Appending params directly to the URL string

```js
const role = 'admin & super'
axios.get(`/api/users?role=${role}`)
// → /api/users?role=admin & super  ← broken URL
```

**Fix:**

```js
axios.get('/api/users', { params: { role: 'admin & super' } })
// → /api/users?role=admin%20%26%20super  ✅
```

### ❌ Pitfall: Sending empty string filters to the API

```js
const filters = { category: '', sort: 'price' }
axios.get('/api/products', { params: filters })
// → /api/products?category=&sort=price
// Server receives category="" — may return no results
```

**Fix:** Clean before sending:

```js
const cleanParams = Object.fromEntries(
  Object.entries(filters).filter(([_, v]) => v !== '')
)
// → { sort: 'price' }
```

### ❌ Pitfall: Duplicating the base URL in params by mistake

```js
axios.get('https://api.example.com/users?page=1', {
  params: { page: 2 }   // ← page appears TWICE: ?page=1&page=2
})
```

**Fix:** Never put params in the URL string if you're also using the `params` config.

---

## K — Coding Challenge + Solution

### Challenge

Write a `searchPosts` function that builds a clean params object from a filter object, excluding empty strings and null/undefined values:

```js
searchPosts({
  userId: 1,
  title: '',         // should be excluded
  status: null,      // should be excluded
  sort: 'createdAt',
  page: 2
})
// → GET /posts?userId=1&sort=createdAt&page=2
```

### Solution

```js
import axios from 'axios'

async function searchPosts(filters = {}) {
  // Remove falsy values (empty string, null, undefined)
  // Keep 0 and false as they can be valid filter values
  const params = Object.fromEntries(
    Object.entries(filters).filter(([_, v]) => v !== '' && v !== null && v !== undefined)
  )

  const { data } = await axios.get(
    'https://jsonplaceholder.typicode.com/posts',
    { params }
  )

  return data
}

const posts = await searchPosts({
  userId: 1,
  title: '',
  status: null,
  sort: 'createdAt',
  page: 2
})

console.log(posts.length)  // returns posts for userId 1
```

---

---

# 7 — Headers

---

## T — TL;DR

Headers carry **metadata** about a request. In Axios, you set them in the `headers` config key. The most important ones in practice: `Authorization`, `Content-Type`, and custom app headers.

---

## K — Key Concepts

### Setting Headers per Request

```js
const { data } = await axios.get('/api/profile', {
  headers: {
    'Authorization': 'Bearer eyJhbGci...',
    'Accept': 'application/json'
  }
})
```

### Headers for Write Requests (POST, PUT, PATCH)

Axios **automatically sets `Content-Type: application/json`** when you pass an object as the body. You rarely need to set it manually.

```js
// Content-Type is set automatically by Axios
await axios.post('/api/users', { name: 'Mark' })
// → Content-Type: application/json ✅ (automatic)

// But you can override it:
await axios.post('/api/upload', formData, {
  headers: { 'Content-Type': 'multipart/form-data' }
})
```

### Authorization Header Patterns

```js
// Bearer token (JWT)
headers: { Authorization: `Bearer ${token}` }

// API Key
headers: { 'X-API-Key': apiKey }

// Basic auth (base64 encoded "user:pass")
headers: { Authorization: `Basic ${btoa(`${username}:${password}`)}` }

// Axios built-in basic auth config
axios.get('/api/resource', {
  auth: {
    username: 'mark',
    password: 'secret'
  }
  // Axios sets Authorization: Basic ... automatically
})
```

### Custom App Headers

```js
// Correlation ID for request tracing
headers: { 'X-Request-ID': crypto.randomUUID() }

// App version for API compatibility
headers: { 'X-App-Version': '2.1.0' }

// Custom client identifier
headers: { 'X-Client-Type': 'web' }
```

### Reading Response Headers

```js
const response = await axios.get('/api/users')

// Common response headers
console.log(response.headers['content-type'])        // application/json
console.log(response.headers['x-ratelimit-remaining']) // 99
console.log(response.headers['x-total-count'])       // 243 (total items)
```

### Setting Default Headers on an Axios Instance

Rather than repeating headers on every request — set them once (covered more in Topic 12):

```js
import axios from 'axios'

const api = axios.create({
  baseURL: 'https://api.example.com',
  headers: {
    'Content-Type': 'application/json',
    'X-Client-Type': 'web'
  }
})

// Authorization is usually dynamic, so set it when you have the token:
api.defaults.headers.common['Authorization'] = `Bearer ${token}`
```

---

## W — Why It Matters

- Almost every real API requires an `Authorization` header — this is the most used header in daily frontend development.
- Knowing that Axios auto-sets `Content-Type` prevents over-engineering and confusion when debugging.
- Response headers carry important metadata: rate limit state, pagination counts, cache instructions — ignoring them means missing critical information.
- Custom headers (`X-Request-ID`) are expected in enterprise and production applications for observability.

---

## I — Interview Q&A

### Q1: Does Axios automatically set `Content-Type`?

**A:** Yes. When you pass a plain JavaScript object as the request body to `axios.post()`, `axios.put()`, or `axios.patch()`, Axios automatically sets `Content-Type: application/json` and serializes the object to JSON. You only need to set it manually when using FormData or other non-JSON formats.

### Q2: How do you set an Authorization header for every request without repeating yourself?

**A:** Create an Axios instance with `axios.create()` and set `instance.defaults.headers.common['Authorization']` once you have the token. Or use a request interceptor to inject it dynamically before every request.

### Q3: How do you read response headers in Axios?

**A:** Access `response.headers` — it's an object of lowercase header names. For example: `response.headers['x-ratelimit-remaining']` or `response.headers['content-type']`.

---

## C — Common Pitfalls + Fix

### ❌ Pitfall: Manually setting `Content-Type: application/json` for JSON bodies

```js
// Unnecessary — Axios already does this
axios.post('/api/users', { name: 'Mark' }, {
  headers: { 'Content-Type': 'application/json' }  // ← redundant
})
```

**Fix:** Skip it for JSON bodies. Only set `Content-Type` manually for non-JSON (FormData, text, CSV).

### ❌ Pitfall: Hardcoding tokens in headers inline

```js
axios.get('/api/orders', {
  headers: { Authorization: 'Bearer eyJhbGci...' }  // hardcoded!
})
```

**Fix:** Read the token from a variable, store, or environment:

```js
const token = localStorage.getItem('access_token')
axios.get('/api/orders', {
  headers: { Authorization: `Bearer ${token}` }
})
```

### ❌ Pitfall: Setting `Content-Type: multipart/form-data` manually for FormData

```js
const formData = new FormData()
formData.append('file', file)

axios.post('/api/upload', formData, {
  headers: { 'Content-Type': 'multipart/form-data' }  // ← removes boundary!
})
```

**Fix:** Let Axios (or the browser) set it automatically — the browser adds the required `boundary` parameter:

```js
axios.post('/api/upload', formData)
// Browser sets: Content-Type: multipart/form-data; boundary=----WebKitFormBoundary...
```

---

## K — Coding Challenge + Solution

### Challenge

Write an `authorizedGet` and `authorizedPost` function that:
1. Read a token from `localStorage`
2. Attach it as a Bearer token
3. Throw a clear error if no token is found

```js
const user = await authorizedGet('/api/profile')
const post = await authorizedPost('/api/posts', { title: 'Hi' })
```

### Solution

```js
import axios from 'axios'

function getAuthHeaders() {
  const token = localStorage.getItem('access_token')
  if (!token) throw new Error('No auth token found. Please log in.')
  return { Authorization: `Bearer ${token}` }
}

async function authorizedGet(endpoint) {
  const { data } = await axios.get(endpoint, {
    headers: getAuthHeaders()
  })
  return data
}

async function authorizedPost(endpoint, body) {
  const { data } = await axios.post(endpoint, body, {
    headers: getAuthHeaders()
    // Content-Type: application/json is set automatically by Axios
  })
  return data
}
```

---

---

# 8 — Request Body & JSON Handling

---

## T — TL;DR

Axios **automatically serializes** JavaScript objects to JSON on the way out and **automatically parses** JSON on the way in. No `JSON.stringify()`, no `.json()` — just plain objects in and out.

---

## K — Key Concepts

### Automatic JSON Serialization (Request)

```js
// fetch — manual
fetch('/api/users', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ name: 'Mark', email: 'mark@example.com' })
})

// axios — automatic
axios.post('/api/users', {
  name: 'Mark',
  email: 'mark@example.com'
  // Axios: serializes → sets Content-Type: application/json → sends
})
```

### Automatic JSON Parsing (Response)

```js
// fetch — manual parse
const res = await fetch('/api/users/1')
const user = await res.json()  // manual parse step

// axios — automatic
const { data: user } = await axios.get('/api/users/1')
// response.data is already a JS object — no .json() needed
console.log(user.name)  // "Mark" ← directly accessible
```

### What Axios Handles Automatically

```
REQUEST:
Object body → JSON.stringify() → sets Content-Type: application/json

RESPONSE:
Content-Type: application/json → parses body → puts result in response.data
```

### Sending Nested Objects and Arrays

```js
// Complex nested body — works exactly the same
await axios.post('/api/orders', {
  customerId: 42,
  items: [
    { productId: 1, quantity: 2, price: 29.99 },
    { productId: 5, quantity: 1, price: 49.99 }
  ],
  shipping: {
    address: '123 Main St',
    city: 'Manila',
    zip: '1000'
  },
  notes: null
})
// Axios serializes the entire nested structure
```

### Sending Non-JSON Data

```js
// Form data (file upload)
const formData = new FormData()
formData.append('avatar', fileInput.files[0])
formData.append('userId', '42')
// Don't set Content-Type — browser adds boundary automatically
await axios.post('/api/upload', formData)

// URL-encoded form (legacy HTML forms)
const params = new URLSearchParams({ username: 'mark', password: 'pass' })
await axios.post('/api/login', params, {
  headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
})

// Raw text
await axios.post('/api/webhook', 'raw text content', {
  headers: { 'Content-Type': 'text/plain' }
})
```

### `transformRequest` and `transformResponse`

For custom serialization/parsing:

```js
const api = axios.create({
  transformRequest: [
    (data) => {
      // Add a timestamp to every outgoing request body
      return JSON.stringify({ ...data, _timestamp: Date.now() })
    }
  ],
  transformResponse: [
    (data) => {
      // Auto-camelCase all response keys
      const parsed = JSON.parse(data)
      return toCamelCase(parsed)  // your utility function
    }
  ]
})
```

### Validating Response Shape in TypeScript (Bonus)

```ts
interface User {
  id: number
  name: string
  email: string
}

const { data } = await axios.get<User>('/api/users/1')
// data is now typed as User
console.log(data.name)  // TypeScript knows this is string
```

---

## W — Why It Matters

- Automatic JSON handling eliminates the two most common `fetch` bugs — this is the single biggest ergonomic advantage of Axios.
- Understanding WHEN Axios handles JSON vs when you need to override (FormData, text, CSV) prevents incorrect `Content-Type` headers.
- `transformRequest`/`transformResponse` are used in professional codebases to normalize API shapes (e.g., snake_case → camelCase).
- TypeScript generics on Axios responses give you full type safety — critical in large codebases.

---

## I — Interview Q&A

### Q1: Why don't you need `JSON.stringify()` when using Axios?

**A:** Axios detects when you pass a plain JavaScript object as the request body and automatically calls `JSON.stringify()` and sets `Content-Type: application/json`. It's part of the default `transformRequest` pipeline.

### Q2: Why don't you need `.json()` when using Axios?

**A:** Axios checks the `Content-Type` header of the response. If it's `application/json`, Axios automatically parses the body and places the result in `response.data`. You get a JavaScript object directly.

### Q3: How would you handle a non-JSON API response in Axios?

**A:** Set `responseType` in the config. For text: `responseType: 'text'`. For files: `responseType: 'blob'`. For binary: `responseType: 'arraybuffer'`. For streams (Node.js): `responseType: 'stream'`.

---

## C — Common Pitfalls + Fix

### ❌ Pitfall: Calling `JSON.stringify()` manually on the Axios body

```js
axios.post('/api/users', JSON.stringify({ name: 'Mark' }))
// ← Axios will double-stringify: '"{\"name\":\"Mark\"}"'
// ← Server receives a JSON string, not an object
```

**Fix:**

```js
axios.post('/api/users', { name: 'Mark' })  // ← plain object, Axios handles the rest
```

### ❌ Pitfall: Calling `.json()` on an Axios response

```js
const res = await axios.get('/api/users/1')
const user = await res.data.json()  // TypeError: res.data.json is not a function
```

**Fix:**

```js
const { data: user } = await axios.get('/api/users/1')
// data IS already the parsed object
```

### ❌ Pitfall: Expecting JSON parsing when `responseType` is overridden

```js
const { data } = await axios.get('/api/users', { responseType: 'text' })
console.log(data.name)  // undefined — data is a raw JSON string, not parsed
```

**Fix:** Only use `responseType: 'text'` or `'blob'` for non-JSON responses.

---

## K — Coding Challenge + Solution

### Challenge

Write `uploadAvatar(userId, file)` that:
1. Sends a `FormData` request with both the file and userId
2. Returns the new avatar URL from the response
3. Also write `updateProfile(userId, data)` that sends JSON

```js
const { avatarUrl } = await uploadAvatar(1, file)
const user = await updateProfile(1, { bio: 'Frontend dev' })
```

### Solution

```js
import axios from 'axios'

async function uploadAvatar(userId, file) {
  const formData = new FormData()
  formData.append('avatar', file)
  formData.append('userId', String(userId))
  // Don't set Content-Type — browser adds boundary parameter automatically

  const { data } = await axios.post('/api/upload/avatar', formData)
  return data  // { avatarUrl: 'https://...' }
}

async function updateProfile(userId, profileData) {
  // Plain object → Axios auto-handles JSON serialization
  const { data } = await axios.patch(`/api/users/${userId}`, profileData)
  return data  // updated user object
}
```

---

---

# 9 — Response Schema

---

## T — TL;DR

Every Axios response has the **same six-field structure**, regardless of the endpoint. Knowing this schema means you always know where to find data, status codes, and headers.

---

## K — Key Concepts

### The Full Axios Response Schema

```js
const response = await axios.get('/api/users/1')

console.log(response.data)       // The parsed response body (what you usually want)
console.log(response.status)     // HTTP status code: 200, 201, 404, etc.
console.log(response.statusText) // Status text: "OK", "Created", "Not Found"
console.log(response.headers)    // Response headers object
console.log(response.config)     // The config that was used for the request
console.log(response.request)    // The underlying XMLHttpRequest (browser) or http.ClientRequest (Node)
```

### Deep Dive: Each Field

#### `response.data` — The Body

```js
// For a user endpoint:
response.data
// { id: 1, name: "Mark", email: "mark@example.com" }

// For a list endpoint:
response.data
// [{ id: 1, ... }, { id: 2, ... }]

// For an envelope:
response.data
// { data: [...], meta: { total: 100, page: 1 } }
```

#### `response.status` — The HTTP Code

```js
console.log(response.status)
// 200 — OK
// 201 — Created
// 204 — No Content
// 400 — Bad Request
// etc.

// Practical use:
if (response.status === 201) {
  showSuccessMessage('Resource created!')
}
```

#### `response.headers` — Response Headers

```js
// All lowercase keys
response.headers['content-type']            // "application/json; charset=utf-8"
response.headers['x-ratelimit-remaining']   // "98"
response.headers['x-total-count']           // "243"
response.headers['cache-control']           // "max-age=3600"

// Use for pagination from headers (GitHub API style)
const total = parseInt(response.headers['x-total-count'] || '0')
```

#### `response.config` — What Was Sent

```js
// Useful for debugging — see exactly what Axios sent
response.config.url        // "/api/users/1"
response.config.method     // "get"
response.config.headers    // headers that were sent
response.config.params     // query params
response.config.data       // serialized request body
response.config.timeout    // timeout setting
response.config.baseURL    // base URL
```

### Practical Destructuring Patterns

```js
// Most common — just get the data
const { data } = await axios.get('/api/users')

// Get data and status
const { data, status } = await axios.get('/api/users')
console.log(status)  // 200

// Get data with rename
const { data: users } = await axios.get('/api/users')

// Get everything you need
const { data: post, status, headers } = await axios.post('/api/posts', { title: 'Hi' })
const location = headers['location']  // URL of created resource
console.log(status)    // 201
console.log(location)  // /api/posts/101
```

### Response Schema in Error Objects

When Axios throws on 4xx/5xx, the error also has a response:

```js
try {
  await axios.get('/api/users/999')
} catch (error) {
  console.log(error.response.status)      // 404
  console.log(error.response.data)        // { error: { code: 'NOT_FOUND', message: '...' } }
  console.log(error.response.headers)     // response headers
  console.log(error.config.url)           // '/api/users/999'
}
```

---

## W — Why It Matters

- Knowing the response schema means you never have to guess where data, status, or headers live.
- `response.config` is invaluable for debugging — you can verify exactly what Axios sent in production.
- Response headers often carry critical metadata: pagination totals, rate limit state, content disposition for downloads.
- The error's `response` property uses the same schema — consistent mental model for success and failure.

---

## I — Interview Q&A

### Q1: What are the six fields on an Axios response object?

**A:** `data` (parsed body), `status` (HTTP code), `statusText` (code description), `headers` (response headers), `config` (request config used), and `request` (underlying HTTP request object).

### Q2: How do you access the HTTP status code of an Axios response?

**A:** `response.status`. It's a number — `200`, `201`, `404`, etc. Note: Axios only resolves the promise for 2xx responses by default. For 4xx/5xx, the status is on `error.response.status` inside the catch block.

### Q3: How do you read custom response headers in Axios?

**A:** Access `response.headers` with lowercase header names. For example: `response.headers['x-total-count']` or `response.headers['content-type']`.

---

## C — Common Pitfalls + Fix

### ❌ Pitfall: Forgetting that error responses also have a response schema

```js
try {
  await axios.get('/api/users/999')
} catch (error) {
  console.log(error.status)  // undefined! ← error.status doesn't exist
}
```

**Fix:**

```js
catch (error) {
  console.log(error.response?.status)  // ✅ 404
  console.log(error.response?.data)    // ✅ { error: { message: "Not found" } }
}
```

### ❌ Pitfall: Logging the entire response for debugging

```js
const response = await axios.get('/api/users')
console.log(response)
// Logs a huge object with circular references — hard to read
```

**Fix:** Log only what you need:

```js
console.log({
  status: response.status,
  data: response.data,
  url: response.config.url
})
```

### ❌ Pitfall: Using `response.statusText` for error messages in UI

```js
showError(response.statusText)  // "Internal Server Error" — not user-friendly
```

**Fix:** Use the API's error message from `response.data.error.message`:

```js
showError(error.response?.data?.error?.message || 'Something went wrong')
```

---

## K — Coding Challenge + Solution

### Challenge

Write a `debugRequest` wrapper that logs a summary of every response including: URL, method, status, data (truncated), and any `x-` headers:

```js
const data = await debugRequest(() => axios.get('/api/users'))
// Logs:
// ─── Response ───────────────────────
// URL:     GET /api/users
// Status:  200 OK
// Data:    [{"id":1,"name":"Leanne...} (truncated)
// X-Headers: {}
// ────────────────────────────────────
```

### Solution

```js
import axios from 'axios'

async function debugRequest(requestFn) {
  const response = await requestFn()

  const xHeaders = Object.fromEntries(
    Object.entries(response.headers).filter(([key]) => key.startsWith('x-'))
  )

  const dataStr = JSON.stringify(response.data).slice(0, 80)

  console.log('─── Response ───────────────────────')
  console.log(`URL:      ${response.config.method?.toUpperCase()} ${response.config.url}`)
  console.log(`Status:   ${response.status} ${response.statusText}`)
  console.log(`Data:     ${dataStr}${dataStr.length >= 80 ? '...' : ''}`)
  console.log(`X-Headers:`, xHeaders)
  console.log('────────────────────────────────────')

  return response.data
}

// Usage
const users = await debugRequest(() =>
  axios.get('https://jsonplaceholder.typicode.com/users')
)
```

---

---

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