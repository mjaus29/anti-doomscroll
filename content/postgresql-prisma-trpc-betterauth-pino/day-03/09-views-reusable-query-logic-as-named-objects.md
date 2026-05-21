# 9 — Views — Reusable Query Logic as Named Objects

---

## T — TL;DR

A **view** is a named, stored query that behaves like a table — you can `SELECT` from it, join it, and filter it. Views encapsulate complex logic (joins, aggregates, filters) behind a simple name. **Materialized views** store the result physically for fast reads — useful for expensive reporting queries. Views don't store data (except materialized views); they execute the underlying query on every access.

---

## K — Key Concepts

```sql
-- ─── CREATE VIEW — regular (non-materialized)
CREATE VIEW customer_order_summary AS
SELECT
  c.id              AS customer_id,
  c.name,
  c.email,
  c.city,
  COUNT(o.id)                   AS order_count,
  COALESCE(SUM(o.total), 0)     AS total_spent,
  MAX(o.ordered_at)             AS last_order_at
FROM customers AS c
LEFT JOIN orders AS o ON o.customer_id = c.id
GROUP BY c.id, c.name, c.email, c.city;

-- Use the view like a table
SELECT * FROM customer_order_summary;
SELECT * FROM customer_order_summary WHERE city = 'Manila';
SELECT * FROM customer_order_summary WHERE order_count > 1 ORDER BY total_spent DESC;

-- View with JOIN to another view or table
SELECT
  cos.name,
  cos.total_spent,
  p.name AS last_product
FROM customer_order_summary AS cos
JOIN orders AS o ON o.customer_id = cos.customer_id
JOIN order_items AS oi ON oi.order_id = o.id
JOIN products AS p ON p.id = oi.product_id
WHERE o.ordered_at = cos.last_order_at;
```

```sql
-- ─── Managing views
-- List views
SELECT table_name FROM information_schema.views
WHERE table_schema = 'public';

-- Inspect view definition
SELECT pg_get_viewdef('customer_order_summary', true);
-- or in psql:
\d+ customer_order_summary

-- Modify (replace) a view — column list must match or be a superset
CREATE OR REPLACE VIEW customer_order_summary AS
SELECT
  c.id, c.name, c.email, c.city,
  COUNT(o.id)               AS order_count,
  COALESCE(SUM(o.total), 0) AS total_spent,
  MAX(o.ordered_at)         AS last_order_at,
  COUNT(DISTINCT o.status)  AS status_count  -- new column added
FROM customers AS c
LEFT JOIN orders AS o ON o.customer_id = c.id
GROUP BY c.id, c.name, c.email, c.city;

-- Drop view
DROP VIEW customer_order_summary;
DROP VIEW IF EXISTS customer_order_summary;
DROP VIEW customer_order_summary CASCADE;  -- also drops dependent views
```

```sql
-- ─── Materialized view — stores the result physically
CREATE MATERIALIZED VIEW monthly_revenue_summary AS
SELECT
  DATE_TRUNC('month', ordered_at) AS month,
  status,
  COUNT(*)                        AS order_count,
  ROUND(SUM(total), 2)            AS revenue
FROM orders
GROUP BY DATE_TRUNC('month', ordered_at), status
ORDER BY month DESC, status;

-- Index the materialized view for fast lookups
CREATE INDEX ON monthly_revenue_summary (month);

-- Query it like a table (reads cached result — very fast)
SELECT * FROM monthly_revenue_summary WHERE status = 'delivered';

-- Refresh when underlying data changes
REFRESH MATERIALIZED VIEW monthly_revenue_summary;

-- Refresh without locking reads (allow queries while refreshing)
REFRESH MATERIALIZED VIEW CONCURRENTLY monthly_revenue_summary;
-- Requires a unique index on the materialized view for CONCURRENTLY

-- Drop
DROP MATERIALIZED VIEW monthly_revenue_summary;
```

```sql
-- ─── View use cases

-- 1. Hide complexity — join-heavy queries behind a simple name
CREATE VIEW active_orders AS
SELECT o.*, c.name AS customer_name, c.email
FROM orders o
JOIN customers c ON c.id = o.customer_id
WHERE o.status NOT IN ('cancelled', 'delivered');

-- 2. Soft delete filter — always query through the view
CREATE VIEW active_users AS
SELECT * FROM users WHERE deleted_at IS NULL;

-- 3. Row-level security shorthand — scope data per application role
CREATE VIEW my_orders AS
SELECT * FROM orders
WHERE customer_id = current_setting('app.current_user_id')::INT;

-- 4. Denormalized read model — pre-joined data for API responses
CREATE VIEW product_catalogue AS
SELECT
  p.id, p.name, p.price, p.category,
  COALESCE(SUM(oi.quantity), 0) AS total_sold,
  ROUND(AVG(r.rating), 2)       AS avg_rating
FROM products p
LEFT JOIN order_items oi ON oi.product_id = p.id
LEFT JOIN reviews     r  ON r.product_id  = p.id
GROUP BY p.id, p.name, p.price, p.category;
```

```sql
-- ─── Regular view vs Materialized view — when to use each

-- Regular view:
-- ✅ Always reflects latest data (queries underlying tables each time)
-- ✅ No storage cost — just a stored query
-- ❌ Slow for expensive aggregations run on every access
-- Use when: data freshness is critical, query is fast, or view is rarely queried

-- Materialized view:
-- ✅ Very fast reads — pre-computed result
-- ✅ Can be indexed
-- ❌ Stale until refreshed — data can be out of date
-- ❌ Requires REFRESH to update (manual or scheduled)
-- Use when: expensive aggregation, dashboard/reporting, data changes infrequently
-- Refresh strategy: on schedule (pg_cron), after major writes (trigger), or on-demand
```

---

## W — Why It Matters

- Views are the SQL equivalent of a function — they encapsulate reusable logic, give it a name, and allow consumers to use it without knowing the implementation. When the underlying schema changes, update the view in one place, not in every query that uses that logic.
- Materialized views are the simplest query performance optimisation for expensive reporting — instead of running a 10-second aggregate query on every dashboard load, refresh it once per hour and serve from a pre-computed table in milliseconds.
- The soft-delete view pattern (`CREATE VIEW active_users AS SELECT * FROM users WHERE deleted_at IS NULL`) is the cleanest enforcement of application-level row filtering — application code queries `active_users`, and the filter is applied centrally without trusting every query to remember the `WHERE`.

---

## I — Interview Q&A

### Q: What is the difference between a regular view and a materialized view?

**A:** A regular view stores only the query definition — every time you query a view, PostgreSQL re-executes the underlying SQL. The data is always current but the query cost is incurred every time. A materialized view stores the actual result set on disk — queries read the cached data and are very fast, but the data is only as fresh as the last `REFRESH MATERIALIZED VIEW`. Use regular views for frequently-changing data where freshness matters. Use materialized views for expensive aggregate queries where slight staleness is acceptable — dashboards, reporting, analytics summaries. Materialized views can have indexes, further accelerating specific lookup patterns.

### Q: Can you `INSERT` or `UPDATE` through a view?

**A:** Simple views — those that map directly to a single table without aggregates, `DISTINCT`, `GROUP BY`, subqueries, or window functions — are updatable in PostgreSQL. You can `INSERT`, `UPDATE`, and `DELETE` through them. Complex views (with joins, aggregates, etc.) are not directly updatable, but you can add `INSTEAD OF` triggers to implement custom write behaviour. In practice, views are primarily used for reads; writes go directly to the underlying tables in most application architectures.

---

## C — Common Pitfalls + Fix

### ❌ Querying a complex view in a tight loop — unintended N×1 cost

```ts
// ❌ The view re-executes its expensive JOIN + aggregate query once per user
for (const userId of userIds) {
  const row = await db.query('SELECT * FROM customer_order_summary WHERE customer_id = $1', [userId])
}
// For 1000 users: 1000 full aggregate queries ❌
```

**Fix:** Query the view once for all users with `IN`:

```ts
// ✅ One query, all users
const rows = await db.query(
  'SELECT * FROM customer_order_summary WHERE customer_id = ANY($1)',
  [userIds]
)
```

### ❌ Forgetting to refresh a materialized view — stale dashboard data

```sql
-- ❌ Orders added after last REFRESH are missing from materialized view
SELECT * FROM monthly_revenue_summary;
-- Shows data from last week — orders from today not included ❌
```

**Fix:** Set up a scheduled refresh or refresh after major writes:

```sql
-- ✅ Refresh after batch import
INSERT INTO orders ... ;
REFRESH MATERIALIZED VIEW CONCURRENTLY monthly_revenue_summary;

-- ✅ Or schedule with pg_cron (PostgreSQL extension)
SELECT cron.schedule('refresh-revenue', '0 * * * *',
  'REFRESH MATERIALIZED VIEW CONCURRENTLY monthly_revenue_summary');
```

---

## K — Coding Challenge + Solution

### Challenge

Create two views: (1) `product_sales_summary` — a regular view joining products → order_items → orders that shows each product's name, category, total units sold, total revenue, and number of distinct orders; (2) `top_categories` — a view built on top of `product_sales_summary` that groups by category showing total revenue and average revenue per product. Query `top_categories` filtering to categories with more than one product.

### Solution

```sql
-- (1) Regular view: product sales summary
CREATE VIEW product_sales_summary AS
SELECT
  p.id                                    AS product_id,
  p.name                                  AS product_name,
  p.category,
  p.price                                 AS list_price,
  COALESCE(SUM(oi.quantity), 0)           AS total_units_sold,
  COALESCE(ROUND(SUM(oi.quantity * oi.unit_price), 2), 0) AS total_revenue,
  COUNT(DISTINCT oi.order_id)             AS distinct_orders
FROM products AS p
LEFT JOIN order_items AS oi ON oi.product_id = p.id
LEFT JOIN orders      AS o  ON o.id          = oi.order_id
                            AND o.status     != 'cancelled'
GROUP BY p.id, p.name, p.category, p.price;

-- Verify
SELECT * FROM product_sales_summary ORDER BY total_revenue DESC;

-- (2) View on top of a view: top categories
CREATE VIEW top_categories AS
SELECT
  category,
  COUNT(*)                              AS product_count,
  SUM(total_units_sold)                 AS total_units_sold,
  ROUND(SUM(total_revenue), 2)          AS category_revenue,
  ROUND(AVG(total_revenue), 2)          AS avg_revenue_per_product
FROM product_sales_summary
GROUP BY category;

-- Query with HAVING equivalent via WHERE (view is already aggregated)
SELECT *
FROM top_categories
WHERE product_count > 1
ORDER BY category_revenue DESC;

-- category    | product_count | total_units_sold | category_revenue | avg_revenue_per_product
-- ------------+---------------+------------------+------------------+------------------------
-- Electronics |             3 |                4 |           279.96 |                   93.32
```

---

## ✅ Day 3 Complete — PostgreSQL Multi-Table Querying

| # | Subtopic | Status |
|---|----------|--------|
| 1 | INNER JOIN | ☐ |
| 2 | LEFT, RIGHT, and FULL JOIN | ☐ |
| 3 | Join Conditions — ON, USING, Self-Join | ☐ |
| 4 | Aggregate Functions | ☐ |
| 5 | GROUP BY | ☐ |
| 6 | HAVING | ☐ |
| 7 | Subqueries | ☐ |
| 8 | CTEs — WITH Clauses | ☐ |
| 9 | Views | ☐ |

---

## 🗺️ One-Page Mental Model — Day 3

```
JOIN TYPES
  INNER JOIN          → intersection only (rows that match on BOTH sides)
  LEFT  JOIN          → all left + matched right (NULL when no right match)
  RIGHT JOIN          → all right + matched left (rewrite as LEFT JOIN)
  FULL  JOIN          → all left + all right (NULL on unmatched side)
  CROSS JOIN          → cartesian product (every row × every row)

  Anti-join:          LEFT JOIN ... WHERE right.id IS NULL
  On-clause filter:   ON a.id = b.a_id AND b.status = 'x'  ← filter inside join
  Where-clause:       moves filter AFTER join (can break LEFT JOIN behaviour)

JOIN CONDITIONS
  ON a.fk = b.pk              standard equi-join
  USING (column)              shorthand when column names match
  ON condition WITH AND       multi-condition (can include ranges)
  Self-join:  FROM t AS a JOIN t AS b ON a.id < b.id  (same table, different aliases)
  Always qualify columns: t.column — never bare column names in joins
  Always index FK columns — PostgreSQL does NOT do this automatically

AGGREGATES
  COUNT(*)                    all rows (including NULLs)
  COUNT(col)                  non-NULL values only
  COUNT(DISTINCT col)         unique non-NULL values
  SUM / AVG / MIN / MAX       ignore NULLs
  COALESCE(SUM(col), 0)       treat NULL aggregate as 0
  FILTER (WHERE cond)         conditional aggregate — no CASE needed
  STRING_AGG(col, ', ')       concatenate values within group
  ARRAY_AGG(col)              aggregate into array
  PERCENTILE_CONT(0.5)        median (not AVG for skewed data)

SQL EXECUTION ORDER (review)
  1 FROM + JOINs    → build the row set
  2 WHERE           → filter individual rows (no aggregates here)
  3 GROUP BY        → form groups
  4 HAVING          → filter groups (aggregates allowed here)
  5 SELECT          → compute output columns + aliases
  7 ORDER BY        → sort (alias usable here)
  8 LIMIT/OFFSET    → paginate

GROUP BY RULES
  Every SELECT column must be in GROUP BY or aggregated
  Exception: PostgreSQL allows non-key columns if PK is in GROUP BY
  GROUP BY expression = repeat expression (not alias) for portability
  ROLLUP(a, b) = per-combination + per-a subtotal + grand total
  COALESCE(SUM(col), 0) after LEFT JOIN to get 0 not NULL

HAVING vs WHERE
  WHERE:   filter rows (pre-GROUP BY) — no aggregates
  HAVING:  filter groups (post-GROUP BY) — aggregates allowed
  Use both: WHERE pre-filters (faster), HAVING post-filters groups

SUBQUERIES
  Scalar:     (SELECT single_value)  — in SELECT or WHERE
  List:       WHERE col IN (SELECT col FROM ...)
  NOT IN:     ⚠️ NULL-unsafe — prefer NOT EXISTS
  EXISTS:     WHERE EXISTS (SELECT 1 FROM ... WHERE correlated_cond)
  NOT EXISTS: NULL-safe alternative to NOT IN
  Correlated: references outer row — runs once per outer row (slow on big tables)
  Derived:    FROM (SELECT ...) AS alias — must always be aliased

CTEs (WITH)
  WITH name AS (SELECT ...)          single CTE
  WITH a AS (...), b AS (...)        chained CTEs (b can reference a)
  WITH RECURSIVE cte AS (
    anchor_select UNION ALL recursive_select
  )                                  tree / graph traversal
  WITH MATERIALIZED name AS (...)    force caching (PG12+: CTEs may be inlined)
  WITH new AS (INSERT ... RETURNING id)  data modification CTE → chain writes

VIEWS
  Regular view:       stored query, always fresh, no storage cost
  Materialized view:  stored result, fast reads, requires REFRESH
  CREATE VIEW v AS SELECT ...
  CREATE OR REPLACE VIEW v AS SELECT ...
  CREATE MATERIALIZED VIEW mv AS SELECT ...
  REFRESH MATERIALIZED VIEW mv;
  REFRESH MATERIALIZED VIEW CONCURRENTLY mv;  -- needs unique index, no read lock

  Use for:
  - Hide JOIN complexity behind a simple name
  - Soft-delete filter (WHERE deleted_at IS NULL)
  - Pre-joined API response shape
  - Expensive aggregate reports (materialized)
  - Row-level data scoping

COMMON ANTI-PATTERNS
  SELECT * in joins                → column ambiguity, fragile
  NOT IN with nullable subquery    → use NOT EXISTS
  WHERE on right table in LEFT JOIN → use ON instead (or converts to INNER)
  p1.id != p2.id in self-join      → use p1.id < p2.id (avoid duplicate pairs)
  Correlated subquery in SELECT over large table → rewrite as LEFT JOIN + GROUP BY
  Forgetting COALESCE(SUM(...), 0) after LEFT JOIN → NULL total for no-match rows
```

> **Your next action:** Open psql and run this query against any database with at least two related tables:
>
> ```sql
> SELECT left_table.*, COUNT(right_table.id) AS related_count
> FROM left_table
> LEFT JOIN right_table ON right_table.fk = left_table.id
> GROUP BY left_table.id
> ORDER BY related_count DESC
> LIMIT 10;
> ```
>
> Replace `left_table`, `right_table`, and `fk` with real names from your schema
