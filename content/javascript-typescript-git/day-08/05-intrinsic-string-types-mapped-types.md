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
