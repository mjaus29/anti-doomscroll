# 📅 Day 6 — Prisma Relations and Migrations

> **Goal:** Master every Prisma relation type (one-to-one, one-to-many, many-to-many) and the full migration workflow — from writing your first migration to iterating safely in production. Understand `@relation`, relation modes, and how Prisma translates model relations into foreign keys and join tables.
> **Format:** Each subtopic = 5–15 min. Do one. Stop. Come back.
> **Stack:** Prisma ORM 7.x · PostgreSQL 18 · TypeScript 6 · Node.js

---

## 📋 Day 6 Subtopic Overview

| #   | Subtopic                                                  | Time   |
| --- | --------------------------------------------------------- | ------ |
| 1   | Relations — Core Concepts and How Prisma Models Them      | 12 min |
| 2   | One-to-Many Relations — The Most Common Relation          | 12 min |
| 3   | One-to-One Relations — Exclusive Ownership                | 12 min |
| 4   | Explicit Many-to-Many — Junction Tables with Extra Fields | 12 min |
| 5   | Implicit Many-to-Many — Prisma-Managed Join Tables        | 10 min |
| 6   | @relation — Deep Dive on the Relation Attribute           | 12 min |
| 7   | Relation Modes — foreignKeys vs prisma                    | 10 min |
| 8   | Initial Migration — prisma migrate dev from Zero          | 12 min |
| 9   | Iterative Migration Workflow — Evolving the Schema Safely | 12 min |
| 10  | Migration History, Squashing, and Production Deploy       | 12 min |

---

---

# 1 — Relations — Core Concepts and How Prisma Models Them

---

## T — TL;DR

A relation in Prisma connects two models. Every relation has two sides: one side holds the **foreign key field** (the scalar `userId Int` column), and the other holds the **relation field** (the virtual `user User` navigation property). Prisma needs both sides declared to generate correct TypeScript types and SQL JOINs. Understanding the anatomy of a relation — which side owns the FK, which side is virtual — is the foundation for all three relation types.

---

## K — Key Concepts

```
── The anatomy of any Prisma relation ────────────────────────────────────────

Two models connected by a relation always have:

  Model A (the "child" / FK owner)         Model B (the "parent")
  ─────────────────────────────────        ──────────────────────
  userId    Int           ← scalar FK      id    Int @id
  user      User @relation(...)  ← virtual users User[] ← virtual back-relation

  "userId" is the REAL column in Model A's table.
  "user"   is a VIRTUAL navigation field — no DB column.
  "users"  is a VIRTUAL back-relation on Model B — no DB column.

Rule: exactly one side of the relation holds the FK scalar field.
Rule: both sides need a virtual relation field for Prisma to navigate the link.
```

```prisma
// ── The two sides of a relation ────────────────────────────────────────────

model Post {
  id     Int  @id @default(autoincrement())

  // ── FK side (owns the actual foreign key column) ──────────────────────
  userId Int                                       // REAL column: user_id
  user   User @relation(fields: [userId], references: [id])  // VIRTUAL
  //           ↑ fields:     = the FK scalar on THIS model
  //             references: = the PK on the OTHER model
}

model User {
  id    Int    @id @default(autoincrement())

  // ── Back-relation side (no FK column here) ────────────────────────────
  posts Post[]  // VIRTUAL — Prisma-only, no DB column
}
```

```
── Three relation types and where the FK lives ───────────────────────────────

Relation type       │ FK lives on        │ Cardinality
────────────────────┼────────────────────┼─────────────────────────────────
One-to-many (1:N)   │ the "many" side    │ one User → many Posts
One-to-one  (1:1)   │ either side        │ one User → one Profile
Many-to-many (M:N)  │ join table         │ many Posts ↔ many Tags

Implicit M:N: Prisma creates and manages the join table automatically
Explicit M:N: you declare the join table as a model (needed for extra fields)
```

```prisma
// ── Self-relations — a model referencing itself ────────────────────────────
model Employee {
  id         Int        @id @default(autoincrement())
  name       String

  // Self-referencing: an employee has one manager (also an Employee)
  managerId  Int?
  manager    Employee?  @relation("reports", fields: [managerId], references: [id])
  reports    Employee[] @relation("reports")
  // Named relation "reports" required to disambiguate the self-reference
}

// ── Multi-field relations — composite FK ──────────────────────────────────
model UserAction {
  userId   Int
  tenantId Int

  // FK references composite PK on User
  user     User @relation(fields: [userId, tenantId], references: [id, tenantId])
}
```

```
── Prisma Client relation loading ────────────────────────────────────────────

By default, Prisma does NOT load relations (lazy-loading doesn't exist in Prisma)
You must explicitly request related data:

Option 1: include — load the full related model
  prisma.user.findUnique({
    where: { id: 1 },
    include: { posts: true }         // loads all Post fields
  })
  Return type: User & { posts: Post[] }

Option 2: select with nested select — load specific fields from relation
  prisma.user.findUnique({
    where: { id: 1 },
    select: {
      email: true,
      posts: {
        select: { id: true, title: true }
      }
    }
  })
  Return type: { email: string; posts: { id: number; title: string }[] }

Option 3: separate queries — explicitly join in application
  const user = await prisma.user.findUnique({ where: { id: 1 } })
  const posts = await prisma.post.findMany({ where: { userId: 1 } })
```

---

## W — Why It Matters

- The virtual vs real field distinction is where most Prisma beginners get confused — they try to include the relation navigation field (`user User`) in a `select` and wonder why there's no `user` column in the database. The column is `userId` (the scalar FK). The `user` field is purely a Prisma query-time navigation helper.
- Every relation in Prisma generates TypeScript types that reflect the relation structure — `include: { posts: true }` changes the return type from `User` to `User & { posts: Post[] }`. This is how Prisma provides full type safety for nested queries without requiring runtime type assertions.
- Self-relations and named relations (`@relation("name")`) are required any time a model has more than one relation to the same other model — Prisma needs the name to disambiguate which relation is which.

---

## I — Interview Q&A

### Q: In Prisma, what is the difference between a scalar foreign key field and a relation field?

**A:** A scalar foreign key field (e.g. `userId Int`) is a real database column — it stores the integer ID that links this row to a row in another table. A relation field (e.g. `user User`) is a virtual Prisma construct — it exists only in the Prisma schema to express the navigation from one model to another. It does not become a column in the database. The `@relation` attribute on the relation field connects the two: `@relation(fields: [userId], references: [id])` tells Prisma that the virtual `user` field is navigated via the scalar `userId` column pointing to the `id` column of the `User` model. When you use `include: { user: true }` in a query, Prisma translates this into a SQL JOIN using the `userId` column — the relation field itself is just the instruction for how to build that JOIN.

---

## C — Common Pitfalls + Fix

### ❌ Declaring a relation field without the scalar FK field

```prisma
// ❌ Missing the scalar FK field — Prisma cannot generate the migration
model Post {
  id   Int  @id @default(autoincrement())
  user User @relation(fields: [userId], references: [id])
  // ERROR: userId is referenced in @relation but not declared as a field
}
```

**Fix:** Always declare both the scalar FK field AND the relation field:

```prisma
// ✅ Both the scalar FK and the relation field
model Post {
  id     Int  @id @default(autoincrement())
  userId Int                                       // ← scalar FK (real column)
  user   User @relation(fields: [userId], references: [id])  // ← virtual
}
```

---

## K — Coding Challenge + Solution

### Challenge

Design the relation structure for a blog platform with: `User`, `Post`, `Comment`, and `Tag`. Rules: (1) a User has many Posts; (2) a Post has many Comments; (3) a Comment belongs to both a User and a Post; (4) Posts and Tags are many-to-many (implicit). For each relation, identify: which model holds the FK scalar field, what the virtual fields are named, and which side is the "parent". No `@@map` or `@map` needed yet — focus on relation structure only.

### Solution

```prisma
// Relation structure analysis:
// User → Post   (1:N) — FK: Post.userId
// Post → Comment (1:N) — FK: Comment.postId
// User → Comment (1:N) — FK: Comment.userId
// Post ↔ Tag   (M:N, implicit) — Prisma creates _PostToTag join table

model User {
  id       Int       @id @default(autoincrement())
  email    String    @unique

  // Back-relations (virtual, no columns)
  posts    Post[]    // User is parent: one User → many Posts
  comments Comment[] // User is parent: one User → many Comments
}

model Post {
  id       Int       @id @default(autoincrement())
  title    String

  // FK side — Post is child of User
  userId   Int                                      // REAL column
  user     User     @relation(fields: [userId], references: [id])  // virtual

  // Back-relations (virtual)
  comments Comment[] // Post is parent: one Post → many Comments

  // Implicit M:N — Prisma manages the join table
  tags     Tag[]
}

model Comment {
  id     Int    @id @default(autoincrement())
  body   String

  // FK side — Comment is child of both Post and User
  postId Int                                       // REAL column
  post   Post @relation(fields: [postId], references: [id])  // virtual

  userId Int                                       // REAL column
  user   User @relation(fields: [userId], references: [id])  // virtual
}

model Tag {
  id    Int    @id @default(autoincrement())
  name  String @unique

  // Implicit M:N back-relation
  posts Post[]
}
```

---

---

# 2 — One-to-Many Relations — The Most Common Relation

---

## T — TL;DR

A one-to-many (1:N) relation means one parent record links to many child records. The **child model** holds the foreign key. In Prisma: the child has `parentId Int` (scalar FK) + `parent Parent @relation(...)` (virtual), and the parent has `children Child[]` (virtual back-relation). This is the most common relation in any relational database — users/posts, orders/items, categories/products.

---

## K — Key Concepts

```prisma
// ── Basic one-to-many ──────────────────────────────────────────────────────
model User {
  id    Int    @id @default(autoincrement())
  email String @unique

  // Back-relation: virtual, no column
  posts Post[]
}

model Post {
  id      Int    @id @default(autoincrement())
  title   String

  // FK: Post belongs to User
  userId  Int                              // REAL column — "user_id" after @map
  user    User @relation(fields: [userId], references: [id])  // VIRTUAL
}

// In PostgreSQL:
// Table "users": id, email
// Table "posts": id, title, user_id  ← FK column
// FOREIGN KEY (user_id) REFERENCES users(id)
```

```prisma
// ── One-to-many with cascading delete ─────────────────────────────────────
model User {
  id    Int    @id @default(autoincrement())
  posts Post[]
}

model Post {
  id     Int  @id @default(autoincrement())
  userId Int
  user   User @relation(fields: [userId], references: [id], onDelete: Cascade)
  //                                                         ↑ delete user → delete posts
}

// onDelete options:
// Cascade  → deleting parent deletes all children
// Restrict → deleting parent fails if children exist (default for required relations)
// SetNull  → deleting parent sets FK to NULL (FK must be nullable: userId Int?)
// SetDefault → sets FK to field's default value
// NoAction → similar to Restrict but deferred

// onUpdate options (same values):
// Cascade → if parent PK changes, FK is updated to match
// Restrict → parent PK update fails if children exist
```

```prisma
// ── Required vs optional relation ─────────────────────────────────────────

// Required (post MUST have an author)
model Post {
  userId  Int            // NOT NULL — post must always belong to a user
  user    User @relation(fields: [userId], references: [id])
}

// Optional (post may have no author — draft/anonymous)
model Post {
  userId  Int?           // NULL allowed — post may have no author
  user    User? @relation(fields: [userId], references: [id])
  //      ↑ must also be optional (?) when FK is nullable
}
```

```prisma
// ── Multiple relations between the same two models ────────────────────────
// Named relations required when two models have more than one relation to each other

model User {
  id            Int    @id @default(autoincrement())
  writtenPosts  Post[] @relation("author")
  reviewedPosts Post[] @relation("reviewer")
}

model Post {
  id         Int  @id @default(autoincrement())

  authorId   Int
  author     User @relation("author",   fields: [authorId],   references: [id])

  reviewerId Int?
  reviewer   User? @relation("reviewer", fields: [reviewerId], references: [id])
}
// Without @relation("name"), Prisma can't tell which Post[] maps to which Int FK
```

```prisma
// ── Complete production 1:N with @@map and @map ───────────────────────────
model User {
  id        Int      @id @default(autoincrement())
  email     String   @unique
  posts     Post[]

  @@map("users")
}

model Post {
  id        Int      @id @default(autoincrement())
  title     String
  body      String?
  published Boolean  @default(false) @map("is_published")

  // FK fields
  authorId  Int      @map("author_id")
  author    User     @relation(fields: [authorId], references: [id], onDelete: Cascade)

  createdAt DateTime @default(now()) @map("created_at")

  @@map("posts")
  @@index([authorId])  // always index FK columns
}
```

```typescript
// ── Querying 1:N relations in Prisma Client ───────────────────────────────

// Fetch user WITH all their posts
const user = await prisma.user.findUnique({
  where: { id: 1 },
  include: { posts: true },
});
// user.posts: Post[]

// Fetch user with filtered/sorted posts
const user2 = await prisma.user.findUnique({
  where: { id: 1 },
  include: {
    posts: {
      where: { published: true },
      orderBy: { createdAt: "desc" },
      take: 10,
    },
  },
});

// Create a post for a user (two ways)
// Option A: nested create
await prisma.user.update({
  where: { id: 1 },
  data: {
    posts: {
      create: { title: "New Post", body: "Hello World" },
    },
  },
});

// Option B: direct create with FK
await prisma.post.create({
  data: { title: "New Post", body: "Hello World", authorId: 1 },
});

// Connect existing post to user
await prisma.post.update({
  where: { id: 5 },
  data: { author: { connect: { id: 1 } } },
});

// Disconnect (set FK to null — only if relation is optional)
await prisma.post.update({
  where: { id: 5 },
  data: { author: { disconnect: true } }, // only works if userId is Int?
});
```

---

## W — Why It Matters

- Always indexing FK columns (`@@index([authorId])`) is a critical performance rule — PostgreSQL does NOT automatically index FK columns (unlike primary keys). Without an index, every `DELETE FROM users WHERE id = 1` or `SELECT * FROM posts WHERE author_id = 1` causes a sequential scan of the `posts` table.
- The `onDelete: Cascade` vs `Restrict` choice is a business rule, not a technical preference — cascading deletes are convenient but can accidentally wipe large amounts of data (delete a user → delete their 10,000 posts). `Restrict` forces explicit cleanup but protects against accidental data loss.
- Named relations (`@relation("name")`) look like boilerplate but are essential for correctness — without them, Prisma cannot generate valid TypeScript types when there are multiple relations between the same two models, and the schema validation will fail.

---

## I — Interview Q&A

### Q: In a one-to-many relation, which model holds the foreign key and why?

**A:** The "many" side (child model) holds the foreign key. In a `User` → `Post` relation (one user, many posts), the `Post` table has a `user_id` column. This is because the foreign key records "which parent does this child belong to" — each post knows its author via `user_id`, but a user doesn't store a list of post IDs (that would require a variable-length array or a separate join table). The parent (`User`) has a virtual back-relation (`posts Post[]`) in Prisma that is just a query helper — it has no corresponding column. This structure is the foundation of relational database normalization: the dependent entity (child) references the independent entity (parent).

---

## C — Common Pitfalls + Fix

### ❌ Not indexing the FK column — sequential scans on every join

```prisma
// ❌ No index on the FK column
model Post {
  id       Int  @id @default(autoincrement())
  authorId Int                    // FK column — no index
  author   User @relation(fields: [authorId], references: [id])
  // Every query "SELECT * FROM posts WHERE author_id = ?" does a FULL TABLE SCAN ❌
}
```

**Fix:** Always add an index on FK columns:

```prisma
// ✅
model Post {
  id       Int  @id @default(autoincrement())
  authorId Int  @map("author_id")
  author   User @relation(fields: [authorId], references: [id])

  @@index([authorId])  // or @@index([authorId]) — index the FK ✅
}
```

---

## K — Coding Challenge + Solution

### Challenge

Build a complete `Customer → Order → OrderItem` one-to-many chain: (1) `Customer` has many `Orders`; (2) `Order` has many `OrderItems`; (3) deleting a `Customer` cascades to delete their `Orders`; (4) deleting an `Order` cascades to delete its `OrderItems`; (5) all FK columns are indexed; (6) use `@@map` + `@map`; (7) show TypeScript queries: create a customer with a nested order and items, fetch a customer's orders with item count, delete a customer and verify cascade behavior.

### Solution

```prisma
// ── Schema ─────────────────────────────────────────────────────────────────

model Customer {
  id        Int      @id @default(autoincrement())
  email     String   @unique
  name      String
  phone     String?
  createdAt DateTime @default(now()) @map("created_at")
  updatedAt DateTime @updatedAt @map("updated_at")

  orders    Order[]  // back-relation (virtual)

  @@map("customers")
}

model Order {
  id          Int         @id @default(autoincrement())
  status      String      @default("pending")
  total       Decimal     @default(0) @db.Decimal(12, 2)
  createdAt   DateTime    @default(now()) @map("created_at")
  updatedAt   DateTime    @updatedAt @map("updated_at")

  // FK to Customer
  customerId  Int         @map("customer_id")
  customer    Customer    @relation(
    fields: [customerId],
    references: [id],
    onDelete: Cascade      // delete customer → delete orders
  )

  items       OrderItem[] // back-relation (virtual)

  @@index([customerId])   // index the FK
  @@map("orders")
}

model OrderItem {
  id         Int     @id @default(autoincrement())
  quantity   Int     @default(1)
  unitPrice  Decimal @db.Decimal(12, 2) @map("unit_price")
  createdAt  DateTime @default(now()) @map("created_at")

  // FK to Order
  orderId    Int     @map("order_id")
  order      Order   @relation(
    fields: [orderId],
    references: [id],
    onDelete: Cascade  // delete order → delete items
  )

  // FK to Product (not defined here — just the scalar)
  productId  Int     @map("product_id")

  @@index([orderId])    // index the FK
  @@index([productId])  // index the FK
  @@map("order_items")
}
```

```typescript
// ── TypeScript queries ─────────────────────────────────────────────────────

// (1) Create customer with nested order and items
const customer = await prisma.customer.create({
  data: {
    email: "mark@example.com",
    name: "Mark Austin",
    orders: {
      create: {
        status: "pending",
        items: {
          create: [
            { productId: 1, quantity: 2, unitPrice: 129.99 },
            { productId: 2, quantity: 1, unitPrice: 49.99 },
          ],
        },
      },
    },
  },
  include: {
    orders: {
      include: { items: true },
    },
  },
});

// (2) Fetch customer's orders with item count
const customerWithOrders = await prisma.customer.findUnique({
  where: { id: 1 },
  select: {
    id: true,
    name: true,
    email: true,
    orders: {
      select: {
        id: true,
        status: true,
        total: true,
        createdAt: true,
        _count: { select: { items: true } }, // item count per order
      },
      orderBy: { createdAt: "desc" },
    },
    _count: { select: { orders: true } }, // total order count
  },
});
// customerWithOrders.orders[0]._count.items: number

// (3) Delete customer — cascades to orders then order_items
await prisma.customer.delete({ where: { id: 1 } });
// PostgreSQL executes:
// DELETE FROM order_items WHERE order_id IN (SELECT id FROM orders WHERE customer_id = 1)
// DELETE FROM orders WHERE customer_id = 1
// DELETE FROM customers WHERE id = 1
// All via the ON DELETE CASCADE FK constraints ✅
```

---

---

# 3 — One-to-One Relations — Exclusive Ownership

---

## T — TL;DR

A one-to-one (1:1) relation means each record in model A links to exactly one record in model B, and vice versa. The FK lives on the "dependent" side (the model that can't exist without the other, or the extension model). The FK must be `@unique` to enforce the one-to-one constraint at the database level — without `@unique`, it's just a one-to-many with a naming mistake.

---

## K — Key Concepts

```prisma
// ── Basic one-to-one ───────────────────────────────────────────────────────
model User {
  id      Int      @id @default(autoincrement())
  email   String   @unique

  profile Profile? // back-relation (virtual) — ? because profile may not exist yet
}

model Profile {
  id     Int    @id @default(autoincrement())
  bio    String?
  avatar String?

  // FK side — Profile belongs to User
  userId Int    @unique  // ← @unique enforces the 1:1 constraint
  user   User   @relation(fields: [userId], references: [id])
}

// In PostgreSQL:
// Table "profiles": id, bio, avatar, user_id
// UNIQUE (user_id)         ← enforces 1:1 (one user per profile)
// FOREIGN KEY (user_id) REFERENCES users(id)

// Without @unique on userId: multiple profiles could reference the same user
// → becomes a 1:N relation disguised as 1:1 ← common bug ❌
```

```prisma
// ── Which side holds the FK in 1:1? ───────────────────────────────────────
// Rule: the FK lives on the "extension" or "optional" model
// The base model (User) can exist without the extension (Profile)
// The extension (Profile) cannot exist without the base (User)
// → Profile holds the FK (userId)

// Alternative: FK on the "base" model (less common)
// Used when: the relation is always required and created at the same time
model User {
  id        Int     @id @default(autoincrement())
  email     String  @unique
  profileId Int?    @unique @map("profile_id")
  profile   Profile? @relation(fields: [profileId], references: [id])
}

model Profile {
  id   Int    @id @default(autoincrement())
  bio  String?
  user User?  // back-relation (virtual)
}
// This is valid but unusual — creating a User before a Profile means profileId = null
// More common pattern: Profile holds the FK to User
```

```prisma
// ── One-to-one with cascade delete ────────────────────────────────────────
model User {
  id      Int      @id @default(autoincrement())
  profile Profile?
}

model Profile {
  id     Int  @id @default(autoincrement())
  userId Int  @unique @map("user_id")
  user   User @relation(
    fields: [userId],
    references: [id],
    onDelete: Cascade  // delete user → delete profile
  )
}
// Cascade is almost always the right choice for 1:1 extension models
// A profile without a user is orphaned data ← no reason to keep it
```

```prisma
// ── Self-referencing one-to-one ────────────────────────────────────────────
model User {
  id         Int   @id @default(autoincrement())

  // One user can "replace" another (account merge/transfer)
  replacedById Int?  @unique @map("replaced_by_id")
  replacedBy   User? @relation("replacement", fields: [replacedById], references: [id])
  replaces     User? @relation("replacement")
  // Named relation required for self-reference
}
```

```typescript
// ── Querying 1:1 relations in Prisma Client ───────────────────────────────

// Fetch user with profile
const user = await prisma.user.findUnique({
  where: { id: 1 },
  include: { profile: true },
});
// user.profile: Profile | null  (null if no profile exists)

// Create user and profile together (nested create)
const newUser = await prisma.user.create({
  data: {
    email: "mark@example.com",
    profile: {
      create: {
        bio: "Full-stack developer",
        avatar: "https://example.com/avatar.jpg",
      },
    },
  },
  include: { profile: true },
});

// Upsert profile (create if missing, update if exists)
await prisma.profile.upsert({
  where: { userId: 1 },
  create: { userId: 1, bio: "New bio" },
  update: { bio: "Updated bio" },
});

// Disconnect 1:1 (set FK to null — only if optional)
await prisma.user.update({
  where: { id: 1 },
  data: { profile: { disconnect: true } },
});
// profile.userId becomes null ← only works if userId is Int?
```

---

## W — Why It Matters

- `@unique` on the FK field is what makes a 1:1 relation a 1:1 relation at the database level — without it, PostgreSQL allows multiple profiles per user, and Prisma will not catch this at runtime. The schema validation won't catch it either. Only a database `UNIQUE` constraint prevents duplicate FK values. Missing `@unique` is the most common 1:1 mistake.
- Choosing which side holds the FK in a 1:1 affects query patterns — if `Profile` holds `userId`, then `prisma.profile.findUnique({ where: { userId: 1 } })` works directly. If `User` holds `profileId`, then you must go through the user to find the profile. Generally: the more frequently-queried starting point should be the FK holder.
- 1:1 relations are common for separating "core" data from "extended" data — `User` (authentication, always loaded) vs `UserPreferences` (settings, loaded on demand). This pattern keeps the hot `users` table narrow and fast.

---

## I — Interview Q&A

### Q: What makes a one-to-one relation different from a one-to-many in Prisma and PostgreSQL?

**A:** The structural difference is the `@unique` constraint on the foreign key field. In both relation types, one model holds a foreign key referencing another model's primary key. In a one-to-many, many rows can share the same FK value — multiple posts can have the same `author_id`. In a one-to-one, the FK must be unique — only one profile can have a given `user_id`. In Prisma, you add `@unique` to the FK field (`userId Int @unique`) and make the back-relation a singular optional type (`profile Profile?`) instead of an array (`profiles Profile[]`). In PostgreSQL, the `UNIQUE` constraint on the FK column is what enforces the constraint — the database rejects a second profile for the same user. Without `@unique`, the constraint doesn't exist and the "one-to-one" is silently a one-to-many.

---

## C — Common Pitfalls + Fix

### ❌ Forgetting `@unique` on the FK field in a 1:1 relation

```prisma
// ❌ Without @unique, this is actually a 1:N relation (multiple profiles per user allowed)
model Profile {
  id     Int  @id @default(autoincrement())
  userId Int  // ← missing @unique!
  user   User @relation(fields: [userId], references: [id])
}
// Prisma will also warn: "A one-to-one relation requires the `@unique` attribute"
// But without @unique: INSERT INTO profiles (user_id) VALUES (1), (1) → SUCCEEDS ❌
```

**Fix:**

```prisma
// ✅
model Profile {
  id     Int  @id @default(autoincrement())
  userId Int  @unique  // ← UNIQUE constraint in PostgreSQL → enforces 1:1
  user   User @relation(fields: [userId], references: [id])
}
```

---

## K — Coding Challenge + Solution

### Challenge

Design a `User` + `UserSettings` + `UserIdentity` schema where: (1) every User has optional `UserSettings` (theme, language, notifications) and optional `UserIdentity` (OAuth provider, external ID); (2) `UserSettings` holds the FK to User with cascade delete; (3) `UserIdentity` holds the FK with a unique constraint on `(provider, externalId)` — one OAuth identity per provider per user; (4) `UserIdentity` is also a 1:1 with User (unique FK); (5) show how to create a user with settings and identity in one transaction; (6) use `@@map` and `@map` throughout.

### Solution

```prisma
model User {
  id        Int           @id @default(autoincrement())
  email     String        @unique
  name      String?
  createdAt DateTime      @default(now()) @map("created_at") @db.Timestamptz
  updatedAt DateTime      @updatedAt @map("updated_at") @db.Timestamptz

  // 1:1 back-relations (virtual — no columns)
  settings  UserSettings?
  identity  UserIdentity?

  @@map("users")
}

model UserSettings {
  id            Int     @id @default(autoincrement())
  theme         String  @default("system")
  language      String  @default("en") @db.Char(5)
  notifications Boolean @default(true)
  createdAt     DateTime @default(now()) @map("created_at") @db.Timestamptz
  updatedAt     DateTime @updatedAt @map("updated_at") @db.Timestamptz

  // FK side — 1:1 with User
  userId        Int     @unique @map("user_id")
  user          User    @relation(
    fields: [userId],
    references: [id],
    onDelete: Cascade
  )

  @@map("user_settings")
}

model UserIdentity {
  id         Int    @id @default(autoincrement())
  provider   String @db.VarChar(50)  // 'google', 'github', 'facebook'
  externalId String @map("external_id") @db.VarChar(255)
  createdAt  DateTime @default(now()) @map("created_at") @db.Timestamptz

  // FK side — 1:1 with User
  userId     Int    @unique @map("user_id")  // 1:1 enforced
  user       User   @relation(
    fields: [userId],
    references: [id],
    onDelete: Cascade
  )

  // One OAuth identity per provider per external account
  @@unique([provider, externalId])
  @@map("user_identities")
}
```

```typescript
// Create a user with settings and identity in one atomic transaction
const newUser = await prisma.$transaction(async (tx) => {
  return tx.user.create({
    data: {
      email: "mark@example.com",
      name: "Mark Austin",
      settings: {
        create: {
          theme: "dark",
          language: "en",
          notifications: true,
        },
      },
      identity: {
        create: {
          provider: "google",
          externalId: "google-oauth2|1234567890",
        },
      },
    },
    include: {
      settings: true,
      identity: true,
    },
  });
});

// Upsert settings — create or update based on userId
await prisma.userSettings.upsert({
  where: { userId: newUser.id },
  create: { userId: newUser.id, theme: "light" },
  update: { theme: "light" },
});

// Fetch user with all 1:1 relations
const userFull = await prisma.user.findUnique({
  where: { email: "mark@example.com" },
  include: { settings: true, identity: true },
});
// userFull.settings: UserSettings | null
// userFull.identity: UserIdentity | null
```

---

---

# 4 — Explicit Many-to-Many — Junction Tables with Extra Fields

---

## T — TL;DR

An explicit many-to-many relation uses a **junction model** (join table) that you declare yourself in the schema. Use explicit M:N when the junction table needs extra fields beyond the two FKs (e.g. `enrolledAt`, `role`, `quantity`). The junction model has two FK fields pointing to the two related models, a composite `@@id`, and any additional data fields you need.

---

## K — Key Concepts

```prisma
// ── When to use explicit vs implicit M:N ──────────────────────────────────
// Implicit M:N: no extra data on the join → let Prisma manage the join table
// Explicit M:N: need extra data on the join → declare the junction model yourself

// Example: course enrollment
// Just "student is enrolled in course" → implicit (no extra data needed)
// "student enrolled on DATE with GRADE and STATUS" → explicit (extra fields needed)
```

```prisma
// ── Basic explicit many-to-many ────────────────────────────────────────────
model Student {
  id          Int          @id @default(autoincrement())
  name        String
  enrollments Enrollment[] // back-relation to junction
}

model Course {
  id          Int          @id @default(autoincrement())
  title       String
  enrollments Enrollment[] // back-relation to junction
}

// Junction model — the explicit join table
model Enrollment {
  // Extra fields on the join (this is why explicit is needed)
  enrolledAt DateTime @default(now()) @map("enrolled_at")
  grade      String?
  status     String   @default("active")

  // FK to Student
  studentId  Int      @map("student_id")
  student    Student  @relation(fields: [studentId], references: [id])

  // FK to Course
  courseId   Int      @map("course_id")
  course     Course   @relation(fields: [courseId], references: [id])

  // Composite PK — one enrollment per student per course
  @@id([studentId, courseId])

  @@index([courseId])   // index the second FK (first is part of PK = indexed automatically)
  @@map("enrollments")
}
```

```prisma
// ── Composite PK vs separate ID in junction model ─────────────────────────

// Option A: composite @@id — natural, no extra column (preferred for pure junctions)
model Enrollment {
  studentId Int
  courseId  Int
  @@id([studentId, courseId])
}

// Option B: separate ID — allows multiple enrollments for same pair (re-enrollment)
model Enrollment {
  id        Int      @id @default(autoincrement())
  studentId Int
  courseId  Int
  // @@unique([studentId, courseId]) // optional uniqueness constraint
}
// Use Option B when: re-enrollment is allowed, or you need to reference
// individual enrollment records via a single ID (easier for REST APIs)
```

```prisma
// ── Full explicit M:N with cascade rules ──────────────────────────────────
model Post {
  id          Int         @id @default(autoincrement())
  title       String
  postAuthors PostAuthor[] // junction back-relation
  @@map("posts")
}

model Author {
  id          Int         @id @default(autoincrement())
  name        String
  postAuthors PostAuthor[] // junction back-relation
  @@map("authors")
}

model PostAuthor {
  // Extra fields on the join
  role        String   @default("primary")  // primary / contributor / editor
  addedAt     DateTime @default(now()) @map("added_at")

  // FKs
  postId      Int      @map("post_id")
  post        Post     @relation(
    fields: [postId],
    references: [id],
    onDelete: Cascade   // delete post → remove PostAuthor rows
  )

  authorId    Int      @map("author_id")
  author      Author   @relation(
    fields: [authorId],
    references: [id],
    onDelete: Cascade   // delete author → remove PostAuthor rows
  )

  @@id([postId, authorId])
  @@index([authorId])   // index second FK (postId covered by PK)
  @@map("post_authors")
}
```

```typescript
// ── Querying explicit M:N in Prisma Client ────────────────────────────────

// Enroll a student in a course
await prisma.enrollment.create({
  data: {
    studentId: 1,
    courseId: 5,
    status: "active",
  },
});

// Or via nested write from student:
await prisma.student.update({
  where: { id: 1 },
  data: {
    enrollments: {
      create: {
        courseId: 5,
        status: "active",
      },
    },
  },
});

// Fetch student with enrolled courses + enrollment metadata
const student = await prisma.student.findUnique({
  where: { id: 1 },
  include: {
    enrollments: {
      include: { course: true }, // include the full course data
      where: { status: "active" },
    },
  },
});
// student.enrollments[0].course.title
// student.enrollments[0].enrolledAt

// Fetch course with enrolled students
const course = await prisma.course.findUnique({
  where: { id: 5 },
  select: {
    title: true,
    enrollments: {
      select: {
        enrolledAt: true,
        grade: true,
        student: { select: { id: true, name: true } },
      },
      orderBy: { enrolledAt: "asc" },
    },
    _count: { select: { enrollments: true } },
  },
});

// Update enrollment (e.g. update grade)
await prisma.enrollment.update({
  where: { studentId_courseId: { studentId: 1, courseId: 5 } },
  //       ↑ Prisma generates this composite unique identifier automatically
  data: { grade: "A" },
});

// Remove enrollment
await prisma.enrollment.delete({
  where: { studentId_courseId: { studentId: 1, courseId: 5 } },
});
```

---

## W — Why It Matters

- Explicit M:N is almost always the right choice for production applications — you almost always end up needing extra metadata on the join (created_at timestamp, status, role, ordering). Starting with implicit M:N and migrating to explicit later requires a migration that changes the join table structure, which is painful. Defaulting to explicit is safer.
- The composite `@@id([a, b])` vs a separate surrogate `@id` affects how you reference individual junction records — composite `@@id` means Prisma generates a `studentId_courseId` where-clause compound type; a separate `id` means you reference records by single integer. REST APIs typically prefer a separate `id` for simplicity.
- The `@index([courseId])` on the second FK is important — the composite `@@id([studentId, courseId])` creates a B-tree index with `studentId` as the leading column. Queries filtering by `courseId` alone (e.g. "all students in course 5") won't use this index efficiently. A separate index on `courseId` is necessary.

---

## I — Interview Q&A

### Q: When should you use an explicit many-to-many junction model instead of Prisma's implicit M:N?

**A:** Use explicit many-to-many whenever the relationship itself carries data beyond the two foreign keys. Examples: a `PostTag` relation that's just "this post has this tag" can be implicit — there's no extra data. A `ProjectMember` relation that stores `role`, `joinedAt`, and `permissions` must be explicit — the junction table needs those extra columns. Additionally, use explicit when: you need to reference individual junction records by ID (REST APIs returning `/enrollments/123`); you need to cascade deletes with specific rules; you need to query junction records directly (e.g. "all active enrollments this month"). In practice, default to explicit in production schemas — adding extra fields to an implicit join table later requires converting it to explicit, which is a more disruptive migration than starting explicit.

---

## C — Common Pitfalls + Fix

### ❌ Not indexing the second FK in an explicit M:N junction table

```prisma
// ❌ Composite @@id covers studentId first — courseId queries are sequential scans
model Enrollment {
  studentId  Int
  courseId   Int
  // No @@index([courseId]) ← every "SELECT * WHERE course_id = ?" is a seq scan ❌
  @@id([studentId, courseId])
}
```

**Fix:** Add an index on the non-leading FK:

```prisma
// ✅
model Enrollment {
  studentId  Int      @map("student_id")
  courseId   Int      @map("course_id")
  enrolledAt DateTime @default(now()) @map("enrolled_at")

  @@id([studentId, courseId])
  @@index([courseId])  // ← enables fast "all students in course X" queries ✅
  @@map("enrollments")
}
```

---

## K — Coding Challenge + Solution

### Challenge

Design a `User ↔ Project` many-to-many for a project management app where: (1) a `ProjectMembership` junction model stores `role` (enum: OWNER, ADMIN, MEMBER, VIEWER), `joinedAt`, and `invitedById`; (2) both FKs cascade on delete; (3) a user can only have one membership per project (composite `@@id`); (4) include a separate `@@index` on `projectId`; (5) show TypeScript: invite a user to a project, list a project's members with roles, change a user's role, remove a member.

### Solution

```prisma
enum MemberRole {
  OWNER
  ADMIN
  MEMBER
  VIEWER

  @@map("member_role")
}

model User {
  id          Int                @id @default(autoincrement())
  email       String             @unique
  name        String?
  memberships ProjectMembership[] // back-relation
  invitedMembers ProjectMembership[] @relation("inviter") // back-relation for invited

  @@map("users")
}

model Project {
  id          Int                @id @default(autoincrement())
  name        String
  slug        String             @unique
  memberships ProjectMembership[] // back-relation

  @@map("projects")
}

model ProjectMembership {
  role        MemberRole @default(MEMBER)
  joinedAt    DateTime   @default(now()) @map("joined_at") @db.Timestamptz

  // FK to User (the member)
  userId      Int        @map("user_id")
  user        User       @relation(
    fields: [userId],
    references: [id],
    onDelete: Cascade
  )

  // FK to Project
  projectId   Int        @map("project_id")
  project     Project    @relation(
    fields: [projectId],
    references: [id],
    onDelete: Cascade
  )

  // FK to User (who invited — optional, nullable)
  invitedById Int?       @map("invited_by_id")
  invitedBy   User?      @relation(
    "inviter",
    fields: [invitedById],
    references: [id],
    onDelete: SetNull
  )

  @@id([userId, projectId])
  @@index([projectId])     // fast "all members of project X"
  @@index([invitedById])   // fast "all members invited by user X"
  @@map("project_memberships")
}
```

```typescript
import { MemberRole } from "@prisma/client";

// Invite a user to a project
await prisma.projectMembership.create({
  data: {
    userId: 5, // the invitee
    projectId: 2,
    role: MemberRole.MEMBER,
    invitedById: 1, // the inviter
  },
});

// List a project's members with their roles
const project = await prisma.project.findUnique({
  where: { id: 2 },
  select: {
    name: true,
    memberships: {
      select: {
        role: true,
        joinedAt: true,
        user: { select: { id: true, name: true, email: true } },
      },
      orderBy: { joinedAt: "asc" },
    },
    _count: { select: { memberships: true } },
  },
});

// Change a user's role
await prisma.projectMembership.update({
  where: { userId_projectId: { userId: 5, projectId: 2 } },
  data: { role: MemberRole.ADMIN },
});

// Remove a member
await prisma.projectMembership.delete({
  where: { userId_projectId: { userId: 5, projectId: 2 } },
});
```

---

---

# 5 — Implicit Many-to-Many — Prisma-Managed Join Tables

---

## T — TL;DR

An implicit many-to-many relation is declared by adding a simple array relation field on both models with no junction model — Prisma automatically creates and manages the join table. Use implicit M:N when the join carries no extra data. The auto-generated join table is named `_ModelAToModelB` (alphabetical order) with two FK columns. You cannot query the join table directly.

---

## K — Key Concepts

```prisma
// ── Basic implicit many-to-many ────────────────────────────────────────────
model Post {
  id   Int   @id @default(autoincrement())
  title String
  tags  Tag[]  // ← implicit M:N: no junction model, just an array field
}

model Tag {
  id    Int    @id @default(autoincrement())
  name  String @unique
  posts Post[] // ← back-relation on the other side
}

// Prisma auto-generates a join table:
// Table "_PostToTag": A (post_id), B (tag_id)
// PRIMARY KEY (A, B)
// INDEX (B)   ← Prisma always adds this for the reverse direction
// This table is INVISIBLE in your schema — Prisma manages it entirely
```

```
── Auto-generated join table naming ─────────────────────────────────────────

Rule: _${ModelAName}To${ModelBName}  (alphabetical, A < B)
Post + Tag → _PostToTag
Article + Category → _ArticleToCategory

Columns:
  A: FK to the alphabetically first model (Post → post id)
  B: FK to the alphabetically second model (Tag → tag id)

Constraints:
  PRIMARY KEY (A, B)
  INDEX (B)  ← enables efficient reverse lookup
  FOREIGN KEY (A) REFERENCES posts(id) ON DELETE CASCADE
  FOREIGN KEY (B) REFERENCES tags(id) ON DELETE CASCADE
  (Prisma uses Cascade for implicit M:N joins)
```

```prisma
// ── Named implicit M:N — when you have multiple M:N between same models ────
model Post {
  id        Int    @id @default(autoincrement())
  tags      Tag[]  @relation("PostTags")
  categories Tag[] @relation("PostCategories")
}

model Tag {
  id       Int    @id @default(autoincrement())
  name     String @unique
  taggedPosts     Post[] @relation("PostTags")
  categorizedPosts Post[] @relation("PostCategories")
}

// Generates two join tables:
// _PostTags:       (A: post_id, B: tag_id)
// _PostCategories: (A: post_id, B: tag_id)
```

```typescript
// ── Querying implicit M:N in Prisma Client ────────────────────────────────

// Add tags to a post (connect existing tags)
await prisma.post.update({
  where: { id: 1 },
  data: {
    tags: {
      connect: [{ id: 1 }, { id: 2 }, { id: 3 }],
    },
  },
});

// Create post with new tags
await prisma.post.create({
  data: {
    title: "Prisma Guide",
    tags: {
      connectOrCreate: [
        { where: { name: "prisma" }, create: { name: "prisma" } },
        { where: { name: "typescript" }, create: { name: "typescript" } },
      ],
    },
  },
});

// Replace all tags (set — removes all existing, adds new)
await prisma.post.update({
  where: { id: 1 },
  data: {
    tags: {
      set: [{ id: 1 }, { id: 4 }], // replaces existing tags with exactly these
    },
  },
});

// Remove one tag from a post
await prisma.post.update({
  where: { id: 1 },
  data: {
    tags: {
      disconnect: { id: 2 }, // removes from join table only, doesn't delete the tag
    },
  },
});

// Fetch post with tags
const post = await prisma.post.findUnique({
  where: { id: 1 },
  include: { tags: true },
});
// post.tags: Tag[]

// Fetch posts that have ALL specified tags
const posts = await prisma.post.findMany({
  where: {
    tags: {
      some: { name: "prisma" }, // at least one tag matches
    },
  },
});

// Posts with EVERY specified tag
const posts2 = await prisma.post.findMany({
  where: {
    AND: [
      { tags: { some: { name: "prisma" } } },
      { tags: { some: { name: "typescript" } } },
    ],
  },
});
```

```prisma
// ── Implicit M:N requirements ─────────────────────────────────────────────
// Both models MUST have a single @id field (not @@id composite)
// Both models' @id must be the same type (both Int or both String)
// Prisma uses these IDs for the A and B columns of the join table

// ❌ This won't work — Post has composite @@id
model Post {
  slug    String
  version Int
  @@id([slug, version])
  tags Tag[]  // ← ERROR: implicit M:N requires single @id
}

// ✅ Fix: use explicit M:N with a junction model instead
```

---

## W — Why It Matters

- Implicit M:N has one critical limitation: you cannot store data on the join. The moment you need `addedAt`, `order`, `isPrimary`, or any extra field, you must convert to explicit M:N — a migration that's more complex than starting explicit. For new schemas, explicitly ask "will I ever need extra data on this join?" before choosing implicit.
- The join table's name (`_PostToTag`) is an implementation detail — it can be renamed via `@@map` in Prisma's newer versions, and you can use it in raw SQL queries. But you cannot query it through Prisma Client's typed API — for any direct join table query, you need explicit M:N.
- `set` vs `connect`/`disconnect` are critical distinctions — `set: [ids]` is destructive (removes all existing joins and creates the new ones), while `connect` and `disconnect` are additive/subtractive. Using `set` when you mean `connect` accidentally removes existing relations.

---

## I — Interview Q&A

### Q: What is the difference between implicit and explicit many-to-many in Prisma, and when do you choose each?

**A:** In an implicit M:N, you declare array relation fields on both models and Prisma automatically creates and manages a join table behind the scenes — no junction model in your schema. You cannot add extra fields to the join, cannot query the join table directly through Prisma, and cannot reference individual join records. In an explicit M:N, you declare a junction model yourself — it has two FK fields, a composite primary key, and any additional data fields you need. You can query junction records directly, add extra metadata, and reference individual records by ID. Choose implicit when the relation is purely "A is associated with B" with no extra data (posts/tags, users/roles). Choose explicit when the relation carries data (order/product with quantity and unit price, user/project with role and join date). In production, when in doubt, default to explicit — converting implicit to explicit later requires a migration.

---

## C — Common Pitfalls + Fix

### ❌ Using `set` when you want `connect` — accidentally removes existing relations

```typescript
// ❌ This REPLACES all tags with only tag id=3
// Existing tags id=1 and id=2 are REMOVED from the join table
await prisma.post.update({
  where: { id: 1 },
  data: {
    tags: { set: [{ id: 3 }] }, // destructive — removes existing joins ❌
  },
});
```

**Fix:** Use `connect` to ADD without removing:

```typescript
// ✅ Adds tag id=3 without removing existing tags
await prisma.post.update({
  where: { id: 1 },
  data: {
    tags: { connect: { id: 3 } }, // additive — keeps existing joins ✅
  },
});
```

---

## K — Coding Challenge + Solution

### Challenge

Build a `Recipe ↔ Ingredient` implicit M:N and a `Recipe ↔ DietaryTag` implicit M:N. Show: (1) the schema with proper `@@map`; (2) create a recipe with multiple ingredients and tags using `connectOrCreate`; (3) add an ingredient to an existing recipe; (4) fetch all vegan recipes (have a `DietaryTag` named "vegan") with their ingredient names; (5) remove all tags from a recipe and replace with new ones using `set`.

### Solution

```prisma
model Recipe {
  id          Int          @id @default(autoincrement())
  name        String
  description String?
  createdAt   DateTime     @default(now()) @map("created_at") @db.Timestamptz

  // Implicit M:N — Prisma manages _RecipeToIngredient join table
  ingredients Ingredient[] @relation("RecipeIngredients")
  // Implicit M:N — Prisma manages _RecipeToDietaryTag join table
  dietaryTags DietaryTag[] @relation("RecipeDietaryTags")

  @@map("recipes")
}

model Ingredient {
  id      Int      @id @default(autoincrement())
  name    String   @unique
  recipes Recipe[] @relation("RecipeIngredients")

  @@map("ingredients")
}

model DietaryTag {
  id      Int      @id @default(autoincrement())
  name    String   @unique   // 'vegan', 'gluten-free', 'keto', etc.
  recipes Recipe[] @relation("RecipeDietaryTags")

  @@map("dietary_tags")
}
```

```typescript
// (2) Create a recipe with ingredients and tags using connectOrCreate
const recipe = await prisma.recipe.create({
  data: {
    name: "Vegan Buddha Bowl",
    description: "A nutritious plant-based bowl",
    ingredients: {
      connectOrCreate: [
        { where: { name: "chickpeas" }, create: { name: "chickpeas" } },
        { where: { name: "avocado" }, create: { name: "avocado" } },
        { where: { name: "brown rice" }, create: { name: "brown rice" } },
        { where: { name: "tahini" }, create: { name: "tahini" } },
      ],
    },
    dietaryTags: {
      connectOrCreate: [
        { where: { name: "vegan" }, create: { name: "vegan" } },
        { where: { name: "gluten-free" }, create: { name: "gluten-free" } },
      ],
    },
  },
  include: { ingredients: true, dietaryTags: true },
});

// (3) Add a new ingredient to an existing recipe
await prisma.recipe.update({
  where: { id: recipe.id },
  data: {
    ingredients: {
      connectOrCreate: {
        where: { name: "spinach" },
        create: { name: "spinach" },
      },
    },
  },
});

// (4) Fetch all vegan recipes with ingredient names
const veganRecipes = await prisma.recipe.findMany({
  where: {
    dietaryTags: {
      some: { name: "vegan" },
    },
  },
  select: {
    id: true,
    name: true,
    ingredients: {
      select: { name: true },
      orderBy: { name: "asc" },
    },
    dietaryTags: {
      select: { name: true },
    },
  },
});
// veganRecipes[0].ingredients[0].name: 'avocado'

// (5) Replace all tags using set
await prisma.recipe.update({
  where: { id: recipe.id },
  data: {
    dietaryTags: {
      set: [], // first clear all existing tag connections
    },
  },
});
await prisma.recipe.update({
  where: { id: recipe.id },
  data: {
    dietaryTags: {
      connectOrCreate: [
        { where: { name: "vegan" }, create: { name: "vegan" } },
        { where: { name: "high-protein" }, create: { name: "high-protein" } },
      ],
    },
  },
});

// Or in a single operation:
await prisma.recipe.update({
  where: { id: recipe.id },
  data: {
    dietaryTags: {
      set: [{ name: "vegan" }, { name: "high-protein" }],
      // set replaces all existing connections — "vegan" and "high-protein" must already exist
    },
  },
});
```

---

---

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

# 7 — Relation Modes — foreignKeys vs prisma

---

## T — TL;DR

The `relationMode` setting in the datasource block controls how Prisma enforces referential integrity. `foreignKeys` (the default) delegates FK constraint enforcement to the database — PostgreSQL validates relations on every write. `prisma` mode handles referential actions in Prisma Client code instead of the database — no FK constraints are created in the schema. Use `foreignKeys` (default) for PostgreSQL. Use `prisma` mode only for databases that don't support FK constraints natively (PlanetScale).

---

## K — Key Concepts

```prisma
// ── foreignKeys mode (default for PostgreSQL) ──────────────────────────────
datasource db {
  provider     = "postgresql"
  url          = env("DATABASE_URL")
  relationMode = "foreignKeys"   // explicit (this is the default — can omit)
}

// With foreignKeys mode:
// ✅ PostgreSQL enforces FK constraints at the database level
// ✅ INSERT with invalid FK fails at the DB layer (not just Prisma)
// ✅ ON DELETE CASCADE / RESTRICT enforced by PostgreSQL
// ✅ FK indexes recommended (but not auto-created — add @@index manually)
// ✅ Full referential integrity even for raw SQL queries
```

```prisma
// ── prisma mode (for databases without native FK support) ─────────────────
datasource db {
  provider     = "mysql"   // e.g. PlanetScale (MySQL without FK constraints)
  url          = env("DATABASE_URL")
  relationMode = "prisma"
}

// With prisma mode:
// ❌ NO FK constraints in the database
// ✅ Prisma Client emulates referential actions in application code
// ⚠️ Raw SQL bypasses referential integrity (no DB-level enforcement)
// ⚠️ Requires manual @@index on ALL relation scalar fields (FK columns)
//    because PostgreSQL/MySQL can't create FK constraint indexes automatically
//    when no FK constraint exists
```

```prisma
// ── Required @@index in prisma mode ───────────────────────────────────────
// In foreignKeys mode: FK constraints implicitly help with some queries
// In prisma mode: you MUST add @@index on every FK field or face full table scans

// ❌ In prisma mode — no FK constraint, no automatic index, full scan on join
model Post {
  userId Int
  user   User @relation(fields: [userId], references: [id])
  // No @@index([userId]) → every "WHERE user_id = ?" is a full scan
}

// ✅ In prisma mode — always add @@index on relation scalar fields
model Post {
  userId Int
  user   User @relation(fields: [userId], references: [id])
  @@index([userId])  // ← required in prisma mode
}
```

```
── foreignKeys vs prisma — comparison ───────────────────────────────────────

Feature                     │ foreignKeys           │ prisma
────────────────────────────┼───────────────────────┼─────────────────────────
FK constraint in DB         │ ✅ Yes                │ ❌ No
DB-level referential safety │ ✅ Yes                │ ❌ Only via Prisma Client
Raw SQL respects FK rules   │ ✅ Yes                │ ❌ No
onDelete/onUpdate           │ DB enforces           │ Prisma emulates
Supported databases         │ PostgreSQL, MySQL,    │ PlanetScale (MySQL),
                            │ SQL Server, SQLite    │ MongoDB (different rules)
Implicit M:N join table     │ ✅ Works              │ ✅ Works (with @@index)
Required @@index on FKs     │ Recommended (perf)    │ Required (correctness)
```

```prisma
// ── Referential actions emulated in prisma mode ────────────────────────────
// When using prisma mode, Prisma Client intercepts delete/update calls
// and emulates the FK action in application code

// onDelete: Cascade  → Prisma issues DELETE on child rows before deleting parent
// onDelete: SetNull  → Prisma issues UPDATE to set FK to NULL on child rows
// onDelete: Restrict → Prisma checks for child rows and throws if any exist

// ⚠️ Emulation runs in a transaction but NOT an atomic database transaction
// ⚠️ If Prisma emulation crashes mid-way, database may be in inconsistent state
// This is why foreignKeys mode (DB-enforced) is always preferred for PostgreSQL
```

---

## W — Why It Matters

- `relationMode = "foreignKeys"` is the default and correct setting for PostgreSQL — it means PostgreSQL validates all FK references at the database level. Data integrity is guaranteed even when rows are inserted via raw SQL, database tools (pgAdmin, psql), or other ORMs. This is a fundamental database design principle.
- `prisma` mode should never be used with PostgreSQL unless you have a very specific reason — it removes database-level referential integrity and puts the entire burden on Prisma Client. Raw SQL `INSERT` statements can create orphaned rows silently.
- The `@@index` requirement in `prisma` mode is a gotcha that catches many developers — without database FK constraints, there are no implicit index hints, and without explicit `@@index` declarations on FK fields, many queries become full table scans. Prisma v4+ added a warning for this.

---

## I — Interview Q&A

### Q: What is `relationMode = "prisma"` and when would you use it?

**A:** `relationMode = "prisma"` tells Prisma to handle referential integrity actions (cascade deletes, set null, restrict) in application code rather than relying on database-level foreign key constraints. The database schema is generated WITHOUT FK constraints. This mode exists specifically for databases that don't support FK constraints natively — the primary use case is PlanetScale (a MySQL-compatible serverless database that uses Vitess, which doesn't support FK constraints due to its distributed sharding model). You would never choose `prisma` mode for PostgreSQL unless you have a specific requirement to bypass FK constraints. For PostgreSQL, always use the default `foreignKeys` mode — it gives you database-level enforcement, works correctly with raw SQL, and is part of PostgreSQL's core reliability guarantee.

---

## C — Common Pitfalls + Fix

### ❌ Setting `relationMode = "prisma"` on a PostgreSQL database — loses FK enforcement

```prisma
// ❌ Unnecessary and harmful for PostgreSQL — removes FK constraints from DB
datasource db {
  provider     = "postgresql"
  url          = env("DATABASE_URL")
  relationMode = "prisma"   // ← NEVER for PostgreSQL ❌
}
// Result: no FOREIGN KEY constraints in PostgreSQL
// Raw SQL INSERT with invalid user_id succeeds — orphaned data ❌
```

**Fix:** Use the default `foreignKeys` mode (or omit `relationMode` entirely):

```prisma
// ✅ For PostgreSQL: use foreignKeys mode (or just omit it — it's the default)
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
  // relationMode = "foreignKeys"  ← this is the default, can be omitted
}
```

---

## K — Coding Challenge + Solution

### Challenge

Show side-by-side schemas for a `Blog → Post → Comment` chain: (1) Version A: `foreignKeys` mode (PostgreSQL production) with proper `onDelete` rules and optional `@@index`; (2) Version B: `prisma` mode (PlanetScale) with required `@@index` on all FK fields and same `onDelete` rules. Explain in comments why each choice differs. Show how a cascade delete of a Blog is handled differently in each mode.

### Solution

```prisma
// ═══════════════════════════════════════════════════════════════════════════
// VERSION A: foreignKeys mode — PostgreSQL (production standard)
// ═══════════════════════════════════════════════════════════════════════════

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
  // relationMode defaults to "foreignKeys" — FK constraints created in PostgreSQL
}

model Blog {
  id    Int    @id @default(autoincrement())
  name  String
  posts Post[] // back-relation
  @@map("blogs")
}

model Post {
  id     Int    @id @default(autoincrement())
  title  String

  blogId Int    @map("blog_id")
  blog   Blog   @relation(
    fields:   [blogId],
    references: [id],
    onDelete: Cascade   // DB enforces: DELETE blogs → DELETE posts via FK constraint
  )
  comments Comment[]

  // @@index([blogId]) — recommended for performance, not strictly required
  // PostgreSQL FK constraint means the FK is respected at DB level regardless
  @@index([blogId])   // still add for query performance
  @@map("posts")
}

model Comment {
  id     Int    @id @default(autoincrement())
  body   String

  postId Int    @map("post_id")
  post   Post   @relation(
    fields:   [postId],
    references: [id],
    onDelete: Cascade   // DB enforces: DELETE posts → DELETE comments
  )

  @@index([postId])
  @@map("comments")
}

// Cascade delete behavior in foreignKeys mode:
// await prisma.blog.delete({ where: { id: 1 } })
// → PostgreSQL executes:
//   DELETE FROM comments WHERE post_id IN (SELECT id FROM posts WHERE blog_id = 1)
//   DELETE FROM posts WHERE blog_id = 1
//   DELETE FROM blogs WHERE id = 1
// → All via ON DELETE CASCADE FK constraints — ATOMIC, enforced at DB level ✅
// → Even raw SQL: DELETE FROM blogs WHERE id = 1  ← ALSO cascades ✅
```

```prisma
// ═══════════════════════════════════════════════════════════════════════════
// VERSION B: prisma mode — PlanetScale (MySQL without FK constraints)
// ═══════════════════════════════════════════════════════════════════════════

datasource db {
  provider     = "mysql"
  url          = env("DATABASE_URL")
  relationMode = "prisma"  // ← required for PlanetScale (no DB FK constraints)
}

model Blog {
  id    Int    @id @default(autoincrement())
  name  String
  posts Post[]
}

model Post {
  id     Int    @id @default(autoincrement())
  title  String

  blogId Int
  blog   Blog @relation(
    fields:   [blogId],
    references: [id],
    onDelete: Cascade   // Prisma CLIENT emulates cascade in application code
  )
  comments Comment[]

  // !! REQUIRED in prisma mode !!
  // No FK constraint = no implicit index = full table scan without this
  @@index([blogId])   // ← REQUIRED (not just recommended) in prisma mode
}

model Comment {
  id     Int    @id @default(autoincrement())
  body   String

  postId Int
  post   Post @relation(
    fields:   [postId],
    references: [id],
    onDelete: Cascade   // Prisma CLIENT emulates cascade
  )

  // !! REQUIRED in prisma mode !!
  @@index([postId])   // ← REQUIRED
}

// Cascade delete behavior in prisma mode:
// await prisma.blog.delete({ where: { id: 1 } })
// → Prisma Client executes:
//   1. prisma.comment.deleteMany({ where: { post: { blogId: 1 } } })
//   2. prisma.post.deleteMany({ where: { blogId: 1 } })
//   3. prisma.blog.delete({ where: { id: 1 } })
// → Three separate queries — NOT a single DB-level cascade
// → If step 2 fails: comments deleted but posts still exist → INCONSISTENT ❌
// → Raw SQL: DELETE FROM blogs WHERE id = 1  ← does NOT cascade (no FK) ❌
```

---

---

# 8 — Initial Migration — prisma migrate dev from Zero

---

## T — TL;DR

`prisma migrate dev` is the primary development migration command. On first run, it reads the schema, generates SQL DDL, creates the `prisma/migrations/` directory, and applies the migration to the development database. The migration is recorded in a `_prisma_migrations` table. This command creates a named migration file, applies it, and regenerates the Prisma Client — all in one step.

---

## K — Key Concepts

```
── The prisma migration directory structure ──────────────────────────────────

prisma/
├── schema.prisma
└── migrations/
    ├── migration_lock.toml          ← records which database provider is used
    └── 20250615143022_init/
        └── migration.sql            ← the actual SQL DDL for this migration

Each migration folder name: {timestamp}_{name}
  timestamp:  YYYYMMDDHHMMSS (UTC)
  name:       the name you provide (or auto-generated)

migration_lock.toml — prevents accidentally switching database providers:
  provider = "postgresql"
```

```bash
# ── First migration: from zero ─────────────────────────────────────────────
npx prisma migrate dev --name init

# What it does:
# 1. Checks if the database is reachable (uses DATABASE_URL)
# 2. Reads schema.prisma
# 3. Creates a "shadow database" to compute the SQL diff
# 4. Generates: prisma/migrations/20250615143022_init/migration.sql
# 5. Applies the migration SQL to the development database
# 6. Records the migration in the _prisma_migrations table
# 7. Runs npx prisma generate (regenerates the Prisma Client)

# Output:
# ✔ Created and applied migration `20250615143022_init`
# ✔ Generated Prisma Client (v7.x.x)
```

```sql
-- ── Example: generated migration.sql for init ────────────────────────────
-- Prisma generates this SQL from your schema.prisma
-- prisma/migrations/20250615143022_init/migration.sql

-- CreateEnum
CREATE TYPE "user_role" AS ENUM ('admin', 'user', 'moderator');

-- CreateTable
CREATE TABLE "users" (
    "id" SERIAL NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT,
    "role" "user_role" NOT NULL DEFAULT 'user',
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "posts" (
    "id" SERIAL NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT,
    "is_published" BOOLEAN NOT NULL DEFAULT false,
    "author_id" INTEGER NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "posts_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE INDEX "posts_author_id_idx" ON "posts"("author_id");

-- AddForeignKey
ALTER TABLE "posts" ADD CONSTRAINT "fk_posts_author_id"
    FOREIGN KEY ("author_id")
    REFERENCES "users"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;
```

```bash
# ── Key flags for prisma migrate dev ─────────────────────────────────────
npx prisma migrate dev --name init          # named migration
npx prisma migrate dev                      # Prisma prompts for name interactively
npx prisma migrate dev --create-only        # generate SQL but DON'T apply it yet
npx prisma migrate dev --skip-generate      # apply migration but skip prisma generate
npx prisma migrate dev --reset              # ⚠️ DROP ALL TABLES, reapply all migrations
```

```bash
# ── prisma migrate dev --create-only workflow ────────────────────────────
# Use when: you want to review or edit the SQL before applying

# Step 1: generate SQL file only
npx prisma migrate dev --name add_users --create-only
# Creates: prisma/migrations/20250615143022_add_users/migration.sql
# Does NOT apply it yet

# Step 2: review/edit the migration.sql
# (e.g. add a custom index, backfill data, add a partial index)
vim prisma/migrations/20250615143022_add_users/migration.sql

# Step 3: apply the edited migration
npx prisma migrate dev
# Prisma detects unapplied migration and applies it
```

```bash
# ── What _prisma_migrations table tracks ─────────────────────────────────
# Prisma creates this table in your database on first migrate dev
# SELECT * FROM _prisma_migrations;
# id | checksum | finished_at | migration_name | logs | rolled_back_at | started_at | applied_steps_count
# 1  | abc123   | 2025-06-15  | 20250615_init  | null | null           | 2025-06-15 | 1
```

```bash
# ── prisma db push vs prisma migrate dev ─────────────────────────────────
# These are TWO DIFFERENT commands with different purposes:

# prisma db push:
# - Directly syncs schema to DB without creating migration files
# - Good for: prototyping, development, Prisma Studio demos
# - BAD for: production (no migration history, no rollback trail)
# - Does NOT create files in prisma/migrations/

# prisma migrate dev:
# - Creates SQL migration files + applies them
# - Required for: any shared team environment, staging, production
# - Creates an auditable history of all schema changes
# - ALWAYS use this for real projects
```

---

## W — Why It Matters

- `--create-only` is critical for production safety — it lets you review the generated SQL before it touches the database. Prisma's generated SQL is almost always correct, but complex migrations (renaming columns, changing types) need human review. Never blindly apply auto-generated migrations to production data.
- The `migration_lock.toml` file prevents a common mistake: accidentally switching the database provider (`postgresql` → `sqlite`) between team members or environments, which would make migrations incompatible. If the lock file doesn't match, Prisma throws an error.
- `prisma db push` vs `prisma migrate dev` — `db push` is a shortcut for personal prototyping. The moment you're working with a team, staging environments, or production data, you must use `migrate dev` to build a migration history. `db push` has no rollback, no audit trail, and can silently drop columns if you remove them from the schema.

---

## I — Interview Q&A

### Q: What is the difference between `prisma migrate dev` and `prisma db push`?

**A:** Both commands sync your `schema.prisma` to the database, but they serve different purposes. `prisma db push` directly applies the schema to the database without creating migration files — it's fast for prototyping and personal development but has no audit trail and cannot be used for production deployments. If you remove a field from the schema and run `db push`, it drops the column immediately with no migration file as evidence. `prisma migrate dev` generates a SQL migration file in `prisma/migrations/`, applies it, and records it in `_prisma_migrations`. This creates an auditable history — every schema change is a versioned SQL file that can be reviewed, committed to git, deployed to staging, and promoted to production using `prisma migrate deploy`. For any real project with a team or production environment, `migrate dev` is mandatory.

---

## C — Common Pitfalls + Fix

### ❌ Running `prisma db push` in a production environment

```bash
# ❌ db push directly syncs schema — drops columns, no migration file, no rollback
npx prisma db push
# "The following changes will be applied to your production database:"
# "- The column `legacy_field` will be dropped."  ← data loss, no recovery ❌
```

**Fix:** Always use `migrate dev` for development and `migrate deploy` for production:

```bash
# ✅ Development: creates migration file + applies
npx prisma migrate dev --name remove_legacy_field

# ✅ Production: applies existing migration files (never auto-generates)
npx prisma migrate deploy
```

---

## K — Coding Challenge + Solution

### Challenge

Starting from scratch, set up a complete initial migration for a simple blog: (1) write the full `schema.prisma` with `User`, `Post`, and `Tag` models (implicit M:N) with `@@map`, `@map`, enums, native types, and proper FK indexing; (2) show the exact CLI commands to initialize the project, run the first migration, and verify it; (3) show what the generated `migration.sql` would look like; (4) show how to verify the migration was applied with `prisma migrate status`.

### Solution

```prisma
// prisma/schema.prisma

generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

enum UserRole {
  ADMIN @map("admin")
  USER  @map("user")
  @@map("user_role")
}

model User {
  id        Int      @id @default(autoincrement())
  email     String   @unique
  name      String?
  role      UserRole @default(USER)
  createdAt DateTime @default(now()) @map("created_at") @db.Timestamptz
  updatedAt DateTime @updatedAt @map("updated_at") @db.Timestamptz

  posts     Post[]

  @@map("users")
}

model Post {
  id          Int      @id @default(autoincrement())
  title       String
  body        String?
  isPublished Boolean  @default(false) @map("is_published")
  createdAt   DateTime @default(now()) @map("created_at") @db.Timestamptz
  updatedAt   DateTime @updatedAt @map("updated_at") @db.Timestamptz

  authorId    Int      @map("author_id")
  author      User     @relation(fields: [authorId], references: [id], onDelete: Cascade)

  tags        Tag[]    // implicit M:N

  @@index([authorId])
  @@map("posts")
}

model Tag {
  id    Int    @id @default(autoincrement())
  name  String @unique
  posts Post[]

  @@map("tags")
}
```

```bash
# ── CLI commands ─────────────────────────────────────────────────────────────

# 1. Install Prisma (if not already installed)
npm install prisma @prisma/client
npm install -D prisma

# 2. Initialize Prisma (creates prisma/ directory with schema.prisma)
npx prisma init --datasource-provider postgresql

# 3. Set DATABASE_URL in .env
echo 'DATABASE_URL="postgresql://postgres:password@localhost:5432/blog_dev"' >> .env

# 4. Run the first migration
npx prisma migrate dev --name init

# Output:
# Environment variables loaded from .env
# Prisma schema loaded from prisma/schema.prisma
# ✔ Created and applied migration `20250615143022_init` in 342ms
# ✔ Generated Prisma Client (v7.x.x) to ./node_modules/.prisma/client

# 5. Verify migration status
npx prisma migrate status
# Output:
# 1 migration found in prisma/migrations
# ✔ Database schema is up to date!

# 6. Inspect the generated SQL
cat prisma/migrations/20250615143022_init/migration.sql

# 7. Open Prisma Studio to verify tables
npx prisma studio
```

```sql
-- prisma/migrations/20250615143022_init/migration.sql
-- (Approximate — Prisma generates this)

-- CreateEnum
CREATE TYPE "user_role" AS ENUM ('admin', 'user');

-- CreateTable
CREATE TABLE "users" (
    "id" SERIAL NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT,
    "role" "user_role" NOT NULL DEFAULT 'user',
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "posts" (
    "id" SERIAL NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT,
    "is_published" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,
    "author_id" INTEGER NOT NULL,

    CONSTRAINT "posts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tags" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,

    CONSTRAINT "tags_pkey" PRIMARY KEY ("id")
);

-- CreateTable (implicit M:N join table)
CREATE TABLE "_PostToTag" (
    "A" INTEGER NOT NULL,
    "B" INTEGER NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE INDEX "posts_author_id_idx" ON "posts"("author_id");

-- CreateIndex
CREATE UNIQUE INDEX "tags_name_key" ON "tags"("name");

-- CreateIndex
CREATE UNIQUE INDEX "_PostToTag_AB_unique" ON "_PostToTag"("A", "B");

-- CreateIndex
CREATE INDEX "_PostToTag_B_index" ON "_PostToTag"("B");

-- AddForeignKey
ALTER TABLE "posts" ADD CONSTRAINT "posts_author_id_fkey"
    FOREIGN KEY ("author_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_PostToTag" ADD CONSTRAINT "_PostToTag_A_fkey"
    FOREIGN KEY ("A") REFERENCES "posts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_PostToTag" ADD CONSTRAINT "_PostToTag_B_fkey"
    FOREIGN KEY ("B") REFERENCES "tags"("id") ON DELETE CASCADE ON UPDATE CASCADE;
```

---

---

# 9 — Iterative Migration Workflow — Evolving the Schema Safely

---

## T — TL;DR

Every schema change after the initial migration follows the same loop: modify `schema.prisma` → run `prisma migrate dev --name description` → review the generated SQL → commit both the schema and migration file to git. Complex migrations (column renames, type changes, data backfills) require editing the generated SQL before applying. Prisma detects pending unapplied migrations and applies them in order.

---

## K — Key Concepts

```bash
# ── The iterative migration loop ─────────────────────────────────────────────

# Step 1: Edit schema.prisma (add field, change type, add model, etc.)
# Step 2: Generate + apply migration
npx prisma migrate dev --name add_published_at_to_posts

# Step 3: Review the generated SQL:
cat prisma/migrations/20250616_add_published_at_to_posts/migration.sql

# Step 4: Commit to git
git add prisma/schema.prisma prisma/migrations/
git commit -m "feat: add published_at to posts"

# Repeat for every schema change
```

```
── Migration scenarios and generated SQL ─────────────────────────────────────

SCENARIO               │ Prisma action               │ SQL generated
───────────────────────┼─────────────────────────────┼─────────────────────────
Add nullable column     │ ADD COLUMN ... NULL          │ safe (existing rows get NULL)
Add required column     │ ADD COLUMN ... DEFAULT ...   │ needs default or data migration
Add unique constraint   │ CREATE UNIQUE INDEX          │ fails if duplicates exist
Add index               │ CREATE INDEX                 │ safe
Add new model (table)   │ CREATE TABLE                 │ safe
Add enum value          │ ALTER TYPE ... ADD VALUE     │ safe
Remove column           │ DROP COLUMN                  │ ⚠️ data loss — review!
Remove model            │ DROP TABLE                   │ ⚠️ data loss — review!
Rename column           │ DROP + ADD (not RENAME)      │ ⚠️ data loss — must edit SQL
Change column type      │ ALTER COLUMN + CAST          │ may fail if cast fails — review
```

```bash
# ── Adding a nullable column — safe ───────────────────────────────────────
# In schema.prisma: add publishedAt DateTime? to Post
npx prisma migrate dev --name add_published_at

# Generated SQL:
# ALTER TABLE "posts" ADD COLUMN "published_at" TIMESTAMPTZ;
# Safe: existing rows get NULL, no data loss ✅
```

```bash
# ── Adding a required column — needs a default or two-step migration ────────
# In schema.prisma: add slug String (required, non-nullable) to Post

# ❌ Prisma cannot add a NOT NULL column with no default if rows already exist
# Generated SQL would fail: ALTER TABLE "posts" ADD COLUMN "slug" TEXT NOT NULL
# → fails because existing rows have no value for slug

# ✅ Solution: two-step migration
# Step 1: add as nullable
npx prisma migrate dev --name add_slug_nullable --create-only
# Edit SQL to: ADD COLUMN "slug" TEXT;  (nullable first)
npx prisma migrate dev  # apply

# Step 2: backfill values
npx prisma migrate dev --name backfill_slug --create-only
# Edit SQL to:
# UPDATE posts SET slug = LOWER(REPLACE(title, ' ', '-')) WHERE slug IS NULL;
# ALTER TABLE posts ALTER COLUMN slug SET NOT NULL;
npx prisma migrate dev  # apply
```

```bash
# ── Renaming a column — MUST edit the generated SQL ───────────────────────
# In schema.prisma: rename body → content on Post (and update @map)

# Prisma sees: body was removed, content was added
# Generated SQL (incorrect):
# ALTER TABLE "posts" DROP COLUMN "body";
# ALTER TABLE "posts" ADD COLUMN "content" TEXT;
# → This DROPS the column and creates a new empty one — DATA LOSS ❌

# Fix: use --create-only and edit the SQL
npx prisma migrate dev --name rename_body_to_content --create-only

# Edit migration.sql:
# BEFORE (generated):
# ALTER TABLE "posts" DROP COLUMN "body";
# ALTER TABLE "posts" ADD COLUMN "content" TEXT;
#
# AFTER (edited):
# ALTER TABLE "posts" RENAME COLUMN "body" TO "content";  ← no data loss ✅

npx prisma migrate dev  # apply the edited migration
```

```bash
# ── Adding a new relation (FK) — standard flow ───────────────────────────
# Add category_id to posts: Post now belongs to Category

# In schema.prisma: add CategoryId Int?, category Category? @relation(...)
npx prisma migrate dev --name add_category_to_posts

# Generated SQL:
# ALTER TABLE "posts" ADD COLUMN "category_id" INTEGER;
# ALTER TABLE "posts" ADD CONSTRAINT "posts_category_id_fkey"
#   FOREIGN KEY ("category_id") REFERENCES "categories"("id") ON DELETE SET NULL;
# CREATE INDEX "posts_category_id_idx" ON "posts"("category_id");
```

```bash
# ── Data migrations — seeding data as part of a schema migration ──────────
# When you need to both change schema AND migrate existing data

npx prisma migrate dev --name split_name_into_first_last --create-only

# Edit migration.sql to add data transformation:
# -- Add new columns
# ALTER TABLE "users" ADD COLUMN "first_name" TEXT;
# ALTER TABLE "users" ADD COLUMN "last_name" TEXT;
#
# -- Backfill from existing name column
# UPDATE users
# SET first_name = split_part(name, ' ', 1),
#     last_name  = split_part(name, ' ', 2)
# WHERE name IS NOT NULL;
#
# -- Optional: drop old column (can be a separate later migration)
# ALTER TABLE "users" DROP COLUMN "name";

npx prisma migrate dev  # apply
```

```bash
# ── Multiple unapplied migrations ─────────────────────────────────────────
# If a team member's branch has 2 pending migrations and you pull their code:
npx prisma migrate status
# Output:
# 2 migrations found in prisma/migrations that have not yet been applied:
#   - 20250616_add_slug
#   - 20250617_add_category

npx prisma migrate dev
# Applies all pending migrations in order ✅
```

---

## W — Why It Matters

- Column renames are the most dangerous common migration — Prisma generates `DROP COLUMN` + `ADD COLUMN` (data loss) instead of `RENAME COLUMN`. Always use `--create-only` and edit the SQL for any rename operation. This is not a Prisma bug — Prisma cannot distinguish "this column was renamed" from "this column was removed and a new one was added" just from comparing schemas.
- Data migrations embedded in schema migrations are powerful but risky — if the `UPDATE` statement fails halfway through, the migration is partially applied and the `_prisma_migrations` table records it as failed. Test data migrations on a copy of production data before applying.
- Git-committing migration files alongside `schema.prisma` is the non-negotiable practice that makes team collaboration work — if two developers run `migrate dev` on the same schema change independently, they get two migration files with different timestamps. Only one should be kept. Always coordinate migration file creation.

---

## I — Interview Q&A

### Q: How do you safely rename a column in Prisma without losing data?

**A:** Prisma's `migrate dev` treats a field rename as "remove old field + add new field" because it compares the before/after schema and sees one column disappearing and a new one appearing — it cannot infer rename intent. The generated SQL would be `DROP COLUMN old_name; ADD COLUMN new_name;` which destroys the data. The safe process is: (1) run `prisma migrate dev --name rename_field --create-only` to generate the SQL file without applying it; (2) open the generated `migration.sql` and replace the `DROP + ADD` with `ALTER TABLE t RENAME COLUMN old_name TO new_name;`; (3) also update `schema.prisma` to change the field name and add `@map("old_name")` so Prisma knows the column mapping; (4) run `prisma migrate dev` to apply the edited migration. The `RENAME COLUMN` statement preserves all existing data.

---

## C — Common Pitfalls + Fix

### ❌ Not using `--create-only` for a column rename — data loss

```bash
# ❌ Directly running migrate dev on a field rename
# Schema change: body → content on Post model

npx prisma migrate dev --name rename_body_to_content
# Prisma generates and IMMEDIATELY APPLIES:
# ALTER TABLE "posts" DROP COLUMN "body";    ← data gone ❌
# ALTER TABLE "posts" ADD COLUMN "content" TEXT;
```

**Fix:**

```bash
# ✅ Step 1: generate only, don't apply
npx prisma migrate dev --name rename_body_to_content --create-only

# Step 2: edit the generated SQL
# Change from:
#   ALTER TABLE "posts" DROP COLUMN "body";
#   ALTER TABLE "posts" ADD COLUMN "content" TEXT;
# To:
#   ALTER TABLE "posts" RENAME COLUMN "body" TO "content";

# Step 3: apply the edited migration
npx prisma migrate dev

# Step 4: update schema.prisma to add @map if needed
# model Post {
#   content String @map("content")  ← field name matches SQL now
# }
```

---

## K — Coding Challenge + Solution

### Challenge

Starting from the blog schema (User, Post, Tag), perform four iterative migrations: (1) add a nullable `publishedAt DateTime?` to Post; (2) add a required `slug String @unique` to Post using a two-step approach; (3) add a new `Category` model and add a nullable FK from Post to Category; (4) add a `viewCount BigInt @default(0)` to Post. Show the CLI commands, the expected SQL for each, and the schema state after all four migrations.

### Solution

```bash
# ── Migration 1: add nullable publishedAt ─────────────────────────────────
# Edit schema.prisma: add publishedAt DateTime? @map("published_at") @db.Timestamptz

npx prisma migrate dev --name add_published_at_to_posts

# Generated SQL (auto-applied safely):
# ALTER TABLE "posts" ADD COLUMN "published_at" TIMESTAMPTZ;
```

```bash
# ── Migration 2a: add slug as nullable first ──────────────────────────────
# Edit schema.prisma: add slug String? @unique

npx prisma migrate dev --name add_slug_nullable_to_posts

# Generated SQL:
# ALTER TABLE "posts" ADD COLUMN "slug" TEXT;
# CREATE UNIQUE INDEX "posts_slug_key" ON "posts"("slug");
```

```bash
# ── Migration 2b: backfill slug + make NOT NULL ────────────────────────────
npx prisma migrate dev --name backfill_and_set_slug_not_null --create-only

# Edit migration.sql:
# UPDATE "posts"
# SET "slug" = LOWER(REGEXP_REPLACE(REPLACE(title, ' ', '-'), '[^a-z0-9\-]', '', 'g'))
# WHERE "slug" IS NULL;
# ALTER TABLE "posts" ALTER COLUMN "slug" SET NOT NULL;

# Update schema.prisma: change slug String? → slug String

npx prisma migrate dev  # applies the edited migration
```

```bash
# ── Migration 3: add Category model + nullable FK on Post ─────────────────
# Edit schema.prisma: add Category model and categoryId Int? to Post

npx prisma migrate dev --name add_category_model_and_post_fk

# Generated SQL:
# CREATE TABLE "categories" (
#     "id" SERIAL NOT NULL,
#     "name" TEXT NOT NULL,
#     "slug" TEXT NOT NULL,
#     CONSTRAINT "categories_pkey" PRIMARY KEY ("id")
# );
# CREATE UNIQUE INDEX "categories_slug_key" ON "categories"("slug");
# ALTER TABLE "posts" ADD COLUMN "category_id" INTEGER;
# CREATE INDEX "posts_category_id_idx" ON "posts"("category_id");
# ALTER TABLE "posts" ADD CONSTRAINT "posts_category_id_fkey"
#   FOREIGN KEY ("category_id") REFERENCES "categories"("id") ON DELETE SET NULL ON UPDATE CASCADE;
```

```bash
# ── Migration 4: add viewCount to Post ────────────────────────────────────
# Edit schema.prisma: add viewCount BigInt @default(0) @map("view_count")

npx prisma migrate dev --name add_view_count_to_posts

# Generated SQL:
# ALTER TABLE "posts" ADD COLUMN "view_count" BIGINT NOT NULL DEFAULT 0;
```

```prisma
// ── Final schema.prisma after all 4 migrations ────────────────────────────

generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

enum UserRole {
  ADMIN @map("admin")
  USER  @map("user")
  @@map("user_role")
}

model User {
  id        Int      @id @default(autoincrement())
  email     String   @unique
  name      String?
  role      UserRole @default(USER)
  createdAt DateTime @default(now()) @map("created_at") @db.Timestamptz
  updatedAt DateTime @updatedAt @map("updated_at") @db.Timestamptz
  posts     Post[]
  @@map("users")
}

model Category {
  id    Int    @id @default(autoincrement())
  name  String
  slug  String @unique
  posts Post[]
  @@map("categories")
}

model Post {
  id          Int       @id @default(autoincrement())
  title       String
  slug        String    @unique                     // Added in migration 2
  body        String?
  isPublished Boolean   @default(false) @map("is_published")
  publishedAt DateTime? @map("published_at") @db.Timestamptz  // Added in migration 1
  viewCount   BigInt    @default(0) @map("view_count")         // Added in migration 4
  createdAt   DateTime  @default(now()) @map("created_at") @db.Timestamptz
  updatedAt   DateTime  @updatedAt @map("updated_at") @db.Timestamptz

  authorId    Int       @map("author_id")
  author      User      @relation(fields: [authorId], references: [id], onDelete: Cascade)

  categoryId  Int?      @map("category_id")         // Added in migration 3
  category    Category? @relation(fields: [categoryId], references: [id], onDelete: SetNull)

  tags        Tag[]

  @@index([authorId])
  @@index([categoryId])                              // Added in migration 3
  @@map("posts")
}

model Tag {
  id    Int    @id @default(autoincrement())
  name  String @unique
  posts Post[]
  @@map("tags")
}
```

---

---

# 10 — Migration History, Squashing, and Production Deploy

---

## T — TL;DR

Prisma maintains a complete migration history in `prisma/migrations/`. `prisma migrate deploy` applies all unapplied migrations in a production environment — it never generates new migrations, it only applies existing ones. `prisma migrate status` checks what's applied. `prisma migrate resolve` marks a failed migration as resolved. Migration squashing (combining many migrations into one baseline) is done with `prisma migrate diff` + `baseline` for existing databases.

---

## K — Key Concepts

```bash
# ── prisma migrate status — check migration state ─────────────────────────
npx prisma migrate status

# Outputs one of three states:
# ✅ "Database schema is up to date!" — all migrations applied
# ⚠️ "N migrations found that have not yet been applied"
# ❌ "Some migrations are applied but not included in the migration folder"
#     (migration in DB but file is missing — dangerous)
```

```bash
# ── prisma migrate deploy — production deployments ────────────────────────
npx prisma migrate deploy

# What it does:
# 1. Connects to the database (uses DATABASE_URL)
# 2. Reads all .sql files in prisma/migrations/
# 3. Checks _prisma_migrations table for already-applied migrations
# 4. Applies ONLY the unapplied migrations in chronological order
# 5. Records each applied migration in _prisma_migrations

# What it does NOT do:
# ❌ Does NOT generate new migration files
# ❌ Does NOT create a shadow database
# ❌ Does NOT run prisma generate (do this separately)
# ❌ Does NOT prompt interactively (safe for CI/CD)

# Production deployment script:
# npx prisma migrate deploy && node dist/server.js
```

```bash
# ── CI/CD migration deployment pattern ───────────────────────────────────
# package.json scripts:
# "db:deploy": "prisma migrate deploy",
# "db:generate": "prisma generate",
# "build": "prisma generate && tsc",
# "start:migrate": "prisma migrate deploy && node dist/server.js"

# Vercel (in vercel.json or dashboard):
# Build Command: npx prisma generate && npm run build
# Deploy with migrate: add a pre-build script or use Vercel deploy hooks
```

```bash
# ── prisma migrate resolve — handling failed migrations ────────────────────
# If a migration fails halfway, it's marked as failed in _prisma_migrations
# Other commands refuse to run until the failure is resolved

# Option A: the migration was actually applied successfully (false failure)
npx prisma migrate resolve --applied "20250615143022_init"
# Marks the migration as successfully applied in _prisma_migrations

# Option B: the migration should be rolled back / re-run
npx prisma migrate resolve --rolled-back "20250615143022_init"
# Marks the migration as rolled back (allows re-running it)

# After resolving, run migrate deploy to continue
npx prisma migrate deploy
```

```bash
# ── prisma migrate diff — generate SQL diffs without migrating ────────────
# Useful for: reviewing what SQL would be generated, creating custom migrations,
# baselining existing databases

# Diff between schema and empty database:
npx prisma migrate diff \
  --from-empty \
  --to-schema-datamodel prisma/schema.prisma \
  --script > prisma/migrations/baseline.sql

# Diff between two schema states:
npx prisma migrate diff \
  --from-schema-datamodel prisma/schema_old.prisma \
  --to-schema-datamodel prisma/schema.prisma \
  --script

# Diff between database and schema:
npx prisma migrate diff \
  --from-url $DATABASE_URL \
  --to-schema-datamodel prisma/schema.prisma \
  --script
```

```bash
# ── Baselining an existing database (not created by Prisma) ─────────────────
# Scenario: you have an existing PostgreSQL database and want to start using Prisma migrations
# without recreating the database from scratch

# Step 1: introspect the existing database (generate schema.prisma from DB)
npx prisma db pull
# Creates/updates schema.prisma to match the existing DB

# Step 2: create the migrations directory and an initial migration file
mkdir -p prisma/migrations/20250615000000_baseline

# Step 3: create an EMPTY migration.sql (the DB already has the schema)
touch prisma/migrations/20250615000000_baseline/migration.sql
# Empty file = "this migration was already applied by other means"

# Step 4: mark the baseline migration as applied (without running it)
npx prisma migrate resolve --applied "20250615000000_baseline"
# _prisma_migrations now records this as applied ✅

# Step 5: from now on, use normal migrate dev workflow for schema changes
npx prisma migrate dev --name add_new_feature
```

```bash
# ── Migration squashing — consolidating many migrations into one ──────────
# Use case: 50+ migration files, want to clean up migration history for new deploys

# ⚠️ Only squash when:
# ✅ All environments (prod, staging) have the current schema applied
# ✅ The team agrees on the squash point
# ✅ You don't need the individual migration history for rollback

# Step 1: generate the consolidated SQL from the current schema
npx prisma migrate diff \
  --from-empty \
  --to-schema-datamodel prisma/schema.prisma \
  --script > /tmp/consolidated.sql

# Step 2: archive old migrations (don't delete — just for reference)
mv prisma/migrations prisma/migrations_archive

# Step 3: create new baseline migration
mkdir -p prisma/migrations/20250615000000_squashed_baseline
cp /tmp/consolidated.sql prisma/migrations/20250615000000_squashed_baseline/migration.sql

# Step 4: on all environments, mark the squashed baseline as applied
npx prisma migrate resolve --applied "20250615000000_squashed_baseline"

# Step 5: from now on, all new migrations build on the squashed baseline
npx prisma migrate dev --name first_after_squash
```

```
── _prisma_migrations table — what Prisma tracks ────────────────────────────

Column              │ Description
────────────────────┼──────────────────────────────────────────────────
id                  │ UUID — unique identifier for each migration record
checksum            │ SHA-256 of the migration.sql content
migration_name      │ timestamp + name (20250615143022_init)
started_at          │ when apply started
finished_at         │ when apply finished (NULL if failed)
logs                │ any output from the migration
rolled_back_at      │ if rolled back (via migrate resolve --rolled-back)
applied_steps_count │ number of SQL statements applied

Key behaviors:
- Prisma checks checksum on every deploy — if migration.sql is edited after apply, deploy fails
- Never edit applied migration files — create a new migration instead
- The checksum guard prevents silent divergence between file and DB state
```

---

## W — Why It Matters

- `prisma migrate deploy` is the only safe production migration command — it applies existing files without generating new ones, making it safe for automated CI/CD pipelines. It also validates checksums — if someone edited a migration file after it was applied, deploy refuses to run. This prevents drift between the code and database.
- The baselining workflow is essential for teams adopting Prisma on an existing codebase — without it, the first `migrate dev` would try to create all tables that already exist, failing with "table already exists" errors. The empty baseline file + `migrate resolve --applied` tells Prisma "we're starting from here."
- Never edit an already-applied migration file — Prisma computes and stores a checksum of each migration file when it's applied. If you edit the file later, `migrate deploy` on the next environment will fail with a checksum mismatch. Always create a new migration to fix mistakes in applied migrations.

---

## I — Interview Q&A

### Q: How does `prisma migrate deploy` differ from `prisma migrate dev`, and why do you use different commands for development and production?

**A:** `prisma migrate dev` is an interactive development tool — it generates new migration files by comparing the current schema to the database, creates a shadow database to compute diffs, applies the migrations, and regenerates the Prisma Client. It's designed for iterative schema development. `prisma migrate deploy` is a production deployment tool — it reads the existing migration files in `prisma/migrations/`, checks `_prisma_migrations` to see which have been applied, and applies only the unapplied ones in order. It never generates new files, never creates a shadow database, and never prompts interactively. The separation matters because: in production, you want deterministic, auditable deployments of pre-reviewed SQL — not auto-generated migrations from a live comparison. The migration files in `prisma/migrations/` are the source of truth for what runs in production, and they go through review (git, pull requests, staging) before reaching production.

### Q: What is the purpose of the `_prisma_migrations` table and what happens if a migration fails?

**A:** The `_prisma_migrations` table is Prisma's migration history ledger — it records every migration that has been applied, including its name, checksum, start time, finish time, and any error logs. Prisma reads this table on every `migrate dev` or `migrate deploy` to determine which migrations are pending. If a migration fails halfway through, the row in `_prisma_migrations` has `finished_at = NULL` and `logs` containing the error. Subsequent migration commands refuse to run until the failure is resolved. You resolve it with `prisma migrate resolve --applied` (if the migration actually succeeded despite the error) or `--rolled-back` (to mark it as rolled back and re-run it). A checksum is also stored — if a migration file is modified after being applied, Prisma detects the mismatch and refuses to deploy.

---

## C — Common Pitfalls + Fix

### ❌ Editing an already-applied migration file — checksum mismatch on next deploy

```bash
# ❌ Developer edits migration.sql after it's been applied to dev database
# (to fix a typo or add a missed index)
vim prisma/migrations/20250615143022_init/migration.sql

# Later: deploy to staging
npx prisma migrate deploy
# ERROR: "The migration `20250615143022_init` was modified after it was applied."
# "Expected checksum: abc123, got: def456"
# Deploy blocked ❌
```

**Fix:** Never edit applied migrations — always create a new one:

```bash
# ✅ Fix the missed index by creating a new migration
npx prisma migrate dev --name add_missing_index_on_posts
# prisma/migrations/20250616_add_missing_index_on_posts/migration.sql:
# CREATE INDEX "posts_title_idx" ON "posts"("title");

# Commit both files and deploy normally
git add prisma/migrations/
git commit -m "fix: add missing index on posts.title"
npx prisma migrate deploy  # applies only the new migration ✅
```

---

## ✅ Day 6 Complete — Prisma Relations and Migrations

| #   | Subtopic                                                  | Status |
| --- | --------------------------------------------------------- | ------ |
| 1   | Relations — Core Concepts and How Prisma Models Them      | ☐      |
| 2   | One-to-Many Relations — The Most Common Relation          | ☐      |
| 3   | One-to-One Relations — Exclusive Ownership                | ☐      |
| 4   | Explicit Many-to-Many — Junction Tables with Extra Fields | ☐      |
| 5   | Implicit Many-to-Many — Prisma-Managed Join Tables        | ☐      |
| 6   | @relation — Deep Dive on the Relation Attribute           | ☐      |
| 7   | Relation Modes — foreignKeys vs prisma                    | ☐      |
| 8   | Initial Migration — prisma migrate dev from Zero          | ☐      |
| 9   | Iterative Migration Workflow — Evolving the Schema Safely | ☐      |
| 10  | Migration History, Squashing, and Production Deploy       | ☐      |

---

## 🗺️ One-Page Mental Model — Day 6

```
RELATIONS — CORE ANATOMY
  Every relation has two sides:
    FK side (child):    userId Int          ← REAL column in DB
                        user   User @relation(fields: [userId], references: [id])  ← virtual
    Back-relation side: posts  Post[]       ← virtual, no DB column
  Rule: the scalar FK field (userId) is always real; the relation field (user) is always virtual
  Rule: relation fields are navigation helpers — Prisma uses them to build JOINs at query time
  Self-relation: requires named @relation("name") on both sides
  Multi-relation: same two models, multiple links → named @relation required on both sides

ONE-TO-MANY (1:N)
  FK lives on the "many" (child) side
  Parent: posts Post[]       ← virtual back-relation, no column
  Child:  userId Int         ← REAL FK column
          user   User @relation(fields: [userId], references: [id])
  Always: @@index([userId])  ← PostgreSQL does NOT auto-index FK columns
  onDelete: Cascade          → delete parent → delete children
  onDelete: Restrict         → delete parent → error if children exist (default for required)
  onDelete: SetNull          → delete parent → set FK to NULL (FK must be Int?)
  Required relation: userId Int   (NOT NULL)
  Optional relation: userId Int?  (NULL allowed) — relation field must also be User?

ONE-TO-ONE (1:1)
  FK lives on the "dependent/extension" side (Profile, Settings, Identity)
  CRITICAL: FK field must have @unique — without it, it's silently a 1:N
  model Profile {
    userId Int  @unique   ← @unique = enforces 1:1 at DB level
    user   User @relation(...)
  }
  model User {
    profile Profile?      ← singular optional back-relation (not an array)
  }
  onDelete: Cascade almost always correct for extension models
  Missing @unique = most common 1:1 bug

EXPLICIT MANY-TO-MANY (M:N with extra data)
  You declare the junction model yourself
  Junction has: two FK fields + @@id([fkA, fkB]) + any extra fields
  model Enrollment {
    studentId  Int  @map("student_id")
    courseId   Int  @map("course_id")
    enrolledAt DateTime @default(now())   ← extra field — why explicit is needed
    grade      String?
    @@id([studentId, courseId])           ← composite PK
    @@index([courseId])                   ← index second FK (first is covered by PK)
  }
  Both parent models: enrollments Enrollment[]  ← back-relations to junction
  Query junction directly: prisma.enrollment.update({ where: { studentId_courseId: {...} } })
  Composite @@id generates: { studentId_courseId: { studentId: x, courseId: y } } where clause
  Use explicit when: extra fields needed, individual junction records referenced by ID,
                     specific cascade rules, direct junction queries

IMPLICIT MANY-TO-MANY (M:N, no extra data)
  Prisma creates and manages the join table — no junction model in schema
  model Post { tags Tag[] }    model Tag { posts Post[] }
  Join table auto-named: _PostToTag (alphabetical)  columns: A, B
  Constraints: UNIQUE(A,B), INDEX(B), CASCADE on both FKs
  CANNOT add extra fields to implicit join table
  CANNOT query join table directly through Prisma Client
  connect:    { connect: { id: 3 } }        → ADD tag, keep existing ✅
  disconnect: { disconnect: { id: 2 } }     → REMOVE one tag
  set:        { set: [{ id: 1 }, { id: 4 }] } → REPLACE ALL existing (destructive!)
  connectOrCreate: create if not exists, connect if exists
  Requires: both models have single @id (not @@id composite), same type
  Use implicit when: purely "A associated with B", no extra data, simple use case

@RELATION ATTRIBUTE
  fields:     [userId]      ← FK scalar field(s) on this model
  references: [id]          ← referenced field(s) on the other model
  onDelete:   Cascade | Restrict | SetNull | SetDefault | NoAction
  onUpdate:   Cascade (default) | Restrict | SetNull | SetDefault | NoAction
  map:        "fk_name"     ← custom FK constraint name in PostgreSQL
  name:       "RelationName" ← disambiguation for multiple relations between same models
  Default onDelete: Restrict (required FK) or SetNull (nullable FK)
  Default onUpdate: Cascade
  Named relation: must EXACTLY match on both sides → common validation error source

RELATION MODES
  foreignKeys (default):
    PostgreSQL enforces FK constraints at DB level
    ON DELETE / ON UPDATE handled by PostgreSQL
    Raw SQL also respects FK rules ✅
    @@index on FK columns: recommended (performance)
    Use for: PostgreSQL, MySQL, SQL Server, SQLite

  prisma:
    No FK constraints in the database
    Prisma Client emulates referential actions in application code
    Raw SQL bypasses all referential integrity ❌
    @@index on FK columns: REQUIRED (no FK constraint = no implicit index)
    Use for: PlanetScale (Vitess/MySQL without FK support) ONLY
    NEVER use prisma mode with PostgreSQL

MIGRATIONS — CORE COMMANDS
  prisma migrate dev --name <name>      dev: generate SQL + apply + regenerate client
  prisma migrate dev --create-only      generate SQL file only, don't apply
  prisma migrate deploy                 prod: apply pending files, never generate new ones
  prisma migrate status                 check which migrations are applied / pending
  prisma migrate resolve --applied      mark failed/missing migration as applied
  prisma migrate resolve --rolled-back  mark migration as rolled back (re-run it)
  prisma migrate diff --from-empty --to-schema-datamodel schema.prisma --script
                                        generate SQL diff without migrating
  prisma db push                        sync schema to DB without migration files (dev/proto only)

MIGRATION FILES
  prisma/migrations/{timestamp}_{name}/migration.sql
  prisma/migrations/migration_lock.toml  ← locks the provider (postgresql)
  _prisma_migrations table in DB         ← tracks applied migrations + checksums
  Checksum guard: editing an applied migration.sql → deploy fails with checksum mismatch
  NEVER edit applied migration files — create a new migration to fix mistakes

MIGRATION SCENARIOS
  Add nullable column:    safe — ALTER TABLE ADD COLUMN ... NULL
  Add required column:    two steps: add nullable → backfill → SET NOT NULL
  Add index:              safe — CREATE INDEX
  Add unique constraint:  fails if duplicates exist — check data first
  Add enum value:         safe — ALTER TYPE ... ADD VALUE
  Rename column:          DANGER — Prisma generates DROP+ADD (data loss)
                          Fix: --create-only → edit to RENAME COLUMN → apply
  Remove column:          DANGER — DROP COLUMN (data loss) → review carefully
  Rename model:           DANGER — Prisma generates DROP TABLE + CREATE TABLE
                          Fix: --create-only → edit to RENAME TABLE → apply

ITERATIVE WORKFLOW
  1. Edit schema.prisma
  2. npx prisma migrate dev --name descriptive_name
  3. Review prisma/migrations/{timestamp}_{name}/migration.sql
  4. git add prisma/schema.prisma prisma/migrations/
  5. git commit -m "feat/fix: describe the schema change"
  Repeat for every change
  For renames/complex changes: add --create-only → edit SQL → re-run migrate dev

PRODUCTION DEPLOY PATTERN
  CI/CD pipeline:
    npx prisma generate          ← regenerate client from schema
    npx prisma migrate deploy    ← apply pending migrations (never generates)
    node dist/server.js          ← start app
  package.json postinstall: "prisma generate"  ← ensures client exists after npm install
  prisma migrate deploy: idempotent, safe to run on startup, validates checksums

BASELINING EXISTING DATABASE
  1. npx prisma db pull                                   ← generate schema from DB
  2. mkdir -p prisma/migrations/20250615000000_baseline
  3. touch prisma/migrations/20250615000000_baseline/migration.sql  ← empty file
  4. npx prisma migrate resolve --applied "20250615000000_baseline"
  5. Use normal migrate dev workflow from now on

SQUASHING MIGRATIONS
  Only when: all envs have current schema applied, team agrees
  npx prisma migrate diff --from-empty --to-schema-datamodel prisma/schema.prisma --script > consolidated.sql
  Archive old migrations folder
  Create new baseline migration with consolidated.sql
  Mark baseline as applied on all environments with migrate resolve --applied

KEY RULES — RELATIONS
  Always @@index([fkField])           FK columns are NOT auto-indexed in PostgreSQL
  Always @unique on 1:1 FK            without it, it's silently a 1:N
  Named @relation must match exactly  on both sides — common validation error
  Explicit M:N by default             you almost always need extra join data eventually
  foreignKeys mode for PostgreSQL     never use prisma mode with PostgreSQL
  onDelete: choose intentionally      Cascade = convenient but deletes child data
                                      Restrict = safe but requires explicit cleanup

KEY RULES — MIGRATIONS
  Never edit applied migrations       checksum mismatch blocks future deploys
  Always --create-only for renames    Prisma generates DROP+ADD → data loss without review
  migrate dev for development         generates + applies + regenerates client
  migrate deploy for production       applies existing files only, safe for CI/CD
  Commit migrations to git            migration files are the source of truth for schema history
  db push is prototyping only         no history, no rollback, never for shared environments
```

> **Your next action:** Open your current `schema.prisma` and find one relation. Identify the FK side (the model with the scalar `Int` or `String` FK field) and confirm it has a `@@index` on that FK column. If it doesn't — add one now.
