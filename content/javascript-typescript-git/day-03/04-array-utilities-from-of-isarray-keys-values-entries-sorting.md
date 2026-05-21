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
