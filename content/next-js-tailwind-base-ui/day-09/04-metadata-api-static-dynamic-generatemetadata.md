# 4 — Metadata API — Static, Dynamic, `generateMetadata`

---

## T — TL;DR

The **Metadata API** in Next.js 16 generates `<head>` tags — `<title>`, `<meta>`, `<link>` — via exported `metadata` objects or `generateMetadata` functions in `layout.tsx` and `page.tsx`. It replaces `next/head` entirely, supports `title` templates, and merges metadata from nested layouts.

---

## K — Key Concepts

### Static Metadata — `export const metadata`

```tsx
// src/app/layout.tsx — root metadata (defaults for all routes)
import type { Metadata } from "next";

export const metadata: Metadata = {
  // ─── Title template: child pages use %s
  title: {
    default: "Acme", // ← used when no child title is set
    template: "%s | Acme", // ← child title fills %s: "Products | Acme"
    absolute: "Acme Home", // ← ignores template (rare)
  },

  // ─── Core meta
  description: "Acme — the best product management platform",
  keywords: ["product", "management", "acme"],
  authors: [{ name: "Acme Team", url: "https://acme.com" }],
  creator: "Acme Inc",
  publisher: "Acme Inc",

  // ─── Open Graph
  openGraph: {
    type: "website",
    locale: "en_US",
    url: "https://acme.com",
    siteName: "Acme",
    title: "Acme — Product Management",
    description: "The best product management platform",
    images: [
      {
        url: "https://acme.com/og-default.jpg",
        width: 1200,
        height: 630,
        alt: "Acme platform screenshot",
      },
    ],
  },

  // ─── Twitter / X
  twitter: {
    card: "summary_large_image",
    site: "@acmehq",
    creator: "@acmehq",
    title: "Acme — Product Management",
    description: "The best product management platform",
    images: ["https://acme.com/twitter-default.jpg"],
  },

  // ─── Robots
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },

  // ─── Icons
  icons: {
    icon: "/favicon.ico",
    shortcut: "/favicon-16x16.png",
    apple: "/apple-touch-icon.png",
    other: [
      {
        rel: "icon",
        type: "image/png",
        sizes: "32x32",
        url: "/favicon-32x32.png",
      },
    ],
  },

  // ─── Manifest
  manifest: "/site.webmanifest",

  // ─── Canonical URL
  alternates: {
    canonical: "https://acme.com",
  },

  // ─── Verification
  verification: {
    google: "your-google-search-console-token",
    yandex: "your-yandex-token",
  },
};
```

### Static Metadata in Page Routes

```tsx
// src/app/products/page.tsx
import type { Metadata } from "next";

// Template from root layout: "%s | Acme"
// This becomes: "Products | Acme"
export const metadata: Metadata = {
  title: "Products", // ← fills %s in template
  description: "Browse our full product catalog.",
  openGraph: {
    title: "Products — Acme",
    description: "Browse our full product catalog.",
    url: "https://acme.com/products",
  },
  alternates: {
    canonical: "https://acme.com/products",
  },
};

export default function ProductsPage() {
  return <div>Products</div>;
}
```

### `generateMetadata` — Dynamic Metadata

```tsx
// src/app/products/[id]/page.tsx
import type { Metadata } from "next";
import { notFound } from "next/navigation";

type Props = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
};

// ─── generateMetadata runs on the SERVER before the page renders
// ─── Can fetch data (same fetch is deduped by React.cache())
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const product = await getProduct(id); // ← fetch deduped with page component

  // Return minimal metadata if product not found
  // (notFound() in page component handles the 404)
  if (!product) {
    return { title: "Product Not Found" };
  }

  const ogImageUrl = `https://acme.com/api/og/product?id=${id}&name=${encodeURIComponent(product.name)}`;

  return {
    // Title uses parent template: "Air Max 90 | Acme"
    title: product.name,

    description: product.description.slice(0, 160),

    openGraph: {
      type: "website",
      title: `${product.name} — Acme`,
      description: product.description.slice(0, 160),
      url: `https://acme.com/products/${id}`,
      images: [
        {
          url: ogImageUrl,
          width: 1200,
          height: 630,
          alt: product.name,
        },
      ],
    },

    twitter: {
      card: "summary_large_image",
      title: product.name,
      description: product.description.slice(0, 200),
      images: [ogImageUrl],
    },

    alternates: {
      canonical: `https://acme.com/products/${id}`,
    },
  };
}

export default async function ProductPage({ params }: Props) {
  const { id } = await params;
  const product = await getProduct(id);
  if (!product) notFound();
  return <div>{product.name}</div>;
}
```

### Metadata Merging — How Parent + Child Combine

```
Root layout metadata:
  title.default:   "Acme"
  title.template:  "%s | Acme"
  description:     "Acme platform"
  twitter.site:    "@acmehq"

Products page metadata:
  title: "Products"           ← fills template → "Products | Acme"
  description: "Browse..."    ← overrides root description

Result for /products:
  <title>Products | Acme</title>
  <meta name="description" content="Browse...">
  <meta name="twitter:site" content="@acmehq">  ← inherited from root

Rules:
  → title.template in parent formats child's title
  → Deep-merged: child values override parent values at same key
  → Objects are merged (openGraph keys merge, not replace entirely)
  → Arrays are replaced, not merged
```

### `viewport` Metadata — Separate Export in Next.js 16

```tsx
// src/app/layout.tsx
import type { Viewport } from "next";

// viewport is a SEPARATE export (not inside metadata object)
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5, // ← allow zoom (accessibility)
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#0f172a" },
  ],
};
```

---

## W — Why It Matters

- The `title.template` pattern is the correct way to ensure consistent branding across all pages — `"Products | Acme"`, `"Air Max 90 | Acme"` — without repeating the site name in every page's metadata.
- `generateMetadata` runs on the server before the page renders and uses the same deduplication as `React.cache()` — fetching the product in both `generateMetadata` and the page component makes only one database/API call.
- The `alternates.canonical` field is critical for SEO — it tells search engines which URL is the authoritative version of a page, preventing duplicate content penalties when the same page is accessible at multiple URLs (e.g., with and without trailing slash, or with different query params).

---

## I — Interview Q&A

### Q1: What is the difference between `metadata` and `generateMetadata` in Next.js?

**A:** `metadata` is a static export — you export a constant `Metadata` object at module level. Use it for pages where the metadata doesn't depend on dynamic data (landing pages, the products listing, the about page). `generateMetadata` is an async function that receives `params` and `searchParams` as arguments — use it for dynamic routes where the title, description, and OG image depend on fetched data (a specific product page, a blog post, a user profile). Both can exist in the same route segment — `generateMetadata` takes precedence if both are present.

### Q2: How does `title.template` work and why is it useful?

**A:** `title.template` in the root layout defines a pattern with `%s` as a placeholder. When a child route sets `title: 'Products'`, Next.js fills the `%s` to produce `'Products | Acme'`. This ensures every page automatically includes the site name in the title for brand recognition and search result clarity — without each page needing to manually append `' | Acme'`. A child can override the template entirely with `title: { absolute: 'Custom Title' }`, which ignores the parent template.

---

## C — Common Pitfalls + Fix

### ❌ Pitfall: Putting `viewport` inside the `metadata` object

```tsx
// ❌ viewport is NOT part of the metadata object in Next.js 16
export const metadata: Metadata = {
  viewport: "width=device-width, initial-scale=1", // ← deprecated pattern
};
```

**Fix:** Export `viewport` separately:

```tsx
// ✅ Separate named export
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
};
```

### ❌ Pitfall: Fetching in `generateMetadata` without deduplication — double DB call

```tsx
// ❌ Two separate fetches — two DB calls for the same data
export async function generateMetadata({ params }) {
  const product = await db.product.findUnique({ where: { id: params.id } });
  return { title: product?.name };
}
export default async function Page({ params }) {
  const product = await db.product.findUnique({ where: { id: params.id } }); // ← again!
  return <div>{product?.name}</div>;
}
```

**Fix:** Use `React.cache()` for deduplication:

```tsx
import { cache } from "react";
const getProduct = cache((id: string) =>
  db.product.findUnique({ where: { id } })
);

export async function generateMetadata({ params }) {
  const { id } = await params;
  const product = await getProduct(id); // ← cache hit if page called first ✅
  return { title: product?.name };
}
export default async function Page({ params }) {
  const { id } = await params;
  const product = await getProduct(id); // ← cache hit ✅
  if (!product) notFound();
  return <div>{product.name}</div>;
}
```

---

## K — Coding Challenge + Solution

### Challenge

Build a complete metadata setup:

1. Root layout: `title.template = '%s | Acme'`, full OG defaults, Twitter card defaults, robots, icons
2. `/blog` page: static metadata filling the template
3. `/blog/[slug]` page: `generateMetadata` fetching post data, dynamic title/OG/canonical
4. Use `React.cache()` to deduplicate the post fetch between metadata and page

### Solution

```tsx
// src/app/layout.tsx
import type { Metadata, Viewport } from "next";
import "./globals.css";

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#0f172a" },
  ],
};

export const metadata: Metadata = {
  title: { default: "Acme", template: "%s | Acme" },
  description: "Acme — build better products, faster.",
  metadataBase: new URL("https://acme.com"),
  openGraph: {
    type: "website",
    siteName: "Acme",
    locale: "en_US",
    images: [{ url: "/og-default.jpg", width: 1200, height: 630 }],
  },
  twitter: { card: "summary_large_image", site: "@acmehq" },
  robots: { index: true, follow: true },
  icons: { icon: "/favicon.ico", apple: "/apple-touch-icon.png" },
  manifest: "/site.webmanifest",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
```

```tsx
// src/app/blog/page.tsx
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Blog", // → "Blog | Acme"
  description: "Thoughts, tutorials, and updates from the Acme team.",
  openGraph: {
    title: "Blog — Acme",
    description: "Thoughts, tutorials, and updates.",
    url: "https://acme.com/blog",
  },
  alternates: { canonical: "https://acme.com/blog" },
};

export default function BlogPage() {
  return <div>Blog listing</div>;
}
```

```tsx
// src/app/blog/[slug]/page.tsx
import type { Metadata } from "next";
import { cache } from "react";
import { notFound } from "next/navigation";

const POSTS = {
  "nextjs-16-guide": {
    title: "Next.js 16 Complete Guide",
    description:
      "Everything you need to know about Next.js 16 — data fetching, caching, Server Actions, and more.",
    author: "Mark Austin",
    publishedAt: "2026-05-01",
    coverImage: "/blog/nextjs-16-cover.jpg",
  },
  "server-components": {
    title: "React Server Components Explained",
    description:
      "A deep dive into RSC — how they work, when to use them, and common patterns.",
    author: "Mark Austin",
    publishedAt: "2026-04-15",
    coverImage: "/blog/rsc-cover.jpg",
  },
};

type Params = Promise<{ slug: string }>;

// React.cache() — deduplicates between generateMetadata and Page component
const getPost = cache(async (slug: string) => {
  return POSTS[slug as keyof typeof POSTS] ?? null;
});

export async function generateMetadata({
  params,
}: {
  params: Params;
}): Promise<Metadata> {
  const { slug } = await params;
  const post = await getPost(slug);

  if (!post) return { title: "Post Not Found" };

  return {
    title: post.title, // → "Next.js 16 Guide | Acme"
    description: post.description,
    authors: [{ name: post.author }],
    openGraph: {
      type: "article",
      title: post.title,
      description: post.description,
      url: `https://acme.com/blog/${slug}`,
      publishedTime: post.publishedAt,
      authors: [post.author],
      images: [
        {
          url: `https://acme.com/api/og/blog?slug=${slug}`,
          width: 1200,
          height: 630,
          alt: post.title,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: post.title,
      description: post.description,
      images: [`https://acme.com/api/og/blog?slug=${slug}`],
    },
    alternates: { canonical: `https://acme.com/blog/${slug}` },
  };
}

export default async function BlogPostPage({ params }: { params: Params }) {
  const { slug } = await params;
  const post = await getPost(slug); // ← cache hit ✅
  if (!post) notFound();

  return (
    <article className="max-w-2xl mx-auto px-4 py-12">
      <h1 className="text-3xl font-bold">{post.title}</h1>
      <p className="text-gray-600 mt-4">{post.description}</p>
    </article>
  );
}
```

---

---
