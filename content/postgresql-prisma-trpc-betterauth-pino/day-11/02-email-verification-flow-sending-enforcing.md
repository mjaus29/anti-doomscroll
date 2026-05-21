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
