# 5 — CLS — Cumulative Layout Shift

---

## T — TL;DR

CLS measures how much page content unexpectedly moves during loading and use. Each shift is scored as `impact fraction × distance fraction`. The sum of all unexpected shifts is the CLS score. Target: ≤ 0.1. The three main causes: images without dimensions, late-injected content, and web fonts causing text reflow.

---

## K — Key Concepts

```
── CLS score calculation ─────────────────────────────────────────────────────

Layout shift score = impact fraction × distance fraction

impact fraction:  what fraction of the viewport was affected by the shift
distance fraction: how far the element moved as a fraction of viewport height

Example:
  A button covers 50% of viewport, moves down 25% of viewport height
  = 0.5 × 0.25 = 0.125  → this single shift fails CLS (> 0.1)

Accumulated across page lifetime = CLS
User-initiated shifts (scroll, button click expanding content) = NOT counted
Animated shifts using CSS animation with transform = NOT counted
```

```html
<!-- ── Fix 1: Always set width and height on images ────────────────────── -->

<!-- ❌ No dimensions — browser allocates 0px, image loads, everything shifts -->
<img src="/product.jpg" alt="Product" />

<!-- ✅ Dimensions tell browser to reserve space before image loads -->
<img src="/product.jpg" alt="Product" width="400" height="300" />
<!-- Browser computes aspect-ratio: 400/300 from these attributes
     even before the image downloads — no shift ✅ -->

<!-- In CSS — aspect-ratio for responsive images -->
img { aspect-ratio: 4/3; width: 100%; height: auto; }
```

```css
/* ── Fix 2: Reserve space for ads, embeds, and dynamic content ─────────── */

/* ❌ Ad container with no height — shifts when ad loads */
.ad-container { width: 100%; }

/* ✅ Reserve minimum height matching typical ad size */
.ad-container {
  width:      100%;
  min-height: 250px;   /* reserve space for 300×250 ad unit */
  background: #f5f5f5; /* optional placeholder colour */
}
```

```css
/* ── Fix 3: Web fonts — prevent FOUT/FOIT causing text reflow ───────────── */

/* FOUT (Flash of Unstyled Text): fallback font → web font → text reflow = CLS */
/* FOIT (Flash of Invisible Text): invisible text → web font = bad LCP */

/* Fix A: font-display: optional — only uses web font if cached, falls back */
@font-face {
  font-family: 'Inter';
  src: url('/fonts/inter.woff2') format('woff2');
  font-display: optional;   /* no FOUT, possible fallback on first load */
}

/* Fix B: size-adjust to match fallback font metrics — minimises reflow */
@font-face {
  font-family: 'Inter-fallback';
  src: local('Arial');
  size-adjust:        107%;  /* adjust fallback to match Inter's metrics */
  ascent-override:    90%;
  descent-override:   20%;
  line-gap-override:  0%;
}
```

```typescript
// ── Next.js font — zero-CLS approach ─────────────────────────────────────
// next/font automatically:
// - Self-hosts the font (no external request)
// - Inlines the font-face declaration
// - Generates a matching size-adjust fallback
// - Sets font-display: swap with fallback metrics

import { Inter } from 'next/font/google'

const inter = Inter({
  subsets:  ['latin'],
  display:  'swap',
  variable: '--font-inter',    // CSS variable for use in Tailwind
})

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html className={inter.variable}>
      <body>{children}</body>
    </html>
  )
}
```

```
── Diagnosing CLS in DevTools ────────────────────────────────────────────────

Chrome DevTools → Performance → record page load
  Look for purple "Layout Shift" markers on the Experience track
  Click a marker → see: score, elements that shifted, screenshot

Chrome DevTools → Rendering (⋮ → More tools → Rendering)
  Enable "Layout Shift Regions" → flashes red on every shift in real time

Lighthouse → "Avoid large layout shifts" section lists the specific elements
```

---

## W — Why It Matters

- Setting `width` and `height` on `<img>` is a one-line fix that eliminates the most common CLS source — the browser uses these to compute `aspect-ratio` automatically, reserving exact space before the image downloads.
- Late-injected banners, cookie notices, and "you may also like" sections injected above existing content are CLS bombs — a cookie banner that pushes the whole page down counts as a massive layout shift. Inject below-fold or use a fixed/sticky overlay that doesn't push content.
- `font-display: optional` vs `swap` — `swap` shows fallback immediately then swaps (causes text reflow = CLS). `optional` only uses the web font if it loads within a very short window (no swap = no CLS). Next.js `next/font` with size-adjust achieves near-zero CLS with `swap` by making the fallback dimensionally identical.

---

## I — Interview Q&A

### Q: How do you prevent layout shift from web fonts?

**A:** Three strategies: (1) use `font-display: optional` — the browser only applies the web font if it loads within a tiny initial window; if it doesn't, it sticks with the fallback forever for that page load. No swap means no reflow means zero CLS from fonts. (2) Use `size-adjust`, `ascent-override`, `descent-override`, and `line-gap-override` CSS descriptors to make the fallback font's metrics match the web font exactly — when the swap happens, text occupies identical space, so no layout shift occurs. (3) Use `next/font` which does option 2 automatically — it measures the web font, generates a matching fallback `@font-face` with `size-adjust`, and self-hosts the font to eliminate the third-party connection latency.

---

## C — Common Pitfalls + Fix

### ❌ Inserting cookie banner into the DOM above page content — massive CLS

```typescript
// ❌ Inserts banner at top, pushes all content down
document.body.insertBefore(cookieBanner, document.body.firstChild)
// Impact fraction ≈ 1.0, distance fraction ≈ 0.1 → shift score = 0.1 → FAILS ❌

// ✅ Fixed-position overlay — doesn't affect document flow
cookieBanner.style.position = 'fixed'
cookieBanner.style.bottom = '0'
cookieBanner.style.left = '0'
// OR: reserve space for the banner height in the layout from the start
```

---

## K — Coding Challenge + Solution

### Challenge

A product card has: an image without dimensions, a "SALE" badge injected after load, and a web font loaded with `@import`. Fix all three CLS sources.

### Solution

```tsx
// ✅ Fixed product card — zero CLS
import Image from 'next/image'

// Font: use next/font instead of @import
import { Inter } from 'next/font/google'
const inter = Inter({ subsets: ['latin'], display: 'swap' })

interface ProductCardProps {
  name:    string
  price:   number
  imgSrc:  string
  onSale?: boolean
}

export function ProductCard({ name, price, imgSrc, onSale }: ProductCardProps) {
  return (
    <div className={`card ${inter.className}`}>
      {/* Fix 1: next/image always requires width/height — no dimension CLS */}
      <div style={{ position: 'relative', width: '100%', aspectRatio: '4/3' }}>
        <Image
          src={imgSrc}
          alt={name}
          fill
          sizes="(max-width: 768px) 100vw, 400px"
          style={{ objectFit: 'cover' }}
        />
        {/* Fix 2: badge rendered server-side, not injected late */}
        {onSale && (
          <span className="badge">SALE</span>
        )}
      </div>
      <h3>{name}</h3>
      <p>${price}</p>
    </div>
  )
}
/* Fix 3: font via next/font — no @import, no FOUT, no CLS */
```

---

---
