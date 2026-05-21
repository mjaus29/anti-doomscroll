
# 📅 Day 6 — Docker for App Delivery

> **Goal:** Go from zero Docker knowledge to confidently writing production-grade Dockerfiles, wiring services with Compose, running tests in containers, and shipping reproducible CI/CD pipelines.
> **Format:** Each subtopic = 5–15 min. Do one. Stop. Come back.
> **Stack:** Docker Engine 29.x · Docker Compose v2 · Node.js 22 · Next.js 16 · PostgreSQL 18

---

## 📋 Day 6 Subtopic Overview

| # | Subtopic | Time |
|---|----------|------|
| 1 | Docker Architecture — Images, Containers, Registries | 10 min |
| 2 | Dockerfile Syntax and Layer Cache | 12 min |
| 3 | Bind Mounts vs Volumes — Data Persistence | 10 min |
| 4 | Container Networking — Bridge, DNS, Compose Networks | 10 min |
| 5 | Docker Compose — Services, Dependencies, Profiles | 12 min |
| 6 | Environment Variables — .env, ARG, ENV, Secrets | 10 min |
| 7 | Test Execution in Containers | 12 min |
| 8 | Database Containers for Integration Tests | 12 min |
| 9 | Multi-Stage Builds — Smaller, Safer Production Images | 12 min |
| 10 | CI/CD-Ready Reproducible Workflows | 12 min |

---

---

# 1 — Docker Architecture — Images, Containers, Registries

---

## T — TL;DR

Docker packages an application and its dependencies into an **image** — a read-only, layered snapshot. Running an image creates a **container** — an isolated process with its own filesystem, network, and process space. Images are stored in and pulled from **registries** (Docker Hub, GHCR, ECR). The Docker daemon does the heavy lifting; the CLI talks to it.

---

## K — Key Concepts

```
── Core concepts ─────────────────────────────────────────────────────────────

Image      → read-only template: OS + runtime + app code + config
             built from a Dockerfile, tagged with name:version
             stored locally (docker images) or in a registry

Container  → a running instance of an image
             isolated process with its own: filesystem, network interface, PID namespace
             writable layer on top of the image (ephemeral by default)
             stopped containers still exist — docker ps -a shows them

Registry   → image storage and distribution server
             Docker Hub: hub.docker.com (default)
             GHCR:       ghcr.io (GitHub Container Registry)
             ECR:        AWS Elastic Container Registry
             ACR:        Azure Container Registry

Daemon     → dockerd: background service that manages images, containers, volumes
CLI        → docker: sends commands to daemon via REST API (/var/run/docker.sock)
```

```bash
# ── Essential CLI commands ─────────────────────────────────────────────────

# Images
docker pull node:22-alpine          # download image from registry
docker images                       # list local images
docker rmi node:22-alpine           # remove local image
docker image prune                  # remove dangling (untagged) images

# Containers — run
docker run node:22-alpine node -e "console.log('hello')"
#       │    │               └─ command to run inside container
#       │    └─ image to use
#       └─ create + start container

docker run -it node:22-alpine sh    # -i = interactive, -t = TTY → shell inside container
docker run -d nginx                 # -d = detached (background)
docker run --name myapp -p 3000:3000 myapp:latest
#                        │   │
#                        │   └─ container port
#                        └─ host port

# Containers — manage
docker ps                           # running containers
docker ps -a                        # all containers (including stopped)
docker stop myapp                   # graceful stop (SIGTERM)
docker kill myapp                   # immediate stop (SIGKILL)
docker rm myapp                     # remove stopped container
docker logs myapp -f                # follow logs
docker exec -it myapp sh            # open shell in running container
```

```
── Image naming and tagging ─────────────────────────────────────────────────

[registry/][namespace/]name[:tag][@digest]

node:22-alpine                    → Docker Hub, official image, tag 22-alpine
postgres:18                       → Docker Hub, official, tag 18
myorg/myapp:1.0.0                 → Docker Hub, org namespace
ghcr.io/owner/myapp:sha-abc1234   → GHCR with git SHA tag
123456.dkr.ecr.us-east-1.amazonaws.com/myapp:latest  → ECR

Tag conventions:
  latest        → most recent (avoid in production — not immutable)
  1.0.0         → semantic version (immutable ✅)
  sha-abc1234   → git commit SHA (most immutable ✅)
  main-20250615 → branch + date
```

```bash
# ── Inspect an image ──────────────────────────────────────────────────────
docker inspect node:22-alpine     # full metadata JSON
docker history node:22-alpine     # show image layers + sizes
docker image ls --format "table {{.Repository}}\t{{.Tag}}\t{{.Size}}"
```

---

## W — Why It Matters

- Containers solve the "works on my machine" problem — the image contains exactly the same OS libraries, runtime version, and dependencies that will run in CI and production. No more `node_modules` differences between developers.
- Images are immutable and versioned — tagging with a git SHA means you can always reproduce exactly what was deployed. `latest` is mutable and should never be used as a deployment tag.
- Understanding the daemon/CLI split matters for CI — CI runners connect to Docker via `/var/run/docker.sock`. Mounting this socket in a container gives it full Docker control (security risk). Services like GitHub Actions use a Docker socket or a Docker-in-Docker sidecar.

---

## I — Interview Q&A

### Q: What is the difference between a Docker image and a container?

**A:** An image is a read-only, layered snapshot containing the OS filesystem, runtime, application code, and configuration — built from a Dockerfile and stored in a registry. It's the blueprint. A container is a running instance of an image — an isolated process that gets a writable layer on top of the image's read-only layers. Multiple containers can run from the same image simultaneously, each with its own isolated state. When a container is deleted, its writable layer is gone; the underlying image is unaffected. Think of an image as a class definition and a container as an instance.

---

## C — Common Pitfalls + Fix

### ❌ Using `:latest` tag in production — non-deterministic deployments

```bash
# ❌ "latest" changes whenever a new image is pushed — unpredictable rollbacks
docker pull myapp:latest
docker run myapp:latest

# ✅ Pin to an immutable tag
docker pull myapp:sha-abc1234
docker run myapp:sha-abc1234
```

---

## K — Coding Challenge + Solution

### Challenge

Run a temporary PostgreSQL container for local development: name it `dev-db`, expose port 5432, set password via environment variable, and verify it's running. Then show how to remove it completely.

### Solution

```bash
# Start PostgreSQL container
docker run -d \
  --name dev-db \
  -e POSTGRES_PASSWORD=devpass \
  -e POSTGRES_USER=devuser \
  -e POSTGRES_DB=myapp_dev \
  -p 5432:5432 \
  postgres:18-alpine

# Verify it's running
docker ps --filter name=dev-db

# Connect and verify
docker exec -it dev-db psql -U devuser -d myapp_dev -c '\l'

# Tail logs
docker logs dev-db -f

# Complete teardown
docker stop dev-db
docker rm dev-db
# Or one-liner:
docker rm -f dev-db
```

---

---

# 2 — Dockerfile Syntax and Layer Cache

---

## T — TL;DR

A `Dockerfile` is a script of instructions that build an image layer by layer. Each instruction creates a new read-only layer. Docker caches each layer — if neither the instruction nor its inputs changed, it reuses the cache. **Instruction order determines cache efficiency**: put infrequently-changing instructions first, frequently-changing ones last.

---

## K — Key Concepts

```dockerfile
# ── Dockerfile instruction reference ─────────────────────────────────────

FROM node:22-alpine          # base image — first instruction (required)

WORKDIR /app                 # set working directory (creates if missing)

COPY package*.json ./        # copy files from host into image
ADD  archive.tar.gz /app/    # like COPY but auto-extracts archives (prefer COPY)

RUN npm ci --frozen-lockfile  # execute command → creates a layer
                              # use && to chain commands in ONE layer

ENV NODE_ENV=production       # set environment variable (available at runtime)
ARG BUILD_VERSION=1.0.0       # build-time variable (NOT available at runtime)

EXPOSE 3000                   # document the port (doesn't actually publish)
                              # publish at runtime: docker run -p 3000:3000

USER node                     # switch to non-root user (security)

CMD ["node", "server.js"]     # default command — overridable at runtime
ENTRYPOINT ["node"]           # fixed command — CMD becomes default args
                              # CMD with ENTRYPOINT: ENTRYPOINT runs CMD as args
```

```dockerfile
# ── Layer cache — the most important Dockerfile concept ──────────────────
# Each RUN, COPY, ADD creates a layer
# Layer is cached based on: instruction text + input files
# Cache is INVALIDATED for a layer if: instruction changes OR inputs change
# All layers AFTER the invalidated one are also rebuilt

# ❌ Copies everything first — any file change invalidates npm ci
FROM node:22-alpine
WORKDIR /app
COPY . .                    # ← invalidated on ANY source change
RUN npm ci                  # ← always runs even if package.json unchanged ❌

# ✅ Copy package files first — npm ci only reruns when deps change
FROM node:22-alpine
WORKDIR /app
COPY package.json package-lock.json ./   # ← invalidated only when deps change
RUN npm ci --frozen-lockfile             # ← cached unless deps change ✅
COPY . .                                  # ← source changes don't rebuild node_modules
RUN npm run build
```

```dockerfile
# ── Combine RUN instructions to reduce layers ─────────────────────────────

# ❌ Three separate layers for related setup commands
RUN apt-get update
RUN apt-get install -y curl
RUN rm -rf /var/lib/apt/lists/*

# ✅ One layer — intermediate apt cache not saved in the image
RUN apt-get update && \
    apt-get install -y --no-install-recommends curl && \
    rm -rf /var/lib/apt/lists/*
```

```dockerfile
# ── .dockerignore — exclude files from build context ─────────────────────
# Without .dockerignore, COPY . . sends your entire directory to the daemon

# .dockerignore
node_modules/        # never copy — rebuild inside container
.git/
.next/
coverage/
*.log
.env
.env.local
Dockerfile*
docker-compose*.yml
README.md
```

```dockerfile
# ── Complete Node.js Dockerfile (non-multi-stage, development) ────────────
FROM node:22-alpine

# Install OS dependencies if needed
RUN apk add --no-cache libc6-compat

WORKDIR /app

# 1. Install deps (cached unless package files change)
COPY package.json package-lock.json ./
RUN npm ci --frozen-lockfile

# 2. Copy source (cache busted on any change — expected)
COPY . .

# 3. Build
RUN npm run build

# Non-root user for security
RUN addgroup -S appgroup && adduser -S appuser -G appgroup
USER appuser

EXPOSE 3000
CMD ["node", ".next/standalone/server.js"]
```

---

## W — Why It Matters

- Cache-busting `npm ci` on every source file change is the most common Dockerfile performance mistake — a `COPY . .` before `RUN npm ci` means every code change triggers a full dependency reinstall. The two-COPY pattern (package files first, source second) reduces build time from 3 minutes to 10 seconds after the first build.
- The `.dockerignore` file is as important as `.gitignore` — without it, `COPY . .` sends `node_modules` (possibly GB of files) as build context to the daemon, making every build take 30+ seconds even before any instruction runs.
- `USER node` (non-root) is a mandatory security practice — containers run as root by default, meaning a container escape vulnerability gives the attacker root on the host. Always switch to a non-root user before `CMD`.

---

## I — Interview Q&A

### Q: How does Docker layer caching work and how do you optimise a Dockerfile to maximise cache hits?

**A:** Every `RUN`, `COPY`, and `ADD` instruction creates an immutable layer. Docker checks the cache by hashing the instruction and its inputs — for `COPY`, it hashes the file contents. If the hash matches a cached layer, Docker reuses it without re-executing the instruction. All layers after a cache miss are rebuilt. To maximise cache hits: put instructions with stable inputs (OS package installs, `npm ci`) before instructions with volatile inputs (source code). The pattern is: `COPY package.json package-lock.json ./` → `RUN npm ci` → `COPY . .` → `RUN npm run build`. This way, dependency installation is cached unless `package.json` or `package-lock.json` change, and only the build step re-runs on source changes.

---

## C — Common Pitfalls + Fix

### ❌ `RUN npm install` instead of `npm ci` — non-deterministic builds

```dockerfile
# ❌ npm install may upgrade packages — not reproducible
RUN npm install

# ✅ npm ci uses lockfile exactly — reproducible and faster
RUN npm ci --frozen-lockfile
```

---

## K — Coding Challenge + Solution

### Challenge

Write a Dockerfile for a Next.js app that: maximises layer cache, excludes `node_modules`/`.next`/`.git` via `.dockerignore`, runs as a non-root user, uses `node:22-alpine`, exposes port 3000, and starts with `node server.js`. Include the `.dockerignore`.

### Solution

```dockerfile
# Dockerfile
FROM node:22-alpine
RUN apk add --no-cache libc6-compat
WORKDIR /app

# Layer 1: deps (cached until lockfile changes)
COPY package.json package-lock.json ./
RUN npm ci --frozen-lockfile

# Layer 2: source + build
COPY . .
RUN npm run build

# Non-root user
RUN addgroup --system appgroup && \
    adduser  --system --ingroup appgroup appuser
USER appuser

EXPOSE 3000
ENV NODE_ENV=production PORT=3000
CMD ["node", "server.js"]
```

```
# .dockerignore
node_modules/
.next/
.git/
coverage/
*.log
.env*
!.env.example
docker-compose*.yml
README.md
```

---

---

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

# 4 — Container Networking — Bridge, DNS, Compose Networks

---

## T — TL;DR

Docker containers communicate through virtual networks. The **bridge** network is the default — containers on the same bridge network can reach each other by container name as a hostname. Docker provides built-in DNS resolution within a network. In Compose, all services share a default network, so `db:5432` works as a hostname from `app` without any port mapping.

---

## K — Key Concepts

```bash
# ── Network types ─────────────────────────────────────────────────────────
# bridge (default): isolated virtual network, container-to-container by name
# host:             container shares host network stack (no isolation)
# none:             no network access
# overlay:          multi-host networking (Docker Swarm)

# ── Create and inspect networks ───────────────────────────────────────────
docker network create myapp-net
docker network ls
docker network inspect myapp-net
docker network rm myapp-net

# ── Connect containers to a network ──────────────────────────────────────
docker run -d --name db    --network myapp-net postgres:18-alpine
docker run -d --name app   --network myapp-net -e DB_HOST=db myapp:latest
#                                                         ↑
#                        "db" resolves to the db container's IP via Docker DNS ✅

# ── Port publishing: host:container ───────────────────────────────────────
docker run -p 3000:3000 myapp      # expose container port 3000 on host port 3000
docker run -p 127.0.0.1:3000:3000  # bind only to localhost (safer)
docker run -p 3000                  # random host port (docker port myapp for the mapping)
```

```yaml
# ── Compose networking — automatic service DNS ────────────────────────────
services:
  app:
    build: .
    environment:
      # Use service name "db" as hostname — Docker DNS resolves it ✅
      DATABASE_URL: postgresql://user:pass@db:5432/mydb
    networks:
      - backend

  db:
    image: postgres:18-alpine
    networks:
      - backend
    # No ports: — db is not exposed to host, only app can reach it ✅

  nginx:
    image: nginx:alpine
    ports:
      - "80:80"    # only nginx is exposed to the host
    networks:
      - backend
      - frontend

networks:
  backend:    # internal — app ↔ db
  frontend:   # external — nginx faces the host
```

```yaml
# ── Network isolation between services ────────────────────────────────────
# Only services on the same network can communicate
# Good practice: separate internal services from public-facing ones

services:
  web:
    networks: [public, internal]   # can reach both nginx and db

  db:
    networks: [internal]           # only reachable from services on internal ✅
    # No ports exposed to host

  redis:
    networks: [internal]           # same — internal only

networks:
  public:
  internal:
```

```bash
# ── Debugging container networking ───────────────────────────────────────
# From inside a container
docker exec -it app sh
  ping db                          # test DNS resolution
  wget -qO- http://db:5432         # test connectivity
  nslookup db                      # check DNS

# From host — check what ports are bound
docker port myapp
# 3000/tcp -> 0.0.0.0:3000
```

---

## W — Why It Matters

- Docker DNS within a Compose network is why `DATABASE_URL: postgresql://db:5432/mydb` works — you never need to know or hardcode container IPs. Container IPs are dynamic; service names are stable. Always use service names as hostnames.
- Not exposing the database port to the host (`ports:` section on the db service) is a security baseline — without a published port, the database is unreachable from outside Docker. This is the correct production posture even locally.
- Understanding Compose's default network (all services on one auto-created network) explains why simple Composefiles work without explicit `networks:` declarations — but explicit networks are better for security and clarity in production.

---

## I — Interview Q&A

### Q: How do two Docker containers communicate with each other by service name?

**A:** Docker provides embedded DNS within user-defined networks. When containers are on the same Docker network, Docker runs a DNS resolver at `127.0.0.11` inside each container. Any hostname matching a container name or Compose service name on the same network resolves to that container's virtual IP address. So `db:5432` from the `app` container works because Docker's DNS resolves `db` to the IP of the container named `db` on the shared network. This is automatic in Docker Compose — all services in the same Compose file share a default network, and service names become resolvable hostnames. Container IPs are not stable across restarts; service name DNS is.

---

## C — Common Pitfalls + Fix

### ❌ Publishing database port to all interfaces in production

```yaml
# ❌ PostgreSQL accessible from any host on port 5432
db:
  image: postgres:18-alpine
  ports:
    - "5432:5432"   # exposes to all network interfaces ❌
```

**Fix:** No published port for internal services, or bind to localhost only:

```yaml
# ✅ Option A: no ports (other services reach via Compose DNS)
db:
  image: postgres:18-alpine
  # no ports: section ✅

# ✅ Option B: bind to localhost only (for local dev access)
db:
  ports:
    - "127.0.0.1:5432:5432"   # only reachable from localhost ✅
```

---

## K — Coding Challenge + Solution

### Challenge

Create a Compose network topology for: `nginx` (public), `api` (internal + public), `db` (internal only), `redis` (internal only). Show how `api` connects to `db` and `redis` using service name DNS. Show the correct `ports:` for only nginx.

### Solution

```yaml
services:
  nginx:
    image: nginx:alpine
    ports: ["80:80", "443:443"]
    networks: [public, internal]
    depends_on: [api]

  api:
    build: .
    environment:
      DATABASE_URL: postgresql://user:pass@db:5432/myapp
      REDIS_URL:    redis://redis:6379
    networks: [internal]   # api is NOT on public — nginx proxies to it
    depends_on:
      db:    { condition: service_healthy }
      redis: { condition: service_started }

  db:
    image: postgres:18-alpine
    environment:
      POSTGRES_USER: user
      POSTGRES_PASSWORD: pass
      POSTGRES_DB: myapp
    networks: [internal]
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U user"]
      interval: 5s
      retries: 5

  redis:
    image: redis:7-alpine
    networks: [internal]

networks:
  public:    # nginx faces the outside world
  internal:  # api, db, redis — never exposed directly ✅
```

---

---

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

# 6 — Environment Variables — .env, ARG, ENV, Secrets

---

## T — TL;DR

Docker has two variable types: `ARG` (build-time only, not in final image) and `ENV` (runtime, baked into the image). Compose loads `.env` for variable substitution. Never bake secrets into images using `ENV` or `ARG` — they appear in `docker inspect` and image history. Use Docker secrets or runtime environment injection for sensitive values.

---

## K — Key Concepts

```dockerfile
# ── ARG vs ENV ────────────────────────────────────────────────────────────

# ARG — build-time only
ARG NODE_VERSION=22         # used during build
ARG BUILD_DATE               # pass with: docker build --build-arg BUILD_DATE=$(date)
FROM node:${NODE_VERSION}-alpine  # ARGs before FROM can be used in FROM

ARG APP_VERSION=1.0.0        # ARG after FROM — not available after image built
RUN echo "Building $APP_VERSION"  # available in build step

# ENV — runtime, persisted in image layers
ENV NODE_ENV=production      # accessible in CMD, ENTRYPOINT, and running container
ENV PORT=3000
ENV APP_HOME=/app

# ── NEVER use ARG for secrets ─────────────────────────────────────────────
# ARG SECRET_KEY=abc123  ← shows in docker history ❌
# ENV DB_PASS=password   ← shows in docker inspect + image metadata ❌
```

```yaml
# ── Compose .env file loading ─────────────────────────────────────────────
# Compose automatically loads .env from the same directory
# Variables are substituted in docker-compose.yml

# .env
POSTGRES_PASSWORD=devpass123
APP_PORT=3000
IMAGE_TAG=1.0.0

# docker-compose.yml — use ${VAR} syntax
services:
  app:
    image: myapp:${IMAGE_TAG}
    ports: ["${APP_PORT}:3000"]
  db:
    environment:
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD}   # from .env ✅
```

```yaml
# ── env_file vs environment in Compose ───────────────────────────────────
services:
  app:
    # Option A: explicit key=value
    environment:
      NODE_ENV: production
      PORT: 3000
      DATABASE_URL: postgresql://user:${DB_PASS}@db:5432/myapp

    # Option B: load from file
    env_file:
      - .env                # loads ALL variables from .env into container
      - .env.local          # override file (local dev, not committed)

    # Option C: passthrough from host (no value = uses host env)
    environment:
      CI:               # passes host $CI value into container
      DATABASE_URL:     # passes host $DATABASE_URL
```

```bash
# ── Runtime injection — correct way to handle secrets ────────────────────
# Don't bake secrets into images
# Inject at runtime via -e or --env-file

docker run \
  -e DATABASE_URL="postgresql://user:secret@db:5432/myapp" \
  -e JWT_SECRET="$(vault read secret/jwt)" \
  myapp:1.0.0

# In CI (GitHub Actions):
# env:
#   DATABASE_URL: ${{ secrets.DATABASE_URL }}
```

```yaml
# ── Docker secrets (Swarm / Compose v3) ───────────────────────────────────
# For production: use Docker secrets instead of environment variables
# Secret is mounted as a file in /run/secrets/ — not in env or image

# docker-compose.yml (Swarm or Compose with secrets support)
services:
  app:
    secrets: [db_password]
    # Read in app: fs.readFileSync('/run/secrets/db_password', 'utf-8')

secrets:
  db_password:
    file: ./secrets/db_password.txt    # local dev
    # external: true                    # production: managed by Docker Swarm
```

---

## W — Why It Matters

- `ARG SECRET=value` appears in `docker history` — anyone with pull access to the image can run `docker history --no-trunc myimage` and read every ARG value. Never use ARG or ENV for passwords, tokens, or API keys that should be secret.
- The `.env` file loaded by Compose is for variable substitution in `docker-compose.yml`, not automatically injected into containers — a common confusion. To inject into the container, use `env_file: [.env]` on the service OR reference the variable in `environment:`.
- Passthrough environment variables (`environment: DATABASE_URL:` with no value) let CI systems inject secrets from their secret stores — the container gets the value from the host without it being written anywhere in the Compose file or Dockerfile.

---

## I — Interview Q&A

### Q: What is the difference between `ARG` and `ENV` in a Dockerfile, and which should you use for a database password?

**A:** `ARG` declares a build-time variable — it exists only during `docker build` and is not present in the running container or its environment. `ENV` declares a runtime variable — it's baked into the image layers and available to any process running in the container, visible in `docker inspect`. Neither should be used for a database password: `ARG` values appear in `docker history` (readable by anyone with image access), and `ENV` values are stored in the image metadata (visible via `docker inspect`). The correct approach: inject secrets at runtime using `-e DB_PASS=value` in `docker run`, or via `env_file` pointing to a file that is never committed to version control. In production, use Docker secrets (Swarm) or a secrets manager (AWS Secrets Manager, Vault) that mounts the value as a file.

---

## C — Common Pitfalls + Fix

### ❌ Committing `.env` with real secrets to git

```bash
# ❌ Real credentials in .env committed to repo
echo "DATABASE_URL=postgresql://admin:prod_password@prod-db:5432/myapp" >> .env
git add .env && git commit   # credentials now in git history forever ❌
```

**Fix:**

```bash
# .gitignore
.env
.env.local
.env.*.local

# .env.example — commit this (shows required vars, no values)
DATABASE_URL=postgresql://USER:PASSWORD@HOST:PORT/DB
JWT_SECRET=CHANGE_ME
```

---

## K — Coding Challenge + Solution

### Challenge

Set up environment variable handling for a Next.js app in Compose: (1) `.env.example` showing all required vars; (2) Compose that uses `.env` for DB config; (3) app service that receives `DATABASE_URL` and `NODE_ENV` at runtime without baking secrets into the image; (4) a production-safe pattern using build ARGs only for non-secret build metadata.

### Solution

```bash
# .env.example (committed to git)
POSTGRES_USER=CHANGE_ME
POSTGRES_PASSWORD=CHANGE_ME
POSTGRES_DB=myapp
DATABASE_URL=postgresql://CHANGE_ME:CHANGE_ME@db:5432/myapp
NODE_ENV=production
APP_VERSION=0.0.0
```

```dockerfile
# Dockerfile — only non-secret ARGs
ARG NODE_VERSION=22
ARG APP_VERSION=unknown        # build metadata — not a secret
FROM node:${NODE_VERSION}-alpine
ARG APP_VERSION
ENV APP_VERSION=${APP_VERSION} \
    NODE_ENV=production        # safe default — overridden at runtime
WORKDIR /app
COPY package*.json ./
RUN npm ci --frozen-lockfile
COPY . .
RUN npm run build
USER node
CMD ["node", "server.js"]
```

```yaml
# docker-compose.yml
services:
  app:
    build:
      context: .
      args:
        APP_VERSION: ${APP_VERSION:-dev}   # from .env or 'dev' default
    environment:
      NODE_ENV:     ${NODE_ENV:-production}
      DATABASE_URL: ${DATABASE_URL}        # from host env or .env — injected at runtime ✅
    env_file: []   # explicit: no env_file — inject via environment: only
    depends_on:
      db: { condition: service_healthy }

  db:
    image: postgres:18-alpine
    environment:
      POSTGRES_USER:     ${POSTGRES_USER}
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD}
      POSTGRES_DB:       ${POSTGRES_DB}
    healthcheck:
      test:     ["CMD-SHELL", "pg_isready -U ${POSTGRES_USER:-postgres}"]
      interval: 5s
      retries:  5
```

---

---

# 7 — Test Execution in Containers

---

## T — TL;DR

Running tests inside containers guarantees the same Node.js version, OS libraries, and environment in CI and on every developer's machine. Use `docker compose run --rm` for one-off test runs, mount source as bind mount (no rebuild on code change), and use a dedicated test Compose file or profile that starts only what tests need.

---

## K — Key Concepts

```bash
# ── One-off test run in a container ──────────────────────────────────────
# docker compose run: starts a service, runs a command, exits
docker compose run --rm app npm test
#                  ├──── remove container after exit
#                  └──── app = service from docker-compose.yml

# With environment override
docker compose run --rm -e CI=true app npm run test:ci

# Run against a test compose file (separate from dev)
docker compose -f docker-compose.test.yml run --rm test
```

```yaml
# docker-compose.test.yml — dedicated test environment
services:
  test:
    build:
      context: .
      target: test          # multi-stage test stage (Subtopic 9)
    environment:
      NODE_ENV:     test
      DATABASE_URL: postgresql://test:test@test-db:5432/test_db
      CI:           "true"
    command: npm run test:ci
    volumes:
      - ./src:/app/src          # bind mount source — fast iteration
      - ./coverage:/app/coverage # write coverage to host ✅
    depends_on:
      test-db: { condition: service_healthy }

  test-db:
    image: postgres:18-alpine
    environment:
      POSTGRES_USER:     test
      POSTGRES_PASSWORD: test
      POSTGRES_DB:       test_db
    tmpfs:
      - /var/lib/postgresql/data  # in-memory — fast, ephemeral ✅
    healthcheck:
      test:     ["CMD-SHELL", "pg_isready -U test"]
      interval: 3s
      retries:  10
```

```yaml
# ── Profile-based test execution in main Compose file ────────────────────
services:
  app:
    build: .
    # ...

  db:
    image: postgres:18-alpine
    # ...

  test:
    build: .
    profiles: [test]
    command: npm run test:ci
    environment:
      DATABASE_URL: postgresql://dev:dev@db:5432/myapp
      NODE_ENV:     test
    depends_on:
      db: { condition: service_healthy }
    volumes:
      - ./coverage:/app/coverage
```

```bash
# ── Running tests in CI ───────────────────────────────────────────────────
# GitHub Actions workflow example:
# 1. Build test image
docker build --target test -t myapp:test .

# 2. Start dependencies only
docker compose -f docker-compose.test.yml up -d test-db

# 3. Run tests
docker compose -f docker-compose.test.yml run --rm test

# 4. Capture exit code
EXIT_CODE=$?
docker compose -f docker-compose.test.yml down -v
exit $EXIT_CODE
```

```bash
# ── Capturing coverage output from container ──────────────────────────────
# Mount coverage directory as bind mount
docker compose run --rm \
  -v $(pwd)/coverage:/app/coverage \
  test npm run test:ci

# Coverage files now on host: ./coverage/lcov.info
# Upload to Codecov from host
```

---

## W — Why It Matters

- `tmpfs` for the test database is 10–20× faster than a named volume for integration tests — PostgreSQL writes are buffered to RAM, not disk. Since test data is discarded after every run anyway, there's no reason to persist it to disk. A test suite that took 45 seconds drops to 20 seconds with `tmpfs`.
- Bind-mounting `./src` into the test container means you can iterate on tests without rebuilding the image — source changes are instantly visible to the container. Only rebuild when `package.json` or Dockerfile changes.
- Capturing the exit code from `docker compose run` is essential in CI — `run --rm` passes through the container's exit code (0 = tests passed, non-zero = failed). Without capturing it, CI may not correctly fail on test failures.

---

## I — Interview Q&A

### Q: What are the advantages of running tests inside Docker containers in CI?

**A:** Four main advantages: (1) environment parity — the same Node.js version, OS libraries, and npm packages run in CI that run locally and in production. "Passes locally, fails in CI" due to environment differences is eliminated. (2) Dependency isolation — each test run starts with a clean container, no pollution from a previous run's global state. (3) Service dependencies — database, Redis, and other services are described declaratively in Compose and start reliably before tests run, with health checks ensuring readiness. (4) Reproducibility — the Dockerfile is versioned in git, so you can reproduce any historical CI run exactly by checking out that commit and building the same image. The trade-off is build time for the first run and some Compose overhead, which is mitigated by layer caching.

---

## C — Common Pitfalls + Fix

### ❌ Not mounting `coverage/` — coverage report lost when container exits

```yaml
# ❌ Coverage written inside container — gone when container stops
test:
  command: npm run test:ci
  # no volumes — coverage/ disappears with the container ❌
```

**Fix:** Mount the coverage directory to the host:

```yaml
# ✅
test:
  command: npm run test:ci
  volumes:
    - ./coverage:/app/coverage   # coverage persists on host ✅
```

---

## K — Coding Challenge + Solution

### Challenge

Write a `docker-compose.test.yml` that: runs Vitest in CI mode with coverage, uses a PostgreSQL container with `tmpfs` for speed, waits for DB health before running tests, mounts `coverage/` output to the host, and exits cleanly with the correct code.

### Solution

```yaml
# docker-compose.test.yml
services:
  test:
    build:
      context: .
      dockerfile: Dockerfile
      target: test
    environment:
      NODE_ENV:     test
      CI:           "true"
      DATABASE_URL: postgresql://test:test@test-db:5432/test_db
    command: npm run test:ci
    volumes:
      - ./src:/app/src
      - ./coverage:/app/coverage
    depends_on:
      test-db: { condition: service_healthy }

  test-db:
    image: postgres:18-alpine
    environment:
      POSTGRES_USER:     test
      POSTGRES_PASSWORD: test
      POSTGRES_DB:       test_db
    tmpfs:
      - /var/lib/postgresql/data:noexec,nosuid,size=256m
    healthcheck:
      test:     ["CMD-SHELL", "pg_isready -U test"]
      interval: 3s
      timeout:  3s
      retries:  10
      start_period: 5s
```

```bash
# CI run script
docker compose -f docker-compose.test.yml up -d test-db
docker compose -f docker-compose.test.yml run --rm test
EXIT=$?
docker compose -f docker-compose.test.yml down -v
exit $EXIT
```

---

---

# 8 — Database Containers for Integration Tests

---

## T — TL;DR

Integration tests need a real database. The standard pattern: start PostgreSQL in Docker with `tmpfs`, run migrations once in `beforeAll`, wrap each test in a transaction that rolls back in `afterEach`. This gives full DB fidelity, fast isolated tests, and zero cleanup code. Alternatively, use a fresh DB per test file with `pg_dump`/restore or Prisma's `--force-reset`.

---

## K — Key Concepts

```typescript
// ── Pattern 1: transaction rollback (fastest) ─────────────────────────────
// One DB, one migration, transaction wraps each test

import { beforeAll, afterAll, beforeEach, afterEach } from 'vitest'
import { prisma } from '@/lib/prisma'
import { execSync } from 'child_process'

beforeAll(async () => {
  // Run migrations once for the whole suite
  execSync('npx prisma migrate deploy', {
    env: { ...process.env, DATABASE_URL: process.env.DATABASE_URL }
  })
})

afterAll(async () => {
  await prisma.$disconnect()
})

// Per-test transaction isolation
let transactionPrisma: typeof prisma

beforeEach(async () => {
  // Start a transaction — all operations in this test use it
  // Prisma interactive transaction gives an isolated client
  // Note: full rollback approach requires raw pg client or Prisma extension
})

afterEach(async () => {
  // Rollback — all test data gone, no cleanup code needed ✅
  await prisma.$executeRaw`ROLLBACK`
})
```

```typescript
// ── Pattern 2: truncate tables between tests (simpler) ────────────────────
// Faster than migration re-run, simpler than transactions

async function truncateAllTables() {
  const tables = await prisma.$queryRaw<{ tablename: string }[]>`
    SELECT tablename FROM pg_tables
    WHERE schemaname = 'public'
    AND tablename NOT IN ('_prisma_migrations')
  `
  for (const { tablename } of tables) {
    await prisma.$executeRawUnsafe(
      `TRUNCATE TABLE "${tablename}" RESTART IDENTITY CASCADE`
    )
  }
}

afterEach(async () => {
  await truncateAllTables()  // clean slate for next test ✅
})
```

```typescript
// ── Pattern 3: database per test file — maximum isolation ─────────────────
// Each test file gets its own fresh DB — no sharing, no order dependency
// Trade-off: slower (N migrations), uses more connections

import { randomUUID } from 'crypto'

const DB_NAME = `test_${randomUUID().replace(/-/g, '')}`
let DATABASE_URL: string

beforeAll(async () => {
  // Create a unique database for this test file
  const adminClient = new Client({ connectionString: process.env.ADMIN_DATABASE_URL })
  await adminClient.connect()
  await adminClient.query(`CREATE DATABASE "${DB_NAME}"`)
  await adminClient.end()

  DATABASE_URL = process.env.DATABASE_URL!.replace('/test_db', `/${DB_NAME}`)

  // Run migrations on the new DB
  execSync('npx prisma migrate deploy', {
    env: { ...process.env, DATABASE_URL }
  })
})

afterAll(async () => {
  await prisma.$disconnect()
  const adminClient = new Client({ connectionString: process.env.ADMIN_DATABASE_URL })
  await adminClient.connect()
  await adminClient.query(`DROP DATABASE IF EXISTS "${DB_NAME}"`)
  await adminClient.end()
})
```

```yaml
# docker-compose.test.yml — DB for integration tests
services:
  test-db:
    image: postgres:18-alpine
    environment:
      POSTGRES_USER:     test
      POSTGRES_PASSWORD: test
      POSTGRES_DB:       test_db
      # Allow creating additional databases (for Pattern 3)
      POSTGRES_HOST_AUTH_METHOD: trust
    ports:
      - "127.0.0.1:5433:5432"   # port 5433 — doesn't conflict with dev DB on 5432
    tmpfs:
      - /var/lib/postgresql/data
    healthcheck:
      test:     ["CMD-SHELL", "pg_isready -U test"]
      interval: 3s
      retries:  10
```

```bash
# ── Start test DB, run migrations, run tests ──────────────────────────────
# Useful local script: scripts/test-integration.sh

#!/bin/bash
set -e

# Start test DB
docker compose -f docker-compose.test.yml up -d test-db

# Wait for health
until docker compose -f docker-compose.test.yml exec test-db \
  pg_isready -U test; do sleep 1; done

# Run migrations
DATABASE_URL=postgresql://test:test@localhost:5433/test_db \
  npx prisma migrate deploy

# Run integration tests
DATABASE_URL=postgresql://test:test@localhost:5433/test_db \
  npx vitest run src/**/*.integration.test.ts

# Cleanup
docker compose -f docker-compose.test.yml down -v
```

---

## W — Why It Matters

- The truncate pattern is 90% of what teams need — it's simpler than transaction rollback (no need to pass a transaction client through all layers), faster than re-running migrations (just `TRUNCATE`), and easier to reason about than per-file databases.
- Port 5433 for the test DB prevents collisions with the dev DB on 5432 — developers can keep both running simultaneously. CI doesn't have a dev DB, so it doesn't matter there, but locally it's essential.
- `RESTART IDENTITY` in the truncate clears serial sequences — without it, IDs keep incrementing across test runs, which can confuse tests that hardcode or snapshot IDs. Always include it.

---

## I — Interview Q&A

### Q: How do you ensure test isolation when running integration tests against a real PostgreSQL database?

**A:** Three strategies, ordered by speed vs isolation: (1) Transaction rollback — wrap each test in a database transaction using `BEGIN` in `beforeEach` and `ROLLBACK` in `afterEach`. All changes are undone atomically. Fastest approach but requires all code to accept a transaction client. (2) Table truncation — run `TRUNCATE ... RESTART IDENTITY CASCADE` on all tables in `afterEach`. Slightly slower than rollback but works with any database client without needing to thread a transaction through the code. (3) Database-per-file — create a unique database for each test file in `beforeAll`, drop it in `afterAll`. Maximum isolation, no shared state between files, but requires N migrations and N database connections. For most projects, option 2 (truncate) is the best balance of simplicity, speed, and isolation.

---

## C — Common Pitfalls + Fix

### ❌ Forgetting `CASCADE` in TRUNCATE — FK constraint errors

```sql
-- ❌ FK constraints prevent truncating parent tables when children exist
TRUNCATE TABLE users;
-- ERROR: cannot truncate a table referenced in a foreign key constraint

-- ✅ CASCADE clears all dependent tables in correct order
TRUNCATE TABLE users RESTART IDENTITY CASCADE;
```

---

## K — Coding Challenge + Solution

### Challenge

Write a Vitest `setupTests.ts` that: (1) runs `prisma migrate deploy` once before all tests; (2) truncates all non-migration tables in `afterEach`; (3) disconnects Prisma in `afterAll`. Use a `DATABASE_URL` from environment.

### Solution

```typescript
// src/test/setup-db.ts
import { beforeAll, afterAll, afterEach } from 'vitest'
import { execSync }                        from 'child_process'
import { prisma }                          from '@/lib/prisma'

beforeAll(async () => {
  execSync('npx prisma migrate deploy', {
    stdio: 'inherit',
    env:   { ...process.env },
  })
}, 60_000)  // 60s timeout for migrations

afterEach(async () => {
  // Fetch all user tables, exclude Prisma migration tracking
  const tables = await prisma.$queryRaw<{ tablename: string }[]>`
    SELECT tablename
    FROM pg_tables
    WHERE schemaname = 'public'
      AND tablename NOT LIKE '_prisma%'
    ORDER BY tablename
  `
  if (tables.length === 0) return

  const tableList = tables
    .map(({ tablename }) => `"${tablename}"`)
    .join(', ')

  await prisma.$executeRawUnsafe(
    `TRUNCATE TABLE ${tableList} RESTART IDENTITY CASCADE`
  )
})

afterAll(async () => {
  await prisma.$disconnect()
})
```

```typescript
// vitest.config.ts — use setup file for integration tests
export default defineConfig({
  test: {
    setupFiles: ['./src/test/setup-db.ts'],
    pool:       'forks',          // isolated processes — safe for DB tests
    poolOptions: { forks: { singleFork: true } },  // serial — shared DB
  },
})
```

---

---

# 9 — Multi-Stage Builds — Smaller, Safer Production Images

---

## T — TL;DR

Multi-stage builds use multiple `FROM` instructions in one Dockerfile. Each stage can copy artifacts from previous stages. The production image only includes what's needed to run — no build tools, no dev dependencies, no source code. This cuts image size by 60–80% and reduces the attack surface.

---

## K — Key Concepts

```dockerfile
# ── Multi-stage Dockerfile for Next.js ────────────────────────────────────

# ─── Stage 1: deps ────────────────────────────────────────────────────────
FROM node:22-alpine AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --frozen-lockfile

# ─── Stage 2: builder ─────────────────────────────────────────────────────
FROM node:22-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules   # copy from deps stage
COPY . .
RUN npm run build
# At this point: full build output in .next/

# ─── Stage 3: test (optional) ─────────────────────────────────────────────
FROM builder AS test
ENV NODE_ENV=test
CMD ["npm", "run", "test:ci"]
# docker build --target test → use only this stage

# ─── Stage 4: runner (production) ─────────────────────────────────────────
FROM node:22-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production PORT=3000

# Copy ONLY what's needed to run (no node_modules, no source, no build tools)
COPY --from=builder /app/.next/standalone ./        # Next.js standalone output
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public

# Non-root user
RUN addgroup --system --gid 1001 nodejs && \
    adduser  --system --uid 1001 nextjs
USER nextjs

EXPOSE 3000
CMD ["node", "server.js"]
```

```
── Size comparison ────────────────────────────────────────────────────────────

Without multi-stage:
  Node.js 22 base + all node_modules + source + build output
  → ~1.2 GB

With multi-stage + alpine + standalone:
  node:22-alpine base + standalone server + static files only
  → ~150 MB   ← 87% reduction

Attack surface:
  No build tools (npm, webpack, esbuild, compilers)
  No dev dependencies (vitest, eslint, typescript)
  No source code (TypeScript files)
  No shell scripts used only during build
```

```dockerfile
# ── next.config.ts — enable standalone output ─────────────────────────────
# Required for the multi-stage runner pattern above
# next.config.ts:
# output: 'standalone'   ← traces dependencies, creates minimal server bundle
```

```dockerfile
# ── Reusable base stage pattern ───────────────────────────────────────────
# Share common setup across stages to maximise cache

FROM node:22-alpine AS base
RUN apk add --no-cache libc6-compat
WORKDIR /app
# This layer is shared by deps, builder, runner

FROM base AS deps
COPY package*.json ./
RUN npm ci --frozen-lockfile

FROM base AS builder
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

FROM base AS runner           # same base, smaller runtime
ENV NODE_ENV=production
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public
USER node
CMD ["node", "server.js"]
```

```bash
# ── Building specific stages ──────────────────────────────────────────────
docker build --target deps    -t myapp:deps    .   # only run deps install
docker build --target builder -t myapp:builder .   # build + compile
docker build --target test    -t myapp:test    .   # test stage
docker build --target runner  -t myapp:prod    .   # production image (default)
docker build                  -t myapp:prod    .   # builds to last stage
```

---

## W — Why It Matters

- A 150MB production image vs 1.2GB is not just storage savings — smaller images pull faster in CI (10s vs 90s), deploy faster, and have a fundamentally smaller attack surface. Every npm dev dependency not in the production image is a potential vulnerability removed.
- `output: 'standalone'` in Next.js enables the most minimal production image — Next.js traces all required files and creates a self-contained `server.js` with only the dependencies actually used. Without it, you'd need to copy all of `node_modules`.
- The `--target` flag is what makes the test stage practical in CI — `docker build --target test` runs only up to and including the test stage, skipping the production build. Tests run faster because the production build step is skipped.

---

## I — Interview Q&A

### Q: Why use multi-stage Docker builds and what goes in each stage?

**A:** Multi-stage builds allow each stage to serve a different purpose, with only the artifacts that stage produces being available to subsequent stages. A typical Node.js app has: (1) `deps` stage — installs all dependencies from the lockfile; this stage is cache-optimised (only rebuilds when `package.json` changes). (2) `builder` stage — copies source code, runs the TypeScript compiler and bundler; produces compiled output. (3) `runner` (production) stage — starts from a fresh minimal base image, copies only the compiled output (e.g. Next.js standalone bundle), adds a non-root user. The production image never contains TypeScript, webpack, test frameworks, or build scripts — only the runtime and compiled code. This reduces image size by 60–90% and removes entire vulnerability categories (no compiler, no package manager in production).

---

## C — Common Pitfalls + Fix

### ❌ Copying all of `node_modules` to the production stage

```dockerfile
# ❌ Copies all deps including devDependencies → huge production image
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/.next ./.next
# Image size: ~800MB ❌
```

**Fix:** Use Next.js standalone output which includes only used modules:

```typescript
// next.config.ts
export default { output: 'standalone' }
```

```dockerfile
# ✅ Only standalone bundle — no node_modules directory needed
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public
# Image size: ~150MB ✅
```

---

## K — Coding Challenge + Solution

### Challenge

Write a complete 4-stage Dockerfile (`base`, `deps`, `builder`, `runner`) for a Next.js app with `output: 'standalone'`. Include non-root user, correct ENV settings, and HEALTHCHECK. Show the build command for production and the image size inspection command.

### Solution

```dockerfile
# Dockerfile

# ── base: shared setup ────────────────────────────────────────────────────
FROM node:22-alpine AS base
RUN apk add --no-cache libc6-compat wget
WORKDIR /app

# ── deps: install production + dev deps ───────────────────────────────────
FROM base AS deps
COPY package.json package-lock.json ./
RUN npm ci --frozen-lockfile

# ── builder: compile ──────────────────────────────────────────────────────
FROM base AS builder
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ENV NEXT_TELEMETRY_DISABLED=1
RUN npm run build

# ── runner: minimal production image ─────────────────────────────────────
FROM base AS runner

ENV NODE_ENV=production \
    PORT=3000 \
    HOSTNAME="0.0.0.0" \
    NEXT_TELEMETRY_DISABLED=1

RUN addgroup --system --gid 1001 nodejs && \
    adduser  --system --uid 1001 nextjs

COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=builder --chown=nextjs:nodejs /app/public ./public

USER nextjs
EXPOSE 3000

HEALTHCHECK --interval=10s --timeout=5s --retries=3 \
  CMD wget -qO- http://localhost:3000/api/health || exit 1

CMD ["node", "server.js"]
```

```bash
# Build production image
docker build --target runner -t myapp:$(git rev-parse --short HEAD) .

# Check size
docker image ls myapp
docker history myapp:latest --no-trunc
```

---

---

# 10 — CI/CD-Ready Reproducible Workflows

---

## T — TL;DR

A CI/CD-ready Docker workflow: builds with layer cache (using registry cache or `cache-from`), tags with the git SHA for immutability, pushes to a registry, and deploys with a pull + run. GitHub Actions with Docker Buildx and registry cache makes this fast and deterministic. Every step is reproducible by checking out the same commit.

---

## K — Key Concepts

```yaml
# .github/workflows/ci.yml — complete Docker CI/CD pipeline
name: CI/CD

on:
  push:
    branches: [main]
  pull_request:

env:
  REGISTRY:   ghcr.io
  IMAGE_NAME: ${{ github.repository }}

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Run tests in Docker
        run: |
          docker compose -f docker-compose.test.yml run --rm test
          docker compose -f docker-compose.test.yml down -v
```

```yaml
  build-and-push:
    runs-on: ubuntu-latest
    needs: test
    if: github.ref == 'refs/heads/main'
    permissions:
      contents: read
      packages: write

    steps:
      - uses: actions/checkout@v4

      # ── Docker Buildx — enables advanced cache options ─────────────────
      - uses: docker/setup-buildx-action@v3

      # ── Login to GHCR ──────────────────────────────────────────────────
      - uses: docker/login-action@v3
        with:
          registry: ${{ env.REGISTRY }}
          username: ${{ github.actor }}
          password: ${{ secrets.GITHUB_TOKEN }}

      # ── Extract metadata for tags ──────────────────────────────────────
      - uses: docker/metadata-action@v5
        id: meta
        with:
          images: ${{ env.REGISTRY }}/${{ env.IMAGE_NAME }}
          tags: |
            type=sha,prefix=sha-          # sha-abc1234 — immutable ✅
            type=ref,event=branch         # main
            type=semver,pattern={{version}} # v1.2.3 if tagged

      # ── Build and push with registry cache ────────────────────────────
      - uses: docker/build-push-action@v5
        with:
          context: .
          target:  runner                 # production stage only
          push:    true
          tags:    ${{ steps.meta.outputs.tags }}
          labels:  ${{ steps.meta.outputs.labels }}
          cache-from: type=registry,ref=${{ env.REGISTRY }}/${{ env.IMAGE_NAME }}:buildcache
          cache-to:   type=registry,ref=${{ env.REGISTRY }}/${{ env.IMAGE_NAME }}:buildcache,mode=max
          build-args: |
            APP_VERSION=${{ github.sha }}
```

```bash
# ── Local simulation of CI build ──────────────────────────────────────────
# Reproduce what CI does locally (no surprises)

# Build production image
docker build \
  --target runner \
  --cache-from type=registry,ref=ghcr.io/myorg/myapp:buildcache \
  --build-arg APP_VERSION=$(git rev-parse --short HEAD) \
  -t myapp:$(git rev-parse --short HEAD) \
  .

# Test the production image locally
docker run --rm \
  -p 3000:3000 \
  -e DATABASE_URL="postgresql://..." \
  myapp:$(git rev-parse --short HEAD)
```

```yaml
# ── Multi-architecture builds (amd64 + arm64) ─────────────────────────────
# Required when deploying to AWS Graviton (arm64) or developing on Apple Silicon

      - uses: docker/setup-qemu-action@v3   # enables arm64 emulation

      - uses: docker/build-push-action@v5
        with:
          platforms: linux/amd64,linux/arm64
          # Everything else same as above
```

```bash
# ── Deployment — pull and run the immutable image ─────────────────────────
# On deploy target (server, Kubernetes, ECS):

# Pull the exact image built by CI
docker pull ghcr.io/myorg/myapp:sha-abc1234

# Deploy (Docker run, Compose, Kubernetes imagePullPolicy: Never, etc.)
docker run -d \
  --name myapp \
  --restart unless-stopped \
  -p 3000:3000 \
  -e DATABASE_URL="${DATABASE_URL}" \
  ghcr.io/myorg/myapp:sha-abc1234

# Rollback = re-run with the previous SHA tag
docker run -d ghcr.io/myorg/myapp:sha-previous123
```

```yaml
# ── docker-compose.prod.yml — production Compose ─────────────────────────
# Uses pre-built image, not build: context

services:
  app:
    image: ghcr.io/myorg/myapp:${IMAGE_TAG}   # set IMAGE_TAG=sha-abc1234 in env
    restart: unless-stopped
    ports: ["3000:3000"]
    environment:
      NODE_ENV:     production
      DATABASE_URL: ${DATABASE_URL}            # injected from host environment
    healthcheck:
      test:     ["CMD", "wget", "-qO-", "http://localhost:3000/api/health"]
      interval: 10s
      retries:  3
    depends_on:
      db: { condition: service_healthy }

  db:
    image: postgres:18-alpine
    restart: unless-stopped
    environment:
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD}
    volumes:
      - postgres_data:/var/lib/postgresql/data
    healthcheck:
      test:     ["CMD-SHELL", "pg_isready"]
      interval: 5s
      retries:  5

volumes:
  postgres_data:
```

---

## W — Why It Matters

- Registry cache (`cache-from/cache-to: type=registry`) makes repeated CI builds fast even on fresh runners — GitHub Actions runners are ephemeral (no local Docker cache). Without registry cache, every CI build starts cold and reinstalls all dependencies. Registry cache cuts build time from 5 minutes to 30 seconds after the first run.
- Tagging with git SHA is the foundation of reproducible deployments and reliable rollbacks — `latest` is mutable and tells you nothing about what code is running. `sha-abc1234` is permanent and links directly to the git commit. When a production issue appears, `git checkout abc1234` gives you exactly what's deployed.
- Separating `test` and `build-and-push` jobs means PRs always run tests but never push to the registry — pushed images are only produced from `main`, keeping the registry clean and ensuring only tested code becomes a deployment artifact.

---

## I — Interview Q&A

### Q: How do you make Docker builds fast and reproducible in a CI pipeline?

**A:** Four techniques: (1) Registry cache — use `cache-from: type=registry` with Buildx to store the layer cache in the registry itself. Ephemeral CI runners have no local cache, so without this every build is cold. Registry cache restores all unchanged layers from the previous build. (2) Layer-optimised Dockerfile — `COPY package.json` before `COPY . .` ensures `npm ci` is cached and only re-runs when dependencies change. (3) Multi-stage builds — only the final `runner` stage is pushed to the registry; intermediate stages are cache entries used to speed up subsequent builds. (4) Immutable SHA tags — every pushed image gets the git commit SHA as a tag. CI deploys by SHA, not `latest`, ensuring the exact artifact that passed tests is what gets deployed. Combined, these make typical builds 20–40 seconds after the first run and guarantee that checking out a commit and building reproduces the same image.

---

## C — Common Pitfalls + Fix

### ❌ Pushing `latest` tag only — can't roll back to a specific version

```yaml
# ❌ Only "latest" — what was deployed last Tuesday?
tags: ghcr.io/myorg/myapp:latest
# Rollback: impossible to know which image to pull ❌
```

**Fix:** Always tag with SHA:

```yaml
# ✅ SHA tag (immutable) + latest (convenience)
tags: |
  ghcr.io/myorg/myapp:sha-${{ github.sha }}
  ghcr.io/myorg/myapp:latest
# Deploy with SHA tag; rollback by deploying previous SHA ✅
```

---

## K — Coding Challenge + Solution

### Challenge

Write a complete GitHub Actions workflow that: (1) runs tests with `docker compose run`; (2) builds a multi-stage production image with registry cache; (3) pushes to GHCR with SHA + branch tags; (4) only pushes on `main`; (5) uses `GITHUB_TOKEN` for auth.

### Solution

```yaml
# .github/workflows/docker.yml
name: Docker Build and Push

on:
  push:
    branches: [main, develop]
  pull_request:

env:
  REGISTRY:   ghcr.io
  IMAGE_NAME: ${{ github.repository }}

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Test
        run: |
          docker compose -f docker-compose.test.yml up -d test-db
          docker compose -f docker-compose.test.yml run --rm test
          EXIT=$?
          docker compose -f docker-compose.test.yml down -v
          exit $EXIT

  build:
    runs-on: ubuntu-latest
    needs: test
    permissions:
      contents: read
      packages: write

    steps:
      - uses: actions/checkout@v4

      - uses: docker/setup-buildx-action@v3

      - uses: docker/login-action@v3
        if: github.event_name != 'pull_request'
        with:
          registry:  ${{ env.REGISTRY }}
          username:  ${{ github.actor }}
          password:  ${{ secrets.GITHUB_TOKEN }}

      - uses: docker/metadata-action@v5
        id: meta
        with:
          images: ${{ env.REGISTRY }}/${{ env.IMAGE_NAME }}
          tags: |
            type=sha,prefix=sha-
            type=ref,event=branch
            type=raw,value=latest,enable=${{ github.ref == 'refs/heads/main' }}

      - uses: docker/build-push-action@v5
        with:
          context:    .
          target:     runner
          push:       ${{ github.event_name != 'pull_request' }}
          tags:       ${{ steps.meta.outputs.tags }}
          labels:     ${{ steps.meta.outputs.labels }}
          cache-from: type=registry,ref=${{ env.REGISTRY }}/${{ env.IMAGE_NAME }}:buildcache
          cache-to:   type=registry,ref=${{ env.REGISTRY }}/${{ env.IMAGE_NAME }}:buildcache,mode=max
          build-args: APP_VERSION=${{ github.sha }}
```

---

## ✅ Day 6 Complete — Docker for App Delivery

| # | Subtopic | Status |
|---|----------|--------|
| 1 | Architecture — Images, Containers, Registries | ☐ |
| 2 | Dockerfile Syntax and Layer Cache | ☐ |
| 3 | Bind Mounts vs Volumes | ☐ |
| 4 | Container Networking | ☐ |
| 5 | Docker Compose — Services, Dependencies, Profiles | ☐ |
| 6 | Environment Variables — .env, ARG, ENV | ☐ |
| 7 | Test Execution in Containers | ☐ |
| 8 | Database Containers for Integration Tests | ☐ |
| 9 | Multi-Stage Builds | ☐ |
| 10 | CI/CD-Ready Reproducible Workflows | ☐ |

---

## 🗺️ One-Page Mental Model — Day 6

```
CORE CONCEPTS
  Image     → immutable layered snapshot (built from Dockerfile, stored in registry)
  Container → running process with isolated FS + network (writable layer on top)
  Registry  → image storage: Docker Hub, GHCR (ghcr.io), ECR
  Tag:      → name:tag — use SHA not latest in production

DOCKERFILE + LAYER CACHE
  Each RUN/COPY/ADD = one layer, cached by hash of instruction + inputs
  Cache invalidated: instruction changes OR input files change → all layers after rebuild
  Order: COPY package.json → RUN npm ci → COPY . . → RUN build (cache npm ci ✅)
  Combine RUN with && — one layer, no intermediate files saved
  .dockerignore: exclude node_modules/, .git/, .next/, .env*
  USER node — always switch to non-root before CMD
  RUN npm ci --frozen-lockfile — never npm install (non-deterministic)

VOLUMES + MOUNTS
  Named volume:  Docker-managed, portable, for DB data in production
  Bind mount:    host path → container, for dev source code (live reload)
  tmpfs:         RAM only, fast + ephemeral, for test DB or temp secrets
  node_modules:  always use anonymous volume to shadow host's node_modules
  Dev pattern:   bind mount src/ + anonymous volume for /app/node_modules

NETWORKING
  Bridge network: default — containers reach each other by container/service name
  Docker DNS: service name resolves to container IP (127.0.0.11 inside containers)
  Compose: all services share default network — db:5432 works without publishing
  Never publish DB port to 0.0.0.0 — use 127.0.0.1:5432:5432 or no ports:
  Network isolation: separate public (nginx) from internal (db, redis, api)

COMPOSE
  depends_on + condition: service_healthy → wait for healthcheck (not just start)
  healthcheck: pg_isready for postgres, wget for HTTP services
  profiles: [tools] — opt-in services (pgAdmin, mailhog)
  docker-compose.override.yml — auto-merged locally, not in CI
  docker compose run --rm app npm test — one-off test command
  docker compose down -v — ⚠️ removes volumes (use intentionally)

ENVIRONMENT VARIABLES
  ARG  → build-time only, NOT in final image, BUT visible in docker history
  ENV  → runtime, baked into image, visible in docker inspect
  NEVER use ARG or ENV for secrets — inject at runtime via -e or env_file
  .env → loaded by Compose for variable substitution in yml
  env_file: [.env] → inject all vars from file into container
  passthrough: environment: DATABASE_URL: (no value) → uses host env ✅

TEST EXECUTION
  docker compose run --rm test npm run test:ci
  Bind mount ./src + ./coverage for fast iteration and output capture
  Use tmpfs for test DB — 10-20× faster than named volume
  Serial test execution: poolOptions.forks.singleFork: true
  Capture exit code from docker compose run for CI pass/fail
  docker-compose.test.yml — separate from dev Compose file

DATABASE CONTAINERS FOR TESTS
  Pattern 1: TRUNCATE ... RESTART IDENTITY CASCADE in afterEach (recommended)
  Pattern 2: Transaction + ROLLBACK in afterEach (fastest, needs tx threading)
  Pattern 3: DB-per-file (maximum isolation, slowest)
  Port 5433 for test DB — avoids collision with dev DB on 5432
  pg_isready healthcheck — wait until DB accepts connections
  tmpfs for /var/lib/postgresql/data — no disk I/O in tests

MULTI-STAGE BUILDS
  Stage: base (shared) → deps (npm ci) → builder (compile) → runner (production)
  COPY --from=builder .next/standalone ./ — Next.js standalone = no node_modules ✅
  next.config.ts: output: 'standalone' — required for minimal production image
  docker build --target test → run only to test stage (skip production build in CI)
  Size: ~1.2GB without multistage → ~150MB with multistage + alpine + standalone
  Non-root user: addgroup + adduser + USER before CMD

CI/CD
  docker/setup-buildx-action → enables BuildKit + cache options
  cache-from/cache-to type=registry → persistent cache across ephemeral runners
  docker/metadata-action → generates SHA + branch + semver tags automatically
  Push only on non-PR events: push: ${{ github.event_name != 'pull_request' }}
  Tag pattern: sha-abc1234 (immutable) + branch + latest (main only)
  Rollback = docker run ghcr.io/org/app:sha-previous123
  Multi-arch: setup-qemu + platforms: linux/amd64,linux/arm64

KEY RULES
  Never use :latest as deployment tag — use SHA
  Never bake secrets into ENV or ARG — inject at runtime
  Always .dockerignore — never copy node_modules into build context
  Always non-root USER in production images
  Always condition: service_healthy for DB dependencies
  Always tmpfs for test databases (speed + ephemeral)
  Always registry cache in CI — ephemeral runners have no local cache
  Always multi-stage — dev deps must never reach the production image
```

> **Your next action:** Add a `.dockerignore` to your project right now — just five lines: `node_modules/`, `.next/`, `.git/`, `coverage/`, `.env`. Then run `docker build .` and watch the build context size drop.

> "Doing one small thing beats opening a feed."