# 3 — generator — Prisma Client Configuration

---

## T — TL;DR

The `generator` block tells Prisma what code to generate from your schema. In Prisma 7 the standard generator is `prisma-client` (the old `prisma-client-js` is deprecated), and `output` is **required** — the client is generated as plain TypeScript into your own source tree, no longer into `node_modules`. You import `PrismaClient` from that output path, and pass a driver adapter to its constructor. Run `prisma generate` explicitly: `migrate dev` and `db push` no longer run it for you.

---

## K — Key Concepts

```prisma
// ── Standard generator (Prisma 7) ──────────────────────────────────────────
generator client {
  provider = "prisma-client"            // before Prisma 7: "prisma-client-js"
  output   = "../src/generated/prisma"  // REQUIRED, relative to schema.prisma
}

// Generated files: src/generated/prisma/client.ts (+ models, enums, internal/)
// Usage: import { PrismaClient } from '@/generated/prisma/client'
// Before Prisma 7 the client was generated into node_modules/.prisma/client
// and imported from '@prisma/client'.
```

```ts
// ── Using the generated client: a driver adapter is mandatory ──────────────
// npm i @prisma/adapter-pg   (PostgreSQL)
import { PrismaClient } from '@/generated/prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL })
export const prisma = new PrismaClient({ adapter })
```

```prisma
// ── Generator fields ───────────────────────────────────────────────────────
generator client {
  provider        = "prisma-client"            // required
  output          = "../src/generated/prisma"  // required in Prisma 7
  previewFeatures = ["views"]                  // optional: enable preview features
  runtime         = "nodejs"                   // optional: target runtime (nodejs, bun, deno, workerd ...)
  moduleFormat    = "esm"                      // optional: esm | cjs (inferred from your project by default)
}
```

```
── Prisma 7 is ESM-first ──────────────────────────────────────────────────

Prisma 7 ships as ES modules:
  package.json  → "type": "module"
  tsconfig.json → "module": "ESNext", "moduleResolution": "bundler", "target": "ES2023"
Minimum Node.js 20.19, TypeScript 5.4.
```

```prisma
// ── binaryTargets — mostly gone ─────────────────────────────────────────────
// Prisma 6 and earlier shipped a Rust query-engine binary, so you had to list
// binaryTargets = ["native", "linux-musl-openssl-3.0.x", "rhel-openssl-3.0.x"]
// for Docker / Vercel / Lambda.
//
// Prisma 7 drops the Rust engine from the default setup: queries run through a
// TypeScript/WASM query compiler plus your driver adapter (pg).
// There is no platform-specific engine binary to download or mismatch, so you
// normally do NOT set binaryTargets at all.
```

```prisma
// ── previewFeatures ────────────────────────────────────────────────────────
generator client {
  provider        = "prisma-client"
  output          = "../src/generated/prisma"
  previewFeatures = ["views", "relationJoins"]
}

// Status (verify at https://pris.ly/d/preview-features):
// multiSchema          → GA since Prisma 6.13 — no flag needed
// tracing              → GA since Prisma 6.1 — no flag needed
// driverAdapters       → GA since Prisma 6.16 — no flag needed (and required in Prisma 7)
// views                → still preview: map Prisma models to SQL views (read-only)
// relationJoins        → listed as preview in the reference: SQL JOINs for relation loading
// postgresqlExtensions → manage PostgreSQL extensions in schema.prisma
```

```prisma
// ── Custom output path ────────────────────────────────────────────────────
generator client {
  provider = "prisma-client"
  output   = "../src/lib/prisma-client"
  // Useful when: monorepos, shared packages, custom module resolution
}

// Import changes to match:
import { PrismaClient } from '@/lib/prisma-client/client'
// Add the output folder to .gitignore if you don't want to commit generated code.
```

```prisma
// ── Multiple generators ────────────────────────────────────────────────────
// Run multiple generators simultaneously with prisma generate

generator client {
  provider = "prisma-client"
  output   = "../src/generated/prisma"
}

// Generate Zod validation schemas from Prisma models
generator zod {
  provider = "zod-prisma-types"
  output   = "./src/generated/zod"
}

// All generators run when you execute: npx prisma generate
```

```
── prisma generate — what it does ───────────────────────────────────────────

npx prisma generate

1. Reads schema.prisma (all .prisma files if multi-file)
2. Validates the schema (syntax + semantic checks)
3. Runs each generator block
4. For prisma-client:
   a. Generates TypeScript source for all models, enums and the client
   b. Writes it to the `output` folder you configured
   c. (No query-engine binary download in the default Prisma 7 setup)

Run after:
  - Any schema change
  - Fresh checkout / CI (the generated folder isn't in node_modules any more)
  - `migrate dev` / `db push` — Prisma 7 no longer runs generate for you
    (the --skip-generate flag was removed along with that behaviour)
```

```json
// package.json — generate after npm install (still a good habit in CI/Vercel)
{
  "scripts": {
    "postinstall": "prisma generate"
  }
}
```

---

## W — Why It Matters

- Because the client is generated into your own `src/` tree, your bundler, TypeScript and test runner treat it as ordinary source code — no `node_modules/.prisma` magic, better monorepo and edge/serverless support, and imports you can ctrl-click through.
- The driver adapter (`PrismaPg`) means your app's connection pool is the standard `pg` pool. This replaces the old engine-managed pool and removes the engine-binary footgun (`binaryTargets` mismatches between macOS dev and Linux containers).
- The `postinstall` hook (or an explicit `prisma generate` CI step) matters more now: the output folder is generated code that is usually git-ignored, so a fresh clone fails to compile until you generate.
- Multiple generators let you generate Zod schemas from Prisma models without maintaining two separate schemas — the Prisma model is the single source of truth.

---

## I — Interview Q&A

### Q: Why do you need to run `prisma generate` after every schema change and after `npm install`?

**A:** `prisma generate` produces the Prisma Client — TypeScript code specific to your exact schema. In Prisma 7 it is written to the `output` folder you configure (for example `src/generated/prisma`), which is typically git-ignored. If you change a model and don't regenerate, TypeScript has stale types. On a fresh clone or CI run the folder doesn't exist, so `import { PrismaClient } from '@/generated/prisma/client'` fails until you run `prisma generate` (or a `postinstall` hook). Also, since Prisma 7 `migrate dev` and `db push` no longer trigger generation automatically, you run it yourself.

### Q: What changed between `prisma-client-js` and `prisma-client`?

**A:** `prisma-client` is the new generator that outputs plain TypeScript into a required `output` directory instead of `node_modules/.prisma/client`, supports ESM/CJS and multiple runtimes, and works with driver adapters and no Rust engine. `prisma-client-js` is deprecated. You import from the generated path rather than `@prisma/client`.

---

## C — Common Pitfalls + Fix

### ❌ Using the old generator and import path

```prisma
// ❌ Prisma 5/6 style — deprecated in Prisma 7
generator client {
  provider = "prisma-client-js"
}
```

```ts
// ❌ new PrismaClient() with no adapter fails in Prisma 7
import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()
```

**Fix:**

```prisma
// ✅ Prisma 7
generator client {
  provider = "prisma-client"
  output   = "../src/generated/prisma"
}
```

```ts
import { PrismaClient } from '@/generated/prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
})
```

---

## K — Coding Challenge + Solution

### Challenge

Write the setup for a production app that: (1) uses the `prisma-client` generator with a custom output to `src/lib/db/client`, (2) enables the `relationJoins` preview feature, (3) connects to PostgreSQL through the `pg` driver adapter, (4) adds the `postinstall` script to `package.json`. Show the resulting import path. (No `binaryTargets` needed — explain why.)

### Solution

```prisma
// prisma/schema.prisma

generator client {
  provider        = "prisma-client"
  output          = "../src/lib/db/client"
  previewFeatures = ["relationJoins"]
  // No binaryTargets: Prisma 7 has no Rust engine binary to match to the OS.
}

datasource db {
  provider = "postgresql"
}
```

```ts
// prisma.config.ts
import 'dotenv/config'
import { defineConfig, env } from 'prisma/config'

export default defineConfig({
  schema: 'prisma/schema.prisma',
  datasource: { url: env('DATABASE_URL') },
})
```

```json
// package.json
{
  "name": "my-app",
  "type": "module",
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
import { PrismaClient } from './client/client'  // ← custom output path + /client
import { PrismaPg } from '@prisma/adapter-pg'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
    log: process.env.NODE_ENV === 'development'
      ? ['query', 'error', 'warn']
      : ['error'],
  })

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma
}
```
