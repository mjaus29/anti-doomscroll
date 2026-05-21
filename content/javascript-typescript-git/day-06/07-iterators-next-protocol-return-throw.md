# 7 — Iterators — next() Protocol, return(), throw()

---

## T — TL;DR

An **iterator** has `next()` → `{value, done}`. Optionally: `return(value)` for early termination (cleanup), `throw(err)` to inject an error. These are used by `for...of` internally — `break` calls `return()`, thrown errors inside the loop call `throw()`. Understanding this enables correct resource cleanup in custom iterators.

---

## K — Key Concepts

```javascript
// ── Iterator protocol detail ───────────────────────────────────────────────
const iter = [1, 2, 3][Symbol.iterator]()

iter.next()   // { value: 1, done: false }
iter.next()   // { value: 2, done: false }
iter.next()   // { value: 3, done: false }
iter.next()   // { value: undefined, done: true }
iter.next()   // { value: undefined, done: true } — stays done

// ── return() — called by for...of on early exit ────────────────────────────
function makeFileIterator(lines) {
  let index    = 0
  let isOpen   = true
  return {
    next() {
      if (!isOpen || index >= lines.length) return { value: undefined, done: true }
      return { value: lines[index++], done: false }
    },
    return(value) {
      // Called when for...of loop breaks early
      isOpen = false
      console.log('File closed (early exit)')
      return { value, done: true }   // must return { value, done }
    },
    [Symbol.iterator]() { return this }
  }
}

const fileIter = makeFileIterator(['line1', 'line2', 'line3', 'line4'])
for (const line of fileIter) {
  console.log(line)
  if (line === 'line2') break   // triggers fileIter.return() ✅
}
// line1, line2, "File closed (early exit)"
```

```javascript
// ── throw() — inject error into iterator ──────────────────────────────────
function makeResumableIter(items) {
  let index = 0
  return {
    next(injected) {
      // injected = value sent back via .next(value) in generators
      return index < items.length
        ? { value: items[index++], done: false }
        : { value: undefined, done: true }
    },
    throw(err) {
      console.error('Iterator received error:', err.message)
      return { value: undefined, done: true }   // terminate gracefully
    },
    [Symbol.iterator]() { return this }
  }
}
```

```javascript
// ── Consuming iterators manually ──────────────────────────────────────────
function collectAll(iterable) {
  const iterator = iterable[Symbol.iterator]()
  const results  = []

  try {
    while (true) {
      const { value, done } = iterator.next()
      if (done) break
      results.push(value)
    }
  } catch (err) {
    iterator.return?.()   // cleanup on error ✅
    throw err
  }
  return results
}

// ── Checking if something is iterable ────────────────────────────────────
function isIterable(value) {
  return value != null && typeof value[Symbol.iterator] === 'function'
}

isIterable([1,2,3])    // true
isIterable('hello')    // true
isIterable(new Map())  // true
isIterable({})         // false — plain objects are NOT iterable
isIterable(42)         // false
```

---

## W — Why It Matters

- `return()` on iterators is how `for...of` prevents resource leaks — database cursor iterators, file stream iterators, and network stream iterators should implement `return()` to close connections when the loop breaks early. Without it, connections leak.
- Manual iterator consumption (`while (true)` + `.next()`) is the pattern in generator-based middleware (Redux-Saga) and streaming parsers where you need more control than `for...of` provides.
- `isIterable` guard is necessary before spreading or `for...of` — spreading a non-iterable throws a `TypeError`. Always check for large inputs from external sources.

---

## I — Interview Q&A

### Q: What does `return()` on an iterator do and when is it called?

**A:** `return(value)` is an optional method on iterators that signals early termination — a chance for the iterator to release resources. It's called automatically by `for...of` when the loop exits early via `break`, `return`, or a `throw`. It must return `{ value, done: true }`. If your iterator holds resources (open file handle, database cursor, network connection), implement `return()` to close them — otherwise `break`ing out of a `for...of` over your iterator leaks the resource. Generators automatically handle `return()` by resuming the generator at the `yield` and running any `finally` blocks.

---

## C — Common Pitfalls + Fix

### ❌ Iterator that doesn't implement `return()` — resource leak on break

```javascript
// ❌ DB cursor not closed when loop breaks early
function dbCursorIter(cursor) {
  return {
    async next() {
      const row = await cursor.fetchOne()
      return row ? { value: row, done: false } : { value: undefined, done: true }
    },
    // No return() — cursor never closed if loop breaks ❌
    [Symbol.iterator]() { return this }
  }
}

// ✅ Implement return() for cleanup
function dbCursorIter2(cursor) {
  return {
    async next() {
      const row = await cursor.fetchOne()
      return row ? { value: row, done: false } : { value: undefined, done: true }
    },
    async return() {
      await cursor.close()   // always close cursor ✅
      return { value: undefined, done: true }
    },
    [Symbol.iterator]() { return this }
  }
}
```

---

## K — Coding Challenge + Solution

### Challenge

Implement a `zip(...iterables)` function that yields tuples from multiple iterables simultaneously (like Python's `zip`), stopping when the shortest iterable is exhausted. Properly call `return()` on remaining iterators.

### Solution

```javascript
function* zip(...iterables) {
  const iters = iterables.map(it => it[Symbol.iterator]())
  try {
    while (true) {
      const results = iters.map(it => it.next())
      if (results.some(r => r.done)) break
      yield results.map(r => r.value)
    }
  } finally {
    // Close any iterators that are still open (have return())
    for (const iter of iters) iter.return?.()
  }
}

[...zip([1,2,3], ['a','b','c'])]
// [[1,'a'], [2,'b'], [3,'c']]

[...zip([1,2,3], ['a','b'])]
// [[1,'a'], [2,'b']] — stops at shortest ✅

for (const [num, letter] of zip([1,2,3,4,5], 'abc')) {
  console.log(num, letter)   // 1 a, 2 b, 3 c
}
```

---

---
