# 8 — Schema as Single Source of Truth

---

## T — TL;DR

One Zod schema validates the form (via `zodResolver`), the API route body (via `safeParse`), and types the submit handler parameter — all from the same definition. Change a rule once, it propagates everywhere. This is the core architectural win of combining Zod + RHF.

---

## K — Key Concepts

```ts
// src/lib/schemas/create-user.ts — ONE file, used everywhere

import { z } from 'zod'

export const CreateUserSchema = z.object({
  username:  z.string().min(3, 'Min 3 characters').max(20),
  email:     z.email('Invalid email'),
  password:  z.string().min(8, 'Min 8 characters'),
  role:      z.enum(['admin', 'editor', 'viewer']).default('viewer'),
  birthYear: z.coerce.number().int().min(1900).max(2010)
})

export type CreateUser     = z.infer<typeof CreateUserSchema>
export type CreateUserInput = z.input<typeof CreateUserSchema>
```

```tsx
// ─── Usage 1: RHF form (client component)
// src/app/admin/create-user/page.tsx
'use client'
import { useForm }           from 'react-hook-form'
import { zodResolver }       from '@hookform/resolvers/zod'
import { CreateUserSchema, CreateUser, CreateUserInput } from '@/lib/schemas/create-user'

export default function CreateUserPage() {
  const { register, handleSubmit, formState: { errors } } = useForm<CreateUserInput, unknown, CreateUser>({   // schema has .default() + coerce → input ≠ output
    resolver:      zodResolver(CreateUserSchema),
    defaultValues: { username: '', email: '', password: '', role: 'viewer' }
  })
  // form code...
}
```

```tsx
// ─── Usage 2: Next.js API Route (server)
// src/app/api/users/route.ts
import { z } from 'zod'
import { CreateUserSchema } from '@/lib/schemas/create-user'

export async function POST(req: Request) {
  const body   = await req.json()
  const result = CreateUserSchema.safeParse(body)
  if (!result.success) {
    return Response.json({ errors: z.flattenError(result.error) }, { status: 400 })
  }
  // result.data is typed as CreateUser ✅
  await db.user.create({ data: result.data })
  return Response.json({ ok: true })
}
```

```tsx
// ─── Usage 3: Server Action (Next.js)
// src/app/actions/create-user.ts
'use server'
import { z } from 'zod'
import { CreateUserSchema } from '@/lib/schemas/create-user'

export async function createUserAction(formData: FormData) {
  const raw    = Object.fromEntries(formData)
  const result = CreateUserSchema.safeParse(raw)
  if (!result.success) {
    return { errors: z.flattenError(result.error) }
  }
  await db.user.create({ data: result.data })
  return { success: true }
}
```

```ts
// ─── Usage 4: Shared between Client and Server via schema composition
// Extend the base schema for different contexts
export const AdminCreateUserSchema = CreateUserSchema.extend({
  permissions: z.array(z.string()).optional()
})
export const PublicRegisterSchema  = CreateUserSchema.omit({ role: true })

// All share the same base validation rules —
// change email validation once, it propagates to all three
```

---

## W — Why It Matters

- Before this pattern: form validation (register rules), API route validation (manual checks), and TypeScript types are three separate things that drift apart over time. A new `maxLength` constraint added to the form doesn't automatically protect the API route.
- With Zod as single source of truth: update `username: z.string().min(3).max(20)` → the form shows the error, the API route rejects the request, and the TypeScript type reflects `string` — one change, three layers protected.
- Server Actions with Zod validation is especially powerful in Next.js App Router — the `formData` from a form submission is validated by the same schema that validates the client-side form.

---

## I — Interview Q&A

### Q: How do you share a Zod schema between a React Hook Form client component and a Next.js API route?

**A:** Define the schema in a separate file (`src/lib/schemas/yourSchema.ts`) and export the schema and its inferred type. Import the schema in the client form component for `zodResolver`, and import it in the API route or Server Action for `safeParse`. Because the schema is a plain TypeScript module (not React-specific), it runs in both client and server environments. Zod has no browser or Node.js dependencies that would cause issues in either environment. Mark the schema file as neither `'use client'` nor `'use server'` — it's shared code.

---

## C — Common Pitfalls + Fix

### ❌ Duplicating schemas — separate form schema and API schema for the same resource

```ts
// ❌ Two schemas for the same data — they drift apart
// src/components/user-form.tsx
const FormSchema = z.object({ email: z.email(), age: z.coerce.number().min(18) })

// src/app/api/users/route.ts
const ApiSchema = z.object({ email: z.email(), age: z.number().min(16) })
// ← min(16) vs min(18) — different rules, both "valid"
```

**Fix:** Single schema file, imported everywhere:

```ts
// src/lib/schemas/user.ts
export const UserSchema = z.object({ email: z.email(), age: z.coerce.number().min(18) })
// Both form AND API import from here — one rule, always consistent
```

---

## K — Coding Challenge + Solution

### Challenge

Create a shared `ContactFormSchema` in `src/lib/schemas/contact.ts`. Use it in: (1) a client-side `<ContactForm>` component with `zodResolver`, and (2) a mock API route `POST /api/contact` that validates with `safeParse` and returns `400` with `z.flattenError()` on failure. Prove both use the same schema by updating one rule and noting it changes in both.

### Solution

```ts
// src/lib/schemas/contact.ts — shared schema
import { z } from 'zod'

export const ContactFormSchema = z.object({
  name:    z.string().min(2, 'Name must be at least 2 characters'),
  email:   z.email('Invalid email address'),
  subject: z.enum(['support', 'sales', 'general'], {
             error: 'Please select a subject'   // Zod 3: errorMap: () => ({ message })
           }),
  message: z.string().min(20, 'Message must be at least 20 characters').max(1000)
})

export type ContactForm = z.infer<typeof ContactFormSchema>
```

```tsx
// src/components/contact-form.tsx — client usage
'use client'
import { useForm }          from 'react-hook-form'
import { zodResolver }      from '@hookform/resolvers/zod'
import { ContactFormSchema, ContactForm } from '@/lib/schemas/contact'

export function ContactForm() {
  const { register, handleSubmit, formState: { errors, isSubmitting, isSubmitSuccessful } } = useForm<ContactForm>({
    resolver:      zodResolver(ContactFormSchema),
    mode:          'onTouched',
    defaultValues: { name: '', email: '', subject: 'general', message: '' }
  })

  async function onSubmit(data: ContactForm) {
    const res = await fetch('/api/contact', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify(data)
    })
    if (!res.ok) console.error(await res.json())
    else         console.log('Sent:', data)
  }

  const cls = 'w-full border rounded-xl px-3 py-2 text-sm'
  const err = 'text-xs text-red-600 mt-1'

  if (isSubmitSuccessful) {
    return <p className="text-green-600 font-semibold">✓ Message sent!</p>
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 max-w-sm">
      <div>
        <input {...register('name')}    placeholder="Full name" className={cls} />
        {errors.name    && <p className={err}>{errors.name.message}</p>}
      </div>
      <div>
        <input {...register('email')}   type="email" placeholder="Email" className={cls} />
        {errors.email   && <p className={err}>{errors.email.message}</p>}
      </div>
      <div>
        <select {...register('subject')} className={cls}>
          <option value="general">General enquiry</option>
          <option value="support">Support</option>
          <option value="sales">Sales</option>
        </select>
        {errors.subject && <p className={err}>{errors.subject.message}</p>}
      </div>
      <div>
        <textarea {...register('message')} rows={4} placeholder="Your message (min 20 chars)" className={cls} />
        {errors.message && <p className={err}>{errors.message.message}</p>}
      </div>
      <button type="submit" disabled={isSubmitting}
              className="w-full py-2.5 bg-blue-600 text-white rounded-xl text-sm
                          font-semibold disabled:opacity-50">
        {isSubmitting ? 'Sending…' : 'Send message'}
      </button>
    </form>
  )
}
```

```ts
// src/app/api/contact/route.ts — server usage of the SAME schema
import { z } from 'zod'
import { ContactFormSchema } from '@/lib/schemas/contact'

export async function POST(req: Request) {
  const body   = await req.json().catch(() => null)
  const result = ContactFormSchema.safeParse(body)

  if (!result.success) {
    return Response.json(
      { errors: z.flattenError(result.error).fieldErrors },
      { status: 400 }
    )
  }

  // result.data is typed as ContactForm ✅ — same type as the form
  const { name, email, subject, message } = result.data

  // mock send
  console.log(`New ${subject} message from ${name} <${email}>: ${message}`)
  return Response.json({ ok: true }, { status: 200 })
}
// If you update ContactFormSchema.message.min(20) to min(30),
// BOTH the form AND the API route enforce min(30) automatically ✅
```

---

## ✅ Day 4 Complete — RHF + Zod Integration

| # | Subtopic | Status |
|---|----------|--------|
| 1 | `zodResolver` — Connecting Zod to RHF | ☐ |
| 2 | Typed Form Values from Schemas | ☐ |
| 3 | Input Coercion — Handling HTML String Inputs | ☐ |
| 4 | Transforms and Preprocessing | ☐ |
| 5 | Custom Error Messages | ☐ |
| 6 | Error Path Mapping | ☐ |
| 7 | Cross-field Validation — refine and superRefine | ☐ |
| 8 | Schema as Single Source of Truth | ☐ |

---

## 🗺️ One-Page Mental Model — Day 4

```
SETUP
  npm install @hookform/resolvers
  import { zodResolver } from '@hookform/resolvers/zod'
  useForm({ resolver: zodResolver(Schema) })     // types inferred from the resolver
  → remove ALL rules from register() — schema owns validation

ZODRESOLVER FLOW
  submit → schema.safeParse(formValues)
    success → onValid(data)          data is typed as z.output<Schema> (= z.infer)
    failure → maps ZodIssue[] to formState.errors
              issue.path → errors.field.subfield[0].name

TYPED FORM VALUES
  type FormOutput = z.output<typeof Schema>   output type (after parse) = z.infer
  type FormInput  = z.input<typeof Schema>    input type (before coerce/default/transform)
  useForm<FormInput, unknown, FormOutput>({ resolver })   (single generic only if input === output)
  register('field')  → type-safe ✅
  errors.field       → type-safe ✅
  setValue('field', wrongType) → TypeScript error ✅

COERCION (HTML inputs → always strings)
  z.coerce.number()   "42" → 42   (replaces valueAsNumber)
  z.coerce.date()     "2024-01-01" → Date (replaces valueAsDate)
  z.coerce.boolean()  Boolean(x): "false" → true ⚠️ (checkbox via register is already boolean → z.boolean())
  Empty string fix:   z.preprocess(v => v === '' ? undefined : v, z.coerce.number().optional())
  Checkbox fix:       z.preprocess(v => v === 'on' || v === true, z.boolean())

TRANSFORMS vs PREPROCESS
  z.preprocess(fn, schema)  → fn runs BEFORE validation (fix wrong type)
  schema.transform(fn)      → fn runs AFTER validation (shape valid data)
  Use preprocess:  empty string → undefined, "on" → boolean, csv → array
  Use transform:   dollars → cents, trim whitespace, slugify string

ERROR MESSAGES
  .min(n, 'message')                    per-rule string
  .min(n, { error: '...' })             per-rule object (Zod 3: { message })
  z.string({ error: iss => iss.input === undefined ? 'Required' : 'Wrong type' })
                                        replaces required_error / invalid_type_error
  z.config({ customError: fn })         global override (i18n) (Zod 3: z.setErrorMap)

ERROR PATH MAPPING
  ZodIssue.path → RHF errors path
  path: ['email']          → errors.email
  path: ['address','city'] → errors.address?.city
  path: ['items', 0, 'qty']→ errors.items?.[0]?.qty
  path: []                 → errors[''] (NOT errors.root — invisible in the UI)
  path: ['root']           → errors.root (explicit form-level error)
  ALWAYS set path in .refine() for inline field errors

CROSS-FIELD VALIDATION
  .refine(fn, { error, path })          single rule, one error (Zod 3: message)
  .refine chaining                       all run — multiple errors visible
  .superRefine((data, ctx) => {          multiple issues, multiple paths
    ctx.addIssue({ code, message, path })
  })
  async .refine()                        zodResolver handles automatically

SINGLE SOURCE OF TRUTH PATTERN
  src/lib/schemas/resource.ts
    export const Schema = z.object({...})
    export type Resource = z.infer<typeof Schema>
  Client:  useForm({ resolver: zodResolver(Schema) })
  Server:  const result = Schema.safeParse(body)
  Action:  const result = Schema.safeParse(Object.fromEntries(formData))
  → change a rule once → propagates to form + API + types

COMPOSITION FOR CRUD
  Base     = z.object({ id, ...all fields })
  Create   = Base.omit({ id: true, createdAt: true })
  Update   = Create
  Patch    = Create.partial()
  Summary  = Base.pick({ id: true, name: true })
```

> **Your next action:** Open any RHF form in your project. Add `npm install @hookform/resolvers`, create a Zod schema for it, swap in `zodResolver(schema)`, and delete every `register(field, rules)` argument. Run the form — validation should work identically, but now your API route can import the same schema.
>
> *Doing one small thing beats opening a feed.*
