# 8 — The `public/` Directory

---

## T — TL;DR

`public/` is the static asset folder. Every file inside is served at the root URL — `public/logo.png` is accessible at `/logo.png`. No webpack processing, no imports needed. Use it for favicons, robots.txt, sitemaps, and OG images.

---

## K — Key Concepts

### How `public/` Works

```
File:     public/logo.png
URL:      https://mysite.com/logo.png
Import:   Not needed — reference directly in src attribute

File:     public/fonts/CustomFont.woff2
URL:      https://mysite.com/fonts/CustomFont.woff2

File:     public/icons/apple-touch-icon.png
URL:      https://mysite.com/icons/apple-touch-icon.png
```

### Referencing Public Files

```tsx
// In Next.js components — use root-relative paths (no /public prefix)
export default function Header() {
  return (
    <header>
      {/* ✅ Root-relative path — /public is NOT part of the URL */}
      <img src="/logo.png" alt="Logo" width={120} height={40} />

      {/* ✅ Better: use next/image for optimization */}
      <Image src="/logo.png" alt="Logo" width={120} height={40} />
    </header>
  );
}
```

### Typical `public/` Contents

```
public/
├── favicon.ico           ← browser tab icon (referenced in metadata)
├── apple-touch-icon.png  ← iOS home screen icon
├── robots.txt            ← search engine crawler rules
├── sitemap.xml           ← optional (or generate dynamically)
├── manifest.json         ← PWA manifest
│
├── images/
│   ├── og-default.jpg    ← default OpenGraph image
│   └── hero.webp         ← hero image (or use CDN for large images)
│
├── fonts/                ← self-hosted fonts (if not using next/font)
│   └── CustomFont.woff2
│
└── icons/
    ├── icon-192.png      ← PWA icons
    └── icon-512.png
```

### `robots.txt` Example

```
# public/robots.txt
User-agent: *
Allow: /

Sitemap: https://mysite.com/sitemap.xml
```

### Metadata for Favicon and Icons (App Router)

```tsx
// src/app/layout.tsx — reference public/ files in metadata
import type { Metadata } from "next";

export const metadata: Metadata = {
  icons: {
    icon: "/favicon.ico",
    apple: "/apple-touch-icon.png",
    shortcut: "/favicon-16x16.png",
  },
  manifest: "/manifest.json",
};
```

### What NOT to Put in `public/`

```
❌ Source code (.ts, .tsx files) — not processed, served as raw text
❌ Environment variables — public means PUBLIC (served over HTTP)
❌ Large binary files — use a CDN (S3, Cloudinary) instead
❌ Secrets or API keys — they become publicly accessible URLs

✅ Small static assets (icons, logos, robots.txt)
✅ Files that must be at specific URLs (OG images, PWA manifest)
✅ Files referenced by third-party services (Google site verification)
```

### Generating Dynamic Robots and Sitemaps (App Router)

```ts
// src/app/robots.ts — dynamic robots.txt (replaces public/robots.txt)
import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [{ userAgent: "*", allow: "/", disallow: "/dashboard/" }],
    sitemap: "https://mysite.com/sitemap.xml",
  };
}
// → Generates /robots.txt at build time
```

```ts
// src/app/sitemap.ts — dynamic sitemap
import type { MetadataRoute } from "next";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const products = await getProducts();

  return [
    { url: "https://mysite.com", lastModified: new Date() },
    { url: "https://mysite.com/products", lastModified: new Date() },
    ...products.map((p) => ({
      url: `https://mysite.com/products/${p.slug}`,
      lastModified: p.updatedAt,
    })),
  ];
}
// → Generates /sitemap.xml at build time with dynamic data
```

---

## W — Why It Matters

- Files in `public/` bypass the bundler — they're served directly by Next.js/CDN at full speed with no transformation. This is why it's the right place for PWA manifests and favicons.
- The App Router's `robots.ts` and `sitemap.ts` dynamic generators are preferred over static `public/robots.txt` when you need environment-specific rules or dynamic page URLs.
- Putting large images in `public/` on Vercel or similar platforms means they're deployed with every build — use a CDN (Cloudinary, S3) for user-uploaded or large images.
- The `metadataBase` in root layout metadata tells Next.js how to resolve relative URLs in metadata (like OG image paths) — without it, relative paths in metadata produce warnings.

---

## I — Interview Q&A

### Q1: What is the URL path for a file at `public/images/logo.png`?

**A:** `/images/logo.png` — the `public/` prefix is not part of the URL. Everything inside `public/` is served from the root of the domain. Reference it in HTML/JSX as `/images/logo.png`, not as `public/images/logo.png`.

### Q2: When should you use `public/robots.txt` vs `src/app/robots.ts`?

**A:** Use `src/app/robots.ts` when you need dynamic content (e.g., different rules per environment — allow all in production, disallow all in staging, or generate the sitemap URL dynamically). Use `public/robots.txt` for a completely static, simple robots file that never changes. The App Router convention prefers `robots.ts` because it's co-located with the app and can use environment variables.

### Q3: Should you use `next/image` with files in `public/` or just a regular `<img>` tag?

**A:** Use `next/image` for local images in `public/`. It provides automatic WebP/AVIF conversion, responsive sizing (`srcset`), lazy loading, and CLS prevention (reserves space via the `width`/`height` props). Raw `<img>` tags serve the original file without any optimization. ESLint's `@next/next/no-img-element` rule enforces this.

---

## C — Common Pitfalls + Fix

### ❌ Pitfall: Using `/public/` prefix in the src attribute

```tsx
<img src="/public/logo.png" />
// → 404: the URL is /logo.png, not /public/logo.png
```

**Fix:**

```tsx
<Image src="/logo.png" alt="Logo" width={120} height={40} />
// ← No /public/ prefix ✅
```

### ❌ Pitfall: Putting sensitive files in `public/`

```
public/
└── config.json   ← contains API keys
```

Any file in `public/` is served at `https://yourdomain.com/config.json` — publicly readable by anyone.

**Fix:** Environment variables belong in `.env.local`, never in `public/`.

### ❌ Pitfall: Not setting `metadataBase` for OG images

```tsx
export const metadata: Metadata = {
  openGraph: {
    images: ["/og-image.jpg"], // relative path
  },
};
// Warning: metadataBase is not set — OG image URL is unresolvable
```

**Fix:**

```tsx
export const metadata: Metadata = {
  metadataBase: new URL("https://mysite.com"), // ✅
  openGraph: {
    images: ["/og-image.jpg"], // now resolves to https://mysite.com/og-image.jpg
  },
};
```

---

## K — Coding Challenge + Solution

### Challenge

Set up the complete `public/` structure and a dynamic `sitemap.ts` for a blog with:

1. favicon, apple-touch-icon
2. A default OG image
3. A `robots.ts` that blocks `/admin` and `/api`
4. A `sitemap.ts` that includes static pages and dynamic blog posts
5. Root layout metadata with `metadataBase`, icons, and manifest

### Solution

```
public/
├── favicon.ico
├── apple-touch-icon.png   (180x180px)
├── manifest.json
└── images/
    └── og-default.jpg     (1200x630px)
```

```ts
// src/app/robots.ts
import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/admin/", "/api/"],
      },
    ],
    sitemap: `${process.env.NEXT_PUBLIC_SITE_URL}/sitemap.xml`,
  };
}
```

```ts
// src/app/sitemap.ts
import type { MetadataRoute } from "next";

const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://myblog.com";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const posts = await fetch(`${BASE_URL}/api/posts`).then((r) => r.json());

  const staticPages: MetadataRoute.Sitemap = [
    { url: BASE_URL, lastModified: new Date(), priority: 1 },
    { url: `${BASE_URL}/about`, lastModified: new Date(), priority: 0.8 },
    { url: `${BASE_URL}/blog`, lastModified: new Date(), priority: 0.9 },
  ];

  const dynamicPages: MetadataRoute.Sitemap = posts.map(
    (post: { slug: string; updatedAt: string }) => ({
      url: `${BASE_URL}/blog/${post.slug}`,
      lastModified: new Date(post.updatedAt),
      priority: 0.7,
    })
  );

  return [...staticPages, ...dynamicPages];
}
```

```tsx
// src/app/layout.tsx — root metadata
import type { Metadata } from "next";

export const metadata: Metadata = {
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_SITE_URL ?? "https://myblog.com"
  ),
  title: {
    template: "%s | My Blog",
    default: "My Blog",
  },
  description: "A Next.js 16 blog",
  icons: {
    icon: "/favicon.ico",
    apple: "/apple-touch-icon.png",
  },
  manifest: "/manifest.json",
  openGraph: {
    images: ["/images/og-default.jpg"], // resolves using metadataBase
  },
};
```

---

---
