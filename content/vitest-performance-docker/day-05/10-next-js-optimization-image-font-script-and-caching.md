# 10 — Next.js Optimization — Image, Font, Script, and Caching

---

## T — TL;DR

Next.js provides built-in performance primitives: `next/image` (automatic format conversion, lazy loading, sizing), `next/font` (self-hosted, zero-CLS fonts), `next/script` (controlled third-party script loading), and HTTP caching headers for static assets. Using all four correctly handles the most common performance issues without custom infrastructure.

---

## K — Key Concepts

```tsx
// ── next/image — the complete guide ──────────────────────────────────────
import Image from 'next/image'

// Fixed size image
<Image src="/avatar.jpg" alt="User avatar" width={48} height={48} />

// Fill parent container (responsive)
<div style={{ position: 'relative', width: '100%', height: '400px' }}>
  <Image src="/hero.jpg" alt="Hero" fill style={{ objectFit: 'cover' }}
    sizes="100vw" priority />  {/* priority = preload + fetchpriority=high */}
</div>

// Responsive with srcset
<Image
  src="/product.jpg"
  alt="Product"
  width={800}
  height={600}
  sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 800px"
  // Next.js generates WebP/AVIF srcset based on sizes ✅
/>
```

```typescript
// next/image decisions table:
// Is it the LCP element?          → add priority={true}
// Is it below the fold?           → default (lazy, no priority)
// Is it a fill/background image?  → use fill + position:relative parent
// Is it a fixed-size icon/avatar? → use width + height numbers
// Is source external (CDN)?       → add domain to images.remotePatterns
```

```typescript
// next.config.ts — image configuration
const config: NextConfig = {
  images: {
    formats:       ['image/avif', 'image/webp'],  // AVIF first (30% smaller than WebP)
    deviceSizes:   [640, 750, 828, 1080, 1200, 1920],
    imageSizes:    [16, 32, 48, 64, 96, 128, 256, 384],
    minimumCacheTTL: 60 * 60 * 24 * 365,  // 1 year cache for optimised images

    remotePatterns: [{
      protocol: 'https',
      hostname:  '**.cloudinary.com',  // allow Cloudinary images
    }],
  },
}
```

```typescript
// ── next/font — zero-CLS, zero-external-request fonts ────────────────────
import { Inter, JetBrains_Mono } from 'next/font/google'
import localFont                  from 'next/font/local'

// Google Font (self-hosted automatically at build time)
const inter = Inter({
  subsets:      ['latin'],
  display:      'swap',
  variable:     '--font-sans',    // CSS custom property
  preload:      true,             // default true — generates preload link
  fallback:     ['system-ui'],    // fallback font list
})

// Local font
const customFont = localFont({
  src: [
    { path: './fonts/custom-400.woff2', weight: '400' },
    { path: './fonts/custom-700.woff2', weight: '700' },
  ],
  variable: '--font-custom',
})

// layout.tsx — apply via className
<html className={`${inter.variable} ${customFont.variable}`}>
```

```tsx
// ── next/script — third-party script loading strategies ──────────────────
import Script from 'next/script'

// afterInteractive (default): loads after page becomes interactive — analytics
<Script
  src="https://www.googletagmanager.com/gtag/js?id=GA_ID"
  strategy="afterInteractive"
/>

// lazyOnload: loads during browser idle time — lowest priority
<Script src="https://widget.intercom.io/widget/APP_ID" strategy="lazyOnload" />

// beforeInteractive: loads before hydration — critical third-party (rare)
// Use only for scripts that MUST run before any JS (consent managers)
<Script src="/critical-consent.js" strategy="beforeInteractive" />

// worker: runs in Web Worker via Partytown — offloads from main thread
<Script src="https://analytics.example.com/tracker.js" strategy="worker" />
// Requires: experimental.nextScriptWorkers: true in next.config.ts
```

```typescript
// ── HTTP caching — Next.js App Router ────────────────────────────────────
// Static assets (.js, .css, images) → immutable 1-year cache automatically
// Cache-Control: public, max-age=31536000, immutable

// Data cache — fetch() in Server Components
async function getProducts() {
  const res = await fetch('https://api.example.com/products', {
    next: {
      revalidate: 3600,   // ISR: revalidate every hour
      // revalidate: false  → cache indefinitely (static)
      // revalidate: 0      → no cache (dynamic)
      tags: ['products'],  // for on-demand revalidation
    }
  })
  return res.json()
}

// On-demand revalidation (e.g. after CMS publish)
// app/api/revalidate/route.ts
import { revalidateTag } from 'next/cache'
export function POST(req: Request) {
  revalidateTag('products')   // busts all fetches tagged 'products'
  return Response.json({ revalidated: true })
}
```

```typescript
// ── Route segment config — page-level caching control ────────────────────
// app/products/page.tsx
export const revalidate = 3600   // ISR — revalidate every hour
export const dynamic   = 'force-static'  // always static, ignore dynamic headers

// app/dashboard/page.tsx
export const dynamic   = 'force-dynamic'  // always SSR, never cached
```

---

## W — Why It Matters

- `next/image` with `priority` on the hero image is the single highest-impact Next.js performance change — it generates a `<link rel="preload">` in the `<head>`, sets `fetchpriority="high"`, disables lazy loading, and serves AVIF/WebP. A single prop change can improve LCP by 500–1500ms.
- `next/font` eliminates Google Fonts' two-network-request chain — Google Fonts requires a CSS request to `fonts.googleapis.com` followed by a font file request to `fonts.gstatic.com`. Next.js downloads the font at build time and serves it from your own origin with a `preload` link, removing 200–600ms of latency.
- `strategy="afterInteractive"` for analytics scripts prevents them from blocking page interaction — analytics scripts are notorious for running long tasks during page load. Loading them after interactivity ensures they don't inflate TBT or INP scores.

---

## I — Interview Q&A

### Q: What does `next/image` do differently from a plain `<img>` tag?

**A:** Seven key differences: (1) automatic format conversion — serves AVIF or WebP based on browser support, reducing file size by 30–50%; (2) responsive srcset generation — generates multiple sizes so browsers download the right size for their viewport, not a desktop image on mobile; (3) lazy loading by default — all images below the fold use `loading="lazy"`, saving bandwidth; (4) prevents CLS — requires `width`/`height` or `fill`, so the browser always reserves the correct space; (5) `priority` prop — adds `<link rel="preload">` and `fetchpriority="high"` for the LCP image; (6) built-in CDN caching — images are served through Next.js's image optimisation API with a long cache TTL; (7) blur-up placeholder — `placeholder="blur"` shows a low-quality blurred version while the full image loads, improving perceived performance.

---

## C — Common Pitfalls + Fix

### ❌ Loading Google Analytics with `beforeInteractive` — blocks rendering

```tsx
// ❌ Loads before hydration — blocks main thread during critical path
<Script src="/ga.js" strategy="beforeInteractive" />

// ✅ Analytics should never block rendering
<Script
  src="https://www.googletagmanager.com/gtag/js?id=GA_ID"
  strategy="afterInteractive"    // after page is interactive
/>
<Script id="ga-init" strategy="afterInteractive">
  {`window.dataLayer=[];function gtag(){dataLayer.push(arguments)}
    gtag('js',new Date());gtag('config','GA_ID');`}
</Script>
```

---

## K — Coding Challenge + Solution

### Challenge

Optimise a Next.js landing page: (1) LCP hero image with correct `next/image` props; (2) self-hosted Google Font (Inter) with zero-CLS; (3) load a third-party chat widget lazily; (4) configure ISR for the product list that revalidates every 30 minutes with on-demand tag revalidation.

### Solution

```tsx
// app/layout.tsx
import { Inter }  from 'next/font/google'
import Script     from 'next/script'

const inter = Inter({
  subsets:  ['latin'],
  display:  'swap',              // next/font adds size-adjust automatically → 0 CLS
  variable: '--font-inter',
  preload:  true,
})

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={inter.variable}>
      <body>
        {children}

        {/* (3) Chat widget — lowest priority, runs during idle time */}
        <Script
          src="https://cdn.chatwidget.io/widget.js"
          strategy="lazyOnload"
          onLoad={() => console.log('Chat widget loaded')}
        />
      </body>
    </html>
  )
}
```

```tsx
// components/HeroBanner.tsx — (1) LCP image
import Image from 'next/image'

export function HeroBanner() {
  return (
    <section style={{ position: 'relative', width: '100%', height: '560px' }}>
      <Image
        src="/images/hero.jpg"
        alt="Featured products banner"
        fill
        priority                         // ← LCP: preload + high priority ✅
        sizes="100vw"
        style={{ objectFit: 'cover' }}
        quality={85}
      />
    </section>
  )
}
```

```typescript
// app/page.tsx — (4) ISR with tag-based on-demand revalidation
export const revalidate = 1800  // 30 minutes default ISR

async function getProducts() {
  const res = await fetch('https://api.example.com/products', {
    next: { revalidate: 1800, tags: ['products'] }
  })
  return res.json() as Promise<Product[]>
}

export default async function HomePage() {
  const products = await getProducts()
  return (
    <>
      <HeroBanner />
      <ProductGrid products={products} />
    </>
  )
}

// app/api/revalidate/route.ts — on-demand revalidation webhook
import { revalidateTag } from 'next/cache'

export async function POST(req: Request) {
  const { tag, secret } = await req.json() as { tag: string; secret: string }
  if (secret !== process.env.REVALIDATE_SECRET) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }
  revalidateTag(tag)   // call with tag='products' after CMS publish ✅
  return Response.json({ revalidated: true, tag })
}
```

---

## ✅ Day 5 Complete — Web Performance Optimization

| # | Subtopic | Status |
|---|----------|--------|
| 1 | Browser Performance Model | ☐ |
| 2 | Core Web Vitals Overview | ☐ |
| 3 | LCP — Largest Contentful Paint | ☐ |
| 4 | INP — Interaction to Next Paint | ☐ |
| 5 | CLS — Cumulative Layout Shift | ☐ |
| 6 | Lab vs Field Data | ☐ |
| 7 | Chrome DevTools Performance Panel | ☐ |
| 8 | Performance Budgets and Lighthouse CI | ☐ |
| 9 | Bundle Control — Code Splitting and Lazy Loading | ☐ |
| 10 | Next.js Image, Font, Script, Caching | ☐ |

---

## 🗺️ One-Page Mental Model — Day 5

```
BROWSER RENDERING PIPELINE
  HTML → DOM → CSSOM → Render Tree → Layout → Paint → Composite → Screen
  Render-blocking: <link rel=stylesheet>, <script> without async/defer
  Fix: defer scripts, preconnect to origins, preload LCP resource
  Compositor-only (fast): transform, opacity  |  Layout-triggering (slow): width, top, margin
  TTFB < 800ms is prerequisite for all CWV targets

CORE WEB VITALS (p75 threshold)
  LCP ≤ 2.5s   — largest image or text visible — "is it loaded?"
  INP ≤ 200ms  — worst interaction latency — "is it responsive?"
  CLS ≤ 0.1    — sum of unexpected layout shifts — "is it stable?"
  Pass: 75th percentile of real CrUX sessions must meet threshold
  INP replaced FID (March 2024): measures full interaction cost + all interactions

LCP
  Causes: slow TTFB → render blocking → slow image → CSR delay
  Fix in order: CDN/server → defer non-critical → WebP/AVIF on CDN → SSR
  Never lazy-load the LCP image
  Use fetchpriority="high" + <link rel=preload> + eager loading
  next/image priority={true} handles all of the above automatically

INP
  3 phases: Input Delay | Processing Time | Presentation Delay
  Fix input delay: break up long tasks with scheduler.yield()
  Fix processing: startTransition, useDeferredValue, Web Workers
  Fix presentation: batch reads before writes, use transform not layout props
  Third-party scripts: load afterInteractive, consider Partytown worker strategy

CLS
  Score = Σ (impact fraction × distance fraction) — must be ≤ 0.1
  Always set width + height on <img> (browser computes aspect-ratio)
  Reserve space for ads/embeds: min-height on container
  Fonts: next/font adds size-adjust → fallback matches web font → 0 CLS
  User-initiated shifts don't count; animated transforms don't count

LAB vs FIELD DATA
  Lab:   Lighthouse/DevTools — controlled, fast, good for diagnosis
  Field: CrUX/PageSpeed — real users, what Google ranks
  PageSpeed Insights: shows both — field data at top, Lighthouse below
  Lighthouse TBT weight: 30% — reducing long tasks = biggest score gain
  numberOfRuns: 3 in Lighthouse CI — median of 3 reduces variance

DEVTOOLS PERFORMANCE PANEL
  Main thread track: tasks, long tasks (red corner > 50ms), call stacks
  Interactions track: INP phases (Input Delay | Processing | Presentation)
  Timings track: FCP, LCP, CLS markers
  Bottom-Up tab: sort by self time → find the actual bottleneck function
  Layout thrashing: read then write in a loop → batch reads before writes

PERFORMANCE BUDGETS + LIGHTHOUSE CI
  lighthouserc.js: assert LCP < 2500ms, TBT < 200ms, CLS < 0.1
  numberOfRuns: 3, preset: mobile
  GitHub Actions: required status check on PRs
  bundlesize: enforce JS chunk size limits in CI

BUNDLE CONTROL
  Code splitting: dynamic import() → separate chunk loaded on demand
  next/dynamic: lazy React components with loading fallback
  Route splitting: automatic in Next.js App Router (per page)
  Barrel files: use optimizePackageImports or import directly from source
  Tree shaking: use ESM packages, avoid lodash (use lodash-es or native)
  Bundle Analyzer: ANALYZE=true npm run build → find large packages

NEXT.JS OPTIMIZATION
  next/image:  AVIF/WebP, lazy default, prevents CLS, priority for LCP
  next/font:   self-hosted, size-adjust fallback, zero CLS, zero external req
  next/script: afterInteractive (analytics), lazyOnload (widgets), worker (Partytown)
  Caching:     fetch() + next.revalidate + next.tags → ISR + on-demand revalidation
               revalidateTag('products') in API route for CMS publish webhooks
               Static assets: immutable 1-year cache automatically

KEY RULES
  LCP image: never lazy-load, always priority={true} with next/image
  Fonts: always next/font — never @import, never <link> to Google Fonts
  Analytics: always afterInteractive — never beforeInteractive
  INP: scheduler.yield() for long loops, startTransition for React updates
  CLS: always set dimensions on images, reserve space for dynamic content
  CI: Lighthouse CI with 3 runs + bundle size limits on every PR
```

> **Your next action:** Open PageSpeed Insights (pagespeed.web.dev), paste your app's URL, and look at the field data section. Find which of the three CWV metrics is failing first — that tells you exactly where to start.

> "Doing one small thing beats opening a feed."
