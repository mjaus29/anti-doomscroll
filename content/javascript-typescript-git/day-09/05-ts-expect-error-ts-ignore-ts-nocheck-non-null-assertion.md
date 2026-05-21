# 5 — @ts-expect-error, @ts-ignore, @ts-nocheck + Non-null Assertion

---

## T — TL;DR

TypeScript has four directive comments to suppress errors: `@ts-ignore` (silences the next line), `@ts-expect-error` (silences and fails if no error — for tests), `@ts-nocheck` (disables the whole file). The **non-null assertion operator** (`!`) tells TypeScript a value is definitely not null/undefined. All are escape hatches — use them deliberately with comments.

---

## K — Key Concepts

```typescript
// ── @ts-ignore — suppress the next line ───────────────────────────────────
// TS never complains about this — even if the error disappears later
function legacyAPI(): any { return 'value' }

// @ts-ignore
const x: string = legacyAPI()   // error suppressed — no feedback if it gets fixed

// ── @ts-expect-error — suppress AND verify an error exists ────────────────
// ✅ BETTER: fails if the error no longer exists (prevents stale suppressions)
function add(a: number, b: number): number { return a + b }

// @ts-expect-error — intentional wrong type (in tests)
add('not', 'a number')  // ✅ suppressed — tests that wrong args are rejected

// If add's types change and this becomes valid, TS will error:
// "Unused '@ts-expect-error' directive" — keeps suppressions honest ✅

// ── When @ts-expect-error is legitimate ───────────────────────────────────
// 1. Unit testing type errors (vitest/jest type tests)
// @ts-expect-error — string not assignable to number
const n: number = 'hello'

// 2. Interop with genuinely broken third-party types
// @ts-expect-error — library types are wrong for this overload
thirdPartyFn(validArg)
```

```typescript
// ── @ts-nocheck — disable whole file ──────────────────────────────────────
// @ts-nocheck
// Put at the TOP of a .ts file — disables ALL checking
// Use for: auto-generated files, legacy JS files being migrated
// Never use in hand-written TypeScript code

// ── Non-null assertion ! ──────────────────────────────────────────────────
// Tells TypeScript: "this value is definitely not null/undefined"
// NO runtime check — pure compile-time assertion

const input = document.getElementById('email')   // HTMLElement | null
input!.focus()   // ✅ TypeScript satisfied — but crashes if input is null!

// Use ! only when:
// 1. You've already verified it in a way TypeScript can't see
// 2. The HTML structure guarantees the element exists
// 3. You're in a test setup

// ❌ Overusing ! defeats strictNullChecks
function getUserName(user?: User): string {
  return user!.name   // ❌ crashes if user is undefined
}

// ✅ Handle the null case properly
function getUserName2(user?: User): string {
  if (!user) return 'Guest'
  return user.name   // ✅ narrowed
}
```

```typescript
// ── Adding a comment requirement ──────────────────────────────────────────
// ESLint rule: @typescript-eslint/ban-ts-comment requires descriptions
// Set in eslint.config.mjs:
// '@typescript-eslint/ban-ts-comment': ['error', {
//   'ts-ignore':       { descriptionFormat: '.*' },
//   'ts-expect-error': { descriptionFormat: '.*' },
// }]

// With description required:
// @ts-expect-error — library returns 'any' for this overload, tracked in #123
thirdPartyFn(arg)

// @ts-ignore — TODO: remove once axios types are updated to v2
import axios from 'axios'
```

---

## W — Why It Matters

- `@ts-expect-error` over `@ts-ignore` is the better default — it self-documents intent AND turns into a visible error when the type issue is fixed, preventing stale suppressions from accumulating.
- The non-null assertion (`!`) is NOT a null check — `element!.value` will throw at runtime if element is null. Every `!` in a codebase is a potential crash waiting to happen. Prefer `if (!el) throw` or `?.`.
- `@ts-nocheck` at the top of generated files (Prisma client, GraphQL codegen, protobuf output) is legitimate — it prevents false positives on machine-generated code that can't be changed.

---

## I — Interview Q&A

### Q: When should you use `@ts-expect-error` instead of `@ts-ignore`?

**A:** Almost always prefer `@ts-expect-error`. Both suppress the TypeScript error on the next line, but `@ts-expect-error` additionally produces an error ("Unused '@ts-expect-error' directive") if the suppressed error no longer exists. This means: (1) it self-documents that you expect a specific type error, (2) it alerts you when the underlying issue is fixed and the suppression can be removed. `@ts-ignore` silently persists even when the code changes to be correct — suppressions accumulate and obscure real errors. Use `@ts-ignore` only when you specifically want to suppress even if no error occurs (rare: cross-version compatibility).

---

## C — Common Pitfalls + Fix

### ❌ Non-null assertion on potentially missing DOM element

```typescript
// ❌ ! doesn't check at runtime — crashes on pages without this element
const modal = document.getElementById('modal')!
modal.style.display = 'block'   // crash if page doesn't have #modal ❌

// ✅ Check existence first
const modal2 = document.getElementById('modal')
if (modal2) modal2.style.display = 'block'   // ✅

// ✅ Or throw with a useful message
const modal3 = document.getElementById('modal')
if (!modal3) throw new Error('Missing required #modal element')
modal3.style.display = 'block'   // ✅ narrowed
```

---

## K — Coding Challenge + Solution

### Challenge

Write a test suite that uses `@ts-expect-error` to verify wrong-typed calls are rejected. Write `assertType<T>()` and `expectType<T>(value: T)` utilities used in type-level tests.

### Solution

```typescript
// Type testing utilities
function assertType<T>(_value: T): void {}   // does nothing at runtime
function expectType<T>() {
  return {
    toEqual: <U extends T>(_value: U): void => {},
    not:     { toEqual: (_value: unknown): void => {} }
  }
}

// Type test file: user.types.test-d.ts
import { createUser, User } from './user'

// ✅ correct usage — no error
const user: User = createUser({ name: 'Mark', email: 'm@ex.com' })
assertType<User>(user)

// @ts-expect-error — name is required
createUser({ email: 'm@ex.com' })

// @ts-expect-error — extra field not in CreateUserDto
createUser({ name: 'Mark', email: 'm@ex.com', id: 1 })

// @ts-expect-error — wrong type for name
createUser({ name: 123, email: 'm@ex.com' })

// Verify return type
expectType<Promise<User>>().toEqual(createUser({ name: 'Mark', email: 'm@ex.com' }))
```

---

---
