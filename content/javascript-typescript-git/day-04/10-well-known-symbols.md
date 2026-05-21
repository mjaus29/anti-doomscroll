# 10 — Well-Known Symbols

---

## T — TL;DR

Well-known Symbols are built-in `Symbol.*` constants that let you customise how JavaScript's built-in operations behave for your objects — iteration (`Symbol.iterator`), coercion (`Symbol.toPrimitive`), `instanceof` (`Symbol.hasInstance`), async iteration (`Symbol.asyncIterator`), and `Object.prototype.toString` output (`Symbol.toStringTag`).

---

## K — Key Concepts

```javascript
// ── Symbol.iterator — make any object iterable ────────────────────────────
class Range {
  constructor(start, end, step = 1) {
    this.start = start; this.end = end; this.step = step
  }

  [Symbol.iterator]() {
    let current = this.start
    const { end, step } = this
    return {
      next() {
        if (current <= end) {
          const value = current
          current += step
          return { value, done: false }
        }
        return { value: undefined, done: true }
      }
    }
  }
}

const range = new Range(1, 10, 2)
[...range]                    // [1, 3, 5, 7, 9]
for (const n of range) console.log(n)   // 1 3 5 7 9
const [first, second] = range            // first=1, second=3

// Array.from works on iterables
Array.from(new Range(0, 4))  // [0,1,2,3,4]
```

```javascript
// ── Symbol.toPrimitive — control type coercion ────────────────────────────
class Money {
  constructor(amount, currency = 'PHP') {
    this.amount   = amount
    this.currency = currency
  }

  [Symbol.toPrimitive](hint) {
    switch (hint) {
      case 'number': return this.amount          // +money, math
      case 'string': return `${this.amount} ${this.currency}`  // template, String()
      default:       return this.amount          // ==, + (ambiguous)
    }
  }
}

const price = new Money(100, 'PHP')
+price            // 100   (hint: 'number')
`${price}`        // '100 PHP' (hint: 'string')
price + 50        // 150   (hint: 'default' — treated as number)
price > 80        // true  (numeric comparison)
```

```javascript
// ── Symbol.hasInstance — customise instanceof ─────────────────────────────
class EvenNumber {
  static [Symbol.hasInstance](instance) {
    return Number.isInteger(instance) && instance % 2 === 0
  }
}

2  instanceof EvenNumber   // true  ✅
4  instanceof EvenNumber   // true  ✅
3  instanceof EvenNumber   // false ✅
'2' instanceof EvenNumber  // false ✅

// Practical: type-checking utility class
class Integer {
  static [Symbol.hasInstance](v) { return Number.isInteger(v) }
}
42    instanceof Integer   // true
42.5  instanceof Integer   // false
```

```javascript
// ── Symbol.asyncIterator — async iteration ────────────────────────────────
class PaginatedFetch {
  constructor(url, pages) {
    this.url   = url
    this.pages = pages
  }

  [Symbol.asyncIterator]() {
    let page = 1
    const { url, pages } = this
    return {
      async next() {
        if (page > pages) return { value: undefined, done: true }
        // Simulate API fetch
        const data = await Promise.resolve({ page: page++, items: [1, 2, 3] })
        return { value: data, done: false }
      }
    }
  }
}

async function run() {
  const feed = new PaginatedFetch('/api/items', 3)
  for await (const page of feed) {
    console.log(`Page ${page.page}: ${page.items.length} items`)
  }
}
run()
// Page 1: 3 items | Page 2: 3 items | Page 3: 3 items
```

```javascript
// ── Symbol.toStringTag — customise Object.prototype.toString output ────────
class HttpResponse {
  get [Symbol.toStringTag]() { return 'HttpResponse' }
}

const res = new HttpResponse()
Object.prototype.toString.call(res)   // '[object HttpResponse]'
// Without toStringTag: '[object Object]'

// Built-in examples:
Object.prototype.toString.call([])         // '[object Array]'
Object.prototype.toString.call(new Map())  // '[object Map]'
Object.prototype.toString.call(new Set())  // '[object Set]'
Object.prototype.toString.call(new Promise(()=>{}))  // '[object Promise]'

// Robust type checking using toStringTag
function typeOf(v) {
  return Object.prototype.toString.call(v).slice(8, -1)  // remove '[object ' and ']'
}
typeOf([])          // 'Array'
typeOf(new Map())   // 'Map'
typeOf(null)        // 'Null'
typeOf(undefined)   // 'Undefined'
typeOf(42)          // 'Number'
```

---

## W — Why It Matters

- `Symbol.iterator` is what makes `for...of`, spread `[...obj]`, destructuring, and `Array.from` work on your custom classes — implementing it makes your class a first-class JavaScript citizen that integrates with all language iteration features.
- `Symbol.toPrimitive` replaces `valueOf` and `toString` for type coercion with full control over context — you can return different values when used in numeric vs string context, preventing the ambiguity of the old `valueOf`/`toString` approach.
- `typeOf` using `Object.prototype.toString.call` with `Symbol.toStringTag` is the most reliable type-checking technique — it works for `null`, `undefined`, `Array`, `Map`, `Set`, `Promise` where `typeof` and `instanceof` fail or are ambiguous.

---

## I — Interview Q&A

### Q: How do you make a custom class work with `for...of` and the spread operator?

**A:** Implement the `[Symbol.iterator]()` method on the class. This method must return an **iterator** — an object with a `next()` method that returns `{ value, done }`. When `done` is `false`, `value` is the current item. When `done` is `true`, iteration stops. Once implemented, `for...of`, spread `[...instance]`, destructuring `const [a, b] = instance`, and `Array.from(instance)` all work automatically. The iterator can maintain its own state (a `current` counter, a pointer into an array) separate from the iterable — this is the iterable/iterator protocol.

---

## C — Common Pitfalls + Fix

### ❌ Symbol.iterator returning the wrong shape

```javascript
// ❌ next() must return { value, done } — returning just the value breaks iteration
class BadIter {
  [Symbol.iterator]() {
    const items = [1, 2, 3]
    let i = 0
    return {
      next() { return items[i++] }  // ❌ returns 1, 2, 3 — not { value, done }
    }
  }
}
[...new BadIter()]   // TypeError or empty

// ✅ Always return { value, done }
class GoodIter {
  [Symbol.iterator]() {
    const items = [1, 2, 3]
    let i = 0
    return {
      next() {
        return i < items.length
          ? { value: items[i++], done: false }
          : { value: undefined, done: true }
      }
    }
  }
}
[...new GoodIter()]   // [1, 2, 3] ✅
```

---

## K — Coding Challenge + Solution

### Challenge

Build a `LazyMap` class that stores entries and is iterable (yields `[key, value]` pairs like `Map`), has `Symbol.toStringTag` returning `'LazyMap'`, and uses `Symbol.toPrimitive` to return the size as a number and `'LazyMap(n)'` as a string.

### Solution

```javascript
class LazyMap {
  #entries = []

  set(key, value) { this.#entries.push([key, value]); return this }
  get(key)        { return this.#entries.find(([k]) => k === key)?.[1] }
  get size()      { return this.#entries.length }

  [Symbol.iterator]() {
    const entries = this.#entries
    let i = 0
    return {
      next() {
        return i < entries.length
          ? { value: [...entries[i++]], done: false }
          : { value: undefined, done: true }
      }
    }
  }

  get [Symbol.toStringTag]() { return 'LazyMap' }

  [Symbol.toPrimitive](hint) {
    if (hint === 'string') return `LazyMap(${this.size})`
    return this.size
  }
}

const map = new LazyMap()
map.set('a', 1).set('b', 2).set('c', 3)

// Iterable
for (const [k, v] of map) console.log(k, v)   // a 1, b 2, c 3
console.log([...map])     // [['a',1],['b',2],['c',3]]

// toStringTag
Object.prototype.toString.call(map)  // '[object LazyMap]'

// toPrimitive
console.log(`${map}`)   // 'LazyMap(3)'
console.log(+map)       // 3
console.log(map > 2)    // true
```

---

## ✅ Day 4 Complete — Prototypes, Classes, OOP & Meta-Programming

| # | Subtopic | Status |
|---|----------|--------|
| 1 | Prototype Chain — __proto__, getPrototypeOf | ☐ |
| 2 | Constructor Functions and new Keyword Internals | ☐ |
| 3 | Class Syntax — constructor, instance, static, static blocks | ☐ |
| 4 | Inheritance — extends, super, overriding | ☐ |
| 5 | Getters/Setters, Public Fields, Private Fields, Private Methods | ☐ |
| 6 | Mixins and Classes vs Factory Functions vs Plain Objects | ☐ |
| 7 | Proxy — Traps and Use Cases | ☐ |
| 8 | Reflect — helpers and Proxy relationship | ☐ |
| 9 | Symbol — creation, Symbol.for, registry, unique keys | ☐ |
| 10 | Well-Known Symbols — iterator, toPrimitive, hasInstance, toStringTag | ☐ |

---

## 🗺️ One-Page Mental Model — Day 4

```
PROTOTYPE CHAIN
  Every object → [[Prototype]] → ... → Object.prototype → null
  Property lookup: own props first → walk chain upward → ReferenceError
  Object.getPrototypeOf(obj)      → correct API (not __proto__)
  Object.create(proto)            → create with specific prototype
  obj → MyClass.prototype → ParentClass.prototype → Object.prototype → null
  hasOwnProperty / Object.hasOwn  → checks only own properties

CONSTRUCTOR FUNCTIONS + new
  new steps: 1.create object 2.set proto=Fn.prototype 3.call Fn(this=obj) 4.return obj
  Methods on Fn.prototype = shared (one copy) | this.method = per-instance ❌
  instanceof: checks prototype chain | x instanceof F ≡ F.prototype.isPrototypeOf(x)
  Without new: this = global/undefined → auto-new guard pattern

CLASS SYNTAX
  class = syntactic sugar over constructor fn + prototype
  constructor()   → runs on new
  method()        → on Cls.prototype (non-enumerable) — shared
  static method() → on Cls itself, not instances | call as Cls.method()
  static field    → on Cls | static block → complex static initialisation (runs once)
  static factory: static create(...args) { return new this(...args) }

INHERITANCE
  extends → sets up prototype chain automatically
  super() → must call before this in subclass constructor
  super.method() → call parent method (augment, don't replace)
  this.constructor.name → actual subclass name in parent method
  Static methods also inherited → Derived.create() via Base

FIELDS + PRIVACY
  public field    = declared in class body (own prop, before constructor)
  #privateField   = truly private (engine-enforced SyntaxError outside class)
  get name()      = computed on access (no parens needed)
  set name(v)     = intercept assignment (validate/transform)
  #privateMethod  = internal helper, not accessible outside
  TS private = compile-time only | # = runtime enforced ✅

MIXINS vs CLASSES vs FACTORY
  Mixin:    (Base) => class extends Base { ... } — preserve proto chain
            call super.method?.() to chain all overrides
  Class:    prototype sharing, instanceof, extends, # privacy
  Factory:  no new/this, closure privacy, compose with spread
  No multiple inheritance → use mixins for behaviour composition

PROXY
  new Proxy(target, handler) — intercepts operations
  Traps: get/set/has/deleteProperty/apply/construct/ownKeys/defineProperty
  set trap MUST return boolean (true=success, false=failure)
  ALWAYS use Reflect inside traps to preserve correct semantics
  Use cases: validation (set trap), logging (get/set), defaults, reactivity

REFLECT
  Mirrors every Proxy trap as a static method
  Reflect.get(t, key, receiver) → correct receiver for getters
  Reflect.set(t, key, value, r) → returns boolean (not throw)
  Reflect.ownKeys(obj)          → ALL own keys (strings + symbols)
  Reflect.apply(fn, thisArg, args) → safe fn call
  Rule: always pair Proxy traps with Reflect.* forwarding

SYMBOL
  Symbol()         → unique every call, never equal to another
  Symbol('desc')   → description for debugging only
  Symbol.for(key)  → global registry, same key = same symbol
  Symbol.keyFor(s) → reverse lookup from registry
  As property keys: hidden from Object.keys/JSON/for..in
  Visible via: Object.getOwnPropertySymbols / Reflect.ownKeys

WELL-KNOWN SYMBOLS
  Symbol.iterator      → [Symbol.iterator]() returns {next()} → enables for..of, spread
                         next() returns { value, done } — must be this shape
  Symbol.asyncIterator → async next() → for await...of
  Symbol.toPrimitive   → (hint) => value: 'number'/'string'/'default'
  Symbol.hasInstance   → static [Symbol.hasInstance](v) → customise instanceof
  Symbol.toStringTag   → get [Symbol.toStringTag]() → '[object CustomTag]'
  typeOf(v) = Object.prototype.toString.call(v).slice(8,-1) → reliable for all types
```

> **Your next action:** Open a Node.js REPL and type `class A {} class B extends A {} const b = new B(); Object.getPrototypeOf(Object.getPrototypeOf(b))` — watch the prototype chain in action. One live chain traversal beats five minutes of diagrams.

> "Doing one small thing beats opening a feed."
