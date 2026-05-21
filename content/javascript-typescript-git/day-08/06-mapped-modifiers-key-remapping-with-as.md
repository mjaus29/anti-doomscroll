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
