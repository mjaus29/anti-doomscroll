# 4 — HTTP Methods: GET, POST, PUT, PATCH, DELETE

---

## T — TL;DR

HTTP methods define **what action** you're performing on a resource. The five core methods map to **read, create, replace, update, and delete** — and using them correctly is what makes an API "RESTful."

---

## K — Key Concepts

### The Five Core Methods

| Method | Action | Has Body? | Use Case |
|--------|--------|-----------|----------|
| `GET` | Read | ❌ No | Fetch a resource or list |
| `POST` | Create | ✅ Yes | Create a new resource |
| `PUT` | Replace | ✅ Yes | Fully replace a resource |
| `PATCH` | Update | ✅ Yes | Partially update a resource |
| `DELETE` | Delete | ❌ Usually not | Remove a resource |

### GET — Read

```js
// Get all users
fetch('/api/users')

// Get specific user
fetch('/api/users/42')
```

- No body
- Should never modify server state
- Response is cacheable

### POST — Create

```js
fetch('/api/users', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ name: 'Mark', email: 'mark@example.com' })
})
```

- Creates a NEW resource
- Server decides the new resource's ID
- Response often returns the created resource with its new ID

### PUT — Replace (Full Update)

```js
fetch('/api/users/42', {
  method: 'PUT',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ name: 'Mark Updated', email: 'new@example.com', role: 'admin' })
})
```

- Replaces the **entire** resource
- If you omit a field, it may be removed or reset
- You must send the full object

### PATCH — Update (Partial Update)

```js
fetch('/api/users/42', {
  method: 'PATCH',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ name: 'Mark Updated' }) // only updating name
})
```

- Updates **only the fields you send**
- Other fields remain unchanged
- More efficient than PUT for small changes

### DELETE — Remove

```js
fetch('/api/users/42', {
  method: 'DELETE'
})
```

- Removes the resource
- Usually no request body
- Often returns `204 No Content` or `200` with a message

### PUT vs PATCH — The Key Difference

```
Current state: { id: 42, name: "Mark", email: "mark@ex.com", role: "user" }

PUT  { name: "Alex" }         → { id: 42, name: "Alex" }
                                 ← email and role may be wiped!

PATCH { name: "Alex" }        → { id: 42, name: "Alex", email: "mark@ex.com", role: "user" }
                                 ← only name changed
```

---

## W — Why It Matters

- Using the wrong method is a common bug (e.g., using POST for an update).
- REST APIs self-document when methods are used correctly — any dev can infer behavior from the method.
- PUT vs PATCH is one of the most common frontend interview questions.
- Many backends enforce method constraints — calling GET with a body, or DELETE on a non-existent resource behaves differently across APIs.

---

## I — Interview Q&A

### Q1: What's the difference between PUT and PATCH?

**A:** PUT replaces the entire resource — you send a complete object and the server stores it wholesale. PATCH does a partial update — you send only the fields you want to change, and the rest remain untouched.

### Q2: When would you use POST vs PUT?

**A:** POST when the server assigns the ID (creating a new resource). PUT when the client knows the exact ID and wants to create or fully replace that specific resource.

### Q3: Does GET have a request body?

**A:** Technically the spec allows it, but in practice no. GET requests should not have a body. Use query parameters for filtering instead.

### Q4: What does DELETE typically return?

**A:** Usually `204 No Content` (success, no body) or `200 OK` with a confirmation message. Some APIs return `404` if the resource didn't exist.

---

## C — Common Pitfalls + Fix

### ❌ Pitfall: Using POST for updates

```js
fetch('/api/users/42', { method: 'POST', body: JSON.stringify({ name: 'New' }) })
// POST means CREATE — this may create a duplicate
```

**Fix:** Use PATCH for partial updates, PUT for full replacement.

### ❌ Pitfall: Using PUT when you only want to change one field

```js
// You only want to change the name
fetch('/api/users/42', { method: 'PUT', body: JSON.stringify({ name: 'Mark' }) })
// Result: email, role, and all other fields may be wiped
```

**Fix:** Use PATCH for partial updates.

### ❌ Pitfall: Forgetting `Content-Type` header with POST/PUT/PATCH

```js
fetch('/api/users', {
  method: 'POST',
  body: JSON.stringify({ name: 'Mark' })
  // Missing: headers: { 'Content-Type': 'application/json' }
})
// Server may not parse the body correctly
```

**Fix:** Always set `Content-Type: application/json` when sending JSON.

---

## K — Coding Challenge + Solution

### Challenge

Match each scenario to the correct HTTP method:

```
1. Load a user's profile page
2. Submit a sign-up form to create a new account
3. Change only your profile picture URL (nothing else)
4. Reset a user's entire settings object to new defaults
5. Remove a blog post
```

### Solution

```
1. GET    /users/42
2. POST   /users
3. PATCH  /users/42
4. PUT    /users/42/settings
5. DELETE /posts/7
```

---

---
