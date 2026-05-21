# 2 — tsc and tsconfig.json — Core Compiler Options

---

## T — TL;DR

`tsc` is the TypeScript compiler. `tsconfig.json` configures it. Key settings: `strict` (enables all safety checks), `target` (output JS version), `module`/`moduleResolution` (import system), `paths`/`baseUrl` (path aliases), `noEmit` (type-check only). A well-configured `tsconfig.json` is the foundation of every TypeScript project.

---

## K — Key Concepts

```json
// tsconfig.json — production-ready Node.js 22 + ESM config
{
  "compilerOptions": {
    // ── Output ──────────────────────────────────────────────────────────
    "target":  "ES2022",        // compile to ES2022 JS (Node 22 supports it natively)
    "module":  "NodeNext",      // ESM with CommonJS interop for Node.js
    "outDir":  "./dist",        // compiled output folder
    "rootDir": "./src",         // source root

    // ── Module resolution ────────────────────────────────────────────────
    "moduleResolution":   "NodeNext",  // matches "module": "NodeNext"
    "esModuleInterop":    true,        // import express from 'express' (default import CJS)
    "allowSyntheticDefaultImports": true,  // implied by esModuleInterop

    // ── Strictness ───────────────────────────────────────────────────────
    "strict": true,            // enables all strict checks (see Subtopic 3)
    "noImplicitReturns": true, // functions must return on all paths
    "noFallthroughCasesInSwitch": true,  // no fall-through in switch
    "noUncheckedIndexedAccess": true,    // arr[0] is T | undefined, not T
    "useUnknownInCatchVariables": true,  // catch (e: unknown) not any

    // ── Emit ─────────────────────────────────────────────────────────────
    "noEmit": false,           // set true for type-check-only (e.g., with bundler)
    "noEmitOnError": true,     // don't emit if type errors exist
    "declaration": true,       // generate .d.ts files (for libraries)
    "sourceMap": true,         // .js.map for debugging

    // ── Code quality ──────────────────────────────────────────────────────
    "skipLibCheck": true,      // don't type-check .d.ts in node_modules (faster)
    "forceConsistentCasingInFileNames": true,  // prevents case-sensitivity bugs
    "verbatimModuleSyntax": true,  // enforce import type for type-only imports
    "isolatedModules": true,   // required for Babel/esbuild/Vite transpilation

    // ── Path aliases ──────────────────────────────────────────────────────
    "baseUrl": ".",
    "paths": {
      "@/*": ["src/*"]         // import { x } from '@/utils' → src/utils
    }
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist"]
}
```

```bash
# ── CLI usage ──────────────────────────────────────────────────────────────
tsc                     # compile using tsconfig.json in current directory
tsc --noEmit            # type-check only — no output files
tsc --watch             # watch mode — recompile on change
tsc --project ./tsconfig.build.json   # use a specific config

# Check TypeScript version
tsc --version           # Version 6.0.x
npx tsc --version       # via npx

# Install
npm install --save-dev typescript @types/node
```

```json
// ── Multiple tsconfig files — common pattern ──────────────────────────────
// tsconfig.json — base (shared settings)
{
  "compilerOptions": { "strict": true, "target": "ES2022" }
}

// tsconfig.build.json — production build
{
  "extends": "./tsconfig.json",
  "compilerOptions": { "noEmit": false, "outDir": "dist" },
  "exclude": ["**/*.test.ts", "**/*.spec.ts"]
}

// tsconfig.test.json — test environment
{
  "extends": "./tsconfig.json",
  "compilerOptions": { "types": ["vitest/globals"] }
}
```

```typescript
// ── moduleResolution: "NodeNext" vs "Bundler" ─────────────────────────────
// NodeNext: requires explicit .js extensions in imports (matches Node.js ESM)
import { helper } from './utils.js'   // ← .js required with NodeNext ✅

// Bundler (for Vite/webpack projects): no extension needed
import { helper } from './utils'      // ← bundler resolves it ✅

// esModuleInterop: true enables:
import express from 'express'   // ✅ (without it: import * as express from 'express')
import fs      from 'fs'        // ✅ default import from CJS module

// verbatimModuleSyntax: true enforces:
import type { User } from './types.js'   // ✅ type-only import
import { User } from './types.js'        // ❌ if User is only a type — must use import type
```

---

## W — Why It Matters

- `"strict": true` is the single most important option — it enables all the checks that make TypeScript actually safe. Most guides skip this or leave it false, then wonder why bugs still happen.
- `moduleResolution: "NodeNext"` with `"module": "NodeNext"` is the correct pairing for Node.js 22 ESM projects — mismatching these is responsible for 80% of "module not found" TypeScript errors in new projects.
- `noUncheckedIndexedAccess` closes a real safety hole — without it, `arr[0]` is typed as `T`, but the array might be empty. With it, `arr[0]` is `T | undefined`, forcing you to check.

---

## I — Interview Q&A

### Q: What does `"strict": true` enable and why should you always use it?

**A:** `strict: true` enables a group of strictness checks: `strictNullChecks` (null/undefined not assignable to other types), `noImplicitAny` (variables must have a type), `strictFunctionTypes` (function parameter types checked contravariantly), `strictPropertyInitialization` (class properties must be assigned in constructor), `strictBindCallApply` (call/apply/bind are type-checked), `strictBuiltinIteratorReturn`, and `noImplicitThis`. Without `strict`, TypeScript is significantly less safe — `any` sneaks in everywhere, null dereference bugs survive type checking. Use `strict: true` from day one; adding it to an existing project is painful.

---

## C — Common Pitfalls + Fix

### ❌ `moduleResolution` and `module` mismatch

```json
// ❌ Mismatch — causes resolution errors for .js imports, ESM packages
{
  "compilerOptions": {
    "module": "NodeNext",
    "moduleResolution": "node"   // ❌ wrong — "node" is for CJS
  }
}

// ✅ Always pair them correctly
// Node.js ESM project:
{ "module": "NodeNext", "moduleResolution": "NodeNext" }

// Browser/bundler project:
{ "module": "ESNext",   "moduleResolution": "Bundler"  }

// Legacy Node.js CJS:
{ "module": "CommonJS", "moduleResolution": "node"     }
```

---

## K — Coding Challenge + Solution

### Challenge

Create a minimal `tsconfig.json` for a Next.js 16 project (uses Bundler resolution, React JSX, path alias `@/` → `src/`). Then create one for a Node.js 22 API server (NodeNext, strict, outputs to `dist/`).

### Solution

```json
// tsconfig.json — Next.js 16 project
{
  "compilerOptions": {
    "target":               "ES2022",
    "lib":                  ["dom", "dom.iterable", "ES2022"],
    "module":               "ESNext",
    "moduleResolution":     "Bundler",
    "jsx":                  "preserve",
    "strict":               true,
    "noEmit":               true,
    "esModuleInterop":      true,
    "allowJs":              true,
    "skipLibCheck":         true,
    "verbatimModuleSyntax": true,
    "noUncheckedIndexedAccess": true,
    "baseUrl":              ".",
    "paths": { "@/*": ["./src/*"] }
  },
  "include": ["next-env.d.ts", "**/*.ts", "**/*.tsx"],
  "exclude": ["node_modules"]
}
```

```json
// tsconfig.json — Node.js 22 API server
{
  "compilerOptions": {
    "target":               "ES2022",
    "module":               "NodeNext",
    "moduleResolution":     "NodeNext",
    "outDir":               "./dist",
    "rootDir":              "./src",
    "strict":               true,
    "noEmit":               false,
    "noEmitOnError":        true,
    "noImplicitReturns":    true,
    "noUncheckedIndexedAccess": true,
    "useUnknownInCatchVariables": true,
    "noFallthroughCasesInSwitch": true,
    "forceConsistentCasingInFileNames": true,
    "esModuleInterop":      true,
    "skipLibCheck":         true,
    "declaration":          true,
    "sourceMap":            true
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist", "**/*.test.ts"]
}
```

---

---
