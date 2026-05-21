# 2 — Primitive Schemas — string, number, boolean, date

---

## T — TL;DR

Zod's primitives (`z.string()`, `z.number()`, `z.boolean()`, `z.date()`) are the building blocks of every schema. Each has chainable validation methods — `min`, `max`, `email`, `url`, `int`, `positive` — and each accepts a custom error message as an option.

---

## K — Key Concepts

```ts
import { z } from 'zod'

// ─── z.string()
z.string()
z.string().min(2)                          // min 2 chars
z.string().max(100)                        // max 100 chars
z.string().length(10)                      // exactly 10 chars
z.string().email()                         // valid email format
z.string().url()                           // valid URL
z.string().uuid()                          // valid UUID
z.string().cuid()                          // CUID format
z.string().regex(/^[A-Z]{2}\d{4}$/)        // custom regex
z.string().startsWith('https://')
z.string().endsWith('.pdf')
z.string().includes('@')
z.string().trim()                          // trim whitespace before validation
z.string().toLowerCase()                   // transform to lowercase
z.string().toUpperCase()
z.string().nonempty()                      // min(1) shorthand

// Custom error messages (second argument or .min(n, 'message'))
z.string().min(8, 'Password must be at least 8 characters')
z.string().email({ message: 'Invalid email address' })
```

```ts
// ─── z.number()
z.number()
z.number().min(0)           // >= 0
z.number().max(100)         // <= 100
z.number().positive()       // > 0
z.number().negative()       // < 0
z.number().nonnegative()    // >= 0
z.number().nonpositive()    // <= 0
z.number().int()            // integer (no decimals)
z.number().finite()         // not Infinity
z.number().safe()           // within Number.MIN/MAX_SAFE_INTEGER
z.number().multipleOf(5)    // divisible by 5
z.number().gt(0)            // > 0 (exclusive)
z.number().gte(0)           // >= 0 (inclusive)
z.number().lt(100)
z.number().lte(100)

// Custom message
z.number().int('Must be a whole number')
z.number().positive({ message: 'Price must be positive' })
```

```ts
// ─── z.boolean()
z.boolean()   // true | false only — rejects 0, 1, 'true', 'false'

// ─── z.date()
z.date()
z.date().min(new Date('2000-01-01'), { message: 'Too old' })
z.date().max(new Date(),             { message: 'Cannot be in the future' })

// ─── z.bigint()
z.bigint().min(0n)

// ─── z.undefined() / z.null() / z.never() / z.unknown() / z.any()
z.undefined()  // must be undefined
z.null()       // must be null
z.unknown()    // any value, but you must narrow before use
z.any()        // any value, no narrowing required

// ─── Coercion (v4) — convert string → target type
z.coerce.number()   // "42" → 42     (Number("42"))
z.coerce.boolean()  // "true" → true
z.coerce.date()     // "2024-01-01" → Date object
// Use for form inputs where all values arrive as strings
```

---

## W — Why It Matters

- `z.string().email()` does not just check `@` — it validates the full email format including TLD, double dots, and invalid characters. Replacing regex-based email validation with `.email()` is more reliable.
- `z.coerce.number()` is the Zod equivalent of RHF's `valueAsNumber` — form inputs always produce strings, so you need coercion to get numbers. Use `z.coerce.number()` in schemas paired with RHF for numeric inputs.
- Custom error messages on each rule (`.min(8, 'Too short')`) appear in `result.error.issues[].message` — they map directly to RHF's `errors.field.message` when using `zodResolver`.

---

## I — Interview Q&A

### Q: How does `z.coerce.number()` differ from `z.number()` and when do you use it?

**A:** `z.number()` rejects strings — it only accepts JavaScript `number` type. `z.coerce.number()` runs `Number(value)` before validation, so `"42"` becomes `42` and then passes. Use `z.coerce.number()` when input comes from HTML form fields, URL search params, or any source where numbers arrive as strings. Use `z.number()` when input is already a parsed JavaScript number (API JSON bodies, database values).

---

## C — Common Pitfalls + Fix

### ❌ Using `z.number()` for HTML form inputs — always fails

```ts
// ❌ HTML inputs return strings — z.number() rejects "42"
const Schema = z.object({ age: z.number().min(18) })
Schema.safeParse({ age: '25' })  // fails: expected number, got string
```

**Fix:**

```ts
// ✅ Coerce string → number before validation
const Schema = z.object({ age: z.coerce.number().int().min(18) })
Schema.safeParse({ age: '25' })  // { success: true, data: { age: 25 } }
```

---

## K — Coding Challenge + Solution

### Challenge

Build a `ContactSchema` with: `name` (string, min 2, trimmed), `email` (valid email), `phone` (optional string, regex `^\+?[\d\s-]{7,15}$`), `age` (coerced integer, 13–120), `website` (optional URL). Validate two objects — one valid, one with 3 errors.

### Solution

```ts
import { z } from 'zod'

const ContactSchema = z.object({
  name:    z.string().trim().min(2, 'Name must be at least 2 characters'),
  email:   z.string().email('Invalid email address'),
  phone:   z.string().regex(/^\+?[\d\s-]{7,15}$/, 'Invalid phone number').optional(),
  age:     z.coerce.number().int('Must be a whole number').min(13, 'Must be 13+').max(120),
  website: z.string().url('Invalid URL').optional()
})

type Contact = z.infer<typeof ContactSchema>

// Valid
const valid = ContactSchema.safeParse({
  name: 'Mark Austin', email: 'mark@example.com',
  age: '27', website: 'https://mark.dev'
})
console.log(valid.success) // true
console.log(valid.data?.age) // 27 (number, coerced from string)

// Invalid — 3 errors
const invalid = ContactSchema.safeParse({
  name: 'M', email: 'not-an-email', age: '10'
})
console.log(invalid.success) // false
invalid.error?.issues.forEach(i =>
  console.log(i.path[0], '→', i.message)
)
// name    → Name must be at least 2 characters
// email   → Invalid email address
// age     → Must be 13+
```

---

---
