# 5 — Docker Compose — Services, Dependencies, Profiles

---

## T — TL;DR

Docker Compose defines and runs multi-container applications from a single `docker-compose.yml`. Services are containers with config. `depends_on` controls startup order. `healthcheck` makes `depends_on` wait for readiness (not just start). `profiles` let you group services (e.g. dev-only tools) that only start when explicitly activated.

---

## K — Key Concepts

```yaml
# docker-compose.yml — complete anatomy
services:
  app:                              # service name (becomes DNS hostname)
    build:
      context: .                    # build context directory
      dockerfile: Dockerfile        # path to Dockerfile
      target: runner                # multi-stage target (Subtopic 9)
      args:                         # ARG values for Dockerfile
        BUILD_VERSION: "1.0.0"
    image: myapp:dev                # tag the built image
    container_name: myapp           # fixed name (avoid in scaled services)
    restart: unless-stopped         # always | on-failure | unless-stopped | no
    ports:
      - "3000:3000"
    environment:
      NODE_ENV: development
    env_file: .env                  # load vars from file
    volumes:
      - ./src:/app/src
    depends_on:                     # startup order + health condition
      db:
        condition: service_healthy  # wait until healthcheck passes ✅
    networks:
      - backend
    command: npm run dev            # override CMD
    healthcheck:
      test:     ["CMD", "wget", "-qO-", "http://localhost:3000/api/health"]
      interval: 10s
      timeout:  5s
      retries:  3
      start_period: 30s             # grace period before first check
```

```yaml
# ── depends_on conditions ─────────────────────────────────────────────────
depends_on:
  db:
    condition: service_started    # default — container is running (not ready)
  db:
    condition: service_healthy    # waits for healthcheck to pass ✅
  db:
    condition: service_completed_successfully  # for init/migration containers
```

```yaml
# ── Profiles — group optional services ────────────────────────────────────
services:
  app:
    image: myapp:latest
    # no profile — always starts

  db:
    image: postgres:18-alpine
    # no profile — always starts

  pgadmin:
    image: dpage/pgadmin4
    profiles: [tools]             # only starts with --profile tools
    ports: ["5050:80"]

  mailhog:
    image: mailhog/mailhog
    profiles: [tools]             # dev email catcher
    ports: ["8025:8025"]

  migration:
    image: myapp:latest
    command: npx prisma migrate deploy
    profiles: [migrate]           # only run with --profile migrate
    depends_on:
      db: { condition: service_healthy }
```

```bash
# ── Compose CLI ───────────────────────────────────────────────────────────
docker compose up -d                    # start all services (detached)
docker compose up --build               # rebuild images before starting
docker compose up --profile tools       # include profile services
docker compose down                     # stop + remove containers and networks
docker compose down -v                  # also remove volumes ⚠️
docker compose ps                       # service status
docker compose logs app -f              # follow app logs
docker compose exec app sh              # shell in running app container
docker compose run --rm app npm test    # one-off command (removes container after)
docker compose restart app              # restart one service
docker compose pull                     # pull latest images
```

```yaml
# ── docker-compose.override.yml — local dev overrides ────────────────────
# Automatically merged with docker-compose.yml when running locally
# Add to .gitignore if it contains local paths or secrets

# docker-compose.override.yml
services:
  app:
    build:
      target: development          # override to dev stage
    volumes:
      - ./src:/app/src             # add bind mounts for dev
    command: npm run dev           # override to dev server

  db:
    ports:
      - "127.0.0.1:5432:5432"     # expose DB locally for pgAdmin, migrations
```

---

## W — Why It Matters

- `condition: service_healthy` is the difference between "app starts before DB is ready and crashes" and "app waits until the DB accepts connections" — `service_started` only means the container process launched, not that PostgreSQL is accepting queries. Without `service_healthy`, you need fragile retry logic in the app.
- `profiles` keep the development Compose file clean without separate files — `pgAdmin`, `MailHog`, `Redis Commander` are useful in development but should never start in CI or production. Profiles group them behind a flag.
- `docker-compose.override.yml` enables the split between what's in git (production-safe Compose file) and what's local (bind mounts, exposed ports, dev commands) — the override file auto-merges locally but never runs in CI.

---

## I — Interview Q&A

### Q: What is the difference between `depends_on: service_started` and `depends_on: service_healthy`?

**A:** `service_started` (the default) means Compose waits until the dependent container's process has started — the container's PID 1 is running. It does not mean the service inside is ready to accept connections. PostgreSQL takes 2–5 seconds after its process starts before it's ready for queries. `service_healthy` waits until the container's `healthcheck` passes — meaning the health test command succeeds within the defined thresholds. For a database, the healthcheck is typically `pg_isready`, which returns success only when PostgreSQL is ready to accept connections. Using `service_healthy` means your app service waits for a genuinely ready database, eliminating race condition startup failures.

---

## C — Common Pitfalls + Fix

### ❌ `docker-compose down -v` in CI destroys test database volumes unexpectedly

```bash
# ❌ Destroys named volumes — wipes data between CI stages if shared
docker compose down -v

# ✅ Use -v only intentionally; clean specific volumes explicitly
docker compose down              # stops containers, removes networks
docker volume rm project_postgres_data  # explicit, intentional
```

---

## K — Coding Challenge + Solution

### Challenge

Write a `docker-compose.yml` with: (1) an `app` service with healthcheck; (2) a `db` service with healthcheck; (3) a `migration` service with `service_completed_successfully` condition; (4) `pgadmin` and `redis` under a `tools` profile; (5) an `override` file that adds a bind mount and exposes the DB port locally.

### Solution

```yaml
# docker-compose.yml
services:
  app:
    build: .
    ports: ["3000:3000"]
    environment:
      DATABASE_URL: postgresql://dev:dev@db:5432/myapp
    depends_on:
      db:        { condition: service_healthy }
      migration: { condition: service_completed_successfully }
    healthcheck:
      test:         ["CMD", "wget", "-qO-", "http://localhost:3000/api/health"]
      interval:     10s
      timeout:      5s
      retries:      3
      start_period: 20s

  db:
    image: postgres:18-alpine
    environment: { POSTGRES_USER: dev, POSTGRES_PASSWORD: dev, POSTGRES_DB: myapp }
    healthcheck:
      test:     ["CMD-SHELL", "pg_isready -U dev"]
      interval: 5s
      retries:  5

  migration:
    build: .
    command: npx prisma migrate deploy
    environment:
      DATABASE_URL: postgresql://dev:dev@db:5432/myapp
    depends_on:
      db: { condition: service_healthy }

  pgadmin:
    image: dpage/pgadmin4
    profiles: [tools]
    environment: { PGADMIN_DEFAULT_EMAIL: admin@local.dev, PGADMIN_DEFAULT_PASSWORD: admin }
    ports: ["5050:80"]

  redis:
    image: redis:7-alpine
    profiles: [tools]

# docker-compose.override.yml
services:
  app:
    build: { target: development }
    volumes: [./src:/app/src]
    command: npm run dev
  db:
    ports: ["127.0.0.1:5432:5432"]
```

---

---
