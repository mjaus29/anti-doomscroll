# 6 — Object Static Methods

---

## T — TL;DR

`Object` static methods are the toolkit for working with objects: iterating (`keys/values/entries`), merging (`assign`), protecting (`freeze/seal`), creating with prototype (`create`), introspecting (`getOwnPropertyDescriptor`), building from entries (`fromEntries`), and safe existence check (`hasOwn`).

---

## K — Key Concepts

```javascript
// ── keys / values / entries ────────────────────────────────────────────────
const user = { name: 'Mark', age: 28, role: 'admin' }

Object.keys(user)      // ['name', 'age', 'role']   — own enumerable keys
Object.values(user)    // ['Mark', 28, 'admin']      — own enumerable values
Object.entries(user)   // [['name','Mark'],['age',28],['role','admin']]

// Iterate with entries
for (const [key, value] of Object.entries(user)) {
  console.log(`${key}: ${value}`)
}

// Transform object values
const upperUser = Object.fromEntries(
  Object.entries(user).map(([k, v]) => [k, typeof v === 'string' ? v.toUpperCase() : v])
)
// { name: 'MARK', age: 28, role: 'ADMIN' }

// ── fromEntries — build object from [key,value] pairs ────────────────────
Object.fromEntries([['a', 1], ['b', 2]])     // { a: 1, b: 2 }
Object.fromEntries(new Map([['x', 10]]))     // { x: 10 }
// Common: invert an object
const original = { a: 1, b: 2, c: 3 }
const inverted = Object.fromEntries(Object.entries(original).map(([k,v]) => [v,k]))
// { '1': 'a', '2': 'b', '3': 'c' }
```

```javascript
// ── assign — shallow merge into target ────────────────────────────────────
const defaults = { theme: 'light', lang: 'en', fontSize: 14 }
const userPrefs = { theme: 'dark', fontSize: 16 }

// Mutates target! First arg is modified and returned
Object.assign({}, defaults, userPrefs)
// { theme: 'dark', lang: 'en', fontSize: 16 } — target is {} (new obj) ✅

// ❌ Mutates defaults
Object.assign(defaults, userPrefs)

// Modern equivalent: spread (preferred)
const merged = { ...defaults, ...userPrefs }   // ✅ cleaner
```

```javascript
// ── freeze / seal ─────────────────────────────────────────────────────────
// freeze: no add, delete, or modify (shallow)
const config = Object.freeze({
  host: 'localhost',
  port: 5432,
  nested: { max: 10 },   // ← not frozen — shallow!
})
config.port = 9999   // silently fails (throws in strict mode)
config.newKey = 'x'  // silently fails
config.nested.max = 99  // ✅ nested objects are NOT frozen

// seal: no add or delete, but CAN modify existing values
const settings = Object.seal({ volume: 50, muted: false })
settings.volume = 75   // ✅ modification allowed
settings.newProp = 'x' // silently fails — can't add ❌
delete settings.volume // silently fails — can't delete ❌
```

```javascript
// ── create — set prototype explicitly ─────────────────────────────────────
const animalMethods = {
  speak() { return `${this.name} says ${this.sound}` },
  toString() { return `[Animal: ${this.name}]` },
}

const dog = Object.create(animalMethods)
dog.name  = 'Rex'
dog.sound = 'woof'
dog.speak()   // 'Rex says woof' — inherits from animalMethods

// Object.create(null) — no prototype (no .toString, .hasOwnProperty, etc.)
const pure = Object.create(null)
pure.key = 'value'
// Useful for safe dictionaries with no prototype-chain pollution

// ── defineProperty — fine-grained property control ────────────────────────
const obj = {}
Object.defineProperty(obj, 'id', {
  value:        42,
  writable:     false,    // cannot change
  enumerable:   false,    // hidden from for..in and Object.keys
  configurable: false,    // cannot redefine or delete
})
obj.id   // 42
obj.id = 99   // silently fails (throws in strict mode)
Object.keys(obj)   // [] — id is non-enumerable

// Get descriptor
Object.getOwnPropertyDescriptor(obj, 'id')
// { value: 42, writable: false, enumerable: false, configurable: false }
```

---

## W — Why It Matters

- `Object.entries` + `Object.fromEntries` is the "transform object" pattern — filter/map object properties without manual key iteration. This replaces many verbose `for...in` loops.
- `Object.freeze` is shallow — a common misconception. Nested objects remain mutable. For deep freeze, you need a recursive implementation. This explains why `Object.freeze` isn't sufficient for truly immutable config objects with nested data.
- `Object.create(null)` creates a dictionary with no prototype — ideal for a lookup map where someone might set a key named `toString` or `hasOwnProperty` without breaking the object's behaviour.

---

## I — Interview Q&A

### Q: What is the difference between `Object.freeze` and `Object.seal`?

**A:** Both prevent adding new properties and deleting existing ones. The difference: `freeze` also prevents modifying existing property values — the object is completely locked. `seal` allows modification of existing values but prevents structural changes (no new properties, no deletions). Both are shallow — nested objects are unaffected. Use `freeze` for configuration constants; use `seal` when you want a fixed-shape object whose values may still be updated.

---

## C — Common Pitfalls + Fix

### ❌ Object.assign with deeply nested objects — shared references

```javascript
// ❌ Nested objects are still shared references
const a = { user: { name: 'Mark', prefs: { theme: 'dark' } } }
const b = Object.assign({}, a)
b.user.prefs.theme = 'light'
console.log(a.user.prefs.theme)   // 'light' — a was mutated! ❌

// ✅ Deep clone instead (covered in Subtopic 8)
const c = structuredClone(a)
c.user.prefs.theme = 'light'
console.log(a.user.prefs.theme)   // 'dark' ✅ — original untouched
```

---

## K — Coding Challenge + Solution

### Challenge

Write a `pick(obj, keys)` and `omit(obj, keys)` utility using `Object.entries` and `Object.fromEntries`.

### Solution

```javascript
const pick = (obj, keys) =>
  Object.fromEntries(
    Object.entries(obj).filter(([k]) => keys.includes(k))
  )

const omit = (obj, keys) =>
  Object.fromEntries(
    Object.entries(obj).filter(([k]) => !keys.includes(k))
  )

const user = { id: 1, name: 'Mark', email: 'mark@ex.com', password: 'secret', role: 'admin' }

console.log(pick(user, ['id', 'name', 'email']))
// { id: 1, name: 'Mark', email: 'mark@ex.com' }

console.log(omit(user, ['password', 'role']))
// { id: 1, name: 'Mark', email: 'mark@ex.com' }
```

---

---
