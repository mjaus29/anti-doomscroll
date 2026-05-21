# 11 — Composing Interfaces — Building Real UI from Utility Primitives

---

## T — TL;DR

Real UI composition means layering Tailwind utilities — layout + spacing + typography + color + states + responsiveness + dark mode — into cohesive components. The patterns: **card anatomy**, **form anatomy**, **data table**, **modal**, and **empty state** are the five building blocks that compose most production interfaces.

---

## K — Key Concepts

### Component Anatomy — Thinking in Layers

```
Every component = stacking utility layers in order:

Layer 1: Layout    → flex/grid, position, display
Layer 2: Sizing    → width, height, max-w, aspect ratio
Layer 3: Spacing   → padding, margin, gap
Layer 4: Visual    → bg, border, radius, shadow
Layer 5: Typography→ text size, weight, color
Layer 6: States    → hover, focus, active, disabled
Layer 7: Motion    → transition, transform, animation
Layer 8: Responsive→ sm:, md:, lg: prefixes
Layer 9: Dark mode → dark: prefix or CSS variables

Build one layer at a time — don't try to write all classes at once
```

### Pattern 1 — Complete Card Anatomy

```tsx
// src/components/product-card.tsx
// Every class annotated with its layer

import Image from "next/image";

interface ProductCardProps {
  name: string;
  price: number;
  category: string;
  imageUrl: string;
  rating: number;
  reviewCount: number;
  isNew?: boolean;
  inStock: boolean;
}

export function ProductCard({
  name,
  price,
  category,
  imageUrl,
  rating,
  reviewCount,
  isNew,
  inStock,
}: ProductCardProps) {
  return (
    // Layer 1+3+4+7: layout, padding context, visual, hover lift animation
    <article
      className="group flex flex-col bg-white dark:bg-gray-800
                         border border-gray-200 dark:border-gray-700
                         rounded-2xl overflow-hidden
                         hover:-translate-y-0.5 hover:shadow-lg
                         dark:hover:shadow-none dark:hover:ring-1
                         dark:hover:ring-gray-600
                         transition-all duration-200 ease-out"
    >
      {/* Image area — Layer 1+2+4 */}
      <div
        className="relative aspect-square overflow-hidden bg-gray-50
                       dark:bg-gray-900"
      >
        <Image
          src={imageUrl}
          alt={`Photo of ${name}`}
          fill
          className="object-cover group-hover:scale-105
                      transition-transform duration-300 ease-out"
          sizes="(max-width: 640px) 100vw,
                 (max-width: 1024px) 50vw,
                 33vw"
        />

        {/* "New" badge — Layer 1+2+3+4+5 */}
        {isNew && (
          <span
            className="absolute top-3 left-3
                            px-2.5 py-1
                            bg-blue-600 dark:bg-blue-500
                            text-white
                            text-xs font-semibold
                            rounded-full"
          >
            New
          </span>
        )}

        {/* Out of stock overlay — Layer 1+4+5 */}
        {!inStock && (
          <div
            className="absolute inset-0 bg-white/70 dark:bg-gray-900/70
                           backdrop-blur-[2px] flex items-center justify-center"
          >
            <span
              className="text-sm font-semibold text-gray-500
                              dark:text-gray-400 bg-white dark:bg-gray-800
                              border border-gray-200 dark:border-gray-700
                              px-3 py-1 rounded-full"
            >
              Out of stock
            </span>
          </div>
        )}
      </div>

      {/* Content area — Layer 3 */}
      <div className="flex flex-col flex-1 p-4 gap-2">
        {/* Category label — Layer 5 */}
        <span
          className="text-xs font-semibold uppercase tracking-widest
                           text-blue-600 dark:text-blue-400"
        >
          {category}
        </span>

        {/* Name — Layer 5 */}
        <h3
          className="text-gray-900 dark:text-white font-semibold text-base
                         leading-snug line-clamp-2 text-balance"
        >
          {name}
        </h3>

        {/* Rating row — Layer 1+5 */}
        <div className="flex items-center gap-1.5">
          <span className="text-amber-400 text-sm">
            {"★".repeat(Math.round(rating))}
            {"☆".repeat(5 - Math.round(rating))}
          </span>
          <span className="text-xs text-gray-400 dark:text-gray-500">
            ({reviewCount})
          </span>
        </div>

        {/* Price + CTA row — Layer 1+6 (pushed to bottom with mt-auto) */}
        <div
          className="flex items-center justify-between mt-auto pt-3
                          border-t border-gray-100 dark:border-gray-700"
        >
          <span className="text-lg font-bold text-gray-900 dark:text-white">
            ${price}
          </span>
          <button
            disabled={!inStock}
            className="px-3 py-1.5 bg-blue-600 dark:bg-blue-500 text-white
                        text-xs font-semibold rounded-lg
                        hover:bg-blue-700 dark:hover:bg-blue-400
                        active:scale-95 disabled:opacity-40
                        disabled:cursor-not-allowed
                        transition-all duration-150
                        focus-visible:outline-none focus-visible:ring-2
                        focus-visible:ring-blue-500 focus-visible:ring-offset-2"
          >
            Add to cart
          </button>
        </div>
      </div>
    </article>
  );
}
```

### Pattern 2 — Form Anatomy

```tsx
// src/components/contact-form.tsx
// Complete form with label, input, error, textarea, select, submit

interface FormFieldProps {
  id: string;
  label: string;
  error?: string;
  required?: boolean;
  children: React.ReactNode;
}

function FormField({ id, label, error, required, children }: FormFieldProps) {
  return (
    <div className="flex flex-col gap-1.5">
      <label
        htmlFor={id}
        className="text-sm font-medium text-gray-700 dark:text-gray-300"
      >
        {label}
        {required && (
          <span className="text-red-500 ml-0.5" aria-hidden>
            *
          </span>
        )}
      </label>

      {children}

      {error && (
        <p
          id={`${id}-error`}
          role="alert"
          className="text-xs text-red-600 dark:text-red-400 flex items-center gap-1"
        >
          <span aria-hidden>⚠</span> {error}
        </p>
      )}
    </div>
  );
}

// Shared input class string — used across input/textarea/select
const inputBase = `
  w-full px-3 py-2.5 text-sm rounded-xl
  bg-white dark:bg-gray-900
  border border-gray-300 dark:border-gray-600
  text-gray-900 dark:text-white
  placeholder:text-gray-400 dark:placeholder:text-gray-500
  focus:outline-none focus:ring-2 focus:ring-blue-500
  focus:border-transparent dark:focus:ring-blue-400
  transition-colors duration-150
`
  .replace(/\s+/g, " ")
  .trim();

const inputError = `
  border-red-400 dark:border-red-500
  focus:ring-red-400 dark:focus:ring-red-500
`
  .replace(/\s+/g, " ")
  .trim();

export function ContactForm() {
  return (
    <form
      className="max-w-lg mx-auto bg-white dark:bg-gray-800
                      border border-gray-200 dark:border-gray-700
                      rounded-2xl p-6 sm:p-8 space-y-5 shadow-sm"
    >
      {/* Header */}
      <div className="space-y-1">
        <h2 className="text-xl font-bold text-gray-900 dark:text-white">
          Contact us
        </h2>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          We'll get back to you within 24 hours.
        </p>
      </div>

      {/* Name row — side-by-side on sm+ */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <FormField id="first-name" label="First name" required>
          <input
            id="first-name"
            name="firstName"
            type="text"
            placeholder="Mark"
            className={inputBase}
          />
        </FormField>

        <FormField id="last-name" label="Last name" required>
          <input
            id="last-name"
            name="lastName"
            type="text"
            placeholder="Austin"
            className={inputBase}
          />
        </FormField>
      </div>

      {/* Email — with error state */}
      <FormField
        id="email"
        label="Email address"
        required
        error="Please enter a valid email address."
      >
        <input
          id="email"
          name="email"
          type="email"
          placeholder="mark@example.com"
          className={`${inputBase} ${inputError}`}
          aria-describedby="email-error"
          aria-invalid="true"
        />
      </FormField>

      {/* Subject select */}
      <FormField id="subject" label="Subject">
        <select
          id="subject"
          name="subject"
          className={`${inputBase} cursor-pointer`}
        >
          <option value="">Choose a topic...</option>
          <option value="support">Technical support</option>
          <option value="billing">Billing inquiry</option>
          <option value="general">General question</option>
          <option value="feedback">Product feedback</option>
        </select>
      </FormField>

      {/* Message textarea */}
      <FormField id="message" label="Message" required>
        <textarea
          id="message"
          name="message"
          rows={4}
          placeholder="Describe your question in detail..."
          className={`${inputBase} resize-none`}
        />
      </FormField>

      {/* Submit button + loading state */}
      <button
        type="submit"
        className="w-full py-3 bg-blue-600 dark:bg-blue-500 text-white
                          font-semibold text-sm rounded-xl
                          hover:bg-blue-700 dark:hover:bg-blue-400
                          active:scale-[0.98] transition-all duration-150
                          focus-visible:outline-none focus-visible:ring-2
                          focus-visible:ring-blue-500 focus-visible:ring-offset-2
                          disabled:opacity-50 disabled:cursor-not-allowed"
      >
        Send message
      </button>

      <p className="text-center text-xs text-gray-400 dark:text-gray-500">
        By submitting you agree to our{" "}
        <a
          href="#"
          className="underline underline-offset-2
                                hover:text-gray-600 dark:hover:text-gray-300
                                transition-colors"
        >
          privacy policy
        </a>
        .
      </p>
    </form>
  );
}
```

### Pattern 3 — Data Table Anatomy

```tsx
// src/components/data-table.tsx

interface Column<T> {
  key: keyof T;
  header: string;
  align?: "left" | "right" | "center";
  render?: (value: T[keyof T], row: T) => React.ReactNode;
}

interface DataTableProps<T> {
  columns: Column<T>[];
  rows: T[];
  caption?: string;
}

const ALIGN = {
  left: "text-left",
  right: "text-right",
  center: "text-center",
};

export function DataTable<T extends { id: string | number }>({
  columns,
  rows,
  caption,
}: DataTableProps<T>) {
  return (
    <div
      className="overflow-x-auto rounded-2xl border border-gray-200
                     dark:border-gray-700 bg-white dark:bg-gray-800"
    >
      <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
        {caption && (
          <caption
            className="px-6 py-3 text-left text-xs text-gray-500
                               dark:text-gray-400"
          >
            {caption}
          </caption>
        )}

        {/* Head */}
        <thead className="bg-gray-50 dark:bg-gray-900/50">
          <tr>
            {columns.map((col) => (
              <th
                key={String(col.key)}
                scope="col"
                className={`px-6 py-3 text-xs font-semibold
                               text-gray-500 dark:text-gray-400
                               uppercase tracking-wider
                               ${ALIGN[col.align ?? "left"]}`}
              >
                {col.header}
              </th>
            ))}
          </tr>
        </thead>

        {/* Body */}
        <tbody className="divide-y divide-gray-100 dark:divide-gray-700/50">
          {rows.length === 0 ? (
            <tr>
              <td
                colSpan={columns.length}
                className="px-6 py-12 text-center text-sm
                              text-gray-400 dark:text-gray-500"
              >
                No data to display.
              </td>
            </tr>
          ) : (
            rows.map((row, rowIndex) => (
              <tr
                key={row.id}
                className={`transition-colors hover:bg-blue-50/50
                               dark:hover:bg-gray-700/30
                               ${
                                 rowIndex % 2 === 0
                                   ? ""
                                   : "bg-gray-50/50 dark:bg-gray-900/20"
                               }`}
              >
                {columns.map((col) => (
                  <td
                    key={String(col.key)}
                    className={`px-6 py-4 text-sm text-gray-700
                                   dark:text-gray-300 whitespace-nowrap
                                   ${ALIGN[col.align ?? "left"]}`}
                  >
                    {col.render
                      ? col.render(row[col.key], row)
                      : String(row[col.key] ?? "—")}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
```

### Pattern 4 — Modal Anatomy

```tsx
// src/components/modal.tsx
"use client";

import { useEffect, useRef } from "react";

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  size?: "sm" | "md" | "lg";
}

const SIZES = {
  sm: "max-w-sm",
  md: "max-w-md",
  lg: "max-w-2xl",
};

export function Modal({
  isOpen,
  onClose,
  title,
  children,
  size = "md",
}: ModalProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const el = dialogRef.current;
    if (!el) return;
    if (isOpen) el.showModal();
    else el.close();
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    /* Fixed full-screen backdrop */
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      role="presentation"
    >
      {/* Backdrop — click to close */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm
                       animate-in fade-in duration-200"
        onClick={onClose}
        aria-hidden
      />

      {/* Dialog panel */}
      <div
        className={`relative w-full ${SIZES[size]}
                        bg-white dark:bg-gray-800
                        border border-gray-200 dark:border-gray-700
                        rounded-2xl shadow-2xl
                        flex flex-col max-h-[90vh]
                        animate-in zoom-in-95 duration-200`}
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
      >
        {/* Header */}
        <div
          className="flex items-center justify-between
                          px-6 py-4 border-b border-gray-100
                          dark:border-gray-700 shrink-0"
        >
          <h2
            id="modal-title"
            className="text-lg font-semibold text-gray-900 dark:text-white"
          >
            {title}
          </h2>
          <button
            onClick={onClose}
            className="size-8 rounded-lg flex items-center justify-center
                        text-gray-400 dark:text-gray-500
                        hover:bg-gray-100 dark:hover:bg-gray-700
                        hover:text-gray-700 dark:hover:text-gray-300
                        transition-colors duration-150
                        focus-visible:outline-none focus-visible:ring-2
                        focus-visible:ring-blue-500"
            aria-label="Close modal"
          >
            ✕
          </button>
        </div>

        {/* Scrollable body */}
        <div className="overflow-y-auto flex-1 px-6 py-5">{children}</div>

        {/* Footer slot — children can include this via composition */}
      </div>
    </div>
  );
}
```

### Pattern 5 — Empty State Anatomy

```tsx
// src/components/empty-state.tsx

interface EmptyStateProps {
  icon: string;
  title: string;
  description: string;
  action?: { label: string; onClick: () => void };
  secondaryAction?: { label: string; href: string };
}

export function EmptyState({
  icon,
  title,
  description,
  action,
  secondaryAction,
}: EmptyStateProps) {
  return (
    <div
      className="flex flex-col items-center justify-center
                     text-center py-16 px-6 max-w-sm mx-auto"
    >
      {/* Icon container */}
      <div
        className="size-16 rounded-2xl bg-gray-100 dark:bg-gray-800
                       flex items-center justify-center text-3xl mb-5
                       border border-gray-200 dark:border-gray-700"
      >
        {icon}
      </div>

      {/* Title */}
      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
        {title}
      </h3>

      {/* Description */}
      <p
        className="text-sm text-gray-500 dark:text-gray-400
                     leading-relaxed text-pretty mb-6"
      >
        {description}
      </p>

      {/* Actions */}
      <div className="flex flex-col sm:flex-row gap-3">
        {action && (
          <button
            onClick={action.onClick}
            className="px-5 py-2.5 bg-blue-600 dark:bg-blue-500 text-white
                        font-semibold text-sm rounded-xl
                        hover:bg-blue-700 dark:hover:bg-blue-400
                        active:scale-[0.98] transition-all duration-150
                        focus-visible:outline-none focus-visible:ring-2
                        focus-visible:ring-blue-500 focus-visible:ring-offset-2"
          >
            {action.label}
          </button>
        )}
        {secondaryAction && (
          <a
            href={secondaryAction.href}
            className="px-5 py-2.5 border border-gray-300 dark:border-gray-600
                         text-gray-700 dark:text-gray-300 font-semibold text-sm
                         rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800
                         active:scale-[0.98] transition-all duration-150
                         text-center"
          >
            {secondaryAction.label}
          </a>
        )}
      </div>
    </div>
  );
}
```

### Composing a Full Page from Primitives

```tsx
// src/app/products/page.tsx — full page using all Day 10 patterns
import { ProductCard } from "@/components/product-card";
import { EmptyState } from "@/components/empty-state";

const MOCK_PRODUCTS = [
  {
    id: "p1",
    name: "Air Max 90",
    price: 120,
    category: "Footwear",
    imageUrl: "/products/airmax.jpg",
    rating: 4.5,
    reviewCount: 128,
    isNew: true,
    inStock: true,
  },
  {
    id: "p2",
    name: "Canvas Tote",
    price: 45,
    category: "Bags",
    imageUrl: "/products/tote.jpg",
    rating: 4.2,
    reviewCount: 34,
    isNew: false,
    inStock: true,
  },
  {
    id: "p3",
    name: "Wool Cap",
    price: 35,
    category: "Headwear",
    imageUrl: "/products/cap.jpg",
    rating: 3.8,
    reviewCount: 18,
    isNew: false,
    inStock: false,
  },
  {
    id: "p4",
    name: "Leather Belt",
    price: 65,
    category: "Belts",
    imageUrl: "/products/belt.jpg",
    rating: 4.7,
    reviewCount: 55,
    isNew: true,
    inStock: true,
  },
  {
    id: "p5",
    name: "Denim Jacket",
    price: 195,
    category: "Outerwear",
    imageUrl: "/products/jacket.jpg",
    rating: 4.9,
    reviewCount: 89,
    isNew: false,
    inStock: true,
  },
  {
    id: "p6",
    name: "Silk Scarf",
    price: 80,
    category: "Scarves",
    imageUrl: "/products/scarf.jpg",
    rating: 4.3,
    reviewCount: 12,
    isNew: true,
    inStock: false,
  },
];

export default function ProductsPage() {
  const hasProducts = MOCK_PRODUCTS.length > 0;

  return (
    // Page uses CSS variable bg — auto dark mode, no dark: needed here
    <div className="min-h-screen bg-[--color-bg]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        {/* Page header — responsive */}
        <div
          className="flex flex-col sm:flex-row sm:items-center
                          sm:justify-between gap-4 mb-8"
        >
          <div>
            <h1
              className="text-2xl sm:text-3xl font-extrabold
                            text-[--color-text] tracking-tight"
            >
              Products
            </h1>
            <p className="text-sm text-[--color-text-muted] mt-1">
              {MOCK_PRODUCTS.length} items
            </p>
          </div>

          <div className="flex items-center gap-3">
            {/* Filter chips */}
            <div
              className="flex items-center gap-2 overflow-x-auto
                             pb-1 scrollbar-hide"
            >
              {["All", "Footwear", "Bags", "Outerwear"].map((filter, i) => (
                <button
                  key={filter}
                  className={`shrink-0 px-3 py-1.5 text-xs font-semibold
                                     rounded-full transition-colors duration-150 ${
                                       i === 0
                                         ? "bg-blue-600 text-white"
                                         : "bg-[--color-surface-alt] text-[--color-text-muted] hover:text-[--color-text] border border-[--color-border]"
                                     }`}
                >
                  {filter}
                </button>
              ))}
            </div>

            {/* Add product button */}
            <button
              className="shrink-0 px-4 py-2 bg-blue-600 dark:bg-blue-500
                                text-white text-sm font-semibold rounded-xl
                                hover:bg-blue-700 dark:hover:bg-blue-400
                                transition-colors focus-visible:outline-none
                                focus-visible:ring-2 focus-visible:ring-blue-500
                                focus-visible:ring-offset-2"
            >
              + Add product
            </button>
          </div>
        </div>

        {/* Product grid or empty state */}
        {hasProducts ? (
          <div
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3
                           xl:grid-cols-4 gap-5 sm:gap-6"
          >
            {MOCK_PRODUCTS.map((product) => (
              <ProductCard key={product.id} {...product} />
            ))}
          </div>
        ) : (
          <div
            className="bg-[--color-surface] rounded-2xl border
                           border-[--color-border] py-4"
          >
            <EmptyState
              icon="📦"
              title="No products yet"
              description="Add your first product to start building your catalog."
              action={{ label: "+ Add first product", onClick: () => {} }}
              secondaryAction={{ label: "Import CSV", href: "/import" }}
            />
          </div>
        )}
      </div>
    </div>
  );
}
```

---

## W — Why It Matters

- Real UI composition is never about individual utilities — it's about understanding the **anatomy of a component**: image area → content area → action area. Each area has a predictable set of utility layers. Once you know the anatomy, you can build any variant of it (small card, large card, horizontal card) by adjusting the same layers.
- The **shared input class string** pattern (storing the base input classes in a `const` and concatenating with error/disabled variants) is the right balance between Tailwind utilities and maintainability — without creating a full CSS component or a custom plugin.
- Composing dark mode with CSS variables at the page/section level (rather than on each component) is the architectural decision that makes large apps maintainable — components use semantic variable names (`text-[--color-text-muted]`) that are always correct in both themes, rather than parallel `text-gray-500 dark:text-gray-400` declarations.

---

## I — Interview Q&A

### Q1: How do you handle a large number of repeated Tailwind utility classes across many similar elements without using `@apply`?

**A:** The cleanest pattern is to extract the class strings to JavaScript constants or small component wrappers. For example, a shared `inputBase` string constant that's concatenated with variant-specific classes — `className={${inputBase} ${hasError ? inputError : ''}}`. For structural patterns (card, button, badge) extract a React component that accepts variant props and maps them to class strings. For very large apps, a helper like `cva` (class-variance-authority) provides typed variant management without moving styles to CSS. The goal is to keep styles co-located with markup in JSX, not extracted to CSS files.

### Q2: Walk me through how you would build a card component with a hover lift effect in Tailwind.

**A:** Layer by layer: first layout — `flex flex-col` for vertical stacking; then sizing — `max-w-sm w-full`; then visual — `bg-white border border-gray-200 rounded-2xl overflow-hidden`; then the hover lift — `hover:-translate-y-0.5 hover:shadow-lg`; then motion — `transition-all duration-200 ease-out` to animate the transform and shadow change smoothly. For dark mode, add `dark:bg-gray-800 dark:border-gray-700 dark:hover:shadow-none dark:hover:ring-1 dark:hover:ring-gray-600` — swapping shadow for a ring because shadows aren't visible on dark backgrounds. The image inside gets `group-hover:scale-105 transition-transform duration-300` on the parent's `group` class for a subtle zoom.

---

## C — Common Pitfalls + Fix

### ❌ Pitfall: Writing all classes in one long string — unreadable and unmaintainable

```tsx
{
  /* ❌ All on one line — impossible to read, review, or debug */
}
<button className="inline-flex items-center justify-center px-6 py-3 bg-blue-600 text-white font-semibold rounded-xl hover:bg-blue-700 active:scale-95 transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed dark:bg-blue-500 dark:hover:bg-blue-400">
  Submit
</button>;
```

**Fix:** Break into logical groups — one layer per line:

```tsx
{
  /* ✅ Layered, readable, reviewable */
}
<button
  className="
  inline-flex items-center justify-center
  px-6 py-3
  bg-blue-600 dark:bg-blue-500 text-white font-semibold rounded-xl
  hover:bg-blue-700 dark:hover:bg-blue-400
  active:scale-95
  transition-all duration-150
  focus-visible:outline-none focus-visible:ring-2
  focus-visible:ring-blue-500 focus-visible:ring-offset-2
  disabled:opacity-50 disabled:cursor-not-allowed
"
>
  Submit
</button>;
```

### ❌ Pitfall: Using inline `style` for colors that should be Tailwind classes

```tsx
{
  /* ❌ Bypasses Tailwind's dark mode, hover states, and responsive variants */
}
<div style={{ backgroundColor: "#2563eb", color: "white" }}>Button</div>;
```

**Fix:** Use Tailwind utilities — get dark mode, hover, and responsive support for free:

```tsx
{
  /* ✅ All Tailwind — dark: hover: and sm: work on this */
}
<div
  className="bg-blue-600 dark:bg-blue-500 text-white
                 hover:bg-blue-700 dark:hover:bg-blue-400"
>
  Button
</div>;
```

### ❌ Pitfall: Not using `overflow-hidden` on rounded containers with images

```tsx
{
  /* ❌ Image corners bleed outside the rounded card */
}
<div className="rounded-2xl border">
  <img src="/photo.jpg" className="w-full" />
  {/* Image corners are square — they overflow the rounded card */}
</div>;
```

**Fix:**

```tsx
{
  /* ✅ overflow-hidden clips the image to the rounded corners */
}
<div className="rounded-2xl border overflow-hidden">
  <img src="/photo.jpg" className="w-full" />
</div>;
```

---

## K — Coding Challenge + Solution

### Challenge

Build a complete `<ProfileCard>` component that combines ALL Day 10 concepts:

1. **Layout:** flex column, image on top, content below
2. **Sizing:** `max-w-xs`, `aspect-square` image, `size-16` avatar
3. **Spacing:** `p-6`, `gap-3`, `space-y-2`
4. **Typography:** display name `text-xl font-bold`, bio `text-sm leading-relaxed line-clamp-3`, username `text-xs uppercase tracking-wider`
5. **Colors:** brand accent badge, gray muted text
6. **Borders/shadows:** `rounded-2xl`, `shadow-md`, `ring-*` on avatar
7. **States:** follow button with `hover:`, `active:scale-95`, `focus-visible:ring-*`
8. **Responsive:** stacks vertically on mobile, horizontal on `sm:`
9. **Dark mode:** `dark:` classes OR CSS variables throughout
10. **Composition:** group hover showing social links

### Solution

```tsx
// src/components/profile-card.tsx
interface SocialLink {
  platform: string;
  url: string;
  icon: string;
}

interface ProfileCardProps {
  name: string;
  username: string;
  bio: string;
  avatarUrl: string;
  coverUrl?: string;
  role: string;
  followers: number;
  following: number;
  isFollowing: boolean;
  socials: SocialLink[];
}

export function ProfileCard({
  name,
  username,
  bio,
  avatarUrl,
  role,
  followers,
  following,
  isFollowing,
  socials,
}: ProfileCardProps) {
  return (
    // 1. Layout + 6. Visual + 8. Responsive
    <article
      className="group max-w-xs w-full
                          flex flex-col
                          bg-white dark:bg-gray-800
                          border border-gray-200 dark:border-gray-700
                          rounded-2xl shadow-md dark:shadow-none
                          dark:ring-1 dark:ring-gray-700
                          overflow-hidden
                          hover:-translate-y-0.5
                          hover:shadow-xl dark:hover:shadow-none
                          dark:hover:ring-blue-800
                          transition-all duration-200 ease-out"
    >
      {/* Cover gradient area */}
      <div
        className="h-20 bg-gradient-to-br from-blue-500 via-purple-500
                       to-pink-500 relative shrink-0"
      >
        {/* Role badge */}
        <span
          className="absolute bottom-2 right-3
                           px-2.5 py-0.5 text-[10px] font-bold uppercase
                           tracking-wider text-white/90
                           bg-black/30 backdrop-blur-sm rounded-full"
        >
          {role}
        </span>
      </div>

      {/* Content area */}
      <div className="flex flex-col flex-1 p-5">
        {/* Avatar — overlaps the cover */}
        <div
          className="relative size-16 rounded-full overflow-hidden
                          ring-4 ring-white dark:ring-gray-800
                          shadow-md -mt-10 mb-3 shrink-0 bg-gray-200"
        >
          {/* Placeholder avatar */}
          <div
            className="size-full bg-gradient-to-br from-blue-400 to-purple-500
                            flex items-center justify-center
                            text-2xl font-bold text-white"
          >
            {name.charAt(0)}
          </div>
        </div>

        {/* Name + username */}
        <div className="space-y-0.5 mb-3">
          <h3
            className="text-xl font-bold text-gray-900 dark:text-white
                           leading-tight tracking-tight"
          >
            {name}
          </h3>
          {/* 5. Typography: username label */}
          <p
            className="text-xs font-semibold uppercase tracking-wider
                           text-blue-600 dark:text-blue-400"
          >
            @{username}
          </p>
        </div>

        {/* Bio — line-clamp-3 */}
        <p
          className="text-sm text-gray-500 dark:text-gray-400
                        leading-relaxed line-clamp-3 text-pretty mb-4 flex-1"
        >
          {bio}
        </p>

        {/* Stats row */}
        <div
          className="flex gap-4 pb-4 mb-4 border-b border-gray-100
                          dark:border-gray-700"
        >
          <div className="text-center">
            <p className="text-base font-bold text-gray-900 dark:text-white">
              {followers >= 1000
                ? `${(followers / 1000).toFixed(1)}K`
                : followers}
            </p>
            <p className="text-xs text-gray-400 dark:text-gray-500">
              Followers
            </p>
          </div>
          <div className="text-center">
            <p className="text-base font-bold text-gray-900 dark:text-white">
              {following}
            </p>
            <p className="text-xs text-gray-400 dark:text-gray-500">
              Following
            </p>
          </div>
        </div>

        {/* Social links — hidden, revealed on group-hover */}
        <div
          className="flex items-center gap-2 mb-4
                          opacity-0 group-hover:opacity-100
                          -translate-y-1 group-hover:translate-y-0
                          transition-all duration-200 ease-out h-8"
        >
          {socials.map((s) => (
            <a
              key={s.platform}
              href={s.url}
              aria-label={s.platform}
              className="size-8 rounded-lg flex items-center justify-center
                            text-gray-400 dark:text-gray-500 text-base
                            bg-gray-100 dark:bg-gray-700
                            hover:bg-blue-100 dark:hover:bg-blue-900/40
                            hover:text-blue-600 dark:hover:text-blue-400
                            transition-colors duration-150
                            focus-visible:outline-none focus-visible:ring-2
                            focus-visible:ring-blue-500"
            >
              {s.icon}
            </a>
          ))}
        </div>

        {/* Follow button — 7. States + 9. Dark mode */}
        <button
          className={`w-full py-2.5 text-sm font-semibold rounded-xl
                        transition-all duration-150 active:scale-[0.98]
                        focus-visible:outline-none focus-visible:ring-2
                        focus-visible:ring-offset-2
                        ${
                          isFollowing
                            ? `bg-gray-100 dark:bg-gray-700
                             text-gray-700 dark:text-gray-300
                             hover:bg-red-50 dark:hover:bg-red-900/30
                             hover:text-red-600 dark:hover:text-red-400
                             hover:border-red-200 dark:hover:border-red-800
                             border border-gray-200 dark:border-gray-600
                             focus-visible:ring-gray-400`
                            : `bg-blue-600 dark:bg-blue-500 text-white
                             hover:bg-blue-700 dark:hover:bg-blue-400
                             focus-visible:ring-blue-500`
                        }`}
        >
          {isFollowing ? "Following" : "Follow"}
        </button>
      </div>
    </article>
  );
}

// ─── Usage demo ───────────────────────────────────────────────────────────────
export function ProfileCardDemo() {
  return (
    <div
      className="min-h-screen bg-[--color-bg] flex items-center
                     justify-center p-8"
    >
      <ProfileCard
        name="Mark Austin"
        username="markaustria97"
        bio="Full-stack developer building with Next.js, TypeScript, and Tailwind. Currently working through a 70-day curriculum to go from zero to production."
        avatarUrl="/avatar.jpg"
        role="Developer"
        followers={4820}
        following={312}
        isFollowing={false}
        socials={[
          { platform: "GitHub", url: "#", icon: "🐙" },
          { platform: "Twitter", url: "#", icon: "𝕏" },
          { platform: "LinkedIn", url: "#", icon: "💼" },
        ]}
      />
    </div>
  );
}
```

---

## ✅ Day 10 Complete — Tailwind CSS v4.3 Fundamentals

| #   | Subtopic                                                         | Status |
| --- | ---------------------------------------------------------------- | ------ |
| 1   | Utility-First Workflow — Mental Model, Setup, `@apply`           | ☐      |
| 2   | Layout — Flexbox, Grid, Positioning, z-index, overflow           | ☐      |
| 3   | Spacing — Padding, Margin, Gap, Space Between                    | ☐      |
| 4   | Sizing — Width, Height, Min/Max, Aspect Ratio                    | ☐      |
| 5   | Typography — Font Size, Weight, Line Height, Tracking, Alignment | ☐      |
| 6   | Colors — Text, Background, Border, Opacity, CSS Variables        | ☐      |
| 7   | Borders, Shadows, and Visual Effects                             | ☐      |
| 8   | Hover, Focus, and Interactive States                             | ☐      |
| 9   | Responsive Variants — Mobile-First Breakpoints                   | ☐      |
| 10  | Dark Mode — `dark:` Variant, CSS Variable Strategy               | ☐      |
| 11  | Composing Interfaces — Building Real UI from Utility Primitives  | ☐      |

---

## 🗺️ The One-Page Mental Model — Everything From Day 10

```
SETUP (v4.3)
  Entry point:     @import "tailwindcss" in globals.css (one import only)
  Config:          @theme {} in CSS — replaces tailwind.config.js
  Custom colors:   --color-brand-600: #2563eb → bg-brand-600 ✅
  Custom spacing:  --spacing-18: 4.5rem → p-18, gap-18 ✅
  Custom fonts:    --font-display: var(--font-playfair) → font-display ✅
  Custom utils:    @layer utilities { .text-balance { text-wrap: balance } }
  @apply:          Last resort for 10+ repeated patterns — use sparingly

LAYOUT
  flex / grid:     flex row (default), flex-col, grid grid-cols-3
  flex alignment:  items-center (cross axis), justify-between (main axis)
  gap:             gap-4, gap-x-6, gap-y-2 — ALWAYS prefer over margin between siblings
  grid patterns:   grid-cols-[repeat(auto-fill,minmax(280px,1fr))] — responsive with NO breakpoints
  positioning:     relative → absolute child, sticky top-0, fixed inset-0
  z-index:         z-10/20/30/40/50 (nav=40, modal=50, toast=60)
  shrink-0:        CRITICAL on icons/avatars in flex rows — prevents distortion
  min-w-0:         CRITICAL on flex text children — enables truncate to work
  overflow:        overflow-hidden (clip), overflow-x-auto (scroll), overflow-y-auto

SPACING
  Scale:           1 unit = 0.25rem = 4px
  Memorize:        p-4=16px, p-8=32px, p-12=48px, p-16=64px
  Padding:         p-* px-* py-* pt-* pr-* pb-* pl-*
  Margin:          mx-auto (center), ml-auto (push right), mt-8 (vertical rhythm)
  Gap:             gap-* gap-x-* gap-y-* — between flex/grid children
  space-y-*:       Only for block element stacks — NOT for conditional children

SIZING
  Widths:          w-full (100%), w-screen (100vw), w-auto, w-1/2, w-64 (16rem)
  Heights:         h-screen (100vh), min-h-screen (grow), h-fit, h-px (1px divider)
  dvh:             h-dvh — dynamic viewport height (mobile browser chrome aware)
  Max-width:       max-w-7xl (1280px page), max-w-prose (65ch reading), max-w-sm/md/lg
  Aspect ratio:    aspect-square (1:1), aspect-video (16:9), aspect-[4/3]
  size-*:          size-10 = w-10 h-10 — clean square element shorthand

TYPOGRAPHY
  Size scale:      xs=12px sm=14px base=16px lg=18px xl=20px 2xl=24px 3xl=30px 4xl=36px 5xl=48px
  Weight:          normal(400), medium(500), semibold(600), bold(700), extrabold(800)
  Line height:     leading-tight (headings), leading-relaxed (body), leading-none (display)
  Tracking:        tracking-tight (large headings), tracking-widest (uppercase labels)
  Overflow:        truncate (1 line), line-clamp-2/3 (multi-line), min-w-0 (required on parent)
  Wrapping:        text-balance (headings), text-pretty (body)

COLORS
  Scale:           50 (lightest) → 950 (darkest) per color family
  Common:          -600 for interactive, -50 for light bg, -200 for borders, -900 for dark text
  Opacity:         bg-blue-600/50 — NOT opacity-50 (opacity affects children too)
  Status:          green=success, red=error, amber=warning, blue=info
  CSS vars:        bg-[--color-surface], text-[--color-text] — semantic + auto dark mode

BORDERS & EFFECTS
  Border:          border (1px), border-2, border-gray-200
  Divide:          divide-y divide-gray-200 — borders between list children
  Radius:          rounded-lg (8px), rounded-xl (12px), rounded-2xl (16px), rounded-full (pill)
  Shadow:          shadow-sm (inputs), shadow-md (cards), shadow-lg (modals)
  Ring:            ring-2 ring-blue-500 ring-offset-2 — use for focus, NOT shadow
  Dark shadows:    shadow-none dark:ring-1 dark:ring-gray-700 (shadows invisible on dark bg)
  Effects:         backdrop-blur-md + bg-white/80 = frosted glass
  Gradient:        bg-gradient-to-r from-blue-600 to-purple-600

STATES
  hover:           hover:bg-blue-700 hover:scale-105 hover:-translate-y-1
  focus-visible:   focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2
                   ALWAYS prefer over focus: — keyboard only, not mouse
  active:          active:scale-95 active:scale-[0.98]
  disabled:        disabled:opacity-50 disabled:cursor-not-allowed
  group:           group on parent, group-hover: on child — no JS needed
  peer:            peer on input, peer-checked:/peer-invalid: on sibling — custom checkboxes
  transition:      transition-colors duration-150 on every interactive element

RESPONSIVE (mobile-first)
  Breakpoints:     sm:640px md:768px lg:1024px xl:1280px 2xl:1536px
  Rule:            No prefix = ALL sizes. sm: = 640px AND ABOVE (not only at 640px)
  Common patterns: grid-cols-1 sm:grid-cols-2 lg:grid-cols-3
                   flex-col sm:flex-row
                   text-3xl sm:text-4xl lg:text-5xl
                   hidden md:block / block md:hidden
  Container:       max-w-7xl mx-auto px-4 sm:px-6 lg:px-8

DARK MODE
  Strategy A:      @variant dark (&:where(.dark,.dark *)) + class toggle via JS
  Strategy B:      media query (default) — no JS, follows OS setting
  dark: classes:   dark:bg-gray-800 dark:text-white dark:border-gray-700
  CSS vars:        Define :root and .dark vars → use bg-[--color-surface] → zero dark: needed
  FOUC:            Add inline script in <html> before React to prevent flash
  suppressHydrationWarning: always on <html> element in Next.js

COMPOSITION LAYERS (build in this order)
  1. Layout        flex/grid, position
  2. Sizing        w-* h-* max-w-* aspect-*
  3. Spacing       p-* gap-* mx-auto
  4. Visual        bg-* border-* rounded-* shadow-*
  5. Typography    text-* font-* leading-* tracking-*
  6. States        hover: focus-visible: active: disabled:
  7. Motion        transition-* duration-* ease-*
  8. Responsive    sm: md: lg: prefixes
  9. Dark mode     dark: or CSS variables

5 CORE PATTERNS
  Card:       flex flex-col + overflow-hidden + rounded-2xl + hover lift
  Form:       shared inputBase const + error variant + FormField wrapper
  Table:      divide-y + overflow-x-auto + odd:bg-gray-50 + hover:bg-blue-50
  Modal:      fixed inset-0 z-50 + backdrop + animate-in zoom-in-95
  Empty:      flex flex-col items-center text-center + icon + CTA
```

---

> **Your next action:** Open your current project. Find any component with `style={{ backgroundColor: '...', color: '...' }}` inline styles. Replace them with Tailwind color utilities. Add `transition-colors duration-150` to any button that's missing it. Then add `hover:-translate-y-0.5 hover:shadow-md transition-all duration-200` to one card component. Run the dev server and watch the hover effect.
>
> _Doing one small thing beats opening a feed._
