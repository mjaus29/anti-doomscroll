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
