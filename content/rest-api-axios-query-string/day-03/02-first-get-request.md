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
