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
