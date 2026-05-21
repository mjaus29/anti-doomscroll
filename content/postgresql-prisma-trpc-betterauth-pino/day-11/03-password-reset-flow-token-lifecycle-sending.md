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
