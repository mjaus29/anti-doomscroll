# 7 — Operators

## T — TL;DR

JavaScript operators work on values and return results. Beyond basic `+`, `-`, `*`, `/`, there are important behaviors and lesser-known operators you need to know.

Key groups:
- **Arithmetic**: `+`, `-`, `*`, `/`, `%`, `**`
- **Comparison**: `<`, `>`, `<=`, `>=`
- **Assignment**: `=`, `+=`, `-=`, `*=`, etc.
- **Bitwise**: `&`, `|`, `^`, `~`, `<<`, `>>`, `>>>`
- **Logical**: `&&`, `||`, `!`
- **Comma**: `,`
- **Unary**: `+`, `-`, `typeof`, `delete`, `void`
- **Ternary**: `? :`

## K — Key Concepts

### Arithmetic Operators

```js
10 + 3   // 13
10 - 3   // 7
10 * 3   // 30
10 / 3   // 3.3333...
10 % 3   // 1 (remainder)
2 ** 3   // 8 (exponentiation)
```

### Unary `+` and `-`

Unary `+` converts to number:

```js
+"5"     // 5
+true    // 1
+false   // 0
+null    // 0
+""      // 0
+"abc"   // NaN
```

Unary `-` negates:

```js
-"5"     // -5
-true    // -1
```

### Increment/Decrement

```js
let a = 5

a++  // returns 5, then a becomes 6 (postfix)
++a  // a becomes 7, returns 7 (prefix)
a--  // returns 7, then a becomes 6 (postfix)
--a  // a becomes 5, returns 5 (prefix)
```

### Comparison with Coercion

```js
"5" > 3    // true — "5" coerced to 5
"abc" > 3  // false — "abc" coerced to NaN, any comparison with NaN = false
```

String comparison is lexicographic (character by character by Unicode):

```js
"banana" > "apple"  // true — 'b' > 'a'
"10" > "9"          // false — '1' < '9' (string comparison!)
```

### Logical Operators (Short-Circuit)

`&&` and `||` return **one of the operands**, not `true`/`false`.

```js
// && returns first falsy value, or last value if all truthy
0 && "hello"      // 0
1 && "hello"      // "hello"
"a" && "b" && "c" // "c"

// || returns first truthy value, or last value if all falsy
0 || "hello"      // "hello"
"" || null || "default" // "default"
"a" || "b"        // "a"
```

### Ternary Operator

```js
const status = age >= 18 ? "adult" : "minor"
```

### Comma Operator

Evaluates each expression left to right, returns the **last** one:

```js
const x = (1, 2, 3) // x = 3
```

Rarely used intentionally, but appears in `for` loops:

```js
for (let i = 0, j = 10; i < j; i++, j--) {}
```

### Operator Precedence (Key Rules)

Higher precedence executes first:

```
Grouping:     ( )
Unary:        ! ++ -- typeof
Exponent:     **
Multiply/Div: * / %
Add/Sub:      + -
Comparison:   < > <= >=
Equality:     == === != !==
Logical AND:  &&
Logical OR:   ||
Nullish:      ??
Ternary:      ? :
Assignment:   = += -= etc.
Comma:        ,
```

When in doubt, use parentheses.

## W — Why It Matters

- Operators are the building blocks of every expression.
- Short-circuit evaluation is used everywhere: default values, guard checks, conditional execution.
- Misunderstanding precedence causes hard-to-spot bugs.
- Interviewers test postfix/prefix increment and short-circuit behavior.

## I — Interview Questions with Answers

### Q1: What does `&&` actually return?

**A:** The first **falsy** value, or the **last value** if all are truthy. It does not always return a boolean.

### Q2: What does `||` actually return?

**A:** The first **truthy** value, or the **last value** if all are falsy.

### Q3: What is the difference between `a++` and `++a`?

**A:** `a++` (postfix) returns the current value then increments. `++a` (prefix) increments first then returns the new value.

### Q4: Why is `"10" > "9"` false?

**A:** Because both operands are strings, so JavaScript does lexicographic comparison. `'1'` (Unicode 49) is less than `'9'` (Unicode 57).

## C — Common Pitfalls with Fix

### Pitfall: Relying on operator precedence from memory

```js
true || false && false // true — && has higher precedence than ||
```

**Fix:** Use parentheses: `true || (false && false)`.

### Pitfall: String comparison when numbers are expected

```js
"10" > "9" // false — string comparison, not numeric
```

**Fix:** Convert to numbers: `Number("10") > Number("9")`.

### Pitfall: Confusing `||` with `??`

```js
0 || "default"  // "default" — 0 is falsy
0 ?? "default"  // 0 — ?? only catches null/undefined
```

**Fix:** Use `??` when `0`, `""`, and `false` are valid values (covered in topic 10).

## K — Coding Challenge with Solution

### Challenge

```js
let a = 1
const b = a++ + ++a
console.log(b)
console.log(a)

console.log(0 && "hello")
console.log(1 && "hello")
console.log("" || "default")
console.log("value" || "default")
```

### Solution

```js
// a starts at 1
// a++ returns 1, a becomes 2
// ++a increments a to 3, returns 3
// b = 1 + 3 = 4
console.log(b) // 4
console.log(a) // 3

console.log(0 && "hello")        // 0 (first falsy)
console.log(1 && "hello")        // "hello" (all truthy, returns last)
console.log("" || "default")     // "default" (first truthy)
console.log("value" || "default") // "value" (first truthy)
```

---
