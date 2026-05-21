# 4 — Tailwind CSS Integration

---

## T — TL;DR

Next.js 16 + `create-next-app` sets up Tailwind CSS v4 with PostCSS automatically. Tailwind v4 uses a CSS-first configuration approach — most setup happens in `globals.css` instead of `tailwind.config.ts`. Write utility classes directly in JSX. No CSS files needed for 90% of styling.

---

## K — Key Concepts

### Tailwind v4 — What Changed from v3

```
Tailwind CSS v4 (default in Next.js 16):
  - Configuration moved to CSS file (@import "tailwindcss" in globals.css)
  - No tailwind.config.js required for basic use
  - Automatic content detection (no content array to configure)
  - CSS variables replace the design token system
  - 5x faster build times (Oxide engine in Rust)
  - New utilities and updated defaults
```

### What `create-next-app` Generates

```css
/* src/app/globals.css — Tailwind v4 */
@import "tailwindcss";

/* Custom CSS variables / theme tokens */
:root {
  --background: #ffffff;
  --foreground: #171717;
}

@media (prefers-color-scheme: dark) {
  :root {
    --background: #0a0a0a;
    --foreground: #ededed;
  }
}

body {
  color: var(--foreground);
  background: var(--background);
  font-family: Arial, Helvetica, sans-serif;
}
```

```ts
// tailwind.config.ts — still present but minimal in v4
import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
};

export default config;
```

```js
// postcss.config.mjs
const config = {
  plugins: {
    "@tailwindcss/postcss": {},
    // Tailwind v4 uses @tailwindcss/postcss instead of tailwindcss directly
  },
};
export default config;
```

### Using Tailwind Classes in Next.js

```tsx
// src/app/page.tsx
export default function HomePage() {
  return (
    <main className="min-h-screen bg-white dark:bg-gray-900">
      <div className="max-w-4xl mx-auto px-4 py-16">
        <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-4">
          Welcome to Storefront
        </h1>
        <p className="text-lg text-gray-600 dark:text-gray-300">
          Built with Next.js 16 + Tailwind CSS v4
        </p>
        <button
          className="
          mt-8 px-6 py-3
          bg-blue-600 hover:bg-blue-700
          text-white font-medium
          rounded-lg
          transition-colors duration-200
          focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2
        "
        >
          Get Started
        </button>
      </div>
    </main>
  );
}
```

### Extending the Theme (Tailwind v4 CSS Variables)

```css
/* src/app/globals.css — v4 custom theme via CSS */
@import "tailwindcss";

@theme {
  /* Custom colors — available as bg-brand-500, text-brand-500, etc. */
  --color-brand-50: #eff6ff;
  --color-brand-500: #3b82f6;
  --color-brand-900: #1e3a8a;

  /* Custom fonts — available as font-display */
  --font-display: "Cal Sans", sans-serif;

  /* Custom spacing */
  --spacing-18: 4.5rem;
}
```

### Extending the Theme (Tailwind v3 Style — `tailwind.config.ts`)

```ts
// tailwind.config.ts — v3 compatible approach
import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        brand: {
          50: "#eff6ff",
          500: "#3b82f6",
          900: "#1e3a8a",
        },
      },
      fontFamily: {
        display: ["Cal Sans", "sans-serif"],
      },
    },
  },
  plugins: [],
};

export default config;
```

### `cn()` Utility — Class Name Merging (Essential Pattern)

```bash
npm install clsx tailwind-merge
```

```ts
// src/lib/utils.ts
import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}
```

```tsx
// Usage — conditional classes + conflict resolution
function Button({
  variant = "primary",
  className,
  children,
}: {
  variant?: "primary" | "secondary";
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <button
      className={cn(
        "px-4 py-2 rounded-lg font-medium transition-colors",
        variant === "primary" && "bg-blue-600 text-white hover:bg-blue-700",
        variant === "secondary" &&
          "bg-gray-100 text-gray-900 hover:bg-gray-200",
        className // ← caller overrides win, twMerge resolves conflicts
      )}
    >
      {children}
    </button>
  );
}

// twMerge resolves Tailwind conflicts:
cn("px-4 px-8"); // → 'px-8'  (later wins)
cn("text-red-500", "text-blue-500"); // → 'text-blue-500'
```

### VS Code Tailwind IntelliSense

```json
// .vscode/extensions.json — recommend to all contributors
{
  "recommendations": [
    "bradlc.vscode-tailwindcss", // ← class autocomplete + preview
    "dbaeumer.vscode-eslint",
    "esbenp.prettier-vscode"
  ]
}
```

---

## W — Why It Matters

- Tailwind v4's CSS-first configuration means no JavaScript object to understand — the theme lives in CSS variables that are also usable in plain CSS.
- Next.js + Tailwind is the dominant production stack for React apps in 2025/2026 — every job posting for Next.js assumes Tailwind familiarity.
- The `cn()` utility (clsx + tailwind-merge) is a community standard — it appears in shadcn/ui, Radix examples, and virtually every Next.js component library. Learn it once, see it everywhere.
- `tailwind-merge` specifically prevents the common bug where two conflicting Tailwind classes both render and the "winner" is unpredictable (e.g., `px-4 px-8` — without merge, CSS specificity order determines which wins, not the class order in the string).

---

## I — Interview Q&A

### Q1: What changed in Tailwind CSS v4 compared to v3?

**A:** Tailwind v4 moves configuration to CSS files using `@import "tailwindcss"` and `@theme {}` blocks instead of `tailwind.config.js`. It uses CSS variables for the design token system, has automatic content detection (no `content` array needed), and uses a Rust-based engine (Oxide) that's 5x faster. The class names are largely the same — migration from v3 is mostly config file changes.

### Q2: What does `tailwind-merge` do that `clsx` doesn't?

**A:** `clsx` concatenates class names and handles conditional logic (`clsx('a', condition && 'b')`). It doesn't resolve Tailwind conflicts — `clsx('px-4 px-8')` produces `"px-4 px-8"` and the CSS order determines which wins (unpredictable). `tailwind-merge` knows about Tailwind's class groups and picks the winner correctly — `twMerge('px-4 px-8')` produces `"px-8"`. Use both together via `cn()`.

### Q3: Why is Next.js's CSS Modules approach unnecessary when using Tailwind?

**A:** CSS Modules scope CSS class names to the component to avoid collisions. Tailwind classes are globally defined utility classes — there are no collisions to worry about because each class does exactly one thing. Tailwind replaces the need for CSS Modules for component styling. CSS Modules are still useful for complex animations or third-party library style overrides.

---

## C — Common Pitfalls + Fix

### ❌ Pitfall: Building class strings dynamically (Tailwind purges them)

```tsx
// ❌ Tailwind's content scanner cannot detect dynamically built classes
const color = 'blue'
const size  = '500'
<div className={`bg-${color}-${size}`}>  // 'bg-blue-500' — purged in production!
```

**Fix:** Use complete class names in conditions:

```tsx
const classes = {
  blue:  'bg-blue-500',
  green: 'bg-green-500',
  red:   'bg-red-500'
}
<div className={classes[color]}>  // ✅ complete class names — not purged
```

### ❌ Pitfall: Not importing Tailwind in `globals.css` and wondering why no styles apply

```css
/* globals.css — missing Tailwind import */
/* (empty or only custom CSS) */
```

**Fix:**

```css
/* globals.css */
@import "tailwindcss"; /* ← v4: this one line includes everything */
/* or for v3: */
@tailwind base;
@tailwind components;
@tailwind utilities;
```

### ❌ Pitfall: Importing `globals.css` in every component instead of root layout

```tsx
// ❌ Importing globals.css in individual components
import "../../globals.css"; // duplicated styles, potential issues
```

**Fix:** Import `globals.css` only once in `src/app/layout.tsx`:

```tsx
// src/app/layout.tsx
import "./globals.css"; // ✅ imported once in root layout
```

---

## K — Coding Challenge + Solution

### Challenge

Create a reusable `Card` component with Tailwind that:

1. Accepts `variant: 'default' | 'featured' | 'danger'`
2. Accepts optional `className` override
3. Uses `cn()` utility for class merging
4. Has different background/border colors per variant
5. Maintains consistent padding and shadow

### Solution

```tsx
// src/components/ui/card.tsx
import { cn } from "@/lib/utils";

interface CardProps {
  variant?: "default" | "featured" | "danger";
  className?: string;
  children: React.ReactNode;
  title?: string;
}

const variantStyles = {
  default: "bg-white border-gray-200",
  featured: "bg-blue-50 border-blue-200 ring-1 ring-blue-500",
  danger: "bg-red-50 border-red-200",
} as const;

export function Card({
  variant = "default",
  className,
  children,
  title,
}: CardProps) {
  return (
    <div
      className={cn(
        // Base styles
        "rounded-xl border p-6 shadow-sm",
        // Variant styles
        variantStyles[variant],
        // Caller override — wins over variant via twMerge
        className
      )}
    >
      {title && (
        <h3
          className={cn(
            "text-lg font-semibold mb-3",
            variant === "danger" && "text-red-700",
            variant === "featured" && "text-blue-700",
            variant === "default" && "text-gray-900"
          )}
        >
          {title}
        </h3>
      )}
      <div className="text-gray-600">{children}</div>
    </div>
  );
}

// Usage:
// <Card variant="featured" title="Pro Plan">Best value</Card>
// <Card variant="danger"   className="mt-4">Danger zone</Card>
// <Card className="p-10">Custom padding — twMerge keeps p-10, drops p-6</Card>
```

---

---
