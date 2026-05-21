# 5 — Form Accessibility — ARIA, Focus, Error Announcements

---

## T — TL;DR

Accessible forms need: labels linked to inputs (`htmlFor`/`id`), error messages linked via `aria-describedby`, `aria-invalid` on invalid inputs, a live region for error announcements, and focus management on submit. These patterns apply to every field component.

---

## K — Key Concepts

```tsx
// ─── Base accessible field pattern
function AccessibleField({ id, label, error, children }: {
  id: string; label: string; error?: string; children: React.ReactNode
}) {
  return (
    <div className="space-y-1.5">
      <label htmlFor={id} className="block text-sm font-medium text-gray-700">
        {label}
      </label>
      {children}
      {error && (
        <p id={`${id}-error`} role="alert" aria-live="polite"
           className="text-xs text-red-600">
          {error}
        </p>
      )}
    </div>
  )
}

// ─── Field with ARIA attributes
<AccessibleField id="email" label="Email address" error={errors.email?.message}>
  <input
    {...register('email')}
    id="email"
    type="email"
    aria-invalid={!!errors.email}
    aria-describedby={errors.email ? 'email-error' : undefined}
    aria-required
    className={`w-full border rounded-xl px-3 py-2 text-sm
      ${errors.email ? 'border-red-400' : 'border-gray-300'}`}
  />
</AccessibleField>
```

```tsx
// ─── Form-level error summary (screen reader focus target on submit)
function ErrorSummary({ errors }: { errors: FieldErrors }) {
  const messages = Object.entries(errors).flatMap(([field, error]) =>
    error?.message ? [{ field, message: error.message as string }] : []
  )
  if (messages.length === 0) return null

  return (
    <div role="alert" aria-live="assertive" tabIndex={-1}
         className="p-4 bg-red-50 border border-red-200 rounded-2xl space-y-1">
      <p className="text-sm font-semibold text-red-700">
        Please fix {messages.length} error{messages.length > 1 ? 's' : ''}:
      </p>
      <ul className="list-disc list-inside space-y-0.5">
        {messages.map(({ field, message }) => (
          <li key={field} className="text-sm text-red-600">{message}</li>
        ))}
      </ul>
    </div>
  )
}
```

```tsx
// ─── Focus management: move focus to error summary on submit failure
import { useRef } from 'react'
import { useForm } from 'react-hook-form'

function AccessibleForm() {
  const summaryRef = useRef<HTMLDivElement>(null)
  const { handleSubmit, formState: { errors } } = useForm({
    resolver: zodResolver(Schema)
  })

  function onInvalid() {
    // Move focus to error summary when form fails validation
    summaryRef.current?.focus()
  }

  return (
    <form onSubmit={handleSubmit(onValid, onInvalid)}>
      <div ref={summaryRef} tabIndex={-1}>
        <ErrorSummary errors={errors} />
      </div>
      {/* fields */}
    </form>
  )
}
// handleSubmit(onValid, onInvalid) — second arg is the invalid handler ✅
```

---

## W — Why It Matters

- `aria-invalid="true"` signals to screen readers that the field has an error — without it, visually impaired users hear only the label and value, not that validation failed.
- `aria-describedby` linking an input to its error paragraph means screen readers read the error message immediately after the field value when the user focuses the input — no need to hunt for the error.
- `handleSubmit(onValid, onInvalid)` with focus moved to the error summary on failure is the standard WCAG pattern — keyboard-only users get explicit feedback about which step failed.

---

## I — Interview Q&A

### Q: What ARIA attributes does an invalid form field need for full screen reader support?

**A:** Three attributes. `aria-invalid="true"` on the `<input>` — signals the field is in an error state. `aria-describedby="fieldId-error"` on the `<input>`, pointing to the error message element's `id` — screen readers read the error after the field value. `role="alert"` (or `aria-live="polite"`) on the error message paragraph — dynamically injected error messages are announced automatically when they appear. Without `aria-live`, messages added to the DOM after page load are silent to screen readers.

---

## C — Common Pitfalls + Fix

### ❌ Error message rendered without `id` — `aria-describedby` points to nothing

```tsx
// ❌ aria-describedby="email-error" but the error <p> has no id
<input aria-describedby="email-error" />
{errors.email && <p className="text-red-600">{errors.email.message}</p>}
// Screen reader can't find the referenced element ❌
```

**Fix:** Add matching `id` to the error element:

```tsx
// ✅
<input aria-invalid={!!errors.email} aria-describedby="email-error" />
{errors.email && (
  <p id="email-error" role="alert" className="text-xs text-red-600">
    {errors.email.message}
  </p>
)}
```

---

## K — Coding Challenge + Solution

### Challenge

Build a fully accessible `<A11yTextField>` that: links `label` → `input` via `htmlFor`/`id`, sets `aria-invalid`, links `aria-describedby` to error, uses `role="alert"` on error, accepts `required` and renders `aria-required`. Test with a `LoginForm`.

### Solution

```tsx
'use client'
import { Controller, Control, FieldValues, Path } from 'react-hook-form'
import { useId }                                   from 'react'

interface A11yTextFieldProps<T extends FieldValues> {
  name:        Path<T>
  control:     Control<T>
  label:       string
  type?:       string
  required?:   boolean
  placeholder?: string
}

export function A11yTextField<T extends FieldValues>({
  name, control, label, type = 'text', required, placeholder
}: A11yTextFieldProps<T>) {
  const uid = useId()
  const inputId = `${uid}-input`
  const errorId = `${uid}-error`

  return (
    <Controller name={name} control={control} render={({ field, fieldState }) => (
      <div className="space-y-1.5">
        <label htmlFor={inputId}
               className="block text-sm font-medium text-gray-700">
          {label}
          {required && <span aria-hidden="true" className="text-red-500 ml-1">*</span>}
        </label>
        <input
          {...field}
          id={inputId}
          type={type}
          placeholder={placeholder}
          aria-invalid={!!fieldState.error}
          aria-required={required}
          aria-describedby={fieldState.error ? errorId : undefined}
          className={`w-full border rounded-xl px-3 py-2.5 text-sm
                      focus:outline-none focus:ring-2
                      ${fieldState.error
                        ? 'border-red-400 focus:ring-red-400'
                        : 'border-gray-300 focus:ring-blue-500'}`}
        />
        {fieldState.error && (
          <p id={errorId} role="alert" aria-live="polite"
             className="text-xs text-red-600">
            {fieldState.error.message}
          </p>
        )}
      </div>
    )} />
  )
}
```

---

---
