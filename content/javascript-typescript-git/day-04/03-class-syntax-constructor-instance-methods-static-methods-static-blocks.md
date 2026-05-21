# 3 — Class Syntax — constructor, instance methods, static methods, static blocks

---

## T — TL;DR

ES6 `class` is clean syntax over constructor functions. The `constructor` method initialises instances. Instance methods go on the prototype. `static` methods belong to the class itself (not instances). `static` blocks run once when the class is evaluated — for complex static initialisation.

---

## K — Key Concepts

```javascript
// ── Basic class ────────────────────────────────────────────────────────────
class User {
  // Constructor: runs on new User(...)
  constructor(name, email) {
    this.name  = name
    this.email = email
  }

  // Instance method — on User.prototype (shared)
  greet() {
    return `Hello, I'm ${this.name}`
  }

  // toString used by template literals and coercion
  toString() {
    return `User(${this.name})`
  }
}

const mark = new User('Mark', 'mark@ex.com')
mark.greet()           // 'Hello, I'm Mark'
`${mark}`              // 'User(Mark)'
mark instanceof User   // true
```

```javascript
// ── Static methods — on the class, not instances ──────────────────────────
class MathUtils {
  // static: called as MathUtils.clamp(), NOT instance.clamp()
  static clamp(value, min, max) {
    return Math.min(Math.max(value, min), max)
  }

  static lerp(a, b, t) {
    return a + (b - a) * t
  }
}

MathUtils.clamp(150, 0, 100)   // 100
// new MathUtils().clamp(...)  // TypeError — not on instance ❌

// Static as factory methods (common pattern)
class Color {
  constructor(r, g, b) { this.r = r; this.g = g; this.b = b }

  static fromHex(hex) {
    const n = parseInt(hex.replace('#', ''), 16)
    return new Color((n >> 16) & 255, (n >> 8) & 255, n & 255)
  }

  static fromRGB(str) {
    const [r, g, b] = str.match(/\d+/g).map(Number)
    return new Color(r, g, b)
  }

  toHex() {
    return `#${[this.r,this.g,this.b].map(v=>v.toString(16).padStart(2,'0')).join('')}`
  }
}

Color.fromHex('#ff5733').toHex()    // '#ff5733' ✅
Color.fromRGB('rgb(255,87,51)').toHex()  // '#ff5733' ✅
```

```javascript
// ── Static fields ──────────────────────────────────────────────────────────
class Config {
  static DEFAULT_TIMEOUT = 5000
  static DEFAULT_RETRIES = 3
  static #instances = 0   // static private field (counted)

  constructor(options = {}) {
    Config.#instances++
    this.timeout = options.timeout ?? Config.DEFAULT_TIMEOUT
    this.retries = options.retries ?? Config.DEFAULT_RETRIES
  }

  static getInstanceCount() { return Config.#instances }
}

new Config()
new Config({ timeout: 10000 })
Config.getInstanceCount()   // 2
Config.DEFAULT_TIMEOUT      // 5000

// ── Static blocks — complex static initialisation ─────────────────────────
class DBPool {
  static pool
  static maxSize

  static {
    // Runs once when the class is defined — like a static constructor
    DBPool.maxSize = Number(process.env.DB_POOL_SIZE) || 10
    DBPool.pool = []
    console.log(`Pool initialised with max size ${DBPool.maxSize}`)
  }
}
// Log fires immediately when the class is defined
```

---

## W — Why It Matters

- `static` factory methods (`Color.fromHex`, `User.fromJSON`) are the standard way to provide multiple construction paths without overloading constructors — JavaScript has no constructor overloading.
- Static blocks replace the old `ClassName.field = complexExpression` pattern placed after the class body — they keep initialization logic co-located with the class definition.
- Class methods are non-enumerable (unlike manually setting on a prototype) — `Object.keys(instance)` returns only own data properties, not methods. This is the correct behaviour for serialisation.

---

## I — Interview Q&A

### Q: What is the difference between instance methods and static methods in a class?

**A:** Instance methods are defined in the class body without `static` — they live on `ClassName.prototype` and are available on every instance via the prototype chain. They operate on instance data (`this.name`). Static methods are defined with `static` — they live directly on the class constructor function, not on instances. They're called as `ClassName.method()` and cannot access `this` as an instance. Static methods are used for utilities, factories, and operations that relate to the class concept but don't need instance state.

---

## C — Common Pitfalls + Fix

### ❌ Calling a static method on an instance

```javascript
class Formatter {
  static format(v) { return String(v).padStart(5, '0') }
}

const f = new Formatter()
f.format(42)   // TypeError: f.format is not a function ❌

Formatter.format(42)   // '00042' ✅
```

---

## K — Coding Challenge + Solution

### Challenge

Create a `Registry` class with: a static `Map` to store instances by key, a `static register(key, instance)` method, a `static get(key)` method, a static block that logs `'Registry ready'`, and an instance `describe()` method.

### Solution

```javascript
class Registry {
  static #store = new Map()

  static {
    console.log('Registry ready')   // fires at class definition ✅
  }

  static register(key, instance) {
    if (Registry.#store.has(key)) throw new Error(`Key "${key}" already registered`)
    Registry.#store.set(key, instance)
    return instance
  }

  static get(key) {
    return Registry.#store.get(key) ?? null
  }

  static list() {
    return [...Registry.#store.keys()]
  }

  constructor(name) { this.name = name }
  describe() { return `Registry entry: ${this.name}` }
}

Registry.register('db',  new Registry('Database'))
Registry.register('api', new Registry('API Service'))
Registry.get('db').describe()   // 'Registry entry: Database'
Registry.list()                 // ['db', 'api']
```

---

---
