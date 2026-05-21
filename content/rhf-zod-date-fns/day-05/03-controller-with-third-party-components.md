# 3 — `Controller` with Third-Party Components

---

## T — TL;DR

Third-party UI components (Base UI Select, Radix, custom pickers) expose `value`/`onChange` but no native input ref — `Controller` is the bridge. Pass `field.value` → `value`, `field.onChange` → `onChange`, `field.onBlur` → `onBlur`. Error comes from `fieldState.error`.

---

## K — Key Concepts

```tsx
// ─── Base UI Select with Controller
import * as SelectP   from '@base-ui/react/select'
import { Controller } from 'react-hook-form'

<Controller
  name="country"
  control={control}
  render={({ field, fieldState }) => (
    <div className="space-y-1">
      <SelectP.Root
        value={field.value ?? ''}
        onValueChange={field.onChange}   // Base UI calls onChange(value) directly
      >
        <SelectP.Trigger
          onBlur={field.onBlur}
          ref={field.ref}               // enables shouldFocusError ✅
          className="flex items-center justify-between w-full
                      border rounded-xl px-3 py-2 text-sm
                      data-[popup-open]:border-blue-500
                      focus-visible:outline-none focus-visible:ring-2
                      focus-visible:ring-blue-500"
        >
          <SelectP.Value placeholder="Select country…" />
          <span className="text-gray-400 text-xs">▾</span>
        </SelectP.Trigger>
        <SelectP.Portal>
          <SelectP.Positioner sideOffset={6}>
            <SelectP.Popup className="p-1.5 bg-white border border-gray-200
                                        rounded-2xl shadow-xl z-50 min-w-[--anchor-width]">
              {['PH','US','GB','AU'].map(c => (
                <SelectP.Option key={c} value={c}
                                className="px-3 py-2 text-sm rounded-xl cursor-pointer
                                             data-[highlighted]:bg-blue-50
                                             data-[selected]:font-semibold">
                  {c}
                </SelectP.Option>
              ))}
            </SelectP.Popup>
          </SelectP.Positioner>
        </SelectP.Portal>
      </SelectP.Root>
      {fieldState.error && (
        <p className="text-xs text-red-600">{fieldState.error.message}</p>
      )}
    </div>
  )}
/>
```

```tsx
// ─── Pattern: how to wire any third-party component

// Step 1: Find the component's value/onChange API
// e.g. <DatePicker value={Date} onChange={(date: Date) => void} />

// Step 2: Map field props
<Controller
  name="dueDate"
  control={control}
  render={({ field, fieldState }) => (
    <DatePicker
      value={field.value}            // controlled value from RHF
      onChange={field.onChange}      // RHF's updater
      onClose={field.onBlur}         // trigger touched on close
      ref={field.ref}                // optional — if component supports it
    />
  )}
/>

// Step 3: If onChange provides an event instead of a value
<Controller name="amount" control={control}
  render={({ field }) => (
    <SliderComponent
      value={field.value}
      onValueChange={field.onChange}  // Radix sliders use onValueChange
    />
  )}
/>
```

---

## W — Why It Matters

- Every UI library has a slightly different API — `onChange`, `onValueChange`, `onSelect`, `onClose`. `Controller` lets you adapt any of them to RHF's unified `field.onChange(value)` contract.
- `field.ref` passed to the trigger/root element enables `shouldFocusError: true` — when the form submits with errors, the Select's trigger receives focus automatically, same as a native input.
- `fieldState.error` is pre-scoped to this specific field — no need to navigate `formState.errors.deeply.nested.path` manually.

---

## I — Interview Q&A

### Q: How do you wire a Base UI Select component (which uses `onValueChange` instead of `onChange`) with RHF Controller?

**A:** `Controller`'s `field.onChange` is just a function that accepts a value — it doesn't care what the prop is named on the third-party component. Map `onValueChange={field.onChange}` on the Base UI Select's root. Pass `field.value` to the `value` prop. For `onBlur` (to mark the field as touched), attach it to the trigger element's `onBlur` prop. For `ref`, attach `field.ref` to the trigger so `shouldFocusError` can focus it on submit errors.

---

## C — Common Pitfalls + Fix

### ❌ Forgetting `onBlur` — field never gets marked as touched

```tsx
// ❌ No onBlur — fieldState.isTouched never becomes true
// With mode: 'onTouched', errors never show for this field
<CustomPicker
  value={field.value}
  onChange={field.onChange}
  // missing onBlur ❌
/>
```

**Fix:** Attach `onBlur` to the closest focusable element:

```tsx
// ✅ Mark as touched when picker closes or trigger blurs
<CustomPicker
  value={field.value}
  onChange={field.onChange}
  onClose={field.onBlur}   // or onBlur={field.onBlur}
/>
```

---

## K — Coding Challenge + Solution

### Challenge

Build a `TaskForm` with: `title` (register — native input), `priority` (Controller + Base UI Select: `low|medium|high`), `dueDate` (Controller + native `<input type="date">`), `notifyMe` (Controller + custom `<Toggle>` component). All validated with Zod.

### Solution

```tsx
'use client'
import * as SelectP           from '@base-ui/react/select'
import { Controller, useForm } from 'react-hook-form'
import { zodResolver }         from '@hookform/resolvers/zod'
import { z }                   from 'zod'

// Custom Toggle (stand-in for any third-party boolean component)
function Toggle({ checked, onChange, label }: {
  checked: boolean; onChange: (v: boolean) => void; label: string
}) {
  return (
    <label className="flex items-center gap-3 cursor-pointer text-sm select-none">
      <button type="button" role="switch" aria-checked={checked}
              onClick={() => onChange(!checked)}
              className={`relative inline-flex h-6 w-11 items-center rounded-full
                transition-colors focus-visible:outline-none focus-visible:ring-2
                focus-visible:ring-blue-500
                ${checked ? 'bg-blue-600' : 'bg-gray-300'}`}>
        <span className={`inline-block size-4 rounded-full bg-white shadow
                          transform transition-transform
                          ${checked ? 'translate-x-6' : 'translate-x-1'}`} />
      </button>
      {label}
    </label>
  )
}

const PrioritySchema = z.enum(['low', 'medium', 'high'])
const TaskSchema     = z.object({
  title:      z.string().min(3, 'Min 3 characters'),
  priority:   PrioritySchema,
  dueDate:    z.coerce.date({ required_error: 'Due date required' }),
  notifyMe:   z.boolean().default(false)
})
type TaskForm = z.infer<typeof TaskSchema>

export function TaskForm() {
  const { register, control, handleSubmit, formState: { errors } } = useForm<TaskForm>({
    resolver:      zodResolver(TaskSchema),
    defaultValues: { title: '', priority: 'medium', notifyMe: false }
  })

  const cls = 'w-full border rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500'
  const err = 'text-xs text-red-600 mt-1'

  return (
    <form onSubmit={handleSubmit(console.log)} className="space-y-4 max-w-sm">
      {/* Native input via register */}
      <div>
        <input {...register('title')} placeholder="Task title" className={cls} />
        {errors.title    && <p className={err}>{errors.title.message}</p>}
      </div>

      {/* Base UI Select via Controller */}
      <Controller name="priority" control={control} render={({ field, fieldState }) => (
        <div>
          <SelectP.Root value={field.value} onValueChange={field.onChange}>
            <SelectP.Trigger onBlur={field.onBlur} ref={field.ref} className={cls + ' flex items-center justify-between'}>
              <SelectP.Value placeholder="Select priority" />
              <span className="text-xs text-gray-400">▾</span>
            </SelectP.Trigger>
            <SelectP.Portal>
              <SelectP.Positioner sideOffset={6}>
                <SelectP.Popup className="p-1.5 bg-white border border-gray-200 rounded-2xl shadow-xl z-50 min-w-[--anchor-width]">
                  {PrioritySchema.options.map(p => (
                    <SelectP.Option key={p} value={p}
                                    className="px-3 py-2 text-sm capitalize rounded-xl cursor-pointer data-[highlighted]:bg-blue-50 data-[selected]:font-semibold">
                      {p}
                    </SelectP.Option>
                  ))}
                </SelectP.Popup>
              </SelectP.Positioner>
            </SelectP.Portal>
          </SelectP.Root>
          {fieldState.error && <p className={err}>{fieldState.error.message}</p>}
        </div>
      )} />

      {/* Date input via Controller */}
      <Controller name="dueDate" control={control} render={({ field, fieldState }) => (
        <div>
          <input type="date" name={field.name} ref={field.ref} onBlur={field.onBlur}
                 onChange={e => field.onChange(e.target.value)} className={cls} />
          {fieldState.error && <p className={err}>{fieldState.error.message}</p>}
        </div>
      )} />

      {/* Custom Toggle via Controller */}
      <Controller name="notifyMe" control={control} render={({ field }) => (
        <Toggle checked={!!field.value} onChange={field.onChange} label="Notify me on due date" />
      )} />

      <button type="submit"
              className="w-full py-2.5 bg-blue-600 text-white rounded-xl text-sm font-semibold">
        Create task
      </button>
    </form>
  )
}
```

---

---
