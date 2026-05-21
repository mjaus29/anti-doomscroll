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
