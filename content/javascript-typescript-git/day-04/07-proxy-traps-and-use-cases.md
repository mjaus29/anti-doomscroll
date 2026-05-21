# 7 — Proxy — Traps and Use Cases

---

## T — TL;DR

A `Proxy` wraps an object and intercepts operations on it via **traps** — `get`, `set`, `has`, `deleteProperty`, `apply`, `construct`, and more. Use cases: validation, logging, reactivity (Vue 3's reactivity is built on Proxy), default values, access control. The second argument is the **handler** object containing traps.

---

## K — Key Concepts

```javascript
// ── Basic proxy structure ──────────────────────────────────────────────────
const target  = { name: 'Mark', age: 28 }
const handler = {
  get(target, key, receiver) {
    console.log(`GET ${key}`)
    return Reflect.get(target, key, receiver)   // forward to target
  },
  set(target, key, value, receiver) {
    console.log(`SET ${key} = ${value}`)
    return Reflect.set(target, key, value, receiver)
  },
}

const proxy = new Proxy(target, handler)
proxy.name        // GET name → 'Mark'
proxy.age = 30    // SET age = 30
```

```javascript
// ── Use case 1: Validation proxy ──────────────────────────────────────────
function createValidated(schema) {
  return new Proxy({}, {
    set(target, key, value) {
      const rule = schema[key]
      if (rule && !rule.test(value)) {
        throw new TypeError(`Invalid value for "${key}": ${value}`)
      }
      return Reflect.set(target, key, value)
    }
  })
}

const user = createValidated({
  email: { test: v => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v) },
  age:   { test: v => Number.isInteger(v) && v >= 0 && v <= 150 },
})

user.email = 'mark@ex.com'   // ✅
user.age   = 28              // ✅
user.email = 'not-email'     // TypeError: Invalid value for "email" ✅
```

```javascript
// ── Use case 2: Logging/audit proxy ──────────────────────────────────────
function createAudited(target, label) {
  const log = []
  const proxy = new Proxy(target, {
    get(t, key, r) {
      if (typeof t[key] === 'function') {
        return function(...args) {
          log.push({ op: 'call', key, args, at: Date.now() })
          return Reflect.apply(t[key], t, args)
        }
      }
      log.push({ op: 'get', key, at: Date.now() })
      return Reflect.get(t, key, r)
    },
    set(t, key, value, r) {
      log.push({ op: 'set', key, value, prev: t[key], at: Date.now() })
      return Reflect.set(t, key, value, r)
    },
  })
  proxy.getLog = () => log
  return proxy
}

const db = createAudited({ connect() { return 'connected' }, host: 'localhost' }, 'DB')
db.host               // logged: get host
db.connect()          // logged: call connect
db.host = 'prod-db'   // logged: set host
db.getLog().length    // 3
```

```javascript
// ── Use case 3: Default values proxy ─────────────────────────────────────
const withDefaults = (target, defaults) => new Proxy(target, {
  get(t, key) {
    return key in t ? t[key] : defaults[key]
  }
})

const config = withDefaults(
  { theme: 'dark' },
  { theme: 'light', lang: 'en', fontSize: 14, retries: 3 }
)
config.theme    // 'dark'  — own value takes precedence
config.lang     // 'en'    — from defaults
config.retries  // 3       — from defaults

// ── Use case 4: Reactive object (simplified Vue 3 model) ──────────────────
function reactive(obj, onChange) {
  return new Proxy(obj, {
    set(target, key, value, receiver) {
      const prev = target[key]
      const result = Reflect.set(target, key, value, receiver)
      if (prev !== value) onChange(key, prev, value)
      return result
    }
  })
}

const state = reactive({ count: 0, name: 'Mark' }, (key, prev, next) => {
  console.log(`[reactive] ${key}: ${prev} → ${next}`)
})
state.count++    // [reactive] count: 0 → 1
state.name = 'Alex'  // [reactive] name: Mark → Alex
```

---

## W — Why It Matters

- Vue 3's entire reactivity system is built on Proxy — understanding Proxy explains how Vue knows to re-render when you write `state.count++`. No special setter methods, no `this.$set()` — plain property assignment triggers updates.
- Proxy traps are intercepted at the JavaScript level, not the type level — you can intercept `.delete`, `in` operator (`has` trap), `new` (`construct` trap), and function calls (`apply` trap).
- The `get` trap returning functions for method calls (auditing) is the basis for database query builders, ORMs, and GraphQL clients that proxy method calls into structured queries.

---

## I — Interview Q&A

### Q: What is a Proxy and what are three real-world uses?

**A:** A `Proxy` wraps an object and intercepts operations via handler traps — `get`, `set`, `has`, `deleteProperty`, etc. Three real-world uses: (1) **Validation** — a `set` trap throws before invalid values are assigned, keeping the object always in a valid state. (2) **Reactivity** — a `set` trap notifies observers when properties change (Vue 3's core mechanism). (3) **Logging/auditing** — a `get` trap wraps every method call and property access with log entries, building an audit trail without modifying the original object. Proxy enables these patterns without altering the target object's code.

---

## C — Common Pitfalls + Fix

### ❌ Not using Reflect in traps — breaking prototype methods

```javascript
// ❌ Naive get trap breaks prototype method lookups
const proxy = new Proxy({}, {
  get(target, key) {
    return target[key]   // doesn't handle prototype chain correctly
  }
})
proxy.toString()   // may break or return undefined for prototype methods ❌

// ✅ Use Reflect.get — preserves receiver and prototype chain
const proxy2 = new Proxy({}, {
  get(target, key, receiver) {
    return Reflect.get(target, key, receiver)   // correct ✅
  }
})
```

---

## K — Coding Challenge + Solution

### Challenge

Build a `createReadOnly(obj)` proxy that throws a `TypeError` on any `set` or `deleteProperty` operation, allows all reads, and has a `get` trap that recursively wraps nested objects in the same proxy.

### Solution

```javascript
function createReadOnly(obj) {
  if (typeof obj !== 'object' || obj === null) return obj

  return new Proxy(obj, {
    get(target, key, receiver) {
      const value = Reflect.get(target, key, receiver)
      // Recursively wrap nested objects
      return typeof value === 'object' && value !== null
        ? createReadOnly(value)
        : value
    },
    set(_, key) {
      throw new TypeError(`Cannot set property "${key}" on read-only object`)
    },
    deleteProperty(_, key) {
      throw new TypeError(`Cannot delete property "${key}" from read-only object`)
    },
  })
}

const config = createReadOnly({ host: 'localhost', db: { port: 5432, name: 'app' } })
console.log(config.host)       // 'localhost' ✅
console.log(config.db.port)    // 5432 ✅ (nested wrapped)
config.host = 'x'              // TypeError: Cannot set property "host" ✅
delete config.host             // TypeError: Cannot delete property "host" ✅
config.db.port = 9999          // TypeError (nested also read-only) ✅
```

---

---
