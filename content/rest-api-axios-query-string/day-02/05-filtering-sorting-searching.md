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
