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
