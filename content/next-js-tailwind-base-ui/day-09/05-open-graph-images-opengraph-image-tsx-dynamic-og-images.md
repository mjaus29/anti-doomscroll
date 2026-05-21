# 5 — Open Graph Images — `opengraph-image.tsx`, Dynamic OG Images

---

## T — TL;DR

Place an `opengraph-image.tsx` file in any route segment to generate that route's OG image automatically. Use the `ImageResponse` API (built on Satori) to generate PNG images from JSX at request time — no separate design tool, no static files for dynamic routes.

---

## K — Key Concepts

### Static OG Image — File Convention

```
Route segment file conventions for OG images:
  opengraph-image.png           ← static file (just drop it in)
  opengraph-image.jpg           ← static file
  opengraph-image.tsx           ← dynamic via ImageResponse
  twitter-image.png             ← static Twitter card image
  twitter-image.tsx             ← dynamic Twitter image

Placement:
  src/app/opengraph-image.png                  → applied to / (root)
  src/app/blog/opengraph-image.png             → applied to /blog
  src/app/blog/[slug]/opengraph-image.tsx      → applied to /blog/:slug (dynamic)
```

### Dynamic OG Image — `opengraph-image.tsx`

```tsx
// src/app/blog/[slug]/opengraph-image.tsx
import { ImageResponse } from "next/og";

// ─── Route segment config for the image route
export const runtime = "edge"; // ← fastest runtime for image generation
export const alt = "Blog post cover image";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

type Props = { params: Promise<{ slug: string }> };

export default async function OgImage({ params }: Props) {
  const { slug } = await params;

  // Fetch post data (runs server-side / edge)
  const post = await getPost(slug).catch(() => null);

  return new ImageResponse(
    // JSX rendered to PNG using Satori
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        justifyContent: "flex-end",
        width: "100%",
        height: "100%",
        padding: "60px",
        background: "linear-gradient(135deg, #0f172a 0%, #1e3a8a 100%)",
        fontFamily: "sans-serif",
      }}
    >
      {/* Tag */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          marginBottom: "16px",
        }}
      >
        <span
          style={{
            background: "#3b82f6",
            color: "white",
            padding: "6px 16px",
            borderRadius: "999px",
            fontSize: "14px",
            fontWeight: 600,
          }}
        >
          Acme Blog
        </span>
      </div>

      {/* Title */}
      <div
        style={{
          fontSize: "56px",
          fontWeight: 700,
          color: "white",
          lineHeight: 1.2,
          maxWidth: "900px",
        }}
      >
        {post?.title ?? "Blog Post"}
      </div>

      {/* Author + Date row */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          marginTop: "32px",
          color: "#94a3b8",
          fontSize: "18px",
        }}
      >
        <span>{post?.author ?? "Acme Team"}</span>
        <span style={{ margin: "0 12px" }}>·</span>
        <span>{post?.publishedAt ?? "2026"}</span>
      </div>

      {/* Bottom logo */}
      <div
        style={{
          position: "absolute",
          top: "48px",
          right: "60px",
          color: "white",
          fontSize: "24px",
          fontWeight: 700,
        }}
      >
        acme.com
      </div>
    </div>,
    {
      ...size,
      // Load custom fonts for OG image
      fonts: [
        {
          name: "Inter",
          data: await fetch(
            "https://fonts.gstatic.com/s/inter/v13/UcCO3FwrK3iLTeHuS_fvQtMwCp50KnMw2boKoduKmMEVuLyfAZ9hiJ-Ek-_EeA.woff"
          ).then((r) => r.arrayBuffer()),
          weight: 700,
          style: "normal",
        },
      ],
    }
  );
}
```

### Root-Level Default OG Image

```tsx
// src/app/opengraph-image.tsx
// Applied to ALL pages that don't have their own OG image

import { ImageResponse } from "next/og";

export const runtime = "edge";
export const alt = "Acme — Build better products";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function DefaultOgImage() {
  return new ImageResponse(
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        width: "100%",
        height: "100%",
        background: "#0f172a",
        fontFamily: "sans-serif",
      }}
    >
      <div
        style={{
          fontSize: "80px",
          fontWeight: 700,
          color: "white",
        }}
      >
        Acme
      </div>
      <div
        style={{
          fontSize: "28px",
          color: "#94a3b8",
          marginTop: "16px",
        }}
      >
        Build better products, faster.
      </div>
    </div>,
    { ...size }
  );
}
```

### OG Image from Route Handler (More Control)

```tsx
// src/app/api/og/route.ts
// More flexible: called as an image URL in metadata

import { ImageResponse } from "next/og";
import { NextRequest } from "next/server";

export const runtime = "edge";

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const title = searchParams.get("title") ?? "Acme";
  const type = searchParams.get("type") ?? "page";

  const colors: Record<string, string> = {
    blog: "#1e3a8a",
    product: "#14532d",
    page: "#0f172a",
  };
  const bgColor = colors[type] ?? colors.page;

  return new ImageResponse(
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        width: "100%",
        height: "100%",
        background: bgColor,
        fontFamily: "sans-serif",
        padding: "60px",
      }}
    >
      <div
        style={{
          fontSize: "60px",
          fontWeight: 700,
          color: "white",
          textAlign: "center",
        }}
      >
        {title}
      </div>
    </div>,
    { width: 1200, height: 630 }
  );
}

// Usage in generateMetadata:
// images: [{ url: `/api/og?title=${encodeURIComponent(post.title)}&type=blog` }]
```

---

## W — Why It Matters

- OG images are displayed when your links are shared on Twitter/X, LinkedIn, Slack, iMessage, and WhatsApp — they're the visual preview that makes people click. A well-designed OG image can 2-5× your click-through rate on shared links.
- The `opengraph-image.tsx` file convention is zero-config — Next.js automatically generates the correct `<meta property="og:image">` tag, sets the correct `content-type`, and handles caching. No manual metadata entry needed.
- Running OG image generation on `runtime = 'edge'` means generation happens at edge nodes globally — near-zero cold starts and fast response times for the image endpoint.

---

## I — Interview Q&A

### Q1: How does `opengraph-image.tsx` work in Next.js and what is `ImageResponse`?

**A:** `opengraph-image.tsx` is a file convention — placing it in a route segment automatically generates the OG image for that route and adds the correct `<meta property="og:image">` tag. `ImageResponse` is a class from `next/og` that renders JSX to a PNG image using Satori (a library that converts HTML/CSS to SVG, then to PNG). You write React-like JSX with inline styles, and Next.js converts it to an image at request time. The `export const size`, `export const alt`, and `export const contentType` exports configure the image metadata and dimensions.

### Q2: When would you use a Route Handler for OG images instead of `opengraph-image.tsx`?

**A:** Use a Route Handler (`/api/og/route.ts`) when you need a single image endpoint called by multiple pages with different parameters — for example, a universal `/api/og?title=Post+Title&type=blog` endpoint that generates different images based on query params, called from `generateMetadata` across many routes. Use `opengraph-image.tsx` when each route segment has its own specific image template — it's cleaner and zero-config per route. Route Handlers also give more control over cache headers, response types, and error handling.

---

## C — Common Pitfalls + Fix

### ❌ Pitfall: Using CSS class names in OG image JSX (Tailwind doesn't work here)

```tsx
// ❌ Tailwind classes do NOT work in ImageResponse JSX
return new ImageResponse(
  <div className="flex items-center bg-blue-900 text-white text-6xl font-bold">
    {title}
  </div>
);
// Satori renders JSX with inline styles only — className is ignored
```

**Fix:** Always use inline `style` props in `ImageResponse`:

```tsx
return new ImageResponse(
  <div
    style={{
      display: "flex",
      alignItems: "center",
      backgroundColor: "#1e3a8a",
      color: "white",
      fontSize: "60px",
      fontWeight: 700,
    }}
  >
    {title}
  </div>
);
```

### ❌ Pitfall: Not setting `export const runtime = 'edge'` — slow cold starts

```tsx
// ❌ Node.js runtime for image generation is slow (~500ms+ cold start)
// src/app/blog/[slug]/opengraph-image.tsx
// (no runtime export — defaults to Node.js)
```

**Fix:**

```tsx
export const runtime = "edge"; // ← ~0ms cold start for Satori image generation ✅
```

---

## K — Coding Challenge + Solution

### Challenge

Create a dynamic OG image for `/products/[id]` that:

1. Shows product name, price, and category
2. Has a colored background based on category (`shoes` = blue, `bags` = green, default = slate)
3. Shows the `acme.com` logo text in the top-right corner
4. `runtime = 'edge'`, correct `size` (1200×630), `contentType = 'image/png'`
5. Falls back gracefully if product is not found

### Solution

```tsx
// src/app/products/[id]/opengraph-image.tsx
import { ImageResponse } from "next/og";

export const runtime = "edge";
export const alt = "Product image";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const PRODUCTS = {
  p1: { name: "Air Max 90", price: 120, category: "shoes" },
  p2: { name: "Canvas Tote", price: 45, category: "bags" },
  p3: { name: "Wool Cap", price: 35, category: "accessories" },
};

const CATEGORY_COLORS: Record<string, { bg: string; accent: string }> = {
  shoes: { bg: "#1e3a8a", accent: "#3b82f6" },
  bags: { bg: "#14532d", accent: "#22c55e" },
  accessories: { bg: "#581c87", accent: "#a855f7" },
  default: { bg: "#0f172a", accent: "#64748b" },
};

type Props = { params: Promise<{ id: string }> };

export default async function ProductOgImage({ params }: Props) {
  const { id } = await params;
  const product = PRODUCTS[id as keyof typeof PRODUCTS] ?? null;
  const colors = product
    ? (CATEGORY_COLORS[product.category] ?? CATEGORY_COLORS.default)
    : CATEGORY_COLORS.default;

  return new ImageResponse(
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        width: "100%",
        height: "100%",
        background: `linear-gradient(135deg, ${colors.bg} 0%, #0f172a 100%)`,
        padding: "60px",
        fontFamily: "sans-serif",
        position: "relative",
      }}
    >
      {/* Logo — top right */}
      <div
        style={{
          position: "absolute",
          top: "48px",
          right: "60px",
          color: "rgba(255,255,255,0.6)",
          fontSize: "22px",
          fontWeight: 600,
        }}
      >
        acme.com
      </div>

      {/* Category badge */}
      {product && (
        <div
          style={{
            display: "flex",
            marginBottom: "24px",
          }}
        >
          <span
            style={{
              background: colors.accent,
              color: "white",
              padding: "6px 20px",
              borderRadius: "999px",
              fontSize: "16px",
              fontWeight: 600,
              textTransform: "capitalize",
            }}
          >
            {product.category}
          </span>
        </div>
      )}

      {/* Main content — push to bottom */}
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          marginTop: "auto",
        }}
      >
        {/* Product name */}
        <div
          style={{
            fontSize: "72px",
            fontWeight: 700,
            color: "white",
            lineHeight: 1.1,
            maxWidth: "900px",
          }}
        >
          {product?.name ?? "Product Not Found"}
        </div>

        {/* Price */}
        {product && (
          <div
            style={{
              fontSize: "36px",
              fontWeight: 600,
              color: colors.accent,
              marginTop: "20px",
            }}
          >
            ${product.price}
          </div>
        )}
      </div>
    </div>,
    { ...size }
  );
}
```

---

---
