# 6 — Dependent and Conditional Fields

---

## T — TL;DR

Conditional fields appear/disappear based on other field values. Use `watch` or `useWatch` to read the controlling field and conditionally render the dependent field. Unregistered fields don't submit. Use `shouldUnregister: true` to auto-clean values when fields are hidden.

---

## K — Key Concepts

```tsx
import { useForm, useWatch } from 'react-hook-form'

// ─── Pattern 1: Simple conditional field (same component)
function ShippingForm() {
  const { register, watch, handleSubmit } = useForm({
    defaultValues: { shippingType: 'standard', expressNote: '' }
  })

  const shippingType = watch('shippingType')  // reactive

  return (
    <form onSubmit={handleSubmit(console.log)}>
      <select {...register('shippingType')}>
        <option value="standard">Standard</option>
        <option value="express">Express</option>
      </select>

      {/* Only renders — and only submits — when type is 'express' */}
      {shippingType === 'express' && (
        <input {...register('expressNote')} placeholder="Delivery note" />
      )}
    </form>
  )
}
```

```tsx
// ─── shouldUnregister: true — auto-remove values when field unmounts
// Default: false — hidden field values stay in submitted data
// With true: hidden field values are removed from submitted data

useForm({
  shouldUnregister: true,  // global — all unmounted fields are unregistered
  defaultValues: { type: 'personal', companyName: '' }
})

// Or per-field:
<input {...register('companyName', { shouldUnregister: true })} />
// When this input unmounts → 'companyName' is removed from form values
```

```tsx
// ─── Pattern 2: Conditional Zod validation aligned with conditional UI
// Problem: schema always validates companyName, but it's only shown for 'business'
// Solution: use .superRefine or z.discriminatedUnion (see subtopic 7)

const AccountSchema = z.object({
  accountType: z.enum(['personal', 'business']),
  companyName: z.string().optional()
}).superRefine((data, ctx) => {
  if (data.accountType === 'business' && !data.companyName?.trim()) {
    ctx.addIssue({
      code:    z.ZodIssueCode.custom,
      message: 'Company name is required for business accounts',
      path:    ['companyName']
    })
  }
})
```

```tsx
// ─── Pattern 3: Cascading dependent fields (country → state → city)
function LocationForm() {
  const { register, watch, setValue } = useForm({
    defaultValues: { country: '', state: '', city: '' }
  })

  const country = watch('country')
  const state   = watch('state')

  // Reset child fields when parent changes
  useEffect(() => {
    setValue('state', '')
    setValue('city',  '')
  }, [country, setValue])

  useEffect(() => {
    setValue('city', '')
  }, [state, setValue])

  const states = country ? STATES_BY_COUNTRY[country] ?? [] : []
  const cities = state   ? CITIES_BY_STATE[state]    ?? [] : []

  return (
    <form className="space-y-3">
      <select {...register('country')}>
        <option value="">Select country</option>
        {COUNTRIES.map(c => <option key={c.code} value={c.code}>{c.name}</option>)}
      </select>
      {country && (
        <select {...register('state')}>
          <option value="">Select state</option>
          {states.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
      )}
      {state && (
        <select {...register('city')}>
          <option value="">Select city</option>
          {cities.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
      )}
    </form>
  )
}
```

---

## W — Why It Matters

- By default, RHF keeps hidden field values in the submitted data even when the field is not rendered — `companyName: ''` appears in the payload even for personal accounts. `shouldUnregister: true` removes this automatically.
- The schema must reflect the conditional requirement — if `companyName` is required for business accounts, the Zod schema needs to know the current `accountType` to validate correctly. This is why `superRefine` or discriminated unions (next subtopic) are needed.
- Cascading fields (country → state → city) must reset child values when the parent changes — otherwise a previously selected "California" city persists even after switching country to "Philippines".

---

## I — Interview Q&A

### Q: How do you prevent a conditionally hidden field's value from appearing in submitted form data?

**A:** Two options. Set `shouldUnregister: true` globally in `useForm` — any unmounted input is automatically unregistered and removed from form values. Or set it per field: `register('field', { shouldUnregister: true })`. The trade-off is that the value is lost when the field unmounts, so re-showing the field starts blank. If you want to preserve the value for re-display (user toggles back and forth), keep `shouldUnregister: false` (default) and instead filter the value out in `onSubmit` before sending to the API: `const { companyName, ...payload } = data; if (accountType === 'personal') submit(payload)`.

---

## C — Common Pitfalls + Fix

### ❌ Cascading selects don't reset child value when parent changes

```tsx
// ❌ User selects country=PH, state=NCR, city=Manila
// Then changes country=US — state still shows NCR, city still shows Manila
<select {...register('state')}>
  {states.map(s => <option key={s} value={s}>{s}</option>)}
</select>
// Submitted data: { country: 'US', state: 'NCR', city: 'Manila' } ❌
```

**Fix:** Reset child fields in a `useEffect` when parent changes:

```tsx
// ✅
useEffect(() => {
  setValue('state', '')
  setValue('city',  '')
}, [country, setValue])
```

---

## K — Coding Challenge + Solution

### Challenge

Build an `AccountTypeForm` with: `accountType` (enum: personal | business | nonprofit). Show `companyName` only for business. Show `taxId` only for nonprofit. Use `shouldUnregister: true` per field. Zod validates conditionally with `superRefine`.

### Solution

```tsx
'use client'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z }           from 'zod'

const AccountSchema = z.object({
  accountType: z.enum(['personal', 'business', 'nonprofit']),
  companyName: z.string().optional(),
  taxId:       z.string().optional()
}).superRefine((data, ctx) => {
  if (data.accountType === 'business' && !data.companyName?.trim()) {
    ctx.addIssue({ code: z.ZodIssueCode.custom,
      message: 'Company name is required', path: ['companyName'] })
  }
  if (data.accountType === 'nonprofit' && !data.taxId?.trim()) {
    ctx.addIssue({ code: z.ZodIssueCode.custom,
      message: 'Tax ID is required for nonprofits', path: ['taxId'] })
  }
})
type AccountForm = z.infer<typeof AccountSchema>

export function AccountTypeForm() {
  const { register, watch, handleSubmit, formState: { errors } } = useForm<AccountForm>({
    resolver:      zodResolver(AccountSchema),
    defaultValues: { accountType: 'personal' }
  })

  const accountType = watch('accountType')
  const cls = 'w-full border rounded-xl px-3 py-2 text-sm'
  const err = 'text-xs text-red-600 mt-1'

  return (
    <form onSubmit={handleSubmit(console.log)} className="space-y-4 max-w-sm">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1.5">Account type</label>
        <select {...register('accountType')} className={cls}>
          <option value="personal">Personal</option>
          <option value="business">Business</option>
          <option value="nonprofit">Nonprofit</option>
        </select>
      </div>

      {accountType === 'business' && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">Company name</label>
          <input {...register('companyName', { shouldUnregister: true })}
                 placeholder="Acme Inc." className={cls} />
          {errors.companyName && <p className={err}>{errors.companyName.message}</p>}
        </div>
      )}

      {accountType === 'nonprofit' && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">Tax ID</label>
          <input {...register('taxId', { shouldUnregister: true })}
                 placeholder="12-3456789" className={cls} />
          {errors.taxId && <p className={err}>{errors.taxId.message}</p>}
        </div>
      )}

      <button type="submit"
              className="w-full py-2.5 bg-blue-600 text-white rounded-xl text-sm font-semibold">
        Create account
      </button>
    </form>
  )
}
```

---

---
