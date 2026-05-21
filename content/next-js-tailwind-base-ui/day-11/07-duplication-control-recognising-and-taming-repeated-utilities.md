# 7 — Duplication Control — Recognising and Taming Repeated Utilities

---

## T — TL;DR

Duplication in Tailwind is a feature until it isn't — the same 15-class string copy-pasted across 20 files becomes a maintenance nightmare. The tools: **React component extraction** (the main tool), **`@apply`** (last resort for non-JSX contexts), and **shared class constants** (middle ground for variant patterns).

---

## K — Key Concepts

### Recognising Duplication Worth Fixing

```tsx
{/* ─── Level 1: Acceptable duplication (same utility, different context) */}
{/* These don't need extraction — they're reading correctly */}
<h1 className="text-4xl font-bold text-gray-900">Page title</h1>
<h2 className="text-3xl font-bold text-gray-900">Section title</h2>
{/* Similar but semantically different — keep as-is */}

{/* ─── Level 2: Suspicious (same meaningful combination, 3+ places) */}
{/* If you see this in 3+ components, extract it */}
<button className="px-4 py-2 bg-blue-600 text-white font-semibold
                    rounded-lg hover:bg-blue-700 transition-colors">
  Button A
</button>
<button className="px-4 py-2 bg-blue-600 text-white font-semibold
                    rounded-lg hover:bg-blue-700 transition-colors">
  Button B
</button>
{/* Same 8-class string → extract to a <Button> component */}

{/* ─── Level 3: Critical (design system atoms used everywhere) */}
{/* Card, input, badge, avatar, label — always extract these */}
```

### Tool 1 — React Component Extraction (Primary)

```tsx
{/* ─── Best solution: extract to a component */}
{/* Component carries the styles — usage sites are clean */}

// src/components/ui/button.tsx
import { type VariantProps, cva } from 'class-variance-authority'
import { cn } from '@/lib/cn'

const buttonVariants = cva(
  // ─── Base classes (always applied)
  `inline-flex items-center justify-center font-semibold
   rounded-xl transition-all duration-150 active:scale-[0.97]
   focus-visible:outline-none focus-visible:ring-2
   focus-visible:ring-offset-2 disabled:opacity-50
   disabled:cursor-not-allowed disabled:pointer-events-none`,
  {
    variants: {
      variant: {
        primary:   'bg-blue-600 text-white hover:bg-blue-700 focus-visible:ring-blue-500',
        secondary: 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50 focus-visible:ring-gray-400',
        ghost:     'text-gray-600 hover:bg-gray-100 hover:text-gray-900 focus-visible:ring-gray-400',
        danger:    'bg-red-600 text-white hover:bg-red-700 focus-visible:ring-red-500',
        outline:   'border-2 border-blue-600 text-blue-600 hover:bg-blue-50 focus-visible:ring-blue-500'
      },
      size: {
        xs:  'px-2.5 py-1.5 text-xs gap-1.5',
        sm:  'px-3 py-2 text-sm gap-2',
        md:  'px-5 py-2.5 text-sm gap-2',
        lg:  'px-6 py-3 text-base gap-2.5',
        xl:  'px-8 py-4 text-lg gap-3'
      }
    },
    defaultVariants: {
      variant: 'primary',
      size:    'md'
    }
  }
)

type ButtonProps =
  React.ButtonHTMLAttributes<HTMLButtonElement> &
  VariantProps<typeof buttonVariants> & {
    isLoading?: boolean
  }

export function Button({ variant, size, isLoading, className, children, ...props }: ButtonProps) {
  return (
    <button
      disabled={isLoading || props.disabled}
      className={cn(buttonVariants({ variant, size }), className)}
      {...props}
    >
      {isLoading && <span className="animate-spin text-sm">⟳</span>}
      {children}
    </button>
  )
}

// Usage — clean, semantic, type-safe:
<Button>Primary</Button>
<Button variant="secondary" size="sm">Cancel</Button>
<Button variant="danger" isLoading>Deleting…</Button>
```

### Tool 2 — Shared Class Constants (Middle Ground)

```tsx
// src/lib/styles.ts
// For patterns that appear in JSX but don't warrant a full component

export const inputBase = [
  "w-full px-3 py-2.5 text-sm rounded-xl",
  "bg-white dark:bg-gray-900",
  "border border-gray-300 dark:border-gray-600",
  "text-gray-900 dark:text-white",
  "placeholder:text-gray-400 dark:placeholder:text-gray-500",
  "focus:outline-none focus:ring-2 focus:ring-blue-500",
  "focus:border-transparent",
  "transition-colors duration-150",
].join(" ");

export const inputError = [
  "border-red-400 dark:border-red-500",
  "focus:ring-red-400 dark:focus:ring-red-500",
].join(" ");

export const labelBase =
  "block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5";

export const cardBase = [
  "bg-white dark:bg-gray-800",
  "border border-gray-200 dark:border-gray-700",
  "rounded-2xl shadow-sm",
].join(" ");

// Usage:
import { inputBase, inputError, labelBase, cardBase } from "@/lib/styles";

<div className={cardBase}>
  <label className={labelBase}>Email</label>
  <input
    type="email"
    className={`${inputBase} ${hasError ? inputError : ""}`}
  />
</div>;
```

### Tool 3 — `@apply` (Last Resort: Non-JSX Contexts Only)

```css
/* Use @apply ONLY when you cannot use a React component: */
/* ✅ Email templates (no JSX) */
/* ✅ CMS-generated HTML you can't add classes to */
/* ✅ Third-party library base style overrides */
/* ❌ Regular React components — use component extraction instead */

/* src/app/globals.css */
@layer components {
  /* For CMS-rendered prose content where you can't add classes */
  .prose-acme {
    @apply text-gray-700 leading-relaxed;
  }
  .prose-acme h1 {
    @apply text-3xl font-bold text-gray-900 mb-6;
  }
  .prose-acme h2 {
    @apply text-2xl font-semibold text-gray-900 mb-4 mt-8;
  }
  .prose-acme p {
    @apply mb-4 text-gray-600;
  }
  .prose-acme a {
    @apply text-blue-600 underline underline-offset-2
                          hover:text-blue-800 transition-colors;
  }
  .prose-acme code {
    @apply font-mono text-sm bg-gray-100 px-1.5 py-0.5 rounded;
  }

  /* For a third-party date picker you can't modify directly */
  .datepicker-override .rdp-button:hover {
    @apply bg-blue-50 text-blue-700;
  }
}
```

---

## W — Why It Matters

- The primary tool for controlling duplication in Tailwind is **React component extraction**, not `@apply`. A `<Button>` component with variant props is more maintainable than a `.btn` CSS class because it's type-safe, supports composition, carries default props, and lives where it's used.
- `cva` (class-variance-authority) solves the variant management problem — a button with 5 variants × 5 sizes is 25 combinations. `cva` handles the matrix cleanly without 25 separate class strings, and integrates with TypeScript for compile-time variant validation.
- `@apply` in `@layer components` should be reserved for content you cannot control — CMS HTML, email templates, third-party widget overrides. Using it for your own React components recreates the naming problem Tailwind eliminates.

---

## I — Interview Q&A

### Q1: How do you prevent utility class duplication in a large Tailwind codebase?

**A:** The primary strategy is React component extraction — move repeated class combinations into a typed component with variant props managed by `cva`. This is better than `@apply` because the component is composable, testable, supports TypeScript, and keeps styles co-located with markup. For patterns that appear in JSX but are simpler than a full component, export shared class string constants from a `styles.ts` file and import them where needed. Use `@apply` only as a last resort for non-JSX contexts: CMS-generated HTML, email templates, or third-party widget overrides where you cannot add classes to the elements.

---

## C — Common Pitfalls + Fix

### ❌ Pitfall: Reaching for `@apply` instead of extracting a component

```css
/* ❌ @apply for a component pattern */
@layer components {
  .card {
    @apply bg-white border border-gray-200 rounded-2xl p-6 shadow-sm;
  }
  .card-title {
    @apply text-xl font-semibold text-gray-900;
  }
}
```

**Fix:** Extract a `<Card>` React component:

```tsx
{
  /* ✅ Component-based extraction */
}
export function Card({ title, children, className }: CardProps) {
  return (
    <div
      className={cn(
        "bg-white border border-gray-200 rounded-2xl p-6 shadow-sm",
        className
      )}
    >
      {title && (
        <h3 className="text-xl font-semibold text-gray-900 mb-4">{title}</h3>
      )}
      {children}
    </div>
  );
}
```

---

## K — Coding Challenge + Solution

### Challenge

Create a `<Badge>` component using `cva` with:

1. Variants: `default`, `primary`, `success`, `warning`, `destructive`, `outline`
2. Sizes: `sm`, `md`, `lg`
3. An optional `dot` prop that shows a colored indicator dot
4. An `Icon` slot prop for an optional leading icon
5. `className` override support via `cn()`
6. Export `badgeVariants` for use outside the component

### Solution

```tsx
// src/components/ui/badge.tsx
import { cva, type VariantProps } from 'class-variance-authority'
import { cn }                      from '@/lib/cn'

export const badgeVariants = cva(
  // Base
  'inline-flex items-center gap-1.5 font-semibold rounded-full border transition-colors',
  {
    variants: {
      variant: {
        default:     'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 border-gray-200 dark:border-gray-700',
        primary:     'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800',
        success:     'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 border-green-200 dark:border-green-800',
        warning:     'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800',
        destructive: 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 border-red-200 dark:border-red-800',
        outline:     'bg-transparent text-gray-700 dark:text-gray-300 border-gray-300 dark:border-gray-600'
      },
      size: {
        sm: 'px-2    py-0.5 text-[10px] tracking-wider uppercase',
        md: 'px-2.5  py-1   text-xs',
        lg: 'px-3    py-1.5 text-sm'
      }
    },
    defaultVariants: {
      variant: 'default',
      size:    'md'
    }
  }
)

const DOT_COLORS: Record<string, string> = {
  default:     'bg-gray-400',
  primary:     'bg-blue-500',
  success:     'bg-green-500',
  warning:     'bg-amber-500',
  destructive: 'bg-red-500',
  outline:     'bg-gray-400'
}

const DOT_SIZES: Record<string, string> = {
  sm: 'size-1.5',
  md: 'size-2',
  lg: 'size-2.5'
}

interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {
  dot?:  boolean
  icon?: React.ReactNode
}

export function Badge({
  variant = 'default',
  size    = 'md',
  dot     = false,
  icon,
  className,
  children,
  ...props
}: BadgeProps) {
  return (
    <span
      className={cn(badgeVariants({ variant, size }), className)}
      {...props}
    >
      {/* Leading dot */}
      {dot && (
        <span className={cn(
          'rounded-full animate-pulse',
          DOT_COLORS[variant ?? 'default'],
          DOT_SIZES[size ?? 'md']
        )} />
      )}

      {/* Leading icon */}
      {icon && (
        <span className="shrink-0 leading-none">{icon}</span>
      )}

      {children}
    </span>
  )
}

// Usage:
<Badge>Default</Badge>
<Badge variant="primary" dot>Live</Badge>
<Badge variant="success" size="lg">Deployed ✓</Badge>
<Badge variant="destructive" size="sm" dot>Critical</Badge>
<Badge variant="warning" icon="⚠️">Review needed</Badge>
<Badge variant="outline" className="font-mono">v1.2.0</Badge>
```

---

---
