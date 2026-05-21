
# 📅 Day 8 — Advanced Validation and Production Patterns

> **Goal:** Move beyond basic forms into production-grade patterns — layered validation, async checks, create/edit flows, accessibility, performance, and testing. Everything that makes a form ship-ready.
> **Format:** Each subtopic = 5–15 min. Do one. Stop. Come back.
> **Stack:** react-hook-form v7.74.0 · zod v4.3.6 · date-fns v4.1.0 · TypeScript 6

---

## 📋 Day 8 Subtopic Overview

| # | Subtopic | Time |
|---|----------|------|
| 1 | Advanced `refine` and `superRefine` — Chaining, Abort-Early, Conditional Issues | 12 min |
| 2 | Cross-field and Date-Range Validation Patterns | 12 min |
| 3 | Async Validation — Debounced Server Checks | 12 min |
| 4 | Create vs Edit Flows — Schema Variants and API Hydration | 12 min |
| 5 | Form Accessibility — ARIA, Focus, Error Announcements | 10 min |
| 6 | Performance Tuning — Re-render Control | 12 min |
| 7 | Testing Strategies — What to Test in RHF + Zod Forms | 12 min |
| 8 | Discriminated Union Caveats, Refined Schemas, and Date Interval Edge Cases | 12 min |

---

---

# 1 — Advanced `refine` and `superRefine`

---

## T — TL;DR

`.refine` adds one conditional rule. `.superRefine` gives full control — add multiple issues, choose error codes, target multiple field paths, and abort early with `z.NEVER` to stop subsequent validations. Chain multiple `.refine` calls to run independent rules in parallel.

---

## K — Key Concepts

```ts
import { z } from 'zod'

// ─── Chaining .refine — all rules run independently
const PasswordSchema = z.string()
  .min(8, 'Minimum 8 characters')
  .refine(v => /[A-Z]/.test(v), 'Needs an uppercase letter')
  .refine(v => /\d/.test(v),    'Needs a number')
  .refine(v => /[^A-Za-z\d]/.test(v), 'Needs a special character')
// All three refines run — user sees all failures at once ✅

// ─── superRefine — multiple issues, multiple paths, one function
const SignupSchema = z.object({
  username: z.string().min(3),
  password: z.string().min(8),
  confirm:  z.string()
}).superRefine((data, ctx) => {
  if (data.password !== data.confirm) {
    ctx.addIssue({
      code:    z.ZodIssueCode.custom,
      message: 'Passwords do not match',
      path:    ['confirm']
    })
  }
  if (data.username === data.password) {
    ctx.addIssue({
      code:    z.ZodIssueCode.custom,
      message: 'Password cannot be the same as username',
      path:    ['password']
    })
  }
})
```

```ts
// ─── Abort early — stop validation if a critical rule fails
// Use ctx.addIssue + return z.NEVER to prevent subsequent checks
const CriticalSchema = z.string().superRefine((val, ctx) => {
  if (!val.trim()) {
    ctx.addIssue({
      code:    z.ZodIssueCode.custom,
      message: 'Value is required'
    })
    return z.NEVER  // stop — don't run further refinements
  }
  // Only runs if value is non-empty
  if (val.length < 3) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Min 3 characters' })
  }
})

// ─── Conditional issue — add only when another field has a specific value
const FormSchema = z.object({
  hasVoucher:  z.boolean(),
  voucherCode: z.string().optional()
}).superRefine((data, ctx) => {
  if (data.hasVoucher && !data.voucherCode?.trim()) {
    ctx.addIssue({
      code:    z.ZodIssueCode.custom,
      message: 'Voucher code is required when voucher is enabled',
      path:    ['voucherCode']
    })
  }
})

// ─── Custom ZodIssueCode options
z.ZodIssueCode.custom          // generic custom error
z.ZodIssueCode.too_small       // for min-length issues (structured)
z.ZodIssueCode.invalid_enum_value
z.ZodIssueCode.not_multiple_of
```

---

## W — Why It Matters

- Chaining `.refine` shows all failures simultaneously — users see "needs uppercase AND a number AND a special character" in one submit, not one error at a time. Better UX for complex password rules.
- `return z.NEVER` inside `superRefine` prevents downstream rules from running on invalid data — e.g. don't check format if value is empty. Without it, users see cascading irrelevant errors.
- Targeting different paths from one `superRefine` (e.g. `password` AND `confirm`) is only possible with `superRefine` — `.refine` produces one issue at one path per call.

---

## I — Interview Q&A

### Q: What does `return z.NEVER` do inside `superRefine`?

**A:** It signals Zod to abort processing of that schema — any subsequent `.transform()` or `.refine()` calls won't run for that value. Use it after adding a critical issue to prevent cascading irrelevant errors. For example, if a field is empty, return `z.NEVER` to stop checking format rules that would fail on an empty string with confusing messages. Without `return z.NEVER`, Zod runs all subsequent refinements regardless of earlier failures.

---

## C — Common Pitfalls + Fix

### ❌ Forgetting to `return z.NEVER` after a critical issue — cascading errors

```ts
// ❌ Without z.NEVER, format check runs on empty string
z.string().superRefine((val, ctx) => {
  if (!val) ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Required' })
  // No return z.NEVER — next check runs on ''
  if (!/^\d+$/.test(val)) ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Must be numeric' })
  // Shows BOTH 'Required' AND 'Must be numeric' for an empty field ❌
})
```

**Fix:**

```ts
// ✅
z.string().superRefine((val, ctx) => {
  if (!val) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Required' })
    return z.NEVER  // stops here
  }
  if (!/^\d+$/.test(val))
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Must be numeric' })
})
```

---

## K — Coding Challenge + Solution

### Challenge

Build a `RegistrationSchema` with `superRefine` that: (1) confirms password match, (2) rejects username === password, (3) rejects phone formats like "+1 (555) 123-4567" only after checking phone is non-empty (abort-early pattern). Show all errors simultaneously.

### Solution

```ts
import { z } from 'zod'

const RegistrationSchema = z.object({
  username: z.string().min(3, 'Min 3 characters'),
  email:    z.string().email('Invalid email'),
  password: z.string().min(8, 'Min 8 characters')
    .refine(v => /[A-Z]/.test(v), 'Needs uppercase')
    .refine(v => /\d/.test(v),    'Needs a number'),
  confirm:  z.string(),
  phone:    z.string().optional()
})
.superRefine((data, ctx) => {
  // Rule 1: password match
  if (data.password !== data.confirm) {
    ctx.addIssue({ code: z.ZodIssueCode.custom,
      message: 'Passwords do not match', path: ['confirm'] })
  }
  // Rule 2: username ≠ password
  if (data.username === data.password) {
    ctx.addIssue({ code: z.ZodIssueCode.custom,
      message: 'Password cannot match username', path: ['password'] })
  }
  // Rule 3: phone format — abort early if empty
  if (data.phone !== undefined && data.phone !== '') {
    if (!data.phone.trim()) {
      ctx.addIssue({ code: z.ZodIssueCode.custom,
        message: 'Phone cannot be blank if provided', path: ['phone'] })
      return z.NEVER
    }
    if (!/^\+?[\d\s\-()]{7,15}$/.test(data.phone)) {
      ctx.addIssue({ code: z.ZodIssueCode.custom,
        message: 'Invalid phone format', path: ['phone'] })
    }
  }
})

// All rules run — password + username + phone errors shown together
const result = RegistrationSchema.safeParse({
  username: 'mark', email: 'mark@example.com',
  password: 'Mark1234', confirm: 'Mark1235', // mismatch
  phone: 'not-a-phone'
})
console.log(result.error?.issues.map(i => `${i.path.join('.')}: ${i.message}`))
// ['confirm: Passwords do not match', 'phone: Invalid phone format']
```

---

---

# 2 — Cross-field and Date-Range Validation Patterns

---

## T — TL;DR

Cross-field validation compares two or more fields — password confirm, date ranges, budget limits. Always place cross-field rules on the **object schema** (not individual fields) so Zod has access to all values. Use `isBefore`/`isAfter` from date-fns for date comparisons.

---

## K — Key Concepts

```ts
import { z }                           from 'zod'
import { isBefore, isAfter, isFuture,
         differenceInDays, addDays }   from 'date-fns'

// ─── Pattern 1: simple two-field comparison
const DateRangeSchema = z.object({
  startDate: z.coerce.date(),
  endDate:   z.coerce.date()
})
.refine(d => isAfter(d.endDate, d.startDate), {
  message: 'End must be after start',
  path:    ['endDate']
})

// ─── Pattern 2: multiple date + business rules chained
const BookingSchema = z.object({
  checkIn:   z.coerce.date(),
  checkOut:  z.coerce.date(),
  maxNights: z.number().default(14)
})
.refine(d => isFuture(d.checkIn), {
  message: 'Check-in must be in the future', path: ['checkIn']
})
.refine(d => isAfter(d.checkOut, d.checkIn), {
  message: 'Check-out must be after check-in', path: ['checkOut']
})
.refine(d => differenceInDays(d.checkOut, d.checkIn) <= d.maxNights, {
  message: `Cannot exceed ${14} nights`, path: ['checkOut']
})
.refine(d => differenceInDays(d.checkOut, d.checkIn) >= 1, {
  message: 'Minimum 1 night stay', path: ['checkOut']
})
```

```ts
// ─── Pattern 3: budget cross-field
const BudgetSchema = z.object({
  totalBudget: z.number().positive(),
  designCost:  z.number().nonnegative(),
  devCost:     z.number().nonnegative(),
  qaaCost:     z.number().nonnegative()
})
.superRefine((d, ctx) => {
  const allocated = d.designCost + d.devCost + d.qaaCost
  if (allocated > d.totalBudget) {
    ctx.addIssue({
      code:    z.ZodIssueCode.custom,
      message: `Allocated $${allocated} exceeds total budget $${d.totalBudget}`,
      path:    ['totalBudget']
    })
  }
})

// ─── Pattern 4: min date relative to another field
const TravelSchema = z.object({
  departDate:  z.coerce.date(),
  returnDate:  z.coerce.date(),
  tripType:    z.enum(['one-way', 'round-trip'])
})
.superRefine((d, ctx) => {
  if (d.tripType === 'round-trip') {
    if (!isAfter(d.returnDate, d.departDate)) {
      ctx.addIssue({ code: z.ZodIssueCode.custom,
        message: 'Return must be after departure', path: ['returnDate'] })
    }
    if (differenceInDays(d.returnDate, d.departDate) > 365) {
      ctx.addIssue({ code: z.ZodIssueCode.custom,
        message: 'Trip cannot exceed 1 year', path: ['returnDate'] })
    }
  }
})
```

---

## W — Why It Matters

- Date comparisons directly on `Date` objects with `>` or `<` work by millisecond timestamp — but `isAfter(a, b)` communicates intent and handles edge cases (same millisecond). Readability matters in validation code that other developers maintain.
- Chaining multiple `.refine` calls on the same object schema means all rules run — a booking form shows "must be future" AND "minimum 1 night" errors simultaneously on first submit, instead of one at a time.
- `superRefine` for budget allocation lets you include dynamic values (computed totals) in the error message — `.refine` can only return true/false and a static string.

---

## I — Interview Q&A

### Q: Why do cross-field validation rules go on the object schema and not on individual field schemas?

**A:** Individual field schemas (`z.string()`, `z.coerce.date()`) validate in isolation — they receive only their own value. Cross-field rules need access to multiple values simultaneously. By placing `.refine()` or `.superRefine()` on `z.object({...})`, the validation function receives the entire object as its first argument, so `data.startDate` and `data.endDate` are both available. The `path` option on the refine then specifies which field's error message the issue should appear on in the form UI.

---

## C — Common Pitfalls + Fix

### ❌ Placing cross-field validation on an individual field schema

```ts
// ❌ z.coerce.date() validates in isolation — no access to other fields
const Schema = z.object({
  startDate: z.coerce.date(),
  endDate:   z.coerce.date().refine(
    end => end > startDate,  // ← startDate is not in scope here
    'Must be after start'
  )
})
```

**Fix:** Move the cross-field refine to the object schema:

```ts
// ✅ Object-level refine has access to all fields
const Schema = z.object({
  startDate: z.coerce.date(),
  endDate:   z.coerce.date()
}).refine(d => isAfter(d.endDate, d.startDate), {
  message: 'End must be after start', path: ['endDate']
})
```

---

## K — Coding Challenge + Solution

### Challenge

Build a `ProjectBidSchema` — `bidDeadline` (future date), `projectStart` (after deadline), `projectEnd` (after start, max 90 days duration), `budgetMin`/`budgetMax` (max >= min). All cross-field with date-fns. Show all errors at once.

### Solution

```ts
import { z }              from 'zod'
import { isAfter, isFuture, differenceInDays } from 'date-fns'

const ProjectBidSchema = z.object({
  title:        z.string().min(3),
  bidDeadline:  z.coerce.date(),
  projectStart: z.coerce.date(),
  projectEnd:   z.coerce.date(),
  budgetMin:    z.coerce.number().positive(),
  budgetMax:    z.coerce.number().positive()
})
.refine(d => isFuture(d.bidDeadline), {
  message: 'Deadline must be in the future', path: ['bidDeadline']
})
.refine(d => isAfter(d.projectStart, d.bidDeadline), {
  message: 'Project must start after bid deadline', path: ['projectStart']
})
.refine(d => isAfter(d.projectEnd, d.projectStart), {
  message: 'End must be after start', path: ['projectEnd']
})
.refine(d => differenceInDays(d.projectEnd, d.projectStart) <= 90, {
  message: 'Project duration cannot exceed 90 days', path: ['projectEnd']
})
.refine(d => d.budgetMax >= d.budgetMin, {
  message: 'Max budget must be ≥ min budget', path: ['budgetMax']
})

const result = ProjectBidSchema.safeParse({
  title: 'App Redesign', bidDeadline: '2026-02-01',
  projectStart: '2026-01-01',  // ← before deadline
  projectEnd:   '2026-05-15',  // ← >90 days
  budgetMin: 5000, budgetMax: 3000  // ← max < min
})
console.log(result.error?.issues.map(i => `${i.path[0]}: ${i.message}`))
// ['projectStart: ...', 'projectEnd: ...', 'budgetMax: ...']
```

---

---

# 3 — Async Validation — Debounced Server Checks

---

## T — TL;DR

Async validation checks uniqueness or existence against a server — email taken, username available, coupon valid. Use `setError` + a debounced `useEffect` (not `zodResolver`) for real-time feedback. Use async `.refine` in the schema for submit-time server validation. Never block typing with synchronous server calls.

---

## K — Key Concepts

```tsx
// ─── Strategy 1: debounced useEffect + setError (best for real-time UX)
import { useForm }   from 'react-hook-form'
import { useEffect, useRef } from 'react'

function SignupForm() {
  const { register, watch, setError, clearErrors, formState: { errors } } = useForm({
    defaultValues: { username: '' }
  })

  const username = watch('username')

  useEffect(() => {
    if (username.length < 3) return

    const id = setTimeout(async () => {
      const taken = await checkUsernameAvailability(username)
      if (taken) {
        setError('username', { type: 'manual', message: 'Username is already taken' })
      } else {
        clearErrors('username')
      }
    }, 500)  // 500ms debounce

    return () => clearTimeout(id)
  }, [username, setError, clearErrors])

  return (
    <div>
      <input {...register('username')} />
      {errors.username?.type === 'manual' && (
        <p className="text-xs text-red-600">{errors.username.message}</p>
      )}
      {!errors.username && username.length >= 3 && (
        <p className="text-xs text-green-600">✓ Username available</p>
      )}
    </div>
  )
}
```

```ts
// ─── Strategy 2: async .refine in Zod schema (submit-time validation)
// zodResolver calls safeParseAsync automatically — async refine works
const AsyncEmailSchema = z.object({
  email: z.string().email()
}).refine(
  async data => {
    const exists = await fetch(`/api/check-email?email=${data.email}`)
      .then(r => r.json()).then(d => d.exists)
    return !exists
  },
  { message: 'Email is already registered', path: ['email'] }
)

// zodResolver handles async schemas automatically — no special config
useForm({ resolver: zodResolver(AsyncEmailSchema) })
```

```tsx
// ─── Strategy 3: validate in onSubmit — server confirms uniqueness
async function onSubmit(data: FormType) {
  const res = await api.post('/signup', data)
  if (res.status === 409) {
    // Set server-returned field errors
    setError('email', { type: 'server', message: 'Email already registered' })
    return
  }
  router.push('/dashboard')
}

// ─── When to use each:
// debounced useEffect: real-time availability indicator (username, slug)
// async .refine:       submit-time uniqueness validation (email on signup)
// setError in onSubmit: server validation errors after API call
```

---

## W — Why It Matters

- Async validation in `.refine` without debouncing fires a server request on every schema parse — on a `mode: 'onChange'` form this means a server request per keystroke. Always debounce in the UI with `useEffect` + `setTimeout` for real-time checks.
- `setError('field', { type: 'server', ... })` preserves RHF's error type metadata — downstream code can distinguish between schema errors (`zodResolver`) and server errors (`'server'` type) for different UI treatments.
- `zodResolver` calls `safeParseAsync` internally when the schema has async refinements — there's no extra configuration needed. The resolver auto-detects async schemas.

---

## I — Interview Q&A

### Q: How do you implement real-time username availability checking without spamming the server?

**A:** Watch the username field with `watch('username')` (or `useWatch`). In a `useEffect` with the username as a dependency, set a `setTimeout` for 400–600ms before making the API call, and clear it on the cleanup function. This debounces the check — the server only gets called when the user stops typing for 500ms. On the response, use `setError` to set a manual error or `clearErrors` to clear it. This pattern is separate from `zodResolver` — it runs as a side effect, not as part of schema validation.

---

## C — Common Pitfalls + Fix

### ❌ Async validation in zodResolver without debounce — server hit per keystroke

```ts
// ❌ With mode: 'onChange', this fires a server request every keystroke
const Schema = z.object({ username: z.string().refine(
  async v => !(await checkTaken(v)), 'Taken'
)})
useForm({ resolver: zodResolver(Schema), mode: 'onChange' })
```

**Fix:** Separate real-time UX (debounced `useEffect`) from submit-time validation (async `.refine`):

```ts
// ✅ Async refine in schema = submit-time check only
// ✅ Debounced useEffect = real-time availability indicator
useForm({ resolver: zodResolver(Schema), mode: 'onSubmit' })
// + debounced useEffect for live feedback
```

---

## K — Coding Challenge + Solution

### Challenge

Build a `SlugField` component: validates a project slug (alphanumeric + hyphens, min 3), debounces availability check to server (mocked), shows "checking…" / "available ✓" / "taken ✗" indicator alongside the field error. Uses `setError` / `clearErrors`.

### Solution

```tsx
'use client'
import { useEffect, useState } from 'react'
import { useForm }             from 'react-hook-form'
import { zodResolver }         from '@hookform/resolvers/zod'
import { z }                   from 'zod'

const Schema = z.object({
  projectName: z.string().min(2, 'Required'),
  slug:        z.string()
                .min(3, 'Min 3 characters')
                .regex(/^[a-z0-9-]+$/, 'Only lowercase letters, numbers, hyphens')
})
type F = z.infer<typeof Schema>

// Mock server check
async function checkSlugAvailable(slug: string): Promise<boolean> {
  await new Promise(r => setTimeout(r, 300))
  return !['my-project', 'test-app', 'demo'].includes(slug)
}

export function CreateProjectForm() {
  const { register, watch, handleSubmit,
          setError, clearErrors, formState: { errors } } = useForm<F>({
    resolver:      zodResolver(Schema),
    defaultValues: { projectName: '', slug: '' }
  })

  const slug                            = watch('slug')
  const [slugStatus, setSlugStatus]     = useState<'idle'|'checking'|'available'|'taken'>('idle')

  useEffect(() => {
    if (!slug || slug.length < 3 || !/^[a-z0-9-]+$/.test(slug)) {
      setSlugStatus('idle')
      return
    }
    setSlugStatus('checking')
    const id = setTimeout(async () => {
      const available = await checkSlugAvailable(slug)
      if (available) {
        clearErrors('slug')
        setSlugStatus('available')
      } else {
        setError('slug', { type: 'manual', message: 'Slug is already taken' })
        setSlugStatus('taken')
      }
    }, 500)
    return () => clearTimeout(id)
  }, [slug, setError, clearErrors])

  const cls = 'w-full border rounded-xl px-3 py-2 text-sm'

  return (
    <form onSubmit={handleSubmit(console.log)} className="space-y-4 max-w-sm">
      <input {...register('projectName')} placeholder="Project name" className={cls} />
      {errors.projectName && <p className="text-xs text-red-600">{errors.projectName.message}</p>}

      <div className="space-y-1">
        <div className="relative">
          <input {...register('slug')} placeholder="project-slug" className={cls} />
          <span className="absolute right-3 top-2.5 text-xs">
            {slugStatus === 'checking'  && <span className="text-gray-400">checking…</span>}
            {slugStatus === 'available' && <span className="text-green-600">✓</span>}
            {slugStatus === 'taken'     && <span className="text-red-500">✗</span>}
          </span>
        </div>
        {errors.slug && <p className="text-xs text-red-600">{errors.slug.message}</p>}
      </div>

      <button type="submit"
              className="w-full py-2.5 bg-blue-600 text-white rounded-xl text-sm font-semibold">
        Create project
      </button>
    </form>
  )
}
```

---

---

# 4 — Create vs Edit Flows — Schema Variants and API Hydration

---

## T — TL;DR

Create and edit forms share field definitions but differ in defaults and required fields. Derive edit schemas from create schemas (`.partial()` for optional id). Hydrate edit form `defaultValues` from API responses — converting ISO strings to form-compatible formats. Use `reset()` when data loads asynchronously.

---

## K — Key Concepts

```ts
// ─── Schema variants for create vs edit
import { z } from 'zod'

const PostBaseSchema = z.object({
  title:     z.string().min(3, 'Min 3 characters').max(100),
  body:      z.string().min(10, 'Min 10 characters'),
  tags:      z.array(z.string()).max(5).default([]),
  published: z.boolean().default(false)
})

// Create: no id (server generates it)
export const CreatePostSchema = PostBaseSchema

// Edit: same fields + id required for PUT/PATCH route
export const EditPostSchema = PostBaseSchema.extend({
  id: z.string().uuid()
})

// Patch: everything optional except id
export const PatchPostSchema = PostBaseSchema.partial().extend({
  id: z.string().uuid()
})

type CreatePost = z.infer<typeof CreatePostSchema>
type EditPost   = z.infer<typeof EditPostSchema>
```

```ts
// ─── API response → form defaults (hydration)
interface ApiPost {
  id:        string
  title:     string
  body:      string
  tags:      string[]
  published: boolean
  createdAt: string   // ISO — not in form
  updatedAt: string   // ISO — not in form
}

function apiToFormDefaults(post: ApiPost): EditPost {
  return {
    id:        post.id,
    title:     post.title,
    body:      post.body,
    tags:      post.tags,
    published: post.published
    // createdAt/updatedAt NOT included — not form fields
  }
}
```

```tsx
// ─── Edit form: async load + reset
import { useEffect }   from 'react'
import { useForm }     from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'

function EditPostForm({ postId }: { postId: string }) {
  const { register, handleSubmit, reset,
          formState: { isDirty, isSubmitting } } = useForm<EditPost>({
    resolver:      zodResolver(EditPostSchema),
    defaultValues: { id: '', title: '', body: '', tags: [], published: false }
  })

  useEffect(() => {
    async function load() {
      const post = await api.get<ApiPost>(`/posts/${postId}`)
      reset(apiToFormDefaults(post))  // ← resets form to loaded values
      // After reset: isDirty = false (no unsaved changes)
    }
    load()
  }, [postId, reset])

  async function onSubmit(data: EditPost) {
    await api.put(`/posts/${data.id}`, data)
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <input type="hidden" {...register('id')} />
      {/* visible fields */}
      <button type="submit" disabled={!isDirty || isSubmitting}>
        {isSubmitting ? 'Saving…' : 'Save changes'}
      </button>
    </form>
  )
}
```

```ts
// ─── Date fields in edit forms — hydration pattern
interface ApiEvent { startDate: string; endDate: string } // ISO

function apiEventToDefaults(e: ApiEvent) {
  return {
    startDate: format(parseISO(e.startDate), 'yyyy-MM-dd'), // for <input type="date">
    endDate:   format(parseISO(e.endDate),   'yyyy-MM-dd')
  }
}
```

---

## W — Why It Matters

- Using `reset(apiToFormDefaults(data))` after load is the only correct way to set loaded data — `setValue` per field doesn't reset `isDirty`, so every field appears dirty even before the user edits anything.
- Deriving the edit schema from the create schema (`PostBaseSchema.extend({ id })`) ensures validation rules stay in sync — update the base schema and both forms benefit automatically.
- `isDirty` is only accurate when `defaultValues` match what was loaded from the API — which is why `reset()` is essential after async hydration.

---

## I — Interview Q&A

### Q: What is the correct way to populate an edit form with data loaded from an API?

**A:** Use `reset(formDefaults)` after the data loads — not `setValue` per field. `reset` sets both the values AND the internal `defaultValues` baseline that RHF uses for `isDirty` comparison. After `reset`, `isDirty` is `false` because the current values match the new defaults. If you use `setValue` instead, `defaultValues` still reflect the initial empty state, so every field is immediately dirty even before the user touches anything. Pass the hydrated data object (with ISO dates converted to input-compatible strings) directly to `reset`.

---

## C — Common Pitfalls + Fix

### ❌ Using `setValue` for each field when loading edit data — `isDirty` is wrong

```tsx
// ❌ Every field is dirty immediately — user hasn't changed anything
useEffect(() => {
  setValue('title', post.title)
  setValue('body',  post.body)
  // isDirty = true for all — "Save" button enabled before any edit ❌
}, [post])
```

**Fix:**

```tsx
// ✅ reset sets both values AND defaultValues baseline
useEffect(() => {
  reset({ title: post.title, body: post.body, published: post.published })
  // isDirty = false ✅
}, [post, reset])
```

---

## K — Coding Challenge + Solution

### Challenge

Build a generic `useEditForm<T>` custom hook that: accepts a `schema`, `fetchFn`, `saveFn`, and `hydrateFn` (API → defaults), loads on mount, calls `reset`, returns `{ methods, onSubmit, isLoading, loadError }`.

### Solution

```ts
import { useEffect, useState }      from 'react'
import { useForm, UseFormReturn }    from 'react-hook-form'
import { zodResolver }               from '@hookform/resolvers/zod'
import { ZodSchema }                 from 'zod'

interface UseEditFormOptions<TApi, TForm extends Record<string, unknown>> {
  schema:     ZodSchema<TForm>
  fetchFn:    () => Promise<TApi>
  saveFn:     (data: TForm) => Promise<void>
  hydrateFn:  (api: TApi) => TForm
  emptyDefaults: TForm
}

interface UseEditFormReturn<TForm extends Record<string, unknown>> {
  methods:    UseFormReturn<TForm>
  onSubmit:   (data: TForm) => Promise<void>
  isLoading:  boolean
  loadError:  string | null
}

export function useEditForm<TApi, TForm extends Record<string, unknown>>({
  schema, fetchFn, saveFn, hydrateFn, emptyDefaults
}: UseEditFormOptions<TApi, TForm>): UseEditFormReturn<TForm> {
  const [isLoading, setIsLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)

  const methods = useForm<TForm>({
    resolver:      zodResolver(schema) as any,
    defaultValues: emptyDefaults as any
  })

  useEffect(() => {
    fetchFn()
      .then(api => { methods.reset(hydrateFn(api) as any) })
      .catch(e  => { setLoadError(e.message ?? 'Failed to load') })
      .finally(() => setIsLoading(false))
  }, [])  // eslint-disable-line

  async function onSubmit(data: TForm) {
    await saveFn(data)
  }

  return { methods, onSubmit, isLoading, loadError }
}

// ─── Usage
const { methods, onSubmit, isLoading } = useEditForm({
  schema:        EditPostSchema,
  fetchFn:       () => api.get(`/posts/${id}`),
  saveFn:        data => api.put(`/posts/${data.id}`, data),
  hydrateFn:     apiToFormDefaults,
  emptyDefaults: { id: '', title: '', body: '', tags: [], published: false }
})
```

---

---

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

# 6 — Performance Tuning — Re-render Control

---

## T — TL;DR

RHF minimises re-renders by default — `register` is uncontrolled. Re-renders occur when you read `formState` properties. Subscribe only to what you need. Use `useWatch` instead of `watch` to isolate subscriptions to specific components. Avoid `watch()` at the top level of large forms.

---

## K — Key Concepts

```tsx
// ─── What causes re-renders in RHF

// 1. Reading formState properties — each subscription triggers re-render on change
const { formState: { errors } }         = useForm()  // re-renders when errors change
const { formState: { isSubmitting } }   = useForm()  // re-renders when submitting state changes
const { formState: { isDirty } }        = useForm()  // re-renders when dirty state changes

// Destructure ONLY what you need — RHF uses proxies to track access
// If you never read isSubmitting, it doesn't trigger re-renders ✅

// 2. watch() — re-renders the component on every field change
const allValues = watch()           // re-renders on ANY field change ❌ (in large forms)
const email     = watch('email')    // re-renders only when email changes ✅
```

```tsx
// ─── useWatch vs watch — isolate subscriptions to child components

// ❌ watch in parent re-renders the parent on every field change
function LargeForm() {
  const { watch } = useForm()
  const type = watch('accountType')  // parent re-renders on every keystroke in other fields
  return (
    <>
      {/* 20 input fields */}
      {type === 'business' && <BusinessSection />}
    </>
  )
}

// ✅ useWatch in an isolated component — only that component re-renders
function ConditionalSection() {
  const type = useWatch({ name: 'accountType' })  // requires FormProvider
  return type === 'business' ? <BusinessSection /> : null
}

function LargeForm() {
  const methods = useForm()
  return (
    <FormProvider {...methods}>
      <form>
        {/* 20 input fields render once — no re-renders from type changes */}
        <ConditionalSection />
      </form>
    </FormProvider>
  )
}
```

```tsx
// ─── Memoize expensive computed values
import { useMemo } from 'react'

const values    = useWatch({ control, name: ['items'] })
const totalCost = useMemo(() =>
  values[0]?.reduce((sum: number, item: any) =>
    sum + (item.qty ?? 0) * (item.unitPrice ?? 0), 0
  ) ?? 0,
  [values]
)

// ─── Avoid inline defaultValues objects — stable reference
// ❌ New object reference on every render — form resets unexpectedly
const { register } = useForm({ defaultValues: { name: '' } })

// ✅ Stable reference outside component or memoized
const DEFAULT_VALUES = { name: '', email: '' }
const { register }  = useForm({ defaultValues: DEFAULT_VALUES })
```

---

## W — Why It Matters

- `watch()` with no arguments subscribes the component to every field change — in a 20-field form with `mode: 'onChange'`, this means 20 re-renders per field update for the parent component. Each re-render re-runs all children's reconciliation.
- RHF's proxy-based `formState` means destructuring `const { errors, isDirty }` subscribes to both — if you only need `isSubmitting`, destructure only that. Unused `formState` properties don't add overhead.
- `useWatch` in a child component with `FormProvider` is the pattern for conditional UI that depends on field values — the parent form renders once and only the watcher component re-renders.

---

## I — Interview Q&A

### Q: What is the performance difference between `watch` and `useWatch` in React Hook Form?

**A:** Both subscribe to field value changes and trigger re-renders when the watched value changes. The difference is **scope**. `watch` is called in the component that owns `useForm` — so that component re-renders. `useWatch` can be called in any descendant of `FormProvider` — so only that smaller component re-renders. For conditional UI or computed values derived from fields, extract the consuming logic into a child component using `useWatch`. The parent form and its 20 other fields don't re-render when only the child's watched value changes.

---

## C — Common Pitfalls + Fix

### ❌ Destructuring unused `formState` properties — subscribes unnecessarily

```tsx
// ❌ Subscribes to errors, isDirty, isSubmitting, isValid, touchedFields
// Re-renders whenever ANY of these change
const { formState } = useForm()
const { errors, isDirty, isSubmitting, isValid, touchedFields } = formState
// You only needed errors — but now re-renders for every state change ❌
```

**Fix:** Destructure only what you use:

```tsx
// ✅ Only subscribes to errors and isSubmitting
const { formState: { errors, isSubmitting } } = useForm()
```

---

## K — Coding Challenge + Solution

### Challenge

Build a `CartForm` with a line items field array. Extract a `<CartTotal>` component that uses `useWatch` to show the live total price — without causing the parent form to re-render. Parent should render once; only `<CartTotal>` re-renders on item changes.

### Solution

```tsx
'use client'
import { useForm, useFieldArray, useWatch, FormProvider } from 'react-hook-form'
import { zodResolver }                                      from '@hookform/resolvers/zod'
import { useMemo }                                          from 'react'
import { z }                                               from 'zod'

const CartSchema = z.object({
  items: z.array(z.object({
    name:      z.string().min(1),
    qty:       z.coerce.number().int().positive(),
    unitPrice: z.coerce.number().positive()
  })).min(1)
})
type CartForm = z.infer<typeof CartSchema>

// ✅ Isolated watcher — only this re-renders on item changes
function CartTotal() {
  const items = useWatch({ name: 'items' }) as CartForm['items']
  const total = useMemo(() =>
    (items ?? []).reduce((sum, item) =>
      sum + (Number(item?.qty) || 0) * (Number(item?.unitPrice) || 0), 0),
    [items]
  )
  return (
    <div className="p-3 bg-gray-50 rounded-xl flex justify-between items-center">
      <span className="text-sm font-semibold">Total</span>
      <span className="text-lg font-bold text-blue-600">
        ${total.toFixed(2)}
      </span>
    </div>
  )
}

export function CartForm() {
  // Parent renders once — CartTotal handles its own subscriptions
  const methods = useForm<CartForm>({
    resolver:      zodResolver(CartSchema),
    defaultValues: { items: [{ name: '', qty: 1, unitPrice: 0 }] }
  })
  const { register, control, handleSubmit, formState: { errors } } = methods
  const { fields, append, remove } = useFieldArray({ control, name: 'items' })

  return (
    <FormProvider {...methods}>
      <form onSubmit={handleSubmit(console.log)} className="space-y-4 max-w-md">
        {fields.map((field, i) => (
          <div key={field.id} className="flex gap-2">
            <input {...register(`items.${i}.name`)}      placeholder="Item"  className="flex-1 border rounded-xl px-3 py-2 text-sm" />
            <input {...register(`items.${i}.qty`)}       type="number" style={{ width: 60 }} className="border rounded-xl px-3 py-2 text-sm" />
            <input {...register(`items.${i}.unitPrice`)} type="number" step="0.01" style={{ width: 80 }} className="border rounded-xl px-3 py-2 text-sm" />
            <button type="button" onClick={() => remove(i)} className="px-2 text-red-500 border border-red-200 rounded-xl text-sm">✕</button>
          </div>
        ))}
        <button type="button" onClick={() => append({ name: '', qty: 1, unitPrice: 0 })}
                className="text-sm text-blue-600 underline">+ Add item</button>
        <CartTotal />   {/* ← only this component re-renders on value changes */}
        <button type="submit" className="w-full py-2.5 bg-blue-600 text-white rounded-xl text-sm font-semibold">
          Place order
        </button>
      </form>
    </FormProvider>
  )
}
```

---

---

# 7 — Testing Strategies — What to Test in RHF + Zod Forms

---

## T — TL;DR

Test three layers: **schema** (pure unit tests), **form behaviour** (interaction tests with `@testing-library/react`), and **submit integration** (mocked API). Don't test RHF internals — test what the user experiences: errors appear, submit fires, values reach the handler.

---

## K — Key Concepts

```ts
// ─── Layer 1: Schema unit tests (fast, no DOM)
import { describe, it, expect } from 'vitest'
import { LoginSchema }          from './schema'

describe('LoginSchema', () => {
  it('accepts valid credentials', () => {
    const result = LoginSchema.safeParse({ email: 'a@a.com', password: 'Password1' })
    expect(result.success).toBe(true)
  })

  it('rejects invalid email', () => {
    const result = LoginSchema.safeParse({ email: 'not-email', password: 'Password1' })
    expect(result.success).toBe(false)
    const paths = result.error!.issues.map(i => i.path[0])
    expect(paths).toContain('email')
  })

  it('rejects short password', () => {
    const result = LoginSchema.safeParse({ email: 'a@a.com', password: 'abc' })
    expect(result.success).toBe(false)
    expect(result.error!.issues[0].message).toBe('Min 8 characters')
  })

  it('cross-field: rejects mismatched passwords', () => {
    const result = SignupSchema.safeParse({
      password: 'Password1!', confirm: 'Different1!'
    })
    expect(result.success).toBe(false)
    expect(result.error!.issues[0].path).toContain('confirm')
  })
})
```

```tsx
// ─── Layer 2: Form behaviour tests (user interactions)
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent                               from '@testing-library/user-event'
import { LoginForm }                           from './login-form'

describe('LoginForm', () => {
  it('shows email error on invalid input + blur', async () => {
    render(<LoginForm />)
    const emailInput = screen.getByLabelText(/email/i)
    await userEvent.type(emailInput, 'not-valid')
    await userEvent.tab()  // trigger onBlur
    await waitFor(() =>
      expect(screen.getByRole('alert')).toHaveTextContent('Invalid email')
    )
  })

  it('calls onSubmit with valid data', async () => {
    const onSubmit = vi.fn()
    render(<LoginForm onSubmit={onSubmit} />)
    await userEvent.type(screen.getByLabelText(/email/i),    'a@a.com')
    await userEvent.type(screen.getByLabelText(/password/i), 'Password1')
    await userEvent.click(screen.getByRole('button', { name: /sign in/i }))
    await waitFor(() =>
      expect(onSubmit).toHaveBeenCalledWith({ email: 'a@a.com', password: 'Password1' })
    )
  })

  it('does not submit with empty fields', async () => {
    const onSubmit = vi.fn()
    render(<LoginForm onSubmit={onSubmit} />)
    await userEvent.click(screen.getByRole('button', { name: /sign in/i }))
    await waitFor(() => expect(onSubmit).not.toHaveBeenCalled())
    expect(screen.getAllByRole('alert')).toHaveLength(2)  // 2 errors
  })
})
```

```ts
// ─── What to test checklist

// Schema tests (unit):
// ✅ Valid data passes
// ✅ Each required field rejects when missing
// ✅ Each format rule rejects on invalid format
// ✅ Cross-field rules produce errors on correct paths
// ✅ Defaults are applied (role: 'viewer', active: true)
// ✅ Transforms produce expected output (coercion, slugify)

// Form behaviour tests (integration):
// ✅ Error messages appear for invalid input
// ✅ Error messages disappear when fixed
// ✅ Submit button disabled when isSubmitting
// ✅ onSubmit called with correct data shape
// ✅ Reset clears the form
// ✅ Edit form loads defaultValues (check input values)
// ✅ Conditional fields appear/disappear correctly
// ✅ Field array append/remove works

// What NOT to test:
// ❌ RHF internals (isDirty implementation)
// ❌ Zod's own validation logic (it's already tested)
// ❌ Tailwind classes
```

---

## W — Why It Matters

- Testing the Zod schema separately from the form component is fast and exhaustive — schema tests run in milliseconds, no DOM needed. Cover every edge case at the schema level; form tests verify only that errors surface in the UI.
- `role="alert"` on error messages makes them queryable with `screen.getByRole('alert')` — a semantic selector that mirrors what screen readers announce, so the test doubles as an accessibility check.
- Testing `onSubmit` is called with the correct shape (post-transform, post-coercion) verifies the full pipeline — Zod coerced `"25"` to `25`, transforms ran, schema validated — one assertion covers all of it.

---

## I — Interview Q&A

### Q: How do you structure tests for a form with complex Zod validation?

**A:** Two layers. First, pure schema unit tests — import the Zod schema and call `safeParse` with valid, invalid, and edge-case inputs. Check `success`, `error.issues[].path`, and `error.issues[].message`. These are fast and exhaustive. Second, component integration tests — render the form, simulate user interactions with `userEvent`, and assert what the user sees (`screen.getByRole('alert')` for errors). Assert `onSubmit` is called with the correct typed data. Don't duplicate schema edge cases in component tests — the schema tests already cover them. Component tests focus on: errors appear in the UI, submit calls the handler, conditional fields render, and async interactions work.

---

## C — Common Pitfalls + Fix

### ❌ Using `fireEvent.change` instead of `userEvent.type` — skips validation events

```tsx
// ❌ fireEvent.change doesn't trigger onBlur or intermediate events
// Zod validation with mode: 'onTouched' never fires
fireEvent.change(input, { target: { value: 'test' } })
await waitFor(() => expect(screen.queryByRole('alert')).toBeNull())
// No error shown — onBlur never triggered ❌
```

**Fix:** Use `userEvent` which simulates real user interactions:

```tsx
// ✅ userEvent.type triggers keydown, input, keyup, change events
// .tab() triggers onBlur — matches real browser behaviour
await userEvent.type(input, 'test')
await userEvent.tab()
await waitFor(() => expect(screen.getByRole('alert')).toBeInTheDocument())
```

---

## K — Coding Challenge + Solution

### Challenge

Write Vitest tests for a `ContactSchema` (name min 2, email valid, message min 10). Test: valid passes, invalid email fails on `email` path, short message fails on `message` path, empty name fails with `required_error`. No DOM needed.

### Solution

```ts
// contact.test.ts
import { describe, it, expect } from 'vitest'
import { z }                    from 'zod'

const ContactSchema = z.object({
  name:    z.string({ required_error: 'Name is required' }).min(2, 'Min 2 characters'),
  email:   z.string({ required_error: 'Email is required' }).email('Invalid email'),
  message: z.string({ required_error: 'Message is required' }).min(10, 'Min 10 characters')
})

describe('ContactSchema', () => {
  it('accepts valid input', () => {
    const r = ContactSchema.safeParse({ name: 'Mark', email: 'a@a.com', message: 'Hello there!' })
    expect(r.success).toBe(true)
    expect(r.data?.name).toBe('Mark')
  })

  it('rejects invalid email', () => {
    const r = ContactSchema.safeParse({ name: 'Mark', email: 'not-email', message: 'Hello there!' })
    expect(r.success).toBe(false)
    const emailIssue = r.error!.issues.find(i => i.path[0] === 'email')
    expect(emailIssue?.message).toBe('Invalid email')
  })

  it('rejects message shorter than 10 chars', () => {
    const r = ContactSchema.safeParse({ name: 'Mark', email: 'a@a.com', message: 'Hi' })
    expect(r.success).toBe(false)
    const msgIssue = r.error!.issues.find(i => i.path[0] === 'message')
    expect(msgIssue?.message).toBe('Min 10 characters')
  })

  it('uses required_error when name is undefined', () => {
    const r = ContactSchema.safeParse({ email: 'a@a.com', message: 'Hello there!' })
    expect(r.success).toBe(false)
    const nameIssue = r.error!.issues.find(i => i.path[0] === 'name')
    expect(nameIssue?.message).toBe('Name is required')
  })

  it('collects all errors on empty submit', () => {
    const r = ContactSchema.safeParse({})
    expect(r.success).toBe(false)
    expect(r.error!.issues).toHaveLength(3)
    const paths = r.error!.issues.map(i => i.path[0])
    expect(paths).toContain('name')
    expect(paths).toContain('email')
    expect(paths).toContain('message')
  })
})
```

---

---

# 8 — Discriminated Union Caveats, Refined Schemas, and Date Interval Edge Cases

---

## T — TL;DR

Discriminated unions break when you add `.refine()` to member schemas — the union can no longer read the discriminator. Wrap refinements outside the union or use `superRefine` on the union itself. Date intervals have three silent bugs: UTC midnight, end-before-start, and same-day zero-duration. Know the fix for each.

---

## K — Key Concepts

```ts
// ─── CAVEAT 1: refine on a discriminated union member breaks the union

// ❌ Adding .refine() to a member wraps it in ZodEffects
// ZodEffects hides the discriminator — z.discriminatedUnion can't read it
const BrokenUnion = z.discriminatedUnion('type', [
  z.object({ type: z.literal('card'), cardNumber: z.string() })
   .refine(d => d.cardNumber.length === 16, 'Must be 16 digits'), // ← breaks union ❌
  z.object({ type: z.literal('bank'), bsb: z.string() })
])
// ZodError: The discriminator value for the schema at index 0 could not be parsed

// ✅ Fix A: move refinement outside the union member — on the wrapping object
const WorkingUnion = z.discriminatedUnion('type', [
  z.object({ type: z.literal('card'), cardNumber: z.string() }),
  z.object({ type: z.literal('bank'), bsb: z.string() })
]).superRefine((data, ctx) => {
  if (data.type === 'card' && data.cardNumber.length !== 16) {
    ctx.addIssue({ code: z.ZodIssueCode.custom,
      message: 'Must be 16 digits', path: ['cardNumber'] })
  }
})

// ✅ Fix B: use z.union instead of z.discriminatedUnion when refines are needed
const FlexibleUnion = z.union([
  z.object({ type: z.literal('card'), cardNumber: z.string() })
   .refine(d => d.cardNumber.length === 16, { message: '16 digits', path: ['cardNumber'] }),
  z.object({ type: z.literal('bank'), bsb: z.string() })
])
// z.union tries each branch — slower but compatible with branch-level refines
```

```ts
// ─── CAVEAT 2: z.union vs z.discriminatedUnion error quality
// z.discriminatedUnion: precise — only validates matching branch
// z.union: shows all branch errors OR "invalid union" when no branch matches

// When to use which:
// All branches share a unique discriminator key → discriminatedUnion
// Branches need .refine() on individual schemas    → z.union + comment why

// ─── DATE INTERVAL EDGE CASES

// Bug 1: UTC midnight — new Date('2025-06-15') is UTC, not local
import { parseISO, isAfter, isBefore, startOfDay, endOfDay } from 'date-fns'

const d1 = new Date('2025-06-15')           // 2025-06-14T16:00:00 in UTC+8
const d2 = parseISO('2025-06-15')           // 2025-06-15T00:00:00 local ✅
// For form date inputs: always use parseISO, never new Date(string)
```

```ts
// Bug 2: end before start in eachDayOfInterval — throws
import { eachDayOfInterval, min, max } from 'date-fns'

// ❌ Throws RangeError
eachDayOfInterval({ start: end, end: start })

// ✅ Always guard order
function safeInterval(a: Date, b: Date) {
  return eachDayOfInterval({ start: min([a, b]), end: max([a, b]) })
}

// Bug 3: same-day interval — duration is 0, not 1
import { differenceInDays, differenceInCalendarDays } from 'date-fns'

const same = new Date(2025, 5, 15)
differenceInDays(same, same)             // 0 ← correct for elapsed time
differenceInCalendarDays(same, same)     // 0 ← correct for calendar days

// For "number of nights" in a booking:
// check-in June 15, check-out June 16 → 1 night
differenceInDays(new Date(2025,5,16), new Date(2025,5,15))  // 1 ✅

// For "same day = invalid":
.refine(d => differenceInDays(d.checkOut, d.checkIn) >= 1, {
  message: 'Minimum 1 night stay', path: ['checkOut']
})
```

```ts
// ─── Refined schema composition caveat — extends after refine
// .extend() AFTER .refine() doesn't work — can't extend ZodEffects

// ❌ Can't extend a refined schema
const RefinedSchema = z.object({ name: z.string() }).refine(d => !!d.name)
const Extended = RefinedSchema.extend({ email: z.string() })  // TypeError ❌

// ✅ Extend FIRST, then refine
const Base     = z.object({ name: z.string() })
const Extended = Base.extend({ email: z.string() })
const Final    = Extended.refine(d => !!d.name && !!d.email)  // ✅

// ✅ Or: extend the base, apply refine to the extended version
const CreateSchema = Base.extend({ role: z.string() })
  .refine(d => d.role !== 'superadmin', 'Reserved role')
```

---

## W — Why It Matters

- The discriminated union + `.refine()` pitfall is the most silent bug in Zod schemas — the error message says the discriminator "could not be parsed" which doesn't hint at the cause. Knowing to move refinements outside the union saves debugging time.
- The UTC midnight bug (`new Date('2025-06-15')`) causes off-by-one-day display for users in UTC-negative and UTC-positive timezones. `parseISO` is the consistent fix — always.
- `.extend()` after `.refine()` is a schema composition order error that TypeScript catches — but only at the method call site, not earlier. Remember: transform, refine, and superRefine are always the last step.

---

## I — Interview Q&A

### Q: Why does adding `.refine()` to a `z.discriminatedUnion` member schema break the union, and what is the fix?

**A:** `z.discriminatedUnion` reads the discriminator field from each member schema to build a lookup map. When you add `.refine()` to a member, Zod wraps it in a `ZodEffects` object — and `ZodEffects` doesn't expose the inner schema's discriminator value directly. Zod can no longer extract `z.literal('card')` from the wrapped schema and throws a parse error. The fix is to move the refinement outside the member schemas and onto the union itself using `.superRefine()`. Inside `superRefine`, check `data.type` first to apply branch-specific validation. Alternatively, switch from `z.discriminatedUnion` to `z.union` — which doesn't require a readable discriminator and is compatible with branch-level refinements (at the cost of trying all branches on every parse).

---

## C — Common Pitfalls + Fix

### ❌ `.extend()` called after `.refine()` — TypeScript error

```ts
// ❌ Cannot extend ZodEffects — .refine() returns ZodEffects, not ZodObject
const Schema = z.object({ name: z.string() })
  .refine(d => d.name.length > 2)
  .extend({ email: z.string() })  // TypeScript error: .extend is not a function ❌
```

**Fix:** Extend first, then refine:

```ts
// ✅
const Schema = z.object({ name: z.string() })
  .extend({ email: z.string() })  // extend first
  .refine(d => d.name.length > 2 && !!d.email)  // refine last
```

---

## K — Coding Challenge + Solution

### Challenge

Fix a broken `PaymentUnion` that has `.refine()` on a discriminated union member. Rewrite using `superRefine` on the union. Also write a `safeBookingInterval` function that handles all three date edge cases (UTC midnight, end-before-start, same-day).

### Solution

```ts
import { z }                                             from 'zod'
import { parseISO, isValid, min, max,
         eachDayOfInterval, differenceInDays,
         isBefore, isAfter }                            from 'date-fns'

// ─── Fixed discriminated union with superRefine
const PaymentUnion = z.discriminatedUnion('method', [
  z.object({
    method:     z.literal('card'),
    cardNumber: z.string(),
    expiry:     z.string()
  }),
  z.object({
    method: z.literal('paypal'),
    email:  z.string()
  })
])
.superRefine((data, ctx) => {
  if (data.method === 'card') {
    if (!/^\d{16}$/.test(data.cardNumber)) {
      ctx.addIssue({ code: z.ZodIssueCode.custom,
        message: 'Card number must be 16 digits', path: ['cardNumber'] })
    }
    if (!/^\d{2}\/\d{2}$/.test(data.expiry)) {
      ctx.addIssue({ code: z.ZodIssueCode.custom,
        message: 'Expiry must be MM/YY', path: ['expiry'] })
    }
  }
  if (data.method === 'paypal') {
    if (!data.email.includes('@')) {
      ctx.addIssue({ code: z.ZodIssueCode.custom,
        message: 'Invalid PayPal email', path: ['email'] })
    }
  }
})

// ─── Safe booking interval utility — handles all 3 edge cases
interface BookingIntervalResult {
  days:        Date[]
  nightCount:  number
  isValid:     boolean
  error?:      string
}

function safeBookingInterval(
  checkInStr:  string,  // 'yyyy-MM-dd' from form input
  checkOutStr: string
): BookingIntervalResult {
  // Bug 1: use parseISO, not new Date() — avoids UTC midnight issue
  const checkIn  = parseISO(checkInStr)
  const checkOut = parseISO(checkOutStr)

  if (!isValid(checkIn) || !isValid(checkOut)) {
    return { days: [], nightCount: 0, isValid: false, error: 'Invalid date string' }
  }

  // Bug 3: same-day = 0 nights = invalid booking
  const nights = differenceInDays(checkOut, checkIn)
  if (nights < 1) {
    return { days: [], nightCount: 0, isValid: false,
             error: nights === 0 ? 'Minimum 1 night required' : 'Check-out must be after check-in' }
  }

  // Bug 2: guard order — ensure start < end before eachDayOfInterval
  const days = eachDayOfInterval({
    start: min([checkIn, checkOut]),
    end:   max([checkIn, checkOut])
  })

  return { days, nightCount: nights, isValid: true }
}

// Tests
console.log(safeBookingInterval('2025-06-15', '2025-06-15'))
// { isValid: false, error: 'Minimum 1 night required' }

console.log(safeBookingInterval('2025-06-16', '2025-06-15'))
// { isValid: false, error: 'Check-out must be after check-in' }

console.log(safeBookingInterval('2025-06-15', '2025-06-18'))
// { isValid: true, nightCount: 3, days: [Jun15, Jun16, Jun17, Jun18] }

// Payment union test
console.log(PaymentUnion.safeParse({ method: 'card', cardNumber: '123', expiry: '12/27' }).success)
// false — '123' not 16 digits

console.log(PaymentUnion.safeParse({ method: 'card', cardNumber: '4111111111111111', expiry: '12/27' }).success)
// true ✅
```

---

## ✅ Day 8 Complete — Advanced Validation and Production Patterns

| # | Subtopic | Status |
|---|----------|--------|
| 1 | Advanced `refine` and `superRefine` | ☐ |
| 2 | Cross-field and Date-Range Validation | ☐ |
| 3 | Async Validation — Debounced Server Checks | ☐ |
| 4 | Create vs Edit Flows + API Hydration | ☐ |
| 5 | Form Accessibility — ARIA, Focus, Announcements | ☐ |
| 6 | Performance Tuning — Re-render Control | ☐ |
| 7 | Testing Strategies | ☐ |
| 8 | Discriminated Union Caveats + Date Edge Cases | ☐ |

---

## 🗺️ One-Page Mental Model — Day 8

```
REFINE / SUPERREFINE
  .refine(fn, msg)              → one issue, one path, all refines run
  .superRefine((data, ctx) => { → multiple issues, multiple paths
    ctx.addIssue({code, message, path})
    return z.NEVER              → abort — stop subsequent refinements
  })
  Chain .refine for independent rules — all show simultaneously
  Use z.NEVER after critical issue — prevent cascading noise

CROSS-FIELD RULES
  Always on z.object({}).refine/superRefine — not on individual fields
  date-fns: isBefore/isAfter for date comparisons (not < >)
  Always include path: ['fieldName'] → shows inline in form

ASYNC VALIDATION
  Real-time (UX):  debounced useEffect + setTimeout + setError/clearErrors
  Submit-time:     async .refine in schema — zodResolver calls safeParseAsync
  After API call:  setError('field', { type: 'server', message })
  Never: async .refine with mode: 'onChange' — server per keystroke

CREATE vs EDIT
  Edit schema  = Base.extend({ id: z.string().uuid() })
  Patch schema = Base.partial().extend({ id })
  Load data:   reset(apiToFormDefaults(apiData))  — NOT setValue
  After reset: isDirty = false ✅
  Date hydration: format(parseISO(apiDate), 'yyyy-MM-dd') for input value

ACCESSIBILITY
  htmlFor + id         → link label to input
  aria-invalid         → signals error state
  aria-describedby     → links input to error message element
  role="alert"         → error messages announced by screen readers
  aria-live="polite"   → inline errors; aria-live="assertive" → summary
  handleSubmit(valid, invalid) → focus error summary on invalid submit
  useId()              → stable IDs for SSR-safe label/input pairing

PERFORMANCE
  Destructure ONLY used formState props (proxy-based subscriptions)
  watch('field')       → subscribes parent component
  useWatch({ name })   → subscribes only that child component
  Extract watched UI into child + FormProvider = parent renders once
  useMemo for computed values from useWatch
  Stable defaultValues reference (outside component or const)

TESTING
  Layer 1 - Schema unit:  safeParse with valid/invalid/edge-case inputs
  Layer 2 - Form:         userEvent (not fireEvent) + waitFor + role="alert"
  Layer 3 - Submit:       assert onSubmit called with correct typed data
  Do NOT test: RHF internals, Zod's own validation, CSS classes

DISCRIMINATED UNION CAVEATS
  .refine() on a member → wraps in ZodEffects → discriminator hidden → error
  Fix A: superRefine on the union itself, branch by data.type
  Fix B: switch to z.union (slower, but accepts branch-level refines)
  .extend() after .refine() → TypeScript error (extend ZodEffects fails)
  Fix: extend FIRST, then refine last

DATE INTERVAL EDGE CASES
  new Date('2025-06-15')  → UTC midnight bug → use parseISO always
  eachDayOfInterval end < start → RangeError → guard with min/max
  same-day differenceInDays → 0 → add .refine(d => diff >= 1, 'Min 1 night')
  formatISO with offset    → prevents timezone storage bugs
```

> **Your next action:** Find one `.refine()` in your codebase that checks more than one condition. Split it into two chained `.refine()` calls so both errors show simultaneously — or convert it to `superRefine` if it needs to touch multiple field paths.
>
> *Doing one small thing beats opening a feed.*