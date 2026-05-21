
# 📅 Day 5 — Controlled Inputs and Reusable Form Architecture

> **Goal:** Master `Controller` for non-native inputs, build reusable typed field components, share form state across a component tree with `FormProvider`, handle nested paths, and organise large forms into maintainable modules.
> **Format:** Each subtopic = 5–15 min. Do one. Stop. Come back.
> **Stack:** react-hook-form v7.74.0 · zod v4.3.6 · TypeScript 6

---

## 📋 Day 5 Subtopic Overview

| # | Subtopic | Time |
|---|----------|------|
| 1 | `Controller` — When and Why | 10 min |
| 2 | `Controller` with Native Inputs | 10 min |
| 3 | `Controller` with Third-Party Components | 12 min |
| 4 | Reusable Field Wrapper Components | 12 min |
| 5 | `FormProvider` and `useFormContext` | 10 min |
| 6 | Nested Field Paths — Dot Notation and Objects | 10 min |
| 7 | Component Composition Patterns | 12 min |
| 8 | Scalable Form Module Structure | 10 min |

---

---

# 1 — `Controller` — When and Why

---

## T — TL;DR

`Controller` is a wrapper that makes any component — native or third-party — work with RHF. Use it when a component **does not expose a native input ref** and instead uses `value`/`onChange` props. The `render` prop receives a `field` object you spread onto the component.

---

## K — Key Concepts

```
register('field')    → works by attaching a DOM ref to a native <input>
                        DOM → ref → RHF store (uncontrolled)

Controller           → works by passing value + onChange as props
                        RHF store → props → component (controlled)

Use register when:   <input>, <select>, <textarea> — native HTML
Use Controller when: Base UI Select, custom pickers, sliders,
                     any component with no forwardRef to a native input
```

```tsx
import { Controller, useForm, Control } from 'react-hook-form'
import { zodResolver }                  from '@hookform/resolvers/zod'
import { z }                            from 'zod'

const Schema = z.object({ role: z.enum(['admin', 'editor', 'viewer']) })
type FormType = z.infer<typeof Schema>

function MyForm() {
  const { control, handleSubmit } = useForm<FormType>({
    resolver:      zodResolver(Schema),
    defaultValues: { role: 'viewer' }
  })

  return (
    <form onSubmit={handleSubmit(console.log)}>
      <Controller
        name="role"        // field name — must match schema key
        control={control}  // the control object from useForm
        render={({ field, fieldState }) => (
          // field:      { name, value, onChange, onBlur, ref }
          // fieldState: { error, isDirty, isTouched, invalid }
          <CustomSelect
            value={field.value}
            onChange={field.onChange}
            onBlur={field.onBlur}
            error={fieldState.error?.message}
          />
        )}
      />
    </form>
  )
}
```

```tsx
// ─── field object contents
field.name      // 'role' — for aria-label, input name
field.value     // current value from RHF store
field.onChange  // fn(newValue) — updates RHF store
field.onBlur    // fn() — marks field as touched
field.ref       // for focusing on error (pass to component if it supports it)

// ─── fieldState object contents
fieldState.error      // FieldError | undefined
fieldState.isDirty    // value !== defaultValue
fieldState.isTouched  // onBlur has been called
fieldState.invalid    // has a validation error
```

---

## W — Why It Matters

- Without `Controller`, third-party components like Base UI Select, custom date pickers, and rating inputs cannot participate in RHF's validation, error state, or dirty tracking.
- `fieldState.error` inside `render` means you don't need to destructure `formState.errors` and find the right path — the error for this specific field is pre-scoped.
- `field.ref` passed to the component enables `shouldFocusError: true` (RHF's default) — on submit with errors, focus jumps to the first invalid field automatically.

---

## I — Interview Q&A

### Q: When should you use `Controller` instead of `register` in React Hook Form?

**A:** Use `register` for native HTML inputs — `<input>`, `<select>`, `<textarea>` — because RHF can attach a DOM ref directly. Use `Controller` for any component that doesn't expose a native input ref and instead uses `value`/`onChange` props — third-party UI libraries (Base UI, Radix, Headless UI), custom date pickers, star rating inputs, rich text editors, or any component built with a controlled API. `Controller` wraps the component in a controlled adapter while keeping all RHF features (validation, dirty tracking, error state, reset) working.

---

## C — Common Pitfalls + Fix

### ❌ Passing `field.onChange` to an event-based handler that expects `(e) => void`

```tsx
// ❌ Some custom components call onChange(event) not onChange(value)
// field.onChange receives the event object, not the actual value
<CustomInput onChange={field.onChange} />
// RHF stores the Event object instead of the string value ❌
```

**Fix:** Extract the value from the event manually:

```tsx
// ✅ Extract value before passing to RHF
<CustomInput onChange={e => field.onChange(e.target.value)} />
// Or if it's a Base UI / Radix component that calls onChange(value) directly:
<CustomSelect onChange={field.onChange} />  // ✅ value passed directly
```

---

## K — Coding Challenge + Solution

### Challenge

Use `Controller` to wire a custom `<StarRating>` component (receives `value: number`, `onChange: (n: number) => void`) into a form with schema `{ rating: z.number().min(1, 'Please rate') }`. Show the error if unrated.

### Solution

```tsx
'use client'
import { Controller, useForm } from 'react-hook-form'
import { zodResolver }         from '@hookform/resolvers/zod'
import { z }                   from 'zod'

// Simple star component (stand-in for any 3rd-party)
function StarRating({ value, onChange, error }: {
  value: number; onChange: (n: number) => void; error?: string
}) {
  return (
    <div className="space-y-1">
      <div className="flex gap-1">
        {[1,2,3,4,5].map(n => (
          <button key={n} type="button" onClick={() => onChange(n)}
                  className={`text-2xl transition-colors ${n <= value ? 'text-yellow-400' : 'text-gray-300'}`}>
            ★
          </button>
        ))}
      </div>
      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  )
}

const ReviewSchema = z.object({
  comment: z.string().min(10, 'Min 10 characters'),
  rating:  z.number({ required_error: 'Please rate' }).min(1, 'Please rate')
})
type ReviewForm = z.infer<typeof ReviewSchema>

export function ReviewForm() {
  const { register, control, handleSubmit, formState: { errors } } = useForm<ReviewForm>({
    resolver:      zodResolver(ReviewSchema),
    defaultValues: { comment: '', rating: 0 }
  })

  return (
    <form onSubmit={handleSubmit(console.log)} className="space-y-4 max-w-sm">
      <textarea {...register('comment')} rows={3} placeholder="Your review"
                className="w-full border rounded-xl px-3 py-2 text-sm" />
      {errors.comment && <p className="text-xs text-red-600">{errors.comment.message}</p>}

      <Controller
        name="rating"
        control={control}
        render={({ field, fieldState }) => (
          <StarRating
            value={field.value}
            onChange={field.onChange}
            error={fieldState.error?.message}
          />
        )}
      />

      <button type="submit"
              className="w-full py-2.5 bg-blue-600 text-white rounded-xl text-sm font-semibold">
        Submit review
      </button>
    </form>
  )
}
```

---

---

# 2 — `Controller` with Native Inputs

---

## T — TL;DR

`Controller` works with native inputs too — use it when you need `field.value` in JSX (for visual feedback, character counts, or formatting). The trade-off: controlled mode causes a re-render per keystroke. Use `register` by default; reach for `Controller` on native inputs only when you genuinely need the value in render.

---

## K — Key Concepts

```tsx
// ─── Controller on <input> — when you need the value in render
<Controller
  name="username"
  control={control}
  render={({ field, fieldState }) => (
    <div className="relative">
      <input
        {...field}                   // spread: name, value, onChange, onBlur, ref
        placeholder="Username"
        maxLength={20}
        className="w-full border rounded-xl px-3 py-2 text-sm pr-14"
      />
      {/* Live char count — only possible with Controller (has field.value) */}
      <span className="absolute right-3 top-2.5 text-xs text-gray-400">
        {field.value.length}/20
      </span>
      {fieldState.error && (
        <p className="text-xs text-red-600 mt-1">{fieldState.error.message}</p>
      )}
    </div>
  )}
/>
```

```tsx
// ─── Controller on <textarea> with character count
<Controller
  name="bio"
  control={control}
  render={({ field, fieldState }) => (
    <div className="space-y-1">
      <textarea
        {...field}
        rows={3}
        maxLength={160}
        placeholder="Short bio"
        className="w-full border rounded-xl px-3 py-2 text-sm resize-none"
      />
      <div className="flex justify-between items-center">
        <span className={`text-xs ${fieldState.error ? 'text-red-600' : 'text-gray-400'}`}>
          {fieldState.error?.message ?? `${field.value?.length ?? 0}/160`}
        </span>
        {/* Progress bar */}
        <div className="w-24 h-1 rounded-full bg-gray-200">
          <div className="h-1 rounded-full bg-blue-500 transition-all"
               style={{ width: `${((field.value?.length ?? 0) / 160) * 100}%` }} />
        </div>
      </div>
    </div>
  )}
/>
```

```tsx
// ─── Spreading field object onto native elements
// field contains: { name, value, onChange, onBlur, ref }
// Spreading {...field} works directly on <input>, <select>, <textarea>

// For <input type="checkbox">: value is boolean, but HTML wants checked
<Controller
  name="active"
  control={control}
  render={({ field }) => (
    <input
      type="checkbox"
      name={field.name}
      checked={field.value}          // boolean → checked prop
      onChange={e => field.onChange(e.target.checked)}  // extract .checked
      onBlur={field.onBlur}
      ref={field.ref}
    />
  )}
/>
```

---

## W — Why It Matters

- Live character counts and progress indicators are the clearest use case for `Controller` on native inputs — they require `field.value` in JSX, which `register` (uncontrolled) can't provide without `watch`.
- Using `Controller` instead of `register + watch` for this pattern is slightly cleaner — `watch` creates a separate subscription, `Controller` gives you the value directly in the render prop.
- Knowing when NOT to use `Controller` on native inputs is equally important — if you don't need `field.value` in render, `register` is faster and simpler.

---

## I — Interview Q&A

### Q: When is it appropriate to use `Controller` on a native `<input>` instead of `register`?

**A:** When you need `field.value` rendered in JSX — live character counts, formatted previews, conditional styling based on current value, or length-based progress bars. `register` is uncontrolled, so the value isn't available in render without calling `watch`. `Controller` gives you `field.value` directly in the render prop. The trade-off is one re-render per keystroke for that field. If the only thing you need is the value in a sibling component (not in the label or UI wrapping the input itself), use `useWatch` in the sibling instead — it isolates the re-render to just that sibling.

---

## C — Common Pitfalls + Fix

### ❌ Spreading `{...field}` on `<input type="checkbox">` — sets `value` not `checked`

```tsx
// ❌ Checkbox needs checked={bool}, not value={bool}
<input type="checkbox" {...field} />
// → <input type="checkbox" value="true" /> — visually never checked ❌
```

**Fix:** Map `field.value` to `checked` and extract `.checked` from the event:

```tsx
// ✅
<input
  type="checkbox"
  name={field.name}
  checked={!!field.value}
  onChange={e => field.onChange(e.target.checked)}
  onBlur={field.onBlur}
  ref={field.ref}
/>
```

---

## K — Coding Challenge + Solution

### Challenge

Build a profile form with: `username` using `Controller` showing live `x/20` character count, `bio` using `Controller` showing a progress bar (max 160 chars), `active` checkbox using `Controller` with proper `checked` handling.

### Solution

```tsx
'use client'
import { Controller, useForm } from 'react-hook-form'
import { zodResolver }         from '@hookform/resolvers/zod'
import { z }                   from 'zod'

const Schema = z.object({
  username: z.string().min(3, 'Min 3 chars').max(20),
  bio:      z.string().max(160).optional(),
  active:   z.boolean().default(true)
})
type F = z.infer<typeof Schema>

export function ProfileForm() {
  const { control, handleSubmit } = useForm<F>({
    resolver:      zodResolver(Schema),
    defaultValues: { username: '', bio: '', active: true }
  })

  return (
    <form onSubmit={handleSubmit(console.log)} className="space-y-5 max-w-sm">

      {/* username with char count */}
      <Controller name="username" control={control} render={({ field, fieldState }) => (
        <div className="space-y-1">
          <div className="relative">
            <input {...field} maxLength={20} placeholder="Username"
                   className="w-full border rounded-xl px-3 py-2 text-sm pr-14
                                focus:outline-none focus:ring-2 focus:ring-blue-500" />
            <span className="absolute right-3 top-2.5 text-xs text-gray-400">
              {field.value.length}/20
            </span>
          </div>
          {fieldState.error && <p className="text-xs text-red-600">{fieldState.error.message}</p>}
        </div>
      )} />

      {/* bio with progress bar */}
      <Controller name="bio" control={control} render={({ field }) => (
        <div className="space-y-1">
          <textarea {...field} rows={3} maxLength={160} placeholder="Short bio"
                    className="w-full border rounded-xl px-3 py-2 text-sm resize-none
                                 focus:outline-none focus:ring-2 focus:ring-blue-500" />
          <div className="flex items-center justify-between gap-3">
            <div className="flex-1 h-1 rounded-full bg-gray-200">
              <div className="h-1 rounded-full bg-blue-500 transition-all"
                   style={{ width: `${(((field.value?.length ?? 0)) / 160) * 100}%` }} />
            </div>
            <span className="text-xs text-gray-400 shrink-0">
              {field.value?.length ?? 0}/160
            </span>
          </div>
        </div>
      )} />

      {/* checkbox — correct controlled mapping */}
      <Controller name="active" control={control} render={({ field }) => (
        <label className="flex items-center gap-2 cursor-pointer text-sm">
          <input
            type="checkbox"
            name={field.name}
            checked={!!field.value}
            onChange={e => field.onChange(e.target.checked)}
            onBlur={field.onBlur}
            ref={field.ref}
            className="size-4 rounded border-gray-300"
          />
          Active account
        </label>
      )} />

      <button type="submit"
              className="w-full py-2.5 bg-blue-600 text-white rounded-xl text-sm font-semibold">
        Save profile
      </button>
    </form>
  )
}
```

---

---

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

# 4 — Reusable Field Wrapper Components

---

## T — TL;DR

A reusable field component wraps a `Controller` (or `register`) with its label, error message, and styling — accepting `name`, `control`, and custom props. This eliminates repeated label/error boilerplate across every form and makes fields individually testable.

---

## K — Key Concepts

```tsx
// ─── Pattern: reusable TextField built on Controller
import { Controller, Control, FieldValues, Path } from 'react-hook-form'

// Generic types: T = form type, name = keyof T
interface TextFieldProps<T extends FieldValues> {
  name:        Path<T>       // type-safe field name
  control:     Control<T>
  label:       string
  placeholder?: string
  type?:       'text' | 'email' | 'password' | 'number'
  helperText?:  string
}

export function TextField<T extends FieldValues>({
  name, control, label, placeholder, type = 'text', helperText
}: TextFieldProps<T>) {
  return (
    <Controller
      name={name}
      control={control}
      render={({ field, fieldState }) => (
        <div className="space-y-1.5">
          <label htmlFor={name as string}
                 className="block text-sm font-medium text-gray-700 dark:text-gray-300">
            {label}
          </label>
          <input
            {...field}
            id={name as string}
            type={type}
            placeholder={placeholder}
            aria-invalid={!!fieldState.error}
            aria-describedby={fieldState.error ? `${name}-error` : undefined}
            className={`w-full border rounded-xl px-3 py-2.5 text-sm
                        transition-colors focus:outline-none focus:ring-2
                        ${fieldState.error
                          ? 'border-red-400 focus:ring-red-400'
                          : 'border-gray-300 focus:ring-blue-500'}`}
          />
          {fieldState.error ? (
            <p id={`${name}-error`} role="alert"
               className="text-xs text-red-600">
              {fieldState.error.message}
            </p>
          ) : helperText ? (
            <p className="text-xs text-gray-400">{helperText}</p>
          ) : null}
        </div>
      )}
    />
  )
}
```

```tsx
// ─── Usage — clean, no repeated boilerplate
<TextField name="username" control={control} label="Username"
           placeholder="e.g. markdev" helperText="3–20 characters, no spaces" />
<TextField name="email"    control={control} label="Email address"    type="email" />
<TextField name="password" control={control} label="Password"         type="password" />
```

```tsx
// ─── Reusable SelectField
interface SelectFieldProps<T extends FieldValues> {
  name:    Path<T>
  control: Control<T>
  label:   string
  options: { value: string; label: string }[]
}

export function SelectField<T extends FieldValues>({
  name, control, label, options
}: SelectFieldProps<T>) {
  return (
    <Controller name={name} control={control}
      render={({ field, fieldState }) => (
        <div className="space-y-1.5">
          <label htmlFor={name as string}
                 className="block text-sm font-medium text-gray-700">
            {label}
          </label>
          <select {...field} id={name as string}
                  className="w-full border border-gray-300 rounded-xl px-3 py-2.5 text-sm
                               focus:outline-none focus:ring-2 focus:ring-blue-500">
            <option value="">Select…</option>
            {options.map(o => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
          {fieldState.error && (
            <p role="alert" className="text-xs text-red-600">{fieldState.error.message}</p>
          )}
        </div>
      )}
    />
  )
}
```

---

## W — Why It Matters

- Repeating `label + input + error` three times in a 10-field form is 30 lines of near-identical JSX. Extracting `<TextField>` reduces it to 10 one-liner fields — the form becomes readable as a data model.
- `Path<T>` as the `name` type ensures TypeScript catches invalid field names at compile time — `<TextField name="emaill" ...>` is a TypeScript error.
- The `aria-invalid` + `aria-describedby` pattern built into the reusable component means every instance of `<TextField>` is accessible for free — no one has to remember to add ARIA attributes per field.

---

## I — Interview Q&A

### Q: How do you make a reusable form field component type-safe for any form type?

**A:** Use TypeScript generics with RHF's `FieldValues` constraint and `Path<T>` for the `name` prop. Define the component as `function TextField<T extends FieldValues>({ name, control }: { name: Path<T>, control: Control<T> })`. `Path<T>` is a utility type from RHF that resolves to all valid dot-notation field paths for a given form type — so `name="username"` compiles when `username` is in the schema and fails when it isn't. The `control: Control<T>` parameter ties the component to the specific form instance, preserving the generic `T` through the component tree.

---

## C — Common Pitfalls + Fix

### ❌ Using `string` instead of `Path<T>` for the name prop — loses type safety

```tsx
// ❌ name is string — any string compiles, typos not caught
interface Props { name: string; control: Control<any> }
function TextField({ name, control }: Props) { ... }

<TextField name="emaill" control={control} />  // typo — no TS error ❌
```

**Fix:**

```tsx
// ✅ Path<T> enforces valid field names
import { FieldValues, Path, Control } from 'react-hook-form'
interface Props<T extends FieldValues> { name: Path<T>; control: Control<T> }

<TextField<LoginForm> name="emaill" control={control} />  // TS error ✅
```

---

## K — Coding Challenge + Solution

### Challenge

Build three reusable field components: `<TextField>`, `<TextareaField>`, `<CheckboxField>`. Each uses `Controller`, accepts `name: Path<T>` and `control: Control<T>`, renders label + field + error. Use them to build a full `ContactForm` with zero repeated boilerplate.

### Solution

```tsx
// src/components/ui/form-fields.tsx
'use client'
import { Controller, Control, FieldValues, Path } from 'react-hook-form'

const base   = 'w-full border rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 transition-colors'
const valid  = 'border-gray-300 focus:ring-blue-500'
const invalid = 'border-red-400 focus:ring-red-400'

// ─── TextField
export function TextField<T extends FieldValues>({ name, control, label, type = 'text', placeholder }: {
  name: Path<T>; control: Control<T>; label: string; type?: string; placeholder?: string
}) {
  return (
    <Controller name={name} control={control} render={({ field, fieldState }) => (
      <div className="space-y-1.5">
        <label htmlFor={String(name)} className="block text-sm font-medium text-gray-700">{label}</label>
        <input {...field} id={String(name)} type={type} placeholder={placeholder}
               aria-invalid={!!fieldState.error}
               className={`${base} ${fieldState.error ? invalid : valid}`} />
        {fieldState.error && <p role="alert" className="text-xs text-red-600">{fieldState.error.message}</p>}
      </div>
    )} />
  )
}

// ─── TextareaField
export function TextareaField<T extends FieldValues>({ name, control, label, rows = 3, maxLength, placeholder }: {
  name: Path<T>; control: Control<T>; label: string; rows?: number; maxLength?: number; placeholder?: string
}) {
  return (
    <Controller name={name} control={control} render={({ field, fieldState }) => (
      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <label htmlFor={String(name)} className="block text-sm font-medium text-gray-700">{label}</label>
          {maxLength && (
            <span className="text-xs text-gray-400">{String(field.value ?? '').length}/{maxLength}</span>
          )}
        </div>
        <textarea {...field} id={String(name)} rows={rows} maxLength={maxLength} placeholder={placeholder}
                  className={`${base} resize-none ${fieldState.error ? invalid : valid}`} />
        {fieldState.error && <p role="alert" className="text-xs text-red-600">{fieldState.error.message}</p>}
      </div>
    )} />
  )
}

// ─── CheckboxField
export function CheckboxField<T extends FieldValues>({ name, control, label }: {
  name: Path<T>; control: Control<T>; label: string
}) {
  return (
    <Controller name={name} control={control} render={({ field, fieldState }) => (
      <div className="space-y-1">
        <label className="flex items-center gap-2.5 cursor-pointer text-sm select-none">
          <input type="checkbox" name={field.name} ref={field.ref}
                 checked={!!field.value} onBlur={field.onBlur}
                 onChange={e => field.onChange(e.target.checked)}
                 className="size-4 rounded border-gray-300 text-blue-600
                              focus:ring-blue-500" />
          {label}
        </label>
        {fieldState.error && <p role="alert" className="text-xs text-red-600">{fieldState.error.message}</p>}
      </div>
    )} />
  )
}
```

```tsx
// src/components/contact-form.tsx — using the field components
'use client'
import { useForm }     from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z }           from 'zod'
import { TextField, TextareaField, CheckboxField } from '@/components/ui/form-fields'

const ContactSchema = z.object({
  name:      z.string().min(2, 'Min 2 characters'),
  email:     z.string().email('Invalid email'),
  message:   z.string().min(20, 'Min 20 characters').max(500),
  subscribe: z.boolean().default(false)
})
type ContactForm = z.infer<typeof ContactSchema>

export function ContactForm() {
  const { control, handleSubmit, formState: { isSubmitting } } = useForm<ContactForm>({
    resolver:      zodResolver(ContactSchema),
    defaultValues: { name: '', email: '', message: '', subscribe: false }
  })

  return (
    <form onSubmit={handleSubmit(console.log)} className="space-y-4 max-w-sm">
      <TextField<ContactForm>      name="name"      control={control} label="Full name"    placeholder="Mark Austin" />
      <TextField<ContactForm>      name="email"     control={control} label="Email"        type="email" />
      <TextareaField<ContactForm>  name="message"   control={control} label="Message"      maxLength={500} rows={4} />
      <CheckboxField<ContactForm>  name="subscribe" control={control} label="Subscribe to updates" />
      <button type="submit" disabled={isSubmitting}
              className="w-full py-2.5 bg-blue-600 text-white rounded-xl text-sm font-semibold disabled:opacity-50">
        {isSubmitting ? 'Sending…' : 'Send message'}
      </button>
    </form>
  )
}
```

---

---

# 5 — `FormProvider` and `useFormContext`

---

## T — TL;DR

`FormProvider` shares the form instance via React context. `useFormContext<T>()` reads it in any descendant component — no prop drilling. Use it when a form is split across multiple components that each need access to `register`, `control`, or `formState`.

---

## K — Key Concepts

```tsx
import { useForm, FormProvider, useFormContext } from 'react-hook-form'
import { zodResolver }                           from '@hookform/resolvers/zod'

// ─── Parent: create form instance and provide it
function CheckoutForm() {
  const methods = useForm<CheckoutType>({
    resolver:      zodResolver(CheckoutSchema),
    defaultValues: { ... }
  })

  return (
    // Spread methods onto FormProvider — passes ALL return values as context
    <FormProvider {...methods}>
      <form onSubmit={methods.handleSubmit(onSubmit)}>
        <ShippingSection />      {/* can access register, control, errors */}
        <PaymentSection />       {/* can access register, control, errors */}
        <OrderSummary />         {/* can access watch, getValues */}
        <SubmitSection />        {/* can access isSubmitting, isDirty */}
      </form>
    </FormProvider>
  )
}
```

```tsx
// ─── Child: read form context without props
function ShippingSection() {
  // useFormContext returns same object as useForm — fully typed
  const { register, formState: { errors } } = useFormContext<CheckoutType>()

  return (
    <fieldset className="space-y-3 p-4 border rounded-2xl">
      <legend className="text-sm font-semibold px-1">Shipping</legend>
      <input {...register('shipping.name')} placeholder="Full name"
             className="w-full border rounded-xl px-3 py-2 text-sm" />
      {errors.shipping?.name && (
        <p className="text-xs text-red-600">{errors.shipping.name.message}</p>
      )}
    </fieldset>
  )
}

// ─── Another child using control for Controller
function PaymentSection() {
  const { control, formState: { errors } } = useFormContext<CheckoutType>()

  return (
    <fieldset className="space-y-3 p-4 border rounded-2xl">
      <legend className="text-sm font-semibold px-1">Payment</legend>
      <Controller name="payment.cardNumber" control={control}
        render={({ field, fieldState }) => (
          <input {...field} placeholder="Card number"
                 className={`w-full border rounded-xl px-3 py-2 text-sm
                              ${fieldState.error ? 'border-red-400' : 'border-gray-300'}`} />
        )}
      />
    </fieldset>
  )
}
```

```tsx
// ─── Reusable field components + FormProvider — cleanest pattern
// Field components can use useFormContext internally — no control prop needed

export function TextField<T extends FieldValues>({ name, label }: {
  name: Path<T>; label: string
}) {
  // Gets control from context — no need to pass it as a prop
  const { control } = useFormContext<T>()
  return (
    <Controller name={name} control={control}
      render={({ field, fieldState }) => (
        <div className="space-y-1.5">
          <label className="block text-sm font-medium text-gray-700">{label}</label>
          <input {...field}
                 className="w-full border rounded-xl px-3 py-2 text-sm" />
          {fieldState.error && <p className="text-xs text-red-600">{fieldState.error.message}</p>}
        </div>
      )}
    />
  )
}

// Usage — no control prop required ✅
<TextField<MyForm> name="email" label="Email" />
```

---

## W — Why It Matters

- Without `FormProvider`, every child component that needs form access must receive `register`, `control`, `errors`, etc. as props — large forms become deeply drilled prop chains that break when the form shape changes.
- `FormProvider` enables a clean **composition model** — each section component owns its own fields without knowing about the parent form's structure beyond its own scope.
- Combining `FormProvider` with generic `useFormContext<T>()` reusable field components (from subtopic 4) creates the most scalable architecture — field components are smart (no props beyond name and label) while parent forms stay declarative.

---

## I — Interview Q&A

### Q: What is the performance implication of `FormProvider` and `useFormContext`?

**A:** `FormProvider` uses React context internally. Context re-renders all consumers when the context value changes — and the context value here is the RHF methods object, which is stable (same reference between renders). So consuming components don't re-render just because of the Provider. Re-renders are still controlled by `formState` property subscriptions — if a child accesses `formState.errors` via `useFormContext`, it only re-renders when errors change, same as in the parent. The Provider does not add extra re-renders on top of normal RHF behaviour.

---

## C — Common Pitfalls + Fix

### ❌ Calling `useFormContext` outside of `FormProvider`

```tsx
// ❌ useFormContext throws if no FormProvider wraps this component
function OrphanField() {
  const { register } = useFormContext()  // throws at runtime
  return <input {...register('name')} />
}
// <OrphanField /> rendered outside any <FormProvider>
```

**Fix:** Always wrap the form tree with `FormProvider`, or pass `control` as a prop for isolated usage:

```tsx
// ✅ FormProvider wraps the entire form tree
<FormProvider {...methods}>
  <form>
    <OrphanField />
  </form>
</FormProvider>
```

---

## K — Coding Challenge + Solution

### Challenge

Build a multi-section registration form using `FormProvider`. Sections: `<AccountSection>` (email, password), `<PersonalSection>` (firstName, lastName, birthYear), `<PreferencesSection>` (newsletter checkbox, role select). Each section uses `useFormContext`. Parent just provides context and renders `<form>`.

### Solution

```tsx
'use client'
import { useForm, FormProvider, useFormContext } from 'react-hook-form'
import { zodResolver }                           from '@hookform/resolvers/zod'
import { z }                                     from 'zod'

const RegSchema = z.object({
  email:       z.string().email('Invalid email'),
  password:    z.string().min(8, 'Min 8 characters'),
  firstName:   z.string().min(1, 'Required'),
  lastName:    z.string().min(1, 'Required'),
  birthYear:   z.coerce.number().int().min(1900).max(2010),
  newsletter:  z.boolean().default(false),
  role:        z.enum(['developer', 'designer', 'manager']).default('developer')
})
type RegForm = z.infer<typeof RegSchema>

const cls = 'w-full border rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500'
const err = 'text-xs text-red-600 mt-1'

function AccountSection() {
  const { register, formState: { errors } } = useFormContext<RegForm>()
  return (
    <fieldset className="space-y-3 border border-gray-200 rounded-2xl p-4">
      <legend className="text-xs font-bold uppercase text-gray-500 px-1">Account</legend>
      <div>
        <input {...register('email')}    type="email"    placeholder="Email"    className={cls} />
        {errors.email    && <p className={err}>{errors.email.message}</p>}
      </div>
      <div>
        <input {...register('password')} type="password" placeholder="Password" className={cls} />
        {errors.password && <p className={err}>{errors.password.message}</p>}
      </div>
    </fieldset>
  )
}

function PersonalSection() {
  const { register, formState: { errors } } = useFormContext<RegForm>()
  return (
    <fieldset className="space-y-3 border border-gray-200 rounded-2xl p-4">
      <legend className="text-xs font-bold uppercase text-gray-500 px-1">Personal</legend>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <input {...register('firstName')} placeholder="First name" className={cls} />
          {errors.firstName && <p className={err}>{errors.firstName.message}</p>}
        </div>
        <div>
          <input {...register('lastName')}  placeholder="Last name"  className={cls} />
          {errors.lastName  && <p className={err}>{errors.lastName.message}</p>}
        </div>
      </div>
      <div>
        <input {...register('birthYear')} type="number" placeholder="Birth year" className={cls} />
        {errors.birthYear && <p className={err}>{errors.birthYear.message}</p>}
      </div>
    </fieldset>
  )
}

function PreferencesSection() {
  const { register, formState: { errors } } = useFormContext<RegForm>()
  return (
    <fieldset className="space-y-3 border border-gray-200 rounded-2xl p-4">
      <legend className="text-xs font-bold uppercase text-gray-500 px-1">Preferences</legend>
      <select {...register('role')} className={cls}>
        {['developer','designer','manager'].map(r => (
          <option key={r} value={r}>{r.charAt(0).toUpperCase() + r.slice(1)}</option>
        ))}
      </select>
      <label className="flex items-center gap-2 text-sm cursor-pointer">
        <input {...register('newsletter')} type="checkbox" className="size-4 rounded" />
        Subscribe to newsletter
      </label>
    </fieldset>
  )
}

export function RegistrationForm() {
  const methods = useForm<RegForm>({
    resolver:      zodResolver(RegSchema),
    mode:          'onTouched',
    defaultValues: { email: '', password: '', firstName: '', lastName: '',
                     birthYear: 1995, newsletter: false, role: 'developer' }
  })

  return (
    <FormProvider {...methods}>
      <form onSubmit={methods.handleSubmit(console.log)} className="space-y-4 max-w-sm">
        <AccountSection />
        <PersonalSection />
        <PreferencesSection />
        <button type="submit" disabled={methods.formState.isSubmitting}
                className="w-full py-2.5 bg-blue-600 text-white rounded-xl text-sm
                            font-semibold disabled:opacity-50">
          {methods.formState.isSubmitting ? 'Creating account…' : 'Create account'}
        </button>
      </form>
    </FormProvider>
  )
}
```

---

---

# 6 — Nested Field Paths — Dot Notation and Objects

---

## T — TL;DR

RHF supports nested fields via dot-notation strings — `register('address.city')` maps to `{ address: { city: '...' } }` in submitted data. Zod schemas with nested `z.object()` validate the nested structure. Access errors via `errors.address?.city`.

---

## K — Key Concepts

```tsx
// ─── Schema with nested objects
const OrderSchema = z.object({
  customer: z.object({
    name:  z.string().min(1, 'Name required'),
    email: z.string().email('Invalid email')
  }),
  shipping: z.object({
    street:  z.string().min(5),
    city:    z.string().min(2),
    country: z.string().length(2)
  }),
  notes: z.string().optional()
})
type OrderForm = z.infer<typeof OrderSchema>
// {
//   customer: { name: string; email: string }
//   shipping: { street: string; city: string; country: string }
//   notes?: string
// }

const { register, formState: { errors } } = useForm<OrderForm>({
  resolver:      zodResolver(OrderSchema),
  defaultValues: {
    customer: { name: '', email: '' },
    shipping: { street: '', city: '', country: '' }
  }
})

// ─── Registering nested fields — dot notation
<input {...register('customer.name')}     />  // → data.customer.name
<input {...register('customer.email')}    />  // → data.customer.email
<input {...register('shipping.street')}   />  // → data.shipping.street
<input {...register('shipping.city')}     />  // → data.shipping.city
<input {...register('shipping.country')}  />  // → data.shipping.country

// ─── Accessing nested errors
errors.customer?.name?.message     // 'Name required'
errors.customer?.email?.message    // 'Invalid email'
errors.shipping?.street?.message
errors.shipping?.city?.message
```

```tsx
// ─── Deep nesting
const DeepSchema = z.object({
  org: z.object({
    name: z.string(),
    address: z.object({
      billing: z.object({ zip: z.string() })
    })
  })
})

register('org.address.billing.zip')
errors.org?.address?.billing?.zip?.message

// ─── TypeScript: Path<T> resolves all valid nested paths
import { Path } from 'react-hook-form'
type Paths = Path<OrderForm>
// 'customer' | 'customer.name' | 'customer.email'
// 'shipping' | 'shipping.street' | 'shipping.city' | 'shipping.country'
// 'notes'

// ─── defaultValues must mirror the nested shape
// ✅ Correct — nested structure
defaultValues: { customer: { name: '', email: '' }, shipping: { street: '', city: '' } }

// ❌ Wrong — flat structure for a nested schema
defaultValues: { 'customer.name': '', 'customer.email': '' }  // doesn't work
```

---

## W — Why It Matters

- Nested schemas produce structured data from the form — `handleSubmit` receives `{ customer: { name, email }, shipping: { ... } }` not a flat object. This maps directly to your API payload or database insert shape.
- `Path<T>` resolves all valid nested paths with TypeScript — `register('customer.nme')` is a TypeScript error if `nme` isn't in the schema, catching typos in deeply nested forms.
- `defaultValues` must use the same nested shape as the schema — flat dot-notation keys in `defaultValues` don't work. RHF expects `{ shipping: { city: '' } }`, not `{ 'shipping.city': '' }`.

---

## I — Interview Q&A

### Q: How do you access validation errors for a nested field like `shipping.city` in RHF with zodResolver?

**A:** The `zodResolver` maps Zod's error path `['shipping', 'city']` to `errors.shipping.city`. Access it with optional chaining: `errors.shipping?.city?.message`. The `?.` is required because `errors.shipping` might be `undefined` if there are no errors in that sub-object. In TypeScript, `errors` is typed as `DeepPartial<FieldErrors<T>>`, so optional chaining is both required by the type system and safe at runtime.

---

## C — Common Pitfalls + Fix

### ❌ Using flat dot-notation keys in `defaultValues` for nested schemas

```tsx
// ❌ RHF expects nested objects, not flat keys
useForm({
  defaultValues: {
    'shipping.city':   'Manila',  // wrong — ignored
    'shipping.street': '123 Main' // wrong — ignored
  }
})
// Fields appear empty, isDirty doesn't work correctly
```

**Fix:** Mirror the schema's nested structure:

```tsx
// ✅
useForm({
  defaultValues: {
    shipping: { city: 'Manila', street: '123 Main', country: 'PH' }
  }
})
```

---

## K — Coding Challenge + Solution

### Challenge

Build an order form with two nested sections — `billing` (name, street, city) and `shipping` (street, city) — plus a "same as billing" checkbox that uses `setValue` to copy billing → shipping when checked. Show nested errors per field.

### Solution

```tsx
'use client'
import { useForm, useWatch } from 'react-hook-form'
import { zodResolver }       from '@hookform/resolvers/zod'
import { z }                 from 'zod'
import { useEffect }         from 'react'

const addr   = z.object({ street: z.string().min(5, 'Min 5 chars'), city: z.string().min(2, 'Required') })
const Schema = z.object({
  billing:       z.object({ name: z.string().min(2, 'Required'), ...addr.shape }),
  shipping:      addr,
  sameAsBilling: z.boolean().default(false)
})
type F = z.infer<typeof Schema>

export function OrderAddressForm() {
  const { register, handleSubmit, control, setValue, getValues,
          formState: { errors } } = useForm<F>({
    resolver:      zodResolver(Schema),
    defaultValues: {
      billing:       { name: '', street: '', city: '' },
      shipping:      { street: '', city: '' },
      sameAsBilling: false
    }
  })

  const same = useWatch({ control, name: 'sameAsBilling' })
  useEffect(() => {
    if (same) {
      const b = getValues('billing')
      setValue('shipping.street', b.street, { shouldDirty: true, shouldValidate: true })
      setValue('shipping.city',   b.city,   { shouldDirty: true, shouldValidate: true })
    }
  }, [same, getValues, setValue])

  const cls = 'w-full border rounded-xl px-3 py-2 text-sm'
  const e   = (m?: string) => m ? <p className="text-xs text-red-600 mt-1">{m}</p> : null

  return (
    <form onSubmit={handleSubmit(console.log)} className="space-y-5 max-w-sm">
      <fieldset className="space-y-3 border border-gray-200 rounded-2xl p-4">
        <legend className="text-xs font-bold uppercase text-gray-500 px-1">Billing</legend>
        <div>
          <input {...register('billing.name')}   placeholder="Full name"      className={cls} />
          {e(errors.billing?.name?.message)}
        </div>
        <div>
          <input {...register('billing.street')} placeholder="Street address" className={cls} />
          {e(errors.billing?.street?.message)}
        </div>
        <div>
          <input {...register('billing.city')}   placeholder="City"           className={cls} />
          {e(errors.billing?.city?.message)}
        </div>
      </fieldset>

      <label className="flex items-center gap-2 text-sm cursor-pointer">
        <input {...register('sameAsBilling')} type="checkbox" className="size-4 rounded" />
        Shipping same as billing
      </label>

      <fieldset className="space-y-3 border border-gray-200 rounded-2xl p-4">
        <legend className="text-xs font-bold uppercase text-gray-500 px-1">Shipping</legend>
        <div>
          <input {...register('shipping.street')} placeholder="Street address" className={cls} disabled={same} />
          {e(errors.shipping?.street?.message)}
        </div>
        <div>
          <input {...register('shipping.city')}   placeholder="City"           className={cls} disabled={same} />
          {e(errors.shipping?.city?.message)}
        </div>
      </fieldset>

      <button type="submit"
              className="w-full py-2.5 bg-blue-600 text-white rounded-xl text-sm font-semibold">
        Place order
      </button>
    </form>
  )
}
```

---

---

# 7 — Component Composition Patterns

---

## T — TL;DR

Large forms need structure. Three patterns scale well: **Section components** (group related fields), **Field components** (one component per field type), and **Form-level composition** (parent owns schema + state, children own UI). Combine `FormProvider` + generic field components + section components for maximum maintainability.

---

## K — Key Concepts

```
Three composition levels:

Level 1 — Field components (atoms)
  <TextField>  <SelectField>  <CheckboxField>  <DateField>
  → owns: label + input + error + ARIA
  → accepts: name, label (minimal props)
  → knows nothing about the form schema

Level 2 — Section components (molecules)
  <AccountSection>  <AddressSection>  <PaymentSection>
  → owns: a logical group of fields
  → uses FormProvider context via useFormContext
  → knows the form schema type for type-safe field names

Level 3 — Form component (organism)
  <CheckoutForm>  <RegistrationForm>
  → owns: schema, useForm, handleSubmit, FormProvider
  → renders section components
  → knows nothing about individual field rendering
```

```tsx
// ─── Pattern: context-aware field components (no control prop)
// These use useFormContext internally — cleanest API

import { useFormContext, Controller, FieldValues, Path } from 'react-hook-form'

// AutoTextField — gets control from context, no prop needed
export function AutoTextField<T extends FieldValues>({ name, label, type = 'text' }: {
  name: Path<T>; label: string; type?: string
}) {
  const { control } = useFormContext<T>()
  return (
    <Controller name={name} control={control}
      render={({ field, fieldState }) => (
        <div className="space-y-1.5">
          <label className="block text-sm font-medium text-gray-700">{label}</label>
          <input {...field} type={type}
                 className={`w-full border rounded-xl px-3 py-2.5 text-sm
                              focus:outline-none focus:ring-2
                              ${fieldState.error
                                ? 'border-red-400 focus:ring-red-400'
                                : 'border-gray-300 focus:ring-blue-500'}`} />
          {fieldState.error && (
            <p role="alert" className="text-xs text-red-600">{fieldState.error.message}</p>
          )}
        </div>
      )}
    />
  )
}
```

```tsx
// ─── Pattern: Section with FormProvider context
import { useFormContext } from 'react-hook-form'
import { AutoTextField } from './auto-text-field'

// Type-safe section — knows the form type
function BillingSection() {
  const { formState: { errors } } = useFormContext<CheckoutForm>()

  return (
    <section className="space-y-4">
      <h3 className="font-semibold text-gray-900">Billing Information</h3>
      <div className="grid grid-cols-2 gap-4">
        <AutoTextField<CheckoutForm> name="billing.firstName" label="First name" />
        <AutoTextField<CheckoutForm> name="billing.lastName"  label="Last name"  />
      </div>
      <AutoTextField<CheckoutForm> name="billing.email"   label="Email"   type="email" />
      <AutoTextField<CheckoutForm> name="billing.address" label="Address" />
    </section>
  )
}
```

```tsx
// ─── Pattern: Submit section — only knows isSubmitting + isDirty
function FormActions() {
  const { formState: { isSubmitting, isDirty }, reset } = useFormContext()
  return (
    <div className="flex items-center gap-3 pt-4 border-t">
      <button type="button" onClick={() => reset()} disabled={!isDirty}
              className="px-5 py-2.5 border border-gray-300 rounded-xl text-sm
                          font-semibold text-gray-700 disabled:opacity-40
                          hover:bg-gray-50 transition-colors">
        Discard changes
      </button>
      <button type="submit" disabled={isSubmitting || !isDirty}
              className="px-5 py-2.5 bg-blue-600 text-white rounded-xl text-sm
                          font-semibold disabled:opacity-40 hover:bg-blue-700
                          transition-colors">
        {isSubmitting ? 'Saving…' : 'Save changes'}
      </button>
      {isDirty && <span className="text-xs text-amber-600 ml-auto">Unsaved changes</span>}
    </div>
  )
}
```

---

## W — Why It Matters

- The three-level pattern (field → section → form) maps directly to how designers think about forms — atomic fields, grouped sections, page-level layout. Code and design speak the same language.
- Context-aware field components (`useFormContext` internally, no `control` prop) reduce the field usage from `<TextField name="email" control={control} label="Email" />` to `<TextField name="email" label="Email" />` — significant verbosity reduction in large forms.
- Section components can be independently rendered in Storybook or tested in isolation — they mock `FormProvider` with a test form instance and render any combination of field states.

---

## I — Interview Q&A

### Q: How would you structure a 20-field checkout form for maintainability?

**A:** Three levels. First, create atomic field components (`TextField`, `SelectField`, `CheckboxField`) that use `useFormContext` internally — they accept only `name` and `label`. Second, create section components (`CustomerSection`, `ShippingSection`, `PaymentSection`) that render 4–6 field components each, grouping related fields logically — each section uses `useFormContext` for access. Third, create the form component that owns `useForm`, `FormProvider`, `handleSubmit`, and the Zod schema — it renders the sections and a submit button. The form component becomes 20–30 lines. Sections are 10–15 lines each. Fields are reusable across all forms in the app.

---

## C — Common Pitfalls + Fix

### ❌ Putting business logic (API calls, routing) inside section components

```tsx
// ❌ Section reaches outside its scope — hard to test, hard to reuse
function PaymentSection() {
  const { handleSubmit } = useFormContext()
  const router = useRouter()
  // ← section should only render fields, not handle submission
  return (
    <form onSubmit={handleSubmit(async data => {
      await api.submit(data)       // ❌ belongs in parent form
      router.push('/success')      // ❌ belongs in parent form
    })}>
```

**Fix:** Keep sections presentational — submit logic lives only in the parent form:

```tsx
// ✅ Section: only fields + labels + errors
function PaymentSection() {
  return <fieldset>{ /* field components only */ }</fieldset>
}

// ✅ Parent: business logic
function CheckoutForm() {
  const methods = useForm(...)
  async function onSubmit(data) {
    await api.submit(data)  // ← business logic here
    router.push('/success')
  }
  return (
    <FormProvider {...methods}>
      <form onSubmit={methods.handleSubmit(onSubmit)}>
        <PaymentSection />
        <SubmitButton />
      </form>
    </FormProvider>
  )
}
```

---

## K — Coding Challenge + Solution

### Challenge

Build a 3-section profile form using all three composition levels: `AutoTextField` (context-aware atom), `AccountSection` + `NotificationsSection` (molecules), `ProfileSettingsForm` (organism with schema and FormProvider). Auto field components get control from context — no `control` prop in usage.

### Solution

```tsx
'use client'
import { useForm, FormProvider, useFormContext, Controller, FieldValues, Path } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z }           from 'zod'

// ─── Schema
const ProfileSchema = z.object({
  displayName:   z.string().min(2, 'Min 2 characters'),
  email:         z.string().email('Invalid email'),
  currentPassword: z.string().min(8, 'Min 8 characters').optional().or(z.literal('')),
  emailOnComment: z.boolean().default(true),
  emailOnMention: z.boolean().default(true),
  weeklyDigest:  z.boolean().default(false)
})
type ProfileSettings = z.infer<typeof ProfileSchema>

// ─── Level 1: Atom — context-aware field
function AutoTextField<T extends FieldValues>({ name, label, type = 'text' }: {
  name: Path<T>; label: string; type?: string
}) {
  const { control } = useFormContext<T>()
  return (
    <Controller name={name} control={control} render={({ field, fieldState }) => (
      <div className="space-y-1.5">
        <label className="block text-sm font-medium text-gray-700">{label}</label>
        <input {...field} type={type}
               className={`w-full border rounded-xl px-3 py-2.5 text-sm
                            focus:outline-none focus:ring-2
                            ${fieldState.error ? 'border-red-400 focus:ring-red-400' : 'border-gray-300 focus:ring-blue-500'}`} />
        {fieldState.error && <p role="alert" className="text-xs text-red-600">{fieldState.error.message}</p>}
      </div>
    )} />
  )
}

function AutoCheckbox<T extends FieldValues>({ name, label }: { name: Path<T>; label: string }) {
  const { control } = useFormContext<T>()
  return (
    <Controller name={name} control={control} render={({ field }) => (
      <label className="flex items-center gap-2.5 text-sm cursor-pointer">
        <input type="checkbox" checked={!!field.value}
               onChange={e => field.onChange(e.target.checked)}
               onBlur={field.onBlur} ref={field.ref}
               className="size-4 rounded border-gray-300 text-blue-600" />
        {label}
      </label>
    )} />
  )
}

// ─── Level 2: Molecules — section components
function AccountSection() {
  return (
    <div className="space-y-4">
      <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wide">Account</h3>
      <AutoTextField<ProfileSettings> name="displayName"     label="Display name" />
      <AutoTextField<ProfileSettings> name="email"           label="Email address" type="email" />
      <AutoTextField<ProfileSettings> name="currentPassword" label="Change password" type="password" />
    </div>
  )
}

function NotificationsSection() {
  return (
    <div className="space-y-3">
      <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wide">Notifications</h3>
      <AutoCheckbox<ProfileSettings> name="emailOnComment" label="Email me when someone comments" />
      <AutoCheckbox<ProfileSettings> name="emailOnMention" label="Email me when mentioned" />
      <AutoCheckbox<ProfileSettings> name="weeklyDigest"   label="Weekly digest summary" />
    </div>
  )
}

function FormActions() {
  const { formState: { isSubmitting, isDirty }, reset } = useFormContext()
  return (
    <div className="flex gap-3 pt-4 border-t">
      <button type="button" onClick={() => reset()} disabled={!isDirty}
              className="px-5 py-2.5 border rounded-xl text-sm font-semibold disabled:opacity-40">
        Discard
      </button>
      <button type="submit" disabled={isSubmitting || !isDirty}
              className="flex-1 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-semibold disabled:opacity-40">
        {isSubmitting ? 'Saving…' : 'Save settings'}
      </button>
    </div>
  )
}

// ─── Level 3: Organism — owns schema, state, submit
export function ProfileSettingsForm() {
  const methods = useForm<ProfileSettings>({
    resolver:      zodResolver(ProfileSchema),
    mode:          'onTouched',
    defaultValues: { displayName: 'Mark Austin', email: 'mark@example.com',
                     currentPassword: '', emailOnComment: true,
                     emailOnMention: true, weeklyDigest: false }
  })

  return (
    <FormProvider {...methods}>
      <form onSubmit={methods.handleSubmit(console.log)} className="max-w-sm space-y-8">
        <AccountSection />
        <div className="border-t" />
        <NotificationsSection />
        <FormActions />
      </form>
    </FormProvider>
  )
}
```

---

---

# 8 — Scalable Form Module Structure

---

## T — TL;DR

As forms grow, organise them into a **form module** — a folder containing the schema, types, field components, section components, and the form itself. Each form module is self-contained and independently testable. The schema is the entry point; everything else derives from it.

---

## K — Key Concepts

```
src/
  features/
    checkout/
      schema.ts           ← Zod schema + exported types
      use-checkout.ts     ← useForm hook (custom hook wrapping form logic)
      checkout-form.tsx   ← FormProvider + <form> (organism)
      sections/
        customer.tsx      ← CustomerSection (molecule)
        shipping.tsx      ← ShippingSection (molecule)
        payment.tsx       ← PaymentSection (molecule)
      index.ts            ← public API: export CheckoutForm

  components/
    ui/
      form/
        text-field.tsx    ← generic reusable atom
        select-field.tsx
        checkbox-field.tsx
        textarea-field.tsx
        index.ts
```

```ts
// features/checkout/schema.ts — entry point
import { z } from 'zod'

export const CheckoutSchema = z.object({
  customer: z.object({ name: z.string().min(1), email: z.string().email() }),
  shipping: z.object({ street: z.string().min(5), city: z.string(), zip: z.string() }),
  payment:  z.object({ last4: z.string().length(4), expiry: z.string() }),
  saveCard: z.boolean().default(false)
})

export type CheckoutForm    = z.infer<typeof CheckoutSchema>
export type CheckoutSection = keyof CheckoutForm
```

```ts
// features/checkout/use-checkout.ts — custom hook
import { useForm }     from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useRouter }   from 'next/navigation'
import { CheckoutSchema, CheckoutForm } from './schema'

export function useCheckoutForm() {
  const router = useRouter()

  const methods = useForm<CheckoutForm>({
    resolver:      zodResolver(CheckoutSchema),
    mode:          'onTouched',
    defaultValues: {
      customer: { name: '', email: '' },
      shipping: { street: '', city: '', zip: '' },
      payment:  { last4: '', expiry: '' },
      saveCard: false
    }
  })

  async function onSubmit(data: CheckoutForm) {
    await fetch('/api/checkout', { method: 'POST', body: JSON.stringify(data),
                                    headers: { 'Content-Type': 'application/json' } })
    router.push('/order-confirmed')
  }

  return { methods, onSubmit }
}
```

```tsx
// features/checkout/checkout-form.tsx — organism
'use client'
import { FormProvider }   from 'react-hook-form'
import { useCheckoutForm } from './use-checkout'
import { CustomerSection } from './sections/customer'
import { ShippingSection } from './sections/shipping'
import { PaymentSection }  from './sections/payment'

export function CheckoutForm() {
  const { methods, onSubmit } = useCheckoutForm()

  return (
    <FormProvider {...methods}>
      <form onSubmit={methods.handleSubmit(onSubmit)} className="space-y-8 max-w-lg">
        <CustomerSection />
        <ShippingSection />
        <PaymentSection />
        <button type="submit" disabled={methods.formState.isSubmitting}
                className="w-full py-3 bg-blue-600 text-white rounded-2xl
                            font-semibold disabled:opacity-50">
          {methods.formState.isSubmitting ? 'Processing…' : 'Complete checkout'}
        </button>
      </form>
    </FormProvider>
  )
}
```

```tsx
// features/checkout/sections/customer.tsx — molecule
'use client'
import { useFormContext }                       from 'react-hook-form'
import { TextField }                           from '@/components/ui/form'
import type { CheckoutForm }                   from '../schema'

export function CustomerSection() {
  return (
    <section className="space-y-4">
      <h2 className="text-lg font-bold text-gray-900">Customer details</h2>
      <TextField<CheckoutForm> name="customer.name"  label="Full name" />
      <TextField<CheckoutForm> name="customer.email" label="Email address" type="email" />
    </section>
  )
}
```

```ts
// features/checkout/index.ts — public API
export { CheckoutForm } from './checkout-form'
export { CheckoutSchema, type CheckoutForm as CheckoutFormType } from './schema'
// Consumers import from 'features/checkout' — internal structure hidden
```

---

## W — Why It Matters

- The **custom hook pattern** (`useCheckoutForm`) separates business logic (API calls, routing) from the form UI — the `CheckoutForm` component becomes a pure layout component that renders sections and provides context.
- The **public API pattern** (`features/checkout/index.ts`) hides the internal module structure — consumers import `CheckoutForm` without knowing whether it lives in `checkout-form.tsx` or `form.tsx`. Internal refactors don't break imports.
- The **schema as entry point** principle: when you open a form module, you read `schema.ts` first to understand what data the form collects — it's a machine-readable specification that also functions as documentation.

---

## I — Interview Q&A

### Q: How do you prevent a large form from becoming unmaintainable as requirements grow?

**A:** Three principles. First, extract the Zod schema to its own file — it's the contract, everything else depends on it. Second, separate the form logic (useForm, handleSubmit, API calls) into a custom hook — the form component becomes pure UI. Third, use `FormProvider` with section components so each group of fields lives in its own file, independently testable and replaceable. Adding a new section means creating one file and one line in the parent form. Removing a section means deleting one file and one line. The form component itself never needs to change for field-level changes.

---

## C — Common Pitfalls + Fix

### ❌ Putting everything in one file — form, schema, sections, submit logic

```tsx
// ❌ 300+ line file — schema, sections, API call, routing, field rendering all mixed
export function CheckoutForm() {
  const schema = z.object({ /* 20 fields */ })
  const { register, ... } = useForm({ resolver: zodResolver(schema) })
  async function onSubmit(data) {
    await fetch('/api/...')   // API call in component
    router.push('/success')   // routing in component
  }
  return (
    <form>
      {/* 80 lines of fields */}
    </form>
  )
}
```

**Fix:** Extract into a module:

```
checkout/
  schema.ts         ← z.object({...}) + type inference
  use-checkout.ts   ← useForm + handleSubmit + API call
  checkout-form.tsx ← FormProvider + sections (20 lines)
  sections/         ← individual section files
```

---

## K — Coding Challenge + Solution

### Challenge

Create a minimal but complete form module for a `CreateProjectForm` with: `schema.ts` (name, description, visibility enum, tags array), `use-create-project.ts` (custom hook with mock submit), `create-project-form.tsx` (FormProvider organism), one section `details.tsx`. Export from `index.ts`.

### Solution

```ts
// src/features/create-project/schema.ts
import { z } from 'zod'

export const CreateProjectSchema = z.object({
  name:        z.string().min(3, 'Min 3 characters').max(50),
  description: z.string().max(200).optional(),
  visibility:  z.enum(['public', 'private', 'team']).default('private'),
  tags:        z.array(z.string().min(1)).max(5).default([])
})

export type CreateProject = z.infer<typeof CreateProjectSchema>
```

```ts
// src/features/create-project/use-create-project.ts
import { useForm }              from 'react-hook-form'
import { zodResolver }          from '@hookform/resolvers/zod'
import { CreateProjectSchema, CreateProject } from './schema'

export function useCreateProject(onSuccess?: () => void) {
  const methods = useForm<CreateProject>({
    resolver:      zodResolver(CreateProjectSchema),
    mode:          'onTouched',
    defaultValues: { name: '', description: '', visibility: 'private', tags: [] }
  })

  async function onSubmit(data: CreateProject) {
    await new Promise(r => setTimeout(r, 800))  // mock API
    console.log('Created project:', data)
    methods.reset()
    onSuccess?.()
  }

  return { methods, onSubmit }
}
```

```tsx
// src/features/create-project/sections/details.tsx
'use client'
import { useFormContext }                         from 'react-hook-form'
import type { CreateProject }                     from '../schema'

export function DetailsSection() {
  const { register, formState: { errors } } = useFormContext<CreateProject>()
  const cls = 'w-full border rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500'
  const e   = (m?: string) => m ? <p className="text-xs text-red-600 mt-1">{m}</p> : null

  return (
    <section className="space-y-4">
      <h3 className="text-sm font-bold uppercase text-gray-500 tracking-wide">Project Details</h3>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1.5">Project name</label>
        <input {...register('name')} placeholder="My awesome project" className={cls} />
        {e(errors.name?.message)}
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1.5">Description</label>
        <textarea {...register('description')} rows={3} placeholder="What is this project about?" className={cls} />
        {e(errors.description?.message)}
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1.5">Visibility</label>
        <select {...register('visibility')} className={cls}>
          <option value="public">Public</option>
          <option value="private">Private</option>
          <option value="team">Team only</option>
        </select>
      </div>
    </section>
  )
}
```

```tsx
// src/features/create-project/create-project-form.tsx
'use client'
import { FormProvider }       from 'react-hook-form'
import { useCreateProject }   from './use-create-project'
import { DetailsSection }     from './sections/details'

export function CreateProjectForm({ onSuccess }: { onSuccess?: () => void }) {
  const { methods, onSubmit } = useCreateProject(onSuccess)
  const { isSubmitting, isDirty } = methods.formState

  return (
    <FormProvider {...methods}>
      <form onSubmit={methods.handleSubmit(onSubmit)} className="space-y-6 max-w-md">
        <DetailsSection />
        <div className="flex gap-3 pt-2 border-t">
          <button type="button" onClick={() => methods.reset()} disabled={!isDirty}
                  className="px-5 py-2.5 border rounded-xl text-sm font-semibold disabled:opacity-40">
            Reset
          </button>
          <button type="submit" disabled={isSubmitting || !isDirty}
                  className="flex-1 py-2.5 bg-blue-600 text-white rounded-xl text-sm
                              font-semibold disabled:opacity-40">
            {isSubmitting ? 'Creating…' : 'Create project'}
          </button>
        </div>
      </form>
    </FormProvider>
  )
}
```

```ts
// src/features/create-project/index.ts
export { CreateProjectForm }                         from './create-project-form'
export { CreateProjectSchema, type CreateProject }   from './schema'
export { useCreateProject }                          from './use-create-project'
```

---

## ✅ Day 5 Complete — Controlled Inputs and Reusable Form Architecture

| # | Subtopic | Status |
|---|----------|--------|
| 1 | `Controller` — When and Why | ☐ |
| 2 | `Controller` with Native Inputs | ☐ |
| 3 | `Controller` with Third-Party Components | ☐ |
| 4 | Reusable Field Wrapper Components | ☐ |
| 5 | `FormProvider` and `useFormContext` | ☐ |
| 6 | Nested Field Paths — Dot Notation and Objects | ☐ |
| 7 | Component Composition Patterns | ☐ |
| 8 | Scalable Form Module Structure | ☐ |

---

## 🗺️ One-Page Mental Model — Day 5

```
CONTROLLER vs REGISTER
  register('field')   → uncontrolled, native input ref, no re-render per keystroke
  Controller          → controlled, value+onChange props, re-render per change
  Use register:       <input> <select> <textarea> — native HTML
  Use Controller:     third-party components, char counters, custom pickers

CONTROLLER ANATOMY
  <Controller name="field" control={control} render={({ field, fieldState }) => ...} />
  field:       { name, value, onChange, onBlur, ref }
  fieldState:  { error, isDirty, isTouched, invalid }
  field.onChange(value)     → update RHF store
  field.onBlur()            → mark as touched
  field.ref                 → enables shouldFocusError

WIRING THIRD-PARTY COMPONENTS
  value      → field.value
  onChange   → field.onChange       (or onValueChange, onSelect — adapt as needed)
  onBlur     → field.onBlur         (or onClose — anything that fires when closed)
  ref        → field.ref            (on trigger/root element)
  error      → fieldState.error?.message

REUSABLE FIELD COMPONENTS
  Props: name: Path<T>, control: Control<T>, label: string
  Path<T>    → type-safe field names (TypeScript catches typos)
  Control<T> → ties component to specific form instance
  Internals: Controller + label + input + ARIA + error rendering

FORMPROVIDER + USEFORMCONTEXT
  FormProvider: <FormProvider {...methods}><form>...</form></FormProvider>
  useFormContext<T>(): same return value as useForm<T>() — inside any descendant
  No prop drilling — sections get register, control, errors from context
  Performance: same as normal RHF — proxy-based, no extra re-renders

  Context-aware fields (no control prop):
  const { control } = useFormContext<T>()  // inside field component
  <AutoTextField name="email" label="Email" />  // minimal props ✅

NESTED FIELD PATHS
  register('address.city')          → data.address.city
  register('items.0.name')          → data.items[0].name
  errors.address?.city?.message     → always use optional chaining
  defaultValues must be NESTED:     { address: { city: '' } }
  NOT flat keys:                    { 'address.city': '' } ← wrong

COMPOSITION LEVELS
  Level 1 — Field (atom):     TextField, SelectField, CheckboxField
                               → label + input + error + ARIA
  Level 2 — Section (molecule): AccountSection, ShippingSection
                               → useFormContext, renders fields
  Level 3 — Form (organism):  CheckoutForm
                               → schema, useForm, FormProvider, sections

FORM MODULE STRUCTURE
  features/my-form/
    schema.ts           → z.object + exported type
    use-my-form.ts      → useForm hook + onSubmit + API call
    my-form.tsx         → FormProvider + sections
    sections/           → one file per section
    index.ts            → public API

  Rule: schema.ts first → everything else derived from it
  Rule: business logic in custom hook, not in form component
  Rule: sections are presentational — no submit, no routing
```

> **Your next action:** Find any form with repeated `label + input + error` blocks. Extract a `<TextField>` component using `Controller`, accept `name: Path<T>` and `control: Control<T>`, move the label/error rendering inside. Replace every repeated block with one line. The form becomes a readable list of field names.
>
> *Doing one small thing beats opening a feed.*