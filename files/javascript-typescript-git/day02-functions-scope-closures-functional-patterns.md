
# 📅 Day 2 — Functions, Scope, Closures & Functional Patterns

> **Goal:** Master how JavaScript functions work at every level — declaration, scope, closure, `this`, and the functional patterns used daily in modern codebases.
> **Format:** Each subtopic = 5–15 min. Do one. Stop. Come back.
> **Stack:** Node.js 22 · TypeScript 6 (context) · Vanilla JS

---

## 📋 Day 2 Subtopic Overview

| # | Subtopic | Time |
|---|----------|------|
| 1 | Function Declarations, Expressions, Arrow Functions | 10 min |
| 2 | Parameters — Default, Rest, Arguments Object | 10 min |
| 3 | Lexical Scope and Scope Chain | 10 min |
| 4 | Closures and Private State | 12 min |
| 5 | Factory Functions, Module Pattern, IIFE | 10 min |
| 6 | Recursion — Base Case, Call Stack, Memoization | 12 min |
| 7 | Higher-Order Functions and Pure Functions | 12 min |
| 8 | `this` in All Contexts — call, apply, bind | 12 min |
| 9 | Composition, Pipe, Currying, Partial Application | 12 min |
| 10 | Memoization, Debounce, Throttle | 12 min |

---

---

# 1 — Function Declarations, Expressions, Arrow Functions

---

## T — TL;DR

JavaScript has three main ways to define a function. **Declarations** are hoisted fully (callable before their line). **Expressions** are not hoisted. **Arrow functions** are expressions with no own `this`, `arguments`, or `prototype` — ideal for callbacks. Know which to use and why.

---

## K — Key Concepts

```javascript
// ── Function Declaration — hoisted fully ─────────────────────────────────
greet('Mark')    // ✅ works before declaration — fully hoisted
function greet(name) {
  return `Hello, ${name}!`
}

// ── Function Expression — not hoisted ─────────────────────────────────────
// greet2('Mark')  // ❌ TypeError: greet2 is not a function
const greet2 = function(name) {
  return `Hello, ${name}!`
}

// Named function expression — name is local to the function body
const factorial = function fact(n) {
  return n <= 1 ? 1 : n * fact(n - 1)  // can use 'fact' inside ✅
}
// fact(5)  // ❌ ReferenceError outside

// ── Arrow Functions ────────────────────────────────────────────────────────
const add = (a, b) => a + b               // implicit return (single expression)
const double = n => n * 2                 // single param, no parens needed
const noop = () => {}                     // no params, empty body
const makeObj = (x) => ({ value: x })    // return object: wrap in ()

// Block body needs explicit return
const addVerbose = (a, b) => {
  const sum = a + b
  return sum
}
```

```javascript
// ── Key differences: arrow vs regular ────────────────────────────────────

// 1. Arrow functions have NO own `this`
const obj = {
  name: 'Mark',
  greetRegular: function() { return `Hi, ${this.name}` },  // this = obj ✅
  greetArrow:   () => `Hi, ${this.name}`,                  // this = outer scope ❌
}
obj.greetRegular()  // 'Hi, Mark'
obj.greetArrow()    // 'Hi, undefined' — no own this

// 2. Arrow functions have no `arguments` object
function regular() {
  console.log(arguments)   // Arguments [1, 2, 3]
}
const arrow = () => {
  // console.log(arguments)   // ReferenceError — no arguments in arrow
}

// 3. Arrow functions cannot be used as constructors
// new (() => {})()   // TypeError: not a constructor

// 4. Arrow functions have no prototype
const arr = () => {}
console.log(arr.prototype)   // undefined

// ── When to use which ─────────────────────────────────────────────────────
// Arrow:    callbacks, array methods, short one-liners, preserving outer this
// Regular:  methods on objects, constructors, when you need `this` or `arguments`
// Declaration: top-level utility functions (benefit of hoisting)
```

---

## W — Why It Matters

- Arrow functions dominate modern JavaScript callbacks — `.map(x => x * 2)`, `.filter(x => x > 0)`. Understanding they have no own `this` explains why class methods should not be arrow functions but event handler callbacks often should be.
- Function hoisting is why you can call a utility function at the top of a file before it's declared — declarations hoist, expressions don't. This determines code organisation patterns.
- The implicit return in arrow functions reduces boilerplate massively — `const double = n => n * 2` vs five lines for the same function.

---

## I — Interview Q&A

### Q: What are the key differences between arrow functions and regular functions?

**A:** Four differences: (1) `this` — arrow functions capture `this` from the enclosing lexical scope and have no own `this`; regular functions get `this` from how they're called. (2) `arguments` — arrow functions have no `arguments` object; use rest parameters (`...args`) instead. (3) Constructor — arrow functions cannot be used with `new`; they have no `prototype`. (4) Hoisting — arrow functions assigned to `const`/`let` are not hoisted; function declarations are fully hoisted. Use arrow functions for callbacks and short utilities; use regular functions for object methods and constructors.

---

## C — Common Pitfalls + Fix

### ❌ Using arrow function as an object method — `this` is wrong

```javascript
// ❌ Arrow captures outer 'this' (global/undefined in strict mode)
const counter = {
  count: 0,
  increment: () => { this.count++ }  // this ≠ counter ❌
}
counter.increment()
console.log(counter.count)   // still 0

// ✅ Regular function — this = the calling object
const counter2 = {
  count: 0,
  increment() { this.count++ }   // shorthand method ✅
}
counter2.increment()
console.log(counter2.count)  // 1
```

---

## K — Coding Challenge + Solution

### Challenge

Write three versions of a `multiply(a, b)` function: a declaration, an expression, and an arrow function. Then write a `makeMultiplier(factor)` that returns an arrow function multiplying its argument by `factor`.

### Solution

```javascript
// Declaration
function multiply(a, b) { return a * b }

// Expression
const multiplyExpr = function(a, b) { return a * b }

// Arrow
const multiplyArrow = (a, b) => a * b

// Factory returning arrow
const makeMultiplier = factor => n => n * factor

const triple = makeMultiplier(3)
console.log(triple(5))   // 15
console.log(triple(10))  // 30
```

---

---

# 2 — Parameters — Default, Rest, Arguments Object

---

## T — TL;DR

JavaScript functions accept any number of arguments regardless of the declared parameter count. **Default parameters** provide fallback values. **Rest parameters** (`...args`) collect remaining arguments into a real array. The legacy `arguments` object is array-like but not a real array — prefer rest parameters in modern code.

---

## K — Key Concepts

```javascript
// ── Default parameters ────────────────────────────────────────────────────
function greet(name, greeting = 'Hello') {
  return `${greeting}, ${name}!`
}
greet('Mark')             // 'Hello, Mark!'
greet('Mark', 'Hi')       // 'Hi, Mark!'
greet('Mark', undefined)  // 'Hello, Mark!' — undefined triggers default
greet('Mark', null)       // 'null, Mark!' — null does NOT trigger default

// Default can be any expression, including function calls
function createId(prefix, id = Date.now()) {
  return `${prefix}-${id}`
}

// ── Rest parameters — collect remaining args into an array ────────────────
function sum(...nums) {
  return nums.reduce((acc, n) => acc + n, 0)
}
sum(1, 2, 3)      // 6
sum(1, 2, 3, 4)   // 10

// Rest must be the LAST parameter
function log(level, ...messages) {
  console.log(`[${level}]`, ...messages)
}
log('INFO', 'Server started', 'on port 3000')
// [INFO] Server started on port 3000

// ❌ Rest must be last
// function bad(...a, b) {}  // SyntaxError
```

```javascript
// ── Arguments object (legacy) ─────────────────────────────────────────────
function sumLegacy() {
  // arguments is array-LIKE: has length and indices, but no .map/.filter
  let total = 0
  for (let i = 0; i < arguments.length; i++) {
    total += arguments[i]
  }
  return total
}
sumLegacy(1, 2, 3)   // 6

// Convert to real array (legacy approaches)
const arr1 = Array.from(arguments)
const arr2 = Array.prototype.slice.call(arguments)
const arr3 = [...arguments]   // spread ✅

// ❌ arguments is NOT available in arrow functions
const arrowArgs = () => {
  // console.log(arguments)  // ReferenceError
}

// ✅ Use rest parameters in all modern code
const modern = (...args) => args.reduce((a, b) => a + b, 0)
```

```javascript
// ── Destructuring in parameters ───────────────────────────────────────────
// Object destructuring
function createUser({ name, email, role = 'user' }) {
  return { name, email, role }
}
createUser({ name: 'Mark', email: 'mark@example.com' })
// { name: 'Mark', email: 'mark@example.com', role: 'user' }

// Array destructuring
function getFirstTwo([first, second]) {
  return { first, second }
}
getFirstTwo([10, 20, 30])   // { first: 10, second: 20 }

// Combined: default + destructuring
function connect({ host = 'localhost', port = 5432 } = {}) {
  return `${host}:${port}`
}
connect()                         // 'localhost:5432'
connect({ port: 3306 })           // 'localhost:3306'
connect({ host: 'db', port: 5432 })  // 'db:5432'
```

---

## W — Why It Matters

- Default parameters replace the old `name = name || 'default'` pattern — but `||` fails for falsy values (0, false, ''). Default parameters only trigger on `undefined`, which is the correct semantic.
- Rest parameters return a real Array with all methods (`.map`, `.filter`, `.reduce`) — `arguments` is not a real array and caused many bugs in pre-ES6 code. Never use `arguments` in new code.
- Destructuring in parameters is the standard pattern for option objects (config objects, React props) — it makes parameter names explicit at the call site and provides defaults cleanly.

---

## I — Interview Q&A

### Q: What is the difference between rest parameters and the `arguments` object?

**A:** Rest parameters (`...args`) create a real `Array` containing only the extra arguments beyond named parameters. The `arguments` object is an array-like object (has `length` and indexed access but no array methods) containing ALL arguments including named ones. Rest parameters work in arrow functions; `arguments` does not. Rest parameters can be at any position as long as they're last; `arguments` captures everything. Modern code should always use rest parameters — they're explicit, array-method-compatible, and work everywhere.

---

## C — Common Pitfalls + Fix

### ❌ Using `||` for default parameters — fails for falsy values

```javascript
// ❌ 0 and '' are valid values but || replaces them
function setVolume(level) {
  level = level || 50   // if level = 0, becomes 50 ❌
}
setVolume(0)   // sets to 50 — wrong!

// ✅ Default parameter — triggers only on undefined
function setVolume(level = 50) {
  return level
}
setVolume(0)          // 0 ✅
setVolume()           // 50 ✅
setVolume(undefined)  // 50 ✅
setVolume(null)       // null ← null doesn't trigger default
```

---

## K — Coding Challenge + Solution

### Challenge

Write a `buildQuery({ table, conditions = [], limit = 10, offset = 0 } = {})` function that builds a SQL SELECT string. Use default parameters and rest. If no conditions, omit the WHERE clause.

### Solution

```javascript
function buildQuery({ table, conditions = [], limit = 10, offset = 0 } = {}) {
  if (!table) throw new Error('table is required')

  const where  = conditions.length > 0
    ? ` WHERE ${conditions.join(' AND ')}`
    : ''

  return `SELECT * FROM ${table}${where} LIMIT ${limit} OFFSET ${offset}`
}

console.log(buildQuery({ table: 'users' }))
// SELECT * FROM users LIMIT 10 OFFSET 0

console.log(buildQuery({ table: 'orders', conditions: ['status = \'pending\'', 'total > 100'], limit: 5 }))
// SELECT * FROM orders WHERE status = 'pending' AND total > 100 LIMIT 5 OFFSET 0
```

---

---

# 3 — Lexical Scope and Scope Chain

---

## T — TL;DR

**Lexical scope** means a function's scope is determined by where it is written in the code, not where it is called from. Variables are looked up by walking the **scope chain** — inner scope first, then each enclosing scope, up to global. This is the foundation of closures.

---

## K — Key Concepts

```javascript
// ── Scope chain — lookup walks outward ───────────────────────────────────
const globalVar = 'global'

function outer() {
  const outerVar = 'outer'

  function inner() {
    const innerVar = 'inner'
    // Scope chain: inner → outer → global
    console.log(innerVar)   // 'inner'  — found in own scope
    console.log(outerVar)   // 'outer'  — found in outer scope
    console.log(globalVar)  // 'global' — found in global scope
  }

  inner()
  // console.log(innerVar)  // ❌ ReferenceError — inner is not visible here
}
outer()
```

```javascript
// ── Lexical (static) scope — scope is where you WRITE the function ────────
const x = 'global x'

function outer() {
  const x = 'outer x'
  return function inner() {
    return x   // captures 'outer x' — from where inner was WRITTEN
  }
}

const fn = outer()
fn()   // 'outer x'  — NOT 'global x'
       // inner was written inside outer, so it sees outer's x

// Contrast: if JS used dynamic scope (it doesn't), calling fn() from global
// would see 'global x'. Lexical scope is predictable — always from definition site.
```

```javascript
// ── Variable shadowing ────────────────────────────────────────────────────
const name = 'global'

function greet() {
  const name = 'local'   // shadows the outer 'name'
  console.log(name)      // 'local' — inner scope wins
}

greet()              // 'local'
console.log(name)   // 'global' — outer unaffected
```

```javascript
// ── Block scope with let/const ────────────────────────────────────────────
{
  const blockVar = 'inside block'
  console.log(blockVar)  // 'inside block'
}
// console.log(blockVar)  // ❌ ReferenceError — block scope

// if/for/while blocks are also scopes with let/const
for (let i = 0; i < 3; i++) {
  const msg = `step ${i}`   // new binding each iteration
}
// console.log(i)    // ReferenceError
// console.log(msg)  // ReferenceError

// ── Function scope vs block scope recap ──────────────────────────────────
function test() {
  if (true) {
    var   funcScoped = 'var'     // function scope — leaks to test()
    let   blockScoped = 'let'    // block scope — stays in if
    const alsoBlock  = 'const'  // block scope — stays in if
  }
  console.log(funcScoped)   // 'var'  ✅ (leaked)
  // console.log(blockScoped)  // ReferenceError
}
```

---

## W — Why It Matters

- Lexical scope is what makes closures predictable — you can always determine what a function will close over by reading the code, regardless of when or where it's called. This is the basis for modules, private state, and most functional patterns.
- Scope chain lookup walks outward but never inward — inner functions can read outer variables, but outer code cannot access inner variables. This asymmetry is what enables information hiding and encapsulation.
- Variable shadowing is a common source of bugs — an inner `let x` silently hides an outer `x`. TypeScript's `no-shadow` ESLint rule catches this in codebases where it matters.

---

## I — Interview Q&A

### Q: What is the scope chain and how does JavaScript use it to resolve variables?

**A:** The scope chain is the ordered list of scopes that JavaScript searches when resolving a variable name. Starting from the innermost (current) scope, if the variable isn't found, JavaScript moves to the enclosing scope, then its enclosing scope, continuing outward until global scope. If the variable still isn't found, it's a `ReferenceError`. The chain is determined lexically — by where functions are written in the source code, not by where they're called. Each function creates a new scope; blocks (`{}`) create scopes for `let`/`const` but not for `var`.

---

## C — Common Pitfalls + Fix

### ❌ Accidentally accessing a global instead of a local due to a typo

```javascript
let userName = 'Mark'

function updateUser() {
  // ❌ Typo: 'usrName' doesn't exist locally, walks up to... nothing → ReferenceError
  // Or worse: if 'usrName' happened to exist globally, silently reads wrong value
  usrName = 'Alex'   // if not declared locally, creates/modifies global!
}

// ✅ Declare variables explicitly, use strict mode
'use strict'
function updateUser() {
  userName = 'Alex'   // now refers to the outer let userName ✅
}
```

---

## K — Coding Challenge + Solution

### Challenge

Predict the output of this code. Explain why each `console.log` prints what it does.

```javascript
const x = 1
function a() {
  const x = 2
  function b() {
    const x = 3
    console.log(x)   // (1)
  }
  b()
  console.log(x)     // (2)
}
a()
console.log(x)       // (3)
function c() {
  console.log(x)     // (4)
}
c()
```

### Solution

```javascript
// (1) → 3  — b() sees its own const x = 3
// (2) → 2  — a() sees its own const x = 2; b's x is not visible here
// (3) → 1  — global scope sees const x = 1
// (4) → 1  — c() has no local x, walks up to global x = 1
//            (c is defined at global level, so its parent scope is global)
//            c is CALLED after a() runs, but its scope is still global (lexical)
```

---

---

# 4 — Closures and Private State

---

## T — TL;DR

A **closure** is a function that retains access to its enclosing scope's variables even after the outer function has returned. This is JavaScript's primary mechanism for **private state** — variables that only the returned function(s) can read and modify. Closures are everywhere: callbacks, event handlers, factory functions, module pattern.

---

## K — Key Concepts

```javascript
// ── Closure basics ─────────────────────────────────────────────────────────
function makeCounter() {
  let count = 0        // private — not accessible outside makeCounter

  return {
    increment() { count++ },
    decrement() { count-- },
    getCount()  { return count },
  }
}

const counter = makeCounter()
counter.increment()
counter.increment()
counter.increment()
console.log(counter.getCount())  // 3
// count is NOT accessible:
// counter.count  // undefined — it's not a property of the returned object
```

```javascript
// ── Each call creates a fresh closure ─────────────────────────────────────
const c1 = makeCounter()
const c2 = makeCounter()

c1.increment()
c1.increment()
c2.increment()

console.log(c1.getCount())   // 2 — c1's count
console.log(c2.getCount())   // 1 — c2's count (completely independent)
```

```javascript
// ── Closure over a loop variable ──────────────────────────────────────────
// ❌ var — all closures share the same i (classic bug)
const fnsVar = []
for (var i = 0; i < 3; i++) {
  fnsVar.push(() => i)
}
fnsVar[0]()  // 3 — i is 3 after loop ends
fnsVar[1]()  // 3
fnsVar[2]()  // 3

// ✅ let — each iteration creates a new binding
const fnsLet = []
for (let i = 0; i < 3; i++) {
  fnsLet.push(() => i)
}
fnsLet[0]()  // 0 ✅
fnsLet[1]()  // 1 ✅
fnsLet[2]()  // 2 ✅
```

```javascript
// ── Practical closure: private state + privilege methods ──────────────────
function createBankAccount(initialBalance) {
  let balance = initialBalance  // private

  function validate(amount) {
    if (amount <= 0) throw new Error('Amount must be positive')
  }

  return {
    deposit(amount) {
      validate(amount)
      balance += amount
      return balance
    },
    withdraw(amount) {
      validate(amount)
      if (amount > balance) throw new Error('Insufficient funds')
      balance -= amount
      return balance
    },
    getBalance() {
      return balance
    },
  }
}

const account = createBankAccount(100)
account.deposit(50)        // 150
account.withdraw(30)       // 120
console.log(account.getBalance())  // 120
// account.balance  // undefined — fully private ✅
```

```javascript
// ── Closure for function customisation ────────────────────────────────────
function makeMultiplier(factor) {
  return (n) => n * factor   // closes over 'factor'
}
const double = makeMultiplier(2)
const triple = makeMultiplier(3)

double(5)   // 10
triple(5)   // 15

// Closure over config
function createLogger(prefix) {
  return (message) => console.log(`[${prefix}] ${message}`)
}
const dbLog  = createLogger('DB')
const apiLog = createLogger('API')
dbLog('Query executed')    // [DB] Query executed
apiLog('Request received') // [API] Request received
```

---

## W — Why It Matters

- Closures are the foundation of private state without classes — the enclosed variables are truly inaccessible from outside; they can only be observed through the returned functions. This is real encapsulation, not convention-based (`_privateVar`).
- Understanding closures explains why callback-heavy code "works" — event listeners and async callbacks can still access variables from their defining scope long after the outer function returns.
- Memory: closures keep the enclosing scope alive — if you accidentally create many closures over large objects in a loop, memory usage grows. This is one of the most common JS memory leak patterns.

---

## I — Interview Q&A

### Q: What is a closure and give a practical example?

**A:** A closure is a function combined with the lexical environment in which it was created. Even after the outer function returns, the inner function retains a reference to the variables in the outer scope. Practical example: a rate limiter that counts calls:

```javascript
function makeRateLimiter(maxCalls) {
  let calls = 0         // private — only accessible via the returned function
  return function(fn) {
    if (calls >= maxCalls) {
      console.warn('Rate limit exceeded')
      return
    }
    calls++
    fn()
  }
}
const limited = makeRateLimiter(3)
limited(() => console.log('call'))  // call (1)
limited(() => console.log('call'))  // call (2)
limited(() => console.log('call'))  // call (3)
limited(() => console.log('call'))  // Rate limit exceeded
```

---

## C — Common Pitfalls + Fix

### ❌ Stale closure — reading a variable that has since changed

```javascript
// ❌ Closure captures the variable, not its value at creation time
let message = 'hello'
const getMsg = () => message

message = 'world'
getMsg()   // 'world' — captures the binding, not the snapshot

// This is by design — but can surprise when mutating state
// ✅ If you need the snapshot, copy the value explicitly
const snapshot = message
const getSnapshot = () => snapshot  // always 'world' (at capture time)
```

---

## K — Coding Challenge + Solution

### Challenge

Implement a `createStack()` factory that returns `push(item)`, `pop()`, `peek()`, and `size()`. The internal array must be private — not accessible as a property.

### Solution

```javascript
function createStack() {
  const items = []    // private — accessible only via the returned methods

  return {
    push(item)  { items.push(item) },
    pop()       { return items.pop() },
    peek()      { return items[items.length - 1] },
    size()      { return items.length },
    isEmpty()   { return items.length === 0 },
  }
}

const stack = createStack()
stack.push(1); stack.push(2); stack.push(3)
console.log(stack.peek())   // 3
console.log(stack.pop())    // 3
console.log(stack.size())   // 2
console.log(stack.items)    // undefined — private ✅
```

---

---

# 5 — Factory Functions, Module Pattern, IIFE

---

## T — TL;DR

**Factory functions** return objects with private state via closures — a class alternative without `new` or `this`. The **module pattern** uses a closure to export a public API while keeping internals private. **IIFE** (Immediately Invoked Function Expression) executes a function immediately — used to create an isolated scope, run async code at the top level, or initialise a module.

---

## K — Key Concepts

```javascript
// ── Factory function ──────────────────────────────────────────────────────
function createUser(name, email) {
  // private
  let loginCount = 0

  // public API
  return {
    getName()  { return name },
    getEmail() { return email },
    login()    { loginCount++ },
    getStats() { return { name, loginCount } },
  }
}

const user = createUser('Mark', 'mark@example.com')
user.login(); user.login()
user.getStats()   // { name: 'Mark', loginCount: 2 }
user.loginCount   // undefined — private ✅

// ── Factory vs class ──────────────────────────────────────────────────────
// Factory: no `new`, no `this` binding issues, true private state via closure
// Class:   prototype sharing (memory efficient for many instances), familiar to OOP devs
```

```javascript
// ── Module pattern — IIFE + closure = encapsulated module ─────────────────
const userService = (function() {
  // private
  const users = []
  let nextId = 1

  function validate(user) {
    if (!user.name) throw new Error('name required')
    if (!user.email) throw new Error('email required')
  }

  // public API
  return {
    create(data) {
      validate(data)
      const user = { id: nextId++, ...data }
      users.push(user)
      return user
    },
    findById(id) {
      return users.find(u => u.id === id) ?? null
    },
    count() {
      return users.length
    },
  }
})()

userService.create({ name: 'Mark', email: 'mark@example.com' })
userService.count()   // 1
userService.users     // undefined — private ✅
```

```javascript
// ── IIFE — Immediately Invoked Function Expression ─────────────────────────
// Basic form: wrap in () then call with ()
(function() {
  const secret = 'private'
  console.log('IIFE runs immediately')
})()

// Arrow IIFE
(() => {
  const x = 10
  console.log(x)
})()

// Async IIFE — common in top-level scripts (without top-level await)
;(async () => {
  const data = await fetchSomething()
  console.log(data)
})()

// IIFE with return value
const config = (function() {
  const env = process.env.NODE_ENV ?? 'development'
  return {
    isDev:  env === 'development',
    isProd: env === 'production',
    env,
  }
})()

// Leading semicolon prevents issues when concatenating files:
// ;(function(){})()  ← the ; prevents treating previous expression as a function call
```

---

## W — Why It Matters

- Factory functions are the idiomatic JavaScript alternative to classes for service objects — they avoid `this` pitfalls, enable true private state, and don't require `new`. Many production codebases (React utilities, Node.js services) use factory functions.
- The module pattern was the pre-ES6 way to create modules — understanding it explains thousands of legacy codebases and NPM packages. ES6 modules (`import`/`export`) largely replace it, but the mental model is the same.
- Async IIFEs are common in scripts where top-level `await` isn't available — `(async () => { await ... })()` is the pattern to look for in Node.js scripts and configuration files.

---

## I — Interview Q&A

### Q: What is the difference between a factory function and a class?

**A:** Both create objects with methods. A factory function is a regular function that returns a plain object — private state is via closure (truly inaccessible from outside), no `new` keyword required, no `this` binding issues, and no prototype chain. A class uses `new` to instantiate, stores methods on `Class.prototype` (shared across all instances, more memory-efficient for many instances), uses `this` for state (binding must be managed), and private fields require `#prefix` syntax (ES2022). Factory functions are simpler and safer for small-to-medium objects; classes are preferable when creating many instances or when inheritance is needed.

---

## C — Common Pitfalls + Fix

### ❌ Forgetting to wrap IIFE — becomes a function declaration

```javascript
// ❌ SyntaxError: function declarations require a name
function() {
  console.log('hello')
}()

// ✅ Wrap in parentheses to make it a function expression
(function() {
  console.log('hello')
})()

// ✅ Or use arrow IIFE (cleaner)
(() => {
  console.log('hello')
})()
```

---

## K — Coding Challenge + Solution

### Challenge

Using the module pattern, create a `cartModule` with private `items` array and public methods: `addItem(item)`, `removeItem(id)`, `getTotal()` (sum of `item.price * item.quantity`), `getItems()` (returns a copy — not the private array). Use an IIFE.

### Solution

```javascript
const cartModule = (() => {
  const items = []

  return {
    addItem(item) {
      const existing = items.find(i => i.id === item.id)
      if (existing) {
        existing.quantity += item.quantity ?? 1
      } else {
        items.push({ ...item, quantity: item.quantity ?? 1 })
      }
    },
    removeItem(id) {
      const idx = items.findIndex(i => i.id === id)
      if (idx !== -1) items.splice(idx, 1)
    },
    getTotal() {
      return items.reduce((sum, i) => sum + i.price * i.quantity, 0)
    },
    getItems() {
      return [...items]   // copy — original is private ✅
    },
  }
})()

cartModule.addItem({ id: 1, name: 'Book', price: 20, quantity: 2 })
cartModule.addItem({ id: 2, name: 'Pen',  price: 5,  quantity: 3 })
console.log(cartModule.getTotal())   // 55
console.log(cartModule.items)        // undefined ✅
```

---

---

# 6 — Recursion — Base Case, Call Stack, Memoized Recursion

---

## T — TL;DR

**Recursion** is a function that calls itself. Every recursive function needs a **base case** (stop condition) and a **recursive case** (calls itself with a smaller problem). Each call adds a frame to the **call stack** — too many nested calls = stack overflow. **Memoized recursion** caches results to avoid redundant calls.

---

## K — Key Concepts

```javascript
// ── Basic structure: base case + recursive case ───────────────────────────
function factorial(n) {
  if (n <= 1) return 1          // base case: stop recursion
  return n * factorial(n - 1)  // recursive case: smaller problem
}
factorial(5)  // 5 * 4 * 3 * 2 * 1 = 120

// ── Call stack trace for factorial(4) ─────────────────────────────────────
// factorial(4) → 4 * factorial(3)
//   factorial(3) → 3 * factorial(2)
//     factorial(2) → 2 * factorial(1)
//       factorial(1) → 1  ← base case, unwinds
//     factorial(2) = 2 * 1 = 2
//   factorial(3) = 3 * 2 = 6
// factorial(4) = 4 * 6 = 24
```

```javascript
// ── Stack overflow ────────────────────────────────────────────────────────
function infinite(n) {
  return infinite(n + 1)   // no base case → stack overflow
}
// infinite(0)  // RangeError: Maximum call stack size exceeded

// Node.js default stack: ~10,000–15,000 frames
// ❌ Recursion on large arrays/trees without tail call optimisation can overflow

// ── Fibonacci — naive (exponential time) ──────────────────────────────────
function fib(n) {
  if (n <= 1) return n          // base: fib(0)=0, fib(1)=1
  return fib(n - 1) + fib(n - 2)
}
fib(10)   // 55 — fast
fib(40)   // 102334155 — starts to slow down (many redundant calls)
fib(50)   // extremely slow — 2^50 calls ❌
```

```javascript
// ── Memoized recursion ────────────────────────────────────────────────────
function memoize(fn) {
  const cache = new Map()
  return function(...args) {
    const key = JSON.stringify(args)
    if (cache.has(key)) return cache.get(key)
    const result = fn.apply(this, args)
    cache.set(key, result)
    return result
  }
}

const fibMemo = memoize(function fib(n) {
  if (n <= 1) return n
  return fibMemo(n - 1) + fibMemo(n - 2)
})

fibMemo(50)   // instant ✅ — each subproblem computed once
fibMemo(100)  // instant ✅

// ── Iterative alternative (preferred for deep recursion) ──────────────────
function fibIterative(n) {
  if (n <= 1) return n
  let [a, b] = [0, 1]
  for (let i = 2; i <= n; i++) {
    [a, b] = [b, a + b]
  }
  return b
}
fibIterative(1000)   // instant, no stack concern ✅
```

```javascript
// ── Practical recursion: deep object flattening ────────────────────────────
function flattenObj(obj, prefix = '') {
  const result = {}
  for (const [key, val] of Object.entries(obj)) {
    const newKey = prefix ? `${prefix}.${key}` : key
    if (val !== null && typeof val === 'object' && !Array.isArray(val)) {
      Object.assign(result, flattenObj(val, newKey))  // recursive case
    } else {
      result[newKey] = val   // base case: primitive or array
    }
  }
  return result
}

flattenObj({ a: 1, b: { c: 2, d: { e: 3 } } })
// { 'a': 1, 'b.c': 2, 'b.d.e': 3 }
```

---

## W — Why It Matters

- Recursion is the natural fit for tree structures (file systems, DOM, nested comments, JSON with unknown depth) — iterative solutions require maintaining a manual stack, which recursion handles automatically.
- The `memoize` pattern is used everywhere — React's `useMemo`, Vue's computed properties, and function memoization libraries all implement the same "cache the result by input" idea.
- Stack overflow from deep recursion is a real production risk with user data — if a user has 10,000 nested comments and you recursively traverse them, you crash. Always consider iterative solutions or depth limits for user-supplied data.

---

## I — Interview Q&A

### Q: What is the difference between the base case and the recursive case, and what happens without a base case?

**A:** The base case is the condition under which the function stops calling itself and returns a direct value. The recursive case is the condition under which the function calls itself with a smaller or simpler version of the problem, moving toward the base case. Without a base case (or with a faulty one that's never reached), the function calls itself forever, filling the call stack until Node.js throws `RangeError: Maximum call stack size exceeded`. Every recursive function must guarantee that the recursive case eventually leads to the base case.

---

## C — Common Pitfalls + Fix

### ❌ Naive recursive Fibonacci — exponential redundant calls

```javascript
// ❌ fib(40) makes ~2 billion calls
function fib(n) {
  if (n <= 1) return n
  return fib(n - 1) + fib(n - 2)
}
fib(45)   // takes several seconds ❌

// ✅ Memoize: each value computed once
const cache = {}
function fibFast(n) {
  if (n in cache) return cache[n]
  if (n <= 1) return n
  cache[n] = fibFast(n - 1) + fibFast(n - 2)
  return cache[n]
}
fibFast(100)   // instant ✅
```

---

## K — Coding Challenge + Solution

### Challenge

Write a memoized `countWays(n)` that counts how many ways you can climb `n` stairs taking 1 or 2 steps at a time. (`countWays(1)=1`, `countWays(2)=2`, `countWays(3)=3`, `countWays(4)=5`). Show the memoization cache after calling `countWays(5)`.

### Solution

```javascript
function makeCountWays() {
  const cache = new Map([[1, 1], [2, 2]])   // base cases

  function countWays(n) {
    if (cache.has(n)) return cache.get(n)
    const result = countWays(n - 1) + countWays(n - 2)
    cache.set(n, result)
    return result
  }

  countWays.getCache = () => Object.fromEntries(cache)
  return countWays
}

const countWays = makeCountWays()
console.log(countWays(5))              // 8
console.log(countWays.getCache())
// { '1': 1, '2': 2, '3': 3, '4': 5, '5': 8 }
```

---

---

# 7 — Higher-Order Functions and Pure Functions

---

## T — TL;DR

A **higher-order function** (HOF) takes a function as an argument or returns a function. Built-in array methods (`map`, `filter`, `reduce`, `find`, `every`, `some`) are HOFs. A **pure function** always returns the same output for the same input and has no side effects — predictable, testable, composable. Side effects (mutation, I/O, state change) should be isolated at the edges of the program.

---

## K — Key Concepts

```javascript
// ── Higher-order functions ─────────────────────────────────────────────────
// Takes a function as argument
function repeat(n, action) {
  for (let i = 0; i < n; i++) action(i)
}
repeat(3, i => console.log(`step ${i}`))

// Returns a function
function makeAdder(x) {
  return y => x + y   // closes over x
}
const add5 = makeAdder(5)
add5(3)   // 8

// ── Array HOFs ─────────────────────────────────────────────────────────────
const users = [
  { id: 1, name: 'Alice', role: 'admin',  active: true  },
  { id: 2, name: 'Bob',   role: 'user',   active: false },
  { id: 3, name: 'Carol', role: 'user',   active: true  },
]

// map — transform each element, returns new array (same length)
const names = users.map(u => u.name)
// ['Alice', 'Bob', 'Carol']

// filter — keep matching elements, returns new array (≤ original length)
const active = users.filter(u => u.active)
// [{ id:1, name:'Alice'... }, { id:3, name:'Carol'... }]

// reduce — fold to a single value
const countByRole = users.reduce((acc, u) => {
  acc[u.role] = (acc[u.role] ?? 0) + 1
  return acc
}, {})
// { admin: 1, user: 2 }

// find — first match or undefined
const admin = users.find(u => u.role === 'admin')  // { id:1, name:'Alice'... }

// findIndex — first matching index or -1
const idx = users.findIndex(u => u.id === 2)       // 1

// every — true only if ALL pass
const allActive = users.every(u => u.active)       // false

// some — true if ANY pass
const hasAdmin = users.some(u => u.role === 'admin')  // true

// flatMap — map then flatten one level
const matrix = [[1,2],[3,4],[5,6]]
matrix.flatMap(row => row.map(x => x * 2))
// [2, 4, 6, 8, 10, 12]
```

```javascript
// ── Pure functions ────────────────────────────────────────────────────────
// Pure: same input → same output, no side effects
function add(a, b) { return a + b }         // pure ✅
function double(arr) { return arr.map(x => x * 2) }  // pure ✅ (doesn't mutate arr)

// ❌ Impure: depends on external state
let rate = 1.5
function convert(amount) {
  return amount * rate   // depends on mutable outer variable ❌
}
// Same input can give different output if 'rate' changes

// ❌ Impure: side effect (mutation)
function addToArray(arr, item) {
  arr.push(item)   // mutates the argument ❌
  return arr
}

// ✅ Pure equivalent — returns new array
function addToArrayPure(arr, item) {
  return [...arr, item]   // new array, original unchanged ✅
}

// ── Side effects — should be isolated ────────────────────────────────────
// Side effects include:
// - console.log, writing to file, HTTP calls
// - Modifying a variable outside the function
// - Mutating a function argument
// - Reading from Date.now(), Math.random()

// Pattern: pure core, push side effects to the edges
const processUser = (user) => ({      // pure: transforms data
  ...user,
  displayName: `${user.first} ${user.last}`,
  age: new Date().getFullYear() - user.birthYear,
})

async function handleUserRequest(req) {
  const rawUser = await db.findUser(req.id)   // side effect: I/O
  const processed = processUser(rawUser)      // pure: easy to test
  await db.save(processed)                    // side effect: I/O
  return processed
}
```

---

## W — Why It Matters

- `map`/`filter`/`reduce` replace most `for` loops in modern JavaScript — they express intent clearly (transform, filter, aggregate), return new arrays (no mutation), and chain naturally.
- Pure functions are the most testable code — no mocks, no setup, no teardown. `expect(add(2, 3)).toBe(5)` is the entire test. This is why functional code is associated with high test coverage and confidence.
- Separating pure business logic from side effects (I/O, state mutation) is the architectural principle behind Redux, React's unidirectional data flow, and functional core/imperative shell pattern.

---

## I — Interview Q&A

### Q: What is a pure function and why does it matter for testing?

**A:** A pure function always returns the same output for the same input and produces no side effects — it doesn't modify arguments, read from global state, do I/O, or depend on `Date.now()` or `Math.random()`. It matters for testing because there's nothing to mock — you just call the function with inputs and assert the output. No database, no HTTP, no setup. Tests are fast, deterministic, and isolated. The practical approach: write business logic as pure functions (validation, transformations, calculations), then connect them to the outside world (database, API) in a thin impure layer.

---

## C — Common Pitfalls + Fix

### ❌ `reduce` without an initial value — breaks on empty array

```javascript
// ❌ TypeError on empty array: Reduce of empty array with no initial value
const sum = [].reduce((acc, n) => acc + n)

// ✅ Always provide an initial value
const sum2 = [].reduce((acc, n) => acc + n, 0)   // 0 ✅
const arr  = [].reduce((acc, x) => [...acc, x], [])  // [] ✅
const obj  = [].reduce((acc, x) => ({ ...acc, ...x }), {}) // {} ✅
```

---

## K — Coding Challenge + Solution

### Challenge

Using only `map`, `filter`, and `reduce` (no `for` loops), transform this array of orders: keep only completed orders, add a `totalWithTax` field (total * 1.12), and return an object `{ count, totalRevenue, orders }`.

### Solution

```javascript
const orders = [
  { id: 1, status: 'completed', total: 100 },
  { id: 2, status: 'pending',   total: 200 },
  { id: 3, status: 'completed', total: 150 },
  { id: 4, status: 'cancelled', total: 80  },
  { id: 5, status: 'completed', total: 300 },
]

const result = orders
  .filter(o => o.status === 'completed')
  .map(o => ({ ...o, totalWithTax: +(o.total * 1.12).toFixed(2) }))
  .reduce((acc, o) => ({
    count:        acc.count + 1,
    totalRevenue: +(acc.totalRevenue + o.totalWithTax).toFixed(2),
    orders:       [...acc.orders, o],
  }), { count: 0, totalRevenue: 0, orders: [] })

console.log(result)
// { count: 3, totalRevenue: 617.00, orders: [...3 orders with totalWithTax] }
```

---

---

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

# 9 — Composition, Pipe, Currying, Partial Application

---

## T — TL;DR

**Function composition** combines functions so the output of one becomes the input of the next. **pipe** applies functions left-to-right (readable order). **compose** applies right-to-left (mathematical order). **Currying** transforms `f(a, b)` into `f(a)(b)` — enables partial application. **Partial application** pre-fills some arguments, returning a function awaiting the rest.

---

## K — Key Concepts

```javascript
// ── Function composition ──────────────────────────────────────────────────
const double = x => x * 2
const addOne = x => x + 1
const square = x => x * x

// Manual composition
const doubleThenAddOne = x => addOne(double(x))
doubleThenAddOne(5)   // 11

// ── compose — right to left (math notation: f∘g means f(g(x))) ────────────
const compose = (...fns) => x => fns.reduceRight((acc, fn) => fn(acc), x)

const transform = compose(square, addOne, double)   // square(addOne(double(x)))
transform(3)   // double(3)=6 → addOne(6)=7 → square(7)=49

// ── pipe — left to right (readable code order) ────────────────────────────
const pipe = (...fns) => x => fns.reduce((acc, fn) => fn(acc), x)

const process = pipe(double, addOne, square)   // double → addOne → square
process(3)    // double(3)=6 → addOne(6)=7 → square(7)=49 (same result, clearer order)

// Practical pipe example
const sanitizeInput = pipe(
  str => str.trim(),
  str => str.toLowerCase(),
  str => str.replace(/[^a-z0-9]/g, '-'),
  str => str.replace(/-+/g, '-'),
)
sanitizeInput('  Hello World!  ')   // 'hello-world'
```

```javascript
// ── Currying — transform f(a,b,c) into f(a)(b)(c) ─────────────────────────
// Manual curry
function add(a) {
  return function(b) {
    return a + b
  }
}
add(3)(4)   // 7

// General curry utility
function curry(fn) {
  return function curried(...args) {
    if (args.length >= fn.length) {
      return fn.apply(this, args)     // enough args: call original
    }
    return function(...moreArgs) {
      return curried.apply(this, [...args, ...moreArgs])  // collect more
    }
  }
}

const curriedAdd = curry((a, b, c) => a + b + c)
curriedAdd(1)(2)(3)       // 6
curriedAdd(1, 2)(3)       // 6
curriedAdd(1)(2, 3)       // 6
curriedAdd(1, 2, 3)       // 6

// Currying enables specialisation
const multiply = curry((factor, n) => n * factor)
const double   = multiply(2)   // partially applied
const triple   = multiply(3)

[1, 2, 3, 4].map(double)   // [2, 4, 6, 8]
[1, 2, 3, 4].map(triple)   // [3, 6, 9, 12]
```

```javascript
// ── Partial application ────────────────────────────────────────────────────
// Pre-fill some arguments, get back a function needing the rest

function partial(fn, ...presetArgs) {
  return function(...laterArgs) {
    return fn(...presetArgs, ...laterArgs)
  }
}

function formatDate(locale, timezone, date) {
  return date.toLocaleString(locale, { timeZone: timezone })
}

// Pre-fill locale and timezone
const formatManila = partial(formatDate, 'en-PH', 'Asia/Manila')
const formatNY     = partial(formatDate, 'en-US', 'America/New_York')

formatManila(new Date())  // formatted for Manila ✅
formatNY(new Date())      // formatted for New York ✅

// Partial with bind (native approach)
const log = (level, msg) => console.log(`[${level}] ${msg}`)
const info  = log.bind(null, 'INFO')
const error = log.bind(null, 'ERROR')

info('Server started')    // [INFO] Server started
error('DB connection lost') // [ERROR] DB connection lost
```

---

## W — Why It Matters

- `pipe` is how data transformation pipelines are built in real code — instead of a deeply nested chain of function calls, you read left-to-right: input → step1 → step2 → step3 → output. This appears in Redux middleware, RxJS, and functional programming libraries.
- Currying + partial application enable configurable, reusable utilities — `multiply(2)` is a concrete `double` function derived from a generic one. Libraries like Ramda and lodash/fp are built entirely on this pattern.
- Function composition is the functional alternative to class inheritance — "compose behaviours instead of inheriting them" is the functional programming equivalent of the composition-over-inheritance principle.

---

## I — Interview Q&A

### Q: What is the difference between currying and partial application?

**A:** Both pre-fill arguments, but with different mechanics. Currying transforms a multi-argument function into a chain of single-argument functions — `f(a,b,c)` becomes `f(a)(b)(c)`. You must call each step individually. Partial application pre-fills one or more arguments of any arity function and returns a function expecting the remaining arguments — `partial(f, a)` gives a function `(b, c) => f(a, b, c)`. Currying is a specific transformation; partial application is a specific usage. In practice they overlap — curried functions support partial application naturally. The distinction: curried functions always return a unary function; partially applied functions may still accept multiple arguments.

---

## C — Common Pitfalls + Fix

### ❌ `compose` argument order confusion — right-to-left is counterintuitive

```javascript
// ❌ compose reads right-to-left — easy to mix up
const transform = compose(addOne, double)   // applies double FIRST then addOne
transform(5)   // double(5)=10, addOne(10)=11
// Reading left-to-right suggests addOne then double — opposite of execution ❌

// ✅ Use pipe for left-to-right (matches reading order)
const transform2 = pipe(double, addOne)    // double first, then addOne ✅
transform2(5)   // 11 — same result, clearer intent
```

---

## K — Coding Challenge + Solution

### Challenge

Build a `pipe`-based data sanitizer that: trims a string, converts to lowercase, removes non-alphanumeric characters (keeping spaces), collapses multiple spaces, and trims again. Then use `curry` to create a `clamp(min, max)(value)` function that restricts a number to a range.

### Solution

```javascript
const pipe = (...fns) => x => fns.reduce((acc, fn) => fn(acc), x)

const sanitize = pipe(
  s => s.trim(),
  s => s.toLowerCase(),
  s => s.replace(/[^a-z0-9 ]/g, ''),
  s => s.replace(/ +/g, ' '),
  s => s.trim(),
)

console.log(sanitize('  Hello, World! 123  '))   // 'hello world 123'
console.log(sanitize('  **Test** >>Input<<  '))  // 'test input'

// Curried clamp
function curry(fn) {
  return function curried(...args) {
    if (args.length >= fn.length) return fn(...args)
    return (...more) => curried(...args, ...more)
  }
}

const clamp = curry((min, max, value) => Math.min(Math.max(value, min), max))

const clamp0to100 = clamp(0, 100)
console.log(clamp0to100(150))   // 100
console.log(clamp0to100(-50))   // 0
console.log(clamp0to100(42))    // 42

const clampPercent = clamp(0)(1)
console.log(clampPercent(1.5))  // 1
console.log(clampPercent(0.7))  // 0.7
```

---

---

# 10 — Memoization, Debounce, Throttle

---

## T — TL;DR

**Memoization** caches function results by input — speeds up expensive pure functions by trading memory for computation. **Debounce** delays a function call until N ms after the last invocation — ideal for search inputs. **Throttle** limits a function to at most once per N ms — ideal for scroll/resize handlers. Both debounce and throttle use closures + `setTimeout`.

---

## K — Key Concepts

```javascript
// ── Memoization ────────────────────────────────────────────────────────────
function memoize(fn) {
  const cache = new Map()

  return function(...args) {
    const key = JSON.stringify(args)    // simple key (works for primitives)
    if (cache.has(key)) {
      return cache.get(key)             // cache hit ✅
    }
    const result = fn.apply(this, args)
    cache.set(key, result)
    return result
  }
}

// Expensive pure function
const expensiveCalc = memoize((n) => {
  console.log(`Computing for ${n}...`)
  let result = 0
  for (let i = 0; i < n * 1e6; i++) result += i
  return result
})

expensiveCalc(100)   // Computing for 100... (slow first time)
expensiveCalc(100)   // (instant — from cache)
expensiveCalc(200)   // Computing for 200... (new input)
expensiveCalc(100)   // (instant — still cached)

// ⚠️ Only memoize pure functions — impure functions give wrong cached results
// ⚠️ JSON.stringify doesn't work for functions, undefined, or circular objects
//    For complex keys, use a WeakMap or custom key serialiser
```

```javascript
// ── Debounce ───────────────────────────────────────────────────────────────
// "Run only after N ms of silence"
// Use case: search-as-you-type, window resize, form auto-save

function debounce(fn, delay) {
  let timerId = null

  return function(...args) {
    clearTimeout(timerId)                    // cancel previous scheduled call
    timerId = setTimeout(() => {
      fn.apply(this, args)                   // call after silence
    }, delay)
  }
}

// Usage: search input
const searchApi = debounce((query) => {
  console.log(`Searching for: ${query}`)    // only fires after 300ms of no typing
  // fetch(`/api/search?q=${query}`)
}, 300)

// User types fast: 'h', 'he', 'hel', 'hell', 'hello'
// searchApi called 5 times rapidly — only ONE API call fires (for 'hello') ✅

// Debounce with immediate option (fire on leading edge)
function debounceAdvanced(fn, delay, immediate = false) {
  let timerId = null

  return function(...args) {
    const callNow = immediate && !timerId
    clearTimeout(timerId)
    timerId = setTimeout(() => {
      timerId = null
      if (!immediate) fn.apply(this, args)
    }, delay)
    if (callNow) fn.apply(this, args)      // fire immediately on first call
  }
}
```

```javascript
// ── Throttle ───────────────────────────────────────────────────────────────
// "Run at most once per N ms"
// Use case: scroll handlers, mouse move, game loop, analytics

function throttle(fn, limit) {
  let lastCall = 0

  return function(...args) {
    const now = Date.now()
    if (now - lastCall >= limit) {
      lastCall = now
      return fn.apply(this, args)
    }
    // else: too soon, skip this call
  }
}

// Usage: scroll handler
const onScroll = throttle(() => {
  console.log('scroll position:', window.scrollY)
  // expensive: recalculate sticky headers, lazy-load images
}, 100)   // fires at most 10 times per second

window.addEventListener('scroll', onScroll)

// ── Comparing debounce vs throttle ────────────────────────────────────────
// Scenario: user scrolls for 2 seconds (many events per second)

// Debounce(300ms):
// Fires ONCE — 300ms after the scrolling STOPS
// Good for: "when did they finish?" (search, resize)

// Throttle(100ms):
// Fires EVERY 100ms WHILE scrolling
// Good for: "what is the current state?" (analytics, infinite scroll)
```

```javascript
// ── Throttle with trailing call ────────────────────────────────────────────
// Ensures the last call always fires (trailing edge)
function throttleWithTrailing(fn, limit) {
  let lastCall = 0
  let trailingTimer = null

  return function(...args) {
    const now = Date.now()
    const remaining = limit - (now - lastCall)

    if (remaining <= 0) {
      clearTimeout(trailingTimer)
      lastCall = now
      fn.apply(this, args)
    } else {
      clearTimeout(trailingTimer)
      trailingTimer = setTimeout(() => {
        lastCall = Date.now()
        fn.apply(this, args)    // trailing edge call ✅
      }, remaining)
    }
  }
}
```

---

## W — Why It Matters

- Debounce on search inputs reduces API calls by 90%+ — without it, every keystroke hits the server. With 300ms debounce, a 10-keystroke query makes 1 call instead of 10.
- Throttle on scroll/resize prevents jank — scroll events fire 100+ times per second. Running expensive calculations every event causes 100+ DOM reads per second, stalling the render pipeline. Throttle at 60fps (16ms) or 100ms matches browser capabilities.
- Memoization is the foundation of React's `useMemo` and `useCallback`, Vue's computed properties, and selector caching in Redux. Understanding the pure-function requirement explains why `useMemo` doesn't help when dependencies change every render.

---

## I — Interview Q&A

### Q: What is the difference between debounce and throttle? Give a real-world example of each.

**A:** Debounce delays execution until N milliseconds have passed since the last invocation — if calls keep coming in, it keeps resetting. It fires once after activity stops. Real-world: a search input that fetches results — debounce(300ms) means the API is called only when the user stops typing for 300ms, not on every keystroke. Throttle limits execution to at most once per N milliseconds regardless of how many times it's invoked — calls in between are dropped. Real-world: a scroll event that updates a sticky header position — throttle(100ms) fires at most 10 times per second, preventing 100+ DOM updates per second. Rule of thumb: debounce for "after the user is done", throttle for "at a sustainable rate while the user is active".

---

## C — Common Pitfalls + Fix

### ❌ Creating a new debounced function inside a component render — resets timer

```javascript
// ❌ New function on every render — timer resets every render, never fires
function SearchComponent() {
  function handleChange(e) {
    const search = debounce(fetchResults, 300)  // new function each call ❌
    search(e.target.value)
  }
}

// ✅ Create debounced function once (outside render, or with useCallback/useMemo)
const debouncedFetch = debounce(fetchResults, 300)  // created once ✅

function SearchComponent() {
  function handleChange(e) {
    debouncedFetch(e.target.value)   // same function reference ✅
  }
}
```

---

## K — Coding Challenge + Solution

### Challenge

Implement a `memoize` that supports a custom key function as a second argument. Then implement a `debounce` that returns a `.cancel()` method to clear the pending timer. Show both in use.

### Solution

```javascript
// Memoize with custom key function
function memoize(fn, keyFn = (...args) => JSON.stringify(args)) {
  const cache = new Map()
  const memoized = function(...args) {
    const key = keyFn(...args)
    if (cache.has(key)) return cache.get(key)
    const result = fn.apply(this, args)
    cache.set(key, result)
    return result
  }
  memoized.cache = cache
  memoized.clear = () => cache.clear()
  return memoized
}

// Custom key: only first argument matters
const expensiveLookup = memoize(
  (id, _options) => ({ id, data: `data for ${id}` }),
  (id) => String(id)   // options ignored in key ✅
)
expensiveLookup(1, { verbose: true })
expensiveLookup(1, { verbose: false })  // cache hit — same id ✅

// Debounce with cancel()
function debounce(fn, delay) {
  let timerId = null

  function debounced(...args) {
    clearTimeout(timerId)
    timerId = setTimeout(() => {
      timerId = null
      fn.apply(this, args)
    }, delay)
  }

  debounced.cancel = () => {
    clearTimeout(timerId)
    timerId = null
  }

  debounced.flush = function(...args) {
    clearTimeout(timerId)
    timerId = null
    fn.apply(this, args)
  }

  return debounced
}

const saveForm = debounce((data) => {
  console.log('Saving:', data)
}, 500)

saveForm({ name: 'Mark' })   // pending...
saveForm({ name: 'Mark A' }) // resets timer
saveForm.cancel()            // cancelled — nothing saved ✅

saveForm({ name: 'Mark Austin' }) // pending...
saveForm.flush({ name: 'Mark Austin' })  // fires immediately ✅
```

---

## ✅ Day 2 Complete — Functions, Scope, Closures & Functional Patterns

| # | Subtopic | Status |
|---|----------|--------|
| 1 | Function Declarations, Expressions, Arrow Functions | ☐ |
| 2 | Parameters — Default, Rest, Arguments Object | ☐ |
| 3 | Lexical Scope and Scope Chain | ☐ |
| 4 | Closures and Private State | ☐ |
| 5 | Factory Functions, Module Pattern, IIFE | ☐ |
| 6 | Recursion — Base Case, Call Stack, Memoization | ☐ |
| 7 | Higher-Order Functions and Pure Functions | ☐ |
| 8 | `this` in All Contexts — call, apply, bind | ☐ |
| 9 | Composition, Pipe, Currying, Partial Application | ☐ |
| 10 | Memoization, Debounce, Throttle | ☐ |

---

## 🗺️ One-Page Mental Model — Day 2

```
FUNCTION TYPES
  Declaration:    hoisted fully — callable before definition
  Expression:     not hoisted — assign to const/let
  Arrow:          no own this/arguments/prototype — for callbacks and one-liners
  Arrow implicit: (x) => x * 2 — no return keyword needed for single expression
  Return object:  (x) => ({ key: x }) — wrap object literal in ()

PARAMETERS
  Default:  fn(x = 10) — triggers only on undefined (not null/0/'')
  Rest:     fn(...args) — real Array, must be last param
  Arguments: array-like, no array methods, not in arrows — use rest instead
  Destructuring: fn({ a, b = default } = {}) — option objects pattern

LEXICAL SCOPE + SCOPE CHAIN
  Scope chain: inner → outer → ... → global
  Variables found by walking outward — inner never visible to outer
  Lexical = scope set by WHERE you write the function (not where called)
  Block scope: let/const inside {} | Function scope: var anywhere in function
  Shadowing: inner var hides outer — same name, inner wins

CLOSURES
  Function + its lexical environment = closure
  Outer function returns → inner function STILL accesses outer variables
  Each factory call creates a FRESH, INDEPENDENT closure
  Private state: variables enclosed are truly inaccessible from outside
  var loop bug: all closures share same var → use let (new binding per iteration)

FACTORY / MODULE / IIFE
  Factory: function returns object with closure-private state (no new/this)
  Module pattern: IIFE + closure → private vars + public API
  IIFE: (() => { ... })() — immediate execution, isolated scope
  Async IIFE: (async () => { await ... })() — top-level await workaround

RECURSION
  Base case: stop condition, return direct value
  Recursive case: calls self with smaller problem → must reach base case
  Call stack: each call = one frame → overflow at ~10k frames
  Memoize: cache[key] before recursive call → exponential → linear
  Alternative: iterate when depth may be large (user data, file trees)

HOFs + PURE FUNCTIONS
  HOF: takes function as arg OR returns function
  map → new array, same length | filter → subset | reduce → single value
  find → first match | every → all pass | some → any pass
  Pure: same input → same output, no side effects
  Side effects: mutation, I/O, global state, Date.now(), Math.random()
  Pattern: pure core (business logic) + impure edges (DB, network)
  reduce: always provide initial value — empty array throws without it

THIS
  Global call:  window / undefined (strict mode)
  Method call:  object left of the dot
  Arrow:        inherits this from enclosing scope (lexical)
  Class:        the instance (new'd object)
  Detached method: loses this → fix with bind/arrow wrapper/class field arrow
  call(thisArg, ...args)    → immediate, individual args
  apply(thisArg, [args])    → immediate, array of args
  bind(thisArg, ...args)    → returns new function, not called immediately

COMPOSITION
  pipe(...fns)(x)    → left-to-right (readable) — prefer for code
  compose(...fns)(x) → right-to-left (math order) — fn(g(x))
  curry(fn)(a)(b)(c) → one arg at a time, enables partial application
  partial(fn, a)(b)  → pre-fill args, return function needing the rest
  bind as partial:   fn.bind(null, presetArg)

MEMOIZATION / DEBOUNCE / THROTTLE
  Memoize:  cache by args → only for PURE functions
            new Map(), key = JSON.stringify(args)
  Debounce: fires AFTER N ms of silence → search, resize, auto-save
            clearTimeout + setTimeout on every call
            .cancel() to abort pending call
  Throttle: fires AT MOST once per N ms → scroll, mouse, analytics
            compare Date.now() to lastCall timestamp
  Rule:     debounce = "after done" | throttle = "at sustainable rate"
```

> **Your next action:** Open your editor, write a `makeCounter()` factory function with `increment`, `decrement`, and `getCount` — run it in Node with `node -e` or a scratch file. One closure from memory beats ten minutes of reading.

> "Doing one small thing beats opening a feed."