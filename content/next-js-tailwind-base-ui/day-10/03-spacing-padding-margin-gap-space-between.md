# 3 — Spacing — Padding, Margin, Gap, Space Between

---

## T — TL;DR

Tailwind's spacing system is built on a `4px` base unit (`1` = `0.25rem` = `4px`). Use **`p-*`/`px-*`/`py-*`** for padding, **`m-*`/`mx-*`/`my-*`** for margin, **`gap-*`** for flex/grid spacing, and avoid margin between siblings — `gap` is almost always better.

---

## K — Key Concepts

### Padding — Full Reference

```tsx
{/* ─── All sides */}
<div className="p-0">     {/* padding: 0 */}
<div className="p-1">     {/* padding: 0.25rem = 4px */}
<div className="p-2">     {/* padding: 0.5rem = 8px */}
<div className="p-3">     {/* padding: 0.75rem = 12px */}
<div className="p-4">     {/* padding: 1rem = 16px — default card */}
<div className="p-5">     {/* padding: 1.25rem = 20px */}
<div className="p-6">     {/* padding: 1.5rem = 24px — comfortable card */}
<div className="p-8">     {/* padding: 2rem = 32px — section padding */}
<div className="p-10">    {/* padding: 2.5rem = 40px */}
<div className="p-12">    {/* padding: 3rem = 48px */}
<div className="p-16">    {/* padding: 4rem = 64px — hero padding */}

{/* ─── Axis shortcuts */}
<div className="px-6">    {/* padding-left + padding-right: 1.5rem */}
<div className="py-4">    {/* padding-top + padding-bottom: 1rem */}

{/* ─── Individual sides */}
<div className="pt-4">    {/* padding-top */}
<div className="pr-4">    {/* padding-right */}
<div className="pb-4">    {/* padding-bottom */}
<div className="pl-4">    {/* padding-left */}

{/* ─── Logical properties (RTL-safe) */}
<div className="ps-4">    {/* padding-inline-start (left in LTR, right in RTL) */}
<div className="pe-4">    {/* padding-inline-end */}

{/* ─── Arbitrary values */}
<div className="p-[13px]">   {/* exactly 13px */}
<div className="px-[22px]">  {/* exactly 22px horizontal */}
```

### Margin — When to Use (and When Not To)

```tsx
{/* ─── Same syntax as padding, prefix m- */}
<div className="m-4">    {/* margin: 1rem all sides */}
<div className="mx-auto">{/* margin-left: auto; margin-right: auto — CENTER ✅ */}
<div className="mt-8">   {/* margin-top: 2rem */}
<div className="mb-4">   {/* margin-bottom: 1rem */}

{/* ─── Negative margin */}
<div className="-mt-4">  {/* margin-top: -1rem (overlap elements) */}
<div className="-mx-6">  {/* negative horizontal margin (full-bleed) */}

{/* ─── ml-auto — push to end in flex row */}
<nav className="flex items-center">
  <span>Logo</span>
  <a className="ml-auto">Sign in</a>  {/* ← pushed to the right ✅ */}
</nav>

{/* ─── When NOT to use margin:
       ❌ Between flex/grid siblings — use gap instead
       ❌ For spacing inside a container — use padding
       ✅ mx-auto — centering a block element
       ✅ mt-* — vertical rhythm between document sections
       ✅ ml-auto — pushing item to end in flex
*/}
```

### Gap — The Right Way to Space Flex/Grid Children

```tsx
{/* ─── Uniform gap */}
<div className="flex gap-2">   {/* 8px between all children */}
<div className="flex gap-4">   {/* 16px between all children */}
<div className="grid grid-cols-3 gap-6"> {/* 24px between all grid cells */}

{/* ─── Separate row and column gaps */}
<div className="grid grid-cols-3 gap-x-6 gap-y-4">
  {/* 24px horizontal, 16px vertical */}
</div>

{/* ─── Why gap > margin for siblings:
   With gap:
     <div className="flex gap-4">     ← one class, works for any number of children
       <button>A</button>             ← no classes needed on children
       <button>B</button>
       <button>C</button>
     </div>

   With margin (old approach):
     <div className="flex">
       <button className="mr-4">A</button>   ← every child needs a class
       <button className="mr-4">B</button>   ← last child problem
       <button>C</button>                     ← or use first:ml-0
     </div>
*/}
```

### Space Between — Alternative for Non-Flex Containers

```tsx
{/* space-x-* adds margin-left to all children except first */}
{/* space-y-* adds margin-top to all children except first */}
{/* Use when you CANNOT use flex/gap (e.g., block elements, prose) */}

<ul className="space-y-2">
  <li>First item</li>
  <li>Second item — has margin-top: 0.5rem</li>
  <li>Third item — has margin-top: 0.5rem</li>
</ul>

<div className="space-y-8">
  <section>Section 1</section>
  <section>Section 2 — 2rem below section 1</section>
</div>

{/* Note: space-* uses the * + * CSS selector trick:
   .space-y-2 > * + * { margin-top: 0.5rem }
   This doesn't work well with hidden/conditional children
   In those cases, use flex gap-* instead
*/}
```

### Padding Patterns in Practice

```tsx
{/* ─── Button padding recipe */}
<button className="px-4 py-2 text-sm">   {/* small button */}
<button className="px-5 py-2.5 text-sm"> {/* medium button */}
<button className="px-6 py-3 text-base"> {/* large button */}

{/* ─── Card padding recipe */}
<div className="p-4">   {/* compact card */}
<div className="p-5">   {/* regular card */}
<div className="p-6">   {/* comfortable card */}
<div className="p-8">   {/* spacious card */}

{/* ─── Section padding recipe */}
<section className="px-4 py-12">   {/* mobile section */}
<section className="px-6 py-16">   {/* tablet section */}
<section className="px-8 py-20">   {/* desktop section */}

{/* ─── Page layout padding */}
<div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
  {/* Standard responsive container */}
</div>
```

---

## W — Why It Matters

- `mx-auto` is the standard way to center a block element horizontally — it sets both margins to `auto`, which equally distributes remaining space. It must be paired with a `max-width` class to work.
- `gap` is universally preferred over `margin` for spacing flex/grid children — it's a single class, works for any number of children, handles last-child correctly without `:last-child` selectors, and doesn't require knowing the layout direction.
- The `4px` base unit creates a visual rhythm — when everything is a multiple of 4px, the design looks internally consistent. Learning the `p-4 = 16px`, `p-8 = 32px`, `p-16 = 64px` anchors lets you estimate spacing values by eye.

---

## I — Interview Q&A

### Q1: What is the difference between `padding` and `margin` in Tailwind and when should you use each?

**A:** Padding (`p-*`, `px-*`, `py-*`) is internal space — between the element's border and its content. Use it to control how much breathing room content has inside a box (cards, buttons, sections). Margin (`m-*`, `mx-*`, `my-*`) is external space — between the element's border and neighboring elements. Use margin sparingly: `mx-auto` to center a block, `ml-auto` to push an element to the end of a flex row, or `mt-*` for vertical rhythm between document sections. For spacing between flex/grid children, use `gap` instead of margin — it's simpler and avoids the last-child problem.

### Q2: Why is `gap` preferred over `space-x-*`/`space-y-*` in Tailwind?

**A:** `gap` is a proper CSS Grid/Flexbox property that adds space between grid/flex tracks — it's understood by the layout algorithm and works correctly regardless of wrapping, direction changes, or hidden children. `space-x-*`/`space-y-*` use the CSS adjacent sibling selector (`* + *`) to add margin to all children except the first — this breaks with hidden/conditionally rendered children (a hidden child creates a visible gap), doesn't work with `flex-wrap` correctly, and requires knowing the layout direction upfront. Use `gap` whenever you have a flex or grid container; use `space-y-*` only for non-flex block elements like article sections.

---

## C — Common Pitfalls + Fix

### ❌ Pitfall: Using `space-y-*` with conditionally rendered children

```tsx
{
  /* ❌ Hidden child leaves unexpected gap */
}
<div className="space-y-4">
  <div>Always visible</div>
  {condition && <div className="hidden">Hidden element</div>}
  {/* ↑ .space-y-4 > * + * still adds margin-top to the next sibling
       even when this div is display:none — visual gap appears */}
  <div>Also always visible — has unexpected gap above it</div>
</div>;
```

**Fix:** Use `flex flex-col gap-4` for conditional children:

```tsx
{
  /* ✅ gap respects display:none and conditional rendering */
}
<div className="flex flex-col gap-4">
  <div>Always visible</div>
  {condition && <div>Conditionally visible</div>}
  <div>No unexpected gap ✅</div>
</div>;
```

---

## K — Coding Challenge + Solution

### Challenge

Build a `<PricingCard>` component using ONLY spacing utilities:

1. Card container: `p-8` padding, with inner content stack using `space-y-6`
2. Header section: icon + title side by side with `gap-3`, `items-center`
3. Price display: large number + period/cycle below, using `mt-2`
4. Features list: `space-y-3` with checkmark icon + text using `gap-2`
5. CTA button: full width, `mt-8`, `py-3`
6. A "most popular" absolute badge: `-top-3` positioned, `px-4 py-1`

### Solution

```tsx
// src/components/pricing-card.tsx
interface Feature {
  label: string;
  included: boolean;
}

interface PricingCardProps {
  plan: string;
  price: number;
  cycle: string;
  features: Feature[];
  popular?: boolean;
  icon: string;
}

export function PricingCard({
  plan,
  price,
  cycle,
  features,
  popular = false,
  icon,
}: PricingCardProps) {
  return (
    <div
      className={`relative p-8 rounded-2xl border-2 ${
        popular
          ? "border-blue-600 bg-blue-600 text-white"
          : "border-gray-200 bg-white text-gray-900"
      }`}
    >
      {/* Most popular badge — absolute, -top-3 overlap */}
      {popular && (
        <span
          className="absolute -top-3 left-1/2 -translate-x-1/2
                         px-4 py-1 bg-blue-500 text-white text-xs
                         font-bold uppercase tracking-widest rounded-full
                         whitespace-nowrap"
        >
          Most popular
        </span>
      )}

      {/* Inner content — vertical stack */}
      <div className="space-y-6">
        {/* Header: icon + plan name */}
        <div className="flex items-center gap-3">
          <span className="text-2xl shrink-0">{icon}</span>
          <h3
            className={`text-lg font-bold ${
              popular ? "text-white" : "text-gray-900"
            }`}
          >
            {plan}
          </h3>
        </div>

        {/* Price block */}
        <div>
          <div className="flex items-baseline gap-1">
            <span className="text-5xl font-extrabold">${price}</span>
            <span
              className={`text-sm ${popular ? "text-blue-200" : "text-gray-500"}`}
            >
              / {cycle}
            </span>
          </div>
          <p
            className={`text-sm mt-2 ${popular ? "text-blue-200" : "text-gray-500"}`}
          >
            Billed annually · cancel anytime
          </p>
        </div>

        {/* Features list */}
        <ul className="space-y-3">
          {features.map((f) => (
            <li
              key={f.label}
              className={`flex items-start gap-2 text-sm ${
                !f.included && (popular ? "opacity-50" : "text-gray-400")
              }`}
            >
              <span
                className={`shrink-0 mt-0.5 ${
                  f.included
                    ? popular
                      ? "text-blue-200"
                      : "text-green-500"
                    : "text-gray-300"
                }`}
              >
                {f.included ? "✓" : "✕"}
              </span>
              <span>{f.label}</span>
            </li>
          ))}
        </ul>

        {/* CTA button — mt-8 separates it from features */}
        <button
          className={`w-full py-3 rounded-xl font-semibold text-sm
                            transition-colors mt-8 ${
                              popular
                                ? "bg-white text-blue-600 hover:bg-blue-50"
                                : "bg-blue-600 text-white hover:bg-blue-700"
                            }`}
        >
          Get started with {plan}
        </button>
      </div>
    </div>
  );
}
```

---

---
