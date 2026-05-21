
# 📅 Day 3 — Arrays, Objects, Serialization & Regex

> **Goal:** Command every essential array and object method, copy data correctly, serialize safely, and write practical regular expressions.
> **Format:** Each subtopic = 5–15 min. Do one. Stop. Come back.
> **Stack:** Node.js 22 · TypeScript 6 (context) · Vanilla JS

---

## 📋 Day 3 Subtopic Overview

| # | Subtopic | Time |
|---|----------|------|
| 1 | Array Creation, Indexing, Mutation vs Immutability | 10 min |
| 2 | Core Array HOFs — map, filter, reduce, find, findIndex, some, every | 12 min |
| 3 | More Array Methods — flat, flatMap, forEach, slice, splice, concat, join, includes, fill, at | 12 min |
| 4 | Array Utilities — from, of, isArray, keys/values/entries, Sorting | 10 min |
| 5 | Object Literals — Shorthand, Computed Properties, Methods | 10 min |
| 6 | Object Static Methods — keys/values/entries/assign/freeze/seal/create/fromEntries/hasOwn | 12 min |
| 7 | Destructuring and Spread / Rest | 12 min |
| 8 | Shallow Copy vs Deep Copy, structuredClone, Circular References | 10 min |
| 9 | JSON.parse and JSON.stringify — replacer, reviver, gotchas | 10 min |
| 10 | Regular Expressions — literals, flags, test/match/matchAll/replace, named groups | 12 min |

---

---

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

# 2 — Core Array HOFs — map, filter, reduce, find, findIndex, some, every

---

## T — TL;DR

These seven methods cover 90% of array operations. All are non-mutating and accept a callback. `map` transforms. `filter` selects. `reduce` aggregates. `find`/`findIndex` locate. `some`/`every` test conditions. Master chaining them together.

---

## K — Key Concepts

```javascript
const products = [
  { id: 1, name: 'Laptop',  price: 1200, inStock: true,  tags: ['electronics', 'work'] },
  { id: 2, name: 'Mouse',   price: 30,   inStock: true,  tags: ['electronics'] },
  { id: 3, name: 'Desk',    price: 400,  inStock: false, tags: ['furniture'] },
  { id: 4, name: 'Monitor', price: 500,  inStock: true,  tags: ['electronics', 'work'] },
]

// ── map — transform each element (same length output) ─────────────────────
const names = products.map(p => p.name)
// ['Laptop', 'Mouse', 'Desk', 'Monitor']

const withDiscount = products.map(p => ({ ...p, price: p.price * 0.9 }))
// new array with all prices reduced 10%, originals untouched

// map with index
const indexed = products.map((p, i) => `${i + 1}. ${p.name}`)
// ['1. Laptop', '2. Mouse', '3. Desk', '4. Monitor']
```

```javascript
// ── filter — keep matching elements ───────────────────────────────────────
const inStock = products.filter(p => p.inStock)
// [Laptop, Mouse, Monitor]

const affordable = products.filter(p => p.price < 500)
// [Mouse, Desk (400 < 500)]

// Chaining filter + map
const affordableNames = products
  .filter(p => p.price <= 400)
  .map(p => p.name)
// ['Mouse', 'Desk']
```

```javascript
// ── reduce — fold to a single value ───────────────────────────────────────
// Signature: reduce(callback(accumulator, current, index, array), initialValue)
// ALWAYS provide initial value

// Sum prices
const totalPrice = products.reduce((sum, p) => sum + p.price, 0)   // 2130

// Group by category
const byStock = products.reduce((acc, p) => {
  const key = p.inStock ? 'inStock' : 'outOfStock'
  acc[key] = [...(acc[key] ?? []), p.name]
  return acc
}, {})
// { inStock: ['Laptop','Mouse','Monitor'], outOfStock: ['Desk'] }

// Build a lookup map (reduce to Map)
const byId = products.reduce((map, p) => {
  map.set(p.id, p)
  return map
}, new Map())
byId.get(2)   // { id:2, name:'Mouse', ... }
```

```javascript
// ── find / findIndex ──────────────────────────────────────────────────────
const laptop  = products.find(p => p.name === 'Laptop')       // { id:1, ... } or undefined
const deskIdx = products.findIndex(p => p.name === 'Desk')    // 2
const missing = products.find(p => p.name === 'Chair')         // undefined

// findLast / findLastIndex (ES2023) — search from the end
const lastElectronics = products.findLast(p => p.tags.includes('electronics'))
// { id:4, name:'Monitor', ... }

// ── some / every ──────────────────────────────────────────────────────────
const anyOutOfStock  = products.some(p => !p.inStock)           // true (Desk)
const allHaveTags    = products.every(p => p.tags.length > 0)   // true
const allAffordable  = products.every(p => p.price < 500)       // false (Laptop=1200)
const anyOver1000    = products.some(p => p.price > 1000)       // true (Laptop=1200)

// Short-circuit: some stops at first true, every stops at first false
```

---

## W — Why It Matters

- `reduce` is the universal array operation — `map` and `filter` can both be implemented with `reduce`. It's the hardest to read but most powerful: grouping, indexing, summing, transforming format.
- `find` vs `filter`: `find` returns the first match (or `undefined`) and stops scanning — `O(1)` in the best case. `filter` scans the entire array and returns all matches. Use `find` when you want a single item.
- `some`/`every` short-circuit — `some` stops at the first truthy result, `every` stops at the first falsy. For large arrays where you just need a boolean, these are far faster than `filter(...).length > 0`.

---

## I — Interview Q&A

### Q: Implement `map` using `reduce`.

**A:**
```javascript
function myMap(arr, fn) {
  return arr.reduce((acc, item, i) => {
    acc.push(fn(item, i, arr))
    return acc
  }, [])
}
myMap([1, 2, 3], x => x * 2)   // [2, 4, 6]
```
This shows that `reduce` is the fundamental operation — `map`, `filter`, `flatMap` all derive from it.

---

## C — Common Pitfalls + Fix

### ❌ Forgetting initial value in reduce — crashes on empty array

```javascript
// ❌ Throws on empty array; uses first element as accumulator on non-empty (surprising)
[].reduce((sum, n) => sum + n)   // TypeError: Reduce of empty array with no initial value

// ✅ Always provide initial value
[].reduce((sum, n) => sum + n, 0)   // 0 ✅
[1,2,3].reduce((sum, n) => sum + n, 0)  // 6 ✅
```

---

## K — Coding Challenge + Solution

### Challenge

Given the `products` array above, use `filter`, `map`, and `reduce` in a chain to: (1) keep only in-stock electronics, (2) apply a 15% discount, (3) return `{ count, total, items: [names] }`.

### Solution

```javascript
const result = products
  .filter(p => p.inStock && p.tags.includes('electronics'))
  .map(p => ({ ...p, finalPrice: +(p.price * 0.85).toFixed(2) }))
  .reduce((acc, p) => ({
    count: acc.count + 1,
    total: +(acc.total + p.finalPrice).toFixed(2),
    items: [...acc.items, p.name],
  }), { count: 0, total: 0, items: [] })

console.log(result)
// { count: 3, total: 1726.50, items: ['Laptop', 'Mouse', 'Monitor'] }
// (1200*0.85=1020, 30*0.85=25.50, 500*0.85=425 → 1470.50 total)
```

---

---

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

# 4 — Array Utilities — from, of, isArray, keys/values/entries, Sorting

---

## T — TL;DR

`Array.from` converts any iterable or array-like into a real array with an optional map function. `Array.isArray` is the correct array type check. `keys/values/entries` return iterators for indexed iteration. Sorting requires a comparator for anything beyond basic alphabetical string sort.

---

## K — Key Concepts

```javascript
// ── Array.from ────────────────────────────────────────────────────────────
// From string
Array.from('hello')              // ['h','e','l','l','o']

// From Set (remove duplicates)
Array.from(new Set([1,2,2,3,3]))  // [1,2,3]

// From Map
Array.from(new Map([['a',1],['b',2]]))  // [['a',1],['b',2]]

// From NodeList (DOM)
Array.from(document.querySelectorAll('li'))   // real array with .map etc.

// From array-like (arguments, { length: 3 })
Array.from({ length: 3 }, (_, i) => i * 2)  // [0,2,4] — map fn as 2nd arg

// ── Array.of ──────────────────────────────────────────────────────────────
Array.of(1, 2, 3)    // [1, 2, 3]  — unlike new Array(3) which makes sparse
Array.of(7)          // [7]        — new Array(7) would make 7 empty slots

// ── Array.isArray ─────────────────────────────────────────────────────────
Array.isArray([])         // true  ✅
Array.isArray({})         // false
Array.isArray('hello')    // false
Array.isArray(new Array)  // true
// typeof [] === 'object' — Array.isArray is the correct check
```

```javascript
// ── keys / values / entries ────────────────────────────────────────────────
const arr = ['a','b','c']

[...arr.keys()]     // [0, 1, 2]
[...arr.values()]   // ['a','b','c']  — same as [...arr]
[...arr.entries()]  // [[0,'a'],[1,'b'],[2,'c']]

// Useful with for...of for index + value:
for (const [i, val] of arr.entries()) {
  console.log(i, val)   // 0 'a', 1 'b', 2 'c'
}
```

```javascript
// ── Sorting ────────────────────────────────────────────────────────────────
// Default sort: converts to string, alphabetical
['banana','apple','cherry'].sort()        // ['apple','banana','cherry'] ✅
[10,9,2,1,100].sort()                    // [1,10,100,2,9] ❌ lexicographic!

// Numeric sort — comparator fn: (a,b) => a - b
// If result < 0: a before b | result > 0: b before a | 0: equal
[10,9,2,1,100].sort((a,b) => a - b)      // [1,2,9,10,100] ascending ✅
[10,9,2,1,100].sort((a,b) => b - a)      // [100,10,9,2,1] descending ✅

// Sort objects
const users = [
  { name: 'Charlie', age: 25 },
  { name: 'Alice',   age: 30 },
  { name: 'Bob',     age: 28 },
]
// By age ascending
users.sort((a, b) => a.age - b.age)
// By name alphabetically
users.sort((a, b) => a.name.localeCompare(b.name))
// Secondary sort: age asc, then name asc
users.sort((a, b) => a.age - b.age || a.name.localeCompare(b.name))

// Non-mutating sort (ES2023)
const sorted = users.toSorted((a, b) => a.age - b.age)  // original unchanged ✅
```

---

## W — Why It Matters

- `Array.isArray` is the only reliable array check — `typeof []` returns `'object'`, and `instanceof Array` fails across iframes. `Array.isArray` handles all cases correctly.
- `Array.from({ length: n }, fn)` is the idiomatic way to create arrays with computed values — cleaner than `new Array(n).fill(null).map(fn)`.
- String localeCompare for sorting matters with non-ASCII names — `'ñoño'.localeCompare('nono', 'es')` returns the culturally correct order. `'ñ' > 'z'` in Unicode order but should be near 'n' in Spanish.

---

## I — Interview Q&A

### Q: How does the `sort` comparator function work?

**A:** The comparator `(a, b) => result` tells the sort algorithm how to order two elements: if result is **negative**, `a` comes before `b`; if **positive**, `b` comes before `a`; if **zero**, order is unchanged. For numbers, `(a, b) => a - b` is ascending — when `a < b`, the result is negative, putting `a` first. For strings, use `.localeCompare()` which returns -1, 0, or 1 and handles Unicode/locale correctly. Always provide a comparator for non-string arrays — the default sort converts to strings first.

---

## C — Common Pitfalls + Fix

### ❌ Converting NodeList or arguments to array with spread — sometimes fails

```javascript
// ✅ Spread works for true iterables
const arr = [...document.querySelectorAll('li')]  // works ✅

// ✅ Array.from is more reliable for array-like objects
const arr2 = Array.from(document.querySelectorAll('li'))  // always works ✅

// ❌ Don't sort numbers without comparator
[100, 20, 3].sort()            // [100, 20, 3] — wrong order!
[100, 20, 3].sort((a,b)=>a-b)  // [3, 20, 100] ✅
```

---

## K — Coding Challenge + Solution

### Challenge

Using `Array.from`, generate an array of 10 objects `{ n, square, isEven }` for n=1..10. Sort them by `square` descending using `toSorted`. Then extract just the `n` values of even squares using `filter` + `map`.

### Solution

```javascript
const nums = Array.from({ length: 10 }, (_, i) => {
  const n = i + 1
  return { n, square: n * n, isEven: n % 2 === 0 }
})

const sortedDesc = nums.toSorted?.((a, b) => b.square - a.square)
  ?? [...nums].sort((a, b) => b.square - a.square)

const evenSquareNs = sortedDesc
  .filter(x => x.isEven)
  .map(x => x.n)

console.log(evenSquareNs)  // [10, 8, 6, 4, 2] — descending order
```

---

---

# 5 — Object Literals — Shorthand, Computed Properties, Methods

---

## T — TL;DR

Object literals in ES6+ have shorthand property syntax, shorthand methods, and computed property names with `[]`. These reduce boilerplate and enable dynamic key construction. Property access: dot notation for static keys, bracket notation for dynamic keys or invalid identifiers.

---

## K — Key Concepts

```javascript
// ── Shorthand properties ───────────────────────────────────────────────────
const name = 'Mark'
const age  = 28

// ❌ Verbose
const user = { name: name, age: age }

// ✅ Shorthand — key and variable name are the same
const user2 = { name, age }
// { name: 'Mark', age: 28 }

// ── Shorthand methods ──────────────────────────────────────────────────────
// ❌ Verbose
const service = {
  greet: function(name) { return `Hello, ${name}` },
}

// ✅ Method shorthand
const service2 = {
  greet(name) { return `Hello, ${name}` },
  async fetchUser(id) { return await db.find(id) },
  get fullName() { return `${this.first} ${this.last}` },  // getter
  set fullName(v) { [this.first, this.last] = v.split(' ') },  // setter
}
```

```javascript
// ── Computed property names ────────────────────────────────────────────────
const key = 'dynamic'
const obj = {
  [key]: 'value',            // { dynamic: 'value' }
  [`${key}_meta`]: true,     // { dynamic_meta: true }
  ['key-with-hyphens']: 42,  // { 'key-with-hyphens': 42 }
}

// Dynamic key from variable
function makeConfig(prefix, values) {
  return values.reduce((acc, val, i) => ({
    ...acc,
    [`${prefix}_${i}`]: val,
  }), {})
}
makeConfig('item', ['a','b','c'])
// { item_0: 'a', item_1: 'b', item_2: 'c' }
```

```javascript
// ── Property access ────────────────────────────────────────────────────────
const config = { host: 'localhost', 'content-type': 'json', 1: 'one' }

// Dot notation — static, identifier-safe keys
config.host          // 'localhost'

// Bracket notation — dynamic, any string key
config['content-type']   // 'json'  — hyphen not valid in dot notation
config['host']           // 'localhost' — also works
config[1]                // 'one'  — numeric keys

// Dynamic access
const field = 'host'
config[field]            // 'localhost'

// Optional chaining with nested objects
const user = { address: { city: 'Manila' } }
user?.address?.city      // 'Manila'
user?.phone?.number      // undefined (not error)
```

```javascript
// ── Property descriptors ──────────────────────────────────────────────────
// Each property has: value, writable, enumerable, configurable
// Object literal = writable:true, enumerable:true, configurable:true (all open)

// Check if property exists on the object itself (not prototype)
Object.hasOwn({ a: 1 }, 'a')    // true  (ES2022 — prefer over hasOwnProperty)
Object.hasOwn({ a: 1 }, 'b')    // false
Object.hasOwn({ a: 1 }, 'toString')  // false (on prototype, not own)
```

---

## W — Why It Matters

- Shorthand property syntax is everywhere in modern JS — `return { name, email, role }` in API handlers, destructured function params. Not knowing it makes code harder to read and write.
- Computed property names enable dynamic object construction — building response objects with keys from variables, creating lookup dictionaries from arrays with `reduce`.
- `Object.hasOwn` vs `hasOwnProperty` — `hasOwnProperty` can be shadowed if someone puts a property named `hasOwnProperty` on the object. `Object.hasOwn` can't. Always use `Object.hasOwn`.

---

## I — Interview Q&A

### Q: What is the difference between dot notation and bracket notation for property access?

**A:** Dot notation (`obj.key`) requires the key to be a valid identifier — no spaces, hyphens, or starting digits, and the key must be known at write time. Bracket notation (`obj['key']`) accepts any string, including those with special characters, and can use a variable: `obj[dynamicKey]`. Use dot notation for static, identifier-safe keys (faster to read). Use bracket notation for dynamic keys, keys from variables, or keys with special characters like `'Content-Type'`.

---

## C — Common Pitfalls + Fix

### ❌ Accessing a property named after a variable without brackets

```javascript
const field = 'name'
const user  = { name: 'Mark', age: 28 }

// ❌ Accesses the literal key "field", not the value of the variable
user.field   // undefined — no property named "field" on user

// ✅ Bracket notation uses the variable's value as the key
user[field]  // 'Mark' ✅
```

---

## K — Coding Challenge + Solution

### Challenge

Write a `buildResponse(status, data, meta = {})` function that returns an object using shorthand, computed key (`[`${status}Data`]`), and a method `toJSON()` that returns a JSON-safe version.

### Solution

```javascript
function buildResponse(status, data, meta = {}) {
  const timestamp = Date.now()
  return {
    status,                         // shorthand
    [`${status}Data`]: data,        // computed key
    meta: { timestamp, ...meta },   // shorthand + spread
    toJSON() {                      // shorthand method
      const { toJSON: _, ...rest } = this   // exclude method from output
      return rest
    },
  }
}

const res = buildResponse('success', { id: 1 }, { requestId: 'abc' })
console.log(res.successData)   // { id: 1 }
console.log(JSON.stringify(res.toJSON()))
// {"status":"success","successData":{"id":1},"meta":{"timestamp":...,"requestId":"abc"}}
```

---

---

# 6 — Object Static Methods

---

## T — TL;DR

`Object` static methods are the toolkit for working with objects: iterating (`keys/values/entries`), merging (`assign`), protecting (`freeze/seal`), creating with prototype (`create`), introspecting (`getOwnPropertyDescriptor`), building from entries (`fromEntries`), and safe existence check (`hasOwn`).

---

## K — Key Concepts

```javascript
// ── keys / values / entries ────────────────────────────────────────────────
const user = { name: 'Mark', age: 28, role: 'admin' }

Object.keys(user)      // ['name', 'age', 'role']   — own enumerable keys
Object.values(user)    // ['Mark', 28, 'admin']      — own enumerable values
Object.entries(user)   // [['name','Mark'],['age',28],['role','admin']]

// Iterate with entries
for (const [key, value] of Object.entries(user)) {
  console.log(`${key}: ${value}`)
}

// Transform object values
const upperUser = Object.fromEntries(
  Object.entries(user).map(([k, v]) => [k, typeof v === 'string' ? v.toUpperCase() : v])
)
// { name: 'MARK', age: 28, role: 'ADMIN' }

// ── fromEntries — build object from [key,value] pairs ────────────────────
Object.fromEntries([['a', 1], ['b', 2]])     // { a: 1, b: 2 }
Object.fromEntries(new Map([['x', 10]]))     // { x: 10 }
// Common: invert an object
const original = { a: 1, b: 2, c: 3 }
const inverted = Object.fromEntries(Object.entries(original).map(([k,v]) => [v,k]))
// { '1': 'a', '2': 'b', '3': 'c' }
```

```javascript
// ── assign — shallow merge into target ────────────────────────────────────
const defaults = { theme: 'light', lang: 'en', fontSize: 14 }
const userPrefs = { theme: 'dark', fontSize: 16 }

// Mutates target! First arg is modified and returned
Object.assign({}, defaults, userPrefs)
// { theme: 'dark', lang: 'en', fontSize: 16 } — target is {} (new obj) ✅

// ❌ Mutates defaults
Object.assign(defaults, userPrefs)

// Modern equivalent: spread (preferred)
const merged = { ...defaults, ...userPrefs }   // ✅ cleaner
```

```javascript
// ── freeze / seal ─────────────────────────────────────────────────────────
// freeze: no add, delete, or modify (shallow)
const config = Object.freeze({
  host: 'localhost',
  port: 5432,
  nested: { max: 10 },   // ← not frozen — shallow!
})
config.port = 9999   // silently fails (throws in strict mode)
config.newKey = 'x'  // silently fails
config.nested.max = 99  // ✅ nested objects are NOT frozen

// seal: no add or delete, but CAN modify existing values
const settings = Object.seal({ volume: 50, muted: false })
settings.volume = 75   // ✅ modification allowed
settings.newProp = 'x' // silently fails — can't add ❌
delete settings.volume // silently fails — can't delete ❌
```

```javascript
// ── create — set prototype explicitly ─────────────────────────────────────
const animalMethods = {
  speak() { return `${this.name} says ${this.sound}` },
  toString() { return `[Animal: ${this.name}]` },
}

const dog = Object.create(animalMethods)
dog.name  = 'Rex'
dog.sound = 'woof'
dog.speak()   // 'Rex says woof' — inherits from animalMethods

// Object.create(null) — no prototype (no .toString, .hasOwnProperty, etc.)
const pure = Object.create(null)
pure.key = 'value'
// Useful for safe dictionaries with no prototype-chain pollution

// ── defineProperty — fine-grained property control ────────────────────────
const obj = {}
Object.defineProperty(obj, 'id', {
  value:        42,
  writable:     false,    // cannot change
  enumerable:   false,    // hidden from for..in and Object.keys
  configurable: false,    // cannot redefine or delete
})
obj.id   // 42
obj.id = 99   // silently fails (throws in strict mode)
Object.keys(obj)   // [] — id is non-enumerable

// Get descriptor
Object.getOwnPropertyDescriptor(obj, 'id')
// { value: 42, writable: false, enumerable: false, configurable: false }
```

---

## W — Why It Matters

- `Object.entries` + `Object.fromEntries` is the "transform object" pattern — filter/map object properties without manual key iteration. This replaces many verbose `for...in` loops.
- `Object.freeze` is shallow — a common misconception. Nested objects remain mutable. For deep freeze, you need a recursive implementation. This explains why `Object.freeze` isn't sufficient for truly immutable config objects with nested data.
- `Object.create(null)` creates a dictionary with no prototype — ideal for a lookup map where someone might set a key named `toString` or `hasOwnProperty` without breaking the object's behaviour.

---

## I — Interview Q&A

### Q: What is the difference between `Object.freeze` and `Object.seal`?

**A:** Both prevent adding new properties and deleting existing ones. The difference: `freeze` also prevents modifying existing property values — the object is completely locked. `seal` allows modification of existing values but prevents structural changes (no new properties, no deletions). Both are shallow — nested objects are unaffected. Use `freeze` for configuration constants; use `seal` when you want a fixed-shape object whose values may still be updated.

---

## C — Common Pitfalls + Fix

### ❌ Object.assign with deeply nested objects — shared references

```javascript
// ❌ Nested objects are still shared references
const a = { user: { name: 'Mark', prefs: { theme: 'dark' } } }
const b = Object.assign({}, a)
b.user.prefs.theme = 'light'
console.log(a.user.prefs.theme)   // 'light' — a was mutated! ❌

// ✅ Deep clone instead (covered in Subtopic 8)
const c = structuredClone(a)
c.user.prefs.theme = 'light'
console.log(a.user.prefs.theme)   // 'dark' ✅ — original untouched
```

---

## K — Coding Challenge + Solution

### Challenge

Write a `pick(obj, keys)` and `omit(obj, keys)` utility using `Object.entries` and `Object.fromEntries`.

### Solution

```javascript
const pick = (obj, keys) =>
  Object.fromEntries(
    Object.entries(obj).filter(([k]) => keys.includes(k))
  )

const omit = (obj, keys) =>
  Object.fromEntries(
    Object.entries(obj).filter(([k]) => !keys.includes(k))
  )

const user = { id: 1, name: 'Mark', email: 'mark@ex.com', password: 'secret', role: 'admin' }

console.log(pick(user, ['id', 'name', 'email']))
// { id: 1, name: 'Mark', email: 'mark@ex.com' }

console.log(omit(user, ['password', 'role']))
// { id: 1, name: 'Mark', email: 'mark@ex.com' }
```

---

---

# 7 — Destructuring and Spread / Rest

---

## T — TL;DR

**Destructuring** extracts values from arrays or objects into variables — clean, readable, supports defaults and renaming. **Spread** (`...`) expands an iterable into individual elements — for copying, merging, and spreading into function calls. **Rest** (`...`) collects remaining elements or properties — in function parameters and destructuring.

---

## K — Key Concepts

```javascript
// ── Array destructuring ────────────────────────────────────────────────────
const [a, b, c] = [1, 2, 3]        // a=1, b=2, c=3
const [first, , third] = [1, 2, 3]  // skip with empty comma: third=3
const [x = 10, y = 20] = [5]        // default: x=5, y=20

// Swap variables
let p = 1, q = 2
;[p, q] = [q, p]   // p=2, q=1 — no temp variable needed ✅

// Rest in array destructuring
const [head, ...tail] = [1, 2, 3, 4]   // head=1, tail=[2,3,4]
```

```javascript
// ── Object destructuring ────────────────────────────────────────────────────
const user = { name: 'Mark', age: 28, role: 'admin', email: 'mark@ex.com' }

// Basic
const { name, age } = user   // name='Mark', age=28

// Rename: key: newName
const { name: userName, role: userRole } = user
// userName='Mark', userRole='admin'

// Default values
const { name: n2, score = 100 } = user  // score=100 (not in user)

// Nested destructuring
const config = { db: { host: 'localhost', port: 5432 } }
const { db: { host, port } } = config   // host='localhost', port=5432

// Rest in object destructuring
const { password, ...safeUser } = { ...user, password: 'secret' }
// safeUser = { name:'Mark', age:28, role:'admin', email:'mark@ex.com' }
// password = 'secret' — excluded ✅

// In function parameters
function createUser({ name, email, role = 'user', active = true } = {}) {
  return { name, email, role, active }
}
createUser({ name: 'Mark', email: 'mark@ex.com' })
// { name:'Mark', email:'mark@ex.com', role:'user', active:true }
```

```javascript
// ── Spread operator ────────────────────────────────────────────────────────
// Arrays: copy and merge
const arr1 = [1, 2, 3]
const arr2 = [4, 5, 6]
const merged  = [...arr1, ...arr2]          // [1,2,3,4,5,6]
const copy    = [...arr1]                   // shallow copy
const prepend = [0, ...arr1]               // [0,1,2,3]
const append  = [...arr1, 4]               // [1,2,3,4]

// Objects: copy and merge (later keys win)
const obj1 = { a: 1, b: 2 }
const obj2 = { b: 3, c: 4 }
const merged2 = { ...obj1, ...obj2 }  // { a:1, b:3, c:4 } — obj2.b overrides
const withOverride = { ...user, role: 'superadmin' }  // all user props + new role

// Function calls
Math.max(...[3, 1, 4, 1, 5])   // 5
console.log(...['a', 'b', 'c']) // a b c
```

---

## W — Why It Matters

- Destructuring in function parameters is the standard for options/config objects and React/Express patterns — every `handler({ req, res, body })` or `Component({ className, children, onClick })` uses it.
- `const { password, ...safeUser } = user` is the idiomatic way to strip sensitive fields from objects before sending to a client — far cleaner than deleting properties from a copy.
- Spread for array/object copying creates shallow copies only — nested objects are still shared. Always know when you need a deep copy (Subtopic 8).

---

## I — Interview Q&A

### Q: What is the difference between rest and spread syntax?

**A:** They use the same `...` syntax but in opposite contexts. **Spread** expands an iterable into individual elements — it's used where multiple elements are expected: function calls `fn(...args)`, array literals `[...arr, 4]`, object literals `{ ...obj }`. **Rest** collects multiple elements into a single array/object — it's used where a variable is expected: function parameters `function fn(...args)`, array destructuring `const [first, ...rest] = arr`, object destructuring `const { a, ...remaining } = obj`. Think of spread as "unpack" and rest as "collect the remaining".

---

## C — Common Pitfalls + Fix

### ❌ Destructuring without a fallback when value is undefined

```javascript
// ❌ TypeError if config is null or undefined
function setup(config) {
  const { port, host } = config  // TypeError if config is null ❌
}

// ✅ Default parameter fallback
function setup({ port = 3000, host = 'localhost' } = {}) {
  return `${host}:${port}`
}
setup()                        // 'localhost:3000' ✅
setup({ port: 8080 })          // 'localhost:8080' ✅
setup(null)                    // TypeError — null can't be destructured, only undefined triggers = {}
// Additional protection: setup(config ?? {})
```

---

## K — Coding Challenge + Solution

### Challenge

Write a `mergeDefaults(defaults, overrides)` function that deeply merges only one level using spread. Then demonstrate removing fields with rest destructuring. Extract `first` and `last` from a `fullName` array using destructuring with a rest.

### Solution

```javascript
// One-level deep merge (nested objects overridden, not merged)
const mergeDefaults = (defaults, overrides = {}) => ({
  ...defaults,
  ...overrides,
  // Merge nested 'options' if both have it
  ...(defaults.options || overrides.options
    ? { options: { ...defaults.options, ...overrides.options } }
    : {}),
})

const defaults = { timeout: 5000, retries: 3, options: { verbose: false, cache: true } }
const overrides = { timeout: 10000, options: { verbose: true } }
console.log(mergeDefaults(defaults, overrides))
// { timeout:10000, retries:3, options:{ verbose:true, cache:true } }

// Remove sensitive fields
const record = { id: 1, name: 'Mark', secret: 'abc', token: 'xyz' }
const { secret, token, ...publicRecord } = record
console.log(publicRecord)  // { id:1, name:'Mark' }

// Array destructuring with rest
const fullName = ['Mark', 'Anthony', 'Austin']
const [first, ...rest] = fullName
console.log(first)  // 'Mark'
console.log(rest)   // ['Anthony', 'Austin']
```

---

---

# 8 — Shallow Copy vs Deep Copy, structuredClone, Circular References

---

## T — TL;DR

A **shallow copy** duplicates the top-level properties but nested objects are still shared references. A **deep copy** duplicates the entire structure — all nested objects are new. `structuredClone` (Node 17+, all modern browsers) is the correct deep copy for most cases. Circular references crash `JSON.stringify` but `structuredClone` handles them.

---

## K — Key Concepts

```javascript
// ── Shallow copy — top level only ─────────────────────────────────────────
const original = { name: 'Mark', address: { city: 'Manila', zip: '1000' } }

const shallow1 = { ...original }          // spread
const shallow2 = Object.assign({}, original)  // assign

shallow1.name = 'Alex'           // ✅ doesn't affect original
shallow1.address.city = 'Cebu'   // ❌ DOES affect original — shared reference!

console.log(original.address.city)  // 'Cebu' — mutated via shallow copy

// ── Deep copy methods ──────────────────────────────────────────────────────

// Method 1: structuredClone (best — built-in, handles most types)
const deep1 = structuredClone(original)
deep1.address.city = 'Davao'
console.log(original.address.city)  // 'Manila' — truly independent ✅

// Method 2: JSON.parse(JSON.stringify()) — simple but lossy
const deep2 = JSON.parse(JSON.stringify(original))
// Loses: undefined, functions, Date→string, Map, Set, RegExp, BigInt (throws)

// Method 3: custom recursive (full control)
function deepClone(value) {
  if (value === null || typeof value !== 'object') return value
  if (Array.isArray(value)) return value.map(deepClone)
  return Object.fromEntries(
    Object.entries(value).map(([k, v]) => [k, deepClone(v)])
  )
  // Note: doesn't handle Date, Map, Set, circular refs — structuredClone is better
}
```

```javascript
// ── structuredClone — what it handles ────────────────────────────────────
// ✅ Handles: Object, Array, Date, Map, Set, RegExp, ArrayBuffer, TypedArray
// ✅ Handles circular references
// ❌ Cannot clone: functions, class instances (methods lost), DOM nodes, WeakMap

const withDate = { created: new Date(), tags: new Set(['a','b']) }
const cloned = structuredClone(withDate)
cloned.created.setFullYear(2000)
console.log(withDate.created.getFullYear())  // 2025 — original untouched ✅
cloned.tags.add('c')
console.log(withDate.tags.size)              // 2 — original untouched ✅
```

```javascript
// ── Circular references ────────────────────────────────────────────────────
// A circular reference: object contains a reference to itself

const parent = { name: 'Parent' }
const child  = { name: 'Child', parent }
parent.child  = child   // circular: parent→child→parent→...

// ❌ JSON.stringify crashes on circular references
try {
  JSON.stringify(parent)   // TypeError: Converting circular structure to JSON
} catch (e) {
  console.error(e.message)
}

// ✅ structuredClone handles circular references
const cloned = structuredClone(parent)
console.log(cloned.child.parent.name)  // 'Parent' ✅ — cycle preserved

// ✅ WeakMap-based custom clone (handles circular refs, illustrative):
function cloneDeep(val, seen = new WeakMap()) {
  if (val === null || typeof val !== 'object') return val
  if (seen.has(val)) return seen.get(val)
  const copy = Array.isArray(val) ? [] : {}
  seen.set(val, copy)
  for (const [k, v] of Object.entries(val)) {
    copy[k] = cloneDeep(v, seen)
  }
  return copy
}
```

---

## W — Why It Matters

- Every React state update bug involving nested objects traces back to shallow copy — `setState({ ...state })` where `state.user` is still a shared reference means `state.user.name = 'x'` mutates the previous state. Deep copy or immutable update patterns (spreading each level) fix this.
- `JSON.parse(JSON.stringify())` silently loses `Date` objects (converts to string), `undefined` values (key dropped), and `Map`/`Set` — using it for deep copy of data with Dates is a subtle production bug.
- `structuredClone` is the first native deep copy in JavaScript — before it, libraries like Lodash `_.cloneDeep` were required. Always reach for `structuredClone` first, fall back to Lodash for class instances.

---

## I — Interview Q&A

### Q: What is the difference between a shallow copy and a deep copy, and when does it matter?

**A:** A shallow copy creates a new top-level object/array but nested objects are still references to the same memory. Modifying a nested object in the copy also modifies the original. A deep copy creates completely independent copies of every nested value. It matters whenever you need to modify a complex object without affecting the original — state management, before/after comparisons, undo history, passing data to functions that may mutate their arguments. Use `structuredClone` for deep copy (handles Date, Map, Set, circular refs). Use spread or `Object.assign` for shallow copy when you only need top-level independence.

---

## C — Common Pitfalls + Fix

### ❌ JSON deep clone losing Dates

```javascript
// ❌ Date becomes a string
const data = { createdAt: new Date('2025-06-15') }
const clone = JSON.parse(JSON.stringify(data))
typeof clone.createdAt   // 'string' not 'object'
clone.createdAt instanceof Date  // false ❌

// ✅ structuredClone preserves Date
const clone2 = structuredClone(data)
clone2.createdAt instanceof Date  // true ✅
```

---

## K — Coding Challenge + Solution

### Challenge

Given a nested config object with a `Date`, a `Set`, and a circular reference, demonstrate that `structuredClone` handles all three correctly while `JSON.stringify` fails.

### Solution

```javascript
const config = {
  name: 'app',
  createdAt: new Date('2025-01-01'),
  featureFlags: new Set(['darkMode', 'beta']),
  nested: { level: 1 },
}
config.self = config   // circular reference

// ❌ JSON.stringify fails
try {
  JSON.stringify(config)
} catch(e) {
  console.log('JSON error:', e.message)  // TypeError: circular structure
}

// ✅ structuredClone handles everything
const cloned = structuredClone(config)
console.log(cloned.createdAt instanceof Date)   // true ✅
console.log(cloned.featureFlags instanceof Set)  // true ✅
console.log(cloned.featureFlags.has('darkMode')) // true ✅
console.log(cloned.self === cloned)              // true ✅ (circular preserved)
console.log(cloned.self === config)              // false ✅ (independent copy)

// Mutation proof
cloned.nested.level = 99
console.log(config.nested.level)   // 1 ✅ — deep, not shallow
```

---

---

# 9 — JSON.parse and JSON.stringify — replacer, reviver, gotchas

---

## T — TL;DR

`JSON.stringify` serializes JavaScript values to a JSON string. `JSON.parse` deserializes back. Both accept optional second arguments: `stringify(value, replacer, space)` filters/transforms output; `parse(text, reviver)` transforms values during parsing. Know what types `JSON` cannot represent — functions, `undefined`, `Date`, `Map`, `Set`, `BigInt`.

---

## K — Key Concepts

```javascript
// ── Basic stringify / parse ────────────────────────────────────────────────
const obj = { name: 'Mark', age: 28, active: true }
const json = JSON.stringify(obj)           // '{"name":"Mark","age":28,"active":true}'
const back = JSON.parse(json)              // { name:'Mark', age:28, active:true }

// Pretty-print with indentation
JSON.stringify(obj, null, 2)
// {
//   "name": "Mark",
//   "age": 28,
//   "active": true
// }
```

```javascript
// ── JSON type losses (gotchas) ─────────────────────────────────────────────
const lossy = {
  fn:        () => 'hello',     // function     → key dropped entirely
  undef:     undefined,         // undefined    → key dropped
  sym:       Symbol('x'),       // Symbol       → key dropped
  nan:       NaN,               // NaN          → null
  inf:       Infinity,          // Infinity     → null
  date:      new Date(),        // Date         → string (ISO)
  map:       new Map([['a',1]]),// Map          → {} (empty!)
  set:       new Set([1,2]),    // Set          → {} (empty!)
  bigint:    42n,               // BigInt       → throws TypeError
}

JSON.stringify(lossy)
// {"nan":null,"inf":null,"date":"2025-06-15T00:00:00.000Z","map":{},"set":{}}
// fn, undef, sym keys are dropped silently!

// BigInt throws — must convert first:
JSON.stringify({ id: 42n })  // TypeError: Do not know how to serialize a BigInt
JSON.stringify({ id: 42n.toString() })  // '{"id":"42"}' ✅
```

```javascript
// ── replacer — filter or transform output ─────────────────────────────────
const user = { id: 1, name: 'Mark', password: 'secret', token: 'abc' }

// Array replacer: only include listed keys
JSON.stringify(user, ['id', 'name'], 2)
// {"id":1,"name":"Mark"}  — password and token excluded ✅

// Function replacer: (key, value) => transformed value | undefined to skip
JSON.stringify(user, (key, value) => {
  if (key === 'password' || key === 'token') return undefined   // skip
  if (typeof value === 'string') return value.toUpperCase()
  return value
})
// '{"id":1,"name":"MARK"}'

// toJSON method — custom serialization per object
class Money {
  constructor(amount, currency) {
    this.amount   = amount
    this.currency = currency
  }
  toJSON() {   // called automatically by stringify
    return `${this.amount} ${this.currency}`
  }
}
JSON.stringify({ price: new Money(9.99, 'USD') })
// '{"price":"9.99 USD"}'
```

```javascript
// ── reviver — transform values during parse ───────────────────────────────
const json = '{"name":"Mark","createdAt":"2025-06-15T00:00:00.000Z","score":42}'

// Without reviver: createdAt is a string
const plain = JSON.parse(json)
plain.createdAt instanceof Date   // false — it's a string ❌

// With reviver: (key, value) => transformed value
const parsed = JSON.parse(json, (key, value) => {
  // Detect ISO date strings and convert to Date
  if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}T/.test(value)) {
    return new Date(value)
  }
  return value
})
parsed.createdAt instanceof Date   // true ✅
```

```javascript
// ── Error handling ─────────────────────────────────────────────────────────
// JSON.parse throws on invalid JSON
function safeParseJSON(text, fallback = null) {
  try {
    return JSON.parse(text)
  } catch {
    return fallback
  }
}

safeParseJSON('{"valid":true}')   // { valid: true }
safeParseJSON('not json')         // null (fallback)
safeParseJSON(undefined)          // null (fallback)
```

---

## W — Why It Matters

- Silently dropped keys (`undefined`, functions, symbols) is a common API bug — `JSON.stringify({ status: undefined })` gives `'{}'`, not `'{"status":null}'`. If you need `null` in the output, set it explicitly.
- The `replacer` array is the correct way to whitelist API response fields — safer and more explicit than `delete obj.password` on a copy.
- The `reviver` for Date revival is the proper way to restore dates from API responses — without it, `response.createdAt` is always a string even though it looks like a date.

---

## I — Interview Q&A

### Q: What types does `JSON.stringify` not support, and what happens to each?

**A:** Functions, `undefined`, and `Symbol` values on properties cause the key-value pair to be silently omitted. As array elements, they become `null`. `NaN` and `Infinity` become `null`. `Date` is converted to an ISO string. `Map`, `Set`, `WeakMap`, `WeakSet` become `{}` (empty object — their contents are lost). `BigInt` throws a `TypeError`. Class instances lose their methods (only enumerable own properties are serialised). To handle these, use `toJSON` methods on custom classes or a `replacer` function.

---

## C — Common Pitfalls + Fix

### ❌ Expecting JSON.parse to restore Dates as Date objects

```javascript
// ❌ createdAt is a string after parse
const raw = JSON.stringify({ createdAt: new Date() })
const obj = JSON.parse(raw)
obj.createdAt.getFullYear()   // TypeError: obj.createdAt.getFullYear is not a function

// ✅ Use a reviver
const obj2 = JSON.parse(raw, (key, val) => {
  if (typeof val === 'string' && /^\d{4}-\d{2}-\d{2}T/.test(val)) return new Date(val)
  return val
})
obj2.createdAt.getFullYear()   // 2025 ✅
```

---

## K — Coding Challenge + Solution

### Challenge

Implement `safeStringify(value)` that handles `BigInt` (converts to string), `Date` (ISO string), `Map` (to object), `undefined` values (to `null`), and circular references (replace with `"[Circular]"`).

### Solution

```javascript
function safeStringify(value, space) {
  const seen = new WeakSet()

  return JSON.stringify(value, function(key, val) {
    // Handle circular references
    if (typeof val === 'object' && val !== null) {
      if (seen.has(val)) return '[Circular]'
      seen.add(val)
    }
    if (typeof val === 'bigint')    return val.toString()
    if (val instanceof Date)        return val.toISOString()
    if (val instanceof Map)         return Object.fromEntries(val)
    if (val instanceof Set)         return [...val]
    if (val === undefined)          return null
    return val
  }, space)
}

const obj = { id: 42n, date: new Date('2025-01-01'), map: new Map([['a',1]]), undef: undefined }
obj.self = obj   // circular

console.log(safeStringify(obj, 2))
// {
//   "id": "42",
//   "date": "2025-01-01T00:00:00.000Z",
//   "map": { "a": 1 },
//   "undef": null,
//   "self": "[Circular]"
// }
```

---

---

# 10 — Regular Expressions — Literals, Flags, test/match/matchAll/replace, Named Groups

---

## T — TL;DR

Regular expressions match patterns in strings. Create with `/pattern/flags` (literal) or `new RegExp(pattern, flags)` (dynamic). `test` checks existence. `match`/`matchAll` extract matches. `replace`/`replaceAll` substitute. Named capture groups (`(?<name>...)`) make matches readable. Flags: `g` (global), `i` (case-insensitive), `m` (multiline), `s` (dotAll).

---

## K — Key Concepts

```javascript
// ── Creating regex ────────────────────────────────────────────────────────
const re1 = /hello/i                     // literal: case-insensitive
const re2 = new RegExp('hello', 'i')     // constructor: same result
const dynamic = new RegExp(userInput, 'gi')  // runtime pattern — sanitise first!

// ── Flags ──────────────────────────────────────────────────────────────────
// g — global: find ALL matches (without g, stop at first)
// i — case-insensitive
// m — multiline: ^ and $ match line boundaries, not just string
// s — dotAll: . matches \n (by default . doesn't match newlines)
// u — unicode: full Unicode support
// d — indices: provide match index ranges

'Hello HELLO hello'.match(/hello/g)    // ['Hello','HELLO','hello'] ← no, case matters
'Hello HELLO hello'.match(/hello/gi)   // ['Hello','HELLO','hello'] ✅
```

```javascript
// ── test — returns boolean ─────────────────────────────────────────────────
/^\d{4}-\d{2}-\d{2}$/.test('2025-06-15')    // true  — valid date format
/^\d{4}-\d{2}-\d{2}$/.test('2025-6-15')     // false — month must be 2 digits
/^[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}$/i.test('mark@example.com')  // true

// ⚠️ Don't use test() with /g flag and reuse the regex — stateful lastIndex
const re = /a/g
re.test('a')   // true  — lastIndex moves to 1
re.test('a')   // false — starts from lastIndex=1, misses it!
re.lastIndex = 0  // reset before reuse, or use a fresh regex
```

```javascript
// ── match — extract matches ────────────────────────────────────────────────
// Without g: returns first match with capture groups + index
'2025-06-15'.match(/(\d{4})-(\d{2})-(\d{2})/)
// ['2025-06-15', '2025', '06', '15', index: 0, input: '2025-06-15', groups: undefined]

// With g: returns array of all matches (no capture groups)
'cat bat hat'.match(/[cbh]at/g)   // ['cat', 'bat', 'hat']

// If no match: returns null
'hello'.match(/\d+/)  // null — check before accessing!
const m = 'hello'.match(/\d+/)
const digits = m?.[0] ?? 'none'   // safe with optional chaining
```

```javascript
// ── Named capture groups — (?<name>...) ──────────────────────────────────
const dateRe = /(?<year>\d{4})-(?<month>\d{2})-(?<day>\d{2})/
const result = '2025-06-15'.match(dateRe)

result.groups.year    // '2025'
result.groups.month   // '06'
result.groups.day     // '15'

// Named groups in replace
'2025-06-15'.replace(
  /(?<year>\d{4})-(?<month>\d{2})-(?<day>\d{2})/,
  '$<day>/$<month>/$<year>'   // use named groups in replacement
)
// '15/06/2025'
```

```javascript
// ── matchAll — iterate all matches WITH capture groups ────────────────────
// Requires /g flag, returns iterator
const text = 'Jane: 25, John: 30, Bob: 22'
const re = /(?<name>[A-Z][a-z]+): (?<age>\d+)/g

for (const match of text.matchAll(re)) {
  console.log(`${match.groups.name} is ${match.groups.age}`)
}
// Jane is 25 | John is 30 | Bob is 22

// Collect into array
const people = [...text.matchAll(re)].map(m => ({
  name: m.groups.name,
  age:  Number(m.groups.age),
}))
// [{ name:'Jane', age:25 }, { name:'John', age:30 }, { name:'Bob', age:22 }]
```

```javascript
// ── replace / replaceAll with regex ───────────────────────────────────────
// replace with function callback
'hello world foo'.replace(/\b\w/g, c => c.toUpperCase())
// 'Hello World Foo'  — capitalise first letter of each word

// Replace captures
'John Smith'.replace(/(\w+)\s(\w+)/, '$2, $1')   // 'Smith, John'

// Replace with function for complex logic
const template = 'Hello {{name}}, your score is {{score}}.'
const data = { name: 'Mark', score: 95 }
const filled = template.replace(/\{\{(\w+)\}\}/g, (_, key) => data[key] ?? '')
// 'Hello Mark, your score is 95.'

// replaceAll with string (no regex needed for literal replacement)
'aababc'.replaceAll('a', 'x')   // 'xxbxbc' ✅
// replaceAll with regex (must have g flag)
'aababc'.replaceAll(/a/g, 'x')  // 'xxbxbc'
```

```javascript
// ── Common regex patterns ──────────────────────────────────────────────────
const patterns = {
  email:    /^[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}$/i,
  uuid:     /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
  isoDate:  /^\d{4}-\d{2}-\d{2}$/,
  integer:  /^-?\d+$/,
  decimal:  /^-?\d+(\.\d+)?$/,
  url:      /^https?:\/\/[^\s/$.?#].[^\s]*$/i,
  phone_ph: /^(09|\+639)\d{9}$/,  // Philippine mobile
  slug:     /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
}

// Usage
patterns.email.test('mark@example.com')   // true
patterns.slug.test('my-blog-post')        // true
patterns.slug.test('My Blog Post')        // false
```

---

## W — Why It Matters

- `matchAll` over `match` with `/g` is the correct choice when you need both all matches AND their capture groups — `match` with `/g` returns only the full matches, not the groups. `matchAll` returns each match as a full match object with `.groups`.
- Named capture groups make regex readable and maintainable — `match.groups.year` vs `match[1]` is self-documenting. When the regex changes and group order shifts, named groups are unaffected.
- The stateful `/g` flag with `test()` is a classic bug — reusing a regex literal with `/g` maintains `lastIndex` between calls. Either reset `re.lastIndex = 0` or create a new regex each time. Better: use `test()` only with non-`g` regexes.

---

## I — Interview Q&A

### Q: What is the difference between `match` and `matchAll`?

**A:** `match` without the `/g` flag returns the first match as an array including capture groups, `index`, and `groups`. With `/g`, it returns an array of all matched strings but drops capture group information. `matchAll` always requires the `/g` flag and returns an iterator of all matches, each as a full match object with `index`, `groups`, and capture groups. Use `match` for a single match or when you don't need capture groups from multiple matches. Use `matchAll` when you need to iterate all matches and access their named or numbered capture groups.

---

## C — Common Pitfalls + Fix

### ❌ Reusing `/g` regex across `test()` calls — alternating results

```javascript
// ❌ lastIndex persists between calls
const re = /\d+/g
re.test('abc 123')   // true  (lastIndex → 7)
re.test('abc 456')   // false (starts from index 7 — past end) ❌
re.test('abc 789')   // true  (lastIndex reset to 0 after failure)

// ✅ Option 1: no g flag for test
const re2 = /\d+/
re2.test('abc 123')  // true  ✅
re2.test('abc 456')  // true  ✅

// ✅ Option 2: reset lastIndex
re.lastIndex = 0
re.test('abc 456')   // true ✅
```

---

## K — Coding Challenge + Solution

### Challenge

Write a `parseLogLine(line)` function that uses a named capture group regex to parse log lines in the format `[2025-06-15 14:30:00] ERROR: Database connection failed`. Return `{ date, level, message }` or `null` if the format doesn't match.

### Solution

```javascript
const LOG_RE = /^\[(?<date>\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2})\] (?<level>[A-Z]+): (?<message>.+)$/

function parseLogLine(line) {
  const match = line.match(LOG_RE)
  if (!match) return null
  const { date, level, message } = match.groups
  return { date: new Date(date), level, message }
}

console.log(parseLogLine('[2025-06-15 14:30:00] ERROR: Database connection failed'))
// { date: Date..., level: 'ERROR', message: 'Database connection failed' }

console.log(parseLogLine('[2025-06-15 14:31:05] INFO: Server started on port 3000'))
// { date: Date..., level: 'INFO', message: 'Server started on port 3000' }

console.log(parseLogLine('not a log line'))
// null

// Parse multiple lines with matchAll
function parseLogFile(content) {
  const lineRe = /^\[(?<date>\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2})\] (?<level>[A-Z]+): (?<message>.+)$/gm
  return [...content.matchAll(lineRe)].map(m => ({
    date:    new Date(m.groups.date),
    level:   m.groups.level,
    message: m.groups.message,
  }))
}
```

---

## ✅ Day 3 Complete — Arrays, Objects, Serialization & Regex

| # | Subtopic | Status |
|---|----------|--------|
| 1 | Array Creation, Indexing, Mutation vs Immutability | ☐ |
| 2 | Core Array HOFs — map, filter, reduce, find, some, every | ☐ |
| 3 | flat, flatMap, forEach, slice, splice, concat, join, includes, fill, at | ☐ |
| 4 | Array Utilities — from, of, isArray, keys/values/entries, Sorting | ☐ |
| 5 | Object Literals — Shorthand, Computed Properties, Methods | ☐ |
| 6 | Object Static Methods — keys/values/entries/assign/freeze/fromEntries | ☐ |
| 7 | Destructuring and Spread / Rest | ☐ |
| 8 | Shallow vs Deep Copy, structuredClone, Circular References | ☐ |
| 9 | JSON.parse / JSON.stringify — replacer, reviver, gotchas | ☐ |
| 10 | Regular Expressions — flags, test/match/matchAll/replace, named groups | ☐ |

---

## 🗺️ One-Page Mental Model — Day 3

```
ARRAYS
  Creation: [] literal | Array.from({length:n}, fn) | Array.of(...)
  new Array(n) → sparse (avoid) | new Array(n).fill(v) → filled ✅
  .at(-1) → last element | .at(-2) → second-to-last
  Mutating:     push/pop/shift/unshift/splice/sort/reverse/fill
  Non-mutating: map/filter/reduce/slice/concat/flat/flatMap/find/includes
  ES2023:       toSorted/toReversed/toSpliced/with → always non-mutating

CORE ARRAY HOFs
  map(fn)         → transform, same length, new array
  filter(fn)      → keep matching, new array, length ≤ original
  reduce(fn, init) → fold to single value — ALWAYS provide initial value
  find(fn)        → first match or undefined (stops early)
  findIndex(fn)   → first match index or -1
  some(fn)        → true if ANY match (short-circuits)
  every(fn)       → true if ALL match (short-circuits)

MORE ARRAY METHODS
  flat(depth)     → flatten nested arrays (Infinity = fully flat)
  flatMap(fn)     → map then flat(1) — more efficient than two passes
  forEach(fn)     → side effects only, returns undefined, not chainable
  slice(s,e)      → copy portion [s, e), negative indexing supported
  splice(s,n,...) → mutate in place: remove n items, insert rest
  concat(...)     → merge arrays → prefer [...a, ...b]
  join(sep)       → array to string
  includes(v)     → boolean, handles NaN (unlike indexOf)
  fill(v,s,e)     → fill range with value (mutating)

ARRAY UTILITIES
  Array.isArray(v)    → only correct array check (typeof gives 'object')
  Array.from(iter,fn) → any iterable/array-like → real array
  Array.from({length:n}, (_,i) => ...) → create computed array
  keys/values/entries → iterators for index / value / [index,value]
  sort comparator: (a,b) => a-b (asc) | b-a (desc) | localeCompare (strings)

OBJECT LITERALS
  { name, age }              → shorthand (key = variable name)
  { method() {} }            → shorthand method
  { [expr]: value }          → computed property name
  obj.key vs obj['key']      → dot=static, bracket=dynamic
  Object.hasOwn(obj, key)    → safe own-property check (prefer over hasOwnProperty)

OBJECT STATIC METHODS
  keys/values/entries(obj)   → own enumerable properties
  fromEntries(pairs)         → [[k,v]] → object
  assign({}, a, b)           → shallow merge → prefer { ...a, ...b }
  freeze(obj)                → no add/modify/delete (SHALLOW only)
  seal(obj)                  → no add/delete, modify allowed
  create(proto)              → set prototype | create(null) → pure dict
  defineProperty(obj,k,desc) → writable/enumerable/configurable control

DESTRUCTURING + SPREAD/REST
  const [a, ,c]  = arr       → array destructure, skip with comma
  const {a:x=5}  = obj       → rename + default
  const {a,...r} = obj       → rest = remaining properties
  [...arr]                   → shallow copy
  {...obj, key:v}            → merge + override
  Spread = unpack | Rest = collect
  Function params: ({a,b}={}) → object params with fallback

COPY PATTERNS
  Shallow: {...obj} or Object.assign({},{}) → top level only
  Deep:    structuredClone(obj) → best (handles Date,Set,Map,circular)
  JSON.parse(JSON.stringify()) → lossy (loses Date,Map,Set,undefined,fn)
  Circular refs → crash JSON.stringify, fine with structuredClone
  structuredClone limits: no functions, no class methods, no DOM nodes

JSON
  stringify(v, replacer, space) → JS → string
  parse(s, reviver)             → string → JS
  Silently drops: undefined, functions, Symbol (as object keys)
  Converts: NaN→null, Infinity→null, Date→ISO string
  Map/Set → {} (empty!) BigInt → throws TypeError
  replacer: array = whitelist keys | fn = transform each key/value
  reviver: fn to restore types (especially Date) during parse
  toJSON() method on class → custom serialisation
  safeParseJSON: always try/catch JSON.parse

REGEX
  /pattern/flags → literal | new RegExp(str, flags) → dynamic
  Flags: g=global, i=case-insensitive, m=multiline, s=dotAll
  test(str)          → boolean | ⚠️ stateful with /g — reset lastIndex
  match(re)          → first match + groups | with /g → all strings, no groups
  matchAll(re)       → iterator of ALL matches WITH groups (requires /g)
  replace(re, str|fn)→ first match | with /g → all
  replaceAll(str,rep)→ all literal matches
  Named groups: (?<name>...)  → match.groups.name
  Replace with named: '$<name>' in replacement string
  ⚠️ /g + test() alternates true/false — use without g for pure test
```

> **Your next action:** Open a REPL, type `[1,2,3,4,5].reduce((acc,n) => ({ ...acc, [n]: n*n }), {})` and see reduce build an object. One live experiment beats a paragraph of reading.

> "Doing one small thing beats opening a feed."