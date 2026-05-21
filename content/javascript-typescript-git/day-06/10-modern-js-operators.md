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
