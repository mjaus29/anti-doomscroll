# 1 — What is Zod and Why Use It

---

## T — TL;DR

Zod is a **TypeScript-first schema validation library** — you define the shape and rules of your data once as a schema, and Zod validates at runtime AND infers the TypeScript type automatically. One source of truth for both validation and types.

---

## K — Key Concepts

```ts
// ─── The problem Zod solves
// Without Zod: type and validation are separate — they drift apart

// Type (compile-time only)
type User = { email: string; age: number }

// Validation (runtime — written separately, can contradict the type)
function validate(data: unknown) {
  if (typeof data.email !== 'string') throw new Error('bad email')
  if (typeof data.age   !== 'number') throw new Error('bad age')
  // ... easy to forget rules, easy to get out of sync with the type
}

// ─── With Zod: one definition does both
import { z } from 'zod'

const UserSchema = z.object({
  email: z.string().email(),
  age:   z.number().int().min(18)
})

// TypeScript type — inferred automatically, always in sync
type User = z.infer<typeof UserSchema>
// User = { email: string; age: number }

// Runtime validation
const result = UserSchema.safeParse(unknownData)
if (result.success) {
  result.data.email  // typed as string ✅
}
```

```
Zod's role in your stack:

  Form input (string) ──► Zod schema ──► Validated + typed data
                              │
                         TypeScript type (z.infer)
                              │
                         RHF zodResolver (Day 4)
                              │
                         API route body validation
                              │
                         Server Action input validation
```

---

## W — Why It Matters

- Without schema validation, `JSON.parse()` and form data arrive as `unknown` or `any` — TypeScript can't protect you at runtime. Zod bridges compile-time types and runtime safety.
- `z.infer<typeof Schema>` eliminates the pattern of writing a TypeScript interface AND a validation function that can drift apart over time — one schema definition serves both purposes.
- Zod integrates directly with RHF via `@hookform/resolvers/zod` (Day 4) — your form validation and your API validation use the same schema, reducing code duplication.

---

## I — Interview Q&A

### Q: Why use Zod instead of writing TypeScript interfaces and manual validation?

**A:** TypeScript types are erased at runtime — they don't validate data from external sources like API responses, form inputs, or URL params. Zod schemas validate at runtime AND infer TypeScript types automatically via `z.infer`. One schema definition gives you both guarantees. It also gives structured error messages (path + message per field) rather than requiring you to build that error format manually.

---

## C — Common Pitfalls + Fix

### ❌ Writing a separate TypeScript type alongside a Zod schema

```ts
// ❌ Duplicate — type and schema can drift
type User = { email: string; age: number }
const UserSchema = z.object({ email: z.string(), age: z.number() })
```

**Fix:** Infer the type from the schema:

```ts
// ✅ Single source of truth
const UserSchema = z.object({ email: z.string(), age: z.number() })
type User = z.infer<typeof UserSchema>
```

---

## K — Coding Challenge + Solution

### Challenge
Install Zod and create your first schema for a `Product` with `name` (string), `price` (positive number), and `inStock` (boolean). Infer the TypeScript type and validate a valid and invalid object.

### Solution

```ts
// npm install zod
import { z } from 'zod'

const ProductSchema = z.object({
  name:    z.string().min(1),
  price:   z.number().positive(),
  inStock: z.boolean()
})

type Product = z.infer<typeof ProductSchema>
// Product = { name: string; price: number; inStock: boolean }

// Valid
const r1 = ProductSchema.safeParse({ name: 'Laptop', price: 999, inStock: true })
console.log(r1.success) // true
console.log(r1.data)    // { name: 'Laptop', price: 999, inStock: true }

// Invalid
const r2 = ProductSchema.safeParse({ name: '', price: -5, inStock: 'yes' })
console.log(r2.success) // false
console.log(r2.error.issues)
// [
//   { path: ['name'],    message: 'String must contain at least 1 character(s)' },
//   { path: ['price'],   message: 'Number must be greater than 0' },
//   { path: ['inStock'], message: 'Expected boolean, received string' }
// ]
```

---

---
