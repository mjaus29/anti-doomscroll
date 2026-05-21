# 7 — `setValue` — Programmatic Field Updates

---

## T — TL;DR

`setValue('field', value, options)` programmatically updates a field's value in RHF's store. Use it for: copying values between fields, setting values from external data (autocomplete, geolocation), and integrating non-form UI (sliders, maps). Pass `{ shouldDirty: true }` to update dirty tracking.

---

## K — Key Concepts

```tsx
const { setValue } = useForm<T>()

// ─── Basic usage
setValue('firstName', 'Mark')

// ─── With options
setValue('email', 'mark@example.com', {
  shouldValidate: true,   // run validation after setting
  shouldDirty:    true,   // mark field as dirty (changed from defaultValues)
  shouldTouch:    true    // mark field as touched
})

// ─── Nested fields
setValue('address.city', 'Manila')

// ─── Set multiple fields individually
const addressData = { street: '123 Main', city: 'Manila', zip: '1000' }
Object.entries(addressData).forEach(([k, v]) =>
  setValue(`address.${k}` as any, v, { shouldDirty: true })
)
// Or use reset() for bulk updates to multiple top-level fields
```

```tsx
// ─── Common patterns

// 1. Address autocomplete — set multiple fields from one selection
function AddressAutocomplete() {
  const { setValue } = useFormContext<AddressForm>()

  function handlePlaceSelected(place: GooglePlace) {
    setValue('street', place.street,  { shouldDirty: true, shouldValidate: true })
    setValue('city',   place.city,    { shouldDirty: true, shouldValidate: true })
    setValue('state',  place.state,   { shouldDirty: true, shouldValidate: true })
    setValue('zip',    place.zipCode, { shouldDirty: true, shouldValidate: true })
  }

  return <PlaceAutocompleteInput onSelect={handlePlaceSelected} />
}

// 2. Phone number formatter — format on change
<input
  {...register('phone')}
  onChange={e => {
    const digits = e.target.value.replace(/\D/g, '').slice(0, 10)
    const formatted = digits.replace(/(\d{3})(\d{3})(\d{4})/, '($1) $2-$3')
    setValue('phone', formatted, { shouldValidate: true })
  }}
/>

// 3. "Same as billing" checkbox
const sameBilling = watch('sameBilling')
useEffect(() => {
  if (sameBilling) {
    setValue('shippingName',    getValues('billingName'),    { shouldDirty: true })
    setValue('shippingAddress', getValues('billingAddress'), { shouldDirty: true })
  }
}, [sameBilling])
```

---

## W — Why It Matters

- `shouldDirty: true` is easy to forget — without it, `setValue` updates the value but `isDirty` doesn't update, so a save button gated on `isDirty` won't activate after programmatic changes.
- `shouldValidate: true` runs validation immediately after setting — useful for "realtime" autocomplete experiences where you want validation feedback as soon as a value is filled programmatically.
- For bulk updates to the entire form (e.g. loading a saved draft), prefer `reset(data)` over multiple `setValue` calls — `reset` is atomic and more efficient.

---

## I — Interview Q&A

### Q: What options should you pass to `setValue` and when does each matter?

**A:** `shouldDirty: true` updates the dirty state — required if you want `isDirty` to reflect programmatic changes (e.g. a "copy billing to shipping" button should dirty those shipping fields). `shouldValidate: true` triggers validation immediately after setting — use for autocomplete or instant feedback scenarios. `shouldTouch: true` marks the field as touched — use when you want error messages to appear for a programmatically set field (since errors only display for touched fields in `onTouched` mode). If none are passed, only the stored value updates with no side effects.

---

## C — Common Pitfalls + Fix

### ❌ Using `setValue` without `shouldDirty` — isDirty stays false

```tsx
// ❌ Value updates but form still appears "clean"
setValue('email', 'new@example.com')
console.log(isDirty)  // false — save button stays disabled
```

**Fix:**

```tsx
// ✅ isDirty correctly updates
setValue('email', 'new@example.com', { shouldDirty: true })
```

---

## K — Coding Challenge + Solution

### Challenge

Build a profile form with a "Fill with test data" button that populates all fields using `setValue` with `shouldDirty: true` and `shouldValidate: true`. The save button should activate after clicking fill.

### Solution

```tsx
'use client'
import { useForm } from 'react-hook-form'

type F = { name: string; email: string; role: string }

const TEST_DATA: F = { name: 'Test User', email: 'test@example.com', role: 'editor' }

export function ProfileForm() {
  const { register, handleSubmit, setValue, formState: { isDirty, errors } } = useForm<F>({
    defaultValues: { name: '', email: '', role: 'viewer' }
  })

  function fillTestData() {
    const opts = { shouldDirty: true, shouldValidate: true } as const
    setValue('name',  TEST_DATA.name,  opts)
    setValue('email', TEST_DATA.email, opts)
    setValue('role',  TEST_DATA.role,  opts)
  }

  return (
    <form onSubmit={handleSubmit(console.log)} className="space-y-3 max-w-xs">
      <button type="button" onClick={fillTestData}
              className="text-sm text-blue-600 underline">
        Fill with test data
      </button>
      <input {...register('name',  { required: 'Required' })} placeholder="Name"
             className="w-full border rounded-lg px-3 py-2 text-sm" />
      {errors.name  && <p className="text-xs text-red-600">{errors.name.message}</p>}
      <input {...register('email', { required: 'Required' })} placeholder="Email" type="email"
             className="w-full border rounded-lg px-3 py-2 text-sm" />
      {errors.email && <p className="text-xs text-red-600">{errors.email.message}</p>}
      <select {...register('role')} className="w-full border rounded-lg px-3 py-2 text-sm">
        <option value="viewer">Viewer</option>
        <option value="editor">Editor</option>
        <option value="admin">Admin</option>
      </select>
      <button type="submit" disabled={!isDirty}
              className="w-full py-2 bg-blue-600 text-white rounded-lg text-sm
                          font-semibold disabled:opacity-40">
        Save
      </button>
    </form>
  )
}
```

---

---
