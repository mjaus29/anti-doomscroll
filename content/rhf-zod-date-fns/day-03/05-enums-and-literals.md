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
