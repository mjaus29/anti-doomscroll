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
