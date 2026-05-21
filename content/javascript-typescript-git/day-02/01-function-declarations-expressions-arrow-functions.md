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
