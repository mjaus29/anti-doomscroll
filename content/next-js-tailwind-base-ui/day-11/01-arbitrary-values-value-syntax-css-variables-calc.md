# 1 — Arbitrary Values — `[value]` Syntax, CSS Variables, Calc

---

## T — TL;DR

Arbitrary values (`[value]`) let you use **any CSS value** that isn't in Tailwind's scale — exact pixel sizes, custom CSS variables, `calc()` expressions, or any design token your project needs — without leaving the utility-first workflow.

---

## K — Key Concepts

### Basic Arbitrary Value Syntax

```tsx
{/* ─── Syntax: utility-[value] */}
{/* Square brackets accept ANY valid CSS value for that property */}

{/* Sizing */}
<div className="w-[340px]">         {/* width: 340px */}
<div className="h-[calc(100vh-56px)]"> {/* height: calc(100vh - 56px) */}
<div className="max-w-[1440px]">    {/* max-width: 1440px */}
<div className="min-h-[480px]">     {/* min-height: 480px */}

{/* Spacing */}
<div className="p-[13px]">          {/* padding: 13px */}
<div className="mt-[72px]">         {/* margin-top: 72px */}
<div className="gap-[18px]">        {/* gap: 18px */}

{/* Typography */}
<p className="text-[13px]">         {/* font-size: 13px */}
<p className="text-[1.1rem]">       {/* font-size: 1.1rem */}
<p className="leading-[1.4]">       {/* line-height: 1.4 */}
<p className="tracking-[0.02em]">   {/* letter-spacing: 0.02em */}

{/* Colors */}
<div className="bg-[#1a2b3c]">      {/* exact hex color */}
<div className="bg-[rgb(26,43,60)]">{/* exact rgb color */}
<div className="text-[hsl(220,50%,30%)]"> {/* exact hsl */}

{/* Border radius */}
<div className="rounded-[10px]">    {/* border-radius: 10px */}
<div className="rounded-[50%]">     {/* ellipse */}
<div className="rounded-[4px_12px]">{/* top-left/top-right/... shorthand */}

{/* Z-index */}
<div className="z-[99]">            {/* z-index: 99 */}
<div className="z-[999]">           {/* z-index: 999 */}
```

### CSS Variables Inside Arbitrary Values

```tsx
{/* ─── Reference CSS custom properties */}
{/* Syntax: utility-[--variable-name] OR utility-[var(--variable-name)] */}

<div className="bg-[--color-brand]">
  {/* background-color: var(--color-brand) */}
</div>

<div className="text-[--color-text-muted]">
  {/* color: var(--color-text-muted) */}
</div>

<div className="border-[--color-border]">
  {/* border-color: var(--color-border) */}
</div>

{/* With opacity modifier */}
<div className="bg-[--color-brand]/20">
  {/* background-color: color-mix(in oklch, var(--color-brand) 20%, transparent) */}
</div>

{/* Using var() explicitly for complex expressions */}
<div className="w-[calc(var(--sidebar-width)+2rem)]">
  {/* width: calc(var(--sidebar-width) + 2rem) */}
</div>

{/* ─── Runtime CSS variables (set via style prop) */}
<div
  style={{ '--card-height': '320px' } as React.CSSProperties}
  className="h-[--card-height] relative"
>
  {/* height dynamically set via CSS variable */}
</div>
```

### `calc()` and Complex Expressions

```tsx
{/* ─── calc() inside arbitrary values */}
<div className="h-[calc(100vh-3.5rem)]">
  {/* Full height minus a 56px nav bar */}
</div>

<div className="w-[calc(100%-2rem)]">
  {/* Full width minus 32px for padding */}
</div>

<div className="max-w-[calc(65ch+2rem)]">
  {/* Prose width plus some breathing room */}
</div>

<div className="top-[calc(50%-1.5rem)]">
  {/* Center minus half of element's height */}
</div>

{/* ─── min() and max() */}
<div className="w-[min(100%,400px)]">
  {/* width: min(100%, 400px) — responsive, never exceeds 400px */}
</div>

<div className="p-[clamp(1rem,5vw,3rem)]">
  {/* Fluid padding: min 1rem, max 3rem, fluid in between */}
</div>

{/* ─── env() for safe areas (mobile notch) */}
<div className="pb-[env(safe-area-inset-bottom)]">
  {/* Extra bottom padding for iPhone notch/home indicator */}
</div>
```

### Arbitrary Values with Breakpoints and States

```tsx
{
  /* ─── Arbitrary values work with ALL variants */
}

{
  /* Responsive */
}
<div className="w-[280px] md:w-[360px] lg:w-[420px]">
  Grows at each breakpoint
</div>;

{
  /* Hover */
}
<div className="hover:translate-y-[-3px]">
  {" "}
  {/* or hover:-translate-y-[3px] */}
  Lifts slightly on hover
</div>;

{
  /* Dark mode */
}
<div className="bg-[#ffffff] dark:bg-[#0f172a]">Exact hex per theme</div>;

{
  /* Combined */
}
<div
  className="text-[13px] sm:text-[14px] dark:text-[#f8fafc]
                hover:text-[#1d4ed8] transition-colors"
>
  All variants work on arbitrary values ✅
</div>;
```

### Disambiguating Ambiguous Values

```tsx
{/* ─── When Tailwind can't tell which property the value belongs to */}
{/* Use the CSS property prefix to clarify */}

{/* bg-[#red] could mean background-color or background shorthand */}
{/* Use the full property name if ambiguous */}
<div className="bg-[url('/hero.jpg')]">      {/* background: url('/hero.jpg') */}
<div className="bg-[image:url('/bg.svg')]">  {/* background-image: url('/bg.svg') */}

{/* text-[1rem] = font-size, text-[hsl(0,0,0)] = color */}
{/* Tailwind infers from value format — but you can force it: */}
<p className="text-[length:1.2rem]">         {/* forces font-size interpretation */}
<p className="text-[color:#1a2b3c]">         {/* forces color interpretation */}

{/* Underscore → space (Tailwind convention) */}
<div className="grid-cols-[1fr_2fr_1fr]">
  {/* grid-template-columns: 1fr 2fr 1fr */}
  {/* Underscore _ becomes a space in the CSS value */}
</div>

<div className="bg-[url('/image_with_spaces.jpg')]">
  {/* Use _ for literal spaces in values */}
</div>

{/* Font family with spaces */}
<p className="font-['Playfair_Display']">
  {/* font-family: 'Playfair Display' */}
</p>
```

### Common Arbitrary Value Recipes

```tsx
{
  /* ─── Sidebar layout with exact width */
}
<div className="grid grid-cols-[260px_1fr]">
  <aside>Sidebar</aside>
  <main>Content</main>
</div>;

{
  /* ─── Three-column with named proportions */
}
<div className="grid grid-cols-[1fr_2fr_1fr]">
  <aside>Left</aside>
  <main>Center (double width)</main>
  <aside>Right</aside>
</div>;

{
  /* ─── Absolutely centered with known size */
}
<div
  className="absolute top-[50%] left-[50%]
                -translate-x-[50%] -translate-y-[50%]"
>
  {/* Perfectly centered regardless of parent size */}
</div>;

{
  /* ─── Fluid container */
}
<div className="w-[min(100%,1280px)] mx-auto px-[max(1rem,5vw)]">
  {/* Never wider than 1280px, responsive horizontal padding */}
</div>;

{
  /* ─── Banner with exact background position */
}
<div className="bg-[url('/hero.jpg')] bg-[center_top_20%] bg-cover">
  {/* Shift background position to show face/subject */}
</div>;
```

---

## W — Why It Matters

- Arbitrary values are the escape hatch that makes Tailwind practical on real projects — design systems, third-party integrations, and one-off requirements always produce values outside the default scale. Without arbitrary values, Tailwind would force you back to a separate CSS file for every exception.
- The `calc()` pattern for `h-[calc(100vh-3.5rem)]` is one of the most used in real Next.js apps — sticky navbars create fixed-height headers, and every page's content area needs to fill the remaining viewport height without a scroll glitch.
- CSS variable arbitrary values (`bg-[--color-brand]`) bridge Tailwind's utility system with runtime values — you can dynamically change a CSS variable via JavaScript and every element using that variable in an arbitrary value updates instantly with no class changes.

---

## I — Interview Q&A

### Q1: What are arbitrary values in Tailwind and when should you use them?

**A:** Arbitrary values let you use any CSS value within a utility class by wrapping it in square brackets — `w-[340px]`, `bg-[#1a2b3c]`, `h-[calc(100vh-56px)]`. Use them when the design requires a specific value not in Tailwind's default scale, when integrating with a third-party component that needs exact sizing, when referencing CSS custom properties (`bg-[--color-brand]`), or when using CSS functions like `calc()`, `min()`, `max()`, or `clamp()`. They should not be used as a way to avoid learning the scale — if you find yourself repeatedly using `w-[16px]`, that's `w-4` and you should use the named utility instead.

### Q2: How do you include a space inside an arbitrary value in Tailwind?

**A:** Replace spaces with underscores (`_`) inside arbitrary values. Tailwind converts underscores to spaces in the generated CSS. For example, `grid-cols-[1fr_2fr_1fr]` generates `grid-template-columns: 1fr 2fr 1fr`, and `font-['Playfair_Display']` generates `font-family: 'Playfair Display'`. The one exception is when the underscore must be a literal underscore — in that case Tailwind provides no escaping mechanism, so you'd need to use a CSS custom property instead.

---

## C — Common Pitfalls + Fix

### ❌ Pitfall: Using arbitrary values for values that already exist in the scale

```tsx
{/* ❌ These all have named equivalents — use those instead */}
<div className="p-[16px]">   {/* = p-4 */}
<div className="w-[256px]">  {/* = w-64 */}
<div className="gap-[24px]"> {/* = gap-6 */}
<div className="text-[14px]">{/* = text-sm */}

{/* Using arbitrary values for scale values hurts:
    - Readability (p-4 is faster to parse than p-[16px])
    - Consistency (teammates might use p-4, creating duplicates in the bundle)
    - Tooling (IDE autocomplete suggests named values, not arbitrary)
*/}
```

**Fix:** Use named utilities for values on the scale:

```tsx
{/* ✅ Named utilities for scale values */}
<div className="p-4 w-64 gap-6 text-sm">
```

### ❌ Pitfall: Spaces inside arbitrary values break the class entirely

```tsx
{/* ❌ Space inside brackets — Tailwind can't parse this */}
<div className="grid-cols-[1fr 2fr 1fr]">
{/* The space terminates the class — Tailwind reads "grid-cols-[1fr" as a class */}
```

**Fix:** Use underscores for spaces:

```tsx
{/* ✅ Underscore becomes space in generated CSS */}
<div className="grid-cols-[1fr_2fr_1fr]">
```

---

## K — Coding Challenge + Solution

### Challenge

Build a `<SplitLayout>` component using ONLY arbitrary values where appropriate:

1. Grid: left sidebar exactly `260px`, right main `1fr`
2. Sidebar height: `calc(100vh - 3.5rem)` (sticky below 56px nav)
3. A header with `clamp(1.5rem, 3vw, 2.5rem)` fluid font size
4. A decorative div with background `url('/pattern.svg')` centered, exact `bg-[center_top]`
5. A badge with exact border-radius `rounded-[6px]` and color `bg-[#f0fdf4]`
6. Main content max-width `min(100%, 72ch)`

### Solution

```tsx
// src/components/split-layout.tsx

interface SplitLayoutProps {
  sidebarContent: React.ReactNode;
  mainContent: React.ReactNode;
  title: string;
}

export function SplitLayout({
  sidebarContent,
  mainContent,
  title,
}: SplitLayoutProps) {
  return (
    // Full page grid: 260px sidebar + 1fr main
    <div className="grid grid-cols-[260px_1fr] min-h-screen">
      {/* Sidebar — sticky, fills remaining viewport below 56px nav */}
      <aside
        className="sticky top-14 h-[calc(100vh-3.5rem)]
                         bg-white dark:bg-gray-900
                         border-r border-gray-200 dark:border-gray-800
                         overflow-y-auto"
      >
        <div className="p-[18px]">{sidebarContent}</div>
      </aside>

      {/* Main area */}
      <main className="bg-gray-50 dark:bg-gray-950 p-8 overflow-y-auto">
        {/* Fluid heading */}
        <h1
          className="text-[clamp(1.5rem,3vw,2.5rem)] font-extrabold
                         text-gray-900 dark:text-white leading-tight
                         tracking-tight mb-6"
        >
          {title}
        </h1>

        {/* Decorative hero band with bg image */}
        <div
          className="relative h-[180px] rounded-2xl overflow-hidden mb-8
                          bg-[url('/pattern.svg')] bg-[center_top]
                          bg-[length:400px_auto] bg-repeat
                          bg-[#f0f9ff] dark:bg-[#0c1a2e]"
        >
          <div
            className="absolute inset-0 bg-gradient-to-r
                            from-white/60 dark:from-gray-950/60
                            to-transparent"
          />
          {/* Badge */}
          <span
            className="absolute top-4 left-4
                             px-3 py-1 rounded-[6px]
                             bg-[#f0fdf4] dark:bg-[#052e16]
                             text-[#166534] dark:text-[#4ade80]
                             text-xs font-semibold border
                             border-[#bbf7d0] dark:border-[#14532d]"
          >
            ✓ Active
          </span>
        </div>

        {/* Content — constrained to readable width */}
        <div className="w-[min(100%,72ch)]">{mainContent}</div>
      </main>
    </div>
  );
}
```

---

---
