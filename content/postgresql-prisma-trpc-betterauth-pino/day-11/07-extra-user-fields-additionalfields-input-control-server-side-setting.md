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
