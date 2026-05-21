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
