# 6 — Recursion — Base Case, Call Stack, Memoized Recursion

---

## T — TL;DR

**Recursion** is a function that calls itself. Every recursive function needs a **base case** (stop condition) and a **recursive case** (calls itself with a smaller problem). Each call adds a frame to the **call stack** — too many nested calls = stack overflow. **Memoized recursion** caches results to avoid redundant calls.

---

## K — Key Concepts

```javascript
// ── Basic structure: base case + recursive case ───────────────────────────
function factorial(n) {
  if (n <= 1) return 1          // base case: stop recursion
  return n * factorial(n - 1)  // recursive case: smaller problem
}
factorial(5)  // 5 * 4 * 3 * 2 * 1 = 120

// ── Call stack trace for factorial(4) ─────────────────────────────────────
// factorial(4) → 4 * factorial(3)
//   factorial(3) → 3 * factorial(2)
//     factorial(2) → 2 * factorial(1)
//       factorial(1) → 1  ← base case, unwinds
//     factorial(2) = 2 * 1 = 2
//   factorial(3) = 3 * 2 = 6
// factorial(4) = 4 * 6 = 24
```

```javascript
// ── Stack overflow ────────────────────────────────────────────────────────
function infinite(n) {
  return infinite(n + 1)   // no base case → stack overflow
}
// infinite(0)  // RangeError: Maximum call stack size exceeded

// Node.js default stack: ~10,000–15,000 frames
// ❌ Recursion on large arrays/trees without tail call optimisation can overflow

// ── Fibonacci — naive (exponential time) ──────────────────────────────────
function fib(n) {
  if (n <= 1) return n          // base: fib(0)=0, fib(1)=1
  return fib(n - 1) + fib(n - 2)
}
fib(10)   // 55 — fast
fib(40)   // 102334155 — starts to slow down (many redundant calls)
fib(50)   // extremely slow — 2^50 calls ❌
```

```javascript
// ── Memoized recursion ────────────────────────────────────────────────────
function memoize(fn) {
  const cache = new Map()
  return function(...args) {
    const key = JSON.stringify(args)
    if (cache.has(key)) return cache.get(key)
    const result = fn.apply(this, args)
    cache.set(key, result)
    return result
  }
}

const fibMemo = memoize(function fib(n) {
  if (n <= 1) return n
  return fibMemo(n - 1) + fibMemo(n - 2)
})

fibMemo(50)   // instant ✅ — each subproblem computed once
fibMemo(100)  // instant ✅

// ── Iterative alternative (preferred for deep recursion) ──────────────────
function fibIterative(n) {
  if (n <= 1) return n
  let [a, b] = [0, 1]
  for (let i = 2; i <= n; i++) {
    [a, b] = [b, a + b]
  }
  return b
}
fibIterative(1000)   // instant, no stack concern ✅
```

```javascript
// ── Practical recursion: deep object flattening ────────────────────────────
function flattenObj(obj, prefix = '') {
  const result = {}
  for (const [key, val] of Object.entries(obj)) {
    const newKey = prefix ? `${prefix}.${key}` : key
    if (val !== null && typeof val === 'object' && !Array.isArray(val)) {
      Object.assign(result, flattenObj(val, newKey))  // recursive case
    } else {
      result[newKey] = val   // base case: primitive or array
    }
  }
  return result
}

flattenObj({ a: 1, b: { c: 2, d: { e: 3 } } })
// { 'a': 1, 'b.c': 2, 'b.d.e': 3 }
```

---

## W — Why It Matters

- Recursion is the natural fit for tree structures (file systems, DOM, nested comments, JSON with unknown depth) — iterative solutions require maintaining a manual stack, which recursion handles automatically.
- The `memoize` pattern is used everywhere — React's `useMemo`, Vue's computed properties, and function memoization libraries all implement the same "cache the result by input" idea.
- Stack overflow from deep recursion is a real production risk with user data — if a user has 10,000 nested comments and you recursively traverse them, you crash. Always consider iterative solutions or depth limits for user-supplied data.

---

## I — Interview Q&A

### Q: What is the difference between the base case and the recursive case, and what happens without a base case?

**A:** The base case is the condition under which the function stops calling itself and returns a direct value. The recursive case is the condition under which the function calls itself with a smaller or simpler version of the problem, moving toward the base case. Without a base case (or with a faulty one that's never reached), the function calls itself forever, filling the call stack until Node.js throws `RangeError: Maximum call stack size exceeded`. Every recursive function must guarantee that the recursive case eventually leads to the base case.

---

## C — Common Pitfalls + Fix

### ❌ Naive recursive Fibonacci — exponential redundant calls

```javascript
// ❌ fib(40) makes ~2 billion calls
function fib(n) {
  if (n <= 1) return n
  return fib(n - 1) + fib(n - 2)
}
fib(45)   // takes several seconds ❌

// ✅ Memoize: each value computed once
const cache = {}
function fibFast(n) {
  if (n in cache) return cache[n]
  if (n <= 1) return n
  cache[n] = fibFast(n - 1) + fibFast(n - 2)
  return cache[n]
}
fibFast(100)   // instant ✅
```

---

## K — Coding Challenge + Solution

### Challenge

Write a memoized `countWays(n)` that counts how many ways you can climb `n` stairs taking 1 or 2 steps at a time. (`countWays(1)=1`, `countWays(2)=2`, `countWays(3)=3`, `countWays(4)=5`). Show the memoization cache after calling `countWays(5)`.

### Solution

```javascript
function makeCountWays() {
  const cache = new Map([[1, 1], [2, 2]])   // base cases

  function countWays(n) {
    if (cache.has(n)) return cache.get(n)
    const result = countWays(n - 1) + countWays(n - 2)
    cache.set(n, result)
    return result
  }

  countWays.getCache = () => Object.fromEntries(cache)
  return countWays
}

const countWays = makeCountWays()
console.log(countWays(5))              // 8
console.log(countWays.getCache())
// { '1': 1, '2': 2, '3': 3, '4': 5, '5': 8 }
```

---

---
