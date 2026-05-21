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
