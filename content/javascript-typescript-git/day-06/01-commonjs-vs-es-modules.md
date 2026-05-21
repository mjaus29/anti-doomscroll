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
