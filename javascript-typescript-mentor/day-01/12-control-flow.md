# 12 — Control Flow

## T — TL;DR

Control flow determines which code runs and when. The core structures:

- **Conditional**: `if`/`else if`/`else`, `switch`
- **Loops**: `for`, `while`, `do...while`, `for...of`, `for...in`
- **Jump statements**: `break`, `continue`, `return`
- **Labels**: named loop targets for `break`/`continue`

## K — Key Concepts

### `if` / `else if` / `else`

```js
const score = 85

if (score >= 90) {
  console.log("A")
} else if (score >= 80) {
  console.log("B") // ← runs
} else {
  console.log("C")
}
```

The condition is coerced to boolean (truthy/falsy rules apply).

### `switch`

```js
const fruit = "apple"

switch (fruit) {
  case "apple":
    console.log("🍎")
    break
  case "banana":
    console.log("🍌")
    break
  default:
    console.log("Unknown")
}
```

Key details:
- Uses **strict equality** (`===`) for comparison.
- Without `break`, execution **falls through** to the next case.

```js
// Fall-through (intentional)
switch (day) {
  case "Saturday":
  case "Sunday":
    console.log("Weekend")
    break
  default:
    console.log("Weekday")
}
```

### `for` Loop

```js
for (let i = 0; i < 5; i++) {
  console.log(i) // 0, 1, 2, 3, 4
}
```

### `while` and `do...while`

```js
let i = 0
while (i < 3) {
  console.log(i) // 0, 1, 2
  i++
}

// do...while runs at least once
let j = 10
do {
  console.log(j) // 10
  j++
} while (j < 3)
```

### `for...of` (Iterables: Arrays, Strings, Maps, Sets)

```js
const arr = ["a", "b", "c"]
for (const item of arr) {
  console.log(item) // "a", "b", "c"
}

const str = "hello"
for (const char of str) {
  console.log(char) // "h", "e", "l", "l", "o"
}
```

### `for...in` (Object Keys)

```js
const obj = { a: 1, b: 2, c: 3 }
for (const key in obj) {
  console.log(key, obj[key]) // "a" 1, "b" 2, "c" 3
}
```

⚠️ `for...in` also iterates **inherited** properties. Use `Object.hasOwn(obj, key)` to filter.

⚠️ **Do NOT use `for...in` on arrays.** It iterates string keys, not values, and can include prototype properties.

### `break` and `continue`

```js
// break — exits the loop
for (let i = 0; i < 10; i++) {
  if (i === 5) break
  console.log(i) // 0, 1, 2, 3, 4
}

// continue — skips to next iteration
for (let i = 0; i < 5; i++) {
  if (i === 2) continue
  console.log(i) // 0, 1, 3, 4
}
```

### Labels

```js
outer: for (let i = 0; i < 3; i++) {
  for (let j = 0; j < 3; j++) {
    if (j === 1) break outer // breaks the outer loop
    console.log(i, j)
  }
}
// Output: 0 0
```

### Ternary as Control Flow

```js
const message = isLoggedIn ? "Welcome back" : "Please log in"
```

Not a replacement for complex `if` blocks — keep ternaries simple.

## W — Why It Matters

- Every program uses control flow.
- Knowing `for...of` vs `for...in` prevents a common category of bugs.
- `switch` fall-through is a frequent interview trap.
- Labels are rare but appear in algorithm challenges.

## I — Interview Questions with Answers

### Q1: What is the difference between `for...of` and `for...in`?

**A:** `for...of` iterates over **values** of iterables (arrays, strings, Maps, Sets). `for...in` iterates over **enumerable property keys** of an object (including inherited ones).

### Q2: What happens if you forget `break` in a `switch`?

**A:** Execution falls through to the next case until it hits a `break` or the end of the `switch`.

### Q3: Does `switch` use `==` or `===`?

**A:** Strict equality (`===`).

### Q4: What is the difference between `while` and `do...while`?

**A:** `do...while` always executes the body **at least once** before checking the condition.

## C — Common Pitfalls with Fix

### Pitfall: Using `for...in` on arrays

```js
const arr = [10, 20, 30]
for (const i in arr) {
  console.log(typeof i) // "string" — keys, not values!
}
```

**Fix:** Use `for...of` for arrays.

### Pitfall: Missing `break` in `switch`

```js
switch (x) {
  case 1:
    doA()
  case 2:
    doB() // runs for case 1 too — fall-through!
}
```

**Fix:** Always include `break` unless fall-through is intentional (and commented).

### Pitfall: Infinite loops

```js
while (true) {} // blocks the entire thread
```

**Fix:** Always ensure your loop has an exit condition.

## K — Coding Challenge with Solution

### Challenge

What is the output?

```js
const items = ["a", "b", "c"]

for (const item of items) {
  if (item === "b") continue
  console.log(item)
}

switch ("2") {
  case 2:
    console.log("number")
    break
  case "2":
    console.log("string")
    break
}

outer: for (let i = 0; i < 2; i++) {
  for (let j = 0; j < 2; j++) {
    if (i === 0 && j === 1) continue outer
    console.log(i, j)
  }
}
```

### Solution

```
a
c
string
0 0
1 0
1 1
```

Explanation:
- `"b"` is skipped by `continue`.
- `switch` uses `===`, so `"2"` matches the string case.
- `continue outer` skips to next iteration of outer loop when `i=0, j=1`, so `0 1` is never printed.

---
