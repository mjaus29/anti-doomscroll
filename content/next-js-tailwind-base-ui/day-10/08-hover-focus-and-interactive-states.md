# 8 — Hover, Focus, and Interactive States

---

## T — TL;DR

Tailwind uses **variant prefixes** (`hover:`, `focus:`, `focus-visible:`, `active:`, `disabled:`, `group-hover:`) to apply styles conditionally. These are pseudo-class utilities — no JavaScript needed. Use `focus-visible:` for accessibility-correct focus rings and `group` + `group-hover:` for parent-triggered child styles.

---

## K — Key Concepts

### Core State Variants

```tsx
{/* ─── hover: — on mouse hover */}
<button className="bg-blue-600 hover:bg-blue-700">   {/* darken on hover */}
<a      className="text-gray-600 hover:text-gray-900 hover:underline">
<div    className="opacity-80 hover:opacity-100">

{/* ─── focus: — when focused (keyboard or mouse) */}
<input  className="border border-gray-300 focus:border-blue-500 focus:outline-none
                   focus:ring-2 focus:ring-blue-500/20" />

{/* ─── focus-visible: — ONLY when focused via keyboard (not mouse) */}
<button className="focus-visible:ring-2 focus-visible:ring-blue-500
                   focus-visible:ring-offset-2 focus-visible:outline-none">
  Keyboard-accessible button
</button>

{/* ─── active: — while being clicked */}
<button className="active:scale-95 active:bg-blue-800">

{/* ─── disabled: — when element has disabled attribute */}
<button disabled
        className="disabled:opacity-50 disabled:cursor-not-allowed
                   disabled:pointer-events-none">

{/* ─── visited: — visited links */}
<a className="text-blue-600 visited:text-purple-600">

{/* ─── placeholder: — input placeholder text */}
<input className="placeholder:text-gray-400 placeholder:text-sm" />

{/* ─── selection: — selected text */}
<p className="selection:bg-blue-600 selection:text-white">

{/* ─── first: last: odd: even: — list children */}
<ul>
  {items.map((item, i) => (
    <li key={i}
        className="py-2 first:pt-0 last:pb-0 odd:bg-gray-50 even:bg-white">
      {item}
    </li>
  ))}
</ul>
```

### Transition Utilities — Smooth State Changes

```tsx
{/* ─── transition: controls WHICH properties animate */}
<div className="transition">           {/* all: color, bg, border, opacity, shadow, transform */}
<div className="transition-colors">    {/* only color/background/border */}
<div className="transition-opacity">   {/* only opacity */}
<div className="transition-transform"> {/* only transform */}
<div className="transition-shadow">    {/* only box-shadow */}
<div className="transition-all">       {/* literally everything (expensive) */}
<div className="transition-none">      {/* disable transitions */}

{/* ─── Duration */}
<div className="duration-75">    {/* 75ms */}
<div className="duration-100">   {/* 100ms */}
<div className="duration-150">   {/* 150ms — fast interaction */}
<div className="duration-200">   {/* 200ms — standard */}
<div className="duration-300">   {/* 300ms — entering elements */}
<div className="duration-500">   {/* 500ms — slow/dramatic */}

{/* ─── Easing */}
<div className="ease-linear">   {/* linear */}
<div className="ease-in">       {/* starts slow */}
<div className="ease-out">      {/* ends slow (good for entering) */}
<div className="ease-in-out">   {/* both (good for state changes) */}

{/* ─── Standard interactive button */}
<button className="bg-blue-600 text-white px-6 py-3 rounded-xl font-semibold
                   hover:bg-blue-700 active:scale-[0.97] transition-all
                   duration-150 ease-in-out focus-visible:ring-2
                   focus-visible:ring-blue-500 focus-visible:ring-offset-2
                   focus-visible:outline-none disabled:opacity-50
                   disabled:cursor-not-allowed">
  Submit
</button>
```

### Transform Utilities for Interactions

```tsx
{/* ─── Scale */}
<div className="hover:scale-105">    {/* grow on hover */}
<div className="hover:scale-110">    {/* more growth */}
<div className="active:scale-95">    {/* shrink on click */}
<div className="hover:scale-[1.02]">{/* subtle scale */}

{/* ─── Translate */}
<div className="hover:-translate-y-1">  {/* lift up 4px */}
<div className="hover:translate-x-1">   {/* nudge right */}
<div className="hover:-translate-y-0.5 hover:shadow-md transition-all">
  {/* card lift effect */}
</div>

{/* ─── Rotate */}
<div className="hover:rotate-6">    {/* rotate 6deg */}
<div className="hover:-rotate-3">   {/* rotate -3deg */}
```

### `group` — Parent-Triggered Child Styles

```tsx
{
  /* group on parent, group-hover: on child */
}
{
  /* Hover the parent → children with group-hover: respond */
}

<div
  className="group flex items-center gap-3 p-4 rounded-xl
                hover:bg-blue-50 transition-colors cursor-pointer"
>
  {/* Icon changes color on parent hover */}
  <span
    className="text-gray-400 group-hover:text-blue-600 transition-colors
                   text-xl shrink-0"
  >
    📧
  </span>
  {/* Text changes on parent hover */}
  <div className="min-w-0">
    <p
      className="font-medium text-gray-900 group-hover:text-blue-700
                  transition-colors"
    >
      Email
    </p>
    <p
      className="text-sm text-gray-500 group-hover:text-blue-500
                  transition-colors truncate"
    >
      mark@example.com
    </p>
  </div>
  {/* Arrow slides right on parent hover */}
  <span
    className="ml-auto text-gray-300 group-hover:text-blue-500
                   group-hover:translate-x-1 transition-all shrink-0"
  >
    →
  </span>
</div>;

{
  /* ─── Nested groups (group/{name}) */
}
<div className="group/card border rounded-xl p-4 hover:border-blue-500">
  <div className="group/action flex gap-2 opacity-0 group-hover/card:opacity-100">
    <button className="group-hover/action:bg-blue-100">Edit</button>
    <button className="group-hover/action:bg-red-100">Delete</button>
  </div>
</div>;
```

### `peer` — Sibling-Triggered Styles

```tsx
{/* peer on an element, peer-* on a sibling AFTER it */}
{/* Useful for: checkbox states, input validation, radio groups */}

{/* ─── Custom checkbox */}
<label className="flex items-center gap-3 cursor-pointer">
  <input
    type="checkbox"
    className="peer sr-only"   {/* visually hidden but functional */}
  />
  {/* Custom checkbox visual — responds to peer state */}
  <span className="w-5 h-5 border-2 border-gray-300 rounded
                   peer-checked:bg-blue-600 peer-checked:border-blue-600
                   peer-focus-visible:ring-2 peer-focus-visible:ring-blue-500
                   flex items-center justify-center transition-colors">
    <span className="text-white text-xs opacity-0 peer-checked:opacity-100">
      ✓
    </span>
  </span>
  <span className="text-sm text-gray-700 peer-checked:text-blue-700
                   peer-checked:font-medium">
    Accept terms
  </span>
</label>

{/* ─── Input validation state */}
<div>
  <input
    type="email"
    className="peer w-full border rounded-lg px-3 py-2
               focus:outline-none focus:ring-2 focus:ring-blue-500
               invalid:border-red-400 invalid:focus:ring-red-400"
    required
  />
  <p className="mt-1 text-xs text-red-500 hidden peer-invalid:block">
    Please enter a valid email address.
  </p>
</div>
```

---

## W — Why It Matters

- `focus-visible:` is the accessibility-correct alternative to `focus:` — `focus:` shows focus rings for both mouse and keyboard users (looks wrong for mouse), `focus-visible:` only shows for keyboard navigation. This is the modern standard, removing the need to write `outline: none` while keeping keyboard accessibility intact.
- `group-hover:` eliminates the need for JavaScript-driven hover effects on parent elements — no `useState`, no event handlers, no re-renders. A hover effect that reveals child elements is pure CSS via `group` + `group-hover:opacity-100`.
- `peer-checked:` for custom checkbox and radio styling replaces JavaScript-controlled checked state tracking — a custom checkbox that responds to the `checked` state of a real `<input type="checkbox">` is now achievable with pure Tailwind utilities.

---

## I — Interview Q&A

### Q1: What is the difference between `focus:` and `focus-visible:` variants in Tailwind?

**A:** `focus:` applies styles whenever the element receives focus — both from keyboard navigation (Tab key) and mouse click. `focus-visible:` applies styles only when the browser determines the focus indicator should be shown based on the user's input modality — typically keyboard navigation but not mouse clicks. For accessibility, you should replace `focus:outline-none` with `focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500` — this removes the distracting outline for mouse users (who can see what they clicked) while maintaining a clear focus indicator for keyboard users who need to know where focus is.

### Q2: How does `group` work in Tailwind and what problem does it solve?

**A:** Adding `group` to a parent element creates a named scope for child styles. Child elements can then use `group-hover:`, `group-focus:`, `group-active:` variants to apply styles when the parent receives that state — without JavaScript. This solves the problem of "hover over a card to reveal its action buttons" or "hover over a list item to change the arrow color" — traditionally requiring JavaScript event handlers. With `group`, you add the class to the container and `group-hover:opacity-100` to the hidden child — pure CSS, zero JavaScript.

---

## C — Common Pitfalls + Fix

### ❌ Pitfall: Forgetting `transition-colors` and having jarring instant state changes

```tsx
{
  /* ❌ Instant color change — looks glitchy */
}
<button className="bg-blue-600 hover:bg-blue-700">Submit</button>;
```

**Fix:** Add transition utilities:

```tsx
{
  /* ✅ Smooth 150ms transition */
}
<button
  className="bg-blue-600 hover:bg-blue-700
                   transition-colors duration-150"
>
  Submit
</button>;
```

---

## K — Coding Challenge + Solution

### Challenge

Build a `<FeatureRow>` list component where:

1. Parent row uses `group` with `hover:bg-blue-50 transition-colors`
2. Icon changes from `text-gray-400` to `text-blue-600` on `group-hover:`
3. Arrow icon slides right on `group-hover:` using `translate-x-1`
4. Action buttons use `opacity-0 group-hover:opacity-100 transition-opacity`
5. A checkbox using `peer` and `peer-checked:` for custom styling
6. All state transitions use `duration-150 ease-in-out`

### Solution

```tsx
// src/components/feature-row.tsx
"use client";

import { useState } from "react";

interface FeatureRowProps {
  icon: string;
  title: string;
  description: string;
  onEdit?: () => void;
  onDelete?: () => void;
}

export function FeatureRow({
  icon,
  title,
  description,
  onEdit,
  onDelete,
}: FeatureRowProps) {
  return (
    <div
      className="group flex items-center gap-4 px-4 py-4 rounded-xl
                     hover:bg-blue-50 transition-colors duration-150 ease-in-out
                     cursor-pointer border border-transparent
                     hover:border-blue-100"
    >
      {/* Icon — changes color on parent hover */}
      <span
        className="shrink-0 text-2xl text-gray-400 group-hover:text-blue-600
                        transition-colors duration-150 ease-in-out"
      >
        {icon}
      </span>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <p
          className="font-semibold text-gray-900 group-hover:text-blue-800
                       transition-colors duration-150"
        >
          {title}
        </p>
        <p
          className="text-sm text-gray-500 group-hover:text-blue-600/70
                       transition-colors duration-150 truncate"
        >
          {description}
        </p>
      </div>

      {/* Action buttons — hidden, revealed on group-hover */}
      <div
        className="flex items-center gap-1 opacity-0 group-hover:opacity-100
                       transition-opacity duration-150 ease-in-out shrink-0"
      >
        <button
          onClick={(e) => {
            e.stopPropagation();
            onEdit?.();
          }}
          className="px-2.5 py-1 text-xs font-medium text-blue-600 bg-blue-100
                      rounded-lg hover:bg-blue-200 active:scale-95
                      transition-all duration-150 focus-visible:outline-none
                      focus-visible:ring-2 focus-visible:ring-blue-500"
        >
          Edit
        </button>
        <button
          onClick={(e) => {
            e.stopPropagation();
            onDelete?.();
          }}
          className="px-2.5 py-1 text-xs font-medium text-red-600 bg-red-50
                      rounded-lg hover:bg-red-100 active:scale-95
                      transition-all duration-150 focus-visible:outline-none
                      focus-visible:ring-2 focus-visible:ring-red-400"
        >
          Delete
        </button>
      </div>

      {/* Arrow — slides right on group-hover */}
      <span
        className="shrink-0 text-gray-300 group-hover:text-blue-400
                        group-hover:translate-x-1 transition-all duration-150
                        ease-in-out"
      >
        →
      </span>
    </div>
  );
}

// ─── Custom checkbox using peer ─────────────────────────────────────────────

interface CheckboxProps {
  label: string;
  id: string;
  defaultChecked?: boolean;
}

export function CustomCheckbox({ label, id, defaultChecked }: CheckboxProps) {
  return (
    <label
      htmlFor={id}
      className="flex items-center gap-3 cursor-pointer select-none group"
    >
      {/* Real input — visually hidden but accessible */}
      <input
        id={id}
        type="checkbox"
        defaultChecked={defaultChecked}
        className="peer sr-only"
      />

      {/* Custom checkbox visual — responds to peer state */}
      <span
        className="relative flex shrink-0 size-5 items-center justify-center
                        rounded border-2 border-gray-300 bg-white
                        transition-colors duration-150 ease-in-out
                        peer-checked:border-blue-600 peer-checked:bg-blue-600
                        peer-focus-visible:ring-2 peer-focus-visible:ring-blue-500
                        peer-focus-visible:ring-offset-2
                        group-hover:border-blue-400"
      >
        {/* Checkmark — hidden until checked */}
        <svg
          className="size-3 text-white opacity-0 peer-checked:opacity-100
                     transition-opacity duration-150 absolute"
          viewBox="0 0 12 12"
          fill="none"
          style={{ pointerEvents: "none" }}
        >
          <path
            d="M2 6l3 3 5-5"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </span>

      {/* Label text — changes on checked */}
      <span
        className="text-sm text-gray-700 transition-colors duration-150
                        peer-checked:text-blue-700 peer-checked:font-medium"
      >
        {label}
      </span>
    </label>
  );
}

// ─── Demo page ───────────────────────────────────────────────────────────────

export function InteractiveStatesDemo() {
  const features = [
    {
      icon: "📧",
      title: "Email notifications",
      description: "Get notified via email for every event",
    },
    {
      icon: "🔔",
      title: "Push notifications",
      description: "Instant alerts on your devices",
    },
    {
      icon: "📊",
      title: "Analytics dashboard",
      description: "Real-time insights and reporting",
    },
    {
      icon: "🔒",
      title: "Two-factor auth",
      description: "Extra security for your account",
    },
  ];

  return (
    <div className="max-w-lg mx-auto px-4 py-10 space-y-8">
      {/* Feature rows */}
      <div
        className="bg-white border border-gray-200 rounded-2xl overflow-hidden
                       divide-y divide-gray-100"
      >
        {features.map((f) => (
          <FeatureRow
            key={f.title}
            {...f}
            onEdit={() => alert(`Edit: ${f.title}`)}
            onDelete={() => alert(`Delete: ${f.title}`)}
          />
        ))}
      </div>

      {/* Custom checkboxes using peer */}
      <div className="bg-white border border-gray-200 rounded-2xl p-6 space-y-4">
        <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wider">
          Preferences
        </h3>
        <CustomCheckbox
          id="emails"
          label="Receive marketing emails"
          defaultChecked
        />
        <CustomCheckbox id="updates" label="Product update notifications" />
        <CustomCheckbox id="security" label="Security alerts" defaultChecked />
      </div>
    </div>
  );
}

/*
  State variants used:
  group + group-hover:     → parent hover triggers child styles (no JS) ✅
  peer + peer-checked:     → sibling state drives custom checkbox visuals ✅
  focus-visible:ring-*     → keyboard-only focus ring (accessibility) ✅
  active:scale-95          → button press feedback ✅
  transition-* duration-*  → smooth 150ms animations ✅
  opacity-0 + group-hover:opacity-100 → reveal on hover ✅
  translate-x-1 on hover   → directional nudge feedback ✅
*/
```

---

---
