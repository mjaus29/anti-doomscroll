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
