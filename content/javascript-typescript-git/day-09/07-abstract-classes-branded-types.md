# 7 — Abstract Classes + Branded Types

---

## T — TL;DR

**Abstract classes** define a shape and partial implementation that subclasses must complete — a contract enforced by the compiler. **Branded types** (nominal types) make structurally identical types incompatible — `UserId` and `OrderId` are both `number` but can't be mixed accidentally. Branding prevents passing wrong IDs to wrong functions.

---

## K — Key Concepts

```typescript
// ── Abstract classes ──────────────────────────────────────────────────────
abstract class Repository<T, ID> {
  abstract findById(id: ID): Promise<T | null>
  abstract findAll(): Promise<T[]>
  abstract save(entity: T): Promise<T>
  abstract delete(id: ID): Promise<void>

  // Concrete method — shared by all subclasses
  async findOrThrow(id: ID): Promise<T> {
    const entity = await this.findById(id)
    if (!entity) throw new Error(`Entity ${id} not found`)
    return entity
  }
}

// Subclass MUST implement all abstract methods — TS error otherwise
class UserRepository extends Repository<User, number> {
  async findById(id: number): Promise<User | null> {
    return db.users.findUnique({ where: { id } }) ?? null
  }
  async findAll(): Promise<User[]>           { return db.users.findMany() }
  async save(user: User): Promise<User>      { return db.users.upsert(user) }
  async delete(id: number): Promise<void>    { await db.users.delete({ where: { id } }) }
  // findOrThrow inherited ✅
}

// Can't instantiate abstract class directly
const repo = new Repository()   // TS error: Cannot create an instance ✅
```

```typescript
// ── Abstract classes vs interfaces ────────────────────────────────────────
// Interface: no implementation, just shape
// Abstract class: can have implementation + force subclass to fill gaps
// Use abstract class when:
//   - Shared implementation exists across variants
//   - Template method pattern (define algorithm structure, fill in steps)
//   - Need constructor logic

abstract class BaseService<T> {
  constructor(protected readonly db: Database) {}

  abstract validate(entity: Partial<T>): void   // subclass fills in

  async create(data: Partial<T>): Promise<T> {
    this.validate(data)    // calls subclass's validate ✅
    return this.db.insert(data)
  }
}
```

```typescript
// ── Branded types ─────────────────────────────────────────────────────────
// TypeScript uses structural typing — two identical structures are the same type
// Brands make structurally identical types nominally distinct

// Brand utility type
type Brand<T, B extends string> = T & { readonly __brand: B }

// Branded primitives
type UserId    = Brand<number, 'UserId'>
type OrderId   = Brand<number, 'OrderId'>
type ProductId = Brand<number, 'ProductId'>
type Email     = Brand<string, 'Email'>
type Slug      = Brand<string, 'Slug'>

// Constructor functions (the only way to create branded values)
const UserId    = (id: number): UserId    => id as UserId
const OrderId   = (id: number): OrderId   => id as OrderId
const Email     = (s: string):  Email     => {
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s)) throw new Error(`Invalid email: ${s}`)
  return s as Email
}

// Usage
function getUser(id: UserId): Promise<User> { ... }
function getOrder(id: OrderId): Promise<Order> { ... }

const userId  = UserId(1)
const orderId = OrderId(1)

getUser(userId)           // ✅
getUser(orderId)          // TS error: OrderId not assignable to UserId ✅
getOrder(userId)          // TS error: UserId not assignable to OrderId ✅
getUser(1)                // TS error: plain number not assignable to UserId ✅
```

```typescript
// ── Branded types with Zod ────────────────────────────────────────────────
import { z } from 'zod'

const UserIdSchema  = z.number().int().positive().brand('UserId')
const EmailSchema   = z.string().email().brand('Email')

type UserId2 = z.infer<typeof UserIdSchema>   // number & { __brand: 'UserId' }
type Email2  = z.infer<typeof EmailSchema>    // string & { __brand: 'Email' }

// Parsing automatically validates AND brands
const userId = UserIdSchema.parse(1)      // UserId2 ✅
const email  = EmailSchema.parse('m@ex.com')  // Email2 ✅
UserIdSchema.parse(-1)   // throws: must be positive ✅
```

---

## W — Why It Matters

- Abstract classes enforce the template method pattern at compile time — a subclass that forgets to implement `validate()` gets a TS error before tests, not a runtime crash when `validate` is called.
- Branded types prevent entire categories of ID-confusion bugs — `deleteUser(orderId)` instead of `deleteUser(userId)` is a real production bug that type checking normally can't catch because both are `number`. Branding makes it a compile error.
- `z.brand()` in Zod combines runtime validation and branded typing in one step — after `UserIdSchema.parse(value)`, you have a `UserId` that is both validated to be a positive integer AND branded to be distinct from other number types.

---

## I — Interview Q&A

### Q: What are branded types and what bug class do they prevent?

**A:** TypeScript uses structural typing — two types with the same shape are interchangeable. `type UserId = number` and `type OrderId = number` are identical structurally, so `getOrder(userId)` typechecks fine even though it's wrong. Branded types add a phantom property (`__brand`) that exists only in the type system (not at runtime) to make structurally identical types distinct. `UserId = number & { __brand: 'UserId' }` — now `UserId` and `OrderId` are incompatible at the type level even though both are numbers at runtime. They prevent ID-confusion bugs, unit confusion (meters vs feet), and validation state confusion (raw string vs validated email).

---

## C — Common Pitfalls + Fix

### ❌ Abstract method not implemented — runtime crash instead of TS error

```typescript
// ❌ Using interface instead of abstract class — no enforcement
interface Processor { process(data: string): string }
class MyProcessor implements Processor {
  // Forgot process() — TypeScript WILL error, but at the class declaration
  // not at the call site
}
// TS error at class declaration: missing 'process' ✅ — actually this works

// The real pitfall: calling abstract method before subclass overrides
abstract class BaseProcessor {
  abstract process(data: string): string
  run(data: string) { return this.process(data) }   // calls abstract ✅
}
// new BaseProcessor() — TS error: cannot instantiate abstract class ✅
```

---

## K — Coding Challenge + Solution

### Challenge

Create branded types for `Meters`, `Feet`, and `Kilograms`. Write conversion functions. Show that `addMeters(1 as Meters, 1 as Feet)` is a compile error. Then write an abstract `Converter<From, To>` class.

### Solution

```typescript
type Brand<T, B extends string> = T & { readonly __brand: B }
type Meters    = Brand<number, 'Meters'>
type Feet      = Brand<number, 'Feet'>
type Kilograms = Brand<number, 'Kilograms'>
type Pounds    = Brand<number, 'Pounds'>

const Meters    = (n: number): Meters    => n as Meters
const Feet      = (n: number): Feet      => n as Feet
const Kilograms = (n: number): Kilograms => n as Kilograms
const Pounds    = (n: number): Pounds    => n as Pounds

function addMeters(a: Meters, b: Meters): Meters {
  return Meters(a + b)
}

addMeters(Meters(5), Meters(3))    // ✅ Meters
addMeters(Meters(5), Feet(3))      // TS error: Feet not assignable to Meters ✅

// Abstract converter
abstract class Converter<From, To> {
  abstract convert(value: From): To
  convertAll(values: From[]): To[] { return values.map(v => this.convert(v)) }
}

class MetersToFeet extends Converter<Meters, Feet> {
  convert(m: Meters): Feet { return Feet(m * 3.28084) }
}
class KilogramsToPounds extends Converter<Kilograms, Pounds> {
  convert(kg: Kilograms): Pounds { return Pounds(kg * 2.20462) }
}

const conv = new MetersToFeet()
conv.convert(Meters(1))                    // Feet(3.28...) ✅
conv.convertAll([Meters(1), Meters(2)])    // Feet[] ✅
```

---

---
