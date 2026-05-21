# 2 — Batching Mindset — Promise.all, Avoiding N+1, Query Counting

---

## T — TL;DR

The batching mindset is about minimizing database round trips. Three rules: (1) independent queries run in parallel with `Promise.all`, not sequentially with `await`; (2) N+1 queries are replaced with `include`, `createMany`, or `in` lookups; (3) you actively count how many queries a code path issues and reduce that number. Prisma's query logging makes round trip counting visible.

---

## K — Key Concepts

```typescript
// ── Sequential vs parallel — the most common performance mistake ───────────

// ❌ Sequential: 3 round trips, one after another
const user     = await prisma.user.findUnique({ where: { id: 1 } })
const products = await prisma.product.findMany({ where: { isActive: true } })
const stats    = await prisma.order.count()
// Total: 3 × RTT (round-trip time)

// ✅ Parallel: 3 queries sent at the same time, resolves in max(RTT)
const [user, products, stats] = await Promise.all([
  prisma.user.findUnique({ where: { id: 1 } }),
  prisma.product.findMany({ where: { isActive: true } }),
  prisma.order.count(),
])
// Total: 1 × RTT  ← 3× faster ✅
```

```typescript
// ── N+1 pattern — the most common Prisma anti-pattern ─────────────────────

// ❌ N+1: 1 query for orders + 1 query per order for its customer
const orders = await prisma.order.findMany({ take: 50 })
for (const order of orders) {
  const customer = await prisma.customer.findUnique({  // ← 50 queries ❌
    where: { id: order.customerId }
  })
  console.log(customer.name)
}
// Total: 51 queries

// ✅ Fix A: use include (1-2 queries total)
const ordersWithCustomers = await prisma.order.findMany({
  take:    50,
  include: { customer: { select: { id: true, name: true } } }
})
ordersWithCustomers.forEach(o => console.log(o.customer.name))
// Total: 1-2 queries ✅

// ✅ Fix B: batch lookup with in (when include isn't available)
const orders = await prisma.order.findMany({ take: 50 })
const customerIds = [...new Set(orders.map(o => o.customerId))]
const customers   = await prisma.customer.findMany({
  where:  { id: { in: customerIds } },
  select: { id: true, name: true },
})
const customerMap = new Map(customers.map(c => [c.id, c]))
orders.forEach(o => console.log(customerMap.get(o.customerId)?.name))
// Total: 2 queries ✅
```

```typescript
// ── createMany instead of looping create ──────────────────────────────────

// ❌ Loop: N round trips
for (const item of items) {
  await prisma.tag.create({ data: { name: item.name } })  // N queries ❌
}

// ✅ createMany: 1 round trip
await prisma.tag.createMany({
  data:            items.map(i => ({ name: i.name })),
  skipDuplicates:  true,
})
// 1 query ✅
```

```typescript
// ── Query logging — count your queries ────────────────────────────────────
// Enable query logging to see every SQL statement Prisma sends

const prisma = new PrismaClient({
  log: [
    { emit: 'event', level: 'query' },
    { emit: 'stdout', level: 'error' },
  ],
})

// Count queries in a code path
let queryCount = 0
prisma.$on('query', () => { queryCount++ })

queryCount = 0
await someServiceFunction()
console.log(`Queries issued: ${queryCount}`)  // measure, then reduce

// Or log every query with its SQL and duration:
prisma.$on('query', (e) => {
  console.log(`[SQL] ${e.query}  — ${e.duration}ms`)
})
```

```typescript
// ── Promise.all inside a transaction ──────────────────────────────────────
// Independent operations inside a transaction can also be parallelised
await prisma.$transaction(async (tx) => {
  // ✅ These two don't depend on each other — run in parallel
  const [order, inventory] = await Promise.all([
    tx.order.findUniqueOrThrow({ where: { id: orderId } }),
    tx.inventory.findUnique({ where: { productId } }),
  ])

  // Now use both results
  if ((inventory?.qty ?? 0) < order.quantity) {
    throw new Error('Out of stock')
  }

  await tx.inventory.update({
    where: { productId },
    data:  { qty: { decrement: order.quantity } },
  })
})
```

```typescript
// ── Batching aggregations — avoid per-row count subqueries ────────────────

// ❌ Slow: one count query per category
const categories = await prisma.category.findMany()
for (const cat of categories) {
  cat.postCount = await prisma.post.count({  // N queries ❌
    where: { categoryId: cat.id }
  })
}

// ✅ One groupBy query to get all counts at once
const [categories, countsByCategory] = await Promise.all([
  prisma.category.findMany({ select: { id: true, name: true } }),
  prisma.post.groupBy({
    by:     ['categoryId'],
    _count: { _all: true },
  }),
])

const countMap = new Map(countsByCategory.map(r => [r.categoryId, r._count._all]))
const result   = categories.map(c => ({
  ...c,
  postCount: countMap.get(c.id) ?? 0,
}))
// Total: 2 queries ✅
```

---

## W — Why It Matters

- Sequential `await` chains on independent queries are the single easiest performance win in any Prisma codebase — changing three `await` statements to `Promise.all([...])` can cut a route handler's DB time by 60% with no logic changes and no schema changes.
- The N+1 problem is invisible during development (small datasets) and catastrophic in production — 50 orders × 1 customer query = 51 queries. 500 orders = 501 queries. Query logging in development (`log: ['query']`) makes N+1 visible immediately — you see 51 identical `SELECT` statements and fix them before they reach production.
- `createMany` vs looping `create` is a 10–100× throughput difference — `createMany` sends one `INSERT ... VALUES (...),(...)` statement; a loop sends one `INSERT` per row, each with its own parse-plan-execute cycle and network round-trip.

---

## I — Interview Q&A

### Q: How do you detect and fix an N+1 query problem in a Prisma application?

**A:** Detection: enable Prisma's query logging (`log: [{ emit: 'event', level: 'query' }]`) and count the queries issued by a single route or function. If you see the same query template executing many times with different IDs (e.g. `SELECT * FROM customers WHERE id = $1` running 50 times), that's N+1. Fix strategies in order of preference: (1) Use `include` — add the relation to the original query so Prisma fetches parents and children together. (2) Batch lookup — collect all the needed IDs from the first query, then do one `findMany` with `where: { id: { in: ids } }` and build a map. (3) Use `groupBy` instead of per-row count queries. The root cause is always a loop containing a database query — eliminate the loop by moving the query outside and fetching all needed data at once.

---

## C — Common Pitfalls + Fix

### ❌ Awaiting independent queries sequentially — unnecessary latency

```typescript
// ❌ 3 sequential round trips — each waits for the previous
async function getDashboard(userId: number) {
  const user    = await prisma.user.findUniqueOrThrow({ where: { id: userId } })
  const orders  = await prisma.order.findMany({ where: { customerId: userId } })
  const balance = await prisma.wallet.findUnique({ where: { userId } })
  return { user, orders, balance }
}
```

**Fix:** Run them in parallel:

```typescript
// ✅ All three fire simultaneously — resolves in max(individual RTT)
async function getDashboard(userId: number) {
  const [user, orders, balance] = await Promise.all([
    prisma.user.findUniqueOrThrow({ where: { id: userId } }),
    prisma.order.findMany({ where: { customerId: userId } }),
    prisma.wallet.findUnique({ where: { userId } }),
  ])
  return { user, orders, balance }
}
```

---

## K — Coding Challenge + Solution

### Challenge

You're given this slow route handler — identify every performance problem and rewrite it using the batching mindset. The original: (1) fetches a workspace, then its projects one by one in a loop, (2) for each project fetches the member count separately, (3) creates audit log entries in a loop. Rewrite to use the minimum number of queries.

### Solution

```typescript
// ❌ Original — many queries
async function getWorkspaceSummary_SLOW(workspaceId: number) {
  const workspace = await prisma.workspace.findUniqueOrThrow({
    where: { id: workspaceId }
  })

  const projectIds = await prisma.project.findMany({
    where:  { workspaceId },
    select: { id: true, name: true }
  })

  const projects = []
  for (const p of projectIds) {                                // N+1
    const memberCount = await prisma.projectMember.count({    // N queries ❌
      where: { projectId: p.id }
    })
    projects.push({ ...p, memberCount })
  }

  for (const p of projects) {                                  // N queries ❌
    await prisma.auditLog.create({
      data: { action: 'viewed', entityId: p.id, entityType: 'project' }
    })
  }

  return { workspace, projects }
}

// ✅ Rewritten — 4 queries total
async function getWorkspaceSummary(workspaceId: number) {
  // Query 1 + 2: parallel — workspace and projects with member count
  const [workspace, projects] = await Promise.all([
    prisma.workspace.findUniqueOrThrow({
      where:  { id: workspaceId },
      select: { id: true, name: true, slug: true },
    }),
    prisma.project.findMany({
      where:  { workspaceId },
      select: {
        id:    true,
        name:  true,
        _count: { select: { members: true } },  // member count in one query ✅
      },
      orderBy: { name: 'asc' },
    }),
  ])

  // Query 3: createMany for all audit logs — 1 query instead of N ✅
  await prisma.auditLog.createMany({
    data: projects.map(p => ({
      action:     'viewed',
      entityId:   p.id,
      entityType: 'project',
      createdAt:  new Date(),
    })),
    skipDuplicates: true,
  })

  return {
    workspace,
    projects: projects.map(p => ({
      id:          p.id,
      name:        p.name,
      memberCount: p._count.members,
    }))
  }
  // Total: 3 queries (was N*2 + 2) ✅
}
```

---

---
