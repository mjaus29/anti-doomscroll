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
