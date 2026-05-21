# 9 — Overloads + Recursive Types

---

## T — TL;DR

**Function overloads** provide multiple type signatures for one function — different input types → different output types. **Recursive types** reference themselves to describe nested structures like trees, nested objects, and JSON. `DeepPartial` and `DeepReadonly` are the canonical examples.

---

## K — Key Concepts

```typescript
// ── Function overloads ────────────────────────────────────────────────────
// Declare multiple signatures, then one implementation signature
function process(x: string): string;
function process(x: number): number;
function process(x: string | number): string | number {
  if (typeof x === "string") return x.toUpperCase();
  return x * 2;
}
const s = process("hello"); // type: string ✅ (not string|number)
const n = process(42); // type: number ✅

// More realistic: parseInput with different return types
function parseInput(input: string): string;
function parseInput(input: number): number;
function parseInput(input: boolean): boolean;
function parseInput(
  input: string | number | boolean
): string | number | boolean {
  return input; // simplified
}

// Overloads for optional params with different return types
function createElement(tag: "input"): HTMLInputElement;
function createElement(tag: "div"): HTMLDivElement;
function createElement(tag: string): HTMLElement;
function createElement(tag: string): HTMLElement {
  return document.createElement(tag);
}
const inp = createElement("input"); // type: HTMLInputElement ✅
const div = createElement("div"); // type: HTMLDivElement ✅
```

```typescript
// ── Recursive types ───────────────────────────────────────────────────────
// JSON value — recursive definition
type JSONPrimitive = string | number | boolean | null;
type JSONObject = { [key: string]: JSONValue };
type JSONArray = JSONValue[];
type JSONValue = JSONPrimitive | JSONObject | JSONArray;

const json: JSONValue = {
  name: "Mark",
  age: 28,
  tags: ["ts", "node"],
  meta: { nested: { deep: true } }, // ✅ arbitrary depth
};

// ── DeepPartial ───────────────────────────────────────────────────────────
type DeepPartial<T> = T extends (infer E)[]
  ? DeepPartial<E>[]
  : T extends object
    ? { [K in keyof T]?: DeepPartial<T[K]> }
    : T;

interface Config {
  db: { host: string; port: number; ssl: boolean };
  app: { name: string; port: number; debug: boolean };
}

type PartialConfig = DeepPartial<Config>;
// All nested properties optional ✅
const update: PartialConfig = { db: { port: 5433 } }; // only override db.port
```

```typescript
// ── DeepReadonly ──────────────────────────────────────────────────────────
type DeepReadonly<T> = T extends (infer E)[]
  ? ReadonlyArray<DeepReadonly<E>>
  : T extends object
    ? { readonly [K in keyof T]: DeepReadonly<T[K]> }
    : T;

type ImmutableConfig = DeepReadonly<Config>;
const cfg: ImmutableConfig = {
  db: { host: "localhost", port: 5432, ssl: false },
  app: { name: "myapp", port: 3000, debug: true },
};
cfg.db.port = 9999; // TS error: readonly ✅

// ── DeepRequired ──────────────────────────────────────────────────────────
type DeepRequired<T> = T extends object
  ? { [K in keyof T]-?: DeepRequired<T[K]> }
  : T;

// ── Recursive tree type (continued) ───────────────────────────────────────
interface TreeNode<T> {
  value: T;
  children: TreeNode<T>[]; // recursive ✅
}

const tree: TreeNode<string> = {
  value: "root",
  children: [
    { value: "child1", children: [] },
    {
      value: "child2",
      children: [{ value: "grandchild", children: [] }],
    },
  ],
};

// Tree traversal with recursive generic
function mapTree<T, U>(node: TreeNode<T>, fn: (v: T) => U): TreeNode<U> {
  return {
    value: fn(node.value),
    children: node.children.map((child) => mapTree(child, fn)),
  };
}

const upperTree = mapTree(tree, (s) => s.toUpperCase());
// { value: 'ROOT', children: [{ value: 'CHILD1', ... }] } ✅
```

```typescript
// ── Overloads with generics ────────────────────────────────────────────────
// Overloads can mix generics and concrete types
function getOrDefault<T>(map: Map<string, T>, key: string, fallback: T): T;
function getOrDefault<T>(
  map: Map<string, T>,
  key: string,
  fallback?: T
): T | undefined;
function getOrDefault<T>(
  map: Map<string, T>,
  key: string,
  fallback?: T
): T | undefined {
  return map.has(key) ? map.get(key)! : fallback;
}

const m = new Map<string, number>([["a", 1]]);
const v1 = getOrDefault(m, "a", 0); // type: number ✅
const v2 = getOrDefault(m, "x", 0); // type: number ✅ (fallback)
const v3 = getOrDefault(m, "x"); // type: number | undefined ✅

// ── Overload ordering rule ─────────────────────────────────────────────────
// More specific overloads MUST come before less specific ones
function wrap(x: string): { type: "string"; value: string };
function wrap(x: number): { type: "number"; value: number };
function wrap(x: string | number): {
  type: "string" | "number";
  value: string | number;
} {
  return { type: typeof x as "string" | "number", value: x };
}
// The implementation signature is NOT visible to callers
// Callers only see the declared overload signatures above it
```

---

## W — Why It Matters

- Overloads are how DOM APIs like `createElement`, `querySelector`, and `addEventListener` are typed — returning specific element/event types based on string literal arguments. Understanding overloads lets you read and write accurate library definitions.
- `DeepPartial<T>` is the correct type for recursive config patches and merge operations — plain `Partial<T>` only makes the top level optional, silently accepting fully required nested objects.
- Recursive types are how TypeScript types JSON, ASTs, file trees, and any unbounded nesting — without recursion, you'd need to manually define depth-limited types (`Depth1 | Depth2 | Depth3`).

---

## I — Interview Q&A

### Q: What is the overload implementation signature and why can't callers use it?

**A:** When you write function overloads in TypeScript, each `function name(...)` line before the actual `function name(...) { body }` is an overload signature. The final function with a body is the implementation signature. TypeScript only exposes the overload signatures to callers — the implementation signature is internal. This means the implementation signature must be compatible with all overload signatures (often using union types), but callers never see it. The reason: the implementation signature is often intentionally wider (accepts `string | number`) to handle all cases, while the overload signatures give precise per-input types to callers.

---

## C — Common Pitfalls + Fix

### ❌ Overload order: specific after general — general always wins

```typescript
// ❌ General overload first — specific one never reached
function parse(x: string | number): any;
function parse(x: string): string; // ❌ never matched — above already consumed it
function parse(x: any): any {
  return x;
}

// ✅ Specific overloads FIRST, general LAST
function parse2(x: string): string;
function parse2(x: number): number;
function parse2(x: string | number): string | number {
  return x;
}

parse2("hello"); // type: string ✅
parse2(42); // type: number ✅
```

---

## K — Coding Challenge + Solution

### Challenge

Write `DeepPartial<T>`, `DeepReadonly<T>`, and `DeepRequired<T>`. Then write an overloaded `toArray<T>` that returns `T[]` when given a single `T` value and `T[]` unchanged when given `T[]`.

### Solution

```typescript
// ── Recursive utility types ────────────────────────────────────────────────
type DeepPartial<T> = T extends (infer E)[]
  ? DeepPartial<E>[]
  : T extends object
    ? { [K in keyof T]?: DeepPartial<T[K]> }
    : T;

type DeepReadonly<T> = T extends (infer E)[]
  ? ReadonlyArray<DeepReadonly<E>>
  : T extends object
    ? { readonly [K in keyof T]: DeepReadonly<T[K]> }
    : T;

type DeepRequired<T> = T extends (infer E)[]
  ? DeepRequired<E>[]
  : T extends object
    ? { [K in keyof T]-?: DeepRequired<T[K]> }
    : T;

// Verify
interface Settings {
  ui: { theme: string; fontSize?: number };
  api: { url: string; timeout: number; retries?: number };
}
type PS = DeepPartial<Settings>; // all nested properties optional ✅
type RS = DeepReadonly<Settings>; // all nested properties readonly ✅
type RQS = DeepRequired<Settings>; // all nested properties required ✅

// ── Overloaded toArray ────────────────────────────────────────────────────
function toArray<T>(value: T): T[];
function toArray<T>(value: T[]): T[];
function toArray<T>(value: T | T[]): T[] {
  return Array.isArray(value) ? value : [value];
}

toArray("hello"); // type: string[]  ✅
toArray([1, 2, 3]); // type: number[]  ✅
toArray({ id: 1 }); // type: { id: number }[] ✅
```

---

---
