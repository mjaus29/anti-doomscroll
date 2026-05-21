# 9 — JSON-LD — Structured Data for SEO

---

## T — TL;DR

**JSON-LD** is structured data embedded in `<script type="application/ld+json">` that helps search engines understand your page content — enabling rich results (star ratings, prices, breadcrumbs, FAQ accordions) in Google search. In Next.js, render it as a Server Component with a `<script>` tag.

---

## K — Key Concepts

### Why JSON-LD Matters

```
Without structured data:
  Google search result: Blue link → "Air Max 90 | Acme"
  → Basic text result, no visual enhancement

With JSON-LD Product schema:
  Google search result:
  ★★★★☆ 4.5 (123 reviews)
  Air Max 90 | Acme
  $120 — In Stock
  → Rich result with star rating and price — higher CTR ✅

Rich result types enabled by JSON-LD:
  Product         → price, availability, ratings
  Article         → author, publish date, reading time
  BreadcrumbList  → breadcrumb navigation
  FAQPage         → FAQ accordion in search results
  Organization    → company info, logo
  Person          → author/person information
  WebSite         → sitelinks search box
  HowTo           → step-by-step instructions
```

### JSON-LD in Next.js — Server Component Script Tag

```tsx
// src/app/products/[id]/page.tsx
import type { WithContext, Product } from "schema-dts"; // npm install schema-dts

export default async function ProductPage({ params }) {
  const { id } = await params;
  const product = await getProduct(id);
  if (!product) notFound();

  // ─── Product JSON-LD schema
  const jsonLd: WithContext<Product> = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.name,
    description: product.description,
    image: product.imageUrl,
    sku: product.id,
    brand: {
      "@type": "Brand",
      name: "Acme",
    },
    offers: {
      "@type": "Offer",
      price: product.price,
      priceCurrency: "USD",
      availability:
        product.stock > 0
          ? "https://schema.org/InStock"
          : "https://schema.org/OutOfStock",
      url: `https://acme.com/products/${id}`,
      seller: {
        "@type": "Organization",
        name: "Acme",
      },
    },
    aggregateRating:
      product.reviewCount > 0
        ? {
            "@type": "AggregateRating",
            ratingValue: product.avgRating.toString(),
            reviewCount: product.reviewCount.toString(),
            bestRating: "5",
            worstRating: "1",
          }
        : undefined,
  };

  return (
    <>
      {/* ─── Inject JSON-LD in <head> via script tag */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <div>{/* page content */}</div>
    </>
  );
}
```

### Article JSON-LD for Blog Posts

```tsx
// src/app/blog/[slug]/page.tsx
import type { WithContext, Article } from "schema-dts";

export default async function BlogPostPage({ params }) {
  const { slug } = await params;
  const post = await getPost(slug);
  if (!post) notFound();

  const jsonLd: WithContext<Article> = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: post.title,
    description: post.description,
    image: `https://acme.com/blog/${slug}/opengraph-image.png`,
    author: {
      "@type": "Person",
      name: post.author,
      url: `https://acme.com/authors/${post.authorSlug}`,
    },
    publisher: {
      "@type": "Organization",
      name: "Acme",
      logo: {
        "@type": "ImageObject",
        url: "https://acme.com/logo.png",
      },
    },
    datePublished: post.publishedAt,
    dateModified: post.updatedAt,
    mainEntityOfPage: {
      "@type": "WebPage",
      "@id": `https://acme.com/blog/${slug}`,
    },
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <article>{/* content */}</article>
    </>
  );
}
```

### BreadcrumbList + FAQPage JSON-LD

```tsx
// src/app/products/[id]/page.tsx — multiple JSON-LD schemas on one page

const breadcrumbJsonLd = {
  "@context": "https://schema.org",
  "@type": "BreadcrumbList",
  itemListElement: [
    {
      "@type": "ListItem",
      position: 1,
      name: "Home",
      item: "https://acme.com",
    },
    {
      "@type": "ListItem",
      position: 2,
      name: "Products",
      item: "https://acme.com/products",
    },
    {
      "@type": "ListItem",
      position: 3,
      name: product.name,
      item: `https://acme.com/products/${id}`,
    },
  ],
};

const faqJsonLd = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: [
    {
      "@type": "Question",
      name: "What is the return policy?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "We offer a 30-day return policy on all products.",
      },
    },
    {
      "@type": "Question",
      name: "How long does shipping take?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "3-5 business days for standard shipping.",
      },
    },
  ],
};

return (
  <>
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }}
    />
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
    />
    {/* page content */}
  </>
);
```

### Organization JSON-LD — Root Layout

```tsx
// src/app/layout.tsx — add global Organization schema
const orgJsonLd = {
  "@context": "https://schema.org",
  "@type": "Organization",
  name: "Acme",
  url: "https://acme.com",
  logo: "https://acme.com/logo.png",
  sameAs: [
    "https://twitter.com/acmehq",
    "https://linkedin.com/company/acme",
    "https://github.com/acme",
  ],
  contactPoint: {
    "@type": "ContactPoint",
    contactType: "customer support",
    email: "support@acme.com",
  },
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(orgJsonLd) }}
        />
        {children}
      </body>
    </html>
  );
}
```

---

## W — Why It Matters

- Rich results in Google (star ratings, prices, FAQ accordions) are only possible via structured data — they can increase CTR by 20-30% for product and recipe pages.
- `schema-dts` provides full TypeScript types for all Schema.org types — it catches invalid schema structures at compile time before you deploy incorrect structured data.
- JSON-LD in a Server Component (a `<script>` tag in the JSX) is the recommended approach over `<head>` injection — it renders server-side, is in the initial HTML, and doesn't require a separate library.

---

## I — Interview Q&A

### Q1: What is JSON-LD and how do you add it to a Next.js page?

**A:** JSON-LD (JavaScript Object Notation for Linked Data) is a format for embedding structured data in web pages using Schema.org vocabulary. Search engines like Google use it to understand page content and enable rich results in search — product prices, star ratings, FAQ accordions, breadcrumbs. In Next.js, add it via a `<script type="application/ld+json">` tag in a Server Component using `dangerouslySetInnerHTML={{ __html: JSON.stringify(schemaObject) }}`. Because it's a Server Component, the JSON-LD is in the initial HTML sent to the browser, making it immediately available to search engine crawlers.

---

## C — Common Pitfalls + Fix

### ❌ Pitfall: Using `JSON.stringify` without sanitizing user content (XSS)

```tsx
// ❌ If product.name contains `</script>`, it breaks the page
const jsonLd = { '@type': 'Product', name: product.name }
<script dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
// product.name = '</script><script>alert(1)</script>' → XSS vulnerability
```

**Fix:** Serialize and escape JSON-LD for safe embedding:

```tsx
function safeJsonLd(data: object): string {
  // JSON.stringify escapes < and > when used as Unicode escapes
  return JSON.stringify(data)
    .replace(/</g, "\\u003c")
    .replace(/>/g, "\\u003e")
    .replace(/&/g, "\\u0026");
}

<script
  type="application/ld+json"
  dangerouslySetInnerHTML={{ __html: safeJsonLd(jsonLd) }}
/>;
```

---

## K — Coding Challenge + Solution

### Challenge

Add complete JSON-LD to a `/products/[id]` page with:

1. `Product` schema with `offers` (price, availability), `aggregateRating`, and `brand`
2. `BreadcrumbList` schema
3. A `safeJsonLd()` helper that escapes `<`, `>`, `&`
4. Both schema scripts rendered in the Server Component

### Solution

```tsx
// src/app/products/[id]/page.tsx
import { notFound } from "next/navigation";
import { cache } from "react";

// ─── Safe JSON-LD serializer — prevents XSS via </script> injection
function safeJsonLd(data: object): string {
  return JSON.stringify(data)
    .replace(/</g, "\\u003c")
    .replace(/>/g, "\\u003e")
    .replace(/&/g, "\\u0026")
    .replace(/'/g, "\\u0027");
}

// ─── Mock product data
const PRODUCTS = {
  p1: {
    id: "p1",
    name: "Air Max 90",
    description: "A classic silhouette updated with modern materials.",
    price: 120,
    stock: 15,
    category: "shoes",
    imageUrl: "https://acme.com/images/air-max-90.jpg",
    avgRating: 4.5,
    reviewCount: 128,
    brand: "Nike",
  },
  p2: {
    id: "p2",
    name: "Canvas Tote",
    description: "Durable everyday tote made from organic canvas.",
    price: 45,
    stock: 0,
    category: "bags",
    imageUrl: "https://acme.com/images/canvas-tote.jpg",
    avgRating: 4.2,
    reviewCount: 34,
    brand: "Acme",
  },
};

const getProduct = cache(async (id: string) => {
  return PRODUCTS[id as keyof typeof PRODUCTS] ?? null;
});

type Params = Promise<{ id: string }>;

export default async function ProductPage({ params }: { params: Params }) {
  const { id } = await params;
  const product = await getProduct(id);
  if (!product) notFound();

  const pageUrl = `https://acme.com/products/${id}`;

  // ─── 1. Product schema
  const productJsonLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.name,
    description: product.description,
    image: product.imageUrl,
    sku: product.id,
    brand: {
      "@type": "Brand",
      name: product.brand,
    },
    offers: {
      "@type": "Offer",
      price: product.price.toString(),
      priceCurrency: "USD",
      availability:
        product.stock > 0
          ? "https://schema.org/InStock"
          : "https://schema.org/OutOfStock",
      url: pageUrl,
      priceValidUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
        .toISOString()
        .split("T")[0],
      seller: {
        "@type": "Organization",
        name: "Acme",
      },
    },
    // Only include aggregateRating if the product has reviews
    ...(product.reviewCount > 0 && {
      aggregateRating: {
        "@type": "AggregateRating",
        ratingValue: product.avgRating.toFixed(1),
        reviewCount: product.reviewCount.toString(),
        bestRating: "5",
        worstRating: "1",
      },
    }),
  };

  // ─── 2. BreadcrumbList schema
  const breadcrumbJsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      {
        "@type": "ListItem",
        position: 1,
        name: "Home",
        item: "https://acme.com",
      },
      {
        "@type": "ListItem",
        position: 2,
        name: "Products",
        item: "https://acme.com/products",
      },
      {
        "@type": "ListItem",
        position: 3,
        name: product.name,
        item: pageUrl,
      },
    ],
  };

  return (
    <>
      {/* ─── Inject both JSON-LD schemas — server-rendered, no client JS needed */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: safeJsonLd(productJsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: safeJsonLd(breadcrumbJsonLd) }}
      />

      {/* ─── Page UI */}
      <div className="max-w-4xl mx-auto px-4 py-12">
        {/* Breadcrumb nav (visual — matches the JSON-LD) */}
        <nav className="flex items-center gap-2 text-sm text-gray-500 mb-8">
          <a href="/" className="hover:text-gray-800">
            Home
          </a>
          <span>/</span>
          <a href="/products" className="hover:text-gray-800">
            Products
          </a>
          <span>/</span>
          <span className="text-gray-900 font-medium">{product.name}</span>
        </nav>

        <div className="grid grid-cols-2 gap-12">
          {/* Product image placeholder */}
          <div
            className="aspect-square bg-gray-100 rounded-2xl flex items-center
                          justify-center text-gray-400"
          >
            📦 {product.name}
          </div>

          <div className="space-y-4">
            <h1 className="text-3xl font-bold text-gray-900">{product.name}</h1>

            {/* Rating — matches aggregateRating in JSON-LD */}
            {product.reviewCount > 0 && (
              <div className="flex items-center gap-2">
                <span className="text-amber-500">
                  {"★".repeat(Math.floor(product.avgRating))}
                  {"☆".repeat(5 - Math.floor(product.avgRating))}
                </span>
                <span className="text-sm text-gray-500">
                  {product.avgRating} ({product.reviewCount} reviews)
                </span>
              </div>
            )}

            <p className="text-2xl font-bold text-gray-900">${product.price}</p>

            {/* Availability — matches offers.availability in JSON-LD */}
            <span
              className={`inline-flex items-center gap-1.5 text-sm font-medium
                              px-3 py-1 rounded-full ${
                                product.stock > 0
                                  ? "bg-green-50 text-green-700"
                                  : "bg-red-50 text-red-600"
                              }`}
            >
              <span
                className={`w-1.5 h-1.5 rounded-full ${
                  product.stock > 0 ? "bg-green-500" : "bg-red-500"
                }`}
              />
              {product.stock > 0
                ? `In Stock (${product.stock})`
                : "Out of Stock"}
            </span>

            <p className="text-gray-600 leading-relaxed">
              {product.description}
            </p>

            <button
              disabled={product.stock === 0}
              className="w-full py-3 bg-blue-600 text-white font-semibold
                         rounded-xl hover:bg-blue-700 disabled:opacity-50
                         disabled:cursor-not-allowed transition-colors"
            >
              Add to Cart
            </button>
          </div>
        </div>
      </div>
    </>
  );
}

/*
  Generated JSON-LD in page source (Google can read it directly):

  <script type="application/ld+json">
  {
    "@context": "https://schema.org",
    "@type": "Product",
    "name": "Air Max 90",
    "offers": {
      "@type": "Offer",
      "price": "120",
      "priceCurrency": "USD",
      "availability": "https://schema.org/InStock"
    },
    "aggregateRating": {
      "@type": "AggregateRating",
      "ratingValue": "4.5",
      "reviewCount": "128"
    }
  }
  </script>

  Google Search result becomes:
  ★★★★½ 128 reviews · $120 · In Stock
  Air Max 90 | Acme
  A classic silhouette updated with modern materials.

  (Rich result with stars, price, and availability → higher CTR) ✅
*/
```

---

---
