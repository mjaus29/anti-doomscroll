# 3 — `template.tsx` — Remounting Layouts

---

## T — TL;DR

`template.tsx` looks identical to `layout.tsx` but does the **opposite** — it creates a **new instance on every navigation**. State resets, effects re-run, and animations replay. Use it when you specifically need a fresh component on every route change.

---

## K — Key Concepts

### `template.tsx` vs `layout.tsx` — The Core Difference

```
layout.tsx:
  - Renders ONCE when you enter the segment
  - Persists across navigations within the segment
  - State is PRESERVED between child route changes
  - useEffect runs ONCE on mount

template.tsx:
  - Creates a NEW instance on EVERY navigation
  - Unmounts and remounts when child routes change
  - State is RESET on every navigation
  - useEffect runs on EVERY navigation
```

### File Structure — Same Position as Layout

```
src/app/
├── layout.tsx      ← persistent wrapper (use for most things)
└── template.tsx    ← remounting wrapper (use for specific cases)

# Can coexist — template wraps children INSIDE the layout:
# <Layout>
#   <Template>       ← new instance on each navigation
#     <Page />
#   </Template>
# </Layout>
```

### The Syntax — Identical to Layout

```tsx
// src/app/dashboard/template.tsx
export default function DashboardTemplate({
  children,
}: {
  children: React.ReactNode;
}) {
  return <div>{children}</div>;
}

// ← Same signature as layout.tsx
// The difference is BEHAVIOR (remounts), not syntax
```

### Use Case 1 — Page Transition Animations

```tsx
// src/app/template.tsx
// Every page navigation triggers a fresh mount → animation plays each time
"use client";

import { motion } from "framer-motion";

export default function Template({ children }: { children: React.ReactNode }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      transition={{ duration: 0.2 }}
    >
      {children}
    </motion.div>
  );
}

// layout.tsx:    animation plays ONCE (on first visit to segment)
// template.tsx:  animation plays on EVERY navigation within the segment ✅
```

### Use Case 2 — Per-Page Analytics / View Tracking

```tsx
// src/app/template.tsx
"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

export default function PageTrackingTemplate({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  useEffect(() => {
    // Runs on EVERY page navigation — template remounts each time
    analytics.track("page_view", { path: pathname });
  }, [pathname]);
  // With layout.tsx, this useEffect would only run once on initial load

  return <>{children}</>;
}
```

### Use Case 3 — Resetting Form State Between Routes

```tsx
// src/app/(wizard)/template.tsx
"use client";

import { useEffect } from "react";
import { useFormStore } from "@/stores/form-store";

export default function WizardTemplate({
  children,
}: {
  children: React.ReactNode;
}) {
  const resetForm = useFormStore((state) => state.reset);

  useEffect(() => {
    // Reset form state on every wizard step navigation
    return () => resetForm(); // cleanup = reset when leaving
  }, [resetForm]);

  return <>{children}</>;
}
```

### When to Use `template.tsx` vs `layout.tsx`

```
Use layout.tsx (default — 95% of cases):
  ✅ Navigation bars
  ✅ Sidebars
  ✅ Auth wrappers
  ✅ Context providers
  ✅ Any persistent UI

Use template.tsx (specific need — 5% of cases):
  ✅ Page transition animations (need to replay on each navigation)
  ✅ Per-page analytics tracking with useEffect
  ✅ Resetting UI state (form wizard steps, onboarding flows)
  ✅ Third-party libraries that require re-initialization per page
  ✅ useEffect-based "enter page" logic
```

---

## W — Why It Matters

- The default behavior of `layout.tsx` (persists) catches developers off-guard when they expect `useEffect` in a layout to re-run on navigation — it won't. `template.tsx` is the escape hatch for when re-running on navigation is exactly what you need.
- Page transition animations are one of the most common "how do I do this in Next.js App Router?" questions — `template.tsx` is the correct answer, not `layout.tsx`.
- Analytics page view tracking via `useEffect` in a `layout.tsx` is a common bug — it only fires once, missing subsequent navigations. `template.tsx` fixes this.
- Understanding the distinction demonstrates depth of App Router knowledge in interviews — most developers know `layout.tsx` but not `template.tsx`.

---

## I — Interview Q&A

### Q1: What is the key behavioral difference between `layout.tsx` and `template.tsx`?

**A:** `layout.tsx` persists between navigations — it renders once when you enter a segment and stays mounted as you navigate between child routes. State, effects, and context values are preserved. `template.tsx` creates a new instance on every navigation — it unmounts and remounts on each route change, resetting all state and re-running all `useEffect` callbacks. They have identical syntax; the difference is purely behavioral.

### Q2: When would you use `template.tsx` instead of `layout.tsx`?

**A:** When you specifically need behavior to trigger on every navigation: page transition animations (so the animation replays on each page change), per-page analytics tracking via `useEffect`, resetting form state between wizard steps, or re-initializing third-party libraries that need a fresh start per page. For everything else — navigation bars, sidebars, auth wrappers — use `layout.tsx`.

### Q3: Can `layout.tsx` and `template.tsx` coexist in the same segment?

**A:** Yes. If both exist in the same segment, the render order is: `layout.tsx` wraps `template.tsx`, which wraps `page.tsx`. So you get both behaviors — the persistent outer layout (sidebar, nav) and the remounting inner template (animations, tracking). The layout handles the persistent chrome; the template handles per-navigation effects.

---

## C — Common Pitfalls + Fix

### ❌ Pitfall: Using `layout.tsx` for page analytics — effect only fires once

```tsx
// src/app/layout.tsx
"use client";
export default function Layout({ children }) {
  const pathname = usePathname();
  useEffect(() => {
    analytics.page(pathname); // ← Only fires ONCE on initial load
  }, [pathname]); // ← Does NOT re-fire on navigation (layout persists)
  return <>{children}</>;
}
```

**Fix:** Use `template.tsx` — it remounts on every navigation:

```tsx
// src/app/template.tsx
"use client";
export default function Template({ children }) {
  const pathname = usePathname();
  useEffect(() => {
    analytics.page(pathname); // ✅ fires on EVERY navigation
  }, [pathname]);
  return <>{children}</>;
}
```

### ❌ Pitfall: Using `template.tsx` for auth guards — re-checks on every navigation

```tsx
// src/app/(dashboard)/template.tsx
export default async function Template({ children }) {
  const user = await getUser();
  if (!user) redirect("/login");
  // ← Auth check runs on EVERY dashboard page navigation
  // → Unnecessary database call 10x per user session
}
```

**Fix:** Auth guards belong in `layout.tsx` (runs once per segment entry) or `middleware.ts`:

```tsx
// src/app/(dashboard)/layout.tsx
export default async function Layout({ children }) {
  const user = await getUser(); // ← runs once on entering the dashboard segment
  if (!user) redirect("/login");
  return <>{children}</>;
}
```

---

## K — Coding Challenge + Solution

### Challenge

Create a `template.tsx` at the root `app/` level that:

1. Tracks page views — logs `pathname` to console on every navigation
2. Applies a fade-in animation using Tailwind CSS classes (no external library)
3. Must be a Client Component
4. Does not affect the visual layout (no added padding/margin)

### Solution

```tsx
// src/app/template.tsx
"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

export default function RootTemplate({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  useEffect(() => {
    // Fires on EVERY navigation — template remounts each time
    console.log("[Page View]", pathname);
    // In production: analytics.track('page_view', { path: pathname })
  }, [pathname]);

  return (
    // Tailwind animate-in — applies fade on mount (every navigation)
    <div className="animate-in fade-in duration-200">{children}</div>
  );
}

// Note: add to tailwind.config.ts if animate-in isn't available:
// plugins: [require('tailwindcss-animate')]
// Or use a custom keyframe in globals.css:
/*
@keyframes fade-in {
  from { opacity: 0; transform: translateY(4px); }
  to   { opacity: 1; transform: translateY(0); }
}
.animate-page-in {
  animation: fade-in 0.2s ease-out;
}
*/
```

---

---
