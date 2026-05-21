# 8 — `this` in All Contexts — call, apply, bind

---

## T — TL;DR

`this` refers to the object that is executing the current function — its value depends on HOW a function is called, not where it's defined (except for arrow functions, which have no own `this`). Five contexts: global, function call, method call, class, arrow. `call`/`apply` invoke with an explicit `this`. `bind` returns a new function with `this` permanently set.

---

## K — Key Concepts

```javascript
// ── Context 1: Global scope ────────────────────────────────────────────────
console.log(this)        // browser: Window | Node.js module: {} (module object)
                         // Node.js REPL: global

// ── Context 2: Regular function call ──────────────────────────────────────
function showThis() {
  console.log(this)
}
showThis()   // browser: Window | strict mode: undefined
             // 'use strict' → this is undefined in plain function calls ✅

// ── Context 3: Method call — this = the object left of the dot ────────────
const user = {
  name: 'Mark',
  greet() {
    return `Hello, ${this.name}`
  }
}
user.greet()   // 'Hello, Mark' — this = user ✅

// Detached method — loses its this!
const fn = user.greet
fn()           // 'Hello, undefined' — this lost (becomes global/undefined) ❌
```

```javascript
// ── Context 4: Arrow function — lexical this ──────────────────────────────
const timer = {
  seconds: 0,
  start() {
    // 'this' inside start() = timer
    setInterval(() => {
      this.seconds++   // arrow: this inherited from start() = timer ✅
    }, 1000)
  },
}

// Without arrow — this is lost inside the callback
const timer2 = {
  seconds: 0,
  start() {
    setInterval(function() {
      this.seconds++   // this = global/undefined (not timer2) ❌
    }, 1000)
  },
}

// ── Context 5: Class ───────────────────────────────────────────────────────
class Counter {
  count = 0
  increment() { this.count++ }
  decrement() { this.count-- }
}
const c = new Counter()
c.increment()   // this = c ✅

// Detached class method — same problem
const inc = c.increment
// inc()  // TypeError or this.count++ on wrong object
```

```javascript
// ── call — invoke with explicit this + arguments ──────────────────────────
function greet(greeting, punctuation) {
  return `${greeting}, ${this.name}${punctuation}`
}

const mark = { name: 'Mark' }
const alice = { name: 'Alice' }

greet.call(mark,  'Hello', '!')   // 'Hello, Mark!'
greet.call(alice, 'Hi',    '.')   // 'Hi, Alice.'

// ── apply — like call but arguments as array ──────────────────────────────
greet.apply(mark, ['Hello', '!'])   // 'Hello, Mark!'

// Classic use: Math.max with an array
const nums = [3, 1, 4, 1, 5]
Math.max.apply(null, nums)   // 5
// Modern equivalent:
Math.max(...nums)             // 5 ← prefer spread now

// ── bind — return new function with fixed this ─────────────────────────────
const greetMark = greet.bind(mark)
greetMark('Hello', '!')   // 'Hello, Mark!' — this permanently = mark

// Bind with pre-filled arguments (partial application)
const sayHiMark = greet.bind(mark, 'Hi')   // this=mark, greeting='Hi'
sayHiMark('!')    // 'Hi, Mark!'
sayHiMark('?')   // 'Hi, Mark?'

// Fixing detached method
const boundInc = c.increment.bind(c)
boundInc()   // c.count++ with correct this ✅
```

---

## W — Why It Matters

- Detached methods losing `this` is one of the most common JavaScript runtime errors — passing `user.greet` as a callback to `setTimeout` or an event listener loses the `this` binding. Fix: `bind`, arrow function wrapper, or class field arrow method.
- `call` and `apply` are used in library code and polyfills — `Array.prototype.slice.call(arguments)` converts `arguments` to an array, a pattern you'll see in older code constantly.
- Arrow functions as class fields (`handleClick = () => {}`) are a React pattern for event handlers precisely because they capture `this` from the class instance — but they create a new function per instance (not on prototype).

---

## I — Interview Q&A

### Q: What is the difference between `call`, `apply`, and `bind`?

**A:** All three set `this` explicitly. `call(thisArg, arg1, arg2)` invokes the function immediately with individual arguments. `apply(thisArg, [arg1, arg2])` invokes immediately with arguments as an array — useful for spreading an array. `bind(thisArg, arg1)` returns a new function with `this` permanently set and optionally pre-fills arguments (partial application) — the function is not called immediately. Memory tip: `call` = comma-separated, `apply` = array, `bind` = bakes it in.

---

## C — Common Pitfalls + Fix

### ❌ Passing object method as callback — loses `this`

```javascript
class Logger {
  prefix = '[LOG]'
  log(msg) { console.log(`${this.prefix} ${msg}`) }
}

const logger = new Logger()
// ❌ this is lost when passed as callback
setTimeout(logger.log, 100, 'hello')   // undefined hello

// ✅ Fix 1: bind
setTimeout(logger.log.bind(logger), 100, 'hello')

// ✅ Fix 2: arrow wrapper
setTimeout((msg) => logger.log(msg), 100, 'hello')

// ✅ Fix 3: class field arrow (binds at instantiation)
class Logger2 {
  prefix = '[LOG]'
  log = (msg) => console.log(`${this.prefix} ${msg}`)   // arrow = lexical this
}
```

---

## K — Coding Challenge + Solution

### Challenge

Write a `softBind(fn, thisArg)` function that works like `bind` but only applies the binding if `this` is global/undefined — otherwise uses the actual call-site `this`. Show its behaviour with both a method call and a direct call.

### Solution

```javascript
function softBind(fn, thisArg) {
  return function(...args) {
    // Use thisArg only if this is null, undefined, or global
    const ctx = (!this || this === globalThis) ? thisArg : this
    return fn.apply(ctx, args)
  }
}

function getName() { return this.name }

const mark  = { name: 'Mark' }
const alice = { name: 'Alice' }

const softBound = softBind(getName, mark)

softBound()               // 'Mark'  — no this, uses mark (default)
alice.method = softBound
alice.method()            // 'Alice' — has real this (alice), uses it ✅
```

---

---
