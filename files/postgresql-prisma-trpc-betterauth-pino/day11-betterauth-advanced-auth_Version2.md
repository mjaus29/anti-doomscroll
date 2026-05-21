
# 📅 Day 11 — BetterAuth Advanced Auth

> **Goal:** Go beyond the basics — configure email verification, password reset, session control, OAuth providers, plugins, custom user fields, and understand how schema generation and migrations work for a production BetterAuth setup.
> **Format:** Each subtopic = 5–15 min. Do one. Stop. Come back.
> **Stack:** BetterAuth 1.5 · Prisma 7 · PostgreSQL 18 · Next.js 16 · TypeScript 6

---

## 📋 Day 11 Subtopic Overview

| # | Subtopic | Time |
|---|----------|------|
| 1 | Email/Password Options — Rules, Auto Sign-In, Custom Hashing | 10 min |
| 2 | Email Verification — Flow, Sending, Enforcing | 12 min |
| 3 | Password Reset — Flow, Token Lifecycle, Sending | 12 min |
| 4 | Session Control — Listing, Revoking, Rotating, Force Sign-Out | 10 min |
| 5 | OAuth Providers — Google and GitHub Setup | 12 min |
| 6 | Plugins — What They Are, Built-In Options, Wiring | 10 min |
| 7 | Extra User Fields — additionalFields, Input Control, Server-Side Setting | 12 min |
| 8 | Schema Generation and Migration Options | 10 min |

---

---

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

# 2 — Email Verification — Flow, Sending, Enforcing

---

## T — TL;DR

Email verification confirms that a user owns the email address they registered with. BetterAuth generates a signed verification token, stores it in the `verification` table, and calls your `sendVerificationEmail` callback so you can send it via any email provider. When the user clicks the link, BetterAuth marks `emailVerified: true` on the user.

---

## K — Key Concepts

```typescript
// auth.ts — email verification config
import { betterAuth }    from 'better-auth'
import { prismaAdapter } from 'better-auth/adapters/prisma'
import { prisma }        from '@/lib/prisma'
import { sendEmail }     from '@/lib/email'   // your email sending utility

export const auth = betterAuth({
  database: prismaAdapter(prisma, { provider: 'postgresql' }),

  emailAndPassword: {
    enabled:                  true,
    requireEmailVerification: true,   // blocks sign-in until verified
    autoSignIn:               false,
  },

  emailVerification: {
    // Called by BetterAuth when verification email needs to be sent
    sendVerificationEmail: async ({ user, url, token }) => {
      await sendEmail({
        to:      user.email,
        subject: 'Verify your email address',
        html:    `
          <h1>Welcome, ${user.name}!</h1>
          <p>Click the link below to verify your email address:</p>
          <a href="${url}">Verify Email</a>
          <p>This link expires in 24 hours.</p>
          <p>If you did not create an account, ignore this email.</p>
        `,
      })
    },

    // How long the verification token is valid (seconds)
    expiresIn: 60 * 60 * 24,   // 24 hours

    // Send verification email automatically on sign-up
    sendOnSignUp: true,

    // Auto sign-in after successful verification
    autoSignInAfterVerification: true,
  },
})
```

```typescript
// ── Email sending utility — using Resend ──────────────────────────────────
// src/lib/email.ts
import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY)

interface SendEmailInput {
  to:      string
  subject: string
  html:    string
}

export async function sendEmail({ to, subject, html }: SendEmailInput) {
  const { error } = await resend.emails.send({
    from: process.env.EMAIL_FROM!,  // e.g. 'MyApp <noreply@myapp.com>'
    to,
    subject,
    html,
  })
  if (error) throw new Error(`Email send failed: ${error.message}`)
}

// .env additions:
// RESEND_API_KEY="re_..."
// EMAIL_FROM="MyApp <noreply@myapp.com>"
```

```typescript
// ── Verification URL structure ─────────────────────────────────────────────
// BetterAuth generates: ${baseURL}/api/auth/verify-email?token=<token>&callbackURL=/dashboard
// The `url` param in sendVerificationEmail is this full URL ✅
// User clicks → GET /api/auth/verify-email?token=... → BetterAuth handles it

// ── Client: request a new verification email ──────────────────────────────
import { authClient } from '@/lib/auth-client'

// Resend verification (e.g. "Resend verification email" button)
const { error } = await authClient.sendVerificationEmail({
  email:       'mark@example.com',
  callbackURL: '/dashboard',   // where to redirect after successful verification
})
```

```typescript
// ── Verification page — handle the token in URL ───────────────────────────
// src/app/verify-email/page.tsx
// BetterAuth handles verification automatically via the catch-all route
// Just build the redirect target (callbackURL) — /dashboard, /onboarding, etc.

// If you need a custom verification page:
// Set the verification URL to point to your page, then call the API:
import { authClient } from '@/lib/auth-client'
import { useSearchParams } from 'next/navigation'

export function VerifyEmailPage() {
  const params = useSearchParams()
  const token  = params.get('token')

  // BetterAuth handles GET /api/auth/verify-email automatically
  // callbackURL in the link determines where the user lands after verification
  // You typically don't need a custom page — just set callbackURL correctly
  return <p>Verifying your email…</p>
}
```

```
── Verification flow — complete ──────────────────────────────────────────────

  1. User signs up (autoSignIn: false)
  2. BetterAuth calls sendVerificationEmail({ user, url, token })
     url = https://myapp.com/api/auth/verify-email?token=<token>&callbackURL=/dashboard
  3. Your code sends the email via Resend/Nodemailer/SES
  4. User clicks link in email
  5. GET /api/auth/verify-email?token=<token>
  6. BetterAuth: SELECT * FROM verification WHERE value = $1 AND expires_at > NOW()
  7. BetterAuth: UPDATE user SET email_verified = true WHERE id = $1
  8. BetterAuth: DELETE FROM verification WHERE id = $1
  9. If autoSignInAfterVerification: create session, set cookie
  10. Redirect to callbackURL (/dashboard)
```

---

## W — Why It Matters

- `sendOnSignUp: true` means BetterAuth calls your `sendVerificationEmail` callback automatically on registration — you don't need to manually trigger it after sign-up. If your email provider is down at sign-up time, the user can use the "resend" flow.
- `autoSignInAfterVerification: true` provides the smoothest UX — the user clicks the email link, their email is verified, they're automatically signed in, and they land on `/dashboard`. Without it, they land on a "email verified — please sign in" page, which adds unnecessary friction.
- Storing the verification token in the `verification` table (not in the URL signature alone) means you can invalidate tokens server-side — if a user requests a new verification email, you can delete the old token row, preventing old links from working.

---

## I — Interview Q&A

### Q: How does BetterAuth's email verification token system work, and where is the token stored?

**A:** When a verification email needs to be sent, BetterAuth generates a random token, stores it in the `verification` table with an `identifier` (the user's email), the token `value`, and an `expiresAt` timestamp. The full verification URL containing the token is passed to your `sendVerificationEmail` callback. When the user clicks the link, BetterAuth receives the `GET /api/auth/verify-email?token=<value>` request, queries the `verification` table to find a matching non-expired row, updates the user's `emailVerified` to `true`, and deletes the verification row (one-time use). If the token is expired or not found, the verification fails with an error. The token never lives only in the URL — the server-side record means you can revoke tokens by deleting rows.

---

## C — Common Pitfalls + Fix

### ❌ Not handling the case where email sending fails — user can never verify

```typescript
// ❌ Email failure is swallowed — user is stuck, can't verify
sendVerificationEmail: async ({ user, url }) => {
  await resend.emails.send({ to: user.email, subject: '...', html: url })
  // No error handling — if Resend is down, silent failure ❌
}
```

**Fix:** Log the error and implement a resend mechanism:

```typescript
// ✅ Log failure, user can request resend
sendVerificationEmail: async ({ user, url }) => {
  try {
    await sendEmail({ to: user.email, subject: 'Verify your email', html: `...${url}...` })
  } catch (err) {
    console.error(`[verify-email] Failed to send to ${user.email}:`, err)
    // Don't rethrow — sign-up still succeeded
    // User can use the "Resend verification email" button
  }
},
```

---

## K — Coding Challenge + Solution

### Challenge

Build a `ResendVerificationButton` React component that: (1) calls `authClient.sendVerificationEmail`, (2) shows a loading state, (3) shows success confirmation ("Check your inbox"), (4) shows an error if the request fails, (5) disables the button for 60 seconds after a successful send to prevent spam.

### Solution

```typescript
'use client'
import { useState, useEffect } from 'react'
import { authClient }          from '@/lib/auth-client'

export function ResendVerificationButton({ email }: { email: string }) {
  const [status,    setStatus]    = useState<'idle' | 'loading' | 'sent' | 'error'>('idle')
  const [cooldown,  setCooldown]  = useState(0)

  useEffect(() => {
    if (cooldown <= 0) return
    const timer = setTimeout(() => setCooldown(c => c - 1), 1000)
    return () => clearTimeout(timer)
  }, [cooldown])

  async function handleResend() {
    setStatus('loading')

    const { error } = await authClient.sendVerificationEmail({
      email,
      callbackURL: '/dashboard',
    })

    if (error) {
      setStatus('error')
      return
    }

    setStatus('sent')
    setCooldown(60)   // 60-second cooldown
  }

  if (status === 'sent')
    return <p style={{ color: 'green' }}>Check your inbox! ({cooldown}s before resend)</p>

  return (
    <div>
      <button
        onClick={handleResend}
        disabled={status === 'loading' || cooldown > 0}
      >
        {status === 'loading'
          ? 'Sending…'
          : cooldown > 0
            ? `Resend in ${cooldown}s`
            : 'Resend verification email'}
      </button>
      {status === 'error' && (
        <p style={{ color: 'red' }}>Failed to send. Please try again.</p>
      )}
    </div>
  )
}
```

---

---

# 3 — Password Reset — Flow, Token Lifecycle, Sending

---

## T — TL;DR

Password reset follows a three-step flow: (1) user requests reset by email, (2) BetterAuth generates a token, stores it in `verification`, and calls `sendResetPassword` so you send the email, (3) user submits new password with the token and BetterAuth updates the `account.password` hash. Configure in the `emailAndPassword` block.

---

## K — Key Concepts

```typescript
// auth.ts — password reset config (inside emailAndPassword block)
emailAndPassword: {
  enabled: true,

  // Called when user requests a password reset
  sendResetPassword: async ({ user, url, token }) => {
    await sendEmail({
      to:      user.email,
      subject: 'Reset your password',
      html: `
        <h2>Password Reset Request</h2>
        <p>Hi ${user.name},</p>
        <p>Click the link below to reset your password. This link expires in 1 hour.</p>
        <a href="${url}">Reset Password</a>
        <p>If you did not request this, ignore this email — your password will not change.</p>
      `,
    })
  },

  // Token lifetime (seconds) — default: 1 hour
  resetPasswordTokenExpiresIn: 60 * 60,
},
```

```typescript
// ── Step 1: Request reset ─────────────────────────────────────────────────
// Client — "Forgot password" page
import { authClient } from '@/lib/auth-client'

const { error } = await authClient.requestPasswordReset({
  email:       'mark@example.com',
  redirectTo:  '/reset-password',   // base URL for the reset link in the email
})
// error is null even if email not found — prevents email enumeration ✅
// BetterAuth always returns success regardless of whether email exists

// ── Step 2: User clicks link in email ─────────────────────────────────────
// Link format: https://myapp.com/reset-password?token=<token>
// Build a page at /reset-password to collect the new password

// ── Step 3: Submit new password ───────────────────────────────────────────
// src/app/reset-password/page.tsx (client component)
import { authClient }      from '@/lib/auth-client'
import { useSearchParams } from 'next/navigation'

const token = useSearchParams().get('token') ?? ''

const { error } = await authClient.resetPassword({
  token,
  newPassword: 'NewSecurePassword123!',
})

if (error?.code === 'INVALID_TOKEN') {
  // Token expired or already used
}
// On success: password updated, user should sign in with new password
```

```typescript
// ── Complete reset password page ──────────────────────────────────────────
'use client'
import { useState }      from 'react'
import { authClient }    from '@/lib/auth-client'
import { useSearchParams, useRouter } from 'next/navigation'

export function ResetPasswordForm() {
  const router       = useRouter()
  const searchParams = useSearchParams()
  const token        = searchParams.get('token') ?? ''

  const [password,  setPassword]  = useState('')
  const [error,     setError]     = useState<string | null>(null)
  const [loading,   setLoading]   = useState(false)
  const [success,   setSuccess]   = useState(false)

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!token) { setError('Invalid reset link.'); return }
    setLoading(true)
    setError(null)

    const { error } = await authClient.resetPassword({ token, newPassword: password })

    setLoading(false)

    if (error) {
      setError(
        error.code === 'INVALID_TOKEN'
          ? 'This reset link has expired or already been used. Please request a new one.'
          : 'Failed to reset password. Please try again.'
      )
      return
    }

    setSuccess(true)
    setTimeout(() => router.push('/sign-in'), 2000)
  }

  if (success) return <p>Password updated! Redirecting to sign in…</p>

  return (
    <form onSubmit={onSubmit}>
      <input
        type="password"
        required
        minLength={8}
        placeholder="New password"
        value={password}
        onChange={e => setPassword(e.target.value)}
      />
      {error && <p style={{ color: 'red' }}>{error}</p>}
      <button type="submit" disabled={loading || !token}>
        {loading ? 'Updating…' : 'Reset Password'}
      </button>
    </form>
  )
}
```

```
── Reset password flow — complete ────────────────────────────────────────────

  1. POST /api/auth/forget-password  { email }
     → BetterAuth: find user by email (silent success if not found)
     → INSERT INTO verification (identifier=email, value=token, expires_at=now+1h)
     → Call sendResetPassword({ user, url, token })
     → url = https://myapp.com/reset-password?token=<token>

  2. User clicks link → lands on /reset-password?token=<token>

  3. POST /api/auth/reset-password  { token, newPassword }
     → BetterAuth: SELECT * FROM verification WHERE value=$1 AND expires_at > NOW()
     → If not found/expired: return INVALID_TOKEN error
     → bcrypt(newPassword) → UPDATE account SET password = hash WHERE user_id = ...
     → DELETE FROM verification WHERE id = ... (one-time use)
     → Optionally: revoke all existing sessions (security best practice)
```

```typescript
// ── Revoking sessions on password reset — security best practice ──────────
// After a password reset, all existing sessions should be invalidated
// (someone else may have had access before the password was changed)

// BetterAuth handles this automatically in some versions
// For explicit control, do it in a server action after reset:
import { prisma } from '@/lib/prisma'

async function revokeAllSessionsAfterReset(userId: string) {
  await prisma.session.deleteMany({ where: { userId } })
  // All devices are now signed out — user must sign in with new password ✅
}
```

---

## W — Why It Matters

- BetterAuth's `requestPasswordReset` always returns success regardless of whether the email exists — this prevents email enumeration (an attacker discovering which emails are registered by observing different responses). Your UI should show "If an account with that email exists, you'll receive a reset link" regardless of the response.
- The reset token is one-time use — BetterAuth deletes the `verification` row after successful password reset. Even if an attacker intercepts the email link, they cannot reuse the token after the user has already reset their password.
- Revoking all sessions after a password reset is a critical security measure — if an attacker had access to the account (hence triggering the reset), any sessions they opened remain valid until expired unless explicitly revoked. Always delete all sessions for the user on successful password reset.

---

## I — Interview Q&A

### Q: Why does `requestPasswordReset` return success even when the email doesn't exist?

**A:** Returning different responses for "email found" vs "email not found" enables email enumeration — an attacker can determine whether any email address is registered in your system. With a large list of emails (from a data breach), they can silently map which ones have accounts, then target those accounts. By always returning the same response ("if this email exists, you'll get a link"), BetterAuth prevents enumeration at the cost of the user not knowing whether they typed their email correctly. The UX solution is to add a note: "Check your spam folder if you don't see the email, and verify the address is correct." This is a security vs UX trade-off that favors security.

---

## C — Common Pitfalls + Fix

### ❌ Not revoking sessions after password reset — compromised sessions persist

```typescript
// ❌ Password updated but old sessions still valid
const { error } = await authClient.resetPassword({ token, newPassword })
if (!error) router.push('/sign-in')
// Attacker who previously accessed the account still has a valid session ❌
```

**Fix:** Revoke all sessions after reset (server-side):

```typescript
// ✅ Server action: reset password + revoke all sessions
'use server'
import { auth }    from '@/lib/auth'
import { prisma }  from '@/lib/prisma'
import { headers } from 'next/headers'

export async function resetPasswordAction(token: string, newPassword: string) {
  // 1. BetterAuth resets the password
  const result = await auth.api.resetPassword({
    body: { token, newPassword }
  })
  if (!result) throw new Error('Invalid or expired token')

  // 2. Find the user by looking up the verification token first
  //    (token is consumed by resetPassword — get userId from the result)
  //    BetterAuth returns user info in the result
  await prisma.session.deleteMany({
    where: { userId: result.user.id }  // revoke all sessions ✅
  })

  return { success: true }
}
```

---

## K — Coding Challenge + Solution

### Challenge

Build the complete "Forgot Password" page: (1) a form with just an email input, (2) calls `authClient.requestPasswordReset`, (3) always shows a success message (no email enumeration), (4) disables the button for 120 seconds after submission to prevent spam, (5) includes a back-to-sign-in link.

### Solution

```typescript
'use client'
import { useState, useEffect } from 'react'
import { authClient }          from '@/lib/auth-client'
import Link                    from 'next/link'

export default function ForgotPasswordPage() {
  const [submitted, setSubmitted] = useState(false)
  const [loading,   setLoading]   = useState(false)
  const [cooldown,  setCooldown]  = useState(0)

  useEffect(() => {
    if (cooldown <= 0) return
    const t = setTimeout(() => setCooldown(c => c - 1), 1000)
    return () => clearTimeout(t)
  }, [cooldown])

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    const email = (new FormData(e.currentTarget)).get('email') as string

    await authClient.requestPasswordReset({
      email,
      redirectTo: '/reset-password',
    })
    // Always treat as success — no email enumeration ✅

    setLoading(false)
    setSubmitted(true)
    setCooldown(120)
  }

  return (
    <main style={{ maxWidth: 400, margin: '80px auto', padding: 24 }}>
      <h1>Forgot your password?</h1>

      {submitted ? (
        <div>
          <p>
            If an account with that email exists, you'll receive a reset link shortly.
            Check your spam folder if you don't see it.
          </p>
          {cooldown > 0 && (
            <button
              onClick={() => { setSubmitted(false) }}
              disabled={cooldown > 0}
            >
              Resend ({cooldown}s)
            </button>
          )}
        </div>
      ) : (
        <form onSubmit={onSubmit}>
          <label>
            Email address
            <input name="email" type="email" required autoComplete="email" />
          </label>
          <button type="submit" disabled={loading}>
            {loading ? 'Sending…' : 'Send reset link'}
          </button>
        </form>
      )}

      <p><Link href="/sign-in">← Back to sign in</Link></p>
    </main>
  )
}
```

---

---

# 4 — Session Control — Listing, Revoking, Rotating, Force Sign-Out

---

## T — TL;DR

BetterAuth exposes session management APIs for listing a user's active sessions, revoking specific sessions, revoking all other sessions, and forcing a sign-out from the server side. These power "Security" settings pages and admin account management features. All operations go through the `session` table — delete the row, and the session is dead.

---

## K — Key Concepts

```typescript
// ── List all active sessions for the current user ─────────────────────────
import { authClient } from '@/lib/auth-client'

const { data: sessions } = await authClient.listSessions()
// Returns: Session[] — all active (non-expired) sessions for the current user
// Each session: { id, token, ipAddress, userAgent, createdAt, expiresAt, isCurrent }

// ── Revoke a specific session by token ────────────────────────────────────
await authClient.revokeSession({ token: sessionId })
// Deletes that session row — that device is immediately signed out

// ── Revoke all OTHER sessions (keep current) ──────────────────────────────
await authClient.revokeOtherSessions()
// Use case: "Sign out of all other devices"
// Deletes all session rows for the user EXCEPT the current one
// User stays logged in on the current device ✅

// ── Change password + revoke all other sessions ───────────────────────────
await authClient.changePassword({
  currentPassword:       'OldPassword123!',
  newPassword:           'NewPassword456!',
  revokeOtherSessions:   true,   // sign out all other devices after password change
})
```

```typescript
// ── Server-side: force sign out a user (admin action) ─────────────────────
import { prisma } from '@/lib/prisma'

async function forceSignOutUser(userId: string): Promise<void> {
  await prisma.session.deleteMany({ where: { userId } })
  // All sessions for this user are now invalid
  // On next request, any device will get 401 and be redirected to sign-in
}

// ── Server-side: revoke a specific session by ID ─────────────────────────
async function adminRevokeSession(sessionId: string, userId: string): Promise<void> {
  // Always scope by userId — prevent one user revoking another's sessions
  await prisma.session.deleteMany({
    where: { id: sessionId, userId }
  })
}
```

```typescript
// ── Session rotation — refresh token on every request ─────────────────────
// BetterAuth auto-rotates session expiry (updateAge config) but doesn't
// change the token itself on every request (that would break multi-tab)

// For maximum security (e.g. banking app), rotate token on each request:
// This is NOT built into BetterAuth by default — implement via middleware:
import { NextRequest, NextResponse } from 'next/server'
import { auth }                      from '@/lib/auth'
import { prisma }                    from '@/lib/prisma'
import { randomBytes }               from 'crypto'

export async function middleware(req: NextRequest) {
  const session = await auth.api.getSession({ headers: req.headers })

  if (!session) return NextResponse.next()

  // Only rotate sessions older than 5 minutes (avoid rotating on every request)
  const sessionAge = Date.now() - session.session.createdAt.getTime()
  if (sessionAge < 5 * 60 * 1000) return NextResponse.next()

  // Issue new token, invalidate old
  const newToken = randomBytes(32).toString('hex')
  await prisma.session.update({
    where: { id: session.session.id },
    data:  { token: newToken, updatedAt: new Date() },
  })

  const response = NextResponse.next()
  response.cookies.set('better-auth.session-token', newToken, {
    httpOnly: true,
    secure:   process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path:     '/',
  })
  return response
}
// Use this pattern only if your threat model requires it — adds DB write per request
```

```typescript
// ── useSession + session list UI ──────────────────────────────────────────
'use client'
import { useState, useEffect } from 'react'
import { authClient }          from '@/lib/auth-client'

type SessionItem = {
  id:        string
  ipAddress: string | null
  userAgent: string | null
  createdAt: string
  isCurrent: boolean
}

export function ActiveSessions() {
  const [sessions, setSessions] = useState<SessionItem[]>([])

  async function load() {
    const { data } = await authClient.listSessions()
    if (data) setSessions(data as unknown as SessionItem[])
  }

  useEffect(() => { load() }, [])

  return (
    <ul>
      {sessions.map(s => (
        <li key={s.id}>
          <span>{s.userAgent ?? 'Unknown device'} — {s.ipAddress ?? 'Unknown IP'}</span>
          {s.isCurrent
            ? <strong> (this device)</strong>
            : <button onClick={async () => {
                await authClient.revokeSession({ token: s.id })
                load()
              }}>Sign out</button>
          }
        </li>
      ))}
      {sessions.length > 1 && (
        <button onClick={async () => {
          await authClient.revokeOtherSessions()
          load()
        }}>Sign out all other devices</button>
      )}
    </ul>
  )
}
```

---

## W — Why It Matters

- `revokeOtherSessions` is a critical security feature users expect — "I think someone else has access to my account, sign out all other devices" is a standard response to a suspected compromise. Build it into your settings page from day one.
- `changePassword` with `revokeOtherSessions: true` is the correct password change behavior — any device that had access with the old password is immediately invalidated. Without this, an attacker who obtained access retains it even after the user changes their password.
- Server-side `forceSignOutUser` is necessary for admin workflows — banning a user, disabling an account, or detecting fraud should immediately revoke all sessions, not wait for them to expire naturally.

---

## I — Interview Q&A

### Q: How do you immediately invalidate all sessions for a user in BetterAuth?

**A:** Since BetterAuth uses database-backed sessions, invalidating all sessions is a single Prisma query: `prisma.session.deleteMany({ where: { userId } })`. This deletes every session row for that user. On the user's next request (from any device), BetterAuth queries the sessions table, finds no valid session for that token, and returns an unauthenticated response — the user is redirected to sign-in. This is the correct implementation for: account banning, suspected compromise response, admin-forced sign-out, and after a password reset initiated by security team. The operation is instant — there's no waiting for tokens to expire as there would be with JWT-based auth.

---

## C — Common Pitfalls + Fix

### ❌ Not scoping session revocation by `userId` — security vulnerability

```typescript
// ❌ Any authenticated user could revoke any session by guessing IDs
async function revokeSession(sessionId: string) {
  await prisma.session.delete({ where: { id: sessionId } })  // ← no userId check ❌
}
```

**Fix:** Always scope by the authenticated user's ID:

```typescript
// ✅ User can only revoke their own sessions
async function revokeSession(sessionId: string, currentUserId: string) {
  const result = await prisma.session.deleteMany({
    where: { id: sessionId, userId: currentUserId }  // ← scoped ✅
  })
  if (result.count === 0) throw new Error('Session not found')
}
```

---

## K — Coding Challenge + Solution

### Challenge

Write a server-side `POST /api/me/sessions/revoke-all` route that: (1) reads the current session, (2) deletes all OTHER sessions for the user (keeps current), (3) returns a count of revoked sessions.

### Solution

```typescript
// src/app/api/me/sessions/revoke-all/route.ts
import { auth }        from '@/lib/auth'
import { prisma }      from '@/lib/prisma'
import { NextRequest } from 'next/server'

export async function POST(req: NextRequest) {
  const session = await auth.api.getSession({ headers: req.headers })
  if (!session) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Delete all sessions EXCEPT the current one
  const result = await prisma.session.deleteMany({
    where: {
      userId: session.user.id,
      id:     { not: session.session.id },   // keep current session ✅
    },
  })

  return Response.json({
    success:       true,
    revokedCount:  result.count,
    message:       `Signed out of ${result.count} other device(s).`,
  })
}
```

---

---

# 5 — OAuth Providers — Google and GitHub Setup

---

## T — TL;DR

OAuth providers let users sign in with an existing identity (Google, GitHub, etc.) without creating a password. BetterAuth handles the OAuth redirect dance, token exchange, and account linking. You provide the `clientId` and `clientSecret` from the provider's developer console. On first OAuth sign-in, BetterAuth creates both a `user` row and an `account` row with `providerId: 'google'` (or `'github'`).

---

## K — Key Concepts

```typescript
// auth.ts — OAuth providers config
import { betterAuth }    from 'better-auth'
import { prismaAdapter } from 'better-auth/adapters/prisma'
import { prisma }        from '@/lib/prisma'

export const auth = betterAuth({
  database: prismaAdapter(prisma, { provider: 'postgresql' }),

  emailAndPassword: { enabled: true },

  socialProviders: {
    // ── Google ─────────────────────────────────────────────────────────
    google: {
      clientId:     process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      // Optional: request additional scopes
      scope: ['openid', 'email', 'profile'],
    },

    // ── GitHub ─────────────────────────────────────────────────────────
    github: {
      clientId:     process.env.GITHUB_CLIENT_ID!,
      clientSecret: process.env.GITHUB_CLIENT_SECRET!,
      scope: ['read:user', 'user:email'],
    },
  },

  trustedOrigins: [process.env.NEXT_PUBLIC_APP_URL!],
})
```

```typescript
// ── Client-side: initiate OAuth flow ──────────────────────────────────────
import { authClient } from '@/lib/auth-client'

// Sign in with Google — redirects to Google, then back to callbackURL
await authClient.signIn.social({
  provider:    'google',
  callbackURL: '/dashboard',   // where to land after successful OAuth
})

// Sign in with GitHub
await authClient.signIn.social({
  provider:    'github',
  callbackURL: '/dashboard',
})

// ── Sign-in buttons ────────────────────────────────────────────────────────
'use client'
export function OAuthButtons() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      <button
        onClick={() => authClient.signIn.social({ provider: 'google', callbackURL: '/dashboard' })}
        type="button"
      >
        Continue with Google
      </button>
      <button
        onClick={() => authClient.signIn.social({ provider: 'github', callbackURL: '/dashboard' })}
        type="button"
      >
        Continue with GitHub
      </button>
    </div>
  )
}
```

```
── OAuth flow — complete ─────────────────────────────────────────────────────

  1. User clicks "Continue with Google"
  2. authClient.signIn.social({ provider: 'google', callbackURL: '/dashboard' })
     → GET /api/auth/social/google  (BetterAuth builds OAuth URL)
     → Redirect to https://accounts.google.com/o/oauth2/auth?client_id=...
  3. User signs in to Google, grants permissions
  4. Google redirects to: https://myapp.com/api/auth/callback/google?code=...
  5. BetterAuth: exchange code for access token (server-to-server)
  6. BetterAuth: fetch user info from Google (email, name, image)
  7. BetterAuth: check if user with email exists
     → Exists: link this Google account to existing user (INSERT INTO account)
     → New:    INSERT INTO user + INSERT INTO account (providerId: 'google')
  8. BetterAuth: INSERT INTO session → set session cookie
  9. Redirect to callbackURL (/dashboard)
```

```
── Provider setup — Google ───────────────────────────────────────────────────

  1. Go to: https://console.cloud.google.com/apis/credentials
  2. Create a new OAuth 2.0 Client ID (Web application)
  3. Authorized redirect URIs:
     http://localhost:3000/api/auth/callback/google    (dev)
     https://myapp.com/api/auth/callback/google        (production)
  4. Copy Client ID and Client Secret to .env:
     GOOGLE_CLIENT_ID="..."
     GOOGLE_CLIENT_SECRET="..."

── Provider setup — GitHub ───────────────────────────────────────────────────

  1. Go to: https://github.com/settings/applications/new
  2. Homepage URL: http://localhost:3000
  3. Authorization callback URL:
     http://localhost:3000/api/auth/callback/github    (dev)
     https://myapp.com/api/auth/callback/github        (production)
  4. Copy Client ID and Client Secret:
     GITHUB_CLIENT_ID="..."
     GITHUB_CLIENT_SECRET="..."
```

```typescript
// ── Account linking — same email, multiple providers ──────────────────────
// BetterAuth automatically links OAuth accounts to existing users by email
// If mark@example.com signs up with email/password first, then signs in with Google
// using the same email → BetterAuth adds a Google account row to the existing user
// The user now has two sign-in methods for the same account ✅

// Check which providers a user has linked:
const accounts = await prisma.account.findMany({
  where:  { userId: session.user.id },
  select: { providerId: true },
})
// accounts: [{ providerId: 'credential' }, { providerId: 'google' }]
```

---

## W — Why It Matters

- OAuth eliminates password management for users who use it — no password to forget, no password reset flow, no bcrypt overhead. For apps targeting consumers, offering Google/GitHub sign-in significantly increases conversion.
- The callback URL must be registered exactly in the provider's console — a trailing slash, `http` vs `https`, or wrong port will cause an `invalid_redirect_uri` error from the provider. Add both dev and production callback URLs during setup.
- Account linking by email is a security consideration — if your app allows email/password sign-in AND Google OAuth, and an attacker registers a Google account with the victim's email before the victim does, they could gain access. Mitigate by only linking accounts when the existing user's email is verified.

---

## I — Interview Q&A

### Q: What happens in BetterAuth when a user signs in with Google for the first time using an email that already has an account?

**A:** BetterAuth checks whether a user with that email already exists in the `user` table. If one exists, it creates a new `account` row with `providerId: 'google'` linked to the existing user — this is account linking. The user now has two authentication methods (email/password via the `credential` account, and Google via the `google` account) for the same user record. On subsequent Google sign-ins, BetterAuth finds the existing Google `account` row, loads the linked user, creates a new session, and signs them in. The user's `id` stays the same — all their application data remains accessible regardless of which sign-in method they use.

---

## C — Common Pitfalls + Fix

### ❌ Callback URL mismatch — "redirect_uri_mismatch" error from provider

```bash
# ❌ Registered in Google Console:
# http://localhost:3000/api/auth/callback/google

# But app is running on port 3001:
# BETTER_AUTH_URL=http://localhost:3001
# → Google receives redirect to localhost:3001 → mismatch error ❌
```

**Fix:** Register all actual URLs in the provider console:

```bash
# ✅ Register both in Google Console:
# http://localhost:3000/api/auth/callback/google
# http://localhost:3001/api/auth/callback/google   ← if you use a different port
# https://myapp.com/api/auth/callback/google       ← production

# And match BETTER_AUTH_URL exactly:
# BETTER_AUTH_URL=http://localhost:3001
```

---

## K — Coding Challenge + Solution

### Challenge

Write a complete sign-in page that offers: (1) email/password form, (2) "Continue with Google" button, (3) "Continue with GitHub" button, (4) a divider between OAuth and email/password, (5) a link to sign up. Handle loading state and errors. Keep it in one client component.

### Solution

```typescript
'use client'
import { useState }   from 'react'
import { authClient } from '@/lib/auth-client'
import { useRouter }  from 'next/navigation'
import Link           from 'next/link'

export default function SignInPage() {
  const router  = useRouter()
  const [error, setError]   = useState<string | null>(null)
  const [loading, setLoading] = useState<string | null>(null)

  async function handleEmailSignIn(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)
    setLoading('email')
    const fd       = new FormData(e.currentTarget)
    const { error } = await authClient.signIn.email({
      email:    fd.get('email') as string,
      password: fd.get('password') as string,
    })
    setLoading(null)
    if (error) { setError('Invalid email or password.'); return }
    router.push('/dashboard')
    router.refresh()
  }

  async function handleOAuth(provider: 'google' | 'github') {
    setLoading(provider)
    await authClient.signIn.social({ provider, callbackURL: '/dashboard' })
    // Page redirects — setLoading(null) not needed
  }

  return (
    <main style={{ maxWidth: 400, margin: '80px auto', padding: 24 }}>
      <h1>Sign In</h1>

      {/* OAuth buttons */}
      <button onClick={() => handleOAuth('google')} disabled={!!loading} type="button">
        {loading === 'google' ? 'Redirecting…' : 'Continue with Google'}
      </button>
      <button onClick={() => handleOAuth('github')} disabled={!!loading} type="button"
        style={{ marginTop: 8 }}>
        {loading === 'github' ? 'Redirecting…' : 'Continue with GitHub'}
      </button>

      {/* Divider */}
      <div style={{ display: 'flex', alignItems: 'center', margin: '16px 0' }}>
        <hr style={{ flex: 1 }} />
        <span style={{ margin: '0 8px', color: '#888' }}>or</span>
        <hr style={{ flex: 1 }} />
      </div>

      {/* Email/password form */}
      <form onSubmit={handleEmailSignIn}>
        <input name="email"    type="email"    required placeholder="Email"
          style={{ display: 'block', width: '100%', marginBottom: 8 }} />
        <input name="password" type="password" required placeholder="Password"
          style={{ display: 'block', width: '100%', marginBottom: 8 }} />
        {error && <p style={{ color: 'red' }}>{error}</p>}
        <button type="submit" disabled={!!loading} style={{ width: '100%' }}>
          {loading === 'email' ? 'Signing in…' : 'Sign In'}
        </button>
      </form>

      <p style={{ marginTop: 16 }}>
        <Link href="/forgot-password">Forgot password?</Link>
        {' · '}
        <Link href="/sign-up">Create account</Link>
      </p>
    </main>
  )
}
```

---

---

# 6 — Plugins — What They Are, Built-In Options, Wiring

---

## T — TL;DR

Plugins are composable feature modules added to the BetterAuth instance. They extend both the server (`auth.ts`) and the client (`auth-client.ts`) with new methods and endpoints. BetterAuth ships with plugins for two-factor auth, magic link, admin utilities, organization (multi-tenant), and more. Add the plugin to `plugins: []` on the server and the corresponding `...plugin()` to `createAuthClient`.

---

## K — Key Concepts

```typescript
// ── Plugin pattern — server and client must both be configured ─────────────

// auth.ts (server)
import { betterAuth }  from 'better-auth'
import { twoFactor }   from 'better-auth/plugins'
import { magicLink }   from 'better-auth/plugins'
import { admin }       from 'better-auth/plugins'

export const auth = betterAuth({
  // ...
  plugins: [
    twoFactor(),
    magicLink({
      sendMagicLink: async ({ email, url }) => {
        await sendEmail({ to: email, subject: 'Your sign-in link', html: `<a href="${url}">Sign in</a>` })
      },
    }),
    admin(),
  ],
})

// auth-client.ts (client) — must mirror server plugins
import { createAuthClient } from 'better-auth/react'
import { twoFactorClient }  from 'better-auth/client/plugins'
import { magicLinkClient }  from 'better-auth/client/plugins'
import { adminClient }      from 'better-auth/client/plugins'

export const authClient = createAuthClient({
  baseURL: process.env.NEXT_PUBLIC_APP_URL,
  plugins: [
    twoFactorClient(),
    magicLinkClient(),
    adminClient(),
  ],
})
```

```typescript
// ── Two-Factor Authentication plugin ─────────────────────────────────────
import { twoFactor } from 'better-auth/plugins'

// Server:
plugins: [
  twoFactor({
    issuer: 'MyApp',   // shown in authenticator app
    // totpOptions: { digits: 6, period: 30 }  // defaults
  }),
]

// Client usage:
// Enable 2FA for the current user (returns TOTP secret + QR code URI)
const { data } = await authClient.twoFactor.enable({
  password: 'currentPassword',
})
// data.totpURI → show QR code to user (use qrcode library to render)
// data.backupCodes → show once, store securely

// Verify TOTP code (during 2FA setup)
await authClient.twoFactor.verifyTotp({ code: '123456' })

// Sign in with 2FA (second step after email/password succeeds)
await authClient.twoFactor.verifyTotp({ code: '123456' })

// Disable 2FA
await authClient.twoFactor.disable({ password: 'currentPassword' })
```

```typescript
// ── Magic Link plugin ─────────────────────────────────────────────────────
import { magicLink }       from 'better-auth/plugins'
import { magicLinkClient } from 'better-auth/client/plugins'

// Server:
plugins: [
  magicLink({
    sendMagicLink: async ({ email, url, token }) => {
      await sendEmail({
        to:      email,
        subject: 'Your sign-in link',
        html:    `<a href="${url}">Sign in to MyApp</a><p>Expires in 5 minutes.</p>`,
      })
    },
    expiresIn: 60 * 5,   // 5 minutes
  })
]

// Client usage:
const authClient = createAuthClient({
  baseURL: process.env.NEXT_PUBLIC_APP_URL,
  plugins: [magicLinkClient()],
})

// Request a magic link
await authClient.signIn.magicLink({
  email:       'mark@example.com',
  callbackURL: '/dashboard',
})
// User receives email with link → clicks → automatically signed in
```

```typescript
// ── Admin plugin ───────────────────────────────────────────────────────────
import { admin }       from 'better-auth/plugins'
import { adminClient } from 'better-auth/client/plugins'

// Server:
plugins: [
  admin({
    // Users with this role can use admin functions
    defaultRole: 'user',
    adminRole:   'admin',
  })
]

// Client:
const authClient = createAuthClient({ plugins: [adminClient()] })

// Admin operations (require role: 'admin'):
await authClient.admin.listUsers({ limit: 50 })
await authClient.admin.banUser({ userId: '...', banReason: 'Spam' })
await authClient.admin.unbanUser({ userId: '...' })
await authClient.admin.setRole({ userId: '...', role: 'moderator' })
await authClient.admin.impersonateUser({ userId: '...' })   // debug as user
await authClient.admin.stopImpersonating()
```

```typescript
// ── Plugin schema additions ────────────────────────────────────────────────
// Some plugins add columns to existing tables or new tables
// Run `better-auth generate` after adding plugins to see schema changes

// twoFactor plugin adds to User table:
// twoFactorEnabled    Boolean  @default(false)
// twoFactorMethod     String?

// Run after adding plugins:
// npx better-auth generate
// npx prisma migrate dev --name add-two-factor
```

---

## W — Why It Matters

- Plugins extend BetterAuth without modifying the core — you can add 2FA or magic link without changing sign-in/sign-out logic. Each plugin is opt-in, so you only add the complexity your app needs.
- The server-client symmetry rule is critical — if you add a plugin to the server `plugins: []` but forget to add the corresponding client plugin to `createAuthClient`, the client methods won't exist. TypeScript won't warn you because the client doesn't know what plugins the server has. Always update both files together.
- After adding a plugin, always re-run `better-auth generate` and `prisma migrate dev` — plugins often add columns (like `twoFactorEnabled`) or tables (like `twoFactorBackupCode`) that must exist before the plugin can function.

---

## I — Interview Q&A

### Q: How do BetterAuth plugins work and what do you need to configure on both server and client?

**A:** BetterAuth plugins are modules that extend the auth instance with new HTTP endpoints, new database operations, and new TypeScript types. On the server side, you add the plugin to the `plugins: []` array in `betterAuth({ ... })`. The plugin registers new API routes under `/api/auth/*`, may add fields to existing tables or create new tables, and adds methods to `auth.api`. On the client side, you add the corresponding client plugin to `createAuthClient({ plugins: [] })`. The client plugin adds typed methods to the `authClient` object — for example, `twoFactorClient()` adds `authClient.twoFactor.enable()`, `authClient.twoFactor.verifyTotp()`, etc. Both sides must be configured — the server handles the logic, the client provides the typed interface to call it. After adding plugins, run `better-auth generate` to see any schema additions, then `prisma migrate dev` to apply them.

---

## C — Common Pitfalls + Fix

### ❌ Adding server plugin but forgetting client plugin — TypeScript error on usage

```typescript
// ✅ Server has twoFactor plugin
plugins: [twoFactor()]

// ❌ Client missing twoFactorClient
export const authClient = createAuthClient({ baseURL: '...' })
// No plugins array — authClient.twoFactor does not exist

authClient.twoFactor.enable(...)   // TypeError: Cannot read properties of undefined ❌
```

**Fix:** Always mirror server plugins in the client:

```typescript
// ✅ Both server and client configured
// auth.ts
plugins: [twoFactor()]

// auth-client.ts
import { twoFactorClient } from 'better-auth/client/plugins'
export const authClient = createAuthClient({
  baseURL: process.env.NEXT_PUBLIC_APP_URL,
  plugins: [twoFactorClient()],   // ← mirrors server ✅
})
// authClient.twoFactor.enable() now exists and is typed ✅
```

---

## K — Coding Challenge + Solution

### Challenge

Wire up the `admin` plugin on both server and client. Then write an `AdminUserList` server component that: (1) verifies the current user is an admin, (2) fetches the 20 most recent users directly via Prisma (not admin client), (3) displays id, email, role, emailVerified, createdAt. Include the auth check pattern.

### Solution

```typescript
// auth.ts — add admin plugin
import { admin } from 'better-auth/plugins'
plugins: [admin({ defaultRole: 'user', adminRole: 'admin' })]

// auth-client.ts — mirror client plugin
import { adminClient } from 'better-auth/client/plugins'
export const authClient = createAuthClient({
  baseURL: process.env.NEXT_PUBLIC_APP_URL,
  plugins: [adminClient()],
})

// src/app/admin/users/page.tsx — Server Component
import { auth }     from '@/lib/auth'
import { prisma }   from '@/lib/prisma'
import { headers }  from 'next/headers'
import { redirect } from 'next/navigation'

export default async function AdminUsersPage() {
  // Auth + role check
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session)                         redirect('/sign-in')
  if (session.user.role !== 'admin')    redirect('/dashboard')

  // Fetch users directly via Prisma
  const users = await prisma.user.findMany({
    select: {
      id:            true,
      email:         true,
      name:          true,
      role:          true,
      emailVerified: true,
      createdAt:     true,
    },
    orderBy: { createdAt: 'desc' },
    take:    20,
  })

  return (
    <main>
      <h1>Users ({users.length})</h1>
      <table>
        <thead>
          <tr>
            <th>Email</th><th>Name</th><th>Role</th>
            <th>Verified</th><th>Created</th>
          </tr>
        </thead>
        <tbody>
          {users.map(u => (
            <tr key={u.id}>
              <td>{u.email}</td>
              <td>{u.name}</td>
              <td>{u.role}</td>
              <td>{u.emailVerified ? '✅' : '❌'}</td>
              <td>{u.createdAt.toLocaleDateString()}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </main>
  )
}
```

---

---

# 7 — Extra User Fields — additionalFields, Input Control, Server-Side Setting

---

## T — TL;DR

`user.additionalFields` extends the `user` table with custom columns beyond BetterAuth's defaults. Each field has a `type`, `defaultValue`, and an `input` flag — `input: false` means the client cannot set this field during sign-up (server-controlled fields like `role` and `plan`). Server-side updates use `auth.api.updateUser` or direct Prisma queries.

---

## K — Key Concepts

```typescript
// auth.ts — additionalFields full config
user: {
  additionalFields: {
    // ── Server-controlled fields (input: false) ───────────────────────
    role: {
      type:         'string',
      defaultValue: 'user',
      input:        false,    // client CANNOT set this on sign-up or updateUser
      // Client trying to set role: silently ignored by BetterAuth
    },
    plan: {
      type:         'string',
      defaultValue: 'free',
      input:        false,
    },
    bannedAt: {
      type:         'date',    // 'string' | 'number' | 'boolean' | 'date'
      required:     false,     // nullable
      input:        false,
    },

    // ── User-controllable fields (input: true) ────────────────────────
    username: {
      type:     'string',
      required: false,
      input:    true,   // client CAN set on sign-up and updateUser
    },
    bio: {
      type:     'string',
      required: false,
      input:    true,
    },
    timezone: {
      type:         'string',
      defaultValue: 'UTC',
      input:        true,
    },
  },
},
```

```typescript
// ── Generated schema additions — from `better-auth generate` ──────────────
// BetterAuth will show these additions to the User model:
// role     String   @default("user")
// plan     String   @default("free")
// bannedAt DateTime?
// username String?
// bio      String?
// timezone String   @default("UTC")

// Add these fields to your User model in schema.prisma
// then run: npx prisma migrate dev --name add-user-custom-fields
```

```typescript
// ── Client: set user-input fields on sign-up ──────────────────────────────
const { data, error } = await authClient.signUp.email({
  name:     'Mark Austin',
  email:    'mark@example.com',
  password: 'Password123!',
  username: 'mark97',       // input: true — accepted ✅
  bio:      'Developer',    // input: true — accepted ✅
  role:     'admin',        // input: false — silently ignored ✅ (stays 'user')
})

// ── Client: update user-input fields after sign-up ────────────────────────
const { error } = await authClient.updateUser({
  name:     'Mark A.',
  username: 'mark_austin',
  bio:      'Full-stack dev',
  timezone: 'Asia/Manila',
  // role: 'admin',   ← input: false — silently ignored
})
```

```typescript
// ── Server-side: update server-controlled fields ──────────────────────────
// Use Prisma directly for fields with input: false
// (BetterAuth's updateUser API enforces the input: false restriction)

import { prisma } from '@/lib/prisma'

// Upgrade user to admin (admin action)
async function setUserRole(userId: string, role: string): Promise<void> {
  await prisma.user.update({
    where: { id: userId },
    data:  { role },
  })
}

// Upgrade plan after payment
async function upgradePlan(userId: string, plan: string): Promise<void> {
  await prisma.user.update({
    where: { id: userId },
    data:  { plan },
  })
}

// Ban user
async function banUser(userId: string): Promise<void> {
  await prisma.$transaction([
    prisma.user.update({
      where: { id: userId },
      data:  { bannedAt: new Date() },
    }),
    prisma.session.deleteMany({ where: { userId } }),  // revoke all sessions ✅
  ])
}
```

```typescript
// ── TypeScript: accessing custom fields on the session object ──────────────
import { Session } from '@/lib/auth'

// session.user.role    → string (typed because of additionalFields config)
// session.user.plan    → string
// session.user.username → string | null (required: false)

const session = await auth.api.getSession({ headers: await headers() })
if (session) {
  const role = session.user.role    // typed as string ✅
  const plan = session.user.plan    // typed as string ✅
}

// ── Expose only safe fields in API responses ───────────────────────────────
// Never expose bannedAt or internal fields in client-facing responses
function toPublicUser(user: typeof session.user) {
  return {
    id:       user.id,
    name:     user.name,
    username: user.username,
    image:    user.image,
    // role:  omit from public profile (depends on use case)
  }
}
```

---

## W — Why It Matters

- `input: false` is the security boundary for privileged fields — without it, any user could set `role: 'admin'` in the sign-up request body and become an admin. BetterAuth enforces this at the API level, but you must declare it correctly in config.
- Custom fields on the `User` model mean you don't need a separate `UserProfile` table for basic profile data — `username`, `bio`, `timezone`, `avatar` can all live on the user row. This simplifies queries: `prisma.user.findUnique({ where: { id } })` returns everything.
- After changing `additionalFields`, you must: (1) re-run `better-auth generate` to see the schema diff, (2) update `schema.prisma` manually, (3) run `prisma migrate dev`. The types are inferred from the config — TypeScript will show the new fields on `session.user` after regenerating.

---

## I — Interview Q&A

### Q: What is the purpose of `input: false` on additional user fields in BetterAuth?

**A:** `input: false` marks a field as server-controlled — the BetterAuth API will silently ignore any value the client provides for that field during sign-up or profile updates. This is critical for security-sensitive fields. Without `input: false` on the `role` field, a malicious user could include `"role": "admin"` in their sign-up request body and BetterAuth would write it to the database — instant privilege escalation. With `input: false`, even if the client sends a `role` value, BetterAuth strips it before writing to the database, and the default value is used instead. Server-side code (your Prisma queries, admin actions, webhook handlers) can still update these fields directly because they bypass BetterAuth's API layer.

---

## C — Common Pitfalls + Fix

### ❌ Forgetting `input: false` on the `role` field — privilege escalation vulnerability

```typescript
// ❌ role is user-settable — anyone can become admin
user: {
  additionalFields: {
    role: {
      type:         'string',
      defaultValue: 'user',
      // input: false MISSING ← user can POST role: 'admin' on sign-up ❌
    },
  },
},
```

**Fix:** Always add `input: false` to privileged fields:

```typescript
// ✅ Server-controlled — client cannot set
user: {
  additionalFields: {
    role: {
      type:         'string',
      defaultValue: 'user',
      input:        false,   // ← required for security ✅
    },
  },
},
```

---

## K — Coding Challenge + Solution

### Challenge

Add `username` (user-settable, unique, regex-validated), `bio` (user-settable, max 500 chars), and `plan` (server-only, default `'free'`) to the user. Write: (1) the `additionalFields` config, (2) the Prisma model additions, (3) a `PATCH /api/me/profile` route that validates with Zod and calls Prisma to update only `username` and `bio`.

### Solution

```typescript
// auth.ts — additionalFields
user: {
  additionalFields: {
    username: {
      type:     'string',
      required: false,
      input:    true,
    },
    bio: {
      type:     'string',
      required: false,
      input:    true,
    },
    plan: {
      type:         'string',
      defaultValue: 'free',
      input:        false,
    },
  },
},
```

```prisma
// schema.prisma — User model additions
model User {
  // ... BetterAuth required fields ...
  username  String?  @unique
  bio       String?
  plan      String   @default("free")

  @@map("user")
}
```

```typescript
// src/app/api/me/profile/route.ts
import { auth }        from '@/lib/auth'
import { prisma }      from '@/lib/prisma'
import { z }           from 'zod'
import { NextRequest } from 'next/server'

const schema = z.object({
  username: z.string()
    .regex(/^[a-z0-9_]+$/, 'Lowercase letters, numbers, and underscores only')
    .min(3).max(30)
    .optional(),
  bio: z.string().max(500).optional(),
}).refine(d => d.username !== undefined || d.bio !== undefined, {
  message: 'Provide at least one field to update',
})

export async function PATCH(req: NextRequest) {
  const session = await auth.api.getSession({ headers: req.headers })
  if (!session) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const parsed = schema.safeParse(await req.json().catch(() => ({})))
  if (!parsed.success) {
    return Response.json({ error: 'validation', issues: parsed.error.flatten().fieldErrors }, { status: 400 })
  }

  try {
    const updated = await prisma.user.update({
      where:  { id: session.user.id },
      data:   parsed.data,
      select: { id: true, username: true, bio: true, updatedAt: true },
    })
    return Response.json({ user: updated })
  } catch (err: any) {
    if (err?.code === 'P2002') {
      return Response.json({ error: 'username_taken', message: 'Username already in use.' }, { status: 422 })
    }
    throw err
  }
}
```

---

---

# 8 — Schema Generation and Migration Options

---

## T — TL;DR

`npx better-auth generate` reads your `auth.ts` config and outputs the required Prisma model definitions. It does not run migrations — you copy the output into `schema.prisma` and run `prisma migrate dev` yourself. Re-run `generate` after adding plugins or `additionalFields` to see what schema changes are required. Production migrations use `prisma migrate deploy`.

---

## K — Key Concepts

```bash
# ── Generate schema models from auth config ───────────────────────────────
npx better-auth generate

# Output: Prisma model blocks for User, Session, Account, Verification
# Plus any plugin additions (e.g. twoFactor fields, magic link tables)
# Prints to stdout — copy into your schema.prisma

# ── With output flag — write to a file ────────────────────────────────────
npx better-auth generate --output prisma/auth.prisma
# Creates/overwrites the file — then review and merge into schema.prisma
# Or if using multi-file schema (Prisma 7): keep as prisma/auth.prisma directly

# ── With custom schema path ───────────────────────────────────────────────
npx better-auth generate --config src/lib/auth.ts
# Specify auth.ts location if not at default path
```

```bash
# ── Migration workflow — development ──────────────────────────────────────

# 1. Update auth.ts (add plugin, additionalFields, etc.)
# 2. Generate updated schema models
npx better-auth generate

# 3. Copy/update models in schema.prisma
# (or review prisma/auth.prisma if using output flag)

# 4. Create and apply migration
npx prisma migrate dev --name describe-what-changed
# e.g. --name add-two-factor-fields
# e.g. --name add-username-bio-to-user
# e.g. --name add-betterauth-tables

# 5. Regenerate Prisma Client
npx prisma generate

# ── Migration workflow — production ──────────────────────────────────────
# prisma migrate deploy applies pending migrations without prompts
# Run this in your deployment pipeline BEFORE starting the app:

npx prisma migrate deploy
npx prisma generate   # if not in postinstall
# Start app
```

```typescript
// ── Multi-file schema — recommended for Prisma 7 ──────────────────────────
// Keep auth models in a separate file from application models

// prisma/auth.prisma — BetterAuth tables (generated by better-auth generate)
model User { ... }
model Session { ... }
model Account { ... }
model Verification { ... }

// prisma/app.prisma — your application tables
model Order { ... }
model Product { ... }
model Category { ... }

// prisma/schema.prisma — config only
generator client {
  provider = "prisma-client-js"
}
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}
// Prisma 7 auto-merges all .prisma files in the prisma/ directory ✅

// Benefit: BetterAuth schema updates don't require touching your app schema
// Re-run: npx better-auth generate --output prisma/auth.prisma → overwrite cleanly
```

```bash
# ── Checking for schema drift ─────────────────────────────────────────────
# If you upgrade BetterAuth, re-run generate to see if new fields are required:
npx better-auth generate

# Compare output to current schema.prisma
# Any new fields/tables need a new migration

# ── Introspect existing DB (if starting with an existing database) ─────────
npx prisma db pull
# Reads current PostgreSQL schema → writes/updates schema.prisma
# Then: npx prisma generate to update Prisma Client

# ── Reset dev database (destructive — dev only) ────────────────────────────
npx prisma migrate reset
# Drops all tables → re-applies all migrations from scratch
# Useful when migrations get into an inconsistent state in dev
```

```
── Deployment checklist with migrations ─────────────────────────────────────

  CI/CD pipeline order:
  1. npm install                          → installs dependencies
  2. npx prisma generate                  → generates Prisma Client
  3. npx prisma migrate deploy            → applies pending SQL migrations
  4. (build step)                         → npm run build
  5. (start step)                         → npm start

  Vercel — add to package.json:
  "build": "prisma generate && prisma migrate deploy && next build"

  Never run `prisma migrate dev` in production:
  → migrate dev creates shadow DB, resets if needed — destructive in production
  → migrate deploy is safe: only applies new pending migrations, never resets

  Migration files in prisma/migrations/ must be committed to git:
  → They are the source of truth for what has been applied
  → DO NOT edit migration files after they've been applied to any environment
```

```typescript
// ── Seeding — populate initial data after migration ───────────────────────
// prisma/seed.ts
import { prisma } from '../src/lib/prisma'
import { auth }   from '../src/lib/auth'

async function main() {
  // Create admin user via BetterAuth API (hashes password correctly)
  const { user } = await auth.api.signUpEmail({
    body: {
      name:     'Admin User',
      email:    process.env.ADMIN_EMAIL!,
      password: process.env.ADMIN_PASSWORD!,
    }
  })

  // Set admin role directly via Prisma (input: false field)
  await prisma.user.update({
    where: { id: user.id },
    data:  { role: 'admin', plan: 'enterprise' },
  })

  console.log(`Admin created: ${user.email}`)
}

main().catch(console.error).finally(() => prisma.$disconnect())

// package.json:
// "prisma": { "seed": "ts-node prisma/seed.ts" }
// Run: npx prisma db seed
```

---

## W — Why It Matters

- `better-auth generate` outputs only model declarations — it does not modify your database. You always control when schema changes are applied via `prisma migrate dev/deploy`. This separation prevents accidental schema changes on production.
- Keeping auth models in `prisma/auth.prisma` (separate file) and app models in `prisma/app.prisma` means you can re-run `better-auth generate --output prisma/auth.prisma` to cleanly update auth models after a BetterAuth upgrade, without touching your app schema file.
- Never use `prisma migrate dev` in production — it has a `--force-reset` behavior and requires an interactive prompt. `prisma migrate deploy` is the safe, CI-friendly command — it applies only unapplied migrations in order, is idempotent, and never drops data.

---

## I — Interview Q&A

### Q: What is the difference between `prisma migrate dev` and `prisma migrate deploy`?

**A:** `prisma migrate dev` is for development — it compares the current database state with your schema, generates a new SQL migration file if there are changes, and applies it. It also has a `--reset` capability that can drop and recreate the database, and it requires an interactive prompt. It is not safe for production. `prisma migrate deploy` is for production — it only applies migration files that haven't been applied yet (tracked in the `_prisma_migrations` table), never generates new migrations, never resets the database, requires no interaction, and is idempotent. Run `migrate deploy` in your CI/CD pipeline before starting the app. The typical order: `npm install` → `prisma generate` → `prisma migrate deploy` → start app.

---

## C — Common Pitfalls + Fix

### ❌ Running `prisma migrate dev` in production — potential data loss

```bash
# ❌ In a production deployment script
RUN npx prisma migrate dev   # can reset the database if migration history is broken ❌
```

**Fix:** Always use `migrate deploy` in production:

```bash
# ✅ Safe production migration
RUN npx prisma migrate deploy   # applies pending migrations only, never resets ✅
RUN npx prisma generate
```

---

## K — Coding Challenge + Solution

### Challenge

Write the complete deployment setup for a BetterAuth + Prisma app on Vercel: (1) `package.json` build script that runs generate and migrate deploy before Next.js build; (2) the multi-file prisma schema structure (filenames and what goes in each); (3) a seed script that creates an admin user; (4) a `vercel.json` that sets the build command.

### Solution

```json
// package.json
{
  "scripts": {
    "dev":         "next dev",
    "build":       "prisma generate && prisma migrate deploy && next build",
    "start":       "next start",
    "postinstall": "prisma generate",
    "db:migrate":  "prisma migrate dev",
    "db:seed":     "ts-node --compiler-options '{\"module\":\"CommonJS\"}' prisma/seed.ts",
    "db:studio":   "prisma studio"
  },
  "prisma": {
    "seed": "ts-node --compiler-options '{\"module\":\"CommonJS\"}' prisma/seed.ts"
  }
}
```

```
// Multi-file prisma schema structure

prisma/
├── schema.prisma      ← generator + datasource config ONLY
├── auth.prisma        ← BetterAuth tables (User, Session, Account, Verification)
└── app.prisma         ← application tables (Order, Product, etc.)
```

```prisma
// prisma/schema.prisma — config only
generator client {
  provider        = "prisma-client-js"
  binaryTargets   = ["native", "rhel-openssl-3.0.x"]  // Vercel target
}

datasource db {
  provider  = "postgresql"
  url       = env("DATABASE_URL")
  directUrl = env("DIRECT_DATABASE_URL")
}
```

```prisma
// prisma/auth.prisma — BetterAuth tables (output of better-auth generate)
model User {
  id            String    @id @default(cuid())
  name          String
  email         String    @unique
  emailVerified Boolean   @default(false) @map("email_verified")
  image         String?
  role          String    @default("user")
  plan          String    @default("free")
  username      String?   @unique
  bio           String?
  createdAt     DateTime  @default(now()) @map("created_at")
  updatedAt     DateTime  @updatedAt      @map("updated_at")
  sessions      Session[]
  accounts      Account[]
  @@map("user")
}

model Session {
  id        String   @id @default(cuid())
  expiresAt DateTime @map("expires_at")
  token     String   @unique
  createdAt DateTime @default(now()) @map("created_at")
  updatedAt DateTime @updatedAt      @map("updated_at")
  ipAddress String?  @map("ip_address")
  userAgent String?  @map("user_agent")
  userId    String   @map("user_id")
  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  @@index([userId, expiresAt])
  @@map("session")
}

model Account {
  id                    String    @id @default(cuid())
  accountId             String    @map("account_id")
  providerId            String    @map("provider_id")
  userId                String    @map("user_id")
  user                  User      @relation(fields: [userId], references: [id], onDelete: Cascade)
  accessToken           String?   @map("access_token")
  refreshToken          String?   @map("refresh_token")
  idToken               String?   @map("id_token")
  accessTokenExpiresAt  DateTime? @map("access_token_expires_at")
  refreshTokenExpiresAt DateTime? @map("refresh_token_expires_at")
  scope                 String?
  password              String?
  createdAt             DateTime  @default(now()) @map("created_at")
  updatedAt             DateTime  @updatedAt      @map("updated_at")
  @@map("account")
}

model Verification {
  id         String    @id @default(cuid())
  identifier String
  value      String
  expiresAt  DateTime  @map("expires_at")
  createdAt  DateTime? @default(now()) @map("created_at")
  updatedAt  DateTime? @updatedAt      @map("updated_at")
  @@index([identifier])
  @@map("verification")
}
```

```typescript
// prisma/seed.ts
import { PrismaClient } from '@prisma/client'
import { betterAuth }    from 'better-auth'
import { prismaAdapter } from 'better-auth/adapters/prisma'

const prisma = new PrismaClient()

const auth = betterAuth({
  baseURL:  process.env.BETTER_AUTH_URL!,
  secret:   process.env.BETTER_AUTH_SECRET!,
  database: prismaAdapter(prisma, { provider: 'postgresql' }),
  emailAndPassword: { enabled: true },
  user: {
    additionalFields: {
      role: { type: 'string', defaultValue: 'user', input: false },
      plan: { type: 'string', defaultValue: 'free', input: false },
    }
  }
})

async function main() {
  const email    = process.env.ADMIN_EMAIL    ?? 'admin@example.com'
  const password = process.env.ADMIN_PASSWORD ?? 'AdminPassword123!'
  const name     = 'Admin'

  // Check if already seeded
  const existing = await prisma.user.findUnique({ where: { email } })
  if (existing) {
    console.log('Admin already exists — skipping seed')
    return
  }

  const { user } = await auth.api.signUpEmail({
    body: { name, email, password }
  })

  await prisma.user.update({
    where: { id: user.id },
    data:  { role: 'admin', plan: 'enterprise', emailVerified: true },
  })

  console.log(`✅ Admin created: ${email}`)
}

main()
  .catch(e => { console.error(e); process.exit(1) })
  .finally(() => prisma.$disconnect())
```

```json
// vercel.json
{
  "buildCommand": "npm run build",
  "framework": "nextjs"
}
```

---

## ✅ Day 11 Complete — BetterAuth Advanced Auth

| # | Subtopic | Status |
|---|----------|--------|
| 1 | Email/Password Options — Rules, Auto Sign-In, Custom Hashing | ☐ |
| 2 | Email Verification — Flow, Sending, Enforcing | ☐ |
| 3 | Password Reset — Flow, Token Lifecycle, Sending | ☐ |
| 4 | Session Control — Listing, Revoking, Rotating, Force Sign-Out | ☐ |
| 5 | OAuth Providers — Google and GitHub Setup | ☐ |
| 6 | Plugins — What They Are, Built-In Options, Wiring | ☐ |
| 7 | Extra User Fields — additionalFields, Input Control, Server-Side Setting | ☐ |
| 8 | Schema Generation and Migration Options | ☐ |

---

## 🗺️ One-Page Mental Model — Day 11

```
EMAIL/PASSWORD OPTIONS
  minPasswordLength / maxPasswordLength   → cap at 128 (DoS prevention)
  autoSignIn: false                       → required when using email verification
  requireEmailVerification                → blocks sign-in until email confirmed
  password: { hash, verify }             → custom hasher (default bcrypt cost 10)
  Password validation: Zod schema on client + BetterAuth enforces min/max server-side

EMAIL VERIFICATION
  sendVerificationEmail: async ({ user, url }) → your email provider sends the link
  url = ${baseURL}/api/auth/verify-email?token=...&callbackURL=/dashboard
  expiresIn: 60*60*24   → 24h token TTL stored in verification table
  sendOnSignUp: true    → automatic on registration
  autoSignInAfterVerification: true → best UX — user lands logged in
  Resend: authClient.sendVerificationEmail({ email, callbackURL })
  Always handle send failures gracefully — let user request resend

PASSWORD RESET
  sendResetPassword: async ({ user, url }) → your provider sends the link
  resetPasswordTokenExpiresIn: 3600       → 1h TTL
  Step 1: authClient.requestPasswordReset({ email }) → always returns success
  Step 2: user clicks link → /reset-password?token=...
  Step 3: authClient.resetPassword({ token, newPassword })
  After reset: prisma.session.deleteMany({ where: { userId } }) → revoke all sessions
  Never reveal "email not found" vs "wrong password" — same generic response

SESSION CONTROL
  authClient.listSessions()                  → all active sessions for user
  authClient.revokeSession({ token })        → delete one session
  authClient.revokeOtherSessions()           → keep current, delete rest
  authClient.changePassword({ currentPassword, newPassword, revokeOtherSessions: true })
  Server: prisma.session.deleteMany({ where: { userId } }) → force sign out all
  Always scope revoke by userId — prevent cross-user attacks

OAUTH PROVIDERS
  socialProviders: { google: { clientId, clientSecret }, github: { clientId, clientSecret } }
  Callback URL: ${BETTER_AUTH_URL}/api/auth/callback/{provider}
  Register callback URL in provider console (exact match required)
  authClient.signIn.social({ provider: 'google', callbackURL: '/dashboard' })
  Account linking: same email → existing user gets new account row (providerId: 'google')
  Provider console: register BOTH localhost and production callback URLs

PLUGINS
  Server: plugins: [twoFactor(), magicLink({ sendMagicLink }), admin()]
  Client: plugins: [twoFactorClient(), magicLinkClient(), adminClient()]
  Rule: server plugin ↔ client plugin must be mirrored — both or neither
  After adding plugin: npx better-auth generate + npx prisma migrate dev
  twoFactor: enable/verifyTotp/disable — TOTP + backup codes
  magicLink: signIn.magicLink({ email, callbackURL }) — passwordless
  admin: listUsers/banUser/setRole/impersonateUser — admin operations

EXTRA USER FIELDS
  additionalFields: { fieldName: { type, defaultValue, required, input } }
  input: false  → server-controlled (role, plan) — client value silently ignored
  input: true   → user-controllable (username, bio, timezone)
  Server update: prisma.user.update({ data: { role: 'admin' } }) — bypasses BetterAuth
  Client update: authClient.updateUser({ username, bio }) — only input:true fields
  TypeScript: session.user.role is typed automatically from config

SCHEMA GENERATION + MIGRATION
  npx better-auth generate           → prints Prisma models for current auth config
  npx better-auth generate --output prisma/auth.prisma  → write to file
  npx prisma migrate dev --name ...  → dev only — creates + applies migration
  npx prisma migrate deploy          → production — applies pending, never resets
  Multi-file: prisma/auth.prisma + prisma/app.prisma + prisma/schema.prisma (config)
  Deployment order: npm install → prisma generate → prisma migrate deploy → start
  Seeding: auth.api.signUpEmail → prisma.user.update for privileged fields
  Never: prisma migrate dev in production
  Always: commit prisma/migrations/ to git
```

> **Your next action:** Open `auth.ts`, add one plugin from this list — start with `admin()`. Add `adminClient()` to `auth-client.ts`. Run `better-auth generate` and see what schema additions appear. That's the whole plugin wiring process, done in 5 minutes.

> "Doing one small thing beats opening a feed."