# 7 — Raw SQL with `$queryRaw` and `$executeRaw`

---

## T — TL;DR

`$queryRaw` runs a SQL `SELECT` and returns typed results. `$executeRaw` runs a SQL statement that doesn't return rows (`UPDATE`, `INSERT`, `DELETE`, `CALL`). Both use tagged template literals for safe parameterization — Prisma automatically uses prepared statements, preventing SQL injection. Use raw SQL when Prisma Client can't express the query (window functions, CTEs, full-text search, custom aggregations, complex joins).

---

## K — Key Concepts

```typescript
// ── $queryRaw — SELECT queries returning rows ──────────────────────────────
import { prisma } from "@/lib/prisma";

// Basic usage — tagged template literal
const users = await prisma.$queryRaw`
  SELECT id, email, name FROM users WHERE is_active = true
`;
// Return type: unknown[] — you must type it explicitly

// With explicit TypeScript type
interface UserRow {
  id: number;
  email: string;
  name: string | null;
}

const typedUsers = await prisma.$queryRaw<UserRow[]>`
  SELECT id, email, name FROM users WHERE is_active = true
`;
// typedUsers: UserRow[] ✅
```

```typescript
// ── Parameters — tagged template literals prevent SQL injection ─────────────
const userId = 42;
const status = "active";

// ✅ Safe parameterization — variables become prepared statement parameters
const result = await prisma.$queryRaw<UserRow[]>`
  SELECT id, email FROM users
  WHERE id = ${userId}
    AND status = ${status}
`;
// Prisma sends: SELECT id, email FROM users WHERE id = $1 AND status = $2
// Parameters:  [42, 'active']
// SQL injection impossible ✅

// ❌ NEVER use string interpolation — bypasses parameterization
const UNSAFE = await prisma.$queryRaw<UserRow[]>(
  Prisma.sql`SELECT * FROM users WHERE id = ${userId}` // ✅ Prisma.sql is safe
);

// ❌ This is SQL INJECTION VULNERABLE:
const evil = await prisma.$queryRaw(`SELECT * FROM users WHERE id = ${userId}`); // ❌
```

```typescript
// ── Prisma.sql — composing complex queries safely ──────────────────────────
import { Prisma } from "@prisma/client";

// Build dynamic WHERE clauses safely
const filters: Prisma.Sql[] = [];

if (userId) filters.push(Prisma.sql`u.id = ${userId}`);
if (status) filters.push(Prisma.sql`u.status = ${status}`);
if (email) filters.push(Prisma.sql`u.email ILIKE ${"%" + email + "%"}`);

const whereClause =
  filters.length > 0
    ? Prisma.sql`WHERE ${Prisma.join(filters, " AND ")}`
    : Prisma.empty;

const users = await prisma.$queryRaw<UserRow[]>`
  SELECT u.id, u.email, u.name, COUNT(p.id) AS post_count
  FROM users u
  LEFT JOIN posts p ON p.author_id = u.id
  ${whereClause}
  GROUP BY u.id
  ORDER BY post_count DESC
  LIMIT 20
`;
```

```typescript
// ── $queryRaw for features Prisma Client can't express ────────────────────

// Window function — Prisma has no window function API
interface RankedProduct {
  id: number;
  name: string;
  price: string;
  category: string;
  price_rank: number;
}

const rankedProducts = await prisma.$queryRaw<RankedProduct[]>`
  SELECT
    id,
    name,
    price::TEXT,
    category,
    RANK() OVER (PARTITION BY category ORDER BY price DESC) AS price_rank
  FROM products
  WHERE is_active = true
`;

// CTE — common table expression
interface OrderSummary {
  customer_id: number;
  order_count: number;
  total_spend: string;
  avg_order: string;
}

const customerSummaries = await prisma.$queryRaw<OrderSummary[]>`
  WITH order_stats AS (
    SELECT
      customer_id,
      COUNT(*)::INT       AS order_count,
      SUM(total)          AS total_spend,
      AVG(total)          AS avg_order
    FROM orders
    WHERE status = 'delivered'
    GROUP BY customer_id
  )
  SELECT *
  FROM order_stats
  WHERE order_count >= ${3}
  ORDER BY total_spend DESC
  LIMIT ${50}
`;
```

```typescript
// ── $executeRaw — statements that don't return rows ───────────────────────

// Bulk update with complex logic
const affectedRows = await prisma.$executeRaw`
  UPDATE orders
  SET status = 'expired'
  WHERE status = 'pending'
    AND created_at < NOW() - INTERVAL '24 hours'
`;
// Returns: number of affected rows

// Call a stored procedure
await prisma.$executeRaw`
  CALL recalculate_user_stats(${userId})
`;

// Refresh a materialized view
await prisma.$executeRaw`
  REFRESH MATERIALIZED VIEW CONCURRENTLY monthly_revenue_summary
`;

// Set session variables
await prisma.$executeRaw`
  SET app.current_user_id = ${userId.toString()}
`;
// Used for RLS: PostgreSQL reads this via current_setting('app.current_user_id')
```

```typescript
// ── Type safety caveats with $queryRaw ────────────────────────────────────
// Prisma returns PostgreSQL types as JavaScript types — but with some gotchas:
// BIGINT → BigInt (not number — must use .toString() or Number())
// NUMERIC/DECIMAL → string (not number — exact representation)
// TIMESTAMPTZ → Date ✅
// JSONB → object ✅
// BOOLEAN → boolean ✅
// INTEGER → number ✅

interface RevenueRow {
  total_revenue: string; // DECIMAL comes back as string
  order_count: bigint; // BIGINT comes back as BigInt
  last_order: Date; // TIMESTAMP comes back as Date
}

const revenue = await prisma.$queryRaw<RevenueRow[]>`
  SELECT
    SUM(total)::TEXT AS total_revenue,
    COUNT(*)         AS order_count,
    MAX(created_at)  AS last_order
  FROM orders
  WHERE customer_id = ${customerId}
`;

// Serialize safely for JSON API response:
const response = revenue.map((r) => ({
  totalRevenue: r.total_revenue, // already a string ✅
  orderCount: Number(r.order_count), // BigInt → number ✅
  lastOrder: r.last_order.toISOString(), // Date → string ✅
}));
```

---

## W — Why It Matters

- Tagged template literals are the only safe way to parameterize raw SQL in Prisma — the `${}` interpolations in `` prisma.$queryRaw`...${variable}...` `` are not string interpolation; Prisma converts them to `$1`, `$2` prepared statement placeholders. Using string template literals (`"SELECT ... WHERE id = " + userId`) bypasses this and creates SQL injection vulnerabilities.
- `BIGINT` returning as `BigInt` (not `number`) is a common runtime surprise — `JSON.stringify` throws on `BigInt`, and arithmetic with `BigInt` requires the `n` suffix. Always cast BIGINTs to `TEXT` in the SQL or `Number()` in TypeScript for API responses.
- `$executeRaw` for `REFRESH MATERIALIZED VIEW CONCURRENTLY` is a practical pattern — materialized views must be manually refreshed (PostgreSQL doesn't auto-refresh them). Running `REFRESH CONCURRENTLY` inside a Prisma query from a scheduled job keeps read-model data fresh without blocking queries.

---

## I — Interview Q&A

### Q: When should you use `$queryRaw` instead of Prisma Client's built-in query methods?

**A:** Use `$queryRaw` when the query requires SQL features that Prisma Client's API doesn't support. The main cases are: (1) **Window functions** — `RANK()`, `ROW_NUMBER()`, `LAG()`, `LEAD()` — Prisma has no window function abstraction; (2) **CTEs** — `WITH ... AS (...)` for complex multi-step queries; (3) **Full-text search** — `to_tsvector` and `to_tsquery` queries; (4) **Custom aggregations** — `PERCENTILE_CONT`, `ARRAY_AGG`, `STRING_AGG` with complex grouping; (5) **Lateral joins** or complex multi-table queries that would be multiple roundtrips in Prisma Client; (6) **Calling stored procedures** or PostgreSQL functions; (7) **Setting session variables** for row-level security. Always use tagged template literals (`` `...${param}...` ``) for safe parameterization — never use string concatenation which creates SQL injection vulnerabilities.

---

## C — Common Pitfalls + Fix

### ❌ Using string interpolation in raw queries — SQL injection vulnerability

```typescript
// ❌ Direct string interpolation bypasses Prisma's parameterization
const searchTerm = req.query.search; // user input: "'; DROP TABLE users; --"

const results = await prisma.$queryRaw(
  `SELECT * FROM products WHERE name LIKE '%${searchTerm}%'`
);
// This sends raw SQL with the injected string — SQL injection possible ❌
```

**Fix:** Always use tagged template literal syntax:

```typescript
// ✅ Tagged template — converted to prepared statement parameters
const searchTerm = req.query.search as string;

const results = await prisma.$queryRaw<Product[]>`
  SELECT * FROM products
  WHERE name ILIKE ${"%" + searchTerm + "%"}
`;
// Prisma sends: SELECT * FROM products WHERE name ILIKE $1
// Parameter:    ['%<searchTerm>%']
// SQL injection impossible ✅
```

---

## K — Coding Challenge + Solution

### Challenge

Write three raw SQL queries using `$queryRaw` and one using `$executeRaw`: (1) a window function query that ranks customers by their total spend within each region; (2) a CTE-based query that finds products with declining sales (month-over-month comparison); (3) a full-text search query over `products(name, description)`; (4) a `$executeRaw` that bulk-expires sessions older than 24 hours and returns the count. Show proper TypeScript types and safe parameterization for all.

### Solution

```typescript
import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";

// ── (1) Window function: customer spend rank by region ─────────────────────
interface CustomerRankRow {
  customer_id: number;
  customer_name: string;
  region: string;
  total_spend: string;
  region_rank: number;
}

async function getCustomerRankByRegion(minSpend: number) {
  return prisma.$queryRaw<CustomerRankRow[]>`
    SELECT
      c.id                                                    AS customer_id,
      c.name                                                  AS customer_name,
      c.region,
      SUM(o.total)::TEXT                                      AS total_spend,
      RANK() OVER (
        PARTITION BY c.region
        ORDER BY SUM(o.total) DESC
      )                                                       AS region_rank
    FROM customers c
    JOIN orders o ON o.customer_id = c.id
    WHERE o.status = 'delivered'
    GROUP BY c.id, c.name, c.region
    HAVING SUM(o.total) >= ${minSpend}
    ORDER BY c.region, region_rank
  `;
}

// ── (2) CTE: products with month-over-month sales decline ─────────────────
interface DecliningProductRow {
  product_id: number;
  product_name: string;
  this_month_sales: number;
  last_month_sales: number;
  decline_pct: string;
}

async function getDecliningProducts(minDeclinePct: number) {
  return prisma.$queryRaw<DecliningProductRow[]>`
    WITH monthly_sales AS (
      SELECT
        oi.product_id,
        DATE_TRUNC('month', o.created_at)   AS sale_month,
        SUM(oi.quantity)::INT               AS units_sold
      FROM order_items oi
      JOIN orders o ON o.id = oi.order_id
      WHERE o.status = 'delivered'
        AND o.created_at >= NOW() - INTERVAL '2 months'
      GROUP BY oi.product_id, DATE_TRUNC('month', o.created_at)
    ),
    pivoted AS (
      SELECT
        product_id,
        SUM(units_sold) FILTER (
          WHERE sale_month = DATE_TRUNC('month', NOW())
        )::INT                               AS this_month,
        SUM(units_sold) FILTER (
          WHERE sale_month = DATE_TRUNC('month', NOW() - INTERVAL '1 month')
        )::INT                               AS last_month
      FROM monthly_sales
      GROUP BY product_id
    )
    SELECT
      p.id          AS product_id,
      p.name        AS product_name,
      pv.this_month AS this_month_sales,
      pv.last_month AS last_month_sales,
      ROUND(
        (pv.last_month - pv.this_month)::NUMERIC
        / NULLIF(pv.last_month, 0) * 100,
        2
      )::TEXT       AS decline_pct
    FROM pivoted pv
    JOIN products p ON p.id = pv.product_id
    WHERE pv.last_month > 0
      AND (pv.last_month - pv.this_month)::NUMERIC
          / pv.last_month * 100 >= ${minDeclinePct}
    ORDER BY decline_pct DESC
  `;
}

// ── (3) Full-text search over products ────────────────────────────────────
interface ProductSearchRow {
  id: number;
  name: string;
  description: string | null;
  rank: string;
}

async function searchProducts(query: string, limit = 20) {
  // Convert user query to tsquery format safely
  const tsQuery = query.trim().split(/\s+/).join(" & ");

  return prisma.$queryRaw<ProductSearchRow[]>`
    SELECT
      id,
      name,
      description,
      TS_RANK(
        TO_TSVECTOR('english', name || ' ' || COALESCE(description, '')),
        TO_TSQUERY('english', ${tsQuery})
      )::TEXT AS rank
    FROM products
    WHERE
      TO_TSVECTOR('english', name || ' ' || COALESCE(description, ''))
      @@ TO_TSQUERY('english', ${tsQuery})
      AND is_active = true
    ORDER BY rank DESC
    LIMIT ${limit}
  `;
}

// ── (4) $executeRaw: bulk expire old sessions ─────────────────────────────
async function expireOldSessions(olderThanHours = 24): Promise<number> {
  const affected = await prisma.$executeRaw`
    UPDATE user_sessions
    SET
      is_expired = true,
      expired_at = NOW()
    WHERE
      is_expired = false
      AND last_active_at < NOW() - (${olderThanHours} || ' hours')::INTERVAL
  `;
  return affected; // number of rows updated
}

// Usage:
const expiredCount = await expireOldSessions(24);
console.log(`Expired ${expiredCount} sessions`);
```

---

---
