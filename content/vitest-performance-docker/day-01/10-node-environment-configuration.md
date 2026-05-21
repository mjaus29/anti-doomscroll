# 10 — Node Environment Configuration

---

## T — TL;DR

Vitest runs tests in a `node` environment by default — no browser globals, no DOM. For backend/API code this is correct. Configure environment via `vitest.config.ts` (`environment: 'node'`), per-directory using `environmentMatchGlobs`, or per-file using the `@vitest-environment` comment. Always verify your env vars are loaded in tests — use `process.env` reads in `setup.ts`, not at module import time.

---

## K — Key Concepts

```typescript
// ── Environment options ────────────────────────────────────────────────────
// 'node'      → Node.js globals (process, Buffer, __dirname) — default
// 'jsdom'     → browser DOM simulation (document, window, localStorage)
// 'happy-dom' → faster, less complete jsdom alternative
// 'edge-runtime' → Vercel Edge / Cloudflare Workers globals (limited API)

// vitest.config.ts — set for entire project
export default defineConfig({
  test: {
    environment: 'node',   // correct for backend/API testing
  }
})
```

```typescript
// ── Per-file environment override ─────────────────────────────────────────
// At the very top of the file — must be the first line

// @vitest-environment jsdom
import { describe, it, expect } from 'vitest'

describe('DOM test', () => {
  it('has access to document', () => {
    const div = document.createElement('div')
    div.textContent = 'hello'
    expect(div.textContent).toBe('hello')
  })
})
```

```typescript
// ── environmentMatchGlobs — per-directory environments ────────────────────
// vitest.config.ts
export default defineConfig({
  test: {
    environmentMatchGlobs: [
      ['src/**/*.test.ts',    'node'],    // backend code → node
      ['src/**/*.test.tsx',   'jsdom'],   // React components → jsdom
      ['src/app/**/*.test.ts','jsdom'],   // Next.js app dir → jsdom
    ],
    // Single environment still works as fallback:
    environment: 'node',
  },
})
```

```typescript
// ── Environment variables in tests ────────────────────────────────────────
// Problem: env vars read at module import time may not be set yet
// setup.ts runs BEFORE the test file is imported

// ✅ Read env vars lazily (inside functions) — safe in tests
export function getDatabaseUrl(): string {
  const url = process.env.DATABASE_URL
  if (!url) throw new Error('DATABASE_URL not set')
  return url
}

// ❌ Reads at import time — may be undefined when module is imported in tests
// export const DATABASE_URL = process.env.DATABASE_URL!  // may be '' in some envs

// ── dotenv in tests ────────────────────────────────────────────────────────
// Vitest does NOT automatically load .env files (Vite does for the app)
// Option 1: Set env vars in setup.ts (explicit)
// Option 2: Use @dotenvx/dotenvx or dotenv in setup.ts
// Option 3: Use vitest's built-in env loading (vitest.config.ts):

export default defineConfig({
  test: {
    env: {
      // Inline env vars (hardcoded — ok for non-secrets in tests)
      NODE_ENV:    'test',
      LOG_LEVEL:   'silent',
    },
    // Or load from a file:
    // envFile: '.env.test',  // (Vitest 1.3+)
  },
})
```

```typescript
// ── Checking your environment in a test ──────────────────────────────────
it('runs in node environment', () => {
  // In node environment:
  expect(typeof process).toBe('object')
  expect(typeof process.env).toBe('object')

  // These should be undefined in node environment:
  // expect(typeof window).toBe('undefined')   ← in jsdom: would be 'object'
})

// Detect current environment:
import { expect } from 'vitest'
console.log('Environment:', typeof window === 'undefined' ? 'node' : 'jsdom')
```

---

## W — Why It Matters

- The node environment is correct for any test that runs server-side code — tRPC handlers, Prisma queries, service functions, utility libraries. Using jsdom for these is wasteful (jsdom initialises a full browser simulation for no reason) and can cause false positives (global DOM objects polluting Node.js-only code).
- Lazy env var reading (inside functions, not at module scope) is a critical pattern for testability — modules that read env vars at import time cannot be imported in tests without setting those env vars in `setup.ts` first. This creates ordering dependencies that are fragile. Functions that read env vars when called are testable in isolation.
- `vitest.config.ts` `env` field is the cleanest way to set test-only env vars — they're visible, checked into git, and not polluted by `.env` files that developers may have locally configured differently.

---

## I — Interview Q&A

### Q: Why might environment variables be undefined in a test file even when you set them in your setup file?

**A:** JavaScript modules are evaluated once and cached. If a module reads `process.env.DATABASE_URL` at the top level (outside any function) during its initial import, and that import happens before `setupFiles` runs, the variable is `undefined` at evaluation time. The setup file sets the variable afterward, but the module's top-level code has already run. The fix is to read environment variables lazily — inside functions, not at module scope. When a function is called during a test, `setupFiles` has already run and the variable is set. The alternative is to ensure the import order is correct by using dynamic imports (`await import(...)`) inside tests, but lazy reads are cleaner and more robust.

---

## C — Common Pitfalls + Fix

### ❌ Reading env vars at module scope — undefined during test import

```typescript
// src/lib/db.ts
// ❌ DATABASE_URL read at import time — may be undefined in tests
const connectionString = process.env.DATABASE_URL!
export const db = createDb(connectionString)
// If imported in a test before setup.ts runs → connectionString = '' or undefined ❌
```

**Fix:** Read lazily:

```typescript
// ✅ Read inside the factory function — called after setup.ts has run
let _db: Db | null = null

export function getDb(): Db {
  if (!_db) {
    const url = process.env.DATABASE_URL
    if (!url) throw new Error('DATABASE_URL not configured')
    _db = createDb(url)
  }
  return _db
}
```

---

## K — Coding Challenge + Solution

### Challenge

Configure `vitest.config.ts` to: (1) use `node` for `.test.ts` files and `jsdom` for `.test.tsx` files via `environmentMatchGlobs`; (2) set `NODE_ENV=test` and `LOG_LEVEL=silent` via the `env` field; (3) load `src/test/setup.ts` as a setup file. Show a minimal `.test.tsx` file that uses the jsdom environment.

### Solution

```typescript
// vitest.config.ts
import { defineConfig } from 'vitest/config'
import tsconfigPaths    from 'vite-tsconfig-paths'

export default defineConfig({
  plugins: [tsconfigPaths()],
  test: {
    environment: 'node',   // fallback

    environmentMatchGlobs: [
      ['**/*.test.ts',  'node'],
      ['**/*.test.tsx', 'jsdom'],
    ],

    setupFiles: ['./src/test/setup.ts'],

    env: {
      NODE_ENV:  'test',
      LOG_LEVEL: 'silent',
    },

    include: ['**/*.test.ts', '**/*.test.tsx'],
    exclude: ['**/node_modules/**', '**/.next/**'],
  },
})
```

```tsx
// src/components/Badge.test.tsx
// No @vitest-environment needed — environmentMatchGlobs handles it
import { describe, it, expect } from 'vitest'

function Badge({ label }: { label: string }) {
  const el = document.createElement('span')
  el.className = 'badge'
  el.textContent = label
  return el
}

describe('Badge', () => {
  it('sets the label text', () => {
    const badge = Badge({ label: 'Admin' })
    expect(badge.textContent).toBe('Admin')    // uses document ✅ (jsdom env)
    expect(badge.className).toBe('badge')
  })
})
```

---

---
