# 5 — Field Types — Scalar Types and the Type Mapping Rules

---

## T — TL;DR

Prisma has 12 scalar field types that map to PostgreSQL column types. Each Prisma type maps to a default PostgreSQL type AND generates a corresponding TypeScript type. The mapping is bidirectional — Prisma introspection reads existing PostgreSQL columns and assigns Prisma types. Understanding the defaults (and overrides with `@db.` attributes) lets you design schemas that are both type-safe and use the right PostgreSQL types.

---

## K — Key Concepts

```
── Prisma → PostgreSQL → TypeScript mapping table ────────────────────────────

Prisma Type   │ Default PostgreSQL Type │ TypeScript Type
──────────────┼─────────────────────────┼──────────────────────
String        │ text                    │ string
Boolean       │ boolean                 │ boolean
Int           │ integer                 │ number
BigInt        │ bigint                  │ bigint
Float         │ double precision        │ number
Decimal       │ decimal(65,30)          │ Decimal (Prisma class)
DateTime      │ timestamp(3)            │ Date
Json          │ jsonb                   │ JsonValue (Prisma type)
Bytes         │ bytea                   │ Buffer
String @db.Uuid│ uuid                   │ string
String[]      │ text[]                  │ string[]
Int[]         │ integer[]               │ number[]
```

```prisma
// ── String — maps to PostgreSQL TEXT by default ───────────────────────────
model Product {
  name        String    // text — unlimited length
  sku         String    // text
  code        String    @db.Char(3)    // CHAR(3) — fixed width
  summary     String    @db.VarChar(255)  // VARCHAR(255) — max length
  description String    @db.Text       // explicit TEXT (same as default)
}

// Rule: use plain String unless you have a specific PostgreSQL type reason.
// String → TEXT is the correct PostgreSQL default — no performance difference vs VARCHAR.
// Use @db.VarChar(n) only when the length limit IS the business constraint.
// Use @db.Uuid for UUID primary keys (covered in Subtopic 8).
```

```prisma
// ── Int and BigInt ────────────────────────────────────────────────────────
model User {
  id        Int    @id @default(autoincrement())  // INTEGER — 4 bytes, up to ~2 billion
  bigId     BigInt @id @default(autoincrement())  // BIGINT  — 8 bytes, up to ~9.2 × 10^18
  age       Int                                    // INTEGER
  views     BigInt                                 // BIGINT — large counters
  smallRank Int    @db.SmallInt                    // SMALLINT — 2 bytes, -32768 to 32767
}

// TypeScript distinction:
// Int    → number  (safe for JS numbers up to 2^53)
// BigInt → bigint  (requires n suffix: 1n, 42n — different from number in JS)

// Rule: use Int for most IDs and counts
//       use BigInt for high-volume tables (users at scale, events, analytics)
//       use @db.SmallInt for tiny ranges (age, rating 1-5, hour 0-23)
```

```prisma
// ── Float and Decimal ─────────────────────────────────────────────────────
model Transaction {
  // Float: approximate — good for scientific values, bad for money
  approximateRate Float    // DOUBLE PRECISION — ~15 significant digits

  // Decimal: exact — required for money
  amount          Decimal  // DECIMAL(65,30) default — very wide
  price           Decimal  @db.Decimal(12, 2)   // DECIMAL(12,2) — for currency

  // NEVER use Float for money — floating point arithmetic is approximate:
  // 0.1 + 0.2 = 0.30000000000000004 in floating point
}

// TypeScript:
// Float   → number  (standard JS number)
// Decimal → Prisma.Decimal  (special class for exact arithmetic, not native JS)
//   Usage: new Prisma.Decimal('19.99').add(new Prisma.Decimal('5.00'))
//   JSON serialization: Decimal is NOT a plain number — handle serialization carefully
```

```prisma
// ── DateTime ──────────────────────────────────────────────────────────────
model Post {
  createdAt  DateTime @default(now())    // timestamp(3) — millisecond precision
  updatedAt  DateTime @updatedAt         // timestamp(3) — auto-updated by Prisma
  publishedAt DateTime?                  // timestamp(3) — nullable

  // Want timezone-aware storage? Use native type:
  scheduledAt DateTime @db.Timestamptz   // TIMESTAMPTZ — stores UTC, displays in TZ

  // Date only (no time):
  birthDate  DateTime @db.Date           // DATE — '2025-06-15'

  // Time only (no date — rare):
  meetingTime DateTime @db.Time          // TIME
}

// TypeScript: all DateTime fields → Date object (JS Date)
// Caution: Prisma's default timestamp(3) is timezone-naive (TIMESTAMP WITHOUT TIME ZONE)
// For event timestamps, prefer @db.Timestamptz (TIMESTAMPTZ) — see Subtopic 8
```

```prisma
// ── Boolean ───────────────────────────────────────────────────────────────
model User {
  isActive    Boolean  @default(true)    // BOOLEAN
  isVerified  Boolean  @default(false)
  isDeleted   Boolean  @default(false)   // soft delete pattern
}
// TypeScript: boolean (true / false)
// PostgreSQL: boolean — accepts true/false, 't'/'f', 'yes'/'no', 1/0 on insert
```

```prisma
// ── Json ──────────────────────────────────────────────────────────────────
model Product {
  metadata   Json     @default("{}")   // JSONB (PostgreSQL default for Json)
  attributes Json?                     // nullable JSONB
}

// TypeScript: Prisma.JsonValue
// type JsonValue = string | number | boolean | null | JsonObject | JsonArray
// type JsonObject = { [key: string]: JsonValue }
// Prisma.JsonNull = explicit JSON null (vs Prisma.DbNull = SQL NULL)

// Querying JSONB in Prisma:
// prisma.product.findMany({
//   where: {
//     metadata: { path: ['color'], equals: 'red' }
//   }
// })
```

```prisma
// ── Bytes ─────────────────────────────────────────────────────────────────
model File {
  id      Int    @id @default(autoincrement())
  data    Bytes  // BYTEA — binary data
  hash    Bytes  // BYTEA — file hash
}
// TypeScript: Buffer (Node.js Buffer)
// Use case: small binary data, hashes, encrypted values
// For large files: store in object storage (S3), save only the URL in the DB
```

---

## W — Why It Matters

- `Float` for money is one of the most common schema mistakes — Prisma maps `Float` to `DOUBLE PRECISION`, which has floating-point precision errors. `0.1 + 0.2 ≠ 0.3` in IEEE 754 arithmetic. Use `Decimal` with `@db.Decimal(12,2)` for any monetary value.
- `DateTime` maps to `timestamp(3)` (timezone-naive) by default, not `timestamptz`. This is a deliberate Prisma choice for cross-database compatibility, but for production PostgreSQL apps handling multiple timezones, you should explicitly use `@db.Timestamptz`.
- The `BigInt` → `bigint` TypeScript mapping means you must use the `n` suffix in JavaScript (`42n` not `42`) and you cannot serialize it to JSON directly — `JSON.stringify({ id: 42n })` throws. You must convert: `id.toString()`.

---

## I — Interview Q&A

### Q: When should you use `Decimal` instead of `Float` in a Prisma schema, and what is the TypeScript implication?

**A:** Use `Decimal` whenever exact arithmetic is required — money, financial calculations, tax amounts, prices, quantities where rounding errors are unacceptable. `Float` maps to `DOUBLE PRECISION` which uses IEEE 754 binary floating-point arithmetic — it cannot exactly represent values like `0.1` or `0.3`, leading to rounding errors that compound in calculations. `Decimal` maps to PostgreSQL's `DECIMAL`/`NUMERIC` type which stores exact decimal values. The TypeScript implication: `Decimal` fields generate a `Prisma.Decimal` type (not a plain `number`) — arithmetic requires the `Prisma.Decimal` class methods or the `decimal.js` library. Crucially, `Decimal` values cannot be directly serialized to JSON — you must call `.toString()` or `.toNumber()` before sending via an API response.

---

## C — Common Pitfalls + Fix

### ❌ Using `Float` for currency/price fields

```prisma
// ❌ Float → DOUBLE PRECISION → floating-point precision errors
model Product {
  price Float  // 19.99 stored as 19.989999999999998 internally
}
```

**Fix:**

```prisma
// ✅ Decimal → DECIMAL(10,2) → exact representation
model Product {
  price Decimal @db.Decimal(10, 2)  // stores exactly 19.99
}
```

```typescript
// TypeScript: Decimal is not a plain number
const product = await prisma.product.findFirst()
// product.price is Prisma.Decimal, not number
console.log(product.price.toString())         // "19.99"
console.log(product.price.toNumber())         // 19.99 (converts to JS number — ok for display)
console.log(product.price.add(new Prisma.Decimal('5.00')).toString())  // "24.99"
```

---

## K — Coding Challenge + Solution

### Challenge

Create a `Product` model and an `OrderItem` model that demonstrates all of the following types in correct context: `String` (name, sku with VARCHAR), `Int` (stock quantity, autoincrement id), `BigInt` (total views counter), `Decimal` (price, cost with correct precision), `Float` (weight in kg — approximate is ok), `Boolean` (is_available), `DateTime` (timestamps with correct modifiers), `Json` (attributes), `Bytes` (thumbnail hash). Use correct field names with appropriate optional/required modifiers.

### Solution

```prisma
model Product {
  // Identity
  id           Int      @id @default(autoincrement())

  // String variations
  name         String                      // TEXT — unlimited
  sku          String   @unique @db.VarChar(50)  // VARCHAR(50) — enforced max
  slug         String   @unique            // TEXT

  // Exact money values
  price        Decimal  @db.Decimal(12, 2) // DECIMAL(12,2) — e.g. 9999999999.99
  costPrice    Decimal? @db.Decimal(12, 2) // nullable — we may not know cost

  // Approximate physical measurement — Float is fine here
  weightKg     Float?                      // DOUBLE PRECISION — weight doesn't need exact decimal

  // Integer counts
  stockCount   Int      @default(0)        // INTEGER
  reorderLevel Int      @default(10)       // INTEGER

  // Large counter
  totalViews   BigInt   @default(0)        // BIGINT — can exceed 2 billion

  // Boolean flags
  isAvailable  Boolean  @default(true)     // BOOLEAN
  isFeatured   Boolean  @default(false)    // BOOLEAN

  // Flexible attributes
  attributes   Json     @default("{}")     // JSONB

  // Binary data
  imageHash    Bytes?                      // BYTEA — thumbnail hash (nullable)

  // Timestamps
  createdAt    DateTime @default(now())    // TIMESTAMP(3)
  updatedAt    DateTime @updatedAt         // TIMESTAMP(3) — auto-updated

  @@map("products")
}

model OrderItem {
  id         Int     @id @default(autoincrement())
  orderId    Int
  productId  Int
  quantity   Int                           // INTEGER
  unitPrice  Decimal @db.Decimal(12, 2)   // exact snapshot price at purchase time
  discount   Decimal @default(0) @db.Decimal(5, 4) // 0.0000–1.0000 (percentage)
  createdAt  DateTime @default(now())

  @@map("order_items")
}
```

---

---
