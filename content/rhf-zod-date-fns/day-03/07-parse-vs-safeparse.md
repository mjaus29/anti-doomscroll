# 7 — `parse` vs `safeParse`

---

## T — TL;DR

`schema.parse(data)` throws a `ZodError` on failure. `schema.safeParse(data)` never throws — it returns `{ success: true, data }` or `{ success: false, error }`. Use `safeParse` in forms, API handlers, and anywhere errors should be handled gracefully.

---

## K — Key Concepts

```ts
import { z } from 'zod'

const Schema = z.object({ name: z.string().min(2), age: z.number().int().min(18) })

// ─── parse — throws ZodError on failure
try {
  const data = Schema.parse({ name: 'M', age: 15 })  // throws
} catch (err) {
  if (err instanceof z.ZodError) {
    console.log(err.issues)
    // [
    //   { code: 'too_small', path: ['name'], message: 'String must contain at least 2 character(s)' },
    //   { code: 'too_small', path: ['age'],  message: 'Number must be greater than or equal to 18' }
    // ]
    err.flatten()
    // { fieldErrors: { name: ['String must…'], age: ['Number must…'] }, formErrors: [] }
  }
}

// ─── safeParse — never throws
const result = Schema.safeParse({ name: 'M', age: 15 })

if (result.success) {
  // TypeScript narrows: result.data is typed
  console.log(result.data.name)  // string
} else {
  // TypeScript narrows: result.error is ZodError
  result.error.issues         // ZodIssue[]
  result.error.flatten()      // { fieldErrors, formErrors }
  result.error.format()       // nested error object
}

// ─── parseAsync / safeParseAsync — for schemas with async refinements
const AsyncSchema = z.object({
  username: z.string().refine(async v => {
    const taken = await checkUsername(v)
    return !taken
  }, 'Username taken')
})

const res = await AsyncSchema.safeParseAsync({ username: 'mark' })
```

```ts
// ─── ZodError helpers

const err = result.error  // ZodError

// .issues — flat array of all errors
err.issues
// [{ code, path, message, ... }]

// .flatten() — grouped by field (best for forms)
err.flatten()
// {
//   formErrors:  string[]          — errors with no field path
//   fieldErrors: { [field]: string[] }  — errors per field
// }

// .format() — nested object matching input shape
err.format()
// {
//   _errors: [],
//   name: { _errors: ['String must contain at least 2 character(s)'] },
//   age:  { _errors: ['Number must be greater than or equal to 18'] }
// }
```

---

## W — Why It Matters

- `safeParse` is the correct default — throwing errors in form handlers or API routes breaks the request/response cycle unless you have perfect try/catch coverage. `safeParse` returns a result object you control.
- `error.flatten()` produces `{ fieldErrors: { field: string[] } }` — this maps directly to RHF's error structure when manually integrating Zod with forms (without `zodResolver`).
- `parseAsync` / `safeParseAsync` is required for schemas with async `.refine()` calls — calling synchronous `parse` on an async schema throws immediately.

---

## I — Interview Q&A

### Q: When would you use `parse` instead of `safeParse`?

**A:** Use `parse` when failure is a programming error that should crash loudly — for example, validating a hardcoded configuration object at startup, or validating environment variables at boot time. If the schema fails, the app should not start. Use `safeParse` everywhere else — user input, API request bodies, external API responses — where failure is an expected runtime condition you handle gracefully by returning validation errors to the caller.

---

## C — Common Pitfalls + Fix

### ❌ Using `parse` in an API route — unhandled ZodError crashes the handler

```ts
// ❌ Throws ZodError — crashes the handler unless caught
export async function POST(req: Request) {
  const body = await req.json()
  const data = Schema.parse(body)  // throws on invalid input ❌
  await db.insert(data)
  return Response.json({ ok: true })
}
```

**Fix:** Use `safeParse` and return a 400 on failure:

```ts
// ✅
export async function POST(req: Request) {
  const body   = await req.json()
  const result = Schema.safeParse(body)
  if (!result.success) {
    return Response.json({ errors: result.error.flatten() }, { status: 400 })
  }
  await db.insert(result.data)
  return Response.json({ ok: true })
}
```

---

## K — Coding Challenge + Solution

### Challenge

Build a Next.js API route handler that: accepts `POST` with a JSON body `{ email, password }`, validates with `safeParse`, returns 400 with `fieldErrors` on failure, returns 200 with `{ token }` on success. Demonstrate both branches.

### Solution

```ts
// src/app/api/auth/login/route.ts
import { z } from 'zod'

const LoginSchema = z.object({
  email:    z.string().email('Invalid email'),
  password: z.string().min(8, 'Password must be at least 8 characters')
})

export async function POST(req: Request) {
  const body   = await req.json().catch(() => null)
  const result = LoginSchema.safeParse(body)

  if (!result.success) {
    return Response.json(
      { errors: result.error.flatten().fieldErrors },
      { status: 400 }
    )
    // Body: { errors: { email: ['Invalid email'], password: ['...'] } }
  }

  // result.data is fully typed: { email: string, password: string }
  const { email, password } = result.data

  // Mock auth
  if (email !== 'mark@example.com' || password !== 'password123') {
    return Response.json({ errors: { root: ['Invalid credentials'] } }, { status: 401 })
  }

  return Response.json({ token: 'mock-jwt-token' }, { status: 200 })
}

// Test cases (curl equivalent):
// POST { email: 'bad', password: '123' }
// → 400 { errors: { email: ['Invalid email'], password: ['...8 chars'] } }
//
// POST { email: 'mark@example.com', password: 'password123' }
// → 200 { token: 'mock-jwt-token' }
```

---

---
