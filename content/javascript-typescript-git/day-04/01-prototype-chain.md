# 1 — Prototype Chain

---

## T — TL;DR

Every JavaScript object has a hidden `[[Prototype]]` link to another object (or `null`). Property lookups walk this chain — if a property isn't found on the object, JavaScript looks at its prototype, then that prototype's prototype, until `null`. This is inheritance in JavaScript. `Object.getPrototypeOf` is the correct API; `__proto__` is legacy.

---

## K — Key Concepts

```javascript
// ── Every object has a prototype ──────────────────────────────────────────
const obj = { name: 'Mark' }

Object.getPrototypeOf(obj) === Object.prototype   // true
Object.getPrototypeOf(Object.prototype)           // null  ← end of chain

// ── Property lookup walks the chain ───────────────────────────────────────
const animal = {
  breathe() { return `${this.name} breathes` },
}

const dog = Object.create(animal)   // dog's [[Prototype]] = animal
dog.name = 'Rex'

dog.breathe()   // 'Rex breathes'
// Lookup: dog.breathe → not own → animal.breathe ✅

dog.hasOwnProperty('name')     // true  — own property
dog.hasOwnProperty('breathe')  // false — on prototype

Object.hasOwn(dog, 'name')     // true  (modern, preferred)
Object.hasOwn(dog, 'breathe')  // false
```

```javascript
// ── The prototype chain visualised ────────────────────────────────────────
// dog → animal → Object.prototype → null
//
// dog: { name: 'Rex' }
//   [[Prototype]]: animal
//     breathe()
//     [[Prototype]]: Object.prototype
//       toString(), hasOwnProperty(), valueOf(), ...
//       [[Prototype]]: null

// ── __proto__ — legacy accessor (avoid in new code) ──────────────────────
dog.__proto__ === animal               // true — works but discouraged
// Use instead:
Object.getPrototypeOf(dog) === animal  // true ✅

// ── Object.setPrototypeOf — change prototype after creation ───────────────
const cat = { name: 'Whiskers' }
Object.setPrototypeOf(cat, animal)
cat.breathe()   // 'Whiskers breathes' ✅
// ⚠️ Slow — triggers de-optimisation in V8. Use Object.create at creation time.
```

```javascript
// ── Array and Function prototype chains ───────────────────────────────────
const arr = [1, 2, 3]
Object.getPrototypeOf(arr) === Array.prototype     // true
Object.getPrototypeOf(Array.prototype) === Object.prototype  // true
// arr → Array.prototype (map, filter...) → Object.prototype → null

function fn() {}
Object.getPrototypeOf(fn) === Function.prototype   // true
// fn → Function.prototype (call, apply...) → Object.prototype → null

// ── Prototype chain for class instances ──────────────────────────────────
class Animal { breathe() {} }
class Dog extends Animal { bark() {} }

const d = new Dog()
Object.getPrototypeOf(d) === Dog.prototype           // true
Object.getPrototypeOf(Dog.prototype) === Animal.prototype  // true
// d → Dog.prototype → Animal.prototype → Object.prototype → null
```

---

## W — Why It Matters

- Understanding the prototype chain explains why `[].map` and `{}.toString()` work — methods on `Array.prototype` and `Object.prototype` are inherited by all arrays and objects. You never define them per instance.
- `hasOwnProperty` vs prototype lookup is a real bug vector — `'toString' in obj` is `true` for every plain object (it's on `Object.prototype`), but `Object.hasOwn(obj, 'toString')` is `false`. Use `Object.hasOwn` for existence checks.
- Class syntax (Subtopic 3) is syntactic sugar over prototypes — understanding prototypes means you can debug class-based code at the JavaScript level, not just at the TypeScript abstraction level.

---

## I — Interview Q&A

### Q: What is the prototype chain and how does property lookup work?

**A:** Every object has an internal `[[Prototype]]` reference pointing to another object. When you access a property, JavaScript first checks the object's own properties. If not found, it follows `[[Prototype]]` to the next object and checks there, continuing up the chain until it reaches `null`. This chain is how objects inherit methods — `arr.map` is not on the array itself, it's on `Array.prototype`, which is the prototype of all arrays. `Object.getPrototypeOf(obj)` reads the chain; `Object.create(proto)` creates an object with a specific prototype.

---

## C — Common Pitfalls + Fix

### ❌ Modifying `Object.prototype` — affects every object

```javascript
// ❌ Adding to Object.prototype pollutes ALL objects
Object.prototype.greet = function() { return 'hello' }
const obj = {}
obj.greet()   // 'hello' — unexpected on a plain object ❌
// Breaks for..in loops, Object.keys results, third-party libraries

// ✅ Add methods to specific prototypes, not Object.prototype
Array.prototype.sum = function() { return this.reduce((a, b) => a + b, 0) }
// Still risky — conflicts with future native methods. Prefer utility functions.
```

---

## K — Coding Challenge + Solution

### Challenge

Create an `eventEmitter` object using `Object.create`. It should have `on(event, fn)`, `emit(event, ...args)`, and `off(event, fn)` methods on the prototype. Create two instances and verify they share the prototype methods but have independent listener state.

### Solution

```javascript
const emitterProto = {
  on(event, fn) {
    if (!this._events[event]) this._events[event] = []
    this._events[event].push(fn)
    return this
  },
  off(event, fn) {
    this._events[event] = (this._events[event] ?? []).filter(h => h !== fn)
    return this
  },
  emit(event, ...args) {
    (this._events[event] ?? []).forEach(fn => fn(...args))
    return this
  },
}

function createEmitter() {
  const emitter = Object.create(emitterProto)
  emitter._events = {}   // own property — independent per instance
  return emitter
}

const a = createEmitter()
const b = createEmitter()

a.on('data', v => console.log('A:', v))
b.on('data', v => console.log('B:', v))
a.emit('data', 'hello')   // A: hello  (b not affected)
b.emit('data', 'world')   // B: world

Object.getPrototypeOf(a) === emitterProto   // true — shared methods ✅
a._events === b._events                     // false — independent state ✅
```

---

---
