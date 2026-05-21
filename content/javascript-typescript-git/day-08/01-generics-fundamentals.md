# 1 — Generics Fundamentals

---

## T — TL;DR

**Generics** let you write code that works with multiple types while preserving type information. Instead of `any` (which loses the type), a type parameter `<T>` carries the type through the function/class/interface so callers get back exactly what they put in.

---

## K — Key Concepts

```typescript
// ── Generic function ──────────────────────────────────────────────────────
// Without generics — loses type information
function identity(x: any): any {
  return x;
}
const n = identity(42); // type: any ❌ — lost 'number'

// With generics — type flows through
function identity2<T>(x: T): T {
  return x;
}
const n2 = identity2(42); // type: number ✅ (inferred)
const s2 = identity2("hello"); // type: string ✅
const b2 = identity2<boolean>(true); // explicit annotation

// Multiple type parameters
function pair<A, B>(a: A, b: B): [A, B] {
  return [a, b];
}
const p = pair(1, "hello"); // type: [number, string] ✅

// Generic with array
function first<T>(arr: T[]): T | undefined {
  return arr[0];
}
const f1 = first([1, 2, 3]); // type: number | undefined ✅
const f2 = first(["a", "b"]); // type: string | undefined ✅
const f3 = first<number>([]); // type: number | undefined ✅
```

```typescript
// ── Generic interface ──────────────────────────────────────────────────────
interface ApiResponse<T> {
  data: T;
  status: number;
  message: string;
}

interface Paginated<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
}

// Usage
const userResponse: ApiResponse<User> = {
  data: { id: 1, name: "Mark" },
  status: 200,
  message: "OK",
};
const usersPage: Paginated<User> = {
  items: [{ id: 1, name: "Mark" }],
  total: 1,
  page: 1,
  limit: 20,
};

// Generic type alias
type Result<T, E = Error> =
  | { success: true; value: T }
  | { success: false; error: E };

function divide(a: number, b: number): Result<number> {
  if (b === 0) return { success: false, error: new Error("Division by zero") };
  return { success: true, value: a / b };
}
const r = divide(10, 2);
if (r.success) console.log(r.value); // ✅ narrowed to success branch
```

```typescript
// ── Generic class ──────────────────────────────────────────────────────────
class Stack<T> {
  #items: T[] = [];

  push(item: T): this {
    this.#items.push(item);
    return this;
  }
  pop(): T | undefined {
    return this.#items.pop();
  }
  peek(): T | undefined {
    return this.#items.at(-1);
  }
  get size(): number {
    return this.#items.length;
  }
  isEmpty(): boolean {
    return this.#items.length === 0;
  }
  toArray(): T[] {
    return [...this.#items];
  }
}

const numStack = new Stack<number>();
numStack.push(1).push(2).push(3);
numStack.push("x"); // TS error: string not assignable to number ✅
numStack.peek(); // type: number | undefined ✅

const strStack = new Stack<string>();
strStack.push("hello"); // ✅
```

---

## W — Why It Matters

- Generics are the difference between type-safe reusable code and `any`-polluted code — every utility function (`first`, `last`, `groupBy`, `mapValues`) should be generic to preserve types through transformations.
- `ApiResponse<T>` and `Paginated<T>` are the exact pattern used by tRPC, React Query, and Prisma — understanding generics means you understand how those libraries type their responses.
- Without generics, you'd either write the same function for every type or use `any` and lose safety. Generics give you both reusability and type safety.

---

## I — Interview Q&A

### Q: What is the purpose of a generic type parameter, and how does it differ from using `any`?

**A:** A generic type parameter `<T>` is a placeholder that gets filled in with a specific type when the function/class is used. It preserves type information — if you call `identity<number>(42)`, the return type is `number`, not `any`. With `any`, the type is lost at that point and TypeScript stops checking. Generics let you write one function that works for all types while maintaining complete type safety. Additionally, generics enable constraints (`<T extends string>`) and allow TypeScript to infer the type from usage without explicit annotation.

---

## C — Common Pitfalls + Fix

### ❌ Calling a generic function without inferrable context

```typescript
// ❌ TypeScript can't infer T — defaults to unknown or errors
function createArray<T>(length: number): T[] {
  return new Array(length); // T can't be inferred from arguments ❌
}
const arr = createArray(3); // type: unknown[] — not useful

// ✅ Either provide a fill value or require explicit annotation
function createArray2<T>(length: number, fill: T): T[] {
  return Array.from({ length }, () => fill);
}
const nums = createArray2(3, 0); // type: number[] ✅
const strs = createArray2<string>(3, ""); // explicit ✅
```

---

## K — Coding Challenge + Solution

### Challenge

Write three generic utilities: `wrap<T>(value: T): { value: T }`, `unwrap<T>(wrapped: { value: T }): T`, and `mapResult<T, U>(result: Result<T>, fn: (v: T) => U): Result<U>`.

### Solution

```typescript
type Result<T, E = Error> =
  | { success: true; value: T }
  | { success: false; error: E };

function wrap<T>(value: T): { value: T } {
  return { value };
}
function unwrap<T>(wrapped: { value: T }): T {
  return wrapped.value;
}

function mapResult<T, U>(result: Result<T>, fn: (v: T) => U): Result<U> {
  if (!result.success) return result; // pass through error unchanged
  return { success: true, value: fn(result.value) };
}

const r1 = mapResult({ success: true, value: 42 }, (n) => n * 2);
// { success: true, value: 84 } — type: Result<number> ✅

const r2 = mapResult(
  { success: false, error: new Error("fail") },
  (n) => n * 2
);
// { success: false, error: Error } — unchanged ✅
```

---

---
