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
