
# 📅 Day 6 — Modules, Error Handling, Iteration & Modern JS

> **Goal:** Master the JavaScript module system end-to-end, write robust error handling, command iterables and generators, and fluently use every modern operator.
> **Format:** Each subtopic = 5–15 min. Do one. Stop. Come back.
> **Stack:** Node.js 22 · TypeScript 6 (context) · ESM-first

---

## 📋 Day 6 Subtopic Overview

| # | Subtopic | Time |
|---|----------|------|
| 1 | CommonJS vs ES Modules — require/exports vs import/export | 12 min |
| 2 | Named/Default/Re-exports, Barrel Files, Namespace, Side-effect Imports | 10 min |
| 3 | Dynamic import, import.meta, Top-level await, Module Evaluation | 10 min |
| 4 | Error Fields, Custom Error Classes, AggregateError | 12 min |
| 5 | throw / catch / rethrow Patterns | 10 min |
| 6 | Iterables and Symbol.iterator | 10 min |
| 7 | Iterators — next() Protocol, Return, Throw | 10 min |
| 8 | Generators — yield, yield*, lazy evaluation | 12 min |
| 9 | Map, Set, WeakMap, WeakSet, WeakRef | 12 min |
| 10 | Modern JS Operators — nullish/logical assignment, exponentiation, numeric separators | 8 min |

---

---

# 1 — CommonJS vs ES Modules

---

## T — TL;DR

**CommonJS** (CJS) uses `require`/`module.exports` — synchronous, dynamic, Node.js default for `.js` files without `"type":"module"`. **ES Modules** (ESM) uses `import`/`export` — static, async-capable, the standard for browsers and modern Node.js. They are NOT interchangeable — know the differences and how to mix them.

---

## K — Key Concepts

```javascript
// ── CommonJS ──────────────────────────────────────────────────────────────
// math.cjs
const PI = 3.14159

function add(a, b) { return a + b }
function multiply(a, b) { return a * b }

module.exports = { PI, add, multiply }          // export object
// Or:
module.exports.add = add                         // property by property
exports.add = add                                // shorthand (same reference as module.exports)
// ❌ exports = { add } — breaks the reference to module.exports

// main.cjs
const math = require('./math')                  // whole module
const { add, PI } = require('./math')           // destructure
const add2 = require('./math').add              // member access

// CJS characteristics:
// - Synchronous (blocks — fine for local files, bad for remote)
// - require() can be called anywhere (dynamic, conditional)
// - Caches modules — require('./x') twice returns same object
// - __dirname, __filename available
// - module.exports is whatever you set it to
```

```javascript
// ── ES Modules ────────────────────────────────────────────────────────────
// math.mjs  (or .js with "type":"module" in package.json)
export const PI = 3.14159

export function add(a, b) { return a + b }
export function multiply(a, b) { return a * b }

// main.mjs
import { add, PI } from './math.mjs'            // named import
import { add as sum } from './math.mjs'          // rename
import * as math from './math.mjs'               // namespace
import './side-effects.mjs'                      // side-effect only

// ESM characteristics:
// - Static — imports resolved at parse time (before code runs)
// - Async — safe for network fetches (browser <script type="module">)
// - Live bindings — exported values stay in sync when updated
// - Strict mode by default
// - import.meta available (no __dirname/__filename)
// - Top-level await supported
```

```javascript
// ── Key differences ────────────────────────────────────────────────────────
/*
                  CommonJS            ES Modules
Syntax            require/exports     import/export
Resolution        Runtime (dynamic)   Parse time (static)
Async             No                  Yes
Strict mode       Opt-in              Always
Top-level await   No                  Yes
Tree-shaking      No                  Yes (static analysis)
__dirname         Yes                 No (use import.meta.url)
Default ext       .js (no "type")     .js (with "type":"module") or .mjs
Circular imports  Partial object      Live binding (handled better)
Browser native    No                  Yes
*/

// ── Interop in Node.js ────────────────────────────────────────────────────
// ESM can import CJS (as default import):
import cjsModule from './legacy.cjs'   // entire module.exports as default ✅
// CJS cannot require() ESM — use dynamic import() instead:
const esm = await import('./modern.mjs')   // in an async context ✅
```

```javascript
// ── package.json configuration ────────────────────────────────────────────
{
  "type": "module",       // treat .js as ESM (use .cjs for CJS files)
  "exports": {
    ".":          "./dist/index.js",       // main entry
    "./utils":    "./dist/utils.js",       // sub-path export
    "./package.json": "./package.json"     // allow package.json access
  },
  "main":   "./dist/index.cjs",   // CJS fallback (older tools)
  "module": "./dist/index.js"     // ESM entry (bundlers)
}
```

---

## W — Why It Matters

- Most modern Node.js projects use `"type": "module"` — you write `.js` as ESM and name legacy files `.cjs`. Without understanding this, `require is not defined` errors and `__dirname` not found errors will block you every time.
- ESM enables tree-shaking in bundlers (Webpack, Rollup, Vite) — static `import` statements let the bundler know exactly what's used and remove the rest. `require()` is dynamic and prevents this.
- The CJS/ESM interop rules matter daily in a full-stack project — `axios`, `prisma`, and most npm packages are either ESM or dual-CJS/ESM. Knowing you can `import` a CJS package but can't `require` an ESM package saves hours of debugging.

---

## I — Interview Q&A

### Q: What are three key differences between CommonJS and ES Modules?

**A:** (1) **Static vs dynamic** — ESM `import` is resolved at parse time (static), enabling tree-shaking and circular dependency detection. CJS `require()` is runtime (dynamic) — it can be in an `if` block. (2) **Synchronous vs async** — `require()` blocks execution until the file is read; ESM supports async module loading and top-level `await`. (3) **Live bindings vs value copies** — ESM exports are live bindings: if the exporting module updates a variable, the importing module sees the update. CJS `require()` copies the value at the time of require — changes to the original don't propagate. Additionally, ESM is always strict mode; CJS is opt-in.

---

## C — Common Pitfalls + Fix

### ❌ Assigning to `exports` directly — breaks the `module.exports` link

```javascript
// ❌ This replaces the exports variable locally — module.exports unchanged
exports = { add, multiply }  // no effect outside this file ❌

// ✅ Assign to module.exports
module.exports = { add, multiply }  // ✅

// ✅ Or add properties to the existing exports object
exports.add      = add        // ✅
exports.multiply = multiply   // ✅
```

---

## K — Coding Challenge + Solution

### Challenge

Create a dual-mode module `config.js` that exports a `getConfig()` function. Show the CJS version (`module.exports`) and ESM version (`export`). Then show how to consume the CJS version from ESM.

### Solution

```javascript
// config.cjs — CommonJS
const defaults = { port: 3000, env: 'development' }
function getConfig(overrides = {}) {
  return { ...defaults, ...overrides }
}
module.exports = { getConfig }

// config.mjs — ES Module
const defaults = { port: 3000, env: 'development' }
export function getConfig(overrides = {}) {
  return { ...defaults, ...overrides }
}

// main.mjs — consuming CJS from ESM
import cjsConfig from './config.cjs'    // whole module.exports = default
const { getConfig } = cjsConfig
console.log(getConfig({ port: 8080 }))  // { port: 8080, env: 'development' }

// Or with dynamic import from non-async context:
const { getConfig: gc } = await import('./config.cjs').then(m => m.default ?? m)
```

---

---

# 2 — Named/Default/Re-exports, Barrel Files, Namespace, Side-effect Imports

---

## T — TL;DR

ESM offers **named exports** (multiple per file), **default exports** (one per file — avoid for libraries), **re-exports** (aggregate and re-expose), **barrel files** (`index.js` aggregating a module's public API), **namespace imports** (`import *`), and **side-effect imports** (run the module, import nothing). Each has a clear use case.

---

## K — Key Concepts

```javascript
// ── Named exports ─────────────────────────────────────────────────────────
// user.js
export const ROLES  = { ADMIN: 'admin', USER: 'user' }
export function createUser(name) { return { name, role: ROLES.USER } }
export class UserError extends Error {}

// Consumer
import { ROLES, createUser, UserError } from './user.js'
import { createUser as makeUser }       from './user.js'   // rename
```

```javascript
// ── Default export ────────────────────────────────────────────────────────
// logger.js
export default class Logger {
  log(msg) { console.log(`[LOG] ${msg}`) }
}

// Consumer — any name works, no braces
import Logger  from './logger.js'
import MyLog   from './logger.js'   // same thing, different local name

// ⚠️ Default exports are harder to refactor — rename doesn't break usage
// ⚠️ Hard to search for usage in codebases
// ✅ Prefer named exports for libraries and shared utilities
```

```javascript
// ── Re-exports ────────────────────────────────────────────────────────────
// Re-export named from another module
export { createUser, UserError }  from './user.js'
export { default as Logger }      from './logger.js'  // re-export default as named
export * from './utils.js'                            // re-export all named
export * as utils from './utils.js'                   // re-export as namespace

// ── Barrel file (index.js) — aggregate module's public API ───────────────
// src/users/index.js
export { createUser, updateUser, deleteUser } from './user.service.js'
export { UserRepository }                     from './user.repository.js'
export { UserError, UserNotFoundError }       from './user.errors.js'
export type { User, CreateUserDto }           from './user.types.js'  // TS

// Consumer — clean import from the barrel
import { createUser, UserError } from './users/index.js'
// or with path alias:
import { createUser, UserError } from '@/users'
```

```javascript
// ── Namespace import ──────────────────────────────────────────────────────
import * as math from './math.js'
math.add(1, 2)         // access as properties
math.PI                // 3.14159
// Useful when: many exports, disambiguate name collisions, dynamic access

// ── Side-effect import — run module, import nothing ────────────────────────
import './polyfills.js'       // run polyfills
import './setup-globals.js'   // configure globals
import 'reflect-metadata'     // TypeScript decorators prerequisite

// The module runs once and is cached — repeated imports don't re-run
import './polyfills.js'  // no-op — already in cache
```

---

## W — Why It Matters

- Barrel files are a double-edged sword — clean imports but can slow bundler startup if the barrel re-exports many unused modules. Modern bundlers with tree-shaking handle this well; older ones don't. Always use `export { specific }` not `export * from` in barrels for best tree-shaking.
- `export default` loses the name at the export site — `export default function() {}` (anonymous) means the imported name is whatever the consumer chooses, making codebase search harder. Prefer `export default function named() {}` or just use named exports.
- Re-exports are how library `index.js` files work — `import { useState } from 'react'` hits React's barrel file which re-exports `useState` from its internal module.

---

## I — Interview Q&A

### Q: When would you use a default export vs a named export?

**A:** Use **named exports** for most things — they're explicit, support auto-rename refactoring, show up in IDE autocomplete from the import source, and enable tree-shaking clearly. Use **default export** for: (1) A module that represents a single primary thing (a React component file, a config object), (2) Interop scenarios where consumers expect a default. Avoid default exports in shared libraries — consumers can name them anything, making codebase-wide search for usage unreliable. TypeScript's `import type` also works cleanly with named exports.

---

## C — Common Pitfalls + Fix

### ❌ Circular imports via barrel files causing `undefined` exports

```javascript
// ❌ a.js imports from index.js which imports b.js which imports a.js
// At the point b.js runs, a.js hasn't finished — exports are undefined

// ✅ Import directly from the source module, not the barrel
import { helper } from './utils.js'     // direct ✅ (not from './index.js')
// Save barrel imports for external consumers, not internal cross-imports
```

---

## K — Coding Challenge + Solution

### Challenge

Create a `src/auth/` module with `auth.service.js` (exports `login`, `logout`), `auth.errors.js` (exports `AuthError`, `TokenExpiredError`), and an `index.js` barrel. Show namespace import and side-effect import usage.

### Solution

```javascript
// src/auth/auth.errors.js
export class AuthError extends Error {
  constructor(message) { super(message); this.name = 'AuthError' }
}
export class TokenExpiredError extends AuthError {
  constructor() { super('Token expired'); this.name = 'TokenExpiredError' }
}

// src/auth/auth.service.js
import { AuthError } from './auth.errors.js'
export async function login(email, pass) {
  if (!email || !pass) throw new AuthError('Credentials required')
  return { token: 'jwt_' + Date.now() }
}
export async function logout(token) { console.log(`Revoked: ${token}`) }

// src/auth/index.js — barrel
export { login, logout }             from './auth.service.js'
export { AuthError, TokenExpiredError } from './auth.errors.js'

// Consumer — named import from barrel
import { login, AuthError } from './auth/index.js'

// Namespace import
import * as auth from './auth/index.js'
auth.login('a@b.com', 'pass')

// Side-effect import (e.g., registers auth middleware globally)
import './auth/register-middleware.js'
```

---

---

# 3 — Dynamic import, import.meta, Top-level await, Module Evaluation

---

## T — TL;DR

`import()` is a function returning a Promise — load modules lazily at runtime. `import.meta` provides module-level metadata (`url`, `dirname` in Node 22+, `env` in Vite). **Top-level `await`** makes a module pause other modules importing it. **Module evaluation order** is depth-first, each module evaluated once, then cached.

---

## K — Key Concepts

```javascript
// ── Dynamic import — lazy loading ──────────────────────────────────────────
// Static import runs at parse time — always loaded
// Dynamic import runs at call time — conditional, lazy

// Lazy load a heavy module only when needed
async function loadChart() {
  const { Chart } = await import('./chart.js')   // loaded on demand
  return new Chart()
}

// Conditional import
if (process.env.NODE_ENV === 'development') {
  const { setupDevTools } = await import('./dev-tools.js')
  setupDevTools()
}

// Dynamic module name
async function loadLocale(lang) {
  const locale = await import(`./locales/${lang}.js`)   // computed path
  return locale.default ?? locale
}

// import() returns a module namespace object
const mod = await import('./utils.js')
mod.add(1, 2)          // named export
mod.default            // default export (if any)
const { add } = await import('./utils.js')   // destructure
```

```javascript
// ── import.meta ───────────────────────────────────────────────────────────
// Available in ESM only

import.meta.url         // 'file:///app/src/main.js' — current module URL
import.meta.filename    // '/app/src/main.js'  (Node 22+ — like __filename)
import.meta.dirname     // '/app/src'           (Node 22+ — like __dirname)

// Pre-Node 22 equivalent:
import { fileURLToPath } from 'url'
import { dirname }       from 'path'
const __filename = fileURLToPath(import.meta.url)
const __dirname  = dirname(__filename)

// Vite / bundler-specific
import.meta.env.MODE         // 'development' | 'production'
import.meta.env.VITE_API_URL // custom env var
import.meta.hot              // HMR API (development only)
```

```javascript
// ── Top-level await ────────────────────────────────────────────────────────
// Only in ESM ("type": "module" or .mjs)
// The module PAUSES here — other modules importing this must wait

// config.mjs
const res    = await fetch('https://api.example.com/config')
export const config = await res.json()   // exported after fetch completes

// db.mjs
import pg from 'pg'
export const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL })
await pool.query('SELECT 1')   // verify connection before exporting
export const ready = true

// Importing module waits for db.mjs to complete:
import { pool, ready } from './db.mjs'   // blocks until pool is verified
console.log(ready)   // true
```

```javascript
// ── Module evaluation order ───────────────────────────────────────────────
// Modules form a dependency graph
// Evaluation: depth-first, left-to-right, each module evaluated ONCE

// a.mjs → imports b.mjs and c.mjs
// b.mjs → imports d.mjs
// c.mjs → imports d.mjs

// Evaluation order: d → b → c → a
// d is NOT evaluated twice even though both b and c import it ✅

// Circular imports — ESM handles via live bindings
// a.mjs:
export let x = 1
import { y } from './b.mjs'
export function setX(v) { x = v }

// b.mjs:
import { x, setX } from './a.mjs'   // x starts as undefined (live binding)
export const y = 2
// After a.mjs finishes init, x becomes 1 — live binding updates ✅
```

---

## W — Why It Matters

- Dynamic `import()` is the foundation of code splitting — every Next.js `dynamic()` and Vite `() => import('./Component')` is a dynamic import. This is how large apps load only the code needed for the current page.
- `import.meta.url` replaces `__dirname` in ESM — every Node.js utility that builds file paths needs this. Not knowing it means you can't load files relative to the current module.
- Top-level `await` simplifies async initialisation in modules — database connections, config fetches, and feature flag loads can be done at module scope instead of wrapping in an async IIFE.

---

## I — Interview Q&A

### Q: What is dynamic `import()` and when would you use it over a static import?

**A:** Dynamic `import(path)` is a function (not a keyword) that loads a module at runtime and returns a Promise resolving to the module namespace. Use it when: (1) the module should only load conditionally (development tools, feature flags), (2) the module is large and should load lazily on user interaction (chart library, PDF renderer), (3) the module path is computed at runtime (locale files, plugin system), (4) you're in a CJS environment that needs to load an ESM module. Static `import` is preferable when the module is always needed — it's resolved at parse time, easier to analyse, and bundles can optimise it better.

---

## C — Common Pitfalls + Fix

### ❌ Using `import.meta.url` as a string path directly

```javascript
// ❌ import.meta.url is a 'file://' URL — not a filesystem path
const content = fs.readFileSync(import.meta.url)   // ENOENT — wrong format

// ✅ Convert to path first
import { fileURLToPath } from 'url'
const filePath = fileURLToPath(import.meta.url)     // '/app/src/main.js' ✅
const content  = fs.readFileSync(filePath)          // works ✅

// ✅ Node 22+: use import.meta.filename directly
const content2 = fs.readFileSync(import.meta.filename)  // ✅
```

---

## K — Coding Challenge + Solution

### Challenge

Write a `loadPlugin(name)` function using dynamic `import` that loads from `./plugins/${name}.js`, handles a missing plugin with a fallback, and caches loaded plugins to avoid re-importing.

### Solution

```javascript
const pluginCache = new Map()

async function loadPlugin(name) {
  if (pluginCache.has(name)) return pluginCache.get(name)

  try {
    const mod    = await import(`./plugins/${name}.js`)
    const plugin = mod.default ?? mod
    pluginCache.set(name, plugin)
    return plugin
  } catch (err) {
    if (err.code === 'ERR_MODULE_NOT_FOUND') {
      console.warn(`Plugin "${name}" not found — using noop fallback`)
      const fallback = { name, execute: async () => null }
      pluginCache.set(name, fallback)
      return fallback
    }
    throw err   // re-throw unexpected errors
  }
}

const csv  = await loadPlugin('csv')   // loads ./plugins/csv.js
const csv2 = await loadPlugin('csv')   // from cache — no re-import ✅
```

---

---

# 4 — Error Fields, Custom Error Classes, AggregateError

---

## T — TL;DR

Every `Error` has `message`, `name`, `stack`, and (ES2022) `cause`. **Custom error classes** extend `Error` to add context, enable `instanceof` checks, and communicate error categories. **`AggregateError`** holds multiple errors (used by `Promise.any`). Always extend `Error` cleanly — set `name`, pass `cause`, maintain `instanceof`.

---

## K — Key Concepts

```javascript
// ── Built-in Error fields ──────────────────────────────────────────────────
const err = new Error('Something went wrong')
err.message   // 'Something went wrong'
err.name      // 'Error'
err.stack     // 'Error: Something wrong\n    at ...' (call stack as string)

// ES2022: cause — chain errors without losing original
const cause = new Error('DB connection refused')
const appErr = new Error('Failed to load users', { cause })
appErr.cause          // Error: DB connection refused ✅
appErr.cause.message  // 'DB connection refused'
```

```javascript
// ── Custom error classes ───────────────────────────────────────────────────
class AppError extends Error {
  constructor(message, options = {}) {
    super(message, { cause: options.cause })
    this.name    = this.constructor.name   // 'AppError' (or subclass name)
    this.code    = options.code   ?? 'UNKNOWN_ERROR'
    this.status  = options.status ?? 500
    this.context = options.context ?? {}

    // Fix: ensure instanceof works in transpiled environments
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, this.constructor)
    }
  }

  toJSON() {
    return { name: this.name, message: this.message, code: this.code, status: this.status }
  }
}

// Domain-specific error hierarchy
class ValidationError extends AppError {
  constructor(message, fields = {}) {
    super(message, { code: 'VALIDATION_ERROR', status: 400 })
    this.fields = fields
  }
}

class NotFoundError extends AppError {
  constructor(resource, id) {
    super(`${resource} with id ${id} not found`, { code: 'NOT_FOUND', status: 404 })
    this.resource = resource
    this.id       = id
  }
}

class UnauthorizedError extends AppError {
  constructor(message = 'Unauthorized') {
    super(message, { code: 'UNAUTHORIZED', status: 401 })
  }
}

class DatabaseError extends AppError {
  constructor(message, cause) {
    super(message, { code: 'DB_ERROR', status: 500, cause })
  }
}
```

```javascript
// ── Using custom errors ────────────────────────────────────────────────────
function findUser(id) {
  if (!id) throw new ValidationError('id is required', { id: 'required' })
  if (id < 0) throw new ValidationError('id must be positive', { id: 'must be > 0' })
  throw new NotFoundError('User', id)
}

try {
  findUser(-1)
} catch (err) {
  if (err instanceof ValidationError) {
    console.log('Bad input:', err.fields)   // { id: 'must be > 0' }
  } else if (err instanceof NotFoundError) {
    console.log(`${err.resource} ${err.id} missing`)
  } else if (err instanceof AppError) {
    console.log('App error:', err.code)
  } else {
    throw err   // unexpected — rethrow
  }
}

// ── AggregateError ────────────────────────────────────────────────────────
const agg = new AggregateError(
  [new Error('task 1 failed'), new Error('task 2 failed')],
  'Multiple operations failed'
)
agg.errors   // [Error: task 1 failed, Error: task 2 failed]
agg.message  // 'Multiple operations failed'
agg instanceof Error  // true

// Thrown by Promise.any when all promises reject:
try {
  await Promise.any([Promise.reject('a'), Promise.reject('b')])
} catch (err) {
  err instanceof AggregateError   // true
  err.errors                      // ['a', 'b']
}
```

---

## W — Why It Matters

- `instanceof` checks on custom errors are only reliable if the `name` field is set correctly and the class properly extends `Error` — without `this.name = this.constructor.name`, `err.name` is always `'Error'` and stack traces are harder to read.
- `error.cause` (ES2022) is the standardised way to chain errors — wrap a low-level DB error in an application-level error without losing the original. Before `cause`, developers used `err.original` or `err.inner` inconsistently.
- A typed error hierarchy enables granular `catch` logic — HTTP handlers can inspect `err.status`, loggers can check `err.code`, and monitoring can group errors by class. Throwing plain `Error('something')` loses all this structure.

---

## I — Interview Q&A

### Q: Why should you extend `Error` instead of throwing plain objects or strings?

**A:** Extending `Error` gives you: (1) `stack` — the call stack at throw time, essential for debugging. Throwing `{message: 'fail'}` has no stack. (2) `instanceof` — type-safe error handling in `catch` blocks. (3) `message`, `name`, `cause` — standardised fields that tools, loggers, and monitoring systems understand. (4) Integration — Express, Fastify, and testing frameworks all check `instanceof Error` and read `.message`. Throwing strings or plain objects forces every consumer to guess the error shape. The additional effort to define a custom class is trivial and the benefits compound across a codebase.

---

## C — Common Pitfalls + Fix

### ❌ Forgetting `this.name` in a custom error — all errors look the same

```javascript
// ❌ name is always 'Error' — can't tell error types apart in logs
class PaymentError extends Error {
  constructor(msg) { super(msg) }
  // this.name is still 'Error' ❌
}
new PaymentError('declined').name   // 'Error' ❌

// ✅ Set name explicitly
class PaymentError2 extends Error {
  constructor(msg) {
    super(msg)
    this.name = 'PaymentError'   // or: this.constructor.name ✅
  }
}
new PaymentError2('declined').name   // 'PaymentError' ✅
```

---

## K — Coding Challenge + Solution

### Challenge

Build an error hierarchy for an API: `ApiError(message, status)` base, `ValidationError(fields)` (400), `NotFoundError(resource)` (404), `RateLimitError(retryAfter)` (429). Write a `handleApiError(err, res)` function that sends the appropriate HTTP response.

### Solution

```javascript
class ApiError extends Error {
  constructor(message, status = 500, code) {
    super(message)
    this.name   = this.constructor.name
    this.status = status
    this.code   = code ?? this.name.toUpperCase().replace('ERROR', '_ERROR')
    if (Error.captureStackTrace) Error.captureStackTrace(this, this.constructor)
  }
  toResponse() { return { error: { code: this.code, message: this.message } } }
}

class ValidationError extends ApiError {
  constructor(fields) {
    super('Validation failed', 400)
    this.fields = fields
  }
  toResponse() { return { error: { code: this.code, message: this.message, fields: this.fields } } }
}

class NotFoundError extends ApiError {
  constructor(resource) { super(`${resource} not found`, 404) }
}

class RateLimitError extends ApiError {
  constructor(retryAfter) {
    super('Too many requests', 429)
    this.retryAfter = retryAfter
  }
  toResponse() {
    return { error: { code: this.code, message: this.message, retryAfter: this.retryAfter } }
  }
}

function handleApiError(err, res) {
  if (err instanceof ApiError) {
    if (err instanceof RateLimitError) {
      res.setHeader('Retry-After', err.retryAfter)
    }
    return res.status(err.status).json(err.toResponse())
  }
  console.error('Unexpected error:', err)
  res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Internal server error' } })
}
```

---

---

# 5 — throw / catch / rethrow Patterns

---

## T — TL;DR

`throw` can throw anything — always throw `Error` instances. `catch` should handle what it can and **rethrow** the rest. Rethrowing preserves the original error and prevents silently swallowing unexpected errors. Use `error.cause` to wrap and add context. Know the difference between handling an error and catching it just to log.

---

## K — Key Concepts

```javascript
// ── throw ──────────────────────────────────────────────────────────────────
throw new Error('Something failed')            // ✅ always an Error
throw new ValidationError('email invalid')     // ✅ custom class
throw new Error('DB failed', { cause: pgErr }) // ✅ with cause

// ❌ Avoid throwing non-Error values
throw 'something went wrong'    // no stack trace ❌
throw { message: 'failed' }     // no stack, no instanceof ❌
throw null                      // catch gets null ❌
```

```javascript
// ── catch: handle what you can, rethrow the rest ──────────────────────────
async function saveUser(userData) {
  try {
    return await db.users.create(userData)
  } catch (err) {
    // Handle what we know about
    if (err.code === '23505') {   // PostgreSQL unique violation
      throw new ValidationError('Email already in use', { email: 'taken' })
    }
    if (err.code === 'ECONNREFUSED') {
      throw new DatabaseError('Database unavailable', err)  // wrap with cause ✅
    }
    throw err   // ✅ rethrow unknown errors — don't swallow
  }
}
```

```javascript
// ── Rethrow patterns ──────────────────────────────────────────────────────
// Pattern 1: Rethrow unchanged
try {
  await riskyOperation()
} catch (err) {
  logger.error(err)   // log it
  throw err           // ✅ rethrow unchanged so caller can handle
}

// Pattern 2: Wrap and rethrow (add context)
async function processPayment(orderId) {
  try {
    return await paymentGateway.charge(orderId)
  } catch (err) {
    // Add context about what we were doing
    throw new PaymentError(
      `Payment failed for order ${orderId}: ${err.message}`,
      { cause: err }   // ✅ preserve original error
    )
  }
}

// Pattern 3: Catch specific, rethrow generic
try {
  await doWork()
} catch (err) {
  if (err instanceof NetworkError) {
    return retry()    // handle and recover ✅
  }
  throw err           // rethrow everything else ✅
}
```

```javascript
// ── Anti-patterns ──────────────────────────────────────────────────────────
// ❌ Empty catch — silently swallows errors
try { await doWork() } catch (e) {}

// ❌ catch-all with no rethrow — hides bugs
try {
  result = calculate()
} catch (e) {
  result = 0   // what if calculate() had a null ref bug? now it's hidden ❌
}

// ❌ Logging and swallowing
try {
  await sendEmail()
} catch (e) {
  console.error(e)   // logged but not rethrown — caller thinks it succeeded ❌
}

// ✅ Log AND rethrow
try {
  await sendEmail()
} catch (e) {
  logger.error('Email send failed', { error: e })
  throw e   // ✅ caller knows it failed
}
```

```javascript
// ── finally for cleanup regardless of path ────────────────────────────────
async function withLock(key, fn) {
  await lock.acquire(key)
  try {
    return await fn()
  } finally {
    await lock.release(key)   // ALWAYS releases, even if fn throws ✅
  }
}

// ── Error boundary for HTTP handlers ─────────────────────────────────────
function asyncHandler(fn) {
  return async (req, res, next) => {
    try {
      await fn(req, res)
    } catch (err) {
      next(err)   // pass to Express error handler ✅
    }
  }
}
app.get('/users/:id', asyncHandler(async (req, res) => {
  const user = await findUser(req.params.id)   // throws NotFoundError
  res.json(user)
}))
```

---

## W — Why It Matters

- Swallowing errors is the #1 cause of mysterious production bugs — the operation failed but the code kept running with bad state. Always either handle the error meaningfully or rethrow.
- `finally` for resource cleanup is safer than cleanup in both `try` and `catch` — if `try` throws unexpectedly, `catch` code may not run, but `finally` always does.
- Error wrapping with `cause` builds a traceable chain — when a DB error surfaces as an HTTP 500, the `cause` chain shows: `HttpError → DatabaseError → PostgresError` with each original stack trace preserved.

---

## I — Interview Q&A

### Q: When should you catch an error and when should you rethrow it?

**A:** Catch an error when you can meaningfully recover — retry the operation, return a default, translate to a domain error, or clean up resources. Rethrow when: (1) the error is unexpected and you don't know what to do with it, (2) you only need to log or add context before propagating, (3) only a higher-level handler knows the right response. Never catch just to suppress — an empty `catch` block hides bugs. The pattern: catch specific expected errors, handle them, rethrow everything else. If you log and don't rethrow, you're saying "this error is handled" — make sure that's true.

---

## C — Common Pitfalls + Fix

### ❌ Catching in `finally` by returning — masks the original error

```javascript
// ❌ returning in finally overrides the thrown error
async function example() {
  try {
    throw new Error('real error')
  } finally {
    return 'cleanup'   // ❌ original error is silently swallowed!
  }
}
await example()   // returns 'cleanup' — no error visible ❌

// ✅ Only do cleanup in finally, no return
async function example2() {
  try {
    throw new Error('real error')
  } finally {
    cleanupResources()   // no return ✅
  }
}
// Now the error propagates correctly
```

---

## K — Coding Challenge + Solution

### Challenge

Write `withRetry(fn, { retries, delay, shouldRetry })` that retries `fn` up to `retries` times with `delay` ms between attempts. `shouldRetry(err)` decides if the error is retryable. Preserve the original error as `cause` on final failure.

### Solution

```javascript
async function withRetry(fn, { retries = 3, delay = 500, shouldRetry = () => true } = {}) {
  let lastErr
  for (let attempt = 1; attempt <= retries + 1; attempt++) {
    try {
      return await fn(attempt)
    } catch (err) {
      lastErr = err
      if (attempt > retries || !shouldRetry(err)) {
        throw new Error(
          `Failed after ${attempt} attempt(s): ${err.message}`,
          { cause: err }
        )
      }
      await new Promise(r => setTimeout(r, delay * attempt))  // backoff
    }
  }
}

let calls = 0
const unstable = async () => {
  calls++
  if (calls < 3) throw Object.assign(new Error('Network timeout'), { code: 'ETIMEDOUT' })
  return 'success'
}

const result = await withRetry(unstable, {
  retries: 3,
  delay: 100,
  shouldRetry: err => err.code === 'ETIMEDOUT',
})
console.log(result)   // 'success' on 3rd attempt
console.log(calls)    // 3
```

---

---

# 6 — Iterables and Symbol.iterator

---

## T — TL;DR

An **iterable** is any object with a `[Symbol.iterator]()` method. Built-ins: Array, String, Map, Set, TypedArray, arguments, NodeList. Implementing `[Symbol.iterator]` makes your class work with `for...of`, spread, destructuring, and `Array.from` — first-class JavaScript citizens.

---

## K — Key Concepts

```javascript
// ── Built-in iterables ─────────────────────────────────────────────────────
for (const char of 'hello') console.log(char)    // h e l l o
for (const [k, v] of new Map([['a',1]])) {}       // Map is iterable
for (const v of new Set([1,2,3])) {}              // Set is iterable
[...'hello']         // ['h','e','l','l','o']
const [a, b] = 'hi'  // a='h', b='i'

// ── The iterable protocol ──────────────────────────────────────────────────
// An object is iterable if it has [Symbol.iterator]()
// that returns an iterator: { next() → { value, done } }

const iterable = {
  data: [10, 20, 30],
  [Symbol.iterator]() {        // ← makes it iterable
    let index = 0
    const data = this.data
    return {                   // ← returns an iterator
      next() {
        if (index < data.length) return { value: data[index++], done: false }
        return { value: undefined, done: true }
      }
    }
  }
}

for (const v of iterable) console.log(v)   // 10, 20, 30
[...iterable]                              // [10, 20, 30] ✅
const [first] = iterable                   // 10 ✅
Array.from(iterable)                       // [10, 20, 30] ✅
```

```javascript
// ── Self-referential iterator (iterable iterator) ─────────────────────────
// Object is BOTH iterable AND iterator
const counter = {
  current: 0,
  max: 5,
  [Symbol.iterator]() { return this },   // returns itself
  next() {
    if (this.current < this.max) return { value: this.current++, done: false }
    return { value: undefined, done: true }
  }
}
[...counter]   // [0, 1, 2, 3, 4]

// ── Iterable class ─────────────────────────────────────────────────────────
class LinkedList {
  #head = null
  append(value) {
    const node = { value, next: null }
    if (!this.#head) { this.#head = node; return this }
    let curr = this.#head
    while (curr.next) curr = curr.next
    curr.next = node
    return this
  }

  [Symbol.iterator]() {
    let current = this.#head
    return {
      next() {
        if (current) {
          const value = current.value
          current = current.next
          return { value, done: false }
        }
        return { value: undefined, done: true }
      }
    }
  }
}

const list = new LinkedList()
list.append(1).append(2).append(3)
[...list]                    // [1, 2, 3] ✅
for (const v of list) {}     // ✅
const [h, ...rest] = list    // h=1, rest=[2,3] ✅
```

---

## W — Why It Matters

- Making your data structures iterable integrates them with the entire JavaScript ecosystem — `for...of`, spread, destructuring, `Array.from`, `Promise.all`, `new Map(iterable)`. One method unlocks everything.
- `String`, `Map`, and `Set` are all iterable for this reason — their data can be consumed uniformly. `Object` is NOT iterable by default — you iterate it via `Object.entries()` which returns an iterable array.
- An iterable can be infinite — a Range iterable that goes `1, 2, 3...` forever is valid. Combined with `break` in `for...of` or a `take()` utility, this enables elegant lazy sequence generation.

---

## I — Interview Q&A

### Q: What is the iterable protocol and what built-in syntax relies on it?

**A:** The iterable protocol requires an object to have a `[Symbol.iterator]()` method that returns an iterator — an object with a `next()` method returning `{ value, done }`. All of the following rely on this protocol: `for...of` loops, spread operator `[...iterable]`, array destructuring `const [a, b] = iterable`, `Array.from(iterable)`, `new Map(iterable)`, `new Set(iterable)`, `Promise.all(iterable)`, `yield*` in generators, and `for await...of` (async iterable variant). Any object implementing `[Symbol.iterator]` works with all of these automatically.

---

## C — Common Pitfalls + Fix

### ❌ Iterating a depleted iterator — returns nothing

```javascript
// ❌ Array's iterator is stateful — depleted after one pass
const iter = [1, 2, 3][Symbol.iterator]()
[...iter]   // [1, 2, 3]
[...iter]   // [] — iterator is exhausted ❌

// Arrays are re-iterable because each [Symbol.iterator]() creates a NEW iterator
const arr = [1, 2, 3]
[...arr]    // [1, 2, 3] ✅
[...arr]    // [1, 2, 3] ✅ — fresh iterator each time

// ✅ Self-referential iterators (return this) are single-use — don't reuse
// ✅ Proper iterables return a new iterator object each time
```

---

## K — Coding Challenge + Solution

### Challenge

Create an `InfiniteCounter(start, step)` iterable class that yields numbers indefinitely. Use it with a `take(n, iterable)` utility to get the first `n` values without an infinite loop.

### Solution

```javascript
class InfiniteCounter {
  constructor(start = 0, step = 1) {
    this.start = start
    this.step  = step
  }

  [Symbol.iterator]() {
    let current = this.start
    const step  = this.step
    return {
      next() { return { value: current, done: (current += step) - step >= Infinity } },
      // Simpler:
      next() { const value = current; current += step; return { value, done: false } }
    }
  }
}

function take(n, iterable) {
  const result = []
  for (const item of iterable) {
    result.push(item)
    if (result.length >= n) break
  }
  return result
}

take(5, new InfiniteCounter(0, 2))    // [0, 2, 4, 6, 8]
take(5, new InfiniteCounter(10, 3))   // [10, 13, 16, 19, 22]
```

---

---

# 7 — Iterators — next() Protocol, return(), throw()

---

## T — TL;DR

An **iterator** has `next()` → `{value, done}`. Optionally: `return(value)` for early termination (cleanup), `throw(err)` to inject an error. These are used by `for...of` internally — `break` calls `return()`, thrown errors inside the loop call `throw()`. Understanding this enables correct resource cleanup in custom iterators.

---

## K — Key Concepts

```javascript
// ── Iterator protocol detail ───────────────────────────────────────────────
const iter = [1, 2, 3][Symbol.iterator]()

iter.next()   // { value: 1, done: false }
iter.next()   // { value: 2, done: false }
iter.next()   // { value: 3, done: false }
iter.next()   // { value: undefined, done: true }
iter.next()   // { value: undefined, done: true } — stays done

// ── return() — called by for...of on early exit ────────────────────────────
function makeFileIterator(lines) {
  let index    = 0
  let isOpen   = true
  return {
    next() {
      if (!isOpen || index >= lines.length) return { value: undefined, done: true }
      return { value: lines[index++], done: false }
    },
    return(value) {
      // Called when for...of loop breaks early
      isOpen = false
      console.log('File closed (early exit)')
      return { value, done: true }   // must return { value, done }
    },
    [Symbol.iterator]() { return this }
  }
}

const fileIter = makeFileIterator(['line1', 'line2', 'line3', 'line4'])
for (const line of fileIter) {
  console.log(line)
  if (line === 'line2') break   // triggers fileIter.return() ✅
}
// line1, line2, "File closed (early exit)"
```

```javascript
// ── throw() — inject error into iterator ──────────────────────────────────
function makeResumableIter(items) {
  let index = 0
  return {
    next(injected) {
      // injected = value sent back via .next(value) in generators
      return index < items.length
        ? { value: items[index++], done: false }
        : { value: undefined, done: true }
    },
    throw(err) {
      console.error('Iterator received error:', err.message)
      return { value: undefined, done: true }   // terminate gracefully
    },
    [Symbol.iterator]() { return this }
  }
}
```

```javascript
// ── Consuming iterators manually ──────────────────────────────────────────
function collectAll(iterable) {
  const iterator = iterable[Symbol.iterator]()
  const results  = []

  try {
    while (true) {
      const { value, done } = iterator.next()
      if (done) break
      results.push(value)
    }
  } catch (err) {
    iterator.return?.()   // cleanup on error ✅
    throw err
  }
  return results
}

// ── Checking if something is iterable ────────────────────────────────────
function isIterable(value) {
  return value != null && typeof value[Symbol.iterator] === 'function'
}

isIterable([1,2,3])    // true
isIterable('hello')    // true
isIterable(new Map())  // true
isIterable({})         // false — plain objects are NOT iterable
isIterable(42)         // false
```

---

## W — Why It Matters

- `return()` on iterators is how `for...of` prevents resource leaks — database cursor iterators, file stream iterators, and network stream iterators should implement `return()` to close connections when the loop breaks early. Without it, connections leak.
- Manual iterator consumption (`while (true)` + `.next()`) is the pattern in generator-based middleware (Redux-Saga) and streaming parsers where you need more control than `for...of` provides.
- `isIterable` guard is necessary before spreading or `for...of` — spreading a non-iterable throws a `TypeError`. Always check for large inputs from external sources.

---

## I — Interview Q&A

### Q: What does `return()` on an iterator do and when is it called?

**A:** `return(value)` is an optional method on iterators that signals early termination — a chance for the iterator to release resources. It's called automatically by `for...of` when the loop exits early via `break`, `return`, or a `throw`. It must return `{ value, done: true }`. If your iterator holds resources (open file handle, database cursor, network connection), implement `return()` to close them — otherwise `break`ing out of a `for...of` over your iterator leaks the resource. Generators automatically handle `return()` by resuming the generator at the `yield` and running any `finally` blocks.

---

## C — Common Pitfalls + Fix

### ❌ Iterator that doesn't implement `return()` — resource leak on break

```javascript
// ❌ DB cursor not closed when loop breaks early
function dbCursorIter(cursor) {
  return {
    async next() {
      const row = await cursor.fetchOne()
      return row ? { value: row, done: false } : { value: undefined, done: true }
    },
    // No return() — cursor never closed if loop breaks ❌
    [Symbol.iterator]() { return this }
  }
}

// ✅ Implement return() for cleanup
function dbCursorIter2(cursor) {
  return {
    async next() {
      const row = await cursor.fetchOne()
      return row ? { value: row, done: false } : { value: undefined, done: true }
    },
    async return() {
      await cursor.close()   // always close cursor ✅
      return { value: undefined, done: true }
    },
    [Symbol.iterator]() { return this }
  }
}
```

---

## K — Coding Challenge + Solution

### Challenge

Implement a `zip(...iterables)` function that yields tuples from multiple iterables simultaneously (like Python's `zip`), stopping when the shortest iterable is exhausted. Properly call `return()` on remaining iterators.

### Solution

```javascript
function* zip(...iterables) {
  const iters = iterables.map(it => it[Symbol.iterator]())
  try {
    while (true) {
      const results = iters.map(it => it.next())
      if (results.some(r => r.done)) break
      yield results.map(r => r.value)
    }
  } finally {
    // Close any iterators that are still open (have return())
    for (const iter of iters) iter.return?.()
  }
}

[...zip([1,2,3], ['a','b','c'])]
// [[1,'a'], [2,'b'], [3,'c']]

[...zip([1,2,3], ['a','b'])]
// [[1,'a'], [2,'b']] — stops at shortest ✅

for (const [num, letter] of zip([1,2,3,4,5], 'abc')) {
  console.log(num, letter)   // 1 a, 2 b, 3 c
}
```

---

---

# 8 — Generators — yield, yield*, lazy evaluation

---

## T — TL;DR

A **generator function** (`function*`) returns a generator — both an iterable and an iterator. `yield` pauses execution and sends a value out. `yield*` delegates to another iterable. `return` ends the generator. Two-way communication: the caller can send values back via `next(value)` and errors via `throw(err)`. Generators enable lazy sequences, infinite streams, and coroutine-like control flow.

---

## K — Key Concepts

```javascript
// ── Basic generator ────────────────────────────────────────────────────────
function* count(start = 0) {
  let n = start
  while (true) {
    yield n++     // pause, send n, wait to resume
  }
}

const counter = count(1)
counter.next()   // { value: 1, done: false }
counter.next()   // { value: 2, done: false }
[...take(5, count(10))]  // [10,11,12,13,14] ✅ (with take from subtopic 6)

// ── Finite generator ──────────────────────────────────────────────────────
function* range(start, end, step = 1) {
  for (let i = start; i <= end; i += step) yield i
}
[...range(1, 5)]     // [1, 2, 3, 4, 5]
[...range(0, 10, 2)] // [0, 2, 4, 6, 8, 10]
```

```javascript
// ── yield* — delegate to another iterable ─────────────────────────────────
function* flatten(arr) {
  for (const item of arr) {
    if (Array.isArray(item)) yield* flatten(item)  // recurse ✅
    else yield item
  }
}
[...flatten([1,[2,[3,[4]],5]])]   // [1, 2, 3, 4, 5]

// yield* on any iterable
function* concat(...iterables) {
  for (const it of iterables) yield* it
}
[...concat([1,2], 'abc', new Set([3,4]))]
// [1, 2, 'a', 'b', 'c', 3, 4]
```

```javascript
// ── Two-way communication ──────────────────────────────────────────────────
function* adder() {
  let total = 0
  while (true) {
    const n = yield total    // yield current total; receive next n
    total  += n
  }
}

const gen = adder()
gen.next()      // { value: 0, done: false }  — start (n = undefined)
gen.next(10)    // { value: 10, done: false } — send 10, receive 10
gen.next(5)     // { value: 15, done: false } — send 5, receive 15
gen.next(3)     // { value: 18, done: false }

// ── generator.return(value) — terminate ──────────────────────────────────
const g = range(1, 100)
g.next()          // { value: 1, done: false }
g.return(99)      // { value: 99, done: true } — ends the generator
g.next()          // { value: undefined, done: true }

// ── generator.throw(err) — inject error ──────────────────────────────────
function* safe() {
  try {
    yield 1
    yield 2
  } catch (err) {
    console.error('caught:', err.message)
    yield -1   // recovery value
  }
}
const s = safe()
s.next()                              // { value: 1 }
s.throw(new Error('injected'))        // caught: injected → { value: -1 }
```

```javascript
// ── Lazy evaluation benefit ────────────────────────────────────────────────
// ❌ Eager: computes all 1 million values upfront
const eagerSquares = Array.from({ length: 1_000_000 }, (_, i) => i * i)
// 1M numbers in memory

// ✅ Lazy: computes on demand
function* lazySquares() {
  let n = 0
  while (true) yield n++ ** 2
}

function* takeWhile(predicate, iterable) {
  for (const v of iterable) {
    if (!predicate(v)) break
    yield v
  }
}

const result = [...takeWhile(n => n < 100, lazySquares())]
// [0, 1, 4, 9, 16, 25, 36, 49, 64, 81] — only computes what's needed ✅
```

---

## W — Why It Matters

- Generators are how Redux-Saga and similar middleware libraries work — `yield effect` pauses the saga, the middleware intercepts the yielded value (an effect descriptor), runs it, and resumes the generator with the result. This makes async flows testable.
- `yield*` for recursive data structures (flatten, tree traversal) produces clean, readable code compared to the iterative alternative with a manual stack.
- Lazy evaluation via generators handles infinite sequences and large datasets — a generator for reading CSV lines yields one row at a time, using constant memory regardless of file size.

---

## I — Interview Q&A

### Q: What is the difference between `yield` and `yield*` in a generator?

**A:** `yield value` pauses the generator and emits `value` to the consumer — one value per `yield`. `yield* iterable` delegates to another iterable, emitting all its values in sequence as if they were yielded individually from the current generator. `yield* inner` is equivalent to `for (const v of inner) yield v`. The key addition: `yield*` returns the value passed to the inner generator's `return()` — the expression `const result = yield* inner` captures that return value, which `for...of` alone can't do. Use `yield*` for composing generators, recursive iteration, and flattening nested iterables.

---

## C — Common Pitfalls + Fix

### ❌ First `next()` call can't send a meaningful value

```javascript
// ❌ The value passed to the FIRST next() is always discarded
function* receiver() {
  const first = yield 'ready'   // first next() starts here
  console.log('received:', first)
}
const g = receiver()
g.next('ignored')   // 'ignored' is discarded — generator wasn't at a yield yet
g.next('hello')     // received: hello ✅

// ✅ Prime the generator first (call next() once to reach first yield)
const g2 = receiver()
g2.next()           // prime — reaches first yield, returns { value: 'ready' }
g2.next('hello')    // received: hello ✅

// Utility to auto-prime
function prime(gen) {
  gen.next()   // advance to first yield
  return gen
}
```

---

## K — Coding Challenge + Solution

### Challenge

Write a generator `function* tree(node)` that does an in-order depth-first traversal of a binary tree. Each node is `{ value, left, right }`. Show it with `yield*` for clean recursion.

### Solution

```javascript
function* inOrder(node) {
  if (!node) return
  yield* inOrder(node.left)    // left subtree
  yield node.value             // current node
  yield* inOrder(node.right)   // right subtree
}

const tree = {
  value: 4,
  left:  { value: 2, left: { value: 1, left: null, right: null },
                      right: { value: 3, left: null, right: null } },
  right: { value: 6, left: { value: 5, left: null, right: null },
                      right: { value: 7, left: null, right: null } },
}

console.log([...inOrder(tree)])   // [1, 2, 3, 4, 5, 6, 7] ✅

// Pre-order traversal with yield*
function* preOrder(node) {
  if (!node) return
  yield node.value
  yield* preOrder(node.left)
  yield* preOrder(node.right)
}
console.log([...preOrder(tree)])  // [4, 2, 1, 3, 6, 5, 7]
```

---

---

# 9 — Map, Set, WeakMap, WeakSet, WeakRef

---

## T — TL;DR

`Map` is a key-value store where keys can be any type (vs Object which stringifies keys). `Set` is a collection of unique values. `WeakMap`/`WeakSet` hold weak references — entries are garbage-collected when the key object is no longer reachable. `WeakRef` holds a weak reference to a single object. Use weak collections for metadata caches that shouldn't prevent GC.

---

## K — Key Concepts

```javascript
// ── Map — any type as key ─────────────────────────────────────────────────
const map = new Map()
map.set('string', 1)
map.set(42, 'number key')
map.set({}, 'object key')   // object as key ✅
map.set(Symbol('s'), 'sym')

map.get('string')   // 1
map.has(42)         // true
map.size            // 4
map.delete('string')

// Map from array
const m = new Map([['a', 1], ['b', 2], ['c', 3]])
// Iteration
for (const [key, value] of m) {}
[...m.keys()]      // ['a', 'b', 'c']
[...m.values()]    // [1, 2, 3]
[...m.entries()]   // [['a',1],['b',2],['c',3]]
m.forEach((v, k) => console.log(k, v))

// Map vs Object:
// Map: any key type, ordered by insertion, .size, iterable
// Object: string/symbol keys only, prototype pollution risk, no .size
// Use Map when: keys are non-strings, unknown keys, frequent add/delete
```

```javascript
// ── Set — unique values ────────────────────────────────────────────────────
const set = new Set([1, 2, 2, 3, 3, 3])
set   // Set {1, 2, 3}
set.size         // 3
set.has(2)       // true
set.add(4)
set.delete(1)

// Deduplicate array
const unique = [...new Set([1,2,2,3,3,4])]  // [1,2,3,4] ✅

// Set operations (ES2024 has native methods)
const a = new Set([1, 2, 3, 4])
const b = new Set([3, 4, 5, 6])

// Union
const union = new Set([...a, ...b])             // {1,2,3,4,5,6}
// Intersection
const inter = new Set([...a].filter(x => b.has(x)))  // {3,4}
// Difference
const diff  = new Set([...a].filter(x => !b.has(x))) // {1,2}

// ES2024 native (if available)
a.union(b)        // {1,2,3,4,5,6}
a.intersection(b) // {3,4}
a.difference(b)   // {1,2}
```

```javascript
// ── WeakMap — weak object key references ──────────────────────────────────
// Keys MUST be objects (or registered symbols in ES2023)
// Entries are automatically removed when key is garbage collected
// NOT enumerable — no .size, .keys(), .values()

const cache = new WeakMap()

function processUser(user) {
  if (cache.has(user)) return cache.get(user)   // cached result ✅
  const result = expensiveCompute(user)
  cache.set(user, result)
  return result
}
// When 'user' object is GC'd, its cache entry is automatically removed ✅
// No memory leak — WeakMap doesn't prevent GC ✅

// ── WeakSet — weak object references ──────────────────────────────────────
const initialized = new WeakSet()

function init(obj) {
  if (initialized.has(obj)) return   // already initialized
  doSetup(obj)
  initialized.add(obj)
}
// When obj is GC'd, removed from WeakSet automatically ✅
```

```javascript
// ── WeakRef — weak single-object reference ────────────────────────────────
// Allows you to hold a reference without preventing GC
// .deref() returns the object or undefined if it's been collected

class ObjectPool {
  #pool = new Map()

  get(key, factory) {
    const ref = this.#pool.get(key)
    const cached = ref?.deref()     // deref() — may return undefined
    if (cached) return cached

    const fresh = factory()
    this.#pool.set(key, new WeakRef(fresh))   // weak reference ✅
    return fresh
  }
}
// If cached objects aren't used, GC can reclaim them
// Without WeakRef: regular Map reference keeps objects alive forever

// FinalizationRegistry — callback when WeakRef target is GC'd
const registry = new FinalizationRegistry((key) => {
  console.log(`Object with key "${key}" was garbage collected`)
})
const obj = { data: 'big data' }
registry.register(obj, 'myKey')
```

---

## W — Why It Matters

- `Map` outperforms `Object` for frequent key insertions/deletions and non-string keys — benchmark-wise, `Map.get`/`.set` is faster for dynamic key workloads, and there's no prototype chain to worry about.
- `WeakMap` for private data is the pre-`#field` pattern — store private state in a `WeakMap` keyed by the instance, preventing external access while avoiding memory leaks. `#fields` replaced this but you'll see the pattern in legacy code.
- `WeakMap` and `WeakSet` prevent memory leaks in caches and metadata stores — if you cache computed results in a `Map` with DOM nodes as keys, removed DOM nodes stay in the Map forever. `WeakMap` automatically cleans up when the DOM node is removed.

---

## I — Interview Q&A

### Q: When would you use a `WeakMap` instead of a `Map`?

**A:** Use `WeakMap` when: (1) the keys are objects whose lifetime you don't control and you don't want to prevent garbage collection, (2) you're caching computed results per object instance — when the object is GC'd, the cached result is automatically cleared, (3) you're attaching private metadata to objects (pre-`#field` pattern). Use `Map` when: you need to enumerate keys (`.size`, `.keys()`), keys may be non-object primitives, or you need the entries to persist even after the key object is no longer referenced elsewhere. `WeakMap` is opaque and automatic — you trade visibility for automatic memory management.

---

## C — Common Pitfalls + Fix

### ❌ Using Object as a Map — string coercion of keys

```javascript
// ❌ Object coerces all keys to strings
const obj = {}
const key1 = { id: 1 }
const key2 = { id: 2 }
obj[key1] = 'user1'
obj[key2] = 'user2'  // ❌ both become obj['[object Object]']!
console.log(Object.keys(obj))   // ['[object Object]'] — only one entry ❌

// ✅ Map preserves key identity
const map = new Map()
map.set(key1, 'user1')
map.set(key2, 'user2')
map.size   // 2 ✅
map.get(key1)  // 'user1' ✅
```

---

## K — Coding Challenge + Solution

### Challenge

Implement a `LRUCache(capacity)` class using a `Map` (insertion-order iteration). It should have `get(key)` (returns value or -1, moves to end) and `put(key, value)` (evicts oldest when over capacity).

### Solution

```javascript
class LRUCache {
  #capacity
  #cache = new Map()   // insertion order = LRU order

  constructor(capacity) { this.#capacity = capacity }

  get(key) {
    if (!this.#cache.has(key)) return -1
    const value = this.#cache.get(key)
    this.#cache.delete(key)      // remove
    this.#cache.set(key, value)  // re-insert at end (most recently used)
    return value
  }

  put(key, value) {
    if (this.#cache.has(key)) this.#cache.delete(key)
    this.#cache.set(key, value)
    if (this.#cache.size > this.#capacity) {
      const oldest = this.#cache.keys().next().value  // first key = oldest
      this.#cache.delete(oldest)
    }
  }
}

const lru = new LRUCache(3)
lru.put(1, 'a'); lru.put(2, 'b'); lru.put(3, 'c')
lru.get(1)        // 'a' — moves 1 to end
lru.put(4, 'd')   // evicts 2 (now oldest)
lru.get(2)        // -1 — evicted ✅
lru.get(3)        // 'c' ✅
```

---

---

# 10 — Modern JS Operators

---

## T — TL;DR

Six operator features you'll encounter daily in modern JS/TS codebases: **nullish assignment** (`??=`), **logical OR assignment** (`||=`), **logical AND assignment** (`&&=`), **exponentiation** (`**`), **numeric separators** (`1_000_000`), and the related **optional chaining** + **nullish coalescing** review. Short, powerful, each with a precise use case.

---

## K — Key Concepts

```javascript
// ── Nullish assignment ??= ────────────────────────────────────────────────
// Assigns ONLY if the left side is null or undefined
let user = null
user ??= { name: 'Guest' }    // user = { name: 'Guest' } ✅
user ??= { name: 'Other' }    // no-op — user is already non-null

let config = {}
config.timeout ??= 5000       // sets timeout (was undefined) ✅
config.timeout ??= 9999       // no-op — timeout is 5000, not null/undefined

// Use case: initialise cache entries
function getOrCreate(cache, key, factory) {
  cache[key] ??= factory()    // only calls factory if key is absent ✅
  return cache[key]
}
```

```javascript
// ── Logical OR assignment ||= ──────────────────────────────────────────────
// Assigns if left side is FALSY (0, '', false, null, undefined)
let title = ''
title ||= 'Untitled'          // title = 'Untitled' ('' is falsy)

let count = 0
count ||= 10                  // count = 10 — 0 is falsy ⚠️ (often unintended!)
// Use ??= when 0 or '' are valid values

// ── Logical AND assignment &&= ────────────────────────────────────────────
// Assigns if left side is TRUTHY
let obj = { name: 'Mark' }
obj &&= { ...obj, updated: true }  // replaces obj if obj is truthy ✅

let nilObj = null
nilObj &&= { updated: true }   // no-op — null is falsy ✅

// Use case: conditional update
user &&= { ...user, lastSeen: new Date() }  // update only if user exists ✅
```

```javascript
// ── Exponentiation ** ────────────────────────────────────────────────────
2 ** 10     // 1024   (same as Math.pow(2, 10))
2 ** 0.5    // 1.4142... (square root)
(-2) ** 3   // -8    (needs parens — unary minus has lower precedence)
4 ** 0.5    // 2     (square root)

// Compound assignment
let n = 2
n **= 8     // 256 — same as n = n ** 8

// Prefer ** over Math.pow for readability:
const hypotenuse = (a, b) => (a**2 + b**2) ** 0.5  // clean ✅
```

```javascript
// ── Numeric separators _ ─────────────────────────────────────────────────
// Purely visual — ignored by JavaScript, improves readability
const million   = 1_000_000
const bytes     = 0xFF_EC_D9_12          // hex with separators
const binary    = 0b1010_0001_1000_0101  // binary with separators
const pi        = 3.141_592_653_589_793
const fee       = 123_456.789_0
const bigint    = 1_000_000_000n         // BigInt with separator

// Rules: can't start or end with _, can't have consecutive __
// 1_000   ✅ | _100 ❌ | 100_ ❌ | 1__000 ❌
```

```javascript
// ── Optional chaining review ?.  ──────────────────────────────────────────
const user = null
user?.name             // undefined (not TypeError)
user?.address?.city    // undefined
user?.getName?.()      // undefined (method doesn't exist — no call)
user?.[dynamicKey]     // undefined (bracket access)

const arr = null
arr?.[0]               // undefined

// With nullish coalescing
const city = user?.address?.city ?? 'Unknown'   // 'Unknown' ✅

// ── Nullish coalescing ?? review ──────────────────────────────────────────
null      ?? 'default'   // 'default'
undefined ?? 'default'   // 'default'
0         ?? 'default'   // 0    ← 0 is NOT null/undefined ✅
''        ?? 'default'   // ''   ← '' is NOT null/undefined ✅
false     ?? 'default'   // false ✅
NaN       ?? 'default'   // NaN  ✅

// ── Operator quick-reference ──────────────────────────────────────────────
/*
??=    Assign if null/undefined    | cache[key] ??= compute()
||=    Assign if falsy             | title ||= 'Untitled'
&&=    Assign if truthy            | obj &&= transform(obj)
**     Exponentiation              | 2 ** 10
?.     Optional chain              | user?.address?.city
??     Nullish coalescing default  | value ?? 'default'
1_000  Numeric separator           | const MB = 1_048_576
*/
```

---

## W — Why It Matters

- `??=` vs `||=` is a real correctness issue — for counters, ports, scores, and flags, `0`, `''`, and `false` are valid values. `||=` silently replaces them with defaults. `??=` only replaces `null`/`undefined`. Choose carefully.
- Numeric separators make large literal numbers readable without affecting value — `1_000_000` is exactly `1000000`. Critical for constants like `MAX_UPLOAD_SIZE = 10_485_760` (10MB in bytes) or `TIMEOUT = 30_000`.
- `&&=` for conditional updates is cleaner than `if (obj) obj = transform(obj)` — particularly useful in React state updates: `draft.user &&= { ...draft.user, updatedAt: Date.now() }`.

---

## I — Interview Q&A

### Q: What is the difference between `??=`, `||=`, and `&&=`?

**A:** All three are logical assignment operators that only assign when a condition holds. `??=` (nullish assignment) assigns only when the left side is `null` or `undefined` — safe for falsy-but-valid values like `0`, `''`, `false`. `||=` (OR assignment) assigns when the left side is any falsy value — useful when `0` and `''` should be treated as "absent," but dangerous otherwise. `&&=` (AND assignment) assigns when the left side is truthy — useful for conditional transforms: update only if the object exists. All three short-circuit — the right side is not evaluated if the condition isn't met.

---

## C — Common Pitfalls + Fix

### ❌ Using `||=` for numeric defaults — replaces valid `0`

```javascript
// ❌ score = 0 is a valid score, but ||= treats it as absent
let score = 0
score ||= 100   // score becomes 100 — 0 overwritten ❌

// ❌ port = 0 (valid in some contexts)
let port = parseInt(process.env.PORT)  // may be 0
port ||= 3000   // becomes 3000 — 0 overwritten ❌

// ✅ Use ??= — only replaces null/undefined
let score2 = 0
score2 ??= 100   // stays 0 ✅

let port2 = Number.isNaN(parseInt(process.env.PORT))
  ? undefined
  : parseInt(process.env.PORT)
port2 ??= 3000   // only defaults when truly absent ✅
```

---

## K — Coding Challenge + Solution

### Challenge

Write a `deepMerge(target, source)` function that merges `source` into `target` using `??=` for missing properties. Then demonstrate all assignment operators in a real settings-update function.

### Solution

```javascript
function deepMerge(target, source) {
  for (const [key, value] of Object.entries(source)) {
    if (value !== null && typeof value === 'object' && !Array.isArray(value)) {
      target[key] ??= {}                    // create nested obj if missing
      deepMerge(target[key], value)
    } else {
      target[key] ??= value   // only set if target[key] is null/undefined ✅
    }
  }
  return target
}

const defaults = { theme: 'light', font: { size: 14, family: 'sans' }, debug: false }
const user     = { theme: 'dark', font: { size: 16 } }
const merged   = deepMerge({ ...user }, defaults)
// { theme: 'dark', font: { size: 16, family: 'sans' }, debug: false }
// theme/size kept (user values) | family/debug added (defaults) ✅

// All assignment operators in one settings updater
function updateSettings(settings, patch) {
  settings.title  ||= 'Untitled'          // set if currently falsy
  settings.count  ??= 0                   // set only if null/undefined
  settings.active &&= { ...settings.active, updatedAt: Date.now() }  // transform if truthy

  // Exponentiation for display
  const MB = 10 ** 6
  settings.maxUpload ??= 5 * MB           // 5_000_000 bytes = 5MB ✅

  // Numeric separators for clarity
  settings.rateLimit ??= 1_000            // 1,000 req/min

  return { ...settings, ...patch }
}
```

---

## ✅ Day 6 Complete — Modules, Error Handling, Iteration & Modern JS

| # | Subtopic | Status |
|---|----------|--------|
| 1 | CommonJS vs ES Modules | ☐ |
| 2 | Named/Default/Re-exports, Barrel Files | ☐ |
| 3 | Dynamic import, import.meta, Top-level await | ☐ |
| 4 | Error Fields, Custom Error Classes, AggregateError | ☐ |
| 5 | throw / catch / rethrow Patterns | ☐ |
| 6 | Iterables and Symbol.iterator | ☐ |
| 7 | Iterators — next() Protocol, return(), throw() | ☐ |
| 8 | Generators — yield, yield*, lazy evaluation | ☐ |
| 9 | Map, Set, WeakMap, WeakSet, WeakRef | ☐ |
| 10 | Modern JS Operators | ☐ |

---

## 🗺️ One-Page Mental Model — Day 6

```
MODULES
  CJS:  require() / module.exports — sync, runtime, .cjs
  ESM:  import / export — static, async, .mjs or "type":"module"
  CJS→ESM: use import() | ESM→CJS: import default works ✅
  Named: { fn } | Default: import X | Re-export: export { x } from
  Barrel: index.js aggregates public API — use specific exports (tree-shaking)
  Dynamic: import('./module.js') → Promise<namespace> — lazy, conditional
  import.meta.url / .filename / .dirname (Node 22+) | .env (Vite)
  Top-level await: pauses module — importing module waits
  Module evaluation: depth-first, cached — each module runs ONCE

ERRORS
  Error fields: message, name, stack, cause (ES2022)
  Custom class: extends Error, set this.name, add code/status/context
  Error.captureStackTrace — clean stack (skip constructor frame)
  AggregateError: holds multiple errors — thrown by Promise.any
  error.cause: chain errors without losing original
  Hierarchy: AppError → ValidationError/NotFoundError/DatabaseError

THROW / CATCH
  Always throw Error instances (not strings or plain objects)
  Catch specific errors → handle | Catch unknown → rethrow
  Never: empty catch | catch just to log without rethrow
  finally: cleanup only, no return (overrides try's return)
  Wrapping: throw new AppError('msg', { cause: originalErr })
  asyncHandler wrapper: catch → next(err) in Express ✅

ITERABLES + ITERATORS
  Iterable: has [Symbol.iterator]() → returns iterator
  Iterator: has next() → { value, done }
  for...of / spread / destructure / Array.from all use Symbol.iterator
  return(): called on early loop exit (break/return/throw) — cleanup
  throw(): inject error into iterator
  isIterable: typeof value[Symbol.iterator] === 'function'
  Infinite iterables: fine — use break or take() to limit

GENERATORS
  function* → returns generator (iterable + iterator)
  yield value → pause, emit value, wait to resume
  yield* iterable → delegate, emit all values from iterable
  next(value) → resume with injected value (first call: value discarded)
  gen.return(v) → terminate | gen.throw(err) → inject error
  Lazy: computes values on demand — no memory for infinite sequences
  Use: sequences, tree traversal, Redux-Saga, streaming data

MAP / SET / WEAK
  Map:    any key type, ordered, .size, iterable — prefer over Object for dynamic keys
  Set:    unique values, fast .has(), dedup arrays with [...new Set(arr)]
  WeakMap: object keys only, not enumerable, GC-friendly — metadata caches ✅
  WeakSet: object values only, not enumerable — "seen" tracking ✅
  WeakRef: deref() → object or undefined — optional reference
  Object as map: string-coerces keys → silent collision bugs ❌

MODERN OPERATORS
  ??=   assign if null/undefined (safe for 0, '', false)
  ||=   assign if falsy (replaces 0 and '' — be careful)
  &&=   assign if truthy (conditional transform)
  **    exponentiation (2**10 = 1024) | **= compound
  1_000_000 numeric separator — visual only, no runtime effect
  ?.    optional chain — undefined instead of TypeError
  ??    nullish default — only null/undefined trigger fallback
  Rule: prefer ??= over ||= for numeric/boolean/string defaults
```

> **Your next action:** Open a Node.js REPL with `node --input-type=module`, type `function* r(s,e){for(let i=s;i<=e;i++)yield i}` then `[...r(1,5)]` — watch a generator build an array lazily. Thirty seconds in a REPL beats rereading this section.

> "Doing one small thing beats opening a feed."