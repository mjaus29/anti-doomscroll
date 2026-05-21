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
