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
