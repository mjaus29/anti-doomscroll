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
