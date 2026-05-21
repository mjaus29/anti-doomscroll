# 2 — CRUD Mapping to HTTP Methods

---

## T — TL;DR

Every data operation maps to a specific HTTP method. **CRUD = Create → POST, Read → GET, Update → PUT/PATCH, Delete → DELETE.** Knowing this mapping lets you design and consume any REST API without guessing.

---

## K — Key Concepts

### The CRUD-to-HTTP Map

| CRUD                 | HTTP Method | URL Pattern      | Description             |
| -------------------- | ----------- | ---------------- | ----------------------- |
| **C**reate           | POST        | `/resources`     | Create a new resource   |
| **R**ead (list)      | GET         | `/resources`     | Get all / filtered list |
| **R**ead (one)       | GET         | `/resources/:id` | Get a specific resource |
| **U**pdate (full)    | PUT         | `/resources/:id` | Replace entire resource |
| **U**pdate (partial) | PATCH       | `/resources/:id` | Modify specific fields  |
| **D**elete           | DELETE      | `/resources/:id` | Remove a resource       |

### Full CRUD for a `posts` Resource

```
GET    /posts            → list all posts
POST   /posts            → create a new post
GET    /posts/7          → get post #7
PUT    /posts/7          → fully replace post #7
PATCH  /posts/7          → partially update post #7
DELETE /posts/7          → delete post #7
```

### In Code — A Complete CRUD Service

```js
const API = "https://api.example.com";

// READ — list
const getPosts = () => fetch(`${API}/posts`).then((r) => r.json());

// READ — single
const getPost = (id) => fetch(`${API}/posts/${id}`).then((r) => r.json());

// CREATE
const createPost = (data) =>
  fetch(`${API}/posts`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  }).then((r) => r.json());

// UPDATE (partial)
const updatePost = (id, data) =>
  fetch(`${API}/posts/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  }).then((r) => r.json());

// DELETE
const deletePost = (id) => fetch(`${API}/posts/${id}`, { method: "DELETE" });
```

### What the Server Returns per Operation

| Operation | Typical Status | Typical Body                   |
| --------- | -------------- | ------------------------------ |
| GET list  | 200            | Array of resources             |
| GET one   | 200 / 404      | Resource object / error        |
| POST      | 201            | Created resource (with new ID) |
| PUT       | 200            | Updated resource               |
| PATCH     | 200            | Updated resource               |
| DELETE    | 204            | No body                        |

---

## W — Why It Matters

- Every CRUD app you build follows this pattern — forms, dashboards, admin panels.
- Understanding the map helps you write frontend services faster and more consistently.
- When a backend dev hands you API docs, you can immediately map operations to your state management.
- CRUD mapping is the starting point for every API design interview question.

---

## I — Interview Q&A

### Q1: How does CRUD map to HTTP methods?

**A:** Create → POST, Read → GET, Update → PUT (full) or PATCH (partial), Delete → DELETE.

### Q2: Should POST return the created object?

**A:** Best practice: yes. Return `201 Created` with the new resource in the body (including its server-generated ID). This prevents the client from needing a second GET request.

### Q3: Is it ever acceptable to use POST for a read operation?

**A:** Rarely, but yes — for complex search queries where query string length limits would be exceeded, some APIs use POST `/search` with a JSON body. This is a pragmatic exception to the rule.

---

## C — Common Pitfalls + Fix

### ❌ Pitfall: Using GET for operations that modify state

```
GET /users/42/delete    ← modifies state with a GET
GET /posts/publish/5    ← side effect in a safe method
```

**Fix:** GET must be safe. Use DELETE or PATCH.

```
DELETE /users/42
PATCH  /posts/5   body: { "status": "published" }
```

### ❌ Pitfall: POST for both create AND update

```
POST /users/42/update   ← this is an update, not a create
```

**Fix:** PATCH `/users/42` for updates. POST `/users` for creates.

### ❌ Pitfall: Not returning the created resource on POST

```js
// Backend returns 201 with empty body
// Frontend now has to GET /users/newId to see the result
```

**Fix:** Return the full created object in the POST response body. Saves an extra round-trip.

---

## K — Coding Challenge + Solution

### Challenge

You're building a `comments` feature. Write the full URL + method for each operation:

```
1. Get all comments for article 5
2. Get a single comment with id 88
3. Create a new comment on article 5
4. Edit only the text of comment 88
5. Delete comment 88
```

### Solution

```
1. GET    /articles/5/comments
2. GET    /comments/88
3. POST   /articles/5/comments       body: { "text": "Great post!" }
4. PATCH  /comments/88               body: { "text": "Updated text" }
5. DELETE /comments/88
```

---

---
