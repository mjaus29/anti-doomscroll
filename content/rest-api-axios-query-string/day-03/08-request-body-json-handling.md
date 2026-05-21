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
