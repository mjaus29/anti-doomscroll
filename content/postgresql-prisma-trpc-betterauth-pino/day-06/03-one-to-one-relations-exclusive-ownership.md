# 3 — One-to-One Relations — Exclusive Ownership

---

## T — TL;DR

A one-to-one (1:1) relation means each record in model A links to exactly one record in model B, and vice versa. The FK lives on the "dependent" side (the model that can't exist without the other, or the extension model). The FK must be `@unique` to enforce the one-to-one constraint at the database level — without `@unique`, it's just a one-to-many with a naming mistake.

---

## K — Key Concepts

```prisma
// ── Basic one-to-one ───────────────────────────────────────────────────────
model User {
  id      Int      @id @default(autoincrement())
  email   String   @unique

  profile Profile? // back-relation (virtual) — ? because profile may not exist yet
}

model Profile {
  id     Int    @id @default(autoincrement())
  bio    String?
  avatar String?

  // FK side — Profile belongs to User
  userId Int    @unique  // ← @unique enforces the 1:1 constraint
  user   User   @relation(fields: [userId], references: [id])
}

// In PostgreSQL:
// Table "profiles": id, bio, avatar, user_id
// UNIQUE (user_id)         ← enforces 1:1 (one user per profile)
// FOREIGN KEY (user_id) REFERENCES users(id)

// Without @unique on userId: multiple profiles could reference the same user
// → becomes a 1:N relation disguised as 1:1 ← common bug ❌
```

```prisma
// ── Which side holds the FK in 1:1? ───────────────────────────────────────
// Rule: the FK lives on the "extension" or "optional" model
// The base model (User) can exist without the extension (Profile)
// The extension (Profile) cannot exist without the base (User)
// → Profile holds the FK (userId)

// Alternative: FK on the "base" model (less common)
// Used when: the relation is always required and created at the same time
model User {
  id        Int     @id @default(autoincrement())
  email     String  @unique
  profileId Int?    @unique @map("profile_id")
  profile   Profile? @relation(fields: [profileId], references: [id])
}

model Profile {
  id   Int    @id @default(autoincrement())
  bio  String?
  user User?  // back-relation (virtual)
}
// This is valid but unusual — creating a User before a Profile means profileId = null
// More common pattern: Profile holds the FK to User
```

```prisma
// ── One-to-one with cascade delete ────────────────────────────────────────
model User {
  id      Int      @id @default(autoincrement())
  profile Profile?
}

model Profile {
  id     Int  @id @default(autoincrement())
  userId Int  @unique @map("user_id")
  user   User @relation(
    fields: [userId],
    references: [id],
    onDelete: Cascade  // delete user → delete profile
  )
}
// Cascade is almost always the right choice for 1:1 extension models
// A profile without a user is orphaned data ← no reason to keep it
```

```prisma
// ── Self-referencing one-to-one ────────────────────────────────────────────
model User {
  id         Int   @id @default(autoincrement())

  // One user can "replace" another (account merge/transfer)
  replacedById Int?  @unique @map("replaced_by_id")
  replacedBy   User? @relation("replacement", fields: [replacedById], references: [id])
  replaces     User? @relation("replacement")
  // Named relation required for self-reference
}
```

```typescript
// ── Querying 1:1 relations in Prisma Client ───────────────────────────────

// Fetch user with profile
const user = await prisma.user.findUnique({
  where: { id: 1 },
  include: { profile: true },
});
// user.profile: Profile | null  (null if no profile exists)

// Create user and profile together (nested create)
const newUser = await prisma.user.create({
  data: {
    email: "mark@example.com",
    profile: {
      create: {
        bio: "Full-stack developer",
        avatar: "https://example.com/avatar.jpg",
      },
    },
  },
  include: { profile: true },
});

// Upsert profile (create if missing, update if exists)
await prisma.profile.upsert({
  where: { userId: 1 },
  create: { userId: 1, bio: "New bio" },
  update: { bio: "Updated bio" },
});

// Disconnect 1:1 (set FK to null — only if optional)
await prisma.user.update({
  where: { id: 1 },
  data: { profile: { disconnect: true } },
});
// profile.userId becomes null ← only works if userId is Int?
```

---

## W — Why It Matters

- `@unique` on the FK field is what makes a 1:1 relation a 1:1 relation at the database level — without it, PostgreSQL allows multiple profiles per user, and Prisma will not catch this at runtime. The schema validation won't catch it either. Only a database `UNIQUE` constraint prevents duplicate FK values. Missing `@unique` is the most common 1:1 mistake.
- Choosing which side holds the FK in a 1:1 affects query patterns — if `Profile` holds `userId`, then `prisma.profile.findUnique({ where: { userId: 1 } })` works directly. If `User` holds `profileId`, then you must go through the user to find the profile. Generally: the more frequently-queried starting point should be the FK holder.
- 1:1 relations are common for separating "core" data from "extended" data — `User` (authentication, always loaded) vs `UserPreferences` (settings, loaded on demand). This pattern keeps the hot `users` table narrow and fast.

---

## I — Interview Q&A

### Q: What makes a one-to-one relation different from a one-to-many in Prisma and PostgreSQL?

**A:** The structural difference is the `@unique` constraint on the foreign key field. In both relation types, one model holds a foreign key referencing another model's primary key. In a one-to-many, many rows can share the same FK value — multiple posts can have the same `author_id`. In a one-to-one, the FK must be unique — only one profile can have a given `user_id`. In Prisma, you add `@unique` to the FK field (`userId Int @unique`) and make the back-relation a singular optional type (`profile Profile?`) instead of an array (`profiles Profile[]`). In PostgreSQL, the `UNIQUE` constraint on the FK column is what enforces the constraint — the database rejects a second profile for the same user. Without `@unique`, the constraint doesn't exist and the "one-to-one" is silently a one-to-many.

---

## C — Common Pitfalls + Fix

### ❌ Forgetting `@unique` on the FK field in a 1:1 relation

```prisma
// ❌ Without @unique, this is actually a 1:N relation (multiple profiles per user allowed)
model Profile {
  id     Int  @id @default(autoincrement())
  userId Int  // ← missing @unique!
  user   User @relation(fields: [userId], references: [id])
}
// Prisma will also warn: "A one-to-one relation requires the `@unique` attribute"
// But without @unique: INSERT INTO profiles (user_id) VALUES (1), (1) → SUCCEEDS ❌
```

**Fix:**

```prisma
// ✅
model Profile {
  id     Int  @id @default(autoincrement())
  userId Int  @unique  // ← UNIQUE constraint in PostgreSQL → enforces 1:1
  user   User @relation(fields: [userId], references: [id])
}
```

---

## K — Coding Challenge + Solution

### Challenge

Design a `User` + `UserSettings` + `UserIdentity` schema where: (1) every User has optional `UserSettings` (theme, language, notifications) and optional `UserIdentity` (OAuth provider, external ID); (2) `UserSettings` holds the FK to User with cascade delete; (3) `UserIdentity` holds the FK with a unique constraint on `(provider, externalId)` — one OAuth identity per provider per user; (4) `UserIdentity` is also a 1:1 with User (unique FK); (5) show how to create a user with settings and identity in one transaction; (6) use `@@map` and `@map` throughout.

### Solution

```prisma
model User {
  id        Int           @id @default(autoincrement())
  email     String        @unique
  name      String?
  createdAt DateTime      @default(now()) @map("created_at") @db.Timestamptz
  updatedAt DateTime      @updatedAt @map("updated_at") @db.Timestamptz

  // 1:1 back-relations (virtual — no columns)
  settings  UserSettings?
  identity  UserIdentity?

  @@map("users")
}

model UserSettings {
  id            Int     @id @default(autoincrement())
  theme         String  @default("system")
  language      String  @default("en") @db.Char(5)
  notifications Boolean @default(true)
  createdAt     DateTime @default(now()) @map("created_at") @db.Timestamptz
  updatedAt     DateTime @updatedAt @map("updated_at") @db.Timestamptz

  // FK side — 1:1 with User
  userId        Int     @unique @map("user_id")
  user          User    @relation(
    fields: [userId],
    references: [id],
    onDelete: Cascade
  )

  @@map("user_settings")
}

model UserIdentity {
  id         Int    @id @default(autoincrement())
  provider   String @db.VarChar(50)  // 'google', 'github', 'facebook'
  externalId String @map("external_id") @db.VarChar(255)
  createdAt  DateTime @default(now()) @map("created_at") @db.Timestamptz

  // FK side — 1:1 with User
  userId     Int    @unique @map("user_id")  // 1:1 enforced
  user       User   @relation(
    fields: [userId],
    references: [id],
    onDelete: Cascade
  )

  // One OAuth identity per provider per external account
  @@unique([provider, externalId])
  @@map("user_identities")
}
```

```typescript
// Create a user with settings and identity in one atomic transaction
const newUser = await prisma.$transaction(async (tx) => {
  return tx.user.create({
    data: {
      email: "mark@example.com",
      name: "Mark Austin",
      settings: {
        create: {
          theme: "dark",
          language: "en",
          notifications: true,
        },
      },
      identity: {
        create: {
          provider: "google",
          externalId: "google-oauth2|1234567890",
        },
      },
    },
    include: {
      settings: true,
      identity: true,
    },
  });
});

// Upsert settings — create or update based on userId
await prisma.userSettings.upsert({
  where: { userId: newUser.id },
  create: { userId: newUser.id, theme: "light" },
  update: { theme: "light" },
});

// Fetch user with all 1:1 relations
const userFull = await prisma.user.findUnique({
  where: { email: "mark@example.com" },
  include: { settings: true, identity: true },
});
// userFull.settings: UserSettings | null
// userFull.identity: UserIdentity | null
```

---

---
