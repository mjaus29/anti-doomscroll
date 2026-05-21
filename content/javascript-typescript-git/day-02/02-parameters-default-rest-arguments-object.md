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
