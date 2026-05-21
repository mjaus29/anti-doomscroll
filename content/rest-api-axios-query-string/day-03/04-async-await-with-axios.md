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
