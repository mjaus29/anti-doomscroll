# 10 — Variance + useUnknownInCatchVariables + Unknown External Data

---

## T — TL;DR

**Variance** describes how generic types relate when their type arguments have a subtype relationship — covariant (same direction), contravariant (opposite), invariant (neither). **`useUnknownInCatchVariables`** makes caught errors `unknown` instead of `any`. **Unknown external data** handling is the synthesis of all narrowing techniques — always assume external data is `unknown` until validated.

---

## K — Key Concepts

```typescript
// ── Variance ──────────────────────────────────────────────────────────────
// Covariant: if A extends B, then Container<A> extends Container<B>
// (same direction) — read-only positions
type Producer<T> = () => T   // covariant in T
const stringProducer: Producer<string> = () => 'hello'
const anyProducer: Producer<string | number> = stringProducer  // ✅ covariant

// Contravariant: if A extends B, then Container<B> extends Container<A>
// (opposite direction) — write-only / parameter positions
type Consumer<T> = (value: T) => void   // contravariant in T
const stringConsumer: Consumer<string> = (s) => s.toUpperCase()
const widerConsumer: Consumer<string> = (s: string | number) => {}  // ✅

// Invariant: must be exactly the same type — read + write (mutable)
type MutableBox<T> = { value: T }   // invariant — read and write
const strBox: MutableBox<string>    = { value: 'hello' }
// const anyBox: MutableBox<string | number> = strBox   // ❌ invariant

// TypeScript uses structural typing + variance for function types
// strictFunctionTypes: true → function parameters are contravariant ✅
```

```typescript
// ── Variance annotations (TS 4.7+) ────────────────────────────────────────
// Explicit variance hints — improves type-checking performance
interface ReadonlyRef<out T> {    // 'out' = covariant (produce T)
  readonly value: T
}
interface WriteRef<in T> {        // 'in' = contravariant (consume T)
  set(value: T): void
}
interface Ref<in out T> {         // invariant
  value: T
}

const readStr: ReadonlyRef<string> = { value: 'hello' }
const readAny: ReadonlyRef<string | number> = readStr   // ✅ covariant
```

```typescript
// ── useUnknownInCatchVariables ────────────────────────────────────────────
// tsconfig: "useUnknownInCatchVariables": true (included in strict: true)

try {
  throw new Error('something')
} catch (err) {
  // Without flag: err is 'any' — access anything, no safety
  // With flag:    err is 'unknown' — must narrow before use

  err.message           // TS error: 'err' is 'unknown' ✅
  String(err)           // ✅ explicit coercion always works

  if (err instanceof Error) {
    err.message         // ✅ narrowed to Error
    err.stack           // ✅
  } else if (typeof err === 'string') {
    err.toUpperCase()   // ✅ narrowed to string
  }
}

// Reusable error extraction
function toErrorMessage(err: unknown): string {
  if (err instanceof Error) return err.message
  if (typeof err === 'string') return err
  return `Unknown error: ${String(err)}`
}
```

```typescript
// ── Unknown external data — the complete pattern ──────────────────────────
import { z } from 'zod'

// Every external boundary: treat as unknown, validate before use
const UserSchema = z.object({
  id:    z.number().int().positive(),
  name:  z.string().min(1),
  email: z.string().email(),
})
type User = z.infer<typeof UserSchema>

// API response
async function getUser(id: number): Promise<User> {
  const res  = await fetch(`/api/users/${id}`)
  if (!res.ok) throw new Error(`HTTP ${res.status}: ${res.statusText}`)
  const raw: unknown = await res.json()   // explicitly unknown ✅
  return UserSchema.parse(raw)            // validated ✅
}

// Environment variables
function requireEnv(key: string): string {
  const val = process.env[key]
  if (!val) throw new Error(`Missing required env var: ${key}`)
  return val
}
const dbUrl = requireEnv('DATABASE_URL')   // string (validated) ✅

// File system data
import { readFile } from 'fs/promises'
const ConfigSchema = z.object({
  port: z.number().default(3000),
  host: z.string().default('localhost'),
})

async function loadConfig(path: string) {
  const raw:     string  = await readFile(path, 'utf-8')
  const parsed:  unknown = JSON.parse(raw)   // unknown ✅
  return ConfigSchema.parse(parsed)          // validated ✅
}

// localStorage
function getFromStorage<T>(key: string, schema: z.ZodType<T>, fallback: T): T {
  try {
    const raw = localStorage.getItem(key)
    if (!raw) return fallback
    return schema.parse(JSON.parse(raw))
  } catch { return fallback }
}
```

```typescript
// ── Synthesising all narrowing techniques ─────────────────────────────────
function processWebhookPayload(rawBody: unknown): void {
  // Step 1: Type guard — is it an object?
  if (typeof rawBody !== 'object' || rawBody === null) {
    throw new TypeError('Webhook payload must be an object')
  }

  // Step 2: Discriminated union — check the 'type' field
  if (!('type' in rawBody) || typeof (rawBody as any).type !== 'string') {
    throw new TypeError('Missing event type')
  }
  const event = rawBody as { type: string; [key: string]: unknown }

  // Step 3: Switch on discriminant
  switch (event.type) {
    case 'user.created':
      const user = UserSchema.parse(event.data)   // Zod validates ✅
      handleUserCreated(user)
      break
    case 'order.completed':
      // validate order data...
      break
    default:
      console.warn(`Unknown webhook type: ${event.type}`)
  }
}
```

---

## W — Why It Matters

- Variance is why `string[]` is not assignable to `(string | number)[]` in some contexts — mutable arrays are invariant. Understanding this stops you from fighting TypeScript errors that seem inexplicable.
- `useUnknownInCatchVariables` makes you write proper error handling — when `err` was `any`, you'd write `err.message` and TypeScript was silent. With `unknown`, TypeScript forces you to check `err instanceof Error` first, which is actually correct behaviour.
- The `unknown`-first pattern for all external data is the synthesis of the entire Day 9 — narrowing techniques, type guards, discriminated unions, and schema validation all come together to safely handle data that exists at runtime but has no compile-time guarantees.

---

## I — Interview Q&A

### Q: What is covariance and contravariance in TypeScript?

**A:** Variance describes how subtype relationships propagate through generic types. Covariance (same direction): if `Dog extends Animal`, then `() => Dog` is assignable to `() => Animal` — a function producing Dogs can be used where an Animal producer is expected. Contravariance (opposite direction): `(animal: Animal) => void` is assignable to `(dog: Dog) => void` — a handler accepting all animals can handle a dog specifically. TypeScript enforces this with `strictFunctionTypes: true` — function parameters are contravariant, return types are covariant. Read-only containers are covariant; mutable containers are invariant (must be exactly the same type to avoid unsafe mutations).

---

## C — Common Pitfalls + Fix

### ❌ Catching an error and accessing `.message` without checking

```typescript
// ❌ With useUnknownInCatchVariables: true — err is unknown
async function fetchData(url: string) {
  try {
    const res = await fetch(url)
    return await res.json()
  } catch (err) {
    console.error(err.message)   // TS error: err is 'unknown' ✅
    // But also: what if fetch threw a string? Or a non-Error object?
  }
}

// ✅ Proper error handling
async function fetchData2(url: string) {
  try {
    const res = await fetch(url)
    return await res.json()
  } catch (err: unknown) {
    if (err instanceof Error) {
      console.error(`Fetch failed: ${err.message}`)
    } else {
      console.error(`Fetch failed: ${String(err)}`)
    }
    throw err   // rethrow so callers know it failed
  }
}
```

---

## K — Coding Challenge + Solution

### Challenge

Write `safeAsync<T>(fn: () => Promise<T>): Promise<[T, null] | [null, Error]>` that handles `useUnknownInCatchVariables`. Then write `validateExternal<T>(data: unknown, schema: z.ZodType<T>): T` with detailed error reporting.

### Solution

```typescript
import { z } from 'zod'

// Go-style error handling for async with unknown error type
async function safeAsync<T>(
  fn: () => Promise<T>
): Promise<[T, null] | [null, Error]> {
  try {
    const result = await fn()
    return [result, null]
  } catch (err: unknown) {
    if (err instanceof Error) return [null, err]
    if (typeof err === 'string') return [null, new Error(err)]
    return [null, new Error(`Unknown error: ${String(err)}`)]
  }
}

// Usage
const [user, error] = await safeAsync(() => fetchUser(1))
if (error) {
  console.error(error.message)   // Error type guaranteed ✅
} else {
  console.log(user.name)         // T type guaranteed ✅
}

// Validate external data with detailed reporting
function validateExternal<T>(
  data:    unknown,
  schema:  z.ZodType<T>,
  context: string = 'data'
): T {
  const result = schema.safeParse(data)
  if (result.success) return result.data
  const issues = result.error.errors
    .map(e => `  ${e.path.join('.') || 'root'}: ${e.message}`)
    .join('\n')
  throw new TypeError(`Invalid ${context}:\n${issues}`)
}

// Usage
const PostSchema = z.object({ id: z.number(), title: z.string(), body: z.string() })
const raw: unknown = await fetch('/api/post/1').then(r => r.json())
const post = validateExternal(raw, PostSchema, 'post response')
// post is typed as { id: number; title: string; body: string } ✅
```

---

## ✅ Day 9 Complete — TypeScript Narrowing, Declarations & Advanced Patterns

| # | Subtopic | Status |
|---|----------|--------|
| 1 | Narrowing — typeof, instanceof, in, equality, truthiness | ☐ |
| 2 | Discriminated Unions + Exhaustiveness with never | ☐ |
| 3 | User-defined Type Guards + Assertion Functions | ☐ |
| 4 | satisfies + Type Assertions + Double-casting | ☐ |
| 5 | @ts-expect-error, @ts-ignore, Non-null Assertion | ☐ |
| 6 | Ambient Declarations — declare, declare global | ☐ |
| 7 | Abstract Classes + Branded Types | ☐ |
| 8 | Enums vs const Objects | ☐ |
| 9 | Declaration Merging, Module Augmentation, @types, .d.ts | ☐ |
| 10 | Variance + useUnknownInCatchVariables + Unknown External Data | ☐ |

---

## 🗺️ One-Page Mental Model — Day 9

```
NARROWING (control flow analysis)
  typeof x === 'string'     → string in that branch
  x instanceof Error        → Error (and subclasses) in that branch
  'prop' in obj             → object has 'prop' in that branch
  x === null / x == null    → null/undefined branch
  if (x) { }                → non-falsy — ⚠️ misses 0, '', false
  assignment: x = 1         → x is number after that line
  TypeScript tracks ALL branches simultaneously through functions

DISCRIMINATED UNIONS
  Common literal field (type/kind/status) identifies each union member
  switch(shape.type) { case 'circle': shape.radius ✅ }
  assertNever in default → compile error if case missing (exhaustiveness)
  assertNever: (x: never): never → throw new Error(...)
  Without literal discriminant → TypeScript can't narrow (use 'in' instead)

TYPE GUARDS + ASSERTION FUNCTIONS
  (v: unknown): v is T → returns boolean, narrows inside if block
  (v: unknown): asserts v is T → throws on failure, narrows after call
  Use guards for: Array.filter(notNull), conditional branching
  Use assertions for: init, tests, pre-conditions (fail loudly)
  isArrayOf<T>(arr, guard) → arr is T[] ✅ generic guard builder

satisfies + ASSERTIONS
  satisfies Type → validates shape WITHOUT widening the type (best of both)
  as const satisfies T → literal types + validation ✅
  as T → compile-time override, NO runtime effect
  as unknown as T → bypasses all checks (red flag, justify with comment)
  Legitimate as: DOM elements, test mocks, after manual validation

DIRECTIVES
  @ts-ignore       → suppress next line, no feedback if error disappears
  @ts-expect-error → suppress + error if NO error found (prefer this)
  @ts-nocheck      → disable whole file (generated files only)
  !                → non-null assertion: T | null → T (no runtime check)
  Prefer: actual null handling over ! everywhere

AMBIENT DECLARATIONS
  declare const/fn/class → "this exists at runtime, here's its type"
  declare module 'pkg' { } → type an untyped package
  declare module '*.svg' { } → asset imports
  declare global { } → extend Window, NodeJS.ProcessEnv, etc.
  export {} required in .d.ts files to make them modules

ABSTRACT CLASSES + BRANDED TYPES
  abstract class: partial impl + abstract methods subclass must fill
  Cannot instantiate abstract class directly
  Use: template method, shared logic, repository/service base classes
  Branded: type UserId = number & { __brand: 'UserId' }
  Brand constructor: (n: number): UserId => n as UserId
  Prevents: wrong ID passed to wrong function (compile error) ✅
  Zod: z.number().brand('UserId') → validates + brands in one step

ENUMS vs CONST OBJECTS
  Enum: generates runtime JS, numeric accepts any number ❌, reverse map
  const enum: inlined, breaks with isolatedModules/Vite/esbuild ⚠️
  const object + type: no runtime, tree-shakeable, literal union only ✅
  type MyType = typeof OBJ[keyof typeof OBJ] → derive union ✅
  Prefer const objects for all new code

DECLARATION MERGING + MODULE AUGMENTATION
  Interface merging: same name = combined interface
  Module augmentation: import 'module'; declare module 'module' { }
  @types/xxx: community types for JS libraries (install as devDep)
  .d.ts: pure types, no runtime | tsc --declaration generates them
  typeRoots/types in tsconfig controls which @types are included

VARIANCE
  Covariant (out): same direction — return types, read-only
  Contravariant (in): opposite direction — function parameters
  Invariant (in out): read + write — mutable containers
  Annotations: interface Ref<out T> / <in T> / <in out T> (TS 4.7+)

useUnknownInCatchVariables + EXTERNAL DATA
  catch (err: unknown) → must narrow before use (instanceof Error first)
  toErrorMessage(err: unknown): string → reusable error extraction
  ALL external data = unknown: API responses, localStorage, env vars, files
  Workflow: unknown → narrow/validate → typed → use
  Zod: safeParse for non-throwing, parse for throwing validation
  Never: JSON.parse(raw) as User → validates nothing, lies to compiler
```

> **Your next action:** Open any TypeScript file, add a `try/catch`, and see if `err` is typed as `any` or `unknown`. If `any`, add `useUnknownInCatchVariables: true` to your tsconfig — then fix the errors. Five minutes of real narrowing beats re-reading this.

> "Doing one small thing beats opening a feed."
