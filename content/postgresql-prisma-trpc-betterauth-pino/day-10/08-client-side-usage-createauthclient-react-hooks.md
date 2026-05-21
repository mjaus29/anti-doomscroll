# 8 — Client-Side Usage — `createAuthClient`, React Hooks

---

## T — TL;DR

`createAuthClient()` creates the browser-side BetterAuth client. It provides methods for sign-up, sign-in, sign-out, and session access, plus React hooks (`useSession`) that reactively update components when auth state changes. The client communicates with your own `/api/auth/*` endpoints — no external service.

---

## K — Key Concepts

```typescript
// ── src/lib/auth-client.ts ────────────────────────────────────────────────
import { createAuthClient } from 'better-auth/react'

export const authClient = createAuthClient({
  baseURL: process.env.NEXT_PUBLIC_APP_URL,   // your app's URL
  // Must match BETTER_AUTH_URL on the server
})

// Named exports for convenience:
export const {
  signIn,
  signUp,
  signOut,
  useSession,
} = authClient
```

```typescript
// ── useSession hook — reactive session access ─────────────────────────────
'use client'
import { useSession } from '@/lib/auth-client'

export function UserAvatar() {
  const { data: session, isPending, error } = useSession()

  if (isPending) return <div>Loading…</div>
  if (!session)  return <a href="/sign-in">Sign In</a>

  return (
    <div>
      <img src={session.user.image ?? '/default-avatar.png'} alt={session.user.name} />
      <span>{session.user.name}</span>
      <span>{session.user.role}</span>  {/* custom field — typed ✅ */}
    </div>
  )
}

// useSession return shape:
// {
//   data:      Session | null   (null = not logged in)
//   isPending: boolean          (true while fetching)
//   error:     Error | null
//   refetch:   () => Promise<void>
// }
```

```typescript
// ── authClient methods reference ──────────────────────────────────────────

// Sign up
authClient.signUp.email({ name, email, password, ...customFields })
// → { data: { user, session } | null, error: AuthClientError | null }

// Sign in
authClient.signIn.email({ email, password, rememberMe? })
// → { data: { user, session } | null, error: AuthClientError | null }

// Sign out
authClient.signOut()
// → { data: { success: boolean } | null, error: ... }

// Get session (one-time fetch, not reactive)
authClient.getSession()
// → { data: Session | null, error: ... }

// Update user profile
authClient.updateUser({ name, image })
// → { data: { user } | null, error: ... }

// Change password
authClient.changePassword({ currentPassword, newPassword, revokeOtherSessions? })

// List sessions
authClient.listSessions()

// Revoke a specific session
authClient.revokeSession({ token: sessionId })

// Revoke all other sessions (keep current)
authClient.revokeOtherSessions()
```

```typescript
// ── Session-gated component — redirect if not logged in ───────────────────
'use client'
import { useSession }  from '@/lib/auth-client'
import { useRouter }   from 'next/navigation'
import { useEffect }   from 'react'

export function ProtectedPage({ children }: { children: React.ReactNode }) {
  const { data: session, isPending } = useSession()
  const router = useRouter()

  useEffect(() => {
    if (!isPending && !session) {
      router.push('/sign-in?returnTo=' + encodeURIComponent(window.location.pathname))
    }
  }, [isPending, session, router])

  if (isPending) return <div>Loading…</div>
  if (!session)  return null  // avoid flash of content

  return <>{children}</>
}

// Note: prefer server-side protection (middleware / server component) for security.
// Client-side protection is a UX improvement, not a security boundary.
```

```typescript
// ── Role-based access in components ──────────────────────────────────────
'use client'
import { useSession } from '@/lib/auth-client'

export function AdminPanel() {
  const { data: session } = useSession()

  if (!session || session.user.role !== 'admin') {
    return <p>Access denied.</p>
  }

  return <div>Admin-only content here</div>
}
// Note: always enforce role checks SERVER-SIDE as well — client checks are UI only
```

---

## W — Why It Matters

- `useSession()` is reactive — when the user signs in or out in another tab, or when the session expires, `useSession` automatically updates the component. This is better than manually checking `getSession()` on every mount.
- The `baseURL` in `createAuthClient` must match `BETTER_AUTH_URL` on the server — if they differ (e.g. one uses `https://` and the other `http://`), cookies will be set for one origin and ignored by the other, causing persistent "not authenticated" bugs that are hard to diagnose.
- `isPending` must be handled — on first render, `useSession` hasn't fetched yet. If you render auth-dependent content without checking `isPending`, you'll see a flash of unauthenticated state even for logged-in users. Always show a loading state or skeleton while `isPending` is true.

---

## I — Interview Q&A

### Q: What is the difference between `useSession()` and `getSession()` in BetterAuth's client?

**A:** `useSession()` is a React hook that subscribes to session state — it fetches the current session on mount, caches it, and automatically re-fetches when auth state changes (sign-in, sign-out, session expiry). Components using `useSession` are reactively updated when auth state changes. It returns `{ data, isPending, error, refetch }`. `getSession()` is an imperative async function — it makes one fetch call to `/api/auth/get-session` and returns the current session. It does not subscribe to changes. Use `useSession()` in components that should respond to auth state changes (nav bar, user avatar, protected content). Use `getSession()` for one-off checks in event handlers, utility functions, or server-action-like scenarios where you need the session value at a specific moment but don't need reactivity.

---

## C — Common Pitfalls + Fix

### ❌ Using `useSession` without handling `isPending` — flash of unauthenticated state

```typescript
// ❌ Flashes "Sign In" before session loads
export function Nav() {
  const { data: session } = useSession()
  return session
    ? <button>Sign Out</button>
    : <a href="/sign-in">Sign In</a>   // ← shows briefly even when logged in ❌
}
```

**Fix:** Handle `isPending`:

```typescript
// ✅ No flash — skeleton while loading
export function Nav() {
  const { data: session, isPending } = useSession()

  if (isPending) return <div style={{ width: 80, height: 36 }} />  // skeleton

  return session
    ? <button>Sign Out</button>
    : <a href="/sign-in">Sign In</a>
}
```

---

## K — Coding Challenge + Solution

### Challenge

Build a `useAuth` custom hook that: (1) wraps `useSession`, (2) exposes `user`, `isLoading`, `isAuthenticated`, and `isAdmin` derived values, (3) exposes a `signOut` function that redirects to `/sign-in` after signing out. Show usage in a component.

### Solution

```typescript
// src/hooks/use-auth.ts
import { useSession, authClient } from '@/lib/auth-client'
import { useRouter }              from 'next/navigation'
import { useCallback }            from 'react'

export function useAuth() {
  const { data: session, isPending, refetch } = useSession()
  const router = useRouter()

  const signOut = useCallback(async () => {
    await authClient.signOut()
    router.push('/sign-in')
    router.refresh()
  }, [router])

  return {
    user:            session?.user ?? null,
    session:         session?.session ?? null,
    isLoading:       isPending,
    isAuthenticated: !isPending && !!session,
    isAdmin:         session?.user?.role === 'admin',
    signOut,
    refetch,
  }
}

// ── Usage ──────────────────────────────────────────────────────────────────
'use client'
import { useAuth } from '@/hooks/use-auth'

export function DashboardHeader() {
  const { user, isLoading, isAuthenticated, isAdmin, signOut } = useAuth()

  if (isLoading) return <header>Loading…</header>

  if (!isAuthenticated) return null   // middleware handles redirect

  return (
    <header>
      <span>Hello, {user!.name}</span>
      {isAdmin && <a href="/admin">Admin Panel</a>}
      <button onClick={signOut}>Sign Out</button>
    </header>
  )
}
```

---

---
