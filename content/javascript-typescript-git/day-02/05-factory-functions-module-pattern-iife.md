# 5 — Factory Functions, Module Pattern, IIFE

---

## T — TL;DR

**Factory functions** return objects with private state via closures — a class alternative without `new` or `this`. The **module pattern** uses a closure to export a public API while keeping internals private. **IIFE** (Immediately Invoked Function Expression) executes a function immediately — used to create an isolated scope, run async code at the top level, or initialise a module.

---

## K — Key Concepts

```javascript
// ── Factory function ──────────────────────────────────────────────────────
function createUser(name, email) {
  // private
  let loginCount = 0

  // public API
  return {
    getName()  { return name },
    getEmail() { return email },
    login()    { loginCount++ },
    getStats() { return { name, loginCount } },
  }
}

const user = createUser('Mark', 'mark@example.com')
user.login(); user.login()
user.getStats()   // { name: 'Mark', loginCount: 2 }
user.loginCount   // undefined — private ✅

// ── Factory vs class ──────────────────────────────────────────────────────
// Factory: no `new`, no `this` binding issues, true private state via closure
// Class:   prototype sharing (memory efficient for many instances), familiar to OOP devs
```

```javascript
// ── Module pattern — IIFE + closure = encapsulated module ─────────────────
const userService = (function() {
  // private
  const users = []
  let nextId = 1

  function validate(user) {
    if (!user.name) throw new Error('name required')
    if (!user.email) throw new Error('email required')
  }

  // public API
  return {
    create(data) {
      validate(data)
      const user = { id: nextId++, ...data }
      users.push(user)
      return user
    },
    findById(id) {
      return users.find(u => u.id === id) ?? null
    },
    count() {
      return users.length
    },
  }
})()

userService.create({ name: 'Mark', email: 'mark@example.com' })
userService.count()   // 1
userService.users     // undefined — private ✅
```

```javascript
// ── IIFE — Immediately Invoked Function Expression ─────────────────────────
// Basic form: wrap in () then call with ()
(function() {
  const secret = 'private'
  console.log('IIFE runs immediately')
})()

// Arrow IIFE
(() => {
  const x = 10
  console.log(x)
})()

// Async IIFE — common in top-level scripts (without top-level await)
;(async () => {
  const data = await fetchSomething()
  console.log(data)
})()

// IIFE with return value
const config = (function() {
  const env = process.env.NODE_ENV ?? 'development'
  return {
    isDev:  env === 'development',
    isProd: env === 'production',
    env,
  }
})()

// Leading semicolon prevents issues when concatenating files:
// ;(function(){})()  ← the ; prevents treating previous expression as a function call
```

---

## W — Why It Matters

- Factory functions are the idiomatic JavaScript alternative to classes for service objects — they avoid `this` pitfalls, enable true private state, and don't require `new`. Many production codebases (React utilities, Node.js services) use factory functions.
- The module pattern was the pre-ES6 way to create modules — understanding it explains thousands of legacy codebases and NPM packages. ES6 modules (`import`/`export`) largely replace it, but the mental model is the same.
- Async IIFEs are common in scripts where top-level `await` isn't available — `(async () => { await ... })()` is the pattern to look for in Node.js scripts and configuration files.

---

## I — Interview Q&A

### Q: What is the difference between a factory function and a class?

**A:** Both create objects with methods. A factory function is a regular function that returns a plain object — private state is via closure (truly inaccessible from outside), no `new` keyword required, no `this` binding issues, and no prototype chain. A class uses `new` to instantiate, stores methods on `Class.prototype` (shared across all instances, more memory-efficient for many instances), uses `this` for state (binding must be managed), and private fields require `#prefix` syntax (ES2022). Factory functions are simpler and safer for small-to-medium objects; classes are preferable when creating many instances or when inheritance is needed.

---

## C — Common Pitfalls + Fix

### ❌ Forgetting to wrap IIFE — becomes a function declaration

```javascript
// ❌ SyntaxError: function declarations require a name
function() {
  console.log('hello')
}()

// ✅ Wrap in parentheses to make it a function expression
(function() {
  console.log('hello')
})()

// ✅ Or use arrow IIFE (cleaner)
(() => {
  console.log('hello')
})()
```

---

## K — Coding Challenge + Solution

### Challenge

Using the module pattern, create a `cartModule` with private `items` array and public methods: `addItem(item)`, `removeItem(id)`, `getTotal()` (sum of `item.price * item.quantity`), `getItems()` (returns a copy — not the private array). Use an IIFE.

### Solution

```javascript
const cartModule = (() => {
  const items = []

  return {
    addItem(item) {
      const existing = items.find(i => i.id === item.id)
      if (existing) {
        existing.quantity += item.quantity ?? 1
      } else {
        items.push({ ...item, quantity: item.quantity ?? 1 })
      }
    },
    removeItem(id) {
      const idx = items.findIndex(i => i.id === id)
      if (idx !== -1) items.splice(idx, 1)
    },
    getTotal() {
      return items.reduce((sum, i) => sum + i.price * i.quantity, 0)
    },
    getItems() {
      return [...items]   // copy — original is private ✅
    },
  }
})()

cartModule.addItem({ id: 1, name: 'Book', price: 20, quantity: 2 })
cartModule.addItem({ id: 2, name: 'Pen',  price: 5,  quantity: 3 })
console.log(cartModule.getTotal())   // 55
console.log(cartModule.items)        // undefined ✅
```

---

---
