# 📅 Day 8 — TypeScript Generics, Utility Types & Type Transformations

> **Goal:** Write reusable generic code, master every built-in utility type, build custom type transformations, and safely handle untyped runtime data.
> **Format:** Each subtopic = 5–15 min. Do one. Stop. Come back.
> **Stack:** TypeScript 6.0 · Node.js 22 · strict mode always on

---

## 📋 Day 8 Subtopic Overview

| #   | Subtopic                                                                              | Time   |
| --- | ------------------------------------------------------------------------------------- | ------ |
| 1   | Generics Fundamentals — functions, interfaces, classes                                | 12 min |
| 2   | Generic Constraints — extends, keyof, defaults, const params                          | 10 min |
| 3   | Utility Types Part 1 — Partial, Required, Readonly, Record, Pick, Omit                | 12 min |
| 4   | Utility Types Part 2 — Exclude, Extract, NonNullable, ReturnType, Parameters, Awaited | 10 min |
| 5   | Intrinsic String Types + Mapped Types                                                 | 10 min |
| 6   | Mapped Modifiers + Key Remapping with as                                              | 10 min |
| 7   | Conditional Types + Distributive Conditional Types                                    | 12 min |
| 8   | Template Literal Types + infer                                                        | 12 min |
| 9   | Overloads + Recursive Types — DeepPartial, DeepReadonly                               | 12 min |
| 10  | Safe JSON.parse — unknown-first narrowing + runtime validation                        | 10 min |

---

---

# 1 — Generics Fundamentals

---

## T — TL;DR

**Generics** let you write code that works with multiple types while preserving type information. Instead of `any` (which loses the type), a type parameter `<T>` carries the type through the function/class/interface so callers get back exactly what they put in.

---

## K — Key Concepts

```typescript
// ── Generic function ──────────────────────────────────────────────────────
// Without generics — loses type information
function identity(x: any): any {
  return x;
}
const n = identity(42); // type: any ❌ — lost 'number'

// With generics — type flows through
function identity2<T>(x: T): T {
  return x;
}
const n2 = identity2(42); // type: number ✅ (inferred)
const s2 = identity2("hello"); // type: string ✅
const b2 = identity2<boolean>(true); // explicit annotation

// Multiple type parameters
function pair<A, B>(a: A, b: B): [A, B] {
  return [a, b];
}
const p = pair(1, "hello"); // type: [number, string] ✅

// Generic with array
function first<T>(arr: T[]): T | undefined {
  return arr[0];
}
const f1 = first([1, 2, 3]); // type: number | undefined ✅
const f2 = first(["a", "b"]); // type: string | undefined ✅
const f3 = first<number>([]); // type: number | undefined ✅
```

```typescript
// ── Generic interface ──────────────────────────────────────────────────────
interface ApiResponse<T> {
  data: T;
  status: number;
  message: string;
}

interface Paginated<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
}

// Usage
const userResponse: ApiResponse<User> = {
  data: { id: 1, name: "Mark" },
  status: 200,
  message: "OK",
};
const usersPage: Paginated<User> = {
  items: [{ id: 1, name: "Mark" }],
  total: 1,
  page: 1,
  limit: 20,
};

// Generic type alias
type Result<T, E = Error> =
  | { success: true; value: T }
  | { success: false; error: E };

function divide(a: number, b: number): Result<number> {
  if (b === 0) return { success: false, error: new Error("Division by zero") };
  return { success: true, value: a / b };
}
const r = divide(10, 2);
if (r.success) console.log(r.value); // ✅ narrowed to success branch
```

```typescript
// ── Generic class ──────────────────────────────────────────────────────────
class Stack<T> {
  #items: T[] = [];

  push(item: T): this {
    this.#items.push(item);
    return this;
  }
  pop(): T | undefined {
    return this.#items.pop();
  }
  peek(): T | undefined {
    return this.#items.at(-1);
  }
  get size(): number {
    return this.#items.length;
  }
  isEmpty(): boolean {
    return this.#items.length === 0;
  }
  toArray(): T[] {
    return [...this.#items];
  }
}

const numStack = new Stack<number>();
numStack.push(1).push(2).push(3);
numStack.push("x"); // TS error: string not assignable to number ✅
numStack.peek(); // type: number | undefined ✅

const strStack = new Stack<string>();
strStack.push("hello"); // ✅
```

---

## W — Why It Matters

- Generics are the difference between type-safe reusable code and `any`-polluted code — every utility function (`first`, `last`, `groupBy`, `mapValues`) should be generic to preserve types through transformations.
- `ApiResponse<T>` and `Paginated<T>` are the exact pattern used by tRPC, React Query, and Prisma — understanding generics means you understand how those libraries type their responses.
- Without generics, you'd either write the same function for every type or use `any` and lose safety. Generics give you both reusability and type safety.

---

## I — Interview Q&A

### Q: What is the purpose of a generic type parameter, and how does it differ from using `any`?

**A:** A generic type parameter `<T>` is a placeholder that gets filled in with a specific type when the function/class is used. It preserves type information — if you call `identity<number>(42)`, the return type is `number`, not `any`. With `any`, the type is lost at that point and TypeScript stops checking. Generics let you write one function that works for all types while maintaining complete type safety. Additionally, generics enable constraints (`<T extends string>`) and allow TypeScript to infer the type from usage without explicit annotation.

---

## C — Common Pitfalls + Fix

### ❌ Calling a generic function without inferrable context

```typescript
// ❌ TypeScript can't infer T — defaults to unknown or errors
function createArray<T>(length: number): T[] {
  return new Array(length); // T can't be inferred from arguments ❌
}
const arr = createArray(3); // type: unknown[] — not useful

// ✅ Either provide a fill value or require explicit annotation
function createArray2<T>(length: number, fill: T): T[] {
  return Array.from({ length }, () => fill);
}
const nums = createArray2(3, 0); // type: number[] ✅
const strs = createArray2<string>(3, ""); // explicit ✅
```

---

## K — Coding Challenge + Solution

### Challenge

Write three generic utilities: `wrap<T>(value: T): { value: T }`, `unwrap<T>(wrapped: { value: T }): T`, and `mapResult<T, U>(result: Result<T>, fn: (v: T) => U): Result<U>`.

### Solution

```typescript
type Result<T, E = Error> =
  | { success: true; value: T }
  | { success: false; error: E };

function wrap<T>(value: T): { value: T } {
  return { value };
}
function unwrap<T>(wrapped: { value: T }): T {
  return wrapped.value;
}

function mapResult<T, U>(result: Result<T>, fn: (v: T) => U): Result<U> {
  if (!result.success) return result; // pass through error unchanged
  return { success: true, value: fn(result.value) };
}

const r1 = mapResult({ success: true, value: 42 }, (n) => n * 2);
// { success: true, value: 84 } — type: Result<number> ✅

const r2 = mapResult(
  { success: false, error: new Error("fail") },
  (n) => n * 2
);
// { success: false, error: Error } — unchanged ✅
```

---

---

# 2 — Generic Constraints

---

## T — TL;DR

Constraints limit what types `T` can be — `<T extends string>` means T must be assignable to `string`. `<T extends keyof U>` means T must be a key of U. Default type parameters (`<T = string>`) provide fallbacks. `const` type parameters (TS 5.0+) preserve literal types in inference.

---

## K — Key Concepts

```typescript
// ── extends constraint ────────────────────────────────────────────────────
// Without constraint — no methods available on T
function getLength<T>(x: T): number {
  return x.length; // TS error: T might not have .length ❌
}

// With constraint — T must have .length
function getLength2<T extends { length: number }>(x: T): number {
  return x.length; // ✅ T is guaranteed to have .length
}
getLength2("hello"); // ✅ string has .length
getLength2([1, 2, 3]); // ✅ array has .length
getLength2(42); // TS error: number has no .length ✅

// Constraint with interface
interface Identifiable {
  id: number | string;
}
function findById<T extends Identifiable>(
  items: T[],
  id: T["id"]
): T | undefined {
  return items.find((item) => item.id === id);
}
```

```typescript
// ── keyof constraint ──────────────────────────────────────────────────────
// T[K] is only valid when K extends keyof T
function pluck<T extends object, K extends keyof T>(
  items: T[],
  key: K
): T[K][] {
  return items.map((item) => item[key]);
}

const users = [
  { id: 1, name: "Mark" },
  { id: 2, name: "Alice" },
];
pluck(users, "name"); // string[] ✅
pluck(users, "id"); // number[] ✅
pluck(users, "email"); // TS error: 'email' not in keyof User ✅

// Multiple constraints
function mergeObjects<T extends object, U extends object>(a: T, b: U): T & U {
  return { ...a, ...b };
}
```

```typescript
// ── Default type parameters ────────────────────────────────────────────────
// Default kicks in when T is not provided
interface Paginated<T = unknown> {
  items: T[];
  total: number;
}
const p1: Paginated = { items: [], total: 0 }; // T = unknown ✅
const p2: Paginated<User> = { items: [user], total: 1 }; // T = User ✅

// Default with constraint
type EventHandler<T extends Event = Event> = (event: T) => void;
const clickHandler: EventHandler<MouseEvent> = (e) => {
  e.clientX;
}; // ✅
const handler: EventHandler = (e) => {
  e.target;
}; // T = Event (default) ✅

// ── const type parameters (TS 5.0+) ──────────────────────────────────────
// Without const: T is widened to string
function makeArray<T>(items: T[]): T[] {
  return items;
}
const arr1 = makeArray(["a", "b"]); // type: string[] (widened)

// With const: preserves literal types
function makeArray2<const T>(items: T[]): T[] {
  return items;
}
const arr2 = makeArray2(["a", "b"]); // type: ('a' | 'b')[] ✅ (literal)

// Useful for route definitions, config tuples
function defineRoutes<const T extends string[]>(routes: T): T {
  return routes;
}
const routes = defineRoutes(["/home", "/about", "/contact"]);
// type: readonly ['/home', '/about', '/contact'] — literal preserved ✅
```

---

## W — Why It Matters

- `<T extends keyof U>` is the foundation of safe property access utilities — without it, `obj[key]` would be `any` because TypeScript can't guarantee `key` is a valid property.
- Default type parameters (`<T = unknown>`) are how libraries like React Query type their `useQuery<TData = unknown>` — works without a type argument but is more specific when you provide one.
- `const` type parameters solve the "inferred as widened string instead of literal" problem that previously required `as const` at every call site.

---

## I — Interview Q&A

### Q: What does `T extends keyof U` mean as a generic constraint?

**A:** It means the type parameter `T` must be one of the property names of type `U`. `keyof U` produces a union of all key names of `U` (as string/symbol literals). `T extends keyof U` restricts `T` to only those keys. This enables safe indexed access: `U[T]` is valid and typed (the type of that specific property) rather than `any`. It's the building block of `Pick`, property accessor utilities, and any function that takes an object and a key name and must guarantee the key exists on the object.

---

## C — Common Pitfalls + Fix

### ❌ Overly wide constraint loses precision

```typescript
// ❌ T extends object is too wide — loses the specific type
function clone<T extends object>(obj: T): object {
  return { ...obj }; // returns 'object' — caller loses all type info ❌
}
const c = clone({ name: "Mark" });
c.name; // TS error: 'name' doesn't exist on type 'object' ❌

// ✅ Return T to preserve the type
function clone2<T extends object>(obj: T): T {
  return { ...obj }; // returns T — same type as input ✅
}
const c2 = clone2({ name: "Mark" });
c2.name; // ✅ type: string
```

---

## K — Coding Challenge + Solution

### Challenge

Write `groupBy<T, K extends keyof T>(items: T[], key: K): Record<string, T[]>` and `sortBy<T, K extends keyof T>(items: T[], key: K, dir?: 'asc' | 'desc'): T[]`.

### Solution

```typescript
function groupBy<T extends object, K extends keyof T>(
  items: T[],
  key: K
): Record<string, T[]> {
  return items.reduce<Record<string, T[]>>((acc, item) => {
    const groupKey = String(item[key]);
    acc[groupKey] ??= [];
    acc[groupKey]!.push(item);
    return acc;
  }, {});
}

function sortBy<T extends object, K extends keyof T>(
  items: T[],
  key: K,
  dir: "asc" | "desc" = "asc"
): T[] {
  return [...items].sort((a, b) => {
    const av = a[key],
      bv = b[key];
    const cmp = av < bv ? -1 : av > bv ? 1 : 0;
    return dir === "asc" ? cmp : -cmp;
  });
}

const users = [
  { id: 3, name: "Charlie", dept: "eng" },
  { id: 1, name: "Alice", dept: "eng" },
  { id: 2, name: "Bob", dept: "hr" },
];
groupBy(users, "dept"); // { eng: [...], hr: [...] } ✅
sortBy(users, "name"); // [Alice, Bob, Charlie] ✅
sortBy(users, "id", "desc"); // [Charlie, Bob, Alice] ✅
```

---

---

# 3 — Utility Types Part 1 — Partial, Required, Readonly, Record, Pick, Omit

---

## T — TL;DR

TypeScript ships six foundational object-manipulation utility types. `Partial<T>` makes all properties optional. `Required<T>` makes all required. `Readonly<T>` makes all readonly. `Record<K, V>` builds a key-value map type. `Pick<T, K>` keeps named keys. `Omit<T, K>` removes named keys. All are implemented with mapped types — understanding them helps you build custom versions.

---

## K — Key Concepts

```typescript
interface User {
  id: number;
  name: string;
  email: string;
  avatar?: string; // already optional
  role: "admin" | "user";
}

// ── Partial<T> — all properties optional ─────────────────────────────────
type UserUpdate = Partial<User>;
// { id?: number; name?: string; email?: string; avatar?: string; role?: ... }

async function updateUser(id: number, patch: Partial<User>): Promise<User> {
  return prisma.user.update({ where: { id }, data: patch });
}
updateUser(1, { name: "New Name" }); // only send changed fields ✅

// ── Required<T> — all properties required ────────────────────────────────
type CompleteUser = Required<User>;
// { id: number; name: string; email: string; avatar: string; role: ... }
// avatar is no longer optional

// ── Readonly<T> — all properties readonly ────────────────────────────────
type ImmutableUser = Readonly<User>;
const u: ImmutableUser = {
  id: 1,
  name: "Mark",
  email: "m@ex.com",
  role: "user",
};
u.name = "Alex"; // TS error: Cannot assign to 'name' — readonly ✅
```

```typescript
// ── Record<K, V> — type-safe key-value map ────────────────────────────────
type RolePermissions = Record<"admin" | "user" | "moderator", string[]>;
const permissions: RolePermissions = {
  admin: ["read", "write", "delete"],
  user: ["read"],
  moderator: ["read", "write"],
};
// TS error if a key is missing ✅

type UserById = Record<number, User>; // lookup by numeric id
type HttpStatusMessage = Record<200 | 400 | 404 | 500, string>;

// Record<string, unknown> — safe "any object" type
function processConfig(config: Record<string, unknown>) {}
```

```typescript
// ── Pick<T, K> — keep named keys ─────────────────────────────────────────
type UserPublic = Pick<User, "id" | "name">; // { id: number; name: string }
type UserProfile = Pick<User, "name" | "email" | "avatar">;

// API response — expose only safe fields
async function getUserPublic(id: number): Promise<UserPublic> {
  const user = await db.findUser(id);
  return { id: user.id, name: user.name }; // TS checks these match UserPublic ✅
}

// ── Omit<T, K> — remove named keys ───────────────────────────────────────
type UserWithoutId = Omit<User, "id">; // for create operations
type CreateUserDto = Omit<User, "id" | "avatar">; // required create fields
type UserWithoutPassword = Omit<User, "password">; // safe to send to client

async function createUser(dto: CreateUserDto): Promise<User> {
  return db.insert({ ...dto, id: Date.now() });
}
```

```typescript
// ── How they're implemented (mapped types) ────────────────────────────────
// Understanding the implementation helps build custom variants
type MyPartial<T> = { [K in keyof T]?: T[K] };
type MyRequired<T> = { [K in keyof T]-?: T[K] }; // -? removes optional
type MyReadonly<T> = { readonly [K in keyof T]: T[K] };
type MyRecord<K extends string | number | symbol, V> = { [P in K]: V };
type MyPick<T, K extends keyof T> = { [P in K]: T[P] };
type MyOmit<T, K extends keyof T> = Pick<T, Exclude<keyof T, K>>;
```

---

## W — Why It Matters

- `Partial<T>` for PATCH/update operations is the standard — a PUT replaces the whole entity (use `T`), a PATCH updates partial fields (use `Partial<T>`). This prevents accidentally requiring all fields in update forms.
- `Omit<User, 'id' | 'createdAt'>` for DTOs keeps types DRY — define `User` once, derive `CreateUserDto` from it. When `User` changes, the DTO updates automatically.
- `Record<K, V>` replaces `{ [key: string]: V }` with a constrained key set — `Record<HttpMethod, Handler>` guarantees all methods are handled, with TS errors if you miss one.

---

## I — Interview Q&A

### Q: What is the difference between `Pick` and `Omit`, and when would you use each?

**A:** `Pick<T, K>` creates a type with only the listed properties — use it when you know exactly which properties you want and the set is small (e.g., `Pick<User, 'id' | 'name'>` for a select dropdown). `Omit<T, K>` creates a type with those properties removed — use it when you want "everything except a few" (e.g., `Omit<User, 'password' | 'deletedAt'>` for a public response). Pick is additive (allowlist); Omit is subtractive (denylist). In practice, Omit is more common for API responses and DTOs because you typically want most fields but need to strip a few sensitive ones.

---

## C — Common Pitfalls + Fix

### ❌ `Partial<T>` on nested objects — only makes top level optional

```typescript
interface Address {
  street: string;
  city: string;
  zip: string;
}
interface User {
  id: number;
  name: string;
  address: Address;
}

type PartialUser = Partial<User>;
// { id?: number; name?: string; address?: Address }
// address is optional — but if present, ALL Address fields are required ❌

// ✅ Use DeepPartial for recursive partial (Subtopic 9)
type DeepPartial<T> = {
  [K in keyof T]?: T[K] extends object ? DeepPartial<T[K]> : T[K];
};
type PartialUserDeep = DeepPartial<User>;
// address?: { street?: string; city?: string; zip?: string } ✅
```

---

## K — Coding Challenge + Solution

### Challenge

Build a `FormState<T>` type using `Record` and `Partial` — every field of `T` maps to `{ value: T[K]; error: string | null; touched: boolean }`. Then write `createFormState<T>(defaults: T): FormState<T>`.

### Solution

```typescript
type FieldState<V> = { value: V; error: string | null; touched: boolean };
type FormState<T> = { [K in keyof T]: FieldState<T[K]> };

function createFormState<T extends object>(defaults: T): FormState<T> {
  return Object.fromEntries(
    Object.entries(defaults).map(([k, v]) => [
      k,
      { value: v, error: null, touched: false },
    ])
  ) as FormState<T>;
}

interface LoginForm {
  email: string;
  password: string;
}
const state = createFormState<LoginForm>({ email: "", password: "" });
// state.email.value    — string ✅
// state.email.error    — string | null ✅
// state.email.touched  — boolean ✅
state.email.value = "mark@ex.com"; // ✅
```

---

---

# 4 — Utility Types Part 2 — Exclude, Extract, NonNullable, ReturnType, Parameters, Awaited

---

## T — TL;DR

The second group of built-in utilities operates on union types and function types. `Exclude` and `Extract` filter union members. `NonNullable` strips null/undefined. `ReturnType`, `Parameters`, `ConstructorParameters`, and `InstanceType` extract parts of function and class types. `Awaited` unwraps Promise chains.

---

## K — Key Concepts

```typescript
// ── Exclude<T, U> — remove union members ─────────────────────────────────
type Status = "pending" | "active" | "suspended" | "deleted";
type LiveStatus = Exclude<Status, "deleted">; // 'pending'|'active'|'suspended'
type NonString = Exclude<string | number | boolean, string>; // number | boolean

// ── Extract<T, U> — keep union members matching U ────────────────────────
type StringOrNum = string | number | boolean;
type JustStrings = Extract<StringOrNum, string>; // string
type Primitives = Extract<StringOrNum, string | number>; // string | number

// Together: filter a union
type Event = "click" | "hover" | "focus" | "blur" | "keydown";
type MouseEvents = Extract<Event, "click" | "hover">; // 'click'|'hover'
type NonMouseEvents = Exclude<Event, "click" | "hover">; // 'focus'|'blur'|'keydown'

// ── NonNullable<T> — remove null and undefined ────────────────────────────
type MaybeString = string | null | undefined;
type DefiniteStr = NonNullable<MaybeString>; // string

function required<T>(v: T): NonNullable<T> {
  if (v == null) throw new Error("Value is required");
  return v as NonNullable<T>;
}
```

```typescript
// ── ReturnType<T> — extract function return type ──────────────────────────
function getUser() {
  return { id: 1, name: "Mark", email: "m@ex.com" };
}
function getStatus() {
  return "active" as const;
}

type UserShape = ReturnType<typeof getUser>; // { id: number; name: string; email: string }
type StatusShape = ReturnType<typeof getStatus>; // 'active'

// Derive from existing function — stays in sync when function changes
function createConnection(url: string) {
  return { query: async (sql: string) => [], close: () => {} };
}
type Connection = ReturnType<typeof createConnection>;
// { query: (sql: string) => Promise<never[]>; close: () => void }

// ── Parameters<T> — extract function parameter types ─────────────────────
function createUser(name: string, email: string, role: "admin" | "user") {
  return { name, email, role };
}
type CreateUserParams = Parameters<typeof createUser>;
// [name: string, email: string, role: 'admin' | 'user']

// Use case: re-use params in a wrapper
function withLogging<T extends (...args: any[]) => any>(fn: T) {
  return (...args: Parameters<T>): ReturnType<T> => {
    console.log("Calling with", args);
    return fn(...args);
  };
}
```

```typescript
// ── ConstructorParameters<T> + InstanceType<T> ────────────────────────────
class DatabasePool {
  constructor(
    public url: string,
    public poolSize: number = 10
  ) {}
  query(sql: string) {
    return [];
  }
}

type DBPoolCtorParams = ConstructorParameters<typeof DatabasePool>;
// [url: string, poolSize?: number]

type DBPoolInstance = InstanceType<typeof DatabasePool>;
// DatabasePool — same as the class type but expressed as a utility

// Use case: factory that accepts constructor args
function createInstance<T extends new (...args: any[]) => any>(
  Cls: T,
  ...args: ConstructorParameters<T>
): InstanceType<T> {
  return new Cls(...args);
}
const pool = createInstance(DatabasePool, "postgresql://localhost", 5);
pool.query("SELECT 1"); // ✅ typed as DatabasePool

// ── Awaited<T> — unwrap Promise chains ───────────────────────────────────
type A = Awaited<Promise<string>>; // string
type B = Awaited<Promise<Promise<number>>>; // number (fully unwrapped)
type C = Awaited<string>; // string (non-Promise passthrough)

async function fetchUser() {
  return { id: 1, name: "Mark" };
}
type FetchedUser = Awaited<ReturnType<typeof fetchUser>>; // { id: number; name: string }
```

---

## W — Why It Matters

- `ReturnType<typeof fn>` keeps derived types in sync with their source — when `createConnection()` changes, `Connection` updates automatically. No separate interface to maintain.
- `Parameters<T>` enables type-safe function wrappers (logging, retrying, memoization) without duplicating parameter lists — the `withLogging` pattern is used in middleware, decorators, and HOFs throughout real codebases.
- `Awaited<T>` is essential when you want the resolved type of a Promise without `await` — particularly in type utilities that need to work with both sync and async functions.

---

## I — Interview Q&A

### Q: When would you use `ReturnType` vs defining an interface for the same type?

**A:** Use `ReturnType<typeof fn>` when the type is a direct output of a function and should stay in sync with it. If `getUser()` returns a computed object and you later add a field, `ReturnType` picks it up automatically. Define an explicit interface when: the type has semantic meaning beyond "what this function returns" (e.g., `User` is a domain concept), when the type is used as an input elsewhere (function parameters, database schemas), or when you want clear documentation in code. Rule: `ReturnType` for derived/implementation types; explicit interface/type for domain contracts.

---

## C — Common Pitfalls + Fix

### ❌ Using `ReturnType` on an overloaded function — gets the last overload

```typescript
function process(x: string): string;
function process(x: number): number;
function process(x: any) {
  return x;
}

type R = ReturnType<typeof process>; // number — only sees last overload ❌

// ✅ For overloaded functions, annotate explicitly or use a generic version
type ProcessReturn<T extends string | number> = T;
```

---

## K — Coding Challenge + Solution

### Challenge

Write `memoize<T extends (...args: any[]) => any>(fn: T)` using `Parameters<T>` and `ReturnType<T>`. Then write `promisify<T extends (...args: any[]) => any>(fn: T)` that wraps a Node.js callback function.

### Solution

```typescript
function memoize<T extends (...args: unknown[]) => unknown>(fn: T): T {
  const cache = new Map<string, ReturnType<T>>();
  return ((...args: Parameters<T>): ReturnType<T> => {
    const key = JSON.stringify(args);
    if (!cache.has(key)) cache.set(key, fn(...args) as ReturnType<T>);
    return cache.get(key)!;
  }) as T;
}

const expensiveCalc = memoize((n: number) => {
  console.log("computing...");
  return n * n;
});
expensiveCalc(5); // computing... 25
expensiveCalc(5); // 25 (cached — no log) ✅

// Promisify: (args..., callback) => void  →  (...args) => Promise
type NodeCallback<R> = (err: Error | null, result: R) => void;
type WithCB<T extends unknown[], R> = [...T, NodeCallback<R>];

function promisify<T extends unknown[], R>(
  fn: (...args: WithCB<T, R>) => void
): (...args: T) => Promise<R> {
  return (...args: T) =>
    new Promise((res, rej) =>
      fn(...args, (err, result) => (err ? rej(err) : res(result)))
    );
}
```

---

---

# 5 — Intrinsic String Types + Mapped Types

---

## T — TL;DR

TypeScript ships four **intrinsic string utility types**: `Uppercase`, `Lowercase`, `Capitalize`, `Uncapitalize`. **Mapped types** iterate over the keys of a type to produce a new type — the foundation of all object utility types. `{ [K in keyof T]: ... }` is the syntax for iterating keys.

---

## K — Key Concepts

```typescript
// ── Intrinsic string types ────────────────────────────────────────────────
type U = Uppercase<"hello">; // 'HELLO'
type L = Lowercase<"WORLD">; // 'world'
type C = Capitalize<"mark">; // 'Mark'
type Un = Uncapitalize<"MARK">; // 'mARK'

// Useful with unions and template literals
type EventNames = "click" | "hover" | "focus";
type Handlers = `on${Capitalize<EventNames>}`;
// 'onClick' | 'onHover' | 'onFocus' ✅

type CSSProperty = "background-color" | "font-size" | "margin-top";
// Can't use directly — see template literal types (Subtopic 8)
```

```typescript
// ── Mapped types — iterate keys to build new types ────────────────────────
// Syntax: { [K in KeyUnion]: ValueType }
// K iterates over every member of KeyUnion
// 'in keyof T' iterates over all keys of T

// Basic mapped type
type Stringify<T> = {
  [K in keyof T]: string; // every property becomes string
};
type StringUser = Stringify<User>;
// { id: string; name: string; email: string; role: string }

// Transform value types
type Nullable<T> = {
  [K in keyof T]: T[K] | null; // add null to every property
};
type NullableUser = Nullable<User>;

// Preserve the key type, transform value
type Getters<T> = {
  [K in keyof T as `get${Capitalize<string & K>}`]: () => T[K];
};
type UserGetters = Getters<{ name: string; age: number }>;
// { getName: () => string; getAge: () => number } ✅
```

```typescript
// ── Mapped type with conditionals ─────────────────────────────────────────
// Keep only properties of a specific type
type StringProps<T> = {
  [K in keyof T]: T[K] extends string ? K : never;
}[keyof T]; // extract just the key names

type UserStringKeys = StringProps<User>; // 'name' | 'email' | 'role' ✅

// Pick only string-typed properties
type PickStrings<T> = Pick<T, StringProps<T>>;
type UserStrings = PickStrings<User>;
// { name: string; email: string; role: 'admin'|'user' }

// ── Mapping over a union (not keyof) ──────────────────────────────────────
type Status = "pending" | "active" | "closed";
type StatusRecord = {
  [K in Status]: { label: string; color: string };
};
// { pending: {...}; active: {...}; closed: {...} } — must provide all ✅
```

---

## W — Why It Matters

- Mapped types are how all built-in utility types are implemented — `Partial`, `Required`, `Readonly`, `Record`, `Pick` are all one-liners using mapped types. Knowing the syntax means you can build custom versions.
- `Getters<T>` generating `getName`, `getAge` from a type is the pattern used by Zustand, MobX, and form libraries to derive accessor types from data shapes — understanding it unlocks advanced library typing.
- Mapping over a union (`[K in Status]`) instead of `keyof` creates "exhaustive map" types — TypeScript errors if you miss a union member, the same safety as exhaustive switch without runtime code.

---

## I — Interview Q&A

### Q: What is a mapped type and how does `[K in keyof T]` work?

**A:** A mapped type creates a new type by iterating over the keys of another type. `[K in keyof T]` means "for each key K in the keys of T". The body `: ValueType` specifies what type each property should have — typically involving `T[K]` (the original property type) or a transformation of it. Modifiers like `?` (optional) and `readonly` can be added or removed with `+` and `-`. The result is a new type with the same keys as T but transformed values. All six built-in object utilities (Partial, Required, Readonly, Record, Pick, Omit) are implemented using exactly this syntax.

---

## C — Common Pitfalls + Fix

### ❌ Forgetting `& string` when using `K` in template literals

```typescript
// ❌ K is keyof T which includes symbols — template literals need string
type Getters<T> = {
  [K in keyof T as `get${Capitalize<K>}`]: () => T[K];
  //                              ^^^
  // TS error: Type 'K' does not satisfy 'string' ❌
};

// ✅ Intersect with string to filter out symbol keys
type Getters2<T> = {
  [K in keyof T as `get${Capitalize<string & K>}`]: () => T[K];
  //                                  ^^^^^^^^^ ✅
};
```

---

## K — Coding Challenge + Solution

### Challenge

Write `Getters<T>` (creates getter methods), `Setters<T>` (creates setter methods), and `Validators<T>` (creates `validateProp` methods that return `boolean`) from an object type.

### Solution

```typescript
type Getters<T> = {
  [K in keyof T as `get${Capitalize<string & K>}`]: () => T[K];
};
type Setters<T> = {
  [K in keyof T as `set${Capitalize<string & K>}`]: (value: T[K]) => void;
};
type Validators<T> = {
  [K in keyof T as `validate${Capitalize<string & K>}`]: (
    value: T[K]
  ) => boolean;
};
type ModelAPI<T> = Getters<T> & Setters<T> & Validators<T>;

interface UserForm {
  name: string;
  email: string;
  age: number;
}
type UserFormAPI = ModelAPI<UserForm>;
// {
//   getName:        () => string
//   getEmail:       () => string
//   getAge:         () => number
//   setName:        (v: string) => void
//   setEmail:       (v: string) => void
//   setAge:         (v: number) => void
//   validateName:   (v: string) => boolean
//   validateEmail:  (v: string) => boolean
//   validateAge:    (v: number) => boolean
// } ✅
```

---

---

# 6 — Mapped Modifiers + Key Remapping with as

---

## T — TL;DR

**Mapped modifiers** add or remove `readonly` and `?` with `+` and `-`. **Key remapping** (`as` clause) renames or filters keys during a mapped type, enabling powerful transformations like removing optional keys, creating event handler maps, or filtering by value type.

---

## K — Key Concepts

```typescript
// ── Adding modifiers ──────────────────────────────────────────────────────
type WithOptional<T> = { [K in keyof T]+?: T[K] }; // same as Partial<T>
type WithReadonly<T> = { +readonly [K in keyof T]: T[K] }; // same as Readonly<T>
// The '+' is implicit — usually omitted

// ── Removing modifiers ────────────────────────────────────────────────────
type WithRequired<T> = { [K in keyof T]-?: T[K] }; // same as Required<T>
type Mutable<T> = { -readonly [K in keyof T]: T[K] }; // removes readonly

// Practical: make a frozen config mutable for tests
type TestConfig = Mutable<Readonly<Config>>;

interface Frozen {
  readonly x: number;
  readonly y: number;
}
type Thawed = Mutable<Frozen>;
// { x: number; y: number } — no more readonly ✅
```

```typescript
// ── Key remapping with as ──────────────────────────────────────────────────
// Syntax: [K in keyof T as NewKey]: ValueType
// NewKey can be a template literal, conditional type, or never (to filter)

// Rename keys to camelCase event handlers
type EventHandlers<T> = {
  [K in keyof T as `on${Capitalize<string & K>}`]: (value: T[K]) => void;
};
type FormHandlers = EventHandlers<{ name: string; email: string }>;
// { onName: (v: string) => void; onEmail: (v: string) => void } ✅

// ── Filter keys using as + conditional (never removes the key) ────────────
// Keep only optional properties
type OptionalKeys<T> = {
  [K in keyof T as undefined extends T[K] ? K : never]: T[K];
};
// Keep only required properties
type RequiredKeys<T> = {
  [K in keyof T as undefined extends T[K] ? never : K]: T[K];
};

interface Mixed {
  id: number;
  name: string;
  bio?: string;
  avatar?: string;
}
type MixedOptional = OptionalKeys<Mixed>; // { bio?: string; avatar?: string }
type MixedRequired = RequiredKeys<Mixed>; // { id: number; name: string }

// ── Filter by value type ──────────────────────────────────────────────────
type PickByValue<T, V> = {
  [K in keyof T as T[K] extends V ? K : never]: T[K];
};
interface Entity {
  id: number;
  name: string;
  createdAt: Date;
  updatedAt: Date;
  active: boolean;
}
type StringFields = PickByValue<Entity, string>; // { name: string }
type DateFields = PickByValue<Entity, Date>; // { createdAt: Date; updatedAt: Date }
```

```typescript
// ── Key remapping: flatten nested ─────────────────────────────────────────
// Create a flat event map from nested config
type FlatEvents<T, Prefix extends string = ""> = {
  [K in keyof T as T[K] extends object
    ? never
    : Prefix extends ""
      ? string & K
      : `${Prefix}.${string & K}`]: T[K];
};

type Config = { db: { host: string; port: number }; app: { name: string } };
// (Full recursive version requires conditional types — see Subtopic 7)
```

---

## W — Why It Matters

- `Mutable<T>` (removing `readonly`) is essential for test setup — library types like `Readonly<Config>` need to become mutable in test mocks, and manually overriding every property is error-prone.
- Key remapping with `as` + `never` for filtering replaces the common pattern of `Pick<T, Extract<keyof T, ...>>` with a more readable inline filter — type transformation logic stays co-located.
- The `PickByValue<T, V>` pattern is used in ORM type generation (Prisma generates types that pick only scalar fields for `select` options, excluding relation fields).

---

## I — Interview Q&A

### Q: What does `never` do in a key remapping `as` clause?

**A:** In a mapped type `[K in keyof T as Expr]: V`, if `Expr` evaluates to `never` for a particular key, that key is excluded from the resulting type entirely. This makes `as` + `never` a filter mechanism: `[K in keyof T as T[K] extends string ? K : never]` keeps only keys whose value type extends `string`. This is more expressive than `Pick<T, ...>` for complex conditions because the filter logic is written inline with the mapping, and it composes with other transformations in the same mapped type expression.

---

## C — Common Pitfalls + Fix

### ❌ Remapping removes optionality — must re-add

```typescript
interface Form {
  name: string;
  bio?: string;
}

// ❌ as clause strips the optionality from the original
type Prefixed<T> = { [K in keyof T as `form_${string & K}`]: T[K] };
type PrefixedForm = Prefixed<Form>;
// { form_name: string; form_bio: string }  ← bio is no longer optional ❌

// ✅ Preserve optionality with conditional
type Prefixed2<T> = {
  [K in keyof T as `form_${string & K}`]?: T[K]; // make all optional ✅
};
// OR to preserve original optionality — use intersection with conditional
type Prefixed3<T> = {
  [K in keyof T as `form_${string & K}`]: undefined extends T[K]
    ? T[K] | undefined
    : T[K];
};
```

---

## K — Coding Challenge + Solution

### Challenge

Write `EventEmitterTypes<T>` that takes an event map `T` (keys = event names, values = payload types) and produces `{ on<K>(event: K, handler: (payload: T[K]) => void): void; emit<K>(event: K, payload: T[K]): void }`.

### Solution

```typescript
interface AppEvents {
  userCreated: { id: number; name: string };
  userDeleted: { id: number };
  pageView: { url: string; userId?: number };
}

type ListenerMap<T> = {
  [K in keyof T]: (payload: T[K]) => void;
};

class TypedEventEmitter<T extends Record<string, unknown>> {
  #listeners: Partial<ListenerMap<T>> = {};

  on<K extends keyof T>(event: K, handler: (payload: T[K]) => void): this {
    (this.#listeners[event] as typeof handler | undefined) ??
      (this.#listeners[event] = handler as ListenerMap<T>[K]);
    return this;
  }

  emit<K extends keyof T>(event: K, payload: T[K]): this {
    this.#listeners[event]?.(payload);
    return this;
  }
}

const emitter = new TypedEventEmitter<AppEvents>();
emitter.on("userCreated", ({ id, name }) => console.log(id, name)); // ✅ typed payload
emitter.emit("userCreated", { id: 1, name: "Mark" }); // ✅
emitter.emit("userCreated", { id: 1 }); // TS error: missing 'name' ✅
```

---

---

# 7 — Conditional Types + Distributive Conditional Types

---

## T — TL;DR

**Conditional types** (`T extends U ? X : Y`) choose a type based on whether `T` is assignable to `U`. **Distributive conditional types** automatically distribute over union members when `T` is a bare type parameter — `IsString<string | number>` becomes `IsString<string> | IsString<number>`. Understanding distribution is key to avoiding surprises.

---

## K — Key Concepts

```typescript
// ── Basic conditional type ─────────────────────────────────────────────────
type IsString<T> = T extends string ? true : false;

type A = IsString<string>; // true
type B = IsString<number>; // false
type C = IsString<string | number>; // boolean (distributed: true | false)

// More useful conditional types
type IsArray<T> = T extends any[] ? true : false;
type IsFunction<T> = T extends (...args: any[]) => any ? true : false;
type IsPromise<T> = T extends Promise<any> ? true : false;

// Non-nullable conditional
type NotNullable<T> = T extends null | undefined ? never : T;
type Test = NotNullable<string | null | undefined>; // string
```

```typescript
// ── Distributive conditional types ────────────────────────────────────────
// When T is a BARE type parameter, conditional distributes over union members
type Filter<T, U> = T extends U ? T : never;
type StringsOnly = Filter<string | number | boolean, string>; // string

// How Exclude and Extract are implemented:
type MyExclude<T, U> = T extends U ? never : T;
type MyExtract<T, U> = T extends U ? T : never;

// Distributive:
type Test1 = MyExclude<"a" | "b" | "c", "a">; // 'b' | 'c'
// Distributes as: ('a' extends 'a' ? never : 'a') | ('b'|'c' distributes...)

// ── Preventing distribution — wrap in tuple ───────────────────────────────
type IsUnion<T> = [T] extends [T] ? false : true; // simplified

// Use brackets to check "the whole union" not each member
type ExactMatch<T, U> = [T] extends [U]
  ? [U] extends [T]
    ? true
    : false
  : false;

type Test2 = ExactMatch<string, string>; // true
type Test3 = ExactMatch<string | number, string>; // false (distribution prevented)
```

```typescript
// ── Practical conditional types ────────────────────────────────────────────
// Unwrap a Promise (simplified Awaited)
type Unwrap<T> = T extends Promise<infer U> ? U : T; // infer covered in Subtopic 8

// Make only certain keys required
type RequireKeys<T, K extends keyof T> = T & Required<Pick<T, K>>;
interface User {
  id?: number;
  name: string;
  email?: string;
}
type UserWithId = RequireKeys<User, "id" | "email">;
// { id: number; name: string; email: string } — id and email now required ✅

// Type-safe deep access
type DeepAccess<T, K extends string> = K extends `${infer Head}.${infer Tail}`
  ? Head extends keyof T
    ? DeepAccess<T[Head], Tail>
    : never
  : K extends keyof T
    ? T[K]
    : never;
// (uses infer and template literals — Subtopic 8 builds this fully)
```

---

## W — Why It Matters

- Distributive conditional types are how `Exclude` and `Extract` work — without understanding distribution, the behaviour of `Filter<string | number, string>` returning `string` (not `never`) is mysterious.
- Wrapping in brackets (`[T] extends [U]`) to prevent distribution is a real technique used in TypeScript's own library types — knowing when distribution is a feature vs a bug prevents subtle type errors.
- Conditional types as filters (`T extends null ? never : T`) are the building block of NonNullable and enable custom "remove from union" utilities that composable library types rely on.

---

## I — Interview Q&A

### Q: What is a distributive conditional type and when does distribution happen?

**A:** Distribution happens when a conditional type `T extends U ? X : Y` has a bare (unwrapped) type parameter `T` that is a union. TypeScript automatically distributes the conditional over each union member: `F<A | B>` becomes `F<A> | F<B>`. This makes `Filter<string | number, string>` work — it distributes as `(string extends string ? string : never) | (number extends string ? string : never)` = `string | never` = `string`. Distribution only happens with bare type parameters. To prevent it, wrap in a single-element tuple: `[T] extends [U]` checks the union as a whole instead of member-by-member.

---

## C — Common Pitfalls + Fix

### ❌ Unexpected `never` when checking against `any`

```typescript
// ❌ anything extends any is true — always picks left branch
type Test<T> = T extends any ? "yes" : "no";
type R = Test<string>; // 'yes' — expected
type R2 = Test<never>; // never — because 'never' distributed over empty union!

// ❌ IsNever check using extends doesn't work naively
type IsNever<T> = T extends never ? true : false;
type N = IsNever<never>; // never (not true!) — distribution over empty set

// ✅ Use bracket to check for never
type IsNever2<T> = [T] extends [never] ? true : false;
type N2 = IsNever2<never>; // true ✅
type N3 = IsNever2<string>; // false ✅
```

---

## K — Coding Challenge + Solution

### Challenge

Write `FunctionKeys<T>` (keys whose values are functions), `NonFunctionKeys<T>` (keys whose values are not functions), and `OmitFunctions<T>` using conditional + mapped types.

### Solution

```typescript
type FunctionKeys<T> = {
  [K in keyof T]: T[K] extends (...args: any[]) => any ? K : never;
}[keyof T];

type NonFunctionKeys<T> = {
  [K in keyof T]: T[K] extends (...args: any[]) => any ? never : K;
}[keyof T];

type OmitFunctions<T> = Pick<T, NonFunctionKeys<T>>;
type PickFunctions<T> = Pick<T, FunctionKeys<T>>;

class UserService {
  id = 1;
  name = "Mark";
  getUser() {
    return this;
  }
  updateUser() {
    return this;
  }
  deleteUser() {
    return this;
  }
}

type ServiceData = OmitFunctions<UserService>; // { id: number; name: string }
type ServiceMethods = PickFunctions<UserService>;
// { getUser: () => ...; updateUser: () => ...; deleteUser: () => ... } ✅
```

---

---

# 8 — Template Literal Types + infer

---

## T — TL;DR

**Template literal types** compose string types like template literals do at runtime: `` `on${Capitalize<Event>}` `` produces `'onClick' | 'onHover'`. **`infer`** within conditional types extracts and names a type that TypeScript would otherwise compute — it's how `ReturnType`, `Parameters`, and `Awaited` are built.

---

## K — Key Concepts

```typescript
// ── Template literal types ────────────────────────────────────────────────
type EventName = "click" | "hover" | "focus";
type Handler = `on${Capitalize<EventName>}`;
// 'onClick' | 'onHover' | 'onFocus'

type CSSValue = "px" | "em" | "rem" | "%";
type CSSLength<N extends number = number> = `${N}${CSSValue}`;
const spacing: CSSLength = "16px"; // ✅
const bad: CSSLength = "16vw"; // TS error ✅

// HTTP route patterns
type Method = "GET" | "POST" | "PUT" | "DELETE";
type Route = `${Method} /${string}`;
const r1: Route = "GET /users"; // ✅
const r2: Route = "FETCH /users"; // TS error ✅

// CSS property to camelCase (combined with intrinsic types)
type CamelCase<S extends string> = S extends `${infer Head}-${infer Tail}`
  ? `${Head}${Capitalize<CamelCase<Tail>>}`
  : S;
type CC = CamelCase<"background-color">; // 'backgroundColor' ✅
```

```typescript
// ── infer — extract a type from a pattern ────────────────────────────────
// 'infer X' creates a new type variable X that TypeScript fills in
// Syntax: T extends SomePattern<infer X> ? X : never

// Unwrap array element type
type ElementType<T> = T extends (infer E)[] ? E : never;
type E1 = ElementType<string[]>; // string ✅
type E2 = ElementType<User[]>; // User ✅
type E3 = ElementType<number>; // never (not an array)

// Unwrap Promise
type PromiseValue<T> = T extends Promise<infer V> ? V : T;
type PV1 = PromiseValue<Promise<string>>; // string ✅
type PV2 = PromiseValue<string>; // string (passthrough)

// Extract function return type (how ReturnType is built)
type MyReturnType<T> = T extends (...args: any[]) => infer R ? R : never;
type MyParams<T> = T extends (...args: infer P) => any ? P : never;

// Infer from a tuple position
type Head<T extends any[]> = T extends [infer H, ...any[]] ? H : never;
type Tail<T extends any[]> = T extends [any, ...infer T] ? T : never;
type Last<T extends any[]> = T extends [...any[], infer L] ? L : never;

type H = Head<[1, 2, 3]>; // 1 ✅
type T = Tail<[1, 2, 3]>; // [2, 3] ✅
type L = Last<[1, 2, 3]>; // 3 ✅
```

```typescript
// ── infer in template literals ────────────────────────────────────────────
// Parse a route string into its parts
type ParseRoute<R extends string> = R extends `${infer Method} /${infer Path}`
  ? { method: Uppercase<Method>; path: Path }
  : never;

type Parsed = ParseRoute<"get /users/:id">;
// { method: 'GET'; path: 'users/:id' } ✅

// Extract param names from a path string
type ExtractParams<Path extends string> =
  Path extends `${string}:${infer Param}/${infer Rest}`
    ? Param | ExtractParams<Rest>
    : Path extends `${string}:${infer Param}`
      ? Param
      : never;

type Params = ExtractParams<"users/:userId/posts/:postId">;
// 'userId' | 'postId' ✅

type RouteParams<Path extends string> = { [K in ExtractParams<Path>]: string };
type P = RouteParams<"/users/:userId/posts/:postId">;
// { userId: string; postId: string } ✅
```

---

## W — Why It Matters

- `infer` is what makes TypeScript's most powerful utility types possible — `ReturnType`, `Parameters`, `Awaited`, `InstanceType` all use `infer` internally. Understanding it means you can write custom versions.
- Template literal types for route params (`RouteParams<'/users/:id'>`) are exactly how Express type libraries (like `express-zod-api`, `hono`) derive request parameter types from URL patterns at compile time.
- `CamelCase<'background-color'>` producing `'backgroundColor'` at the type level enables building CSS-in-JS and config transformation utilities that are fully type-safe.

---

## I — Interview Q&A

### Q: What does `infer` do in a conditional type?

**A:** `infer X` introduces a new type variable `X` that TypeScript infers from the matching pattern. It can only be used in the `extends` clause of a conditional type. When the condition matches, `X` is bound to the inferred type and available in the true branch. Example: `T extends Promise<infer U> ? U : never` — if `T` is `Promise<string>`, TypeScript infers `U = string` and the result is `string`. It's how you extract inner types from wrappers without knowing what the inner type is ahead of time.

---

## C — Common Pitfalls + Fix

### ❌ Multiple `infer` positions — TypeScript picks the last one

```typescript
// ❌ When multiple infer positions could match, TS uses the last
type FirstArg<T> = T extends (infer A, ...any[]) => any ? A : never
// Works for single arg, but be careful with rest patterns

// ✅ Use tuple rest patterns for precision
type FirstParam<T> = T extends (first: infer F, ...rest: any[]) => any ? F : never
function greet(name: string, greeting?: string) { return `${greeting} ${name}` }
type FP = FirstParam<typeof greet>   // string ✅
```

---

## K — Coding Challenge + Solution

### Challenge

Write `Flatten<T>` that recursively flattens array types, `UnwrapPromise<T>` that handles nested Promises, and `RouteParams<Path>` that extracts `:param` names from URL path strings.

### Solution

```typescript
// Flatten array type recursively
type Flatten<T> = T extends (infer E)[]
  ? E extends any[]
    ? Flatten<E>
    : E
  : T;

type F1 = Flatten<number[]>; // number ✅
type F2 = Flatten<number[][]>; // number ✅
type F3 = Flatten<string>; // string (passthrough) ✅

// Unwrap nested promises
type UnwrapPromise<T> =
  T extends Promise<infer U>
    ? UnwrapPromise<U> // recursive
    : T;
type U1 = UnwrapPromise<Promise<Promise<string>>>; // string ✅
type U2 = UnwrapPromise<string>; // string ✅

// Route params from URL pattern
type ExtractParam<Path extends string> =
  Path extends `${string}:${infer P}/${infer R}`
    ? P | ExtractParam<`/${R}`>
    : Path extends `${string}:${infer P}`
      ? P
      : never;

type RouteParams<Path extends string> = {
  [K in ExtractParam<Path>]: string;
};

type Params = RouteParams<"/orgs/:orgId/repos/:repoId/issues/:issueId">;
// { orgId: string; repoId: string; issueId: string } ✅
```

---

---

# 9 — Overloads + Recursive Types

---

## T — TL;DR

**Function overloads** provide multiple type signatures for one function — different input types → different output types. **Recursive types** reference themselves to describe nested structures like trees, nested objects, and JSON. `DeepPartial` and `DeepReadonly` are the canonical examples.

---

## K — Key Concepts

```typescript
// ── Function overloads ────────────────────────────────────────────────────
// Declare multiple signatures, then one implementation signature
function process(x: string): string;
function process(x: number): number;
function process(x: string | number): string | number {
  if (typeof x === "string") return x.toUpperCase();
  return x * 2;
}
const s = process("hello"); // type: string ✅ (not string|number)
const n = process(42); // type: number ✅

// More realistic: parseInput with different return types
function parseInput(input: string): string;
function parseInput(input: number): number;
function parseInput(input: boolean): boolean;
function parseInput(
  input: string | number | boolean
): string | number | boolean {
  return input; // simplified
}

// Overloads for optional params with different return types
function createElement(tag: "input"): HTMLInputElement;
function createElement(tag: "div"): HTMLDivElement;
function createElement(tag: string): HTMLElement;
function createElement(tag: string): HTMLElement {
  return document.createElement(tag);
}
const inp = createElement("input"); // type: HTMLInputElement ✅
const div = createElement("div"); // type: HTMLDivElement ✅
```

```typescript
// ── Recursive types ───────────────────────────────────────────────────────
// JSON value — recursive definition
type JSONPrimitive = string | number | boolean | null;
type JSONObject = { [key: string]: JSONValue };
type JSONArray = JSONValue[];
type JSONValue = JSONPrimitive | JSONObject | JSONArray;

const json: JSONValue = {
  name: "Mark",
  age: 28,
  tags: ["ts", "node"],
  meta: { nested: { deep: true } }, // ✅ arbitrary depth
};

// ── DeepPartial ───────────────────────────────────────────────────────────
type DeepPartial<T> = T extends (infer E)[]
  ? DeepPartial<E>[]
  : T extends object
    ? { [K in keyof T]?: DeepPartial<T[K]> }
    : T;

interface Config {
  db: { host: string; port: number; ssl: boolean };
  app: { name: string; port: number; debug: boolean };
}

type PartialConfig = DeepPartial<Config>;
// All nested properties optional ✅
const update: PartialConfig = { db: { port: 5433 } }; // only override db.port
```

```typescript
// ── DeepReadonly ──────────────────────────────────────────────────────────
type DeepReadonly<T> = T extends (infer E)[]
  ? ReadonlyArray<DeepReadonly<E>>
  : T extends object
    ? { readonly [K in keyof T]: DeepReadonly<T[K]> }
    : T;

type ImmutableConfig = DeepReadonly<Config>;
const cfg: ImmutableConfig = {
  db: { host: "localhost", port: 5432, ssl: false },
  app: { name: "myapp", port: 3000, debug: true },
};
cfg.db.port = 9999; // TS error: readonly ✅

// ── DeepRequired ──────────────────────────────────────────────────────────
type DeepRequired<T> = T extends object
  ? { [K in keyof T]-?: DeepRequired<T[K]> }
  : T;

// ── Recursive tree type (continued) ───────────────────────────────────────
interface TreeNode<T> {
  value: T;
  children: TreeNode<T>[]; // recursive ✅
}

const tree: TreeNode<string> = {
  value: "root",
  children: [
    { value: "child1", children: [] },
    {
      value: "child2",
      children: [{ value: "grandchild", children: [] }],
    },
  ],
};

// Tree traversal with recursive generic
function mapTree<T, U>(node: TreeNode<T>, fn: (v: T) => U): TreeNode<U> {
  return {
    value: fn(node.value),
    children: node.children.map((child) => mapTree(child, fn)),
  };
}

const upperTree = mapTree(tree, (s) => s.toUpperCase());
// { value: 'ROOT', children: [{ value: 'CHILD1', ... }] } ✅
```

```typescript
// ── Overloads with generics ────────────────────────────────────────────────
// Overloads can mix generics and concrete types
function getOrDefault<T>(map: Map<string, T>, key: string, fallback: T): T;
function getOrDefault<T>(
  map: Map<string, T>,
  key: string,
  fallback?: T
): T | undefined;
function getOrDefault<T>(
  map: Map<string, T>,
  key: string,
  fallback?: T
): T | undefined {
  return map.has(key) ? map.get(key)! : fallback;
}

const m = new Map<string, number>([["a", 1]]);
const v1 = getOrDefault(m, "a", 0); // type: number ✅
const v2 = getOrDefault(m, "x", 0); // type: number ✅ (fallback)
const v3 = getOrDefault(m, "x"); // type: number | undefined ✅

// ── Overload ordering rule ─────────────────────────────────────────────────
// More specific overloads MUST come before less specific ones
function wrap(x: string): { type: "string"; value: string };
function wrap(x: number): { type: "number"; value: number };
function wrap(x: string | number): {
  type: "string" | "number";
  value: string | number;
} {
  return { type: typeof x as "string" | "number", value: x };
}
// The implementation signature is NOT visible to callers
// Callers only see the declared overload signatures above it
```

---

## W — Why It Matters

- Overloads are how DOM APIs like `createElement`, `querySelector`, and `addEventListener` are typed — returning specific element/event types based on string literal arguments. Understanding overloads lets you read and write accurate library definitions.
- `DeepPartial<T>` is the correct type for recursive config patches and merge operations — plain `Partial<T>` only makes the top level optional, silently accepting fully required nested objects.
- Recursive types are how TypeScript types JSON, ASTs, file trees, and any unbounded nesting — without recursion, you'd need to manually define depth-limited types (`Depth1 | Depth2 | Depth3`).

---

## I — Interview Q&A

### Q: What is the overload implementation signature and why can't callers use it?

**A:** When you write function overloads in TypeScript, each `function name(...)` line before the actual `function name(...) { body }` is an overload signature. The final function with a body is the implementation signature. TypeScript only exposes the overload signatures to callers — the implementation signature is internal. This means the implementation signature must be compatible with all overload signatures (often using union types), but callers never see it. The reason: the implementation signature is often intentionally wider (accepts `string | number`) to handle all cases, while the overload signatures give precise per-input types to callers.

---

## C — Common Pitfalls + Fix

### ❌ Overload order: specific after general — general always wins

```typescript
// ❌ General overload first — specific one never reached
function parse(x: string | number): any;
function parse(x: string): string; // ❌ never matched — above already consumed it
function parse(x: any): any {
  return x;
}

// ✅ Specific overloads FIRST, general LAST
function parse2(x: string): string;
function parse2(x: number): number;
function parse2(x: string | number): string | number {
  return x;
}

parse2("hello"); // type: string ✅
parse2(42); // type: number ✅
```

---

## K — Coding Challenge + Solution

### Challenge

Write `DeepPartial<T>`, `DeepReadonly<T>`, and `DeepRequired<T>`. Then write an overloaded `toArray<T>` that returns `T[]` when given a single `T` value and `T[]` unchanged when given `T[]`.

### Solution

```typescript
// ── Recursive utility types ────────────────────────────────────────────────
type DeepPartial<T> = T extends (infer E)[]
  ? DeepPartial<E>[]
  : T extends object
    ? { [K in keyof T]?: DeepPartial<T[K]> }
    : T;

type DeepReadonly<T> = T extends (infer E)[]
  ? ReadonlyArray<DeepReadonly<E>>
  : T extends object
    ? { readonly [K in keyof T]: DeepReadonly<T[K]> }
    : T;

type DeepRequired<T> = T extends (infer E)[]
  ? DeepRequired<E>[]
  : T extends object
    ? { [K in keyof T]-?: DeepRequired<T[K]> }
    : T;

// Verify
interface Settings {
  ui: { theme: string; fontSize?: number };
  api: { url: string; timeout: number; retries?: number };
}
type PS = DeepPartial<Settings>; // all nested properties optional ✅
type RS = DeepReadonly<Settings>; // all nested properties readonly ✅
type RQS = DeepRequired<Settings>; // all nested properties required ✅

// ── Overloaded toArray ────────────────────────────────────────────────────
function toArray<T>(value: T): T[];
function toArray<T>(value: T[]): T[];
function toArray<T>(value: T | T[]): T[] {
  return Array.isArray(value) ? value : [value];
}

toArray("hello"); // type: string[]  ✅
toArray([1, 2, 3]); // type: number[]  ✅
toArray({ id: 1 }); // type: { id: number }[] ✅
```

---

---

# 10 — Safe JSON.parse — unknown-first narrowing + runtime validation

---

## T — TL;DR

`JSON.parse` returns `any` — the opposite of type-safe. The correct workflow: type the result as `unknown`, then narrow it with a type guard or validate it with a schema library (Zod). This is the pattern for **all** external data: API responses, config files, form inputs, localStorage. Type assertions (`as User`) without validation are lies.

---

## K — Key Concepts

```typescript
// ── The problem with JSON.parse ────────────────────────────────────────────
const raw = '{"name":"Mark","age":28}';
const user = JSON.parse(raw); // type: any ❌ — completely untyped
user.name.toUpperCase(); // TypeScript is silent — runtime crash if wrong

// Worse: type assertion without validation
const user2 = JSON.parse(raw) as User; // ❌ a lie — forces the type with no check
// If the JSON is malformed or the API changes, this silently breaks at runtime
```

```typescript
// ── unknown-first narrowing ────────────────────────────────────────────────
// Step 1: explicitly type as unknown
function safeParse(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

const data: unknown = safeParse('{"name":"Mark","age":28}');

// TypeScript now forces you to check before using
data.name; // TS error: Object is of type 'unknown' ✅ caught!

// ── Manual type guards ────────────────────────────────────────────────────
interface User {
  id: number;
  name: string;
  email: string;
}

function isUser(value: unknown): value is User {
  return (
    typeof value === "object" &&
    value !== null &&
    "id" in value &&
    typeof (value as any).id === "number" &&
    "name" in value &&
    typeof (value as any).name === "string" &&
    "email" in value &&
    typeof (value as any).email === "string"
  );
}

const raw = safeParse('{"id":1,"name":"Mark","email":"m@ex.com"}');
if (isUser(raw)) {
  console.log(raw.name.toUpperCase()); // ✅ TypeScript knows it's User
} else {
  console.error("Invalid user data");
}
```

```typescript
// ── Zod — the production solution ─────────────────────────────────────────
import { z } from "zod";

// Define schema once — derives both the type AND the validator
const UserSchema = z.object({
  id: z.number().int().positive(),
  name: z.string().min(1).max(100),
  email: z.string().email(),
  role: z.enum(["admin", "user"]).default("user"),
});

// TypeScript type derived from schema — no separate interface needed
type User = z.infer<typeof UserSchema>;
// { id: number; name: string; email: string; role: 'admin' | 'user' }

// parse: throws ZodError with field-level messages if invalid
const user = UserSchema.parse(JSON.parse(raw)); // User | throws ✅

// safeParse: returns { success, data } or { success, error } — never throws
const result = UserSchema.safeParse(JSON.parse(raw));
if (result.success) {
  console.log(result.data.name); // ✅ User
} else {
  console.error(result.error.flatten()); // field-level errors
}
```

```typescript
// ── Complete safe JSON workflow ────────────────────────────────────────────
import { z } from "zod";

// Reusable safe parse wrapper
function parseJSON(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch (err) {
    throw new SyntaxError(
      `Invalid JSON: ${err instanceof Error ? err.message : String(err)}`
    );
  }
}

// Typed parse with schema
function parseAs<T>(schema: z.ZodType<T>, text: string): T {
  const raw = parseJSON(text); // unknown — might throw SyntaxError
  return schema.parse(raw); // T — throws ZodError if schema fails
}

// Safe version — never throws, returns Result
function parseAsSafe<T>(
  schema: z.ZodType<T>,
  text: string
): { ok: true; value: T } | { ok: false; error: string } {
  try {
    const raw = parseJSON(text);
    const value = schema.parse(raw);
    return { ok: true, value };
  } catch (err) {
    const msg =
      err instanceof z.ZodError
        ? err.errors.map((e) => `${e.path.join(".")}: ${e.message}`).join(", ")
        : err instanceof Error
          ? err.message
          : String(err);
    return { ok: false, error: msg };
  }
}
```

```typescript
// ── API response validation ────────────────────────────────────────────────
const PostSchema = z.object({
  id: z.number(),
  title: z.string(),
  body: z.string(),
  userId: z.number(),
  published: z.boolean().optional(),
});

const PaginatedSchema = <T extends z.ZodTypeAny>(itemSchema: T) =>
  z.object({
    data: z.array(itemSchema),
    total: z.number(),
    page: z.number(),
    limit: z.number(),
  });

type Post = z.infer<typeof PostSchema>;
type PaginatedPost = z.infer<
  ReturnType<typeof PaginatedSchema<typeof PostSchema>>
>;

async function fetchPosts(page = 1): Promise<PaginatedPost> {
  const res = await fetch(`/api/posts?page=${page}`);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const raw = await res.json(); // unknown (conceptually)
  return PaginatedSchema(PostSchema).parse(raw); // validated ✅
}

const posts = await fetchPosts(1);
posts.data[0]?.title; // type: string ✅ — fully safe
```

```typescript
// ── localStorage with schema validation ───────────────────────────────────
const PrefsSchema = z.object({
  theme: z.enum(["light", "dark"]).default("light"),
  fontSize: z.number().min(10).max(24).default(14),
  lang: z.string().length(2).default("en"),
});
type Prefs = z.infer<typeof PrefsSchema>;

function loadPrefs(): Prefs {
  try {
    const raw = localStorage.getItem("prefs");
    if (!raw) return PrefsSchema.parse({}); // all defaults ✅
    return PrefsSchema.parse(JSON.parse(raw));
  } catch {
    return PrefsSchema.parse({}); // corrupt data → defaults ✅
  }
}

function savePrefs(prefs: Prefs): void {
  localStorage.setItem("prefs", JSON.stringify(prefs));
}

// ── Type narrowing without Zod ─────────────────────────────────────────────
// For simple cases: manual type guard pipeline
function isString(v: unknown): v is string {
  return typeof v === "string";
}
function isNumber(v: unknown): v is number {
  return typeof v === "number";
}
function isObject(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}
function hasKey<K extends string>(
  obj: Record<string, unknown>,
  key: K
): obj is Record<K, unknown> {
  return key in obj;
}

function parseUser(raw: unknown): User {
  if (!isObject(raw)) throw new TypeError("Expected object");
  if (!hasKey(raw, "id")) throw new TypeError("Missing id");
  if (!hasKey(raw, "name")) throw new TypeError("Missing name");
  if (!hasKey(raw, "email")) throw new TypeError("Missing email");
  if (!isNumber(raw.id)) throw new TypeError("id must be a number");
  if (!isString(raw.name)) throw new TypeError("name must be a string");
  if (!isString(raw.email)) throw new TypeError("email must be a string");
  return { id: raw.id, name: raw.name, email: raw.email }; // ✅ all narrowed
}
```

---

## W — Why It Matters

- `JSON.parse` is `any` by design — every external data boundary (API call, file read, user input, localStorage, WebSocket message) returns untyped data. `unknown`-first + schema validation is the only way to maintain end-to-end type safety.
- Type assertions (`as User`) on parsed JSON are security and reliability risks — a malicious or changed API response with missing/wrong fields won't be caught by TypeScript, but will crash your app at runtime.
- Zod schemas are single-source-of-truth — they generate the TypeScript type AND the runtime validator from one definition. When the schema changes, both the type and validation update together. No drift between interface and validation logic.

---

## I — Interview Q&A

### Q: Why is `JSON.parse(text) as User` unsafe, and what should you do instead?

**A:** `JSON.parse` returns `any` — TypeScript knows nothing about the shape. Adding `as User` is a type assertion that tells TypeScript "trust me, this is a User" without any runtime check. If the JSON is malformed, the API changes, a field is missing, or a type is wrong, TypeScript has no idea — it accepted your assertion. The code will crash at runtime when you try to use a missing property. The safe workflow: (1) type the result as `unknown` to force type-checking, (2) validate with a schema library like Zod — `UserSchema.parse(data)` throws with detailed field-level errors if invalid, (3) use the result of `.parse()` which is fully typed. This way the TypeScript type and runtime reality are always in sync.

---

## C — Common Pitfalls + Fix

### ❌ Using `as` to force a type on parsed data — lies to the compiler

```typescript
// ❌ Type assertion — no runtime check, just a compiler override
interface Config {
  host: string;
  port: number;
  debug: boolean;
}

const raw = localStorage.getItem("config") ?? "{}";
const config = JSON.parse(raw) as Config; // ❌ what if port is a string? debug missing?
config.port.toFixed(2); // runtime crash if port isn't actually a number

// ❌ Double assertion — even more dangerous, bypasses all checks
const config2 = JSON.parse(raw) as unknown as Config; // ❌ double lie

// ✅ Validate with Zod
import { z } from "zod";
const ConfigSchema = z.object({
  host: z.string().default("localhost"),
  port: z.number().int().default(3000),
  debug: z.boolean().default(false),
});
const config3 = ConfigSchema.parse(JSON.parse(raw)); // ✅ validated and typed
config3.port.toFixed(2); // ✅ guaranteed to be number
```

---

## K — Coding Challenge + Solution

### Challenge

Build a complete `createStorage<T>(key: string, schema: z.ZodType<T>, defaults: T)` that wraps `localStorage` — typed `get()`, `set(value: T)`, `update(patch: Partial<T>)`, `reset()`, and auto-validation on read with fallback to defaults on invalid data.

### Solution

```typescript
import { z } from "zod";

function createStorage<T extends object>(
  key: string,
  schema: z.ZodType<T>,
  defaults: T
) {
  function read(): T {
    try {
      const raw = localStorage.getItem(key);
      if (!raw) return defaults;
      const parsed = JSON.parse(raw);
      const result = schema.safeParse(parsed);
      return result.success ? result.data : defaults;
    } catch {
      return defaults;
    }
  }

  function write(value: T): void {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch (err) {
      console.error(`Storage write failed for key "${key}":`, err);
    }
  }

  return {
    get(): T {
      return read();
    },

    set(value: T): void {
      const result = schema.safeParse(value);
      if (!result.success) {
        throw new Error(
          `Invalid value for "${key}": ` +
            result.error.errors
              .map((e) => `${e.path.join(".")}: ${e.message}`)
              .join(", ")
        );
      }
      write(result.data);
    },

    update(patch: Partial<T>): T {
      const current = read();
      const updated = { ...current, ...patch };
      const result = schema.safeParse(updated);
      if (!result.success) throw new Error(`Invalid patch for "${key}"`);
      write(result.data);
      return result.data;
    },

    reset(): void {
      write(defaults);
    },

    clear(): void {
      localStorage.removeItem(key);
    },
  };
}

// ── Usage ─────────────────────────────────────────────────────────────────
const PrefsSchema = z.object({
  theme: z.enum(["light", "dark"]).default("light"),
  fontSize: z.number().min(10).max(24).default(14),
  lang: z.string().length(2).default("en"),
  sidebarOpen: z.boolean().default(true),
});
type Prefs = z.infer<typeof PrefsSchema>;

const prefsStore = createStorage("prefs", PrefsSchema, PrefsSchema.parse({}));

const prefs = prefsStore.get(); // Prefs — validated, defaults filled ✅
prefsStore.set({ ...prefs, theme: "dark" }); // ✅ validated before write
prefsStore.update({ fontSize: 18 }); // ✅ merges with current, validates
prefsStore.reset(); // back to defaults ✅
prefsStore.set({ ...prefs, theme: "pink" as any }); // ❌ throws: invalid enum ✅
```

---

## ✅ Day 8 Complete — TypeScript Generics, Utility Types & Type Transformations

| #   | Subtopic                                                                              | Status |
| --- | ------------------------------------------------------------------------------------- | ------ |
| 1   | Generics Fundamentals — functions, interfaces, classes                                | ☐      |
| 2   | Generic Constraints — extends, keyof, defaults, const params                          | ☐      |
| 3   | Utility Types Part 1 — Partial, Required, Readonly, Record, Pick, Omit                | ☐      |
| 4   | Utility Types Part 2 — Exclude, Extract, NonNullable, ReturnType, Parameters, Awaited | ☐      |
| 5   | Intrinsic String Types + Mapped Types                                                 | ☐      |
| 6   | Mapped Modifiers + Key Remapping with as                                              | ☐      |
| 7   | Conditional Types + Distributive Conditional Types                                    | ☐      |
| 8   | Template Literal Types + infer                                                        | ☐      |
| 9   | Overloads + Recursive Types — DeepPartial, DeepReadonly                               | ☐      |
| 10  | Safe JSON.parse — unknown-first + runtime validation                                  | ☐      |

---

## 🗺️ One-Page Mental Model — Day 8

```
GENERICS
  <T> = type placeholder — carries type through, no loss like 'any'
  Generic fn:    function wrap<T>(x: T): { value: T }
  Generic iface: interface ApiResponse<T> { data: T; status: number }
  Generic class: class Stack<T> { push(item: T): this }
  Inference:     TypeScript infers T from usage (no explicit annotation needed)

CONSTRAINTS
  <T extends U>         → T must be assignable to U
  <T extends keyof U>   → T must be a key name of U
  <T extends object>    → T must be non-primitive
  <T = Default>         → T defaults to Default when not provided
  <const T>             → preserves literal types in inference (TS 5.0+)
  T[K] only valid when K extends keyof T — enables safe property access

UTILITY TYPES (object)
  Partial<T>       → all props optional       | { [K in keyof T]?: T[K] }
  Required<T>      → all props required        | { [K in keyof T]-?: T[K] }
  Readonly<T>      → all props readonly        | { readonly [K in keyof T]: T[K] }
  Record<K, V>     → key-value map with K keys | { [P in K]: V }
  Pick<T, K>       → keep listed keys (allowlist)
  Omit<T, K>       → remove listed keys (denylist)

UTILITY TYPES (union + function)
  Exclude<T, U>           → remove U members from T union
  Extract<T, U>           → keep U members from T union
  NonNullable<T>          → remove null | undefined
  ReturnType<T>           → extract return type of function T
  Parameters<T>           → extract param types as tuple
  ConstructorParameters<T>→ extract constructor param types
  InstanceType<T>         → extract instance type from class constructor
  Awaited<T>              → recursively unwrap Promise<T>

INTRINSIC STRING TYPES
  Uppercase / Lowercase / Capitalize / Uncapitalize — compile-time string transforms
  Combine with template literals and mapped types for derived naming

MAPPED TYPES
  { [K in keyof T]: NewType }    → iterate keys, transform values
  { [K in Union]: ValueType }    → iterate union members (exhaustive)
  +? / -? : add/remove optional  | +readonly / -readonly: add/remove readonly
  as clause: [K in keyof T as NewKey] → rename or filter keys
  as Expr extends string ? K : never → filter (never removes the key)
  string & K — required in template literals to exclude symbols

CONDITIONAL TYPES
  T extends U ? X : Y           → basic conditional
  Distributive: T extends U — distributes over union members when T is bare param
  Prevent distribution: [T] extends [U] — wraps union, checks as whole
  Filter unions: T extends U ? T : never → Extract pattern
  IsNever: [T] extends [never] ? true : false — only safe way to check

TEMPLATE LITERAL TYPES
  `on${Capitalize<Event>}` → produces 'onClick' | 'onHover' etc.
  ExtractParams: infer in template → parse :param from URL strings
  CamelCase: recursive template + infer → 'background-color' → 'backgroundColor'

INFER
  T extends Pattern<infer X> ? X : never → X is inferred from match
  infer in tuple: [infer H, ...infer T] → head, tail extraction
  infer in template: `${infer Method} /${infer Path}` → parse strings
  Basis of: ReturnType, Parameters, Awaited, ElementType

OVERLOADS
  Declare multiple fn signatures → one implementation (not visible to callers)
  Order: specific signatures first, general last
  Implementation signature must be compatible with all overloads (uses unions)
  Common use: different return types based on literal string argument

RECURSIVE TYPES
  Type references itself → models JSON, trees, nested configs
  DeepPartial:   { [K in keyof T]?: DeepPartial<T[K]> }
  DeepReadonly:  { readonly [K in keyof T]: DeepReadonly<T[K]> }
  DeepRequired:  { [K in keyof T]-?: DeepRequired<T[K]> }
  Handle arrays separately: T extends (infer E)[] ? DeepX<E>[] : ...

SAFE JSON.parse WORKFLOW
  1. JSON.parse(text) → treat as unknown (or type it as unknown)
  2. NEVER use 'as T' without validation — it's a lie to the compiler
  3. Validate with:
     a) Manual type guard: isUser(value): value is User — verbose but no deps
     b) Zod: z.object({...}).parse(raw) — throws with field-level errors
     c) Zod safeParse: returns { success, data } | { success, error } — never throws
  4. z.infer<typeof Schema> derives TS type from schema — single source of truth
  5. Apply to: API responses, localStorage, config files, WebSocket messages
  Rule: every external data boundary needs unknown-first + runtime validation
```

> **Your next action:** Open a TypeScript playground, write `type DeepPartial<T> = T extends object ? { [K in keyof T]?: DeepPartial<T[K]> } : T` and hover over `DeepPartial<{ a: { b: { c: number } } }>` — watch TypeScript expand the recursive type live. Thirty seconds of exploration beats rereading.

> "Doing one small thing beats opening a feed."
