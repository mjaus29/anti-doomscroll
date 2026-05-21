# 2 — Resources, Endpoints & URL Anatomy

---

## T — TL;DR

In REST, everything is a **resource** (a noun). An **endpoint** is a URL that points to that resource. Understanding URL anatomy helps you read, write, and debug API calls instantly.

---

## K — Key Concepts

### Resources

A **resource** is any named concept your API exposes — users, products, orders, posts. Resources are **nouns**, never verbs.

```
✅ /users          ← resource: a collection of users
✅ /users/42       ← resource: a specific user
✅ /users/42/posts ← resource: posts belonging to user 42

❌ /getUser        ← verb — not RESTful
❌ /deletePost     ← verb — not RESTful
```

### Endpoints

An **endpoint** = HTTP method + URL path together.

```
GET    /users          → list all users
GET    /users/42       → get user with id 42
POST   /users          → create a new user
PUT    /users/42       → replace user 42
PATCH  /users/42       → update part of user 42
DELETE /users/42       → delete user 42
```

### URL Anatomy

```
https://api.example.com/v1/users/42?sort=asc&limit=10#section

└─────┘ └─────────────┘└──┘└─────┘└──┘└────────────┘└──────┘
scheme     host/domain  ver  path  ?   query string  fragment
```

| Part | Example | Purpose |
|---|---|---|
| **Scheme** | `https` | Protocol being used |
| **Host** | `api.example.com` | Server domain |
| **Path** | `/v1/users/42` | Resource being accessed |
| **Query String** | `?sort=asc&limit=10` | Filters, pagination, sorting |
| **Fragment** | `#section` | Client-side only, not sent to server |

### Path Parameters vs Query Parameters

```
/users/42          ← path param: identifies a specific resource
/users?role=admin  ← query param: filters a collection
```

```js
// Path param — specific resource
fetch('/api/users/42')

// Query param — filtered list
fetch('/api/users?role=admin&page=2')
```

---

## W — Why It Matters

- You read URLs every day in browser devtools — knowing anatomy = faster debugging.
- API docs use this structure everywhere. Recognizing patterns saves time.
- Path params vs query params is a common interview question.
- Building forms or search features always involves constructing query strings dynamically.

---

## I — Interview Q&A

### Q1: What is a resource in REST?

**A:** A resource is any entity the API exposes — users, products, orders. It's always represented as a noun in the URL, never a verb.

### Q2: What's the difference between a path parameter and a query parameter?

**A:** Path parameters identify a specific resource (e.g., `/users/42`). Query parameters filter or modify how a collection is returned (e.g., `/users?role=admin`). Path params are part of the URL structure; query params come after `?`.

### Q3: Is the fragment (`#`) sent to the server?

**A:** No. The fragment is handled entirely by the browser/client. The server never sees it.

---

## C — Common Pitfalls + Fix

### ❌ Pitfall: Using verbs in URLs

```
❌ POST /createUser
❌ GET  /deletePost/5
```

**Fix:** Use nouns. The HTTP method IS the verb.

```
✅ POST   /users
✅ DELETE /posts/5
```

### ❌ Pitfall: Nesting resources too deeply

```
❌ /users/42/orders/7/items/3/reviews
```

**Fix:** Keep nesting to 2 levels max. Beyond that, flatten or reference by ID.

```
✅ /reviews/3
✅ /items/3/reviews
```

### ❌ Pitfall: Confusing `?` query params with path params

```js
// These are NOT the same:
fetch('/users/42')       // path param → get user 42
fetch('/users?id=42')    // query param → filter users by id=42 (non-standard)
```

**Fix:** Use path params to identify. Use query params to filter/sort/paginate.

---

## K — Coding Challenge + Solution

### Challenge

Given this URL:

```
https://api.shop.io/v2/products/99?color=red&sort=price#details
```

Answer:
1. What is the scheme?
2. What is the host?
3. What resource is being accessed?
4. What is the path parameter value?
5. What are the query parameters?
6. Is `#details` sent to the server?

### Solution

```
1. https
2. api.shop.io
3. products (specifically product with id 99)
4. 99
5. color=red, sort=price
6. No — fragments are client-side only
```

---

---
