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
