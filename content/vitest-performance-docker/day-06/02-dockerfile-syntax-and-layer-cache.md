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
