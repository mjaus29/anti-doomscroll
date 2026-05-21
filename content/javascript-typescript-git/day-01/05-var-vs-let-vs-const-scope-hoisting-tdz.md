# 5 — var vs let vs const — Scope, Hoisting, TDZ

---

## T — TL;DR

Use `const` by default. Use `let` when you need to reassign. Never use `var`. `var` is function-scoped and hoisted with `undefined`. `let`/`const` are block-scoped and hoisted but inaccessible until their declaration (Temporal Dead Zone). `const` prevents reassignment but NOT mutation of objects/arrays.

---

## K — Key Concepts

```javascript
// ── Scope ─────────────────────────────────────────────────────────────────
function example() {
  if (true) {
    var   a = 1   // function-scoped — leaks out of the block
    let   b = 2   // block-scoped — stays inside {}
    const c = 3   // block-scoped — stays inside {}
  }
  console.log(a)  // 1 ✅ (leaked)
  console.log(b)  // ReferenceError ❌
  console.log(c)  // ReferenceError ❌
}

// ── Hoisting ──────────────────────────────────────────────────────────────
// var — hoisted AND initialised to undefined
console.log(x)   // undefined (not an error)
var x = 10

// let/const — hoisted but NOT initialised (Temporal Dead Zone)
console.log(y)   // ReferenceError: Cannot access 'y' before initialization
let y = 20

// ── Temporal Dead Zone (TDZ) ──────────────────────────────────────────────
// TDZ = the region between block start and the let/const declaration line
{
  // ← TDZ for 'name' starts here
  console.log(name)   // ReferenceError (in TDZ)
  let name = 'Mark'   // ← TDZ ends here
  console.log(name)   // 'Mark' ✅
}
```

```javascript
// ── const ≠ immutable ──────────────────────────────────────────────────────
const user = { name: 'Mark' }
user.name = 'Alex'     // ✅ mutation allowed — modifying the object
user = {}              // ❌ TypeError — reassigning the binding

const arr = [1, 2, 3]
arr.push(4)            // ✅ allowed — mutating the array
arr = [5, 6]           // ❌ TypeError

// True shallow immutability: Object.freeze()
const frozen = Object.freeze({ name: 'Mark', score: 100 })
frozen.name = 'Alex'   // silently fails (or throws in strict mode)
console.log(frozen.name)  // still 'Mark'

// ── The var loop bug ──────────────────────────────────────────────────────
// ❌ var — one shared i across all callbacks
for (var i = 0; i < 3; i++) {
  setTimeout(() => console.log(i), 100)  // prints 3, 3, 3
}

// ✅ let — new binding per iteration
for (let i = 0; i < 3; i++) {
  setTimeout(() => console.log(i), 100)  // prints 0, 1, 2
}
```

```javascript
// ── Redeclaration ─────────────────────────────────────────────────────────
var a = 1; var a = 2   // ✅ silently allowed (bad)
let b = 1; let b = 2   // ❌ SyntaxError
const c = 1; const c = 2  // ❌ SyntaxError

// ── Decision rule ─────────────────────────────────────────────────────────
// Start with const → only switch to let if you NEED to reassign
// Never use var in new code
```

---

## W — Why It Matters

- The `var` loop + `setTimeout` bug is a classic interview question and a real production bug — async callbacks closed over `var i` share the same reference and see the final value. `let` fixes this by creating a new binding per iteration.
- `const` communicates intent — it tells the next developer "this binding will not change." Even if `const` doesn't prevent all mutation, it signals predictability.
- TDZ errors are confusing without context — a `ReferenceError` on a variable you can clearly see declared in the same block means you're accessing it above its declaration. The fix is always to move the access below the declaration.

---

## I — Interview Q&A

### Q: What is the Temporal Dead Zone?

**A:** The TDZ is the period between when a block starts executing and when the `let` or `const` declaration is reached. During this period, the variable is hoisted (the JavaScript engine knows it exists) but not initialised — accessing it throws a `ReferenceError`. This is intentional: it prevents reading uninitialised variables, which `var` allowed (returning `undefined`). The fix is simple: always declare variables before using them.

### Q: Is `const` immutable?

**A:** No. `const` prevents reassignment of the variable binding — you can't point `const user` at a different object. But the object itself is mutable — `user.name = 'Alex'` works fine. For shallow immutability, use `Object.freeze()`. For deep immutability, you'd need a recursive freeze or a library like Immer.

---

## C — Common Pitfalls + Fix

### ❌ Using `var` in a loop with async callbacks

```javascript
// ❌ All three callbacks share the same var i = 3
for (var i = 0; i < 3; i++) {
  setTimeout(() => console.log(i), 100)  // 3, 3, 3
}

// ✅ let creates a fresh binding each iteration
for (let i = 0; i < 3; i++) {
  setTimeout(() => console.log(i), 100)  // 0, 1, 2
}
```

---

## K — Coding Challenge + Solution

### Challenge

What does each `console.log` print (or does it throw)?

```javascript
console.log(a)
console.log(b)
var a = 1
let b = 2
for (var i = 0; i < 3; i++) {}
console.log(i)
const arr = [1, 2]
arr.push(3)
console.log(arr)
const obj = { x: 1 }
obj = { x: 2 }
```

### Solution

```javascript
console.log(a)   // undefined  — var hoisted, init to undefined
console.log(b)   // ReferenceError — let in TDZ, stops execution here

// If we skip the TDZ error:
var a = 1
let b = 2
for (var i = 0; i < 3; i++) {}
console.log(i)   // 3 — var leaks out of for block

const arr = [1, 2]
arr.push(3)
console.log(arr) // [1, 2, 3] — mutation is allowed

const obj = { x: 1 }
obj = { x: 2 }   // TypeError: Assignment to constant variable
```

---

---
