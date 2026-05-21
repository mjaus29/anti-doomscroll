# 9 — Symbol — Creation, Symbol.for, Registry, Unique Keys

---

## T — TL;DR

`Symbol` creates a **unique, immutable primitive** value — no two Symbols are ever equal. Use them as unique property keys that won't collide with string keys or other code. `Symbol.for(key)` creates/retrieves a **global registry Symbol** — same key always returns the same Symbol across modules and iframes.

---

## K — Key Concepts

```javascript
// ── Symbol basics ─────────────────────────────────────────────────────────
const s1 = Symbol('description')  // optional description (for debugging)
const s2 = Symbol('description')

s1 === s2          // false — every Symbol() call is unique
typeof s1          // 'symbol'
s1.toString()      // 'Symbol(description)'
s1.description     // 'description' (ES2019)

// Cannot be implicitly converted to string — prevents accidental misuse
// `${s1}`          // TypeError: Cannot convert Symbol to string
// s1 + ''          // TypeError
String(s1)         // 'Symbol(description)'  ✅ explicit is fine
```

```javascript
// ── Symbols as property keys ───────────────────────────────────────────────
const ID     = Symbol('id')
const SECRET = Symbol('secret')

const user = {
  name: 'Mark',
  [ID]: 1001,            // symbol key — not visible in Object.keys
  [SECRET]: 'token123',  // symbol key
}

user[ID]       // 1001
user[SECRET]   // 'token123'

Object.keys(user)             // ['name']          — symbols hidden ✅
Object.values(user)           // ['Mark']
JSON.stringify(user)          // '{"name":"Mark"}' — symbols excluded ✅

// Retrieve symbols explicitly
Object.getOwnPropertySymbols(user)   // [Symbol(id), Symbol(secret)]
Reflect.ownKeys(user)                // ['name', Symbol(id), Symbol(secret)]

// Use case: hide internal properties without true privacy
class EventBus {
  static listeners = Symbol('listeners')
}
```

```javascript
// ── Symbol.for — global registry ──────────────────────────────────────────
// Problem: two separate modules get different Symbols for the same concept
const a = Symbol('LOG_LEVEL')   // module A
const b = Symbol('LOG_LEVEL')   // module B
a === b   // false — different symbols, can't share ❌

// Solution: Symbol.for uses a global registry
const c = Symbol.for('app.LOG_LEVEL')   // module A
const d = Symbol.for('app.LOG_LEVEL')   // module B
c === d   // true ✅ — same symbol across modules

Symbol.keyFor(c)   // 'app.LOG_LEVEL' — reverse lookup ✅
Symbol.keyFor(Symbol('local'))  // undefined — local symbols not in registry

// Convention: use namespaced keys to avoid collisions
const MY_APP = {
  USER_ID: Symbol.for('myapp.userId'),
  ROLE:    Symbol.for('myapp.role'),
}
```

```javascript
// ── Practical: metadata without collision ─────────────────────────────────
const META = Symbol('meta')
const CACHE = Symbol('cache')

function addMeta(obj, data) {
  obj[META] = data
  return obj
}

function getCached(fn) {
  return function(...args) {
    if (!fn[CACHE]) fn[CACHE] = new Map()
    const key = JSON.stringify(args)
    if (!fn[CACHE].has(key)) fn[CACHE].set(key, fn(...args))
    return fn[CACHE].get(key)
  }
}

const user = addMeta({ name: 'Mark' }, { source: 'db', fetchedAt: Date.now() })
user[META]          // { source: 'db', fetchedAt: ... }
Object.keys(user)   // ['name'] — meta hidden ✅
```

---

## W — Why It Matters

- Symbol keys don't appear in `Object.keys`, `for...in`, or `JSON.stringify` — this is intentional, not a limitation. It enables attaching metadata to objects without polluting their enumerable properties.
- `Symbol.for` solves the "same concept across modules" problem — two independent packages can agree on a Symbol key without sharing a module if they use the same `Symbol.for` string.
- The description parameter is purely for debugging — `Symbol('userId')` prints as `Symbol(userId)` in consoles and stack traces. It has zero effect on uniqueness or behaviour.

---

## I — Interview Q&A

### Q: What is the difference between `Symbol()` and `Symbol.for()`?

**A:** `Symbol()` creates a brand new unique symbol every time it's called — even with the same description, two calls produce different symbols (`Symbol('x') !== Symbol('x')`). `Symbol.for(key)` looks up the global symbol registry first — if a symbol with that key exists, it returns it; otherwise it creates and registers a new one. `Symbol.for('x') === Symbol.for('x')` is `true`. Use `Symbol()` for unique keys local to a module. Use `Symbol.for()` when multiple modules or packages need to share the same symbol — like a shared protocol or extension point.

---

## C — Common Pitfalls + Fix

### ❌ Trying to use Symbol in template literal — silent TypeError

```javascript
const id = Symbol('id')
// ❌ TypeError in strict mode, silent failure elsewhere
const msg = `User ${id}`   // TypeError: Cannot convert Symbol value to string

// ✅ Explicit conversion
const msg2 = `User ${id.toString()}`      // 'User Symbol(id)'
const msg3 = `User ${id.description}`    // 'User id'
const msg4 = `User ${String(id)}`        // 'User Symbol(id)'
```

---

## K — Coding Challenge + Solution

### Challenge

Create a `withId` function that attaches a unique auto-incrementing Symbol-keyed `id` to any object. The `id` should be hidden from `Object.keys` and `JSON.stringify`. Provide a `getId(obj)` function to retrieve it.

### Solution

```javascript
const ID_KEY = Symbol('id')
let nextId = 1

function withId(obj) {
  return Object.defineProperty(obj, ID_KEY, {
    value:        nextId++,
    writable:     false,
    enumerable:   false,   // hidden from Object.keys ✅
    configurable: false,
  })
}

const getId = (obj) => obj[ID_KEY]

const a = withId({ name: 'Alice' })
const b = withId({ name: 'Bob' })

console.log(getId(a))            // 1
console.log(getId(b))            // 2
console.log(Object.keys(a))      // ['name']       — id hidden ✅
console.log(JSON.stringify(a))   // '{"name":"Alice"}' — id excluded ✅
getId(a) !== getId(b)            // true — unique ✅
```

---

---
