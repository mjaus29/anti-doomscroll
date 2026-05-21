# 3 — Path Params vs Query Params

---

## T — TL;DR

**Path parameters** identify _which_ resource. **Query parameters** modify _how_ you retrieve it. Misusing them makes APIs confusing and inconsistent.

---

## K — Key Concepts

### Path Parameters — Identity

Path params are **embedded in the URL path** and identify a specific resource or sub-resource.

```
/users/:id
/users/42              ← id = 42

/products/:productId/reviews/:reviewId
/products/99/reviews/7 ← productId = 99, reviewId = 7
```

**Use path params when:**

- You're identifying a specific, unique resource
- The value is required for the request to make sense
- Removing it would change what resource you're pointing to

### Query Parameters — Modification

Query params come **after `?`** and modify how the collection or resource is returned.

```
/users?role=admin
/products?category=shoes&sort=price&order=asc&page=2&limit=20
/articles?search=javascript&published=true
```

**Use query params when:**

- Filtering a collection
- Sorting results
- Searching
- Pagination
- The value is optional (the endpoint makes sense without it)

### Side-by-Side Comparison

```
Path param — required, identifies:
  GET /users/42              ← who: user 42
  GET /orders/ABC-001        ← which: order ABC-001

Query param — optional, modifies:
  GET /users?role=admin      ← filter: only admins
  GET /users?sort=name       ← sort: by name
  GET /users?page=2&limit=10 ← paginate: page 2, 10 per page
```

### In Code

```js
// Path param — specific user
fetch(`/api/users/${userId}`);

// Query params — filtered list
const params = new URLSearchParams({
  role: "admin",
  sort: "name",
  order: "asc",
  page: 2,
  limit: 10,
});
fetch(`/api/users?${params}`);
// → /api/users?role=admin&sort=name&order=asc&page=2&limit=10
```

> ✅ Always use `URLSearchParams` to build query strings — it handles encoding automatically.

---

## W — Why It Matters

- Mixing path and query params incorrectly produces inconsistent, confusing APIs.
- `URLSearchParams` is a native browser API — you should use it instead of manually building `?key=val&key=val` strings.
- Understanding the distinction helps you read API docs 10x faster.
- Backend frameworks (Express, Next.js) parse them differently — knowing which is which prevents bugs.

---

## I — Interview Q&A

### Q1: When do you use a path parameter vs a query parameter?

**A:** Path parameters identify a specific resource — the request doesn't make sense without them (e.g., `/users/42`). Query parameters are optional modifiers — filtering, sorting, pagination (e.g., `/users?role=admin`).

### Q2: Why use `URLSearchParams` instead of building query strings manually?

**A:** `URLSearchParams` handles URL encoding automatically. Manual string building breaks when values contain special characters like `&`, `=`, or spaces. For example, a search term like "rock & roll" would be incorrectly encoded without it.

### Q3: Can a path parameter be optional?

**A:** In practice, no. If a path segment is optional, it usually means you have two separate endpoints (`/users` and `/users/:id`) rather than one with an optional segment.

---

## C — Common Pitfalls + Fix

### ❌ Pitfall: Putting filters in the path

```
GET /users/active/admin     ← are these path params or filters?
```

**Fix:** Filters belong in query params.

```
GET /users?status=active&role=admin
```

### ❌ Pitfall: Building query strings by hand

```js
const url = `/api/users?role=${role}&page=${page}&search=${search}`;
// Breaks if search = "rock & roll" → becomes ?search=rock & roll
```

**Fix:**

```js
const params = new URLSearchParams({ role, page, search });
const url = `/api/users?${params}`;
// → /api/users?role=admin&page=1&search=rock+%26+roll ✅
```

### ❌ Pitfall: Using query params to identify a required resource

```
GET /users?id=42     ← uncommon, non-standard
```

**Fix:** Required resource identity = path param.

```
GET /users/42        ← standard REST
```

---

## K — Coding Challenge + Solution

### Challenge

Classify each URL segment as path param (P) or query param (Q), then write the corrected URL if it's wrong:

```
1. GET /products/electronics       ← browsing a category
2. GET /products/42                ← fetching specific product
3. GET /orders?userId=42           ← orders for a user
4. GET /search?q=laptop&limit=10   ← search with limit
5. GET /users/sort/name            ← sorted user list
```

### Solution

```
1. ❌ Wrong — "electronics" is a filter, not an ID
   Fix: GET /products?category=electronics   (Q)

2. ✅ Correct — 42 is the product ID  (P)
   GET /products/42

3. ⚠️ Partially correct — userId as query param is fine for filtering
   but if users own orders, better as: GET /users/42/orders
   Both are acceptable depending on API design.

4. ✅ Correct — q and limit are query params  (Q)
   GET /search?q=laptop&limit=10

5. ❌ Wrong — sort is a modifier, not a resource segment
   Fix: GET /users?sort=name   (Q)
```

---

---
