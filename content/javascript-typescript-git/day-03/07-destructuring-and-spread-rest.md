# 7 — Destructuring and Spread / Rest

---

## T — TL;DR

**Destructuring** extracts values from arrays or objects into variables — clean, readable, supports defaults and renaming. **Spread** (`...`) expands an iterable into individual elements — for copying, merging, and spreading into function calls. **Rest** (`...`) collects remaining elements or properties — in function parameters and destructuring.

---

## K — Key Concepts

```javascript
// ── Array destructuring ────────────────────────────────────────────────────
const [a, b, c] = [1, 2, 3]        // a=1, b=2, c=3
const [first, , third] = [1, 2, 3]  // skip with empty comma: third=3
const [x = 10, y = 20] = [5]        // default: x=5, y=20

// Swap variables
let p = 1, q = 2
;[p, q] = [q, p]   // p=2, q=1 — no temp variable needed ✅

// Rest in array destructuring
const [head, ...tail] = [1, 2, 3, 4]   // head=1, tail=[2,3,4]
```

```javascript
// ── Object destructuring ────────────────────────────────────────────────────
const user = { name: 'Mark', age: 28, role: 'admin', email: 'mark@ex.com' }

// Basic
const { name, age } = user   // name='Mark', age=28

// Rename: key: newName
const { name: userName, role: userRole } = user
// userName='Mark', userRole='admin'

// Default values
const { name: n2, score = 100 } = user  // score=100 (not in user)

// Nested destructuring
const config = { db: { host: 'localhost', port: 5432 } }
const { db: { host, port } } = config   // host='localhost', port=5432

// Rest in object destructuring
const { password, ...safeUser } = { ...user, password: 'secret' }
// safeUser = { name:'Mark', age:28, role:'admin', email:'mark@ex.com' }
// password = 'secret' — excluded ✅

// In function parameters
function createUser({ name, email, role = 'user', active = true } = {}) {
  return { name, email, role, active }
}
createUser({ name: 'Mark', email: 'mark@ex.com' })
// { name:'Mark', email:'mark@ex.com', role:'user', active:true }
```

```javascript
// ── Spread operator ────────────────────────────────────────────────────────
// Arrays: copy and merge
const arr1 = [1, 2, 3]
const arr2 = [4, 5, 6]
const merged  = [...arr1, ...arr2]          // [1,2,3,4,5,6]
const copy    = [...arr1]                   // shallow copy
const prepend = [0, ...arr1]               // [0,1,2,3]
const append  = [...arr1, 4]               // [1,2,3,4]

// Objects: copy and merge (later keys win)
const obj1 = { a: 1, b: 2 }
const obj2 = { b: 3, c: 4 }
const merged2 = { ...obj1, ...obj2 }  // { a:1, b:3, c:4 } — obj2.b overrides
const withOverride = { ...user, role: 'superadmin' }  // all user props + new role

// Function calls
Math.max(...[3, 1, 4, 1, 5])   // 5
console.log(...['a', 'b', 'c']) // a b c
```

---

## W — Why It Matters

- Destructuring in function parameters is the standard for options/config objects and React/Express patterns — every `handler({ req, res, body })` or `Component({ className, children, onClick })` uses it.
- `const { password, ...safeUser } = user` is the idiomatic way to strip sensitive fields from objects before sending to a client — far cleaner than deleting properties from a copy.
- Spread for array/object copying creates shallow copies only — nested objects are still shared. Always know when you need a deep copy (Subtopic 8).

---

## I — Interview Q&A

### Q: What is the difference between rest and spread syntax?

**A:** They use the same `...` syntax but in opposite contexts. **Spread** expands an iterable into individual elements — it's used where multiple elements are expected: function calls `fn(...args)`, array literals `[...arr, 4]`, object literals `{ ...obj }`. **Rest** collects multiple elements into a single array/object — it's used where a variable is expected: function parameters `function fn(...args)`, array destructuring `const [first, ...rest] = arr`, object destructuring `const { a, ...remaining } = obj`. Think of spread as "unpack" and rest as "collect the remaining".

---

## C — Common Pitfalls + Fix

### ❌ Destructuring without a fallback when value is undefined

```javascript
// ❌ TypeError if config is null or undefined
function setup(config) {
  const { port, host } = config  // TypeError if config is null ❌
}

// ✅ Default parameter fallback
function setup({ port = 3000, host = 'localhost' } = {}) {
  return `${host}:${port}`
}
setup()                        // 'localhost:3000' ✅
setup({ port: 8080 })          // 'localhost:8080' ✅
setup(null)                    // TypeError — null can't be destructured, only undefined triggers = {}
// Additional protection: setup(config ?? {})
```

---

## K — Coding Challenge + Solution

### Challenge

Write a `mergeDefaults(defaults, overrides)` function that deeply merges only one level using spread. Then demonstrate removing fields with rest destructuring. Extract `first` and `last` from a `fullName` array using destructuring with a rest.

### Solution

```javascript
// One-level deep merge (nested objects overridden, not merged)
const mergeDefaults = (defaults, overrides = {}) => ({
  ...defaults,
  ...overrides,
  // Merge nested 'options' if both have it
  ...(defaults.options || overrides.options
    ? { options: { ...defaults.options, ...overrides.options } }
    : {}),
})

const defaults = { timeout: 5000, retries: 3, options: { verbose: false, cache: true } }
const overrides = { timeout: 10000, options: { verbose: true } }
console.log(mergeDefaults(defaults, overrides))
// { timeout:10000, retries:3, options:{ verbose:true, cache:true } }

// Remove sensitive fields
const record = { id: 1, name: 'Mark', secret: 'abc', token: 'xyz' }
const { secret, token, ...publicRecord } = record
console.log(publicRecord)  // { id:1, name:'Mark' }

// Array destructuring with rest
const fullName = ['Mark', 'Anthony', 'Austin']
const [first, ...rest] = fullName
console.log(first)  // 'Mark'
console.log(rest)   // ['Anthony', 'Austin']
```

---

---
