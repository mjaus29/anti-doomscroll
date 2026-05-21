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
