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
