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
