# 6 — FOREIGN KEY — Referential Integrity and Cascade Behaviour

---

## T — TL;DR

A `FOREIGN KEY` constraint ensures that a value in one table's column matches a value in another table's primary (or unique) key — it enforces the relationship between tables. It prevents orphaned rows (orders with no user, comments with no post). Cascade rules (`ON DELETE`, `ON UPDATE`) define what happens to child rows when a parent row is modified or deleted.

---

## K — Key Concepts

```sql
-- ─── Basic FOREIGN KEY
CREATE TABLE users (
  id    BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  email TEXT   NOT NULL UNIQUE
);

CREATE TABLE posts (
  id         BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id    BIGINT NOT NULL REFERENCES users(id),  -- inline FK
  title      TEXT   NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Attempt to insert a post with non-existent user_id
INSERT INTO posts (user_id, title) VALUES (999, 'My Post');
-- ERROR: insert or update on table "posts" violates foreign key constraint
-- Key (user_id)=(999) is not present in table "users"  ✅

-- Cannot delete a user who has posts
DELETE FROM users WHERE id = 1;
-- ERROR: update or delete on table "users" violates foreign key constraint
-- Key (id)=(1) is still referenced from table "posts"  ✅
```

```sql
-- ─── FK with named constraint and explicit column reference
CREATE TABLE comments (
  id      BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  post_id BIGINT NOT NULL,
  user_id BIGINT NOT NULL,
  body    TEXT   NOT NULL,
  CONSTRAINT comments_post_fk  FOREIGN KEY (post_id)  REFERENCES posts(id),
  CONSTRAINT comments_user_fk  FOREIGN KEY (user_id)  REFERENCES users(id)
);
```

```sql
-- ─── ON DELETE and ON UPDATE cascade rules

-- ON DELETE RESTRICT (default) — block deletion if child rows exist
CREATE TABLE orders (
  id      SERIAL PRIMARY KEY,
  user_id INT NOT NULL REFERENCES users(id) ON DELETE RESTRICT
);

-- ON DELETE CASCADE — delete child rows when parent is deleted
CREATE TABLE order_items (
  id       SERIAL PRIMARY KEY,
  order_id INT NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  -- Deleting an order deletes all its items automatically
  sku      TEXT NOT NULL
);

-- ON DELETE SET NULL — set FK column to NULL when parent deleted
CREATE TABLE posts (
  id        SERIAL PRIMARY KEY,
  author_id INT REFERENCES users(id) ON DELETE SET NULL,
  -- If the author account is deleted, post remains with author_id = NULL
  title     TEXT NOT NULL
);
-- Requires the FK column to be nullable (no NOT NULL)

-- ON DELETE SET DEFAULT — set FK column to its DEFAULT value
CREATE TABLE posts (
  id        SERIAL PRIMARY KEY,
  author_id INT NOT NULL DEFAULT 0 REFERENCES users(id) ON DELETE SET DEFAULT,
  -- If author deleted, posts assigned to a system/anonymous user (id=0)
  title     TEXT NOT NULL
);

-- ON DELETE NO ACTION — like RESTRICT but deferred (checked at end of transaction)
-- Allows deleting parent and child in the same transaction if both deleted
```

```sql
-- ─── Cascade decision guide
-- ON DELETE CASCADE    → child has no meaning without parent
--                        (order_items without order, comments without post)
-- ON DELETE SET NULL   → child can exist without the parent
--                        (posts can exist without the author account)
-- ON DELETE RESTRICT   → deletion should be prevented (audit records, invoices)
-- ON DELETE SET DEFAULT → reassign to a default/fallback owner

-- ON UPDATE CASCADE    → when parent PK changes, update FK automatically
--                        (rarely needed with IDENTITY/SERIAL PKs that never change)
```

```sql
-- ─── Self-referencing FK — hierarchical data
CREATE TABLE categories (
  id        SERIAL PRIMARY KEY,
  name      TEXT   NOT NULL,
  parent_id INT    REFERENCES categories(id) ON DELETE SET NULL
  -- parent_id is NULL for top-level categories
);

INSERT INTO categories (name) VALUES ('Electronics');             -- id=1, parent=NULL
INSERT INTO categories (name, parent_id) VALUES ('Phones', 1);  -- id=2, parent=1
INSERT INTO categories (name, parent_id) VALUES ('Laptops', 1); -- id=3, parent=1

-- ─── Deferred FK constraints — for circular references
CREATE TABLE a (
  id  SERIAL PRIMARY KEY,
  b_id INT  -- will reference b
);
CREATE TABLE b (
  id  SERIAL PRIMARY KEY,
  a_id INT REFERENCES a(id) DEFERRABLE INITIALLY DEFERRED
);
ALTER TABLE a ADD CONSTRAINT a_b_fk FOREIGN KEY (b_id) REFERENCES b(id)
  DEFERRABLE INITIALLY DEFERRED;
-- Checked at COMMIT, not at each statement — allows circular insertion
```

```sql
-- ─── FK indexes — not automatic!
-- PostgreSQL automatically creates an index on the REFERENCED column (usually the PK)
-- but does NOT create an index on the REFERENCING FK column

-- ❌ Without this index, DELETE on users scans the entire orders table
-- to find matching user_id values — very slow on large tables

-- ✅ Always add an index on FK columns
CREATE INDEX idx_orders_user_id    ON orders(user_id);
CREATE INDEX idx_posts_author_id   ON posts(author_id);
CREATE INDEX idx_comments_post_id  ON comments(post_id);
-- Rule: every FK column should have an index
```

---

## W — Why It Matters

- Foreign keys are the primary mechanism for maintaining data consistency across tables — without them, you can have `orders` for `user_id = 9999` when no such user exists. Application-level checks have race conditions and can be bypassed by direct SQL access.
- Missing indexes on FK columns is one of the most common PostgreSQL performance mistakes. When you delete a user, PostgreSQL must check all tables with a FK to users to enforce referential integrity — without an index, this is a full table scan. On a table with millions of rows, this can take minutes.
- `ON DELETE CASCADE` is powerful but dangerous — understand its full depth. Cascading through three levels (`users → orders → order_items → invoice_lines`) means deleting one user deletes everything in the chain. Always trace cascade chains before applying.

---

## I — Interview Q&A

### Q: What is the difference between ON DELETE CASCADE and ON DELETE SET NULL?

**A:** `ON DELETE CASCADE` deletes the child rows when the parent is deleted — use it when child rows have no meaning independent of the parent (order items without an order, comments without a post). `ON DELETE SET NULL` sets the FK column to `NULL` when the parent is deleted — use it when the child can exist independently but the relationship becomes empty (a post whose author account was deleted still exists but has no author). The FK column must be nullable for `SET NULL`. Choose based on whether the child records have value after the parent is gone.

### Q: Why do you need to manually create an index on foreign key columns?

**A:** PostgreSQL automatically creates an index on the target of a FK (usually the PK of the referenced table), but does NOT create an index on the source FK column. When enforcing referential integrity (e.g. checking no orders reference a deleted user), PostgreSQL scans the child table's FK column — without an index, this is a sequential scan. On large tables, this makes `DELETE` and `UPDATE` on parent tables extremely slow. As a rule of thumb: every column that is a foreign key should have an index. Most ORMs and migration tools (Prisma, Flyway, Liquibase) create FK indexes automatically; in raw SQL you must do it manually.

---

## C — Common Pitfalls + Fix

### ❌ Not indexing FK columns — slow parent deletes

```sql
-- ❌ No index on user_id — DELETE FROM users scans entire orders table
CREATE TABLE orders (
  id      SERIAL PRIMARY KEY,
  user_id INT NOT NULL REFERENCES users(id),
  total   NUMERIC(10,2)
);
-- Deleting a user triggers full scan of orders table ❌
```

**Fix:**

```sql
-- ✅ Index the FK column
CREATE TABLE orders (
  id      SERIAL PRIMARY KEY,
  user_id INT NOT NULL REFERENCES users(id),
  total   NUMERIC(10,2)
);
CREATE INDEX idx_orders_user_id ON orders(user_id);
```

### ❌ Accidentally triggering deep cascades

```sql
-- ❌ CASCADE chains may delete more than intended
-- users → orders (CASCADE) → order_items (CASCADE) → shipment_lines (CASCADE)
DELETE FROM users WHERE id = 1;
-- Deletes the user AND all their orders AND all order items AND all shipment lines ← may be unintended
```

**Fix:** Understand and document cascade chains. Use `RESTRICT` for sensitive data:

```sql
-- ✅ For financial data — RESTRICT prevents accidental deletion
FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE RESTRICT
-- Must explicitly delete dependent records before deleting the user
```

---

## K — Coding Challenge + Solution

### Challenge

Design a blog schema with proper FKs and cascade rules: `users`, `posts` (each post has one author, on user delete set null), `comments` (each comment has a post and user, on post delete cascade, on user delete set null), `post_tags` junction table (on post delete cascade, on tag delete cascade). Add all FK indexes. Insert test data and delete a post to verify cascade.

### Solution

```sql
CREATE TABLE users (
  id         BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  email      TEXT NOT NULL UNIQUE,
  username   TEXT NOT NULL UNIQUE
);

CREATE TABLE posts (
  id         BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  author_id  BIGINT REFERENCES users(id) ON DELETE SET NULL,  -- nullable for orphan posts
  title      TEXT NOT NULL,
  body       TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_posts_author_id ON posts(author_id);

CREATE TABLE tags (
  id   BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  name TEXT NOT NULL UNIQUE
);

CREATE TABLE comments (
  id         BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  post_id    BIGINT REFERENCES posts(id) ON DELETE CASCADE,   -- delete with post
  author_id  BIGINT REFERENCES users(id) ON DELETE SET NULL,  -- orphan if user deleted
  body       TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_comments_post_id   ON comments(post_id);
CREATE INDEX idx_comments_author_id ON comments(author_id);

CREATE TABLE post_tags (
  post_id BIGINT NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  tag_id  BIGINT NOT NULL REFERENCES tags(id)  ON DELETE CASCADE,
  PRIMARY KEY (post_id, tag_id)
);
CREATE INDEX idx_post_tags_tag_id ON post_tags(tag_id);

-- Seed data
INSERT INTO users (email, username) VALUES ('mark@example.com', 'mark');
INSERT INTO posts (author_id, title, body) VALUES (1, 'First Post', 'Hello world');
INSERT INTO tags  (name) VALUES ('postgresql'), ('tutorial');
INSERT INTO comments (post_id, author_id, body) VALUES (1, 1, 'Great post!'), (1, 1, 'Very helpful');
INSERT INTO post_tags (post_id, tag_id) VALUES (1, 1), (1, 2);

-- Verify data
SELECT COUNT(*) FROM comments;  -- 2
SELECT COUNT(*) FROM post_tags; -- 2

-- Delete the post — cascade should remove comments and post_tags
DELETE FROM posts WHERE id = 1;

SELECT COUNT(*) FROM comments;  -- 0 ← cascaded ✅
SELECT COUNT(*) FROM post_tags; -- 0 ← cascaded ✅
SELECT COUNT(*) FROM tags;      -- 2 ← tags remain ✅
```

---

---
