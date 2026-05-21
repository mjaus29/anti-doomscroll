
# 📅 Day 1 — PostgreSQL Foundation

> **Goal:** Install PostgreSQL, connect via `psql`, understand the structural hierarchy (server → database → schema → table → row), write your first SQL queries, filter, sort, and alias — the complete foundation for every query you will ever write.
> **Format:** Each subtopic = 5–15 min. Do one. Stop. Come back.
> **Stack:** PostgreSQL 18 · psql CLI · standard SQL

---

## 📋 Day 1 Subtopic Overview

| # | Subtopic | Time |
|---|----------|------|
| 1 | Install and Connect — PostgreSQL Setup | 12 min |
| 2 | Databases and Schemas — Logical Organisation | 10 min |
| 3 | Tables — Structure and Data Types | 12 min |
| 4 | Rows — INSERT, UPDATE, DELETE | 10 min |
| 5 | SQL Workflow — Execution Order Mental Model | 8 min |
| 6 | Basic SELECT — Columns, Expressions, Literals | 10 min |
| 7 | Filtering with WHERE — Conditions and Operators | 12 min |
| 8 | Sorting with ORDER BY | 8 min |
| 9 | Aliases — AS for Columns and Tables | 8 min |

---

---

# 1 — Install and Connect — PostgreSQL Setup

---

## T — TL;DR

PostgreSQL runs as a background server process. You connect to it with a client — `psql` is the built-in CLI client. Install the server, start it, then connect with `psql`. Every interaction with PostgreSQL goes through a connection.

---

## K — Key Concepts

```bash
# ─── Install (choose your OS)

# macOS — Homebrew
brew install postgresql@18
brew services start postgresql@18

# Ubuntu / Debian
sudo apt update && sudo apt install postgresql postgresql-contrib
sudo systemctl start postgresql
sudo systemctl enable postgresql

# Windows
# Download installer from https://www.postgresql.org/download/windows/
# Or use WSL2 with Ubuntu method above

# Docker (fastest for dev — no install conflicts)
docker run --name pgdev \
  -e POSTGRES_PASSWORD=secret \
  -e POSTGRES_USER=dev \
  -e POSTGRES_DB=devdb \
  -p 5432:5432 \
  -d postgres:18
```

```bash
# ─── psql — the CLI client
# Connect to local server (default socket)
psql -U postgres

# Connect with all options explicit
psql -h localhost -p 5432 -U postgres -d postgres

# Connect to Docker container
psql -h localhost -p 5432 -U dev -d devdb
# Password prompt: secret

# Connection string format
psql "postgresql://dev:secret@localhost:5432/devdb"
```

```sql
-- ─── Inside psql — meta-commands (start with \)
\l              -- list all databases
\c dbname       -- connect to a database
\dt             -- list tables in current schema
\dt *.*         -- list all tables in all schemas
\d tablename    -- describe table (columns, types, constraints)
\du             -- list users/roles
\dn             -- list schemas
\i file.sql     -- execute a SQL file
\e              -- open query in editor
\q              -- quit psql
\?              -- help for meta-commands
\h SELECT       -- help for SQL command

-- Check connection info
SELECT current_database(), current_user, version();
```

```bash
# ─── psql prompt anatomy
postgres=#          -- connected as superuser to 'postgres' database
devdb=#             -- connected to 'devdb' database
devdb=*#            -- inside a multi-line or open transaction
postgres-#          -- continuation prompt (query not yet complete)

# ─── Run a single query without entering psql
psql -U dev -d devdb -c "SELECT version();"

# ─── Run a SQL file
psql -U dev -d devdb -f setup.sql
```

```bash
# ─── pg_hba.conf — authentication (if connection is refused)
# Location: /etc/postgresql/18/main/pg_hba.conf (Linux)
#           /usr/local/var/postgresql@18/ (macOS Homebrew)
# For local dev, change 'peer' or 'scram-sha-256' to 'trust' or 'md5'
# After editing: sudo systemctl reload postgresql

# ─── Common connection environment variables
export PGHOST=localhost
export PGPORT=5432
export PGUSER=dev
export PGPASSWORD=secret
export PGDATABASE=devdb
# Then just: psql (no args needed)
```

---

## W — Why It Matters

- `psql` is the universal PostgreSQL CLI — knowing it means you can connect to any PostgreSQL server anywhere (local, Docker, cloud) without a GUI. Every DBA, every cloud provider's shell access, every CI pipeline uses it.
- The server/client separation is fundamental — your Next.js app, your migrations, your admin tools, and `psql` are all separate clients connecting to the same server. Understanding this prevents "why does my app see different data than pgAdmin?" confusion.
- Docker for local dev eliminates version conflicts and `pg_hba.conf` authentication headaches — a one-command, disposable, reproducible PostgreSQL server.

---

## I — Interview Q&A

### Q: How does `psql` connect to PostgreSQL and what does each connection parameter mean?

**A:** `psql` is a client application that opens a TCP or Unix socket connection to the PostgreSQL server process. The parameters: `-h` is the host (defaults to Unix socket for local connections, `localhost` for TCP), `-p` is the port (default 5432), `-U` is the PostgreSQL role/user to authenticate as, and `-d` is the database to connect to (defaults to the username). Authentication method is controlled by `pg_hba.conf` on the server — it maps (host, database, user) combinations to authentication methods like `trust`, `md5`, or `scram-sha-256`. The connection uses the PostgreSQL wire protocol over TCP/IP or a local Unix domain socket.

### Q: What is the difference between the PostgreSQL server process and `psql`?

**A:** The PostgreSQL server (`postgres` process) is a daemon that manages data files, handles concurrent connections, and executes SQL. `psql` is a client — it connects to the server, sends SQL text over the connection, receives results, and displays them. The server can accept many simultaneous clients. `psql` is just one of them, no different from a Node.js app using `pg`, a Java app using JDBC, or a Python app using `psycopg2`. The server doesn't care what client connects — only the wire protocol and authentication matter.

---

## C — Common Pitfalls + Fix

### ❌ Connecting as `postgres` (superuser) for all development work

```bash
# ❌ Superuser can do anything — mistakes are irreversible
psql -U postgres -d myapp
DROP TABLE users;  -- no confirmation, no protection
```

**Fix:** Create a dedicated dev user with limited permissions:

```sql
-- ✅ Create a limited dev role
CREATE ROLE dev WITH LOGIN PASSWORD 'secret';
GRANT CONNECT ON DATABASE myapp TO dev;
GRANT USAGE ON SCHEMA public TO dev;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO dev;
-- Now use: psql -U dev -d myapp
```

### ❌ `psql: error: connection to server on socket failed`

```bash
# ❌ Server not running or wrong socket path
psql -U postgres
# psql: error: connection to server on socket "/var/run/postgresql/.s.PGSQL.5432" failed
```

**Fix:**

```bash
# Check if server is running
sudo systemctl status postgresql
# or
pg_lsclusters  # Debian/Ubuntu

# Start if stopped
sudo systemctl start postgresql

# For Homebrew (macOS)
brew services start postgresql@18
```

---

## K — Coding Challenge + Solution

### Challenge

Connect to a local PostgreSQL server, create a new database called `learningdb`, connect to it, and confirm the connection by running a query that shows the current database name, current user, and PostgreSQL version (all in one row).

### Solution

```bash
# Step 1: Connect to default postgres database
psql -U postgres
```

```sql
-- Step 2: Create the learning database
CREATE DATABASE learningdb;

-- Step 3: Connect to it
\c learningdb

-- Step 4: Confirm connection details
SELECT
  current_database() AS database,
  current_user       AS user,
  version()          AS pg_version;

--  database   |  user    | pg_version
-- ------------+----------+----------------------------------
--  learningdb | postgres | PostgreSQL 18.x on ...
```

---

---

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

# 3 — Tables — Structure and Data Types

---

## T — TL;DR

A table is a named grid of rows and columns. Each column has a data type that constrains what it can store. PostgreSQL has rich built-in types — choose the most precise type for each column. Constraints (NOT NULL, UNIQUE, PRIMARY KEY) enforce integrity at the database level.

---

## K — Key Concepts

```sql
-- ─── CREATE TABLE syntax
CREATE TABLE users (
  id         SERIAL        PRIMARY KEY,    -- auto-incrementing integer PK
  email      TEXT          NOT NULL UNIQUE,
  username   VARCHAR(50)   NOT NULL,
  age        INTEGER,                       -- nullable by default
  score      NUMERIC(10,2) DEFAULT 0.00,
  is_active  BOOLEAN       NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ   NOT NULL DEFAULT now()
);
```

```sql
-- ─── Core data types

-- Integers
SMALLINT             -- -32,768 to 32,767         (2 bytes)
INTEGER  / INT       -- -2.1B to 2.1B             (4 bytes)
BIGINT               -- very large whole numbers   (8 bytes)
SERIAL               -- auto-increment INTEGER     (shorthand)
BIGSERIAL            -- auto-increment BIGINT

-- Text
TEXT                 -- unlimited length string    (preferred in PostgreSQL)
VARCHAR(n)           -- max n characters
CHAR(n)              -- fixed n characters (pads with spaces)

-- Exact numbers
NUMERIC(precision, scale)  -- e.g. NUMERIC(10,2) = 99999999.99
DECIMAL                    -- alias for NUMERIC

-- Floating point (approximate — avoid for money)
REAL                 -- 4-byte float
DOUBLE PRECISION     -- 8-byte float

-- Boolean
BOOLEAN              -- true / false / null
-- accepts: true, 'true', 't', '1', 'yes', 'on'
--          false, 'false', 'f', '0', 'no', 'off'

-- Date and time
DATE                 -- 2025-06-15  (no time)
TIME                 -- 14:30:00    (no date, no timezone)
TIMESTAMP            -- 2025-06-15 14:30:00 (no timezone)
TIMESTAMPTZ          -- 2025-06-15 14:30:00+08 (WITH timezone) ← prefer this
INTERVAL             -- '3 days 2 hours'

-- JSON
JSON                 -- stores JSON as text (validates structure)
JSONB                -- stores JSON as binary (indexable, faster queries) ← prefer this

-- Arrays
INTEGER[]            -- array of integers
TEXT[]               -- array of strings

-- UUID
UUID                 -- universally unique identifier
                     -- use gen_random_uuid() to generate

-- Special
BYTEA                -- binary data
INET                 -- IP address
```

```sql
-- ─── Constraints — enforce data integrity
CREATE TABLE products (
  id          SERIAL      PRIMARY KEY,                        -- unique + not null
  sku         TEXT        NOT NULL UNIQUE,                    -- no nulls, no duplicates
  name        TEXT        NOT NULL,
  price       NUMERIC(10,2) NOT NULL CHECK (price >= 0),      -- value rule
  category_id INT         REFERENCES categories(id),         -- foreign key
  stock       INT         NOT NULL DEFAULT 0 CHECK (stock >= 0),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Constraint types:
-- PRIMARY KEY    → unique + not null (one per table)
-- NOT NULL       → column cannot be NULL
-- UNIQUE         → all values in column must be distinct
-- CHECK (expr)   → custom boolean condition
-- REFERENCES     → foreign key — value must exist in referenced table
-- DEFAULT val    → value used when INSERT omits this column
```

```sql
-- ─── ALTER TABLE — modify existing tables
ALTER TABLE users ADD COLUMN bio TEXT;
ALTER TABLE users DROP COLUMN bio;
ALTER TABLE users ALTER COLUMN username SET NOT NULL;
ALTER TABLE users ALTER COLUMN username TYPE VARCHAR(100);
ALTER TABLE users ALTER COLUMN is_active SET DEFAULT false;
ALTER TABLE users RENAME COLUMN username TO handle;
ALTER TABLE users RENAME TO app_users;

-- ─── DROP TABLE
DROP TABLE users;                 -- fails if other tables reference it
DROP TABLE users CASCADE;         -- also drops dependent objects
DROP TABLE IF EXISTS users;       -- no error if table doesn't exist

-- ─── TRUNCATE — delete all rows (faster than DELETE)
TRUNCATE TABLE users;
TRUNCATE TABLE users RESTART IDENTITY;  -- also resets SERIAL counter
```

---

## W — Why It Matters

- Using `TIMESTAMPTZ` over `TIMESTAMP` prevents timezone bugs — the server stores all values in UTC and converts to the session timezone on retrieval. `TIMESTAMP` stores no timezone info and is ambiguous across DST changes.
- `TEXT` vs `VARCHAR(n)` — in PostgreSQL, `TEXT` and `VARCHAR` have identical performance. There is no reason to choose `VARCHAR(50)` over `TEXT` unless you genuinely want a length constraint. Use `TEXT` for most strings.
- `NUMERIC(10,2)` for money — `FLOAT` and `REAL` are approximate (binary floating point) and produce `0.1 + 0.2 = 0.30000000000000004`. `NUMERIC` is exact. Never store currency as a float.

---

## I — Interview Q&A

### Q: What is the difference between `TIMESTAMP` and `TIMESTAMPTZ` in PostgreSQL?

**A:** `TIMESTAMP` stores a date and time with no timezone information — it's a "naive" datetime. `TIMESTAMPTZ` (timestamp with time zone) stores the UTC equivalent of the input and tags it with timezone awareness. When you insert `2025-06-15 14:30:00+08:00` into a `TIMESTAMPTZ` column, PostgreSQL stores `2025-06-15 06:30:00 UTC` internally. When you read it back, PostgreSQL converts to the current session timezone. `TIMESTAMP` has no such conversion — it stores exactly what you insert. For any field that represents a real moment in time (created_at, updated_at, event timestamps), always use `TIMESTAMPTZ`.

### Q: Why is `SERIAL` not the same as a sequence?

**A:** `SERIAL` is syntax sugar that creates an integer column, creates a sequence object, and sets the column default to `nextval('sequence_name')`. It's not a type — it's shorthand for three DDL statements. Modern PostgreSQL (v10+) prefers `GENERATED ALWAYS AS IDENTITY` which is SQL-standard, safer, and doesn't allow manual inserts unless explicitly requested. For new code: `id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY`.

---

## C — Common Pitfalls + Fix

### ❌ Using `FLOAT` or `REAL` for monetary amounts

```sql
-- ❌ Floating point is approximate
CREATE TABLE invoices (amount FLOAT);
INSERT INTO invoices VALUES (0.1 + 0.2);
SELECT amount FROM invoices;
-- 0.30000000000000004  ← money stored incorrectly ❌
```

**Fix:**

```sql
-- ✅ NUMERIC is exact decimal
CREATE TABLE invoices (amount NUMERIC(12, 2));
INSERT INTO invoices VALUES (0.10 + 0.20);
SELECT amount FROM invoices;
-- 0.30  ✅
```

### ❌ Omitting `NOT NULL` — silent null bugs

```sql
-- ❌ All columns nullable by default
CREATE TABLE users (id SERIAL, email TEXT, name TEXT);
INSERT INTO users (id, email) VALUES (1, 'a@a.com');
-- name is NULL — downstream code crashes when expecting a string
```

**Fix:** Add `NOT NULL` to every column that must have a value:

```sql
-- ✅
CREATE TABLE users (
  id    SERIAL PRIMARY KEY,
  email TEXT   NOT NULL UNIQUE,
  name  TEXT   NOT NULL
);
```

---

## K — Coding Challenge + Solution

### Challenge

Create a `products` table with: `id` (auto-increment PK), `sku` (text, unique, not null), `name` (text, not null), `description` (text, nullable), `price` (exact decimal, not null, must be >= 0), `stock_count` (int, not null, default 0, must be >= 0), `is_available` (boolean, not null, default true), `created_at` (timestamp with timezone, default now). Then describe the table with `\d`.

### Solution

```sql
CREATE TABLE products (
  id           SERIAL          PRIMARY KEY,
  sku          TEXT            NOT NULL UNIQUE,
  name         TEXT            NOT NULL,
  description  TEXT,                                          -- nullable intentionally
  price        NUMERIC(10, 2)  NOT NULL CHECK (price >= 0),
  stock_count  INTEGER         NOT NULL DEFAULT 0 CHECK (stock_count >= 0),
  is_available BOOLEAN         NOT NULL DEFAULT true,
  created_at   TIMESTAMPTZ     NOT NULL DEFAULT now()
);

\d products
--    Column     |            Type             | Nullable |      Default
-- --------------+-----------------------------+----------+--------------------
--  id           | integer                     | not null | nextval('products_id_seq')
--  sku          | text                        | not null |
--  name         | text                        | not null |
--  description  | text                        |          |
--  price        | numeric(10,2)               | not null |
--  stock_count  | integer                     | not null | 0
--  is_available | boolean                     | not null | true
--  created_at   | timestamp with time zone    | not null | now()
```

---

---

# 4 — Rows — INSERT, UPDATE, DELETE

---

## T — TL;DR

Rows are the data in a table. `INSERT` adds rows. `UPDATE` modifies existing rows. `DELETE` removes rows. Always use a `WHERE` clause with `UPDATE` and `DELETE` — without it, every row is affected. Use `RETURNING` to get back the modified rows without a second query.

---

## K — Key Concepts

```sql
-- ─── INSERT — add rows
-- Single row
INSERT INTO products (sku, name, price)
VALUES ('SKU-001', 'Mechanical Keyboard', 129.99);

-- Multiple rows in one statement (efficient)
INSERT INTO products (sku, name, price, stock_count)
VALUES
  ('SKU-002', 'Gaming Mouse',    49.99,  200),
  ('SKU-003', 'USB-C Hub',       39.99,  150),
  ('SKU-004', 'Monitor Stand',   89.99,   75);

-- Omit column list if providing ALL columns in order (fragile — avoid)
INSERT INTO products VALUES (DEFAULT, 'SKU-005', 'Desk Mat', NULL, 24.99, 100, true, now());

-- RETURNING — get back the inserted row(s)
INSERT INTO products (sku, name, price)
VALUES ('SKU-006', 'Webcam', 79.99)
RETURNING id, sku, created_at;
-- Returns: id=5, sku='SKU-006', created_at='2025-06-15 10:00:00+08'

-- INSERT ... ON CONFLICT — upsert
INSERT INTO products (sku, name, price)
VALUES ('SKU-001', 'Updated Keyboard', 149.99)
ON CONFLICT (sku)
  DO UPDATE SET name = EXCLUDED.name, price = EXCLUDED.price;
-- If SKU-001 exists: updates name and price
-- If not: inserts normally
```

```sql
-- ─── UPDATE — modify existing rows
-- ⚠️ Without WHERE — updates EVERY row
UPDATE products SET is_available = false;  -- ← updates ALL products ❌

-- ✅ Always use WHERE
UPDATE products
SET price = 149.99
WHERE sku = 'SKU-001';

-- Update multiple columns
UPDATE products
SET
  price        = 44.99,
  stock_count  = stock_count + 50,  -- relative update
  is_available = true
WHERE sku = 'SKU-002';

-- UPDATE with RETURNING
UPDATE products
SET price = price * 0.90  -- 10% discount
WHERE category_id = 3
RETURNING id, name, price;
```

```sql
-- ─── DELETE — remove rows
-- ⚠️ Without WHERE — deletes EVERY row
DELETE FROM products;  -- ← deletes ALL products ❌

-- ✅ Always use WHERE
DELETE FROM products WHERE sku = 'SKU-006';

-- Delete with condition
DELETE FROM products
WHERE is_available = false AND stock_count = 0;

-- DELETE with RETURNING
DELETE FROM products
WHERE created_at < now() - INTERVAL '1 year'
RETURNING id, name;
```

```sql
-- ─── Verify before destructive operations
-- BEST PRACTICE: run the SELECT first, then convert to UPDATE/DELETE

-- Step 1: confirm which rows will be affected
SELECT id, name, price
FROM products
WHERE category_id = 3;

-- Step 2: once confirmed, run the UPDATE/DELETE
UPDATE products
SET price = price * 0.90
WHERE category_id = 3;
```

---

## W — Why It Matters

- `RETURNING` eliminates the N+1 pattern of "insert, then immediately SELECT to get the generated id" — one round trip instead of two. Every ORM feature like "return the created record" maps to `RETURNING` under the hood.
- `ON CONFLICT DO UPDATE` (upsert) is essential for idempotent data pipelines — syncing from an external API, reprocessing event streams, or seeding data that might already exist.
- The "SELECT first" pattern before `UPDATE`/`DELETE` is the safest habit in SQL — verify the WHERE clause returns exactly the rows you intend to modify before the irreversible operation.

---

## I — Interview Q&A

### Q: What does `RETURNING` do and when would you use it?

**A:** `RETURNING` appends a `SELECT`-like clause to `INSERT`, `UPDATE`, or `DELETE` that returns the affected rows as a result set. Use it when you need the server-generated values after writing — the auto-generated `id` after an `INSERT`, the `updated_at` timestamp after an `UPDATE`, or the deleted row data for audit logging after a `DELETE`. Without `RETURNING`, you'd need a second `SELECT` query. With `RETURNING`, the write and read are atomic in a single statement.

### Q: What is `ON CONFLICT` and when would you use it?

**A:** `ON CONFLICT` specifies what to do when an `INSERT` would violate a unique constraint. `ON CONFLICT DO NOTHING` silently skips the insert. `ON CONFLICT (column) DO UPDATE SET ...` performs an update instead — this is called an "upsert". Use it for idempotent operations: syncing external data where you don't know if a record already exists, seeding reference data in migrations, or processing event streams that may contain duplicates.

---

## C — Common Pitfalls + Fix

### ❌ UPDATE or DELETE without WHERE — modifies all rows

```sql
-- ❌ Missing WHERE — every product's price becomes 0
UPDATE products SET price = 0;
```

**Fix:** Always use WHERE. Verify with SELECT first:

```sql
-- ✅ Step 1: verify
SELECT id, name FROM products WHERE id = 42;
-- Step 2: modify
UPDATE products SET price = 0 WHERE id = 42;
```

### ❌ Inserting without column names — breaks on table changes

```sql
-- ❌ If someone adds a column or changes column order, this breaks silently
INSERT INTO users VALUES (DEFAULT, 'mark@example.com', 'Mark', true);
```

**Fix:** Always name the columns:

```sql
-- ✅ Explicit column names — safe against table changes
INSERT INTO users (email, name, is_active)
VALUES ('mark@example.com', 'Mark', true);
```

---

## K — Coding Challenge + Solution

### Challenge

Insert 3 products into your products table. Then: (1) update the price of one product and use `RETURNING` to confirm the new value, (2) update all products where stock_count = 0 to set is_available = false, (3) delete one product by sku and return its name.

### Solution

```sql
-- Insert 3 products
INSERT INTO products (sku, name, price, stock_count)
VALUES
  ('A001', 'Notebook',    12.99, 100),
  ('A002', 'Pen Set',      8.99,   0),
  ('A003', 'Stapler',     14.99,   0)
RETURNING id, sku, name;

-- 1. Update price with RETURNING
UPDATE products
SET price = 15.99
WHERE sku = 'A001'
RETURNING id, sku, name, price;
-- id=1, sku='A001', name='Notebook', price=15.99

-- 2. Set is_available = false for zero-stock items
UPDATE products
SET is_available = false
WHERE stock_count = 0
RETURNING sku, name, is_available;
-- A002 Pen Set    false
-- A003 Stapler    false

-- 3. Delete one product and return its name
DELETE FROM products
WHERE sku = 'A003'
RETURNING name;
-- name = 'Stapler'
```

---

---

# 5 — SQL Workflow — Execution Order Mental Model

---

## T — TL;DR

SQL is **declarative** — you describe what you want, not how to get it. The database engine decides execution order. But clauses are always **evaluated** in a fixed logical order: `FROM` → `WHERE` → `GROUP BY` → `HAVING` → `SELECT` → `ORDER BY` → `LIMIT`. Writing order in SQL differs from evaluation order — this explains many "column alias not found" errors.

---

## K — Key Concepts

```sql
-- ─── Writing order (how you write SQL)
SELECT   columns
FROM     table
WHERE    condition
GROUP BY columns
HAVING   condition
ORDER BY columns
LIMIT    n;

-- ─── Evaluation order (how PostgreSQL executes it)
-- 1. FROM      — load the data source (table, join, subquery)
-- 2. WHERE     — filter rows before grouping
-- 3. GROUP BY  — group remaining rows
-- 4. HAVING    — filter groups (post-aggregation)
-- 5. SELECT    — compute output columns (aliases defined here)
-- 6. DISTINCT  — remove duplicate rows
-- 7. ORDER BY  — sort the result (can use SELECT aliases)
-- 8. LIMIT / OFFSET — truncate the result
```

```sql
-- ─── Why evaluation order matters

-- ❌ Using a SELECT alias in WHERE — fails because WHERE runs before SELECT
SELECT price * 0.9 AS discounted_price
FROM products
WHERE discounted_price < 50;  -- ERROR: column "discounted_price" does not exist
-- WHERE evaluates before SELECT, so alias doesn't exist yet

-- ✅ Fix: repeat the expression in WHERE
SELECT price * 0.9 AS discounted_price
FROM products
WHERE price * 0.9 < 50;

-- ✅ Fix: use a subquery or CTE
SELECT * FROM (
  SELECT *, price * 0.9 AS discounted_price FROM products
) AS p
WHERE discounted_price < 50;
```

```sql
-- ─── ORDER BY can use SELECT aliases (runs after SELECT)
SELECT price * 0.9 AS discounted_price
FROM products
ORDER BY discounted_price ASC;  -- ✅ works — ORDER BY runs after SELECT
```

```sql
-- ─── Full query execution walkthrough
SELECT
  category_id,
  COUNT(*)          AS product_count,
  AVG(price)        AS avg_price
FROM products          -- 1. FROM:    load products table
WHERE is_available     -- 2. WHERE:   keep only available products
GROUP BY category_id   -- 3. GROUP BY: group by category
HAVING COUNT(*) > 2    -- 4. HAVING:  keep groups with > 2 products
ORDER BY avg_price DESC -- 7. ORDER BY: sort by computed alias (runs after SELECT)
LIMIT 5;               -- 8. LIMIT:   take top 5

-- SELECT columns computed in step 5, after grouping
```

---

## W — Why It Matters

- The most common beginner SQL error is "column X does not exist" when referencing a `SELECT` alias in `WHERE` — it happens because evaluation order means the alias isn't defined yet when `WHERE` runs. Knowing the order explains the error and the fix.
- `HAVING` vs `WHERE` distinction: `WHERE` filters individual rows (before grouping), `HAVING` filters aggregated groups (after grouping). Putting aggregate conditions in `WHERE` causes an error; they must go in `HAVING`.
- Understanding that `FROM` runs first explains JOINs — you build the combined row set in `FROM`, then filter it in `WHERE`. The entire join result exists before any filtering happens.

---

## I — Interview Q&A

### Q: Why can't you use a SELECT alias in a WHERE clause?

**A:** Because `WHERE` is evaluated before `SELECT` in PostgreSQL's logical execution order. When the `WHERE` clause runs, only the raw table columns exist — no computed expressions, no aliases. The alias defined in `SELECT` doesn't become available until step 5, after filtering and grouping are complete. Solutions: repeat the expression in `WHERE`, use a subquery where the outer `WHERE` can reference the inner `SELECT` alias, or use a CTE.

### Q: What is the difference between WHERE and HAVING?

**A:** `WHERE` filters individual rows before grouping — it runs before `GROUP BY`. `HAVING` filters groups after aggregation — it runs after `GROUP BY` and can reference aggregate functions like `COUNT()`, `SUM()`, `AVG()`. You cannot use `COUNT(*)` in a `WHERE` clause. Use `WHERE` to pre-filter rows (e.g. `WHERE is_active = true`), and `HAVING` to post-filter aggregated groups (e.g. `HAVING COUNT(*) > 10`).

---

## C — Common Pitfalls + Fix

### ❌ Aggregate function in WHERE clause

```sql
-- ❌ Aggregate (COUNT) cannot be in WHERE
SELECT category_id, COUNT(*)
FROM products
WHERE COUNT(*) > 5   -- ERROR: aggregate functions not allowed in WHERE
GROUP BY category_id;
```

**Fix:** Move aggregate condition to HAVING:

```sql
-- ✅
SELECT category_id, COUNT(*)
FROM products
GROUP BY category_id
HAVING COUNT(*) > 5;
```

---

## K — Coding Challenge + Solution

### Challenge

Write a query that demonstrates all 8 evaluation steps: from a products table, keep only available products (WHERE), group by `is_available` (GROUP BY), keep groups with more than 1 product (HAVING), select group count and average price with aliases (SELECT), sort by average price descending (ORDER BY), limit to 3 results (LIMIT). Explain each clause's role in a comment.

### Solution

```sql
SELECT
  is_available,                     -- 5. SELECT: compute output columns
  COUNT(*)       AS product_count,  -- 5. aggregate, alias defined here
  AVG(price)     AS avg_price       -- 5. aggregate, alias defined here
FROM products                       -- 1. FROM:    load data source
WHERE price > 0                     -- 2. WHERE:   filter rows (pre-group)
GROUP BY is_available               -- 3. GROUP BY: form groups
HAVING COUNT(*) > 1                 -- 4. HAVING:  filter groups (post-aggregate)
ORDER BY avg_price DESC             -- 7. ORDER BY: sort — can use SELECT aliases
LIMIT 3;                            -- 8. LIMIT:   restrict result size

-- Note: avg_price alias works in ORDER BY (step 7) but NOT in WHERE (step 2)
```

---

---

# 6 — Basic SELECT — Columns, Expressions, Literals

---

## T — TL;DR

`SELECT` retrieves data. You can select specific columns, compute expressions, concatenate strings, use math, cast types, and include literal values — all in the column list. `SELECT *` is convenient but fragile in production code.

---

## K — Key Concepts

```sql
-- ─── Sample data setup
CREATE TABLE employees (
  id         SERIAL PRIMARY KEY,
  first_name TEXT NOT NULL,
  last_name  TEXT NOT NULL,
  salary     NUMERIC(10,2) NOT NULL,
  department TEXT NOT NULL,
  hire_date  DATE NOT NULL
);

INSERT INTO employees (first_name, last_name, salary, department, hire_date)
VALUES
  ('Mark',   'Austin',   75000, 'Engineering', '2022-03-15'),
  ('Sarah',  'Chen',     82000, 'Engineering', '2021-07-01'),
  ('James',  'Rivera',   65000, 'Marketing',   '2023-01-20'),
  ('Priya',  'Sharma',   91000, 'Engineering', '2020-11-10'),
  ('Carlos', 'Mendez',   70000, 'Marketing',   '2022-08-05');
```

```sql
-- ─── SELECT all columns
SELECT * FROM employees;
-- Returns every column — convenient but fragile
-- Avoid in production: schema changes break dependent code

-- ─── SELECT specific columns
SELECT first_name, last_name, salary
FROM employees;

-- ─── Column expressions — compute values in SELECT
SELECT
  first_name,
  last_name,
  salary,
  salary * 12             AS annual_salary,     -- arithmetic
  salary * 0.10           AS bonus_estimate,    -- percentage
  salary * 1.05           AS salary_with_raise  -- 5% raise
FROM employees;
```

```sql
-- ─── String operations
SELECT
  first_name || ' ' || last_name    AS full_name,       -- concatenation
  UPPER(first_name)                 AS name_upper,      -- uppercase
  LOWER(last_name)                  AS name_lower,      -- lowercase
  LENGTH(first_name)                AS name_length,     -- string length
  LEFT(department, 3)               AS dept_code        -- first 3 chars
FROM employees;

-- CONCAT function (handles NULLs differently from ||)
SELECT CONCAT(first_name, ' ', last_name) AS full_name FROM employees;
-- || returns NULL if any operand is NULL
-- CONCAT skips NULLs (treats as empty string)
```

```sql
-- ─── Numeric functions
SELECT
  salary,
  ROUND(salary / 12, 2)   AS monthly_salary,   -- round to 2 decimal places
  CEIL(salary / 1000)     AS salary_thousands,  -- ceiling
  FLOOR(salary / 1000)    AS salary_floor,      -- floor
  ABS(salary - 75000)     AS diff_from_75k      -- absolute value
FROM employees;
```

```sql
-- ─── Date expressions
SELECT
  first_name,
  hire_date,
  EXTRACT(YEAR FROM hire_date)    AS hire_year,
  EXTRACT(MONTH FROM hire_date)   AS hire_month,
  now()::DATE - hire_date         AS days_employed,
  now()::DATE                     AS today
FROM employees;
```

```sql
-- ─── Literal values and constants in SELECT
SELECT
  first_name,
  'Active'        AS status,         -- literal string
  42              AS magic_number,   -- literal integer
  true            AS flag,           -- literal boolean
  now()           AS query_time      -- function call
FROM employees;

-- ─── DISTINCT — deduplicate results
SELECT DISTINCT department FROM employees;
-- Engineering
-- Marketing
```

---

## W — Why It Matters

- `SELECT *` is dangerous in production — if a table gains a new column (e.g. a large JSONB blob or a binary column), `SELECT *` returns it in every query, bloating network traffic and breaking strongly-typed code that expects a fixed column count.
- Expressions in `SELECT` perform computation at the database layer, not the application layer — `salary * 12` in SQL means one arithmetic operation per row in the database, not N multiplications in JavaScript after fetching raw salary values.
- Understanding `||` vs `CONCAT` for string concatenation prevents silent NULL bugs — `'Hello' || NULL` returns `NULL`, while `CONCAT('Hello', NULL)` returns `'Hello'`.

---

## I — Interview Q&A

### Q: Why is `SELECT *` considered bad practice in production queries?

**A:** Three reasons. First, schema brittleness — if a column is added, renamed, or dropped, all `SELECT *` queries silently change what they return, potentially breaking downstream code. Second, performance — `SELECT *` returns every column including potentially large JSONB, TEXT, or BYTEA columns that your query doesn't need, wasting I/O and network bandwidth. Third, readability — explicit column names serve as documentation of what the query uses. The one exception where `SELECT *` is acceptable is exploratory queries in `psql` during development.

---

## C — Common Pitfalls + Fix

### ❌ String concatenation with `||` when values might be NULL

```sql
-- ❌ If middle_name is NULL, full_name is NULL
SELECT first_name || ' ' || middle_name || ' ' || last_name AS full_name
FROM employees;
-- Returns NULL for any employee without a middle_name ❌
```

**Fix:** Use `CONCAT` or `COALESCE`:

```sql
-- ✅ CONCAT skips NULLs
SELECT CONCAT(first_name, ' ', middle_name, ' ', last_name) AS full_name
FROM employees;

-- ✅ COALESCE provides a fallback
SELECT first_name || ' ' || COALESCE(middle_name || ' ', '') || last_name AS full_name
FROM employees;
```

---

## K — Coding Challenge + Solution

### Challenge

Write a single SELECT query that returns: full name (first + last concatenated), department in uppercase, annual salary (monthly × 12), a `salary_band` literal based on nothing (just practice literals — use `'standard'`), years since hire (rounded to 1 decimal), and the query run date.

### Solution

```sql
SELECT
  first_name || ' ' || last_name             AS full_name,
  UPPER(department)                          AS department,
  salary * 12                                AS annual_salary,
  ROUND(salary * 12 / 1000, 1)              AS annual_k,
  'standard'                                 AS salary_band,
  ROUND(
    EXTRACT(EPOCH FROM (now() - hire_date::TIMESTAMPTZ))
    / (365.25 * 86400), 1
  )                                          AS years_employed,
  now()::DATE                                AS query_date
FROM employees
ORDER BY annual_salary DESC;

--   full_name     | department  | annual_salary | annual_k | salary_band | years_employed | query_date
-- ----------------+-------------+---------------+----------+-------------+----------------+------------
--  Priya Sharma   | ENGINEERING |    1092000.00 |   1092.0 | standard    |            4.6 | 2025-06-15
--  Sarah Chen     | ENGINEERING |     984000.00 |    984.0 | standard    |            3.9 | 2025-06-15
--  ...
```

---

---

# 7 — Filtering with WHERE — Conditions and Operators

---

## T — TL;DR

`WHERE` filters rows before they reach `SELECT`. It uses conditions — comparisons, logic operators, range checks, pattern matching, and NULL checks. Combine conditions with `AND` / `OR`. Each operator has precise semantics — especially `NULL` comparisons which require `IS NULL`, not `= NULL`.

---

## K — Key Concepts

```sql
-- ─── Comparison operators
SELECT * FROM employees WHERE salary > 75000;
SELECT * FROM employees WHERE salary >= 80000;
SELECT * FROM employees WHERE salary < 70000;
SELECT * FROM employees WHERE salary = 75000;
SELECT * FROM employees WHERE salary != 75000;   -- not equal
SELECT * FROM employees WHERE salary <> 75000;   -- same as !=

-- ─── Logical operators: AND, OR, NOT
-- AND: both conditions must be true
SELECT * FROM employees
WHERE department = 'Engineering' AND salary > 80000;

-- OR: at least one condition must be true
SELECT * FROM employees
WHERE department = 'Marketing' OR salary > 90000;

-- NOT: inverts condition
SELECT * FROM employees
WHERE NOT department = 'Marketing';

-- Combine with parentheses — control precedence
SELECT * FROM employees
WHERE (department = 'Engineering' OR department = 'Marketing')
  AND salary > 70000;
```

```sql
-- ─── IN — match against a list of values
SELECT * FROM employees
WHERE department IN ('Engineering', 'Marketing', 'Finance');

-- NOT IN
SELECT * FROM employees
WHERE department NOT IN ('HR', 'Legal');

-- ─── BETWEEN — inclusive range
SELECT * FROM employees
WHERE salary BETWEEN 70000 AND 85000;
-- Same as: salary >= 70000 AND salary <= 85000

SELECT * FROM employees
WHERE hire_date BETWEEN '2022-01-01' AND '2022-12-31';
```

```sql
-- ─── LIKE and ILIKE — pattern matching
-- % → any sequence of characters (including empty)
-- _ → exactly one character

SELECT * FROM employees WHERE last_name LIKE 'A%';      -- starts with A
SELECT * FROM employees WHERE last_name LIKE '%en';     -- ends with en
SELECT * FROM employees WHERE last_name LIKE '%i%';     -- contains i
SELECT * FROM employees WHERE first_name LIKE '_a%';    -- second char is a
SELECT * FROM employees WHERE first_name LIKE '__r%';   -- third char is r

-- ILIKE — case-insensitive LIKE (PostgreSQL extension)
SELECT * FROM employees WHERE department ILIKE 'engineering';
SELECT * FROM employees WHERE last_name ILIKE '%chen%';
```

```sql
-- ─── NULL handling — IS NULL / IS NOT NULL
-- ⚠️ NULL = NULL → NULL (not true!) — never use = NULL
SELECT * FROM employees WHERE manager_id = NULL;       -- ❌ returns nothing
SELECT * FROM employees WHERE manager_id IS NULL;      -- ✅ correct
SELECT * FROM employees WHERE manager_id IS NOT NULL;  -- ✅ correct

-- NULL in comparisons: NULL propagates
-- NULL = NULL    → NULL (unknown)
-- NULL != 'foo'  → NULL (unknown)
-- WHERE filters out NULL results — only true rows pass
```

```sql
-- ─── Complex WHERE examples
-- Employees hired in 2022 or 2023 with salary above median
SELECT first_name, last_name, hire_date, salary
FROM employees
WHERE hire_date >= '2022-01-01'
  AND hire_date < '2024-01-01'
  AND salary > 70000
ORDER BY hire_date;

-- Engineers or high earners, hired before 2023
SELECT first_name, last_name, department, salary
FROM employees
WHERE (department = 'Engineering' OR salary > 85000)
  AND hire_date < '2023-01-01';
```

---

## W — Why It Matters

- `IS NULL` vs `= NULL` is one of the most common SQL mistakes — `NULL` represents "unknown", so any comparison with `NULL` using `=`, `!=`, `>`, etc. returns `NULL` (not `true` or `false`). `WHERE` discards rows where the condition is `NULL`, so `WHERE col = NULL` returns zero rows even if the column contains NULLs.
- `ILIKE` is PostgreSQL-specific — it's `LIKE` without case sensitivity. For internationalized apps, use `LOWER(column) LIKE '%pattern%'` for portability.
- `IN (subquery)` is one of the most powerful forms of `IN` — covered in joins/subqueries day, but knowing basic `IN (value1, value2)` now makes complex queries approachable later.

---

## I — Interview Q&A

### Q: Why does `WHERE column = NULL` return no rows even when NULL values exist?

**A:** `NULL` in SQL means "unknown" — it's not a value, it's the absence of a value. Any comparison involving `NULL` using standard operators (`=`, `!=`, `<`, `>`) returns `NULL` (unknown), not `true` or `false`. The `WHERE` clause only passes rows where the condition evaluates to `true` — rows where the condition is `NULL` (unknown) are excluded. To check for NULL, use `IS NULL` or `IS NOT NULL`, which are special predicates designed specifically for NULL comparisons.

### Q: What is the difference between `IN` and multiple `OR` conditions?

**A:** They are semantically equivalent — `WHERE col IN ('a', 'b', 'c')` is the same as `WHERE col = 'a' OR col = 'b' OR col = 'c'`. `IN` is more readable for lists longer than two values. The query planner typically generates the same execution plan. The practical difference: `IN` with a subquery (`WHERE col IN (SELECT ...)`) is a fundamentally different operation — a semi-join — which is more powerful than any equivalent `OR` chain.

---

## C — Common Pitfalls + Fix

### ❌ Using `= NULL` instead of `IS NULL`

```sql
-- ❌ Returns zero rows — NULL = NULL is NULL, not TRUE
SELECT * FROM employees WHERE manager_id = NULL;
```

**Fix:**

```sql
-- ✅
SELECT * FROM employees WHERE manager_id IS NULL;
```

### ❌ `NOT IN` with a list containing NULL — silently returns no rows

```sql
-- ❌ If the list contains NULL, NOT IN never matches anything
SELECT * FROM employees
WHERE department NOT IN ('HR', NULL, 'Legal');
-- NOT IN with NULL → returns 0 rows (NULL poisons the entire IN check) ❌
```

**Fix:** Use `NOT IN` only with NULL-free lists, or use `NOT EXISTS`:

```sql
-- ✅ Remove NULLs from the list
SELECT * FROM employees
WHERE department NOT IN ('HR', 'Legal');
```

---

## K — Coding Challenge + Solution

### Challenge

Write 4 separate WHERE queries on the employees table: (1) employees in Engineering with salary over 80,000; (2) employees hired between 2021 and 2022 inclusive; (3) employees whose last name starts with any letter A-M (hint: use BETWEEN with letters); (4) employees NOT in Engineering or Marketing.

### Solution

```sql
-- 1. Engineering with salary > 80,000
SELECT first_name, last_name, department, salary
FROM employees
WHERE department = 'Engineering' AND salary > 80000;
-- Priya Sharma  Engineering  91000
-- Sarah Chen    Engineering  82000

-- 2. Hired between 2021 and 2022
SELECT first_name, last_name, hire_date
FROM employees
WHERE hire_date BETWEEN '2021-01-01' AND '2022-12-31';
-- Sarah Chen   2021-07-01
-- Mark Austin  2022-03-15
-- Carlos Mendez 2022-08-05

-- 3. Last name starts A–M (alphabetically)
SELECT first_name, last_name
FROM employees
WHERE last_name BETWEEN 'A' AND 'N';
-- (BETWEEN on text is alphabetical comparison)
-- Mark Austin, Sarah Chen, Carlos Mendez

-- 4. NOT in Engineering or Marketing
SELECT first_name, last_name, department
FROM employees
WHERE department NOT IN ('Engineering', 'Marketing');
-- (empty result with current data — no other departments)
```

---

---

# 8 — Sorting with ORDER BY

---

## T — TL;DR

`ORDER BY` sorts the result set. Specify one or more columns, each with `ASC` (default) or `DESC`. Sorting happens after `SELECT`, so you can use column aliases. NULL sorting is configurable with `NULLS FIRST` / `NULLS LAST`.

---

## K — Key Concepts

```sql
-- ─── Basic ORDER BY
SELECT first_name, last_name, salary
FROM employees
ORDER BY salary;          -- ASC by default (lowest first)

SELECT first_name, last_name, salary
FROM employees
ORDER BY salary DESC;     -- highest first

-- ─── Sort by multiple columns
-- Primary sort: department A→Z
-- Secondary sort: within each department, salary highest first
SELECT first_name, last_name, department, salary
FROM employees
ORDER BY department ASC, salary DESC;

-- ─── Sort by column position (positional — use with caution)
SELECT first_name, last_name, salary
FROM employees
ORDER BY 3 DESC;  -- column 3 = salary  (fragile — avoid in production)
```

```sql
-- ─── Sort using SELECT alias (works because ORDER BY runs after SELECT)
SELECT
  first_name || ' ' || last_name AS full_name,
  salary * 12                     AS annual_salary
FROM employees
ORDER BY annual_salary DESC;  -- ✅ alias works in ORDER BY

-- ─── Sort by expression (without alias)
SELECT first_name, last_name, salary
FROM employees
ORDER BY salary * 12 DESC;    -- sort by computed value
```

```sql
-- ─── NULL handling in ORDER BY
-- By default: NULLs appear LAST for ASC, FIRST for DESC
-- Override explicitly:

SELECT first_name, manager_id
FROM employees
ORDER BY manager_id ASC NULLS LAST;   -- NULLs at end when sorting ascending

SELECT first_name, manager_id
FROM employees
ORDER BY manager_id ASC NULLS FIRST;  -- NULLs at beginning when sorting ascending

SELECT first_name, manager_id
FROM employees
ORDER BY manager_id DESC NULLS LAST;  -- NULLs at end when sorting descending
```

```sql
-- ─── LIMIT and OFFSET with ORDER BY
-- Top 3 highest earners
SELECT first_name, last_name, salary
FROM employees
ORDER BY salary DESC
LIMIT 3;

-- Pagination: page 2 (rows 4-6), 3 per page
SELECT first_name, last_name, salary
FROM employees
ORDER BY salary DESC
LIMIT 3 OFFSET 3;

-- ⚠️ OFFSET pagination gets slow on large tables (scans and discards rows)
-- Better: cursor-based pagination (WHERE id > last_seen_id LIMIT n)
```

---

## W — Why It Matters

- Database result order is **not guaranteed** unless you explicitly specify `ORDER BY`. Different queries, different server load, different execution plans — the same table can return rows in different order. Never rely on implicit ordering.
- `NULLS FIRST` / `NULLS LAST` matters for UIs that show sorted lists — without explicit NULL handling, NULL values appear at the top of `DESC` sorted lists (e.g. "date modified" columns), which is usually wrong for user-facing apps.
- `LIMIT` without `ORDER BY` is meaningless — you get an arbitrary subset of rows. Always combine `LIMIT` with `ORDER BY` for deterministic pagination.

---

## I — Interview Q&A

### Q: Why should you always use ORDER BY when using LIMIT?

**A:** Without `ORDER BY`, the database returns rows in any order — the order depends on physical storage, index scans, parallel execution, and other non-deterministic factors. Using `LIMIT` without `ORDER BY` gives you an arbitrary subset with no guarantee about which rows you get. On the next query execution, you might get different rows. For pagination, leaderboards, "most recent", or "top N" queries, `ORDER BY` is required to make the `LIMIT` result meaningful and reproducible.

---

## C — Common Pitfalls + Fix

### ❌ Using positional ORDER BY that breaks on column changes

```sql
-- ❌ Fragile — if columns are reordered in SELECT, sort changes silently
SELECT first_name, salary, department FROM employees ORDER BY 2 DESC;
-- If someone changes SELECT to: first_name, department, salary
-- ORDER BY 2 now sorts by department, not salary — silent bug ❌
```

**Fix:** Use column names or aliases:

```sql
-- ✅
SELECT first_name, salary, department FROM employees ORDER BY salary DESC;
```

---

## K — Coding Challenge + Solution

### Challenge

Write three ORDER BY queries: (1) all employees sorted by department A→Z, then by hire_date newest first within each department; (2) top 2 earners with full name and salary; (3) all employees sorted by annual salary descending using a SELECT alias.

### Solution

```sql
-- 1. By department ASC, then hire_date newest first
SELECT first_name, last_name, department, hire_date
FROM employees
ORDER BY department ASC, hire_date DESC;

-- 2. Top 2 earners
SELECT first_name || ' ' || last_name AS full_name, salary
FROM employees
ORDER BY salary DESC
LIMIT 2;
-- Priya Sharma  91000
-- Sarah Chen    82000

-- 3. Sort by annual_salary alias
SELECT
  first_name,
  last_name,
  salary * 12 AS annual_salary
FROM employees
ORDER BY annual_salary DESC;
-- Priya Sharma    1092000
-- Sarah Chen       984000
-- Mark Austin      900000
-- Carlos Mendez    840000
-- James Rivera     780000
```

---

---

# 9 — Aliases — AS for Columns and Tables

---

## T — TL;DR

`AS` gives a temporary name to a column expression or table. Column aliases make output readable and allow `ORDER BY` to reference computed expressions by name. Table aliases shorten long table names and are **required** for self-joins and subqueries. The `AS` keyword is optional — but always use it for clarity.

---

## K — Key Concepts

```sql
-- ─── Column aliases
-- Rename a column in the output
SELECT
  first_name      AS given_name,
  last_name       AS family_name,
  salary          AS base_salary
FROM employees;

-- Alias a computed expression
SELECT
  first_name || ' ' || last_name AS full_name,
  salary * 12                    AS annual_salary,
  salary / 1000                  AS salary_k,
  UPPER(department)              AS dept_label
FROM employees;

-- AS is optional (but use it for readability)
SELECT salary * 12 annual_salary FROM employees;  -- works, but harder to read
SELECT salary * 12 AS annual_salary FROM employees;  -- clearer ✅
```

```sql
-- ─── Quoting aliases — when to use double quotes
-- Unquoted aliases: lowercase, no spaces, no special chars
SELECT salary AS annual_salary    -- ✅ stored as lowercase

-- Quoted aliases: preserve case and allow spaces/special chars
SELECT salary AS "Annual Salary"   -- column header: "Annual Salary"
SELECT salary AS "Annual_Salary_$" -- special chars allowed with quotes

-- Convention: use lowercase_with_underscores (no quotes needed)
SELECT salary AS annual_salary     -- ✅ preferred
```

```sql
-- ─── Table aliases
-- Long table name
SELECT e.first_name, e.last_name, e.salary
FROM employees AS e;

-- Table alias without AS (common convention)
SELECT e.first_name, e.salary
FROM employees e;  -- AS is optional

-- Qualify column names with table alias (prevents ambiguity)
SELECT
  e.first_name,
  e.salary
FROM employees AS e
WHERE e.salary > 70000;

-- Without table aliases — works for single table, required for joins
SELECT first_name, salary FROM employees WHERE salary > 70000;
```

```sql
-- ─── When table aliases are REQUIRED

-- 1. Subqueries — the subquery must have an alias
SELECT * FROM (
  SELECT first_name, salary * 12 AS annual_salary
  FROM employees
) AS e_annual          -- ← REQUIRED for subquery
WHERE e_annual.annual_salary > 900000;

-- 2. Self-joins — distinguishing the two references to the same table
SELECT
  e1.first_name AS employee,
  e2.first_name AS manager
FROM employees AS e1
JOIN employees AS e2 ON e1.manager_id = e2.id;
-- Without aliases, e1 and e2 are indistinguishable ❌
```

```sql
-- ─── Alias scope reminder — only in ORDER BY, not WHERE
SELECT salary * 12 AS annual_salary
FROM employees
WHERE annual_salary > 900000;   -- ❌ alias not in scope for WHERE
-- Fix: WHERE salary * 12 > 900000

SELECT salary * 12 AS annual_salary
FROM employees
ORDER BY annual_salary DESC;    -- ✅ alias in scope for ORDER BY
```

---

## W — Why It Matters

- Table aliases are mandatory in joins — when two tables have a column with the same name (`id`, `created_at`), PostgreSQL needs the alias prefix to know which table's column you mean. Qualifying with table aliases in all joins is a professional habit.
- Subquery aliases are syntactically required — every subquery in `FROM` must have a name so the outer query can reference its columns. This is a hard SQL rule, not a preference.
- Column aliases in `ORDER BY` allow referencing computed columns by meaningful names — cleaner than repeating the expression, and the computation runs only once.

---

## I — Interview Q&A

### Q: When is a table alias required (not just convenient) in PostgreSQL?

**A:** Two cases where aliases are required. First, in `FROM` subqueries — `SELECT * FROM (SELECT ... FROM table) AS alias WHERE ...`. The `AS alias` is syntactically required; PostgreSQL cannot reference a subquery without a name. Second, in self-joins — when the same table appears twice in a query, two different aliases are required to distinguish the two references: `FROM employees AS e1 JOIN employees AS e2 ON e1.manager_id = e2.id`. Without separate aliases, there's no way to specify which copy of the table a column belongs to.

---

## C — Common Pitfalls + Fix

### ❌ Subquery without alias — syntax error

```sql
-- ❌ Subquery in FROM has no alias — syntax error
SELECT * FROM (
  SELECT first_name, salary * 12 AS annual_salary FROM employees
)
WHERE annual_salary > 900000;
-- ERROR: subquery in FROM must have an alias
```

**Fix:** Always alias subqueries in FROM:

```sql
-- ✅
SELECT * FROM (
  SELECT first_name, salary * 12 AS annual_salary FROM employees
) AS emp_annual
WHERE annual_salary > 900000;
```

### ❌ Using SELECT alias in WHERE clause

```sql
-- ❌ Alias not yet defined when WHERE evaluates
SELECT salary * 12 AS annual_salary FROM employees
WHERE annual_salary > 900000;  -- ERROR or no results ❌
```

**Fix:**

```sql
-- ✅ Repeat the expression in WHERE
SELECT salary * 12 AS annual_salary FROM employees
WHERE salary * 12 > 900000;

-- ✅ Or use a subquery
SELECT * FROM (
  SELECT salary * 12 AS annual_salary FROM employees
) AS s
WHERE s.annual_salary > 900000;
```

---

## K — Coding Challenge + Solution

### Challenge

Write a query using both column aliases and table aliases: use `e` as the table alias for employees, compute `full_name`, `monthly_salary`, `annual_salary`, and `seniority_years` (whole years since hire). Filter to employees with annual salary > 800,000. Sort by `seniority_years` descending. Use the aliases in ORDER BY.

### Solution

```sql
SELECT
  e.first_name || ' ' || e.last_name               AS full_name,
  e.department,
  ROUND(e.salary, 2)                                AS monthly_salary,
  ROUND(e.salary * 12, 2)                           AS annual_salary,
  DATE_PART('year', AGE(e.hire_date))::INT          AS seniority_years
FROM employees AS e
WHERE e.salary * 12 > 800000          -- use expression, not alias (WHERE runs before SELECT)
ORDER BY seniority_years DESC;        -- alias works in ORDER BY ✅

--   full_name      | department  | monthly_salary | annual_salary | seniority_years
-- -----------------+-------------+----------------+---------------+-----------------
--  Priya Sharma    | Engineering |       91000.00 |   1092000.00  |               4
--  Sarah Chen      | Engineering |       82000.00 |    984000.00  |               3
--  Mark Austin     | Engineering |       75000.00 |    900000.00  |               3
--  Carlos Mendez   | Marketing   |       70000.00 |    840000.00  |               2
```

---

## ✅ Day 1 Complete — PostgreSQL Foundation

| # | Subtopic | Status |
|---|----------|--------|
| 1 | Install and Connect | ☐ |
| 2 | Databases and Schemas | ☐ |
| 3 | Tables — Structure and Data Types | ☐ |
| 4 | Rows — INSERT, UPDATE, DELETE | ☐ |
| 5 | SQL Workflow — Execution Order | ☐ |
| 6 | Basic SELECT | ☐ |
| 7 | Filtering with WHERE | ☐ |
| 8 | Sorting with ORDER BY | ☐ |
| 9 | Aliases — AS for Columns and Tables | ☐ |

---

## 🗺️ One-Page Mental Model — Day 1

```
HIERARCHY
  Server → Database → Schema → Table → Row → Column
  Databases: isolated (can't join across)
  Schemas:   namespaces (can join across in same DB)
  public:    default schema — tables go here unless specified

PSQL ESSENTIALS
  psql -h host -p 5432 -U user -d database
  \l     list databases     \c dbname  connect
  \dt    list tables        \d table   describe table
  \dn    list schemas       \q         quit
  \i file.sql               execute SQL file

DATA TYPES (choose precisely)
  Integers:   INT, BIGINT, SERIAL, BIGSERIAL
  Text:       TEXT (preferred), VARCHAR(n) (length constraint only)
  Decimal:    NUMERIC(p,s) for money — never FLOAT
  Boolean:    BOOLEAN
  Datetime:   TIMESTAMPTZ (always) — never bare TIMESTAMP
  JSON:       JSONB (indexable) > JSON
  PK pattern: id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY

CONSTRAINTS
  PRIMARY KEY    NOT NULL + UNIQUE (one per table)
  NOT NULL       column must have a value
  UNIQUE         all values distinct
  CHECK(expr)    custom validation
  REFERENCES     foreign key (value must exist elsewhere)
  DEFAULT val    value when INSERT omits column

DML
  INSERT INTO t (cols) VALUES (...) RETURNING id;
  UPDATE t SET col = val WHERE condition RETURNING *;
  DELETE FROM t WHERE condition RETURNING *;
  ALWAYS use WHERE with UPDATE/DELETE
  SELECT before UPDATE/DELETE to verify affected rows

SQL EVALUATION ORDER (not writing order)
  1 FROM      2 WHERE     3 GROUP BY
  4 HAVING    5 SELECT    6 DISTINCT
  7 ORDER BY  8 LIMIT

  Alias defined in SELECT (5) → usable in ORDER BY (7)
  Alias NOT usable in WHERE (2) — runs before SELECT
  Aggregate NOT usable in WHERE — use HAVING

SELECT PATTERNS
  SELECT col1, col2                  specific columns
  SELECT t.col1, t.col2             table-qualified
  SELECT expr AS alias              computed column
  SELECT DISTINCT col               deduplicate
  || for concat  COALESCE for null  UPPER/LOWER/LENGTH

WHERE OPERATORS
  =  !=  <  >  <=  >=               comparison
  AND  OR  NOT                       logic
  IN ('a','b')   NOT IN (...)        list match
  BETWEEN a AND b                    inclusive range
  LIKE 'A%'   ILIKE (case-insensitive)  pattern
  IS NULL   IS NOT NULL              null checks
  = NULL → never works (returns NULL, not true)

ORDER BY
  ORDER BY col ASC              ascending (default)
  ORDER BY col DESC             descending
  ORDER BY col1 ASC, col2 DESC  multi-column
  NULLS FIRST / NULLS LAST      explicit null position
  Always use ORDER BY with LIMIT

ALIASES
  SELECT expr AS alias          column alias
  FROM table AS t               table alias (AS optional)
  Subquery MUST have alias:     (SELECT ...) AS sub
  Self-join MUST use aliases:   t1 JOIN t1 AS t2 ...
```

> **Your next action:** Open `psql`, connect to any database, and run this one query:
>
> ```sql
> SELECT current_database(), current_user, now()::DATE AS today;
> ```
>
> If you see a result row, you have a working PostgreSQL setup. That's all you need to start Day 1.
>
> *Doing one small thing beats opening a feed.*