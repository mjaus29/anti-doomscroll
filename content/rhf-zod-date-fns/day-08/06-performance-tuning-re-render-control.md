# 6 — Performance Tuning — Re-render Control

---

## T — TL;DR

RHF minimises re-renders by default — `register` is uncontrolled. Re-renders occur when you read `formState` properties. Subscribe only to what you need. Use `useWatch` instead of `watch` to isolate subscriptions to specific components. Avoid `watch()` at the top level of large forms.

---

## K — Key Concepts

```tsx
// ─── What causes re-renders in RHF

// 1. Reading formState properties — each subscription triggers re-render on change
const { formState: { errors } }         = useForm()  // re-renders when errors change
const { formState: { isSubmitting } }   = useForm()  // re-renders when submitting state changes
const { formState: { isDirty } }        = useForm()  // re-renders when dirty state changes

// Destructure ONLY what you need — RHF uses proxies to track access
// If you never read isSubmitting, it doesn't trigger re-renders ✅

// 2. watch() — re-renders the component on every field change
const allValues = watch()           // re-renders on ANY field change ❌ (in large forms)
const email     = watch('email')    // re-renders only when email changes ✅
```

```tsx
// ─── useWatch vs watch — isolate subscriptions to child components

// ❌ watch in parent re-renders the parent on every field change
function LargeForm() {
  const { watch } = useForm()
  const type = watch('accountType')  // parent re-renders on every keystroke in other fields
  return (
    <>
      {/* 20 input fields */}
      {type === 'business' && <BusinessSection />}
    </>
  )
}

// ✅ useWatch in an isolated component — only that component re-renders
function ConditionalSection() {
  const type = useWatch({ name: 'accountType' })  // requires FormProvider
  return type === 'business' ? <BusinessSection /> : null
}

function LargeForm() {
  const methods = useForm()
  return (
    <FormProvider {...methods}>
      <form>
        {/* 20 input fields render once — no re-renders from type changes */}
        <ConditionalSection />
      </form>
    </FormProvider>
  )
}
```

```tsx
// ─── Memoize expensive computed values
import { useMemo } from 'react'

const values    = useWatch({ control, name: ['items'] })
const totalCost = useMemo(() =>
  values[0]?.reduce((sum: number, item: any) =>
    sum + (item.qty ?? 0) * (item.unitPrice ?? 0), 0
  ) ?? 0,
  [values]
)

// ─── Avoid inline defaultValues objects — stable reference
// ❌ New object reference on every render — form resets unexpectedly
const { register } = useForm({ defaultValues: { name: '' } })

// ✅ Stable reference outside component or memoized
const DEFAULT_VALUES = { name: '', email: '' }
const { register }  = useForm({ defaultValues: DEFAULT_VALUES })
```

---

## W — Why It Matters

- `watch()` with no arguments subscribes the component to every field change — in a 20-field form with `mode: 'onChange'`, this means 20 re-renders per field update for the parent component. Each re-render re-runs all children's reconciliation.
- RHF's proxy-based `formState` means destructuring `const { errors, isDirty }` subscribes to both — if you only need `isSubmitting`, destructure only that. Unused `formState` properties don't add overhead.
- `useWatch` in a child component with `FormProvider` is the pattern for conditional UI that depends on field values — the parent form renders once and only the watcher component re-renders.

---

## I — Interview Q&A

### Q: What is the performance difference between `watch` and `useWatch` in React Hook Form?

**A:** Both subscribe to field value changes and trigger re-renders when the watched value changes. The difference is **scope**. `watch` is called in the component that owns `useForm` — so that component re-renders. `useWatch` can be called in any descendant of `FormProvider` — so only that smaller component re-renders. For conditional UI or computed values derived from fields, extract the consuming logic into a child component using `useWatch`. The parent form and its 20 other fields don't re-render when only the child's watched value changes.

---

## C — Common Pitfalls + Fix

### ❌ Destructuring unused `formState` properties — subscribes unnecessarily

```tsx
// ❌ Subscribes to errors, isDirty, isSubmitting, isValid, touchedFields
// Re-renders whenever ANY of these change
const { formState } = useForm()
const { errors, isDirty, isSubmitting, isValid, touchedFields } = formState
// You only needed errors — but now re-renders for every state change ❌
```

**Fix:** Destructure only what you use:

```tsx
// ✅ Only subscribes to errors and isSubmitting
const { formState: { errors, isSubmitting } } = useForm()
```

---

## K — Coding Challenge + Solution

### Challenge

Build a `CartForm` with a line items field array. Extract a `<CartTotal>` component that uses `useWatch` to show the live total price — without causing the parent form to re-render. Parent should render once; only `<CartTotal>` re-renders on item changes.

### Solution

```tsx
'use client'
import { useForm, useFieldArray, useWatch, FormProvider } from 'react-hook-form'
import { zodResolver }                                      from '@hookform/resolvers/zod'
import { useMemo }                                          from 'react'
import { z }                                               from 'zod'

const CartSchema = z.object({
  items: z.array(z.object({
    name:      z.string().min(1),
    qty:       z.coerce.number().int().positive(),
    unitPrice: z.coerce.number().positive()
  })).min(1)
})
type CartForm = z.infer<typeof CartSchema>

// ✅ Isolated watcher — only this re-renders on item changes
function CartTotal() {
  const items = useWatch({ name: 'items' }) as CartForm['items']
  const total = useMemo(() =>
    (items ?? []).reduce((sum, item) =>
      sum + (Number(item?.qty) || 0) * (Number(item?.unitPrice) || 0), 0),
    [items]
  )
  return (
    <div className="p-3 bg-gray-50 rounded-xl flex justify-between items-center">
      <span className="text-sm font-semibold">Total</span>
      <span className="text-lg font-bold text-blue-600">
        ${total.toFixed(2)}
      </span>
    </div>
  )
}

export function CartForm() {
  // Parent renders once — CartTotal handles its own subscriptions
  const methods = useForm<CartForm>({
    resolver:      zodResolver(CartSchema),
    defaultValues: { items: [{ name: '', qty: 1, unitPrice: 0 }] }
  })
  const { register, control, handleSubmit, formState: { errors } } = methods
  const { fields, append, remove } = useFieldArray({ control, name: 'items' })

  return (
    <FormProvider {...methods}>
      <form onSubmit={handleSubmit(console.log)} className="space-y-4 max-w-md">
        {fields.map((field, i) => (
          <div key={field.id} className="flex gap-2">
            <input {...register(`items.${i}.name`)}      placeholder="Item"  className="flex-1 border rounded-xl px-3 py-2 text-sm" />
            <input {...register(`items.${i}.qty`)}       type="number" style={{ width: 60 }} className="border rounded-xl px-3 py-2 text-sm" />
            <input {...register(`items.${i}.unitPrice`)} type="number" step="0.01" style={{ width: 80 }} className="border rounded-xl px-3 py-2 text-sm" />
            <button type="button" onClick={() => remove(i)} className="px-2 text-red-500 border border-red-200 rounded-xl text-sm">✕</button>
          </div>
        ))}
        <button type="button" onClick={() => append({ name: '', qty: 1, unitPrice: 0 })}
                className="text-sm text-blue-600 underline">+ Add item</button>
        <CartTotal />   {/* ← only this component re-renders on value changes */}
        <button type="submit" className="w-full py-2.5 bg-blue-600 text-white rounded-xl text-sm font-semibold">
          Place order
        </button>
      </form>
    </FormProvider>
  )
}
```

---

---
