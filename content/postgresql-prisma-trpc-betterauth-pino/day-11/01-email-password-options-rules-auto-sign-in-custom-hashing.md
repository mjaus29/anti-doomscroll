# 1 — Email/Password Options — Rules, Auto Sign-In, Custom Hashing

---

## T — TL;DR

The `emailAndPassword` config block controls every behavior of credential-based auth: password length constraints, whether to auto sign-in after registration, email verification requirements, and password hashing strategy. Tune these once in `auth.ts` — they apply globally to every sign-up and sign-in.

---

## K — Key Concepts

```typescript
// src/lib/auth.ts — complete emailAndPassword config
import { betterAuth }    from 'better-auth'
import { prismaAdapter } from 'better-auth/adapters/prisma'
import { prisma }        from '@/lib/prisma'
import { scrypt }        from 'crypto'
import { promisify }     from 'util'

export const auth = betterAuth({
  database: prismaAdapter(prisma, { provider: 'postgresql' }),

  emailAndPassword: {
    // ── Enable / disable ──────────────────────────────────────────────
    enabled: true,

    // ── Password length constraints ───────────────────────────────────
    minPasswordLength: 8,     // default: 8
    maxPasswordLength: 128,   // default: 128 — bcrypt truncates at 72 bytes anyway

    // ── Auto sign-in after sign-up ────────────────────────────────────
    // true  → session created immediately after sign-up (default)
    // false → user must sign in manually after registering
    autoSignIn: true,

    // ── Require email verification before first sign-in ───────────────
    // false → user can sign in without verifying email (default)
    // true  → sign-in returns EMAIL_NOT_VERIFIED until verified
    requireEmailVerification: false,

    // ── Password hashing — custom implementation ──────────────────────
    // Default: bcrypt (cost factor 10) — safe to leave as default
    // Custom example: use Node.js crypto scrypt
    password: {
      hash:   hashPassword,
      verify: verifyPassword,
    },
  },
})

// ── Custom hasher example (scrypt) ────────────────────────────────────────
const scryptAsync = promisify(scrypt)

async function hashPassword(password: string): Promise<string> {
  const salt   = crypto.randomBytes(16).toString('hex')
  const derived = await scryptAsync(password, salt, 64) as Buffer
  return `${salt}:${derived.toString('hex')}`
}

async function verifyPassword(password: string, hash: string): Promise<boolean> {
  const [salt, stored] = hash.split(':')
  const derived = await scryptAsync(password, salt, 64) as Buffer
  return derived.toString('hex') === stored
}
// Leave password: { hash, verify } out entirely to use the default bcrypt — recommended
```

```typescript
// ── autoSignIn behavior ────────────────────────────────────────────────────

// autoSignIn: true (default)
const { data } = await authClient.signUp.email({ name, email, password })
// data.session is immediately available — user is logged in ✅

// autoSignIn: false
const { data } = await authClient.signUp.email({ name, email, password })
// data.session is null — user must call signIn.email() separately
// Use case: require email verification before first login
```

```typescript
// ── Password validation — add custom rules before hitting BetterAuth ──────
import { z } from 'zod'

const passwordSchema = z
  .string()
  .min(8,  'Password must be at least 8 characters')
  .max(128, 'Password too long')
  .regex(/[A-Z]/,    'Must contain at least one uppercase letter')
  .regex(/[0-9]/,    'Must contain at least one number')
  .regex(/[^A-Za-z0-9]/, 'Must contain at least one special character')

// Validate in the form / API handler before passing to authClient.signUp
// BetterAuth enforces minLength/maxLength — additional rules live in your schema
```

---

## W — Why It Matters

- `maxPasswordLength: 128` is required to prevent a DoS attack — bcrypt is intentionally slow, so hashing an extremely long password (e.g. 1 MB) takes seconds per attempt. Capping at 128 characters eliminates this attack surface while being longer than any reasonable human password.
- `autoSignIn: false` is necessary when `requireEmailVerification: true` — if you auto sign-in but also require verification, the user gets a session but immediately hits a `EMAIL_NOT_VERIFIED` error on every protected route. The correct flow with verification: `autoSignIn: false`, send verification email, user verifies, then signs in.
- The default bcrypt (cost 10) is the right choice for almost all applications — it takes ~100ms per hash, which is imperceptible to users but makes brute force computationally expensive. Only change the hasher if you have a specific operational reason (migrating from an existing system with a different hash format).

---

## I — Interview Q&A

### Q: Why is there a `maxPasswordLength` limit in BetterAuth and what attack does it prevent?

**A:** The limit prevents a bcrypt denial-of-service attack. bcrypt is intentionally slow — its cost factor means each hash takes ~100ms of CPU time. This is good security for normal passwords. But bcrypt does not limit the input length — if you accept a 10 MB password string, bcrypt must process it entirely, taking seconds. An attacker can send many requests with extremely long passwords, exhausting server CPU with minimal effort. BetterAuth defaults to a 128-character maximum. This is well beyond any human-chosen password but prevents the attack. Note that bcrypt itself truncates at 72 bytes (an implementation detail), but having an explicit `maxPasswordLength` check before hashing provides a clear, documented security boundary.

---

## C — Common Pitfalls + Fix

### ❌ Setting `requireEmailVerification: true` without disabling `autoSignIn`

```typescript
// ❌ User gets a session but can't do anything — confusing UX
emailAndPassword: {
  enabled:                  true,
  autoSignIn:               true,    // ← creates session immediately ❌
  requireEmailVerification: true,    // ← but session is restricted ❌
}
// User signs up → gets session → every API call returns EMAIL_NOT_VERIFIED
```

**Fix:** Disable `autoSignIn` when requiring verification:

```typescript
// ✅ Clear flow: sign up → verify email → sign in manually
emailAndPassword: {
  enabled:                  true,
  autoSignIn:               false,   // don't create session until email verified
  requireEmailVerification: true,
}
```

---

## K — Coding Challenge + Solution

### Challenge

Write the `emailAndPassword` config block for a high-security app: minimum 12 chars, maximum 128, no auto sign-in, email verification required. Add a Zod schema for client-side password validation that also enforces: at least one uppercase, one number, one special character.

### Solution

```typescript
// auth.ts — emailAndPassword section
emailAndPassword: {
  enabled:                  true,
  minPasswordLength:        12,
  maxPasswordLength:        128,
  autoSignIn:               false,
  requireEmailVerification: true,
},

// ── Client-side Zod validation ────────────────────────────────────────────
import { z } from 'zod'

export const passwordSchema = z
  .string()
  .min(12,  'At least 12 characters required')
  .max(128, 'Maximum 128 characters')
  .regex(/[A-Z]/,        'At least one uppercase letter')
  .regex(/[0-9]/,        'At least one number')
  .regex(/[^A-Za-z0-9]/, 'At least one special character (!@#$...)')

export const signUpSchema = z.object({
  name:     z.string().min(2).max(100),
  email:    z.string().email(),
  password: passwordSchema,
  confirm:  z.string(),
}).refine(d => d.password === d.confirm, {
  message: 'Passwords do not match',
  path:    ['confirm'],
})
```

---

---
