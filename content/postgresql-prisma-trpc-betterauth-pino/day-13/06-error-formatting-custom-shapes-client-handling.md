# 6 — Error Formatting — Custom Shapes, Client Handling

---

## T — TL;DR

`errorFormatter` in `initTRPC` controls the shape of every error response. Attach Zod field errors, request IDs, and safe error messages here. On the client, `TRPCClientError` carries the formatted shape — use `err.data?.zodError?.fieldErrors` for form errors and `err.data?.code` for conditional UI logic.

---

## K — Key Concepts

```typescript
// ── errorFormatter — full implementation ──────────────────────────────────
import { initTRPC, TRPCError } from '@trpc/server'
import { ZodError }             from 'zod'
import { randomUUID }           from 'crypto'

const t = initTRPC.context<Context>().create({
  transformer: superjson,

  errorFormatter({ shape, error, ctx, path, input, type }) {
    // shape: the default error shape
    // {
    //   message: string
    //   code:    number (HTTP status)
    //   data: {
    //     code:       string  ('NOT_FOUND', 'UNAUTHORIZED', etc.)
    //     httpStatus: number
    //     path:       string
    //     stack:      string | undefined (dev only)
    //   }
    // }

    return {
      ...shape,
      data: {
        ...shape.data,

        // Zod validation errors — field-level, always attached
        zodError:
          error.cause instanceof ZodError
            ? error.cause.flatten()
            : null,
        // zodError.fieldErrors: { title: ['Too long'], email: ['Invalid email'] }
        // zodError.formErrors:  ['global form error']

        // Request ID for correlating client errors with server logs
        requestId: randomUUID(),

        // Safe user-facing message (don't leak internal errors in production)
        userMessage: getUserMessage(error),

        // Only expose stack trace in development
        stack: process.env.NODE_ENV === 'development' ? shape.data.stack : undefined,
      },
    }
  },
})

function getUserMessage(error: TRPCError | unknown): string {
  if (!(error instanceof TRPCError)) return 'An unexpected error occurred'

  switch (error.code) {
    case 'UNAUTHORIZED':        return 'Please sign in to continue'
    case 'FORBIDDEN':           return error.message || 'You do not have permission'
    case 'NOT_FOUND':           return error.message || 'Resource not found'
    case 'BAD_REQUEST':         return 'Invalid request — check your input'
    case 'TOO_MANY_REQUESTS':   return 'Too many requests — please wait a moment'
    case 'INTERNAL_SERVER_ERROR': return 'Something went wrong on our end'
    default:                    return error.message || 'An error occurred'
  }
}
```

```typescript
// ── Client: handling tRPC errors ───────────────────────────────────────────
'use client'
import { TRPCClientError } from '@trpc/client'
import type { AppRouter }  from '@/server/root'
import { trpc }            from '@/lib/trpc/client'
import { useState }        from 'react'

function CreatePostForm() {
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})
  const [globalError, setGlobalError] = useState<string | null>(null)

  const createPost = trpc.post.create.useMutation({
    onError: (err) => {
      // Zod field errors — from errorFormatter
      const fe = err.data?.zodError?.fieldErrors
      if (fe) {
        setFieldErrors({
          title: fe.title?.[0] ?? '',
          body:  fe.body?.[0]  ?? '',
        })
        return
      }

      // Auth errors — redirect or show inline
      if (err.data?.code === 'UNAUTHORIZED') {
        window.location.href = '/sign-in'
        return
      }

      // Generic error — show user-facing message
      setGlobalError(err.data?.userMessage ?? err.message)
    },
  })

  return (
    <form onSubmit={e => {
      e.preventDefault()
      const fd = new FormData(e.currentTarget as HTMLFormElement)
      createPost.mutate({
        title: fd.get('title') as string,
        body:  fd.get('body')  as string,
      })
    }}>
      <input name="title" />
      {fieldErrors.title && <span style={{ color: 'red' }}>{fieldErrors.title}</span>}
      <textarea name="body" />
      {fieldErrors.body  && <span style={{ color: 'red' }}>{fieldErrors.body}</span>}
      {globalError       && <p style={{ color: 'red' }}>{globalError}</p>}
      <button type="submit" disabled={createPost.isPending}>Submit</button>
    </form>
  )
}
```

```typescript
// ── Global error handler — catch unhandled tRPC errors ────────────────────
// src/lib/trpc/provider.tsx — add onError to queryClient defaults
const queryClient = new QueryClient({
  defaultOptions: {
    mutations: {
      onError: (error) => {
        if (error instanceof TRPCClientError) {
          if (error.data?.code === 'UNAUTHORIZED') {
            // Session expired — redirect to sign-in
            window.location.href = '/sign-in'
          }
        }
      },
    },
    queries: {
      retry: (failureCount, error) => {
        // Don't retry auth errors
        if (error instanceof TRPCClientError) {
          if (['UNAUTHORIZED','FORBIDDEN','NOT_FOUND'].includes(error.data?.code ?? '')) {
            return false
          }
        }
        return failureCount < 2
      },
    },
  },
})
```

```typescript
// ── Type-safe error checking ───────────────────────────────────────────────
import { TRPCClientError } from '@trpc/client'
import type { AppRouter }  from '@/server/root'

// Type guard for tRPC errors
function isTRPCError(err: unknown): err is TRPCClientError<AppRouter> {
  return err instanceof TRPCClientError
}

// In an async function (mutateAsync):
try {
  await createPost.mutateAsync({ title, body })
} catch (err) {
  if (isTRPCError(err)) {
    console.log(err.data?.code)        // 'NOT_FOUND' | 'FORBIDDEN' | ...
    console.log(err.data?.zodError)    // ZodFlattenedErrors | null
    console.log(err.data?.requestId)   // UUID for correlating with server logs
    console.log(err.data?.userMessage) // Safe user-facing string
  }
}
```

---

## W — Why It Matters

- `requestId` in the error shape creates a traceability bridge — when a user reports an error, they can provide the request ID, and you can find the exact server log entry. This is a production debugging superpower.
- The `userMessage` pattern separates safe UI copy from raw error messages — internal `TRPCError` messages may contain stack traces, database error details, or sensitive paths. A curated `userMessage` map ensures users always see something meaningful and safe.
- Disabling retries for `UNAUTHORIZED` and `NOT_FOUND` errors is a correctness issue, not just performance — retrying a 401 three times just means three consecutive auth failures. The TanStack Query retry logic should be aware of tRPC error codes.

---

## I — Interview Q&A

### Q: How do you expose Zod validation errors to the client in tRPC, and what does the data shape look like?

**A:** The `errorFormatter` in `initTRPC.create()` runs every time a procedure throws. When a Zod validation error occurs, `error.cause` is a `ZodError` instance. In the formatter, check `error.cause instanceof ZodError` and call `.flatten()` to get `{ fieldErrors: { fieldName: string[] }, formErrors: string[] }`. Attach this to `shape.data.zodError`. On the client, `useMutation`'s `onError` callback receives the `TRPCClientError` — access `err.data?.zodError?.fieldErrors` to get a record of field names to error message arrays. For example: `{ title: ['Title is required', 'Title too long'], email: ['Invalid email'] }`. This gives you everything needed to display inline form errors without any additional API calls.

---

## C — Common Pitfalls + Fix

### ❌ Throwing raw errors with internal details — leaking server internals

```typescript
// ❌ Leaks database error, table names, or stack trace to the client
.mutation(async ({ input, ctx }) => {
  const result = await ctx.prisma.post.create({ data: input })
  // If this throws PrismaClientKnownRequestError...
  // Without errorFormatter, the full Prisma error is sent to the client ❌
})
```

**Fix:** Catch and re-throw as TRPCError with a safe message:

```typescript
// ✅ Wrap Prisma calls — translate to safe tRPC errors
.mutation(async ({ input, ctx }) => {
  try {
    return await ctx.prisma.post.create({ data: { ...input, authorId: ctx.user.id } })
  } catch (err: any) {
    if (err?.code === 'P2002') {
      throw new TRPCError({
        code:    'CONFLICT',
        message: 'A post with this title already exists.',
      })
    }
    throw new TRPCError({
      code:    'INTERNAL_SERVER_ERROR',
      message: 'Failed to create post.',
      cause:   err,   // logged server-side, not sent to client
    })
  }
})
```

---

## K — Coding Challenge + Solution

### Challenge

Write a complete `errorFormatter` that: (1) attaches `zodError`; (2) attaches a `requestId` (UUID); (3) maps error codes to `userMessage` strings; (4) only includes `stack` in development; (5) logs INTERNAL_SERVER_ERROR to console. Then show a React hook `useFormErrors` that extracts field errors from a mutation's error state.

### Solution

```typescript
// src/server/trpc.ts — errorFormatter
import { randomUUID } from 'crypto'
import { ZodError }   from 'zod'

errorFormatter({ shape, error }) {
  if (error.code === 'INTERNAL_SERVER_ERROR') {
    console.error('[tRPC] Internal error:', error.cause ?? error.message)
  }

  const userMessages: Partial<Record<typeof error.code, string>> = {
    UNAUTHORIZED:         'Please sign in to continue.',
    FORBIDDEN:            error.message || 'You do not have permission to do this.',
    NOT_FOUND:            error.message || 'The requested resource was not found.',
    BAD_REQUEST:          'Your request contains invalid data.',
    TOO_MANY_REQUESTS:    'Slow down — too many requests.',
    INTERNAL_SERVER_ERROR:'Something went wrong. We\'ve been notified.',
    CONFLICT:             error.message || 'This resource already exists.',
  }

  return {
    ...shape,
    data: {
      ...shape.data,
      zodError:    error.cause instanceof ZodError ? error.cause.flatten() : null,
      requestId:   randomUUID(),
      userMessage: userMessages[error.code] ?? 'An unexpected error occurred.',
      stack:       process.env.NODE_ENV === 'development' ? shape.data.stack : undefined,
    },
  }
},

// src/hooks/useFormErrors.ts — client hook
import { TRPCClientError } from '@trpc/client'
import { useState }        from 'react'
import type { AppRouter }  from '@/server/root'

type FieldErrors = Record<string, string | undefined>

export function useFormErrors() {
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({})
  const [globalError, setGlobalError] = useState<string | null>(null)

  function handleError(err: TRPCClientError<AppRouter>) {
    const fe = err.data?.zodError?.fieldErrors
    if (fe && Object.keys(fe).length > 0) {
      const mapped: FieldErrors = {}
      for (const [key, msgs] of Object.entries(fe)) {
        mapped[key] = msgs?.[0]
      }
      setFieldErrors(mapped)
      setGlobalError(null)
    } else {
      setFieldErrors({})
      setGlobalError(err.data?.userMessage ?? err.message)
    }
  }

  function clearErrors() {
    setFieldErrors({})
    setGlobalError(null)
  }

  return { fieldErrors, globalError, handleError, clearErrors }
}

// Usage:
// const { fieldErrors, globalError, handleError } = useFormErrors()
// const create = trpc.post.create.useMutation({ onError: handleError })
// <input name="title" /> {fieldErrors.title && <span>{fieldErrors.title}</span>}
```

---

---
