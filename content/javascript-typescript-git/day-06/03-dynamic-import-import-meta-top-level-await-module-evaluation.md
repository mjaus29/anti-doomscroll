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
