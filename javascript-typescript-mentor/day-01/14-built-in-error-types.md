# 14 — Built-in Error Types (`TypeError`, `RangeError`, `SyntaxError`)

## T — TL;DR

JavaScript has several built-in error constructors. The most common:

| Error | Trigger |
|-------|---------|
| `TypeError` | Wrong type or `null`/`undefined` access |
| `RangeError` | Value outside allowed range |
| `SyntaxError` | Invalid syntax (usually at parse time) |
| `ReferenceError` | Accessing undeclared variable |
| `URIError` | Bad `encodeURI`/`decodeURI` usage |
| `EvalError` | Legacy (rarely seen) |

All inherit from `Error`.

## K — Key Concepts

### `TypeError`

The most common runtime error. Triggered when:
- Accessing a property on `null` or `undefined`
- Calling something that isn't a function
- Assigning to a `const`

```js
null.toString()         // TypeError: Cannot read properties of null
undefined.name          // TypeError: Cannot read properties of undefined
"hello"()               // TypeError: "hello" is not a function

const x = 1
x = 2                   // TypeError: Assignment to constant variable
```

### `RangeError`

Triggered when a numeric value is out of range:

```js
new Array(-1)                // RangeError: Invalid array length
(1).toFixed(200)             // RangeError: toFixed() digits argument must be between 0 and 100
function f() { f() }; f()   // RangeError: Maximum call stack size exceeded
```

### `SyntaxError`

Triggered when the code cannot be parsed. Usually caught at **parse time**, not runtime.

```js
JSON.parse("{invalid}")  // SyntaxError: Unexpected token i in JSON
eval("if (")             // SyntaxError: Unexpected end of input
```

Note: `SyntaxError` at parse time cannot be caught with `try`/`catch` because the code never runs:

```js
// This ENTIRE file fails to parse:
try {
  const x = ;  // SyntaxError — try/catch doesn't help
} catch (e) {}
```

But runtime `SyntaxError` (like from `JSON.parse` or `eval`) CAN be caught:

```js
try {
  JSON.parse("bad json")
} catch (e) {
  console.log(e instanceof SyntaxError) // true
}
```

### `ReferenceError`

```js
console.log(x) // ReferenceError: x is not defined (when x was never declared)

let y = 1
{
  console.log(y) // ReferenceError: Cannot access 'y' before initialization (TDZ)
  let y = 2
}
```

### The Error Hierarchy

```
Error
├── TypeError
├── RangeError
├── SyntaxError
├── ReferenceError
├── URIError
└── EvalError
```

All errors have:
- `.message` — human-readable description
- `.name` — error type name
- `.stack` — stack trace (non-standard but universally supported)

### `instanceof` for Error Checking

```js
try {
  null.toString()
} catch (e) {
  if (e instanceof TypeError) {
    console.log("Type error!")
  } else if (e instanceof RangeError) {
    console.log("Range error!")
  }
}
```

## W — Why It Matters

- You encounter `TypeError` daily — knowing why it happens speeds up debugging.
- `RangeError` from recursion indicates infinite loops or missing base cases.
- Knowing which errors are catchable vs parse-time prevents wasted `try`/`catch` blocks.
- Interviews often ask "what error does this throw?" as a reading comprehension test.

## I — Interview Questions with Answers

### Q1: What is the most common error type in JavaScript?

**A:** `TypeError`. It occurs when accessing properties on `null`/`undefined`, calling non-functions, or assigning to constants.

### Q2: Can you catch a `SyntaxError`?

**A:** Only runtime `SyntaxError` (from `JSON.parse`, `eval`, `new Function`). Parse-time syntax errors cannot be caught because the code never executes.

### Q3: What error does infinite recursion cause?

**A:** `RangeError: Maximum call stack size exceeded`.

### Q4: What properties do all error objects have?

**A:** `.message`, `.name`, and `.stack` (non-standard but universal).

## C — Common Pitfalls with Fix

### Pitfall: Catching all errors the same way

```js
catch (e) {
  console.log("Something went wrong")
}
```

**Fix:** Use `instanceof` to handle different error types differently.

### Pitfall: Trying to catch parse-time `SyntaxError`

**Fix:** Parse-time errors crash before any code runs. Only runtime errors from `JSON.parse`, `eval`, etc. can be caught.

### Pitfall: Confusing `ReferenceError` and `TypeError`

```js
undeclaredVar.name    // ReferenceError — variable not declared
let x = null; x.name // TypeError — variable exists but is null
```

## K — Coding Challenge with Solution

### Challenge

Name the error type for each:

```js
null.toString()
new Array(-1)
JSON.parse("{bad}")
console.log(notDeclared)
const z = 1; z = 2
```

### Solution

```js
null.toString()              // TypeError
new Array(-1)                // RangeError
JSON.parse("{bad}")          // SyntaxError
console.log(notDeclared)     // ReferenceError
const z = 1; z = 2          // TypeError (assignment to constant)
```

---
