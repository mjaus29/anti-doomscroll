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
