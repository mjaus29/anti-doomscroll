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
