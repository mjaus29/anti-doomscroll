# 5 — Object Literals — Shorthand, Computed Properties, Methods

---

## T — TL;DR

Object literals in ES6+ have shorthand property syntax, shorthand methods, and computed property names with `[]`. These reduce boilerplate and enable dynamic key construction. Property access: dot notation for static keys, bracket notation for dynamic keys or invalid identifiers.

---

## K — Key Concepts

```javascript
// ── Shorthand properties ───────────────────────────────────────────────────
const name = 'Mark'
const age  = 28

// ❌ Verbose
const user = { name: name, age: age }

// ✅ Shorthand — key and variable name are the same
const user2 = { name, age }
// { name: 'Mark', age: 28 }

// ── Shorthand methods ──────────────────────────────────────────────────────
// ❌ Verbose
const service = {
  greet: function(name) { return `Hello, ${name}` },
}

// ✅ Method shorthand
const service2 = {
  greet(name) { return `Hello, ${name}` },
  async fetchUser(id) { return await db.find(id) },
  get fullName() { return `${this.first} ${this.last}` },  // getter
  set fullName(v) { [this.first, this.last] = v.split(' ') },  // setter
}
```

```javascript
// ── Computed property names ────────────────────────────────────────────────
const key = 'dynamic'
const obj = {
  [key]: 'value',            // { dynamic: 'value' }
  [`${key}_meta`]: true,     // { dynamic_meta: true }
  ['key-with-hyphens']: 42,  // { 'key-with-hyphens': 42 }
}

// Dynamic key from variable
function makeConfig(prefix, values) {
  return values.reduce((acc, val, i) => ({
    ...acc,
    [`${prefix}_${i}`]: val,
  }), {})
}
makeConfig('item', ['a','b','c'])
// { item_0: 'a', item_1: 'b', item_2: 'c' }
```

```javascript
// ── Property access ────────────────────────────────────────────────────────
const config = { host: 'localhost', 'content-type': 'json', 1: 'one' }

// Dot notation — static, identifier-safe keys
config.host          // 'localhost'

// Bracket notation — dynamic, any string key
config['content-type']   // 'json'  — hyphen not valid in dot notation
config['host']           // 'localhost' — also works
config[1]                // 'one'  — numeric keys

// Dynamic access
const field = 'host'
config[field]            // 'localhost'

// Optional chaining with nested objects
const user = { address: { city: 'Manila' } }
user?.address?.city      // 'Manila'
user?.phone?.number      // undefined (not error)
```

```javascript
// ── Property descriptors ──────────────────────────────────────────────────
// Each property has: value, writable, enumerable, configurable
// Object literal = writable:true, enumerable:true, configurable:true (all open)

// Check if property exists on the object itself (not prototype)
Object.hasOwn({ a: 1 }, 'a')    // true  (ES2022 — prefer over hasOwnProperty)
Object.hasOwn({ a: 1 }, 'b')    // false
Object.hasOwn({ a: 1 }, 'toString')  // false (on prototype, not own)
```

---

## W — Why It Matters

- Shorthand property syntax is everywhere in modern JS — `return { name, email, role }` in API handlers, destructured function params. Not knowing it makes code harder to read and write.
- Computed property names enable dynamic object construction — building response objects with keys from variables, creating lookup dictionaries from arrays with `reduce`.
- `Object.hasOwn` vs `hasOwnProperty` — `hasOwnProperty` can be shadowed if someone puts a property named `hasOwnProperty` on the object. `Object.hasOwn` can't. Always use `Object.hasOwn`.

---

## I — Interview Q&A

### Q: What is the difference between dot notation and bracket notation for property access?

**A:** Dot notation (`obj.key`) requires the key to be a valid identifier — no spaces, hyphens, or starting digits, and the key must be known at write time. Bracket notation (`obj['key']`) accepts any string, including those with special characters, and can use a variable: `obj[dynamicKey]`. Use dot notation for static, identifier-safe keys (faster to read). Use bracket notation for dynamic keys, keys from variables, or keys with special characters like `'Content-Type'`.

---

## C — Common Pitfalls + Fix

### ❌ Accessing a property named after a variable without brackets

```javascript
const field = 'name'
const user  = { name: 'Mark', age: 28 }

// ❌ Accesses the literal key "field", not the value of the variable
user.field   // undefined — no property named "field" on user

// ✅ Bracket notation uses the variable's value as the key
user[field]  // 'Mark' ✅
```

---

## K — Coding Challenge + Solution

### Challenge

Write a `buildResponse(status, data, meta = {})` function that returns an object using shorthand, computed key (`[`${status}Data`]`), and a method `toJSON()` that returns a JSON-safe version.

### Solution

```javascript
function buildResponse(status, data, meta = {}) {
  const timestamp = Date.now()
  return {
    status,                         // shorthand
    [`${status}Data`]: data,        // computed key
    meta: { timestamp, ...meta },   // shorthand + spread
    toJSON() {                      // shorthand method
      const { toJSON: _, ...rest } = this   // exclude method from output
      return rest
    },
  }
}

const res = buildResponse('success', { id: 1 }, { requestId: 'abc' })
console.log(res.successData)   // { id: 1 }
console.log(JSON.stringify(res.toJSON()))
// {"status":"success","successData":{"id":1},"meta":{"timestamp":...,"requestId":"abc"}}
```

---

---
