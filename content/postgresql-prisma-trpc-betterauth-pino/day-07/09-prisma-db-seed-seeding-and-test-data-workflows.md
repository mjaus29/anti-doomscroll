# 9 — `prisma db seed` — Seeding and Test Data Workflows

---

## T — TL;DR

`prisma db seed` runs a seed script to populate the database with initial or test data. The seed script is a regular TypeScript (or JavaScript) file that uses the Prisma Client. Seeding is essential for: local development (demo data), staging environments (realistic test data), and integration tests (known-state fixtures). Configure the seed script path in `package.json` and run it with `npx prisma db seed`.

---

## K — Key Concepts

```json
// package.json — register the seed script
{
  "prisma": {
    "seed": "ts-node --compiler-options '{\"module\":\"CommonJS\"}' prisma/seed.ts"
  }
}

// Or with tsx (faster, no tsconfig needed):
// "seed": "tsx prisma/seed.ts"

// Or with ts-node and ESM:
// "seed": "node --loader ts-node/esm prisma/seed.ts"
```

```typescript
// prisma/seed.ts — complete seed script pattern

import { PrismaClient, UserRole } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Starting seed...");

  // ── Users ─────────────────────────────────────────────────────────────
  // upsert: safe to run multiple times — won't duplicate on re-seed
  const admin = await prisma.user.upsert({
    where: { email: "admin@example.com" },
    update: {}, // nothing to update if already exists
    create: {
      email: "admin@example.com",
      name: "Admin User",
      role: UserRole.ADMIN,
    },
  });

  const mark = await prisma.user.upsert({
    where: { email: "mark@example.com" },
    update: {},
    create: {
      email: "mark@example.com",
      name: "Mark Austin",
      role: UserRole.USER,
    },
  });

  console.log(`✅ Users: admin(${admin.id}), mark(${mark.id})`);

  // ── Categories ────────────────────────────────────────────────────────
  const categories = await Promise.all([
    prisma.category.upsert({
      where: { slug: "technology" },
      update: {},
      create: { name: "Technology", slug: "technology" },
    }),
    prisma.category.upsert({
      where: { slug: "design" },
      update: {},
      create: { name: "Design", slug: "design" },
    }),
  ]);

  // ── Posts ─────────────────────────────────────────────────────────────
  const post = await prisma.post.upsert({
    where: { slug: "intro-to-prisma" },
    update: {},
    create: {
      title: "Introduction to Prisma",
      slug: "intro-to-prisma",
      body: "Prisma is a modern ORM for TypeScript...",
      isPublished: true,
      authorId: mark.id,
      categoryId: categories[0].id,
    },
  });

  console.log(`✅ Post: "${post.title}" (id=${post.id})`);
  console.log("🌱 Seed complete!");
}

main()
  .catch((e) => {
    console.error("❌ Seed failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
```

```bash
# ── Running the seed ───────────────────────────────────────────────────────
npx prisma db seed
# Runs the seed script defined in package.json "prisma.seed"

# Auto-seeding: prisma migrate reset automatically runs seed after reset
npx prisma migrate reset
# 1. Drops all tables
# 2. Reapplies all migrations
# 3. Runs prisma db seed ✅

# Also: prisma migrate dev runs seed after creating the first migration
# (only if --skip-seed is not passed)
```

```typescript
// ── Test data seed — environment-aware ────────────────────────────────────

async function main() {
  const env = process.env.NODE_ENV ?? "development";

  // Always seed base data
  await seedBaseData();

  // Only seed test/demo data in non-production environments
  if (env !== "production") {
    await seedDemoData();
  }
}

async function seedBaseData() {
  // Seed reference data that must exist everywhere:
  // - System admin account
  // - Default plans
  // - Default categories
  // These are idempotent (upsert)
}

async function seedDemoData() {
  // Seed realistic demo data for development/staging:
  // - 100 fake users
  // - 500 fake orders
  // - Random product inventory
  // Can use faker or similar libraries
}
```

```typescript
// ── Large-scale seeding with createMany ───────────────────────────────────
import { faker } from "@faker-js/faker";

async function seedLargeDataset() {
  // Generate 1,000 users
  const users = Array.from({ length: 1000 }, () => ({
    email: faker.internet.email(),
    name: faker.person.fullName(),
    createdAt: faker.date.past({ years: 2 }),
  }));

  // Bulk insert — skipDuplicates in case email already exists
  const result = await prisma.user.createMany({
    data: users,
    skipDuplicates: true,
  });
  console.log(`Created ${result.count} users`);

  // Get all user IDs for orders
  const allUserIds = await prisma.user.findMany({
    select: { id: true },
  });

  // Generate 5,000 orders
  const orders = Array.from({ length: 5000 }, () => ({
    customerId: faker.helpers.arrayElement(allUserIds).id,
    status: faker.helpers.arrayElement(["pending", "delivered", "cancelled"]),
    total: parseFloat(faker.commerce.price({ min: 10, max: 1000 })),
    createdAt: faker.date.past({ years: 1 }),
  }));

  const ordersResult = await prisma.order.createMany({ data: orders });
  console.log(`Created ${ordersResult.count} orders`);
}
```

```bash
# ── Integration testing with seed data ────────────────────────────────────
# In test setup (e.g. vitest setup file):

# Option 1: reset + seed before each test suite
beforeAll(async () => {
  await prisma.$executeRaw`TRUNCATE TABLE users, posts, orders CASCADE`
  await seedTestFixtures()
})

# Option 2: use a separate test database with its own seed
# DATABASE_URL="postgresql://postgres:postgres@localhost:5432/myapp_test"
# Set in .env.test, load with:
# dotenv -e .env.test -- npx prisma migrate reset --force
```

---

## W — Why It Matters

- Using `upsert` instead of `create` in seed scripts makes them **idempotent** — you can run `prisma db seed` repeatedly without duplicating data. This is essential for teams where seeding is part of the setup script and may run multiple times.
- `prisma migrate reset` + automatic seed is the one-command "fresh start" for development — drop everything, reapply all migrations, seed. Every developer on the team can reset to a known-good state with one command. Without seed, the reset just leaves an empty database.
- Large-scale seed with `faker` + `createMany` is critical for realistic performance testing — an app that performs well with 10 rows may be completely different with 1 million rows. Seeding realistic data volumes lets you catch N+1 queries, missing indexes, and slow queries during development instead of in production.

---

## I — Interview Q&A

### Q: How do you write a seed script that's safe to run multiple times without duplicating data?

**A:** Use `upsert` instead of `create` for every record in the seed. `upsert` combines a `create` and an `update` — if a record matching the `where` clause exists, it updates it (or does nothing if `update: {}` is empty); if it doesn't exist, it creates it. The `where` clause must use a unique field (email, slug, id). For bulk data that doesn't need updating, `createMany` with `skipDuplicates: true` achieves the same effect. The pattern: `upsert({ where: { email: 'admin@example.com' }, create: { ... }, update: {} })` — the empty `update: {}` means "if the record exists, leave it unchanged." This makes the seed script idempotent — running it on a fresh database or on an already-seeded database produces the same final state.

---

## C — Common Pitfalls + Fix

### ❌ Using `create` in seed scripts — fails on re-run

```typescript
// ❌ create throws UniqueConstraintViolation on second run
await prisma.user.create({
  data: { email: "admin@example.com", name: "Admin" },
});
// First run: ✅ creates the user
// Second run: ❌ ERROR: Unique constraint failed on: email
```

**Fix:** Use `upsert` for idempotent seeding:

```typescript
// ✅ Safe to run any number of times
await prisma.user.upsert({
  where: { email: "admin@example.com" },
  create: { email: "admin@example.com", name: "Admin", role: "ADMIN" },
  update: {}, // do nothing if already exists — or update specific fields
});
```

---

## K — Coding Challenge + Solution

### Challenge

Write a complete `prisma/seed.ts` for an e-commerce platform with: (1) 3 product categories (upsert by slug); (2) 10 products spread across categories (upsert by sku); (3) 5 customers (upsert by email); (4) 20 orders with 1–3 items each (using `createMany` for bulk); (5) environment check — only create demo orders in non-production; (6) proper `main()` + error handling + `$disconnect`. Use `faker` for realistic data.

### Solution

```typescript
// prisma/seed.ts

import { PrismaClient } from '@prisma/client'
import { faker } from '@faker-js/faker'

const prisma = new PrismaClient()

// ── Reference data — idempotent, safe everywhere ──────────────────────────
async function seedCategories() {
  const categories = [
    { name: 'Electronics',  slug: 'electronics' },
    { name: 'Stationery',   slug: 'stationery' },
    { name: 'Accessories',  slug: 'accessories' },
  ]

  const created = await Promise.all(
    categories.map(c =>
      prisma.category.upsert({
        where:  { slug: c.slug },
        create: c,
        update: { name: c.name },  // update name if slug exists
      })
    )
  )

  console.log(`✅ Categories: ${created.map(c => c.name).join(', ')}`)
  return created
}

async function seedProducts(categoryIds: number[]) {
  const productData = [
    { sku: 'ELEC-001', name: 'Mechanical Keyboard',  price: '129.99', categoryId: categoryIds[0] },
    { sku: 'ELEC-002', name: 'Wireless Mouse',        price: '49.99',  categoryId: categoryIds[0] },
    { sku: 'ELEC-003', name: 'USB-C Hub',             price: '39.99',  categoryId: categoryIds[0] },
    { sku: 'ELEC-004', name: 'Monitor Arm',           price: '79.99',  categoryId: categoryIds[0] },
    { sku: 'STAT-001', name: 'Notebook Set (5-pack)', price: '24.99',  categoryId: categoryIds[1] },
    { sku: 'STAT-002', name: 'Premium Pens (10-pack)',price: '19.99',  categoryId: categoryIds[1] },
    { sku: 'STAT-003', name: 'Desk Organizer',        price: '34.99',  categoryId: categoryIds[1] },
    { sku: 'ACCS-001', name: 'Cable Management Kit',  price: '15.99',  categoryId: categoryIds[2] },
    { sku: 'ACCS-002', name: 'Laptop Stand',          price: '44.99',  categoryId: categoryIds[2] },
    { sku: 'ACCS-003', name: 'Screen Cleaner Kit',    price: '9.99',   categoryId: categoryIds[2] },
  ]

  const products = await Promise.all(
    productData.map(p =>
      prisma.product.upsert({
        where:  { sku: p.sku },
        create: { ...p, stockQty: faker.number.int({ min: 10, max: 200 }) },
        update: { price: p.price },
      })
    )
  )

  console.log(`✅ Products: ${products.length} seeded`)
  return products
}

async function seedCustomers() {
  const customerData = [
    { email: 'alice@example.com',   name: 'Alice Santos' },
    { email: 'bob@example.com',     name: 'Bob Cruz' },
    { email: 'carol@example.com',   name: 'Carol Reyes' },
    { email: 'david@example.com',   name: 'David Lim' },
    { email: 'eve@example.com',     name: 'Eve Manalo' },
  ]

  const customers = await Promise.all(
    customerData.map(c =>
      prisma.customer.upsert({
        where:  { email: c.email },
        create: c,
        update: {},
      })
    )
  )

  console.log(`✅ Customers: ${customers.length} seeded`)
  return customers
}

## ── Demo data — only in non-production ────────────────────────────────────
async function seedDemoOrders(
  customerIds: number[],
  productIds: number[]
) {
  // Clear existing demo orders to avoid duplicates on re-seed
  await prisma.orderItem.deleteMany({})
  await prisma.order.deleteMany({})

  const statuses = ['pending', 'delivered', 'cancelled'] as const

  for (let i = 0; i < 20; i++) {
    const customerId = faker.helpers.arrayElement(customerIds)
    const status     = faker.helpers.arrayElement(statuses)
    const itemCount  = faker.number.int({ min: 1, max: 3 })
    const items      = faker.helpers.arrayElements(productIds, itemCount)

    // Create order
    const order = await prisma.order.create({
      data: {
        customerId,
        status,
        total: 0,
        createdAt: faker.date.past({ years: 1 }),
      }
    })

    // Create order items
    const orderItems = items.map(productId => ({
      orderId:   order.id,
      productId,
      quantity:  faker.number.int({ min: 1, max: 5 }),
      unitPrice: faker.number.float({ min: 9.99, max: 129.99, fractionDigits: 2 }).toString(),
    }))

    await prisma.orderItem.createMany({ data: orderItems })

    // Update order total
    const agg = await prisma.orderItem.aggregate({
      where:  { orderId: order.id },
      _sum:   { unitPrice: true },
    })
    await prisma.order.update({
      where: { id: order.id },
      data:  { total: agg._sum.unitPrice ?? 0 },
    })
  }

  console.log(`✅ Demo orders: 20 seeded`)
}

// ── main ──────────────────────────────────────────────────────────────────
async function main() {
  console.log('🌱 Starting seed...')

  const categories = await seedCategories()
  const products   = await seedProducts(categories.map(c => c.id))
  const customers  = await seedCustomers()

  if (process.env.NODE_ENV !== 'production') {
    await seedDemoOrders(
      customers.map(c => c.id),
      products.map(p => p.id)
    )
  }

  console.log('🌱 Seed complete!')
}

main()
  .catch(e => { console.error('❌ Seed failed:', e); process.exit(1) })
  .finally(async () => { await prisma.$disconnect() })
```

---

---
