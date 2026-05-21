# 8 — Pagination Patterns — OFFSET vs Cursor-Based

---

## T — TL;DR

`LIMIT / OFFSET` pagination is simple but gets exponentially slower as the page number grows — `OFFSET 100000` scans and discards 100,000 rows before returning the next 20. **Cursor-based pagination** (keyset pagination) uses `WHERE id > last_seen_id LIMIT n` — it's `O(log n)` regardless of page depth and is the correct pattern for production APIs.

---

## K — Key Concepts

```sql
-- ─── OFFSET pagination — simple, but degrades at depth
-- Page 1
SELECT id, name, created_at FROM posts ORDER BY created_at DESC LIMIT 20 OFFSET 0;
-- Page 2
SELECT id, name, created_at FROM posts ORDER BY created_at DESC LIMIT 20 OFFSET 20;
-- Page 100
SELECT id, name, created_at FROM posts ORDER BY created_at DESC LIMIT 20 OFFSET 1980;
-- PostgreSQL scans 2000 rows and discards the first 1980 to return 20 ❌

-- At OFFSET 100,000:
-- Scans 100,020 rows, returns 20 — O(offset) cost ← unusable at scale
```

```sql
-- ─── Cursor-based pagination — O(log n) regardless of depth
-- Uses WHERE to skip to the right position via an indexed column

-- First page (no cursor)
SELECT id, title, created_at
FROM posts
WHERE is_published = true
ORDER BY created_at DESC, id DESC   -- secondary sort on id for stability
LIMIT 20;
-- Returns rows, capture the last row's (created_at, id):
-- last_created_at = '2025-06-10 14:30:00+08'
-- last_id = 42

-- Next page (pass cursor values from last row)
SELECT id, title, created_at
FROM posts
WHERE is_published = true
  AND (created_at, id) < ('2025-06-10 14:30:00+08', 42)  -- row tuple comparison
ORDER BY created_at DESC, id DESC
LIMIT 20;

-- PostgreSQL uses the index on (created_at DESC, id DESC) and starts EXACTLY
-- after the cursor position — no rows scanned and discarded ✅
```

```sql
-- ─── Index supporting cursor pagination
-- The index must match the ORDER BY columns exactly
CREATE INDEX idx_posts_pagination
  ON posts(is_published, created_at DESC, id DESC)
  WHERE is_published = true;  -- partial: only published posts

-- Or without partial (when is_published is not in ORDER BY):
CREATE INDEX idx_posts_created_id
  ON posts(created_at DESC, id DESC);
-- Works for: ORDER BY created_at DESC, id DESC
-- EXPLAIN shows: Index Scan using idx_posts_created_id ✅
```

```sql
-- ─── Cursor with simple integer ID — easiest form
-- For tables where id is naturally ordered by creation time:
-- (BIGINT GENERATED ALWAYS AS IDENTITY is sequential)

-- First page
SELECT id, title FROM posts ORDER BY id DESC LIMIT 20;
-- Returns last_id = 980 (the 20th row)

-- Next page
SELECT id, title FROM posts WHERE id < 980 ORDER BY id DESC LIMIT 20;
-- Uses the PK index — O(log n), instant at any depth ✅

-- This pattern is returned as { data: [...], nextCursor: 980 } in the API response
```

```sql
-- ─── Bidirectional cursor (forward + backward)
-- Forward: WHERE (created_at, id) < (cursor_created_at, cursor_id)
-- Backward: WHERE (created_at, id) > (cursor_created_at, cursor_id) ORDER BY ... ASC → REVERSE

-- Stable sort: always include a tie-breaker (id) when the primary sort column
-- (created_at) is not unique — otherwise cursor position is ambiguous

-- ─── Returning total count separately (for pagination UI)
-- Cursor pagination doesn't give "page 5 of 200" — it gives "next" only
-- For a count display: run a separate COUNT(*) query with only the filter (no LIMIT/ORDER)
SELECT COUNT(*) FROM posts WHERE is_published = true;
-- Cache this count; it doesn't need to be exact for UX purposes
```

```sql
-- ─── OFFSET pagination trade-offs
-- Pros: simple, supports "go to page N", easy to implement
-- Cons: O(offset) — slow at depth, inconsistent (inserted rows shift pages)

-- OFFSET is acceptable when:
-- Total rows < ~10,000 (offset cost is negligible)
-- You need "go to page N" navigation
-- Data rarely changes (no shifting pages)

-- Cursor is required when:
-- Table is large (millions of rows)
-- Users scroll infinitely (social feed, search results)
-- Data changes frequently (offset-based shows duplicates/gaps on refresh)

-- ─── API response shape for cursor pagination
-- {
--   "data": [...20 items...],
--   "pagination": {
--     "hasNextPage": true,
--     "nextCursor": "eyJjcmVhdGVkX2F0IjoiMjAyNS0wNi0xMCJ9"  ← base64 encoded JSON
--   }
-- }
-- Opaque cursor: encode (created_at, id) as base64 JSON so clients can't manipulate it
```

---

## W — Why It Matters

- `OFFSET 10000 LIMIT 20` on a 5M-row table takes seconds — it's a full scan of 10,020 rows on every request. At page 500 of a mobile infinite-scroll feed, every scroll triggers a second+ query. This kills both performance and user experience.
- Cursor pagination is stable under concurrent inserts — `OFFSET`-based pagination shows the same post twice (or skips a post) when a new post is inserted between page fetches. Cursor pagination always continues exactly from where it left off.
- The "encode cursor as opaque base64" pattern is an API design best practice — clients should not be able to construct cursors manually, and the cursor format can change (add more fields) without breaking the client interface.

---

## I — Interview Q&A

### Q: What is the performance problem with OFFSET pagination and how does cursor-based pagination solve it?

**A:** `OFFSET n` instructs PostgreSQL to find and discard the first `n` rows before returning the next page. Even with an index, this is `O(n)` work — at page 1000 with 20 items per page, PostgreSQL processes 20,000 rows and returns 20. Performance degrades linearly with page depth. Cursor-based pagination replaces `OFFSET` with a `WHERE` condition using the last seen row's value: `WHERE (created_at, id) < (last_created_at, last_id) ORDER BY created_at DESC, id DESC LIMIT 20`. PostgreSQL uses the B-tree index to jump directly to the cursor position — it's `O(log n)` regardless of how many pages deep the user is. The trade-off: cursor pagination doesn't support random page access ("jump to page 50") — it's sequential navigation only.

---

## C — Common Pitfalls + Fix

### ❌ Cursor pagination without a tie-breaking secondary sort — unstable cursor

```sql
-- ❌ created_at is not unique — multiple posts at same timestamp
SELECT id, title FROM posts WHERE created_at < '2025-06-10 14:30:00' ORDER BY created_at DESC LIMIT 20;
-- If 5 posts share that exact timestamp, cursor position is ambiguous → skip/duplicate posts ❌
```

**Fix:** Always add a secondary unique sort key (id):

```sql
-- ✅ (created_at, id) together is unique — stable cursor
SELECT id, title
FROM posts
WHERE (created_at, id) < ('2025-06-10 14:30:00+08', 42)
ORDER BY created_at DESC, id DESC
LIMIT 20;
```

---

## K — Coding Challenge + Solution

### Challenge

Implement both pagination styles for a `posts` table (`id`, `title`, `author_id`, `is_published`, `created_at`). (1) OFFSET pagination function for page N with a configurable page size, (2) cursor-based pagination using `(created_at, id)` as the cursor, returning the next cursor value. Include the supporting index. Show an example of three "page" fetches.

### Solution

```sql
-- ─── Schema
CREATE TABLE posts (
  id           BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  title        TEXT        NOT NULL,
  author_id    BIGINT      NOT NULL,
  is_published BOOLEAN     NOT NULL DEFAULT false,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Seed
INSERT INTO posts (title, author_id, is_published, created_at) VALUES
  ('Post 1', 1, true,  now() - INTERVAL '10 days'),
  ('Post 2', 1, true,  now() - INTERVAL '9 days'),
  ('Post 3', 2, true,  now() - INTERVAL '8 days'),
  ('Post 4', 1, false, now() - INTERVAL '7 days'),
  ('Post 5', 2, true,  now() - INTERVAL '6 days'),
  ('Post 6', 1, true,  now() - INTERVAL '5 days'),
  ('Post 7', 2, true,  now() - INTERVAL '4 days');

-- Supporting index for cursor pagination
CREATE INDEX idx_posts_cursor ON posts(is_published, created_at DESC, id DESC)
  WHERE is_published = true;

-- ─── (1) OFFSET pagination
-- Page 1 (page=1, size=3)
SELECT id, title, created_at
FROM posts
WHERE is_published = true
ORDER BY created_at DESC
LIMIT 3 OFFSET 0;

-- Page 2 (page=2, size=3)
SELECT id, title, created_at
FROM posts
WHERE is_published = true
ORDER BY created_at DESC
LIMIT 3 OFFSET 3;

-- ─── (2) Cursor-based pagination
-- Page 1: no cursor
SELECT id, title, created_at
FROM posts
WHERE is_published = true
ORDER BY created_at DESC, id DESC
LIMIT 3;
-- Returns: Post 7 (id=7), Post 6 (id=6), Post 5 (id=5)
-- Cursor = last row: created_at of Post 5, id = 5

-- Page 2: cursor = (Post 5's created_at, id=5)
SELECT id, title, created_at
FROM posts
WHERE is_published = true
  AND (created_at, id) < (now() - INTERVAL '6 days', 5)
ORDER BY created_at DESC, id DESC
LIMIT 3;
-- Returns: Post 3 (id=3), Post 2 (id=2), Post 1 (id=1)
-- Cursor = last row: created_at of Post 1, id = 1

-- Page 3: cursor = (Post 1's created_at, id=1) → no more rows
SELECT id, title, created_at
FROM posts
WHERE is_published = true
  AND (created_at, id) < (now() - INTERVAL '10 days', 1)
ORDER BY created_at DESC, id DESC
LIMIT 3;
-- Returns: 0 rows → hasNextPage = false ✅

-- ─── Reusable cursor pagination query (parameterised)
-- $1 = cursor_created_at (NULL for first page)
-- $2 = cursor_id (NULL for first page)
-- $3 = page_size
SELECT id, title, created_at
FROM posts
WHERE is_published = true
  AND (
    $1::TIMESTAMPTZ IS NULL          -- first page: no cursor
    OR (created_at, id) < ($1::TIMESTAMPTZ, $2::BIGINT)
  )
ORDER BY created_at DESC, id DESC
LIMIT $3;
```

---

---
