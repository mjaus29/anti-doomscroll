# 3 — generator — Prisma Client Configuration

---

## T — TL;DR

The `generator` block tells Prisma what code to generate from your schema. The standard generator is `prisma-client-js` which produces the typed Prisma Client, TypeScript types, and DMMF (Data Model Meta Format). You can configure the output directory, add preview features, and even run multiple generators (e.g. also generating Zod schemas or JSON Schema). Run `prisma generate` to execute all generators.

---

## K — Key Concepts

```prisma
// ── Standard generator ─────────────────────────────────────────────────────
generator client {
  provider = "prisma-client-js"
}

// Default output: node_modules/.prisma/client
// Re-exported from: node_modules/@prisma/client
// Usage: import { PrismaClient } from '@prisma/client'
```

```prisma
// ── Generator fields ───────────────────────────────────────────────────────
generator client {
  provider        = "prisma-client-js"   // required: which generator to use
  output          = "../src/generated/prisma"  // optional: custom output path
  binaryTargets   = ["native"]           // optional: OS targets for query engine
  previewFeatures = ["multiSchema"]      // optional: enable preview features
}
```

```prisma
// ── binaryTargets — deployment target configuration ───────────────────────
generator client {
  provider      = "prisma-client-js"
  binaryTargets = ["native"]
  // "native" = detect current OS automatically (dev machines)
}

// For Docker (linux) + local dev (macOS or Windows):
generator client {
  provider      = "prisma-client-js"
  binaryTargets = ["native", "linux-musl-openssl-3.0.x"]
  // "linux-musl-openssl-3.0.x" = Alpine Linux (common Docker base image)
}

// For Vercel Edge / AWS Lambda (linux arm64):
generator client {
  provider      = "prisma-client-js"
  binaryTargets = ["native", "rhel-openssl-3.0.x"]
}

// Common targets:
// native                    → auto-detect (development)
// linux-musl-openssl-3.0.x  → Alpine Linux (Docker alpine:3.x)
// linux-musl-arm64-openssl-3.0.x → Alpine ARM64 (M1/M2 Mac Docker)
// rhel-openssl-3.0.x        → Amazon Linux 2023, RHEL, Vercel, Lambda
// debian-openssl-3.0.x      → Debian/Ubuntu (default Dockerfile FROM node)
```

```prisma
// ── previewFeatures ────────────────────────────────────────────────────────
generator client {
  provider        = "prisma-client-js"
  previewFeatures = ["multiSchema", "postgresqlExtensions", "views"]
}

// Preview features as of Prisma 7:
// multiSchema          → use multiple PostgreSQL schemas in one schema file
// postgresqlExtensions → manage PostgreSQL extensions in schema.prisma
// views                → map Prisma models to SQL views (read-only)
// tracing              → OpenTelemetry tracing for Prisma queries
// relationJoins        → use SQL JOINs instead of separate queries for relations (performance)

// Check stable vs preview status at: https://pris.ly/d/preview-features
```

```prisma
// ── Custom output path ────────────────────────────────────────────────────
generator client {
  provider = "prisma-client-js"
  output   = "../src/lib/prisma-client"
  // Useful when: monorepos, custom module resolution, avoiding node_modules pollution
}

// Import changes to match:
import { PrismaClient } from '../lib/prisma-client'
// instead of:
import { PrismaClient } from '@prisma/client'
```

```prisma
// ── Multiple generators ────────────────────────────────────────────────────
// Run multiple generators simultaneously with prisma generate

generator client {
  provider = "prisma-client-js"
}

// Generate Zod validation schemas from Prisma models
generator zod {
  provider = "zod-prisma-types"
  output   = "./src/generated/zod"
}

// Generate JSON Schema
generator jsonSchema {
  provider = "prisma-json-schema-generator"
  output   = "./src/generated/json-schema"
}

// All generators run when you execute: npx prisma generate
```

```
── prisma generate — what it does ───────────────────────────────────────────

npx prisma generate

1. Reads schema.prisma (all .prisma files if multi-file)
2. Validates the schema (syntax + semantic checks)
3. Runs each generator block in parallel
4. For prisma-client-js:
   a. Generates TypeScript types for all models and enums
   b. Compiles the Prisma Client runtime
   c. Downloads the query engine binary for the target platform
   d. Outputs to node_modules/.prisma/client (default)
5. The @prisma/client package re-exports from .prisma/client

Run after:
  - Any schema change
  - Fresh npm install (postinstall hook recommended)
  - Changing binaryTargets or previewFeatures
```

```json
// package.json — auto-run prisma generate after npm install
{
  "scripts": {
    "postinstall": "prisma generate"
  }
}
// This ensures the Prisma Client is always regenerated after dependencies are installed
// Required in CI/CD and Vercel deployments
```

---

## W — Why It Matters

- `binaryTargets` is the most common deployment footgun — if you develop on macOS and deploy to a Linux Docker container without setting the correct target, the query engine binary won't work in the container and Prisma throws a cryptic "Query engine binary not found" error at runtime. Set both `"native"` and your deployment target explicitly.
- The `postinstall` hook in `package.json` is essential for CI/CD and platforms like Vercel — without it, `@prisma/client` is installed but the generated client code is missing, causing import errors at runtime.
- Multiple generators let you generate Zod schemas from Prisma models without maintaining two separate schemas — the Prisma model is the single source of truth for both database structure and TypeScript/Zod validation.

---

## I — Interview Q&A

### Q: Why do you need to run `prisma generate` after every schema change and after `npm install`?

**A:** `prisma generate` produces the Prisma Client — a set of TypeScript types and runtime code specific to your exact schema. The generated client lives in `node_modules/.prisma/client` and is not checked into git (it's in `.gitignore`). If you change a model and don't regenerate, TypeScript will have stale types — it won't know about new fields or models. After `npm install` (e.g. in CI or on a new machine), `node_modules` is freshly populated but the generated client doesn't exist yet — only the base `@prisma/client` package is present. Running `prisma generate` (or the `postinstall` hook) creates the generated client. Without it, `import { PrismaClient } from '@prisma/client'` will fail or have incomplete types.

---

## C — Common Pitfalls + Fix

### ❌ Missing binaryTarget for Docker deployment

```prisma
// ❌ Only "native" — works on dev machine but fails in Docker
generator client {
  provider = "prisma-client-js"
  // binaryTargets not set — defaults to ["native"]
}
```

```dockerfile
# ❌ In Docker: Prisma can't find the Linux query engine binary
# Error: "Query engine binary for current platform 'linux-musl' not found"
```

**Fix:** Add the Docker target:

```prisma
// ✅ Include both dev (native) and production (linux) targets
generator client {
  provider      = "prisma-client-js"
  binaryTargets = ["native", "linux-musl-openssl-3.0.x"]
  // linux-musl = Alpine Linux (common in Docker FROM node:alpine)
  // debian-openssl-3.0.x for Debian/Ubuntu-based images
}
```

---

## K — Coding Challenge + Solution

### Challenge

Write the `generator` block for a production app that: (1) uses `prisma-client-js` with a custom output to `src/lib/db/client`, (2) includes binary targets for local macOS/Windows development AND Alpine Linux Docker deployment AND Vercel (RHEL), (3) enables the `relationJoins` preview feature for better JOIN performance, (4) add the `postinstall` script to `package.json`. Show the resulting import path.

### Solution

```prisma
// prisma/schema.prisma

generator client {
  provider        = "prisma-client-js"
  output          = "../src/lib/db/client"
  binaryTargets   = [
    "native",                         // local dev (macOS, Windows, Linux)
    "linux-musl-openssl-3.0.x",       // Docker Alpine (node:alpine)
    "linux-musl-arm64-openssl-3.0.x", // Docker Alpine ARM64 (M1/M2 Mac)
    "rhel-openssl-3.0.x"              // Vercel, AWS Lambda, Amazon Linux 2023
  ]
  previewFeatures = ["relationJoins"]
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}
```

```json
// package.json
{
  "name": "my-app",
  "scripts": {
    "postinstall": "prisma generate",
    "db:generate": "prisma generate",
    "db:migrate": "prisma migrate dev",
    "db:deploy": "prisma migrate deploy"
  }
}
```

```typescript
// src/lib/db/prisma.ts — singleton pattern
import { PrismaClient } from './client'  // ← custom output path

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === 'development'
      ? ['query', 'error', 'warn']
      : ['error'],
  })

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma
}
```

---

---
