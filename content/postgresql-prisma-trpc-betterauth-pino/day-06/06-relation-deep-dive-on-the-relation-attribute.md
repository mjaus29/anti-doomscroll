# 6 — @relation — Deep Dive on the Relation Attribute

---

## T — TL;DR

The `@relation` attribute is the explicit declaration of how two models connect — which fields are the FK (`fields:`), which fields they reference (`references:`), and what happens on delete/update (`onDelete:`, `onUpdate:`). It is required on the FK side of every relation. On the back-relation side, it is optional but required when Prisma can't infer which relation field corresponds to which FK (disambiguation). Named relations use `@relation("name")` on both sides.

---

## K — Key Concepts

```prisma
// ── @relation — full syntax ────────────────────────────────────────────────
model Post {
  userId Int
  user   User @relation(
    name:       "PostAuthor",       // optional: disambiguates multiple relations
    fields:     [userId],           // required: the FK scalar field(s) on this model
    references: [id],               // required: the referenced field(s) on the other model
    onDelete:   Cascade,            // optional: action when referenced row is deleted
    onUpdate:   Cascade,            // optional: action when referenced PK is updated
    map:        "fk_posts_user_id"  // optional: custom FK constraint name in PostgreSQL
  )
}
```

```prisma
// ── fields and references — the FK declaration ────────────────────────────

// Single-column FK (most common)
model Post {
  userId Int
  user   User @relation(fields: [userId], references: [id])
  //           fields: scalar FK on Post = userId
  //           references: the PK on User = id
}

// Composite FK (references a composite PK)
model OrderItem {
  orderId   Int
  productId Int
  order     Order   @relation(fields: [orderId],   references: [id])
  product   Product @relation(fields: [productId], references: [id])
}

// Multi-field composite FK
model UserAction {
  userId   Int
  tenantId Int
  user     User @relation(fields: [userId, tenantId], references: [id, tenantId])
  // PostgreSQL: FOREIGN KEY (user_id, tenant_id) REFERENCES users(id, tenant_id)
}
```

```prisma
// ── onDelete and onUpdate actions ─────────────────────────────────────────
model Post {
  userId Int
  user   User @relation(
    fields:   [userId],
    references: [id],
    onDelete: Cascade,   // delete user → delete posts
    onUpdate: Cascade    // change user.id → update posts.user_id
  )
}

// Action values:
// Cascade    → propagate the delete/update to child rows
// Restrict   → prevent delete/update if child rows exist (default for required FKs)
// SetNull    → set child FK to NULL (FK field must be nullable: Int?)
// SetDefault → set child FK to its default value
// NoAction   → like Restrict but error is deferred until end of transaction

// Defaults (when omitted):
// onDelete: SetNull  if FK is nullable (Int?)
// onDelete: Restrict if FK is required (Int)
// onUpdate: Cascade  (always cascade PK changes by default)
```

```prisma
// ── map — custom FK constraint name ────────────────────────────────────────
model Post {
  userId Int
  user   User @relation(
    fields:     [userId],
    references: [id],
    map:        "fk_posts_users"   // custom name for the FK constraint in PostgreSQL
  )
}

// Default FK name (Prisma auto-generates): posts_user_id_fkey
// Custom name: fk_posts_users
// Useful for: matching existing FK names when introspecting, DBA conventions
```

```prisma
// ── Named relations — disambiguation ──────────────────────────────────────
// Required when: same two models have multiple relations to each other

model User {
  id             Int    @id @default(autoincrement())
  authoredPosts  Post[] @relation("author")
  editedPosts    Post[] @relation("editor")
}

model Post {
  id       Int   @id @default(autoincrement())

  authorId Int
  author   User  @relation("author",  fields: [authorId],  references: [id])

  editorId Int?
  editor   User? @relation("editor",  fields: [editorId],  references: [id])
}

// Rule: the name must match EXACTLY on both sides
// Rule: if you name one side, you must name both sides
```

```prisma
// ── @relation on back-relation side — usually optional ────────────────────
model User {
  id    Int    @id @default(autoincrement())
  posts Post[] // no @relation needed — Prisma infers it
}

// But REQUIRED for disambiguation:
model User {
  id            Int    @id @default(autoincrement())
  authoredPosts Post[] @relation("author")  // ← must name both sides
  editedPosts   Post[] @relation("editor")
}
```

---

## W — Why It Matters

- The `map:` parameter lets you control the FK constraint name in PostgreSQL — useful when migrating an existing database to Prisma, where the FK constraints already have names that you want to preserve. Without `map:`, Prisma generates its own constraint names, which may conflict with existing ones during introspection.
- `onDelete: Restrict` (the default for required relations) is a safety net — it prevents accidentally deleting a parent record that still has children, forcing you to handle child cleanup explicitly. `Cascade` is convenient but dangerous for top-level entities (delete a user account → cascade deletes everything). Choose intentionally.
- Named relations with exact matching on both sides is a strict Prisma requirement — if the names don't match, `prisma generate` throws a validation error. This is one of the most common causes of schema validation failures when refactoring a schema with multiple relations between the same models.

---

## I — Interview Q&A

### Q: When is `@relation` required on the back-relation (non-FK) side of a Prisma relation?

**A:** `@relation` on the back-relation (the array side, the "parent" side) is required in two situations. First, when there are multiple relations between the same two models — Prisma cannot infer which `Post[]` on `User` corresponds to which FK on `Post`, so you must add `@relation("name")` on both sides to disambiguate. Second, when the relation is a self-relation — a model referencing itself always needs named relations because Prisma needs to know which field is the "parent" and which is the "child" side. For simple single relations between two different models, the back-relation side does not need `@relation` — Prisma infers it automatically.

---

## C — Common Pitfalls + Fix

### ❌ Named relation mismatch — name doesn't match on both sides

```prisma
// ❌ "PostAuthor" vs "author" — names don't match → schema validation error
model User {
  posts Post[] @relation("PostAuthor")  // ← "PostAuthor"
}

model Post {
  userId Int
  user   User @relation("author", fields: [userId], references: [id])  // ← "author"
}
// Error: "The relation name 'PostAuthor' on model 'User.posts' is not valid..."
```

**Fix:** Use the exact same name on both sides:

```prisma
// ✅ Same name on both sides
model User {
  posts Post[] @relation("PostAuthor")  // ← "PostAuthor"
}

model Post {
  userId Int
  user   User @relation("PostAuthor", fields: [userId], references: [id])  // ← "PostAuthor"
}
```

---

## K — Coding Challenge + Solution

### Challenge

Create a `Post` model that has THREE separate relations to `User`: (1) `author` — required, cascade on delete; (2) `reviewer` — optional, set null on delete; (3) `approvedBy` — optional, no action on delete. Each relation must use a named `@relation`, proper nullable FK fields for optional relations, appropriate `onDelete` actions, and custom FK constraint names via `map:`. Show the back-relation fields on `User` as well.

### Solution

```prisma
model User {
  id             Int    @id @default(autoincrement())
  email          String @unique

  // Back-relations — all named to disambiguate
  authoredPosts  Post[] @relation("PostAuthor")
  reviewedPosts  Post[] @relation("PostReviewer")
  approvedPosts  Post[] @relation("PostApprover")

  @@map("users")
}

model Post {
  id         Int    @id @default(autoincrement())
  title      String
  status     String @default("draft")
  createdAt  DateTime @default(now()) @map("created_at") @db.Timestamptz

  // Relation 1: author — required, cascade on delete
  authorId   Int    @map("author_id")
  author     User   @relation(
    "PostAuthor",
    fields:     [authorId],
    references: [id],
    onDelete:   Cascade,
    map:        "fk_posts_author_id"
  )

  // Relation 2: reviewer — optional, set null on delete
  reviewerId Int?   @map("reviewer_id")
  reviewer   User?  @relation(
    "PostReviewer",
    fields:     [reviewerId],
    references: [id],
    onDelete:   SetNull,
    map:        "fk_posts_reviewer_id"
  )

  // Relation 3: approvedBy — optional, no action on delete
  approverId Int?   @map("approver_id")
  approvedBy User?  @relation(
    "PostApprover",
    fields:     [approverId],
    references: [id],
    onDelete:   NoAction,
    map:        "fk_posts_approver_id"
  )

  @@index([authorId])
  @@index([reviewerId])
  @@index([approverId])
  @@map("posts")
}
```

---

---
