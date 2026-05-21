# 8 — Intercepting Routes — Modal Patterns

---

## T — TL;DR

Intercepting routes let you **render a route inside the current layout as a modal** when navigated via `<Link>`, while showing the full standalone page on direct URL visit or refresh. The `(.)`, `(..)`, `(...)` prefix syntax controls which level of the route tree is intercepted.

---

## K — Key Concepts

### The Three Interception Depths

```
(.)   → intercept at the SAME level
        Use when: the intercepted route is a sibling
        Example: /photos/[id] intercepted from /photos

(..)  → intercept ONE level UP
        Use when: the intercepted route is in the parent
        Example: /dashboard/photos/[id] intercepted from /dashboard/orders

(...) → intercept at the ROOT (app/) level
        Use when: the intercepted route is far up the tree
        Example: /products/[id] intercepted from deep within /dashboard

(..)(.. ) → intercept TWO levels up (double dots per level)
```

### Visual: How Interception Works

```
URL: /photos/42

Scenario A — client navigation from /photos gallery:
  React intercepts the navigation
  Renders @modal/(.)photos/[id]/page.tsx (modal)
  /photos gallery stays mounted in background
  URL = /photos/42

Scenario B — direct URL visit to /photos/42:
  No interception (no prior client navigation)
  Renders photos/[id]/page.tsx (full standalone page)
  URL = /photos/42

Scenario C — page refresh at /photos/42 (modal was open):
  Modal state is lost (client state gone)
  Renders photos/[id]/page.tsx (full page — correct behavior)
  URL = /photos/42

Same URL, different renders depending on HOW you got there.
```

### Complete Photo Gallery with Intercepting Modal

```
src/app/
├── layout.tsx                              ← root layout (receives @modal)
├── @modal/
│   ├── default.tsx                         ← null
│   └── (.)photos/
│       └── [id]/
│           └── page.tsx                    ← modal render
└── photos/
    ├── page.tsx                            → /photos (gallery grid)
    └── [id]/
        └── page.tsx                        → /photos/:id (full standalone)
```

```tsx
// src/app/layout.tsx
export default function RootLayout({
  children,
  modal,
}: {
  children: React.ReactNode;
  modal: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        {children}
        {modal} {/* modal overlays everything */}
      </body>
    </html>
  );
}
```

```tsx
// src/app/@modal/default.tsx
export default function ModalDefault() {
  return null;
}
```

```tsx
// src/app/@modal/(.)photos/[id]/page.tsx
"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

const PHOTOS: Record<string, { title: string; author: string }> = {
  "photo-1": { title: "Mountain Sunset", author: "Alice" },
  "photo-2": { title: "Ocean Waves", author: "Bob" },
  "photo-3": { title: "Forest Trail", author: "Carol" },
};

export default function PhotoModal({ params }: { params: { id: string } }) {
  const router = useRouter();
  const photo = PHOTOS[params.id];

  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") router.back();
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [router]);

  if (!photo) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-50 bg-black/75 flex items-center justify-center p-4"
        onClick={() => router.back()}
        aria-label="Close modal"
      >
        {/* Modal panel */}
        <div
          className="bg-white rounded-2xl overflow-hidden shadow-2xl
                     max-w-lg w-full"
          onClick={(e) => e.stopPropagation()}
          role="dialog"
          aria-modal="true"
          aria-label={photo.title}
        >
          {/* Photo area */}
          <div
            className="aspect-[4/3] bg-gray-200 flex items-center
                          justify-center text-gray-400 text-lg"
          >
            {photo.title}
          </div>

          {/* Info */}
          <div className="p-5 flex items-center justify-between">
            <div>
              <h2 className="font-semibold text-gray-900">{photo.title}</h2>
              <p className="text-sm text-gray-500">by {photo.author}</p>
            </div>
            <div className="flex gap-2">
              <a
                href={`/photos/${params.id}`}
                className="text-xs text-blue-600 hover:underline"
              >
                View full page
              </a>
              <button
                onClick={() => router.back()}
                className="text-gray-400 hover:text-gray-600 ml-2"
                aria-label="Close"
              >
                ✕
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
```

```tsx
// src/app/photos/page.tsx — gallery grid
import Link from "next/link";

const PHOTOS = [
  { id: "photo-1", title: "Mountain Sunset" },
  { id: "photo-2", title: "Ocean Waves" },
  { id: "photo-3", title: "Forest Trail" },
];

export default function PhotosPage() {
  return (
    <div className="max-w-4xl mx-auto px-4 py-10">
      <h1 className="text-2xl font-bold mb-6">Gallery</h1>
      <div className="grid grid-cols-3 gap-4">
        {PHOTOS.map((photo) => (
          <Link
            key={photo.id}
            href={`/photos/${photo.id}`}
            scroll={false} // ← keep scroll position when modal opens
            className="block"
          >
            <div
              className="aspect-square bg-gray-200 rounded-xl flex items-center
                            justify-center hover:opacity-80 transition-opacity
                            cursor-zoom-in text-sm text-gray-500"
            >
              {photo.title}
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
```

```tsx
// src/app/photos/[id]/page.tsx — full standalone page (direct visit / refresh)
import { notFound } from "next/navigation";
import Link from "next/link";

const PHOTOS: Record<string, { title: string; author: string }> = {
  "photo-1": { title: "Mountain Sunset", author: "Alice" },
  "photo-2": { title: "Ocean Waves", author: "Bob" },
  "photo-3": { title: "Forest Trail", author: "Carol" },
};

export default function PhotoPage({ params }: { params: { id: string } }) {
  const photo = PHOTOS[params.id];
  if (!photo) notFound();

  return (
    <div className="min-h-screen bg-black flex flex-col">
      <div className="p-4">
        <Link href="/photos" className="text-gray-400 hover:text-white text-sm">
          ← Back to Gallery
        </Link>
      </div>
      <div className="flex-1 flex items-center justify-center px-4">
        <div className="max-w-3xl w-full">
          <div
            className="aspect-[4/3] bg-gray-800 rounded-xl flex items-center
                          justify-center text-white text-xl"
          >
            {photo.title}
          </div>
          <div className="mt-4 flex justify-between">
            <div>
              <h1 className="text-white font-semibold">{photo.title}</h1>
              <p className="text-gray-400 text-sm">by {photo.author}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
```

---

## W — Why It Matters

- Intercepting routes + parallel routes is the pattern used by Vercel dashboard, Figma, Notion, and Linear for "click item → see detail in modal while list stays" UX.
- The fact that the same URL shows a modal on navigation but a full page on refresh is intentional and correct — users who open the photo URL directly (from a share link) should see the full photo page, not a modal with no context behind it.
- The `scroll={false}` on gallery links is essential — without it, the page scrolls to top when the modal opens, disorienting the user.

---

## I — Interview Q&A

### Q1: What is an intercepting route and how is it different from a parallel route?

**A:** A parallel route (`@slot`) renders multiple pages simultaneously in one layout. An intercepting route changes WHICH page renders for a given URL based on how the user arrived. When navigating via `<Link>` from the same app, an intercepting route "catches" the navigation and renders a different component (typically a modal) than what a direct URL visit would show. Direct visits and refreshes bypass interception and render the real route. The two patterns work together: the intercepting route renders INTO a parallel route slot (the `@modal` slot).

### Q2: What do `(.)`, `(..)`, and `(...)` mean in intercepting routes?

**A:** They specify how far up the directory tree to look for the route being intercepted, analogous to `./`, `../`, and `/` in file paths. `(.)` intercepts a sibling route at the same folder level. `(..)` intercepts a route one level up in the tree. `(...)` intercepts a route at the app root level. Most modal patterns use `(.)` — the gallery and the photo detail route are siblings within the same parent folder.

---

## C — Common Pitfalls + Fix

### ❌ Pitfall: Wrong depth prefix — modal doesn't appear

```
src/app/photos/
├── @modal/
│   └── (..)photos/[id]/page.tsx   ← (..) goes UP one level = wrong
└── [id]/page.tsx
// Navigation from /photos → /photos/42 doesn't intercept
```

**Fix:** Use `(.)` for sibling routes:

```
src/app/
└── @modal/
    └── (.)photos/[id]/page.tsx   ← @ is at root, so (.) = photos sibling ✅
```

### ❌ Pitfall: Not including `scroll={false}` on gallery links

```tsx
// ❌ Modal opens, page scrolls to top — user loses place in gallery
<Link href={`/photos/${photo.id}`}>...</Link>
```

**Fix:**

```tsx
<Link href={`/photos/${photo.id}`} scroll={false}>
  ...
</Link>
```

---

## K — Coding Challenge + Solution

### Challenge

Build a `/products` gallery with an intercepting modal at `(.)products/[id]` that:

1. Shows modal on client nav, full page on direct visit
2. Modal has backdrop click to close
3. Full page has a back link
4. Both use the same product data source
5. Modal has a "View full page →" link

### Solution

```tsx
// src/lib/products-data.ts — shared data
export const PRODUCTS: Record<
  string,
  { name: string; price: number; category: string; desc: string }
> = {
  "air-max-90": {
    name: "Air Max 90",
    price: 120,
    category: "Shoes",
    desc: "Classic Nike running shoe with visible Air cushioning.",
  },
  "canvas-tote": {
    name: "Canvas Tote",
    price: 45,
    category: "Bags",
    desc: "Durable everyday canvas tote bag.",
  },
  "wool-cap": {
    name: "Wool Cap",
    price: 35,
    category: "Accessories",
    desc: "Warm merino wool cap for any season.",
  },
};
```

```tsx
// src/app/@modal/default.tsx
export default function ModalDefault() {
  return null;
}
```

```tsx
// src/app/@modal/(.)products/[id]/page.tsx
"use client";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { PRODUCTS } from "@/lib/products-data";
import Link from "next/link";

export default function ProductModal({ params }: { params: { id: string } }) {
  const router = useRouter();
  const product = PRODUCTS[params.id];

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") router.back();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [router]);

  if (!product) return null;

  return (
    <div
      className="fixed inset-0 z-50 bg-black/60 flex items-end sm:items-center
                 justify-center p-4"
      onClick={() => router.back()}
      role="dialog"
      aria-modal="true"
    >
      <div
        className="bg-white rounded-2xl w-full max-w-md shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div
          className="aspect-square bg-gray-100 flex items-center justify-center
                        text-5xl"
        >
          🛍️
        </div>
        <div className="p-5">
          <span className="text-xs text-blue-600 font-semibold uppercase">
            {product.category}
          </span>
          <h2 className="text-xl font-bold mt-1 mb-1">{product.name}</h2>
          <p className="text-gray-500 text-sm mb-4">{product.desc}</p>
          <div className="flex items-center justify-between">
            <span className="text-2xl font-bold text-blue-600">
              ${product.price}
            </span>
            <div className="flex gap-2">
              <Link
                href={`/products/${params.id}`}
                className="text-xs text-gray-500 hover:text-gray-700 underline"
              >
                View full page →
              </Link>
              <button
                className="px-4 py-2 bg-blue-600 text-white text-sm
                           rounded-lg hover:bg-blue-700"
              >
                Add to Cart
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
```

```tsx
// src/app/products/[id]/page.tsx — full page
import { notFound } from "next/navigation";
import { PRODUCTS } from "@/lib/products-data";
import Link from "next/link";

export default function ProductFullPage({
  params,
}: {
  params: { id: string };
}) {
  const product = PRODUCTS[params.id];
  if (!product) notFound();

  return (
    <div className="max-w-xl mx-auto py-12 px-4">
      <Link
        href="/products"
        className="text-sm text-gray-500 hover:text-gray-700 mb-6 block"
      >
        ← All Products
      </Link>
      <div
        className="aspect-square bg-gray-100 rounded-2xl flex items-center
                      justify-center text-7xl mb-6"
      >
        🛍️
      </div>
      <span className="text-xs text-blue-600 font-semibold uppercase">
        {product.category}
      </span>
      <h1 className="text-3xl font-bold mt-1 mb-2">{product.name}</h1>
      <p className="text-gray-600 mb-6">{product.desc}</p>
      <p className="text-3xl font-bold text-blue-600 mb-8">${product.price}</p>
      <button
        className="w-full py-3 bg-blue-600 text-white font-medium
                         rounded-xl hover:bg-blue-700"
      >
        Add to Cart
      </button>
    </div>
  );
}
```

---

---
