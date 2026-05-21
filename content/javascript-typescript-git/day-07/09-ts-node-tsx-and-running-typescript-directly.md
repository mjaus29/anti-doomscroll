# 9 — ts-node, tsx, and Running TypeScript Directly

---

## T — TL;DR

`ts-node` runs `.ts` files without manual compilation — ideal for scripts and development. `tsx` is a faster, ESM-compatible alternative using esbuild. For production, compile with `tsc` and run the `.js` output. Know the tradeoffs and common configuration for each tool.

---

## K — Key Concepts

```bash
# ── Installation ──────────────────────────────────────────────────────────
npm install --save-dev ts-node tsx typescript @types/node

# ── ts-node — TypeScript execution in Node.js ─────────────────────────────
npx ts-node src/server.ts           # run TypeScript file directly
npx ts-node --esm src/server.ts     # ESM mode (requires "type":"module")
npx ts-node -e "console.log('hello')"  # evaluate TypeScript expression
npx ts-node-esm src/server.ts       # convenience alias for --esm

# ── tsx — faster alternative (esbuild-based) ──────────────────────────────
npx tsx src/server.ts               # run TypeScript file (ESM and CJS)
npx tsx watch src/server.ts         # watch mode — restart on change
npx tsx --tsconfig tsconfig.json src/server.ts

# tsx is significantly faster than ts-node (esbuild vs tsc transpilation)
# tsx does NOT type-check — it only transpiles
# Use tsx for: development server, scripts, quick runs
# Use tsc for: type-checking in CI, production builds
```

```json
// package.json scripts
{
  "scripts": {
    "dev":       "tsx watch src/server.ts",
    "start":     "node dist/server.js",
    "build":     "tsc --project tsconfig.build.json",
    "typecheck": "tsc --noEmit",
    "script":    "tsx scripts/seed.ts"
  }
}
```

```json
// tsconfig.json for ts-node with ESM
{
  "compilerOptions": {
    "module":           "NodeNext",
    "moduleResolution": "NodeNext",
    "target":           "ES2022",
    "strict":           true
  },
  "ts-node": {
    "esm":                true,
    "experimentalSpecifierResolution": "node"
  }
}
```

```typescript
// ── Running TypeScript scripts with tsx ────────────────────────────────────
// scripts/seed.ts
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function seed() {
  await prisma.user.createMany({
    data: [
      { name: 'Alice', email: 'alice@ex.com' },
      { name: 'Bob',   email: 'bob@ex.com' },
    ]
  })
  console.log('Seeded ✅')
}
seed().catch(console.error).finally(() => prisma.$disconnect())

// Run: npx tsx scripts/seed.ts
```

```typescript
// ── Type checking in CI (tsc --noEmit) ────────────────────────────────────
// tsx/ts-node don't type check — always run tsc --noEmit in CI

// .github/workflows/ci.yml
// - run: npm run typecheck   # tsc --noEmit
// - run: npm run lint        # eslint
// - run: npm test            # vitest

// The pattern:
// Local dev:  tsx (fast, no type check) → immediate feedback
// Pre-commit: tsc --noEmit + eslint (type check)
// CI:         tsc --noEmit + tests + build
```

---

## W — Why It Matters

- `tsx` is 5–10x faster than `ts-node` for startup because esbuild strips types without type-checking — for a dev server that restarts on every file change, this matters significantly.
- `tsc --noEmit` in CI is non-negotiable — `tsx` and `ts-node` may run code that has type errors. The type-check step is the only guarantee that your deployed code is type-safe.
- The `watch` mode with `tsx watch` replaces `nodemon + ts-node` with a single command and faster restarts — essential quality of life for Node.js API development.

---

## I — Interview Q&A

### Q: What is the difference between `ts-node` and `tsx`, and which would you use for what?

**A:** Both run TypeScript files without a separate compilation step. `ts-node` uses the TypeScript compiler (`tsc`) to transpile, which means it performs full type checking — slower but guarantees type safety at runtime too. `tsx` uses esbuild to strip types and transpile, making it 5–10x faster, but it does NOT type-check. Use `tsx` for: local development servers (`tsx watch`), scripts and tooling, any situation where you also run `tsc --noEmit` separately. Use `ts-node` when: you specifically need type-checking during execution, or when compatibility with certain TypeScript transformer features is required. In production, always compile with `tsc` and run plain `.js`.

---

## C — Common Pitfalls + Fix

### ❌ Relying on `tsx` in CI instead of `tsc --noEmit`

```bash
# ❌ tsx runs without type checking — type errors reach production
# CI script:
tsx src/build.ts  # runs even with type errors ❌

# ✅ Always add typecheck step
# package.json:
# "typecheck": "tsc --noEmit"

# CI:
npm run typecheck   # fail CI on type errors ✅
npm run build       # only builds if type-check passes
```

---

## K — Coding Challenge + Solution

### Challenge

Set up a minimal Node.js TypeScript project from scratch: `package.json` with scripts, `tsconfig.json` for Node 22 + ESM, and a `src/index.ts` that uses top-level await and `import.meta.dirname`.

### Solution

```json
// package.json
{
  "name": "my-api",
  "type": "module",
  "scripts": {
    "dev":       "tsx watch src/index.ts",
    "build":     "tsc --project tsconfig.build.json",
    "start":     "node dist/index.js",
    "typecheck": "tsc --noEmit"
  },
  "devDependencies": {
    "typescript": "^6.0.0",
    "@types/node": "^22.0.0",
    "tsx":        "^4.0.0"
  }
}
```

```json
// tsconfig.json
{
  "compilerOptions": {
    "target":               "ES2022",
    "module":               "NodeNext",
    "moduleResolution":     "NodeNext",
    "strict":               true,
    "noEmit":               true,
    "noUncheckedIndexedAccess": true,
    "useUnknownInCatchVariables": true,
    "esModuleInterop":      true,
    "skipLibCheck":         true
  },
  "include": ["src/**/*"]
}
```

```typescript
// src/index.ts
import { readdir } from 'fs/promises'
import path from 'path'

const dir   = import.meta.dirname          // Node 22+ ✅
const files = await readdir(dir)          // top-level await ✅

console.log(`Files in ${dir}:`)
for (const file of files) {
  console.log(`  ${file}`)
}
```

---

---
