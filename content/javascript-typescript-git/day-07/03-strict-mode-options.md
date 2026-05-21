# 3 — Strict Mode Options

---

## T — TL;DR

`"strict": true` is an umbrella for multiple flags. Know each one individually — `strictNullChecks` prevents null crashes, `noImplicitAny` bans untyped variables, `noUncheckedIndexedAccess` makes array access safe, `useUnknownInCatchVariables` makes caught errors `unknown` not `any`. Each flag has a specific bug class it prevents.

---

## K — Key Concepts

```typescript
// ── strictNullChecks ──────────────────────────────────────────────────────
// OFF: null and undefined are assignable to every type — silent runtime crashes
// ON:  null and undefined are their own types — must be handled explicitly

// Without strictNullChecks (dangerous)
let name: string = null   // ❌ allowed without flag — crashes at .toUpperCase()

// With strictNullChecks: true
let name: string = null   // TS2322: Type 'null' is not assignable to type 'string'
let name2: string | null = null   // ✅ explicit — must handle null before using

function getUser(id: number): User | null { ... }
const user = getUser(1)
user.name    // TS2531: Object is possibly 'null' ✅ caught!
user?.name   // ✅ optional chaining
if (user) user.name  // ✅ narrowed

// ── noImplicitAny ─────────────────────────────────────────────────────────
function process(data) {         // TS7006: Parameter 'data' has implicit 'any' ✅
  return data.whatever           // any propagates silently without flag
}
function process2(data: unknown) {}  // ✅ explicit unknown, must narrow before use
```

```typescript
// ── strictFunctionTypes ────────────────────────────────────────────────────
// Checks function parameter types contravariantly (stricter subtype rules)
type Handler = (event: MouseEvent) => void
const h: Handler = (e: Event) => {}    // ✅ Event is supertype — contravariant OK
const h2: Handler = (e: KeyboardEvent) => {}  // ❌ KeyboardEvent is subtype — unsafe

// ── strictPropertyInitialization ─────────────────────────────────────────
class User {
  name: string       // TS2564: not definitely assigned in constructor ❌
  constructor() {}   // name might be undefined at runtime
}
class User2 {
  name: string
  constructor() { this.name = 'default' }   // ✅
  // OR: name = 'default'  ✅ (class field)
  // OR: name!: string  (definite assignment assertion — use sparingly)
}

// ── noImplicitReturns ─────────────────────────────────────────────────────
function getLabel(status: string): string {
  if (status === 'active') return 'Active'
  if (status === 'inactive') return 'Inactive'
  // TS2366: Function lacks ending return statement ✅ — caught missing branch
}
function getLabel2(status: string): string {
  if (status === 'active') return 'Active'
  if (status === 'inactive') return 'Inactive'
  return 'Unknown'   // ✅ all paths return
}
```

```typescript
// ── noUncheckedIndexedAccess ──────────────────────────────────────────────
const arr = [1, 2, 3]
const first = arr[0]   // type: number | undefined (not just number) ✅
first.toFixed(2)        // TS2532: Object is possibly 'undefined' ✅

// Handle it:
if (first !== undefined) first.toFixed(2)   // ✅
const safe = first ?? 0                     // ✅

const record: Record<string, number> = {}
const val = record['key']   // number | undefined ✅ (not just number)

// ── useUnknownInCatchVariables ────────────────────────────────────────────
try {
  throw new Error('oops')
} catch (err) {
  // Without flag: err is 'any' — you can do anything with it (unsafe)
  // With flag:    err is 'unknown' — must check type first
  console.log(err.message)   // TS2571: Object is of type 'unknown' ✅
}

// ✅ Handle correctly
try {
  throw new Error('oops')
} catch (err) {
  if (err instanceof Error) console.log(err.message)   // ✅ narrowed
  else console.log(String(err))
}

// ── noFallthroughCasesInSwitch ────────────────────────────────────────────
function handle(status: 'a' | 'b' | 'c') {
  switch (status) {
    case 'a': console.log('a')   // TS7029: Fallthrough case in switch ✅
    case 'b': console.log('b'); break
    case 'c': console.log('c'); break
  }
}
```

---

## W — Why It Matters

- `strictNullChecks` is the most impactful flag — without it, TypeScript doesn't catch null/undefined dereferences, which are the most common JavaScript runtime error (`Cannot read property 'x' of null/undefined`).
- `noUncheckedIndexedAccess` changes how you think about arrays — `arr[0]` returning `T | undefined` instead of `T` catches out-of-bounds access that would crash at runtime. In real code this forces consistent null-checking patterns.
- `useUnknownInCatchVariables` is critical for good error handling — when `err` was `any`, you could write `err.message` and TypeScript wouldn't complain even if the throw value wasn't an Error. With `unknown`, you're forced to check.

---

## I — Interview Q&A

### Q: What is the difference between `noImplicitAny` and `unknown`?

**A:** `noImplicitAny` is a compiler flag — it prevents variables and parameters from implicitly getting the `any` type when TypeScript can't infer a type. Without it, an untyped parameter silently becomes `any` and all type safety is lost. With it, you must explicitly annotate. `unknown` is a type — the type-safe alternative to `any`. A value of type `unknown` can hold anything (like `any`) but you cannot use it without first narrowing its type through `typeof`, `instanceof`, or a type guard. `noImplicitAny` prevents accidental `any`; `unknown` is what you use when you intentionally want to accept any value but safely.

---

## C — Common Pitfalls + Fix

### ❌ Using `!` (non-null assertion) to silence strictNullChecks everywhere

```typescript
// ❌ Non-null assertion operator tells TS "trust me, it's not null"
// This suppresses the error without fixing the underlying issue
const user = getUser(id)!        // ❌ crashes if getUser returns null
user.name                        // runtime crash if user is null

// ❌ Common crutch — scattered ! throughout codebase
document.getElementById('app')!.innerHTML = 'hello'  // crashes if element missing

// ✅ Actually handle the null case
const user = getUser(id)
if (!user) throw new NotFoundError('User', id)
user.name   // ✅ narrowed to User

const el = document.getElementById('app')
if (!el) throw new Error('App element not found')
el.innerHTML = 'hello'   // ✅
```

---

## K — Coding Challenge + Solution

### Challenge

Write a function `safeGet<T>(arr: T[], index: number): T | undefined` that works correctly with `noUncheckedIndexedAccess`. Then write a `safeCatch(fn)` wrapper that handles `useUnknownInCatchVariables` correctly.

### Solution

```typescript
// noUncheckedIndexedAccess-safe array access
function safeGet<T>(arr: T[], index: number): T | undefined {
  return arr[index]   // T | undefined — explicit return type enforces contract
}

function getFirst<T>(arr: T[], fallback: T): T {
  return safeGet(arr, 0) ?? fallback
}

getFirst([1, 2, 3], 0)   // 1
getFirst([], 0)           // 0 (fallback)

// useUnknownInCatchVariables-safe error extraction
function toError(err: unknown): Error {
  if (err instanceof Error) return err
  if (typeof err === 'string') return new Error(err)
  return new Error(String(err))
}

async function safeCatch<T>(fn: () => Promise<T>): Promise<[T, null] | [null, Error]> {
  try {
    return [await fn(), null]
  } catch (err: unknown) {
    return [null, toError(err)]
  }
}

const [data, error] = await safeCatch(() => fetch('/api/data').then(r => r.json()))
if (error) console.error(error.message)   // error is Error type ✅
else console.log(data)
```

---

---
