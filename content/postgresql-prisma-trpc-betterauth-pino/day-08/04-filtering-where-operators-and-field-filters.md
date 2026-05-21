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
