# 3 — `next/image` — Image Optimization, `sizes`, `priority`, `fill`

---

## T — TL;DR

`next/image` automatically optimizes images: serves modern formats (WebP/AVIF), resizes to the exact display dimensions, lazy-loads off-screen images, and prevents Cumulative Layout Shift with reserved space. The three critical props to understand are `sizes`, `preload`, and `fill`.

---

## K — Key Concepts

### How `next/image` Works Under the Hood

```
Traditional <img src="/photo.jpg" width={800} height={600}>
  → Downloads full 800×600 image on EVERY device
  → No format conversion (still JPEG/PNG)
  → No lazy loading by default
  → No CLS protection

next/image <Image src="/photo.jpg" width={800} height={600}>
  → Serves WebP/AVIF at runtime (40-60% smaller than JPEG/PNG)
  → Resizes to exact size needed for each device via srcset
  → Lazy loads by default (IntersectionObserver)
  → Reserves space (no layout shift)
  → Caches optimized versions on the server
```

### Basic Usage — Local Image

```tsx
import Image from "next/image";
// ─── Option A: static import (recommended for local files)
import heroImage from "@/public/hero.jpg"; // ← TypeScript knows width/height

export function HeroSection() {
  return (
    <Image
      src={heroImage} // ← static import: width/height auto-inferred
      alt="Hero image showing our product in action" // ← always required
      preload // ← LCP image: preload, don't lazy-load
      quality={85} // ← default is 75; 85 for hero images
      placeholder="blur" // ← show blurred placeholder while loading
      className="rounded-2xl object-cover"
    />
  );
}
```

### Basic Usage — Remote Image

```tsx
// ─── Remote images: must declare allowed domains in next.config.ts
export function ProductImage({ src, name }: { src: string; name: string }) {
  return (
    <Image
      src={src} // ← remote URL
      alt={`Photo of ${name}`}
      width={400} // ← required for remote images (layout hint)
      height={400}
      sizes="(max-width: 768px) 100vw, 400px" // ← tells browser what size to download
      className="rounded-xl object-cover"
    />
  );
}
```

```tsx
// next.config.ts — allowlist remote domains
import type { NextConfig } from "next";

const config: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "cdn.example.com",
        pathname: "/images/**", // ← restrict to specific path
      },
      {
        protocol: "https",
        hostname: "**.cloudinary.com", // ← wildcard subdomain
      },
    ],
  },
};
export default config;
```

### `sizes` — The Critical Performance Prop

```tsx
// sizes tells the browser what CSS width the image will be at each breakpoint
// Browser uses this to select the right srcset entry to download
// Without sizes: browser downloads the LARGEST srcset image for safety (wasteful)
// With correct sizes: browser downloads exactly the right size

// ─── Full-width hero image
<Image
  src="/hero.jpg"
  alt="Hero"
  fill
  sizes="100vw"                 // ← always full viewport width
/>

// ─── Grid image (2-col on tablet, 1-col on mobile)
<Image
  src={product.image}
  alt={product.name}
  width={400}
  height={300}
  sizes="(max-width: 640px) 100vw,     // ← mobile: full width
         (max-width: 1024px) 50vw,     // ← tablet: half width
         400px"                         // ← desktop: fixed 400px
/>

// ─── Sidebar thumbnail (always small)
<Image
  src={user.avatar}
  alt={user.name}
  width={48}
  height={48}
  sizes="48px"                  // ← always 48px regardless of viewport
/>

// ─── Card in a 3-column grid
<Image
  src={post.cover}
  alt={post.title}
  fill
  sizes="(max-width: 640px) 100vw,     // mobile: 1 column
         (max-width: 1024px) 50vw,     // tablet: 2 columns
         33vw"                          // desktop: 3 columns
/>
```

### `preload` — Above-the-Fold Images

> **Next.js 16:** the `priority` prop was deprecated in favour of `preload` (same effect: a `<link rel="preload">` in `<head>`). Before 16 you wrote `priority`; it still works but is deprecated. The docs also suggest `loading="eager"` or `fetchPriority="high"` for most cases.

```tsx
// preload={true}:
//   → Disables lazy loading
//   → Adds <link rel="preload"> in <head>
//   → Eliminates LCP (Largest Contentful Paint) delay

// Use preload for:
// ✅ Hero images visible on first paint
// ✅ Above-the-fold product images
// ✅ Logo in the navigation
// ✅ The FIRST image in a list (rest should be lazy)

// Never use preload for:
// ❌ Images below the fold (defeats lazy loading)
// ❌ Carousel slides 2-N (only first matters)
// ❌ Images in modals or tabs

<Image
  src="/hero.jpg"
  alt="Hero"
  fill
  preload              // ← preloads this image ✅
  sizes="100vw"
/>

// Images without preload are lazy by default:
<Image
  src={product.image}
  alt={product.name}
  width={400}
  height={300}
  // ← lazy loaded by default (no preload prop needed) ✅
/>
```

### `fill` — Image Fills Its Container

```tsx
// fill={true}:
//   → Image fills parent container (position: absolute, inset: 0)
//   → Parent MUST have position: relative (or fixed/absolute)
//   → Use when you don't know exact image dimensions
//   → Always pair with object-fit CSS

// ─── Fixed-size container
<div className="relative w-full h-64">       {/* ← position: relative REQUIRED */}
  <Image
    src="/landscape.jpg"
    alt="Mountain landscape"
    fill
    sizes="(max-width: 768px) 100vw, 50vw"   // ← sizes still required with fill
    className="object-cover"                  // ← how image fits the container
    // object-cover:   crops to fill, maintains aspect ratio
    // object-contain: fits inside, may have letterboxing
    // object-fill:    stretches to fill (distorts aspect ratio)
  />
</div>

// ─── Aspect ratio container pattern
<div className="relative aspect-video w-full">   {/* ← 16:9 ratio */}
  <Image
    src="/video-thumbnail.jpg"
    alt="Video thumbnail"
    fill
    sizes="(max-width: 768px) 100vw, 800px"
    className="object-cover rounded-xl"
    preload                                      // ← if above fold
  />
</div>

// ─── Square avatar
<div className="relative w-12 h-12 rounded-full overflow-hidden">
  <Image
    src={user.avatar}
    alt={user.name}
    fill
    sizes="48px"
    className="object-cover"
  />
</div>
```

### `placeholder` — Loading State

```tsx
// ─── Blur placeholder (local images: automatic; remote: provide blurDataURL)
import profilePic from '@/public/profile.jpg'

// Local image: blur data generated at build time automatically
<Image
  src={profilePic}
  alt="Profile photo"
  placeholder="blur"     // ← shows blurred thumbnail while loading ✅
  width={200}
  height={200}
/>

// Remote image: you must provide the blurDataURL (base64 encoded tiny image)
<Image
  src="https://cdn.example.com/photo.jpg"
  alt="Photo"
  width={800}
  height={600}
  placeholder="blur"
  blurDataURL="data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQ..."  // ← tiny base64
/>

// ─── Generate blurDataURL with plaiceholder library (recommended)
// import { getPlaiceholder } from 'plaiceholder'
// const { base64 } = await getPlaiceholder('/photo.jpg')
```

### Image Output Formats — WebP and AVIF

```tsx
// next.config.ts — configure format priority
const config: NextConfig = {
  images: {
    formats: ["image/avif", "image/webp"], // ← AVIF first (smaller), WebP fallback
    // AVIF: ~50% smaller than WebP, ~80% smaller than JPEG
    // WebP: ~30% smaller than JPEG, widely supported
    // Next.js serves the best format the browser supports via Accept header
    minimumCacheTTL: 60 * 60 * 24 * 365, // ← cache optimized images for 1 year
  },
};
```

---

## W — Why It Matters

- The `sizes` prop is the single biggest performance impact of `next/image` — without it, the browser might download a 1200px image for a 400px thumbnail. Correct `sizes` can reduce image download size by 60-80% on mobile.
- `preload` on the LCP (Largest Contentful Paint) image is a Core Web Vitals direct improvement — it adds a `<link rel="preload">` in the HTML `<head>`, telling the browser to download the image before JavaScript runs.
- The `fill` + `relative container` pattern is how you handle images with unknown or variable dimensions — it's more flexible than specifying fixed `width` and `height`, and essential for responsive designs where images must fill their grid cells.

---

## I — Interview Q&A

### Q1: What does the `sizes` prop do in `next/image` and why is it important?

**A:** The `sizes` prop provides CSS media query hints that tell the browser what physical width the image will be at each viewport size. Next.js uses this to generate an optimal `srcset` attribute with multiple image sizes. When the browser selects which srcset entry to download, it uses `sizes` to pick the smallest image that still looks good at the current viewport. Without `sizes`, the browser conservatively downloads the largest srcset variant. Correct `sizes` can reduce image download size by 60-80% on mobile — a 400px image in a grid doesn't need to download the 1200px version.

### Q2: When should you use `preload={true}` on a `next/image`?

**A:** Use `preload` for images that are visible on the initial viewport without scrolling — particularly the Largest Contentful Paint (LCP) element. This includes hero images, above-the-fold product photos, and the first image in a list. `preload` disables lazy loading and adds a `<link rel="preload">` in the HTML head, ensuring the browser starts downloading the image before JavaScript executes. Only one or two images per page should have `preload` — adding it to all images defeats its purpose and can actually slow initial load by preloading too many assets.

### Q3: How does `next/image` prevent Cumulative Layout Shift (CLS)?

**A:** By requiring `width` and `height` props (or using `fill` with a sized container), `next/image` generates CSS that reserves the exact space for the image before it loads. This is equivalent to setting `aspect-ratio` based on the width/height ratio. The browser allocates the correct layout space immediately, so when the image loads, nothing shifts. Without reserved space, the browser doesn't know how much space the image will occupy until it loads — content below the image jumps down, causing CLS.

---

## C — Common Pitfalls + Fix

### ❌ Pitfall: Using `fill` without `position: relative` on the parent

```tsx
// ❌ fill image escapes its container and covers the whole page
<div className="w-full h-64">
  {" "}
  {/* ← no position: relative */}
  <Image src="/photo.jpg" alt="" fill />
</div>
```

**Fix:**

```tsx
<div className="relative w-full h-64">
  {" "}
  {/* ← position: relative required ✅ */}
  <Image src="/photo.jpg" alt="" fill className="object-cover" />
</div>
```

### ❌ Pitfall: Setting `preload` on ALL images

```tsx
// ❌ Every image prioritized = no image actually prioritized
{
  products.map((p) => (
    <Image
      key={p.id}
      src={p.image}
      alt={p.name}
      width={300}
      height={300}
      preload
    />
  ));
}
// Browser preloads 20 images simultaneously → slows initial page load ❌
```

**Fix:** Only first visible image gets `preload`:

```tsx
{
  products.map((p, index) => (
    <Image
      key={p.id}
      src={p.image}
      alt={p.name}
      width={300}
      height={300}
      preload={index === 0} // ← only first image ✅
    />
  ));
}
```

### ❌ Pitfall: Missing `remotePatterns` for external images

```tsx
// ❌ Next.js blocks external images by default — shows error in dev
<Image
  src="https://untrusted-cdn.com/image.jpg"
  alt=""
  width={400}
  height={300}
/>
// Error: Invalid src "https://untrusted-cdn.com/..." hostname not configured
```

**Fix:** Add the domain to `remotePatterns` in `next.config.ts`:

```tsx
images: {
  remotePatterns: [{ protocol: "https", hostname: "untrusted-cdn.com" }];
}
```

---

## K — Coding Challenge + Solution

### Challenge

Build a `ProductGrid` component with:

1. A hero product image using `fill` in a `aspect-square` container, `preload`, and `placeholder="blur"`
2. Grid of 4 product thumbnails with correct `sizes` for a 2-col mobile / 4-col desktop grid
3. Only the first thumbnail has `preload`
4. `next.config.ts` configured for `cdn.example.com` remote images
5. All images use `object-cover`

### Solution

```tsx
// next.config.ts
import type { NextConfig } from "next";
const config: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "cdn.example.com",
        pathname: "/products/**",
      },
    ],
    formats: ["image/avif", "image/webp"],
  },
};
export default config;
```

```tsx
// src/components/product-grid.tsx
import Image from "next/image";

interface Product {
  id: string;
  name: string;
  price: number;
  imageUrl: string;
}

const PRODUCTS: Product[] = [
  {
    id: "p1",
    name: "Air Max 90",
    price: 120,
    imageUrl: "https://cdn.example.com/products/airmax.jpg",
  },
  {
    id: "p2",
    name: "Canvas Tote",
    price: 45,
    imageUrl: "https://cdn.example.com/products/tote.jpg",
  },
  {
    id: "p3",
    name: "Wool Cap",
    price: 35,
    imageUrl: "https://cdn.example.com/products/cap.jpg",
  },
  {
    id: "p4",
    name: "Leather Wallet",
    price: 85,
    imageUrl: "https://cdn.example.com/products/wallet.jpg",
  },
];

export function ProductGrid() {
  const [hero, ...rest] = PRODUCTS;

  return (
    <div className="max-w-4xl mx-auto px-4 py-10">
      {/* Hero product — fill + preload + aspect-square */}
      <div className="relative aspect-square w-full max-w-md mx-auto mb-8 rounded-2xl overflow-hidden">
        <Image
          src={hero.imageUrl}
          alt={`Photo of ${hero.name}`}
          fill
          preload // ← LCP image ✅
          sizes="(max-width: 768px) 100vw, 448px" // ← max-w-md = 448px
          className="object-cover"
          placeholder="blur"
          blurDataURL="data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAYEBQYFBAYGBQYHBwYIChAKCgkJChQODwwQFxQYGBcUFhYaHSUfGhsjHBYWICwgIyYnKSopGR8tMC0oMCUoKSj/2wBDAQcHBwoIChMKChMoGhYaKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCj/wAARCAAIAAoDASIAAhEBAxEB/8QAFgABAQEAAAAAAAAAAAAAAAAABgUH/8QAIBAAAQMEAwEAAAAAAAAAAAAAAQIDBAURIUESU//EABUBAQEAAAAAAAAAAAAAAAAAAAAB/8QAFBEBAAAAAAAAAAAAAAAAAAAAAP/aAAwDAQACEQMRAD8AqGn6FGW8J20pDoZU4A0lRIyM9RnioK3VdvbaxJiRlSVFJJKXCRkDGfXH5oooA//Z"
        />
        <div
          className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/60
                         to-transparent p-4"
        >
          <p className="text-white font-semibold">{hero.name}</p>
          <p className="text-white/80 text-sm">${hero.price}</p>
        </div>
      </div>

      {/* Product grid — 2-col mobile / 4-col desktop */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {rest.map((product, index) => (
          <div
            key={product.id}
            className="border rounded-xl overflow-hidden bg-white
                          hover:shadow-md transition-shadow"
          >
            {/* Thumbnail — correct sizes for 2/4 col grid */}
            <div className="relative aspect-square">
              <Image
                src={product.imageUrl}
                alt={`Photo of ${product.name}`}
                fill
                sizes="(max-width: 640px) 50vw,     /* 2 columns on mobile */
                       (max-width: 1024px) 25vw,    /* 4 columns on tablet */
                       25vw" /* 4 columns on desktop */
                className="object-cover"
                preload={index === 0} // ← only first thumbnail ✅
              />
            </div>
            <div className="p-3">
              <p className="font-medium text-sm text-gray-900 truncate">
                {product.name}
              </p>
              <p className="text-blue-600 font-bold text-sm">
                ${product.price}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
```

---

---
