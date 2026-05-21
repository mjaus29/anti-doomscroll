# 8 — Route-Aware Navigation — Active Links and Breadcrumbs

---

## T — TL;DR

Route-aware navigation means UI components that **know which route is active** and render accordingly — highlighted nav items, breadcrumb trails, and contextual page titles. All three are built from `usePathname` and the route structure.

---

## K — Key Concepts

### The Complete Active Link Component

```tsx
// src/components/layout/active-link.tsx
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

interface ActiveLinkProps {
  href: string;
  children: React.ReactNode;
  className?: string;
  activeClass?: string;
  exact?: boolean;
}

export function ActiveLink({
  href,
  children,
  className = "",
  activeClass = "text-blue-600 font-semibold",
  exact = false,
}: ActiveLinkProps) {
  const pathname = usePathname();
  const isActive = exact
    ? pathname === href
    : pathname === href || pathname.startsWith(`${href}/`);

  return (
    <Link
      href={href}
      aria-current={isActive ? "page" : undefined}
      className={cn(className, isActive && activeClass)}
    >
      {children}
    </Link>
  );
}
```

### Breadcrumbs — From Route Config (Production-Grade)

```tsx
// src/lib/breadcrumbs.ts
export interface BreadcrumbItem {
  label: string;
  href: string;
}

// Map path segments to human-readable labels
// Handles dynamic segments like [id] and [slug]
export function buildBreadcrumbs(
  pathname: string,
  labelMap?: Record<string, string> // e.g., { '42': 'Product Name' }
): BreadcrumbItem[] {
  const segments = pathname.split("/").filter(Boolean);

  const crumbs: BreadcrumbItem[] = [{ label: "Home", href: "/" }];

  let currentPath = "";
  for (const segment of segments) {
    currentPath += `/${segment}`;

    // Use custom label if provided (e.g., product name instead of ID)
    const label =
      labelMap?.[segment] ??
      segment.replace(/-/g, " ").replace(/\b\w/g, (l) => l.toUpperCase());

    crumbs.push({ label, href: currentPath });
  }

  return crumbs;
}
```

```tsx
// src/components/layout/breadcrumbs.tsx
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { buildBreadcrumbs } from "@/lib/breadcrumbs";

interface BreadcrumbsProps {
  labelMap?: Record<string, string>;
  className?: string;
}

export function Breadcrumbs({ labelMap, className }: BreadcrumbsProps) {
  const pathname = usePathname();
  const crumbs = buildBreadcrumbs(pathname, labelMap);

  if (crumbs.length <= 1) return null; // don't show on home

  return (
    <nav aria-label="Breadcrumb" className={className}>
      <ol className="flex flex-wrap items-center gap-1 text-sm">
        {crumbs.map((crumb, i) => {
          const isLast = i === crumbs.length - 1;

          return (
            <li key={crumb.href} className="flex items-center gap-1">
              {i > 0 && (
                <span className="text-gray-400" aria-hidden="true">
                  /
                </span>
              )}
              {isLast ? (
                <span className="text-gray-900 font-medium" aria-current="page">
                  {crumb.label}
                </span>
              ) : (
                <Link
                  href={crumb.href}
                  className="text-gray-500 hover:text-gray-700 transition-colors"
                >
                  {crumb.label}
                </Link>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

// Usage in a product page layout:
// <Breadcrumbs labelMap={{ '42': 'Air Max 90' }} />
// → Home / Products / Air Max 90
```

### Section-Based Navigation Config

```tsx
// src/config/navigation.ts
export interface NavSection {
  title: string;
  items: NavItem[];
}

export interface NavItem {
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  exact?: boolean;
  badge?: string;
}

export const DASHBOARD_NAV: NavSection[] = [
  {
    title: "Main",
    items: [
      { label: "Overview", href: "/dashboard", icon: HomeIcon, exact: true },
      { label: "Orders", href: "/dashboard/orders", icon: PackageIcon },
      { label: "Products", href: "/dashboard/products", icon: ShoppingBagIcon },
      { label: "Customers", href: "/dashboard/customers", icon: UsersIcon },
    ],
  },
  {
    title: "Settings",
    items: [
      {
        label: "General",
        href: "/dashboard/settings",
        icon: SettingsIcon,
        exact: true,
      },
      { label: "Billing", href: "/dashboard/billing", icon: CreditCardIcon },
      { label: "Team", href: "/dashboard/team", icon: TeamIcon },
    ],
  },
];
```

```tsx
// src/components/layout/dashboard-nav.tsx
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { DASHBOARD_NAV } from "@/config/navigation";

export function DashboardNav() {
  const pathname = usePathname();

  return (
    <nav className="space-y-6">
      {DASHBOARD_NAV.map((section) => (
        <div key={section.title}>
          <p className="px-3 text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">
            {section.title}
          </p>
          <ul className="space-y-0.5">
            {section.items.map((item) => {
              const isActive = item.exact
                ? pathname === item.href
                : pathname === item.href ||
                  pathname.startsWith(`${item.href}/`);
              const Icon = item.icon;

              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    aria-current={isActive ? "page" : undefined}
                    className={cn(
                      "flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors",
                      isActive
                        ? "bg-blue-50 text-blue-700 font-medium"
                        : "text-gray-600 hover:text-gray-900 hover:bg-gray-100"
                    )}
                  >
                    <Icon
                      className={cn(
                        "w-4 h-4",
                        isActive ? "text-blue-600" : "text-gray-400"
                      )}
                    />
                    <span className="flex-1">{item.label}</span>
                    {item.badge && (
                      <span className="text-xs bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded-full">
                        {item.badge}
                      </span>
                    )}
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </nav>
  );
}
```

---

## W — Why It Matters

- `aria-current="page"` on the active nav item is an WCAG accessibility requirement — without it, screen readers can't identify the current page in navigation menus.
- Extracting nav items to a config file (`navigation.ts`) means adding a new nav item requires changing one file — not hunting through component JSX. This is a maintainability win at scale.
- The `exact` flag distinction (`/dashboard` vs `/dashboard/orders`) is the subtle bug that makes the wrong nav item highlighted — always think about parent routes when building nav.
- Dynamic breadcrumb labels (replacing IDs with names via `labelMap`) require passing data from Server Components (where you have DB access) to the Client Component `Breadcrumbs` — this is the composition pattern at work.

---

## I — Interview Q&A

### Q1: What is `aria-current="page"` and why should active nav links have it?

**A:** `aria-current="page"` is an ARIA attribute that tells assistive technologies (screen readers) which link represents the currently active page in a navigation list. Without it, users relying on screen readers hear all nav links without knowing which one is current. It's a WCAG 2.1 Level AA requirement for navigation landmarks. In React, set it conditionally: `aria-current={isActive ? 'page' : undefined}`.

### Q2: How do you display a product name in a breadcrumb instead of the product ID from the URL?

**A:** Pass a `labelMap` prop to the Breadcrumbs component — a mapping from URL segment values to human-readable labels. The Server Component (which has DB access) fetches the product name, then passes it down: `<Breadcrumbs labelMap={{ [product.id]: product.name }} />`. The Client Component breadcrumb builder uses the map to substitute labels while building the trail.

### Q3: What is the advantage of a navigation config object over hardcoded nav items in JSX?

**A:** Configuration-driven navigation provides a single source of truth: adding, removing, or reordering nav items requires changing one config file instead of editing component JSX. The same config can drive sidebar navigation, mobile menus, breadcrumb generation, and sitemap generation. It also enables programmatic operations — checking if a route requires auth, finding the current section title, or generating structured data.

---

## C — Common Pitfalls + Fix

### ❌ Pitfall: Parent nav item not active on child routes

```tsx
// Dashboard nav item: /dashboard
// Current route: /dashboard/orders
const isActive = pathname === "/dashboard"; // ← false on /dashboard/orders
// Sidebar shows NO active item
```

**Fix:**

```tsx
const isActive =
  pathname === "/dashboard" || pathname.startsWith("/dashboard/"); // ← active on all child routes
```

### ❌ Pitfall: Breadcrumb shows raw ID instead of entity name

```
URL: /dashboard/orders/ord_42abc
Breadcrumb: Home / Dashboard / Orders / Ord 42abc
Should be:  Home / Dashboard / Orders / Order #1042
```

**Fix:** Pass `labelMap` from the Server Component that has the order data:

```tsx
// src/app/dashboard/orders/[id]/page.tsx (Server Component)
const order = await getOrder(id);
return (
  <>
    <Breadcrumbs labelMap={{ [id]: `Order #${order.number}` }} />
    <OrderDetail order={order} />
  </>
);
```

---

## K — Coding Challenge + Solution

### Challenge

Build a `TopNav` component for a marketing site with:

1. Logo that links to `/`
2. Nav links: Products (`/products`), Pricing (`/pricing`), Blog (`/blog`)
3. Each link is active when on that route or any sub-route
4. A CTA button: "Get Started" → `/register`
5. Hides on `/register` and `/login` pages
6. Fully accessible with `aria-current`

### Solution

```tsx
// src/app/(marketing)/_components/top-nav.tsx
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const NAV_LINKS = [
  { label: "Products", href: "/products" },
  { label: "Pricing", href: "/pricing" },
  { label: "Blog", href: "/blog" },
];

const HIDDEN_PATHS = ["/register", "/login"];

export function TopNav() {
  const pathname = usePathname();

  if (HIDDEN_PATHS.includes(pathname)) return null;

  return (
    <header
      className="sticky top-0 z-50 bg-white/95 backdrop-blur
                        border-b border-gray-200"
    >
      <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
        {/* Logo */}
        <Link
          href="/"
          className="font-bold text-xl text-gray-900 hover:text-blue-600 transition-colors"
        >
          MyApp
        </Link>

        {/* Nav links */}
        <nav aria-label="Main navigation">
          <ul className="flex items-center gap-1">
            {NAV_LINKS.map((link) => {
              const isActive =
                pathname === link.href || pathname.startsWith(`${link.href}/`);

              return (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    aria-current={isActive ? "page" : undefined}
                    className={cn(
                      "px-4 py-2 rounded-lg text-sm font-medium transition-colors",
                      isActive
                        ? "text-blue-600 bg-blue-50"
                        : "text-gray-600 hover:text-gray-900 hover:bg-gray-100"
                    )}
                  >
                    {link.label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        {/* CTA */}
        <Link
          href="/register"
          className="px-4 py-2 bg-blue-600 text-white text-sm font-medium
                     rounded-lg hover:bg-blue-700 transition-colors"
        >
          Get Started
        </Link>
      </div>
    </header>
  );
}
```

---

---
