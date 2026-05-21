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
