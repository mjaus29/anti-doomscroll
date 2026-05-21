# 8 — Enums vs const Objects

---

## T — TL;DR

TypeScript `enum` generates runtime code and has footguns (numeric enums, reverse mapping). **`const` objects with `as const`** are plain JavaScript, tree-shakeable, and generate a union type via `typeof OBJ[keyof typeof OBJ]`. Prefer `const` objects — they're more predictable, debuggable, and don't surprise you at runtime.

---

## K — Key Concepts

```typescript
// ── Enums — the footguns ──────────────────────────────────────────────────
enum Direction { Up, Down, Left, Right }
// Compiles to runtime JS — not erased like types:
// var Direction; Direction[Direction["Up"]=0]="Up"; ...

Direction.Up          // 0 (numeric)
Direction[0]          // "Up" (reverse mapping — surprising)
Direction.Up === 0    // true (can compare to numbers — unsafe)

// ❌ Numeric enums accept any number
function move(d: Direction) {}
move(Direction.Up)   // ✅
move(42)             // ✅ ← TypeScript accepts ANY number for numeric enum ❌

// String enums are safer but still compile to runtime code
enum Status { Active = 'ACTIVE', Inactive = 'INACTIVE' }
Status.Active        // 'ACTIVE'
// Still generates: var Status = { Active: 'ACTIVE', ACTIVE: 'Active', ... }
// (no reverse map for string enums, but still runtime code)
```

```typescript
// ── const objects — the preferred approach ────────────────────────────────
const Direction = {
  Up:    'UP',
  Down:  'DOWN',
  Left:  'LEFT',
  Right: 'RIGHT',
} as const

type Direction = typeof Direction[keyof typeof Direction]
// 'UP' | 'DOWN' | 'LEFT' | 'RIGHT' — exact literal union ✅

function move(d: Direction) {}
move(Direction.Up)   // ✅
move('UP')           // ✅ (string literal assignable to union)
move(42)             // TS error ✅ — only accepts the literal union
move('DIAGONAL')     // TS error ✅

// Derive key type too
type DirectionKey = keyof typeof Direction
// 'Up' | 'Down' | 'Left' | 'Right'
```

```typescript
// ── const enum — inlined at compile time ─────────────────────────────────
const enum FileFlag { Read = 1, Write = 2, Execute = 4 }
// TypeScript INLINES the values — no runtime object created
const flag = FileFlag.Read   // becomes: const flag = 1 (no FileFlag object)

// ⚠️ const enum limitations:
// - Doesn't work with isolatedModules (Vite, esbuild, Babel)
// - Can't be used in separate .d.ts files for libraries
// - Avoid in library code — consumers must also compile with TypeScript

// ── When to use enum ──────────────────────────────────────────────────────
// ✅ Only use enums when:
// - Working in a codebase that already uses them consistently
// - Need bit flags (const enum with numeric values)
// - Need the runtime object for iteration (string enum)
// Otherwise: const object + type alias
```

```typescript
// ── Comparison ────────────────────────────────────────────────────────────
/*
                   Enum         const object + type
Runtime code       ✅ yes        ❌ no (erased)
Tree-shakeable     ❌ no         ✅ yes
Numeric pitfall    ❌ accepts any ✅ literal only
Reverse mapping    ❌ numeric    ✅ n/a
isolatedModules    ⚠️ const enum ✅ fine
Iteration          ✅ Object.values(MyEnum) ✅ Object.values(CONST)
Debug clarity      ❌ 0, 1, 2   ✅ 'UP', 'DOWN'
Library safe       ⚠️ const enum ✅ yes
*/
```

---

## W — Why It Matters

- Numeric enums accepting any number is a real safety hole — `move(42)` compiles without error. A `const` object with string values + derived union only accepts the exact literals.
- `enum` compiles to runtime JavaScript — it can't be tree-shaken. In a large app with many enums, this adds bundle weight for code that's semantically just constants.
- With `isolatedModules: true` (required for Vite and esbuild), `const enum` is forbidden. Most modern TypeScript projects use a bundler that requires `isolatedModules`, making `const enum` unusable.

---

## I — Interview Q&A

### Q: Why do many TypeScript style guides recommend `const` objects over `enum`?

**A:** Several reasons: (1) **Numeric enum safety hole** — `enum Direction { Up }` means `Direction.Up === 0`, and TypeScript accepts any number where `Direction` is expected. (2) **Runtime output** — enums generate JavaScript code, unlike types which are erased. This affects bundle size and tree-shaking. (3) **`const enum` breaks with isolatedModules** — the common transpiler setting used with Vite, esbuild, and Babel forbids `const enum`. (4) **`const` objects are debuggable** — `'ACTIVE'` in logs vs `1` in logs. (5) **String literal unions are as precise** — `'UP' | 'DOWN'` provides the same safety as a string enum. The only case for enum: you specifically need the runtime object and string enum pitfalls are acceptable.

---

## C — Common Pitfalls + Fix

### ❌ Numeric enum accepts any number

```typescript
// ❌ Numeric enum is practically just 'number' for type checking
enum Priority { Low = 1, Medium = 2, High = 3 }
function createTask(title: string, priority: Priority) { }
createTask('Fix bug', Priority.High)  // ✅
createTask('Fix bug', 999)            // ✅ ← TypeScript should catch this! ❌

// ✅ const object with literal union
const Priority = { Low: 1, Medium: 2, High: 3 } as const
type Priority = typeof Priority[keyof typeof Priority]   // 1 | 2 | 3
function createTask2(title: string, priority: Priority) { }
createTask2('Fix bug', Priority.High)   // ✅
createTask2('Fix bug', 999)             // TS error: 999 not assignable to 1|2|3 ✅
```

---

## K — Coding Challenge + Solution

### Challenge

Convert an HTTP status enum to a `const` object pattern. Derive the status code type and a `StatusName` type. Write `getStatusMessage(code: StatusCode): string` with exhaustive handling.

### Solution

```typescript
const HTTP_STATUS = {
  OK:                  200,
  CREATED:             201,
  NO_CONTENT:          204,
  BAD_REQUEST:         400,
  UNAUTHORIZED:        401,
  FORBIDDEN:           403,
  NOT_FOUND:           404,
  UNPROCESSABLE:       422,
  INTERNAL_ERROR:      500,
} as const

type StatusCode = typeof HTTP_STATUS[keyof typeof HTTP_STATUS]
// 200 | 201 | 204 | 400 | 401 | 403 | 404 | 422 | 500

type StatusName = keyof typeof HTTP_STATUS
// 'OK' | 'CREATED' | 'NO_CONTENT' | ...

const STATUS_MESSAGES: Record<StatusCode, string> = {
  200: 'OK',
  201: 'Created',
  204: 'No Content',
  400: 'Bad Request',
  401: 'Unauthorized',
  403: 'Forbidden',
  404: 'Not Found',
  422: 'Unprocessable Entity',
  500: 'Internal Server Error',
}

function getStatusMessage(code: StatusCode): string {
  return STATUS_MESSAGES[code]   // Record ensures all codes handled ✅
}

getStatusMessage(HTTP_STATUS.OK)    // 'OK' ✅
getStatusMessage(200)               // 'OK' ✅
getStatusMessage(999 as StatusCode) // TS error ✅
```

---

---
