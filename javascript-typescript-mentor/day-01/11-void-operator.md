# 11 — `void` Operator

## T — TL;DR

`void` evaluates an expression and returns `undefined`. Always.

```js
void 0         // undefined
void "hello"   // undefined
void (1 + 2)   // undefined
```

## K — Key Concepts

### Basic Behavior

```js
void 0          // undefined
void 42         // undefined
void "anything" // undefined

const result = void console.log("hi") // logs "hi", result = undefined
```

### Why It Exists

**1. Guaranteed `undefined`**

In old JavaScript, `undefined` could be reassigned as a variable name:

```js
// Old JS (non-strict mode)
var undefined = "oops"
console.log(undefined) // "oops"

// void 0 always returns the real undefined
void 0 // always undefined, no matter what
```

In modern strict mode this is no longer an issue, but `void 0` is still used by minifiers because it's shorter than `undefined`.

**2. Preventing navigation in `href`**

```html
<!-- Old pattern in HTML -->
<a href="javascript:void(0)">Click me</a>
```

This prevents the browser from navigating when the link is clicked.

**3. Arrow functions — discarding return values**

```js
// Without void — accidentally returns the result of apiCall
const onClick = () => apiCall()

// With void — explicitly returns undefined
const onClick = () => void apiCall()
```

This matters when a framework expects `undefined` return (like some event handlers).

**4. IIFEs**

```js
void function() {
  console.log("runs immediately")
}()
```

`void` forces the parser to treat `function` as an expression, not a declaration.

### Minification

Minifiers like Terser replace `undefined` with `void 0` because it's 2 characters shorter.

```js
// Before minification
if (x === undefined) {}

// After minification
if (x === void 0) {}
```

## W — Why It Matters

- You'll see `void 0` in minified code and some library source.
- The arrow function pattern (`() => void expr`) prevents accidental return values.
- Understanding `void` shows deep JS knowledge in interviews.
- It's a minor topic but one that trips people up when they encounter it.

## I — Interview Questions with Answers

### Q1: What does `void` do?

**A:** It evaluates an expression and returns `undefined`, regardless of what the expression produces.

### Q2: Why would you use `void 0` instead of `undefined`?

**A:** Historically, `undefined` could be overwritten. `void 0` always produces the real `undefined`. Modern minifiers also use it because it's shorter.

### Q3: What is `javascript:void(0)` used for?

**A:** In HTML `href` attributes, it prevents navigation when a link is clicked.

## C — Common Pitfalls with Fix

### Pitfall: Thinking `void` is a function

```js
void(0) // works but void is an operator, not a function
void 0  // same thing — no parentheses needed
```

**Fix:** Understand it's a **unary operator**, like `typeof`.

### Pitfall: Unexpected return in arrow functions

```js
const handler = () => map.set(key, value) // returns the Map
```

**Fix:**

```js
const handler = () => void map.set(key, value) // returns undefined
```

## K — Coding Challenge with Solution

### Challenge

```js
console.log(void 0)
console.log(void "hello")
console.log(typeof void 0)

const fn = () => void console.log("side effect")
console.log(fn())
```

### Solution

```js
void 0                // undefined
void "hello"          // undefined
typeof void 0         // "undefined"

// fn() logs "side effect" and returns undefined
// console.log(fn()) prints:
// "side effect"    ← from console.log inside
// undefined        ← from console.log(fn())
```

---
