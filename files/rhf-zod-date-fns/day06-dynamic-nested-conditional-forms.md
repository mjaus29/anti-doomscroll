
# 📅 Day 6 — Dynamic, Nested, and Conditional Forms

> **Goal:** Build forms where fields are added/removed at runtime, nested arrays validate deeply, conditional sections appear based on user input, and Zod discriminated unions align schema shape with UI branches.
> **Format:** Each subtopic = 5–15 min. Do one. Stop. Come back.
> **Stack:** react-hook-form v7.74.0 · zod v4.3.6 · TypeScript 6

---

## 📋 Day 6 Subtopic Overview

| # | Subtopic | Time |
|---|----------|------|
| 1 | `useFieldArray` — Setup and Core Concepts | 10 min |
| 2 | `append`, `prepend`, `remove`, `insert`, `swap`, `move` | 10 min |
| 3 | `update`, `replace`, and the `fields` Array | 8 min |
| 4 | Nested Arrays and Objects inside Field Arrays | 12 min |
| 5 | Field Array Validation with Zod | 10 min |
| 6 | Dependent and Conditional Fields | 12 min |
| 7 | Discriminated Unions — Schema Branching | 12 min |
| 8 | Aligning Dynamic UI with Schema Structure | 10 min |

---

---

# 1 — `useFieldArray` — Setup and Core Concepts

---

## T — TL;DR

`useFieldArray` manages an array of fields — each item in the array is a form object with its own registered inputs. It gives you a `fields` array to render, and methods (`append`, `remove`, etc.) to mutate it. Use it for line items, tag lists, team members, or any repeating group of inputs.

---

## K — Key Concepts

```tsx
import { useForm, useFieldArray } from 'react-hook-form'
import { zodResolver }            from '@hookform/resolvers/zod'
import { z }                      from 'zod'

// ─── Schema: array field inside an object
const InvoiceSchema = z.object({
  clientName: z.string().min(1),
  lineItems:  z.array(z.object({
    description: z.string().min(1, 'Required'),
    qty:         z.coerce.number().int().positive('Must be > 0'),
    unitPrice:   z.coerce.number().positive('Must be > 0')
  })).min(1, 'At least one line item required')
})
type InvoiceForm = z.infer<typeof InvoiceSchema>

function InvoiceForm() {
  const { register, control, handleSubmit, formState: { errors } } =
    useForm<InvoiceForm>({
      resolver:      zodResolver(InvoiceSchema),
      defaultValues: {
        clientName: '',
        lineItems:  [{ description: '', qty: 1, unitPrice: 0 }]
      }
    })

  // ─── useFieldArray
  const { fields, append, remove } = useFieldArray({
    control,          // from useForm — required
    name: 'lineItems' // must match the array field in your schema
  })
  // fields: [{ id: 'rhf-generated-id', description: '', qty: 1, unitPrice: 0 }, ...]
  // id is a stable RHF-generated key — use it as the React key, NOT index
```

```tsx
  return (
    <form onSubmit={handleSubmit(console.log)} className="space-y-4 max-w-md">
      <input {...register('clientName')} placeholder="Client name"
             className="w-full border rounded-xl px-3 py-2 text-sm" />

      {fields.map((field, index) => (
        // ✅ Use field.id as key — stable across re-orders
        <div key={field.id} className="flex gap-2 items-start">
          <input
            {...register(`lineItems.${index}.description`)}
            placeholder="Description"
            className="flex-1 border rounded-xl px-3 py-2 text-sm"
          />
          <input
            {...register(`lineItems.${index}.qty`)}
            type="number" placeholder="Qty" style={{ width: 70 }}
            className="border rounded-xl px-3 py-2 text-sm"
          />
          <input
            {...register(`lineItems.${index}.unitPrice`)}
            type="number" step="0.01" placeholder="Price" style={{ width: 90 }}
            className="border rounded-xl px-3 py-2 text-sm"
          />
          <button type="button" onClick={() => remove(index)}
                  className="px-3 py-2 text-red-500 border border-red-200
                               rounded-xl text-sm hover:bg-red-50">
            ✕
          </button>
        </div>
      ))}

      {errors.lineItems?.root && (
        <p className="text-xs text-red-600">{errors.lineItems.root.message}</p>
      )}

      <button type="button"
              onClick={() => append({ description: '', qty: 1, unitPrice: 0 })}
              className="text-sm text-blue-600 underline">
        + Add line item
      </button>

      <button type="submit"
              className="w-full py-2.5 bg-blue-600 text-white rounded-xl text-sm font-semibold">
        Create invoice
      </button>
    </form>
  )
}
```

```
useFieldArray key facts:

  fields array      → RHF-managed, each item has a stable .id
  register path     → 'arrayName.${index}.fieldName'  (template literal)
  Never use index as React key → use field.id (stable across re-orders)
  defaultValues must include the array → at least []
  Appended items use append({...defaults}) — must match item schema shape
```

---

## W — Why It Matters

- `useFieldArray` is the only correct way to manage dynamic arrays in RHF. Managing an array manually with `useState` and `setValue` causes stale ref issues — inputs lose focus and validation breaks.
- The `field.id` rule is critical. Using `index` as a key causes React to reuse DOM nodes when items are removed or reordered — inputs get the wrong values because the DOM node is recycled.
- `defaultValues` must include the array field (even as `[]`) — without it, the first `append` call produces uncontrolled-to-controlled warnings and `isDirty` doesn't work.

---

## I — Interview Q&A

### Q: Why should you use `field.id` as the React key instead of `index` in `useFieldArray`?

**A:** When you remove an item from the middle of an array (e.g. index 1 of 3), React re-uses the existing DOM nodes for items that shift down. Using `index` as the key means item at index 2 gets moved to index 1's DOM node — the input value appears correct in the DOM but RHF's internal store maps that node to the wrong field. Using `field.id` (a stable UUID generated by RHF per item) means each DOM node is uniquely tied to its field — React mounts a new node when the item's id changes and properly unmounts removed ones.

---

## C — Common Pitfalls + Fix

### ❌ Using array index as React key

```tsx
// ❌ Reorders cause wrong values in inputs
{fields.map((field, index) => (
  <div key={index}>  {/* ← bug */}
```

**Fix:**

```tsx
// ✅ Stable identity
{fields.map((field, index) => (
  <div key={field.id}>
```

---

## K — Coding Challenge + Solution

### Challenge

Build a `TeamForm` with a repeating `members` array (each has `name` string, `email` string). Start with one empty member. "Add member" appends a blank entry. "Remove" deletes by index. Submit logs the full array.

### Solution

```tsx
'use client'
import { useForm, useFieldArray } from 'react-hook-form'
import { zodResolver }            from '@hookform/resolvers/zod'
import { z }                      from 'zod'

const TeamSchema = z.object({
  teamName: z.string().min(1, 'Required'),
  members:  z.array(z.object({
    name:  z.string().min(1, 'Name required'),
    email: z.string().email('Invalid email')
  })).min(1, 'At least one member required')
})
type TeamForm = z.infer<typeof TeamSchema>

export function TeamForm() {
  const { register, control, handleSubmit, formState: { errors } } = useForm<TeamForm>({
    resolver:      zodResolver(TeamSchema),
    defaultValues: { teamName: '', members: [{ name: '', email: '' }] }
  })

  const { fields, append, remove } = useFieldArray({ control, name: 'members' })

  const cls = 'border rounded-xl px-3 py-2 text-sm w-full'
  const err = 'text-xs text-red-600 mt-1'

  return (
    <form onSubmit={handleSubmit(console.log)} className="space-y-5 max-w-md">
      <div>
        <input {...register('teamName')} placeholder="Team name" className={cls} />
        {errors.teamName && <p className={err}>{errors.teamName.message}</p>}
      </div>

      <div className="space-y-3">
        {fields.map((field, i) => (
          <div key={field.id} className="p-3 border border-gray-200 rounded-2xl space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-gray-500">Member {i + 1}</span>
              {fields.length > 1 && (
                <button type="button" onClick={() => remove(i)}
                        className="text-xs text-red-500 hover:text-red-700">Remove</button>
              )}
            </div>
            <input {...register(`members.${i}.name`)}  placeholder="Full name"  className={cls} />
            {errors.members?.[i]?.name  && <p className={err}>{errors.members[i]?.name?.message}</p>}
            <input {...register(`members.${i}.email`)} placeholder="Email" type="email" className={cls} />
            {errors.members?.[i]?.email && <p className={err}>{errors.members[i]?.email?.message}</p>}
          </div>
        ))}
        {errors.members?.root && <p className={err}>{errors.members.root.message}</p>}
      </div>

      <button type="button" onClick={() => append({ name: '', email: '' })}
              className="text-sm text-blue-600 underline">
        + Add member
      </button>

      <button type="submit"
              className="w-full py-2.5 bg-blue-600 text-white rounded-xl text-sm font-semibold">
        Save team
      </button>
    </form>
  )
}
```

---

---

# 2 — `append`, `prepend`, `remove`, `insert`, `swap`, `move`

---

## T — TL;DR

`useFieldArray` exposes six mutation methods. `append`/`prepend` add items. `remove` deletes by index. `insert` adds at a specific position. `swap` exchanges two items. `move` repositions one item. All update both the RHF store and trigger re-renders.

---

## K — Key Concepts

```tsx
const { fields, append, prepend, remove, insert, swap, move } = useFieldArray({
  control, name: 'items'
})

type Item = { name: string; qty: number }

// ─── append — add to END
append({ name: '', qty: 1 })
append([{ name: 'A', qty: 1 }, { name: 'B', qty: 2 }]) // multiple at once
append({ name: '' }, { shouldFocus: false })  // don't auto-focus appended input

// ─── prepend — add to BEGINNING
prepend({ name: 'First', qty: 1 })

// ─── remove — delete by index (or array of indexes)
remove(0)           // delete first item
remove(2)           // delete item at index 2
remove([0, 2])      // delete multiple items by index

// ─── insert — add at specific position
insert(1, { name: 'Inserted', qty: 1 })
// Before: [A, B, C] → After: [A, Inserted, B, C]

// ─── swap — exchange two items (by index)
swap(0, 2)
// Before: [A, B, C] → After: [C, B, A]

// ─── move — reposition one item (from index, to index)
move(2, 0)
// Before: [A, B, C] → After: [C, A, B]  (moved index 2 → index 0)
```

```tsx
// ─── Practical: drag-to-reorder (simplified)
function ReorderableList() {
  const { fields, move } = useFieldArray({ control, name: 'tasks' })

  function handleMoveUp(index: number) {
    if (index > 0) move(index, index - 1)
  }
  function handleMoveDown(index: number) {
    if (index < fields.length - 1) move(index, index + 1)
  }

  return fields.map((field, i) => (
    <div key={field.id} className="flex items-center gap-2">
      <input {...register(`tasks.${i}.title`)} className="flex-1 border rounded-xl px-3 py-2 text-sm" />
      <button type="button" onClick={() => handleMoveUp(i)}   disabled={i === 0}
              className="px-2 py-1 border rounded text-xs disabled:opacity-30">↑</button>
      <button type="button" onClick={() => handleMoveDown(i)} disabled={i === fields.length - 1}
              className="px-2 py-1 border rounded text-xs disabled:opacity-30">↓</button>
      <button type="button" onClick={() => remove(i)}
              className="px-2 py-1 border border-red-200 rounded text-xs text-red-500">✕</button>
    </div>
  ))
}
```

---

## W — Why It Matters

- `move` is the correct tool for reordering — it preserves all field values and validation state. Implementing reorder with remove+insert manually causes value-mismatch bugs because RHF's internal refs get out of sync.
- `shouldFocus: false` on `append` is essential for programmatic adds (e.g. loading saved data, "duplicate row") — without it, the browser scrolls to the new input every time.
- `remove([0, 2])` (array of indices) is the correct way to delete multiple items at once — calling `remove` in a loop produces intermediate re-renders and may use stale indices.

---

## I — Interview Q&A

### Q: What is the difference between `swap` and `move` in `useFieldArray`?

**A:** `swap(a, b)` exchanges the items at indices `a` and `b` — both items change position. `move(from, to)` shifts one item to a new position, and all items between the two indices shift to fill the gap. Use `swap` for manual "exchange" actions. Use `move` for drag-to-reorder or up/down arrow reordering where one item slides past others.

---

## C — Common Pitfalls + Fix

### ❌ Calling `remove` in a loop with static indices

```tsx
// ❌ After remove(0), all indices shift — remove(1) now removes the wrong item
selectedIndices.forEach(i => remove(i))
```

**Fix:** Pass all indices at once:

```tsx
// ✅ All removed in one operation — no shifting mid-loop
remove(selectedIndices)
```

---

## K — Coding Challenge + Solution

### Challenge

Build a `PlaylistForm` — an ordered list of tracks (`title` string). Implement: append (add track), remove (delete track), move up/down buttons per row. Show "No tracks" when empty.

### Solution

```tsx
'use client'
import { useForm, useFieldArray } from 'react-hook-form'
import { zodResolver }            from '@hookform/resolvers/zod'
import { z }                      from 'zod'

const PlaylistSchema = z.object({
  playlistName: z.string().min(1, 'Required'),
  tracks:       z.array(z.object({ title: z.string().min(1, 'Required') }))
                 .min(1, 'Add at least one track')
})
type PlaylistForm = z.infer<typeof PlaylistSchema>

export function PlaylistForm() {
  const { register, control, handleSubmit, formState: { errors } } = useForm<PlaylistForm>({
    resolver:      zodResolver(PlaylistSchema),
    defaultValues: { playlistName: '', tracks: [] }
  })

  const { fields, append, remove, move } = useFieldArray({ control, name: 'tracks' })
  const cls = 'border rounded-xl px-3 py-2 text-sm'

  return (
    <form onSubmit={handleSubmit(console.log)} className="space-y-4 max-w-md">
      <div>
        <input {...register('playlistName')} placeholder="Playlist name" className={`w-full ${cls}`} />
        {errors.playlistName && <p className="text-xs text-red-600 mt-1">{errors.playlistName.message}</p>}
      </div>

      {fields.length === 0 && (
        <p className="text-sm text-gray-400 text-center py-6 border-2 border-dashed rounded-2xl">
          No tracks yet. Add one below.
        </p>
      )}

      <div className="space-y-2">
        {fields.map((field, i) => (
          <div key={field.id} className="flex gap-2 items-center">
            <span className="text-xs text-gray-400 w-5 text-right shrink-0">{i + 1}</span>
            <input {...register(`tracks.${i}.title`)} placeholder="Track title"
                   className={`flex-1 ${cls}`} />
            {errors.tracks?.[i]?.title && (
              <span className="text-xs text-red-500">{errors.tracks[i]?.title?.message}</span>
            )}
            <button type="button" onClick={() => move(i, i - 1)} disabled={i === 0}
                    className="px-2 py-1.5 border rounded-lg text-xs disabled:opacity-30">↑</button>
            <button type="button" onClick={() => move(i, i + 1)} disabled={i === fields.length - 1}
                    className="px-2 py-1.5 border rounded-lg text-xs disabled:opacity-30">↓</button>
            <button type="button" onClick={() => remove(i)}
                    className="px-2 py-1.5 border border-red-200 rounded-lg text-xs text-red-500">✕</button>
          </div>
        ))}
        {errors.tracks?.root && <p className="text-xs text-red-600">{errors.tracks.root.message}</p>}
      </div>

      <button type="button" onClick={() => append({ title: '' }, { shouldFocus: true })}
              className="text-sm text-blue-600 underline">
        + Add track
      </button>

      <button type="submit"
              className="w-full py-2.5 bg-blue-600 text-white rounded-xl text-sm font-semibold">
        Save playlist
      </button>
    </form>
  )
}
```

---

---

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

# 4 — Nested Arrays and Objects inside Field Arrays

---

## T — TL;DR

Field array items can contain nested objects (dot-notation paths) and even nested arrays (nested `useFieldArray` calls). Each nesting level follows the same `register('array.${index}.nested.field')` pattern. Nested `useFieldArray` requires the outer item's `name` path as the `name` option.

---

## K — Key Concepts

```tsx
// ─── Schema: array of objects with nested objects
const ProjectSchema = z.object({
  projects: z.array(z.object({
    name:    z.string().min(1),
    address: z.object({          // nested object inside array item
      city:    z.string().min(1),
      country: z.string().length(2)
    }),
    tags:    z.array(z.string()) // nested array inside array item
  }))
})

// ─── Registering nested object fields inside array items
// projects.${i}.name
// projects.${i}.address.city
// projects.${i}.address.country
<input {...register(`projects.${index}.name`)} />
<input {...register(`projects.${index}.address.city`)} />
<input {...register(`projects.${index}.address.country`)} />

// ─── Accessing nested errors
errors.projects?.[index]?.name?.message
errors.projects?.[index]?.address?.city?.message
```

```tsx
// ─── Nested useFieldArray (array inside array)
// Schema: form has sections[], each section has questions[]
const SurveySchema = z.object({
  title:    z.string().min(1),
  sections: z.array(z.object({
    heading:   z.string().min(1),
    questions: z.array(z.object({
      text:     z.string().min(1),
      required: z.boolean().default(false)
    }))
  }))
})
type SurveyForm = z.infer<typeof SurveySchema>

// ─── Outer field array component
function SurveyForm() {
  const { register, control, handleSubmit } = useForm<SurveyForm>({
    resolver:      zodResolver(SurveySchema),
    defaultValues: { title: '', sections: [{ heading: '', questions: [] }] }
  })
  const { fields: sections, append: addSection } = useFieldArray({ control, name: 'sections' })

  return (
    <form onSubmit={handleSubmit(console.log)} className="space-y-6">
      <input {...register('title')} placeholder="Survey title"
             className="w-full border rounded-xl px-3 py-2 text-sm" />
      {sections.map((section, sIndex) => (
        <SectionRow key={section.id} sIndex={sIndex} control={control} register={register} />
      ))}
      <button type="button" onClick={() => addSection({ heading: '', questions: [] })}>
        + Add section
      </button>
    </form>
  )
}

// ─── Inner field array in a child component
function SectionRow({ sIndex, control, register }: {
  sIndex: number
  control: any
  register: any
}) {
  // Nested useFieldArray — name is the FULL path to the nested array
  const { fields: questions, append: addQuestion, remove: removeQuestion } =
    useFieldArray({
      control,
      name: `sections.${sIndex}.questions`  // ← full dot-notation path
    })

  return (
    <div className="p-4 border border-gray-200 rounded-2xl space-y-3">
      <input {...register(`sections.${sIndex}.heading`)}
             placeholder="Section heading"
             className="w-full border rounded-xl px-3 py-2 text-sm font-semibold" />

      {questions.map((q, qIndex) => (
        <div key={q.id} className="flex gap-2 items-center ml-4">
          <input {...register(`sections.${sIndex}.questions.${qIndex}.text`)}
                 placeholder="Question text"
                 className="flex-1 border rounded-xl px-3 py-2 text-sm" />
          <label className="flex items-center gap-1 text-xs text-gray-500">
            <input {...register(`sections.${sIndex}.questions.${qIndex}.required`)}
                   type="checkbox" />
            Required
          </label>
          <button type="button" onClick={() => removeQuestion(qIndex)}
                  className="text-xs text-red-500 px-2 py-1 border border-red-200 rounded-lg">
            ✕
          </button>
        </div>
      ))}

      <button type="button"
              onClick={() => addQuestion({ text: '', required: false })}
              className="ml-4 text-xs text-blue-600 underline">
        + Add question
      </button>
    </div>
  )
}
```

---

## W — Why It Matters

- Nested `useFieldArray` with the full dot-notation `name` (`sections.${i}.questions`) is the correct way to manage arrays-within-arrays. Trying to manage nested arrays manually with `setValue` and `getValues` leads to stale state bugs.
- Splitting the inner array into a child component (`SectionRow`) that receives `control` and calls its own `useFieldArray` is the recommended pattern — it keeps each level self-contained and independently maintainable.
- The error path for nested arrays follows the same dot-notation: `errors.sections?.[0]?.questions?.[1]?.text?.message` — optional chaining through each level.

---

## I — Interview Q&A

### Q: How do you implement a nested `useFieldArray` — an array inside an array item?

**A:** Extract the inner array row into a child component. Pass `control` and the outer item's `index` as props. Inside the child, call `useFieldArray` with `name: \`outerArray.${index}.innerArray\`` — the full dot-notation path to the inner array. The child component renders its own `fields.map()` and mutation buttons. This pattern keeps each level of nesting isolated: the outer component manages sections, the inner component manages questions within each section, and each can independently append or remove items.

---

## C — Common Pitfalls + Fix

### ❌ Hardcoding the outer index in the nested `useFieldArray` name

```tsx
// ❌ Always references sections[0] — all rows share the same inner array
const { fields: questions } = useFieldArray({ control, name: 'sections.0.questions' })
```

**Fix:** Use the dynamic outer index:

```tsx
// ✅ Each section row has its own inner array
const { fields: questions } = useFieldArray({
  control,
  name: `sections.${sIndex}.questions`  // sIndex from outer map
})
```

---

## K — Coding Challenge + Solution

### Challenge

Build a `ResumeForm` with an `experience` field array. Each experience has `company` (string), `role` (string), and `responsibilities` (nested array of strings). Each experience can add/remove responsibilities. Validate with Zod.

### Solution

```tsx
'use client'
import { useForm, useFieldArray } from 'react-hook-form'
import { zodResolver }            from '@hookform/resolvers/zod'
import { z }                      from 'zod'

const ResumeSchema = z.object({
  fullName:   z.string().min(1, 'Required'),
  experience: z.array(z.object({
    company:          z.string().min(1, 'Company required'),
    role:             z.string().min(1, 'Role required'),
    responsibilities: z.array(z.object({
      text: z.string().min(1, 'Cannot be empty')
    })).min(1, 'Add at least one responsibility')
  }))
})
type ResumeForm = z.infer<typeof ResumeSchema>

function ExperienceRow({ expIndex, control, register, errors }: any) {
  const { fields: resps, append: addResp, remove: removeResp } = useFieldArray({
    control, name: `experience.${expIndex}.responsibilities`
  })
  const cls = 'border rounded-xl px-3 py-2 text-sm w-full'
  const e   = (m?: string) => m ? <p className="text-xs text-red-600 mt-1">{m}</p> : null

  return (
    <div className="p-4 border border-gray-200 rounded-2xl space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <div>
          <input {...register(`experience.${expIndex}.company`)} placeholder="Company" className={cls} />
          {e(errors.experience?.[expIndex]?.company?.message)}
        </div>
        <div>
          <input {...register(`experience.${expIndex}.role`)}    placeholder="Role"    className={cls} />
          {e(errors.experience?.[expIndex]?.role?.message)}
        </div>
      </div>
      <div className="space-y-2 ml-2">
        <p className="text-xs font-semibold text-gray-500">Responsibilities</p>
        {resps.map((r, rIndex) => (
          <div key={r.id} className="flex gap-2">
            <input {...register(`experience.${expIndex}.responsibilities.${rIndex}.text`)}
                   placeholder="Responsibility" className={cls} />
            <button type="button" onClick={() => removeResp(rIndex)}
                    className="px-2 py-1 border border-red-200 rounded-lg text-xs text-red-500">✕</button>
          </div>
        ))}
        {e(errors.experience?.[expIndex]?.responsibilities?.root?.message)}
        <button type="button" onClick={() => addResp({ text: '' })}
                className="text-xs text-blue-600 underline">+ Add responsibility</button>
      </div>
    </div>
  )
}

export function ResumeForm() {
  const { register, control, handleSubmit, formState: { errors } } = useForm<ResumeForm>({
    resolver:      zodResolver(ResumeSchema),
    defaultValues: { fullName: '', experience: [{ company: '', role: '', responsibilities: [{ text: '' }] }] }
  })
  const { fields: exps, append: addExp, remove: removeExp } = useFieldArray({ control, name: 'experience' })

  return (
    <form onSubmit={handleSubmit(console.log)} className="space-y-5 max-w-lg">
      <input {...register('fullName')} placeholder="Full name"
             className="w-full border rounded-xl px-3 py-2 text-sm" />
      {errors.fullName && <p className="text-xs text-red-600">{errors.fullName.message}</p>}

      {exps.map((exp, i) => (
        <div key={exp.id} className="relative">
          <ExperienceRow expIndex={i} control={control} register={register} errors={errors} />
          {exps.length > 1 && (
            <button type="button" onClick={() => removeExp(i)}
                    className="absolute top-3 right-3 text-xs text-red-500 hover:text-red-700">
              Remove
            </button>
          )}
        </div>
      ))}

      <button type="button"
              onClick={() => addExp({ company: '', role: '', responsibilities: [{ text: '' }] })}
              className="text-sm text-blue-600 underline">
        + Add experience
      </button>
      <button type="submit"
              className="w-full py-2.5 bg-blue-600 text-white rounded-xl text-sm font-semibold">
        Save resume
      </button>
    </form>
  )
}
```

---

---

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

# 7 — Discriminated Unions — Schema Branching

---

## T — TL;DR

`z.discriminatedUnion('key', [schema1, schema2])` selects the active schema branch based on a single discriminator field. Each branch can have different required fields. This is more precise than `superRefine` for forms where different account types or payment methods have entirely different field sets.

---

## K — Key Concepts

```tsx
import { z } from 'zod'

// ─── z.discriminatedUnion — select schema by discriminator key
const PaymentSchema = z.discriminatedUnion('method', [
  z.object({
    method:     z.literal('card'),
    cardNumber: z.string().regex(/^\d{16}$/, '16 digits required'),
    expiry:     z.string().regex(/^\d{2}\/\d{2}$/, 'MM/YY format'),
    cvv:        z.string().regex(/^\d{3,4}$/, '3–4 digits')
  }),
  z.object({
    method:      z.literal('bank'),
    accountName: z.string().min(2, 'Required'),
    bsb:         z.string().regex(/^\d{6}$/, '6-digit BSB'),
    accountNumber: z.string().regex(/^\d{6,10}$/, '6–10 digits')
  }),
  z.object({
    method: z.literal('paypal'),
    paypalEmail: z.string().email('Valid PayPal email required')
  })
])

type Payment = z.infer<typeof PaymentSchema>
// Payment =
//   | { method: 'card';   cardNumber: string; expiry: string; cvv: string }
//   | { method: 'bank';   accountName: string; bsb: string; accountNumber: string }
//   | { method: 'paypal'; paypalEmail: string }

// ─── Parse — only validates the active branch
PaymentSchema.safeParse({ method: 'card', cardNumber: '1234567890123456', expiry: '12/27', cvv: '123' })
// ✅ validates card fields only — bank/paypal fields not required

PaymentSchema.safeParse({ method: 'bank', accountName: 'Mark', bsb: '123456', accountNumber: '12345678' })
// ✅ validates bank fields only — card/paypal fields not required
```

```tsx
// ─── Wrapping in a parent schema
const CheckoutSchema = z.object({
  cartId:  z.string().uuid(),
  payment: PaymentSchema        // discriminated union as a nested field
})
```

```tsx
// ─── With RHF: the form type includes all possible fields (union)
type PaymentForm = z.infer<typeof PaymentSchema>
// All possible fields are in the union type
// RHF needs a concrete defaultValues — pick the starting method

const { register, watch, handleSubmit, formState: { errors } } = useForm<PaymentForm>({
  resolver:      zodResolver(PaymentSchema),
  defaultValues: { method: 'card', cardNumber: '', expiry: '', cvv: '' }
})

const method = watch('method')  // controls which branch renders

// When user switches method, reset to branch defaults using setValue/reset
function switchMethod(newMethod: string) {
  if (newMethod === 'card')
    reset({ method: 'card',   cardNumber: '', expiry: '', cvv: '' })
  if (newMethod === 'bank')
    reset({ method: 'bank',   accountName: '', bsb: '', accountNumber: '' })
  if (newMethod === 'paypal')
    reset({ method: 'paypal', paypalEmail: '' })
}
```

---

## W — Why It Matters

- `z.discriminatedUnion` is more efficient than `z.union` — it looks at the discriminator key first and only validates the matching branch, without trying all options. This matters for large union schemas.
- The discriminated union TypeScript type is a proper tagged union — TypeScript can narrow to the correct branch inside `onSubmit` with an `if (data.method === 'card')` check, giving full type safety for branch-specific fields.
- Calling `reset()` when switching branches is essential — it clears the previous branch's field values so they don't contaminate the next branch's submission payload.

---

## I — Interview Q&A

### Q: What is the advantage of `z.discriminatedUnion` over `z.union` for a payment method form?

**A:** `z.union` tries every schema in order and returns the first that matches — for three payment method schemas, it tries all three even when the first one passes, which is slow and produces confusing error messages. `z.discriminatedUnion` reads the discriminator field first (`method`), immediately selects the matching schema branch, and only validates that branch. Error messages are precise — if `method: 'card'` and `cardNumber` is invalid, you get the card error, not errors from the bank or paypal schemas. The inferred TypeScript type is also a proper tagged union, enabling `if (data.method === 'card') { data.cardNumber }` narrowing in `onSubmit`.

---

## C — Common Pitfalls + Fix

### ❌ Not resetting field values when the user switches discriminator branch

```tsx
// ❌ User fills card fields, switches to PayPal
// card fields (cardNumber, expiry, cvv) still in formState — submitted with paypal data
<select onChange={e => setValue('method', e.target.value)}>
```

**Fix:** Reset the entire form to the new branch's shape when switching:

```tsx
// ✅ Reset to branch defaults — clears orphan fields
function handleMethodChange(newMethod: string) {
  const defaults = {
    card:   { method: 'card'   as const, cardNumber: '', expiry: '', cvv: '' },
    bank:   { method: 'bank'   as const, accountName: '', bsb: '', accountNumber: '' },
    paypal: { method: 'paypal' as const, paypalEmail: '' }
  }
  reset(defaults[newMethod as keyof typeof defaults])
}
```

---

## K — Coding Challenge + Solution

### Challenge

Build a `PaymentMethodForm` with discriminated union for `card` / `bank` / `paypal`. Each branch shows only its relevant fields. Switching method resets to branch defaults. `onSubmit` uses TypeScript narrowing to log branch-specific data.

### Solution

```tsx
'use client'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z }           from 'zod'

const PaymentSchema = z.discriminatedUnion('method', [
  z.object({ method: z.literal('card'),
    cardNumber: z.string().regex(/^\d{16}$/, '16 digits'),
    expiry:     z.string().regex(/^\d{2}\/\d{2}$/, 'MM/YY'),
    cvv:        z.string().regex(/^\d{3,4}$/, '3–4 digits') }),
  z.object({ method: z.literal('bank'),
    accountName:   z.string().min(2, 'Required'),
    bsb:           z.string().regex(/^\d{6}$/, '6 digits'),
    accountNumber: z.string().regex(/^\d{6,10}$/, '6–10 digits') }),
  z.object({ method: z.literal('paypal'),
    paypalEmail: z.string().email('Valid PayPal email') })
])
type PaymentForm = z.infer<typeof PaymentSchema>

const DEFAULTS = {
  card:   { method: 'card'   as const, cardNumber: '', expiry: '', cvv: '' },
  bank:   { method: 'bank'   as const, accountName: '', bsb: '', accountNumber: '' },
  paypal: { method: 'paypal' as const, paypalEmail: '' }
}

export function PaymentMethodForm() {
  const { register, watch, handleSubmit, reset, formState: { errors } } = useForm<PaymentForm>({
    resolver:      zodResolver(PaymentSchema),
    defaultValues: DEFAULTS.card
  })

  const method = watch('method')
  const cls    = 'w-full border rounded-xl px-3 py-2 text-sm'
  const err    = 'text-xs text-red-600 mt-1'

  function onSubmit(data: PaymentForm) {
    if (data.method === 'card')   console.log('Card payment:', data.cardNumber)
    if (data.method === 'bank')   console.log('Bank transfer:', data.bsb, data.accountNumber)
    if (data.method === 'paypal') console.log('PayPal:', data.paypalEmail)
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 max-w-sm">
      <div className="flex rounded-xl overflow-hidden border border-gray-300 divide-x">
        {(['card', 'bank', 'paypal'] as const).map(m => (
          <button key={m} type="button"
                  onClick={() => reset(DEFAULTS[m])}
                  className={`flex-1 py-2 text-sm font-medium capitalize
                    ${method === m ? 'bg-blue-600 text-white' : 'bg-white text-gray-600 hover:bg-gray-50'}`}>
            {m}
          </button>
        ))}
      </div>

      {method === 'card' && (
        <>
          <div>
            <input {...register('cardNumber')} placeholder="Card number (16 digits)" className={cls} />
            {(errors as any).cardNumber && <p className={err}>{(errors as any).cardNumber.message}</p>}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <input {...register('expiry')} placeholder="MM/YY" className={cls} />
              {(errors as any).expiry && <p className={err}>{(errors as any).expiry.message}</p>}
            </div>
            <div>
              <input {...register('cvv')} placeholder="CVV" className={cls} />
              {(errors as any).cvv && <p className={err}>{(errors as any).cvv.message}</p>}
            </div>
          </div>
        </>
      )}

      {method === 'bank' && (
        <>
          <div>
            <input {...register('accountName')} placeholder="Account name" className={cls} />
            {(errors as any).accountName && <p className={err}>{(errors as any).accountName.message}</p>}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <input {...register('bsb')} placeholder="BSB (6 digits)" className={cls} />
              {(errors as any).bsb && <p className={err}>{(errors as any).bsb.message}</p>}
            </div>
            <div>
              <input {...register('accountNumber')} placeholder="Account number" className={cls} />
              {(errors as any).accountNumber && <p className={err}>{(errors as any).accountNumber.message}</p>}
            </div>
          </div>
        </>
      )}

      {method === 'paypal' && (
        <div>
          <input {...register('paypalEmail')} type="email" placeholder="PayPal email" className={cls} />
          {(errors as any).paypalEmail && <p className={err}>{(errors as any).paypalEmail.message}</p>}
        </div>
      )}

      <button type="submit"
              className="w-full py-2.5 bg-blue-600 text-white rounded-xl text-sm font-semibold">
        Pay now
      </button>
    </form>
  )
}
```

---

---

# 8 — Aligning Dynamic UI with Schema Structure

---

## T — TL;DR

The schema is the contract — the UI must render exactly what the schema describes. When the UI adds a conditional branch, the schema adds a conditional rule. When the schema has an array, the UI has a field array. Misalignment causes silent bugs: fields that validate but never appear, or appear but never validate.

---

## K — Key Concepts

```
The alignment principle:

  Every UI state        ↔  Schema state
  ──────────────────────────────────────
  Field visible         ↔  Field required (or optional with validation)
  Field hidden          ↔  Field optional/absent OR shouldUnregister
  Array item rendered   ↔  Array item validated by Zod
  Branch shown          ↔  Discriminated union / superRefine branch active
  Conditional field     ↔  superRefine or discriminatedUnion rule active

Misalignment bugs:
  1. Field hidden, still required in schema → always fails, user can't submit
  2. Field visible, not in schema → no validation, silent invalid data submitted
  3. Branch switched, old values not cleared → stale data submitted
  4. Array item removed, validation still runs on ghost items → can't submit
```

```tsx
// ─── Alignment pattern: discriminated union + UI branches

const schema = z.discriminatedUnion('type', [
  z.object({ type: z.literal('individual'), ssn:  z.string().min(9) }),
  z.object({ type: z.literal('company'),   ein:  z.string().min(9) })
])

// UI must mirror schema exactly:
const type = watch('type')

{type === 'individual' && (
  // Only rendered when type === 'individual' ↔ only validated when type === 'individual' ✅
  <input {...register('ssn')} />
)}
{type === 'company' && (
  // Only rendered when type === 'company' ↔ only validated when type === 'company' ✅
  <input {...register('ein')} />
)}
// Alignment: schema branches ↔ UI branches. Perfect match.
```

```tsx
// ─── Alignment pattern: schema-driven UI rendering
// Let the schema DRIVE the UI — generate the form from the schema shape

const SurveyItemSchema = z.discriminatedUnion('questionType', [
  z.object({ questionType: z.literal('text'),     label: z.string() }),
  z.object({ questionType: z.literal('select'),   label: z.string(), options: z.array(z.string()) }),
  z.object({ questionType: z.literal('checkbox'), label: z.string() })
])
type SurveyItem = z.infer<typeof SurveyItemSchema>

// Render is driven by data shape — schema and UI always aligned by construction
function SurveyItemRenderer({ item }: { item: SurveyItem }) {
  if (item.questionType === 'text')     return <input type="text"     placeholder={item.label} />
  if (item.questionType === 'select')   return <select>{item.options.map(o => <option key={o}>{o}</option>)}</select>
  if (item.questionType === 'checkbox') return <input type="checkbox" />
  return null
}
```

```tsx
// ─── Alignment checklist for dynamic forms
// Before shipping any dynamic form:
// ✅ Every required field in the schema has a visible input
// ✅ Every conditional schema rule has a matching UI condition
// ✅ Every field array item has a matching useFieldArray render
// ✅ Hidden fields use shouldUnregister OR are absent from schema
// ✅ Switching discriminator branch resets to new branch defaults
// ✅ Nested array paths match exactly: 'outer.${i}.inner.${j}.field'
// ✅ errors.arrayName.root is rendered (for array-level rules)
// ✅ errors.arrayName[i].field is rendered (for item-level rules)
```

---

## W — Why It Matters

- The most common production bug in dynamic forms: a required field in the schema becomes conditionally hidden in the UI. Users can never submit because the hidden required field always fails — and they see no error because the input isn't rendered.
- Schema-driven rendering (generating the form from the schema's shape) eliminates misalignment by construction — the UI cannot diverge from the schema because the schema IS the render specification.
- Using a checklist before shipping ensures the alignment is verified systematically, not just tested by visual inspection.

---

## I — Interview Q&A

### Q: How do you ensure conditional UI branches stay in sync with Zod schema validation rules?

**A:** Three techniques, in order of robustness. First, use `z.discriminatedUnion` — the schema structure matches the UI structure directly, and TypeScript enforces it. Second, use `superRefine` with the same condition as the UI: `if (data.type === 'business' && fieldVisible) { addIssue(...) }`. Third, use `shouldUnregister: true` so hidden fields are automatically removed from the submission payload, preventing ghost validations. Always test by hiding a conditional field and confirming the form can still submit, then showing it with invalid data and confirming it blocks submission.

---

## C — Common Pitfalls + Fix

### ❌ Schema requires a field that is conditionally hidden — form can never submit

```tsx
// ❌ companyName is required in schema but hidden for personal accounts
const Schema = z.object({
  type:        z.enum(['personal', 'business']),
  companyName: z.string().min(1, 'Required')  // ← always required
})
const type = watch('type')
// Only shown for business — but schema always validates it
{type === 'business' && <input {...register('companyName')} />}
// Personal account user: companyName fails validation, no error visible, can't submit ❌
```

**Fix:** Make the schema conditional too:

```tsx
// ✅ Option A: superRefine (conditional rule matches conditional UI)
const Schema = z.object({
  type:        z.enum(['personal', 'business']),
  companyName: z.string().optional()
}).superRefine((d, ctx) => {
  if (d.type === 'business' && !d.companyName?.trim())
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Required', path: ['companyName'] })
})

// ✅ Option B: discriminatedUnion (schema branches = UI branches)
const Schema = z.discriminatedUnion('type', [
  z.object({ type: z.literal('personal') }),
  z.object({ type: z.literal('business'), companyName: z.string().min(1) })
])
```

---

## K — Coding Challenge + Solution

### Challenge

Build a `ShipmentForm` that puts all alignment patterns together: field array of packages (each has `weight` coerced number, `fragile` boolean). If any package is fragile, a top-level `handlingInstructions` field becomes required (schema-driven with `superRefine`). Array-level validation: max 5 packages. Show all error types.

### Solution

```tsx
'use client'
import { useForm, useFieldArray, useWatch } from 'react-hook-form'
import { zodResolver }                       from '@hookform/resolvers/zod'
import { z }                                 from 'zod'

const PackageSchema = z.object({
  weight:   z.coerce.number().positive('Must be > 0'),
  fragile:  z.boolean().default(false)
})

const ShipmentSchema = z.object({
  recipient:            z.string().min(2, 'Required'),
  packages:             z.array(PackageSchema)
                          .min(1, 'At least one package')
                          .max(5, 'Maximum 5 packages'),
  handlingInstructions: z.string().optional()
}).superRefine((data, ctx) => {
  // If any package is fragile, handlingInstructions is required
  const hasFragile = data.packages.some(p => p.fragile)
  if (hasFragile && !data.handlingInstructions?.trim()) {
    ctx.addIssue({
      code:    z.ZodIssueCode.custom,
      message: 'Required when any package is fragile',
      path:    ['handlingInstructions']
    })
  }
})
type ShipmentForm = z.infer<typeof ShipmentSchema>

export function ShipmentForm() {
  const { register, control, handleSubmit, formState: { errors } } = useForm<ShipmentForm>({
    resolver:      zodResolver(ShipmentSchema),
    defaultValues: { recipient: '', packages: [{ weight: 0, fragile: false }] }
  })

  const { fields, append, remove } = useFieldArray({ control, name: 'packages' })

  // Schema-aligned: watch fragile to show/hide handlingInstructions
  const packages    = useWatch({ control, name: 'packages' })
  const hasFragile  = packages?.some(p => p.fragile) ?? false

  const cls = 'border rounded-xl px-3 py-2 text-sm'
  const err = 'text-xs text-red-600 mt-1'

  return (
    <form onSubmit={handleSubmit(console.log)} className="space-y-5 max-w-md">
      <div>
        <input {...register('recipient')} placeholder="Recipient name"
               className={`w-full ${cls}`} />
        {errors.recipient && <p className={err}>{errors.recipient.message}</p>}
      </div>

      {/* Array root error */}
      {errors.packages?.root && (
        <p className="px-3 py-2 bg-red-50 rounded-xl text-sm text-red-700">
          {errors.packages.root.message}
        </p>
      )}

      <div className="space-y-3">
        {fields.map((field, i) => (
          <div key={field.id} className="p-3 border border-gray-200 rounded-2xl space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-gray-500">Package {i + 1}</span>
              {fields.length > 1 && (
                <button type="button" onClick={() => remove(i)}
                        className="text-xs text-red-500">Remove</button>
              )}
            </div>
            <div className="flex gap-3 items-center">
              <div className="flex-1">
                <input {...register(`packages.${i}.weight`)} type="number" step="0.1"
                       placeholder="Weight (kg)" className={`w-full ${cls}`} />
                {errors.packages?.[i]?.weight && (
                  <p className={err}>{errors.packages[i]?.weight?.message}</p>
                )}
              </div>
              <label className="flex items-center gap-2 text-sm cursor-pointer shrink-0">
                <input {...register(`packages.${i}.fragile`)} type="checkbox"
                       className="size-4 rounded" />
                Fragile
              </label>
            </div>
          </div>
        ))}
      </div>

      {fields.length < 5 && (
        <button type="button" onClick={() => append({ weight: 0, fragile: false })}
                className="text-sm text-blue-600 underline">
          + Add package
        </button>
      )}

      {/* Conditionally shown AND conditionally required — aligned ✅ */}
      {hasFragile && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">
            Handling instructions <span className="text-red-500">*</span>
          </label>
          <textarea {...register('handlingInstructions')} rows={2}
                    placeholder="e.g. This side up, keep dry"
                    className={`w-full ${cls}`} />
          {errors.handlingInstructions && (
            <p className={err}>{errors.handlingInstructions.message}</p>
          )}
        </div>
      )}

      <button type="submit"
              className="w-full py-2.5 bg-blue-600 text-white rounded-xl text-sm font-semibold">
        Book shipment
      </button>
    </form>
  )
}
```

---

## ✅ Day 6 Complete — Dynamic, Nested, and Conditional Forms

| # | Subtopic | Status |
|---|----------|--------|
| 1 | `useFieldArray` — Setup and Core Concepts | ☐ |
| 2 | append, prepend, remove, insert, swap, move | ☐ |
| 3 | update, replace, and the fields Array | ☐ |
| 4 | Nested Arrays and Objects inside Field Arrays | ☐ |
| 5 | Field Array Validation with Zod | ☐ |
| 6 | Dependent and Conditional Fields | ☐ |
| 7 | Discriminated Unions — Schema Branching | ☐ |
| 8 | Aligning Dynamic UI with Schema Structure | ☐ |

---

## 🗺️ One-Page Mental Model — Day 6

```
USEFIELDARRAY
  useFieldArray({ control, name: 'items' })
  → fields[]     use field.id as React key (NOT index)
  → register(`items.${i}.field`)
  → errors.items?.[i]?.field?.message
  → errors.items?.root?.message        (array-level rule)
  defaultValues must include the array (even as [])

MUTATION METHODS
  append(item, { shouldFocus })   → add to end
  prepend(item)                   → add to start
  remove(i) / remove([i,j])       → delete — pass all at once
  insert(i, item)                 → add at position
  swap(a, b)                      → exchange two items
  move(from, to)                  → slide one item

  update(i, item)   → replace whole item, one operation
  replace([...])    → replace entire array

  fields[i].id      → stable React key
  getValues('items.i') → current value (not fields[i] which may lag)

NESTED ARRAYS
  Nested useFieldArray → name: `outer.${i}.inner`
  Extract inner row to child component
  Pass control + outer index as props
  Register path: outer.${i}.inner.${j}.field

ARRAY VALIDATION
  z.array(itemSchema).min(1).max(5)     → errors.items?.root
  .nonempty()                           → errors.items?.root
  .superRefine((items, ctx) => {        → cross-item validation
    ctx.addIssue({ path: [i, 'field'] }) → errors.items[i].field
    ctx.addIssue({ path: [] })           → errors.items.root
  })

CONDITIONAL FIELDS
  watch('controlling')           → reactive value for conditional render
  shouldUnregister: true         → auto-remove value when field unmounts
  cascade: useEffect to reset    child values when parent changes
  Schema rule must match UI condition — use superRefine

DISCRIMINATED UNIONS
  z.discriminatedUnion('key', [branch1, branch2])
  → reads 'key', validates ONLY the matching branch
  → TypeScript narrows in onSubmit: if (data.method === 'card')
  → switch branch: reset(branchDefaults[newBranch])
  Faster than z.union (no trial-and-error)

ALIGNMENT PRINCIPLE
  Every required field in schema → visible in UI
  Every conditional schema rule  → matching UI condition
  Every hidden field             → shouldUnregister OR optional in schema
  Every array item               → useFieldArray render
  Branch switch                  → reset to new branch defaults

  Misalignment bugs:
  ❌ Required field hidden → form can never submit
  ❌ Field visible, not in schema → no validation, bad data
  ❌ Branch switched, no reset → stale data submitted
```

> **Your next action:** Find a form in your project with more than 3 similar input groups (like cart items, team members, or tasks). Add `useFieldArray` for that array. Replace the hardcoded list with `fields.map()` using `field.id` as key. Add an "append" button. That's it — stop there.
>
> *Doing one small thing beats opening a feed.*