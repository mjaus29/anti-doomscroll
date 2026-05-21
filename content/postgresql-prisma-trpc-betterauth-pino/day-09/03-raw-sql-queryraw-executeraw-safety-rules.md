# 3 — Raw SQL — $queryRaw, $executeRaw, Safety Rules

---

## T — TL;DR

Prisma's `$queryRaw` runs a raw `SELECT` and returns typed results. `$executeRaw` runs `INSERT`/`UPDATE`/`DELETE` and returns the affected row count. Both use **tagged template literals** with automatic parameterization — the only safe way to include variables. Never use `$queryRawUnsafe` or string interpolation with user input. Raw SQL is the escape hatch for window functions, CTEs, full-text search, and anything `groupBy` can't express.

---

## K — Key Concepts

```typescript
import { prisma } from '@/lib/prisma'
import { Prisma } from '@prisma/client'

// ── $queryRaw — SELECT, returns typed rows ────────────────────────────────
interface OrderSummaryRow {
  customer_name: string
  order_count:   number
  total_spent:   string   // NUMERIC comes back as string from raw query
}

const summaries = await prisma.$queryRaw<OrderSummaryRow[]>`
  SELECT
    u.name           AS customer_name,
    COUNT(o.id)::INT AS order_count,
    SUM(o.total)     AS total_spent
  FROM users u
  JOIN orders o ON o.customer_id = u.id
  WHERE o.status = 'delivered'
  GROUP BY u.id, u.name
  ORDER BY SUM(o.total) DESC
  LIMIT 10
`
// summaries: OrderSummaryRow[]  — fully typed ✅
```

```typescript
// ── Parameterization — the ONLY safe way to include variables ─────────────
// Prisma uses tagged template literals — variables are automatically bound
// as PostgreSQL $1, $2, $3 parameters (prepared statement style)

const minTotal = 100
const status   = 'delivered'

// ✅ Safe — variables are parameterized automatically
const orders = await prisma.$queryRaw<{ id: number; total: string }[]>`
  SELECT id, total
  FROM orders
  WHERE total >= ${minTotal}
    AND status  = ${status}
  ORDER BY total DESC
`
// Generated SQL: SELECT id, total FROM orders WHERE total >= $1 AND status = $2
// Parameters:   [100, 'delivered']  — never interpolated as strings ✅
```

```typescript
// ── ❌ NEVER use string interpolation with user input ─────────────────────
const userInput = "'; DROP TABLE orders; --"

// ❌ SQL injection — never do this
const bad = await prisma.$queryRawUnsafe(
  `SELECT * FROM orders WHERE status = '${userInput}'`
)
// Generated: SELECT * FROM orders WHERE status = ''; DROP TABLE orders; --'
// ← destroys your database ❌

// ✅ Always use tagged template literals
const good = await prisma.$queryRaw`
  SELECT * FROM orders WHERE status = ${userInput}
`
// Generated: SELECT * FROM orders WHERE status = $1  ← safe ✅
```

```typescript
// ── Dynamic column/table names — Prisma.sql helper ────────────────────────
// You CANNOT parameterize column or table names (they're identifiers, not values)
// Use Prisma.sql to compose safe query fragments

const column = 'created_at'  // from a validated allowlist — NEVER from raw user input

// ✅ Prisma.sql — compose fragments safely
const direction = 'DESC'
const query = Prisma.sql`
  SELECT id, total, ${Prisma.raw(column)}
  FROM orders
  ORDER BY ${Prisma.raw(column)} ${Prisma.raw(direction)}
  LIMIT ${10}
`
const results = await prisma.$queryRaw<{ id: number; total: string }[]>(query)

// Rule: Prisma.raw() is for identifiers from a VALIDATED allowlist only
// Never pass raw user input to Prisma.raw() — it's not parameterized
const ALLOWED_SORT_COLUMNS = ['created_at', 'total', 'status'] as const
type SortColumn = typeof ALLOWED_SORT_COLUMNS[number]

function safeSortColumn(col: string): SortColumn {
  if (!ALLOWED_SORT_COLUMNS.includes(col as SortColumn)) {
    throw new Error(`Invalid sort column: ${col}`)
  }
  return col as SortColumn
}
```

```typescript
// ── $executeRaw — INSERT, UPDATE, DELETE ───────────────────────────────────
// Returns number of affected rows

const count = await prisma.$executeRaw`
  UPDATE products
  SET stock_qty = stock_qty - ${1}
  WHERE id = ${productId}
    AND stock_qty > 0
`
// count: number (rows affected — 0 means product not found or out of stock)

// Bulk update via raw SQL — useful for complex expressions
const updated = await prisma.$executeRaw`
  UPDATE order_items
  SET unit_price = unit_price * ${1.1}
  WHERE order_id = ${orderId}
`

// With RETURNING — use $queryRaw if you need the rows back
const returned = await prisma.$queryRaw<{ id: number; stock_qty: number }[]>`
  UPDATE products
  SET stock_qty = stock_qty - ${quantity}
  WHERE id = ${productId} AND stock_qty >= ${quantity}
  RETURNING id, stock_qty
`
// returned.length === 0 → out of stock or not found
```

```typescript
// ── Common use cases for raw SQL ──────────────────────────────────────────

// 1. Window functions — Prisma has no window function API
const ranked = await prisma.$queryRaw<{
  id:         number
  customerId: number
  total:      string
  rank:       number
}[]>`
  SELECT
    id,
    customer_id,
    total,
    RANK() OVER (
      PARTITION BY customer_id
      ORDER BY total DESC
    ) AS rank
  FROM orders
  WHERE status = 'delivered'
`

// 2. Full-text search
const posts = await prisma.$queryRaw<{ id: number; title: string; rank: number }[]>`
  SELECT id, title,
    ts_rank(search_vector, plainto_tsquery('english', ${searchTerm})) AS rank
  FROM posts
  WHERE search_vector @@ plainto_tsquery('english', ${searchTerm})
  ORDER BY rank DESC
  LIMIT ${limit}
`

// 3. Upsert with complex conflict resolution
await prisma.$executeRaw`
  INSERT INTO product_views (product_id, user_id, view_count, last_viewed_at)
  VALUES (${productId}, ${userId}, 1, NOW())
  ON CONFLICT (product_id, user_id)
  DO UPDATE SET
    view_count     = product_views.view_count + 1,
    last_viewed_at = NOW()
`
```

---

## W — Why It Matters

- Tagged template literal parameterization is not a style choice — it is the only safe API in Prisma for raw SQL. Variables in the template (`${value}`) are always bound as PostgreSQL parameters (`$1`, `$2`), making SQL injection structurally impossible. `$queryRawUnsafe` with string interpolation is the equivalent of `eval()` with user input.
- `Prisma.raw()` for dynamic identifiers (column/table names) is the sharp edge — it does NOT parameterize. It inserts the string directly into the SQL. Only use it with values from a hardcoded allowlist that you validate in code, never with values that come from a request.
- NUMERIC/DECIMAL columns from raw queries return as JavaScript strings, not numbers or `Prisma.Decimal`. Always parse them: `parseFloat(row.total)` or `new Prisma.Decimal(row.total)`. This is a PostgreSQL driver behavior — `pg` returns NUMERIC as string to avoid precision loss.

---

## I — Interview Q&A

### Q: Why are Prisma's `$queryRaw` tagged template literals safe against SQL injection, and what should you never do?

**A:** When you write `` prisma.$queryRaw`SELECT * FROM orders WHERE id = ${userId}` ``, Prisma does not interpolate `userId` into the SQL string. Instead, it uses PostgreSQL's prepared statement protocol — it sends the query as `SELECT * FROM orders WHERE id = $1` and separately sends the parameter value `[userId]`. The database driver and PostgreSQL handle the binding, and PostgreSQL ensures the parameter value is treated as data, never as SQL syntax. This makes injection impossible regardless of what `userId` contains. What you must never do: use `$queryRawUnsafe` with string template literals or string concatenation containing any value derived from user input. Never write `` $queryRawUnsafe(`SELECT * FROM orders WHERE id = ${req.params.id}`) `` — this is direct SQL injection.

---

## C — Common Pitfalls + Fix

### ❌ Using `Prisma.raw()` with a value that could come from user input

```typescript
// ❌ User controls the sort direction — SQL injection via Prisma.raw()
async function getOrders(req: Request) {
  const sort = req.query.sort  // user sends: "DESC; DROP TABLE orders;--"

  return prisma.$queryRaw`
    SELECT * FROM orders ORDER BY total ${Prisma.raw(sort)}
  `
  // Prisma.raw() is NOT parameterized — this is injectable ❌
}
```

**Fix:** Validate against an allowlist before using `Prisma.raw()`:

```typescript
// ✅ Validate first, then use Prisma.raw()
type SortDir = 'ASC' | 'DESC'

function validateSortDir(input: unknown): SortDir {
  if (input === 'ASC' || input === 'DESC') return input
  return 'DESC'  // safe default
}

async function getOrders(req: Request) {
  const sort = validateSortDir(req.query.sort)  // guaranteed 'ASC' or 'DESC' ✅
  return prisma.$queryRaw`
    SELECT * FROM orders ORDER BY total ${Prisma.raw(sort)}
  `
}
```

---

## K — Coding Challenge + Solution

### Challenge

Write three raw SQL functions: (1) `getTopSpendersByMonth` using a window function (`RANK() OVER`) to rank customers by spend within each month; (2) `searchProducts` using PostgreSQL full-text search with `ts_rank` and a `tsvector` column; (3) `bulkUpdatePrices` using `$executeRaw` with a CTE to update prices from a list of `(sku, newPrice)` pairs. All must be injection-safe and return typed results.

### Solution

```typescript
import { prisma } from '@/lib/prisma'
import { Prisma } from '@prisma/client'

// ── (1) Top spenders by month — window function ────────────────────────────
interface TopSpenderRow {
  month:          string
  customer_id:    number
  customer_name:  string
  total_spend:    string
  rank_in_month:  number
}

async function getTopSpendersByMonth(topN: number = 3) {
  return prisma.$queryRaw<TopSpenderRow[]>`
    WITH monthly_spend AS (
      SELECT
        DATE_TRUNC('month', o.created_at)        AS month,
        o.customer_id,
        u.name                                   AS customer_name,
        SUM(o.total)                             AS total_spend,
        RANK() OVER (
          PARTITION BY DATE_TRUNC('month', o.created_at)
          ORDER BY SUM(o.total) DESC
        )                                        AS rank_in_month
      FROM orders o
      JOIN users u ON u.id = o.customer_id
      WHERE o.status = 'delivered'
        AND o.created_at >= NOW() - INTERVAL '6 months'
      GROUP BY DATE_TRUNC('month', o.created_at), o.customer_id, u.name
    )
    SELECT
      TO_CHAR(month, 'YYYY-MM') AS month,
      customer_id,
      customer_name,
      total_spend::TEXT,
      rank_in_month::INT
    FROM monthly_spend
    WHERE rank_in_month <= ${topN}
    ORDER BY month DESC, rank_in_month ASC
  `
}

// ── (2) Full-text product search ───────────────────────────────────────────
interface ProductSearchRow {
  id:    number
  name:  string
  sku:   string
  price: string
  rank:  number
}

async function searchProducts(
  searchTerm: string,
  limit: number = 20,
): Promise<ProductSearchRow[]> {
  if (!searchTerm.trim()) return []

  return prisma.$queryRaw<ProductSearchRow[]>`
    SELECT
      id,
      name,
      sku,
      price::TEXT,
      ts_rank(search_vector, plainto_tsquery('english', ${searchTerm})) AS rank
    FROM products
    WHERE search_vector @@ plainto_tsquery('english', ${searchTerm})
      AND is_active = true
    ORDER BY rank DESC, name ASC
    LIMIT ${limit}
  `
  // searchTerm is fully parameterized — SQL injection impossible ✅
}

// ── (3) Bulk price update via CTE ─────────────────────────────────────────
interface PriceUpdate { sku: string; newPrice: number }

async function bulkUpdatePrices(updates: PriceUpdate[]): Promise<number> {
  if (updates.length === 0) return 0

  // Build a VALUES list as a single Prisma.sql fragment
  const valuesList = updates.map(
    u => Prisma.sql`(${u.sku}, ${u.newPrice}::NUMERIC(12,2))`
  )
  const valuesClause = Prisma.join(valuesList, ', ')

  const affected = await prisma.$executeRaw`
    WITH price_updates (sku, new_price) AS (
      VALUES ${valuesClause}
    )
    UPDATE products
    SET
      price      = pu.new_price,
      updated_at = NOW()
    FROM price_updates pu
    WHERE products.sku = pu.sku
  `

  return affected  // number of rows updated
}

export { getTopSpendersByMonth, searchProducts, bulkUpdatePrices }
```

---

---
