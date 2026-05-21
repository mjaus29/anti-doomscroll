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
