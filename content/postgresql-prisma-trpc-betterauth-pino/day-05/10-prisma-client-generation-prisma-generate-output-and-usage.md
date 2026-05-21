# 10 — Prisma Client Generation — prisma generate, Output, and Usage

---

## T — TL;DR

`prisma generate` reads `schema.prisma` and produces the Prisma Client — a fully-typed database client specific to your schema. Each model gets CRUD methods (`findMany`, `create`, `update`, `delete`, etc.). The client is instantiated as `new PrismaClient()` and should be used as a singleton in Node.js. The generated types make every query type-safe: wrong fields, wrong types, and missing required fields all produce TypeScript errors at compile time.

---

## K — Key Concepts

```bash
# ── Running prisma generate ────────────────────────────────────────────────
npx prisma generate

# Output:
# ✔ Generated Prisma Client (v7.x.x) to ./node_modules/.prisma/client
# You can now start using Prisma Client in your code.

# With custom schema path:
npx prisma generate --schema=./prisma/schema.prisma

# Watch mode (re-generates on schema change):
npx prisma generate --watch
```

```typescript
// ── What gets generated ────────────────────────────────────────────────────

// For this schema:
// model User {
//   id    Int    @id @default(autoincrement())
//   email String @unique
//   name  String?
//   role  UserRole @default(USER)
// }

// Prisma generates:
// 1. PrismaClient class with prisma.user.findMany(), prisma.user.create(), etc.
// 2. TypeScript types:
//    - User (full model type)
//    - UserCreateInput (for create operations — required fields required, optional optional)
//    - UserUpdateInput (for update operations — all fields optional)
//    - UserWhereInput (for WHERE clauses — all fields optional, with operators)
//    - UserOrderByWithRelationInput (for ORDER BY)
//    - UserSelect (for field selection)
//    - UserInclude (for relation loading)
// 3. Enum type: UserRole = 'ADMIN' | 'MODERATOR' | 'USER' | 'GUEST'
```

```typescript
// ── PrismaClient instantiation — singleton pattern ────────────────────────
// src/lib/prisma.ts

import { PrismaClient } from '@prisma/client'

// The global variable trick prevents multiple instances in hot-reload environments
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === 'development'
      ? ['query', 'error', 'warn']
      : ['error'],
  })

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma
}

// Why singleton?
// - PrismaClient creates a connection pool internally
// - Next.js hot reload creates a new module scope on each change
// - Without singleton: hundreds of connection pools after many hot reloads
// - With singleton: one pool, reused across reloads
```

```typescript
// ── Basic CRUD operations — generated methods ──────────────────────────────
import { prisma } from '@/lib/prisma'

// findMany — fetch multiple rows
const users = await prisma.user.findMany()
// Return type: User[]  ← fully typed based on model

// findMany with filtering, sorting, pagination
const activeUsers = await prisma.user.findMany({
  where: { isActive: true },
  orderBy: { createdAt: 'desc' },
  take: 20,
  skip: 0,
  select: {
    id: true,
    email: true,
    name: true,
    // isActive: false  ← omit fields from result (not in return type)
  }
})
// Return type: { id: number; email: string; name: string | null }[]

// findUnique — fetch by unique field (PK or @unique)
const user = await prisma.user.findUnique({
  where: { id: 1 }
})
// Return type: User | null

// findUniqueOrThrow — throws if not found
const user2 = await prisma.user.findUniqueOrThrow({
  where: { email: 'mark@example.com' }
})
// Return type: User (never null — throws PrismaClientKnownRequestError if not found)

// findFirst — first row matching filter
const firstAdmin = await prisma.user.findFirst({
  where: { role: 'ADMIN' },
  orderBy: { createdAt: 'asc' }
})
// Return type: User | null
```

```typescript
// ── Create operations ──────────────────────────────────────────────────────

// create — single row
const newUser = await prisma.user.create({
  data: {
    email: 'mark@example.com',
    name: 'Mark Austin',
    // role: omitted → uses @default(USER)
  }
})
// Return type: User — includes all fields, with generated id and defaults

// ❌ TypeScript error — missing required field 'email'
await prisma.user.create({
  data: { name: 'Mark' }  // Error: Property 'email' is missing
})

// createMany — multiple rows, no return (or return with skipDuplicates)
const result = await prisma.user.createMany({
  data: [
    { email: 'a@a.com', name: 'Alice' },
    { email: 'b@b.com', name: 'Bob' },
  ],
  skipDuplicates: true,  // ignore rows that violate unique constraints
})
// result.count: 2

// createManyAndReturn — bulk insert with return (Prisma 5.14+)
const created = await prisma.user.createManyAndReturn({
  data: [
    { email: 'c@c.com', name: 'Carol' },
  ],
  select: { id: true, email: true }
})
// created: { id: number; email: string }[]
```

```typescript
// ── Update and Delete operations ───────────────────────────────────────────

// update — by unique field, returns updated row
const updated = await prisma.user.update({
  where: { id: 1 },
  data: { name: 'Mark Updated' },
})
// Return type: User

// updateMany — by filter, returns count
const deactivated = await prisma.user.updateMany({
  where: { role: 'GUEST', isActive: true },
  data: { isActive: false },
})
// deactivated.count: number

// upsert — create or update
const upserted = await prisma.user.upsert({
  where: { email: 'mark@example.com' },
  create: { email: 'mark@example.com', name: 'Mark' },
  update: { name: 'Mark Updated' },
})
// Return type: User

// delete — by unique field
const deleted = await prisma.user.delete({
  where: { id: 99 },
})
// Return type: User (the deleted row)

// deleteMany — by filter, returns count
const purged = await prisma.user.deleteMany({
  where: { isActive: false, createdAt: { lt: new Date('2024-01-01') } }
})
// purged.count: number
```

```typescript
// ── Transactions in Prisma Client ─────────────────────────────────────────

// Interactive transaction — multiple operations, one commit
const result = await prisma.$transaction(async (tx) => {
  const order = await tx.order.create({
    data: { customerId: 1, status: 'PENDING', total: 0 }
  })

  const items = await tx.orderItem.createMany({
    data: [
      { orderId: order.id, productId: 1, quantity: 2, unitPrice: 129.99 },
      { orderId: order.id, productId: 2, quantity: 1, unitPrice: 49.99 },
    ]
  })

  const updated = await tx.order.update({
    where: { id: order.id },
    data: { total: 309.97 }
  })

  return updated
  // All three operations commit together or all rollback ✅
})

// Batch transaction (faster — sent as a single network request)
const [user, profile] = await prisma.$transaction([
  prisma.user.create({ data: { email: 'x@x.com' } }),
  prisma.profile.create({ data: { userId: 1, bio: 'Hello' } }),
])
```

---

## W — Why It Matters

- The singleton pattern for `PrismaClient` is not optional in Next.js and other hot-reloading environments — without it, every file save in development creates a new connection pool. After 100 hot reloads, you have 100 connection pools exhausting your PostgreSQL `max_connections`. The `globalThis` trick is the official Prisma recommendation.
- `findUniqueOrThrow` vs `findUnique` is a meaningful choice — `findUnique` returns `User | null` forcing you to handle the null case. `findUniqueOrThrow` returns `User` and throws a typed `PrismaClientKnownRequestError` if not found. For routes where "not found" should be a 404, `findUniqueOrThrow` + a catch block is cleaner than null checking.
- Prisma's interactive transactions use a callback pattern — the `tx` parameter is a transaction-scoped Prisma Client. If the callback throws (including Prisma errors), the entire transaction is rolled back automatically. No manual `BEGIN`/`ROLLBACK` needed.

---

## I — Interview Q&A

### Q: What does `prisma generate` produce and why does it need to be re-run after schema changes?

**A:** `prisma generate` reads `schema.prisma` and produces the Prisma Client — a set of TypeScript types, query-builder code, and a compiled query engine binary in `node_modules/.prisma/client`. The generated code includes: a `PrismaClient` class with a property for each model (`prisma.user`, `prisma.order`), CRUD method overloads for each model (`findMany`, `create`, `update`, etc.), TypeScript types for every model (the full model type, create/update input types, where filter types, select/include types), and enum types. It must be re-run after schema changes because the generated code is specific to the schema — if you add a field `phoneNumber` to the `User` model, the existing generated types don't include it. TypeScript will not see `user.phoneNumber` until you regenerate. This is why the `postinstall` hook (`"postinstall": "prisma generate"`) is important — it ensures CI and deployment always have up-to-date generated code.

---

## C — Common Pitfalls + Fix

### ❌ Multiple PrismaClient instances in Next.js — connection pool exhaustion

```typescript
// ❌ New PrismaClient on every module import — hot reload creates N pools
// src/app/api/users/route.ts
import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()  // ← new pool every hot reload ❌

export async function GET() {
  const users = await prisma.user.findMany()
  return Response.json(users)
}
```

**Fix:** Use the singleton pattern:

```typescript
// src/lib/prisma.ts — singleton
import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient }

export const prisma = globalForPrisma.prisma ?? new PrismaClient()

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma  // reuse across hot reloads in dev
}

// src/app/api/users/route.ts
import { prisma } from '@/lib/prisma'  // ✅ always the same instance

export async function GET() {
  const users = await prisma.user.findMany()
  return Response.json(users)
}
```

---

## K — Coding Challenge + Solution

### Challenge

Using the models from this day's subtopics (User, Post, Order, OrderItem), write a TypeScript module that: (1) creates a singleton PrismaClient with query logging in development, (2) a `createOrderWithItems` function that uses an interactive transaction to create an order + items + update the total atomically, (3) a `getUserDashboard` function that fetches a user with their order count and total spend using `select` to avoid over-fetching, (4) a `paginateOrders` function implementing cursor-based pagination. Show all TypeScript types.

### Solution

```typescript
// src/lib/prisma.ts
import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient }

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === 'development'
      ? ['query', 'warn', 'error']
      : ['error'],
  })

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma
}
```

```typescript
// src/services/order.service.ts
import { prisma } from '@/lib/prisma'
import { Prisma } from '@prisma/client'

// ── (2) createOrderWithItems — atomic transaction ──────────────────────────
interface OrderItemInput {
  productId: number
  quantity: number
  unitPrice: number
}

async function createOrderWithItems(
  customerId: number,
  items: OrderItemInput[]
): Promise<{ orderId: number; total: number; itemCount: number }> {
  return prisma.$transaction(async (tx) => {
    // Step 1: create order with zero total
    const order = await tx.order.create({
      data: {
        customerId,
        status: 'PENDING',
        total: 0,
      },
      select: { id: true },
    })

    // Step 2: bulk insert order items
    await tx.orderItem.createMany({
      data: items.map((item) => ({
        orderId: order.id,
        productId: item.productId,
        quantity: item.quantity,
        unitPrice: new Prisma.Decimal(item.unitPrice),
      })),
    })

    // Step 3: compute and update total
    const aggregate = await tx.orderItem.aggregate({
      where: { orderId: order.id },
      _sum: { unitPrice: true },  // simplified: sum of unit prices
      _count: { _all: true },
    })

    const total = Number(aggregate._sum.unitPrice ?? 0)

    const updated = await tx.order.update({
      where: { id: order.id },
      data: { total: new Prisma.Decimal(total) },
      select: { id: true, total: true },
    })

    return {
      orderId: updated.id,
      total: Number(updated.total),
      itemCount: aggregate._count._all,
    }
  })
}

// ── (3) getUserDashboard — select only needed fields ───────────────────────
interface UserDashboard {
  id: number
  email: string
  name: string | null
  orderCount: number
  totalSpend: number
}

async function getUserDashboard(userId: number): Promise<UserDashboard | null> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      email: true,
      name: true,
      // No `role`, `passwordHash`, `isActive` etc. — only what we need
      _count: {
        select: { orders: true }    // count related orders
      },
      orders: {
        select: { total: true }     // only fetch total for aggregation
      }
    }
  })

  if (!user) return null

  const totalSpend = user.orders.reduce(
    (sum, o) => sum + Number(o.total),
    0
  )

  return {
    id: user.id,
    email: user.email,
    name: user.name,
    orderCount: user._count.orders,
    totalSpend,
  }
}

// ── (4) paginateOrders — cursor-based pagination ───────────────────────────
interface PaginatedOrders {
  data: Array<{
    id: number
    customerId: number
    status: string
    total: number
    createdAt: Date
  }>
  nextCursor: string | null
  hasNextPage: boolean
}

interface PaginateOrdersInput {
  cursor?: string | null   // base64 encoded { id, createdAt }
  pageSize?: number
  customerId?: number
}

async function paginateOrders({
  cursor,
  pageSize = 20,
  customerId,
}: PaginateOrdersInput): Promise<PaginatedOrders> {
  // Decode cursor
  let cursorData: { id: number; createdAt: string } | null = null
  if (cursor) {
    try {
      cursorData = JSON.parse(
        Buffer.from(cursor, 'base64').toString('utf-8')
      )
    } catch {
      cursorData = null
    }
  }

  const orders = await prisma.order.findMany({
    where: {
      ...(customerId ? { customerId } : {}),
      ...(cursorData ? {
        OR: [
          { createdAt: { lt: new Date(cursorData.createdAt) } },
          {
            createdAt: { equals: new Date(cursorData.createdAt) },
            id: { lt: cursorData.id }
          }
        ]
      } : {}),
    },
    select: {
      id: true,
      customerId: true,
      status: true,
      total: true,
      createdAt: true,
    },
    orderBy: [
      { createdAt: 'desc' },
      { id: 'desc' }
    ],
    take: pageSize + 1,  // fetch one extra to determine hasNextPage
  })

  const hasNextPage = orders.length > pageSize
  const data = hasNextPage ? orders.slice(0, pageSize) : orders

  const lastItem = data[data.length - 1]
  const nextCursor = lastItem && hasNextPage
    ? Buffer.from(JSON.stringify({
        id: lastItem.id,
        createdAt: lastItem.createdAt.toISOString()
      })).toString('base64')
    : null

  return {
    data: data.map(o => ({ ...o, total: Number(o.total) })),
    nextCursor,
    hasNextPage,
  }
}

export { createOrderWithItems, getUserDashboard, paginateOrders }
```

---

## ✅ Day 5 Complete — Prisma Schema Fundamentals

| # | Subtopic | Status |
|---|----------|--------|
| 1 | schema.prisma — File Structure and the Three Blocks | ☐ |
| 2 | datasource — Connecting to PostgreSQL | ☐ |
| 3 | generator — Prisma Client Configuration | ☐ |
| 4 | Models — Declaring Tables and Fields | ☐ |
| 5 | Field Types — Scalar Types and the Type Mapping Rules | ☐ |
| 6 | Field Modifiers — Optional, List, Default, @id, @unique, @updatedAt | ☐ |
| 7 | Enums — Type-Safe Categorical Values | ☐ |
| 8 | Native Type Mapping — Precise PostgreSQL Type Control | ☐ |
| 9 | Model-to-Table Mapping — @@map, @map, @@schema | ☐ |
| 10 | Prisma Client Generation — prisma generate, Output, and Usage | ☐ |

---

## 🗺️ One-Page Mental Model — Day 5

```
SCHEMA.PRISMA STRUCTURE
  generator client { ... }   → what to generate (prisma-client-js)
  datasource db { ... }      → where is the database (postgresql + url)
  model ModelName { ... }    → each table
  enum EnumName { ... }      → categorical value sets
  Order: generator → datasource → enums → models (convention)

DATASOURCE
  provider  = "postgresql"
  url       = env("DATABASE_URL")     never hardcode credentials
  directUrl = env("DIRECT_URL")       for PgBouncer / Supabase pooler
  schemas   = ["public", "auth"]      multi-schema support

GENERATOR
  provider        = "prisma-client-js"
  output          = "../src/lib/db"   optional custom path
  binaryTargets   = ["native", "linux-musl-openssl-3.0.x"]  ← set for Docker!
  previewFeatures = ["multiSchema", "relationJoins"]
  postinstall: "prisma generate"  in package.json scripts

MODELS
  model Name { fields; @@map; @@index; @@unique; @@id; @@schema }
  Every model needs an @id (single) or @@id (composite)
  Relation fields are virtual (no DB column) — only scalar fields = columns
  Model name → prisma.modelName (camelCase) → table (via @@map)

FIELD TYPES (Prisma → PostgreSQL → TypeScript)
  String        → TEXT              → string
  Int           → INTEGER           → number
  BigInt        → BIGINT            → bigint   (use n suffix: 42n)
  Float         → DOUBLE PRECISION  → number   (NOT for money!)
  Decimal       → DECIMAL(65,30)    → Prisma.Decimal  (for money!)
  Boolean       → BOOLEAN           → boolean
  DateTime      → TIMESTAMP(3)      → Date     (use @db.Timestamptz for TZ!)
  Json          → JSONB             → Prisma.JsonValue
  Bytes         → BYTEA             → Buffer

FIELD MODIFIERS
  String?       → nullable (NULL)              → string | null in TS
  String[]      → PostgreSQL array (TEXT[])    → string[] in TS
  @id           → PRIMARY KEY
  @unique       → UNIQUE constraint + index
  @@unique([a,b]) → multi-column UNIQUE + index
  @default(...)  → column DEFAULT (now(), autoincrement(), uuid(), constant)
  @updatedAt    → Prisma auto-sets to now() on update (NOT a PG trigger)
  @ignore       → exclude field from Prisma Client (still in DB)

ENUMS
  enum EnumName { VALUE1 VALUE2 @map("v2") ... @@map("pg_type_name") }
  TypeScript: EnumName.VALUE1 (type-safe union)
  Pros: type safety, storage efficiency (4 bytes)
  Cons: hard to remove values — requires PG type recreation
  Alternative: String + CHECK constraint (easier to modify)

NATIVE TYPES (@db.*)
  String → @db.VarChar(n), @db.Char(n), @db.Uuid, @db.Inet, @db.Citext
  Decimal → @db.Decimal(p,s)  ← always specify for money
  DateTime → @db.Timestamptz  ← ALWAYS for event timestamps in production
            → @db.Date        ← for calendar dates (no time)
  Json → @db.JsonB (default), @db.Json (text, avoid)

MAPPING (Prisma ↔ PostgreSQL)
  @@map("table_name")     → sets PostgreSQL table name
  @map("column_name")     → sets PostgreSQL column name
  @@schema("pg_schema")   → places model in PG schema (namespace)
  Convention: PascalCase model → @@map("snake_case_table")
              camelCase field  → @map("snake_case_column")

PRISMA CLIENT
  npx prisma generate                → generates types + client
  new PrismaClient()                 → creates connection pool
  SINGLETON: use globalThis trick    → prevents pool exhaustion in Next.js
  prisma.model.findMany(...)         → typed query
  prisma.model.findUnique(...)       → returns T | null
  prisma.model.findUniqueOrThrow()   → returns T or throws
  prisma.model.create(...)           → typed insert
  prisma.model.update(...)           → typed update
  prisma.model.upsert(...)           → create or update
  prisma.model.delete(...)           → delete + return deleted row
  prisma.$transaction(async (tx) => { ... })  → interactive transaction

KEY RULES
  NEVER hardcode DB credentials — always env()
  ALWAYS @@map() and @map() — snake_case in PG, camelCase in TypeScript
  ALWAYS @db.Timestamptz for event timestamps
  ALWAYS @db.Decimal(p,s) for money — NEVER Float
  ALWAYS set binaryTargets for Docker deployments
  ALWAYS postinstall: prisma generate in package.json
  ONE PrismaClient singleton per process — use globalThis pattern
```

> **Your next action:** Create a `prisma/schema.prisma` file in any
