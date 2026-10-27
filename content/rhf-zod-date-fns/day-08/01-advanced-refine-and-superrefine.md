# 1 — Advanced `refine` and `superRefine`

---

## T — TL;DR

`.refine` adds one conditional rule. `.superRefine` gives full control — add multiple issues, choose error codes, target multiple field paths, and stop early: `return` ends your own callback, and `fatal: true` on an issue stops later chained checks. Chain multiple `.refine` calls to run independent rules in parallel.

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
      code:    'custom',
      message: 'Passwords do not match',
      path:    ['confirm']
    })
  }
  if (data.username === data.password) {
    ctx.addIssue({
      code:    'custom',
      message: 'Password cannot be the same as username',
      path:    ['password']
    })
  }
})
```

```ts
// ─── Abort early — stop validation if a critical rule fails
// Two different things stop work:
//  1. `return` — ends THIS superRefine callback, so the checks below it don't run
//  2. `fatal: true` on the issue — also stops LATER checks chained after this superRefine
// (`return z.NEVER` is only a typing helper: it does NOT abort anything by itself — it's
//  just a plain `return` whose type fits `never`)
const CriticalSchema = z.string().superRefine((val, ctx) => {
  if (!val.trim()) {
    ctx.addIssue({
      code:    'custom',
      message: 'Value is required',
      fatal:   true               // later .refine()/.superRefine() in the chain won't run
    })
    return                        // and skip the rest of this callback
  }
  // Only runs if value is non-empty
  if (val.length < 3) {
    ctx.addIssue({ code: 'custom', message: 'Min 3 characters' })
  }
})
// .refine() has the same switch: .refine(fn, { error: '...', abort: true })

// ─── Conditional issue — add only when another field has a specific value
const FormSchema = z.object({
  hasVoucher:  z.boolean(),
  voucherCode: z.string().optional()
}).superRefine((data, ctx) => {
  if (data.hasVoucher && !data.voucherCode?.trim()) {
    ctx.addIssue({
      code:    'custom',
      message: 'Voucher code is required when voucher is enabled',
      path:    ['voucherCode']
    })
  }
})

// ─── Issue codes (Zod 4: plain string literals — z.ZodIssueCode is deprecated)
'custom'          // generic custom error
'too_small'       // for min-length issues (structured: origin, minimum, inclusive, input)
'invalid_value'   // enum / literal mismatch (v3: invalid_enum_value + invalid_literal)
'not_multiple_of'
```

---

## W — Why It Matters

- Chaining `.refine` shows all failures simultaneously — users see "needs uppercase AND a number AND a special character" in one submit, not one error at a time. Better UX for complex password rules.
- Stopping early in `superRefine` prevents downstream rules from running on invalid data — e.g. don't check format if value is empty. A plain `return` skips the rest of your callback; `fatal: true` on the issue also skips later chained checks. Without either, users see cascading irrelevant errors.
- Targeting different paths from one `superRefine` (e.g. `password` AND `confirm`) is only possible with `superRefine` — `.refine` produces one issue at one path per call.

---

## I — Interview Q&A

### Q: How do you stop later validation after a critical issue inside `superRefine`?

**A:** Two tools, with different reach. A plain `return` (often written `return z.NEVER` for typing reasons) only exits your own callback, so checks written below it in the same function don't run. To also stop checks chained AFTER the `superRefine` (later `.refine()` / `.superRefine()` calls), mark the issue non-continuable with `ctx.addIssue({ ..., fatal: true })` (for `.refine()` use `{ abort: true }`). `z.NEVER` by itself does not abort anything — it is just a value typed as `never` so the callback's return type stays clean. Without `fatal`/`abort`, Zod keeps running the later chained refinements regardless of earlier failures, so an empty field can show both "Required" and "Must be numeric".

---

## C — Common Pitfalls + Fix

### ❌ Forgetting to stop after a critical issue — cascading errors

```ts
// ❌ No early exit, format check runs on empty string
z.string().superRefine((val, ctx) => {
  if (!val) ctx.addIssue({ code: 'custom', message: 'Required' })
  // No return — next check runs on ''
  if (!/^\d+$/.test(val)) ctx.addIssue({ code: 'custom', message: 'Must be numeric' })
  // Shows BOTH 'Required' AND 'Must be numeric' for an empty field ❌
})

// ❌ Also wrong: relying on `return z.NEVER` to stop a LATER chained check
z.string()
  .superRefine((val, ctx) => {
    if (!val) { ctx.addIssue({ code: 'custom', message: 'Required' }); return z.NEVER }
  })
  .refine(v => /^\d+$/.test(v), 'Must be numeric')   // still runs on '' → both messages ❌
```

**Fix:**

```ts
// ✅ return exits this callback; fatal: true also stops later chained checks
z.string()
  .superRefine((val, ctx) => {
    if (!val) {
      ctx.addIssue({ code: 'custom', message: 'Required', fatal: true })
      return
    }
    if (val.length < 3) ctx.addIssue({ code: 'custom', message: 'Min 3 characters' })
  })
  .refine(v => /^\d+$/.test(v), 'Must be numeric')   // skipped when the field is empty
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
  email:    z.email('Invalid email'),
  password: z.string().min(8, 'Min 8 characters')
    .refine(v => /[A-Z]/.test(v), 'Needs uppercase')
    .refine(v => /\d/.test(v),    'Needs a number'),
  confirm:  z.string(),
  phone:    z.string().optional()
})
.superRefine((data, ctx) => {
  // Rule 1: password match
  if (data.password !== data.confirm) {
    ctx.addIssue({ code: 'custom',
      message: 'Passwords do not match', path: ['confirm'] })
  }
  // Rule 2: username ≠ password
  if (data.username === data.password) {
    ctx.addIssue({ code: 'custom',
      message: 'Password cannot match username', path: ['password'] })
  }
  // Rule 3: phone format — abort early if empty
  if (data.phone !== undefined && data.phone !== '') {
    if (!data.phone.trim()) {
      ctx.addIssue({ code: 'custom',
        message: 'Phone cannot be blank if provided', path: ['phone'] })
      return   // early exit: skip the format check below
    }
    if (!/^\+?[\d\s\-()]{7,15}$/.test(data.phone)) {
      ctx.addIssue({ code: 'custom',
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
