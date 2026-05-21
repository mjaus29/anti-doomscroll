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
