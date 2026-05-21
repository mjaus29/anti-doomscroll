# 9 — Declaration Merging, Module Augmentation, @types, .d.ts Files

---

## T — TL;DR

**Declaration merging** combines multiple declarations of the same name into one. **Module augmentation** adds types to existing modules. **`@types` packages** provide type definitions for JavaScript libraries. **`.d.ts` files** are pure type declarations — no runtime code. Together they enable typing third-party code and extending library types safely.

---

## K — Key Concepts

```typescript
// ── Declaration merging — interface merging ───────────────────────────────
// Two interfaces with the same name in the same scope merge
interface User { id: number; name: string }
interface User { email: string }
// Merged result: { id: number; name: string; email: string }
const user: User = { id: 1, name: 'Mark', email: 'm@ex.com' }   // ✅

// Function declaration merging (overloads)
function process(x: string): string
function process(x: number): number
// These merge into an overloaded function

// Namespace + class merging — add static members
class Counter { count = 0 }
namespace Counter {
  export const MAX = 100
  export function create() { return new Counter() }
}
Counter.MAX      // 100 ✅ (static-like, added via namespace merging)
Counter.create() // Counter ✅
```

```typescript
// ── Module augmentation ────────────────────────────────────────────────────
// Add types to an existing module's exports

// Augment Express Request — add custom properties
import 'express'
declare module 'express' {
  interface Request {
    user?:       { id: number; role: string }
    requestId:   string
    startTime:   number
  }
}

// Now in your Express middleware:
app.use((req, res, next) => {
  req.requestId = crypto.randomUUID()   // ✅ TypeScript knows this exists
  req.startTime = Date.now()
  next()
})
app.get('/me', (req, res) => {
  req.user?.id   // ✅ optional user from auth middleware
})

// Augment a library type
import 'some-library'
declare module 'some-library' {
  interface Options {
    myPlugin?: boolean   // add custom option ✅
  }
}
```

```typescript
// ── @types packages ───────────────────────────────────────────────────────
// JavaScript libraries that don't ship types → install @types/xxx
npm install --save-dev @types/node
npm install --save-dev @types/express
npm install --save-dev @types/lodash

// @types packages live in node_modules/@types/
// TypeScript automatically includes them (with "typeRoots" default)

// tsconfig.json — control which @types are included
{
  "compilerOptions": {
    "types":      ["node", "vitest/globals"],  // only these @types
    "typeRoots":  ["./node_modules/@types", "./src/types"]
  }
}
// "types": [] without entries disables all automatic @types inclusion
```

```typescript
// ── .d.ts files ───────────────────────────────────────────────────────────
// Pure type declarations — no runtime JavaScript output

// src/types/api.d.ts
export interface ApiConfig {
  baseUrl:     string
  timeout:     number
  apiKey?:     string
}

export interface PaginationParams {
  page:  number
  limit: number
}

// src/types/index.d.ts — re-export all types
export * from './api'
export * from './user'
export * from './errors'

// Auto-generated .d.ts (from tsc --declaration)
// dist/user.d.ts — ships with your library so consumers get types
export declare class UserService {
  findById(id: number): Promise<User | null>
  create(dto: CreateUserDto): Promise<User>
}

// Checking .d.ts source: npm package 'exports' field
// "exports": { ".": { "types": "./dist/index.d.ts", "import": "./dist/index.js" }}
```

---

## W — Why It Matters

- Module augmentation for Express `Request.user` is the correct pattern for adding user data from auth middleware — without it, every route handler needs `(req as any).user` or a cast.
- `@types/node` is required for Node.js built-ins in TypeScript — without it, `process`, `Buffer`, `__dirname`, `fs`, `path` all have no types. It's one of the first installs in any Node.js TS project.
- Publishing a library with `declaration: true` generates `.d.ts` files automatically — consumers get full type safety without you manually writing type definitions. The `types` field in `package.json` points TypeScript to these files.

---

## I — Interview Q&A

### Q: What is the difference between declaration merging and module augmentation?

**A:** Declaration merging happens when two declarations of the same name exist in the same scope — TypeScript combines them. Most importantly, interfaces merge: declaring `interface User { id: number }` and `interface User { name: string }` in the same scope produces one interface with both properties. Module augmentation is a specific use of declaration merging for modules — you `import` or reference an existing module and use `declare module 'module-name' { }` to add new types to it. Module augmentation is how you add properties to Express's `Request`, extend third-party library types, or add custom properties to global browser types.

---

## C — Common Pitfalls + Fix

### ❌ Augmenting a module without first importing it

```typescript
// ❌ Module augmentation without importing the module first
// This creates a NEW module declaration, not an augmentation
declare module 'express' {
  interface Request { user?: User }   // ❌ may create a new empty module, not augment
}

// ✅ Always import the module first in the augmentation file
import 'express'   // or: import { Request } from 'express'
declare module 'express' {
  interface Request { user?: User }   // ✅ augments the real express module
}
```

---

## K — Coding Challenge + Solution

### Challenge

Create a `src/types/` directory structure: `globals.d.ts` (typed env vars), `express.d.ts` (augments Express Request), and `api.d.ts` (shared API types). Show the `tsconfig.json` setup to include them.

### Solution

```typescript
// src/types/env.d.ts
export {}
declare global {
  namespace NodeJS {
    interface ProcessEnv {
      NODE_ENV:     'development' | 'production' | 'test'
      DATABASE_URL: string
      JWT_SECRET:   string
      PORT?:        string
      REDIS_URL?:   string
    }
  }
}

// src/types/express.d.ts
import 'express'
declare module 'express' {
  interface Request {
    user?:      { id: number; email: string; role: 'admin' | 'user' }
    requestId:  string
    startTime:  number
  }
}

// src/types/api.d.ts
export interface PaginatedResponse<T> {
  data:    T[]
  total:   number
  page:    number
  limit:   number
  hasMore: boolean
}

export interface ApiError {
  code:    string
  message: string
  details?: Record<string, string[]>
}
```

```json
// tsconfig.json — include the types directory
{
  "compilerOptions": {
    "typeRoots": ["./node_modules/@types", "./src/types"]
  },
  "include": ["src/**/*"]
}
```

---

---
