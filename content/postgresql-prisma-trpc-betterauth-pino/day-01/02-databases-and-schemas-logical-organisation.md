# 2 — Databases and Schemas — Logical Organisation

---

## T — TL;DR

PostgreSQL organises data in a hierarchy: **server** → **database** → **schema** → **table**. A database is an isolated container. A schema is a namespace inside a database — like a folder for tables. The default schema is `public`. Use separate schemas to organise large projects or isolate tenants.

---

## K — Key Concepts

```
PostgreSQL Object Hierarchy:

  PostgreSQL Server (one running process)
  └── Cluster (one data directory)
      ├── Database: postgres        (default admin DB)
      ├── Database: template1       (template for new DBs)
      ├── Database: myapp
      │   ├── Schema: public        (default — all tables go here)
      │   │   ├── Table: users
      │   │   ├── Table: posts
      │   │   └── Table: comments
      │   ├── Schema: analytics
      │   │   └── Table: events
      │   └── Schema: audit
      │       └── Table: log_entries
      └── Database: myapp_test
          └── Schema: public
              ├── Table: users
              └── Table: posts
```

```sql
-- ─── Database operations
CREATE DATABASE myapp;
CREATE DATABASE myapp_test;

-- List databases
\l
-- or
SELECT datname FROM pg_database;

-- Connect to a database
\c myapp

-- Drop (must be connected elsewhere first)
DROP DATABASE myapp_test;
```

```sql
-- ─── Schema operations
-- Connect to myapp first: \c myapp

-- Create schemas
CREATE SCHEMA analytics;
CREATE SCHEMA audit;

-- List schemas
\dn
-- or
SELECT schema_name FROM information_schema.schemata;

-- Create a table in a specific schema
CREATE TABLE analytics.events (
  id         SERIAL PRIMARY KEY,
  event_name TEXT NOT NULL
);

-- Create a table in public (default — no prefix needed)
CREATE TABLE users (
  id   SERIAL PRIMARY KEY,
  name TEXT
);

-- Fully qualified table reference: schema.table
SELECT * FROM analytics.events;
SELECT * FROM public.users;
SELECT * FROM users;  -- same as public.users when public is in search_path
```

```sql
-- ─── search_path — controls which schemas are searched automatically
SHOW search_path;
-- "$user", public
-- PostgreSQL looks in schema matching your username first, then public

-- Set search path for session
SET search_path TO analytics, public;
-- Now: SELECT * FROM events; → searches analytics.events first

-- Set permanently for a user
ALTER ROLE dev SET search_path TO myapp_schema, public;

-- Set for a database
ALTER DATABASE myapp SET search_path TO myapp_schema, public;
```

```sql
-- ─── When to use multiple schemas
-- 1. Multi-tenant: one schema per tenant
CREATE SCHEMA tenant_acme;
CREATE SCHEMA tenant_globex;

-- 2. Feature isolation in a monolith
CREATE SCHEMA billing;     -- billing.invoices, billing.payments
CREATE SCHEMA inventory;   -- inventory.products, inventory.stock

-- 3. Auditing and versioning
CREATE SCHEMA audit;       -- audit.log, audit.snapshots

-- Key rule: most apps just use public — don't over-engineer schemas early
```

---

## W — Why It Matters

- The database isolation guarantee means a bug in one database cannot corrupt data in another — they share no tables, sequences, or indexes. Use separate databases for separate applications; use separate schemas for organisational grouping within one application.
- `search_path` explains "why does `SELECT * FROM users` work without `public.users`?" — the default search path includes `public`, so unqualified table names resolve there. Changing `search_path` is how multi-tenant row-level schemas work.
- Most production applications use a single database with a single schema (`public`) — understanding schemas prevents over-engineering. Add schemas when you have a concrete need: multi-tenancy, compliance isolation, or very large team codebases.

---

## I — Interview Q&A

### Q: What is the difference between a PostgreSQL database and a schema?

**A:** A database is a complete isolation boundary — you cannot join tables across databases in a single query. Each database has its own set of schemas, tables, and users. A schema is a namespace within a database — tables in different schemas of the same database can be joined freely. Think of a database as a separate building and a schema as a floor within that building. Use separate databases when you have completely independent applications. Use separate schemas when you want logical organisation but need cross-schema queries.

### Q: What is `public` schema and why is it the default?

**A:** `public` is a schema created automatically in every new database. The default `search_path` includes `public`, so any table created without an explicit schema prefix lands in `public`, and any query without a schema prefix resolves to `public` first. For simple projects and tutorials, everything lives in `public`. In production applications, some teams create app-specific schemas and remove public from search_path for security — preventing accidental object creation in public.

---

## C — Common Pitfalls + Fix

### ❌ Creating tables in the wrong database — queries return nothing

```sql
-- ❌ Connected to 'postgres' default database
-- Creating tables here, then connecting to 'myapp' and wondering why tables don't exist
\c postgres
CREATE TABLE users (id SERIAL, name TEXT);
\c myapp
SELECT * FROM users;  -- ERROR: relation "users" does not exist ❌
```

**Fix:** Always confirm your current database before DDL:

```sql
-- ✅ Check before creating
SELECT current_database();  -- confirm you're in the right database
\c myapp                    -- switch if needed
CREATE TABLE users (id SERIAL, name TEXT);
```

---

## K — Coding Challenge + Solution

### Challenge

Create a database called `shopdb`. Inside it, create two schemas: `catalog` and `orders`. Create one table in each schema (`catalog.products`, `orders.purchases`). List all tables using `\dt *.*`. Verify the `search_path` default.

### Solution

```sql
-- As superuser or admin
CREATE DATABASE shopdb;
\c shopdb

-- Create schemas
CREATE SCHEMA catalog;
CREATE SCHEMA orders;

-- Create tables in specific schemas
CREATE TABLE catalog.products (
  id   SERIAL PRIMARY KEY,
  name TEXT NOT NULL
);

CREATE TABLE orders.purchases (
  id         SERIAL PRIMARY KEY,
  product_id INT,
  quantity   INT
);

-- List all tables across all schemas
\dt *.*
--   Schema  |   Name    | Type  | Owner
-- ----------+-----------+-------+-------
--  catalog  | products  | table | dev
--  orders   | purchases | table | dev

-- Check default search_path
SHOW search_path;
-- "$user", public

-- Access without prefix requires search_path
SET search_path TO catalog, orders, public;
SELECT * FROM products;   -- now resolves to catalog.products
```

---

---
