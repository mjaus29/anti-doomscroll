# 3 — LCP — Largest Contentful Paint

---

## T — TL;DR

LCP marks when the page's largest visible element finishes rendering. It's almost always a hero image or an `<h1>`. The four causes of slow LCP are: slow server (TTFB), render-blocking resources, slow resource load time, and client-side rendering delay. Fix them in that order — server speed first.

---

## K — Key Concepts

```
── LCP candidate elements ────────────────────────────────────────────────────

Browser considers:
  <img>                       — most common LCP element
  <image> inside <svg>
  <video poster="">           — poster image
  Elements with background-image: url()
  Block-level text elements   — <h1>, <p> with large text

NOT considered:
  opacity: 0 elements
  Elements outside the viewport
  <video> playing frame (only poster)
```

```
── LCP breakdown — four phases ──────────────────────────────────────────────

[TTFB] → [Resource Load Delay] → [Resource Load Duration] → [Element Render Delay]
  ↑              ↑                        ↑                          ↑
Fix:         Fix:                    Fix:                       Fix:
Faster       Preload the            Compress/resize            Avoid client-side
server       LCP resource           to WebP/AVIF               rendering delay
CDN edge     fetchpriority=high     Use CDN                    SSR the LCP element
             No render-blocking     Correct image sizes        No lazy-load LCP image
```

```html
<!-- ── LCP image optimisation checklist ──────────────────────────────────── -->

<!-- ❌ Everything wrong -->
<img src="/hero.jpg" loading="lazy" />

<!-- ✅ Everything right -->
<link rel="preload" as="image" href="/hero.webp" fetchpriority="high" />

<img
  src="/hero.webp"
  alt="Hero image"
  width="1200"
  height="600"
  fetchpriority="high"
  loading="eager"
  decoding="async"
  sizes="(max-width: 768px) 100vw, 1200px"
  srcset="/hero-400.webp 400w, /hero-800.webp 800w, /hero-1200.webp 1200w"
/>
```

```typescript
// ── Diagnosing LCP in DevTools ─────────────────────────────────────────────
// Chrome DevTools → Performance → record page load
// Look for: "LCP" marker on the timeline
// Click the LCP entry → see which element, size, time

// Chrome DevTools → Elements → right-click LCP element → "Scroll into view"
// Check: is it above the fold? Is it lazy-loaded? Has fetchpriority="high"?

// Lighthouse → "Largest Contentful Paint element" section shows the element + phase breakdown
// Phases: TTFB, Load Delay, Load Duration, Render Delay
// The longest phase is where to focus
```

```
── LCP on client-rendered apps (React / Next.js CSR) ────────────────────────

Problem: LCP element rendered by JavaScript
  HTML arrives empty → JS downloads → JS executes → LCP element appears
  LCP time = TTFB + JS bundle download + JS parse/execute + render

Fix options (in order of impact):
  1. SSR / SSG — render LCP element to HTML on server → browser paints on parse
  2. Streaming SSR — send LCP element HTML first, stream rest
  3. If CSR is unavoidable: preload the data, keep JS bundle small
```

---

## W — Why It Matters

- Adding `loading="lazy"` to the LCP image is the single most common LCP regression — it delays the browser from discovering and downloading the image until it's nearly in the viewport, adding 500–2000ms to LCP. Never lazy-load the LCP image.
- `fetchpriority="high"` on the LCP image tells the browser to deprioritise everything else and download this first — it can cut LCP by 200–500ms on pages with many competing resources.
- SSR vs CSR is often the difference between passing and failing LCP — a React SPA that client-renders the hero image has LCP gated behind JavaScript execution. SSR moves the LCP element into the initial HTML, making it discoverable immediately.

---

## I — Interview Q&A

### Q: A page has LCP of 4.2 seconds. What are the first three things you investigate?

**A:** (1) TTFB first — open DevTools Network tab, look at the HTML document's TTFB. If it's over 800ms, the server or CDN is the bottleneck and no frontend optimization will fix LCP. (2) Check if the LCP element is an image and whether it has `loading="lazy"` — this is the most common quick win. Remove lazy loading from the LCP image and add `fetchpriority="high"`. (3) Check Lighthouse's "LCP breakdown" — it shows four phases (TTFB, Load Delay, Load Duration, Render Delay). The largest phase reveals the fix: long Load Duration means the image is too large or not on a CDN; long Render Delay means the page is client-rendered and JS is blocking the element from appearing.

---

## C — Common Pitfalls + Fix

### ❌ Lazy-loading the hero image — delays LCP by seconds

```html
<!-- ❌ Delays LCP: browser waits until near-viewport to start download -->
<img src="/hero.jpg" loading="lazy" />

<!-- ✅ Eager + high priority + preload for fastest possible LCP -->
<link rel="preload" as="image" href="/hero.webp" fetchpriority="high" />
<img src="/hero.webp" loading="eager" fetchpriority="high" width="1200" height="600" alt="" />
```

---

## K — Coding Challenge + Solution

### Challenge

In a Next.js app, a `HeroBanner` component renders the LCP image. Fix it: (1) use `next/image` with `priority`, (2) add the correct `sizes`, (3) ensure no lazy loading, (4) demonstrate the correct import and usage.

### Solution

```tsx
// components/HeroBanner.tsx
import Image from 'next/image'

export function HeroBanner() {
  return (
    <section style={{ position: 'relative', width: '100%', height: '600px' }}>
      <Image
        src="/images/hero.jpg"
        alt="Hero banner — main product showcase"
        fill                    // fills the container (replaces width/height for fill mode)
        priority                // sets fetchpriority="high" + preload link ✅
        sizes="100vw"           // full viewport width — accurate srcset selection
        style={{ objectFit: 'cover' }}
        quality={85}            // WebP/AVIF at 85% — good balance
      />
      <h1 style={{ position: 'relative', zIndex: 1 }}>
        Welcome to Our Store
      </h1>
    </section>
  )
}

// next.config.ts — enable AVIF for maximum compression
import type { NextConfig } from 'next'
const config: NextConfig = {
  images: {
    formats: ['image/avif', 'image/webp'],  // AVIF first, fallback to WebP
  },
}
export default config
```

---

---
