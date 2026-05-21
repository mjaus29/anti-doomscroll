# 7 — Metadata Files — Convention-Based Static Assets

---

## T — TL;DR

Next.js recognizes specific **filenames** placed inside `app/` segments as metadata — `favicon.ico`, `opengraph-image.png`, `robots.txt`, `sitemap.xml`, and more. Drop the file in the right place with the right name and Next.js serves and links it automatically — no `<link>` tags needed.

---

## K — Key Concepts

### The Two Ways to Define Metadata

```
1. File conventions     → drop a file with a specific name in the right folder
2. Metadata exports     → export metadata or generateMetadata from page/layout

This subtopic covers FILE CONVENTIONS — the static file approach.
```

### App Icon Files — Convention-Based

```
src/app/
├── favicon.ico            → /favicon.ico
│                          → automatically added to <head> by root layout
│                          → 32x32 or 16x16 .ico format
│
├── icon.png               → /icon.png
├── icon.jpg               → /icon.jpg
├── icon.svg               → /icon.svg
│                          → alternative icon formats
│                          → Use icon.png for best compatibility
│
├── apple-icon.png         → /apple-icon.png
│                          → iOS home screen icon
│                          → 180x180px recommended
│
└── icon1.png              → can have multiple icons (numbered suffix)
    icon2.png
```

```tsx
// ✅ Auto-linked — no code needed
// Next.js generates in <head>:
// <link rel="icon" href="/favicon.ico" />
// <link rel="apple-touch-icon" href="/apple-icon.png" />

// ❌ Manual approach — no longer needed
// <link rel="icon" href="/favicon.ico" />  ← don't add manually
```

### OpenGraph & Twitter Image Files

```
src/app/
├── opengraph-image.png        → /opengraph-image.png
│                              → for the root route (/)
│                              → 1200x630px recommended
│
├── twitter-image.png          → /twitter-image.png
│                              → Twitter/X card image
│
└── products/
    └── [id]/
        ├── opengraph-image.png → /products/:id/opengraph-image.png
        │                       → route-specific OG image (static)
        └── opengraph-image.tsx → dynamically generated OG image
```

```tsx
// src/app/products/[id]/opengraph-image.tsx
// Dynamic OG image using Next.js ImageResponse

import { ImageResponse } from "next/og";
import { getProduct } from "@/lib/db";

export const runtime = "edge";
export const alt = "Product image";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function OGImage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const product = await getProduct(id);

  return new ImageResponse(
    <div
      style={{
        display: "flex",
        width: "100%",
        height: "100%",
        backgroundColor: "#1a1a1a",
        alignItems: "center",
        padding: "48px",
      }}
    >
      <h1 style={{ color: "white", fontSize: "64px" }}>{product?.name}</h1>
    </div>
  );
}
// → /products/42 has OG image auto-linked in <head>
```

### Sitemap and Robots

```
src/app/
├── robots.txt             → serves /robots.txt as static file
│
├── robots.ts              → generates /robots.txt dynamically (preferred)
│
├── sitemap.xml            → serves /sitemap.xml as static file
│
└── sitemap.ts             → generates /sitemap.xml dynamically (preferred)
```

```ts
// src/app/robots.ts — dynamic (takes priority over robots.txt)
import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [{ userAgent: "*", allow: "/", disallow: "/dashboard/" }],
    sitemap: `${process.env.NEXT_PUBLIC_SITE_URL}/sitemap.xml`,
  };
}
```

```ts
// src/app/sitemap.ts — dynamic
import type { MetadataRoute } from "next";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  return [
    {
      url: "https://mysite.com",
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 1,
    },
  ];
}
```

### Manifest (PWA)

```
src/app/
└── manifest.json          → serves /manifest.json
    OR
└── manifest.ts            → generates /manifest.json dynamically
```

```ts
// src/app/manifest.ts
import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "My App",
    short_name: "App",
    description: "My Next.js 16 App",
    start_url: "/",
    display: "standalone",
    background_color: "#ffffff",
    theme_color: "#000000",
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
  };
}
```

### Segment-Level OG Images

```
OG image resolution — closest wins:

/blog/my-post → Next.js looks for opengraph-image in order:
  1. src/app/blog/[slug]/opengraph-image.tsx  ← most specific
  2. src/app/blog/opengraph-image.png         ← blog-level fallback
  3. src/app/opengraph-image.png              ← root fallback

This allows per-page, per-section, and global OG images.
```

---

## W — Why It Matters

- File-convention metadata eliminates entire categories of `<head>` management bugs — no more forgetting to add `<link rel="icon">` or using the wrong path.
- Dynamic OG image generation (`opengraph-image.tsx`) via `ImageResponse` enables per-product, per-post, and per-user social share images without a separate service — this is a significant SEO and social sharing improvement.
- Route-level OG images (each route can have its own) make social sharing dramatically better — a shared product link shows the product image, not the generic site image.
- `manifest.ts` is the App Router way to enable PWA support — the dynamic form means you can read environment variables for the app name and description.

---

## I — Interview Q&A

### Q1: How does Next.js handle `favicon.ico` in the App Router? Do you need a `<link>` tag?

**A:** No. Place `favicon.ico` in `src/app/` and Next.js automatically serves it at `/favicon.ico` and adds the appropriate `<link rel="icon">` tag to `<head>`. The same applies to `apple-icon.png`, `opengraph-image.png`, and other convention-named files. You don't need to manually add any `<link>` or `<meta>` tags for these.

### Q2: What is `opengraph-image.tsx` and how is it different from `opengraph-image.png`?

**A:** `opengraph-image.png` is a static file — the same image is used for every URL in that segment. `opengraph-image.tsx` is a dynamic generator — it's a React component that uses `ImageResponse` to generate an image on-the-fly using data from the route params. This enables per-product, per-blog-post OG images that show the specific content's name and image, making social sharing much more engaging.

### Q3: Should you use `robots.txt` (static) or `robots.ts` (dynamic)?

**A:** Use `robots.ts` (dynamic) in most cases — it lets you read environment variables (e.g., use the correct site URL, block all robots in staging environments) and ensures the sitemap URL is always correct. Use static `robots.txt` only if the content never changes and you don't need environment-specific behavior. If both exist, the TypeScript generator takes priority.

---

## C — Common Pitfalls + Fix

### ❌ Pitfall: Putting `favicon.ico` in `public/` and manually adding a `<link>` tag

```tsx
// public/favicon.ico exists, and in layout.tsx:
export const metadata: Metadata = {
  icons: { icon: "/favicon.ico" }, // ← manual specification not needed
};
```

**Fix:** Place `favicon.ico` directly in `src/app/` — Next.js handles the rest automatically. Files in `public/` work but require manual metadata configuration; `app/favicon.ico` is zero-config.

### ❌ Pitfall: Wrong OG image dimensions

```
opengraph-image.png — 800x600px
```

**Fix:** OG images should be `1200x630px` (1.91:1 ratio) for Facebook/LinkedIn, and `1200x600px` for Twitter. Wrong dimensions cause images to be cropped or not displayed.

### ❌ Pitfall: Not setting `export const size` in dynamic OG image generators

```tsx
// opengraph-image.tsx without size export
export default function OGImage() {
  return new ImageResponse(<div>Title</div>);
  // ← Default size: 1200x630 — works but not documented
}
```

**Fix:** Always explicitly export `size` and `contentType` for clarity:

```tsx
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
```

---

## K — Coding Challenge + Solution

### Challenge

Set up the complete metadata file conventions for a blog site:

1. A `favicon.ico` and `apple-icon.png` at app root
2. A root-level static `opengraph-image.png`
3. A dynamic OG image for `/blog/[slug]` that shows the post title
4. A `sitemap.ts` with 2 static pages + dynamic blog posts
5. A `robots.ts` that allows all but blocks `/admin`

### Solution

```
File placement:
src/app/
├── favicon.ico              ← place here (not public/)
├── apple-icon.png           ← 180x180px
├── opengraph-image.png      ← 1200x630px (root fallback)
├── robots.ts
├── sitemap.ts
└── blog/
    └── [slug]/
        └── opengraph-image.tsx   ← dynamic per-post OG image
```

```ts
// src/app/robots.ts
import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [{ userAgent: "*", allow: "/", disallow: ["/admin/", "/api/"] }],
    sitemap: `${process.env.NEXT_PUBLIC_SITE_URL ?? "https://myblog.com"}/sitemap.xml`,
  };
}
```

```ts
// src/app/sitemap.ts
import type { MetadataRoute } from "next";

const BASE = process.env.NEXT_PUBLIC_SITE_URL ?? "https://myblog.com";

type Post = { slug: string; updatedAt: string };

async function getPosts(): Promise<Post[]> {
  // In production: fetch from DB or CMS
  return [
    { slug: "hello-world", updatedAt: "2026-01-01" },
    { slug: "nextjs-16-tips", updatedAt: "2026-05-01" },
  ];
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const posts = await getPosts();

  return [
    { url: BASE, lastModified: new Date(), priority: 1.0 },
    { url: `${BASE}/blog`, lastModified: new Date(), priority: 0.9 },
    ...posts.map((post) => ({
      url: `${BASE}/blog/${post.slug}`,
      lastModified: new Date(post.updatedAt),
      priority: 0.7,
    })),
  ];
}
```

```tsx
// src/app/blog/[slug]/opengraph-image.tsx
import { ImageResponse } from "next/og";

export const runtime = "edge";
export const alt = "Blog post";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

type Params = Promise<{ slug: string }>;

export default async function BlogOGImage({ params }: { params: Params }) {
  const { slug } = await params;
  const title = slug
    .replace(/-/g, " ")
    .replace(/\b\w/g, (l) => l.toUpperCase());

  return new ImageResponse(
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        width: "100%",
        height: "100%",
        backgroundColor: "#0f172a",
        padding: "64px",
      }}
    >
      <p style={{ color: "#94a3b8", fontSize: "28px", margin: "0 0 16px" }}>
        My Blog
      </p>
      <h1
        style={{
          color: "#f1f5f9",
          fontSize: "72px",
          margin: 0,
          lineHeight: 1.1,
        }}
      >
        {title}
      </h1>
    </div>
  );
}
```

---

---
