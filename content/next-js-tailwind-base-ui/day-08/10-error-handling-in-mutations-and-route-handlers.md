# 10 — Error Handling in Mutations and Route Handlers

---

## T — TL;DR

Robust error handling means: **expected errors are returned** (validation failures, not found), **unexpected errors are thrown** (caught by `error.tsx`), **Route Handlers always return proper HTTP status codes**, and **internal error details never reach the client**. Every layer — Server Actions, Route Handlers, and Client Components — has its own error handling responsibility.

---

## K — Key Concepts

### The Two Error Categories

```
Expected errors (recoverable — user can fix):
  → Validation failures (missing field, invalid format)
  → Business rule violations (duplicate email, insufficient stock)
  → "Not found" for user-provided IDs
  → Unauthorized / Forbidden

  Handling: RETURN an error object from the Server Action
            Use actionState.errors to show field-level messages
            HTTP 400/401/403/404/409/422 in Route Handlers

Unexpected errors (unrecoverable — system issue):
  → Database connection failures
  → External API timeouts
  → Programming errors (null reference, etc.)
  → Disk/memory/infrastructure failures

  Handling: THROW an error from Server Components/Actions
            → caught by nearest error.tsx boundary
            HTTP 500/502/503/504 in Route Handlers
            Log internally with error.digest for tracing
```

### Error Handling in Server Actions — Return vs Throw

```tsx
// src/app/products/actions.ts
"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { notFound } from "next/navigation";

export interface ActionResult {
  success: boolean;
  message?: string;
  errors?: Record<string, string[]>;
}

const Schema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  price: z.coerce.number().positive("Price must be a positive number"),
  stock: z.coerce
    .number()
    .int()
    .nonnegative("Stock cannot be negative")
    .default(0),
});

export async function createProduct(
  _prev: ActionResult,
  formData: FormData
): Promise<ActionResult> {
  // ─── Expected error: Validation
  const result = Schema.safeParse(Object.fromEntries(formData));
  if (!result.success) {
    return {
      success: false,
      message: "Please fix the errors below.",
      errors: result.error.flatten().fieldErrors,
    };
  }

  try {
    // ─── Expected error: Business rule (duplicate)
    const existing = await db.product.findFirst({
      where: { name: result.data.name },
    });
    if (existing) {
      return {
        success: false,
        errors: { name: ["A product with this name already exists."] },
      };
    }

    await db.product.create({ data: result.data });
    revalidatePath("/products");

    return { success: true, message: "Product created successfully." };
  } catch (error) {
    // ─── Unexpected error: DB failure, etc.
    // Log with full detail server-side
    console.error("[createProduct] Unexpected error:", error);

    // Return generic message — never expose stack traces or DB errors
    return {
      success: false,
      message: "An unexpected error occurred. Please try again.",
    };
  }
}

export async function getProduct(id: string) {
  const product = await db.product.findUnique({ where: { id } });

  // Use notFound() for resource not found — renders the nearest not-found.tsx
  if (!product) notFound();

  return product;
}
```

### `error.tsx` — Boundary for Thrown Errors

```tsx
// src/app/products/error.tsx
// Catches errors THROWN from Server Components, Server Actions, and
// async operations within the /products route segment
"use client";

import { useEffect } from "react";

interface Props {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function ProductsError({ error, reset }: Props) {
  useEffect(() => {
    // Log to monitoring (Sentry, DataDog, etc.)
    // error.digest is the server-side error ID — matches server logs
    console.error("Products error:", error.digest ?? error.message);
  }, [error]);

  return (
    <div className="flex flex-col items-center justify-center py-20 px-4 text-center">
      <p className="text-5xl mb-4">⚠️</p>
      <h2 className="text-lg font-semibold text-gray-900 mb-2">
        Something went wrong
      </h2>
      <p className="text-sm text-gray-500 mb-2 max-w-sm">
        We couldn't complete this action. Our team has been notified.
      </p>
      {error.digest && (
        <p className="text-xs font-mono text-gray-400 mb-6">
          Reference: {error.digest}
        </p>
      )}
      <div className="flex gap-3">
        <button
          onClick={reset}
          className="px-5 py-2.5 bg-blue-600 text-white text-sm font-medium
                     rounded-xl hover:bg-blue-700 transition-colors"
        >
          Try again
        </button>
        <a
          href="/products"
          className="px-5 py-2.5 border text-gray-700 text-sm font-medium
                     rounded-xl hover:bg-gray-50 transition-colors"
        >
          Go back
        </a>
      </div>
    </div>
  );
}
```

### `not-found.tsx` — Handle 404s

```tsx
// src/app/products/[id]/not-found.tsx
// Rendered when notFound() is called in the /products/[id] segment

import Link from "next/link";

export default function ProductNotFound() {
  return (
    <div className="flex flex-col items-center justify-center py-20 px-4 text-center">
      <p className="text-5xl mb-4">🔍</p>
      <h2 className="text-xl font-semibold text-gray-900 mb-2">
        Product not found
      </h2>
      <p className="text-sm text-gray-500 mb-6">
        This product may have been removed or the link is incorrect.
      </p>
      <Link
        href="/products"
        className="px-5 py-2.5 bg-blue-600 text-white text-sm font-medium
                   rounded-xl hover:bg-blue-700 transition-colors"
      >
        Browse all products
      </Link>
    </div>
  );
}
```

### Error Handling in Route Handlers — Consistent Error Format

```tsx
// src/lib/api-error.ts — shared error response utilities

export function apiError(message: string, status: number, details?: unknown) {
  return Response.json(
    {
      error: message,
      status,
      ...(details ? { details } : {}),
      timestamp: new Date().toISOString(),
    },
    { status }
  );
}

// Typed error classes for consistent handling
export class ValidationError extends Error {
  constructor(public details: Record<string, string[]>) {
    super("Validation failed");
    this.name = "ValidationError";
  }
}

export class NotFoundError extends Error {
  constructor(resource: string, id: string) {
    super(`${resource} with id '${id}' not found`);
    this.name = "NotFoundError";
  }
}

export class UnauthorizedError extends Error {
  constructor(message = "Unauthorized") {
    super(message);
    this.name = "UnauthorizedError";
  }
}
```

```tsx
// src/app/api/products/[id]/route.ts — comprehensive error handling
import { NextRequest } from "next/server";
import {
  apiError,
  NotFoundError,
  UnauthorizedError,
  ValidationError,
} from "@/lib/api-error";
import { z } from "zod";

const UpdateSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  price: z.number().positive().optional(),
});

type Params = { params: Promise<{ id: string }> };

export async function PATCH(request: NextRequest, { params }: Params) {
  try {
    const { id } = await params;

    // ─── Auth check
    const authHeader = request.headers.get("authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      throw new UnauthorizedError("Bearer token required");
    }
    const userId = await verifyToken(authHeader.slice(7));
    if (!userId) throw new UnauthorizedError("Invalid token");

    // ─── Parse body
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return apiError("Request body must be valid JSON", 400);
    }

    // ─── Validate
    const result = UpdateSchema.safeParse(body);
    if (!result.success) {
      throw new ValidationError(result.error.flatten().fieldErrors);
    }

    // ─── Check resource exists
    const product = await db.product.findUnique({ where: { id } });
    if (!product) throw new NotFoundError("Product", id);

    // ─── Check ownership
    if (product.ownerId !== userId) {
      return apiError("Forbidden — you do not own this product", 403);
    }

    // ─── Update
    const updated = await db.product.update({
      where: { id },
      data: result.data,
    });

    return Response.json({ data: updated });
  } catch (error) {
    // ─── Typed error handling
    if (error instanceof ValidationError) {
      return apiError("Validation failed", 422, error.details);
    }
    if (error instanceof NotFoundError) {
      return apiError(error.message, 404);
    }
    if (error instanceof UnauthorizedError) {
      return apiError(error.message, 401);
    }

    // ─── Unexpected error
    console.error("[PATCH /api/products/:id]", error);
    return apiError("Internal server error", 500);
  }
}
```

### Client-Side Error Handling for Server Action Calls

```tsx
// When calling Server Actions from Client Components (non-form, programmatic)
"use client";

import { useTransition } from "react";
import { deleteProduct } from "../actions";

export function DeleteButton({ id, name }: { id: string; name: string }) {
  const [isPending, startTransition] = useTransition();

  function handleDelete() {
    if (!confirm(`Delete "${name}"? This cannot be undone.`)) return;

    startTransition(async () => {
      try {
        await deleteProduct(id);
        // On success: revalidatePath in the action causes re-render
      } catch (error) {
        // Thrown errors from Server Actions reach here
        // Show toast / snackbar notification
        console.error("Delete failed:", error);
        alert("Failed to delete product. Please try again.");
        // In production: use a toast library (sonner, react-hot-toast)
      }
    });
  }

  return (
    <button
      onClick={handleDelete}
      disabled={isPending}
      className="px-3 py-1.5 bg-red-600 text-white text-xs font-medium
                 rounded-lg hover:bg-red-700 disabled:opacity-50"
    >
      {isPending ? "Deleting..." : "Delete"}
    </button>
  );
}
```

### Global Error Boundary — `global-error.tsx`

```tsx
// src/app/global-error.tsx
// Last resort: catches errors in the ROOT layout
// Must include its own <html> and <body>

"use client";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="en">
      <body
        className="min-h-screen bg-gray-50 flex items-center
                       justify-center px-4"
      >
        <div className="text-center max-w-md">
          <p className="text-6xl mb-6">🔥</p>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            Something went seriously wrong
          </h1>
          <p className="text-gray-500 text-sm mb-2">
            We're sorry — the application encountered an unexpected error.
          </p>
          {error.digest && (
            <p className="font-mono text-xs text-gray-400 mb-6">
              Error ID: {error.digest}
            </p>
          )}
          <button
            onClick={reset}
            className="px-6 py-3 bg-blue-600 text-white font-semibold
                       rounded-xl hover:bg-blue-700"
          >
            Reload application
          </button>
        </div>
      </body>
    </html>
  );
}
```

---

## W — Why It Matters

- The return-vs-throw distinction is the single most important error handling design decision — using `throw` for validation errors means every form submission that has a typo shows the user a full-page error boundary instead of an inline field error message. Getting this wrong destroys UX.
- `error.digest` is Next.js's built-in error correlation ID — it's a hash of the error that's the same on both the server (in logs) and the client (in the error boundary). When a user reports "I got error ID abc123", you can find the exact stack trace in your server logs.
- The consistent error format in Route Handlers (`{ error, status, details, timestamp }`) makes frontend error handling predictable — every error response has the same shape regardless of which route threw it, so the frontend can handle them generically.

---

## I — Interview Q&A

### Q1: What is `error.digest` in Next.js and why is it important?

**A:** `error.digest` is a unique hash that Next.js generates server-side for each unexpected error. It's attached to the `error` object in `error.tsx` boundaries. The same digest appears in both the server logs (with the full stack trace and context) and in the `error.tsx` component (where it can be shown to the user as a reference number). This correlation allows support teams to match a user's error report ("I got error ID abc123") to the exact server-side stack trace, without exposing internal error details to the client.

### Q2: What is the difference between `error.tsx` and `global-error.tsx`?

**A:** `error.tsx` is a route-segment-level error boundary — it catches errors thrown within its co-located route segment (`page.tsx`, Server Actions, etc.) and renders an error UI while the surrounding layout (navigation, sidebar) remains intact. A user can recover without losing the page structure. `global-error.tsx` is the root-level fallback — it only triggers when an error occurs in the root `layout.tsx` itself, which is uncommon but catastrophic since the layout is shared by everything. It must include its own `<html>` and `<body>` tags because the root layout has failed and won't render them. In practice, you rarely need `global-error.tsx` — `error.tsx` at each route segment handles the vast majority of errors.

### Q3: How should Server Actions handle errors — return or throw?

**A:** Use the **return pattern** for expected, user-recoverable errors: validation failures, duplicate entries, business rule violations, "not found" for user-provided input. Return a typed state object with `{ success: false, errors: { fieldName: ['message'] } }` that `useActionState` propagates to the UI as inline error messages. Use the **throw pattern** for unexpected, system-level errors: database connection failures, external API errors, programming bugs. Thrown errors propagate to the nearest `error.tsx` boundary, showing a full-page error state with a retry option. The key principle: if the user can fix it, return it as field errors; if the system is broken, throw it to the error boundary.

---

## C — Common Pitfalls + Fix

### ❌ Pitfall: Throwing inside a `try/catch` that swallows all errors — hiding bugs

```tsx
// ❌ Swallows ALL errors — unexpected bugs are silently lost
export async function updateProduct(id: string, data: ProductData) {
  "use server";
  try {
    await db.product.update({ where: { id }, data });
    revalidatePath("/products");
    return { success: true };
  } catch (error) {
    return { success: false, message: "Something went wrong." };
    // If db.product.update throws a null pointer bug,
    // we return a generic error and the bug is never surfaced ❌
  }
}
```

**Fix:** Only catch expected errors — let unexpected ones propagate:

```tsx
export async function updateProduct(id: string, data: ProductData) {
  "use server";
  // ─── Expected: not found
  const existing = await db.product.findUnique({ where: { id } });
  if (!existing) return { success: false, message: "Product not found." };

  // ─── Expected: authorization
  const user = await getCurrentUser();
  if (existing.ownerId !== user?.userId) {
    return { success: false, message: "Not authorized." };
  }

  // ─── Unexpected: let DB errors propagate → error.tsx boundary
  await db.product.update({ where: { id }, data });
  revalidatePath("/products");
  return { success: true };
}
```

### ❌ Pitfall: Not having an `error.tsx` at the right route level

```tsx
// ❌ Only global-error.tsx — any product mutation error takes down the whole app
// No error.tsx at /products or /products/[id]

// User sees the global error page (no navigation, no layout) for a simple
// "product not found" error that should show a scoped error with "go back"
```

**Fix:** Add `error.tsx` at each meaningful route segment:

```
src/app/
├── error.tsx                  ← catches app-level errors (keeps root layout)
├── global-error.tsx           ← absolute last resort (no layout)
├── products/
│   ├── error.tsx              ← catches /products errors (keeps nav)
│   └── [id]/
│       ├── error.tsx          ← catches /products/[id] errors (most specific)
│       └── not-found.tsx      ← for notFound() calls in /products/[id]
```

### ❌ Pitfall: Exposing validation error details from external libraries to the client

```tsx
// ❌ Prisma error message exposed to client
export async function createUser(data: UserData) {
  "use server";
  try {
    await db.user.create({ data });
  } catch (error: any) {
    return { error: error.message };
    // Might expose: "Unique constraint failed on the fields: (`email`)"
    // Leaks database schema information ❌
  }
}
```

**Fix:** Map known error codes to user-friendly messages:

```tsx
export async function createUser(data: UserData) {
  "use server";
  try {
    await db.user.create({ data });
    return { success: true };
  } catch (error: any) {
    // Handle known Prisma error codes
    if (error?.code === "P2002") {
      // Unique constraint violation
      const field = error.meta?.target?.[0] ?? "field";
      return {
        success: false,
        errors: { [field]: [`This ${field} is already taken.`] },
      };
    }
    // Unexpected: log and return generic message
    console.error("[createUser]", error);
    return {
      success: false,
      message: "Could not create account. Please try again.",
    };
  }
}
```

---

## K — Coding Challenge + Solution

### Challenge

Build a complete error handling setup for a `/products` route with:

1. `createProductAction` with Zod validation (return errors) + unexpected error handling (catch and return generic)
2. `deleteProductAction` that throws for unauthorized access (caught by error boundary)
3. `error.tsx` for the products route segment
4. `not-found.tsx` for `/products/[id]`
5. A `ProductForm` Client Component that displays field errors from `useActionState`
6. A `DeleteButton` that uses `useTransition` and shows a toast-style notification on caught thrown errors

### Solution

```tsx
// src/app/products/actions.ts
"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { notFound } from "next/navigation";

export interface ProductActionState {
  success: boolean;
  message?: string;
  errors?: { name?: string[]; price?: string[]; stock?: string[] };
}

const CreateSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters").max(200),
  price: z.coerce.number().positive("Price must be a positive number"),
  stock: z.coerce
    .number()
    .int()
    .nonnegative("Stock cannot be negative")
    .default(0),
});

// Mock DB
let PRODUCTS = [
  { id: "p1", name: "Air Max 90", price: 120, stock: 15, ownerId: "u1" },
  { id: "p2", name: "Canvas Bag", price: 45, stock: 8, ownerId: "u1" },
];

export async function createProductAction(
  _prev: ProductActionState,
  formData: FormData
): Promise<ProductActionState> {
  // ─── Expected: Validation errors (return, not throw)
  const result = CreateSchema.safeParse(Object.fromEntries(formData));
  if (!result.success) {
    return {
      success: false,
      message: "Please fix the errors below.",
      errors: result.error.flatten().fieldErrors,
    };
  }

  try {
    // ─── Expected: Business rule violation (return, not throw)
    const duplicate = PRODUCTS.find(
      (p) => p.name.toLowerCase() === result.data.name.toLowerCase()
    );
    if (duplicate) {
      return {
        success: false,
        errors: { name: ["A product with this name already exists."] },
      };
    }

    // Create product
    const newProduct = {
      id: `p${Date.now()}`,
      ownerId: "u1",
      ...result.data,
    };
    PRODUCTS = [...PRODUCTS, newProduct];
    revalidatePath("/products");

    return {
      success: true,
      message: `"${result.data.name}" created successfully!`,
    };
  } catch (error) {
    // ─── Unexpected: log server-side, generic message to client
    console.error("[createProductAction] Unexpected error:", error);
    return {
      success: false,
      message: "An unexpected error occurred. Please try again.",
    };
  }
}

export async function deleteProductAction(id: string): Promise<void> {
  const product = PRODUCTS.find((p) => p.id === id);

  // ─── Expected: Not found → notFound() renders not-found.tsx
  if (!product) notFound();

  // ─── Expected: Unauthorized → THROW (not return) to propagate to error.tsx
  const currentUserId = "u1"; // In production: from session
  if (product.ownerId !== currentUserId) {
    throw new Error("You are not authorized to delete this product.");
    // → Propagates to /products/error.tsx boundary
  }

  PRODUCTS = PRODUCTS.filter((p) => p.id !== id);
  revalidatePath("/products");
  // No redirect here — caller handles navigation
}

export async function getProduct(id: string) {
  const product = PRODUCTS.find((p) => p.id === id);
  if (!product) notFound(); // ← renders not-found.tsx
  return product;
}

export async function getProducts() {
  return PRODUCTS;
}
```

```tsx
// src/app/products/error.tsx
"use client";

import { useEffect } from "react";

export default function ProductsError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // In production: report to Sentry/DataDog with error.digest
    console.error("[products error boundary]", error.digest ?? error.message);
  }, [error]);

  return (
    <div className="flex flex-col items-center justify-center py-24 px-4 text-center">
      <p className="text-5xl mb-5">⚠️</p>
      <h2 className="text-lg font-semibold text-gray-900 mb-2">
        Something went wrong
      </h2>
      <p className="text-sm text-gray-500 mb-2 max-w-sm">
        We couldn't complete your request. Please try again or contact support.
      </p>
      {error.digest && (
        <p
          className="text-xs font-mono text-gray-400 bg-gray-50 border
                      rounded px-3 py-1.5 mb-6"
        >
          Error ID: {error.digest}
        </p>
      )}
      <div className="flex gap-3">
        <button
          onClick={reset}
          className="px-5 py-2.5 bg-blue-600 text-white text-sm font-semibold
                     rounded-xl hover:bg-blue-700 transition-colors"
        >
          Try again
        </button>
        <a
          href="/products"
          className="px-5 py-2.5 border text-gray-700 text-sm font-medium
                      rounded-xl hover:bg-gray-50 transition-colors"
        >
          Back to products
        </a>
      </div>
    </div>
  );
}
```

```tsx
// src/app/products/[id]/not-found.tsx
import Link from "next/link";

export default function ProductNotFound() {
  return (
    <div className="flex flex-col items-center justify-center py-24 px-4 text-center">
      <p className="text-5xl mb-5">🔍</p>
      <h2 className="text-xl font-semibold text-gray-900 mb-2">
        Product not found
      </h2>
      <p className="text-sm text-gray-500 mb-6 max-w-sm">
        This product may have been removed or the link might be incorrect.
      </p>
      <Link
        href="/products"
        className="px-5 py-2.5 bg-blue-600 text-white text-sm font-semibold
                   rounded-xl hover:bg-blue-700 transition-colors"
      >
        Browse all products
      </Link>
    </div>
  );
}
```

```tsx
// src/app/products/_components/product-form.tsx
"use client";

import { useActionState, useEffect, useRef } from "react";
import { createProductAction, type ProductActionState } from "../actions";
import { useFormStatus } from "react-dom";

const INITIAL: ProductActionState = { success: false };

function FieldError({ errors }: { errors?: string[] }) {
  if (!errors?.length) return null;
  return (
    <p
      role="alert"
      className="text-red-500 text-xs mt-1 flex items-center gap-1"
    >
      <span>⚠</span> {errors[0]}
    </p>
  );
}

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="w-full py-3 bg-blue-600 text-white font-semibold rounded-xl
                 hover:bg-blue-700 disabled:opacity-50 transition-colors text-sm"
    >
      {pending ? (
        <span className="flex items-center justify-center gap-2">
          <span
            className="w-4 h-4 border-2 border-white/30 border-t-white
                           rounded-full animate-spin"
          />
          Creating...
        </span>
      ) : (
        "Create Product"
      )}
    </button>
  );
}

export function ProductForm() {
  const [state, formAction] = useActionState(createProductAction, INITIAL);
  const formRef = useRef<HTMLFormElement>(null);

  // Auto-reset on success
  useEffect(() => {
    if (state.success) formRef.current?.reset();
  }, [state.success]);

  return (
    <form
      ref={formRef}
      action={formAction}
      noValidate // ← we handle validation server-side
      className="bg-white border rounded-2xl p-6 space-y-4 max-w-sm"
    >
      <h2 className="font-semibold text-gray-900">New Product</h2>

      {/* Global status message */}
      {state.message && (
        <div
          role="status"
          aria-live="polite"
          className={`px-4 py-3 rounded-lg text-sm font-medium ${
            state.success
              ? "bg-green-50 text-green-700 border border-green-200"
              : "bg-red-50 text-red-700 border border-red-200"
          }`}
        >
          {state.message}
        </div>
      )}

      {/* Name field */}
      <div>
        <label
          className="block text-sm font-medium text-gray-700 mb-1"
          htmlFor="name"
        >
          Product Name
        </label>
        <input
          id="name"
          name="name"
          type="text"
          placeholder="e.g. Air Max 90"
          aria-describedby={state.errors?.name ? "name-error" : undefined}
          className={`w-full border rounded-lg px-3 py-2 text-sm
                      focus:outline-none focus:ring-2 focus:ring-blue-500
                      ${
                        state.errors?.name
                          ? "border-red-400 focus:ring-red-300"
                          : "border-gray-200"
                      }`}
        />
        <span id="name-error">
          <FieldError errors={state.errors?.name} />
        </span>
      </div>

      {/* Price field */}
      <div>
        <label
          className="block text-sm font-medium text-gray-700 mb-1"
          htmlFor="price"
        >
          Price (USD)
        </label>
        <input
          id="price"
          name="price"
          type="number"
          min="0"
          step="0.01"
          placeholder="0.00"
          aria-describedby={state.errors?.price ? "price-error" : undefined}
          className={`w-full border rounded-lg px-3 py-2 text-sm
                      focus:outline-none focus:ring-2 focus:ring-blue-500
                      ${
                        state.errors?.price
                          ? "border-red-400 focus:ring-red-300"
                          : "border-gray-200"
                      }`}
        />
        <span id="price-error">
          <FieldError errors={state.errors?.price} />
        </span>
      </div>

      {/* Stock field */}
      <div>
        <label
          className="block text-sm font-medium text-gray-700 mb-1"
          htmlFor="stock"
        >
          Initial Stock
        </label>
        <input
          id="stock"
          name="stock"
          type="number"
          min="0"
          placeholder="0"
          aria-describedby={state.errors?.stock ? "stock-error" : undefined}
          className={`w-full border rounded-lg px-3 py-2 text-sm
                      focus:outline-none focus:ring-2 focus:ring-blue-500
                      ${
                        state.errors?.stock
                          ? "border-red-400 focus:ring-red-300"
                          : "border-gray-200"
                      }`}
        />
        <span id="stock-error">
          <FieldError errors={state.errors?.stock} />
        </span>
      </div>

      <SubmitButton />
    </form>
  );
}
```

```tsx
// src/app/products/_components/delete-button.tsx
"use client";

import { useState, useTransition } from "react";
import { deleteProductAction } from "../actions";

interface Toast {
  message: string;
  type: "success" | "error";
}

export function DeleteButton({ id, name }: { id: string; name: string }) {
  const [isPending, startTransition] = useTransition();
  const [toast, setToast] = useState<Toast | null>(null);

  function showToast(message: string, type: Toast["type"]) {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  }

  function handleDelete() {
    if (!confirm(`Delete "${name}"? This cannot be undone.`)) return;

    startTransition(async () => {
      try {
        await deleteProductAction(id);
        showToast(`"${name}" deleted.`, "success");
        // revalidatePath in the action causes the list to refresh ✅
      } catch (error) {
        // Server Action threw an error (e.g., unauthorized)
        // error.tsx boundary did NOT catch it because this is a
        // programmatic call, not a render-time throw
        const message =
          error instanceof Error ? error.message : "Failed to delete product.";
        showToast(message, "error");
      }
    });
  }

  return (
    <div className="relative">
      <button
        onClick={handleDelete}
        disabled={isPending}
        className="px-3 py-1.5 bg-red-50 border border-red-200 text-red-600
                   text-xs font-medium rounded-lg hover:bg-red-100
                   disabled:opacity-50 disabled:cursor-wait transition-colors"
      >
        {isPending ? "Deleting..." : "Delete"}
      </button>

      {/* Toast notification */}
      {toast && (
        <div
          role="alert"
          aria-live="assertive"
          className={`fixed bottom-4 right-4 z-50 px-4 py-3 rounded-xl
                      text-sm font-medium shadow-lg border transition-all
                      ${
                        toast.type === "success"
                          ? "bg-green-50 text-green-700 border-green-200"
                          : "bg-red-50 text-red-700 border-red-200"
                      }`}
        >
          {toast.type === "success" ? "✅" : "❌"} {toast.message}
        </div>
      )}
    </div>
  );
}
```

```tsx
// src/app/products/page.tsx — Server Component wiring it all together
import { getProducts } from "./actions";
import { ProductForm } from "./_components/product-form";
import { DeleteButton } from "./_components/delete-button";

export default async function ProductsPage() {
  const products = await getProducts();

  return (
    <div className="max-w-5xl mx-auto px-4 py-10">
      <h1 className="text-2xl font-bold mb-8">Products</h1>

      <div className="grid grid-cols-3 gap-8">
        {/* Product list */}
        <div className="col-span-2 space-y-3">
          {products.length === 0 ? (
            <p className="text-gray-400 text-sm py-8 text-center">
              No products yet. Create one!
            </p>
          ) : (
            products.map((product) => (
              <div
                key={product.id}
                className="flex items-center justify-between bg-white
                           border rounded-xl px-5 py-4"
              >
                <div>
                  <p className="font-semibold text-gray-900">{product.name}</p>
                  <p className="text-sm text-gray-500 mt-0.5">
                    ${product.price} · {product.stock} in stock
                  </p>
                </div>
                {/* DeleteButton: shows toast for thrown errors */}
                <DeleteButton id={product.id} name={product.name} />
              </div>
            ))
          )}
        </div>

        {/* Create form */}
        <div>
          {/* ProductForm: shows field errors for returned errors */}
          <ProductForm />
        </div>
      </div>
    </div>
  );
}

/*
  Error handling architecture for /products:
  ─────────────────────────────────────────────────────────────────────
  createProductAction
    Validation failure   → return { errors } → ProductForm field errors ✅
    Duplicate name       → return { errors } → ProductForm field error ✅
    DB failure           → return { message } → ProductForm status msg ✅

  deleteProductAction
    notFound()           → renders /products/[id]/not-found.tsx ✅
    Unauthorized throw   → caught in DeleteButton catch() → toast ✅
    DB failure (unexpected) → if called from page render → error.tsx
                           → if called programmatically → try/catch in client ✅

  error.tsx              → catches render-time throws in /products segment
  not-found.tsx          → catches notFound() in /products/[id] segment
  ─────────────────────────────────────────────────────────────────────
*/
```

---

## ✅ Day 8 Complete — Mutations and Backend Integration

| #   | Subtopic                                                      | Status |
| --- | ------------------------------------------------------------- | ------ |
| 1   | Server Actions — Fundamentals and the Execution Model         | ☐      |
| 2   | App Router Forms — `useActionState`, Progressive Enhancement  | ☐      |
| 3   | Updating Data — Mutations, Optimistic Updates, Error Handling | ☐      |
| 4   | Route Handlers — `route.ts`, GET and POST Handlers            | ☐      |
| 5   | `NextRequest` and `NextResponse` — The Request/Response API   | ☐      |
| 6   | Cookies — Reading, Setting, Deleting                          | ☐      |
| 7   | Headers — Request Headers, Response Headers, Custom Headers   | ☐      |
| 8   | Redirects — Server-Side, Client-Side, Middleware              | ☐      |
| 9   | Proxy and Backend-for-Frontend (BFF) Patterns                 | ☐      |
| 10  | Error Handling in Mutations and Route Handlers                | ☐      |

---

## 🗺️ The One-Page Mental Model — Everything From Day 8

```
SERVER ACTIONS
  Declare:  'use server' at file-level (shared) or function-level (inline)
  Call from: form action={serverAction}, useActionState, useTransition
  Signature: (prevState, formData) for useActionState
             (arg1, arg2, ...) for direct programmatic calls
  Security: function body never ships to browser
            closed-over values are encrypted by Next.js
  vs API Routes: internal UI mutations → Server Action
                 external consumers / webhooks → Route Handler

FORM PATTERN
  useActionState(action, initialState)  → [state, formAction, isPending]
  <form action={formAction}>            → progressive enhancement ✅
  useFormStatus()                       → { pending } in child of <form>
  useEffect([state.success]) → form.reset()  ← reset after success
  <input type="hidden" name="id" value={id} /> ← pass extra data
  action.bind(null, id)                       ← alternative: bind()

OPTIMISTIC UPDATES
  useOptimistic(serverState, updaterFn) → [optimisticState, addOptimistic]
  Pattern:
    addOptimistic(change)   ← apply immediately (instant UI)
    await serverAction()    ← run real action
    // on success: server re-renders with real data
    // on failure: optimistic state auto-reverts to serverState ✅

MUTATIONS CHECKLIST
  1. Validate (Zod safeParse) — return errors if invalid
  2. Authorize — verify user owns the resource
  3. Write to DB
  4. Revalidate (revalidatePath / revalidateTag)
  5. Return result OR redirect()
  Never: call redirect() inside try/catch
  Never: expose raw DB/stack trace errors to client

ROUTE HANDLERS (route.ts)
  Export:   GET, POST, PUT, PATCH, DELETE, HEAD, OPTIONS
  Returns:  NextResponse.json() or new Response()
  Params:   await params (Promise in Next.js 16)
  Status codes: 200 GET/update, 201 create, 204 delete
                400 bad request, 401 auth, 403 forbidden
                404 not found, 422 validation, 500 server error

NextRequest / NextResponse
  request.nextUrl.searchParams  → query params (URL object)
  request.headers.get('name')   → request header value
  request.cookies.get('name')?.value ← .value (not string directly)
  request.json()                → parsed body (read once only)
  NextResponse.json(data, {status, headers})
  NextResponse.redirect(url)
  NextResponse.next({request:{headers}})  ← Middleware pass-through with modified headers

COOKIES
  Read:   (await cookies()).get('name')?.value
  Set:    cookieStore.set('name', value, { httpOnly, secure, sameSite, maxAge, path })
  Delete: cookieStore.delete('name')
  Server Components: read-only (cannot set)
  Server Actions / Route Handlers: read + write
  Rules: httpOnly:true for sessions, secure:true in prod, sameSite:'lax', path:'/'

HEADERS
  Read:  (await headers()).get('name')
  Middleware injection: set x-user-id, x-user-role in requestHeaders
    → Server Components read them → no repeated DB session lookups
  Security headers: configure in next.config.ts headers() for ALL routes
  headers() makes route dynamic (same as cookies())

REDIRECTS
  redirect('/path')              ← Server Component / Action (307, throws)
  permanentRedirect('/path')     ← SEO permanent move (308, throws)
  router.push('/path')           ← Client Component, adds history
  router.replace('/path')        ← Client Component, replaces history (post-login)
  NextResponse.redirect(url)     ← Middleware / Route Handler
  next.config.ts redirects()     ← static, no business logic
  NEVER: redirect() inside try/catch (it throws internally)
  ALWAYS: validate callbackUrl starts with '/' (prevent open redirect)

BFF PATTERN
  Server Component → external API: no Route Handler needed (for SSR-only data)
  Route Handler BFF: needed when Client Components fetch data via TanStack Query
  Benefits: API keys hidden, response shaped, parallel aggregation, caching
  Timeout: AbortController + setTimeout → 504 on timeout
  Cache: public s-maxage for shared data, private/no-store for user data
  Validate: Zod on external API responses → don't trust external schemas

ERROR HANDLING
  Return errors: validation, business rules, "not found" for user input
    → useActionState shows inline field errors
  Throw errors: DB failure, auth violation, programming bugs
    → error.tsx boundary with reset() + error.digest
  notFound(): → nearest not-found.tsx
  error.digest: correlates client error report to server log ✅
  NEVER: expose raw error.message / stack trace to client
  ALWAYS: log unexpected errors server-side with context
  error.tsx per segment: /products/error.tsx, /dashboard/error.tsx
  global-error.tsx: must include <html><body> (last resort)
```

---

> **Your next action:** Open your project and find one form that uses `useState` for `isLoading`, `error`, and `success`. Refactor it to use `useActionState` + a Server Action. Delete the three `useState` calls, add `'use server'` to the handler function, and replace the `fetch()` call with a direct DB operation. Run the form — watch the state management collapse from 30 lines to 5.
>
> _Doing one small thing beats opening a feed._
