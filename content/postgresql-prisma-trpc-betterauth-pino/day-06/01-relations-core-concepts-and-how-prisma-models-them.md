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
