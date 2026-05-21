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
