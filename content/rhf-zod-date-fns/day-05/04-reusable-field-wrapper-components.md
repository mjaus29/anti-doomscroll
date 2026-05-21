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
