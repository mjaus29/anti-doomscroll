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
