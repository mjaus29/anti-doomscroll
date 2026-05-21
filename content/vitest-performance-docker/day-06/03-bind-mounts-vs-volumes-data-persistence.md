# 3 — Bind Mounts vs Volumes — Data Persistence

---

## T — TL;DR

By default a container's filesystem is ephemeral — deleted with the container. **Volumes** are Docker-managed storage that persist independently of containers, ideal for databases and production data. **Bind mounts** map a host directory into the container, ideal for development (live code reload). **tmpfs** is RAM-only, ideal for sensitive temporary data.

---

## K — Key Concepts

```bash
# ── Volumes — Docker-managed persistent storage ───────────────────────────
docker volume create myapp-data          # create named volume
docker volume ls                         # list volumes
docker volume inspect myapp-data         # details + mount point
docker volume rm myapp-data              # remove (only if no container uses it)
docker volume prune                      # remove all unused volumes

# Use a volume: -v volume_name:container_path
docker run -d \
  -v postgres-data:/var/lib/postgresql/data \   # named volume ✅
  postgres:18-alpine

# Volume stored at: /var/lib/docker/volumes/postgres-data/_data (on Linux)
# Persists after: docker stop, docker rm
# Deleted only by: docker volume rm postgres-data
```

```bash
# ── Bind mounts — map host directory into container ───────────────────────
# Use -v /host/path:/container/path  OR  --mount type=bind,...

# Development: mount source code so changes reflect instantly
docker run -d \
  -v $(pwd)/src:/app/src \     # host ./src → container /app/src
  -v $(pwd)/public:/app/public \
  -p 3000:3000 \
  myapp:dev

# ⚠️ Bind mounts expose host filesystem — don't use in production images
# ⚠️ node_modules conflict: if you mount . but container has different node_modules,
#    host node_modules override the container's. Fix: anonymous volume for node_modules
docker run -d \
  -v $(pwd):/app \                # bind mount source ✅
  -v /app/node_modules \          # anonymous volume masks host node_modules ✅
  -p 3000:3000 \
  myapp:dev
```

```yaml
# docker-compose.yml — volumes and bind mounts in Compose syntax
services:
  app:
    image: myapp:dev
    volumes:
      - ./src:/app/src              # bind mount — source code
      - ./public:/app/public        # bind mount — static files
      - app_node_modules:/app/node_modules  # named volume — isolate deps

  db:
    image: postgres:18-alpine
    volumes:
      - postgres_data:/var/lib/postgresql/data  # named volume — persist data

volumes:
  postgres_data:        # declare named volumes here
  app_node_modules:
```

```
── Choosing between volume types ─────────────────────────────────────────────

Scenario                          │ Use
──────────────────────────────────┼──────────────────────────────────────────
Database data (production)        │ Named volume
Database data (CI tests)          │ No mount — ephemeral, or tmpfs for speed
Source code (development)         │ Bind mount (live reload)
Logs to ship to host              │ Bind mount
Secrets / certificates in memory  │ tmpfs
Shared data between services      │ Named volume
```

```bash
# ── tmpfs — in-memory filesystem (disappears on stop) ────────────────────
docker run -d \
  --tmpfs /run:rw,noexec,nosuid,size=64m \
  myapp

# Use for: session files, temp uploads, sensitive data that must not persist
```

---

## W — Why It Matters

- Volumes vs bind mounts is a production vs development distinction — bind mounts couple the container to a specific host path (fragile in CI, wrong in production), while volumes are portable across environments. Use bind mounts in `docker-compose.override.yml` for local dev, never in the production image or CI run.
- The `node_modules` anonymous volume pattern is essential for development bind mounts — without it, the host's `node_modules` (possibly for a different OS) overwrites the container's correctly-built one, causing native module errors on Linux containers built on macOS hosts.
- Database volumes in CI should be ephemeral (no volume mount) — fresh data every run prevents test pollution from previous runs and ensures tests start from a known state.

---

## I — Interview Q&A

### Q: What is the difference between a named volume and a bind mount in Docker?

**A:** A named volume is managed entirely by Docker — Docker decides where it lives on the host (typically `/var/lib/docker/volumes/`), and it persists independently of any container lifecycle. You reference it by name, not by path. It's portable: the same Compose file works on any machine. A bind mount maps a specific host file or directory path directly into the container — `$(pwd)/src:/app/src` shares the host's `./src` directory. Bind mounts are path-dependent (breaks if the host path doesn't exist), give the container direct access to the host filesystem (security risk in production), and are typically used only for development to enable live code reloading without rebuilding the image.

---

## C — Common Pitfalls + Fix

### ❌ Bind mounting entire project dir — host node_modules overrides container's

```yaml
# ❌ Host node_modules (macOS) overrides container node_modules (Linux)
volumes:
  - .:/app   # mounts everything including node_modules ❌
```

**Fix:** Mask node_modules with an anonymous volume:

```yaml
# ✅
volumes:
  - .:/app                   # bind mount source
  - /app/node_modules        # anonymous volume shadows host node_modules ✅
```

---

## K — Coding Challenge + Solution

### Challenge

Write a `docker-compose.yml` development setup with: a Next.js app using bind mounts for `src` and `public`, an isolated `node_modules` volume, and a PostgreSQL container with a named volume for data. Show how to inspect and remove the postgres volume.

### Solution

```yaml
# docker-compose.yml
services:
  app:
    build: { context: ., dockerfile: Dockerfile.dev }
    ports: ["3000:3000"]
    volumes:
      - ./src:/app/src
      - ./public:/app/public
      - node_modules:/app/node_modules
    environment:
      DATABASE_URL: postgresql://dev:dev@db:5432/myapp
    depends_on:
      db: { condition: service_healthy }

  db:
    image: postgres:18-alpine
    environment:
      POSTGRES_USER:     dev
      POSTGRES_PASSWORD: dev
      POSTGRES_DB:       myapp
    volumes:
      - postgres_data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U dev"]
      interval: 5s
      retries: 5

volumes:
  postgres_data:
  node_modules:
```

```bash
# Inspect and manage the postgres volume
docker volume inspect docker_postgres_data
docker volume rm docker_postgres_data   # only when no container uses it
```

---

---
