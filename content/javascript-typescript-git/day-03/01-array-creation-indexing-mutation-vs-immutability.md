# 1 — Array Creation, Indexing, Mutation vs Immutability

---

## T — TL;DR

Arrays are ordered, zero-indexed, dynamic lists. Methods are either **mutating** (change the original array) or **non-mutating** (return a new array). Prefer non-mutating methods to avoid unintended side effects. Know which is which — it's the source of most array bugs.

---

## K — Key Concepts

```javascript
// ── Creation ──────────────────────────────────────────────────────────────
const a = [1, 2, 3]                     // literal (most common)
const b = new Array(3)                  // [ <3 empty items> ] — sparse, avoid
const c = new Array(3).fill(0)          // [0, 0, 0] ✅
const d = Array.from({ length: 3 }, (_, i) => i + 1)  // [1, 2, 3]
const e = Array.of(1, 2, 3)             // [1, 2, 3]

// ── Indexing ──────────────────────────────────────────────────────────────
const arr = ['a', 'b', 'c', 'd']
arr[0]       // 'a'  — first element
arr[3]       // 'd'  — last (length - 1)
arr[-1]      // undefined ← negative index doesn't work directly
arr.at(-1)   // 'd'  ✅ — .at() supports negative indices (ES2022)
arr.at(-2)   // 'c'

arr.length   // 4
arr[10] = 'z'  // sparse array — indices 4–9 are empty ❌ avoid

// ── Mutating vs non-mutating ──────────────────────────────────────────────
// MUTATING (modify original array):
// push, pop, shift, unshift, splice, sort, reverse, fill, copyWithin

// NON-MUTATING (return new array/value, original untouched):
// map, filter, reduce, slice, concat, flat, flatMap, find, findIndex,
// some, every, includes, join, indexOf, at, [...spread], Array.from

const original = [3, 1, 2]

// Mutating sort — original changed ❌
original.sort()
console.log(original)   // [1, 2, 3] — original mutated!

// Non-mutating sort (ES2023 .toSorted())
const original2 = [3, 1, 2]
const sorted = original2.toSorted()  // new array
console.log(original2)  // [3, 1, 2] — untouched ✅
console.log(sorted)     // [1, 2, 3]

// Full non-mutating equivalents (ES2023):
// .toSorted()   → sort without mutation
// .toReversed() → reverse without mutation
// .toSpliced()  → splice without mutation
// .with(i, v)   → set index without mutation
```

```javascript
// ── Common mutation patterns ───────────────────────────────────────────────
const stack = []
stack.push(1, 2, 3)   // add to end     → [1, 2, 3], returns new length (3)
stack.pop()           // remove from end → returns 3, stack = [1, 2]
stack.unshift(0)      // add to front    → [0, 1, 2], returns new length (3)
stack.shift()         // remove front    → returns 0, stack = [1, 2]

// reverse in place
[1, 2, 3].reverse()           // [3, 2, 1] (mutates)
[...[1, 2, 3]].reverse()      // [3, 2, 1] (copy first, then mutate copy) ✅
```

---

## W — Why It Matters

- Passing an array to a function and accidentally calling `.sort()` or `.splice()` on it mutates the caller's data — this is a real production bug. Always know whether a method mutates.
- `arr[-1]` returning `undefined` instead of the last element is a common mistake from Python developers. Use `.at(-1)` in modern JS.
- Sparse arrays (`new Array(3)`) have `undefined` holes that behave differently from `[undefined, undefined, undefined]` — `forEach` skips holes. Always use `fill` or `Array.from` to create populated arrays.

---

## I — Interview Q&A

### Q: How do you reverse an array without mutating the original?

**A:** Three approaches: (1) ES2023: `arr.toReversed()` — returns a new reversed array, original unchanged. (2) Copy then reverse: `[...arr].reverse()` — spreads into a new array, then reverses the copy. (3) `arr.slice().reverse()` — `slice()` with no args returns a shallow copy, then reverse the copy. `.toReversed()` is the clearest intent in modern environments.

---

## C — Common Pitfalls + Fix

### ❌ Sorting numbers without a comparator — lexicographic order

```javascript
// ❌ Default sort converts to strings first
[10, 9, 2, 1, 100].sort()   // [1, 10, 100, 2, 9] — wrong!

// ✅ Numeric comparator
[10, 9, 2, 1, 100].sort((a, b) => a - b)   // [1, 2, 9, 10, 100] ✅
```

---

## K — Coding Challenge + Solution

### Challenge

Create an array of 5 objects `{ id, value }` using `Array.from`. Then demonstrate: get the last element with `.at()`, create a reversed copy without mutating, and show the original is unchanged.

### Solution

```javascript
const items = Array.from({ length: 5 }, (_, i) => ({ id: i + 1, value: (i + 1) * 10 }))
// [{ id:1,value:10 }, { id:2,value:20 }, ..., { id:5,value:50 }]

console.log(items.at(-1))         // { id: 5, value: 50 } ✅

const reversed = items.toReversed?.() ?? [...items].reverse()
console.log(reversed[0])          // { id: 5, value: 50 }
console.log(items[0])             // { id: 1, value: 10 } — unchanged ✅
```

---

---
