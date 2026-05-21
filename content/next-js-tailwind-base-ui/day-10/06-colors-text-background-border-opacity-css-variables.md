# 6 — Colors — Text, Background, Border, Opacity, CSS Variables

---

## T — TL;DR

Tailwind v4.3's color system uses CSS custom properties — every color utility (`text-blue-600`, `bg-gray-100`) maps to a CSS variable. Custom colors defined in `@theme {}` are immediately available as utilities. Opacity is set via the `/{opacity}` modifier syntax.

---

## K — Key Concepts

### Default Color Palette

```tsx
{/* ─── Color families (same scale for text-, bg-, border-, ring-) */}
{/* Each family: 50 (lightest) → 950 (darkest) */}

{/* Slate — cool gray */}
<div className="bg-slate-50 bg-slate-100 bg-slate-200 bg-slate-300
                bg-slate-400 bg-slate-500 bg-slate-600 bg-slate-700
                bg-slate-800 bg-slate-900 bg-slate-950" />

{/* Gray — neutral gray */}
{/* Zinc — cool gray (slight blue) */}
{/* Neutral — pure gray */}
{/* Stone — warm gray */}

{/* Blues */}
<div className="bg-blue-50">  {/* very light blue — backgrounds */}
<div className="bg-blue-100"> {/* light blue — hover backgrounds */}
<div className="bg-blue-500"> {/* medium blue — icons */}
<div className="bg-blue-600"> {/* primary blue — buttons, links */}
<div className="bg-blue-700"> {/* darker blue — hover states */}
<div className="bg-blue-900"> {/* very dark blue — text on light */}

{/* Same structure for: indigo, violet, purple, fuchsia, pink, rose */}
{/* red, orange, amber, yellow, lime, green, emerald, teal, cyan, sky */}

{/* Semantic colors */}
<div className="text-white">        {/* pure white */}
<div className="text-black">        {/* pure black */}
<div className="bg-transparent">    {/* transparent */}
<div className="bg-current">        {/* currentColor */}
<div className="bg-inherit">        {/* inherit from parent */}
```

### Text, Background, Border Colors

```tsx
{/* ─── Text color */}
<p className="text-gray-900">    {/* near-black body text */}
<p className="text-gray-700">    {/* dark secondary text */}
<p className="text-gray-500">    {/* muted text */}
<p className="text-gray-400">    {/* disabled/placeholder */}
<p className="text-blue-600">    {/* link/accent color */}
<p className="text-red-600">     {/* error text */}
<p className="text-green-600">   {/* success text */}
<p className="text-white">       {/* white on dark backgrounds */}

{/* ─── Background color */}
<div className="bg-white">       {/* card/surface */}
<div className="bg-gray-50">     {/* page background */}
<div className="bg-gray-100">    {/* input background, hover */}
<div className="bg-blue-600">    {/* primary button */}
<div className="bg-blue-50">     {/* light accent area */}
<div className="bg-red-50">      {/* error background */}
<div className="bg-green-50">    {/* success background */}
<div className="bg-amber-50">    {/* warning background */}

{/* ─── Border color */}
<div className="border border-gray-200">  {/* default card border */}
<div className="border border-gray-300">  {/* input border */}
<div className="border border-blue-500">  {/* focused input border */}
<div className="border border-red-400">   {/* error border */}
```

### Opacity Modifier — `/{opacity}`

```tsx
{/* ─── Opacity modifier on any color utility */}
{/* Syntax: color-class/opacity-percentage */}

<div className="bg-blue-600/10">   {/* blue-600 at 10% opacity */}
<div className="bg-blue-600/20">   {/* blue-600 at 20% opacity */}
<div className="bg-blue-600/50">   {/* blue-600 at 50% opacity */}
<div className="bg-blue-600/80">   {/* blue-600 at 80% opacity */}
<div className="bg-black/50">      {/* black at 50% — overlay backdrop */}
<div className="bg-white/80">      {/* white at 80% — frosted glass nav */}

<p className="text-gray-900/70">   {/* text at 70% opacity */}
<div className="border-gray-200/50"> {/* border at 50% opacity */}

{/* ─── Old v3 way (still works but verbose) */}
<div className="bg-blue-600 bg-opacity-50"> {/* ← deprecated pattern */}
{/* ─── v4 way */}
<div className="bg-blue-600/50">            {/* ← clean modifier syntax ✅ */}

{/* ─── Common opacity patterns */}
<div className="bg-black/50 backdrop-blur-sm"> {/* modal overlay */}
<nav className="bg-white/80 backdrop-blur-md"> {/* frosted glass nav */}
<div className="bg-blue-50/50">               {/* very subtle tint */}
```

### Custom Colors from `@theme`

```css
/* globals.css */
@theme {
  --color-brand-50: #eff6ff;
  --color-brand-500: #3b82f6;
  --color-brand-600: #2563eb;
  --color-brand-900: #1e3a8a;
}
```

```tsx
{/* Custom colors are immediately available as utilities */}
<div className="bg-brand-600">         {/* → background-color: #2563eb */}
<p  className="text-brand-900">        {/* → color: #1e3a8a */}
<div className="border-brand-500">     {/* → border-color: #3b82f6 */}
<div className="bg-brand-50/50">       {/* → with opacity modifier ✅ */}
```

### CSS Variable Colors — Runtime Theming

```tsx
{/* Using CSS variables directly for runtime theming */}
<div style={{ backgroundColor: 'var(--color-surface)' }}>
  {/* This changes at runtime based on dark mode CSS variables */}
</div>

{/* With Tailwind's arbitrary value syntax */}
<div className="bg-[--color-surface]">    {/* reference a CSS variable */}
<p  className="text-[--color-text]">
<div className="border-[--color-border]">

{/* ─── Status color patterns */}
{/* Success */}
<div className="bg-green-50 border border-green-200 text-green-800 rounded-lg p-4">
  ✅ Changes saved successfully.
</div>

{/* Error */}
<div className="bg-red-50 border border-red-200 text-red-800 rounded-lg p-4">
  ❌ Something went wrong.
</div>

{/* Warning */}
<div className="bg-amber-50 border border-amber-200 text-amber-800 rounded-lg p-4">
  ⚠️ This action cannot be undone.
</div>

{/* Info */}
<div className="bg-blue-50 border border-blue-200 text-blue-800 rounded-lg p-4">
  ℹ️ New update available.
</div>
```

---

## W — Why It Matters

- The `/{opacity}` modifier (e.g., `bg-black/50`) is Tailwind v4's clean way to apply opacity to colors without separate utility classes or inline styles — it generates `rgb(0 0 0 / 0.5)` which is more correct than the old `opacity` property (which affects children too).
- Using consistent color scales (like always using `600` for primary interactive elements, `50` for light backgrounds, `200` for borders) creates visual consistency — once you internalize the scale, you can apply it consistently without design tools.
- The `@theme {}` custom color approach in v4 means custom colors get the same opacity modifier, hover state, dark mode, and responsive support as built-in colors — they're first-class citizens, not afterthoughts.

---

## I — Interview Q&A

### Q1: How does the opacity modifier work for colors in Tailwind v4?

**A:** The `/{opacity}` modifier appends an alpha value to any color utility. For example, `bg-blue-600/50` generates `background-color: oklch(0.5 0.24 264 / 0.5)` (or the equivalent RGB) — the color at 50% opacity. This uses the CSS `color()` function's alpha channel rather than the `opacity` property, which means only the color is transparent, not the children. The syntax works on `bg-*`, `text-*`, `border-*`, `ring-*`, and any other color utility. Common uses: `bg-black/50` for modal overlays, `bg-white/80` for frosted glass navs, `bg-blue-600/10` for subtle tinted backgrounds.

---

## C — Common Pitfalls + Fix

### ❌ Pitfall: Using `opacity-50` instead of the color opacity modifier — makes children transparent too

```tsx
{
  /* ❌ opacity-50 makes EVERYTHING in the div transparent (text, children, borders) */
}
<div className="bg-blue-600 opacity-50 text-white">
  This text is also 50% transparent — hard to read ❌
</div>;
```

**Fix:** Use the color opacity modifier for background only:

```tsx
{
  /* ✅ Only the background is transparent — text remains opaque */
}
<div className="bg-blue-600/50 text-white">This text is fully opaque ✅</div>;
```

---

## K — Coding Challenge + Solution

### Challenge

Build a `<StatusBanner>` component that renders 4 variants (success, error, warning, info) using color utilities:

1. Each has a `bg-*-50 border border-*-200 text-*-800` pattern
2. Title uses `font-semibold`, body uses `text-sm`
3. An icon and a dismiss button using `text-*-400 hover:text-*-600`
4. Custom brand color variant using `@theme` custom colors
5. All composed without any custom CSS

### Solution

```tsx
// src/components/status-banner.tsx
type BannerVariant = "success" | "error" | "warning" | "info" | "brand";

interface BannerProps {
  variant: BannerVariant;
  title: string;
  message?: string;
  onDismiss?: () => void;
}

const VARIANTS: Record<
  BannerVariant,
  {
    wrapper: string;
    icon: string;
    dismiss: string;
    emoji: string;
  }
> = {
  success: {
    wrapper: "bg-green-50 border-green-200 text-green-800",
    icon: "text-green-500",
    dismiss: "text-green-400 hover:text-green-600",
    emoji: "✅",
  },
  error: {
    wrapper: "bg-red-50 border-red-200 text-red-800",
    icon: "text-red-500",
    dismiss: "text-red-400 hover:text-red-600",
    emoji: "❌",
  },
  warning: {
    wrapper: "bg-amber-50 border-amber-200 text-amber-800",
    icon: "text-amber-500",
    dismiss: "text-amber-400 hover:text-amber-600",
    emoji: "⚠️",
  },
  info: {
    wrapper: "bg-blue-50 border-blue-200 text-blue-800",
    icon: "text-blue-500",
    dismiss: "text-blue-400 hover:text-blue-600",
    emoji: "ℹ️",
  },
  brand: {
    wrapper: "bg-brand-50 border-brand-200 text-brand-900",
    icon: "text-brand-500",
    dismiss: "text-brand-400 hover:text-brand-600",
    emoji: "🚀",
  },
};

export function StatusBanner({
  variant,
  title,
  message,
  onDismiss,
}: BannerProps) {
  const v = VARIANTS[variant];
  return (
    <div
      className={`flex items-start gap-3 px-4 py-3 rounded-xl border ${v.wrapper}`}
      role="alert"
    >
      <span className="shrink-0 text-base leading-5">{v.emoji}</span>
      <div className="flex-1 min-w-0">
        <p className="font-semibold text-sm leading-5">{title}</p>
        {message && <p className="text-sm mt-0.5 opacity-80">{message}</p>}
      </div>
      {onDismiss && (
        <button
          onClick={onDismiss}
          className={`shrink-0 text-sm font-medium transition-colors ${v.dismiss}`}
          aria-label="Dismiss"
        >
          ✕
        </button>
      )}
    </div>
  );
}
```

---

---
