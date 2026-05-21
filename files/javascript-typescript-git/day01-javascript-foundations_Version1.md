
# 📅 Day 1 — JavaScript Foundations, Types & Runtime Environment

> **Goal:** Build the mental model for JavaScript's runtime environment, type system, operators, and control flow — the layer everything else sits on.
> **Format:** Each subtopic = 5–15 min. Do one. Stop. Come back.
> **Stack:** Node.js 22 · TypeScript 6 (as context) · npm 10

---

## 📋 Day 1 Subtopic Overview

| # | Subtopic | Time |
|---|----------|------|
| 1 | Runtime Context — Node.js vs Browser, globalThis | 10 min |
| 2 | Node.js process — env, argv, exit | 8 min |
| 3 | Package Managers — package.json, semver, lockfiles, npm scripts, npx | 12 min |
| 4 | dotenv and console Methods | 8 min |
| 5 | var vs let vs const — Scope, Hoisting, TDZ | 12 min |
| 6 | Primitive Types, typeof, Coercion, == vs === | 12 min |
| 7 | Template Literals and String Methods | 10 min |
| 8 | Number Methods, Math, NaN, Infinity, EPSILON | 12 min |
| 9 | Date Basics — Timestamps, Parsing Gotchas | 10 min |
| 10 | Operators and Control Flow | 12 min |

---

---

# 1 — Runtime Context — Node.js vs Browser, globalThis

---

## T — TL;DR

JavaScript runs in two main environments: the **browser** (DOM, window, fetch, localStorage) and **Node.js** (file system, process, http module). `globalThis` is the universal way to reference the global object in either environment. They share the same language core but have completely different APIs.

---

## K — Key Concepts

```
── Environment comparison ────────────────────────────────────────────────────

Feature              │ Browser              │ Node.js
─────────────────────┼──────────────────────┼──────────────────────────
Global object        │ window               │ global
Universal global     │ globalThis           │ globalThis
DOM                  │ ✅ document, window  │ ❌ not available
fetch (built-in)     │ ✅                   │ ✅ (Node 18+)
File system          │ ❌                   │ ✅ fs module
process              │ ❌                   │ ✅ process.env, argv
Module system        │ ESM (<script type>)  │ CommonJS (require) + ESM
setTimeout/setInterval│ ✅                  │ ✅ (but returns object, not number)
```

```javascript
// ── globalThis — works everywhere ─────────────────────────────────────────
console.log(globalThis === window)   // true in browser
console.log(globalThis === global)   // true in Node.js
console.log(globalThis === self)     // true in Web Workers

// Safe global check — works in any environment
globalThis.myAppConfig = { version: '1.0.0' }

// ── Detecting which environment you're in ─────────────────────────────────
const isBrowser = typeof window !== 'undefined'
const isNode    = typeof process !== 'undefined' && process.versions?.node != null

console.log(isBrowser)  // false in Node.js
console.log(isNode)     // true in Node.js

// ── Module systems ────────────────────────────────────────────────────────
// CommonJS (Node.js default, .js with "type":"commonjs" or .cjs)
const fs = require('fs')
module.exports = { myFunction }

// ESM (modern standard, .mjs or "type":"module" in package.json)
import fs from 'fs'
export function myFunction() {}

// Check which file you're in (CJS only):
console.log(__filename)   // full path to current file
console.log(__dirname)    // directory of current file
// Not available in ESM — use import.meta.url instead:
import { fileURLToPath } from 'url'
const __filename = fileURLToPath(import.meta.url)
```

```javascript
// ── What executes JavaScript ──────────────────────────────────────────────

// Browser: V8 (Chrome), SpiderMonkey (Firefox), JavaScriptCore (Safari)
// Node.js: V8 (same engine as Chrome)

// The JS engine handles: parsing, compilation (JIT), execution
// The runtime handles: I/O, timers, HTTP, file system (C++ bindings)

// Call stack + event loop — the same model in both environments:
// 1. Synchronous code runs on the call stack
// 2. Async callbacks (setTimeout, I/O) queue in the event loop
// 3. When the call stack is empty, the event loop processes the queue
```

---

## W — Why It Matters

- Understanding the environment stops you from writing `document.getElementById` in a Node.js file or trying to use `fs.readFile` in a browser — both are common beginner errors in full-stack JavaScript.
- `globalThis` is the correct way to write environment-agnostic code (shared utilities, polyfills, testing helpers) — avoid `window` or `global` directly unless you're certain of the environment.
- Node.js and the browser sharing V8 means the same JS language quirks and performance characteristics apply in both — understanding one deeply helps you understand the other.

---

## I — Interview Q&A

### Q: What is the difference between `window`, `global`, and `globalThis`?

**A:** `window` is the global object in browsers — it holds DOM APIs, `setTimeout`, `fetch`, etc. `global` is the global object in Node.js — it holds `process`, `Buffer`, `require`, etc. `globalThis` is a standardised reference (ES2020) that points to the correct global object regardless of environment — `window` in browsers, `global` in Node.js. Use `globalThis` when writing code that must run in both environments.

---

## C — Common Pitfalls + Fix

### ❌ Using `__dirname` in an ESM module

```javascript
// ❌ __dirname is not defined in ESM
console.log(__dirname)  // ReferenceError: __dirname is not defined

// ✅ ESM equivalent
import { fileURLToPath } from 'url'
import { dirname }       from 'path'
const __filename = fileURLToPath(import.meta.url)
const __dirname  = dirname(__filename)
```

---

## K — Coding Challenge + Solution

### Challenge

Write a function `getRuntimeInfo()` that returns an object with `environment` (`'browser'` or `'node'`), the `globalThis` reference, and (if Node.js) the Node version string.

### Solution

```javascript
function getRuntimeInfo() {
  const isNode = typeof process !== 'undefined' && process.versions?.node != null
  return {
    environment: isNode ? 'node' : 'browser',
    global:      globalThis,
    nodeVersion: isNode ? process.versions.node : null,
  }
}

console.log(getRuntimeInfo())
// Node.js: { environment: 'node', global: [Object], nodeVersion: '22.x.x' }
// Browser: { environment: 'browser', global: Window {}, nodeVersion: null }
```

---

---

# 2 — Node.js process — env, argv, exit

---

## T — TL;DR

`process` is Node.js's window into the runtime — environment variables, command-line arguments, exit codes, and the working directory. It's a global, available everywhere without importing. `process.env` is how you configure an app per environment. `process.argv` is how CLI tools read arguments. `process.exit(code)` terminates the process.

---

## K — Key Concepts

```javascript
// ── process.env — environment variables ──────────────────────────────────
console.log(process.env.NODE_ENV)        // 'development' | 'production' | 'test'
console.log(process.env.PORT)            // always a string or undefined
console.log(process.env.MISSING_VAR)     // undefined (not an error)

// Safe access with fallback
const port = Number(process.env.PORT) || 3000
const env  = process.env.NODE_ENV ?? 'development'

// Setting in shell:
// NODE_ENV=production node server.js
// PORT=8080 node server.js
```

```javascript
// ── process.argv — command-line arguments ─────────────────────────────────
// node script.js hello --name Mark --count 3
console.log(process.argv)
// [
//   '/usr/bin/node',        // [0] path to node executable
//   '/app/script.js',       // [1] path to script
//   'hello',                // [2] first user argument
//   '--name',               // [3]
//   'Mark',                 // [4]
//   '--count',              // [5]
//   '3'                     // [6] always a string
// ]

const args = process.argv.slice(2)  // user arguments only: ['hello', '--name', ...]

// Simple argument parser (without a library)
function getArg(name) {
  const idx = process.argv.indexOf(`--${name}`)
  return idx !== -1 ? process.argv[idx + 1] : undefined
}
console.log(getArg('name'))   // 'Mark'
console.log(getArg('count'))  // '3' ← always string, convert if needed
```

```javascript
// ── process.exit — terminate with an exit code ────────────────────────────
// Exit code 0  = success (default)
// Exit code 1  = general error (most common for failures)
// Exit code 2  = misuse of shell command / invalid argument

if (!process.env.DATABASE_URL) {
  console.error('ERROR: DATABASE_URL is required')
  process.exit(1)   // signal failure to the shell / CI system ✅
}

// Graceful shutdown pattern
process.on('SIGTERM', () => {
  console.log('Received SIGTERM — shutting down gracefully')
  // close DB connections, finish in-flight requests
  process.exit(0)
})

// ── Other useful process properties ──────────────────────────────────────
console.log(process.cwd())          // current working directory
console.log(process.platform)       // 'linux' | 'darwin' | 'win32'
console.log(process.versions.node)  // '22.x.x'
console.log(process.pid)            // process ID number
console.log(process.uptime())       // seconds since process started
process.stdout.write('no newline')  // write to stdout without \n
process.stderr.write('error msg\n') // write to stderr
```

---

## W — Why It Matters

- `process.env` is the industry-standard way to configure Node.js apps without hardcoding values — database URLs, API keys, feature flags all come from environment variables following the 12-factor app methodology.
- All `process.env` values are strings — `process.env.PORT === '3000'`, not `3000`. Forgetting to convert causes silent bugs (`'3000' + 1 === '30001'`).
- Exit codes matter in CI — a script that `process.exit(0)` on failure will tell GitHub Actions it succeeded. Always exit with a non-zero code on error.

---

## I — Interview Q&A

### Q: How do you safely read a required environment variable and crash clearly if it's missing?

**A:** Check for `undefined` early at startup — fail loudly with a descriptive message before the app initialises any connections, rather than getting a confusing error later when the variable is first used.

```javascript
function requireEnv(name) {
  const value = process.env[name]
  if (!value) {
    console.error(`Missing required environment variable: ${name}`)
    process.exit(1)
  }
  return value
}
const dbUrl = requireEnv('DATABASE_URL')
const port  = Number(requireEnv('PORT'))
```

---

## C — Common Pitfalls + Fix

### ❌ Treating `process.env` values as numbers

```javascript
// ❌ process.env.PORT is a string — arithmetic breaks silently
const port = process.env.PORT || 3000
app.listen(port)   // works accidentally but port is '8080' (string)

// ❌ Worse — concatenation instead of addition
console.log(process.env.PORT + 1)  // '30001' not 3001

// ✅ Always convert explicitly
const port = Number(process.env.PORT) || 3000
const port = parseInt(process.env.PORT ?? '3000', 10)
```

---

## K — Coding Challenge + Solution

### Challenge

Write a `loadConfig()` function that reads `PORT`, `NODE_ENV`, and `DATABASE_URL` from `process.env`, provides defaults for `PORT` (3000) and `NODE_ENV` (`development`), and exits with code 1 if `DATABASE_URL` is missing.

### Solution

```javascript
function loadConfig() {
  const databaseUrl = process.env.DATABASE_URL
  if (!databaseUrl) {
    console.error('[config] Missing required DATABASE_URL environment variable')
    process.exit(1)
  }
  return {
    port:        Number(process.env.PORT) || 3000,
    nodeEnv:     process.env.NODE_ENV ?? 'development',
    databaseUrl,
  }
}

const config = loadConfig()
console.log(config)
// { port: 3000, nodeEnv: 'development', databaseUrl: 'postgresql://...' }
```

---

---

# 3 — Package Managers — package.json, semver, lockfiles, npm scripts, npx

---

## T — TL;DR

`package.json` is the project manifest — it declares dependencies, scripts, and metadata. **semver** defines version ranges for packages. **Lockfiles** pin exact versions for reproducible installs. `npm scripts` are task runners. `npx` runs a package binary without installing it globally. Never delete the lockfile.

---

## K — Key Concepts

```json
// package.json — essential fields
{
  "name":        "my-app",
  "version":     "1.0.0",
  "description": "My Node.js application",
  "main":        "dist/index.js",      // CJS entry point
  "module":      "dist/index.mjs",     // ESM entry point
  "types":       "dist/index.d.ts",    // TypeScript types
  "type":        "module",             // treat .js files as ESM
  "engines":     { "node": ">=22.0.0" },

  "scripts": {
    "start":     "node dist/server.js",
    "dev":       "tsx watch src/server.ts",
    "build":     "tsc",
    "test":      "vitest",
    "test:ci":   "vitest run --coverage",
    "lint":      "eslint src",
    "db:migrate": "prisma migrate dev"
  },

  "dependencies": {
    "express":  "^4.18.0",   // ^ = compatible (4.x.x, not 5.x.x)
    "zod":      "~3.22.0",   // ~ = patch only (3.22.x)
    "lodash":   "4.17.21"    // exact version
  },

  "devDependencies": {
    "typescript": "^6.0.0",
    "vitest":     "^4.0.0"
  }
}
```

```
── Semver ranges ──────────────────────────────────────────────────────────────

"4.18.0"    → exact version only
"^4.18.0"   → >=4.18.0 <5.0.0   (same major — most common)
"~4.18.0"   → >=4.18.0 <4.19.0  (same minor — conservative)
">=4.0.0"   → anything 4.0.0 or higher
"*"         → any version (dangerous)
"4.x"       → any 4.x.x
"4.18.x"    → any 4.18.x
"4.18.0 || 5.0.0"  → specific versions only

Semver version structure: MAJOR.MINOR.PATCH
  MAJOR → breaking change
  MINOR → new feature, backward compatible
  PATCH → bug fix only
```

```bash
# ── Lockfiles — pin exact versions ───────────────────────────────────────
# npm  → package-lock.json
# yarn → yarn.lock
# pnpm → pnpm-lock.yaml

# ALWAYS commit lockfiles to git
# NEVER delete them (causes non-reproducible installs)

# npm commands
npm install          # install from package.json, update lockfile
npm ci               # install EXACTLY from lockfile (CI/production)
npm install zod      # add to dependencies
npm install -D vitest # add to devDependencies (-D = --save-dev)
npm uninstall lodash  # remove package
npm update           # update to latest within semver ranges
npm outdated         # show packages with newer versions available
npm audit            # check for security vulnerabilities
npm audit fix        # auto-fix vulnerabilities where possible
```

```bash
# ── npm scripts ───────────────────────────────────────────────────────────
npm run dev          # run "dev" script
npm start            # shortcut for "start" script (no "run" needed)
npm test             # shortcut for "test" script
npm run build        # custom scripts require "run"

# Pre/post hooks — run automatically before/after a script
# "prebuild": "rm -rf dist"   → runs before "build"
# "postbuild": "echo Done"    → runs after  "build"

# Pass arguments to scripts with --
npm run test -- --watch       # passes --watch to vitest

# ── npx — run package binaries ────────────────────────────────────────────
npx prisma generate           # run prisma CLI (installed in node_modules)
npx create-next-app@latest    # download and run without installing
npx tsx src/seed.ts           # run TypeScript file directly

# npx first checks node_modules/.bin, then downloads if not found
```

```bash
# ── Package manager comparison ────────────────────────────────────────────
# npm:  comes with Node.js, slowest, most widely supported
# pnpm: content-addressable store, fastest, best for monorepos
# yarn: (classic or berry) — yarn workspaces well supported

# This curriculum uses npm — all concepts apply to pnpm/yarn with minor syntax differences
```

---

## W — Why It Matters

- `npm install` vs `npm ci` is a production-critical distinction — `npm ci` installs exactly what the lockfile says (reproducible), while `npm install` may update the lockfile. Always use `npm ci` in CI and Docker builds.
- `^` semver range is the npm default and is usually safe for minor/patch updates but can introduce breaking changes if the package doesn't follow semver — this is why lockfiles exist.
- `devDependencies` vs `dependencies` affects production Docker image size — `npm ci --omit=dev` in a production Docker build skips all devDeps, cutting image size significantly. TypeScript, ESLint, and Vitest should always be devDependencies.

---

## I — Interview Q&A

### Q: What is the difference between `npm install` and `npm ci`?

**A:** `npm install` reads `package.json`, resolves the dependency tree respecting semver ranges, and updates `package-lock.json` if needed. It's for development — adding packages, updating versions. `npm ci` reads `package-lock.json` exactly and installs precisely those versions, deletes `node_modules` first, and fails if `package-lock.json` is missing or inconsistent. It's faster (no resolution step) and reproducible — the same lockfile always produces the same `node_modules`. Use `npm ci` in CI pipelines and Dockerfiles.

---

## C — Common Pitfalls + Fix

### ❌ Installing a devDependency as a regular dependency

```bash
# ❌ TypeScript ends up in production bundle
npm install typescript

# ✅ TypeScript is a build tool — only needed during development
npm install -D typescript
# or: npm install --save-dev typescript
```

---

## K — Coding Challenge + Solution

### Challenge

Create a `package.json` for a TypeScript Node.js app that: has scripts for `dev` (tsx watch), `build` (tsc), `start` (node dist/server.js), `test` (vitest run), and `db:seed` (tsx src/seed.ts); declares `express` and `zod` as regular dependencies; declares `typescript`, `vitest`, and `tsx` as devDependencies with `^` ranges.

### Solution

```json
{
  "name": "my-node-app",
  "version": "0.1.0",
  "type": "module",
  "engines": { "node": ">=22.0.0" },
  "scripts": {
    "dev":      "tsx watch src/server.ts",
    "build":    "tsc",
    "start":    "node dist/server.js",
    "test":     "vitest run",
    "db:seed":  "tsx src/seed.ts"
  },
  "dependencies": {
    "express": "^4.18.0",
    "zod":     "^4.0.0"
  },
  "devDependencies": {
    "typescript": "^6.0.0",
    "vitest":     "^4.0.0",
    "tsx":        "^4.0.0"
  }
}
```

---

---

# 4 — dotenv and console Methods

---

## T — TL;DR

`dotenv` loads a `.env` file into `process.env` at startup — the standard way to manage local environment variables without committing secrets to git. `console` has more than just `log` — `error`, `warn`, `table`, `time`/`timeEnd`, `group`, and `assert` each serve a specific debugging purpose.

---

## K — Key Concepts

```bash
# .env — local environment file (NEVER commit to git)
DATABASE_URL=postgresql://postgres:pass@localhost:5432/myapp
PORT=3000
NODE_ENV=development
JWT_SECRET=supersecretkey
API_KEY=abc123
```

```javascript
// ── dotenv setup ──────────────────────────────────────────────────────────
// npm install dotenv

// Option A: import/require at top of entry point
import 'dotenv/config'           // ESM — loads .env immediately
// require('dotenv').config()    // CJS equivalent

// Option B: explicit config with options
import dotenv from 'dotenv'
dotenv.config({
  path:     '.env.local',    // custom file path
  override: true,            // override existing process.env values
  debug:    true,            // log what gets loaded
})

// Multiple env files (common pattern)
dotenv.config({ path: '.env' })
dotenv.config({ path: `.env.${process.env.NODE_ENV}`, override: true })
// .env → shared defaults
// .env.development → dev overrides
// .env.test        → test overrides
// .env.local       → never committed (personal overrides)
```

```javascript
// ── console methods ───────────────────────────────────────────────────────

// Basic output
console.log('Hello', 'World', 42)       // space-separated
console.log({ user: 'Mark', age: 28 })  // pretty-prints objects
console.error('Something broke')        // stderr (red in terminals)
console.warn('This is deprecated')      // stderr (yellow in terminals)

// Structured output
console.table([
  { name: 'Mark',  role: 'admin' },
  { name: 'Alice', role: 'user'  },
])
// ┌─────────┬───────┬─────────┐
// │ (index) │ name  │ role    │
// ├─────────┼───────┼─────────┤
// │ 0       │ Mark  │ admin   │
// └─────────┴───────┴─────────┘

// Timing
console.time('db-query')
await db.query('SELECT * FROM users')
console.timeEnd('db-query')     // db-query: 12.34ms

// Grouping
console.group('Request')
  console.log('Method: GET')
  console.log('Path: /users')
console.groupEnd()

// Assertion — throws AssertionError if false
console.assert(1 === 1, 'Math works')      // nothing
console.assert(1 === 2, '1 is not 2')     // Assertion failed: 1 is not 2

// Count calls
console.count('loop')   // loop: 1
console.count('loop')   // loop: 2
console.countReset('loop')

// Stack trace
console.trace('Where am I?')   // prints current call stack
```

```javascript
// ── String substitution in console ────────────────────────────────────────
console.log('%s is %d years old', 'Mark', 28)   // Mark is 28 years old
console.log('%o', { nested: { object: true } })  // deep object inspection
console.log('%c bold text', 'font-weight:bold')  // browser only (CSS styling)
```

---

## W — Why It Matters

- Never commit `.env` to git — it contains passwords, API keys, and secrets. Always add `.env` to `.gitignore` and commit a `.env.example` with placeholder values.
- `console.error` writes to stderr, not stdout — this is important in CLI tools and Docker where stdout and stderr are processed separately. Error messages belong on stderr; program output belongs on stdout.
- `console.time`/`timeEnd` is the fastest way to profile a slow operation without setting up a profiler — add it around a suspect function, get the duration in milliseconds.

---

## I — Interview Q&A

### Q: What does `dotenv` do and when should you NOT use it?

**A:** `dotenv` reads a `.env` file and populates `process.env` with its key-value pairs. It's used for local development to avoid hardcoding configuration. You should NOT use it in production — in production, environment variables are set by the hosting platform (Vercel, Railway, AWS), the container runtime (Docker, Kubernetes), or a secrets manager. Running `dotenv.config()` in production is harmless if the `.env` file doesn't exist (it silently does nothing), but deploying a `.env` file to a production server is a security risk. The pattern: use dotenv in development, use platform env vars in production.

---

## C — Common Pitfalls + Fix

### ❌ `.env` committed to git — credentials exposed

```bash
# ❌ Forgot to add .env to .gitignore
git add .env
git commit -m "add config"  # API keys now in git history forever ❌

# ✅ .gitignore
.env
.env.local
.env.*.local

# ✅ .env.example — safe to commit, shows structure
DATABASE_URL=postgresql://USER:PASSWORD@localhost:5432/DB
PORT=3000
JWT_SECRET=REPLACE_WITH_SECRET
```

---

## K — Coding Challenge + Solution

### Challenge

Write a `src/config.ts` module that: loads `.env` with dotenv, exports a typed `config` object with `port` (number), `nodeEnv` (string), `databaseUrl` (string — required), and `jwtSecret` (string — required). Log a startup message with `console.log` including the port and environment.

### Solution

```typescript
// src/config.ts
import 'dotenv/config'

function requireEnv(name: string): string {
  const value = process.env[name]
  if (!value) {
    console.error(`[config] Required env var "${name}" is not set`)
    process.exit(1)
  }
  return value
}

export const config = {
  port:        Number(process.env.PORT) || 3000,
  nodeEnv:     process.env.NODE_ENV ?? 'development',
  databaseUrl: requireEnv('DATABASE_URL'),
  jwtSecret:   requireEnv('JWT_SECRET'),
}

console.log(`[config] Loaded — port=${config.port}, env=${config.nodeEnv}`)
```

---

---

# 5 — var vs let vs const — Scope, Hoisting, TDZ

---

## T — TL;DR

Use `const` by default. Use `let` when you need to reassign. Never use `var`. `var` is function-scoped and hoisted with `undefined`. `let`/`const` are block-scoped and hoisted but inaccessible until their declaration (Temporal Dead Zone). `const` prevents reassignment but NOT mutation of objects/arrays.

---

## K — Key Concepts

```javascript
// ── Scope ─────────────────────────────────────────────────────────────────
function example() {
  if (true) {
    var   a = 1   // function-scoped — leaks out of the block
    let   b = 2   // block-scoped — stays inside {}
    const c = 3   // block-scoped — stays inside {}
  }
  console.log(a)  // 1 ✅ (leaked)
  console.log(b)  // ReferenceError ❌
  console.log(c)  // ReferenceError ❌
}

// ── Hoisting ──────────────────────────────────────────────────────────────
// var — hoisted AND initialised to undefined
console.log(x)   // undefined (not an error)
var x = 10

// let/const — hoisted but NOT initialised (Temporal Dead Zone)
console.log(y)   // ReferenceError: Cannot access 'y' before initialization
let y = 20

// ── Temporal Dead Zone (TDZ) ──────────────────────────────────────────────
// TDZ = the region between block start and the let/const declaration line
{
  // ← TDZ for 'name' starts here
  console.log(name)   // ReferenceError (in TDZ)
  let name = 'Mark'   // ← TDZ ends here
  console.log(name)   // 'Mark' ✅
}
```

```javascript
// ── const ≠ immutable ──────────────────────────────────────────────────────
const user = { name: 'Mark' }
user.name = 'Alex'     // ✅ mutation allowed — modifying the object
user = {}              // ❌ TypeError — reassigning the binding

const arr = [1, 2, 3]
arr.push(4)            // ✅ allowed — mutating the array
arr = [5, 6]           // ❌ TypeError

// True shallow immutability: Object.freeze()
const frozen = Object.freeze({ name: 'Mark', score: 100 })
frozen.name = 'Alex'   // silently fails (or throws in strict mode)
console.log(frozen.name)  // still 'Mark'

// ── The var loop bug ──────────────────────────────────────────────────────
// ❌ var — one shared i across all callbacks
for (var i = 0; i < 3; i++) {
  setTimeout(() => console.log(i), 100)  // prints 3, 3, 3
}

// ✅ let — new binding per iteration
for (let i = 0; i < 3; i++) {
  setTimeout(() => console.log(i), 100)  // prints 0, 1, 2
}
```

```javascript
// ── Redeclaration ─────────────────────────────────────────────────────────
var a = 1; var a = 2   // ✅ silently allowed (bad)
let b = 1; let b = 2   // ❌ SyntaxError
const c = 1; const c = 2  // ❌ SyntaxError

// ── Decision rule ─────────────────────────────────────────────────────────
// Start with const → only switch to let if you NEED to reassign
// Never use var in new code
```

---

## W — Why It Matters

- The `var` loop + `setTimeout` bug is a classic interview question and a real production bug — async callbacks closed over `var i` share the same reference and see the final value. `let` fixes this by creating a new binding per iteration.
- `const` communicates intent — it tells the next developer "this binding will not change." Even if `const` doesn't prevent all mutation, it signals predictability.
- TDZ errors are confusing without context — a `ReferenceError` on a variable you can clearly see declared in the same block means you're accessing it above its declaration. The fix is always to move the access below the declaration.

---

## I — Interview Q&A

### Q: What is the Temporal Dead Zone?

**A:** The TDZ is the period between when a block starts executing and when the `let` or `const` declaration is reached. During this period, the variable is hoisted (the JavaScript engine knows it exists) but not initialised — accessing it throws a `ReferenceError`. This is intentional: it prevents reading uninitialised variables, which `var` allowed (returning `undefined`). The fix is simple: always declare variables before using them.

### Q: Is `const` immutable?

**A:** No. `const` prevents reassignment of the variable binding — you can't point `const user` at a different object. But the object itself is mutable — `user.name = 'Alex'` works fine. For shallow immutability, use `Object.freeze()`. For deep immutability, you'd need a recursive freeze or a library like Immer.

---

## C — Common Pitfalls + Fix

### ❌ Using `var` in a loop with async callbacks

```javascript
// ❌ All three callbacks share the same var i = 3
for (var i = 0; i < 3; i++) {
  setTimeout(() => console.log(i), 100)  // 3, 3, 3
}

// ✅ let creates a fresh binding each iteration
for (let i = 0; i < 3; i++) {
  setTimeout(() => console.log(i), 100)  // 0, 1, 2
}
```

---

## K — Coding Challenge + Solution

### Challenge

What does each `console.log` print (or does it throw)?

```javascript
console.log(a)
console.log(b)
var a = 1
let b = 2
for (var i = 0; i < 3; i++) {}
console.log(i)
const arr = [1, 2]
arr.push(3)
console.log(arr)
const obj = { x: 1 }
obj = { x: 2 }
```

### Solution

```javascript
console.log(a)   // undefined  — var hoisted, init to undefined
console.log(b)   // ReferenceError — let in TDZ, stops execution here

// If we skip the TDZ error:
var a = 1
let b = 2
for (var i = 0; i < 3; i++) {}
console.log(i)   // 3 — var leaks out of for block

const arr = [1, 2]
arr.push(3)
console.log(arr) // [1, 2, 3] — mutation is allowed

const obj = { x: 1 }
obj = { x: 2 }   // TypeError: Assignment to constant variable
```

---

---

# 6 — Primitive Types, typeof, Coercion, == vs ===

---

## T — TL;DR

JavaScript has 7 primitives: `string`, `number`, `bigint`, `boolean`, `undefined`, `null`, `symbol`. `typeof` returns a string label — except `typeof null === 'object'` (a historic bug). `==` coerces types before comparing; `===` never coerces. Always use `===`. Know the coercion rules so you can read legacy code, not to write new code with `==`.

---

## K — Key Concepts

```javascript
// ── The 7 primitive types ─────────────────────────────────────────────────
typeof 'hello'        // 'string'
typeof 42             // 'number'
typeof 42n            // 'bigint'
typeof true           // 'boolean'
typeof undefined      // 'undefined'
typeof null           // 'object'  ← historic bug, not fixable
typeof Symbol('id')   // 'symbol'

// ── Non-primitives ────────────────────────────────────────────────────────
typeof {}             // 'object'
typeof []             // 'object'  ← arrays are objects
typeof function(){}   // 'function'
typeof class {}       // 'function'

// ── Safe undeclared variable check ────────────────────────────────────────
// ❌ ReferenceError if MISSING_VAR was never declared
if (MISSING_VAR) {}

// ✅ typeof never throws, even for undeclared variables
if (typeof MISSING_VAR !== 'undefined') {
  // safe to use MISSING_VAR here
}
```

```javascript
// ── null vs undefined ─────────────────────────────────────────────────────
let x           // undefined — declared but no value assigned
let y = null    // null — explicitly no value (intentional absence)

// Checking for null — use strict equality
if (x === null)       // false — x is undefined, not null
if (x == null)        // true  — == treats null and undefined as equal (one valid == use)
if (x === undefined)  // true

// Best practice: use !== null and !== undefined explicitly, or:
if (x == null)  { /* handles both null and undefined */ }
```

```javascript
// ── == vs === coercion rules ──────────────────────────────────────────────
// Always use === — these exist so you can read legacy code

// Type coercion with ==:
0   == ''        // true  ('' coerced to 0)
0   == '0'       // true  (string '0' → number 0)
0   == false     // true  (false → 0)
''  == false     // true  (both → 0)
1   == true      // true  (true → 1)
null == undefined  // true  (special case)
null == 0          // false (null only == undefined)
NaN == NaN         // false (NaN is not equal to anything, including itself)

// With ===: never coerces, type must match:
0   === ''       // false
0   === false    // false
null === undefined  // false

// ── instanceof — check prototype chain ───────────────────────────────────
[] instanceof Array    // true
[] instanceof Object   // true (arrays are objects)
{} instanceof Object   // true
'hello' instanceof String  // false — primitive, not a String object

// Better way to check array:
Array.isArray([])   // true ✅
Array.isArray({})   // false ✅
```

```javascript
// ── Falsy and truthy values ───────────────────────────────────────────────
// Falsy (evaluate to false in boolean context):
false, 0, -0, 0n, '', null, undefined, NaN

// Truthy — everything else, including:
'0'          // truthy (non-empty string)
[]           // truthy (empty array is truthy!)
{}           // truthy (empty object is truthy!)
-1           // truthy (non-zero number)
'false'      // truthy (non-empty string)

// Common bug:
const count = 0
if (count) { /* skipped — 0 is falsy */ }   // ❌
if (count !== undefined) { /* runs */ }      // ✅ explicit check
```

---

## W — Why It Matters

- `typeof null === 'object'` is a language bug from 1995 that can never be fixed — code that checks `typeof x === 'object'` to detect objects must also check `x !== null`. This shows up in every JavaScript codebase.
- `==` coercion rules are inconsistent and surprising — `'' == false` is `true` but `'0' == false` is also `true`, and `'' == '0'` is `false`. There's no mental model that makes these consistent. Use `===` always.
- The falsy empty array `[]` gotcha trips up developers from other languages — `if ([])` is `true` in JavaScript, because all objects are truthy. Use `arr.length === 0` to check for an empty array.

---

## I — Interview Q&A

### Q: Why is `typeof null === 'object'` and how do you safely check for null?

**A:** It's a bug in JavaScript's original implementation — null was represented internally with an all-zeros bit pattern, and the type tag for objects was also zero. The language couldn't fix it without breaking existing code. To safely check for null: use `x === null` (strict equality). To check "is this a non-null object", use `x !== null && typeof x === 'object'`. To distinguish null from undefined, `x == null` (loose equality) returns true for both null and undefined — this is one of the few acceptable uses of `==`.

---

## C — Common Pitfalls + Fix

### ❌ Using truthiness to check for zero or empty string

```javascript
// ❌ 0 and '' are valid values but are falsy
function processCount(count) {
  if (count) {             // skips when count === 0 ❌
    console.log(count)
  }
}
processCount(0)   // nothing logged — bug

// ✅ Explicit check
function processCount(count) {
  if (count !== undefined && count !== null) {
    console.log(count)     // logs 0 correctly ✅
  }
}
```

---

## K — Coding Challenge + Solution

### Challenge

What does each expression evaluate to? Explain why.

```javascript
typeof null
typeof []
typeof undefined
null == undefined
null === undefined
0 == false
0 === false
[] == false
NaN === NaN
Array.isArray([])
```

### Solution

```javascript
typeof null          // 'object'  — historic bug
typeof []            // 'object'  — arrays are objects
typeof undefined     // 'undefined'
null == undefined    // true      — special case in == spec
null === undefined   // false     — different types
0 == false           // true      — false coerces to 0
0 === false          // false     — number vs boolean
[] == false          // true      — [] → '' → 0, false → 0
NaN === NaN          // false     — NaN is not equal to itself (use Number.isNaN)
Array.isArray([])    // true      — correct way to check arrays
```

---

---

# 7 — Template Literals and String Methods

---

## T — TL;DR

Template literals (backtick strings) enable multi-line strings, expression interpolation, and tagged templates. JavaScript strings are immutable — every method returns a new string. Know the ten most useful string methods: `trim`, `split`, `includes`, `startsWith`, `endsWith`, `replace`, `replaceAll`, `slice`, `padStart`, `repeat`.

---

## K — Key Concepts

```javascript
// ── Template literals ─────────────────────────────────────────────────────
const name = 'Mark'
const age  = 28

// Expression interpolation
const msg = `Hello, ${name}! You are ${age} years old.`
// 'Hello, Mark! You are 28 years old.'

// Any expression inside ${}
const result = `${2 + 2}`           // '4'
const upper  = `${name.toUpperCase()}`  // 'MARK'
const cond   = `Status: ${age >= 18 ? 'adult' : 'minor'}`

// Multi-line strings (no \n needed)
const html = `
  <div>
    <h1>${name}</h1>
  </div>
`.trim()

// Nested template literals
const items = ['a', 'b', 'c']
const list  = `Items: ${items.map(i => `[${i}]`).join(', ')}`
// 'Items: [a], [b], [c]'
```

```javascript
// ── Essential string methods ──────────────────────────────────────────────
const str = '  Hello, World!  '

// Whitespace
str.trim()             // 'Hello, World!'
str.trimStart()        // 'Hello, World!  '
str.trimEnd()          // '  Hello, World!'

// Case
'hello'.toUpperCase()  // 'HELLO'
'WORLD'.toLowerCase()  // 'world'

// Search
'hello'.includes('ell')       // true
'hello'.startsWith('hel')     // true
'hello'.endsWith('llo')       // true
'hello'.indexOf('l')          // 2 (first occurrence)
'hello'.lastIndexOf('l')      // 3 (last occurrence)
'hello'.indexOf('z')          // -1 (not found)

// Extract
'hello world'.slice(6)        // 'world'
'hello world'.slice(0, 5)     // 'hello'
'hello world'.slice(-5)       // 'world' (from end)
'hello'.at(-1)                // 'o' (last character, ES2022)

// Replace
'hello world'.replace('world', 'JS')         // 'hello JS' (first match only)
'aababc'.replaceAll('a', 'x')               // 'xxbxbc' (all matches)
'hello'.replace(/[aeiou]/g, '*')            // 'h*ll*' (regex replace)

// Split and join
'a,b,c'.split(',')             // ['a', 'b', 'c']
'hello'.split('')              // ['h', 'e', 'l', 'l', 'o']
['a', 'b', 'c'].join('-')      // 'a-b-c'

// Pad and repeat
'5'.padStart(3, '0')           // '005' (useful for zero-padding IDs)
'5'.padEnd(3, '0')             // '500'
'ab'.repeat(3)                 // 'ababab'

// Match with regex
'2025-06-15'.match(/(\d{4})-(\d{2})-(\d{2})/)
// ['2025-06-15', '2025', '06', '15', index: 0, ...]
```

```javascript
// ── String immutability ───────────────────────────────────────────────────
const s = 'hello'
s[0] = 'H'          // silently fails — strings are immutable
console.log(s)      // still 'hello'

// Every method returns a NEW string:
const original = 'hello'
const upper    = original.toUpperCase()
console.log(original)  // 'hello' — unchanged
console.log(upper)     // 'HELLO' — new string
```

---

## W — Why It Matters

- Template literals replace string concatenation — `'Hello, ' + name + '!'` is harder to read and easier to mess up than `` `Hello, ${name}!` ``. Always prefer template literals for strings with variables.
- `replace` without `g` flag only replaces the first match — `'aaa'.replace('a', 'x')` gives `'xaa'`, not `'xxx'`. Use `replaceAll` or `/pattern/g` regex for all matches.
- `padStart(2, '0')` is the clean way to format dates and times — `String(hours).padStart(2, '0')` gives `'09'` for `9`, `'12'` for `12`.

---

## I — Interview Q&A

### Q: How do you reverse a string in JavaScript?

**A:** Split into an array, reverse the array, join back:

```javascript
const reversed = str.split('').reverse().join('')
```

This works for ASCII strings. For strings with Unicode characters or emoji, use:

```javascript
const reversed = [...str].reverse().join('')
// Spread operator respects Unicode code points (emoji, accented chars)
```

---

## C — Common Pitfalls + Fix

### ❌ `replace` only replaces the first match

```javascript
// ❌ Only replaces first 'world'
'world world'.replace('world', 'JS')       // 'JS world'

// ✅ replaceAll replaces all matches
'world world'.replaceAll('world', 'JS')    // 'JS JS'

// ✅ regex with g flag
'world world'.replace(/world/g, 'JS')     // 'JS JS'
```

---

## K — Coding Challenge + Solution

### Challenge

Write a `formatSlug(text)` function that: lowercases the text, trims whitespace, replaces all spaces with `-`, removes any character that is not a letter, digit, or hyphen, and collapses multiple consecutive hyphens into one.

### Solution

```javascript
function formatSlug(text) {
  return text
    .toLowerCase()
    .trim()
    .replaceAll(' ', '-')
    .replace(/[^a-z0-9-]/g, '')  // remove invalid chars
    .replace(/-{2,}/g, '-')       // collapse multiple hyphens
}

console.log(formatSlug('  Hello, World!  '))  // 'hello-world'
console.log(formatSlug('Node.js & TypeScript'))  // 'nodejs-typescript'
console.log(formatSlug('My  Post  Title'))    // 'my-post-title'
```

---

---

# 8 — Number Methods, Math, NaN, Infinity, EPSILON

---

## T — TL;DR

JavaScript uses IEEE 754 double-precision floating point for all numbers — this causes `0.1 + 0.2 !== 0.3`. `NaN` is the result of invalid numeric operations and is not equal to itself. Use `Number.isNaN` (not global `isNaN`). `Number.isFinite`, `Number.isInteger`, `Number.EPSILON`, and `Number.MAX_SAFE_INTEGER` are essential guards. `Math` provides standard math utilities.

---

## K — Key Concepts

```javascript
// ── Floating point gotcha ──────────────────────────────────────────────────
0.1 + 0.2 === 0.3       // false
0.1 + 0.2               // 0.30000000000000004

// Fix: compare with EPSILON tolerance
Math.abs(0.1 + 0.2 - 0.3) < Number.EPSILON  // true ✅

// Or round for display
(0.1 + 0.2).toFixed(2)   // '0.30' (string)
Number((0.1 + 0.2).toFixed(2))  // 0.3 (number)
```

```javascript
// ── NaN — Not a Number ────────────────────────────────────────────────────
Number('abc')       // NaN
parseInt('hello')   // NaN
0 / 0               // NaN
Math.sqrt(-1)       // NaN

// NaN is the ONLY value not equal to itself:
NaN === NaN         // false ← the defining quirk
NaN !== NaN         // true

// ❌ Global isNaN — coerces argument first (misleading)
isNaN('hello')      // true  — coerces 'hello' to NaN, then checks
isNaN(undefined)    // true  — coerces undefined to NaN
isNaN('123')        // false — coerces '123' to 123, not NaN

// ✅ Number.isNaN — no coercion, true ONLY for actual NaN
Number.isNaN(NaN)       // true ✅
Number.isNaN('hello')   // false ✅ (not NaN, it's a string)
Number.isNaN(undefined) // false ✅

// Safe NaN check
const result = Number(someInput)
if (Number.isNaN(result)) {
  console.error('Invalid number input')
}
```

```javascript
// ── Infinity ──────────────────────────────────────────────────────────────
1 / 0            // Infinity
-1 / 0           // -Infinity
Infinity > 9999  // true

// ❌ Global isFinite — coerces
isFinite('42')   // true (coerces '42' to 42)
isFinite(null)   // true (coerces null to 0)

// ✅ Number.isFinite — no coercion
Number.isFinite(42)         // true ✅
Number.isFinite(Infinity)   // false ✅
Number.isFinite('42')       // false ✅ (it's a string, not a number)
Number.isFinite(NaN)        // false ✅

// ── Number.isInteger ──────────────────────────────────────────────────────
Number.isInteger(42)      // true
Number.isInteger(42.0)    // true  (42.0 === 42 in JS)
Number.isInteger(42.5)    // false
Number.isInteger('42')    // false (not a number)

// ── Safe integer range ────────────────────────────────────────────────────
Number.MAX_SAFE_INTEGER    // 9007199254740991 = 2^53 - 1
Number.MIN_SAFE_INTEGER    // -9007199254740991
Number.isSafeInteger(9007199254740991)   // true
Number.isSafeInteger(9007199254740992)   // false — precision lost

// For large integers: use BigInt
const big = 9007199254740992n  // BigInt (n suffix)
```

```javascript
// ── Math object ───────────────────────────────────────────────────────────
Math.round(4.5)    // 5   (rounds half up)
Math.ceil(4.1)     // 5   (round up always)
Math.floor(4.9)    // 4   (round down always)
Math.trunc(4.9)    // 4   (truncate decimal, towards zero)
Math.trunc(-4.9)   // -4  (different from floor for negatives)

Math.abs(-5)       // 5
Math.min(3, 1, 2)  // 1
Math.max(3, 1, 2)  // 3
Math.min(...[3, 1, 2])  // 1 (spread array)

Math.pow(2, 10)    // 1024  (same as 2 ** 10)
Math.sqrt(16)      // 4
Math.cbrt(27)      // 3

Math.PI            // 3.141592653589793
Math.E             // 2.718281828459045

Math.random()      // random float [0, 1)  — not cryptographically secure
// Random integer in range [min, max] inclusive:
const randInt = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min
randInt(1, 6)      // dice roll ✅

Math.log(Math.E)   // 1
Math.log2(8)       // 3
Math.log10(1000)   // 3
```

---

## W — Why It Matters

- `0.1 + 0.2 !== 0.3` is the most-cited JavaScript "bug" — it's not a bug, it's IEEE 754 floating point, present in all languages. For money and precision-sensitive calculations, use integers (cents instead of dollars) or a `Decimal` library.
- `Number.isNaN` vs `isNaN` is a real footgun — `isNaN('')` returns `false`, `isNaN(null)` returns `false`, `isNaN('abc')` returns `true`. These results make no sense for checking if something is the actual NaN value. Always use `Number.isNaN`.
- `Number.MAX_SAFE_INTEGER` matters for database IDs — PostgreSQL `BIGINT` can exceed JavaScript's safe integer range. Large IDs from the database may lose precision when parsed as JS numbers. Use `BigInt` or keep them as strings.

---

## I — Interview Q&A

### Q: What is the difference between `isNaN()` and `Number.isNaN()`?

**A:** The global `isNaN(value)` coerces its argument to a number first, then checks if it's NaN. This gives surprising results: `isNaN('hello')` is `true` (because `Number('hello')` is `NaN`), but `isNaN('')` is `false` (because `Number('')` is `0`). `Number.isNaN(value)` does no coercion — it returns `true` only if the value is exactly the `NaN` primitive. `Number.isNaN('hello')` is `false` because `'hello'` is a string, not `NaN`. Always use `Number.isNaN` when you want to check if a value is actually `NaN`.

---

## C — Common Pitfalls + Fix

### ❌ Comparing floating point values directly

```javascript
// ❌ Floating point imprecision
const price = 0.1 + 0.2
if (price === 0.3) {   // false — never true!
  checkout()
}

// ✅ Use EPSILON tolerance for equality
if (Math.abs(price - 0.3) < Number.EPSILON) {
  checkout()
}

// ✅ For money: work in integer cents
const cents = 10 + 20   // 30 cents — exact integer arithmetic
```

---

## K — Coding Challenge + Solution

### Challenge

Write a `safeParseInt(value)` function that: parses a value to a number, returns `null` if the result is `NaN` or not a safe integer, and uses `Number.isNaN`, `Number.isFinite`, and `Number.isSafeInteger`.

### Solution

```javascript
function safeParseInt(value) {
  const n = Number(value)

  if (Number.isNaN(n))         return null   // couldn't parse
  if (!Number.isFinite(n))     return null   // Infinity or -Infinity
  if (!Number.isSafeInteger(n)) return null  // too large or has decimals

  return n
}

console.log(safeParseInt('42'))          // 42
console.log(safeParseInt('3.14'))        // null — not integer
console.log(safeParseInt('hello'))       // null — NaN
console.log(safeParseInt(Infinity))      // null — not finite
console.log(safeParseInt(9e20))          // null — exceeds MAX_SAFE_INTEGER
console.log(safeParseInt(0))             // 0 ✅ — 0 is safe
```

---

---

# 9 — Date Basics — Timestamps, Parsing Gotchas

---

## T — TL;DR

`Date` stores time as a Unix timestamp in milliseconds since 1970-01-01 UTC. `Date.now()` is the fastest way to get the current timestamp. Date parsing from strings is notoriously inconsistent — always use `new Date(year, month, day)` (note: month is 0-indexed) or ISO 8601 strings (`'2025-06-15'`). For production, prefer `date-fns` or `Temporal` (Stage 3).

---

## K — Key Concepts

```javascript
// ── Creating dates ────────────────────────────────────────────────────────
const now = new Date()          // current date and time
const ts  = Date.now()          // current timestamp (milliseconds) — faster, no object

// From timestamp
new Date(0)                     // 1970-01-01T00:00:00.000Z (Unix epoch)
new Date(1718438400000)         // specific timestamp

// From ISO 8601 string (safe, always UTC)
new Date('2025-06-15')          // 2025-06-15T00:00:00.000Z ✅
new Date('2025-06-15T14:30:00Z')  // UTC datetime ✅
new Date('2025-06-15T14:30:00+08:00')  // with offset ✅

// From year, month, day (local time — month is 0-indexed!)
new Date(2025, 5, 15)           // June 15, 2025 (5 = June) ← confusing
new Date(2025, 0, 1)            // January 1, 2025
```

```javascript
// ── Date parsing gotchas ──────────────────────────────────────────────────
// ❌ Non-ISO strings are implementation-defined — don't rely on them
new Date('June 15, 2025')       // works in most browsers but not guaranteed
new Date('15/06/2025')          // Invalid Date in some environments
new Date('2025-6-15')           // may work or may fail — non-standard format

// ❌ Date-only strings are treated as UTC in modern JS
new Date('2025-06-15')          // midnight UTC, NOT local midnight
// In UTC-8: this displays as 2025-06-14T16:00:00.000 (previous day!)

// ✅ Explicit constructor — local time, no ambiguity
new Date(2025, 5, 15)           // June 15, 2025 local time

// ✅ ISO with time — always explicit timezone
new Date('2025-06-15T00:00:00.000Z')  // midnight UTC
new Date('2025-06-15T00:00:00+08:00') // midnight in UTC+8

// Check for invalid date
const d = new Date('not a date')
isNaN(d.getTime())    // true — d.getTime() returns NaN for invalid dates
Number.isNaN(d.getTime())  // true
```

```javascript
// ── Timestamp comparison ──────────────────────────────────────────────────
const a = new Date('2025-01-01')
const b = new Date('2025-12-31')

// Compare using getTime() — returns milliseconds
a.getTime() < b.getTime()   // true ✅
a < b                       // true ✅ (Date coerces to number in comparison)
a === b                     // false ❌ (different object references)
a.getTime() === b.getTime() // true only if same point in time ✅

// Time difference
const diffMs   = b.getTime() - a.getTime()
const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))  // 364 days
```

```javascript
// ── Getting/setting date components ──────────────────────────────────────
const d = new Date()

// Getters (local time)
d.getFullYear()    // 2025
d.getMonth()       // 0–11 (0 = January!)
d.getDate()        // 1–31 (day of month)
d.getDay()         // 0–6 (0 = Sunday)
d.getHours()       // 0–23
d.getMinutes()     // 0–59
d.getSeconds()     // 0–59
d.getMilliseconds()
d.getTime()        // Unix timestamp in ms

// UTC getters
d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()  // etc.

// Formatting
d.toISOString()        // '2025-06-15T14:30:00.000Z' — always UTC ISO 8601
d.toLocaleDateString() // '6/15/2025' (locale-dependent)
d.toLocaleString('en-PH', { timeZone: 'Asia/Manila' })  // localised

// Robust formatting without a library
const iso = new Date().toISOString().slice(0, 10)  // '2025-06-15'
```

---

## W — Why It Matters

- Month 0-indexing is the most common `Date` API mistake — `new Date(2025, 6, 15)` is July 15, not June 15. Always double-check by using ISO strings or adding a comment.
- `new Date('2025-06-15')` being midnight UTC (not local) causes a "date off by one day" bug in UTC-negative timezones — displaying this date locally shows June 14 in New York (UTC-4 in summer). Use `new Date(2025, 5, 15)` for local date-only values.
- For any non-trivial date work (formatting, arithmetic, timezones), use `date-fns` — the built-in `Date` API is inconsistent and lacks locale-aware formatting. `date-fns` is immutable, tree-shakeable, and correct.

---

## I — Interview Q&A

### Q: How do you correctly compare two dates in JavaScript?

**A:** Use `getTime()` to compare the underlying millisecond timestamps: `a.getTime() === b.getTime()` for equality, `a.getTime() < b.getTime()` for ordering. JavaScript's `<` and `>` operators also work on Date objects because dates coerce to their timestamp value in numeric comparisons. However, `===` always returns `false` for two `Date` objects with the same time because it compares object references, not values. For date-only comparison (ignoring time), compare the ISO date strings: `a.toISOString().slice(0, 10) === b.toISOString().slice(0, 10)`.

---

## C — Common Pitfalls + Fix

### ❌ Month is 0-indexed — off-by-one month

```javascript
// ❌ This creates August 15, not July 15
const july = new Date(2025, 7, 15)   // 7 = August!

// ✅ Use ISO string — no indexing confusion
const july2 = new Date('2025-07-15')

// ✅ Or subtract 1 explicitly with a comment
const month = 7  // July (but JS months are 0-indexed)
const date = new Date(2025, month - 1, 15)  // ← explicit
```

---

## K — Coding Challenge + Solution

### Challenge

Write a `daysBetween(dateA, dateB)` function that returns the number of full days between two dates, regardless of order. Handle string input (`'2025-06-15'`) and `Date` objects. Return 0 if dates are the same day.

### Solution

```javascript
function daysBetween(a, b) {
  // Normalise: accept string or Date, snap to midnight UTC
  const toMidnightUTC = (d) => {
    const date = typeof d === 'string' ? new Date(d) : new Date(d.getTime())
    date.setUTCHours(0, 0, 0, 0)
    return date
  }
  const da = toMidnightUTC(a)
  const db = toMidnightUTC(b)
  const diffMs = Math.abs(da.getTime() - db.getTime())
  return Math.floor(diffMs / (1000 * 60 * 60 * 24))
}

console.log(daysBetween('2025-01-01', '2025-06-15'))  // 165
console.log(daysBetween('2025-06-15', '2025-01-01'))  // 165 (order doesn't matter)
console.log(daysBetween('2025-06-15', '2025-06-15'))  // 0
```

---

---

# 10 — Operators and Control Flow

---

## T — TL;DR

JavaScript's operators include standard arithmetic and comparison plus JS-specific ones: `??` (nullish coalescing — default for null/undefined only), `?.` (optional chaining — safe property access), and `||`/`&&` short-circuiting. Control flow: `if/else`, `switch` (with `break`!), ternary, `for`, `for...of`, `for...in`, `while`, `do...while`, `break`, `continue`.

---

## K — Key Concepts

```javascript
// ── Nullish coalescing ?? vs OR || ────────────────────────────────────────
// || uses the right side for any falsy value (0, '', false, null, undefined)
// ?? uses the right side ONLY for null or undefined

const count  = 0
const name   = ''
const active = false

count  || 10    // 10   ← 0 is falsy, uses default ❌ (probably not what you want)
count  ?? 10    // 0    ← 0 is not null/undefined, keeps 0  ✅

name   || 'anon'    // 'anon'  ← '' is falsy ❌
name   ?? 'anon'    // ''      ← '' is not null/undefined ✅

active || true      // true    ← false is falsy ❌
active ?? true      // false   ← false is not null/undefined ✅

// ?? is correct for "provide a default only when the value is absent"
const port = process.env.PORT ?? 3000   // 0 is a valid port — ?? is correct
```

```javascript
// ── Optional chaining ?. ──────────────────────────────────────────────────
const user = null

// ❌ TypeError: Cannot read properties of null
user.profile.avatar

// ✅ Returns undefined if any step is null/undefined
user?.profile?.avatar    // undefined (no error)
user?.profile?.name      // undefined

// Works with methods and brackets
const arr = null
arr?.map(x => x)         // undefined (not TypeError)
arr?.length              // undefined

user?.getAddress?.()     // call only if method exists
obj?.['dynamic-key']     // bracket access

// Nullish assignment — set only if null or undefined
let config = null
config ??= { theme: 'dark' }   // config = { theme: 'dark' }
config ??= { theme: 'light' }  // unchanged — config is already non-null
```

```javascript
// ── Short-circuit evaluation ──────────────────────────────────────────────
// && — returns left side if falsy, right side if truthy
false && doSomething()   // false — doSomething() never called ✅
true  && doSomething()   // result of doSomething()
null  && 'value'         // null (falsy left side returned)
'hi'  && 'value'         // 'value' (truthy left side, returns right)

// Common patterns:
isAdmin && renderAdminPanel()   // render only if admin
user && user.name               // → user?.name (prefer optional chaining)

// || — returns left side if truthy, right side if falsy
'value' || 'default'    // 'value' (truthy left returned)
null    || 'default'    // 'default'
0       || 'default'    // 'default' ← 0 treated as falsy
```

```javascript
// ── if/else, ternary, switch ──────────────────────────────────────────────
// if/else — standard
if (score >= 90) {
  grade = 'A'
} else if (score >= 80) {
  grade = 'B'
} else {
  grade = 'C'
}

// Ternary — for simple two-branch assignments
const label = score >= 60 ? 'pass' : 'fail'
// ❌ Avoid nested ternaries — use if/else
const label2 = a ? 'x' : b ? 'y' : 'z'  // hard to read

// switch — for multiple exact value matches
switch (status) {
  case 'pending':
    handlePending()
    break                // ← REQUIRED — without break, falls through to next case
  case 'active':
  case 'running':       // ← intentional fall-through (two cases, same body)
    handleRunning()
    break
  default:
    handleUnknown()
}
```

```javascript
// ── Loops ─────────────────────────────────────────────────────────────────
// for — classic, use when you need the index
for (let i = 0; i < 5; i++) {
  console.log(i)    // 0 1 2 3 4
}

// for...of — iterate values of iterables (arrays, strings, Sets, Maps)
const fruits = ['apple', 'banana', 'cherry']
for (const fruit of fruits) {
  console.log(fruit)   // 'apple', 'banana', 'cherry'
}

// for...of with index (using entries())
for (const [i, fruit] of fruits.entries()) {
  console.log(i, fruit)   // 0 apple, 1 banana, 2 cherry
}

// for...in — iterate keys of an object (not for arrays)
const obj = { a: 1, b: 2, c: 3 }
for (const key in obj) {
  console.log(key, obj[key])  // 'a' 1, 'b' 2, 'c' 3
}
// ❌ Don't use for...in on arrays — iterates prototype chain too
// ✅ Use for...of or .forEach() for arrays

// while
let n = 0
while (n < 3) {
  console.log(n)
  n++
}

// do...while — runs at least once
do {
  const input = prompt('Enter a number')
  n = Number(input)
} while (Number.isNaN(n))

// break and continue
for (let i = 0; i < 10; i++) {
  if (i === 3) continue   // skip 3
  if (i === 6) break      // stop at 6
  console.log(i)          // 0 1 2 4 5
}
```

```javascript
// ── Arithmetic and comparison operators ───────────────────────────────────
// Arithmetic
5 + 2   // 7
5 - 2   // 3
5 * 2   // 10
5 / 2   // 2.5 (always float division)
5 % 2   // 1 (modulo/remainder)
2 ** 3  // 8 (exponentiation, same as Math.pow)
5 / 0   // Infinity (not an error!)

// Increment/decrement
let x = 5
x++     // post-increment: returns 5, then x = 6
++x     // pre-increment:  x = 7, returns 7
x--     // post-decrement: returns 7, then x = 6

// Comparison
5 >  3    // true
5 >= 5    // true
5 <  3    // false
5 <= 3    // false
5 === 5   // true (strict)
5 !== 4   // true (strict not equal)
```

---

## W — Why It Matters

- `??` vs `||` for defaults is a production bug source — `|| 3000` as a port default means port `0` is impossible (0 is falsy), and an empty string username becomes `'anon'`. Use `??` when 0, `''`, and `false` are valid values.
- Missing `break` in `switch` is a silent bug — JavaScript falls through to the next case and executes it. This is intentional when you want multiple cases to share a body, but accidental fall-through causes hard-to-find bugs. Always add `break` or `return` unless fall-through is intentional.
- `for...in` on arrays iterates inherited enumerable properties too, not just indexes — always use `for...of` or `.forEach()` for arrays. `for...in` is for plain object key enumeration only.

---

## I — Interview Q&A

### Q: What is the difference between `??` and `||` for default values?

**A:** `||` returns the right-hand side if the left is any falsy value — `false`, `0`, `''`, `null`, or `undefined`. `??` returns the right-hand side only if the left is `null` or `undefined`. Use `??` when `0`, `''`, or `false` are valid non-default values. Example: `const port = userInput ?? 3000` correctly keeps port `0` if the user specified it, while `const port = userInput || 3000` would replace `0` with `3000`. In TypeScript this distinction is enforced by the compiler for typed values — `??` is type-safe for `T | null | undefined`.

---

## C — Common Pitfalls + Fix

### ❌ Missing `break` in switch — silent fall-through

```javascript
// ❌ Missing break — falls through to 'active' case
switch (status) {
  case 'pending':
    console.log('pending')    // logs 'pending'
    // forgot break!
  case 'active':
    console.log('active')     // ALSO logs 'active' ❌
    break
}

// ✅ Add break to every intentional non-fall-through case
switch (status) {
  case 'pending':
    console.log('pending')
    break    // ← stops here ✅
  case 'active':
    console.log('active')
    break
}
```

---

## K — Coding Challenge + Solution

### Challenge

Write a `classifyScore(score)` function using a `switch` on grade ranges (A: 90–100, B: 80–89, C: 70–79, F: below 70). Validate the score is a number between 0–100 using `Number.isNaN`, `Number.isFinite`. Use `??` for a default grade. Use `for...of` to classify an array of scores and return only the passing ones (not F).

### Solution

```javascript
function classifyScore(score) {
  if (!Number.isFinite(score) || score < 0 || score > 100) {
    return null
  }
  // Derive the tens digit as the switch key
  const band = score === 100 ? 10 : Math.floor(score / 10)
  switch (band) {
    case 10:
    case 9:  return 'A'
    case 8:  return 'B'
    case 7:  return 'C'
    default: return 'F'
  }
}

function passingScores(scores) {
  const passing = []
  for (const score of scores) {
    const grade = classifyScore(score) ?? 'F'
    if (grade !== 'F') {
      passing.push({ score, grade })
    }
  }
  return passing
}

console.log(passingScores([95, 85, 72, 55, 100, -1, NaN]))
// [{ score: 95, grade: 'A' }, { score: 85, grade: 'B' },
//  { score: 72, grade: 'C' }, { score: 100, grade: 'A' }]
```

---

## ✅ Day 1 Complete — JavaScript Foundations

| # | Subtopic | Status |
|---|----------|--------|
| 1 | Runtime Context — Node.js vs Browser, globalThis | ☐ |
| 2 | Node.js process — env, argv, exit | ☐ |
| 3 | Package Managers — package.json, semver, lockfiles | ☐ |
| 4 | dotenv and console Methods | ☐ |
| 5 | var vs let vs const — Scope, Hoisting, TDZ | ☐ |
| 6 | Primitive Types, typeof, Coercion, == vs === | ☐ |
| 7 | Template Literals and String Methods | ☐ |
| 8 | Number Methods, Math, NaN, Infinity | ☐ |
| 9 | Date Basics — Timestamps, Parsing Gotchas | ☐ |
| 10 | Operators and Control Flow | ☐ |

---

## 🗺️ One-Page Mental Model — Day 1

```
RUNTIME ENVIRONMENTS
  Browser:   window, DOM, localStorage, fetch (built-in)
  Node.js:   process, fs, http, global
  Universal: globalThis — correct in all environments
  Detection: typeof window !== 'undefined' → browser
  Module systems: CJS (require/module.exports) vs ESM (import/export)
  ESM lacks __dirname → use fileURLToPath(import.meta.url)

PROCESS (Node.js)
  process.env.VAR     → string or undefined (always string!)
  process.argv        → [node, script, ...userArgs] (slice(2) for user args)
  process.exit(0)     → success | process.exit(1) → failure
  process.cwd()       → working directory
  process.platform    → 'linux' | 'darwin' | 'win32'
  Always convert env vars: Number(process.env.PORT) || 3000

PACKAGE MANAGEMENT
  npm ci              → exact lockfile install (CI/production)
  npm install         → resolves semver ranges, updates lockfile (dev)
  ^1.2.3 = >=1.2.3 <2.0.0 | ~1.2.3 = >=1.2.3 <1.3.0 | 1.2.3 = exact
  devDependencies     → not installed in production (npm ci --omit=dev)
  lockfile            → ALWAYS commit, NEVER delete
  npx                 → runs binary from node_modules or downloads temporarily

DOTENV + CONSOLE
  import 'dotenv/config' → loads .env into process.env at startup
  NEVER commit .env → add to .gitignore, commit .env.example
  console.error/warn → stderr | console.log → stdout
  console.table()    → tabular display | console.time/timeEnd → timing
  console.assert()   → throw if false | console.trace() → stack trace

var / let / const
  var:   function-scoped, hoisted + init to undefined, allows redeclaration
  let:   block-scoped, hoisted but TDZ, allows reassignment
  const: block-scoped, hoisted but TDZ, no reassignment (object mutation ok)
  const ≠ immutable — Object.freeze() for shallow immutability
  var loop bug: var i shared → use let (new binding per iteration)
  Rule: const by default → let when reassignment needed → never var

TYPES + TYPEOF
  7 primitives: string, number, bigint, boolean, undefined, null, symbol
  typeof null === 'object'  ← historic bug, not fixable
  typeof []   === 'object'  ← arrays are objects
  Safe undeclared check: typeof MISSING !== 'undefined' (never throws)
  === never coerces | == coerces (avoid — use === always)
  null == undefined is true (one valid == use)
  Falsy: false 0 -0 0n '' null undefined NaN
  Truthy: everything else — including [] {} '0' -1

STRINGS
  Template literals: `Hello ${name}` — always prefer over concatenation
  Strings are immutable — all methods return new strings
  trim/trimStart/trimEnd | toUpperCase/toLowerCase
  includes/startsWith/endsWith/indexOf
  slice(start, end) | at(-1) = last char
  replace(first) | replaceAll(all) | split/join
  padStart(n, '0') for zero-padding

NUMBERS
  All numbers are IEEE 754 doubles — 0.1 + 0.2 ≠ 0.3
  Fix: Math.abs(a - b) < Number.EPSILON
  NaN: only value not === itself → Number.isNaN() (not global isNaN!)
  Number.isFinite() — no coercion (global isFinite coerces)
  Number.isInteger() | Number.isSafeInteger()
  MAX_SAFE_INTEGER = 9007199254740991 — BigInt for larger
  Math: round/ceil/floor/trunc | abs/min/max | sqrt/pow | random
  randInt(min,max) = Math.floor(Math.random()*(max-min+1))+min

DATES
  Date stores Unix timestamp in milliseconds since 1970 UTC
  Date.now() → fastest timestamp, no object allocation
  Month is 0-indexed: 0=Jan, 11=Dec ← biggest Date gotcha
  new Date('2025-06-15') → midnight UTC (not local!) — timezone trap
  Invalid date check: Number.isNaN(new Date('bad').getTime())
  Compare with getTime(): a.getTime() < b.getTime() ✅
  Never use a === b for Date comparison (object reference check)
  For production date work: use date-fns

OPERATORS + CONTROL FLOW
  ?? (nullish): right side only when left is null/undefined
  || (OR):      right side for any falsy value (0, '', false too!)
  ?. (optional chain): safe navigation, returns undefined not TypeError
  ??= assigns only if null/undefined
  && short-circuits on falsy | || short-circuits on truthy
  switch: ALWAYS add break — fall-through is a common bug
  for...of: arrays, strings, Sets, Maps (values)
  for...in: object keys only (never use on arrays)
  break: exits loop | continue: skips to next iteration
```

> **Your next action:** Open a Node.js REPL (`node`) and type `typeof null`, then `0.1 + 0.2`, then `null == undefined`. See the quirks live — one minute of hands-on beats five minutes of reading.

> "Doing one small thing beats opening a feed."