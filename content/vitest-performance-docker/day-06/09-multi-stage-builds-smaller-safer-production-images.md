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
