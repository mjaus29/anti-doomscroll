# 4 — Type Coercion

## T — TL;DR

JavaScript automatically converts values between types when operators or comparisons expect a different type. This is called **type coercion** (or implicit conversion).

- **Implicit coercion** — JS does it for you (often surprising).
- **Explicit coercion** — You do it intentionally with `String()`, `Number()`, `Boolean()`.

Most bugs from coercion come from `+` (string concatenation vs addition) and `==` (loose equality).

## K — Key Concepts

### Three Target Types

Coercion always converts to one of: **string**, **number**, or **boolean**.

### String Coercion

Triggered by `+` when one operand is a string, or by `String()`.

```js
"5" + 3      // "53" — number coerced to string
"5" + true   // "5true"
"5" + null   // "5null"
"5" + undefined // "5undefined"

String(123)  // "123"
String(true) // "true"
String(null) // "null"
String(undefined) // "undefined"
```

### Number Coercion

Triggered by `-`, `*`, `/`, `%`, `**`, unary `+`, or `Number()`.

```js
"5" - 3      // 2
"5" * 2      // 10
"5" / 1      // 5
true + 1     // 2
false + 1    // 1
null + 1     // 1 (null → 0)
undefined + 1 // NaN (undefined → NaN)

Number("")        // 0
Number(" ")       // 0
Number("123")     // 123
Number("123abc")  // NaN
Number(true)      // 1
Number(false)     // 0
Number(null)      // 0
Number(undefined) // NaN
```

### Boolean Coercion

Triggered by `if`, `!`, `!!`, `&&`, `||`, or `Boolean()`.

**Falsy values** (these become `false`):

```js
Boolean(false)     // false
Boolean(0)         // false
Boolean(-0)        // false
Boolean(0n)        // false (BigInt zero)
Boolean("")        // false
Boolean(null)      // false
Boolean(undefined) // false
Boolean(NaN)       // false
```

**Everything else is truthy**, including:

```js
Boolean("0")       // true — non-empty string
Boolean(" ")       // true — non-empty string
Boolean([])        // true — empty array is truthy!
Boolean({})        // true — empty object is truthy!
Boolean("false")   // true — non-empty string
```

### Object-to-Primitive Coercion

When an object is coerced, JavaScript calls these internal methods in order:

1. `[Symbol.toPrimitive](hint)` if defined (covered more on Day 3/7)
2. `valueOf()` — for number hint
3. `toString()` — for string hint

```js
const obj = {
  valueOf() { return 42 },
  toString() { return "hello" },
}

obj + 1   // 43 — valueOf() called
`${obj}`  // "hello" — toString() called for template literals
```

### The `+` Operator Confusion

`+` does double duty: **addition** and **string concatenation**.

Rule: if either operand is a string, it concatenates.

```js
1 + 2         // 3
"1" + 2       // "12"
1 + "2"       // "12"
1 + 2 + "3"   // "33" — left to right: (1+2) = 3, then 3+"3" = "33"
"1" + 2 + 3   // "123" — "1"+"2" = "12", then "12"+"3" = "123"
```

## W — Why It Matters

- Coercion is behind most "JavaScript is weird" memes — but it follows clear rules.
- Understanding coercion prevents subtle bugs in comparisons and arithmetic.
- Using explicit coercion (`Number()`, `String()`, `Boolean()`) makes code readable and predictable.
- Interviewers love tricky coercion questions to test JS depth.

## I — Interview Questions with Answers

### Q1: What is type coercion?

**A:** Automatic conversion of one type to another by the JavaScript engine. It happens implicitly (by operators/comparisons) or explicitly (by calling `Number()`, `String()`, `Boolean()`).

### Q2: What are the falsy values in JavaScript?

**A:** `false`, `0`, `-0`, `0n`, `""`, `null`, `undefined`, `NaN`. Everything else is truthy — including `[]`, `{}`, and `"0"`.

### Q3: What does `[] + []` return?

**A:** `""` (empty string). Both arrays are coerced to strings via `.toString()`, which gives `""` for empty arrays. Then `"" + ""` = `""`.

### Q4: What does `[] + {}` return?

**A:** `"[object Object]"`. `[].toString()` = `""`, `{}.toString()` = `"[object Object]"`. Concatenated: `"[object Object]"`.

### Q5: What does `{} + []` return?

**A:** It depends on context. In the console, `{}` is parsed as an empty block (not an object), so it becomes `+[]` = `0`. In an expression context (like `({} + [])`) it returns `"[object Object]"`.

## C — Common Pitfalls with Fix

### Pitfall: Using `+` for number addition with string input

```js
"5" + 3 // "53" — not 8
```

**Fix:** Explicitly convert: `Number("5") + 3` or `parseInt("5") + 3`.

### Pitfall: Truthy empty arrays

```js
if ([]) { console.log("truthy!") } // runs — [] is truthy
```

**Fix:** Check `.length`:

```js
if ([].length) { console.log("has items") } // does not run
```

### Pitfall: `null` and `undefined` behave differently in number coercion

```js
Number(null)      // 0
Number(undefined) // NaN
```

**Fix:** Know the table. `null` → `0`, `undefined` → `NaN`.

## K — Coding Challenge with Solution

### Challenge

Predict each result:

```js
"5" - 3
"5" + 3
true + true
!!""
!![]
null + 1
undefined + 1
"" == false
```

### Solution

```js
"5" - 3       // 2 (string coerced to number)
"5" + 3       // "53" (number coerced to string)
true + true   // 2 (true → 1)
!!""          // false (empty string is falsy)
!![]          // true (arrays are truthy)
null + 1      // 1 (null → 0)
undefined + 1 // NaN (undefined → NaN)
"" == false   // true (both coerce to 0)
```

---
