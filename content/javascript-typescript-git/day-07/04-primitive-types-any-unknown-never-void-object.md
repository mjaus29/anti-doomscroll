# 4 — Primitive Types, any, unknown, never, void, object

---

## T — TL;DR

TypeScript's type system builds on JavaScript's seven primitives and adds `any` (escape hatch — avoid), `unknown` (safe top type — prefer), `never` (impossible type — exhaustiveness), `void` (no meaningful return), and `object` (non-primitive). Know when to use each and the three types to never use: `any`, `Object` (capital), `{}`.

---

## K — Key Concepts

```typescript
// ── Primitive types ────────────────────────────────────────────────────────
let s:   string   = 'hello'
let n:   number   = 42
let b:   boolean  = true
let bi:  bigint   = 42n
let sym: symbol   = Symbol('x')
let u:   undefined = undefined
let nu:  null     = null       // requires strictNullChecks to be useful

// TypeScript adds wrapper type distinctions:
// 'string' vs 'String' — always use lowercase
const a: string = 'hello'   // ✅ primitive string
const b: String = 'hello'   // ❌ object wrapper — avoid (subtly different)
// Same rule: number not Number, boolean not Boolean
```

```typescript
// ── any — the escape hatch (avoid) ────────────────────────────────────────
let x: any = 'hello'
x = 42           // ✅ any accepts anything
x.foo.bar.baz    // ✅ TypeScript stops checking — runtime crash possible
x()              // ✅ TypeScript thinks it's callable — crash if it's not

// any is contagious — it spreads to connected expressions
function process(data: any) {
  return data.users   // type: any (TypeScript gave up)
}

// When any is acceptable: migrating JS to TS, third-party typeless libraries
// Even then: scope it tightly, don't let it propagate

// ── unknown — safe any (prefer for external/untrusted data) ───────────────
let y: unknown = 'hello'
y.toUpperCase()   // TS2571: Object is of type 'unknown' ✅ caught!

// Must narrow before using:
if (typeof y === 'string') y.toUpperCase()    // ✅
if (y instanceof Error)    y.message          // ✅
```

```typescript
// ── never — the impossible type ───────────────────────────────────────────
// A value of type 'never' can never exist
// Used for: exhaustiveness checks, unreachable code, throw functions

function assertNever(x: never): never {
  throw new Error(`Unexpected value: ${JSON.stringify(x)}`)
}

type Shape = 'circle' | 'square' | 'triangle'

function area(shape: Shape): number {
  switch (shape) {
    case 'circle':   return Math.PI
    case 'square':   return 1
    case 'triangle': return 0.5
    default: return assertNever(shape)  // TS error if a case is missing ✅
  }
}
// If you add 'rectangle' to Shape and forget the case:
// TS2345: Argument of type 'string' is not assignable to parameter of type 'never'

// never in function types — functions that never return
function throwError(msg: string): never {
  throw new Error(msg)   // never returns — typed as never ✅
}
function infinite(): never {
  while (true) {}
}
```

```typescript
// ── void — no meaningful return value ────────────────────────────────────
function log(msg: string): void {
  console.log(msg)
  // implicitly returns undefined — void signals "don't use the return value"
}
const result = log('hello')   // result: void
// void ≠ undefined — void means "caller shouldn't use this value"

// void in callback types — caller doesn't care about return value
type Callback = () => void
const cb: Callback = () => 42   // ✅ void callbacks CAN return values
// The return value is just discarded

// ── object — non-primitive type ───────────────────────────────────────────
let obj: object = { name: 'Mark' }   // ✅ any non-primitive
obj.name   // TS2339: Property 'name' does not exist on type 'object' ❌

// ❌ Avoid these — they accept everything or cause subtle bugs:
let bad1: Object = 'hello'   // Object accepts primitives (wrapping)
let bad2: {} = 42            // {} = "any non-null value" (not "empty object")

// ✅ Use specific shapes instead of 'object':
let good: { name: string } = { name: 'Mark' }
// Or: Record<string, unknown> for truly unknown object shapes
let record: Record<string, unknown> = { name: 'Mark', age: 28 }
```

---

## W — Why It Matters

- `any` disables TypeScript for that variable and everything derived from it — one `any` in a critical path can silently propagate through your entire codebase. Always prefer `unknown` and narrow.
- `never` for exhaustiveness checking is one of TypeScript's most powerful patterns — a switch on a discriminated union with a `never` default means adding a new union member requires handling the new case everywhere, enforced by the compiler.
- `void` in callback types explains why `arr.forEach(x => console.log(x))` type-checks even though `console.log` returns `void` — forEach's callback type is `() => void`, which accepts callbacks that return any value (the return is ignored).

---

## I — Interview Q&A

### Q: What is the difference between `any`, `unknown`, and `never`?

**A:** `any` is an escape hatch — assignable to and from everything, TypeScript stops checking. Use only when necessary (migration, untyped libraries). `unknown` is the safe top type — any value can be assigned to `unknown`, but you can't use it without narrowing via `typeof`/`instanceof`/type guards. Use for function parameters that accept untrusted/external data. `never` is the bottom type — no value can be assigned to `never` (except `never` itself). Used to represent impossibility: functions that always throw, `while(true)` loops, and the `default` case of exhaustive switches. If a variable has type `never`, that code is unreachable.

---

## C — Common Pitfalls + Fix

### ❌ Using `{}` as "empty object" type — accepts everything except null/undefined

```typescript
// ❌ {} means "any non-null, non-undefined value" — not "object with no properties"
function process(data: {}) {
  // data could be a string, number, array — any non-null value!
}
process('hello')   // ✅ no TS error — string matches {} ❌ surprising

// ❌ Object (capital) accepts primitives via boxing
function handle(x: Object) {}
handle(42)   // ✅ boxes to Number — rarely intended

// ✅ Use specific types
function process2(data: Record<string, unknown>) {}  // "object with any string keys"
function handle2(x: { id: number }) {}  // specific shape
```

---

## K — Coding Challenge + Solution

### Challenge

Write a `parseJSON(text: string): unknown` function, then write a type guard `isUser(value: unknown): value is User` where `User = { name: string; age: number }`. Demonstrate the exhaustive switch pattern with `never`.

### Solution

```typescript
type User = { name: string; age: number }

function parseJSON(text: string): unknown {
  try { return JSON.parse(text) }
  catch { return null }
}

function isUser(value: unknown): value is User {
  return (
    typeof value === 'object' &&
    value !== null &&
    'name' in value && typeof (value as any).name === 'string' &&
    'age'  in value && typeof (value as any).age  === 'number'
  )
}

const raw = parseJSON('{"name":"Mark","age":28}')
if (isUser(raw)) {
  console.log(raw.name.toUpperCase())   // ✅ TypeScript knows it's a User
  console.log(raw.age + 1)             // ✅
}

// Exhaustive switch with never
type Status = 'pending' | 'active' | 'suspended'
function describeStatus(s: Status): string {
  switch (s) {
    case 'pending':   return 'Awaiting activation'
    case 'active':    return 'Account active'
    case 'suspended': return 'Account suspended'
    default: {
      const _: never = s   // compile error if a case is missing ✅
      return _
    }
  }
}
```

---

---
