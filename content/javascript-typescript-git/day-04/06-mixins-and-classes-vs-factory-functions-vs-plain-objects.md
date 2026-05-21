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
