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
