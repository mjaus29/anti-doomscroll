# 2 — `next/font` — Google Fonts, Local Fonts, Font Optimization

---

## T — TL;DR

`next/font` downloads and self-hosts fonts at build time — zero network requests to Google at runtime, automatic `font-display: swap`, and CSS variables for use with Tailwind. It eliminates Flash of Unstyled Text (FOUT) and removes font loading as a performance bottleneck.

---

## K — Key Concepts

### How `next/font` Works

```
Traditional Google Fonts:
  <link href="https://fonts.googleapis.com/css2?family=Inter" rel="stylesheet">
  → Browser makes network request to Google at page load
  → Font download blocks rendering (FOUT)
  → Privacy concern (Google sees user IPs)
  → Extra DNS lookup + TCP connection

next/font/google:
  → Downloads font files at BUILD TIME
  → Self-hosts them alongside your app (same origin)
  → Generates optimized CSS with font-display: optional/swap
  → Zero Google requests at runtime
  → Automatic subset detection (only load characters you use)
  → Automatic size-adjust to prevent layout shift
```

### Google Fonts — Single Font

```tsx
// src/app/layout.tsx
import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

// ─── Configure font (evaluated at build time)
const inter = Inter({
  subsets: ["latin"], // ← only download latin characters
  variable: "--font-inter", // ← creates CSS variable
  display: "swap", // ← font-display: swap (default is 'swap')
  weight: ["400", "500", "600", "700"], // ← only requested weights downloaded
  style: ["normal", "italic"], // ← only requested styles
});

export const metadata: Metadata = { title: "Acme" };

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    // ─── Apply font CSS variable to html element
    <html lang="en" className={inter.variable}>
      <body className="font-inter">
        {" "}
        {/* ← or use the variable in globals.css */}
        {children}
      </body>
    </html>
  );
}
```

### Google Fonts — Multiple Fonts (Common Pattern)

```tsx
// src/lib/fonts.ts — centralize font declarations
import { Inter, Geist_Mono, Playfair_Display } from "next/font/google";

// Body font
export const inter = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
});

// Monospace font (code blocks)
export const geistMono = Geist_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
  display: "swap",
});

// Display font (headings)
export const playfair = Playfair_Display({
  subsets: ["latin"],
  variable: "--font-display",
  display: "swap",
  weight: ["400", "700"],
});
```

```tsx
// src/app/layout.tsx
import { inter, geistMono, playfair } from "@/lib/fonts";
import "./globals.css";

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      // ─── Apply all font CSS variables to <html>
      className={`${inter.variable} ${geistMono.variable} ${playfair.variable}`}
    >
      <body>{children}</body>
    </html>
  );
}
```

```css
/* src/app/globals.css — use the CSS variables */
@import "tailwindcss";

@theme {
  /* Map Tailwind font families to CSS variables */
  --font-sans: var(--font-sans); /* → Inter */
  --font-mono: var(--font-mono); /* → Geist Mono */
  --font-display: var(--font-display); /* → Playfair Display */
}

body {
  font-family: var(--font-sans);
}
```

### Local Fonts — Self-Hosted Custom Fonts

```tsx
// src/lib/fonts.ts
import localFont from "next/font/local";

// ─── Single local font with multiple weights
export const brandFont = localFont({
  src: [
    {
      path: "../fonts/BrandFont-Regular.woff2",
      weight: "400",
      style: "normal",
    },
    {
      path: "../fonts/BrandFont-Medium.woff2",
      weight: "500",
      style: "normal",
    },
    {
      path: "../fonts/BrandFont-Bold.woff2",
      weight: "700",
      style: "normal",
    },
    {
      path: "../fonts/BrandFont-Italic.woff2",
      weight: "400",
      style: "italic",
    },
  ],
  variable: "--font-brand",
  display: "swap",
  // Restrict to characters used (reduces file size)
  preload: true,
});
```

```
Font files go in:
src/
└── fonts/
    ├── BrandFont-Regular.woff2
    ├── BrandFont-Medium.woff2
    ├── BrandFont-Bold.woff2
    └── BrandFont-Italic.woff2
```

### Using Font Variables in Tailwind v4

```css
/* globals.css — after @import "tailwindcss" */
@theme {
  --font-sans: var(--font-inter), system-ui, sans-serif;
  --font-mono: var(--font-geist-mono), ui-monospace, monospace;
  --font-display: var(--font-playfair), Georgia, serif;
}
```

```tsx
// Now use Tailwind font utilities in JSX
export function BlogPost({
  title,
  content,
}: {
  title: string;
  content: string;
}) {
  return (
    <article>
      <h1 className="font-display text-4xl font-bold">{title}</h1>
      <p className="font-sans text-base leading-relaxed">{content}</p>
      <code className="font-mono text-sm bg-gray-100 px-2 rounded">
        const x = 1
      </code>
    </article>
  );
}
```

### `font-display` Options

```tsx
// font-display controls how font renders before download completes
const font = Inter({
  subsets: ["latin"],
  display: "swap", // ← show fallback text, swap to custom font when ready
  //   small layout shift, text always visible (RECOMMENDED)

  display: "optional", // ← only use custom font if available within 100ms
  //   no layout shift, may show fallback on slow connections

  display: "block", // ← hide text until font loads (invisible text = bad UX)
  display: "fallback", // ← hide for 100ms, then show fallback, swap if ready in 3s
  display: "auto", // ← browser decides (usually 'block')
});

// For Next.js apps: use 'swap' for maximum text visibility
// Use 'optional' to eliminate CLS entirely (text never re-renders)
```

---

## W — Why It Matters

- Self-hosted fonts (the `next/font` approach) score better on Core Web Vitals — no render-blocking third-party DNS lookups, no FOUT without `font-display: swap`, and no layout shift from font size differences between fallback and custom font (Next.js automatically adjusts `size-adjust` and `ascent-override`).
- The CSS variable pattern (`variable: '--font-sans'`) is the correct integration point with Tailwind — it decouples the font declaration from its usage. Changing fonts later requires updating only the font config, not every `className` in the codebase.
- `subsets: ['latin']` is a critical optimization — loading the full Unicode subset of a font can be 500KB+ vs 20KB for Latin-only. Always specify the minimum subset for your content.

---

## I — Interview Q&A

### Q1: What problem does `next/font` solve and how does it work?

**A:** `next/font` solves three problems with traditional web fonts: performance (eliminates third-party network requests at runtime by self-hosting fonts), privacy (no user IP data sent to Google Fonts), and layout stability (prevents Cumulative Layout Shift by injecting `size-adjust` and `ascent-override` CSS to match the fallback font metrics). It works by downloading font files from Google (or using local files) at build time, generating optimized CSS with `font-display: swap`, and serving the font files from your own domain. At runtime, the browser requests fonts from your server, not Google's CDN.

### Q2: What is the difference between `display: 'swap'` and `display: 'optional'` for font loading?

**A:** `display: 'swap'` shows the fallback font immediately (text is always visible), then swaps to the custom font when it finishes loading. This causes a brief visual "flash" as text re-renders with the new font. `display: 'optional'` gives the browser a very short window (~100ms) to load the font; if it doesn't load in time, the fallback is used for the entire page load with no subsequent swap. `optional` eliminates Cumulative Layout Shift entirely but may result in the custom font not showing on slow connections. `swap` is recommended for most apps where brand font consistency matters.

---

## C — Common Pitfalls + Fix

### ❌ Pitfall: Instantiating fonts inside a component — re-created on every render

```tsx
// ❌ Font created inside a component — next/font must be module-level
export default function Layout({ children }) {
  const inter = Inter({ subsets: ["latin"] }); // ← re-instantiated every render ❌
  return <html className={inter.variable}>{children}</html>;
}
```

**Fix:** Declare fonts at module scope (outside components):

```tsx
// ✅ Module-level declaration — evaluated once at build time
const inter = Inter({ subsets: ["latin"], variable: "--font-sans" });

export default function Layout({ children }) {
  return <html className={inter.variable}>{children}</html>;
}
```

### ❌ Pitfall: Applying the font class to `<body>` instead of `<html>` when using CSS variables

```tsx
// ❌ CSS variable on body — doesn't propagate to :root properly in all browsers
<body className={inter.variable}>

// ✅ Apply to <html> — CSS variable available to entire document tree
<html className={inter.variable}>
```

---

## K — Coding Challenge + Solution

### Challenge

Set up a complete font system for a blog:

1. `Inter` as the sans-serif body font (`--font-sans`, weight 400/500/600)
2. `Playfair_Display` as the display/heading font (`--font-display`, weight 400/700)
3. `Geist_Mono` as the monospace code font (`--font-mono`)
4. Export all three from `src/lib/fonts.ts`
5. Apply all CSS variables to `<html>` in root layout
6. Map them in `globals.css` `@theme` block
7. A `BlogCard` component using all three font families

### Solution

```tsx
// src/lib/fonts.ts
import { Inter, Playfair_Display, Geist_Mono } from "next/font/google";

export const inter = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
  weight: ["400", "500", "600"],
});

export const playfair = Playfair_Display({
  subsets: ["latin"],
  variable: "--font-display",
  display: "swap",
  weight: ["400", "700"],
});

export const geistMono = Geist_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
  display: "swap",
});
```

```css
/* src/app/globals.css */
@import "tailwindcss";

@theme {
  --font-sans: var(--font-sans), system-ui, sans-serif;
  --font-display: var(--font-display), Georgia, serif;
  --font-mono: var(--font-mono), ui-monospace, monospace;
}

body {
  font-family: var(--font-sans);
  -webkit-font-smoothing: antialiased;
}
```

```tsx
// src/app/layout.tsx
import { inter, playfair, geistMono } from "@/lib/fonts";
import "./globals.css";

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      className={`${inter.variable} ${playfair.variable} ${geistMono.variable}`}
    >
      <body>{children}</body>
    </html>
  );
}
```

```tsx
// src/components/blog-card.tsx
interface BlogCardProps {
  title: string;
  excerpt: string;
  category: string;
  snippet: string;
}

export function BlogCard({ title, excerpt, category, snippet }: BlogCardProps) {
  return (
    <article
      className="border rounded-2xl p-6 bg-white hover:shadow-md
                         transition-shadow space-y-3"
    >
      {/* Category — sans-serif, small */}
      <span
        className="font-sans text-xs font-semibold text-blue-600
                       uppercase tracking-wider"
      >
        {category}
      </span>

      {/* Title — display/serif font */}
      <h2
        className="font-display text-2xl font-bold text-gray-900
                     leading-tight text-balance"
      >
        {title}
      </h2>

      {/* Excerpt — sans-serif body */}
      <p className="font-sans text-sm text-gray-500 leading-relaxed text-pretty">
        {excerpt}
      </p>

      {/* Code snippet — monospace */}
      <pre
        className="font-mono text-xs bg-gray-50 border rounded-lg
                      px-4 py-3 overflow-x-auto text-gray-700"
      >
        {snippet}
      </pre>
    </article>
  );
}
```

---

---
