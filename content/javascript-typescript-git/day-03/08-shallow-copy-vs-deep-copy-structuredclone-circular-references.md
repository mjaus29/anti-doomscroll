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
