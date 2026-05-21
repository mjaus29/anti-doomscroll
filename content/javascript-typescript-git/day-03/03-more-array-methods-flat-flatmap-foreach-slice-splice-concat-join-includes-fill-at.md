# 3 — More Array Methods — flat, flatMap, forEach, slice, splice, concat, join, includes, fill, at

---

## T — TL;DR

Beyond the seven core HOFs, these methods handle flattening, iteration, extraction, insertion, and string conversion. Know the difference between `slice` (non-mutating copy) and `splice` (mutating in-place). Know that `forEach` returns `undefined` — it's for side effects only, not for building new arrays.

---

## K — Key Concepts

```javascript
// ── flat / flatMap ────────────────────────────────────────────────────────
[[1,2],[3,4],[5,6]].flat()           // [1,2,3,4,5,6] — one level
[1,[2,[3,[4]]]].flat()              // [1,2,[3,[4]]]  — default depth=1
[1,[2,[3,[4]]]].flat(Infinity)      // [1,2,3,4]      — all levels

// flatMap = map then flat(1) — more efficient than map().flat()
['hello world', 'foo bar'].flatMap(s => s.split(' '))
// ['hello', 'world', 'foo', 'bar']

const orders = [
  { items: ['apple', 'banana'] },
  { items: ['cherry'] },
]
orders.flatMap(o => o.items)  // ['apple', 'banana', 'cherry']
```

```javascript
// ── forEach — side effects only ────────────────────────────────────────────
[1, 2, 3].forEach((n, i) => {
  console.log(`index ${i}: ${n}`)
})
// Returns undefined — cannot chain, cannot build an array

// ❌ forEach for transformation — use map instead
const doubled = []
[1,2,3].forEach(n => doubled.push(n * 2))  // ❌ verbose, mutable
const doubled2 = [1,2,3].map(n => n * 2)   // ✅ clean
```

```javascript
// ── slice — non-mutating extraction ───────────────────────────────────────
const arr = ['a','b','c','d','e']
arr.slice(1, 3)    // ['b','c']       — indices 1 up to (not including) 3
arr.slice(2)       // ['c','d','e']   — from index 2 to end
arr.slice(-2)      // ['d','e']       — last 2 elements
arr.slice()        // ['a','b','c','d','e']  — shallow copy

// ── splice — mutating insertion/removal ───────────────────────────────────
const fruits = ['apple','banana','cherry','date']

// Remove 2 elements starting at index 1
const removed = fruits.splice(1, 2)
// removed = ['banana','cherry'], fruits = ['apple','date']

// Insert without removing
fruits.splice(1, 0, 'blueberry', 'citrus')
// fruits = ['apple','blueberry','citrus','date']

// Replace
fruits.splice(2, 1, 'grape')   // remove 1 at index 2, insert 'grape'
```

```javascript
// ── concat — combine arrays (non-mutating) ────────────────────────────────
[1,2].concat([3,4], [5,6])   // [1,2,3,4,5,6]
[1,2].concat(3, 4)           // [1,2,3,4] — also accepts non-arrays
// Prefer spread: [...[1,2], ...[3,4]]   ✅

// ── join — array to string ────────────────────────────────────────────────
['a','b','c'].join('-')    // 'a-b-c'
['a','b','c'].join('')     // 'abc'
['a','b','c'].join()       // 'a,b,c'  — default comma

// ── includes ──────────────────────────────────────────────────────────────
[1,2,3].includes(2)        // true  — uses === comparison
[1,2,NaN].includes(NaN)    // true  — special: includes handles NaN ✅
[1,2,3].includes(2, 2)     // false — start from index 2

// ── fill ──────────────────────────────────────────────────────────────────
new Array(5).fill(0)           // [0,0,0,0,0]
[1,2,3,4,5].fill(0, 1, 4)    // [1,0,0,0,5]  — fill indices 1–3 with 0

// ── at — negative indexing ────────────────────────────────────────────────
const list = [10,20,30,40,50]
list.at(0)    // 10
list.at(-1)   // 50
list.at(-2)   // 40
```

---

## W — Why It Matters

- `slice` is the safe way to copy a portion of an array or create a shallow clone — `arr.slice()` is equivalent to `[...arr]`. Use `slice` when you need to extract without side effects.
- `splice` is powerful but dangerous — it mutates in place and its argument order (`start, deleteCount, ...insertItems`) is confusing. Always prefer `toSpliced()` (ES2023) for non-mutating equivalent.
- `flatMap` is significantly more efficient than `.map(...).flat()` for large arrays — it does one pass instead of two. It's the standard for flattening a transformation.

---

## I — Interview Q&A

### Q: What is the difference between `slice` and `splice`?

**A:** `slice(start, end)` extracts a portion of an array and returns a new array — the original is not modified. It's used for copying and extracting. `splice(start, deleteCount, ...items)` modifies the original array in place — it removes elements and optionally inserts new ones, returning the removed elements. Memory trick: **slice** = takes a slice (non-destructive); **splice** = modifies the source (like surgery). For immutable code, use `slice` or the ES2023 `toSpliced()`.

---

## C — Common Pitfalls + Fix

### ❌ Using `forEach` to build a new array

```javascript
// ❌ Verbose and requires mutation
const doubled = []
[1, 2, 3].forEach(n => doubled.push(n * 2))

// ✅ map returns the new array directly
const doubled2 = [1, 2, 3].map(n => n * 2)
```

---

## K — Coding Challenge + Solution

### Challenge

Given `const matrix = [[1,2,3],[4,5,6],[7,8,9]]`, use `flatMap` to: (1) flatten to a single array, (2) keep only even numbers, (3) double each. Show all three steps chained.

### Solution

```javascript
const matrix = [[1,2,3],[4,5,6],[7,8,9]]

const result = matrix
  .flatMap(row => row)          // [1,2,3,4,5,6,7,8,9]
  .filter(n => n % 2 === 0)    // [2,4,6,8]
  .map(n => n * 2)             // [4,8,12,16]

console.log(result)   // [4, 8, 12, 16]

// Or in one flatMap:
const result2 = matrix.flatMap(row =>
  row.filter(n => n % 2 === 0).map(n => n * 2)
)
console.log(result2)  // [4, 8, 12, 16]
```

---

---
