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
