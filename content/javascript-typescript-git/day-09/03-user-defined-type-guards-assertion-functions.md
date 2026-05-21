# 3 — User-defined Type Guards + Assertion Functions

---

## T — TL;DR

**Type guards** are functions that return `value is T` — they narrow the caller's view of a variable after the call. **Assertion functions** (`asserts value is T`) narrow inline and throw if the assertion fails — they tell TypeScript "after this call, treat the value as T." Both extend narrowing beyond what TypeScript can infer automatically.

---

## K — Key Concepts

```typescript
// ── User-defined type guard ───────────────────────────────────────────────
// Return type 'value is T' = predicate signature
function isString(value: unknown): value is string {
  return typeof value === 'string'
}
function isUser(value: unknown): value is User {
  return (
    typeof value === 'object' && value !== null &&
    'id'   in value && typeof (value as any).id   === 'number' &&
    'name' in value && typeof (value as any).name === 'string'
  )
}

// Before calling: 'value' is unknown
const raw: unknown = JSON.parse('{"id":1,"name":"Mark"}')

if (isUser(raw)) {
  raw.name.toUpperCase()   // ✅ TypeScript knows it's User inside this block
}

// ── Array filter with type guard ──────────────────────────────────────────
// Without type guard: filter doesn't narrow the type
const mixed: (string | null)[] = ['a', null, 'b', null, 'c']
const noGuard = mixed.filter(x => x !== null)
// type: (string | null)[] — TypeScript doesn't know ❌

// With type guard: filter narrows the result array type
function notNull<T>(value: T | null | undefined): value is T {
  return value != null
}
const withGuard = mixed.filter(notNull)   // type: string[] ✅
```

```typescript
// ── Reusable type guard builders ──────────────────────────────────────────
// Generic "is array of T" guard
function isArrayOf<T>(
  arr: unknown,
  guard: (item: unknown) => item is T
): arr is T[] {
  return Array.isArray(arr) && arr.every(guard)
}

const maybeUsers: unknown = [{ id: 1, name: 'Mark' }]
if (isArrayOf(maybeUsers, isUser)) {
  maybeUsers.map(u => u.name)   // User[] ✅
}

// Type guard factory
function hasShape<T extends object>(
  keys: (keyof T)[],
  types: { [K in keyof T]: string }
) {
  return (value: unknown): value is T => {
    if (typeof value !== 'object' || value === null) return false
    return keys.every(k => k in value && typeof (value as any)[k] === types[k])
  }
}
const isPoint = hasShape<{ x: number; y: number }>(
  ['x', 'y'], { x: 'number', y: 'number' }
)
```

```typescript
// ── Assertion functions ────────────────────────────────────────────────────
// 'asserts value is T' — throws if not T, narrows after the call
function assertUser(value: unknown): asserts value is User {
  if (!isUser(value)) throw new TypeError(`Expected User, got ${typeof value}`)
}

function assertDefined<T>(value: T | null | undefined): asserts value is T {
  if (value == null) throw new Error('Expected defined value, got null/undefined')
}

// Usage
const data: unknown = fetchUser()
assertUser(data)          // throws if not a User
data.name.toUpperCase()   // ✅ TypeScript now knows data is User — no if needed

// With assertDefined
const el = document.getElementById('app')
assertDefined(el)         // throws if el is null
el.innerHTML = 'Hello'    // ✅ narrowed to HTMLElement — no '?' needed

// ── assert with condition ─────────────────────────────────────────────────
// 'asserts condition' — confirms the condition holds after the call
function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(`Assertion failed: ${message}`)
}

const count: number | null = getCount()
assert(count !== null, 'count must not be null')
count.toFixed(2)   // ✅ TypeScript knows count is number here
```

---

## W — Why It Matters

- `Array.filter(notNull)` without a type guard returns `(T | null)[]` even though every null was removed — the type guard overload `filter(guard: (v: T | null) => v is T): T[]` is what makes `mixed.filter(notNull)` return `T[]`. This is one of the most practical daily uses.
- Assertion functions are preferable to type guards when you want to fail loudly — tests, constructors, and initialization code should throw rather than branch, and `asserts value is T` is the TypeScript-native way to express that.
- User-defined type guards are the bridge between runtime validation and compile-time types — Zod's `.parse()` uses this internally (the return type is the validated type), which is why the result is typed.

---

## I — Interview Q&A

### Q: What is the difference between a type guard (`value is T`) and an assertion function (`asserts value is T`)?

**A:** A type guard returns `boolean` — `true` means the value is `T` in the `if` block, `false` eliminates it. The narrowing only applies inside the conditional. An assertion function returns `void` — it throws if the condition fails, and TypeScript narrows the value for all code after the call (not just inside a block). Use type guards when the code should branch based on the type; use assertion functions when failing is the only acceptable alternative (initialization, tests, pre-conditions). Both are declared by annotating the return type — `is T` for guards, `asserts value is T` for assertion functions.

---

## C — Common Pitfalls + Fix

### ❌ Type guard returning `any` — silently always returns true

```typescript
// ❌ Overly permissive guard — always passes, loses all safety
function isUser(v: unknown): v is User {
  return typeof v === 'object' && v !== null   // ❌ doesn't check required fields
}
const bad: unknown = { name: 123, id: 'not-a-number' }
if (isUser(bad)) {
  bad.id.toFixed(2)   // runtime crash — id is a string, not number ❌
}

// ✅ Check every required field and its type
function isUser2(v: unknown): v is User {
  return (
    typeof v === 'object' && v !== null                &&
    'id'   in v && typeof (v as any).id   === 'number' &&
    'name' in v && typeof (v as any).name === 'string'
  )
}
```

---

## K — Coding Challenge + Solution

### Challenge

Write `partition<T, U extends T>(items: T[], guard: (v: T) => v is U): [U[], Exclude<T, U>[]]` — splits an array into two typed arrays based on a type guard.

### Solution

```typescript
function partition<T, U extends T>(
  items: T[],
  guard: (v: T) => v is U
): [U[], Exclude<T, U>[]] {
  const matching:    U[]             = []
  const nonMatching: Exclude<T, U>[] = []
  for (const item of items) {
    if (guard(item)) matching.push(item)
    else nonMatching.push(item as Exclude<T, U>)
  }
  return [matching, nonMatching]
}

// Usage
const values: (string | number | null)[] = ['a', 1, null, 'b', 2, null]

function isString(v: unknown): v is string { return typeof v === 'string' }
function notNull<T>(v: T | null): v is T   { return v !== null }

const [strings, rest]    = partition(values, isString)
// strings: string[] ✅ | rest: (number | null)[] ✅

const [defined, nulls]   = partition(values, notNull)
// defined: (string | number)[] ✅ | nulls: null[] ✅
```

---

---
