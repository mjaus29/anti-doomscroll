# 2 — Constructor Functions and the `new` Keyword Internals

---

## T — TL;DR

Before classes, **constructor functions** (capitalised by convention) + `new` were how objects were created with shared prototype methods. `new` does four things: creates an object, sets its prototype to `Constructor.prototype`, runs the function with `this` = new object, and returns the object. Understanding `new` explains why `class` is just sugar.

---

## K — Key Concepts

```javascript
// ── Constructor function ───────────────────────────────────────────────────
function User(name, email) {
  // 'this' is the new object created by new
  this.name  = name
  this.email = email
  // implicitly returns 'this'
}

// Methods on the prototype (shared across all instances — one copy in memory)
User.prototype.greet = function() {
  return `Hello, I'm ${this.name}`
}
User.prototype.toString = function() {
  return `User(${this.name})`
}

const mark  = new User('Mark', 'mark@ex.com')
const alice = new User('Alice', 'alice@ex.com')

mark.greet()   // 'Hello, I'm Mark'
alice.greet()  // 'Hello, I'm Alice'

// Both instances share the SAME greet function (memory efficient)
mark.greet === alice.greet   // true — same reference on prototype ✅
mark.name  === alice.name    // false — own properties are independent
```

```javascript
// ── What new does (step by step) ──────────────────────────────────────────
function simulateNew(Constructor, ...args) {
  // Step 1: Create a new empty object
  const obj = {}
  // Step 2: Set its prototype to Constructor.prototype
  Object.setPrototypeOf(obj, Constructor.prototype)
  // Step 3: Call the constructor with 'this' = new object
  const result = Constructor.apply(obj, args)
  // Step 4: Return result if it's an object, else return obj
  return (typeof result === 'object' && result !== null) ? result : obj
}

const testUser = simulateNew(User, 'Test', 'test@ex.com')
testUser.greet()   // 'Hello, I'm Test' ✅
testUser instanceof User  // true ✅
```

```javascript
// ── instanceof — checks the prototype chain ───────────────────────────────
mark instanceof User     // true  — User.prototype in mark's chain
mark instanceof Object   // true  — Object.prototype in chain
mark instanceof Array    // false

// instanceof checks Symbol.hasInstance (can be customised — Subtopic 10)
// Equivalent to:
User.prototype.isPrototypeOf(mark)   // true

// ── Calling constructor without new ──────────────────────────────────────
// ❌ Without new, this = global (or undefined in strict)
const bad = User('Broken', 'b@b.com')  // this = global, no object returned
bad   // undefined — 'name' set on global object ❌

// Protection pattern — detect missing new
function SafeUser(name) {
  if (!(this instanceof SafeUser)) {
    return new SafeUser(name)    // auto-new if called without it
  }
  this.name = name
}
```

---

## W — Why It Matters

- `class` is syntactic sugar over constructor functions and `Object.prototype` — the runtime representation is identical. A TypeScript class compiles to a constructor function + prototype assignment. Understanding this layer explains JS class behaviour at the engine level.
- Methods on the prototype are shared — defining methods inside the constructor (`this.greet = function() {}`) creates a new function per instance, wasting memory. Prototype methods are created once.
- `instanceof` checks the prototype chain, not the constructor — this means it can return unexpected results across iframe boundaries or after `Object.setPrototypeOf` manipulation.

---

## I — Interview Q&A

### Q: What are the four steps the `new` keyword performs?

**A:** (1) Creates a new empty object. (2) Sets the new object's `[[Prototype]]` to `Constructor.prototype`. (3) Calls the constructor function with `this` bound to the new object. (4) Returns the new object — unless the constructor explicitly returns a different object (in which case that object is returned instead; primitives returned from constructors are ignored). This is why `new` is needed for constructor functions — without it, `this` is the global object or `undefined` in strict mode, not a new instance.

---

## C — Common Pitfalls + Fix

### ❌ Defining methods inside constructor — creates per-instance functions

```javascript
// ❌ Each instance gets its own copy of greet — memory waste
function User(name) {
  this.name = name
  this.greet = function() { return `Hi, I'm ${this.name}` }  // new fn each time
}
const a = new User('A'), b = new User('B')
a.greet === b.greet   // false — different functions ❌

// ✅ Define on prototype — shared single function
function User2(name) { this.name = name }
User2.prototype.greet = function() { return `Hi, I'm ${this.name}` }
const c = new User2('C'), d = new User2('D')
c.greet === d.greet   // true — same function ✅
```

---

## K — Coding Challenge + Solution

### Challenge

Implement `Stack` using a constructor function with `push`, `pop`, `peek`, `size`, and `isEmpty` methods on the prototype. Show that two instances share the methods but have independent data.

### Solution

```javascript
function Stack() {
  this._items = []   // own property — independent per instance
}
Stack.prototype.push    = function(item)  { this._items.push(item); return this }
Stack.prototype.pop     = function()      { return this._items.pop() }
Stack.prototype.peek    = function()      { return this._items.at(-1) }
Stack.prototype.size    = function()      { return this._items.length }
Stack.prototype.isEmpty = function()      { return this._items.length === 0 }

const s1 = new Stack()
const s2 = new Stack()
s1.push(1).push(2).push(3)
s2.push(10)

console.log(s1.peek())    // 3
console.log(s2.peek())    // 10 — independent ✅
console.log(s1.push === s2.push)   // true — shared prototype ✅
```

---

---
