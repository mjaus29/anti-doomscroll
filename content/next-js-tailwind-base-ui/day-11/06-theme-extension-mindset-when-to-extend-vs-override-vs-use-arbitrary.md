# 6 — Theme Extension Mindset — When to Extend vs Override vs Use Arbitrary

---

## T — TL;DR

Every design decision in Tailwind v4 falls into one of three buckets: **extend** (add to `@theme {}`), **override** (replace a default), or **use arbitrary** (one-off value). The correct choice determines whether your codebase stays clean and consistent or becomes a sea of `[value]` scattered everywhere.

---

## K — Key Concepts

### The Decision Framework

```
Ask three questions:

1. Will I use this value 3+ times across the codebase?
   YES → Extend @theme {} with a named token
   NO  → Use arbitrary value [value]

2. Does this replace a Tailwind default I'll NEVER use?
   YES → Override the default in @theme {}
   NO  → Add alongside the default

3. Is this a one-off, layout-specific, or API-driven value?
   YES → Arbitrary value is correct — don't pollute @theme
   NO  → Named token in @theme
```

### When to Extend — Named Tokens in `@theme`

```css
/* src/app/globals.css */
@import "tailwindcss";

@theme {
  /* ─── Extend: brand colors used across the entire app */
  --color-brand-50: #eff6ff;
  --color-brand-100: #dbeafe;
  --color-brand-200: #bfdbfe;
  --color-brand-500: #3b82f6;
  --color-brand-600: #2563eb;
  --color-brand-700: #1d4ed8;
  --color-brand-900: #1e3a8a;

  /* ─── Extend: custom spacing values used repeatedly */
  --spacing-13: 3.25rem; /* 52px — used in sidebar widths, avatar rows */
  --spacing-18: 4.5rem; /* 72px — hero padding, section gaps */
  --spacing-22: 5.5rem; /* 88px — nav heights, sticky offsets */
  --spacing-128: 32rem; /* 512px — max-width variants */

  /* ─── Extend: custom breakpoints for the app's layout needs */
  --breakpoint-xs: 30rem; /* 480px — small phones */
  --breakpoint-3xl: 112rem; /* 1792px — wide monitors */

  /* ─── Extend: custom shadows matching design system */
  --shadow-sm-brand: 0 1px 3px 0 rgb(37 99 235 / 0.2);
  --shadow-glow: 0 0 24px -4px rgb(59 130 246 / 0.4);
  --shadow-card: 0 4px 12px -2px rgb(0 0 0 / 0.08);

  /* ─── Extend: animation durations for consistent motion */
  --duration-fast: 100ms;
  --duration-normal: 200ms;
  --duration-slow: 400ms;
}
```

```tsx
{/* ─── Using extended tokens */}
<div className="bg-brand-600 hover:bg-brand-700 text-white p-18 shadow-glow">
  Uses custom tokens — clear intent, consistent
</div>

<section className="py-18 px-4 sm:px-6 max-w-128 mx-auto">
  Custom spacing and max-width
</section>
```

### When to Override — Replacing Defaults

```css
/* ─── Override: completely replace a Tailwind default */
/* Use when: you NEVER want the original value, only yours */
/* Warning: overriding removes the original — all teammates lose it */

@theme {
  /* Replace default font families entirely */
  --font-sans: "Inter", system-ui, sans-serif;
  --font-mono: "JetBrains Mono", ui-monospace, monospace;

  /* Tighten the default border-radius scale */
  --radius-sm: 0.25rem; /* was 0.125rem */
  --radius-md: 0.5rem; /* was 0.375rem */
  --radius-lg: 0.75rem; /* was 0.5rem */

  /* Override gray to use a warmer stone palette */
  --color-gray-50: #fafaf9; /* stone-50 */
  --color-gray-100: #f5f5f4; /* stone-100 */
  --color-gray-900: #1c1917; /* stone-900 */
}

/* ─── Override: change Tailwind's default transition durations */
@theme {
  --default-transition-duration: 200ms; /* was 150ms */
}
```

### When to Use Arbitrary — One-Off Values

```tsx
{
  /* ─── Arbitrary: values that appear once or twice */
}
{
  /* Don't pollute @theme with one-off values */
}

{
  /* Layout-specific */
}
<div className="grid grid-cols-[260px_1fr_300px]">
  {/* Specific to this dashboard layout — not a design token */}
</div>;

{
  /* API-driven sizes */
}
<div
  style={{ "--progress": `${percentage}%` } as React.CSSProperties}
  className="w-[--progress] h-2 bg-blue-600 rounded-full"
>
  {/* Width comes from data — arbitrary value is correct */}
</div>;

{
  /* Third-party component sizing */
}
<div className="w-[var(--radix-select-trigger-width)]">
  {/* Radix-specific CSS variable — not a design token */}
</div>;

{
  /* Content-based */
}
<div className="min-h-[420px]">
  {/* Minimum height to prevent layout shift for a specific section */}
</div>;
```

### Semantic Design Tokens vs Literal Tokens

```css
/* ─── Anti-pattern: literal tokens */
@theme {
  --color-blue-600: #2563eb; /* ← literal — duplicates Tailwind's default */
  --spacing-16px: 1rem; /* ← literal — just use p-4 */
}

/* ─── Better: semantic tokens that communicate PURPOSE */
@theme {
  /* Semantic: what the color IS for, not what color it is */
  --color-primary: #2563eb; /* primary action color */
  --color-primary-hover: #1d4ed8; /* primary on hover */
  --color-destructive: #dc2626; /* delete/danger actions */
  --color-success: #16a34a; /* success states */
  --color-warning: #d97706; /* warning states */
  --color-muted: #6b7280; /* secondary text */

  /* Semantic spacing: what the spacing IS for */
  --spacing-nav-height: 3.5rem; /* sticky nav height */
  --spacing-sidebar: 16rem; /* sidebar width */
  --spacing-content-gap: 1.5rem; /* gap within content blocks */
}
```

```tsx
{/* ─── Semantic usage — self-documenting */}
<nav className="h-[--spacing-nav-height] sticky top-0 z-40">
<aside className="w-[--spacing-sidebar]">
<main className="h-[calc(100vh-var(--spacing-nav-height))]">
{/* Reading the code tells you WHY, not just WHAT */}
```

---

## W — Why It Matters

- The `@theme {}` extension namespace is your app's design language — if you add everything to it, it becomes noise; if you add nothing, you get arbitrary values everywhere. The three-question framework (`3+ uses? → extend`, `replacing? → override`, `one-off? → arbitrary`) keeps the design system lean and the codebase clean.
- Semantic tokens (`--color-primary`, `--spacing-nav-height`) are significantly more maintainable than literal tokens (`--color-blue-600`, `--spacing-56px`) — when the design changes, you update one CSS variable and every usage updates, vs hunting for every arbitrary `[56px]` in the codebase.
- Overriding Tailwind defaults should be done deliberately — overriding `--font-sans` is appropriate when you have a consistent font stack, but overriding individual color scale values affects every blue-related utility across the entire app, which can produce unexpected results.

---

## I — Interview Q&A

### Q1: When should you add a value to `@theme {}` vs using an arbitrary value in Tailwind v4?

**A:** Add to `@theme {}` when a value is used three or more times across the codebase, when it represents a semantic design decision (brand color, nav height, sidebar width), or when it needs to be consistent across components and teammates. Use arbitrary values for one-off layout-specific measurements, values that come from runtime data (widths from APIs or user input), values specific to a third-party library's CSS variables, and design experiments that haven't been ratified into the design system. The test is: would renaming this value require you to update a CSS variable in one place, or would you have to search for the arbitrary value everywhere?

---

## C — Common Pitfalls + Fix

### ❌ Pitfall: Adding every arbitrary value to `@theme` — pollutes the design system

```css
/* ❌ These don't belong in @theme — they're one-off layout values */
@theme {
  --spacing-13px: 0.8125rem; /* used once in one component */
  --spacing-42: 10.5rem; /* used for one specific card height */
  --color-chart-line-1: #ff6b6b; /* recharts-specific color */
  --color-chart-line-2: #4ecdc4;
}
```

**Fix:** Keep one-off values as arbitrary values:

```tsx
{/* ✅ One-off values stay inline */}
<div className="p-[13px]">
<div className="h-[420px]">
<div style={{ '--recharts-color-1': '#ff6b6b' } as CSSProperties}>
```

---

## K — Coding Challenge + Solution

### Challenge

Design a complete `@theme {}` extension for a SaaS dashboard app. Include:

1. Semantic brand colors (primary, primary-hover, destructive, success, warning)
2. UI colors (surface, surface-alt, border, text, text-muted)
3. Semantic spacing tokens (nav-height, sidebar-width, content-max-width)
4. Custom shadows (card, card-hover, glow-brand)
5. Override: default font-sans to Inter
6. Custom breakpoint: `tablet` at 50rem
7. Write a component that uses ALL these tokens — zero arbitrary values

### Solution

```css
/* src/app/globals.css */
@import "tailwindcss";

@theme {
  /* ─── Font override */
  --font-sans: var(--font-inter), system-ui, sans-serif;
  --font-mono: var(--font-geist-mono), ui-monospace, monospace;

  /* ─── Semantic brand colors */
  --color-primary: #2563eb;
  --color-primary-hover: #1d4ed8;
  --color-primary-light: #eff6ff;
  --color-primary-text: #1d4ed8;
  --color-destructive: #dc2626;
  --color-destructive-hover: #b91c1c;
  --color-success: #16a34a;
  --color-warning: #d97706;
  --color-info: #0891b2;

  /* ─── Semantic UI colors */
  --color-surface: #ffffff;
  --color-surface-alt: #f9fafb;
  --color-border: #e5e7eb;
  --color-text: #111827;
  --color-text-muted: #6b7280;

  /* ─── Semantic spacing */
  --spacing-nav: 3.5rem;
  --spacing-sidebar: 15rem;
  --spacing-content-max: 75rem;

  /* ─── Shadows */
  --shadow-card:
    0 1px 3px 0 rgb(0 0 0 / 0.08), 0 1px 2px -1px rgb(0 0 0 / 0.04);
  --shadow-card-hover:
    0 4px 12px -2px rgb(0 0 0 / 0.1), 0 2px 6px -2px rgb(0 0 0 / 0.06);
  --shadow-glow-brand: 0 0 20px -4px rgb(37 99 235 / 0.35);

  /* ─── Custom breakpoint */
  --breakpoint-tablet: 50rem;
}

/* Dark mode semantic overrides */
.dark {
  --color-surface: #1e293b;
  --color-surface-alt: #0f172a;
  --color-border: #334155;
  --color-text: #f8fafc;
  --color-text-muted: #94a3b8;
  --color-primary-light: #1e3a8a;
  --color-primary-text: #93c5fd;
}
```

```tsx
// src/components/action-card.tsx
// Uses ONLY named tokens — zero arbitrary values

interface ActionCardProps {
  title: string;
  description: string;
  onPrimary: () => void;
  onDelete: () => void;
  status: "active" | "warning" | "error";
}

const STATUS_COLORS = {
  active: "bg-success text-white",
  warning: "bg-warning text-white",
  error: "bg-destructive text-white",
};

export function ActionCard({
  title,
  description,
  onPrimary,
  onDelete,
  status,
}: ActionCardProps) {
  return (
    // Uses: shadow-card, hover shadow-card-hover, color tokens via arbitrary var refs
    <div
      className="
      bg-[--color-surface] border border-[--color-border] rounded-2xl p-6
      shadow-card hover:shadow-card-hover hover:-translate-y-0.5
      transition-all duration-200
    "
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div className="space-y-1 min-w-0">
          <h3 className="font-semibold text-[--color-text] text-lg leading-tight">
            {title}
          </h3>
          <p className="text-sm text-[--color-text-muted] text-pretty">
            {description}
          </p>
        </div>
        {/* Status badge using semantic color tokens */}
        <span
          className={`shrink-0 ml-3 px-2.5 py-1 text-xs font-bold
                           uppercase tracking-wider rounded-full
                           ${STATUS_COLORS[status]}`}
        >
          {status}
        </span>
      </div>

      {/* Action row */}
      <div className="flex gap-3 mt-5 pt-4 border-t border-[--color-border]">
        <button
          onClick={onPrimary}
          className="
            flex-1 py-2 rounded-xl text-sm font-semibold text-white
            bg-primary hover:bg-primary-hover
            shadow-glow-brand hover:shadow-none
            active:scale-[0.98] transition-all duration-150
            focus-visible:outline-none focus-visible:ring-2
            focus-visible:ring-primary focus-visible:ring-offset-2
          "
        >
          Primary action
        </button>
        <button
          onClick={onDelete}
          className="
            px-4 py-2 rounded-xl text-sm font-semibold
            text-destructive bg-[--color-surface-alt]
            hover:bg-destructive hover:text-white
            border border-[--color-border]
            active:scale-[0.98] transition-all duration-150
            focus-visible:outline-none focus-visible:ring-2
            focus-visible:ring-destructive focus-visible:ring-offset-2
          "
        >
          Delete
        </button>
      </div>
    </div>
  );
}
```

---

---
