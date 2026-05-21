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
