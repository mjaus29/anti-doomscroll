
# 📅 Day 7 — TypeScript Foundations & Project Setup

> **Goal:** Understand why TypeScript exists, configure a project correctly, use the type system confidently, and set up linting and formatting.
> **Format:** Each subtopic = 5–15 min. Do one. Stop. Come back.
> **Stack:** TypeScript 6.0 · Node.js 22 · ESM-first

---

## 📋 Day 7 Subtopic Overview

| # | Subtopic | Time |
|---|----------|------|
| 1 | TypeScript Purpose — Static Checking, Editor Tooling, Gradual Adoption | 8 min |
| 2 | tsc and tsconfig.json — Core Compiler Options | 12 min |
| 3 | Strict Mode Options — all the noImplicit/strict flags | 10 min |
| 4 | Primitive Types, any, unknown, never, void, object | 12 min |
| 5 | Annotations and Inference, Promise\<T\> | 10 min |
| 6 | Type Alias vs Interface, Unions, Intersections | 12 min |
| 7 | Optional/Readonly Properties, Literal Types, const assertions | 10 min |
| 8 | keyof, typeof in Type Position, Tuples | 12 min |
| 9 | ts-node, tsx, and Running TypeScript Directly | 8 min |
| 10 | ESLint, @typescript-eslint, Prettier | 10 min |

---

---

# 1 — TypeScript Purpose — Static Checking, Editor Tooling, Gradual Adoption

---

## T — TL;DR

TypeScript adds a **static type system** on top of JavaScript. It catches type errors at compile time (before your code runs), provides world-class IDE autocomplete and refactoring, and compiles to plain JavaScript. It's a superset — all valid JavaScript is valid TypeScript, enabling gradual adoption.

---

## K — Key Concepts

```typescript
// ── What TypeScript catches that JavaScript doesn't ────────────────────────
// JavaScript — error only at runtime
function greet(user) {
  return user.naem.toUpperCase()   // typo: 'naem' — crashes at runtime ❌
}

// TypeScript — error at compile time, before shipping
function greet(user: { name: string }) {
  return user.naem.toUpperCase()
  //          ^^^^
  // TS2551: Property 'naem' does not exist. Did you mean 'name'? ✅
}
```

```typescript
// ── Compile-time safety examples ───────────────────────────────────────────
// Calling with wrong argument type
function add(a: number, b: number) { return a + b }
add('1', 2)
// TS2345: Argument of type 'string' is not assignable to parameter of type 'number'

// Missing required argument
add(1)
// TS2554: Expected 2 arguments, but got 1

// Non-existent property on object
const user = { name: 'Mark', age: 28 }
console.log(user.email)
// TS2339: Property 'email' does not exist on type '{ name: string; age: number }'

// All of these would be silent at runtime in JavaScript (returning undefined)
```

```typescript
// ── Editor tooling — the daily value ──────────────────────────────────────
// IntelliSense: autocomplete knows the shape of every object
// Refactoring: rename a type → all usages updated automatically
// Go to definition: jump to the type of any variable instantly
// Inline docs: hover shows JSDoc + type signature in editor
// Error highlighting: red underlines before you save, let alone run

// ── TypeScript as a superset of JavaScript ────────────────────────────────
// .js → .ts: rename the file. That's it for step 1.
// Gradual adoption: start with allowJs: true + checkJs: false
// Add types incrementally to the files you change most
// Use // @ts-check in .js files for lightweight checking without full TS

// @ts-check (JSDoc-based type checking — no compilation needed)
/**
 * @param {number} x
 * @param {number} y
 * @returns {number}
 */
function multiply(x, y) {
  return x * y  // checked by TypeScript Language Server ✅
}
```

```
── TypeScript's value proposition ────────────────────────────────────────────

Without TypeScript:
  - Bugs found in production
  - Autocomplete guesses from variable names
  - Refactoring requires grep + manual verification
  - Onboarding requires reading source or docs

With TypeScript:
  - Bugs found in editor before commit
  - Autocomplete knows every field of every object
  - Rename symbol safely refactors all usages
  - Types are living documentation that never goes stale
```

---

## W — Why It Matters

- TypeScript is the de facto standard for production JavaScript in 2025 — React, Next.js, Prisma, tRPC, Zod all ship with first-class TypeScript support and expect typed consumers.
- The ROI is asymmetric — TypeScript setup takes ~30 minutes; it catches bugs that would take hours to debug in production. At scale (team, months, codebase growth) the advantage compounds.
- Gradual adoption removes the "all or nothing" barrier — you can add TypeScript to a file-by-file basis, turning on strict checks progressively.

---

## I — Interview Q&A

### Q: What does TypeScript add over JavaScript, and what does it not change?

**A:** TypeScript adds: (1) a static type system — types are checked at compile time before the code runs, (2) type annotations and inference — explicit or inferred types on variables, parameters, and return values, (3) language features that compile down — enums, decorators, namespace. TypeScript does NOT change JavaScript runtime behaviour — it compiles to plain JavaScript, all types are erased. `tsc` output runs in any JavaScript environment. TypeScript can't catch runtime errors (incorrect API responses, `JSON.parse` results) unless you validate them explicitly (e.g., with Zod).

---

## C — Common Pitfalls + Fix

### ❌ Thinking TypeScript prevents all runtime errors

```typescript
// TypeScript checks compile-time types — it can't verify runtime data
async function getUser(id: number): Promise<{ name: string }> {
  const res  = await fetch(`/api/users/${id}`)
  return res.json()   // TS trusts this return type — but API could return anything ❌
}

// ✅ Validate runtime data with Zod (Day 15) or type guards
import { z } from 'zod'
const UserSchema = z.object({ name: z.string() })
async function getUserSafe(id: number) {
  const res  = await fetch(`/api/users/${id}`)
  const data = await res.json()
  return UserSchema.parse(data)   // runtime validation + TS type ✅
}
```

---

## K — Coding Challenge + Solution

### Challenge

Take a plain JavaScript function and convert it to TypeScript: `function formatCurrency(amount, currency, locale)`. Add types, show the editor benefit, and demonstrate a compile-time error.

### Solution

```typescript
// Before: plain JS — no safety
function formatCurrency(amount, currency, locale) {
  return new Intl.NumberFormat(locale, { style: 'currency', currency }).format(amount)
}

// After: TypeScript — safe
function formatCurrency(
  amount:   number,
  currency: string,
  locale:   string = 'en-US'
): string {
  return new Intl.NumberFormat(locale, { style: 'currency', currency }).format(amount)
}

formatCurrency(9.99, 'USD')             // ✅ '$ 9.99'
formatCurrency('9.99', 'USD')           // ❌ TS2345: string not assignable to number
formatCurrency(9.99, 'USD', 'en-US', 'extra')  // ❌ TS2554: Expected 2-3 args, got 4
```

---

---

# 2 — tsc and tsconfig.json — Core Compiler Options

---

## T — TL;DR

`tsc` is the TypeScript compiler. `tsconfig.json` configures it. Key settings: `strict` (enables all safety checks), `target` (output JS version), `module`/`moduleResolution` (import system), `paths`/`baseUrl` (path aliases), `noEmit` (type-check only). A well-configured `tsconfig.json` is the foundation of every TypeScript project.

---

## K — Key Concepts

```json
// tsconfig.json — production-ready Node.js 22 + ESM config
{
  "compilerOptions": {
    // ── Output ──────────────────────────────────────────────────────────
    "target":  "ES2022",        // compile to ES2022 JS (Node 22 supports it natively)
    "module":  "NodeNext",      // ESM with CommonJS interop for Node.js
    "outDir":  "./dist",        // compiled output folder
    "rootDir": "./src",         // source root

    // ── Module resolution ────────────────────────────────────────────────
    "moduleResolution":   "NodeNext",  // matches "module": "NodeNext"
    "esModuleInterop":    true,        // import express from 'express' (default import CJS)
    "allowSyntheticDefaultImports": true,  // implied by esModuleInterop

    // ── Strictness ───────────────────────────────────────────────────────
    "strict": true,            // enables all strict checks (see Subtopic 3)
    "noImplicitReturns": true, // functions must return on all paths
    "noFallthroughCasesInSwitch": true,  // no fall-through in switch
    "noUncheckedIndexedAccess": true,    // arr[0] is T | undefined, not T
    "useUnknownInCatchVariables": true,  // catch (e: unknown) not any

    // ── Emit ─────────────────────────────────────────────────────────────
    "noEmit": false,           // set true for type-check-only (e.g., with bundler)
    "noEmitOnError": true,     // don't emit if type errors exist
    "declaration": true,       // generate .d.ts files (for libraries)
    "sourceMap": true,         // .js.map for debugging

    // ── Code quality ──────────────────────────────────────────────────────
    "skipLibCheck": true,      // don't type-check .d.ts in node_modules (faster)
    "forceConsistentCasingInFileNames": true,  // prevents case-sensitivity bugs
    "verbatimModuleSyntax": true,  // enforce import type for type-only imports
    "isolatedModules": true,   // required for Babel/esbuild/Vite transpilation

    // ── Path aliases ──────────────────────────────────────────────────────
    "baseUrl": ".",
    "paths": {
      "@/*": ["src/*"]         // import { x } from '@/utils' → src/utils
    }
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist"]
}
```

```bash
# ── CLI usage ──────────────────────────────────────────────────────────────
tsc                     # compile using tsconfig.json in current directory
tsc --noEmit            # type-check only — no output files
tsc --watch             # watch mode — recompile on change
tsc --project ./tsconfig.build.json   # use a specific config

# Check TypeScript version
tsc --version           # Version 6.0.x
npx tsc --version       # via npx

# Install
npm install --save-dev typescript @types/node
```

```json
// ── Multiple tsconfig files — common pattern ──────────────────────────────
// tsconfig.json — base (shared settings)
{
  "compilerOptions": { "strict": true, "target": "ES2022" }
}

// tsconfig.build.json — production build
{
  "extends": "./tsconfig.json",
  "compilerOptions": { "noEmit": false, "outDir": "dist" },
  "exclude": ["**/*.test.ts", "**/*.spec.ts"]
}

// tsconfig.test.json — test environment
{
  "extends": "./tsconfig.json",
  "compilerOptions": { "types": ["vitest/globals"] }
}
```

```typescript
// ── moduleResolution: "NodeNext" vs "Bundler" ─────────────────────────────
// NodeNext: requires explicit .js extensions in imports (matches Node.js ESM)
import { helper } from './utils.js'   // ← .js required with NodeNext ✅

// Bundler (for Vite/webpack projects): no extension needed
import { helper } from './utils'      // ← bundler resolves it ✅

// esModuleInterop: true enables:
import express from 'express'   // ✅ (without it: import * as express from 'express')
import fs      from 'fs'        // ✅ default import from CJS module

// verbatimModuleSyntax: true enforces:
import type { User } from './types.js'   // ✅ type-only import
import { User } from './types.js'        // ❌ if User is only a type — must use import type
```

---

## W — Why It Matters

- `"strict": true` is the single most important option — it enables all the checks that make TypeScript actually safe. Most guides skip this or leave it false, then wonder why bugs still happen.
- `moduleResolution: "NodeNext"` with `"module": "NodeNext"` is the correct pairing for Node.js 22 ESM projects — mismatching these is responsible for 80% of "module not found" TypeScript errors in new projects.
- `noUncheckedIndexedAccess` closes a real safety hole — without it, `arr[0]` is typed as `T`, but the array might be empty. With it, `arr[0]` is `T | undefined`, forcing you to check.

---

## I — Interview Q&A

### Q: What does `"strict": true` enable and why should you always use it?

**A:** `strict: true` enables a group of strictness checks: `strictNullChecks` (null/undefined not assignable to other types), `noImplicitAny` (variables must have a type), `strictFunctionTypes` (function parameter types checked contravariantly), `strictPropertyInitialization` (class properties must be assigned in constructor), `strictBindCallApply` (call/apply/bind are type-checked), `strictBuiltinIteratorReturn`, and `noImplicitThis`. Without `strict`, TypeScript is significantly less safe — `any` sneaks in everywhere, null dereference bugs survive type checking. Use `strict: true` from day one; adding it to an existing project is painful.

---

## C — Common Pitfalls + Fix

### ❌ `moduleResolution` and `module` mismatch

```json
// ❌ Mismatch — causes resolution errors for .js imports, ESM packages
{
  "compilerOptions": {
    "module": "NodeNext",
    "moduleResolution": "node"   // ❌ wrong — "node" is for CJS
  }
}

// ✅ Always pair them correctly
// Node.js ESM project:
{ "module": "NodeNext", "moduleResolution": "NodeNext" }

// Browser/bundler project:
{ "module": "ESNext",   "moduleResolution": "Bundler"  }

// Legacy Node.js CJS:
{ "module": "CommonJS", "moduleResolution": "node"     }
```

---

## K — Coding Challenge + Solution

### Challenge

Create a minimal `tsconfig.json` for a Next.js 16 project (uses Bundler resolution, React JSX, path alias `@/` → `src/`). Then create one for a Node.js 22 API server (NodeNext, strict, outputs to `dist/`).

### Solution

```json
// tsconfig.json — Next.js 16 project
{
  "compilerOptions": {
    "target":               "ES2022",
    "lib":                  ["dom", "dom.iterable", "ES2022"],
    "module":               "ESNext",
    "moduleResolution":     "Bundler",
    "jsx":                  "preserve",
    "strict":               true,
    "noEmit":               true,
    "esModuleInterop":      true,
    "allowJs":              true,
    "skipLibCheck":         true,
    "verbatimModuleSyntax": true,
    "noUncheckedIndexedAccess": true,
    "baseUrl":              ".",
    "paths": { "@/*": ["./src/*"] }
  },
  "include": ["next-env.d.ts", "**/*.ts", "**/*.tsx"],
  "exclude": ["node_modules"]
}
```

```json
// tsconfig.json — Node.js 22 API server
{
  "compilerOptions": {
    "target":               "ES2022",
    "module":               "NodeNext",
    "moduleResolution":     "NodeNext",
    "outDir":               "./dist",
    "rootDir":              "./src",
    "strict":               true,
    "noEmit":               false,
    "noEmitOnError":        true,
    "noImplicitReturns":    true,
    "noUncheckedIndexedAccess": true,
    "useUnknownInCatchVariables": true,
    "noFallthroughCasesInSwitch": true,
    "forceConsistentCasingInFileNames": true,
    "esModuleInterop":      true,
    "skipLibCheck":         true,
    "declaration":          true,
    "sourceMap":            true
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist", "**/*.test.ts"]
}
```

---

---

# 3 — Strict Mode Options

---

## T — TL;DR

`"strict": true` is an umbrella for multiple flags. Know each one individually — `strictNullChecks` prevents null crashes, `noImplicitAny` bans untyped variables, `noUncheckedIndexedAccess` makes array access safe, `useUnknownInCatchVariables` makes caught errors `unknown` not `any`. Each flag has a specific bug class it prevents.

---

## K — Key Concepts

```typescript
// ── strictNullChecks ──────────────────────────────────────────────────────
// OFF: null and undefined are assignable to every type — silent runtime crashes
// ON:  null and undefined are their own types — must be handled explicitly

// Without strictNullChecks (dangerous)
let name: string = null   // ❌ allowed without flag — crashes at .toUpperCase()

// With strictNullChecks: true
let name: string = null   // TS2322: Type 'null' is not assignable to type 'string'
let name2: string | null = null   // ✅ explicit — must handle null before using

function getUser(id: number): User | null { ... }
const user = getUser(1)
user.name    // TS2531: Object is possibly 'null' ✅ caught!
user?.name   // ✅ optional chaining
if (user) user.name  // ✅ narrowed

// ── noImplicitAny ─────────────────────────────────────────────────────────
function process(data) {         // TS7006: Parameter 'data' has implicit 'any' ✅
  return data.whatever           // any propagates silently without flag
}
function process2(data: unknown) {}  // ✅ explicit unknown, must narrow before use
```

```typescript
// ── strictFunctionTypes ────────────────────────────────────────────────────
// Checks function parameter types contravariantly (stricter subtype rules)
type Handler = (event: MouseEvent) => void
const h: Handler = (e: Event) => {}    // ✅ Event is supertype — contravariant OK
const h2: Handler = (e: KeyboardEvent) => {}  // ❌ KeyboardEvent is subtype — unsafe

// ── strictPropertyInitialization ─────────────────────────────────────────
class User {
  name: string       // TS2564: not definitely assigned in constructor ❌
  constructor() {}   // name might be undefined at runtime
}
class User2 {
  name: string
  constructor() { this.name = 'default' }   // ✅
  // OR: name = 'default'  ✅ (class field)
  // OR: name!: string  (definite assignment assertion — use sparingly)
}

// ── noImplicitReturns ─────────────────────────────────────────────────────
function getLabel(status: string): string {
  if (status === 'active') return 'Active'
  if (status === 'inactive') return 'Inactive'
  // TS2366: Function lacks ending return statement ✅ — caught missing branch
}
function getLabel2(status: string): string {
  if (status === 'active') return 'Active'
  if (status === 'inactive') return 'Inactive'
  return 'Unknown'   // ✅ all paths return
}
```

```typescript
// ── noUncheckedIndexedAccess ──────────────────────────────────────────────
const arr = [1, 2, 3]
const first = arr[0]   // type: number | undefined (not just number) ✅
first.toFixed(2)        // TS2532: Object is possibly 'undefined' ✅

// Handle it:
if (first !== undefined) first.toFixed(2)   // ✅
const safe = first ?? 0                     // ✅

const record: Record<string, number> = {}
const val = record['key']   // number | undefined ✅ (not just number)

// ── useUnknownInCatchVariables ────────────────────────────────────────────
try {
  throw new Error('oops')
} catch (err) {
  // Without flag: err is 'any' — you can do anything with it (unsafe)
  // With flag:    err is 'unknown' — must check type first
  console.log(err.message)   // TS2571: Object is of type 'unknown' ✅
}

// ✅ Handle correctly
try {
  throw new Error('oops')
} catch (err) {
  if (err instanceof Error) console.log(err.message)   // ✅ narrowed
  else console.log(String(err))
}

// ── noFallthroughCasesInSwitch ────────────────────────────────────────────
function handle(status: 'a' | 'b' | 'c') {
  switch (status) {
    case 'a': console.log('a')   // TS7029: Fallthrough case in switch ✅
    case 'b': console.log('b'); break
    case 'c': console.log('c'); break
  }
}
```

---

## W — Why It Matters

- `strictNullChecks` is the most impactful flag — without it, TypeScript doesn't catch null/undefined dereferences, which are the most common JavaScript runtime error (`Cannot read property 'x' of null/undefined`).
- `noUncheckedIndexedAccess` changes how you think about arrays — `arr[0]` returning `T | undefined` instead of `T` catches out-of-bounds access that would crash at runtime. In real code this forces consistent null-checking patterns.
- `useUnknownInCatchVariables` is critical for good error handling — when `err` was `any`, you could write `err.message` and TypeScript wouldn't complain even if the throw value wasn't an Error. With `unknown`, you're forced to check.

---

## I — Interview Q&A

### Q: What is the difference between `noImplicitAny` and `unknown`?

**A:** `noImplicitAny` is a compiler flag — it prevents variables and parameters from implicitly getting the `any` type when TypeScript can't infer a type. Without it, an untyped parameter silently becomes `any` and all type safety is lost. With it, you must explicitly annotate. `unknown` is a type — the type-safe alternative to `any`. A value of type `unknown` can hold anything (like `any`) but you cannot use it without first narrowing its type through `typeof`, `instanceof`, or a type guard. `noImplicitAny` prevents accidental `any`; `unknown` is what you use when you intentionally want to accept any value but safely.

---

## C — Common Pitfalls + Fix

### ❌ Using `!` (non-null assertion) to silence strictNullChecks everywhere

```typescript
// ❌ Non-null assertion operator tells TS "trust me, it's not null"
// This suppresses the error without fixing the underlying issue
const user = getUser(id)!        // ❌ crashes if getUser returns null
user.name                        // runtime crash if user is null

// ❌ Common crutch — scattered ! throughout codebase
document.getElementById('app')!.innerHTML = 'hello'  // crashes if element missing

// ✅ Actually handle the null case
const user = getUser(id)
if (!user) throw new NotFoundError('User', id)
user.name   // ✅ narrowed to User

const el = document.getElementById('app')
if (!el) throw new Error('App element not found')
el.innerHTML = 'hello'   // ✅
```

---

## K — Coding Challenge + Solution

### Challenge

Write a function `safeGet<T>(arr: T[], index: number): T | undefined` that works correctly with `noUncheckedIndexedAccess`. Then write a `safeCatch(fn)` wrapper that handles `useUnknownInCatchVariables` correctly.

### Solution

```typescript
// noUncheckedIndexedAccess-safe array access
function safeGet<T>(arr: T[], index: number): T | undefined {
  return arr[index]   // T | undefined — explicit return type enforces contract
}

function getFirst<T>(arr: T[], fallback: T): T {
  return safeGet(arr, 0) ?? fallback
}

getFirst([1, 2, 3], 0)   // 1
getFirst([], 0)           // 0 (fallback)

// useUnknownInCatchVariables-safe error extraction
function toError(err: unknown): Error {
  if (err instanceof Error) return err
  if (typeof err === 'string') return new Error(err)
  return new Error(String(err))
}

async function safeCatch<T>(fn: () => Promise<T>): Promise<[T, null] | [null, Error]> {
  try {
    return [await fn(), null]
  } catch (err: unknown) {
    return [null, toError(err)]
  }
}

const [data, error] = await safeCatch(() => fetch('/api/data').then(r => r.json()))
if (error) console.error(error.message)   // error is Error type ✅
else console.log(data)
```

---

---

# 4 — Primitive Types, any, unknown, never, void, object

---

## T — TL;DR

TypeScript's type system builds on JavaScript's seven primitives and adds `any` (escape hatch — avoid), `unknown` (safe top type — prefer), `never` (impossible type — exhaustiveness), `void` (no meaningful return), and `object` (non-primitive). Know when to use each and the three types to never use: `any`, `Object` (capital), `{}`.

---

## K — Key Concepts

```typescript
// ── Primitive types ────────────────────────────────────────────────────────
let s:   string   = 'hello'
let n:   number   = 42
let b:   boolean  = true
let bi:  bigint   = 42n
let sym: symbol   = Symbol('x')
let u:   undefined = undefined
let nu:  null     = null       // requires strictNullChecks to be useful

// TypeScript adds wrapper type distinctions:
// 'string' vs 'String' — always use lowercase
const a: string = 'hello'   // ✅ primitive string
const b: String = 'hello'   // ❌ object wrapper — avoid (subtly different)
// Same rule: number not Number, boolean not Boolean
```

```typescript
// ── any — the escape hatch (avoid) ────────────────────────────────────────
let x: any = 'hello'
x = 42           // ✅ any accepts anything
x.foo.bar.baz    // ✅ TypeScript stops checking — runtime crash possible
x()              // ✅ TypeScript thinks it's callable — crash if it's not

// any is contagious — it spreads to connected expressions
function process(data: any) {
  return data.users   // type: any (TypeScript gave up)
}

// When any is acceptable: migrating JS to TS, third-party typeless libraries
// Even then: scope it tightly, don't let it propagate

// ── unknown — safe any (prefer for external/untrusted data) ───────────────
let y: unknown = 'hello'
y.toUpperCase()   // TS2571: Object is of type 'unknown' ✅ caught!

// Must narrow before using:
if (typeof y === 'string') y.toUpperCase()    // ✅
if (y instanceof Error)    y.message          // ✅
```

```typescript
// ── never — the impossible type ───────────────────────────────────────────
// A value of type 'never' can never exist
// Used for: exhaustiveness checks, unreachable code, throw functions

function assertNever(x: never): never {
  throw new Error(`Unexpected value: ${JSON.stringify(x)}`)
}

type Shape = 'circle' | 'square' | 'triangle'

function area(shape: Shape): number {
  switch (shape) {
    case 'circle':   return Math.PI
    case 'square':   return 1
    case 'triangle': return 0.5
    default: return assertNever(shape)  // TS error if a case is missing ✅
  }
}
// If you add 'rectangle' to Shape and forget the case:
// TS2345: Argument of type 'string' is not assignable to parameter of type 'never'

// never in function types — functions that never return
function throwError(msg: string): never {
  throw new Error(msg)   // never returns — typed as never ✅
}
function infinite(): never {
  while (true) {}
}
```

```typescript
// ── void — no meaningful return value ────────────────────────────────────
function log(msg: string): void {
  console.log(msg)
  // implicitly returns undefined — void signals "don't use the return value"
}
const result = log('hello')   // result: void
// void ≠ undefined — void means "caller shouldn't use this value"

// void in callback types — caller doesn't care about return value
type Callback = () => void
const cb: Callback = () => 42   // ✅ void callbacks CAN return values
// The return value is just discarded

// ── object — non-primitive type ───────────────────────────────────────────
let obj: object = { name: 'Mark' }   // ✅ any non-primitive
obj.name   // TS2339: Property 'name' does not exist on type 'object' ❌

// ❌ Avoid these — they accept everything or cause subtle bugs:
let bad1: Object = 'hello'   // Object accepts primitives (wrapping)
let bad2: {} = 42            // {} = "any non-null value" (not "empty object")

// ✅ Use specific shapes instead of 'object':
let good: { name: string } = { name: 'Mark' }
// Or: Record<string, unknown> for truly unknown object shapes
let record: Record<string, unknown> = { name: 'Mark', age: 28 }
```

---

## W — Why It Matters

- `any` disables TypeScript for that variable and everything derived from it — one `any` in a critical path can silently propagate through your entire codebase. Always prefer `unknown` and narrow.
- `never` for exhaustiveness checking is one of TypeScript's most powerful patterns — a switch on a discriminated union with a `never` default means adding a new union member requires handling the new case everywhere, enforced by the compiler.
- `void` in callback types explains why `arr.forEach(x => console.log(x))` type-checks even though `console.log` returns `void` — forEach's callback type is `() => void`, which accepts callbacks that return any value (the return is ignored).

---

## I — Interview Q&A

### Q: What is the difference between `any`, `unknown`, and `never`?

**A:** `any` is an escape hatch — assignable to and from everything, TypeScript stops checking. Use only when necessary (migration, untyped libraries). `unknown` is the safe top type — any value can be assigned to `unknown`, but you can't use it without narrowing via `typeof`/`instanceof`/type guards. Use for function parameters that accept untrusted/external data. `never` is the bottom type — no value can be assigned to `never` (except `never` itself). Used to represent impossibility: functions that always throw, `while(true)` loops, and the `default` case of exhaustive switches. If a variable has type `never`, that code is unreachable.

---

## C — Common Pitfalls + Fix

### ❌ Using `{}` as "empty object" type — accepts everything except null/undefined

```typescript
// ❌ {} means "any non-null, non-undefined value" — not "object with no properties"
function process(data: {}) {
  // data could be a string, number, array — any non-null value!
}
process('hello')   // ✅ no TS error — string matches {} ❌ surprising

// ❌ Object (capital) accepts primitives via boxing
function handle(x: Object) {}
handle(42)   // ✅ boxes to Number — rarely intended

// ✅ Use specific types
function process2(data: Record<string, unknown>) {}  // "object with any string keys"
function handle2(x: { id: number }) {}  // specific shape
```

---

## K — Coding Challenge + Solution

### Challenge

Write a `parseJSON(text: string): unknown` function, then write a type guard `isUser(value: unknown): value is User` where `User = { name: string; age: number }`. Demonstrate the exhaustive switch pattern with `never`.

### Solution

```typescript
type User = { name: string; age: number }

function parseJSON(text: string): unknown {
  try { return JSON.parse(text) }
  catch { return null }
}

function isUser(value: unknown): value is User {
  return (
    typeof value === 'object' &&
    value !== null &&
    'name' in value && typeof (value as any).name === 'string' &&
    'age'  in value && typeof (value as any).age  === 'number'
  )
}

const raw = parseJSON('{"name":"Mark","age":28}')
if (isUser(raw)) {
  console.log(raw.name.toUpperCase())   // ✅ TypeScript knows it's a User
  console.log(raw.age + 1)             // ✅
}

// Exhaustive switch with never
type Status = 'pending' | 'active' | 'suspended'
function describeStatus(s: Status): string {
  switch (s) {
    case 'pending':   return 'Awaiting activation'
    case 'active':    return 'Account active'
    case 'suspended': return 'Account suspended'
    default: {
      const _: never = s   // compile error if a case is missing ✅
      return _
    }
  }
}
```

---

---

# 5 — Annotations and Inference, Promise\<T\>

---

## T — TL;DR

TypeScript **infers** types automatically — you don't annotate everything. Annotate: function parameters (always), return types (public APIs), and variables where inference is wrong or ambiguous. `Promise<T>` types async operations. Know when to let inference work and when to guide it.

---

## K — Key Concepts

```typescript
// ── Type inference — TypeScript figures it out ────────────────────────────
let name   = 'Mark'      // inferred: string
let count  = 0           // inferred: number
let active = true        // inferred: boolean
let user   = { name: 'Mark', age: 28 }  // inferred: { name: string; age: number }

// Array inference
let nums   = [1, 2, 3]   // inferred: number[]
let mixed  = [1, 'two']  // inferred: (string | number)[]
let empty  = []           // inferred: never[] ← problem! annotate explicitly
let names: string[] = []  // ✅ explicit annotation for empty arrays

// Function return type inference
function add(a: number, b: number) {
  return a + b   // inferred return: number ✅
}
const addFn = (a: number, b: number) => a + b  // inferred: (a: number, b: number) => number
```

```typescript
// ── When to annotate explicitly ───────────────────────────────────────────
// 1. Function parameters — never inferred (required)
function greet(name: string): string { return `Hello, ${name}` }

// 2. Public API return types — explicit intent + better error messages
function createUser(name: string, email: string): User {
  return { id: Date.now(), name, email }  // TS checks this matches User
}

// 3. Empty arrays
const items: Product[] = []

// 4. Variables where widened inference is wrong
const role = 'admin'           // inferred: string (widened)
const role2: 'admin' = 'admin' // inferred: literal 'admin' (narrow — see Subtopic 7)

// 5. When inference would be 'any'
const data: unknown = JSON.parse(text)  // ✅ explicit unknown

// ── Contextual typing ────────────────────────────────────────────────────
// TypeScript uses context to infer callback types
const nums = [1, 2, 3]
nums.forEach(n => console.log(n))  // n is number — inferred from array type ✅
nums.map(n => n.toFixed(2))        // n is number, return is string ✅
```

```typescript
// ── Promise<T> ────────────────────────────────────────────────────────────
// async functions return Promise<T> where T is the return type
async function fetchUser(id: number): Promise<User> {
  const res  = await fetch(`/api/users/${id}`)
  const data = await res.json()
  return data as User   // type assertion — or validate with Zod
}

// Explicit Promise typing
function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

function fetchData(): Promise<{ items: string[]; total: number }> {
  return fetch('/api').then(r => r.json())
}

// Promise combinators with generics
async function loadAll(): Promise<[User, Post[]]> {
  return Promise.all([fetchUser(1), fetchPosts(1)])
  // TypeScript infers [User, Post[]] from the tuple ✅
}

// Promise<never> — Promise that always rejects
function failAlways(): Promise<never> {
  return Promise.reject(new Error('always fails'))
}
```

```typescript
// ── Satisfies operator (TS 4.9) ───────────────────────────────────────────
// Validates a value matches a type without widening to that type
const palette = {
  red:   [255, 0, 0],
  green: '#00ff00',
} satisfies Record<string, string | number[]>
// palette.red is still number[] (not string | number[]) — narrower inference ✅
palette.red.map(x => x / 255)   // ✅ TypeScript knows it's number[]
```

---

## W — Why It Matters

- Over-annotating is as harmful as under-annotating — `const name: string = 'Mark'` is redundant noise. TypeScript's inference is excellent for assignments and return types from inferred functions; trust it.
- Explicit return type annotations on exported/public functions are best practice — they serve as documentation, catch bugs where the function accidentally returns `undefined`, and improve IDE hover information for consumers.
- `Promise<T>` with specific `T` propagates type safety through your async chain — `await fetchUser(id)` gives you a `User`, so `.name` is type-safe. Without it, everything becomes `any`.

---

## I — Interview Q&A

### Q: When should you add type annotations and when should you rely on inference?

**A:** Rely on inference for: local variable assignments (`const x = 42`), function return types when the implementation clearly infers them, callback parameter types in array methods. Add annotations for: function parameters (never inferred — always required), public API return types (documents intent + guards against accidental type changes), empty array/object literals (`const items: User[] = []`), variables initialised to `null`/`undefined` where the type will be set later, and any `any` you need to scope with `unknown`. Rule of thumb: annotate at boundaries (function signatures, module exports), infer in implementations.

---

## C — Common Pitfalls + Fix

### ❌ `async` function inferred as `Promise<any>` when `json()` is called

```typescript
// ❌ res.json() returns Promise<any> — entire chain becomes any
async function getUser(id: number) {
  const res  = await fetch(`/api/users/${id}`)
  return res.json()   // return type: Promise<any> ❌
}
const user = await getUser(1)
user.anything   // no error — TypeScript gave up ❌

// ✅ Annotate the return type explicitly
async function getUser2(id: number): Promise<User> {
  const res  = await fetch(`/api/users/${id}`)
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  return res.json() as Promise<User>   // assertion — validate with Zod in production
}
const user2 = await getUser2(1)
user2.anything   // TS error ✅ — User doesn't have 'anything'
```

---

## K — Coding Challenge + Solution

### Challenge

Write `fetchPaginated<T>(url: string, page: number): Promise<{ data: T[]; total: number; page: number }>`. Then write `loadAllPages<T>(url: string): Promise<T[]>` that keeps fetching until all pages are loaded.

### Solution

```typescript
interface PaginatedResponse<T> {
  data:  T[]
  total: number
  page:  number
  limit: number
}

async function fetchPaginated<T>(
  url:   string,
  page:  number,
  limit: number = 20
): Promise<PaginatedResponse<T>> {
  const qs  = new URLSearchParams({ page: String(page), limit: String(limit) })
  const res = await fetch(`${url}?${qs}`)
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  return res.json() as Promise<PaginatedResponse<T>>
}

async function loadAllPages<T>(url: string, limit = 20): Promise<T[]> {
  const all: T[] = []
  let page = 1
  while (true) {
    const { data, total } = await fetchPaginated<T>(url, page, limit)
    all.push(...data)
    if (all.length >= total) break
    page++
  }
  return all
}

// Usage — T inferred from context or explicit
const users = await loadAllPages<User>('/api/users')  // User[]
```

---

---

# 6 — Type Alias vs Interface, Unions, Intersections

---

## T — TL;DR

**Type alias** (`type`) can describe any type — unions, primitives, tuples, mapped types. **Interface** (`interface`) describes object shapes and supports declaration merging. Use `interface` for objects in libraries (mergeable). Use `type` for unions, computed types, and utilities. **Union** (`|`) means "one of". **Intersection** (`&`) means "all of".

---

## K — Key Concepts

```typescript
// ── Type alias ────────────────────────────────────────────────────────────
type UserId     = number
type UserName   = string
type Nullable<T> = T | null
type Status     = 'active' | 'inactive' | 'pending'   // union
type Point      = { x: number; y: number }
type Pair<T>    = [T, T]                               // tuple
type Callback   = (err: Error | null, result: string) => void

// ── Interface ─────────────────────────────────────────────────────────────
interface User {
  id:    number
  name:  string
  email: string
}

// Interface extends — adds fields
interface AdminUser extends User {
  permissions: string[]
  level:       number
}

// Declaration merging — only interfaces can do this
interface Window {
  myPlugin: { init(): void }   // add to existing Window type ✅
}

// Type can't be merged — reopening throws: Duplicate identifier ❌
```

```typescript
// ── Union types — T1 | T2 ────────────────────────────────────────────────
type StringOrNumber = string | number
type NullableUser   = User | null
type Status         = 'pending' | 'active' | 'closed'

// Discriminated union — common pattern
type ApiResponse =
  | { status: 'success'; data: User }
  | { status: 'error';   code: number; message: string }
  | { status: 'loading' }

function handle(res: ApiResponse) {
  switch (res.status) {
    case 'success': console.log(res.data.name); break    // ✅ narrowed to success branch
    case 'error':   console.log(res.message);   break    // ✅ narrowed to error branch
    case 'loading': console.log('Loading...');  break
  }
}

// Union of interfaces
type Animal = { name: string } & (
  | { kind: 'dog'; breed: string }
  | { kind: 'cat'; indoor: boolean }
)
```

```typescript
// ── Intersection types — T1 & T2 ─────────────────────────────────────────
type WithId       = { id: number }
type WithTimestamps = { createdAt: Date; updatedAt: Date }
type BaseEntity   = WithId & WithTimestamps   // has all fields of both

type UserEntity = User & BaseEntity
// equivalent to: { id, name, email, createdAt, updatedAt }

// Intersection for mixins
type Serializable   = { toJSON(): string }
type Validatable    = { validate(): boolean }
type FormModel<T>   = T & Serializable & Validatable

// ── Type alias vs Interface decision ─────────────────────────────────────
/*
Use type alias for:
  - Union types: type Status = 'a' | 'b'
  - Mapped types: type Partial<T> = { [K in keyof T]?: T[K] }
  - Computed / conditional types
  - Tuple types: type Pair = [string, number]
  - Primitives and non-object types

Use interface for:
  - Object shapes that may be extended or merged
  - Public API contracts (extends is more expressive than &)
  - Class implements: class User implements IUser {}
  - When consumers may need to augment your types (declaration merging)

In practice: either works for most object shapes.
Default to type for new code; use interface for class contracts and public libs.
*/
```

---

## W — Why It Matters

- Discriminated unions are the TypeScript pattern for state machines, API responses, and Redux actions — the `status` (or `type`) discriminant field tells TypeScript exactly which branch you're in, providing full narrowing.
- Declaration merging with `interface` is how `@types` packages extend built-in types — `express` adds `Request.user` property by merging into Express's `Request` interface. If you're building a library, use `interface`.
- Intersections vs `extends` — `A & B` and `interface C extends A, B` produce similar types but intersections work on any type (including unions), while `extends` requires interfaces or classes.

---

## I — Interview Q&A

### Q: When would you use `type` vs `interface` in TypeScript?

**A:** They overlap for object shapes, but differ in capabilities. Use `type` when: defining unions (`type Status = 'a' | 'b'`), mapped/conditional/utility types, tuples, or when the type isn't purely an object shape. Use `interface` when: defining an object shape that classes will `implement`, when you want declaration merging (augmenting types in other files), or when building a library where consumers may extend your types. Both support `extends` (interfaces) and `&` intersections (types). The practical rule: default to `type` for application code; use `interface` for class contracts and public API surface in libraries.

---

## C — Common Pitfalls + Fix

### ❌ Intersection of conflicting types produces `never`

```typescript
// ❌ Intersection of incompatible primitives → never
type Bad = string & number   // never — no value is both string and number

// ❌ Intersection of conflicting object properties → property becomes never
type A = { id: string }
type B = { id: number }
type AB = A & B   // AB.id is string & number = never ❌

// ✅ Use union when you mean "one or the other"
type GoodId = { id: string } | { id: number }

// ✅ Use intersection only when types genuinely compose
type Timestamped = { createdAt: Date }
type Named       = { name: string }
type Entity      = Timestamped & Named   // ✅ no conflicting fields
```

---

## K — Coding Challenge + Solution

### Challenge

Model an API response as a discriminated union with three states. Write a `processResponse<T>(res: ApiResult<T>)` that handles all three. Then compose `User` with `WithTimestamps` and `WithSoftDelete` via intersection.

### Solution

```typescript
type ApiResult<T> =
  | { ok: true;  data: T }
  | { ok: false; status: number; error: string }
  | { ok: false; status: 0;      error: 'NetworkError' }

function processResponse<T>(res: ApiResult<T>): T | null {
  if (!res.ok) {
    if (res.status === 0) console.error('No network connection')
    else console.error(`HTTP ${res.status}: ${res.error}`)
    return null
  }
  return res.data   // ✅ narrowed to { ok: true; data: T }
}

// Composing entity types
interface WithTimestamps {
  createdAt: Date
  updatedAt: Date
}
interface WithSoftDelete {
  deletedAt: Date | null
}
interface User {
  id:    number
  name:  string
  email: string
}

type UserRecord = User & WithTimestamps & WithSoftDelete

const user: UserRecord = {
  id: 1, name: 'Mark', email: 'mark@ex.com',
  createdAt: new Date(), updatedAt: new Date(),
  deletedAt: null,
}
```

---

---

# 7 — Optional/Readonly Properties, Literal Types, const assertions

---

## T — TL;DR

**Optional** (`?`) properties may be absent — type is `T | undefined`. **`readonly`** prevents reassignment after creation. **Literal types** narrow a type to a specific value (`'admin'` not `string`). **`as const`** makes an entire object's values literal and `readonly`. These prevent mutation bugs and enable discriminated unions.

---

## K — Key Concepts

```typescript
// ── Optional properties ────────────────────────────────────────────────────
interface User {
  id:       number
  name:     string
  email?:   string     // optional — string | undefined
  avatar?:  string | null  // optional + nullable
}
const u: User = { id: 1, name: 'Mark' }   // ✅ email omitted
u.email?.toUpperCase()   // ✅ optional chaining needed

// Optional parameters
function greet(name: string, title?: string): string {
  return title ? `${title} ${name}` : name
}
greet('Mark')        // ✅
greet('Mark', 'Dr.') // ✅
```

```typescript
// ── readonly properties ───────────────────────────────────────────────────
interface Config {
  readonly host: string
  readonly port: number
  timeout: number   // mutable
}
const config: Config = { host: 'localhost', port: 5432, timeout: 5000 }
config.timeout = 10000  // ✅ mutable
config.host = 'other'   // TS2540: Cannot assign to 'host' — readonly ✅

// Readonly arrays
const ids: readonly number[] = [1, 2, 3]
// Same as: ReadonlyArray<number>
ids.push(4)    // TS2339: Property 'push' does not exist on readonly array ✅
ids[0] = 99   // TS2542: Index signature in readonly array ✅

// Readonly<T> utility — makes all properties readonly
type ReadonlyUser = Readonly<User>
```

```typescript
// ── Literal types ──────────────────────────────────────────────────────────
type Direction = 'up' | 'down' | 'left' | 'right'
type StatusCode = 200 | 201 | 400 | 401 | 404 | 500

function move(dir: Direction) {}
move('up')    // ✅
move('fast')  // TS2345: Argument of type '"fast"' is not assignable ✅

// Literal types in interfaces
interface SuccessResponse {
  status: 200               // only 200 is valid — literal type
  data:   unknown
}
interface ErrorResponse {
  status: 400 | 401 | 500
  error:  string
}

// Widening — string literal widens to string
let role  = 'admin'           // type: string (widened)
const role2 = 'admin'         // type: 'admin' (literal — const doesn't reassign)
let role3: 'admin' = 'admin'  // type: 'admin' (explicit literal annotation)
```

```typescript
// ── as const — const assertion ────────────────────────────────────────────
// Makes all values literal, all properties readonly, deeply

const ROLES = ['admin', 'user', 'moderator'] as const
// type: readonly ['admin', 'user', 'moderator']
ROLES[0]          // type: 'admin' (not string)
ROLES.push('x')   // TS error: push doesn't exist on readonly tuple ✅

type Role = typeof ROLES[number]  // 'admin' | 'user' | 'moderator' ✅

const CONFIG = {
  host: 'localhost',
  port: 5432,
  flags: ['debug', 'verbose'],
} as const
// All values become literal and deeply readonly
CONFIG.port         // type: 5432 (not number)
CONFIG.host         // type: 'localhost' (not string)
CONFIG.flags        // type: readonly ['debug', 'verbose']
CONFIG.port = 9999  // TS error: readonly ✅

// as const for discriminated unions
const ACTIONS = {
  INCREMENT: 'counter/increment',
  DECREMENT: 'counter/decrement',
} as const
type ActionType = typeof ACTIONS[keyof typeof ACTIONS]
// 'counter/increment' | 'counter/decrement' ✅
```

---

## W — Why It Matters

- `readonly` on objects and arrays prevents accidental mutation — React props, Redux state, and config objects should all be `readonly`. Without it, TypeScript won't catch `props.items.push(x)` which mutates props.
- `as const` on lookup objects (ROUTES, ROLES, ACTION_TYPES) derives union types automatically — you define the values once and the type system derives `'admin' | 'user' | 'moderator'` automatically. No duplication.
- Optional `?` vs `| undefined` are different — `{ name?: string }` means the key can be absent; `{ name: string | undefined }` means the key must be present but can be `undefined`. With `exactOptionalPropertyTypes` in tsconfig, TypeScript distinguishes these strictly.

---

## I — Interview Q&A

### Q: What is the difference between `as const` and `readonly`?

**A:** `readonly` is a type modifier applied to specific properties or to arrays — it prevents reassignment of that property/index. It's declared as part of a type. `as const` is a type assertion that tells TypeScript to infer the narrowest possible types: string values become string literals, number values become numeric literals, arrays become readonly tuples, and objects become deeply readonly with literal property types. `as const` is applied to a value at its creation point and affects the entire structure. `readonly` is a declaration on a type shape. Both prevent mutation but `as const` also narrows to literal types, which is essential for deriving union types from constant objects.

---

## C — Common Pitfalls + Fix

### ❌ `as const` on a variable passed to a mutable parameter

```typescript
// ❌ as const makes array readonly — can't pass to function expecting mutable
const items = ['a', 'b', 'c'] as const   // readonly ['a','b','c']

function process(arr: string[]) { arr.push('d') }
process(items)   // TS2345: readonly array not assignable to mutable string[] ❌

// ✅ Option 1: use spread to create a mutable copy
process([...items])   // ✅

// ✅ Option 2: make the parameter accept readonly
function process2(arr: readonly string[]) { /* can't mutate, that's fine */ }
process2(items)   // ✅
```

---

## K — Coding Challenge + Solution

### Challenge

Create an `HTTP_METHODS` const object, derive a `HttpMethod` type from it, and a `ROUTES` const with `path` and `method`. Write `createRoute(method: HttpMethod, path: string)` using those types.

### Solution

```typescript
const HTTP_METHODS = {
  GET:    'GET',
  POST:   'POST',
  PUT:    'PUT',
  PATCH:  'PATCH',
  DELETE: 'DELETE',
} as const

type HttpMethod = typeof HTTP_METHODS[keyof typeof HTTP_METHODS]
// 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE' ✅

interface Route {
  readonly method:  HttpMethod
  readonly path:    string
  readonly handler: string
}

const ROUTES = [
  { method: 'GET',  path: '/users',    handler: 'getUsers'  },
  { method: 'POST', path: '/users',    handler: 'createUser' },
  { method: 'GET',  path: '/users/:id',handler: 'getUserById' },
] as const satisfies readonly Route[]

function createRoute(method: HttpMethod, path: string, handler: string): Route {
  return { method, path, handler }
}

createRoute('GET',   '/posts', 'getPosts')   // ✅
createRoute('FETCH', '/posts', 'getPosts')   // TS error: 'FETCH' not HttpMethod ✅
```

---

---

# 8 — keyof, typeof in Type Position, Tuples

---

## T — TL;DR

`keyof T` produces a union of all keys of type `T`. `typeof` in type position extracts the TypeScript type of a value. Together they enable **type-safe property access**, deriving types from values, and building utilities. **Tuples** are fixed-length arrays where each position has a known type — use them for function arguments, return pairs, and coordinate data.

---

## K — Key Concepts

```typescript
// ── keyof ─────────────────────────────────────────────────────────────────
interface User {
  id:    number
  name:  string
  email: string
}

type UserKey = keyof User   // 'id' | 'name' | 'email'

// Type-safe property access
function getProperty<T, K extends keyof T>(obj: T, key: K): T[K] {
  return obj[key]   // T[K] = "the type of T's property K"
}
const user = { id: 1, name: 'Mark', email: 'm@ex.com' }
getProperty(user, 'name')   // type: string ✅
getProperty(user, 'id')     // type: number ✅
getProperty(user, 'age')    // TS error: 'age' not in keyof User ✅

// keyof with index signatures
type StringMap = Record<string, number>
type K = keyof StringMap   // string | number (number keys coerce to string in JS)

// keyof typeof — derive keys from a value
const COLORS = { red: '#ff0000', green: '#00ff00', blue: '#0000ff' } as const
type ColorName = keyof typeof COLORS   // 'red' | 'green' | 'blue'
```

```typescript
// ── typeof in type position ────────────────────────────────────────────────
// typeof extracts the TypeScript type of a VALUE

const user = { id: 1, name: 'Mark', active: true }
type UserType = typeof user   // { id: number; name: string; active: boolean }

function add(a: number, b: number) { return a + b }
type AddFn = typeof add   // (a: number, b: number) => number

// Derive type from a large config object (DRY — no separate interface)
const defaultConfig = {
  host:     'localhost',
  port:     5432,
  poolSize: 10,
  ssl:      false,
}
type Config = typeof defaultConfig   // derived from value ✅

function createConnection(config: Partial<Config>) {
  return { ...defaultConfig, ...config }
}

// ReturnType<T> — extract return type of a function
type ConnectionType = ReturnType<typeof createConnection>
// { host: string; port: number; poolSize: number; ssl: boolean }
```

```typescript
// ── Tuples ────────────────────────────────────────────────────────────────
// Fixed-length, fixed-type arrays
type Point2D     = [number, number]
type StringBool  = [string, boolean]
type GoResult<T> = [T, null] | [null, Error]   // Go-style error handling

const point: Point2D = [10, 20]
point[0]   // number ✅
point[2]   // TS error: Tuple has no element at index 2 ✅

// Named tuple elements (TS 4.0+)
type Range = [start: number, end: number, step?: number]
const r: Range = [1, 10]         // step is optional ✅
const r2: Range = [1, 10, 2]     // ✅

// Tuple destructuring
const [x, y] = point
const [result, error]: GoResult<User> = await safeGet(userId)

// Rest in tuples
type AtLeastTwo = [number, number, ...number[]]
type EndsWithString = [number, number, string]
```

```typescript
// ── Combining keyof + typeof + tuples ─────────────────────────────────────
// Extract entry tuple type from an object
const STATUS_MAP = {
  active:    1,
  inactive:  2,
  suspended: 3,
} as const
type StatusEntry = [keyof typeof STATUS_MAP, typeof STATUS_MAP[keyof typeof STATUS_MAP]]
// ['active' | 'inactive' | 'suspended', 1 | 2 | 3]

const entries = Object.entries(STATUS_MAP) as StatusEntry[]

// Utility: typed Object.keys
function typedKeys<T extends object>(obj: T): (keyof T)[] {
  return Object.keys(obj) as (keyof T)[]
}
typedKeys({ a: 1, b: 2 })   // ('a' | 'b')[] ✅
```

---

## W — Why It Matters

- `keyof T` + `T[K]` is the foundation of most TypeScript utility types — `Partial<T>`, `Pick<T, K>`, `Omit<T, K>`, `Record<K, V>` all use these internally. Understanding them means you can write your own.
- `typeof` on values prevents type drift — if `defaultConfig` changes, `Config` (derived via `typeof`) automatically updates everywhere. Separate interfaces can become stale.
- Tuples for Go-style `[result, error]` returns are a TypeScript-idiomatic alternative to throwing — they make error handling explicit at the call site without try/catch, and TypeScript ensures you destructure correctly.

---

## I — Interview Q&A

### Q: What does `T[K]` mean in TypeScript and when do you use it?

**A:** `T[K]` is an indexed access type — it produces the type of property `K` on type `T`. If `T = { name: string; age: number }` and `K = 'name'`, then `T[K]` = `string`. When `K` is `keyof T`, TypeScript ensures K is a valid key and infers the correct value type. Use it to: write generic property accessors (`function get<T, K extends keyof T>(o: T, k: K): T[K]`), build Pick/Omit utilities, derive union types from objects (`typeof OBJ[keyof typeof OBJ]`), and type-safe mapping over object properties.

---

## C — Common Pitfalls + Fix

### ❌ Tuple inferred as array — losing position types

```typescript
// ❌ TypeScript infers array, not tuple
function divmod(a: number, b: number) {
  return [Math.floor(a / b), a % b]   // type: number[] ❌ (not [number, number])
}
const [q, r] = divmod(10, 3)
q.toFixed(2)   // number — fine, but TypeScript doesn't know q is first

// ✅ Annotate return type as tuple
function divmod2(a: number, b: number): [quotient: number, remainder: number] {
  return [Math.floor(a / b), a % b]   // type: [number, number] ✅
}
const [quotient, remainder] = divmod2(10, 3)   // named positions ✅
```

---

## K — Coding Challenge + Solution

### Challenge

Write `pick<T, K extends keyof T>(obj: T, keys: K[]): Pick<T, K>` and `omit<T, K extends keyof T>(obj: T, keys: K[]): Omit<T, K>`. Then write `typedEntries<T extends object>(obj: T): [keyof T, T[keyof T]][]`.

### Solution

```typescript
function pick<T extends object, K extends keyof T>(obj: T, keys: K[]): Pick<T, K> {
  const result = {} as Pick<T, K>
  for (const key of keys) result[key] = obj[key]
  return result
}

function omit<T extends object, K extends keyof T>(obj: T, keys: K[]): Omit<T, K> {
  const result = { ...obj }
  for (const key of keys) delete result[key]
  return result as Omit<T, K>
}

function typedEntries<T extends object>(obj: T): [keyof T, T[keyof T]][] {
  return Object.entries(obj) as [keyof T, T[keyof T]][]
}

const user = { id: 1, name: 'Mark', email: 'm@ex.com', password: 'secret' }

const public_  = pick(user, ['id', 'name', 'email'])   // Pick<User, 'id'|'name'|'email'>
const safe     = omit(user, ['password'])               // Omit<User, 'password'>
const entries  = typedEntries(user)                     // [keyof User, User[keyof User]][]

// Type inference: no 'as any' needed, all type-safe ✅
```

---

---

# 9 — ts-node, tsx, and Running TypeScript Directly

---

## T — TL;DR

`ts-node` runs `.ts` files without manual compilation — ideal for scripts and development. `tsx` is a faster, ESM-compatible alternative using esbuild. For production, compile with `tsc` and run the `.js` output. Know the tradeoffs and common configuration for each tool.

---

## K — Key Concepts

```bash
# ── Installation ──────────────────────────────────────────────────────────
npm install --save-dev ts-node tsx typescript @types/node

# ── ts-node — TypeScript execution in Node.js ─────────────────────────────
npx ts-node src/server.ts           # run TypeScript file directly
npx ts-node --esm src/server.ts     # ESM mode (requires "type":"module")
npx ts-node -e "console.log('hello')"  # evaluate TypeScript expression
npx ts-node-esm src/server.ts       # convenience alias for --esm

# ── tsx — faster alternative (esbuild-based) ──────────────────────────────
npx tsx src/server.ts               # run TypeScript file (ESM and CJS)
npx tsx watch src/server.ts         # watch mode — restart on change
npx tsx --tsconfig tsconfig.json src/server.ts

# tsx is significantly faster than ts-node (esbuild vs tsc transpilation)
# tsx does NOT type-check — it only transpiles
# Use tsx for: development server, scripts, quick runs
# Use tsc for: type-checking in CI, production builds
```

```json
// package.json scripts
{
  "scripts": {
    "dev":       "tsx watch src/server.ts",
    "start":     "node dist/server.js",
    "build":     "tsc --project tsconfig.build.json",
    "typecheck": "tsc --noEmit",
    "script":    "tsx scripts/seed.ts"
  }
}
```

```json
// tsconfig.json for ts-node with ESM
{
  "compilerOptions": {
    "module":           "NodeNext",
    "moduleResolution": "NodeNext",
    "target":           "ES2022",
    "strict":           true
  },
  "ts-node": {
    "esm":                true,
    "experimentalSpecifierResolution": "node"
  }
}
```

```typescript
// ── Running TypeScript scripts with tsx ────────────────────────────────────
// scripts/seed.ts
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function seed() {
  await prisma.user.createMany({
    data: [
      { name: 'Alice', email: 'alice@ex.com' },
      { name: 'Bob',   email: 'bob@ex.com' },
    ]
  })
  console.log('Seeded ✅')
}
seed().catch(console.error).finally(() => prisma.$disconnect())

// Run: npx tsx scripts/seed.ts
```

```typescript
// ── Type checking in CI (tsc --noEmit) ────────────────────────────────────
// tsx/ts-node don't type check — always run tsc --noEmit in CI

// .github/workflows/ci.yml
// - run: npm run typecheck   # tsc --noEmit
// - run: npm run lint        # eslint
// - run: npm test            # vitest

// The pattern:
// Local dev:  tsx (fast, no type check) → immediate feedback
// Pre-commit: tsc --noEmit + eslint (type check)
// CI:         tsc --noEmit + tests + build
```

---

## W — Why It Matters

- `tsx` is 5–10x faster than `ts-node` for startup because esbuild strips types without type-checking — for a dev server that restarts on every file change, this matters significantly.
- `tsc --noEmit` in CI is non-negotiable — `tsx` and `ts-node` may run code that has type errors. The type-check step is the only guarantee that your deployed code is type-safe.
- The `watch` mode with `tsx watch` replaces `nodemon + ts-node` with a single command and faster restarts — essential quality of life for Node.js API development.

---

## I — Interview Q&A

### Q: What is the difference between `ts-node` and `tsx`, and which would you use for what?

**A:** Both run TypeScript files without a separate compilation step. `ts-node` uses the TypeScript compiler (`tsc`) to transpile, which means it performs full type checking — slower but guarantees type safety at runtime too. `tsx` uses esbuild to strip types and transpile, making it 5–10x faster, but it does NOT type-check. Use `tsx` for: local development servers (`tsx watch`), scripts and tooling, any situation where you also run `tsc --noEmit` separately. Use `ts-node` when: you specifically need type-checking during execution, or when compatibility with certain TypeScript transformer features is required. In production, always compile with `tsc` and run plain `.js`.

---

## C — Common Pitfalls + Fix

### ❌ Relying on `tsx` in CI instead of `tsc --noEmit`

```bash
# ❌ tsx runs without type checking — type errors reach production
# CI script:
tsx src/build.ts  # runs even with type errors ❌

# ✅ Always add typecheck step
# package.json:
# "typecheck": "tsc --noEmit"

# CI:
npm run typecheck   # fail CI on type errors ✅
npm run build       # only builds if type-check passes
```

---

## K — Coding Challenge + Solution

### Challenge

Set up a minimal Node.js TypeScript project from scratch: `package.json` with scripts, `tsconfig.json` for Node 22 + ESM, and a `src/index.ts` that uses top-level await and `import.meta.dirname`.

### Solution

```json
// package.json
{
  "name": "my-api",
  "type": "module",
  "scripts": {
    "dev":       "tsx watch src/index.ts",
    "build":     "tsc --project tsconfig.build.json",
    "start":     "node dist/index.js",
    "typecheck": "tsc --noEmit"
  },
  "devDependencies": {
    "typescript": "^6.0.0",
    "@types/node": "^22.0.0",
    "tsx":        "^4.0.0"
  }
}
```

```json
// tsconfig.json
{
  "compilerOptions": {
    "target":               "ES2022",
    "module":               "NodeNext",
    "moduleResolution":     "NodeNext",
    "strict":               true,
    "noEmit":               true,
    "noUncheckedIndexedAccess": true,
    "useUnknownInCatchVariables": true,
    "esModuleInterop":      true,
    "skipLibCheck":         true
  },
  "include": ["src/**/*"]
}
```

```typescript
// src/index.ts
import { readdir } from 'fs/promises'
import path from 'path'

const dir   = import.meta.dirname          // Node 22+ ✅
const files = await readdir(dir)          // top-level await ✅

console.log(`Files in ${dir}:`)
for (const file of files) {
  console.log(`  ${file}`)
}
```

---

---

# 10 — ESLint, @typescript-eslint, Prettier

---

## T — TL;DR

**ESLint** catches code quality issues. **`@typescript-eslint`** adds TypeScript-aware rules that use the type checker. **Prettier** enforces consistent formatting (automatically — no debates). They serve different roles: ESLint = correctness and code smells; Prettier = formatting. Run them together in pre-commit hooks and CI.

---

## K — Key Concepts

```bash
# ── Installation ──────────────────────────────────────────────────────────
npm install --save-dev \
  eslint \
  @eslint/js \
  typescript-eslint \
  prettier \
  eslint-config-prettier \
  @types/eslint__js
```

```javascript
// eslint.config.mjs — flat config (ESLint 9+, TypeScript-eslint v8)
import eslint      from '@eslint/js'
import tseslint    from 'typescript-eslint'
import prettier    from 'eslint-config-prettier'

export default tseslint.config(
  eslint.configs.recommended,
  ...tseslint.configs.strictTypeChecked,   // strictest TS rules
  ...tseslint.configs.stylisticTypeChecked,

  {
    languageOptions: {
      parserOptions: {
        projectService: true,              // use tsconfig.json for type info
        tsconfigRootDir: import.meta.dirname,
      },
    },
    rules: {
      // TypeScript rules
      '@typescript-eslint/no-explicit-any':          'error',
      '@typescript-eslint/no-floating-promises':     'error',  // await all promises
      '@typescript-eslint/no-misused-promises':      'error',  // no async in wrong places
      '@typescript-eslint/consistent-type-imports':  ['error', { prefer: 'type-imports' }],
      '@typescript-eslint/switch-exhaustiveness-check': 'error',
      '@typescript-eslint/prefer-nullish-coalescing': 'error',  // ?? over ||

      // General rules
      'no-console':          ['warn', { allow: ['warn', 'error'] }],
      'prefer-const':        'error',
      'no-var':              'error',
      'eqeqeq':             ['error', 'always'],
      'no-unused-vars':      'off',   // use @typescript-eslint version instead
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
    },
  },

  // Disable formatting rules — Prettier handles those
  prettier,

  // Ignore patterns
  { ignores: ['dist/**', 'node_modules/**', '**/*.js'] }
)
```

```json
// .prettierrc
{
  "semi":          false,
  "singleQuote":   true,
  "trailingComma": "all",
  "printWidth":    100,
  "tabWidth":      2,
  "arrowParens":   "avoid",
  "endOfLine":     "lf"
}
```

```json
// package.json scripts
{
  "scripts": {
    "lint":         "eslint src --max-warnings 0",
    "lint:fix":     "eslint src --fix",
    "format":       "prettier --write src",
    "format:check": "prettier --check src",
    "typecheck":    "tsc --noEmit"
  }
}
```

```bash
# ── lint-staged + husky — pre-commit hook ────────────────────────────────
npm install --save-dev husky lint-staged
npx husky init
```

```json
// package.json — lint-staged config
{
  "lint-staged": {
    "*.{ts,tsx}": [
      "prettier --write",
      "eslint --fix --max-warnings 0"
    ],
    "*.{json,md,yml}": ["prettier --write"]
  }
}
```

```
// .husky/pre-commit
npx lint-staged
```

```typescript
// ── Key rules explained ────────────────────────────────────────────────────

// no-floating-promises — forget await → silent failures
async function saveUser() { ... }
saveUser()          // ❌ floating promise — error goes unhandled
await saveUser()    // ✅

// no-misused-promises — async in event handler without await
button.addEventListener('click', async () => {
  await saveUser()  // ✅ ESLint warns if the return Promise is mishandled
})

// consistent-type-imports — enforce import type
import { User } from './types'       // ❌ if User is type-only
import type { User } from './types'  // ✅ erased at compile time, safer with bundlers

// switch-exhaustiveness-check — enforces all union cases are handled
type Color = 'red' | 'green' | 'blue'
function handle(c: Color) {
  switch (c) {
    case 'red':   return 1
    case 'green': return 2
    // ❌ ESLint error: switch is not exhaustive — 'blue' not handled ✅
  }
}
```

---

## W — Why It Matters

- `@typescript-eslint/no-floating-promises` catches one of the most dangerous async bugs — `saveUser()` without `await` means the promise rejection is never caught, errors disappear silently. This rule makes it a lint error.
- Prettier eliminates all formatting debates — it's opinionated and non-configurable about most things. Teams stop wasting time on code review comments about semicolons, trailing commas, and indentation.
- `eslint-config-prettier` disables ESLint formatting rules that conflict with Prettier — without this, ESLint and Prettier fight each other in pre-commit hooks and CI.

---

## I — Interview Q&A

### Q: What is the difference between ESLint and Prettier, and how do they work together?

**A:** ESLint is a linter — it analyses code for correctness issues, potential bugs, and code smells. With `@typescript-eslint`, it can use type information to catch issues like floating promises, misused async functions, and type inconsistencies. Prettier is a code formatter — it rewrites code to a consistent style (indentation, quotes, trailing commas, line length) without any logic about correctness. They complement each other: ESLint for "is this code correct and consistent with team conventions?"; Prettier for "does this code look the same regardless of who wrote it?" They work together via `eslint-config-prettier`, which disables ESLint's formatting rules so only Prettier handles formatting.

---

## C — Common Pitfalls + Fix

### ❌ ESLint and Prettier fighting — conflicting rules

```javascript
// ❌ ESLint wants double quotes; Prettier wants single quotes
// Both run on save — infinite loop of changes

// ✅ Add eslint-config-prettier — disables all ESLint formatting rules
// eslint.config.mjs:
import prettier from 'eslint-config-prettier'
export default [
  ...tseslint.configs.recommended,
  prettier,   // ← must be LAST — overrides formatting rules ✅
]

// Now: ESLint handles correctness, Prettier handles formatting
// No more conflicts ✅
```

---

## K — Coding Challenge + Solution

### Challenge

Set up a complete lint + format + typecheck pipeline in `package.json`. Write an ESLint rule configuration that enforces: no `any`, no floating promises, consistent type imports, `??` over `||` for nullish values, and switch exhaustiveness.

### Solution

```javascript
// eslint.config.mjs — complete setup
import eslint   from '@eslint/js'
import tseslint from 'typescript-eslint'
import prettier from 'eslint-config-prettier'

export default tseslint.config(
  eslint.configs.recommended,
  ...tseslint.configs.strictTypeChecked,
  ...tseslint.configs.stylisticTypeChecked,
  {
    languageOptions: {
      parserOptions: { projectService: true, tsconfigRootDir: import.meta.dirname },
    },
    rules: {
      '@typescript-eslint/no-explicit-any':             'error',
      '@typescript-eslint/no-floating-promises':        'error',
      '@typescript-eslint/no-misused-promises':         'error',
      '@typescript-eslint/consistent-type-imports':     ['error', { prefer: 'type-imports' }],
      '@typescript-eslint/prefer-nullish-coalescing':   'error',
      '@typescript-eslint/switch-exhaustiveness-check': 'error',
      '@typescript-eslint/no-unused-vars':              ['error', { argsIgnorePattern: '^_' }],
      'prefer-const': 'error',
      'no-var':       'error',
    },
  },
  prettier,
  { ignores: ['dist/**', '*.js', '*.mjs'] }
)
```

```json
// package.json — full pipeline
{
  "scripts": {
    "dev":          "tsx watch src/index.ts",
    "build":        "tsc --project tsconfig.build.json",
    "start":        "node dist/index.js",
    "typecheck":    "tsc --noEmit",
    "lint":         "eslint src --max-warnings 0",
    "lint:fix":     "eslint src --fix",
    "format":       "prettier --write src",
    "format:check": "prettier --check src",
    "check":        "npm run typecheck && npm run lint && npm run format:check"
  },
  "lint-staged": {
    "*.{ts,tsx}": ["prettier --write", "eslint --fix --max-warnings 0"],
    "*.{json,md}": ["prettier --write"]
  }
}
```

---

## ✅ Day 7 Complete — TypeScript Foundations & Project Setup

| # | Subtopic | Status |
|---|----------|--------|
| 1 | TypeScript Purpose — Static Checking, Tooling, Gradual Adoption | ☐ |
| 2 | tsc and tsconfig.json — Core Options | ☐ |
| 3 | Strict Mode Options | ☐ |
| 4 | Primitive Types, any, unknown, never, void | ☐ |
| 5 | Annotations and Inference, Promise\<T\> | ☐ |
| 6 | Type Alias vs Interface, Unions, Intersections | ☐ |
| 7 | Optional/Readonly, Literal Types, const assertions | ☐ |
| 8 | keyof, typeof in Type Position, Tuples | ☐ |
| 9 | ts-node, tsx, Running TypeScript Directly | ☐ |
| 10 | ESLint, @typescript-eslint, Prettier | ☐ |

---

## 🗺️ One-Page Mental Model — Day 7

```
TYPESCRIPT PURPOSE
  Superset of JS → all JS is valid TS | types erased at compile time
  Catches: wrong types, missing props, null dereference, bad calls
  Does NOT catch: wrong API shapes, runtime data, logic bugs
  Value: editor autocomplete + refactoring + living documentation
  Gradual: rename .js → .ts | use // @ts-check for light checking

TSCONFIG ESSENTIALS
  strict: true          → enable ALL safety checks (required)
  target: ES2022        → output JS version
  module: NodeNext      → ESM for Node.js (pair with moduleResolution)
  moduleResolution: NodeNext | Bundler | node (must match module)
  esModuleInterop: true → default imports from CJS modules
  noEmit: true          → type-check only (for bundler projects)
  noEmitOnError: true   → don't emit broken JS
  skipLibCheck: true    → skip d.ts in node_modules (faster)
  verbatimModuleSyntax  → enforce import type for type-only imports
  noUncheckedIndexedAccess → arr[0] is T | undefined (not T)

STRICT FLAGS
  strictNullChecks         → null/undefined not assignable (most important)
  noImplicitAny            → must annotate untyped params
  strictPropertyInitialization → class props must be set in constructor
  noImplicitReturns        → all code paths must return
  noFallthroughCasesInSwitch → no accidental fall-through
  useUnknownInCatchVariables → catch err is unknown, not any
  noUncheckedIndexedAccess → array/record access returns T | undefined

TYPE SYSTEM
  Primitives: string number boolean bigint symbol undefined null
  Use LOWERCASE (string, not String)
  any:     escape hatch — avoid, propagates, disables checking
  unknown: safe top type — must narrow before using
  never:   impossible type — exhaustiveness, always-throw functions
  void:    no meaningful return — callbacks can still return values
  object:  non-primitive — avoid, too broad | use {} = any non-null

ANNOTATIONS vs INFERENCE
  Infer:  local variables, array method callbacks, obvious assignments
  Annotate: function params (always), public return types, empty arrays
  async fn: Promise<T> | top-level await in ESM modules ✅

TYPE ALIAS vs INTERFACE
  type:      unions, computed, tuples, mapped, conditional types
  interface: object shapes, class implements, declaration merging
  Both work for object shapes; use type for most, interface for class contracts

UNIONS + INTERSECTIONS
  T | U   → one of T or U | discriminated union: narrow via switch(tag)
  T & U   → all of T and U | composing types without conflicts
  Discriminated union: common 'kind'/'status' field for type narrowing

MODIFIERS + LITERALS
  optional ?: property may be absent (T | undefined)
  readonly:   prevents reassignment after init (shallow)
  'literal':  exact string/number type (not string/number)
  as const:   makes all values literals + deeply readonly
  typeof OBJ[keyof typeof OBJ] → derive union from const object ✅

KEYOF + TYPEOF
  keyof T:      'prop1' | 'prop2' | ... (union of all keys)
  T[K]:         type of T's property K (indexed access)
  typeof value: extract type from a value (DRY — no separate interface)
  <T, K extends keyof T>(obj: T, key: K): T[K] → type-safe property access
  Tuple: [T1, T2] fixed-length, fixed-type | named: [a: T1, b: T2]

RUNNING TS
  tsx src/index.ts      → fast (esbuild), no type-check — for dev/scripts
  ts-node src/index.ts  → slow (tsc), type-checks — for strict execution
  tsc --noEmit          → type-check only (CI) — always run in CI pipeline
  tsc outDir/           → production build → node dist/index.js

TOOLING
  ESLint:           code quality + correctness
  @typescript-eslint: TS-aware rules (no-floating-promises, no-any, etc.)
  Prettier:         formatting only — no debates
  eslint-config-prettier: disable ESLint formatting rules ← must be last
  lint-staged + husky: run lint+format on commit only on changed files
  Key rules: no-floating-promises | no-misused-promises | consistent-type-imports
             switch-exhaustiveness-check | prefer-nullish-coalescing
```

> **Your next action:** Run `npx tsc --init` in any JavaScript project folder, open the generated `tsconfig.json`, uncomment `"strict": true`, rename one `.js` file to `.ts`, and see what errors appear. Five minutes of live errors teaches more than rereading this page.

> "Doing one small thing beats opening a feed."