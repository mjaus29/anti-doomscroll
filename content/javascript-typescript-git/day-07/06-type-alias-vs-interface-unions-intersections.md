# 6 — Type Alias vs Interface, Unions, Intersections

---

## T — TL;DR

**Type alias** (`type`) can describe any type — unions, primitives, tuples, mapped types. **Interface** (`interface`) describes object shapes and supports declaration merging. Use `interface` for objects in libraries (mergeable). Use `type` for unions, computed types, and utilities. **Union** (`|`) means "one of". **Intersection** (`&`) means "all of".

---

## K — Key Concepts

```typescript
// ── Type alias ────────────────────────────────────────────────────────────
type UserId     = number
type UserName   = string
type Nullable<T> = T | null
type Status     = 'active' | 'inactive' | 'pending'   // union
type Point      = { x: number; y: number }
type Pair<T>    = [T, T]                               // tuple
type Callback   = (err: Error | null, result: string) => void

// ── Interface ─────────────────────────────────────────────────────────────
interface User {
  id:    number
  name:  string
  email: string
}

// Interface extends — adds fields
interface AdminUser extends User {
  permissions: string[]
  level:       number
}

// Declaration merging — only interfaces can do this
interface Window {
  myPlugin: { init(): void }   // add to existing Window type ✅
}

// Type can't be merged — reopening throws: Duplicate identifier ❌
```

```typescript
// ── Union types — T1 | T2 ────────────────────────────────────────────────
type StringOrNumber = string | number
type NullableUser   = User | null
type Status         = 'pending' | 'active' | 'closed'

// Discriminated union — common pattern
type ApiResponse =
  | { status: 'success'; data: User }
  | { status: 'error';   code: number; message: string }
  | { status: 'loading' }

function handle(res: ApiResponse) {
  switch (res.status) {
    case 'success': console.log(res.data.name); break    // ✅ narrowed to success branch
    case 'error':   console.log(res.message);   break    // ✅ narrowed to error branch
    case 'loading': console.log('Loading...');  break
  }
}

// Union of interfaces
type Animal = { name: string } & (
  | { kind: 'dog'; breed: string }
  | { kind: 'cat'; indoor: boolean }
)
```

```typescript
// ── Intersection types — T1 & T2 ─────────────────────────────────────────
type WithId       = { id: number }
type WithTimestamps = { createdAt: Date; updatedAt: Date }
type BaseEntity   = WithId & WithTimestamps   // has all fields of both

type UserEntity = User & BaseEntity
// equivalent to: { id, name, email, createdAt, updatedAt }

// Intersection for mixins
type Serializable   = { toJSON(): string }
type Validatable    = { validate(): boolean }
type FormModel<T>   = T & Serializable & Validatable

// ── Type alias vs Interface decision ─────────────────────────────────────
/*
Use type alias for:
  - Union types: type Status = 'a' | 'b'
  - Mapped types: type Partial<T> = { [K in keyof T]?: T[K] }
  - Computed / conditional types
  - Tuple types: type Pair = [string, number]
  - Primitives and non-object types

Use interface for:
  - Object shapes that may be extended or merged
  - Public API contracts (extends is more expressive than &)
  - Class implements: class User implements IUser {}
  - When consumers may need to augment your types (declaration merging)

In practice: either works for most object shapes.
Default to type for new code; use interface for class contracts and public libs.
*/
```

---

## W — Why It Matters

- Discriminated unions are the TypeScript pattern for state machines, API responses, and Redux actions — the `status` (or `type`) discriminant field tells TypeScript exactly which branch you're in, providing full narrowing.
- Declaration merging with `interface` is how `@types` packages extend built-in types — `express` adds `Request.user` property by merging into Express's `Request` interface. If you're building a library, use `interface`.
- Intersections vs `extends` — `A & B` and `interface C extends A, B` produce similar types but intersections work on any type (including unions), while `extends` requires interfaces or classes.

---

## I — Interview Q&A

### Q: When would you use `type` vs `interface` in TypeScript?

**A:** They overlap for object shapes, but differ in capabilities. Use `type` when: defining unions (`type Status = 'a' | 'b'`), mapped/conditional/utility types, tuples, or when the type isn't purely an object shape. Use `interface` when: defining an object shape that classes will `implement`, when you want declaration merging (augmenting types in other files), or when building a library where consumers may extend your types. Both support `extends` (interfaces) and `&` intersections (types). The practical rule: default to `type` for application code; use `interface` for class contracts and public API surface in libraries.

---

## C — Common Pitfalls + Fix

### ❌ Intersection of conflicting types produces `never`

```typescript
// ❌ Intersection of incompatible primitives → never
type Bad = string & number   // never — no value is both string and number

// ❌ Intersection of conflicting object properties → property becomes never
type A = { id: string }
type B = { id: number }
type AB = A & B   // AB.id is string & number = never ❌

// ✅ Use union when you mean "one or the other"
type GoodId = { id: string } | { id: number }

// ✅ Use intersection only when types genuinely compose
type Timestamped = { createdAt: Date }
type Named       = { name: string }
type Entity      = Timestamped & Named   // ✅ no conflicting fields
```

---

## K — Coding Challenge + Solution

### Challenge

Model an API response as a discriminated union with three states. Write a `processResponse<T>(res: ApiResult<T>)` that handles all three. Then compose `User` with `WithTimestamps` and `WithSoftDelete` via intersection.

### Solution

```typescript
type ApiResult<T> =
  | { ok: true;  data: T }
  | { ok: false; status: number; error: string }
  | { ok: false; status: 0;      error: 'NetworkError' }

function processResponse<T>(res: ApiResult<T>): T | null {
  if (!res.ok) {
    if (res.status === 0) console.error('No network connection')
    else console.error(`HTTP ${res.status}: ${res.error}`)
    return null
  }
  return res.data   // ✅ narrowed to { ok: true; data: T }
}

// Composing entity types
interface WithTimestamps {
  createdAt: Date
  updatedAt: Date
}
interface WithSoftDelete {
  deletedAt: Date | null
}
interface User {
  id:    number
  name:  string
  email: string
}

type UserRecord = User & WithTimestamps & WithSoftDelete

const user: UserRecord = {
  id: 1, name: 'Mark', email: 'mark@ex.com',
  createdAt: new Date(), updatedAt: new Date(),
  deletedAt: null,
}
```

---

---
