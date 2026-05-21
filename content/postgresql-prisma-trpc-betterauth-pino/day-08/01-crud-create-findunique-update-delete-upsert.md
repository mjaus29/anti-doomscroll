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
