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
