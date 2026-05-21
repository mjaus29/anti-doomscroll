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
