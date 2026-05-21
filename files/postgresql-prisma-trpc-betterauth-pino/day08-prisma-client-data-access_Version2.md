# 📅 Day 8 — Prisma Client Data Access

> **Goal:** Master every data access pattern in Prisma Client — from basic CRUD to nested reads, nested writes, relation-based filtering, and aggregation. By the end of this day you can express any data access requirement in a type-safe, efficient Prisma query without reaching for raw SQL.
> **Format:** Each subtopic = 5–15 min. Do one. Stop. Come back.
> **Stack:** Prisma ORM 7.x · PostgreSQL 18 · TypeScript 6 · Node.js

---

## 📋 Day 8 Subtopic Overview

| #   | Subtopic                                                | Time   |
| --- | ------------------------------------------------------- | ------ |
| 1   | CRUD — create, findUnique, update, delete, upsert       | 12 min |
| 2   | select — Field Selection and Partial Return Types       | 12 min |
| 3   | include — Loading Relations Eagerly                     | 12 min |
| 4   | Filtering — where, Operators, and Field Filters         | 12 min |
| 5   | Sorting — orderBy, Multi-field, Relation Sorting        | 10 min |
| 6   | Pagination — take/skip and Cursor-Based                 | 10 min |
| 7   | Nested Reads — Deep select, include, and Combining Both | 12 min |
| 8   | Nested Writes — Creating and Updating Across Relations  | 12 min |
| 9   | Relation Queries — Filtering, some/every/none, \_count  | 12 min |
| 10  | Aggregation — count, sum, avg, min, max, groupBy        | 12 min |

---

---

# 1 — CRUD — create, findUnique, update, delete, upsert

---

## T — TL;DR

Prisma Client exposes one property per model on the `prisma` instance. Each property has five core CRUD methods: `create`, `findUnique` / `findMany` / `findFirst`, `update` / `updateMany`, `delete` / `deleteMany`, and `upsert`. Every method is fully typed — wrong fields and wrong types are TypeScript errors at compile time, never runtime surprises.

---

## K — Key Concepts

```typescript
import { PrismaClient, UserRole } from "@prisma/client";
const prisma = new PrismaClient();

// ── CREATE ─────────────────────────────────────────────────────────────────

// create — single row, returns the created record
const user = await prisma.user.create({
  data: {
    email: "mark@example.com",
    name: "Mark Austin",
    role: UserRole.USER,
    // createdAt, updatedAt, id — all have defaults, omit them
  },
});
// user: User  (full model type with all fields)
// user.id is the generated id ✅

// createMany — bulk insert, returns count (no individual records)
const result = await prisma.user.createMany({
  data: [
    { email: "alice@example.com", name: "Alice" },
    { email: "bob@example.com", name: "Bob" },
  ],
  skipDuplicates: true, // ignore rows that violate unique constraints
});
// result: { count: 2 }

// createManyAndReturn — bulk insert WITH individual records returned (Prisma 5.14+)
const created = await prisma.user.createManyAndReturn({
  data: [
    { email: "carol@example.com", name: "Carol" },
    { email: "dave@example.com", name: "Dave" },
  ],
  select: { id: true, email: true }, // only fetch what you need
});
// created: { id: number; email: string }[]
```

```typescript
// ── READ ───────────────────────────────────────────────────────────────────

// findUnique — by primary key or @unique field, returns T | null
const found = await prisma.user.findUnique({
  where: { id: 1 },
});
// found: User | null

// findUnique by @unique field
const byEmail = await prisma.user.findUnique({
  where: { email: "mark@example.com" },
});

// findUniqueOrThrow — throws PrismaClientKnownRequestError if not found
const required = await prisma.user.findUniqueOrThrow({
  where: { id: 1 },
});
// required: User  (never null)

// findMany — multiple rows matching a filter
const allUsers = await prisma.user.findMany();
// allUsers: User[]

const activeAdmins = await prisma.user.findMany({
  where: {
    isActive: true,
    role: UserRole.ADMIN,
  },
  orderBy: { createdAt: "desc" },
  take: 10,
});

// findFirst — first row matching filter (like findMany with take: 1)
const newest = await prisma.user.findFirst({
  orderBy: { createdAt: "desc" },
});
// newest: User | null

// findFirstOrThrow — throws if no match
const newestRequired = await prisma.user.findFirstOrThrow({
  orderBy: { createdAt: "desc" },
});
```

```typescript
// ── UPDATE ─────────────────────────────────────────────────────────────────

// update — by unique field, returns updated record
const updated = await prisma.user.update({
  where: { id: 1 },
  data: { name: "Mark Updated" },
});
// updated: User

// Atomic numeric updates — no read-modify-write needed
const incremented = await prisma.post.update({
  where: { id: 42 },
  data: { viewCount: { increment: 1 } },
  // Also: decrement, multiply, divide, set
});

// updateMany — by filter, returns count
const deactivated = await prisma.user.updateMany({
  where: { role: UserRole.GUEST },
  data: { isActive: false },
});
// deactivated: { count: number }
```

```typescript
// ── DELETE ─────────────────────────────────────────────────────────────────

// delete — by unique field, returns deleted record
const deleted = await prisma.user.delete({
  where: { id: 99 },
});
// deleted: User  (the record that was deleted)

// deleteMany — by filter, returns count
const purged = await prisma.user.deleteMany({
  where: { isActive: false },
});
// purged: { count: number }
```

```typescript
// ── UPSERT — create or update atomically ───────────────────────────────────
const upserted = await prisma.user.upsert({
  where: { email: "mark@example.com" }, // unique field to check
  create: {
    email: "mark@example.com",
    name: "Mark Austin",
    role: UserRole.USER,
  },
  update: {
    name: "Mark Austin Updated", // only update if already exists
  },
});
// upserted: User  — either the newly created or the updated record

// upsert with no-op update (idempotent — seed scripts)
const idempotent = await prisma.category.upsert({
  where: { slug: "electronics" },
  create: { name: "Electronics", slug: "electronics" },
  update: {}, // if it exists, do nothing
});
```

```typescript
// ── Atomic number operations ───────────────────────────────────────────────
// Available on Int, BigInt, Float, Decimal fields in update/updateMany

await prisma.product.update({
  where: { id: 1 },
  data: {
    stockQty: { decrement: 5 }, // stock -= 5
    totalSales: { increment: 5 }, // totalSales += 5
    price: { multiply: 1.1 }, // price *= 1.1  (10% increase)
    discount: { divide: 2 }, // discount /= 2
    rating: { set: 4.5 }, // rating = 4.5  (explicit set)
  },
});
// All atomic at the DB level — no lost-update race condition ✅
```

---

## W — Why It Matters

- `findUniqueOrThrow` vs `findUnique` is a pattern choice that affects error handling architecture — `findUnique` forces you to handle `null` at every call site, while `findUniqueOrThrow` + a global error handler converts "not found" into a clean 404 response automatically. Use `findUniqueOrThrow` in route handlers, `findUnique` when you legitimately check for existence.
- Atomic number operations (`increment`, `decrement`, `multiply`) are the ORM-level equivalent of `UPDATE SET col = col + 1` — they prevent the lost-update race condition that occurs when you read a value, modify it in application code, and write it back. The increment is computed on the DB side atomically.
- `createMany` returns only the count, not the individual records — this is a PostgreSQL limitation for bulk inserts (no standard bulk RETURNING). If you need the records back, use `createManyAndReturn` (Prisma 5.14+) or use `create` in a loop inside a transaction.

---

## I — Interview Q&A

### Q: What is the difference between `update` and `updateMany` in Prisma, and when would you use each?

**A:** `update` requires a unique identifier in `where` (primary key or `@unique` field) and updates exactly one row — it throws if the row doesn't exist. It returns the full updated record. `updateMany` accepts any filter in `where` (not necessarily unique) and updates all matching rows — it returns only the count of affected rows, not the individual records. Use `update` when you know exactly which record to update (e.g. the logged-in user's profile, an order by its ID). Use `updateMany` for bulk operations where you want to update a set of records matching a condition (e.g. expire all pending orders older than 24 hours, deactivate all guest accounts).

### Q: When should you use `upsert` and what are the two arguments that distinguish it from `update`?

**A:** Use `upsert` when you want to create a record if it doesn't exist, or update it if it does — a single atomic "create or update" operation. It takes three arguments: `where` (unique field to check for existence), `create` (data to use if the record doesn't exist), and `update` (data to apply if the record does exist). The `where` clause must reference a unique field. Common use cases: seeding reference data (idempotent — pass `update: {}` to no-op if exists), syncing data from external APIs (create on first sync, update on subsequent syncs), and user preference records (create with defaults on first access, update on change).

---

## C — Common Pitfalls + Fix

### ❌ Using `findMany` when you expect exactly one result — no guarantee

```typescript
// ❌ findMany returns an array — what if there are 0 or multiple matches?
const results = await prisma.user.findMany({
  where: { email: "mark@example.com" },
});
const user = results[0]; // undefined if not found — silently fails ❌
user.name; // TypeError: Cannot read properties of undefined ❌
```

**Fix:** Use `findUnique` or `findUniqueOrThrow` for unique lookups:

```typescript
// ✅ findUniqueOrThrow — correct for unique field lookups
const user = await prisma.user.findUniqueOrThrow({
  where: { email: "mark@example.com" },
});
user.name; // ✅ guaranteed to exist — throws a typed error if not found
```

---

## K — Coding Challenge + Solution

### Challenge

Write a `UserService` module with five functions demonstrating all CRUD methods: (1) `createUser` — creates with all required fields and returns typed result; (2) `getUserById` — returns the user or throws a 404-ready error; (3) `updateUserProfile` — updates name and bio with atomic increment on `profileViews`; (4) `deactivateInactiveUsers` — bulk updates users who haven't logged in for 30 days; (5) `upsertExternalUser` — upserts a user from an OAuth provider by their `externalId`. Include all TypeScript types.

### Solution

```typescript
// src/services/user.service.ts

import { prisma } from "@/lib/prisma";
import { Prisma, User, UserRole } from "@prisma/client";

// ── (1) createUser ─────────────────────────────────────────────────────────
interface CreateUserInput {
  email: string;
  name: string;
  role?: UserRole;
}

async function createUser(input: CreateUserInput): Promise<User> {
  return prisma.user.create({
    data: {
      email: input.email,
      name: input.name,
      role: input.role ?? UserRole.USER,
    },
  });
}

// ── (2) getUserById ────────────────────────────────────────────────────────
async function getUserById(id: number): Promise<User> {
  // findUniqueOrThrow gives us User (not User | null)
  // Catch the error at the route layer and convert to 404
  return prisma.user.findUniqueOrThrow({
    where: { id },
  });
  // If not found: throws PrismaClientKnownRequestError with code P2025
}

// ── (3) updateUserProfile ──────────────────────────────────────────────────
interface UpdateProfileInput {
  name?: string;
  bio?: string | null;
}

async function updateUserProfile(
  userId: number,
  input: UpdateProfileInput
): Promise<User> {
  return prisma.user.update({
    where: { id: userId },
    data: {
      ...(input.name !== undefined && { name: input.name }),
      ...(input.bio !== undefined && { bio: input.bio }),
      profileViews: { increment: 1 }, // atomic — no race condition
    },
  });
}

// ── (4) deactivateInactiveUsers ────────────────────────────────────────────
async function deactivateInactiveUsers(daysInactive = 30): Promise<number> {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - daysInactive);

  const result = await prisma.user.updateMany({
    where: {
      isActive: true,
      lastLoginAt: { lt: cutoff },
      role: { not: UserRole.ADMIN }, // never deactivate admins
    },
    data: { isActive: false },
  });

  return result.count;
}

// ── (5) upsertExternalUser ─────────────────────────────────────────────────
interface ExternalUserInput {
  externalId: string;
  provider: string;
  email: string;
  name: string;
  avatarUrl?: string;
}

async function upsertExternalUser(input: ExternalUserInput): Promise<User> {
  return prisma.user.upsert({
    where: { externalId: input.externalId },
    create: {
      externalId: input.externalId,
      provider: input.provider,
      email: input.email,
      name: input.name,
      avatarUrl: input.avatarUrl ?? null,
      role: UserRole.USER,
    },
    update: {
      // On subsequent logins: sync name and avatar but preserve role
      name: input.name,
      avatarUrl: input.avatarUrl ?? null,
      lastLoginAt: new Date(),
    },
  });
}

export {
  createUser,
  getUserById,
  updateUserProfile,
  deactivateInactiveUsers,
  upsertExternalUser,
};
```

---

---

# 2 — select — Field Selection and Partial Return Types

---

## T — TL;DR

`select` tells Prisma which fields to return. It's an allowlist — only the specified fields come back. The return type automatically narrows to match exactly the fields you selected — TypeScript enforces that you can only access the fields you asked for. Use `select` to avoid over-fetching, enable Index Only Scans in PostgreSQL, and return clean API shapes without manually mapping objects.

---

## K — Key Concepts

```typescript
// ── Basic select ───────────────────────────────────────────────────────────
const user = await prisma.user.findUnique({
  where: { id: 1 },
  select: {
    id: true,
    email: true,
    name: true,
    // role, bio, createdAt etc. are NOT fetched — not in the response
  },
});
// TypeScript type of user:
// { id: number; email: string; name: string | null } | null
// Attempting user.role → TypeScript error ✅ (role not in select)
```

```typescript
// ── select vs no select ────────────────────────────────────────────────────

// No select: returns full model (all columns fetched from DB)
const fullUser = await prisma.user.findUnique({ where: { id: 1 } });
// fullUser: User | null
// SQL: SELECT id, email, name, role, bio, passwordHash, createdAt, ... FROM users WHERE id = 1

// With select: returns only selected fields (fewer columns fetched)
const partialUser = await prisma.user.findUnique({
  where: { id: 1 },
  select: { id: true, email: true },
});
// partialUser: { id: number; email: string } | null
// SQL: SELECT id, email FROM users WHERE id = 1  ← fewer columns ✅
```

```typescript
// ── select on findMany ─────────────────────────────────────────────────────
const userList = await prisma.user.findMany({
  where: { isActive: true },
  select: {
    id: true,
    email: true,
    name: true,
    role: true,
  },
  orderBy: { createdAt: "desc" },
  take: 20,
});
// userList: { id: number; email: string; name: string | null; role: UserRole }[]
```

```typescript
// ── select: false — explicitly exclude a field ─────────────────────────────
// When you want everything EXCEPT one field (e.g. passwordHash):
// You cannot use select: { passwordHash: false } — select is an allowlist, not a denylist
// Instead: list every field you WANT, excluding the ones you don't

// ✅ Correct approach: list only what you need
const safeUser = await prisma.user.findUnique({
  where: { id: 1 },
  select: {
    id: true,
    email: true,
    name: true,
    role: true,
    isActive: true,
    createdAt: true,
    // passwordHash is intentionally omitted ✅
  },
});

// ── Prisma.validator — reusable select shape ───────────────────────────────
import { Prisma } from "@prisma/client";

// Define a reusable select object
const userPublicSelect = {
  id: true,
  email: true,
  name: true,
  role: true,
  createdAt: true,
} satisfies Prisma.UserSelect;

// Derive the TypeScript type from the select shape
type UserPublic = Prisma.UserGetPayload<{ select: typeof userPublicSelect }>;
// UserPublic: { id: number; email: string; name: string | null; role: UserRole; createdAt: Date }

// Reuse across queries
const user = await prisma.user.findUnique({
  where: { id: 1 },
  select: userPublicSelect,
});
// user: UserPublic | null ✅
```

```typescript
// ── select with computed names — _count ────────────────────────────────────
// Select the count of related records alongside scalar fields
const usersWithPostCount = await prisma.user.findMany({
  select: {
    id: true,
    name: true,
    email: true,
    _count: {
      select: { posts: true }, // count the related posts
    },
  },
});
// usersWithPostCount: { id: number; name: string | null; email: string; _count: { posts: number } }[]

// Access: usersWithPostCount[0]._count.posts  → number of posts
```

```typescript
// ── select: true on relation fields — nested select ────────────────────────
// select can include relation fields — this is covered fully in Subtopic 7
// Quick preview:
const postWithAuthorName = await prisma.post.findUnique({
  where: { id: 1 },
  select: {
    id: true,
    title: true,
    author: {
      // relation field
      select: {
        name: true, // only author's name, not all user fields
        email: true,
      },
    },
  },
});
// postWithAuthorName: { id: number; title: string; author: { name: string | null; email: string } } | null
```

---

## W — Why It Matters

- `select` is not just cosmetic — it reduces the SQL query to only the columns you need. For wide tables with large JSONB or TEXT columns, this can reduce network transfer and query time significantly. For indexed columns, `select` can enable Index Only Scans in PostgreSQL.
- The return type precisely matches the `select` shape — Prisma's type generation ensures that `user.passwordHash` is a TypeScript compile error if `passwordHash` was not included in `select`. This type safety enforces data hygiene: you can't accidentally send a password hash in an API response if the return type doesn't include it.
- `Prisma.UserGetPayload<{ select: typeof mySelect }>` is the correct way to derive a type from a select shape — it gives you a reusable TypeScript type that's always in sync with the select object. If you add a field to the select, the type automatically updates.

---

## I — Interview Q&A

### Q: How does Prisma's `select` affect both the SQL query and the TypeScript return type?

**A:** Prisma's `select` works on two levels simultaneously. At the **SQL level**, it translates to a column allowlist in the `SELECT` clause — instead of `SELECT *`, Prisma generates `SELECT id, email, name FROM users WHERE ...`. This reduces network transfer, and for tables with large JSONB or TEXT columns it can significantly reduce query time. For columns covered by an index, it may enable Index Only Scans. At the **TypeScript level**, `select` narrows the return type to exactly the fields specified — the return type is not `User` but `{ id: number; email: string; name: string | null }`. Trying to access a field that wasn't selected is a compile-time TypeScript error, not a runtime error. This dual effect makes `select` both a performance tool and a type safety mechanism.

---

## C — Common Pitfalls + Fix

### ❌ Mixing `select` and `include` at the top level — they're mutually exclusive

```typescript
// ❌ Cannot use both select and include at the same level
const user = await prisma.user.findUnique({
  where: { id: 1 },
  select: { id: true, email: true },
  include: { posts: true }, // ← TypeScript error: select and include are mutually exclusive
});
```

**Fix:** Use `select` to include relations (it subsumes `include`):

```typescript
// ✅ Use select for everything — scalar fields AND relations
const user = await prisma.user.findUnique({
  where: { id: 1 },
  select: {
    id: true,
    email: true,
    posts: true, // relation included via select ✅
  },
});
```

---

## K — Coding Challenge + Solution

### Challenge

Using a `Product` model with fields `id`, `sku`, `name`, `price`, `costPrice`, `description`, `stockQty`, `isActive`, `metadata` (JSONB), `createdAt`, `updatedAt`, write three `select` variants: (1) a `ProductCard` select for a product listing page (id, name, price, stockQty only); (2) a `ProductDetail` select for a product detail page (everything except costPrice and internal metadata); (3) a `ProductAdmin` select that includes the count of related orders. Use `Prisma.UserGetPayload` pattern to derive all three TypeScript types and show they're distinct.

### Solution

```typescript
import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";

// ── (1) ProductCard — minimal for listing page ────────────────────────────
const productCardSelect = {
  id: true,
  name: true,
  price: true,
  stockQty: true,
  isActive: true,
} satisfies Prisma.ProductSelect;

type ProductCard = Prisma.ProductGetPayload<{
  select: typeof productCardSelect;
}>;
// { id: number; name: string; price: Prisma.Decimal; stockQty: number; isActive: boolean }

async function getProductCards(): Promise<ProductCard[]> {
  return prisma.product.findMany({
    where: { isActive: true },
    select: productCardSelect,
    orderBy: { name: "asc" },
  });
}

// ── (2) ProductDetail — full detail except internal fields ────────────────
const productDetailSelect = {
  id: true,
  sku: true,
  name: true,
  price: true,
  description: true,
  stockQty: true,
  isActive: true,
  createdAt: true,
  updatedAt: true,
  // costPrice and metadata intentionally omitted — internal use only
} satisfies Prisma.ProductSelect;

type ProductDetail = Prisma.ProductGetPayload<{
  select: typeof productDetailSelect;
}>;

async function getProductDetail(id: number): Promise<ProductDetail | null> {
  return prisma.product.findUnique({
    where: { id },
    select: productDetailSelect,
  });
}

// ── (3) ProductAdmin — includes order count ────────────────────────────────
const productAdminSelect = {
  id: true,
  sku: true,
  name: true,
  price: true,
  costPrice: true, // internal — OK for admin
  stockQty: true,
  isActive: true,
  metadata: true, // internal — OK for admin
  createdAt: true,
  _count: {
    select: { orderItems: true }, // count of related order items
  },
} satisfies Prisma.ProductSelect;

type ProductAdmin = Prisma.ProductGetPayload<{
  select: typeof productAdminSelect;
}>;
// Includes: _count: { orderItems: number }

async function getProductsForAdmin(): Promise<ProductAdmin[]> {
  return prisma.product.findMany({
    select: productAdminSelect,
    orderBy: { createdAt: "desc" },
  });
}

// ── Type verification ─────────────────────────────────────────────────────
// These three are completely different types — TypeScript enforces it:
// ProductCard   has no: sku, description, costPrice, metadata, _count
// ProductDetail has no: costPrice, metadata, _count
// ProductAdmin  has all fields including _count

export type { ProductCard, ProductDetail, ProductAdmin };
export { getProductCards, getProductDetail, getProductsForAdmin };
```

---

---

# 3 — include — Loading Relations Eagerly

---

## T — TL;DR

`include` loads related records alongside the parent record in a single query. It's the Prisma equivalent of a SQL `JOIN` — but typed. Every included relation expands the return type to include the related model's fields. `include` is for "give me this record plus its related records." It cannot be combined with `select` at the top level — use nested `select` inside `include` to limit included fields.

---

## K — Key Concepts

```typescript
// ── Basic include — load a relation ────────────────────────────────────────
const post = await prisma.post.findUnique({
  where: { id: 1 },
  include: { author: true }, // include the related User
});
// post: (Post & { author: User }) | null
// post.author.email  ← fully typed ✅
```

```typescript
// ── include on findMany ────────────────────────────────────────────────────
const posts = await prisma.post.findMany({
  where: { isPublished: true },
  include: {
    author: true, // include the author (User)
    category: true, // include the category (Category)
    tags: true, // include all tags (Tag[])
  },
  orderBy: { createdAt: "desc" },
  take: 10,
});
// posts: (Post & { author: User; category: Category | null; tags: Tag[] })[]
```

```typescript
// ── include with filtering on the relation ─────────────────────────────────
// include accepts the same options as findMany on the relation side
const user = await prisma.user.findUnique({
  where: { id: 1 },
  include: {
    posts: {
      where: { isPublished: true }, // only include published posts
      orderBy: { createdAt: "desc" }, // order included posts
      take: 5, // limit included posts
      select: { id: true, title: true }, // partial fields on included relation
    },
  },
});
// user: (User & { posts: { id: number; title: string }[] }) | null
```

```typescript
// ── Nested include — relations of relations ────────────────────────────────
const order = await prisma.order.findUnique({
  where: { id: 1 },
  include: {
    customer: true, // include customer
    items: {
      // include order items
      include: {
        product: {
          // include the product for each item
          select: { name: true, sku: true },
        },
      },
    },
  },
});
// order: Order & {
//   customer: Customer;
//   items: (OrderItem & { product: { name: string; sku: string } })[]
// } | null
```

```typescript
// ── include with select inside — limiting included relation fields ──────────
// Best practice: always limit included relation fields to only what you need
const posts = await prisma.post.findMany({
  include: {
    author: {
      select: { id: true, name: true }, // only name, not password hash etc.
    },
    _count: {
      select: { comments: true, likes: true }, // count related records
    },
  },
});
// posts: (Post & {
//   author: { id: number; name: string | null };
//   _count: { comments: number; likes: number }
// })[]
```

```typescript
// ── Prisma.PostGetPayload — derive type from include ──────────────────────
import { Prisma } from "@prisma/client";

const postWithRelations = {
  include: {
    author: { select: { id: true, name: true } },
    category: true,
    _count: { select: { comments: true } },
  },
} satisfies Prisma.PostDefaultArgs;

type PostWithRelations = Prisma.PostGetPayload<typeof postWithRelations>;
// Reusable type that tracks exactly what's loaded

async function getPostWithRelations(
  id: number
): Promise<PostWithRelations | null> {
  return prisma.post.findUnique({
    where: { id },
    ...postWithRelations, // spread the include config
  });
}
```

```typescript
// ── include vs select for relations ───────────────────────────────────────
// Both can load relations — difference is what ELSE you get:

// include: gets ALL scalar fields of the parent PLUS the relation
const withInclude = await prisma.post.findUnique({
  where: { id: 1 },
  include: { author: true },
});
// withInclude has: ALL post fields + author object

// select with relation: gets ONLY selected fields of parent PLUS the relation
const withSelect = await prisma.post.findUnique({
  where: { id: 1 },
  select: {
    id: true,
    title: true,
    author: { select: { name: true } }, // relation in select
  },
});
// withSelect has: ONLY id, title, author.name — nothing else
// Use this when you don't need all post fields
```

---

## W — Why It Matters

- `include` prevents the N+1 query problem — without it, loading 20 posts and then accessing `post.author` for each would issue 21 queries (1 for posts + 20 for authors). With `include: { author: true }`, Prisma runs a single query (or a small set of optimized queries) to fetch posts and their authors together.
- Filtering, sorting, and paginating included relations (`include: { posts: { where: ..., take: ... } }`) is a powerful feature that avoids separate round trips for "get user's 5 most recent posts." The entire nested shape is fetched in one operation.
- Always use `select` inside `include` for relation fields in API routes — `include: { author: true }` loads ALL user fields including sensitive ones (`passwordHash`, `twoFactorSecret`). `include: { author: { select: { name: true, email: true } } }` loads only what you need and protects sensitive fields by construction.

---

## I — Interview Q&A

### Q: How does Prisma execute an `include` query — does it use a SQL JOIN?

**A:** It depends on the Prisma version and configuration. In older Prisma versions and by default, Prisma uses separate queries for each included relation — one query for the parent records and one additional query per relation type, using an `WHERE id IN (...)` strategy to batch-load the related records. This is safer for large result sets (avoids cartesian product row multiplication). With the `relationJoins` preview feature (Prisma 5.x+) or when it's enabled by default in newer versions, Prisma can use SQL `LEFT JOIN` for included relations, which reduces the number of database round trips. In practice, both strategies are efficient for typical use cases. The key user-facing point is that `include` never issues N+1 queries — it always batches the related records loading regardless of the underlying strategy.

---

## C — Common Pitfalls + Fix

### ❌ Using `include: { author: true }` in API responses — exposes all user fields

```typescript
// ❌ Loads the full User record including sensitive fields
const posts = await prisma.post.findMany({
  include: { author: true },
});
return posts; // author.passwordHash is in the response ❌
```

**Fix:** Always select only the fields needed for the response:

```typescript
// ✅ Only the fields needed — sensitive fields never leave the DB
const posts = await prisma.post.findMany({
  include: {
    author: {
      select: {
        id: true,
        name: true,
        email: true,
        // passwordHash, twoFactorSecret etc. never fetched ✅
      },
    },
  },
});
```

---

## K — Coding Challenge + Solution

### Challenge

Build a `getOrderDetails` function that returns a single order with: the full customer (name, email only), all order items with each item's product (name, sku, price), and the count of the customer's total historical orders. Also build `getUserWithActivity` that returns a user with their 3 most recent published posts (title, createdAt) and the total count of their posts, comments, and followers. Derive TypeScript types for both return shapes using `Prisma.XGetPayload`.

### Solution

```typescript
import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";

// ── getOrderDetails ────────────────────────────────────────────────────────
const orderDetailsArgs = {
  include: {
    customer: {
      select: { id: true, name: true, email: true },
    },
    items: {
      include: {
        product: {
          select: { id: true, name: true, sku: true, price: true },
        },
      },
      orderBy: { id: "asc" as const },
    },
    _count: {
      select: { items: true },
    },
  },
} satisfies Prisma.OrderDefaultArgs;

type OrderDetails = Prisma.OrderGetPayload<typeof orderDetailsArgs>;

async function getOrderDetails(orderId: number): Promise<OrderDetails | null> {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    ...orderDetailsArgs,
  });

  if (!order) return null;

  // Also get customer's total historical orders (separate query for clarity)
  // Or add it to the select via _count on customer:
  return order;
}

// Extended version with customer order count:
async function getOrderDetailsWithCustomerHistory(orderId: number) {
  return prisma.order.findUnique({
    where: { id: orderId },
    include: {
      customer: {
        select: {
          id: true,
          name: true,
          email: true,
          _count: {
            select: { orders: true }, // total orders by this customer
          },
        },
      },
      items: {
        include: {
          product: {
            select: { id: true, name: true, sku: true, price: true },
          },
        },
        orderBy: { id: "asc" },
      },
      _count: {
        select: { items: true },
      },
    },
  });
}

// ── getUserWithActivity ────────────────────────────────────────────────────
const userActivityArgs = {
  include: {
    posts: {
      where: { isPublished: true },
      orderBy: { createdAt: "desc" as const },
      take: 3,
      select: { id: true, title: true, createdAt: true, slug: true },
    },
    _count: {
      select: {
        posts: true,
        comments: true,
        followers: true,
      },
    },
  },
} satisfies Prisma.UserDefaultArgs;

type UserWithActivity = Prisma.UserGetPayload<typeof userActivityArgs>;

async function getUserWithActivity(
  userId: number
): Promise<UserWithActivity | null> {
  return prisma.user.findUnique({
    where: { id: userId },
    ...userActivityArgs,
  });
}

// Usage example:
async function example() {
  const order = await getOrderDetailsWithCustomerHistory(42);
  if (order) {
    console.log(`Order #${order.id}`);
    console.log(
      `Customer: ${order.customer.name} (${order.customer._count.orders} total orders)`
    );
    order.items.forEach((item) => {
      console.log(
        `  ${item.product.name} x${item.quantity} @ ${item.product.price}`
      );
    });
  }

  const user = await getUserWithActivity(1);
  if (user) {
    console.log(
      `${user.name} has ${user._count.posts} posts, ${user._count.followers} followers`
    );
    user.posts.forEach((p) => console.log(`  - ${p.title}`));
  }
}

export type { OrderDetails, UserWithActivity };
export {
  getOrderDetails,
  getOrderDetailsWithCustomerHistory,
  getUserWithActivity,
};
```

---

---

# 4 — Filtering — where, Operators, and Field Filters

---

## T — TL;DR

Prisma's `where` clause supports equality, comparison, string matching, list membership, null checks, and logical combinators (`AND`, `OR`, `NOT`). Every filter is fully typed — Prisma generates filter types specific to each field's type, so a `DateTime` field gets date comparison operators and a `String` field gets string-specific operators. The filter API maps directly to SQL `WHERE` conditions.

---

## K — Key Concepts

```typescript
// ── Equality and comparison operators ─────────────────────────────────────
const users = await prisma.user.findMany({
  where: {
    // Implicit equality (shorthand)
    role: "ADMIN", // WHERE role = 'ADMIN'

    // Explicit operators
    id: { gt: 100 }, // WHERE id > 100
    createdAt: { gte: new Date("2025-01-01") }, // WHERE created_at >= '2025-01-01'
    age: { lt: 30 }, // WHERE age < 30
    score: { lte: 100 }, // WHERE score <= 100
    name: { not: null }, // WHERE name IS NOT NULL
    deletedAt: { equals: null }, // WHERE deleted_at IS NULL
  },
});

// Comparison operators:
// equals    → =    (same as shorthand value)
// not       → !=   (also: { not: { gt: 5 } } → NOT (col > 5))
// gt        → >
// gte       → >=
// lt        → <
// lte       → <=
// in        → IN (...)
// notIn     → NOT IN (...)
```

```typescript
// ── String operators ───────────────────────────────────────────────────────
const posts = await prisma.post.findMany({
  where: {
    title: { contains: "Prisma" }, // WHERE title LIKE '%Prisma%'
    slug: { startsWith: "intro-" }, // WHERE slug LIKE 'intro-%'
    body: { endsWith: "conclusion." }, // WHERE body LIKE '%conclusion.'

    // Case-insensitive (PostgreSQL: uses ILIKE)
    title: { contains: "prisma", mode: "insensitive" }, // WHERE title ILIKE '%prisma%'
    email: { startsWith: "mark", mode: "insensitive" },
  },
});
```

```typescript
// ── List operators — in and notIn ─────────────────────────────────────────
const orders = await prisma.order.findMany({
  where: {
    status: { in: ["pending", "processing"] }, // WHERE status IN ('pending','processing')
    id: { notIn: [1, 2, 3] }, // WHERE id NOT IN (1,2,3)
    role: { in: [UserRole.ADMIN, UserRole.MODERATOR] }, // enum list
  },
});
```

```typescript
// ── Null checks ────────────────────────────────────────────────────────────
const active = await prisma.user.findMany({
  where: {
    deletedAt: null, // WHERE deleted_at IS NULL  (shorthand)
    // OR:
    deletedAt: { equals: null }, // same result
  },
});

const deleted = await prisma.user.findMany({
  where: {
    deletedAt: { not: null }, // WHERE deleted_at IS NOT NULL
  },
});
```

```typescript
// ── Logical combinators — AND, OR, NOT ────────────────────────────────────

// Implicit AND: multiple fields in the same where object
const filtered = await prisma.user.findMany({
  where: {
    isActive: true,
    role: "ADMIN", // AND (isActive = true AND role = 'ADMIN')
  },
});

// Explicit AND (useful when same field appears multiple times)
const rangeQuery = await prisma.user.findMany({
  where: {
    AND: [
      { createdAt: { gte: new Date("2025-01-01") } },
      { createdAt: { lt: new Date("2025-06-01") } },
    ],
  },
});
// WHERE created_at >= '2025-01-01' AND created_at < '2025-06-01'

// OR
const adminOrModerator = await prisma.user.findMany({
  where: {
    OR: [{ role: UserRole.ADMIN }, { role: UserRole.MODERATOR }],
  },
});
// WHERE role = 'ADMIN' OR role = 'MODERATOR'
// (Same result as: { role: { in: [UserRole.ADMIN, UserRole.MODERATOR] } })

// NOT
const notGuest = await prisma.user.findMany({
  where: {
    NOT: { role: UserRole.GUEST },
  },
});
// WHERE role != 'GUEST'

// Combining AND + OR + NOT
const complex = await prisma.post.findMany({
  where: {
    isPublished: true,
    AND: [
      { createdAt: { gte: new Date("2025-01-01") } },
      {
        OR: [
          { title: { contains: "Prisma", mode: "insensitive" } },
          { title: { contains: "TypeScript", mode: "insensitive" } },
        ],
      },
    ],
    NOT: { authorId: null },
  },
});
```

```typescript
// ── Date range filtering ───────────────────────────────────────────────────
const today = new Date();
const thirtyDaysAgo = new Date(today);
thirtyDaysAgo.setDate(today.getDate() - 30);

const recentOrders = await prisma.order.findMany({
  where: {
    createdAt: {
      gte: thirtyDaysAgo,
      lte: today,
    },
  },
});
// WHERE created_at >= '...' AND created_at <= '...'
```

```typescript
// ── JSON field filtering ───────────────────────────────────────────────────
// Filter inside JSONB fields
const products = await prisma.product.findMany({
  where: {
    metadata: {
      path: ["color"], // JSON path
      equals: "red", // value at that path
    },
  },
});
// SQL: WHERE metadata->'color' = '"red"'

// Check if JSON key exists
const withWarranty = await prisma.product.findMany({
  where: {
    metadata: {
      path: ["warranty"],
      not: null,
    },
  },
});
```

```typescript
// ── Array field filtering (PostgreSQL arrays) ─────────────────────────────
const tagged = await prisma.post.findMany({
  where: {
    tags: { has: "postgresql" }, // array contains 'postgresql'
    tags: { hasSome: ["a", "b"] }, // array contains any of ['a','b']
    tags: { hasEvery: ["a", "b"] }, // array contains ALL of ['a','b']
    tags: { isEmpty: false }, // array is not empty
  },
});
```

---

## W — Why It Matters

- `mode: 'insensitive'` for string filters is critical for user-facing search — without it, `contains: 'prisma'` won't match `'Prisma'`. Prisma translates `insensitive` to `ILIKE` in PostgreSQL. If you're adding a search feature, always add `mode: 'insensitive'` unless case matters.
- Combining `AND` with the same field twice (range queries) requires the explicit `AND: [{ field: { gte: ... } }, { field: { lt: ... } }]` syntax — you can't write `{ createdAt: { gte: start }, createdAt: { lt: end } }` in a JavaScript object because the second `createdAt` key would overwrite the first. This is a common gotcha for date range queries.
- `NOT: { role: 'GUEST' }` and `role: { not: 'GUEST' }` are functionally equivalent for simple cases, but `NOT: [...]` at the top level can negate complex multi-field conditions — useful for "all records that do NOT match this complex filter."

---

## I — Interview Q&A

### Q: How do you write a Prisma query that filters by a date range on the same field?

**A:** You cannot use the implicit object syntax for the same field twice — `{ createdAt: { gte: start }, createdAt: { lt: end } }` won't work because the second key overwrites the first in a JavaScript object. The correct approach is to use the explicit `AND` array operator: `{ AND: [{ createdAt: { gte: start } }, { createdAt: { lt: end } }] }`. Alternatively, since Prisma 4.3+, you can also nest both operators on the same field directly: `{ createdAt: { gte: start, lt: end } }` — Prisma understands multiple operators on the same field and generates `WHERE created_at >= $1 AND created_at < $2` correctly. The nested form is the cleanest for simple ranges.

---

## C — Common Pitfalls + Fix

### ❌ String search without `mode: 'insensitive'` — misses case variations

```typescript
// ❌ Case-sensitive by default — 'prisma' won't find 'Prisma' or 'PRISMA'
const posts = await prisma.post.findMany({
  where: {
    title: { contains: "prisma" },
    // SQL: WHERE title LIKE '%prisma%'  ← misses 'Prisma', 'PRISMA' ❌
  },
});
```

**Fix:** Add `mode: 'insensitive'` for user-facing searches:

```typescript
// ✅
const posts = await prisma.post.findMany({
  where: {
    title: { contains: "prisma", mode: "insensitive" },
    // SQL: WHERE title ILIKE '%prisma%'  ← matches 'prisma', 'Prisma', 'PRISMA' ✅
  },
});
```

---

## K — Coding Challenge + Solution

### Challenge

Write a `searchOrders` function with a flexible filter interface: `customerId?`, `status?` (one or more), `minTotal?` / `maxTotal?`, `createdAfter?` / `createdBefore?`, `searchCustomerName?` (case-insensitive partial match on customer name). The function should dynamically build the `where` clause (skip undefined filters) and return typed results. Show how to handle the case where `status` can be a single value or an array.

### Solution

```typescript
import { prisma } from "@/lib/prisma";
import { Prisma, Order } from "@prisma/client";

interface SearchOrdersInput {
  customerId?: number;
  status?: string | string[];
  minTotal?: number;
  maxTotal?: number;
  createdAfter?: Date;
  createdBefore?: Date;
  searchCustomerName?: string;
}

type OrderWithCustomer = Prisma.OrderGetPayload<{
  include: { customer: { select: { id: true; name: true; email: true } } };
}>;

async function searchOrders(
  filters: SearchOrdersInput,
  page = 1,
  pageSize = 20
): Promise<{ data: OrderWithCustomer[]; total: number }> {
  // Build the where clause dynamically
  const where: Prisma.OrderWhereInput = {};

  // Exact customer match
  if (filters.customerId !== undefined) {
    where.customerId = filters.customerId;
  }

  // Status: single value or array
  if (filters.status !== undefined) {
    where.status = Array.isArray(filters.status)
      ? { in: filters.status }
      : filters.status;
  }

  // Total range — nested AND for same field
  if (filters.minTotal !== undefined || filters.maxTotal !== undefined) {
    where.total = {
      ...(filters.minTotal !== undefined && { gte: filters.minTotal }),
      ...(filters.maxTotal !== undefined && { lte: filters.maxTotal }),
    };
  }

  // Date range — nested operators on same field
  if (
    filters.createdAfter !== undefined ||
    filters.createdBefore !== undefined
  ) {
    where.createdAt = {
      ...(filters.createdAfter !== undefined && { gte: filters.createdAfter }),
      ...(filters.createdBefore !== undefined && {
        lte: filters.createdBefore,
      }),
    };
  }

  // Customer name search — filter via relation
  if (filters.searchCustomerName !== undefined) {
    where.customer = {
      name: {
        contains: filters.searchCustomerName,
        mode: "insensitive",
      },
    };
  }

  // Run count + data queries in parallel
  const [total, data] = await Promise.all([
    prisma.order.count({ where }),
    prisma.order.findMany({
      where,
      include: {
        customer: {
          select: { id: true, name: true, email: true },
        },
      },
      orderBy: { createdAt: "desc" },
      take: pageSize,
      skip: (page - 1) * pageSize,
    }),
  ]);

  return { data, total };
}

// Usage:
const results = await searchOrders({
  status: ["pending", "processing"],
  minTotal: 100,
  maxTotal: 500,
  createdAfter: new Date("2025-01-01"),
  searchCustomerName: "mark",
});
```

---

---

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

# 7 — Nested Reads — Deep select, include, and Combining Both

---

## T — TL;DR

Nested reads load data across multiple levels of relations in a single query. You can nest `select` inside `include`, `include` inside `include`, and `select` inside `select`. Each nesting level can have its own `where`, `orderBy`, `take`, and `skip`. The return type is automatically inferred at every level — you get full TypeScript safety for deeply nested shapes.

---

## K — Key Concepts

```typescript
// ── Nesting include inside include ────────────────────────────────────────
const order = await prisma.order.findUnique({
  where: { id: 1 },
  include: {
    customer: true, // level 1: include customer
    items: {
      // level 1: include items
      include: {
        product: {
          // level 2: include product for each item
          include: {
            category: true, // level 3: include category for each product
          },
        },
      },
    },
  },
});
// Deep nesting works but each level can cause additional queries
// Limit depth to what you actually need in the UI
```

```typescript
// ── Nesting select inside include — prune relation fields ──────────────────
const post = await prisma.post.findUnique({
  where: { id: 1 },
  include: {
    author: {
      select: {
        // limit which author fields come back
        id: true,
        name: true,
        // email, role, bio etc. are excluded
      },
    },
    tags: {
      select: {
        id: true,
        name: true, // only tag id and name
      },
    },
  },
});
// post: (Post & { author: { id: number; name: string | null }; tags: { id: number; name: string }[] }) | null
```

```typescript
// ── Nesting select inside select ───────────────────────────────────────────
const post = await prisma.post.findUnique({
  where: { id: 1 },
  select: {
    id: true,
    title: true,
    author: {
      // relation in select → nested select
      select: {
        id: true,
        name: true,
        posts: {
          // relation of the relation
          select: {
            id: true,
            title: true,
          },
          take: 3, // only 3 other posts by this author
          where: { id: { not: 1 } }, // exclude current post
        },
      },
    },
  },
});
// post: { id; title; author: { id; name; posts: { id; title }[] } } | null
```

```typescript
// ── Filtering nested relations ─────────────────────────────────────────────
const user = await prisma.user.findUnique({
  where: { id: 1 },
  include: {
    posts: {
      where: { isPublished: true }, // only published posts
      orderBy: { createdAt: "desc" }, // newest first
      take: 5, // at most 5
      include: {
        comments: {
          where: { isApproved: true }, // only approved comments per post
          orderBy: { createdAt: "asc" },
          take: 3, // top 3 comments per post
          select: { id: true, body: true, authorId: true },
        },
      },
    },
  },
});
// user: (User & {
//   posts: (Post & {
//     comments: { id: number; body: string; authorId: number }[]
//   })[]
// }) | null
```

```typescript
// ── _count inside nested select ───────────────────────────────────────────
const categories = await prisma.category.findMany({
  select: {
    id: true,
    name: true,
    _count: {
      select: {
        posts: true, // count of posts in this category
        products: true, // count of products in this category
      },
    },
  },
  orderBy: {
    posts: { _count: "desc" }, // categories with most posts first
  },
});
// categories: { id: number; name: string; _count: { posts: number; products: number } }[]
```

```typescript
// ── Deep nesting type derivation ───────────────────────────────────────────
import { Prisma } from "@prisma/client";

// Define the full nested shape once
const orderWithFullDetails = {
  include: {
    customer: {
      select: { id: true, name: true, email: true },
    },
    items: {
      include: {
        product: {
          select: { id: true, name: true, sku: true, price: true },
        },
      },
      orderBy: { id: "asc" as const },
    },
    _count: { select: { items: true } },
  },
} satisfies Prisma.OrderDefaultArgs;

// Derive the type
type OrderWithFullDetails = Prisma.OrderGetPayload<typeof orderWithFullDetails>;

// Use in functions
async function getOrderWithDetails(
  id: number
): Promise<OrderWithFullDetails | null> {
  return prisma.order.findUnique({
    where: { id },
    ...orderWithFullDetails,
  });
}
```

---

## W — Why It Matters

- Nested reads replace multiple sequential queries with a single structured operation — without nested reads, loading "order with its items with their products" requires 3+ queries. With nested include, it's one Prisma call, with Prisma managing the join/batch strategy internally.
- Filtering, sorting, and paginating at each nesting level (`include: { posts: { where: ..., take: 5 } }`) is the key feature that prevents N+1 patterns — you're telling Prisma "for each user, give me their 5 most recent published posts" in one operation, not looping and querying.
- `Prisma.OrderGetPayload<typeof myArgs>` for deep nested types is essential in large codebases — it's the only way to keep the TypeScript type and the Prisma query in sync automatically. If you add a field to the nested include, the type updates automatically.

---

## I — Interview Q&A

### Q: What is the difference between nesting `select` inside `include` vs nesting `include` inside `include`?

**A:** When you nest `select` inside `include`, you're including the relation but restricting which fields of that relation are returned — `include: { author: { select: { name: true } } }` loads the related user but only returns their `name` field. This is important for security (avoid loading sensitive fields) and performance (fewer bytes transferred). When you nest `include` inside `include`, you're loading the relation AND also loading a second-level relation from within the first — `include: { items: { include: { product: true } } }` loads order items and for each item also loads the full product record. The two can be combined: `include: { items: { include: { product: { select: { name: true, price: true } } } } }` loads items, their products, but only product's name and price.

---

## C — Common Pitfalls + Fix

### ❌ Deep nesting without limits — fetching entire related collections

```typescript
// ❌ No take/where on nested relations — loads ALL comments for ALL posts for the user
const user = await prisma.user.findUnique({
  where: { id: 1 },
  include: {
    posts: {
      // user might have 500 posts
      include: {
        comments: true, // each post might have 1000 comments — 500,000 records ❌
      },
    },
  },
});
```

**Fix:** Always add `take` and `where` constraints on nested collections:

```typescript
// ✅ Bounded nested queries — realistic amounts
const user = await prisma.user.findUnique({
  where: { id: 1 },
  include: {
    posts: {
      where: { isPublished: true },
      orderBy: { createdAt: "desc" },
      take: 10, // at most 10 posts
      include: {
        comments: {
          where: { isApproved: true },
          orderBy: { createdAt: "desc" },
          take: 5, // at most 5 comments per post ✅
          select: { id: true, body: true },
        },
        _count: { select: { comments: true } }, // total comment count
      },
    },
  },
});
```

---

## K — Coding Challenge + Solution

### Challenge

Build a `getProjectDashboard` function for a project management app. It should return a `Project` with: the `workspace` name only, up to 5 `tasks` that are not completed (with their assignee's name only), the count of all tasks by status (`todo`, `inProgress`, `done`), and the 3 most recent `comments` across all tasks (with commenter name). Derive the full TypeScript return type using `Prisma.ProjectGetPayload`.

### Solution

```typescript
import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";

const projectDashboardArgs = {
  include: {
    workspace: {
      select: { id: true, name: true, slug: true },
    },
    tasks: {
      where: { completedAt: null }, // only incomplete tasks
      orderBy: [
        { dueDate: { sort: "asc", nulls: "last" } as any },
        { createdAt: "asc" as const },
      ],
      take: 5,
      select: {
        id: true,
        title: true,
        status: true,
        priority: true,
        dueDate: true,
        assignee: {
          select: { id: true, name: true },
        },
      },
    },
    _count: {
      select: {
        tasks: true, // total task count
        members: true, // total member count
      },
    },
  },
} satisfies Prisma.ProjectDefaultArgs;

type ProjectDashboard = Prisma.ProjectGetPayload<typeof projectDashboardArgs>;

async function getProjectDashboard(projectId: number) {
  // Get main project data with nested includes
  const project = await prisma.project.findUnique({
    where: { id: projectId },
    ...projectDashboardArgs,
  });

  if (!project) return null;

  // Get task counts by status (separate aggregation query)
  const taskCountsByStatus = await prisma.task.groupBy({
    by: ["status"],
    where: { projectId },
    _count: { _all: true },
  });

  // Get 3 most recent comments across all project tasks
  const recentComments = await prisma.comment.findMany({
    where: {
      task: { projectId }, // filter by relation
    },
    orderBy: { createdAt: "desc" },
    take: 3,
    select: {
      id: true,
      body: true,
      createdAt: true,
      author: {
        select: { id: true, name: true },
      },
      task: {
        select: { id: true, title: true },
      },
    },
  });

  return {
    ...project,
    taskCountsByStatus: taskCountsByStatus.reduce(
      (acc, g) => ({ ...acc, [g.status]: g._count._all }),
      {} as Record<string, number>
    ),
    recentComments,
  };
}

type ProjectDashboardResult = NonNullable<
  Awaited<ReturnType<typeof getProjectDashboard>>
>;

export type { ProjectDashboard, ProjectDashboardResult };
export { getProjectDashboard };
```

---

---

# 8 — Nested Writes — Creating and Updating Across Relations

---

## T — TL;DR

Nested writes create, connect, update, or delete related records in a single atomic operation. The five nested write operators are: `create` (new related record), `connect` (link existing record), `connectOrCreate` (link or create), `update` / `updateMany` (modify related), and `disconnect` / `delete` / `deleteMany` (remove relations). All nested writes are wrapped in a transaction automatically.

---

## K — Key Concepts

```typescript
// ── create nested — create parent + child(ren) atomically ─────────────────
const post = await prisma.post.create({
  data: {
    title: "Intro to Prisma",
    slug: "intro-to-prisma",
    author: {
      create: {
        email: "mark@example.com",
        name: "Mark Austin",
      },
    },
    // creates User + Post in one transaction ✅
  },
});

// Create parent with multiple children
const user = await prisma.user.create({
  data: {
    email: "mark@example.com",
    name: "Mark",
    posts: {
      create: [
        { title: "Post 1", slug: "post-1" },
        { title: "Post 2", slug: "post-2" },
      ],
    },
  },
  include: { posts: true },
});
```

```typescript
// ── connect — link an existing record ─────────────────────────────────────
// Create a post and link it to an EXISTING author (user id=1 already exists)
const post = await prisma.post.create({
  data: {
    title: "New Post",
    slug: "new-post",
    author: {
      connect: { id: 1 }, // link to existing user id=1
    },
  },
});

// connect by any unique field
const post2 = await prisma.post.create({
  data: {
    title: "Another Post",
    slug: "another-post",
    author: {
      connect: { email: "mark@example.com" }, // connect by @unique field
    },
  },
});
```

```typescript
// ── connectOrCreate — create if not exists, connect if exists ──────────────
const post = await prisma.post.create({
  data: {
    title: "Post about TypeScript",
    slug: "post-typescript",
    tags: {
      connectOrCreate: [
        {
          where: { name: "TypeScript" }, // check if tag exists
          create: { name: "TypeScript", slug: "typescript" }, // create if not
        },
        {
          where: { name: "Prisma" },
          create: { name: "Prisma", slug: "prisma" },
        },
      ],
    },
  },
  include: { tags: true },
});
// Each tag is either found and connected, or created and connected ✅
// Idempotent — safe to call multiple times with same tags
```

```typescript
// ── Nested update — update related records during parent update ────────────
const updatedOrder = await prisma.order.update({
  where: { id: 1 },
  data: {
    status: "confirmed",
    items: {
      // Update specific item (requires unique identifier for the nested item)
      update: {
        where: { id: 5 }, // which item to update
        data: { quantity: 3 }, // what to change
      },
      // Update MANY items matching a condition
      updateMany: {
        where: { discount: 0 },
        data: { discount: 0.1 },
      },
    },
  },
  include: { items: true },
});
```

```typescript
// ── Nested delete and disconnect ───────────────────────────────────────────
// delete: remove related record (and from DB)
// disconnect: remove the relationship but keep the related record

const post = await prisma.post.update({
  where: { id: 1 },
  data: {
    tags: {
      disconnect: [
        { id: 3 }, // remove tag 3 from this post (tag still exists)
        { id: 7 }, // remove tag 7 from this post
      ],
    },
  },
});

// delete nested record
const user = await prisma.user.update({
  where: { id: 1 },
  data: {
    profile: {
      delete: true, // delete the user's profile record entirely
    },
  },
});

// deleteMany nested
const order = await prisma.order.update({
  where: { id: 1 },
  data: {
    items: {
      deleteMany: {
        where: { productId: 99 }, // delete all items for product 99
      },
    },
  },
});
```

```typescript
// ── set — replace entire relation collection ───────────────────────────────
// WARNING: destructive — replaces ALL existing relations

const post = await prisma.post.update({
  where: { id: 1 },
  data: {
    tags: {
      set: [{ id: 1 }, { id: 4 }, { id: 7 }],
      // ↑ REMOVES all existing tags, ADDS tags 1, 4, 7
      // Any tags that were previously on this post but not in this list are disconnected
    },
  },
});
// Use set when you want to completely replace the tag list (e.g. from a form submission)
// Use connect/disconnect when you want incremental updates
```

```typescript
// ── Nested write with createMany inside transaction ────────────────────────
// Create order + ALL items in one atomic operation
const order = await prisma.order.create({
  data: {
    customerId: 1,
    status: "pending",
    total: 309.97,
    items: {
      createMany: {
        data: [
          { productId: 1, quantity: 2, unitPrice: 129.99 },
          { productId: 2, quantity: 1, unitPrice: 49.99 },
        ],
      },
    },
  },
  include: {
    items: { include: { product: { select: { name: true } } } },
  },
});
// Creates order + both items atomically — all or nothing ✅
```

---

## W — Why It Matters

- Nested writes are atomic — Prisma wraps the entire nested operation in a single database transaction. If the parent creation succeeds but a nested child fails, the entire operation rolls back. This is equivalent to manually wrapping multiple Prisma calls in `prisma.$transaction()`, but without the boilerplate.
- `connectOrCreate` is the tag management pattern — it handles the case where tags may or may not exist without requiring a pre-check query. "Upsert the tag and link it to the post" is one idiomatic call, not a read-check-then-write sequence.
- `set` (replace all) vs `connect`/`disconnect` (incremental) is a critical distinction for many-to-many updates — `set` is idiomatic for form submissions where the user submits the complete new list of related items. `connect`/`disconnect` is correct for "add one" or "remove one" button actions.

---

## I — Interview Q&A

### Q: What is the difference between `connect`, `create`, and `connectOrCreate` in Prisma nested writes?

**A:** All three link related records, but they differ in what they do to the related record. `create` instantiates a new related record in the database and links it to the parent — the related record must not exist yet. `connect` links an existing record (identified by a unique field) to the parent — the record must already exist; if it doesn't, Prisma throws. `connectOrCreate` combines both: it checks if a record matching the `where` clause exists; if it does, it connects it; if it doesn't, it creates a new record using the `create` data and connects it. `connectOrCreate` is idempotent and the safest choice when the related record may or may not exist (e.g. tags that users type freely, categories that might be new, OAuth accounts that need to be found or created).

---

## C — Common Pitfalls + Fix

### ❌ Using `set` when you mean incremental `connect` — unintentionally removes relations

```typescript
// ❌ Adding one tag to a post using set — removes ALL other tags first!
const post = await prisma.post.update({
  where: { id: 1 },
  data: {
    tags: {
      set: [{ id: newTagId }], // REPLACES all tags with ONLY this tag ❌
      // Any existing tags are disconnected
    },
  },
});
```

**Fix:** Use `connect` to add without removing existing relations:

```typescript
// ✅ Adds the new tag while keeping existing tags
const post = await prisma.post.update({
  where: { id: 1 },
  data: {
    tags: {
      connect: { id: newTagId }, // adds tag, leaves existing tags intact ✅
    },
  },
});

// ✅ For multiple tags to add:
const post2 = await prisma.post.update({
  where: { id: 1 },
  data: {
    tags: {
      connect: [{ id: tagId1 }, { id: tagId2 }],
    },
  },
});
```

---

## K — Coding Challenge + Solution

### Challenge

Build an `OrderService` with three nested write operations: (1) `placeOrder` — creates an order with its items and applies a discount code (connect to existing DiscountCode); (2) `updateOrderItems` — adds new items and removes cancelled items in a single update; (3) `assignTagsToPost` — replaces a post's tags from a list of tag names, creating any tags that don't exist (using `connectOrCreate`). All must be atomic.

### Solution

```typescript
import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";

// ── (1) placeOrder — create with items + connect discount code ─────────────
interface PlaceOrderInput {
  customerId: number;
  discountCode?: string; // optional discount code (must already exist)
  items: Array<{
    productId: number;
    quantity: number;
    unitPrice: number;
  }>;
}

async function placeOrder(input: PlaceOrderInput) {
  const subtotal = input.items.reduce(
    (sum, i) => sum + i.quantity * i.unitPrice,
    0
  );

  return prisma.order.create({
    data: {
      customerId: input.customerId,
      status: "pending",
      total: subtotal,

      // Nested create for all items
      items: {
        createMany: {
          data: input.items.map((i) => ({
            productId: i.productId,
            quantity: i.quantity,
            unitPrice: new Prisma.Decimal(i.unitPrice),
          })),
        },
      },

      // Connect existing discount code if provided
      ...(input.discountCode && {
        discountCode: {
          connect: { code: input.discountCode },
        },
      }),
    },
    include: {
      items: { include: { product: { select: { name: true, sku: true } } } },
      discountCode: { select: { code: true, discountPct: true } },
    },
  });
}

// ── (2) updateOrderItems — add new + remove cancelled items ───────────────
interface UpdateOrderItemsInput {
  orderId: number;
  addItems: Array<{ productId: number; quantity: number; unitPrice: number }>;
  removeItemIds: number[];
}

async function updateOrderItems(input: UpdateOrderItemsInput) {
  return prisma.order.update({
    where: { id: input.orderId },
    data: {
      items: {
        // Add new items
        createMany: {
          data: input.addItems.map((i) => ({
            productId: i.productId,
            quantity: i.quantity,
            unitPrice: new Prisma.Decimal(i.unitPrice),
          })),
          skipDuplicates: false,
        },
        // Remove cancelled items
        deleteMany: {
          id: { in: input.removeItemIds },
        },
      },
      // Recalculate total from current items after update
      // (would require a separate query or raw SQL — show as comment)
      // total: recalculated value
    },
    include: {
      items: { include: { product: { select: { name: true } } } },
    },
  });
}

// ── (3) assignTagsToPost — replace tags using connectOrCreate ─────────────
// This replaces ALL tags on the post with the provided tag names
async function assignTagsToPost(
  postId: number,
  tagNames: string[] // e.g. ['TypeScript', 'Prisma', 'PostgreSQL']
) {
  return prisma.post.update({
    where: { id: postId },
    data: {
      tags: {
        // set: replaces all existing tag connections
        set: [], // first clear all existing tags

        // then connectOrCreate each tag by name
        connectOrCreate: tagNames.map((name) => ({
          where: { name }, // find by name
          create: {
            name,
            slug: name.toLowerCase().replace(/\s+/g, "-"), // auto-generate slug
          },
        })),
      },
    },
    include: {
      tags: {
        select: { id: true, name: true, slug: true },
      },
    },
  });
}

export { placeOrder, updateOrderItems, assignTagsToPost };
```

---

---

# 9 — Relation Queries — Filtering, some/every/none, \_count

---

## T — TL;DR

Prisma can filter parent records based on the state of their related records using relation filters: `some` (at least one related record matches), `every` (all related records match), `none` (no related records match), and `is` / `isNot` (for one-to-one relations). These translate to SQL `EXISTS` / `NOT EXISTS` subqueries. `_count` lets you count related records in both `select` and `orderBy`.

---

## K — Key Concepts

```typescript
// ── some — parent has AT LEAST ONE related record matching ─────────────────
// Find users who have at least one published post
const usersWithPublishedPosts = await prisma.user.findMany({
  where: {
    posts: {
      some: { isPublished: true },
    },
  },
});
// SQL: WHERE EXISTS (SELECT 1 FROM posts WHERE posts.author_id = users.id AND is_published = true)

// Find customers who have at least one pending order over $100
const highValuePending = await prisma.customer.findMany({
  where: {
    orders: {
      some: {
        status: "pending",
        total: { gt: 100 },
      },
    },
  },
});
```

```typescript
// ── every — parent's ALL related records match ─────────────────────────────
// Find orders where EVERY item has been shipped
const fullyShipped = await prisma.order.findMany({
  where: {
    items: {
      every: { status: "shipped" },
    },
  },
});
// SQL: WHERE NOT EXISTS (SELECT 1 FROM items WHERE items.order_id = orders.id AND status != 'shipped')
// Note: every is implemented as NOT EXISTS (... WHERE NOT condition)
// Edge case: orders with NO items return true for every (vacuous truth)
```

```typescript
// ── none — parent has NO related records matching ──────────────────────────
// Find users with no posts at all
const usersWithNoPosts = await prisma.user.findMany({
  where: {
    posts: { none: {} }, // empty filter = no posts whatsoever
  },
});
// SQL: WHERE NOT EXISTS (SELECT 1 FROM posts WHERE posts.author_id = users.id)

// Find products that have never been ordered
const neverOrdered = await prisma.product.findMany({
  where: {
    orderItems: {
      none: {},
    },
  },
});

// Find customers with no cancelled orders
const loyalCustomers = await prisma.customer.findMany({
  where: {
    orders: {
      none: { status: "cancelled" },
    },
  },
});
```

```typescript
// ── is / isNot — filter by one-to-one relation fields ─────────────────────
// Find posts whose author is active
const activePosts = await prisma.post.findMany({
  where: {
    author: {
      is: { isActive: true }, // filter on the related singular record
    },
  },
});
// SQL: WHERE EXISTS (SELECT 1 FROM users WHERE users.id = posts.author_id AND is_active = true)

// Find posts with no category
const uncategorised = await prisma.post.findMany({
  where: {
    category: { is: null }, // category relation is null (optional relation)
  },
});

// isNot
const posts = await prisma.post.findMany({
  where: {
    author: {
      isNot: { role: "GUEST" }, // author is not a guest
    },
  },
});
```

```typescript
// ── Combining relation filters ─────────────────────────────────────────────
// Find active users who have at least one published post
// but NO spam-flagged comments
const qualityUsers = await prisma.user.findMany({
  where: {
    isActive: true,
    posts: {
      some: { isPublished: true },
    },
    comments: {
      none: { isFlagged: true },
    },
  },
});
```

```typescript
// ── _count — count related records ────────────────────────────────────────

// In select: count related records on each returned row
const users = await prisma.user.findMany({
  select: {
    id: true,
    name: true,
    email: true,
    _count: {
      select: {
        posts: true, // count posts
        comments: true, // count comments
        followers: true, // count followers
      },
    },
  },
});
// users[0]._count.posts     → number
// users[0]._count.comments  → number

// _count with filter — count only a subset of related records
const usersWithPublishedCount = await prisma.user.findMany({
  select: {
    id: true,
    name: true,
    _count: {
      select: {
        posts: {
          where: { isPublished: true }, // count ONLY published posts
        },
      },
    },
  },
});
// _count.posts → count of published posts only (not total posts)
```

```typescript
// ── Filtering by count — find users with more than N posts ─────────────────
// Prisma doesn't have a direct "count > N" filter in where
// Use some/none as a workaround, or raw SQL for complex count conditions

// "Users with at least one post" — use some
const usersWithPosts = await prisma.user.findMany({
  where: { posts: { some: {} } },
});

// "Users with at least 5 posts" — no direct Prisma API, use $queryRaw
import { Prisma } from "@prisma/client";
const prolificUsers = await prisma.$queryRaw<
  { id: number; post_count: number }[]
>`
  SELECT u.id, COUNT(p.id)::INT AS post_count
  FROM users u
  LEFT JOIN posts p ON p.author_id = u.id
  GROUP BY u.id
  HAVING COUNT(p.id) >= ${5}
  ORDER BY post_count DESC
`;
```

---

## W — Why It Matters

- `some`, `every`, and `none` translate to SQL `EXISTS` / `NOT EXISTS` subqueries — these are often more efficient than JOINs + `HAVING COUNT(*)` for filtering, because `EXISTS` can short-circuit after finding the first matching row. They're also more readable than equivalent raw SQL.
- The vacuous truth edge case for `every` is important — `orders.items.every({ status: 'shipped' })` returns `true` for orders with NO items. If "fully shipped" means "has items AND all are shipped," you need to combine with `some: {}`: `AND: [{ items: { some: {} } }, { items: { every: { status: 'shipped' } } }]`.
- `_count` with `where` (filtered count) is a powerful reporting feature — you can show "5 published posts out of 12 total" by selecting both `_count: { select: { posts: { where: { isPublished: true } } } }` and `_count: { select: { posts: true } }` in the same query.

---

## I — Interview Q&A

### Q: What is the difference between `some`, `every`, and `none` in Prisma relation filters, and how do they translate to SQL?

**A:** These three operators filter parent records based on the state of their children. `some` returns parents where at least one child matches the condition — SQL: `WHERE EXISTS (SELECT 1 FROM children WHERE children.parent_id = parents.id AND <condition>)`. `every` returns parents where all children match the condition — SQL: `WHERE NOT EXISTS (SELECT 1 FROM children WHERE children.parent_id = parents.id AND NOT <condition>)`. `none` returns parents where no children match — SQL: `WHERE NOT EXISTS (SELECT 1 FROM children WHERE children.parent_id = parents.id AND <condition>)`. Important edge case: `every` with an empty condition `{}` returns parents with NO children (vacuous truth — there are no counterexamples). If you want "has children AND all match," combine `every` with `some: {}` in an `AND` clause.

---

## C — Common Pitfalls + Fix

### ❌ `every` returning true for records with no children — vacuous truth

```typescript
// ❌ "Orders where every item is shipped" also returns orders with NO items
const fullyShipped = await prisma.order.findMany({
  where: {
    items: { every: { status: "shipped" } },
  },
});
// An empty order (no items) satisfies "every item is shipped" vacuously ❌
```

**Fix:** Combine `every` with `some: {}` to require at least one related record:

```typescript
// ✅ "Has at least one item AND every item is shipped"
const fullyShipped = await prisma.order.findMany({
  where: {
    AND: [
      { items: { some: {} } }, // must have at least one item
      { items: { every: { status: "shipped" } } }, // all items shipped
    ],
  },
});
```

---

## K — Coding Challenge + Solution

### Challenge

Write five relation-filter queries for a content platform: (1) find authors who have published posts but no flagged comments; (2) find posts with at least one approved comment (include approval count); (3) find products never purchased; (4) find active users with no orders placed in the last 90 days (potential churn risk); (5) find categories where every post is published. For each, show the Prisma query and explain what SQL equivalent would look like.

### Solution

```typescript
import { prisma } from "@/lib/prisma";

// ── (1) Authors with published posts but no flagged comments ───────────────
async function getQualityAuthors() {
  return prisma.user.findMany({
    where: {
      isActive: true,
      posts: { some: { isPublished: true } }, // EXISTS published post
      comments: { none: { isFlagged: true } }, // NOT EXISTS flagged comment
    },
    select: {
      id: true,
      name: true,
      email: true,
      _count: { select: { posts: { where: { isPublished: true } } } },
    },
    orderBy: { posts: { _count: "desc" } },
  });
  // SQL: WHERE EXISTS (published post) AND NOT EXISTS (flagged comment)
}

// ── (2) Posts with at least one approved comment (with count) ──────────────
async function getPostsWithApprovedComments() {
  return prisma.post.findMany({
    where: {
      isPublished: true,
      comments: {
        some: { isApproved: true }, // EXISTS approved comment
      },
    },
    select: {
      id: true,
      title: true,
      slug: true,
      _count: {
        select: {
          comments: { where: { isApproved: true } }, // filtered count
        },
      },
    },
    orderBy: { comments: { _count: "desc" } },
  });
  // SQL: WHERE EXISTS (SELECT 1 FROM comments WHERE post_id = posts.id AND is_approved = true)
}

// ── (3) Products never purchased ──────────────────────────────────────────
async function getUnpurchasedProducts() {
  return prisma.product.findMany({
    where: {
      isActive: true,
      orderItems: { none: {} }, // NOT EXISTS any order item referencing this product
    },
    select: {
      id: true,
      sku: true,
      name: true,
      price: true,
      createdAt: true,
    },
    orderBy: { createdAt: "asc" },
  });
  // SQL: WHERE NOT EXISTS (SELECT 1 FROM order_items WHERE product_id = products.id)
}

// ── (4) Active users with no recent orders (churn risk) ───────────────────
async function getChurnRiskUsers(daysInactive = 90) {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - daysInactive);

  return prisma.user.findMany({
    where: {
      isActive: true,
      role: "USER",
      // Has placed at least one order ever (real user, not new)
      orders: { some: {} },
      // But NO orders in the last N days
      AND: [
        {
          orders: {
            none: {
              createdAt: { gte: cutoff },
            },
          },
        },
      ],
    },
    select: {
      id: true,
      email: true,
      name: true,
      _count: { select: { orders: true } },
    },
    orderBy: { createdAt: "asc" },
  });
  // SQL: EXISTS (any order) AND NOT EXISTS (order in last 90 days)
}

// ── (5) Categories where every post is published ──────────────────────────
async function getFullyPublishedCategories() {
  return prisma.category.findMany({
    where: {
      // Has at least one post (avoid vacuous truth)
      posts: { some: {} },
      // AND every post is published
      AND: [
        {
          posts: { every: { isPublished: true } },
        },
      ],
    },
    select: {
      id: true,
      name: true,
      slug: true,
      _count: { select: { posts: true } },
    },
  });
  // SQL: EXISTS (any post) AND NOT EXISTS (unpublished post)
}

export {
  getQualityAuthors,
  getPostsWithApprovedComments,
  getUnpurchasedProducts,
  getChurnRiskUsers,
  getFullyPublishedCategories,
};
```

---

---

# 10 — Aggregation — count, sum, avg, min, max, groupBy

---

## T — TL;DR

Prisma Client provides built-in aggregation via `aggregate` (one table, multiple metrics) and `groupBy` (grouped aggregation, equivalent to SQL `GROUP BY`). Both return typed results. For complex aggregations (window functions, HAVING with expressions, PERCENTILE), use `$queryRaw`. Aggregation methods: `_count`, `_sum`, `_avg`, `_min`, `_max`.

---

## K — Key Concepts

```typescript
// ── count ─────────────────────────────────────────────────────────────────

// Count all rows
const total = await prisma.user.count();
// total: number

// Count with filter
const activeCount = await prisma.user.count({
  where: { isActive: true },
});

// count with select: count specific fields (count non-null values)
const result = await prisma.user.count({
  select: {
    _all: true, // count all rows (same as count())
    email: true, // count non-null email values
    bio: true, // count non-null bio values (optional field)
  },
});
// result: { _all: 100; email: 100; bio: 47 }
```

```typescript
// ── aggregate — multiple metrics in one query ──────────────────────────────
const orderStats = await prisma.order.aggregate({
  where: { status: "delivered" },
  _count: { _all: true },
  _sum: { total: true },
  _avg: { total: true },
  _min: { total: true },
  _max: { total: true },
});
// orderStats: {
//   _count: { _all: 3420 }
//   _sum:   { total: Decimal('284,391.50') }
//   _avg:   { total: Decimal('83.15') }
//   _min:   { total: Decimal('5.00') }
//   _max:   { total: Decimal('9,999.00') }
// }

// Note: _sum, _avg etc. return Decimal | null
// null when no rows match the filter
const avg = orderStats._avg.total
  ? Number(orderStats._avg.total.toFixed(2))
  : 0;
```

```typescript
// ── groupBy — aggregate by category ───────────────────────────────────────
const ordersByStatus = await prisma.order.groupBy({
  by: ["status"], // GROUP BY status
  _count: { _all: true },
  _sum: { total: true },
  orderBy: { _count: { _all: "desc" } }, // order by count
});
// ordersByStatus: Array<{
//   status: string;
//   _count: { _all: number };
//   _sum:   { total: Decimal | null };
// }>

// Group by multiple fields
const ordersByStatusAndMonth = await prisma.order.groupBy({
  by: ["status", "customerId"],
  where: { createdAt: { gte: new Date("2025-01-01") } },
  _count: { _all: true },
  _sum: { total: true },
  orderBy: [{ status: "asc" }, { _sum: { total: "desc" } }],
});
```

```typescript
// ── groupBy with having — filter on aggregated values ─────────────────────
// HAVING equivalent in Prisma: use 'having' option in groupBy
const bigSpenders = await prisma.order.groupBy({
  by: ["customerId"],
  _sum: { total: true },
  _count: { _all: true },
  having: {
    total: {
      _sum: { gt: 1000 }, // HAVING SUM(total) > 1000
    },
  },
  orderBy: { _sum: { total: "desc" } },
});
// bigSpenders: customers whose total spend > $1000

// Having with count
const activeCategories = await prisma.post.groupBy({
  by: ["categoryId"],
  _count: { _all: true },
  having: {
    categoryId: {
      _count: { gte: 5 }, // HAVING COUNT(*) >= 5
    },
  },
});
```

```typescript
// ── Combining aggregate with relations ─────────────────────────────────────
// aggregation + include doesn't exist — use $queryRaw for complex aggregation
// OR use aggregate + separate include query and merge in application

// Pattern: aggregate + then fetch details
const topCategoryIds = (
  await prisma.post.groupBy({
    by: ["categoryId"],
    _count: { _all: true },
    orderBy: { _count: { _all: "desc" } },
    take: 5,
  })
)
  .map((r) => r.categoryId)
  .filter((id): id is number => id !== null);

const topCategories = await prisma.category.findMany({
  where: { id: { in: topCategoryIds } },
  include: { _count: { select: { posts: true } } },
});
```

```typescript
// ── $queryRaw for complex aggregation ─────────────────────────────────────
// When groupBy/aggregate can't express what you need:
// - Window functions
// - PERCENTILE_CONT / PERCENTILE_DISC
// - Rollup / Cube
// - Complex HAVING with expressions

interface MonthlyRevenue {
  month: string;
  order_count: number;
  total_revenue: string;
  avg_order: string;
}

const monthlyRevenue = await prisma.$queryRaw<MonthlyRevenue[]>`
  SELECT
    TO_CHAR(DATE_TRUNC('month', created_at), 'YYYY-MM') AS month,
    COUNT(*)::INT                                        AS order_count,
    SUM(total)::TEXT                                     AS total_revenue,
    AVG(total)::TEXT                                     AS avg_order
  FROM orders
  WHERE status = 'delivered'
    AND created_at >= NOW() - INTERVAL '12 months'
  GROUP BY DATE_TRUNC('month', created_at)
  ORDER BY DATE_TRUNC('month', created_at) DESC
`;
```

---

## W — Why It Matters

- `groupBy` with `having` maps directly to SQL `GROUP BY ... HAVING` — this is the correct Prisma API for "customers who spent more than X" or "categories with at least N posts." Without `having`, you would need to fetch all grouped results and filter in application code, which loads far more data than necessary.
- `aggregate` returns `null` for `_sum`, `_avg`, `_min`, `_max` when no rows match the filter — not zero. Code that does `const avg = stats._avg.total.toFixed(2)` will throw if there are no matching rows. Always null-check aggregation results before calling methods on them.
- `$queryRaw` is the escape hatch for anything beyond `groupBy` — window functions (`ROW_NUMBER`, `RANK`, `LAG`, `LEAD`), percentile calculations (`PERCENTILE_CONT`), date truncation grouping, and multi-table aggregations. Knowing when to reach for raw SQL instead of fighting the Prisma API is a sign of maturity — Prisma and raw SQL are not mutually exclusive.

---

## I — Interview Q&A

### Q: What is the difference between `prisma.model.count()`, `prisma.model.aggregate()`, and `prisma.model.groupBy()`?

**A:** All three perform aggregation but at different levels of granularity. `count()` counts rows matching a filter — it returns a single number and is the fastest option when you only need a row count. `aggregate()` computes multiple metrics (`_count`, `_sum`, `_avg`, `_min`, `_max`) on the entire result set in one query — it returns a single object with all the requested metrics, equivalent to `SELECT COUNT(*), SUM(col), AVG(col) FROM table WHERE ...`. `groupBy()` partitions the result set into groups by one or more fields and computes metrics per group — equivalent to `SELECT col, COUNT(*), SUM(...) FROM table GROUP BY col HAVING ...`. Use `count()` for simple totals, `aggregate()` for dashboard summary stats, and `groupBy()` for breakdowns by category, status, date bucket, or any other dimension.

### Q: How do you implement a `HAVING` clause in Prisma's `groupBy`?

**A:** Prisma's `groupBy` accepts a `having` option that filters groups after aggregation — the equivalent of SQL `HAVING`. The syntax mirrors the field filter operators but applied to the aggregated value: `having: { total: { _sum: { gt: 1000 } } }` generates `HAVING SUM(total) > 1000`. You can combine multiple having conditions using `AND` / `OR` / `NOT` just like in `where`. Important limitation: `having` can only reference fields that are either in the `by` array or in the aggregation — you cannot use `having` to filter on a field that isn't part of the `groupBy` select. For complex `HAVING` expressions (e.g. `HAVING SUM(a) > AVG(b)`), use `$queryRaw`.

---

## C — Common Pitfalls + Fix

### ❌ Not null-checking aggregation results — crashes when no rows match

```typescript
// ❌ _sum and _avg return null when no rows match the filter
const stats = await prisma.order.aggregate({
  where: { status: "delivered", customerId: 99999 }, // no orders for this customer
  _avg: { total: true },
  _sum: { total: true },
});

// ❌ These crash if no rows match — _avg.total is null
const avgDisplay = stats._avg.total.toFixed(2); // TypeError: Cannot read properties of null
const sumDisplay = stats._sum.total.toString(); // TypeError: Cannot read properties of null
```

**Fix:** Always null-check aggregation values before using them:

```typescript
// ✅ Safe null handling
const stats = await prisma.order.aggregate({
  where: { status: "delivered", customerId: 99999 },
  _count: { _all: true },
  _avg: { total: true },
  _sum: { total: true },
});

const count = stats._count._all; // always a number
const avg = stats._avg.total ? Number(stats._avg.total.toFixed(2)) : 0;
const sum = stats._sum.total ? Number(stats._sum.total.toFixed(2)) : 0;

// Or with nullish coalescing:
const avgSafe = stats._avg.total?.toNumber() ?? 0;
const sumSafe = stats._sum.total?.toNumber() ?? 0;
```

---

## K — Coding Challenge + Solution

### Challenge

Build a `getDashboardStats` function that returns a complete analytics summary for an admin dashboard using a mix of `count`, `aggregate`, `groupBy`, and `$queryRaw`. It should return: (1) total users, active users, and new users this month; (2) total revenue, average order value, and order count for the current month; (3) orders grouped by status with count and total revenue per status; (4) top 5 customers by total spend using `groupBy` + `having`; (5) monthly revenue for the last 6 months using `$queryRaw`. Return everything as a single typed object.

### Solution

```typescript
import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";

// ── Return type ────────────────────────────────────────────────────────────
interface DashboardStats {
  users: {
    total: number;
    active: number;
    newThisMonth: number;
  };
  revenue: {
    thisMonthTotal: number;
    thisMonthAvgOrder: number;
    thisMonthOrderCount: number;
  };
  ordersByStatus: Array<{
    status: string;
    count: number;
    revenue: number;
  }>;
  topCustomers: Array<{
    customerId: number;
    totalSpend: number;
    orderCount: number;
  }>;
  monthlyRevenue: Array<{
    month: string;
    orderCount: number;
    totalRevenue: number;
  }>;
}

// ── Helper: start of current month ────────────────────────────────────────
function startOfMonth(): Date {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth(), 1);
}

// ── getDashboardStats ──────────────────────────────────────────────────────
async function getDashboardStats(): Promise<DashboardStats> {
  const monthStart = startOfMonth();

  // ── (1) User counts — three separate count queries run in parallel ────
  const [totalUsers, activeUsers, newUsersThisMonth] = await Promise.all([
    prisma.user.count(),
    prisma.user.count({ where: { isActive: true } }),
    prisma.user.count({ where: { createdAt: { gte: monthStart } } }),
  ]);

  // ── (2) Revenue aggregate for current month ────────────────────────────
  const revenueStats = await prisma.order.aggregate({
    where: {
      status: "delivered",
      createdAt: { gte: monthStart },
    },
    _count: { _all: true },
    _sum: { total: true },
    _avg: { total: true },
  });

  // ── (3) Orders grouped by status ──────────────────────────────────────
  const ordersByStatusRaw = await prisma.order.groupBy({
    by: ["status"],
    _count: { _all: true },
    _sum: { total: true },
    orderBy: { _count: { _all: "desc" } },
  });

  // ── (4) Top 5 customers by total spend — groupBy + having ────────────
  const topCustomersRaw = await prisma.order.groupBy({
    by: ["customerId"],
    where: { status: { not: "cancelled" } },
    _sum: { total: true },
    _count: { _all: true },
    having: {
      total: {
        _sum: { gt: 0 }, // at least some spend (exclude $0 orders)
      },
    },
    orderBy: { _sum: { total: "desc" } },
    take: 5,
  });

  // ── (5) Monthly revenue for last 6 months — $queryRaw ─────────────────
  interface MonthlyRevenueRow {
    month: string;
    order_count: number;
    total_revenue: string; // NUMERIC comes back as string from raw query
  }

  const monthlyRevenueRaw = await prisma.$queryRaw<MonthlyRevenueRow[]>`
    SELECT
      TO_CHAR(DATE_TRUNC('month', created_at), 'YYYY-MM') AS month,
      COUNT(*)::INT                                        AS order_count,
      COALESCE(SUM(total), 0)::TEXT                        AS total_revenue
    FROM orders
    WHERE status    = 'delivered'
      AND created_at >= NOW() - INTERVAL '6 months'
    GROUP BY DATE_TRUNC('month', created_at)
    ORDER BY DATE_TRUNC('month', created_at) ASC
  `;

  // ── Assemble and return ────────────────────────────────────────────────
  return {
    users: {
      total: totalUsers,
      active: activeUsers,
      newThisMonth: newUsersThisMonth,
    },

    revenue: {
      thisMonthTotal: revenueStats._sum.total?.toNumber() ?? 0,
      thisMonthAvgOrder: revenueStats._avg.total
        ? Number(revenueStats._avg.total.toFixed(2))
        : 0,
      thisMonthOrderCount: revenueStats._count._all,
    },

    ordersByStatus: ordersByStatusRaw.map((row) => ({
      status: row.status,
      count: row._count._all,
      revenue: row._sum.total?.toNumber() ?? 0,
    })),

    topCustomers: topCustomersRaw.map((row) => ({
      customerId: row.customerId,
      totalSpend: row._sum.total?.toNumber() ?? 0,
      orderCount: row._count._all,
    })),

    monthlyRevenue: monthlyRevenueRaw.map((row) => ({
      month: row.month,
      orderCount: row.order_count,
      totalRevenue: parseFloat(row.total_revenue),
    })),
  };
}

export type { DashboardStats };
export { getDashboardStats };
```

---

## ✅ Day 8 Complete — Prisma Client Data Access

| #   | Subtopic                                                | Status |
| --- | ------------------------------------------------------- | ------ |
| 1   | CRUD — create, findUnique, update, delete, upsert       | ☐      |
| 2   | select — Field Selection and Partial Return Types       | ☐      |
| 3   | include — Loading Relations Eagerly                     | ☐      |
| 4   | Filtering — where, Operators, and Field Filters         | ☐      |
| 5   | Sorting — orderBy, Multi-field, Relation Sorting        | ☐      |
| 6   | Pagination — take/skip and Cursor-Based                 | ☐      |
| 7   | Nested Reads — Deep select, include, and Combining Both | ☐      |
| 8   | Nested Writes — Creating and Updating Across Relations  | ☐      |
| 9   | Relation Queries — Filtering, some/every/none, \_count  | ☐      |
| 10  | Aggregation — count, sum, avg, min, max, groupBy        | ☐      |

---

## 🗺️ One-Page Mental Model — Day 8

```
CRUD
  create           → INSERT ... RETURNING *     → returns T
  createMany       → bulk INSERT                → returns { count }
  createManyAndReturn → bulk INSERT RETURNING   → returns T[]
  findUnique        → SELECT WHERE unique        → returns T | null
  findUniqueOrThrow → SELECT WHERE unique        → returns T or throws P2025
  findFirst         → SELECT LIMIT 1            → returns T | null
  findMany          → SELECT WHERE ...          → returns T[]
  update            → UPDATE WHERE unique       → returns T
  updateMany        → UPDATE WHERE filter       → returns { count }
  delete            → DELETE WHERE unique       → returns T
  deleteMany        → DELETE WHERE filter       → returns { count }
  upsert            → INSERT ... ON CONFLICT    → returns T
  Atomic ops:  { increment, decrement, multiply, divide, set }

SELECT
  select: { field: true }     → SQL SELECT col  (allowlist — not denylist)
  select narrows return type  → TS error if you access field not in select
  select: false doesn't exist → list what you WANT, omit what you don't
  Prisma.UserGetPayload<{ select: typeof mySelect }> → derive TS type
  select + _count             → include relation count in result

INCLUDE
  include: { relation: true }         → loads ALL fields of related model
  include: { relation: { select } }   → loads only selected fields
  include + where/take/orderBy        → filter/sort/limit included relation
  select and include mutually exclusive at top level
  → use select with nested relation for finest control
  Prisma.ModelGetPayload<typeof args>  → derive type from include

WHERE (Filtering)
  Equality:  { field: value }
  Operators: equals, not, gt, gte, lt, lte, in, notIn
  Strings:   contains, startsWith, endsWith + mode: 'insensitive' (ILIKE)
  Null:      { field: null } or { field: { equals: null } }
  Not null:  { field: { not: null } }
  Logic:     AND: [...], OR: [...], NOT: { ... }
  Date range: { AND: [{ date: { gte: start } }, { date: { lt: end } }] }
             OR: { date: { gte: start, lt: end } }  (nested operators on same field)
  JSON:      { path: ['key'], equals: 'value' }
  Arrays:    has, hasSome, hasEvery, isEmpty

ORDER BY
  Single:    orderBy: { field: 'asc' | 'desc' }
  Multi:     orderBy: [{ field1: 'asc' }, { field2: 'desc' }]   ← use array!
  Nulls:     orderBy: { field: { sort: 'asc', nulls: 'last' } }
  Relation:  orderBy: { relation: { field: 'asc' } }
  Count:     orderBy: { relation: { _count: 'desc' } }
  Tiebreaker: always include { id: 'desc' } as last sort for cursor pagination

PAGINATION
  Offset:   take + skip → O(skip) degrades at depth
  Cursor:   cursor: { id: lastId }, skip: 1, take: N → O(log n) always
  hasNextPage: take: N+1, check if result.length > N, slice to N
  nextCursor: last item's id (null if no next page)
  Backward:  take: -N (negative take)

NESTED READS
  include inside include  → relations of relations
  select inside include   → limit included relation fields
  select inside select    → limit parent AND relation fields
  Always add where/take on nested collections → prevent unbounded fetches
  Derive types: Prisma.ModelGetPayload<typeof nestedArgs>

NESTED WRITES (atomic — all-or-nothing)
  create           → create new related record
  createMany       → bulk create related records
  connect          → link existing record by unique field
  connectOrCreate  → link if exists, create if not (idempotent)
  update           → update a specific related record
  updateMany       → update related records matching filter
  disconnect       → remove relationship (keeps related record)
  delete           → remove relationship AND related record
  deleteMany       → remove matching related records
  set              → REPLACE entire collection (destructive!)

RELATION FILTERS (where on relation fields)
  some:  { relation: { some: { condition } } }  → EXISTS
  every: { relation: { every: { condition } } } → NOT EXISTS (NOT condition)
  none:  { relation: { none: { condition } } }  → NOT EXISTS
  is:    { relation: { is: { condition } } }    → one-to-one filter
  isNot: { relation: { isNot: { condition } } }
  ⚠️ every with no children = true (vacuous truth) → combine with some: {}

_COUNT
  select: { _count: { select: { relation: true } } }         → count related
  select: { _count: { select: { relation: { where } } } }    → filtered count
  orderBy: { relation: { _count: 'desc' } }                  → sort by count

AGGREGATION
  count()           → single number
  aggregate()       → { _count, _sum, _avg, _min, _max } for whole table
  groupBy()         → per-group metrics + having for post-aggregation filter
  having:           → { field: { _sum: { gt: N } } }  (HAVING equivalent)
  ⚠️ _sum/_avg/_min/_max return null when no rows match → always null-check
  $queryRaw         → window functions, PERCENTILE, complex HAVING, rollups

TYPE DERIVATION (always use these — stay in sync automatically)
  Prisma.ModelGetPayload<{ select: typeof mySelect }>
  Prisma.ModelGetPayload<{ include: typeof myInclude }>
  Prisma.ModelGetPayload<typeof myArgs>
  Prisma.ModelWhereInput  → type for where clauses
  Prisma.ModelOrderByWithRelationInput  → type for orderBy
```

> **Your next action:** Open your project (or a fresh `prisma.$connect()` REPL). Pick one model and run `prisma.model.aggregate({ _count: { _all: true }, _sum: { numericField: true } })`. Read the output. Then run the same thing inside `groupBy`. You just did aggregation.

> "Doing one small thing beats opening a feed."
