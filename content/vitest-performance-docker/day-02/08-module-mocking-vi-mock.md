# 8 — Module Mocking — vi.mock()

---

## T — TL;DR

`vi.mock('module-path')` replaces an entire module with auto-mocked or factory-defined stubs — every exported function becomes a `vi.fn()`. Call `vi.mock()` at the top level of the test file (it gets hoisted automatically). Use the factory pattern `vi.mock('path', () => ({ ... }))` for precise control. Import the module after `vi.mock()` to get the mocked version.

---

## K — Key Concepts

```typescript
// ── vi.mock() is hoisted — always runs before imports ─────────────────────
// Vitest hoists vi.mock() calls to the top of the file at compile time.
// This means even if you write it after imports, it runs first.

import { describe, it, expect, vi }    from 'vitest'
import { createOrder }                 from './order.service'

// This vi.mock runs BEFORE the import above (hoisted by Vitest)
vi.mock('./db', () => ({
  db: {
    order: {
      create: vi.fn(),
      findMany: vi.fn(),
    }
  }
}))

// Now db.order.create is a vi.fn() inside createOrder ✅
```

```typescript
// ── Factory pattern — recommended ─────────────────────────────────────────
vi.mock('./email', () => ({
  sendEmail: vi.fn().mockResolvedValue({ messageId: 'msg-1' }),
}))

// Import after vi.mock — gets the mocked version
import { sendEmail } from './email'

it('calls sendEmail', async () => {
  await notifyUser('mark@example.com')
  expect(sendEmail).toHaveBeenCalledWith('mark@example.com', expect.any(String))
})
```

```typescript
// ── Auto-mock — every export becomes vi.fn() with no return value ─────────
vi.mock('./prisma')   // no factory — Vitest auto-mocks all exports

import { prisma } from './prisma'
// prisma.user.findMany is now vi.fn() returning undefined

// Override in the test:
vi.mocked(prisma.user.findMany).mockResolvedValue([{ id: 1, name: 'Alice' }])
// vi.mocked() is a TypeScript helper that casts to vi.Mock with correct types
```

```typescript
// ── Mocking a module with a default export ────────────────────────────────
vi.mock('./config', () => ({
  default: {
    apiUrl:  'http://test-api.com',
    timeout: 1000,
  }
}))

import config from './config'
// config.apiUrl === 'http://test-api.com' ✅
```

```typescript
// ── Mocking third-party modules ───────────────────────────────────────────
vi.mock('nodemailer', () => ({
  createTransport: vi.fn(() => ({
    sendMail: vi.fn().mockResolvedValue({ messageId: 'test-id' })
  }))
}))

vi.mock('@prisma/client', () => ({
  PrismaClient: vi.fn().mockImplementation(() => ({
    user: {
      findUnique: vi.fn(),
      create:     vi.fn(),
    },
    $disconnect: vi.fn(),
  }))
}))
```

```typescript
// ── vi.importActual — mock some, keep others real ─────────────────────────
vi.mock('./utils', async (importActual) => {
  const actual = await importActual<typeof import('./utils')>()
  return {
    ...actual,                           // keep all real exports
    generateId: vi.fn(() => 'test-id'),  // override only generateId
  }
})
```

```typescript
// ── Resetting module mocks between tests ──────────────────────────────────
import { prisma } from './prisma'

beforeEach(() => {
  vi.clearAllMocks()   // clear call counts on all vi.fn()s from vi.mock()
})

it('finds user', async () => {
  vi.mocked(prisma.user.findUnique).mockResolvedValue({ id: 1, email: 'a@a.com' })
  const user = await getUser(1)
  expect(user.email).toBe('a@a.com')
})

it('returns null for missing user', async () => {
  vi.mocked(prisma.user.findUnique).mockResolvedValue(null)
  const user = await getUser(999)
  expect(user).toBeNull()
})
```

---

## W — Why It Matters

- `vi.mock()` is the only correct way to mock ES modules — you cannot reassign an ES module export with `import { fn } from './mod'; fn = vi.fn()` because ES module bindings are read-only. `vi.mock()` intercepts the module at the loader level before any code runs.
- The hoisting of `vi.mock()` solves the chicken-and-egg problem — the module under test imports its dependencies when it loads. You need the mock in place before that import. Hoisting ensures `vi.mock()` runs first regardless of where in the file you write it.
- `vi.importActual` for partial mocks is a practical escape hatch — when you need to mock `generateId` but keep `formatDate` and `validate` real, replacing the entire module with stubs means maintaining duplicates of all real functionality. `importActual` spreads the real module then overrides specific exports.

---

## I — Interview Q&A

### Q: Why is `vi.mock()` hoisted in Vitest and what would go wrong without hoisting?

**A:** When a module is imported, Node.js executes the module's top-level code immediately, including its own imports. The module under test imports `prisma` from `'./lib/prisma'` at load time. If `vi.mock('./lib/prisma')` ran after the import statement, `prisma` would already be the real module — the mock would have no effect on the already-evaluated import. Vitest hoists `vi.mock()` calls to before all imports using its transform pipeline (like Babel's `babel-plugin-jest-hoist`). This guarantees the mock is registered in the module registry before any module that depends on it is loaded. Without hoisting, you'd have to use dynamic `import()` inside tests to get mocked versions — which is verbose and error-prone.

---

## C — Common Pitfalls + Fix

### ❌ Calling `vi.mock()` inside a function or conditional — not hoisted correctly

```typescript
// ❌ vi.mock inside a function — NOT hoisted, executes too late
beforeEach(() => {
  vi.mock('./db')  // ← too late — module already imported ❌
})
```

**Fix:** Always call `vi.mock()` at the top level of the test file:

```typescript
// ✅ Top-level — hoisted before all imports
vi.mock('./db', () => ({
  db: { user: { findUnique: vi.fn() } }
}))

import { getUser } from './user.service'  // gets the mocked db ✅
```

---

## K — Coding Challenge + Solution

### Challenge

You have `src/services/auth.service.ts` that imports `bcrypt` (for `hash` and `compare`) and `prisma` (for `user.findUnique` and `user.create`). Mock both modules. Write tests for `register(email, password)`: (1) creates user with hashed password; (2) throws `DuplicateEmailError` if user exists; (3) calls `bcrypt.hash` with correct rounds. Mock `bcrypt.hash` to return `'$hashed$'` and `user.findUnique` to return null for new registrations.

### Solution

```typescript
// src/services/auth.service.ts
import bcrypt from 'bcrypt'
import { prisma } from '../lib/prisma'

export class DuplicateEmailError extends Error {
  constructor(email: string) { super(`Email already in use: ${email}`) }
}

export async function register(email: string, password: string) {
  const existing = await prisma.user.findUnique({ where: { email } })
  if (existing) throw new DuplicateEmailError(email)
  const passwordHash = await bcrypt.hash(password, 12)
  return prisma.user.create({ data: { email, passwordHash } })
}

// src/services/auth.service.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('bcrypt', () => ({
  default: {
    hash:    vi.fn().mockResolvedValue('$hashed$'),
    compare: vi.fn(),
  }
}))

vi.mock('../lib/prisma', () => ({
  prisma: {
    user: {
      findUnique: vi.fn(),
      create:     vi.fn(),
    }
  }
}))

import bcrypt            from 'bcrypt'
import { prisma }        from '../lib/prisma'
import { register, DuplicateEmailError } from './auth.service'

describe('register', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(prisma.user.findUnique).mockResolvedValue(null)
    vi.mocked(prisma.user.create).mockResolvedValue(
      { id: 1, email: 'mark@example.com', passwordHash: '$hashed$', createdAt: new Date(), updatedAt: new Date() }
    )
  })

  it('creates user with hashed password', async () => {
    await register('mark@example.com', 'mypassword')
    expect(prisma.user.create).toHaveBeenCalledWith({
      data: { email: 'mark@example.com', passwordHash: '$hashed$' }
    })
  })

  it('hashes password with 12 rounds', async () => {
    await register('mark@example.com', 'mypassword')
    expect(bcrypt.hash).toHaveBeenCalledWith('mypassword', 12)
  })

  it('throws DuplicateEmailError when email already exists', async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue({ id: 1, email: 'mark@example.com' } as any)
    await expect(register('mark@example.com', 'pass')).rejects.toThrow(DuplicateEmailError)
  })

  it('does not call create when email exists', async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue({ id: 1 } as any)
    try { await register('mark@example.com', 'pass') } catch { /* expected */ }
    expect(prisma.user.create).not.toHaveBeenCalled()
  })
})
```

---

---
