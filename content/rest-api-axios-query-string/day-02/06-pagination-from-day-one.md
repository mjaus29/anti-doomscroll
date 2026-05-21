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
