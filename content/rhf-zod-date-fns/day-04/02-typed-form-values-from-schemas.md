# 2 — Typed Form Values from Schemas

---

## T — TL;DR

`z.infer<typeof Schema>` gives you the **output type** — what the form data looks like after Zod parses it. Pass this as the generic to `useForm<T>`. This makes `register`, `errors`, `watch`, `getValues`, and `setValue` fully type-safe — TypeScript catches invalid field names at compile time.

---

## K — Key Concepts

```tsx
import { z } from 'zod'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'

const ProfileSchema = z.object({
  username:    z.string().min(3).max(20),
  email:       z.string().email(),
  age:         z.coerce.number().int().min(13),
  role:        z.enum(['admin', 'editor', 'viewer']).default('viewer'),
  bio:         z.string().max(160).optional(),
  newsletter:  z.boolean().default(false)
})

// Inferred output type:
// {
//   username:   string
//   email:      string
//   age:        number
//   role:       'admin' | 'editor' | 'viewer'
//   bio?:       string | undefined
//   newsletter: boolean
// }
type ProfileForm = z.infer<typeof ProfileSchema>

const { register, formState: { errors }, watch, setValue } = useForm<ProfileForm>({
  resolver:      zodResolver(ProfileSchema),
  defaultValues: { username: '', email: '', age: 18, role: 'viewer', newsletter: false }
})

// ─── Type-safe field access
register('username')    // ✅
register('email')       // ✅
register('nonexistent') // ❌ TypeScript error — field doesn't exist in schema

// ─── Type-safe errors
errors.username?.message  // string | undefined ✅
errors.missing            // ❌ TypeScript error

// ─── Type-safe setValue
setValue('role', 'admin')   // ✅
setValue('role', 'owner')   // ❌ TypeScript error — not in enum
setValue('age',  25)        // ✅ number
setValue('age',  'twenty')  // ❌ TypeScript error — expects number
```

```tsx
// ─── Input type vs Output type with coerce
// z.coerce.number() accepts strings but outputs numbers
// The RHF form field value is a STRING (from <input>)
// But the submitted data type is NUMBER (after Zod parses)

const Schema = z.object({ age: z.coerce.number().int().min(18) })
type FormOutput = z.infer<typeof Schema>          // { age: number }
type FormInput  = z.input<typeof Schema>           // { age: unknown }

// useForm<FormOutput> is correct — RHF coerces values at submit time
// The <input> field still produces a string, but after schema.safeParse,
// data.age is a number ✅
useForm<FormOutput>({ resolver: zodResolver(Schema) })
// handleSubmit data.age → number ✅

// ─── defaultValues must match the INPUT type
// age field is a number in the schema but the input renders a string
// Providing a number default is fine — RHF/HTML handle the conversion
defaultValues: { age: 18 }  // renders as "18" in the input ✅
```

---

## W — Why It Matters

- Full TypeScript safety across the entire form: if you rename a field in the schema, every `register('oldName')` call becomes a TypeScript error immediately — no runtime surprises.
- `useForm<z.infer<typeof Schema>>` means your `handleSubmit` callback's `data` parameter is precisely typed — `data.age` is `number`, not `string | number | unknown`.
- The pattern of coercing at the schema level (`z.coerce.number()`) instead of using `valueAsNumber` on register means the type flows correctly from schema → form type → submit handler type, all from one definition.

---

## I — Interview Q&A

### Q: Should you use `z.infer` or `z.input` as the generic for `useForm<T>` when your schema has coerce or transforms?

**A:** Use `z.infer` (which is `z.output`) in almost all cases — it represents what the data looks like after Zod runs, which is what your `handleSubmit` callback receives. The HTML input always sends strings to the browser regardless of the TypeScript type — RHF reads the raw DOM value, passes it to Zod, and Zod coerces it. The inferred output type is what you care about in your submit handler. The only exception is when you have complex transforms that dramatically change the shape — in that case use `z.input` for the form type so `register` field names match the pre-transform shape.

---

## C — Common Pitfalls + Fix

### ❌ Not providing `defaultValues` that match the form shape

```tsx
// ❌ No defaultValues — RHF can't track isDirty, inputs are uncontrolled
const { register } = useForm<ProfileForm>({
  resolver: zodResolver(ProfileSchema)
  // missing defaultValues
})
// isDirty is unreliable, React warns about uncontrolled inputs
```

**Fix:** Always provide `defaultValues` matching your form type:

```tsx
// ✅
useForm<ProfileForm>({
  resolver:      zodResolver(ProfileSchema),
  defaultValues: { username: '', email: '', age: 18, role: 'viewer', newsletter: false }
})
```

---

## K — Coding Challenge + Solution

### Challenge

Create a `CreateProductSchema` with 5 fields (name, price coerced number, category enum, description optional, featured boolean default false). Infer the type. Use it with `useForm`. Prove type safety by trying to `register` a nonexistent field in a comment.

### Solution

```tsx
'use client'
import { useForm }     from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z }           from 'zod'

const CategorySchema      = z.enum(['electronics', 'clothing', 'books', 'food'])
const CreateProductSchema = z.object({
  name:        z.string().min(2, 'Min 2 characters').max(80),
  price:       z.coerce.number().positive('Must be positive'),
  category:    CategorySchema,
  description: z.string().max(500).optional(),
  featured:    z.boolean().default(false)
})

type CreateProduct = z.infer<typeof CreateProductSchema>
// { name: string; price: number; category: ...; description?: string; featured: boolean }

export function CreateProductForm() {
  const { register, handleSubmit, formState: { errors } } = useForm<CreateProduct>({
    resolver:      zodResolver(CreateProductSchema),
    defaultValues: { name: '', price: 0, category: 'electronics', featured: false }
  })

  // register('nonexistent')  // ← TypeScript error ✅ caught at compile time

  const cls = 'w-full border rounded-xl px-3 py-2 text-sm'
  const err = 'text-xs text-red-600 mt-1'

  return (
    <form onSubmit={handleSubmit(d => console.log(d))} className="space-y-3 max-w-sm">
      <div>
        <input {...register('name')} placeholder="Product name" className={cls} />
        {errors.name     && <p className={err}>{errors.name.message}</p>}
      </div>
      <div>
        <input {...register('price')} type="number" step="0.01" placeholder="Price" className={cls} />
        {errors.price    && <p className={err}>{errors.price.message}</p>}
      </div>
      <select {...register('category')} className={cls}>
        {CategorySchema.options.map(c => <option key={c} value={c}>{c}</option>)}
      </select>
      {errors.category   && <p className={err}>{errors.category.message}</p>}
      <textarea {...register('description')} placeholder="Description (optional)" className={cls} />
      <label className="flex items-center gap-2 text-sm">
        <input {...register('featured')} type="checkbox" />
        Featured product
      </label>
      <button type="submit"
              className="w-full py-2.5 bg-blue-600 text-white rounded-xl text-sm font-semibold">
        Create product
      </button>
    </form>
  )
}
```

---

---
