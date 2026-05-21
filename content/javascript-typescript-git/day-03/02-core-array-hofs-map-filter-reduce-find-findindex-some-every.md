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
