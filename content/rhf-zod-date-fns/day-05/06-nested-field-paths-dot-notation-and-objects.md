# 6 — Nested Field Paths — Dot Notation and Objects

---

## T — TL;DR

RHF supports nested fields via dot-notation strings — `register('address.city')` maps to `{ address: { city: '...' } }` in submitted data. Zod schemas with nested `z.object()` validate the nested structure. Access errors via `errors.address?.city`.

---

## K — Key Concepts

```tsx
// ─── Schema with nested objects
const OrderSchema = z.object({
  customer: z.object({
    name:  z.string().min(1, 'Name required'),
    email: z.string().email('Invalid email')
  }),
  shipping: z.object({
    street:  z.string().min(5),
    city:    z.string().min(2),
    country: z.string().length(2)
  }),
  notes: z.string().optional()
})
type OrderForm = z.infer<typeof OrderSchema>
// {
//   customer: { name: string; email: string }
//   shipping: { street: string; city: string; country: string }
//   notes?: string
// }

const { register, formState: { errors } } = useForm<OrderForm>({
  resolver:      zodResolver(OrderSchema),
  defaultValues: {
    customer: { name: '', email: '' },
    shipping: { street: '', city: '', country: '' }
  }
})

// ─── Registering nested fields — dot notation
<input {...register('customer.name')}     />  // → data.customer.name
<input {...register('customer.email')}    />  // → data.customer.email
<input {...register('shipping.street')}   />  // → data.shipping.street
<input {...register('shipping.city')}     />  // → data.shipping.city
<input {...register('shipping.country')}  />  // → data.shipping.country

// ─── Accessing nested errors
errors.customer?.name?.message     // 'Name required'
errors.customer?.email?.message    // 'Invalid email'
errors.shipping?.street?.message
errors.shipping?.city?.message
```

```tsx
// ─── Deep nesting
const DeepSchema = z.object({
  org: z.object({
    name: z.string(),
    address: z.object({
      billing: z.object({ zip: z.string() })
    })
  })
})

register('org.address.billing.zip')
errors.org?.address?.billing?.zip?.message

// ─── TypeScript: Path<T> resolves all valid nested paths
import { Path } from 'react-hook-form'
type Paths = Path<OrderForm>
// 'customer' | 'customer.name' | 'customer.email'
// 'shipping' | 'shipping.street' | 'shipping.city' | 'shipping.country'
// 'notes'

// ─── defaultValues must mirror the nested shape
// ✅ Correct — nested structure
defaultValues: { customer: { name: '', email: '' }, shipping: { street: '', city: '' } }

// ❌ Wrong — flat structure for a nested schema
defaultValues: { 'customer.name': '', 'customer.email': '' }  // doesn't work
```

---

## W — Why It Matters

- Nested schemas produce structured data from the form — `handleSubmit` receives `{ customer: { name, email }, shipping: { ... } }` not a flat object. This maps directly to your API payload or database insert shape.
- `Path<T>` resolves all valid nested paths with TypeScript — `register('customer.nme')` is a TypeScript error if `nme` isn't in the schema, catching typos in deeply nested forms.
- `defaultValues` must use the same nested shape as the schema — flat dot-notation keys in `defaultValues` don't work. RHF expects `{ shipping: { city: '' } }`, not `{ 'shipping.city': '' }`.

---

## I — Interview Q&A

### Q: How do you access validation errors for a nested field like `shipping.city` in RHF with zodResolver?

**A:** The `zodResolver` maps Zod's error path `['shipping', 'city']` to `errors.shipping.city`. Access it with optional chaining: `errors.shipping?.city?.message`. The `?.` is required because `errors.shipping` might be `undefined` if there are no errors in that sub-object. In TypeScript, `errors` is typed as `DeepPartial<FieldErrors<T>>`, so optional chaining is both required by the type system and safe at runtime.

---

## C — Common Pitfalls + Fix

### ❌ Using flat dot-notation keys in `defaultValues` for nested schemas

```tsx
// ❌ RHF expects nested objects, not flat keys
useForm({
  defaultValues: {
    'shipping.city':   'Manila',  // wrong — ignored
    'shipping.street': '123 Main' // wrong — ignored
  }
})
// Fields appear empty, isDirty doesn't work correctly
```

**Fix:** Mirror the schema's nested structure:

```tsx
// ✅
useForm({
  defaultValues: {
    shipping: { city: 'Manila', street: '123 Main', country: 'PH' }
  }
})
```

---

## K — Coding Challenge + Solution

### Challenge

Build an order form with two nested sections — `billing` (name, street, city) and `shipping` (street, city) — plus a "same as billing" checkbox that uses `setValue` to copy billing → shipping when checked. Show nested errors per field.

### Solution

```tsx
'use client'
import { useForm, useWatch } from 'react-hook-form'
import { zodResolver }       from '@hookform/resolvers/zod'
import { z }                 from 'zod'
import { useEffect }         from 'react'

const addr   = z.object({ street: z.string().min(5, 'Min 5 chars'), city: z.string().min(2, 'Required') })
const Schema = z.object({
  billing:       z.object({ name: z.string().min(2, 'Required'), ...addr.shape }),
  shipping:      addr,
  sameAsBilling: z.boolean().default(false)
})
type F = z.infer<typeof Schema>

export function OrderAddressForm() {
  const { register, handleSubmit, control, setValue, getValues,
          formState: { errors } } = useForm<F>({
    resolver:      zodResolver(Schema),
    defaultValues: {
      billing:       { name: '', street: '', city: '' },
      shipping:      { street: '', city: '' },
      sameAsBilling: false
    }
  })

  const same = useWatch({ control, name: 'sameAsBilling' })
  useEffect(() => {
    if (same) {
      const b = getValues('billing')
      setValue('shipping.street', b.street, { shouldDirty: true, shouldValidate: true })
      setValue('shipping.city',   b.city,   { shouldDirty: true, shouldValidate: true })
    }
  }, [same, getValues, setValue])

  const cls = 'w-full border rounded-xl px-3 py-2 text-sm'
  const e   = (m?: string) => m ? <p className="text-xs text-red-600 mt-1">{m}</p> : null

  return (
    <form onSubmit={handleSubmit(console.log)} className="space-y-5 max-w-sm">
      <fieldset className="space-y-3 border border-gray-200 rounded-2xl p-4">
        <legend className="text-xs font-bold uppercase text-gray-500 px-1">Billing</legend>
        <div>
          <input {...register('billing.name')}   placeholder="Full name"      className={cls} />
          {e(errors.billing?.name?.message)}
        </div>
        <div>
          <input {...register('billing.street')} placeholder="Street address" className={cls} />
          {e(errors.billing?.street?.message)}
        </div>
        <div>
          <input {...register('billing.city')}   placeholder="City"           className={cls} />
          {e(errors.billing?.city?.message)}
        </div>
      </fieldset>

      <label className="flex items-center gap-2 text-sm cursor-pointer">
        <input {...register('sameAsBilling')} type="checkbox" className="size-4 rounded" />
        Shipping same as billing
      </label>

      <fieldset className="space-y-3 border border-gray-200 rounded-2xl p-4">
        <legend className="text-xs font-bold uppercase text-gray-500 px-1">Shipping</legend>
        <div>
          <input {...register('shipping.street')} placeholder="Street address" className={cls} disabled={same} />
          {e(errors.shipping?.street?.message)}
        </div>
        <div>
          <input {...register('shipping.city')}   placeholder="City"           className={cls} disabled={same} />
          {e(errors.shipping?.city?.message)}
        </div>
      </fieldset>

      <button type="submit"
              className="w-full py-2.5 bg-blue-600 text-white rounded-xl text-sm font-semibold">
        Place order
      </button>
    </form>
  )
}
```

---

---
