
# 📅 Day 9 — TypeScript Narrowing, Declarations & Advanced Patterns

> **Goal:** Master TypeScript's control-flow narrowing, write airtight type guards, understand ambient declarations, branded types, and all the escape hatches.
> **Format:** Each subtopic = 5–15 min. Do one. Stop. Come back.
> **Stack:** TypeScript 6.0 · Node.js 22 · strict mode always on

---

## 📋 Day 9 Subtopic Overview

| # | Subtopic | Time |
|---|----------|------|
| 1 | Narrowing — typeof, instanceof, in, equality, truthiness, assignment | 12 min |
| 2 | Discriminated Unions + Exhaustiveness Checking with never | 10 min |
| 3 | User-defined Type Guards + Assertion Functions | 12 min |
| 4 | satisfies Operator + Type Assertions + Double-casting Risks | 10 min |
| 5 | @ts-expect-error, @ts-ignore, @ts-nocheck + Non-null Assertion | 8 min |
| 6 | Ambient Declarations — declare const/function/class/module/global | 12 min |
| 7 | Abstract Classes + Branded Types | 12 min |
| 8 | Enums vs const Objects | 10 min |
| 9 | Declaration Merging, Module Augmentation, @types, .d.ts files | 12 min |
| 10 | Variance + useUnknownInCatchVariables + Unknown External Data | 10 min |

---

---

# 1 — Narrowing

---

## T — TL;DR

**Narrowing** is TypeScript's ability to refine a broad type to a more specific one inside a conditional block. Each check — `typeof`, `instanceof`, `in`, equality, truthiness — teaches TypeScript what the type must be in that branch. TypeScript tracks this through control flow automatically.

---

## K — Key Concepts

```typescript
// ── typeof narrowing ──────────────────────────────────────────────────────
function format(value: string | number | boolean | null): string {
  if (typeof value === 'string')  return value.toUpperCase()   // string ✅
  if (typeof value === 'number')  return value.toFixed(2)      // number ✅
  if (typeof value === 'boolean') return value ? 'Yes' : 'No'  // boolean ✅
  return 'null'   // TypeScript knows: only null left ✅
}

// typeof limitations:
// typeof null === 'object' — always check null separately
// typeof fn === 'function' — only way to check functions
// typeof [] === 'object' — can't distinguish array from object
```

```typescript
// ── instanceof narrowing ──────────────────────────────────────────────────
class HttpError  { constructor(public status: number, public message: string) {} }
class NetworkError { constructor(public message: string, public retryAfter?: number) {} }

function handle(err: HttpError | NetworkError | Error) {
  if (err instanceof HttpError)   return `HTTP ${err.status}: ${err.message}`
  if (err instanceof NetworkError) return `Network: retry in ${err.retryAfter}s`
  return `Error: ${err.message}`   // Error — only base class left ✅
}

// ── in narrowing — check if property exists ───────────────────────────────
interface Cat { meow(): void; indoor: boolean }
interface Dog { bark(): void; breed: string }

function speak(animal: Cat | Dog) {
  if ('meow' in animal) return animal.meow()   // Cat ✅
  return animal.bark()                          // Dog ✅
}
```

```typescript
// ── Equality narrowing ────────────────────────────────────────────────────
function process(val: string | null | undefined) {
  if (val === null)      return 'null'
  if (val === undefined) return 'undefined'
  return val.toUpperCase()   // string ✅
}

// Loose equality: == null catches both null AND undefined
function processLoose(val: string | null | undefined) {
  if (val == null) return 'empty'    // null | undefined
  return val.toUpperCase()            // string ✅
}

// ── Truthiness narrowing ──────────────────────────────────────────────────
function greet(name: string | null | undefined) {
  if (name) return `Hello, ${name}`   // string (non-empty) ✅
  return 'Hello, stranger'
}
// ⚠️ Truthiness fails for 0, '', false — use != null for those cases
function increment(count: number | null) {
  if (count != null) return count + 1  // 0 is still valid ✅
  return 0
}
```

```typescript
// ── Assignment narrowing ──────────────────────────────────────────────────
// TypeScript narrows after assignment to a more specific type
let id: string | number
id = 1
id.toFixed(2)   // number ✅ — TypeScript knows it was assigned a number

id = 'abc'
id.toUpperCase()  // string ✅

// ── Control flow analysis ─────────────────────────────────────────────────
function getLength(input: string | string[]) {
  // TypeScript tracks BOTH branches simultaneously
  const result = Array.isArray(input)
    ? input.join(', ')   // string[] ✅
    : input.toUpperCase() // string ✅
  return result   // string (both branches return string)
}

// Early return narrows the rest of the function
function processUser(user: User | null): string {
  if (!user) return 'No user'   // null handled
  return user.name               // User ✅ — null eliminated below this point
}
```

---

## W — Why It Matters

- TypeScript's control flow analysis is what makes `strict: true` usable — without narrowing, you'd need to cast everywhere. With it, a simple `if (typeof x === 'string')` unlocks all string methods below.
- `in` narrowing for discriminating interfaces (no shared discriminant field) is the only tool that works without modifying the original types — useful when typing third-party objects.
- Assignment narrowing means `let x: string | number = 1; x.toFixed()` works without a cast — TypeScript tracks the last assignment, not just the declared type.

---

## I — Interview Q&A

### Q: What is control flow analysis in TypeScript?

**A:** TypeScript's compiler analyses every code path through a function — it tracks which types are possible at each point based on the checks that have run. After `if (typeof x === 'string') { ... }`, TypeScript knows `x` is `string` inside the block and narrows its type accordingly. After the block, TypeScript knows the `string` case was handled and narrows to the remaining types. This happens for `typeof`, `instanceof`, `in`, equality checks, truthiness, assignments, and custom type guards. The result: you don't need casts in most cases — just write the checks that your code needs anyway, and TypeScript infers the narrowed type.

---

## C — Common Pitfalls + Fix

### ❌ Truthiness narrowing silently passes `0`, `''`, `false`

```typescript
// ❌ 0 and '' are valid values but falsy — truthiness eliminates them
function double(n: number | null): number {
  if (n) return n * 2    // ❌ n=0 falls through to return 0 below
  return 0               // both null AND 0 reach here
}
double(0)   // returns 0 — looks correct but bypassed the double ❌

// ✅ Use explicit null check
function double2(n: number | null): number {
  if (n != null) return n * 2   // 0 is handled correctly ✅
  return 0
}
double2(0)   // returns 0 (from n * 2) ✅
```

---

## K — Coding Challenge + Solution

### Challenge

Write `stringify(value: string | number | boolean | null | undefined | object): string` using all narrowing techniques — typeof, Array.isArray, instanceof, and equality.

### Solution

```typescript
function stringify(
  value: string | number | boolean | null | undefined | Date | object
): string {
  if (value === null)        return 'null'
  if (value === undefined)   return 'undefined'
  if (typeof value === 'string')  return `"${value}"`
  if (typeof value === 'number')  return isNaN(value) ? 'NaN' : String(value)
  if (typeof value === 'boolean') return value ? 'true' : 'false'
  if (value instanceof Date)      return value.toISOString()
  if (Array.isArray(value))       return `[${value.map(stringify).join(', ')}]`
  // object — at this point TypeScript knows it's a plain object
  const entries = Object.entries(value as Record<string, unknown>)
    .map(([k, v]) => `${k}: ${stringify(v as any)}`)
  return `{ ${entries.join(', ')} }`
}

stringify(null)           // 'null'
stringify(42)             // '42'
stringify('hello')        // '"hello"'
stringify(new Date())     // ISO string
stringify([1, 'a', true]) // '[1, "a", true]'
```

---

---

# 2 — Discriminated Unions + Exhaustiveness Checking with never

---

## T — TL;DR

A **discriminated union** is a union where every member has a common literal field (the **discriminant**) that uniquely identifies it. TypeScript uses the discriminant in a switch/if to narrow to the exact member. Combined with `never` in the default branch, you get **exhaustiveness checking** — a compile error if you forget a case.

---

## K — Key Concepts

```typescript
// ── Discriminated union ───────────────────────────────────────────────────
// Each variant has 'type' (or 'kind', 'tag') as a unique literal
type Shape =
  | { type: 'circle';    radius: number }
  | { type: 'rectangle'; width: number; height: number }
  | { type: 'triangle';  base: number;  height: number }

function area(shape: Shape): number {
  switch (shape.type) {
    case 'circle':
      return Math.PI * shape.radius ** 2    // only .radius available ✅
    case 'rectangle':
      return shape.width * shape.height     // only .width/.height ✅
    case 'triangle':
      return (shape.base * shape.height) / 2
  }
}
```

```typescript
// ── Exhaustiveness checking with never ────────────────────────────────────
function assertNever(value: never, message?: string): never {
  throw new Error(message ?? `Unhandled value: ${JSON.stringify(value)}`)
}

type Status = 'pending' | 'active' | 'suspended' | 'deleted'

function describe(status: Status): string {
  switch (status) {
    case 'pending':   return 'Awaiting review'
    case 'active':    return 'Account is live'
    case 'suspended': return 'Temporarily disabled'
    case 'deleted':   return 'Account removed'
    default:
      return assertNever(status)
      // If you add 'archived' to Status and forget a case:
      // TS2345: Argument of type 'string' is not assignable to type 'never' ✅
  }
}

// ── Discriminated union for API state ─────────────────────────────────────
type AsyncState<T> =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'success'; data: T }
  | { status: 'error';   error: Error }

function renderState<T>(state: AsyncState<T>, render: (data: T) => string): string {
  switch (state.status) {
    case 'idle':    return 'Not started'
    case 'loading': return 'Loading...'
    case 'success': return render(state.data)   // data available ✅
    case 'error':   return `Error: ${state.error.message}`
    default: return assertNever(state)           // exhaustive ✅
  }
}
```

```typescript
// ── Multiple discriminants ────────────────────────────────────────────────
type Action =
  | { type: 'user/login';  payload: { email: string; password: string } }
  | { type: 'user/logout' }
  | { type: 'post/create'; payload: { title: string; body: string } }
  | { type: 'post/delete'; payload: { id: number } }

// Extract payload type for a specific action
type ActionPayload<A extends Action, T extends A['type']> =
  Extract<A, { type: T }> extends { payload: infer P } ? P : never

type LoginPayload = ActionPayload<Action, 'user/login'>
// { email: string; password: string } ✅

// Type-safe dispatch
function dispatch(action: Action): void {
  switch (action.type) {
    case 'user/login':  handleLogin(action.payload); break
    case 'user/logout': handleLogout(); break
    case 'post/create': handleCreate(action.payload); break
    case 'post/delete': handleDelete(action.payload); break
    default: assertNever(action)
  }
}
```

---

## W — Why It Matters

- Discriminated unions are how Redux actions, React component variants, API states, and result types are typed — every library that models "one of several shapes" uses this pattern. Understanding it reads 90% of real TypeScript codebases.
- `assertNever` in the `default` branch turns a runtime safety net into a compile-time guarantee — adding a new union member without handling it becomes a TS error, not a silent bug.
- The discriminant field (`type`, `kind`, `status`) is the minimum change that makes a union safely narrowable — without it, TypeScript can't tell the branches apart and you'd need `in` checks for every property.

---

## I — Interview Q&A

### Q: What makes a union "discriminated" and why is the discriminant important?

**A:** A discriminated union has a common property (the discriminant) whose type is a unique literal in each union member — `type: 'circle'`, `type: 'rectangle'`. TypeScript uses this to narrow the entire union to a single member inside a conditional or switch. Without a discriminant, you'd need to check for unique properties with `in` (`'radius' in shape`) which is fragile and doesn't scale. The discriminant makes the intent explicit: checking `shape.type === 'circle'` unambiguously selects the circle variant, giving full access to `.radius` with no casts.

---

## C — Common Pitfalls + Fix

### ❌ Non-literal discriminant — TypeScript can't narrow

```typescript
// ❌ discriminant is 'string' — TypeScript can't tell members apart
type A = { kind: string; x: number }
type B = { kind: string; y: number }
type AB = A | B
function use(v: AB) {
  if (v.kind === 'a') v.x   // TS error: x might not exist (kind is just string) ❌
}

// ✅ Use literal types as discriminants
type A2 = { kind: 'a'; x: number }
type B2 = { kind: 'b'; y: number }
type AB2 = A2 | B2
function use2(v: AB2) {
  if (v.kind === 'a') v.x   // ✅ narrowed to A2
}
```

---

## K — Coding Challenge + Solution

### Challenge

Model a payment system as a discriminated union: `PaymentMethod` with `card`, `bankTransfer`, `crypto` variants. Write `processPayment(method: PaymentMethod): string` with exhaustive checking. Add a new `wallet` variant and fix the compile error.

### Solution

```typescript
type PaymentMethod =
  | { type: 'card';         cardNumber: string; expiry: string; cvv: string }
  | { type: 'bankTransfer'; accountNo: string;  routingNo: string }
  | { type: 'crypto';       address: string;    network: 'ETH' | 'BTC' | 'SOL' }
  | { type: 'wallet';       walletId: string;   provider: string }

function processPayment(method: PaymentMethod): string {
  switch (method.type) {
    case 'card':
      return `Charging card ending ${method.cardNumber.slice(-4)}`
    case 'bankTransfer':
      return `Transfer to account ${method.accountNo}`
    case 'crypto':
      return `Sending to ${method.address} on ${method.network}`
    case 'wallet':                         // ← added to fix exhaustiveness ✅
      return `Paying via ${method.provider} wallet ${method.walletId}`
    default:
      return assertNever(method)           // TS error until all cases handled ✅
  }
}
function assertNever(v: never): never {
  throw new Error(`Unhandled: ${JSON.stringify(v)}`)
}
```

---

---

# 3 — User-defined Type Guards + Assertion Functions

---

## T — TL;DR

**Type guards** are functions that return `value is T` — they narrow the caller's view of a variable after the call. **Assertion functions** (`asserts value is T`) narrow inline and throw if the assertion fails — they tell TypeScript "after this call, treat the value as T." Both extend narrowing beyond what TypeScript can infer automatically.

---

## K — Key Concepts

```typescript
// ── User-defined type guard ───────────────────────────────────────────────
// Return type 'value is T' = predicate signature
function isString(value: unknown): value is string {
  return typeof value === 'string'
}
function isUser(value: unknown): value is User {
  return (
    typeof value === 'object' && value !== null &&
    'id'   in value && typeof (value as any).id   === 'number' &&
    'name' in value && typeof (value as any).name === 'string'
  )
}

// Before calling: 'value' is unknown
const raw: unknown = JSON.parse('{"id":1,"name":"Mark"}')

if (isUser(raw)) {
  raw.name.toUpperCase()   // ✅ TypeScript knows it's User inside this block
}

// ── Array filter with type guard ──────────────────────────────────────────
// Without type guard: filter doesn't narrow the type
const mixed: (string | null)[] = ['a', null, 'b', null, 'c']
const noGuard = mixed.filter(x => x !== null)
// type: (string | null)[] — TypeScript doesn't know ❌

// With type guard: filter narrows the result array type
function notNull<T>(value: T | null | undefined): value is T {
  return value != null
}
const withGuard = mixed.filter(notNull)   // type: string[] ✅
```

```typescript
// ── Reusable type guard builders ──────────────────────────────────────────
// Generic "is array of T" guard
function isArrayOf<T>(
  arr: unknown,
  guard: (item: unknown) => item is T
): arr is T[] {
  return Array.isArray(arr) && arr.every(guard)
}

const maybeUsers: unknown = [{ id: 1, name: 'Mark' }]
if (isArrayOf(maybeUsers, isUser)) {
  maybeUsers.map(u => u.name)   // User[] ✅
}

// Type guard factory
function hasShape<T extends object>(
  keys: (keyof T)[],
  types: { [K in keyof T]: string }
) {
  return (value: unknown): value is T => {
    if (typeof value !== 'object' || value === null) return false
    return keys.every(k => k in value && typeof (value as any)[k] === types[k])
  }
}
const isPoint = hasShape<{ x: number; y: number }>(
  ['x', 'y'], { x: 'number', y: 'number' }
)
```

```typescript
// ── Assertion functions ────────────────────────────────────────────────────
// 'asserts value is T' — throws if not T, narrows after the call
function assertUser(value: unknown): asserts value is User {
  if (!isUser(value)) throw new TypeError(`Expected User, got ${typeof value}`)
}

function assertDefined<T>(value: T | null | undefined): asserts value is T {
  if (value == null) throw new Error('Expected defined value, got null/undefined')
}

// Usage
const data: unknown = fetchUser()
assertUser(data)          // throws if not a User
data.name.toUpperCase()   // ✅ TypeScript now knows data is User — no if needed

// With assertDefined
const el = document.getElementById('app')
assertDefined(el)         // throws if el is null
el.innerHTML = 'Hello'    // ✅ narrowed to HTMLElement — no '?' needed

// ── assert with condition ─────────────────────────────────────────────────
// 'asserts condition' — confirms the condition holds after the call
function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(`Assertion failed: ${message}`)
}

const count: number | null = getCount()
assert(count !== null, 'count must not be null')
count.toFixed(2)   // ✅ TypeScript knows count is number here
```

---

## W — Why It Matters

- `Array.filter(notNull)` without a type guard returns `(T | null)[]` even though every null was removed — the type guard overload `filter(guard: (v: T | null) => v is T): T[]` is what makes `mixed.filter(notNull)` return `T[]`. This is one of the most practical daily uses.
- Assertion functions are preferable to type guards when you want to fail loudly — tests, constructors, and initialization code should throw rather than branch, and `asserts value is T` is the TypeScript-native way to express that.
- User-defined type guards are the bridge between runtime validation and compile-time types — Zod's `.parse()` uses this internally (the return type is the validated type), which is why the result is typed.

---

## I — Interview Q&A

### Q: What is the difference between a type guard (`value is T`) and an assertion function (`asserts value is T`)?

**A:** A type guard returns `boolean` — `true` means the value is `T` in the `if` block, `false` eliminates it. The narrowing only applies inside the conditional. An assertion function returns `void` — it throws if the condition fails, and TypeScript narrows the value for all code after the call (not just inside a block). Use type guards when the code should branch based on the type; use assertion functions when failing is the only acceptable alternative (initialization, tests, pre-conditions). Both are declared by annotating the return type — `is T` for guards, `asserts value is T` for assertion functions.

---

## C — Common Pitfalls + Fix

### ❌ Type guard returning `any` — silently always returns true

```typescript
// ❌ Overly permissive guard — always passes, loses all safety
function isUser(v: unknown): v is User {
  return typeof v === 'object' && v !== null   // ❌ doesn't check required fields
}
const bad: unknown = { name: 123, id: 'not-a-number' }
if (isUser(bad)) {
  bad.id.toFixed(2)   // runtime crash — id is a string, not number ❌
}

// ✅ Check every required field and its type
function isUser2(v: unknown): v is User {
  return (
    typeof v === 'object' && v !== null                &&
    'id'   in v && typeof (v as any).id   === 'number' &&
    'name' in v && typeof (v as any).name === 'string'
  )
}
```

---

## K — Coding Challenge + Solution

### Challenge

Write `partition<T, U extends T>(items: T[], guard: (v: T) => v is U): [U[], Exclude<T, U>[]]` — splits an array into two typed arrays based on a type guard.

### Solution

```typescript
function partition<T, U extends T>(
  items: T[],
  guard: (v: T) => v is U
): [U[], Exclude<T, U>[]] {
  const matching:    U[]             = []
  const nonMatching: Exclude<T, U>[] = []
  for (const item of items) {
    if (guard(item)) matching.push(item)
    else nonMatching.push(item as Exclude<T, U>)
  }
  return [matching, nonMatching]
}

// Usage
const values: (string | number | null)[] = ['a', 1, null, 'b', 2, null]

function isString(v: unknown): v is string { return typeof v === 'string' }
function notNull<T>(v: T | null): v is T   { return v !== null }

const [strings, rest]    = partition(values, isString)
// strings: string[] ✅ | rest: (number | null)[] ✅

const [defined, nulls]   = partition(values, notNull)
// defined: (string | number)[] ✅ | nulls: null[] ✅
```

---

---

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

# 6 — Ambient Declarations

---

## T — TL;DR

**Ambient declarations** describe types of things that exist at runtime but aren't defined in TypeScript source — third-party globals, environment variables, native APIs. `declare` tells TypeScript "this exists — don't look for an implementation." Used in `.d.ts` files and `declare global` blocks to extend the global namespace.

---

## K — Key Concepts

```typescript
// ── declare — describe existing values ────────────────────────────────────
// "This exists at runtime — here's its type"

// In a .d.ts file or top of a module:
declare const __VERSION__: string     // e.g. injected by webpack/vite
declare const __DEV__: boolean
declare function require(id: string): unknown   // CJS require in ESM context

declare class EventEmitter {
  on(event: string, listener: (...args: unknown[]) => void): this
  emit(event: string, ...args: unknown[]): boolean
}

// declare namespace — for namespaced globals
declare namespace NodeJS {
  interface ProcessEnv { [key: string]: string | undefined }
}
```

```typescript
// ── declare module — type a module that has no types ──────────────────────
// In a .d.ts file — type an untyped package
declare module 'some-legacy-package' {
  export function init(options: { debug: boolean }): void
  export function process(data: string): Promise<string>
  export default init
}

// Wildcard module declarations — for asset imports
declare module '*.svg' {
  const content: string
  export default content
}
declare module '*.png' {
  const content: string
  export default content
}
declare module '*.json' {
  const content: Record<string, unknown>
  export default content
}

// After this, imports work:
import logo from './logo.svg'   // type: string ✅
```

```typescript
// ── declare global — extend the global scope ──────────────────────────────
// Adds properties to the global Window, globalThis, or process.env

// In src/types/globals.d.ts (or any .d.ts)
export {}   // make this a module (not a script)

declare global {
  // Extend Window
  interface Window {
    analytics: {
      track(event: string, props?: Record<string, unknown>): void
      identify(userId: string): void
    }
  }

  // Extend process.env (Node.js)
  namespace NodeJS {
    interface ProcessEnv {
      NODE_ENV:     'development' | 'production' | 'test'
      DATABASE_URL: string
      PORT?:        string
      API_KEY?:     string
    }
  }
}

// Usage after declaration:
window.analytics.track('page_view', { url: '/home' })  // ✅
process.env.DATABASE_URL.startsWith('postgresql://')    // ✅
process.env.NODE_ENV === 'production'                   // ✅
process.env.UNDEFINED_VAR  // TS error — not declared ✅
```

```typescript
// ── declare in implementation files ──────────────────────────────────────
// Inside a regular .ts file — for values injected by bundler
declare const __COMMIT_HASH__: string   // injected by vite define

// vite.config.ts:
// define: { __COMMIT_HASH__: JSON.stringify(execSync('git rev-parse HEAD')) }

// Now usable:
console.log(`Version: ${__COMMIT_HASH__}`)   // ✅
```

---

## W — Why It Matters

- `declare global` to type `process.env` variables is essential for safe server code — without it, every `process.env.DATABASE_URL` is `string | undefined` and TypeScript won't catch missing variables at compile time.
- Wildcard module declarations (`declare module '*.svg'`) are how Create React App, Vite, and Next.js make image/SVG imports work — without them, TypeScript would error on every asset import.
- `declare module 'untyped-package'` lets you type a dependency that lacks `@types` — you unblock your TypeScript project in minutes instead of waiting for community types.

---

## I — Interview Q&A

### Q: What is the difference between `declare const` and a regular `const` declaration?

**A:** A regular `const x = value` creates a value and a type — the runtime behaviour happens and TypeScript tracks the type. `declare const x: Type` only tells TypeScript that `x` exists with type `Type` — it creates no runtime code whatsoever. It's used in `.d.ts` declaration files or in `.ts` files when a value is guaranteed to exist at runtime through some external mechanism (bundler injection, global scripts, CDN libraries). The `declare` keyword means "trust me, this exists — don't check for an implementation file."

---

## C — Common Pitfalls + Fix

### ❌ Forgetting `export {}` in a global `.d.ts` — treated as a script

```typescript
// ❌ Without export {}, this is a SCRIPT file — declarations pollute global scope
// src/types/env.d.ts
declare namespace NodeJS {
  interface ProcessEnv { DATABASE_URL: string }
}
// No export {} — this works BUT if you add any import, it becomes a module
// and declarations are no longer global

// ✅ Use export {} to make it a module with explicit global declarations
// src/types/env.d.ts
export {}   // ← makes this a module

declare global {
  namespace NodeJS {
    interface ProcessEnv {
      DATABASE_URL: string
      NODE_ENV: 'development' | 'production' | 'test'
    }
  }
}
// Now safe to add imports AND declare globals ✅
```

---

## K — Coding Challenge + Solution

### Challenge

Write a `globals.d.ts` that: types `window.__APP_CONFIG__` as `{ apiUrl: string; featureFlags: Record<string, boolean> }`, types `process.env` with `DATABASE_URL`, `PORT`, `NODE_ENV`, and declares a wildcard module for `.svg` files.

### Solution

```typescript
// src/types/globals.d.ts
export {}   // module boundary — required for declare global

declare global {
  interface Window {
    __APP_CONFIG__: {
      apiUrl:        string
      featureFlags:  Record<string, boolean>
      version:       string
    }
  }

  namespace NodeJS {
    interface ProcessEnv {
      NODE_ENV:     'development' | 'production' | 'test'
      DATABASE_URL: string
      PORT?:        string
      JWT_SECRET?:  string
    }
  }
}

declare module '*.svg' {
  const ReactComponent: React.FC<React.SVGProps<SVGSVGElement>>
  const src: string
  export { ReactComponent }
  export default src
}

declare module '*.module.css' {
  const styles: Record<string, string>
  export default styles
}

// Usage (in any .ts file in the project):
// window.__APP_CONFIG__.featureFlags['darkMode']   // boolean ✅
// process.env.DATABASE_URL                          // string ✅
// process.env.NODE_ENV === 'production'             // ✅
```

---

---

# 7 — Abstract Classes + Branded Types

---

## T — TL;DR

**Abstract classes** define a shape and partial implementation that subclasses must complete — a contract enforced by the compiler. **Branded types** (nominal types) make structurally identical types incompatible — `UserId` and `OrderId` are both `number` but can't be mixed accidentally. Branding prevents passing wrong IDs to wrong functions.

---

## K — Key Concepts

```typescript
// ── Abstract classes ──────────────────────────────────────────────────────
abstract class Repository<T, ID> {
  abstract findById(id: ID): Promise<T | null>
  abstract findAll(): Promise<T[]>
  abstract save(entity: T): Promise<T>
  abstract delete(id: ID): Promise<void>

  // Concrete method — shared by all subclasses
  async findOrThrow(id: ID): Promise<T> {
    const entity = await this.findById(id)
    if (!entity) throw new Error(`Entity ${id} not found`)
    return entity
  }
}

// Subclass MUST implement all abstract methods — TS error otherwise
class UserRepository extends Repository<User, number> {
  async findById(id: number): Promise<User | null> {
    return db.users.findUnique({ where: { id } }) ?? null
  }
  async findAll(): Promise<User[]>           { return db.users.findMany() }
  async save(user: User): Promise<User>      { return db.users.upsert(user) }
  async delete(id: number): Promise<void>    { await db.users.delete({ where: { id } }) }
  // findOrThrow inherited ✅
}

// Can't instantiate abstract class directly
const repo = new Repository()   // TS error: Cannot create an instance ✅
```

```typescript
// ── Abstract classes vs interfaces ────────────────────────────────────────
// Interface: no implementation, just shape
// Abstract class: can have implementation + force subclass to fill gaps
// Use abstract class when:
//   - Shared implementation exists across variants
//   - Template method pattern (define algorithm structure, fill in steps)
//   - Need constructor logic

abstract class BaseService<T> {
  constructor(protected readonly db: Database) {}

  abstract validate(entity: Partial<T>): void   // subclass fills in

  async create(data: Partial<T>): Promise<T> {
    this.validate(data)    // calls subclass's validate ✅
    return this.db.insert(data)
  }
}
```

```typescript
// ── Branded types ─────────────────────────────────────────────────────────
// TypeScript uses structural typing — two identical structures are the same type
// Brands make structurally identical types nominally distinct

// Brand utility type
type Brand<T, B extends string> = T & { readonly __brand: B }

// Branded primitives
type UserId    = Brand<number, 'UserId'>
type OrderId   = Brand<number, 'OrderId'>
type ProductId = Brand<number, 'ProductId'>
type Email     = Brand<string, 'Email'>
type Slug      = Brand<string, 'Slug'>

// Constructor functions (the only way to create branded values)
const UserId    = (id: number): UserId    => id as UserId
const OrderId   = (id: number): OrderId   => id as OrderId
const Email     = (s: string):  Email     => {
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s)) throw new Error(`Invalid email: ${s}`)
  return s as Email
}

// Usage
function getUser(id: UserId): Promise<User> { ... }
function getOrder(id: OrderId): Promise<Order> { ... }

const userId  = UserId(1)
const orderId = OrderId(1)

getUser(userId)           // ✅
getUser(orderId)          // TS error: OrderId not assignable to UserId ✅
getOrder(userId)          // TS error: UserId not assignable to OrderId ✅
getUser(1)                // TS error: plain number not assignable to UserId ✅
```

```typescript
// ── Branded types with Zod ────────────────────────────────────────────────
import { z } from 'zod'

const UserIdSchema  = z.number().int().positive().brand('UserId')
const EmailSchema   = z.string().email().brand('Email')

type UserId2 = z.infer<typeof UserIdSchema>   // number & { __brand: 'UserId' }
type Email2  = z.infer<typeof EmailSchema>    // string & { __brand: 'Email' }

// Parsing automatically validates AND brands
const userId = UserIdSchema.parse(1)      // UserId2 ✅
const email  = EmailSchema.parse('m@ex.com')  // Email2 ✅
UserIdSchema.parse(-1)   // throws: must be positive ✅
```

---

## W — Why It Matters

- Abstract classes enforce the template method pattern at compile time — a subclass that forgets to implement `validate()` gets a TS error before tests, not a runtime crash when `validate` is called.
- Branded types prevent entire categories of ID-confusion bugs — `deleteUser(orderId)` instead of `deleteUser(userId)` is a real production bug that type checking normally can't catch because both are `number`. Branding makes it a compile error.
- `z.brand()` in Zod combines runtime validation and branded typing in one step — after `UserIdSchema.parse(value)`, you have a `UserId` that is both validated to be a positive integer AND branded to be distinct from other number types.

---

## I — Interview Q&A

### Q: What are branded types and what bug class do they prevent?

**A:** TypeScript uses structural typing — two types with the same shape are interchangeable. `type UserId = number` and `type OrderId = number` are identical structurally, so `getOrder(userId)` typechecks fine even though it's wrong. Branded types add a phantom property (`__brand`) that exists only in the type system (not at runtime) to make structurally identical types distinct. `UserId = number & { __brand: 'UserId' }` — now `UserId` and `OrderId` are incompatible at the type level even though both are numbers at runtime. They prevent ID-confusion bugs, unit confusion (meters vs feet), and validation state confusion (raw string vs validated email).

---

## C — Common Pitfalls + Fix

### ❌ Abstract method not implemented — runtime crash instead of TS error

```typescript
// ❌ Using interface instead of abstract class — no enforcement
interface Processor { process(data: string): string }
class MyProcessor implements Processor {
  // Forgot process() — TypeScript WILL error, but at the class declaration
  // not at the call site
}
// TS error at class declaration: missing 'process' ✅ — actually this works

// The real pitfall: calling abstract method before subclass overrides
abstract class BaseProcessor {
  abstract process(data: string): string
  run(data: string) { return this.process(data) }   // calls abstract ✅
}
// new BaseProcessor() — TS error: cannot instantiate abstract class ✅
```

---

## K — Coding Challenge + Solution

### Challenge

Create branded types for `Meters`, `Feet`, and `Kilograms`. Write conversion functions. Show that `addMeters(1 as Meters, 1 as Feet)` is a compile error. Then write an abstract `Converter<From, To>` class.

### Solution

```typescript
type Brand<T, B extends string> = T & { readonly __brand: B }
type Meters    = Brand<number, 'Meters'>
type Feet      = Brand<number, 'Feet'>
type Kilograms = Brand<number, 'Kilograms'>
type Pounds    = Brand<number, 'Pounds'>

const Meters    = (n: number): Meters    => n as Meters
const Feet      = (n: number): Feet      => n as Feet
const Kilograms = (n: number): Kilograms => n as Kilograms
const Pounds    = (n: number): Pounds    => n as Pounds

function addMeters(a: Meters, b: Meters): Meters {
  return Meters(a + b)
}

addMeters(Meters(5), Meters(3))    // ✅ Meters
addMeters(Meters(5), Feet(3))      // TS error: Feet not assignable to Meters ✅

// Abstract converter
abstract class Converter<From, To> {
  abstract convert(value: From): To
  convertAll(values: From[]): To[] { return values.map(v => this.convert(v)) }
}

class MetersToFeet extends Converter<Meters, Feet> {
  convert(m: Meters): Feet { return Feet(m * 3.28084) }
}
class KilogramsToPounds extends Converter<Kilograms, Pounds> {
  convert(kg: Kilograms): Pounds { return Pounds(kg * 2.20462) }
}

const conv = new MetersToFeet()
conv.convert(Meters(1))                    // Feet(3.28...) ✅
conv.convertAll([Meters(1), Meters(2)])    // Feet[] ✅
```

---

---

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

# 9 — Declaration Merging, Module Augmentation, @types, .d.ts Files

---

## T — TL;DR

**Declaration merging** combines multiple declarations of the same name into one. **Module augmentation** adds types to existing modules. **`@types` packages** provide type definitions for JavaScript libraries. **`.d.ts` files** are pure type declarations — no runtime code. Together they enable typing third-party code and extending library types safely.

---

## K — Key Concepts

```typescript
// ── Declaration merging — interface merging ───────────────────────────────
// Two interfaces with the same name in the same scope merge
interface User { id: number; name: string }
interface User { email: string }
// Merged result: { id: number; name: string; email: string }
const user: User = { id: 1, name: 'Mark', email: 'm@ex.com' }   // ✅

// Function declaration merging (overloads)
function process(x: string): string
function process(x: number): number
// These merge into an overloaded function

// Namespace + class merging — add static members
class Counter { count = 0 }
namespace Counter {
  export const MAX = 100
  export function create() { return new Counter() }
}
Counter.MAX      // 100 ✅ (static-like, added via namespace merging)
Counter.create() // Counter ✅
```

```typescript
// ── Module augmentation ────────────────────────────────────────────────────
// Add types to an existing module's exports

// Augment Express Request — add custom properties
import 'express'
declare module 'express' {
  interface Request {
    user?:       { id: number; role: string }
    requestId:   string
    startTime:   number
  }
}

// Now in your Express middleware:
app.use((req, res, next) => {
  req.requestId = crypto.randomUUID()   // ✅ TypeScript knows this exists
  req.startTime = Date.now()
  next()
})
app.get('/me', (req, res) => {
  req.user?.id   // ✅ optional user from auth middleware
})

// Augment a library type
import 'some-library'
declare module 'some-library' {
  interface Options {
    myPlugin?: boolean   // add custom option ✅
  }
}
```

```typescript
// ── @types packages ───────────────────────────────────────────────────────
// JavaScript libraries that don't ship types → install @types/xxx
npm install --save-dev @types/node
npm install --save-dev @types/express
npm install --save-dev @types/lodash

// @types packages live in node_modules/@types/
// TypeScript automatically includes them (with "typeRoots" default)

// tsconfig.json — control which @types are included
{
  "compilerOptions": {
    "types":      ["node", "vitest/globals"],  // only these @types
    "typeRoots":  ["./node_modules/@types", "./src/types"]
  }
}
// "types": [] without entries disables all automatic @types inclusion
```

```typescript
// ── .d.ts files ───────────────────────────────────────────────────────────
// Pure type declarations — no runtime JavaScript output

// src/types/api.d.ts
export interface ApiConfig {
  baseUrl:     string
  timeout:     number
  apiKey?:     string
}

export interface PaginationParams {
  page:  number
  limit: number
}

// src/types/index.d.ts — re-export all types
export * from './api'
export * from './user'
export * from './errors'

// Auto-generated .d.ts (from tsc --declaration)
// dist/user.d.ts — ships with your library so consumers get types
export declare class UserService {
  findById(id: number): Promise<User | null>
  create(dto: CreateUserDto): Promise<User>
}

// Checking .d.ts source: npm package 'exports' field
// "exports": { ".": { "types": "./dist/index.d.ts", "import": "./dist/index.js" }}
```

---

## W — Why It Matters

- Module augmentation for Express `Request.user` is the correct pattern for adding user data from auth middleware — without it, every route handler needs `(req as any).user` or a cast.
- `@types/node` is required for Node.js built-ins in TypeScript — without it, `process`, `Buffer`, `__dirname`, `fs`, `path` all have no types. It's one of the first installs in any Node.js TS project.
- Publishing a library with `declaration: true` generates `.d.ts` files automatically — consumers get full type safety without you manually writing type definitions. The `types` field in `package.json` points TypeScript to these files.

---

## I — Interview Q&A

### Q: What is the difference between declaration merging and module augmentation?

**A:** Declaration merging happens when two declarations of the same name exist in the same scope — TypeScript combines them. Most importantly, interfaces merge: declaring `interface User { id: number }` and `interface User { name: string }` in the same scope produces one interface with both properties. Module augmentation is a specific use of declaration merging for modules — you `import` or reference an existing module and use `declare module 'module-name' { }` to add new types to it. Module augmentation is how you add properties to Express's `Request`, extend third-party library types, or add custom properties to global browser types.

---

## C — Common Pitfalls + Fix

### ❌ Augmenting a module without first importing it

```typescript
// ❌ Module augmentation without importing the module first
// This creates a NEW module declaration, not an augmentation
declare module 'express' {
  interface Request { user?: User }   // ❌ may create a new empty module, not augment
}

// ✅ Always import the module first in the augmentation file
import 'express'   // or: import { Request } from 'express'
declare module 'express' {
  interface Request { user?: User }   // ✅ augments the real express module
}
```

---

## K — Coding Challenge + Solution

### Challenge

Create a `src/types/` directory structure: `globals.d.ts` (typed env vars), `express.d.ts` (augments Express Request), and `api.d.ts` (shared API types). Show the `tsconfig.json` setup to include them.

### Solution

```typescript
// src/types/env.d.ts
export {}
declare global {
  namespace NodeJS {
    interface ProcessEnv {
      NODE_ENV:     'development' | 'production' | 'test'
      DATABASE_URL: string
      JWT_SECRET:   string
      PORT?:        string
      REDIS_URL?:   string
    }
  }
}

// src/types/express.d.ts
import 'express'
declare module 'express' {
  interface Request {
    user?:      { id: number; email: string; role: 'admin' | 'user' }
    requestId:  string
    startTime:  number
  }
}

// src/types/api.d.ts
export interface PaginatedResponse<T> {
  data:    T[]
  total:   number
  page:    number
  limit:   number
  hasMore: boolean
}

export interface ApiError {
  code:    string
  message: string
  details?: Record<string, string[]>
}
```

```json
// tsconfig.json — include the types directory
{
  "compilerOptions": {
    "typeRoots": ["./node_modules/@types", "./src/types"]
  },
  "include": ["src/**/*"]
}
```

---

---

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