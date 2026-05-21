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
