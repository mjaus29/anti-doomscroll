# 7 — Borders, Shadows, and Visual Effects

---

## T — TL;DR

Borders (`border`, `border-*`, `rounded-*`), shadows (`shadow-*`), rings (`ring-*`), and effects (`blur-*`, `backdrop-blur-*`, `opacity-*`) handle visual depth and separation. The `ring-*` utilities are Tailwind's preferred way to show focus states — they use `outline` and avoid layout shifts.

---

## K — Key Concepts

### Borders

```tsx
{/* ─── Border width */}
<div className="border">       {/* 1px solid */}
<div className="border-0">     {/* none */}
<div className="border-2">     {/* 2px solid */}
<div className="border-4">     {/* 4px solid */}
<div className="border-8">     {/* 8px solid */}

{/* ─── Border sides */}
<div className="border-t">     {/* top only */}
<div className="border-b">     {/* bottom only */}
<div className="border-l">     {/* left only */}
<div className="border-r">     {/* right only */}
<div className="border-x">     {/* left + right */}
<div className="border-y">     {/* top + bottom */}

{/* ─── Border color */}
<div className="border border-gray-200">   {/* standard card border */}
<div className="border border-gray-300">   {/* input border */}
<div className="border border-blue-500">   {/* focused/active border */}
<div className="border border-red-400">    {/* error border */}
<div className="border border-transparent">{/* no visible border (layout) */}

{/* ─── Border style */}
<div className="border border-dashed border-gray-300">   {/* dashed */}
<div className="border border-dotted border-gray-300">   {/* dotted */}
<div className="border-2 border-solid border-gray-300">  {/* solid (default) */}

{/* ─── Divide — borders between children */}
<ul className="divide-y divide-gray-200">
  <li className="py-3">First item</li>
  <li className="py-3">Second item — border-top from divide-y</li>
  <li className="py-3">Third item</li>
</ul>
```

### Border Radius

```tsx
{/* ─── Uniform radius */}
<div className="rounded-none">   {/* 0 */}
<div className="rounded-sm">     {/* 0.125rem = 2px */}
<div className="rounded">        {/* 0.25rem = 4px */}
<div className="rounded-md">     {/* 0.375rem = 6px */}
<div className="rounded-lg">     {/* 0.5rem = 8px — cards, buttons */}
<div className="rounded-xl">     {/* 0.75rem = 12px — cards */}
<div className="rounded-2xl">    {/* 1rem = 16px — modern cards */}
<div className="rounded-3xl">    {/* 1.5rem = 24px — pill shapes */}
<div className="rounded-full">   {/* 9999px — circles, pills */}

{/* ─── Specific corners */}
<div className="rounded-t-xl">   {/* top corners */}
<div className="rounded-b-xl">   {/* bottom corners */}
<div className="rounded-l-xl">   {/* left corners */}
<div className="rounded-r-xl">   {/* right corners */}
<div className="rounded-tl-xl">  {/* top-left only */}
<div className="rounded-tr-xl">  {/* top-right only */}

{/* ─── Recipe */}
{/* Input fields:       rounded-lg */}
{/* Buttons:            rounded-lg or rounded-xl */}
{/* Cards:              rounded-xl or rounded-2xl */}
{/* Badges/pills:       rounded-full */}
{/* Profile photos:     rounded-full */}
{/* Modal dialogs:      rounded-2xl */}
```

### Box Shadows

```tsx
{/* ─── Default shadows */}
<div className="shadow-none">    {/* no shadow */}
<div className="shadow-sm">      {/* subtle shadow — inputs, small cards */}
<div className="shadow">         {/* default shadow — standard card */}
<div className="shadow-md">      {/* medium — hover card */}
<div className="shadow-lg">      {/* large — modals, dropdowns */}
<div className="shadow-xl">      {/* extra large — floating panels */}
<div className="shadow-2xl">     {/* strongest — primary CTAs */}

{/* ─── Shadow color */}
<div className="shadow-lg shadow-blue-500/25"> {/* blue-tinted shadow */}
<div className="shadow-md shadow-black/10">    {/* subtle shadow */}

{/* ─── Custom shadow (from @theme) */}
<div className="shadow-glow"> {/* → var(--shadow-glow) from globals.css */}

{/* ─── Inner shadow */}
<div className="shadow-inner"> {/* inset shadow — recessed inputs */}
```

### Ring — Focus and Outline States

```tsx
{/* ─── Ring is the CORRECT way to show focus in Tailwind */}
{/* Ring uses CSS outline (not box-shadow) — no layout shift */}

{/* ─── Ring width */}
<button className="ring-0">     {/* no ring */}
<button className="ring-1">     {/* 1px ring */}
<button className="ring-2">     {/* 2px ring — focus indicator */}
<button className="ring-4">     {/* 4px ring */}

{/* ─── Ring color */}
<button className="ring-2 ring-blue-500">    {/* blue ring */}
<button className="ring-2 ring-red-400">     {/* red error ring */}
<button className="ring-2 ring-offset-2">   {/* ring with 2px offset from element */}

{/* ─── Standard focus ring pattern */}
<button className="focus-visible:ring-2 focus-visible:ring-blue-500
                   focus-visible:ring-offset-2 focus-visible:outline-none">
  Button with accessible focus ring
</button>

{/* ─── Outline replacement */}
<input className="border border-gray-300 rounded-lg px-3 py-2
                  focus:outline-none focus:ring-2 focus:ring-blue-500
                  focus:border-transparent" />
```

### Visual Effects

```tsx
{/* ─── Blur */}
<div className="blur-none">    {/* no blur */}
<div className="blur-sm">      {/* blur: 4px */}
<div className="blur">         {/* blur: 8px */}
<div className="blur-md">      {/* blur: 12px */}
<div className="blur-lg">      {/* blur: 16px */}
<div className="blur-xl">      {/* blur: 24px */}
<div className="blur-2xl">     {/* blur: 40px */}
<div className="blur-3xl">     {/* blur: 64px */}

{/* ─── Backdrop blur (frosted glass) */}
<div className="backdrop-blur-sm">   {/* 4px — subtle */}
<div className="backdrop-blur-md">   {/* 12px — standard glass */}
<div className="backdrop-blur-xl">   {/* 24px — heavy glass */}

{/* ─── Frosted glass nav pattern */}
<nav className="bg-white/80 backdrop-blur-sm border-b border-white/20
                sticky top-0 z-40">
  Navigation
</nav>

{/* ─── Opacity */}
<div className="opacity-0">    {/* invisible */}
<div className="opacity-25">   {/* 25% */}
<div className="opacity-50">   {/* 50% */}
<div className="opacity-75">   {/* 75% */}
<div className="opacity-100">  {/* fully visible */}

{/* ─── Gradient backgrounds */}
<div className="bg-gradient-to-r from-blue-600 to-purple-600">  {/* left → right */}
<div className="bg-gradient-to-br from-blue-600 to-purple-700"> {/* top-left → bottom-right */}
<div className="bg-gradient-to-b from-white to-gray-50">        {/* top → bottom */}
<div className="bg-gradient-to-t from-black/60 to-transparent"> {/* image overlay */}
```

---

## W — Why It Matters

- `ring-*` over `outline-*` is Tailwind's approach to focus indicators — `ring-2 ring-blue-500 ring-offset-2` creates a visible, accessible focus ring using CSS outline under the hood. The `focus-visible:` variant (see subtopic 8) ensures it only shows for keyboard users, not mouse users.
- `divide-y divide-gray-200` is the clean way to add borders between list items — it adds a top border to every child except the first, replacing the need for `:not(:last-child)` margin hacks or manual `border-b` on each item except the last.
- The frosted glass pattern (`bg-white/80 backdrop-blur-md`) is ubiquitous in modern design — it creates depth without heavy shadow, and is now achievable with just two utility classes.

---

## I — Interview Q&A

### Q1: What is the difference between `shadow-*` and `ring-*` in Tailwind?

**A:** `shadow-*` applies `box-shadow` — it creates a visual shadow effect for depth and elevation (cards, modals, dropdowns). It adds to the visual layer outside the element's border-box. `ring-*` applies `outline` — it creates a ring around the element for focus/selection states. Unlike `box-shadow`, `outline` doesn't affect layout and renders outside the border-box without taking up space. The `ring-*` utilities are specifically designed for accessibility focus indicators — they're visible to keyboard users and screen reader users. Using `box-shadow` for focus indicators can create layout shifts; `ring-*` does not.

---

## C — Common Pitfalls + Fix

### ❌ Pitfall: Using `outline: none` without providing a visible focus indicator

```tsx
{
  /* ❌ Removes focus indicator entirely — accessibility violation */
}
<button className="outline-none">
  {" "}
  {/* keyboard users can't see focus */}
  Submit
</button>;
```

**Fix:** Replace with `focus-visible` ring:

```tsx
{
  /* ✅ Hides outline for mouse, shows ring for keyboard */
}
<button
  className="focus-visible:outline-none focus-visible:ring-2
                   focus-visible:ring-blue-500 focus-visible:ring-offset-2"
>
  Submit
</button>;
```

---

## K — Coding Challenge + Solution

### Challenge

Build a `<GlassCard>` component using visual effect utilities:

1. Frosted glass: `bg-white/20 backdrop-blur-md border border-white/30`
2. Gradient background on the containing section: `bg-gradient-to-br from-blue-600 to-purple-700`
3. Card shadow: `shadow-xl shadow-black/20`
4. Rounded: `rounded-2xl`
5. Title and body text in white with different opacities
6. A badge using `ring-1 ring-white/30`

### Solution

```tsx
// src/components/glass-card.tsx
export function GlassCardDemo() {
  return (
    {/* Gradient background container */}
    <div className="min-h-screen bg-gradient-to-br from-blue-600 via-purple-600
                     to-pink-600 flex items-center justify-center p-8">
      {/* Frosted glass card */}
      <div className="bg-white/20 backdrop-blur-md border border-white/30
                       rounded-2xl shadow-xl shadow-black/20 p-8 max-w-sm w-full">

        {/* Badge */}
        <span className="inline-flex items-center gap-1.5 px-3 py-1 mb-6
                          bg-white/20 ring-1 ring-white/30 rounded-full
                          text-white/90 text-xs font-semibold uppercase
                          tracking-widest">
          ✨ Featured
        </span>

        {/* Title */}
        <h2 className="text-2xl font-bold text-white leading-tight mb-3">
          Glass Morphism Card
        </h2>

        {/* Body */}
        <p className="text-white/70 text-sm leading-relaxed mb-6">
          A frosted glass effect using Tailwind's backdrop-blur and
          white opacity utilities — no custom CSS needed.
        </p>

        {/* Stats row */}
        <div className="grid grid-cols-3 gap-4 mb-6 py-4
                         border-y border-white/20">
          {[
            { label: 'Users',   value: '12K' },
            { label: 'Uptime',  value: '99.9%' },
            { label: 'Version', value: 'v4.3' }
          ].map(stat => (
            <div key={stat.label} className="text-center">
              <p className="text-lg font-bold text-white">{stat.value}</p>
              <p className="text-xs text-white/60">{stat.label}</p>
            </div>
          ))}
        </div>

        {/* CTA */}
        <button className="w-full py-2.5 bg-white text-purple-700 font-semibold
                            text-sm rounded-xl hover:bg-white/90 transition-colors
                            shadow-lg shadow-black/10">
          Get started
        </button>
      </div>
    </div>
  )
}
```

---

---
