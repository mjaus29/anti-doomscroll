# 8 — keyof, typeof in Type Position, Tuples

---

## T — TL;DR

`keyof T` produces a union of all keys of type `T`. `typeof` in type position extracts the TypeScript type of a value. Together they enable **type-safe property access**, deriving types from values, and building utilities. **Tuples** are fixed-length arrays where each position has a known type — use them for function arguments, return pairs, and coordinate data.

---

## K — Key Concepts

```typescript
// ── keyof ─────────────────────────────────────────────────────────────────
interface User {
  id:    number
  name:  string
  email: string
}

type UserKey = keyof User   // 'id' | 'name' | 'email'

// Type-safe property access
function getProperty<T, K extends keyof T>(obj: T, key: K): T[K] {
  return obj[key]   // T[K] = "the type of T's property K"
}
const user = { id: 1, name: 'Mark', email: 'm@ex.com' }
getProperty(user, 'name')   // type: string ✅
getProperty(user, 'id')     // type: number ✅
getProperty(user, 'age')    // TS error: 'age' not in keyof User ✅

// keyof with index signatures
type StringMap = Record<string, number>
type K = keyof StringMap   // string | number (number keys coerce to string in JS)

// keyof typeof — derive keys from a value
const COLORS = { red: '#ff0000', green: '#00ff00', blue: '#0000ff' } as const
type ColorName = keyof typeof COLORS   // 'red' | 'green' | 'blue'
```

```typescript
// ── typeof in type position ────────────────────────────────────────────────
// typeof extracts the TypeScript type of a VALUE

const user = { id: 1, name: 'Mark', active: true }
type UserType = typeof user   // { id: number; name: string; active: boolean }

function add(a: number, b: number) { return a + b }
type AddFn = typeof add   // (a: number, b: number) => number

// Derive type from a large config object (DRY — no separate interface)
const defaultConfig = {
  host:     'localhost',
  port:     5432,
  poolSize: 10,
  ssl:      false,
}
type Config = typeof defaultConfig   // derived from value ✅

function createConnection(config: Partial<Config>) {
  return { ...defaultConfig, ...config }
}

// ReturnType<T> — extract return type of a function
type ConnectionType = ReturnType<typeof createConnection>
// { host: string; port: number; poolSize: number; ssl: boolean }
```

```typescript
// ── Tuples ────────────────────────────────────────────────────────────────
// Fixed-length, fixed-type arrays
type Point2D     = [number, number]
type StringBool  = [string, boolean]
type GoResult<T> = [T, null] | [null, Error]   // Go-style error handling

const point: Point2D = [10, 20]
point[0]   // number ✅
point[2]   // TS error: Tuple has no element at index 2 ✅

// Named tuple elements (TS 4.0+)
type Range = [start: number, end: number, step?: number]
const r: Range = [1, 10]         // step is optional ✅
const r2: Range = [1, 10, 2]     // ✅

// Tuple destructuring
const [x, y] = point
const [result, error]: GoResult<User> = await safeGet(userId)

// Rest in tuples
type AtLeastTwo = [number, number, ...number[]]
type EndsWithString = [number, number, string]
```

```typescript
// ── Combining keyof + typeof + tuples ─────────────────────────────────────
// Extract entry tuple type from an object
const STATUS_MAP = {
  active:    1,
  inactive:  2,
  suspended: 3,
} as const
type StatusEntry = [keyof typeof STATUS_MAP, typeof STATUS_MAP[keyof typeof STATUS_MAP]]
// ['active' | 'inactive' | 'suspended', 1 | 2 | 3]

const entries = Object.entries(STATUS_MAP) as StatusEntry[]

// Utility: typed Object.keys
function typedKeys<T extends object>(obj: T): (keyof T)[] {
  return Object.keys(obj) as (keyof T)[]
}
typedKeys({ a: 1, b: 2 })   // ('a' | 'b')[] ✅
```

---

## W — Why It Matters

- `keyof T` + `T[K]` is the foundation of most TypeScript utility types — `Partial<T>`, `Pick<T, K>`, `Omit<T, K>`, `Record<K, V>` all use these internally. Understanding them means you can write your own.
- `typeof` on values prevents type drift — if `defaultConfig` changes, `Config` (derived via `typeof`) automatically updates everywhere. Separate interfaces can become stale.
- Tuples for Go-style `[result, error]` returns are a TypeScript-idiomatic alternative to throwing — they make error handling explicit at the call site without try/catch, and TypeScript ensures you destructure correctly.

---

## I — Interview Q&A

### Q: What does `T[K]` mean in TypeScript and when do you use it?

**A:** `T[K]` is an indexed access type — it produces the type of property `K` on type `T`. If `T = { name: string; age: number }` and `K = 'name'`, then `T[K]` = `string`. When `K` is `keyof T`, TypeScript ensures K is a valid key and infers the correct value type. Use it to: write generic property accessors (`function get<T, K extends keyof T>(o: T, k: K): T[K]`), build Pick/Omit utilities, derive union types from objects (`typeof OBJ[keyof typeof OBJ]`), and type-safe mapping over object properties.

---

## C — Common Pitfalls + Fix

### ❌ Tuple inferred as array — losing position types

```typescript
// ❌ TypeScript infers array, not tuple
function divmod(a: number, b: number) {
  return [Math.floor(a / b), a % b]   // type: number[] ❌ (not [number, number])
}
const [q, r] = divmod(10, 3)
q.toFixed(2)   // number — fine, but TypeScript doesn't know q is first

// ✅ Annotate return type as tuple
function divmod2(a: number, b: number): [quotient: number, remainder: number] {
  return [Math.floor(a / b), a % b]   // type: [number, number] ✅
}
const [quotient, remainder] = divmod2(10, 3)   // named positions ✅
```

---

## K — Coding Challenge + Solution

### Challenge

Write `pick<T, K extends keyof T>(obj: T, keys: K[]): Pick<T, K>` and `omit<T, K extends keyof T>(obj: T, keys: K[]): Omit<T, K>`. Then write `typedEntries<T extends object>(obj: T): [keyof T, T[keyof T]][]`.

### Solution

```typescript
function pick<T extends object, K extends keyof T>(obj: T, keys: K[]): Pick<T, K> {
  const result = {} as Pick<T, K>
  for (const key of keys) result[key] = obj[key]
  return result
}

function omit<T extends object, K extends keyof T>(obj: T, keys: K[]): Omit<T, K> {
  const result = { ...obj }
  for (const key of keys) delete result[key]
  return result as Omit<T, K>
}

function typedEntries<T extends object>(obj: T): [keyof T, T[keyof T]][] {
  return Object.entries(obj) as [keyof T, T[keyof T]][]
}

const user = { id: 1, name: 'Mark', email: 'm@ex.com', password: 'secret' }

const public_  = pick(user, ['id', 'name', 'email'])   // Pick<User, 'id'|'name'|'email'>
const safe     = omit(user, ['password'])               // Omit<User, 'password'>
const entries  = typedEntries(user)                     // [keyof User, User[keyof User]][]

// Type inference: no 'as any' needed, all type-safe ✅
```

---

---
