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
