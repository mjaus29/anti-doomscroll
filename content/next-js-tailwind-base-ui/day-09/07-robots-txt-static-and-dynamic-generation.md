# 7 — `robots.txt` — Static and Dynamic Generation

---

## T — TL;DR

`robots.txt` tells search engine crawlers which URLs to crawl and which to skip. In Next.js 16, place a static `robots.txt` in `/public`, or generate it dynamically from `src/app/robots.ts` using the `MetadataRoute.Robots` type for programmatic control.

---

## K — Key Concepts

### Static `robots.txt` — Drop in `/public`

```
# public/robots.txt
User-agent: *
Allow: /
Disallow: /api/
Disallow: /dashboard/
Disallow: /_next/
Disallow: /admin/

# Reference your sitemap
Sitemap: https://acme.com/sitemap.xml
```

### Dynamic `robots.ts` — Programmatic Generation

```tsx
// src/app/robots.ts
import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://acme.com";

  return {
    rules: [
      // ─── Default: allow all public content
      {
        userAgent: "*",
        allow: "/",
        disallow: [
          "/api/", // API routes (no public value)
          "/dashboard/", // Private app sections
          "/admin/", // Admin panel
          "/_next/", // Next.js internals
          "/private/", // Any private content
        ],
      },

      // ─── GPTBot (OpenAI crawler) — disallow if desired
      {
        userAgent: "GPTBot",
        disallow: "/", // ← block AI training crawlers
      },

      // ─── Google AdsBot — allow landing pages only
      {
        userAgent: "AdsBot-Google",
        allow: ["/landing/", "/products/"],
        disallow: "/",
      },
    ],

    // ─── Sitemap reference
    sitemap: `${baseUrl}/sitemap.xml`,

    // ─── Host (for Yandex)
    host: baseUrl,
  };
}

// Generated output at /robots.txt:
// User-agent: *
// Allow: /
// Disallow: /api/
// ...
// Sitemap: https://acme.com/sitemap.xml
```

### Environment-Aware Robots

```tsx
// src/app/robots.ts
import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  const isProd = process.env.NODE_ENV === "production";

  // Block ALL crawlers on non-production (staging, preview, dev)
  if (!isProd) {
    return {
      rules: { userAgent: "*", disallow: "/" },
    };
  }

  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/api/", "/dashboard/", "/admin/"],
    },
    sitemap: "https://acme.com/sitemap.xml",
  };
}
```

---

## W — Why It Matters

- Blocking `/api/` routes from crawlers prevents search engines from indexing raw JSON responses as pages — without this, Googlebot may crawl your API endpoints and show them in search results.
- Disallowing staging and preview environments (`NODE_ENV !== 'production'`) prevents duplicate content — if Google indexes your staging site alongside production, you get duplicate content penalties.
- The `Sitemap:` directive in `robots.txt` is how search engines discover your sitemap — without it, they must find it manually or via Google Search Console.

---

## I — Interview Q&A

### Q1: What is the difference between a static `public/robots.txt` and a dynamic `app/robots.ts`?

**A:** A static `public/robots.txt` is served as-is — no processing, fastest possible delivery. Use it when your robots rules never change. A dynamic `app/robots.ts` generates the file at request time using JavaScript logic — use it when rules depend on environment variables (block all in staging), feature flags, or configuration from a database. The `MetadataRoute.Robots` TypeScript type provides type safety and auto-completion for the rules. Both result in a `robots.txt` served at the `/robots.txt` path.

---

## C — Common Pitfalls + Fix

### ❌ Pitfall: Forgetting to block the staging environment from crawlers

```tsx
// ❌ Staging site indexed by Google → duplicate content penalty
// src/app/robots.ts — no environment check
export default function robots() {
  return { rules: { userAgent: "*", allow: "/" } };
}
// This runs on https://staging.acme.com too → Google indexes staging pages
```

**Fix:**

```tsx
export default function robots(): MetadataRoute.Robots {
  if (process.env.NEXT_PUBLIC_SITE_URL !== "https://acme.com") {
    return { rules: { userAgent: "*", disallow: "/" } }; // ← block non-prod ✅
  }
  return {
    rules: { userAgent: "*", allow: "/", disallow: ["/api/", "/admin/"] },
  };
}
```

---

## K — Coding Challenge + Solution

### Challenge

Build `robots.ts` for a SaaS app that:

1. Allows `/`, `/blog/*`, `/products/*` for all crawlers
2. Blocks `/dashboard/`, `/api/`, `/admin/`, `/_next/`
3. Blocks `GPTBot` entirely from all paths
4. Returns `disallow: '/'` for all bots on non-production environments
5. References `https://acme.com/sitemap.xml`

### Solution

```tsx
// src/app/robots.ts
import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "";
  const isProd = siteUrl === "https://acme.com";

  // Block all crawlers on non-production deployments
  if (!isProd) {
    return {
      rules: [{ userAgent: "*", disallow: "/" }],
    };
  }

  return {
    rules: [
      // Default rule — public content allowed, private blocked
      {
        userAgent: "*",
        allow: ["/", "/blog/", "/products/"],
        disallow: [
          "/dashboard/",
          "/api/",
          "/admin/",
          "/_next/",
          "/settings/",
          "/account/",
        ],
      },
      // Block AI training crawlers
      {
        userAgent: "GPTBot",
        disallow: "/",
      },
      {
        userAgent: "Google-Extended",
        disallow: "/",
      },
      {
        userAgent: "CCBot",
        disallow: "/",
      },
    ],
    sitemap: `${siteUrl}/sitemap.xml`,
    host: siteUrl,
  };
}
```

---

---
