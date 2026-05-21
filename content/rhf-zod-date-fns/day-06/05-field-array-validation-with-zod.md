# 5 — Field Array Validation with Zod

---

## T — TL;DR

Zod validates each item in a field array individually, producing per-item errors at the exact path. Cross-item validation uses `.superRefine` on the array. Array-level rules (`.min`, `.nonempty`) produce a root error at `errors.arrayName.root`. Each item's field errors appear at `errors.arrayName[i].fieldName`.

---

## K — Key Concepts

```tsx
import { z } from 'zod'

// ─── Per-item validation — standard field rules
const LineItemSchema = z.object({
  description: z.string().min(1, 'Required'),
  qty:         z.coerce.number().int().positive('Must be > 0'),
  unitPrice:   z.coerce.number().positive('Must be > 0')
})

// ─── Array-level rules
const FormSchema = z.object({
  lineItems: z.array(LineItemSchema)
    .min(1, 'At least one item required')           // array root error
    .max(20, 'Maximum 20 items')
    .nonempty('Add at least one line item')
})

// Error paths:
// Array root:    errors.lineItems?.root?.message    (array-level rule failure)
// Item field:    errors.lineItems?.[i]?.qty?.message (per-item field failure)
```

```tsx
// ─── Cross-item validation with superRefine
const StockSchema = z.object({
  items: z.array(z.object({
    sku:      z.string().min(1),
    quantity: z.coerce.number().int().nonnegative()
  })).superRefine((items, ctx) => {
    // Rule 1: No duplicate SKUs
    const skus = items.map(i => i.sku)
    skus.forEach((sku, index) => {
      if (skus.indexOf(sku) !== index) {
        ctx.addIssue({
          code:    z.ZodIssueCode.custom,
          message: `Duplicate SKU: ${sku}`,
          path:    [index, 'sku']  // path relative to the array item
        })
      }
    })
    // Rule 2: Total quantity must not exceed 1000
    const total = items.reduce((sum, i) => sum + i.quantity, 0)
    if (total > 1000) {
      ctx.addIssue({
        code:    z.ZodIssueCode.custom,
        message: `Total quantity (${total}) exceeds warehouse limit of 1000`,
        path:    []  // no specific item — appears as array root error
      })
    }
  })
})

// Error access:
// Duplicate SKU at item 2: errors.items?.[2]?.sku?.message
// Total exceeded:          errors.items?.root?.message
```

```tsx
// ─── Rendering array errors in the form

// Array root error (min/max/nonempty or superRefine with path: [])
{errors.lineItems?.root && (
  <p className="text-xs text-red-600">{errors.lineItems.root.message}</p>
)}

// Per-item field errors
{fields.map((field, i) => (
  <div key={field.id}>
    <input {...register(`lineItems.${i}.description`)} />
    {errors.lineItems?.[i]?.description && (
      <p className="text-xs text-red-600">{errors.lineItems[i]?.description?.message}</p>
    )}
    <input {...register(`lineItems.${i}.qty`)} type="number" />
    {errors.lineItems?.[i]?.qty && (
      <p className="text-xs text-red-600">{errors.lineItems[i]?.qty?.message}</p>
    )}
  </div>
))}
```

---

## W — Why It Matters

- Without understanding the `errors.array.root` vs `errors.array[i].field` distinction, array validation errors are invisible in the UI — developers add the schema rule but never render the error because they look in the wrong place.
- Cross-item validation (`superRefine` on the array) prevents issues that per-item rules can't catch — duplicate values, totals exceeding limits, mutual exclusion between items.
- `path: [index, 'fieldName']` inside array `superRefine` is relative to the array item — Zod prepends the array path automatically, so the full error path becomes `items.${index}.fieldName`.

---

## I — Interview Q&A

### Q: Where does a Zod `.min(1)` error on an array appear in RHF's `errors` object?

**A:** At `errors.arrayFieldName.root.message` — not at `errors.arrayFieldName.message`. RHF maps array-level Zod issues (those with `path: []` relative to the array) to the `.root` property of the array's error object. This means you must render `{errors.lineItems?.root?.message}` separately from individual item errors — it won't automatically appear if you only map over per-item errors. Check both when debugging missing validation feedback.

---

## C — Common Pitfalls + Fix

### ❌ Looking for array-level errors at `errors.items?.message`

```tsx
// ❌ .min() error doesn't appear here
{errors.items?.message && <p>{errors.items.message}</p>}
// This is undefined — the error is at .root ❌
```

**Fix:**

```tsx
// ✅ Array-level errors at .root
{errors.items?.root && <p className="text-xs text-red-600">{errors.items.root.message}</p>}
```

---

## K — Coding Challenge + Solution

### Challenge

Build an inventory form with items array. Validate: each item has `sku` (min 3) and `quantity` (positive int). Array superRefine: no duplicate SKUs (error on the duplicate's sku field), total quantity ≤ 500 (root error). Render all error types.

### Solution

```tsx
'use client'
import { useForm, useFieldArray } from 'react-hook-form'
import { zodResolver }            from '@hookform/resolvers/zod'
import { z }                      from 'zod'

const InventorySchema = z.object({
  warehouseId: z.string().min(1, 'Required'),
  items: z.array(z.object({
    sku:      z.string().min(3, 'Min 3 chars'),
    quantity: z.coerce.number().int().positive('Must be > 0')
  }))
  .min(1, 'Add at least one item')
  .superRefine((items, ctx) => {
    const skus = items.map(i => i.sku.trim().toLowerCase())
    skus.forEach((sku, i) => {
      if (sku && skus.indexOf(sku) !== i) {
        ctx.addIssue({ code: z.ZodIssueCode.custom,
          message: 'Duplicate SKU', path: [i, 'sku'] })
      }
    })
    const total = items.reduce((s, i) => s + (i.quantity || 0), 0)
    if (total > 500) {
      ctx.addIssue({ code: z.ZodIssueCode.custom,
        message: `Total ${total} exceeds limit of 500 units`, path: [] })
    }
  })
})
type InventoryForm = z.infer<typeof InventorySchema>

export function InventoryForm() {
  const { register, control, handleSubmit, formState: { errors } } = useForm<InventoryForm>({
    resolver:      zodResolver(InventorySchema),
    defaultValues: { warehouseId: '', items: [{ sku: '', quantity: 1 }] }
  })
  const { fields, append, remove } = useFieldArray({ control, name: 'items' })

  const cls = 'border rounded-xl px-3 py-2 text-sm'
  const err = 'text-xs text-red-600 mt-1'

  return (
    <form onSubmit={handleSubmit(console.log)} className="space-y-4 max-w-md">
      <div>
        <input {...register('warehouseId')} placeholder="Warehouse ID" className={`w-full ${cls}`} />
        {errors.warehouseId && <p className={err}>{errors.warehouseId.message}</p>}
      </div>

      {/* Array root error */}
      {errors.items?.root && (
        <p className="px-3 py-2 bg-red-50 rounded-xl text-sm text-red-700">
          {errors.items.root.message}
        </p>
      )}

      <div className="space-y-2">
        {fields.map((field, i) => (
          <div key={field.id} className="space-y-1 p-3 border border-gray-200 rounded-xl">
            <div className="flex gap-2">
              <div className="flex-1">
                <input {...register(`items.${i}.sku`)} placeholder="SKU" className={`w-full ${cls}`} />
                {errors.items?.[i]?.sku && <p className={err}>{errors.items[i]?.sku?.message}</p>}
              </div>
              <div className="w-28">
                <input {...register(`items.${i}.quantity`)} type="number" placeholder="Qty"
                       className={`w-full ${cls}`} />
                {errors.items?.[i]?.quantity && <p className={err}>{errors.items[i]?.quantity?.message}</p>}
              </div>
              <button type="button" onClick={() => remove(i)}
                      className="px-2 py-1 border border-red-200 rounded-lg text-xs text-red-500 self-start mt-0.5">✕</button>
            </div>
          </div>
        ))}
      </div>

      <button type="button" onClick={() => append({ sku: '', quantity: 1 })}
              className="text-sm text-blue-600 underline">+ Add item</button>
      <button type="submit"
              className="w-full py-2.5 bg-blue-600 text-white rounded-xl text-sm font-semibold">
        Submit inventory
      </button>
    </form>
  )
}
```

---

---
