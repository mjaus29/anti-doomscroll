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
