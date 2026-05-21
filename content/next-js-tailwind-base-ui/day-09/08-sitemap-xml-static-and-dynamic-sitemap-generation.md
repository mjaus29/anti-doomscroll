# 8 — `sitemap.xml` — Static and Dynamic Sitemap Generation

---

## T — TL;DR

A sitemap tells search engines about all the public URLs in your app — their last modified date, change frequency, and priority. In Next.js 16, `src/app/sitemap.ts` generates it dynamically at build time (or ISR), pulling real URLs from your database.

---

## K — Key Concepts

### Static Sitemap — `public/sitemap.xml`

```xml
<!-- public/sitemap.xml — for small, static sites -->
<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>https://acme.com/</loc>
    <lastmod>2026-05-01</lastmod>
    <changefreq>weekly</changefreq>
    <priority>1.0</priority>
  </url>
  <url>
    <loc>https://acme.com/products</loc>
    <lastmod>2026-05-10</lastmod>
    <changefreq>daily</changefreq>
    <priority>0.8</priority>
  </url>
</urlset>
```

### Dynamic Sitemap — `app/sitemap.ts`

```tsx
// src/app/sitemap.ts
import type { MetadataRoute } from "next";

export const revalidate = 3600; // ← regenerate every 1 hour (ISR)

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://acme.com";

  // ─── Static routes (always included)
  const staticRoutes: MetadataRoute.Sitemap = [
    {
      url: `${baseUrl}/`,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 1.0,
    },
    {
      url: `${baseUrl}/products`,
      lastModified: new Date(),
      changeFrequency: "daily",
      priority: 0.9,
    },
    {
      url: `${baseUrl}/blog`,
      lastModified: new Date(),
      changeFrequency: "daily",
      priority: 0.8,
    },
    {
      url: `${baseUrl}/about`,
      lastModified: new Date("2026-01-01"),
      changeFrequency: "monthly",
      priority: 0.5,
    },
  ];

  // ─── Dynamic routes — fetch from DB at build/revalidation time
  const [products, posts] = await Promise.all([
    db.product.findMany({
      where: { status: "active" },
      select: { id: true, updatedAt: true },
      orderBy: { updatedAt: "desc" },
    }),
    db.post.findMany({
      where: { status: "published" },
      select: { slug: true, updatedAt: true },
      orderBy: { updatedAt: "desc" },
    }),
  ]);

  const productUrls: MetadataRoute.Sitemap = products.map((p) => ({
    url: `${baseUrl}/products/${p.id}`,
    lastModified: p.updatedAt,
    changeFrequency: "weekly",
    priority: 0.7,
  }));

  const postUrls: MetadataRoute.Sitemap = posts.map((p) => ({
    url: `${baseUrl}/blog/${p.slug}`,
    lastModified: p.updatedAt,
    changeFrequency: "monthly",
    priority: 0.6,
  }));

  return [...staticRoutes, ...productUrls, ...postUrls];
}
```

### Sitemap Index — Multiple Sitemaps for Large Sites

```tsx
// src/app/sitemap.ts — for sites with thousands of URLs
// Sitemap has a 50,000 URL limit per file — use sitemap index for larger sites

// ─── Individual sitemaps
// src/app/products-sitemap.xml/route.ts
export async function GET() {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL!;
  const products = await db.product.findMany({
    select: { id: true, updatedAt: true },
  });

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${products
  .map(
    (p) => `  <url>
    <loc>${baseUrl}/products/${p.id}</loc>
    <lastmod>${p.updatedAt.toISOString()}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.7</priority>
  </url>`
  )
  .join("\n")}
</urlset>`;

  return new Response(xml, {
    headers: {
      "Content-Type": "application/xml",
      "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400",
    },
  });
}

// ─── Sitemap index pointing to individual sitemaps
// src/app/sitemap-index.xml/route.ts
export async function GET() {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL!;
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <sitemap><loc>${baseUrl}/sitemap.xml</loc></sitemap>
  <sitemap><loc>${baseUrl}/products-sitemap.xml</loc></sitemap>
  <sitemap><loc>${baseUrl}/posts-sitemap.xml</loc></sitemap>
</sitemapindex>`;

  return new Response(xml, { headers: { "Content-Type": "application/xml" } });
}
```

---

## W — Why It Matters

- A sitemap with accurate `lastModified` dates helps Google prioritize crawling — recently updated pages get re-crawled sooner, keeping search results fresh. Without a sitemap, Google discovers new pages by following links, which can take days or weeks.
- The `revalidate` export on `sitemap.ts` is important — it determines how often the sitemap is regenerated. For a product catalog that changes daily, `revalidate = 3600` (hourly) ensures new products appear in the sitemap within an hour of being added.
- Sitemaps should only include **canonical, indexable URLs** — never include `/api/`, `/dashboard/`, or anything blocked by `robots.txt`. Submitting URLs that are blocked by robots makes Google confused and wastes crawl budget.

---

## I — Interview Q&A

### Q1: What is the advantage of a dynamic `sitemap.ts` over a static `public/sitemap.xml`?

**A:** A dynamic `sitemap.ts` generates the sitemap from your actual database at build time (or via ISR revalidation). This means new products, blog posts, and pages are automatically included without manually updating the file. The `lastModified` dates reflect actual database update timestamps rather than a fixed date. With `export const revalidate = 3600`, the sitemap regenerates every hour — any new content added to the database appears in the sitemap within an hour. A static file requires manual updates or a build/deploy to reflect new content.

---

## C — Common Pitfalls + Fix

### ❌ Pitfall: Including private/blocked URLs in the sitemap

```tsx
// ❌ Including dashboard URLs that robots.txt blocks
return [
  { url: "https://acme.com/" },
  { url: "https://acme.com/dashboard/settings" }, // ← blocked by robots.txt!
  { url: "https://acme.com/api/products" }, // ← API route, not a page!
];
```

**Fix:** Only include public, indexable pages:

```tsx
return [
  { url: "https://acme.com/" },
  { url: "https://acme.com/products" }, // ← public page ✅
  { url: "https://acme.com/blog" }, // ← public page ✅
  // Never include /dashboard/, /api/, /admin/ ✅
];
```

---

## K — Coding Challenge + Solution

### Challenge

Build `sitemap.ts` for a blog + products site with ISR revalidation (1 hour), pulling blog slugs and product IDs from mock arrays, with correct priorities and `changeFrequency` values.

### Solution

```tsx
// src/app/sitemap.ts
import type { MetadataRoute } from "next";

export const revalidate = 3600; // ISR: regenerate every hour

const BASE = process.env.NEXT_PUBLIC_SITE_URL ?? "https://acme.com";

const POSTS = [
  { slug: "nextjs-16-guide", updatedAt: new Date("2026-05-10") },
  { slug: "server-components", updatedAt: new Date("2026-04-15") },
  { slug: "typescript-6-guide", updatedAt: new Date("2026-03-20") },
];

const PRODUCTS = [
  { id: "p1", updatedAt: new Date("2026-05-15") },
  { id: "p2", updatedAt: new Date("2026-05-12") },
  { id: "p3", updatedAt: new Date("2026-05-08") },
];

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const staticRoutes: MetadataRoute.Sitemap = [
    {
      url: `${BASE}/`,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 1.0,
    },
    {
      url: `${BASE}/products`,
      lastModified: new Date(),
      changeFrequency: "daily",
      priority: 0.9,
    },
    {
      url: `${BASE}/blog`,
      lastModified: new Date(),
      changeFrequency: "daily",
      priority: 0.8,
    },
    {
      url: `${BASE}/about`,
      lastModified: new Date("2026-01-01"),
      changeFrequency: "monthly",
      priority: 0.4,
    },
    {
      url: `${BASE}/contact`,
      lastModified: new Date("2026-01-01"),
      changeFrequency: "monthly",
      priority: 0.3,
    },
  ];

  const productUrls: MetadataRoute.Sitemap = PRODUCTS.map((p) => ({
    url: `${BASE}/products/${p.id}`,
    lastModified: p.updatedAt,
    changeFrequency: "weekly",
    priority: 0.7,
  }));

  const postUrls: MetadataRoute.Sitemap = POSTS.map((p) => ({
    url: `${BASE}/blog/${p.slug}`,
    lastModified: p.updatedAt,
    changeFrequency: "monthly",
    priority: 0.6,
  }));

  return [...staticRoutes, ...productUrls, ...postUrls];
}
```

---

---
