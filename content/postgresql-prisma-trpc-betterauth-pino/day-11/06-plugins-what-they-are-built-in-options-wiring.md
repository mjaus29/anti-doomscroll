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
