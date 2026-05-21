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
