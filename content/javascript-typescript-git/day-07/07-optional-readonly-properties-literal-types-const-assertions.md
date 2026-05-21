# 7 — Optional/Readonly Properties, Literal Types, const assertions

---

## T — TL;DR

**Optional** (`?`) properties may be absent — type is `T | undefined`. **`readonly`** prevents reassignment after creation. **Literal types** narrow a type to a specific value (`'admin'` not `string`). **`as const`** makes an entire object's values literal and `readonly`. These prevent mutation bugs and enable discriminated unions.

---

## K — Key Concepts

```typescript
// ── Optional properties ────────────────────────────────────────────────────
interface User {
  id:       number
  name:     string
  email?:   string     // optional — string | undefined
  avatar?:  string | null  // optional + nullable
}
const u: User = { id: 1, name: 'Mark' }   // ✅ email omitted
u.email?.toUpperCase()   // ✅ optional chaining needed

// Optional parameters
function greet(name: string, title?: string): string {
  return title ? `${title} ${name}` : name
}
greet('Mark')        // ✅
greet('Mark', 'Dr.') // ✅
```

```typescript
// ── readonly properties ───────────────────────────────────────────────────
interface Config {
  readonly host: string
  readonly port: number
  timeout: number   // mutable
}
const config: Config = { host: 'localhost', port: 5432, timeout: 5000 }
config.timeout = 10000  // ✅ mutable
config.host = 'other'   // TS2540: Cannot assign to 'host' — readonly ✅

// Readonly arrays
const ids: readonly number[] = [1, 2, 3]
// Same as: ReadonlyArray<number>
ids.push(4)    // TS2339: Property 'push' does not exist on readonly array ✅
ids[0] = 99   // TS2542: Index signature in readonly array ✅

// Readonly<T> utility — makes all properties readonly
type ReadonlyUser = Readonly<User>
```

```typescript
// ── Literal types ──────────────────────────────────────────────────────────
type Direction = 'up' | 'down' | 'left' | 'right'
type StatusCode = 200 | 201 | 400 | 401 | 404 | 500

function move(dir: Direction) {}
move('up')    // ✅
move('fast')  // TS2345: Argument of type '"fast"' is not assignable ✅

// Literal types in interfaces
interface SuccessResponse {
  status: 200               // only 200 is valid — literal type
  data:   unknown
}
interface ErrorResponse {
  status: 400 | 401 | 500
  error:  string
}

// Widening — string literal widens to string
let role  = 'admin'           // type: string (widened)
const role2 = 'admin'         // type: 'admin' (literal — const doesn't reassign)
let role3: 'admin' = 'admin'  // type: 'admin' (explicit literal annotation)
```

```typescript
// ── as const — const assertion ────────────────────────────────────────────
// Makes all values literal, all properties readonly, deeply

const ROLES = ['admin', 'user', 'moderator'] as const
// type: readonly ['admin', 'user', 'moderator']
ROLES[0]          // type: 'admin' (not string)
ROLES.push('x')   // TS error: push doesn't exist on readonly tuple ✅

type Role = typeof ROLES[number]  // 'admin' | 'user' | 'moderator' ✅

const CONFIG = {
  host: 'localhost',
  port: 5432,
  flags: ['debug', 'verbose'],
} as const
// All values become literal and deeply readonly
CONFIG.port         // type: 5432 (not number)
CONFIG.host         // type: 'localhost' (not string)
CONFIG.flags        // type: readonly ['debug', 'verbose']
CONFIG.port = 9999  // TS error: readonly ✅

// as const for discriminated unions
const ACTIONS = {
  INCREMENT: 'counter/increment',
  DECREMENT: 'counter/decrement',
} as const
type ActionType = typeof ACTIONS[keyof typeof ACTIONS]
// 'counter/increment' | 'counter/decrement' ✅
```

---

## W — Why It Matters

- `readonly` on objects and arrays prevents accidental mutation — React props, Redux state, and config objects should all be `readonly`. Without it, TypeScript won't catch `props.items.push(x)` which mutates props.
- `as const` on lookup objects (ROUTES, ROLES, ACTION_TYPES) derives union types automatically — you define the values once and the type system derives `'admin' | 'user' | 'moderator'` automatically. No duplication.
- Optional `?` vs `| undefined` are different — `{ name?: string }` means the key can be absent; `{ name: string | undefined }` means the key must be present but can be `undefined`. With `exactOptionalPropertyTypes` in tsconfig, TypeScript distinguishes these strictly.

---

## I — Interview Q&A

### Q: What is the difference between `as const` and `readonly`?

**A:** `readonly` is a type modifier applied to specific properties or to arrays — it prevents reassignment of that property/index. It's declared as part of a type. `as const` is a type assertion that tells TypeScript to infer the narrowest possible types: string values become string literals, number values become numeric literals, arrays become readonly tuples, and objects become deeply readonly with literal property types. `as const` is applied to a value at its creation point and affects the entire structure. `readonly` is a declaration on a type shape. Both prevent mutation but `as const` also narrows to literal types, which is essential for deriving union types from constant objects.

---

## C — Common Pitfalls + Fix

### ❌ `as const` on a variable passed to a mutable parameter

```typescript
// ❌ as const makes array readonly — can't pass to function expecting mutable
const items = ['a', 'b', 'c'] as const   // readonly ['a','b','c']

function process(arr: string[]) { arr.push('d') }
process(items)   // TS2345: readonly array not assignable to mutable string[] ❌

// ✅ Option 1: use spread to create a mutable copy
process([...items])   // ✅

// ✅ Option 2: make the parameter accept readonly
function process2(arr: readonly string[]) { /* can't mutate, that's fine */ }
process2(items)   // ✅
```

---

## K — Coding Challenge + Solution

### Challenge

Create an `HTTP_METHODS` const object, derive a `HttpMethod` type from it, and a `ROUTES` const with `path` and `method`. Write `createRoute(method: HttpMethod, path: string)` using those types.

### Solution

```typescript
const HTTP_METHODS = {
  GET:    'GET',
  POST:   'POST',
  PUT:    'PUT',
  PATCH:  'PATCH',
  DELETE: 'DELETE',
} as const

type HttpMethod = typeof HTTP_METHODS[keyof typeof HTTP_METHODS]
// 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE' ✅

interface Route {
  readonly method:  HttpMethod
  readonly path:    string
  readonly handler: string
}

const ROUTES = [
  { method: 'GET',  path: '/users',    handler: 'getUsers'  },
  { method: 'POST', path: '/users',    handler: 'createUser' },
  { method: 'GET',  path: '/users/:id',handler: 'getUserById' },
] as const satisfies readonly Route[]

function createRoute(method: HttpMethod, path: string, handler: string): Route {
  return { method, path, handler }
}

createRoute('GET',   '/posts', 'getPosts')   // ✅
createRoute('FETCH', '/posts', 'getPosts')   // TS error: 'FETCH' not HttpMethod ✅
```

---

---
