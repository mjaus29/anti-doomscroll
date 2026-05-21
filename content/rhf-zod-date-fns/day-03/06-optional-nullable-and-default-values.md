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
