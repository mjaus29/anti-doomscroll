# 3 — `update`, `replace`, and the `fields` Array

---

## T — TL;DR

`update(index, value)` replaces a single item's data while keeping it mounted. `replace(newArray)` replaces the entire array at once. The `fields` array is the source of truth for rendering — it mirrors RHF's internal store and includes a stable `.id` per item.

---

## K — Key Concepts

```tsx
const { fields, update, replace } = useFieldArray({ control, name: 'items' })

// ─── update — replace ONE item's value (keeps the DOM node mounted)
// Use for: toggling a field's type, loading saved data into one row
update(1, { description: 'Updated item', qty: 5, unitPrice: 99 })
// Replaces the entire item at index 1 — all sub-fields get new values

// ─── replace — swap out the ENTIRE array
// Use for: loading a saved draft, reverting to original data
replace([
  { description: 'Item A', qty: 1, unitPrice: 10 },
  { description: 'Item B', qty: 3, unitPrice: 25 }
])
// The fields array now has exactly 2 items with the provided values

// ─── fields array — what it contains
fields[0].id          // 'abc123' — stable RHF-generated key (not from your data)
fields[0].description // '' — current form value (mirrors defaultValues + mutations)
fields[0].qty         // 1

// ─── What fields is NOT
// fields is NOT the same as getValues('items')
// fields may lag one render behind after mutations
// For reading current values: getValues('items')
// For rendering:              fields (has .id, needed for React key)
```

```tsx
// ─── update vs setValue for a single item
// update(i, value)   → replaces whole item object, keeps DOM mounted
// setValue(`items.${i}.qty`, 5) → sets a single sub-field

// ─── replace vs reset for whole array
// replace([...])         → replaces the array field only, other fields unchanged
// reset({ items: [...] }) → resets entire form including other fields

// ─── Practical: "Duplicate row" button
function duplicateRow(index: number) {
  const current = getValues('lineItems')
  insert(index + 1, { ...current[index] })  // insert copy after current row
}

// ─── Practical: "Load template" — replace array with preset data
const TEMPLATES = {
  basic:    [{ description: 'Design', qty: 1, unitPrice: 500 }],
  standard: [
    { description: 'Design',     qty: 1, unitPrice: 500 },
    { description: 'Development', qty: 5, unitPrice: 200 }
  ]
}
<button type="button" onClick={() => replace(TEMPLATES.standard)}>
  Load Standard Template
</button>
```

---

## W — Why It Matters

- `update` vs `setValue` matters when replacing an entire item object — `update` is atomic (replaces all sub-fields at once) while calling `setValue` per sub-field fires multiple renders.
- `replace` is the right pattern for "load template" or "load saved draft" for a dynamic array — it's a single operation that completely replaces the array without touching other form fields.
- `fields` includes `.id` for React keys but always represents the rendered state. For reading current submitted values programmatically, always use `getValues('arrayName')` — it's always up-to-date regardless of render timing.

---

## I — Interview Q&A

### Q: When would you use `update` instead of `setValue` for a field array item?

**A:** Use `update(index, newItem)` when you need to replace an entire item's data atomically — for example, when a user selects a product from a dropdown and you want to auto-fill the description, unit price, and category all at once. `update` replaces the whole item object in one operation. Using `setValue('items.${i}.description', ...)` + `setValue('items.${i}.unitPrice', ...)` fires two separate updates and may cause intermediate render states where the description changed but the price hasn't yet. `update` is single-operation and consistent.

---

## C — Common Pitfalls + Fix

### ❌ Reading `fields[i].someValue` to get the current form value

```tsx
// ❌ fields may be stale — reflects last render, not latest typed value
const currentQty = fields[i].qty  // could be one keystroke behind
```

**Fix:** Use `getValues` for current values, `fields` only for the React key:

```tsx
// ✅ fields: React keys only; getValues: current values
const currentItem = getValues(`lineItems.${i}`)
const currentQty  = currentItem.qty  // always fresh
```

---

## K — Coding Challenge + Solution

### Challenge

Build an order form with line items. Add a "Duplicate row" button per item (uses `insert`) and a "Load template" button that calls `replace` with preset data. Also add a "Clear all" button that calls `replace([])`.

### Solution

```tsx
'use client'
import { useForm, useFieldArray } from 'react-hook-form'
import { zodResolver }            from '@hookform/resolvers/zod'
import { z }                      from 'zod'

const ItemSchema = z.object({
  description: z.string().min(1, 'Required'),
  qty:         z.coerce.number().int().positive(),
  unitPrice:   z.coerce.number().positive()
})
const OrderSchema = z.object({
  items: z.array(ItemSchema).min(1, 'Add at least one item')
})
type OrderForm = z.infer<typeof OrderSchema>

const TEMPLATE = [
  { description: 'Consultation', qty: 1, unitPrice: 150 },
  { description: 'Development',  qty: 8, unitPrice: 95  }
]

export function OrderForm() {
  const { register, control, handleSubmit, getValues, formState: { errors } } = useForm<OrderForm>({
    resolver:      zodResolver(OrderSchema),
    defaultValues: { items: [{ description: '', qty: 1, unitPrice: 0 }] }
  })

  const { fields, append, remove, insert, replace } = useFieldArray({ control, name: 'items' })

  function duplicate(i: number) {
    const item = getValues(`items.${i}`)
    insert(i + 1, { ...item })
  }

  const cls = 'border rounded-xl px-2 py-1.5 text-sm'
  const err = 'text-xs text-red-600 mt-1'

  return (
    <form onSubmit={handleSubmit(console.log)} className="space-y-4 max-w-lg">
      <div className="flex gap-2">
        <button type="button" onClick={() => replace(TEMPLATE)}
                className="text-sm text-blue-600 border border-blue-200 px-3 py-1.5 rounded-lg hover:bg-blue-50">
          Load template
        </button>
        <button type="button" onClick={() => replace([])}
                className="text-sm text-gray-500 border px-3 py-1.5 rounded-lg hover:bg-gray-50">
          Clear all
        </button>
      </div>

      <div className="space-y-2">
        {fields.map((field, i) => (
          <div key={field.id} className="flex gap-2 items-center">
            <input {...register(`items.${i}.description`)} placeholder="Description"
                   className={`flex-1 ${cls}`} />
            <input {...register(`items.${i}.qty`)}       type="number" placeholder="Qty"
                   className={`w-16 ${cls}`} />
            <input {...register(`items.${i}.unitPrice`)} type="number" step="0.01" placeholder="Price"
                   className={`w-24 ${cls}`} />
            <button type="button" onClick={() => duplicate(i)}
                    className="text-xs px-2 py-1.5 border rounded-lg text-blue-500 hover:bg-blue-50">
              Copy
            </button>
            <button type="button" onClick={() => remove(i)}
                    className="text-xs px-2 py-1.5 border border-red-200 rounded-lg text-red-500">
              ✕
            </button>
          </div>
        ))}
        {errors.items?.root && <p className={err}>{errors.items.root.message}</p>}
      </div>

      <button type="button" onClick={() => append({ description: '', qty: 1, unitPrice: 0 })}
              className="text-sm text-blue-600 underline">
        + Add item
      </button>

      <button type="submit"
              className="w-full py-2.5 bg-blue-600 text-white rounded-xl text-sm font-semibold">
        Submit order
      </button>
    </form>
  )
}
```

---

---
