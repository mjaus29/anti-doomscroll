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
