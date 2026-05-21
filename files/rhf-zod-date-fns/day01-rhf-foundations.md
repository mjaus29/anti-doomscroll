
# 📅 Day 1 — RHF Foundations (React Hook Form v7.74.0)

> **Goal:** Understand React Hook Form's architecture, wire up your first form, handle submission, and internalise the low-re-render mental model that makes RHF fast.
> **Format:** Each subtopic = 5–15 min. Do one. Stop. Come back.
> **Stack version:** react-hook-form v7.74.0 · React 19 · TypeScript 6

---

## 📋 Day 1 Subtopic Overview

| # | Subtopic | Time |
|---|----------|------|
| 1 | React Form Architecture — Why Forms Are Hard | 8 min |
| 2 | Uncontrolled vs Controlled Inputs | 10 min |
| 3 | `useForm` — Setup, Options, Return Values | 12 min |
| 4 | `register` — Registering Inputs and Options | 12 min |
| 5 | `handleSubmit` — Submit Lifecycle and Async | 10 min |
| 6 | Validation Modes — `onChange`, `onBlur`, `onSubmit` | 12 min |
| 7 | `defaultValues` — Static, Async, Reset Behaviour | 10 min |
| 8 | RHF's Low Re-render Mental Model | 10 min |

---

---

# 1 — React Form Architecture — Why Forms Are Hard

---

## T — TL;DR

Managing forms in React manually means tracking every keystroke in state, re-rendering on every change, and wiring validation by hand. RHF replaces all of that with a **ref-based, uncontrolled approach** — zero re-renders per keystroke by default.

---

## K — Key Concepts

```tsx
// ─── The problem: naive controlled form
// Every keystroke → setState → re-render of entire form tree
function NaiveForm() {
  const [name,  setName]  = useState('')
  const [email, setEmail] = useState('')
  const [pass,  setPass]  = useState('')

  // 3 state fields = 3 re-renders per character typed
  // 10-field form = 10 re-renders per character ❌

  return (
    <form onSubmit={e => { e.preventDefault(); /* validate manually */ }}>
      <input value={name}  onChange={e => setName(e.target.value)}  />
      <input value={email} onChange={e => setEmail(e.target.value)} />
      <input value={pass}  onChange={e => setPass(e.target.value)}  />
    </form>
  )
}

// ─── RHF approach: ref-based, no re-renders per keystroke
import { useForm } from 'react-hook-form'

function RHFForm() {
  const { register, handleSubmit } = useForm()

  // Inputs are uncontrolled — RHF reads values on submit via refs
  // Zero re-renders per keystroke ✅

  return (
    <form onSubmit={handleSubmit(data => console.log(data))}>
      <input {...register('name')}  />
      <input {...register('email')} />
      <input {...register('pass')}  />
    </form>
  )
}
```

```
RHF's architecture in one diagram:

  useForm()
    │
    ├── register('field')   → attaches ref + event handlers to native input
    ├── handleSubmit(fn)     → reads all refs on submit, runs validation
    ├── formState            → error messages, touched, dirty (isolated renders)
    └── watch/getValues      → opt-in value observation
```

---

## W — Why It Matters

- Controlled forms with `useState` cause the entire form tree to re-render on every keystroke. A 20-field form typing at 60 WPM generates ~600 re-renders/min.
- RHF's ref approach means **zero component re-renders** while typing — only validation errors and `formState` updates cause targeted re-renders.
- This matters in production: complex forms inside modals, multi-step wizards, or dashboards with sidebar state all benefit from isolated form rendering.

---

## I — Interview Q&A

### Q: Why is React Hook Form faster than a controlled form approach?

**A:** RHF uses uncontrolled inputs with React refs instead of `useState` for each field. Values live in the DOM, not in React state — so typing triggers no re-renders. Re-renders only happen when validation errors update `formState.errors`, which is a targeted, isolated update rather than a full form tree re-render.

---

## C — Common Pitfalls + Fix

### ❌ Mixing RHF with manual `useState` on the same input

```tsx
// ❌ Creates two sources of truth — RHF and useState fight each other
const [name, setName] = useState('')
<input {...register('name')} value={name} onChange={e => setName(e.target.value)} />
```

**Fix:** Let RHF own the input. If you need the value externally, use `watch('name')`.

---

## K — Coding Challenge + Solution

### Challenge
Convert a 3-field `useState`-based form to RHF. Log submitted data to console.

### Solution

```tsx
// src/components/basic-form.tsx
'use client'
import { useForm } from 'react-hook-form'

type Fields = { name: string; email: string; message: string }

export function BasicForm() {
  const { register, handleSubmit } = useForm<Fields>()

  return (
    <form onSubmit={handleSubmit(data => console.log(data))}
          className="space-y-4 max-w-sm">
      <input {...register('name')}    placeholder="Name"
             className="w-full border rounded-lg px-3 py-2 text-sm" />
      <input {...register('email')}   placeholder="Email"
             className="w-full border rounded-lg px-3 py-2 text-sm" />
      <textarea {...register('message')} placeholder="Message"
                className="w-full border rounded-lg px-3 py-2 text-sm" />
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

# 3 — `useForm` — Setup, Options, Return Values

---

## T — TL;DR

`useForm<T>()` initialises the form instance. Pass a generic type for full TypeScript inference. The most important options upfront: `defaultValues`, `mode` (validation timing), and `resolver` (for Zod schema validation on Day 2+).

---

## K — Key Concepts

```tsx
import { useForm } from 'react-hook-form'

// ─── Full type signature (simplified)
const {
  // Registration
  register,          // attach to native inputs
  control,           // pass to Controller for non-native inputs

  // Submission
  handleSubmit,      // wraps onSubmit — reads all values, runs validation

  // State
  formState,         // errors, isSubmitting, isDirty, isValid, touchedFields, dirtyFields

  // Values
  watch,             // subscribe to value changes (causes re-renders)
  getValues,         // read values without subscribing
  setValue,          // programmatically set a field value
  resetField,        // reset a single field

  // Form-level
  reset,             // reset entire form to defaultValues (or new values)
  setError,          // manually set an error (e.g. from server)
  clearErrors,       // clear one or all errors
  trigger,           // manually trigger validation
  setFocus,          // programmatically focus a field
} = useForm<FormData>({
  // ─── Options
  defaultValues: {   // initial values — also used by reset()
    name:  '',
    email: '',
    role:  'user'
  },

  mode: 'onBlur',    // when validation runs:
                     // 'onSubmit' (default) | 'onBlur' | 'onChange' | 'onTouched' | 'all'

  reValidateMode: 'onChange', // after first error, when to re-validate
                               // 'onChange' (default) | 'onBlur' | 'onSubmit'

  resolver: undefined, // zodResolver(schema) — covered on Day 2

  criteriaMode: 'firstError', // 'firstError' (default) | 'all'
                               // 'all' collects all errors per field
  shouldFocusError: true,      // auto-focus first error field on submit
})
```

```tsx
// ─── TypeScript integration — define your form shape
type LoginForm = {
  email:    string
  password: string
  remember: boolean
}

const { register, handleSubmit, formState: { errors } } = useForm<LoginForm>({
  defaultValues: { email: '', password: '', remember: false }
})

// Now register('email') is type-safe — only accepts keys of LoginForm
// errors.email is typed as FieldError | undefined
// errors.nonExistentField → TypeScript error ✅
```

---

## W — Why It Matters

- Passing the generic `useForm<T>()` gives you **full TypeScript inference** throughout — `register`, `errors`, `getValues`, `setValue` all become type-safe. Without it, everything is `any`.
- `defaultValues` is not just for showing initial data — it also controls what `reset()` restores the form to, powers `isDirty` comparison (current value vs default), and determines the initial `isValid` state for `mode: 'all'`.
- `shouldFocusError: true` (default) is an accessibility win — on submit with errors, focus jumps to the first invalid field automatically, helping keyboard users.

---

## I — Interview Q&A

### Q: What is the difference between `watch` and `getValues` in RHF?

**A:** `watch('field')` subscribes to a field's value and causes a re-render every time that field changes — used for reactive conditional UI. `getValues('field')` reads the current value from the internal store without subscribing — no re-render. Use `getValues` when you need a value in an event handler or callback where you don't need the component to re-render on every change (e.g. reading a value on a button click to pass to an API call).

---

## C — Common Pitfalls + Fix

### ❌ Destructuring `formState` directly destroys its proxy optimisation

```tsx
// ❌ Destructuring the whole formState before accessing properties
// breaks RHF's proxy — may cause unnecessary re-renders
const { formState } = useForm()
const { errors } = formState  // ✅ this is fine
// But:
const wholeState = { ...formState }  // ❌ spread breaks the proxy
```

**Fix:** Destructure specific properties directly:

```tsx
// ✅ Proxy-safe destructuring
const { formState: { errors, isSubmitting, isDirty } } = useForm<T>()
```

---

## K — Coding Challenge + Solution

### Challenge

Create a typed `useForm<LoginForm>` with `defaultValues`, extract `errors` and `isSubmitting` from `formState`, and disable the submit button while submitting.

### Solution

```tsx
'use client'
import { useForm } from 'react-hook-form'

type LoginForm = { email: string; password: string }

export function LoginForm() {
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting }
  } = useForm<LoginForm>({
    defaultValues: { email: '', password: '' },
    mode: 'onBlur'
  })

  async function onSubmit(data: LoginForm) {
    await new Promise(r => setTimeout(r, 1500)) // mock API
    console.log(data)
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 max-w-sm">
      <div>
        <input {...register('email', { required: 'Email is required' })}
               type="email" placeholder="Email"
               className="w-full border rounded-lg px-3 py-2 text-sm" />
        {errors.email && (
          <p className="text-xs text-red-600 mt-1">{errors.email.message}</p>
        )}
      </div>
      <div>
        <input {...register('password', { required: 'Password is required' })}
               type="password" placeholder="Password"
               className="w-full border rounded-lg px-3 py-2 text-sm" />
        {errors.password && (
          <p className="text-xs text-red-600 mt-1">{errors.password.message}</p>
        )}
      </div>
      <button type="submit" disabled={isSubmitting}
              className="w-full py-2.5 bg-blue-600 text-white rounded-lg text-sm
                          font-semibold disabled:opacity-50 disabled:cursor-wait">
        {isSubmitting ? 'Signing in…' : 'Sign in'}
      </button>
    </form>
  )
}
```

---

---

# 4 — `register` — Registering Inputs and Options

---

## T — TL;DR

`register('fieldName', options)` returns `{ name, ref, onChange, onBlur }` — spread onto a native input to connect it to RHF. The `options` object is where you define built-in validation rules: `required`, `minLength`, `maxLength`, `pattern`, `min`, `max`, `validate`.

---

## K — Key Concepts

```tsx
const { register } = useForm<FormData>()

// ─── What register() returns (spread onto input)
const result = register('email')
// result = {
//   name:     'email',           // input name attribute
//   ref:      (el) => { ... },   // attaches RHF's internal ref
//   onChange: (e) => { ... },    // updates RHF store, triggers validation
//   onBlur:   (e) => { ... },    // marks field as touched
// }

// Usage:
<input {...register('email')} type="email" />
// Equivalent to:
<input
  name="email"
  ref={result.ref}
  onChange={result.onChange}
  onBlur={result.onBlur}
  type="email"
/>
```

```tsx
// ─── Built-in validation options
<input {...register('email', {
  required:  'Email is required',           // string = custom message
  pattern: {
    value:   /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
    message: 'Invalid email address'
  },
  maxLength: { value: 100, message: 'Too long' },
})} />

<input {...register('age', {
  required: true,
  min:      { value: 18,  message: 'Must be 18+' },
  max:      { value: 120, message: 'Invalid age' },
  valueAsNumber: true,   // ← converts string to number automatically
})} type="number" />

<input {...register('website', {
  validate: (value) =>
    !value || value.startsWith('https://')
      ? true
      : 'Must start with https://'
})} />

// ─── Multiple custom validators
<input {...register('username', {
  required: 'Required',
  minLength: { value: 3, message: 'Min 3 chars' },
  validate: {
    noSpaces:    v => !/\s/.test(v)      || 'No spaces allowed',
    noNumbers:   v => !/\d/.test(v)      || 'No numbers allowed',
    available:   async v => {
      const taken = await checkUsername(v)
      return !taken || 'Username taken'
    }
  }
})} />
```

```tsx
// ─── Value transformation options
register('price',   { valueAsNumber: true })   // "12.5" → 12.5
register('dob',     { valueAsDate:   true })   // "2000-01-01" → Date object
register('checked', { setValueAs: v => v === 'true' }) // custom transform
```

---

## W — Why It Matters

- Built-in validators (`required`, `pattern`, `min`, `max`) cover 80% of form validation needs without importing Zod. For simple forms, `register` options are sufficient and keep the bundle smaller.
- `valueAsNumber: true` is the most commonly forgotten option — without it, `<input type="number">` returns a **string** from the DOM. RHF spreads `...register('age', { valueAsNumber: true })` to automatically parse it.
- `validate` supports `async` functions — you can hit an API endpoint (e.g. check if username is taken) as part of `register` validation, without any extra state management.

---

## I — Interview Q&A

### Q: What happens when you spread `register()` onto an input and also manually pass an `onChange`?

**A:** The manually passed `onChange` replaces RHF's `onChange` from the spread — RHF never gets notified of changes and the field won't validate or update. The correct fix is to use `register`'s `onChange` option to fire additional logic: `register('field', { onChange: (e) => yourCallback(e) })`, or call both explicitly: `const reg = register('field'); <input {...reg} onChange={e => { reg.onChange(e); yourCallback(e) }} />`.

---

## C — Common Pitfalls + Fix

### ❌ `type="number"` input returns a string without `valueAsNumber`

```tsx
// ❌ age will be "25" (string) not 25 (number) after submit
<input type="number" {...register('age')} />
```

**Fix:**

```tsx
// ✅ valueAsNumber converts DOM string to JS number
<input type="number" {...register('age', { valueAsNumber: true })} />
```

---

## K — Coding Challenge + Solution

### Challenge

Build a registration form with: `username` (required, min 3, no spaces), `age` (required, number, 18–99), `website` (optional, must start with `https://` if provided). Show individual field errors.

### Solution

```tsx
'use client'
import { useForm } from 'react-hook-form'

type Fields = { username: string; age: number; website: string }

export function RegistrationForm() {
  const { register, handleSubmit, formState: { errors } } = useForm<Fields>()

  const field = 'w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500'
  const err   = 'text-xs text-red-600 mt-1'

  return (
    <form onSubmit={handleSubmit(console.log)} className="space-y-4 max-w-sm">
      <div>
        <input {...register('username', {
          required:  'Username is required',
          minLength: { value: 3, message: 'Min 3 characters' },
          validate:  v => !/\s/.test(v) || 'No spaces allowed'
        })} placeholder="Username" className={field} />
        {errors.username && <p className={err}>{errors.username.message}</p>}
      </div>

      <div>
        <input {...register('age', {
          required:      'Age is required',
          valueAsNumber: true,
          min:           { value: 18, message: 'Must be 18+' },
          max:           { value: 99, message: 'Max age 99'  }
        })} type="number" placeholder="Age" className={field} />
        {errors.age && <p className={err}>{errors.age.message}</p>}
      </div>

      <div>
        <input {...register('website', {
          validate: v =>
            !v || v.startsWith('https://')
              ? true
              : 'Must start with https://'
        })} placeholder="Website (optional)" className={field} />
        {errors.website && <p className={err}>{errors.website.message}</p>}
      </div>

      <button type="submit"
              className="w-full py-2.5 bg-blue-600 text-white rounded-lg
                          text-sm font-semibold">
        Register
      </button>
    </form>
  )
}
```

---

---

# 5 — `handleSubmit` — Submit Lifecycle and Async

---

## T — TL;DR

`handleSubmit(onValid, onInvalid?)` wraps your submit handler — it calls `preventDefault`, runs all validation, and only calls `onValid` if the form passes. During async submission, `formState.isSubmitting` is `true`. Errors from the server can be set manually with `setError`.

---

## K — Key Concepts

```tsx
const { handleSubmit, setError, formState: { isSubmitting, errors } } = useForm<T>()

// ─── Basic signature
<form onSubmit={handleSubmit(onValid, onInvalid)}>

// onValid(data, event)    — called when ALL validation passes
// onInvalid(errors, event)— called when ANY validation fails (optional)
```

```tsx
// ─── Async submit with server error handling
async function onValid(data: FormData) {
  // isSubmitting = true while this function is running ✅
  try {
    await api.createUser(data)
    router.push('/dashboard')
  } catch (err) {
    if (err.code === 'EMAIL_TAKEN') {
      // Set server-side error on a specific field
      setError('email', {
        type:    'server',
        message: 'This email is already registered'
      })
      return
    }
    // Set a root-level error for non-field errors
    setError('root', {
      type:    'server',
      message: 'Something went wrong. Please try again.'
    })
  }
  // isSubmitting = false when this function returns/throws ✅
}

// ─── onInvalid — optional, runs when form has errors
function onInvalid(errors: FieldErrors<FormData>) {
  console.log('Validation failed:', errors)
  // Useful for: analytics (which fields fail most), scroll to first error
}
```

```tsx
// ─── Accessing root error
{errors.root && (
  <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">
    {errors.root.message}
  </div>
)}

// ─── formState flags during submit lifecycle
formState.isSubmitting      // true while handleSubmit's async fn is running
formState.isSubmitted       // true after first submit attempt
formState.isSubmitSuccessful// true after successful submit (no errors thrown)
formState.submitCount       // number of times form was submitted
```

---

## W — Why It Matters

- `handleSubmit` removes the boilerplate of `e.preventDefault()` and manual validation checks — it only calls your handler when the form is valid, so your submit function only contains the happy path logic.
- `setError('root', ...)` for server errors is the correct pattern — it keeps error state inside RHF instead of a separate `useState`, and it's automatically cleared when the user corrects input and re-submits.
- `isSubmitting` is automatic — it's `true` for the entire duration of your async `onValid` function, including awaited API calls. No manual `setLoading` state needed.

---

## I — Interview Q&A

### Q: How do you handle server-side validation errors in React Hook Form?

**A:** After a failed API call in the `handleSubmit` callback, call `setError('fieldName', { type: 'server', message: 'Error text' })`. This adds the error to `formState.errors` like a normal validation error. For non-field errors (e.g. "Service unavailable"), use `setError('root', { type: 'server', message: '...' })` and render `errors.root?.message` outside the field list. Both are cleared when the user resubmits or manually calls `clearErrors`.

---

## C — Common Pitfalls + Fix

### ❌ Calling the submit function directly instead of wrapping with `handleSubmit`

```tsx
// ❌ Bypasses validation and isSubmitting state
<form onSubmit={onSubmit}>

// ❌ Also wrong — calling directly in onClick
<button onClick={() => onSubmit()}>Submit</button>
```

**Fix:** Always use `handleSubmit`:

```tsx
// ✅ Validation runs, isSubmitting is managed
<form onSubmit={handleSubmit(onSubmit)}>
```

---

## K — Coding Challenge + Solution

### Challenge

Build a login form that: runs async submit (1s delay), shows `isSubmitting` spinner, simulates a server error ("Invalid credentials") on `onSubmit`, and displays a `root` error banner. Clears root error when user retypes.

### Solution

```tsx
'use client'
import { useForm } from 'react-hook-form'

type Fields = { email: string; password: string }

export function LoginWithServerError() {
  const {
    register, handleSubmit,
    setError, formState: { errors, isSubmitting }
  } = useForm<Fields>()

  async function onSubmit(data: Fields) {
    await new Promise(r => setTimeout(r, 1000))
    // Simulate wrong credentials
    setError('root', { type: 'server', message: 'Invalid email or password.' })
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 max-w-sm">
      {errors.root && (
        <div className="px-4 py-3 bg-red-50 border border-red-200 rounded-xl
                         text-sm text-red-700">
          {errors.root.message}
        </div>
      )}
      <input {...register('email',    { required: 'Required' })}
             type="email" placeholder="Email"
             className="w-full border rounded-lg px-3 py-2 text-sm" />
      <input {...register('password', { required: 'Required' })}
             type="password" placeholder="Password"
             className="w-full border rounded-lg px-3 py-2 text-sm" />
      <button type="submit" disabled={isSubmitting}
              className="w-full py-2.5 bg-blue-600 text-white rounded-lg
                          text-sm font-semibold disabled:opacity-50">
        {isSubmitting ? '⟳ Signing in…' : 'Sign in'}
      </button>
    </form>
  )
}
```

---

---

# 6 — Validation Modes — `onChange`, `onBlur`, `onSubmit`

---

## T — TL;DR

`mode` controls **when** validation first runs. `reValidateMode` controls **when** it runs again after a field has already shown an error. The right combination determines whether your form feels responsive or frustrating.

---

## K — Key Concepts

```tsx
// ─── The 5 modes
useForm({ mode: 'onSubmit'  }) // default — validate only on submit
useForm({ mode: 'onBlur'    }) // validate when field loses focus
useForm({ mode: 'onChange'  }) // validate on every keystroke
useForm({ mode: 'onTouched' }) // validate on blur, then switch to onChange
useForm({ mode: 'all'       }) // onChange + onBlur combined

// ─── reValidateMode (after error is shown, when to re-run)
useForm({
  mode:           'onBlur',   // first validation: on blur
  reValidateMode: 'onChange'  // after error shown: re-validate on every keystroke
})
```

```
Mode behaviour comparison:

mode:           First error shown when:
─────────────────────────────────────────
onSubmit        User clicks Submit
onBlur          User leaves the field
onChange        Every keystroke
onTouched       First time on blur, then on every change
all             Both blur AND change

Best practice recommendation:
  mode: 'onTouched'    → best UX: no error until user interacts,
                          then immediate feedback once they do
  reValidateMode: 'onChange' → error clears as soon as user fixes it
```

```tsx
// ─── Per-field mode override (register-level)
// There's no per-field mode — but you can use trigger() manually

// Example: validate a field programmatically after async check
const { trigger } = useForm({ mode: 'onSubmit' })

<input
  {...register('username')}
  onBlur={() => trigger('username')}  // manual trigger on blur only
/>

// ─── Checking formState.isValid
// Only accurate when mode !== 'onSubmit'
// With mode: 'onSubmit', isValid is false until first submit attempt
const { formState: { isValid } } = useForm({ mode: 'onChange' })
<button type="submit" disabled={!isValid}>Submit</button>
// ⚠️ Only do this with mode: 'onChange' or 'all'
// With mode: 'onSubmit', isValid is always false before first submit
```

---

## W — Why It Matters

- `mode: 'onSubmit'` (default) is best for simple forms where errors on every keystroke would be noisy. `mode: 'onTouched'` is best for longer forms where immediate feedback after blurring a field improves completion rates.
- The `mode` + `reValidateMode` combination is key: `mode: 'onBlur'` + `reValidateMode: 'onChange'` means errors appear after blur but clear in real-time as the user fixes them — the most common production UX pattern.
- Never disable the submit button with `disabled={!isValid}` when `mode: 'onSubmit'` — `isValid` will be `false` before the first submission attempt because no validation has run yet.

---

## I — Interview Q&A

### Q: What is the difference between `mode` and `reValidateMode` in `useForm`?

**A:** `mode` controls when validation runs for the **first time** on a field — before any error has been shown. `reValidateMode` controls when validation re-runs **after** a field has already shown an error. The common pattern is `mode: 'onBlur'` (show error when user leaves the field) + `reValidateMode: 'onChange'` (re-validate on every keystroke once the error is shown, so it clears in real time as the user fixes it). This gives the smoothest UX — no premature errors, but immediate feedback once the user has made a mistake.

---

## C — Common Pitfalls + Fix

### ❌ Using `disabled={!isValid}` with `mode: 'onSubmit'`

```tsx
// ❌ Button is always disabled before first submit — user can't submit
const { formState: { isValid } } = useForm({ mode: 'onSubmit' })
<button disabled={!isValid}>Submit</button>
```

**Fix:** Either switch to `mode: 'onChange'` or don't use `disabled={!isValid}` at all:

```tsx
// ✅ Only block on isSubmitting
<button disabled={isSubmitting}>Submit</button>

// ✅ Or use onChange mode if you want real-time validity
const form = useForm({ mode: 'onChange' })
```

---

## K — Coding Challenge + Solution

### Challenge

Build a password change form using `mode: 'onTouched'` + `reValidateMode: 'onChange'`. Fields: `current`, `next` (min 8), `confirm` (must match `next`). Show errors only after blur, clear in real-time on fix.

### Solution

```tsx
'use client'
import { useForm } from 'react-hook-form'

type Fields = { current: string; next: string; confirm: string }

export function PasswordChangeForm() {
  const {
    register, handleSubmit, watch,
    formState: { errors }
  } = useForm<Fields>({
    mode:           'onTouched',
    reValidateMode: 'onChange'
  })

  const nextPw = watch('next')
  const cls    = 'w-full border rounded-lg px-3 py-2 text-sm'
  const errCls = 'text-xs text-red-600 mt-1'

  return (
    <form onSubmit={handleSubmit(console.log)} className="space-y-4 max-w-sm">
      <div>
        <input {...register('current', { required: 'Required' })}
               type="password" placeholder="Current password" className={cls} />
        {errors.current && <p className={errCls}>{errors.current.message}</p>}
      </div>
      <div>
        <input {...register('next', {
          required:  'Required',
          minLength: { value: 8, message: 'Min 8 characters' }
        })} type="password" placeholder="New password" className={cls} />
        {errors.next && <p className={errCls}>{errors.next.message}</p>}
      </div>
      <div>
        <input {...register('confirm', {
          required: 'Required',
          validate: v => v === nextPw || 'Passwords do not match'
        })} type="password" placeholder="Confirm password" className={cls} />
        {errors.confirm && <p className={errCls}>{errors.confirm.message}</p>}
      </div>
      <button type="submit"
              className="w-full py-2.5 bg-blue-600 text-white rounded-lg text-sm font-semibold">
        Update password
      </button>
    </form>
  )
}
```

---

---

# 7 — `defaultValues` — Static, Async, Reset Behaviour

---

## T — TL;DR

`defaultValues` sets initial field values, powers `isDirty` comparison, and defines what `reset()` returns the form to. Pass a `Promise` for async defaults (e.g. fetching user data from an API). Always provide `defaultValues` for TypeScript forms — it prevents uncontrolled-to-controlled input warnings.

---

## K — Key Concepts

```tsx
// ─── Static defaultValues
useForm<ProfileForm>({
  defaultValues: {
    name:    'Mark',
    email:   'mark@example.com',
    role:    'admin',
    active:  true,
    score:   0
  }
})

// ─── Async defaultValues (fetch user data)
// RHF accepts a Promise — form is in loading state until resolved
useForm<ProfileForm>({
  defaultValues: async () => {
    const user = await fetch('/api/me').then(r => r.json())
    return {
      name:  user.name,
      email: user.email,
      role:  user.role
    }
  }
})
// While Promise is pending: formState.isLoading = true
// Once resolved: fields populate with fetched values
```

```tsx
// ─── reset() — restore to defaultValues or new values
const { reset, formState: { isDirty } } = useForm<T>({ defaultValues: {...} })

// Reset to original defaultValues:
reset()

// Reset to NEW values (e.g. after successful save):
reset({ name: updatedUser.name, email: updatedUser.email })

// Reset with options:
reset(undefined, {
  keepErrors:     false, // clear errors (default)
  keepDirty:      false, // reset dirty state
  keepValues:     false, // don't keep current values
  keepDefaultValues: false
})

// ─── isDirty — true when current values differ from defaultValues
// isDirty uses deep comparison — works with nested objects and arrays
console.log(isDirty)  // false initially, true when user changes anything
```

```tsx
// ─── Using reset after successful server save (common pattern)
async function onSubmit(data: ProfileForm) {
  const saved = await api.updateProfile(data)
  // Reset to saved values — marks form as clean again
  // isDirty becomes false ✅
  reset(saved)
}
```

---

## W — Why It Matters

- Without `defaultValues`, fields start as `undefined` — React warns about inputs switching from uncontrolled to controlled when values load. Providing defaults prevents this and ensures consistent initial state.
- `isDirty` only works correctly when `defaultValues` are set — RHF compares the current form value against `defaultValues` to determine dirtiness. Without defaults, everything is always "dirty".
- `reset(serverResponse)` after a successful save is the pattern for "save and continue editing" — it updates the baseline for `isDirty` tracking without clearing the form.

---

## I — Interview Q&A

### Q: How do you pre-populate a form with data from an API in React Hook Form?

**A:** Two approaches. Option 1: pass an async function to `defaultValues` — `useForm({ defaultValues: async () => fetch('/api/user').then(r => r.json()) })`. RHF waits for the promise and populates the form when resolved; `formState.isLoading` is `true` in the meantime. Option 2: fetch outside RHF and call `reset(data)` when data arrives — `useEffect(() => { if (user) reset(user) }, [user, reset])`. The second approach gives more control over loading state but requires care to call `reset` only when data is ready and not on every render.

---

## C — Common Pitfalls + Fix

### ❌ Calling `reset(data)` inside `useEffect` without the `reset` in deps

```tsx
// ❌ reset reference changes on every render if not memoised — ESLint warning
useEffect(() => { reset(userData) }, [userData]) // missing reset
```

**Fix:** Include `reset` in dependencies (it's stable — won't cause extra effects):

```tsx
// ✅ Include reset — it's a stable reference from RHF
useEffect(() => {
  if (userData) reset(userData)
}, [userData, reset])
```

---

## K — Coding Challenge + Solution

### Challenge

Build a `<ProfileEditForm>` that fetches user data via async `defaultValues`, shows `isLoading` state while loading, and calls `reset(savedData)` after submit so `isDirty` becomes false on success.

### Solution

```tsx
'use client'
import { useForm } from 'react-hook-form'

type Profile = { name: string; email: string; bio: string }

// Mock API fetch
const fetchProfile = (): Promise<Profile> =>
  new Promise(r => setTimeout(() =>
    r({ name: 'Mark Austin', email: 'mark@example.com', bio: 'Developer' })
  , 800))

export function ProfileEditForm() {
  const {
    register, handleSubmit, reset,
    formState: { errors, isSubmitting, isDirty, isLoading }
  } = useForm<Profile>({ defaultValues: fetchProfile })

  async function onSubmit(data: Profile) {
    await new Promise(r => setTimeout(r, 1000)) // mock save
    reset(data)  // update baseline — isDirty → false ✅
    console.log('Saved:', data)
  }

  if (isLoading) {
    return <p className="text-sm text-gray-500">Loading profile…</p>
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 max-w-sm">
      <input {...register('name',  { required: 'Required' })}
             placeholder="Name"
             className="w-full border rounded-lg px-3 py-2 text-sm" />
      <input {...register('email', { required: 'Required' })}
             type="email" placeholder="Email"
             className="w-full border rounded-lg px-3 py-2 text-sm" />
      <textarea {...register('bio')} placeholder="Bio"
                className="w-full border rounded-lg px-3 py-2 text-sm" />

      <div className="flex items-center gap-3">
        <button type="submit" disabled={isSubmitting || !isDirty}
                className="px-5 py-2.5 bg-blue-600 text-white rounded-lg
                            text-sm font-semibold disabled:opacity-50">
          {isSubmitting ? 'Saving…' : 'Save changes'}
        </button>
        {!isDirty && (
          <span className="text-xs text-green-600 font-medium">✓ Up to date</span>
        )}
      </div>
    </form>
  )
}
```

---

---

# 8 — RHF's Low Re-render Mental Model

---

## T — TL;DR

RHF uses an internal store (not React state) to track field values. Your component only re-renders when **`formState` properties you've subscribed to change** — not on every keystroke. This is powered by a JavaScript `Proxy` on `formState` that tracks which properties you access.

---

## K — Key Concepts

```
RHF's internal architecture:

  ┌──────────────────────────────────────────────┐
  │              useForm() internal store         │
  │                                               │
  │  _fields:    { name: ref, email: ref }        │  ← DOM refs (no React state)
  │  _formValues: { name: 'Mark', email: '' }     │  ← plain JS object
  │  _errors:    { email: FieldError }            │  ← triggers re-render on change
  │  _dirtyFields: { name: true }                 │  ← triggers re-render when accessed
  │                                               │
  └──────────────────────────────────────────────┘

  formState is a PROXY:
    - Accessing formState.errors   → subscribes to error changes
    - Accessing formState.isDirty  → subscribes to dirty changes
    - Accessing formState.isValid  → subscribes to validity changes
    - NOT accessing a property     → NO subscription, NO re-render for it
```

```tsx
// ─── Re-render experiment — add render counter
let count = 0
function MyForm() {
  count++

  const { register, handleSubmit, formState: { errors } } = useForm<T>()
  // ↑ We accessed ONLY errors from formState
  // ↑ So this component re-renders ONLY when errors change

  console.log('Renders:', count)
  // While typing: count stays at 1 ✅ (no re-render per keystroke)
  // On submit with errors: count goes to 2 (errors changed)
  // On submit success: count goes to 3 (errors cleared)

  return (
    <form onSubmit={handleSubmit(console.log)}>
      <input {...register('name', { required: 'Required' })} />
      {errors.name && <p>{errors.name.message}</p>}
      <button type="submit">Submit</button>
    </form>
  )
}
```

```tsx
// ─── What causes re-renders (and what doesn't)

// ✅ DOES cause re-render:
formState.errors       // when an error is added or removed
formState.isDirty      // when dirty state changes
formState.isSubmitting // when submit starts/ends
formState.isValid      // when validity changes (only with mode !== 'onSubmit')
watch('fieldName')     // every keystroke on that field

// ✅ Does NOT cause re-render:
register('field')      // just attaches ref
getValues('field')     // reads value without subscribing
handleSubmit(fn)       // just wraps the function

// ─── Isolating re-renders to child components
// Extract error display to a separate component — only that re-renders
function FieldError({ error }: { error?: FieldError }) {
  return error ? <p className="text-xs text-red-600">{error.message}</p> : null
}

// ─── FormProvider — share form instance without prop drilling
import { FormProvider, useFormContext } from 'react-hook-form'

function ParentForm() {
  const methods = useForm<T>()
  return (
    <FormProvider {...methods}>
      <form onSubmit={methods.handleSubmit(console.log)}>
        <ChildInput name="email" />  {/* accesses useFormContext() */}
        <button type="submit">Submit</button>
      </form>
    </FormProvider>
  )
}

function ChildInput({ name }: { name: string }) {
  const { register, formState: { errors } } = useFormContext()
  return <input {...register(name, { required: 'Required' })} />
}
```

---

## W — Why It Matters

- The Proxy-based subscription model is why RHF outperforms Formik (which re-renders on every change) in benchmark tests. In forms with 20+ fields or forms inside performance-critical dashboards, this difference is observable.
- `watch()` is the escape hatch for reactive values — use it deliberately. Each `watch` call subscribes that field to re-renders. In a 10-field form, `watch()` (all fields) causes 10 re-renders per character.
- `FormProvider` enables the component architecture pattern — large forms split into `<PersonalInfo />`, `<AddressSection />`, `<PaymentDetails />` sub-components, each using `useFormContext()` to access the shared form instance without prop drilling.

---

## I — Interview Q&A

### Q: How does React Hook Form minimise re-renders compared to Formik or a `useState`-based approach?

**A:** RHF stores field values in a plain JavaScript object and reads them via DOM refs — not React state. Keystrokes update the internal store but don't trigger `setState`, so no re-render occurs. The `formState` object is a JavaScript Proxy that tracks which properties your component accesses. Only when those specific properties change (e.g. `errors` when a new validation error appears) does RHF schedule a re-render. Formik stores all values in React state and calls `setState` on every change, causing re-renders on every keystroke. A 10-field Formik form renders ~10 times per character typed; the same form in RHF renders 0 times per character.

### Q: What does `FormProvider` do and when do you need it?

**A:** `FormProvider` is a React context provider that makes the `useForm` instance available to any descendant component via `useFormContext()`. Use it when a form is split across multiple components and you want to avoid passing `register`, `control`, and `formState` as props down multiple levels. It's particularly useful for wizard/multi-step forms where each step is a separate component, or for large forms split into logical sections.

---

## C — Common Pitfalls + Fix

### ❌ Spreading `formState` into a new object — breaks the Proxy

```tsx
// ❌ Spreading destroys the Proxy — RHF can't track which properties
//    you accessed, so it re-renders on ALL formState changes
const state = { ...formState }
const { errors } = state
```

**Fix:** Destructure directly from `formState`:

```tsx
// ✅ Proxy intact — only re-renders when errors changes
const { formState: { errors, isSubmitting } } = useForm<T>()
```

---

## K — Coding Challenge + Solution

### Challenge

Build a `<MultiSectionForm>` using `FormProvider` + `useFormContext` split across three child components: `<NameSection>`, `<ContactSection>`, `<SubmitSection>`. Prove the architecture works — submit logs all fields. Each section only re-renders when its own errors change.

### Solution

```tsx
// src/components/multi-section-form.tsx
'use client'
import { useForm, FormProvider, useFormContext } from 'react-hook-form'

type Fields = {
  firstName: string; lastName: string
  email: string;    phone: string
}

// ─── Child sections — access form via useFormContext
function NameSection() {
  const { register, formState: { errors } } = useFormContext<Fields>()
  return (
    <fieldset className="space-y-3 border rounded-xl p-4">
      <legend className="text-xs font-semibold text-gray-500 uppercase px-1">
        Name
      </legend>
      <input {...register('firstName', { required: 'Required' })}
             placeholder="First name"
             className="w-full border rounded-lg px-3 py-2 text-sm" />
      {errors.firstName && (
        <p className="text-xs text-red-600">{errors.firstName.message}</p>
      )}
      <input {...register('lastName',  { required: 'Required' })}
             placeholder="Last name"
             className="w-full border rounded-lg px-3 py-2 text-sm" />
      {errors.lastName && (
        <p className="text-xs text-red-600">{errors.lastName.message}</p>
      )}
    </fieldset>
  )
}

function ContactSection() {
  const { register, formState: { errors } } = useFormContext<Fields>()
  return (
    <fieldset className="space-y-3 border rounded-xl p-4">
      <legend className="text-xs font-semibold text-gray-500 uppercase px-1">
        Contact
      </legend>
      <input {...register('email', { required: 'Required' })}
             type="email" placeholder="Email"
             className="w-full border rounded-lg px-3 py-2 text-sm" />
      {errors.email && (
        <p className="text-xs text-red-600">{errors.email.message}</p>
      )}
      <input {...register('phone')} placeholder="Phone (optional)"
             className="w-full border rounded-lg px-3 py-2 text-sm" />
    </fieldset>
  )
}

function SubmitSection() {
  const { formState: { isSubmitting, isDirty } } = useFormContext<Fields>()
  return (
    <button type="submit" disabled={isSubmitting || !isDirty}
            className="w-full py-2.5 bg-blue-600 text-white rounded-lg
                        text-sm font-semibold disabled:opacity-50">
      {isSubmitting ? 'Submitting…' : 'Submit'}
    </button>
  )
}

// ─── Parent — provides form context
export function MultiSectionForm() {
  const methods = useForm<Fields>({
    defaultValues: { firstName: '', lastName: '', email: '', phone: '' },
    mode: 'onTouched'
  })

  return (
    <FormProvider {...methods}>
      <form onSubmit={methods.handleSubmit(data => console.log(data))}
            className="space-y-4 max-w-sm">
        <NameSection />
        <ContactSection />
        <SubmitSection />
      </form>
    </FormProvider>
  )
}
```

---

## ✅ Day 1 Complete — RHF Foundations

| # | Subtopic | Status |
|---|----------|--------|
| 1 | React Form Architecture | ☐ |
| 2 | Uncontrolled vs Controlled Inputs | ☐ |
| 3 | `useForm` — Setup, Options, Return Values | ☐ |
| 4 | `register` — Registering Inputs and Options | ☐ |
| 5 | `handleSubmit` — Submit Lifecycle and Async | ☐ |
| 6 | Validation Modes | ☐ |
| 7 | `defaultValues` — Static, Async, Reset | ☐ |
| 8 | Low Re-render Mental Model | ☐ |

---

## 🗺️ One-Page Mental Model — Day 1

```
ARCHITECTURE
  RHF = refs + internal store, NOT useState per field
  Typing → DOM only → no React re-render ✅
  Re-renders only when formState properties you accessed change

useForm<T>(options)
  defaultValues  → initial state, reset() target, isDirty baseline
  mode           → when first error shows (onSubmit | onBlur | onChange | onTouched | all)
  reValidateMode → after error shown, when to re-validate (onChange default)
  resolver       → Zod/Yup schema (Day 2)

register('field', rules)
  Returns: { name, ref, onChange, onBlur } → spread onto <input>
  Rules: required, min, max, minLength, maxLength, pattern, validate
  Transforms: valueAsNumber, valueAsDate, setValueAs
  validate: fn | { key: fn } — supports async

handleSubmit(onValid, onInvalid?)
  → preventDefault automatically
  → runs all validation
  → calls onValid only if valid
  → isSubmitting = true while onValid is running
  → setError('root', { message }) for server errors

formState (Proxy — only subscribe to what you access)
  errors          → field errors, errors.root for non-field errors
  isSubmitting    → true during async onValid
  isDirty         → current !== defaultValues (deep compare)
  isValid         → all valid (only live with mode !== 'onSubmit')
  isLoading       → true while async defaultValues resolves
  submitCount     → number of submit attempts

PATTERNS
  watch('field')        → reactive value, causes re-render per keystroke
  getValues('field')    → one-time read, no re-render
  reset(data)           → restore form + update isDirty baseline
  setError('field', {}) → inject server errors into formState
  FormProvider + useFormContext → share form across components
```

> **Your next action:** Open your project. Install `react-hook-form`. Convert one existing `useState` form to `useForm` + `register` + `handleSubmit`. Add `mode: 'onTouched'` and watch the UX improve immediately.
>
> *Doing one small thing beats opening a feed.*