# 6 — Pagination — take/skip and Cursor-Based

---

## T — TL;DR

Prisma supports two pagination styles. **Offset pagination** uses `take` (LIMIT) and `skip` (OFFSET) — simple but degrades at depth. **Cursor pagination** uses `cursor` + `take` — O(log n) regardless of depth, the correct pattern for infinite scroll or large datasets. Always combine cursor pagination with a stable `orderBy` and a unique tiebreaker field.

---

## K — Key Concepts

```typescript
// ── take and skip — offset pagination ─────────────────────────────────────
// Page 1
const page1 = await prisma.post.findMany({
  where: { isPublished: true },
  orderBy: { createdAt: "desc" },
  take: 20, // LIMIT 20
  skip: 0, // OFFSET 0
});

// Page 2
const page2 = await prisma.post.findMany({
  where: { isPublished: true },
  orderBy: { createdAt: "desc" },
  take: 20,
  skip: 20, // OFFSET 20  (page 2 = skip 1 page worth)
});

// Formula: skip = (pageNumber - 1) * pageSize
// Page N:
const page = (pageNumber: number, pageSize: number) => ({
  take: pageSize,
  skip: (pageNumber - 1) * pageSize,
});

// With total count (for pagination UI showing "Page 5 of 23"):
const [data, total] = await Promise.all([
  prisma.post.findMany({
    where: { isPublished: true },
    orderBy: { createdAt: "desc" },
    ...page(3, 20),
  }),
  prisma.post.count({ where: { isPublished: true } }),
]);
const totalPages = Math.ceil(total / 20);
```

```typescript
// ── Cursor pagination — Prisma's built-in cursor support ──────────────────
// Prisma cursor: uses the @id or @@id field as the cursor anchor

// Page 1 — no cursor
const page1 = await prisma.post.findMany({
  where: { isPublished: true },
  orderBy: { id: "desc" },
  take: 20,
});
// Capture the last id:
const lastId = page1[page1.length - 1]?.id; // e.g. 980

// Page 2 — provide cursor
const page2 = await prisma.post.findMany({
  where: { isPublished: true },
  orderBy: { id: "desc" },
  take: 20,
  cursor: { id: lastId }, // start FROM this id
  skip: 1, // skip the cursor row itself (don't repeat it)
});
// SQL: WHERE id < {lastId} ORDER BY id DESC LIMIT 20  ← O(log n) ✅
```

```typescript
// ── Cursor pagination with non-id sort (createdAt + id tiebreaker) ─────────
// When sorting by a non-unique field, use a compound cursor

// Page 1
const posts = await prisma.post.findMany({
  where: { isPublished: true },
  orderBy: [{ createdAt: "desc" }, { id: "desc" }],
  take: 20,
});
const last = posts[posts.length - 1];
// last.createdAt and last.id are the cursor values

// Page 2 — cursor is the id of the last row (Prisma uses the @id field for cursor)
const page2Posts = await prisma.post.findMany({
  where: { isPublished: true },
  orderBy: [{ createdAt: "desc" }, { id: "desc" }],
  take: 20,
  cursor: { id: last.id }, // Prisma uses id-based cursor internally
  skip: 1,
});
// Note: Prisma's cursor is always an @id (or @@id) — it handles the ordering
// The cursor row is the row with that id, and Prisma finds the next batch after it
```

```typescript
// ── Backward pagination — take negative ────────────────────────────────────
// Negative take fetches rows BEFORE the cursor (backward in the result set)
const previousPage = await prisma.post.findMany({
  where: { isPublished: true },
  orderBy: [{ createdAt: "desc" }, { id: "desc" }],
  take: -20, // negative = go BACKWARD from cursor
  cursor: { id: firstIdOnCurrentPage },
  skip: 1,
});
// Returns the 20 posts BEFORE the current page ✅
```

```typescript
// ── hasNextPage pattern ───────────────────────────────────────────────────
// Fetch one extra row to determine if there are more results
const items = await prisma.post.findMany({
  where: { isPublished: true },
  orderBy: { id: "desc" },
  take: 21, // fetch pageSize + 1
  cursor: cursor ? { id: cursor } : undefined,
  skip: cursor ? 1 : 0,
});

const hasNextPage = items.length > 20;
const data = hasNextPage ? items.slice(0, 20) : items;
const nextCursor = hasNextPage ? data[data.length - 1].id : null;

return { data, hasNextPage, nextCursor };
```

```typescript
// ── When to use offset vs cursor ───────────────────────────────────────────
// Offset (take + skip):
//   ✅ Small datasets (< 10,000 rows)
//   ✅ "Jump to page N" navigation required
//   ✅ Simple admin tables
//   ❌ Large datasets — O(offset) scan degrades at depth
//   ❌ Infinite scroll — concurrent inserts cause duplicate/skipped rows

// Cursor (cursor + take):
//   ✅ Large datasets — O(log n) at any depth
//   ✅ Infinite scroll, social feeds
//   ✅ Stable under concurrent inserts
//   ❌ No "jump to page N" — sequential only
//   ❌ More complex to implement
```

---

## W — Why It Matters

- `skip: 1` with cursor is not a bug — Prisma's cursor points to an existing row; the query starts at that row and `skip: 1` moves past it to the actual next page. Without `skip: 1`, the cursor row appears at the start of every page.
- Fetching `take: pageSize + 1` and checking if the result has more than `pageSize` items is the standard "hasNextPage" trick — you never need a separate `COUNT(*)` query to know if the next page exists. If you got 21 items when you asked for 21, there are more.
- The Prisma cursor is always id-based (uses the `@id` or `@@id` field) — even when sorting by `createdAt`, Prisma stores the cursor as `{ id: lastId }` and internally resolves the position. This means you can safely pass the cursor as a simple integer to the frontend, not a complex encoded object.

---

## I — Interview Q&A

### Q: What is the performance difference between offset pagination and cursor pagination, and when should you choose each?

**A:** Offset pagination with `skip` translates to SQL `OFFSET n`. PostgreSQL must scan and discard the first `n` rows before returning the next page — this is O(n) work that grows linearly with the page number. At page 1000 with 20 items per page, PostgreSQL processes 20,000 rows to return 20. Cursor pagination uses `WHERE id < lastId ORDER BY id DESC LIMIT 20` — PostgreSQL uses the B-tree index to jump directly to the cursor position, making it O(log n) regardless of page depth. Choose offset when: the dataset is small, users need to jump to a specific page number, or data rarely changes. Choose cursor when: the table is large, you're building infinite scroll or sequential navigation, or data changes frequently (offset pagination shows duplicates or skips rows when records are inserted between page fetches).

---

## C — Common Pitfalls + Fix

### ❌ Cursor pagination without `skip: 1` — cursor row appears twice

```typescript
// ❌ Missing skip — the cursor row shows up at the start of every page
const page2 = await prisma.post.findMany({
  orderBy: { id: "desc" },
  take: 20,
  cursor: { id: lastId },
  // skip:  1   ← forgot this!
});
// First item of page2 is the same as the last item of page1 — duplicate ❌
```

**Fix:** Always add `skip: 1` when using cursor:

```typescript
// ✅ skip: 1 moves past the cursor row
const page2 = await prisma.post.findMany({
  orderBy: { id: "desc" },
  take: 20,
  cursor: { id: lastId },
  skip: 1, // skip the cursor row ✅
});
```

---

## K — Coding Challenge + Solution

### Challenge

Build a reusable `paginate` utility function that works for both offset and cursor modes. It should accept a `PrismaModel`, `where`, `orderBy`, `select`/`include`, and either `{ page, pageSize }` (offset) or `{ cursor, pageSize }` (cursor). Return `{ data, total?, hasNextPage, nextCursor? }`. Demonstrate usage with `prisma.post` for both modes.

### Solution

```typescript
import { prisma } from "@/lib/prisma";

// ── Offset pagination helper ───────────────────────────────────────────────
interface OffsetPaginationInput<TWhereInput, TOrderBy, TSelect> {
  model: any; // prisma.post, prisma.user etc.
  where?: TWhereInput;
  orderBy?: TOrderBy | TOrderBy[];
  select?: TSelect;
  page: number;
  pageSize: number;
}

interface OffsetPaginationResult<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
}

async function paginateOffset<T>(
  model: { findMany: Function; count: Function },
  options: {
    where?: any;
    orderBy?: any;
    select?: any;
    include?: any;
    page: number;
    pageSize: number;
  }
): Promise<OffsetPaginationResult<T>> {
  const { where, orderBy, select, include, page, pageSize } = options;
  const skip = (page - 1) * pageSize;

  const [data, total] = await Promise.all([
    model.findMany({
      where,
      orderBy,
      ...(select ? { select } : {}),
      ...(include ? { include } : {}),
      take: pageSize,
      skip,
    }),
    model.count({ where }),
  ]);

  const totalPages = Math.ceil(total / pageSize);

  return {
    data,
    total,
    page,
    pageSize,
    totalPages,
    hasNextPage: page < totalPages,
    hasPrevPage: page > 1,
  };
}

// ── Cursor pagination helper ───────────────────────────────────────────────
interface CursorPaginationResult<T> {
  data: T[];
  hasNextPage: boolean;
  nextCursor: number | null;
}

async function paginateCursor<T extends { id: number }>(
  model: { findMany: Function },
  options: {
    where?: any;
    orderBy?: any;
    select?: any;
    include?: any;
    cursor?: number | null;
    pageSize: number;
  }
): Promise<CursorPaginationResult<T>> {
  const { where, orderBy, select, include, cursor, pageSize } = options;

  const items = (await model.findMany({
    where,
    orderBy,
    ...(select ? { select } : {}),
    ...(include ? { include } : {}),
    take: pageSize + 1,
    ...(cursor != null ? { cursor: { id: cursor }, skip: 1 } : {}),
  })) as T[];

  const hasNextPage = items.length > pageSize;
  const data = hasNextPage ? items.slice(0, pageSize) : items;
  const nextCursor = hasNextPage ? data[data.length - 1].id : null;

  return { data, hasNextPage, nextCursor };
}

// ── Usage examples ────────────────────────────────────────────────────────

// Offset mode (admin table with page numbers)
async function getPostsPage(page: number) {
  return paginateOffset(prisma.post, {
    where: { isPublished: true },
    orderBy: { createdAt: "desc" },
    select: { id: true, title: true, createdAt: true },
    page,
    pageSize: 20,
  });
}
// Returns: { data, total, page, totalPages, hasNextPage, hasPrevPage }

// Cursor mode (infinite scroll feed)
async function getPostsFeed(cursor?: number) {
  return paginateCursor(prisma.post, {
    where: { isPublished: true },
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    select: { id: true, title: true, createdAt: true, slug: true },
    cursor: cursor ?? null,
    pageSize: 20,
  });
}
// Returns: { data, hasNextPage, nextCursor }

export { paginateOffset, paginateCursor, getPostsPage, getPostsFeed };
```

---

---
