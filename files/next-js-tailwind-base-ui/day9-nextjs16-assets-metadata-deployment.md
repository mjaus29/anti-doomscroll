# 📅 Day 9 — Assets, Metadata, and Deployment Basics (Next.js 16)

> **Goal:** Master every mechanism Next.js 16 provides for fonts, images, CSS, SEO metadata, structured data, and getting an app production-ready for deployment.
> **Format:** Each subtopic = 5–15 min. Do one. Stop. Come back.
> **Prerequisite:** Day 8 complete — mutations and backend integration understood.

---

## 📋 Day 9 Subtopic Overview

| #   | Subtopic                                                               | Time   |
| --- | ---------------------------------------------------------------------- | ------ |
| 1   | Global CSS Entry Points — `globals.css`, CSS Modules, Tailwind v4      | 12 min |
| 2   | `next/font` — Google Fonts, Local Fonts, Font Optimization             | 12 min |
| 3   | `next/image` — Image Optimization, `sizes`, `priority`, `fill`         | 15 min |
| 4   | Metadata API — Static, Dynamic, `generateMetadata`                     | 12 min |
| 5   | Open Graph Images — `opengraph-image.tsx`, Dynamic OG Images           | 12 min |
| 6   | Twitter Card Images — `twitter-image.tsx`, Card Types                  | 10 min |
| 7   | `robots.txt` — Static and Dynamic Generation                           | 8 min  |
| 8   | `sitemap.xml` — Static and Dynamic Sitemap Generation                  | 12 min |
| 9   | JSON-LD — Structured Data for SEO                                      | 12 min |
| 10  | Environment Variables — `.env` Files, `NEXT_PUBLIC_`, Validation       | 12 min |
| 11  | Deployment-Ready Setup — `next.config.ts`, Health Checks, Output Modes | 15 min |

---

---

# 1 — Global CSS Entry Points — `globals.css`, CSS Modules, Tailwind v4

---

## T — TL;DR

Global styles live in `globals.css` and are imported **once** in the root layout. Component-scoped styles use **CSS Modules** (`.module.css`) for zero-runtime isolation. **Tailwind CSS v4** uses a CSS-first config — `@import "tailwindcss"` replaces `tailwind.config.js` and the old directives.

---

## K — Key Concepts

### File Structure for Styles

```
src/
├── app/
│   ├── globals.css          ← imported ONCE in layout.tsx
│   ├── layout.tsx           ← imports globals.css here
│   └── products/
│       └── page.tsx
├── components/
│   ├── button.tsx
│   └── button.module.css    ← CSS Module (scoped to button.tsx)
```

### `globals.css` — The Single Global Entry Point

```css
/* src/app/globals.css */

/* ─── 1. Tailwind v4 — replaces @tailwind directives + tailwind.config.js */
@import "tailwindcss";

/* ─── 2. Custom CSS variables (design tokens) */
:root {
  --color-brand: #2563eb;
  --color-brand-dark: #1d4ed8;
  --color-surface: #ffffff;
  --color-surface-alt: #f9fafb;
  --color-text: #111827;
  --color-text-muted: #6b7280;
  --color-border: #e5e7eb;

  --radius-sm: 0.375rem; /* 6px  */
  --radius-md: 0.5rem; /* 8px  */
  --radius-lg: 0.75rem; /* 12px */
  --radius-xl: 1rem; /* 16px */
  --radius-2xl: 1.5rem; /* 24px */

  --font-sans: var(--font-geist-sans), system-ui, sans-serif;
  --font-mono: var(--font-geist-mono), ui-monospace, monospace;
}

/* ─── 3. Dark mode tokens (CSS-based, no JS needed) */
@media (prefers-color-scheme: dark) {
  :root {
    --color-surface: #0f172a;
    --color-surface-alt: #1e293b;
    --color-text: #f8fafc;
    --color-text-muted: #94a3b8;
    --color-border: #334155;
  }
}

/* ─── 4. Global resets and base styles */
*,
*::before,
*::after {
  box-sizing: border-box;
}

html {
  -webkit-text-size-adjust: 100%;
  scroll-behavior: smooth;
}

body {
  font-family: var(--font-sans);
  color: var(--color-text);
  background-color: var(--color-surface);
  line-height: 1.5;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}

/* ─── 5. Focus-visible utility (accessibility) */
:focus-visible {
  outline: 2px solid var(--color-brand);
  outline-offset: 2px;
}

/* ─── 6. Custom Tailwind v4 utilities */
@layer utilities {
  .text-balance {
    text-wrap: balance;
  }
  .text-pretty {
    text-wrap: pretty;
  }
}
```

### Importing `globals.css` in Root Layout

```tsx
// src/app/layout.tsx
import type { Metadata } from "next";
import "./globals.css"; // ← ONLY place to import globals.css

export const metadata: Metadata = {
  title: { default: "Acme", template: "%s | Acme" },
  description: "Acme — the best product in the world",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>{children}</body>
    </html>
  );
}

// Rules:
// ✅ Import globals.css ONCE in root layout
// ❌ Never import globals.css in page.tsx, component.tsx, etc.
// ❌ Never import globals.css twice — styles will be duplicated
```

### CSS Modules — Component-Scoped Styles

```css
/* src/components/button.module.css */
/* Class names are locally scoped — no global namespace pollution */

.button {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.625rem 1.25rem;
  font-weight: 600;
  font-size: 0.875rem;
  border-radius: var(--radius-lg);
  transition: all 150ms ease;
  cursor: pointer;
}

.primary {
  background-color: var(--color-brand);
  color: white;
}

.primary:hover {
  background-color: var(--color-brand-dark);
}

.secondary {
  background-color: transparent;
  color: var(--color-text);
  border: 1px solid var(--color-border);
}

.secondary:hover {
  background-color: var(--color-surface-alt);
}

/* Compose with other modules */
.iconButton {
  composes: button; /* ← inherit base styles */
  padding: 0.5rem;
}
```

```tsx
// src/components/button.tsx
import styles from "./button.module.css"; // ← scoped className object

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary";
}

export function Button({
  variant = "primary",
  className,
  children,
  ...props
}: ButtonProps) {
  return (
    <button
      className={[
        styles.button,
        styles[variant],
        className, // ← allow Tailwind override from parent
      ]
        .filter(Boolean)
        .join(" ")}
      {...props}
    >
      {children}
    </button>
  );
}

// Generated class name: button_button__xK3mQ button_primary__2pL9R
// No collision with other .button classes anywhere in the app ✅
```

### Tailwind v4 — CSS-First Configuration

```css
/* src/app/globals.css — Tailwind v4 config lives IN CSS */
@import "tailwindcss";

/* ─── Extend Tailwind's design system in CSS, not tailwind.config.js */
@theme {
  /* Custom colors */
  --color-brand-50: #eff6ff;
  --color-brand-500: #3b82f6;
  --color-brand-600: #2563eb;
  --color-brand-900: #1e3a8a;

  /* Custom fonts */
  --font-display: var(--font-geist-sans), system-ui, sans-serif;

  /* Custom spacing */
  --spacing-18: 4.5rem;
  --spacing-128: 32rem;

  /* Custom border radius */
  --radius-4xl: 2rem;

  /* Custom breakpoints */
  --breakpoint-xs: 30rem; /* 480px */
  --breakpoint-3xl: 112rem; /* 1792px */
}

/* ─── Override default Tailwind theme values */
@theme {
  --default-font-family: var(--font-sans);
}
```

```tsx
// Tailwind v4 usage in components — same JSX syntax, new config model
export function HeroSection() {
  return (
    <section className="bg-brand-50 px-4 py-18">
      {" "}
      {/* ← custom spacing-18 */}
      <h1 className="font-display text-brand-900 text-4xl text-balance">
        Welcome to Acme
      </h1>
      <p className="text-brand-500 mt-4 text-pretty max-w-128">
        {" "}
        {/* ← custom spacing */}
        The best product in the world.
      </p>
    </section>
  );
}
```

### CSS Module + Tailwind — Mixing Both

```tsx
// ✅ CSS Modules for complex component-specific styles
// ✅ Tailwind for utility classes and layout
import styles from "./card.module.css";

export function Card({ title, body }: { title: string; body: string }) {
  return (
    // Tailwind for layout/spacing, CSS Module for component identity
    <div className={`${styles.card} p-6 rounded-2xl`}>
      <h3 className={`${styles.cardTitle} text-lg font-semibold`}>{title}</h3>
      <p className="text-gray-600 mt-2">{body}</p>
    </div>
  );
}
```

---

## W — Why It Matters

- Importing `globals.css` more than once silently duplicates all your base styles and CSS variables — the root layout is the only correct place, and Next.js enforces this through its build pipeline.
- Tailwind v4's CSS-first config (`@theme {}` in CSS) eliminates the separate `tailwind.config.js` file — all customization lives in your CSS, making the configuration co-located with the styles it affects and reducing build tooling complexity.
- CSS Modules prevent the most common CSS bug in large React apps: global class name collisions. A `.button` class in `button.module.css` and a `.button` class in `modal.module.css` are completely isolated — they compile to unique hashed names.

---

## I — Interview Q&A

### Q1: Where should global CSS be imported in a Next.js App Router project and why?

**A:** Global CSS should be imported exactly once in the root `layout.tsx`. In the App Router, CSS imported in a layout applies to all routes nested within it — importing it in the root layout means it applies globally to the entire app. Importing it in multiple files causes styles to be duplicated in the compiled output. Next.js enforces that global CSS can only be imported in `layout.tsx` or `page.tsx` files (not in components) to prevent accidental duplication.

### Q2: What is the difference between CSS Modules and Tailwind, and when should you use each?

**A:** CSS Modules are locally scoped CSS files — class names are transformed into unique hashed strings at build time, preventing global namespace collisions. They're ideal for complex component-specific styles with multiple states, animations, and pseudo-selectors that would be verbose as utility classes. Tailwind is a utility-first framework where you compose styles from atomic class names directly in JSX — no separate CSS file needed for most components. The combination is powerful: use Tailwind for layout, spacing, and typography utilities, and CSS Modules for complex component-specific styles that need isolation or are too verbose to write as utility classes.

### Q3: What changed in Tailwind CSS v4 compared to v3?

**A:** Tailwind v4 shifts from a JavaScript-based config file (`tailwind.config.js`) to a CSS-first configuration model. Instead of configuring your design system in `tailwind.config.js`, you use `@theme {}` blocks inside your CSS file to extend and override Tailwind's design tokens. The `@tailwind base/components/utilities` directives are replaced with a single `@import "tailwindcss"`. This co-locates configuration with styles, eliminates a separate config file, and enables more direct CSS integration. The utility class syntax in JSX remains unchanged.

---

## C — Common Pitfalls + Fix

### ❌ Pitfall: Importing `globals.css` in a component file

```tsx
// ❌ Importing global CSS in a component
// src/components/hero.tsx
import '../app/globals.css'   // ← duplicates ALL global styles every time Hero renders

export function Hero() { ... }
```

**Fix:** Import `globals.css` only in `layout.tsx`:

```tsx
// ✅ Only in src/app/layout.tsx
import "./globals.css";
```

### ❌ Pitfall: Using `:global` in CSS Modules to escape scope — defeating the purpose

```css
/* ❌ Escaping scope for styles that should be global */
/* button.module.css */
:global(.active) {
  background: blue; /* ← now affects ALL .active classes in the app */
}
```

**Fix:** Put truly global styles in `globals.css`, keep modules scoped:

```css
/* globals.css — for truly global classes */
.active { background: blue; }

/* button.module.css — only button-specific styles */
.button { ... }
```

---

## K — Coding Challenge + Solution

### Challenge

Set up a complete styling foundation:

1. `globals.css` with `@import "tailwindcss"`, CSS variables for 3 colors, dark mode variables, and a `text-balance` utility
2. A `card.module.css` with `.card`, `.cardTitle`, `.cardBadge` classes using the CSS variables
3. A `Card` component using both CSS Modules AND Tailwind utilities together
4. Root `layout.tsx` importing `globals.css` and no other CSS

### Solution

```css
/* src/app/globals.css */
@import "tailwindcss";

@theme {
  --color-brand-500: #3b82f6;
  --color-brand-600: #2563eb;
  --color-success: #22c55e;
  --font-sans: var(--font-geist-sans), system-ui, sans-serif;
}

:root {
  --color-surface: #ffffff;
  --color-surface-alt: #f9fafb;
  --color-text: #111827;
  --color-text-muted: #6b7280;
  --color-border: #e5e7eb;
  --color-brand: #2563eb;
}

@media (prefers-color-scheme: dark) {
  :root {
    --color-surface: #0f172a;
    --color-surface-alt: #1e293b;
    --color-text: #f8fafc;
    --color-text-muted: #94a3b8;
    --color-border: #334155;
    --color-brand: #60a5fa;
  }
}

*,
*::before,
*::after {
  box-sizing: border-box;
}

body {
  font-family: var(--font-sans);
  color: var(--color-text);
  background-color: var(--color-surface);
  -webkit-font-smoothing: antialiased;
}

:focus-visible {
  outline: 2px solid var(--color-brand);
  outline-offset: 2px;
}

@layer utilities {
  .text-balance {
    text-wrap: balance;
  }
  .text-pretty {
    text-wrap: pretty;
  }
}
```

```css
/* src/components/card/card.module.css */
.card {
  background-color: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: 1rem;
  padding: 1.5rem;
  transition:
    box-shadow 200ms ease,
    border-color 200ms ease;
}

.card:hover {
  box-shadow: 0 4px 16px -2px rgba(0, 0, 0, 0.08);
  border-color: var(--color-brand);
}

.cardTitle {
  color: var(--color-text);
  font-weight: 600;
  font-size: 1.125rem;
  line-height: 1.4;
  text-wrap: balance;
}

.cardBadge {
  display: inline-flex;
  align-items: center;
  padding: 0.25rem 0.625rem;
  border-radius: 999px;
  font-size: 0.75rem;
  font-weight: 500;
  background-color: color-mix(in srgb, var(--color-brand) 12%, transparent);
  color: var(--color-brand);
}
```

```tsx
// src/components/card/card.tsx
import styles from "./card.module.css";

interface CardProps {
  title: string;
  body: string;
  badge?: string;
  className?: string;
}

export function Card({ title, body, badge, className }: CardProps) {
  return (
    <article className={[styles.card, className].filter(Boolean).join(" ")}>
      {badge && (
        <span className={`${styles.cardBadge} mb-3 block w-fit`}>{badge}</span>
      )}
      <h3 className={styles.cardTitle}>{title}</h3>
      <p
        className="mt-2 text-sm leading-relaxed"
        style={{ color: "var(--color-text-muted)" }}
      >
        {body}
      </p>
    </article>
  );
}
```

```tsx
// src/app/layout.tsx
import type { Metadata } from "next";
import "./globals.css"; // ← ONLY import here ✅

export const metadata: Metadata = {
  title: { default: "Acme", template: "%s | Acme" },
  description: "Acme application",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>{children}</body>
    </html>
  );
}
```

---

---

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

# 3 — `next/image` — Image Optimization, `sizes`, `priority`, `fill`

---

## T — TL;DR

`next/image` automatically optimizes images: serves modern formats (WebP/AVIF), resizes to the exact display dimensions, lazy-loads off-screen images, and prevents Cumulative Layout Shift with reserved space. The three critical props to understand are `sizes`, `priority`, and `fill`.

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
      priority // ← LCP image: preload, don't lazy-load
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

### `priority` — Above-the-Fold Images

```tsx
// priority={true}:
//   → Disables lazy loading
//   → Adds <link rel="preload"> in <head>
//   → Eliminates LCP (Largest Contentful Paint) delay

// Use priority for:
// ✅ Hero images visible on first paint
// ✅ Above-the-fold product images
// ✅ Logo in the navigation
// ✅ The FIRST image in a list (rest should be lazy)

// Never use priority for:
// ❌ Images below the fold (defeats lazy loading)
// ❌ Carousel slides 2-N (only first matters)
// ❌ Images in modals or tabs

<Image
  src="/hero.jpg"
  alt="Hero"
  fill
  priority              // ← preloads this image ✅
  sizes="100vw"
/>

// Images without priority are lazy by default:
<Image
  src={product.image}
  alt={product.name}
  width={400}
  height={300}
  // ← lazy loaded by default (no priority prop needed) ✅
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
    priority                                      // ← if above fold
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
- `priority` on the LCP (Largest Contentful Paint) image is a Core Web Vitals direct improvement — it adds a `<link rel="preload">` in the HTML `<head>`, telling the browser to download the image before JavaScript runs.
- The `fill` + `relative container` pattern is how you handle images with unknown or variable dimensions — it's more flexible than specifying fixed `width` and `height`, and essential for responsive designs where images must fill their grid cells.

---

## I — Interview Q&A

### Q1: What does the `sizes` prop do in `next/image` and why is it important?

**A:** The `sizes` prop provides CSS media query hints that tell the browser what physical width the image will be at each viewport size. Next.js uses this to generate an optimal `srcset` attribute with multiple image sizes. When the browser selects which srcset entry to download, it uses `sizes` to pick the smallest image that still looks good at the current viewport. Without `sizes`, the browser conservatively downloads the largest srcset variant. Correct `sizes` can reduce image download size by 60-80% on mobile — a 400px image in a grid doesn't need to download the 1200px version.

### Q2: When should you use `priority={true}` on a `next/image`?

**A:** Use `priority` for images that are visible on the initial viewport without scrolling — particularly the Largest Contentful Paint (LCP) element. This includes hero images, above-the-fold product photos, and the first image in a list. `priority` disables lazy loading and adds a `<link rel="preload">` in the HTML head, ensuring the browser starts downloading the image before JavaScript executes. Only one or two images per page should have `priority` — adding it to all images defeats its purpose and can actually slow initial load by preloading too many assets.

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

### ❌ Pitfall: Setting `priority` on ALL images

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
      priority
    />
  ));
}
// Browser preloads 20 images simultaneously → slows initial page load ❌
```

**Fix:** Only first visible image gets `priority`:

```tsx
{
  products.map((p, index) => (
    <Image
      key={p.id}
      src={p.image}
      alt={p.name}
      width={300}
      height={300}
      priority={index === 0} // ← only first image ✅
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

1. A hero product image using `fill` in a `aspect-square` container, `priority`, and `placeholder="blur"`
2. Grid of 4 product thumbnails with correct `sizes` for a 2-col mobile / 4-col desktop grid
3. Only the first thumbnail has `priority`
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
      {/* Hero product — fill + priority + aspect-square */}
      <div className="relative aspect-square w-full max-w-md mx-auto mb-8 rounded-2xl overflow-hidden">
        <Image
          src={hero.imageUrl}
          alt={`Photo of ${hero.name}`}
          fill
          priority // ← LCP image ✅
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
                priority={index === 0} // ← only first thumbnail ✅
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

# 5 — Open Graph Images — `opengraph-image.tsx`, Dynamic OG Images

---

## T — TL;DR

Place an `opengraph-image.tsx` file in any route segment to generate that route's OG image automatically. Use the `ImageResponse` API (built on Satori) to generate PNG images from JSX at request time — no separate design tool, no static files for dynamic routes.

---

## K — Key Concepts

### Static OG Image — File Convention

```
Route segment file conventions for OG images:
  opengraph-image.png           ← static file (just drop it in)
  opengraph-image.jpg           ← static file
  opengraph-image.tsx           ← dynamic via ImageResponse
  twitter-image.png             ← static Twitter card image
  twitter-image.tsx             ← dynamic Twitter image

Placement:
  src/app/opengraph-image.png                  → applied to / (root)
  src/app/blog/opengraph-image.png             → applied to /blog
  src/app/blog/[slug]/opengraph-image.tsx      → applied to /blog/:slug (dynamic)
```

### Dynamic OG Image — `opengraph-image.tsx`

```tsx
// src/app/blog/[slug]/opengraph-image.tsx
import { ImageResponse } from "next/og";

// ─── Route segment config for the image route
export const runtime = "edge"; // ← fastest runtime for image generation
export const alt = "Blog post cover image";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

type Props = { params: Promise<{ slug: string }> };

export default async function OgImage({ params }: Props) {
  const { slug } = await params;

  // Fetch post data (runs server-side / edge)
  const post = await getPost(slug).catch(() => null);

  return new ImageResponse(
    // JSX rendered to PNG using Satori
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        justifyContent: "flex-end",
        width: "100%",
        height: "100%",
        padding: "60px",
        background: "linear-gradient(135deg, #0f172a 0%, #1e3a8a 100%)",
        fontFamily: "sans-serif",
      }}
    >
      {/* Tag */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          marginBottom: "16px",
        }}
      >
        <span
          style={{
            background: "#3b82f6",
            color: "white",
            padding: "6px 16px",
            borderRadius: "999px",
            fontSize: "14px",
            fontWeight: 600,
          }}
        >
          Acme Blog
        </span>
      </div>

      {/* Title */}
      <div
        style={{
          fontSize: "56px",
          fontWeight: 700,
          color: "white",
          lineHeight: 1.2,
          maxWidth: "900px",
        }}
      >
        {post?.title ?? "Blog Post"}
      </div>

      {/* Author + Date row */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          marginTop: "32px",
          color: "#94a3b8",
          fontSize: "18px",
        }}
      >
        <span>{post?.author ?? "Acme Team"}</span>
        <span style={{ margin: "0 12px" }}>·</span>
        <span>{post?.publishedAt ?? "2026"}</span>
      </div>

      {/* Bottom logo */}
      <div
        style={{
          position: "absolute",
          top: "48px",
          right: "60px",
          color: "white",
          fontSize: "24px",
          fontWeight: 700,
        }}
      >
        acme.com
      </div>
    </div>,
    {
      ...size,
      // Load custom fonts for OG image
      fonts: [
        {
          name: "Inter",
          data: await fetch(
            "https://fonts.gstatic.com/s/inter/v13/UcCO3FwrK3iLTeHuS_fvQtMwCp50KnMw2boKoduKmMEVuLyfAZ9hiJ-Ek-_EeA.woff"
          ).then((r) => r.arrayBuffer()),
          weight: 700,
          style: "normal",
        },
      ],
    }
  );
}
```

### Root-Level Default OG Image

```tsx
// src/app/opengraph-image.tsx
// Applied to ALL pages that don't have their own OG image

import { ImageResponse } from "next/og";

export const runtime = "edge";
export const alt = "Acme — Build better products";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function DefaultOgImage() {
  return new ImageResponse(
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        width: "100%",
        height: "100%",
        background: "#0f172a",
        fontFamily: "sans-serif",
      }}
    >
      <div
        style={{
          fontSize: "80px",
          fontWeight: 700,
          color: "white",
        }}
      >
        Acme
      </div>
      <div
        style={{
          fontSize: "28px",
          color: "#94a3b8",
          marginTop: "16px",
        }}
      >
        Build better products, faster.
      </div>
    </div>,
    { ...size }
  );
}
```

### OG Image from Route Handler (More Control)

```tsx
// src/app/api/og/route.ts
// More flexible: called as an image URL in metadata

import { ImageResponse } from "next/og";
import { NextRequest } from "next/server";

export const runtime = "edge";

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const title = searchParams.get("title") ?? "Acme";
  const type = searchParams.get("type") ?? "page";

  const colors: Record<string, string> = {
    blog: "#1e3a8a",
    product: "#14532d",
    page: "#0f172a",
  };
  const bgColor = colors[type] ?? colors.page;

  return new ImageResponse(
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        width: "100%",
        height: "100%",
        background: bgColor,
        fontFamily: "sans-serif",
        padding: "60px",
      }}
    >
      <div
        style={{
          fontSize: "60px",
          fontWeight: 700,
          color: "white",
          textAlign: "center",
        }}
      >
        {title}
      </div>
    </div>,
    { width: 1200, height: 630 }
  );
}

// Usage in generateMetadata:
// images: [{ url: `/api/og?title=${encodeURIComponent(post.title)}&type=blog` }]
```

---

## W — Why It Matters

- OG images are displayed when your links are shared on Twitter/X, LinkedIn, Slack, iMessage, and WhatsApp — they're the visual preview that makes people click. A well-designed OG image can 2-5× your click-through rate on shared links.
- The `opengraph-image.tsx` file convention is zero-config — Next.js automatically generates the correct `<meta property="og:image">` tag, sets the correct `content-type`, and handles caching. No manual metadata entry needed.
- Running OG image generation on `runtime = 'edge'` means generation happens at edge nodes globally — near-zero cold starts and fast response times for the image endpoint.

---

## I — Interview Q&A

### Q1: How does `opengraph-image.tsx` work in Next.js and what is `ImageResponse`?

**A:** `opengraph-image.tsx` is a file convention — placing it in a route segment automatically generates the OG image for that route and adds the correct `<meta property="og:image">` tag. `ImageResponse` is a class from `next/og` that renders JSX to a PNG image using Satori (a library that converts HTML/CSS to SVG, then to PNG). You write React-like JSX with inline styles, and Next.js converts it to an image at request time. The `export const size`, `export const alt`, and `export const contentType` exports configure the image metadata and dimensions.

### Q2: When would you use a Route Handler for OG images instead of `opengraph-image.tsx`?

**A:** Use a Route Handler (`/api/og/route.ts`) when you need a single image endpoint called by multiple pages with different parameters — for example, a universal `/api/og?title=Post+Title&type=blog` endpoint that generates different images based on query params, called from `generateMetadata` across many routes. Use `opengraph-image.tsx` when each route segment has its own specific image template — it's cleaner and zero-config per route. Route Handlers also give more control over cache headers, response types, and error handling.

---

## C — Common Pitfalls + Fix

### ❌ Pitfall: Using CSS class names in OG image JSX (Tailwind doesn't work here)

```tsx
// ❌ Tailwind classes do NOT work in ImageResponse JSX
return new ImageResponse(
  <div className="flex items-center bg-blue-900 text-white text-6xl font-bold">
    {title}
  </div>
);
// Satori renders JSX with inline styles only — className is ignored
```

**Fix:** Always use inline `style` props in `ImageResponse`:

```tsx
return new ImageResponse(
  <div
    style={{
      display: "flex",
      alignItems: "center",
      backgroundColor: "#1e3a8a",
      color: "white",
      fontSize: "60px",
      fontWeight: 700,
    }}
  >
    {title}
  </div>
);
```

### ❌ Pitfall: Not setting `export const runtime = 'edge'` — slow cold starts

```tsx
// ❌ Node.js runtime for image generation is slow (~500ms+ cold start)
// src/app/blog/[slug]/opengraph-image.tsx
// (no runtime export — defaults to Node.js)
```

**Fix:**

```tsx
export const runtime = "edge"; // ← ~0ms cold start for Satori image generation ✅
```

---

## K — Coding Challenge + Solution

### Challenge

Create a dynamic OG image for `/products/[id]` that:

1. Shows product name, price, and category
2. Has a colored background based on category (`shoes` = blue, `bags` = green, default = slate)
3. Shows the `acme.com` logo text in the top-right corner
4. `runtime = 'edge'`, correct `size` (1200×630), `contentType = 'image/png'`
5. Falls back gracefully if product is not found

### Solution

```tsx
// src/app/products/[id]/opengraph-image.tsx
import { ImageResponse } from "next/og";

export const runtime = "edge";
export const alt = "Product image";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const PRODUCTS = {
  p1: { name: "Air Max 90", price: 120, category: "shoes" },
  p2: { name: "Canvas Tote", price: 45, category: "bags" },
  p3: { name: "Wool Cap", price: 35, category: "accessories" },
};

const CATEGORY_COLORS: Record<string, { bg: string; accent: string }> = {
  shoes: { bg: "#1e3a8a", accent: "#3b82f6" },
  bags: { bg: "#14532d", accent: "#22c55e" },
  accessories: { bg: "#581c87", accent: "#a855f7" },
  default: { bg: "#0f172a", accent: "#64748b" },
};

type Props = { params: Promise<{ id: string }> };

export default async function ProductOgImage({ params }: Props) {
  const { id } = await params;
  const product = PRODUCTS[id as keyof typeof PRODUCTS] ?? null;
  const colors = product
    ? (CATEGORY_COLORS[product.category] ?? CATEGORY_COLORS.default)
    : CATEGORY_COLORS.default;

  return new ImageResponse(
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        width: "100%",
        height: "100%",
        background: `linear-gradient(135deg, ${colors.bg} 0%, #0f172a 100%)`,
        padding: "60px",
        fontFamily: "sans-serif",
        position: "relative",
      }}
    >
      {/* Logo — top right */}
      <div
        style={{
          position: "absolute",
          top: "48px",
          right: "60px",
          color: "rgba(255,255,255,0.6)",
          fontSize: "22px",
          fontWeight: 600,
        }}
      >
        acme.com
      </div>

      {/* Category badge */}
      {product && (
        <div
          style={{
            display: "flex",
            marginBottom: "24px",
          }}
        >
          <span
            style={{
              background: colors.accent,
              color: "white",
              padding: "6px 20px",
              borderRadius: "999px",
              fontSize: "16px",
              fontWeight: 600,
              textTransform: "capitalize",
            }}
          >
            {product.category}
          </span>
        </div>
      )}

      {/* Main content — push to bottom */}
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          marginTop: "auto",
        }}
      >
        {/* Product name */}
        <div
          style={{
            fontSize: "72px",
            fontWeight: 700,
            color: "white",
            lineHeight: 1.1,
            maxWidth: "900px",
          }}
        >
          {product?.name ?? "Product Not Found"}
        </div>

        {/* Price */}
        {product && (
          <div
            style={{
              fontSize: "36px",
              fontWeight: 600,
              color: colors.accent,
              marginTop: "20px",
            }}
          >
            ${product.price}
          </div>
        )}
      </div>
    </div>,
    { ...size }
  );
}
```

---

---

# 6 — Twitter Card Images — `twitter-image.tsx`, Card Types

---

## T — TL;DR

Twitter (X) Card images use the `twitter-image.tsx` file convention — identical to OG images but sized and configured for Twitter's card display. The `summary_large_image` card type is the standard choice for maximum visual impact.

---

## K — Key Concepts

### Twitter Card Types

```
Card types (set in metadata twitter.card):
  'summary'               → Small square thumbnail left of title + description
                            Image: 144×144 min, 1:1 ratio, < 5MB
  'summary_large_image'   → Large image above title + description (RECOMMENDED)
                            Image: 300×157 min, 2:1 ratio, < 5MB
  'app'                   → App store card (mobile apps)
  'player'                → Video/audio player card

Recommendation: 'summary_large_image' for all content pages
```

### `twitter-image.tsx` — File Convention

```tsx
// src/app/blog/[slug]/twitter-image.tsx
// Generated automatically at /blog/:slug/twitter-image.png
// Next.js adds <meta name="twitter:image"> automatically

import { ImageResponse } from "next/og";

export const runtime = "edge";
export const alt = "Blog post preview";
export const size = { width: 1200, height: 630 }; // 2:1 ratio for summary_large_image
export const contentType = "image/png";

type Props = { params: Promise<{ slug: string }> };

export default async function TwitterImage({ params }: Props) {
  const { slug } = await params;
  const post = await getPost(slug).catch(() => null);

  return new ImageResponse(
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        alignItems: "flex-start",
        width: "100%",
        height: "100%",
        background: "#0f172a",
        padding: "60px",
        fontFamily: "sans-serif",
      }}
    >
      {/* Twitter logo watermark */}
      <div
        style={{
          position: "absolute",
          top: "40px",
          right: "48px",
          color: "#1d9bf0",
          fontSize: "28px",
          fontWeight: 700,
        }}
      >
        𝕏
      </div>

      <div
        style={{
          fontSize: "48px",
          fontWeight: 700,
          color: "white",
          lineHeight: 1.3,
          maxWidth: "900px",
        }}
      >
        {post?.title ?? "Acme Blog"}
      </div>

      <div
        style={{
          fontSize: "22px",
          color: "#94a3b8",
          marginTop: "20px",
          maxWidth: "800px",
          lineHeight: 1.5,
        }}
      >
        {post?.description?.slice(0, 100) ?? ""}
      </div>
    </div>,
    { ...size }
  );
}
```

### When to Use Separate `twitter-image.tsx` vs Shared OG

```tsx
// Option A: Shared OG image for both OG and Twitter
// In metadata:
twitter: {
  card:   'summary_large_image',
  images: [{ url: '/api/og?title=Post' }]   // ← reuse OG image URL
}

// Option B: Separate twitter-image.tsx
// Use when you want different visual treatment for Twitter:
// - Twitter shows image cropped differently than LinkedIn
// - Twitter-specific branding (@handle, 𝕏 logo)
// - Different aspect ratio between OG and Twitter

// Recommendation:
// → Same image works fine for most apps (use OG URL in twitter.images)
// → Separate twitter-image.tsx for high-traffic content with Twitter-first strategy
```

### Metadata for Twitter Cards

```tsx
// src/app/blog/[slug]/page.tsx — complete Twitter metadata
export async function generateMetadata({ params }) {
  const { slug } = await params;
  const post = await getPost(slug);

  return {
    twitter: {
      card: "summary_large_image", // ← large image above text
      site: "@acmehq", // ← your account handle
      creator: "@markaustin", // ← content creator handle
      title: post?.title,
      description: post?.description?.slice(0, 200),
      images: [
        {
          url: `https://acme.com/blog/${slug}/twitter-image.png`,
          width: 1200,
          height: 630,
          alt: post?.title ?? "Acme Blog",
        },
      ],
    },
  };
}
```

---

## W — Why It Matters

- Twitter Card images are shown in tweets whenever someone shares your URL — they dramatically increase engagement. A post shared without an OG/Twitter image appears as a plain text link; with a large image card, it dominates the timeline visually.
- The `summary_large_image` card type requires a 2:1 aspect ratio (1200×630 is standard) — using the wrong dimensions causes Twitter to crop or reject the image.
- Twitter validates cards via its Card Validator — you can paste any URL at `cards-dev.twitter.com/validator` to verify your card renders correctly before publishing.

---

## I — Interview Q&A

### Q1: What is the difference between `opengraph-image.tsx` and `twitter-image.tsx`?

**A:** They use the same `ImageResponse` API and file convention, but serve different purposes. `opengraph-image.tsx` generates the `og:image` meta tag consumed by Facebook, LinkedIn, Slack, WhatsApp, iMessage, and most social platforms. `twitter-image.tsx` generates the `twitter:image` meta tag specifically for Twitter/X cards. In practice, many apps reuse the same image for both — pointing `twitter.images` to the same URL as `openGraph.images`. A separate `twitter-image.tsx` is useful when you want Twitter-specific branding or a different visual treatment for the platform.

---

## C — Common Pitfalls + Fix

### ❌ Pitfall: Wrong aspect ratio for `summary_large_image`

```tsx
// ❌ Square image (1:1) with summary_large_image card type
export const size = { width: 800, height: 800 }; // ← Twitter crops this awkwardly
```

**Fix:** Use 2:1 aspect ratio for `summary_large_image`:

```tsx
export const size = { width: 1200, height: 630 }; // ← correct 2:1 ratio ✅
```

---

## K — Coding Challenge + Solution

### Challenge

Create a `twitter-image.tsx` for the root `/` route that shows "Acme", a tagline, and a `𝕏` watermark. Use `summary_large_image` dimensions. In root layout metadata, set `twitter.card = 'summary_large_image'` and `twitter.site = '@acmehq'`.

### Solution

```tsx
// src/app/twitter-image.tsx
import { ImageResponse } from "next/og";

export const runtime = "edge";
export const alt = "Acme — Build better products, faster";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function RootTwitterImage() {
  return new ImageResponse(
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        width: "100%",
        height: "100%",
        background: "linear-gradient(135deg, #0f172a 0%, #1e3a8a 100%)",
        fontFamily: "sans-serif",
        position: "relative",
      }}
    >
      {/* 𝕏 watermark */}
      <div
        style={{
          position: "absolute",
          top: "40px",
          right: "48px",
          color: "#1d9bf0",
          fontSize: "32px",
          fontWeight: 900,
        }}
      >
        𝕏
      </div>

      <div style={{ fontSize: "88px", fontWeight: 700, color: "white" }}>
        Acme
      </div>
      <div
        style={{
          fontSize: "28px",
          color: "#94a3b8",
          marginTop: "16px",
        }}
      >
        Build better products, faster.
      </div>
    </div>,
    { ...size }
  );
}
```

---

---

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

# 10 — Environment Variables — `.env` Files, `NEXT_PUBLIC_`, Validation

---

## T — TL;DR

Environment variables in Next.js 16 follow strict rules: **only `NEXT_PUBLIC_` prefixed variables are sent to the browser** — everything else stays server-side. Use `.env.local` for secrets, validate all env vars at startup with Zod to catch missing config before runtime crashes.

---

## K — Key Concepts

### The `.env` File Hierarchy

```bash
# File load order (later files override earlier ones):
.env                 ← shared defaults (committed to git — NO secrets)
.env.local           ← local overrides (gitignored — put secrets here)
.env.development     ← loaded in development only
.env.development.local ← local development overrides (gitignored)
.env.production      ← loaded in production only
.env.production.local  ← local production overrides (gitignored)
.env.test            ← loaded in test environment

# Gitignore rule — ALWAYS gitignore .local files
# .gitignore:
*.local
```

### The Two Categories of Env Vars

```bash
# ─── Category 1: SERVER-ONLY (no NEXT_PUBLIC_ prefix)
# Available in: Server Components, Server Actions, Route Handlers, Middleware
# NOT available in: Client Components, browser console, network requests

DATABASE_URL="postgresql://user:password@localhost:5432/acme"
STRIPE_SECRET_KEY="sk_live_abc123..."
SENDGRID_API_KEY="SG.xxx..."
JWT_SECRET="my-super-secret-jwt-signing-key"
INTERNAL_API_KEY="internal-service-key"
NEXTAUTH_SECRET="random-secret-string"

# ─── Category 2: PUBLIC (NEXT_PUBLIC_ prefix)
# Available in: EVERYTHING — server AND client
# Bundled into client JavaScript — visible in browser DevTools
# NEVER put secrets here

NEXT_PUBLIC_SITE_URL="https://acme.com"
NEXT_PUBLIC_APP_VERSION="1.2.0"
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY="pk_live_abc123..."  # ← safe: publishable key
NEXT_PUBLIC_GOOGLE_ANALYTICS_ID="G-XXXXXXXXXX"
NEXT_PUBLIC_POSTHOG_KEY="phc_xxx..."
```

### `.env` File Structure — Full Example

```bash
# .env — committed to git (safe defaults, no secrets)
NODE_ENV=development
NEXT_PUBLIC_SITE_URL=http://localhost:3000
NEXT_PUBLIC_APP_NAME=Acme
NEXT_PUBLIC_APP_VERSION=1.0.0

# .env.local — gitignored (local secrets)
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/acme_dev
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
SENDGRID_API_KEY=SG.xxx...
JWT_SECRET=dev-jwt-secret-change-in-production
NEXTAUTH_SECRET=dev-nextauth-secret
NEXTAUTH_URL=http://localhost:3000

# .env.production — committed to git (production non-secrets)
NEXT_PUBLIC_SITE_URL=https://acme.com
NEXT_PUBLIC_APP_VERSION=1.2.0

# Production secrets set as environment variables in hosting platform
# (Vercel, Railway, Fly.io, etc.) — never in .env.production
```

### Env Var Validation with Zod — Catch Missing Config at Startup

```tsx
// src/lib/env.ts
// Validates ALL env vars at module load time
// If any required var is missing → server crashes with clear error at startup
// (not a cryptic TypeError deep in request handling)

import { z } from "zod";

// ─── Server-only env vars
const serverSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]),
  DATABASE_URL: z.string().url("DATABASE_URL must be a valid URL"),
  JWT_SECRET: z.string().min(32, "JWT_SECRET must be at least 32 chars"),
  STRIPE_SECRET_KEY: z
    .string()
    .startsWith("sk_", "Must be a Stripe secret key"),
  STRIPE_WEBHOOK_SECRET: z
    .string()
    .startsWith("whsec_", "Must be a Stripe webhook secret"),
  SENDGRID_API_KEY: z.string().min(1, "SENDGRID_API_KEY is required"),
  // Optional with defaults
  RATE_LIMIT_MAX: z.coerce.number().int().positive().default(100),
  LOG_LEVEL: z.enum(["debug", "info", "warn", "error"]).default("info"),
});

// ─── Public env vars (safe for client)
const clientSchema = z.object({
  NEXT_PUBLIC_SITE_URL: z.string().url(),
  NEXT_PUBLIC_APP_NAME: z.string().min(1).default("Acme"),
  NEXT_PUBLIC_APP_VERSION: z.string().default("0.0.0"),
  NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: z.string().startsWith("pk_"),
  NEXT_PUBLIC_GOOGLE_ANALYTICS_ID: z.string().optional(),
});

// ─── Validate server env (only runs server-side)
function validateServerEnv() {
  const result = serverSchema.safeParse(process.env);
  if (!result.success) {
    console.error(
      "❌ Invalid server environment variables:\n",
      result.error.flatten().fieldErrors
    );
    throw new Error("Invalid environment configuration — check server logs");
  }
  return result.data;
}

// ─── Validate client env (runs both server and client)
function validateClientEnv() {
  const result = clientSchema.safeParse({
    NEXT_PUBLIC_SITE_URL: process.env.NEXT_PUBLIC_SITE_URL,
    NEXT_PUBLIC_APP_NAME: process.env.NEXT_PUBLIC_APP_NAME,
    NEXT_PUBLIC_APP_VERSION: process.env.NEXT_PUBLIC_APP_VERSION,
    NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY:
      process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY,
    NEXT_PUBLIC_GOOGLE_ANALYTICS_ID:
      process.env.NEXT_PUBLIC_GOOGLE_ANALYTICS_ID,
  });
  if (!result.success) {
    console.error(
      "❌ Invalid public environment variables:\n",
      result.error.flatten().fieldErrors
    );
    throw new Error("Invalid public environment configuration");
  }
  return result.data;
}

// ─── Export typed env objects
// Server env: only import in server-side files
export const serverEnv =
  typeof window === "undefined"
    ? validateServerEnv()
    : ({} as ReturnType<typeof validateServerEnv>);

// Client env: safe to import anywhere
export const clientEnv = validateClientEnv();

// ─── Type exports for autocomplete
export type ServerEnv = z.infer<typeof serverSchema>;
export type ClientEnv = z.infer<typeof clientSchema>;
```

### Using Validated Env Vars

```tsx
// ─── Server-side usage (Server Component, Server Action, Route Handler)
// src/lib/db.ts
import { serverEnv } from "@/lib/env";

export const db = new PrismaClient({
  datasources: { db: { url: serverEnv.DATABASE_URL } },
});
```

```tsx
// ─── Server Action using validated env
// src/app/auth/actions.ts
"use server";

import { serverEnv } from "@/lib/env";
import { SignJWT } from "jose";

export async function createToken(userId: string) {
  return new SignJWT({ userId })
    .setProtectedHeader({ alg: "HS256" })
    .setExpirationTime("7d")
    .sign(new TextEncoder().encode(serverEnv.JWT_SECRET)); // ← typed, validated ✅
}
```

```tsx
// ─── Client Component using public env
// src/components/analytics.tsx
"use client";

import { clientEnv } from "@/lib/env";

export function Analytics() {
  // clientEnv.NEXT_PUBLIC_GOOGLE_ANALYTICS_ID is typed string | undefined ✅
  if (!clientEnv.NEXT_PUBLIC_GOOGLE_ANALYTICS_ID) return null;

  return (
    <script
      async
      src={`https://www.googletagmanager.com/gtag/js?id=${clientEnv.NEXT_PUBLIC_GOOGLE_ANALYTICS_ID}`}
    />
  );
}
```

### `server-only` Package — Prevent Secret Leaks

```tsx
// npm install server-only

// src/lib/stripe.ts — contains secret key, must never reach browser
import "server-only"; // ← build error if this file is imported in a Client Component

import Stripe from "stripe";
import { serverEnv } from "@/lib/env";

export const stripe = new Stripe(serverEnv.STRIPE_SECRET_KEY, {
  apiVersion: "2024-06-20",
});

// If a Client Component tries to import this:
// Error: You're importing a component that needs "server-only" ← build error ✅
// Prevents accidentally shipping secrets to the browser
```

### `t3-env` — Alternative Validated Env Library

```tsx
// npm install @t3-oss/env-nextjs zod
// Alternative to manual Zod validation — popular in the T3 Stack

// src/env.ts
import { createEnv } from "@t3-oss/env-nextjs";
import { z } from "zod";

export const env = createEnv({
  server: {
    DATABASE_URL: z.string().url(),
    JWT_SECRET: z.string().min(32),
    STRIPE_SECRET_KEY: z.string().startsWith("sk_"),
  },
  client: {
    NEXT_PUBLIC_SITE_URL: z.string().url(),
    NEXT_PUBLIC_APP_VERSION: z.string().default("0.0.0"),
  },
  runtimeEnv: {
    DATABASE_URL: process.env.DATABASE_URL,
    JWT_SECRET: process.env.JWT_SECRET,
    STRIPE_SECRET_KEY: process.env.STRIPE_SECRET_KEY,
    NEXT_PUBLIC_SITE_URL: process.env.NEXT_PUBLIC_SITE_URL,
    NEXT_PUBLIC_APP_VERSION: process.env.NEXT_PUBLIC_APP_VERSION,
  },
});

// Usage: env.DATABASE_URL, env.NEXT_PUBLIC_SITE_URL — fully typed ✅
```

### Environment Variable Access — Complete Reference

```tsx
// ─── Where each type is accessible
//
//                        Server    Client
// ─────────────────────────────────────────────
// DATABASE_URL           ✅        ❌
// JWT_SECRET             ✅        ❌
// NEXT_PUBLIC_SITE_URL   ✅        ✅
//
// Server Components      → process.env.DATABASE_URL ✅
// Client Components      → process.env.DATABASE_URL ❌ (undefined)
// Server Actions         → process.env.DATABASE_URL ✅
// Route Handlers         → process.env.DATABASE_URL ✅
// Middleware             → process.env.DATABASE_URL ✅
// next.config.ts         → process.env.DATABASE_URL ✅
//
// ─── Edge Runtime limitation:
// Edge Runtime does NOT support all env var access patterns
// Always test env var access in Edge Routes specifically

// ─── Build-time vs Runtime:
// NEXT_PUBLIC_ vars: inlined at BUILD TIME (static string in bundle)
//   → Changing them requires a rebuild
//   → process.env.NEXT_PUBLIC_SITE_URL === 'https://acme.com' literally in bundle
//
// Server vars: read at RUNTIME (from process.env each call)
//   → Can be changed without rebuilding (on the server)
```

---

## W — Why It Matters

- The `NEXT_PUBLIC_` prefix rule is the most common security mistake in Next.js apps — developers put `DATABASE_URL` or `STRIPE_SECRET_KEY` in a `NEXT_PUBLIC_` variable and ship their credentials to every browser. The prefix convention makes the exposure explicit.
- Validating env vars at startup (rather than discovering missing vars at runtime during a production request) is the difference between catching a deployment error in your CI/CD pipeline vs getting a 500 error for real users at 2am when a secret wasn't set.
- The `server-only` package is a zero-cost compile-time guard — it causes a build error if you accidentally import a server-side module (with secrets) into a Client Component. This is defense-in-depth: even if a developer forgets about the `NEXT_PUBLIC_` rule, the build fails before deployment.

---

## I — Interview Q&A

### Q1: What is the difference between a regular env var and a `NEXT_PUBLIC_` env var in Next.js?

**A:** Regular environment variables (without the `NEXT_PUBLIC_` prefix) are only available in server-side code — Server Components, Server Actions, Route Handlers, and Middleware. They are never included in the client-side JavaScript bundle. `NEXT_PUBLIC_` prefixed variables are inlined into the client JavaScript bundle at build time — they're accessible everywhere, including Client Components and the browser console. The practical rule: database URLs, API secret keys, JWT secrets, and anything sensitive must never have the `NEXT_PUBLIC_` prefix. Only put values in `NEXT_PUBLIC_` that you're comfortable with every user seeing in their browser DevTools.

### Q2: Why should you validate environment variables with Zod at startup rather than at the point of use?

**A:** Validating at the point of use means a missing variable causes a runtime error deep in request handling — potentially during a production request that affects a real user, at an unclear error location, possibly hours after deployment. Validating at startup (when the module is first imported or when the server starts) fails fast and visibly — the server crashes immediately with a clear error message listing exactly which variables are missing or malformed. This surfaces the issue during deployment or CI/CD, before any user traffic reaches the server, and provides an actionable error: "DATABASE_URL must be a valid URL" rather than "Cannot read properties of undefined."

### Q3: What does the `server-only` package do?

**A:** `server-only` is an npm package that, when imported at the top of a file, causes a build-time error if that file is imported in a Client Component (anything in the client bundle). It's a compile-time guard that prevents server-only code — containing secrets, database connections, or server-side APIs — from accidentally ending up in the browser bundle. You add `import 'server-only'` at the top of files like `lib/db.ts`, `lib/auth.ts`, or `lib/stripe.ts`. If a developer accidentally imports one of these files in a `'use client'` component, the build fails immediately with a clear error, before any code is deployed.

---

## C — Common Pitfalls + Fix

### ❌ Pitfall: Putting secret keys in `NEXT_PUBLIC_` variables

```bash
# ❌ THIS EXPOSES YOUR SECRET TO EVERY USER'S BROWSER
NEXT_PUBLIC_STRIPE_SECRET_KEY=sk_live_abc123...
NEXT_PUBLIC_DATABASE_URL=postgresql://user:password@db.example.com/prod
NEXT_PUBLIC_JWT_SECRET=my-super-secret-key
```

**Fix:** Remove `NEXT_PUBLIC_` from all secret values:

```bash
# ✅ Server-only secrets — never sent to browser
STRIPE_SECRET_KEY=sk_live_abc123...
DATABASE_URL=postgresql://user:password@db.example.com/prod
JWT_SECRET=my-super-secret-key

# ✅ Only PUBLIC values get NEXT_PUBLIC_
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_abc123...  # safe — publishable key
```

### ❌ Pitfall: Accessing server env vars in Client Components

```tsx
// ❌ DATABASE_URL is undefined in the browser — silently fails
"use client";
export function DataFetcher() {
  const dbUrl = process.env.DATABASE_URL; // ← undefined in browser ❌
  // No error — just silently undefined, causing subtle bugs
}
```

**Fix:** Server env vars belong exclusively in server-side code:

```tsx
// ✅ Move data fetching to a Server Component
export default async function DataPage() {
  const data = await db.item.findMany(); // uses DATABASE_URL server-side ✅
  return <DataDisplay data={data} />; // pass serialized data to client
}
```

### ❌ Pitfall: Committing `.env.local` to git

```bash
# ❌ This exposes production secrets in your git history
git add .env.local
git commit -m "add env vars"
# Now everyone with repo access has your DATABASE_URL, JWT_SECRET, etc.
```

**Fix:** Always gitignore local env files:

```bash
# .gitignore
.env*.local
.env.local
.env.production.local
.env.development.local
```

### ❌ Pitfall: Not providing a `.env.example` file for new developers

```bash
# ❌ New team member clones repo → no idea what env vars are needed
# → runtime errors with no guidance
```

**Fix:** Maintain a `.env.example` file committed to git with placeholder values:

```bash
# .env.example — committed, shows required vars with fake values
DATABASE_URL=postgresql://user:password@localhost:5432/acme_dev
JWT_SECRET=change-this-to-a-random-32-char-string
STRIPE_SECRET_KEY=sk_test_your_stripe_test_key_here
STRIPE_WEBHOOK_SECRET=whsec_your_webhook_secret_here
NEXT_PUBLIC_SITE_URL=http://localhost:3000
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_your_publishable_key_here
```

---

## K — Coding Challenge + Solution

### Challenge

Build a complete env validation setup:

1. `src/lib/env.ts` with Zod schemas for server env (`DATABASE_URL`, `JWT_SECRET`, `STRIPE_SECRET_KEY`, `NODE_ENV`) and client env (`NEXT_PUBLIC_SITE_URL`, `NEXT_PUBLIC_APP_VERSION`)
2. Clear startup error messages listing all missing/invalid vars
3. `src/lib/stripe.ts` marked `server-only` using the validated `serverEnv`
4. A `src/lib/config.ts` that exports a typed `config` object combining both for convenient access
5. `.env.example` file showing all required variables

### Solution

```tsx
// src/lib/env.ts
import { z } from "zod";

// ─── Server schema
const serverSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]),
  DATABASE_URL: z.string().url("DATABASE_URL must be a valid PostgreSQL URL"),
  JWT_SECRET: z
    .string()
    .min(32, "JWT_SECRET must be at least 32 characters for security"),
  STRIPE_SECRET_KEY: z
    .string()
    .startsWith("sk_", "STRIPE_SECRET_KEY must start with sk_")
    .min(20, "STRIPE_SECRET_KEY appears invalid — check your Stripe dashboard"),
  SENDGRID_API_KEY: z.string().optional(),
  LOG_LEVEL: z.enum(["debug", "info", "warn", "error"]).default("info"),
  RATE_LIMIT_MAX: z.coerce.number().int().positive().default(100),
});

// ─── Client schema
const clientSchema = z.object({
  NEXT_PUBLIC_SITE_URL: z
    .string()
    .url("NEXT_PUBLIC_SITE_URL must be a valid URL"),
  NEXT_PUBLIC_APP_VERSION: z.string().default("0.0.0"),
  NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: z
    .string()
    .startsWith("pk_", "Must start with pk_")
    .optional(),
  NEXT_PUBLIC_GOOGLE_ANALYTICS_ID: z
    .string()
    .regex(/^G-[A-Z0-9]+$/, "GA ID format: G-XXXXXXXXXX")
    .optional(),
});

type ServerEnv = z.infer<typeof serverSchema>;
type ClientEnv = z.infer<typeof clientSchema>;

// ─── Validation helpers
function formatErrors(errors: z.ZodError): string {
  return Object.entries(errors.flatten().fieldErrors)
    .map(([field, messages]) => `  • ${field}: ${messages?.join(", ")}`)
    .join("\n");
}

function validateServer(): ServerEnv {
  const result = serverSchema.safeParse(process.env);
  if (!result.success) {
    const msg = `\n❌ Invalid server environment variables:\n${formatErrors(result.error)}\n`;
    console.error(msg);
    throw new Error(
      "Invalid server environment — fix the variables above and restart"
    );
  }
  return result.data;
}

function validateClient(): ClientEnv {
  const result = clientSchema.safeParse({
    NEXT_PUBLIC_SITE_URL: process.env.NEXT_PUBLIC_SITE_URL,
    NEXT_PUBLIC_APP_VERSION: process.env.NEXT_PUBLIC_APP_VERSION,
    NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY:
      process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY,
    NEXT_PUBLIC_GOOGLE_ANALYTICS_ID:
      process.env.NEXT_PUBLIC_GOOGLE_ANALYTICS_ID,
  });
  if (!result.success) {
    const msg = `\n❌ Invalid public environment variables:\n${formatErrors(result.error)}\n`;
    console.error(msg);
    throw new Error("Invalid public environment — fix the variables above");
  }
  return result.data;
}

// ─── Validated, typed exports
export const serverEnv: ServerEnv =
  typeof window === "undefined" ? validateServer() : ({} as ServerEnv); // ← client-side: server vars not available

export const clientEnv: ClientEnv = validateClient();

export type { ServerEnv, ClientEnv };
```

```tsx
// src/lib/stripe.ts
import "server-only"; // ← build error if imported in Client Component ✅
import Stripe from "stripe";
import { serverEnv } from "@/lib/env";

export const stripe = new Stripe(serverEnv.STRIPE_SECRET_KEY, {
  apiVersion: "2024-06-20",
  typescript: true,
});

// If imported in 'use client' file:
// Error: You're importing a component that needs server-only ← build fails ✅
```

```tsx
// src/lib/config.ts
// Convenient typed config object combining both env schemas
import { serverEnv, clientEnv } from "@/lib/env";

export const config = {
  app: {
    name: clientEnv.NEXT_PUBLIC_APP_VERSION,
    version: clientEnv.NEXT_PUBLIC_APP_VERSION,
    url: clientEnv.NEXT_PUBLIC_SITE_URL,
    isDev: process.env.NODE_ENV === "development",
    isProd: process.env.NODE_ENV === "production",
  },
  analytics: {
    gaId: clientEnv.NEXT_PUBLIC_GOOGLE_ANALYTICS_ID,
  },
  stripe: {
    publishableKey: clientEnv.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY,
  },
} as const;

// Server config — only use in server-side files
export const serverConfig =
  typeof window === "undefined"
    ? ({
        db: {
          url: serverEnv.DATABASE_URL,
        },
        auth: {
          jwtSecret: serverEnv.JWT_SECRET,
        },
        stripe: {
          secretKey: serverEnv.STRIPE_SECRET_KEY,
        },
        logging: {
          level: serverEnv.LOG_LEVEL,
        },
        rateLimit: {
          max: serverEnv.RATE_LIMIT_MAX,
        },
      } as const)
    : null;
```

```bash
# .env.example — committed to git, shows all required variables
# Copy this file to .env.local and fill in real values

# ─── App
NODE_ENV=development
NEXT_PUBLIC_SITE_URL=http://localhost:3000
NEXT_PUBLIC_APP_VERSION=0.0.0

# ─── Database (required)
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/acme_dev

# ─── Auth (required — generate with: openssl rand -base64 32)
JWT_SECRET=change-this-to-a-random-32-character-string-minimum

# ─── Stripe (required)
STRIPE_SECRET_KEY=sk_test_your_stripe_test_secret_key_here
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_your_stripe_test_publishable_key_here

# ─── Email (optional)
SENDGRID_API_KEY=SG.your_sendgrid_api_key_here

# ─── Analytics (optional)
NEXT_PUBLIC_GOOGLE_ANALYTICS_ID=G-XXXXXXXXXX

# ─── Server config
LOG_LEVEL=debug
RATE_LIMIT_MAX=100
```

---

---

# 11 — Deployment-Ready Setup — `next.config.ts`, Health Checks, Output Modes

---

## T — TL;DR

A production-ready Next.js 16 app needs a correct `next.config.ts` (security headers, image domains, redirects), a health check endpoint, proper `output` mode for your deployment target (Vercel/Docker/static), and a pre-deployment checklist that confirms env vars, caching, and metadata are all correct.

---

## K — Key Concepts

### Complete `next.config.ts` for Production

```tsx
// next.config.ts
import type { NextConfig } from "next";

const config: NextConfig = {
  // ─── 1. Security headers — applied to ALL responses
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          // Prevents clickjacking
          { key: "X-Frame-Options", value: "DENY" },
          // Prevents MIME-type sniffing
          { key: "X-Content-Type-Options", value: "nosniff" },
          // Controls referrer information
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          // Disables browser features not needed
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=()",
          },
          // Forces HTTPS for 1 year (enable only after confirming HTTPS works)
          {
            key: "Strict-Transport-Security",
            value: "max-age=31536000; includeSubDomains",
          },
          // Basic XSS protection for older browsers
          { key: "X-XSS-Protection", value: "1; mode=block" },
        ],
      },
      // ─── CORS for API routes (adjust origin to your frontend domain)
      {
        source: "/api/(.*)",
        headers: [
          {
            key: "Access-Control-Allow-Origin",
            value: process.env.NEXT_PUBLIC_SITE_URL ?? "*",
          },
          {
            key: "Access-Control-Allow-Methods",
            value: "GET,POST,PUT,PATCH,DELETE,OPTIONS",
          },
          {
            key: "Access-Control-Allow-Headers",
            value: "Content-Type,Authorization",
          },
        ],
      },
    ];
  },

  // ─── 2. Redirects — static URL changes (no business logic)
  async redirects() {
    return [
      {
        source: "/home",
        destination: "/",
        permanent: true, // 308
      },
      {
        source: "/blog/:slug",
        destination: "/posts/:slug",
        permanent: true,
      },
    ];
  },

  // ─── 3. Rewrites — proxy and internal routing
  async rewrites() {
    return [
      // ─── Proxy to external analytics (hides vendor URL from users)
      {
        source: "/stats/:path*",
        destination: `${process.env.ANALYTICS_URL ?? "http://localhost:8888"}/:path*`,
      },
    ];
  },

  // ─── 4. Image optimization
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "cdn.acme.com",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "**.cloudinary.com",
      },
    ],
    formats: ["image/avif", "image/webp"],
    minimumCacheTTL: 60 * 60 * 24 * 365, // 1 year
    deviceSizes: [640, 750, 828, 1080, 1200, 1920],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
  },

  // ─── 5. Compiler options
  compiler: {
    // Remove console.log in production (keeps console.error/warn)
    removeConsole:
      process.env.NODE_ENV === "production"
        ? { exclude: ["error", "warn"] }
        : false,
  },

  // ─── 6. Experimental (Next.js 16 features)
  experimental: {
    // Partial Prerendering (PPR) — static shell + dynamic streaming
    ppr: "incremental", // opt-in per route
    // React compiler optimization
    reactCompiler: true,
    // Typed routes (prevents typos in href)
    typedRoutes: true,
  },

  // ─── 7. TypeScript and ESLint — never fail build on errors in CI
  // (fix errors before enabling these)
  typescript: {
    // ignoreBuildErrors: true  // ← only use as temporary escape hatch
  },

  // ─── 8. Bundle analysis (enable temporarily to audit bundle size)
  // Use: ANALYZE=true next build
  ...(process.env.ANALYZE === "true" &&
    {
      // npm install @next/bundle-analyzer
      // const withBundleAnalyzer = require('@next/bundle-analyzer')({ enabled: true })
    }),

  // ─── 9. PoweredByHeader — remove "X-Powered-By: Next.js" header
  poweredByHeader: false,

  // ─── 10. Trailing slash — pick one and be consistent
  trailingSlash: false,

  // ─── 11. Output mode — see section below
  // output: 'standalone',   // ← for Docker
  // output: 'export',       // ← for pure static (no server features)
};

export default config;
```

### Output Modes — Vercel vs Docker vs Static

```tsx
// ─── MODE 1: Default (Vercel, Netlify, Railway)
// No 'output' config needed — Next.js handles it automatically
// Supports all features: SSR, ISR, Server Actions, Route Handlers
const config: NextConfig = {
  // No output field — default mode
};

// ─── MODE 2: Standalone (Docker, self-hosted VMs, Fly.io)
// Copies only the files needed to run the app into .next/standalone
// Greatly reduces Docker image size (no node_modules duplication)
const config: NextConfig = {
  output: "standalone",
  // After build: .next/standalone contains everything needed to run
  // Dockerfile copies .next/standalone + .next/static + public/
};

// ─── MODE 3: Static Export (GitHub Pages, S3, CDN-only)
// Pre-renders ALL routes as static HTML — no server at runtime
// LIMITATIONS: no Server Actions, no Route Handlers, no ISR, no cookies()
const config: NextConfig = {
  output: "export",
  trailingSlash: true, // Required for static hosting compatibility
  images: {
    unoptimized: true, // Required — no server for image optimization
  },
};
// Build: next build → generates /out directory
// Serve: any static file server (nginx, S3, GitHub Pages)
```

### Health Check Endpoint — Required for Production

```tsx
// src/app/api/health/route.ts
// Called by load balancers, container orchestrators (Kubernetes),
// uptime monitors, and deployment pipelines to verify the app is alive

import { NextResponse } from "next/server";

export const runtime = "edge"; // ← fastest, no cold start
export const dynamic = "force-dynamic"; // ← always live check

interface HealthStatus {
  status: "ok" | "degraded" | "error";
  version: string;
  timestamp: string;
  checks: Record<string, "ok" | "error" | "skip">;
}

export async function GET() {
  const checks: HealthStatus["checks"] = {};
  let overallStatus: HealthStatus["status"] = "ok";

  // ─── Check: database connectivity (skip in Edge runtime)
  // In Node.js runtime you could do:
  // try {
  //   await db.$queryRaw`SELECT 1`
  //   checks.database = 'ok'
  // } catch {
  //   checks.database = 'error'
  //   overallStatus   = 'degraded'
  // }
  checks.database = "skip"; // ← Edge runtime can't reach DB directly

  // ─── Check: environment variables present
  checks.env = process.env.NEXT_PUBLIC_SITE_URL ? "ok" : "error";
  if (checks.env === "error") overallStatus = "degraded";

  const body: HealthStatus = {
    status: overallStatus,
    version: process.env.NEXT_PUBLIC_APP_VERSION ?? "0.0.0",
    timestamp: new Date().toISOString(),
    checks,
  };

  return NextResponse.json(body, {
    status: overallStatus === "ok" ? 200 : 503,
    headers: {
      "Cache-Control": "no-store, no-cache, must-revalidate",
      "X-Health-Check": "true",
    },
  });
}

/*
  Usage:
  → Load balancer: GET /api/health → 200 OK = healthy, 503 = unhealthy
  → Kubernetes liveness probe: /api/health
  → Uptime monitor (UptimeRobot, Pingdom): /api/health
  → Deployment pipeline verification: curl https://acme.com/api/health
*/
```

### Dockerfile for Standalone Output

```dockerfile
# Dockerfile — uses 'output: standalone' for minimal image size

# ─── Stage 1: Dependencies
FROM node:22-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --ignore-scripts

# ─── Stage 2: Builder
FROM node:22-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Build args for NEXT_PUBLIC_ vars (must be provided at build time)
ARG NEXT_PUBLIC_SITE_URL
ARG NEXT_PUBLIC_APP_VERSION
ENV NEXT_PUBLIC_SITE_URL=$NEXT_PUBLIC_SITE_URL
ENV NEXT_PUBLIC_APP_VERSION=$NEXT_PUBLIC_APP_VERSION

RUN npm run build

# ─── Stage 3: Runner (production image — minimal)
FROM node:22-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000

# Non-root user for security
RUN addgroup --system --gid 1001 nodejs
RUN adduser  --system --uid 1001 nextjs

# Copy ONLY what's needed from standalone output
COPY --from=builder /app/public          ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static    ./.next/static
# ↑ These three copies are the entire production app

USER nextjs

EXPOSE 3000

CMD ["node", "server.js"]
```

### Pre-Deployment Checklist

```tsx
// src/scripts/pre-deploy-check.ts
// Run before deploying: npx tsx src/scripts/pre-deploy-check.ts

const REQUIRED_ENV_VARS = [
  "DATABASE_URL",
  "JWT_SECRET",
  "STRIPE_SECRET_KEY",
  "NEXT_PUBLIC_SITE_URL",
  "NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY",
];

const REQUIRED_PUBLIC_VARS = ["NEXT_PUBLIC_SITE_URL"];

let passed = 0;
let failed = 0;
let warnings = 0;

function check(
  name: string,
  condition: boolean,
  message: string,
  warn = false
) {
  if (condition) {
    console.log(`  ✅ ${name}`);
    passed++;
  } else if (warn) {
    console.warn(`  ⚠️  ${name}: ${message}`);
    warnings++;
  } else {
    console.error(`  ❌ ${name}: ${message}`);
    failed++;
  }
}

console.log("\n🚀 Pre-deployment checks\n");

// ─── Environment variables
console.log("Environment variables:");
for (const varName of REQUIRED_ENV_VARS) {
  check(varName, Boolean(process.env[varName]), `${varName} is not set`);
}

// ─── Production checks
console.log("\nProduction configuration:");
check(
  "NODE_ENV is production",
  process.env.NODE_ENV === "production",
  'NODE_ENV should be "production" in deployment',
  true
);
check(
  "NEXT_PUBLIC_SITE_URL is not localhost",
  !process.env.NEXT_PUBLIC_SITE_URL?.includes("localhost"),
  "NEXT_PUBLIC_SITE_URL still points to localhost"
);
check(
  "Stripe key is live (not test)",
  !process.env.STRIPE_SECRET_KEY?.includes("test"),
  "Still using Stripe test key in production",
  true // warning only — test keys valid in staging
);
check(
  "JWT_SECRET is long enough",
  (process.env.JWT_SECRET?.length ?? 0) >= 32,
  "JWT_SECRET should be at least 32 characters"
);

console.log(`\n${passed} passed · ${warnings} warnings · ${failed} failed\n`);

if (failed > 0) {
  console.error(
    "❌ Pre-deployment checks FAILED — fix errors before deploying\n"
  );
  process.exit(1);
}
if (warnings > 0) {
  console.warn("⚠️  Pre-deployment checks passed with warnings\n");
}
```

### `package.json` Scripts for Production

```json
{
  "scripts": {
    "dev": "next dev --turbo",
    "build": "next build",
    "start": "next start",
    "lint": "next lint",
    "type-check": "tsc --noEmit",
    "pre-deploy": "npx tsx src/scripts/pre-deploy-check.ts",
    "deploy": "npm run type-check && npm run lint && npm run build",
    "analyze": "ANALYZE=true next build",
    "docker:build": "docker build -t acme-app --build-arg NEXT_PUBLIC_SITE_URL=$NEXT_PUBLIC_SITE_URL .",
    "docker:run": "docker run -p 3000:3000 --env-file .env.production acme-app"
  }
}
```

### Vercel-Specific Setup — `vercel.json`

```json
{
  "framework": "nextjs",
  "buildCommand": "npm run build",
  "devCommand": "npm run dev",
  "installCommand": "npm ci",

  "regions": ["iad1"],

  "functions": {
    "app/api/ai/**": {
      "maxDuration": 300
    },
    "app/api/pdf/**": {
      "maxDuration": 60
    }
  },

  "headers": [
    {
      "source": "/(.*)",
      "headers": [
        { "key": "X-Frame-Options", "value": "DENY" },
        { "key": "X-Content-Type-Options", "value": "nosniff" }
      ]
    }
  ],

  "crons": [
    {
      "path": "/api/cron/revalidate",
      "schedule": "0 */6 * * *"
    }
  ]
}
```

---

## W — Why It Matters

- `output: 'standalone'` can reduce a Docker image from 2GB+ to under 200MB — it copies only the files Next.js actually needs to run, without `node_modules` duplicates. This directly impacts deployment speed, cold start times, and container registry storage costs.
- Security headers in `next.config.ts` apply globally to every response — X-Frame-Options prevents your app from being embedded in iframes (clickjacking), X-Content-Type-Options prevents MIME sniffing attacks, and Strict-Transport-Security ensures browsers always use HTTPS. These require no code changes beyond the config.
- The health check endpoint is required infrastructure for any containerized deployment — without it, Kubernetes can't determine if a pod is alive, load balancers can't route away from crashed instances, and deployment pipelines can't verify a new release is working before shifting traffic.

---

## I — Interview Q&A

### Q1: What is `output: 'standalone'` and when should you use it?

**A:** `output: 'standalone'` is a Next.js build option that creates a self-contained directory (`.next/standalone`) containing only the files needed to run the application — the Next.js server, compiled code, and minimal dependencies. It traces which `node_modules` files are actually used and copies only those, eliminating unused packages. This dramatically reduces the final artifact size for Docker deployments — often from 2GB+ to under 200MB. Use it for any self-hosted deployment: Docker, Kubernetes, Fly.io, Railway, or any VM. Do not use it for Vercel (handled automatically) or static export (`output: 'export'`).

### Q2: What security headers should every Next.js app set and what does each do?

**A:** The essential security headers are: `X-Frame-Options: DENY` prevents the page from being embedded in iframes, blocking clickjacking attacks; `X-Content-Type-Options: nosniff` prevents browsers from guessing content types, blocking MIME-type confusion attacks; `Referrer-Policy: strict-origin-when-cross-origin` controls how much referrer information is sent with requests; `Permissions-Policy` disables browser features your app doesn't use (camera, microphone, geolocation); `Strict-Transport-Security` forces HTTPS for a year after the first visit; `X-XSS-Protection: 1; mode=block` adds basic XSS filtering in older browsers. All are set in `next.config.ts`'s `headers()` function and apply to every response without code changes in individual routes.

### Q3: What is the difference between `output: 'standalone'` and `output: 'export'`?

**A:** `output: 'standalone'` produces a Node.js server that runs Next.js — it supports all features: Server Components, Server Actions, Route Handlers, ISR, cookies, and headers. It's a server application that happens to be bundled efficiently. `output: 'export'` produces static HTML/CSS/JS files with no server — it pre-renders all routes at build time and generates files that can be served from any static file host (S3, GitHub Pages, nginx). The tradeoff: static export is simpler and cheaper to host but has major limitations — no Server Actions, no Route Handlers, no `cookies()` or `headers()`, no ISR, no dynamic routes unless you provide `generateStaticParams`. Choose `standalone` for most apps, `export` only for purely static content sites.

---

## C — Common Pitfalls + Fix

### ❌ Pitfall: Using `output: 'export'` and expecting Server Actions to work

```tsx
// ❌ output: 'export' does not support Server Actions
// next.config.ts
const config: NextConfig = { output: "export" };

// src/app/contact/actions.ts
("use server");
export async function submitForm(formData: FormData) {
  await sendEmail(formData); // ← throws at build time:
} // "Server Actions are not supported with static export"
```

**Fix:** Use `output: 'standalone'` for apps with Server Actions:

```tsx
const config: NextConfig = {
  output: "standalone", // ← supports Server Actions ✅
};
// OR remove output entirely for Vercel deployment
```

### ❌ Pitfall: Forgetting to copy `.next/static` and `public/` in Dockerfile with standalone

```dockerfile
# ❌ Missing static assets — app runs but all CSS, JS, and images 404
FROM node:22-alpine
WORKDIR /app
COPY --from=builder /app/.next/standalone ./
# ← missing: .next/static and public/
CMD ["node", "server.js"]
# CSS files 404, images broken, app partially broken
```

**Fix:** Copy all three required directories:

```dockerfile
# ✅ All three required
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static     ./.next/static   # ← CSS, JS chunks ✅
COPY --from=builder /app/public           ./public          # ← images, fonts ✅
```

### ❌ Pitfall: Not removing `console.log` statements in production

```tsx
// ❌ console.log with sensitive data ends up in production logs
console.log("User logged in:", { userId, email, ipAddress });
console.log("DB query result:", JSON.stringify(userData));
// → Exposes user data in server logs → compliance/GDPR issues
```

**Fix:** Use `removeConsole` in `next.config.ts` and a structured logger:

```tsx
// next.config.ts
compiler: {
  removeConsole: process.env.NODE_ENV === "production"
    ? { exclude: ["error", "warn"] } // ← removes log/debug in prod ✅
    : false;
}
// Or use pino/winston for structured logging with log levels
```

### ❌ Pitfall: `NEXT_PUBLIC_` vars changing after build without rebuild

```bash
# ❌ NEXT_PUBLIC_ vars are baked into the bundle at build time
# Changing them in your hosting platform does NOT take effect immediately

# Initial build with:
NEXT_PUBLIC_SITE_URL=https://staging.acme.com

# Later you change in Vercel dashboard:
NEXT_PUBLIC_SITE_URL=https://acme.com

# The old value is still in the bundle until you redeploy
```

**Fix:** Always trigger a new build when changing `NEXT_PUBLIC_` vars. Server-only vars (without `NEXT_PUBLIC_`) are read at runtime and take effect without a rebuild:

```bash
# Server-only vars → no rebuild needed (read from process.env at request time)
DATABASE_URL=postgresql://new-db.example.com/acme

# NEXT_PUBLIC_ vars → ALWAYS requires a new build
NEXT_PUBLIC_SITE_URL=https://acme.com   # ← new build required ✅
```

---

## K — Coding Challenge + Solution

### Challenge

Build a production-ready Next.js 16 setup:

1. Complete `next.config.ts` with security headers, image config, `poweredByHeader: false`, and `output: 'standalone'`
2. `GET /api/health` Route Handler returning `{ status, version, timestamp, uptime }` with `no-store` cache and correct 200/503 status
3. `GET /api/version` Route Handler returning app version and build info
4. `package.json` scripts: `build`, `deploy` (type-check + lint + build), `docker:build`, `docker:run`
5. A `Dockerfile` using multi-stage build with standalone output

### Solution

```tsx
// next.config.ts
import type { NextConfig } from "next";

const config: NextConfig = {
  output: "standalone",
  poweredByHeader: false,
  trailingSlash: false,

  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=()",
          },
          { key: "X-XSS-Protection", value: "1; mode=block" },
          ...(process.env.NODE_ENV === "production"
            ? [
                {
                  key: "Strict-Transport-Security",
                  value: "max-age=31536000; includeSubDomains",
                },
              ]
            : []),
        ],
      },
      {
        source: "/api/(.*)",
        headers: [
          {
            key: "Access-Control-Allow-Origin",
            value: process.env.NEXT_PUBLIC_SITE_URL ?? "*",
          },
          {
            key: "Access-Control-Allow-Methods",
            value: "GET,POST,PUT,PATCH,DELETE,OPTIONS",
          },
          {
            key: "Access-Control-Allow-Headers",
            value: "Content-Type,Authorization",
          },
        ],
      },
    ];
  },

  images: {
    remotePatterns: [
      { protocol: "https", hostname: "cdn.acme.com", pathname: "/**" },
      { protocol: "https", hostname: "**.cloudinary.com", pathname: "/**" },
    ],
    formats: ["image/avif", "image/webp"],
    minimumCacheTTL: 60 * 60 * 24 * 365,
  },

  compiler: {
    removeConsole:
      process.env.NODE_ENV === "production"
        ? { exclude: ["error", "warn"] }
        : false,
  },

  experimental: {
    ppr: "incremental",
    reactCompiler: true,
    typedRoutes: true,
  },
};

export default config;
```

```tsx
// src/app/api/health/route.ts
import { NextResponse } from "next/server";

export const runtime = "edge";
export const dynamic = "force-dynamic";

const START_TIME = Date.now();

interface HealthResponse {
  status: "ok" | "degraded" | "error";
  version: string;
  timestamp: string;
  uptimeSec: number;
  env: string;
  checks: {
    env: "ok" | "error";
    memory?: "ok" | "warn" | "skip";
  };
}

export async function GET() {
  const checks: HealthResponse["checks"] = {
    env: "ok",
    memory: "skip", // Edge runtime has no process.memoryUsage()
  };
  let status: HealthResponse["status"] = "ok";

  // Check: required public env vars are set
  if (!process.env.NEXT_PUBLIC_SITE_URL) {
    checks.env = "error";
    status = "degraded";
  }

  const body: HealthResponse = {
    status,
    version: process.env.NEXT_PUBLIC_APP_VERSION ?? "0.0.0",
    timestamp: new Date().toISOString(),
    uptimeSec: Math.floor((Date.now() - START_TIME) / 1000),
    env: process.env.NODE_ENV ?? "unknown",
    checks,
  };

  return NextResponse.json(body, {
    status: status === "ok" ? 200 : 503,
    headers: {
      "Cache-Control": "no-store, no-cache, must-revalidate",
      Pragma: "no-cache",
    },
  });
}
```

```tsx
// src/app/api/version/route.ts
import { NextResponse } from "next/server";

export const runtime = "edge";
export const dynamic = "force-static"; // ← version never changes at runtime

export async function GET() {
  return NextResponse.json(
    {
      version: process.env.NEXT_PUBLIC_APP_VERSION ?? "0.0.0",
      nodeVersion: process.version,
      environment: process.env.NODE_ENV,
      siteUrl: process.env.NEXT_PUBLIC_SITE_URL,
      buildTime: new Date().toISOString(),
    },
    {
      headers: {
        "Cache-Control": "public, s-maxage=86400", // ← cache version for 24h
      },
    }
  );
}
```

```json
{
  "name": "acme",
  "version": "1.0.0",
  "scripts": {
    "dev": "next dev --turbo",
    "build": "next build",
    "start": "next start",
    "lint": "next lint",
    "type-check": "tsc --noEmit",
    "deploy": "npm run type-check && npm run lint && npm run build",
    "analyze": "ANALYZE=true next build",
    "docker:build": "docker build -t acme-app --build-arg NEXT_PUBLIC_SITE_URL=${NEXT_PUBLIC_SITE_URL:-https://acme.com} --build-arg NEXT_PUBLIC_APP_VERSION=${npm_package_version} .",
    "docker:run": "docker run -p 3000:3000 --env-file .env.production.local acme-app",
    "docker:push": "docker tag acme-app registry.acme.com/acme-app:latest && docker push registry.acme.com/acme-app:latest"
  }
}
```

```dockerfile
# Dockerfile
# Multi-stage build using output: 'standalone'

# ─── Stage 1: Install dependencies
FROM node:22-alpine AS deps
WORKDIR /app

# Copy package files only — cache this layer
COPY package.json package-lock.json ./
RUN npm ci --ignore-scripts --prefer-offline

# ─── Stage 2: Build the app
FROM node:22-alpine AS builder
WORKDIR /app

# Copy deps from stage 1
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# NEXT_PUBLIC_ vars must be provided at build time (inlined into bundle)
ARG NEXT_PUBLIC_SITE_URL=https://acme.com
ARG NEXT_PUBLIC_APP_VERSION=0.0.0
ARG NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY

ENV NEXT_PUBLIC_SITE_URL=$NEXT_PUBLIC_SITE_URL
ENV NEXT_PUBLIC_APP_VERSION=$NEXT_PUBLIC_APP_VERSION
ENV NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=$NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY
ENV NEXT_TELEMETRY_DISABLED=1
ENV NODE_ENV=production

RUN npm run build

# ─── Stage 3: Production runner (minimal image)
FROM node:22-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

# Security: run as non-root user
RUN addgroup --system --gid 1001 nodejs \
 && adduser  --system --uid 1001 nextjs

# Copy ONLY the three required outputs from standalone build
COPY --from=builder --chown=nextjs:nodejs /app/public          ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static     ./.next/static

USER nextjs
EXPOSE 3000

# server.js is generated by output: 'standalone'
CMD ["node", "server.js"]

# Build: docker build -t acme-app \
#          --build-arg NEXT_PUBLIC_SITE_URL=https://acme.com \
#          --build-arg NEXT_PUBLIC_APP_VERSION=1.0.0 .
#
# Run:   docker run -p 3000:3000 \
#          -e DATABASE_URL=postgresql://... \
#          -e JWT_SECRET=... \
#          acme-app
```

---

## ✅ Day 9 Complete — Assets, Metadata, and Deployment Basics

| #   | Subtopic                                                               | Status |
| --- | ---------------------------------------------------------------------- | ------ |
| 1   | Global CSS Entry Points — `globals.css`, CSS Modules, Tailwind v4      | ☐      |
| 2   | `next/font` — Google Fonts, Local Fonts, Font Optimization             | ☐      |
| 3   | `next/image` — Image Optimization, `sizes`, `priority`, `fill`         | ☐      |
| 4   | Metadata API — Static, Dynamic, `generateMetadata`                     | ☐      |
| 5   | Open Graph Images — `opengraph-image.tsx`, Dynamic OG Images           | ☐      |
| 6   | Twitter Card Images — `twitter-image.tsx`, Card Types                  | ☐      |
| 7   | `robots.txt` — Static and Dynamic Generation                           | ☐      |
| 8   | `sitemap.xml` — Static and Dynamic Sitemap Generation                  | ☐      |
| 9   | JSON-LD — Structured Data for SEO                                      | ☐      |
| 10  | Environment Variables — `.env` Files, `NEXT_PUBLIC_`, Validation       | ☐      |
| 11  | Deployment-Ready Setup — `next.config.ts`, Health Checks, Output Modes | ☐      |

---

## 🗺️ The One-Page Mental Model — Everything From Day 9

```
CSS ARCHITECTURE
  globals.css:       @import "tailwindcss" + @theme {} + :root CSS vars
                     Import ONCE in root layout.tsx — never in components
  @theme {}:         Tailwind v4 config (replaces tailwind.config.js)
                     Custom colors, fonts, spacing, breakpoints
  CSS Modules:       .module.css → locally scoped hashed class names
                     No global collisions, use composes: for inheritance
  Mixing:            Tailwind for utilities + CSS Modules for complex components

FONTS (next/font)
  Google:            import { Inter } from 'next/font/google'
  Local:             import localFont from 'next/font/local'
  Options:           subsets, variable (CSS var), display, weight, style
  Apply to:          <html className={font.variable}> (not body)
  Tailwind:          @theme { --font-sans: var(--font-inter), system-ui }
  display:           'swap' (always visible) | 'optional' (no CLS)
  Rule:              NEVER instantiate inside a component — module level only

IMAGES (next/image)
  Required props:    src, alt + (width+height OR fill)
  sizes:             MOST IMPORTANT perf prop — tells browser what CSS width
                     '(max-width: 640px) 100vw, 50vw'
  priority:          Only for above-fold LCP image — adds <link rel="preload">
                     One or two per page max
  fill:              Fills parent (must have position:relative on parent)
                     Always pair with object-cover/contain class
  placeholder:       'blur' (local: automatic, remote: blurDataURL needed)
  remotePatterns:    Required in next.config.ts for external image domains
  formats:           ['image/avif', 'image/webp'] in next.config.ts

METADATA API
  Static:            export const metadata: Metadata = { title, description, ... }
  Dynamic:           export async function generateMetadata({ params }): Promise<Metadata>
  title.template:    '%s | Acme' → fills %s with child title
  title.absolute:    Ignores parent template
  viewport:          Separate export — NOT inside metadata object
  Deduplicate:       React.cache() between generateMetadata + page component
  canonical:         alternates.canonical → prevent duplicate content
  metadataBase:      new URL('https://acme.com') → resolves relative image URLs

OG IMAGES
  File convention:   opengraph-image.tsx in any route segment
  Exports:           runtime='edge', alt, size={1200,630}, contentType='image/png'
  API:               ImageResponse from 'next/og' — JSX → PNG via Satori
  Styles:            INLINE ONLY (no Tailwind classes — Satori doesn't support them)
  Route Handler:     /api/og?title=X — universal endpoint called from metadata
  twitter-image.tsx: Same API, separate file for Twitter-specific images
  Twitter card:      summary_large_image → 1200×630 (2:1 ratio)

ROBOTS.TXT
  Static:            public/robots.txt — for simple, never-changing rules
  Dynamic:           src/app/robots.ts → MetadataRoute.Robots
  Always include:    Disallow /api/, /dashboard/, /admin/, /_next/
  Always block:      Non-production environments: disallow: '/'
  Always add:        Sitemap: https://acme.com/sitemap.xml

SITEMAP.XML
  Dynamic:           src/app/sitemap.ts → MetadataRoute.Sitemap
  ISR:               export const revalidate = 3600 ← regenerate hourly
  Include only:      Public, indexable URLs (never /api/, /dashboard/)
  Fields:            url, lastModified, changeFrequency, priority
  Limit:             50,000 URLs per sitemap → use sitemap index for larger

JSON-LD
  Add via:           <script type="application/ld+json" dangerouslySetInnerHTML />
  Location:          In Server Component JSX (NOT in metadata object)
  Sanitize:          replace </> with Unicode escapes to prevent XSS
  Common types:      Product, Article, BreadcrumbList, FAQPage, Organization
  Multiple schemas:  Multiple <script> tags on same page — fine ✅
  Validates:         schema-dts for TypeScript types
  Rich results:      Product → price/stars in Google, FAQPage → accordion in SERP

ENVIRONMENT VARIABLES
  Server only:       DATABASE_URL, JWT_SECRET, STRIPE_SECRET_KEY
                     Available: Server Components, Actions, Route Handlers
                     NOT available: Client Components, browser
  Public:            NEXT_PUBLIC_SITE_URL, NEXT_PUBLIC_APP_VERSION
                     Available: EVERYWHERE (bundled into client JS)
  Rule:              NEVER put secrets in NEXT_PUBLIC_ vars
  Files:             .env (committed) → .env.local (gitignored, secrets)
  Validate:          Zod at startup → crashes with clear error at deploy time
  server-only:       import 'server-only' → build error if imported on client
  NEXT_PUBLIC_ vars: Inlined at BUILD TIME → changing requires rebuild

DEPLOYMENT
  output modes:
    (default)        → Vercel/Netlify — full features, auto-handled
    'standalone'     → Docker/VMs — minimal bundle, copies only needed files
    'export'         → Static HTML — no server features (no Actions/Handlers/ISR)
  Dockerfile:        3 stages: deps → builder → runner
                     COPY standalone + .next/static + public (all three required)
                     Non-root user (nextjs:nodejs)
  next.config.ts:    poweredByHeader:false, security headers, image remotePatterns
  Health check:      GET /api/health → { status, version, timestamp, uptimeSec }
                     200=ok, 503=degraded — required for load balancers/k8s
  Security headers:  X-Frame-Options, X-Content-Type-Options, Referrer-Policy,
                     Permissions-Policy, HSTS (all in next.config.ts headers())
  Pre-deploy:        type-check + lint + env validation + build
  removeConsole:     Compiler option removes console.log in production builds
```

---

> **Your next action:** Open `next.config.ts` in your project. Add `poweredByHeader: false` and the five security headers (`X-Frame-Options`, `X-Content-Type-Options`, `Referrer-Policy`, `Permissions-Policy`, `X-XSS-Protection`) to the `headers()` function. Run `next build` and verify the build passes. Then visit any page in your browser DevTools → Network → Response Headers and confirm the headers appear.
>
> _Doing one small thing beats opening a feed._
