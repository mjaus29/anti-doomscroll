# 6 — Error Path Mapping — How Zod Errors Become RHF Errors

---

## T — TL;DR

`zodResolver` maps each `ZodIssue` to an RHF field error using the issue's `path` array. `path: ['address', 'city']` → `errors.address.city`. `path: ['items', 0, 'name']` → `errors.items[0].name`. Understanding this mapping lets you structure schemas to produce errors exactly where RHF (and your UI) expects them.

---

## K — Key Concepts

```tsx
import { z } from 'zod'

// ─── ZodIssue structure
// { code, path, message }
// path: string[] | (string | number)[]

// Simple field:  path: ['email']       → errors.email
// Nested:        path: ['address', 'city'] → errors.address?.city
// Array item:    path: ['items', 0, 'qty'] → errors.items?.[0]?.qty
// Root refine:   path: []               → errors.root (mapped by RHF)

// ─── How zodResolver maps issues to RHF errors
// issue.path → nested key path → set on formState.errors

const NestedSchema = z.object({
  user: z.object({
    name:    z.string().min(1, 'Name required'),
    address: z.object({
      city: z.string().min(1, 'City required')
    })
  })
})

// Error: { path: ['user', 'address', 'city'], message: 'City required' }
// RHF:   errors.user?.address?.city?.message === 'City required' ✅
```

```tsx
// ─── Refine path control — where the error appears
const Schema = z.object({
  password:        z.string().min(8),
  confirmPassword: z.string()
}).refine(
  data => data.password === data.confirmPassword,
  {
    message: 'Passwords do not match',
    path:    ['confirmPassword']  // ← error appears on confirmPassword field
  }
)

// Without path: error goes to formState.errors.root (no field)
// With path: ['confirmPassword']: errors.confirmPassword.message === 'Passwords do not match'
```

```tsx
// ─── Rendering nested errors in the form
const { formState: { errors } } = useForm<z.infer<typeof NestedSchema>>({
  resolver: zodResolver(NestedSchema)
})

// Direct nested access
{errors.user?.name?.message}
{errors.user?.address?.city?.message}

// Array field errors (useFieldArray covered separately)
{errors.items?.[0]?.name?.message}
{errors.items?.[1]?.qty?.message}

// Root-level refine error (no path → errors.root)
// zodResolver maps path: [] → errors.root
{errors.root?.message}
```

---

## W — Why It Matters

- The `path` on `.refine()` is essential — without it, cross-field errors (like "passwords don't match") go to `errors.root` and don't highlight the specific field. Setting `path: ['confirmPassword']` makes the error appear inline next to the confirm field.
- Understanding path mapping lets you debug missing errors — if `errors.confirmPassword.message` is undefined but the schema should have an error, check that the `.refine()` path matches exactly the field name registered in RHF.
- Array path segments (`path: ['items', 0, 'name']`) map automatically to `errors.items[0].name` — nested array field errors work without any extra configuration when using `useFieldArray`.

---

## I — Interview Q&A

### Q: A `.refine()` cross-field error isn't showing next to the field in the form — why?

**A:** The `.refine()` probably has no `path` option or the wrong path. Without `path`, Zod issues the error with `path: []` — an empty array — which `zodResolver` maps to `errors.root`, not to any specific field. To show the error next to a specific field, add `path: ['fieldName']` to the refine options. The path must match the exact string used in `register('fieldName')` for the error to appear at `errors.fieldName.message`.

---

## C — Common Pitfalls + Fix

### ❌ `.refine()` without `path` — error goes to `errors.root`, not the field

```tsx
// ❌ Error ends up in errors.root — not shown next to confirmPassword field
const Schema = z.object({
  password: z.string(), confirmPassword: z.string()
}).refine(d => d.password === d.confirmPassword, 'Passwords do not match')

// errors.confirmPassword → undefined (empty — user doesn't see why)
```

**Fix:** Add `path` to direct the error to the right field:

```tsx
// ✅ Error shows next to confirmPassword input
const Schema = z.object({
  password: z.string(), confirmPassword: z.string()
}).refine(d => d.password === d.confirmPassword, {
  message: 'Passwords do not match',
  path:    ['confirmPassword']
})
// errors.confirmPassword.message === 'Passwords do not match' ✅
```

---

## K — Coding Challenge + Solution

### Challenge

Build a shipping schema with nested address object. Add two `.refine()` checks — one with `path` (city/state mismatch → error on `state` field) and one without `path` (terms acceptance → error on root). Render both errors in the form.

### Solution

```tsx
'use client'
import { useForm }     from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z }           from 'zod'

const ShippingSchema = z.object({
  address: z.object({
    street: z.string().min(5, 'Street required'),
    city:   z.string().min(2, 'City required'),
    state:  z.string().length(2, 'Use 2-letter state code'),
    zip:    z.string().regex(/^\d{5}$/, 'ZIP must be 5 digits')
  }),
  agreeToShipping: z.boolean()
})
.refine(
  d => !(d.address.city === 'Los Angeles' && d.address.state !== 'CA'),
  { message: 'LA is in California — state should be CA', path: ['address', 'state'] }
)
.refine(
  d => d.agreeToShipping === true,
  { message: 'You must agree to shipping terms' } // no path → errors.root
)

type Shipping = z.infer<typeof ShippingSchema>

export function ShippingForm() {
  const { register, handleSubmit, formState: { errors } } = useForm<Shipping>({
    resolver:      zodResolver(ShippingSchema),
    defaultValues: { address: { street: '', city: '', state: '', zip: '' }, agreeToShipping: false }
  })

  const cls = 'w-full border rounded-xl px-3 py-2 text-sm'
  const err = 'text-xs text-red-600 mt-1'

  return (
    <form onSubmit={handleSubmit(console.log)} className="space-y-3 max-w-sm">
      {errors.root && (
        <p className="p-3 bg-red-50 rounded-xl text-sm text-red-700">
          {errors.root.message}
        </p>
      )}
      <input {...register('address.street')} placeholder="Street" className={cls} />
      {errors.address?.street   && <p className={err}>{errors.address.street.message}</p>}

      <input {...register('address.city')}   placeholder="City"   className={cls} />
      {errors.address?.city     && <p className={err}>{errors.address.city.message}</p>}

      <input {...register('address.state')}  placeholder="State (2 letters)" className={cls} />
      {errors.address?.state    && <p className={err}>{errors.address.state.message}</p>}

      <input {...register('address.zip')}    placeholder="ZIP"    className={cls} />
      {errors.address?.zip      && <p className={err}>{errors.address.zip.message}</p>}

      <label className="flex items-center gap-2 text-sm cursor-pointer">
        <input {...register('agreeToShipping')} type="checkbox" />
        I agree to the shipping terms
      </label>

      <button type="submit"
              className="w-full py-2.5 bg-blue-600 text-white rounded-xl text-sm font-semibold">
        Ship order
      </button>
    </form>
  )
}
```

---

---
