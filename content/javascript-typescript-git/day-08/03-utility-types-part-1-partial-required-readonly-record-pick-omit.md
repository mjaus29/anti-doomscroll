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
