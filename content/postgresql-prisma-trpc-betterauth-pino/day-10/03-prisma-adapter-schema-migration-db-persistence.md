# 3 — Prisma Adapter — Schema, Migration, DB Persistence

---

## T — TL;DR

The BetterAuth Prisma adapter syncs BetterAuth's required tables (`user`, `session`, `account`, `verification`) into your `schema.prisma`. Run `npx better-auth generate` to auto-generate the Prisma models, then `npx prisma migrate dev` to apply them. All auth data lives in your PostgreSQL database alongside your application tables — fully queryable with your existing Prisma client.

---

## K — Key Concepts

```bash
# ── Generate BetterAuth Prisma models ─────────────────────────────────────
npx better-auth generate

# This command reads your auth.ts config and outputs the required
# Prisma model definitions. Copy them into your schema.prisma.

# Or use --output to write directly:
npx better-auth generate --output prisma/auth.prisma
```

```prisma
// ── BetterAuth required models — add to prisma/schema.prisma ──────────────
// (Output of `better-auth generate` — exact fields may vary by version)

model User {
  id            String    @id @default(cuid())
  name          String
  email         String    @unique
  emailVerified Boolean   @default(false) @map("email_verified")
  image         String?
  createdAt     DateTime  @default(now()) @map("created_at")
  updatedAt     DateTime  @updatedAt      @map("updated_at")

  // Custom additional fields (from user.additionalFields config):
  role          String    @default("user")
  username      String?   @unique

  // Relations (virtual — no column)
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

  @@map("verification")
}
```

```bash
# ── Apply the schema to PostgreSQL ─────────────────────────────────────────
npx prisma migrate dev --name add-betterauth-tables

# This creates:
# prisma/migrations/20250615_add_betterauth_tables/migration.sql
# And applies the SQL to your dev database

# What gets created in PostgreSQL:
# CREATE TABLE "user" (id, name, email, email_verified, image, role, username, ...)
# CREATE TABLE "session" (id, expires_at, token, user_id, ...)
# CREATE TABLE "account" (id, account_id, provider_id, user_id, password, ...)
# CREATE TABLE "verification" (id, identifier, value, expires_at)
```

```typescript
// ── The adapter — how BetterAuth talks to Prisma ──────────────────────────
import { prismaAdapter } from 'better-auth/adapters/prisma'
import { prisma }        from '@/lib/prisma'

// In auth.ts:
database: prismaAdapter(prisma, {
  provider: 'postgresql',
})

// The adapter translates BetterAuth's internal data operations into
// Prisma Client calls:
// - Find user by email → prisma.user.findUnique({ where: { email } })
// - Create session     → prisma.session.create({ data: { ... } })
// - Delete session     → prisma.session.delete({ where: { token } })
// - Clean expired      → prisma.session.deleteMany({ where: { expiresAt: { lt: now } } })
```

```typescript
// ── Querying auth tables with YOUR Prisma client ───────────────────────────
// Since auth tables live in your DB, you can query them directly:

// Join users with application data
const usersWithOrderCount = await prisma.user.findMany({
  where:   { role: 'user', emailVerified: true },
  select:  {
    id:       true,
    email:    true,
    username: true,
    _count:   { select: { orders: true } }  // if User has orders relation
  },
  orderBy: { createdAt: 'desc' },
})

// Count active sessions
const activeSessions = await prisma.session.count({
  where: { expiresAt: { gt: new Date() } }
})

// Find all sessions for a user
const sessions = await prisma.session.findMany({
  where:   { userId: userId, expiresAt: { gt: new Date() } },
  orderBy: { createdAt: 'desc' },
})
```

---

## W — Why It Matters

- Auto-generating auth models with `better-auth generate` prevents schema drift — if you upgrade BetterAuth and a new field is required, re-running `generate` shows you the diff. Manually maintaining auth models means missed fields and broken auth in production.
- The `onDelete: Cascade` on `Session.userId` and `Account.userId` means deleting a user automatically deletes all their sessions and accounts — no orphaned rows, no security risk of a deleted user's session token still being valid.
- Having auth tables in your own database means you can add application-specific indexes. For example, adding `@@index([userId, expiresAt])` on `Session` makes "list all active sessions for a user" queries fast — something impossible with a hosted auth service.

---

## I — Interview Q&A

### Q: What are the four tables BetterAuth requires and what does each store?

**A:** BetterAuth requires four tables. **`user`** stores the user's profile — id, email, name, email verification status, and any custom additional fields you define (like `role` or `username`). **`session`** stores active sessions — each row is one login session with a unique token, expiry timestamp, user agent, IP, and a foreign key to the user. **`account`** stores authentication methods — for email/password auth it stores the bcrypt-hashed password; for OAuth it stores the access token, refresh token, and provider ID. One user can have multiple accounts (e.g. email/password + Google OAuth). **`verification`** stores temporary tokens for email verification and password reset flows — each row has an identifier (e.g. the email), a value (the token), and an expiry time.

---

## C — Common Pitfalls + Fix

### ❌ Editing `better-auth generate` output by hand — schema drifts from BetterAuth's expectations

```prisma
// ❌ Manually removing a field BetterAuth needs
model Session {
  id        String @id
  // expiresAt removed because "we don't need it" ❌
  token     String @unique
  userId    String
}
// BetterAuth queries expiresAt for session cleanup → crashes at runtime
```

**Fix:** Keep BetterAuth models exactly as generated, add application fields only to `User`:

```prisma
// ✅ Add your own fields to User, leave Session/Account/Verification untouched
model User {
  // ... all BetterAuth-required fields unchanged ...

  // ← Only extend User with your app fields:
  role        String   @default("user")
  username    String?  @unique
  plan        String   @default("free")

  // Your app relations:
  orders      Order[]
  @@map("user")
}
```

---

## K — Coding Challenge + Solution

### Challenge

Write the complete Prisma schema section for BetterAuth with: all four required tables, a custom `role` (String, default `'user'`) and `plan` (String, default `'free'`) on `User`, a `@@index` on `Session` for efficient user session lookup, and a `@@index` on `Verification` for efficient token lookup. Include `@@map` on all models.

### Solution

```prisma
model User {
  id            String    @id @default(cuid())
  name          String
  email         String    @unique
  emailVerified Boolean   @default(false) @map("email_verified")
  image         String?
  role          String    @default("user")
  plan          String    @default("free")
  createdAt     DateTime  @default(now()) @map("created_at")
  updatedAt     DateTime  @updatedAt      @map("updated_at")

  sessions  Session[]
  accounts  Account[]

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

  @@index([userId, expiresAt])   // fast: list active sessions for a user
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

  @@index([identifier])   // fast: lookup verification token by email
  @@map("verification")
}
```

---

---
