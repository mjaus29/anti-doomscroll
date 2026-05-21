# 8 — Generators — yield, yield*, lazy evaluation

---

## T — TL;DR

A **generator function** (`function*`) returns a generator — both an iterable and an iterator. `yield` pauses execution and sends a value out. `yield*` delegates to another iterable. `return` ends the generator. Two-way communication: the caller can send values back via `next(value)` and errors via `throw(err)`. Generators enable lazy sequences, infinite streams, and coroutine-like control flow.

---

## K — Key Concepts

```javascript
// ── Basic generator ────────────────────────────────────────────────────────
function* count(start = 0) {
  let n = start
  while (true) {
    yield n++     // pause, send n, wait to resume
  }
}

const counter = count(1)
counter.next()   // { value: 1, done: false }
counter.next()   // { value: 2, done: false }
[...take(5, count(10))]  // [10,11,12,13,14] ✅ (with take from subtopic 6)

// ── Finite generator ──────────────────────────────────────────────────────
function* range(start, end, step = 1) {
  for (let i = start; i <= end; i += step) yield i
}
[...range(1, 5)]     // [1, 2, 3, 4, 5]
[...range(0, 10, 2)] // [0, 2, 4, 6, 8, 10]
```

```javascript
// ── yield* — delegate to another iterable ─────────────────────────────────
function* flatten(arr) {
  for (const item of arr) {
    if (Array.isArray(item)) yield* flatten(item)  // recurse ✅
    else yield item
  }
}
[...flatten([1,[2,[3,[4]],5]])]   // [1, 2, 3, 4, 5]

// yield* on any iterable
function* concat(...iterables) {
  for (const it of iterables) yield* it
}
[...concat([1,2], 'abc', new Set([3,4]))]
// [1, 2, 'a', 'b', 'c', 3, 4]
```

```javascript
// ── Two-way communication ──────────────────────────────────────────────────
function* adder() {
  let total = 0
  while (true) {
    const n = yield total    // yield current total; receive next n
    total  += n
  }
}

const gen = adder()
gen.next()      // { value: 0, done: false }  — start (n = undefined)
gen.next(10)    // { value: 10, done: false } — send 10, receive 10
gen.next(5)     // { value: 15, done: false } — send 5, receive 15
gen.next(3)     // { value: 18, done: false }

// ── generator.return(value) — terminate ──────────────────────────────────
const g = range(1, 100)
g.next()          // { value: 1, done: false }
g.return(99)      // { value: 99, done: true } — ends the generator
g.next()          // { value: undefined, done: true }

// ── generator.throw(err) — inject error ──────────────────────────────────
function* safe() {
  try {
    yield 1
    yield 2
  } catch (err) {
    console.error('caught:', err.message)
    yield -1   // recovery value
  }
}
const s = safe()
s.next()                              // { value: 1 }
s.throw(new Error('injected'))        // caught: injected → { value: -1 }
```

```javascript
// ── Lazy evaluation benefit ────────────────────────────────────────────────
// ❌ Eager: computes all 1 million values upfront
const eagerSquares = Array.from({ length: 1_000_000 }, (_, i) => i * i)
// 1M numbers in memory

// ✅ Lazy: computes on demand
function* lazySquares() {
  let n = 0
  while (true) yield n++ ** 2
}

function* takeWhile(predicate, iterable) {
  for (const v of iterable) {
    if (!predicate(v)) break
    yield v
  }
}

const result = [...takeWhile(n => n < 100, lazySquares())]
// [0, 1, 4, 9, 16, 25, 36, 49, 64, 81] — only computes what's needed ✅
```

---

## W — Why It Matters

- Generators are how Redux-Saga and similar middleware libraries work — `yield effect` pauses the saga, the middleware intercepts the yielded value (an effect descriptor), runs it, and resumes the generator with the result. This makes async flows testable.
- `yield*` for recursive data structures (flatten, tree traversal) produces clean, readable code compared to the iterative alternative with a manual stack.
- Lazy evaluation via generators handles infinite sequences and large datasets — a generator for reading CSV lines yields one row at a time, using constant memory regardless of file size.

---

## I — Interview Q&A

### Q: What is the difference between `yield` and `yield*` in a generator?

**A:** `yield value` pauses the generator and emits `value` to the consumer — one value per `yield`. `yield* iterable` delegates to another iterable, emitting all its values in sequence as if they were yielded individually from the current generator. `yield* inner` is equivalent to `for (const v of inner) yield v`. The key addition: `yield*` returns the value passed to the inner generator's `return()` — the expression `const result = yield* inner` captures that return value, which `for...of` alone can't do. Use `yield*` for composing generators, recursive iteration, and flattening nested iterables.

---

## C — Common Pitfalls + Fix

### ❌ First `next()` call can't send a meaningful value

```javascript
// ❌ The value passed to the FIRST next() is always discarded
function* receiver() {
  const first = yield 'ready'   // first next() starts here
  console.log('received:', first)
}
const g = receiver()
g.next('ignored')   // 'ignored' is discarded — generator wasn't at a yield yet
g.next('hello')     // received: hello ✅

// ✅ Prime the generator first (call next() once to reach first yield)
const g2 = receiver()
g2.next()           // prime — reaches first yield, returns { value: 'ready' }
g2.next('hello')    // received: hello ✅

// Utility to auto-prime
function prime(gen) {
  gen.next()   // advance to first yield
  return gen
}
```

---

## K — Coding Challenge + Solution

### Challenge

Write a generator `function* tree(node)` that does an in-order depth-first traversal of a binary tree. Each node is `{ value, left, right }`. Show it with `yield*` for clean recursion.

### Solution

```javascript
function* inOrder(node) {
  if (!node) return
  yield* inOrder(node.left)    // left subtree
  yield node.value             // current node
  yield* inOrder(node.right)   // right subtree
}

const tree = {
  value: 4,
  left:  { value: 2, left: { value: 1, left: null, right: null },
                      right: { value: 3, left: null, right: null } },
  right: { value: 6, left: { value: 5, left: null, right: null },
                      right: { value: 7, left: null, right: null } },
}

console.log([...inOrder(tree)])   // [1, 2, 3, 4, 5, 6, 7] ✅

// Pre-order traversal with yield*
function* preOrder(node) {
  if (!node) return
  yield node.value
  yield* preOrder(node.left)
  yield* preOrder(node.right)
}
console.log([...preOrder(tree)])  // [4, 2, 1, 3, 6, 5, 7]
```

---

---
