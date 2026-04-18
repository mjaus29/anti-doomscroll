# 3 — Primitives vs Objects

## T — TL;DR

JavaScript values split into two categories:

| Primitives | Objects |
|------------|---------|
| `string`, `number`, `bigint`, `boolean`, `undefined`, `null`, `symbol` | Everything else: `{}`, `[]`, `function`, `Date`, `RegExp`, `Map`, `Set`, etc. |
| Stored **by value** | Stored **by reference** |
| **Immutable** | **Mutable** |
| Compared **by value** | Compared **by reference** |

## K — Key Concepts

### The 7 Primitives

```js
const str = "hello"        // string
const num = 42             // number
const big = 9007199254740991n // bigint
const bool = true          // boolean
const undef = undefined    // undefined
const nul = null           // null
const sym = Symbol("id")   // symbol
```

### Stored by Value vs by Reference

Primitives copy the **actual value**:

```js
let a = 10
let b = a    // b gets a COPY of 10
b = 20
console.log(a) // 10 — unchanged
```

Objects copy the **reference** (memory address):

```js
let obj1 = { name: "Mark" }
let obj2 = obj1  // obj2 points to the SAME object
obj2.name = "Alex"
console.log(obj1.name) // "Alex" — both point to the same object
```

### Compared by Value vs by Reference

```js
// Primitives — compared by value
"hello" === "hello"  // true
42 === 42            // true

// Objects — compared by reference
{ name: "Mark" } === { name: "Mark" }  // false — different objects in memory
[1, 2] === [1, 2]                      // false

const a = { x: 1 }
const b = a
a === b  // true — same reference
```

### Primitives Are Immutable

You cannot change a primitive value. Operations create **new values**.

```js
let str = "hello"
str.toUpperCase()   // returns "HELLO" — does NOT change str
console.log(str)    // "hello"

str = str.toUpperCase() // reassignment — str now points to new string "HELLO"
```

### Autoboxing (Wrapper Objects)

When you call a method on a primitive, JS temporarily wraps it in an object:

```js
"hello".toUpperCase() // JS wraps "hello" in a String object, calls the method, discards the wrapper
```

The wrapper types exist: `String`, `Number`, `Boolean`, `Symbol`, `BigInt`. But **never use `new String()` etc.** directly.

```js
typeof "hello"           // "string" (primitive)
typeof new String("hello") // "object" (wrapper — avoid this)
```

### Passing to Functions

```js
// Primitives — pass by value
function increment(n) {
  n = n + 1
}
let x = 5
increment(x)
console.log(x) // 5 — unchanged

// Objects — pass by reference (the reference is copied)
function rename(obj) {
  obj.name = "Alex"
}
const user = { name: "Mark" }
rename(user)
console.log(user.name) // "Alex" — changed
```

Important nuance: JavaScript is **pass by value**, but for objects the "value" that gets passed is the **reference**. This means:

```js
function replace(obj) {
  obj = { name: "New" } // reassigns local variable, does NOT affect original
}
const user = { name: "Mark" }
replace(user)
console.log(user.name) // "Mark" — unchanged
```

### `null` vs `undefined`

```js
let a          // undefined — declared but no value assigned
let b = null   // null — explicitly "no value"

typeof undefined // "undefined"
typeof null      // "object" ← historical bug in JS, never fixed
```

## W — Why It Matters

- Misunderstanding reference vs value is the #1 source of mutation bugs.
- Knowing that `===` on objects compares references, not contents, prevents subtle bugs.
- Autoboxing explains why `"hello".length` works even though strings are primitives.
- Interview questions test this constantly: "What gets logged?" with object mutations.

## I — Interview Questions with Answers

### Q1: What are the primitive types in JavaScript?

**A:** `string`, `number`, `bigint`, `boolean`, `undefined`, `null`, and `symbol`. There are 7 total.

### Q2: What is the difference between primitives and objects?

**A:** Primitives are immutable, stored by value, and compared by value. Objects are mutable, stored by reference, and compared by reference (identity).

### Q3: Why does `typeof null` return `"object"`?

**A:** It's a historical bug from the first implementation of JavaScript. The internal type tag for `null` was `0`, which was the same tag used for objects. It was never fixed for backward compatibility.

### Q4: What does this print?

```js
const a = [1, 2, 3]
const b = a
b.push(4)
console.log(a)
```

**A:** `[1, 2, 3, 4]`. `b` is not a copy — it's a reference to the same array. Mutating through `b` affects `a`.

### Q5: How do you compare two objects by value?

**A:** There is no built-in deep equality. Options:
- `JSON.stringify(a) === JSON.stringify(b)` (limited — property order matters, can't handle `undefined`, functions, circular refs).
- Use a library like Lodash's `_.isEqual`.
- `structuredClone` doesn't compare, but it deep copies.

## C — Common Pitfalls with Fix

### Pitfall: Accidentally mutating shared objects

```js
const defaults = { theme: "dark" }
const userSettings = defaults
userSettings.theme = "light"
console.log(defaults.theme) // "light" — oops
```

**Fix:** Create a copy:

```js
const userSettings = { ...defaults }
```

### Pitfall: Comparing arrays/objects with `===`

```js
[1, 2] === [1, 2] // false
```

**Fix:** Use deep comparison or serialize.

### Pitfall: Thinking `typeof null` is `"null"`

**Fix:** Remember `typeof null === "object"`. To check for null, use `value === null`.

### Pitfall: Thinking string methods mutate the string

```js
let s = "hello"
s.toUpperCase()
console.log(s) // "hello" — unchanged!
```

**Fix:** Reassign: `s = s.toUpperCase()`

## K — Coding Challenge with Solution

### Challenge

What does each `console.log` print?

```js
let x = "hello"
let y = x
y = "world"
console.log(x)

const a = { count: 1 }
const b = a
b.count = 2
console.log(a.count)

const arr1 = [1, 2]
const arr2 = [1, 2]
console.log(arr1 === arr2)

console.log(typeof null)
console.log(typeof undefined)
```

### Solution

```js
console.log(x)            // "hello" — primitives copy by value
console.log(a.count)      // 2 — objects share reference
console.log(arr1 === arr2) // false — different references
console.log(typeof null)   // "object" — historical bug
console.log(typeof undefined) // "undefined"
```

---
