# 6 — `revalidatePath` — On-Demand Path Invalidation

---

## T — TL;DR

`revalidatePath` immediately invalidates the Full Route Cache and Data Cache for a specific URL path. Call it from a Server Action after a mutation to ensure the next page request gets fresh data instead of stale cached content.

---

## K — Key Concepts

### Basic Usage

```tsx
// src/app/products/actions.ts
"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";

export async function createProduct(formData: FormData) {
  const name = formData.get("name") as string;
  const price = Number(formData.get("price"));

  await db.product.create({ data: { name, price } });

  revalidatePath("/products"); // ← invalidate the product list page
  redirect("/products"); // ← navigate to refreshed list
}

export async function updateProduct(id: string, data: Partial<Product>) {
  await db.product.update({ where: { id }, data });

  revalidatePath("/products"); // ← list page
  revalidatePath(`/products/${id}`); // ← specific product page
}

export async function deleteProduct(id: string) {
  await db.product.delete({ where: { id } });

  revalidatePath("/products"); // ← only list needs revalidation
  // No need to revalidate /products/[id] — it'll return 404 on next visit
}
```

### `revalidatePath` Overloads

```tsx
import { revalidatePath } from "next/cache";

// ─── 1. Revalidate a specific page
revalidatePath("/blog/nextjs-16"); // → /blog/nextjs-16 only

// ─── 2. Revalidate a dynamic route (ALL matching pages)
revalidatePath("/products/[id]", "page"); // → /products/1, /products/2, etc.

// ─── 3. Revalidate a layout (page + ALL children)
revalidatePath("/dashboard", "layout");
// → /dashboard AND /dashboard/orders AND /dashboard/settings AND all nested routes

// ─── 4. Revalidate everything (use with caution)
revalidatePath("/", "layout"); // → EVERY route in the app

// Default second argument is 'page':
revalidatePath("/products"); // same as revalidatePath('/products', 'page')
```

### When to Call Which Overload

```
Scenario                              Call
─────────────────────────────────     ────────────────────────────────────
Updated one blog post                 revalidatePath('/blog/my-post')
Updated product in catalog            revalidatePath('/products')
                                      revalidatePath(`/products/${id}`)
Changed global navigation             revalidatePath('/', 'layout')
Changed dashboard layout data         revalidatePath('/dashboard', 'layout')
Changed ALL products                  revalidatePath('/products/[id]', 'page')
Changed user in entire app            revalidatePath('/', 'layout')
Changed settings that affect 1 page   revalidatePath('/dashboard/settings')
```

### `revalidatePath` in Route Handlers

```tsx
// src/app/api/webhooks/cms/route.ts
// Called by CMS when content is published

import { revalidatePath } from "next/cache";
import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  // Verify webhook signature
  const sig = request.headers.get("x-webhook-signature");
  if (sig !== process.env.CMS_WEBHOOK_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { type, slug } = (await request.json()) as {
    type: "post" | "page" | "product";
    slug: string;
  };

  // Revalidate based on content type
  switch (type) {
    case "post":
      revalidatePath(`/blog/${slug}`);
      revalidatePath("/blog"); // also revalidate the listing page
      break;
    case "page":
      revalidatePath(`/${slug}`);
      break;
    case "product":
      revalidatePath(`/products/${slug}`);
      revalidatePath("/products");
      break;
  }

  return NextResponse.json({ revalidated: true, type, slug });
}
```

### Multiple `revalidatePath` Calls

```tsx
// Multiple calls are fine — each clears a specific path
export async function publishBlogPost(slug: string) {
  "use server";

  await cms.publishPost(slug);

  // Clear all affected pages
  revalidatePath(`/blog/${slug}`); // the post page
  revalidatePath("/blog"); // the listing page
  revalidatePath("/"); // homepage (if it shows featured posts)
  revalidatePath("/sitemap.xml"); // if you generate a sitemap dynamically
}
```

---

## W — Why It Matters

- `revalidatePath` is the bridge between server mutations and cached pages — without it, a database update is invisible to users until the ISR timer expires or the server restarts.
- The `'layout'` type is critical for changes that affect multiple nested routes — updating a user's name in the navigation (which is in a layout) requires `revalidatePath('/dashboard', 'layout')` to clear all dashboard sub-pages, not just the dashboard root.
- Using `revalidatePath('/', 'layout')` for global changes is a nuclear option — it clears every cached page in the app. Use it sparingly (theme changes, global nav updates) and prefer targeted path revalidation wherever possible.

---

## I — Interview Q&A

### Q1: What is the difference between `revalidatePath('/products')` and `revalidatePath('/products/[id]', 'page')`?

**A:** `revalidatePath('/products')` revalidates the specific URL `/products` — the product listing page. `revalidatePath('/products/[id]', 'page')` revalidates all pages matching the dynamic segment `/products/[id]` — every pre-built product detail page (`/products/1`, `/products/2`, etc.). Use the specific path when only one page is affected. Use the dynamic pattern when all instances of a dynamic route need refreshing — for example, if product images change globally and every product page shows images.

### Q2: When should you use `'layout'` as the second argument to `revalidatePath`?

**A:** Use `'layout'` when a change affects a layout component that is shared across multiple nested routes. For example, if the dashboard navigation shows the user's plan tier and the user upgrades their plan, `revalidatePath('/dashboard', 'layout')` clears the cache for `/dashboard` and all its sub-routes (`/dashboard/orders`, `/dashboard/settings`, etc.) because they all share the dashboard layout. Without `'layout'`, only `/dashboard` itself would be cleared — sub-routes would still show the old plan tier in the navigation.

---

## C — Common Pitfalls + Fix

### ❌ Pitfall: Calling `revalidatePath` before the database write completes

```tsx
// ❌ Revalidates before data is actually saved
export async function updateProduct(id: string, data: ProductData) {
  "use server";
  revalidatePath(`/products/${id}`); // ← happens BEFORE the update
  await db.product.update({ where: { id }, data });
  // Next request serves the old data (the update hasn't run yet)
}
```

**Fix:** Always revalidate AFTER successful writes:

```tsx
export async function updateProduct(id: string, data: ProductData) {
  "use server";
  await db.product.update({ where: { id }, data }); // ← write first ✅
  revalidatePath(`/products/${id}`); // ← then revalidate ✅
}
```

### ❌ Pitfall: Forgetting to revalidate the list page after item mutation

```tsx
// ❌ Only revalidates the item detail page
export async function deleteProduct(id: string) {
  "use server";
  await db.product.delete({ where: { id } });
  revalidatePath(`/products/${id}`); // ← detail page cleared
  // /products list still shows the deleted item! ❌
}
```

**Fix:** Revalidate ALL affected pages:

```tsx
export async function deleteProduct(id: string) {
  "use server";
  await db.product.delete({ where: { id } });
  revalidatePath("/products"); // ← list page ✅
  revalidatePath(`/products/${id}`); // ← detail page (will 404 on next visit) ✅
}
```

---

## K — Coding Challenge + Solution

### Challenge

Build a blog admin with three Server Actions demonstrating correct `revalidatePath` usage:

1. `publishPost(slug)` — revalidates post page + blog listing + homepage
2. `updatePostTitle(slug, title)` — revalidates post page + blog listing
3. `deletePost(slug)` — revalidates blog listing + homepage (NOT the post page)
4. A `BlogAdminPanel` Client Component calling all three with loading states

### Solution

```tsx
// src/app/admin/blog/actions.ts
"use server";

import { revalidatePath } from "next/cache";

// In production: actual DB/CMS operations
// Here: logging for demonstration

export async function publishPost(slug: string): Promise<{ success: boolean }> {
  try {
    // await db.post.update({ where: { slug }, data: { status: 'published' } })
    await new Promise((r) => setTimeout(r, 300)); // simulate DB

    revalidatePath(`/blog/${slug}`); // post page
    revalidatePath("/blog"); // listing
    revalidatePath("/"); // homepage (featured posts)

    return { success: true };
  } catch {
    return { success: false };
  }
}

export async function updatePostTitle(
  slug: string,
  title: string
): Promise<{ success: boolean }> {
  try {
    // await db.post.update({ where: { slug }, data: { title } })
    await new Promise((r) => setTimeout(r, 200));

    revalidatePath(`/blog/${slug}`); // post page (title shown in <h1>)
    revalidatePath("/blog"); // listing (title shown in card)
    // No homepage revalidation — title change doesn't affect featured posts section

    return { success: true };
  } catch {
    return { success: false };
  }
}

export async function deletePost(slug: string): Promise<{ success: boolean }> {
  try {
    // await db.post.delete({ where: { slug } })
    await new Promise((r) => setTimeout(r, 250));

    revalidatePath("/blog"); // listing (remove deleted post) ✅
    revalidatePath("/"); // homepage (remove if featured) ✅
    // NOT revalidating /blog/${slug} — it will return 404 naturally on next visit
    // Revalidating it would just cache a 404 — unnecessary

    return { success: true };
  } catch {
    return { success: false };
  }
}
```

```tsx
// src/app/admin/blog/_components/blog-admin-panel.tsx
"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { publishPost, updatePostTitle, deletePost } from "../actions";

const DEMO_POSTS = [
  { slug: "nextjs-16-guide", title: "Next.js 16 Guide", status: "draft" },
  {
    slug: "react-19-features",
    title: "React 19 Features",
    status: "published",
  },
  { slug: "server-components", title: "Server Components", status: "draft" },
];

type Action = "publish" | "title" | "delete" | null;

export function BlogAdminPanel() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [activeAction, setActiveAction] = useState<{
    slug: string;
    type: Action;
  }>({
    slug: "",
    type: null,
  });
  const [message, setMessage] = useState<{
    text: string;
    success: boolean;
  } | null>(null);

  function isLoading(slug: string, type: Action) {
    return (
      isPending && activeAction.slug === slug && activeAction.type === type
    );
  }

  async function handle(
    slug: string,
    type: Action,
    action: () => Promise<{ success: boolean }>
  ) {
    setActiveAction({ slug, type });
    setMessage(null);

    startTransition(async () => {
      const result = await action();
      router.refresh(); // ← clear Router Cache to reflect server revalidation
      setMessage({
        text: result.success
          ? `✅ ${type} on "${slug}" succeeded`
          : `❌ Action failed`,
        success: result.success,
      });
      setActiveAction({ slug: "", type: null });
    });
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-10">
      <h1 className="text-2xl font-bold mb-6">Blog Admin</h1>

      {message && (
        <div
          className={`mb-4 px-4 py-3 rounded-lg text-sm font-medium ${
            message.success
              ? "bg-green-50 text-green-700 border border-green-200"
              : "bg-red-50 text-red-700 border border-red-200"
          }`}
        >
          {message.text}
        </div>
      )}

      <div className="space-y-3">
        {DEMO_POSTS.map((post) => (
          <div
            key={post.slug}
            className="bg-white border rounded-xl px-5 py-4 flex items-center
                          justify-between gap-4"
          >
            <div className="flex-1 min-w-0">
              <p className="font-medium text-gray-900 truncate">{post.title}</p>
              <div className="flex items-center gap-2 mt-0.5">
                <code className="text-xs text-gray-400">/blog/{post.slug}</code>
                <span
                  className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                    post.status === "published"
                      ? "bg-green-100 text-green-700"
                      : "bg-gray-100 text-gray-600"
                  }`}
                >
                  {post.status}
                </span>
              </div>
            </div>

            <div className="flex gap-2 shrink-0">
              {/* Publish */}
              <button
                onClick={() =>
                  handle(post.slug, "publish", () => publishPost(post.slug))
                }
                disabled={isPending}
                className="px-3 py-1.5 bg-blue-600 text-white text-xs font-medium
                           rounded-lg hover:bg-blue-700 disabled:opacity-40"
              >
                {isLoading(post.slug, "publish") ? "..." : "Publish"}
              </button>

              {/* Update title */}
              <button
                onClick={() =>
                  handle(post.slug, "title", () =>
                    updatePostTitle(post.slug, post.title + " (Updated)")
                  )
                }
                disabled={isPending}
                className="px-3 py-1.5 border text-gray-600 text-xs font-medium
                           rounded-lg hover:bg-gray-50 disabled:opacity-40"
              >
                {isLoading(post.slug, "title") ? "..." : "Edit Title"}
              </button>

              {/* Delete */}
              <button
                onClick={() =>
                  handle(post.slug, "delete", () => deletePost(post.slug))
                }
                disabled={isPending}
                className="px-3 py-1.5 bg-red-50 text-red-600 border border-red-200
                           text-xs font-medium rounded-lg hover:bg-red-100
                           disabled:opacity-40"
              >
                {isLoading(post.slug, "delete") ? "..." : "Delete"}
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* revalidatePath strategy reference */}
      <div
        className="mt-8 bg-gray-50 border rounded-xl p-4 text-xs font-mono
                      text-gray-600 space-y-1"
      >
        <p className="font-bold text-gray-800">revalidatePath strategy:</p>
        <p>publishPost → /blog/[slug], /blog, /</p>
        <p>updateTitle → /blog/[slug], /blog</p>
        <p>deletePost → /blog, / (NOT /blog/[slug] — 404 naturally)</p>
      </div>
    </div>
  );
}
```

---

---
