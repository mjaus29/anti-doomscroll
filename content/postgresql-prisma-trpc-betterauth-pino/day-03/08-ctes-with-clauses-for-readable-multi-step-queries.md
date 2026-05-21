# 8 — CTEs — WITH Clauses for Readable Multi-Step Queries

---

## T — TL;DR

A **CTE** (Common Table Expression) is a named, temporary result set defined at the top of a query with `WITH name AS (SELECT ...)`. CTEs make complex multi-step queries readable by breaking them into named logical steps. Multiple CTEs can be chained. **Recursive CTEs** traverse hierarchical data (trees, graphs) in a single query.

---

## K — Key Concepts

```sql
-- ─── Basic CTE — one named step
WITH order_totals AS (
  SELECT
    customer_id,
    COUNT(*)   AS order_count,
    SUM(total) AS total_spent
  FROM orders
  WHERE status != 'cancelled'
  GROUP BY customer_id
)
SELECT
  c.name,
  ot.order_count,
  ot.total_spent
FROM customers AS c
JOIN order_totals AS ot ON ot.customer_id = c.id
ORDER BY ot.total_spent DESC;

-- CTE runs first, produces 'order_totals' result set
-- Main query JOINs customers to order_totals
```

```sql
-- ─── Multiple CTEs — chained with commas
WITH
active_customers AS (
  -- Step 1: customers with at least one non-cancelled order
  SELECT DISTINCT customer_id
  FROM orders
  WHERE status != 'cancelled'
),
customer_spend AS (
  -- Step 2: total spend per active customer
  SELECT
    o.customer_id,
    SUM(o.total) AS total_spent
  FROM orders AS o
  JOIN active_customers AS ac ON ac.customer_id = o.customer_id
  WHERE o.status = 'delivered'
  GROUP BY o.customer_id
),
ranked_customers AS (
  -- Step 3: join customer names and add a rank
  SELECT
    c.name,
    cs.total_spent,
    RANK() OVER (ORDER BY cs.total_spent DESC) AS spend_rank
  FROM customers AS c
  JOIN customer_spend AS cs ON cs.customer_id = c.id
)
-- Final query: top 3 spenders
SELECT name, total_spent, spend_rank
FROM ranked_customers
WHERE spend_rank <= 3
ORDER BY spend_rank;
```

```sql
-- ─── CTE vs Subquery — same result, different readability
-- Subquery version (harder to read for 3+ levels)
SELECT name FROM customers
WHERE id IN (
  SELECT customer_id FROM (
    SELECT customer_id, SUM(total) AS total
    FROM orders GROUP BY customer_id
  ) t WHERE total > 100
);

-- CTE version (readable steps)
WITH order_totals AS (
  SELECT customer_id, SUM(total) AS total
  FROM orders
  GROUP BY customer_id
),
high_spenders AS (
  SELECT customer_id FROM order_totals WHERE total > 100
)
SELECT name FROM customers
WHERE id IN (SELECT customer_id FROM high_spenders);
```

```sql
-- ─── Recursive CTE — traverse hierarchies
-- Standard form:
WITH RECURSIVE cte_name AS (
  -- 1. Anchor: starting point (non-recursive part)
  SELECT ...

  UNION ALL

  -- 2. Recursive step: references cte_name
  SELECT ...
  FROM cte_name
  JOIN base_table ON ...
)
SELECT * FROM cte_name;

-- Example: org chart — all reports under a manager
WITH RECURSIVE org_tree AS (
  -- Anchor: start at the CEO
  SELECT id, name, manager_id, 0 AS depth, name::TEXT AS path
  FROM employees
  WHERE manager_id IS NULL

  UNION ALL

  -- Recursive: add direct reports of each node
  SELECT e.id, e.name, e.manager_id,
         ot.depth + 1,
         ot.path || ' → ' || e.name
  FROM employees AS e
  JOIN org_tree AS ot ON ot.id = e.manager_id
)
SELECT
  REPEAT('  ', depth) || name AS org_chart,
  depth,
  path
FROM org_tree
ORDER BY path;

-- org_chart              | depth | path
-- -----------------------+-------+-------------------------------
-- Alice CEO              |     0 | Alice CEO
--   Bob VP               |     1 | Alice CEO → Bob VP
--     Carol Manager      |     2 | Alice CEO → Bob VP → Carol Manager
--       Dave Dev         |     3 | Alice CEO → Bob VP → Carol Manager → Dave Dev
--       Eve Dev          |     3 | Alice CEO → Bob VP → Carol Manager → Eve Dev
```

```sql
-- ─── CTE with INSERT/UPDATE/DELETE — data modification CTEs
-- Insert an order and return its id to immediately insert order items
WITH new_order AS (
  INSERT INTO orders (customer_id, status, total)
  VALUES (1, 'pending', 89.98)
  RETURNING id
)
INSERT INTO order_items (order_id, product_id, quantity, unit_price)
SELECT new_order.id, 2, 2, 44.99
FROM new_order;
-- Atomic: order + item inserted in one statement ✅
```

---

## W — Why It Matters

- CTEs transform unreadable nested subquery pyramids into sequential, named steps — each CTE is a "paragraph" of logic. Code reviewers can understand the intent of each step independently. This is not just style — it's maintainability.
- Recursive CTEs are the only standard SQL way to traverse trees and graphs without application-side recursion — organization charts, threaded comments, category trees, bill of materials. Without recursive CTEs you'd need multiple queries and application-level recursion.
- Data-modification CTEs (`WITH new_order AS (INSERT ... RETURNING ...)`) are the clean pattern for "insert parent, get id, insert child" in one atomic statement — eliminating race conditions that exist when doing it in two round trips.

---

## I — Interview Q&A

### Q: What is the difference between a CTE and a subquery, and when would you prefer a CTE?

**A:** Both define a temporary result set used by the main query. The difference is syntax, readability, and reusability. A CTE is defined at the top with `WITH name AS (...)` and can be referenced multiple times by name in the main query. A subquery is inline — nested inside the main query and can only be used once in that position. Prefer CTEs when: the logic has multiple steps (each CTE is a logical unit), the intermediate result needs to be referenced more than once (subquery would need duplication), or when writing recursive queries (only CTEs support `WITH RECURSIVE`). Subqueries are fine for simple, single-use inline logic.

---

## C — Common Pitfalls + Fix

### ❌ Assuming CTEs are always materialised (cached) — PostgreSQL 12+ changed this

```sql
-- In PostgreSQL 12+, the planner may inline CTEs (treat them as subqueries)
-- for optimisation. They are NOT automatically cached/materialised.
-- If you need to force materialisation (e.g. to prevent re-evaluation):
WITH MATERIALIZED expensive_cte AS (
  SELECT ... expensive query ...
)
SELECT * FROM expensive_cte
JOIN expensive_cte e2 ON e2.id = expensive_cte.parent_id;
-- MATERIALIZED forces the CTE to run once and cache the result
```

**Fix for re-use:**

```sql
-- ✅ Force materialisation when the CTE is referenced multiple times
WITH MATERIALIZED order_summary AS (
  SELECT customer_id, COUNT(*) AS cnt, SUM(total) AS total
  FROM orders GROUP BY customer_id
)
SELECT * FROM order_summary WHERE cnt > 1
UNION ALL
SELECT * FROM order_summary WHERE total > 200;
```

---

## K — Coding Challenge + Solution

### Challenge

Using CTEs, write a three-step query: (1) `monthly_revenue` CTE — sum revenue by month for delivered orders; (2) `avg_monthly` CTE — compute the average monthly revenue from the first CTE; (3) final query — show each month, its revenue, and whether it was `above_avg`, `average`, or `below_avg`.

### Solution

```sql
WITH
monthly_revenue AS (
  -- Step 1: revenue per calendar month
  SELECT
    DATE_TRUNC('month', ordered_at)  AS month,
    ROUND(SUM(total), 2)             AS revenue
  FROM orders
  WHERE status = 'delivered'
  GROUP BY DATE_TRUNC('month', ordered_at)
),
avg_monthly AS (
  -- Step 2: average monthly revenue
  SELECT ROUND(AVG(revenue), 2) AS avg_rev
  FROM monthly_revenue
)
-- Step 3: classify each month
SELECT
  TO_CHAR(mr.month, 'YYYY-MM')       AS month,
  mr.revenue,
  am.avg_rev                          AS avg_monthly_revenue,
  CASE
    WHEN mr.revenue > am.avg_rev * 1.05  THEN 'above_avg'
    WHEN mr.revenue < am.avg_rev * 0.95  THEN 'below_avg'
    ELSE                                      'average'
  END                                 AS classification
FROM monthly_revenue AS mr
CROSS JOIN avg_monthly AS am       -- one avg row × all month rows
ORDER BY mr.month;
```

---

---
