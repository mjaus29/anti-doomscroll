# 9 — Map, Set, WeakMap, WeakSet, WeakRef

---

## T — TL;DR

`Map` is a key-value store where keys can be any type (vs Object which stringifies keys). `Set` is a collection of unique values. `WeakMap`/`WeakSet` hold weak references — entries are garbage-collected when the key object is no longer reachable. `WeakRef` holds a weak reference to a single object. Use weak collections for metadata caches that shouldn't prevent GC.

---

## K — Key Concepts

```javascript
// ── Map — any type as key ─────────────────────────────────────────────────
const map = new Map()
map.set('string', 1)
map.set(42, 'number key')
map.set({}, 'object key')   // object as key ✅
map.set(Symbol('s'), 'sym')

map.get('string')   // 1
map.has(42)         // true
map.size            // 4
map.delete('string')

// Map from array
const m = new Map([['a', 1], ['b', 2], ['c', 3]])
// Iteration
for (const [key, value] of m) {}
[...m.keys()]      // ['a', 'b', 'c']
[...m.values()]    // [1, 2, 3]
[...m.entries()]   // [['a',1],['b',2],['c',3]]
m.forEach((v, k) => console.log(k, v))

// Map vs Object:
// Map: any key type, ordered by insertion, .size, iterable
// Object: string/symbol keys only, prototype pollution risk, no .size
// Use Map when: keys are non-strings, unknown keys, frequent add/delete
```

```javascript
// ── Set — unique values ────────────────────────────────────────────────────
const set = new Set([1, 2, 2, 3, 3, 3])
set   // Set {1, 2, 3}
set.size         // 3
set.has(2)       // true
set.add(4)
set.delete(1)

// Deduplicate array
const unique = [...new Set([1,2,2,3,3,4])]  // [1,2,3,4] ✅

// Set operations (ES2024 has native methods)
const a = new Set([1, 2, 3, 4])
const b = new Set([3, 4, 5, 6])

// Union
const union = new Set([...a, ...b])             // {1,2,3,4,5,6}
// Intersection
const inter = new Set([...a].filter(x => b.has(x)))  // {3,4}
// Difference
const diff  = new Set([...a].filter(x => !b.has(x))) // {1,2}

// ES2024 native (if available)
a.union(b)        // {1,2,3,4,5,6}
a.intersection(b) // {3,4}
a.difference(b)   // {1,2}
```

```javascript
// ── WeakMap — weak object key references ──────────────────────────────────
// Keys MUST be objects (or registered symbols in ES2023)
// Entries are automatically removed when key is garbage collected
// NOT enumerable — no .size, .keys(), .values()

const cache = new WeakMap()

function processUser(user) {
  if (cache.has(user)) return cache.get(user)   // cached result ✅
  const result = expensiveCompute(user)
  cache.set(user, result)
  return result
}
// When 'user' object is GC'd, its cache entry is automatically removed ✅
// No memory leak — WeakMap doesn't prevent GC ✅

// ── WeakSet — weak object references ──────────────────────────────────────
const initialized = new WeakSet()

function init(obj) {
  if (initialized.has(obj)) return   // already initialized
  doSetup(obj)
  initialized.add(obj)
}
// When obj is GC'd, removed from WeakSet automatically ✅
```

```javascript
// ── WeakRef — weak single-object reference ────────────────────────────────
// Allows you to hold a reference without preventing GC
// .deref() returns the object or undefined if it's been collected

class ObjectPool {
  #pool = new Map()

  get(key, factory) {
    const ref = this.#pool.get(key)
    const cached = ref?.deref()     // deref() — may return undefined
    if (cached) return cached

    const fresh = factory()
    this.#pool.set(key, new WeakRef(fresh))   // weak reference ✅
    return fresh
  }
}
// If cached objects aren't used, GC can reclaim them
// Without WeakRef: regular Map reference keeps objects alive forever

// FinalizationRegistry — callback when WeakRef target is GC'd
const registry = new FinalizationRegistry((key) => {
  console.log(`Object with key "${key}" was garbage collected`)
})
const obj = { data: 'big data' }
registry.register(obj, 'myKey')
```

---

## W — Why It Matters

- `Map` outperforms `Object` for frequent key insertions/deletions and non-string keys — benchmark-wise, `Map.get`/`.set` is faster for dynamic key workloads, and there's no prototype chain to worry about.
- `WeakMap` for private data is the pre-`#field` pattern — store private state in a `WeakMap` keyed by the instance, preventing external access while avoiding memory leaks. `#fields` replaced this but you'll see the pattern in legacy code.
- `WeakMap` and `WeakSet` prevent memory leaks in caches and metadata stores — if you cache computed results in a `Map` with DOM nodes as keys, removed DOM nodes stay in the Map forever. `WeakMap` automatically cleans up when the DOM node is removed.

---

## I — Interview Q&A

### Q: When would you use a `WeakMap` instead of a `Map`?

**A:** Use `WeakMap` when: (1) the keys are objects whose lifetime you don't control and you don't want to prevent garbage collection, (2) you're caching computed results per object instance — when the object is GC'd, the cached result is automatically cleared, (3) you're attaching private metadata to objects (pre-`#field` pattern). Use `Map` when: you need to enumerate keys (`.size`, `.keys()`), keys may be non-object primitives, or you need the entries to persist even after the key object is no longer referenced elsewhere. `WeakMap` is opaque and automatic — you trade visibility for automatic memory management.

---

## C — Common Pitfalls + Fix

### ❌ Using Object as a Map — string coercion of keys

```javascript
// ❌ Object coerces all keys to strings
const obj = {}
const key1 = { id: 1 }
const key2 = { id: 2 }
obj[key1] = 'user1'
obj[key2] = 'user2'  // ❌ both become obj['[object Object]']!
console.log(Object.keys(obj))   // ['[object Object]'] — only one entry ❌

// ✅ Map preserves key identity
const map = new Map()
map.set(key1, 'user1')
map.set(key2, 'user2')
map.size   // 2 ✅
map.get(key1)  // 'user1' ✅
```

---

## K — Coding Challenge + Solution

### Challenge

Implement a `LRUCache(capacity)` class using a `Map` (insertion-order iteration). It should have `get(key)` (returns value or -1, moves to end) and `put(key, value)` (evicts oldest when over capacity).

### Solution

```javascript
class LRUCache {
  #capacity
  #cache = new Map()   // insertion order = LRU order

  constructor(capacity) { this.#capacity = capacity }

  get(key) {
    if (!this.#cache.has(key)) return -1
    const value = this.#cache.get(key)
    this.#cache.delete(key)      // remove
    this.#cache.set(key, value)  // re-insert at end (most recently used)
    return value
  }

  put(key, value) {
    if (this.#cache.has(key)) this.#cache.delete(key)
    this.#cache.set(key, value)
    if (this.#cache.size > this.#capacity) {
      const oldest = this.#cache.keys().next().value  // first key = oldest
      this.#cache.delete(oldest)
    }
  }
}

const lru = new LRUCache(3)
lru.put(1, 'a'); lru.put(2, 'b'); lru.put(3, 'c')
lru.get(1)        // 'a' — moves 1 to end
lru.put(4, 'd')   // evicts 2 (now oldest)
lru.get(2)        // -1 — evicted ✅
lru.get(3)        // 'c' ✅
```

---

---
