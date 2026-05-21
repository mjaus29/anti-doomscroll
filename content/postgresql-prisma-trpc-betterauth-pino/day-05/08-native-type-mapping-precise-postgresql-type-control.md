# 8 — Native Type Mapping — Precise PostgreSQL Type Control

---

## T — TL;DR

Prisma's default type mappings cover most cases, but sometimes you need the exact PostgreSQL type — `TIMESTAMPTZ` instead of `TIMESTAMP`, `DECIMAL(12,2)` instead of `DECIMAL(65,30)`, `UUID` instead of `TEXT`. The `@db.` attribute namespace lets you specify the exact PostgreSQL column type while keeping the Prisma scalar type for TypeScript compatibility.

---

## K — Key Concepts

```prisma
// ── Syntax: @db.NativeType ─────────────────────────────────────────────────
// Format: @db.PostgreSQLTypeName
// or:     @db.PostgreSQLTypeName(parameters)

model Example {
  //  PrismaType  @db.PostgreSQLType
  id     String  @db.Uuid              // UUID column
  price  Decimal @db.Decimal(12, 2)    // DECIMAL(12,2)
  name   String  @db.VarChar(100)      // VARCHAR(100)
  ts     DateTime @db.Timestamptz      // TIMESTAMPTZ
}
```

```prisma
// ── String native types ────────────────────────────────────────────────────
model StringTypes {
  a  String  // default → TEXT (unlimited)
  b  String  @db.Text        // explicit TEXT (same as default)
  c  String  @db.VarChar(255) // VARCHAR(255)
  d  String  @db.Char(3)     // CHAR(3) — fixed width, pads with spaces
  e  String  @db.Uuid        // UUID (16 bytes, format validated by PostgreSQL)
  f  String  @db.Inet        // INET — IP address type
  g  String  @db.Citext      // CITEXT — case-insensitive text (requires extension)
  h  String  @db.Bit(8)      // BIT(8) — fixed-length bit string
  i  String  @db.VarBit(16)  // VARBIT(16) — variable bit string
  j  String  @db.Xml         // XML — validated XML
}
```

```prisma
// ── Numeric native types ───────────────────────────────────────────────────
model NumericTypes {
  a  Int      // default → INTEGER (4 bytes)
  b  Int      @db.SmallInt   // SMALLINT (2 bytes, -32768 to 32767)
  c  Int      @db.Int        // INTEGER (explicit, same as default)
  d  Int      @db.Oid        // OID (PostgreSQL object ID)

  e  BigInt   // default → BIGINT (8 bytes)

  f  Float    // default → DOUBLE PRECISION (8 bytes, ~15 digits)
  g  Float    @db.Real       // REAL (4 bytes, ~6 digits) — less precise

  h  Decimal  // default → DECIMAL(65,30) — very wide
  i  Decimal  @db.Decimal(12, 2)   // DECIMAL(12,2)  — money
  j  Decimal  @db.Decimal(19, 4)   // DECIMAL(19,4)  — high-precision money
  k  Decimal  @db.Money            // MONEY — locale-aware (avoid, use Decimal)
}
```

```prisma
// ── DateTime native types ──────────────────────────────────────────────────
model DateTimeTypes {
  a  DateTime  // default → TIMESTAMP(3) — no timezone, millisecond precision
  b  DateTime  @db.Timestamp(0)   // TIMESTAMP(0) — second precision, no TZ
  c  DateTime  @db.Timestamp(6)   // TIMESTAMP(6) — microsecond precision, no TZ
  d  DateTime  @db.Timestamptz    // TIMESTAMPTZ — with timezone (stores UTC)
  e  DateTime  @db.Timestamptz(3) // TIMESTAMPTZ with millisecond precision
  f  DateTime  @db.Date           // DATE — date only, no time
  g  DateTime  @db.Time           // TIME — time only, no timezone
  h  DateTime  @db.Time(3)        // TIME with millisecond precision
  i  DateTime  @db.Timetz         // TIMETZ — time with timezone
}

// Recommendation for production apps:
//   createdAt  DateTime @default(now()) @db.Timestamptz
//   updatedAt  DateTime @updatedAt      @db.Timestamptz
//   scheduledAt DateTime?               @db.Timestamptz
//   birthDate  DateTime?               @db.Date
```

```prisma
// ── JSON native types ──────────────────────────────────────────────────────
model JsonTypes {
  a  Json   // default → JSONB (binary, indexed, faster — preferred)
  b  Json   @db.Json   // JSON (text, no GIN index support, slower)
  c  Json   @db.JsonB  // JSONB (explicit, same as default)
}

// Rule: always use JSONB (default). Only use JSON for audit/append logs
// where you need to preserve exact formatting (key order, whitespace).
```

```prisma
// ── Bytes native types ─────────────────────────────────────────────────────
model ByteTypes {
  a  Bytes   // default → BYTEA — binary data
}
```

```prisma
// ── Complete production model with native types ────────────────────────────
model Event {
  id          String   @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  userId      Int
  type        String   @db.VarChar(100)       // bounded type string
  payload     Json                            // JSONB (default)
  ipAddress   String?  @db.Inet              // PostgreSQL INET type for IPs
  occurredAt  DateTime @default(now()) @db.Timestamptz  // timezone-aware
  processedAt DateTime? @db.Timestamptz       // nullable TIMESTAMPTZ

  @@map("events")
  @@index([userId, occurredAt(sort: Desc)])
}
```

---

## W — Why It Matters

- `@db.Timestamptz` vs the default `TIMESTAMP(3)` is a production-critical distinction — `TIMESTAMP(3)` stores no timezone information. If your server moves to a different timezone or your users span the globe, timestamp values become ambiguous. `TIMESTAMPTZ` stores UTC internally and converts to the session timezone on display — always use `TIMESTAMPTZ` for event timestamps in production.
- `@db.Decimal(12,2)` vs the default `Decimal(65,30)` — Prisma's default decimal precision is absurdly wide (65 digits total, 30 decimal places) because it needs to be database-agnostic. For a price field this wastes storage and may confuse tools. Always specify precision for financial fields: `@db.Decimal(12,2)`.
- `@db.Uuid` is important for UUID primary keys — without it, `@default(uuid())` stores UUIDs as TEXT (26-27 bytes) instead of the native UUID type (16 bytes). The UUID type is also validated by PostgreSQL (format errors are caught at the DB level), and UUID-specific functions and operators work correctly.

---

## I — Interview Q&A

### Q: Why should you use `@db.Timestamptz` instead of Prisma's default `DateTime` mapping?

**A:** Prisma's default `DateTime` maps to PostgreSQL's `TIMESTAMP(3)` — a timezone-naive type. It stores the literal date and time with no timezone information. This causes problems in multi-timezone applications: if an event is stored as `2025-06-15 14:30:00` and the server moves to a different timezone, or a user in a different timezone reads it, the value is ambiguous — there's no way to know what UTC time it represents. `@db.Timestamptz` maps to `TIMESTAMPTZ` (timestamp with time zone), which stores the value as UTC internally and converts to the appropriate timezone when retrieved based on the session's `timezone` setting. For any event-related timestamp (created_at, scheduled_at, expires_at), `TIMESTAMPTZ` is the correct choice. `DATE` (via `@db.Date`) is correct for calendar dates where time is irrelevant (birth dates, due dates).

---

## C — Common Pitfalls + Fix

### ❌ Using default `DateTime` for event timestamps — timezone-naive

```prisma
// ❌ No timezone information stored
model Order {
  placedAt DateTime @default(now())   // TIMESTAMP(3) — timezone-naive
}
// In UTC+8, now() returns '2025-06-15 22:30:00' stored as-is
// In UTC, now() returns '2025-06-15 14:30:00' stored as-is
// These represent the SAME moment but are stored as DIFFERENT values
// No way to compare them correctly across timezones ❌
```

**Fix:** Use `@db.Timestamptz` for all event timestamps:

```prisma
// ✅ Timezone-aware — always stored as UTC
model Order {
  placedAt DateTime @default(now()) @db.Timestamptz
}
// Always stores as UTC: '2025-06-15 14:30:00+00'
// Displays in session timezone when queried ✅
```

---

## K — Coding Challenge + Solution

### Challenge

Create a `PaymentTransaction` model that uses precise native types for every field: UUID PK (DB-generated), a monetary `amount` with proper decimal precision, an `exchangeRate` (approximate ok), a `currency` code with CHAR(3), `status` as VARCHAR, `ipAddress` as INET, all timestamps as TIMESTAMPTZ, a `metadata` JSONB field, and a `receiptData` BYTES field. Use `@@map` and all appropriate `@db.` attributes.

### Solution

```prisma
model PaymentTransaction {
  // UUID primary key — generated by PostgreSQL
  id              String   @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid

  // References
  orderId         Int
  customerId      Int

  // Money — exact decimal
  amount          Decimal  @db.Decimal(19, 4)   // up to 999,999,999,999,999.9999
  fee             Decimal  @default(0) @db.Decimal(19, 4)
  netAmount       Decimal  @db.Decimal(19, 4)

  // Approximate rate — float is fine (display only, not used in calculation)
  exchangeRate    Float?   @db.Real              // REAL — 4 bytes, good enough for FX display

  // Bounded strings
  currency        String   @db.Char(3)           // ISO currency code: USD, PHP, SGD
  provider        String   @db.VarChar(50)       // payment provider name
  externalId      String?  @unique @db.VarChar(255)  // provider's transaction ID
  status          String   @db.VarChar(20)       // 'pending', 'completed', 'failed'

  // Network info
  ipAddress       String?  @db.Inet              // PostgreSQL INET — validates IP format

  // Flexible metadata
  metadata        Json                           // JSONB — provider response, etc.

  // Binary receipt
  receiptData     Bytes?                         // BYTEA — raw receipt PDF or image

  // Timezone-aware timestamps
  initiatedAt     DateTime @default(now()) @db.Timestamptz
  completedAt     DateTime? @db.Timestamptz
  refundedAt      DateTime? @db.Timestamptz
  createdAt       DateTime @default(now()) @db.Timestamptz
  updatedAt       DateTime @updatedAt @db.Timestamptz

  @@index([customerId, initiatedAt(sort: Desc)])
  @@index([orderId])
  @@map("payment_transactions")
}
```

---

---
