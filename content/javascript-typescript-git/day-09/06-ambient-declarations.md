# 6 — Ambient Declarations

---

## T — TL;DR

**Ambient declarations** describe types of things that exist at runtime but aren't defined in TypeScript source — third-party globals, environment variables, native APIs. `declare` tells TypeScript "this exists — don't look for an implementation." Used in `.d.ts` files and `declare global` blocks to extend the global namespace.

---

## K — Key Concepts

```typescript
// ── declare — describe existing values ────────────────────────────────────
// "This exists at runtime — here's its type"

// In a .d.ts file or top of a module:
declare const __VERSION__: string     // e.g. injected by webpack/vite
declare const __DEV__: boolean
declare function require(id: string): unknown   // CJS require in ESM context

declare class EventEmitter {
  on(event: string, listener: (...args: unknown[]) => void): this
  emit(event: string, ...args: unknown[]): boolean
}

// declare namespace — for namespaced globals
declare namespace NodeJS {
  interface ProcessEnv { [key: string]: string | undefined }
}
```

```typescript
// ── declare module — type a module that has no types ──────────────────────
// In a .d.ts file — type an untyped package
declare module 'some-legacy-package' {
  export function init(options: { debug: boolean }): void
  export function process(data: string): Promise<string>
  export default init
}

// Wildcard module declarations — for asset imports
declare module '*.svg' {
  const content: string
  export default content
}
declare module '*.png' {
  const content: string
  export default content
}
declare module '*.json' {
  const content: Record<string, unknown>
  export default content
}

// After this, imports work:
import logo from './logo.svg'   // type: string ✅
```

```typescript
// ── declare global — extend the global scope ──────────────────────────────
// Adds properties to the global Window, globalThis, or process.env

// In src/types/globals.d.ts (or any .d.ts)
export {}   // make this a module (not a script)

declare global {
  // Extend Window
  interface Window {
    analytics: {
      track(event: string, props?: Record<string, unknown>): void
      identify(userId: string): void
    }
  }

  // Extend process.env (Node.js)
  namespace NodeJS {
    interface ProcessEnv {
      NODE_ENV:     'development' | 'production' | 'test'
      DATABASE_URL: string
      PORT?:        string
      API_KEY?:     string
    }
  }
}

// Usage after declaration:
window.analytics.track('page_view', { url: '/home' })  // ✅
process.env.DATABASE_URL.startsWith('postgresql://')    // ✅
process.env.NODE_ENV === 'production'                   // ✅
process.env.UNDEFINED_VAR  // TS error — not declared ✅
```

```typescript
// ── declare in implementation files ──────────────────────────────────────
// Inside a regular .ts file — for values injected by bundler
declare const __COMMIT_HASH__: string   // injected by vite define

// vite.config.ts:
// define: { __COMMIT_HASH__: JSON.stringify(execSync('git rev-parse HEAD')) }

// Now usable:
console.log(`Version: ${__COMMIT_HASH__}`)   // ✅
```

---

## W — Why It Matters

- `declare global` to type `process.env` variables is essential for safe server code — without it, every `process.env.DATABASE_URL` is `string | undefined` and TypeScript won't catch missing variables at compile time.
- Wildcard module declarations (`declare module '*.svg'`) are how Create React App, Vite, and Next.js make image/SVG imports work — without them, TypeScript would error on every asset import.
- `declare module 'untyped-package'` lets you type a dependency that lacks `@types` — you unblock your TypeScript project in minutes instead of waiting for community types.

---

## I — Interview Q&A

### Q: What is the difference between `declare const` and a regular `const` declaration?

**A:** A regular `const x = value` creates a value and a type — the runtime behaviour happens and TypeScript tracks the type. `declare const x: Type` only tells TypeScript that `x` exists with type `Type` — it creates no runtime code whatsoever. It's used in `.d.ts` declaration files or in `.ts` files when a value is guaranteed to exist at runtime through some external mechanism (bundler injection, global scripts, CDN libraries). The `declare` keyword means "trust me, this exists — don't check for an implementation file."

---

## C — Common Pitfalls + Fix

### ❌ Forgetting `export {}` in a global `.d.ts` — treated as a script

```typescript
// ❌ Without export {}, this is a SCRIPT file — declarations pollute global scope
// src/types/env.d.ts
declare namespace NodeJS {
  interface ProcessEnv { DATABASE_URL: string }
}
// No export {} — this works BUT if you add any import, it becomes a module
// and declarations are no longer global

// ✅ Use export {} to make it a module with explicit global declarations
// src/types/env.d.ts
export {}   // ← makes this a module

declare global {
  namespace NodeJS {
    interface ProcessEnv {
      DATABASE_URL: string
      NODE_ENV: 'development' | 'production' | 'test'
    }
  }
}
// Now safe to add imports AND declare globals ✅
```

---

## K — Coding Challenge + Solution

### Challenge

Write a `globals.d.ts` that: types `window.__APP_CONFIG__` as `{ apiUrl: string; featureFlags: Record<string, boolean> }`, types `process.env` with `DATABASE_URL`, `PORT`, `NODE_ENV`, and declares a wildcard module for `.svg` files.

### Solution

```typescript
// src/types/globals.d.ts
export {}   // module boundary — required for declare global

declare global {
  interface Window {
    __APP_CONFIG__: {
      apiUrl:        string
      featureFlags:  Record<string, boolean>
      version:       string
    }
  }

  namespace NodeJS {
    interface ProcessEnv {
      NODE_ENV:     'development' | 'production' | 'test'
      DATABASE_URL: string
      PORT?:        string
      JWT_SECRET?:  string
    }
  }
}

declare module '*.svg' {
  const ReactComponent: React.FC<React.SVGProps<SVGSVGElement>>
  const src: string
  export { ReactComponent }
  export default src
}

declare module '*.module.css' {
  const styles: Record<string, string>
  export default styles
}

// Usage (in any .ts file in the project):
// window.__APP_CONFIG__.featureFlags['darkMode']   // boolean ✅
// process.env.DATABASE_URL                          // string ✅
// process.env.NODE_ENV === 'production'             // ✅
```

---

---
