# 5 — `useWatch` — Isolated Component Re-renders

---

## T — TL;DR

`useWatch` is `watch` extracted into a hook you call inside a **child component** — only that child re-renders when the watched field changes. Use it to isolate expensive or reactive sub-components from the parent form's render cycle.

---

## K — Key Concepts

```tsx
import { useWatch } from 'react-hook-form'

// ─── Inside a child component
function TotalDisplay({ control }: { control: Control<OrderForm> }) {
  const quantity = useWatch({ control, name: 'quantity', defaultValue: 1 })
  const price    = useWatch({ control, name: 'price',    defaultValue: 0 })
  // Only TotalDisplay re-renders when quantity or price changes
  // The parent form does NOT re-render ✅
  return <p className="font-bold">Total: ${(quantity * price).toFixed(2)}</p>
}

// ─── With FormProvider (no need to pass control)
function TotalDisplay() {
  const quantity = useWatch<OrderForm>({ name: 'quantity', defaultValue: 1 })
  const price    = useWatch<OrderForm>({ name: 'price',    defaultValue: 0 })
  return <p className="font-bold">Total: ${(quantity * price).toFixed(2)}</p>
}

// ─── Watch multiple fields
const [first, last] = useWatch({ control, name: ['firstName', 'lastName'] })
const fullName       = `${first ?? ''} ${last ?? ''}`.trim()

// ─── Watch entire form (returns all values)
const allValues = useWatch({ control })
```

```
watch vs useWatch:

watch('field')    → called in the PARENT — parent re-renders
useWatch({ name }) → called in a CHILD — only child re-renders

Use useWatch when the reactive display is in a separate component
and you want to shield the parent form from those re-renders.
```

---

## W — Why It Matters

- In a large form with a real-time preview panel (e.g. invoice preview, bio preview), using `watch` in the parent causes the entire form to re-render on every keystroke. `useWatch` in the preview component isolates those re-renders to just the preview.
- The `defaultValue` option on `useWatch` is important — before the field is registered, `useWatch` returns `undefined`. Providing `defaultValue` prevents downstream errors in arithmetic (`undefined * 5 = NaN`).
- `useWatch` is the right tool when a child component needs to *display* a computed value from form fields — order totals, character counts, formatted previews.

---

## I — Interview Q&A

### Q: When do you use `useWatch` instead of `watch`?

**A:** Use `watch` in the same component that renders the form — it's convenient and direct. Use `useWatch` when the reactive value is consumed by a **child component** and you want to prevent the parent from re-rendering. `watch` in the parent causes the parent (and all its children) to re-render on every change. `useWatch` in a child isolates those re-renders to the child only. A practical example: a live character counter for a textarea — put it in a `<CharacterCount />` child using `useWatch` so the counter updates every keystroke without re-rendering the full form.

---

## C — Common Pitfalls + Fix

### ❌ Forgetting `defaultValue` — returns `undefined` before field registers

```tsx
// ❌ quantity is undefined on first render → 1 * undefined = NaN
const quantity = useWatch({ control, name: 'quantity' })
const total    = price * quantity  // NaN ❌
```

**Fix:**

```tsx
// ✅
const quantity = useWatch({ control, name: 'quantity', defaultValue: 1 })
const total    = price * quantity  // safe ✅
```

---

## K — Coding Challenge + Solution

### Challenge

Build an order form with `quantity` (number) and `unitPrice` (number) fields. Use `useWatch` in a separate `<OrderTotal>` child component to show the running total. Prove the parent does not re-render per keystroke by adding a render counter to it.

### Solution

```tsx
'use client'
import { useRef }                     from 'react'
import { useForm, useWatch, Control } from 'react-hook-form'

type F = { quantity: number; unitPrice: number }

function OrderTotal({ control }: { control: Control<F> }) {
  const qty   = useWatch({ control, name: 'quantity',  defaultValue: 1 })
  const price = useWatch({ control, name: 'unitPrice', defaultValue: 0 })
  return (
    <div className="p-3 bg-gray-50 rounded-xl text-sm font-semibold">
      Total: ${(qty * price).toFixed(2)}
    </div>
  )
}

export function OrderForm() {
  const renders = useRef(0)
  renders.current++

  const { register, handleSubmit, control } = useForm<F>({
    defaultValues: { quantity: 1, unitPrice: 9.99 }
  })

  return (
    <form onSubmit={handleSubmit(console.log)} className="space-y-4 max-w-xs">
      <p className="text-xs text-gray-400">Parent renders: {renders.current}</p>
      <div>
        <label className="text-xs text-gray-500 mb-1 block">Quantity</label>
        <input {...register('quantity',  { valueAsNumber: true, min: 1 })}
               type="number"
               className="w-full border rounded-lg px-3 py-2 text-sm" />
      </div>
      <div>
        <label className="text-xs text-gray-500 mb-1 block">Unit price ($)</label>
        <input {...register('unitPrice', { valueAsNumber: true, min: 0 })}
               type="number" step="0.01"
               className="w-full border rounded-lg px-3 py-2 text-sm" />
      </div>
      <OrderTotal control={control} />
      <button type="submit"
              className="w-full py-2 bg-blue-600 text-white rounded-lg text-sm font-semibold">
        Place order
      </button>
    </form>
  )
}
```

---

---
