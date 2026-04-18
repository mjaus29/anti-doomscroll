# 2 — `var`, `let` & `const`

## T — TL;DR

JavaScript has three ways to declare variables:

| Keyword | Scope | Reassign? | Hoist behavior |
|---------|-------|-----------|----------------|
| `var` | Function | Yes | Hoisted, initialized to `undefined` |
| `let` | Block | Yes | Hoisted, but in TDZ |
| `const` | Block | No | Hoisted, but in TDZ |

**Default to `const`. Use `let` when mutation is needed. Avoid `var`.**

## K — Key Concepts

### Scope

**`var`** is **function-scoped** — it ignores block boundaries like `if`, `for`, `while`.

**`let`** and **`const`** are **block-scoped** — they exist only inside the nearest `{ }`.

```js
function example() {
  if (true) {
    var a = 1
    let b = 2
    const c = 3
  }

  console.log(a) // 1 — var escapes the block
  // console.log(b) // ReferenceError
  // console.log(c) // ReferenceError
}
```

### Reassignment

```js
let count = 0
count = 1 // ✅ allowed

const name = "Mark"
// name = "Alex" // ❌ TypeError: Assignment to constant variable
```

### `const` Does NOT Mean Immutable

`const` prevents **reassignment of the binding**, not **mutation of the value**.

```js
const user = { name: "Mark" }
user.name = "Alex" // ✅ allowed — mutating the object
// user = {}       // ❌ error — reassigning the binding

const arr = [1, 2, 3]
arr.push(4)        // ✅ allowed
// arr = [5, 6]    // ❌ error
```

If you want true shallow immutability:

```js
const frozen = Object.freeze({ name: "Mark" })
frozen.name = "Alex" // silently fails (or throws in strict mode)
console.log(frozen.name) // "Mark"
```

### Hoisting

All declarations are hoisted to the top of their scope, but they behave differently:

```js
// var — hoisted and initialized to undefined
console.log(x) // undefined
var x = 10

// let — hoisted but NOT initialized (Temporal Dead Zone)
// console.log(y) // ReferenceError: Cannot access 'y' before initialization
let y = 20

// const — same TDZ behavior
// console.log(z) // ReferenceError
const z = 30
```

### The `var` Problem in Loops

```js
// Classic bug with var
for (var i = 0; i < 3; i++) {
  setTimeout(() => console.log(i), 100)
}
// Prints: 3, 3, 3 — because var is function-scoped, all callbacks share ONE i

// Fix: use let
for (let i = 0; i < 3; i++) {
  setTimeout(() => console.log(i), 100)
}
// Prints: 0, 1, 2 — because let creates a new binding per iteration
```

### Redeclaration

```js
var a = 1
var a = 2 // ✅ allowed (silently overwrites)

let b = 1
// let b = 2 // ❌ SyntaxError: Identifier 'b' has already been declared

const c = 1
// const c = 2 // ❌ SyntaxError
```

## W — Why It Matters

- `var` bugs are one of the most common legacy JS issues.
- Understanding scoping is foundational for closures (Day 3).
- `const` by default communicates intent: "this binding will not change."
- Interviewers test `var` vs `let` vs `const` frequently because it reveals depth of understanding.
- The loop bug with `var` + `setTimeout` is a classic interview question.

## I — Interview Questions with Answers

### Q1: What are the differences between `var`, `let`, and `const`?

**A:**
- `var` is function-scoped, hoisted with `undefined`, and allows redeclaration.
- `let` is block-scoped, hoisted into TDZ, allows reassignment, no redeclaration.
- `const` is block-scoped, hoisted into TDZ, does NOT allow reassignment or redeclaration.

### Q2: What is the Temporal Dead Zone?

**A:** The region between the start of the block and the line where `let` or `const` is declared. Accessing the variable in the TDZ throws a `ReferenceError`. The variable is hoisted but not initialized.

### Q3: Is `const` immutable?

**A:** No. `const` prevents reassignment of the variable binding. Objects and arrays declared with `const` can still be mutated. Use `Object.freeze()` for shallow immutability.

### Q4: What does this print and why?

```js
for (var i = 0; i < 3; i++) {
  setTimeout(() => console.log(i), 0)
}
```

**A:** It prints `3, 3, 3`. Because `var` is function-scoped, there is only one `i` shared across all iterations. By the time the callbacks run, the loop has finished and `i` is `3`. Using `let` instead creates a new `i` per iteration, printing `0, 1, 2`.

## C — Common Pitfalls with Fix

### Pitfall: Using `var` in blocks and expecting block scope

```js
if (true) { var x = 5 }
console.log(x) // 5 — leaked!
```

**Fix:** Use `let` or `const`.

### Pitfall: Thinking `const` makes objects immutable

```js
const obj = { a: 1 }
obj.a = 2 // ✅ this works
```

**Fix:** Remember `const` = constant **binding**, not constant **value**. Use `Object.freeze()` if needed.

### Pitfall: Defaulting to `let` for everything

**Fix:** Start with `const`. Only switch to `let` when you have a concrete need to reassign.

### Pitfall: Accessing `let`/`const` before declaration

```js
console.log(name) // ReferenceError
let name = "Mark"
```

**Fix:** Always declare variables before using them.

## K — Coding Challenge with Solution

### Challenge

What does each `console.log` print? (or does it error?)

```js
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

```js
console.log(a)  // undefined (var is hoisted, initialized to undefined)
console.log(b)  // ReferenceError (let is in TDZ) — execution stops here

// If we commented out the line above:
var a = 1
let b = 2

for (var i = 0; i < 3; i++) {}
console.log(i)  // 3 (var is function-scoped, i leaked out)

const arr = [1, 2]
arr.push(3)
console.log(arr) // [1, 2, 3] (mutation is allowed with const)

const obj = { x: 1 }
obj = { x: 2 }  // TypeError: Assignment to constant variable
```

---
