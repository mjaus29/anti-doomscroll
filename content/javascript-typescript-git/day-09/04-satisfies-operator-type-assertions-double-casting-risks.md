# 4 — satisfies Operator + Type Assertions + Double-casting Risks

---

## T — TL;DR

**`satisfies`** validates a value matches a type without widening — you get both the validation and the narrowest inferred type. **Type assertions** (`as T`) override TypeScript's type — no runtime effect, just a compiler override. **Double-casting** (`as unknown as T`) bypasses all checks and is a red flag. Use assertions sparingly and `satisfies` freely.

---

## K — Key Concepts

```typescript
// ── satisfies vs type annotation ─────────────────────────────────────────
type Colors = Record<string, string | [number, number, number]>

// With annotation: widened to the declared type
const palette1: Colors = {
  red:   '#ff0000',
  green: [0, 255, 0],
}
palette1.red        // type: string | [number, number, number] — too wide ❌
palette1.red.toUpperCase()  // TS error — might be an array

// With satisfies: validates but preserves narrow inferred type
const palette2 = {
  red:   '#ff0000',
  green: [0, 255, 0],
} satisfies Colors

palette2.red         // type: string ✅ (inferred from '#ff0000')
palette2.green       // type: [number, number, number] ✅ (inferred from literal)
palette2.red.toUpperCase()   // ✅ TypeScript knows it's a string
palette2.green.map(n => n / 255)   // ✅ TypeScript knows it's an array
```

```typescript
// ── satisfies + as const ──────────────────────────────────────────────────
type RouteConfig = {
  path:    string
  method:  'GET' | 'POST' | 'PUT' | 'DELETE'
  auth:    boolean
}

// satisfies validates shape | as const preserves literals
const ROUTES = [
  { path: '/users',    method: 'GET',  auth: true  },
  { path: '/users',    method: 'POST', auth: true  },
  { path: '/health',   method: 'GET',  auth: false },
] as const satisfies readonly RouteConfig[]

// Each route's method is the literal type (not just 'GET' | 'POST' | ...)
type FirstMethod = typeof ROUTES[0]['method']  // 'GET' ✅ (not 'GET'|'POST'|...)
// And it's validated against RouteConfig ✅
```

```typescript
// ── Type assertions (as T) ────────────────────────────────────────────────
// Tells TS: "I know better than you — treat this as T"
// No runtime effect — purely compile-time

const rawInput = document.getElementById('name-input')
// type: HTMLElement | null — too broad

const input = rawInput as HTMLInputElement   // ✅ when you KNOW it's an input
input.value   // ✅ access .value

// as const — assertion to literal type
const role = 'admin' as const   // type: 'admin' (not string)

// ── When assertions are legitimate ───────────────────────────────────────
// 1. DOM — you know the HTML structure
const btn = document.querySelector('#submit') as HTMLButtonElement
// 2. Testing — mocks and stubs
const mockReq = {} as Request
// 3. Discriminated union after manual check
function handleResponse(res: Response) {
  const data = res as unknown   // reset to unknown for re-casting (rare)
}
```

```typescript
// ── Double-casting risks ──────────────────────────────────────────────────
// as unknown as T — bypasses ALL type checking
// TS won't complain about ANY double cast — you're on your own

// ❌ Dangerous: forcing completely incompatible types
const n: number = 42
const s = n as unknown as string   // TS accepts it, runtime is still a number
s.toUpperCase()   // runtime crash: s.toUpperCase is not a function ❌

// ❌ Common misuse in codebases:
const user = JSON.parse(raw) as unknown as User   // lies — no validation
user.name.toUpperCase()  // crash if API returns wrong shape ❌

// ✅ Legitimate use: genuinely type-safe bridge with validation
function toUser(v: unknown): User {
  assertUser(v)   // throws if not valid — THEN we trust the type
  return v        // v is User after assertUser ✅ — no cast needed even
}
```

---

## W — Why It Matters

- `satisfies` solves the "I want type validation AND narrow inference" problem that previously required picking one or the other — it's the modern replacement for most `as const` + annotation patterns.
- Type assertions are not casts — in C# `(string)x` actually converts; in TypeScript `x as string` only changes the compile-time type. If `x` is actually a `number`, it stays a number at runtime and methods will crash.
- Double-casting (`as unknown as T`) is a codebase smell — legitimate uses exist (DOM manipulation, test utilities) but it bypasses all safety. In PRs, any `as unknown as` should be questioned.

---

## I — Interview Q&A

### Q: What does `satisfies` do that a type annotation doesn't?

**A:** A type annotation (`const x: Type = value`) widens the inferred type to `Type` — you lose the narrow literal types. `satisfies` validates the value against `Type` at compile time but preserves the narrow inferred type from the value itself. Example: `const colors = { red: '#ff0000' } satisfies Record<string, string>` — TypeScript validates the object matches `Record<string, string>` AND keeps `colors.red` typed as `string` (not `string`). With an annotation `const colors: Record<string, string>`, accessing `colors.red` is `string` — same, but you lose per-key literal narrowing. The real power is with union values where each property has a specific subtype.

---

## C — Common Pitfalls + Fix

### ❌ Using `as` to silence an error that indicates a real bug

```typescript
// ❌ TypeScript error = real type mismatch — casting silences it, not fixes it
function processItems(items: string[]) { }
const mixed = [1, 2, 'three']   // type: (string | number)[]
processItems(mixed as string[]) // ❌ runtime: 1 and 2 are not strings

// ✅ Fix the actual type issue
const strings = mixed.filter((x): x is string => typeof x === 'string')
processItems(strings)   // ✅ actual string[] after filtering
```

---

## K — Coding Challenge + Solution

### Challenge

Use `satisfies` to define a theme config where each color is either a hex string or RGB tuple. Show that TypeScript knows the specific type of each color. Then show a safe assertion pattern for `document.querySelector`.

### Solution

```typescript
type ColorValue = string | [number, number, number]
type Theme = { primary: ColorValue; secondary: ColorValue; background: ColorValue }

const theme = {
  primary:    '#3b82f6',
  secondary:  [99, 102, 241] as [number, number, number],
  background: '#ffffff',
} satisfies Theme

// Types are preserved, not widened ✅
theme.primary.startsWith('#')           // ✅ string method available
theme.secondary.map(n => n / 255)       // ✅ array method available
theme.background.toUpperCase()          // ✅

// Safe querySelector pattern
function getElement<T extends HTMLElement>(
  selector: string,
  type: new (...args: any[]) => T
): T {
  const el = document.querySelector(selector)
  if (!el) throw new Error(`Element not found: ${selector}`)
  if (!(el instanceof type)) throw new Error(`Expected ${type.name}`)
  return el
}

const input = getElement('#email', HTMLInputElement)   // HTMLInputElement ✅
const form  = getElement('#login-form', HTMLFormElement) // HTMLFormElement ✅
```

---

---
