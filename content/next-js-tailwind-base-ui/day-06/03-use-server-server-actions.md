# 3 — `'use server'` — Server Actions

---

## T — TL;DR

`'use server'` marks a function as a **Server Action** — an async function that runs on the server but can be called directly from a Client Component. It replaces the need for separate API routes for form submissions and mutations. Server Actions are the bridge between client interactions and server-side data changes.

---

## K — Key Concepts

### Two Ways to Use `'use server'`

```tsx
// ─── Option 1: Inline in a Server Component
// src/app/products/new/page.tsx (Server Component)

export default function NewProductPage() {
  async function createProduct(formData: FormData) {
    "use server"; // ← makes this function a Server Action

    const name = formData.get("name") as string;
    const price = Number(formData.get("price"));

    await db.product.create({ data: { name, price } });
    redirect("/products");
  }

  return (
    <form action={createProduct}>
      {" "}
      {/* ← Server Action as form action */}
      <input name="name" type="text" placeholder="Product name" />
      <input name="price" type="number" placeholder="Price" />
      <button type="submit">Create</button>
    </form>
  );
}
```

```tsx
// ─── Option 2: Dedicated actions file
// src/app/products/actions.ts
"use server"; // ← entire file is server actions

import { db } from "@/lib/db";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";

export async function createProduct(formData: FormData) {
  const name = formData.get("name") as string;
  const price = Number(formData.get("price"));

  await db.product.create({ data: { name, price } });
  revalidatePath("/products"); // ← revalidate the products list
  redirect("/products");
}

export async function deleteProduct(id: string) {
  await db.product.delete({ where: { id } });
  revalidatePath("/products");
}

export async function updateProduct(
  id: string,
  data: { name?: string; price?: number }
) {
  await db.product.update({ where: { id }, data });
  revalidatePath("/products");
  revalidatePath(`/products/${id}`);
}
```

### Calling Server Actions from Client Components

```tsx
// src/app/products/_components/delete-product-button.tsx
"use client";

import { useTransition } from "react";
import { deleteProduct } from "../actions"; // ← import Server Action

export function DeleteProductButton({ productId }: { productId: string }) {
  const [isPending, startTransition] = useTransition();

  function handleDelete() {
    startTransition(async () => {
      await deleteProduct(productId); // ← calling server action from client
    });
  }

  return (
    <button
      onClick={handleDelete}
      disabled={isPending}
      className="px-3 py-1.5 bg-red-600 text-white text-sm rounded-lg
                 hover:bg-red-700 disabled:opacity-50 disabled:cursor-wait"
    >
      {isPending ? "Deleting..." : "Delete"}
    </button>
  );
}
```

### Server Actions with `useActionState`

```tsx
// src/app/products/new/_components/create-product-form.tsx
"use client";

import { useActionState } from "react";
import { createProductWithValidation } from "../actions";

// Initial state type
interface FormState {
  errors: Record<string, string[]>;
  success: boolean;
  message: string;
}

const INITIAL_STATE: FormState = {
  errors: {},
  success: false,
  message: "",
};

export function CreateProductForm() {
  // useActionState: manages form state across server action calls
  const [state, formAction, isPending] = useActionState(
    createProductWithValidation,
    INITIAL_STATE
  );

  return (
    <form action={formAction} className="space-y-4 max-w-md">
      <div>
        <label className="block text-sm font-medium mb-1">Name</label>
        <input
          name="name"
          className="w-full border rounded-lg px-3 py-2"
          disabled={isPending}
        />
        {state.errors.name && (
          <p className="text-red-500 text-xs mt-1">{state.errors.name[0]}</p>
        )}
      </div>

      <div>
        <label className="block text-sm font-medium mb-1">Price</label>
        <input
          name="price"
          type="number"
          className="w-full border rounded-lg px-3 py-2"
          disabled={isPending}
        />
        {state.errors.price && (
          <p className="text-red-500 text-xs mt-1">{state.errors.price[0]}</p>
        )}
      </div>

      {state.message && (
        <p
          className={`text-sm ${state.success ? "text-green-600" : "text-red-500"}`}
        >
          {state.message}
        </p>
      )}

      <button
        type="submit"
        disabled={isPending}
        className="w-full py-2.5 bg-blue-600 text-white font-medium rounded-lg
                   hover:bg-blue-700 disabled:opacity-60"
      >
        {isPending ? "Creating..." : "Create Product"}
      </button>
    </form>
  );
}
```

```tsx
// src/app/products/actions.ts
"use server";

import { z } from "zod";
import { db } from "@/lib/db";
import { revalidatePath } from "next/cache";

const ProductSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  price: z.coerce.number().min(0.01, "Price must be greater than 0"),
});

interface FormState {
  errors: Record<string, string[]>;
  success: boolean;
  message: string;
}

export async function createProductWithValidation(
  _prevState: FormState,
  formData: FormData
): Promise<FormState> {
  const raw = Object.fromEntries(formData);
  const parsed = ProductSchema.safeParse(raw);

  if (!parsed.success) {
    return {
      errors: parsed.error.flatten().fieldErrors,
      success: false,
      message: "Please fix the errors above.",
    };
  }

  try {
    await db.product.create({ data: parsed.data });
    revalidatePath("/products");
    return { errors: {}, success: true, message: "Product created!" };
  } catch {
    return { errors: {}, success: false, message: "Failed to create product." };
  }
}
```

### `revalidatePath` and `revalidateTag` — Cache Invalidation

```tsx
// src/app/products/actions.ts
"use server";

import { revalidatePath, revalidateTag } from "next/cache";

export async function updateProduct(id: string, data: Partial<Product>) {
  await db.product.update({ where: { id }, data });

  // ─── Option 1: revalidate by path
  revalidatePath("/products"); // revalidate the list
  revalidatePath(`/products/${id}`); // revalidate the specific product

  // ─── Option 2: revalidate by tag (more flexible)
  revalidateTag("products"); // revalidates all fetches tagged 'products'
}
```

```tsx
// src/app/products/page.tsx
// Tag the fetch so revalidateTag('products') refreshes this
async function getProducts() {
  return fetch("/api/products", {
    next: { tags: ["products"] }, // ← tag this fetch
  }).then((r) => r.json());
}
```

### Server Actions vs API Routes

```
Server Actions:
  ✅ No separate route file needed
  ✅ Type-safe — directly import and call the function
  ✅ Co-located with the form/page that uses it
  ✅ Progressive enhancement — work without JS (native form action)
  ✅ Automatic CSRF protection
  ✅ Integrated with Next.js cache (revalidatePath, revalidateTag)
  ❌ Can't be called from external services (use API routes for webhooks)
  ❌ Can't set custom HTTP headers/status codes

API Routes (route.ts):
  ✅ Public endpoints — callable by external services, webhooks
  ✅ Custom response headers, status codes
  ✅ Standard REST semantics for external consumers
  ❌ More boilerplate (separate file, manual validation, manual response)
  ❌ No type safety without extra tooling (tRPC solves this)

Rule: Forms/mutations within your app → Server Actions
       Webhooks, external APIs, public endpoints → API Routes
```

---

## W — Why It Matters

- Server Actions eliminate the need for API routes for internal form submissions and mutations — no more `fetch('/api/products', { method: 'POST', body: ... })` pattern for things that only your own app calls.
- The `useActionState` hook replaces the complex `isLoading + isError + error` state pattern for forms — the form state is managed by the server action response, making forms dramatically simpler.
- Progressive enhancement is a built-in benefit — a `<form action={serverAction}>` works even before JavaScript loads, because HTML forms can call server actions natively. This is a major accessibility and resilience win.
- `revalidatePath` and `revalidateTag` are the correct way to update cached data after a mutation — they invalidate specific parts of the Next.js cache without requiring a full page reload.

---

## I — Interview Q&A

### Q1: What is a Server Action and how does it differ from an API route?

**A:** A Server Action is an async function marked with `'use server'` that runs on the server but can be called directly from Client Components or used as a `<form action>`. Unlike API routes, Server Actions don't require a separate file or URL — they're imported and called like regular TypeScript functions, providing end-to-end type safety. API routes are better for public endpoints, webhooks, and external service integrations. Server Actions are better for internal form submissions and mutations that only your own UI triggers — they have automatic CSRF protection, built-in cache invalidation via `revalidatePath`, and work progressively without JavaScript.

### Q2: How do you handle form validation with Server Actions?

**A:** Use `useActionState` on the client and Zod validation in the Server Action. The action receives `(prevState, formData)` and returns a typed state object containing validation errors and success/message fields. On the client, `useActionState` provides `[state, formAction, isPending]` — `state` has the returned errors for field-level display, `formAction` replaces the native form action, and `isPending` handles the loading state. This replaces the entire pattern of separate loading/error/success state management.

### Q3: When should you use `revalidatePath` vs `revalidateTag`?

**A:** `revalidatePath('/products')` invalidates the cache for a specific URL — use it when you know exactly which pages need to update after a mutation. `revalidateTag('products')` invalidates all cached fetches that were tagged with that tag — use it when the same data is used on multiple pages and you want a single invalidation call to refresh all of them. Tags are more flexible for data that appears on many pages; paths are more explicit and easier to reason about.

---

## C — Common Pitfalls + Fix

### ❌ Pitfall: Calling a Server Action from a Server Component that renders in a loop

```tsx
// ❌ Server Action imported and used in onClick inside a Server Component
// Server Components cannot have onClick handlers
export default function ProductList({ products }) {
  async function deleteProduct(id) {
    "use server";
    await db.product.delete({ where: { id } });
  }

  return products.map((p) => (
    <button onClick={() => deleteProduct(p.id)}>Delete</button> // ❌
  ));
}
```

**Fix:** Move interactive handlers to a Client Component:

```tsx
// ✅ Client Component handles the click
"use client";
import { deleteProduct } from "../actions";
export function DeleteButton({ id }: { id: string }) {
  return <button onClick={() => deleteProduct(id)}>Delete</button>;
}
```

### ❌ Pitfall: Not calling `revalidatePath` after mutations

```tsx
// ❌ Data changes in DB but the cached page doesn't update
export async function createProduct(formData: FormData) {
  'use server'
  await db.product.create({ data: ... })
  redirect('/products')   // page loads but shows OLD cached data!
}
```

**Fix:**

```tsx
export async function createProduct(formData: FormData) {
  'use server'
  await db.product.create({ data: ... })
  revalidatePath('/products')   // ← clear cache first ✅
  redirect('/products')
}
```

---

## K — Coding Challenge + Solution

### Challenge

Build a complete create-and-delete product flow using Server Actions:

1. `actions.ts` — `createProduct` (with Zod validation) and `deleteProduct`
2. `CreateProductForm` Client Component using `useActionState`
3. `DeleteProductButton` Client Component using `useTransition`
4. `page.tsx` Server Component that fetches products and renders both

### Solution

```tsx
// src/app/products/actions.ts
"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";

// In-memory store for demo (replace with db.product in production)
let PRODUCTS = [
  { id: "1", name: "Air Max 90", price: 120 },
  { id: "2", name: "Canvas Tote", price: 45 },
];

const Schema = z.object({
  name: z.string().min(2, "At least 2 chars"),
  price: z.coerce.number().positive("Must be > 0"),
});

interface ActionState {
  errors: Record<string, string[]>;
  success: boolean;
  message: string;
}

export async function createProduct(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const result = Schema.safeParse(Object.fromEntries(formData));

  if (!result.success) {
    return {
      errors: result.error.flatten().fieldErrors,
      success: false,
      message: "Fix the errors below.",
    };
  }

  const newProduct = { id: Date.now().toString(), ...result.data };
  PRODUCTS = [...PRODUCTS, newProduct];
  revalidatePath("/products");

  return {
    errors: {},
    success: true,
    message: `"${result.data.name}" created!`,
  };
}

export async function deleteProduct(id: string): Promise<void> {
  PRODUCTS = PRODUCTS.filter((p) => p.id !== id);
  revalidatePath("/products");
}

export async function getProducts() {
  return PRODUCTS;
}
```

```tsx
// src/app/products/_components/create-product-form.tsx
"use client";

import { useActionState } from "react";
import { createProduct } from "../actions";

const INIT = { errors: {}, success: false, message: "" };

export function CreateProductForm() {
  const [state, action, isPending] = useActionState(createProduct, INIT);

  return (
    <form action={action} className="bg-white border rounded-xl p-5 space-y-3">
      <h2 className="font-semibold text-gray-900">Add Product</h2>

      <div>
        <input
          name="name"
          placeholder="Product name"
          disabled={isPending}
          className="w-full border rounded-lg px-3 py-2 text-sm"
        />
        {state.errors.name && (
          <p className="text-red-500 text-xs mt-1">{state.errors.name[0]}</p>
        )}
      </div>

      <div>
        <input
          name="price"
          type="number"
          step="0.01"
          placeholder="Price"
          disabled={isPending}
          className="w-full border rounded-lg px-3 py-2 text-sm"
        />
        {state.errors.price && (
          <p className="text-red-500 text-xs mt-1">{state.errors.price[0]}</p>
        )}
      </div>

      {state.message && (
        <p
          className={`text-sm font-medium ${
            state.success ? "text-green-600" : "text-red-500"
          }`}
        >
          {state.message}
        </p>
      )}

      <button
        type="submit"
        disabled={isPending}
        className="w-full py-2 bg-blue-600 text-white text-sm font-medium
                         rounded-lg hover:bg-blue-700 disabled:opacity-50"
      >
        {isPending ? "Adding..." : "Add Product"}
      </button>
    </form>
  );
}
```

```tsx
// src/app/products/_components/delete-product-button.tsx
"use client";

import { useTransition } from "react";
import { deleteProduct } from "../actions";

export function DeleteProductButton({ id }: { id: string }) {
  const [isPending, startTransition] = useTransition();

  return (
    <button
      onClick={() => startTransition(() => deleteProduct(id))}
      disabled={isPending}
      className="px-3 py-1 bg-red-50 text-red-600 border border-red-200
                 text-xs font-medium rounded-lg hover:bg-red-100
                 disabled:opacity-40 transition-colors"
    >
      {isPending ? "..." : "Delete"}
    </button>
  );
}
```

```tsx
// src/app/products/page.tsx
import { getProducts } from "./actions";
import { CreateProductForm } from "./_components/create-product-form";
import { DeleteProductButton } from "./_components/delete-product-button";

export default async function ProductsPage() {
  const products = await getProducts();

  return (
    <div className="max-w-2xl mx-auto px-4 py-10 space-y-6">
      <h1 className="text-2xl font-bold">Products</h1>

      <CreateProductForm />

      <div className="bg-white border rounded-xl overflow-hidden">
        {products.length === 0 ? (
          <p className="text-center text-gray-400 py-8 text-sm">
            No products yet.
          </p>
        ) : (
          <ul className="divide-y">
            {products.map((p) => (
              <li
                key={p.id}
                className="flex items-center justify-between px-5 py-3"
              >
                <div>
                  <p className="font-medium text-sm">{p.name}</p>
                  <p className="text-xs text-gray-500">${p.price}</p>
                </div>
                <DeleteProductButton id={p.id} />
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
```

---

---
