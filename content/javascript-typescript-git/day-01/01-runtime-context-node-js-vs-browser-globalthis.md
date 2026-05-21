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
