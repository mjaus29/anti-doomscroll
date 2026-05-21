# 6 — Iterables and Symbol.iterator

---

## T — TL;DR

An **iterable** is any object with a `[Symbol.iterator]()` method. Built-ins: Array, String, Map, Set, TypedArray, arguments, NodeList. Implementing `[Symbol.iterator]` makes your class work with `for...of`, spread, destructuring, and `Array.from` — first-class JavaScript citizens.

---

## K — Key Concepts

```javascript
// ── Built-in iterables ─────────────────────────────────────────────────────
for (const char of 'hello') console.log(char)    // h e l l o
for (const [k, v] of new Map([['a',1]])) {}       // Map is iterable
for (const v of new Set([1,2,3])) {}              // Set is iterable
[...'hello']         // ['h','e','l','l','o']
const [a, b] = 'hi'  // a='h', b='i'

// ── The iterable protocol ──────────────────────────────────────────────────
// An object is iterable if it has [Symbol.iterator]()
// that returns an iterator: { next() → { value, done } }

const iterable = {
  data: [10, 20, 30],
  [Symbol.iterator]() {        // ← makes it iterable
    let index = 0
    const data = this.data
    return {                   // ← returns an iterator
      next() {
        if (index < data.length) return { value: data[index++], done: false }
        return { value: undefined, done: true }
      }
    }
  }
}

for (const v of iterable) console.log(v)   // 10, 20, 30
[...iterable]                              // [10, 20, 30] ✅
const [first] = iterable                   // 10 ✅
Array.from(iterable)                       // [10, 20, 30] ✅
```

```javascript
// ── Self-referential iterator (iterable iterator) ─────────────────────────
// Object is BOTH iterable AND iterator
const counter = {
  current: 0,
  max: 5,
  [Symbol.iterator]() { return this },   // returns itself
  next() {
    if (this.current < this.max) return { value: this.current++, done: false }
    return { value: undefined, done: true }
  }
}
[...counter]   // [0, 1, 2, 3, 4]

// ── Iterable class ─────────────────────────────────────────────────────────
class LinkedList {
  #head = null
  append(value) {
    const node = { value, next: null }
    if (!this.#head) { this.#head = node; return this }
    let curr = this.#head
    while (curr.next) curr = curr.next
    curr.next = node
    return this
  }

  [Symbol.iterator]() {
    let current = this.#head
    return {
      next() {
        if (current) {
          const value = current.value
          current = current.next
          return { value, done: false }
        }
        return { value: undefined, done: true }
      }
    }
  }
}

const list = new LinkedList()
list.append(1).append(2).append(3)
[...list]                    // [1, 2, 3] ✅
for (const v of list) {}     // ✅
const [h, ...rest] = list    // h=1, rest=[2,3] ✅
```

---

## W — Why It Matters

- Making your data structures iterable integrates them with the entire JavaScript ecosystem — `for...of`, spread, destructuring, `Array.from`, `Promise.all`, `new Map(iterable)`. One method unlocks everything.
- `String`, `Map`, and `Set` are all iterable for this reason — their data can be consumed uniformly. `Object` is NOT iterable by default — you iterate it via `Object.entries()` which returns an iterable array.
- An iterable can be infinite — a Range iterable that goes `1, 2, 3...` forever is valid. Combined with `break` in `for...of` or a `take()` utility, this enables elegant lazy sequence generation.

---

## I — Interview Q&A

### Q: What is the iterable protocol and what built-in syntax relies on it?

**A:** The iterable protocol requires an object to have a `[Symbol.iterator]()` method that returns an iterator — an object with a `next()` method returning `{ value, done }`. All of the following rely on this protocol: `for...of` loops, spread operator `[...iterable]`, array destructuring `const [a, b] = iterable`, `Array.from(iterable)`, `new Map(iterable)`, `new Set(iterable)`, `Promise.all(iterable)`, `yield*` in generators, and `for await...of` (async iterable variant). Any object implementing `[Symbol.iterator]` works with all of these automatically.

---

## C — Common Pitfalls + Fix

### ❌ Iterating a depleted iterator — returns nothing

```javascript
// ❌ Array's iterator is stateful — depleted after one pass
const iter = [1, 2, 3][Symbol.iterator]()
[...iter]   // [1, 2, 3]
[...iter]   // [] — iterator is exhausted ❌

// Arrays are re-iterable because each [Symbol.iterator]() creates a NEW iterator
const arr = [1, 2, 3]
[...arr]    // [1, 2, 3] ✅
[...arr]    // [1, 2, 3] ✅ — fresh iterator each time

// ✅ Self-referential iterators (return this) are single-use — don't reuse
// ✅ Proper iterables return a new iterator object each time
```

---

## K — Coding Challenge + Solution

### Challenge

Create an `InfiniteCounter(start, step)` iterable class that yields numbers indefinitely. Use it with a `take(n, iterable)` utility to get the first `n` values without an infinite loop.

### Solution

```javascript
class InfiniteCounter {
  constructor(start = 0, step = 1) {
    this.start = start
    this.step  = step
  }

  [Symbol.iterator]() {
    let current = this.start
    const step  = this.step
    return {
      next() { return { value: current, done: (current += step) - step >= Infinity } },
      // Simpler:
      next() { const value = current; current += step; return { value, done: false } }
    }
  }
}

function take(n, iterable) {
  const result = []
  for (const item of iterable) {
    result.push(item)
    if (result.length >= n) break
  }
  return result
}

take(5, new InfiniteCounter(0, 2))    // [0, 2, 4, 6, 8]
take(5, new InfiniteCounter(10, 3))   // [10, 13, 16, 19, 22]
```

---

---
