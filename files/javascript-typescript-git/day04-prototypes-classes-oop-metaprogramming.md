
# 📅 Day 4 — Prototypes, Classes, OOP & Meta-Programming

> **Goal:** Understand JavaScript's prototype model from the ground up, master class syntax, and use meta-programming tools (Proxy, Reflect, Symbol) in real patterns.
> **Format:** Each subtopic = 5–15 min. Do one. Stop. Come back.
> **Stack:** Node.js 22 · TypeScript 6 (context) · Vanilla JS

---

## 📋 Day 4 Subtopic Overview

| # | Subtopic | Time |
|---|----------|------|
| 1 | Prototype Chain — `__proto__`, getPrototypeOf, setPrototypeOf | 10 min |
| 2 | Constructor Functions and the `new` Keyword Internals | 10 min |
| 3 | Class Syntax — constructor, instance methods, static methods, static blocks | 12 min |
| 4 | Inheritance — extends, super, overriding | 12 min |
| 5 | Getters/Setters, Public Fields, Private Fields, Private Methods | 10 min |
| 6 | Mixins and Classes vs Factory Functions vs Plain Objects | 10 min |
| 7 | Proxy — Traps and Use Cases | 12 min |
| 8 | Reflect — helpers and relationship to Proxy | 10 min |
| 9 | Symbol — creation, Symbol.for, registry, unique keys | 10 min |
| 10 | Well-Known Symbols — iterator, toPrimitive, hasInstance, toStringTag | 12 min |

---

---

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

# 4 — Inheritance — extends, super, overriding

---

## T — TL;DR

`extends` sets up the prototype chain between classes. `super()` in the constructor calls the parent constructor and must be called before `this`. `super.method()` calls a parent method. Overriding replaces a parent method in the subclass — call `super.method()` to augment rather than replace.

---

## K — Key Concepts

```javascript
// ── Basic inheritance ─────────────────────────────────────────────────────
class Animal {
  constructor(name, sound) {
    this.name  = name
    this.sound = sound
  }
  speak() { return `${this.name} says ${this.sound}` }
  toString() { return `[${this.constructor.name}: ${this.name}]` }
}

class Dog extends Animal {
  constructor(name) {
    super(name, 'woof')   // ← must call super() before accessing this
    this.tricks = []
  }

  learn(trick) {
    this.tricks.push(trick)
    return this
  }

  // Override parent method
  speak() {
    return `${super.speak()} (excitedly)`   // augment parent
  }
}

const rex = new Dog('Rex')
rex.learn('sit').learn('stay')
rex.speak()   // 'Rex says woof (excitedly)'
`${rex}`      // '[Dog: Rex]'

rex instanceof Dog     // true
rex instanceof Animal  // true — prototype chain includes Animal.prototype
```

```javascript
// ── super in methods ──────────────────────────────────────────────────────
class Shape {
  constructor(color) { this.color = color }
  area() { return 0 }
  describe() { return `A ${this.color} shape with area ${this.area().toFixed(2)}` }
}

class Circle extends Shape {
  constructor(color, radius) {
    super(color)             // calls Shape constructor
    this.radius = radius
  }
  area() { return Math.PI * this.radius ** 2 }   // overrides parent
  // describe() inherited — calls THIS.area() (polymorphism) ✅
}

class Rectangle extends Shape {
  constructor(color, w, h) {
    super(color)
    this.width = w; this.height = h
  }
  area() { return this.width * this.height }
}

const c = new Circle('red', 5)
const r = new Rectangle('blue', 4, 6)
c.describe()   // 'A red shape with area 78.54'
r.describe()   // 'A blue shape with area 24.00'
```

```javascript
// ── Static inheritance ────────────────────────────────────────────────────
class Base {
  static create(...args) { return new this(...args) }   // 'this' = the class
}

class Derived extends Base {
  constructor(x) { super(); this.x = x }
}

const d = Derived.create(42)   // calls new Derived(42) ✅
d instanceof Derived           // true
d.x                            // 42

// ── abstract-like pattern (JS has no true abstract) ────────────────────────
class AbstractRepository {
  findById(id)    { throw new Error(`${this.constructor.name}.findById not implemented`) }
  save(entity)    { throw new Error(`${this.constructor.name}.save not implemented`) }
}

class UserRepository extends AbstractRepository {
  #users = new Map()
  findById(id)    { return this.#users.get(id) ?? null }
  save(user)      { this.#users.set(user.id, user); return user }
}
```

---

## W — Why It Matters

- `super()` must be called before `this` in a subclass constructor — the parent constructor sets up the object. Accessing `this` before `super()` throws `ReferenceError: Must call super constructor`. This is enforced by the engine.
- `super.method()` in an overriding method lets you augment rather than replace — adding logging, validation, or extra behaviour around a parent implementation without duplicating it.
- `this.constructor.name` in a parent method returns the actual subclass name — useful for error messages, logging, and factory patterns (`Base.create` returning the correct subclass).

---

## I — Interview Q&A

### Q: When must you call `super()` in a subclass constructor, and why?

**A:** You must call `super()` before accessing `this` in a subclass constructor. The parent class constructor is responsible for creating and initialising the object — in modern JS, the derived class constructor does not create the object itself. Until `super()` runs, `this` is uninitialized. If you try to access `this` before `super()`, JavaScript throws `ReferenceError: Must call super constructor in derived class before accessing 'this'`. You can omit the constructor entirely (the default one calls `super(...args)` automatically), but if you define a constructor in a subclass, `super()` is required.

---

## C — Common Pitfalls + Fix

### ❌ Forgetting `super()` before using `this`

```javascript
class Animal { constructor(name) { this.name = name } }

class Dog extends Animal {
  constructor(name, breed) {
    this.breed = breed   // ❌ ReferenceError: Must call super first
    super(name)
  }
}

// ✅ super() must come first
class Dog2 extends Animal {
  constructor(name, breed) {
    super(name)           // ✅ this is now available
    this.breed = breed
  }
}
```

---

## K — Coding Challenge + Solution

### Challenge

Build a `Vehicle → Car → ElectricCar` hierarchy. `Vehicle` has `make`, `model`, `speed`, and `accelerate(n)`. `Car` adds `doors` and overrides `toString`. `ElectricCar` adds `batteryLevel` and overrides `accelerate` to drain battery (1% per 10 km/h). Show polymorphism via an array of vehicles.

### Solution

```javascript
class Vehicle {
  constructor(make, model) { this.make = make; this.model = model; this.speed = 0 }
  accelerate(n)  { this.speed += n; return this }
  brake(n)       { this.speed = Math.max(0, this.speed - n); return this }
  toString()     { return `${this.make} ${this.model} @ ${this.speed}km/h` }
}

class Car extends Vehicle {
  constructor(make, model, doors = 4) {
    super(make, model)
    this.doors = doors
  }
  toString() { return `${super.toString()} (${this.doors}-door)` }
}

class ElectricCar extends Car {
  constructor(make, model, doors, battery = 100) {
    super(make, model, doors)
    this.batteryLevel = battery
  }
  accelerate(n) {
    this.batteryLevel = Math.max(0, this.batteryLevel - n / 10)
    return super.accelerate(n)
  }
  toString() { return `${super.toString()} [Battery: ${this.batteryLevel.toFixed(0)}%]` }
}

const fleet = [
  new Vehicle('Kawasaki', 'Ninja'),
  new Car('Toyota', 'Camry'),
  new ElectricCar('Tesla', 'Model 3', 4, 100),
]

fleet.forEach(v => {
  v.accelerate(80)
  console.log(`${v}`)
})
// Kawasaki Ninja @ 80km/h
// Toyota Camry @ 80km/h (4-door)
// Tesla Model 3 @ 80km/h (4-door) [Battery: 92%]
```

---

---

# 5 — Getters/Setters, Public Fields, Private Fields, Private Methods

---

## T — TL;DR

**Public fields** declare instance properties with default values directly in the class body. **Private fields** (`#field`) are truly inaccessible outside the class — enforced by the engine. **Getters** (`get`) compute a value on access. **Setters** (`set`) validate/transform on assignment. **Private methods** (`#method`) are internal helpers.

---

## K — Key Concepts

```javascript
// ── Public fields ──────────────────────────────────────────────────────────
class User {
  // Public fields: initialised before constructor runs
  role    = 'user'          // default value
  active  = true
  score   = 0

  constructor(name, email) {
    this.name  = name
    this.email = email
  }
}
const u = new User('Mark', 'm@ex.com')
u.role    // 'user'  — own property ✅
```

```javascript
// ── Private fields (#) — truly private ────────────────────────────────────
class BankAccount {
  #balance       // private field declaration (required before use)
  #owner
  #transactionLog = []   // private with default

  constructor(owner, initialBalance = 0) {
    this.#owner   = owner
    this.#balance = initialBalance
  }

  // Public interface
  get balance() { return this.#balance }   // read-only public getter
  get owner()   { return this.#owner }

  deposit(amount) {
    this.#validate(amount)
    this.#balance += amount
    this.#log('deposit', amount)
    return this
  }

  withdraw(amount) {
    this.#validate(amount)
    if (amount > this.#balance) throw new Error('Insufficient funds')
    this.#balance -= amount
    this.#log('withdrawal', amount)
    return this
  }

  // Private method — internal helper
  #validate(amount) {
    if (typeof amount !== 'number' || amount <= 0) throw new Error('Invalid amount')
  }

  #log(type, amount) {
    this.#transactionLog.push({ type, amount, at: new Date() })
  }

  getHistory() { return [...this.#transactionLog] }
}

const acc = new BankAccount('Mark', 1000)
acc.deposit(500).withdraw(200)
acc.balance        // 1300 — via getter
acc.#balance       // SyntaxError — truly private, not accessible ✅
```

```javascript
// ── Getters and setters ────────────────────────────────────────────────────
class Temperature {
  #celsius

  constructor(celsius) { this.#celsius = celsius }

  get celsius()    { return this.#celsius }
  set celsius(v)   {
    if (typeof v !== 'number') throw new TypeError('Must be a number')
    this.#celsius = v
  }

  get fahrenheit() { return this.#celsius * 9/5 + 32 }
  set fahrenheit(v) { this.celsius = (v - 32) * 5/9 }

  get kelvin()     { return this.#celsius + 273.15 }
}

const t = new Temperature(25)
t.fahrenheit         // 77
t.fahrenheit = 32
t.celsius            // 0 — two-way conversion ✅
t.celsius = 'hot'    // TypeError: Must be a number ✅
```

---

## W — Why It Matters

- Private fields (`#`) are the first truly private properties in JavaScript — unlike the convention of `_privateField` (which is accessible), `#field` throws a `SyntaxError` outside the class. TypeScript's `private` keyword is compile-time only; `#` is runtime enforcement.
- Getters for computed properties that look like data fields (`user.fullName`, `temp.fahrenheit`) provide a clean API — callers access them like properties but they're computed. No need for `getFullName()` method.
- Declaring public fields at the top of the class body (before the constructor) serves as documentation — readers immediately see all the instance properties a class manages.

---

## I — Interview Q&A

### Q: What is the difference between TypeScript's `private` keyword and JavaScript's `#` private fields?

**A:** TypeScript's `private` is a compile-time access modifier — it prevents access to the property in TypeScript code, but the compiled JavaScript has a plain public property. At runtime, `instance._field` or `instance['field']` still works. JavaScript's `#` private fields are enforced by the JavaScript engine at runtime — accessing `instance.#field` outside the class throws a `SyntaxError`. It's not just convention or compile-time checking — it's genuine encapsulation. For production code that needs real privacy guarantees, use `#`. For TypeScript-only codebases where runtime access isn't a concern, `private` or `readonly` keywords may suffice.

---

## C — Common Pitfalls + Fix

### ❌ Using getter without a setter — silent failure on assignment

```javascript
class Circle {
  constructor(r) { this.radius = r }
  get area() { return Math.PI * this.radius ** 2 }
  // No setter for 'area'
}

const c = new Circle(5)
c.area = 100   // silently does nothing (strict mode throws TypeError)
c.area         // still 78.54 — assignment was ignored ❌

// ✅ If the property should be read-only, document it and use strict mode
// OR provide a meaningful setter
```

---

## K — Coding Challenge + Solution

### Challenge

Create a `Password` class with a private `#hash` field, a `set password(plain)` setter that hashes (simulate with `btoa`), a `verify(plain)` method, and a `get masked()` getter returning `'****'`. Show `#hash` is inaccessible from outside.

### Solution

```javascript
class Password {
  #hash = null

  set password(plain) {
    if (plain.length < 8) throw new Error('Password too short (min 8 chars)')
    this.#hash = btoa(plain + ':salt')   // simulated hash (use bcrypt in production)
  }

  verify(plain) {
    return this.#hash === btoa(plain + ':salt')
  }

  get masked() { return this.#hash ? '****' : '(not set)' }
  get isSet()  { return this.#hash !== null }
}

const pw = new Password()
pw.password = 'super$ecret'
console.log(pw.masked)           // '****'
console.log(pw.verify('super$ecret'))   // true
console.log(pw.verify('wrong'))         // false
try { pw.#hash }
catch (e) { console.log(e.constructor.name) }  // SyntaxError ✅
```

---

---

# 6 — Mixins and Classes vs Factory Functions vs Plain Objects

---

## T — TL;DR

JavaScript has no multiple inheritance — **mixins** compose behaviour from multiple sources by copying methods. Know when to choose **classes** (many instances, hierarchy, familiar OOP), **factory functions** (true privacy, no `this`, composable), or **plain objects** (simple data, no methods). There's no single right answer — know the trade-offs.

---

## K — Key Concepts

```javascript
// ── Mixin pattern — compose behaviours ────────────────────────────────────
const Serializable = (Base) => class extends Base {
  toJSON() { return JSON.stringify(this) }
  static fromJSON(json) { return Object.assign(new this(), JSON.parse(json)) }
}

const Validatable = (Base) => class extends Base {
  validate() {
    for (const [key, rule] of Object.entries(this.constructor.rules ?? {})) {
      if (!rule(this[key])) throw new Error(`Validation failed for ${key}`)
    }
    return true
  }
}

const Timestamped = (Base) => class extends Base {
  constructor(...args) {
    super(...args)
    this.createdAt = new Date()
    this.updatedAt = new Date()
  }
  touch() { this.updatedAt = new Date(); return this }
}

// Compose mixins — order matters (right-to-left application)
class Entity {
  constructor(id) { this.id = id }
}

class User extends Serializable(Validatable(Timestamped(Entity))) {
  static rules = {
    name:  v => typeof v === 'string' && v.length > 0,
    email: v => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v),
  }

  constructor(id, name, email) {
    super(id)
    this.name  = name
    this.email = email
  }
}

const user = new User(1, 'Mark', 'mark@ex.com')
user.validate()   // true ✅
user.toJSON()     // JSON string with all properties ✅
user.createdAt    // Date ✅
```

```javascript
// ── Comparison table ──────────────────────────────────────────────────────
/*
                   Class         Factory Fn      Plain Object
Prototype sharing  ✅ (memory)   ❌ (per inst)   N/A (no instances)
True private state ✅ (#fields)  ✅ (closure)    ❌
this binding       Required      Not needed      Per method call
new required       Yes           No              No
instanceof works   ✅            ❌ (usually)    N/A
Multiple inherit   ❌ (mixins)   ✅ (compose)    ✅ (spread/assign)
Familiar to OOP    ✅            ❌              ❌
Overridable        ✅ extends    Closure wrapping Spread override
*/

// ── Factory with composition (alternative to mixins) ─────────────────────
const withLogging = (obj) => ({
  ...obj,
  _log: [],
  log(msg) { this._log.push({ msg, at: new Date() }); return this },
})

const withValidation = (obj) => ({
  ...obj,
  validate(rules) {
    for (const [k, fn] of Object.entries(rules)) {
      if (!fn(this[k])) throw new Error(`Invalid ${k}`)
    }
    return true
  },
})

const createUser = (name, email) =>
  withLogging(withValidation({ name, email }))

const u = createUser('Mark', 'mark@ex.com')
u.validate({ name: v => v.length > 0, email: v => v.includes('@') })  // true ✅
u.log('User created')
```

---

## W — Why It Matters

- Mixins are how JavaScript achieves composition over inheritance — instead of a deep class hierarchy, you combine small, focused behaviours. This is the functional alternative to extending multiple abstract base classes.
- Choosing factory functions over classes eliminates entire categories of `this`-binding bugs — if `this` never exists, it can never be lost. React moved from class components to hooks for exactly this reason.
- The mixin pattern with `(Base) => class extends Base` preserves the prototype chain — `instanceof` still works and the class integrates with TypeScript's type system cleanly.

---

## I — Interview Q&A

### Q: When would you choose a factory function over a class?

**A:** Factory functions are preferable when: (1) you need true private state without `#` syntax (closure privacy works in older environments), (2) you want to avoid `this` binding issues entirely — factory methods return plain objects with no `this` in closures, (3) you want to compose behaviours from multiple sources without mixin complexity, (4) you're building a small number of instances where prototype memory sharing doesn't matter, (5) the code will be used in contexts where `new` is a footgun (async factories, plugin systems). Classes are better when creating many instances (shared prototype), when TypeScript class decorators/metadata matter, or when integrating with ORM/framework patterns expecting class instances.

---

## C — Common Pitfalls + Fix

### ❌ Mixin overwriting methods — order-dependent silent bugs

```javascript
// ❌ Both mixins define 'init' — last one wins silently
const A = (Base) => class extends Base { init() { console.log('A') } }
const B = (Base) => class extends Base { init() { console.log('B') } }

class C extends A(B(Object)) {}
new C().init()   // 'A' — B's init is silently overwritten ❌

// ✅ Call super in mixins to chain all overrides
const A2 = (Base) => class extends Base {
  init() { super.init?.(); console.log('A2') }
}
const B2 = (Base) => class extends Base {
  init() { super.init?.(); console.log('B2') }
}
class C2 extends A2(B2(Object)) {}
new C2().init()   // 'B2', 'A2' — both run ✅
```

---

## K — Coding Challenge + Solution

### Challenge

Create two behaviour mixins: `Persistable` (adds `save()` returning a JSON snapshot and `static load(json)`) and `Observable` (adds `onChange(fn)` callback and `set(key, value)` that notifies observers). Compose them into a `Profile` class.

### Solution

```javascript
const Persistable = (Base) => class extends Base {
  save() { return JSON.stringify(this) }
  static load(json) { return Object.assign(new this(), JSON.parse(json)) }
}

const Observable = (Base) => class extends Base {
  #listeners = []
  onChange(fn) { this.#listeners.push(fn); return this }
  set(key, value) {
    const prev = this[key]
    this[key] = value
    this.#listeners.forEach(fn => fn({ key, prev, next: value }))
    return this
  }
}

class Profile extends Persistable(Observable(class {
  constructor(name = '', bio = '') { this.name = name; this.bio = bio }
})) {}

const p = new Profile('Mark', 'Developer')
p.onChange(e => console.log(`Changed ${e.key}: ${e.prev} → ${e.next}`))
p.set('bio', 'Senior Developer')   // Changed bio: Developer → Senior Developer
const snap = p.save()
const loaded = Profile.load(snap)
console.log(loaded.name)   // 'Mark' ✅
```

---

---

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

# 9 — Symbol — Creation, Symbol.for, Registry, Unique Keys

---

## T — TL;DR

`Symbol` creates a **unique, immutable primitive** value — no two Symbols are ever equal. Use them as unique property keys that won't collide with string keys or other code. `Symbol.for(key)` creates/retrieves a **global registry Symbol** — same key always returns the same Symbol across modules and iframes.

---

## K — Key Concepts

```javascript
// ── Symbol basics ─────────────────────────────────────────────────────────
const s1 = Symbol('description')  // optional description (for debugging)
const s2 = Symbol('description')

s1 === s2          // false — every Symbol() call is unique
typeof s1          // 'symbol'
s1.toString()      // 'Symbol(description)'
s1.description     // 'description' (ES2019)

// Cannot be implicitly converted to string — prevents accidental misuse
// `${s1}`          // TypeError: Cannot convert Symbol to string
// s1 + ''          // TypeError
String(s1)         // 'Symbol(description)'  ✅ explicit is fine
```

```javascript
// ── Symbols as property keys ───────────────────────────────────────────────
const ID     = Symbol('id')
const SECRET = Symbol('secret')

const user = {
  name: 'Mark',
  [ID]: 1001,            // symbol key — not visible in Object.keys
  [SECRET]: 'token123',  // symbol key
}

user[ID]       // 1001
user[SECRET]   // 'token123'

Object.keys(user)             // ['name']          — symbols hidden ✅
Object.values(user)           // ['Mark']
JSON.stringify(user)          // '{"name":"Mark"}' — symbols excluded ✅

// Retrieve symbols explicitly
Object.getOwnPropertySymbols(user)   // [Symbol(id), Symbol(secret)]
Reflect.ownKeys(user)                // ['name', Symbol(id), Symbol(secret)]

// Use case: hide internal properties without true privacy
class EventBus {
  static listeners = Symbol('listeners')
}
```

```javascript
// ── Symbol.for — global registry ──────────────────────────────────────────
// Problem: two separate modules get different Symbols for the same concept
const a = Symbol('LOG_LEVEL')   // module A
const b = Symbol('LOG_LEVEL')   // module B
a === b   // false — different symbols, can't share ❌

// Solution: Symbol.for uses a global registry
const c = Symbol.for('app.LOG_LEVEL')   // module A
const d = Symbol.for('app.LOG_LEVEL')   // module B
c === d   // true ✅ — same symbol across modules

Symbol.keyFor(c)   // 'app.LOG_LEVEL' — reverse lookup ✅
Symbol.keyFor(Symbol('local'))  // undefined — local symbols not in registry

// Convention: use namespaced keys to avoid collisions
const MY_APP = {
  USER_ID: Symbol.for('myapp.userId'),
  ROLE:    Symbol.for('myapp.role'),
}
```

```javascript
// ── Practical: metadata without collision ─────────────────────────────────
const META = Symbol('meta')
const CACHE = Symbol('cache')

function addMeta(obj, data) {
  obj[META] = data
  return obj
}

function getCached(fn) {
  return function(...args) {
    if (!fn[CACHE]) fn[CACHE] = new Map()
    const key = JSON.stringify(args)
    if (!fn[CACHE].has(key)) fn[CACHE].set(key, fn(...args))
    return fn[CACHE].get(key)
  }
}

const user = addMeta({ name: 'Mark' }, { source: 'db', fetchedAt: Date.now() })
user[META]          // { source: 'db', fetchedAt: ... }
Object.keys(user)   // ['name'] — meta hidden ✅
```

---

## W — Why It Matters

- Symbol keys don't appear in `Object.keys`, `for...in`, or `JSON.stringify` — this is intentional, not a limitation. It enables attaching metadata to objects without polluting their enumerable properties.
- `Symbol.for` solves the "same concept across modules" problem — two independent packages can agree on a Symbol key without sharing a module if they use the same `Symbol.for` string.
- The description parameter is purely for debugging — `Symbol('userId')` prints as `Symbol(userId)` in consoles and stack traces. It has zero effect on uniqueness or behaviour.

---

## I — Interview Q&A

### Q: What is the difference between `Symbol()` and `Symbol.for()`?

**A:** `Symbol()` creates a brand new unique symbol every time it's called — even with the same description, two calls produce different symbols (`Symbol('x') !== Symbol('x')`). `Symbol.for(key)` looks up the global symbol registry first — if a symbol with that key exists, it returns it; otherwise it creates and registers a new one. `Symbol.for('x') === Symbol.for('x')` is `true`. Use `Symbol()` for unique keys local to a module. Use `Symbol.for()` when multiple modules or packages need to share the same symbol — like a shared protocol or extension point.

---

## C — Common Pitfalls + Fix

### ❌ Trying to use Symbol in template literal — silent TypeError

```javascript
const id = Symbol('id')
// ❌ TypeError in strict mode, silent failure elsewhere
const msg = `User ${id}`   // TypeError: Cannot convert Symbol value to string

// ✅ Explicit conversion
const msg2 = `User ${id.toString()}`      // 'User Symbol(id)'
const msg3 = `User ${id.description}`    // 'User id'
const msg4 = `User ${String(id)}`        // 'User Symbol(id)'
```

---

## K — Coding Challenge + Solution

### Challenge

Create a `withId` function that attaches a unique auto-incrementing Symbol-keyed `id` to any object. The `id` should be hidden from `Object.keys` and `JSON.stringify`. Provide a `getId(obj)` function to retrieve it.

### Solution

```javascript
const ID_KEY = Symbol('id')
let nextId = 1

function withId(obj) {
  return Object.defineProperty(obj, ID_KEY, {
    value:        nextId++,
    writable:     false,
    enumerable:   false,   // hidden from Object.keys ✅
    configurable: false,
  })
}

const getId = (obj) => obj[ID_KEY]

const a = withId({ name: 'Alice' })
const b = withId({ name: 'Bob' })

console.log(getId(a))            // 1
console.log(getId(b))            // 2
console.log(Object.keys(a))      // ['name']       — id hidden ✅
console.log(JSON.stringify(a))   // '{"name":"Alice"}' — id excluded ✅
getId(a) !== getId(b)            // true — unique ✅
```

---

---

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