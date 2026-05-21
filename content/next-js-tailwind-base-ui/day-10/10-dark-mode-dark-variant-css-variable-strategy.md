# 10 — Dark Mode — `dark:` Variant, CSS Variable Strategy

---

## T — TL;DR

Tailwind's `dark:` variant applies styles when dark mode is active. In v4.3, dark mode is configured via the `@variant dark` rule in CSS — supporting `prefers-color-scheme`, class-based, and attribute-based strategies. The **CSS variable strategy** is the cleanest approach: define tokens in `:root` and override them in `dark:`, then use those variables in your Tailwind utilities.

---

## K — Key Concepts

### Dark Mode Strategies in Tailwind v4.3

```css
/* globals.css */
@import "tailwindcss";

/* ─── Strategy 1: Media query (automatic, no JS needed) */
/* This is the DEFAULT in v4 — no extra config needed */
/* @variant dark (&:where(.dark, .dark *)); — NOT needed for media strategy */

/* ─── Strategy 2: Class-based (requires adding .dark to <html>) */
@variant dark (&:where(.dark, .dark *));
/* In your app: document.documentElement.classList.toggle('dark') */

/* ─── Strategy 3: Data-attribute-based */
@variant dark (&:where([data-theme=dark], [data-theme=dark] *));
/* In your app: document.documentElement.setAttribute('data-theme', 'dark') */
```

```tsx
// For class-based dark mode in Next.js layout:
// src/app/layout.tsx
export default function RootLayout({ children }) {
  return (
    // Add class="dark" to enable dark mode
    // In practice: controlled by a ThemeProvider
    <html lang="en" suppressHydrationWarning>
      <body>{children}</body>
    </html>
  );
}
```

### `dark:` Variant — Basic Usage

```tsx
{/* ─── Every utility can be prefixed with dark: */}
<div className="bg-white dark:bg-gray-900">
<p  className="text-gray-900 dark:text-white">
<p  className="text-gray-600 dark:text-gray-400">
<div className="border border-gray-200 dark:border-gray-700">
<div className="bg-gray-50 dark:bg-gray-800">

{/* ─── Combined with responsive and state variants */}
<button className="bg-blue-600 dark:bg-blue-500
                   hover:bg-blue-700 dark:hover:bg-blue-400
                   text-white transition-colors">
  Button
</button>

{/* ─── Shadow in dark mode */}
<div className="shadow-md dark:shadow-none dark:ring-1 dark:ring-gray-700">
  {/* Light: use shadow. Dark: use ring border instead (shadows don't show on dark bg) */}
</div>
```

### CSS Variable Strategy — The Professional Approach

```css
/* globals.css — define tokens, override in dark mode */
@import "tailwindcss";

/* ─── Light mode tokens */
:root {
  --color-bg: #ffffff;
  --color-bg-alt: #f9fafb;
  --color-bg-muted: #f3f4f6;
  --color-surface: #ffffff;
  --color-surface-alt: #f9fafb;

  --color-text: #111827;
  --color-text-muted: #6b7280;
  --color-text-subtle: #9ca3af;

  --color-border: #e5e7eb;
  --color-border-muted: #f3f4f6;

  --color-brand: #2563eb;
  --color-brand-hover: #1d4ed8;
  --color-brand-light: #eff6ff;
  --color-brand-text: #1d4ed8;
}

/* ─── Dark mode tokens — override same variables */
.dark {
  --color-bg: #0f172a;
  --color-bg-alt: #1e293b;
  --color-bg-muted: #334155;
  --color-surface: #1e293b;
  --color-surface-alt: #334155;

  --color-text: #f8fafc;
  --color-text-muted: #94a3b8;
  --color-text-subtle: #64748b;

  --color-border: #334155;
  --color-border-muted: #1e293b;

  --color-brand: #3b82f6;
  --color-brand-hover: #60a5fa;
  --color-brand-light: #1e3a8a;
  --color-brand-text: #93c5fd;
}

/* ─── For prefers-color-scheme (if using media strategy) */
@media (prefers-color-scheme: dark) {
  :root {
    --color-bg: #0f172a;
    --color-bg-alt: #1e293b;
    /* ... same overrides */
  }
}
```

```tsx
{
  /* Using CSS variable utilities — automatic dark mode, zero dark: classes needed */
}
<div style={{ backgroundColor: "var(--color-bg)" }}>
  <p style={{ color: "var(--color-text)" }}>
    This text adapts to dark mode automatically via CSS variables
  </p>
</div>;

{
  /* Or using Tailwind arbitrary value syntax to reference CSS vars */
}
<div className="bg-[--color-bg]">
  <p className="text-[--color-text]">Auto dark mode ✅</p>
  <p className="text-[--color-text-muted]">Muted text ✅</p>
  <div className="border border-[--color-border]">
    Border adapts automatically ✅
  </div>
</div>;
```

### Combining `dark:` Classes with CSS Variables

```tsx
{/* Real-world component using BOTH strategies together */}

export function Card({ title, body }: { title: string; body: string }) {
  return (
    {/*
      Strategy A (explicit dark: classes):
        Works when you have a handful of specific overrides
    */}
    <div className="bg-white dark:bg-gray-800
                     border border-gray-200 dark:border-gray-700
                     rounded-2xl p-6 shadow-sm dark:shadow-none
                     dark:ring-1 dark:ring-gray-700">

      <h3 className="text-gray-900 dark:text-white
                      font-semibold text-lg mb-2">
        {title}
      </h3>

      <p className="text-gray-500 dark:text-gray-400 text-sm leading-relaxed">
        {body}
      </p>
    </div>
  )
}
```

### Theme Toggle — Class-Based Dark Mode Implementation

```tsx
// src/components/theme-toggle.tsx
"use client";

import { useState, useEffect } from "react";

export function ThemeToggle() {
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    // Initialize from localStorage or system preference
    const stored = localStorage.getItem("theme");
    const systemDark = window.matchMedia(
      "(prefers-color-scheme: dark)"
    ).matches;
    const shouldBeDark = stored === "dark" || (!stored && systemDark);

    setIsDark(shouldBeDark);
    document.documentElement.classList.toggle("dark", shouldBeDark);
  }, []);

  function toggle() {
    const next = !isDark;
    setIsDark(next);
    document.documentElement.classList.toggle("dark", next);
    localStorage.setItem("theme", next ? "dark" : "light");
  }

  return (
    <button
      onClick={toggle}
      className="relative flex items-center justify-center size-9
                  rounded-xl border border-gray-200 dark:border-gray-700
                  bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-400
                  hover:bg-gray-50 dark:hover:bg-gray-700
                  hover:text-gray-900 dark:hover:text-white
                  transition-all duration-150 focus-visible:outline-none
                  focus-visible:ring-2 focus-visible:ring-blue-500
                  focus-visible:ring-offset-2"
      aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
    >
      {/* Sun icon — visible in dark mode */}
      <span className="hidden dark:block text-base">☀️</span>
      {/* Moon icon — visible in light mode */}
      <span className="block dark:hidden text-base">🌙</span>
    </button>
  );
}
```

### Dark Mode for Common UI Patterns

```tsx
{
  /* ─── Input field */
}
<input
  className="w-full px-3 py-2 rounded-lg text-sm
              bg-white dark:bg-gray-900
              border border-gray-300 dark:border-gray-600
              text-gray-900 dark:text-white
              placeholder:text-gray-400 dark:placeholder:text-gray-500
              focus:outline-none focus:ring-2 focus:ring-blue-500
              focus:border-transparent transition-colors"
  placeholder="Enter email..."
/>;

{
  /* ─── Navigation */
}
<nav
  className="bg-white dark:bg-gray-900
                 border-b border-gray-200 dark:border-gray-800
                 sticky top-0 z-40"
>
  <div className="max-w-7xl mx-auto px-4 h-14 flex items-center justify-between">
    <span className="font-bold text-gray-900 dark:text-white">Acme</span>
    <div className="flex items-center gap-4">
      <a
        className="text-sm text-gray-600 dark:text-gray-400
                     hover:text-gray-900 dark:hover:text-white
                     transition-colors"
      >
        Docs
      </a>
      <ThemeToggle />
    </div>
  </div>
</nav>;

{
  /* ─── Code block */
}
<pre
  className="bg-gray-900 dark:bg-gray-950
                 border border-gray-800 dark:border-gray-700
                 rounded-xl p-4 text-sm font-mono
                 text-gray-100 overflow-x-auto"
>
  <code>const x = 'Hello, world!'</code>
</pre>;

{
  /* ─── Badge/tag */
}
<span
  className="px-2.5 py-1 text-xs font-medium rounded-full
                  bg-blue-100 dark:bg-blue-900/30
                  text-blue-700 dark:text-blue-300
                  border border-blue-200 dark:border-blue-800"
>
  New
</span>;
```

---

## W — Why It Matters

- The CSS variable strategy scales better than explicit `dark:` classes — a component using CSS variables for colors requires zero dark mode classes; the variables switch automatically when the `.dark` class is toggled on `<html>`. A large codebase with explicit `dark:` classes on every element becomes hard to maintain.
- `suppressHydrationWarning` on the `<html>` element is necessary for Next.js dark mode — on first render, the server doesn't know the user's theme preference. The class is added client-side, causing a mismatch. `suppressHydrationWarning` tells React to ignore this specific attribute's mismatch.
- `dark:shadow-none dark:ring-1 dark:ring-gray-700` is the correct dark mode shadow technique — box shadows are nearly invisible on dark backgrounds (they depend on contrast between the element and the background). Replacing shadows with a subtle ring border is how professional dark UIs handle depth.

---

## I — Interview Q&A

### Q1: What are the three dark mode strategies in Tailwind v4 and when should you use each?

**A:** The three strategies are: **media query** (default) — uses `prefers-color-scheme: dark` automatically, no JavaScript needed, but the user can't override it without an OS setting change; **class-based** — you add/remove a `dark` class on the `<html>` element with JavaScript, giving users a manual toggle that persists via `localStorage`, the most common choice for apps; and **attribute-based** — uses a `data-theme` attribute, useful when you need multiple themes (not just light/dark) or when integrating with a design system that uses data attributes. Class-based is the standard for most apps that need a user-controlled theme toggle.

### Q2: Why is the CSS variable strategy preferred over explicit `dark:` classes on every element?

**A:** Explicit `dark:` classes require duplicating every color decision in every component — `bg-white dark:bg-gray-800 text-gray-900 dark:text-white border-gray-200 dark:border-gray-700`. As the app grows, this becomes verbose, easy to miss, and hard to change (a design token change requires updating hundreds of `dark:` classes). The CSS variable strategy defines design tokens once in `:root` and `.dark`, then components reference the variable — `bg-[--color-surface] text-[--color-text]`. When the `.dark` class toggles on `<html>`, all variables update simultaneously across the entire app. Changing a dark mode color requires updating one line in CSS, not hunting through dozens of components.

---

## C — Common Pitfalls + Fix

### ❌ Pitfall: Forgetting `suppressHydrationWarning` on `<html>` in Next.js

```tsx
{
  /* ❌ Hydration mismatch warning — server renders without .dark class,
       client adds it, React sees a difference */
}
export default function RootLayout({ children }) {
  return (
    <html lang="en">
      {" "}
      {/* ← missing suppressHydrationWarning */}
      <body>{children}</body>
    </html>
  );
}
```

**Fix:**

```tsx
{
  /* ✅ Suppress the expected html class attribute mismatch */
}
export default function RootLayout({ children }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>{children}</body>
    </html>
  );
}
```

### ❌ Pitfall: Using `opacity` for dark mode color adjustments instead of dedicated dark colors

```tsx
{
  /* ❌ opacity affects children too — text inside becomes transparent */
}
<div className="bg-blue-600 dark:opacity-80">
  <p className="text-white">This text is also 80% opaque in dark mode ❌</p>
</div>;
```

**Fix:** Use a dedicated dark mode color:

```tsx
{
  /* ✅ Explicit dark mode background — children unaffected */
}
<div className="bg-blue-600 dark:bg-blue-800">
  <p className="text-white">Text remains fully opaque ✅</p>
</div>;
```

### ❌ Pitfall: Not handling the FOUC (Flash of Unstyled Content) on first load

```tsx
{
  /* ❌ Without the inline script, dark mode class is applied after
       React hydrates → user sees a flash of light mode on dark-preference devices */
}
```

**Fix:** Add an inline script in `layout.tsx` that runs before React to prevent FOUC:

```tsx
// src/app/layout.tsx
export default function RootLayout({ children }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        {/* Inline script runs BEFORE any React code — prevents flash */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
            try {
              const stored = localStorage.getItem('theme')
              const systemDark = window.matchMedia('(prefers-color-scheme: dark)').matches
              if (stored === 'dark' || (!stored && systemDark)) {
                document.documentElement.classList.add('dark')
              }
            } catch(e) {}
          `,
          }}
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
```

---

## K — Coding Challenge + Solution

### Challenge

Build a complete dark mode system:

1. `globals.css` with CSS variables for light and dark (background, surface, text, border, brand)
2. `@variant dark` for class-based dark mode
3. A `ThemeToggle` button using `dark:` variants for its own appearance
4. A `<DarkCard>` component using ONLY CSS variable arbitrary values (`bg-[--color-surface]`) — zero `dark:` classes on the card itself
5. A `<NavBar>` using explicit `dark:` classes for comparison
6. FOUC-prevention inline script in root layout

### Solution

```css
/* src/app/globals.css */
@import "tailwindcss";

/* Class-based dark mode */
@variant dark (&:where(.dark, .dark *));

@theme {
  --font-sans: var(--font-inter), system-ui, sans-serif;
  --color-brand-500: #3b82f6;
  --color-brand-600: #2563eb;
}

/* Light mode tokens */
:root {
  --color-bg: #f9fafb;
  --color-surface: #ffffff;
  --color-surface-alt: #f3f4f6;
  --color-text: #111827;
  --color-text-muted: #6b7280;
  --color-border: #e5e7eb;
  --color-brand: #2563eb;
  --color-brand-light: #eff6ff;
  --color-brand-text: #1d4ed8;
}

/* Dark mode tokens */
.dark {
  --color-bg: #0f172a;
  --color-surface: #1e293b;
  --color-surface-alt: #334155;
  --color-text: #f8fafc;
  --color-text-muted: #94a3b8;
  --color-border: #334155;
  --color-brand: #3b82f6;
  --color-brand-light: #1e3a8a;
  --color-brand-text: #93c5fd;
}

body {
  background-color: var(--color-bg);
  color: var(--color-text);
  font-family: var(--font-sans);
  -webkit-font-smoothing: antialiased;
  transition:
    background-color 200ms ease,
    color 200ms ease;
}
```

```tsx
// src/app/layout.tsx
import "./globals.css";

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        {/* FOUC prevention — runs synchronously before React hydrates */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
          try {
            const s = localStorage.getItem('theme')
            const d = window.matchMedia('(prefers-color-scheme: dark)').matches
            if (s === 'dark' || (!s && d)) {
              document.documentElement.classList.add('dark')
            }
          } catch(e) {}
        `,
          }}
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
```

```tsx
// src/components/theme-toggle.tsx
"use client";

import { useState, useEffect } from "react";

export function ThemeToggle() {
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    // Read the state that was already applied by the inline script
    setIsDark(document.documentElement.classList.contains("dark"));
  }, []);

  function toggle() {
    const next = !isDark;
    setIsDark(next);
    document.documentElement.classList.toggle("dark", next);
    try {
      localStorage.setItem("theme", next ? "dark" : "light");
    } catch {}
  }

  return (
    <button
      onClick={toggle}
      aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
      className="relative size-9 rounded-xl flex items-center justify-center
                  border border-gray-200 dark:border-gray-700
                  bg-white dark:bg-gray-800
                  text-gray-500 dark:text-gray-400
                  hover:bg-gray-50 dark:hover:bg-gray-700
                  hover:text-gray-900 dark:hover:text-white
                  transition-all duration-150
                  focus-visible:outline-none focus-visible:ring-2
                  focus-visible:ring-blue-500 focus-visible:ring-offset-2"
    >
      <span className="block dark:hidden" aria-hidden>
        🌙
      </span>
      <span className="hidden dark:block" aria-hidden>
        ☀️
      </span>
    </button>
  );
}
```

```tsx
// src/components/nav-bar.tsx
// Uses explicit dark: classes — simple, readable
import { ThemeToggle } from "./theme-toggle";

export function NavBar() {
  return (
    <nav
      className="sticky top-0 z-40
                     bg-white/90 dark:bg-gray-900/90
                     backdrop-blur-md
                     border-b border-gray-200 dark:border-gray-800
                     transition-colors duration-200"
    >
      <div
        className="max-w-7xl mx-auto px-4 sm:px-6 h-14
                       flex items-center justify-between"
      >
        <span className="font-bold text-gray-900 dark:text-white text-lg">
          Acme
        </span>

        <div className="flex items-center gap-4 sm:gap-6">
          {["Docs", "Blog", "Pricing"].map((link) => (
            <a
              key={link}
              className="hidden sm:block text-sm text-gray-600
                           dark:text-gray-400 hover:text-gray-900
                           dark:hover:text-white transition-colors"
            >
              {link}
            </a>
          ))}
          <ThemeToggle />
          <button
            className="px-4 py-1.5 bg-blue-600 dark:bg-blue-500
                              hover:bg-blue-700 dark:hover:bg-blue-400
                              text-white text-sm font-semibold rounded-lg
                              transition-colors"
          >
            Sign in
          </button>
        </div>
      </div>
    </nav>
  );
}
```

```tsx
// src/components/dark-card.tsx
// Uses ONLY CSS variable utilities — zero dark: classes needed
// Dark mode works automatically via CSS variable overrides in .dark

interface DarkCardProps {
  icon: string;
  title: string;
  body: string;
  badge?: string;
}

export function DarkCard({ icon, title, body, badge }: DarkCardProps) {
  return (
    // All colors reference CSS variables — adapt automatically ✅
    <div
      className="bg-[--color-surface] border border-[--color-border]
                     rounded-2xl p-6 shadow-sm
                     hover:border-[--color-brand] transition-all duration-200"
    >
      <div className="flex items-start justify-between mb-4">
        <span className="text-3xl">{icon}</span>
        {badge && (
          <span
            className="px-2.5 py-0.5 text-xs font-semibold rounded-full
                            bg-[--color-brand-light] text-[--color-brand-text]
                            border border-[--color-brand]/20"
          >
            {badge}
          </span>
        )}
      </div>

      <h3 className="text-[--color-text] font-semibold text-lg mb-2 leading-snug">
        {title}
      </h3>

      <p className="text-[--color-text-muted] text-sm leading-relaxed text-pretty">
        {body}
      </p>

      <div className="mt-5 pt-4 border-t border-[--color-border]">
        <button
          className="text-[--color-brand] text-sm font-semibold
                            hover:text-[--color-brand-text] transition-colors"
        >
          Learn more →
        </button>
      </div>
    </div>
  );
}
```

```tsx
// src/app/page.tsx — Demo page wiring it all together
import { NavBar } from "@/components/nav-bar";
import { DarkCard } from "@/components/dark-card";

const CARDS = [
  {
    icon: "⚡",
    title: "Lightning fast",
    body: "Sub-millisecond HMR and instant production builds.",
    badge: "v4.3",
  },
  {
    icon: "🎨",
    title: "CSS-first config",
    body: "Configure your design system entirely in CSS.",
    badge: "New",
  },
  {
    icon: "🌗",
    title: "Built-in dark mode",
    body: "Class-based or media-query dark mode out of the box.",
  },
  {
    icon: "📐",
    title: "Arbitrary values",
    body: "Escape the scale with [value] syntax whenever you need.",
  },
  {
    icon: "🔌",
    title: "No config file needed",
    body: "Zero configuration required to get started.",
    badge: "v4",
  },
  {
    icon: "♿",
    title: "Accessible by default",
    body: "focus-visible utilities for keyboard navigation built in.",
  },
];

export default function DemoPage() {
  return (
    // bg-[--color-bg] adapts automatically to dark mode via CSS variables
    <div className="min-h-screen bg-[--color-bg]">
      <NavBar />
      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-16">
        <div className="text-center mb-12">
          <h1
            className="text-4xl font-extrabold text-[--color-text]
                          leading-tight tracking-tight text-balance"
          >
            Tailwind v4.3 Features
          </h1>
          <p className="mt-3 text-lg text-[--color-text-muted] text-pretty max-w-xl mx-auto">
            Toggle dark mode with the button in the nav. All cards adapt via CSS
            variables — zero dark: classes on the cards themselves.
          </p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {CARDS.map((card) => (
            <DarkCard key={card.title} {...card} />
          ))}
        </div>
      </main>
    </div>
  );
}
```

---

---
