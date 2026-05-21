# 📅 Day 2 — REST Resource Design for Frontend Developers

> **Goal:** Learn how REST APIs are _designed_ — so you can read any API instantly, build your own correctly, and never argue with a backend dev again.
> **Format:** Each subtopic = 5–15 min. Do one. Stop. Come back.

---

## 📋 Day 2 Subtopic Overview

| #   | Subtopic                                                     | Time   |
| --- | ------------------------------------------------------------ | ------ |
| 1   | Resource Naming with Nouns & Collections vs Single Resources | 10 min |
| 2   | CRUD Mapping to HTTP Methods                                 | 10 min |
| 3   | Path Params vs Query Params                                  | 10 min |
| 4   | Nested Resources                                             | 10 min |
| 5   | Filtering, Sorting & Searching                               | 10 min |
| 6   | Pagination — From Day One                                    | 15 min |
| 7   | Consistent Response Envelopes & Error Object Structure       | 10 min |
| 8   | Validation Basics & Auth Headers                             | 10 min |
| 9   | Authorization Concepts                                       | 10 min |
| 10  | Versioning Strategies                                        | 10 min |
| 11  | Rate Limiting & CORS Awareness                               | 15 min |
| 12  | API Documentation                                            | 10 min |

---

---

# 1 — Resource Naming with Nouns & Collections vs Single Resources

---

## T — TL;DR

REST URLs are **nouns, not verbs**. Collections come before single resources. The shape of the URL alone should communicate what you're working with.

---

## K — Key Concepts

### Always Use Nouns

The HTTP method IS the verb. The URL should only describe the **thing** being acted on.

```
❌ Verb-based (not REST)        ✅ Noun-based (REST)
GET  /getUsers                  GET  /users
POST /createUser                POST /users
PUT  /updateUser/42             PUT  /users/42
DELETE /deleteUser/42           DELETE /users/42
POST /user/deactivate/42        POST /users/42/deactivations
```

### Plural Nouns for Collections

Use **plural nouns** for resource names — always.

```
✅ /users          (collection of users)
✅ /products       (collection of products)
✅ /orders         (collection of orders)

❌ /user
❌ /product
❌ /order
```

Why plural? Because `/users` makes sense for both "all users" and "a specific user from the users collection."

### Collections → Single Resources

The pattern is always: **collection first, then the specific item**.

```
/users          → the whole collection
/users/42       → one specific user from the collection

/products       → all products
/products/99    → product with id 99

/articles       → all articles
/articles/slug-title → specific article by slug
```

### Consistent Casing — Use Kebab-Case

```
✅ /blog-posts
✅ /user-profiles
✅ /order-items

❌ /blogPosts      (camelCase — not URL-friendly)
❌ /BlogPosts      (PascalCase)
❌ /blog_posts     (snake_case — acceptable but less common in URLs)
```

### Resource Identifiers

Identifiers in paths should be **unique and stable**:

```
/users/42           ← numeric ID (most common)
/users/mark-austin  ← slug (readable, SEO-friendly)
/users/uuid-here    ← UUID (globally unique, no enumeration risk)
```

---

## W — Why It Matters

- Clean resource naming is the first thing a senior dev checks when reviewing an API design.
- Consistent naming means any developer on the team can **predict** URLs without reading docs.
- Noun-based URLs are self-documenting — the URL tells you the resource, the method tells you the action.
- Plural naming is an industry standard — inconsistency confuses API consumers.

---

## I — Interview Q&A

### Q1: Why should REST URLs use nouns instead of verbs?

**A:** Because the HTTP method already IS the verb (GET, POST, DELETE). Adding verbs to the URL creates redundancy and breaks the uniform interface principle. `DELETE /users/42` is cleaner and more predictable than `POST /deleteUser/42`.

### Q2: Should resource names be singular or plural?

**A:** Plural. `/users` for a collection and `/users/42` for a specific user. This is consistent and widely adopted. Mixing singular and plural across endpoints creates confusion.

### Q3: What casing convention should URLs use?

**A:** Kebab-case (hyphen-separated lowercase). URLs are case-insensitive in practice and hyphens are URL-safe. Avoid camelCase or underscores in paths.

---

## C — Common Pitfalls + Fix

### ❌ Pitfall: Mixing verbs into URLs

```
POST /api/user/deactivate/42
```

**Fix:**

```
POST /api/users/42/deactivations
// or
PATCH /api/users/42  body: { "status": "inactive" }
```

### ❌ Pitfall: Inconsistent plural/singular naming

```
GET /users         ← plural
GET /product/5     ← singular
POST /order        ← singular
```

**Fix:** Pick plural, apply everywhere without exception.

### ❌ Pitfall: Exposing implementation details in names

```
❌ /api/tbl_users/42       ← database table name leaked
❌ /api/getUserFromDB      ← implementation detail
```

**Fix:** Name after the business concept, not the technical implementation.

---

## K — Coding Challenge + Solution

### Challenge

Rewrite these bad URLs into proper REST resource names:

```
1. POST /createNewBlogPost
2. GET  /getAllActiveUsers
3. DELETE /removeComment/5
4. PUT /updateProductPrice/99
5. GET /fetchOrdersByUser/42
```

### Solution

```
1. POST   /blog-posts
2. GET    /users?status=active
3. DELETE /comments/5
4. PUT    /products/99         body: { "price": 49.99 }  (or PATCH for partial)
5. GET    /users/42/orders
```

---

---

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

# 4 — Nested Resources

---

## T — TL;DR

Nested resources express **ownership and relationships** in the URL path. The rule: go one or two levels deep — beyond that, flatten it.

---

## K — Key Concepts

### What Are Nested Resources?

When one resource **belongs to** another, you can nest it in the URL:

```
/users/42/posts          ← posts owned by user 42
/users/42/posts/7        ← specific post owned by user 42
/articles/5/comments     ← comments on article 5
/orders/ABC/items        ← items in order ABC
```

### The Ownership Signal

```
/[parent-resource]/[parent-id]/[child-resource]

/users/42/posts          → "posts that belong to user 42"
/posts/7/comments        → "comments that belong to post 7"
/courses/3/lessons/9     → "lesson 9 within course 3"
```

### Nesting Rule: Max 2 Levels

```
✅ One level:
/users/42/posts

✅ Two levels (acceptable):
/users/42/posts/7

❌ Three or more (too deep):
/users/42/posts/7/comments/3/likes
```

When nesting gets too deep, **flatten it** — reference the child directly by its own ID:

```
❌ /users/42/posts/7/comments/3/likes
✅ /comments/3/likes           ← comment has a global ID, no need for full nesting
✅ /likes?commentId=3          ← or use query param
```

### When to Nest vs When to Reference Directly

| Scenario                                         | Recommendation                    |
| ------------------------------------------------ | --------------------------------- |
| Child ONLY exists in context of parent           | Nest: `/orders/5/items`           |
| Child has its own global identity                | Reference directly: `/comments/3` |
| You need the child collection filtered by parent | Either nested or query param      |

```
// Both are valid — choose consistency
GET /users/42/posts       ← nested (explicit ownership)
GET /posts?userId=42      ← query param (flexible, flat)
```

### In Code

```js
// Fetch all posts for user 42
fetch(`/api/users/${userId}/posts`);

// Fetch specific post for user 42
fetch(`/api/users/${userId}/posts/${postId}`);

// Create a comment on post 7
fetch(`/api/posts/7/comments`, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ text: "Great post!" }),
});
```

---

## W — Why It Matters

- Nested URLs self-document ownership relationships — critical for maintainable APIs.
- Deep nesting creates tightly coupled APIs that are hard to change without breaking clients.
- The flatten vs nest decision is a real backend design discussion — knowing the trade-offs makes you a stronger collaborator.
- Next.js App Router file-based routing mirrors this exact nesting pattern.

---

## I — Interview Q&A

### Q1: When should you nest a resource?

**A:** When the child resource primarily exists in the context of its parent and access without the parent context is rare or doesn't make sense. For example, `/orders/5/items` — order items don't make sense without the order context.

### Q2: How deep should nesting go?

**A:** Maximum 2 levels. Beyond that, flatten by referencing the child resource directly by its own ID. Deep nesting creates brittle, long URLs that are hard to read and maintain.

### Q3: What's the alternative to deeply nested URLs?

**A:** Use query parameters to filter a flat endpoint. `/posts?userId=42` achieves the same result as `/users/42/posts` and scales better for complex filtering scenarios.

---

## C — Common Pitfalls + Fix

### ❌ Pitfall: Nesting too deeply

```
GET /companies/1/departments/3/teams/7/members/42/tasks
```

**Fix:** Flatten. If tasks have global IDs, just use `/tasks/id` with filters:

```
GET /tasks?memberId=42
GET /members/42/tasks     ← max 1 level deep is fine
```

### ❌ Pitfall: Nesting resources that have strong independent identity

```
GET /users/42/comments/88   ← comment 88 has a global ID
```

**Fix:** Comments can stand alone:

```
GET /comments/88            ← direct access
GET /users/42/comments      ← filtered list is fine
```

### ❌ Pitfall: Inconsistent nesting across the API

```
GET /users/42/posts         ← nested
GET /comments?userId=42     ← flat
GET /orders/user/42         ← custom pattern
```

**Fix:** Pick one pattern per relationship and use it consistently throughout the API.

---

## K — Coding Challenge + Solution

### Challenge

Design the URL structure for a blog platform with:

- Users who write posts
- Posts that have comments
- Comments that can have likes
- Tags that can be applied to posts

Write the recommended URL for each operation:

```
1. Get all posts by user 5
2. Get comments on post 12
3. Add a comment to post 12
4. Get likes for comment 33
5. Get all posts tagged "javascript"
```

### Solution

```
1. GET  /users/5/posts
        or /posts?userId=5

2. GET  /posts/12/comments

3. POST /posts/12/comments
        body: { "text": "Nice!" }

4. GET  /comments/33/likes
        (comment has global ID — 1 level deep is fine)

5. GET  /posts?tag=javascript
        (tags are a filter, not a parent resource)
```

---

---

# 5 — Filtering, Sorting & Searching

---

## T — TL;DR

Filtering, sorting, and searching are all **query parameter operations** on a collection endpoint. Keep the URL clean and the parameters consistent.

---

## K — Key Concepts

### Filtering

Filter a collection by field values:

```
GET /products?category=shoes
GET /users?role=admin&status=active
GET /orders?status=pending&userId=42
```

Convention:

- Use the field name as the key
- Use `=` for equality
- Chain multiple filters with `&`

```js
const params = new URLSearchParams({
  category: "shoes",
  minPrice: 50,
  maxPrice: 200,
  inStock: true,
});
fetch(`/api/products?${params}`);
// → /api/products?category=shoes&minPrice=50&maxPrice=200&inStock=true
```

### Sorting

```
GET /products?sort=price              ← sort by price (default asc)
GET /products?sort=price&order=desc   ← sort by price descending
GET /products?sort=createdAt&order=asc
```

Common conventions:

```
?sort=field               → sort by field, ascending
?sort=field&order=desc    → sort descending
?sort=-price              → minus prefix = descending (some APIs)
?sortBy=price&sortDir=asc → verbose but explicit
```

> Pick ONE convention and stick to it across your entire API.

### Searching

Full-text or keyword search across fields:

```
GET /products?search=laptop
GET /articles?q=javascript+tips
GET /users?q=mark
```

```js
const searchProducts = (query) => {
  const params = new URLSearchParams({ q: query, limit: 10 });
  return fetch(`/api/products?${params}`).then((r) => r.json());
};
```

### Combining Them All

```
GET /products?category=electronics&minPrice=100&sort=price&order=asc&q=laptop&page=2&limit=20
```

```js
const params = new URLSearchParams({
  category: "electronics",
  minPrice: 100,
  sort: "price",
  order: "asc",
  q: "laptop",
  page: 2,
  limit: 20,
});
fetch(`/api/products?${params}`);
```

### Range Filters

```
GET /orders?createdAfter=2025-01-01&createdBefore=2025-12-31
GET /products?minPrice=10&maxPrice=100
GET /events?startDate=2025-06-01
```

---

## W — Why It Matters

- Every data table, product listing, or search feature you build hits a filtered/sorted endpoint.
- Consistent parameter naming across endpoints reduces the mental overhead for every developer consuming the API.
- Knowing the conventions lets you build frontend filter UIs that map directly to URL params — which also makes filters shareable/bookmarkable via the URL.

---

## I — Interview Q&A

### Q1: Where do filters, sorts, and searches belong in a REST URL?

**A:** Always in query parameters. They modify how a collection is returned without changing what resource is being accessed. Embedding them in the path would create infinite URL variations.

### Q2: How would you implement a shareable search/filter URL in a frontend?

**A:** Sync the filter state with URL query parameters using `URLSearchParams`. When the page loads, read the params and pre-populate the filters. When filters change, update the URL — this makes the state bookmarkable and shareable without any backend storage.

### Q3: What's the difference between filtering and searching?

**A:** Filtering matches exact field values (`?status=active`). Searching performs a broader lookup, often full-text, across one or more fields (`?q=laptop`). Filtering is structured; searching is fuzzy.

---

## C — Common Pitfalls + Fix

### ❌ Pitfall: Encoding filters in the path

```
GET /products/electronics/price/asc   ← path params used as filters
```

**Fix:**

```
GET /products?category=electronics&sort=price&order=asc
```

### ❌ Pitfall: Inconsistent sort parameter naming

```
/users?sortBy=name        ← endpoint A
/products?sort_field=price ← endpoint B
/orders?orderBy=date       ← endpoint C
```

**Fix:** Pick one: `sort` + `order`. Document it. Apply everywhere.

### ❌ Pitfall: Not URL-encoding search terms

```js
fetch(`/api/search?q=rock & roll`); // ❌ breaks the URL
```

**Fix:** Use `URLSearchParams` — it handles encoding:

```js
const params = new URLSearchParams({ q: "rock & roll" });
fetch(`/api/search?${params}`); // → ?q=rock+%26+roll ✅
```

---

## K — Coding Challenge + Solution

### Challenge

Build a `fetchUsers` function that accepts a config object and constructs the correct API URL:

```js
fetchUsers({
  role: "admin",
  status: "active",
  sort: "name",
  order: "asc",
  search: "mark",
});
// Should call: /api/users?role=admin&status=active&sort=name&order=asc&q=mark
```

### Solution

```js
async function fetchUsers({ role, status, sort, order, search } = {}) {
  const params = new URLSearchParams();

  if (role) params.set("role", role);
  if (status) params.set("status", status);
  if (sort) params.set("sort", sort);
  if (order) params.set("order", order);
  if (search) params.set("q", search);

  const res = await fetch(`/api/users?${params}`);
  if (!res.ok) throw new Error(`Error: ${res.status}`);
  return res.json();
}
```

---

---

# 6 — Pagination — From Day One

---

## T — TL;DR

**Never return unlimited data.** Add pagination to every list endpoint from the start — retrofitting it later breaks clients. Know the three patterns: **offset**, **cursor**, and **page-based**.

---

## K — Key Concepts

### Why Pagination Exists

```
GET /users        ← what if there are 10,000,000 users?
```

Without pagination: slow response, massive payload, server overload, client crash.

**Rule: Every collection endpoint must be paginated.**

### Pattern 1: Offset/Limit Pagination (Most Common)

```
GET /users?limit=20&offset=0    ← first 20
GET /users?limit=20&offset=20   ← next 20
GET /users?limit=20&offset=40   ← next 20
```

```js
// Frontend: fetching page N
const getPage = (page, limit = 20) => {
  const offset = (page - 1) * limit;
  return fetch(`/api/users?limit=${limit}&offset=${offset}`).then((r) =>
    r.json()
  );
};
```

**Pros:** Simple, supports random access (jump to any page).
**Cons:** Inconsistent if data changes between requests (items inserted = duplicates/skips).

### Pattern 2: Page Number Pagination

```
GET /products?page=1&perPage=20
GET /products?page=2&perPage=20
GET /products?page=3&perPage=20
```

Semantically cleaner than offset. Internally the server does `offset = (page - 1) * perPage`.

```js
const getPage = (page) =>
  fetch(`/api/products?page=${page}&perPage=20`).then((r) => r.json());
```

### Pattern 3: Cursor-Based Pagination (For Real-Time Data)

Uses an opaque token (cursor) pointing to a position in the dataset.

```
GET /posts?limit=20                         ← first page (no cursor)
← returns: { data: [...], nextCursor: "xyz123" }

GET /posts?limit=20&cursor=xyz123           ← next page
← returns: { data: [...], nextCursor: "abc456" }
```

**Pros:** Stable for real-time feeds (no duplicates/skips when data changes).
**Cons:** Cannot jump to arbitrary pages.

**Use cursor pagination for:** social feeds, activity logs, chat history, infinite scroll.

### Link-Based Pagination Awareness

Some APIs follow the **RFC 5988** `Link` header standard:

```http
HTTP/1.1 200 OK
Link: <https://api.example.com/users?page=3>; rel="next",
      <https://api.example.com/users?page=1>; rel="prev",
      <https://api.example.com/users?page=10>; rel="last",
      <https://api.example.com/users?page=1>; rel="first"
```

The GitHub API uses this pattern. Instead of building next/prev URLs yourself, you read them from the response header.

```js
const res = await fetch("/api/users?page=2");
const linkHeader = res.headers.get("Link");
// Parse to extract rel="next" URL
```

### Standard Pagination Response Envelope

```json
{
  "data": [ ...items... ],
  "pagination": {
    "total": 243,
    "page": 2,
    "perPage": 20,
    "totalPages": 13,
    "hasNextPage": true,
    "hasPrevPage": true
  }
}
```

---

## W — Why It Matters

- Adding pagination later in a project is a **breaking change** — existing clients expect unbounded responses.
- Infinite scroll, "Load More" buttons, and numbered paging are all pagination UI patterns — you need to know which API pattern to request.
- Cursor pagination is expected knowledge for senior frontend interviews (Facebook, Twitter-style feeds use it).
- The `Link` header is used by GitHub's API — you'll encounter it when building GitHub integrations.

---

## I — Interview Q&A

### Q1: What's the difference between offset and cursor pagination?

**A:** Offset pagination uses a numeric skip (`?offset=40`). It's simple but suffers from drift when data is inserted or deleted between requests. Cursor pagination uses an opaque pointer to a position in the data. It's stable for real-time feeds but doesn't support random page access.

### Q2: When would you use cursor vs offset pagination?

**A:** Cursor for real-time, constantly-updating data (social feeds, chat, notifications) where stability matters. Offset/page-number for stable datasets where random page access (jump to page 7) is needed — like admin tables or search results.

### Q3: Why should you add pagination from day one?

**A:** Removing pagination from an endpoint later is a breaking change. Clients that already consume the unbounded list will break. It's far easier and cheaper to add pagination upfront than retrofit it.

---

## C — Common Pitfalls + Fix

### ❌ Pitfall: Returning all records with no limit

```
GET /logs    ← returns 5 million rows
```

**Fix:** Always default to a limit:

```
GET /logs?limit=50     ← explicit
GET /logs              ← server defaults to limit=50 even if not specified
```

### ❌ Pitfall: Trusting total count for cursor-based APIs

```js
// Cursor APIs often don't provide total count
const totalPages = Math.ceil(total / perPage); // ← may not be available
```

**Fix:** For cursor pagination, use `hasNextPage: true/false` instead of computing total pages.

### ❌ Pitfall: Off-by-one in offset calculation

```js
// User wants page 1, but page 1 with offset=1 skips the first item
const offset = page * limit; // ❌ page 1 → offset 20, skips first 20!
const offset = (page - 1) * limit; // ✅ page 1 → offset 0
```

---

## K — Coding Challenge + Solution

### Challenge

Build a `fetchPage` function that supports both offset and cursor pagination:

```js
// Offset mode:
fetchPage({ type: "offset", page: 3, limit: 10 });
// → GET /api/posts?limit=10&offset=20

// Cursor mode:
fetchPage({ type: "cursor", cursor: "abc123", limit: 10 });
// → GET /api/posts?limit=10&cursor=abc123
```

### Solution

```js
async function fetchPage({ type, page, cursor, limit = 20 }) {
  const params = new URLSearchParams({ limit });

  if (type === "offset") {
    params.set("offset", (page - 1) * limit);
  } else if (type === "cursor" && cursor) {
    params.set("cursor", cursor);
  }

  const res = await fetch(`/api/posts?${params}`);
  if (!res.ok) throw new Error(`Error: ${res.status}`);
  return res.json();
}
```

---

---

# 7 — Consistent Response Envelopes & Error Object Structure

---

## T — TL;DR

A **response envelope** is a consistent wrapper around every API response. A **structured error object** is how your API communicates failure. Consistency here saves hours of debugging.

---

## K — Key Concepts

### What Is a Response Envelope?

Instead of returning raw data or raw errors, wrap everything in a consistent structure:

```json
{
  "data": { ... },
  "meta": { ... },
  "error": null
}
```

This gives every response the same shape — your frontend code always knows where to look.

### Success Envelope

```json
// Single resource
{
  "data": {
    "id": 42,
    "name": "Mark",
    "email": "mark@example.com"
  }
}

// Collection with pagination meta
{
  "data": [
    { "id": 1, "name": "Alice" },
    { "id": 2, "name": "Bob" }
  ],
  "meta": {
    "total": 243,
    "page": 1,
    "perPage": 20,
    "totalPages": 13
  }
}
```

### Error Envelope — What a Good Error Object Looks Like

```json
{
  "error": {
    "status": 422,
    "code": "VALIDATION_ERROR",
    "message": "Request validation failed",
    "details": [
      {
        "field": "email",
        "message": "Must be a valid email address"
      },
      {
        "field": "password",
        "message": "Must be at least 8 characters"
      }
    ],
    "requestId": "req-abc-123",
    "timestamp": "2026-05-19T10:30:00Z"
  }
}
```

| Field       | Purpose                                          |
| ----------- | ------------------------------------------------ |
| `status`    | HTTP status code (matches response status)       |
| `code`      | Machine-readable error code (for frontend logic) |
| `message`   | Human-readable summary                           |
| `details`   | Field-level validation errors                    |
| `requestId` | Trace ID for debugging in logs                   |
| `timestamp` | When the error occurred                          |

### Why `code` Matters

HTTP status codes are too coarse for app logic:

```js
// Without error code — you can't distinguish why it failed
if (res.status === 400) {
  /* which 400? */
}

// With error code — you can handle specifically
if (error.code === "EMAIL_ALREADY_EXISTS") {
  showMessage("That email is already registered. Try logging in.");
}
if (error.code === "WEAK_PASSWORD") {
  highlightPasswordField();
}
```

### In Code — Handling Envelopes

```js
async function apiCall(url, options = {}) {
  const res = await fetch(url, options);
  const body = res.status !== 204 ? await res.json() : null;

  if (!res.ok) {
    const err = new Error(body?.error?.message || "Unknown error");
    err.code = body?.error?.code;
    err.details = body?.error?.details;
    err.status = res.status;
    throw err;
  }

  return body?.data ?? body;
}
```

---

## W — Why It Matters

- Inconsistent response shapes force frontend devs to write defensive code for every single endpoint.
- Structured error codes let you show **contextual UI messages** instead of generic "Something went wrong."
- Field-level validation errors map directly to form field highlighting — a critical UX feature.
- `requestId` is invaluable for debugging production issues with your backend team.

---

## I — Interview Q&A

### Q1: What is a response envelope and why use one?

**A:** A response envelope is a consistent wrapper around all API responses. It ensures `data`, `meta`, and `error` always live in predictable locations — so client code doesn't need different parsing logic per endpoint.

### Q2: What should a well-structured API error response contain?

**A:** At minimum: an HTTP status code, a machine-readable error code, a human-readable message, and field-level details for validation errors. A request ID for tracing is also best practice.

### Q3: Why include a machine-readable `code` field on errors?

**A:** HTTP status codes are too broad. A `code` like `EMAIL_ALREADY_EXISTS` or `INSUFFICIENT_CREDITS` allows frontend code to handle specific scenarios with appropriate UI feedback, rather than guessing based on status code alone.

---

## C — Common Pitfalls + Fix

### ❌ Pitfall: Inconsistent response shapes across endpoints

```json
// Endpoint A
{ "users": [...] }

// Endpoint B
{ "result": { "items": [...] } }

// Endpoint C
[...]   ← bare array
```

**Fix:** Always wrap in `{ "data": ... }`. One shape everywhere.

### ❌ Pitfall: Returning HTML error pages instead of JSON errors

```
HTTP 500
Content-Type: text/html
<html><body>Internal Server Error</body></html>
```

**Fix:** API endpoints must always return `Content-Type: application/json` even for errors. Set this in your error handling middleware.

### ❌ Pitfall: Swallowing field-level errors into a generic message

```json
{ "error": "Validation failed" }
```

**Fix:** Return per-field details so the frontend can highlight the specific broken field:

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "details": [{ "field": "email", "message": "Invalid format" }]
  }
}
```

---

## K — Coding Challenge + Solution

### Challenge

Write a function `handleApiResponse` that:

1. Returns `data` on success
2. Throws a structured error with `code`, `message`, and `details` on failure
3. Handles 204 (no body) correctly

```js
const user = await handleApiResponse(fetch("/api/users/42"));
```

### Solution

```js
async function handleApiResponse(fetchPromise) {
  const res = await fetchPromise;

  // 204 No Content — success with no body
  if (res.status === 204) return null;

  const body = await res.json();

  if (!res.ok) {
    const error = new Error(body?.error?.message || `HTTP Error ${res.status}`);
    error.status = res.status;
    error.code = body?.error?.code || "UNKNOWN_ERROR";
    error.details = body?.error?.details || [];
    throw error;
  }

  return body?.data ?? body;
}
```

---

---

# 8 — Validation Basics & Auth Headers

---

## T — TL;DR

**Validation** ensures incoming data is correct before processing. **Auth headers** carry proof of identity with every request. Both are non-negotiable in production APIs.

---

## K — Key Concepts

### Validation — Where It Happens

```
[Client-side validation]     → fast feedback, but never trust it alone
        ↓
[Server-side validation]     → authoritative, always required
        ↓
[Database constraints]       → last line of defense
```

### What to Validate on the Server

```
- Required fields: field must exist and not be empty
- Type: must be a string / number / boolean / array
- Format: email regex, URL format, ISO date format
- Length: min/max length for strings
- Range: min/max for numbers
- Uniqueness: email/username not already taken
- Enum: value must be one of allowed options
```

### Validation Error Response

```json
HTTP 422 Unprocessable Entity
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Validation failed",
    "details": [
      { "field": "email",    "message": "Must be a valid email address" },
      { "field": "password", "message": "Must be at least 8 characters" },
      { "field": "age",      "message": "Must be between 18 and 120" }
    ]
  }
}
```

### Consuming Validation Errors on the Frontend

```js
try {
  const user = await createUser(formData);
} catch (err) {
  if (err.code === "VALIDATION_ERROR") {
    // Map field errors to form state
    const fieldErrors = {};
    err.details.forEach(({ field, message }) => {
      fieldErrors[field] = message;
    });
    setErrors(fieldErrors); // { email: "Must be valid", password: "Too short" }
  }
}
```

### Auth Headers

The `Authorization` header carries credentials with every request:

```http
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
Authorization: ApiKey sk_live_abc123
Authorization: Basic dXNlcjpwYXNzd29yZA==
```

| Scheme           | Use Case                                 |
| ---------------- | ---------------------------------------- |
| `Bearer <token>` | JWT auth (most common in SPAs)           |
| `ApiKey <key>`   | Service-to-service or developer API keys |
| `Basic <base64>` | Username:password (only over HTTPS)      |

### Using Bearer Tokens in Fetch

```js
const authFetch = (url, options = {}) => {
  const token = localStorage.getItem("token"); // or from a secure store
  return fetch(url, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
      ...options.headers,
    },
  });
};

// Usage
authFetch("/api/profile").then((r) => r.json());
```

> ⚠️ Storing JWTs in `localStorage` is convenient but exposes them to XSS attacks. Prefer `HttpOnly` cookies for sensitive apps.

---

## W — Why It Matters

- Never trusting client-side validation alone is a fundamental security principle — users can bypass browser forms trivially.
- Structured validation errors are what separate "junior" API error handling from production-quality UX.
- The `Authorization` header is on every authenticated request you'll ever make — you need to know its structure cold.
- Understanding token storage trade-offs (localStorage vs HttpOnly cookie) is a standard security interview topic.

---

## I — Interview Q&A

### Q1: Should you rely on client-side validation alone?

**A:** Never. Client-side validation is for UX feedback — it's fast and immediate. But it can be bypassed with browser devtools, Postman, or curl. Server-side validation is always required as the source of truth.

### Q2: What status code should validation errors return?

**A:** `422 Unprocessable Entity` — the request was syntactically correct (not a 400) but the business rules weren't satisfied. Some APIs use `400 Bad Request` — either is acceptable, but 422 is more precise.

### Q3: What is a Bearer token?

**A:** A Bearer token is an auth scheme where possessing the token grants access — like a physical key. It's sent in the `Authorization` header as `Bearer <token>`. JWTs are the most common type of bearer token in web apps.

---

## C — Common Pitfalls + Fix

### ❌ Pitfall: Trusting frontend validation and skipping server validation

```
// Frontend checks email format
// Backend stores whatever it receives
// → malformed data in database
```

**Fix:** Always validate on the server. Client-side validation is a UX enhancement, never a security control.

### ❌ Pitfall: Returning a generic error for all validation failures

```json
{ "error": "Invalid input" }
```

**Fix:** Return per-field errors so the UI can highlight exactly what failed.

### ❌ Pitfall: Exposing the token in the URL

```
GET /api/profile?token=eyJhbG...   ← token in URL appears in server logs, browser history
```

**Fix:** Always put the token in the `Authorization` header, never the URL.

---

## K — Coding Challenge + Solution

### Challenge

Given this error response from the server, write the frontend code to map errors to a form state object:

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "details": [
      { "field": "username", "message": "Username is already taken" },
      { "field": "email", "message": "Must be a valid email" },
      { "field": "password", "message": "Must be at least 8 characters" }
    ]
  }
}
```

### Solution

```js
async function submitRegistration(formData) {
  try {
    const res = await authFetch("/api/register", {
      method: "POST",
      body: JSON.stringify(formData),
    });
    if (!res.ok) {
      const body = await res.json();
      const error = new Error("Validation failed");
      error.code = body.error.code;
      error.details = body.error.details;
      throw error;
    }
    return res.json();
  } catch (err) {
    if (err.code === "VALIDATION_ERROR") {
      // Map to { username: "...", email: "...", password: "..." }
      return {
        fieldErrors: Object.fromEntries(
          err.details.map(({ field, message }) => [field, message])
        ),
      };
    }
    throw err;
  }
}

// Result:
// {
//   fieldErrors: {
//     username: "Username is already taken",
//     email: "Must be a valid email",
//     password: "Must be at least 8 characters"
//   }
// }
```

---

---

# 9 — Authorization Concepts

---

## T — TL;DR

**Authentication** = proving who you are. **Authorization** = determining what you're allowed to do. They're different problems with different solutions — confusing them causes security bugs.

---

## K — Key Concepts

### Authentication vs Authorization

```
Authentication:  "Are you who you say you are?"
                 → Login, JWT verification, session validation

Authorization:   "Are you allowed to do this?"
                 → Role checks, ownership checks, permission flags
```

```
User logs in             → Authentication (verified: you are Mark, id=42)
User tries to delete post #5  → Authorization (allowed? is post #5 owned by Mark?)
```

### Common Authorization Patterns

#### 1. Role-Based Access Control (RBAC)

Users have roles. Roles have permissions.

```
Roles: user, admin, moderator
Permissions:
  user      → read posts, create own posts, delete own posts
  moderator → + delete any post
  admin     → + manage users, access analytics
```

```json
// JWT payload contains role
{
  "sub": "42",
  "name": "Mark",
  "role": "admin",
  "iat": 1716000000
}
```

```js
// Server checks role before processing
if (user.role !== "admin") {
  return res
    .status(403)
    .json({ error: { code: "FORBIDDEN", message: "Admin only" } });
}
```

#### 2. Ownership-Based Authorization

User can only access their own resources:

```js
// Server checks: does this resource belong to the requesting user?
const post = await db.posts.findById(req.params.id);

if (post.authorId !== req.user.id) {
  return res.status(403).json({ error: { code: "FORBIDDEN" } });
}
```

#### 3. Scopes (OAuth)

Common in third-party API access (GitHub, Google):

```
read:user          → can read user profile
write:posts        → can create/update posts
admin:org          → can manage organization
```

```
Authorization: Bearer <token-with-scopes>
```

### Frontend Authorization — What You Control

```js
// Show/hide UI elements based on role
// (NEVER a security control — always enforce on the server)
const isAdmin = user.role === "admin";

return (
  <div>
    <PostList />
    {isAdmin && <AdminPanel />} {/* UI hint only */}
  </div>
);
```

> ⚠️ **Frontend authorization is UX only.** A user can always bypass frontend checks with devtools. The server must enforce ALL authorization rules.

### HTTP Response Codes for Auth

```
401 Unauthorized  → Not authenticated (no/invalid token) → redirect to login
403 Forbidden     → Authenticated but not authorized → show "access denied"
```

---

## W — Why It Matters

- Auth bugs are among the most critical security vulnerabilities — OWASP's top 10 consistently includes "Broken Access Control."
- Understanding 401 vs 403 prevents incorrect error handling (redirecting a logged-in user to the login page on a 403).
- RBAC knowledge is expected in any full-stack or senior frontend role.
- Knowing that frontend auth is UX only prevents the #1 authorization mistake junior devs make.

---

## I — Interview Q&A

### Q1: What's the difference between authentication and authorization?

**A:** Authentication verifies identity — "who are you?" (login, token validation). Authorization determines permissions — "what can you do?" (role checks, ownership verification). You can't do authorization without authentication first.

### Q2: Why can't you rely on frontend checks for authorization?

**A:** Frontend code is fully visible and controllable by the user. They can remove your `{isAdmin && ...}` check in devtools or call the API directly. Authorization must always be enforced server-side.

### Q3: What's the difference between a 401 and 403 response?

**A:** 401 means the user is not authenticated — they need to log in. 403 means they ARE authenticated but lack permission — showing a login page would be wrong. Show an "Access Denied" message instead.

---

## C — Common Pitfalls + Fix

### ❌ Pitfall: Treating frontend role checks as security

```jsx
{
  user.role === "admin" && <DeleteButton onClick={deleteAllUsers} />;
}
// User removes this check in devtools → calls deleteAllUsers → API has no server-side check
```

**Fix:** ALWAYS enforce roles on the server. Frontend checks are for UX only.

### ❌ Pitfall: Redirecting to login on 403

```js
if (res.status === 403) router.push("/login"); // ❌ user IS logged in
```

**Fix:**

```js
if (res.status === 401) router.push("/login"); // ✅ not authenticated
if (res.status === 403) showError("Access denied"); // ✅ authenticated, no permission
```

### ❌ Pitfall: Over-exposing data in JWT payload

```json
{
  "sub": "42",
  "creditCardNumber": "4111...",  ← never put sensitive data in JWT
  "passwordHash": "..."
}
```

**Fix:** JWTs are base64-encoded, not encrypted (by default). Only put non-sensitive identity data (id, role, email) in the payload.

---

## K — Coding Challenge + Solution

### Challenge

Given a `currentUser` object and a `post` object, write an `canEditPost` function that returns true only if:

- The user is an admin, OR
- The user is a moderator AND the post is not locked, OR
- The user is the post author AND the post is not locked

```js
canEditPost(
  { id: 42, role: "moderator" },
  { id: 5, authorId: 10, locked: false }
);
// → true (moderator, post not locked)
```

### Solution

```js
function canEditPost(user, post) {
  if (user.role === "admin") return true;
  if (post.locked) return false;
  if (user.role === "moderator") return true;
  if (user.id === post.authorId) return true;
  return false;
}

// Tests
console.log(canEditPost({ id: 1, role: "admin" }, { locked: true })); // true (admin ignores lock)
console.log(canEditPost({ id: 2, role: "moderator" }, { locked: false })); // true
console.log(canEditPost({ id: 2, role: "moderator" }, { locked: true })); // false
console.log(
  canEditPost({ id: 42, role: "user" }, { authorId: 42, locked: false })
); // true (author)
console.log(
  canEditPost({ id: 42, role: "user" }, { authorId: 99, locked: false })
); // false
```

---

---

# 10 — Versioning Strategies

---

## T — TL;DR

API versioning lets you **evolve your API without breaking existing clients**. There are three main strategies — URI, header, and query param — and URI versioning is the most widely adopted.

---

## K — Key Concepts

### Why Versioning Matters

```
Client builds against /api/users → returns { name: "Mark" }

You change the API → { firstName: "Mark", lastName: "Austin" }

Unversioned → every existing client breaks simultaneously
Versioned   → old clients keep using /v1/users, new clients use /v2/users
```

### Strategy 1: URI Versioning (Most Common)

```
https://api.example.com/v1/users
https://api.example.com/v2/users
```

```
✅ Pros:
- Instantly visible in URLs, logs, and browser DevTools
- Easy to test in a browser
- Most widely adopted (Twitter, GitHub, Stripe, Twilio)

❌ Cons:
- "Unclean" URLs — version is not a resource
- Requires routing duplication
```

### Strategy 2: Header Versioning

```http
GET /users
Accept-Version: 2
```

or

```http
GET /users
Api-Version: 2026-05-19
```

Stripe uses date-based API versioning via header:

```http
Stripe-Version: 2023-10-16
```

```
✅ Pros:
- Clean URLs
- Version is metadata, not part of the resource path

❌ Cons:
- Invisible in browser URLs
- Harder to test without tooling (can't just type in browser)
- Less discoverable
```

### Strategy 3: Query Param Versioning

```
GET /users?version=2
GET /users?api-version=2
```

```
✅ Pros:
- Visible in URL
- Easy to add to existing endpoints

❌ Cons:
- Mixes versioning with resource filtering
- Breaks caching (version is a cache-busting param)
- Least common
```

### What Counts as a Breaking Change?

```
Breaking (requires new version):
❌ Removing a field from a response
❌ Renaming a field
❌ Changing a field's data type
❌ Changing required → optional behavior
❌ Removing an endpoint
❌ Changing error codes

Non-breaking (safe to deploy without versioning):
✅ Adding a new optional field to a response
✅ Adding a new endpoint
✅ Adding a new optional request parameter
```

### Version Sunset Policy

```
v1 released → v2 released → v1 deprecated (notice sent) → v1 sunset (removed)
```

```http
// Deprecation warning in response header
Deprecation: true
Sunset: Mon, 01 Jan 2027 00:00:00 GMT
Link: <https://api.example.com/v2/users>; rel="successor-version"
```

---

## W — Why It Matters

- You will consume versioned APIs and you need to know which version to use and where to find it.
- When building APIs (Next.js route handlers), versioning from day one prevents painful migrations.
- Breaking changes without versioning have caused real outages for major companies.
- Knowing the three strategies and their trade-offs is a standard system design interview question.

---

## I — Interview Q&A

### Q1: What are the three main API versioning strategies?

**A:** URI versioning (`/v1/users`), header versioning (`Api-Version: 2`), and query param versioning (`?version=2`). URI versioning is the most common due to its visibility and ease of use.

### Q2: What counts as a breaking change?

**A:** Removing or renaming fields, changing data types, removing endpoints, or changing required field behavior. Adding new optional fields or endpoints is non-breaking.

### Q3: What is API sunset?

**A:** Sunset is the date after which a deprecated API version will be removed. It's typically communicated via a `Sunset` response header and advance notice to API consumers, giving them time to migrate.

---

## C — Common Pitfalls + Fix

### ❌ Pitfall: Not versioning at all

```
GET /api/users   ← no version → every change risks breaking clients
```

**Fix:** Start with `/api/v1/` from day one — even if you never need v2, it's zero cost upfront.

### ❌ Pitfall: Treating every change as a new version

```
v1 → v2: added new optional field (not a breaking change!)
```

**Fix:** Only increment the version for **breaking changes**. Additive changes (new optional fields, new endpoints) don't require a new version.

### ❌ Pitfall: Removing old versions too quickly

```
v1 deprecated → removed after 2 weeks → all clients using v1 break
```

**Fix:** Give clients at least 3–6 months notice before sunsetting a version. Communicate via headers, email, and changelog.

---

## K — Coding Challenge + Solution

### Challenge

Classify each change as **breaking (B)** or **non-breaking (NB)**:

```
1. Rename response field: { "name": "Mark" } → { "fullName": "Mark" }
2. Add new optional response field: { "id": 1 } → { "id": 1, "createdAt": "..." }
3. Change field type: { "age": "25" } → { "age": 25 }  (string → number)
4. Add a new endpoint: POST /api/v1/subscriptions
5. Remove an endpoint: DELETE /api/v1/legacy-export
6. Make a previously required request field optional
7. Add a new required request field to an existing endpoint
```

### Solution

```
1. B  — renaming a field breaks clients reading "name"
2. NB — adding optional fields is safe; existing clients ignore unknown fields
3. B  — type change breaks clients treating age as a string
4. NB — new endpoints don't affect existing clients
5. B  — removing an endpoint breaks clients calling it
6. NB — loosening a constraint is backward compatible
7. B  — existing clients not sending the new required field will now get errors
```

---

---

# 11 — Rate Limiting & CORS Awareness

---

## T — TL;DR

**Rate limiting** prevents API abuse by capping how many requests a client can make. **CORS** is a browser security mechanism that controls which frontend origins can call which APIs. Both cause confusing errors if you don't understand them.

---

## K — Key Concepts

### Rate Limiting

Rate limiting caps requests per time window:

```
100 requests per minute per IP
1000 requests per day per API key
10 requests per second per user
```

#### Rate Limit Response Headers

```http
HTTP/1.1 429 Too Many Requests
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 0
X-RateLimit-Reset: 1716123600
Retry-After: 60
```

| Header                  | Meaning                          |
| ----------------------- | -------------------------------- |
| `X-RateLimit-Limit`     | Max requests allowed per window  |
| `X-RateLimit-Remaining` | Requests left in current window  |
| `X-RateLimit-Reset`     | Unix timestamp when limit resets |
| `Retry-After`           | Seconds to wait before retrying  |

#### Handling 429 on the Frontend

```js
async function apiFetch(url, options, retries = 3) {
  const res = await fetch(url, options);

  if (res.status === 429 && retries > 0) {
    const retryAfter = parseInt(res.headers.get("Retry-After") || "60");
    console.warn(`Rate limited. Retrying in ${retryAfter}s...`);
    await new Promise((resolve) => setTimeout(resolve, retryAfter * 1000));
    return apiFetch(url, options, retries - 1); // retry
  }

  return res;
}
```

### CORS — Cross-Origin Resource Sharing

#### The Same-Origin Policy

Browsers block JS from making requests to a different origin than the page:

```
Origin = protocol + domain + port

https://myapp.com               ← your frontend
https://api.myapp.com           ← DIFFERENT origin (different subdomain) ← CORS required
https://api.other.com           ← DIFFERENT origin ← CORS required
http://myapp.com                ← DIFFERENT origin (different protocol) ← CORS required
https://myapp.com:3001          ← DIFFERENT origin (different port) ← CORS required
```

#### How CORS Works

```
1. Browser sends request with:
   Origin: https://myapp.com

2. Server must respond with:
   Access-Control-Allow-Origin: https://myapp.com
   (or * for public APIs)

3. If header is missing → browser BLOCKS the response (request DID go through to server)
```

> ⚠️ **CORS errors are browser-enforced, not server errors.** The request reaches the server — the browser just refuses to give your JS the response.

#### Preflight Requests

For non-simple requests (POST with JSON, custom headers), the browser sends a preflight `OPTIONS` request first:

```http
OPTIONS /api/users HTTP/1.1
Origin: https://myapp.com
Access-Control-Request-Method: POST
Access-Control-Request-Headers: Content-Type, Authorization
```

Server must respond:

```http
HTTP/1.1 204 No Content
Access-Control-Allow-Origin: https://myapp.com
Access-Control-Allow-Methods: GET, POST, PUT, PATCH, DELETE
Access-Control-Allow-Headers: Content-Type, Authorization
Access-Control-Max-Age: 86400
```

#### Common CORS Headers

| Header                             | Direction | Meaning                       |
| ---------------------------------- | --------- | ----------------------------- |
| `Access-Control-Allow-Origin`      | Response  | Which origins are allowed     |
| `Access-Control-Allow-Methods`     | Response  | Which methods are allowed     |
| `Access-Control-Allow-Headers`     | Response  | Which headers are allowed     |
| `Access-Control-Allow-Credentials` | Response  | Allow cookies/auth            |
| `Access-Control-Max-Age`           | Response  | Cache preflight for N seconds |

#### The Frontend Fix for CORS Errors

```
CORS errors are ALWAYS a server configuration issue.
You cannot fix CORS from the frontend in production.
```

In development, you can proxy:

```js
// next.config.js
module.exports = {
  async rewrites() {
    return [
      { source: "/api/:path*", destination: "http://localhost:3001/:path*" },
    ];
  },
};
// Now /api/users proxies to localhost:3001/users — same origin, no CORS
```

---

## W — Why It Matters

- You WILL hit rate limits when building apps that call external APIs (GitHub, OpenAI, Stripe).
- CORS errors are one of the most common and confusing errors for new frontend developers — understanding the mechanism makes debugging instant.
- Knowing that CORS is server-side lets you correctly escalate to the backend team instead of spinning on the frontend.
- Rate limit headers let you build respectful clients that back off instead of hammering and getting banned.

---

## I — Interview Q&A

### Q1: What is CORS and why does it exist?

**A:** CORS (Cross-Origin Resource Sharing) is a browser security mechanism that restricts JS from making requests to origins different from the page's origin. It exists to prevent malicious sites from making requests to other services on behalf of a logged-in user (CSRF protection). Servers opt into cross-origin access by sending `Access-Control-Allow-Origin` headers.

### Q2: Can you fix a CORS error from the frontend?

**A:** No. CORS is enforced by the browser based on server response headers. The fix is always on the server — adding the correct `Access-Control-Allow-Origin` header. In development, a proxy can work around it.

### Q3: What is a preflight request?

**A:** An automatic `OPTIONS` request the browser sends before non-simple requests (like POST with JSON or with custom headers). It checks if the server permits the actual request. If the server doesn't respond correctly to the preflight, the browser blocks the real request.

---

## C — Common Pitfalls + Fix

### ❌ Pitfall: Thinking CORS means the request was blocked

```
"I'm getting CORS error — the server rejected my request"
```

**Fix:** The request REACHED the server. CORS means the browser blocked your JS from reading the response. Check the server's response headers, not the request.

### ❌ Pitfall: Using `Access-Control-Allow-Origin: *` with credentials

```http
Access-Control-Allow-Origin: *
Access-Control-Allow-Credentials: true
```

**Fix:** Wildcard origin + credentials is invalid and browsers reject it. You must specify the exact origin:

```http
Access-Control-Allow-Origin: https://myapp.com
Access-Control-Allow-Credentials: true
```

### ❌ Pitfall: Not handling 429 responses

```js
// Blindly retrying immediately after 429 → hits rate limit again → 429 again → infinite loop
```

**Fix:** Read `Retry-After`, wait the specified time, then retry with exponential backoff.

---

## K — Coding Challenge + Solution

### Challenge

You're making API calls to a third-party service and occasionally getting 429. Write a `fetchWithRetry` function that:

1. Retries up to 3 times on 429
2. Reads `Retry-After` header and waits that many seconds
3. Defaults to 60 seconds if `Retry-After` is absent
4. Throws on other errors

### Solution

```js
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function fetchWithRetry(url, options = {}, maxRetries = 3) {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    const res = await fetch(url, options);

    if (res.status === 429) {
      if (attempt === maxRetries)
        throw new Error("Rate limit exceeded. Max retries reached.");
      const retryAfter = parseInt(res.headers.get("Retry-After") || "60");
      console.warn(
        `429 Rate Limited. Waiting ${retryAfter}s before retry ${attempt}/${maxRetries}...`
      );
      await sleep(retryAfter * 1000);
      continue;
    }

    if (!res.ok) throw new Error(`HTTP Error: ${res.status}`);
    return res.json();
  }
}
```

---

---

# 12 — API Documentation

---

## T — TL;DR

Good API docs are the **contract between backend and frontend**. Knowing how to read — and write — API docs makes you faster, reduces miscommunication, and elevates your engineering quality.

---

## K — Key Concepts

### The OpenAPI Specification (Swagger)

OpenAPI is the industry standard for describing REST APIs. It's a YAML or JSON file that documents every endpoint:

```yaml
# openapi.yaml
openapi: 3.0.0
info:
  title: Blog API
  version: 1.0.0

paths:
  /posts:
    get:
      summary: List all posts
      parameters:
        - name: page
          in: query
          schema:
            type: integer
            default: 1
        - name: limit
          in: query
          schema:
            type: integer
            default: 20
      responses:
        "200":
          description: A list of posts
          content:
            application/json:
              schema:
                type: object
                properties:
                  data:
                    type: array
                    items:
                      $ref: "#/components/schemas/Post"
    post:
      summary: Create a post
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: "#/components/schemas/CreatePost"
      responses:
        "201":
          description: Created
        "422":
          description: Validation error
```

### What Every Endpoint Should Document

| Section              | What to Include                                   |
| -------------------- | ------------------------------------------------- |
| **Method + Path**    | `GET /posts/:id`                                  |
| **Description**      | What it does                                      |
| **Path Parameters**  | Name, type, required, description                 |
| **Query Parameters** | Name, type, optional/required, defaults           |
| **Request Body**     | Schema with field types, required fields, example |
| **Response**         | Status codes, response body schema, examples      |
| **Auth**             | Required? Which scheme?                           |
| **Error Responses**  | All error codes and when they occur               |

### A Well-Documented Endpoint (Markdown Format)

````markdown name=day2-rest-resource-design.md
# 📅 Day 2 — REST Resource Design for Frontend Developers

> **Goal:** Learn how REST APIs are _designed_ — so you can read any API instantly, build your own correctly, and never argue with a backend dev again.
> **Format:** Each subtopic = 5–15 min. Do one. Stop. Come back.

---

## 📋 Day 2 Subtopic Overview

| #   | Subtopic                                                     | Time   |
| --- | ------------------------------------------------------------ | ------ |
| 1   | Resource Naming with Nouns & Collections vs Single Resources | 10 min |
| 2   | CRUD Mapping to HTTP Methods                                 | 10 min |
| 3   | Path Params vs Query Params                                  | 10 min |
| 4   | Nested Resources                                             | 10 min |
| 5   | Filtering, Sorting & Searching                               | 10 min |
| 6   | Pagination — From Day One                                    | 15 min |
| 7   | Consistent Response Envelopes & Error Object Structure       | 10 min |
| 8   | Validation Basics & Auth Headers                             | 10 min |
| 9   | Authorization Concepts                                       | 10 min |
| 10  | Versioning Strategies                                        | 10 min |
| 11  | Rate Limiting & CORS Awareness                               | 15 min |
| 12  | API Documentation                                            | 10 min |

---

---

# 1 — Resource Naming with Nouns & Collections vs Single Resources

---

## T — TL;DR

REST URLs are **nouns, not verbs**. Collections come before single resources. The shape of the URL alone should communicate what you're working with.

---

## K — Key Concepts

### Always Use Nouns

The HTTP method IS the verb. The URL should only describe the **thing** being acted on.

```
❌ Verb-based (not REST)        ✅ Noun-based (REST)
GET  /getUsers                  GET  /users
POST /createUser                POST /users
PUT  /updateUser/42             PUT  /users/42
DELETE /deleteUser/42           DELETE /users/42
POST /user/deactivate/42        POST /users/42/deactivations
```

### Plural Nouns for Collections

Use **plural nouns** for resource names — always.

```
✅ /users          (collection of users)
✅ /products       (collection of products)
✅ /orders         (collection of orders)

❌ /user
❌ /product
❌ /order
```

Why plural? Because `/users` makes sense for both "all users" and "a specific user from the users collection."

### Collections → Single Resources

The pattern is always: **collection first, then the specific item**.

```
/users          → the whole collection
/users/42       → one specific user from the collection

/products       → all products
/products/99    → product with id 99

/articles       → all articles
/articles/slug-title → specific article by slug
```

### Consistent Casing — Use Kebab-Case

```
✅ /blog-posts
✅ /user-profiles
✅ /order-items

❌ /blogPosts      (camelCase — not URL-friendly)
❌ /BlogPosts      (PascalCase)
❌ /blog_posts     (snake_case — acceptable but less common in URLs)
```

### Resource Identifiers

Identifiers in paths should be **unique and stable**:

```
/users/42           ← numeric ID (most common)
/users/mark-austin  ← slug (readable, SEO-friendly)
/users/uuid-here    ← UUID (globally unique, no enumeration risk)
```

---

## W — Why It Matters

- Clean resource naming is the first thing a senior dev checks when reviewing an API design.
- Consistent naming means any developer on the team can **predict** URLs without reading docs.
- Noun-based URLs are self-documenting — the URL tells you the resource, the method tells you the action.
- Plural naming is an industry standard — inconsistency confuses API consumers.

---

## I — Interview Q&A

### Q1: Why should REST URLs use nouns instead of verbs?

**A:** Because the HTTP method already IS the verb (GET, POST, DELETE). Adding verbs to the URL creates redundancy and breaks the uniform interface principle. `DELETE /users/42` is cleaner and more predictable than `POST /deleteUser/42`.

### Q2: Should resource names be singular or plural?

**A:** Plural. `/users` for a collection and `/users/42` for a specific user. This is consistent and widely adopted. Mixing singular and plural across endpoints creates confusion.

### Q3: What casing convention should URLs use?

**A:** Kebab-case (hyphen-separated lowercase). URLs are case-insensitive in practice and hyphens are URL-safe. Avoid camelCase or underscores in paths.

---

## C — Common Pitfalls + Fix

### ❌ Pitfall: Mixing verbs into URLs

```
POST /api/user/deactivate/42
```

**Fix:**

```
POST /api/users/42/deactivations
// or
PATCH /api/users/42  body: { "status": "inactive" }
```

### ❌ Pitfall: Inconsistent plural/singular naming

```
GET /users         ← plural
GET /product/5     ← singular
POST /order        ← singular
```

**Fix:** Pick plural, apply everywhere without exception.

### ❌ Pitfall: Exposing implementation details in names

```
❌ /api/tbl_users/42       ← database table name leaked
❌ /api/getUserFromDB      ← implementation detail
```

**Fix:** Name after the business concept, not the technical implementation.

---

## K — Coding Challenge + Solution

### Challenge

Rewrite these bad URLs into proper REST resource names:

```
1. POST /createNewBlogPost
2. GET  /getAllActiveUsers
3. DELETE /removeComment/5
4. PUT /updateProductPrice/99
5. GET /fetchOrdersByUser/42
```

### Solution

```
1. POST   /blog-posts
2. GET    /users?status=active
3. DELETE /comments/5
4. PUT    /products/99         body: { "price": 49.99 }  (or PATCH for partial)
5. GET    /users/42/orders
```

---

---

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

# 4 — Nested Resources

---

## T — TL;DR

Nested resources express **ownership and relationships** in the URL path. The rule: go one or two levels deep — beyond that, flatten it.

---

## K — Key Concepts

### What Are Nested Resources?

When one resource **belongs to** another, you can nest it in the URL:

```
/users/42/posts          ← posts owned by user 42
/users/42/posts/7        ← specific post owned by user 42
/articles/5/comments     ← comments on article 5
/orders/ABC/items        ← items in order ABC
```

### The Ownership Signal

```
/[parent-resource]/[parent-id]/[child-resource]

/users/42/posts          → "posts that belong to user 42"
/posts/7/comments        → "comments that belong to post 7"
/courses/3/lessons/9     → "lesson 9 within course 3"
```

### Nesting Rule: Max 2 Levels

```
✅ One level:
/users/42/posts

✅ Two levels (acceptable):
/users/42/posts/7

❌ Three or more (too deep):
/users/42/posts/7/comments/3/likes
```

When nesting gets too deep, **flatten it** — reference the child directly by its own ID:

```
❌ /users/42/posts/7/comments/3/likes
✅ /comments/3/likes           ← comment has a global ID, no need for full nesting
✅ /likes?commentId=3          ← or use query param
```

### When to Nest vs When to Reference Directly

| Scenario                                         | Recommendation                    |
| ------------------------------------------------ | --------------------------------- |
| Child ONLY exists in context of parent           | Nest: `/orders/5/items`           |
| Child has its own global identity                | Reference directly: `/comments/3` |
| You need the child collection filtered by parent | Either nested or query param      |

```
// Both are valid — choose consistency
GET /users/42/posts       ← nested (explicit ownership)
GET /posts?userId=42      ← query param (flexible, flat)
```

### In Code

```js
// Fetch all posts for user 42
fetch(`/api/users/${userId}/posts`);

// Fetch specific post for user 42
fetch(`/api/users/${userId}/posts/${postId}`);

// Create a comment on post 7
fetch(`/api/posts/7/comments`, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ text: "Great post!" }),
});
```

---

## W — Why It Matters

- Nested URLs self-document ownership relationships — critical for maintainable APIs.
- Deep nesting creates tightly coupled APIs that are hard to change without breaking clients.
- The flatten vs nest decision is a real backend design discussion — knowing the trade-offs makes you a stronger collaborator.
- Next.js App Router file-based routing mirrors this exact nesting pattern.

---

## I — Interview Q&A

### Q1: When should you nest a resource?

**A:** When the child resource primarily exists in the context of its parent and access without the parent context is rare or doesn't make sense. For example, `/orders/5/items` — order items don't make sense without the order context.

### Q2: How deep should nesting go?

**A:** Maximum 2 levels. Beyond that, flatten by referencing the child resource directly by its own ID. Deep nesting creates brittle, long URLs that are hard to read and maintain.

### Q3: What's the alternative to deeply nested URLs?

**A:** Use query parameters to filter a flat endpoint. `/posts?userId=42` achieves the same result as `/users/42/posts` and scales better for complex filtering scenarios.

---

## C — Common Pitfalls + Fix

### ❌ Pitfall: Nesting too deeply

```
GET /companies/1/departments/3/teams/7/members/42/tasks
```

**Fix:** Flatten. If tasks have global IDs, just use `/tasks/id` with filters:

```
GET /tasks?memberId=42
GET /members/42/tasks     ← max 1 level deep is fine
```

### ❌ Pitfall: Nesting resources that have strong independent identity

```
GET /users/42/comments/88   ← comment 88 has a global ID
```

**Fix:** Comments can stand alone:

```
GET /comments/88            ← direct access
GET /users/42/comments      ← filtered list is fine
```

### ❌ Pitfall: Inconsistent nesting across the API

```
GET /users/42/posts         ← nested
GET /comments?userId=42     ← flat
GET /orders/user/42         ← custom pattern
```

**Fix:** Pick one pattern per relationship and use it consistently throughout the API.

---

## K — Coding Challenge + Solution

### Challenge

Design the URL structure for a blog platform with:

- Users who write posts
- Posts that have comments
- Comments that can have likes
- Tags that can be applied to posts

Write the recommended URL for each operation:

```
1. Get all posts by user 5
2. Get comments on post 12
3. Add a comment to post 12
4. Get likes for comment 33
5. Get all posts tagged "javascript"
```

### Solution

```
1. GET  /users/5/posts
        or /posts?userId=5

2. GET  /posts/12/comments

3. POST /posts/12/comments
        body: { "text": "Nice!" }

4. GET  /comments/33/likes
        (comment has global ID — 1 level deep is fine)

5. GET  /posts?tag=javascript
        (tags are a filter, not a parent resource)
```

---

---

# 5 — Filtering, Sorting & Searching

---

## T — TL;DR

Filtering, sorting, and searching are all **query parameter operations** on a collection endpoint. Keep the URL clean and the parameters consistent.

---

## K — Key Concepts

### Filtering

Filter a collection by field values:

```
GET /products?category=shoes
GET /users?role=admin&status=active
GET /orders?status=pending&userId=42
```

Convention:

- Use the field name as the key
- Use `=` for equality
- Chain multiple filters with `&`

```js
const params = new URLSearchParams({
  category: "shoes",
  minPrice: 50,
  maxPrice: 200,
  inStock: true,
});
fetch(`/api/products?${params}`);
// → /api/products?category=shoes&minPrice=50&maxPrice=200&inStock=true
```

### Sorting

```
GET /products?sort=price              ← sort by price (default asc)
GET /products?sort=price&order=desc   ← sort by price descending
GET /products?sort=createdAt&order=asc
```

Common conventions:

```
?sort=field               → sort by field, ascending
?sort=field&order=desc    → sort descending
?sort=-price              → minus prefix = descending (some APIs)
?sortBy=price&sortDir=asc → verbose but explicit
```

> Pick ONE convention and stick to it across your entire API.

### Searching

Full-text or keyword search across fields:

```
GET /products?search=laptop
GET /articles?q=javascript+tips
GET /users?q=mark
```

```js
const searchProducts = (query) => {
  const params = new URLSearchParams({ q: query, limit: 10 });
  return fetch(`/api/products?${params}`).then((r) => r.json());
};
```

### Combining Them All

```
GET /products?category=electronics&minPrice=100&sort=price&order=asc&q=laptop&page=2&limit=20
```

```js
const params = new URLSearchParams({
  category: "electronics",
  minPrice: 100,
  sort: "price",
  order: "asc",
  q: "laptop",
  page: 2,
  limit: 20,
});
fetch(`/api/products?${params}`);
```

### Range Filters

```
GET /orders?createdAfter=2025-01-01&createdBefore=2025-12-31
GET /products?minPrice=10&maxPrice=100
GET /events?startDate=2025-06-01
```

---

## W — Why It Matters

- Every data table, product listing, or search feature you build hits a filtered/sorted endpoint.
- Consistent parameter naming across endpoints reduces the mental overhead for every developer consuming the API.
- Knowing the conventions lets you build frontend filter UIs that map directly to URL params — which also makes filters shareable/bookmarkable via the URL.

---

## I — Interview Q&A

### Q1: Where do filters, sorts, and searches belong in a REST URL?

**A:** Always in query parameters. They modify how a collection is returned without changing what resource is being accessed. Embedding them in the path would create infinite URL variations.

### Q2: How would you implement a shareable search/filter URL in a frontend?

**A:** Sync the filter state with URL query parameters using `URLSearchParams`. When the page loads, read the params and pre-populate the filters. When filters change, update the URL — this makes the state bookmarkable and shareable without any backend storage.

### Q3: What's the difference between filtering and searching?

**A:** Filtering matches exact field values (`?status=active`). Searching performs a broader lookup, often full-text, across one or more fields (`?q=laptop`). Filtering is structured; searching is fuzzy.

---

## C — Common Pitfalls + Fix

### ❌ Pitfall: Encoding filters in the path

```
GET /products/electronics/price/asc   ← path params used as filters
```

**Fix:**

```
GET /products?category=electronics&sort=price&order=asc
```

### ❌ Pitfall: Inconsistent sort parameter naming

```
/users?sortBy=name        ← endpoint A
/products?sort_field=price ← endpoint B
/orders?orderBy=date       ← endpoint C
```

**Fix:** Pick one: `sort` + `order`. Document it. Apply everywhere.

### ❌ Pitfall: Not URL-encoding search terms

```js
fetch(`/api/search?q=rock & roll`); // ❌ breaks the URL
```

**Fix:** Use `URLSearchParams` — it handles encoding:

```js
const params = new URLSearchParams({ q: "rock & roll" });
fetch(`/api/search?${params}`); // → ?q=rock+%26+roll ✅
```

---

## K — Coding Challenge + Solution

### Challenge

Build a `fetchUsers` function that accepts a config object and constructs the correct API URL:

```js
fetchUsers({
  role: "admin",
  status: "active",
  sort: "name",
  order: "asc",
  search: "mark",
});
// Should call: /api/users?role=admin&status=active&sort=name&order=asc&q=mark
```

### Solution

```js
async function fetchUsers({ role, status, sort, order, search } = {}) {
  const params = new URLSearchParams();

  if (role) params.set("role", role);
  if (status) params.set("status", status);
  if (sort) params.set("sort", sort);
  if (order) params.set("order", order);
  if (search) params.set("q", search);

  const res = await fetch(`/api/users?${params}`);
  if (!res.ok) throw new Error(`Error: ${res.status}`);
  return res.json();
}
```

---

---

# 6 — Pagination — From Day One

---

## T — TL;DR

**Never return unlimited data.** Add pagination to every list endpoint from the start — retrofitting it later breaks clients. Know the three patterns: **offset**, **cursor**, and **page-based**.

---

## K — Key Concepts

### Why Pagination Exists

```
GET /users        ← what if there are 10,000,000 users?
```

Without pagination: slow response, massive payload, server overload, client crash.

**Rule: Every collection endpoint must be paginated.**

### Pattern 1: Offset/Limit Pagination (Most Common)

```
GET /users?limit=20&offset=0    ← first 20
GET /users?limit=20&offset=20   ← next 20
GET /users?limit=20&offset=40   ← next 20
```

```js
// Frontend: fetching page N
const getPage = (page, limit = 20) => {
  const offset = (page - 1) * limit;
  return fetch(`/api/users?limit=${limit}&offset=${offset}`).then((r) =>
    r.json()
  );
};
```

**Pros:** Simple, supports random access (jump to any page).
**Cons:** Inconsistent if data changes between requests (items inserted = duplicates/skips).

### Pattern 2: Page Number Pagination

```
GET /products?page=1&perPage=20
GET /products?page=2&perPage=20
GET /products?page=3&perPage=20
```

Semantically cleaner than offset. Internally the server does `offset = (page - 1) * perPage`.

```js
const getPage = (page) =>
  fetch(`/api/products?page=${page}&perPage=20`).then((r) => r.json());
```

### Pattern 3: Cursor-Based Pagination (For Real-Time Data)

Uses an opaque token (cursor) pointing to a position in the dataset.

```
GET /posts?limit=20                         ← first page (no cursor)
← returns: { data: [...], nextCursor: "xyz123" }

GET /posts?limit=20&cursor=xyz123           ← next page
← returns: { data: [...], nextCursor: "abc456" }
```

**Pros:** Stable for real-time feeds (no duplicates/skips when data changes).
**Cons:** Cannot jump to arbitrary pages.

**Use cursor pagination for:** social feeds, activity logs, chat history, infinite scroll.

### Link-Based Pagination Awareness

Some APIs follow the **RFC 5988** `Link` header standard:

```http
HTTP/1.1 200 OK
Link: <https://api.example.com/users?page=3>; rel="next",
      <https://api.example.com/users?page=1>; rel="prev",
      <https://api.example.com/users?page=10>; rel="last",
      <https://api.example.com/users?page=1>; rel="first"
```

The GitHub API uses this pattern. Instead of building next/prev URLs yourself, you read them from the response header.

```js
const res = await fetch("/api/users?page=2");
const linkHeader = res.headers.get("Link");
// Parse to extract rel="next" URL
```

### Standard Pagination Response Envelope

```json
{
  "data": [ ...items... ],
  "pagination": {
    "total": 243,
    "page": 2,
    "perPage": 20,
    "totalPages": 13,
    "hasNextPage": true,
    "hasPrevPage": true
  }
}
```

---

## W — Why It Matters

- Adding pagination later in a project is a **breaking change** — existing clients expect unbounded responses.
- Infinite scroll, "Load More" buttons, and numbered paging are all pagination UI patterns — you need to know which API pattern to request.
- Cursor pagination is expected knowledge for senior frontend interviews (Facebook, Twitter-style feeds use it).
- The `Link` header is used by GitHub's API — you'll encounter it when building GitHub integrations.

---

## I — Interview Q&A

### Q1: What's the difference between offset and cursor pagination?

**A:** Offset pagination uses a numeric skip (`?offset=40`). It's simple but suffers from drift when data is inserted or deleted between requests. Cursor pagination uses an opaque pointer to a position in the data. It's stable for real-time feeds but doesn't support random page access.

### Q2: When would you use cursor vs offset pagination?

**A:** Cursor for real-time, constantly-updating data (social feeds, chat, notifications) where stability matters. Offset/page-number for stable datasets where random page access (jump to page 7) is needed — like admin tables or search results.

### Q3: Why should you add pagination from day one?

**A:** Removing pagination from an endpoint later is a breaking change. Clients that already consume the unbounded list will break. It's far easier and cheaper to add pagination upfront than retrofit it.

---

## C — Common Pitfalls + Fix

### ❌ Pitfall: Returning all records with no limit

```
GET /logs    ← returns 5 million rows
```

**Fix:** Always default to a limit:

```
GET /logs?limit=50     ← explicit
GET /logs              ← server defaults to limit=50 even if not specified
```

### ❌ Pitfall: Trusting total count for cursor-based APIs

```js
// Cursor APIs often don't provide total count
const totalPages = Math.ceil(total / perPage); // ← may not be available
```

**Fix:** For cursor pagination, use `hasNextPage: true/false` instead of computing total pages.

### ❌ Pitfall: Off-by-one in offset calculation

```js
// User wants page 1, but page 1 with offset=1 skips the first item
const offset = page * limit; // ❌ page 1 → offset 20, skips first 20!
const offset = (page - 1) * limit; // ✅ page 1 → offset 0
```

---

## K — Coding Challenge + Solution

### Challenge

Build a `fetchPage` function that supports both offset and cursor pagination:

```js
// Offset mode:
fetchPage({ type: "offset", page: 3, limit: 10 });
// → GET /api/posts?limit=10&offset=20

// Cursor mode:
fetchPage({ type: "cursor", cursor: "abc123", limit: 10 });
// → GET /api/posts?limit=10&cursor=abc123
```

### Solution

```js
async function fetchPage({ type, page, cursor, limit = 20 }) {
  const params = new URLSearchParams({ limit });

  if (type === "offset") {
    params.set("offset", (page - 1) * limit);
  } else if (type === "cursor" && cursor) {
    params.set("cursor", cursor);
  }

  const res = await fetch(`/api/posts?${params}`);
  if (!res.ok) throw new Error(`Error: ${res.status}`);
  return res.json();
}
```

---

---

# 7 — Consistent Response Envelopes & Error Object Structure

---

## T — TL;DR

A **response envelope** is a consistent wrapper around every API response. A **structured error object** is how your API communicates failure. Consistency here saves hours of debugging.

---

## K — Key Concepts

### What Is a Response Envelope?

Instead of returning raw data or raw errors, wrap everything in a consistent structure:

```json
{
  "data": { ... },
  "meta": { ... },
  "error": null
}
```

This gives every response the same shape — your frontend code always knows where to look.

### Success Envelope

```json
// Single resource
{
  "data": {
    "id": 42,
    "name": "Mark",
    "email": "mark@example.com"
  }
}

// Collection with pagination meta
{
  "data": [
    { "id": 1, "name": "Alice" },
    { "id": 2, "name": "Bob" }
  ],
  "meta": {
    "total": 243,
    "page": 1,
    "perPage": 20,
    "totalPages": 13
  }
}
```

### Error Envelope — What a Good Error Object Looks Like

```json
{
  "error": {
    "status": 422,
    "code": "VALIDATION_ERROR",
    "message": "Request validation failed",
    "details": [
      {
        "field": "email",
        "message": "Must be a valid email address"
      },
      {
        "field": "password",
        "message": "Must be at least 8 characters"
      }
    ],
    "requestId": "req-abc-123",
    "timestamp": "2026-05-19T10:30:00Z"
  }
}
```

| Field       | Purpose                                          |
| ----------- | ------------------------------------------------ |
| `status`    | HTTP status code (matches response status)       |
| `code`      | Machine-readable error code (for frontend logic) |
| `message`   | Human-readable summary                           |
| `details`   | Field-level validation errors                    |
| `requestId` | Trace ID for debugging in logs                   |
| `timestamp` | When the error occurred                          |

### Why `code` Matters

HTTP status codes are too coarse for app logic:

```js
// Without error code — you can't distinguish why it failed
if (res.status === 400) {
  /* which 400? */
}

// With error code — you can handle specifically
if (error.code === "EMAIL_ALREADY_EXISTS") {
  showMessage("That email is already registered. Try logging in.");
}
if (error.code === "WEAK_PASSWORD") {
  highlightPasswordField();
}
```

### In Code — Handling Envelopes

```js
async function apiCall(url, options = {}) {
  const res = await fetch(url, options);
  const body = res.status !== 204 ? await res.json() : null;

  if (!res.ok) {
    const err = new Error(body?.error?.message || "Unknown error");
    err.code = body?.error?.code;
    err.details = body?.error?.details;
    err.status = res.status;
    throw err;
  }

  return body?.data ?? body;
}
```

---

## W — Why It Matters

- Inconsistent response shapes force frontend devs to write defensive code for every single endpoint.
- Structured error codes let you show **contextual UI messages** instead of generic "Something went wrong."
- Field-level validation errors map directly to form field highlighting — a critical UX feature.
- `requestId` is invaluable for debugging production issues with your backend team.

---

## I — Interview Q&A

### Q1: What is a response envelope and why use one?

**A:** A response envelope is a consistent wrapper around all API responses. It ensures `data`, `meta`, and `error` always live in predictable locations — so client code doesn't need different parsing logic per endpoint.

### Q2: What should a well-structured API error response contain?

**A:** At minimum: an HTTP status code, a machine-readable error code, a human-readable message, and field-level details for validation errors. A request ID for tracing is also best practice.

### Q3: Why include a machine-readable `code` field on errors?

**A:** HTTP status codes are too broad. A `code` like `EMAIL_ALREADY_EXISTS` or `INSUFFICIENT_CREDITS` allows frontend code to handle specific scenarios with appropriate UI feedback, rather than guessing based on status code alone.

---

## C — Common Pitfalls + Fix

### ❌ Pitfall: Inconsistent response shapes across endpoints

```json
// Endpoint A
{ "users": [...] }

// Endpoint B
{ "result": { "items": [...] } }

// Endpoint C
[...]   ← bare array
```

**Fix:** Always wrap in `{ "data": ... }`. One shape everywhere.

### ❌ Pitfall: Returning HTML error pages instead of JSON errors

```
HTTP 500
Content-Type: text/html
<html><body>Internal Server Error</body></html>
```

**Fix:** API endpoints must always return `Content-Type: application/json` even for errors. Set this in your error handling middleware.

### ❌ Pitfall: Swallowing field-level errors into a generic message

```json
{ "error": "Validation failed" }
```

**Fix:** Return per-field details so the frontend can highlight the specific broken field:

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "details": [{ "field": "email", "message": "Invalid format" }]
  }
}
```

---

## K — Coding Challenge + Solution

### Challenge

Write a function `handleApiResponse` that:

1. Returns `data` on success
2. Throws a structured error with `code`, `message`, and `details` on failure
3. Handles 204 (no body) correctly

```js
const user = await handleApiResponse(fetch("/api/users/42"));
```

### Solution

```js
async function handleApiResponse(fetchPromise) {
  const res = await fetchPromise;

  // 204 No Content — success with no body
  if (res.status === 204) return null;

  const body = await res.json();

  if (!res.ok) {
    const error = new Error(body?.error?.message || `HTTP Error ${res.status}`);
    error.status = res.status;
    error.code = body?.error?.code || "UNKNOWN_ERROR";
    error.details = body?.error?.details || [];
    throw error;
  }

  return body?.data ?? body;
}
```

---

---

# 8 — Validation Basics & Auth Headers

---

## T — TL;DR

**Validation** ensures incoming data is correct before processing. **Auth headers** carry proof of identity with every request. Both are non-negotiable in production APIs.

---

## K — Key Concepts

### Validation — Where It Happens

```
[Client-side validation]     → fast feedback, but never trust it alone
        ↓
[Server-side validation]     → authoritative, always required
        ↓
[Database constraints]       → last line of defense
```

### What to Validate on the Server

```
- Required fields: field must exist and not be empty
- Type: must be a string / number / boolean / array
- Format: email regex, URL format, ISO date format
- Length: min/max length for strings
- Range: min/max for numbers
- Uniqueness: email/username not already taken
- Enum: value must be one of allowed options
```

### Validation Error Response

```json
HTTP 422 Unprocessable Entity
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Validation failed",
    "details": [
      { "field": "email",    "message": "Must be a valid email address" },
      { "field": "password", "message": "Must be at least 8 characters" },
      { "field": "age",      "message": "Must be between 18 and 120" }
    ]
  }
}
```

### Consuming Validation Errors on the Frontend

```js
try {
  const user = await createUser(formData);
} catch (err) {
  if (err.code === "VALIDATION_ERROR") {
    // Map field errors to form state
    const fieldErrors = {};
    err.details.forEach(({ field, message }) => {
      fieldErrors[field] = message;
    });
    setErrors(fieldErrors); // { email: "Must be valid", password: "Too short" }
  }
}
```

### Auth Headers

The `Authorization` header carries credentials with every request:

```http
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
Authorization: ApiKey sk_live_abc123
Authorization: Basic dXNlcjpwYXNzd29yZA==
```

| Scheme           | Use Case                                 |
| ---------------- | ---------------------------------------- |
| `Bearer <token>` | JWT auth (most common in SPAs)           |
| `ApiKey <key>`   | Service-to-service or developer API keys |
| `Basic <base64>` | Username:password (only over HTTPS)      |

### Using Bearer Tokens in Fetch

```js
const authFetch = (url, options = {}) => {
  const token = localStorage.getItem("token"); // or from a secure store
  return fetch(url, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
      ...options.headers,
    },
  });
};

// Usage
authFetch("/api/profile").then((r) => r.json());
```

> ⚠️ Storing JWTs in `localStorage` is convenient but exposes them to XSS attacks. Prefer `HttpOnly` cookies for sensitive apps.

---

## W — Why It Matters

- Never trusting client-side validation alone is a fundamental security principle — users can bypass browser forms trivially.
- Structured validation errors are what separate "junior" API error handling from production-quality UX.
- The `Authorization` header is on every authenticated request you'll ever make — you need to know its structure cold.
- Understanding token storage trade-offs (localStorage vs HttpOnly cookie) is a standard security interview topic.

---

## I — Interview Q&A

### Q1: Should you rely on client-side validation alone?

**A:** Never. Client-side validation is for UX feedback — it's fast and immediate. But it can be bypassed with browser devtools, Postman, or curl. Server-side validation is always required as the source of truth.

### Q2: What status code should validation errors return?

**A:** `422 Unprocessable Entity` — the request was syntactically correct (not a 400) but the business rules weren't satisfied. Some APIs use `400 Bad Request` — either is acceptable, but 422 is more precise.

### Q3: What is a Bearer token?

**A:** A Bearer token is an auth scheme where possessing the token grants access — like a physical key. It's sent in the `Authorization` header as `Bearer <token>`. JWTs are the most common type of bearer token in web apps.

---

## C — Common Pitfalls + Fix

### ❌ Pitfall: Trusting frontend validation and skipping server validation

```
// Frontend checks email format
// Backend stores whatever it receives
// → malformed data in database
```

**Fix:** Always validate on the server. Client-side validation is a UX enhancement, never a security control.

### ❌ Pitfall: Returning a generic error for all validation failures

```json
{ "error": "Invalid input" }
```

**Fix:** Return per-field errors so the UI can highlight exactly what failed.

### ❌ Pitfall: Exposing the token in the URL

```
GET /api/profile?token=eyJhbG...   ← token in URL appears in server logs, browser history
```

**Fix:** Always put the token in the `Authorization` header, never the URL.

---

## K — Coding Challenge + Solution

### Challenge

Given this error response from the server, write the frontend code to map errors to a form state object:

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "details": [
      { "field": "username", "message": "Username is already taken" },
      { "field": "email", "message": "Must be a valid email" },
      { "field": "password", "message": "Must be at least 8 characters" }
    ]
  }
}
```

### Solution

```js
async function submitRegistration(formData) {
  try {
    const res = await authFetch("/api/register", {
      method: "POST",
      body: JSON.stringify(formData),
    });
    if (!res.ok) {
      const body = await res.json();
      const error = new Error("Validation failed");
      error.code = body.error.code;
      error.details = body.error.details;
      throw error;
    }
    return res.json();
  } catch (err) {
    if (err.code === "VALIDATION_ERROR") {
      // Map to { username: "...", email: "...", password: "..." }
      return {
        fieldErrors: Object.fromEntries(
          err.details.map(({ field, message }) => [field, message])
        ),
      };
    }
    throw err;
  }
}

// Result:
// {
//   fieldErrors: {
//     username: "Username is already taken",
//     email: "Must be a valid email",
//     password: "Must be at least 8 characters"
//   }
// }
```

---

---

# 9 — Authorization Concepts

---

## T — TL;DR

**Authentication** = proving who you are. **Authorization** = determining what you're allowed to do. They're different problems with different solutions — confusing them causes security bugs.

---

## K — Key Concepts

### Authentication vs Authorization

```
Authentication:  "Are you who you say you are?"
                 → Login, JWT verification, session validation

Authorization:   "Are you allowed to do this?"
                 → Role checks, ownership checks, permission flags
```

```
User logs in             → Authentication (verified: you are Mark, id=42)
User tries to delete post #5  → Authorization (allowed? is post #5 owned by Mark?)
```

### Common Authorization Patterns

#### 1. Role-Based Access Control (RBAC)

Users have roles. Roles have permissions.

```
Roles: user, admin, moderator
Permissions:
  user      → read posts, create own posts, delete own posts
  moderator → + delete any post
  admin     → + manage users, access analytics
```

```json
// JWT payload contains role
{
  "sub": "42",
  "name": "Mark",
  "role": "admin",
  "iat": 1716000000
}
```

```js
// Server checks role before processing
if (user.role !== "admin") {
  return res
    .status(403)
    .json({ error: { code: "FORBIDDEN", message: "Admin only" } });
}
```

#### 2. Ownership-Based Authorization

User can only access their own resources:

```js
// Server checks: does this resource belong to the requesting user?
const post = await db.posts.findById(req.params.id);

if (post.authorId !== req.user.id) {
  return res.status(403).json({ error: { code: "FORBIDDEN" } });
}
```

#### 3. Scopes (OAuth)

Common in third-party API access (GitHub, Google):

```
read:user          → can read user profile
write:posts        → can create/update posts
admin:org          → can manage organization
```

```
Authorization: Bearer <token-with-scopes>
```

### Frontend Authorization — What You Control

```js
// Show/hide UI elements based on role
// (NEVER a security control — always enforce on the server)
const isAdmin = user.role === "admin";

return (
  <div>
    <PostList />
    {isAdmin && <AdminPanel />} {/* UI hint only */}
  </div>
);
```

> ⚠️ **Frontend authorization is UX only.** A user can always bypass frontend checks with devtools. The server must enforce ALL authorization rules.

### HTTP Response Codes for Auth

```
401 Unauthorized  → Not authenticated (no/invalid token) → redirect to login
403 Forbidden     → Authenticated but not authorized → show "access denied"
```

---

## W — Why It Matters

- Auth bugs are among the most critical security vulnerabilities — OWASP's top 10 consistently includes "Broken Access Control."
- Understanding 401 vs 403 prevents incorrect error handling (redirecting a logged-in user to the login page on a 403).
- RBAC knowledge is expected in any full-stack or senior frontend role.
- Knowing that frontend auth is UX only prevents the #1 authorization mistake junior devs make.

---

## I — Interview Q&A

### Q1: What's the difference between authentication and authorization?

**A:** Authentication verifies identity — "who are you?" (login, token validation). Authorization determines permissions — "what can you do?" (role checks, ownership verification). You can't do authorization without authentication first.

### Q2: Why can't you rely on frontend checks for authorization?

**A:** Frontend code is fully visible and controllable by the user. They can remove your `{isAdmin && ...}` check in devtools or call the API directly. Authorization must always be enforced server-side.

### Q3: What's the difference between a 401 and 403 response?

**A:** 401 means the user is not authenticated — they need to log in. 403 means they ARE authenticated but lack permission — showing a login page would be wrong. Show an "Access Denied" message instead.

---

## C — Common Pitfalls + Fix

### ❌ Pitfall: Treating frontend role checks as security

```jsx
{
  user.role === "admin" && <DeleteButton onClick={deleteAllUsers} />;
}
// User removes this check in devtools → calls deleteAllUsers → API has no server-side check
```

**Fix:** ALWAYS enforce roles on the server. Frontend checks are for UX only.

### ❌ Pitfall: Redirecting to login on 403

```js
if (res.status === 403) router.push("/login"); // ❌ user IS logged in
```

**Fix:**

```js
if (res.status === 401) router.push("/login"); // ✅ not authenticated
if (res.status === 403) showError("Access denied"); // ✅ authenticated, no permission
```

### ❌ Pitfall: Over-exposing data in JWT payload

```json
{
  "sub": "42",
  "creditCardNumber": "4111...",  ← never put sensitive data in JWT
  "passwordHash": "..."
}
```

**Fix:** JWTs are base64-encoded, not encrypted (by default). Only put non-sensitive identity data (id, role, email) in the payload.

---

## K — Coding Challenge + Solution

### Challenge

Given a `currentUser` object and a `post` object, write an `canEditPost` function that returns true only if:

- The user is an admin, OR
- The user is a moderator AND the post is not locked, OR
- The user is the post author AND the post is not locked

```js
canEditPost(
  { id: 42, role: "moderator" },
  { id: 5, authorId: 10, locked: false }
);
// → true (moderator, post not locked)
```

### Solution

```js
function canEditPost(user, post) {
  if (user.role === "admin") return true;
  if (post.locked) return false;
  if (user.role === "moderator") return true;
  if (user.id === post.authorId) return true;
  return false;
}

// Tests
console.log(canEditPost({ id: 1, role: "admin" }, { locked: true })); // true (admin ignores lock)
console.log(canEditPost({ id: 2, role: "moderator" }, { locked: false })); // true
console.log(canEditPost({ id: 2, role: "moderator" }, { locked: true })); // false
console.log(
  canEditPost({ id: 42, role: "user" }, { authorId: 42, locked: false })
); // true (author)
console.log(
  canEditPost({ id: 42, role: "user" }, { authorId: 99, locked: false })
); // false
```

---

---

# 10 — Versioning Strategies

---

## T — TL;DR

API versioning lets you **evolve your API without breaking existing clients**. There are three main strategies — URI, header, and query param — and URI versioning is the most widely adopted.

---

## K — Key Concepts

### Why Versioning Matters

```
Client builds against /api/users → returns { name: "Mark" }

You change the API → { firstName: "Mark", lastName: "Austin" }

Unversioned → every existing client breaks simultaneously
Versioned   → old clients keep using /v1/users, new clients use /v2/users
```

### Strategy 1: URI Versioning (Most Common)

```
https://api.example.com/v1/users
https://api.example.com/v2/users
```

```
✅ Pros:
- Instantly visible in URLs, logs, and browser DevTools
- Easy to test in a browser
- Most widely adopted (Twitter, GitHub, Stripe, Twilio)

❌ Cons:
- "Unclean" URLs — version is not a resource
- Requires routing duplication
```

### Strategy 2: Header Versioning

```http
GET /users
Accept-Version: 2
```

or

```http
GET /users
Api-Version: 2026-05-19
```

Stripe uses date-based API versioning via header:

```http
Stripe-Version: 2023-10-16
```

```
✅ Pros:
- Clean URLs
- Version is metadata, not part of the resource path

❌ Cons:
- Invisible in browser URLs
- Harder to test without tooling (can't just type in browser)
- Less discoverable
```

### Strategy 3: Query Param Versioning

```
GET /users?version=2
GET /users?api-version=2
```

```
✅ Pros:
- Visible in URL
- Easy to add to existing endpoints

❌ Cons:
- Mixes versioning with resource filtering
- Breaks caching (version is a cache-busting param)
- Least common
```

### What Counts as a Breaking Change?

```
Breaking (requires new version):
❌ Removing a field from a response
❌ Renaming a field
❌ Changing a field's data type
❌ Changing required → optional behavior
❌ Removing an endpoint
❌ Changing error codes

Non-breaking (safe to deploy without versioning):
✅ Adding a new optional field to a response
✅ Adding a new endpoint
✅ Adding a new optional request parameter
```

### Version Sunset Policy

```
v1 released → v2 released → v1 deprecated (notice sent) → v1 sunset (removed)
```

```http
// Deprecation warning in response header
Deprecation: true
Sunset: Mon, 01 Jan 2027 00:00:00 GMT
Link: <https://api.example.com/v2/users>; rel="successor-version"
```

---

## W — Why It Matters

- You will consume versioned APIs and you need to know which version to use and where to find it.
- When building APIs (Next.js route handlers), versioning from day one prevents painful migrations.
- Breaking changes without versioning have caused real outages for major companies.
- Knowing the three strategies and their trade-offs is a standard system design interview question.

---

## I — Interview Q&A

### Q1: What are the three main API versioning strategies?

**A:** URI versioning (`/v1/users`), header versioning (`Api-Version: 2`), and query param versioning (`?version=2`). URI versioning is the most common due to its visibility and ease of use.

### Q2: What counts as a breaking change?

**A:** Removing or renaming fields, changing data types, removing endpoints, or changing required field behavior. Adding new optional fields or endpoints is non-breaking.

### Q3: What is API sunset?

**A:** Sunset is the date after which a deprecated API version will be removed. It's typically communicated via a `Sunset` response header and advance notice to API consumers, giving them time to migrate.

---

## C — Common Pitfalls + Fix

### ❌ Pitfall: Not versioning at all

```
GET /api/users   ← no version → every change risks breaking clients
```

**Fix:** Start with `/api/v1/` from day one — even if you never need v2, it's zero cost upfront.

### ❌ Pitfall: Treating every change as a new version

```
v1 → v2: added new optional field (not a breaking change!)
```

**Fix:** Only increment the version for **breaking changes**. Additive changes (new optional fields, new endpoints) don't require a new version.

### ❌ Pitfall: Removing old versions too quickly

```
v1 deprecated → removed after 2 weeks → all clients using v1 break
```

**Fix:** Give clients at least 3–6 months notice before sunsetting a version. Communicate via headers, email, and changelog.

---

## K — Coding Challenge + Solution

### Challenge

Classify each change as **breaking (B)** or **non-breaking (NB)**:

```
1. Rename response field: { "name": "Mark" } → { "fullName": "Mark" }
2. Add new optional response field: { "id": 1 } → { "id": 1, "createdAt": "..." }
3. Change field type: { "age": "25" } → { "age": 25 }  (string → number)
4. Add a new endpoint: POST /api/v1/subscriptions
5. Remove an endpoint: DELETE /api/v1/legacy-export
6. Make a previously required request field optional
7. Add a new required request field to an existing endpoint
```

### Solution

```
1. B  — renaming a field breaks clients reading "name"
2. NB — adding optional fields is safe; existing clients ignore unknown fields
3. B  — type change breaks clients treating age as a string
4. NB — new endpoints don't affect existing clients
5. B  — removing an endpoint breaks clients calling it
6. NB — loosening a constraint is backward compatible
7. B  — existing clients not sending the new required field will now get errors
```

---

---

# 11 — Rate Limiting & CORS Awareness

---

## T — TL;DR

**Rate limiting** prevents API abuse by capping how many requests a client can make. **CORS** is a browser security mechanism that controls which frontend origins can call which APIs. Both cause confusing errors if you don't understand them.

---

## K — Key Concepts

### Rate Limiting

Rate limiting caps requests per time window:

```
100 requests per minute per IP
1000 requests per day per API key
10 requests per second per user
```

#### Rate Limit Response Headers

```http
HTTP/1.1 429 Too Many Requests
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 0
X-RateLimit-Reset: 1716123600
Retry-After: 60
```

| Header                  | Meaning                          |
| ----------------------- | -------------------------------- |
| `X-RateLimit-Limit`     | Max requests allowed per window  |
| `X-RateLimit-Remaining` | Requests left in current window  |
| `X-RateLimit-Reset`     | Unix timestamp when limit resets |
| `Retry-After`           | Seconds to wait before retrying  |

#### Handling 429 on the Frontend

```js
async function apiFetch(url, options, retries = 3) {
  const res = await fetch(url, options);

  if (res.status === 429 && retries > 0) {
    const retryAfter = parseInt(res.headers.get("Retry-After") || "60");
    console.warn(`Rate limited. Retrying in ${retryAfter}s...`);
    await new Promise((resolve) => setTimeout(resolve, retryAfter * 1000));
    return apiFetch(url, options, retries - 1); // retry
  }

  return res;
}
```

### CORS — Cross-Origin Resource Sharing

#### The Same-Origin Policy

Browsers block JS from making requests to a different origin than the page:

```
Origin = protocol + domain + port

https://myapp.com               ← your frontend
https://api.myapp.com           ← DIFFERENT origin (different subdomain) ← CORS required
https://api.other.com           ← DIFFERENT origin ← CORS required
http://myapp.com                ← DIFFERENT origin (different protocol) ← CORS required
https://myapp.com:3001          ← DIFFERENT origin (different port) ← CORS required
```

#### How CORS Works

```
1. Browser sends request with:
   Origin: https://myapp.com

2. Server must respond with:
   Access-Control-Allow-Origin: https://myapp.com
   (or * for public APIs)

3. If header is missing → browser BLOCKS the response (request DID go through to server)
```

> ⚠️ **CORS errors are browser-enforced, not server errors.** The request reaches the server — the browser just refuses to give your JS the response.

#### Preflight Requests

For non-simple requests (POST with JSON, custom headers), the browser sends a preflight `OPTIONS` request first:

```http
OPTIONS /api/users HTTP/1.1
Origin: https://myapp.com
Access-Control-Request-Method: POST
Access-Control-Request-Headers: Content-Type, Authorization
```

Server must respond:

```http
HTTP/1.1 204 No Content
Access-Control-Allow-Origin: https://myapp.com
Access-Control-Allow-Methods: GET, POST, PUT, PATCH, DELETE
Access-Control-Allow-Headers: Content-Type, Authorization
Access-Control-Max-Age: 86400
```

#### Common CORS Headers

| Header                             | Direction | Meaning                       |
| ---------------------------------- | --------- | ----------------------------- |
| `Access-Control-Allow-Origin`      | Response  | Which origins are allowed     |
| `Access-Control-Allow-Methods`     | Response  | Which methods are allowed     |
| `Access-Control-Allow-Headers`     | Response  | Which headers are allowed     |
| `Access-Control-Allow-Credentials` | Response  | Allow cookies/auth            |
| `Access-Control-Max-Age`           | Response  | Cache preflight for N seconds |

#### The Frontend Fix for CORS Errors

```
CORS errors are ALWAYS a server configuration issue.
You cannot fix CORS from the frontend in production.
```

In development, you can proxy:

```js
// next.config.js
module.exports = {
  async rewrites() {
    return [
      { source: "/api/:path*", destination: "http://localhost:3001/:path*" },
    ];
  },
};
// Now /api/users proxies to localhost:3001/users — same origin, no CORS
```

---

## W — Why It Matters

- You WILL hit rate limits when building apps that call external APIs (GitHub, OpenAI, Stripe).
- CORS errors are one of the most common and confusing errors for new frontend developers — understanding the mechanism makes debugging instant.
- Knowing that CORS is server-side lets you correctly escalate to the backend team instead of spinning on the frontend.
- Rate limit headers let you build respectful clients that back off instead of hammering and getting banned.

---

## I — Interview Q&A

### Q1: What is CORS and why does it exist?

**A:** CORS (Cross-Origin Resource Sharing) is a browser security mechanism that restricts JS from making requests to origins different from the page's origin. It exists to prevent malicious sites from making requests to other services on behalf of a logged-in user (CSRF protection). Servers opt into cross-origin access by sending `Access-Control-Allow-Origin` headers.

### Q2: Can you fix a CORS error from the frontend?

**A:** No. CORS is enforced by the browser based on server response headers. The fix is always on the server — adding the correct `Access-Control-Allow-Origin` header. In development, a proxy can work around it.

### Q3: What is a preflight request?

**A:** An automatic `OPTIONS` request the browser sends before non-simple requests (like POST with JSON or with custom headers). It checks if the server permits the actual request. If the server doesn't respond correctly to the preflight, the browser blocks the real request.

---

## C — Common Pitfalls + Fix

### ❌ Pitfall: Thinking CORS means the request was blocked

```
"I'm getting CORS error — the server rejected my request"
```

**Fix:** The request REACHED the server. CORS means the browser blocked your JS from reading the response. Check the server's response headers, not the request.

### ❌ Pitfall: Using `Access-Control-Allow-Origin: *` with credentials

```http
Access-Control-Allow-Origin: *
Access-Control-Allow-Credentials: true
```

**Fix:** Wildcard origin + credentials is invalid and browsers reject it. You must specify the exact origin:

```http
Access-Control-Allow-Origin: https://myapp.com
Access-Control-Allow-Credentials: true
```

### ❌ Pitfall: Not handling 429 responses

```js
// Blindly retrying immediately after 429 → hits rate limit again → 429 again → infinite loop
```

**Fix:** Read `Retry-After`, wait the specified time, then retry with exponential backoff.

---

## K — Coding Challenge + Solution

### Challenge

You're making API calls to a third-party service and occasionally getting 429. Write a `fetchWithRetry` function that:

1. Retries up to 3 times on 429
2. Reads `Retry-After` header and waits that many seconds
3. Defaults to 60 seconds if `Retry-After` is absent
4. Throws on other errors

### Solution

```js
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function fetchWithRetry(url, options = {}, maxRetries = 3) {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    const res = await fetch(url, options);

    if (res.status === 429) {
      if (attempt === maxRetries)
        throw new Error("Rate limit exceeded. Max retries reached.");
      const retryAfter = parseInt(res.headers.get("Retry-After") || "60");
      console.warn(
        `429 Rate Limited. Waiting ${retryAfter}s before retry ${attempt}/${maxRetries}...`
      );
      await sleep(retryAfter * 1000);
      continue;
    }

    if (!res.ok) throw new Error(`HTTP Error: ${res.status}`);
    return res.json();
  }
}
```

---

---

# 12 — API Documentation

---

## T — TL;DR

Good API docs are the **contract between backend and frontend**. Knowing how to read — and write — API docs makes you faster, reduces miscommunication, and elevates your engineering quality.

---

## K — Key Concepts

### The OpenAPI Specification (Swagger)

OpenAPI is the industry standard for describing REST APIs. It's a YAML or JSON file that documents every endpoint:

```yaml
# openapi.yaml
openapi: 3.0.0
info:
  title: Blog API
  version: 1.0.0

paths:
  /posts:
    get:
      summary: List all posts
      parameters:
        - name: page
          in: query
          schema:
            type: integer
            default: 1
        - name: limit
          in: query
          schema:
            type: integer
            default: 20
      responses:
        "200":
          description: A list of posts
          content:
            application/json:
              schema:
                type: object
                properties:
                  data:
                    type: array
                    items:
                      $ref: "#/components/schemas/Post"
    post:
      summary: Create a post
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: "#/components/schemas/CreatePost"
      responses:
        "201":
          description: Created
        "422":
          description: Validation error
```

### What Every Endpoint Should Document

| Section              | What to Include                                   |
| -------------------- | ------------------------------------------------- |
| **Method + Path**    | `GET /posts/:id`                                  |
| **Description**      | What it does                                      |
| **Path Parameters**  | Name, type, required, description                 |
| **Query Parameters** | Name, type, optional/required, defaults           |
| **Request Body**     | Schema with field types, required fields, example |
| **Response**         | Status codes, response body schema, examples      |
| **Auth**             | Required? Which scheme?                           |
| **Error Responses**  | All error codes and when they occur               |

### A Well-Documented Endpoint (Markdown Format)

### GET /posts/:id

Returns a single blog post by ID.

**Authentication:** Required (Bearer token)

**Path Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| id | integer | ✅ | Post ID |

**Response 200:**

```json
{
  "data": {
    "id": 7,
    "title": "Hello World",
    "content": "...",
    "authorId": 42,
    "createdAt": "2026-05-19T10:00:00Z"
  }
}
```

**Response 404:**

```json
{
  "error": {
    "code": "NOT_FOUND",
    "message": "Post not found"
  }
}
```
````

### Tools for API Documentation

| Tool           | Purpose                           |
| -------------- | --------------------------------- |
| **Swagger UI** | Visual explorer for OpenAPI specs |
| **Postman**    | Test and document APIs            |
| **Insomnia**   | API client with docs              |
| **Redoc**      | Beautiful OpenAPI rendering       |
| **Stoplight**  | Design-first API docs             |

### How to Read API Docs Efficiently

```
1. Find the base URL            → everything is relative to this
2. Check authentication section → Bearer? API key? OAuth?
3. Find the endpoint you need   → use the sidebar/search
4. Check path + query params    → required vs optional
5. Check request body schema    → required fields, types
6. Read ALL response codes      → not just 200
7. Look at examples             → fastest way to understand
```

---

## W — Why It Matters

- Reading and using API docs is a daily frontend skill — every third-party integration (Stripe, Twilio, OpenAI) starts with docs.
- Writing clear API docs (even basic markdown) makes you a better collaborator and teammate.
- OpenAPI/Swagger knowledge is increasingly expected — it enables auto-generated client SDKs, type definitions, and mock servers.
- A well-documented API reduces back-and-forth with backend teammates by 80%.

---

## I — Interview Q&A

### Q1: What is OpenAPI and why does it matter?

**A:** OpenAPI (formerly Swagger) is a standard specification for describing REST APIs in YAML or JSON. It enables auto-generated documentation, mock servers, client SDKs, and type definitions. It's the de facto industry standard for API contracts.

### Q2: What should every API endpoint document?

**A:** The HTTP method and path, description, path and query parameters (with types and required flags), request body schema, all possible response codes with their schemas, authentication requirements, and error response structures.

### Q3: How do you quickly learn a new API?

**A:** Find the base URL, understand the authentication method, search for the specific endpoint, read its required params and request body, then look at the example request/response to understand the actual shape of data. Test in Postman before writing any code.

---

## C — Common Pitfalls + Fix

### ❌ Pitfall: Only reading the 200 success response

```
// Developer reads the happy path only
// Ships code that crashes on 401, 403, 422, 429
```

**Fix:** Read every response code. The error responses are often more important — they tell you how to handle failures gracefully.

### ❌ Pitfall: Guessing field names instead of checking the schema

```js
const name = user.name; // ← what if the API returns user.fullName?
const id = response.userId; // ← what if it's response.id?
```

**Fix:** Always look at the actual response schema in the docs or in the Network tab before writing code that accesses response fields.

### ❌ Pitfall: Not checking auth requirements before calling an endpoint

```
fetch('/api/admin/users')   ← No auth header → 401
// 20 minutes of debugging later: "oh it needs a token"
```

**Fix:** First thing you check in any API docs: **Authentication Required?**

---

## K — Coding Challenge + Solution

### Challenge

Given this incomplete API docs entry, identify what's missing:

```
### POST /users

Creates a new user.

Request Body:
{ "email": "string", "password": "string" }

Response:
201 - User created
```

List at least **6 things** this documentation is missing.

### Solution

```
1. ❌ No authentication requirement stated (is this open or auth-required?)
2. ❌ No field validation rules (min/max length, email format, password requirements)
3. ❌ No indication of which fields are required vs optional
4. ❌ No response body schema for 201 (what does the created user look like? Does it include the ID?)
5. ❌ No error responses documented (422 for validation? 409 for duplicate email?)
6. ❌ No Content-Type header requirement noted in request
7. ❌ No example request/response JSON shown
8. ❌ No description of the returned resource location (Location header? ID in body?)
```

---

---

## ✅ Day 2 Complete — REST Resource Design

| #   | Subtopic                                                     | Status |
| --- | ------------------------------------------------------------ | ------ |
| 1   | Resource Naming with Nouns & Collections vs Single Resources | ☐      |
| 2   | CRUD Mapping to HTTP Methods                                 | ☐      |
| 3   | Path Params vs Query Params                                  | ☐      |
| 4   | Nested Resources                                             | ☐      |
| 5   | Filtering, Sorting & Searching                               | ☐      |
| 6   | Pagination — From Day One                                    | ☐      |
| 7   | Consistent Response Envelopes & Error Object Structure       | ☐      |
| 8   | Validation Basics & Auth Headers                             | ☐      |
| 9   | Authorization Concepts                                       | ☐      |
| 10  | Versioning Strategies                                        | ☐      |
| 11  | Rate Limiting & CORS Awareness                               | ☐      |
| 12  | API Documentation                                            | ☐      |

---

> **Pick subtopic 1. Read the TL;DR and Key Concepts only.**
> That's your one job right now.
>
> _Doing one small thing beats opening a feed._

```

```
