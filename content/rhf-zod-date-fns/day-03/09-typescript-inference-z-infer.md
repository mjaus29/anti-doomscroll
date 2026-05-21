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
