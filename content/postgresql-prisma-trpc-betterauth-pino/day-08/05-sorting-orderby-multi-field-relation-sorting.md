# 5 — Sorting — orderBy, Multi-field, Relation Sorting

---

## T — TL;DR

`orderBy` sorts query results. It accepts a single object (one field) or an array (multiple fields in priority order). Sort direction is `'asc'` or `'desc'`. Prisma supports sorting by scalar fields, by relation aggregate (e.g. sort users by their post count), and by sorting `null` values to the top or bottom with `nulls: 'first' | 'last'`.

---

## K — Key Concepts

```typescript
// ── Single field sort ──────────────────────────────────────────────────────
const posts = await prisma.post.findMany({
  orderBy: { createdAt: "desc" }, // newest first
});

const users = await prisma.user.findMany({
  orderBy: { name: "asc" }, // alphabetical
});
```

```typescript
// ── Multi-field sort — array of sort criteria (priority order) ─────────────
const orders = await prisma.order.findMany({
  orderBy: [
    { status: "asc" }, // primary sort: by status
    { createdAt: "desc" }, // secondary sort: newest within same status
  ],
});
// SQL: ORDER BY status ASC, created_at DESC
// Use an ARRAY for multi-field — not a single object with multiple keys
// (object key order is not guaranteed in JavaScript)
```

```typescript
// ── Handling nulls in sort order ───────────────────────────────────────────
const tasks = await prisma.task.findMany({
  orderBy: {
    dueDate: {
      sort: "asc",
      nulls: "last", // NULL due dates go to the end ✅ (common for "no deadline")
    },
  },
});

const posts = await prisma.post.findMany({
  orderBy: {
    publishedAt: {
      sort: "desc",
      nulls: "first", // unpublished posts (null publishedAt) appear first
    },
  },
});
// SQL: ORDER BY published_at DESC NULLS FIRST
```

```typescript
// ── Sort by relation field — scalar field of a related model ───────────────
const posts = await prisma.post.findMany({
  orderBy: {
    author: { name: "asc" }, // sort posts by their author's name
  },
  // SQL: ORDER BY (SELECT name FROM users WHERE users.id = posts.author_id) ASC
});

const orderItems = await prisma.orderItem.findMany({
  orderBy: {
    product: { name: "asc" }, // sort order items by product name
  },
});
```

```typescript
// ── Sort by relation aggregate — e.g. sort by post count ──────────────────
const usersByPostCount = await prisma.user.findMany({
  orderBy: {
    posts: { _count: "desc" }, // sort users by number of posts (most first)
  },
});
// SQL equivalent: ORDER BY (SELECT COUNT(*) FROM posts WHERE posts.author_id = users.id) DESC
```

```typescript
// ── Sort with relevance — full-text search relevance ──────────────────────
// Prisma supports relevance sorting for string fields (uses ts_rank internally)
// Requires: orderBy with _relevance (PostgreSQL only, preview in some versions)
// If not available: use $queryRaw with ts_rank (covered in Day 7)

// Common pattern: sort by relevance for search results + date fallback
const searchResults = await prisma.post.findMany({
  where: {
    OR: [
      { title: { contains: "prisma", mode: "insensitive" } },
      { body: { contains: "prisma", mode: "insensitive" } },
    ],
  },
  orderBy: [
    {
      _relevance: {
        fields: ["title", "body"],
        search: "prisma",
        sort: "desc",
      },
    },
    { createdAt: "desc" }, // fallback: newer posts first
  ],
});
```

```typescript
// ── Combining sort with cursor pagination ──────────────────────────────────
// Always include a tiebreaker (unique field) as secondary sort for stable cursors
const page1 = await prisma.post.findMany({
  orderBy: [
    { createdAt: "desc" },
    { id: "desc" }, // tiebreaker — ensures stable cursor position
  ],
  take: 20,
});

// Cursor to next page
const lastPost = page1[page1.length - 1];
const page2 = await prisma.post.findMany({
  orderBy: [{ createdAt: "desc" }, { id: "desc" }],
  cursor: { id: lastPost.id },
  skip: 1, // skip the cursor row itself
  take: 20,
});
```

---

## W — Why It Matters

- `nulls: 'first' | 'last'` is a PostgreSQL-level capability that Prisma exposes directly. Without it, PostgreSQL's default behavior is `NULLS LAST` for `ASC` and `NULLS FIRST` for `DESC` — often the opposite of what you want for UI display (e.g. tasks with no due date should appear at the bottom, not the top).
- Sorting by relation aggregate (`posts: { _count: 'desc' }`) generates a correlated subquery — it's expressive but can be slow on large datasets. For performance-critical sort-by-count operations, maintain a denormalized `postsCount` field on the user and sort by that instead.
- The tiebreaker in multi-field sort is essential for cursor-based pagination — if two rows have the same primary sort value (e.g. same `createdAt` timestamp), the cursor's position is ambiguous without a secondary unique sort key (`id`). Always add `{ id: 'desc' }` as the last sort criterion when building paginated queries.

---

## I — Interview Q&A

### Q: How do you sort results by a field on a related model in Prisma?

**A:** Use `orderBy` with a nested object referencing the relation name and the field to sort on: `orderBy: { author: { name: 'asc' } }`. This sorts the parent records (e.g. posts) by a scalar field on the related model (e.g. the author's name). Prisma generates the appropriate SQL — typically a correlated subquery or a join depending on the query engine strategy. For sorting by the count of related records, use `orderBy: { posts: { _count: 'desc' } }`, which sorts users by how many posts they have. Note that both patterns involve a subquery for each row and can be slow on large datasets — for frequently-used sort orders, consider maintaining a denormalized count column and sorting by that instead.

---

## C — Common Pitfalls + Fix

### ❌ Using an object with multiple keys for multi-field sort — order not guaranteed

```typescript
// ❌ Object key order is not guaranteed in JavaScript
// This may or may not produce the intended primary/secondary sort
const posts = await prisma.post.findMany({
  orderBy: {
    status: "asc",
    createdAt: "desc", // which is primary? undefined behavior ❌
  },
});
```

**Fix:** Use an array for multi-field sort — array order IS guaranteed:

```typescript
// ✅ Array: first element = primary sort, last element = final tiebreaker
const posts = await prisma.post.findMany({
  orderBy: [
    { status: "asc" }, // primary: alphabetical status
    { createdAt: "desc" }, // secondary: newest within same status
    { id: "desc" }, // tiebreaker: stable cursor pagination
  ],
});
```

---

## K — Coding Challenge + Solution

### Challenge

Write four sort queries: (1) `getTopContributors` — sort users by their post count descending, then by name ascending; (2) `getPendingTasksByPriority` — sort tasks where `dueDate` can be null (nulls last), primary sort by due date ascending, secondary by priority; (3) `getProductsByPopularity` — sort products by order item count descending; (4) `getPostsByAuthorAndDate` — sort posts by author name ascending then post date descending. Show `orderBy` syntax for all four.

### Solution

```typescript
import { prisma } from "@/lib/prisma";

// ── (1) Top contributors — sort by post count then name ───────────────────
async function getTopContributors(limit = 10) {
  return prisma.user.findMany({
    where: { isActive: true },
    select: {
      id: true,
      name: true,
      _count: { select: { posts: true } },
    },
    orderBy: [
      { posts: { _count: "desc" } }, // most posts first
      { name: "asc" }, // alphabetical tiebreaker
    ],
    take: limit,
  });
}

// ── (2) Pending tasks — null due dates last, then priority ────────────────
async function getPendingTasksByPriority(userId: number) {
  return prisma.task.findMany({
    where: {
      assigneeId: userId,
      completedAt: null,
    },
    select: {
      id: true,
      title: true,
      priority: true,
      dueDate: true,
    },
    orderBy: [
      {
        dueDate: {
          sort: "asc",
          nulls: "last", // tasks with no due date go to the bottom
        },
      },
      { priority: "asc" }, // within same due date: priority order
      { id: "asc" }, // stable tiebreaker
    ],
  });
}

// ── (3) Products by popularity (order item count) ─────────────────────────
async function getProductsByPopularity(limit = 20) {
  return prisma.product.findMany({
    where: { isActive: true },
    select: {
      id: true,
      name: true,
      price: true,
      _count: { select: { orderItems: true } },
    },
    orderBy: [
      { orderItems: { _count: "desc" } }, // most ordered first
      { name: "asc" }, // alphabetical tiebreaker
    ],
    take: limit,
  });
}

// ── (4) Posts sorted by author name then date ─────────────────────────────
async function getPostsByAuthorAndDate() {
  return prisma.post.findMany({
    where: { isPublished: true },
    include: {
      author: { select: { name: true } },
    },
    orderBy: [
      { author: { name: "asc" } }, // sort by related model field
      { createdAt: "desc" }, // then newest within same author
      { id: "desc" }, // stable tiebreaker
    ],
  });
}

export {
  getTopContributors,
  getPendingTasksByPriority,
  getProductsByPopularity,
  getPostsByAuthorAndDate,
};
```

---

---
