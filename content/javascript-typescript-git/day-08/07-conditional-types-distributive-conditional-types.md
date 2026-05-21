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
