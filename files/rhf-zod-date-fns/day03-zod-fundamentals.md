
# 📅 Day 3 — Zod Fundamentals (Zod v4.3.6)

> **Goal:** Build type-safe validation schemas from primitives to complex objects. Understand parse vs safeParse, compose schemas, and infer TypeScript types — all without writing a separate type definition.
> **Format:** Each subtopic = 5–15 min. Do one. Stop. Come back.
> **Stack version:** zod v4.3.6 · TypeScript 6

---

## 📋 Day 3 Subtopic Overview

| # | Subtopic | Time |
|---|----------|------|
| 1 | What is Zod and Why Use It | 8 min |
| 2 | Primitive Schemas — string, number, boolean, date | 10 min |
| 3 | Objects — `z.object`, shape, strict, passthrough | 12 min |
| 4 | Arrays — `z.array`, min, max, nonempty | 8 min |
| 5 | Enums and Literals | 8 min |
| 6 | Optional, Nullable, and Default Values | 10 min |
| 7 | `parse` vs `safeParse` | 10 min |
| 8 | Schema Composition — extend, merge, pick, omit, partial | 12 min |
| 9 | TypeScript Inference — `z.infer` | 10 min |

---

---

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

# 3 — Objects — `z.object`, shape, strict, passthrough

---

## T — TL;DR

`z.object(shape)` validates a plain JavaScript object. By default Zod **strips** unknown keys from the output. Use `.strict()` to reject unknown keys, `.passthrough()` to keep them, and `.catchall(schema)` to validate all extra keys against a schema.

---

## K — Key Concepts

```ts
import { z } from 'zod'

// ─── Basic object
const UserSchema = z.object({
  id:    z.string().uuid(),
  name:  z.string().min(1),
  email: z.string().email(),
  role:  z.enum(['admin', 'user', 'guest'])
})

// ─── Accessing the shape
UserSchema.shape.name   // z.ZodString
UserSchema.shape.email  // z.ZodString

// ─── Unknown key handling (3 modes)

// Default: STRIP — unknown keys removed from output silently
const strip = z.object({ name: z.string() })
strip.parse({ name: 'Mark', extra: 'ignored' })
// → { name: 'Mark' }  (extra removed)

// STRICT — unknown keys cause a validation ERROR
const strict = z.object({ name: z.string() }).strict()
strict.safeParse({ name: 'Mark', extra: 'not allowed' })
// → { success: false, error: ... 'Unrecognized key(s): extra' }

// PASSTHROUGH — unknown keys kept in output
const pass = z.object({ name: z.string() }).passthrough()
pass.parse({ name: 'Mark', extra: 'kept' })
// → { name: 'Mark', extra: 'kept' }

// CATCHALL — validate all extra keys against a schema
const catchAll = z.object({ name: z.string() }).catchall(z.string())
catchAll.parse({ name: 'Mark', meta1: 'ok', meta2: 'ok' })
// All extra keys must be strings ✅
```

```ts
// ─── Nested objects
const AddressSchema = z.object({
  street: z.string(),
  city:   z.string(),
  zip:    z.string().regex(/^\d{5}$/, 'ZIP must be 5 digits'),
  country: z.string().length(2)
})

const ProfileSchema = z.object({
  user:    UserSchema,
  address: AddressSchema,
  tags:    z.array(z.string())
})

type Profile = z.infer<typeof ProfileSchema>
// Profile = { user: { id, name, email, role }, address: {...}, tags: string[] }

// ─── keyof — get literal union of field names
UserSchema.keyof()
// ZodEnum<['id', 'name', 'email', 'role']>
```

---

## W — Why It Matters

- The default **strip** behaviour is safe for API input — unknown fields from clients are dropped silently, preventing prototype pollution and unexpected data in your database.
- **strict** mode is best for configuration objects and internal function contracts where unexpected keys indicate a bug — you want to fail loudly.
- Nested schemas (composing `AddressSchema` inside `ProfileSchema`) keep individual schemas reusable and testable in isolation — validate just an address without the rest of the profile.

---

## I — Interview Q&A

### Q: How does Zod handle unknown keys in `z.object` by default, and how do you change the behaviour?

**A:** By default Zod **strips** unknown keys — they're silently removed from the parsed output. This is safe for user input (extra fields are dropped). Use `.strict()` to throw a validation error if any unknown key is present — good for internal configuration objects. Use `.passthrough()` to include unknown keys in the output unchanged. Use `.catchall(schema)` to validate that all extra keys conform to a specific schema.

---

## C — Common Pitfalls + Fix

### ❌ Expecting unknown keys to appear in output with default `z.object`

```ts
// ❌ Data has 'createdAt' but it's stripped — never appears in output
const Schema = z.object({ name: z.string() })
const result = Schema.parse({ name: 'Mark', createdAt: '2024-01-01' })
console.log(result.createdAt)  // undefined — stripped! ❌
```

**Fix:** Use `.passthrough()` or add the key to the schema:

```ts
// ✅ Add to schema
const Schema = z.object({ name: z.string(), createdAt: z.string() })
// or ✅ Keep all extra keys
const Schema = z.object({ name: z.string() }).passthrough()
```

---

## K — Coding Challenge + Solution

### Challenge

Create a `ServerConfigSchema` (`.strict()`) with: `host` (string URL), `port` (integer 1–65535), `timeout` (number, default 30), `db` (nested object with `url` string and `poolSize` positive integer). Validate a valid config and one with an unknown key — prove strict mode rejects it.

### Solution

```ts
import { z } from 'zod'

const ServerConfigSchema = z.object({
  host:    z.string().url(),
  port:    z.number().int().min(1).max(65535),
  timeout: z.number().positive().default(30),
  db: z.object({
    url:      z.string().url(),
    poolSize: z.number().int().positive()
  })
}).strict()

type ServerConfig = z.infer<typeof ServerConfigSchema>

// Valid
const r1 = ServerConfigSchema.safeParse({
  host: 'https://api.example.com', port: 8080,
  db:   { url: 'postgres://localhost/app', poolSize: 10 }
})
console.log(r1.success)         // true
console.log(r1.data?.timeout)   // 30 (default applied)

// Unknown key — strict rejects it
const r2 = ServerConfigSchema.safeParse({
  host: 'https://api.example.com', port: 8080,
  unknownKey: 'not allowed',
  db: { url: 'postgres://localhost/app', poolSize: 10 }
})
console.log(r2.success)  // false
console.log(r2.error?.issues[0].message)  // 'Unrecognized key(s): unknownKey'
```

---

---

# 4 — Arrays — `z.array`, min, max, nonempty

---

## T — TL;DR

`z.array(itemSchema)` validates an array where every element must match `itemSchema`. Chain `.min()`, `.max()`, `.length()`, and `.nonempty()` to constrain the array itself. Use `.element` to access the item schema.

---

## K — Key Concepts

```ts
import { z } from 'zod'

// ─── Basic array
z.array(z.string())           // string[]
z.array(z.number())           // number[]
z.array(z.object({ id: z.string(), label: z.string() }))

// ─── Array constraints
z.array(z.string()).min(1)    // at least 1 item
z.array(z.string()).max(10)   // at most 10 items
z.array(z.string()).length(3) // exactly 3 items
z.array(z.string()).nonempty()// at least 1 item (shorthand for min(1))
// nonempty() also narrows the type to [string, ...string[]]

// Custom messages
z.array(z.string()).min(1, 'Select at least one option')
z.array(z.string()).max(5, 'Maximum 5 tags allowed')

// ─── Accessing the element schema
const TagsSchema  = z.array(z.string().min(1))
TagsSchema.element  // z.ZodString — the item schema

// ─── Tuple — fixed-length array with typed positions
const PointSchema = z.tuple([z.number(), z.number()])
// [number, number]
PointSchema.parse([10.5, 20.3])   // ✅
PointSchema.parse([10.5, 'bad'])  // ❌

// Tuple with rest
const VarArgs = z.tuple([z.string(), z.number()]).rest(z.boolean())
// [string, number, ...boolean[]]
```

```ts
// ─── Arrays inside objects
const FormSchema = z.object({
  title:       z.string().min(1),
  tags:        z.array(z.string().min(1).max(20)).max(5),
  attachments: z.array(z.object({
    name: z.string(),
    url:  z.string().url(),
    size: z.number().positive()
  })).optional()
})

// ─── Transforming arrays
const UniqueTagsSchema = z.array(z.string())
  .transform(tags => [...new Set(tags)])  // remove duplicates
```

---

## W — Why It Matters

- `.nonempty()` not only validates but also **narrows the TypeScript type** to a non-empty tuple `[T, ...T[]]` — downstream code gets the guarantee that `array[0]` exists without a `?` check.
- Array schemas are essential for multi-select inputs, tag fields, and checklist forms — each item in the array gets individually validated against the element schema, with precise error paths (`items[2].name`).
- `.transform(arr => [...new Set(arr)])` deduplication in the schema means your API handler never needs to deduplicate manually — the parsed output is already clean.

---

## I — Interview Q&A

### Q: What is the TypeScript difference between `z.array(z.string()).min(1)` and `z.array(z.string()).nonempty()`?

**A:** Both reject empty arrays at runtime. But `nonempty()` additionally narrows the TypeScript type to `[string, ...string[]]` — a tuple with at least one element. This means TypeScript knows `result[0]` is always defined. `min(1)` validates but leaves the type as `string[]`, so TypeScript still considers `result[0]` potentially `undefined`. Use `nonempty()` when downstream code reads the first element without a null check.

---

## C — Common Pitfalls + Fix

### ❌ Forgetting to validate array items — accepting any values

```ts
// ❌ Accepts any array — items are not validated
const Schema = z.object({ tags: z.array(z.any()) })
Schema.parse({ tags: [1, null, {}, 'valid'] })  // all pass ❌
```

**Fix:** Always type the element schema:

```ts
// ✅ Each item validated as a non-empty string
const Schema = z.object({ tags: z.array(z.string().min(1)) })
```

---

## K — Coding Challenge + Solution

### Challenge

Build an `InvoiceSchema` with: `lineItems` (array of `{ description: string, qty: positive int, unitPrice: positive number }`, at least 1 item), `tags` (array of strings, max 3, each max 20 chars, optional). Validate a valid invoice and one with an empty `lineItems` array.

### Solution

```ts
import { z } from 'zod'

const LineItemSchema = z.object({
  description: z.string().min(1, 'Description required'),
  qty:         z.number().int().positive('Quantity must be positive'),
  unitPrice:   z.number().positive('Price must be positive')
})

const InvoiceSchema = z.object({
  lineItems: z.array(LineItemSchema).nonempty('At least one line item required'),
  tags:      z.array(z.string().max(20)).max(3).optional()
})

type Invoice = z.infer<typeof InvoiceSchema>

// Valid
const r1 = InvoiceSchema.safeParse({
  lineItems: [{ description: 'Design work', qty: 2, unitPrice: 150 }],
  tags: ['design', 'consulting']
})
console.log(r1.success)  // true

// Empty lineItems
const r2 = InvoiceSchema.safeParse({ lineItems: [] })
console.log(r2.success)  // false
console.log(r2.error?.issues[0].message)  // 'At least one line item required'

// Invalid item
const r3 = InvoiceSchema.safeParse({
  lineItems: [{ description: '', qty: -1, unitPrice: 50 }]
})
console.log(r3.error?.issues.map(i => `${i.path.join('.')} → ${i.message}`))
// ['lineItems.0.description → Description required', 'lineItems.0.qty → Quantity must be positive']
```

---

---

# 5 — Enums and Literals

---

## T — TL;DR

`z.enum(['a', 'b', 'c'])` validates that a value is one of a fixed set of strings and infers the literal union type. `z.literal('exact')` validates a single exact value. Use `z.nativeEnum` to integrate TypeScript `enum` declarations.

---

## K — Key Concepts

```ts
import { z } from 'zod'

// ─── z.enum — string literal union
const RoleSchema = z.enum(['admin', 'editor', 'viewer'])
type Role = z.infer<typeof RoleSchema>
// Role = 'admin' | 'editor' | 'viewer'

RoleSchema.parse('admin')    // ✅ 'admin'
RoleSchema.parse('superuser')// ❌ throws

// Access enum values as a const (useful for UI select options)
RoleSchema.options  // ['admin', 'editor', 'viewer'] (readonly array)
RoleSchema.enum     // { admin: 'admin', editor: 'editor', viewer: 'viewer' }

// ─── z.literal — exact value
const TrueSchema  = z.literal(true)
const FiveSchema  = z.literal(5)
const HelloSchema = z.literal('hello')

// Literal union (discriminated union building block)
const StatusSchema = z.union([
  z.literal('pending'),
  z.literal('active'),
  z.literal('archived')
])
type Status = z.infer<typeof StatusSchema>
// 'pending' | 'active' | 'archived'

// ─── z.nativeEnum — TypeScript enum integration
enum Direction { Up = 'UP', Down = 'DOWN', Left = 'LEFT', Right = 'RIGHT' }
const DirectionSchema = z.nativeEnum(Direction)
type Dir = z.infer<typeof DirectionSchema>
// Direction (the TypeScript enum type)

DirectionSchema.parse(Direction.Up)  // ✅
DirectionSchema.parse('UP')          // ✅ (string value matches)
DirectionSchema.parse('up')          // ❌ case-sensitive
```

```ts
// ─── Enum with custom error
const PrioritySchema = z.enum(['low', 'medium', 'high'], {
  errorMap: () => ({ message: 'Priority must be low, medium, or high' })
})

// ─── Using enum values in UI
const ROLES = RoleSchema.options  // ['admin', 'editor', 'viewer']
// Use in a <select> or radio group
```

---

## W — Why It Matters

- `z.enum` infers a literal union type automatically — no need to write `type Role = 'admin' | 'editor' | 'viewer'` separately. The schema IS the type definition.
- `RoleSchema.options` gives you the valid values as an array — use it to populate `<select>` options or radio buttons, ensuring your UI and validation are always in sync.
- `z.nativeEnum` is the bridge for codebases that already use TypeScript `enum` declarations — you get schema validation without rewriting existing enums.

---

## I — Interview Q&A

### Q: What is the difference between `z.enum` and `z.nativeEnum`?

**A:** `z.enum` takes a plain string array (`['a', 'b', 'c']`) and infers a literal union type. It's the Zod-native approach — no TypeScript `enum` keyword needed. `z.nativeEnum` wraps an existing TypeScript `enum` declaration, accepting both the enum member (`Direction.Up`) and its underlying string/number value (`'UP'`). Use `z.enum` for new code. Use `z.nativeEnum` when integrating with existing TypeScript enums from your codebase or a third-party library.

---

## C — Common Pitfalls + Fix

### ❌ Defining a separate TypeScript union type alongside `z.enum`

```ts
// ❌ Duplicate — they can drift
type Role = 'admin' | 'editor' | 'viewer'
const RoleSchema = z.enum(['admin', 'editor', 'viewer'])
```

**Fix:** Infer from the schema:

```ts
// ✅
const RoleSchema = z.enum(['admin', 'editor', 'viewer'])
type Role = z.infer<typeof RoleSchema>  // 'admin' | 'editor' | 'viewer'
```

---

## K — Coding Challenge + Solution

### Challenge

Build a `TaskSchema` with: `status` (enum: `'todo' | 'in-progress' | 'done'`), `priority` (enum: `'low' | 'medium' | 'high'`), `type` (native TypeScript enum: `Bug | Feature | Chore`). Export `STATUS_OPTIONS` and `PRIORITY_OPTIONS` arrays for use in a select. Test that an invalid status is rejected.

### Solution

```ts
import { z } from 'zod'

// TypeScript enum
enum TaskType { Bug = 'BUG', Feature = 'FEATURE', Chore = 'CHORE' }

const StatusSchema   = z.enum(['todo', 'in-progress', 'done'])
const PrioritySchema = z.enum(['low', 'medium', 'high'])
const TypeSchema     = z.nativeEnum(TaskType)

// Export arrays for UI select options
export const STATUS_OPTIONS   = StatusSchema.options
  // ['todo', 'in-progress', 'done']
export const PRIORITY_OPTIONS = PrioritySchema.options
  // ['low', 'medium', 'high']

const TaskSchema = z.object({
  title:    z.string().min(1),
  status:   StatusSchema,
  priority: PrioritySchema,
  type:     TypeSchema
})

type Task = z.infer<typeof TaskSchema>

// Valid
console.log(TaskSchema.safeParse({
  title: 'Fix login bug', status: 'in-progress',
  priority: 'high', type: TaskType.Bug
}).success)  // true

// Invalid status
const r = TaskSchema.safeParse({
  title: 'Fix', status: 'done-ish', priority: 'low', type: TaskType.Chore
})
console.log(r.error?.issues[0].message)
// "Invalid enum value. Expected 'todo' | 'in-progress' | 'done', received 'done-ish'"
```

---

---

# 6 — Optional, Nullable, and Default Values

---

## T — TL;DR

`.optional()` allows `undefined`. `.nullable()` allows `null`. `.nullish()` allows both. `.default(value)` supplies a fallback when the input is `undefined`. These modifiers compose with any Zod schema and change the inferred TypeScript type accordingly.

---

## K — Key Concepts

```ts
import { z } from 'zod'

// ─── optional — adds | undefined to the type
const Schema = z.object({
  name:    z.string(),              // string (required)
  bio:     z.string().optional(),   // string | undefined
  website: z.string().url().optional() // string | undefined
})

type S = z.infer<typeof Schema>
// { name: string; bio?: string | undefined; website?: string | undefined }

// ─── nullable — adds | null to the type
const NullSchema = z.object({
  name:      z.string(),
  deletedAt: z.date().nullable()   // Date | null
})

// ─── nullish — adds | null | undefined (both)
const NullishSchema = z.string().nullish()
// string | null | undefined

// ─── default — replaces undefined with the fallback value
const WithDefaults = z.object({
  role:      z.string().default('user'),
  active:    z.boolean().default(true),
  createdAt: z.date().default(() => new Date())  // factory for complex defaults
})

WithDefaults.parse({})
// { role: 'user', active: true, createdAt: Date }

WithDefaults.parse({ role: 'admin' })
// { role: 'admin', active: true, createdAt: Date }
// undefined fields are replaced by defaults ✅
```

```ts
// ─── Removing modifiers (unwrapping)
const optStr = z.string().optional()
optStr.unwrap()  // z.ZodString — removes optional wrapper

const defStr = z.string().default('hello')
defStr.removeDefault()  // z.ZodString

// ─── Optional vs default
// optional: undefined is VALID and passes through as undefined
// default:  undefined is replaced with the fallback — output is never undefined

// ─── Combining
z.string().optional().default('anonymous')
// If undefined → 'anonymous'; if string → that string

// ─── In forms: optional fields that can be empty strings
z.object({
  website: z.string().url().optional().or(z.literal(''))
  // Accepts valid URL OR empty string OR undefined
})
```

---

## W — Why It Matters

- `.optional()` vs `.nullable()` maps directly to your database schema — nullable columns in Postgres → `.nullable()` in Zod; omittable fields in a request body → `.optional()`.
- `.default()` means the parsed output type is no longer `T | undefined` — it's just `T`. This is important when using inferred types further down the chain because you don't need to null-check defaulted fields.
- The `or(z.literal(''))` pattern handles a common form UX problem: empty optional URL fields — HTML inputs submit an empty string, not `undefined`, but you don't want to validate an empty string as an invalid URL.

---

## I — Interview Q&A

### Q: What is the difference between `.optional()` and `.default()` in Zod?

**A:** `.optional()` makes `undefined` a valid input value — the field can be omitted and the output will also be `undefined`. The inferred type becomes `T | undefined`. `.default(value)` also accepts `undefined` as input, but **replaces it** with the default value in the output — the output is always `T`, never `undefined`. Use `.optional()` when your downstream code should handle missing values. Use `.default()` when you want guaranteed output that downstream code can use without null checks.

---

## C — Common Pitfalls + Fix

### ❌ Using `.optional()` for an empty-string URL field — empty string fails URL validation

```ts
// ❌ "" is not undefined — z.string().url().optional() rejects ""
const Schema = z.object({ website: z.string().url().optional() })
Schema.safeParse({ website: '' })  // fails: invalid URL ❌
```

**Fix:** Accept empty string OR valid URL:

```ts
// ✅ Empty string or valid URL or undefined
const Schema = z.object({
  website: z.union([z.string().url(), z.literal('')]).optional()
})
Schema.safeParse({ website: '' })                       // ✅
Schema.safeParse({ website: 'https://example.com' })    // ✅
Schema.safeParse({ website: undefined })                // ✅
```

---

## K — Coding Challenge + Solution

### Challenge

Build a `UserProfileSchema` with: `username` (required, min 3), `displayName` (optional string), `bio` (optional, max 160, default `''`), `avatarUrl` (nullable URL — can be `null` for "no avatar"), `role` (enum, default `'viewer'`), `active` (boolean, default `true`). Parse an empty object and confirm all defaults apply.

### Solution

```ts
import { z } from 'zod'

const UserProfileSchema = z.object({
  username:    z.string().min(3, 'Min 3 characters'),
  displayName: z.string().optional(),
  bio:         z.string().max(160).default(''),
  avatarUrl:   z.string().url().nullable(),
  role:        z.enum(['admin', 'editor', 'viewer']).default('viewer'),
  active:      z.boolean().default(true)
})

type UserProfile = z.infer<typeof UserProfileSchema>
// {
//   username:    string
//   displayName?: string | undefined
//   bio:         string              ← never undefined (has default)
//   avatarUrl:   string | null       ← can be null
//   role:        'admin'|'editor'|'viewer'
//   active:      boolean
// }

// Minimal input — defaults apply
const r1 = UserProfileSchema.safeParse({ username: 'markdev', avatarUrl: null })
console.log(r1.success)          // true
console.log(r1.data?.bio)        // ''         (default)
console.log(r1.data?.role)       // 'viewer'   (default)
console.log(r1.data?.active)     // true       (default)
console.log(r1.data?.avatarUrl)  // null       (valid)

// Full input
const r2 = UserProfileSchema.safeParse({
  username: 'markdev', displayName: 'Mark Austin',
  bio: 'Fullstack dev', avatarUrl: 'https://cdn.example.com/avatar.jpg',
  role: 'editor', active: true
})
console.log(r2.success)  // true
```

---

---

# 7 — `parse` vs `safeParse`

---

## T — TL;DR

`schema.parse(data)` throws a `ZodError` on failure. `schema.safeParse(data)` never throws — it returns `{ success: true, data }` or `{ success: false, error }`. Use `safeParse` in forms, API handlers, and anywhere errors should be handled gracefully.

---

## K — Key Concepts

```ts
import { z } from 'zod'

const Schema = z.object({ name: z.string().min(2), age: z.number().int().min(18) })

// ─── parse — throws ZodError on failure
try {
  const data = Schema.parse({ name: 'M', age: 15 })  // throws
} catch (err) {
  if (err instanceof z.ZodError) {
    console.log(err.issues)
    // [
    //   { code: 'too_small', path: ['name'], message: 'String must contain at least 2 character(s)' },
    //   { code: 'too_small', path: ['age'],  message: 'Number must be greater than or equal to 18' }
    // ]
    err.flatten()
    // { fieldErrors: { name: ['String must…'], age: ['Number must…'] }, formErrors: [] }
  }
}

// ─── safeParse — never throws
const result = Schema.safeParse({ name: 'M', age: 15 })

if (result.success) {
  // TypeScript narrows: result.data is typed
  console.log(result.data.name)  // string
} else {
  // TypeScript narrows: result.error is ZodError
  result.error.issues         // ZodIssue[]
  result.error.flatten()      // { fieldErrors, formErrors }
  result.error.format()       // nested error object
}

// ─── parseAsync / safeParseAsync — for schemas with async refinements
const AsyncSchema = z.object({
  username: z.string().refine(async v => {
    const taken = await checkUsername(v)
    return !taken
  }, 'Username taken')
})

const res = await AsyncSchema.safeParseAsync({ username: 'mark' })
```

```ts
// ─── ZodError helpers

const err = result.error  // ZodError

// .issues — flat array of all errors
err.issues
// [{ code, path, message, ... }]

// .flatten() — grouped by field (best for forms)
err.flatten()
// {
//   formErrors:  string[]          — errors with no field path
//   fieldErrors: { [field]: string[] }  — errors per field
// }

// .format() — nested object matching input shape
err.format()
// {
//   _errors: [],
//   name: { _errors: ['String must contain at least 2 character(s)'] },
//   age:  { _errors: ['Number must be greater than or equal to 18'] }
// }
```

---

## W — Why It Matters

- `safeParse` is the correct default — throwing errors in form handlers or API routes breaks the request/response cycle unless you have perfect try/catch coverage. `safeParse` returns a result object you control.
- `error.flatten()` produces `{ fieldErrors: { field: string[] } }` — this maps directly to RHF's error structure when manually integrating Zod with forms (without `zodResolver`).
- `parseAsync` / `safeParseAsync` is required for schemas with async `.refine()` calls — calling synchronous `parse` on an async schema throws immediately.

---

## I — Interview Q&A

### Q: When would you use `parse` instead of `safeParse`?

**A:** Use `parse` when failure is a programming error that should crash loudly — for example, validating a hardcoded configuration object at startup, or validating environment variables at boot time. If the schema fails, the app should not start. Use `safeParse` everywhere else — user input, API request bodies, external API responses — where failure is an expected runtime condition you handle gracefully by returning validation errors to the caller.

---

## C — Common Pitfalls + Fix

### ❌ Using `parse` in an API route — unhandled ZodError crashes the handler

```ts
// ❌ Throws ZodError — crashes the handler unless caught
export async function POST(req: Request) {
  const body = await req.json()
  const data = Schema.parse(body)  // throws on invalid input ❌
  await db.insert(data)
  return Response.json({ ok: true })
}
```

**Fix:** Use `safeParse` and return a 400 on failure:

```ts
// ✅
export async function POST(req: Request) {
  const body   = await req.json()
  const result = Schema.safeParse(body)
  if (!result.success) {
    return Response.json({ errors: result.error.flatten() }, { status: 400 })
  }
  await db.insert(result.data)
  return Response.json({ ok: true })
}
```

---

## K — Coding Challenge + Solution

### Challenge

Build a Next.js API route handler that: accepts `POST` with a JSON body `{ email, password }`, validates with `safeParse`, returns 400 with `fieldErrors` on failure, returns 200 with `{ token }` on success. Demonstrate both branches.

### Solution

```ts
// src/app/api/auth/login/route.ts
import { z } from 'zod'

const LoginSchema = z.object({
  email:    z.string().email('Invalid email'),
  password: z.string().min(8, 'Password must be at least 8 characters')
})

export async function POST(req: Request) {
  const body   = await req.json().catch(() => null)
  const result = LoginSchema.safeParse(body)

  if (!result.success) {
    return Response.json(
      { errors: result.error.flatten().fieldErrors },
      { status: 400 }
    )
    // Body: { errors: { email: ['Invalid email'], password: ['...'] } }
  }

  // result.data is fully typed: { email: string, password: string }
  const { email, password } = result.data

  // Mock auth
  if (email !== 'mark@example.com' || password !== 'password123') {
    return Response.json({ errors: { root: ['Invalid credentials'] } }, { status: 401 })
  }

  return Response.json({ token: 'mock-jwt-token' }, { status: 200 })
}

// Test cases (curl equivalent):
// POST { email: 'bad', password: '123' }
// → 400 { errors: { email: ['Invalid email'], password: ['...8 chars'] } }
//
// POST { email: 'mark@example.com', password: 'password123' }
// → 200 { token: 'mock-jwt-token' }
```

---

---

# 8 — Schema Composition — extend, merge, pick, omit, partial

---

## T — TL;DR

Zod schemas are composable — build a base schema and derive variants using `.extend()`, `.merge()`, `.pick()`, `.omit()`, and `.partial()`. This enables a DRY schema hierarchy: one base `UserSchema` that spawns `CreateUserSchema`, `UpdateUserSchema`, and `PublicUserSchema`.

---

## K — Key Concepts

```ts
import { z } from 'zod'

const BaseUserSchema = z.object({
  id:        z.string().uuid(),
  name:      z.string().min(1),
  email:     z.string().email(),
  role:      z.enum(['admin', 'user']).default('user'),
  createdAt: z.date()
})

// ─── extend — add fields to an existing schema
const UserWithProfileSchema = BaseUserSchema.extend({
  bio:       z.string().max(160).optional(),
  avatarUrl: z.string().url().nullable()
})
// Extends BaseUserSchema + adds bio + avatarUrl

// ─── omit — remove specific fields
const CreateUserSchema = BaseUserSchema.omit({ id: true, createdAt: true })
// { name, email, role } — id and createdAt excluded (server-generated)

// ─── pick — keep only specific fields
const PublicUserSchema = BaseUserSchema.pick({ id: true, name: true, role: true })
// { id, name, role } — only public fields

// ─── partial — make ALL fields optional (useful for PATCH/update)
const UpdateUserSchema = BaseUserSchema.partial()
// { id?, name?, email?, role?, createdAt? } — all optional

// partial on specific fields only
const PatchUserSchema = BaseUserSchema.partial({ name: true, role: true })
// { id, email, createdAt } required + { name?, role? } optional

// ─── required — inverse of partial (make all optional fields required)
const StrictSchema = UpdateUserSchema.required()

// ─── merge — combine two object schemas
const AddressSchema = z.object({ street: z.string(), city: z.string() })
const UserAddressSchema = BaseUserSchema.merge(AddressSchema)
// All fields from both schemas (AddressSchema overwrites if keys clash)
```

```ts
// ─── Practical: full CRUD schema hierarchy
const ProductSchema = z.object({
  id:          z.string().uuid(),
  name:        z.string().min(1),
  price:       z.number().positive(),
  description: z.string().optional(),
  active:      z.boolean().default(true),
  createdAt:   z.date()
})

// CREATE: exclude server-generated fields
const CreateProductSchema = ProductSchema.omit({ id: true, createdAt: true })

// UPDATE (PUT): same as create
const UpdateProductSchema = CreateProductSchema

// PATCH: all fields optional
const PatchProductSchema = CreateProductSchema.partial()

// LIST RESPONSE: public fields only
const ProductListItemSchema = ProductSchema.pick({ id: true, name: true, price: true, active: true })

type CreateProduct   = z.infer<typeof CreateProductSchema>
type PatchProduct    = z.infer<typeof PatchProductSchema>
type ProductListItem = z.infer<typeof ProductListItemSchema>
```

---

## W — Why It Matters

- The CRUD schema hierarchy (base → omit for create → partial for patch) is the most common real-world Zod pattern. It eliminates repeated field definitions and keeps validation consistent across endpoints.
- `.extend()` is safer than `.merge()` for most cases — `.extend()` on a Zod object produces a new object schema while preserving the original. `.merge()` is best when combining two independently defined schemas.
- `partial()` with specific keys (`.partial({ name: true })`) is exactly the TypeScript `Partial<Pick<T, 'name'>>` equivalent in schema form — precise field optionality for PATCH endpoints.

---

## I — Interview Q&A

### Q: How would you structure Zod schemas for a REST API with GET, POST, and PATCH endpoints for the same resource?

**A:** Start with a full schema representing the database entity — all fields including server-generated ones like `id` and `createdAt`. For POST (create), use `.omit({ id: true, createdAt: true })` — the client doesn't provide these. For PUT (full update), use the same omitted schema. For PATCH (partial update), chain `.partial()` on the create schema — all fields become optional. For GET responses, use `.pick()` to expose only public fields. Each derived schema shares the field definitions and validation rules from the base, so updating a rule (e.g. `name` max length) propagates everywhere automatically.

---

## C — Common Pitfalls + Fix

### ❌ Redefining fields in `extend` instead of sharing from base

```ts
// ❌ email defined twice — can drift if one is updated
const CreateSchema = z.object({ name: z.string(), email: z.string().email() })
const UpdateSchema = z.object({ name: z.string(), email: z.string().email() })
```

**Fix:** Derive from a base schema:

```ts
// ✅ Single definition — both schemas stay in sync automatically
const BaseSchema   = z.object({ name: z.string(), email: z.string().email() })
const CreateSchema = BaseSchema
const UpdateSchema = BaseSchema.partial()
```

---

## K — Coding Challenge + Solution

### Challenge

Build a `PostSchema` with all fields: `id`, `title` (min 3, max 100), `body` (min 10), `tags` (string array, max 5), `published` (boolean, default false), `authorId` (uuid), `createdAt` (date). Derive: `CreatePostSchema` (omit id/createdAt), `UpdatePostSchema` (all optional except... none — full replace), `PatchPostSchema` (all optional), `PostSummarySchema` (id, title, published, createdAt only). Export all types.

### Solution

```ts
import { z } from 'zod'

// ─── Base schema
const PostSchema = z.object({
  id:        z.string().uuid(),
  title:     z.string().min(3, 'Min 3 chars').max(100, 'Max 100 chars'),
  body:      z.string().min(10, 'Body must be at least 10 characters'),
  tags:      z.array(z.string().min(1)).max(5).default([]),
  published: z.boolean().default(false),
  authorId:  z.string().uuid(),
  createdAt: z.date()
})

// ─── Derived schemas
const CreatePostSchema  = PostSchema.omit({ id: true, createdAt: true })
const UpdatePostSchema  = CreatePostSchema          // PUT — full replace
const PatchPostSchema   = CreatePostSchema.partial()// PATCH — any subset
const PostSummarySchema = PostSchema.pick({ id: true, title: true, published: true, createdAt: true })

// ─── Types
export type Post           = z.infer<typeof PostSchema>
export type CreatePost     = z.infer<typeof CreatePostSchema>
export type UpdatePost     = z.infer<typeof UpdatePostSchema>
export type PatchPost      = z.infer<typeof PatchPostSchema>
export type PostSummary    = z.infer<typeof PostSummarySchema>

// Spot-check
const create = CreatePostSchema.safeParse({
  title: 'Hello Zod', body: 'This is a post body that is long enough',
  authorId: '550e8400-e29b-41d4-a716-446655440000'
})
console.log(create.success)        // true
console.log(create.data?.published)// false (default)
console.log(create.data?.tags)     // [] (default)

const patch = PatchPostSchema.safeParse({ title: 'Updated title' })
console.log(patch.success)  // true — only title provided, all others optional
```

---

---

# 9 — TypeScript Inference — `z.infer`

---

## T — TL;DR

`z.infer<typeof Schema>` extracts the TypeScript type from a Zod schema. The inferred type always matches the schema's output — including defaults applied, optional modifiers, and transforms. It's the mechanism that makes Zod the **single source of truth** for both validation and types.

---

## K — Key Concepts

```ts
import { z } from 'zod'

// ─── Basic inference
const UserSchema = z.object({ name: z.string(), age: z.number() })
type User = z.infer<typeof UserSchema>
// { name: string; age: number }

// ─── Inference respects modifiers
const ProfileSchema = z.object({
  name:    z.string(),
  bio:     z.string().optional(),
  role:    z.enum(['admin', 'user']).default('user'),
  deleted: z.boolean().nullable()
})
type Profile = z.infer<typeof ProfileSchema>
// {
//   name:    string
//   bio?:    string | undefined
//   role:    'admin' | 'user'   ← default doesn't change inferred type
//   deleted: boolean | null
// }

// ─── Input vs Output types
// Zod schemas have TWO types: input (what you put IN) and output (what comes OUT)
// They differ when .default() or .transform() is used

const WithDefaultSchema = z.object({
  name: z.string(),
  role: z.string().default('user')
})

type Input  = z.input<typeof WithDefaultSchema>
// { name: string; role?: string | undefined }  ← role is optional input

type Output = z.output<typeof WithDefaultSchema>
// { name: string; role: string }               ← role is always present after parse

// z.infer === z.output (what you get after parsing)
type Inferred = z.infer<typeof WithDefaultSchema>
// { name: string; role: string }

// ─── Inference with transforms
const CoercedSchema = z.object({
  price: z.string().transform(v => parseFloat(v))
})
type Coerced = z.infer<typeof CoercedSchema>
// { price: number }  ← number, even though input is string
```

```ts
// ─── Using inferred types throughout the app
const CreateOrderSchema = z.object({
  items:      z.array(z.object({ productId: z.string(), qty: z.number().int().positive() })).nonempty(),
  customerId: z.string().uuid(),
  notes:      z.string().optional()
})

type CreateOrder = z.infer<typeof CreateOrderSchema>

// Use in function signatures — fully type-safe
async function createOrder(data: CreateOrder) {
  // data.items[0].productId — string ✅
  // data.items[0].qty       — number ✅
  // data.notes              — string | undefined ✅
}

// Use in RHF (Day 4)
const { register } = useForm<CreateOrder>()
// register('items.0.qty') — type-safe ✅

// Use in API route
export async function POST(req: Request) {
  const result = CreateOrderSchema.safeParse(await req.json())
  if (!result.success) return Response.json({ errors: result.error.flatten() }, { status: 400 })
  await createOrder(result.data)  // result.data is typed as CreateOrder ✅
  return Response.json({ ok: true })
}
```

---

## W — Why It Matters

- `z.infer` is the link between runtime validation and compile-time types — without it, you have to keep a TypeScript interface in sync with the Zod schema manually, which always drifts eventually.
- Understanding the `input` vs `output` distinction matters when you use `.default()` or `.transform()` — your form type (what RHF uses) is the **input** type, but the validated result is the **output** type. For RHF forms without transforms, `z.infer` (which is `z.output`) is what you want.
- Passing inferred types to function signatures and `useForm<T>` creates an end-to-end type-safe pipeline: schema → form → submit handler → API route → database insert, all typed from one definition.

---

## I — Interview Q&A

### Q: What is the difference between `z.infer`, `z.input`, and `z.output`?

**A:** `z.infer<typeof S>` is equivalent to `z.output<typeof S>` — it gives you the **output** type, which is what you get after `parse()` runs, including defaults applied and transforms executed. `z.input<typeof S>` gives the **input** type — what the schema accepts before transformation. They differ when `.default()` is used (input has the field as optional, output has it as required and always present) or when `.transform()` changes the type (input is the source type, output is the transformed type). For RHF forms, use `z.infer` for the form field types and be aware that the submitted `data` in `handleSubmit` will be the output type — numbers after `z.coerce.number()`, defaults filled in, etc.

---

## C — Common Pitfalls + Fix

### ❌ Using the inferred type as the RHF form type with `.transform()`

```ts
// ❌ price is transformed string→number in schema
const Schema = z.object({ price: z.string().transform(parseFloat) })
type FormType = z.infer<typeof Schema>
// FormType = { price: number } — but the FORM INPUT is a string!

const { register } = useForm<FormType>()
// register('price') expects number — but <input> always provides string ❌
```

**Fix:** Use `z.input` for the form type when transforms are involved:

```ts
// ✅ Input type for the form, output type for submitted data
type FormInput  = z.input<typeof Schema>   // { price: string }
type FormOutput = z.infer<typeof Schema>   // { price: number }

const { register } = useForm<FormInput>()
// OR: use z.coerce.number() instead of transform — it handles coercion internally
const BetterSchema = z.object({ price: z.coerce.number().positive() })
type Form = z.infer<typeof BetterSchema>  // { price: number } — infer is safe ✅
```

---

## K — Coding Challenge + Solution

### Challenge

Build a complete `CheckoutSchema` composed from subtypes: `ShippingSchema` (address fields), `PaymentSchema` (card number, expiry `MM/YY`, CVV), `OrderSchema` (items array, notes optional). Use `z.infer` for all types. Write a typed `processCheckout(data: Checkout)` function that only compiles if `data` matches the inferred type.

### Solution

```ts
import { z } from 'zod'

// ─── Sub-schemas
const ShippingSchema = z.object({
  fullName: z.string().min(2),
  street:   z.string().min(5),
  city:     z.string().min(2),
  zip:      z.string().regex(/^\d{4,10}$/, 'Invalid ZIP'),
  country:  z.string().length(2, 'Use ISO 2-letter code')
})

const PaymentSchema = z.object({
  cardNumber: z.string().regex(/^\d{16}$/, 'Card must be 16 digits'),
  expiry:     z.string().regex(/^(0[1-9]|1[0-2])\/\d{2}$/, 'Format: MM/YY'),
  cvv:        z.string().regex(/^\d{3,4}$/, 'CVV must be 3–4 digits')
})

const OrderItemSchema = z.object({
  productId: z.string().uuid(),
  name:      z.string(),
  qty:       z.coerce.number().int().positive(),
  unitPrice: z.coerce.number().positive()
})

const CheckoutSchema = z.object({
  shipping: ShippingSchema,
  payment:  PaymentSchema,
  items:    z.array(OrderItemSchema).nonempty('Cart cannot be empty'),
  notes:    z.string().max(500).optional()
})

// ─── Inferred types
type Shipping     = z.infer<typeof ShippingSchema>
type Payment      = z.infer<typeof PaymentSchema>
type OrderItem    = z.infer<typeof OrderItemSchema>
type Checkout     = z.infer<typeof CheckoutSchema>

// ─── Type-safe function — only compiles with correct shape
async function processCheckout(data: Checkout): Promise<{ orderId: string }> {
  // TypeScript knows:
  console.log(data.shipping.fullName)       // string ✅
  console.log(data.payment.cardNumber)      // string ✅
  console.log(data.items[0].qty)            // number ✅ (coerced)
  console.log(data.notes?.toUpperCase())    // string | undefined ✅
  return { orderId: crypto.randomUUID() }
}

// ─── Validate + call
const raw = {
  shipping: { fullName: 'Mark Austin', street: '123 Main St', city: 'Manila', zip: '1000', country: 'PH' },
  payment:  { cardNumber: '4111111111111111', expiry: '12/27', cvv: '123' },
  items:    [{ productId: '550e8400-e29b-41d4-a716-446655440000', name: 'Laptop', qty: '1', unitPrice: '999.99' }]
}

const result = CheckoutSchema.safeParse(raw)
if (result.success) {
  processCheckout(result.data)  // fully typed ✅
  console.log(result.data.items[0].qty)      // 1 (number, coerced from '1')
  console.log(result.data.items[0].unitPrice)// 999.99 (number, coerced)
} else {
  console.log(result.error.flatten())
}
```

---

## ✅ Day 3 Complete — Zod Fundamentals

| # | Subtopic | Status |
|---|----------|--------|
| 1 | What is Zod and Why Use It | ☐ |
| 2 | Primitive Schemas | ☐ |
| 3 | Objects — z.object, strict, passthrough | ☐ |
| 4 | Arrays — z.array, nonempty | ☐ |
| 5 | Enums and Literals | ☐ |
| 6 | Optional, Nullable, and Default Values | ☐ |
| 7 | parse vs safeParse | ☐ |
| 8 | Schema Composition | ☐ |
| 9 | TypeScript Inference — z.infer | ☐ |

---

## 🗺️ One-Page Mental Model — Day 3

```
PRIMITIVES
  z.string()         .min() .max() .email() .url() .regex() .trim() .nonempty()
  z.number()         .int() .min() .max() .positive() .negative()
  z.boolean()        true | false only (not 0, 1, 'true')
  z.date()           .min() .max()
  z.coerce.number()  "42" → 42  — use for HTML form inputs
  z.coerce.date()    "2024-01-01" → Date

OBJECTS
  z.object(shape)    default: strips unknown keys
  .strict()          rejects unknown keys (errors)
  .passthrough()     keeps unknown keys in output
  .catchall(schema)  validate all extra keys
  .shape.field       access individual field schema
  .keyof()           ZodEnum of field names

ARRAYS
  z.array(itemSchema)
  .min(n) .max(n) .length(n) .nonempty()
  nonempty() → narrows type to [T, ...T[]]

ENUMS + LITERALS
  z.enum(['a','b'])  → 'a' | 'b'
  .options           → ['a', 'b'] (for UI select)
  .enum              → { a: 'a', b: 'b' }
  z.literal('x')     → exactly 'x'
  z.nativeEnum(TsEnum) → wraps TypeScript enum

MODIFIERS
  .optional()        adds | undefined to type
  .nullable()        adds | null to type
  .nullish()         adds | null | undefined
  .default(value)    replaces undefined with value in OUTPUT
  .or(z.literal('')) accept empty string OR schema

PARSE
  .parse(data)       throws ZodError on failure
  .safeParse(data)   returns { success, data } | { success, error }
  .parseAsync()      for async .refine() schemas
  error.issues       flat array of ZodIssue
  error.flatten()    { fieldErrors: {}, formErrors: [] }
  error.format()     nested object matching input shape

COMPOSITION
  .extend({ field })    add fields, keep originals
  .omit({ id: true })   remove fields
  .pick({ id: true })   keep only these fields
  .partial()            all fields → optional
  .partial({ f: true }) specific fields → optional
  .required()           all optional fields → required
  .merge(otherSchema)   combine two object schemas

INFERENCE
  z.infer<typeof S>    output type (after parse + transforms)
  z.input<typeof S>    input type (before transforms)
  z.output<typeof S>   same as z.infer

PATTERNS
  CRUD hierarchy:
    Base → .omit({id,createdAt}) → Create
    Create → .partial() → Patch
    Base → .pick({id,name}) → Summary

  Form + API shared schema:
    One schema → zodResolver(schema) in RHF → same schema in API route

  Empty string URL field:
    z.union([z.string().url(), z.literal('')]).optional()

  Coerce form input:
    z.coerce.number() instead of z.number() + valueAsNumber
```

> **Your next action:** Open your project. Find one TypeScript interface defined next to a manual validation function. Delete the interface, create a `z.object()` schema with the same fields, and replace the type with `type T = z.infer<typeof Schema>`. Run the TypeScript compiler — everything should still compile.
>
> *Doing one small thing beats opening a feed.*