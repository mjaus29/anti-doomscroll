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
