# 8 — Reflect

---

## T — TL;DR

`Reflect` is a built-in object with static methods that mirror the internal operations of JavaScript objects. Every `Reflect` method corresponds to a Proxy trap. Use `Reflect` inside Proxy traps to forward operations to the target correctly. `Reflect` methods return proper boolean results instead of throwing — making them safer for conditional logic.

---

## K — Key Concepts

```javascript
// ── Reflect methods mirror Proxy traps ────────────────────────────────────
const obj = { name: 'Mark', age: 28 }

// Property access
Reflect.get(obj, 'name')              // 'Mark'  — same as obj.name
Reflect.get(obj, 'name', proxyObj)    // with receiver (for getters)

// Property assignment
Reflect.set(obj, 'age', 30)           // true (success) — same as obj.age = 30
Reflect.set(obj, 'age', 30, obj)      // with receiver

// Property existence
Reflect.has(obj, 'name')              // true  — same as 'name' in obj
Reflect.has(obj, 'toString')          // true  — checks prototype too

// Property deletion
Reflect.deleteProperty(obj, 'age')    // true  — same as delete obj.age

// Own property keys
Reflect.ownKeys(obj)                  // ['name'] — all own keys (string + symbol)
// Compare: Object.keys (enumerable strings) vs Reflect.ownKeys (all own keys)

// Object construction
Reflect.construct(Array, [1,2,3])     // [1,2,3] — same as new Array(1,2,3)
Reflect.construct(Date, ['2025-01-01'])  // Date object

// Function application
Reflect.apply(Math.max, null, [1,2,3])  // 3 — same as Math.max.apply(null,[1,2,3])
```

```javascript
// ── Reflect.get vs direct access — receiver matters ───────────────────────
class Base {
  get fullName() { return `${this.first} ${this.last}` }
}

const instance = Object.create(Base.prototype)
instance.first = 'Mark'
instance.last  = 'Austin'

// Reflect.get with correct receiver ensures 'this' in the getter = instance
Reflect.get(Base.prototype, 'fullName', instance)   // 'Mark Austin' ✅
// Without receiver: this = Base.prototype — wrong
```

```javascript
// ── Reflect.defineProperty — returns boolean instead of throwing ──────────
const target = Object.freeze({ x: 1 })

// Object.defineProperty throws on failure
try {
  Object.defineProperty(target, 'y', { value: 2 })  // throws TypeError
} catch(e) { console.log('threw') }

// Reflect.defineProperty returns false on failure — cleaner for conditionals
const success = Reflect.defineProperty(target, 'y', { value: 2 })
console.log(success)   // false — clean failure ✅

// ── Reflect inside a Proxy trap ────────────────────────────────────────────
// ALWAYS use Reflect in traps to ensure correct behaviour
const proxy = new Proxy(target, {
  get(t, key, receiver) {
    // ✅ Correct: forwards to target with proper receiver (handles getters)
    return Reflect.get(t, key, receiver)
    // ❌ Naive: t[key] — breaks getter receiver binding
  },
  set(t, key, value, receiver) {
    // ✅ Correct: returns true/false
    return Reflect.set(t, key, value, receiver)
    // ❌ Naive: t[key] = value; return true — doesn't handle non-writable props
  },
})
```

```javascript
// ── Reflect.ownKeys — complete key list ───────────────────────────────────
const sym = Symbol('id')
const obj2 = { name: 'Mark', [sym]: 123 }
Object.defineProperty(obj2, 'hidden', { value: 'x', enumerable: false })

Object.keys(obj2)            // ['name']          — enumerable strings only
Object.getOwnPropertyNames(obj2) // ['name','hidden']  — all string keys
Object.getOwnPropertySymbols(obj2) // [Symbol(id)]    — symbols only
Reflect.ownKeys(obj2)        // ['name','hidden', Symbol(id)] — ALL own keys ✅
```

---

## W — Why It Matters

- `Reflect` methods return booleans on failure instead of throwing — `Reflect.set` returns `false` when the property is non-writable; `Object`'s equivalent throws in strict mode. This makes Reflect better for conditional proxy logic.
- Using `Reflect.get(target, key, receiver)` in a `get` trap correctly handles getters — the `receiver` ensures `this` in a getter refers to the proxy (or the correct object), not the raw target.
- `Reflect.ownKeys` is the complete key enumeration — it returns all own string and symbol keys including non-enumerable ones. This is the only single call that does everything.

---

## I — Interview Q&A

### Q: Why should you use `Reflect` inside Proxy traps instead of operating directly on the target?

**A:** Three reasons: (1) **Receiver correctness** — `Reflect.get(target, key, receiver)` passes the receiver (the proxy) as `this` to getters, so getters that use `this` get the right object. Direct `target[key]` passes the raw target as `this`. (2) **Boolean return values** — `Reflect.set` returns `false` when the operation fails (e.g., non-writable property); direct assignment would throw in strict mode or silently fail. The Proxy `set` trap must return a boolean — `Reflect.set` provides that directly. (3) **Semantic correctness** — Reflect methods invoke the same internal operations (`[[Get]]`, `[[Set]]`) that the JavaScript spec defines, ensuring correct behaviour with inherited properties, non-configurable properties, and all edge cases.

---

## C — Common Pitfalls + Fix

### ❌ Returning wrong type from Proxy set trap

```javascript
// ❌ set trap must return boolean — returning undefined causes TypeError
const proxy = new Proxy({}, {
  set(target, key, value) {
    target[key] = value   // sets value but returns undefined (falsy)
    // In strict mode: TypeError: 'set' on proxy returned false for property 'key'
  }
})

// ✅ Always return Reflect.set (or explicit true/false)
const proxy2 = new Proxy({}, {
  set(target, key, value, receiver) {
    return Reflect.set(target, key, value, receiver)  // returns boolean ✅
  }
})
```

---

## K — Coding Challenge + Solution

### Challenge

Write a `createObservable(obj)` that uses both Proxy and Reflect correctly. It should: track all property accesses in a `reads` array, track all writes in a `writes` array, and expose `.getStats()` on the proxy.

### Solution

```javascript
function createObservable(obj) {
  const stats = { reads: [], writes: [] }

  return new Proxy(obj, {
    get(target, key, receiver) {
      if (key === 'getStats') return () => ({ ...stats })
      stats.reads.push({ key, at: Date.now() })
      return Reflect.get(target, key, receiver)
    },
    set(target, key, value, receiver) {
      stats.writes.push({ key, prev: target[key], next: value, at: Date.now() })
      return Reflect.set(target, key, value, receiver)
    },
  })
}

const o = createObservable({ x: 1, y: 2 })
o.x             // read
o.y             // read
o.x = 10        // write
o.y = 20        // write

const s = o.getStats()
console.log(s.reads.map(r => r.key))    // ['x', 'y']
console.log(s.writes.map(w => `${w.key}:${w.prev}→${w.next}`))
// ['x:1→10', 'y:2→20']
```

---

---
