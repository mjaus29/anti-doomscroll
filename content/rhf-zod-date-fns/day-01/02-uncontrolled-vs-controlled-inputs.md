# 2 — Uncontrolled vs Controlled Inputs

---

## T — TL;DR

**Uncontrolled inputs** store their value in the DOM — React reads it via a ref when needed. **Controlled inputs** store their value in React state — every keystroke updates state and triggers a re-render. RHF defaults to uncontrolled; use `Controller` only when a third-party component forces controlled mode.

---

## K — Key Concepts

```tsx
// ─── Uncontrolled (RHF default)
// Value lives in the DOM. React never "knows" it until submit or watch.
const { register } = useForm()
<input {...register('email')} />
// register() returns: { name, ref, onChange, onBlur }
// ref → RHF reads the DOM value at submit time
// onChange → updates RHF's internal store (not React state)

// ─── Controlled (React state owns the value)
const [email, setEmail] = useState('')
<input value={email} onChange={e => setEmail(e.target.value)} />
// Every character → setEmail → React re-render

// ─── When RHF re-renders your component:
// 1. On submit (success or error)
// 2. When formState.errors changes (new error or error cleared)
// 3. When you call watch() — opts into per-keystroke re-renders
// 4. When reset() or setValue() is called

// ─── Checking uncontrolled behaviour in DevTools:
// Add this to see re-render count:
let renders = 0
function MyForm() {
  renders++
  console.log('render count:', renders)  // stays at 1 while typing ✅
  const { register, handleSubmit } = useForm()
  return <form onSubmit={handleSubmit(console.log)}>
    <input {...register('name')} />
    <button type="submit">Submit</button>
  </form>
}
```

```tsx
// ─── When you MUST use controlled (third-party UI components)
// Base UI Select, custom date pickers, Slider — no native input element
// Use Controller wrapper (covered in Day 2)
import { Controller } from 'react-hook-form'

<Controller
  name="country"
  control={control}
  render={({ field }) => (
    <CustomSelect value={field.value} onChange={field.onChange} />
  )}
/>
```

---

## W — Why It Matters

- Understanding uncontrolled vs controlled is the **mental model foundation** for all of RHF. If you think RHF works like a controlled form, you'll fight it constantly.
- The distinction also explains why `watch()` should be used sparingly — calling `watch('field')` opts that field back into re-rendering on every change, undoing RHF's performance advantage for that field.
- `Controller` exists as a bridge for the ecosystem — Radix, Base UI, and most UI component libraries expose a `value`/`onChange` API, not a native input `ref`. `Controller` wraps these without sacrificing RHF's form-level state management.

---

## I — Interview Q&A

### Q: When would you use `Controller` instead of `register` in React Hook Form?

**A:** Use `register` for native HTML inputs (`<input>`, `<select>`, `<textarea>`) — RHF can attach a `ref` directly. Use `Controller` when the component doesn't expose a native input ref — third-party UI components like Base UI's `Select`, custom date pickers, or any component that only exposes `value` and `onChange` props. `Controller` wraps the component in a controlled adapter while keeping the field integrated with RHF's validation, error, and state management.

---

## C — Common Pitfalls + Fix

### ❌ Calling `watch()` on every field "just in case"

```tsx
// ❌ Opts every field into re-rendering per keystroke — defeats RHF's purpose
const values = watch() // watches ALL fields
```

**Fix:** Watch only what you need, only when you need it:

```tsx
// ✅ Watch one specific field (e.g. for conditional UI)
const country = watch('country')
// Or read once on demand without subscribing to re-renders:
const values = getValues()
```

---

## K — Coding Challenge + Solution

### Challenge

Build a form with a `country` select and a `city` text input that only shows when country is "PH". Use `watch` for the conditional — observe that only the conditional re-renders, not the whole form.

### Solution

```tsx
'use client'
import { useForm } from 'react-hook-form'

type Fields = { country: string; city: string }

export function ConditionalForm() {
  const { register, handleSubmit, watch } = useForm<Fields>()
  const country = watch('country')  // targeted watch — only this causes re-render

  return (
    <form onSubmit={handleSubmit(console.log)} className="space-y-4 max-w-sm">
      <select {...register('country')}
              className="w-full border rounded-lg px-3 py-2 text-sm">
        <option value="">Select country</option>
        <option value="PH">Philippines</option>
        <option value="US">United States</option>
      </select>

      {country === 'PH' && (
        <input {...register('city')} placeholder="City"
               className="w-full border rounded-lg px-3 py-2 text-sm" />
      )}

      <button type="submit"
              className="px-5 py-2 bg-blue-600 text-white rounded-lg text-sm font-semibold">
        Submit
      </button>
    </form>
  )
}
```

---

---
