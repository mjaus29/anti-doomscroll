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
