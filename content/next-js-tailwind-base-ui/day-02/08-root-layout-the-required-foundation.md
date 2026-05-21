# 8 — Root Layout — The Required Foundation

---

## T — TL;DR

`src/app/layout.tsx` is the **only required file** in a Next.js 16 app. It must render `<html>` and `<body>` tags and wrap `{children}`. It is the outermost shell of every page — the place for global fonts, CSS, providers, and metadata.

---

## K — Key Concepts

### The Minimum Valid Root Layout

```tsx
// src/app/layout.tsx — REQUIRED — cannot be deleted
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

### Why `<html>` and `<body>` Must Be Here

```
In Next.js App Router:
  - Next.js does NOT inject <html> and <body> automatically
  - The root layout is responsible for these tags
  - Without them: build error
  - Only the ROOT layout includes <html> and <body>
  - Nested layouts do NOT repeat <html> and <body>
```

### The Full Production Root Layout

```tsx
// src/app/layout.tsx
import type { Metadata, Viewport } from "next";
import { Inter, Cal_Sans } from "next/font/google";
import { Toaster } from "@/components/ui/toaster";
import { Providers } from "./_providers";
import "./globals.css";

// ─── Fonts (loaded once, available globally)
const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter", // CSS variable for use in Tailwind
});

// ─── Static metadata (applies to all pages unless overridden)
export const metadata: Metadata = {
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_SITE_URL ?? "https://myapp.com"
  ),
  title: {
    template: "%s | MyApp",
    default: "MyApp — Build Better",
  },
  description: "The best app for building better things",
  keywords: ["nextjs", "react", "typescript"],
  authors: [{ name: "Mark", url: "https://myapp.com" }],
  openGraph: {
    type: "website",
    locale: "en_US",
    url: "https://myapp.com",
    siteName: "MyApp",
    images: [{ url: "/opengraph-image.png", width: 1200, height: 630 }],
  },
  twitter: {
    card: "summary_large_image",
    creator: "@myapp",
  },
  robots: {
    index: true,
    follow: true,
  },
};

// ─── Viewport (separate from metadata in Next.js 14+)
export const viewport: Viewport = {
  themeColor: "#ffffff",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

// ─── Root Layout
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      className={inter.variable}
      suppressHydrationWarning // ← prevents hydration mismatch from dark mode
    >
      <body className="min-h-screen bg-background font-sans antialiased">
        <Providers>
          {" "}
          {/* context providers (theme, auth, query) */}
          {children}
          <Toaster /> {/* global toast notification portal */}
        </Providers>
      </body>
    </html>
  );
}
```

### Providers Pattern — Keeping Root Layout Clean

```tsx
// src/app/_providers.tsx
// Client-side providers extracted to keep root layout a Server Component
"use client";

import { ThemeProvider } from "next-themes";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState } from "react";

export function Providers({ children }: { children: React.ReactNode }) {
  // QueryClient must be created with useState — one instance per user session
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: { staleTime: 60 * 1000, retry: 1 },
        },
      })
  );

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
        {children}
      </ThemeProvider>
    </QueryClientProvider>
  );
}
```

### `suppressHydrationWarning` — Why It's Needed

```tsx
// The root <html> element often gets attributes added by browser extensions
// or dark mode scripts BEFORE React hydrates — causing hydration mismatch warnings
// suppressHydrationWarning silences these expected warnings at the root level only

<html lang="en" suppressHydrationWarning>
  ← NOT the same as suppressing all hydration warnings everywhere
  ← Only suppresses warnings on the html element itself (one level deep)
  ← Still catches real hydration bugs in child components
```

### `next/font` in Root Layout

```tsx
// next/font loads fonts at build time — zero CLS, no external network request
import { Inter, Roboto_Mono } from "next/font/google";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-sans", // use as var(--font-sans) in CSS
  display: "swap", // FOIT → FOUT (better than blocking)
});

const robotoMono = Roboto_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
  display: "swap",
});

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${inter.variable} ${robotoMono.variable}`}>
      <body>{children}</body>
    </html>
  );
}
```

```css
/* globals.css — use font variables with Tailwind */
@theme {
  --font-sans: var(--font-inter);
  --font-mono: var(--font-roboto-mono);
}
```

---

## W — Why It Matters

- The root layout is the **single point of truth** for global configuration — fonts, global CSS, providers, and base metadata all live here. Getting it right prevents a class of "why is my font not loading?" and "why does my context not work?" bugs.
- The `Providers` extraction pattern is critical for Next.js architecture — context providers (TanStack Query, next-themes) require `'use client'`, but the root layout should stay a Server Component. Wrapping providers in a separate Client Component solves this.
- `suppressHydrationWarning` on `<html>` is not a hack — it's the official recommendation. Dark mode scripts and browser extensions modify the DOM before React hydrates, causing false warnings. Suppressing only at the html level is precise and safe.
- `next/font` in the root layout eliminates Cumulative Layout Shift from font loading — one of the biggest real-world CWV improvements with zero extra effort.

---

## I — Interview Q&A

### Q1: Why must the root `layout.tsx` include `<html>` and `<body>` tags?

**A:** Next.js App Router does not inject these tags automatically — the root layout is solely responsible for the full HTML document shell. Nested layouts do not add `<html>` or `<body>`. If the root layout omits them, the build fails with an error. This design gives developers full control over the `<html>` attributes (like `lang`, `dir`, dark mode classes) and `<body>` styling.

### Q2: How do you add React context providers (TanStack Query, next-themes) to a Next.js 16 app without making the root layout a Client Component?

**A:** Extract all providers into a separate `Providers` Client Component (`'use client'`), then render `<Providers>` inside the root layout. The root layout remains a Server Component — it can fetch data, access environment variables, and avoid shipping unnecessary JavaScript. The `Providers` component is the smallest possible Client Component boundary that wraps all client-side context.

### Q3: What does the `title.template` in root layout metadata do?

**A:** It defines a template string for page titles. `%s` is replaced by the title defined in each page's metadata export. For example, if `template: '%s | MyApp'` and a page exports `title: 'Products'`, the rendered `<title>` is `Products | MyApp`. The `default` value is used for any page that doesn't define its own title. This prevents every page from needing to append the site name manually.

---

## C — Common Pitfalls + Fix

### ❌ Pitfall: Putting `'use client'` on the root layout

```tsx
"use client"; // ← on root layout
export default function RootLayout({ children }) {
  return (
    <html>
      <body>{children}</body>
    </html>
  );
}
// Now the ENTIRE app tree is a Client Component boundary
// Server Components in pages cannot be truly server-rendered
// All data fetching loses server benefits
```

**Fix:** Keep root layout as a Server Component. Move any client-side code (`useState`, context) into a `_providers.tsx` Client Component.

### ❌ Pitfall: Adding `<html>` and `<body>` in nested layouts

```tsx
// src/app/dashboard/layout.tsx
export default function DashboardLayout({ children }) {
  return (
    <html>
      {" "}
      // ← WRONG — duplicate html tag
      <body>
        {" "}
        // ← WRONG — duplicate body tag
        <Sidebar />
        {children}
      </body>
    </html>
  );
}
// Result: invalid HTML — nested html/body tags
```

**Fix:** Only the root `app/layout.tsx` has `<html>` and `<body>`. Nested layouts return only the wrapper elements needed:

```tsx
export default function DashboardLayout({ children }) {
  return (
    <div className="flex">
      {" "}
      // ← correct — just the wrapper
      <Sidebar />
      <main>{children}</main>
    </div>
  );
}
```

### ❌ Pitfall: Importing `globals.css` in both root layout and individual pages

```tsx
// src/app/layout.tsx
import "./globals.css"; // ✅ correct

// src/app/products/page.tsx
import "../globals.css"; // ❌ duplicate import — double styles
```

**Fix:** Import `globals.css` **only once** in `src/app/layout.tsx`.

---

## K — Coding Challenge + Solution

### Challenge

Build a complete production-ready root layout that:

1. Stays a Server Component (no `'use client'`)
2. Loads the `Inter` font via `next/font/google`
3. Has complete static metadata (title template, description, OG, Twitter)
4. Wraps children in a `Providers` component (TanStack Query + a hypothetical ThemeProvider)
5. Includes a global `Toaster` for notifications
6. Sets `suppressHydrationWarning` correctly
7. Imports `globals.css`

### Solution

```tsx
// src/app/layout.tsx
import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import { Providers } from "./_providers";
import { Toaster } from "@/components/ui/toaster";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_SITE_URL ?? "https://myapp.com"
  ),
  title: {
    template: "%s | MyApp",
    default: "MyApp",
  },
  description: "Build better products with MyApp",
  openGraph: {
    type: "website",
    siteName: "MyApp",
    images: [{ url: "/opengraph-image.png", width: 1200, height: 630 }],
  },
  twitter: {
    card: "summary_large_image",
    creator: "@myapp",
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#0a0a0a" },
  ],
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={inter.variable} suppressHydrationWarning>
      <body className="min-h-screen bg-background font-sans antialiased">
        <Providers>
          {children}
          <Toaster />
        </Providers>
      </body>
    </html>
  );
}
```

```tsx
// src/app/_providers.tsx
"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ThemeProvider } from "@/components/theme-provider";
import { useState } from "react";

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: { staleTime: 60_000, retry: 1 },
          mutations: { retry: 0 },
        },
      })
  );

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider
        attribute="class"
        defaultTheme="system"
        enableSystem
        disableTransitionOnChange
      >
        {children}
      </ThemeProvider>
    </QueryClientProvider>
  );
}
```

---

---
